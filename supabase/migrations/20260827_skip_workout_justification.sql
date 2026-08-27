-- ==============================================================================
-- MIGRATION: Supporto Salto Allenamento con Giustificazione & Valutazione Coach
-- Data: 2026-08-27
-- ==============================================================================

-- 1. Aggiunta colonne per salto e valutazione a public.workout_sessions
ALTER TABLE public.workout_sessions
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS skip_reason TEXT,
  ADD COLUMN IF NOT EXISTS skip_notes TEXT,
  ADD COLUMN IF NOT EXISTS coach_justified BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS coach_feedback TEXT,
  ADD COLUMN IF NOT EXISTS week_number INTEGER,
  ADD COLUMN IF NOT EXISTS day_name TEXT;

-- 2. Indice di ricerca rapida su sessioni saltate per atleta
CREATE INDEX IF NOT EXISTS idx_workout_sessions_status_athlete
  ON public.workout_sessions(athlete_id, status);

-- 3. Commento documentale
COMMENT ON COLUMN public.workout_sessions.status IS 'Stato sessione: completed (svolta) o skipped (saltata)';
COMMENT ON COLUMN public.workout_sessions.coach_justified IS 'Valutazione coach: NULL (in attesa), TRUE (giustificato/no penalità), FALSE (non giustificato/penalizzato)';
