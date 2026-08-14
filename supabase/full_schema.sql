-- =====================================================================================
-- BUILDER ATHLETE MANAGER — MASTER DATABASE SCHEMA
-- Esegui questo script nel SQL Editor di Supabase per configurare o aggiornare l'intero DB.
-- =====================================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================================================
-- 0. AUTH TRIGGER (BLOCCO REGISTRAZIONI ABUSIVE VIA API)
-- Impedisce fisicamente la creazione di account Supabase se l'email non è stata 
-- prima inserita dal coach nella tabella athletes. Previene spam e account fantasma.
-- =====================================================================================
CREATE OR REPLACE FUNCTION public.check_user_signup()
RETURNS trigger AS $$
BEGIN
  -- Il coach è sempre autorizzato
  IF NEW.email = 'antonio.crapanzanopt@gmail.com' THEN
    RETURN NEW;
  END IF;

  -- Se l'email non è nella tabella athletes, rigetta la creazione dell'account Auth
  IF NOT EXISTS (SELECT 1 FROM public.athletes WHERE LOWER(TRIM(email)) = LOWER(TRIM(NEW.email))) THEN
    RAISE EXCEPTION 'Accesso Negato: Email non autorizzata o non presente negli inviti del coach.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger agganciato direttamente alla tabella di sistema auth.users
DROP TRIGGER IF EXISTS validate_user_signup ON auth.users;
CREATE TRIGGER validate_user_signup
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.check_user_signup();

-- 1. ATHLETES
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
    contact_channel TEXT,
    acquisition_source TEXT,
    assigned_coach_id TEXT,
    assigned_coach_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ATHLETE NOTES & TIMELINE
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

-- 3. EXERCISES LIBRARY
CREATE TABLE IF NOT EXISTS public.exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Altro',
    equipment TEXT DEFAULT 'Corpo Libero',
    video_url TEXT,
    instructions TEXT,
    -- ── Informazioni Chiave (Strutturate) ──────────────────────────────────
    tipo TEXT,                       -- 'Forza' | 'Ipertrofia' | 'Resistenza' | 'Potenza' | 'Mobilità'
    bilateralita TEXT,               -- 'Bilaterale' | 'Unilaterale'
    piano_movimento TEXT,            -- 'Sagittale' | 'Frontale (scapolare)' | 'Frontale' | 'Trasverso' | 'Multi-piano'
    catena_cinetica TEXT,            -- 'Aperta' | 'Chiusa' | 'Mista'
    gradi_liberta INTEGER,           -- 1, 2, 3
    -- ── Parametri Chiave (JSONB) ───────────────────────────────────────────
    -- { rom: string, curva_resistenza: string, punto_picco: string,
    --   tipo_stimolo: string, tut: {min, max}, recupero: {min, max} }
    parametri_chiave JSONB,
    -- ── Muscoli Coinvolti (JSONB Array) ───────────────────────────────────
    -- [{ muscolo: string, ruolo: 'Target'|'Sinergico'|'Stabilizzatore'|'Motore dinamico', percentuale: number }]
    muscoli_coinvolti JSONB,
    -- ── Esecuzione (JSONB) ─────────────────────────────────────────────────
    -- { setup: string[], concentrica: {descrizione, vettore_movimento, traiettoria, cues[]},
    --   eccentrica: {descrizione, vettore_resistenza, traiettoria, cues[]} }
    esecuzione JSONB,
    -- ── Sicurezza e Controindicazioni (JSONB) ─────────────────────────────
    -- { compensi_da_evitare: string[], criteri_arresto: string[],
    --   controindicazioni: string[], tolleranze: string }
    sicurezza JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ALTER TABLE per aggiungere le nuove colonne a tabelle exercises già esistenti in produzione
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

