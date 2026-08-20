-- =====================================================================================
-- BUILDER ATHLETE MANAGER — MASTER DATABASE SCHEMA & SECURITY HARDENING (SOURCE OF TRUTH)
-- =====================================================================================
-- Questo file è l'UNICA FONTE DI VERITÀ per l'intero database in produzione/staging.
-- Include: Tabelle, Indici, Trigger, Funzioni SECURITY DEFINER, RLS Hardened (MFA AAL2
-- per Coach e Own-Only per Atleti), Storage Buckets e Notifiche Realtime.
-- =====================================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================================
-- 0. FUNZIONI DI SUPPORTO & AUTH TRIGGER
-- =====================================================================================

-- UUID Coach/Owner
CREATE OR REPLACE FUNCTION public.get_coach_uid() RETURNS UUID AS $$
  -- UUID reale Supabase di antonio.crapanzanopt@gmail.com
  SELECT '9f683185-a2b4-4d6c-a3e4-1a2c1a227f69'::UUID;
$$ LANGUAGE SQL IMMUTABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- Verifica Ruolo Coach (Identità)
CREATE OR REPLACE FUNCTION public.is_coach() RETURNS BOOLEAN AS $$
BEGIN
   RETURN auth.uid() = public.get_coach_uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp;

-- Verifica Ruolo Coach con Sessione MFA Attiva (AAL2)
CREATE OR REPLACE FUNCTION public.is_coach_aal2() RETURNS BOOLEAN AS $$
  SELECT 
    public.is_coach() 
    AND (auth.jwt()->>'aal') = 'aal2';
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public, pg_temp;

-- Verifica Ruolo Owner con Sessione MFA Attiva (AAL2)
CREATE OR REPLACE FUNCTION public.is_owner_aal2() RETURNS BOOLEAN AS $$
  SELECT 
    (auth.jwt()->>'email') = 'antonio.crapanzanopt@gmail.com'
    AND (auth.jwt()->>'aal') = 'aal2';
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public, pg_temp;

-- Verifica Ruolo Atleta (Identità collegata ad auth_user_id)
CREATE OR REPLACE FUNCTION public.is_athlete() RETURNS BOOLEAN AS $$
BEGIN
   IF auth.uid() = public.get_coach_uid() THEN
      RETURN FALSE;
   END IF;
   RETURN EXISTS (
      SELECT 1 FROM public.athletes 
      WHERE auth_user_id = auth.uid()
   );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp;

-- Trigger Blocco Registrazioni Abusive via API (Previene spam e account non invitati)
CREATE OR REPLACE FUNCTION public.check_user_signup()
RETURNS trigger AS $$
BEGIN
  IF NEW.email = 'antonio.crapanzanopt@gmail.com' THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.athletes WHERE LOWER(TRIM(email)) = LOWER(TRIM(NEW.email))) THEN
    RAISE EXCEPTION 'Accesso Negato: Email non autorizzata o non presente negli inviti del coach.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS validate_user_signup ON auth.users;
CREATE TRIGGER validate_user_signup
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.check_user_signup();

-- Auto-link Account Atleta al primo login con verifica email obbligatoria
CREATE OR REPLACE FUNCTION public.link_athlete_account() RETURNS BOOLEAN AS $$
DECLARE
    affected_rows INT;
BEGIN
    IF auth.uid() IS NULL THEN RETURN FALSE; END IF;
    IF auth.uid() = public.get_coach_uid() THEN RETURN FALSE; END IF;

    -- Prevenzione Account Takeover: verifica che l'email nel JWT sia verificata
    IF current_setting('request.jwt.claim.email_verified', true) != 'true' AND auth.jwt()->>'email_verified' != 'true' THEN
        RAISE EXCEPTION 'Accesso Negato: Conferma prima il tuo indirizzo email cliccando sul link ricevuto.';
    END IF;

    UPDATE public.athletes 
    SET auth_user_id = auth.uid()
    WHERE auth_user_id IS NULL 
      AND LOWER(TRIM(email)) = LOWER(TRIM(auth.jwt()->>'email'));
      
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN affected_rows > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Controllo sicuro email invitata (per form di invito/registrazione)
CREATE OR REPLACE FUNCTION public.check_invite_email(email_to_check TEXT) RETURNS BOOLEAN AS $$
BEGIN
   RETURN EXISTS (
      SELECT 1 FROM public.athletes 
      WHERE LOWER(TRIM(email)) = LOWER(TRIM(email_to_check))
   );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp;


-- =====================================================================================
-- 1. TABELLE PRINCIPALI
-- =====================================================================================

-- 1.1 ATHLETES
CREATE TABLE IF NOT EXISTS public.athletes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID REFERENCES auth.users(id),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    city TEXT,
    province TEXT,
    birth_date DATE,
    gender TEXT,
    tax_code TEXT,
    status TEXT DEFAULT 'active',
    payment_status TEXT DEFAULT 'none',
    tags TEXT[] DEFAULT '{}',
    goals TEXT,
    notes TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    emergency_contact_relationship TEXT,
    medical_cert_expiry DATE,
    medical_cert_notes TEXT,
    medical_cert_url TEXT,
    medical_cert_type TEXT DEFAULT 'agonistico',
    telegram_username TEXT,
    contact_channel TEXT,
    acquisition_source TEXT,
    assigned_coach_id TEXT,
    assigned_coach_name TEXT,
    has_seen_disclaimer BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Colonne aggiuntive se la tabella esisteva già
ALTER TABLE public.athletes 
ADD COLUMN IF NOT EXISTS medical_cert_url TEXT,
ADD COLUMN IF NOT EXISTS medical_cert_type TEXT DEFAULT 'agonistico',
ADD COLUMN IF NOT EXISTS telegram_username TEXT,
ADD COLUMN IF NOT EXISTS has_seen_disclaimer BOOLEAN DEFAULT FALSE;

-- 1.2 ATHLETE NOTES
CREATE TABLE IF NOT EXISTS public.athlete_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    visibility TEXT DEFAULT 'coach',
    is_pinned BOOLEAN DEFAULT false,
    author_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.3 ATHLETE TIMELINE
CREATE TABLE IF NOT EXISTS public.athlete_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    metadata JSONB,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.4 EXERCISES LIBRARY
CREATE TABLE IF NOT EXISTS public.exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Altro',
    equipment TEXT DEFAULT 'Corpo Libero',
    video_url TEXT,
    instructions TEXT,
    tipo TEXT,
    bilateralita TEXT,
    piano_movimento TEXT,
    catena_cinetica TEXT,
    gradi_liberta INTEGER,
    parametri_chiave JSONB,
    muscoli_coinvolti JSONB,
    esecuzione JSONB,
    sicurezza JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.exercises
    ADD COLUMN IF NOT EXISTS tipo TEXT,
    ADD COLUMN IF NOT EXISTS bilateralita TEXT,
    ADD COLUMN IF NOT EXISTS piano_movimento TEXT,
    ADD COLUMN IF NOT EXISTS catena_cinetica TEXT,
    ADD COLUMN IF NOT EXISTS gradi_liberta INTEGER,
    ADD COLUMN IF NOT EXISTS parametri_chiave JSONB,
    ADD COLUMN IF NOT EXISTS muscoli_coinvolti JSONB,
    ADD COLUMN IF NOT EXISTS esecuzione JSONB,
    ADD COLUMN IF NOT EXISTS sicurezza JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS unique_exercise_name_per_coach 
