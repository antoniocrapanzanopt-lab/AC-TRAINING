import React, { useState } from 'react';
import {
  Check,
  Video,
  ChevronRight,
} from 'lucide-react';
import { WorkoutExercise } from '../../types/workout';
import { ExerciseAnatomyModal } from './ExerciseAnatomyModal';
import { PreviousExerciseHistory } from '../../utils/workoutHistoryResolver';

interface ExerciseCardProps {
  exercise: WorkoutExercise;
  index: number;
  isActive?: boolean;
  isCompleted: boolean;
  logs?: { reps: string; weight: string; rpe: string }[];
  completedSetsMap?: boolean[];
  noteFeedback?: string;
  previousHistory?: PreviousExerciseHistory;
  onToggleActive?: () => void;
  onOpenExecutionModal?: () => void;
  onLogChange?: (setIndex: number, field: 'reps' | 'weight' | 'rpe', value: string) => void;
  onNoteFeedbackChange?: (value: string) => void;
  onToggleSetComplete?: (setIndex: number) => void;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = React.memo(({
  exercise,
  index,
  isCompleted,
  completedSetsMap = [],
  onToggleActive,
  onOpenExecutionModal,
}) => {
  const [showAnatomyModal, setShowAnatomyModal] = useState(false);

  const completedCount = completedSetsMap.filter(Boolean).length;
  const totalSets = exercise.sets || 1;
  const progressPercent = Math.min(100, Math.round((completedCount / totalSets) * 100));

  const handleCardClick = () => {
    if (onOpenExecutionModal) {
      onOpenExecutionModal();
    } else if (onToggleActive) {
      onToggleActive();
    }
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
    <div
      onClick={handleCardClick}
      className={`group rounded-3xl transition-all duration-200 overflow-hidden border cursor-pointer select-none relative ${
        isCompleted
          ? 'bg-[var(--color-panel)] border-emerald-500/40 shadow-sm hover:border-emerald-500 hover:shadow-md'
          : completedCount > 0
          ? 'bg-[var(--color-panel)] border-[var(--color-primary)]/50 shadow-sm hover:border-[var(--color-primary)] hover:shadow-md'
          : 'bg-[var(--color-panel)] border-[var(--color-panel-border)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface)] shadow-sm'
      }`}
    >
      {/* Barra Progresso Sottile Superiore */}
      {completedCount > 0 && (
        <div className="h-1.5 w-full bg-[var(--color-surface-strong)] overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${isCompleted ? 'bg-emerald-500' : 'bg-[var(--color-primary)]'}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* 1. Header: Numero Progressivo, Nome Esercizio, Badge Progresso & Azioni Rapide */}
      <div className="p-4 sm:p-5 md:p-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 sm:gap-4 flex-1 min-w-0">
          {/* Numero progressivo o Icona di Completamento */}
          <div
            className={`w-11 h-11 sm:w-13 sm:h-13 rounded-2xl flex items-center justify-center font-black text-base sm:text-lg shrink-0 transition-transform group-hover:scale-105 shadow-sm ${
              isCompleted
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : completedCount > 0
                ? 'bg-[var(--color-primary)] text-slate-950 shadow-md shadow-[var(--color-primary)]/20'
                : 'bg-[var(--color-surface-strong)] text-[var(--color-text-muted)] border border-[var(--color-border)]'
            }`}
          >
            {isCompleted ? <Check className="w-6 h-6 sm:w-7 sm:h-7 stroke-[3.5]" /> : index + 1}
          </div>

          {/* Nome Esercizio e Dettagli */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {isCompleted ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 text-xs font-black border border-emerald-500/30">
                  ✓ Completato ({completedCount}/{totalSets})
                </span>
              ) : completedCount > 0 ? (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 text-xs font-black border border-amber-500/30">
                  In corso ({completedCount}/{totalSets} serie)
                </span>
              ) : (
                <span className="text-xs font-bold text-[var(--color-text-muted)]">
                  {totalSets} {totalSets === 1 ? 'Serie' : 'Serie'}
                </span>
              )}
            </div>

            <h3 className="font-black text-base sm:text-xl leading-snug tracking-tight text-[var(--color-text)] break-words group-hover:text-[var(--color-primary)] transition-colors">
              {exercise.name}
            </h3>
          </div>
        </div>

        {/* Azioni Header: Video Tutorial & Icona Apri */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowAnatomyModal(true);
            }}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-600 hover:text-white transition-all active:scale-95 cursor-pointer shadow-sm flex items-center justify-center shrink-0"
            title="Video Tutorial & Guida Esecuzione 3D"
          >
            <Video className="w-5 h-5 sm:w-6 sm:h-6 text-sky-600" />
          </button>

          <div
            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-all ${
              isCompleted
                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 group-hover:bg-emerald-500 group-hover:text-slate-950'
                : 'bg-[var(--color-surface-strong)] text-[var(--color-text-muted)] border border-[var(--color-border)] group-hover:bg-[var(--color-primary)] group-hover:text-slate-950 group-hover:border-[var(--color-primary)]'
            }`}
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>

      {/* 2. Target Prescritto dal Coach (Reps, Sets, RPE, Rest) */}
      <div className="px-4 sm:px-5 md:px-6 pb-4 sm:pb-5 md:pb-6 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5 text-center text-xs">
        <div className="bg-[var(--color-surface-strong)] border border-[var(--color-border)] p-3 sm:p-3.5 rounded-2xl">
          <span className="text-[11px] sm:text-xs uppercase font-bold text-[var(--color-text-muted)] block mb-0.5">Serie</span>
          <span className="text-base sm:text-lg font-black text-[var(--color-text)]">{exercise.sets}</span>
        </div>
        <div className="bg-[var(--color-surface-strong)] border border-[var(--color-border)] p-3 sm:p-3.5 rounded-2xl">
          <span className="text-[11px] sm:text-xs uppercase font-bold text-[var(--color-text-muted)] block mb-0.5">
            {isTimeBased ? 'Target Tempo' : 'Target Reps'}
          </span>
          <span className="text-base sm:text-lg font-black text-[var(--color-primary)]">
            {formattedTarget}
          </span>
        </div>
        <div className="bg-[var(--color-surface-strong)] border border-[var(--color-border)] p-3 sm:p-3.5 rounded-2xl">
          <span className="text-[11px] sm:text-xs uppercase font-bold text-[var(--color-text-muted)] block mb-0.5">Target RIR/RPE</span>
          <span className="text-base sm:text-lg font-black text-purple-500">{exercise.rir_target || '-'}</span>
        </div>
        <div className="bg-[var(--color-surface-strong)] border border-[var(--color-border)] p-3 sm:p-3.5 rounded-2xl">
          <span className="text-[11px] sm:text-xs uppercase font-bold text-[var(--color-text-muted)] block mb-0.5">Recupero</span>
          <span className="text-base sm:text-lg font-black text-emerald-500 font-mono">{exercise.rest_seconds}s</span>
        </div>
      </div>

      {/* MODALE TUTORIAL & ANATOMIA 3D */}
      <ExerciseAnatomyModal
        isOpen={showAnatomyModal}
        onClose={() => setShowAnatomyModal(false)}
        exercise={exercise}
      />
    </div>
  );
});
