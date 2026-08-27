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
  exercises: {
    name: string;
    sets: { setNumber: number; reps: number; weightKg: number }[];
    notes?: string;
  }[];
}

interface AthleteWorkoutHistoryProps {
  athleteId: string;
  activeWorkoutTitle?: string;
}

export const AthleteWorkoutHistory: React.FC<AthleteWorkoutHistoryProps> = ({
  athleteId,
  activeWorkoutTitle,
}) => {
  const [pastSessions, setPastSessions] = useState<PastSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState<boolean>(true);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(3);

  useEffect(() => {
    const fetchPastSessions = async () => {
      if (!athleteId) {
        setLoadingSessions(false);
        return;
      }

      setLoadingSessions(true);
      try {
        const { data, error } = await supabase
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
            workouts ( title ),
            exercise_logs (
              set_number,
              reps_completed,
              weight_kg,
              notes,
              workout_exercises ( name, week_number, day_name )
            )
          `)
          .eq('athlete_id', athleteId)
          .not('end_time', 'is', null)
          .order('end_time', { ascending: false });

        if (error) throw error;

        if (data) {
          const mapped: PastSession[] = data.map((session: any) => {
            const start = new Date(session.start_time);
            const end = new Date(session.end_time);
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

            const exMap = new Map<string, { sets: any[]; notesSet: Set<string> }>();
            const logs = session.exercise_logs || [];
            let detectedWeek: number | undefined = undefined;
            let detectedDay: string | undefined = undefined;

            logs.forEach((log: any) => {
              if (log.workout_exercises?.week_number && !detectedWeek) {
                detectedWeek = log.workout_exercises.week_number;
              }
              if (log.workout_exercises?.day_name && !detectedDay) {
                detectedDay = log.workout_exercises.day_name;
              }

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

            const exercises = Array.from(exMap.entries()).map(([name, { sets, notesSet }]) => {
              sets.sort((a, b) => a.setNumber - b.setNumber);
              const notes = Array.from(notesSet).join(' | ');
              return { name, sets, notes };
            });

            return {
              id: session.id,
              workoutTitle: finalTitle,
              weekNumber: session.week_number || detectedWeek || 1,
              dayName: session.day_name || detectedDay || 'Giorno A',
              date: session.end_time.slice(0, 10),
              durationMinutes: session.status === 'skipped' ? 0 : durationMinutes,
              rpe: session.rpe || 0,
              notes: session.notes,
              status: session.status,
              skipReason: session.skip_reason,
              skipNotes: session.skip_notes,
              coachJustified: session.coach_justified,
              coachFeedback: session.coach_feedback,
              exercises,
            };
          });

          setPastSessions(mapped);
        }
      } catch (err) {
        console.warn('Errore lettura storico workout atleta:', err);
      } finally {
        setLoadingSessions(false);
      }
    };

    fetchPastSessions();
  }, [athleteId, activeWorkoutTitle]);

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
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)] shrink-0 shadow-sm group-hover:scale-105 transition-transform">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-black text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">
                Storico Allenamenti Svolti
              </h3>
              <span className="text-[11px] font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2.5 py-0.5 rounded-full border border-[var(--color-primary)]/20">
                {pastSessions.length} completati
              </span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
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
          className={`px-3.5 py-2 rounded-xl border text-xs font-black flex items-center gap-1.5 transition-all shadow-sm shrink-0 cursor-pointer self-start sm:self-center active:scale-95 ${
            isHistoryOpen
              ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border-[var(--color-primary)]/40'
              : 'bg-[var(--color-surface-strong)] hover:bg-[var(--color-surface)] text-[var(--color-text)] border-[var(--color-border)]'
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-[var(--color-border)] text-xs">
          <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
            <span className="font-bold text-[var(--color-text)]">Ultima sessione:</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[var(--color-surface-strong)] border border-[var(--color-border)] font-medium text-[var(--color-text)] truncate">
              <Dumbbell className="w-3.5 h-3.5 text-[var(--color-primary)] shrink-0" />
              <span className="truncate">{pastSessions[0].workoutTitle}</span>
              <span className="text-[var(--color-text-muted)]">•</span>
              <span className="text-[var(--color-text-muted)]">{new Date(pastSessions[0].date).toLocaleDateString('it-IT')}</span>
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsHistoryOpen(true)}
            className="text-xs font-black text-[var(--color-primary)] hover:underline flex items-center gap-1 cursor-pointer self-start sm:self-auto"
          >
            <span>Mostra tutti i {pastSessions.length} workout</span>
            <ChevronDown className="w-3.5 h-3.5" />
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
                    className="p-4 rounded-2xl bg-[var(--color-surface-strong)] border border-[var(--color-border)] transition-all space-y-3 hover:border-[var(--color-primary)]/40 shadow-sm"
                  >
                    <div
                      onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)] shrink-0">
                          <Dumbbell className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-[var(--color-text)]">{session.workoutTitle}</h4>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/30">
                              Settimana {session.weekNumber || 1}
                              {session.dayName ? ` • ${session.dayName}` : ''}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--color-text-muted)] flex items-center gap-2 mt-0.5">
                            <Calendar className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                            <span>{new Date(session.date).toLocaleDateString('it-IT')}</span>
                            <span>•</span>
                            <Clock className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                            <span>{session.durationMinutes} min</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        {session.rpe > 0 && (
                          <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)]">
                            RPE: {session.rpe}/10
                          </span>
                        )}
                        <button
                          type="button"
                          className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-[var(--color-primary)]" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-[var(--color-primary)]" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Dettaglio Esercizi, Carichi e Serie */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-[var(--color-border)] space-y-3">
                        {session.notes && (
                          <div className="p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text)]">
                            <strong className="text-[var(--color-primary)]">Note Allenamento:</strong> "{session.notes}"
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {session.exercises.map((ex, i) => (
                            <div
                              key={i}
                              className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-2"
                            >
                              <span className="text-xs font-bold text-[var(--color-text)] block">{ex.name}</span>
                              <div className="flex flex-wrap gap-1.5">
                                {ex.sets.map((set, setIdx) => (
                                  <span
                                    key={setIdx}
                                    className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-[var(--color-surface-strong)] border border-[var(--color-border)] text-[var(--color-text)]"
                                  >
                                    Set {set.setNumber}:{' '}
                                    <strong className="text-[var(--color-primary)]">{set.reps} reps</strong> @{' '}
                                    {set.weightKg}kg
                                  </span>
                                ))}
                              </div>
                              {ex.notes && (
                                <div className="mt-1.5 p-2 rounded-lg bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 text-[11px] text-[var(--color-primary)] font-medium leading-relaxed">
                                  💬 <strong>Feedback:</strong> {ex.notes}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Controlli "Mostra altri" / "Riduci" */}
              {pastSessions.length > 3 && (
                <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                  {visibleCount < pastSessions.length ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setVisibleCount((prev) => Math.min(pastSessions.length, prev + 5))}
                        className="px-4 py-2 rounded-xl bg-[var(--color-surface-strong)] hover:bg-[var(--color-surface)] border border-[var(--color-border)] text-xs font-bold text-[var(--color-text)] transition-colors cursor-pointer"
                      >
                        Mostra altri 5 workout
                      </button>
                      <button
                        type="button"
                        onClick={() => setVisibleCount(pastSessions.length)}
                        className="px-4 py-2 rounded-xl bg-[var(--color-primary)]/15 hover:bg-[var(--color-primary)]/25 text-[var(--color-primary)] border border-[var(--color-primary)]/30 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Mostra tutti ({pastSessions.length})
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setVisibleCount(3)}
                      className="px-4 py-2 rounded-xl bg-[var(--color-surface-strong)] hover:bg-[var(--color-surface)] border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
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
