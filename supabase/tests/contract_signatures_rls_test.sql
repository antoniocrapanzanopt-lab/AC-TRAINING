-- =====================================================================================
-- TEST AUTORIZZATIVI: contract_templates & athlete_contract_signatures
-- =====================================================================================
-- ⚠️ Da eseguire SOLO su database locale / staging (es. `supabase db reset` + psql),
--    MAI sul database di produzione.
-- L'intero script gira in un'unica transazione chiusa con ROLLBACK: nessun dato persiste.
--
-- Esecuzione:  psql "$STAGING_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/contract_signatures_rls_test.sql
-- Esito atteso: messaggi NOTICE "OK ..." e nessun errore.
-- =====================================================================================

BEGIN;

-- ── Fixture (create come superuser, annullate dal ROLLBACK finale) ──────────────────
DO $$
DECLARE
    v_athlete_user UUID := '00000000-0000-4000-a000-000000000a01';
    v_other_user   UUID := '00000000-0000-4000-a000-000000000a02';
BEGIN
    -- 1. Inserisce prima in public.athletes: in questo modo il trigger check_user_signup
    -- su auth.users trova già le email registrate e non richiede ALTER TABLE auth.users
    INSERT INTO public.athletes (id, auth_user_id, first_name, last_name, email) VALUES
        ('00000000-0000-4000-b000-000000000b01', NULL, 'Test', 'Atleta', 'rls-test-athlete@example.test'),
        ('00000000-0000-4000-b000-000000000b02', NULL, 'Altro', 'Atleta', 'rls-test-other@example.test');

    -- 2. Inserimento in auth.users (il trigger validate_user_signup passa regolarmente)
    INSERT INTO auth.users (id, email) VALUES
        (v_athlete_user, 'rls-test-athlete@example.test'),
        (v_other_user,   'rls-test-other@example.test');

    -- 3. Assegnazione auth_user_id
    UPDATE public.athletes SET auth_user_id = v_athlete_user WHERE id = '00000000-0000-4000-b000-000000000b01';
    UPDATE public.athletes SET auth_user_id = v_other_user WHERE id = '00000000-0000-4000-b000-000000000b02';
END $$;

-- Helper per simulare il JWT
CREATE OR REPLACE FUNCTION pg_temp.as_user(p_sub UUID, p_aal TEXT, p_email TEXT) RETURNS VOID AS $$
BEGIN
    PERFORM set_config('request.jwt.claims',
        json_build_object('sub', p_sub, 'aal', p_aal, 'email', p_email, 'role', 'authenticated')::text, true);
    PERFORM set_config('request.jwt.claim.sub', p_sub::text, true);
END;
$$ LANGUAGE plpgsql;

SET LOCAL ROLE authenticated;

-- ── T1: coach AAL1 NON può pubblicare ───────────────────────────────────────────────
SELECT pg_temp.as_user('9f683185-a2b4-4d6c-a3e4-1a2c1a227f69', 'aal1', 'antonio.crapanzanopt@gmail.com');
DO $$
BEGIN
    PERFORM public.publish_contract_template('TEST', '{"a":1}'::jsonb);
    RAISE EXCEPTION 'FAIL T1: coach AAL1 ha pubblicato';
EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'OK T1: coach AAL1 bloccato in pubblicazione';
END $$;

-- ── T2: atleta NON può pubblicare ───────────────────────────────────────────────────
SELECT pg_temp.as_user('00000000-0000-4000-a000-000000000a01', 'aal1', 'rls-test-athlete@example.test');
DO $$
BEGIN
    PERFORM public.publish_contract_template('TEST', '{"a":1}'::jsonb);
    RAISE EXCEPTION 'FAIL T2: atleta ha pubblicato';
EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'OK T2: atleta bloccato in pubblicazione';
END $$;

-- ── T3: coach AAL2 pubblica ─────────────────────────────────────────────────────────
SELECT pg_temp.as_user('9f683185-a2b4-4d6c-a3e4-1a2c1a227f69', 'aal2', 'antonio.crapanzanopt@gmail.com');
DO $$
DECLARE v_id UUID;
BEGIN
    SELECT id INTO v_id FROM public.publish_contract_template('TEST-RLS', '{"test":true}'::jsonb);
    IF v_id IS NULL THEN RAISE EXCEPTION 'FAIL T3'; END IF;
    PERFORM set_config('test.template_id', v_id::text, true);
    RAISE NOTICE 'OK T3: coach AAL2 ha pubblicato la versione %', v_id;
END $$;

-- ── T4: atleta legge solo il modello attivo e firma per sé ──────────────────────────
SELECT pg_temp.as_user('00000000-0000-4000-a000-000000000a01', 'aal1', 'rls-test-athlete@example.test');
DO $$
DECLARE v_count INT; v_hash TEXT;
BEGIN
    SELECT COUNT(*) INTO v_count FROM public.contract_templates WHERE is_active = FALSE;
    IF v_count <> 0 THEN RAISE EXCEPTION 'FAIL T4a: atleta vede versioni non attive'; END IF;

    INSERT INTO public.athlete_contract_signatures (
        athlete_id, template_id, signer_full_name, signature_image,
        consent_service_terms, consent_specific_clauses, consent_health_declaration,
        consent_health_data, consent_video_internal,
        content_snapshot, content_hash, contract_version
    ) VALUES (
        '00000000-0000-4000-b000-000000000b01', current_setting('test.template_id')::uuid,
        'Test Atleta', 'data:image/png;base64,AAAA',
        TRUE, TRUE, TRUE, TRUE, TRUE,
        '{"falsificato":true}'::jsonb, 'hash-falso', 'versione-falsa'
    ) RETURNING content_hash INTO v_hash;

    IF v_hash = 'hash-falso' THEN RAISE EXCEPTION 'FAIL T4b: hash impostato dal client'; END IF;
    RAISE NOTICE 'OK T4: firma inserita, snapshot/hash forzati lato server';
