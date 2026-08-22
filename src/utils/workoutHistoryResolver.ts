/**
 * Risolutore Storico Sessioni Precedenti (Ghost Log / Previous Performance)
 * Recupera l'ultimo allenamento registrato per ciascun esercizio per dare il riferimento all'atleta.
 */

import { supabase } from '../lib/supabase';

export interface PreviousSetData {
  setNumber: number;
  reps: number | null;
  weightKg: number | null;
  rpe?: string | null;
  notes?: string | null;
}

export interface PreviousExerciseHistory {
  exerciseId: string;
  exerciseName: string;
  sessionDate: string;
  formattedDate: string;
  sets: PreviousSetData[];
}

/**
 * Recupera l'ultimo storico di prestazioni registrate per ciascun esercizio dell'atleta
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
      .limit(10);

    if (error || !data) {
      console.warn('Impossibile recuperare lo storico precedente:', error?.message);
      return {};
    }

    const historyMap: Record<string, PreviousExerciseHistory> = {};

    // Scansiona le sessioni dalla più recente alla più vecchia
    for (const session of data) {
      const sessionDate = session.start_time || session.created_at;
      if (!sessionDate) continue;

      const dateObj = new Date(sessionDate);
      const formattedDate = dateObj.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: 'short',
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

      // Raggruppa i log per esercizio
      const exerciseGroupMap = new Map<string, { name: string; sets: PreviousSetData[] }>();

      for (const log of logs) {
        const exId = log.exercise_id || log.workout_exercises?.id || '';
        const exName = log.exercise_name || log.workout_exercises?.name || 'Esercizio';
        const key = (exId || exName.toLowerCase().trim());

        if (!exerciseGroupMap.has(key)) {
          exerciseGroupMap.set(key, { name: exName, sets: [] });
        }

        exerciseGroupMap.get(key)!.sets.push({
          setNumber: log.set_number || 1,
          reps: log.reps_completed,
          weightKg: log.weight_kg,
          notes: log.notes,
        });
      }

      // Inserisce nella historyMap se non è già stato salvato un log più recente
      for (const [key, val] of exerciseGroupMap.entries()) {
        if (!historyMap[key] && val.sets.length > 0) {
          // Ordina i set per setNumber
          val.sets.sort((a, b) => a.setNumber - b.setNumber);

          const historyItem: PreviousExerciseHistory = {
            exerciseId: key,
            exerciseName: val.name,
            sessionDate,
            formattedDate,
            sets: val.sets,
          };

          historyMap[key] = historyItem;
          // Mappa anche per nome normalizzato per fallback
          const nameKey = val.name.toLowerCase().trim();
          if (!historyMap[nameKey]) {
            historyMap[nameKey] = historyItem;
          }
        }
      }
    }

    return historyMap;
  } catch (err) {
    console.error('Eccezione in fetchAthletePreviousExerciseHistory:', err);
    return {};
  }
}
