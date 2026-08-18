-- ============================================================================
-- MIGRATION: Espansione Tassonomia Biomeccanica e Seed Massivo (140+ Esercizi)
-- Idempotente: CREATE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS / ON CONFLICT DO UPDATE
-- ============================================================================

-- 1. Estensione Colonne Biomeccaniche Tabella public.exercises
ALTER TABLE public.exercises 
  ADD COLUMN IF NOT EXISTS target_specifico TEXT,
  ADD COLUMN IF NOT EXISTS pattern_movimento TEXT,
  ADD COLUMN IF NOT EXISTS livello_difficolta TEXT DEFAULT 'Intermedio',
  ADD COLUMN IF NOT EXISTS ruolo_esercizio TEXT DEFAULT 'Complementare',
  ADD COLUMN IF NOT EXISTS costo_sistemico TEXT DEFAULT 'Medio',
  ADD COLUMN IF NOT EXISTS progression_friendly BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS varianti JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS regressioni JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS progressioni JSONB DEFAULT '[]'::jsonb;

-- 2. Indici Ottimizzati per Ricerca e Filtri Istantanei
CREATE INDEX IF NOT EXISTS idx_exercises_category ON public.exercises(category);
CREATE INDEX IF NOT EXISTS idx_exercises_target_specifico ON public.exercises(target_specifico);
CREATE INDEX IF NOT EXISTS idx_exercises_pattern ON public.exercises(pattern_movimento);
CREATE INDEX IF NOT EXISTS idx_exercises_equipment ON public.exercises(equipment);
CREATE INDEX IF NOT EXISTS idx_exercises_ruolo ON public.exercises(ruolo_esercizio);

