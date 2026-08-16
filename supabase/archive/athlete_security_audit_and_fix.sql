-- =====================================================================================
-- AUDIT & HARDENING DI SICUREZZA: ISOLAMENTO ATLETI (OWN-ONLY) & MFA COACH (AAL2)
-- Esegui questo script nel SQL Editor di Supabase.
-- =====================================================================================

-- -----------------------------------------------------------------------------
-- 0. VERIFICA E AGGIORNAMENTO FUNZIONI DI SUPPORTO
-- -----------------------------------------------------------------------------

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

-- -----------------------------------------------------------------------------
-- 1. TABELLA: public.athletes
-- - Atleta: lettura e aggiornamento del proprio profilo (disclaimer, contatti)
-- - Coach: gestione completa solo con MFA AAL2 attiva
-- -----------------------------------------------------------------------------

ALTER TABLE public.athletes ENABLE ROW LEVEL SECURITY;

-- Coach Policy (AAL2 Obbligatoria)
DROP POLICY IF EXISTS "coach_all_athletes" ON public.athletes;
DROP POLICY IF EXISTS "coach_all_athletes_mfa" ON public.athletes;
CREATE POLICY "coach_all_athletes_mfa"
ON public.athletes
FOR ALL
TO authenticated
USING (is_coach_aal2())
WITH CHECK (is_coach_aal2());

-- Atleta SELECT: vede solo il proprio record
DROP POLICY IF EXISTS "athlete_own_profile" ON public.athletes;
CREATE POLICY "athlete_own_profile"
ON public.athletes
FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid());

-- Atleta UPDATE: può aggiornare solo il proprio record (es. has_seen_disclaimer, recapiti)
-- Impossibile cambiare auth_user_id o toccare atleti altrui
DROP POLICY IF EXISTS "athlete_update_own_profile" ON public.athletes;
CREATE POLICY "athlete_update_own_profile"
ON public.athletes
FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 2. TABELLA: public.athlete_notes
-- - Atleta: lettura ESCLUSIVA delle note con visibility = 'athlete' per sé stesso
-- - Le note 'coach' restano inaccessibili all'atleta
-- - Coach: gestione completa in AAL2
-- -----------------------------------------------------------------------------

ALTER TABLE public.athlete_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coach_manage_athlete_notes" ON public.athlete_notes;
DROP POLICY IF EXISTS "coach_manage_athlete_notes_mfa" ON public.athlete_notes;
CREATE POLICY "coach_manage_athlete_notes_mfa"
ON public.athlete_notes
FOR ALL
TO authenticated
USING (is_coach_aal2())
WITH CHECK (is_coach_aal2());

DROP POLICY IF EXISTS "athlete_read_own_notes" ON public.athlete_notes;
CREATE POLICY "athlete_read_own_notes"
ON public.athlete_notes
FOR SELECT
TO authenticated
USING (
    visibility = 'athlete' AND
    EXISTS (
        SELECT 1 FROM public.athletes a 
        WHERE a.id = athlete_notes.athlete_id 
          AND a.auth_user_id = auth.uid()
    )
);

-- -----------------------------------------------------------------------------
-- 3. TABELLA: public.athlete_timeline
-- - Atleta: lettura solo della propria timeline
-- - Coach: gestione completa in AAL2
-- -----------------------------------------------------------------------------

ALTER TABLE public.athlete_timeline ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coach_manage_athlete_timeline" ON public.athlete_timeline;
DROP POLICY IF EXISTS "coach_manage_athlete_timeline_mfa" ON public.athlete_timeline;
CREATE POLICY "coach_manage_athlete_timeline_mfa"
ON public.athlete_timeline
FOR ALL
TO authenticated
USING (is_coach_aal2())
WITH CHECK (is_coach_aal2());

DROP POLICY IF EXISTS "athlete_read_own_timeline" ON public.athlete_timeline;
CREATE POLICY "athlete_read_own_timeline"
ON public.athlete_timeline
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.athletes a 
        WHERE a.id = athlete_timeline.athlete_id 
          AND a.auth_user_id = auth.uid()
    )
);

-- -----------------------------------------------------------------------------
-- 4. TABELLE: METRICHE E MASSIMALI (athlete_metrics, athlete_max_lifts)
-- - Atleta: gestione autonoma solo dei propri dati
-- - Coach: gestione in AAL2
-- -----------------------------------------------------------------------------

