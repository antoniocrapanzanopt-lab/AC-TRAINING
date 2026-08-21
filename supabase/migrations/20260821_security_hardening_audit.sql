-- =====================================================================================
-- MIGRATION: 20260821_security_hardening_audit.sql
-- BUILDER ATHLETE MANAGER — SECURITY HARDENING, RLS ENFORCEMENT & NOTIFICATION TRIGGER FIXES
-- =====================================================================================
-- Descrizione:
-- 1. Risoluzione bug di colonna inesistente nei trigger notifiche (assigned_coach_id).
-- 2. Trigger di protezione e anti-tampering sui campi gestionali di public.athletes.
-- 3. Rafforzamento policy RLS su schede, cartelle, esercizi e assegnazioni (is_coach_aal2).
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. CORREZIONE TRIGGER NOTIFICHE: assigned_coach_id (invece di coach_id)
-- -------------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_athlete_metric_notification() RETURNS TRIGGER AS $$
DECLARE
    v_coach_id_text TEXT;
    v_coach_id UUID;
    v_athlete_name TEXT := 'Atleta';
    v_has_pain BOOLEAN := false;
    v_priority TEXT := 'normal';
    v_title TEXT;
    v_body TEXT;
    v_dedupe_key TEXT;
BEGIN
    SELECT assigned_coach_id, (first_name || ' ' || last_name) 
    INTO v_coach_id_text, v_athlete_name 
    FROM public.athletes 
    WHERE id = NEW.athlete_id;

    IF v_coach_id_text IS NOT NULL AND v_coach_id_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        v_coach_id := v_coach_id_text::UUID;
    ELSE
        v_coach_id := public.get_coach_uid();
    END IF;

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

CREATE OR REPLACE FUNCTION public.handle_workout_session_notification() RETURNS TRIGGER AS $$
DECLARE
    v_coach_id_text TEXT;
    v_coach_id UUID;
    v_athlete_name TEXT := 'Atleta';
    v_workout_title TEXT := 'Allenamento';
    v_has_pain BOOLEAN := false;
    v_priority TEXT := 'normal';
    v_title TEXT;
    v_body TEXT;
    v_dedupe_key TEXT;
BEGIN
    IF NEW.end_time IS NOT NULL AND (OLD.end_time IS NULL OR OLD.end_time IS DISTINCT FROM NEW.end_time) THEN
        SELECT assigned_coach_id, (first_name || ' ' || last_name) 
        INTO v_coach_id_text, v_athlete_name 
        FROM public.athletes 
        WHERE id = NEW.athlete_id;

        IF v_coach_id_text IS NOT NULL AND v_coach_id_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
            v_coach_id := v_coach_id_text::UUID;
        ELSE
            v_coach_id := public.get_coach_uid();
        END IF;

        IF NEW.workout_id IS NOT NULL THEN
            SELECT title INTO v_workout_title FROM public.workouts WHERE id = NEW.workout_id;
        END IF;

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


-- -------------------------------------------------------------------------------------
-- 2. PROTEZIONE RIGIDA UPDATE SU public.athletes (ANTI-TAMPERING & PRIVILEGE ESCALATION)
-- -------------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.protect_athlete_row_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Se la modifica è effettuata dal Coach autorizzato con MFA (o servizio di backend), consenti
    IF public.is_coach() THEN
        RETURN NEW;
    END IF;

    -- Se la modifica è effettuata dall'Atleta, blocca categoricamente qualsiasi manomissione di campi sensibili
    IF NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
        RAISE EXCEPTION 'Accesso Negato: auth_user_id non modificabile.';
    END IF;

    IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
        RAISE EXCEPTION 'Accesso Negato: lo stato dei pagamenti può essere modificato esclusivamente dal coach.';
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
        RAISE EXCEPTION 'Accesso Negato: lo stato dell''account può essere modificato esclusivamente dal coach.';
    END IF;

    IF NEW.assigned_coach_id IS DISTINCT FROM OLD.assigned_coach_id OR 
       NEW.assigned_coach_name IS DISTINCT FROM OLD.assigned_coach_name THEN
        RAISE EXCEPTION 'Accesso Negato: assegnazione coach non modificabile dall''atleta.';
    END IF;

    IF NEW.notes IS DISTINCT FROM OLD.notes THEN
        RAISE EXCEPTION 'Accesso Negato: le note interne del coach non sono modificabili dall''atleta.';
    END IF;

    IF NEW.tax_code IS DISTINCT FROM OLD.tax_code AND OLD.tax_code IS NOT NULL AND OLD.tax_code <> '' THEN
        RAISE EXCEPTION 'Accesso Negato: il codice fiscale non può essere modificato autonomamente una volta impostato.';
    END IF;

    IF NEW.medical_cert_expiry IS DISTINCT FROM OLD.medical_cert_expiry OR
       NEW.medical_cert_type IS DISTINCT FROM OLD.medical_cert_type THEN
        RAISE EXCEPTION 'Accesso Negato: la validazione del certificato medico è riservata al coach.';
    END IF;

    IF NEW.email IS DISTINCT FROM OLD.email THEN
        RAISE EXCEPTION 'Accesso Negato: il cambio email richiede la procedura di aggiornamento autenticazione.';
    END IF;

    -- Campi che l'atleta può aggiornare: phone, city, province, birth_date, gender, 
    -- emergency_contact_*, medical_cert_url, telegram_username, contact_channel, has_seen_disclaimer, updated_at
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_athlete_row_update ON public.athletes;
CREATE TRIGGER trg_protect_athlete_row_update
    BEFORE UPDATE ON public.athletes
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_athlete_row_update();


-- -------------------------------------------------------------------------------------
-- 3. RAFFORZAMENTO POLICY RLS SU WORKOUTS, FOLDERS ED ASSEGNAZIONI
-- -------------------------------------------------------------------------------------

-- Cartelle Allenamenti
DROP POLICY IF EXISTS "coach_manage_folders_mfa" ON public.workout_folders;
CREATE POLICY "coach_manage_folders_mfa" ON public.workout_folders 
FOR ALL TO authenticated 
USING (public.is_coach_aal2()) 
WITH CHECK (public.is_coach_aal2());

-- Schede di Allenamento
DROP POLICY IF EXISTS "coach_manage_workouts_mfa" ON public.workouts;
CREATE POLICY "coach_manage_workouts_mfa" ON public.workouts 
FOR ALL TO authenticated 
USING (public.is_coach_aal2())
WITH CHECK (public.is_coach_aal2());

-- Esercizi Scheda
DROP POLICY IF EXISTS "coach_manage_exercises_mfa" ON public.workout_exercises;
CREATE POLICY "coach_manage_exercises_mfa" ON public.workout_exercises 
FOR ALL TO authenticated 
USING (public.is_coach_aal2())
WITH CHECK (public.is_coach_aal2());

-- Assegnazioni Schede ad Atleti
DROP POLICY IF EXISTS "coach_manage_assignments_mfa" ON public.athlete_assigned_workouts;
CREATE POLICY "coach_manage_assignments_mfa" ON public.athlete_assigned_workouts 
FOR ALL TO authenticated 
USING (public.is_coach_aal2())
WITH CHECK (public.is_coach_aal2());

-- Notifica ricaricamento dello schema REST di Supabase
NOTIFY pgrst, 'reload schema';
