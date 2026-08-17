-- =====================================================================================
-- MIGRATION UNIFICATA: 20260817_progression_engine_production_hardening.sql
-- MOTORE PROGRESSIONI METODO ANTONIO, AUDIT TRAIL APPEND-ONLY & SICUREZZA RLS MFA AAL2
-- =====================================================================================
-- Questo script unifica e sostituisce tutte le migrazioni intermedie delle progressioni.
-- È 100% idempotente e pronto per essere eseguito in un'unica transazione in Supabase SQL Editor.
-- =====================================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -------------------------------------------------------------------------------------
-- 1. TABELLE DEL SISTEMA DI PROGRESSIONE
-- -------------------------------------------------------------------------------------

-- 1.1 REGOLE DI PROGRESSIONE (progression_rules)
CREATE TABLE IF NOT EXISTS public.progression_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID REFERENCES public.athletes(id) ON DELETE CASCADE NOT NULL,
    coach_id UUID REFERENCES auth.users(id) NOT NULL,
    exercise_name TEXT NOT NULL,
    exercise_category TEXT,
    progression_type TEXT NOT NULL,
    progression_rate TEXT NOT NULL,
    frequency_weeks INTEGER DEFAULT 1 NOT NULL,
    status TEXT DEFAULT 'active' NOT NULL,
    current_target JSONB NOT NULL DEFAULT '{}'::jsonb,
    history JSONB[] DEFAULT '{}'::jsonb[],
    version BIGINT NOT NULL DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Colonne aggiuntive per progression_rules se la tabella esisteva già
ALTER TABLE public.progression_rules 
ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 1.2 PROPOSTE DI PROGRESSIONE PENDENTI (progression_suggestions)
CREATE TABLE IF NOT EXISTS public.progression_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID REFERENCES public.athletes(id) ON DELETE CASCADE NOT NULL,
    program_id UUID,
    workout_exercise_id UUID,
    coach_id UUID REFERENCES auth.users(id) NOT NULL,
    exercise_name TEXT NOT NULL,
    current_state JSONB NOT NULL DEFAULT '{}'::jsonb,
    proposed_target JSONB NOT NULL DEFAULT '{}'::jsonb,
    alternative_target JSONB,
    confidence_score NUMERIC(3,2) NOT NULL DEFAULT 0.85,
    reason TEXT NOT NULL,
    safety_notes TEXT,
    status TEXT DEFAULT 'pending_approval' NOT NULL,
    brain_decision_version TEXT NOT NULL DEFAULT 'v1.0.0',
    policy_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    proposal_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    version BIGINT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id)
);

-- Colonne aggiuntive per progression_suggestions se la tabella esisteva già
ALTER TABLE public.progression_suggestions 
ADD COLUMN IF NOT EXISTS brain_decision_version TEXT NOT NULL DEFAULT 'v1.0.0',
ADD COLUMN IF NOT EXISTS policy_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS proposal_hash TEXT NOT NULL DEFAULT 'initial_hash',
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 1;

-- 1.3 AUDIT TRAIL APPEND-ONLY & TAMPER-EVIDENT (progression_events)
CREATE TABLE IF NOT EXISTS public.progression_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suggestion_id UUID REFERENCES public.progression_suggestions(id) ON DELETE SET NULL,
    athlete_id UUID REFERENCES public.athletes(id) ON DELETE CASCADE NOT NULL,
    program_id UUID,
    workout_exercise_id UUID,
    event_type TEXT NOT NULL,
    previous_target JSONB,
    new_target JSONB,
    reason TEXT,
    triggered_by TEXT NOT NULL DEFAULT 'coach',
    payload_hash TEXT NOT NULL,
    brain_decision_version TEXT NOT NULL DEFAULT 'v1.0.0',
    validation_checks JSONB NOT NULL DEFAULT '{}'::jsonb,
    sequence_number BIGSERIAL,
    previous_event_hash TEXT NOT NULL DEFAULT '0000000000000000000000000000000000000000000000000000000000000000',
    event_hash TEXT NOT NULL DEFAULT 'initial_pending',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Colonne aggiuntive per progression_events se la tabella esisteva già
