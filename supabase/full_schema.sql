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
    gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
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
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
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

-- 1.4 EXERCISES LIBRARY & BIOMECHANICAL TAXONOMY
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
    target_specifico TEXT,
    pattern_movimento TEXT,
    livello_difficolta TEXT DEFAULT 'Intermedio',
    ruolo_esercizio TEXT DEFAULT 'Complementare',
    costo_sistemico TEXT DEFAULT 'Medio',
    progression_friendly BOOLEAN DEFAULT TRUE,
    varianti JSONB DEFAULT '[]'::jsonb,
    regressioni JSONB DEFAULT '[]'::jsonb,
    progressioni JSONB DEFAULT '[]'::jsonb,
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
    ADD COLUMN IF NOT EXISTS sicurezza JSONB,
    ADD COLUMN IF NOT EXISTS target_specifico TEXT,
    ADD COLUMN IF NOT EXISTS pattern_movimento TEXT,
    ADD COLUMN IF NOT EXISTS livello_difficolta TEXT DEFAULT 'Intermedio',
    ADD COLUMN IF NOT EXISTS ruolo_esercizio TEXT DEFAULT 'Complementare',
    ADD COLUMN IF NOT EXISTS costo_sistemico TEXT DEFAULT 'Medio',
    ADD COLUMN IF NOT EXISTS progression_friendly BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS varianti JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS regressioni JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS progressioni JSONB DEFAULT '[]'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS unique_exercise_name_per_coach 
ON public.exercises (LOWER(TRIM(name)), (COALESCE(coach_id, '00000000-0000-0000-0000-000000000000'::uuid)));

CREATE INDEX IF NOT EXISTS idx_exercises_category ON public.exercises(category);
CREATE INDEX IF NOT EXISTS idx_exercises_target_specifico ON public.exercises(target_specifico);
CREATE INDEX IF NOT EXISTS idx_exercises_pattern ON public.exercises(pattern_movimento);
CREATE INDEX IF NOT EXISTS idx_exercises_equipment ON public.exercises(equipment);
CREATE INDEX IF NOT EXISTS idx_exercises_ruolo ON public.exercises(ruolo_esercizio);

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
    rpe INTEGER CHECK (rpe >= 1 AND rpe <= 10),
    status TEXT DEFAULT 'completed',
    skip_reason TEXT,
    skip_notes TEXT,
    coach_justified BOOLEAN DEFAULT NULL,
    coach_feedback TEXT,
    week_number INTEGER,
    day_name TEXT
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

-- Trigger di protezione sui campi sensibili della tabella athletes (Anti-Tampering / Privilege Escalation)
CREATE OR REPLACE FUNCTION public.protect_athlete_row_update()
RETURNS TRIGGER AS $$
BEGIN
    IF public.is_coach() THEN
        RETURN NEW;
    END IF;

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

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_athlete_row_update ON public.athletes;
CREATE TRIGGER trg_protect_athlete_row_update
    BEFORE UPDATE ON public.athletes
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_athlete_row_update();

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
USING (public.is_coach_aal2()) 
WITH CHECK (public.is_coach_aal2());

-- 3.5 TABELLA: public.workout_folders
DROP POLICY IF EXISTS "coach_manage_folders" ON public.workout_folders;
DROP POLICY IF EXISTS "coach_manage_folders_mfa" ON public.workout_folders;
CREATE POLICY "coach_manage_folders_mfa" ON public.workout_folders 
FOR ALL TO authenticated 
USING (public.is_coach_aal2()) 
WITH CHECK (public.is_coach_aal2());

-- 3.6 TABELLA: public.workouts
DROP POLICY IF EXISTS "coach_manage_workouts" ON public.workouts;
DROP POLICY IF EXISTS "coach_manage_workouts_mfa" ON public.workouts;
CREATE POLICY "coach_manage_workouts_mfa" ON public.workouts 
FOR ALL TO authenticated 
USING (public.is_coach_aal2())
WITH CHECK (public.is_coach_aal2());

DROP POLICY IF EXISTS "athlete_read_assigned_workouts" ON public.workouts;
CREATE POLICY "athlete_read_assigned_workouts" ON public.workouts 
FOR SELECT TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.athlete_assigned_workouts aaw
        JOIN public.athletes a ON a.id = aaw.athlete_id
        WHERE aaw.workout_id = workouts.id 
          AND (a.auth_user_id = auth.uid() OR LOWER(TRIM(COALESCE(a.email, ''))) = LOWER(TRIM(COALESCE(auth.jwt()->>'email', ''))))
    )
);

-- 3.7 TABELLA: public.workout_exercises
DROP POLICY IF EXISTS "coach_manage_exercises" ON public.workout_exercises;
DROP POLICY IF EXISTS "coach_manage_exercises_mfa" ON public.workout_exercises;
CREATE POLICY "coach_manage_exercises_mfa" ON public.workout_exercises 
FOR ALL TO authenticated 
USING (public.is_coach_aal2())
WITH CHECK (public.is_coach_aal2());

DROP POLICY IF EXISTS "athlete_read_exercises" ON public.workout_exercises;
CREATE POLICY "athlete_read_exercises" ON public.workout_exercises 
FOR SELECT TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.athlete_assigned_workouts aaw
        JOIN public.athletes a ON a.id = aaw.athlete_id
        WHERE aaw.workout_id = workout_exercises.workout_id 
          AND (a.auth_user_id = auth.uid() OR LOWER(TRIM(COALESCE(a.email, ''))) = LOWER(TRIM(COALESCE(auth.jwt()->>'email', ''))))
    )
);

-- 3.8 TABELLA: public.athlete_assigned_workouts
DROP POLICY IF EXISTS "coach_manage_assignments" ON public.athlete_assigned_workouts;
DROP POLICY IF EXISTS "coach_manage_assignments_mfa" ON public.athlete_assigned_workouts;
CREATE POLICY "coach_manage_assignments_mfa" ON public.athlete_assigned_workouts 
FOR ALL TO authenticated 
USING (public.is_coach_aal2())
WITH CHECK (public.is_coach_aal2());

DROP POLICY IF EXISTS "athlete_read_assignments" ON public.athlete_assigned_workouts;
CREATE POLICY "athlete_read_assignments" ON public.athlete_assigned_workouts 
FOR SELECT TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.athletes a 
        WHERE a.id = athlete_assigned_workouts.athlete_id 
          AND (a.auth_user_id = auth.uid() OR LOWER(TRIM(COALESCE(a.email, ''))) = LOWER(TRIM(COALESCE(auth.jwt()->>'email', ''))))
    )
);

