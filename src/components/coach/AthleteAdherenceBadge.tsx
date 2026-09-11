import React from 'react';
import { Shield, Crown } from 'lucide-react';
import { AdherenceScoreResult } from '../../services/adherenceService';
import { AdherenceRankBadge } from '../common/AdherenceRankBadge';
import { getAdherenceRank } from '../../utils/adherenceRanks';

interface AthleteAdherenceBadgeProps {
  adherence?: AdherenceScoreResult | null;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showNextRank?: boolean;
  className?: string;
}

export const AthleteAdherenceBadge: React.FC<AthleteAdherenceBadgeProps> = ({
  adherence,
  size = 'md',
  showLabel = true,
  showNextRank = true,
  className = '',
}) => {
  if (!adherence) {
    if (size === 'sm') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-slate-800 bg-slate-900/60 text-slate-500 font-mono text-[10px]">
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

  const { score, pillars } = adherence;
  const rankResult = getAdherenceRank(score);

  if (size === 'sm') {
    return (
      <AdherenceRankBadge
        adherence={score}
        size="sm"
        variant={showLabel ? 'full' : 'compact'}
        showNextRank={false}
        className={className}
      />
    );
  }

  if (size === 'md') {
    return (
      <AdherenceRankBadge
        adherence={score}
        size="md"
        variant={showLabel ? 'full' : 'compact'}
        showNextRank={showNextRank}
        className={className}
      />
    );
  }

  // Size === 'lg' (Card approfondita per Panoramica Atleta)
  const rank = rankResult.rank;
  const color = rank?.color || '#64748B';

  return (
    <div
      style={{
        backgroundColor: `${color}10`,
        borderColor: `${color}40`,
        boxShadow: `0 0 16px ${color}18`,
      }}
      className={`p-4 rounded-3xl border space-y-3.5 shadow-md ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            style={{
              backgroundColor: `${color}20`,
              borderColor: `${color}55`,
            }}
            className="w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 relative"
          >
            <Shield className="w-5 h-5" style={{ color }} />
            {rankResult.isMaxRank && (
              <Crown className="w-3 h-3 absolute -top-1.5 -right-1 text-amber-300 drop-shadow-[0_0_4px_rgba(250,204,21,0.8)]" />
            )}
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] block">
              Grado di Aderenza (Ultimi 28 gg)
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black uppercase tracking-wider" style={{ color }}>
                {rank?.name || 'Senza Stendardo'}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                ({score}/100)
              </span>
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-2xl font-black font-mono tracking-tight" style={{ color }}>
            {score}%
          </div>
          {rankResult.nextRank && (
            <span className="text-[10px] text-slate-400 font-medium block">
              {rankResult.pointsRemainingMessage}
            </span>
          )}
        </div>
      </div>

      {/* Barra progressione verso il prossimo grado */}
      {rankResult.nextRank && rankResult.nextThreshold !== null && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-semibold text-slate-400">
            <span>Grado attuale: <strong style={{ color }}>{rank?.name}</strong></span>
            <span>Prossimo: <strong>{rankResult.nextRank.name} ({rankResult.nextThreshold}%)</strong></span>
          </div>
          <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.max(5, (score / rankResult.nextThreshold) * 100))}%`,
                backgroundColor: color,
              }}
            />
          </div>
        </div>
      )}

      {/* Mini breakdown coerente dei 4 pilastri */}
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
};
