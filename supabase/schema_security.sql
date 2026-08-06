-- 1. Aggiungo colonna auth_user_id alla tabella athletes
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);

-- 2. Funzioni di Supporto per riconoscere Coach vs Atleta in base all'email
CREATE OR REPLACE FUNCTION is_athlete() RETURNS BOOLEAN AS $$
BEGIN
   -- Un utente è un atleta se la sua email di login esiste nella tabella athletes
   RETURN EXISTS (
      SELECT 1 FROM athletes WHERE email = auth.jwt()->>'email'
   );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_coach() RETURNS BOOLEAN AS $$
BEGIN
   -- Un utente è un coach se la sua email NON è presente nella tabella athletes
   RETURN NOT is_athlete();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Distruggo le vecchie policy non sicure
DROP POLICY IF EXISTS "athletes_policy" ON athletes;
DROP POLICY IF EXISTS "notes_policy" ON athlete_notes;
DROP POLICY IF EXISTS "timeline_policy" ON athlete_timeline;
DROP POLICY IF EXISTS "workouts_policy" ON workouts;
DROP POLICY IF EXISTS "athlete_workouts_policy" ON athlete_workouts;
DROP POLICY IF EXISTS "workout_exercises_policy" ON workout_exercises;
DROP POLICY IF EXISTS "workout_sessions_policy" ON workout_sessions;
DROP POLICY IF EXISTS "exercise_logs_policy" ON exercise_logs;

-- 4. Ricreo le policy BLINDATE per la tabella ATHLETES
-- Il Coach vede/modifica tutto. L'atleta vede/modifica solo se stesso (tramite auth_user_id o email)
CREATE POLICY "coach_all_athletes" ON athletes FOR ALL TO authenticated USING (is_coach()) WITH CHECK (is_coach());
CREATE POLICY "athlete_own_profile" ON athletes FOR SELECT TO authenticated USING (email = auth.jwt()->>'email');
CREATE POLICY "athlete_update_own_profile" ON athletes FOR UPDATE TO authenticated USING (email = auth.jwt()->>'email') WITH CHECK (email = auth.jwt()->>'email');

-- 5. Tabelle collegate all'atleta (Notes, Timeline)
-- Il Coach vede tutto. L'atleta vede solo i record legati al suo athlete_id
CREATE POLICY "coach_all_notes" ON athlete_notes FOR ALL TO authenticated USING (is_coach()) WITH CHECK (is_coach());
CREATE POLICY "athlete_own_notes" ON athlete_notes FOR ALL TO authenticated 
USING (athlete_id IN (SELECT id FROM athletes WHERE email = auth.jwt()->>'email'))
WITH CHECK (athlete_id IN (SELECT id FROM athletes WHERE email = auth.jwt()->>'email'));

CREATE POLICY "coach_all_timeline" ON athlete_timeline FOR ALL TO authenticated USING (is_coach()) WITH CHECK (is_coach());
CREATE POLICY "athlete_own_timeline" ON athlete_timeline FOR SELECT TO authenticated 
USING (athlete_id IN (SELECT id FROM athletes WHERE email = auth.jwt()->>'email'));

-- 6. Tabelle Workouts
CREATE POLICY "coach_all_workouts" ON workouts FOR ALL TO authenticated USING (is_coach()) WITH CHECK (is_coach());
CREATE POLICY "athlete_read_workouts" ON workouts FOR SELECT TO authenticated 
USING (id IN (SELECT workout_id FROM athlete_workouts WHERE athlete_id IN (SELECT id FROM athletes WHERE email = auth.jwt()->>'email')));

CREATE POLICY "coach_all_athlete_workouts" ON athlete_workouts FOR ALL TO authenticated USING (is_coach()) WITH CHECK (is_coach());
CREATE POLICY "athlete_read_own_assigned_workouts" ON athlete_workouts FOR SELECT TO authenticated 
USING (athlete_id IN (SELECT id FROM athletes WHERE email = auth.jwt()->>'email'));

CREATE POLICY "coach_all_workout_exercises" ON workout_exercises FOR ALL TO authenticated USING (is_coach()) WITH CHECK (is_coach());
CREATE POLICY "athlete_read_workout_exercises" ON workout_exercises FOR SELECT TO authenticated 
USING (workout_id IN (SELECT workout_id FROM athlete_workouts WHERE athlete_id IN (SELECT id FROM athletes WHERE email = auth.jwt()->>'email')));

CREATE POLICY "coach_all_sessions" ON workout_sessions FOR ALL TO authenticated USING (is_coach()) WITH CHECK (is_coach());
CREATE POLICY "athlete_own_sessions" ON workout_sessions FOR ALL TO authenticated 
USING (athlete_id IN (SELECT id FROM athletes WHERE email = auth.jwt()->>'email'))
WITH CHECK (athlete_id IN (SELECT id FROM athletes WHERE email = auth.jwt()->>'email'));

CREATE POLICY "coach_all_logs" ON exercise_logs FOR ALL TO authenticated USING (is_coach()) WITH CHECK (is_coach());
CREATE POLICY "athlete_own_logs" ON exercise_logs FOR ALL TO authenticated 
USING (session_id IN (SELECT id FROM workout_sessions WHERE athlete_id IN (SELECT id FROM athletes WHERE email = auth.jwt()->>'email')))
WITH CHECK (session_id IN (SELECT id FROM workout_sessions WHERE athlete_id IN (SELECT id FROM athletes WHERE email = auth.jwt()->>'email')));

NOTIFY pgrst, 'reload schema';
