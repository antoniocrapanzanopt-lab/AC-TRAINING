// ─── Utility per la modalità Circuito/HIIT ─────────────────────────────────
// Supporta persistenza sia tramite Supabase (note esercizi [CIRCUIT:X:Y]) che
// sincronizzazione real-time localStorage con fuzzy matching e broadcast eventi.

import { WorkoutExercise } from '../types/workout';
import { extractCircuitConfigFromNotes } from './noteCleaner';

export interface CircuitDayConfig {
  isCircuit: boolean;
  totalRounds: number;
  restBetweenRoundsSec: number;
}

export const DEFAULT_CIRCUIT_CONFIG: CircuitDayConfig = {
  isCircuit: false,
  totalRounds: 3,
  restBetweenRoundsSec: 90,
};

export function getExerciseWorkSeconds(exercise?: WorkoutExercise): number {
  if (!exercise) return 40;
  // 1. Controlla prima reps_target poiché è ciò che il coach e atleta vedono e scrivono esplicitamente (es. "40s", "45s", "30 sec")
  const reps = (exercise.reps_target || '').toLowerCase().trim();
  const matchSec = reps.match(/(\d+)\s*(?:sec|s\b|secondi)/i);
  if (matchSec) return parseInt(matchSec[1], 10);
  const matchMin = reps.match(/(\d+)\s*(?:min|m\b|minuti)/i);
  if (matchMin) return parseInt(matchMin[1], 10) * 60;

  // 2. Se non presente in reps_target, usa duration_seconds
  if (exercise.duration_seconds && exercise.duration_seconds > 0) {
    return exercise.duration_seconds;
  }

  const numOnly = parseInt(reps, 10);
  if (!isNaN(numOnly) && numOnly > 0) {
    if (exercise.is_time_based || numOnly >= 15) return numOnly;
  }
  return 40;
}

export function getExerciseRestSeconds(exercise?: WorkoutExercise): number {
  if (!exercise) return 20;
  if (exercise.rest_seconds !== undefined && exercise.rest_seconds !== null && exercise.rest_seconds >= 0) {
    return exercise.rest_seconds;
  }
  return 20;
}

function normalizeDay(dayName: string): string {
  return (dayName || '').trim().toLowerCase();
}

function extractDayIdentifier(dayName: string): string {
  const norm = normalizeDay(dayName);
  // Cerca pattern tipo "giorno 1", "giorno a", "day 1", "day a"
  const m = norm.match(/(?:giorno|day)\s*([a-z0-9]+)/i);
  if (m) return m[1];
  return norm.replace(/[^a-z0-9]/g, '');
}

function isDayMatch(d1: string, d2: string): boolean {
  const n1 = normalizeDay(d1);
  const n2 = normalizeDay(d2);
  if (!n1 || !n2) return false;
  return n1 === n2;
}

function storageKey(workoutId: string, dayName: string): string {
  return `circuit_config_${workoutId || 'global'}_${normalizeDay(dayName)}`;
}

/**
 * Risolve la configurazione circuito per il giorno dato.
 * Priorità:
 * 1. Tag [CIRCUIT:X:Y] presente nelle note degli esercizi del giorno (dal DB Supabase)
 * 2. Chiave esatta in localStorage per lo specifico workoutId e dayName
 */
export function getCircuitConfig(
  workoutId?: string,
  dayName?: string,
  exercises?: Partial<WorkoutExercise>[]
): CircuitDayConfig {
  const day = dayName || 'Giorno 1';

  // 1. Priorità assoluta: Dati dal DB codificati negli esercizi del giorno
  if (exercises && exercises.length > 0) {
    const dayExs = exercises.filter(ex => isDayMatch(ex.day_name || '', day));
    const targetExs = dayExs.length > 0 ? dayExs : exercises;

    for (const ex of targetExs) {
      if (ex.notes) {
        const fromNotes = extractCircuitConfigFromNotes(ex.notes);
        if (fromNotes.isCircuit) {
          return {
            isCircuit: true,
            totalRounds: fromNotes.totalRounds,
            restBetweenRoundsSec: fromNotes.restBetweenRoundsSec,
          };
        }
      }
    }
    // Se gli esercizi del giorno sono caricati e nessuno ha il tag [CIRCUIT:...],
    // il giorno NON è un circuito HIIT.
    return { ...DEFAULT_CIRCUIT_CONFIG };
  }

  // 2. Chiave esatta in localStorage (solo per lo stesso workoutId)
  if (workoutId) {
    try {
      const exact = localStorage.getItem(storageKey(workoutId, day));
      if (exact) {
        const parsed = JSON.parse(exact);
        return { ...DEFAULT_CIRCUIT_CONFIG, ...parsed };
      }
    } catch {
      // ignore
    }
  }

  return { ...DEFAULT_CIRCUIT_CONFIG };
}

/**
 * Salva la configurazione circuito per lo specifico workout e giorno,
 * e notifica i componenti attivi in tempo reale.
 */
export function saveCircuitConfig(workoutId: string | undefined, dayName: string, config: CircuitDayConfig): void {
  try {
    const wId = workoutId || 'global';
    const key = storageKey(wId, dayName);
    if (!config.isCircuit) {
      clearCircuitConfig(workoutId, dayName);
      localStorage.setItem(key, JSON.stringify(config));
    } else {
      localStorage.setItem(key, JSON.stringify(config));
    }
    localStorage.setItem('circuit_config_ping', Date.now().toString());

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('circuit-config-changed', {
        detail: { workoutId: wId, dayName, config }
      }));
    }
  } catch {
    // ignore storage errors
  }
}

export function clearCircuitConfig(workoutId: string | undefined, dayName: string): void {
  try {
    const wId = workoutId || 'global';
    localStorage.removeItem(storageKey(wId, dayName));
    const dayId = extractDayIdentifier(dayName);
    if (dayId) {
      localStorage.removeItem(`circuit_config_${wId}_giorno_${dayId}`);
      localStorage.removeItem(`circuit_config_latest_giorno_${dayId}`);
    }
    localStorage.removeItem('circuit_config_latest');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('circuit-config-changed', {
        detail: { workoutId: wId, dayName, config: DEFAULT_CIRCUIT_CONFIG }
      }));
    }
  } catch {
    // ignore
  }
}