-- 4. WORKOUT FOLDERS & WORKOUTS
CREATE TABLE IF NOT EXISTS public.workout_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    parent_id UUID REFERENCES public.workout_folders(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#EAB308',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- 5. WORKOUT EXERCISES
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

-- ALTER TABLE PER AGGIORNARE TABELLE GIA ESISTENTI IN POSTGRES
ALTER TABLE public.athletes 
ADD COLUMN IF NOT EXISTS medical_cert_url TEXT,
ADD COLUMN IF NOT EXISTS medical_cert_type TEXT DEFAULT 'agonistico',
ADD COLUMN IF NOT EXISTS telegram_username TEXT;

ALTER TABLE public.workouts 
ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.workout_folders(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS total_weeks INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS estimated_duration_minutes TEXT;

ALTER TABLE public.workout_exercises 
ADD COLUMN IF NOT EXISTS day_name TEXT DEFAULT 'Giorno A',
ADD COLUMN IF NOT EXISTS week_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS target_weight TEXT,
ADD COLUMN IF NOT EXISTS rir_target TEXT,
ADD COLUMN IF NOT EXISTS tut TEXT,
ADD COLUMN IF NOT EXISTS is_time_based BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
ADD COLUMN IF NOT EXISTS alternative_exercise TEXT;

-- 6. ATHLETE ASSIGNED WORKOUTS
CREATE TABLE IF NOT EXISTS public.athlete_assigned_workouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID REFERENCES public.athletes(id) ON DELETE CASCADE NOT NULL,
    workout_id UUID REFERENCES public.workouts(id) ON DELETE CASCADE NOT NULL,
    assigned_by UUID REFERENCES auth.users(id) NOT NULL,
    assigned_date TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. WORKOUT SESSIONS & LOGS
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

-- =====================================================================================
-- NOTA: Sostituisci '00000000-0000-0000-0000-000000000000' con il tuo auth.uid() reale.
-- Lo trovi in Supabase → Authentication → Users → antonio.crapanzanopt@gmail.com → User UID.
-- =====================================================================================

CREATE OR REPLACE FUNCTION get_coach_uid() RETURNS UUID AS $$
  -- UUID reale Supabase di antonio.crapanzanopt@gmail.com
  SELECT '9f683185-a2b4-4d6c-a3e4-1a2c1a227f69'::UUID;
$$ LANGUAGE SQL IMMUTABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_coach() RETURNS BOOLEAN AS $$
BEGIN
   -- SICUREZZA: verifica solo tramite auth.uid() (UUID Supabase), mai tramite email o fallback.
   -- Solo il coach registrato con questo UUID può accedere alla dashboard.
   RETURN auth.uid() = get_coach_uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_athlete() RETURNS BOOLEAN AS $$
BEGIN
   -- Il coach non è mai un atleta
   IF auth.uid() = get_coach_uid() THEN
      RETURN FALSE;
   END IF;
   -- SICUREZZA: Un atleta è ESCLUSIVAMENTE chi ha l'auth_user_id collegato. Niente fallback su JWT email.
   RETURN EXISTS (
      SELECT 1 FROM public.athletes 
      WHERE auth_user_id = auth.uid()
   );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5b. AUTO-LINK ACCOUNT ATLETA (Messa in Sicurezza)
-- Esegue con privilegi definer. Permette all'atleta di "reclamare" il proprio profilo
-- solo se l'email corrisponde al JWT e se l'email è stata verificata.
CREATE OR REPLACE FUNCTION link_athlete_account() RETURNS BOOLEAN AS $$
DECLARE
    affected_rows INT;
BEGIN
    IF auth.uid() IS NULL THEN RETURN FALSE; END IF;
    IF auth.uid() = get_coach_uid() THEN RETURN FALSE; END IF;

    -- SICUREZZA CRITICA: Verifica che l'email nel JWT sia effettivamente confermata
    -- Previene Account Takeover da parte di utenti che registrano email altrui senza confermarle.
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- Funzione sicura per permettere il controllo delle email in fase di registrazione
-- Esegue con i privilegi del definer (bypass RLS) ma restituisce SOLO un booleano, non espone dati.
CREATE OR REPLACE FUNCTION check_invite_email(email_to_check TEXT) RETURNS BOOLEAN AS $$
BEGIN
   RETURN EXISTS (
      SELECT 1 FROM public.athletes 
      WHERE LOWER(TRIM(email)) = LOWER(TRIM(email_to_check))
   );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RLS POLICIES (CORE)
-- POLICIES ATHLETES
DROP POLICY IF EXISTS "coach_all_athletes" ON public.athletes;
CREATE POLICY "coach_all_athletes" ON public.athletes FOR ALL TO authenticated USING (is_coach()) WITH CHECK (is_coach());

DROP POLICY IF EXISTS "athlete_own_profile" ON public.athletes;
CREATE POLICY "athlete_own_profile" ON public.athletes FOR SELECT TO authenticated 
USING (auth_user_id = auth.uid());

-- POLICIES ATHLETE NOTES (era mancante!)
DROP POLICY IF EXISTS "coach_manage_athlete_notes" ON public.athlete_notes;
CREATE POLICY "coach_manage_athlete_notes" ON public.athlete_notes FOR ALL TO authenticated 
USING (is_coach()) WITH CHECK (is_coach());

DROP POLICY IF EXISTS "athlete_read_own_notes" ON public.athlete_notes;
CREATE POLICY "athlete_read_own_notes" ON public.athlete_notes FOR SELECT TO authenticated
USING (
    visibility = 'athlete' AND
    EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = athlete_notes.athlete_id AND a.auth_user_id = auth.uid())
);

-- POLICIES ATHLETE TIMELINE (era mancante!)
DROP POLICY IF EXISTS "coach_manage_athlete_timeline" ON public.athlete_timeline;
CREATE POLICY "coach_manage_athlete_timeline" ON public.athlete_timeline FOR ALL TO authenticated 
USING (is_coach()) WITH CHECK (is_coach());

DROP POLICY IF EXISTS "athlete_read_own_timeline" ON public.athlete_timeline;
CREATE POLICY "athlete_read_own_timeline" ON public.athlete_timeline FOR SELECT TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = athlete_timeline.athlete_id AND a.auth_user_id = auth.uid())
);

