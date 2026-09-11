import React, { useState } from 'react';
import { Shield, Crown, HelpCircle } from 'lucide-react';
import { getAdherenceRank } from '../../utils/adherenceRanks';

export interface AdherenceRankBadgeProps {
  /** Percentuale di aderenza (0–100), o null/undefined se non disponibile */
  adherence: number | null | undefined;
  /** Variante di visualizzazione: 'full' (scudo + grado + %) o 'compact' (scudo + grado) */
  variant?: 'full' | 'compact';
  /** Se true, mostra sotto il badge il testo secondario con i punti mancanti al prossimo grado */
  showNextRank?: boolean;
  /** Dimensione visuale del badge */
  size?: 'sm' | 'md' | 'lg';
  /** Classi CSS aggiuntive per il contenitore */
  className?: string;
}

export const AdherenceRankBadge: React.FC<AdherenceRankBadgeProps> = ({
  adherence,
  variant = 'full',
  showNextRank = false,
  size = 'md',
  className = '',
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const result = getAdherenceRank(adherence);

  // Dimensioni specifiche in base a size
  const sizeStyles = {
    sm: {
      badge: 'px-2.5 py-0.5 text-[10px] gap-1.5',
      icon: 'w-3 h-3',
      crown: 'w-2 h-2 -top-1 -right-1',
      subtext: 'text-[9px]',
    },
    md: {
      badge: 'px-3 py-1 text-xs gap-2',
      icon: 'w-3.5 h-3.5',
      crown: 'w-2.5 h-2.5 -top-1.5 -right-1',
      subtext: 'text-[10px]',
    },
    lg: {
      badge: 'px-4 py-1.5 text-sm gap-2.5',
      icon: 'w-4 h-4',
      crown: 'w-3 h-3 -top-2 -right-1.5',
      subtext: 'text-xs',
    },
  }[size];

  // Stato neutro per dati mancanti / non validi
  if (!result.isValid || !result.rank || result.score === null) {
    return (
      <div className={`inline-flex flex-col items-start ${className}`}>
        <span
          role="status"
          aria-label={result.ariaLabel}
          title={result.tooltipText}
          className={`inline-flex items-center rounded-full border border-slate-700/60 bg-slate-800/40 text-slate-400 font-semibold select-none ${sizeStyles.badge}`}
        >
          <HelpCircle className={sizeStyles.icon} />
          <span className="uppercase tracking-wider">Dati insufficienti</span>
        </span>
      </div>
    );
  }

  const { rank, nextRank, nextThreshold, pointsRemainingMessage, ariaLabel, tooltipText, isMaxRank } = result;
  const score = result.score;

  // Stili calcolati con opacità precisa per estetica tech/dark
  const badgeStyle: React.CSSProperties = {
    backgroundColor: `${rank.color}15`, // ~8% opacità sfondo
    borderColor: `${rank.color}55`, // ~33% opacità bordo
    boxShadow: `0 0 12px ${rank.color}22`, // Glow discreto
  };

  return (
    <div
      className={`inline-flex flex-col items-start relative group ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* ─── BADGE PILL PRINCIPALE ─── */}
      <div
        role="status"
        aria-label={ariaLabel}
        title={tooltipText}
        style={badgeStyle}
        className={`inline-flex items-center rounded-full border font-bold transition-all duration-300 select-none cursor-default ${sizeStyles.badge}`}
      >
        {/* Icona Scudo con Corona speciale per Gran Maestro */}
        <div className="relative flex items-center justify-center shrink-0">
          <Shield className={sizeStyles.icon} style={{ color: rank.color }} />
          {isMaxRank && (
            <Crown
              className={`absolute ${sizeStyles.crown} text-amber-300 drop-shadow-[0_0_4px_rgba(250,204,21,0.8)]`}
            />
          )}
        </div>

        {/* Nome Grado in Uppercase */}
        <span
          style={{ color: rank.color }}
          className="uppercase tracking-wider font-extrabold whitespace-nowrap"
        >
          {rank.name}
        </span>

        {/* Variante Full: Separatore + Percentuale */}
        {variant === 'full' && (
          <>
            <span style={{ color: rank.color }} className="opacity-40 font-bold select-none">
              ·
            </span>
            <span
              style={{ color: rank.color }}
              className="font-mono font-black tracking-tight whitespace-nowrap"
            >
              {score}%
            </span>
          </>
        )}
      </div>

      {/* ─── TESTO SECONDARIO SOTTO AL BADGE (SE RICHIESTO) ─── */}
      {showNextRank && (
        <span
          className={`mt-0.5 pl-1 font-medium text-slate-400 tracking-tight transition-opacity ${sizeStyles.subtext}`}
        >
          {pointsRemainingMessage}
        </span>
      )}

      {/* ─── TOOLTIP FLOTTANTE ACCESSIBILE & RICCO ─── */}
      {isHovered && (
        <div
          role="tooltip"
          className="absolute z-50 left-0 top-full mt-2 w-64 p-3 rounded-2xl bg-slate-950/95 border border-slate-800 shadow-2xl backdrop-blur-xl text-left space-y-1.5 pointer-events-none animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Grado di Aderenza
            </span>
            <span
              style={{ color: rank.color }}
              className="font-mono text-xs font-black"
            >
              {score}%
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" style={{ color: rank.color }} />
            <span className="text-xs font-bold text-white uppercase tracking-wide">
              {rank.name}
            </span>
          </div>

          <p className="text-[11px] text-slate-300 leading-snug">
            {nextRank && nextThreshold !== null
              ? `Prossimo grado: ${nextRank.name} al ${nextThreshold}% (${pointsRemainingMessage.toLowerCase()}).`
              : 'Hai raggiunto il massimo grado di aderenza al percorso.'}
          </p>

          {nextThreshold !== null && (
            <div className="pt-1">
              <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, Math.max(5, (score / nextThreshold) * 100))}%`,
                    backgroundColor: rank.color,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