-- 3. Seed Massivo Idempotente (ON CONFLICT su nome + coach_id NULL)
INSERT INTO public.exercises (
  name, category, target_specifico, pattern_movimento, equipment, 
  bilateralita, tipo, ruolo_esercizio, costo_sistemico, livello_difficolta, progression_friendly
) VALUES
-- PETTO
('Distensioni Panca Piana con Bilanciere', 'Petto', 'Sternocostale (Fasci medi)', 'Spinta Orizzontale', 'Bilanciere', 'Bilaterale', 'Forza', 'Fondamentale', 'Alto', 'Intermedio', true),
('Distensioni Panca Inclinata 30° con Bilanciere', 'Petto', 'Clavicolare (Fasci alti)', 'Spinta Orizzontale', 'Bilanciere', 'Bilaterale', 'Ipertrofia', 'Fondamentale', 'Alto', 'Intermedio', true),
('Distensioni Panca Piana con Manubri', 'Petto', 'Sternocostale (Fasci medi)', 'Spinta Orizzontale', 'Manubri', 'Bilaterale', 'Ipertrofia', 'Complementare', 'Medio', 'Intermedio', true),
('Distensioni Panca Inclinata 30° con Manubri', 'Petto', 'Clavicolare (Fasci alti)', 'Spinta Orizzontale', 'Manubri', 'Bilaterale', 'Ipertrofia', 'Complementare', 'Medio', 'Intermedio', true),
('Chest Press Convergente su Macchina', 'Petto', 'Clavicolare / Sternocostale', 'Spinta Orizzontale', 'Macchina', 'Bilaterale', 'Ipertrofia', 'Complementare', 'Medio', 'Principiante', true),
('Dip alle Parallele (Focus Petto)', 'Petto', 'Costale / Fasci Bassi', 'Spinta Verticale', 'Corpo Libero', 'Bilaterale', 'Ipertrofia', 'Fondamentale', 'Alto', 'Avanzato', true),
('Croci con Manubri su Panca Piana', 'Petto', 'Sternocostale (Allungamento)', 'Abduzione / Adduzione', 'Manubri', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Basso', 'Intermedio', false),
('Croci con Manubri su Panca Inclinata', 'Petto', 'Clavicolare (Allungamento)', 'Abduzione / Adduzione', 'Manubri', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Basso', 'Intermedio', false),
('Croci ai Cavi Medi (Cable Crossover)', 'Petto', 'Sternocostale (Tensione Continua)', 'Abduzione / Adduzione', 'Cavi', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Principiante', true),
('Croci ai Cavi Bassi (Low-to-High)', 'Petto', 'Clavicolare (Fasci Alti)', 'Abduzione / Adduzione', 'Cavi', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Principiante', true),
('Croci ai Cavi Alti (High-to-Low)', 'Petto', 'Costale / Fasci Bassi', 'Abduzione / Adduzione', 'Cavi', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Principiante', true),
('Pec Deck / Butterfly Machine', 'Petto', 'Sternocostale (Picco Accorciamento)', 'Abduzione / Adduzione', 'Macchina', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Principiante', true),
('Push-up / Piegamenti a Terra', 'Petto', 'Petto Globale & Core', 'Spinta Orizzontale', 'Corpo Libero', 'Bilaterale', 'Resistenza', 'Complementare', 'Basso', 'Principiante', true),
('Distensioni su Panca Declinata con Bilanciere', 'Petto', 'Costale / Fasci Bassi', 'Spinta Orizzontale', 'Bilanciere', 'Bilaterale', 'Forza', 'Complementare', 'Medio', 'Intermedio', true),
('Floor Press con Manubri', 'Petto', 'Sternocostale (Lockout / Spalla-Safe)', 'Spinta Orizzontale', 'Manubri', 'Bilaterale', 'Forza', 'Prehab / Riabilitativo', 'Basso', 'Principiante', true),

-- DORSO
('Trazioni alla Sbarra Presa Prona (Pull-up)', 'Dorso', 'Gran Dorsale & Trapezio', 'Trazione Verticale', 'Corpo Libero', 'Bilaterale', 'Forza', 'Fondamentale', 'Alto', 'Avanzato', true),
('Trazioni alla Sbarra Presa Supina (Chin-up)', 'Dorso', 'Gran Dorsale & Bicipite', 'Trazione Verticale', 'Corpo Libero', 'Bilaterale', 'Forza', 'Fondamentale', 'Alto', 'Intermedio', true),
('Lat Machine Presa Larga Prona', 'Dorso', 'Gran Dorsale Toracico', 'Trazione Verticale', 'Cavi', 'Bilaterale', 'Ipertrofia', 'Fondamentale', 'Medio', 'Principiante', true),
('Lat Machine Presa Neutra Stretta (V-Bar)', 'Dorso', 'Gran Dorsale Fasci Bassi', 'Trazione Verticale', 'Cavi', 'Bilaterale', 'Ipertrofia', 'Complementare', 'Medio', 'Principiante', true),
('Pulldown Unilaterale al Cavo Alto', 'Dorso', 'Gran Dorsale Fasci Iliaci', 'Trazione Verticale', 'Cavi', 'Unilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Intermedio', true),
('Pullover con Manubrio su Panca Trasversale', 'Dorso', 'Gran Dorsale (Allungamento)', 'Trazione Verticale', 'Manubri', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Basso', 'Intermedio', false),
('Pullover al Cavo Alto con Corda / Barra', 'Dorso', 'Gran Dorsale (Accorciamento)', 'Trazione Verticale', 'Cavi', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Principiante', true),
('Rematore con Bilanciere Presa Prona 45°', 'Dorso', 'Spessore Dorso / Trapezio Medio', 'Trazione Orizzontale', 'Bilanciere', 'Bilaterale', 'Forza', 'Fondamentale', 'Molto Alto', 'Avanzato', true),
('Rematore Pendlay (Dead-Stop Row)', 'Dorso', 'Dorso Globale & Potenza', 'Trazione Orizzontale', 'Bilanciere', 'Bilaterale', 'Potenza', 'Fondamentale', 'Molto Alto', 'Avanzato', true),
('Rematore con Manubrio Singolo su Panca', 'Dorso', 'Gran Dorsale Unilaterale', 'Trazione Orizzontale', 'Manubri', 'Unilaterale', 'Ipertrofia', 'Complementare', 'Medio', 'Principiante', true),
('Seal Row con Manubri su Panca Inclinata', 'Dorso', 'Trapezio Medio & Romboidi (Zero Lombari)', 'Trazione Orizzontale', 'Manubri', 'Bilaterale', 'Ipertrofia', 'Complementare', 'Basso', 'Intermedio', true),
('Pulley Basso Presa Stretta', 'Dorso', 'Gran Dorsale & Spessore', 'Trazione Orizzontale', 'Cavi', 'Bilaterale', 'Ipertrofia', 'Complementare', 'Medio', 'Principiante', true),
('Pulley Basso Presa Larga Prona', 'Dorso', 'Trapezio Medio & Deltoidi Posteriori', 'Trazione Orizzontale', 'Cavi', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Basso', 'Principiante', true),
('T-Bar Row a Supporto Toracico', 'Dorso', 'Spessore Dorso & Romboidi', 'Trazione Orizzontale', 'Macchina', 'Bilaterale', 'Ipertrofia', 'Complementare', 'Medio', 'Principiante', true),
('Rowing Machine a Leve Convergenti', 'Dorso', 'Gran Dorsale', 'Trazione Orizzontale', 'Macchina', 'Bilaterale', 'Ipertrofia', 'Complementare', 'Basso', 'Principiante', true),
('Face Pull con Corda al Cavo Alto', 'Dorso', 'Trapezio / Rotatori / Rear Delt', 'Trazione Orizzontale', 'Cavi', 'Bilaterale', 'Mobilità', 'Prehab / Riabilitativo', 'Molto Basso', 'Principiante', true),
('Meadows Row al Landmine', 'Dorso', 'Gran Dorsale & Gran Rotondo', 'Trazione Orizzontale', 'Bilanciere', 'Unilaterale', 'Ipertrofia', 'Complementare', 'Medio', 'Avanzato', true),
('Scrollate con Manubri / Bilanciere (Shrugs)', 'Dorso', 'Trapezio Superiore', 'Trazione Verticale', 'Manubri', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Basso', 'Principiante', true),

-- SPALLE
('Military Press con Bilanciere in Piedi', 'Spalle', 'Deltoide Anteriore & Core', 'Spinta Verticale', 'Bilanciere', 'Bilaterale', 'Forza', 'Fondamentale', 'Molto Alto', 'Avanzato', true),
('Lento Avanti con Manubri Seduto', 'Spalle', 'Deltoide Anteriore / Laterale', 'Spinta Verticale', 'Manubri', 'Bilaterale', 'Ipertrofia', 'Fondamentale', 'Medio', 'Intermedio', true),
('Shoulder Press Machine Convergente', 'Spalle', 'Deltoide Anteriore', 'Spinta Verticale', 'Macchina', 'Bilaterale', 'Ipertrofia', 'Complementare', 'Basso', 'Principiante', true),
('Alzate Laterali con Manubri in Piedi', 'Spalle', 'Deltoide Laterale', 'Abduzione / Adduzione', 'Manubri', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Basso', 'Principiante', true),
('Alzate Laterali con Manubri Seduto', 'Spalle', 'Deltoide Laterale (Strict)', 'Abduzione / Adduzione', 'Manubri', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Principiante', true),
('Alzate Laterali al Cavo Basso Singolo', 'Spalle', 'Deltoide Laterale (Tensione Continua)', 'Abduzione / Adduzione', 'Cavi', 'Unilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Principiante', true),
('Alzate Laterali ai Cavi Incrociati Dietro la Schiena', 'Spalle', 'Deltoide Laterale (Allungamento)', 'Abduzione / Adduzione', 'Cavi', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Intermedio', true),
('Lateral Raise Machine', 'Spalle', 'Deltoide Laterale', 'Abduzione / Adduzione', 'Macchina', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Principiante', true),
('Alzate Posteriori con Manubri su Panca Inclinata', 'Spalle', 'Deltoide Posteriore', 'Abduzione / Adduzione', 'Manubri', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Basso', 'Principiante', true),
('Reverse Pec Deck / Rear Delt Fly', 'Spalle', 'Deltoide Posteriore', 'Abduzione / Adduzione', 'Macchina', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Principiante', true),
('Rear Delt Crossover ai Cavi Alti', 'Spalle', 'Deltoide Posteriore', 'Abduzione / Adduzione', 'Cavi', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Principiante', true),
('Arnold Press con Manubri', 'Spalle', 'Deltoide Completo', 'Spinta Verticale', 'Manubri', 'Bilaterale', 'Ipertrofia', 'Complementare', 'Medio', 'Intermedio', true),
('Y-Raise su Panca Inclinata', 'Spalle', 'Trapezio Inferiore & Deltoide Laterale', 'Abduzione / Adduzione', 'Manubri', 'Bilaterale', 'Mobilità', 'Prehab / Riabilitativo', 'Molto Basso', 'Principiante', false),
('Alzate Frontali con Manubri / Bilanciere', 'Spalle', 'Deltoide Anteriore', 'Spinta Verticale', 'Manubri', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Basso', 'Principiante', true),

-- QUADRICIPITI
('Back Squat con Bilanciere (High Bar)', 'Quadricipiti', 'Quadricipiti & Catena Posteriore', 'Squat / Accosciata', 'Bilanciere', 'Bilaterale', 'Forza', 'Fondamentale', 'Molto Alto', 'Avanzato', true),
('Front Squat con Bilanciere', 'Quadricipiti', 'Retto Femorale & Vasti (Busto Eretto)', 'Squat / Accosciata', 'Bilanciere', 'Bilaterale', 'Forza', 'Fondamentale', 'Molto Alto', 'Avanzato', true),
('Hack Squat su Slitta 45°', 'Quadricipiti', 'Quadricipiti Isolati', 'Squat / Accosciata', 'Macchina', 'Bilaterale', 'Ipertrofia', 'Fondamentale', 'Alto', 'Intermedio', true),
('Leg Press 45° (Piedi Bassi e Stretti)', 'Quadricipiti', 'Vasto Laterale & Mediale', 'Squat / Accosciata', 'Macchina', 'Bilaterale', 'Ipertrofia', 'Fondamentale', 'Alto', 'Principiante', true),
('Pendulum Squat', 'Quadricipiti', 'Quadricipite Puro', 'Squat / Accosciata', 'Macchina', 'Bilaterale', 'Ipertrofia', 'Fondamentale', 'Alto', 'Intermedio', true),
('Belt Squat', 'Quadricipiti', 'Quadricipite (Zero Carico Spinale)', 'Squat / Accosciata', 'Macchina', 'Bilaterale', 'Ipertrofia', 'Complementare', 'Medio', 'Principiante', true),
('Goblet Squat con Manubrio / Kettlebell', 'Quadricipiti', 'Quadricipiti & Mobilità Anca', 'Squat / Accosciata', 'Kettlebell', 'Bilaterale', 'Ipertrofia', 'Complementare', 'Medio', 'Principiante', true),
('Bulgarian Split Squat (Squat Bulgaro con Manubri)', 'Quadricipiti', 'Quadricipiti & Glutei (Unilaterale)', 'Affondo / Split', 'Manubri', 'Unilaterale', 'Ipertrofia', 'Complementare', 'Molto Alto', 'Intermedio', true),
('Affondi Camminati con Manubri', 'Quadricipiti', 'Quadricipiti & Glutei', 'Affondo / Split', 'Manubri', 'Alternato', 'Ipertrofia', 'Complementare', 'Alto', 'Intermedio', true),
('Affondi Indietro con Manubri', 'Quadricipiti', 'Quadricipiti (Knee-Friendly)', 'Affondo / Split', 'Manubri', 'Alternato', 'Ipertrofia', 'Complementare', 'Medio', 'Principiante', true),
('Step-Up su Box con Manubri', 'Quadricipiti', 'Quadricipiti & Gluteo', 'Affondo / Split', 'Manubri', 'Unilaterale', 'Ipertrofia', 'Complementare', 'Medio', 'Principiante', true),
('Leg Extension Machine', 'Quadricipiti', 'Retto Femorale & Vasti (Accorciamento)', 'Flessione / Estensione', 'Macchina', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Basso', 'Principiante', true),
('Sissy Squat', 'Quadricipiti', 'Retto Femorale (Allungamento Estremo)', 'Squat / Accosciata', 'Corpo Libero', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Basso', 'Avanzato', false),
('Wall Sit Isometrico', 'Quadricipiti', 'Quadricipite & Tendine Rotuleo', 'Squat / Accosciata', 'Corpo Libero', 'Bilaterale', 'Resistenza', 'Prehab / Riabilitativo', 'Basso', 'Principiante', false),

-- FEMORALI
('Stacco da Terra Regolare (Deadlift)', 'Femorali', 'Catena Posteriore Completa', 'Hinge / Cerniera d''Anca', 'Bilanciere', 'Bilaterale', 'Forza', 'Fondamentale', 'Molto Alto', 'Avanzato', true),
('Stacco Rumeno con Bilanciere (RDL)', 'Femorali', 'Femorali Hip-Dominant & Glutei', 'Hinge / Cerniera d''Anca', 'Bilanciere', 'Bilaterale', 'Ipertrofia', 'Fondamentale', 'Alto', 'Intermedio', true),
('Stacco Rumeno con Manubri', 'Femorali', 'Femorali Hip-Dominant', 'Hinge / Cerniera d''Anca', 'Manubri', 'Bilaterale', 'Ipertrofia', 'Complementare', 'Medio', 'Principiante', true),
('Single Leg Romanian Deadlift (RDL Unilaterale)', 'Femorali', 'Femorali & Stabilità Pelvica', 'Hinge / Cerniera d''Anca', 'Manubri', 'Unilaterale', 'Ipertrofia', 'Complementare', 'Medio', 'Intermedio', true),
('Good Morning con Bilanciere', 'Femorali', 'Femorali & Erettori Spinali', 'Hinge / Cerniera d''Anca', 'Bilanciere', 'Bilaterale', 'Forza', 'Complementare', 'Alto', 'Avanzato', true),
('Lying Leg Curl (Femorali Sdraiato)', 'Femorali', 'Femorali Knee-Dominant (Accorciamento)', 'Flessione / Estensione', 'Macchina', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Basso', 'Principiante', true),
('Seated Leg Curl (Femorali Seduto)', 'Femorali', 'Femorali Knee-Dominant (Allungamento)', 'Flessione / Estensione', 'Macchina', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Basso', 'Principiante', true),
('Standing Leg Curl Unilaterale', 'Femorali', 'Femorali Knee-Dominant', 'Flessione / Estensione', 'Macchina', 'Unilaterale', 'Ipertrofia', 'Isolamento', 'Basso', 'Principiante', true),
('Nordic Hamstring Curl', 'Femorali', 'Femorali Eccentrico Puro & Prevenzione', 'Flessione / Estensione', 'Corpo Libero', 'Bilaterale', 'Forza', 'Tecnico', 'Alto', 'Avanzato', false),
('Glute Ham Raise (GHR)', 'Femorali', 'Femorali & Glutei', 'Flessione / Estensione', 'Macchina', 'Bilaterale', 'Forza', 'Complementare', 'Alto', 'Avanzato', true),

-- GLUTEI
('Hip Thrust con Bilanciere', 'Glutei', 'Grande Gluteo (Max Accorciamento)', 'Hinge / Cerniera d''Anca', 'Bilanciere', 'Bilaterale', 'Ipertrofia', 'Fondamentale', 'Alto', 'Intermedio', true),
('Hip Thrust Machine Dedicata', 'Glutei', 'Grande Gluteo', 'Hinge / Cerniera d''Anca', 'Macchina', 'Bilaterale', 'Ipertrofia', 'Complementare', 'Medio', 'Principiante', true),
('Kas Glute Bridge con Bilanciere', 'Glutei', 'Grande Gluteo (Range Ridotto Isolato)', 'Hinge / Cerniera d''Anca', 'Bilanciere', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Medio', 'Intermedio', true),
('Glute Kickback al Cavo Basso', 'Glutei', 'Grande Gluteo Unilaterale', 'Hinge / Cerniera d''Anca', 'Cavi', 'Unilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Principiante', true),
('Abductor Machine (Seduto)', 'Glutei', 'Medio e Piccolo Gluteo', 'Abduzione / Adduzione', 'Macchina', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Principiante', true),
('Abduzioni d''Anca al Cavo in Piedi', 'Glutei', 'Medio Gluteo', 'Abduzione / Adduzione', 'Cavi', 'Unilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Principiante', true),
('Adductor Machine (Adduzioni Seduto)', 'Glutei', 'Adduttori (Grande e Lungo)', 'Abduzione / Adduzione', 'Macchina', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Principiante', true),
('Copenhagen Plank (Adductor Bridge)', 'Glutei', 'Adduttori & Stabilità Pelvica', 'Core Anti-Movimento', 'Corpo Libero', 'Unilaterale', 'Mobilità', 'Prehab / Riabilitativo', 'Medio', 'Intermedio', false),
('Stacco Sumo con Bilanciere', 'Glutei', 'Glutei & Adduttori', 'Hinge / Cerniera d''Anca', 'Bilanciere', 'Bilaterale', 'Forza', 'Fondamentale', 'Molto Alto', 'Avanzato', true),
('Frog Pumps con Manubrio', 'Glutei', 'Grande Gluteo (Pump Finisher)', 'Hinge / Cerniera d''Anca', 'Manubri', 'Bilaterale', 'Resistenza', 'Isolamento', 'Molto Basso', 'Principiante', false),

-- POLPACCI
('Calf Raise in Piedi alla Smith Machine', 'Polpacci', 'Gastrocnemio (Ginocchio Esteso)', 'Flessione / Estensione', 'Multipower', 'Bilaterale', 'Ipertrofia', 'Complementare', 'Basso', 'Principiante', true),
('Calf Raise su Leg Press 45°', 'Polpacci', 'Gastrocnemio (Max Allungamento)', 'Flessione / Estensione', 'Macchina', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Basso', 'Principiante', true),
('Standing Calf Machine', 'Polpacci', 'Gastrocnemio', 'Flessione / Estensione', 'Macchina', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Basso', 'Principiante', true),
('Seated Calf Raise (Seduto a 90°)', 'Polpacci', 'Soleo (Ginocchio Flesso)', 'Flessione / Estensione', 'Macchina', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Principiante', true),
('Tibialis Raise al Muro', 'Polpacci', 'Tibiale Anteriore & Caviglia', 'Flessione / Estensione', 'Corpo Libero', 'Bilaterale', 'Mobilità', 'Prehab / Riabilitativo', 'Molto Basso', 'Principiante', false),

-- BICIPITI
('Curl con Bilanciere Sagomato EZ in Piedi', 'Bicipiti', 'Bicipite Globale', 'Flessione Gomito', 'Bilanciere', 'Bilaterale', 'Ipertrofia', 'Fondamentale', 'Basso', 'Principiante', true),
('Curl con Manubri Alternato con Supinazione', 'Bicipiti', 'Capo Lungo & Corto', 'Flessione Gomito', 'Manubri', 'Alternato', 'Ipertrofia', 'Complementare', 'Basso', 'Principiante', true),
('Incline Dumbbell Curl (Panca 60°)', 'Bicipiti', 'Capo Lungo (Max Allungamento)', 'Flessione Gomito', 'Manubri', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Basso', 'Intermedio', true),
('Spider Curl con Bilanciere EZ su Panca Inclinata', 'Bicipiti', 'Capo Corto (Picco di Tensione)', 'Flessione Gomito', 'Bilanciere', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Basso', 'Intermedio', true),
('Preacher Curl / Panca Scott con Bilanciere EZ', 'Bicipiti', 'Capo Corto & Brachiale', 'Flessione Gomito', 'Bilanciere', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Basso', 'Principiante', true),
('Hammer Curl con Manubri (Presa Neutra)', 'Bicipiti', 'Brachiale & Brachioradiale', 'Flessione Gomito', 'Manubri', 'Alternato', 'Ipertrofia', 'Isolamento', 'Basso', 'Principiante', true),
('Cable Biceps Curl al Cavo Basso con Barra', 'Bicipiti', 'Bicipite Globale (Tensione Continua)', 'Flessione Gomito', 'Cavi', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Principiante', true),
('Bayesian Curl al Cavo Basso (Di Spalle)', 'Bicipiti', 'Capo Lungo (Curva Tensione Ottimale)', 'Flessione Gomito', 'Cavi', 'Unilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Intermedio', true),
('High Cable Curl ai Cavi Alti (Doppio Bicipite)', 'Bicipiti', 'Capo Corto & Picco Contrazione', 'Flessione Gomito', 'Cavi', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Principiante', true),
('Reverse Curl con Bilanciere EZ (Presa Prona)', 'Bicipiti', 'Brachioradiale & Avambracci', 'Flessione Gomito', 'Bilanciere', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Basso', 'Principiante', true),

-- TRICIPITI
('Distensioni Panca Piana Presa Stretta', 'Tricipiti', 'Tricipiti Completi & Petto', 'Spinta Orizzontale', 'Bilanciere', 'Bilaterale', 'Forza', 'Fondamentale', 'Medio', 'Intermedio', true),
('Dips alle Parallele (Focus Tricipiti - Busto Verticale)', 'Tricipiti', 'Tricipiti Completi', 'Spinta Verticale', 'Corpo Libero', 'Bilaterale', 'Forza', 'Fondamentale', 'Alto', 'Avanzato', true),
('French Press con Bilanciere EZ su Panca', 'Tricipiti', 'Capo Lungo & Mediale', 'Estensione Gomito', 'Bilanciere', 'Bilaterale', 'Ipertrofia', 'Complementare', 'Medio', 'Intermedio', true),
('Skull Crusher al Cavo Basso su Panca', 'Tricipiti', 'Capo Lungo (Elbow-Friendly)', 'Estensione Gomito', 'Cavi', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Basso', 'Principiante', true),
('Triceps Pushdown al Cavo Alto con Corda', 'Tricipiti', 'Capo Laterale & Mediale', 'Estensione Gomito', 'Cavi', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Principiante', true),
('Triceps Pushdown con Barra a V', 'Tricipiti', 'Capo Laterale', 'Estensione Gomito', 'Cavi', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Principiante', true),
('Overhead Cable Extension con Corda', 'Tricipiti', 'Capo Lungo (Allungamento)', 'Estensione Gomito', 'Cavi', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Principiante', true),
('Overhead Extension con Manubrio a Due Mani', 'Tricipiti', 'Capo Lungo', 'Estensione Gomito', 'Manubri', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Basso', 'Principiante', true),
('Cross-Body Cable Extension (Cavi Incrociati)', 'Tricipiti', 'Capo Laterale & Lungo (Zero Stress Gomito)', 'Estensione Gomito', 'Cavi', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Intermedio', true),
('Kickback al Cavo Basso Singolo', 'Tricipiti', 'Capo Laterale (Picco Accorciamento)', 'Estensione Gomito', 'Cavi', 'Unilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Principiante', true),

-- AVAMBRACCI
('Wrist Curl con Bilanciere su Panca', 'Avambracci', 'Flessori del Polso', 'Flessione / Estensione', 'Bilanciere', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Principiante', true),
('Reverse Wrist Curl con Manubri', 'Avambracci', 'Estensori del Polso', 'Flessione / Estensione', 'Manubri', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Molto Basso', 'Principiante', true),
('Farmer''s Walk con Trap Bar / Manubri', 'Avambracci', 'Grip Strength & Core', 'Trasporto / Carico', 'Trap Bar', 'Bilaterale', 'Forza', 'Complementare', 'Alto', 'Intermedio', true),
('Dead Hang alla Sbarra', 'Avambracci', 'Presa & Decompressione Spinale', 'Core Anti-Movimento', 'Corpo Libero', 'Bilaterale', 'Mobilità', 'Prehab / Riabilitativo', 'Basso', 'Principiante', false),

-- ADDOME & CORE
('Ab-Wheel Rollout in Ginocchio', 'Core', 'Anti-Estensione Spinale', 'Core Anti-Movimento', 'Corpo Libero', 'Bilaterale', 'Forza', 'Fondamentale', 'Medio', 'Intermedio', true),
('Plank Tradizionale a Terra con Bracing', 'Core', 'Anti-Estensione & Stabilità', 'Core Anti-Movimento', 'Corpo Libero', 'Bilaterale', 'Resistenza', 'Fondamentale', 'Basso', 'Principiante', false),
('Pallof Press al Cavo Medio', 'Core', 'Anti-Rotazione', 'Core Anti-Movimento', 'Cavi', 'Unilaterale', 'Mobilità', 'Prehab / Riabilitativo', 'Molto Basso', 'Principiante', true),
('Pallof Press con Rotazione Dinamica', 'Core', 'Core Dinamico & Obliqui', 'Core Anti-Movimento', 'Cavi', 'Unilaterale', 'Ipertrofia', 'Complementare', 'Basso', 'Intermedio', true),
('Crunch ai Cavi in Ginocchio (Cable Rope Crunch)', 'Addome', 'Retto dell''Addome (Flessione Spinale)', 'Flessione / Estensione', 'Cavi', 'Bilaterale', 'Ipertrofia', 'Isolamento', 'Basso', 'Principiante', true),
('Hanging Leg Raise alla Sbarra (Toes to Bar)', 'Addome', 'Addome Inferiore & Flessori Anca', 'Flessione / Estensione', 'Corpo Libero', 'Bilaterale', 'Forza', 'Complementare', 'Medio', 'Avanzato', true),
('Hanging Knee Raise (Ginocchia al Petto)', 'Addome', 'Addome & Stabilità Sbarra', 'Flessione / Estensione', 'Corpo Libero', 'Bilaterale', 'Resistenza', 'Complementare', 'Basso', 'Principiante', true),
('Deadbug a Corpo Libero / con Fitball', 'Core', 'Anti-Estensione & Coordinazione Motoria', 'Core Anti-Movimento', 'Corpo Libero', 'Alternato', 'Mobilità', 'Prehab / Riabilitativo', 'Molto Basso', 'Principiante', false),
('Bird Dog Isometrico', 'Core', 'Catena Posteriore Incrociata', 'Core Anti-Movimento', 'Corpo Libero', 'Alternato', 'Mobilità', 'Prehab / Riabilitativo', 'Molto Basso', 'Principiante', false),
('Side Plank (Plank Laterale)', 'Core', 'Anti-Flessione Laterale & Obliqui', 'Core Anti-Movimento', 'Corpo Libero', 'Unilaterale', 'Resistenza', 'Fondamentale', 'Basso', 'Principiante', false),
('Suitcase Carry con Manubrio Singolo', 'Core', 'Anti-Flessione Laterale & Quadrato dei Lombi', 'Trasporto / Carico', 'Manubri', 'Unilaterale', 'Forza', 'Complementare', 'Medio', 'Intermedio', true),
('Russian Twist con Disco', 'Addome', 'Obliqui & Rotazione Tronco', 'Core Anti-Movimento', 'Manubri', 'Alternato', 'Ipertrofia', 'Isolamento', 'Basso', 'Principiante', true),
('Landmine Rotations', 'Core', 'Core Rotazionale & Obliqui', 'Core Anti-Movimento', 'Bilanciere', 'Alternato', 'Potenza', 'Complementare', 'Medio', 'Avanzato', true),
('Dragon Flag su Panca Piana', 'Core', 'Anti-Estensione Avanzata', 'Core Anti-Movimento', 'Corpo Libero', 'Bilaterale', 'Forza', 'Tecnico', 'Alto', 'Avanzato', false),

-- LOMBARI
('Hyperextension su Panca a 45°', 'Lombari', 'Erettori Spinali & Glutei', 'Hinge / Cerniera d''Anca', 'Macchina', 'Bilaterale', 'Ipertrofia', 'Complementare', 'Medio', 'Principiante', true),
('Reverse Hyperextension Machine', 'Lombari', 'Erettori Spinali & Decompressione Sacrale', 'Hinge / Cerniera d''Anca', 'Macchina', 'Bilaterale', 'Mobilità', 'Prehab / Riabilitativo', 'Basso', 'Principiante', true),
('Jefferson Curl con Manubrio Leggero', 'Lombari', 'Flessione/Estensione Spinale Segmentale', 'Hinge / Cerniera d''Anca', 'Manubri', 'Bilaterale', 'Mobilità', 'Prehab / Riabilitativo', 'Basso', 'Avanzato', false),
('Superman a Terra con Tenuta', 'Lombari', 'Erettori Spinali & Multifido', 'Hinge / Cerniera d''Anca', 'Corpo Libero', 'Bilaterale', 'Resistenza', 'Prehab / Riabilitativo', 'Molto Basso', 'Principiante', false),

-- FULL BODY & CONDITIONING
('Trap Bar Deadlift (Presa Neutra)', 'Full Body', 'Catena Posteriore & Quadricipiti', 'Hinge / Cerniera d''Anca', 'Trap Bar', 'Bilaterale', 'Forza', 'Fondamentale', 'Molto Alto', 'Principiante', true),
('Clean and Press con Bilanciere', 'Full Body', 'Potenza Multi-articolare', 'Spinta Verticale', 'Bilanciere', 'Bilaterale', 'Potenza', 'Tecnico', 'Molto Alto', 'Avanzato', true),
('Push Press con Bilanciere', 'Full Body', 'Spinta Balistica Spalle/Gambe', 'Spinta Verticale', 'Bilanciere', 'Bilaterale', 'Potenza', 'Fondamentale', 'Alto', 'Intermedio', true),
('Thruster con Bilanciere / Manubri', 'Full Body', 'Squat to Overhead Press', 'Squat / Accosciata', 'Bilanciere', 'Bilaterale', 'Condizionamento', 'Fondamentale', 'Molto Alto', 'Intermedio', true),
('Kettlebell Swing (Stile Russo)', 'Full Body', 'Potenza d''Anca & Glutei', 'Hinge / Cerniera d''Anca', 'Kettlebell', 'Bilaterale', 'Potenza', 'Complementare', 'Medio', 'Intermedio', true),
('Kettlebell Snatch Unilaterale', 'Full Body', 'Potenza Unilaterale & Spalla', 'Hinge / Cerniera d''Anca', 'Kettlebell', 'Unilaterale', 'Potenza', 'Tecnico', 'Alto', 'Avanzato', true),
('Prowler / Sled Push (Spinta Slitta)', 'Conditioning', 'Quadricipiti & Potenza Lattacida', 'Trasporto / Carico', 'Slitta', 'Alternato', 'Condizionamento', 'Complementare', 'Alto', 'Principiante', true),
('Sled Drag / Pull (Tirata Slitta Indietro)', 'Conditioning', 'Quadricipiti & Prevenzione Ginocchio', 'Trasporto / Carico', 'Slitta', 'Alternato', 'Mobilità', 'Prehab / Riabilitativo', 'Medio', 'Principiante', true),
('Rowing Ergometer (Vogatore Concept2)', 'Conditioning', 'Resistenza Cardiovascolare & Dorso/Gambe', 'Trazione Orizzontale', 'Cardio Machine', 'Bilaterale', 'Condizionamento', 'Fondamentale', 'Alto', 'Principiante', true),
('SkiErg (Sci di Fondo)', 'Conditioning', 'Gran Dorsale, Core & VO2 Max', 'Trazione Verticale', 'Cardio Machine', 'Bilaterale', 'Condizionamento', 'Complementare', 'Medio', 'Principiante', true),
('Assault Bike / Air Bike Sprints', 'Conditioning', 'Gambe, Braccia & Potenza Anaerobica', 'Trasporto / Carico', 'Cardio Machine', 'Alternato', 'Condizionamento', 'Fondamentale', 'Molto Alto', 'Principiante', true),
('Battle Ropes (Onde Alterne & Slam)', 'Conditioning', 'Spalle, Braccia & Core Lattacido', 'Core Anti-Movimento', 'Altro', 'Alternato', 'Condizionamento', 'Isolamento', 'Medio', 'Principiante', false)

ON CONFLICT (LOWER(TRIM(name)), (COALESCE(coach_id, '00000000-0000-0000-0000-000000000000'::uuid)))
DO UPDATE SET
  category = EXCLUDED.category,
  target_specifico = EXCLUDED.target_specifico,
  pattern_movimento = EXCLUDED.pattern_movimento,
  equipment = EXCLUDED.equipment,
  bilateralita = EXCLUDED.bilateralita,
  tipo = EXCLUDED.tipo,
  ruolo_esercizio = EXCLUDED.ruolo_esercizio,
  costo_sistemico = EXCLUDED.costo_sistemico,
  livello_difficolta = EXCLUDED.livello_difficolta,
  progression_friendly = EXCLUDED.progression_friendly,
  updated_at = NOW();
