-- =====================================================================================
-- MIGRATION: 20260822_inbox_ai_and_instagram_contents.sql
-- DESCRIPTION: Modulo Inbox AI per cattura rapida dei pensieri & Hub Contenuti Instagram (Reel, Storie, Caroselli)
-- AUTHOR: Antonio Crapanzano (AC Training)
-- =====================================================================================

-- 1. TIPI ENUM
DO $$ BEGIN
    CREATE TYPE public.inbox_category_enum AS ENUM (
        'content_idea',
        'client_observation',
        'business_task',
        'personal_reflection',
        'system_improvement'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.inbox_priority_enum AS ENUM (
        'low',
        'medium',
        'high',
        'urgent'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.inbox_status_enum AS ENUM (
        'raw',
        'processing',
        'processed',
        'converted_task',
        'converted_content',
        'linked_athlete',
        'archived'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.content_type_enum AS ENUM (
        'reel',
        'story',
        'carousel',
        'post'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.content_pillar_enum AS ENUM (
        'technique_execution',
        'common_mistakes',
        'mindset_discipline',
        'nutrition_science',
        'client_transformation',
        'coaching_faq',
        'authority_lifestyle',
        'promotion_launch'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.content_status_enum AS ENUM (
        'idea',
        'script_draft',
        'ready_to_record',
        'recorded',
        'editing',
        'ready_to_publish',
        'published',
        'repurpose'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. TABELLA INBOX AI ENTRIES
CREATE TABLE IF NOT EXISTS public.inbox_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    raw_content TEXT NOT NULL,
    audio_url TEXT,
    
    -- Output AI di Riorganizzazione
    ai_title TEXT,
    ai_summary TEXT,
    ai_category public.inbox_category_enum,
    ai_priority public.inbox_priority_enum DEFAULT 'medium',
    ai_suggested_tasks JSONB DEFAULT '[]'::jsonb,
    ai_content_opportunity JSONB, -- { hasOpportunity: bool, suggestedType: 'reel', pillar: '...', hook: '...', scriptOutline: '...', callToAction: '...' }
    ai_next_step TEXT,
    
    -- Relazioni Opzionali
    related_athlete_id UUID REFERENCES public.athletes(id) ON DELETE SET NULL,
    
    -- Stato & Tracciamento
    status public.inbox_status_enum NOT NULL DEFAULT 'raw',
    converted_content_id UUID,
    converted_task_id UUID,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TABELLA CONTENUTI INSTAGRAM
CREATE TABLE IF NOT EXISTS public.instagram_contents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    origin_inbox_id UUID REFERENCES public.inbox_entries(id) ON DELETE SET NULL,
    
    -- Metadati Contenuto
    title TEXT NOT NULL,
    type public.content_type_enum NOT NULL DEFAULT 'reel',
    pillar public.content_pillar_enum NOT NULL DEFAULT 'technique_execution',
    status public.content_status_enum NOT NULL DEFAULT 'idea',
    
    -- Sezione Copywriting & Script
    hook TEXT,
    script_body TEXT,
    caption TEXT,
    call_to_action TEXT,
    
    -- Programmazione & Performance
    scheduled_for TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    internal_notes TEXT,
    performance_metrics JSONB DEFAULT '{"views": 0, "likes": 0, "saves": 0, "shares": 0, "leads": 0}'::jsonb,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TABELLA TASK OPERATIVE
CREATE TABLE IF NOT EXISTS public.coach_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    origin_inbox_id UUID REFERENCES public.inbox_entries(id) ON DELETE SET NULL,
    related_athlete_id UUID REFERENCES public.athletes(id) ON DELETE SET NULL,
    
    title TEXT NOT NULL,
    description TEXT,
    priority public.inbox_priority_enum NOT NULL DEFAULT 'medium',
    due_date DATE,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. AGGIORNAMENTO FK CIRCOLARE INBOX SE NON ESISTENTI
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_inbox_converted_content') THEN
        ALTER TABLE public.inbox_entries 
            ADD CONSTRAINT fk_inbox_converted_content 
            FOREIGN KEY (converted_content_id) REFERENCES public.instagram_contents(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_inbox_converted_task') THEN
        ALTER TABLE public.inbox_entries 
            ADD CONSTRAINT fk_inbox_converted_task 
            FOREIGN KEY (converted_task_id) REFERENCES public.coach_tasks(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 6. INDICI PER QUERY RAPIDE
CREATE INDEX IF NOT EXISTS idx_inbox_coach_status ON public.inbox_entries(coach_id, status);
CREATE INDEX IF NOT EXISTS idx_inbox_created ON public.inbox_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contents_coach_status ON public.instagram_contents(coach_id, status);
CREATE INDEX IF NOT EXISTS idx_contents_scheduled ON public.instagram_contents(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_coach_tasks_completed ON public.coach_tasks(coach_id, is_completed, due_date);

-- 7. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.inbox_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_tasks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Coach manages own inbox entries" ON public.inbox_entries;
    CREATE POLICY "Coach manages own inbox entries"
        ON public.inbox_entries
        FOR ALL
        TO authenticated
        USING (coach_id = auth.uid())
        WITH CHECK (coach_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Coach manages own instagram contents" ON public.instagram_contents;
    CREATE POLICY "Coach manages own instagram contents"
        ON public.instagram_contents
        FOR ALL
        TO authenticated
        USING (coach_id = auth.uid())
        WITH CHECK (coach_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Coach manages own tasks" ON public.coach_tasks;
    CREATE POLICY "Coach manages own tasks"
        ON public.coach_tasks
        FOR ALL
        TO authenticated
        USING (coach_id = auth.uid())
        WITH CHECK (coach_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 8. RICARICA DELLA SCHEMA CACHE DI POSTGREST
NOTIFY pgrst, 'reload schema';

