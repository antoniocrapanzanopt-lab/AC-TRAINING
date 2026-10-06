-- =====================================================================================
-- MIGRATION: 20261006_contract_templates_and_signatures.sql
-- BUILDER ATHLETE MANAGER — MODELLI CONTRATTUALI VERSIONATI & FIRME IMMUTABILI
-- =====================================================================================
-- Descrizione:
-- 1. public.contract_templates: versioni pubblicate dei "Termini e condizioni di utilizzo"
--    (contenuto JSONB + hash SHA-256 calcolato lato server). Una sola versione attiva.
-- 2. public.athlete_contract_signatures: firme degli atleti, IMMUTABILI (nessun UPDATE),
--    con snapshot del testo copiato lato server dal modello attivo, hash, consensi granulari
--    e timestamp server.
-- 3. RPC public.publish_contract_template(): pubblicazione atomica di una nuova versione
--    (solo coach con sessione MFA AAL2).
--
-- Requisiti AAL:
-- - Coach: SEMPRE is_coach_aal2() (lettura firme, lettura/pubblicazione modelli).
-- - Atleta: sessione autenticata standard (AAL1 ammesso, gli atleti non hanno MFA
--   obbligatoria); può leggere solo il modello attivo e inserire/leggere solo le proprie firme.
--
-- Idempotente: CREATE TABLE IF NOT EXISTS, CREATE OR REPLACE, DROP POLICY IF EXISTS.
-- Nessuna modifica ai dati esistenti.
-- =====================================================================================


-- -------------------------------------------------------------------------------------
-- 1. TABELLA: public.contract_templates
-- -------------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.contract_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_label TEXT NOT NULL,
    revision INTEGER NOT NULL,
    content JSONB NOT NULL,
    content_hash TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    published_by UUID NOT NULL DEFAULT auth.uid(),
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS contract_templates_revision_uidx
    ON public.contract_templates(revision);

-- Al massimo UNA versione attiva alla volta
CREATE UNIQUE INDEX IF NOT EXISTS contract_templates_single_active_uidx
    ON public.contract_templates(is_active) WHERE is_active = TRUE;

ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;

-- Il contenuto pubblicato è immutabile: si può solo cambiare is_active
CREATE OR REPLACE FUNCTION public.contract_templates_guard_update()
RETURNS trigger AS $$
BEGIN
    IF NEW.content IS DISTINCT FROM OLD.content
       OR NEW.content_hash IS DISTINCT FROM OLD.content_hash
       OR NEW.revision IS DISTINCT FROM OLD.revision
       OR NEW.version_label IS DISTINCT FROM OLD.version_label
       OR NEW.published_at IS DISTINCT FROM OLD.published_at
       OR NEW.published_by IS DISTINCT FROM OLD.published_by THEN
        RAISE EXCEPTION 'Le versioni contrattuali pubblicate sono immutabili. Pubblica una nuova versione.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS contract_templates_guard_update_trg ON public.contract_templates;
CREATE TRIGGER contract_templates_guard_update_trg
    BEFORE UPDATE ON public.contract_templates
    FOR EACH ROW EXECUTE FUNCTION public.contract_templates_guard_update();

-- 1.1 Coach (AAL2): lettura di tutte le versioni
DROP POLICY IF EXISTS "coach_aal2_select_contract_templates" ON public.contract_templates;
CREATE POLICY "coach_aal2_select_contract_templates" ON public.contract_templates
FOR SELECT TO authenticated
USING (public.is_coach_aal2());

-- 1.2 Atleta (AAL1 ammesso): lettura solo della versione attiva
DROP POLICY IF EXISTS "athlete_select_active_contract_template" ON public.contract_templates;
CREATE POLICY "athlete_select_active_contract_template" ON public.contract_templates
FOR SELECT TO authenticated
USING (is_active = TRUE AND public.is_athlete());

-- Nessuna policy INSERT/UPDATE/DELETE: la scrittura avviene SOLO tramite la RPC
-- publish_contract_template (SECURITY DEFINER, verifica esplicita AAL2).


