-- =====================================================================================
-- MFA BACKEND ENFORCEMENT — AAL2 PER COACH/ADMIN SU DATI SENSIBILI
-- Esegui questo script dopo il master schema (full_schema.sql).
-- =====================================================================================

-- =============================================================================
-- 0. FUNZIONI HELPER PER AAL2
-- =============================================================================

-- is_coach_aal2(): vero se l'utente è coach E ha sessione AAL2
CREATE OR REPLACE FUNCTION public.is_coach_aal2()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT 
    public.is_coach() 
    AND (auth.jwt()->>'aal') = 'aal2';
$$;

-- is_owner_aal2(): vero se l'utente è owner (email specifica) E ha sessione AAL2
CREATE OR REPLACE FUNCTION public.is_owner_aal2()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT 
    (auth.jwt()->>'email') = 'antonio.crapanzanopt@gmail.com'
    AND (auth.jwt()->>'aal') = 'aal2';
$$;

-- =============================================================================
-- 1. ATHLETES: DATI SENSIBILI (ANAGRAFICA, STATO, ASSIGNMENT)
-- =============================================================================

-- Coach: tutte le operazioni solo se AAL2
DROP POLICY IF EXISTS "coach_all_athletes" ON public.athletes;
CREATE POLICY "coach_all_athletes_mfa"
ON public.athletes
FOR ALL
TO authenticated
USING (is_coach_aal2())
WITH CHECK (is_coach_aal2());

-- Atleta: lettura profilo proprio (AAL1 sufficiente)
-- La policy esistente "athlete_own_profile" va bene così com'è:
-- USING (auth_user_id = auth.uid())

-- Atleta: aggiornamento proprio profilo (disclaimer, contatti)
DROP POLICY IF EXISTS "athlete_update_own_profile" ON public.athletes;
CREATE POLICY "athlete_update_own_profile"
ON public.athletes
FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

-- =============================================================================
-- 2. ATHLETE_NOTES / ATHLETE_TIMELINE (NOTE E TIMELINE ATLETI)
-- =============================================================================

-- Coach: gestione note solo in AAL2
DROP POLICY IF EXISTS "coach_manage_athlete_notes" ON public.athlete_notes;
CREATE POLICY "coach_manage_athlete_notes_mfa"
ON public.athlete_notes
FOR ALL
TO authenticated
USING (is_coach_aal2())
WITH CHECK (is_coach_aal2());

-- Atleta: lettura proprie note (già corretta, nessun vincolo AAL necessario)
-- Policy esistente: athlete_read_own_notes

-- Coach: gestione timeline solo in AAL2
DROP POLICY IF EXISTS "coach_manage_athlete_timeline" ON public.athlete_timeline;
CREATE POLICY "coach_manage_athlete_timeline_mfa"
ON public.athlete_timeline
FOR ALL
TO authenticated
USING (is_coach_aal2())
WITH CHECK (is_coach_aal2());

-- Atleta: lettura propria timeline (già corretta)

-- =============================================================================
-- 3. WORKOUTS / WORKOUT_EXERCISES / ASSIGNMENTS / FOLDERS
-- =============================================================================

-- Coach: gestione cartelle workout solo in AAL2
DROP POLICY IF EXISTS "coach_manage_folders" ON public.workout_folders;
CREATE POLICY "coach_manage_folders_mfa"
ON public.workout_folders
FOR ALL
TO authenticated
USING (coach_id::uuid = auth.uid()::uuid AND (auth.jwt()->>'aal') = 'aal2')
WITH CHECK (coach_id::uuid = auth.uid()::uuid AND (auth.jwt()->>'aal') = 'aal2');

-- Coach: gestione workout solo in AAL2
DROP POLICY IF EXISTS "coach_manage_workouts" ON public.workouts;
CREATE POLICY "coach_manage_workouts_mfa"
ON public.workouts
FOR ALL
TO authenticated
USING (
  coach_id::uuid = auth.uid()::uuid
  AND (auth.jwt()->>'aal') = 'aal2'
)
WITH CHECK (
  coach_id::uuid = auth.uid()::uuid
  AND (auth.jwt()->>'aal') = 'aal2'
);

