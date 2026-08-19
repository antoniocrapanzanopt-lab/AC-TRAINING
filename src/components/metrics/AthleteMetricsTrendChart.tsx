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
  Sparkles
} from 'lucide-react';
import { AthleteMetric } from '../../types/metrics';

interface AthleteMetricsTrendChartProps {
  metrics: AthleteMetric[];
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
  { key: 'body_fat_percentage', label: 'Massa Grassa', unit: '%', icon: '📉', color: '#f59e0b' },
  { key: 'waist_cm', label: 'Girovita', unit: 'cm', icon: '📏', color: '#38bdf8' },
  { key: 'chest_cm', label: 'Torace', unit: 'cm', icon: '📐', color: '#a855f7' },
  { key: 'bicep_right_cm', label: 'Bicipite', unit: 'cm', icon: '💪', color: '#ec4899' },
  { key: 'thigh_right_cm', label: 'Coscia', unit: 'cm', icon: '🦵', color: '#10b981' },
];

export const AthleteMetricsTrendChart: React.FC<AthleteMetricsTrendChartProps> = ({ metrics }) => {
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
    <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 shadow-xl space-y-5">
      
      {/* ─── HEADER & SELETTORE METRICHE A PILLOLA ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-primary)] flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" />
            Trend & Progressione Corporea
          </span>
          <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2 mt-0.5">
            <span>Evoluzione di {selectedMetric.label}</span>
          </h3>
        </div>

        {/* Switch Metriche Orizzontale */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          {METRIC_OPTIONS.map((opt) => {
            const isSelected = opt.key === selectedMetricKey;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setSelectedMetricKey(opt.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 active:scale-95 ${
                  isSelected
                    ? 'bg-[var(--color-primary)] text-slate-950 font-black shadow-md shadow-[var(--color-primary)]/20'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <span>{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── KPI METRICHE IN EVIDENZA ─── */}
      {stats && (
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          {/* Partenza */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-0.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Iniziale
            </span>
            <div className="text-base sm:text-xl font-black font-mono text-slate-300">
              {stats.first} <span className="text-xs font-sans text-slate-500">{selectedMetric.unit}</span>
            </div>
            <span className="text-[9px] text-slate-500 block truncate">
              {chartData[0]?.formattedDate}
            </span>
          </div>

          {/* Attuale */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-0.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Attuale
            </span>
            <div className="text-base sm:text-xl font-black font-mono text-white">
              {stats.current} <span className="text-xs font-sans text-[var(--color-primary)] font-bold">{selectedMetric.unit}</span>
            </div>
            <span className="text-[9px] text-slate-500 block truncate">
              {chartData[chartData.length - 1]?.formattedDate}
            </span>
          </div>

          {/* Variazione Netta (Delta) */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-0.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Variazione
            </span>
            <div className="flex items-center gap-1">
              <span className={`text-base sm:text-xl font-black font-mono flex items-center gap-0.5 ${
                stats.delta < 0
                  ? 'text-sky-400'
                  : stats.delta > 0
                  ? 'text-amber-400'
                  : 'text-slate-400'
              }`}>
                {stats.delta > 0 ? (
                  <TrendingUp className="w-4 h-4 text-amber-400 shrink-0" />
                ) : stats.delta < 0 ? (
                  <TrendingDown className="w-4 h-4 text-sky-400 shrink-0" />
                ) : (
                  <Minus className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                {stats.delta > 0 ? `+${stats.delta}` : stats.delta}
              </span>
              <span className="text-xs font-sans text-slate-500 font-bold">{selectedMetric.unit}</span>
            </div>
            <span className="text-[9px] text-slate-500 block">
              Su {stats.count} check-in
            </span>
          </div>
        </div>
      )}

      {/* ─── GRAFICO RECHARTS AREA SPLINE SATINATA ─── */}
      {chartData.length >= 2 ? (
        <div className="w-full h-64 sm:h-72 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                tickLine={false}
                axisLine={{ stroke: '#334155', opacity: 0.6 }}
              />

              <YAxis
                domain={yDomain}
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
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
                        <div className="text-lg font-black font-mono text-white flex items-center gap-1">
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
                strokeWidth={3}
                fill="url(#metricGradient)"
                activeDot={{ r: 6, fill: 'var(--color-primary)', stroke: '#0f172a', strokeWidth: 3 }}
                dot={{ r: 4, fill: '#0f172a', stroke: 'var(--color-primary)', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="py-10 text-center space-y-2 border border-dashed border-slate-800 rounded-2xl">
          <div className="w-10 h-10 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500 mx-auto">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-300">Dati insufficienti per il grafico</h4>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto mt-0.5">
              Registra almeno 2 check-in con {selectedMetric.label} per visualizzare la curva di progressione e il trend temporale.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