ALTER TABLE public.progression_events 
ADD COLUMN IF NOT EXISTS payload_hash TEXT NOT NULL DEFAULT 'legacy',
ADD COLUMN IF NOT EXISTS brain_decision_version TEXT NOT NULL DEFAULT 'v1.0.0',
ADD COLUMN IF NOT EXISTS validation_checks JSONB NOT NULL DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS previous_event_hash TEXT NOT NULL DEFAULT '0000000000000000000000000000000000000000000000000000000000000000',
ADD COLUMN IF NOT EXISTS event_hash TEXT NOT NULL DEFAULT 'initial_pending';

-- 1.4 REGISTRO VERIFICHE PERIODICHE DELLA CATENA (progression_chain_audits)
CREATE TABLE IF NOT EXISTS public.progression_chain_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID REFERENCES public.athletes(id) ON DELETE CASCADE,
    last_verified_seq BIGINT NOT NULL DEFAULT 0,
    last_verified_event_hash TEXT NOT NULL,
    events_verified INTEGER NOT NULL DEFAULT 0,
    is_valid BOOLEAN NOT NULL DEFAULT true,
    broken_sequence BIGINT,
    alert_triggered BOOLEAN NOT NULL DEFAULT false,
    error_message TEXT,
    verified_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 1.5 COLLEGAMENTO SU ESERCIZI SCHEDA (workout_exercises)
ALTER TABLE public.workout_exercises 
ADD COLUMN IF NOT EXISTS progression_rule_id UUID REFERENCES public.progression_rules(id) ON DELETE SET NULL;


-- -------------------------------------------------------------------------------------
-- 2. INDICI PER PERFORMANCE, RICERCA & ANTI-FORK
-- -------------------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_prog_rules_athlete ON public.progression_rules(athlete_id);
CREATE INDEX IF NOT EXISTS idx_prog_rules_coach ON public.progression_rules(coach_id);
CREATE INDEX IF NOT EXISTS idx_prog_suggestions_pending ON public.progression_suggestions(athlete_id, status, expires_at);
CREATE INDEX IF NOT EXISTS idx_prog_events_athlete_seq ON public.progression_events(athlete_id, sequence_number ASC);
CREATE INDEX IF NOT EXISTS idx_prog_audits_athlete ON public.progression_chain_audits(athlete_id, verified_at DESC);
CREATE INDEX IF NOT EXISTS idx_prog_audits_invalid ON public.progression_chain_audits(is_valid) WHERE is_valid = false;

-- Indice Univoco Anti-Fork (impedisce ramificazioni concorrenti della hash chain)
CREATE UNIQUE INDEX IF NOT EXISTS idx_prog_events_unique_chain_link 
    ON public.progression_events(athlete_id, previous_event_hash)
    WHERE previous_event_hash != '0000000000000000000000000000000000000000000000000000000000000000';


-- -------------------------------------------------------------------------------------
-- 3. TRIGGER: IMMUTABILITÀ ASSOLUTA & HASH CHAIN SERIALIZZATA ANTI-RACE
-- -------------------------------------------------------------------------------------

-- 3.1 Blocco Rigido di UPDATE e DELETE su progression_events
CREATE OR REPLACE FUNCTION public.enforce_progression_events_insert_only()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'TABELLA IMMUTABILE: progression_events è un audit trail append-only. Modifiche ed eliminazioni sono vietate a livello database.'
    USING ERRCODE = '55000';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_progression_events_insert_only ON public.progression_events;
CREATE TRIGGER trg_progression_events_insert_only
    BEFORE UPDATE OR DELETE ON public.progression_events
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_progression_events_insert_only();

