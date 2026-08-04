import React, { useState, useEffect, useMemo } from 'react';
import { Dumbbell, Check, Save, AlertCircle, HardDrive, Sparkles, Calendar } from 'lucide-react';
import { WorkoutPlan, TrainingDay, PlanExercise, ExerciseLogEntry } from '../../types';
import { RestTimer } from './RestTimer';
import { useWorkoutLogs } from '../../context/WorkoutLogsContext';
import { storageService } from '../../services/storageService';
import { LogbookCompletionModal } from './LogbookCompletionModal';

interface WorkoutTrackerProps {
  athleteId: string;
  athleteName: string;
  plan: WorkoutPlan;
  onCompleteAndNavigate?: () => void;
}

export const WorkoutTracker: React.FC<WorkoutTrackerProps> = ({
  athleteId,
  athleteName,
  plan,
  onCompleteAndNavigate,
}) => {
  const { saveWorkoutLog } = useWorkoutLogs();

  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const currentDay: TrainingDay | undefined = plan.days?.[selectedDayIndex];

  const maxWeeks = plan.durationWeeks || 4;

  // 1. SETTIMANA ATTIVA PER LA SESSIONE
  const activeSessionWeek = useMemo(() => {
    if (!currentDay) return 1;
    return storageService.getAthleteSessionWeek(athleteId, plan.id, currentDay.id);
  }, [athleteId, plan.id, currentDay]);

  const [selectedWeekNumber, setSelectedWeekNumber] = useState<number>(activeSessionWeek);

  useEffect(() => {
    setSelectedWeekNumber(activeSessionWeek);
  }, [activeSessionWeek]);

  const currentWorkoutId = `${plan.id}_${currentDay?.id || selectedDayIndex}_w${selectedWeekNumber}`;

  // Stato inserimento per esercizio -> serie -> { weight, reps, completed }
  const [sessionData, setSessionData] = useState<Record<string, { weight: number; reps: number; completed: boolean }[]>>({});
  const [isDraftRestored, setIsDraftRestored] = useState(false);

  // Modal completamento logbook
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [completionStats, setCompletionStats] = useState<{
    completedSetsCount: number;
    totalVolumeKg: number;
    isMesocycleCompleted: boolean;
    savedWeek: number;
  }>({
    completedSetsCount: 0,
    totalVolumeKg: 0,
    isMesocycleCompleted: false,
    savedWeek: 1,
  });

  // Caricamento automatico della bozza salvata in LocalStorage al cambio di giornata/settimana
  useEffect(() => {
    if (!currentWorkoutId) return;
    const savedDraft = storageService.getWorkoutDraft<Record<string, { weight: number; reps: number; completed: boolean }[]>>(
      currentWorkoutId,
      {}
    );
    setSessionData(savedDraft);
    if (Object.keys(savedDraft).length > 0) {
      setIsDraftRestored(true);
    } else {
      setIsDraftRestored(false);
    }
  }, [currentWorkoutId]);

  // Salva automaticamente lo stato in LocalStorage ogni volta che sessionData cambia
  const updateAndSaveSessionData = (
    updater: (prev: Record<string, { weight: number; reps: number; completed: boolean }[]>) => Record<string, { weight: number; reps: number; completed: boolean }[]>
  ) => {
    setSessionData((prev) => {
      const updated = updater(prev);
      if (currentWorkoutId) {
        storageService.saveWorkoutDraft(currentWorkoutId, updated);
      }
      return updated;
    });
  };

  // Timer recupero attivo
  const [activeTimerSeconds, setActiveTimerSeconds] = useState<number | null>(null);

  const getSetData = (exerciseId: string, setIndex: number) => {
    return sessionData[exerciseId]?.[setIndex] || { weight: 0, reps: 0, completed: false };
  };

  const handleUpdateSet = (exerciseId: string, setIndex: number, field: 'weight' | 'reps', value: number) => {
    updateAndSaveSessionData((prev) => {
      const exerciseSets = [...(prev[exerciseId] || [])];
      if (!exerciseSets[setIndex]) {
        exerciseSets[setIndex] = { weight: 0, reps: 0, completed: false };
      }
      exerciseSets[setIndex] = {
        ...exerciseSets[setIndex],
        [field]: value,
      };
      return { ...prev, [exerciseId]: exerciseSets };
    });
  };

  const handleToggleCompleteSet = (exerciseId: string, setIndex: number, restSeconds = 90) => {
    updateAndSaveSessionData((prev) => {
      const exerciseSets = [...(prev[exerciseId] || [])];
      const current = exerciseSets[setIndex] || { weight: 0, reps: 0, completed: false };
      const nextCompleted = !current.completed;

      exerciseSets[setIndex] = {
        ...current,
        completed: nextCompleted,
      };

      if (nextCompleted && restSeconds > 0) {
        setActiveTimerSeconds(restSeconds);
      }

      return { ...prev, [exerciseId]: exerciseSets };
    });
  };

  const handleSaveWorkout = () => {
    if (!currentDay) return;

    const todayStr = new Date().toISOString().slice(0, 10);
    const nowStr = new Date().toISOString();

    let totalVolumeKg = 0;
    let completedSetsCount = 0;

    const exercisesLog: ExerciseLogEntry[] = (currentDay.exercises || []).map((ex: PlanExercise) => {
      const setsData = sessionData[ex.id] || [];
      const completedSets = setsData.map((s, idx) => {
        if (s.completed) {
          completedSetsCount++;
          totalVolumeKg += (s.weight || 0) * (s.reps || 0);
        }
        return {
          setIndex: idx,
          repsCompleted: s.reps || 0,
          weightKg: s.weight || 0,
          completedAt: nowStr,
        };
      });

      return {
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        primaryMuscle: ex.primaryMuscle || 'pettorali',
        completedSets,
      };
    });

    saveWorkoutLog({
      athleteId,
      athleteName,
      planId: plan.id,
      planName: plan.name,
      dayId: currentDay.id,
      dayLabel: currentDay.label,
      date: todayStr,
      exercises: exercisesLog,
    });

    // Pulisci la bozza locale dopo aver salvato definitivamente
    storageService.clearWorkoutDraft(currentWorkoutId);

    // AVANZAMENTO AUTOMATICO SETTIMANA PER LA SESSIONE
    const { isMesocycleCompleted } = storageService.advanceAthleteSessionWeek(
      athleteId,
      plan.id,
      currentDay.id,
      maxWeeks
    );

    setCompletionStats({
      completedSetsCount,
      totalVolumeKg,
      isMesocycleCompleted,
      savedWeek: selectedWeekNumber,
    });

    setSessionData({});
    setIsDraftRestored(false);
    setIsCompletionModalOpen(true);
  };



  if (!plan.days || plan.days.length === 0) {
    return (
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2">
        <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
        <p className="text-xs font-bold text-white">Nessuna giornata configurata in questo programma.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* SELETTORE GIORNATA (SPLIT) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {plan.days.map((day, idx) => (
          <button
            key={day.id || idx}
            onClick={() => setSelectedDayIndex(idx)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${selectedDayIndex === idx
                ? 'bg-[var(--color-primary)] text-black shadow-lg shadow-[var(--color-primary)]/20'
                : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
              }`}
          >
            <span>{day.label}</span>
            <span className="text-[10px] opacity-75 font-mono">({day.exercises?.length || 0} es)</span>
          </button>
        ))}
      </div>

      {/* SELETTORE SETTIMANA DEL MESOCICLO (SETTIMANA 1..N) */}
      <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            Avanzamento Programma ({maxWeeks} Settimane Totali)
          </span>
          <span className="text-xs font-mono font-bold text-[var(--color-primary)]">
            Settimana Attiva: W{activeSessionWeek}
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {Array.from({ length: maxWeeks }).map((_, wIdx) => {
            const wNum = wIdx + 1;
            const isCurrentActive = wNum === activeSessionWeek;
            const isSelected = wNum === selectedWeekNumber;

            return (
              <button
                key={wNum}
                onClick={() => setSelectedWeekNumber(wNum)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${isSelected
                    ? 'bg-amber-500/20 border-[var(--color-primary)] text-[var(--color-primary)] shadow-md'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
              >
                W{wNum}
                {isCurrentActive && (
                  <span className="ml-1 w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* BANNER FINE MESOCICLO SE È L'ULTIMA SETTIMANA */}
      {selectedWeekNumber >= maxWeeks && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 to-purple-500/20 border border-amber-500/40 flex items-center justify-between text-xs space-x-3">
          <div className="flex items-center gap-2 text-white">
            <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <span className="font-extrabold text-amber-300 block">🎉 Ultima Settimana del Mesociclo!</span>
              <span className="text-slate-300">Completa questa sessione per inoltrare il report finale al tuo Coach.</span>
            </div>
          </div>
        </div>
      )}

      {/* DETTAGLIO ESERCIZI GIORNATA SELEZIONATA */}
      {currentDay && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-[var(--color-primary)]" /> {currentDay.label} — W{selectedWeekNumber}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <HardDrive className="w-3 h-3" />
                {isDraftRestored ? 'Bozza Ripristinata' : 'Autosalvataggio Locale'}
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                {currentDay.exercises?.length || 0} Esercizi
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {(currentDay.exercises || []).map((ex: PlanExercise, exIdx: number) => {
              const totalSets = ex.params?.sets || 3;
              const targetReps = `${ex.params?.repsMin || 8}-${ex.params?.repsMax || 12}`;
              const rir = ex.params?.rir ?? 2;
              const restSec = ex.params?.restSeconds || 90;

              // Stima confronto settimana scorsa (Progressione stimata +2.5% o +1 rep)
              const prevWeekLoad = Math.max(0, Math.round(80 + exIdx * 10 + (selectedWeekNumber - 1) * 2.5));
              const currentTargetLoad = Math.round(prevWeekLoad + (selectedWeekNumber > 1 ? 2.5 : 0));

              return (
                <div
                  key={ex.id || exIdx}
                  className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-[10px] flex items-center justify-center font-bold">
                          {exIdx + 1}
                        </span>
                        {ex.exerciseName}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 capitalize">
                        Gruppo: <span className="text-slate-200">{ex.primaryMuscle || 'generale'}</span> • Target: {targetReps} reps • RIR: {rir} • Rec: {restSec}s
                      </p>
                    </div>

                    {/* BADGE CONFRONTO SETTIMANA SCORSA */}
                    <div className="text-right shrink-0 bg-slate-950 p-2 rounded-xl border border-slate-800">
                      <span className="text-[9px] font-bold text-slate-500 block uppercase">Settimana Scorsa</span>
                      <span className="text-xs font-mono font-bold text-slate-300">
                        {totalSets}x{ex.params?.repsMin || 8} @ {prevWeekLoad}kg
                      </span>
                      {selectedWeekNumber > 1 && (
                        <span className="text-[9px] font-bold text-emerald-400 block mt-0.5">
                          Oggi Target: +2.5kg ({currentTargetLoad}kg)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* TABELLA REGISTRAZIONE SERIE */}
                  <div className="space-y-2 pt-1">
                    <div className="grid grid-cols-12 gap-2 text-[10px] font-bold uppercase text-slate-500 px-1">
                      <span className="col-span-2">Set</span>
                      <span className="col-span-4">Kg Sollevati</span>
                      <span className="col-span-4">Reps Reali</span>
                      <span className="col-span-2 text-center">Fatto</span>
                    </div>

                    {Array.from({ length: totalSets }).map((_, setIdx) => {
                      const setData = getSetData(ex.id, setIdx);

                      return (
                        <div
                          key={setIdx}
                          className={`grid grid-cols-12 gap-2 items-center p-1.5 rounded-xl border transition-all ${setData.completed
                              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                              : 'bg-slate-950 border-slate-800 text-white'
                            }`}
                        >
                          <span className="col-span-2 font-mono text-xs font-extrabold text-slate-400 pl-1">
                            #{setIdx + 1}
                          </span>

                          <div className="col-span-4">
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={setData.weight || ''}
                              onChange={(e) => handleUpdateSet(ex.id, setIdx, 'weight', parseFloat(e.target.value) || 0)}
                              placeholder={`${currentTargetLoad} Kg`}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[var(--color-primary)]"
                            />
                          </div>

                          <div className="col-span-4">
                            <input
                              type="number"
                              min="0"
                              value={setData.reps || ''}
                              onChange={(e) => handleUpdateSet(ex.id, setIdx, 'reps', parseInt(e.target.value, 10) || 0)}
                              placeholder={`${ex.params?.repsMin || 8} reps`}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[var(--color-primary)]"
                            />
                          </div>

                          <div className="col-span-2 flex justify-center">
                            <button
                              type="button"
                              onClick={() => handleToggleCompleteSet(ex.id, setIdx, restSec)}
                              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${setData.completed
                                  ? 'bg-emerald-500 text-black shadow-md'
                                  : 'bg-slate-800 text-slate-400 hover:text-white'
                                }`}
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* PULSANTE COMPLETA ALLENAMENTO */}
          <button
            onClick={handleSaveWorkout}
            className="w-full py-3.5 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs uppercase tracking-wider hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-primary)]/20 mt-4"
          >
            <Save className="w-4 h-4" /> Completa & Salva Allenamento
          </button>
        </div>
      )}

      {/* MODALE DI CONFERMA & CELEBRAZIONE COMPLETAMENTO LOGBOOK */}
      <LogbookCompletionModal
        isOpen={isCompletionModalOpen}
        athleteName={athleteName}
        dayLabel={currentDay?.label || 'Sessione'}
        currentWeek={completionStats.savedWeek}
        maxWeeks={maxWeeks}
        totalVolumeKg={completionStats.totalVolumeKg}
        completedSetsCount={completionStats.completedSetsCount}
        isMesocycleCompleted={completionStats.isMesocycleCompleted}
        onConfirmAndGoToDashboard={() => {
          setIsCompletionModalOpen(false);
          if (onCompleteAndNavigate) {
            onCompleteAndNavigate();
          }
        }}
      />

      {/* FLOATING TIMER RECUPERO */}
      {activeTimerSeconds !== null && (
        <RestTimer
          initialSeconds={activeTimerSeconds}
          onFinish={() => {
            setActiveTimerSeconds(null);
          }}
          onClose={() => setActiveTimerSeconds(null)}
        />
      )}
    </div>
  );
};
