-- =====================================================================================
-- MIGRATION: 20260822_athlete_workout_access_resilience.sql
-- DESCRIZIONE: Garantisce resilienza nell'accesso alle schede, esercizi e sessioni per gli atleti
--              supportando sia a.auth_user_id = auth.uid() sia il controllo email dal JWT.
-- =====================================================================================

-- 1. Permessi su workout_exercises per atleti
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

-- 2. Permessi su athlete_assigned_workouts per atleti
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

-- 3. Permessi su workouts per atleti
DROP POLICY IF EXISTS "athlete_read_workouts" ON public.workouts;
CREATE POLICY "athlete_read_workouts" ON public.workouts 
FOR SELECT TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.athlete_assigned_workouts aaw
        JOIN public.athletes a ON a.id = aaw.athlete_id
        WHERE aaw.workout_id = workouts.id 
          AND (a.auth_user_id = auth.uid() OR LOWER(TRIM(COALESCE(a.email, ''))) = LOWER(TRIM(COALESCE(auth.jwt()->>'email', ''))))
    )
);

-- 4. Permessi su workout_sessions per atleti
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

-- 5. Permessi su exercise_logs per atleti
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
