-- =====================================================================================
-- BUILDER ATHLETE MANAGER — MASTER DATABASE SCHEMA & SECURITY HARDENING (SOURCE OF TRUTH)
-- =====================================================================================
-- Questo file è l'UNICA FONTE DI VERITÀ per l'intero database in produzione/staging.
-- Include: Tabelle, Indici, Trigger, Funzioni SECURITY DEFINER, RLS Hardened (MFA AAL2
-- per Coach e Own-Only per Atleti), Storage Buckets e Notifiche Realtime.
-- =====================================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

-- 1.13 COACH NOTIFICATIONS
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

-- 3.14 TABELLA: public.coach_notifications
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

-- Notifica ricaricamento dello schema REST
NOTIFY pgrst, 'reload schema';
