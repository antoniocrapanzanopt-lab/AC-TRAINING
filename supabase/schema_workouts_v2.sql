-- ==========================================
-- AGGIORNAMENTO SCHEMA SCHEDE (V2 - MULTI-SETTIMANA, MULTI-GIORNO & PROGRESSIONI)
-- ==========================================

-- 1. Aggiungiamo campi alla tabella WORKOUTS
ALTER TABLE public.workouts 
ADD COLUMN IF NOT EXISTS total_weeks INTEGER DEFAULT 1;

-- 2. Aggiungiamo nuovi campi alla tabella WORKOUT_EXERCISES
ALTER TABLE public.workout_exercises 
ADD COLUMN IF NOT EXISTS day_name TEXT DEFAULT 'Giorno A',
ADD COLUMN IF NOT EXISTS week_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS target_weight TEXT,
ADD COLUMN IF NOT EXISTS rir_target TEXT,
ADD COLUMN IF NOT EXISTS tut TEXT,
ADD COLUMN IF NOT EXISTS is_time_based BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
ADD COLUMN IF NOT EXISTS alternative_exercise TEXT;

NOTIFY pgrst, 'reload schema';
