import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
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
  AlertTriangle,
  SlidersHorizontal,
  ChevronDown,
  RotateCcw,
  X,
  Table,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import {
  TimeframeOption,
  TeamOverviewReportData,
  AthleteReportSummary,
  DecisionPriorityItem,
  Athlete,
} from '../../../types';
import { AthleteAdherenceBadge } from '../../../components/coach/AthleteAdherenceBadge';
import { fetchBatchAthletesAdherence, AdherenceScoreResult } from '../../../services/adherenceService';
import { AthleteTableView } from './AthleteTableView';
import {
  buildAthleteTimelineItems,
  calculateTimelineCounters,
  TimelineWorkoutAssignment,
  TimelineWorkoutSession,
} from '../utils/timelineCalculator';

export type TeamViewMode = 'priority' | 'table';

interface TeamOverviewReportViewProps {
  reportData: TeamOverviewReportData;
  timeframe: TimeframeOption;
  athletes?: Athlete[];
  sessions?: TimelineWorkoutSession[];
  assignments?: TimelineWorkoutAssignment[];
  workoutDaysMap?: Record<string, string[]>;
  isLoading?: boolean;
  onTimeframeChange: (tf: TimeframeOption) => void;
  onSelectAthlete: (athleteId: string) => void;
  onAssignProgram?: (athleteId: string) => void;
  onOpenCopilot?: (athleteId: string, customAlert?: unknown) => void;
  onResolvePriority?: (prio: DecisionPriorityItem) => Promise<void>;
  onAssignMultiplePrograms?: (athleteIds: string[]) => void;
  activeViewMode?: TeamViewMode;
  onViewModeChange?: (mode: TeamViewMode) => void;
}

export type MainFilter = 'attention' | 'end_of_block' | 'unassigned' | 'all';
export type SortByOption = 'priority' | 'attendance_asc' | 'end_block_first' | 'name_asc';
export type ProgramStatusFilter = 'all' | 'active' | 'unassigned' | 'completed' | 'paused';
export type PerformanceFilter = 'all' | 'attention' | 'stable' | 'positive';
export type ProgressFilter = 'all' | 'start' | 'mid' | 'end';
export type AdherenceFilter = 'all' | '<50' | '50-75' | '>75';
export type PainFilter = 'all' | 'yes' | 'no';

export interface SecondaryFilters {
  programStatus: ProgramStatusFilter;
  performance: PerformanceFilter;
  progress: ProgressFilter;
  adherence: AdherenceFilter;
  pain: PainFilter;
  sortBy: SortByOption;
}

const defaultSecondaryFilters: SecondaryFilters = {
  programStatus: 'all',
  performance: 'all',
  progress: 'all',
  adherence: 'all',
  pain: 'all',
  sortBy: 'priority',
};

