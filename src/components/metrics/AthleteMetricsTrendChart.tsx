import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Calendar,
  Sparkles,
  Plus,
} from 'lucide-react';
import { AthleteMetric } from '../../types/metrics';

interface AthleteMetricsTrendChartProps {
  metrics: AthleteMetric[];
  onOpenCheckIn?: () => void;
}

type MetricKey =
  | 'weight_kg'
  | 'body_fat_percentage'
  | 'waist_cm'
  | 'chest_cm'
  | 'bicep_right_cm'
  | 'thigh_right_cm';

interface MetricOption {
  key: MetricKey;
  label: string;
  unit: string;
  icon: string;
  color: string;
}

const METRIC_OPTIONS: MetricOption[] = [
  { key: 'weight_kg', label: 'Peso', unit: 'kg', icon: '⚖️', color: 'var(--color-primary)' },
  { key: 'body_fat_percentage', label: '% Grasso', unit: '%', icon: '📉', color: '#f59e0b' },
  { key: 'waist_cm', label: 'Vita', unit: 'cm', icon: '📏', color: '#38bdf8' },
  { key: 'chest_cm', label: 'Torace', unit: 'cm', icon: '📐', color: '#a855f7' },
  { key: 'bicep_right_cm', label: 'Braccia', unit: 'cm', icon: '💪', color: '#ec4899' },
  { key: 'thigh_right_cm', label: 'Cosce', unit: 'cm', icon: '🦵', color: '#10b981' },
];

