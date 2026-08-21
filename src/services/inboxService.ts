import { supabase } from '../lib/supabase';
import { InboxEntry, InboxStatus } from '../types/inboxAndContent';
import { processInboxContentWithAI } from '../lib/ai/inboxProcessor';

/**
 * Recupera tutte le entries della Inbox per il coach autenticato
 */
export async function getInboxEntries(): Promise<InboxEntry[]> {
  const { data, error } = await supabase
    .from('inbox_entries')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Errore recupero inbox_entries:', error);
    throw new Error(`Impossibile caricare la Inbox: ${error.message}`);
  }

  return (data || []) as InboxEntry[];
}

/**
 * Crea una nuova voce di pensiero grezzo nella Inbox e avvia facoltativamente l'elaborazione AI
 */
export async function createAndProcessInboxEntry(
  rawContent: string,
  autoProcessWithAI: boolean = true
): Promise<InboxEntry> {
  const { data: userData } = await supabase.auth.getUser();
  const coachId = userData?.user?.id;

  if (!coachId) {
    throw new Error('Utente non autenticato.');
  }

  // 1. Inserimento record iniziale in stato 'raw' o 'processing'
  const { data: newEntry, error: insertError } = await supabase
    .from('inbox_entries')
    .insert({
      coach_id: coachId,
      raw_content: rawContent.trim(),
      status: autoProcessWithAI ? 'processing' : 'raw',
    })
    .select()
    .single();

  if (insertError || !newEntry) {
    throw new Error(`Errore creazione entry: ${insertError?.message}`);
  }

  if (!autoProcessWithAI) {
    return newEntry as InboxEntry;
  }

  // 2. Elaborazione con Gemini AI
  try {
    const aiResult = await processInboxContentWithAI(rawContent, newEntry.id);

    const { data: updatedEntry, error: updateError } = await supabase
      .from('inbox_entries')
      .update({
        ai_title: aiResult.title,
        ai_summary: aiResult.summary,
        ai_category: aiResult.category,
        ai_priority: aiResult.priority,
        ai_suggested_tasks: aiResult.tasks,
        ai_content_opportunity: aiResult.contentOpportunity,
        ai_next_step: aiResult.nextStep,
        status: 'processed',
        processed_at: new Date().toISOString(),
      })
      .eq('id', newEntry.id)
      .select()
      .single();

    if (updateError || !updatedEntry) {
      return newEntry as InboxEntry;
    }

    return updatedEntry as InboxEntry;
  } catch (err) {
    console.error('Elaborazione AI fallita, entry salvata come grezza:', err);
    // Ripristina lo stato a 'raw' se l'AI fallisce
    await supabase
      .from('inbox_entries')
      .update({ status: 'raw' })
      .eq('id', newEntry.id);
    return newEntry as InboxEntry;
  }
}

/**
 * Elabora manualmente una entry grezza esistente
 */
export async function reprocessInboxEntry(entry: InboxEntry): Promise<InboxEntry> {
  await supabase
    .from('inbox_entries')
    .update({ status: 'processing' })
    .eq('id', entry.id);

  const aiResult = await processInboxContentWithAI(entry.raw_content, entry.id);

  const { data: updatedEntry, error } = await supabase
    .from('inbox_entries')
    .update({
      ai_title: aiResult.title,
      ai_summary: aiResult.summary,
      ai_category: aiResult.category,
      ai_priority: aiResult.priority,
      ai_suggested_tasks: aiResult.tasks,
      ai_content_opportunity: aiResult.contentOpportunity,
      ai_next_step: aiResult.nextStep,
      status: 'processed',
      processed_at: new Date().toISOString(),
    })
    .eq('id', entry.id)
    .select()
    .single();

  if (error || !updatedEntry) {
    throw new Error(`Errore aggiornamento entry: ${error?.message}`);
  }

  return updatedEntry as InboxEntry;
}

/**
 * Aggiorna lo stato di una entry (es. 'archived')
 */
export async function updateInboxEntryStatus(
  id: string,
  status: InboxStatus
): Promise<void> {
  const { error } = await supabase
    .from('inbox_entries')
    .update({ status })
    .eq('id', id);

  if (error) {
    throw new Error(`Errore aggiornamento stato: ${error.message}`);
  }
}

/**
 * Elimina una entry dalla Inbox
 */
export async function deleteInboxEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from('inbox_entries')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Errore eliminazione entry: ${error.message}`);
  }
}

/**
 * Collega un atleta a una entry
 */
export async function linkAthleteToInboxEntry(
  entryId: string,
  athleteId: string | null
): Promise<void> {
  const { error } = await supabase
    .from('inbox_entries')
    .update({ related_athlete_id: athleteId })
    .eq('id', entryId);

  if (error) {
    throw new Error(`Errore associazione atleta: ${error.message}`);
  }
}
