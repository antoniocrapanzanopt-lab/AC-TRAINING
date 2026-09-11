-- =====================================================================================
-- MIGRATION: 20260907_coach_read_exercises_policy.sql
-- BUILDER ATHLETE MANAGER — PERMIT SELECT ON WORKOUT_EXERCISES FOR AUTHENTICATED COACH
-- =====================================================================================
-- Descrizione:
-- Consente la lettura (SELECT) degli esercizi della scheda (workout_exercises)
-- da parte del coach autenticato, allineandosi alle policy già presenti su workout_sessions
-- ed exercise_logs, mantenendo la protezione MFA AAL2 per modifiche e cancellazioni.
-- =====================================================================================

DROP POLICY IF EXISTS "coach_read_exercises" ON public.workout_exercises;
CREATE POLICY "coach_read_exercises" ON public.workout_exercises
FOR SELECT TO authenticated
USING (
    public.is_coach() OR 
    EXISTS (
        SELECT 1 FROM public.workouts w 
        WHERE w.id::uuid = workout_exercises.workout_id::uuid 
        AND w.coach_id::uuid = auth.uid()::uuid
    )
);

-- Ricarica schema cache PostgREST
NOTIFY pgrst, 'reload schema';
