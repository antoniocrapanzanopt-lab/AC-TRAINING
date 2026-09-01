import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { AdherenceScoreResult } from '../../services/adherenceService';

interface AthleteAdherenceBadgeProps {
  adherence?: AdherenceScoreResult | null;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const AthleteAdherenceBadge: React.FC<AthleteAdherenceBadgeProps> = ({
  adherence,
  size = 'md',
  showLabel = true,
}) => {
  if (!adherence) {
    if (size === 'sm') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-500 font-mono text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-600 animate-pulse" />
          <span>...</span>
        </span>
      );
    }
    return (
      <div className="p-3 rounded-2xl border border-slate-800 bg-slate-900/40 animate-pulse">
        <div className="h-4 w-24 bg-slate-800 rounded" />
      </div>
    );
  }

  const { score, label, colorClass, bgClass, borderClass, pillars } = adherence;

  if (size === 'sm') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border font-mono text-[11px] font-black ${bgClass} ${colorClass} ${borderClass}`}
        title={`Indice Aderenza Ufficiale: ${score}/100 (${label})`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        <span>{score}%</span>
        {showLabel && <span className="font-sans font-bold text-[10px] opacity-80 uppercase tracking-wider">{label}</span>}
      </span>
    );
  }

  if (size === 'lg') {
    return (
      <div className={`p-4 rounded-3xl border ${bgClass} ${borderClass} space-y-3 shadow-md`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-2xl ${bgClass} border ${borderClass} flex items-center justify-center ${colorClass} shrink-0`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] block">
                Indice Aderenza Ufficiale (Ultimi 28 gg)
              </span>
              <span className={`text-sm font-black ${colorClass}`}>
                {label} ({score}/100)
              </span>
            </div>
          </div>
          <div className={`text-2xl font-black font-mono ${colorClass}`}>
            {score}%
          </div>
        </div>

        {/* Mini breakdown coerente identico a vista atleta */}
        <div className="grid grid-cols-4 gap-1.5 pt-1 text-center">
          <div className="bg-[var(--color-panel)] p-2 rounded-xl border border-[var(--color-border)]/60">
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] block">Sedute</span>
            <span className="text-xs font-black font-mono text-[var(--color-primary)]">{pillars.workouts.score}%</span>
          </div>
          <div className="bg-[var(--color-panel)] p-2 rounded-xl border border-[var(--color-border)]/60">
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] block">Serie</span>
            <span className="text-xs font-black font-mono text-emerald-400">{pillars.sets.score}%</span>
          </div>
          <div className="bg-[var(--color-panel)] p-2 rounded-xl border border-[var(--color-border)]/60">
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] block">Feedback</span>
            <span className="text-xs font-black font-mono text-purple-400">{pillars.feedback.score}%</span>
          </div>
          <div className="bg-[var(--color-panel)] p-2 rounded-xl border border-[var(--color-border)]/60">
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] block">Check-in</span>
            <span className="text-xs font-black font-mono text-sky-400">{pillars.checkins.score}%</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-black ${bgClass} ${colorClass} ${borderClass} shadow-sm`}
      title={`Indice Aderenza Ufficiale: ${score}/100 (${label})`}
    >
      <ShieldCheck className="w-3.5 h-3.5" />
      <span>{score}%</span>
      {showLabel && <span className="font-sans font-bold text-[11px] opacity-90">{label}</span>}
    </span>
  );
};
