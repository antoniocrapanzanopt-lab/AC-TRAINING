import React, { useState } from 'react';
import {
  TrendingUp,
  Sparkles,
  Sliders,
  Pause,
  Play,
  History,
  MoreVertical,
} from 'lucide-react';
import { useProgressions } from '../../context/ProgressionsContext';
import { WorkoutExercise } from '../../types/workout';

interface ProgramExerciseProgressionBadgeProps {
  exercise: WorkoutExercise;
  athleteId?: string;
  athleteName?: string;
  programId?: string;
  programName?: string;
  onOpenConfig: () => void;
  onAskAI: () => void;
  onOpenHistory: (ruleId: string) => void;
}

export const ProgramExerciseProgressionBadge: React.FC<ProgramExerciseProgressionBadgeProps> = ({
  exercise,
  athleteId,
  athleteName: _athleteName,
  programId: _programId,
  programName: _programName,
  onOpenConfig,
  onAskAI,
  onOpenHistory,
}) => {
  const { rules, pauseRule, resumeRule } = useProgressions();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Trova la regola collegata all'esercizio o per nome esercizio
  const activeRule = rules.find(
    (r) =>
      r.workout_exercise_id === exercise.id ||
      (r.exercise_name === exercise.name && (!athleteId || r.athlete_id === athleteId))
  );

  if (!activeRule) {
    return (
      <div className="flex items-center gap-1.5 pt-1">
        <button
          type="button"
          onClick={onOpenConfig}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-[10px] font-bold border border-slate-800 transition-colors"
        >
          <TrendingUp className="w-3 h-3 text-[var(--color-primary)]" /> Configura Progressione
        </button>

        <button
          type="button"
          onClick={onAskAI}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 text-[10px] font-bold border border-purple-800/50 transition-colors"
        >
          <Sparkles className="w-3 h-3 text-purple-400" /> Chiedi IA
        </button>
      </div>
    );
  }

  const isPaused = activeRule.status === 'paused';

  return (
    <div className="relative inline-flex items-center gap-1.5 pt-1">
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold ${
          isPaused
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
        }`}
      >
        <TrendingUp className="w-3 h-3" />
        <span>{activeRule.name}</span>
        <span className="font-mono opacity-80">
          (Step {activeRule.current_step}/{activeRule.max_steps || '∞'})
        </span>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-1 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
        >
          <MoreVertical className="w-3 h-3" />
        </button>

        {isMenuOpen && (
          <div
            className="absolute left-0 top-full mt-1 w-48 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-1.5 z-40 space-y-0.5 text-xs animate-fadeIn"
            onMouseLeave={() => setIsMenuOpen(false)}
          >
            <button
              type="button"
              onClick={() => {
                setIsMenuOpen(false);
                onOpenConfig();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white text-left font-medium"
            >
              <Sliders className="w-3.5 h-3.5 text-sky-400" /> Modifica Regola
            </button>

            <button
              type="button"
              onClick={() => {
                setIsMenuOpen(false);
                onAskAI();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-purple-300 hover:bg-purple-950/40 text-left font-medium"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Proposta IA
            </button>

            <button
              type="button"
              onClick={() => {
                setIsMenuOpen(false);
                onOpenHistory(activeRule.id);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white text-left font-medium"
            >
              <History className="w-3.5 h-3.5 text-amber-400" /> Storico Avanzamenti
            </button>

            {isPaused ? (
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  resumeRule(activeRule.id);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-emerald-400 hover:bg-emerald-950/40 text-left font-medium"
              >
                <Play className="w-3.5 h-3.5" /> Riattiva Progressione
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  pauseRule(activeRule.id);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-amber-400 hover:bg-amber-950/40 text-left font-medium"
              >
                <Pause className="w-3.5 h-3.5" /> Metti in Pausa
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