-- 3.9 TABELLA: public.workout_sessions
DROP POLICY IF EXISTS "athlete_manage_sessions" ON public.workout_sessions;
CREATE POLICY "athlete_manage_sessions" ON public.workout_sessions 
FOR ALL TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.athletes a 
        WHERE a.id = workout_sessions.athlete_id 
          AND (a.auth_user_id = auth.uid() OR LOWER(TRIM(COALESCE(a.email, ''))) = LOWER(TRIM(COALESCE(auth.jwt()->>'email', ''))))
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.athletes a 
        WHERE a.id = workout_sessions.athlete_id 
          AND (a.auth_user_id = auth.uid() OR LOWER(TRIM(COALESCE(a.email, ''))) = LOWER(TRIM(COALESCE(auth.jwt()->>'email', ''))))
    )
);

DROP POLICY IF EXISTS "coach_read_sessions" ON public.workout_sessions;
CREATE POLICY "coach_read_sessions" ON public.workout_sessions
FOR SELECT TO authenticated
USING (
    public.is_coach() OR 
    EXISTS (
        SELECT 1 FROM public.workouts w 
        WHERE w.id::uuid = workout_sessions.workout_id::uuid 
        AND w.coach_id::uuid = auth.uid()::uuid
    )
);

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
        WHERE ws.id = exercise_logs.session_id 
          AND (a.auth_user_id = auth.uid() OR LOWER(TRIM(COALESCE(a.email, ''))) = LOWER(TRIM(COALESCE(auth.jwt()->>'email', ''))))
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.workout_sessions ws
        JOIN public.athletes a ON a.id = ws.athlete_id
        WHERE ws.id = exercise_logs.session_id 
          AND (a.auth_user_id = auth.uid() OR LOWER(TRIM(COALESCE(a.email, ''))) = LOWER(TRIM(COALESCE(auth.jwt()->>'email', ''))))
    )
);

DROP POLICY IF EXISTS "coach_read_logs" ON public.exercise_logs;
CREATE POLICY "coach_read_logs" ON public.exercise_logs
FOR SELECT TO authenticated
USING (
    public.is_coach() OR 
    EXISTS (
        SELECT 1 FROM public.workout_sessions ws
        JOIN public.workouts w ON w.id::uuid = ws.workout_id::uuid
        WHERE ws.id::uuid = exercise_logs.session_id::uuid 
        AND w.coach_id::uuid = auth.uid()::uuid
    )
);

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
-- 5. REALTIME PUBLICATION, TRIGGER NOTIFICHE & SEED MASSIVO TASSONOMIA ESERCIZI (140+)
-- =====================================================================================

-- 5.1 Realtime Publications
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notification_preferences') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_preferences;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- 5.2 Funzione Helper Inserimento Notifiche (SECURITY DEFINER)
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
    IF p_dedupe_key IS NOT NULL THEN
        SELECT id INTO v_notification_id FROM public.notifications WHERE dedupe_key = p_dedupe_key LIMIT 1;
        IF v_notification_id IS NOT NULL THEN
            RETURN v_notification_id;
        END IF;
    END IF;

    SELECT * INTO v_prefs FROM public.notification_preferences WHERE user_id = p_recipient_user_id LIMIT 1;
    
    IF v_prefs IS NOT NULL THEN
        v_push_enabled := v_prefs.push_enabled;
        IF p_priority = 'critical' THEN
            v_should_push := v_push_enabled OR true;
        ELSIF p_priority = 'high' THEN
            v_should_push := v_push_enabled AND v_prefs.notify_high;
        ELSIF p_priority = 'normal' THEN
            v_should_push := false;
        ELSE
            v_should_push := false;
        END IF;
    ELSE
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

-- 5.3 Trigger su Check-in / Nuove Metriche Atleta
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

DROP TRIGGER IF EXISTS trg_notify_new_metric ON public.athlete_metrics;
CREATE TRIGGER trg_notify_new_metric
    AFTER INSERT ON public.athlete_metrics
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_athlete_metric_notification();

-- 5.4 Trigger su Sessione Allenamento Completata
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

DROP TRIGGER IF EXISTS trg_notify_workout_session ON public.workout_sessions;
CREATE TRIGGER trg_notify_workout_session
    AFTER INSERT OR UPDATE ON public.workout_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_workout_session_notification();