ALTER TABLE public.athlete_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coach_manage_metrics" ON public.athlete_metrics;
DROP POLICY IF EXISTS "coach_manage_metrics_mfa" ON public.athlete_metrics;
CREATE POLICY "coach_manage_metrics_mfa"
ON public.athlete_metrics
FOR ALL
TO authenticated
USING (is_coach_aal2())
WITH CHECK (is_coach_aal2());

DROP POLICY IF EXISTS "athlete_own_metrics" ON public.athlete_metrics;
CREATE POLICY "athlete_own_metrics"
ON public.athlete_metrics
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.athletes a 
        WHERE a.id = athlete_metrics.athlete_id 
          AND a.auth_user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.athletes a 
        WHERE a.id = athlete_metrics.athlete_id 
          AND a.auth_user_id = auth.uid()
    )
);

ALTER TABLE public.athlete_max_lifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coach_manage_max_lifts" ON public.athlete_max_lifts;
DROP POLICY IF EXISTS "coach_manage_max_lifts_mfa" ON public.athlete_max_lifts;
CREATE POLICY "coach_manage_max_lifts_mfa"
ON public.athlete_max_lifts
FOR ALL
TO authenticated
USING (is_coach_aal2())
WITH CHECK (is_coach_aal2());

DROP POLICY IF EXISTS "athlete_own_max_lifts" ON public.athlete_max_lifts;
CREATE POLICY "athlete_own_max_lifts"
ON public.athlete_max_lifts
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.athletes a 
        WHERE a.id = athlete_max_lifts.athlete_id 
          AND a.auth_user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.athletes a 
        WHERE a.id = athlete_max_lifts.athlete_id 
          AND a.auth_user_id = auth.uid()
    )
);

-- -----------------------------------------------------------------------------
-- 5. TABELLE: SCHEDE, ASSEGNAZIONI, SESSIONI E LOG ALLENAMENTO
-- -----------------------------------------------------------------------------

-- Cartelle Allenamenti (Solo Coach AAL2)
ALTER TABLE public.workout_folders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coach_manage_folders" ON public.workout_folders;
DROP POLICY IF EXISTS "coach_manage_folders_mfa" ON public.workout_folders;
CREATE POLICY "coach_manage_folders_mfa"
ON public.workout_folders
FOR ALL
TO authenticated
USING (coach_id::uuid = auth.uid()::uuid AND (auth.jwt()->>'aal') = 'aal2')
WITH CHECK (coach_id::uuid = auth.uid()::uuid AND (auth.jwt()->>'aal') = 'aal2');

-- Workout (Coach AAL2 + Atleta vede solo le schede a lui assegnate)
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coach_manage_workouts" ON public.workouts;
DROP POLICY IF EXISTS "coach_manage_workouts_mfa" ON public.workouts;
CREATE POLICY "coach_manage_workouts_mfa"
ON public.workouts
FOR ALL
TO authenticated
USING (coach_id::uuid = auth.uid()::uuid AND (auth.jwt()->>'aal') = 'aal2')
WITH CHECK (coach_id::uuid = auth.uid()::uuid AND (auth.jwt()->>'aal') = 'aal2');

DROP POLICY IF EXISTS "athlete_read_assigned_workouts" ON public.workouts;
CREATE POLICY "athlete_read_assigned_workouts"
ON public.workouts
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.athlete_assigned_workouts aaw
        JOIN public.athletes a ON a.id = aaw.athlete_id
        WHERE aaw.workout_id = workouts.id AND a.auth_user_id = auth.uid()
    )
);

-- Workout Exercises (Coach AAL2 + Atleta legge solo esercizi delle schede assegnate)
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coach_manage_exercises" ON public.workout_exercises;
DROP POLICY IF EXISTS "coach_manage_exercises_mfa" ON public.workout_exercises;
CREATE POLICY "coach_manage_exercises_mfa"
ON public.workout_exercises
FOR ALL
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.workouts w WHERE w.id::uuid = workout_exercises.workout_id::uuid AND w.coach_id::uuid = auth.uid()::uuid)
    AND (auth.jwt()->>'aal') = 'aal2'
)
WITH CHECK (
    EXISTS (SELECT 1 FROM public.workouts w WHERE w.id::uuid = workout_exercises.workout_id::uuid AND w.coach_id::uuid = auth.uid()::uuid)
    AND (auth.jwt()->>'aal') = 'aal2'
);

DROP POLICY IF EXISTS "athlete_read_exercises" ON public.workout_exercises;
CREATE POLICY "athlete_read_exercises"
ON public.workout_exercises
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.athlete_assigned_workouts aaw
        JOIN public.athletes a ON a.id = aaw.athlete_id
        WHERE aaw.workout_id = workout_exercises.workout_id AND a.auth_user_id = auth.uid()
    )
);

