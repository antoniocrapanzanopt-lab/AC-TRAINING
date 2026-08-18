import { WorkoutTemplate, WorkoutExercise } from '../../types/workout';
import { supabase } from '../supabase';

export type SyncStatus = 'synced' | 'local_saved' | 'pending_sync' | 'offline_completed';

export interface ActiveWorkoutDraft {
  draftId: string;
  sessionId: string | null;
  athleteId: string;
  workout: WorkoutTemplate;
  exercises: WorkoutExercise[];
  targetAthleteId?: string;
  startTimestamp: number;
  lastSavedTimestamp: number;
  elapsedSeconds: number;
  activeExerciseIdx: number;
  logs: Record<string, { reps: string; weight: string; rpe: string }[]>;
  completedSets: Record<string, boolean[]>;
  exerciseNotes: Record<string, string>;
  difficulty?: number;
  jointPain?: number;
  pump?: number;
  jointPainNotes?: string;
  syncStatus: SyncStatus;
}

export interface PendingCompletedWorkout {
  id: string;
  sessionId: string | null;
  athleteId: string;
  athleteName: string;
  workoutId: string;
  workoutTitle: string;
  weekNumber: number;
  dayName: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  rpe: number;
  notes: string;
  difficulty: number;
  jointPain: number;
  pump: number;
  jointPainNotes: string;
  logsToSave: {
    session_id?: string | null;
    exercise_id: string;
    exercise_name?: string;
    set_number: number;
    reps_completed: number | null;
    weight_kg: number | null;
    notes: string | null;
  }[];
  createdAt: number;
}

const ACTIVE_DRAFT_KEY_PREFIX = 'builder_active_workout_draft_';
const PENDING_QUEUE_KEY = 'builder_pending_workout_sync_queue';

/**
 * Salva localmente la bozza dell'allenamento in corso.
 */
export const saveActiveWorkoutDraft = (draft: ActiveWorkoutDraft): void => {
  try {
    const key = `${ACTIVE_DRAFT_KEY_PREFIX}${draft.athleteId}`;
    const payload: ActiveWorkoutDraft = {
      ...draft,
      lastSavedTimestamp: Date.now(),
      syncStatus: navigator.onLine ? 'local_saved' : 'pending_sync',
    };
    localStorage.setItem(key, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent('athlete_draft_updated', { detail: { athleteId: draft.athleteId } }));
  } catch (err) {
    console.warn('[OfflineStorage] Errore salvataggio bozza locale:', err);
  }
};

/**
 * Recupera l'eventuale bozza dell'allenamento in corso per l'atleta.
 */
export const getActiveWorkoutDraft = (athleteId: string): ActiveWorkoutDraft | null => {
  try {
    const key = `${ACTIVE_DRAFT_KEY_PREFIX}${athleteId}`;
    const item = localStorage.getItem(key);
    if (!item) return null;
    const parsed: ActiveWorkoutDraft = JSON.parse(item);

    // Se la bozza è più vecchia di 24 ore, la consideriamo scaduta
    const maxAgeMs = 24 * 60 * 60 * 1000;
    if (Date.now() - parsed.lastSavedTimestamp > maxAgeMs) {
      clearActiveWorkoutDraft(athleteId);
      return null;
    }

    return parsed;
  } catch (err) {
    console.warn('[OfflineStorage] Errore lettura bozza locale:', err);
    return null;
  }
};

/**
 * Cancella la bozza attiva una volta completata la sessione.
 */
export const clearActiveWorkoutDraft = (athleteId: string): void => {
  try {
    const key = `${ACTIVE_DRAFT_KEY_PREFIX}${athleteId}`;
    localStorage.removeItem(key);
    window.dispatchEvent(new CustomEvent('athlete_draft_updated', { detail: { athleteId } }));
  } catch (err) {
    console.warn('[OfflineStorage] Errore cancellazione bozza locale:', err);
  }
};

/**
 * Aggiunge un allenamento completato offline alla coda di sincronizzazione.
 */
export const queueCompletedWorkoutForSync = (item: PendingCompletedWorkout): void => {
  try {
    const raw = localStorage.getItem(PENDING_QUEUE_KEY);
    const list: PendingCompletedWorkout[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter((p) => p.id !== item.id);
    filtered.push(item);
    localStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new Event('pending_sync_queue_updated'));
  } catch (err) {
    console.warn('[OfflineStorage] Errore accodamento sync:', err);
  }
};

