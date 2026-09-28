import React from 'react';
import { Check, Sparkles } from 'lucide-react';

interface StepInfo {
  number: number;
  title: string;
  shortTitle: string;
  icon?: string;
}

export const QUESTIONNAIRE_STEPS: StepInfo[] = [
  { number: 1, title: 'Profilo & Biometria', shortTitle: 'Biometria', icon: '👤' },
  { number: 2, title: 'Obiettivi & Contesto', shortTitle: 'Obiettivi', icon: '🎯' },
  { number: 3, title: 'Allenamento & Esperienza', shortTitle: 'Training', icon: '🏋️' },
  { number: 4, title: 'Stile di Vita & Recupero', shortTitle: 'Recupero', icon: '🌙' },
  { number: 5, title: 'Salute & Safety Check', shortTitle: 'Salute', icon: '🩺' },
  { number: 6, title: 'Nutrizione & Abitudini', shortTitle: 'Nutrizione', icon: '🥗' },
  { number: 7, title: 'Allegati & Invio', shortTitle: 'Allegati', icon: '📎' },
];

interface QuestionnaireProgressBarProps {
  currentStep: number;
  onSelectStep?: (step: number) => void;
  maxReachedStep?: number;
}

export const QuestionnaireProgressBar: React.FC<QuestionnaireProgressBarProps> = ({
  currentStep,
  onSelectStep,
  maxReachedStep = currentStep,
}) => {
  const percent = Math.round((currentStep / QUESTIONNAIRE_STEPS.length) * 100);

  return (
    <div className="space-y-3">
      {/* Testata Step Corrente & Percentuale */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-[var(--color-primary)] text-black font-black text-[11px] shadow-xs">
            Passo {currentStep} di {QUESTIONNAIRE_STEPS.length}
          </span>
          <span className="font-bold text-slate-900 dark:text-white text-sm">
            {QUESTIONNAIRE_STEPS[currentStep - 1]?.title}
          </span>
        </div>
        <span className="text-slate-600 dark:text-slate-400 font-mono font-bold flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-500 dark:text-[var(--color-primary)]" /> {percent}% Completato
        </span>
      </div>

      {/* Barra Progresso Sfumata */}
      <div className="w-full h-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-full overflow-hidden relative">
        <div
          className="h-full bg-gradient-to-r from-amber-500 via-[var(--color-primary)] to-amber-300 transition-all duration-300 rounded-full"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Pillole Step Touch per Navigazione Rapida */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 pt-1">
        {QUESTIONNAIRE_STEPS.map((step) => {
          const isDone = step.number < currentStep;
          const isCurrent = step.number === currentStep;
          const isClickable = Boolean(onSelectStep && step.number <= maxReachedStep);

          return (
            <button
              key={step.number}
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onSelectStep && onSelectStep(step.number)}
              className={`py-1.5 px-0.5 sm:px-1 rounded-xl text-center transition-all flex flex-col items-center justify-center gap-0.5 ${
                isCurrent
                  ? 'bg-amber-400 text-slate-950 border-2 border-amber-500 font-black shadow-md shadow-amber-400/20 ring-2 ring-amber-400/30'
                  : isDone
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 border-2 border-emerald-500 dark:border-emerald-600 text-emerald-950 dark:text-emerald-200 hover:bg-emerald-200'
                  : 'bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 opacity-60'
              } ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
              title={step.title}
            >
              <div className="flex items-center justify-center">
                {isDone ? (
                  <Check className="w-3.5 h-3.5 text-emerald-950 dark:text-emerald-300 stroke-[3.5]" />
                ) : (
                  <span className="text-[11px] font-black">{step.number}</span>
                )}
              </div>
              <span className={`text-[8px] sm:text-[9px] font-black truncate max-w-full block leading-tight ${
                isDone ? '!text-emerald-950 dark:!text-emerald-200' : 'text-slate-800 dark:text-slate-200'
              }`}>
                {step.shortTitle}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
