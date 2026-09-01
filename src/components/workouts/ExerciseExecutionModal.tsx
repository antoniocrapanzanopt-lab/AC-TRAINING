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
              <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-[var(--color-text-muted)] bg-[var(--color-surface-strong)] px-2.5 py-1 rounded-xl border border-[var(--color-border)] shrink-0">
                Esercizio {exerciseIndex + 1} di {totalExercises}
              </span>
              {isAllSetsCompleted ? (
                <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-400 text-[11px] sm:text-xs font-black border border-emerald-500/30 shrink-0 flex items-center gap-1">
                  ✓ Fatto ({completedCount}/{exercise.sets})
                </span>
              ) : completedCount > 0 ? (
                <span className="px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-400 text-[11px] sm:text-xs font-black border border-amber-500/30 shrink-0">
                  In corso ({completedCount}/{exercise.sets})
                </span>
              ) : null}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-2xl bg-slate-800/90 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700/60 transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-sm shrink-0"
              title="Chiudi e torna alla lista esercizi"
              aria-label="Chiudi e torna alla lista esercizi"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Titolo Esercizio: Protagonista Assoluto su 1-3 righe piene */}
          <div className="w-full">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[var(--color-text)] tracking-tight leading-tight break-words line-clamp-3 sm:line-clamp-none">
              {exercise.name}
            </h2>
          </div>

          {/* Action Pills Rapide: Video Tutorial 3D & Storico Seduta */}
          <div className="flex items-center gap-2 flex-wrap pt-0.5">
            <button
              type="button"
              onClick={() => setShowAnatomyModal(true)}
              className="min-w-[44px] min-h-[44px] px-3.5 h-11 rounded-2xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/35 text-sky-400 hover:text-white transition-all active:scale-95 flex items-center gap-2 cursor-pointer shadow-sm text-xs sm:text-sm font-black"
              title="Video Tutorial & Guida Esecuzione 3D"
              aria-label="Video Tutorial 3D"
            >
              <Video className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span>Video Tutorial 3D</span>
            </button>

            {previousHistory && previousHistory.sets.length > 0 && (
              <button
                type="button"
                onClick={() => setShowHistoryModal(true)}
                className="min-w-[44px] min-h-[44px] px-3.5 h-11 rounded-2xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all active:scale-95 flex items-center gap-2 cursor-pointer shadow-sm text-xs sm:text-sm font-bold"
                title="Storico carichi passati"
                aria-label="Storico carichi passati"
              >
                <History className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400" />
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
          <div className="bg-[var(--color-panel)] border border-[var(--color-panel-border)] p-3.5 sm:p-4 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
            {/* Obiettivo Principale: Serie x Reps / Tempo */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)] shrink-0 shadow-sm">
                <Dumbbell className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] block">
                  Target Prescritto
                </span>
                <div className="flex items-baseline gap-1.5 font-bold text-[var(--color-text)] flex-wrap">
                  <span className="text-xl sm:text-2xl font-black text-[var(--color-primary)] font-mono">{exercise.sets}</span>
                  <span className="text-xs text-[var(--color-text-muted)] uppercase font-black">serie ×</span>
                  <span className="text-lg sm:text-xl font-black text-[var(--color-text)]">{formattedTarget}</span>
                  {exercise.target_weight && (
                    <span className="ml-1.5 px-2.5 py-0.5 rounded-lg bg-amber-500/15 text-amber-300 font-bold border border-amber-500/30 text-xs flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      <span>{exercise.target_weight} kg</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Chips Intensità & Recupero */}
            <div className="flex items-center gap-2 flex-wrap sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--color-border)]/60">
              {exercise.rir_target && exercise.rir_target !== '-' && (
                <div className="px-3 py-1.5 rounded-xl bg-purple-500/15 text-purple-300 font-bold border border-purple-500/30 text-xs sm:text-sm flex items-center gap-1.5 shadow-sm">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-400">Intensità:</span>
                  <span>
                    {exercise.rir_target.toUpperCase().includes('RIR') || exercise.rir_target.toUpperCase().includes('RPE')
                      ? exercise.rir_target
                      : `RIR ${exercise.rir_target}`}
                  </span>
                </div>
              )}

              {exercise.rest_seconds ? (
                <div className="px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30 font-mono text-xs sm:text-sm flex items-center gap-1.5 shadow-sm">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span>Recupero: {exercise.rest_seconds}s</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* 2. NOTE ESECUTIVE DEL COACH (Se presenti) */}
          {cleanNotes && (
            <div className="px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs sm:text-sm text-[var(--color-text)] flex items-start gap-3 shadow-sm">
              <FileText className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-black text-amber-500 uppercase tracking-wider text-[11px] block mb-0.5">Istruzioni Coach</span>
                <span className="text-[var(--color-text)] font-medium">{cleanNotes}</span>
              </div>
            </div>
          )}

          {/* 3. BANNER PRE-COMPILAZIONE CARICHI STORICI */}
          {previousHistory && previousHistory.sets.length > 0 ? (
            <div className="p-3 sm:p-3.5 rounded-2xl bg-[var(--color-panel)] border border-sky-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-sm text-xs">
              <div className="flex items-center gap-2 min-w-0 overflow-x-auto no-scrollbar py-0.5">
                <div className="flex items-center gap-1 text-sky-400 font-black uppercase tracking-wider text-[10px] shrink-0">
                  <History className="w-3.5 h-3.5" />
                  <span>Seduta {previousHistory.formattedDate}:</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {previousHistory.sets.map((s, idx) => (
                    <span
                      key={idx}
                      className="bg-[var(--color-surface)] px-2 py-0.5 rounded-lg border border-[var(--color-border)] font-mono text-xs text-[var(--color-text)] shrink-0"
                    >
                      <span className="text-[var(--color-text-muted)] font-bold text-[10px]">S{s.setNumber}:</span> {s.weightKg || 0}kg × {s.reps || 0}
                    </span>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleCopyPreviousLoads()}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-xl border text-xs font-black flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shrink-0 shadow-sm ${
                  justApplied
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-slate-950 border-[var(--color-primary)]'
                }`}
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>{justApplied ? 'Carichi Applicati ✓' : 'Applica Carichi Precedenti'}</span>
              </button>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] flex items-center justify-between gap-2 text-xs text-[var(--color-text-muted)]">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="truncate">Nessun carico registrato in precedenza per questo esercizio.</span>
              </div>
              <button
                type="button"
                onClick={handleApplyCoachTargets}
                className="px-3 py-1.5 rounded-xl bg-[var(--color-surface)] hover:bg-[var(--color-surface-strong)] text-[var(--color-text)] border border-[var(--color-border)] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-sm"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Pre-compila Target</span>
              </button>
            </div>
          )}

          {/* 4. COMPILAZIONE SERIE INTERATTIVA CON ACTIVE FOCUS */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-[var(--color-text)] flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-[var(--color-primary)]" />
                <span>Esecuzione Serie</span>
              </h3>
              <span className="text-xs sm:text-sm font-mono font-bold text-[var(--color-text-muted)] bg-[var(--color-surface-strong)] px-2.5 py-1 rounded-xl border border-[var(--color-border)]">
                {completedCount}/{exercise.sets} completate
              </span>
            </div>

            {/* Header Colonne */}
            <div className="grid grid-cols-12 gap-2 sm:gap-3 text-center text-xs font-black uppercase tracking-wider text-[var(--color-text-muted)] px-1">
              <div className="col-span-2">SET</div>
              <div className="col-span-3">{isTimeBased ? 'TEMPO' : 'REPS'}</div>
              <div className="col-span-3">KG</div>
              <div className="col-span-2">RPE</div>
              <div className="col-span-2">STATO</div>
            </div>

            {/* Righe Serie Card-Rows */}
            <div className="space-y-2.5 sm:space-y-3">
              {Array.from({ length: exercise.sets }, (_, setIdx) => {
                const setLog = logs[setIdx] || { reps: '', weight: '', rpe: '' };
                const isSetCompleted = Boolean(completedSetsMap[setIdx]);
                const isActive = setIdx === activeSetIndex;
                const prevSet = previousHistory?.sets?.[setIdx];

                return (
                  <div
                    key={setIdx}
                    className={`grid grid-cols-12 gap-2 sm:gap-3 items-center p-2.5 sm:p-3.5 rounded-2xl border transition-all ${
                      isSetCompleted
                        ? 'bg-emerald-500/10 border-emerald-500/40 shadow-sm'
                        : isActive
                        ? 'bg-[var(--color-panel)] border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20 shadow-lg shadow-[var(--color-primary)]/5'
                        : 'bg-[var(--color-panel)] border-[var(--color-panel-border)] opacity-85 hover:opacity-100 shadow-sm'
                    }`}
                  >
                    {/* SET Number */}
                    <div
                      className={`col-span-2 text-center text-base sm:text-xl font-black py-3 sm:py-4 rounded-xl border flex flex-col items-center justify-center transition-colors ${
                        isSetCompleted
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : isActive
                          ? 'bg-[var(--color-primary)] text-slate-950 border-[var(--color-primary)] shadow-sm'
                          : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)]'
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
                        className={`w-full py-3 sm:py-4 px-2 sm:px-3 border rounded-xl sm:rounded-2xl text-center text-base sm:text-2xl font-black transition-all ${
                          isSetCompleted
                            ? 'bg-[var(--color-surface-strong)] border-emerald-500/30 text-emerald-400 cursor-not-allowed font-black'
                            : isActive
                            ? 'bg-[var(--color-surface)] border-[var(--color-primary)] text-[var(--color-text)] placeholder:text-slate-500/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30'
                            : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] placeholder:text-slate-500/50 focus:outline-none focus:border-[var(--color-primary)]'
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
                        className={`w-full py-3 sm:py-4 px-2 sm:px-3 border rounded-xl sm:rounded-2xl text-center text-base sm:text-2xl font-black transition-all ${
                          isSetCompleted
                            ? 'bg-[var(--color-surface-strong)] border-emerald-500/30 text-emerald-400 cursor-not-allowed font-black'
                            : isActive
                            ? 'bg-[var(--color-surface)] border-[var(--color-primary)] text-[var(--color-primary)] placeholder:text-slate-500/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30'
                            : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-primary)] placeholder:text-slate-500/50 focus:outline-none focus:border-[var(--color-primary)]'
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
                        className={`w-full py-3 sm:py-4 px-1 sm:px-2 border rounded-xl sm:rounded-2xl text-center text-sm sm:text-xl font-extrabold transition-all ${
                          isSetCompleted
                            ? 'bg-[var(--color-surface-strong)] border-emerald-500/30 text-purple-400 cursor-not-allowed font-black'
                            : 'bg-[var(--color-surface)] border-[var(--color-border)] text-purple-400 placeholder:text-slate-500/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                        }`}
                        inputMode="numeric"
                      />
                    </div>

                    {/* Pulsante Conferma Serie */}
                    <div className="col-span-2 flex justify-center">
                      <button
                        type="button"
                        onClick={() => onToggleSetComplete(setIdx)}
                        className={`min-w-[44px] min-h-[44px] w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-md ${
                          isSetCompleted
                            ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/30'
                            : isActive
                            ? 'bg-[var(--color-surface)] hover:bg-[var(--color-primary)] text-[var(--color-text)] hover:text-slate-950 border-2 border-[var(--color-primary)]'
                            : 'bg-[var(--color-surface)] hover:bg-[var(--color-primary)] text-[var(--color-text-muted)] hover:text-slate-950 border border-[var(--color-border)]'
                        }`}
                        title={isSetCompleted ? 'Serie completata! Clicca per sbloccare/modificare' : 'Conferma e completa serie'}
                        aria-label="Conferma serie"
                      >
                        <Check className={`w-6 h-6 sm:w-7 sm:h-7 stroke-[3.5] ${isSetCompleted ? 'text-slate-950' : 'text-[var(--color-text-muted)]'}`} />
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
              onClick={onClose}
              className="min-w-[44px] min-h-[44px] px-5 sm:px-7 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs sm:text-sm font-black flex items-center gap-2 transition-all active:scale-95 shadow-xl shadow-emerald-500/25 cursor-pointer shrink-0"
              title="Completa questo esercizio"
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