-- POLICIES EXERCISES
DROP POLICY IF EXISTS "read_exercises_policy" ON public.exercises;
CREATE POLICY "read_exercises_policy" ON public.exercises FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "coach_manage_own_exercises" ON public.exercises;
CREATE POLICY "coach_manage_own_exercises" ON public.exercises FOR ALL TO authenticated USING (coach_id::uuid = auth.uid()::uuid) WITH CHECK (coach_id::uuid = auth.uid()::uuid);

-- POLICIES WORKOUT FOLDERS
DROP POLICY IF EXISTS "coach_manage_folders" ON public.workout_folders;
CREATE POLICY "coach_manage_folders" ON public.workout_folders FOR ALL TO authenticated USING (coach_id::uuid = auth.uid()::uuid) WITH CHECK (coach_id::uuid = auth.uid()::uuid);

-- POLICIES WORKOUTS
DROP POLICY IF EXISTS "coach_manage_workouts" ON public.workouts;
CREATE POLICY "coach_manage_workouts" ON public.workouts FOR ALL TO authenticated USING (coach_id::uuid = auth.uid()::uuid);

DROP POLICY IF EXISTS "athlete_read_assigned_workouts" ON public.workouts;
CREATE POLICY "athlete_read_assigned_workouts" ON public.workouts FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.athlete_assigned_workouts aaw
        JOIN public.athletes a ON a.id = aaw.athlete_id
        WHERE aaw.workout_id = workouts.id AND a.auth_user_id = auth.uid()
    )
);

