import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Activity,
  Dumbbell,
  Search,
  ArrowRight,
  Calendar,
  FilePlus2,
  CheckCircle2,
  Clock,
  Layers,
  Brain,
  Info,
  CheckSquare,
  Square,
  ArrowUpRight,
} from 'lucide-react';
import {
  TimeframeOption,
  TeamOverviewReportData,
  AthleteReportSummary,
  DecisionPriorityItem,
} from '../../../types';
import { AthleteAdherenceBadge } from '../../../components/coach/AthleteAdherenceBadge';
import { fetchBatchAthletesAdherence, AdherenceScoreResult } from '../../../services/adherenceService';

interface TeamOverviewReportViewProps {
  reportData: TeamOverviewReportData;
  timeframe: TimeframeOption;
  onTimeframeChange: (tf: TimeframeOption) => void;
  onSelectAthlete: (athleteId: string) => void;
  onAssignProgram?: (athleteId: string) => void;
  onOpenCopilot?: (athleteId: string, customAlert?: any) => void;
  onAssignMultiplePrograms?: (athleteIds: string[]) => void;
}

type FilterTab = 'all' | 'active' | 'penultimate' | 'positive' | 'stable' | 'monitor' | 'unassigned';

export const TeamOverviewReportView: React.FC<TeamOverviewReportViewProps> = ({
  reportData,
  timeframe,
  onTimeframeChange,
  onSelectAthlete,
  onAssignProgram,
  onOpenCopilot,
  onAssignMultiplePrograms,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [selectedUnassignedIds, setSelectedUnassignedIds] = useState<string[]>([]);
  const [adherenceMap, setAdherenceMap] = useState<Record<string, AdherenceScoreResult>>({});

  React.useEffect(() => {
    if (!reportData.athletesReports || reportData.athletesReports.length === 0) return;
    let isMounted = true;

    const ids = reportData.athletesReports.map((a) => a.athleteId).filter(Boolean);
    fetchBatchAthletesAdherence(ids).then((batchMap) => {
      if (isMounted) {
        setAdherenceMap((prev) => ({ ...prev, ...batchMap }));
      }
    });

    return () => { isMounted = false; };
  }, [reportData.athletesReports]);

  const timeframeButtons: { id: TimeframeOption; label: string; short: string }[] = [
    { id: 'weekly', label: 'Settimanale', short: '7gg' },
    { id: 'monthly', label: 'Mensile', short: '30gg' },
    { id: 'bimonthly', label: 'Bimestrale', short: '2 mesi' },
    { id: 'six_months', label: 'Semestrale', short: '6 mesi' },
    { id: 'yearly', label: 'Annuale', short: '1 anno' },
  ];

  // Atleti con programma attivo
  const activeProgramAthletes = useMemo(() => {
    return reportData.athletesReports.filter((a) => a.programStatus !== 'unassigned');
  }, [reportData.athletesReports]);

  // Atleti senza programma (da avviare)
  const unassignedAthletes = useMemo(() => {
    return reportData.athletesReports.filter((a) => a.programStatus === 'unassigned');
  }, [reportData.athletesReports]);

  // Filtro atleti con programma
  const filteredActiveAthletes = useMemo(() => {
    return activeProgramAthletes.filter((ath) => {
      const matchesSearch =
        ath.athleteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ath.workoutTitle.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (activeFilter === 'all' || activeFilter === 'active') return true;
      if (activeFilter === 'penultimate') return ath.isPenultimateWeek;
      if (activeFilter === 'positive') return ath.trend === 'positive';
      if (activeFilter === 'stable') return ath.trend === 'stable';
      if (activeFilter === 'monitor') {
        return ath.painReportsCount.current > 0 || (ath.programStatus === 'active' && (ath.attendance.current < 70 || ath.trend === 'negative'));
      }
      if (activeFilter === 'unassigned') return false;
      return true;
    });
  }, [activeProgramAthletes, searchTerm, activeFilter]);

  // Filtro atleti da avviare
  const filteredUnassignedAthletes = useMemo(() => {
    return unassignedAthletes.filter((ath) => {
      return (
        ath.athleteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ath.athleteEmail || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [unassignedAthletes, searchTerm]);

  // Selezione multipla
  const toggleSelectUnassigned = (id: string) => {
    setSelectedUnassignedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllUnassigned = () => {
    if (selectedUnassignedIds.length === filteredUnassignedAthletes.length) {
      setSelectedUnassignedIds([]);
    } else {
      setSelectedUnassignedIds(filteredUnassignedAthletes.map((a) => a.athleteId));
    }
  };

  const handlePriorityClick = (prio: DecisionPriorityItem) => {
    if (prio.targetAction === 'assign' && onAssignProgram) {
      onAssignProgram(prio.athleteId);
    } else if (onOpenCopilot) {
      let category = 'progression';
      if (prio.type === 'pain') category = 'pain';
      else if (prio.type === 'penultimate_week') category = 'penultimate_week';
      else if (prio.type === 'inactivity') category = 'inactivity';
      else if (prio.type === 'plateau') category = 'stagnation';

      const athReport = reportData.athletesReports.find((a) => a.athleteId === prio.athleteId);
      const exName = athReport?.painDetailsSummary || prio.title.replace(/^Fastidio su\s*/i, '');

      onOpenCopilot(prio.athleteId, {
        athleteId: prio.athleteId,
        athleteName: prio.athleteName,
        category,
        summary: prio.title,
        rationale: prio.rationale,
        exerciseName: exName,
        noteText: prio.rationale,
        severity: prio.urgency === 'high' ? 'high' : 'medium',
      });
    } else {
      onSelectAthlete(prio.athleteId);
    }
  };

  const getTrendBadge = (ath: AthleteReportSummary) => {
    if (ath.programStatus === 'pending_start' || ath.completedSessions.current === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-sky-500/15 text-sky-300 border border-sky-500/30">
          <Clock className="w-3 h-3 text-sky-400" />
          <span>In Attesa</span>
        </span>
      );
    }
    if (ath.isPenultimateWeek) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-300 border border-amber-500/30">
          <Clock className="w-3 h-3 text-amber-400" />
          <span>Penultima Settimana</span>
        </span>
      );
    }
    if (ath.programStatus === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-500/15 text-purple-300 border border-purple-500/30">
          <CheckCircle2 className="w-3 h-3 text-purple-400" />
          <span>Blocco terminato</span>
        </span>
      );
    }
    switch (ath.trend) {
      case 'positive':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <TrendingUp className="w-3 h-3" />
            <span>In Crescita</span>
          </span>
        );
      case 'negative':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <TrendingDown className="w-3 h-3" />
            <span>Da Monitorare</span>
          </span>
        );
      case 'stable':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-800 text-slate-300 border border-slate-700">
            <Minus className="w-3 h-3 text-slate-400" />
            <span>Stabile</span>
          </span>
        );
    }
  };


  return (
    <div className="space-y-6">
      {/* ─── 1. HEADER SELETTORE ORIZZONTI TEMPORALI & CONFRONTO DATE ─── */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-950/90 border border-slate-800/90 shadow-2xl flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)] shadow-md shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Periodo di Valutazione</div>
            <div className="text-sm sm:text-base font-black text-white flex items-center gap-2">
              <span>{reportData.currentRangeLabel}</span>
              <span className="text-xs font-normal text-slate-400">vs {reportData.previousRangeLabel}</span>
            </div>
          </div>
        </div>

        {/* 5 Bottoni Orizzonti Temporali */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-slate-900/90 border border-slate-800">
          {timeframeButtons.map((btn) => (
            <button
              key={btn.id}
              type="button"
              onClick={() => onTimeframeChange(btn.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                timeframe === btn.id
                  ? 'bg-[var(--color-primary)] text-slate-950 font-black shadow-md shadow-[var(--color-primary)]/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>{btn.label}</span>
              <span
                className={`text-[9px] font-mono px-1 py-0.2 rounded ${
                  timeframe === btn.id ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-slate-950/60 text-slate-500'
                }`}
              >
                {btn.short}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── 2. PRIORITÀ DI OGGI (MAX 3 AZIONI IMMEDIATE) ─── */}
      <div className="p-5 rounded-3xl bg-slate-950/90 border border-slate-800/90 shadow-2xl space-y-3 relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Brain className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                Priorità di Oggi • Decisioni Rapide
              </h3>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
            {reportData.todayPriorities.length} in evidenza
          </span>
        </div>

        {reportData.todayPriorities.length === 0 ? (
          <div className="py-6 px-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 text-center flex flex-col items-center justify-center space-y-1">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 mb-1" />
            <p className="text-xs font-bold text-slate-200">Tutti i programmi procedono regolarmente!</p>
            <p className="text-[11px] text-slate-400">Nessun dolore, stallo critico o blocco in scadenza da gestire oggi. ✨</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {reportData.todayPriorities.map((prio) => {
              const isHigh = prio.urgency === 'high';
              const isPenultimate = prio.type === 'penultimate_week';

              return (
                <div
                  key={prio.id}
                  className={`p-3.5 rounded-2xl border flex flex-col justify-between transition-all group ${
                    isHigh
                      ? 'bg-rose-950/20 border-rose-500/30 hover:border-rose-500/60'
                      : isPenultimate
                      ? 'bg-amber-950/20 border-amber-500/30 hover:border-amber-500/60'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-md border ${
                          isHigh
                            ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                            : isPenultimate
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                        }`}
                      >
                        {isHigh ? 'Urgente' : isPenultimate ? 'Penultima Settimana' : 'Da Avviare'}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 truncate max-w-[120px]">
                        {prio.athleteName}
                      </span>
                    </div>

                    <h4 className="text-xs font-black text-white leading-snug line-clamp-1 group-hover:text-[var(--color-primary)] transition-colors">
                      {prio.title}
                    </h4>

                    <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                      {prio.rationale}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-800/60 mt-3 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">Azione consigliata</span>
                    <button
                      type="button"
                      onClick={() => handlePriorityClick(prio)}
                      className={`text-xs font-black px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                        isHigh
                          ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white'
                          : isPenultimate
                          ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-slate-950'
                          : 'bg-[var(--color-primary)] text-slate-950 hover:bg-[var(--color-primary-hover)]'
                      }`}
                    >
                      <span>{prio.ctaLabel}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── 3. KPI GLOBALI DI PERFORMANCE (SOLO ATLETI CON PROGRAMMA) ─── */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Aderenza Squadra */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Aderenza Media</span>
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black text-white">
                {reportData.avgTeamAttendance.current}%
              </span>
              <span
                className={`text-[10px] font-bold font-mono ${
                  reportData.avgTeamAttendance.deltaRaw >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {reportData.avgTeamAttendance.deltaRaw >= 0 ? '+' : ''}
                {reportData.avgTeamAttendance.deltaRaw}%
              </span>
            </div>
          </div>

          {/* Tonnellaggio Totale */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Volume Totale</span>
              <Dumbbell className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black text-white">
                {Math.round(reportData.totalTeamVolumeKg.current / 1000)}k <span className="text-xs text-slate-400 font-normal">kg</span>
              </span>
              <span
                className={`text-[10px] font-bold font-mono ${
                  reportData.totalTeamVolumeKg.deltaPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {reportData.totalTeamVolumeKg.deltaPercent >= 0 ? '+' : ''}
                {reportData.totalTeamVolumeKg.deltaPercent}%
              </span>
            </div>
          </div>

          {/* Atleti con Programma vs Da Avviare */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Stato Atleti</span>
              <Users className="w-4 h-4 text-sky-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black text-white">
                {reportData.eligibleAthletesCount}
              </span>
              <span className="text-xs text-slate-400">
                attivi • <strong className="text-amber-400">{reportData.unassignedAthletesCount}</strong> da avviare
              </span>
            </div>
          </div>

          {/* In Penultima Settimana / Allarmi */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Penultima Settimana</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black text-amber-300">
                {reportData.penultimateWeekAthletesCount}
              </span>
              <span className="text-xs text-slate-400">
                atleti vicini a fine blocco
              </span>
            </div>
          </div>
        </div>

        {/* Banner informativo isolamento atleti senza piano */}
        <div className="px-3 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800/60 flex items-center gap-2 text-[11px] text-slate-400">
          <Info className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span>I KPI di performance e tonnellaggio includono esclusivamente gli atleti con un programma attivo ({reportData.eligibleAthletesCount} su {reportData.totalAthletesCount}).</span>
        </div>
      </div>

      {/* ─── 4. FILTRI E BARRA DI RICERCA ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2">
        {/* Filtri a Pillola */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-slate-950 border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-[var(--color-primary)] text-slate-950 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Tutti ({reportData.totalAthletesCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'active'
                ? 'bg-[var(--color-primary)] text-slate-950 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Attivi ({reportData.eligibleAthletesCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('penultimate')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              activeFilter === 'penultimate'
                ? 'bg-amber-400 text-slate-950 font-black'
                : 'text-amber-400 hover:text-amber-300'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>Penultima Sett. ({reportData.penultimateWeekAthletesCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('positive')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'positive'
                ? 'bg-emerald-500 text-white font-black'
                : 'text-slate-400 hover:text-emerald-400'
            }`}
          >
            In Crescita ({reportData.positiveAthletesCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('monitor')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'monitor'
                ? 'bg-rose-500 text-white font-black'
                : 'text-slate-400 hover:text-rose-400'
            }`}
          >
            Da Monitorare ({reportData.activeAlertsCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('unassigned')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'unassigned'
                ? 'bg-indigo-500 text-white font-black'
                : 'text-slate-400 hover:text-indigo-400'
            }`}
          >
            Da Avviare ({reportData.unassignedAthletesCount})
          </button>
        </div>

        {/* Barra di ricerca */}
        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cerca atleta o scheda..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[var(--color-primary)] transition-colors"
          />
        </div>
      </div>

      {/* ─── 5. SEZIONE: ATLETI CON PROGRAMMA ATTIVO ─── */}
      {activeFilter !== 'unassigned' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
              {activeFilter === 'monitor'
                ? `Atleti da Monitorare (${filteredActiveAthletes.length})`
                : activeFilter === 'penultimate'
                ? `Atleti a Penultima Settimana (${filteredActiveAthletes.length})`
                : activeFilter === 'positive'
                ? `Atleti in Crescita (${filteredActiveAthletes.length})`
                : `Atleti con Programma (${filteredActiveAthletes.length})`}
            </h3>
          </div>

          {filteredActiveAthletes.length === 0 ? (
            <div className="p-8 text-center bg-slate-950/60 border border-slate-800/80 rounded-2xl text-slate-500 text-xs">
              Nessun atleta corrisponde ai filtri selezionati.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredActiveAthletes.map((ath) => {
                return (
                  <div
                    key={ath.athleteId}
                    onClick={() => onSelectAthlete(ath.athleteId)}
                    className="p-4 rounded-3xl bg-slate-950/90 border border-slate-800/90 hover:border-[var(--color-primary)]/50 transition-all cursor-pointer shadow-xl flex flex-col justify-between space-y-3 group"
                  >
                    {/* Header Card Atleta */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-sm font-black text-[var(--color-primary)] shrink-0">
                          {ath.athleteName.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-black text-white truncate group-hover:text-[var(--color-primary)] transition-colors">
                            {ath.athleteName}
                          </h4>
                          <p className="text-[11px] text-slate-400 truncate">
                            {ath.workoutTitle}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {getTrendBadge(ath)}
                        <AthleteAdherenceBadge adherence={adherenceMap[ath.athleteId]} size="sm" />
                      </div>
                    </div>

                    {/* Barra di avanzamento mesociclo */}
                    <div className="space-y-1 bg-slate-900/60 p-2 rounded-xl border border-slate-800/80">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>Avanzamento Mesociclo</span>
                        <strong className="text-white">
                          {ath.blockProgressPercent === 0
                            ? `Settimana 1 di ${ath.totalWeeks} (0%)`
                            : `Settimana ${ath.currentWeek} di ${ath.totalWeeks} (${ath.blockProgressPercent}%)`}
                        </strong>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-950 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            ath.isPenultimateWeek
                              ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                              : 'bg-[var(--color-primary)]'
                          }`}
                          style={{ width: `${Math.min(100, ath.blockProgressPercent)}%` }}
                        />
                      </div>
                    </div>

                    {/* Metriche Chiave a 3 Box */}
                    <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono bg-slate-900/40 p-2 rounded-xl border border-slate-800/50">
                      <div>
                        <div className="text-[9px] uppercase font-bold text-slate-500">Aderenza</div>
                        <div className="font-bold text-white mt-0.5">{ath.attendance.current}%</div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase font-bold text-slate-500">Volume kg</div>
                        <div className="font-bold text-white mt-0.5">
                          {Math.round(ath.totalVolumeKg.current).toLocaleString('it-IT')}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase font-bold text-slate-500">RPE Medio</div>
                        <div className="font-bold text-white mt-0.5">{ath.avgRpe.current}</div>
                      </div>
                    </div>

                    {/* Box Decisione Consigliata (Singola) */}
                    <div className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[9px] font-bold text-slate-500 uppercase">Decisione Consigliata</div>
                        <div className="text-xs font-black text-amber-300 truncate">
                          {ath.singleDecisionTitle}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          {ath.singleDecisionRationale}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenCopilot) {
                            let category = 'progression';
                            if (ath.singleDecisionType === 'pain') category = 'pain';
                            else if (ath.singleDecisionType === 'penultimate_week') category = 'penultimate_week';
                            else if (ath.singleDecisionType === 'missing_weights') category = 'missing_weights';
                            else if (ath.singleDecisionType === 'inactivity' || ath.programStatus === 'pending_start' || ath.programStatus === 'inactive' || ath.completedSessions.current === 0) category = 'inactivity';
                            else if (ath.singleDecisionType === 'plateau') category = 'stagnation';

                            onOpenCopilot(ath.athleteId, {
                              athleteId: ath.athleteId,
                              athleteName: ath.athleteName,
                              category,
                              summary: ath.singleDecisionTitle,
                              rationale: ath.singleDecisionRationale,
                              exerciseName: ath.painDetailsSummary,
                              noteText: ath.painDetailsSummary ? `Fastidio su ${ath.painDetailsSummary}: ${ath.singleDecisionRationale}` : ath.singleDecisionRationale,
                              severity: ath.singleDecisionType === 'pain' ? 'high' : 'medium',
                            });
                          } else {
                            onSelectAthlete(ath.athleteId);
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[var(--color-primary)] text-slate-950 text-xs font-black hover:bg-[var(--color-primary-hover)] transition-all shrink-0 flex items-center gap-1 cursor-pointer shadow-sm shadow-amber-500/20"
                      >
                        <span>{ath.singleDecisionCtaLabel}</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── 6. SEZIONE: ATLETI DA AVVIARE (TABELLA COMPATTA & MASSIVA) ─── */}
      {(activeFilter === 'all' || activeFilter === 'unassigned') && unassignedAthletes.length > 0 && (
        <div className="p-5 rounded-3xl bg-slate-950/90 border border-slate-800/90 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <FilePlus2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  Atleti da Avviare • Nessun Programma Assegnato
                  <span className="px-2 py-0.2 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {unassignedAthletes.length} totali
                  </span>
                </h3>
              </div>
            </div>

            {/* Azione Massiva Assegna Schede */}
            {selectedUnassignedIds.length > 0 && onAssignMultiplePrograms && (
              <button
                type="button"
                onClick={() => onAssignMultiplePrograms(selectedUnassignedIds)}
                className="px-3.5 py-1.5 rounded-xl bg-[var(--color-primary)] text-slate-950 text-xs font-black hover:bg-[var(--color-primary-hover)] transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Assegna Scheda a {selectedUnassignedIds.length} Atleti Selezionati</span>
              </button>
            )}
          </div>

          {/* Tabella Compatta */}
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-3 w-10">
                    <button
                      type="button"
                      onClick={toggleSelectAllUnassigned}
                      className="p-1 text-slate-400 hover:text-white cursor-pointer"
                      title="Seleziona tutti"
                    >
                      {selectedUnassignedIds.length === filteredUnassignedAthletes.length && filteredUnassignedAthletes.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-[var(--color-primary)]" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-500" />
                      )}
                    </button>
                  </th>
                  <th className="py-2.5 px-3">Atleta</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Stato</th>
                  <th className="py-2.5 px-3 text-right">Azione Immediata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredUnassignedAthletes.map((ath) => {
                  const isSelected = selectedUnassignedIds.includes(ath.athleteId);

                  return (
                    <tr
                      key={ath.athleteId}
                      className={`hover:bg-slate-900/60 transition-colors ${
                        isSelected ? 'bg-indigo-950/20' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <button
                          type="button"
                          onClick={() => toggleSelectUnassigned(ath.athleteId)}
                          className="p-1 text-slate-400 hover:text-white cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[var(--color-primary)]" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600" />
                          )}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-white">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-[10px] text-slate-300 font-bold">
                            {ath.athleteName.substring(0, 2).toUpperCase()}
                          </div>
                          <span>{ath.athleteName}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                        {ath.athleteEmail || 'Nessuna email'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-900 text-slate-400 border border-slate-800">
                          Programma non assegnato
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => onAssignProgram && onAssignProgram(ath.athleteId)}
                          className="px-3 py-1 rounded-lg bg-[var(--color-primary)] text-slate-950 text-xs font-black hover:bg-[var(--color-primary-hover)] transition-all inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>Assegna programma</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
