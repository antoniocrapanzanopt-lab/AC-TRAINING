import { supabase } from '../lib/supabase';
import { InboxEntry, InstagramContent, CoachTask, ContentType, ContentPillar } from '../types/inboxAndContent';

/**
 * Converte un'entry di Inbox AI in un Contenuto Instagram pronto per la Pipeline
 */
export async function convertInboxToContent(
  entry: InboxEntry,
  overrides?: {
    title?: string;
    type?: ContentType;
    pillar?: ContentPillar;
    hook?: string;
    script_body?: string;
    call_to_action?: string;
  }
): Promise<InstagramContent> {
  const opportunity = entry.ai_content_opportunity;

  const contentPayload = {
    coach_id: entry.coach_id,
    origin_inbox_id: entry.id,
    title: overrides?.title || entry.ai_title || 'Nuovo Contenuto da Inbox',
    type: overrides?.type || opportunity?.suggestedType || 'reel',
    pillar: overrides?.pillar || opportunity?.pillar || 'technique_execution',
    status: 'idea' as const,
    hook: overrides?.hook || opportunity?.hook || '',
    script_body: overrides?.script_body || opportunity?.scriptOutline || entry.raw_content,
    call_to_action: overrides?.call_to_action || opportunity?.callToAction || '',
    internal_notes: `Origine Inbox AI. Sintesi: ${entry.ai_summary || ''}`,
  };

  const { data: newContent, error: contentError } = await supabase
    .from('instagram_contents')
    .insert(contentPayload)
    .select()
    .single();

  if (contentError || !newContent) {
    throw new Error(`Errore creazione contenuto: ${contentError?.message}`);
  }

  // Aggiorna lo stato dell'inbox entry a 'converted_content'
  await supabase
    .from('inbox_entries')
    .update({
      status: 'converted_content',
      converted_content_id: newContent.id,
    })
    .eq('id', entry.id);

  return newContent as InstagramContent;
}

/**
 * Converte una task estratta da Inbox AI in un record CoachTask
 */
export async function convertInboxToTask(
  entry: InboxEntry,
  taskTitle: string,
  dueDate?: string
): Promise<CoachTask> {
  const taskPayload = {
    coach_id: entry.coach_id,
    origin_inbox_id: entry.id,
    related_athlete_id: entry.related_athlete_id || null,
    title: taskTitle,
    description: `Generato da Inbox AI: ${entry.ai_summary || entry.raw_content}`,
    priority: entry.ai_priority || 'medium',
    due_date: dueDate || null,
    is_completed: false,
  };

  const { data: newTask, error: taskError } = await supabase
    .from('coach_tasks')
    .insert(taskPayload)
    .select()
    .single();

  if (taskError || !newTask) {
    throw new Error(`Errore creazione task: ${taskError?.message}`);
  }

  await supabase
    .from('inbox_entries')
    .update({
      status: 'converted_task',
      converted_task_id: newTask.id,
    })
    .eq('id', entry.id);

  return newTask as CoachTask;
}

/**
 * Recupera tutte le task operative del coach
 */
export async function getCoachTasks(): Promise<CoachTask[]> {
  const { data, error } = await supabase
    .from('coach_tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Errore recupero coach_tasks:', error);
    return [];
  }

  return (data || []) as CoachTask[];
}

/**
 * Toggle completamento task
 */
export async function toggleTaskCompletion(taskId: string, currentCompleted: boolean): Promise<void> {
  const { error } = await supabase
    .from('coach_tasks')
    .update({
      is_completed: !currentCompleted,
      completed_at: !currentCompleted ? new Date().toISOString() : null,
    })
    .eq('id', taskId);

  if (error) {
    throw new Error(`Errore aggiornamento task: ${error.message}`);
  }
}
