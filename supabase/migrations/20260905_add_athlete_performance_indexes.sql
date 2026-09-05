-- ====================================================================
-- Indici di performance per query dashboard atleta e calcolo aderenza
-- Data: 2026-09-05
-- ====================================================================

-- 1. Accelerazione lookup atleta e auth_user_id (login e verifica ruoli)
CREATE INDEX IF NOT EXISTS idx_athletes_email_lower ON public.athletes(LOWER(TRIM(email)));
CREATE INDEX IF NOT EXISTS idx_athletes_auth_user_id ON public.athletes(auth_user_id);

-- 2. Accelerazione sessioni per data e storico
CREATE INDEX IF NOT EXISTS idx_workout_sessions_athlete_start ON public.workout_sessions(athlete_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_athlete_end ON public.workout_sessions(athlete_id, end_time DESC);

-- 3. Accelerazione log esercizi per sessione (elimina full table scan su exercise_logs)
CREATE INDEX IF NOT EXISTS idx_exercise_logs_session_id ON public.exercise_logs(session_id);

-- 4. Accelerazione schede assegnate attive per atleta
CREATE INDEX IF NOT EXISTS idx_assigned_workouts_athlete_active ON public.athlete_assigned_workouts(athlete_id, is_active);
CREATE INDEX IF NOT EXISTS idx_assigned_workouts_workout_id ON public.athlete_assigned_workouts(workout_id);

-- 5. Accelerazione esercizi associati alla scheda
CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_id ON public.workout_exercises(workout_id);

-- Notifica ricaricamento dello schema REST per PostgREST
NOTIFY pgrst, 'reload schema';
