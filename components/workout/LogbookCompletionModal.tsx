import React from 'react';
import { Trophy, CheckCircle2, ArrowRight, Flame, Sparkles } from 'lucide-react';

export interface LogbookCompletionModalProps {
  isOpen: boolean;
  athleteName: string;
  dayLabel: string;
  currentWeek: number;
  maxWeeks: number;
  totalVolumeKg: number;
  completedSetsCount: number;
  isMesocycleCompleted: boolean;
  onConfirmAndGoToDashboard: () => void;
}

export const LogbookCompletionModal: React.FC<LogbookCompletionModalProps> = ({
  isOpen,
  athleteName,
  dayLabel,
  currentWeek,
  maxWeeks,
  totalVolumeKg,
  completedSetsCount,
  isMesocycleCompleted,
  onConfirmAndGoToDashboard,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-md bg-slate-950 border border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-6 text-center animate-in zoom-in-95">
        
        {/* ICONA CELEBRAZIONE */}
        <div className="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-[var(--color-primary)] flex items-center justify-center mx-auto text-[var(--color-primary)] shadow-lg shadow-amber-500/30">
          <Trophy className="w-10 h-10 animate-bounce text-[var(--color-primary)]" />
        </div>

        {/* TITOLO E SOTTOTITOLO */}
        <div className="space-y-1">
          <h2 className="text-xl font-black text-white">Allenamento Completato! 🎉</h2>
          <p className="text-xs text-slate-400">
            Ottimo lavoro <span className="text-white font-bold">{athleteName}</span>! La sessione <span className="text-[var(--color-primary)] font-bold">{dayLabel}</span> è stata salvata nel logbook.
          </p>
        </div>

        {/* STATISTICHE RAGGIUNTE */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Serie Completate</span>
            <span className="text-lg font-black text-emerald-400 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> {completedSetsCount} Set
            </span>
          </div>

          <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Tonnellaggio Totale</span>
            <span className="text-lg font-black text-[var(--color-primary)] flex items-center justify-center gap-1">
              <Flame className="w-4 h-4" /> {totalVolumeKg} Kg
            </span>
          </div>
        </div>

        {/* MESSAGGIO AVANZAMENTO / FINE MESOCICLO */}
        {isMesocycleCompleted ? (
          <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-left space-y-1">
            <div className="flex items-center gap-2 text-amber-300 font-extrabold text-xs uppercase">
              <Sparkles className="w-4 h-4" /> 🎉 Mesociclo Completato!
            </div>
            <p className="text-xs text-slate-200">
              Hai terminato tutte le {maxWeeks} settimane del programma corrente. Avvisa il tuo Coach per il prossimo blocco di allenamento e il check-in!
            </p>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-xs text-sky-200 text-left flex items-center justify-between">
            <div>
              <span className="font-bold block text-white">Prossimo Step:</span>
              <span>Avanzamento a <strong className="text-sky-300">Settimana {currentWeek + 1}</strong> sbloccato!</span>
            </div>
            <ArrowRight className="w-5 h-5 text-sky-400 shrink-0" />
          </div>
        )}

        {/* PULSANTE RITORNO DASHBOARD */}
        <button
          onClick={onConfirmAndGoToDashboard}
          className="w-full py-3.5 rounded-2xl bg-[var(--color-primary)] hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-xl shadow-amber-500/20"
        >
          Torna alla Dashboard
        </button>
      </div>
    </div>
  );
};