-- Assegnazioni (Coach AAL2 + Atleta vede solo le proprie)
ALTER TABLE public.athlete_assigned_workouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coach_manage_assignments" ON public.athlete_assigned_workouts;
DROP POLICY IF EXISTS "coach_manage_assignments_mfa" ON public.athlete_assigned_workouts;
CREATE POLICY "coach_manage_assignments_mfa"
ON public.athlete_assigned_workouts
FOR ALL
TO authenticated
USING (assigned_by::uuid = auth.uid()::uuid AND (auth.jwt()->>'aal') = 'aal2')
WITH CHECK (assigned_by::uuid = auth.uid()::uuid AND (auth.jwt()->>'aal') = 'aal2');

DROP POLICY IF EXISTS "athlete_read_assignments" ON public.athlete_assigned_workouts;
CREATE POLICY "athlete_read_assignments"
ON public.athlete_assigned_workouts
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.athletes a 
        WHERE a.id = athlete_assigned_workouts.athlete_id 
          AND a.auth_user_id = auth.uid()
    )
);

-- Sessioni Allenamento (Atleta gestisce le proprie, Coach AAL2 legge)
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "athlete_manage_sessions" ON public.workout_sessions;
CREATE POLICY "athlete_manage_sessions"
ON public.workout_sessions
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.athletes a 
        WHERE a.id = workout_sessions.athlete_id 
          AND a.auth_user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.athletes a 
        WHERE a.id = workout_sessions.athlete_id 
          AND a.auth_user_id = auth.uid()
    )
);

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

-- Log Esercizi (Atleta gestisce i propri, Coach AAL2 legge)
ALTER TABLE public.exercise_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "athlete_manage_logs" ON public.exercise_logs;
CREATE POLICY "athlete_manage_logs"
ON public.exercise_logs
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.workout_sessions ws
        JOIN public.athletes a ON a.id = ws.athlete_id
        WHERE ws.id = exercise_logs.session_id AND a.auth_user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.workout_sessions ws
        JOIN public.athletes a ON a.id = ws.athlete_id
        WHERE ws.id = exercise_logs.session_id AND a.auth_user_id = auth.uid()
    )
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

-- -----------------------------------------------------------------------------
-- 6. STORAGE BUCKETS & POLICY HARDENING
-- -----------------------------------------------------------------------------

-- Inizializza i bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('medical-certificates', 'medical-certificates', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('exercise-videos', 'exercise-videos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- A. BUCKET: medical-certificates (DATI SANITARI SENSIBILI - PRIVATO)
-- Path obbligatorio: [athlete_id]/[timestamp]_cert.ext
-- L'atleta può accedere/caricare SOLO se la cartella corrisponde al proprio athlete_id collegato ad auth_user_id
-- Il coach può accedere solo con MFA AAL2 attiva
DROP POLICY IF EXISTS "manage_medical_certs" ON storage.objects;
DROP POLICY IF EXISTS "manage_medical_certs_mfa" ON storage.objects;
CREATE POLICY "manage_medical_certs_mfa"
ON storage.objects
FOR ALL
TO authenticated
USING (
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

-- B. BUCKET: exercise-videos (VIDEO ESERCIZI - PUBBLICO IN LETTURA)
DROP POLICY IF EXISTS "authenticated_manage_exercise_videos" ON storage.objects;
DROP POLICY IF EXISTS "coach_manage_exercise_videos" ON storage.objects;
DROP POLICY IF EXISTS "coach_manage_exercise_videos_mfa" ON storage.objects;
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

DROP POLICY IF EXISTS "athlete_read_exercise_videos" ON storage.objects;
CREATE POLICY "athlete_read_exercise_videos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'exercise-videos');

-- C. BUCKET: chat-attachments (ALLEGATI CHAT)
DROP POLICY IF EXISTS "chat_attachments_all" ON storage.objects;
DROP POLICY IF EXISTS "chat_attachments_manage" ON storage.objects;
DROP POLICY IF EXISTS "chat_attachments_read" ON storage.objects;
DROP POLICY IF EXISTS "chat_attachments_insert" ON storage.objects;

CREATE POLICY "chat_attachments_read"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'chat-attachments');

CREATE POLICY "chat_attachments_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-attachments');

CREATE POLICY "chat_attachments_manage"
ON storage.objects
FOR ALL
TO authenticated
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

-- Ricarica lo schema in PostgREST
NOTIFY pgrst, 'reload schema';