-- POLICIES WORKOUT EXERCISES
DROP POLICY IF EXISTS "coach_manage_exercises" ON public.workout_exercises;
CREATE POLICY "coach_manage_exercises" ON public.workout_exercises FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.workouts w WHERE w.id::uuid = workout_exercises.workout_id::uuid AND w.coach_id::uuid = auth.uid()::uuid)
);

DROP POLICY IF EXISTS "athlete_read_exercises" ON public.workout_exercises;
CREATE POLICY "athlete_read_exercises" ON public.workout_exercises FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.athlete_assigned_workouts aaw
        JOIN public.athletes a ON a.id = aaw.athlete_id
        WHERE aaw.workout_id = workout_exercises.workout_id AND a.auth_user_id = auth.uid()
    )
);

-- POLICIES ASSIGNMENTS
DROP POLICY IF EXISTS "coach_manage_assignments" ON public.athlete_assigned_workouts;
CREATE POLICY "coach_manage_assignments" ON public.athlete_assigned_workouts FOR ALL TO authenticated USING (assigned_by::uuid = auth.uid()::uuid);

DROP POLICY IF EXISTS "athlete_read_assignments" ON public.athlete_assigned_workouts;
CREATE POLICY "athlete_read_assignments" ON public.athlete_assigned_workouts FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = athlete_assigned_workouts.athlete_id AND a.auth_user_id = auth.uid())
);

-- POLICIES SESSIONS & LOGS
DROP POLICY IF EXISTS "athlete_manage_sessions" ON public.workout_sessions;
CREATE POLICY "athlete_manage_sessions" ON public.workout_sessions FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = workout_sessions.athlete_id AND a.auth_user_id = auth.uid())
);

DROP POLICY IF EXISTS "athlete_manage_logs" ON public.exercise_logs;
CREATE POLICY "athlete_manage_logs" ON public.exercise_logs FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.workout_sessions ws
        JOIN public.athletes a ON a.id = ws.athlete_id
        WHERE ws.id = exercise_logs.session_id AND a.auth_user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "coach_read_sessions" ON public.workout_sessions;
CREATE POLICY "coach_read_sessions" ON public.workout_sessions FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.workouts w WHERE w.id::uuid = workout_sessions.workout_id::uuid AND w.coach_id::uuid = auth.uid()::uuid)
);

DROP POLICY IF EXISTS "coach_read_logs" ON public.exercise_logs;
CREATE POLICY "coach_read_logs" ON public.exercise_logs FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.workout_sessions ws
        JOIN public.workouts w ON w.id::uuid = ws.workout_id::uuid
        WHERE ws.id::uuid = exercise_logs.session_id::uuid AND w.coach_id::uuid = auth.uid()::uuid
    )
);

-- DEFAULT EXERCISES SEED
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

-- 7. SUPABASE STORAGE BUCKETS & RLS POLICIES FOR PRIVATE ATTACHMENTS
INSERT INTO storage.buckets (id, name, public) 
VALUES ('medical-certificates', 'medical-certificates', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('exercise-videos', 'exercise-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
-- MEDICAL CERTIFICATES
DROP POLICY IF EXISTS "manage_medical_certs" ON storage.objects;

CREATE POLICY "manage_medical_certs" 
ON storage.objects FOR ALL TO authenticated 
USING (
  bucket_id = 'medical-certificates' AND
  EXISTS (
    SELECT 1 FROM public.athletes
    WHERE athletes.id::text = (storage.foldername(name))[1]
    AND (
      athletes.assigned_coach_id = auth.uid()::text 
      OR athletes.auth_user_id = auth.uid()
    )
  )
)
WITH CHECK (
  bucket_id = 'medical-certificates' AND
  EXISTS (
    SELECT 1 FROM public.athletes
    WHERE athletes.id::text = (storage.foldername(name))[1]
    AND (
      athletes.assigned_coach_id = auth.uid()::text 
      OR athletes.auth_user_id = auth.uid()
    )
  )
);

-- VIDEO ESERCIZI: solo il coach gestisce i video
DROP POLICY IF EXISTS "authenticated_manage_exercise_videos" ON storage.objects;
DROP POLICY IF EXISTS "coach_manage_exercise_videos" ON storage.objects;
CREATE POLICY "coach_manage_exercise_videos" ON storage.objects FOR ALL TO authenticated 
USING (bucket_id = 'exercise-videos' AND is_coach()) WITH CHECK (bucket_id = 'exercise-videos' AND is_coach());

-- VIDEO ESERCIZI READ: gli atleti possono solo leggere i video (bucket pubblico)
DROP POLICY IF EXISTS "athlete_read_exercise_videos" ON storage.objects;
CREATE POLICY "athlete_read_exercise_videos" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'exercise-videos');

-- Reload Schema Notification
NOTIFY pgrst, 'reload schema';

-- 8. CHAT MESSAGES
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID, -- For future group chat
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_read BOOLEAN DEFAULT false
);

