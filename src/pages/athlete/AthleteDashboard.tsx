import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dumbbell,
  Play,
  RotateCcw,
  WifiOff,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Flame,
  Calendar,
  ShieldCheck,
  AlertCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { WorkoutTemplate, WorkoutExercise } from '../../types/workout';
import { useWorkouts } from '../../context/WorkoutsContext';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  getActiveWorkoutDraft,
  saveActiveWorkoutDraft,
  clearActiveWorkoutDraft,
  syncPendingWorkoutsWithServer,
  getPendingSyncQueue,
  ActiveWorkoutDraft,
} from '../../lib/offline/offlineWorkoutStorage';
import { PwaInstallBanner } from '../../components/pwa/PwaInstallBanner';
import { AthleteWorkoutHistory } from '../../components/athlete/AthleteWorkoutHistory';

interface AthleteDashboardProps {
  onStartWorkout: (workout: WorkoutTemplate, exercises: WorkoutExercise[], targetAthleteId?: string) => void;
}

// ─── COMPONENTE GIORNI DI ALLENAMENTO PULITO & LINEARE ─────────────────────────
interface WorkoutDayListProps {
  assigned: any;
  onStart: (assigned: any, week: number, day: string) => void;
  activeDraft: ActiveWorkoutDraft | null;
  user?: any;
  onProgressUpdate?: (map: Record<string, boolean>) => void;
}

