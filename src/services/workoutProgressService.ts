import { supabase } from '../lib/supabase';

export interface GetAthleteWorkoutProgressParams {
  athleteId: string;
  authUserId?: string | null;
  assignedWorkoutId: string;
  parentTemplateId?: string | null;
  relatedWorkoutIds?: string[];
  totalWeeks?: number;
  workoutTitle?: string;
}

export interface AthleteWorkoutProgressResult {
  athleteId: string;
  assignedWorkoutId: string;
  parentTemplateId: string | null;
  relatedWorkoutIds: string[];
  hasStarted: boolean;
  completedSessionsCount: number;
  totalPlannedSessions: number;
  progressPercent: number;
  currentWeek: number;
  currentDay: string;
  lastCompletedWeek: number | null;
  lastCompletedDay: string | null;
  lastCompletedSessionLabel: string;
  lastSessionDateIso: string | null;
  lastSessionDateFormatted: string | null;
  lastSessionRpe: number | null;
  nextSessionLabel: string;
  nextSessionWeek: number | null;
  nextSessionDay: string | null;
  completedMap: Record<string, boolean>;
  uniqueCompletedKeys: string[];
  orderedDays: string[];
  isCompletedBlock: boolean;
  status: 'loading' | 'success' | 'error';
  errorMessage?: string;
  needsRealignment?: boolean;
  lineageStatus: string;
}

interface RawSessionRow {
  id: string;
  athlete_id: string;
  workout_id?: string | null;
  week_number?: number | null;
  day_name?: string | null;
  status?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  completed_at?: string | null;
  rpe?: number | null;
  notes?: string | null;
}

interface RawExerciseRow {
  workout_id: string;
  week_number?: number | null;
  day_name?: string | null;
  order_index?: number | null;
}

/**
 * Normalizza il nome del giorno per confronti sicuri ed uniformi.
 * Gestisce trim, minuscolo e pulizia spazi.
 */