-- 3.2 Calcolo Deterministico Hash Chain con PostgreSQL Transaction Advisory Lock
CREATE OR REPLACE FUNCTION public.compute_progression_event_hash_chain()
RETURNS TRIGGER AS $$
DECLARE
    last_hash TEXT;
    canonical_payload TEXT;
    lock_key BIGINT;
BEGIN
    -- Advisory lock atomico per serializzare le insert concorrenti sullo stesso atleta
    lock_key := ('x' || substr(md5(NEW.athlete_id::text), 1, 15))::bit(64)::bigint;
    PERFORM pg_advisory_xact_lock(lock_key);

    -- Recupera l'ultimo hash dell'atleta
    SELECT event_hash INTO last_hash
    FROM public.progression_events
    WHERE athlete_id = NEW.athlete_id
    ORDER BY sequence_number DESC, created_at DESC
    LIMIT 1;

    IF last_hash IS NULL OR last_hash = '' THEN
        NEW.previous_event_hash := '0000000000000000000000000000000000000000000000000000000000000000';
    ELSE
        NEW.previous_event_hash := last_hash;
    END IF;

    -- Stringa canonica crittografica (previous_hash + athlete + type + payload_hash + trigger + timestamp)
    canonical_payload := NEW.previous_event_hash || '|' ||
                         NEW.athlete_id::text || '|' ||
                         NEW.event_type || '|' ||
                         COALESCE(NEW.payload_hash, 'none') || '|' ||
                         NEW.triggered_by || '|' ||
                         COALESCE(NEW.brain_decision_version, 'v1.0.0') || '|' ||
                         to_char(COALESCE(NEW.created_at, NOW()), 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"');

    NEW.event_hash := encode(digest(canonical_payload, 'sha256'), 'hex');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_progression_event_hash_chain ON public.progression_events;
CREATE TRIGGER trg_progression_event_hash_chain
    BEFORE INSERT ON public.progression_events
    FOR EACH ROW
    EXECUTE FUNCTION public.compute_progression_event_hash_chain();


-- -------------------------------------------------------------------------------------
-- 4. STORED PROCEDURE: VERIFICA PERIODICA INTEGRITÀ DELLA CATENA
-- -------------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.verify_athlete_progression_chain(p_athlete_id UUID)
RETURNS JSONB AS $$
DECLARE
    r RECORD;
    expected_prev TEXT := '0000000000000000000000000000000000000000000000000000000000000000';
    recalculated_hash TEXT;
    canonical_payload TEXT;
    verified_count INT := 0;
    last_seq BIGINT := 0;
    last_hash TEXT := 'none';
BEGIN
    FOR r IN (
        SELECT * FROM public.progression_events
        WHERE athlete_id = p_athlete_id
        ORDER BY sequence_number ASC
    ) LOOP
        -- Verifica puntatore al blocco precedente
        IF r.previous_event_hash != expected_prev THEN
            INSERT INTO public.progression_chain_audits (
                athlete_id, last_verified_seq, last_verified_event_hash, events_verified, is_valid, broken_sequence, alert_triggered, error_message
            ) VALUES (
                p_athlete_id, r.sequence_number, r.event_hash, verified_count, false, r.sequence_number, true,
                'Discontinuità hash chain: previous_event_hash non corrisponde al blocco precedente'
            );
            
            RETURN jsonb_build_object(
                'is_valid', false,
                'events_verified', verified_count,
                'broken_sequence', r.sequence_number,
                'error_message', 'Discontinuità hash chain'
            );
        END IF;

        -- Ricalcola il digest SHA-256
        canonical_payload := r.previous_event_hash || '|' ||
                             r.athlete_id::text || '|' ||
                             r.event_type || '|' ||
                             COALESCE(r.payload_hash, 'none') || '|' ||
                             r.triggered_by || '|' ||
                             COALESCE(r.brain_decision_version, 'v1.0.0') || '|' ||
                             to_char(r.created_at, 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"');
                             
        recalculated_hash := encode(digest(canonical_payload, 'sha256'), 'hex');

        IF recalculated_hash != r.event_hash THEN
            INSERT INTO public.progression_chain_audits (
                athlete_id, last_verified_seq, last_verified_event_hash, events_verified, is_valid, broken_sequence, alert_triggered, error_message
            ) VALUES (
                p_athlete_id, r.sequence_number, r.event_hash, verified_count, false, r.sequence_number, true,
                'Corruzione payload o alterazione digest SHA-256'
            );

            RETURN jsonb_build_object(
                'is_valid', false,
                'events_verified', verified_count,
                'broken_sequence', r.sequence_number,
                'error_message', 'Digest SHA-256 alterato'
            );
        END IF;

        expected_prev := r.event_hash;
        last_hash := r.event_hash;
        last_seq := r.sequence_number;
        verified_count := verified_count + 1;
    END LOOP;

    -- Registra audit positivo
    INSERT INTO public.progression_chain_audits (
        athlete_id, last_verified_seq, last_verified_event_hash, events_verified, is_valid, broken_sequence, alert_triggered
    ) VALUES (
        p_athlete_id, last_seq, last_hash, verified_count, true, NULL, false
    );

    RETURN jsonb_build_object(
        'is_valid', true,
        'events_verified', verified_count,
        'last_verified_seq', last_seq,
        'last_verified_hash', last_hash
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


-- -------------------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS): SEPARAZIONE BUSINESS + RESTRICTIVE MFA AAL2
-- -------------------------------------------------------------------------------------

ALTER TABLE public.progression_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progression_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progression_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progression_chain_audits ENABLE ROW LEVEL SECURITY;

-- 5.1 TABELLA: progression_rules
DROP POLICY IF EXISTS "coach_manage_progression_rules_mfa" ON public.progression_rules;
DROP POLICY IF EXISTS "coach_business_access_progression_rules" ON public.progression_rules;
DROP POLICY IF EXISTS "athlete_read_own_progression_rules" ON public.progression_rules;
DROP POLICY IF EXISTS "mfa_aal2_enforcement_progression_rules_write" ON public.progression_rules;
DROP POLICY IF EXISTS "mfa_aal2_enforcement_progression_rules_insert" ON public.progression_rules;
DROP POLICY IF EXISTS "mfa_aal2_enforcement_progression_rules_update" ON public.progression_rules;
DROP POLICY IF EXISTS "mfa_aal2_enforcement_progression_rules_delete" ON public.progression_rules;

CREATE POLICY "coach_business_access_progression_rules" ON public.progression_rules
FOR ALL TO authenticated
USING (
    ((auth.jwt()->'app_metadata'->>'role') = 'coach' OR public.is_coach())
    AND coach_id = auth.uid()
)
WITH CHECK (
    ((auth.jwt()->'app_metadata'->>'role') = 'coach' OR public.is_coach())
    AND coach_id = auth.uid()
);

CREATE POLICY "athlete_read_own_progression_rules" ON public.progression_rules
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.athletes a 
        WHERE a.id = progression_rules.athlete_id 
        AND a.auth_user_id = auth.uid()
    )
);