ON public.exercises (LOWER(TRIM(name)), (COALESCE(coach_id, '00000000-0000-0000-0000-000000000000'::uuid)));

-- 1.5 WORKOUT FOLDERS
CREATE TABLE IF NOT EXISTS public.workout_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    parent_id UUID REFERENCES public.workout_folders(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#EAB308',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.6 WORKOUTS
CREATE TABLE IF NOT EXISTS public.workouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    coach_id UUID REFERENCES auth.users(id) NOT NULL,
    folder_id UUID REFERENCES public.workout_folders(id) ON DELETE SET NULL,
    is_template BOOLEAN DEFAULT false,
    total_weeks INTEGER DEFAULT 1,
    estimated_duration_minutes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.workouts 
ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.workout_folders(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS total_weeks INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS estimated_duration_minutes TEXT;

-- 1.7 WORKOUT EXERCISES
CREATE TABLE IF NOT EXISTS public.workout_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_id UUID REFERENCES public.workouts(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    sets INTEGER NOT NULL DEFAULT 1,
    reps_target TEXT NOT NULL,
    rest_seconds INTEGER NOT NULL DEFAULT 60,
    order_index INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    day_name TEXT DEFAULT 'Giorno A',
    week_number INTEGER DEFAULT 1,
    target_weight TEXT,
    rir_target TEXT,
    tut TEXT,
    is_time_based BOOLEAN DEFAULT false,
    duration_seconds INTEGER,
    alternative_exercise TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.workout_exercises 
ADD COLUMN IF NOT EXISTS day_name TEXT DEFAULT 'Giorno A',
ADD COLUMN IF NOT EXISTS week_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS target_weight TEXT,
ADD COLUMN IF NOT EXISTS rir_target TEXT,
ADD COLUMN IF NOT EXISTS tut TEXT,
ADD COLUMN IF NOT EXISTS is_time_based BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
ADD COLUMN IF NOT EXISTS alternative_exercise TEXT;

-- 1.8 ATHLETE ASSIGNED WORKOUTS
CREATE TABLE IF NOT EXISTS public.athlete_assigned_workouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID REFERENCES public.athletes(id) ON DELETE CASCADE NOT NULL,
    workout_id UUID REFERENCES public.workouts(id) ON DELETE CASCADE NOT NULL,
    assigned_by UUID REFERENCES auth.users(id) NOT NULL,
    assigned_date TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.9 WORKOUT SESSIONS & LOGS
CREATE TABLE IF NOT EXISTS public.workout_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID REFERENCES public.athletes(id) ON DELETE CASCADE NOT NULL,
    workout_id UUID REFERENCES public.workouts(id) ON DELETE CASCADE NOT NULL,
    start_time TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    end_time TIMESTAMPTZ,
    notes TEXT,
    rpe INTEGER CHECK (rpe >= 1 AND rpe <= 10)
);

CREATE TABLE IF NOT EXISTS public.exercise_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.workout_sessions(id) ON DELETE CASCADE NOT NULL,
    exercise_id UUID REFERENCES public.workout_exercises(id) ON DELETE CASCADE NOT NULL,
    set_number INTEGER NOT NULL,
    reps_completed INTEGER,
    weight_kg NUMERIC(6,2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.10 MESSAGES (CHAT)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_read BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS messages_receiver_id_idx ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS messages_conversation_id_idx ON public.messages(conversation_id);

CREATE OR REPLACE FUNCTION public.restrict_message_updates() RETURNS trigger AS $$
BEGIN
    IF NEW.content IS DISTINCT FROM OLD.content OR 
       NEW.sender_id IS DISTINCT FROM OLD.sender_id OR 
       NEW.receiver_id IS DISTINCT FROM OLD.receiver_id OR 
       NEW.conversation_id IS DISTINCT FROM OLD.conversation_id THEN
        RAISE EXCEPTION 'Manomissione rilevata: è consentito aggiornare solo lo stato di lettura del messaggio.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS restrict_message_updates_trigger ON public.messages;
CREATE TRIGGER restrict_message_updates_trigger
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.restrict_message_updates();

-- 1.11 ATHLETE METRICS
CREATE TABLE IF NOT EXISTS public.athlete_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    weight_kg NUMERIC(5,2),
    height_cm NUMERIC(5,2),
    body_fat_percentage NUMERIC(4,2),
    neck_cm NUMERIC(5,2),
    shoulders_cm NUMERIC(5,2),
    chest_cm NUMERIC(5,2),
    waist_cm NUMERIC(5,2),
    hips_cm NUMERIC(5,2),
    bicep_right_cm NUMERIC(5,2),
    bicep_left_cm NUMERIC(5,2),
    thigh_right_cm NUMERIC(5,2),
    thigh_left_cm NUMERIC(5,2),
    calf_right_cm NUMERIC(5,2),
    calf_left_cm NUMERIC(5,2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS athlete_metrics_athlete_id_idx ON public.athlete_metrics(athlete_id);
CREATE INDEX IF NOT EXISTS athlete_metrics_date_idx ON public.athlete_metrics(date);

-- 1.12 ATHLETE MAX LIFTS
CREATE TABLE IF NOT EXISTS public.athlete_max_lifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
    exercise_id UUID REFERENCES public.exercises(id) ON DELETE SET NULL,
    exercise_name TEXT NOT NULL,
    weight_kg NUMERIC(6,2) NOT NULL,
    reps INTEGER NOT NULL DEFAULT 1,
    calculated_1rm NUMERIC(6,2) NOT NULL,
    is_real_1rm BOOLEAN DEFAULT false,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS athlete_max_lifts_athlete_id_idx ON public.athlete_max_lifts(athlete_id);
CREATE INDEX IF NOT EXISTS athlete_max_lifts_date_idx ON public.athlete_max_lifts(date);

-- 1.13 NOTIFICATIONS & PUSH SUBSYSTEM
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

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read_created ON public.notifications(recipient_user_id, read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_athlete_created ON public.notifications(athlete_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_priority_created ON public.notifications(priority, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedupe_key ON public.notifications(dedupe_key) WHERE dedupe_key IS NOT NULL;

-- 1.13.1 NOTIFICATION PREFERENCES
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

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON public.notification_preferences(user_id);

-- 1.13.2 PUSH SUBSCRIPTIONS
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

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

-- Legacy backward-compatibility
CREATE TABLE IF NOT EXISTS public.coach_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    athlete_id UUID REFERENCES public.athletes(id) ON DELETE SET NULL,
    athlete_name TEXT,
    metadata JSONB DEFAULT '{}',
    read_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_notifications_coach_id ON public.coach_notifications(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_notifications_created_at ON public.coach_notifications(created_at DESC);

-- 1.14 AI USAGE LOGS (Audit & Rate Limiting)
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- =====================================================================================
-- 2. ABILITAZIONE ROW LEVEL SECURITY (RLS) SU TUTTE LE TABELLE
-- =====================================================================================

ALTER TABLE public.athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_assigned_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_max_lifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;


-- =====================================================================================
-- 3. DEFINITIVE HARDENED RLS POLICIES (MFA AAL2 COACH + OWN-ONLY ATLETA)
-- =====================================================================================

-- 3.1 TABELLA: public.athletes
DROP POLICY IF EXISTS "coach_all_athletes" ON public.athletes;
DROP POLICY IF EXISTS "coach_all_athletes_mfa" ON public.athletes;
CREATE POLICY "coach_all_athletes_mfa" ON public.athletes 
FOR ALL TO authenticated 
USING (public.is_coach_aal2()) 
WITH CHECK (public.is_coach_aal2());

DROP POLICY IF EXISTS "athlete_own_profile" ON public.athletes;
CREATE POLICY "athlete_own_profile" ON public.athletes 
FOR SELECT TO authenticated 
USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "athlete_update_own_profile" ON public.athletes;
CREATE POLICY "athlete_update_own_profile" ON public.athletes 
FOR UPDATE TO authenticated 
USING (auth_user_id = auth.uid()) 
WITH CHECK (auth_user_id = auth.uid());

-- 3.2 TABELLA: public.athlete_notes
DROP POLICY IF EXISTS "coach_manage_athlete_notes" ON public.athlete_notes;
DROP POLICY IF EXISTS "coach_manage_athlete_notes_mfa" ON public.athlete_notes;
CREATE POLICY "coach_manage_athlete_notes_mfa" ON public.athlete_notes 
FOR ALL TO authenticated 
USING (public.is_coach_aal2()) 
WITH CHECK (public.is_coach_aal2());

DROP POLICY IF EXISTS "athlete_read_own_notes" ON public.athlete_notes;
CREATE POLICY "athlete_read_own_notes" ON public.athlete_notes 
FOR SELECT TO authenticated
USING (
    visibility = 'athlete' AND
    EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = athlete_notes.athlete_id AND a.auth_user_id = auth.uid())
);

-- 3.3 TABELLA: public.athlete_timeline
DROP POLICY IF EXISTS "coach_manage_athlete_timeline" ON public.athlete_timeline;
DROP POLICY IF EXISTS "coach_manage_athlete_timeline_mfa" ON public.athlete_timeline;
CREATE POLICY "coach_manage_athlete_timeline_mfa" ON public.athlete_timeline 
FOR ALL TO authenticated 
USING (public.is_coach_aal2()) 
WITH CHECK (public.is_coach_aal2());

DROP POLICY IF EXISTS "athlete_read_own_timeline" ON public.athlete_timeline;
CREATE POLICY "athlete_read_own_timeline" ON public.athlete_timeline 
FOR SELECT TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = athlete_timeline.athlete_id AND a.auth_user_id = auth.uid())
);

-- 3.4 TABELLA: public.exercises
DROP POLICY IF EXISTS "read_exercises_policy" ON public.exercises;
CREATE POLICY "read_exercises_policy" ON public.exercises 
FOR SELECT TO authenticated 
USING (true);

DROP POLICY IF EXISTS "coach_manage_own_exercises" ON public.exercises;
DROP POLICY IF EXISTS "coach_manage_own_exercises_mfa" ON public.exercises;
CREATE POLICY "coach_manage_own_exercises_mfa" ON public.exercises 
FOR ALL TO authenticated 
USING (coach_id::text = auth.uid()::text AND (auth.jwt()->>'aal') = 'aal2') 
WITH CHECK (coach_id::text = auth.uid()::text AND (auth.jwt()->>'aal') = 'aal2');

-- 3.5 TABELLA: public.workout_folders
DROP POLICY IF EXISTS "coach_manage_folders" ON public.workout_folders;
DROP POLICY IF EXISTS "coach_manage_folders_mfa" ON public.workout_folders;
CREATE POLICY "coach_manage_folders_mfa" ON public.workout_folders 
FOR ALL TO authenticated 
USING (
    public.is_coach_aal2() 
    OR (coach_id::text = auth.uid()::text AND (auth.jwt()->>'aal') = 'aal2')
) 
WITH CHECK (
    public.is_coach_aal2() 
    OR (coach_id::text = auth.uid()::text AND (auth.jwt()->>'aal') = 'aal2')
);

-- 3.6 TABELLA: public.workouts
DROP POLICY IF EXISTS "coach_manage_workouts" ON public.workouts;
DROP POLICY IF EXISTS "coach_manage_workouts_mfa" ON public.workouts;
CREATE POLICY "coach_manage_workouts_mfa" ON public.workouts 
FOR ALL TO authenticated 
USING (
    public.is_coach_aal2() 
    OR (coach_id::text = auth.uid()::text AND (auth.jwt()->>'aal') = 'aal2')
)
WITH CHECK (
    public.is_coach_aal2() 
    OR (coach_id::text = auth.uid()::text AND (auth.jwt()->>'aal') = 'aal2')
);

DROP POLICY IF EXISTS "athlete_read_assigned_workouts" ON public.workouts;
CREATE POLICY "athlete_read_assigned_workouts" ON public.workouts 
FOR SELECT TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.athlete_assigned_workouts aaw
        JOIN public.athletes a ON a.id = aaw.athlete_id
        WHERE aaw.workout_id = workouts.id AND a.auth_user_id = auth.uid()
    )
);

-- 3.7 TABELLA: public.workout_exercises
DROP POLICY IF EXISTS "coach_manage_exercises" ON public.workout_exercises;
DROP POLICY IF EXISTS "coach_manage_exercises_mfa" ON public.workout_exercises;
CREATE POLICY "coach_manage_exercises_mfa" ON public.workout_exercises 
FOR ALL TO authenticated 
USING (
    public.is_coach_aal2() 
    OR (EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_exercises.workout_id AND w.coach_id::text = auth.uid()::text) AND (auth.jwt()->>'aal') = 'aal2')
)
WITH CHECK (
    public.is_coach_aal2() 
    OR (EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_exercises.workout_id AND w.coach_id::text = auth.uid()::text) AND (auth.jwt()->>'aal') = 'aal2')
);

DROP POLICY IF EXISTS "athlete_read_exercises" ON public.workout_exercises;
CREATE POLICY "athlete_read_exercises" ON public.workout_exercises 
FOR SELECT TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.athlete_assigned_workouts aaw
        JOIN public.athletes a ON a.id = aaw.athlete_id
        WHERE aaw.workout_id = workout_exercises.workout_id AND a.auth_user_id = auth.uid()
    )
);

