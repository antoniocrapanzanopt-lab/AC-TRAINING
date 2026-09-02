-- MIGRATION: 20260901_add_carousel_data_to_instagram_contents.sql
-- Descrizione: Aggiunge la colonna JSONB carousel_data per memorizzare lo stato, le slide e le impostazioni del carosello generato

ALTER TABLE public.instagram_contents
ADD COLUMN IF NOT EXISTS carousel_data JSONB DEFAULT NULL;

COMMENT ON COLUMN public.instagram_contents.carousel_data IS 'Struttura completa delle slide e delle impostazioni grafiche del carosello Instagram 4:5 generato per questo contenuto';
