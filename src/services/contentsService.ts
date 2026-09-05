import { supabase } from '../lib/supabase';
import { InstagramContent, ContentStatus } from '../types/inboxAndContent';

interface ContentGraphicFallback {
  carousel_data?: InstagramContent['carousel_data'];
  cover_data?: InstagramContent['cover_data'];
  story_data?: InstagramContent['story_data'];
}

function cacheContentFallback(id: string, updates: Partial<InstagramContent>): void {
  try {
    const key = `ac_content_fallback_${id}`;
    const existingStr = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    const existing: ContentGraphicFallback = existingStr ? JSON.parse(existingStr) : {};
    const merged: ContentGraphicFallback = {
      ...existing,
      ...(updates.carousel_data !== undefined && { carousel_data: updates.carousel_data }),
      ...(updates.cover_data !== undefined && { cover_data: updates.cover_data }),
      ...(updates.story_data !== undefined && { story_data: updates.story_data }),
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(merged));
    }
  } catch (e) {
    console.warn('Impossibile salvare fallback locale grafica:', e);
  }
}

function getContentFallback(id: string): ContentGraphicFallback {
  try {
    if (typeof window === 'undefined') return {};
    const key = `ac_content_fallback_${id}`;
    const str = localStorage.getItem(key);
    return str ? (JSON.parse(str) as ContentGraphicFallback) : {};
  } catch {
    return {};
  }
}

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

  const rows = (data || []) as InstagramContent[];
  return rows.map((row) => {
    const fallback = getContentFallback(row.id);
    return {
      ...row,
      carousel_data: row.carousel_data || fallback.carousel_data || null,
      cover_data: row.cover_data || fallback.cover_data || null,
      story_data: row.story_data || fallback.story_data || null,
    };
  });
}
const isSchemaCacheError = (err: { message?: string; code?: string; details?: string } | null): boolean => {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  const det = (err.details || '').toLowerCase();
  return (
    err.code === 'PGRST204' ||
    err.code === '42703' ||
    msg.includes('schema cache') ||
    msg.includes('column') ||
    msg.includes('does not exist') ||
    det.includes('schema cache') ||
    det.includes('column') ||
    det.includes('does not exist')
  );
};

// Rilevamento automatico stato colonne grafiche sul DB remoto
let isGraphicsColumnsAvailable: boolean | null = null;

async function checkGraphicsColumnsAvailability(): Promise<boolean> {
  if (isGraphicsColumnsAvailable !== null) {
    return isGraphicsColumnsAvailable;
  }
  try {
    const { error } = await supabase
      .from('instagram_contents')
      .select('carousel_data')
      .limit(1);

    if (error && isSchemaCacheError(error)) {
      isGraphicsColumnsAvailable = false;
      return false;
    }
    isGraphicsColumnsAvailable = !error;
    return isGraphicsColumnsAvailable;
  } catch {
    isGraphicsColumnsAvailable = false;
    return false;
  }
}

/**
 * Crea un nuovo contenuto Instagram con failover resiliente per colonne schema cache
 */