-- 3.8 TABELLA: public.athlete_assigned_workouts
DROP POLICY IF EXISTS "coach_manage_assignments" ON public.athlete_assigned_workouts;
DROP POLICY IF EXISTS "coach_manage_assignments_mfa" ON public.athlete_assigned_workouts;
CREATE POLICY "coach_manage_assignments_mfa" ON public.athlete_assigned_workouts 
FOR ALL TO authenticated 
USING (assigned_by::uuid = auth.uid()::uuid AND (auth.jwt()->>'aal') = 'aal2')
WITH CHECK (assigned_by::uuid = auth.uid()::uuid AND (auth.jwt()->>'aal') = 'aal2');

DROP POLICY IF EXISTS "athlete_read_assignments" ON public.athlete_assigned_workouts;
CREATE POLICY "athlete_read_assignments" ON public.athlete_assigned_workouts 
FOR SELECT TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = athlete_assigned_workouts.athlete_id AND a.auth_user_id = auth.uid())
);

-- 3.9 TABELLA: public.workout_sessions
DROP POLICY IF EXISTS "athlete_manage_sessions" ON public.workout_sessions;
CREATE POLICY "athlete_manage_sessions" ON public.workout_sessions 
FOR ALL TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = workout_sessions.athlete_id AND a.auth_user_id = auth.uid())
)
WITH CHECK (
    EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = workout_sessions.athlete_id AND a.auth_user_id = auth.uid())
);

