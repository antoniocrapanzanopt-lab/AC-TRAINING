import { supabase } from '../lib/supabase';

export interface AdherencePillar {
  name: string;
  weightPercent: number;
  score: number; // 0 - 100
  label: string;
  detail: string;
}

export interface AdherenceScoreResult {
  athleteId: string;
  score: number; // 0 - 100
  level: 'optimal' | 'good' | 'attention' | 'critical';
  label: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  message: string;
  periodLabel: string; // 'Ultimi 28 giorni'
  pillars: {
    workouts: AdherencePillar;
    sets: AdherencePillar;
    feedback: AdherencePillar;
    checkins: AdherencePillar;
  };
  stats: {
    totalWorkoutsPrescribed: number;
    totalWorkoutsCompleted: number;
    totalWorkoutsSkippedMotivated: number;
    totalSetsPrescribed: number;
    totalSetsLogged: number;
    totalSetsWithFeedback: number;
    hasCheckinCompleted: boolean;
  };
  debug?: {
    resolvedAthleteIds: string[];
    sessionsFound: number;
    logsFound: number;
    onboardingStatus: string;
    workoutScore: number;
    setsScore: number;
    feedbackScore: number;
    checkinScore: number;
    finalFormula: string;
  };
  calculatedAt: string;
}

export interface AdherenceInputs {
  athleteId: string;
  totalPrescribedSessions: number;
  completedSessions: number;
  skippedWithReasonSessions: number;
  totalPrescribedSets: number;
  loggedSets: number;
  setsWithRpeOrNotes: number;
  hasCompletedCheckinOrOnboarding: boolean;
  debugMeta?: {
    resolvedAthleteIds: string[];
    sessionsFound: number;
    logsFound: number;
    onboardingStatus: string;
  };
}

// ─── CACHE IN MEMORIA & IN-FLIGHT DEDUPING ────────────────────────────────────
const CACHE_TTL_MS = 90 * 1000; // 90 secondi
const adherenceMemoryCache = new Map<string, { result: AdherenceScoreResult; timestamp: number }>();
const inFlightRequests = new Map<string, Promise<AdherenceScoreResult>>();
const workoutDaysCache = new Map<string, number>();

/**
 * Invalida la cache locale e in memoria per uno o tutti gli atleti.
 */
export function invalidateAdherenceCache(athleteId?: string) {
  if (athleteId) {
    adherenceMemoryCache.delete(athleteId);
    try {
      localStorage.removeItem(`ac_cached_adherence_${athleteId}`);
    } catch {}
  } else {
    adherenceMemoryCache.clear();
  }
}

// Ascolta eventi globali per invalidare automaticamente la cache
if (typeof window !== 'undefined') {
  const clearOnEvent = () => invalidateAdherenceCache();
  window.addEventListener('athlete_workout_completed', clearOnEvent);
  window.addEventListener('athlete_workout_skipped', clearOnEvent);
  window.addEventListener('pending_sync_queue_updated', clearOnEvent);
}

/**
 * Calcola l'Indice Aderenza deterministico (0-100).
 * FORMULA UFFICIALE UNICA:
 * - 40% Costanza Sedute
 * - 30% Compilazione Serie
 * - 20% Feedback & RPE Tracking
 * - 10% Check-in & Anamnesi
 */
