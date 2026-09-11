-- ====================================================================
-- Migration: Aggiunta colonna address alla tabella athletes
-- Data: 2026-09-07
-- Safe for production: ADD COLUMN IF NOT EXISTS
-- ====================================================================

ALTER TABLE public.athletes 
  ADD COLUMN IF NOT EXISTS address TEXT;

COMMENT ON COLUMN public.athletes.address IS 'Indirizzo di residenza o domicilio dell''atleta (es. Via Roma 10)';

-- Notifica ricaricamento dello schema REST per PostgREST
NOTIFY pgrst, 'reload schema';
