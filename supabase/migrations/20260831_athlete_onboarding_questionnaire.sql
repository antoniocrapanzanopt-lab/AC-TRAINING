-- =====================================================================================
-- MIGRATION: 20260831_athlete_onboarding_questionnaire.sql
-- AC COACHING — SISTEMA ONBOARDING ANAMNESI INTELLIGENTE & EXECUTIVE DOSSIER
-- =====================================================================================

CREATE TABLE IF NOT EXISTS public.athlete_onboarding_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
    coach_id UUID,
    version TEXT NOT NULL DEFAULT 'v2.0_standard',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'archived')),
    current_step INT NOT NULL DEFAULT 1 CHECK (current_step BETWEEN 1 AND 7),
    answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    photo_urls JSONB DEFAULT '[]'::jsonb,
    document_urls JSONB DEFAULT '[]'::jsonb,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_athlete_onboarding_version UNIQUE (athlete_id, version)
);

-- Indici di ricerca e ordinamento
CREATE INDEX IF NOT EXISTS idx_onboarding_athlete_id ON public.athlete_onboarding_responses(athlete_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_status ON public.athlete_onboarding_responses(status);
CREATE INDEX IF NOT EXISTS idx_onboarding_updated_at ON public.athlete_onboarding_responses(updated_at DESC);

-- Abilitazione Row Level Security
ALTER TABLE public.athlete_onboarding_responses ENABLE ROW LEVEL SECURITY;

-- 1. Policy Coach: Gestione completa dei questionari degli atleti
DROP POLICY IF EXISTS "Coach può visualizzare e gestire i questionari degli atleti" ON public.athlete_onboarding_responses;
DROP POLICY IF EXISTS "coach_manage_athlete_onboarding" ON public.athlete_onboarding_responses;
CREATE POLICY "coach_manage_athlete_onboarding"
ON public.athlete_onboarding_responses
FOR ALL
TO authenticated
USING (
    public.is_coach_aal2() OR 
    public.is_coach() OR
    (auth.jwt()->>'role') = 'coach' OR 
    (auth.jwt()->>'role') = 'admin' OR
    (auth.jwt()->>'role') = 'service_role'
)
WITH CHECK (
    public.is_coach_aal2() OR 
    public.is_coach() OR
    (auth.jwt()->>'role') = 'coach' OR 
    (auth.jwt()->>'role') = 'admin' OR
    (auth.jwt()->>'role') = 'service_role'
);

-- 2. Policy Atleta: Compilazione e visualizzazione del proprio questionario
DROP POLICY IF EXISTS "Atleta può gestire il proprio questionario di onboarding" ON public.athlete_onboarding_responses;
DROP POLICY IF EXISTS "athlete_manage_own_onboarding" ON public.athlete_onboarding_responses;
CREATE POLICY "athlete_manage_own_onboarding"
ON public.athlete_onboarding_responses
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.athletes 
        WHERE id = athlete_onboarding_responses.athlete_id AND auth_user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.athletes 
        WHERE id = athlete_onboarding_responses.athlete_id AND auth_user_id = auth.uid()
    )
);

-- Trigger per aggiornamento automatico timestamp updated_at
CREATE OR REPLACE FUNCTION public.handle_onboarding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_onboarding_updated_at ON public.athlete_onboarding_responses;
CREATE TRIGGER trg_onboarding_updated_at
BEFORE UPDATE ON public.athlete_onboarding_responses
FOR EACH ROW
EXECUTE FUNCTION public.handle_onboarding_updated_at();
