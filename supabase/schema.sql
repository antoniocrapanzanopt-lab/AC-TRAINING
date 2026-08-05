-- =====================================================================================
-- SCHEMA INIZIALE SUPABASE PER BUILDER ATHLETE MANAGER
-- Esegui questo script nel SQL Editor del tuo progetto Supabase
-- =====================================================================================

-- Abilitiamo l'estensione per gli UUID se non è già attiva
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabella ATHLETES
CREATE TABLE athletes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    city TEXT,
    province TEXT,
    birth_date DATE,
    gender TEXT,
    tax_code TEXT,
    status TEXT DEFAULT 'active',
    payment_status TEXT DEFAULT 'none',
    tags TEXT[] DEFAULT '{}',
    goals TEXT,
    notes TEXT,
    
    -- Emergency Contact
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    emergency_contact_relationship TEXT,
    
    -- Medical
    medical_cert_expiry DATE,
    medical_cert_notes TEXT,
    
    -- Metadata
    contact_channel TEXT,
    acquisition_source TEXT,
    assigned_coach_id TEXT,
    assigned_coach_name TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabella ATHLETE_NOTES
CREATE TABLE athlete_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    visibility TEXT DEFAULT 'coach',
    is_pinned BOOLEAN DEFAULT false,
    author_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabella ATHLETE_TIMELINE
CREATE TABLE athlete_timeline (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    metadata JSONB,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================================================

-- Abilita RLS su tutte le tabelle
ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE athlete_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE athlete_timeline ENABLE ROW LEVEL SECURITY;

-- Essendo un team di collaboratori della stessa struttura,
-- diamo accesso completo in lettura/scrittura a tutti gli UTENTI AUTENTICATI.
-- In futuro potremo limitare la visibilità per singolo coach basandoci su assigned_coach_id.

-- Policy per Athletes
CREATE POLICY "Enable read access for authenticated users" ON athletes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users" ON athletes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON athletes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete for authenticated users" ON athletes FOR DELETE TO authenticated USING (true);

-- Policy per Athlete Notes
CREATE POLICY "Enable read access for authenticated users" ON athlete_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users" ON athlete_notes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON athlete_notes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete for authenticated users" ON athlete_notes FOR DELETE TO authenticated USING (true);

-- Policy per Athlete Timeline
CREATE POLICY "Enable read access for authenticated users" ON athlete_timeline FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users" ON athlete_timeline FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON athlete_timeline FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete for authenticated users" ON athlete_timeline FOR DELETE TO authenticated USING (true);

-- =====================================================================================
-- TRIGGER PER UPDATED_AT
-- =====================================================================================

CREATE OR REPLACE FUNCTION update_modified_column() 
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW; 
END;
$$ language 'plpgsql';

CREATE TRIGGER update_athletes_modtime 
BEFORE UPDATE ON athletes 
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_athlete_notes_modtime 
BEFORE UPDATE ON athlete_notes 
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
