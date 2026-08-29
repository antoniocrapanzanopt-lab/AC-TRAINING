import React, { useState } from 'react';
import {
  Check,
  Video,
  ChevronRight,
  Clock,
  Dumbbell,
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
      className={`group rounded-2xl sm:rounded-3xl transition-all duration-200 overflow-hidden border cursor-pointer select-none relative ${
        isCompleted
          ? 'bg-[var(--color-panel)] border-emerald-500/40 shadow-sm hover:border-emerald-500 hover:shadow-md'
          : completedCount > 0
          ? 'bg-[var(--color-panel)] border-[var(--color-primary)]/50 shadow-sm hover:border-[var(--color-primary)] hover:shadow-md'
          : 'bg-[var(--color-panel)] border-[var(--color-panel-border)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface)] shadow-sm'
      }`}
    >
      {/* Barra Progresso Superiore */}
      {completedCount > 0 && (
        <div className="h-1.5 w-full bg-[var(--color-surface-strong)] overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${isCompleted ? 'bg-emerald-500' : 'bg-[var(--color-primary)]'}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      <div className="p-4 sm:p-5 space-y-3">
        {/* 1. Header: Numero, Titolo Grande Leggibile, Video Tutorial & Freccia */}
        <div className="flex items-center justify-between gap-3.5">
          <div className="flex items-center gap-3 sm:gap-3.5 flex-1 min-w-0">
            {/* Numero progressivo solido e leggibile */}
            <div
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center font-black text-sm sm:text-base shrink-0 transition-transform group-hover:scale-105 shadow-sm ${
                isCompleted
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : completedCount > 0
                  ? 'bg-[var(--color-primary)] text-slate-950 shadow-md shadow-[var(--color-primary)]/20'
                  : 'bg-[var(--color-surface-strong)] text-[var(--color-text)] border border-[var(--color-border)]'
              }`}
            >
              {isCompleted ? <Check className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3.5]" /> : index + 1}
            </div>

            {/* Titolo Esercizio in Grassetto Grande */}
            <div className="min-w-0 flex-1">
              <h3 className="font-black text-base sm:text-lg leading-tight tracking-tight text-[var(--color-text)] truncate group-hover:text-[var(--color-primary)] transition-colors">
                {exercise.name}
              </h3>
              {isCompleted ? (
                <span className="text-[11px] font-bold text-emerald-500 flex items-center gap-1 mt-0.5">
                  ✓ Completato ({completedCount}/{totalSets} serie)
                </span>
              ) : completedCount > 0 ? (
                <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1 mt-0.5">
                  In corso ({completedCount}/{totalSets} serie)
                </span>
              ) : null}
            </div>
          </div>

          {/* Azioni Header: Video Tutorial & Freccia Apri */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowAnatomyModal(true);
              }}
              className="w-10 h-10 rounded-2xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-400 hover:text-white transition-all active:scale-95 cursor-pointer shadow-sm flex items-center justify-center shrink-0"
              title="Video Tutorial & Guida Esecuzione 3D"
            >
              <Video className="w-5 h-5" />
            </button>

            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                isCompleted
                  ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                  : 'bg-[var(--color-surface-strong)] text-[var(--color-text-muted)] border border-[var(--color-border)] group-hover:bg-[var(--color-primary)] group-hover:text-slate-950 group-hover:border-[var(--color-primary)]'
              }`}
            >
              <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>
        </div>

        {/* 2. Barra Metriche Prescritte (Orizzontale, Spaziosa & Leggibile) */}
        <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-[var(--color-border)]/70 text-xs sm:text-sm">
          {/* Serie x Reps / Tempo */}
          <div className="flex items-center gap-1.5 font-bold text-[var(--color-text)]">
            <Dumbbell className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
            <span className="text-[var(--color-primary)] font-black text-sm">{exercise.sets}</span>
            <span className="text-[var(--color-text-muted)] text-xs">serie ×</span>
            <span className="text-[var(--color-text)] font-black text-sm">{formattedTarget}</span>
          </div>

          {/* Badge RIR/RPE & Recupero */}
          <div className="flex items-center gap-2">
            {exercise.rir_target && exercise.rir_target !== '-' && (
              <span className="px-2.5 py-1 rounded-xl bg-purple-500/15 text-purple-300 font-bold border border-purple-500/30 text-xs">
                {exercise.rir_target.toUpperCase().includes('RIR') || exercise.rir_target.toUpperCase().includes('RPE')
                  ? exercise.rir_target
                  : `RIR ${exercise.rir_target}`}
              </span>
            )}

            {exercise.rest_seconds ? (
              <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30 font-mono text-xs flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                {exercise.rest_seconds}s
              </span>
            ) : null}
          </div>
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
