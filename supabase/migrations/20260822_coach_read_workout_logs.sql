-- =====================================================================================
-- MIGRATION: 20260822_coach_read_workout_logs.sql
-- BUILDER ATHLETE MANAGER — RLS ACCESS FIX FOR COACH WORKOUT SESSIONS & EXERCISE LOGS
-- =====================================================================================
-- Descrizione:
-- Consente la lettura (SELECT) delle sessioni di allenamento e dei carichi/set (exercise_logs)
-- da parte del coach autenticato, mantenendo la protezione MFA AAL2 per modifiche/cancellazioni.
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. TABELLA: public.workout_sessions
-- -------------------------------------------------------------------------------------

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
    (public.is_coach() OR EXISTS (
        SELECT 1 FROM public.workouts w 
        WHERE w.id::uuid = workout_sessions.workout_id::uuid 
        AND w.coach_id::uuid = auth.uid()::uuid
    ))
    AND (auth.jwt()->>'aal') = 'aal2'
)
WITH CHECK (
    (public.is_coach() OR EXISTS (
        SELECT 1 FROM public.workouts w 
        WHERE w.id::uuid = workout_sessions.workout_id::uuid 
        AND w.coach_id::uuid = auth.uid()::uuid
    ))
    AND (auth.jwt()->>'aal') = 'aal2'
);

-- -------------------------------------------------------------------------------------
-- 2. TABELLA: public.exercise_logs
-- -------------------------------------------------------------------------------------

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
    (public.is_coach() OR EXISTS (
        SELECT 1 FROM public.workout_sessions ws
        JOIN public.workouts w ON w.id::uuid = ws.workout_id::uuid
        WHERE ws.id::uuid = exercise_logs.session_id::uuid 
        AND w.coach_id::uuid = auth.uid()::uuid
    ))
    AND (auth.jwt()->>'aal') = 'aal2'
)
WITH CHECK (
    (public.is_coach() OR EXISTS (
        SELECT 1 FROM public.workout_sessions ws
        JOIN public.workouts w ON w.id::uuid = ws.workout_id::uuid
        WHERE ws.id::uuid = exercise_logs.session_id::uuid 
        AND w.coach_id::uuid = auth.uid()::uuid
    ))
    AND (auth.jwt()->>'aal') = 'aal2'
);

-- Notifica ricaricamento dello schema REST
NOTIFY pgrst, 'reload schema';
