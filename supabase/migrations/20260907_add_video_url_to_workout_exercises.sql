-- =====================================================================================
-- MIGRATION: Aggiunta colonna video_url su public.workout_exercises
-- Permette di allegare l'URL del video tutorial ad ogni singolo esercizio nella scheda.
-- Idempotente e sicura.
-- =====================================================================================

ALTER TABLE public.workout_exercises 
ADD COLUMN IF NOT EXISTS video_url TEXT;

COMMENT ON COLUMN public.workout_exercises.video_url IS 'URL opzionale del video tutorial/esecuzione dell esercizio nella scheda';
