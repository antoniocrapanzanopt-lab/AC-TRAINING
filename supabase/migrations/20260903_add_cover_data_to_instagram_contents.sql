-- MIGRATION: 20260903_add_cover_data_to_instagram_contents.sql
-- Descrizione: Aggiunge la colonna JSONB cover_data per memorizzare lo stato, la grafica e le impostazioni della copertina Reel/Post

ALTER TABLE public.instagram_contents
ADD COLUMN IF NOT EXISTS cover_data JSONB DEFAULT NULL;

COMMENT ON COLUMN public.instagram_contents.cover_data IS 'Struttura completa e impostazioni grafiche della copertina Instagram (Reel 9:16 o Post 4:5) generata per questo contenuto';