export function computeAdherenceScore(inputs: AdherenceInputs): AdherenceScoreResult {
  const {
    athleteId,
    totalPrescribedSessions,
    completedSessions,
    skippedWithReasonSessions,
    totalPrescribedSets,
    loggedSets,
    setsWithRpeOrNotes,
    hasCompletedCheckinOrOnboarding,
    debugMeta,
  } = inputs;

  // 1. Pilastro Sedute (40%)
  const effectivePrescribed = Math.max(1, totalPrescribedSessions);
  const effectiveCompleted = completedSessions + (skippedWithReasonSessions * 0.5);
  const workoutScore = Math.min(100, Math.max(0, Math.round((effectiveCompleted / effectivePrescribed) * 100)));

  // 2. Pilastro Compilazione Serie (30%)
  const effectiveSetsPrescribed = Math.max(1, totalPrescribedSets);
  const setsScore = Math.min(100, Math.max(0, Math.round((loggedSets / effectiveSetsPrescribed) * 100)));

  // 3. Pilastro Feedback & RPE (20%)
  let feedbackScore = 100;
  if (loggedSets > 0) {
    feedbackScore = Math.min(100, Math.max(0, Math.round((setsWithRpeOrNotes / loggedSets) * 100)));
  } else if (completedSessions === 0) {
    feedbackScore = 0;
  }

  // 4. Pilastro Check-in & Anamnesi (10%)
  const checkinScore = hasCompletedCheckinOrOnboarding ? 100 : 0;

  // Score Finale Unificato con Rounding Matematico Standard
  const rawWeighted = workoutScore * 0.40 + setsScore * 0.30 + feedbackScore * 0.20 + checkinScore * 0.10;
  const totalScore = Math.min(100, Math.max(0, Math.round(rawWeighted)));

  // Livelli e Tono Costruttivo
  let level: AdherenceScoreResult['level'] = 'optimal';
  let label = 'Ottima Aderenza';
  let colorClass = 'text-emerald-400';
  let bgClass = 'bg-emerald-500/15';
  let borderClass = 'border-emerald-500/30';
  let message = 'Costanza eccellente e dati accurati. Stai massimizzando i risultati del percorso!';

  if (totalScore < 50) {
    level = 'critical';
    label = 'Richiede Attenzione';
    colorClass = 'text-rose-400';
    bgClass = 'bg-rose-500/15';
    borderClass = 'border-rose-500/30';
    message = 'La costanza è al di sotto del target: confrontati con il tuo coach per riallineare il programma.';
  } else if (totalScore < 75) {
    level = 'attention';
    label = 'Da Potenziare';
    colorClass = 'text-amber-400';
    bgClass = 'bg-amber-500/15';
    borderClass = 'border-amber-500/30';
    message = 'Buona base di partenza: aumentando la regolarità delle sedute e i feedback sbloccherai il pieno potenziale.';
  } else if (totalScore < 90) {
    level = 'good';
    label = 'Buona Aderenza';
    colorClass = 'text-sky-400';
    bgClass = 'bg-sky-500/15';
    borderClass = 'border-sky-500/30';
    message = 'Ottimo ritmo di lavoro! Continua a registrare con precisione carichi, serie e sensazioni.';
  }

  const result: AdherenceScoreResult = {
    athleteId,
    score: totalScore,
    level,
    label,
    colorClass,
    bgClass,
    borderClass,
    message,
    periodLabel: 'Ultimi 28 giorni',
    pillars: {
      workouts: {
        name: 'Sedute',
        weightPercent: 40,
        score: workoutScore,
        label: `${completedSessions}/${effectivePrescribed} svolte`,
        detail: skippedWithReasonSessions > 0 ? `${skippedWithReasonSessions} motivate` : 'Frequenza sedute',
      },
      sets: {
        name: 'Compilazione',
        weightPercent: 30,
        score: setsScore,
        label: `${loggedSets}/${effectiveSetsPrescribed} serie`,
        detail: 'Carichi e ripetizioni',
      },
      feedback: {
        name: 'Feedback',
        weightPercent: 20,
        score: feedbackScore,
        label: `${feedbackScore}% accuratezza`,
        detail: 'RIR, RPE e note',
      },
      checkins: {
        name: 'Check-in',
        weightPercent: 10,
        score: checkinScore,
        label: hasCompletedCheckinOrOnboarding ? 'Completato' : 'In attesa',
        detail: 'Anamnesi e questionari',
      },
    },
    stats: {
      totalWorkoutsPrescribed: effectivePrescribed,
      totalWorkoutsCompleted: completedSessions,
      totalWorkoutsSkippedMotivated: skippedWithReasonSessions,
      totalSetsPrescribed: effectiveSetsPrescribed,
      totalSetsLogged: loggedSets,
      totalSetsWithFeedback: setsWithRpeOrNotes,
      hasCheckinCompleted: hasCompletedCheckinOrOnboarding,
    },
    debug: {
      resolvedAthleteIds: debugMeta?.resolvedAthleteIds || [athleteId],
      sessionsFound: debugMeta?.sessionsFound || completedSessions,
      logsFound: debugMeta?.logsFound || loggedSets,
      onboardingStatus: debugMeta?.onboardingStatus || (hasCompletedCheckinOrOnboarding ? 'completed' : 'pending'),
      workoutScore,
      setsScore,
      feedbackScore,
      checkinScore,
      finalFormula: `(${workoutScore} * 0.40) + (${setsScore} * 0.30) + (${feedbackScore} * 0.20) + (${checkinScore} * 0.10) = ${rawWeighted.toFixed(2)} -> ${totalScore}`,
    },
    calculatedAt: new Date().toISOString(),
  };

  return result;
}

