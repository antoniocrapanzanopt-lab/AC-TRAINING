import React, { useState, useEffect } from 'react';
import {
  Dumbbell,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  Activity,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface PastSessionExercise {
  name: string;
  sets: { setNumber: number; reps: number; weightKg: number }[];
  notes?: string;
}

interface PastSession {
  id: string;
  workoutTitle: string;
  weekNumber?: number;
  dayName?: string;
  date: string;
  durationMinutes: number;
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
  activeWorkoutTitle?: string;
  initialSessions?: SessionRow[];
}

export const AthleteWorkoutHistory: React.FC<AthleteWorkoutHistoryProps> = ({
  athleteId,
  athleteIds,
  activeWorkoutTitle,
  initialSessions,
}) => {
  const mapSessions = React.useCallback((sessionList: SessionRow[]): PastSession[] => {
    return sessionList
      .slice()
      .sort((a, b) => {
        const timeA = new Date(a.end_time || a.start_time || 0).getTime();
        const timeB = new Date(b.end_time || b.start_time || 0).getTime();
        return timeB - timeA;
      })
      .map((session) => {
        const start = new Date(String(session.start_time || ''));
        const end = new Date(String(session.end_time || ''));
        const diffMs = end.getTime() - start.getTime();
        const durationMinutes = Math.max(1, Math.round(diffMs / 60000));

        const rawTitle = session.workouts?.title;
        const isPlaceholder =
          !rawTitle ||
          rawTitle.trim() === '' ||
          rawTitle.toLowerCase() === 'aaaa' ||
          rawTitle.toLowerCase() === 'allenamento' ||
          rawTitle.toLowerCase() === 'allenamento svolto';
        const finalTitle = isPlaceholder ? (activeWorkoutTitle || 'Scheda Personalizzata') : rawTitle;

        const dateStr = session.end_time ? String(session.end_time).slice(0, 10) : new Date().toISOString().slice(0, 10);
        const rawW = Number(session.week_number) || 1;
        const totalW = session.workouts?.total_weeks;
        const safeW = totalW && totalW > 0 && rawW > totalW ? totalW : rawW;

        const statusVal = session.status === 'skipped' ? 'skipped' : 'completed';

        return {
          id: String(session.id),
          workoutTitle: finalTitle,
          weekNumber: safeW,
          dayName: String(session.day_name || 'Giorno 1'),
          date: dateStr,
          durationMinutes: session.status === 'skipped' ? 0 : durationMinutes,
          rpe: Number(session.rpe) || 0,
          notes: session.notes ? String(session.notes) : undefined,
          status: statusVal,
          skipReason: session.skip_reason ? String(session.skip_reason) : undefined,
          skipNotes: session.skip_notes ? String(session.skip_notes) : undefined,
          coachJustified: session.coach_justified,
          coachFeedback: session.coach_feedback ? String(session.coach_feedback) : undefined,
        };
      });
  }, [activeWorkoutTitle]);

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
      } catch {}
    }
    return [];
  });
  const [loadingSessions, setLoadingSessions] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(3);
  const [sessionLogsMap, setSessionLogsMap] = useState<Record<string, PastSessionExercise[]>>({});
  const [loadingLogsId, setLoadingLogsId] = useState<string | null>(null);

  const idsKey = (athleteIds || []).filter(Boolean).sort().join(',');
  const targetAthleteIds = React.useMemo(() => {
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

  // Lazy load dello storico: usa le sessioni già caricate dal parent oppure scaricale solo se la tendina viene aperta
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

  // Lazy load per exercise_logs solo quando una sessione viene espansa
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

        const exMap = new Map<string, { sets: { setNumber: number; reps: number; weightKg: number }[]; notesSet: Set<string> }>();
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
            entry.notesSet.add(log.notes);
          }
        });

        const exercises: PastSessionExercise[] = Array.from(exMap.entries()).map(([name, { sets, notesSet }]) => ({
          name,
          sets: sets.sort((a, b) => a.setNumber - b.setNumber),
          notes: Array.from(notesSet).join(' | '),
        }));

        setSessionLogsMap((prev) => ({ ...prev, [sessionId]: exercises }));
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

  if (pastSessions.length === 0 && !loadingSessions) {
    return null;
  }

  return (
    <div className="p-4 sm:p-6 rounded-3xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-md space-y-4 transition-all">
      {/* Header Sezione Cliccabile */}
      <div
        onClick={() => setIsHistoryOpen((prev) => !prev)}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none group"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)] shrink-0 shadow-sm group-hover:scale-105 transition-transform">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-white group-hover:text-[var(--color-primary)] transition-colors">
                Storico Allenamenti Svolti
              </h3>
              <span className="text-xs sm:text-sm font-black text-amber-400 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/35">
                {pastSessions.length} completati
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 font-medium">
              Consulta carichi, serie e note registrate nelle tue sessioni
            </p>
          </div>
        </div>

        {/* Pulsante Tendina */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsHistoryOpen((prev) => !prev);
          }}
          className={`min-h-[42px] px-4 py-2 rounded-xl border text-xs sm:text-sm font-black flex items-center gap-2 transition-all shadow-sm shrink-0 cursor-pointer self-start sm:self-center active:scale-95 ${
            isHistoryOpen
              ? 'bg-[var(--color-primary)]/25 text-[var(--color-primary)] border-[var(--color-primary)]/40'
              : 'bg-[var(--color-surface-strong)] hover:bg-[var(--color-surface)] text-white border-[var(--color-border)]'
          }`}
        >
          <span>{isHistoryOpen ? 'Chiudi' : 'Vedi Storico'}</span>
          {isHistoryOpen ? (
            <ChevronUp className="w-4 h-4 text-[var(--color-primary)]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[var(--color-primary)]" />
          )}
        </button>
      </div>

      {/* Anteprima Compatta quando la tendina è chiusa */}
      {!isHistoryOpen && pastSessions.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[var(--color-border)] text-xs sm:text-sm">
          <div className="flex items-center gap-2 text-slate-300 flex-wrap">
            <span className="font-black text-white">Ultima sessione:</span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--color-surface-strong)] border border-[var(--color-border)] font-bold text-white truncate">
              <Dumbbell className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
              <span className="truncate">{pastSessions[0].workoutTitle}</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-300">{new Date(pastSessions[0].date).toLocaleDateString('it-IT')}</span>
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsHistoryOpen(true)}
            className="text-xs sm:text-sm font-black text-amber-400 hover:underline flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <span>Mostra tutti i {pastSessions.length} workout</span>
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Contenuto Completo Espanso */}
      {isHistoryOpen && (
        <div className="space-y-3 pt-3 border-t border-[var(--color-border)] animate-in fade-in duration-200">
          {loadingSessions ? (
            <div className="py-8 text-center text-[var(--color-text-muted)] text-xs flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
              <span>Caricamento storico...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {pastSessions.slice(0, visibleCount).map((session) => {
                const isExpanded = expandedSessionId === session.id;

                return (
                  <div
                    key={session.id}
                    className="p-4 sm:p-5 rounded-2xl bg-[var(--color-surface-strong)] border border-[var(--color-border)] transition-all space-y-3 hover:border-[var(--color-primary)]/40 shadow-sm"
                  >
                    <div
                      onClick={() => handleToggleExpand(session.id)}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)] shrink-0">
                          <Dumbbell className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-base sm:text-lg font-black text-white">{session.workoutTitle}</h4>
                            <span className="text-xs sm:text-sm font-black px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/35">
                              Settimana {session.weekNumber || 1}
                              {session.dayName ? ` • ${session.dayName}` : ''}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-300 flex items-center gap-2 mt-1 font-medium">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <span>{new Date(session.date).toLocaleDateString('it-IT')}</span>
                            <span>•</span>
                            <Clock className="w-4 h-4 text-slate-400" />
                            <span>{session.durationMinutes} min</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        {session.rpe > 0 && (
                          <span className="text-xs sm:text-sm font-black px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white">
                            RPE: {session.rpe}/10
                          </span>
                        )}
                        <button
                          type="button"
                          className="p-1.5 text-slate-300 hover:text-white cursor-pointer"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-[var(--color-primary)]" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-[var(--color-primary)]" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Dettaglio Esercizi, Carichi e Serie (Lazy-Loaded) */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-[var(--color-border)] space-y-3">
                        {session.notes && (
                          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-700 text-xs sm:text-sm text-slate-200">
                            <strong className="text-amber-400">Note Allenamento:</strong> "{session.notes}"
                          </div>
                        )}

                        {loadingLogsId === session.id ? (
                          <div className="py-4 text-center text-slate-300 text-xs sm:text-sm flex items-center justify-center gap-2 font-medium">
                            <div className="w-5 h-5 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
                            <span>Caricamento dettagli carichi e serie...</span>
                          </div>
                        ) : (sessionLogsMap[session.id] || []).length === 0 ? (
                          <p className="text-xs sm:text-sm text-slate-300 italic py-2">
                            {session.status === 'skipped'
                              ? `Sessione saltata: ${session.skipReason || 'Motivi personali'}`
                              : 'Nessun carico registrato in questa sessione.'}
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {(sessionLogsMap[session.id] || []).map((ex, i) => (
                              <div
                                key={i}
                                className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5"
                              >
                                <span className="text-sm sm:text-base font-black text-white block">{ex.name}</span>
                                <div className="flex flex-wrap gap-2">
                                  {ex.sets.map((set, setIdx) => (
                                    <span
                                      key={setIdx}
                                      className="text-xs sm:text-sm font-bold px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white"
                                    >
                                      Set {set.setNumber}:{' '}
                                      <strong className="text-amber-400 font-black">{set.reps} reps</strong> @{' '}
                                      <strong className="text-white font-black">{set.weightKg}kg</strong>
                                    </span>
                                  ))}
                                </div>
                                {ex.notes && (
                                  <div className="mt-2 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/25 text-xs sm:text-sm text-amber-300 font-medium leading-relaxed">
                                    💬 <strong className="font-bold">Feedback:</strong> {ex.notes}
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
              })}

              {/* Controlli "Mostra altri" / "Riduci" */}
              {pastSessions.length > 3 && (
                <div className="flex items-center justify-center gap-2.5 pt-3 flex-wrap">
                  {visibleCount < pastSessions.length ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setVisibleCount((prev) => Math.min(pastSessions.length, prev + 5))}
                        className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[var(--color-surface-strong)] hover:bg-[var(--color-surface)] border border-[var(--color-border)] text-xs sm:text-sm font-black text-white transition-colors cursor-pointer"
                      >
                        Mostra altri 5 workout
                      </button>
                      <button
                        type="button"
                        onClick={() => setVisibleCount(pastSessions.length)}
                        className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[var(--color-primary)]/20 hover:bg-[var(--color-primary)]/30 text-[var(--color-primary)] border border-[var(--color-primary)]/40 text-xs sm:text-sm font-black transition-colors cursor-pointer"
                      >
                        Mostra tutti ({pastSessions.length})
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setVisibleCount(3)}
                      className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[var(--color-surface-strong)] hover:bg-[var(--color-surface)] border border-[var(--color-border)] text-xs sm:text-sm font-black text-slate-300 hover:text-white transition-colors cursor-pointer"
                    >
                      Riduci lista
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
