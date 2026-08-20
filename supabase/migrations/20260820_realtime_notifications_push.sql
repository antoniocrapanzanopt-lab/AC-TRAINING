-- =====================================================================================
-- MIGRATION: REAL-TIME NOTIFICATIONS & WEB PUSH SUBSYSTEM FOR AC COACHING
-- =====================================================================================
-- Idempotent migration for notifications, preferences, push subscriptions,
-- hardened RLS policies, deduplication, server-side trigger functions and realtime.
-- =====================================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TABELLA: public.notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NULL,
    athlete_id UUID NULL REFERENCES public.athletes(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('low', 'normal', 'high', 'critical')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    action_url TEXT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    channel_in_app BOOLEAN NOT NULL DEFAULT true,
    channel_push BOOLEAN NOT NULL DEFAULT false,
    push_status TEXT NOT NULL DEFAULT 'not_requested' CHECK (push_status IN ('not_requested', 'pending', 'sent', 'failed', 'skipped_quiet_hours', 'skipped_opt_out')),
    read_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NULL,
    dedupe_key TEXT NULL
);

-- Indici performanti per public.notifications
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read_created 
    ON public.notifications(recipient_user_id, read_at, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_athlete_created 
    ON public.notifications(athlete_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_priority_created 
    ON public.notifications(priority, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedupe_key 
    ON public.notifications(dedupe_key) WHERE dedupe_key IS NOT NULL;


-- 2. TABELLA: public.notification_preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    push_enabled BOOLEAN NOT NULL DEFAULT false,
    notify_high BOOLEAN NOT NULL DEFAULT true,
    notify_critical BOOLEAN NOT NULL DEFAULT true,
    quiet_hours_start TIME NULL,
    quiet_hours_end TIME NULL,
    timezone TEXT NOT NULL DEFAULT 'Europe/Rome',
    categories_opt_out TEXT[] NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id 
    ON public.notification_preferences(user_id);


-- 3. TABELLA: public.push_subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id 
    ON public.push_subscriptions(user_id);


-- =====================================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================================

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 4.1 Policies per public.notifications
DROP POLICY IF EXISTS "users_read_own_notifications" ON public.notifications;
CREATE POLICY "users_read_own_notifications" ON public.notifications
    FOR SELECT
    USING (recipient_user_id = auth.uid());

DROP POLICY IF EXISTS "users_update_own_notifications" ON public.notifications;
CREATE POLICY "users_update_own_notifications" ON public.notifications
    FOR UPDATE
    USING (recipient_user_id = auth.uid())
    WITH CHECK (recipient_user_id = auth.uid());

DROP POLICY IF EXISTS "deny_client_insert_notifications" ON public.notifications;
CREATE POLICY "deny_client_insert_notifications" ON public.notifications
    FOR INSERT
    WITH CHECK (false); -- Solo funzioni SECURITY DEFINER o service role possono inserire

DROP POLICY IF EXISTS "deny_client_delete_notifications" ON public.notifications;
CREATE POLICY "deny_client_delete_notifications" ON public.notifications
    FOR DELETE
    USING (false); -- Eliminazioni permesse solo tramite backend

-- 4.2 Policies per public.notification_preferences
DROP POLICY IF EXISTS "users_manage_own_preferences" ON public.notification_preferences;
CREATE POLICY "users_manage_own_preferences" ON public.notification_preferences
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 4.3 Policies per public.push_subscriptions
DROP POLICY IF EXISTS "users_manage_own_push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "users_manage_own_push_subscriptions" ON public.push_subscriptions
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());


-- =====================================================================================
-- 5. FUNZIONI HELPER & EVENT DISPATCHER (SECURITY DEFINER)
-- =====================================================================================

-- Inserimento sicuro notifica con deduplica
CREATE OR REPLACE FUNCTION public.create_notification(
    p_recipient_user_id UUID,
    p_athlete_id UUID,
    p_type TEXT,
    p_priority TEXT,
    p_title TEXT,
    p_body TEXT,
    p_action_url TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_dedupe_key TEXT DEFAULT NULL,
    p_channel_push BOOLEAN DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
    v_push_enabled BOOLEAN := false;
    v_should_push BOOLEAN := false;
    v_push_status TEXT := 'not_requested';
    v_prefs RECORD;
BEGIN
    -- Se esiste dedupe_key e c'è già una notifica attiva con la stessa chiave, salta
    IF p_dedupe_key IS NOT NULL THEN
        SELECT id INTO v_notification_id FROM public.notifications WHERE dedupe_key = p_dedupe_key LIMIT 1;
        IF v_notification_id IS NOT NULL THEN
            RETURN v_notification_id;
        END IF;
    END IF;

    -- Leggi preferenze utente per Web Push
    SELECT * INTO v_prefs FROM public.notification_preferences WHERE user_id = p_recipient_user_id LIMIT 1;
    
    IF v_prefs IS NOT NULL THEN
        v_push_enabled := v_prefs.push_enabled;
        
        -- Calcolo canale push in base alla priorità
        IF p_priority = 'critical' THEN
            v_should_push := v_push_enabled OR true; -- I critical di sicurezza possono forzare push
        ELSIF p_priority = 'high' THEN
            v_should_push := v_push_enabled AND v_prefs.notify_high;
        ELSIF p_priority = 'normal' THEN
            v_should_push := false; -- Push disattivato di default per normal
        ELSE
            v_should_push := false; -- Low solo in-app
        END IF;
    ELSE
        -- Default: push solo su critical
        v_should_push := (p_priority = 'critical');
    END IF;

    IF p_channel_push IS NOT NULL THEN
        v_should_push := p_channel_push;
    END IF;

    IF v_should_push THEN
        v_push_status := 'pending';
    ELSE
        v_push_status := 'not_requested';
    END IF;

    -- Inserisci notifica
    INSERT INTO public.notifications (
        recipient_user_id,
        athlete_id,
        type,
        priority,
        title,
        body,
        action_url,
        metadata,
        channel_in_app,
        channel_push,
        push_status,
        dedupe_key
    ) VALUES (
        p_recipient_user_id,
        p_athlete_id,
        p_type,
        p_priority,
        p_title,
        p_body,
        p_action_url,
        p_metadata,
        true,
        v_should_push,
        v_push_status,
        p_dedupe_key
    ) RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


-- 5.1 Trigger su Check-in / Nuove Metriche Atleta
CREATE OR REPLACE FUNCTION public.handle_new_athlete_metric_notification() RETURNS TRIGGER AS $$
DECLARE
    v_coach_id UUID;
    v_athlete_name TEXT := 'Atleta';
    v_has_pain BOOLEAN := false;
    v_priority TEXT := 'normal';
    v_title TEXT;
    v_body TEXT;
    v_dedupe_key TEXT;
BEGIN
    -- Risolvi coach_id dell'atleta
    SELECT coach_id, (first_name || ' ' || last_name) 
    INTO v_coach_id, v_athlete_name 
    FROM public.athletes 
    WHERE id = NEW.athlete_id;

    IF v_coach_id IS NULL THEN
        v_coach_id := public.get_coach_uid();
    END IF;

    -- Controllo flag fastidi / dolori nelle note
    IF NEW.notes IS NOT NULL AND (
        NEW.notes ILIKE '%dolore%' OR 
        NEW.notes ILIKE '%male%' OR 
        NEW.notes ILIKE '%fastidio%' OR 
        NEW.notes ILIKE '%infortunio%' OR 
        NEW.notes ILIKE '%infiammazione%'
    ) THEN
        v_has_pain := true;
        v_priority := 'high';
        v_title := '🚨 ' || v_athlete_name || ': Segnalato fastidio nel Check-in';
        v_body := 'Note check-in: "' || SUBSTRING(NEW.notes FROM 1 FOR 120) || '"';
    ELSE
        v_priority := 'normal';
        v_title := '⚖️ ' || v_athlete_name || ' ha inviato un Check-in';
        v_body := 'Data: ' || TO_CHAR(NEW.date, 'DD/MM/YYYY') || 
                  CASE WHEN NEW.weight_kg IS NOT NULL THEN ' • Peso: ' || NEW.weight_kg || ' kg' ELSE '' END ||
                  CASE WHEN NEW.notes IS NOT NULL THEN ' • Note: ' || SUBSTRING(NEW.notes FROM 1 FOR 60) ELSE '' END;
    END IF;

    v_dedupe_key := 'checkin_' || NEW.athlete_id || '_' || TO_CHAR(NEW.date, 'YYYYMMDD');

    PERFORM public.create_notification(
        v_coach_id,
        NEW.athlete_id,
        CASE WHEN v_has_pain THEN 'checkin_alert' ELSE 'checkin_submitted' END,
        v_priority,
        v_title,
        v_body,
        '/athletes?id=' || NEW.athlete_id || '&tab=metriche',
        jsonb_build_object('metric_id', NEW.id, 'date', NEW.date, 'weight_kg', NEW.weight_kg),
        v_dedupe_key,
        CASE WHEN v_has_pain THEN true ELSE false END
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_notify_new_metric ON public.athlete_metrics;
CREATE TRIGGER trg_notify_new_metric
    AFTER INSERT ON public.athlete_metrics
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_athlete_metric_notification();


-- 5.2 Trigger su Allenamento Completato / Questionario Dolore
CREATE OR REPLACE FUNCTION public.handle_workout_session_notification() RETURNS TRIGGER AS $$
DECLARE
    v_coach_id UUID;
    v_athlete_name TEXT := 'Atleta';
    v_workout_title TEXT := 'Allenamento';
    v_has_pain BOOLEAN := false;
    v_priority TEXT := 'normal';
    v_title TEXT;
    v_body TEXT;
    v_dedupe_key TEXT;
BEGIN
    -- Scatta solo quando la sessione passa a completata (end_time non nullo)
    IF NEW.end_time IS NOT NULL AND (OLD.end_time IS NULL OR OLD.end_time IS DISTINCT FROM NEW.end_time) THEN
        SELECT coach_id, (first_name || ' ' || last_name) 
        INTO v_coach_id, v_athlete_name 
        FROM public.athletes 
        WHERE id = NEW.athlete_id;

        IF v_coach_id IS NULL THEN
            v_coach_id := public.get_coach_uid();
        END IF;

        IF NEW.workout_id IS NOT NULL THEN
            SELECT title INTO v_workout_title FROM public.workouts WHERE id = NEW.workout_id;
        END IF;

        -- Controllo alert dolore / fatica estrema
        IF (NEW.notes IS NOT NULL AND (
            NEW.notes ILIKE '%Dolore Articolare 3%' OR 
            NEW.notes ILIKE '%Dolore Articolare 4%' OR 
            NEW.notes ILIKE '%Dolore Articolare 5%' OR 
            NEW.notes ILIKE '%infortunio%' OR 
            NEW.notes ILIKE '%male%' OR 
            NEW.notes ILIKE '%dolore%'
        )) OR (NEW.rpe IS NOT NULL AND NEW.rpe >= 9) THEN
            v_has_pain := true;
            v_priority := 'high';
            v_title := '🚨 ' || v_athlete_name || ': Dolore/Fatica alta in ' || COALESCE(v_workout_title, 'Allenamento');
            v_body := COALESCE(NEW.notes, 'RPE ' || NEW.rpe || '/10 registrato a fine allenamento.');
        ELSE
            v_priority := 'normal';
            v_title := '🏋️ ' || v_athlete_name || ' ha completato un allenamento';
            v_body := 'Scheda: ' || COALESCE(v_workout_title, 'Workout') || 
                      CASE WHEN NEW.rpe IS NOT NULL THEN ' • RPE: ' || NEW.rpe || '/10' ELSE '' END ||
                      CASE WHEN NEW.notes IS NOT NULL THEN ' • Note: "' || SUBSTRING(NEW.notes FROM 1 FOR 60) || '"' ELSE '' END;
        END IF;

        v_dedupe_key := 'workout_' || NEW.id;

        PERFORM public.create_notification(
            v_coach_id,
            NEW.athlete_id,
            CASE WHEN v_has_pain THEN 'pain_reported' ELSE 'workout_completed' END,
            v_priority,
            v_title,
            v_body,
            '/athletes?id=' || NEW.athlete_id || '&tab=attivita',
            jsonb_build_object('session_id', NEW.id, 'workout_id', NEW.workout_id, 'rpe', NEW.rpe),
            v_dedupe_key,
            CASE WHEN v_has_pain THEN true ELSE false END
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_notify_workout_session ON public.workout_sessions;
CREATE TRIGGER trg_notify_workout_session
    AFTER INSERT OR UPDATE ON public.workout_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_workout_session_notification();


-- =====================================================================================
-- 6. REALTIME PUBLICATION
-- =====================================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL; -- Ignora se la publication non è modificabile direttamente in determinati ambienti
END $$;
