/**
 * Risolutore Storico Sessioni Precedenti (Ghost Log / Previous Performance)
 * Recupera l'ultimo allenamento registrato per ciascun esercizio e l'intero storico
 * per consentire all'atleta di consultare e applicare i carichi con 1 solo tap.
 */

import { supabase } from '../lib/supabase';

export interface PreviousSetData {
  setNumber: number;
  reps: number | null;
  weightKg: number | null;
  rpe?: string | null;
  notes?: string | null;
}

export interface PastSessionHistoryEntry {
  sessionId: string;
  sessionDate: string;
  formattedDate: string;
  sets: PreviousSetData[];
  notes?: string | null;
}

export interface PreviousExerciseHistory {
  exerciseId: string;
  exerciseName: string;
  sessionDate: string;
  formattedDate: string;
  sets: PreviousSetData[];
  allPastSessions: PastSessionHistoryEntry[];
}

/**
 * Normalizza il nome dell'esercizio per massimizzare il matching storico
 */
function normalizeName(name: string): string {
  return (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Recupera lo storico completo di prestazioni registrate per ciascun esercizio dell'atleta
 */
export async function fetchAthletePreviousExerciseHistory(
  athleteId: string
): Promise<Record<string, PreviousExerciseHistory>> {
  if (!athleteId) return {};

  try {
    const { data, error } = await supabase
      .from('workout_sessions')
      .select(`
        id,
        start_time,
        created_at,
        notes,
        exercise_logs (
          id,
          exercise_id,
          set_number,
          reps_completed,
          weight_kg,
          notes,
          workout_exercises (
            id,
            name
          )
        )
      `)
      .eq('athlete_id', athleteId)
      .order('start_time', { ascending: false })
      .limit(60);

    if (error) {
      console.warn('Impossibile recuperare lo storico precedente da Supabase:', error.message);
    }

    const sessionsData = data || [];

    // Mappa accumulatori per ogni esercizio
    const accumulatorMap = new Map<string, {
      name: string;
      latestDate: string;
      latestFormattedDate: string;
      latestSets: PreviousSetData[];
      pastSessions: PastSessionHistoryEntry[];
    }>();

    // Scansiona le sessioni dalla più recente alla più vecchia
    for (const session of sessionsData) {
      const sessionDate = session.start_time || session.created_at;
      if (!sessionDate) continue;

      const dateObj = new Date(sessionDate);
      const formattedDate = dateObj.toLocaleDateString('it-IT', {
        day: 'numeric',
        month: 'short',
        year: dateObj.getFullYear() !== new Date().getFullYear() ? '2-digit' : undefined,
      });

      const logs = (session.exercise_logs as unknown as Array<{
        exercise_id?: string;
        exercise_name?: string;
        set_number: number;
        reps_completed: number | null;
        weight_kg: number | null;
        notes?: string | null;
        workout_exercises?: { id?: string; name?: string } | null;
      }>) || [];

      // Raggruppa i log di QUESTA sessione per esercizio
      const sessionExMap = new Map<string, { name: string; sets: PreviousSetData[]; notes?: string | null }>();

      for (const log of logs) {
        const exId = log.exercise_id || log.workout_exercises?.id || '';
        const exName = log.exercise_name || log.workout_exercises?.name || 'Esercizio';
        const key = exId || normalizeName(exName);

        if (!sessionExMap.has(key)) {
          sessionExMap.set(key, { name: exName, sets: [], notes: session.notes });
        }

        sessionExMap.get(key)!.sets.push({
          setNumber: log.set_number || 1,
          reps: log.reps_completed,
          weightKg: log.weight_kg,
          notes: log.notes,
        });
      }

      // Aggiorna l'accumulatore
      for (const [key, val] of sessionExMap.entries()) {
        val.sets.sort((a, b) => a.setNumber - b.setNumber);

        const entry: PastSessionHistoryEntry = {
          sessionId: session.id,
          sessionDate,
          formattedDate,
          sets: val.sets,
          notes: val.notes,
        };

        if (!accumulatorMap.has(key)) {
          accumulatorMap.set(key, {
            name: val.name,
            latestDate: sessionDate,
            latestFormattedDate: formattedDate,
            latestSets: val.sets,
            pastSessions: [entry],
          });
        } else {
          accumulatorMap.get(key)!.pastSessions.push(entry);
        }
      }
    }

    // Costruzione dizionario finale con chiavi multiple per matching infallibile (UUID, nome raw, nome normalizzato)
    const historyMap: Record<string, PreviousExerciseHistory> = {};

    for (const [key, acc] of accumulatorMap.entries()) {
      const historyItem: PreviousExerciseHistory = {
        exerciseId: key,
        exerciseName: acc.name,
        sessionDate: acc.latestDate,
        formattedDate: acc.latestFormattedDate,
        sets: acc.latestSets,
        allPastSessions: acc.pastSessions,
      };

      // 1. Per chiave primaria (UUID o nome)
      historyMap[key] = historyItem;

      // 2. Per nome lowercase
      const lowerKey = acc.name.toLowerCase().trim();
      if (!historyMap[lowerKey]) {
        historyMap[lowerKey] = historyItem;
      }

      // 3. Per nome normalizzato
      const normKey = normalizeName(acc.name);
      if (!historyMap[normKey]) {
        historyMap[normKey] = historyItem;
      }
    }

    return historyMap;
  } catch (err) {
    console.error('Eccezione in fetchAthletePreviousExerciseHistory:', err);
    return {};
  }
}