export function normalizeDayName(dayName: string | null | undefined): string {
  if (!dayName) return '';
  return dayName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Regola uniforme per stabilire se una sessione è completata.
 */
export function isCompletedSession(session: {
  status?: string | null;
  end_time?: string | null;
  completed_at?: string | null;
  start_time?: string | null;
}): boolean {
  if (!session) return false;
  const status = (session.status || '').toLowerCase().trim();
  if (status === 'abandoned' || status === 'skipped') return false;
  if (status === 'completed') return true;
  if (session.end_time != null || session.completed_at != null) return true;
  return false;
}

/**
 * Risolve la lista sicura di ID programma correlati per lineage/versione.
 */
export function resolveRelatedWorkoutIds(params: {
  assignedWorkoutId: string;
  parentTemplateId?: string | null;
  relatedWorkoutIds?: string[];
}): string[] {
  const ids = new Set<string>();
  if (params.assignedWorkoutId && typeof params.assignedWorkoutId === 'string') {
    ids.add(params.assignedWorkoutId.trim());
  }
  if (params.parentTemplateId && typeof params.parentTemplateId === 'string') {
    ids.add(params.parentTemplateId.trim());
  }
  if (Array.isArray(params.relatedWorkoutIds)) {
    params.relatedWorkoutIds.forEach((id) => {
      if (id && typeof id === 'string') {
        ids.add(id.trim());
      }
    });
  }
  return Array.from(ids);
}

/**
 * Calcola la settimana attiva corrente in base all'avanzamento reale dell'atleta.
 * Evita di bloccare l'atleta a Settimana 1 se ha saltato un giorno o ha proseguito.
 */
export function calculateCurrentActiveWeek(params: {
  totalWeeks: number;
  days: string[];
  completedMap: Record<string, boolean>;
}): number {
  const { totalWeeks, days, completedMap } = params;
  if (!days || days.length === 0 || totalWeeks <= 1) return 1;

  const norm = (str: string) => (str || '').trim().toLowerCase().replace(/\s+/g, ' ');

  // Trova la prima settimana non completamente conclusa (naturale percorso sequenziale)
  for (let w = 1; w <= totalWeeks; w++) {
    const isWeekFullyDone = days.every(
      (d) => completedMap[`${w}-${d}`] || completedMap[`${w}-${norm(d)}`]
    );
    if (!isWeekFullyDone) {
      return w;
    }
  }

  return totalWeeks;
}

/**
 * Funzione unificata ufficiale per il calcolo dell'avanzamento reale di un atleta.
 * Utilizzata dall'App Atleta, dal Coach Editor (WorkoutBuilderModal),
 * dalla sezione Schede di Allenamento e da Performance & Copilot.
 */
export async function getAthleteWorkoutProgress(
  params: GetAthleteWorkoutProgressParams
): Promise<AthleteWorkoutProgressResult> {
  const {
    athleteId,
    authUserId,
    assignedWorkoutId,
    parentTemplateId = null,
    relatedWorkoutIds = [],
    totalWeeks = 4,
    workoutTitle = 'Scheda Assegnata',
  } = params;

  const safeTotalWeeks = Math.max(1, Number(totalWeeks) || 1);

  const resolvedWorkoutIds = resolveRelatedWorkoutIds({
    assignedWorkoutId,
    parentTemplateId,
    relatedWorkoutIds,
  });

  const athleteIdsToCheck = [athleteId];
  if (authUserId && !athleteIdsToCheck.includes(authUserId)) {
    athleteIdsToCheck.push(authUserId);
  }

  // Risultato di default in caso di assenza parametri validi
  const defaultResult: AthleteWorkoutProgressResult = {
    athleteId,
    assignedWorkoutId,
    parentTemplateId,
    relatedWorkoutIds: resolvedWorkoutIds,
    hasStarted: false,
    completedSessionsCount: 0,
    totalPlannedSessions: Math.max(1, safeTotalWeeks * 3),
    progressPercent: 0,
    currentWeek: 1,
    currentDay: 'Giorno A',
    lastCompletedWeek: null,
    lastCompletedDay: null,
    lastCompletedSessionLabel: 'Nessuna',
    lastSessionDateIso: null,
    lastSessionDateFormatted: null,
    lastSessionRpe: null,
    nextSessionLabel: 'Settimana 1 · Giorno A',
    nextSessionWeek: 1,
    nextSessionDay: 'Giorno A',
    completedMap: {},
    uniqueCompletedKeys: [],
    orderedDays: [],
    isCompletedBlock: false,
    status: 'loading',
    lineageStatus: parentTemplateId ? 'child_copy_with_parent_template' : 'direct_workout',
  };

  if (resolvedWorkoutIds.length === 0 || athleteIdsToCheck.length === 0) {
    return {
      ...defaultResult,
      status: 'success',
      nextSessionLabel: 'Nessuna scheda attiva',
    };
  }

  try {
    // 1. Query parallela su workout_exercises e workout_sessions
    const [exercisesRes, sessionsRes] = await Promise.all([
      supabase
        .from('workout_exercises')
        .select('workout_id, week_number, day_name, order_index')
        .in('workout_id', resolvedWorkoutIds)
        .order('week_number', { ascending: true })
        .order('order_index', { ascending: true }),
      supabase
        .from('workout_sessions')
        .select('id, athlete_id, workout_id, week_number, day_name, status, start_time, end_time, rpe, notes')
        .in('athlete_id', athleteIdsToCheck)
        .in('workout_id', resolvedWorkoutIds)
        .order('start_time', { ascending: false }),
    ]);

    if (exercisesRes.error) {
      throw new Error(`Errore caricamento esercizi scheda: ${exercisesRes.error.message}`);
    }
    if (sessionsRes.error) {
      throw new Error(`Errore caricamento sessioni atleta: ${sessionsRes.error.message}`);
    }

    const exercises = (exercisesRes.data || []) as RawExerciseRow[];
    const sessions = (sessionsRes.data || []) as RawSessionRow[];

    // 2. Calcolo struttura reale dei giorni della scheda
    // Preferisci gli esercizi collegati all'assignedWorkoutId se presenti, altrimenti parentTemplateId
    const assignedExercises = exercises.filter((e) => e.workout_id === assignedWorkoutId);
    const parentExercises = parentTemplateId
      ? exercises.filter((e) => e.workout_id === parentTemplateId)
      : [];
    const targetExercises = assignedExercises.length > 0 ? assignedExercises : parentExercises;

    const orderedDays: string[] = [];
    targetExercises.forEach((ex) => {
      const d = (ex.day_name || '').trim();
      if (d && !orderedDays.includes(d)) {
        orderedDays.push(d);
      }
    });

    // Se per qualche motivo targetExercises è vuoto, cerca in tutti i resolvedWorkoutIds
    if (orderedDays.length === 0) {
      exercises.forEach((ex) => {
        const d = (ex.day_name || '').trim();
        if (d && !orderedDays.includes(d)) {
          orderedDays.push(d);
        }
      });
    }

    // Calcolo plannedSessions reale (es. 3 settimane × 3 giorni = 9)
    // IMPORTANTE: non usare distinctWeekDayPairs.size perché non tutte le settimane
    // potrebbero avere righe proprie in workout_exercises (propagazione parziale).
    // La fonte di verità è: total_weeks (metadato affidabile) × giorni unici trovati in qualsiasi settimana.
    let plannedSessions = 0;
    if (orderedDays.length > 0) {
      plannedSessions = Math.max(1, safeTotalWeeks * orderedDays.length);
    } else {
      plannedSessions = Math.max(1, safeTotalWeeks * 3);
    }

    // 3. Deduplica sessioni completate per chiave logica `${week_number}-${normalizedDayName}`
    const rawSessionsCount = sessions.length;
    let rawCompletedCount = 0;
    const completedMap: Record<string, boolean> = {};
    const sessionDetailsByKey = new Map<string, RawSessionRow>();

    // Ordiniamo le sessioni dal più recente al più vecchio per prendere l'ultima per ogni chiave
    const sortedSessions = [...sessions].sort((a, b) => {
      const timeA = new Date(a.end_time || a.start_time || 0).getTime();
      const timeB = new Date(b.end_time || b.start_time || 0).getTime();
      return timeB - timeA;
    });

    for (const s of sortedSessions) {
      if (!isCompletedSession(s)) continue;
      rawCompletedCount++;

      const w = Number(s.week_number);
      const rawDay = (s.day_name || '').trim();
      const normDay = normalizeDayName(rawDay);

      if (w > 0 && normDay) {
        const key = `${w}-${normDay}`;
        if (!sessionDetailsByKey.has(key)) {
          sessionDetailsByKey.set(key, s);
          completedMap[key] = true;
          // Conserva anche con il nome originale per compatibilità
          completedMap[`${w}-${rawDay}`] = true;
        }
      }
      // REGOLA: le sessioni senza week_number o day_name (phantom) NON contano come avanzamento.
      // Non usare fallback `session-${s.id}` nel conteggio avanzamento.
    }

    const uniqueCompletedKeys = Array.from(sessionDetailsByKey.keys());
    // Solo le chiavi con week+day validi contano come avanzamento reale
    const legitimateCompletedKeys = uniqueCompletedKeys.filter(
      (k) => !k.startsWith('session-')
    );
    const completedCount = legitimateCompletedKeys.length;

    // REGOLA: non mostrare 100% se completedCount < plannedSessions
    const progressPercent: number = (() => {
      if (plannedSessions <= 0) return 0;
      const raw = Math.round((completedCount / plannedSessions) * 100);
      if (completedCount < plannedSessions) return Math.min(99, raw);
      if (completedCount > plannedSessions) return 100; // anomalia
      return 100; // completedCount === plannedSessions
    })();

    // 4. Ultima sessione completata
    const completedList = Array.from(sessionDetailsByKey.values()).sort((a, b) => {
      const timeA = new Date(a.end_time || a.start_time || 0).getTime();
      const timeB = new Date(b.end_time || b.start_time || 0).getTime();
      return timeB - timeA;
    });

    const lastSession = completedList[0] || null;
    let lastCompletedWeek: number | null = null;
    let lastCompletedDay: string | null = null;
    let lastCompletedSessionLabel = 'Nessuna';
    let lastSessionDateIso: string | null = null;
    let lastSessionDateFormatted: string | null = null;
    let lastSessionRpe: number | null = null;

    if (lastSession) {
      lastCompletedWeek = lastSession.week_number ? Number(lastSession.week_number) : null;
      lastCompletedDay = lastSession.day_name || null;
      if (lastCompletedWeek && lastCompletedDay) {
        lastCompletedSessionLabel = `Settimana ${lastCompletedWeek} · ${lastCompletedDay}`;
      } else if (lastCompletedWeek) {
        lastCompletedSessionLabel = `Settimana ${lastCompletedWeek}`;
      } else {
        lastCompletedSessionLabel = 'Sessione completata';
      }

      lastSessionDateIso = lastSession.end_time || lastSession.start_time || null;
      if (lastSessionDateIso) {
        const d = new Date(lastSessionDateIso);
        lastSessionDateFormatted = d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
      }
      lastSessionRpe = lastSession.rpe || null;
    }

    // 5. Calcolo prossima sessione prevista
    let nextSessionLabel = 'Non definita';
    let nextSessionWeek: number | null = null;
    let nextSessionDay: string | null = null;
    let currentWeek = 1;
    let currentDay = orderedDays[0] || 'Giorno A';
    let foundNext = false;

    if (orderedDays.length > 0 && safeTotalWeeks > 0) {
      for (let w = 1; w <= safeTotalWeeks; w++) {
        for (const d of orderedDays) {
          const normD = normalizeDayName(d);
          const key = `${w}-${normD}`;
          if (!sessionDetailsByKey.has(key)) {
            nextSessionWeek = w;
            nextSessionDay = d;
            nextSessionLabel = `Settimana ${w} · ${d}`;
            currentWeek = w;
            currentDay = d;
            foundNext = true;
            break;
          }
        }
        if (foundNext) break;
      }

      if (!foundNext) {
        if (completedCount >= plannedSessions && plannedSessions > 0) {
          nextSessionLabel = 'Programma completato';
          currentWeek = safeTotalWeeks;
          currentDay = orderedDays[orderedDays.length - 1] || 'Fine';
        } else {
          currentWeek = safeTotalWeeks;
          currentDay = orderedDays[orderedDays.length - 1] || 'Giorno A';
          nextSessionLabel = `Settimana ${safeTotalWeeks} · ${currentDay}`;
        }
      }
    } else {
      nextSessionLabel = `Settimana 1 · Giorno A`;
    }

    // Allinea currentWeek all'effettiva settimana attiva calcolata
    currentWeek = calculateCurrentActiveWeek({
      totalWeeks: safeTotalWeeks,
      days: orderedDays,
      completedMap,
    });

    // Controllo disallineamento se l'atleta ha registrato sessioni con workout_id non presente in resolvedWorkoutIds
    const needsRealignment = Boolean(
      parentTemplateId &&
        sessions.some((s) => s.workout_id === parentTemplateId) &&
        !sessions.some((s) => s.workout_id === assignedWorkoutId)
    );

    const result: AthleteWorkoutProgressResult = {
      athleteId,
      assignedWorkoutId,
      parentTemplateId,
      relatedWorkoutIds: resolvedWorkoutIds,
      hasStarted: completedCount > 0,
      completedSessionsCount: completedCount,
      totalPlannedSessions: plannedSessions,
      progressPercent,
      currentWeek,
      currentDay,
      lastCompletedWeek,
      lastCompletedDay,
      lastCompletedSessionLabel,
      lastSessionDateIso,
      lastSessionDateFormatted,
      lastSessionRpe,
      nextSessionLabel,
      nextSessionWeek,
      nextSessionDay,
      completedMap,
      uniqueCompletedKeys,
      orderedDays,
      isCompletedBlock: completedCount >= plannedSessions && plannedSessions > 0 && completedCount > 0,
      status: 'success',
      needsRealignment,
      lineageStatus: parentTemplateId ? 'child_copy_with_parent_template' : 'direct_workout',
    };

    // 6. Log tecnici strutturati (Req 16)
    console.log('[workoutProgressService] Technical Log:', {
      athlete_id: athleteId,
      assigned_workout_id: assignedWorkoutId,
      workout_title: workoutTitle,
      parent_template_id: parentTemplateId,
      related_workout_ids: resolvedWorkoutIds,
      root_template_id: parentTemplateId || assignedWorkoutId,
      session_log_count: rawSessionsCount,
      completed_session_count_raw: rawCompletedCount,
      completed_session_count_unique: completedCount,
      completed_session_keys: uniqueCompletedKeys,
      planned_sessions: plannedSessions,
      progress_percentage: progressPercent,
      last_completed_session: lastCompletedSessionLabel,
      next_session: nextSessionLabel,
      data_source: 'supabase:workout_sessions+workout_exercises',
      query_error: null,
      lineage_status: result.lineageStatus,
    });

    return result;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Errore sconosciuto nel calcolo avanzamento';
    console.error('[workoutProgressService] Errore critico:', errorMsg, {
      athlete_id: athleteId,
      assigned_workout_id: assignedWorkoutId,
      parent_template_id: parentTemplateId,
      query_error: errorMsg,
    });

    return {
      ...defaultResult,
      status: 'error',
      errorMessage: errorMsg,
      nextSessionLabel: 'Impossibile verificare l’avanzamento',
    };
  }
}
