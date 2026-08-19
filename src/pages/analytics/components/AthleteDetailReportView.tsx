import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  ArrowLeft,
  Calendar,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Dumbbell,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  MessageCircle,
  Zap,
  FileText,
  Clock,
  Compass,
  FilePlus2,
} from 'lucide-react';
import {
  TimeframeOption,
  AthleteReportSummary,
  Athlete,
} from '../../../types';

interface AthleteDetailReportViewProps {
  athleteReport: AthleteReportSummary;
  allAthletes: Athlete[];
  timeframe: TimeframeOption;
  currentRangeLabel: string;
  previousRangeLabel: string;
  onTimeframeChange: (tf: TimeframeOption) => void;
  onSelectAthlete: (athleteId: string) => void;
  onBackToOverview: () => void;
  onNavigateToChat: (athleteId: string) => void;
  onNavigateToWorkouts: (athleteId: string) => void;
  onOpenCopilot: (athleteId: string, athleteName: string, workoutTitle: string) => void;
}

export const AthleteDetailReportView: React.FC<AthleteDetailReportViewProps> = ({
  athleteReport,
  allAthletes,
  timeframe,
  currentRangeLabel,
  previousRangeLabel,
  onTimeframeChange,
  onSelectAthlete,
  onBackToOverview,
  onNavigateToChat,
  onNavigateToWorkouts,
  onOpenCopilot,
}) => {
  const isUnassigned = athleteReport.programStatus === 'unassigned';

  const timeframeButtons: { id: TimeframeOption; label: string; short: string }[] = [
    { id: 'weekly', label: 'Settimanale', short: '7gg' },
    { id: 'monthly', label: 'Mensile', short: '30gg' },
    { id: 'bimonthly', label: 'Bimestrale', short: '2 mesi' },
    { id: 'six_months', label: 'Semestrale', short: '6 mesi' },
    { id: 'yearly', label: 'Annuale', short: '1 anno' },
  ];

  const getTrendBadge = () => {
    if (isUnassigned) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm">
          <FilePlus2 className="w-3.5 h-3.5 text-indigo-400" />
          <span>Programma non assegnato</span>
        </span>
      );
    }
    if (athleteReport.programStatus === 'pending_start') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm">
          <Calendar className="w-3.5 h-3.5 text-sky-400" />
          <span>In attesa di inizio</span>
        </span>
      );
    }

    switch (athleteReport.trend) {
      case 'positive':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-emerald-500/10 shadow-md">
            <TrendingUp className="w-4 h-4" />
            <span>Trend Positivo (+{athleteReport.totalVolumeKg.deltaPercent}%)</span>
          </span>
        );
      case 'negative':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-rose-500/10 shadow-md">
            <TrendingDown className="w-4 h-4" />
            <span>Trend in Calo ({athleteReport.totalVolumeKg.deltaPercent}%)</span>
          </span>
        );
      case 'stable':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-amber-500/10 shadow-md">
            <Minus className="w-4 h-4" />
            <span>Trend Stabile</span>
          </span>
        );
    }
  };

  const getScoreColor = (score: number) => {
    if (isUnassigned) return 'text-slate-400 border-slate-700 bg-slate-900';
    if (score >= 80) return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
    if (score >= 60) return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/40 bg-rose-500/10';
  };

  return (
    <div className="space-y-6">
      {/* ─── 1. TOP BAR: TORNA ALLA PANORAMICA + SELETTORE ATLETA ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-3xl bg-[#0c1018] border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToOverview}
            className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Panoramica Squadra</span>
          </button>
        </div>

        {/* Switcher Veloce Atleta */}
        <div className="flex items-center gap-2.5 self-stretch sm:self-auto">
          <span className="text-xs font-bold text-slate-400 hidden md:inline">Atleta:</span>
          <div className="relative flex-1 sm:flex-initial min-w-[200px] sm:min-w-[240px]">
            <select
              value={athleteReport.athleteId}
              onChange={(e) => onSelectAthlete(e.target.value)}
              aria-label="Seleziona Atleta da Analizzare"
              className="w-full pl-3.5 pr-9 py-2.5 rounded-xl bg-slate-950 border border-slate-700 hover:border-slate-600 text-xs font-black text-white appearance-none cursor-pointer focus:outline-none focus:border-[var(--color-primary)] transition-all shadow-inner"
            >
              {allAthletes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.fullName}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ─── 2. BARRA ORIZZONTE TEMPORALE DEDICATA (SENZA TRONCAMENTI) ─── */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[#0c1018] border border-slate-800 shadow-xl space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[var(--color-primary)]/15 text-[var(--color-primary)] flex items-center justify-center font-bold">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-white uppercase tracking-wider text-[11px]">
              Orizzonte Temporale:
            </span>
          </div>
          <p className="text-slate-400 font-medium text-xs">
            Periodo Corrente: <strong className="text-white">{currentRangeLabel}</strong> vs{' '}
            <span className="text-slate-400">Precedente: {previousRangeLabel}</span>
          </p>
        </div>

        {/* 5 Pulsanti Orizzonte Temporale Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 p-1.5 rounded-2xl bg-slate-950/90 border border-slate-800/90">
          {timeframeButtons.map((btn) => (
            <button
              key={btn.id}
              type="button"
              onClick={() => onTimeframeChange(btn.id)}
              className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 ${
                timeframe === btn.id
                  ? 'bg-[var(--color-primary)] text-slate-950 shadow-lg shadow-amber-500/20 scale-[1.01]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <span>{btn.label}</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                  timeframe === btn.id ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-900 text-slate-400'
                }`}
              >
                {btn.short}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── 2. SINTESI IMMEDIATA: HERO CARD ATLETA + SCORE + SINTESI IA ─── */}
      <div className={`p-6 sm:p-7 rounded-3xl border shadow-2xl space-y-6 relative overflow-hidden ${
        isUnassigned
          ? 'bg-gradient-to-br from-indigo-950/40 via-slate-950 to-slate-950 border-indigo-500/30'
          : 'bg-gradient-to-br from-slate-900/90 via-slate-950 to-slate-950 border-slate-800'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-slate-800/80 pb-5">
          {/* Avatar, Nome e Scheda */}
          <div className="flex items-center gap-4 min-w-0">
            <div className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center font-black text-xl shadow-lg shrink-0 ${
              isUnassigned
                ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                : 'bg-gradient-to-br from-amber-500/20 to-orange-600/10 border-amber-500/40 text-amber-400'
            }`}>
              {athleteReport.athleteName.substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {athleteReport.athleteName}
                </h2>
                {getTrendBadge()}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold flex-wrap">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Dumbbell className="w-3.5 h-3.5 text-amber-400" />
                  {athleteReport.workoutTitle}
                </span>
                {!isUnassigned && (
                  <>
                    <span>•</span>
                    <span>
                      Settimana {athleteReport.currentWeek} di {athleteReport.totalWeeks} ({athleteReport.blockProgressPercent}% Blocco)
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Health & Performance Score Card */}
          <div className="flex items-center gap-4 bg-slate-950/80 p-3.5 px-5 rounded-2xl border border-slate-800 shrink-0 self-start md:self-auto">
            <div className="text-left">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                Punteggio Andamento
              </span>
              <span className="text-xs text-slate-500 font-medium">Performance & Salute</span>
            </div>
            <div className={`text-2xl sm:text-3xl font-black font-mono px-3.5 py-1 rounded-xl border ${getScoreColor(athleteReport.overallScore)}`}>
              {isUnassigned ? (
                <span className="text-slate-400 text-lg">N.D.</span>
              ) : (
                <>
                  {athleteReport.overallScore}<span className="text-xs text-slate-400 font-normal">/100</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Sintesi Narrativa IA dell'Andamento */}
        <div className={`p-4 sm:p-5 rounded-2xl border space-y-2 relative ${
          isUnassigned
            ? 'bg-indigo-500/10 border-indigo-500/25'
            : 'bg-amber-500/10 border-amber-500/25'
        }`}>
          <div className={`flex items-center gap-2 ${isUnassigned ? 'text-indigo-400' : 'text-amber-400'}`}>
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-black uppercase tracking-wider">
              {isUnassigned ? 'Stato Atleta' : `Sintesi IA dell'Andamento (${currentRangeLabel} vs ${previousRangeLabel})`}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
            {athleteReport.aiNarrativeSummary}
          </p>
        </div>

        {/* SE UNASSIGNED: BOX AZIONE IN EVIDENZA */}
        {isUnassigned && (
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="text-sm font-black text-white">Nessun dato di allenamento disponibile</h4>
              <p className="text-xs text-slate-400">
                Assegna una scheda di allenamento dal catalogo o creane una personalizzata per iniziare il monitoraggio.
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => onNavigateToWorkouts(athleteReport.athleteId)}
                className="px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-black text-xs flex items-center gap-2 transition-all shadow-lg hover:shadow-indigo-500/25 cursor-pointer active:scale-95"
              >
                <FilePlus2 className="w-4 h-4" />
                <span>Assegna programma</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateToChat(athleteReport.athleteId)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 transition-all border border-slate-700 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 text-purple-400" />
                <span>Contatta</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── 3. SE NON ASSEGNATO, STOP QUI (EVITA GRAFICI VUOTI O FALSE COMPARAZIONI) ─── */}
      {!isUnassigned && (
        <>
          {/* ─── COMPARAZIONE DATI: 4 METRICHE CHIAVE (PERIODO CORRENTE VS PRECEDENTE) ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* METRICA 1: ADERENZA */}
            <div className="p-5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Aderenza Scheda</span>
                <Activity className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-white font-mono">{athleteReport.attendance.current}%</span>
                <span
                  className={`text-xs font-bold ${
                    athleteReport.attendance.deltaPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {athleteReport.attendance.deltaPercent >= 0 ? '+' : ''}
                  {athleteReport.attendance.deltaPercent}% vs prec.
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-900">
                <span>Sessioni: {athleteReport.completedSessions.current}</span>
                <span className="text-slate-500">Prec: {athleteReport.completedSessions.previous}</span>
              </div>
            </div>

        {/* METRICA 2: FATICA / RPE MEDIO */}
        <div className="p-5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fatica & RPE Medio</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-white font-mono">{athleteReport.avgRpe.current}</span>
            <span
              className={`text-xs font-bold ${
                athleteReport.avgRpe.deltaRaw <= 0 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {athleteReport.avgRpe.deltaRaw > 0 ? `+${athleteReport.avgRpe.deltaRaw}` : athleteReport.avgRpe.deltaRaw} RPE
            </span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-900">
            <span>Dolori: {athleteReport.painReportsCount.current}</span>
            <span className="text-slate-500">Prec: {athleteReport.painReportsCount.previous}</span>
          </div>
        </div>

        {/* METRICA 3: VOLUME TOTALE (TONNELLAGGIO) */}
        <div className="p-5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Volume Totale</span>
            <Dumbbell className="w-4 h-4 text-sky-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-white font-mono">
              {(athleteReport.totalVolumeKg.current / 1000).toFixed(1)}t
            </span>
            <span
              className={`text-xs font-bold ${
                athleteReport.totalVolumeKg.deltaPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {athleteReport.totalVolumeKg.deltaPercent >= 0 ? '+' : ''}
              {athleteReport.totalVolumeKg.deltaPercent}%
            </span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-900">
            <span>{athleteReport.totalVolumeKg.current.toLocaleString('it-IT')} kg</span>
            <span className="text-slate-500">Prec: {athleteReport.totalVolumeKg.previous.toLocaleString('it-IT')} kg</span>
          </div>
        </div>

        {/* METRICA 4: AVANZAMENTO BLOCCO */}
        <div className="p-5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avanzamento Blocco</span>
            <Calendar className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-white font-mono">{athleteReport.blockProgressPercent}%</span>
            <span className="text-xs font-bold text-purple-400">
              Sett. {athleteReport.currentWeek}/{athleteReport.totalWeeks}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden mt-2">
            <div
              className="h-full bg-[var(--color-primary)] transition-all duration-500"
              style={{ width: `${athleteReport.blockProgressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* ─── 4. GRAFICO TEMPORALE (VOLUME & RPE) + DISTRETTI MUSCOLARI ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* GRAFICO TEMPORALE VOLUME & RPE */}
        <div className="lg:col-span-7 p-5 sm:p-6 rounded-3xl bg-slate-950/90 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm sm:text-base font-black text-white">Andamento Volume & RPE</h4>
              <p className="text-xs text-slate-400">Distribuzione temporale delle sedute nel periodo</p>
            </div>
            <span className="text-xs font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2.5 py-1 rounded-lg border border-[var(--color-primary)]/20">
              {timeframe.toUpperCase()}
            </span>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={athleteReport.timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis yAxisId="left" stroke="#eab308" fontSize={11} unit="kg" />
                <YAxis yAxisId="right" orientation="right" domain={[1, 10]} stroke="#38bdf8" fontSize={11} unit=" RPE" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Area yAxisId="left" type="monotone" dataKey="volumeKg" name="Volume (kg)" fill="#eab308" fillOpacity={0.15} stroke="#eab308" strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="avgRpe" name="RPE Medio" stroke="#38bdf8" strokeWidth={2.5} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* DISTRIBUZIONE VOLUME PER DISTRETTO MUSCOLARE */}
        <div className="lg:col-span-5 p-5 sm:p-6 rounded-3xl bg-slate-950/90 border border-slate-800 shadow-xl space-y-4">
          <div>
            <h4 className="text-sm sm:text-base font-black text-white">Volume per Distretto Muscolare</h4>
            <p className="text-xs text-slate-400">Confronto kg sollevati: Corrente vs Precedente</p>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={athleteReport.muscleGroups} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" stroke="#64748b" fontSize={10} unit="kg" />
                <YAxis dataKey="group" type="category" stroke="#cbd5e1" fontSize={10} width={90} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="currentKg" name="Periodo Corrente" fill="#10b981" radius={[0, 4, 4, 0]} />
                <Bar dataKey="previousKg" name="Periodo Prec." fill="#475569" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ─── 5. PERFORMANCE ESERCIZI CHIAVE & TIMELINE EVENTI ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* PERFORMANCE ESERCIZI CHIAVE */}
        <div className="lg:col-span-7 p-5 sm:p-6 rounded-3xl bg-slate-950/90 border border-slate-800 shadow-xl space-y-4">
          <div>
            <h4 className="text-sm sm:text-base font-black text-white">Performance Esercizi Chiave</h4>
            <p className="text-xs text-slate-400">Progressione carichi medi e massimali registrati</p>
          </div>

          {athleteReport.keyExercises.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Nessun log dettagliato di carichi per gli esercizi in questo intervallo.
            </div>
          ) : (
            <div className="space-y-2.5 overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2">
                    <th className="py-2">Esercizio</th>
                    <th className="py-2 text-right">Carico Medio</th>
                    <th className="py-2 text-right">Massimale</th>
                    <th className="py-2 text-right">Variazione</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {athleteReport.keyExercises.map((ex, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/40">
                      <td className="py-2.5 font-bold text-white">{ex.name}</td>
                      <td className="py-2.5 text-right font-mono text-slate-200">
                        {ex.currentAvgKg} kg <span className="text-slate-500 text-[10px]">({ex.previousAvgKg} prec.)</span>
                      </td>
                      <td className="py-2.5 text-right font-mono font-bold text-amber-400">
                        {ex.currentMaxKg} kg
                      </td>
                      <td className="py-2.5 text-right font-bold">
                        <span
                          className={`px-2 py-0.5 rounded-md ${
                            ex.deltaPercent >= 0
                              ? 'text-emerald-400 bg-emerald-500/10'
                              : 'text-rose-400 bg-rose-500/10'
                          }`}
                        >
                          {ex.deltaPercent >= 0 ? `+${ex.deltaPercent}%` : `${ex.deltaPercent}%`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* TIMELINE EVENTI RILEVANTI */}
        <div className="lg:col-span-5 p-5 sm:p-6 rounded-3xl bg-slate-950/90 border border-slate-800 shadow-xl space-y-4">
          <div>
            <h4 className="text-sm sm:text-base font-black text-white">Eventi Rilevanti nel Periodo</h4>
            <p className="text-xs text-slate-400">Interventi Copilot, deload e segnalazioni registrate</p>
          </div>

          {athleteReport.recentEvents.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Nessun evento anomalo o intervento straordinario nel periodo.
            </div>
          ) : (
            <div className="space-y-3">
              {athleteReport.recentEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-3 text-xs"
                >
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                    {ev.type === 'pain' ? <ShieldAlert className="w-4 h-4 text-rose-400" /> : <Sparkles className="w-4 h-4" />}
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h5 className="font-bold text-white truncate">{ev.title}</h5>
                      <span className="text-[10px] text-slate-500 font-mono shrink-0">{ev.dateFormatted}</span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">{ev.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── 6. DIREZIONE CONSIGLIATA ("COME PROSEGUIRE") & AZIONI OPERATIVE RAPIDE ─── */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#0c1018] via-slate-950 to-slate-950 border-2 border-[var(--color-primary)]/40 shadow-2xl space-y-6 relative">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)] shadow-md">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
              Direzione Consigliata • Come Proseguire
            </h3>
            <p className="text-xs text-slate-400">
              Raccomandazione strategica basata sull'analisi comparativa dei dati e della risposta dell'atleta
            </p>
          </div>
        </div>

        {/* 2 Colonne: Cosa Funziona vs Cosa Richiede Attenzione */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* COSA STA FUNZIONANDO */}
          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-2.5">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4" />
              <span>Cosa sta funzionando</span>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-200">
              {athleteReport.whatIsWorking.map((w, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-emerald-400 font-black">•</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* COSA RICHIEDE ATTENZIONE */}
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-2.5">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4" />
              <span>Cosa richiede attenzione</span>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-200">
              {athleteReport.whatNeedsAttention.map((w, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-amber-400 font-black">•</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* BOX STRATEGIA & AZIONI OPERATIVE RAPIDE */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1 min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-primary)] block">
              Azione Raccomandata per il Prossimo Periodo:
            </span>
            <h4 className="text-base sm:text-lg font-black text-white">
              {athleteReport.recommendedActionLabel}
            </h4>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              {athleteReport.recommendedActionDescription}
            </p>
          </div>

          {/* 3 Bottoni Operativi Diretti */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => onNavigateToChat(athleteReport.athleteId)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-md cursor-pointer active:scale-95"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Invia in Chat</span>
            </button>

            <button
              type="button"
              onClick={() =>
                onOpenCopilot(
                  athleteReport.athleteId,
                  athleteReport.athleteName,
                  athleteReport.workoutTitle
                )
              }
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-slate-950 font-black text-xs transition-all shadow-md cursor-pointer active:scale-95"
            >
              <Zap className="w-4 h-4 fill-slate-950" />
              <span>Apri Copilot</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateToWorkouts(athleteReport.athleteId)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition-all cursor-pointer active:scale-95"
            >
              <FileText className="w-4 h-4" />
              <span>Modifica Scheda</span>
            </button>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
};