-- -------------------------------------------------------------------------------------
-- 2. RPC: public.publish_contract_template
-- -------------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.publish_contract_template(
    p_version_label TEXT,
    p_content JSONB
) RETURNS public.contract_templates AS $$
DECLARE
    v_next_revision INTEGER;
    v_row public.contract_templates;
BEGIN
    IF NOT public.is_coach_aal2() THEN
        RAISE EXCEPTION 'Accesso negato: pubblicazione consentita solo al coach con MFA (AAL2).'
            USING ERRCODE = '42501';
    END IF;

    IF p_version_label IS NULL OR length(trim(p_version_label)) = 0 THEN
        RAISE EXCEPTION 'Etichetta di versione obbligatoria.';
    END IF;

    IF p_content IS NULL OR jsonb_typeof(p_content) <> 'object' THEN
        RAISE EXCEPTION 'Contenuto contrattuale non valido.';
    END IF;

    -- Serializza le pubblicazioni concorrenti
    PERFORM pg_advisory_xact_lock(hashtext('publish_contract_template'));

    SELECT COALESCE(MAX(revision), 0) + 1 INTO v_next_revision FROM public.contract_templates;

    UPDATE public.contract_templates SET is_active = FALSE WHERE is_active = TRUE;

    INSERT INTO public.contract_templates (
        version_label, revision, content, content_hash, is_active, published_by
    ) VALUES (
        trim(p_version_label),
        v_next_revision,
        p_content,
        encode(sha256(convert_to(p_content::text, 'UTF8')), 'hex'),
        TRUE,
        auth.uid()
    )
    RETURNING * INTO v_row;

    RETURN v_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.publish_contract_template(TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.publish_contract_template(TEXT, JSONB) FROM anon;
GRANT EXECUTE ON FUNCTION public.publish_contract_template(TEXT, JSONB) TO authenticated;


-- -------------------------------------------------------------------------------------
-- 3. TABELLA: public.athlete_contract_signatures (IMMUTABILE)
-- -------------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.athlete_contract_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES public.contract_templates(id) ON DELETE RESTRICT,
    contract_version TEXT NOT NULL DEFAULT '',
    contract_revision INTEGER NOT NULL DEFAULT 0,
    content_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    content_hash TEXT NOT NULL DEFAULT '',

    -- Dati anagrafici del firmatario al momento della firma
    signer_full_name TEXT NOT NULL,
    signer_fiscal_code TEXT,
    signer_birth_date DATE,
    signer_birth_place TEXT,
    signer_address TEXT,

    -- Firma grafica (data URL PNG generata dal canvas)
    signature_image TEXT NOT NULL CHECK (signature_image LIKE 'data:image/png;base64,%'),

    -- Consensi granulari
    consent_service_terms BOOLEAN NOT NULL,
    consent_specific_clauses BOOLEAN NOT NULL,
    consent_health_declaration BOOLEAN NOT NULL,
    consent_health_data BOOLEAN NOT NULL,
    consent_video_internal BOOLEAN NOT NULL,
    consent_video_public BOOLEAN NOT NULL DEFAULT FALSE,
    consent_testimonial_pact BOOLEAN NOT NULL DEFAULT FALSE,

    -- Audit trail
    user_agent TEXT,
    signed_by UUID NOT NULL DEFAULT auth.uid(),
    signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- I consensi necessari all'erogazione del servizio sono obbligatori
    CONSTRAINT athlete_contract_signatures_required_consents CHECK (
        consent_service_terms
        AND consent_specific_clauses
        AND consent_health_declaration
        AND consent_health_data
        AND consent_video_internal
    )
);

CREATE INDEX IF NOT EXISTS athlete_contract_signatures_athlete_idx
    ON public.athlete_contract_signatures(athlete_id, signed_at DESC);

-- Una sola firma per atleta per versione
CREATE UNIQUE INDEX IF NOT EXISTS athlete_contract_signatures_athlete_template_uidx
    ON public.athlete_contract_signatures(athlete_id, template_id);

ALTER TABLE public.athlete_contract_signatures ENABLE ROW LEVEL SECURITY;

-- 3.1 Trigger BEFORE INSERT: i dati probatori vengono impostati SOLO lato server
--     (snapshot testo, hash, versione, firmatario, timestamp). Il client non può falsificarli.
CREATE OR REPLACE FUNCTION public.athlete_contract_signatures_before_insert()
RETURNS trigger AS $$
DECLARE
    v_tpl public.contract_templates;
