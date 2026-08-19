import React, { useState, useMemo } from 'react';
import {
  Crown,
  Zap,
  Lock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Trophy,
  Sparkles
} from 'lucide-react';
import {
  evaluateAthleteAchievements,
  AchievementCategory,
  AchievementTier
} from '../../utils/athleteGamification';
import { AthleteMaxLift, AthleteMetric } from '../../types/metrics';

interface AthleteTrophiesSectionProps {
  completedWorkoutsCount: number;
  maxLifts: AthleteMaxLift[];
  metrics: AthleteMetric[];
}

export const AthleteTrophiesSection: React.FC<AthleteTrophiesSectionProps> = ({
  completedWorkoutsCount,
  maxLifts,
  metrics,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'all'>('all');

  const { badges, levelInfo } = useMemo(() => {
    return evaluateAthleteAchievements({
      completedWorkoutsCount,
      maxLifts,
      metrics,
    });
  }, [completedWorkoutsCount, maxLifts, metrics]);

  const filteredBadges = useMemo(() => {
    if (selectedCategory === 'all') return badges;
    return badges.filter((b) => b.category === selectedCategory);
  }, [badges, selectedCategory]);

  const unlockedBadges = useMemo(() => {
    return badges.filter((b) => b.isUnlocked);
  }, [badges]);

  const getTierColor = (tier: AchievementTier, isUnlocked: boolean) => {
    if (!isUnlocked) return 'border-slate-800 bg-slate-950/70 text-slate-500';
    switch (tier) {
      case 'diamond':
        return 'border-cyan-400/50 bg-gradient-to-br from-cyan-950/40 via-slate-900 to-slate-950 shadow-lg shadow-cyan-500/10 text-cyan-300';
      case 'gold':
        return 'border-amber-400/50 bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 shadow-lg shadow-amber-500/10 text-amber-300';
      case 'silver':
        return 'border-slate-400/40 bg-gradient-to-br from-slate-800/40 via-slate-900 to-slate-950 shadow-md text-slate-200';
      case 'bronze':
      default:
        return 'border-orange-500/40 bg-gradient-to-br from-orange-950/30 via-slate-900 to-slate-950 shadow-sm text-orange-300';
    }
  };

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 shadow-xl space-y-4 transition-all">
      
      {/* ─── HEADER LIVELLO & PROGRESSO XP CON TASTO APRI/CHIUDI TENDINA ─── */}
      <div
        onClick={() => setIsExpanded((prev) => !prev)}
        className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900/90 to-slate-950 border border-amber-500/30 shadow-lg relative overflow-hidden cursor-pointer group hover:border-amber-500/50 transition-all select-none"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          
          {/* Corona & Info Livello */}
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-amber-500 flex items-center justify-center text-slate-950 shadow-lg shadow-[var(--color-primary)]/20 shrink-0 group-hover:scale-105 transition-transform">
              <Crown className="w-7 h-7 stroke-[2.5]" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-[var(--color-primary)]/20 text-[var(--color-primary)] font-black text-[10px] uppercase tracking-wider border border-[var(--color-primary)]/40">
                  Livello {levelInfo.level}
                </span>
                <span className="text-xs font-bold text-slate-400">
                  {levelInfo.unlockedBadgesCount} / {levelInfo.totalBadgesCount} Trofei Sbloccati
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white mt-0.5 tracking-tight group-hover:text-amber-300 transition-colors">
                {levelInfo.levelTitle}
              </h3>
            </div>
          </div>

          {/* XP & Tasto Espandi/Comprimi */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:max-w-md w-full sm:w-auto justify-between sm:justify-end">
            {/* Barra XP */}
            <div className="space-y-1 w-full sm:w-48">
              <div className="flex items-center justify-between gap-2 text-xs font-bold">
                <span className="text-slate-400 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                  XP:
                </span>
                <span className="font-mono font-black text-[var(--color-primary)] text-sm">
                  {levelInfo.totalXP} XP
                </span>
              </div>

              {/* Barra di avanzamento XP */}
              <div className="w-full bg-slate-950 rounded-full h-2 border border-slate-800 overflow-hidden shadow-inner">
                <div
                  className="bg-gradient-to-r from-[var(--color-primary)] to-amber-400 h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${levelInfo.progressPercent}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500 font-semibold block">
                {levelInfo.progressPercent}% verso Livello {levelInfo.level + 1}
              </span>
            </div>

            {/* Pulsante Tendina */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded((prev) => !prev);
              }}
              className={`px-3.5 py-2 rounded-xl border text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-sm shrink-0 cursor-pointer ${
                isExpanded
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-amber-500/10'
                  : 'bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border-slate-800'
              }`}
            >
              <span>{isExpanded ? 'Chiudi' : 'Vedi Trofei'}</span>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-amber-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-amber-400" />
              )}
            </button>
          </div>

        </div>
      </div>

      {/* ─── ANTEPRIMA COMPATTA QUANDO LA TENDINA È CHIUSA ─── */}
      {!isExpanded && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 px-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              Trofei Raggiunti:
            </span>
            {unlockedBadges.length === 0 ? (
              <span className="text-xs text-slate-500 italic">Nessun trofeo sbloccato ancora</span>
            ) : (
              unlockedBadges.slice(0, 4).map((badge) => (
                <span
                  key={badge.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-slate-200"
                  title={badge.description}
                >
                  <span>{badge.icon}</span>
                  <span className="truncate max-w-[120px]">{badge.title}</span>
                </span>
              ))
            )}
            {unlockedBadges.length > 4 && (
              <span className="text-xs font-bold text-amber-400/90 font-mono">
                +{unlockedBadges.length - 4} altri
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="text-xs font-black text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer self-start sm:self-auto"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Espandi tutti i 12 trofei</span>
          </button>
        </div>
      )}

      {/* ─── CONTENUTO COMPLETO ESPANSO (FILTRI & GRIGLIA TROFEI) ─── */}
      {isExpanded && (
        <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Filtri Categorie a Pillola */}
          <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-800 pb-3">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {[
                { id: 'all', label: 'Tutti', icon: '🏆' },
                { id: 'workout', label: 'Allenamenti', icon: '🏋️' },
                { id: 'strength', label: 'Forza & PR', icon: '⚡' },
                { id: 'checkin', label: 'Check-in', icon: '⚖️' },
              ].map((cat) => {
                const isSel = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id as AchievementCategory | 'all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 active:scale-95 ${
                      isSel
                        ? 'bg-[var(--color-primary)] text-slate-950 font-black shadow-md shadow-[var(--color-primary)]/20'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            <span className="text-[11px] font-bold text-slate-400">
              {filteredBadges.filter((b) => b.isUnlocked).length} di {filteredBadges.length} completati
            </span>
          </div>

          {/* Griglia Badge & Trofei */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredBadges.map((badge) => {
              const tierStyle = getTierColor(badge.tier, badge.isUnlocked);

              return (
                <div
                  key={badge.id}
                  className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between space-y-3 relative overflow-hidden ${tierStyle} ${
                    badge.isUnlocked ? 'hover:scale-[1.02]' : 'opacity-70'
                  }`}
                >
                  {/* Header Badge */}
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 border ${
                        badge.isUnlocked
                          ? 'bg-slate-950/80 border-amber-400/40 shadow-md'
                          : 'bg-slate-900 border-slate-800'
                      }`}
                    >
                      {badge.isUnlocked ? badge.icon : <Lock className="w-5 h-5 text-slate-600" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="font-extrabold text-sm text-white tracking-tight truncate">
                          {badge.title}
                        </h4>
                        <span
                          className={`text-[10px] font-black font-mono px-1.5 py-0.5 rounded-md ${
                            badge.isUnlocked
                              ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                              : 'bg-slate-900 text-slate-500'
                          }`}
                        >
                          +{badge.xpValue} XP
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                        {badge.description}
                      </p>
                    </div>
                  </div>

                  {/* Barra di Progresso o Badge Sbloccato */}
                  <div className="pt-2 border-t border-slate-800/60">
                    {badge.isUnlocked ? (
                      <div className="flex items-center justify-between text-[10px] font-bold text-emerald-400">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Traguardo Raggiunto
                        </span>
                        <span className="font-mono text-slate-400">{badge.progressLabel}</span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-slate-500">
                          <span>Progresso</span>
                          <span className="font-mono text-slate-400">{badge.progressLabel}</span>
                        </div>
                        <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                          <div
                            className="bg-slate-600 h-full rounded-full"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.round((badge.currentProgress / badge.targetProgress) * 100)
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tasto Richiudi in fondo */}
          <div className="pt-2 text-center border-t border-slate-800/60">
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-white border border-slate-800 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <ChevronUp className="w-4 h-4 text-amber-400" />
              <span>Comprimi Bacheca Trofei</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
