import React, { useState, useMemo, useEffect } from 'react';
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
  MessageCircle,
  Zap,
  FileText,
  Clock,
  Compass,
  FilePlus2,
  RotateCcw,
  Pencil,
  Loader2,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { isPainFeedback } from '../../../utils/painAnalysis';
import { useToast } from '../../../context/ToastContext';
import {
  CoachWorkoutSessionEditModal,
  EditableWorkoutSession,
} from './CoachWorkoutSessionEditModal';
import {
  TimeframeOption,
  AthleteReportSummary,
  Athlete,
} from '../../../types';
import { AthleteSelectDropdown } from './AthleteSelectDropdown';
import {
  AthleteWorkoutHistorySection,
  RawWorkoutSession,
  RawExerciseLogItem,
  ExerciseMeta,
} from './AthleteWorkoutHistorySection';
import { AthleteAdherenceBadge } from '../../../components/coach/AthleteAdherenceBadge';
import { fetchAthleteAdherenceData, AdherenceScoreResult } from '../../../services/adherenceService';

interface AthleteDetailReportViewProps {
  athleteReport: AthleteReportSummary;
  allAthletes: Athlete[];
  allReports?: AthleteReportSummary[];
  timeframe: TimeframeOption;
  currentRangeLabel: string;
  previousRangeLabel: string;
  sessions?: RawWorkoutSession[];
  logs?: RawExerciseLogItem[];
  exerciseMetaMap?: Map<string, ExerciseMeta>;
  onDataUpdated?: () => Promise<void> | void;
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
  allReports,
  timeframe,
  currentRangeLabel,
  previousRangeLabel,
  sessions = [],
  logs = [],
  exerciseMetaMap = new Map(),
  onDataUpdated = () => {},
  onTimeframeChange,
  onSelectAthlete,
  onBackToOverview,
  onNavigateToChat,
  onNavigateToWorkouts,
  onOpenCopilot,
}) => {
  const isUnassigned = athleteReport.programStatus === 'unassigned';

  const { showSuccess, showError } = useToast();
  const [adherenceData, setAdherenceData] = React.useState<AdherenceScoreResult | null>(null);
  const [editingSession, setEditingSession] = useState<EditableWorkoutSession | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [resolvingSessionId, setResolvingSessionId] = useState<string | null>(null);
  const [localResolvedMap, setLocalResolvedMap] = useState<Record<string, boolean>>({});

  React.useEffect(() => {
    if (!athleteReport.athleteId) return;
    let isMounted = true;
    fetchAthleteAdherenceData(athleteReport.athleteId).then((res) => {
      if (isMounted) setAdherenceData(res);
    });
    return () => { isMounted = false; };
  }, [athleteReport.athleteId]);

  const timeframeButtons: { id: TimeframeOption; label: string; short: string }[] = [
    { id: 'weekly', label: 'Settimanale', short: '7gg' },
    { id: 'monthly', label: 'Mensile', short: '30gg' },
    { id: 'bimonthly', label: 'Bimestrale', short: '2 mesi' },
    { id: 'six_months', label: 'Semestrale', short: '6 mesi' },
    { id: 'yearly', label: 'Annuale', short: '1 anno' },
  ];

  // 1. Dati per grafico evoluzione carichi per singolo esercizio selezionato
  type MetricMode = 'max' | 'avg' | 'reps' | 'volume';
  const [metricMode, setMetricMode] = useState<MetricMode>('max');

  // Identifica l'ID del workout attivo dell'atleta
  const activeWorkoutId = useMemo(() => {
    const athSessions = sessions.filter((s) => s.athlete_id === athleteReport.athleteId && s.workout_id);
    if (athSessions.length > 0) {
      return athSessions[0].workout_id;
    }
    return undefined;
  }, [sessions, athleteReport.athleteId]);

  // Catalogo Completo Esercizi (Scheda Attiva + Storico Log)
  const exerciseCatalog = useMemo(() => {
    const map = new Map<string, {
      name: string;
      isInActiveWorkout: boolean;
      dayName?: string;
      sessions: Array<{
        sessionId: string;
        date: string;
        dateFormatted: string;
        label: string;
        weekNum?: number;
        dayName?: string;
        avgWeightKg: number;
        maxWeightKg: number;
        maxReps: number;
        avgReps: number;
        totalVolumeKg: number;
        setsCount: number;
        setsSummary: string;
      }>;
    }>();

    const normKey = (str: string) => str.toLowerCase().trim().replace(/\s+/g, ' ');

    // 1. Inserisci prima di tutto TUTTI gli esercizi della scheda attiva da exerciseMetaMap
    exerciseMetaMap.forEach((meta) => {
      const isForActiveWorkout = activeWorkoutId ? meta.workout_id === activeWorkoutId : true;
      if (meta.name && meta.name.trim()) {
        const cleanName = meta.name.trim();
        const key = normKey(cleanName);
        if (!map.has(key)) {
          map.set(key, {
            name: cleanName,
            isInActiveWorkout: Boolean(isForActiveWorkout),
            dayName: meta.day_name,
            sessions: [],
          });
        } else if (isForActiveWorkout) {
          const entry = map.get(key)!;
          entry.isInActiveWorkout = true;
          if (meta.day_name && !entry.dayName) entry.dayName = meta.day_name;
        }
      }
    });

    // Inserisci anche gli esercizi chiave se non già presenti
    athleteReport.keyExercises.forEach((k) => {
      const cleanName = k.name.trim();
      const key = normKey(cleanName);
      if (!map.has(key)) {
        map.set(key, {
          name: cleanName,
          isInActiveWorkout: true,
          sessions: [],
        });
      }
    });

    // 2. Analizza tutte le sessioni svolte dell'atleta e popola le sedute per ogni esercizio
    const athleteSessions = sessions
      .filter((s) => s.athlete_id === athleteReport.athleteId && (s.end_time || s.start_time))
      .sort((a, b) => new Date(a.start_time || a.end_time || 0).getTime() - new Date(b.start_time || b.end_time || 0).getTime());

    athleteSessions.forEach((sess) => {
      const sessLogs = logs.filter((l) => l.session_id === sess.id);
      const sessExGroup = new Map<string, { displayName: string; sets: Array<{ setNum: number; reps: number; weightKg: number; rpe?: string }> }>();

      sessLogs.forEach((l) => {
        const meta = l.exercise_id ? exerciseMetaMap.get(l.exercise_id) : undefined;
        const exName = meta?.name || 'Esercizio';
        const cleanName = exName.trim();
        const key = normKey(cleanName);

        if (!sessExGroup.has(key)) {
          sessExGroup.set(key, { displayName: cleanName, sets: [] });
        }

        let extractedRpe: string | undefined = undefined;
        if (l.notes && l.notes.includes('RPE:')) {
          const match = l.notes.match(/RPE:\s*([\d.]+)/i);
          if (match) extractedRpe = match[1];
        }

        sessExGroup.get(key)!.sets.push({
          setNum: Number(l.set_number) || sessExGroup.get(key)!.sets.length + 1,
          reps: Number(l.reps_completed) || 0,
          weightKg: Number(l.weight_kg) || 0,
          rpe: extractedRpe,
        });
      });

      // Per ogni esercizio registrato in questa sessione
      sessExGroup.forEach(({ displayName, sets }, key) => {
        if (!map.has(key)) {
          map.set(key, {
            name: displayName,
            isInActiveWorkout: false,
            dayName: sess.day_name,
            sessions: [],
          });
        }

        const entry = map.get(key)!;
        const weights = sets.map((s) => s.weightKg);
        const reps = sets.map((s) => s.reps);
        const maxW = Math.max(...weights, 0);
        const avgW = weights.length > 0 ? Math.round((weights.reduce((a, b) => a + b, 0) / weights.length) * 10) / 10 : 0;
        const maxR = Math.max(...reps, 0);
        const avgR = reps.length > 0 ? Math.round((reps.reduce((a, b) => a + b, 0) / reps.length) * 10) / 10 : 0;
        const totalVol = sets.reduce((sum, s) => sum + s.reps * s.weightKg, 0);

        // Sintesi serie
        const sameWeight = weights.every((w) => w === weights[0]);
        const sameReps = reps.every((r) => r === reps[0]);
        let summary = '';
        if (maxW > 0) {
          if (sameWeight && sameReps) {
            summary = `${sets.length}x${reps[0]} @ ${weights[0]}kg`;
          } else {
            summary = `${sets.length} serie (Max ${maxW}kg)`;
          }
        } else {
          if (sameReps) {
            summary = `${sets.length}x${reps[0]} reps (Bodyweight)`;
          } else {
            summary = `${sets.length} serie (Max ${maxR} reps)`;
          }
        }

        const dt = new Date(sess.end_time || sess.start_time || Date.now());
        entry.sessions.push({
          sessionId: sess.id,
          date: sess.end_time || sess.start_time || '',
          dateFormatted: dt.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }),
          label: sess.week_number ? `W${sess.week_number}` : `S${entry.sessions.length + 1}`,
          weekNum: sess.week_number,
          dayName: sess.day_name,
          maxWeightKg: maxW,
          avgWeightKg: avgW,
          maxReps: maxR,
          avgReps: avgR,
          totalVolumeKg: totalVol,
          setsCount: sets.length,
          setsSummary: summary,
        });
      });
    });

    return map;
  }, [sessions, logs, exerciseMetaMap, athleteReport.athleteId, athleteReport.keyExercises, activeWorkoutId]);

  const activeWorkoutExercises = useMemo(() => {
    return Array.from(exerciseCatalog.values())
      .filter((e) => e.isInActiveWorkout)
      .sort((a, b) => {
        if (a.sessions.length > 0 && b.sessions.length === 0) return -1;
        if (a.sessions.length === 0 && b.sessions.length > 0) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [exerciseCatalog]);

  const historyOnlyExercises = useMemo(() => {
    return Array.from(exerciseCatalog.values())
      .filter((e) => !e.isInActiveWorkout)
      .sort((a, b) => b.sessions.length - a.sessions.length);
  }, [exerciseCatalog]);

  const allAvailableExercises = useMemo(() => {
    return [...activeWorkoutExercises, ...historyOnlyExercises];
  }, [activeWorkoutExercises, historyOnlyExercises]);

  const [selectedExerciseName, setSelectedExerciseName] = useState<string>('');

  useEffect(() => {
    if (allAvailableExercises.length > 0 && (!selectedExerciseName || !exerciseCatalog.has(selectedExerciseName))) {
      const firstWithData = allAvailableExercises.find((e) => e.sessions.length > 0);
      setSelectedExerciseName(firstWithData ? firstWithData.name : allAvailableExercises[0].name);
    }
  }, [allAvailableExercises, selectedExerciseName, exerciseCatalog]);

  const selectedExercise = useMemo(() => {
    if (!selectedExerciseName) return null;
    return exerciseCatalog.get(selectedExerciseName) || null;
  }, [selectedExerciseName, exerciseCatalog]);

  // Rileva se l'esercizio è principalmente bodyweight
  const isBodyweightExercise = useMemo(() => {
    if (!selectedExercise || selectedExercise.sessions.length === 0) return false;
    return selectedExercise.sessions.every((s) => s.maxWeightKg === 0);
  }, [selectedExercise]);

  // Dati attivi per il grafico in base a metricMode
  const activeExerciseChartData = useMemo(() => {
    if (!selectedExercise || selectedExercise.sessions.length === 0) {
      return [];
    }

    return selectedExercise.sessions.map((s, idx) => {
      let val = 0;
      let unit = 'kg';

      if (metricMode === 'max') {
        val = s.maxWeightKg > 0 ? s.maxWeightKg : s.maxReps;
        unit = s.maxWeightKg > 0 ? 'kg' : 'reps';
      } else if (metricMode === 'avg') {
        val = s.avgWeightKg > 0 ? s.avgWeightKg : s.avgReps;
        unit = s.avgWeightKg > 0 ? 'kg' : 'reps';
      } else if (metricMode === 'reps') {
        val = s.maxReps;
        unit = 'reps';
      } else if (metricMode === 'volume') {
        val = s.totalVolumeKg;
        unit = 'kg vol.';
      }

      return {
        label: s.label || `S${idx + 1}`,
        dateFormatted: s.dateFormatted,
        value: val,
        unit,
        summary: s.setsSummary,
        setsCount: s.setsCount,
        maxWeightKg: s.maxWeightKg,
        avgWeightKg: s.avgWeightKg,
        maxReps: s.maxReps,
        totalVolumeKg: s.totalVolumeKg,
      };
    });
  }, [selectedExercise, metricMode]);

  // 2. Matrice Rispetto Settimane di Allenamento
  const weeklyAdherenceMatrix = React.useMemo(() => {
    const totalWeeks = Math.max(athleteReport.totalWeeks || 4, 1);

    // Filtra e ordina cronologicamente le sessioni completate dell'atleta
    const athleteSessions = sessions
      .filter((s) => s.athlete_id === athleteReport.athleteId && s.end_time)
      .sort((a, b) => new Date(a.start_time || a.end_time || 0).getTime() - new Date(b.start_time || b.end_time || 0).getTime());

    // Calcola se ci sono settimane con un ritmo programmato più alto (es. schede a 4 o 5 giorni)
    const sessionsPerWeekCount = new Map<number, number>();
    athleteSessions.forEach((s) => {
      const w = s.week_number || 1;
      sessionsPerWeekCount.set(w, (sessionsPerWeekCount.get(w) || 0) + 1);
    });
    let maxWeekSessions = 0;
    sessionsPerWeekCount.forEach((c) => {
      if (c > maxWeekSessions) maxWeekSessions = c;
    });

    const targetSessionsPerWeek = Math.max(
      athleteReport.daysPerWeek && athleteReport.daysPerWeek > 0 ? athleteReport.daysPerWeek : 3,
      maxWeekSessions > 0 && maxWeekSessions <= 7 ? maxWeekSessions : 0
    );

    // Rileva se i week_number nel DB sono affidabili o se sono tutti appiattiti allo stesso valore (es. tutte week 1)
    const distinctDbWeeks = new Set(
      athleteSessions.map((s) => s.week_number).filter((w): w is number => typeof w === 'number' && w > 0)
    );
    const hasFlattenedWeeks = athleteSessions.length > targetSessionsPerWeek && distinctDbWeeks.size <= 1;

    // Mappa ciascuna sessione alla settimana coerente lungo il blocco
    const sessionWeekMap = new Map<string, number>();
    athleteSessions.forEach((sess, idx) => {
      let assignedWeek: number;
      if (!hasFlattenedWeeks && sess.week_number && sess.week_number >= 1 && sess.week_number <= totalWeeks) {
        assignedWeek = sess.week_number;
      } else {
        // Ripartizione cronologica naturale lungo le settimane del blocco
        assignedWeek = Math.min(totalWeeks, Math.floor(idx / targetSessionsPerWeek) + 1);
      }
      sessionWeekMap.set(sess.id, assignedWeek);
    });

    const list: Array<{
      weekNum: number;
      completedCount: number;
      targetCount: number;
      status: 'completed' | 'in_progress' | 'pending' | 'missed';
    }> = [];

    for (let w = 1; w <= totalWeeks; w++) {
      const weekSessions = athleteSessions.filter((s) => sessionWeekMap.get(s.id) === w);
      const rawCount = weekSessions.length;
      const completedCount = rawCount;

      let status: 'completed' | 'in_progress' | 'pending' | 'missed' = 'pending';

      if (w < athleteReport.currentWeek) {
        status = rawCount >= targetSessionsPerWeek ? 'completed' : rawCount > 0 ? 'in_progress' : 'missed';
      } else if (w === athleteReport.currentWeek) {
        status = rawCount >= targetSessionsPerWeek ? 'completed' : rawCount > 0 ? 'in_progress' : 'pending';
      } else {
        status = rawCount > 0 ? (rawCount >= targetSessionsPerWeek ? 'completed' : 'in_progress') : 'pending';
      }

      list.push({
        weekNum: w,
        completedCount,
        targetCount: targetSessionsPerWeek,
        status,
      });
    }

    return list;
  }, [athleteReport.totalWeeks, athleteReport.currentWeek, athleteReport.daysPerWeek, sessions, athleteReport.athleteId]);

  const weeklyBreakdown = weeklyAdherenceMatrix;

  // 3. Elenco Segnalazioni Dolori e Fastidi mirati
  const painList = useMemo(() => {
    const list: Array<{
      sessionId?: string;
      rawSession?: RawWorkoutSession;
      sessionTitle: string;
      dateFormatted: string;
      text: string;
      isResolved: boolean;
    }> = [];

    const athleteSessions = sessions
      .filter((s) => s.athlete_id === athleteReport.athleteId && s.end_time)
      .sort((a, b) => new Date(b.start_time || 0).getTime() - new Date(a.start_time || 0).getTime());

    athleteSessions.forEach((sess) => {
      const sessNotes = sess.notes || '';
      const sessionLogs = logs.filter((l) => l.session_id === sess.id);
      const painLogInSession = sessionLogs.find((l) => isPainFeedback(l.notes));

      const hasPainInNotes = isPainFeedback(sessNotes);
      const hasPain = hasPainInNotes || Boolean(painLogInSession);

      if (hasPain) {
        const dt = new Date(sess.end_time || sess.start_time || Date.now());
        const hasResolvedTag = sessNotes.includes('[RISOLTO');
        const isLocallyMarked = localResolvedMap[sess.id];
        const isResolved = isLocallyMarked !== undefined ? isLocallyMarked : hasResolvedTag;

        let displayNote = sessNotes;
        if (!hasPainInNotes && painLogInSession) {
          const exMeta = painLogInSession.exercise_id ? exerciseMetaMap.get(painLogInSession.exercise_id) : undefined;
          displayNote = `${exMeta?.name || 'Esercizio'}: "${painLogInSession.notes}"`;
        }

        list.push({
          sessionId: sess.id,
          rawSession: sess,
          sessionTitle: `${sess.day_name || 'Seduta'} (W${sess.week_number || 1})`,
          dateFormatted: dt.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }),
          text: displayNote,
          isResolved,
        });
      }
    });

    // Se presente sintesi generale ma lista vuota, aggiungi la sintesi
    if (list.length === 0 && athleteReport.painDetailsSummary) {
      list.push({
        sessionTitle: 'Segnalazione Questionario',
        dateFormatted: 'Recente',
        text: athleteReport.painDetailsSummary,
        isResolved: false,
      });
    }

    return list;
  }, [sessions, logs, exerciseMetaMap, athleteReport.athleteId, athleteReport.painDetailsSummary, localResolvedMap]);

  const unresolvedPainCount = painList.filter((p) => !p.isResolved).length;

  // Apertura modale correzione per la specifica seduta segnalata
  const handleOpenCorrectionForSession = (rawSession: RawWorkoutSession) => {
    const sessionLogs = logs.filter((l) => l.session_id === rawSession.id);
    const exMap = new Map<string, {
      exerciseId: string;
      name: string;
      sets: {
        logId?: string;
        setNumber: number;
        reps: number;
        weightKg: number;
        rpe?: string;
        notes?: string;
      }[];
    }>();

    sessionLogs.forEach((log) => {
      const meta = log.exercise_id ? exerciseMetaMap.get(log.exercise_id) : undefined;
      const exName = meta?.name || 'Esercizio';
      const exId = log.exercise_id || exName;
      if (!exMap.has(exId)) {
        exMap.set(exId, {
          exerciseId: log.exercise_id || '',
          name: exName,
          sets: [],
        });
      }
      const entry = exMap.get(exId)!;
      let extractedRpe: string | undefined = undefined;
      if (log.notes && log.notes.includes('RPE:')) {
        const match = log.notes.match(/RPE:\s*([\d.]+)/i);
        if (match) extractedRpe = match[1];
      }
      entry.sets.push({
        logId: log.id,
        setNumber: Number(log.set_number) || entry.sets.length + 1,
        reps: Number(log.reps_completed) || 0,
        weightKg: Number(log.weight_kg) || 0,
        rpe: extractedRpe,
        notes: log.notes,
      });
    });

    const exercises = Array.from(exMap.values()).map((item) => {
      item.sets.sort((a, b) => a.setNumber - b.setNumber);
      return {
        exerciseId: item.exerciseId,
        name: item.name,
        sets: item.sets,
      };
    });

    const dt = new Date(rawSession.start_time || rawSession.end_time || Date.now());
    const editable: EditableWorkoutSession = {
      id: rawSession.id,
      athleteId: rawSession.athlete_id,
      athleteName: athleteReport.athleteName,
      workoutId: rawSession.workout_id,
      workoutTitle: rawSession.workouts?.title || athleteReport.workoutTitle,
      dayName: rawSession.day_name || 'Seduta',
      weekNumber: rawSession.week_number || 1,
      startTime: rawSession.start_time,
      endTime: rawSession.end_time,
      dateFormatted: dt.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }),
      timeFormatted: dt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
      durationMinutes: rawSession.start_time && rawSession.end_time
        ? Math.max(1, Math.round((new Date(rawSession.end_time).getTime() - new Date(rawSession.start_time).getTime()) / 60000))
        : 60,
      rpe: rawSession.rpe,
      notes: rawSession.notes,
      exercises,
    };

    setEditingSession(editable);
    setIsEditModalOpen(true);
  };

  // Toggle Segna come Risolto / Riapri
  const handleToggleResolvePain = async (item: { sessionId?: string; text: string; isResolved: boolean }) => {
    if (!item.sessionId) {
      showError('Nessuna sessione specifica associata a questo messaggio.');
      return;
    }
    const nextResolved = !item.isResolved;
    setResolvingSessionId(item.sessionId);

    // Aggiornamento ottimistico
    setLocalResolvedMap((prev) => ({
      ...prev,
      [item.sessionId!]: nextResolved,
    }));

    try {
      let updatedNotes = item.text || '';
      if (nextResolved) {
        if (!updatedNotes.includes('[RISOLTO DAL COACH')) {
          const dateTag = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
          updatedNotes = updatedNotes.trim()
            ? `${updatedNotes}\n[RISOLTO DAL COACH — ${dateTag}]`
            : `[RISOLTO DAL COACH — ${dateTag}]`;
        }
      } else {
        updatedNotes = updatedNotes.replace(/\n?\[RISOLTO DAL COACH[^\]]*\]/gi, '').trim();
      }

      const { error } = await supabase
        .from('workout_sessions')
        .update({ notes: updatedNotes || null })
        .eq('id', item.sessionId);

      if (error) {
        throw error;
      }

      showSuccess(
        nextResolved
          ? 'Fastidio contrassegnato come risolto con successo!'
          : 'Segnalazione riaperta.'
      );

      if (onDataUpdated) {
        await onDataUpdated();
      }
    } catch (err: unknown) {
      console.error('Errore aggiornamento stato fastidio:', err);
      // Rollback
      setLocalResolvedMap((prev) => ({
        ...prev,
        [item.sessionId!]: item.isResolved,
      }));
      showError(err instanceof Error ? err.message : 'Impossibile aggiornare lo stato del fastidio.');
    } finally {
      setResolvingSessionId(null);
    }
  };

  const handleSessionSaved = async () => {
    if (onDataUpdated) {
      await onDataUpdated();
    }
  };

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

    const hasPreviousData = athleteReport.completedSessions.previous > 0 || athleteReport.totalVolumeKg.previous > 0;

    if (!hasPreviousData && athleteReport.completedSessions.current > 0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-amber-500/10 shadow-md">
          <Activity className="w-3.5 h-3.5 text-amber-400" />
          <span>Nuova Baseline Iniziale</span>
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

        {/* Switcher Veloce Atleta Custom */}
        <div className="flex items-center gap-2.5 self-stretch sm:self-auto">
          <span className="text-xs font-bold text-slate-400 hidden md:inline">Atleta:</span>
          <AthleteSelectDropdown
            athletes={allAthletes}
            selectedAthleteId={athleteReport.athleteId}
            onSelectAthlete={onSelectAthlete}
            athletesReports={allReports}
          />
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
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              <span>{btn.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── 3. HEADER ATLETA: NOME, SCHEDA, HEALTH SCORE, SINTESI ─── */}
      <div className="p-5 sm:p-7 rounded-3xl bg-slate-950/90 border border-slate-800 shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 flex items-center justify-center text-amber-300 font-black text-xl sm:text-2xl shadow-lg shrink-0">
              {athleteReport.avatarUrl ? (
                <img
                  src={athleteReport.avatarUrl}
                  alt={athleteReport.athleteName}
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                athleteReport.athleteName.substring(0, 2).toUpperCase()
              )}
            </div>
            <div className="space-y-1 min-w-0">
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
                      {athleteReport.blockProgressPercent === 0
                        ? `Settimana 1 di ${athleteReport.totalWeeks} (0% Blocco • In attesa di avvio)`
                        : `Settimana ${athleteReport.currentWeek} di ${athleteReport.totalWeeks} (${athleteReport.blockProgressPercent}% Blocco)`}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Official Adherence Score Card */}
          <div className="shrink-0 self-start md:self-auto">
            {adherenceData ? (
              <AthleteAdherenceBadge adherence={adherenceData} size="md" />
            ) : (
              <div className="flex items-center gap-4 bg-slate-950/80 p-3.5 px-5 rounded-2xl border border-slate-800">
                <div className="text-left">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                    Indice Aderenza
                  </span>
                  <span className="text-xs text-slate-500 font-medium">Ufficiale (28 gg)</span>
                </div>
                <div className="text-2xl font-black font-mono px-3.5 py-1 rounded-xl border border-slate-800 text-slate-400">
                  {isUnassigned ? '--/100' : '...'}
                </div>
              </div>
            )}
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
                {athleteReport.completedSessions.previous > 0 ? (
                  <span
                    className={`text-xs font-bold ${
                      athleteReport.attendance.deltaPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {athleteReport.attendance.deltaPercent >= 0 ? '+' : ''}
                    {athleteReport.attendance.deltaPercent}% vs prec.
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-slate-500">
                    Baseline
                  </span>
                )}
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
            {athleteReport.completedSessions.previous > 0 ? (
              <span
                className={`text-xs font-bold ${
                  athleteReport.avgRpe.deltaRaw <= 0 ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {athleteReport.avgRpe.deltaRaw > 0 ? `+${athleteReport.avgRpe.deltaRaw}` : athleteReport.avgRpe.deltaRaw} RPE
              </span>
            ) : (
              <span className="text-[11px] font-bold text-slate-500">
                Target RPE
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-900">
            <span>Dolori: {athleteReport.painReportsCount.current}</span>
            <span className="text-slate-500">Prec: {athleteReport.painReportsCount.previous}</span>
          </div>
        </div>

        {/* METRICA 3: RISPETTO PROGRAMMA & RITMO (SOSTITUISCE VOLUME TOTALE) */}
        <div className="p-5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ritmo & Costanza</span>
            <Calendar className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-white font-mono">
              {athleteReport.completedSessions.current}
            </span>
            <span className="text-xs font-bold text-emerald-400">
              Sedute Svolte
            </span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-900">
            <span>Stato: {athleteReport.singleDecisionType === 'inactivity' ? 'Ritardo rilevato' : 'Regolare'}</span>
            <span className="text-slate-500">Target: {athleteReport.totalWeeks * (athleteReport.daysPerWeek || 3)} tot</span>
          </div>
        </div>

        {/* METRICA 4: AVANZAMENTO BLOCCO */}
        <div className="p-5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avanzamento Blocco</span>
            <Activity className="w-4 h-4 text-purple-400" />
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

      {/* ─── 4. STRUMENTI DECISIONALI COACH: PROGRESSIONE ESERCIZI, RISPETTO SETTIMANE & DOLORI ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* PARTE 1: GRAFICA PROGRESSIONE CARICHI PER ESERCIZIO (STILE PESO CORPOREO) */}
        <div className="lg:col-span-7 p-5 sm:p-6 rounded-3xl bg-slate-950/90 border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            {/* Header Box con Selettore Esercizio Smart */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-[var(--color-primary)]">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-black text-white">Evoluzione Carico per Esercizio</h4>
                  <p className="text-xs text-slate-400">Progressione e storico di tutti gli esercizi svolti o in programma</p>
                </div>
              </div>

              {/* Selettore Esercizio Smart con Scheda Attiva + Storico */}
              {allAvailableExercises.length > 0 && (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedExerciseName}
                    onChange={(e) => setSelectedExerciseName(e.target.value)}
                    aria-label="Seleziona esercizio per visualizzare il grafico di progressione"
                    className="bg-slate-900 border border-slate-700 text-white text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-[var(--color-primary)] cursor-pointer max-w-[280px] truncate"
                  >
                    {activeWorkoutExercises.length > 0 && (
                      <optgroup label="⭐ IN SCHEDA ATTIVA">
                        {activeWorkoutExercises.map((ex) => {
                          const lastPt = ex.sessions[ex.sessions.length - 1];
                          const lastValStr = lastPt
                            ? lastPt.maxWeightKg > 0
                              ? `· ${lastPt.maxWeightKg} kg`
                              : `· ${lastPt.maxReps} reps`
                            : '· (In attesa)';
                          const dayPrefix = ex.dayName ? `[${ex.dayName}] ` : '';
                          return (
                            <option key={`active-${ex.name}`} value={ex.name}>
                              {dayPrefix}{ex.name} {lastValStr}
                            </option>
                          );
                        })}
                      </optgroup>
                    )}
                    {historyOnlyExercises.length > 0 && (
                      <optgroup label="📁 STORICO / ALTRE SCHEDE">
                        {historyOnlyExercises.map((ex) => (
                          <option key={`history-${ex.name}`} value={ex.name}>
                            {ex.name} ({ex.sessions.length} sedute)
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>
              )}
            </div>

            {/* Sub-Header: Badge Scheda + Toggle Modalità Metrica */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs">
              <div className="flex items-center gap-2">
                {selectedExercise?.isInActiveWorkout ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    ⭐ In Scheda Attiva {selectedExercise.dayName ? `• ${selectedExercise.dayName}` : ''}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
                    📁 Storico Allenamenti
                  </span>
                )}
                {isBodyweightExercise && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/30">
                    Corpo Libero
                  </span>
                )}
              </div>

              {/* Toggle Metriche (Top Set, Media, Reps, Volume) */}
              <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setMetricMode('max')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    metricMode === 'max'
                      ? 'bg-[var(--color-primary)] text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Carico massimo / Top set registrato nella seduta"
                >
                  Top Set
                </button>
                <button
                  type="button"
                  onClick={() => setMetricMode('avg')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    metricMode === 'avg'
                      ? 'bg-[var(--color-primary)] text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Media dei carichi delle serie allenanti"
                >
                  Media
                </button>
                <button
                  type="button"
                  onClick={() => setMetricMode('reps')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    metricMode === 'reps'
                      ? 'bg-[var(--color-primary)] text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Ripetizioni massime registrate"
                >
                  Reps
                </button>
                <button
                  type="button"
                  onClick={() => setMetricMode('volume')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    metricMode === 'volume'
                      ? 'bg-[var(--color-primary)] text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Volume totale (kg sollevati) nella seduta"
                >
                  Volume
                </button>
              </div>
            </div>

            {/* Grafico o Stato "In attesa" */}
            {activeExerciseChartData.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 my-4 space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-slate-800/80 mx-auto flex items-center justify-center text-slate-400">
                  <Dumbbell className="w-5 h-5" />
                </div>
                <div className="font-bold text-slate-300">
                  {selectedExercise?.isInActiveWorkout
                    ? `Esercizio in programma nella scheda corrente ${selectedExercise.dayName ? `(${selectedExercise.dayName})` : ''}`
                    : 'Nessun carico registrato per questo esercizio'}
                </div>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                  L'atleta non ha ancora registrato serie per questo esercizio. La progressione si traccerà automaticamente non appena verrà completata la prima seduta.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {/* 4 KPI Chiave Esercizio Selezionato */}
                {(() => {
                  const firstPt = activeExerciseChartData[0];
                  const lastPt = activeExerciseChartData[activeExerciseChartData.length - 1];
                  const allVals = activeExerciseChartData.map((d) => d.value);
                  const maxVal = Math.max(...allVals, 0);
                  const diff = lastPt.value - firstPt.value;
                  const percent = firstPt.value > 0 ? (diff / firstPt.value) * 100 : 0;
                  const unit = firstPt.unit;

                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                      <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Partenza</span>
                        <span className="text-sm font-black font-mono text-slate-300">
                          {firstPt.value} {unit}
                        </span>
                        <span className="text-[9px] text-slate-500 block font-mono">{firstPt.dateFormatted}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
                        <span className="text-[10px] text-amber-400 font-bold uppercase block">Record (PR)</span>
                        <span className="text-sm font-black font-mono text-amber-300">
                          {maxVal} {unit}
                        </span>
                        <span className="text-[9px] text-slate-500 block font-mono">Picco registrato</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Ultimo / Attuale</span>
                        <span className="text-sm font-black font-mono text-[var(--color-primary)]">
                          {lastPt.value} {unit}
                        </span>
                        <span className="text-[9px] text-slate-500 block font-mono">{lastPt.dateFormatted}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Progressione</span>
                        <span className={`text-sm font-black font-mono ${diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {diff >= 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)} {unit}
                        </span>
                        <span className={`text-[9px] font-bold block ${percent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {percent >= 0 ? `+${percent.toFixed(0)}%` : `${percent.toFixed(0)}%`}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Grafico SVG a Linea Pulito Stile Monitoraggio Peso */}
                <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 border-b border-slate-800/60 pb-1.5 font-mono">
                    <span className="font-bold text-slate-300">
                      Trend Sedute ({activeExerciseChartData.length} registrazioni)
                    </span>
                    <span className="text-amber-400 font-bold">
                      ● {metricMode === 'max' ? 'Carico Top Set' : metricMode === 'avg' ? 'Carico Medio' : metricMode === 'reps' ? 'Ripetizioni' : 'Volume Seduta'}
                    </span>
                  </div>

                  {/* SVG Canvas Linea + Punti */}
                  <div className="relative h-44 w-full flex items-end">
                    {/* SVG Line / Spline */}
                    {activeExerciseChartData.length > 1 ? (
                      <svg className="w-full h-full overflow-visible" viewBox="0 0 500 130" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="exerciseAreaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        {(() => {
                          const minV = Math.min(...activeExerciseChartData.map((d) => d.value));
                          const maxV = Math.max(...activeExerciseChartData.map((d) => d.value));
                          const range = maxV - minV || 1;
                          const padX = 30;
                          const padY = 20;
                          const stepX = (500 - padX * 2) / (activeExerciseChartData.length - 1);

                          const pts = activeExerciseChartData.map((d, i) => {
                            const x = padX + i * stepX;
                            const norm = (d.value - minV) / range;
                            const y = 130 - padY - norm * (130 - padY * 2);
                            return { x, y };
                          });

                          const lineD = pts.reduce((acc, p, i) => i === 0 ? `M ${p.x},${p.y}` : `${acc} L ${p.x},${p.y}`, '');
                          const areaD = `${lineD} L ${pts[pts.length - 1].x},125 L ${pts[0].x},125 Z`;

                          return (
                            <>
                              <path d={areaD} fill="url(#exerciseAreaGrad)" />
                              <path d={lineD} fill="none" stroke="var(--color-primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                            </>
                          );
                        })()}
                      </svg>
                    ) : null}

                    {/* Overlay Punti Interattivi su flex */}
                    <div className="absolute inset-0 flex items-end justify-between px-6 pb-2">
                      {activeExerciseChartData.map((pt, idx) => {
                        const minV = Math.min(...activeExerciseChartData.map((d) => d.value));
                        const maxV = Math.max(...activeExerciseChartData.map((d) => d.value));
                        const range = maxV - minV || 1;
                        const heightPercent = activeExerciseChartData.length === 1
                          ? 60
                          : Math.max(20, Math.min(90, ((pt.value - minV) / range) * 70 + 20));

                        return (
                          <div
                            key={idx}
                            className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                          >
                            {/* Rich Tooltip on hover */}
                            <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 absolute -top-16 bg-slate-950 border border-slate-700 p-2 rounded-xl text-center shadow-2xl pointer-events-none z-30 whitespace-nowrap">
                              <div className="text-[10px] font-bold text-amber-300">
                                {pt.label} • {pt.dateFormatted}
                              </div>
                              <div className="text-xs font-black text-white font-mono">
                                {pt.value} {pt.unit}
                              </div>
                              {pt.summary && (
                                <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                                  {pt.summary}
                                </div>
                              )}
                            </div>

                            {/* Valore Punto */}
                            <span className="text-[10px] font-mono font-black text-amber-300 mb-1 group-hover:scale-110 transition-transform">
                              {pt.value}{pt.unit === 'kg' ? 'k' : ''}
                            </span>

                            {/* Punto Cerchio Dorato */}
                            <div
                              className="w-3.5 h-3.5 rounded-full bg-[var(--color-primary)] border-2 border-slate-950 shadow-md group-hover:scale-125 transition-transform"
                              style={{ marginBottom: `${heightPercent}%` }}
                            />

                            {/* Etichetta Settimana / Seduta */}
                            <span className="text-[9px] font-mono text-slate-500 truncate w-full text-center">
                              {pt.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* PARTE 2: RISPETTO SETTIMANE DI ALLENAMENTO + SEGNALAZIONI DOLORI & FASTIDI */}
        <div className="lg:col-span-5 space-y-6 flex flex-col justify-between">
          {/* A. RISPETTO DELLE SETTIMANE DI ALLENAMENTO */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-950/90 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">Rispetto Settimane di Allenamento</h4>
                  <p className="text-xs text-slate-400">Presenze e sedute svolte blocco per blocco</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
                {athleteReport.totalWeeks} Settimane
              </span>
            </div>

            {/* Matrice Settimanale Visuale */}
            <div className="space-y-2.5">
              {weeklyBreakdown.map((w) => (
                <div
                  key={w.weekNum}
                  className={`p-3 rounded-2xl border flex items-center justify-between text-xs transition-all ${
                    w.status === 'completed'
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                      : w.status === 'in_progress'
                      ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                      : w.status === 'missed'
                      ? 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                      : 'bg-slate-900/40 border-slate-800/70 text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-slate-900 flex items-center justify-center font-mono font-bold text-[11px] text-white">
                      W{w.weekNum}
                    </span>
                    <span className="font-bold text-white">Settimana {w.weekNum}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold flex items-center gap-1.5">
                      <span>{w.completedCount}/{w.targetCount} sedute</span>
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                      w.status === 'completed'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : w.status === 'in_progress'
                        ? 'bg-amber-500/20 text-amber-300'
                        : w.status === 'missed'
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {w.status === 'completed'
                        ? 'Completata'
                        : w.status === 'in_progress'
                        ? 'In corso'
                        : w.status === 'missed'
                        ? 'Incompleta'
                        : 'Da svolgere'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* B. SEGNALAZIONI EVENTUALI DOLORI E FASTIDI */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-950/90 border border-slate-800 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <ShieldAlert className={`w-4 h-4 ${unresolvedPainCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`} />
                <h4 className="text-sm font-black text-white">Segnalazioni Dolori & Fastidi</h4>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                unresolvedPainCount > 0
                  ? 'bg-rose-500/10 text-rose-300 border-rose-500/30 animate-pulse'
                  : painList.length > 0
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              }`}>
                {unresolvedPainCount > 0
                  ? `${unresolvedPainCount} Da Risolvere`
                  : painList.length > 0
                  ? 'Tutti Risolti ✓'
                  : 'Nessun Dolore'}
              </span>
            </div>

            {painList.length === 0 ? (
              <div className="p-3.5 rounded-2xl bg-emerald-950/15 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-medium">L'atleta non ha registrato alcun dolore articolare o fastidio nelle note/questionari.</span>
              </div>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {painList.map((item, pIdx) => {
                  const isResolving = item.sessionId === resolvingSessionId;
                  return (
                    <div
                      key={item.sessionId || pIdx}
                      className={`p-3.5 rounded-2xl border text-xs transition-all space-y-2.5 ${
                        item.isResolved
                          ? 'bg-emerald-950/15 border-emerald-500/30 text-emerald-100 opacity-90'
                          : 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {item.isResolved ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          )}
                          <span className={`font-bold truncate ${item.isResolved ? 'text-emerald-300' : 'text-rose-300'}`}>
                            {item.sessionTitle || 'Seduta'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-slate-400 font-mono">{item.dateFormatted}</span>
                          {item.isResolved ? (
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              Risolto ✓
                            </span>
                          ) : (
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40">
                              Attivo
                            </span>
                          )}
                        </div>
                      </div>

                      <p className={`text-[11px] leading-snug pl-6 ${item.isResolved ? 'text-emerald-200/80 line-through decoration-emerald-500/60' : 'text-rose-100/90'}`}>
                        "{item.text.replace(/\n?\[RISOLTO DAL COACH[^\]]*\]/gi, '').trim()}"
                      </p>

                      {/* BARRA AZIONI OPERATIVE RAPIDE */}
                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800/60 pl-6 flex-wrap">
                        {/* 1. Applica correzioni alla seduta */}
                        {item.rawSession && (
                          <button
                            type="button"
                            onClick={() => handleOpenCorrectionForSession(item.rawSession!)}
                            className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-sm"
                            title="Modifica carichi, serie o correggi le note per questa seduta"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Correggi Seduta</span>
                          </button>
                        )}

                        {/* 2. Modifica la scheda dell'atleta */}
                        <button
                          type="button"
                          onClick={() => onNavigateToWorkouts(athleteReport.athleteId)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                          title="Apri la scheda per sostituire o rimuovere l'esercizio che crea dolore"
                        >
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          <span>Modifica Scheda</span>
                        </button>

                        {/* 3. Segna come Risolto / Riapri */}
                        {item.sessionId && (
                          <button
                            type="button"
                            disabled={isResolving}
                            onClick={() => handleToggleResolvePain(item)}
                            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50 ${
                              item.isResolved
                                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                                : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 shadow-sm'
                            }`}
                          >
                            {isResolving ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : item.isResolved ? (
                              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            )}
                            <span>{item.isResolved ? 'Riapri' : 'Segna come Risolto'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── 5. EVENTI RILEVANTI & INTERVENTI COPILOT NEL PERIODO ─── */}
      {athleteReport.recentEvents.length > 0 && (
        <div className="p-5 sm:p-6 rounded-3xl bg-slate-950/90 border border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm sm:text-base font-black text-white">Eventi Rilevanti & Segnalazioni</h4>
            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
              {athleteReport.recentEvents.length} Eventi
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {athleteReport.recentEvents.map((ev) => (
              <div
                key={ev.id}
                className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-3 text-xs"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                  {ev.type === 'pain' ? <ShieldAlert className="w-4 h-4 text-rose-400" /> : <Sparkles className="w-4 h-4" />}
                </div>
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h5 className="font-bold text-white truncate">{ev.title}</h5>
                    <span className="text-[10px] text-slate-500 font-mono shrink-0">{ev.dateFormatted}</span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed line-clamp-2">{ev.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── 6. CRONOLOGIA ALLENAMENTI & ADOZIONE CORREZIONI COACH ─── */}
      <AthleteWorkoutHistorySection
        athleteId={athleteReport.athleteId}
        athleteName={athleteReport.athleteName}
        activeWorkoutTitle={athleteReport.workoutTitle}
        sessions={sessions}
        logs={logs}
        exerciseMetaMap={exerciseMetaMap}
        onDataUpdated={onDataUpdated}
        onNavigateToWorkouts={onNavigateToWorkouts}
        onNavigateToChat={onNavigateToChat}
        onOpenCopilot={(aId) => {
          onOpenCopilot(
            aId,
            athleteReport.athleteName,
            athleteReport.workoutTitle
          );
        }}
      />

      {/* ─── 7. DIREZIONE CONSIGLIATA ("COME PROSEGUIRE") & AZIONI OPERATIVE RAPIDE ─── */}
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
      {/* MODALE DIRETTO PER LA CORREZIONE DELLA SEDUTA APERTO DALLE SEGNALAZIONI DOLORI */}
      {isEditModalOpen && editingSession && (
        <CoachWorkoutSessionEditModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingSession(null);
          }}
          session={editingSession}
          athleteName={athleteReport.athleteName}
          onSessionSaved={handleSessionSaved}
        />
      )}
    </div>
  );
};
