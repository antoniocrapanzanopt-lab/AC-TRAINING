import React, { useState } from 'react';
import {
  X,
  Check,
  Video,
  History,
  Zap,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  FileText,
  Clock,
  Target,
} from 'lucide-react';
import { WorkoutExercise } from '../../types/workout';
import { cleanExecutiveNotes } from '../../utils/noteCleaner';
import { ExerciseAnatomyModal } from './ExerciseAnatomyModal';
import { ExerciseHistoryModal } from './ExerciseHistoryModal';
import { InteractiveRestTimer } from './InteractiveRestTimer';
import { PreviousExerciseHistory, PreviousSetData } from '../../utils/workoutHistoryResolver';

interface ExerciseExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  exercise: WorkoutExercise;
  exerciseIndex: number;
  totalExercises: number;
  logs: { reps: string; weight: string; rpe: string }[];
  completedSetsMap: boolean[];
  noteFeedback: string;
  previousHistory?: PreviousExerciseHistory;
  restTimer: number | null;
  totalRestSeconds: number;
  onSkipRest: () => void;
  onAddRestTime: (seconds: number) => void;
  onLogChange: (setIndex: number, field: 'reps' | 'weight' | 'rpe', value: string) => void;
  onNoteFeedbackChange: (value: string) => void;
  onToggleSetComplete: (setIndex: number) => void;
  onNavigateNext?: () => void;
  onNavigatePrev?: () => void;
  hasNext: boolean;
  hasPrev: boolean;
  onFinishWorkout?: () => void;
}

