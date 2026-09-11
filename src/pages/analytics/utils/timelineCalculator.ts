import { Athlete } from '../../../types';
import { isCompletedSession, normalizeDayName, resolveRelatedWorkoutIds } from '../../../services/workoutProgressService';

export type TimelineCategory = 'today' | 'late' | 'in_progress' | 'end_of_block' | 'no_activity';

export type TimelinePeriodFilter = 'all' | 'today' | '7d' | '30d';

export type TimelineSortOption = 'next_session' | 'last_workout' | 'progress' | 'end_of_block';

export interface AthleteTimelineItem {
  athleteId: string;
  athleteName: string;
  athleteEmail?: string;
  avatarUrl?: string;
  workoutId?: string;
  workoutTitle: string;
  totalWeeks: number;
  daysInWeek: number;
  daysList: string[];
  
  // Sessioni & Avanzamento
  completedSessionsCount: number;
  totalPlannedSessions: number;
  progressPercent: number;
  currentWeek: number;
  
  // Ultima sessione
  lastSessionLabel: string;
  lastSessionDateIso: string | null;
  lastSessionRelative: string;
  daysSinceLastWorkout: number | null;
  
  // Prossima sessione
  nextSessionLabel: string;
  nextSessionWeek: number | null;
  nextSessionDay: string | null;
  
  // Stima fine blocco
  estimatedEndBlock: string;
  
  // Stato & Categoria
  category: TimelineCategory;
  statusLabel: string;
  statusColor: 'red' | 'yellow' | 'sky' | 'emerald' | 'slate';
  
  // Flag speciali di sincronizzazione
  needsRealignment: boolean;
  hasProgram: boolean;
  isCompletedBlock: boolean;
}

export interface TimelineSummaryCounters {
  needAttentionToday: number;
  late: number;
  activeToday: number;
  endOfBlock: number;
  noActivity: number;
}

export interface TimelineWorkoutAssignment {
  id?: string;
  athlete_id: string;
  workout_id?: string;
  workout_title?: string;
  total_weeks?: number;
  is_active?: boolean;
  assigned_date?: string;
  created_at?: string;
  workout?: {
    id: string;
    title?: string;
    total_weeks?: number;
    parent_template_id?: string | null;
  };
}

export interface TimelineWorkoutSession {
  id?: string;
  athlete_id: string;
  workout_id?: string;
  week_number?: number | null;
  day_name?: string | null;
  status?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  created_at?: string;
  skip_reason?: string | null;
  skip_notes?: string | null;
  coach_justified?: boolean;
}

/**
 * Calcola i dati cronologici per tutti gli atleti, usando i record persistenti
 * senza tab attivi dell'editor e senza giorni fallback fittizi.
 */
