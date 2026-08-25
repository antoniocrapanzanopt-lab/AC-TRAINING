-- =====================================================================================
-- MIGRATION: 20260825_athlete_workouts_rls_and_auto_archive.sql
-- DESCRIZIONE: Allinea le policy RLS di lettura sulle schede (public.workouts) per gli atleti
--              con riscontro email oltre che auth_user_id, garantendo visibilità immediata.
-- =====================================================================================

-- 1. Aggiorna policy di lettura su public.workouts per atleti con fallback email
DROP POLICY IF EXISTS "athlete_read_assigned_workouts" ON public.workouts;
DROP POLICY IF EXISTS "athlete_read_workouts" ON public.workouts;

CREATE POLICY "athlete_read_assigned_workouts" ON public.workouts 
FOR SELECT TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.athlete_assigned_workouts aaw
        JOIN public.athletes a ON a.id = aaw.athlete_id
        WHERE aaw.workout_id = workouts.id 
          AND (
            a.auth_user_id = auth.uid() 
            OR LOWER(TRIM(COALESCE(a.email, ''))) = LOWER(TRIM(COALESCE(auth.jwt()->>'email', '')))
          )
    )
);

-- 2. Assicura che la policy su public.athlete_assigned_workouts rimanga solida e idempotente
DROP POLICY IF EXISTS "athlete_read_assignments" ON public.athlete_assigned_workouts;
CREATE POLICY "athlete_read_assignments" ON public.athlete_assigned_workouts 
FOR SELECT TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.athletes a 
        WHERE a.id = athlete_assigned_workouts.athlete_id 
          AND (
            a.auth_user_id = auth.uid() 
            OR LOWER(TRIM(COALESCE(a.email, ''))) = LOWER(TRIM(COALESCE(auth.jwt()->>'email', '')))
          )
    )
);

-- 3. Assicura che la policy su public.workout_exercises rimanga allineata
DROP POLICY IF EXISTS "athlete_read_exercises" ON public.workout_exercises;
CREATE POLICY "athlete_read_exercises" ON public.workout_exercises 
FOR SELECT TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.athlete_assigned_workouts aaw
        JOIN public.athletes a ON a.id = aaw.athlete_id
        WHERE aaw.workout_id = workout_exercises.workout_id 
          AND (
            a.auth_user_id = auth.uid() 
            OR LOWER(TRIM(COALESCE(a.email, ''))) = LOWER(TRIM(COALESCE(auth.jwt()->>'email', '')))
          )
    )
);
