-- ==========================================
-- SISTEMA SCHEDE DI ALLENAMENTO E LOG
-- ==========================================

-- 1. Tabelle Workouts (Le Schede Madre)
CREATE TABLE IF NOT EXISTS public.workouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    coach_id UUID REFERENCES auth.users(id) NOT NULL,
    is_template BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabelle Workout Exercises (Gli esercizi dentro la scheda)
CREATE TABLE IF NOT EXISTS public.workout_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_id UUID REFERENCES public.workouts(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    sets INTEGER NOT NULL DEFAULT 1,
    reps_target TEXT NOT NULL,
    rest_seconds INTEGER NOT NULL DEFAULT 60,
    order_index INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    video_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Assegnazione all'Atleta
CREATE TABLE IF NOT EXISTS public.athlete_assigned_workouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID REFERENCES public.athletes(id) ON DELETE CASCADE NOT NULL,
    workout_id UUID REFERENCES public.workouts(id) ON DELETE CASCADE NOT NULL,
    assigned_by UUID REFERENCES auth.users(id) NOT NULL,
    assigned_date TIMESTAMPTZ DEFAULT now(),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Sessioni di Allenamento (Log)
CREATE TABLE IF NOT EXISTS public.workout_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID REFERENCES public.athletes(id) ON DELETE CASCADE NOT NULL,
    workout_id UUID REFERENCES public.workouts(id) ON DELETE CASCADE NOT NULL,
    start_time TIMESTAMPTZ DEFAULT now() NOT NULL,
    end_time TIMESTAMPTZ,
    notes TEXT,
    rpe INTEGER CHECK (rpe >= 1 AND rpe <= 10)
);

-- 5. Dati reali dell'allenamento (Chili e Ripetizioni)
CREATE TABLE IF NOT EXISTS public.exercise_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.workout_sessions(id) ON DELETE CASCADE NOT NULL,
    exercise_id UUID REFERENCES public.workout_exercises(id) ON DELETE CASCADE NOT NULL,
    set_number INTEGER NOT NULL,
    reps_completed INTEGER,
    weight_kg NUMERIC(6,2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- SICUREZZA (ROW LEVEL SECURITY - RLS)
-- ==========================================

ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_assigned_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_logs ENABLE ROW LEVEL SECURITY;

-- Policy Workouts: Il coach vede e modifica le sue schede
DROP POLICY IF EXISTS "coach_manage_workouts" ON public.workouts;
CREATE POLICY "coach_manage_workouts" ON public.workouts
    FOR ALL TO authenticated
    USING (coach_id::uuid = auth.uid()::uuid);

-- Policy Workouts: Gli atleti possono LEGGERE le schede a loro assegnate
DROP POLICY IF EXISTS "athlete_read_assigned_workouts" ON public.workouts;
CREATE POLICY "athlete_read_assigned_workouts" ON public.workouts
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.athlete_assigned_workouts aaw
            JOIN public.athletes a ON a.id::uuid = aaw.athlete_id::uuid
            WHERE aaw.workout_id::uuid = workouts.id::uuid 
            AND a.email::text = (auth.jwt()->>'email')::text
        )
    );

-- Policy Workout Exercises: Il coach gestisce gli esercizi delle sue schede
DROP POLICY IF EXISTS "coach_manage_exercises" ON public.workout_exercises;
CREATE POLICY "coach_manage_exercises" ON public.workout_exercises
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.workouts w 
            WHERE w.id::uuid = workout_exercises.workout_id::uuid AND w.coach_id::uuid = auth.uid()::uuid
        )
    );

-- Policy Workout Exercises: L'atleta legge gli esercizi delle schede a lui assegnate
DROP POLICY IF EXISTS "athlete_read_exercises" ON public.workout_exercises;
CREATE POLICY "athlete_read_exercises" ON public.workout_exercises
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.athlete_assigned_workouts aaw
            JOIN public.athletes a ON a.id::uuid = aaw.athlete_id::uuid
            WHERE aaw.workout_id::uuid = workout_exercises.workout_id::uuid 
            AND a.email::text = (auth.jwt()->>'email')::text
        )
    );

-- Policy Assegnazioni: Il coach le gestisce tutte (per i suoi atleti)
DROP POLICY IF EXISTS "coach_manage_assignments" ON public.athlete_assigned_workouts;
CREATE POLICY "coach_manage_assignments" ON public.athlete_assigned_workouts
    FOR ALL TO authenticated
    USING (assigned_by::uuid = auth.uid()::uuid);

-- Policy Assegnazioni: L'atleta legge le sue assegnazioni
DROP POLICY IF EXISTS "athlete_read_assignments" ON public.athlete_assigned_workouts;
CREATE POLICY "athlete_read_assignments" ON public.athlete_assigned_workouts
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.athletes a 
            WHERE a.id::uuid = athlete_assigned_workouts.athlete_id::uuid AND a.email::text = (auth.jwt()->>'email')::text
        )
    );

-- Policy Sessioni e Log: L'atleta gestisce i SUOI log
DROP POLICY IF EXISTS "athlete_manage_sessions" ON public.workout_sessions;
CREATE POLICY "athlete_manage_sessions" ON public.workout_sessions
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.athletes a 
            WHERE a.id::uuid = workout_sessions.athlete_id::uuid AND a.email::text = (auth.jwt()->>'email')::text
        )
    );

DROP POLICY IF EXISTS "athlete_manage_logs" ON public.exercise_logs;
CREATE POLICY "athlete_manage_logs" ON public.exercise_logs
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.workout_sessions ws
            JOIN public.athletes a ON a.id::uuid = ws.athlete_id::uuid
            WHERE ws.id::uuid = exercise_logs.session_id::uuid AND a.email::text = (auth.jwt()->>'email')::text
        )
    );

-- I Coach leggono i log dei loro atleti assegnati
DROP POLICY IF EXISTS "coach_read_sessions" ON public.workout_sessions;
CREATE POLICY "coach_read_sessions" ON public.workout_sessions
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.workouts w
            WHERE w.id::uuid = workout_sessions.workout_id::uuid AND w.coach_id::uuid = auth.uid()::uuid
        )
    );

DROP POLICY IF EXISTS "coach_read_logs" ON public.exercise_logs;
CREATE POLICY "coach_read_logs" ON public.exercise_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.workout_sessions ws
            JOIN public.workouts w ON w.id::uuid = ws.workout_id::uuid
            WHERE ws.id::uuid = exercise_logs.session_id::uuid AND w.coach_id::uuid = auth.uid()::uuid
        )
    );