export const ExerciseExecutionModal: React.FC<ExerciseExecutionModalProps> = ({
  isOpen,
  onClose,
  exercise,
  exerciseIndex,
  totalExercises,
  logs,
  completedSetsMap,
  noteFeedback,
  previousHistory,
  restTimer,
  totalRestSeconds,
  onSkipRest,
  onAddRestTime,
  onLogChange,
  onNoteFeedbackChange,
  onToggleSetComplete,
  onNavigateNext,
  onNavigatePrev,
  hasNext,
  hasPrev,
  onFinishWorkout,
}) => {
  const [showAnatomyModal, setShowAnatomyModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [justApplied, setJustApplied] = useState(false);

  if (!isOpen) return null;

  const cleanNotes = cleanExecutiveNotes(exercise.notes);
  const completedCount = completedSetsMap.filter(Boolean).length;
  const isAllSetsCompleted = completedCount === exercise.sets && exercise.sets > 0;
  
  // Individua l'indice della prima serie attiva ancora da completare
  const activeSetIndex = completedSetsMap.findIndex((done) => !done);

  // Copia i carichi e le ripetizioni precedenti
  const handleCopyPreviousLoads = (customSets?: PreviousSetData[]) => {
    const sourceSets = customSets || previousHistory?.sets;
    if (!sourceSets || sourceSets.length === 0) return;

    sourceSets.forEach((s, idx) => {
      if (idx < exercise.sets) {
        if (s.reps !== null && s.reps !== undefined) {
          onLogChange(idx, 'reps', String(s.reps));
        }
        if (s.weightKg !== null && s.weightKg !== undefined) {
          onLogChange(idx, 'weight', String(s.weightKg));
        }
        if (s.rpe !== null && s.rpe !== undefined) {
          onLogChange(idx, 'rpe', String(s.rpe));
        }
      }
    });

    if (exercise.sets > sourceSets.length && sourceSets.length > 0) {
      const lastSet = sourceSets[sourceSets.length - 1];
      for (let idx = sourceSets.length; idx < exercise.sets; idx++) {
        if (lastSet.reps !== null && lastSet.reps !== undefined) {
          onLogChange(idx, 'reps', String(lastSet.reps));
        }
        if (lastSet.weightKg !== null && lastSet.weightKg !== undefined) {
          onLogChange(idx, 'weight', String(lastSet.weightKg));
        }
        if (lastSet.rpe !== null && lastSet.rpe !== undefined) {
          onLogChange(idx, 'rpe', String(lastSet.rpe));
        }
      }
    }

    setJustApplied(true);
    setTimeout(() => setJustApplied(false), 2500);
  };

  // Applica target prescritti
  const handleApplyCoachTargets = () => {
    const targetReps = exercise.reps_target || '10';
    const targetWeight = exercise.target_weight ? String(exercise.target_weight) : '0';

    for (let idx = 0; idx < exercise.sets; idx++) {
      onLogChange(idx, 'reps', targetReps);
      if (exercise.target_weight) {
        onLogChange(idx, 'weight', targetWeight);
      }
    }

    setJustApplied(true);
    setTimeout(() => setJustApplied(false), 2500);
  };

  const isTimeBased = Boolean(
    exercise.is_time_based ||
    (exercise.duration_seconds && exercise.duration_seconds > 0) ||
    exercise.reps_target?.toLowerCase().includes('min') ||
    exercise.reps_target?.toLowerCase().includes('sec') ||
    exercise.reps_target?.toLowerCase().includes('s') ||
    exercise.name.toLowerCase().includes('plank') ||
    exercise.name.toLowerCase().includes('hollow') ||
    exercise.name.toLowerCase().includes('wall sit') ||
    exercise.name.toLowerCase().includes('dead bug') ||
    exercise.name.toLowerCase().includes('isometr')
  );

  const formattedTarget = (() => {
    if (isTimeBased) {
      if (exercise.duration_seconds && exercise.duration_seconds > 0) {
        if (exercise.duration_seconds >= 60 && exercise.duration_seconds % 60 === 0) {
          return `${exercise.duration_seconds / 60} min`;
        }
        return `${exercise.duration_seconds}s`;
      }
      if (exercise.reps_target && (exercise.reps_target.includes('min') || exercise.reps_target.includes('s'))) {
        return exercise.reps_target;
      }
      if (exercise.name.toLowerCase().includes('plank')) {
        return '1 min';
      }
      return exercise.reps_target || '60s';
    }
    return exercise.reps_target || '10-12';
  })();

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col justify-center items-center p-0 sm:p-4 md:p-6 lg:p-8 overflow-hidden animate-in fade-in duration-200">
      
      {/* CARD MODALE PRINCIPALE - GRANDE, SPAZIOSA & CONFORTEVOLE */}
      <div className="bg-[var(--color-bg)] border-t sm:border border-[var(--color-panel-border)] rounded-t-3xl sm:rounded-3xl w-full max-w-4xl xl:max-w-5xl h-full max-h-[100dvh] sm:max-h-[94vh] flex flex-col shadow-2xl overflow-hidden relative">
        
        {/* ── HEADER MODALE ESERCIZIO (PREMIUM, RESPIRO E PROTAGONISTA) ── */}
        <div className="bg-[var(--color-surface)]/95 backdrop-blur-xl border-b border-[var(--color-border)] px-4 py-3.5 sm:px-6 sm:py-5 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] sm:pt-5 flex flex-col gap-3 shrink-0 relative z-20 shadow-sm">
          
          {/* Top Bar: Progress info a Sinistra + Close Button Isolato a Destra */}
          <div className="flex items-center justify-between gap-3 w-full">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-200 bg-slate-800/90 px-3 py-1 rounded-xl border border-slate-700 shrink-0">
                Esercizio {exerciseIndex + 1} di {totalExercises}
              </span>
              {isAllSetsCompleted ? (
                <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-400 text-xs sm:text-sm font-black border border-emerald-500/40 shrink-0 flex items-center gap-1.5">
                  ✓ Fatto ({completedCount}/{exercise.sets})
                </span>
              ) : completedCount > 0 ? (
                <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 text-xs sm:text-sm font-black border border-amber-500/40 shrink-0">
                  In corso ({completedCount}/{exercise.sets})
                </span>
              ) : null}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="min-w-[44px] min-h-[44px] w-12 h-12 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-sm shrink-0"
              title="Chiudi e torna alla lista esercizi"
              aria-label="Chiudi e torna alla lista esercizi"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Titolo Esercizio: Protagonista Assoluto su 1-3 righe piene */}
          <div className="w-full">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight break-words line-clamp-3 sm:line-clamp-none">
              {exercise.name}
            </h2>
          </div>

          {/* Action Pills Rapide: Video Tutorial 3D & Storico Seduta */}
          <div className="flex items-center gap-2.5 flex-wrap pt-0.5">
            <button
              type="button"
              onClick={() => setShowAnatomyModal(true)}
              className="min-w-[44px] min-h-[44px] px-4 h-12 rounded-2xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-400 hover:text-white transition-all active:scale-95 flex items-center gap-2 cursor-pointer shadow-md text-xs sm:text-sm font-black"
              title="Video Tutorial & Guida Esecuzione 3D"
              aria-label="Video Tutorial 3D"
            >
              <Video className="w-5 h-5 shrink-0" />
              <span>Video Tutorial 3D</span>
            </button>

            {previousHistory && previousHistory.sets.length > 0 && (
              <button
                type="button"
                onClick={() => setShowHistoryModal(true)}
                className="min-w-[44px] min-h-[44px] px-4 h-12 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white transition-all active:scale-95 flex items-center gap-2 cursor-pointer shadow-sm text-xs sm:text-sm font-black"
                title="Storico carichi passati"
                aria-label="Storico carichi passati"
              >
                <History className="w-5 h-5 text-sky-400" />
                <span>Storico Seduta</span>
              </button>
            )}
          </div>
        </div>

        {/* REST TIMER INTEGRATO (Se attivo) */}
        {restTimer !== null && restTimer >= 0 && (
          <InteractiveRestTimer
            remainingSeconds={restTimer}
            totalSeconds={totalRestSeconds}
            onSkip={onSkipRest}
            onAddTime={onAddRestTime}
          />
        )}

        {/* ── CONTENUTO SCORREVOLE SPAZIOSO ── */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 md:p-8 space-y-3.5 sm:space-y-5">
          
          {/* 1. BRIEF OPERATIVO PRESCRIZIONE COACH */}
          <div className="bg-[var(--color-panel)] border-2 border-slate-700/80 p-4 sm:p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 shadow-lg">
            {/* Obiettivo Principale: Serie x Reps / Tempo */}
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/40 flex items-center justify-center text-[var(--color-primary)] shrink-0 shadow-sm">
                <Dumbbell className="w-7 h-7" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-slate-300 block">
                  Target Prescritto
                </span>
                <div className="flex items-baseline gap-2 font-bold text-white flex-wrap">
                  <span className="text-2xl sm:text-4xl font-black text-[var(--color-primary)] font-mono">{exercise.sets}</span>
                  <span className="text-sm font-black text-slate-300 uppercase">serie ×</span>
                  <span className="text-xl sm:text-3xl font-black text-white">{formattedTarget}</span>
                  {exercise.target_weight && (
                    <span className="ml-1.5 px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 font-black border border-amber-500/40 text-sm sm:text-base flex items-center gap-1.5 shadow-sm">
                      <Target className="w-4 h-4" />
                      <span>{exercise.target_weight} kg</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Chips Intensità & Recupero */}
            <div className="flex items-center gap-2.5 flex-wrap sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-700/60">
              {exercise.rir_target && exercise.rir_target !== '-' && (
                <div className="px-3.5 py-2 rounded-2xl bg-purple-500/20 text-purple-200 font-black border border-purple-500/40 text-xs sm:text-sm flex items-center gap-1.5 shadow-sm">
                  <span className="text-xs font-black uppercase tracking-wider text-purple-300">Intensità:</span>
                  <span>
                    {exercise.rir_target.toUpperCase().includes('RIR') || exercise.rir_target.toUpperCase().includes('RPE')
                      ? exercise.rir_target
                      : `RIR ${exercise.rir_target}`}
                  </span>
                </div>
              )}

              {exercise.rest_seconds ? (
                <div className="px-3.5 py-2 rounded-2xl bg-emerald-500/20 text-emerald-300 font-black border border-emerald-500/40 font-mono text-xs sm:text-sm flex items-center gap-1.5 shadow-sm">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span>Recupero: {exercise.rest_seconds}s</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* 2. NOTE ESECUTIVE DEL COACH (Se presenti) */}
          {cleanNotes && (
            <div className="px-4 py-3.5 bg-amber-500/15 border-2 border-amber-500/40 rounded-2xl sm:rounded-3xl text-sm sm:text-base text-white flex items-start gap-3.5 shadow-md">
              <FileText className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-black text-amber-400 uppercase tracking-wider text-xs block mb-0.5">Istruzioni Coach</span>
                <span className="text-white font-medium">{cleanNotes}</span>
              </div>
            </div>
          )}

          {/* 3. BANNER PRE-COMPILAZIONE CARICHI STORICI */}
          {previousHistory && previousHistory.sets.length > 0 ? (
            <div className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-[var(--color-panel)] border border-sky-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm text-xs sm:text-sm">
              <div className="flex items-center gap-2 min-w-0 overflow-x-auto no-scrollbar py-0.5">
                <div className="flex items-center gap-1 text-sky-400 font-black uppercase tracking-wider text-xs shrink-0">
                  <History className="w-4 h-4" />
                  <span>Seduta {previousHistory.formattedDate}:</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {previousHistory.sets.map((s, idx) => (
                    <span
                      key={idx}
                      className="bg-[var(--color-surface)] px-2.5 py-1 rounded-xl border border-slate-700 font-mono text-xs sm:text-sm text-white shrink-0 font-bold"
                    >
                      <span className="text-slate-300 font-black">S{s.setNumber}:</span> {s.weightKg || 0}kg × {s.reps || 0}
                    </span>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleCopyPreviousLoads()}
                className={`min-h-[44px] px-4 py-2 rounded-xl sm:rounded-2xl border text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shrink-0 shadow-md ${
                  justApplied
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-slate-950 border-[var(--color-primary)]'
                }`}
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>{justApplied ? 'Carichi Applicati ✓' : 'Applica Carichi Precedenti'}</span>
              </button>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-[var(--color-panel)] border border-slate-700/60 flex items-center justify-between gap-2 text-xs sm:text-sm text-slate-300">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="truncate">Nessun carico registrato in precedenza per questo esercizio.</span>
              </div>
              <button
                type="button"
                onClick={handleApplyCoachTargets}
                className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[var(--color-surface)] hover:bg-[var(--color-surface-strong)] text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-sm"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Pre-compila Target</span>
              </button>
            </div>
          )}

          {/* 4. COMPILAZIONE SERIE INTERATTIVA CON ACTIVE FOCUS */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-white flex items-center gap-2.5">
                <Dumbbell className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--color-primary)]" />
                <span>Esecuzione Serie</span>
              </h3>
              <span className="text-xs sm:text-sm font-mono font-bold text-slate-200 bg-slate-800 px-3 py-1 rounded-xl border border-slate-700">
                {completedCount}/{exercise.sets} completate
              </span>
            </div>

            {/* Header Colonne - Alto Contrasto & Testo Chiaro */}
            <div className="grid grid-cols-12 gap-2 sm:gap-3 text-center text-xs sm:text-sm font-black uppercase tracking-wider text-slate-200 px-1">
              <div className="col-span-2">SET</div>
              <div className="col-span-3">{isTimeBased ? 'TEMPO' : 'REPS'}</div>
              <div className="col-span-3">KG</div>
              <div className="col-span-2">RPE</div>
              <div className="col-span-2">STATO</div>
            </div>

            {/* Righe Serie Card-Rows */}
            <div className="space-y-3 sm:space-y-3.5">
              {Array.from({ length: exercise.sets }, (_, setIdx) => {
                const setLog = logs[setIdx] || { reps: '', weight: '', rpe: '' };
                const isSetCompleted = Boolean(completedSetsMap[setIdx]);
                const isActive = setIdx === activeSetIndex;
                const prevSet = previousHistory?.sets?.[setIdx];

                return (
                  <div
                    key={setIdx}
                    className={`grid grid-cols-12 gap-2 sm:gap-3 items-center p-3 sm:p-4 rounded-2xl sm:rounded-3xl border-2 transition-all ${
                      isSetCompleted
                        ? 'bg-emerald-500/15 border-emerald-500/50 shadow-md'
                        : isActive
                        ? 'bg-[var(--color-panel)] border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/30 shadow-xl shadow-[var(--color-primary)]/10'
                        : 'bg-[var(--color-panel)] border-slate-700/80 hover:border-slate-600 shadow-sm'
                    }`}
                  >
                    {/* SET Number */}
                    <div
                      className={`col-span-2 text-center text-lg sm:text-2xl font-black py-3 sm:py-4 rounded-xl sm:rounded-2xl border flex flex-col items-center justify-center transition-colors font-mono ${
                        isSetCompleted
                          ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/40'
                          : isActive
                          ? 'bg-[var(--color-primary)] text-slate-950 border-[var(--color-primary)] shadow-md font-black'
                          : 'bg-[var(--color-surface)] text-slate-200 border-slate-700'
                      }`}
                    >
                      <span>S{setIdx + 1}</span>
                    </div>

                    {/* REPS / TEMPO Input */}
                    <div className="col-span-3">
                      <input
                        type="number"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder={prevSet?.reps ? `${prevSet.reps}` : formattedTarget}
                        value={setLog.reps}
                        disabled={isSetCompleted}
                        onFocus={(e) => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                        onChange={(e) => onLogChange(setIdx, 'reps', e.target.value)}
                        className={`w-full py-3.5 sm:py-4 px-2 sm:px-3 border-2 rounded-xl sm:rounded-2xl text-center text-lg sm:text-3xl font-black font-mono transition-all ${
                          isSetCompleted
                            ? 'bg-[var(--color-surface-strong)] border-emerald-500/40 text-emerald-400 cursor-not-allowed'
                            : isActive
                            ? 'bg-[var(--color-surface)] border-[var(--color-primary)] text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 shadow-inner'
                            : 'bg-[var(--color-surface)] border-slate-700 text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--color-primary)]'
                        }`}
                      />
                    </div>

                    {/* KG Input */}
                    <div className="col-span-3">
                      <input
                        type="number"
                        placeholder={prevSet?.weightKg ? `${prevSet.weightKg}` : '0'}
                        value={setLog.weight}
                        disabled={isSetCompleted}
                        onFocus={(e) => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                        onChange={(e) => onLogChange(setIdx, 'weight', e.target.value)}
                        className={`w-full py-3.5 sm:py-4 px-2 sm:px-3 border-2 rounded-xl sm:rounded-2xl text-center text-lg sm:text-3xl font-black font-mono transition-all ${
                          isSetCompleted
                            ? 'bg-[var(--color-surface-strong)] border-emerald-500/40 text-emerald-400 cursor-not-allowed'
                            : isActive
                            ? 'bg-[var(--color-surface)] border-[var(--color-primary)] text-amber-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 shadow-inner'
                            : 'bg-[var(--color-surface)] border-slate-700 text-amber-300 placeholder:text-slate-400 focus:outline-none focus:border-[var(--color-primary)]'
                        }`}
                        inputMode="decimal"
                      />
                    </div>

                    {/* RPE Input */}
                    <div className="col-span-2">
                      <input
                        type="number"
                        placeholder="-"
                        value={setLog.rpe}
                        disabled={isSetCompleted}
                        onFocus={(e) => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                        onChange={(e) => onLogChange(setIdx, 'rpe', e.target.value)}
                        className={`w-full py-3.5 sm:py-4 px-1 sm:px-2 border-2 rounded-xl sm:rounded-2xl text-center text-base sm:text-2xl font-black font-mono transition-all ${
                          isSetCompleted
                            ? 'bg-[var(--color-surface-strong)] border-emerald-500/40 text-purple-400 cursor-not-allowed'
                            : 'bg-[var(--color-surface)] border-slate-700 text-purple-300 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30'
                        }`}
                        inputMode="numeric"
                      />
                    </div>

                    {/* Pulsante Conferma Serie */}
                    <div className="col-span-2 flex justify-center">
                      <button
                        type="button"
                        onClick={() => onToggleSetComplete(setIdx)}
                        className={`min-w-[48px] min-h-[48px] w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-lg ${
                          isSetCompleted
                            ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/30'
                            : isActive
                            ? 'bg-[var(--color-surface)] hover:bg-[var(--color-primary)] text-white hover:text-slate-950 border-2 border-[var(--color-primary)]'
                            : 'bg-[var(--color-surface)] hover:bg-[var(--color-primary)] text-slate-300 hover:text-slate-950 border border-slate-700'
                        }`}
                        title={isSetCompleted ? 'Serie completata! Clicca per sbloccare/modificare' : 'Conferma e completa serie'}
                        aria-label="Conferma serie"
                      >
                        <Check className={`w-7 h-7 sm:w-8 sm:h-8 stroke-[3.5] ${isSetCompleted ? 'text-slate-950' : 'text-slate-300'}`} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5. NOTE / FEEDBACK ATLETA */}
          <div className="pt-3 space-y-2.5">
            <label className="text-xs sm:text-sm font-black uppercase tracking-wider text-[var(--color-text)] flex items-center gap-2">
              <span>💬 Feedback / Note Personali:</span>
            </label>
            <textarea
              rows={3}
              value={noteFeedback}
              onChange={(e) => onNoteFeedbackChange(e.target.value)}
              placeholder="Es. Fastidio articolare avvertito nella 3ª serie, carico percepito leggero, note su tecnica..."
              className="w-full px-4 py-3 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] text-[var(--color-text)] placeholder:text-slate-500 text-sm focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all resize-none font-medium"
            />
          </div>
        </div>

        {/* ── FOOTER FISSO: GERARCHIA CHIARA DEI COMANDI ── */}
        <div className="bg-[var(--color-surface)]/95 backdrop-blur-xl border-t border-[var(--color-border)] p-4 sm:p-5 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] flex items-center justify-between gap-3 shrink-0">
          {/* Tasto Precedente (Discreto / Icona) */}
          <button
            type="button"
            disabled={!hasPrev}
            onClick={onNavigatePrev}
            className="min-w-[44px] min-h-[44px] px-3.5 sm:px-4 py-3 rounded-2xl bg-[var(--color-panel)] hover:bg-[var(--color-surface-strong)] disabled:opacity-25 disabled:pointer-events-none text-[var(--color-text-muted)] hover:text-white border border-[var(--color-border)] text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shrink-0 shadow-sm"
            title="Esercizio precedente"
            aria-label="Esercizio precedente"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Prec</span>
          </button>

          {/* Tasto Secondario: Salva & Torna (Ghost / Outline discreto) */}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[44px] px-3 sm:px-4 py-3 rounded-2xl bg-transparent hover:bg-[var(--color-surface-strong)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-[var(--color-border)]/80 text-xs sm:text-sm font-bold transition-all text-center cursor-pointer truncate shadow-sm active:scale-95"
            title="Salva ed esci"
          >
            Salva & Torna
          </button>

          {/* Tasto Primario Dominante: Successivo o Fatto (Alto contrasto e visibilità) */}
          {hasNext ? (
            <button
              type="button"
              onClick={onNavigateNext}
              className="min-w-[44px] min-h-[44px] px-5 sm:px-7 py-3 rounded-2xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-slate-950 text-xs sm:text-sm font-black flex items-center gap-2 transition-all active:scale-95 shadow-xl shadow-[var(--color-primary)]/25 cursor-pointer shrink-0"
              title="Passa al prossimo esercizio"
            >
              <span>Successivo</span>
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onFinishWorkout) {
                  onFinishWorkout();
                }
              }}
              className="min-w-[44px] min-h-[44px] px-5 sm:px-7 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs sm:text-sm font-black flex items-center gap-2 transition-all active:scale-95 shadow-xl shadow-emerald-500/25 cursor-pointer shrink-0"
              title="Completa questo allenamento"
            >
              <Check className="w-5 h-5 stroke-[3.5]" />
              <span>Completa</span>
            </button>
          )}
        </div>

      </div>

      {/* MODALE TUTORIAL & ANATOMIA 3D */}
      <ExerciseAnatomyModal
        isOpen={showAnatomyModal}
        onClose={() => setShowAnatomyModal(false)}
        exercise={exercise}
      />

      {/* MODALE STORICO COMPLETO ESERCIZIO */}
      <ExerciseHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        exerciseName={exercise.name}
        history={previousHistory}
        onApplySessionLoads={(sessionEntry) => handleCopyPreviousLoads(sessionEntry.sets)}
      />
    </div>
  );
};