CREATE POLICY "mfa_aal2_enforcement_progression_rules_insert" ON public.progression_rules
AS RESTRICTIVE
FOR INSERT TO authenticated
WITH CHECK ( (auth.jwt()->>'aal') = 'aal2' );

CREATE POLICY "mfa_aal2_enforcement_progression_rules_update" ON public.progression_rules
AS RESTRICTIVE
FOR UPDATE TO authenticated
USING ( (auth.jwt()->>'aal') = 'aal2' )
WITH CHECK ( (auth.jwt()->>'aal') = 'aal2' );

CREATE POLICY "mfa_aal2_enforcement_progression_rules_delete" ON public.progression_rules
AS RESTRICTIVE
FOR DELETE TO authenticated
USING ( (auth.jwt()->>'aal') = 'aal2' );


-- 5.2 TABELLA: progression_suggestions
DROP POLICY IF EXISTS "coach_manage_progression_suggestions_mfa" ON public.progression_suggestions;
DROP POLICY IF EXISTS "coach_business_access_progression_suggestions" ON public.progression_suggestions;
DROP POLICY IF EXISTS "mfa_aal2_enforcement_progression_suggestions" ON public.progression_suggestions;

CREATE POLICY "coach_business_access_progression_suggestions" ON public.progression_suggestions
FOR ALL TO authenticated
USING (
    ((auth.jwt()->'app_metadata'->>'role') = 'coach' OR public.is_coach())
    AND coach_id = auth.uid()
)
WITH CHECK (
    ((auth.jwt()->'app_metadata'->>'role') = 'coach' OR public.is_coach())
    AND coach_id = auth.uid()
);

