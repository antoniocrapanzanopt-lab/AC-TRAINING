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
import { useTheme } from '../../context/ThemeContext';

interface AthleteMetricsTrendChartProps {
  metrics: AthleteMetric[];
  onOpenCheckIn?: () => void;
  className?: string;
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
  { key: 'chest_cm', label: 'Petto', unit: 'cm', icon: '📐', color: '#a855f7' },
  { key: 'bicep_right_cm', label: 'Bicipiti', unit: 'cm', icon: '💪', color: '#ec4899' },
  { key: 'thigh_right_cm', label: 'Cosce', unit: 'cm', icon: '🦵', color: '#10b981' },
];

export const AthleteMetricsTrendChart: React.FC<AthleteMetricsTrendChartProps> = ({
  metrics,
  onOpenCheckIn,
  className,
}) => {
  const { effectiveTheme } = useTheme();
  const isDark = effectiveTheme === 'dark';
  const axisTickColor = isDark ? '#94a3b8' : '#334155';
  const axisLineColor = isDark ? '#334155' : '#cbd5e1';
  const gridStroke = isDark ? '#334155' : '#e2e8f0';

  const [selectedMetricKey, setSelectedMetricKey] = useState<MetricKey>('weight_kg');

  const selectedMetric = useMemo(() => {
    return METRIC_OPTIONS.find((m) => m.key === selectedMetricKey) || METRIC_OPTIONS[0];
  }, [selectedMetricKey]);

  // Prepara i dati ordinati cronologicamente (dal più vecchio al più recente per il grafico)
  const chartData = useMemo(() => {
    return metrics
      .map((m) => {
        let val: number | null = null;
        if (selectedMetricKey === 'bicep_right_cm') {
          val = m.bicep_right_cm ?? m.bicep_left_cm ?? null;
        } else if (selectedMetricKey === 'thigh_right_cm') {
          val = m.thigh_right_cm ?? m.thigh_left_cm ?? null;
        } else {
          val = m[selectedMetricKey] ?? null;
        }
        return { m, val };
      })
      .filter(({ val }) => typeof val === 'number' && !isNaN(val) && val > 0)
      .sort((a, b) => new Date(a.m.date).getTime() - new Date(b.m.date).getTime())
      .map(({ m, val }) => {
        const dateObj = new Date(m.date);
        return {
          id: m.id,
          date: m.date,
          formattedDate: dateObj.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }),
          fullDate: dateObj.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' }),
          value: Number(val),
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
    <div className={`p-4 sm:p-6 rounded-3xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xs space-y-4 sm:space-y-5 overflow-hidden ${className || ''}`}>
      
      {/* ─── HEADER & SELETTORE METRICHE CON SCORRIMENTO TOUCH ─── */}
      <div className="space-y-3 border-b border-slate-200/80 dark:border-slate-800/80 pb-3 sm:pb-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-[var(--color-primary)] flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              Trend & Progressione Corporea
            </span>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
              Evoluzione {selectedMetric.label}
            </h3>
          </div>

          <span className="text-[11px] font-mono font-extrabold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0 shadow-xs">
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
                    ? 'bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-400/20 ring-1 ring-amber-400'
                    : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white border border-slate-200 dark:border-slate-700 shadow-xs'
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
          <div className="p-3 sm:p-3.5 rounded-2xl bg-white/95 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-0.5 shadow-xs">
            <span className="text-[10px] font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
              Iniziale
            </span>
            <div className="text-sm sm:text-lg font-black font-mono text-slate-900 dark:text-white">
              {stats.first} <span className="text-[10px] sm:text-xs font-sans text-slate-600 dark:text-slate-400 font-bold">{selectedMetric.unit}</span>
            </div>
            <span className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold block truncate">
              {chartData[0]?.formattedDate}
            </span>
          </div>

          {/* Attuale */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-white/95 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-0.5 shadow-xs">
            <span className="text-[10px] font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
              Attuale
            </span>
            <div className="text-sm sm:text-lg font-black font-mono text-slate-900 dark:text-white">
              {stats.current} <span className="text-[10px] sm:text-xs font-sans text-amber-600 dark:text-[var(--color-primary)] font-extrabold">{selectedMetric.unit}</span>
            </div>
            <span className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold block truncate">
              {chartData[chartData.length - 1]?.formattedDate}
            </span>
          </div>

          {/* Variazione Netta (Delta) */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-white/95 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-0.5 shadow-xs">
            <span className="text-[10px] font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
              Delta
            </span>
            <div className="flex items-center gap-0.5">
              <span className={`text-sm sm:text-lg font-black font-mono flex items-center ${
                stats.delta < 0
                  ? 'text-sky-700 dark:text-sky-400'
                  : stats.delta > 0
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-slate-600 dark:text-slate-400'
              }`}>
                {stats.delta > 0 ? (
                  <TrendingUp className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mr-0.5" />
                ) : stats.delta < 0 ? (
                  <TrendingDown className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0 mr-0.5" />
                ) : (
                  <Minus className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 shrink-0 mr-0.5" />
                )}
                {stats.delta > 0 ? `+${stats.delta}` : stats.delta}
              </span>
              <span className="text-[10px] sm:text-xs font-sans text-slate-600 dark:text-slate-400 font-bold">{selectedMetric.unit}</span>
            </div>
            <span className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold block truncate">
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
                <linearGradient id={`metricGradient-${selectedMetricKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={selectedMetric.color} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={selectedMetric.color} stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} opacity={0.6} vertical={false} />

              <XAxis
                dataKey="formattedDate"
                stroke={axisLineColor}
                tick={{ fill: axisTickColor, fontSize: 10, fontWeight: 700 }}
                tickLine={false}
                axisLine={{ stroke: axisLineColor, opacity: 0.8 }}
              />

              <YAxis
                domain={yDomain}
                stroke={axisLineColor}
                tick={{ fill: axisTickColor, fontSize: 10, fontWeight: 700 }}
                tickLine={false}
                axisLine={false}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white/95 dark:bg-slate-950/95 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl shadow-xl dark:shadow-2xl backdrop-blur-md space-y-1 z-50">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          <Calendar className="w-3 h-3 text-amber-500 dark:text-[var(--color-primary)]" />
                          <span>{data.fullDate}</span>
                        </div>
                        <div className="text-base font-black font-mono text-slate-900 dark:text-white flex items-center gap-1">
                          <span>{data.value}</span>
                          <span className="text-xs font-bold" style={{ color: selectedMetric.color }}>
                            {selectedMetric.unit}
                          </span>
                        </div>
                        {data.notes && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 italic pt-1 border-t border-slate-100 dark:border-slate-800/80 max-w-xs">
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
                stroke={selectedMetric.color}
                strokeWidth={2.5}
                fill={`url(#metricGradient-${selectedMetricKey})`}
                activeDot={{ r: 5, fill: selectedMetric.color, stroke: '#0f172a', strokeWidth: 2 }}
                dot={{ r: 3.5, fill: '#0f172a', stroke: selectedMetric.color, strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="py-8 sm:py-10 text-center space-y-3 border border-dashed border-slate-300 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950/40 rounded-2xl p-4">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-600 dark:text-[var(--color-primary)] mx-auto shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
              {chartData.length === 1 ? `1 sola rilevazione di ${selectedMetric.label}` : `Nessun dato per ${selectedMetric.label}`}
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
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
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-amber-600 dark:text-[var(--color-primary)] border border-amber-500/40 hover:border-amber-500 font-black text-xs transition-all cursor-pointer shadow-xs active:scale-95"
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
