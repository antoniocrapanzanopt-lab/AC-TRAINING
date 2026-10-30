-- =================================================================================
-- MIGRATION: 20261028_team_group_chat.sql
-- DESCRIZIONE:
-- 1. Crea la tabella public.team_chat_messages per la Chat di Gruppo del Team
--    (Coach + Atleti) con supporto a messaggi in evidenza (pinned), reazioni emoji
--    e allegati multimediali.
-- 2. Configura le policy RLS conformi al modello MFA/AAL2 per il Coach e accesso
--    autenticato per gli atleti del team.
-- 3. Aggiorna la policy SELECT del bucket 'chat-attachments' per consentire la
--    visualizzazione degli allegati condivisi nella cartella 'chat/team-group/'.
-- 4. Registra public.team_chat_messages nella pubblicazione supabase_realtime.
-- =================================================================================

-- 1. Tabella public.team_chat_messages
CREATE TABLE IF NOT EXISTS public.team_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sender_name TEXT NOT NULL,
    sender_role TEXT NOT NULL DEFAULT 'athlete' CHECK (sender_role IN ('coach', 'athlete')),
    sender_initials TEXT NOT NULL DEFAULT 'AT',
    content TEXT NOT NULL,
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    reactions JSONB NOT NULL DEFAULT '{}'::jsonb,
    reply_to_id UUID REFERENCES public.team_chat_messages(id) ON DELETE SET NULL,
    reply_preview TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS team_chat_messages_created_at_idx ON public.team_chat_messages(created_at ASC);
CREATE INDEX IF NOT EXISTS team_chat_messages_is_pinned_idx ON public.team_chat_messages(is_pinned) WHERE is_pinned = true;

ALTER TABLE public.team_chat_messages ENABLE ROW LEVEL SECURITY;

-- 2. Policy RLS per public.team_chat_messages
DROP POLICY IF EXISTS "team_chat_read_authenticated" ON public.team_chat_messages;
CREATE POLICY "team_chat_read_authenticated" ON public.team_chat_messages
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "team_chat_insert_own" ON public.team_chat_messages;
CREATE POLICY "team_chat_insert_own" ON public.team_chat_messages
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = sender_id
        AND (
            (sender_role = 'coach' AND (public.is_coach_aal2() OR public.is_coach()))
            OR sender_role = 'athlete'
        )
    );

DROP POLICY IF EXISTS "team_chat_update_reactions_or_coach" ON public.team_chat_messages;
CREATE POLICY "team_chat_update_reactions_or_coach" ON public.team_chat_messages
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

-- Trigger di protezione per impedire ad atleti di modificare testo o pin altrui
CREATE OR REPLACE FUNCTION public.protect_team_chat_message_updates()
RETURNS TRIGGER AS $$
BEGIN
    IF public.is_coach_aal2() OR public.is_coach() THEN
        RETURN NEW;
    END IF;

    -- L'autore può modificare il proprio testo, gli altri possono solo aggiornare le reazioni
    IF auth.uid() <> OLD.sender_id THEN
        IF NEW.content IS DISTINCT FROM OLD.content
           OR NEW.is_pinned IS DISTINCT FROM OLD.is_pinned
           OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
           OR NEW.sender_role IS DISTINCT FROM OLD.sender_role THEN
            RAISE EXCEPTION 'Operazione non consentita: puoi aggiungere solo reazioni ai messaggi del team.';
        END IF;
    ELSE
        IF NEW.is_pinned IS DISTINCT FROM OLD.is_pinned THEN
            RAISE EXCEPTION 'Operazione non consentita: solo il Coach può fissare i messaggi in alto.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS protect_team_chat_message_updates_trigger ON public.team_chat_messages;
CREATE TRIGGER protect_team_chat_message_updates_trigger
BEFORE UPDATE ON public.team_chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.protect_team_chat_message_updates();

DROP POLICY IF EXISTS "team_chat_delete_own_or_coach" ON public.team_chat_messages;
CREATE POLICY "team_chat_delete_own_or_coach" ON public.team_chat_messages
    FOR DELETE TO authenticated
    USING (
        auth.uid() = sender_id
        OR public.is_coach_aal2()
        OR public.is_coach()
    );

-- 3. Estensione policy Storage per allegati del gruppo (cartella chat/team-group/*)
DROP POLICY IF EXISTS "chat_attachments_select" ON storage.objects;
CREATE POLICY "chat_attachments_select" ON storage.objects 
FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-attachments' AND 
  (
    public.is_coach_aal2()
    OR
    (
      (storage.foldername(name))[1] = 'chat' AND
      (storage.foldername(name))[2] = 'team-group'
    )
    OR
    (
      (storage.foldername(name))[1] = 'chat' AND
      EXISTS (
        SELECT 1 FROM public.athletes a
        WHERE a.id::text = (storage.foldername(name))[2]
          AND a.auth_user_id = auth.uid()
      )
    )
    OR
    (owner_id::text = auth.uid()::text)
  )
);

DROP POLICY IF EXISTS "chat_attachments_insert" ON storage.objects;
CREATE POLICY "chat_attachments_insert" ON storage.objects 
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments' AND 
  (
    public.is_coach_aal2()
    OR
    (
      (storage.foldername(name))[1] = 'chat' AND
      (storage.foldername(name))[2] = 'team-group'
    )
    OR
    (
      (storage.foldername(name))[1] = 'chat' AND
      EXISTS (
        SELECT 1 FROM public.athletes a
        WHERE a.id::text = (storage.foldername(name))[2]
          AND a.auth_user_id = auth.uid()
      )
    )
  )
);

-- 4. Pubblicazione Realtime
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'team_chat_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.team_chat_messages;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

