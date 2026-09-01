import React, { useState } from 'react';
import {
  Check,
  Video,
  ChevronRight,
  Clock,
  Dumbbell,
  Target,
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
  isActive = false,
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
          ? 'bg-[var(--color-panel)]/75 border-emerald-500/35 hover:border-emerald-500 shadow-sm opacity-90 hover:opacity-100'
          : isActive
          ? 'bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-panel)] border-2 border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20 shadow-xl shadow-[var(--color-primary)]/10 scale-[1.005]'
          : 'bg-[var(--color-panel)] border-[var(--color-panel-border)]/80 hover:border-[var(--color-border)] hover:bg-[var(--color-surface)] shadow-sm opacity-85 hover:opacity-100'
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

      <div className={`p-4 sm:p-5 space-y-3 ${isActive ? 'bg-[var(--color-primary)]/[0.02]' : ''}`}>
        {/* 1. Meta & Azioni Top */}
        <div className="flex items-center justify-between gap-2">
          {/* Sinistra: Badge Numero + Stato Esercizio */}
          <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
            <div
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-xs sm:text-sm shrink-0 transition-transform group-hover:scale-105 shadow-sm ${
                isCompleted
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : isActive
                  ? 'bg-[var(--color-primary)] text-slate-950 shadow-md shadow-[var(--color-primary)]/30 font-black'
                  : 'bg-[var(--color-surface-strong)] text-[var(--color-text-muted)] border border-[var(--color-border)]'
              }`}
            >
              {isCompleted ? <Check className="w-4 h-4 stroke-[3.5]" /> : index + 1}
            </div>

            {/* Pillola di Stato Dinamica */}
            {isCompleted ? (
              <span className="text-[10px] sm:text-[11px] font-black text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                ✓ Completato ({totalSets}/{totalSets})
              </span>
            ) : isActive ? (
              <span className="text-[10px] sm:text-[11px] font-black text-[var(--color-primary)] bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/40 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] animate-pulse" />
                <span>In Esecuzione</span>
                {completedCount > 0 && <span className="text-amber-400 font-bold ml-0.5">({completedCount}/{totalSets})</span>}
              </span>
            ) : (
              <span className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                Esercizio {index + 1}
              </span>
            )}
          </div>

          {/* Destra: Azioni (Video Tutorial & CTA Trigger) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowAnatomyModal(true);
              }}
              className="min-w-[40px] min-h-[40px] px-2.5 h-10 rounded-xl sm:rounded-2xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/25 text-sky-400 hover:text-white transition-all active:scale-95 cursor-pointer shadow-sm flex items-center justify-center gap-1.5 shrink-0 z-10"
              title="Video Tutorial & Guida Esecuzione 3D"
              aria-label="Video Tutorial & Guida Esecuzione"
            >
              <Video className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-[11px] font-black hidden sm:inline">Video</span>
            </button>

            {isActive ? (
              <div className="min-h-[40px] px-3.5 h-10 rounded-xl sm:rounded-2xl bg-[var(--color-primary)] text-slate-950 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-[var(--color-primary)]/20 group-hover:bg-[var(--color-primary-hover)] transition-all">
                <span>{completedCount > 0 ? 'Continua' : 'Inizia'}</span>
                <ChevronRight className="w-4 h-4 stroke-[3]" />
              </div>
            ) : (
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all ${
                  isCompleted
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-[var(--color-surface-strong)] text-[var(--color-text-muted)] border border-[var(--color-border)] group-hover:bg-[var(--color-primary)] group-hover:text-slate-950 group-hover:border-[var(--color-primary)]'
                }`}
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:translate-x-0.5" />
              </div>
            )}
          </div>
        </div>

        {/* 2. Titolo Esercizio: Full-Width a 100% */}
        <div className="w-full pt-0.5">
          <h3
            className={`font-black text-base sm:text-xl leading-snug tracking-tight break-words line-clamp-2 sm:line-clamp-none transition-colors ${
              isActive
                ? 'text-white'
                : isCompleted
                ? 'text-[var(--color-text)] opacity-90'
                : 'text-[var(--color-text)] group-hover:text-[var(--color-primary)]'
            }`}
          >
            {exercise.name}
          </h3>
        </div>

        {/* 3. Metriche Prescritte: Target Operativo Chiaro */}
        <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-[var(--color-border)]/60 text-xs sm:text-sm flex-wrap">
          {/* Serie x Reps / Tempo */}
          <div className="flex items-center gap-1.5 font-bold text-[var(--color-text)]">
            <Dumbbell className={`w-4 h-4 ${isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'} shrink-0`} />
            <span className={`${isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'} font-black text-sm sm:text-base font-mono`}>
              {exercise.sets}
            </span>
            <span className="text-[var(--color-text-muted)] text-xs font-bold uppercase">serie ×</span>
            <span className="text-[var(--color-text)] font-black text-sm sm:text-base">{formattedTarget}</span>
            {exercise.target_weight && (
              <span className="ml-1.5 px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-300 font-bold border border-amber-500/30 text-xs flex items-center gap-1">
                <Target className="w-3 h-3" />
                <span>{exercise.target_weight}kg</span>
              </span>
            )}
          </div>

          {/* Badge RIR/RPE & Recupero */}
          <div className="flex items-center gap-1.5 sm:gap-2">
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
