-- ==============================================================================
-- SCRIPT MIGRATION SQL PER AGGIUNGERE LA SPUNTA HAS_SEEN_DISCLAIMER
-- BUILDER ATHLETE MANAGER
-- ==============================================================================

-- 1. Aggiunge la colonna nelle tabelle dei profili e atleti se non esiste già
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS has_seen_disclaimer BOOLEAN DEFAULT FALSE;

ALTER TABLE public.athletes 
ADD COLUMN IF NOT EXISTS has_seen_disclaimer BOOLEAN DEFAULT FALSE;

-- Commento informativo
COMMENT ON COLUMN public.profiles.has_seen_disclaimer IS 'Indica se l utente coach/proprietario ha preso visione del disclaimer di benvenuto.';
COMMENT ON COLUMN public.athletes.has_seen_disclaimer IS 'Indica se l atleta ha preso visione del disclaimer di benvenuto al primo accesso.';