/**
 * Recupera l'Indice Aderenza per un singolo atleta con cache, in-flight deduping e query consolidate.
 */
export async function fetchAthleteAdherenceData(athleteId: string, forceRefresh = false): Promise<AdherenceScoreResult> {
  if (!athleteId) {
    return computeAdherenceScore({
      athleteId: 'unknown',
      totalPrescribedSessions: 12,
      completedSessions: 0,
      skippedWithReasonSessions: 0,
      totalPrescribedSets: 144,
      loggedSets: 0,
      setsWithRpeOrNotes: 0,
      hasCompletedCheckinOrOnboarding: false,
    });
  }

  // 1. Controllo cache in memoria
  const now = Date.now();
  if (!forceRefresh) {
    const cached = adherenceMemoryCache.get(athleteId);
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return cached.result;
    }
  }

  // 2. Controllo richieste in-flight identiche (deduping)
  if (inFlightRequests.has(athleteId)) {
    return inFlightRequests.get(athleteId)!;
  }

  const fetchPromise = (async () => {
    try {
      // 1. Risoluzione ID rapida (in un set)
      const matchingIds = new Set<string>([athleteId]);

      // 2. Finestra temporale 28 giorni
      const twentyEightDaysAgo = new Date();
      twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);
      const dateLimit = twentyEightDaysAgo.toISOString();

      // 3. Esegui in un unico blocco parallelo le query essenziali
      const [sessionsRes, assignedRes, onboardingRes, athRecordRes] = await Promise.all([
        supabase
          .from('workout_sessions')
          .select('id, athlete_id, status, skip_reason, start_time, rpe, notes')
          .or(`athlete_id.eq.${athleteId}`)
          .gte('start_time', dateLimit),
        supabase
          .from('athlete_assigned_workouts')
          .select('id, athlete_id, workout_id, is_active, workouts(title, total_weeks, workout_exercises(day_name))')
          .eq('athlete_id', athleteId)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle(),
        supabase
          .from('athlete_onboarding_responses')
          .select('id, status')
          .eq('athlete_id', athleteId)
          .maybeSingle(),
        supabase
          .from('athletes')
          .select('id, auth_user_id')
          .or(`id.eq.${athleteId},auth_user_id.eq.${athleteId}`)
          .maybeSingle(),
      ]);

      if (athRecordRes.data) {
        if (athRecordRes.data.id) matchingIds.add(athRecordRes.data.id);
        if (athRecordRes.data.auth_user_id) matchingIds.add(athRecordRes.data.auth_user_id);
      }

      // Se l'atleta ha un auth_user_id separato, esegui eventuale fallback sessioni se vuote
      let sessions = sessionsRes.data || [];
      if (sessions.length === 0 && matchingIds.size > 1) {
        const idList = Array.from(matchingIds);
        const { data: fallbackSessions } = await supabase
          .from('workout_sessions')
          .select('id, athlete_id, status, skip_reason, start_time, rpe, notes')
          .in('athlete_id', idList)
          .gte('start_time', dateLimit);
        if (fallbackSessions) sessions = fallbackSessions;
      }

      const completedSessions = sessions.filter((s) => s.status === 'completed').length;
      const skippedWithReasonSessions = sessions.filter((s) => s.status === 'skipped' && Boolean(s.skip_reason)).length;

      // 4. Determina giorni a settimana dal join o cache
      let weeklyDays = 3;
      const assignedWorkout = assignedRes.data?.workouts as unknown as { workout_exercises?: { day_name?: string }[] } | null;
      const assignedWorkoutId = assignedRes.data?.workout_id;

      if (assignedWorkoutId && workoutDaysCache.has(assignedWorkoutId)) {
        weeklyDays = workoutDaysCache.get(assignedWorkoutId)!;
      } else if (assignedWorkout?.workout_exercises && assignedWorkout.workout_exercises.length > 0) {
        const uniqueDays = new Set(assignedWorkout.workout_exercises.map((e) => e.day_name).filter(Boolean));
        if (uniqueDays.size > 0) {
          weeklyDays = uniqueDays.size;
          if (assignedWorkoutId) workoutDaysCache.set(assignedWorkoutId, weeklyDays);
        }
      }

      const totalPrescribedSessions = weeklyDays * 4;

      // 5. Calcolo serie e feedback (Query mirata ultra-leggera)
      const sessionIds = sessions.map((s) => s.id);
      let loggedSets = 0;
      let setsWithFeedback = 0;

      if (sessionIds.length > 0) {
        const { data: logs } = await supabase
          .from('exercise_logs')
          .select('session_id, notes')
          .in('session_id', sessionIds);

        if (logs && logs.length > 0) {
          loggedSets = logs.length;
          const sessionFeedbackMap = new Map<string, boolean>();
          sessions.forEach((s) => {
            const hasSessionFeedback = (s.rpe !== null && s.rpe !== undefined && Number(s.rpe) > 0) || (Boolean(s.notes) && s.notes.trim().length > 0);
            sessionFeedbackMap.set(s.id, hasSessionFeedback);
          });

          setsWithFeedback = logs.filter((l) => {
            const hasLogNotes = Boolean(l.notes && l.notes.trim().length > 0);
            const hasSessionNotes = sessionFeedbackMap.get(l.session_id) || false;
            return hasLogNotes || hasSessionNotes;
          }).length;
        }
      }

      const totalPrescribedSets = Math.max(loggedSets, totalPrescribedSessions * 14);
      const hasCompletedCheckinOrOnboarding = onboardingRes.data?.status === 'completed';

      const result = computeAdherenceScore({
        athleteId,
        totalPrescribedSessions,
        completedSessions,
        skippedWithReasonSessions,
        totalPrescribedSets,
        loggedSets,
        setsWithRpeOrNotes: setsWithFeedback,
        hasCompletedCheckinOrOnboarding,
        debugMeta: {
          resolvedAthleteIds: Array.from(matchingIds),
          sessionsFound: sessions.length,
          logsFound: loggedSets,
          onboardingStatus: onboardingRes.data?.status || 'none',
        },
      });

      // Salva in cache memoria e localStorage
      adherenceMemoryCache.set(athleteId, { result, timestamp: Date.now() });
      try {
        localStorage.setItem(`ac_cached_adherence_${athleteId}`, JSON.stringify(result));
      } catch {}

      return result;
    } catch (err) {
      console.error('[adherenceService] Errore:', err);
      const fallback = computeAdherenceScore({
        athleteId,
        totalPrescribedSessions: 12,
        completedSessions: 0,
        skippedWithReasonSessions: 0,
        totalPrescribedSets: 144,
        loggedSets: 0,
        setsWithRpeOrNotes: 0,
        hasCompletedCheckinOrOnboarding: false,
      });
      return fallback;
    } finally {
      inFlightRequests.delete(athleteId);
    }
  })();

  inFlightRequests.set(athleteId, fetchPromise);
  return fetchPromise;
}

