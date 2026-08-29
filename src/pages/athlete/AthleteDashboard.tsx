import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dumbbell,
  RotateCcw,
  WifiOff,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
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
  onStartWorkout: (workout: WorkoutTemplate, exercises: WorkoutExercise[], targetAthleteId?: string, targetWeekNumber?: number) => void;
}

// ─── COMPONENTE GIORNI DI ALLENAMENTO PULITO & LINEARE ─────────────────────────
interface WorkoutDayListProps {
  assigned: any;
  onStart: (assigned: any, week: number, day: string) => void;
  activeDraft: ActiveWorkoutDraft | null;
  completedMap: Record<string, boolean>;
  sessionDetailsMap: Record<string, { status?: string; skip_reason?: string; coach_justified?: boolean | null; skip_notes?: string }>;
  days: string[];
}

const WorkoutDayList: React.FC<WorkoutDayListProps> = ({
  assigned,
  onStart,
  activeDraft,
  completedMap,
  sessionDetailsMap,
  days,
}) => {
  const totalWeeks = assigned.workout?.total_weeks || 5;
  const normDay = (str: string) => (str || '').trim().toLowerCase().replace(/\s+/g, ' ');

  // Calcola la settimana attiva corrente
  const currentActiveWeek = useMemo(() => {
    for (let w = 1; w <= totalWeeks; w++) {
      const allDone = days.length > 0 && days.every((d) => completedMap[`${w}-${d}`] || completedMap[`${w}-${normDay(d)}`]);
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
    return days.find((d) => !completedMap[`${selectedWeek}-${d}`] && !completedMap[`${selectedWeek}-${normDay(d)}`]) || null;
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
          const isDone = Boolean(completedMap[key] || completedMap[`${selectedWeek}-${normDay(dayName)}`]);
          const detail = sessionDetailsMap[key] || sessionDetailsMap[`${selectedWeek}-${normDay(dayName)}`];
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
              role="button"
              tabIndex={0}
              onClick={() => {
                console.log('[WorkoutDayList] Clicked Day Card:', { dayName, selectedWeek, isDone, isSkipped, isNextUpcoming });
                onStart(assigned, selectedWeek, dayName);
              }}
              className={`p-4 sm:p-5 rounded-2xl border transition-all flex items-center justify-between gap-3 shadow-sm cursor-pointer select-none group active:scale-[0.99] relative z-10 touch-manipulation ${
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
      console.log('[AthleteDashboard] Avvio workout richiesto:', { assigned, selectedWeek, selectedDay });
      const targetWIds = Array.from(
        new Set([assigned.workout_id, assigned.workout?.id, assigned.workout?.parent_template_id].filter(Boolean) as string[])
      );

      let allExercises: WorkoutExercise[] = [];
      for (const wId of targetWIds) {
        const exs = await getExercisesForWorkout(wId);
        if (exs && exs.length > 0) {
          allExercises = exs;
          break;
        }
      }

      console.log(`[AthleteDashboard] Esercizi recuperati dal DB: ${allExercises.length}`);

      const norm = (s: string) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
      const isDayMatch = (d1: string, d2: string) => {
        const n1 = norm(d1);
        const n2 = norm(d2);
        if (n1 === n2) return true;
        if (n1.startsWith(n2) || n2.startsWith(n1)) return true;
        const l1 = n1.replace(/[^a-z0-9]/g, '');
        const l2 = n2.replace(/[^a-z0-9]/g, '');
        return l1 === l2 || (l1.length > 0 && l2.length > 0 && (l1.includes(l2) || l2.includes(l1)));
      };

      const maxTotalWeeks = assigned.workout?.total_weeks || 1;
      const targetWeek = Math.min(maxTotalWeeks > 0 ? maxTotalWeeks : 1, Math.max(1, selectedWeek || 1));
      const targetDay = (selectedDay && selectedDay.trim()) || 'Giorno A';

      // 1. Filtra per settimana e giorno
      let filtered = allExercises.filter((ex) => {
        const exWeek = ex.week_number || 1;
        const exDay = ex.day_name || 'Giorno A';
        return exWeek === targetWeek && isDayMatch(exDay, targetDay);
      });

      // 2. Se non trova per settimana specifica, cerca per giorno in qualsiasi settimana
      if (filtered.length === 0) {
        filtered = allExercises.filter((ex) => isDayMatch(ex.day_name || 'Giorno A', targetDay));
      }

      // 3. Se ancora vuoto ma ci sono esercizi, usa tutti o i primi per evitare player vuoto
      if (filtered.length === 0 && allExercises.length > 0) {
        console.warn(`[AthleteDashboard] Nessun esercizio trovato per ${targetDay} (Settimana ${targetWeek}), uso fallback primi esercizi.`);
        const firstDay = allExercises[0].day_name || 'Giorno A';
        filtered = allExercises.filter((ex) => isDayMatch(ex.day_name || 'Giorno A', firstDay));
      }

      // Sanitizza e forza SEMPRE settimana e giorno corretti su tutti gli esercizi inviati al player
      const sanitizedFiltered: WorkoutExercise[] = (filtered.length > 0 ? filtered : allExercises).map((ex) => ({
        ...ex,
        week_number: targetWeek,
        day_name: targetDay,
      }));

      console.log(`[AthleteDashboard] Esercizi filtrati e sanitizzati per il player: ${sanitizedFiltered.length}`, sanitizedFiltered.map(e => `${e.name} (${e.day_name}, Sett.${e.week_number})`));

      const workoutObj = assigned.workout || {
        id: assigned.workout_id,
        title: assigned.workout?.title || 'Programma di Allenamento',
        description: assigned.workout?.description,
        total_weeks: assigned.workout?.total_weeks || 1,
      };

      onStartWorkout(workoutObj, sanitizedFiltered, assigned.athlete_id, targetWeek);
    } catch (err) {
      console.error('[AthleteDashboard] Errore avvio workout:', err);
      showError('Impossibile caricare gli esercizi della scheda');
    }
  };

  // Identifica la prima scheda attiva e il prossimo allenamento di oggi
  const firstAssigned = myAssignedWorkouts[0];

  const memoizedAthleteIds = useMemo(() => {
    return Array.from(new Set([firstAssigned?.athlete_id, user?.athleteId, user?.id].filter(Boolean) as string[]));
  }, [firstAssigned?.athlete_id, user?.athleteId, user?.id]);

  // ─── STATO PROGRESSO CENTRALIZZATO NEL PARENT (NON SI SMONTA MAI) ───────────
  const [cachedSessionsForHistory, setCachedSessionsForHistory] = useState<any[]>([]);
  const [globalProgressMap, setGlobalProgressMap] = useState<Record<string, boolean>>(() => {
    if (!firstAssigned) return {};
    try {
      const cached = localStorage.getItem(`builder_progress_${athleteId}_${firstAssigned.workout_id}`);
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  });
  const [globalSessionDetailsMap, setGlobalSessionDetailsMap] = useState<
    Record<string, { status?: string; skip_reason?: string; coach_justified?: boolean | null; skip_notes?: string }>
  >({});
  const [workoutDays, setWorkoutDays] = useState<string[]>(() => {
    if (!firstAssigned) return ['Giorno A', 'Giorno B', 'Giorno C', 'Giorno D', 'Giorno E'];
    try {
      const cached = localStorage.getItem(`builder_days_${firstAssigned.workout_id}`);
      return cached ? JSON.parse(cached) : ['Giorno A', 'Giorno B', 'Giorno C', 'Giorno D', 'Giorno E'];
    } catch {
      return ['Giorno A', 'Giorno B', 'Giorno C', 'Giorno D', 'Giorno E'];
    }
  });

  // Carica i giorni reali dalla scheda (nel parent, una volta sola)
  useEffect(() => {
    if (!firstAssigned) return;
    const targetWIds = Array.from(
      new Set([firstAssigned.workout_id, firstAssigned.workout?.id, firstAssigned.workout?.parent_template_id].filter(Boolean) as string[])
    );
    if (targetWIds.length === 0) return;
    supabase
      .from('workout_exercises')
      .select('day_name')
      .in('workout_id', targetWIds)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const unique = Array.from(new Set(data.map((e: any) => e.day_name || 'Giorno A')))
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
          if (unique.length > 0) {
            setWorkoutDays(unique);
            try {
              localStorage.setItem(`builder_days_${firstAssigned.workout_id}`, JSON.stringify(unique));
            } catch (_) {}
          }
        }
      });
  }, [firstAssigned?.workout_id, firstAssigned?.workout?.id, firstAssigned?.workout?.parent_template_id]);

  const isSyncingRef = React.useRef(false);

  // Sync progresso da Supabase — vive nel parent, sopravvive allo smontaggio del player
  const syncProgressFromDb = useCallback(async () => {
    if (!firstAssigned || isSyncingRef.current) return;
    const athIds = Array.from(
      new Set([firstAssigned.athlete_id, user?.athleteId, user?.id].filter(Boolean) as string[])
    );
    if (athIds.length === 0) return;

    isSyncingRef.current = true;
    const startTime = performance.now();

    const daysList = workoutDays.length > 0 ? workoutDays : ['Giorno A', 'Giorno B', 'Giorno C', 'Giorno D', 'Giorno E'];
    const totalWeeksCount = firstAssigned.workout?.total_weeks || 5;
    const norm = (str: string) => (str || '').trim().toLowerCase().replace(/\s+/g, ' ');

    interface DashboardSessionRow {
      id: string;
      week_number?: number | null;
      day_name?: string | null;
      status?: string | null;
      skip_reason?: string | null;
      skip_notes?: string | null;
      coach_justified?: boolean | null;
      start_time?: string | null;
      end_time?: string | null;
      rpe?: number | null;
      notes?: string | null;
      workout_id?: string | null;
      workouts?: { title: string } | null;
    }

    try {
      let rawSessions: DashboardSessionRow[] = [];
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('id, week_number, day_name, status, skip_reason, skip_notes, coach_justified, start_time, end_time, rpe, notes, workout_id, workouts(title)')
        .in('athlete_id', athIds)
        .not('end_time', 'is', null)
        .order('start_time', { ascending: true });

      if (error) {
        const retry = await supabase
          .from('workout_sessions')
          .select('id, week_number, day_name, status, start_time, end_time, rpe, notes, workout_id, workouts(title)')
          .in('athlete_id', athIds)
          .not('end_time', 'is', null)
          .order('start_time', { ascending: true });
        if (retry.error) {
          console.warn('[AthleteDashboard] Errore query workout_sessions:', retry.error);
          return;
        }
        rawSessions = (retry.data as unknown as DashboardSessionRow[]) || [];
      } else {
        rawSessions = (data as unknown as DashboardSessionRow[]) || [];
      }

      console.log(`[AthleteDashboard] syncProgressFromDb completato in ${(performance.now() - startTime).toFixed(1)}ms. Righe: ${rawSessions.length}`);

      const currentMap: Record<string, boolean> = {};
      const detailsMap: Record<string, { status?: string; skip_reason?: string; coach_justified?: boolean | null; skip_notes?: string }> = {};

      rawSessions.forEach((s, idx) => {
        const rawWeek = Number(s.week_number);
        const wNum = rawWeek > 0
          ? (totalWeeksCount > 0 ? Math.min(totalWeeksCount, rawWeek) : rawWeek)
          : Math.min(totalWeeksCount, Math.floor(idx / Math.max(1, daysList.length)) + 1);
        const dName = s.day_name || daysList[idx % Math.max(1, daysList.length)];
        [dName, norm(dName)].forEach((key) => {
          currentMap[`${wNum}-${key}`] = true;
          detailsMap[`${wNum}-${key}`] = {
            status: s.status || undefined,
            skip_reason: s.skip_reason || undefined,
            skip_notes: s.skip_notes || undefined,
            coach_justified: s.coach_justified,
          };
        });
      });

      setGlobalProgressMap(currentMap);
      setGlobalSessionDetailsMap(detailsMap);
      setCachedSessionsForHistory(rawSessions);

      // Aggiorna anche localStorage come cache
      athIds.forEach((aid) => {
        try { localStorage.setItem(`builder_progress_${aid}_${firstAssigned.workout_id}`, JSON.stringify(currentMap)); } catch (_) {}
      });
    } finally {
      isSyncingRef.current = false;
    }
  }, [firstAssigned, user, workoutDays, athleteId]);

  // Esegui sync all'avvio e ad ogni evento di completamento con debounce
  useEffect(() => {
    syncProgressFromDb();
    let timer: NodeJS.Timeout | null = null;
    const handleWorkoutDone = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => syncProgressFromDb(), 300);
    };
    window.addEventListener('athlete_workout_completed', handleWorkoutDone);
    window.addEventListener('athlete_workout_skipped', handleWorkoutDone);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('athlete_workout_completed', handleWorkoutDone);
      window.removeEventListener('athlete_workout_skipped', handleWorkoutDone);
    };
  }, [syncProgressFromDb]);

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
              completedMap={globalProgressMap}
              sessionDetailsMap={globalSessionDetailsMap}
              days={workoutDays}
            />
          ))}
        </div>
      )}

      {/* ─── 5. STORICO ALLENAMENTI COMPLETATI (TENDINA ELEGANTE) ─── */}
      <AthleteWorkoutHistory
        athleteId={athleteId}
        athleteIds={memoizedAthleteIds}
        activeWorkoutTitle={firstAssigned?.workout?.title}
        initialSessions={cachedSessionsForHistory}
      />
    </div>
  );
};
