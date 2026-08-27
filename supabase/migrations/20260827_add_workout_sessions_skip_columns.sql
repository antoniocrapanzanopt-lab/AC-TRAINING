-- Migration: Add skip and feedback columns to workout_sessions idempotently
-- Data: 2026-08-27

ALTER TABLE public.workout_sessions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';
ALTER TABLE public.workout_sessions ADD COLUMN IF NOT EXISTS skip_reason TEXT;
ALTER TABLE public.workout_sessions ADD COLUMN IF NOT EXISTS skip_notes TEXT;
ALTER TABLE public.workout_sessions ADD COLUMN IF NOT EXISTS coach_justified BOOLEAN DEFAULT NULL;
ALTER TABLE public.workout_sessions ADD COLUMN IF NOT EXISTS coach_feedback TEXT;
ALTER TABLE public.workout_sessions ADD COLUMN IF NOT EXISTS week_number INTEGER;
ALTER TABLE public.workout_sessions ADD COLUMN IF NOT EXISTS day_name TEXT;
