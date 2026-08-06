-- 1. Tabella dei Workout (Le Schede)
CREATE TABLE IF NOT EXISTS workouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    coach_id TEXT NOT NULL, -- L'owner o il coach che ha creato la scheda
    is_template BOOLEAN DEFAULT false, -- Se true, è un modello riutilizzabile
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Assegnazioni (Quale scheda è assegnata a quale atleta)
CREATE TABLE IF NOT EXISTS athlete_workouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
    workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    assigned_by TEXT NOT NULL,
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Esercizi all'interno del Workout
CREATE TABLE IF NOT EXISTS workout_exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sets INT NOT NULL DEFAULT 3,
    reps_target TEXT NOT NULL DEFAULT '10',
    rest_seconds INT NOT NULL DEFAULT 60,
    order_index INT NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Sessioni (L'atleta inizia un allenamento)
CREATE TABLE IF NOT EXISTS workout_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
    workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    rpe INT CHECK (rpe >= 1 AND rpe <= 10), -- Rate of Perceived Exertion
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Logs degli Esercizi (Le serie effettivamente svolte nella sessione)
CREATE TABLE IF NOT EXISTS exercise_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
    set_number INT NOT NULL,
    reps_completed INT NOT NULL,
    weight_kg DECIMAL(5,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SICUREZZA (Row-Level Security)
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE athlete_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_logs ENABLE ROW LEVEL SECURITY;

-- Tutti gli utenti autenticati (Coach e Atleti) possono accedere
CREATE POLICY "workouts_policy" ON workouts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "athlete_workouts_policy" ON athlete_workouts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "workout_exercises_policy" ON workout_exercises FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "workout_sessions_policy" ON workout_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "exercise_logs_policy" ON exercise_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
