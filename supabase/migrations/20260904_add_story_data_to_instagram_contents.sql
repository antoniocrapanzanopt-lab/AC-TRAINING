-- ====================================================================
-- MIGRAZIONE: AGGIUNTA COLONNA STORY_DATA A INSTAGRAM_CONTENTS
-- Data: 2026-09-04
-- Descrizione: Memorizza la sequenza di stories grafiche (1080x1920),
-- layout, sticker interattivi (poll/domande/slider) ed impostazioni visive.
-- Idempotente: ADD COLUMN IF NOT EXISTS
-- ====================================================================

ALTER TABLE public.instagram_contents 
ADD COLUMN IF NOT EXISTS story_data JSONB DEFAULT NULL;