/**
 * Caricamento Batch Consolidato (1 sola tornata di query per decine di atleti contemporaneamente).
 * Perfetto per la lista atleti e overview team.
 */
export async function fetchBatchAthletesAdherence(athleteIds: string[]): Promise<Record<string, AdherenceScoreResult>> {
  const resultRecord: Record<string, AdherenceScoreResult> = {};
  if (!athleteIds || athleteIds.length === 0) return resultRecord;

  const uniqueIds = Array.from(new Set(athleteIds.filter(Boolean)));
  const idsToFetch: string[] = [];
  const now = Date.now();

  uniqueIds.forEach((id) => {
    const cached = adherenceMemoryCache.get(id);
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      resultRecord[id] = cached.result;
    } else {
      idsToFetch.push(id);
    }
  });

  if (idsToFetch.length === 0) {
    return resultRecord;
  }

  try {
    const twentyEightDaysAgo = new Date();
    twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);
    const dateLimit = twentyEightDaysAgo.toISOString();

    // 1. Esegui 3 query aggregate per tutti gli atleti
    const [sessionsRes, assignedRes, onboardingRes] = await Promise.all([
      supabase
        .from('workout_sessions')
        .select('id, athlete_id, status, skip_reason, start_time, rpe, notes')
        .in('athlete_id', idsToFetch)
        .gte('start_time', dateLimit),
      supabase
        .from('athlete_assigned_workouts')
        .select('id, athlete_id, workout_id, is_active, workouts(title, total_weeks, workout_exercises(day_name))')
        .in('athlete_id', idsToFetch)
        .eq('is_active', true),
      supabase
        .from('athlete_onboarding_responses')
        .select('athlete_id, status')
        .in('athlete_id', idsToFetch),
    ]);

    const allSessions = sessionsRes.data || [];
    const allAssigned = assignedRes.data || [];
    const allOnboarding = onboardingRes.data || [];

    // Mappa sessioni per atleta
    const sessionsByAthlete = new Map<string, typeof allSessions>();
    allSessions.forEach((s) => {
      const list = sessionsByAthlete.get(s.athlete_id) || [];
      list.push(s);
      sessionsByAthlete.set(s.athlete_id, list);
    });

    // Mappa assegnazioni per atleta
    const assignedByAthlete = new Map<string, (typeof allAssigned)[0]>();
    allAssigned.forEach((a) => {
      if (!assignedByAthlete.has(a.athlete_id)) {
        assignedByAthlete.set(a.athlete_id, a);
      }
    });

    // Mappa onboarding per atleta
    const onboardingByAthlete = new Map<string, string>();
    allOnboarding.forEach((o) => {
      onboardingByAthlete.set(o.athlete_id, o.status);
    });

    // 2. Raccogli tutti gli id sessione per la singola query sui log
    const allSessionIds = allSessions.map((s) => s.id);
    let allLogs: { session_id: string; notes?: string }[] = [];

    if (allSessionIds.length > 0) {
      const { data: logsData } = await supabase
        .from('exercise_logs')
        .select('session_id, notes')
        .in('session_id', allSessionIds);
      if (logsData) allLogs = logsData;
    }

    const logsBySession = new Map<string, typeof allLogs>();
    allLogs.forEach((l) => {
      const list = logsBySession.get(l.session_id) || [];
      list.push(l);
      logsBySession.set(l.session_id, list);
    });

    // 3. Calcola il punteggio per ogni atleta
    idsToFetch.forEach((athId) => {
      const sessions = sessionsByAthlete.get(athId) || [];
      const completedSessions = sessions.filter((s) => s.status === 'completed').length;
      const skippedWithReasonSessions = sessions.filter((s) => s.status === 'skipped' && Boolean(s.skip_reason)).length;

      const assignment = assignedByAthlete.get(athId);
      const assignedWorkout = assignment?.workouts as unknown as { workout_exercises?: { day_name?: string }[] } | null;
      let weeklyDays = 3;

      if (assignedWorkout?.workout_exercises && assignedWorkout.workout_exercises.length > 0) {
        const uniqueDays = new Set(assignedWorkout.workout_exercises.map((e) => e.day_name).filter(Boolean));
        if (uniqueDays.size > 0) weeklyDays = uniqueDays.size;
      }

      const totalPrescribedSessions = weeklyDays * 4;

      let loggedSets = 0;
      let setsWithFeedback = 0;

      sessions.forEach((s) => {
        const sessionLogs = logsBySession.get(s.id) || [];
        loggedSets += sessionLogs.length;

        const hasSessionFeedback = (s.rpe !== null && s.rpe !== undefined && Number(s.rpe) > 0) || (Boolean(s.notes) && s.notes.trim().length > 0);
        setsWithFeedback += sessionLogs.filter((l) => {
          return Boolean(l.notes && l.notes.trim().length > 0) || hasSessionFeedback;
        }).length;
      });

      const totalPrescribedSets = Math.max(loggedSets, totalPrescribedSessions * 14);
      const hasCompletedCheckinOrOnboarding = onboardingByAthlete.get(athId) === 'completed';

      const scoreResult = computeAdherenceScore({
        athleteId: athId,
        totalPrescribedSessions,
        completedSessions,
        skippedWithReasonSessions,
        totalPrescribedSets,
        loggedSets,
        setsWithRpeOrNotes: setsWithFeedback,
        hasCompletedCheckinOrOnboarding,
      });

      adherenceMemoryCache.set(athId, { result: scoreResult, timestamp: Date.now() });
      resultRecord[athId] = scoreResult;
    });

    return resultRecord;
  } catch (err) {
    console.error('[adherenceService] Errore fetchBatchAthletesAdherence:', err);
    idsToFetch.forEach((id) => {
      if (!resultRecord[id]) {
        resultRecord[id] = computeAdherenceScore({
          athleteId: id,
          totalPrescribedSessions: 12,
          completedSessions: 0,
          skippedWithReasonSessions: 0,
          totalPrescribedSets: 144,
          loggedSets: 0,
          setsWithRpeOrNotes: 0,
          hasCompletedCheckinOrOnboarding: false,
        });
      }
    });
    return resultRecord;
  }
}
