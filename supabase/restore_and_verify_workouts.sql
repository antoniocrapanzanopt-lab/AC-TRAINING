-- =====================================================================================
-- SCRIPT DI DIAGNOSTICA E RIPRISTINO SCHEDE DI ALLENAMENTO (WORKOUTS & FOLDERS)
-- Esegui questo script nel SQL Editor di Supabase.
-- =====================================================================================

-- -----------------------------------------------------------------------------
-- 1. DIAGNOSTICA PREVENTIVA: ISPEZIONE RECORD ESISTENTI NEL DB
-- (Controlla i risultati nella tab "Results" di Supabase)
-- -----------------------------------------------------------------------------

-- A. Elenco di tutte le schede presenti nel database
SELECT 
    id, 
    title, 
    coach_id, 
    folder_id, 
    is_template, 
    total_weeks, 
    created_at 
FROM public.workouts
ORDER BY created_at DESC;

-- B. Elenco di tutte le cartelle presenti
SELECT 
    id, 
    name, 
    coach_id, 
    parent_id, 
    created_at 
FROM public.workout_folders
ORDER BY name ASC;

-- C. Elenco degli esercizi collegati alle schede
SELECT 
    w.title AS scheda_titolo,
    we.id AS esercizio_id,
    we.name AS esercizio_nome,
    we.day_name,
    we.week_number,
    we.sets,
    we.reps_target
FROM public.workout_exercises we
JOIN public.workouts w ON w.id = we.workout_id
ORDER BY w.title, we.week_number, we.day_name, we.order_index;


-- -----------------------------------------------------------------------------
-- 2. RIPRISTINO E ALLINEAMENTO DATI (CAST ESPLICITO TEXT/UUID SICURO)
-- -----------------------------------------------------------------------------

-- A. Se esistevano schede con coach_id nullo o disallineato, le riagganciamo al coach reale
UPDATE public.workouts
SET coach_id = public.get_coach_uid()
WHERE coach_id IS NULL OR coach_id::text != public.get_coach_uid()::text;

-- B. Se le schede avevano is_template nullo, le impostiamo a TRUE per il catalogo
UPDATE public.workouts
SET is_template = TRUE
WHERE is_template IS NULL;

-- C. Riagganciamo anche le cartelle al coach reale
UPDATE public.workout_folders
SET coach_id = public.get_coach_uid()
WHERE coach_id IS NULL OR coach_id::text != public.get_coach_uid()::text;


-- -----------------------------------------------------------------------------
-- 3. AGGIORNAMENTO POLICY RLS: MASSIMA RESILIENZA PER IL COACH
-- -----------------------------------------------------------------------------

-- A. WORKOUTS: Coach in AAL2 ha visibilità e gestione totale di tutte le proprie schede
DROP POLICY IF EXISTS "coach_manage_workouts" ON public.workouts;
DROP POLICY IF EXISTS "coach_manage_workouts_mfa" ON public.workouts;
CREATE POLICY "coach_manage_workouts_mfa" ON public.workouts 
FOR ALL TO authenticated 
USING (
    public.is_coach_aal2() 
    OR (coach_id::text = auth.uid()::text AND (auth.jwt()->>'aal') = 'aal2')
)
WITH CHECK (
    public.is_coach_aal2() 
    OR (coach_id::text = auth.uid()::text AND (auth.jwt()->>'aal') = 'aal2')
);

DROP POLICY IF EXISTS "athlete_read_assigned_workouts" ON public.workouts;
CREATE POLICY "athlete_read_assigned_workouts" ON public.workouts 
FOR SELECT TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.athlete_assigned_workouts aaw
        JOIN public.athletes a ON a.id = aaw.athlete_id
        WHERE aaw.workout_id = workouts.id AND a.auth_user_id = auth.uid()
    )
);

-- B. WORKOUT EXERCISES
DROP POLICY IF EXISTS "coach_manage_exercises" ON public.workout_exercises;
DROP POLICY IF EXISTS "coach_manage_exercises_mfa" ON public.workout_exercises;
CREATE POLICY "coach_manage_exercises_mfa" ON public.workout_exercises 
FOR ALL TO authenticated 
USING (
    public.is_coach_aal2() 
    OR (EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_exercises.workout_id AND w.coach_id::text = auth.uid()::text) AND (auth.jwt()->>'aal') = 'aal2')
)
WITH CHECK (
    public.is_coach_aal2() 
    OR (EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_exercises.workout_id AND w.coach_id::text = auth.uid()::text) AND (auth.jwt()->>'aal') = 'aal2')
);

DROP POLICY IF EXISTS "athlete_read_exercises" ON public.workout_exercises;
CREATE POLICY "athlete_read_exercises" ON public.workout_exercises 
FOR SELECT TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.athlete_assigned_workouts aaw
        JOIN public.athletes a ON a.id = aaw.athlete_id
        WHERE aaw.workout_id = workout_exercises.workout_id AND a.auth_user_id = auth.uid()
    )
);

-- C. WORKOUT FOLDERS
DROP POLICY IF EXISTS "coach_manage_folders" ON public.workout_folders;
DROP POLICY IF EXISTS "coach_manage_folders_mfa" ON public.workout_folders;
CREATE POLICY "coach_manage_folders_mfa" ON public.workout_folders 
FOR ALL TO authenticated 
USING (
    public.is_coach_aal2() 
    OR (coach_id::text = auth.uid()::text AND (auth.jwt()->>'aal') = 'aal2')
)
WITH CHECK (
    public.is_coach_aal2() 
    OR (coach_id::text = auth.uid()::text AND (auth.jwt()->>'aal') = 'aal2')
);

-- Ricarica PostgREST schema cache
NOTIFY pgrst, 'reload schema';
