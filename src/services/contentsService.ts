import { supabase } from '../lib/supabase';
import { InstagramContent, ContentStatus } from '../types/inboxAndContent';

// ─── CACHE IN-MEMORY ───────────────────────────────────────────────────────
// Evita round-trip Supabase ripetuti per i JSONB grafici già caricati
const graphicsCache = new Map<string, {
  carousel_data?: InstagramContent['carousel_data'];
  cover_data?: InstagramContent['cover_data'];
  story_data?: InstagramContent['story_data'];
}>();

interface ContentLocalFallback {
  carousel_data?: InstagramContent['carousel_data'];
  cover_data?: InstagramContent['cover_data'];
  story_data?: InstagramContent['story_data'];
  script_body?: string | null;
  caption?: string | null;
  internal_notes?: string | null;
  call_to_action?: string | null;
}

function cacheContentFallback(id: string, updates: Partial<InstagramContent>): void {
  try {
    const key = `ac_content_fallback_${id}`;
    const existingStr = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    const existing: ContentLocalFallback = existingStr ? JSON.parse(existingStr) : {};
    const merged: ContentLocalFallback = {
      ...existing,
      ...(updates.carousel_data !== undefined && { carousel_data: updates.carousel_data }),
      ...(updates.cover_data !== undefined && { cover_data: updates.cover_data }),
      ...(updates.story_data !== undefined && { story_data: updates.story_data }),
      ...(updates.script_body !== undefined && { script_body: updates.script_body }),
      ...(updates.caption !== undefined && { caption: updates.caption }),
      ...(updates.internal_notes !== undefined && { internal_notes: updates.internal_notes }),
      ...(updates.call_to_action !== undefined && { call_to_action: updates.call_to_action }),
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(merged));
    }
    // Aggiorna anche la cache in-memory
    if (updates.carousel_data !== undefined || updates.cover_data !== undefined || updates.story_data !== undefined) {
      graphicsCache.set(id, {
        carousel_data: merged.carousel_data,
        cover_data: merged.cover_data,
        story_data: merged.story_data,
      });
    }
  } catch (e) {
    console.warn('Impossibile salvare fallback locale contenuto:', e);
  }
}

function getContentFallback(id: string): ContentLocalFallback {
  try {
    if (typeof window === 'undefined') return {};
    const key = `ac_content_fallback_${id}`;
    const str = localStorage.getItem(key);
    return str ? (JSON.parse(str) as ContentLocalFallback) : {};
  } catch {
    return {};
  }
}

// Colonne snelle per il listing ultra-veloce (senza caricare megabyte di JSONB grafici)
const FAST_LIST_SELECT = 'id,coach_id,title,type,pillar,status,hook,call_to_action,internal_notes,performance_metrics,origin_inbox_id,created_at,updated_at,scheduled_for,published_at,script_body,caption';

/**
 * Recupera tutti i contenuti Instagram del coach in modo ultra-rapido (0.1s).
 * I dati grafici pesanti (carousel_data/cover_data/story_data) vengono caricati on-demand solo all'apertura dell'editor.
 */
export async function getInstagramContents(): Promise<InstagramContent[]> {
  try {
    let { data, error } = await supabase
      .from('instagram_contents')
      .select(FAST_LIST_SELECT)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Errore select FAST_LIST_SELECT su instagram_contents, tentativo con select(*):', error.message);
      const retry = await supabase
        .from('instagram_contents')
        .select('*')
        .order('created_at', { ascending: false });

      if (retry.error) {
        console.error('Errore recupero instagram_contents:', retry.error);
        return [];
      }
      data = retry.data;
    }

    const rows = (data || []) as InstagramContent[];
    return rows.map((row) => {
      // Se già presenti in cache in-memory o fallback locale, li aggancia senza attendere chiamate di rete
      const cached = graphicsCache.get(row.id);
      const fallback = getContentFallback(row.id);

      return {
        ...row,
        script_body: row.script_body || fallback.script_body || null,
        caption: row.caption || fallback.caption || null,
        internal_notes: row.internal_notes || fallback.internal_notes || null,
        call_to_action: row.call_to_action || fallback.call_to_action || null,
        carousel_data: row.carousel_data ?? cached?.carousel_data ?? fallback.carousel_data ?? null,
        cover_data: row.cover_data ?? cached?.cover_data ?? fallback.cover_data ?? null,
        story_data: row.story_data ?? cached?.story_data ?? fallback.story_data ?? null,
      };
    });
  } catch (err) {
    console.error('Eccezione durante il recupero dei contenuti:', err);
    return [];
  }
}

/**
 * Carica on-demand i dati grafici pesanti (carousel_data, cover_data, story_data)
 * per un singolo contenuto. Usato quando l'utente apre l'editor.
 * Usa la cache in-memory per risposta istantanea al secondo accesso.
 */
export async function getContentGraphics(id: string): Promise<{
  carousel_data: InstagramContent['carousel_data'];
  cover_data: InstagramContent['cover_data'];
  story_data: InstagramContent['story_data'];
}> {
  // Risposta istantanea dalla cache in-memory (0ms)
  if (graphicsCache.has(id)) {
    const cached = graphicsCache.get(id)!;
    return {
      carousel_data: cached.carousel_data ?? null,
      cover_data: cached.cover_data ?? null,
      story_data: cached.story_data ?? null,
    };
  }

  const localFallback = getContentFallback(id);

  try {
    const { data, error } = await supabase
      .from('instagram_contents')
      .select('carousel_data,cover_data,story_data')
      .eq('id', id)
      .single();

    if (error || !data) {
      return {
        carousel_data: localFallback.carousel_data ?? null,
        cover_data: localFallback.cover_data ?? null,
        story_data: localFallback.story_data ?? null,
      };
    }

    const row = data as {
      carousel_data: InstagramContent['carousel_data'];
      cover_data: InstagramContent['cover_data'];
      story_data: InstagramContent['story_data'];
    };
    const result = {
      carousel_data: row.carousel_data ?? localFallback.carousel_data ?? null,
      cover_data: row.cover_data ?? localFallback.cover_data ?? null,
      story_data: row.story_data ?? localFallback.story_data ?? null,
    };
    graphicsCache.set(id, result);
    return result;
  } catch {
    return {
      carousel_data: localFallback.carousel_data ?? null,
      cover_data: localFallback.cover_data ?? null,
      story_data: localFallback.story_data ?? null,
    };
  }
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

  // Salva sempre copia locale di sicurezza per script, didascalia e dati grafici
  if (createdRow.id) {
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
    script_body: createdRow.script_body || fallback.script_body || null,
    caption: createdRow.caption || fallback.caption || null,
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
  // Salva sempre copia locale di sicurezza immediata (script, didascalia e grafiche)
  cacheContentFallback(id, updates);

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
    script_body: updatedRow.script_body || fallback.script_body || null,
    caption: updatedRow.caption || fallback.caption || null,
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