export async function createInstagramContent(
  payload: Partial<InstagramContent>
): Promise<InstagramContent> {
  const { data: userData } = await supabase.auth.getUser();
  const coachId = userData?.user?.id;

  if (!coachId) {
    throw new Error('Utente non autenticato.');
  }

  const hasDbColumns = await checkGraphicsColumnsAvailability();

  const insertData: Record<string, unknown> = {
    ...payload,
    coach_id: coachId,
    status: payload.status || 'idea',
    type: payload.type || 'reel',
    pillar: payload.pillar || 'technique_execution',
  };

  // Se il database remoto non ha ancora le colonne grafiche, non inviarle per evitare errori schema cache
  if (!hasDbColumns) {
    delete insertData.carousel_data;
    delete insertData.cover_data;
    delete insertData.story_data;
  }

  let { data, error } = await supabase
    .from('instagram_contents')
    .insert(insertData)
    .select()
    .single();

  // Failover resiliente di emergenza: se risponde comunque con errore schema cache
  if (error && isSchemaCacheError(error)) {
    isGraphicsColumnsAvailable = false;
    console.warn('Schema cache Supabase disallineato su insert, salvataggio con colonne base:', error.message);
    const sanitizedInsert: Record<string, unknown> = { ...insertData };
    delete sanitizedInsert.carousel_data;
    delete sanitizedInsert.cover_data;
    delete sanitizedInsert.story_data;

    const retry = await supabase
      .from('instagram_contents')
      .insert(sanitizedInsert)
      .select()
      .single();

    if (!retry.error && retry.data) {
      data = retry.data;
      error = null;
    } else {
      error = retry.error;
    }
  }

  if (error || !data) {
    throw new Error(`Errore creazione contenuto: ${error?.message}`);
  }

  const createdRow = data as InstagramContent;

  // Salva sempre copia locale di sicurezza per i dati grafici
  if (createdRow.id && (payload.carousel_data || payload.cover_data || payload.story_data)) {
    cacheContentFallback(createdRow.id, payload);
  }

  // Se il contenuto è stato generato da un'inbox entry, aggiorna lo stato dell'entry
  if (payload.origin_inbox_id) {
    await supabase
      .from('inbox_entries')
      .update({
        status: 'converted_content',
        converted_content_id: createdRow.id,
      })
      .eq('id', payload.origin_inbox_id);
  }

  const fallback = getContentFallback(createdRow.id);
  return {
    ...fallback,
    ...createdRow,
    carousel_data: createdRow.carousel_data || fallback.carousel_data || null,
    cover_data: createdRow.cover_data || fallback.cover_data || null,
    story_data: createdRow.story_data || fallback.story_data || null,
  };
}

/**
 * Aggiorna un contenuto esistente con failover resiliente per colonne schema cache
 */
export async function updateInstagramContent(
  id: string,
  updates: Partial<InstagramContent>
): Promise<InstagramContent> {
  // Salva sempre copia locale di sicurezza per i dati grafici
  if (updates.carousel_data !== undefined || updates.cover_data !== undefined || updates.story_data !== undefined) {
    cacheContentFallback(id, updates);
  }

  const hasDbColumns = await checkGraphicsColumnsAvailability();

  const payload: Record<string, unknown> = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  // Se il database remoto non ha ancora le colonne grafiche, non inviarle
  if (!hasDbColumns) {
    delete payload.carousel_data;
    delete payload.cover_data;
    delete payload.story_data;
  }

  let { data, error } = await supabase
    .from('instagram_contents')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  // Failover resiliente di emergenza
  if (error && isSchemaCacheError(error)) {
    isGraphicsColumnsAvailable = false;
    console.warn('Schema cache Supabase disallineato su update, salvataggio con colonne base:', error.message);
    const sanitizedPayload: Record<string, unknown> = { ...payload };
    delete sanitizedPayload.carousel_data;
    delete sanitizedPayload.cover_data;
    delete sanitizedPayload.story_data;

    const retry = await supabase
      .from('instagram_contents')
      .update(sanitizedPayload)
      .eq('id', id)
      .select()
      .single();

    if (!retry.error && retry.data) {
      data = retry.data;
      error = null;
    } else {
      error = retry.error;
    }
  }

  if (error || !data) {
    throw new Error(`Errore aggiornamento contenuto: ${error?.message}`);
  }

  const updatedRow = data as InstagramContent;
  const fallback = getContentFallback(id);
  return {
    ...fallback,
    ...updatedRow,
    carousel_data: updatedRow.carousel_data || fallback.carousel_data || null,
    cover_data: updatedRow.cover_data || fallback.cover_data || null,
    story_data: updatedRow.story_data || fallback.story_data || null,
  };
}

/**
 * Sposta lo stato di un contenuto nella Kanban pipeline
 */
export async function updateContentStatus(
  id: string,
  status: ContentStatus
): Promise<void> {
  const updates: Record<string, unknown> = {
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