CREATE POLICY "mfa_aal2_enforcement_progression_suggestions" ON public.progression_suggestions
AS RESTRICTIVE
FOR ALL TO authenticated
USING ( (auth.jwt()->>'aal') = 'aal2' )
WITH CHECK ( (auth.jwt()->>'aal') = 'aal2' );


-- 5.3 TABELLA: progression_events (Append-only)
DROP POLICY IF EXISTS "coach_manage_progression_events" ON public.progression_events;
DROP POLICY IF EXISTS "coach_select_progression_events" ON public.progression_events;
DROP POLICY IF EXISTS "coach_insert_progression_events" ON public.progression_events;
DROP POLICY IF EXISTS "athlete_read_own_progression_events" ON public.progression_events;
DROP POLICY IF EXISTS "mfa_aal2_enforcement_progression_events" ON public.progression_events;

CREATE POLICY "coach_select_progression_events" ON public.progression_events
FOR SELECT TO authenticated
USING (
    (auth.jwt()->'app_metadata'->>'role') = 'coach' OR public.is_coach()
);

CREATE POLICY "coach_insert_progression_events" ON public.progression_events
FOR INSERT TO authenticated
WITH CHECK (
    (auth.jwt()->'app_metadata'->>'role') = 'coach' OR public.is_coach()
);

CREATE POLICY "athlete_read_own_progression_events" ON public.progression_events
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.athletes a 
        WHERE a.id = progression_events.athlete_id 
        AND a.auth_user_id = auth.uid()
    )
);

CREATE POLICY "mfa_aal2_enforcement_progression_events" ON public.progression_events
AS RESTRICTIVE
FOR ALL TO authenticated
USING ( (auth.jwt()->>'aal') = 'aal2' )
WITH CHECK ( (auth.jwt()->>'aal') = 'aal2' );


-- 5.4 TABELLA: progression_chain_audits
DROP POLICY IF EXISTS "coach_manage_progression_audits" ON public.progression_chain_audits;
DROP POLICY IF EXISTS "coach_business_access_progression_audits" ON public.progression_chain_audits;
DROP POLICY IF EXISTS "mfa_aal2_enforcement_progression_audits" ON public.progression_chain_audits;

CREATE POLICY "coach_business_access_progression_audits" ON public.progression_chain_audits
FOR ALL TO authenticated
USING (
    (auth.jwt()->'app_metadata'->>'role') = 'coach' OR public.is_coach()
)
WITH CHECK (
    (auth.jwt()->'app_metadata'->>'role') = 'coach' OR public.is_coach()
);

CREATE POLICY "mfa_aal2_enforcement_progression_audits" ON public.progression_chain_audits
AS RESTRICTIVE
FOR ALL TO authenticated
USING ( (auth.jwt()->>'aal') = 'aal2' )
WITH CHECK ( (auth.jwt()->>'aal') = 'aal2' );

-- -------------------------------------------------------------------------------------
-- 6. NOTIFICA RICARICAMENTO SCHEMA
-- -------------------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