DROP POLICY IF EXISTS "coach_read_sessions" ON public.workout_sessions;
DROP POLICY IF EXISTS "coach_manage_sessions_mfa" ON public.workout_sessions;
CREATE POLICY "coach_manage_sessions_mfa" ON public.workout_sessions 
FOR ALL TO authenticated 
USING (
    (EXISTS (SELECT 1 FROM public.workouts w WHERE w.id::uuid = workout_sessions.workout_id::uuid AND w.coach_id::uuid = auth.uid()::uuid) OR public.is_coach())
    AND (auth.jwt()->>'aal') = 'aal2'
)
WITH CHECK (
    (EXISTS (SELECT 1 FROM public.workouts w WHERE w.id::uuid = workout_sessions.workout_id::uuid AND w.coach_id::uuid = auth.uid()::uuid) OR public.is_coach())
    AND (auth.jwt()->>'aal') = 'aal2'
);

-- 3.10 TABELLA: public.exercise_logs
DROP POLICY IF EXISTS "athlete_manage_logs" ON public.exercise_logs;
CREATE POLICY "athlete_manage_logs" ON public.exercise_logs 
FOR ALL TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.workout_sessions ws
        JOIN public.athletes a ON a.id = ws.athlete_id
        WHERE ws.id = exercise_logs.session_id AND a.auth_user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.workout_sessions ws
        JOIN public.athletes a ON a.id = ws.athlete_id
        WHERE ws.id = exercise_logs.session_id AND a.auth_user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "coach_read_logs" ON public.exercise_logs;
DROP POLICY IF EXISTS "coach_manage_logs_mfa" ON public.exercise_logs;
CREATE POLICY "coach_manage_logs_mfa" ON public.exercise_logs 
FOR ALL TO authenticated 
USING (
    (EXISTS (
        SELECT 1 FROM public.workout_sessions ws
        JOIN public.workouts w ON w.id::uuid = ws.workout_id::uuid
        WHERE ws.id::uuid = exercise_logs.session_id::uuid AND w.coach_id::uuid = auth.uid()::uuid
    ) OR public.is_coach())
    AND (auth.jwt()->>'aal') = 'aal2'
)
WITH CHECK (
    (EXISTS (
        SELECT 1 FROM public.workout_sessions ws
        JOIN public.workouts w ON w.id::uuid = ws.workout_id::uuid
        WHERE ws.id::uuid = exercise_logs.session_id::uuid AND w.coach_id::uuid = auth.uid()::uuid
    ) OR public.is_coach())
    AND (auth.jwt()->>'aal') = 'aal2'
);

-- 3.11 TABELLA: public.messages
DROP POLICY IF EXISTS "Users can read own messages" ON public.messages;
CREATE POLICY "Users can read own messages" ON public.messages
    FOR SELECT TO authenticated
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can insert own messages" ON public.messages;
CREATE POLICY "Users can insert own messages" ON public.messages
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = sender_id AND 
        (public.is_coach() OR receiver_id = public.get_coach_uid())
    );

DROP POLICY IF EXISTS "Users can update received messages" ON public.messages;
CREATE POLICY "Users can update received messages" ON public.messages
    FOR UPDATE TO authenticated
    USING (auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can delete own messages" ON public.messages;
CREATE POLICY "Users can delete own messages" ON public.messages
    FOR DELETE TO authenticated
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id OR public.is_coach());

-- 3.12 TABELLA: public.athlete_metrics
DROP POLICY IF EXISTS "coach_manage_metrics" ON public.athlete_metrics;
DROP POLICY IF EXISTS "coach_manage_metrics_mfa" ON public.athlete_metrics;
CREATE POLICY "coach_manage_metrics_mfa" ON public.athlete_metrics 
FOR ALL TO authenticated 
USING (public.is_coach_aal2()) 
WITH CHECK (public.is_coach_aal2());

DROP POLICY IF EXISTS "athlete_own_metrics" ON public.athlete_metrics;
CREATE POLICY "athlete_own_metrics" ON public.athlete_metrics 
FOR ALL TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = athlete_metrics.athlete_id AND a.auth_user_id = auth.uid())
)
WITH CHECK (
    EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = athlete_metrics.athlete_id AND a.auth_user_id = auth.uid())
);

-- 3.13 TABELLA: public.athlete_max_lifts
DROP POLICY IF EXISTS "coach_manage_max_lifts" ON public.athlete_max_lifts;
DROP POLICY IF EXISTS "coach_manage_max_lifts_mfa" ON public.athlete_max_lifts;
CREATE POLICY "coach_manage_max_lifts_mfa" ON public.athlete_max_lifts 
FOR ALL TO authenticated 
USING (public.is_coach_aal2()) 
WITH CHECK (public.is_coach_aal2());

DROP POLICY IF EXISTS "athlete_own_max_lifts" ON public.athlete_max_lifts;
CREATE POLICY "athlete_own_max_lifts" ON public.athlete_max_lifts 
FOR ALL TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = athlete_max_lifts.athlete_id AND a.auth_user_id = auth.uid())
)
WITH CHECK (
    EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = athlete_max_lifts.athlete_id AND a.auth_user_id = auth.uid())
);

-- 3.14 TABELLA: public.notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_own_notifications" ON public.notifications;
CREATE POLICY "users_read_own_notifications" ON public.notifications
    FOR SELECT TO authenticated
    USING (recipient_user_id = auth.uid());

DROP POLICY IF EXISTS "users_update_own_notifications" ON public.notifications;
CREATE POLICY "users_update_own_notifications" ON public.notifications
    FOR UPDATE TO authenticated
    USING (recipient_user_id = auth.uid())
    WITH CHECK (recipient_user_id = auth.uid());