-- Coach: gestione workout_exercises solo in AAL2
DROP POLICY IF EXISTS "coach_manage_exercises" ON public.workout_exercises;
CREATE POLICY "coach_manage_exercises_mfa"
ON public.workout_exercises
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.workouts w 
    WHERE w.id::uuid = workout_exercises.workout_id::uuid 
      AND w.coach_id::uuid = auth.uid()::uuid
  )
  AND (auth.jwt()->>'aal') = 'aal2'
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.workouts w 
    WHERE w.id::uuid = workout_exercises.workout_id::uuid 
      AND w.coach_id::uuid = auth.uid()::uuid
  )
  AND (auth.jwt()->>'aal') = 'aal2'
);

-- Coach: gestione assegnazioni solo in AAL2
DROP POLICY IF EXISTS "coach_manage_assignments" ON public.athlete_assigned_workouts;
CREATE POLICY "coach_manage_assignments_mfa"
ON public.athlete_assigned_workouts
FOR ALL
TO authenticated
USING (
  assigned_by::uuid = auth.uid()::uuid
  AND (auth.jwt()->>'aal') = 'aal2'
)
WITH CHECK (
  assigned_by::uuid = auth.uid()::uuid
  AND (auth.jwt()->>'aal') = 'aal2'
);

-- =============================================================================
-- 4. EXERCISES (LIBRERIA ESERCIZI)
-- =============================================================================

-- Coach: gestione propri esercizi solo in AAL2
DROP POLICY IF EXISTS "coach_manage_own_exercises" ON public.exercises;
CREATE POLICY "coach_manage_own_exercises_mfa"
ON public.exercises
FOR ALL
TO authenticated
USING (
  coach_id::uuid = auth.uid()::uuid
  AND (auth.jwt()->>'aal') = 'aal2'
)
WITH CHECK (
  coach_id::uuid = auth.uid()::uuid
  AND (auth.jwt()->>'aal') = 'aal2'
);

-- Atleti: lettura esercizi (policy esistente read_exercises_policy, AAL1 OK)

-- =============================================================================
-- 4b. METRICHE, MASSIMALI E SESSIONI ALLENAMENTO
-- =============================================================================

-- Coach: gestione metriche solo in AAL2
DROP POLICY IF EXISTS "coach_manage_metrics" ON public.athlete_metrics;
CREATE POLICY "coach_manage_metrics_mfa"
ON public.athlete_metrics
FOR ALL
TO authenticated
USING (is_coach_aal2())
WITH CHECK (is_coach_aal2());

-- Coach: gestione massimali solo in AAL2
DROP POLICY IF EXISTS "coach_manage_max_lifts" ON public.athlete_max_lifts;
CREATE POLICY "coach_manage_max_lifts_mfa"
ON public.athlete_max_lifts
FOR ALL
TO authenticated
USING (is_coach_aal2())
WITH CHECK (is_coach_aal2());

-- Coach: lettura sessioni e log solo in AAL2
DROP POLICY IF EXISTS "coach_read_sessions" ON public.workout_sessions;
DROP POLICY IF EXISTS "coach_manage_sessions_mfa" ON public.workout_sessions;
CREATE POLICY "coach_manage_sessions_mfa"
ON public.workout_sessions
FOR ALL
TO authenticated
USING (
  (EXISTS (SELECT 1 FROM public.workouts w WHERE w.id::uuid = workout_sessions.workout_id::uuid AND w.coach_id::uuid = auth.uid()::uuid) OR is_coach())
  AND (auth.jwt()->>'aal') = 'aal2'
)
WITH CHECK (
  (EXISTS (SELECT 1 FROM public.workouts w WHERE w.id::uuid = workout_sessions.workout_id::uuid AND w.coach_id::uuid = auth.uid()::uuid) OR is_coach())
  AND (auth.jwt()->>'aal') = 'aal2'
);

