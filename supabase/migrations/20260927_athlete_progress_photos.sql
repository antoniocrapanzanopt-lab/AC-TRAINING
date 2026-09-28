-- =====================================================================================
-- MIGRATION: 20260927_athlete_progress_photos.sql
-- BUILDER ATHLETE MANAGER — GESTIONE FOTO PROGRESSI (PRIMA & DOPO) CON SUPABASE & STORAGE
-- =====================================================================================
-- Descrizione:
-- 1. Creazione del Bucket Storage 'progress-photos' per consentire il caricamento sicuro
--    e la visualizzazione delle foto dei progressi degli atleti.
-- 2. Creazione della tabella relazionale 'public.athlete_progress_photos'.
-- 3. Policy RLS rigorose per Coach (MFA AAL2 o Coach autorizzato) e per il singolo Atleta.
-- 4. Pubblicazione Supabase Realtime per la sincronizzazione istantanea Coach <-> Atleta.
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. BUCKET STORAGE: progress-photos
-- -------------------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public) 
VALUES ('progress-photos', 'progress-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 1.1 Policy per Coach: accesso completo in lettura e scrittura
DROP POLICY IF EXISTS "coach_manage_progress_photos_storage" ON storage.objects;
CREATE POLICY "coach_manage_progress_photos_storage" ON storage.objects
FOR ALL TO authenticated
USING (
    bucket_id = 'progress-photos' AND 
    (public.is_coach_aal2() OR public.is_coach())
)
WITH CHECK (
    bucket_id = 'progress-photos' AND 
    (public.is_coach_aal2() OR public.is_coach())
);

-- 1.2 Policy per Atleta: può gestire solo le foto nella propria cartella ({athlete_id}/*)
DROP POLICY IF EXISTS "athlete_manage_progress_photos_storage" ON storage.objects;
CREATE POLICY "athlete_manage_progress_photos_storage" ON storage.objects
FOR ALL TO authenticated
USING (
    bucket_id = 'progress-photos' AND
    EXISTS (
        SELECT 1 FROM public.athletes a
        WHERE a.id::text = (storage.foldername(name))[1]
          AND a.auth_user_id = auth.uid()
    )
)
WITH CHECK (
    bucket_id = 'progress-photos' AND
    EXISTS (
        SELECT 1 FROM public.athletes a
        WHERE a.id::text = (storage.foldername(name))[1]
          AND a.auth_user_id = auth.uid()
    )
);

-- 1.3 Policy per la lettura pubblica degli URL generati
DROP POLICY IF EXISTS "public_read_progress_photos_storage" ON storage.objects;
CREATE POLICY "public_read_progress_photos_storage" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'progress-photos');


-- -------------------------------------------------------------------------------------
-- 2. TABELLA: public.athlete_progress_photos
-- -------------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.athlete_progress_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
    metric_id UUID REFERENCES public.athlete_metrics(id) ON DELETE SET NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    pose TEXT NOT NULL CHECK (pose IN ('front', 'back', 'side', 'other')),
    image_url TEXT NOT NULL,
    storage_path TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici per prestazioni e filtri rapidi
CREATE INDEX IF NOT EXISTS athlete_progress_photos_athlete_id_idx ON public.athlete_progress_photos(athlete_id);
CREATE INDEX IF NOT EXISTS athlete_progress_photos_date_idx ON public.athlete_progress_photos(date);
CREATE INDEX IF NOT EXISTS athlete_progress_photos_pose_idx ON public.athlete_progress_photos(pose);

-- Abilitazione Row Level Security
ALTER TABLE public.athlete_progress_photos ENABLE ROW LEVEL SECURITY;


-- -------------------------------------------------------------------------------------
-- 3. POLICY RLS SULLA TABELLA athlete_progress_photos
-- -------------------------------------------------------------------------------------

-- 3.1 Policy Coach (Lettura e Scrittura completa)
DROP POLICY IF EXISTS "coach_manage_progress_photos_mfa" ON public.athlete_progress_photos;
CREATE POLICY "coach_manage_progress_photos_mfa" ON public.athlete_progress_photos
FOR ALL TO authenticated
USING (public.is_coach_aal2() OR public.is_coach())
WITH CHECK (public.is_coach_aal2() OR public.is_coach());

-- 3.2 Policy Atleta (Lettura e Scrittura solo per il proprio athlete_id)
DROP POLICY IF EXISTS "athlete_own_progress_photos" ON public.athlete_progress_photos;
CREATE POLICY "athlete_own_progress_photos" ON public.athlete_progress_photos
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.athletes a 
        WHERE a.id = athlete_progress_photos.athlete_id 
          AND a.auth_user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.athletes a 
        WHERE a.id = athlete_progress_photos.athlete_id 
          AND a.auth_user_id = auth.uid()
    )
);


-- -------------------------------------------------------------------------------------
-- 4. REALTIME & SCHEMA RELOAD
-- -------------------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'athlete_progress_photos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.athlete_progress_photos;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

NOTIFY pgrst, 'reload schema';
