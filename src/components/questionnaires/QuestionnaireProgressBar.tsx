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
          <span className="px-2.5 py-0.5 rounded-full bg-[var(--color-primary)] text-black font-black text-[11px] shadow-sm">
            Passo {currentStep} di {QUESTIONNAIRE_STEPS.length}
          </span>
          <span className="font-bold text-white text-sm">
            {QUESTIONNAIRE_STEPS[currentStep - 1]?.title}
          </span>
        </div>
        <span className="text-slate-400 font-mono font-bold flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-[var(--color-primary)]" /> {percent}% Completato
        </span>
      </div>

      {/* Barra Progresso Sfumata */}
      <div className="w-full h-2 bg-slate-950 border border-slate-800 rounded-full overflow-hidden relative">
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
              className={`py-1.5 px-1 rounded-xl text-center transition-all flex flex-col items-center justify-center gap-0.5 ${
                isCurrent
                  ? 'bg-slate-900 border-2 border-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/10 ring-2 ring-[var(--color-primary)]/20'
                  : isDone
                  ? 'bg-slate-950 border border-emerald-700/50 text-emerald-400 hover:bg-slate-900'
                  : 'bg-slate-950/40 border border-slate-800 text-slate-600 opacity-60'
              } ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
              title={step.title}
            >
              <div className="flex items-center justify-center">
                {isDone ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <span className="text-[11px] font-black">{step.number}</span>
                )}
              </div>
              <span className="text-[9px] font-bold truncate max-w-full hidden sm:block">
                {step.shortTitle}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
