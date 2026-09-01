import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Brain,
  RefreshCw,
  TrendingUp,
  Users,
  User,
} from 'lucide-react';
import { useAthletes } from '../../context/AthletesContext';
import { useWorkouts } from '../../context/WorkoutsContext';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import {
  TimeframeOption,
  TeamOverviewReportData,
} from '../../types';
import { buildTeamOverviewReport } from './utils/reportCalculator';
import { TeamOverviewReportView } from './components/TeamOverviewReportView';
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
  athleteIdsKey: string;
  timestamp: number;
}

let globalAnalysisCache: AnalysisDataCache | null = null;
const ANALYSIS_CACHE_TTL = 120 * 1000;

export const AnalysisReportsPage: React.FC = () => {
  const { athletes, selectedAthleteId: globalAthleteId, setSelectedAthleteId } = useAthletes();
  const { allAssignedWorkouts } = useWorkouts();
  const { setActiveTab } = useApp();

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

  // Modale Copilot
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [copilotContext, setCopilotContext] = useState<CopilotAlertContext | null>(null);

  // Dati Reali (Inizializzati subito da cache se disponibili per First Meaningful Paint istantaneo a 0ms)
  const [sessions, setSessions] = useState<any[]>(() => hasValidCache ? globalAnalysisCache!.sessions : []);
  const [logs, setLogs] = useState<any[]>(() => hasValidCache ? globalAnalysisCache!.logs : []);
  const [assignments, setAssignments] = useState<any[]>(() => hasValidCache ? globalAnalysisCache!.assignments : []);
  const [exerciseNamesMap, setExerciseNamesMap] = useState<Map<string, string>>(() => hasValidCache ? globalAnalysisCache!.exerciseNamesMap : new Map());
  const [exerciseMetaMap, setExerciseMetaMap] = useState<Map<string, { name: string; day_name?: string; week_number?: number }>>(() => hasValidCache ? globalAnalysisCache!.exerciseMetaMap : new Map());

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
            workout:workouts(id, title, total_weeks)
          `)
          .in('athlete_id', athleteIds),
        supabase
          .from('workout_sessions')
          .select(`
            id,
            athlete_id,
            workout_id,
            start_time,
            end_time,
            notes,
            rpe,
            workouts ( id, title, total_weeks )
          `)
          .in('athlete_id', athleteIds)
          .gte('start_time', oneYearAgoIso)
          .not('end_time', 'is', null)
          .order('start_time', { ascending: false })
          .limit(150),
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
              total_weeks: 5,
            },
          });
        }
      });

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
  }, [timeframe, athletes, sessions, logs, assignments, exerciseNamesMap]);

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
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12 animate-in fade-in duration-200">
      {/* ─── 1. HEADER & TOOLBAR PRINCIPALE (SEMPRE RENDERIZZATO SUBITO A 0 MS) ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--color-primary)]/20 to-amber-600/10 border border-[var(--color-primary)]/40 flex items-center justify-center text-[var(--color-primary)] shadow-lg shrink-0">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Performance & Copilot
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

        {/* Toggle Vista: Squadra vs Singolo Atleta + Bottone Ricarica */}
        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
          <div className="inline-flex bg-slate-950 p-1 rounded-2xl border border-slate-800 gap-1 text-xs shadow-inner">
            <button
              type="button"
              onClick={handleBackToOverview}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                !selectedAthleteId
                  ? 'bg-[var(--color-primary)] text-slate-950 font-black shadow-md'
                  : 'text-slate-400 hover:text-white'
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
                  ? 'bg-[var(--color-primary)] text-slate-950 font-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Singolo Atleta</span>
            </button>
          </div>

          {/* Bottone Ricarica */}
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={isUpdatingBackground}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white hover:border-slate-700 transition-all cursor-pointer shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isUpdatingBackground ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Aggiorna</span>
          </button>
        </div>
      </div>

      {/* ─── 2. CONTENUTO PRINCIPALE PROGRESSIVO (SKELETON SE VUOTO, ALTRIMENTI VISTA VIVA) ─── */}
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
          onTimeframeChange={setTimeframe}
          onSelectAthlete={handleSelectAthlete}
          onAssignProgram={handleNavigateToWorkouts}
          onOpenCopilot={handleOpenCopilotModal}
          onAssignMultiplePrograms={handleAssignMultiple}
        />
      )}

      {/* ─── 3. MODALE COPILOT DECISIONALE ─── */}
      {isCopilotOpen && copilotContext && (
        <AICopilotActionModal
          isOpen={isCopilotOpen}
          onClose={() => setIsCopilotOpen(false)}
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
            } catch (_) {}
            setIsCopilotOpen(false);
            loadData(true);
          }}
        />
      )}
    </div>
  );
};
