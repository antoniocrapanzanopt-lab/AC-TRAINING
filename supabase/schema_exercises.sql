-- ==========================================
-- TABELLA LIBRERIA ESERCIZI
-- ==========================================

CREATE TABLE IF NOT EXISTS public.exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL se è un esercizio predefinito di sistema
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Altro', -- Petto, Dorso, Gambe, Spalle, Bicipiti, Tricipiti, Addominali, Full Body, Cardio
    equipment TEXT DEFAULT 'Corpo Libero', -- Bilanciere, Manubri, Macchina, Cavi, Kettlebell, etc.
    video_url TEXT,
    instructions TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Abilitiamo RLS
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

-- Politiche RLS
DROP POLICY IF EXISTS "read_exercises_policy" ON public.exercises;
CREATE POLICY "read_exercises_policy" ON public.exercises
    FOR SELECT TO authenticated
    USING (coach_id IS NULL OR coach_id::uuid = auth.uid()::uuid);

DROP POLICY IF EXISTS "coach_manage_own_exercises" ON public.exercises;
CREATE POLICY "coach_manage_own_exercises" ON public.exercises
    FOR ALL TO authenticated
    USING (coach_id::uuid = auth.uid()::uuid)
    WITH CHECK (coach_id::uuid = auth.uid()::uuid);

-- Esercizi di base di default (se la tabella è vuota)
INSERT INTO public.exercises (name, category, equipment, instructions)
VALUES 
    ('Panca Piana con Bilanciere', 'Petto', 'Bilanciere', 'Mantieni i tre punti di appoggio e i gomiti a 45 gradi.'),
    ('Spinte su Panca Inclinata con Manubri', 'Petto', 'Manubri', 'Controlla la discesa in 3 secondi ed esplodi in salita.'),
    ('Squat con Bilanciere', 'Gambe', 'Bilanciere', 'Rompi il parallelo mantenendo la schiena neutra.'),
    ('Stacco da Terra (Deadlift)', 'Gambe', 'Bilanciere', 'Mantieni il bilanciere vicino alle tibie durante l asta.'),
    ('Trazioni alla Sbarra (Pull-ups)', 'Dorso', 'Corpo Libero', 'Tira fino a portare il mento sopra la sbarra.'),
    ('Rematore con Bilanciere', 'Dorso', 'Bilanciere', 'Busto a 45 gradi, adduci le scapole durante la tirata.'),
    ('Lento Avanti / Military Press', 'Spalle', 'Bilanciere', 'Spingi in verticale stabilizzando il core.'),
    ('Alzate Laterali con Manubri', 'Spalle', 'Manubri', 'Gomiti leggermente flessi, alza fino all altezza delle spalle.'),
    ('Curl Bicipiti con Bilanciere Sagomato', 'Bicipiti', 'Bilanciere', 'Gomiti fissi ai fianchi, evita il compenso col busto.'),
    ('Pushdown Tricipiti ai Cavi', 'Tricipiti', 'Cavi', 'Estendi completamente le braccia mantenendo la tensione.'),
    ('Plank Addominale', 'Addominali', 'Corpo Libero', 'Mantieni la linea dritta senza spanciare.')
ON CONFLICT DO NOTHING;
