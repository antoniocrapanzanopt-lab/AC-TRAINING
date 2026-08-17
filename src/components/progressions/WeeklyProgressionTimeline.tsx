import React, { useState } from 'react';
import {
  Calendar,
  TrendingUp,
  Shield,
  Sparkles,
  Info,
  Flame,
  BatteryCharging,
  Plus,
  Minus,
} from 'lucide-react';
import {
  ProgressionRule,
  ProgressionRuleTemplate,
  ProgressionTarget,
  ProgressionWeekProjection,
} from '../../types/progression';
import { generateWeeklyBlockProjection } from '../../lib/progression/progressionEngine';

interface WeeklyProgressionTimelineProps {
  ruleOrTemplate: ProgressionRule | ProgressionRuleTemplate;
  baseTarget?: ProgressionTarget;
  currentStep?: number;
  totalWeeks?: number;
  onChangeTotalWeeks?: (weeks: number) => void;
  onSelectWeek?: (week: ProgressionWeekProjection) => void;
}

export const WeeklyProgressionTimeline: React.FC<WeeklyProgressionTimelineProps> = ({
  ruleOrTemplate,
  baseTarget,
  currentStep = 1,
  totalWeeks: propTotalWeeks = 6,
  onChangeTotalWeeks,
  onSelectWeek,
}) => {
  const [internalTotalWeeks, setInternalTotalWeeks] = useState<number>(propTotalWeeks);
  const totalWeeks = onChangeTotalWeeks ? propTotalWeeks : internalTotalWeeks;

  const setTotalWeeks = (newWeeks: number) => {
    const clamped = Math.max(2, Math.min(16, newWeeks));
    setInternalTotalWeeks(clamped);
    if (onChangeTotalWeeks) {
      onChangeTotalWeeks(clamped);
    }
  };

  const [selectedWeekNum, setSelectedWeekNum] = useState<number>(currentStep);

  const projections = generateWeeklyBlockProjection(ruleOrTemplate, baseTarget, totalWeeks);

  const getPhaseBadge = (proj: ProgressionWeekProjection) => {
    if (proj.is_deload || proj.phase === 'deload') {
      return {
        label: 'Scarico (Deload)',
        icon: BatteryCharging,
        classes: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
      };
    }
    switch (proj.phase) {
      case 'accumulation':
        return {
          label: 'Accumulo Volume',
          icon: TrendingUp,
          classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        };
      case 'intensification':
        return {
          label: 'Intensificazione',
          icon: Flame,
          classes: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        };
      case 'peak':
        return {
          label: 'Top Range / Peak',
          icon: Sparkles,
          classes: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
        };
      case 'hold':
        return {
          label: 'Consolidamento',
          icon: Shield,
          classes: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
        };
      default:
        return {
          label: proj.phase_label,
          icon: Info,
          classes: 'bg-slate-800 text-slate-400 border-slate-700',
        };
    }
  };

  const selectedProjection = projections.find((p) => p.week_number === selectedWeekNum) || projections[0];

  return (
    <div className="space-y-4">
      {/* Header & Week Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-950/80 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)]">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Proiezione Settimanale del Blocco ({totalWeeks} Settimane)
            </h4>
            <p className="text-[11px] text-slate-400">
              Traiettoria programmata di sovraccarico calcolata dal motore
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto bg-slate-900 p-1.5 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-500 font-bold px-1.5">Settimane:</span>
          
          <button
            type="button"
            onClick={() => setTotalWeeks(totalWeeks - 1)}
            disabled={totalWeeks <= 2}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Rimuovi una settimana"
          >
            <Minus className="w-3 h-3" />
          </button>

          {[3, 4, 5, 6, 8, 10, 12].map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setTotalWeeks(w)}
              className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                totalWeeks === w
                  ? 'bg-[var(--color-primary)] text-black shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {w}W
            </button>
          ))}

          <button
            type="button"
            onClick={() => setTotalWeeks(totalWeeks + 1)}
            disabled={totalWeeks >= 16}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-[var(--color-primary)] hover:text-white transition-all flex items-center gap-0.5 text-xs font-bold px-2 cursor-pointer"
            title="Aggiungi una settimana di progressione"
          >
            <Plus className="w-3 h-3" />
            <span className="text-[10px]">Aggiungi</span>
          </button>
        </div>
      </div>

      {/* Interactive Timeline Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {projections.map((p) => {
          const badge = getPhaseBadge(p);
          const isCurrent = p.week_number === currentStep;
          const isSelected = p.week_number === selectedWeekNum;
          const IconComponent = badge.icon;

          return (
            <button
              key={p.week_number}
              type="button"
              onClick={() => {
                setSelectedWeekNum(p.week_number);
                if (onSelectWeek) onSelectWeek(p);
              }}
              className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer ${
                isSelected
                  ? 'bg-slate-900 border-[var(--color-primary)] shadow-lg shadow-[var(--color-primary)]/10 ring-1 ring-[var(--color-primary)]/50'
                  : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-900/80 hover:border-slate-700'
              }`}
            >
              {isCurrent && (
                <span className="absolute top-0 right-0 px-2 py-0.5 bg-[var(--color-primary)] text-black text-[9px] font-black uppercase rounded-bl-lg">
                  In Corso
                </span>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-black text-white">Settimana {p.week_number}</span>
                </div>

                <div className="flex items-center gap-1 mb-2">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border flex items-center gap-1 ${badge.classes}`}>
                    <IconComponent className="w-2.5 h-2.5" />
                    {badge.label.split(' ')[0]}
                  </span>
                </div>

                <div className="text-sm font-bold text-white mb-0.5">
                  {p.sets} × {p.reps}
                </div>

                <div className="text-xs font-mono font-bold text-[var(--color-primary)]">
                  {p.load_display || `${p.load_kg || 0} kg`}
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
                <span>{p.rir || 'RIR 2'}</span>
                <span>{p.rest_seconds || 90}s</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Week Detail Card */}
      {selectedProjection && (
        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/90 space-y-3 animate-in fade-in duration-150">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/30 text-xs font-black">
                Settimana {selectedProjection.week_number}
              </span>
              <span className="text-sm font-bold text-white">
                {selectedProjection.phase_label}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="text-slate-400">
                Recupero: <strong className="text-slate-200">{selectedProjection.rest_seconds || 90}s</strong>
              </span>
              <span className="text-slate-400">
                RIR/RPE: <strong className="text-slate-200">{selectedProjection.rir || 'RIR 2'} (RPE {selectedProjection.rpe || 8})</strong>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Obiettivo & Azione */}
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800/80 space-y-1">
              <span className="text-[10px] font-bold uppercase text-[var(--color-primary)] block">
                🎯 Target & Azione Attesa
              </span>
              <p className="text-slate-200 font-medium leading-relaxed">
                {selectedProjection.expected_action}
              </p>
            </div>

            {/* Condizione di Avanzamento */}
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800/80 space-y-1">
              <span className="text-[10px] font-bold uppercase text-emerald-400 block">
                ⚡ Trigger / Condizione di Avanzamento
              </span>
              <p className="text-slate-200 font-medium leading-relaxed">
                {selectedProjection.condition}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Complete Block Table View */}
      <div className="rounded-2xl border border-slate-800 overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-950 border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400">
              <th className="py-2.5 px-3">Week</th>
              <th className="py-2.5 px-3">Fase</th>
              <th className="py-2.5 px-3">Set × Reps</th>
              <th className="py-2.5 px-3">Carico</th>
              <th className="py-2.5 px-3">RIR / RPE</th>
              <th className="py-2.5 px-3">Recupero</th>
              <th className="py-2.5 px-3">Obiettivo & Trigger</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-slate-900/40 font-medium">
            {projections.map((p) => {
              const badge = getPhaseBadge(p);
              const isSelected = p.week_number === selectedWeekNum;
              return (
                <tr
                  key={p.week_number}
                  onClick={() => setSelectedWeekNum(p.week_number)}
                  className={`hover:bg-slate-800/50 transition-colors cursor-pointer ${
                    isSelected ? 'bg-[var(--color-primary)]/5' : ''
                  }`}
                >
                  <td className="py-2.5 px-3 font-bold text-white">
                    Week {p.week_number}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badge.classes}`}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-bold text-white">
                    {p.sets} × {p.reps}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-[var(--color-primary)]">
                    {p.load_display || `${p.load_kg || 0} kg`}
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">
                    {p.rir || 'RIR 2'}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">
                    {p.rest_seconds || 90}s
                  </td>
                  <td className="py-2.5 px-3 text-slate-300 max-w-xs truncate">
                    {p.expected_action}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
