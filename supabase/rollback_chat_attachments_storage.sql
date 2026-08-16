-- =====================================================================================
-- ROLLBACK MIGRATION: RIPRISTINO STATO BUCKET 'chat-attachments'
-- DATA: 2026-08-16
-- =====================================================================================

-- 1. Ripristina il bucket in modalità pubblica
UPDATE storage.buckets 
SET public = true 
WHERE id = 'chat-attachments';

-- 2. Elimina le policy granulari
DROP POLICY IF EXISTS "chat_attachments_select" ON storage.objects;
DROP POLICY IF EXISTS "chat_attachments_insert" ON storage.objects;
DROP POLICY IF EXISTS "chat_attachments_update" ON storage.objects;
DROP POLICY IF EXISTS "chat_attachments_delete" ON storage.objects;

-- 3. Ricrea le policy permissive originarie
CREATE POLICY "chat_attachments_read" ON storage.objects 
FOR SELECT TO authenticated
USING (bucket_id = 'chat-attachments');

CREATE POLICY "chat_attachments_insert" ON storage.objects 
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-attachments');

CREATE POLICY "chat_attachments_manage" ON storage.objects 
FOR ALL TO authenticated
USING (
  bucket_id = 'chat-attachments' AND 
  (public.is_coach_aal2() OR owner_id::text = auth.uid()::text)
)
WITH CHECK (
  bucket_id = 'chat-attachments' AND 
  (public.is_coach_aal2() OR owner_id::text = auth.uid()::text)
);
