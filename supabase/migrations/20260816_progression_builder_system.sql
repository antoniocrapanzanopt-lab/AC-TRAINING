-- =====================================================================================
-- MIGRATION: PROGRESSION BUILDER SYSTEM SCHEMA & AUDIT TRAIL
-- =====================================================================================

-- 1. TABELLA: progression_rules
CREATE TABLE IF NOT EXISTS public.progression_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID REFERENCES auth.users(id) NOT NULL,
    athlete_id UUID REFERENCES public.athletes(id) ON DELETE CASCADE,
    program_id UUID REFERENCES public.workouts(id) ON DELETE CASCADE,
    workout_exercise_id UUID REFERENCES public.workout_exercises(id) ON DELETE CASCADE,
    exercise_catalog_id UUID REFERENCES public.exercises(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    method TEXT NOT NULL CHECK (method IN (
        'double_progression', 'linear_load', 'linear_reps', 'linear_sets', 
        'rir_progression', 'rpe_progression', 'tut_progression', 'density_progression', 
        'regression', 'substitution', 'deload'
    )),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft', 'pending_approval', 'active', 'paused', 'completed', 'archived', 'rejected'
    )),
    conditions JSONB NOT NULL DEFAULT '{"consecutive_success_sessions": 1, "max_consecutive_failures": 2, "pain_threshold_max": 2}'::jsonb,
    increments JSONB NOT NULL DEFAULT '{"load_increment_kg": 2.5, "reps_increment": 1}'::jsonb,
    current_step INTEGER NOT NULL DEFAULT 1,
    max_steps INTEGER,
    current_target JSONB NOT NULL,
    success_count INTEGER NOT NULL DEFAULT 0,
    failure_count INTEGER NOT NULL DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_prog_rules_coach ON public.progression_rules(coach_id);
CREATE INDEX IF NOT EXISTS idx_prog_rules_athlete ON public.progression_rules(athlete_id);
CREATE INDEX IF NOT EXISTS idx_prog_rules_program ON public.progression_rules(program_id);
CREATE INDEX IF NOT EXISTS idx_prog_rules_workout_ex ON public.progression_rules(workout_exercise_id);
CREATE INDEX IF NOT EXISTS idx_prog_rules_status ON public.progression_rules(status);

-- 2. TABELLA: progression_suggestions (Proposte AI in attesa)
CREATE TABLE IF NOT EXISTS public.progression_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID REFERENCES auth.users(id) NOT NULL,
    athlete_id UUID REFERENCES public.athletes(id) ON DELETE CASCADE NOT NULL,
    program_id UUID REFERENCES public.workouts(id) ON DELETE CASCADE NOT NULL,
    workout_exercise_id UUID REFERENCES public.workout_exercises(id) ON DELETE CASCADE NOT NULL,
    exercise_name TEXT NOT NULL,
    current_target JSONB NOT NULL,
    proposed_target JSONB NOT NULL,
    suggested_method TEXT NOT NULL,
    reason TEXT NOT NULL,
    confidence_score NUMERIC(3,2) NOT NULL DEFAULT 0.85,
    warnings JSONB DEFAULT '[]'::jsonb,
    alternative_exercise JSONB,
    status TEXT NOT NULL DEFAULT 'pending_approval' CHECK (status IN (
        'pending_approval', 'approved', 'rejected', 'modified'
    )),
    requires_coach_approval BOOLEAN NOT NULL DEFAULT true,
    coach_feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_prog_sugg_coach_status ON public.progression_suggestions(coach_id, status);
CREATE INDEX IF NOT EXISTS idx_prog_sugg_athlete ON public.progression_suggestions(athlete_id);

-- 3. TABELLA: progression_events (Audit Trail Immutabile)
CREATE TABLE IF NOT EXISTS public.progression_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID REFERENCES public.progression_rules(id) ON DELETE SET NULL,
    suggestion_id UUID REFERENCES public.progression_suggestions(id) ON DELETE SET NULL,
    athlete_id UUID REFERENCES public.athletes(id) ON DELETE CASCADE NOT NULL,
    program_id UUID REFERENCES public.workouts(id) ON DELETE SET NULL,
    workout_exercise_id UUID REFERENCES public.workout_exercises(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    previous_target JSONB,
    new_target JSONB,
    performed_data JSONB,
    reason TEXT NOT NULL,
    triggered_by TEXT NOT NULL CHECK (triggered_by IN ('system_engine', 'coach', 'ai_assistant')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_prog_events_rule ON public.progression_events(rule_id);
CREATE INDEX IF NOT EXISTS idx_prog_events_athlete ON public.progression_events(athlete_id);
CREATE INDEX IF NOT EXISTS idx_prog_events_created ON public.progression_events(created_at DESC);

-- 4. AGGIORNAMENTO WORKOUT_EXERCISES (Collegamento Regola)
ALTER TABLE public.workout_exercises 
ADD COLUMN IF NOT EXISTS progression_rule_id UUID REFERENCES public.progression_rules(id) ON DELETE SET NULL;

-- 5. ROW LEVEL SECURITY (RLS) POLICIES

ALTER TABLE public.progression_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progression_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progression_events ENABLE ROW LEVEL SECURITY;

-- 5.1 Progression Rules
-- Coach: Gestione completa con AAL2
DROP POLICY IF EXISTS "coach_manage_progression_rules_mfa" ON public.progression_rules;
CREATE POLICY "coach_manage_progression_rules_mfa" ON public.progression_rules
FOR ALL TO authenticated
USING (public.is_coach_aal2() OR coach_id = auth.uid())
WITH CHECK (public.is_coach_aal2() OR coach_id = auth.uid());

-- Atleta: Solo lettura delle proprie regole attive
DROP POLICY IF EXISTS "athlete_read_own_progression_rules" ON public.progression_rules;
CREATE POLICY "athlete_read_own_progression_rules" ON public.progression_rules
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.athletes a 
        WHERE a.id = progression_rules.athlete_id 
        AND a.auth_user_id = auth.uid()
    )
);

-- 5.2 Progression Suggestions
-- Coach: Gestione completa con AAL2
DROP POLICY IF EXISTS "coach_manage_progression_suggestions_mfa" ON public.progression_suggestions;
CREATE POLICY "coach_manage_progression_suggestions_mfa" ON public.progression_suggestions
FOR ALL TO authenticated
USING (public.is_coach_aal2() OR coach_id = auth.uid())
WITH CHECK (public.is_coach_aal2() OR coach_id = auth.uid());

-- 5.3 Progression Events (Audit Trail)
-- Coach: Gestione eventi
DROP POLICY IF EXISTS "coach_manage_progression_events" ON public.progression_events;
CREATE POLICY "coach_manage_progression_events" ON public.progression_events
FOR ALL TO authenticated
USING (public.is_coach_aal2() OR public.is_coach())
WITH CHECK (public.is_coach_aal2() OR public.is_coach());

-- Atleta: Lettura dei propri eventi storici
DROP POLICY IF EXISTS "athlete_read_own_progression_events" ON public.progression_events;
CREATE POLICY "athlete_read_own_progression_events" ON public.progression_events
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.athletes a 
        WHERE a.id = progression_events.athlete_id 
        AND a.auth_user_id = auth.uid()
    )
);