export const TeamOverviewReportView: React.FC<TeamOverviewReportViewProps> = ({
  reportData,
  timeframe,
  athletes = [],
  sessions = [],
  assignments = [],
  workoutDaysMap = {},
  isLoading = false,
  onTimeframeChange,
  onSelectAthlete,
  onAssignProgram,
  onOpenCopilot,
  onResolvePriority,
  onAssignMultiplePrograms,
  activeViewMode,
  onViewModeChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [resolvingPrioId, setResolvingPrioId] = useState<string | null>(null);
  const [priorityCategoryFilter, setPriorityCategoryFilter] = useState<'all' | 'pain' | 'penultimate_week' | 'unassigned'>('all');
  // Default: 'attention' (Richiedono attenzione prioritari)
  const [mainFilter, setMainFilter] = useState<MainFilter>('attention');
  const [secondaryFilters, setSecondaryFilters] = useState<SecondaryFilters>(defaultSecondaryFilters);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);

  // Modalità di visualizzazione: [Priorità] | [Tabella]
  const [viewMode, setViewMode] = useState<TeamViewMode>(() => {
    if (activeViewMode && (activeViewMode === 'priority' || activeViewMode === 'table')) return activeViewMode;
    try {
      const saved = localStorage.getItem('ac_performance_view_mode');
      if (saved === 'priority' || saved === 'table') return saved;
    } catch (_) {}
    return 'priority';
  });

  useEffect(() => {
    if (activeViewMode && (activeViewMode === 'priority' || activeViewMode === 'table')) {
      setViewMode(activeViewMode);
    }
  }, [activeViewMode]);

  const handleViewModeChange = (mode: TeamViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('ac_performance_view_mode', mode);
    } catch (_) {}
    onViewModeChange?.(mode);
  };

  // Calcolo dati cronologici e contatori
  const timelineItems = useMemo(() => {
    if (!athletes || athletes.length === 0) return [];
    return buildAthleteTimelineItems(
      athletes,
      assignments,
      sessions,
      workoutDaysMap
    );
  }, [athletes, assignments, sessions, workoutDaysMap]);

  const timelineCounters = useMemo(() => {
    return calculateTimelineCounters(timelineItems);
  }, [timelineItems]);

  const [selectedUnassignedIds, setSelectedUnassignedIds] = useState<string[]>([]);
  const [adherenceMap, setAdherenceMap] = useState<Record<string, AdherenceScoreResult>>({});

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target as Node)) {
        setIsFilterMenuOpen(false);
      }
    };
    if (isFilterMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFilterMenuOpen]);

  useEffect(() => {
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

  // Criterio per atleti che richiedono attenzione (unifica Da Monitorare, Penultima Sett. e alert pendenti)
  const isAthleteNeedingAttention = useCallback((ath: AthleteReportSummary): boolean => {
    if (ath.programStatus === 'unassigned') return false;
    const isPainActive = ath.painReportsCount.current > 0 && ath.singleDecisionCtaLabel !== 'Gestito';
    const isLowAttendance = ath.attendance.current < 70 && ath.completedSessions.current > 0;
    const isNegativeTrend = ath.trend === 'negative';
    const isEndOfBlock = ath.isPenultimateWeek || ath.currentWeek >= ath.totalWeeks;
    const hasPendingDecision = Boolean(
      ath.singleDecisionCtaLabel &&
      ath.singleDecisionCtaLabel !== 'Gestito' &&
      ath.singleDecisionType !== 'maintain'
    );
    return isPainActive || isLowAttendance || isNegativeTrend || isEndOfBlock || hasPendingDecision;
  }, []);

  // Criterio a fine blocco
  const isAthleteEndOfBlock = useCallback((ath: AthleteReportSummary): boolean => {
    return (
      ath.isPenultimateWeek ||
      ath.currentWeek >= ath.totalWeeks ||
      ath.programStatus === 'penultimate_week' ||
      ath.programStatus === 'completed'
    );
  }, []);

  // Conteggi sintetici
  const attentionCount = useMemo(() => {
    return activeProgramAthletes.filter(isAthleteNeedingAttention).length;
  }, [activeProgramAthletes, isAthleteNeedingAttention]);

  const endOfBlockCount = useMemo(() => {
    return activeProgramAthletes.filter(isAthleteEndOfBlock).length;
  }, [activeProgramAthletes, isAthleteEndOfBlock]);

  const pendingStartAthletes = useMemo(() => {
    return activeProgramAthletes.filter(
      (a) => a.programStatus === 'pending_start' || (a.completedSessions.current === 0 && a.programStatus !== 'active')
    );
  }, [activeProgramAthletes]);

  const unassignedCount = useMemo(() => {
    return unassignedAthletes.length + pendingStartAthletes.length;
  }, [unassignedAthletes.length, pendingStartAthletes.length]);

  const totalCount = reportData.totalAthletesCount;

  // Calcolo Priorità Deterministico: badge rossi e gialli in cima, stabili in fondo
  const getAthletePriorityScore = useCallback((ath: AthleteReportSummary): number => {
    let score = 0;

    // 1. Fastidio/dolore attivo non gestito (Badge rosso / Massima urgenza)
    if (ath.painReportsCount.current > 0 && ath.singleDecisionCtaLabel !== 'Gestito') {
      score += 1000;
    }

    // 2. Aderenza critica < 50%
    if (ath.attendance.current < 50 && ath.completedSessions.current > 0) {
      score += 600;
    }

    // 3. Fine blocco imminente (Penultima o ultima settimana: Badge giallo)
    if (ath.isPenultimateWeek || ath.currentWeek >= ath.totalWeeks) {
      score += 400;
    }

    // 4. Aderenza medio-bassa (50-70%) o trend negativo
    if (ath.attendance.current >= 50 && ath.attendance.current < 70) {
      score += 250;
    }
    if (ath.trend === 'negative') {
      score += 200;
    }

    // 5. Decisione attiva non ancora gestita
    if (ath.singleDecisionCtaLabel && ath.singleDecisionCtaLabel !== 'Gestito' && ath.singleDecisionType !== 'maintain') {
      score += 150;
    }

    // 6. Da avviare / in attesa di inizio (Badge blu/indigo)
    if (ath.programStatus === 'unassigned' || ath.programStatus === 'pending_start' || ath.completedSessions.current === 0) {
      score += 100;
    }

    // 7. Stabili o positivi senza problemi
    if (ath.trend === 'positive') {
      score += 10;
    } else if (ath.trend === 'stable') {
      score += 20;
    }

    return score;
  }, []);

  const hasActiveSecondaryFilters = useMemo(() => {
    return (
      secondaryFilters.programStatus !== 'all' ||
      secondaryFilters.performance !== 'all' ||
      secondaryFilters.progress !== 'all' ||
      secondaryFilters.adherence !== 'all' ||
      secondaryFilters.pain !== 'all' ||
      secondaryFilters.sortBy !== 'priority'
    );
  }, [secondaryFilters]);

  const activeSecondaryFiltersCount = useMemo(() => {
    let count = 0;
    if (secondaryFilters.programStatus !== 'all') count++;
    if (secondaryFilters.performance !== 'all') count++;
    if (secondaryFilters.progress !== 'all') count++;
    if (secondaryFilters.adherence !== 'all') count++;
    if (secondaryFilters.pain !== 'all') count++;
    if (secondaryFilters.sortBy !== 'priority') count++;
    return count;
  }, [secondaryFilters]);

  const handleResetSecondaryFilters = () => {
    setSecondaryFilters(defaultSecondaryFilters);
  };

  // Filtro e ordinamento combinato atleti con programma
  const filteredActiveAthletes = useMemo(() => {
    const result = activeProgramAthletes.filter((ath) => {
      // 1. Ricerca testuale
      const matchesSearch =
        ath.athleteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ath.workoutTitle.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // 2. Filtro Principale
      if (mainFilter === 'attention') {
        if (!isAthleteNeedingAttention(ath)) return false;
      } else if (mainFilter === 'end_of_block') {
        if (!isAthleteEndOfBlock(ath)) return false;
      } else if (mainFilter === 'unassigned') {
        const isPending = ath.programStatus === 'pending_start' || (ath.completedSessions.current === 0 && ath.programStatus !== 'active');
        if (!isPending) return false;
      }
      // 'all' passa tutti

      // 3. Filtri Secondari
      if (secondaryFilters.programStatus !== 'all') {
        if (secondaryFilters.programStatus === 'active' && ath.programStatus !== 'active' && ath.programStatus !== 'penultimate_week') return false;
        if (secondaryFilters.programStatus === 'unassigned' && ath.programStatus !== 'unassigned' && ath.programStatus !== 'pending_start') return false;
        if (secondaryFilters.programStatus === 'completed' && ath.programStatus !== 'completed') return false;
        if (secondaryFilters.programStatus === 'paused' && ath.programStatus !== 'inactive' && ath.programStatus !== 'overdue') return false;
      }

      if (secondaryFilters.performance !== 'all') {
        if (secondaryFilters.performance === 'attention' && !isAthleteNeedingAttention(ath)) return false;
        if (secondaryFilters.performance === 'stable' && ath.trend !== 'stable') return false;
        if (secondaryFilters.performance === 'positive' && ath.trend !== 'positive') return false;
      }

      if (secondaryFilters.progress !== 'all') {
        const ratio = ath.totalWeeks > 0 ? ath.currentWeek / ath.totalWeeks : 0;
        if (secondaryFilters.progress === 'start' && ratio >= 0.34) return false;
        if (secondaryFilters.progress === 'mid' && (ratio < 0.34 || ratio >= 0.67)) return false;
        if (secondaryFilters.progress === 'end' && ratio < 0.67 && !ath.isPenultimateWeek) return false;
      }

      if (secondaryFilters.adherence !== 'all') {
        if (secondaryFilters.adherence === '<50' && ath.attendance.current >= 50) return false;
        if (secondaryFilters.adherence === '50-75' && (ath.attendance.current < 50 || ath.attendance.current > 75)) return false;
        if (secondaryFilters.adherence === '>75' && ath.attendance.current <= 75) return false;
      }

      if (secondaryFilters.pain !== 'all') {
        const hasPain = ath.painReportsCount.current > 0;
        if (secondaryFilters.pain === 'yes' && !hasPain) return false;
        if (secondaryFilters.pain === 'no' && hasPain) return false;
      }

      return true;
    });

    // 4. Ordinamento
    result.sort((a, b) => {
      if (secondaryFilters.sortBy === 'attendance_asc') {
        return a.attendance.current - b.attendance.current;
      }
      if (secondaryFilters.sortBy === 'end_block_first') {
        const ratioA = a.totalWeeks > 0 ? a.currentWeek / a.totalWeeks : 0;
        const ratioB = b.totalWeeks > 0 ? b.currentWeek / b.totalWeeks : 0;
        return ratioB - ratioA;
      }
      if (secondaryFilters.sortBy === 'name_asc') {
        return a.athleteName.localeCompare(b.athleteName);
      }
      // Default: Priorità decrescente (Badge rossi > gialli > blu > verdi)
      const priorityDiff = getAthletePriorityScore(b) - getAthletePriorityScore(a);
      if (priorityDiff !== 0) return priorityDiff;
      return a.athleteName.localeCompare(b.athleteName);
    });

    return result;
  }, [
    activeProgramAthletes,
    searchTerm,
    mainFilter,
    secondaryFilters,
    isAthleteNeedingAttention,
    isAthleteEndOfBlock,
    getAthletePriorityScore,
  ]);

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

      {/* ─── 2. SEGNALAZIONI ATLETI & CENTRO DECISIONALE (TUTTE LE SEGNALAZIONI) ─── */}
      <div id="performance-copilot-priorities" className="p-5 rounded-3xl bg-slate-950/90 border border-slate-800/90 shadow-2xl space-y-4 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                Segnalazioni Atleti & Decisioni Rapide
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Tutti i feedback, fastidi articolari e avvisi rilevati sulle schede attive
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20">
              {reportData.todayPriorities.length} {reportData.todayPriorities.length === 1 ? 'segnalazione attiva' : 'segnalazioni attive'}
            </span>
          </div>
        </div>

        {/* Filtri rapidi per categoria di segnalazione */}
        {reportData.todayPriorities.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pb-1">
            <button
              type="button"
              onClick={() => setPriorityCategoryFilter('all')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                priorityCategoryFilter === 'all'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Tutte ({reportData.todayPriorities.length})
            </button>
            {reportData.todayPriorities.filter((p) => p.type === 'pain').length > 0 && (
              <button
                type="button"
                onClick={() => setPriorityCategoryFilter('pain')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  priorityCategoryFilter === 'pain'
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-rose-400 border border-slate-800'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Fastidi Articolari ({reportData.todayPriorities.filter((p) => p.type === 'pain').length})</span>
              </button>
            )}
            {reportData.todayPriorities.filter((p) => p.type === 'penultimate_week').length > 0 && (
              <button
                type="button"
                onClick={() => setPriorityCategoryFilter('penultimate_week')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  priorityCategoryFilter === 'penultimate_week'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-900 text-slate-400 hover:text-amber-400 border border-slate-800'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Penultima Settimana ({reportData.todayPriorities.filter((p) => p.type === 'penultimate_week').length})</span>
              </button>
            )}
            {reportData.todayPriorities.filter((p) => p.type === 'unassigned').length > 0 && (
              <button
                type="button"
                onClick={() => setPriorityCategoryFilter('unassigned')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  priorityCategoryFilter === 'unassigned'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                    : 'bg-slate-900 text-slate-400 hover:text-indigo-400 border border-slate-800'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Da Avviare ({reportData.todayPriorities.filter((p) => p.type === 'unassigned').length})</span>
              </button>
            )}
          </div>
        )}

        {reportData.todayPriorities.length === 0 ? (
          <div className="py-6 px-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 text-center flex flex-col items-center justify-center space-y-1">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 mb-1" />
            <p className="text-xs font-bold text-slate-200">Tutti i programmi procedono regolarmente!</p>
            <p className="text-[11px] text-slate-400">Nessun dolore, stallo critico o blocco in scadenza da gestire. ✨</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {reportData.todayPriorities
              .filter((p) => priorityCategoryFilter === 'all' || p.type === priorityCategoryFilter)
              .map((prio) => {
                const isHigh = prio.urgency === 'high';
                const isPenultimate = prio.type === 'penultimate_week';
                const isResolving = resolvingPrioId === prio.id;

                return (
                  <div
                    key={prio.id}
                    className={`p-4 rounded-2xl border flex flex-col justify-between transition-all group ${
                      isHigh
                        ? 'bg-rose-950/20 border-rose-500/30 hover:border-rose-500/60 shadow-lg shadow-rose-950/20'
                        : isPenultimate
                        ? 'bg-amber-950/20 border-amber-500/30 hover:border-amber-500/60 shadow-lg shadow-amber-950/20'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-2">
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
                          {isHigh ? 'Urgente • Fastidio' : isPenultimate ? 'Penultima Settimana' : 'Da Avviare'}
                        </span>
                        <span className="text-[11px] font-black text-slate-300 truncate max-w-[130px]">
                          {prio.athleteName}
                        </span>
                      </div>

                      <h4 className="text-xs sm:text-sm font-black text-white leading-snug group-hover:text-[var(--color-primary)] transition-colors">
                        {prio.title}
                      </h4>

                      <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-3">
                        {prio.rationale}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-800/60 mt-3 flex items-center justify-between gap-2">
                      {prio.type === 'pain' && onResolvePriority && (
                        <button
                          type="button"
                          disabled={isResolving}
                          onClick={async () => {
                            setResolvingPrioId(prio.id);
                            try {
                              await onResolvePriority(prio);
                            } finally {
                              setResolvingPrioId(null);
                            }
                          }}
                          className="text-[10px] font-bold text-slate-400 hover:text-emerald-400 bg-slate-900 hover:bg-emerald-500/10 border border-slate-800 hover:border-emerald-500/30 px-2 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          title="Segna come risolto permanentemente"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{isResolving ? 'Salvataggio...' : 'Segna Risolto'}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handlePriorityClick(prio)}
                        className={`text-xs font-black px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ml-auto shadow-sm ${
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

      {/* ─── RIEPILOGO COMPATTO IN PILLOLE & SELETTORE VISTA ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-3xl bg-slate-950/90 border border-slate-800/90 shadow-xl">
        {/* Pillole Contatori Riepilogo */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
          {/* Da seguire oggi */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
            <span className="text-slate-400">Da seguire oggi:</span>
            <span className="px-1.5 py-0.2 rounded-md font-mono font-black bg-rose-500/20 text-rose-300">
              {timelineCounters.needAttentionToday}
            </span>
          </div>

          {/* In ritardo */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
            <span className="text-slate-400">In ritardo:</span>
            <span className="px-1.5 py-0.2 rounded-md font-mono font-black bg-amber-500/20 text-amber-300">
              {timelineCounters.late}
            </span>
          </div>

          {/* Attivi oggi */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
            <span className="text-slate-400">Attivi oggi:</span>
            <span className="px-1.5 py-0.2 rounded-md font-mono font-black bg-emerald-500/20 text-emerald-300">
              {timelineCounters.activeToday}
            </span>
          </div>

          {/* Fine blocco */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
            <span className="text-slate-400">Fine blocco:</span>
            <span className="px-1.5 py-0.2 rounded-md font-mono font-black bg-amber-400/20 text-amber-300">
              {timelineCounters.endOfBlock}
            </span>
          </div>

          {/* Senza attività */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
            <span className="text-slate-400">Senza attività:</span>
            <span className="px-1.5 py-0.2 rounded-md font-mono font-black bg-slate-800 text-slate-300">
              {timelineCounters.noActivity}
            </span>
          </div>
        </div>

        {/* Selettore Modalità di Visualizzazione: [Priorità] [Tabella] */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-900 border border-slate-800 self-start md:self-auto shrink-0">
          <button
            type="button"
            onClick={() => handleViewModeChange('priority')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'priority'
                ? 'bg-[var(--color-primary)] text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Priorità</span>
          </button>

          <button
            type="button"
            onClick={() => handleViewModeChange('table')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'table'
                ? 'bg-[var(--color-primary)] text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Tabella</span>
          </button>
        </div>
      </div>

      {/* ─── VISTA 1: PRIORITÀ (VISTA ESISTENTE A CARD CON DECISIONI) ─── */}
      {viewMode === 'priority' && (
        <div className="space-y-6">
          {/* ─── 4. INTESTAZIONE SEZIONE, RICERCA E FILTRI ─── */}
          <div className="space-y-3 pt-2">
        {/* Riga superiore: Titolo con contatore, sottotitolo dinamico e ricerca */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span>Atleti da monitorare</span>
              <span className="text-slate-500 font-normal">·</span>
              <span className="text-[var(--color-primary)] font-mono">{attentionCount}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {attentionCount > 0
                ? `${attentionCount} ${attentionCount === 1 ? 'atleta richiede' : 'atleti richiedono'} attenzione`
                : 'Nessun atleta richiede attenzione'}
            </p>
          </div>

          {/* Ricerca a destra */}
          <div className="relative w-full sm:w-72">
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

        {/* Riga filtri principali e menu compatto [Filtri ▾] */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Gruppo Filtri Principali */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-slate-950 border border-slate-800/90">
            {/* 1. Richiedono attenzione (Default, prioritario) */}
            <button
              type="button"
              onClick={() => setMainFilter('attention')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                mainFilter === 'attention'
                  ? 'bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-500/20'
                  : 'text-amber-400/90 hover:text-amber-300 hover:bg-slate-900/60'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Richiedono attenzione</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                mainFilter === 'attention' ? 'bg-slate-950/20 text-slate-950' : 'bg-amber-400/15 text-amber-300'
              }`}>
                {attentionCount}
              </span>
            </button>

            {/* 2. A fine blocco */}
            <button
              type="button"
              onClick={() => setMainFilter('end_of_block')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                mainFilter === 'end_of_block'
                  ? 'bg-[var(--color-primary)] text-slate-950 font-black shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>A fine blocco</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                mainFilter === 'end_of_block' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-300'
              }`}>
                {endOfBlockCount}
              </span>
            </button>

            {/* 3. Da avviare */}
            <button
              type="button"
              onClick={() => setMainFilter('unassigned')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                mainFilter === 'unassigned'
                  ? 'bg-indigo-500 text-white font-black shadow-md shadow-indigo-500/20'
                  : 'text-indigo-400/90 hover:text-indigo-300 hover:bg-slate-900/60'
              }`}
            >
              <FilePlus2 className="w-3.5 h-3.5" />
              <span>Da avviare</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                mainFilter === 'unassigned' ? 'bg-black/30 text-white' : 'bg-indigo-500/20 text-indigo-300'
              }`}>
                {unassignedCount}
              </span>
            </button>

            {/* 4. Tutti (Neutro, non evidenziato di default) */}
            <button
              type="button"
              onClick={() => setMainFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                mainFilter === 'all'
                  ? 'bg-slate-800 text-white font-bold border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <span>Tutti</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                mainFilter === 'all' ? 'bg-slate-900 text-slate-200 font-bold' : 'bg-slate-900/80 text-slate-400'
              }`}>
                {totalCount}
              </span>
            </button>
          </div>

          {/* 5. Menu compatto [Filtri ▾] */}
          <div className="relative" ref={filterMenuRef}>
            <button
              type="button"
              onClick={() => setIsFilterMenuOpen((prev) => !prev)}
              className={`px-3 py-2 rounded-2xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-2 ${
                hasActiveSecondaryFilters
                  ? 'bg-slate-900 text-[var(--color-primary)] border-[var(--color-primary)]/40 shadow-sm shadow-amber-500/10'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filtri</span>
              {hasActiveSecondaryFilters && (
                <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse" />
              )}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isFilterMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu Popover */}
            {isFilterMenuOpen && (
              <div className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-84 sm:w-96 rounded-2xl bg-slate-950/98 backdrop-blur-2xl border border-slate-800 p-4 shadow-2xl z-50 space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar">
                {/* Header Menu */}
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-[var(--color-primary)]" />
                    <span className="text-xs font-black uppercase tracking-wider text-white">Filtri & Ordinamento</span>
                    {hasActiveSecondaryFilters && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-amber-400/20 text-amber-300 font-bold">
                        {activeSecondaryFiltersCount} attivi
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {hasActiveSecondaryFilters && (
                      <button
                        type="button"
                        onClick={handleResetSecondaryFilters}
                        className="text-[11px] text-slate-400 hover:text-amber-400 flex items-center gap-1 transition-colors cursor-pointer"
                        title="Reimposta tutti i filtri secondari"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reimposta</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsFilterMenuOpen(false)}
                      className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 1. Ordinamento */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Ordinamento
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'priority', label: 'Priorità' },
                      { id: 'attendance_asc', label: 'Aderenza più bassa' },
                      { id: 'end_block_first', label: 'Fine blocco più vicina' },
                      { id: 'name_asc', label: 'Nome' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          setSecondaryFilters((prev) => ({
                            ...prev,
                            sortBy: opt.id as SortByOption,
                          }))
                        }
                        className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-left transition-all cursor-pointer border ${
                          secondaryFilters.sortBy === opt.id
                            ? 'bg-[var(--color-primary)] text-slate-950 border-[var(--color-primary)] font-black'
                            : 'bg-slate-900/70 text-slate-400 border-slate-800/80 hover:text-white hover:bg-slate-900'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Stato Programma */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Stato Programma
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'all', label: 'Tutti' },
                      { id: 'active', label: 'Attivo' },
                      { id: 'unassigned', label: 'Da avviare' },
                      { id: 'completed', label: 'Completato' },
                      { id: 'paused', label: 'In pausa' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          setSecondaryFilters((prev) => ({
                            ...prev,
                            programStatus: opt.id as ProgramStatusFilter,
                          }))
                        }
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer border ${
                          secondaryFilters.programStatus === opt.id
                            ? 'bg-[var(--color-primary)] text-slate-950 border-[var(--color-primary)] font-black'
                            : 'bg-slate-900/70 text-slate-400 border-slate-800/80 hover:text-white hover:bg-slate-900'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Stato Performance */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Stato Performance
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'all', label: 'Tutti' },
                      { id: 'attention', label: 'Richiede attenzione' },
                      { id: 'stable', label: 'Stabile' },
                      { id: 'positive', label: 'In crescita' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          setSecondaryFilters((prev) => ({
                            ...prev,
                            performance: opt.id as PerformanceFilter,
                          }))
                        }
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer border ${
                          secondaryFilters.performance === opt.id
                            ? 'bg-[var(--color-primary)] text-slate-950 border-[var(--color-primary)] font-black'
                            : 'bg-slate-900/70 text-slate-400 border-slate-800/80 hover:text-white hover:bg-slate-900'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Avanzamento */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Avanzamento
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'all', label: 'Tutti' },
                      { id: 'start', label: 'Inizio blocco' },
                      { id: 'mid', label: 'Metà blocco' },
                      { id: 'end', label: 'Fine blocco' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          setSecondaryFilters((prev) => ({
                            ...prev,
                            progress: opt.id as ProgressFilter,
                          }))
                        }
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer border ${
                          secondaryFilters.progress === opt.id
                            ? 'bg-[var(--color-primary)] text-slate-950 border-[var(--color-primary)] font-black'
                            : 'bg-slate-900/70 text-slate-400 border-slate-800/80 hover:text-white hover:bg-slate-900'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5. Aderenza */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Aderenza
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'all', label: 'Tutti' },
                      { id: '<50', label: 'Sotto 50%' },
                      { id: '50-75', label: '50–75%' },
                      { id: '>75', label: 'Sopra 75%' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          setSecondaryFilters((prev) => ({
                            ...prev,
                            adherence: opt.id as AdherenceFilter,
                          }))
                        }
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer border ${
                          secondaryFilters.adherence === opt.id
                            ? 'bg-[var(--color-primary)] text-slate-950 border-[var(--color-primary)] font-black'
                            : 'bg-slate-900/70 text-slate-400 border-slate-800/80 hover:text-white hover:bg-slate-900'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 6. Presenza Fastidi */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Presenza Fastidi
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'all', label: 'Tutti' },
                      { id: 'yes', label: 'Sì' },
                      { id: 'no', label: 'No' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          setSecondaryFilters((prev) => ({
                            ...prev,
                            pain: opt.id as PainFilter,
                          }))
                        }
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer border ${
                          secondaryFilters.pain === opt.id
                            ? 'bg-[var(--color-primary)] text-slate-950 border-[var(--color-primary)] font-black'
                            : 'bg-slate-900/70 text-slate-400 border-slate-800/80 hover:text-white hover:bg-slate-900'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── 5. SEZIONE: LISTA CARD ATLETI ─── */}
      {(mainFilter !== 'unassigned' || filteredActiveAthletes.length > 0) && (
        <div className="space-y-3">
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

                      {ath.singleDecisionCtaLabel === 'Gestito' ? (
                        <div className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-black shrink-0 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Gestito</span>
                        </div>
                      ) : (
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
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── 6. SEZIONE: ATLETI DA AVVIARE (TABELLA COMPATTA & MASSIVA) ─── */}
      {(mainFilter === 'all' || mainFilter === 'unassigned') && unassignedAthletes.length > 0 && (
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
      )}

      {/* ─── VISTA 2: TABELLA (VISUALIZZAZIONE COMPATTA ORDINABILE CON RICERCA E FILTRI) ─── */}
      {viewMode === 'table' && (
        <AthleteTableView
          timelineItems={timelineItems}
          onSelectAthlete={onSelectAthlete}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};