/**
 * Legge la coda delle sessioni offline in attesa di sincronizzazione.
 */
export const getPendingSyncQueue = (): PendingCompletedWorkout[] => {
  try {
    const raw = localStorage.getItem(PENDING_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

/**
 * Sincronizza tutte le sessioni offline pendenti con Supabase quando torna internet.
 */
export const syncPendingWorkoutsWithServer = async (): Promise<{ syncedCount: number; errorsCount: number }> => {
  if (!navigator.onLine) {
    return { syncedCount: 0, errorsCount: 0 };
  }

  const queue = getPendingSyncQueue();
  if (queue.length === 0) {
    return { syncedCount: 0, errorsCount: 0 };
  }

  let syncedCount = 0;
  let errorsCount = 0;
  const remainingQueue: PendingCompletedWorkout[] = [];

  for (const item of queue) {
    try {
      let targetSessionId = item.sessionId;

      // Se non esiste ancora un sessionId su DB, creiamo la sessione
      if (!targetSessionId) {
        const { data: newSess, error: createError } = await supabase
          .from('workout_sessions')
          .insert({
            athlete_id: item.athleteId,
            workout_id: item.workoutId,
            start_time: item.startTime,
            end_time: item.endTime,
            rpe: item.rpe,
            notes: item.notes,
          })
          .select('id')
          .single();

        if (createError) throw createError;
        targetSessionId = newSess?.id;
      } else {
        // Altrimenti chiudiamo la sessione esistente
        const { error: updateError } = await supabase
          .from('workout_sessions')
          .update({
            end_time: item.endTime,
            rpe: item.rpe,
            notes: item.notes,
          })
          .eq('id', targetSessionId);

        if (updateError) throw updateError;
      }

      // Inseriamo i logs esercizi
      if (item.logsToSave && item.logsToSave.length > 0 && targetSessionId) {
        const logsWithSessionId = item.logsToSave.map((l) => ({
          session_id: targetSessionId,
          exercise_id: l.exercise_id,
          set_number: l.set_number,
          reps_completed: l.reps_completed,
          weight_kg: l.weight_kg,
          notes: l.notes,
        }));

        const { error: logsError } = await supabase.from('exercise_logs').insert(logsWithSessionId);
        if (logsError) throw logsError;
      }

      // Sincronizzazione alert questionario per il Copilot se presenti
      if (item.jointPain >= 3 || item.jointPainNotes || item.difficulty >= 4) {
        try {
          const existingAlerts = JSON.parse(localStorage.getItem('builder_copilot_critical_notes') || '[]');
          const isHighSeverity = item.jointPain >= 4 || /dolore|pizzico|infortunio|male|strappo/i.test(item.jointPainNotes);
          const questionnaireSummary = `Questionario Fine Workout — Fatica: ${item.difficulty}/5 | Dolori Articolari: ${item.jointPain}/5 | Pump: ${item.pump}/5${item.jointPainNotes ? ` | Dettagli: "${item.jointPainNotes}"` : ''}`;

          const alertObj = {
            id: `cn-q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            athleteId: item.athleteId,
            athleteName: item.athleteName,
            workoutTitle: item.workoutTitle,
            weekNumber: item.weekNumber || 1,
            dayName: item.dayName || 'Giorno A',
            exerciseName: 'Questionario Fine Workout',
            noteText: questionnaireSummary,
            severity: isHighSeverity ? 'high' : 'medium',
            date: 'Oggi',
          };

          localStorage.setItem('builder_copilot_critical_notes', JSON.stringify([alertObj, ...existingAlerts]));
          window.dispatchEvent(new Event('copilot_notes_updated'));
        } catch (_) {}
      }

      syncedCount++;
    } catch (err) {
      console.error(`[OfflineStorage] Errore sync sessione ${item.id}:`, err);
      errorsCount++;
      remainingQueue.push(item);
    }
  }

  // Aggiorna la coda salvata
  localStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(remainingQueue));
  window.dispatchEvent(new Event('pending_sync_queue_updated'));

  return { syncedCount, errorsCount };
};