DROP POLICY IF EXISTS "deny_client_insert_notifications" ON public.notifications;
CREATE POLICY "deny_client_insert_notifications" ON public.notifications
    FOR INSERT TO authenticated
    WITH CHECK (false);

DROP POLICY IF EXISTS "deny_client_delete_notifications" ON public.notifications;
CREATE POLICY "deny_client_delete_notifications" ON public.notifications
    FOR DELETE TO authenticated
    USING (false);

-- 3.14.1 TABELLA: public.notification_preferences
DROP POLICY IF EXISTS "users_manage_own_preferences" ON public.notification_preferences;
CREATE POLICY "users_manage_own_preferences" ON public.notification_preferences
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 3.14.2 TABELLA: public.push_subscriptions
DROP POLICY IF EXISTS "users_manage_own_push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "users_manage_own_push_subscriptions" ON public.push_subscriptions
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Legacy backward-compatibility
DROP POLICY IF EXISTS "coach_read_own_notifications" ON public.coach_notifications;
CREATE POLICY "coach_read_own_notifications" ON public.coach_notifications 
FOR SELECT TO authenticated
USING (coach_id = auth.uid());

DROP POLICY IF EXISTS "coach_update_own_notifications" ON public.coach_notifications;
CREATE POLICY "coach_update_own_notifications" ON public.coach_notifications 
FOR UPDATE TO authenticated
USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

DROP POLICY IF EXISTS "insert_notifications" ON public.coach_notifications;
CREATE POLICY "insert_notifications" ON public.coach_notifications 
FOR INSERT TO authenticated
WITH CHECK (
    coach_id = public.get_coach_uid() AND (
        auth.uid() = public.get_coach_uid() OR
        EXISTS (SELECT 1 FROM public.athletes WHERE id = athlete_id AND auth_user_id = auth.uid())
    )
);

-- 3.15 TABELLA: public.ai_usage_logs
DROP POLICY IF EXISTS "coach_manage_ai_logs" ON public.ai_usage_logs;
CREATE POLICY "coach_manage_ai_logs" ON public.ai_usage_logs 
FOR ALL TO authenticated 
USING (coach_id = auth.uid() AND (auth.jwt()->>'aal') = 'aal2') 
WITH CHECK (coach_id = auth.uid() AND (auth.jwt()->>'aal') = 'aal2');


-- =====================================================================================
-- 4. SUPABASE STORAGE BUCKETS & STORAGE RLS POLICIES
-- =====================================================================================

INSERT INTO storage.buckets (id, name, public) 
VALUES ('medical-certificates', 'medical-certificates', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('exercise-videos', 'exercise-videos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-attachments', 'chat-attachments', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- 4.1 BUCKET: medical-certificates (Dati Sanitari Privati)
DROP POLICY IF EXISTS "manage_medical_certs" ON storage.objects;
DROP POLICY IF EXISTS "manage_medical_certs_mfa" ON storage.objects;
CREATE POLICY "manage_medical_certs_mfa" ON storage.objects 
FOR ALL TO authenticated 
USING (
  bucket_id = 'medical-certificates' AND
  (
    EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id::text = (storage.foldername(name))[1]
        AND a.auth_user_id = auth.uid()
    )
    OR
    public.is_coach_aal2()
  )
)
WITH CHECK (
  bucket_id = 'medical-certificates' AND
  (
    EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id::text = (storage.foldername(name))[1]
        AND a.auth_user_id = auth.uid()
    )
    OR
    public.is_coach_aal2()
  )
);

-- 4.2 BUCKET: exercise-videos (Video Esercizi)
DROP POLICY IF EXISTS "authenticated_manage_exercise_videos" ON storage.objects;
DROP POLICY IF EXISTS "coach_manage_exercise_videos" ON storage.objects;
DROP POLICY IF EXISTS "coach_manage_exercise_videos_mfa" ON storage.objects;
CREATE POLICY "coach_manage_exercise_videos_mfa" ON storage.objects 
FOR ALL TO authenticated 
USING (bucket_id = 'exercise-videos' AND public.is_coach_aal2()) 
WITH CHECK (bucket_id = 'exercise-videos' AND public.is_coach_aal2());

DROP POLICY IF EXISTS "athlete_read_exercise_videos" ON storage.objects;
CREATE POLICY "athlete_read_exercise_videos" ON storage.objects 
FOR SELECT TO authenticated
USING (bucket_id = 'exercise-videos');

-- 4.3 BUCKET: chat-attachments (Allegati Chat Privati e Segmentati)
DROP POLICY IF EXISTS "chat_attachments_read" ON storage.objects;
DROP POLICY IF EXISTS "chat_attachments_insert" ON storage.objects;
DROP POLICY IF EXISTS "chat_attachments_manage" ON storage.objects;
DROP POLICY IF EXISTS "chat_attachments_select" ON storage.objects;
DROP POLICY IF EXISTS "chat_attachments_update" ON storage.objects;
DROP POLICY IF EXISTS "chat_attachments_delete" ON storage.objects;

-- 4.3.1 SELECT (Coach AAL2, Atleta proprietario cartella, o Autore via owner_id)
CREATE POLICY "chat_attachments_select" ON storage.objects 
FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-attachments' AND 
  (
    public.is_coach_aal2()
    OR
    (
      (storage.foldername(name))[1] = 'chat' AND
      EXISTS (
        SELECT 1 FROM public.athletes a
        WHERE a.id::text = (storage.foldername(name))[2]
          AND a.auth_user_id = auth.uid()
      )
    )
    OR
    (owner_id::text = auth.uid()::text)
  )
);

-- 4.3.2 INSERT (Upload consentito solo a Coach AAL2 o Atleta autenticato nella propria cartella)
CREATE POLICY "chat_attachments_insert" ON storage.objects 
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments' AND 
  (
    public.is_coach_aal2()
    OR
    (
      (storage.foldername(name))[1] = 'chat' AND
      EXISTS (
        SELECT 1 FROM public.athletes a
        WHERE a.id::text = (storage.foldername(name))[2]
          AND a.auth_user_id = auth.uid()
      )
    )
  )
);

-- 4.3.3 UPDATE (Modifica consentita a Coach AAL2 o Autore)
CREATE POLICY "chat_attachments_update" ON storage.objects 
FOR UPDATE TO authenticated
USING (
  bucket_id = 'chat-attachments' AND 
  (public.is_coach_aal2() OR owner_id::text = auth.uid()::text)
)
WITH CHECK (
  bucket_id = 'chat-attachments' AND 
  (public.is_coach_aal2() OR owner_id::text = auth.uid()::text)
);

-- 4.3.4 DELETE (Cancellazione consentita a Coach AAL2 o Autore)
CREATE POLICY "chat_attachments_delete" ON storage.objects 
FOR DELETE TO authenticated
USING (
  bucket_id = 'chat-attachments' AND 
  (public.is_coach_aal2() OR owner_id::text = auth.uid()::text)
);


-- =====================================================================================
-- 5. REALTIME PUBLICATION & DEFAULT DATA SEED
-- =====================================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;
END $$;

