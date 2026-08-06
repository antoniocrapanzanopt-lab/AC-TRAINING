-- =====================================================================================
-- BUILDER ATHLETE MANAGER — MASTER DATABASE SCHEMA
-- Esegui questo script nel SQL Editor di Supabase per configurare o aggiornare l'intero DB.
-- =====================================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS unique_exercise_name_per_coach 
ON public.exercises (LOWER(TRIM(name)), (COALESCE(coach_id, '00000000-0000-0000-0000-000000000000'::uuid)));

-- 4. WORKOUTS (PROGRAMMI MADRE)
CREATE TABLE IF NOT EXISTS public.workouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    coach_id UUID REFERENCES auth.users(id) NOT NULL,
    is_template BOOLEAN DEFAULT false,
    total_weeks INTEGER DEFAULT 1,
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
-- HELPER FUNCTIONS & RLS SECURITY
-- =====================================================================================

CREATE OR REPLACE FUNCTION is_athlete() RETURNS BOOLEAN AS $$
BEGIN
   RETURN EXISTS (
      SELECT 1 FROM public.athletes WHERE LOWER(TRIM(email)) = LOWER(TRIM(auth.jwt()->>'email'))
   );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_coach() RETURNS BOOLEAN AS $$
BEGIN
   RETURN NOT is_athlete();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE public.athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_assigned_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_logs ENABLE ROW LEVEL SECURITY;

-- POLICIES ATHLETES
DROP POLICY IF EXISTS "coach_all_athletes" ON public.athletes;
CREATE POLICY "coach_all_athletes" ON public.athletes FOR ALL TO authenticated USING (is_coach()) WITH CHECK (is_coach());

DROP POLICY IF EXISTS "athlete_own_profile" ON public.athletes;
CREATE POLICY "athlete_own_profile" ON public.athletes FOR SELECT TO authenticated USING (LOWER(TRIM(email)) = LOWER(TRIM(auth.jwt()->>'email')));

-- POLICIES EXERCISES
DROP POLICY IF EXISTS "read_exercises_policy" ON public.exercises;
CREATE POLICY "read_exercises_policy" ON public.exercises FOR SELECT TO authenticated USING (coach_id IS NULL OR coach_id::uuid = auth.uid()::uuid);

DROP POLICY IF EXISTS "coach_manage_own_exercises" ON public.exercises;
CREATE POLICY "coach_manage_own_exercises" ON public.exercises FOR ALL TO authenticated USING (coach_id::uuid = auth.uid()::uuid) WITH CHECK (coach_id::uuid = auth.uid()::uuid);

-- POLICIES WORKOUTS
DROP POLICY IF EXISTS "coach_manage_workouts" ON public.workouts;
CREATE POLICY "coach_manage_workouts" ON public.workouts FOR ALL TO authenticated USING (coach_id::uuid = auth.uid()::uuid);

DROP POLICY IF EXISTS "athlete_read_assigned_workouts" ON public.workouts;
CREATE POLICY "athlete_read_assigned_workouts" ON public.workouts FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.athlete_assigned_workouts aaw
        JOIN public.athletes a ON a.id::uuid = aaw.athlete_id::uuid
        WHERE aaw.workout_id::uuid = workouts.id::uuid AND LOWER(TRIM(a.email::text)) = LOWER(TRIM((auth.jwt()->>'email')::text))
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
        JOIN public.athletes a ON a.id::uuid = aaw.athlete_id::uuid
        WHERE aaw.workout_id::uuid = workout_exercises.workout_id::uuid AND LOWER(TRIM(a.email::text)) = LOWER(TRIM((auth.jwt()->>'email')::text))
    )
);

-- POLICIES ASSIGNMENTS
DROP POLICY IF EXISTS "coach_manage_assignments" ON public.athlete_assigned_workouts;
CREATE POLICY "coach_manage_assignments" ON public.athlete_assigned_workouts FOR ALL TO authenticated USING (assigned_by::uuid = auth.uid()::uuid);

DROP POLICY IF EXISTS "athlete_read_assignments" ON public.athlete_assigned_workouts;
CREATE POLICY "athlete_read_assignments" ON public.athlete_assigned_workouts FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.athletes a WHERE a.id::uuid = athlete_assigned_workouts.athlete_id::uuid AND LOWER(TRIM(a.email::text)) = LOWER(TRIM((auth.jwt()->>'email')::text)))
);

-- POLICIES SESSIONS & LOGS
DROP POLICY IF EXISTS "athlete_manage_sessions" ON public.workout_sessions;
CREATE POLICY "athlete_manage_sessions" ON public.workout_sessions FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.athletes a WHERE a.id::uuid = workout_sessions.athlete_id::uuid AND LOWER(TRIM(a.email::text)) = LOWER(TRIM((auth.jwt()->>'email')::text)))
);

DROP POLICY IF EXISTS "athlete_manage_logs" ON public.exercise_logs;
CREATE POLICY "athlete_manage_logs" ON public.exercise_logs FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.workout_sessions ws
        JOIN public.athletes a ON a.id::uuid = ws.athlete_id::uuid
        WHERE ws.id::uuid = exercise_logs.session_id::uuid AND LOWER(TRIM(a.email::text)) = LOWER(TRIM((auth.jwt()->>'email')::text))
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

NOTIFY pgrst, 'reload schema';
