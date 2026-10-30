-- =================================================================================
-- MIGRATION: 20261027_fix_athlete_max_lifts_rls.sql
-- DESCRIZIONE: 
-- 1. Consente il primo collegamento account atleta (auth_user_id DA NULL A auth.uid())
--    nel trigger protect_athlete_row_update() invocato da link_athlete_account().
-- 2. Estende le policy RLS di athlete_max_lifts e athlete_metrics con fallback su
--    email certificata dal JWT (come già attivo per workout_sessions) così che i
--    massimali (1RM) e le misurazioni inseriti dall'atleta non vengano rifiutati.
-- =================================================================================

-- 1. Aggiornamento trigger anti-tampering su public.athletes per permettere il self-linking iniziale
CREATE OR REPLACE FUNCTION public.protect_athlete_row_update()
RETURNS TRIGGER AS $$
BEGIN
    IF public.is_coach() THEN
        RETURN NEW;
    END IF;

    IF NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
        -- Permetti il primo collegamento se auth_user_id era NULL e viene impostato a auth.uid() per la stessa email
        IF NOT (
            OLD.auth_user_id IS NULL
            AND NEW.auth_user_id = auth.uid()
            AND LOWER(TRIM(COALESCE(OLD.email, ''))) = LOWER(TRIM(COALESCE(auth.jwt()->>'email', '')))
        ) THEN
            RAISE EXCEPTION 'Accesso Negato: auth_user_id non modificabile.';
        END IF;
    END IF;

    IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
        RAISE EXCEPTION 'Accesso Negato: lo stato dei pagamenti può essere modificato esclusivamente dal coach.';
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
        RAISE EXCEPTION 'Accesso Negato: lo stato dell''account può essere modificato esclusivamente dal coach.';
    END IF;

    IF NEW.assigned_coach_id IS DISTINCT FROM OLD.assigned_coach_id OR 
       NEW.assigned_coach_name IS DISTINCT FROM OLD.assigned_coach_name THEN
        RAISE EXCEPTION 'Accesso Negato: assegnazione coach non modificabile dall''atleta.';
    END IF;

    IF NEW.notes IS DISTINCT FROM OLD.notes THEN
        RAISE EXCEPTION 'Accesso Negato: le note interne del coach non sono modificabili dall''atleta.';
    END IF;

    IF NEW.tax_code IS DISTINCT FROM OLD.tax_code AND OLD.tax_code IS NOT NULL AND OLD.tax_code <> '' THEN
        RAISE EXCEPTION 'Accesso Negato: il codice fiscale non può essere modificato autonomamente una volta impostato.';
    END IF;

    IF NEW.medical_cert_expiry IS DISTINCT FROM OLD.medical_cert_expiry OR
       NEW.medical_cert_type IS DISTINCT FROM OLD.medical_cert_type THEN
        RAISE EXCEPTION 'Accesso Negato: la validazione del certificato medico è riservata al coach.';
    END IF;

    IF NEW.email IS DISTINCT FROM OLD.email THEN
        RAISE EXCEPTION 'Accesso Negato: il cambio email richiede la procedura di aggiornamento autenticazione.';
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 2. Policy RLS per public.athlete_max_lifts (Coach + Atleta con match auth_user_id o email JWT)
DROP POLICY IF EXISTS "coach_manage_max_lifts" ON public.athlete_max_lifts;
DROP POLICY IF EXISTS "coach_manage_max_lifts_mfa" ON public.athlete_max_lifts;
CREATE POLICY "coach_manage_max_lifts_mfa" ON public.athlete_max_lifts 
FOR ALL TO authenticated 
USING (public.is_coach_aal2() OR public.is_coach()) 
WITH CHECK (public.is_coach_aal2() OR public.is_coach());

DROP POLICY IF EXISTS "athlete_own_max_lifts" ON public.athlete_max_lifts;
CREATE POLICY "athlete_own_max_lifts" ON public.athlete_max_lifts 
FOR ALL TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.athletes a
        WHERE a.id = athlete_max_lifts.athlete_id
          AND (
              a.auth_user_id = auth.uid()
              OR (
                  COALESCE(auth.jwt()->>'email', '') <> ''
                  AND LOWER(TRIM(COALESCE(a.email, ''))) = LOWER(TRIM(COALESCE(auth.jwt()->>'email', '')))
              )
          )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.athletes a
        WHERE a.id = athlete_max_lifts.athlete_id
          AND (
              a.auth_user_id = auth.uid()
              OR (
                  COALESCE(auth.jwt()->>'email', '') <> ''
                  AND LOWER(TRIM(COALESCE(a.email, ''))) = LOWER(TRIM(COALESCE(auth.jwt()->>'email', '')))
              )
          )
    )
);

-- 3. Policy RLS per public.athlete_metrics (Coach + Atleta con match auth_user_id o email JWT)
DROP POLICY IF EXISTS "coach_manage_metrics" ON public.athlete_metrics;
DROP POLICY IF EXISTS "coach_manage_metrics_mfa" ON public.athlete_metrics;
CREATE POLICY "coach_manage_metrics_mfa" ON public.athlete_metrics 
FOR ALL TO authenticated 
USING (public.is_coach_aal2() OR public.is_coach()) 
WITH CHECK (public.is_coach_aal2() OR public.is_coach());