INSERT INTO public.exercises (name, category, equipment, instructions)
VALUES 
    ('Panca Piana con Bilanciere', 'Petto', 'Bilanciere', 'Mantieni i tre punti di appoggio e i gomiti a 45 gradi.'),
    ('Spinte su Panca Inclinata con Manubri', 'Petto', 'Manubri', 'Controlla la discesa in 3 secondi ed esplodi in salita.'),
    ('Squat con Bilanciere', 'Gambe', 'Bilanciere', 'Rompi il parallelo mantenendo la schiena neutra.'),
    ('Stacco da Terra (Deadlift)', 'Gambe', 'Bilanciere', 'Mantieni il bilanciere vicino alle tibie durante l asta.'),
    ('Trazioni alla Sbarra (Pull-ups)', 'Dorso', 'Corpo Libero', 'Tira fino a portare il mento sopra la sbarra.'),
    ('Rematore con Bilanciere', 'Dorso', 'Bilanciere', 'Busto a 45 gradi, adduci le scapole durante la tirata.'),
    ('Lento Avanti / Military Press', 'Spalle', 'Bilanciere', 'Spingi in verticale stabilizzando il core.'),
    ('Alzate Laterali con Manubri', 'Spalle', 'Manubri', 'Gomiti leggermente flessi, alza fino all altezza delle spalle.'),
    ('Curl Bicipiti con Bilanciere Sagomato', 'Bicipiti', 'Bilanciere', 'Gomiti fissi ai fianchi, evita il compenso col busto.'),
    ('Pushdown Tricipiti ai Cavi', 'Tricipiti', 'Cavi', 'Estendi completamente le braccia mantenendo la tensione.'),
    ('Plank Addominale', 'Addominali', 'Corpo Libero', 'Mantieni la linea dritta senza spanciare.')
ON CONFLICT DO NOTHING;

-- =====================================================================================
-- 1.15 PROGRESSION BUILDER (RULES, SUGGESTIONS & AUDIT EVENTS)
-- =====================================================================================

CREATE TABLE IF NOT EXISTS public.progression_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID REFERENCES auth.users(id) NOT NULL,
    athlete_id UUID REFERENCES public.athletes(id) ON DELETE CASCADE,
    program_id UUID REFERENCES public.workouts(id) ON DELETE CASCADE,
    workout_exercise_id UUID REFERENCES public.workout_exercises(id) ON DELETE CASCADE,
    exercise_catalog_id UUID REFERENCES public.exercises(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    method TEXT NOT NULL CHECK (method IN (
        'double_progression', 'linear_load', 'linear_reps', 'linear_sets', 
        'rir_progression', 'rpe_progression', 'tut_progression', 'density_progression', 
        'regression', 'substitution', 'deload'
    )),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft', 'pending_approval', 'active', 'paused', 'completed', 'archived', 'rejected'
    )),
    conditions JSONB NOT NULL DEFAULT '{"consecutive_success_sessions": 1, "max_consecutive_failures": 2, "pain_threshold_max": 2}'::jsonb,
    increments JSONB NOT NULL DEFAULT '{"load_increment_kg": 2.5, "reps_increment": 1}'::jsonb,
    current_step INTEGER NOT NULL DEFAULT 1,
    max_steps INTEGER,
    current_target JSONB NOT NULL,
    success_count INTEGER NOT NULL DEFAULT 0,
    failure_count INTEGER NOT NULL DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_prog_rules_coach ON public.progression_rules(coach_id);
CREATE INDEX IF NOT EXISTS idx_prog_rules_athlete ON public.progression_rules(athlete_id);
CREATE INDEX IF NOT EXISTS idx_prog_rules_program ON public.progression_rules(program_id);
CREATE INDEX IF NOT EXISTS idx_prog_rules_workout_ex ON public.progression_rules(workout_exercise_id);
CREATE INDEX IF NOT EXISTS idx_prog_rules_status ON public.progression_rules(status);

CREATE TABLE IF NOT EXISTS public.progression_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID REFERENCES auth.users(id) NOT NULL,
    athlete_id UUID REFERENCES public.athletes(id) ON DELETE CASCADE NOT NULL,
    program_id UUID REFERENCES public.workouts(id) ON DELETE CASCADE NOT NULL,
    workout_exercise_id UUID REFERENCES public.workout_exercises(id) ON DELETE CASCADE NOT NULL,
    exercise_name TEXT NOT NULL,
    current_target JSONB NOT NULL,
    proposed_target JSONB NOT NULL,
    suggested_method TEXT NOT NULL,
    reason TEXT NOT NULL,
    confidence_score NUMERIC(3,2) NOT NULL DEFAULT 0.85,
    warnings JSONB DEFAULT '[]'::jsonb,
    alternative_exercise JSONB,
    status TEXT NOT NULL DEFAULT 'pending_approval' CHECK (status IN (
        'pending_approval', 'approved', 'rejected', 'modified', 'expired'
    )),
    requires_coach_approval BOOLEAN NOT NULL DEFAULT true,
    brain_decision_version TEXT NOT NULL DEFAULT 'v1.0.0',
    policy_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    proposal_hash TEXT NOT NULL DEFAULT '',
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 HOURS'),
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    rejected_by UUID REFERENCES auth.users(id),
    rejected_at TIMESTAMPTZ,
    final_action TEXT CHECK (final_action IN ('applied_primary', 'applied_alternative', 'applied_custom', 'rejected', 'expired')),
    coach_feedback TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_prog_sugg_coach_status ON public.progression_suggestions(coach_id, status);
CREATE INDEX IF NOT EXISTS idx_prog_sugg_athlete ON public.progression_suggestions(athlete_id);
CREATE INDEX IF NOT EXISTS idx_prog_sugg_pending_expiry ON public.progression_suggestions(status, expires_at) WHERE status = 'pending_approval';
CREATE INDEX IF NOT EXISTS idx_prog_sugg_hash ON public.progression_suggestions(proposal_hash);

