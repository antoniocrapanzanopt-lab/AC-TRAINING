import React from 'react';
import { Loader2, RotateCw } from 'lucide-react';
import { AthleteProgressDetail } from '../hooks/useAthletesWorkoutProgress';

interface AthleteWorkoutProgressBarProps {
  hasActiveWorkout: boolean;
  workoutTitle?: string;
  totalWeeks?: number;
  progress?: AthleteProgressDetail;
  onRetry?: () => void;
  className?: string;
}

export const AthleteWorkoutProgressBar: React.FC<AthleteWorkoutProgressBarProps> = ({
  hasActiveWorkout,
  workoutTitle = 'Scheda senza titolo',
  totalWeeks = 4,
  progress,
  onRetry,
  className = '',
}) => {
  // 1. Nessuna scheda attiva assegnata all'atleta
  if (!hasActiveWorkout) {
    return (
      <div className={`p-3 rounded-2xl bg-slate-950/40 border border-dashed border-slate-800 space-y-1.5 ${className}`}>
        <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">
          SCHEDA ATTIVA
        </span>
        <p className="text-xs font-bold text-slate-300">
          Nessuna scheda attiva
        </p>
        <p className="text-[11px] text-slate-500 italic">
          Nessun avanzamento disponibile
        </p>
      </div>
    );
  }

  // 2. Query in corso: mostra chiaramente il caricamento, MAI 0 o valori fittizi
  if (!progress || progress.status === 'loading') {
    return (
      <div className={`p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5 ${className}`}>
        <div className="min-w-0">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">
            SCHEDA ATTIVA
          </span>
          <p className="text-xs font-black text-white truncate mt-0.5" title={workoutTitle}>
            {workoutTitle}
          </p>
        </div>

        <div className="py-2.5 px-3 rounded-xl bg-slate-900/50 border border-slate-800/60 flex items-center gap-2 text-slate-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--color-primary)] shrink-0" />
          <span className="text-[11px] font-medium animate-pulse text-slate-300">
            Verifica allenamenti completati…
          </span>
        </div>

        <div className="pt-1.5 border-t border-slate-800/60 flex items-center justify-between">
          <span className="text-[10px] font-medium text-slate-500">Durata programma</span>
          <span className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-700/80 text-[10px] font-mono font-bold text-[var(--color-primary)]">
            {totalWeeks} {totalWeeks === 1 ? 'settimana' : 'settimane'}
          </span>
        </div>
      </div>
    );
  }

  // 3. Query fallita: mostra "Allenamenti non disponibili" e pulsante Retry
  if (progress.status === 'error') {
    return (
      <div className={`p-3.5 rounded-2xl bg-slate-950/80 border border-rose-950/60 space-y-2.5 ${className}`}>
        <div className="min-w-0">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">
            SCHEDA ATTIVA
          </span>
          <p className="text-xs font-black text-white truncate mt-0.5" title={workoutTitle}>
            {workoutTitle}
          </p>
        </div>

        <div className="py-2 px-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between gap-2 text-rose-300">
          <span className="text-[11px] font-semibold">Allenamenti non disponibili</span>
          {onRetry && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRetry();
              }}
              className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-[10px] font-black transition-all border border-rose-500/30 flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <RotateCw className="w-2.5 h-2.5" />
              <span>Riprova</span>
            </button>
          )}
        </div>

        <div className="pt-1.5 border-t border-slate-800/60 flex items-center justify-between">
          <span className="text-[10px] font-medium text-slate-500">Durata programma</span>
          <span className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-700/80 text-[10px] font-mono font-bold text-[var(--color-primary)]">
            {totalWeeks} {totalWeeks === 1 ? 'settimana' : 'settimane'}
          </span>
        </div>
      </div>
    );
  }

  // 4. Query riuscita con dati confermati dal DB
  const {
    completedSessions,
    plannedSessions,
    progressPercentage,
    lastWorkoutLabel,
    nextSessionLabel,
    daysSinceLastWorkout,
    programStatus,
  } = progress;

  // Dicitura principale chiara — mostra sempre quanti allenamenti mancano o sono completati (es: 3 / 10 completati · 30%)
  const ratioLabel = plannedSessions > 0 ? `${completedSessions} / ${plannedSessions}` : `${completedSessions}`;
  let progressText = `${ratioLabel} completati · ${progressPercentage}%`;
  if (completedSessions === 0) {
    progressText = `${ratioLabel} completati · Non iniziato`;
  } else if (programStatus === 'completed') {
    // 'completed' viene impostato SOLO quando completedSessions === plannedSessions
    progressText = `${ratioLabel} completati · Programma completato`;
  } else if (programStatus === 'data_error') {
    progressText = `${ratioLabel} completati · Dati da verificare`;
  }

  // Dettaglio secondario/tooltip
  const remainingSessions = Math.max(0, plannedSessions - completedSessions);
  const detailTooltip = plannedSessions > 0
    ? `${completedSessions} di ${plannedSessions} completati (${remainingSessions} mancanti)`
    : `${completedSessions} allenamenti completati`;

  // Colore barra — basato su programStatus, NON su progressPercentage >= 100
  let barColor = 'bg-slate-700';
  if (completedSessions > 0) {
    if (programStatus === 'completed') {
      barColor = 'bg-gradient-to-r from-emerald-500 to-emerald-400';
    } else if (programStatus === 'data_error') {
      barColor = 'bg-gradient-to-r from-orange-500 to-amber-400';
    } else if (daysSinceLastWorkout !== null && daysSinceLastWorkout >= 7) {
      barColor = 'bg-gradient-to-r from-rose-500 to-rose-400';
    } else if (progressPercentage >= 75 || programStatus === 'near_end') {
      barColor = 'bg-gradient-to-r from-amber-400 to-[var(--color-primary)]';
    } else if (progressPercentage >= 25) {
      barColor = 'bg-gradient-to-r from-sky-400 to-emerald-400';
    } else {
      barColor = 'bg-gradient-to-r from-sky-400 to-blue-500';
    }
  }

  return (
    <div className={`p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5 ${className}`}>
      {/* 1. SCHEDA ATTIVA */}
      <div className="min-w-0">
        <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">
          SCHEDA ATTIVA
        </span>
        <p className="text-xs font-black text-white truncate mt-0.5" title={workoutTitle}>
          {workoutTitle}
        </p>
      </div>

      {/* 2. ALLENAMENTI COMPLETATI */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] gap-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
            ALLENAMENTI COMPLETATI
          </span>
          <span
            className="font-mono font-bold text-white text-xs shrink-0 cursor-help"
            title={detailTooltip}
          >
            {progressText}
          </span>
        </div>

        {/* Barra di avanzamento orizzontale */}
        <div className="w-full h-2 bg-slate-800/90 rounded-full overflow-hidden p-0.5 border border-slate-700/40 shadow-inner">
          <div
            className={`h-full transition-all duration-500 rounded-full ${barColor}`}
            style={{ width: `${Math.min(100, Math.max(0, progressPercentage))}%` }}
          />
        </div>

        {/* 3. Dettagli temporali: Ultimo allenamento e Prossimo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[10px] pt-0.5 text-slate-400">
          <div className="truncate">
            <span className="text-slate-500 font-medium">Ultimo allenamento: </span>
            <span className="text-slate-200 font-bold">{lastWorkoutLabel}</span>
          </div>
          <div className="truncate sm:text-right">
            <span className="text-slate-500 font-medium">Prossimo: </span>
            <span className="text-[var(--color-primary)] font-bold">{nextSessionLabel}</span>
          </div>
        </div>
      </div>

      {/* 4. Durata programma */}
      <div className="pt-1.5 border-t border-slate-800/60 flex items-center justify-between">
        <span className="text-[10px] font-medium text-slate-500">Durata programma</span>
        <span className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-700/80 text-[10px] font-mono font-bold text-[var(--color-primary)]">
          {totalWeeks} {totalWeeks === 1 ? 'settimana' : 'settimane'}
        </span>
      </div>
    </div>
  );
};