const WorkoutDayList: React.FC<WorkoutDayListProps> = ({
  assigned,
  onStart,
  activeDraft,
  user,
  onProgressUpdate,
}) => {
  const progressKey = `builder_progress_${assigned.athlete_id}_${assigned.workout_id}`;

  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem(progressKey) || '{}');
    } catch {
      return {};
    }
  });

  const [sessionDetailsMap, setSessionDetailsMap] = useState<
    Record<string, { status?: string; skip_reason?: string; coach_justified?: boolean | null; skip_notes?: string }>
  >({});

  const [days, setDays] = useState<string[]>(['Giorno A', 'Giorno B', 'Giorno C', 'Giorno D', 'Giorno E']);

  // Carica i giorni reali presenti negli esercizi della scheda
  useEffect(() => {
    const fetchWorkoutDays = async () => {
      if (!assigned.workout_id) return;
      try {
        const { data: exData } = await supabase
          .from('workout_exercises')
          .select('day_name')
          .eq('workout_id', assigned.workout_id);

        if (exData && exData.length > 0) {
          const uniqueDays = Array.from(new Set(exData.map((e: any) => e.day_name || 'Giorno A')))
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

          if (uniqueDays.length > 0) {
            setDays(uniqueDays);
          }
        }
      } catch (err) {
        console.warn('Errore lettura giorni scheda atleta:', err);
      }
    };

    fetchWorkoutDays();
  }, [assigned.workout_id]);

  // Sincronizza i progressi dal DB
  const syncProgressFromDb = useCallback(async () => {
    try {
      const athId = assigned.athlete_id;
      const wId = assigned.workout_id;
      if (!athId || !wId) return;

      const athIds = Array.from(
        new Set([athId, user?.athleteId, user?.id].filter(Boolean) as string[])
      );
      const wIds = Array.from(
        new Set([wId, assigned.workout?.id, assigned.workout?.parent_template_id].filter(Boolean) as string[])
      );

      const { data } = await supabase
        .from('workout_sessions')
        .select('id, end_time, notes, status, skip_reason, skip_notes, coach_justified, week_number, day_name, workout_id')
        .in('athlete_id', athIds)
        .in('workout_id', wIds)
        .not('end_time', 'is', null)
        .order('start_time', { ascending: true });

      // Unisci le sessioni locali salvate se presenti
      let localSessionList: any[] = [];
      try {
        localSessionList = JSON.parse(localStorage.getItem('builder_local_sessions_backup') || '[]');
      } catch (_) {}

      const matchingLocal = localSessionList.filter(
        (ls) => ls && ls.end_time && (wIds.includes(ls.workout_id) || !ls.workout_id)
      );

      const allSessions = (data || []).concat(
        matchingLocal.filter((ls) => !(data || []).some((sd: any) => sd.id === ls.id))
      );

      const daysList = days.length > 0 ? days : ['Giorno A', 'Giorno B', 'Giorno C', 'Giorno D', 'Giorno E'];

      const currentMap: Record<string, boolean> = {};
      const detailsMap: Record<string, { status?: string; skip_reason?: string; coach_justified?: boolean | null; skip_notes?: string }> = {};

      if (allSessions && allSessions.length > 0) {
        allSessions.forEach((s: any, idx: number) => {
          const wNum = s.week_number || Math.floor(idx / Math.max(1, daysList.length)) + 1;
          const dName = s.day_name || daysList[idx % daysList.length];
          const key = `${wNum}-${dName}`;
          currentMap[key] = true;
          detailsMap[key] = {
            status: s.status,
            skip_reason: s.skip_reason,
            skip_notes: s.skip_notes,
            coach_justified: s.coach_justified,
          };
        });
      }

      setCompletedMap(currentMap);
      setSessionDetailsMap(detailsMap);
      localStorage.setItem(progressKey, JSON.stringify(currentMap));
      if (onProgressUpdate) {
        onProgressUpdate(currentMap);
      }
    } catch (e) {
      console.warn('Errore sync progressi da DB:', e);
    }
  }, [assigned.athlete_id, assigned.workout_id, assigned.workout?.id, assigned.workout?.parent_template_id, user, days, progressKey, onProgressUpdate]);

  useEffect(() => {
    syncProgressFromDb();

    const handleSkipEvent = () => syncProgressFromDb();
    window.addEventListener('athlete_workout_skipped', handleSkipEvent);
    return () => window.removeEventListener('athlete_workout_skipped', handleSkipEvent);
  }, [syncProgressFromDb]);

  const totalWeeks = assigned.workout?.total_weeks || 4;

  // Calcola la settimana attiva corrente
  const currentActiveWeek = useMemo(() => {
    for (let w = 1; w <= totalWeeks; w++) {
      const allDone = days.length > 0 && days.every((d) => completedMap[`${w}-${d}`]);
      if (!allDone) return w;
    }
    return totalWeeks;
  }, [totalWeeks, days, completedMap]);

  const [selectedWeek, setSelectedWeek] = useState<number>(currentActiveWeek);

  useEffect(() => {
    setSelectedWeek(currentActiveWeek);
  }, [currentActiveWeek]);

  // Trova il primo giorno non completato della settimana selezionata
  const nextPendingDay = useMemo(() => {
    return days.find((d) => !completedMap[`${selectedWeek}-${d}`]) || null;
  }, [days, completedMap, selectedWeek]);

  return (
    <div className="space-y-4 pt-2">
      {/* ─── SELETTORE SETTIMANE SCALABILE & TOUCH (SUPPORTA FINO A 12+ SETTIMANE) ─── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[var(--color-primary)]" />
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[var(--color-text)]">
              Settimana {selectedWeek} di {totalWeeks}
            </h3>
            {selectedWeek === currentActiveWeek && (
              <span className="px-2 py-0.5 rounded-full bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-[10px] font-black border border-[var(--color-primary)]/30">
                In corso
              </span>
            )}
          </div>

          {/* Frecce di Navigazione Rapida per scorrere qualsiasi numero di settimane (es. 1..12) */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={selectedWeek <= 1}
              onClick={() => setSelectedWeek((prev) => Math.max(1, prev - 1))}
              className="w-8 h-8 rounded-xl bg-[var(--color-panel)] hover:bg-[var(--color-surface-strong)] border border-[var(--color-panel-border)] disabled:opacity-25 disabled:pointer-events-none text-[var(--color-text)] flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
              title="Settimana precedente"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={selectedWeek >= totalWeeks}
              onClick={() => setSelectedWeek((prev) => Math.min(totalWeeks, prev + 1))}
              className="w-8 h-8 rounded-xl bg-[var(--color-panel)] hover:bg-[var(--color-surface-strong)] border border-[var(--color-panel-border)] disabled:opacity-25 disabled:pointer-events-none text-[var(--color-text)] flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
              title="Settimana successiva"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Barra Pillole Compatta con Scroll Orizzontale Fluido */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 -mx-1 px-1 touch-pan-x scroll-smooth">
          {Array.from({ length: totalWeeks }, (_, idx) => {
            const wNum = idx + 1;
            const isSelected = selectedWeek === wNum;
            const isWeekDone = days.every((d) => completedMap[`${wNum}-${d}`]);
            const isCurrent = currentActiveWeek === wNum;

            return (
              <button
                key={wNum}
                type="button"
                onClick={() => setSelectedWeek(wNum)}
                className={`px-3.5 sm:px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer select-none active:scale-95 shadow-sm whitespace-nowrap ${
                  isSelected
                    ? 'bg-[var(--color-primary)] text-slate-950 font-black shadow-md shadow-[var(--color-primary)]/20 ring-1 ring-[var(--color-primary)]'
                    : isWeekDone
                    ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 hover:bg-emerald-500/25'
                    : isCurrent
                    ? 'bg-[var(--color-panel)] text-[var(--color-text)] border border-[var(--color-primary)]/50'
                    : 'bg-[var(--color-panel)] text-[var(--color-text-muted)] border border-[var(--color-panel-border)] hover:text-[var(--color-text)]'
                }`}
              >
                <span>Sett. {wNum}</span>
                {isWeekDone ? (
                  <span className="text-emerald-500 font-black text-xs">✓</span>
                ) : isCurrent && !isSelected ? (
                  <span className="text-[10px] text-amber-500 font-bold">• Attiva</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── LISTA LINEARE DELLE SEDUTE (GIORNO PER GIORNO) ─── */}
      <div className="space-y-2.5 pt-1">
        {days.map((dayName, dayIndex) => {
          const key = `${selectedWeek}-${dayName}`;
          const isDone = Boolean(completedMap[key]);
          const detail = sessionDetailsMap[key];
          const isSkipped = detail?.status === 'skipped';

          const draftDayName = activeDraft?.exercises?.[0]?.day_name;
          const draftWeekNum = activeDraft?.exercises?.[0]?.week_number;
          const hasDraftProgress = Boolean(
            activeDraft &&
            ((activeDraft.elapsedSeconds && activeDraft.elapsedSeconds > 0) ||
             (activeDraft.completedSets && Object.values(activeDraft.completedSets).some((arr) => arr.some(Boolean))))
          );
          const isDraftForThisDay = Boolean(
            hasDraftProgress &&
              activeDraft &&
              (activeDraft.workout?.id === assigned.workout_id ||
                activeDraft.workout?.title === assigned.workout?.title) &&
              Boolean(draftDayName && draftDayName.trim().toLowerCase() === dayName.trim().toLowerCase()) &&
              (typeof draftWeekNum === 'number' ? draftWeekNum === selectedWeek : true)
          );

          const isNextUpcoming = !isDone && nextPendingDay === dayName && selectedWeek === currentActiveWeek && !isDraftForThisDay;

          return (
            <div
              key={dayName}
              onClick={() => onStart(assigned, selectedWeek, dayName)}
              className={`p-4 sm:p-5 rounded-2xl border transition-all flex items-center justify-between gap-3 shadow-sm cursor-pointer select-none group active:scale-[0.99] ${
                isSkipped
                  ? 'bg-amber-950/10 border-amber-500/30 hover:border-amber-500/50'
                  : isDone
                  ? 'bg-[var(--color-panel)]/60 border-[var(--color-panel-border)] hover:border-[var(--color-border)]'
                  : isDraftForThisDay
                  ? 'bg-amber-500/10 border-[var(--color-primary)] shadow-md shadow-[var(--color-primary)]/10 ring-1 ring-[var(--color-primary)]/40'
                  : isNextUpcoming
                  ? 'bg-[var(--color-panel)] border-[var(--color-primary)]/60 hover:border-[var(--color-primary)] shadow-md'
                  : 'bg-[var(--color-panel)] border-[var(--color-panel-border)] hover:border-[var(--color-primary)]/40'
              }`}
            >
              {/* Stato a Sinistra + Nome Giorno */}
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div
                  className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 transition-transform group-hover:scale-105 ${
                    isSkipped
                      ? detail?.coach_justified === true
                        ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                        : detail?.coach_justified === false
                        ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      : isDone
                      ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                      : isDraftForThisDay
                      ? 'bg-[var(--color-primary)] text-slate-950 shadow-md shadow-[var(--color-primary)]/30 animate-pulse'
                      : isNextUpcoming
                      ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/40'
                      : 'bg-[var(--color-surface-strong)] text-[var(--color-text-muted)] border border-[var(--color-border)]'
                  }`}
                >
                  {isSkipped ? (
                    detail?.coach_justified === true ? (
                      <ShieldCheck className="w-5 h-5 text-emerald-500" />
                    ) : detail?.coach_justified === false ? (
                      <XCircle className="w-5 h-5 text-rose-400" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-400" />
                    )
                  ) : isDone ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : isDraftForThisDay ? (
                    <RotateCcw className="w-5 h-5" />
                  ) : (
                    dayIndex + 1
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-base sm:text-lg font-black text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors truncate">
                      {dayName}
                    </h4>
                    {isSkipped ? (
                      detail?.coach_justified === true ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 text-[10px] font-black border border-emerald-500/30 shrink-0 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> Giustificato dal Coach
                        </span>
                      ) : detail?.coach_justified === false ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 text-[10px] font-black border border-rose-500/30 shrink-0 flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> Non Giustificato
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-black border border-amber-500/30 shrink-0 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> In attesa di valutazione
                        </span>
                      )
                    ) : isDone ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 text-[10px] font-black border border-emerald-500/30 shrink-0">
                        Completato
                      </span>
                    ) : isDraftForThisDay ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 text-[10px] font-black border border-amber-500/40 shrink-0">
                        In corso
                      </span>
                    ) : isNextUpcoming ? (
                      <span className="px-2 py-0.5 rounded-full bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-[10px] font-black border border-[var(--color-primary)]/30 shrink-0">
                        Oggi
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate">
                    {isSkipped
                      ? `Saltato: ${detail?.skip_reason || 'Motivi personali'}`
                      : isDone
                      ? 'Seduta già registrata col coach'
                      : isDraftForThisDay
                      ? 'Sessione salvata in sospeso'
                      : isNextUpcoming
                      ? 'Pronta per essere svolta'
                      : 'Seduta di allenamento'}
                  </p>
                </div>
              </div>

              {/* Azione a Destra */}
              <div className="shrink-0">
                {isDone ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStart(assigned, selectedWeek, dayName);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-[var(--color-surface-strong)] hover:bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-[var(--color-border)] text-xs font-bold transition-all cursor-pointer"
                  >
                    Rivedi
                  </button>
                ) : isDraftForThisDay ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStart(assigned, selectedWeek, dayName);
                    }}
                    className="px-4 py-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-slate-950 font-black text-xs transition-all cursor-pointer shadow-md flex items-center gap-1.5 active:scale-95"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Riprendi</span>
                  </button>
                ) : (
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[var(--color-surface-strong)] group-hover:bg-[var(--color-primary)] text-[var(--color-text-muted)] group-hover:text-slate-950 border border-[var(--color-border)] group-hover:border-[var(--color-primary)] flex items-center justify-center transition-all shadow-sm">
                    <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── DASHBOARD PRINCIPALE HOME OPERATIVA ATLETA ─────────────────────────────
export const AthleteDashboard: React.FC<AthleteDashboardProps> = ({ onStartWorkout }) => {
  const { myAssignedWorkouts, getExercisesForWorkout, loading } = useWorkouts();
  const { showSuccess, showError } = useToast();
  const { user } = useAuth();

  const athleteId = user?.athleteId || user?.id || 'ath-local';
  const athleteFirstName = useMemo(() => {
    if (user?.name && user.name.trim().length > 0) {
      const parts = user.name.trim().split(' ');
      const rawFirst = parts[0];
      const alphaOnly = rawFirst.replace(/[0-9._-]/g, '');
      if (alphaOnly.length >= 2) {
        return alphaOnly.charAt(0).toUpperCase() + alphaOnly.slice(1).toLowerCase();
      }
      return rawFirst;
    }
    if (user?.email) {
      const prefix = user.email.split('@')[0].replace(/[0-9._-]/g, '');
      if (prefix.length >= 2) {
        return prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase();
      }
    }
    return '';
  }, [user]);

  const [activeDraft, setActiveDraft] = useState<ActiveWorkoutDraft | null>(null);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);

  const checkDraftAndQueue = useCallback(() => {
    if (athleteId) {
      let draft = getActiveWorkoutDraft(athleteId);
      const hasAnyCompletedSet = draft?.completedSets && Object.values(draft.completedSets).some((arr) => arr.some(Boolean));
      const hasAnyTime = Boolean(draft && draft.elapsedSeconds && draft.elapsedSeconds > 0);

      // Se la bozza è vuota o azzerata, eliminala e non considerarla attiva
      if (draft && !hasAnyCompletedSet && !hasAnyTime) {
        clearActiveWorkoutDraft(athleteId);
        draft = null;
      }

      if (draft && myAssignedWorkouts.length > 0) {
        const matching = myAssignedWorkouts.find(
          (aw: any) =>
            aw.workout_id === draft?.workout?.id ||
            aw.workout?.id === draft?.workout?.id ||
            (draft?.workout?.title &&
              aw.workout?.title &&
              aw.workout.title.toLowerCase().includes('scheda') &&
              draft.workout.title.toLowerCase().includes('scheda'))
        );

        if (matching?.workout?.title && matching.workout.title !== draft.workout.title) {
          draft = {
            ...draft,
            workout: {
              ...draft.workout,
              title: matching.workout.title,
              description: matching.workout.description ?? draft.workout.description,
            },
          };
          saveActiveWorkoutDraft(draft);
        }
      }
      setActiveDraft(draft);
      const queue = getPendingSyncQueue();
      setPendingSyncCount(queue.length);
    }
  }, [athleteId, myAssignedWorkouts]);

  useEffect(() => {
    checkDraftAndQueue();

    const handleDraftEvent = () => checkDraftAndQueue();
    window.addEventListener('athlete_draft_updated', handleDraftEvent);
    window.addEventListener('pending_sync_queue_updated', handleDraftEvent);

    return () => {
      window.removeEventListener('athlete_draft_updated', handleDraftEvent);
      window.removeEventListener('pending_sync_queue_updated', handleDraftEvent);
    };
  }, [checkDraftAndQueue]);

  // Sincronizzazione automatica all'avvio e al ritorno online
  useEffect(() => {
    const handleSync = async () => {
      if (navigator.onLine) {
        const res = await syncPendingWorkoutsWithServer();
        if (res.syncedCount > 0) {
          showSuccess('Dati sincronizzati col coach', `${res.syncedCount} allenamento/i inviato/i con successo.`);
          checkDraftAndQueue();
        }
      }
    };

    handleSync();
    window.addEventListener('online', handleSync);
    return () => window.removeEventListener('online', handleSync);
  }, [showSuccess, checkDraftAndQueue]);

  const handleStartWorkout = async (assigned: any, selectedWeek?: number, selectedDay?: string) => {
    try {
      const allExercises = await getExercisesForWorkout(assigned.workout_id);

      const uniqueDays = Array.from(new Set(allExercises.map((e) => e.day_name || 'Giorno A')))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

      const targetWeek = selectedWeek || 1;
      const targetDay = (selectedDay && selectedDay.trim()) || (uniqueDays.length > 0 ? uniqueDays[0] : 'Giorno A');
      const targetDayNorm = targetDay.trim().toLowerCase();

      let filtered = allExercises.filter((ex) => {
        const exWeek = ex.week_number || 1;
        const exDay = (ex.day_name || 'Giorno A').trim().toLowerCase();
        return exWeek === targetWeek && exDay === targetDayNorm;
      });

      if (filtered.length === 0) {
        filtered = allExercises.filter((ex) => {
          const exDay = (ex.day_name || 'Giorno A').trim().toLowerCase();
          return exDay === targetDayNorm;
        });
      }

      if (filtered.length === 0 && allExercises.length > 0) {
        const firstDay = (allExercises[0].day_name || 'Giorno A').trim().toLowerCase();
        filtered = allExercises.filter((ex) => (ex.day_name || 'Giorno A').trim().toLowerCase() === firstDay);
      }

      const workoutObj = assigned.workout || {
        id: assigned.workout_id,
        title: assigned.workout?.title || 'Programma di Allenamento',
        description: assigned.workout?.description,
        total_weeks: assigned.workout?.total_weeks || 1,
      };

      onStartWorkout(workoutObj, filtered, assigned.athlete_id);
    } catch (err) {
      console.error('Errore avvio workout:', err);
      showError('Impossibile caricare gli esercizi della scheda');
    }
  };

  const handleResumeDraft = () => {
    if (!activeDraft) return;
    onStartWorkout(activeDraft.workout, activeDraft.exercises, activeDraft.targetAthleteId);
  };

  const handleDiscardDraft = () => {
    if (confirm('Vuoi annullare la sessione salvata e ricominciare da zero?')) {
      clearActiveWorkoutDraft(athleteId);
      setActiveDraft(null);
    }
  };

  // Identifica la prima scheda attiva e il prossimo allenamento di oggi
  const firstAssigned = myAssignedWorkouts[0];

  const [globalProgressMap, setGlobalProgressMap] = useState<Record<string, boolean>>(() => {
    if (!firstAssigned) return {};
    const athId = firstAssigned.athlete_id;
    const wId = firstAssigned.workout_id;
    const progressKey = `builder_progress_${athId}_${wId}`;
    try {
      return JSON.parse(localStorage.getItem(progressKey) || '{}');
    } catch (_) {
      return {};
    }
  });

  const handleProgressUpdate = useCallback((newMap: Record<string, boolean>) => {
    setGlobalProgressMap((prev) => {
      const prevKeys = Object.keys(prev);
      const newKeys = Object.keys(newMap);
      if (prevKeys.length === newKeys.length && prevKeys.every((k) => prev[k] === newMap[k])) {
        return prev;
      }
      return { ...newMap };
    });
  }, []);

  // Calcolo dinamico della settimana attiva e del prossimo giorno per l'Hero Card
  const { heroActiveWeek, heroNextDay, heroWeekCompletedCount, heroTotalDaysInWeek } = useMemo(() => {
    if (!firstAssigned) return { heroActiveWeek: 1, heroNextDay: 'Giorno A', heroWeekCompletedCount: 0, heroTotalDaysInWeek: 5 };

    const totalWeeks = firstAssigned.workout?.total_weeks || 4;
    const dayList = ['Giorno A', 'Giorno B', 'Giorno C', 'Giorno D', 'Giorno E'];

    for (let w = 1; w <= totalWeeks; w++) {
      const doneCount = dayList.filter((d) => globalProgressMap[`${w}-${d}`]).length;
      const pendingDay = dayList.find((d) => !globalProgressMap[`${w}-${d}`]);
      if (pendingDay) {
        return {
          heroActiveWeek: w,
          heroNextDay: pendingDay,
          heroWeekCompletedCount: doneCount,
          heroTotalDaysInWeek: dayList.length,
        };
      }
    }

    return {
      heroActiveWeek: totalWeeks,
      heroNextDay: 'Giorno A',
      heroWeekCompletedCount: dayList.length,
      heroTotalDaysInWeek: dayList.length,
    };
  }, [firstAssigned, globalProgressMap]);



  const heroProgressPercent = Math.min(100, Math.round((heroWeekCompletedCount / heroTotalDaysInWeek) * 100));

  if (loading && myAssignedWorkouts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 font-bold text-sm">Caricamento del tuo percorso...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-32 font-sans max-w-3xl mx-auto">
      {/* ─── 1. HEADER: SALUTO PULITO & MINIMALE ─── */}
      <div className="space-y-1">
        <h2 className="text-2xl sm:text-3xl font-black text-[var(--color-text)] tracking-tight">
          {athleteFirstName ? `Ciao ${athleteFirstName} 👋` : 'Il tuo Allenamento'}
        </h2>
        <p className="text-xs sm:text-sm text-[var(--color-text-muted)]">
          {firstAssigned?.workout?.title
            ? `Programma attivo: ${firstAssigned.workout.title}`
            : 'La tua home per raggiungere i tuoi obiettivi.'}
        </p>
      </div>

      {/* ─── BANNER INVITO AGGIUNGI AC ALLA HOME ─── */}
      <PwaInstallBanner />

      {/* ─── 2. FOCUS CARD PRINCIPALE (UNA SOLA CARD DI AZIONE DIRETTA) ─── */}
      {activeDraft ? (
        // STATO A: SESSIONE DA RIPRENDERE
        <div className="p-5 sm:p-6 rounded-3xl bg-[var(--color-panel)] border border-[var(--color-primary)] shadow-xl shadow-[var(--color-primary)]/10 space-y-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/40 flex items-center justify-center shrink-0 shadow-md">
              <RotateCcw className="w-6 h-6 animate-pulse" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-primary)] block">
                Sessione in sospeso
              </span>
              <h3 className="text-lg sm:text-xl font-black text-[var(--color-text)] truncate">
                {activeDraft.workout?.title}
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Ultimo salvataggio alle {new Date(activeDraft.lastSavedTimestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleResumeDraft}
              className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-primary)]/20 transition-all cursor-pointer active:scale-95"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Riprendi Sessione</span>
            </button>
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="w-full sm:w-auto py-3 px-4 rounded-2xl text-[var(--color-text-muted)] hover:text-rose-500 text-xs font-bold hover:bg-[var(--color-surface-strong)] transition-colors cursor-pointer text-center"
            >
              Scarta
            </button>
          </div>
        </div>
      ) : firstAssigned ? (
        // STATO B: LA SEDUTA DI OGGI PRONTA
        <div className="p-5 sm:p-6 rounded-3xl bg-[var(--color-panel)] border border-[var(--color-primary)]/40 shadow-lg space-y-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/15 text-[var(--color-primary)] border border-[var(--color-primary)]/30 flex items-center justify-center shrink-0 shadow-md">
              <Flame className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-primary)]">
                  Seduta di Oggi
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 text-[10px] font-black border border-emerald-500/30">
                  Settimana {heroActiveWeek}
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-[var(--color-text)] truncate mt-0.5">
                {heroNextDay} • {firstAssigned.workout?.title}
              </h3>
            </div>
          </div>

          {/* Barra di Progresso Settimana Pulita */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] font-bold">
              <span>Avanzamento Settimana {heroActiveWeek}</span>
              <span className="font-mono text-[var(--color-text)]">{heroWeekCompletedCount}/{heroTotalDaysInWeek} sedute ({heroProgressPercent}%)</span>
            </div>
            <div className="h-2 w-full bg-[var(--color-surface-strong)] rounded-full overflow-hidden border border-[var(--color-border)] p-0.5">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-[var(--color-primary)] rounded-full transition-all duration-500"
                style={{ width: `${heroProgressPercent}%` }}
              />
            </div>
          </div>

          {/* CTA Grande per aprire la scheda di oggi */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => handleStartWorkout(firstAssigned, heroActiveWeek, heroNextDay)}
              className="w-full py-3.5 px-6 rounded-2xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-primary)]/20 transition-all cursor-pointer active:scale-95"
            >
              <Eye className="w-4 h-4" />
              <span>Apri Scheda di Oggi ({heroNextDay})</span>
            </button>
          </div>
        </div>
      ) : null}

      {/* ─── 3. BANNER CODA SINCRONIZZAZIONE OFFLINE ─── */}
      {pendingSyncCount > 0 && (
        <div className="p-3.5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-primary)]/30 flex items-center justify-between text-xs text-[var(--color-text)] shadow-sm">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
            <span>
              <strong>{pendingSyncCount}</strong> allenamento/i salvato/i in locale in attesa di connessione.
            </span>
          </div>
          <button
            type="button"
            onClick={async () => {
              const res = await syncPendingWorkoutsWithServer();
              if (res.syncedCount > 0) {
                showSuccess('Dati sincronizzati!', `${res.syncedCount} allenamento/i caricato/i.`);
                checkDraftAndQueue();
              }
            }}
            className="px-3 py-1.5 rounded-xl bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/30 font-bold hover:bg-[var(--color-primary)]/30 transition-colors cursor-pointer shrink-0"
          >
            Sincronizza
          </button>
        </div>
      )}

      {/* ─── 4. TUTTI I GIORNI DELLA SCHEDA IN ELENCO LINEARE PULITO ─── */}
      {myAssignedWorkouts.length === 0 ? (
        <div className="bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-3xl p-8 sm:p-12 text-center space-y-3 shadow-md">
          <div className="w-14 h-14 bg-[var(--color-surface-strong)] rounded-2xl flex items-center justify-center mx-auto text-[var(--color-text-muted)]">
            <Dumbbell className="w-7 h-7" />
          </div>
          <h3 className="text-base sm:text-lg font-black text-[var(--color-text)]">Nessuna scheda assegnata</h3>
          <p className="text-[var(--color-text-muted)] text-xs max-w-sm mx-auto leading-relaxed">
            Il tuo coach non ti ha ancora assegnato un programma di allenamento. Riceverai una notifica non appena sarà pronto!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {myAssignedWorkouts.map((assigned: any) => (
            <WorkoutDayList
              key={assigned.id}
              assigned={assigned}
              onStart={handleStartWorkout}
              activeDraft={activeDraft}
              user={user}
              onProgressUpdate={handleProgressUpdate}
            />
          ))}
        </div>
      )}

      {/* ─── 5. STORICO ALLENAMENTI COMPLETATI (TENDINA ELEGANTE) ─── */}
      <AthleteWorkoutHistory
        athleteId={athleteId}
        activeWorkoutTitle={firstAssigned?.workout?.title}
      />
    </div>
  );
};