CREATE TABLE IF NOT EXISTS public.progression_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sequence_number BIGSERIAL,
    previous_event_hash TEXT NOT NULL DEFAULT '0000000000000000000000000000000000000000000000000000000000000000',
    event_hash TEXT NOT NULL DEFAULT '',
    rule_id UUID REFERENCES public.progression_rules(id) ON DELETE SET NULL,
    suggestion_id UUID REFERENCES public.progression_suggestions(id) ON DELETE SET NULL,
    athlete_id UUID REFERENCES public.athletes(id) ON DELETE CASCADE NOT NULL,
    program_id UUID REFERENCES public.workouts(id) ON DELETE SET NULL,
    workout_exercise_id UUID REFERENCES public.workout_exercises(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    previous_target JSONB,
    new_target JSONB,
    performed_data JSONB,
    payload_hash TEXT,
    brain_decision_version TEXT DEFAULT 'v1.0.0',
    validation_checks JSONB DEFAULT '{"integrity_verified": true, "safety_revalidated": true}'::jsonb,
    reason TEXT NOT NULL,
    triggered_by TEXT NOT NULL CHECK (triggered_by IN ('system_engine', 'coach', 'ai_assistant')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_prog_events_seq ON public.progression_events(sequence_number);
CREATE INDEX IF NOT EXISTS idx_prog_events_hash ON public.progression_events(event_hash);
CREATE INDEX IF NOT EXISTS idx_prog_events_prev_hash ON public.progression_events(previous_event_hash);
CREATE INDEX IF NOT EXISTS idx_prog_events_rule ON public.progression_events(rule_id);
CREATE INDEX IF NOT EXISTS idx_prog_events_athlete ON public.progression_events(athlete_id);
CREATE INDEX IF NOT EXISTS idx_prog_events_created ON public.progression_events(created_at DESC);

-- Indice Univoco Anti-Fork (impedisce ramificazioni concorrenti della hash chain)
CREATE UNIQUE INDEX IF NOT EXISTS idx_prog_events_unique_chain_link 
    ON public.progression_events(athlete_id, previous_event_hash)
    WHERE previous_event_hash != '0000000000000000000000000000000000000000000000000000000000000000';

CREATE TABLE IF NOT EXISTS public.progression_chain_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID REFERENCES public.athletes(id) ON DELETE CASCADE,
    last_verified_seq BIGINT NOT NULL DEFAULT 0,
    last_verified_event_hash TEXT NOT NULL,
    events_verified INTEGER NOT NULL DEFAULT 0,
    is_valid BOOLEAN NOT NULL DEFAULT true,
    broken_sequence BIGINT,
    alert_triggered BOOLEAN NOT NULL DEFAULT false,
    error_message TEXT,
    verified_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_prog_audits_athlete ON public.progression_chain_audits(athlete_id, verified_at DESC);
CREATE INDEX IF NOT EXISTS idx_prog_audits_invalid ON public.progression_chain_audits(is_valid) WHERE is_valid = false;

ALTER TABLE public.workout_exercises 
ADD COLUMN IF NOT EXISTS progression_rule_id UUID REFERENCES public.progression_rules(id) ON DELETE SET NULL;

-- -------------------------------------------------------------------------------------
-- TRIGGER PROGRESSIONI: IMMUTABILITÀ ASSOLUTA & HASH CHAIN SERIALIZZATA ANTI-RACE
-- -------------------------------------------------------------------------------------

-- Blocco Rigido di UPDATE e DELETE su progression_events
CREATE OR REPLACE FUNCTION public.enforce_progression_events_insert_only()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'TABELLA IMMUTABILE: progression_events è un audit trail append-only. Modifiche ed eliminazioni sono vietate a livello database.'
    USING ERRCODE = '55000';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_progression_events_insert_only ON public.progression_events;
CREATE TRIGGER trg_progression_events_insert_only
    BEFORE UPDATE OR DELETE ON public.progression_events
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_progression_events_insert_only();

-- Calcolo Deterministico Hash Chain con PostgreSQL Transaction Advisory Lock
CREATE OR REPLACE FUNCTION public.compute_progression_event_hash_chain()
RETURNS TRIGGER AS $$
DECLARE
    last_hash TEXT;
    canonical_payload TEXT;
    lock_key BIGINT;
BEGIN
    -- Advisory lock atomico per serializzare le insert concorrenti sullo stesso atleta
    lock_key := ('x' || substr(md5(NEW.athlete_id::text), 1, 15))::bit(64)::bigint;
    PERFORM pg_advisory_xact_lock(lock_key);

    -- Recupera l'ultimo hash dell'atleta
    SELECT event_hash INTO last_hash
    FROM public.progression_events
    WHERE athlete_id = NEW.athlete_id
    ORDER BY sequence_number DESC, created_at DESC
    LIMIT 1;

    IF last_hash IS NULL OR last_hash = '' THEN
        NEW.previous_event_hash := '0000000000000000000000000000000000000000000000000000000000000000';
    ELSE
        NEW.previous_event_hash := last_hash;
    END IF;

    -- Stringa canonica crittografica (previous_hash + athlete + type + payload_hash + trigger + timestamp)
    canonical_payload := NEW.previous_event_hash || '|' ||
                         NEW.athlete_id::text || '|' ||
                         NEW.event_type || '|' ||
                         COALESCE(NEW.payload_hash, 'none') || '|' ||
                         NEW.triggered_by || '|' ||
                         COALESCE(NEW.brain_decision_version, 'v1.0.0') || '|' ||
                         to_char(COALESCE(NEW.created_at, NOW()), 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"');

    NEW.event_hash := encode(digest(canonical_payload, 'sha256'), 'hex');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_progression_event_hash_chain ON public.progression_events;
CREATE TRIGGER trg_progression_event_hash_chain
    BEFORE INSERT ON public.progression_events
    FOR EACH ROW
    EXECUTE FUNCTION public.compute_progression_event_hash_chain();

-- Stored Procedure: Verifica Periodica Integrità della Catena
CREATE OR REPLACE FUNCTION public.verify_athlete_progression_chain(p_athlete_id UUID)
RETURNS JSONB AS $$
DECLARE
    r RECORD;
    expected_prev TEXT := '0000000000000000000000000000000000000000000000000000000000000000';
    recalculated_hash TEXT;
    canonical_payload TEXT;
    verified_count INT := 0;
    last_seq BIGINT := 0;
    last_hash TEXT := 'none';
BEGIN
    FOR r IN (
        SELECT * FROM public.progression_events
        WHERE athlete_id = p_athlete_id
        ORDER BY sequence_number ASC
    ) LOOP
        -- Verifica puntatore al blocco precedente
        IF r.previous_event_hash != expected_prev THEN
            INSERT INTO public.progression_chain_audits (
                athlete_id, last_verified_seq, last_verified_event_hash, events_verified, is_valid, broken_sequence, alert_triggered, error_message
            ) VALUES (
                p_athlete_id, r.sequence_number, r.event_hash, verified_count, false, r.sequence_number, true,
                'Discontinuità hash chain: previous_event_hash non corrisponde al blocco precedente'
            );
            
            RETURN jsonb_build_object(
                'is_valid', false,
                'events_verified', verified_count,
                'broken_sequence', r.sequence_number,
                'error_message', 'Discontinuità hash chain'
            );
        END IF;

        -- Ricalcola il digest SHA-256
        canonical_payload := r.previous_event_hash || '|' ||
                             r.athlete_id::text || '|' ||
                             r.event_type || '|' ||
                             COALESCE(r.payload_hash, 'none') || '|' ||
                             r.triggered_by || '|' ||
                             COALESCE(r.brain_decision_version, 'v1.0.0') || '|' ||
                             to_char(r.created_at, 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"');
                             
        recalculated_hash := encode(digest(canonical_payload, 'sha256'), 'hex');

        IF recalculated_hash != r.event_hash THEN
            INSERT INTO public.progression_chain_audits (
                athlete_id, last_verified_seq, last_verified_event_hash, events_verified, is_valid, broken_sequence, alert_triggered, error_message
            ) VALUES (
                p_athlete_id, r.sequence_number, r.event_hash, verified_count, false, r.sequence_number, true,
                'Corruzione payload o alterazione digest SHA-256'
            );

            RETURN jsonb_build_object(
                'is_valid', false,
                'events_verified', verified_count,
                'broken_sequence', r.sequence_number,
                'error_message', 'Digest SHA-256 alterato'
            );
        END IF;

        expected_prev := r.event_hash;
        last_hash := r.event_hash;
        last_seq := r.sequence_number;
        verified_count := verified_count + 1;
    END LOOP;

    -- Registra audit positivo
    INSERT INTO public.progression_chain_audits (
        athlete_id, last_verified_seq, last_verified_event_hash, events_verified, is_valid, broken_sequence, alert_triggered
    ) VALUES (
        p_athlete_id, last_seq, last_hash, verified_count, true, NULL, false
    );

    RETURN jsonb_build_object(
        'is_valid', true,
        'events_verified', verified_count,
        'last_verified_seq', last_seq,
        'last_verified_hash', last_hash
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

ALTER TABLE public.progression_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progression_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progression_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progression_chain_audits ENABLE ROW LEVEL SECURITY;

-- 1. progression_rules
DROP POLICY IF EXISTS "coach_manage_progression_rules_mfa" ON public.progression_rules;
DROP POLICY IF EXISTS "coach_business_access_progression_rules" ON public.progression_rules;
CREATE POLICY "coach_business_access_progression_rules" ON public.progression_rules
FOR ALL TO authenticated
USING (
    ((auth.jwt()->'app_metadata'->>'role') = 'coach' OR public.is_coach())
    AND coach_id = auth.uid()
)
WITH CHECK (
    ((auth.jwt()->'app_metadata'->>'role') = 'coach' OR public.is_coach())
    AND coach_id = auth.uid()
);

DROP POLICY IF EXISTS "athlete_read_own_progression_rules" ON public.progression_rules;
CREATE POLICY "athlete_read_own_progression_rules" ON public.progression_rules
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.athletes a 
        WHERE a.id = progression_rules.athlete_id 
        AND a.auth_user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "mfa_aal2_enforcement_progression_rules_write" ON public.progression_rules;
DROP POLICY IF EXISTS "mfa_aal2_enforcement_progression_rules_insert" ON public.progression_rules;
DROP POLICY IF EXISTS "mfa_aal2_enforcement_progression_rules_update" ON public.progression_rules;
DROP POLICY IF EXISTS "mfa_aal2_enforcement_progression_rules_delete" ON public.progression_rules;

CREATE POLICY "mfa_aal2_enforcement_progression_rules_insert" ON public.progression_rules
AS RESTRICTIVE
FOR INSERT TO authenticated
WITH CHECK ( (auth.jwt()->>'aal') = 'aal2' );

CREATE POLICY "mfa_aal2_enforcement_progression_rules_update" ON public.progression_rules
AS RESTRICTIVE
FOR UPDATE TO authenticated
USING ( (auth.jwt()->>'aal') = 'aal2' )
WITH CHECK ( (auth.jwt()->>'aal') = 'aal2' );

CREATE POLICY "mfa_aal2_enforcement_progression_rules_delete" ON public.progression_rules
AS RESTRICTIVE
FOR DELETE TO authenticated
USING ( (auth.jwt()->>'aal') = 'aal2' );

-- 2. progression_suggestions
DROP POLICY IF EXISTS "coach_manage_progression_suggestions_mfa" ON public.progression_suggestions;
DROP POLICY IF EXISTS "coach_business_access_progression_suggestions" ON public.progression_suggestions;
CREATE POLICY "coach_business_access_progression_suggestions" ON public.progression_suggestions
FOR ALL TO authenticated
USING (
    ((auth.jwt()->'app_metadata'->>'role') = 'coach' OR public.is_coach())
    AND coach_id = auth.uid()
)
WITH CHECK (
    ((auth.jwt()->'app_metadata'->>'role') = 'coach' OR public.is_coach())
    AND coach_id = auth.uid()
);

DROP POLICY IF EXISTS "mfa_aal2_enforcement_progression_suggestions" ON public.progression_suggestions;
CREATE POLICY "mfa_aal2_enforcement_progression_suggestions" ON public.progression_suggestions
AS RESTRICTIVE
FOR ALL TO authenticated
USING ( (auth.jwt()->>'aal') = 'aal2' )
WITH CHECK ( (auth.jwt()->>'aal') = 'aal2' );

-- 3. progression_events (Append-only)
DROP POLICY IF EXISTS "coach_manage_progression_events" ON public.progression_events;
DROP POLICY IF EXISTS "coach_select_progression_events" ON public.progression_events;
DROP POLICY IF EXISTS "coach_insert_progression_events" ON public.progression_events;

CREATE POLICY "coach_select_progression_events" ON public.progression_events
FOR SELECT TO authenticated
USING (
    (auth.jwt()->'app_metadata'->>'role') = 'coach' OR public.is_coach()
);

CREATE POLICY "coach_insert_progression_events" ON public.progression_events
FOR INSERT TO authenticated
WITH CHECK (
    (auth.jwt()->'app_metadata'->>'role') = 'coach' OR public.is_coach()
);

DROP POLICY IF EXISTS "athlete_read_own_progression_events" ON public.progression_events;
CREATE POLICY "athlete_read_own_progression_events" ON public.progression_events
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.athletes a 
        WHERE a.id = progression_events.athlete_id 
        AND a.auth_user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "mfa_aal2_enforcement_progression_events" ON public.progression_events;
CREATE POLICY "mfa_aal2_enforcement_progression_events" ON public.progression_events
AS RESTRICTIVE
FOR ALL TO authenticated
USING ( (auth.jwt()->>'aal') = 'aal2' )
WITH CHECK ( (auth.jwt()->>'aal') = 'aal2' );

-- 4. progression_chain_audits
DROP POLICY IF EXISTS "coach_manage_progression_audits" ON public.progression_chain_audits;
DROP POLICY IF EXISTS "coach_business_access_progression_audits" ON public.progression_chain_audits;
CREATE POLICY "coach_business_access_progression_audits" ON public.progression_chain_audits
FOR ALL TO authenticated
USING (
    (auth.jwt()->'app_metadata'->>'role') = 'coach' OR public.is_coach()
)
WITH CHECK (
    (auth.jwt()->'app_metadata'->>'role') = 'coach' OR public.is_coach()
);

DROP POLICY IF EXISTS "mfa_aal2_enforcement_progression_audits" ON public.progression_chain_audits;
CREATE POLICY "mfa_aal2_enforcement_progression_audits" ON public.progression_chain_audits
AS RESTRICTIVE
FOR ALL TO authenticated
USING ( (auth.jwt()->>'aal') = 'aal2' )
WITH CHECK ( (auth.jwt()->>'aal') = 'aal2' );

-- Notifica ricaricamento dello schema REST
NOTIFY pgrst, 'reload schema';