BEGIN
    SELECT * INTO v_tpl FROM public.contract_templates WHERE id = NEW.template_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Versione contrattuale inesistente.';
    END IF;

    IF v_tpl.is_active IS NOT TRUE THEN
        RAISE EXCEPTION 'Questa versione del contratto non è più attiva. Ricarica la pagina e firma la versione aggiornata.';
    END IF;

    NEW.contract_version := v_tpl.version_label;
    NEW.contract_revision := v_tpl.revision;
    NEW.content_snapshot := v_tpl.content;
    NEW.content_hash := v_tpl.content_hash;
    NEW.signed_by := auth.uid();
    NEW.signed_at := NOW();
    NEW.user_agent := left(NEW.user_agent, 500);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS athlete_contract_signatures_before_insert_trg ON public.athlete_contract_signatures;
CREATE TRIGGER athlete_contract_signatures_before_insert_trg
    BEFORE INSERT ON public.athlete_contract_signatures
    FOR EACH ROW EXECUTE FUNCTION public.athlete_contract_signatures_before_insert();

-- 3.2 Trigger BEFORE UPDATE: le firme non sono mai modificabili (anche da service role)
CREATE OR REPLACE FUNCTION public.athlete_contract_signatures_block_update()
RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'Le firme contrattuali sono immutabili e non possono essere modificate.';
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS athlete_contract_signatures_block_update_trg ON public.athlete_contract_signatures;
CREATE TRIGGER athlete_contract_signatures_block_update_trg
    BEFORE UPDATE ON public.athlete_contract_signatures
    FOR EACH ROW EXECUTE FUNCTION public.athlete_contract_signatures_block_update();

-- 3.3 Policy Atleta (AAL1 ammesso) — INSERT solo per sé stesso
DROP POLICY IF EXISTS "athlete_insert_own_contract_signature" ON public.athlete_contract_signatures;
CREATE POLICY "athlete_insert_own_contract_signature" ON public.athlete_contract_signatures
FOR INSERT TO authenticated
WITH CHECK (
    public.is_athlete()
    AND EXISTS (
        SELECT 1 FROM public.athletes a
        WHERE a.id = athlete_contract_signatures.athlete_id
          AND a.auth_user_id = auth.uid()
    )
);

-- 3.4 Policy Atleta (AAL1 ammesso) — SELECT solo delle proprie firme
DROP POLICY IF EXISTS "athlete_select_own_contract_signatures" ON public.athlete_contract_signatures;
CREATE POLICY "athlete_select_own_contract_signatures" ON public.athlete_contract_signatures
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.athletes a
        WHERE a.id = athlete_contract_signatures.athlete_id
          AND a.auth_user_id = auth.uid()
    )
);

-- 3.5 Policy Coach (AAL2 obbligatorio) — SELECT di tutte le firme
DROP POLICY IF EXISTS "coach_aal2_select_contract_signatures" ON public.athlete_contract_signatures;
CREATE POLICY "coach_aal2_select_contract_signatures" ON public.athlete_contract_signatures
FOR SELECT TO authenticated
USING (public.is_coach_aal2());

-- Nessuna policy UPDATE/DELETE: negate a tutti i ruoli client.
-- (La cancellazione avviene solo a cascata se il coach elimina l'anagrafica atleta.)


-- -------------------------------------------------------------------------------------
-- 4. SEED INIZIALE VERSIONE ATTIVA
-- -------------------------------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.contract_templates WHERE is_active = TRUE) THEN
        INSERT INTO public.contract_templates (
            id, version_label, revision, content, content_hash, is_active, published_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000001',
            '2026/2027',
            1,
            '{"version":"2026/2027"}'::jsonb,
            encode(sha256('2026/2027'::bytea), 'hex'),
            TRUE,
            NOW()
        );
    END IF;
END $$;


-- -------------------------------------------------------------------------------------
-- 5. SCHEMA RELOAD
-- -------------------------------------------------------------------------------------

NOTIFY pgrst, 'reload schema';