-- 5.5 Seed Massivo Idempotente Tassonomia Biomeccanica (140+ Esercizi)
INSERT INTO public.exercises (
  name, category, target_specifico, pattern_movimento, equipment, 
  bilateralita, tipo, ruolo_esercizio, costo_sistemico, livello_difficolta, progression_friendly
) VALUES
-- PETTO
('Distensioni Panca Piana con Bilanciere', 'Petto', 'Sternocostale (Fasci medi)', 'Spinta Orizzontale', 'Bilanciere', 'Bilaterale', 'Forza', 'Fondamentale', 'Alto', 'Intermedio', true),
('Distensioni Panca Inclinata 30° con Bilanciere', 'Petto', 'Clavicolare (Fasci alti)', 'Spinta Orizzontale', 'Bilanciere', 'Bilaterale', 'Ipertrofia', 'Fondamentale', 'Alto', 'Intermedio', true),
('Distensioni Panca Piana con Manubri', 'Petto', 'Sternocostale (Fasci medi)', 'Spinta Orizzontale', 'Manubri', 'Bilaterale', 'Ipertrofia', 'Complementare', 'Medio', 'Intermedio', true),
('Distensioni Panca Inclinata 30° con Manubri', 'Petto', 'Clavicolare (Fasci alti)', 'Spinta Orizzontale', 'Manubri', 'Bilaterale', 'Ipertrofia', 'Complementare', 'Medio', 'Intermedio', true),
('Chest Press Convergente su Macchina', 'Petto', 'Clavicolare / Sternocostale', 'Spinta Orizzontale', 'Macchina', 'Bilaterale', 'Ipertrofia', 'Complementare', 'Medio', 'Principiante', true),
('Dip alle Parallele (Focus Petto)', 'Petto', 'Costale / Fasci Bassi', 'Spinta Verticale', 'Corpo Libero', 'Bilaterale', 'Ipertrofia', 'Fondamentale', 'Alto', 'Avanzato', true),
('Croci con Manubri su Panca Piana', 'Petto', 'Sternocostale (Allungamento)', 'Abduzione / Adduzione', 'Manubri', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Basso', 'Intermedio', false),
('Croci con Manubri su Panca Inclinata', 'Petto', 'Clavicolare (Allungamento)', 'Abduzione / Adduzione', 'Manubri', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Basso', 'Intermedio', false),
('Croci ai Cavi Medi (Cable Crossover)', 'Petto', 'Sternocostale (Tensione Continua)', 'Abduzione / Adduzione', 'Cavi', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Principiante', true),
('Croci ai Cavi Bassi (Low-to-High)', 'Petto', 'Clavicolare (Fasci Alti)', 'Abduzione / Adduzione', 'Cavi', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Principiante', true),
('Croci ai Cavi Alti (High-to-Low)', 'Petto', 'Costale / Fasci Bassi', 'Abduzione / Adduzione', 'Cavi', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Principiante', true),
('Pec Deck / Butterfly Machine', 'Petto', 'Sternocostale (Picco Accorciamento)', 'Abduzione / Adduzione', 'Macchina', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Principiante', true),
('Push-up / Piegamenti a Terra', 'Petto', 'Petto Globale & Core', 'Spinta Orizzontale', 'Corpo Libero', 'Bilaterale', 'Resistenza', 'Complementare', 'Basso', 'Principiante', true),
('Distensioni su Panca Declinata con Bilanciere', 'Petto', 'Costale / Fasci Bassi', 'Spinta Orizzontale', 'Bilanciere', 'Bilaterale', 'Forza', 'Complementare', 'Medio', 'Intermedio', true),
('Floor Press con Manubri', 'Petto', 'Sternocostale (Lockout / Spalla-Safe)', 'Spinta Orizzontale', 'Manubri', 'Bilaterale', 'Forza', 'Prehab / Riabilitativo', 'Basso', 'Principiante', true),

-- DORSO
('Trazioni alla Sbarra Presa Prona (Pull-up)', 'Dorso', 'Gran Dorsale & Trapezio', 'Trazione Verticale', 'Corpo Libero', 'Bilaterale', 'Forza', 'Fondamentale', 'Alto', 'Avanzato', true),
('Trazioni alla Sbarra Presa Supina (Chin-up)', 'Dorso', 'Gran Dorsale & Bicipite', 'Trazione Verticale', 'Corpo Libero', 'Bilaterale', 'Forza', 'Fondamentale', 'Alto', 'Intermedio', true),
('Lat Machine Presa Larga Prona', 'Dorso', 'Gran Dorsale Toracico', 'Trazione Verticale', 'Cavi', 'Bilaterale', 'Ipertrofia', 'Fondamentale', 'Medio', 'Principiante', true),
('Lat Machine Presa Neutra Stretta (V-Bar)', 'Dorso', 'Gran Dorsale Fasci Bassi', 'Trazione Verticale', 'Cavi', 'Bilaterale', 'Ipertrofia', 'Complementare', 'Medio', 'Principiante', true),
('Pulldown Unilaterale al Cavo Alto', 'Dorso', 'Gran Dorsale Fasci Iliaci', 'Trazione Verticale', 'Cavi', 'Unilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Intermedio', true),
('Pullover con Manubrio su Panca Trasversale', 'Dorso', 'Gran Dorsale (Allungamento)', 'Trazione Verticale', 'Manubri', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Basso', 'Intermedio', false),
('Pullover al Cavo Alto con Corda / Barra', 'Dorso', 'Gran Dorsale (Accorciamento)', 'Trazione Verticale', 'Cavi', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Principiante', true),
('Rematore con Bilanciere Presa Prona 45°', 'Dorso', 'Spessore Dorso / Trapezio Medio', 'Trazione Orizzontale', 'Bilanciere', 'Bilaterale', 'Forza', 'Fondamentale', 'Molto Alto', 'Avanzato', true),
('Rematore Pendlay (Dead-Stop Row)', 'Dorso', 'Dorso Globale & Potenza', 'Trazione Orizzontale', 'Bilanciere', 'Bilaterale', 'Potenza', 'Fondamentale', 'Molto Alto', 'Avanzato', true),
('Rematore con Manubrio Singolo su Panca', 'Dorso', 'Gran Dorsale Unilaterale', 'Trazione Orizzontale', 'Manubri', 'Unilaterale', 'Ipertrofia', 'Complementare', 'Medio', 'Principiante', true),
('Seal Row con Manubri su Panca Inclinata', 'Dorso', 'Trapezio Medio & Romboidi (Zero Lombari)', 'Trazione Orizzontale', 'Manubri', 'Bilaterale', 'Ipertrofia', 'Complementare', 'Basso', 'Intermedio', true),
('Pulley Basso Presa Stretta', 'Dorso', 'Gran Dorsale & Spessore', 'Trazione Orizzontale', 'Cavi', 'Bilaterale', 'Ipertrofia', 'Complementare', 'Medio', 'Principiante', true),
('Pulley Basso Presa Larga Prona', 'Dorso', 'Trapezio Medio & Deltoidi Posteriori', 'Trazione Orizzontale', 'Cavi', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Basso', 'Principiante', true),
('T-Bar Row a Supporto Toracico', 'Dorso', 'Spessore Dorso & Romboidi', 'Trazione Orizzontale', 'Macchina', 'Bilaterale', 'Ipertrofia', 'Complementare', 'Medio', 'Principiante', true),
('Rowing Machine a Leve Convergenti', 'Dorso', 'Gran Dorsale', 'Trazione Orizzontale', 'Macchina', 'Bilaterale', 'Ipertrofia', 'Complementare', 'Basso', 'Principiante', true),
('Face Pull con Corda al Cavo Alto', 'Dorso', 'Trapezio / Rotatori / Rear Delt', 'Trazione Orizzontale', 'Cavi', 'Bilaterale', 'Mobilità', 'Prehab / Riabilitativo', 'Molto Basso', 'Principiante', true),
('Meadows Row al Landmine', 'Dorso', 'Gran Dorsale & Gran Rotondo', 'Trazione Orizzontale', 'Bilanciere', 'Unilaterale', 'Ipertrofia', 'Complementare', 'Medio', 'Avanzato', true),
('Scrollate con Manubri / Bilanciere (Shrugs)', 'Dorso', 'Trapezio Superiore', 'Trazione Verticale', 'Manubri', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Basso', 'Principiante', true),

-- SPALLE
('Military Press con Bilanciere in Piedi', 'Spalle', 'Deltoide Anteriore & Core', 'Spinta Verticale', 'Bilanciere', 'Bilaterale', 'Forza', 'Fondamentale', 'Molto Alto', 'Avanzato', true),
('Lento Avanti con Manubri Seduto', 'Spalle', 'Deltoide Anteriore / Laterale', 'Spinta Verticale', 'Manubri', 'Bilaterale', 'Ipertrofia', 'Fondamentale', 'Medio', 'Intermedio', true),
('Shoulder Press Machine Convergente', 'Spalle', 'Deltoide Anteriore', 'Spinta Verticale', 'Macchina', 'Bilaterale', 'Ipertrofia', 'Complementare', 'Basso', 'Principiante', true),
('Alzate Laterali con Manubri in Piedi', 'Spalle', 'Deltoide Laterale', 'Abduzione / Adduzione', 'Manubri', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Basso', 'Principiante', true),
('Alzate Laterali con Manubri Seduto', 'Spalle', 'Deltoide Laterale (Strict)', 'Abduzione / Adduzione', 'Manubri', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Principiante', true),
('Alzate Laterali al Cavo Basso Singolo', 'Spalle', 'Deltoide Laterale (Tensione Continua)', 'Abduzione / Adduzione', 'Cavi', 'Unilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Principiante', true),
('Alzate Laterali ai Cavi Incrociati Dietro la Schiena', 'Spalle', 'Deltoide Laterale (Allungamento)', 'Abduzione / Adduzione', 'Cavi', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Intermedio', true),
('Lateral Raise Machine', 'Spalle', 'Deltoide Laterale', 'Abduzione / Adduzione', 'Macchina', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Principiante', true),
('Alzate Posteriori con Manubri su Panca Inclinata', 'Spalle', 'Deltoide Posteriore', 'Abduzione / Adduzione', 'Manubri', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Basso', 'Principiante', true),
('Reverse Pec Deck / Rear Delt Fly', 'Spalle', 'Deltoide Posteriore', 'Abduzione / Adduzione', 'Macchina', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Principiante', true),
('Rear Delt Crossover ai Cavi Alti', 'Spalle', 'Deltoide Posteriore', 'Abduzione / Adduzione', 'Cavi', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Principiante', true),
('Arnold Press con Manubri', 'Spalle', 'Deltoide Completo', 'Spinta Verticale', 'Manubri', 'Bilaterale', 'Ipertrofia', 'Complementare', 'Medio', 'Intermedio', true),
('Y-Raise su Panca Inclinata', 'Spalle', 'Trapezio Inferiore & Deltoide Laterale', 'Abduzione / Adduzione', 'Manubri', 'Bilaterale', 'Mobilità', 'Prehab / Riabilitativo', 'Molto Basso', 'Principiante', false),
('Alzate Frontali con Manubri / Bilanciere', 'Spalle', 'Deltoide Anteriore', 'Spinta Verticale', 'Manubri', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Basso', 'Principiante', true),

-- QUADRICIPITI
('Back Squat con Bilanciere (High Bar)', 'Quadricipiti', 'Quadricipiti & Catena Posteriore', 'Squat / Accosciata', 'Bilanciere', 'Bilaterale', 'Forza', 'Fondamentale', 'Molto Alto', 'Avanzato', true),
('Front Squat con Bilanciere', 'Quadricipiti', 'Retto Femorale & Vasti (Busto Eretto)', 'Squat / Accosciata', 'Bilanciere', 'Bilaterale', 'Forza', 'Fondamentale', 'Molto Alto', 'Avanzato', true),
('Hack Squat su Slitta 45°', 'Quadricipiti', 'Quadricipiti Isolati', 'Squat / Accosciata', 'Macchina', 'Bilaterale', 'Ipertrofia', 'Fondamentale', 'Alto', 'Intermedio', true),
('Leg Press 45° (Piedi Bassi e Stretti)', 'Quadricipiti', 'Vasto Laterale & Mediale', 'Squat / Accosciata', 'Macchina', 'Bilaterale', 'Ipertrofia', 'Fondamentale', 'Alto', 'Principiante', true),
('Pendulum Squat', 'Quadricipiti', 'Quadricipite Puro', 'Squat / Accosciata', 'Macchina', 'Bilaterale', 'Ipertrofia', 'Fondamentale', 'Alto', 'Intermedio', true),
('Belt Squat', 'Quadricipiti', 'Quadricipite (Zero Carico Spinale)', 'Squat / Accosciata', 'Macchina', 'Bilaterale', 'Ipertrofia', 'Complementare', 'Medio', 'Principiante', true),
('Goblet Squat con Manubrio / Kettlebell', 'Quadricipiti', 'Quadricipiti & Mobilità Anca', 'Squat / Accosciata', 'Kettlebell', 'Bilaterale', 'Ipertrofia', 'Complementare', 'Medio', 'Principiante', true),
('Bulgarian Split Squat (Squat Bulgaro con Manubri)', 'Quadricipiti', 'Quadricipiti & Glutei (Unilaterale)', 'Affondo / Split', 'Manubri', 'Unilaterale', 'Ipertrofia', 'Complementare', 'Molto Alto', 'Intermedio', true),
('Affondi Camminati con Manubri', 'Quadricipiti', 'Quadricipiti & Glutei', 'Affondo / Split', 'Manubri', 'Alternato', 'Ipertrofia', 'Complementare', 'Alto', 'Intermedio', true),
('Affondi Indietro con Manubri', 'Quadricipiti', 'Quadricipiti (Knee-Friendly)', 'Affondo / Split', 'Manubri', 'Alternato', 'Ipertrofia', 'Complementare', 'Medio', 'Principiante', true),
('Step-Up su Box con Manubri', 'Quadricipiti', 'Quadricipiti & Gluteo', 'Affondo / Split', 'Manubri', 'Unilaterale', 'Ipertrofia', 'Complementare', 'Medio', 'Principiante', true),
('Leg Extension Machine', 'Quadricipiti', 'Retto Femorale & Vasti (Accorciamento)', 'Flessione / Estensione', 'Macchina', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Basso', 'Principiante', true),
('Sissy Squat', 'Quadricipiti', 'Retto Femorale (Allungamento Estremo)', 'Squat / Accosciata', 'Corpo Libero', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Basso', 'Avanzato', false),
('Wall Sit Isometrico', 'Quadricipiti', 'Quadricipite & Tendine Rotuleo', 'Squat / Accosciata', 'Corpo Libero', 'Bilaterale', 'Resistenza', 'Prehab / Riabilitativo', 'Basso', 'Principiante', false),

-- FEMORALI
('Stacco da Terra Regolare (Deadlift)', 'Femorali', 'Catena Posteriore Completa', 'Hinge / Cerniera d''Anca', 'Bilanciere', 'Bilaterale', 'Forza', 'Fondamentale', 'Molto Alto', 'Avanzato', true),
('Stacco Rumeno con Bilanciere (RDL)', 'Femorali', 'Femorali Hip-Dominant & Glutei', 'Hinge / Cerniera d''Anca', 'Bilanciere', 'Bilaterale', 'Ipertrofia', 'Fondamentale', 'Alto', 'Intermedio', true),
('Stacco Rumeno con Manubri', 'Femorali', 'Femorali Hip-Dominant', 'Hinge / Cerniera d''Anca', 'Manubri', 'Bilaterale', 'Ipertrofia', 'Complementare', 'Medio', 'Principiante', true),
('Single Leg Romanian Deadlift (RDL Unilaterale)', 'Femorali', 'Femorali & Stabilità Pelvica', 'Hinge / Cerniera d''Anca', 'Manubri', 'Unilaterale', 'Ipertrofia', 'Complementare', 'Medio', 'Intermedio', true),
('Good Morning con Bilanciere', 'Femorali', 'Femorali & Erettori Spinali', 'Hinge / Cerniera d''Anca', 'Bilanciere', 'Bilaterale', 'Forza', 'Complementare', 'Alto', 'Avanzato', true),
('Lying Leg Curl (Femorali Sdraiato)', 'Femorali', 'Femorali Knee-Dominant (Accorciamento)', 'Flessione / Estensione', 'Macchina', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Basso', 'Principiante', true),
('Seated Leg Curl (Femorali Seduto)', 'Femorali', 'Femorali Knee-Dominant (Allungamento)', 'Flessione / Estensione', 'Macchina', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Basso', 'Principiante', true),
('Standing Leg Curl Unilaterale', 'Femorali', 'Femorali Knee-Dominant', 'Flessione / Estensione', 'Macchina', 'Unilaterale', 'Ipertrofia', 'Isolamento', 'Basso', 'Principiante', true),
('Nordic Hamstring Curl', 'Femorali', 'Femorali Eccentrico Puro & Prevenzione', 'Flessione / Estensione', 'Corpo Libero', 'Bilaterale', 'Forza', 'Tecnico', 'Alto', 'Avanzato', false),
('Glute Ham Raise (GHR)', 'Femorali', 'Femorali & Glutei', 'Flessione / Estensione', 'Macchina', 'Bilaterale', 'Forza', 'Complementare', 'Alto', 'Avanzato', true),

-- GLUTEI
('Hip Thrust con Bilanciere', 'Glutei', 'Grande Gluteo (Max Accorciamento)', 'Hinge / Cerniera d''Anca', 'Bilanciere', 'Bilaterale', 'Ipertrofia', 'Fondamentale', 'Alto', 'Intermedio', true),
('Hip Thrust Machine Dedicata', 'Glutei', 'Grande Gluteo', 'Hinge / Cerniera d''Anca', 'Macchina', 'Bilaterale', 'Ipertrofia', 'Complementare', 'Medio', 'Principiante', true),
('Kas Glute Bridge con Bilanciere', 'Glutei', 'Grande Gluteo (Range Ridotto Isolato)', 'Hinge / Cerniera d''Anca', 'Bilanciere', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Medio', 'Intermedio', true),
('Glute Kickback al Cavo Basso', 'Glutei', 'Grande Gluteo Unilaterale', 'Hinge / Cerniera d''Anca', 'Cavi', 'Unilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Principiante', true),
('Abductor Machine (Seduto)', 'Glutei', 'Medio e Piccolo Gluteo', 'Abduzione / Adduzione', 'Macchina', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Principiante', true),
('Abduzioni d''Anca al Cavo in Piedi', 'Glutei', 'Medio Gluteo', 'Abduzione / Adduzione', 'Cavi', 'Unilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Principiante', true),
('Adductor Machine (Adduzioni Seduto)', 'Glutei', 'Adduttori (Grande e Lungo)', 'Abduzione / Adduzione', 'Macchina', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Principiante', true),
('Copenhagen Plank (Adductor Bridge)', 'Glutei', 'Adduttori & Stabilità Pelvica', 'Core Anti-Movimento', 'Corpo Libero', 'Unilaterale', 'Mobilità', 'Prehab / Riabilitativo', 'Medio', 'Intermedio', false),
('Stacco Sumo con Bilanciere', 'Glutei', 'Glutei & Adduttori', 'Hinge / Cerniera d''Anca', 'Bilanciere', 'Bilaterale', 'Forza', 'Fondamentale', 'Molto Alto', 'Avanzato', true),
('Frog Pumps con Manubrio', 'Glutei', 'Grande Gluteo (Pump Finisher)', 'Hinge / Cerniera d''Anca', 'Manubri', 'Bilaterale', 'Resistenza', 'Isolamento', 'Molto Basso', 'Principiante', false),

-- POLPACCI
('Calf Raise in Piedi alla Smith Machine', 'Polpacci', 'Gastrocnemio (Ginocchio Esteso)', 'Flessione / Estensione', 'Multipower', 'Bilaterale', 'Ipertrofia', 'Complementare', 'Basso', 'Principiante', true),
('Calf Raise su Leg Press 45°', 'Polpacci', 'Gastrocnemio (Max Allungamento)', 'Flessione / Estensione', 'Macchina', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Basso', 'Principiante', true),
('Standing Calf Machine', 'Polpacci', 'Gastrocnemio', 'Flessione / Estensione', 'Macchina', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Basso', 'Principiante', true),
('Seated Calf Raise (Seduto a 90°)', 'Polpacci', 'Soleo (Ginocchio Flesso)', 'Flessione / Estensione', 'Macchina', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Principiante', true),
('Tibialis Raise al Muro', 'Polpacci', 'Tibiale Anteriore & Caviglia', 'Flessione / Estensione', 'Corpo Libero', 'Bilaterale', 'Mobilità', 'Prehab / Riabilitativo', 'Molto Basso', 'Principiante', false),

-- BICIPITI
('Curl con Bilanciere Sagomato EZ in Piedi', 'Bicipiti', 'Bicipite Globale', 'Flessione Gomito', 'Bilanciere', 'Bilaterale', 'Ipertrofia', 'Fondamentale', 'Basso', 'Principiante', true),
('Curl con Manubri Alternato con Supinazione', 'Bicipiti', 'Capo Lungo & Corto', 'Flessione Gomito', 'Manubri', 'Alternato', 'Ipertrofia', 'Complementare', 'Basso', 'Principiante', true),
('Incline Dumbbell Curl (Panca 60°)', 'Bicipiti', 'Capo Lungo (Max Allungamento)', 'Flessione Gomito', 'Manubri', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Basso', 'Intermedio', true),
('Spider Curl con Bilanciere EZ su Panca Inclinata', 'Bicipiti', 'Capo Corto (Picco di Tensione)', 'Flessione Gomito', 'Bilanciere', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Basso', 'Intermedio', true),
('Preacher Curl / Panca Scott con Bilanciere EZ', 'Bicipiti', 'Capo Corto & Brachiale', 'Flessione Gomito', 'Bilanciere', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Basso', 'Principiante', true),
('Hammer Curl con Manubri (Presa Neutra)', 'Bicipiti', 'Brachiale & Brachioradiale', 'Flessione Gomito', 'Manubri', 'Alternato', 'Ipertrofia', 'Isolamento', 'Basso', 'Principiante', true),
('Cable Biceps Curl al Cavo Basso con Barra', 'Bicipiti', 'Bicipite Globale (Tensione Continua)', 'Flessione Gomito', 'Cavi', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Principiante', true),
('Bayesian Curl al Cavo Basso (Di Spalle)', 'Bicipiti', 'Capo Lungo (Curva Tensione Ottimale)', 'Flessione Gomito', 'Cavi', 'Unilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Intermedio', true),
('High Cable Curl ai Cavi Alti (Doppio Bicipite)', 'Bicipiti', 'Capo Corto & Picco Contrazione', 'Flessione Gomito', 'Cavi', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Principiante', true),
('Reverse Curl con Bilanciere EZ (Presa Prona)', 'Bicipiti', 'Brachioradiale & Avambracci', 'Flessione Gomito', 'Bilanciere', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Basso', 'Principiante', true),

-- TRICIPITI
('Distensioni Panca Piana Presa Stretta', 'Tricipiti', 'Tricipiti Completi & Petto', 'Spinta Orizzontale', 'Bilanciere', 'Bilaterale', 'Forza', 'Fondamentale', 'Medio', 'Intermedio', true),
('Dips alle Parallele (Focus Tricipiti - Busto Verticale)', 'Tricipiti', 'Tricipiti Completi', 'Spinta Verticale', 'Corpo Libero', 'Bilaterale', 'Forza', 'Fondamentale', 'Alto', 'Avanzato', true),
('French Press con Bilanciere EZ su Panca', 'Tricipiti', 'Capo Lungo & Mediale', 'Estensione Gomito', 'Bilanciere', 'Bilaterale', 'Ipertrofia', 'Complementare', 'Medio', 'Intermedio', true),
('Skull Crusher al Cavo Basso su Panca', 'Tricipiti', 'Capo Lungo (Elbow-Friendly)', 'Estensione Gomito', 'Cavi', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Basso', 'Principiante', true),
('Triceps Pushdown al Cavo Alto con Corda', 'Tricipiti', 'Capo Laterale & Mediale', 'Estensione Gomito', 'Cavi', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Principiante', true),
('Triceps Pushdown con Barra a V', 'Tricipiti', 'Capo Laterale', 'Estensione Gomito', 'Cavi', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Principiante', true),
('Overhead Cable Extension con Corda', 'Tricipiti', 'Capo Lungo (Allungamento)', 'Estensione Gomito', 'Cavi', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Principiante', true),
('Overhead Extension con Manubrio a Due Mani', 'Tricipiti', 'Capo Lungo', 'Estensione Gomito', 'Manubri', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Basso', 'Principiante', true),
('Cross-Body Cable Extension (Cavi Incrociati)', 'Tricipiti', 'Capo Laterale & Lungo (Zero Stress Gomito)', 'Estensione Gomito', 'Cavi', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Intermedio', true),
('Kickback al Cavo Basso Singolo', 'Tricipiti', 'Capo Laterale (Picco Accorciamento)', 'Estensione Gomito', 'Cavi', 'Unilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Principiante', true),

-- AVAMBRACCI
('Wrist Curl con Bilanciere su Panca', 'Avambracci', 'Flessori del Polso', 'Flessione / Estensione', 'Bilanciere', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Principiante', true),
('Reverse Wrist Curl con Manubri', 'Avambracci', 'Estensori del Polso', 'Flessione / Estensione', 'Manubri', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Principiante', true),
('Farmer''s Walk con Trap Bar / Manubri', 'Avambracci', 'Grip Strength & Core', 'Trasporto / Carico', 'Trap Bar', 'Bilaterale', 'Forza', 'Complementare', 'Alto', 'Intermedio', true),
('Dead Hang alla Sbarra', 'Avambracci', 'Presa & Decompressione Spinale', 'Core Anti-Movimento', 'Corpo Libero', 'Bilaterale', 'Mobilità', 'Prehab / Riabilitativo', 'Basso', 'Principiante', false),

-- ADDOME & CORE
('Ab-Wheel Rollout in Ginocchio', 'Core', 'Anti-Estensione Spinale', 'Core Anti-Movimento', 'Corpo Libero', 'Bilaterale', 'Forza', 'Fondamentale', 'Medio', 'Intermedio', true),
('Plank Tradizionale a Terra con Bracing', 'Core', 'Anti-Estensione & Stabilità', 'Core Anti-Movimento', 'Corpo Libero', 'Bilaterale', 'Resistenza', 'Fondamentale', 'Basso', 'Principiante', false),
('Pallof Press al Cavo Medio', 'Core', 'Anti-Rotazione', 'Core Anti-Movimento', 'Cavi', 'Unilaterale', 'Mobilità', 'Prehab / Riabilitativo', 'Molto Basso', 'Principiante', true),
('Pallof Press con Rotazione Dinamica', 'Core', 'Core Dinamico & Obliqui', 'Core Anti-Movimento', 'Cavi', 'Unilaterale', 'Ipertrofia', 'Complementare', 'Basso', 'Intermedio', true),
('Crunch ai Cavi in Ginocchio (Cable Rope Crunch)', 'Addome', 'Retto dell''Addome (Flessione Spinale)', 'Flessione / Estensione', 'Cavi', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Basso', 'Principiante', true),
('Hanging Leg Raise alla Sbarra (Toes to Bar)', 'Addome', 'Addome Inferiore & Flessori Anca', 'Flessione / Estensione', 'Corpo Libero', 'Bilaterale', 'Forza', 'Complementare', 'Medio', 'Avanzato', true),
('Hanging Knee Raise (Ginocchia al Petto)', 'Addome', 'Addome & Stabilità Sbarra', 'Flessione / Estensione', 'Corpo Libero', 'Bilaterale', 'Resistenza', 'Complementare', 'Basso', 'Principiante', true),
('Deadbug a Corpo Libero / con Fitball', 'Core', 'Anti-Estensione & Coordinazione Motoria', 'Core Anti-Movimento', 'Corpo Libero', 'Alternato', 'Mobilità', 'Prehab / Riabilitativo', 'Molto Basso', 'Principiante', false),
('Bird Dog Isometrico', 'Core', 'Catena Posteriore Incrociata', 'Core Anti-Movimento', 'Corpo Libero', 'Alternato', 'Mobilità', 'Prehab / Riabilitativo', 'Molto Basso', 'Principiante', false),
('Side Plank (Plank Laterale)', 'Core', 'Anti-Flessione Laterale & Obliqui', 'Core Anti-Movimento', 'Corpo Libero', 'Unilaterale', 'Resistenza', 'Fondamentale', 'Basso', 'Principiante', false),
('Suitcase Carry con Manubrio Singolo', 'Core', 'Anti-Flessione Laterale & Quadrato dei Lombi', 'Trasporto / Carico', 'Manubri', 'Unilaterale', 'Forza', 'Complementare', 'Medio', 'Intermedio', true),
('Russian Twist con Disco', 'Addome', 'Obliqui & Rotazione Tronco', 'Core Anti-Movimento', 'Manubri', 'Alternato', 'Ipertrofia', 'Isolamento', 'Basso', 'Principiante', true),
('Landmine Rotations', 'Core', 'Core Rotazionale & Obliqui', 'Core Anti-Movimento', 'Bilanciere', 'Alternato', 'Potenza', 'Complementare', 'Medio', 'Avanzato', true),
('Dragon Flag su Panca Piana', 'Core', 'Anti-Estensione Avanzata', 'Core Anti-Movimento', 'Corpo Libero', 'Bilaterale', 'Forza', 'Tecnico', 'Alto', 'Avanzato', false),

-- LOMBARI
('Hyperextension su Panca a 45°', 'Lombari', 'Erettori Spinali & Glutei', 'Hinge / Cerniera d''Anca', 'Macchina', 'Bilaterale', 'Ipertrofia', 'Complementare', 'Medio', 'Principiante', true),
('Reverse Hyperextension Machine', 'Lombari', 'Erettori Spinali & Decompressione Sacrale', 'Hinge / Cerniera d''Anca', 'Macchina', 'Bilaterale', 'Mobilità', 'Prehab / Riabilitativo', 'Basso', 'Principiante', true),
('Jefferson Curl con Manubrio Leggero', 'Lombari', 'Flessione/Estensione Spinale Segmentale', 'Hinge / Cerniera d''Anca', 'Manubri', 'Bilaterale', 'Mobilità', 'Prehab / Riabilitativo', 'Basso', 'Avanzato', false),
('Superman a Terra con Tenuta', 'Lombari', 'Erettori Spinali & Multifido', 'Hinge / Cerniera d''Anca', 'Corpo Libero', 'Bilaterale', 'Resistenza', 'Prehab / Riabilitativo', 'Molto Basso', 'Principiante', false),

-- FULL BODY & CONDITIONING
('Trap Bar Deadlift (Presa Neutra)', 'Full Body', 'Catena Posteriore & Quadricipiti', 'Hinge / Cerniera d''Anca', 'Trap Bar', 'Bilaterale', 'Forza', 'Fondamentale', 'Molto Alto', 'Principiante', true),
('Clean and Press con Bilanciere', 'Full Body', 'Potenza Multi-articolare', 'Spinta Verticale', 'Bilanciere', 'Bilaterale', 'Potenza', 'Tecnico', 'Molto Alto', 'Avanzato', true),
('Push Press con Bilanciere', 'Full Body', 'Spinta Balistica Spalle/Gambe', 'Spinta Verticale', 'Bilanciere', 'Bilaterale', 'Potenza', 'Fondamentale', 'Alto', 'Intermedio', true),
('Thruster con Bilanciere / Manubri', 'Full Body', 'Squat to Overhead Press', 'Squat / Accosciata', 'Bilanciere', 'Bilaterale', 'Condizionamento', 'Fondamentale', 'Molto Alto', 'Intermedio', true),
('Kettlebell Swing (Stile Russo)', 'Full Body', 'Potenza d''Anca & Glutei', 'Hinge / Cerniera d''Anca', 'Kettlebell', 'Bilaterale', 'Potenza', 'Complementare', 'Medio', 'Intermedio', true),
('Kettlebell Snatch Unilaterale', 'Full Body', 'Potenza Unilaterale & Spalla', 'Hinge / Cerniera d''Anca', 'Kettlebell', 'Unilaterale', 'Potenza', 'Tecnico', 'Alto', 'Avanzato', true),
('Prowler / Sled Push (Spinta Slitta)', 'Conditioning', 'Quadricipiti & Potenza Lattacida', 'Trasporto / Carico', 'Slitta', 'Alternato', 'Condizionamento', 'Complementare', 'Alto', 'Principiante', true),
('Sled Drag / Pull (Tirata Slitta Indietro)', 'Conditioning', 'Quadricipiti & Prevenzione Ginocchio', 'Trasporto / Carico', 'Slitta', 'Alternato', 'Mobilità', 'Prehab / Riabilitativo', 'Medio', 'Principiante', true),
('Rowing Ergometer (Vogatore Concept2)', 'Conditioning', 'Resistenza Cardiovascolare & Dorso/Gambe', 'Trazione Orizzontale', 'Cardio Machine', 'Bilaterale', 'Condizionamento', 'Fondamentale', 'Alto', 'Principiante', true),
('SkiErg (Sci di Fondo)', 'Conditioning', 'Gran Dorsale, Core & VO2 Max', 'Trazione Verticale', 'Cardio Machine', 'Bilaterale', 'Condizionamento', 'Complementare', 'Medio', 'Principiante', true),
('Assault Bike / Air Bike Sprints', 'Conditioning', 'Gambe, Braccia & Potenza Anaerobica', 'Trasporto / Carico', 'Cardio Machine', 'Alternato', 'Condizionamento', 'Fondamentale', 'Molto Alto', 'Principiante', true),
('Battle Ropes (Onde Alterne & Slam)', 'Conditioning', 'Spalle, Braccia & Core Lattacido', 'Core Anti-Movimento', 'Altro', 'Alternato', 'Condizionamento', 'Isolamento', 'Medio', 'Principiante', false)

ON CONFLICT (LOWER(TRIM(name)), (COALESCE(coach_id, '00000000-0000-0000-0000-000000000000'::uuid)))
DO UPDATE SET
  category = EXCLUDED.category,
  target_specifico = EXCLUDED.target_specifico,
  pattern_movimento = EXCLUDED.pattern_movimento,
  equipment = EXCLUDED.equipment,
  bilateralita = EXCLUDED.bilateralita,
  tipo = EXCLUDED.tipo,
  ruolo_esercizio = EXCLUDED.ruolo_esercizio,
  costo_sistemico = EXCLUDED.costo_sistemico,
  livello_difficolta = EXCLUDED.livello_difficolta,
  progression_friendly = EXCLUDED.progression_friendly,
  updated_at = NOW();

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

-- =====================================================================================
-- 1.16 INBOX AI & INSTAGRAM CONTENTS PIPELINE
-- =====================================================================================

DO $$ BEGIN
    CREATE TYPE public.inbox_category_enum AS ENUM (
        'content_idea',
        'client_observation',
        'business_task',
        'personal_reflection',
        'system_improvement'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.inbox_priority_enum AS ENUM (
        'low',
        'medium',
        'high',
        'urgent'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.inbox_status_enum AS ENUM (
        'raw',
        'processing',
        'processed',
        'converted_task',
        'converted_content',
        'linked_athlete',
        'archived'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.content_type_enum AS ENUM (
        'reel',
        'story',
        'carousel',
        'post'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.content_pillar_enum AS ENUM (
        'technique_execution',
        'common_mistakes',
        'mindset_discipline',
        'nutrition_science',
        'client_transformation',
        'coaching_faq',
        'authority_lifestyle',
        'promotion_launch'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.content_status_enum AS ENUM (
        'idea',
        'script_draft',
        'ready_to_record',
        'recorded',
        'editing',
        'ready_to_publish',
        'published',
        'repurpose'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.inbox_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    raw_content TEXT NOT NULL,
    audio_url TEXT,
    ai_title TEXT,
    ai_summary TEXT,
    ai_category public.inbox_category_enum,
    ai_priority public.inbox_priority_enum DEFAULT 'medium',
    ai_suggested_tasks JSONB DEFAULT '[]'::jsonb,
    ai_content_opportunity JSONB,
    ai_next_step TEXT,
    related_athlete_id UUID REFERENCES public.athletes(id) ON DELETE SET NULL,
    status public.inbox_status_enum NOT NULL DEFAULT 'raw',
    converted_content_id UUID,
    converted_task_id UUID,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.instagram_contents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    origin_inbox_id UUID REFERENCES public.inbox_entries(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    type public.content_type_enum NOT NULL DEFAULT 'reel',
    pillar public.content_pillar_enum NOT NULL DEFAULT 'technique_execution',
    status public.content_status_enum NOT NULL DEFAULT 'idea',
    hook TEXT,
    script_body TEXT,
    caption TEXT,
    call_to_action TEXT,
    scheduled_for TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    internal_notes TEXT,
    performance_metrics JSONB DEFAULT '{"views": 0, "likes": 0, "saves": 0, "shares": 0, "leads": 0}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.coach_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    origin_inbox_id UUID REFERENCES public.inbox_entries(id) ON DELETE SET NULL,
    related_athlete_id UUID REFERENCES public.athletes(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    priority public.inbox_priority_enum NOT NULL DEFAULT 'medium',
    due_date DATE,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_inbox_converted_content') THEN
        ALTER TABLE public.inbox_entries 
            ADD CONSTRAINT fk_inbox_converted_content 
            FOREIGN KEY (converted_content_id) REFERENCES public.instagram_contents(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_inbox_converted_task') THEN
        ALTER TABLE public.inbox_entries 
            ADD CONSTRAINT fk_inbox_converted_task 
            FOREIGN KEY (converted_task_id) REFERENCES public.coach_tasks(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_inbox_coach_status ON public.inbox_entries(coach_id, status);
CREATE INDEX IF NOT EXISTS idx_inbox_created ON public.inbox_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contents_coach_status ON public.instagram_contents(coach_id, status);
CREATE INDEX IF NOT EXISTS idx_contents_scheduled ON public.instagram_contents(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_coach_tasks_completed ON public.coach_tasks(coach_id, is_completed, due_date);

ALTER TABLE public.inbox_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_tasks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Coach manages own inbox entries" ON public.inbox_entries;
    CREATE POLICY "Coach manages own inbox entries"
        ON public.inbox_entries FOR ALL TO authenticated
        USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Coach manages own instagram contents" ON public.instagram_contents;
    CREATE POLICY "Coach manages own instagram contents"
        ON public.instagram_contents FOR ALL TO authenticated
        USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Coach manages own tasks" ON public.coach_tasks;
    CREATE POLICY "Coach manages own tasks"
        ON public.coach_tasks FOR ALL TO authenticated
        USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Notifica ricaricamento dello schema REST
NOTIFY pgrst, 'reload schema';
