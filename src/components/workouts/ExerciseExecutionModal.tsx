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
      <div className="bg-[var(--color-bg)] border-t sm:border border-[var(--color-panel-border)] rounded-t-3xl sm:rounded-3xl w-full max-w-4xl xl:max-w-5xl h-full max-h-[98vh] sm:max-h-[94vh] flex flex-col shadow-2xl overflow-hidden relative">
        
        {/* ── HEADER MODALE GRANDE ── */}
        <div className="bg-[var(--color-surface)]/95 backdrop-blur-xl border-b border-[var(--color-border)] p-4 sm:p-6 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
            <div
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center font-black text-base sm:text-xl shrink-0 shadow-lg ${
                isAllSetsCompleted
                  ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20'
                  : 'bg-[var(--color-primary)] text-slate-950 shadow-[var(--color-primary)]/20'
              }`}
            >
              {isAllSetsCompleted ? <Check className="w-7 h-7 stroke-[3.5]" /> : exerciseIndex + 1}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5 mb-1">
                <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-[var(--color-text-muted)]">
                  Esercizio {exerciseIndex + 1} di {totalExercises}
                </span>
                {isAllSetsCompleted ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 text-xs font-black border border-emerald-500/30">
                    ✓ Completato ({completedCount}/{exercise.sets})
                  </span>
                ) : completedCount > 0 ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 text-xs font-black border border-amber-500/30">
                    In corso ({completedCount}/{exercise.sets})
                  </span>
                ) : null}
              </div>
              <h2 className="text-lg sm:text-2xl md:text-3xl font-black text-[var(--color-text)] truncate leading-tight">
                {exercise.name}
              </h2>
            </div>
          </div>

          {/* Azioni Rapide Header: Video, Storico e Chiudi */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {previousHistory && previousHistory.sets.length > 0 && (
              <button
                type="button"
                onClick={() => setShowHistoryModal(true)}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-600 hover:text-white hover:bg-sky-500/30 transition-all flex items-center justify-center cursor-pointer shadow-sm"
                title="Storico carichi passati"
              >
                <History className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowAnatomyModal(true)}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-600 hover:text-white hover:bg-sky-500/30 transition-all flex items-center justify-center cursor-pointer shadow-sm"
              title="Video Tutorial & Anatomia 3D"
            >
              <Video className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[var(--color-surface-strong)] hover:bg-[var(--color-panel)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors flex items-center justify-center cursor-pointer ml-1"
              title="Chiudi e torna alla lista esercizi"
            >
              <X className="w-6 h-6" />
            </button>
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6">
          
          {/* 1. TARGET COACH PREVENTIVI GRANDI & CHIARI */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-center">
            <div className="bg-[var(--color-panel)] border border-[var(--color-panel-border)] p-3.5 sm:p-4 rounded-2xl shadow-sm">
              <span className="text-[11px] sm:text-xs uppercase font-bold text-[var(--color-text-muted)] block mb-1">Serie Previste</span>
              <span className="text-xl sm:text-2xl font-black text-[var(--color-text)]">{exercise.sets}</span>
            </div>
            <div className="bg-[var(--color-panel)] border border-[var(--color-panel-border)] p-3.5 sm:p-4 rounded-2xl shadow-sm">
              <span className="text-[11px] sm:text-xs uppercase font-bold text-[var(--color-text-muted)] block mb-1">
                {isTimeBased ? 'Target Tempo' : 'Target Reps'}
              </span>
              <span className="text-xl sm:text-2xl font-black text-[var(--color-primary)]">
                {formattedTarget}
              </span>
            </div>
            <div className="bg-[var(--color-panel)] border border-[var(--color-panel-border)] p-3.5 sm:p-4 rounded-2xl shadow-sm">
              <span className="text-[11px] sm:text-xs uppercase font-bold text-[var(--color-text-muted)] block mb-1">Target RIR/RPE</span>
              <span className="text-xl sm:text-2xl font-black text-purple-500">{exercise.rir_target || '-'}</span>
            </div>
            <div className="bg-[var(--color-panel)] border border-[var(--color-panel-border)] p-3.5 sm:p-4 rounded-2xl shadow-sm">
              <span className="text-[11px] sm:text-xs uppercase font-bold text-[var(--color-text-muted)] block mb-1">Recupero</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-500 font-mono">{exercise.rest_seconds}s</span>
            </div>
          </div>

          {/* 2. NOTE ESECUTIVE DEL COACH (Se presenti) */}
          {cleanNotes && (
            <div className="p-4 sm:p-5 bg-amber-500/10 border border-amber-500/25 rounded-2xl text-xs sm:text-sm text-[var(--color-text)] leading-relaxed flex items-start gap-3 shadow-sm">
              <FileText className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-600 block mb-0.5 text-sm sm:text-base">Note Esecuzione del Coach:</span>
                <span className="leading-relaxed">{cleanNotes}</span>
              </div>
            </div>
          )}

          {/* 3. BANNER PRE-COMPILAZIONE CARICHI STORICI */}
          {previousHistory && previousHistory.sets.length > 0 ? (
            <div className="p-4 sm:p-5 rounded-2xl bg-[var(--color-panel)] border border-sky-500/30 shadow-sm space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-sky-500 flex items-center gap-2">
                  <History className="w-4 h-4 text-sky-500 shrink-0" />
                  Ultima Esecuzione ({previousHistory.formattedDate})
                </span>

                <button
                  type="button"
                  onClick={() => handleCopyPreviousLoads()}
                  className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl border text-xs sm:text-sm font-black flex items-center gap-2 transition-all active:scale-95 cursor-pointer shadow-md ${
                    justApplied
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                      : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-slate-950 border-[var(--color-primary)]'
                  }`}
                >
                  <Zap className="w-4 h-4 fill-current" />
                  <span>{justApplied ? 'Applicati ✓' : 'Applica Ultimi Carichi'}</span>
                </button>
              </div>

              {/* Elenco Serie Storiche */}
              <div className="flex items-center gap-2.5 overflow-x-auto pb-1 pt-1 no-scrollbar flex-wrap">
                {previousHistory.sets.map((s, idx) => (
                  <span
                    key={idx}
                    className="bg-[var(--color-surface)] px-3 py-1.5 rounded-xl border border-[var(--color-border)] font-mono text-xs sm:text-sm text-[var(--color-text)] shadow-sm shrink-0 flex items-center gap-1.5"
                  >
                    <span className="text-[var(--color-text-muted)] font-bold text-xs">S{s.setNumber}:</span>
                    <strong className="text-[var(--color-text)] font-black">{s.weightKg || 0}kg</strong>
                    <span className="text-[var(--color-text-muted)] text-xs">×</span>
                    <span className="text-[var(--color-text)] font-bold">{s.reps || 0}</span>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm text-[var(--color-text-muted)]">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
                <span>Nessun carico registrato in precedenza per questo esercizio.</span>
              </div>
              <button
                type="button"
                onClick={handleApplyCoachTargets}
                className="px-4 py-2 rounded-xl bg-[var(--color-surface)] hover:bg-[var(--color-surface-strong)] text-[var(--color-text)] border border-[var(--color-border)] text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer self-start sm:self-auto shrink-0 shadow-sm"
              >
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Pre-compila Target ({formattedTarget})</span>
              </button>
            </div>
          )}

          {/* 4. TABELLA INSERIMENTO SERIE (FOCUS MODE GRANDE) */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-[var(--color-text)] flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-[var(--color-primary)]" />
                Compilazione Serie
              </h3>
              <span className="text-xs sm:text-sm font-mono font-bold text-[var(--color-text-muted)]">
                {completedCount}/{exercise.sets} completate
              </span>
            </div>

            {/* Header Tabella */}
            <div className="grid grid-cols-12 gap-2 sm:gap-3 text-center text-xs sm:text-sm font-black uppercase tracking-wider text-[var(--color-text-muted)] px-1">
              <div className="col-span-2">SET</div>
              <div className="col-span-3">{isTimeBased ? 'TEMPO' : 'REPS'}</div>
              <div className="col-span-3">KG</div>
              <div className="col-span-2">RPE</div>
              <div className="col-span-2">FATTO</div>
            </div>

            {/* Righe Serie Grandi e Comode per Touch */}
            <div className="space-y-3">
              {Array.from({ length: exercise.sets }, (_, setIdx) => {
                const setLog = logs[setIdx] || { reps: '', weight: '', rpe: '' };
                const isSetCompleted = Boolean(completedSetsMap[setIdx]);
                const prevSet = previousHistory?.sets?.[setIdx];

                return (
                  <div
                    key={setIdx}
                    className={`grid grid-cols-12 gap-2 sm:gap-3 items-center p-2.5 sm:p-3.5 rounded-2xl border transition-all ${
                      isSetCompleted
                        ? 'bg-emerald-500/10 border-emerald-500/40 shadow-sm'
                        : 'bg-[var(--color-panel)] border-[var(--color-panel-border)] focus-within:border-[var(--color-primary)] shadow-sm'
                    }`}
                  >
                    {/* SET Number */}
                    <div
                      className={`col-span-2 text-center text-lg sm:text-2xl font-black py-3.5 sm:py-4.5 rounded-2xl border transition-colors ${
                        isSetCompleted
                          ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30'
                          : 'bg-[var(--color-surface)] text-[var(--color-text)] border-[var(--color-border)] shadow-sm'
                      }`}
                    >
                      {setIdx + 1}
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
                        className={`w-full py-3.5 sm:py-4.5 px-3 border rounded-2xl text-center text-lg sm:text-2xl font-black transition-all ${
                          isSetCompleted
                            ? 'bg-[var(--color-surface-strong)] border-emerald-500/30 text-emerald-500 cursor-not-allowed font-black'
                            : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] placeholder:text-slate-500/50 placeholder:font-medium focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20'
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
                        className={`w-full py-3.5 sm:py-4.5 px-3 border rounded-2xl text-center text-lg sm:text-2xl font-black transition-all ${
                          isSetCompleted
                            ? 'bg-[var(--color-surface-strong)] border-emerald-500/30 text-emerald-500 cursor-not-allowed font-black'
                            : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-primary)] placeholder:text-slate-500/50 placeholder:font-medium focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20'
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
                        className={`w-full py-3.5 sm:py-4.5 px-2 border rounded-2xl text-center text-base sm:text-xl font-extrabold transition-all ${
                          isSetCompleted
                            ? 'bg-[var(--color-surface-strong)] border-emerald-500/30 text-purple-500 cursor-not-allowed font-black'
                            : 'bg-[var(--color-surface)] border-[var(--color-border)] text-purple-400 placeholder:text-slate-500/50 placeholder:font-medium focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                        }`}
                        inputMode="numeric"
                      />
                    </div>

                    {/* Pulsante Conferma Serie */}
                    <div className="col-span-2 flex justify-center">
                      <button
                        type="button"
                        onClick={() => onToggleSetComplete(setIdx)}
                        className={`w-13 h-13 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-lg ${
                          isSetCompleted
                            ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/30'
                            : 'bg-[var(--color-surface)] hover:bg-[var(--color-primary)] text-[var(--color-text-muted)] hover:text-slate-950 border border-[var(--color-border)]'
                        }`}
                        title={isSetCompleted ? 'Serie completata! Clicca per modificare' : 'Conferma e completa serie'}
                      >
                        <Check className={`w-7 h-7 sm:w-8 sm:h-8 stroke-[3.5] ${isSetCompleted ? 'text-slate-950' : 'text-[var(--color-text-muted)]'}`} />
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

        {/* ── FOOTER FISSO CON NAVIGAZIONE PROSSIMO / PRECEDENTE E SALVA ── */}
        <div className="bg-[var(--color-surface)]/95 backdrop-blur-xl border-t border-[var(--color-border)] p-4 sm:p-5 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            disabled={!hasPrev}
            onClick={onNavigatePrev}
            className="px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl bg-[var(--color-panel)] hover:bg-[var(--color-surface-strong)] disabled:opacity-30 disabled:pointer-events-none text-[var(--color-text)] border border-[var(--color-border)] text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 shadow-sm"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Precedente</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 sm:py-3.5 rounded-2xl bg-[var(--color-surface-strong)] hover:bg-[var(--color-panel)] text-[var(--color-text)] border border-[var(--color-border)] text-xs sm:text-sm font-bold transition-all text-center cursor-pointer truncate shadow-sm"
          >
            Salva & Torna alla Lista
          </button>

          {hasNext ? (
            <button
              type="button"
              onClick={onNavigateNext}
              className="px-5 py-3 sm:px-6 sm:py-3.5 rounded-2xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-slate-950 text-xs sm:text-sm font-black flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-[var(--color-primary)]/20 cursor-pointer shrink-0"
            >
              <span>Successivo</span>
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 sm:px-6 sm:py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs sm:text-sm font-black flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-500/20 cursor-pointer shrink-0"
            >
              <Check className="w-5 h-5 stroke-[3.5]" />
              <span>Fatto</span>
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
