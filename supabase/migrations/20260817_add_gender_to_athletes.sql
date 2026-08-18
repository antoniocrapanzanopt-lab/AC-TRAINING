-- Migration: Add gender column to athletes table
-- Created: 2026-08-17
-- Safe for production: uses ADD COLUMN IF NOT EXISTS with CHECK constraint

ALTER TABLE athletes
  ADD COLUMN IF NOT EXISTS gender TEXT
    CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'));

COMMENT ON COLUMN athletes.gender IS 'Genere anagrafico dell''atleta: male, female, other, prefer_not_to_say';