END $$;

-- ── T5: atleta NON può firmare per un altro atleta ──────────────────────────────────
DO $$
BEGIN
    INSERT INTO public.athlete_contract_signatures (
        athlete_id, template_id, signer_full_name, signature_image,
        consent_service_terms, consent_specific_clauses, consent_health_declaration,
        consent_health_data, consent_video_internal
    ) VALUES (
        '00000000-0000-4000-b000-000000000b02', current_setting('test.template_id')::uuid,
        'Impostore', 'data:image/png;base64,AAAA', TRUE, TRUE, TRUE, TRUE, TRUE
    );
    RAISE EXCEPTION 'FAIL T5: firma per conto di altro atleta';
EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'OK T5: firma per altro atleta bloccata';
END $$;

-- ── T6: firma immutabile (UPDATE) e non cancellabile (DELETE) dall'atleta ───────────
DO $$
DECLARE v_rows INT;
BEGIN
    UPDATE public.athlete_contract_signatures SET signer_full_name = 'X';
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows <> 0 THEN RAISE EXCEPTION 'FAIL T6a: UPDATE riuscito'; END IF;

    DELETE FROM public.athlete_contract_signatures;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows <> 0 THEN RAISE EXCEPTION 'FAIL T6b: DELETE riuscito'; END IF;
    RAISE NOTICE 'OK T6: UPDATE/DELETE negati all''atleta';
END $$;

-- ── T7: altro atleta NON vede la firma ──────────────────────────────────────────────
SELECT pg_temp.as_user('00000000-0000-4000-a000-000000000a02', 'aal1', 'rls-test-other@example.test');
DO $$
DECLARE v_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count FROM public.athlete_contract_signatures;
    IF v_count <> 0 THEN RAISE EXCEPTION 'FAIL T7: altro atleta vede firme altrui'; END IF;
    RAISE NOTICE 'OK T7: isolamento firme tra atleti';
END $$;

-- ── T8: coach AAL1 NON vede le firme, coach AAL2 sì ─────────────────────────────────
SELECT pg_temp.as_user('9f683185-a2b4-4d6c-a3e4-1a2c1a227f69', 'aal1', 'antonio.crapanzanopt@gmail.com');
DO $$
DECLARE v_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count FROM public.athlete_contract_signatures;
    IF v_count <> 0 THEN RAISE EXCEPTION 'FAIL T8a: coach AAL1 vede le firme'; END IF;
    RAISE NOTICE 'OK T8a: coach AAL1 non vede le firme';
END $$;

SELECT pg_temp.as_user('9f683185-a2b4-4d6c-a3e4-1a2c1a227f69', 'aal2', 'antonio.crapanzanopt@gmail.com');
DO $$
DECLARE v_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count FROM public.athlete_contract_signatures
    WHERE athlete_id = '00000000-0000-4000-b000-000000000b01';
    IF v_count <> 1 THEN RAISE EXCEPTION 'FAIL T8b: coach AAL2 non vede la firma'; END IF;
    RAISE NOTICE 'OK T8b: coach AAL2 vede la firma';
END $$;

-- ── T9: anche il coach non può modificare una firma ─────────────────────────────────
DO $$
DECLARE v_rows INT;
BEGIN
    UPDATE public.athlete_contract_signatures SET signer_full_name = 'X';
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows <> 0 THEN RAISE EXCEPTION 'FAIL T9: coach ha modificato una firma'; END IF;
    RAISE NOTICE 'OK T9: firme immutabili anche per il coach';
END $$;

-- ── T10: nuova versione → la vecchia non è più firmabile ────────────────────────────
DO $$
BEGIN
    PERFORM public.publish_contract_template('TEST-RLS-2', '{"test":2}'::jsonb);
    RAISE NOTICE 'OK T10a: pubblicata nuova versione';
END $$;

SELECT pg_temp.as_user('00000000-0000-4000-a000-000000000a02', 'aal1', 'rls-test-other@example.test');
DO $$
BEGIN
    INSERT INTO public.athlete_contract_signatures (
        athlete_id, template_id, signer_full_name, signature_image,
        consent_service_terms, consent_specific_clauses, consent_health_declaration,
        consent_health_data, consent_video_internal
    ) VALUES (
        '00000000-0000-4000-b000-000000000b02', current_setting('test.template_id')::uuid,
        'Altro Atleta', 'data:image/png;base64,AAAA', TRUE, TRUE, TRUE, TRUE, TRUE
    );
    RAISE EXCEPTION 'FAIL T10b: firmata versione non attiva';
EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'FAIL%' THEN RAISE; END IF;
    RAISE NOTICE 'OK T10b: versione obsoleta non firmabile';
END $$;

RESET ROLE;
ROLLBACK;
