-- =====================================================================================
-- MIGRATION: HARDENING STORAGE 'chat-attachments' & POLICY RLS GRANULARI
-- DATA: 2026-08-16
-- AUTORE: Antigravity AI Security Hardening
-- =====================================================================================

-- 1. Configurazione Bucket Privato
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-attachments', 'chat-attachments', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- 2. Pulizia Policy Obsolete o Sovrapposte
DROP POLICY IF EXISTS "chat_attachments_read" ON storage.objects;
DROP POLICY IF EXISTS "chat_attachments_insert" ON storage.objects;
DROP POLICY IF EXISTS "chat_attachments_manage" ON storage.objects;
DROP POLICY IF EXISTS "chat_attachments_select" ON storage.objects;
DROP POLICY IF EXISTS "chat_attachments_update" ON storage.objects;
DROP POLICY IF EXISTS "chat_attachments_delete" ON storage.objects;
DROP POLICY IF EXISTS "chat_attachments_read_strict" ON storage.objects;
DROP POLICY IF EXISTS "chat_attachments_insert_strict" ON storage.objects;
DROP POLICY IF EXISTS "chat_attachments_manage_strict" ON storage.objects;

-- 3. Policy SELECT (Lettura Rigida)
-- Accesso consentito SOLO a:
-- a) Coach/Owner con sessione MFA attiva (AAL2)
-- b) Atleta titolare della cartella 'chat/<athlete_id>/...'
-- c) Autore originario del caricamento (tramite owner_id)
CREATE POLICY "chat_attachments_select" ON storage.objects 
FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-attachments' AND 
  (
    public.is_coach_aal2()
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

-- 4. Policy INSERT (Caricamento Rigido senza fallback aperto)
-- Upload consentito SOLO a:
-- a) Coach/Owner con sessione MFA attiva (AAL2)
-- b) Atleta titolare della cartella 'chat/<athlete_id>/...'
CREATE POLICY "chat_attachments_insert" ON storage.objects 
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments' AND 
  (
    public.is_coach_aal2()
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

-- 5. Policy UPDATE (Modifica Riservata a Coach AAL2 o Autore)
CREATE POLICY "chat_attachments_update" ON storage.objects 
FOR UPDATE TO authenticated
USING (
  bucket_id = 'chat-attachments' AND 
  (public.is_coach_aal2() OR owner_id::text = auth.uid()::text)
)
WITH CHECK (
  bucket_id = 'chat-attachments' AND 
  (public.is_coach_aal2() OR owner_id::text = auth.uid()::text)
);

-- 6. Policy DELETE (Cancellazione Riservata a Coach AAL2 o Autore)
CREATE POLICY "chat_attachments_delete" ON storage.objects 
FOR DELETE TO authenticated
USING (
  bucket_id = 'chat-attachments' AND 
  (public.is_coach_aal2() OR owner_id::text = auth.uid()::text)
);
