import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dumbbell,
  Clock,
  Play,
  RotateCcw,
  WifiOff,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Zap,
  Flame,
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

interface AthleteDashboardProps {
  onStartWorkout: (workout: WorkoutTemplate, exercises: WorkoutExercise[], targetAthleteId?: string) => void;
}

// ─── COMPONENTE SCHEDA PROGRAMMA DI ALLENAMENTO ─────────────────────────────
interface WorkoutCardProps {
  assigned: any;
  isFirst: boolean;
  onStart: (assigned: any, week: number, day: string) => void;
  startingWorkoutId: string | null;
  activeDraft: ActiveWorkoutDraft | null;
}

const WorkoutCard: React.FC<WorkoutCardProps> = ({
  assigned,
  isFirst,
  onStart,
  startingWorkoutId,
  activeDraft,
}) => {
  const progressKey = `builder_progress_${assigned.athlete_id}_${assigned.workout_id}`;
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(progressKey) || '{}');
      return raw;
    } catch {
      return {};
    }
  });

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
  useEffect(() => {
    const syncProgressFromDb = async () => {
      try {
        const athId = assigned.athlete_id;
        const wId = assigned.workout_id;
        if (!athId || !wId) return;

        const { data } = await supabase
          .from('workout_sessions')
          .select('id, end_time, notes')
          .eq('athlete_id', athId)
          .eq('workout_id', wId)
          .not('end_time', 'is', null);

        const daysList = days.length > 0 ? days : ['Giorno A', 'Giorno B', 'Giorno C', 'Giorno D', 'Giorno E'];
        const totalSessionCount = data?.length || 0;

        const currentMap: Record<string, boolean> = {};
        let mappedCount = 0;
        const totalWeeksNum = assigned.workout?.total_weeks || 4;

        for (let w = 1; w <= totalWeeksNum && mappedCount < totalSessionCount; w++) {
          for (const dName of daysList) {
            if (mappedCount < totalSessionCount) {
              currentMap[`${w}-${dName}`] = true;
              mappedCount++;
            } else {
              break;
            }
          }
        }

        setCompletedMap(currentMap);
        localStorage.setItem(progressKey, JSON.stringify(currentMap));
      } catch (e) {
        console.warn('Errore sync progressi da DB:', e);
      }
    };

    syncProgressFromDb();
  }, [assigned.athlete_id, assigned.workout_id, days, progressKey, assigned.workout?.total_weeks]);

  const totalWeeks = assigned.workout?.total_weeks || 4;
  const isStartingThis = startingWorkoutId === assigned.workout_id;

  // Calcola la settimana attiva corrente (la prima non ancora completata al 100%)
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

  // Conteggio allenamenti completati nella settimana selezionata
  const weekCompletedCount = useMemo(() => {
    return days.filter((d) => completedMap[`${selectedWeek}-${d}`]).length;
  }, [days, completedMap, selectedWeek]);

  const weekProgressPercent = useMemo(() => {
    if (days.length === 0) return 0;
    return Math.round((weekCompletedCount / days.length) * 100);
  }, [weekCompletedCount, days.length]);

  const isCurrentWeekAllDone = weekCompletedCount === days.length;

  // Trova il primo giorno non completato della settimana selezionata
  const nextPendingDay = useMemo(() => {
    return days.find((d) => !completedMap[`${selectedWeek}-${d}`]) || null;
  }, [days, completedMap, selectedWeek]);

  return (
    <div
      className={`bg-slate-900/40 backdrop-blur-xl border ${
        isFirst
          ? 'border-[var(--color-primary)]/40 shadow-2xl shadow-[var(--color-primary)]/5'
          : 'border-slate-800/60'
      } rounded-3xl p-4 sm:p-6 space-y-5 shadow-lg overflow-hidden transition-all`}
    >
      {/* ─── 1. HEADER SCHEDA SEMPLIFICATO ─── */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-primary)] flex items-center gap-1">
                <Dumbbell className="w-3.5 h-3.5" />
                Programma Attivo
              </span>
              <span className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                Attiva
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-white leading-snug">
              {assigned.workout?.title}
            </h3>
          </div>

          <span className="bg-slate-950 border border-slate-800 px-3 py-1 rounded-xl text-xs font-mono font-bold text-[var(--color-primary)] shrink-0 shadow-inner">
            {totalWeeks} settimane
          </span>
        </div>

        {/* ─── STATO SINTETICO & BARRA DI AVANZAMENTO ─── */}
        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white flex items-center gap-1.5">
              <span>Settimana {selectedWeek} di {totalWeeks}</span>
              {isCurrentWeekAllDone && <span className="text-emerald-400 font-black">✓</span>}
            </span>
            <span className="font-mono font-black text-[var(--color-primary)]">
              {weekCompletedCount}/{days.length} sedute completate
            </span>
          </div>

          {/* Barra di Avanzamento */}
          <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-[var(--color-primary)] rounded-full transition-all duration-500 shadow-sm shadow-[var(--color-primary)]/30"
              style={{ width: `${weekProgressPercent}%` }}
            />
          </div>

          {/* Messaggio Motivazionale Breve */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
            <span>
              {isCurrentWeekAllDone
                ? 'Hai completato tutti gli allenamenti previsti per questa settimana! 🎉'
                : selectedWeek === currentActiveWeek
                ? `Sei nella settimana ${selectedWeek}. Continua così! 🔥`
                : `Visualizzazione storico settimana ${selectedWeek}.`}
            </span>
            <span className="font-bold text-slate-300 shrink-0 font-mono">{weekProgressPercent}%</span>
          </div>
        </div>

        {/* Toggle Descrizione Tecnica */}
        {assigned.workout?.description && (
          <div>
            <button
              type="button"
              onClick={() => setIsDetailsOpen(!isDetailsOpen)}
              className="text-[11px] font-bold text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors py-1"
            >
              <span>{isDetailsOpen ? 'Nascondi dettagli scheda' : 'Vedi dettagli scheda'}</span>
              {isDetailsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {isDetailsOpen && (
              <p className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800 mt-1 leading-relaxed animate-in fade-in">
                {assigned.workout.description}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ─── 2. SELETTORE SETTIMANE ("IL TUO PERCORSO") ─── */}
      <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            Il tuo percorso
          </span>
          <span className="text-[10px] text-slate-500">Scorri per navigare le settimane</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 -mx-1 px-1 touch-pan-x snap-x">
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
                className={`px-3.5 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer select-none active:scale-95 ${
                  isSelected
                    ? 'bg-[var(--color-primary)] text-slate-950 font-black shadow-lg shadow-[var(--color-primary)]/20 ring-1 ring-[var(--color-primary)]'
                    : isWeekDone
                    ? 'bg-emerald-950/30 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-900/40'
                    : isCurrent
                    ? 'bg-slate-800/90 text-white border border-[var(--color-primary)]/40 hover:border-[var(--color-primary)]'
                    : 'bg-slate-950/60 text-slate-400 border border-slate-800 hover:text-white hover:border-slate-700'
                }`}
              >
                <span>Settimana {wNum}</span>
                {isWeekDone ? (
                  <span className="text-emerald-400 font-bold text-[11px]">✓</span>
                ) : isCurrent && !isSelected ? (
                  <span className="text-[10px] text-amber-400 font-bold">• In corso</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── 3. CARD DEI GIORNI CON 4 STATI DIFFERENZIATI ─── */}
      <div className="space-y-3 pt-2 border-t border-slate-800/80">
        <div className="flex items-center justify-between">
          <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
            <span>Sedute di Allenamento (Settimana {selectedWeek})</span>
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {days.map((dayName) => {
            const key = `${selectedWeek}-${dayName}`;
            const isDone = Boolean(completedMap[key]);

            const draftDayName = activeDraft?.exercises?.[0]?.day_name;
            const draftWeekNum = activeDraft?.exercises?.[0]?.week_number;
            const isDraftForThisDay = Boolean(
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
                onClick={() => onStart(assigned, selectedWeek, dayName)}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between shadow-md relative overflow-hidden cursor-pointer select-none group/daycard active:scale-[0.98] ${
                  isDone
                    ? 'bg-slate-950/60 border-slate-800/60 text-slate-400 hover:border-slate-700'
                    : isDraftForThisDay
                    ? 'bg-gradient-to-b from-amber-950/30 to-slate-900 border-[var(--color-primary)] shadow-lg shadow-[var(--color-primary)]/10 ring-1 ring-[var(--color-primary)]/50'
                    : isNextUpcoming
                    ? 'bg-slate-900/90 border-[var(--color-primary)]/70 shadow-lg shadow-[var(--color-primary)]/10 text-white hover:border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/30'
                    : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-900/40'
                }`}
              >
                {/* Header Card Giorno */}
                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-white whitespace-nowrap">{dayName}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isDone ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-black flex items-center gap-1 shrink-0 whitespace-nowrap">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          Completato
                        </span>
                      ) : isDraftForThisDay ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black flex items-center gap-1 shrink-0 animate-pulse whitespace-nowrap">
                          <RotateCcw className="w-3 h-3 text-amber-400" />
                          In corso
                        </span>
                      ) : isNextUpcoming ? (
                        <span className="px-2 py-0.5 rounded-full bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/40 text-[9px] font-black shrink-0 whitespace-nowrap">
                          Oggi
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800 text-[9px] font-bold shrink-0 whitespace-nowrap">
                          Da completare
                        </span>
                      )}

                      {/* Icona circolare Play in evidenza */}
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all shrink-0 ${
                          isDraftForThisDay || isNextUpcoming
                            ? 'bg-[var(--color-primary)] text-slate-950 shadow-md shadow-[var(--color-primary)]/30 scale-105'
                            : 'bg-slate-800/80 text-slate-300 group-hover/daycard:bg-[var(--color-primary)] group-hover/daycard:text-slate-950'
                        }`}
                      >
                        <Play className="w-3 h-3 fill-current ml-0.5" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                    <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="whitespace-nowrap">Durata ~45-60 min</span>
                  </div>
                </div>

                {/* Pulsante CTA con gerarchia chiara */}
                <div className="pt-2 border-t border-slate-800/60 mt-auto">
                  {isDone ? (
                    <button
                      type="button"
                      disabled={isStartingThis}
                      onClick={(e) => {
                        e.stopPropagation();
                        onStart(assigned, selectedWeek, dayName);
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-bold transition-all cursor-pointer text-center"
                    >
                      Rivedi
                    </button>
                  ) : isDraftForThisDay ? (
                    <button
                      type="button"
                      disabled={isStartingThis}
                      onClick={(e) => {
                        e.stopPropagation();
                        onStart(assigned, selectedWeek, dayName);
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-slate-950 font-black text-xs transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <Play className="w-3.5 h-3.5 fill-black" />
                      <span>Riprendi</span>
                    </button>
                  ) : isNextUpcoming ? (
                    <button
                      type="button"
                      disabled={isStartingThis}
                      onClick={(e) => {
                        e.stopPropagation();
                        onStart(assigned, selectedWeek, dayName);
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-slate-950 font-black text-xs transition-all cursor-pointer shadow-lg shadow-[var(--color-primary)]/20 flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <Play className="w-3.5 h-3.5 fill-black" />
                      <span>Inizia ora →</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isStartingThis}
                      onClick={(e) => {
                        e.stopPropagation();
                        onStart(assigned, selectedWeek, dayName);
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-bold transition-all cursor-pointer text-center flex items-center justify-center gap-1"
                    >
                      <span>Inizia ora →</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
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
  const [startingWorkoutId, setStartingWorkoutId] = useState<string | null>(null);
  const [activeDraft, setActiveDraft] = useState<ActiveWorkoutDraft | null>(null);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);

  const checkDraftAndQueue = useCallback(() => {
    if (athleteId) {
      let draft = getActiveWorkoutDraft(athleteId);
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
      setStartingWorkoutId(assigned.workout_id);
      const allExercises = await getExercisesForWorkout(assigned.workout_id);
      if (allExercises.length === 0) {
        showError('Questa scheda non contiene esercizi!');
        setStartingWorkoutId(null);
        return;
      }

      // Estrai tutti i giorni unici presenti negli esercizi
      const uniqueDays = Array.from(
        new Set(allExercises.map((e) => (e.day_name || 'Giorno A').trim()))
      ).filter(Boolean).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

      // 1. Determina la settimana target
      const targetWeek = selectedWeek || 1;

      // 2. Determina il giorno target (se non passato, usa il primo giorno disponibile, es. Giorno A)
      const targetDay = (selectedDay && selectedDay.trim()) || (uniqueDays.length > 0 ? uniqueDays[0] : 'Giorno A');
      const targetDayNorm = targetDay.trim().toLowerCase();

      // 3. Filtra gli esercizi: SOLO ed ESCLUSIVAMENTE quelli di questa specifica settimana e di questo specifico giorno
      let filtered = allExercises.filter((ex) => {
        const exWeek = ex.week_number || 1;
        const exDay = (ex.day_name || 'Giorno A').trim().toLowerCase();
        return exWeek === targetWeek && exDay === targetDayNorm;
      });

      // Fallback 1: se non ci sono esercizi per la settimana specifica (es. week_number assente), filtra solo per giorno
      if (filtered.length === 0) {
        filtered = allExercises.filter((ex) => {
          const exDay = (ex.day_name || 'Giorno A').trim().toLowerCase();
          return exDay === targetDayNorm;
        });
      }

      // Fallback 2: se ancora vuoto, prendi solo gli esercizi del primo giorno disponibile per evitare assolutamente il dump di 25 esercizi
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
    } finally {
      setStartingWorkoutId(null);
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

  // Calcolo dinamico della settimana attiva e del prossimo giorno da svolgere per la scheda primaria (Hero)
  const { heroActiveWeek, heroNextDay } = useMemo(() => {
    if (!firstAssigned) return { heroActiveWeek: 1, heroNextDay: 'Giorno A' };
    const athId = firstAssigned.athlete_id;
    const wId = firstAssigned.workout_id;
    const progressKey = `builder_progress_${athId}_${wId}`;
    let completedMap: Record<string, boolean> = {};
    try {
      completedMap = JSON.parse(localStorage.getItem(progressKey) || '{}');
    } catch (_) {}

    const totalWeeks = firstAssigned.workout?.total_weeks || 4;
    const dayList = ['Giorno A', 'Giorno B', 'Giorno C', 'Giorno D', 'Giorno E'];

    // Trova la prima settimana con giorni non completati
    for (let w = 1; w <= totalWeeks; w++) {
      const pendingDay = dayList.find((d) => !completedMap[`${w}-${d}`]);
      if (pendingDay) {
        return { heroActiveWeek: w, heroNextDay: pendingDay };
      }
    }

    return { heroActiveWeek: 1, heroNextDay: 'Giorno A' };
  }, [firstAssigned]);

  const draftCompletedSetsPercent = useMemo(() => {
    if (!activeDraft) return null;
    const setsObj = activeDraft.completedSets || {};
    const allSets = Object.values(setsObj);
    const totalSets = allSets.reduce((acc, sets) => acc + sets.length, 0);
    const doneSets = allSets.reduce((acc, sets) => acc + sets.filter(Boolean).length, 0);
    return totalSets > 0 ? Math.round((doneSets / totalSets) * 100) : 0;
  }, [activeDraft]);

  const draftCurrentExerciseName = useMemo(() => {
    if (!activeDraft || !activeDraft.exercises || activeDraft.exercises.length === 0) return null;
    const idx = activeDraft.activeExerciseIdx || 0;
    return activeDraft.exercises[idx]?.name || null;
  }, [activeDraft]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 font-bold text-sm">Caricamento delle tue schede...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-32 font-sans">
      {/* ─── 1. HEADER: SALUTO E TITOLO ─── */}
      <div className="space-y-0.5">
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Il tuo Allenamento</h2>
        <p className="text-xs text-slate-400">La tua home operativa per raggiungere i tuoi obiettivi.</p>
      </div>

      {/* ─── BANNER INVITO AGGIUNGI AC ALLA HOME ─── */}
      <PwaInstallBanner />

      {/* ─── 2. BLOCCO PRINCIPALE: AZIONE IMMEDIATA HERO ─── */}
      {activeDraft ? (
        // SCENARIO A: RIPRENDI SESSIONE IN CORSO
        <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-950 border border-[var(--color-primary)] shadow-2xl shadow-[var(--color-primary)]/10 space-y-4 animate-in fade-in">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/40 flex items-center justify-center shrink-0 shadow-lg">
                <RotateCcw className="w-5 h-5 animate-spin-slow" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black text-[var(--color-primary)] uppercase tracking-wider">
                    Riprendi da dove avevi lasciato
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-950 text-slate-400 text-[9px] font-bold border border-slate-800">
                    Salvato sul dispositivo
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white truncate mt-0.5">
                  {activeDraft.workout?.title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-300 mt-0.5">
                  {draftCurrentExerciseName && (
                    <span className="text-slate-300 truncate">
                      In corso: <strong className="text-white">{draftCurrentExerciseName}</strong>
                    </span>
                  )}
                  {draftCompletedSetsPercent !== null && draftCompletedSetsPercent > 0 && (
                    <span className="text-amber-400 font-bold font-mono">
                      • {draftCompletedSetsPercent}% completato
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1 border-t border-slate-800/80">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>
              Ultimo salvataggio alle{' '}
              {new Date(activeDraft.lastSavedTimestamp).toLocaleTimeString('it-IT', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          {/* CTA Primaria & Secondaria */}
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleResumeDraft}
              className="w-full sm:flex-1 py-3.5 px-5 rounded-2xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-[var(--color-primary)]/20 transition-all cursor-pointer active:scale-95"
            >
              <Play className="w-4 h-4 fill-black" />
              <span>Riprendi Allenamento</span>
            </button>
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="w-full sm:w-auto py-2.5 px-4 rounded-xl text-slate-400 hover:text-rose-400 text-xs font-bold hover:bg-slate-900 border border-slate-800/60 transition-colors cursor-pointer text-center"
            >
              Scarta sessione
            </button>
          </div>
        </div>
      ) : firstAssigned ? (
        // SCENARIO B: ALLENAMENTO DI OGGI (NESSUNA BOZZA ATTIVA)
        <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-b from-slate-900 via-[var(--color-panel)] to-slate-950 border border-[var(--color-primary)]/40 shadow-xl space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[var(--color-primary)]/15 text-[var(--color-primary)] border border-[var(--color-primary)]/30 flex items-center justify-center shrink-0 shadow-lg">
                <Flame className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black text-[var(--color-primary)] uppercase tracking-wider">
                    Allenamento di Oggi
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[9px] font-black border border-emerald-500/30">
                    Pronto per iniziare
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white truncate mt-0.5">
                  {firstAssigned.workout?.title}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Seduta pronta: <strong className="text-white">{heroNextDay}</strong> (Settimana {heroActiveWeek}) • Raggiungi il tuo massimo!
                </p>
              </div>
            </div>
          </div>

          {/* CTA Primaria per avviare il giorno corretto */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => handleStartWorkout(firstAssigned, heroActiveWeek, heroNextDay)}
              className="w-full py-3.5 px-5 rounded-2xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-[var(--color-primary)]/20 transition-all cursor-pointer active:scale-95"
            >
              <Play className="w-4 h-4 fill-black" />
              <span>Inizia {heroNextDay || 'Allenamento'}</span>
            </button>
          </div>
        </div>
      ) : null}

      {/* ─── 3. BANNER CODA SINCRONIZZAZIONE OFFLINE ─── */}
      {pendingSyncCount > 0 && (
        <div className="p-3 rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-[var(--color-primary)]/30 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
            <span>
              <strong>{pendingSyncCount}</strong> allenamento/i salvato/i sul dispositivo in attesa di sincronizzazione.
            </span>
          </div>
          <button
            type="button"
            onClick={async () => {
              const res = await syncPendingWorkoutsWithServer();
              if (res.syncedCount > 0) {
                showSuccess('Dati sincronizzati!', `${res.syncedCount} allenamento/i caricato/i.`);
                checkDraftAndQueue();
              } else if (!navigator.onLine) {
                showError('Dispositivo Offline', 'Connettiti a internet per inviare le sessioni.');
              }
            }}
            className="px-3 py-1 rounded-lg bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/30 font-bold hover:bg-[var(--color-primary)]/30 transition-colors cursor-pointer shrink-0"
          >
            Sincronizza ora
          </button>
        </div>
      )}

      {/* ─── 4. ELENCO SCHEDE ASSEGNATE ─── */}
      {myAssignedWorkouts.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 sm:p-12 text-center space-y-3">
          <div className="w-14 h-14 bg-slate-800/80 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
            <Dumbbell className="w-7 h-7" />
          </div>
          <h3 className="text-base sm:text-lg font-black text-white">Nessuna scheda assegnata</h3>
          <p className="text-slate-400 text-xs max-w-sm mx-auto leading-relaxed">
            Il tuo coach non ti ha ancora assegnato un programma di allenamento. Riceverai una notifica non appena sarà pronto!
          </p>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {myAssignedWorkouts.map((assigned: any, index) => (
            <WorkoutCard
              key={assigned.id}
              assigned={assigned}
              isFirst={index === 0}
              onStart={handleStartWorkout}
              startingWorkoutId={startingWorkoutId}
              activeDraft={activeDraft}
            />
          ))}
        </div>
      )}
    </div>
  );
};