DROP POLICY IF EXISTS "athlete_own_metrics" ON public.athlete_metrics;
CREATE POLICY "athlete_own_metrics" ON public.athlete_metrics 
FOR ALL TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.athletes a
        WHERE a.id = athlete_metrics.athlete_id
          AND (
              a.auth_user_id = auth.uid()
              OR (
                  COALESCE(auth.jwt()->>'email', '') <> ''
                  AND LOWER(TRIM(COALESCE(a.email, ''))) = LOWER(TRIM(COALESCE(auth.jwt()->>'email', '')))
              )
          )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.athletes a
        WHERE a.id = athlete_metrics.athlete_id
          AND (
              a.auth_user_id = auth.uid()
              OR (
                  COALESCE(auth.jwt()->>'email', '') <> ''
                  AND LOWER(TRIM(COALESCE(a.email, ''))) = LOWER(TRIM(COALESCE(auth.jwt()->>'email', '')))
              )
          )
    )
);


-- 4. Policy RLS per public.athlete_contract_signatures, public.athlete_onboarding_responses e public.athlete_notes
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'athlete_contract_signatures') THEN
        DROP POLICY IF EXISTS "athlete_insert_own_contract_signature" ON public.athlete_contract_signatures;
        CREATE POLICY "athlete_insert_own_contract_signature" ON public.athlete_contract_signatures
        FOR INSERT TO authenticated
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.athletes a
                WHERE a.id = athlete_contract_signatures.athlete_id
                  AND (
                      a.auth_user_id = auth.uid()
                      OR (
                          COALESCE(auth.jwt()->>'email', '') <> ''
                          AND LOWER(TRIM(COALESCE(a.email, ''))) = LOWER(TRIM(COALESCE(auth.jwt()->>'email', '')))
                      )
                  )
            )
        );

        DROP POLICY IF EXISTS "athlete_select_own_contract_signatures" ON public.athlete_contract_signatures;
        CREATE POLICY "athlete_select_own_contract_signatures" ON public.athlete_contract_signatures
        FOR SELECT TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.athletes a
                WHERE a.id = athlete_contract_signatures.athlete_id
                  AND (
                      a.auth_user_id = auth.uid()
                      OR (
                          COALESCE(auth.jwt()->>'email', '') <> ''
                          AND LOWER(TRIM(COALESCE(a.email, ''))) = LOWER(TRIM(COALESCE(auth.jwt()->>'email', '')))
                      )
                  )
            )
        );

        DROP POLICY IF EXISTS "coach_select_contract_signatures" ON public.athlete_contract_signatures;
        CREATE POLICY "coach_select_contract_signatures" ON public.athlete_contract_signatures
        FOR SELECT TO authenticated
        USING (
            public.is_coach_aal2() OR
            public.is_coach() OR
            (auth.jwt()->>'role') = 'coach' OR
            (auth.jwt()->>'role') = 'admin' OR
            (auth.jwt()->>'role') = 'service_role'
        );
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'athlete_onboarding_responses') THEN
        DROP POLICY IF EXISTS "athlete_manage_own_onboarding" ON public.athlete_onboarding_responses;
        CREATE POLICY "athlete_manage_own_onboarding" ON public.athlete_onboarding_responses
        FOR ALL TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.athletes a
                WHERE a.id = athlete_onboarding_responses.athlete_id
                  AND (
                      a.auth_user_id = auth.uid()
                      OR (
                          COALESCE(auth.jwt()->>'email', '') <> ''
                          AND LOWER(TRIM(COALESCE(a.email, ''))) = LOWER(TRIM(COALESCE(auth.jwt()->>'email', '')))
                      )
                  )
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.athletes a
                WHERE a.id = athlete_onboarding_responses.athlete_id
                  AND (
                      a.auth_user_id = auth.uid()
                      OR (
                          COALESCE(auth.jwt()->>'email', '') <> ''
                          AND LOWER(TRIM(COALESCE(a.email, ''))) = LOWER(TRIM(COALESCE(auth.jwt()->>'email', '')))
                      )
                  )
            )
        );
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'athlete_notes') THEN
        DROP POLICY IF EXISTS "athlete_insert_own_notes" ON public.athlete_notes;
        CREATE POLICY "athlete_insert_own_notes" ON public.athlete_notes
        FOR INSERT TO authenticated
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.athletes a
                WHERE a.id = athlete_notes.athlete_id
                  AND (
                      a.auth_user_id = auth.uid()
                      OR (
                          COALESCE(auth.jwt()->>'email', '') <> ''
                          AND LOWER(TRIM(COALESCE(a.email, ''))) = LOWER(TRIM(COALESCE(auth.jwt()->>'email', '')))
                      )
                  )
            )
        );
    END IF;
END $$;
