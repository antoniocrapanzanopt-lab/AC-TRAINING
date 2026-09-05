-- ====================================================================
-- MIGRAZIONE: AGGIUNTA COLONNE GRAFICHE A PUBLIC.INSTAGRAM_CONTENTS
-- Data: 2026-09-04
-- Descrizione: Aggiunge in modo idempotente le colonne JSONB per:
-- 1. carousel_data (Carosello Instagram 4:5, slide, grafiche)
-- 2. cover_data (Copertina Instagram Reel 9:16 o Post 4:5)
-- 3. story_data (Sequenza Stories Instagram 9:16)
-- E ricarica lo schema cache di PostgREST.
-- ====================================================================

ALTER TABLE public.instagram_contents
ADD COLUMN IF NOT EXISTS carousel_data JSONB DEFAULT NULL;

ALTER TABLE public.instagram_contents
ADD COLUMN IF NOT EXISTS cover_data JSONB DEFAULT NULL;

ALTER TABLE public.instagram_contents
ADD COLUMN IF NOT EXISTS story_data JSONB DEFAULT NULL;

COMMENT ON COLUMN public.instagram_contents.carousel_data IS 'Struttura completa delle slide e impostazioni del carosello Instagram 4:5';
COMMENT ON COLUMN public.instagram_contents.cover_data IS 'Struttura e impostazioni grafiche della copertina Reel 9:16 o Post 4:5';
COMMENT ON COLUMN public.instagram_contents.story_data IS 'Sequenza e impostazioni grafiche delle stories Instagram 9:16';

-- Ricarica lo schema cache di PostgREST per rendere le colonne immediatamente disponibili alle API REST
NOTIFY pgrst, 'reload schema';