DROP POLICY IF EXISTS "coach_read_logs" ON public.exercise_logs;
DROP POLICY IF EXISTS "coach_manage_logs_mfa" ON public.exercise_logs;
CREATE POLICY "coach_manage_logs_mfa"
ON public.exercise_logs
FOR ALL
TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM public.workout_sessions ws
    JOIN public.workouts w ON w.id::uuid = ws.workout_id::uuid
    WHERE ws.id::uuid = exercise_logs.session_id::uuid AND w.coach_id::uuid = auth.uid()::uuid
  ) OR is_coach())
  AND (auth.jwt()->>'aal') = 'aal2'
)
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM public.workout_sessions ws
    JOIN public.workouts w ON w.id::uuid = ws.workout_id::uuid
    WHERE ws.id::uuid = exercise_logs.session_id::uuid AND w.coach_id::uuid = auth.uid()::uuid
  ) OR is_coach())
  AND (auth.jwt()->>'aal') = 'aal2'
);

-- =============================================================================
-- 5. STORAGE: MEDICAL-CERTIFICATES (DATI SANITARI)
-- =============================================================================

-- Coach e atleti: gestione certificati medici solo in AAL2 per coach
DROP POLICY IF EXISTS "manage_medical_certs" ON storage.objects;
DROP POLICY IF EXISTS "manage_medical_certs_mfa" ON storage.objects;
CREATE POLICY "manage_medical_certs_mfa"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'medical-certificates'
  AND (
    -- Atleta sulla propria cartella (AAL1 sufficiente)
    EXISTS (
      SELECT 1 
      FROM public.athletes a
      WHERE a.id::text = (storage.foldername(name))[1]
        AND a.auth_user_id = auth.uid()
    )
    OR
    -- Coach in AAL2
    is_coach_aal2()
  )
)
WITH CHECK (
  bucket_id = 'medical-certificates'
  AND (
    EXISTS (
      SELECT 1 
      FROM public.athletes a
      WHERE a.id::text = (storage.foldername(name))[1]
        AND a.auth_user_id = auth.uid()
    )
    OR
    is_coach_aal2()
  )
);

-- =============================================================================
-- 6. EXERCISE-VIDEOS & CHAT-ATTACHMENTS
-- =============================================================================

-- Coach: gestione video esercizi solo in AAL2
DROP POLICY IF EXISTS "coach_manage_exercise_videos" ON storage.objects;
CREATE POLICY "coach_manage_exercise_videos_mfa"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'exercise-videos'
  AND is_coach_aal2()
)
WITH CHECK (
  bucket_id = 'exercise-videos'
  AND is_coach_aal2()
);

-- Chat attachments bucket e policy
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "chat_attachments_read" ON storage.objects;
CREATE POLICY "chat_attachments_read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat-attachments');

DROP POLICY IF EXISTS "chat_attachments_insert" ON storage.objects;
CREATE POLICY "chat_attachments_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-attachments');

DROP POLICY IF EXISTS "chat_attachments_manage" ON storage.objects;
CREATE POLICY "chat_attachments_manage"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND (
    is_coach_aal2()
    OR (owner::uuid = auth.uid())
  )
)
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND (
    is_coach_aal2()
    OR (owner::uuid = auth.uid())
  )
);

-- =============================================================================
-- 7. NOTE AGGIUNTIVE
-- =============================================================================

-- Per tabelle future (es. payments, subscriptions, user_roles):
-- - Usare sempre is_owner_aal2() o is_coach_aal2() nelle policy
-- - Mai fidarsi solo del ruolo senza verificare (auth.jwt()->>'aal') = 'aal2'

-- Per Edge Functions sensibili (es. generate-workout):
-- - Importare requireMfaAuth(req, true) e bloccare token AAL1 prima di eseguire logica

-- Durata JWT: impostare a 15-30 minuti in Supabase Auth settings per mitigare
-- il rischio di token stale dopo unenrollment di un factor.

-- Ricarica lo schema in PostgREST
NOTIFY pgrst, 'reload schema';

-- =====================================================================================
-- FINE SCRIPT MFA ENFORCEMENT
-- =====================================================================================
