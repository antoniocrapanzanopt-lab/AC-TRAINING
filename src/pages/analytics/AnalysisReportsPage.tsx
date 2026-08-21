import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { AICopilotActionModal, CopilotAlertContext } from '../dashboard/components/AICopilotActionModal';

export const AnalysisReportsPage: React.FC = () => {
  const { athletes, selectedAthleteId: globalAthleteId, setSelectedAthleteId } = useAthletes();
  const { allAssignedWorkouts } = useWorkouts();
  const { setActiveTab } = useApp();

  // Orizzonte Temporale Selezionato (Default: Mensile)
  const [timeframe, setTimeframe] = useState<TimeframeOption>('monthly');

  // Vista Selezionata: null = Vista Generale Coach; string = ID Atleta per Vista Dettagliata
  const [selectedAthleteId, setLocalSelectedAthleteId] = useState<string | null>(null);

  // Modale Copilot
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [copilotContext, setCopilotContext] = useState<CopilotAlertContext | null>(null);

  // Dati Reali
  const [sessions, setSessions] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [exerciseNamesMap, setExerciseNamesMap] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sincronizza con atleta globale se selezionato in precedenza
  useEffect(() => {
    if (globalAthleteId && !selectedAthleteId) {
      setLocalSelectedAthleteId(globalAthleteId);
    }
  }, [globalAthleteId]);

  const loadData = useCallback(async () => {
    if (!athletes || athletes.length === 0) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const athleteIds = athletes.map((a) => a.id);

      // 1. Carica assegnazioni schede attive
      const { data: assignData } = await supabase
        .from('athlete_assigned_workouts')
        .select(`
          id,
          athlete_id,
          workout_id,
          assigned_date,
          is_active,
          workout:workouts(id, title, total_weeks)
        `)
        .in('athlete_id', athleteIds);

      const mergedAssignments: any[] = assignData || [];
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
      setAssignments(mergedAssignments);

      // 2. Carica sessioni degli ultimi 2 anni (per coprire fino al confronto annuale)
      const twoYearsAgoIso = new Date(Date.now() - 730 * 24 * 60 * 60 * 1000).toISOString();
      const { data: sessionData } = await supabase
        .from('workout_sessions')
        .select(`
          id,
          athlete_id,
          workout_id,
          start_time,
          end_time,
          notes,
          rpe,
          workouts ( title, total_weeks )
        `)
        .in('athlete_id', athleteIds)
        .gte('start_time', twoYearsAgoIso)
        .order('start_time', { ascending: false });

      // Carica sessioni da backup locale se presenti
      let localSessionList: any[] = [];
      try {
        localSessionList = JSON.parse(localStorage.getItem('builder_local_sessions_backup') || '[]');
      } catch (_) {}

      const allSessions = (sessionData || []).concat(
        localSessionList.filter((ls) => !(sessionData || []).some((sd) => sd.id === ls.id))
      );
      setSessions(allSessions);

      // 3. Carica log degli esercizi
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
          .in('session_id', sessionIds.slice(0, 300));
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

      // 4. Dizionario Nomi Esercizi
      const uniqueExIds = Array.from(new Set(allLogs.map((l) => l.exercise_id).filter(Boolean)));
      if (uniqueExIds.length > 0) {
        const { data: exData } = await supabase
          .from('workout_exercises')
          .select('id, name')
          .in('id', uniqueExIds);

        if (exData) {
          const map = new Map<string, string>();
          exData.forEach((e) => map.set(e.id, e.name));
          setExerciseNamesMap(map);
        }
      }

      setIsLoading(false);
    } catch (err) {
      console.warn('Errore caricamento dati Performance & Copilot:', err);
      setIsLoading(false);
    }
  }, [athletes, allAssignedWorkouts]);

  useEffect(() => {
    loadData();
    window.addEventListener('storage', loadData);
    return () => {
      window.removeEventListener('storage', loadData);
    };
  }, [loadData]);

  // Calcolo Report Globale Squadra e Atleti
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

    let type: CopilotAlertContext['type'] = 'progression';
    if (customAlert?.category === 'pain') type = 'critical_note';
    else if (customAlert?.category === 'stagnation') type = 'plateau';

    setCopilotContext({
      athleteId,
      athleteName: athlete?.fullName || 'Atleta',
      workoutTitle: assign?.workout?.title || assign?.workout_title || 'Scheda Attiva',
      type,
      suggestion: customAlert?.summary,
      noteText: customAlert?.summary,
    });
    setIsCopilotOpen(true);
  };

  const handleAssignMultiple = (athleteIds: string[]) => {
    if (athleteIds.length > 0) {
      setSelectedAthleteId(athleteIds[0]);
      setActiveTab('schede');
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12 animate-in fade-in duration-200">
      {/* ─── HEADER PRINCIPALE SEZIONE ─── */}
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
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white hover:border-slate-700 transition-all cursor-pointer shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Aggiorna</span>
          </button>
        </div>
      </div>

      {/* ─── CONTENUTO PRINCIPALE (VISTA GENERALE O DETTAGLIO ATLETA) ─── */}
      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-400">Analisi avanzata e calcolo decisioni in corso...</p>
        </div>
      ) : selectedAthleteReport ? (
        /* VISTA DETTAGLIO ATLETA */
        <AthleteDetailReportView
          athleteReport={selectedAthleteReport}
          allAthletes={athletes}
          allReports={teamReportData.athletesReports}
          timeframe={timeframe}
          currentRangeLabel={teamReportData.currentRangeLabel}
          previousRangeLabel={teamReportData.previousRangeLabel}
          onTimeframeChange={setTimeframe}
          onSelectAthlete={handleSelectAthlete}
          onBackToOverview={handleBackToOverview}
          onNavigateToChat={handleNavigateToChat}
          onNavigateToWorkouts={handleNavigateToWorkouts}
          onOpenCopilot={(athleteId, athleteName, workoutTitle) =>
            handleOpenCopilotModal(athleteId, { athleteId, athleteName, workoutTitle })
          }
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

      {/* ─── MODALE COPILOT DECISIONALE ─── */}
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
            loadData();
          }}
        />
      )}
    </div>
  );
};
