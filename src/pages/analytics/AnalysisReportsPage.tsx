import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Brain,
  RefreshCw,
  TrendingUp,
  Users,
  User,
  ArrowLeft,
  LayoutDashboard,
  Zap,
  Table,
} from 'lucide-react';
import { useAthletes } from '../../context/AthletesContext';
import { useWorkouts } from '../../context/WorkoutsContext';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  TimeframeOption,
  TeamOverviewReportData,
} from '../../types';
import { buildTeamOverviewReport } from './utils/reportCalculator';
import { TeamOverviewReportView, TeamViewMode } from './components/TeamOverviewReportView';
import { AthleteDetailReportView } from './components/AthleteDetailReportView';
import { TeamOverviewSkeleton, AthleteDetailSkeleton } from './components/AnalyticsSkeletons';
import { AICopilotActionModal, CopilotAlertContext } from '../dashboard/components/AICopilotActionModal';

// ─── CACHE GLOBALE IN MEMORIA (2 MINUTI TTL) ─────────────────────────────────
interface AnalysisDataCache {
  sessions: any[];
  logs: any[];
  assignments: any[];
  exerciseNamesMap: Map<string, string>;
  exerciseMetaMap: Map<string, { name: string; day_name?: string; week_number?: number }>;
  workoutDaysMap?: Record<string, string[]>;
  athleteIdsKey: string;
  timestamp: number;
}

let globalAnalysisCache: AnalysisDataCache | null = null;
const ANALYSIS_CACHE_TTL = 120 * 1000;

export interface AnalysisReportsPageProps {
  isFullscreen?: boolean;
  onBackToPlatform?: () => void;
}

