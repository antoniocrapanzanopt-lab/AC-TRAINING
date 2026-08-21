import { supabase } from '../lib/supabase';
import { InstagramContent, ContentStatus } from '../types/inboxAndContent';

/**
 * Recupera tutti i contenuti Instagram del coach
 */
export async function getInstagramContents(): Promise<InstagramContent[]> {
  const { data, error } = await supabase
    .from('instagram_contents')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Errore recupero instagram_contents:', error);
    throw new Error(`Impossibile caricare i contenuti: ${error.message}`);
  }

  return (data || []) as InstagramContent[];
}

/**
 * Crea un nuovo contenuto Instagram
 */
export async function createInstagramContent(
  payload: Partial<InstagramContent>
): Promise<InstagramContent> {
  const { data: userData } = await supabase.auth.getUser();
  const coachId = userData?.user?.id;

  if (!coachId) {
    throw new Error('Utente non autenticato.');
  }

  const { data, error } = await supabase
    .from('instagram_contents')
    .insert({
      ...payload,
      coach_id: coachId,
      status: payload.status || 'idea',
      type: payload.type || 'reel',
      pillar: payload.pillar || 'technique_execution',
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Errore creazione contenuto: ${error?.message}`);
  }

  // Se il contenuto è stato generato da un'inbox entry, aggiorna lo stato dell'entry
  if (payload.origin_inbox_id) {
    await supabase
      .from('inbox_entries')
      .update({
        status: 'converted_content',
        converted_content_id: data.id,
      })
      .eq('id', payload.origin_inbox_id);
  }

  return data as InstagramContent;
}

/**
 * Aggiorna un contenuto esistente (Hook, Script, Caption, CTA, Note, ecc.)
 */
export async function updateInstagramContent(
  id: string,
  updates: Partial<InstagramContent>
): Promise<InstagramContent> {
  const { data, error } = await supabase
    .from('instagram_contents')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Errore aggiornamento contenuto: ${error?.message}`);
  }

  return data as InstagramContent;
}

/**
 * Sposta lo stato di un contenuto nella Kanban pipeline
 */
export async function updateContentStatus(
  id: string,
  status: ContentStatus
): Promise<void> {
  const updates: Record<string, any> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'published') {
    updates.published_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('instagram_contents')
    .update(updates)
    .eq('id', id);

  if (error) {
    throw new Error(`Errore cambio stato: ${error.message}`);
  }
}

/**
 * Elimina un contenuto
 */
export async function deleteInstagramContent(id: string): Promise<void> {
  const { error } = await supabase
    .from('instagram_contents')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Errore eliminazione contenuto: ${error.message}`);
  }
}
