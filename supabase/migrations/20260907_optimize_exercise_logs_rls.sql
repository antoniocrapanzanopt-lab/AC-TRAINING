-- =====================================================================================
-- MIGRATION: 20260907_optimize_exercise_logs_rls.sql
-- BUILDER ATHLETE MANAGER — PERFORMANCE & RLS FIX FOR EXERCISE_LOGS & WORKOUT_SESSIONS
-- =====================================================================================

-- 1. Indici dedicati per accelerare i join RLS ed eliminare i timeout
CREATE INDEX IF NOT EXISTS idx_exercise_logs_session_id ON public.exercise_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_exercise_id ON public.exercise_logs(exercise_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_athlete_id ON public.workout_sessions(athlete_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_workout_id ON public.workout_sessions(workout_id);

-- 2. Ottimizzazione Policy RLS su public.exercise_logs
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
        JOIN public.workouts w ON w.id = ws.workout_id
        WHERE ws.id = exercise_logs.session_id 
        AND w.coach_id = auth.uid()::text
    )
);

DROP POLICY IF EXISTS "coach_manage_logs_mfa" ON public.exercise_logs;
CREATE POLICY "coach_manage_logs_mfa" ON public.exercise_logs 
FOR ALL TO authenticated 
USING (
    public.is_coach() OR
    (EXISTS (
        SELECT 1 FROM public.workout_sessions ws
        JOIN public.workouts w ON w.id = ws.workout_id
        WHERE ws.id = exercise_logs.session_id AND w.coach_id = auth.uid()::text
    ) AND (auth.jwt()->>'aal') = 'aal2')
)
WITH CHECK (
    public.is_coach() OR
    (EXISTS (
        SELECT 1 FROM public.workout_sessions ws
        JOIN public.workouts w ON w.id = ws.workout_id
        WHERE ws.id = exercise_logs.session_id AND w.coach_id = auth.uid()::text
    ) AND (auth.jwt()->>'aal') = 'aal2')
);

-- Ricarica schema cache PostgREST
NOTIFY pgrst, 'reload schema';