export const AnalysisReportsPage: React.FC<AnalysisReportsPageProps> = ({
  isFullscreen = false,
  onBackToPlatform,
}) => {
  const { athletes, selectedAthleteId: globalAthleteId, setSelectedAthleteId } = useAthletes();
  const { allAssignedWorkouts } = useWorkouts();
  const { setActiveTab, ownerProfile } = useApp();
  const { user } = useAuth();

  const mountTimeRef = useRef<number>(Date.now());
  const athleteIdsKey = useMemo(() => (athletes || []).map((a) => a.id).sort().join(','), [athletes]);

  // Profilazione e misurazione tempi di render (First Shell vs Meaningful Content)
  useEffect(() => {
    const elapsed = Date.now() - mountTimeRef.current;
    console.log(`[Performance & Copilot Metrics] First Shell Render: ${elapsed}ms | Cached: ${hasValidCache ? 'YES (0ms blocking)' : 'NO (progressive skeleton)'}`);
  }, []);

  // Controlla se abbiamo dati in cache validi per questi atleti
  const hasValidCache = useMemo(() => {
    if (!globalAnalysisCache) return false;
    const isFresh = Date.now() - globalAnalysisCache.timestamp < ANALYSIS_CACHE_TTL;
    const isSameAthletes = globalAnalysisCache.athleteIdsKey === athleteIdsKey;
    return isFresh && isSameAthletes;
  }, [athleteIdsKey]);

  // Orizzonte Temporale Selezionato (Default: Mensile)
  const [timeframe, setTimeframe] = useState<TimeframeOption>('monthly');

  // Vista Selezionata: null = Vista Generale Coach; string = ID Atleta per Vista Dettagliata
  const [selectedAthleteId, setLocalSelectedAthleteId] = useState<string | null>(null);

  // Modalità di visualizzazione della panoramica squadra ('priority' | 'table')
  const [teamViewMode, setTeamViewMode] = useState<TeamViewMode>(() => {
    try {
      const saved = localStorage.getItem('ac_performance_view_mode');
      if (saved === 'priority' || saved === 'table') return saved;
    } catch (_) {}
    return 'priority';
  });

  // Navigazione interna specifica per Performance & Copilot: [Panoramica] [Priorità] [Tabella] [Singolo atleta]
  const [activeSubNav, setActiveSubNav] = useState<'panoramica' | 'priorita' | 'tabella' | 'atleta'>('panoramica');

  // Sincronizza lo stato di navigazione interna con la vista corrente
  useEffect(() => {
    if (selectedAthleteId) {
      setActiveSubNav('atleta');
    } else {
      if (teamViewMode === 'table') setActiveSubNav('tabella');
      else if (activeSubNav !== 'priorita') setActiveSubNav('panoramica');
    }
  }, [selectedAthleteId, teamViewMode]);

  // Modale Copilot
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [copilotContext, setCopilotContext] = useState<CopilotAlertContext | null>(null);
  const [dismissedVersion, setDismissedVersion] = useState(0);

  // Sincronizza archiviazioni alert in tempo reale
  useEffect(() => {
    const handleAlertsUpdate = () => {
      setDismissedVersion((v) => v + 1);
    };
    window.addEventListener('storage', handleAlertsUpdate);
    window.addEventListener('copilot_dismissed_update', handleAlertsUpdate);
    return () => {
      window.removeEventListener('storage', handleAlertsUpdate);
      window.removeEventListener('copilot_dismissed_update', handleAlertsUpdate);
    };
  }, []);

  // Dati Reali (Inizializzati subito da cache se disponibili per First Meaningful Paint istantaneo a 0ms)
  const [sessions, setSessions] = useState<any[]>(() => hasValidCache ? globalAnalysisCache!.sessions : []);
  const [logs, setLogs] = useState<any[]>(() => hasValidCache ? globalAnalysisCache!.logs : []);
  const [assignments, setAssignments] = useState<any[]>(() => hasValidCache ? globalAnalysisCache!.assignments : []);
  const [exerciseNamesMap, setExerciseNamesMap] = useState<Map<string, string>>(() => hasValidCache ? globalAnalysisCache!.exerciseNamesMap : new Map());
  const [exerciseMetaMap, setExerciseMetaMap] = useState<Map<string, { name: string; day_name?: string; week_number?: number }>>(() => hasValidCache ? globalAnalysisCache!.exerciseMetaMap : new Map());
  const [workoutDaysMap, setWorkoutDaysMap] = useState<Record<string, string[]>>(() => (hasValidCache && globalAnalysisCache!.workoutDaysMap) ? globalAnalysisCache!.workoutDaysMap : {});

  // Stato caricamento: false se abbiamo la cache, true solo al primo caricamento a freddo
  const [isLoading, setIsLoading] = useState<boolean>(() => !hasValidCache);
  const [isUpdatingBackground, setIsUpdatingBackground] = useState<boolean>(false);

  // Sincronizza con atleta globale se selezionato in precedenza
  useEffect(() => {
    if (globalAthleteId && !selectedAthleteId) {
      setLocalSelectedAthleteId(globalAthleteId);
    }
  }, [globalAthleteId]);

  const isFetchingRef = useRef(false);

  const loadData = useCallback(async (forceRefresh = false) => {
    if (!athletes || athletes.length === 0) {
      setIsLoading(false);
      return;
    }
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    const startFetch = Date.now();
    if (!hasValidCache || forceRefresh) {
      setIsUpdatingBackground(true);
    }

    try {
      const athleteIds = athletes.map((a) => a.id);
      const oneYearAgoIso = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();

      // ─── STAGE 1 (PRIORITÀ ALTA): Assegnazioni + Sessioni ───
      const [assignRes, sessionRes] = await Promise.all([
        supabase
          .from('athlete_assigned_workouts')
          .select(`
            id,
            athlete_id,
            workout_id,
            assigned_date,
            is_active,
            workout:workouts(id, title, total_weeks, parent_template_id)
          `)
          .in('athlete_id', athleteIds),
        supabase
          .from('workout_sessions')
          .select(`
            id,
            athlete_id,
            workout_id,
            week_number,
            day_name,
            status,
            skip_reason,
            skip_notes,
            coach_justified,
            start_time,
            end_time,
            notes,
            rpe,
            workouts ( id, title, total_weeks, parent_template_id )
          `)
          .in('athlete_id', athleteIds)
          .gte('start_time', oneYearAgoIso)
          .not('end_time', 'is', null)
          .order('start_time', { ascending: false })
          .limit(600),
      ]);

      const mergedAssignments: any[] = assignRes.data || [];
      allAssignedWorkouts.forEach((localAssign: any) => {
        if (!mergedAssignments.some((a) => a.athlete_id === localAssign.athlete_id)) {
          mergedAssignments.push({
            athlete_id: localAssign.athlete_id,
            workout_id: localAssign.workout_id,
            assigned_date: localAssign.assigned_date || localAssign.created_at,
            workout_title: localAssign.workout?.title || localAssign.workout_title || 'Scheda Attiva',
            workout: {
              title: localAssign.workout?.title || localAssign.workout_title || 'Scheda Attiva',
              total_weeks: localAssign.workout?.total_weeks || 5,
              parent_template_id: localAssign.workout?.parent_template_id || null,
            },
          });
        }
      });

      // Recupera i giorni reali di ogni scheda assegnata da workout_exercises (senza fallback fissi)
      const targetWIds = Array.from(
        new Set(
          mergedAssignments
            .flatMap((a: any) => [a.workout_id, a.workout?.id, a.workout?.parent_template_id])
            .filter(Boolean) as string[]
        )
      );

      let wDaysMap: Record<string, string[]> = {};
      if (targetWIds.length > 0) {
        try {
          const { data: daysData } = await supabase
            .from('workout_exercises')
            .select('workout_id, day_name')
            .in('workout_id', targetWIds)
            .order('order_index', { ascending: true });

          if (daysData) {
            daysData.forEach((row) => {
              const wId = row.workout_id;
              const dName = (row.day_name || '').trim();
              if (wId && dName) {
                if (!wDaysMap[wId]) wDaysMap[wId] = [];
                if (!wDaysMap[wId].includes(dName)) {
                  wDaysMap[wId].push(dName);
                }
              }
            });
          }
        } catch (_) {}
      }
      setWorkoutDaysMap(wDaysMap);

      // Carica sessioni da backup locale se presenti
      let localSessionList: any[] = [];
      try {
        localSessionList = JSON.parse(localStorage.getItem('builder_local_sessions_backup') || '[]');
      } catch (_) {}

      const completedLocalSessions = localSessionList.filter((ls) => ls && ls.end_time);
      const allSessions = (sessionRes.data || []).concat(
        completedLocalSessions.filter((ls) => !(sessionRes.data || []).some((sd: any) => sd.id === ls.id))
      );

      // Aggiorna subito Stage 1: la panoramica e le priorità possono già iniziare a renderizzare!
      setAssignments(mergedAssignments);
      setSessions(allSessions);
      setIsLoading(false);

      const stage1Time = Date.now() - startFetch;
      console.log(`[Performance & Copilot] Stage 1 completato in ${stage1Time}ms (Overview & Decisioni pronte)`);

      // ─── STAGE 2 (PRIORITÀ SECONDARIA): Log Esercizi & Metadati ───
      const sessionIds = allSessions.map((s) => s.id);
      let allLogs: any[] = [];
      if (sessionIds.length > 0) {
        const { data: logData } = await supabase
          .from('exercise_logs')
          .select(`
            id,
            session_id,
            exercise_id,
            set_number,
            reps_completed,
            weight_kg,
            notes
          `)
          .in('session_id', sessionIds.slice(0, 120));
        allLogs = logData || [];
      }

      // Unisci log da backup locale
      try {
        const localLogs = JSON.parse(localStorage.getItem('builder_local_logs_backup') || '[]');
        localLogs.forEach((ll: any) => {
          if (!allLogs.some((al) => al.id === ll.id)) {
            allLogs.push(ll);
          }
        });
      } catch (_) {}
      setLogs(allLogs);

      // Dizionario Nomi & Metadati Esercizi
      const uniqueExIds = Array.from(new Set(allLogs.map((l) => l.exercise_id).filter(Boolean)));
      let namesMap = new Map<string, string>();
      let metaMap = new Map<string, { name: string; day_name?: string; week_number?: number }>();

      if (uniqueExIds.length > 0) {
        const { data: exData } = await supabase
          .from('workout_exercises')
          .select('id, name, day_name, week_number')
          .in('id', uniqueExIds);

        if (exData) {
          exData.forEach((e) => {
            namesMap.set(e.id, e.name);
            metaMap.set(e.id, {
              name: e.name,
              day_name: e.day_name,
              week_number: e.week_number,
            });
          });
          setExerciseNamesMap(namesMap);
          setExerciseMetaMap(metaMap);
        }
      }

      // Salva nella Cache Globale
      globalAnalysisCache = {
        sessions: allSessions,
        logs: allLogs,
        assignments: mergedAssignments,
        exerciseNamesMap: namesMap,
        exerciseMetaMap: metaMap,
        workoutDaysMap: wDaysMap,
        athleteIdsKey,
        timestamp: Date.now(),
      };

      const totalTime = Date.now() - startFetch;
      console.log(`[Performance & Copilot] Fully Loaded in ${totalTime}ms (Tutti i grafici e dettagli sincronizzati)`);
    } catch (err) {
      console.warn('[Performance & Copilot] Errore caricamento:', err);
    } finally {
      setIsLoading(false);
      setIsUpdatingBackground(false);
      isFetchingRef.current = false;
    }
  }, [athletes, allAssignedWorkouts, athleteIdsKey, hasValidCache]);

  useEffect(() => {
    loadData();
  }, [athleteIdsKey, loadData]);

  // Calcolo Report Globale Squadra e Atleti (Memoizzato)
  const teamReportData: TeamOverviewReportData = useMemo(() => {
    return buildTeamOverviewReport(
      timeframe,
      athletes,
      sessions,
      logs,
      assignments,
      exerciseNamesMap
    );
  }, [timeframe, athletes, sessions, logs, assignments, exerciseNamesMap, dismissedVersion]);

  // Report Atleta Selezionato
  const selectedAthleteReport = useMemo(() => {
    if (!selectedAthleteId) return null;
    return teamReportData.athletesReports.find((a) => a.athleteId === selectedAthleteId) || null;
  }, [selectedAthleteId, teamReportData]);

  const handleSelectAthlete = (athleteId: string) => {
    setLocalSelectedAthleteId(athleteId);
    setSelectedAthleteId(athleteId);
  };

  const handleBackToOverview = () => {
    setLocalSelectedAthleteId(null);
  };

  // Navigazione interna specifica per Performance & Copilot
  const handleSubNavPanoramica = () => {
    setLocalSelectedAthleteId(null);
    setTeamViewMode('priority');
    setActiveSubNav('panoramica');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubNavPriorita = () => {
    setLocalSelectedAthleteId(null);
    setTeamViewMode('priority');
    setActiveSubNav('priorita');
    setTimeout(() => {
      const el = document.getElementById('performance-copilot-priorities');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  const handleSubNavTabella = () => {
    setLocalSelectedAthleteId(null);
    setTeamViewMode('table');
    setActiveSubNav('tabella');
  };

  const handleSubNavAtleta = () => {
    setActiveSubNav('atleta');
    if (!selectedAthleteId && athletes.length > 0) {
      handleSelectAthlete(athletes[0].id);
    }
  };

  const handleNavigateToChat = (athleteId: string) => {
    setSelectedAthleteId(athleteId);
    setActiveTab('messaggi');
  };

  const handleNavigateToWorkouts = (athleteId: string) => {
    setSelectedAthleteId(athleteId);
    setActiveTab('schede');
  };

  const handleOpenCopilotModal = (athleteId: string, customAlert?: any) => {
    const athlete = athletes.find((a) => a.id === athleteId);
    const assign = assignments.find((a) => a.athlete_id === athleteId);
    const athReport = teamReportData.athletesReports.find((a) => a.athleteId === athleteId);

    let type: CopilotAlertContext['type'] = 'progression';
    if (customAlert?.category === 'pain' || customAlert?.type === 'pain') type = 'critical_note';
    else if (customAlert?.category === 'inactivity' || customAlert?.type === 'inactivity') type = 'inactivity';
    else if (customAlert?.category === 'missing_weights' || customAlert?.type === 'missing_weights') type = 'missing_weights';
    else if (customAlert?.category === 'stagnation' || customAlert?.category === 'plateau' || customAlert?.type === 'plateau') type = 'plateau';

    const exerciseName = customAlert?.exerciseName || athReport?.painDetailsSummary || '';
    const noteText = customAlert?.rationale || customAlert?.noteText || athReport?.painDetailsSummary || customAlert?.summary || '';

    setCopilotContext({
      athleteId,
      athleteName: athlete?.fullName || customAlert?.athleteName || 'Atleta',
      workoutTitle: assign?.workout?.title || assign?.workout_title || 'Scheda Attiva',
      type,
      exerciseName,
      suggestion: customAlert?.summary || athReport?.singleDecisionTitle,
      noteText,
    });
    setIsCopilotOpen(true);
  };

  const handleAssignMultiple = (athleteIds: string[]) => {
    if (athleteIds.length > 0) {
      setSelectedAthleteId(athleteIds[0]);
      setActiveTab('schede');
    }
  };

  const hasReportData = teamReportData && teamReportData.athletesReports.length > 0;

  return (
    <div className={`w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans ${isFullscreen ? '' : 'max-w-[1600px] mx-auto pb-12 animate-in fade-in duration-200'}`}>
      {/* ─── TOP BAR FULLSCREEN ─── (2 righe separate, mai sovrapposizione) */}
      {isFullscreen && (
        <header className="sticky top-0 z-40 bg-slate-900/98 backdrop-blur-md border-b border-slate-800 shadow-xl select-none shrink-0">
          {/* ── RIGA 1: Identità — Sinistra: Back+Logo+Titolo | Destra: Aggiorna+Profilo ── */}
          <div className="h-12 px-4 sm:px-5 flex items-center justify-between gap-3 border-b border-slate-800/60">
            {/* Sinistra */}
            <div className="flex items-center gap-2.5 min-w-0">
              {onBackToPlatform && (
                <button
                  type="button"
                  onClick={onBackToPlatform}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition cursor-pointer flex items-center gap-1.5 text-xs font-bold shrink-0"
                  title="Torna al gestionale"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Torna al gestionale</span>
                </button>
              )}

              {onBackToPlatform && <div className="h-5 w-px bg-slate-700/60 shrink-0" />}

              {/* Logo + Titolo + Badge */}
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--color-primary)]/20 to-amber-600/10 border border-[var(--color-primary)]/40 flex items-center justify-center text-[var(--color-primary)] shrink-0">
                  <Brain className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-sm font-black text-white tracking-tight whitespace-nowrap">
                  Performance & Copilot
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 whitespace-nowrap shrink-0">
                  <TrendingUp className="w-2.5 h-2.5" />
                  Centro decisionale
                </span>
                {isUpdatingBackground && (
                  <span className="hidden md:inline-flex items-center gap-1 text-[9px] font-semibold text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full animate-pulse whitespace-nowrap shrink-0">
                    <RefreshCw className="w-2 h-2 animate-spin text-[var(--color-primary)]" />
                    Sincronizzazione...
                  </span>
                )}
              </div>
            </div>

            {/* Destra: Aggiorna + Profilo */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => loadData(true)}
                disabled={isUpdatingBackground}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer disabled:opacity-50"
                title="Ricarica dati"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isUpdatingBackground ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Aggiorna</span>
              </button>

              <div className="h-5 w-px bg-slate-700/60" />

              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="w-6 h-6 rounded-md bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/30 flex items-center justify-center shrink-0">
                  <User className="w-3 h-3 text-[var(--color-primary)]" />
                </div>
                <span className="text-xs font-bold text-white max-w-[80px] truncate hidden md:inline">
                  {user?.name || ownerProfile?.fullName || 'Coach'}
                </span>
              </div>
            </div>
          </div>

          {/* ── RIGA 2: Navigazione — Tab al centro | Toggle Squadra/Atleta a destra ── */}
          <div className="h-10 px-4 sm:px-5 flex items-center justify-between gap-3">
            {/* Tab di navigazione principali */}
            <nav className="flex items-center gap-0.5 p-0.5 rounded-xl bg-slate-950/70 border border-slate-800/70 text-xs overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={handleSubNavPanoramica}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  !selectedAthleteId && activeSubNav === 'panoramica'
                    ? 'bg-[var(--color-primary)] text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <LayoutDashboard className="w-3 h-3 shrink-0" />
                <span>Panoramica</span>
              </button>

              <button
                type="button"
                onClick={handleSubNavPriorita}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  !selectedAthleteId && activeSubNav === 'priorita'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Zap className="w-3 h-3 shrink-0" />
                <span>Priorità</span>
              </button>

              <button
                type="button"
                onClick={handleSubNavTabella}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  !selectedAthleteId && activeSubNav === 'tabella'
                    ? 'bg-[var(--color-primary)] text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Table className="w-3 h-3 shrink-0" />
                <span>Tabella</span>
              </button>

              <button
                type="button"
                onClick={handleSubNavAtleta}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  selectedAthleteId
                    ? 'bg-[var(--color-primary)] text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <User className="w-3 h-3 shrink-0" />
                <span>Singolo atleta</span>
              </button>
            </nav>

            {/* Toggle Panoramica Squadra / Singolo Atleta — a destra della riga 2 */}
            <div className="flex items-center gap-1 p-0.5 rounded-xl bg-slate-950/70 border border-slate-800/70 text-xs shrink-0">
              <button
                type="button"
                onClick={handleBackToOverview}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  !selectedAthleteId
                    ? 'bg-[var(--color-primary)] text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Users className="w-3 h-3 shrink-0" />
                <span className="hidden sm:inline">Squadra</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!selectedAthleteId && athletes.length > 0) {
                    handleSelectAthlete(athletes[0].id);
                  }
                }}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  selectedAthleteId
                    ? 'bg-[var(--color-primary)] text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <User className="w-3 h-3 shrink-0" />
                <span className="hidden sm:inline">Atleta</span>
              </button>
            </div>
          </div>
        </header>
      )}


      {/* ─── CORPO PRINCIPALE A TUTTA LARGHEZZA SENZA COMPRESSIONI ─── */}
      <div className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Intestazione pagina — visibile solo fuori dalla modalità fullscreen (in fullscreen la top bar basta) */}
        {!isFullscreen && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--color-primary)]/20 to-amber-600/10 border border-[var(--color-primary)]/40 flex items-center justify-center text-[var(--color-primary)] shadow-lg shrink-0">
                <Brain className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Performance &amp; Copilot
                  </h1>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Centro Decisionale
                  </span>
                  {isUpdatingBackground && (
                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1">
                      <RefreshCw className="w-2.5 h-2.5 animate-spin text-[var(--color-primary)]" />
                      Sincronizzazione...
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-400 font-medium mt-0.5">
                  Confronta i progressi degli atleti e decidi il prossimo intervento.
                </p>
              </div>
            </div>

            {/* Toggle Vista & Ricarica (visibili nell'intestazione solo se NON in fullscreen) */}
            <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
              <div className="inline-flex bg-slate-950 p-1 rounded-2xl border border-slate-800 gap-1 text-xs shadow-inner">
                <button
                  type="button"
                  onClick={handleBackToOverview}
                  className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    !selectedAthleteId
                      ? "bg-[var(--color-primary)] text-slate-950 font-black shadow-md"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Panoramica Squadra</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!selectedAthleteId && athletes.length > 0) {
                      handleSelectAthlete(athletes[0].id);
                    }
                  }}
                  className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    selectedAthleteId
                      ? "bg-[var(--color-primary)] text-slate-950 font-black shadow-md"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Singolo Atleta</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => loadData(true)}
                disabled={isUpdatingBackground}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white hover:border-slate-700 transition-all cursor-pointer shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isUpdatingBackground ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Aggiorna</span>
              </button>
            </div>
          </div>
        )}

        {/* ─── CONTENUTO PRINCIPALE PROGRESSIVO (SKELETON SE VUOTO, ALTRIMENTI VISTA VIVA) ─── */}
        {isLoading && !hasReportData ? (
          /* SKELETON PROGRESSIVO NON BLOCCANTE */
          selectedAthleteId ? <AthleteDetailSkeleton /> : <TeamOverviewSkeleton />
        ) : selectedAthleteReport ? (
          /* VISTA DETTAGLIO ATLETA */
          <AthleteDetailReportView
            athleteReport={selectedAthleteReport}
            allAthletes={athletes}
            allReports={teamReportData.athletesReports}
            timeframe={timeframe}
            currentRangeLabel={teamReportData.currentRangeLabel}
            previousRangeLabel={teamReportData.previousRangeLabel}
            sessions={sessions}
            logs={logs}
            exerciseMetaMap={exerciseMetaMap}
            onDataUpdated={() => loadData(true)}
            onTimeframeChange={setTimeframe}
            onSelectAthlete={handleSelectAthlete}
            onBackToOverview={handleBackToOverview}
            onNavigateToChat={handleNavigateToChat}
            onNavigateToWorkouts={handleNavigateToWorkouts}
            onOpenCopilot={(athleteId, athleteName, workoutTitle) => {
              const athReport = selectedAthleteReport;
              let category = 'progression';
              if (athReport?.singleDecisionType === 'pain') category = 'pain';
              else if (athReport?.singleDecisionType === 'inactivity' || athReport?.completedSessions.current === 0 || athReport?.programStatus === 'pending_start') category = 'inactivity';
              else if (athReport?.singleDecisionType === 'plateau') category = 'stagnation';
              handleOpenCopilotModal(athleteId, { athleteId, athleteName, workoutTitle, category, summary: athReport?.singleDecisionTitle });
            }}
          />
        ) : (
          /* VISTA GENERALE SQUADRA & CENTRO DECISIONALE */
          <TeamOverviewReportView
            reportData={teamReportData}
            timeframe={timeframe}
            athletes={athletes}
            sessions={sessions}
            assignments={assignments}
            workoutDaysMap={workoutDaysMap}
            isLoading={isLoading}
            onTimeframeChange={setTimeframe}
            onSelectAthlete={handleSelectAthlete}
            onAssignProgram={handleNavigateToWorkouts}
            onOpenCopilot={handleOpenCopilotModal}
            onAssignMultiplePrograms={handleAssignMultiple}
            activeViewMode={teamViewMode}
            onViewModeChange={setTeamViewMode}
          />
        )}
      </div>

      {/* ─── 3. MODALE COPILOT DECISIONALE ─── */}
      {isCopilotOpen && copilotContext && (
        <AICopilotActionModal
          isOpen={isCopilotOpen}
          onClose={() => {
            setIsCopilotOpen(false);
            setCopilotContext(null);
          }}
          alertData={copilotContext}
          onApplied={(athleteId) => {
            try {
              const saved = localStorage.getItem('builder_copilot_dismissed_alerts');
              const set = saved ? new Set<string>(JSON.parse(saved)) : new Set<string>();
              set.add(athleteId);
              set.add(`prio-pain-${athleteId}`);
              set.add(`prio-penult-${athleteId}`);
              set.add(`prio-unassigned-${athleteId}`);
              localStorage.setItem('builder_copilot_dismissed_alerts', JSON.stringify(Array.from(set)));
              window.dispatchEvent(new Event('storage'));
              window.dispatchEvent(new CustomEvent('copilot_dismissed_update'));
            } catch (_) {}
            setDismissedVersion((v) => v + 1);
            setIsCopilotOpen(false);
            setCopilotContext(null);
            loadData(true);
          }}
        />
      )}
    </div>
  );
};
