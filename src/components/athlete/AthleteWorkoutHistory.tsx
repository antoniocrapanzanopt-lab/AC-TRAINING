import React, { useState, useEffect, useMemo } from 'react';
import {
  Dumbbell,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  Activity,
  FolderArchive,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { isSessionWithinAssignmentCycle } from '../../services/workoutProgressService';

interface PastSessionExercise {
  name: string;
  sets: { setNumber: number; reps: number; weightKg: number }[];
  notes?: string;
}

interface PastSession {
  id: string;
  workoutId?: string | null;
  workoutTitle: string;
  weekNumber: number;
  dayName: string;
  date: string;
  durationMinutes: number | null;
  rpe: number;
  notes?: string;
  status?: 'completed' | 'skipped';
  skipReason?: string;
  skipNotes?: string;
  coachJustified?: boolean | null;
  coachFeedback?: string;
}

export interface SessionRow {
  id: string;
  start_time?: string | null;
  end_time?: string | null;
  week_number?: number | null;
  day_name?: string | null;
  rpe?: number | null;
  notes?: string | null;
  status?: string | null;
  skip_reason?: string | null;
  skip_notes?: string | null;
  coach_justified?: boolean | null;
  coach_feedback?: string | null;
  workout_id?: string | null;
  workouts?: { title?: string; total_weeks?: number } | null;
}

interface AthleteWorkoutHistoryProps {
  athleteId: string;
  athleteIds?: string[];
  activeWorkoutId?: string;
  activeWorkoutTitle?: string;
  activeAssignedDate?: string | null;
  initialSessions?: SessionRow[];
}

interface WorkoutWeekBucket {
  weekNumber: number;
  sessions: PastSession[];
}

interface WorkoutGroupBucket {
  groupKey: string;
  workoutTitle: string;
  isActiveWorkout: boolean;
  totalSessions: number;
  latestDate: string;
  weeks: WorkoutWeekBucket[];
}

const cleanWorkoutTitle = (raw?: string | null, fallback?: string): string => {
  const cleanedFallback = (fallback || 'Programma Personalizzato')
    .replace(/\s*\(copia\)\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!raw) return cleanedFallback;
  const trimmed = raw
    .replace(/\s*\(copia\)\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const lower = trimmed.toLowerCase();
  if (
    !trimmed ||
    lower === 'aaaa' ||
    lower === 'allenamento' ||
    lower === 'allenamento svolto'
  ) {
    return cleanedFallback;
  }
  return trimmed;
};

const computeSafeDurationMinutes = (
  startStr?: string | null,
  endStr?: string | null,
  status?: string | null
): number | null => {
  if (status === 'skipped') return null;
  if (!startStr || !endStr) return null;
  const startMs = new Date(String(startStr)).getTime();
  const endMs = new Date(String(endStr)).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return null;
  }
  const mins = Math.round((endMs - startMs) / 60000);
  // Filtra durate non realistiche (< 1 min o > 240 min / 4 ore dovute a bozze rimaste aperte giorni)
  if (!Number.isFinite(mins) || mins < 1 || mins > 240) {
    return null;
  }
  return mins;
};

export const AthleteWorkoutHistory: React.FC<AthleteWorkoutHistoryProps> = ({
  athleteId,
  athleteIds,
  activeWorkoutId,
  activeWorkoutTitle,
  activeAssignedDate,
  initialSessions,
}) => {
  const mapSessions = React.useCallback(
    (sessionList: SessionRow[]): PastSession[] => {
      const sorted = sessionList.slice().sort((a, b) => {
        const timeA = new Date(a.end_time || a.start_time || 0).getTime();
        const timeB = new Date(b.end_time || b.start_time || 0).getTime();
        return timeB - timeA;
      });

      const mapped = sorted.map((session) => {
        const durationMinutes = computeSafeDurationMinutes(
          session.start_time,
          session.end_time,
          session.status
        );

        const finalTitle = cleanWorkoutTitle(
          session.workouts?.title,
          activeWorkoutTitle
        );

        const rawDateSource = session.end_time || session.start_time;
        const parsedDate = rawDateSource ? new Date(String(rawDateSource)) : new Date();
        const dateStr = Number.isFinite(parsedDate.getTime())
          ? parsedDate.toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10);

        const rawW = Number(session.week_number) || 1;
        const totalW = session.workouts?.total_weeks;
        const safeW = totalW && totalW > 0 && rawW > totalW ? totalW : Math.max(1, rawW);

        const statusVal: 'completed' | 'skipped' =
          session.status === 'skipped' ? 'skipped' : 'completed';

        return {
          id: String(session.id),
          workoutId: session.workout_id ? String(session.workout_id) : null,
          workoutTitle: finalTitle,
          weekNumber: safeW,
          dayName: String(session.day_name || 'Giorno 1').trim(),
          date: dateStr,
          durationMinutes,
          rpe: Number(session.rpe) || 0,
          notes: session.notes ? String(session.notes) : undefined,
          status: statusVal,
          skipReason: session.skip_reason ? String(session.skip_reason) : undefined,
          skipNotes: session.skip_notes ? String(session.skip_notes) : undefined,
          coachJustified: session.coach_justified,
          coachFeedback: session.coach_feedback ? String(session.coach_feedback) : undefined,
        };
      });

      // Deduplicazione intelligente: se nello stesso giorno solare l'atleta ha salvato 2 volte
      // la medesima seduta (stessa scheda + settimana + nome giorno), mantiene la più completa/recente
      const deduped: PastSession[] = [];
      const seenKeys = new Set<string>();
      for (const item of mapped) {
        const key = `${item.workoutTitle.toLowerCase()}|w${item.weekNumber}|${item.dayName.toLowerCase()}|${item.date}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          deduped.push(item);
        }
      }

      return deduped;
    },
    [activeWorkoutTitle]
  );

  const [pastSessions, setPastSessions] = useState<PastSession[]>(() => {
    if (initialSessions && initialSessions.length > 0) {
      return mapSessions(initialSessions);
    }
    if (typeof window !== 'undefined' && athleteId) {
      try {
        const cached = localStorage.getItem(`ac_cached_sessions_${athleteId}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return mapSessions(parsed as SessionRow[]);
          }
        }
      } catch {
        // ignore cache error
      }
    }
    return [];
  });

  const [loadingSessions, setLoadingSessions] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [openWeekKeys, setOpenWeekKeys] = useState<Record<string, boolean>>({});
  const [isArchiveOpen, setIsArchiveOpen] = useState<boolean>(false);
  const [openArchiveWorkoutKeys, setOpenArchiveWorkoutKeys] = useState<Record<string, boolean>>({});
  const [sessionLogsMap, setSessionLogsMap] = useState<Record<string, PastSessionExercise[]>>({});
  const [loadingLogsId, setLoadingLogsId] = useState<string | null>(null);

  const idsKey = (athleteIds || []).filter(Boolean).sort().join(',');
  const targetAthleteIds = useMemo(() => {
    return Array.from(new Set([athleteId, ...(athleteIds || [])].filter(Boolean)));
  }, [athleteId, idsKey]);

  const fetchPastSessions = React.useCallback(async () => {
    if (targetAthleteIds.length === 0) {
      setLoadingSessions(false);
      return;
    }

    setLoadingSessions(true);
    try {
      const primaryRes = await supabase
        .from('workout_sessions')
        .select(`
          id,
          start_time,
          end_time,
          rpe,
          notes,
          workout_id,
          status,
          skip_reason,
          skip_notes,
          coach_justified,
          coach_feedback,
          week_number,
          day_name,
          workouts ( title, total_weeks )
        `)
        .in('athlete_id', targetAthleteIds)
        .not('end_time', 'is', null)
        .order('end_time', { ascending: false });

      let sessionList: Record<string, unknown>[] = [];

      if (primaryRes.error) {
        const fallbackRes = await supabase
          .from('workout_sessions')
          .select(`
            id,
            start_time,
            end_time,
            rpe,
            notes,
            workout_id,
            status,
            week_number,
            day_name,
            workouts ( title, total_weeks )
          `)
          .in('athlete_id', targetAthleteIds)
          .not('end_time', 'is', null)
          .order('end_time', { ascending: false });

        if (fallbackRes.error) throw fallbackRes.error;
        sessionList = (fallbackRes.data || []) as Record<string, unknown>[];
      } else {
        sessionList = (primaryRes.data || []) as Record<string, unknown>[];
      }

      if (sessionList) {
        setPastSessions(mapSessions(sessionList as unknown as SessionRow[]));
      }
    } catch (err) {
      console.warn('Errore lettura storico workout atleta:', err);
    } finally {
      setLoadingSessions(false);
    }
  }, [targetAthleteIds, mapSessions]);

  useEffect(() => {
    if (initialSessions && initialSessions.length > 0) {
      setPastSessions(mapSessions(initialSessions));
      setLoadingSessions(false);
    } else if (isHistoryOpen) {
      fetchPastSessions();
    } else {
      setLoadingSessions(false);
    }
  }, [initialSessions, isHistoryOpen, fetchPastSessions, mapSessions]);

  const loadLogsForSession = async (sessionId: string) => {
    if (sessionLogsMap[sessionId] || loadingLogsId === sessionId) return;
    setLoadingLogsId(sessionId);
    try {
      const { data, error } = await supabase
        .from('exercise_logs')
        .select(`
          set_number,
          reps_completed,
          weight_kg,
          notes,
          workout_exercises ( name, week_number, day_name )
        `)
        .eq('session_id', sessionId)
        .order('set_number', { ascending: true });

      if (!error && data) {
        interface ExerciseLogQueryRow {
          set_number: number;
          reps_completed: number | null;
          weight_kg: number | null;
          notes: string | null;
          workout_exercises: { name?: string; week_number?: number; day_name?: string } | null;
        }

        const exMap = new Map<
          string,
          { sets: { setNumber: number; reps: number; weightKg: number }[]; notesSet: Set<string> }
        >();
        (data as unknown as ExerciseLogQueryRow[]).forEach((log) => {
          const exName = log.workout_exercises?.name || 'Esercizio';
          if (!exMap.has(exName)) {
            exMap.set(exName, { sets: [], notesSet: new Set<string>() });
          }
          const entry = exMap.get(exName)!;
          entry.sets.push({
            setNumber: log.set_number,
            reps: log.reps_completed || 0,
            weightKg: log.weight_kg || 0,
          });
          if (log.notes) {
            const match = log.notes.match(/Feedback:\s*([^|]+)/i);
            if (match && match[1]) {
              entry.notesSet.add(match[1].trim());
            } else if (!log.notes.includes('RPE:') && !log.notes.includes('kg')) {
              entry.notesSet.add(log.notes.trim());
            } else {
              entry.notesSet.add(log.notes);
            }
          }
        });

        const exercises: PastSessionExercise[] = Array.from(exMap.entries()).map(
          ([name, { sets, notesSet }]) => ({
            name,
            sets: sets.sort((a, b) => a.setNumber - b.setNumber),
            notes: Array.from(notesSet).join(' • '),
          })
        );

        setSessionLogsMap((prev) => ({ ...prev, [sessionId]: exercises }));
      } else {
        try {
          const localLogsMap = JSON.parse(
            localStorage.getItem('builder_completed_session_logs') || '{}'
          );
          const localLogs = localLogsMap[sessionId];
          if (Array.isArray(localLogs) && localLogs.length > 0) {
            const exMap = new Map<
              string,
              { sets: { setNumber: number; reps: number; weightKg: number }[]; notesSet: Set<string> }
            >();
            localLogs.forEach(
              (l: {
                exercise_id?: string;
                set_number?: number;
                reps_completed?: number;
                weight_kg?: number;
                notes?: string;
              }) => {
                const exName = 'Esercizio Registrato';
                if (!exMap.has(exName))
                  exMap.set(exName, { sets: [], notesSet: new Set<string>() });
                const entry = exMap.get(exName)!;
                entry.sets.push({
                  setNumber: l.set_number || 1,
                  reps: l.reps_completed || 0,
                  weightKg: l.weight_kg || 0,
                });
                if (l.notes) entry.notesSet.add(l.notes);
              }
            );
            const exercises: PastSessionExercise[] = Array.from(exMap.entries()).map(
              ([name, { sets, notesSet }]) => ({
                name,
                sets: sets.sort((a, b) => a.setNumber - b.setNumber),
                notes: Array.from(notesSet).join(' • '),
              })
            );
            setSessionLogsMap((prev) => ({ ...prev, [sessionId]: exercises }));
          }
        } catch {
          // ignore local fallback error
        }
      }
    } catch (err) {
      console.warn('Errore lazy-load logs sessione:', err);
    } finally {
      setLoadingLogsId(null);
    }
  };

  const handleToggleExpand = (sessionId: string) => {
    if (expandedSessionId === sessionId) {
      setExpandedSessionId(null);
    } else {
      setExpandedSessionId(sessionId);
      loadLogsForSession(sessionId);
    }
  };

  useEffect(() => {
    if (pastSessions.length === 0 && (!initialSessions || initialSessions.length === 0)) {
      fetchPastSessions();
    }

    const handleWorkoutCompleted = () => {
      setTimeout(() => fetchPastSessions(), 500);
    };

    window.addEventListener('athlete_workout_completed', handleWorkoutCompleted);
    window.addEventListener('athlete_workout_skipped', handleWorkoutCompleted);

    return () => {
      window.removeEventListener('athlete_workout_completed', handleWorkoutCompleted);
      window.removeEventListener('athlete_workout_skipped', handleWorkoutCompleted);
    };
  }, [fetchPastSessions, initialSessions, pastSessions.length]);

  // ─── RAGGRUPPAMENTO GERARCHICO: SCHEDA -> SETTIMANA -> SESSIONI ───
  const { activeGroup, archivedGroups } = useMemo(() => {
    const cleanedActiveTitle = cleanWorkoutTitle(activeWorkoutTitle);
    const groupsMap = new Map<
      string,
      {
        groupKey: string;
        workoutTitle: string;
        isActiveWorkout: boolean;
        latestDate: string;
        weeksMap: Map<number, PastSession[]>;
      }
    >();

    pastSessions.forEach((s) => {
      const normalizedTitle = s.workoutTitle.toLowerCase();
      const isWithinCurrentCycle = isSessionWithinAssignmentCycle(
        { end_time: s.date },
        activeAssignedDate
      );
      const isMatchActive =
        isWithinCurrentCycle &&
        ((activeWorkoutId && s.workoutId === activeWorkoutId) ||
          (cleanedActiveTitle &&
            normalizedTitle === cleanedActiveTitle.toLowerCase()));

      const groupKey = isMatchActive ? '__ACTIVE__' : `${normalizedTitle}__archived`;
      const displayTitle = isMatchActive ? cleanedActiveTitle : s.workoutTitle;

      if (!groupsMap.has(groupKey)) {
        groupsMap.set(groupKey, {
          groupKey,
          workoutTitle: displayTitle,
          isActiveWorkout: Boolean(isMatchActive),
          latestDate: s.date,
          weeksMap: new Map<number, PastSession[]>(),
        });
      }

      const grp = groupsMap.get(groupKey)!;
      if (s.date > grp.latestDate) grp.latestDate = s.date;

      const wNum = s.weekNumber || 1;
      if (!grp.weeksMap.has(wNum)) {
        grp.weeksMap.set(wNum, []);
      }
      grp.weeksMap.get(wNum)!.push(s);
    });

    const allGroups: WorkoutGroupBucket[] = Array.from(groupsMap.values()).map((g) => {
      const weeks: WorkoutWeekBucket[] = Array.from(g.weeksMap.entries())
        .sort((a, b) => b[0] - a[0]) // Settimana più recente in alto
        .map(([weekNumber, sessions]) => ({
          weekNumber,
          sessions,
        }));

      const totalSessions = weeks.reduce((acc, w) => acc + w.sessions.length, 0);

      return {
        groupKey: g.groupKey,
        workoutTitle: g.workoutTitle,
        isActiveWorkout: g.isActiveWorkout,
        totalSessions,
        latestDate: g.latestDate,
        weeks,
      };
    });

    // Se l'atleta non ha un activeWorkoutId impostato (nessuna scheda attiva),
    // promuovi il gruppo più recente; altrimenti se ha una nuova scheda attiva con 0 sessioni svolte,
    // le vecchie schede restano ordinatamente in Archivio Schede Precedenti!
    let resolvedActive = allGroups.find((g) => g.isActiveWorkout) || null;
    let resolvedArchived = allGroups.filter((g) => !g.isActiveWorkout);

    if (!resolvedActive && !activeWorkoutId && allGroups.length > 0) {
      resolvedActive = allGroups[0];
      resolvedArchived = allGroups.slice(1);
    }

    return {
      activeGroup: resolvedActive,
      archivedGroups: resolvedArchived,
    };
  }, [pastSessions, activeWorkoutId, activeWorkoutTitle, activeAssignedDate]);

  // Apri automaticamente la settimana più recente della scheda attiva (o apri l'archivio se la nuova scheda non ha ancora sedute)
  useEffect(() => {
    if (activeGroup && activeGroup.weeks.length > 0) {
      const latestWeek = activeGroup.weeks[0].weekNumber;
      const defaultKey = `${activeGroup.groupKey}_w_${latestWeek}`;
      setOpenWeekKeys((prev) => {
        if (Object.keys(prev).length > 0) return prev;
        return { [defaultKey]: true };
      });
    } else if (!activeGroup && archivedGroups.length > 0) {
      setIsArchiveOpen(true);
    }
  }, [activeGroup, archivedGroups.length]);

  const toggleWeekOpen = (weekKey: string) => {
    setOpenWeekKeys((prev) => ({
      ...prev,
      [weekKey]: !prev[weekKey],
    }));
  };

  const toggleArchiveWorkoutOpen = (groupKey: string, firstWeekNumber?: number) => {
    setOpenArchiveWorkoutKeys((prev) => {
      const nextState = !prev[groupKey];
      if (nextState && typeof firstWeekNumber === 'number') {
        const wKey = `${groupKey}_w_${firstWeekNumber}`;
        setOpenWeekKeys((wPrev) => ({ ...wPrev, [wKey]: true }));
      }
      return { ...prev, [groupKey]: nextState };
    });
  };

  const renderSessionCard = (session: PastSession) => {
    const isExpanded = expandedSessionId === session.id;

    return (
      <div
        key={session.id}
        className="p-3.5 sm:p-4 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-border)] transition-all space-y-3 hover:border-[var(--color-primary)]/40 shadow-2xs"
      >
        <div
          onClick={() => handleToggleExpand(session.id)}
          className="flex items-center justify-between gap-3 cursor-pointer select-none"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/35 flex items-center justify-center text-emerald-500 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h5 className="text-sm sm:text-base font-black text-[var(--color-text)] truncate">
                {session.dayName}
              </h5>
              <div className="flex items-center gap-2 flex-wrap text-xs text-[var(--color-text-muted)] font-medium mt-0.5">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 opacity-75" />
                  {new Date(session.date).toLocaleDateString('it-IT', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
                {session.durationMinutes !== null && (
                  <>
                    <span className="opacity-50">•</span>
                    <span className="inline-flex items-center gap-1 text-[var(--color-primary)] font-bold">
                      <Clock className="w-3.5 h-3.5" />
                      {session.durationMinutes} min
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {session.rpe > 0 && (
              <span className="text-[11px] font-black px-2.5 py-1 rounded-xl bg-[var(--color-surface-strong)] border border-[var(--color-border)] text-[var(--color-text)]">
                RPE {session.rpe}/10
              </span>
            )}
            <div className="w-8 h-8 rounded-xl bg-[var(--color-surface-strong)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-primary)]">
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </div>
        </div>

        {/* Dettaglio Esercizi, Carichi e Serie (Lazy-Loaded) */}
        {isExpanded && (
          <div className="pt-3 border-t border-[var(--color-border)] space-y-2.5 animate-in fade-in duration-150">
            {session.notes && (
              <div className="p-2.5 rounded-xl bg-[var(--color-surface-strong)] border border-[var(--color-border)] text-xs text-[var(--color-text)]">
                <strong className="text-[var(--color-primary)]">Note Allenamento:</strong> &ldquo;{session.notes}&rdquo;
              </div>
            )}

            {loadingLogsId === session.id ? (
              <div className="py-4 text-center text-[var(--color-text-muted)] text-xs flex items-center justify-center gap-2 font-medium">
                <div className="w-4 h-4 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
                <span>Caricamento carichi e serie...</span>
              </div>
            ) : (sessionLogsMap[session.id] || []).length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)] italic py-1.5">
                {session.status === 'skipped'
                  ? `Sessione saltata: ${session.skipReason || 'Motivi personali'}`
                  : 'Nessun dettaglio di carico registrato per questa seduta.'}
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {(sessionLogsMap[session.id] || []).map((ex, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-[var(--color-surface-strong)] border border-[var(--color-border)] space-y-2"
                  >
                    <span className="text-xs sm:text-sm font-black text-[var(--color-text)] block">
                      {ex.name}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {ex.sets.map((set, setIdx) => (
                        <span
                          key={setIdx}
                          className="text-[11px] font-bold px-2 py-1 rounded-lg bg-[var(--color-panel)] border border-[var(--color-border)] text-[var(--color-text)]"
                        >
                          S{set.setNumber}:{' '}
                          <strong className="text-[var(--color-primary)] font-black">
                            {set.reps}
                          </strong>{' '}
                          × <strong className="font-black">{set.weightKg}kg</strong>
                        </span>
                      ))}
                    </div>
                    {ex.notes && (
                      <div className="p-2 rounded-lg bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/25 text-[11px] text-[var(--color-text)] font-medium leading-relaxed">
                        💬 <strong className="font-bold text-[var(--color-primary)]">Feedback:</strong>{' '}
                        {ex.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderWeeksAccordion = (group: WorkoutGroupBucket) => {
    return (
      <div className="space-y-2">
        {group.weeks.map((weekBucket) => {
          const weekKey = `${group.groupKey}_w_${weekBucket.weekNumber}`;
          const isWeekOpen = Boolean(openWeekKeys[weekKey]);

          return (
            <div
              key={weekKey}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-strong)]/60 overflow-hidden transition-all"
            >
              <button
                type="button"
                onClick={() => toggleWeekOpen(weekKey)}
                className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-[var(--color-surface-strong)] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="px-2.5 py-1 rounded-lg bg-[var(--color-primary)]/15 text-[var(--color-primary)] border border-[var(--color-primary)]/35 text-xs font-black">
                    Settimana {weekBucket.weekNumber}
                  </span>
                  <span className="text-xs font-bold text-[var(--color-text-muted)]">
                    {weekBucket.sessions.length}{' '}
                    {weekBucket.sessions.length === 1 ? 'seduta svolta' : 'sedute svolte'}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0 text-xs font-bold text-[var(--color-text-muted)]">
                  <span className="hidden sm:inline">
                    {isWeekOpen ? 'Chiudi' : 'Vedi sedute'}
                  </span>
                  {isWeekOpen ? (
                    <ChevronUp className="w-4 h-4 text-[var(--color-primary)]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[var(--color-primary)]" />
                  )}
                </div>
              </button>

              {isWeekOpen && (
                <div className="p-3 pt-1 space-y-2 border-t border-[var(--color-border)]/60 animate-in fade-in duration-150">
                  {weekBucket.sessions.map((s) => renderSessionCard(s))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (pastSessions.length === 0 && !loadingSessions) {
    return null;
  }

  return (
    <div className="p-4 sm:p-6 rounded-3xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-md space-y-4 transition-all">
      {/* Header Sezione Cliccabile */}
      <div
        onClick={() => setIsHistoryOpen((prev) => !prev)}
        className="flex items-center justify-between gap-3 cursor-pointer select-none group"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)] shrink-0 shadow-sm group-hover:scale-105 transition-transform">
            <Activity className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-black text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">
              Storico Allenamenti Svolti
            </h3>
          </div>
        </div>

        {/* Pulsante Tendina */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsHistoryOpen((prev) => !prev);
          }}
          className={`min-h-[40px] px-3.5 py-2 rounded-xl border text-xs font-black flex items-center gap-1.5 transition-all shadow-2xs shrink-0 cursor-pointer active:scale-95 ${
            isHistoryOpen
              ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border-[var(--color-primary)]/40'
              : 'bg-[var(--color-surface-strong)] hover:bg-[var(--color-surface)] text-[var(--color-text)] border-[var(--color-border)]'
          }`}
        >
          <span>{isHistoryOpen ? 'Chiudi' : 'Apri'}</span>
          {isHistoryOpen ? (
            <ChevronUp className="w-4 h-4 text-[var(--color-primary)]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[var(--color-primary)]" />
          )}
        </button>
      </div>

      {/* Anteprima Compatta quando la tendina è chiusa */}
      {!isHistoryOpen && pastSessions.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3 border-t border-[var(--color-border)] text-xs">
          <div className="flex items-center gap-2 text-[var(--color-text-muted)] flex-wrap min-w-0">
            <span className="font-black text-[var(--color-text)]">Ultima seduta:</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[var(--color-surface-strong)] border border-[var(--color-border)] font-bold text-[var(--color-text)] truncate max-w-full">
              <Dumbbell className="w-3.5 h-3.5 text-[var(--color-primary)] shrink-0" />
              <span className="truncate">
                Sett. {pastSessions[0].weekNumber} • {pastSessions[0].dayName}
              </span>
              <span className="opacity-50">•</span>
              <span className="text-[var(--color-text-muted)] shrink-0">
                {new Date(pastSessions[0].date).toLocaleDateString('it-IT')}
              </span>
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsHistoryOpen(true)}
            className="text-xs font-black text-[var(--color-primary)] hover:underline flex items-center gap-1 cursor-pointer self-start sm:self-auto shrink-0"
          >
            <span>Sfoglia per settimana</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Contenuto Espanso Raggruppato per Scheda -> Settimana */}
      {isHistoryOpen && (
        <div className="space-y-4 pt-3 border-t border-[var(--color-border)] animate-in fade-in duration-200">
          {loadingSessions ? (
            <div className="py-8 text-center text-[var(--color-text-muted)] text-xs flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
              <span>Caricamento storico...</span>
            </div>
          ) : (
            <>
              {/* 1. SCHEDA ATTIVA DIVISA PER SETTIMANE */}
              {activeGroup && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <Layers className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                      <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[var(--color-text)] truncate">
                        {activeGroup.workoutTitle}
                      </h4>
                    </div>
                    <span className="text-[11px] font-bold text-[var(--color-text-muted)] shrink-0">
                      {activeGroup.weeks.length}{' '}
                      {activeGroup.weeks.length === 1 ? 'settimana' : 'settimane'}
                    </span>
                  </div>

                  {renderWeeksAccordion(activeGroup)}
                </div>
              )}

              {/* 2. ARCHIVIO SCHEDE PRECEDENTI (CHIUDIBILE) */}
              {archivedGroups.length > 0 && (
                <div className="pt-2 border-t border-[var(--color-border)]">
                  <button
                    type="button"
                    onClick={() => setIsArchiveOpen((prev) => !prev)}
                    className="w-full px-4 py-3 rounded-2xl bg-[var(--color-surface-strong)] hover:bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-between gap-3 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FolderArchive className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                      <span className="text-xs sm:text-sm font-black text-[var(--color-text)] truncate">
                        Archivio Schede Precedenti
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[var(--color-panel)] border border-[var(--color-border)] text-[10px] font-black text-[var(--color-text-muted)] shrink-0">
                        {archivedGroups.length}{' '}
                        {archivedGroups.length === 1 ? 'scheda' : 'schede'}
                      </span>
                    </div>
                    {isArchiveOpen ? (
                      <ChevronUp className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                    )}
                  </button>

                  {isArchiveOpen && (
                    <div className="mt-2.5 space-y-2.5 pl-1 sm:pl-2 animate-in fade-in duration-150">
                      {archivedGroups.map((archGroup) => {
                        const isArchWorkoutOpen = Boolean(
                          openArchiveWorkoutKeys[archGroup.groupKey]
                        );
                        return (
                          <div
                            key={archGroup.groupKey}
                            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] overflow-hidden"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                toggleArchiveWorkoutOpen(
                                  archGroup.groupKey,
                                  archGroup.weeks[0]?.weekNumber
                                )
                              }
                              className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-[var(--color-surface-strong)]/60 transition-colors cursor-pointer"
                            >
                              <div className="min-w-0">
                                <h5 className="text-xs sm:text-sm font-black text-[var(--color-text)] truncate">
                                  {archGroup.workoutTitle}
                                </h5>
                                <p className="text-[11px] text-[var(--color-text-muted)] font-medium mt-0.5">
                                  {archGroup.totalSessions} sedute registrate •{' '}
                                  {archGroup.weeks.length}{' '}
                                  {archGroup.weeks.length === 1 ? 'settimana' : 'settimane'}
                                </p>
                              </div>
                              {isArchWorkoutOpen ? (
                                <ChevronUp className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                              )}
                            </button>

                            {isArchWorkoutOpen && (
                              <div className="p-3 pt-1 border-t border-[var(--color-border)]/60">
                                {renderWeeksAccordion(archGroup)}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