export function buildAthleteTimelineItems(
  athletes: Athlete[],
  assignments: TimelineWorkoutAssignment[],
  sessions: TimelineWorkoutSession[],
  workoutDaysMap: Record<string, string[]> = {},
  now: number = Date.now()
): AthleteTimelineItem[] {
  const items: AthleteTimelineItem[] = [];

  for (const athlete of athletes) {
    // 1. Assegnazione attiva
    const athleteAssignments = assignments.filter(
      (a) => a.athlete_id === athlete.id || (athlete.auth_user_id && a.athlete_id === athlete.auth_user_id)
    );
    const activeAssignment = athleteAssignments.find((a) => a.is_active) || athleteAssignments[0];

    const hasProgram = Boolean(activeAssignment && (activeAssignment.workout_id || activeAssignment.workout));
    const workout = activeAssignment?.workout;
    const workoutId = activeAssignment?.workout_id || workout?.id;
    const parentTemplateId = workout?.parent_template_id;
    const workoutTitle = workout?.title || activeAssignment?.workout_title || (hasProgram ? 'Scheda Assegnata' : 'Nessun programma');
    const totalWeeks = Number(workout?.total_weeks || activeAssignment?.total_weeks) || (hasProgram ? 4 : 0);

    // 2. Giorni reali della scheda
    const daysList = (workoutId && workoutDaysMap[workoutId]) ||
      (parentTemplateId && workoutDaysMap[parentTemplateId]) ||
      [];
    const daysCount = daysList.length;

    // 3. Sessioni dell'atleta
    const athleteSessions = sessions.filter(
      (s) => s.athlete_id === athlete.id || (athlete.auth_user_id && s.athlete_id === athlete.auth_user_id)
    );

    const relatedWorkoutIds = resolveRelatedWorkoutIds({
      assignedWorkoutId: workoutId || '',
      parentTemplateId: parentTemplateId,
    });

    const relevantSessions = athleteSessions.filter((s) => {
      if (!s.workout_id) return true;
      return relatedWorkoutIds.length === 0 || relatedWorkoutIds.includes(s.workout_id);
    });

    // Controllo se ci sono sessioni registrate con workout_id non allineato
    let needsRealignment = false;
    if (hasProgram && athleteSessions.length > 0 && parentTemplateId) {
      const hasParentSessions = athleteSessions.some((s) => s.workout_id === parentTemplateId);
      const hasAssignedSessions = athleteSessions.some((s) => s.workout_id === workoutId);
      if (hasParentSessions && !hasAssignedSessions) {
        needsRealignment = true;
      }
    }

    // 4. Sessioni completate uniche (solo con week+day validi)
    const completedSessions = relevantSessions.filter((s) => isCompletedSession(s));

    const uniqueCompletedKeys = new Set<string>();
    completedSessions.forEach((s) => {
      const w = Number(s.week_number);
      const rawD = (s.day_name || '').trim();
      const normD = normalizeDayName(rawD);
      if (w > 0 && normD) {
        // Solo sessioni con week+day validi contano come avanzamento reale
        uniqueCompletedKeys.add(`${w}-${normD}`);
      }
      // Phantom sessions (senza week/day) vengono ignorate nel conteggio
    });

    const completedCount = uniqueCompletedKeys.size;
    const totalPlanned = totalWeeks > 0 && daysCount > 0 ? totalWeeks * daysCount : (totalWeeks > 0 ? totalWeeks * 3 : 0);

    // REGOLA: non mostrare 100% se completedCount < totalPlanned
    const progressPercent: number = (() => {
      if (totalPlanned <= 0) return 0;
      const raw = Math.round((completedCount / totalPlanned) * 100);
      if (completedCount < totalPlanned) return Math.min(99, raw);
      if (completedCount > totalPlanned) return 100; // anomalia
      return 100;
    })();

    // 5. Ultima sessione
    const sortedCompleted = [...completedSessions].sort((a, b) => {
      const timeA = new Date(a.end_time || a.start_time || 0).getTime();
      const timeB = new Date(b.end_time || b.start_time || 0).getTime();
      return timeB - timeA;
    });

    const lastSession = sortedCompleted[0] || null;
    let lastSessionLabel = 'Nessuna attività registrata';
    let lastSessionDateIso: string | null = null;
    let lastSessionRelative = 'Nessuna';
    let daysSinceLastWorkout: number | null = null;
    let lastWeek = 1;

    if (lastSession) {
      lastSessionDateIso = lastSession.end_time || lastSession.start_time || null;
      if (lastSession.week_number && lastSession.day_name) {
        lastSessionLabel = `Settimana ${lastSession.week_number} · ${lastSession.day_name}`;
        lastWeek = Number(lastSession.week_number);
      } else if (lastSession.week_number) {
        lastSessionLabel = `Settimana ${lastSession.week_number}`;
        lastWeek = Number(lastSession.week_number);
      } else {
        lastSessionLabel = 'Sessione completata';
      }

      if (lastSessionDateIso) {
        const lastMs = new Date(lastSessionDateIso).getTime();
        daysSinceLastWorkout = Math.max(0, Math.floor((now - lastMs) / (1000 * 60 * 60 * 24)));
        
        if (daysSinceLastWorkout === 0) {
          const dateObj = new Date(lastSessionDateIso);
          const hours = String(dateObj.getHours()).padStart(2, '0');
          const minutes = String(dateObj.getMinutes()).padStart(2, '0');
          lastSessionRelative = `Oggi ${hours}:${minutes}`;
        } else if (daysSinceLastWorkout === 1) {
          lastSessionRelative = 'Ieri';
        } else {
          lastSessionRelative = `${daysSinceLastWorkout} giorni fa`;
        }
      }
    }

    // 6. Prossima sessione prevista
    let nextSessionLabel = 'Nessuna';
    let nextSessionWeek: number | null = null;
    let nextSessionDay: string | null = null;

    if (!hasProgram) {
      nextSessionLabel = 'Assegna programma';
    } else if (daysCount > 0 && totalWeeks > 0) {
      let foundNext = false;
      outerLoop:
      for (let w = 1; w <= totalWeeks; w++) {
        for (const d of daysList) {
          const normD = normalizeDayName(d);
          const key = `${w}-${normD}`;
          if (!uniqueCompletedKeys.has(key)) {
            nextSessionLabel = `Settimana ${w} · ${d}`;
            nextSessionWeek = w;
            nextSessionDay = d;
            foundNext = true;
            break outerLoop;
          }
        }
      }
      if (!foundNext) {
        nextSessionLabel = 'Tutte le sessioni completate';
      }
    } else if (completedCount > 0) {
      // Se non conosciamo la lista precisa dei giorni, stimiamo sulla settimana corrente
      nextSessionLabel = `Settimana ${Math.min(totalWeeks, lastWeek + 1)}`;
    } else {
      nextSessionLabel = 'In attesa del primo allenamento';
    }

    // 7. Stima data fine blocco
    let estimatedEndBlock = 'Non disponibile';
    if (hasProgram && totalWeeks > 0) {
      if (progressPercent >= 100) {
        estimatedEndBlock = 'Completato';
      } else {
        const assignedDateStr = activeAssignment?.assigned_date || activeAssignment?.created_at;
        const baseMs = assignedDateStr ? new Date(assignedDateStr).getTime() : now;
        const totalDurationDays = totalWeeks * 7;
        const targetEndMs = baseMs + totalDurationDays * 24 * 60 * 60 * 1000;
        const targetEndDate = new Date(targetEndMs);
        estimatedEndBlock = targetEndDate.toLocaleDateString('it-IT', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
      }
    }

    // 8. Classificazione in Categoria & Stato Sintetico
    let category: TimelineCategory = 'in_progress';
    let statusLabel = 'Regolare';
    let statusColor: 'red' | 'yellow' | 'sky' | 'emerald' | 'slate' = 'sky';
    const isCompletedBlock = completedCount >= totalPlanned && totalPlanned > 0 && completedCount > 0;
    const isNearEnd = progressPercent >= 80 || (totalWeeks > 1 && lastWeek >= totalWeeks - 1 && completedCount > 0);

    if (!hasProgram || completedCount === 0) {
      category = 'no_activity';
      statusLabel = hasProgram ? 'Da avviare' : 'Senza programma';
      statusColor = 'slate';
    } else if (isCompletedBlock) {
      category = 'end_of_block';
      statusLabel = 'Blocco completato';
      statusColor = 'emerald';
    } else if (isNearEnd) {
      category = 'end_of_block';
      statusLabel = 'Revisione scheda';
      statusColor = 'yellow';
    } else if (daysSinceLastWorkout !== null && daysSinceLastWorkout >= 4) {
      category = 'late';
      statusLabel = daysSinceLastWorkout >= 7 ? 'Richiede attenzione' : 'Da seguire';
      statusColor = 'red';
    } else if (daysSinceLastWorkout === 0) {
      category = 'today';
      statusLabel = 'Attivo oggi';
      statusColor = 'emerald';
    } else {
      category = 'in_progress';
      statusLabel = 'Regolare';
      statusColor = 'sky';
    }

    const safeName =
      athlete.fullName ||
      [athlete.firstName, athlete.lastName].filter(Boolean).join(' ') ||
      athlete.email ||
      'Atleta';

    items.push({
      athleteId: athlete.id,
      athleteName: safeName,
      athleteEmail: athlete.email,
      avatarUrl: athlete.avatarUrl,
      workoutId,
      workoutTitle,
      totalWeeks,
      daysInWeek: daysCount,
      daysList,
      completedSessionsCount: completedCount,
      totalPlannedSessions: totalPlanned,
      progressPercent,
      currentWeek: nextSessionWeek || lastWeek || 1,
      lastSessionLabel,
      lastSessionDateIso,
      lastSessionRelative,
      daysSinceLastWorkout,
      nextSessionLabel,
      nextSessionWeek,
      nextSessionDay,
      estimatedEndBlock,
      category,
      statusLabel,
      statusColor,
      needsRealignment,
      hasProgram,
      isCompletedBlock,
    });
  }

  return items;
}

/**
 * Calcola i contatori del riepilogo in alto:
 * [Da seguire oggi: 4] [In ritardo: 6] [Attivi oggi: 8] [Fine blocco: 11] [Senza attività: 6]
 */
export function calculateTimelineCounters(items: AthleteTimelineItem[]): TimelineSummaryCounters {
  let needAttentionToday = 0;
  let late = 0;
  let activeToday = 0;
  let endOfBlock = 0;
  let noActivity = 0;

  for (const item of items) {
    if (item.category === 'no_activity') {
      noActivity++;
    } else if (item.category === 'end_of_block') {
      endOfBlock++;
    } else if (item.category === 'late') {
      late++;
    } else if (item.category === 'today') {
      activeToday++;
    }

    // "Da seguire oggi": atleti che necessitano di un intervento oggi (ritardi, fine blocco o attenzione)
    if (item.category === 'late' || item.statusColor === 'red' || (item.category === 'end_of_block' && item.progressPercent < 100)) {
      needAttentionToday++;
    }
  }

  return {
    needAttentionToday,
    late,
    activeToday,
    endOfBlock,
    noActivity,
  };
}

/**
 * Filtra gli elementi in base al periodo selezionato
 */
export function filterTimelineByPeriod(
  items: AthleteTimelineItem[],
  period: TimelinePeriodFilter,
  now: number = Date.now()
): AthleteTimelineItem[] {
  if (period === 'all') return items;

  return items.filter((item) => {
    if (!item.lastSessionDateIso) {
      // Se non c'è attività, includi solo in "all"
      return false;
    }
    const lastMs = new Date(item.lastSessionDateIso).getTime();
    const daysAgo = (now - lastMs) / (1000 * 60 * 60 * 24);

    if (period === 'today') {
      return daysAgo <= 1;
    }
    if (period === '7d') {
      return daysAgo <= 7;
    }
    if (period === '30d') {
      return daysAgo <= 30;
    }
    return true;
  });
}

/**
 * Ordina gli elementi secondo i criteri specificati
 */
export function sortTimelineItems(
  items: AthleteTimelineItem[],
  sortBy: TimelineSortOption
): AthleteTimelineItem[] {
  const result = [...items];

  result.sort((a, b) => {
    if (sortBy === 'last_workout') {
      const timeA = a.lastSessionDateIso ? new Date(a.lastSessionDateIso).getTime() : 0;
      const timeB = b.lastSessionDateIso ? new Date(b.lastSessionDateIso).getTime() : 0;
      return timeB - timeA;
    }

    if (sortBy === 'progress') {
      return b.progressPercent - a.progressPercent;
    }

    if (sortBy === 'end_of_block') {
      return b.progressPercent - a.progressPercent;
    }

    // Default: 'next_session'
    // Se non esiste una prossima sessione o per spareggiare:
    // 1. Sessione scaduta o in ritardo (rosso)
    // 2. Più giorni di inattività
    // 3. Vicino a fine blocco (giallo)
    // 4. Senza programma
    // 5. Stabile / regolare
    const scoreItem = (item: AthleteTimelineItem): number => {
      if (item.category === 'late') return 1000 + (item.daysSinceLastWorkout || 0);
      if (item.category === 'end_of_block') return 800 + item.progressPercent;
      if (item.category === 'today') return 600;
      if (item.category === 'in_progress') return 400 + (item.daysSinceLastWorkout || 0);
      if (item.category === 'no_activity') return item.hasProgram ? 200 : 100;
      return 0;
    };

    const diff = scoreItem(b) - scoreItem(a);
    if (diff !== 0) return diff;

    return a.athleteName.localeCompare(b.athleteName);
  });

  return result;
}