CREATE OR REPLACE FUNCTION restrict_message_updates() RETURNS trigger AS $$
BEGIN
    -- SICUREZZA: Impedisce a chiunque di modificare il testo, mittente o destinatario di un messaggio dopo l'invio.
    -- L'unica colonna che può essere aggiornata (es. per segnare come letto) è is_read.
    IF NEW.content IS DISTINCT FROM OLD.content OR 
       NEW.sender_id IS DISTINCT FROM OLD.sender_id OR 
       NEW.receiver_id IS DISTINCT FROM OLD.receiver_id OR 
       NEW.conversation_id IS DISTINCT FROM OLD.conversation_id THEN
        RAISE EXCEPTION 'Manomissione rilevata: è consentito aggiornare solo lo stato di lettura del messaggio.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS restrict_message_updates_trigger ON public.messages;
CREATE TRIGGER restrict_message_updates_trigger
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION restrict_message_updates();

CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS messages_receiver_id_idx ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS messages_conversation_id_idx ON public.messages(conversation_id);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own messages" ON public.messages;
CREATE POLICY "Users can read own messages" ON public.messages
    FOR SELECT TO authenticated
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can insert own messages" ON public.messages;
CREATE POLICY "Users can insert own messages" ON public.messages
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = sender_id AND 
        (is_coach() OR receiver_id = get_coach_uid())
    );

DROP POLICY IF EXISTS "Users can update received messages" ON public.messages;
CREATE POLICY "Users can update received messages" ON public.messages
    FOR UPDATE TO authenticated
    USING (auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can delete own messages" ON public.messages;
CREATE POLICY "Users can delete own messages" ON public.messages
    FOR DELETE TO authenticated
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id OR is_coach());

-- Add to Realtime
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;
END $$;

-- 9. ATHLETE METRICS & MEASUREMENTS
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

ALTER TABLE public.athlete_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coach_manage_metrics" ON public.athlete_metrics;
CREATE POLICY "coach_manage_metrics" ON public.athlete_metrics FOR ALL TO authenticated USING (is_coach()) WITH CHECK (is_coach());

DROP POLICY IF EXISTS "athlete_own_metrics" ON public.athlete_metrics;
CREATE POLICY "athlete_own_metrics" ON public.athlete_metrics FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = athlete_metrics.athlete_id AND a.auth_user_id = auth.uid())
);

-- 10. ATHLETE MAX LIFTS & 1RM
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

ALTER TABLE public.athlete_max_lifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coach_manage_max_lifts" ON public.athlete_max_lifts;
CREATE POLICY "coach_manage_max_lifts" ON public.athlete_max_lifts FOR ALL TO authenticated USING (is_coach()) WITH CHECK (is_coach());

DROP POLICY IF EXISTS "athlete_own_max_lifts" ON public.athlete_max_lifts;
CREATE POLICY "athlete_own_max_lifts" ON public.athlete_max_lifts FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = athlete_max_lifts.athlete_id AND a.auth_user_id = auth.uid())
);

NOTIFY pgrst, 'reload schema';


