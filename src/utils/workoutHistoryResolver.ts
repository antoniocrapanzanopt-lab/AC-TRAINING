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
  dayName?: string | null;
  weekNumber?: number | null;
  repsTarget?: string | null;
  setsPrescribed?: number | null;
  exerciseNotes?: string | null;
}

export interface PreviousExerciseHistory {
  exerciseId: string;
  exerciseName: string;
  sessionDate: string;
  formattedDate: string;
  sets: PreviousSetData[];
  allPastSessions: PastSessionHistoryEntry[];
  matchedDayName?: string | null;
  matchedProtocolLabel?: string | null;
}

export interface HistoryMatchContext {
  dayName?: string | null;
  sets?: number | null;
  repsTarget?: string | null;
  notes?: string | null;
}

/**
 * Normalizza il nome dell'esercizio per massimizzare il matching storico
 */
export function normalizeName(name: string): string {
  return (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Rileva se un esercizio o una sessione utilizza un protocollo Ramping / MAV / Top Set
 */
export function isRampingOrMavProtocol(repsTarget?: string | null, notes?: string | null): boolean {
  const combined = `${repsTarget || ''} ${notes || ''}`.toLowerCase();
  return /\b(mav|ramp|ramping|top\s*set|backoff|back-off|back\s*off|salita)\b/i.test(combined);
}

/**
 * Seleziona la sessione passata più pertinente per l'esercizio corrente:
 * - Se l'esercizio è svolto più volte a settimana (es. Panca Giorno 1 MAV vs Panca Giorno 3 Volume),
 *   dà priorità alla sessione con lo stesso Giorno / Protocollo (MAV vs Serie Costanti / Stesse Reps),
 *   evitando di sovrascrivere i carichi di una seduta tecnica/volume con quelli del MAV e viceversa.
 */
export function selectContextualPreviousHistory(
  baseHistory: PreviousExerciseHistory | undefined,
  context?: HistoryMatchContext
): PreviousExerciseHistory | undefined {
  if (!baseHistory) return undefined;
  const sessions = baseHistory.allPastSessions || [];
  if (sessions.length <= 1 || !context) return baseHistory;

  const targetDayNorm = normalizeName(context.dayName || '');
  const targetIsMav = isRampingOrMavProtocol(context.repsTarget, context.notes);
  const targetRepsNorm = (context.repsTarget || '').trim().toLowerCase();

  // Filtra solo sessioni che hanno carichi o ripetizioni effettivamente compilati
  const validSessions = sessions.filter((s) =>
    s.sets.some(
      (set) =>
        (set.weightKg !== null && set.weightKg !== undefined && set.weightKg > 0) ||
        (set.reps !== null && set.reps !== undefined && set.reps > 0)
    )
  );

  const pool = validSessions.length > 0 ? validSessions : sessions;

  // 1. Match esatto per nome del Giorno (es. "Giorno 1" con "Giorno 1", o "Giorno 3" con "Giorno 3")
  if (targetDayNorm) {
    const sameDaySession = pool.find((s) => normalizeName(s.dayName || '') === targetDayNorm);
    if (sameDaySession) {
      const sessIsMav = isRampingOrMavProtocol(sameDaySession.repsTarget, sameDaySession.exerciseNotes);
      return {
        ...baseHistory,
        sessionDate: sameDaySession.sessionDate,
        formattedDate: sameDaySession.formattedDate,
        sets: sameDaySession.sets,
        matchedDayName: sameDaySession.dayName || context.dayName || null,
        matchedProtocolLabel: sessIsMav ? 'MAV / Ramping' : sameDaySession.repsTarget ? `${sameDaySession.setsPrescribed || sameDaySession.sets.length}×${sameDaySession.repsTarget}` : null,
      };
    }
  }

  // 2. Match per stesso protocollo (MAV/Ramping vs Serie regolari) o stesso schema reps_target
  const sameProtocolSession = pool.find((s) => {
    const sessIsMav = isRampingOrMavProtocol(s.repsTarget, s.exerciseNotes);
    if (targetIsMav !== sessIsMav) return false;
    if (targetRepsNorm && (s.repsTarget || '').trim().toLowerCase() === targetRepsNorm) return true;
    return targetIsMav === sessIsMav;
  });

  if (sameProtocolSession) {
    const sessIsMav = isRampingOrMavProtocol(sameProtocolSession.repsTarget, sameProtocolSession.exerciseNotes);
    return {
      ...baseHistory,
      sessionDate: sameProtocolSession.sessionDate,
      formattedDate: sameProtocolSession.formattedDate,
      sets: sameProtocolSession.sets,
      matchedDayName: sameProtocolSession.dayName || null,
      matchedProtocolLabel: sessIsMav ? 'MAV / Ramping' : sameProtocolSession.repsTarget ? `${sameProtocolSession.setsPrescribed || sameProtocolSession.sets.length}×${sameProtocolSession.repsTarget}` : null,
    };
  }

  return baseHistory;
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
        end_time,
        created_at,
        status,
        notes,
        day_name,
        week_number,
        exercise_logs (
          id,
          exercise_id,
          set_number,
          reps_completed,
          weight_kg,
          notes,
          workout_exercises (
            id,
            name,
            day_name,
            week_number,
            sets,
            reps_target,
            notes
          )
        )
      `)
      .eq('athlete_id', athleteId)
      .neq('status', 'skipped')
      .order('start_time', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(150);

    if (error) {
      console.warn('Impossibile recuperare lo storico precedente da Supabase:', error.message);
    }

    const rawSessions = (data || []) as Array<{
      id: string;
      start_time?: string | null;
      end_time?: string | null;
      created_at?: string | null;
      status?: string | null;
      notes?: string | null;
      day_name?: string | null;
      week_number?: number | null;
      exercise_logs?: Array<{
        id?: string;
        exercise_id?: string;
        exercise_name?: string;
        set_number?: number;
        reps_completed?: number | null;
        weight_kg?: number | null;
        notes?: string | null;
        workout_exercises?: {
          id?: string;
          name?: string;
          day_name?: string | null;
          week_number?: number | null;
          sets?: number | null;
          reps_target?: string | null;
          notes?: string | null;
        } | null;
      }> | null;
    }>;

    // 1. Ordina le sessioni rigorosamente in memoria per data reale più recente (end_time || start_time || created_at)
    // Garantisce che la sessione svolta più di recente sia SEMPRE scansionata per prima
    const sessionsData = [...rawSessions].sort((a, b) => {
      const timeA = new Date(a.end_time || a.start_time || a.created_at || 0).getTime();
      const timeB = new Date(b.end_time || b.start_time || b.created_at || 0).getTime();
      return timeB - timeA;
    });

    // Accumulatore per esercizio (chiave primaria = nome normalizzato dell'esercizio)
    // Questo raggruppa le prestazioni dello STESSO esercizio anche se svolto in settimane diverse con UUID differenti
    const accumulatorMap = new Map<string, {
      canonicalName: string;
      associatedIds: Set<string>;
      latestDate: string;
      latestFormattedDate: string;
      latestSets: PreviousSetData[];
      hasValidLoads: boolean;
      pastSessions: PastSessionHistoryEntry[];
    }>();

    // 2. Scansiona le sessioni dalla più recente alla più vecchia
    for (const session of sessionsData) {
      const sessionDate = session.end_time || session.start_time || session.created_at;
      if (!sessionDate) continue;

      const dateObj = new Date(sessionDate);
      const formattedDate = dateObj.toLocaleDateString('it-IT', {
        day: 'numeric',
        month: 'short',
        year: dateObj.getFullYear() !== new Date().getFullYear() ? '2-digit' : undefined,
      });

      const logs = session.exercise_logs || [];
      if (logs.length === 0) continue;

      // Raggruppa i log di QUESTA specifica sessione per esercizio
      const sessionExMap = new Map<string, {
        name: string;
        exerciseIds: Set<string>;
        sets: PreviousSetData[];
        feedback?: string | null;
        dayName?: string | null;
        weekNumber?: number | null;
        repsTarget?: string | null;
        setsPrescribed?: number | null;
        exerciseNotes?: string | null;
      }>();

      for (const log of logs) {
        const exId = (log.exercise_id || log.workout_exercises?.id || '').trim();
        const rawName = (log.workout_exercises?.name || log.exercise_name || '').trim();
        const exName = rawName || 'Esercizio';
        const normKey = normalizeName(exName) || (exId ? `id_${exId}` : 'esercizio_ignoto');

        if (!sessionExMap.has(normKey)) {
          sessionExMap.set(normKey, {
            name: exName,
            exerciseIds: new Set<string>(),
            sets: [],
            feedback: null,
            dayName: log.workout_exercises?.day_name || session.day_name || null,
            weekNumber: log.workout_exercises?.week_number ?? session.week_number ?? null,
            repsTarget: log.workout_exercises?.reps_target || null,
            setsPrescribed: log.workout_exercises?.sets ?? null,
            exerciseNotes: log.workout_exercises?.notes || null,
          });
        }

        const currentEntry = sessionExMap.get(normKey)!;
        if (exId) currentEntry.exerciseIds.add(exId);
        if (rawName && currentEntry.name === 'Esercizio') currentEntry.name = rawName;
        if (!currentEntry.dayName && (log.workout_exercises?.day_name || session.day_name)) {
          currentEntry.dayName = log.workout_exercises?.day_name || session.day_name || null;
        }
        if (!currentEntry.repsTarget && log.workout_exercises?.reps_target) {
          currentEntry.repsTarget = log.workout_exercises.reps_target;
        }
        if (!currentEntry.exerciseNotes && log.workout_exercises?.notes) {
          currentEntry.exerciseNotes = log.workout_exercises.notes;
        }

        // Estrai l'eventuale feedback scritto dall'atleta per questo esercizio (es. "Feedback: ...")
        let logFeedback: string | null = null;
        let extractedRpe: string | null = null;
        if (log.notes) {
          const rpeMatch = log.notes.match(/RPE:\s*([0-9.,]+)/i);
          if (rpeMatch && rpeMatch[1]) {
            extractedRpe = rpeMatch[1].trim();
          }
          const fbMatch = log.notes.match(/Feedback:\s*([^|]+)/i);
          if (fbMatch && fbMatch[1]) {
            logFeedback = fbMatch[1].trim();
          } else if (!log.notes.includes('RPE:') && !log.notes.includes('kg')) {
            logFeedback = log.notes.trim();
          }
        }

        if (logFeedback && !currentEntry.feedback) {
          currentEntry.feedback = logFeedback;
        }

        currentEntry.sets.push({
          setNumber: log.set_number || 1,
          reps: log.reps_completed ?? null,
          weightKg: log.weight_kg ?? null,
          rpe: extractedRpe,
          notes: log.notes || null,
        });
      }

      // 3. Aggiorna l'accumulatore globale con i dati di questa sessione
      for (const [normKey, val] of sessionExMap.entries()) {
        val.sets.sort((a, b) => a.setNumber - b.setNumber);

        const displayNote = val.feedback || session.notes || null;
        const entry: PastSessionHistoryEntry = {
          sessionId: session.id,
          sessionDate,
          formattedDate,
          sets: val.sets,
          notes: displayNote,
          dayName: val.dayName || session.day_name || null,
          weekNumber: val.weekNumber ?? session.week_number ?? null,
          repsTarget: val.repsTarget || null,
          setsPrescribed: val.setsPrescribed ?? val.sets.length,
          exerciseNotes: val.exerciseNotes || null,
        };

        // Verifica se questa sessione contiene carichi o ripetizioni reali inseriti
        const hasRealLoadsInSession = val.sets.some(
          (s) => (s.weightKg !== null && s.weightKg !== undefined && s.weightKg > 0) ||
                 (s.reps !== null && s.reps !== undefined && s.reps > 0)
        );

        if (!accumulatorMap.has(normKey)) {
          accumulatorMap.set(normKey, {
            canonicalName: val.name,
            associatedIds: new Set<string>(val.exerciseIds),
            latestDate: sessionDate,
            latestFormattedDate: formattedDate,
            latestSets: val.sets,
            hasValidLoads: hasRealLoadsInSession,
            pastSessions: [entry],
          });
        } else {
          const acc = accumulatorMap.get(normKey)!;
          // Unisci tutti gli ID esercizio associati storicamente
          val.exerciseIds.forEach((id) => acc.associatedIds.add(id));
          acc.pastSessions.push(entry);

          // Se l'accumulatore non aveva ancora carichi validi (ad es. la sessione più recente era vuota)
          // ma questa sessione ha carichi reali registrati, aggiorna latestSets con questi carichi reali
          if (!acc.hasValidLoads && hasRealLoadsInSession) {
            acc.latestDate = sessionDate;
            acc.latestFormattedDate = formattedDate;
            acc.latestSets = val.sets;
            acc.hasValidLoads = true;
          }
        }
      }
    }

    // 4. Costruzione dizionario finale con chiavi multiple (UUID, nome raw, lowercase, normalizzato)
    const historyMap: Record<string, PreviousExerciseHistory> = {};

    for (const [normKey, acc] of accumulatorMap.entries()) {
      const primaryExerciseId = acc.associatedIds.values().next().value || normKey;

      const historyItem: PreviousExerciseHistory = {
        exerciseId: primaryExerciseId,
        exerciseName: acc.canonicalName,
        sessionDate: acc.latestDate,
        formattedDate: acc.latestFormattedDate,
        sets: acc.latestSets,
        allPastSessions: acc.pastSessions,
      };

      // A. Mappa su TUTTI gli UUID associati a questo esercizio nelle varie settimane o template
      for (const exId of acc.associatedIds) {
        historyMap[exId] = historyItem;
      }

      // B. Mappa su chiave normalizzata infallibile
      historyMap[normKey] = historyItem;

      // C. Mappa su nome lowercase
      const lowerKey = acc.canonicalName.toLowerCase().trim();
      historyMap[lowerKey] = historyItem;

      // D. Mappa su nome originale
      historyMap[acc.canonicalName] = historyItem;
    }

    return historyMap;
  } catch (err) {
    console.error('Eccezione in fetchAthletePreviousExerciseHistory:', err);
    return {};
  }
}