export const AthleteMetricsTrendChart: React.FC<AthleteMetricsTrendChartProps> = ({
  metrics,
  onOpenCheckIn,
}) => {
  const [selectedMetricKey, setSelectedMetricKey] = useState<MetricKey>('weight_kg');

  const selectedMetric = useMemo(() => {
    return METRIC_OPTIONS.find((m) => m.key === selectedMetricKey) || METRIC_OPTIONS[0];
  }, [selectedMetricKey]);

  // Prepara i dati ordinati cronologicamente (dal più vecchio al più recente per il grafico)
  const chartData = useMemo(() => {
    return metrics
      .filter((m) => {
        const val = m[selectedMetricKey];
        return typeof val === 'number' && !isNaN(val) && val > 0;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((m) => {
        const dateObj = new Date(m.date);
        return {
          id: m.id,
          date: m.date,
          formattedDate: dateObj.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }),
          fullDate: dateObj.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' }),
          value: Number(m[selectedMetricKey]),
          notes: m.notes || '',
        };
      });
  }, [metrics, selectedMetricKey]);

  // Calcolo KPI (Partenza, Attuale, Delta)
  const stats = useMemo(() => {
    if (chartData.length === 0) return null;
    const firstVal = chartData[0].value;
    const lastVal = chartData[chartData.length - 1].value;
    const delta = Math.round((lastVal - firstVal) * 10) / 10;
    const minVal = Math.min(...chartData.map((d) => d.value));
    const maxVal = Math.max(...chartData.map((d) => d.value));

    return {
      first: firstVal,
      current: lastVal,
      delta,
      min: minVal,
      max: maxVal,
      count: chartData.length,
    };
  }, [chartData]);

  // Calcolo range Asse Y morbido
  const yDomain = useMemo(() => {
    if (!stats) return [0, 100];
    const padding = Math.max(1, Math.round((stats.max - stats.min) * 0.15));
    const min = Math.max(0, Math.floor(stats.min - padding));
    const max = Math.ceil(stats.max + padding);
    return [min, max];
  }, [stats]);

  return (
    <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 shadow-xl space-y-4 sm:space-y-5 overflow-hidden">
      
      {/* ─── HEADER & SELETTORE METRICHE CON SCORRIMENTO TOUCH ─── */}
      <div className="space-y-3 border-b border-slate-800/80 pb-3 sm:pb-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-primary)] flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              Trend & Progressione Corporea
            </span>
            <h3 className="text-base sm:text-lg font-black text-white mt-0.5">
              Evoluzione {selectedMetric.label}
            </h3>
          </div>

          <span className="text-[11px] font-mono font-bold text-slate-400 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 shrink-0">
            {chartData.length} {chartData.length === 1 ? 'rilevazione' : 'rilevazioni'}
          </span>
        </div>

        {/* Switch Metriche Orizzontale a Scorrimento Rapido */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 -mx-1 px-1 touch-pan-x">
          {METRIC_OPTIONS.map((opt) => {
            const isSelected = opt.key === selectedMetricKey;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setSelectedMetricKey(opt.key)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 select-none active:scale-95 ${
                  isSelected
                    ? 'bg-[var(--color-primary)] text-slate-950 font-black shadow-md shadow-[var(--color-primary)]/20 ring-1 ring-[var(--color-primary)]'
                    : 'bg-slate-950/80 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
                }`}
              >
                <span className="text-xs">{opt.icon}</span>
                <span className="whitespace-nowrap">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── KPI METRICHE IN EVIDENZA ─── */}
      {stats && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {/* Partenza */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-0.5">
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Iniziale
            </span>
            <div className="text-sm sm:text-lg font-black font-mono text-slate-300">
              {stats.first} <span className="text-[10px] sm:text-xs font-sans text-slate-500">{selectedMetric.unit}</span>
            </div>
            <span className="text-[9px] text-slate-500 block truncate">
              {chartData[0]?.formattedDate}
            </span>
          </div>

          {/* Attuale */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-0.5">
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Attuale
            </span>
            <div className="text-sm sm:text-lg font-black font-mono text-white">
              {stats.current} <span className="text-[10px] sm:text-xs font-sans text-[var(--color-primary)] font-bold">{selectedMetric.unit}</span>
            </div>
            <span className="text-[9px] text-slate-500 block truncate">
              {chartData[chartData.length - 1]?.formattedDate}
            </span>
          </div>

          {/* Variazione Netta (Delta) */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-0.5">
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Delta
            </span>
            <div className="flex items-center gap-0.5">
              <span className={`text-sm sm:text-lg font-black font-mono flex items-center ${
                stats.delta < 0
                  ? 'text-sky-400'
                  : stats.delta > 0
                  ? 'text-amber-400'
                  : 'text-slate-400'
              }`}>
                {stats.delta > 0 ? (
                  <TrendingUp className="w-3.5 h-3.5 text-amber-400 shrink-0 mr-0.5" />
                ) : stats.delta < 0 ? (
                  <TrendingDown className="w-3.5 h-3.5 text-sky-400 shrink-0 mr-0.5" />
                ) : (
                  <Minus className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-0.5" />
                )}
                {stats.delta > 0 ? `+${stats.delta}` : stats.delta}
              </span>
              <span className="text-[10px] sm:text-xs font-sans text-slate-500 font-bold">{selectedMetric.unit}</span>
            </div>
            <span className="text-[9px] text-slate-500 block truncate">
              Su {stats.count} check
            </span>
          </div>
        </div>
      )}

      {/* ─── GRAFICO RECHARTS AREA SPLINE CON MARGINI OTTIMIZZATI PER SMARTPHONE ─── */}
      {chartData.length >= 2 ? (
        <div className="w-full h-52 sm:h-64 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="metricGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />

              <XAxis
                dataKey="formattedDate"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                tickLine={false}
                axisLine={{ stroke: '#334155', opacity: 0.6 }}
              />

              <YAxis
                domain={yDomain}
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                tickLine={false}
                axisLine={false}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-950/95 border border-slate-800 p-3 rounded-2xl shadow-2xl backdrop-blur-md space-y-1 z-50">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                          <Calendar className="w-3 h-3 text-[var(--color-primary)]" />
                          <span>{data.fullDate}</span>
                        </div>
                        <div className="text-base font-black font-mono text-white flex items-center gap-1">
                          <span>{data.value}</span>
                          <span className="text-xs text-[var(--color-primary)] font-bold">{selectedMetric.unit}</span>
                        </div>
                        {data.notes && (
                          <p className="text-[11px] text-slate-300 italic pt-1 border-t border-slate-800/80 max-w-xs">
                            "{data.notes}"
                          </p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--color-primary)"
                strokeWidth={2.5}
                fill="url(#metricGradient)"
                activeDot={{ r: 5, fill: 'var(--color-primary)', stroke: '#0f172a', strokeWidth: 2 }}
                dot={{ r: 3.5, fill: '#0f172a', stroke: 'var(--color-primary)', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="py-8 sm:py-10 text-center space-y-3 border border-dashed border-slate-800/80 bg-slate-950/40 rounded-2xl p-4">
          <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/25 flex items-center justify-center text-[var(--color-primary)] mx-auto shadow-md shadow-[var(--color-primary)]/5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs sm:text-sm font-black text-white">
              {chartData.length === 1 ? `1 sola rilevazione di ${selectedMetric.label}` : `Nessun dato per ${selectedMetric.label}`}
            </h4>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto leading-relaxed">
              {chartData.length === 1
                ? `Hai registrato ${chartData[0].value} ${selectedMetric.unit} il ${chartData[0].formattedDate}. Inserisci un secondo check per visualizzare la curva di trend.`
                : `Registra almeno 2 check-in con ${selectedMetric.label} per generare la curva di progressione temporale.`}
            </p>
          </div>
          {onOpenCheckIn && (
            <div className="pt-1">
              <button
                type="button"
                onClick={onOpenCheckIn}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-[var(--color-primary)] border border-[var(--color-primary)]/30 hover:border-[var(--color-primary)] font-black text-xs transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Registra {selectedMetric.label}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
