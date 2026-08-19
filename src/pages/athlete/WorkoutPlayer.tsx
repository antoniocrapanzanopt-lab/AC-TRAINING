import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Check,
  Clock,
  ShieldAlert,
  Sparkles,
  WifiOff,
} from 'lucide-react';

import { WorkoutTemplate, WorkoutExercise } from '../../types/workout';
import { useWorkouts } from '../../context/WorkoutsContext';
import { useToast } from '../../context/ToastContext';
import { useMetrics } from '../../context/MetricsContext';
import { useAuth } from '../../context/AuthContext';
import { useAthletes } from '../../context/AthletesContext';
import { ExerciseCard } from '../../components/workouts/ExerciseCard';
import { InteractiveRestTimer } from '../../components/workouts/InteractiveRestTimer';
import { WorkoutCelebrationModal } from '../../components/workouts/WorkoutCelebrationModal';
import {
  fetchAthletePreviousExerciseHistory,
  PreviousExerciseHistory
} from '../../utils/workoutHistoryResolver';
import {
  saveActiveWorkoutDraft,
  getActiveWorkoutDraft,
  clearActiveWorkoutDraft,
  queueCompletedWorkoutForSync,
  syncPendingWorkoutsWithServer,
  ActiveWorkoutDraft,
  PendingCompletedWorkout,
} from '../../lib/offline/offlineWorkoutStorage';

interface WorkoutPlayerProps {
  workout: WorkoutTemplate;
  exercises: WorkoutExercise[];
  targetAthleteId?: string;
  onClose: () => void;
}

export const WorkoutPlayer: React.FC<WorkoutPlayerProps> = ({
  workout,
  exercises,
  targetAthleteId,
  onClose,
}) => {
  const { startWorkoutSession, endWorkoutSession, saveExerciseLogs } = useWorkouts();
  const { showSuccess } = useToast();
  const { checkAndUpdateAutoPR } = useMetrics();
  const { user } = useAuth();
  const { athletes } = useAthletes();

  // Atleta Corrente
  const currentAthlete = user
    ? athletes.find((a) => a.email && a.email.toLowerCase() === user.email.toLowerCase())
    : null;
  const athleteId = targetAthleteId || currentAthlete?.id || user?.athleteId || user?.id || 'ath-local';

  // Stato Connessione Realtime
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [lastSavedText, setLastSavedText] = useState<string>('Salvato');

  const [activeExerciseIdx, setActiveExerciseIdx] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [totalRestSeconds, setTotalRestSeconds] = useState<number>(90);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // LOGS: Dati immessi per ogni set
  const [logs, setLogs] = useState<Record<string, { reps: string; weight: string; rpe: string }[]>>({});
  // SERIE COMPLETATE: Tracciamento booleano per ogni esercizio/set
  const [completedSets, setCompletedSets] = useState<Record<string, boolean[]>>({});
  // NOTE FEEDBACK: Note dell'atleta per singolo esercizio
  const [exerciseNotes, setExerciseNotes] = useState<Record<string, string>>({});
  // STORICO SESSIONI PRECEDENTI (GHOST LOG)
  const [previousHistoryMap, setPreviousHistoryMap] = useState<Record<string, PreviousExerciseHistory>>({});

  // CELEBRATION SCREEN STATE
  const [celebrationData, setCelebrationData] = useState<{
    workoutTitle: string;
    durationMinutes: number;
    totalVolumeKg: number;
    completedSetsCount: number;
    totalSetsCount: number;
    newPRs: string[];
    earnedXP: number;
  } | null>(null);

  // Questionario Post-Allenamento State
  const [showQuestionnaireModal, setShowQuestionnaireModal] = useState(false);
  const [difficulty, setDifficulty] = useState<number>(3);
  const [jointPain, setJointPain] = useState<number>(1);
  const [pump, setPump] = useState<number>(3);
  const [jointPainNotes, setJointPainNotes] = useState<string>('');

  const startTimestampRef = useRef<number>(Date.now());
  const restEndTimestampRef = useRef<number | null>(null);
  const hasInitializedRef = useRef<boolean>(false);

  // ── 1. GESTIONE STATO ONLINE/OFFLINE & AUTO-SYNC ──
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      const res = await syncPendingWorkoutsWithServer();
      if (res.syncedCount > 0) {
        showSuccess('Sincronizzazione completata', `${res.syncedCount} allenamento/i offline sincronizzato/i col server.`);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showSuccess]);

  // ── 2. INIZIALIZZAZIONE & RECUPERO BOZZA LOCALE ANTI-PERDITA DATI ──
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    // Controlla se esiste una bozza locale per questo atleta e workout
    const savedDraft = getActiveWorkoutDraft(athleteId);

    if (savedDraft && (savedDraft.workout?.id === workout.id || savedDraft.workout?.title === workout.title)) {
      // Ripristina lo stato precedente
      setLogs(savedDraft.logs || {});
      setCompletedSets(savedDraft.completedSets || {});
      setExerciseNotes(savedDraft.exerciseNotes || {});
      setActiveExerciseIdx(savedDraft.activeExerciseIdx || 0);
      setSessionId(savedDraft.sessionId || null);

      if (savedDraft.startTimestamp) {
        startTimestampRef.current = savedDraft.startTimestamp;
        const diffSec = Math.floor((Date.now() - savedDraft.startTimestamp) / 1000);
        setElapsedTime(Math.max(savedDraft.elapsedSeconds || 0, diffSec));
      }

      setLastSavedText(`Ripristinato alle ${new Date(savedDraft.lastSavedTimestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`);
    } else {
      // Inizializza log vuoti per gli esercizi
      const initialLogs: Record<string, { reps: string; weight: string; rpe: string }[]> = {};
      exercises.forEach((ex) => {
        initialLogs[ex.id] = Array(ex.sets).fill({ reps: '', weight: '', rpe: '' });
      });
      setLogs(initialLogs);

      // Avvia la sessione reale su Supabase se online
      // Carica storico prestazioni precedenti (Ghost Log)
      if (athleteId && athleteId !== 'ath-local') {
        fetchAthletePreviousExerciseHistory(athleteId).then((history) => {
          setPreviousHistoryMap(history);
        });
      }

      if (!sessionId && navigator.onLine) {
        startWorkoutSession(workout.id, targetAthleteId).then((res) => {
          if (res.session) {
            setSessionId(res.session.id);
          }
        });
      }
    }
  }, [athleteId, workout, exercises, sessionId, startWorkoutSession, targetAthleteId]);

  // ── 3. AUTOSAVE LOCALE CONTINUO AD OGNI MODIFICA ──
  const triggerLocalAutosave = useCallback(
    (
      currentLogs: Record<string, { reps: string; weight: string; rpe: string }[]>,
      currentSets: Record<string, boolean[]>,
      currentNotes: Record<string, string>,
      curExIdx: number
    ) => {
      if (!athleteId) return;

      const draft: ActiveWorkoutDraft = {
        draftId: `draft-${athleteId}-${workout.id}`,
        sessionId,
        athleteId,
        workout,
        exercises,
        targetAthleteId,
        startTimestamp: startTimestampRef.current,
        lastSavedTimestamp: Date.now(),
        elapsedSeconds: elapsedTime,
        activeExerciseIdx: curExIdx,
        logs: currentLogs,
        completedSets: currentSets,
        exerciseNotes: currentNotes,
        difficulty,
        jointPain,
        pump,
        jointPainNotes,
        syncStatus: navigator.onLine ? 'local_saved' : 'pending_sync',
      };

      saveActiveWorkoutDraft(draft);
      const timeStr = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastSavedText(`Salvato alle ${timeStr}`);
    },
    [athleteId, workout, exercises, targetAthleteId, sessionId, elapsedTime, difficulty, jointPain, pump, jointPainNotes]
  );

  // Cronometro Allenamento Globale
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTimestampRef.current) / 1000));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning]);

  // Cronometro Recupero Tra Serie
  useEffect(() => {
    if (restTimer === null || restTimer <= 0) {
      restEndTimestampRef.current = null;
      return;
    }

    const updateTimer = () => {
      if (!restEndTimestampRef.current) return;
      const remaining = Math.max(0, Math.ceil((restEndTimestampRef.current - Date.now()) / 1000));
      setRestTimer(remaining > 0 ? remaining : null);
      if (remaining <= 0) {
        restEndTimestampRef.current = null;
      }
    };

    const interval = setInterval(updateTimer, 1000);
    const handleVisibilityOrFocus = () => {
      if (!document.hidden) {
        updateTimer();
        setElapsedTime(Math.floor((Date.now() - startTimestampRef.current) / 1000));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [restTimer]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleLogChange = (exerciseId: string, setIndex: number, field: 'reps' | 'weight' | 'rpe', value: string) => {
    setLogs((prev) => {
      const updatedSets = [...(prev[exerciseId] || [])];
      updatedSets[setIndex] = { ...updatedSets[setIndex], [field]: value };
      const nextLogs = { ...prev, [exerciseId]: updatedSets };
      triggerLocalAutosave(nextLogs, completedSets, exerciseNotes, activeExerciseIdx);
      return nextLogs;
    });
  };

  const handleToggleSetComplete = (exerciseId: string, setIdx: number, restSeconds: number) => {
    setCompletedSets((prev) => {
      const currentList = prev[exerciseId] ? [...prev[exerciseId]] : [];
      const isNowCompleted = !currentList[setIdx];
      currentList[setIdx] = isNowCompleted;

      if (isNowCompleted) {
        const safeRest = restSeconds > 0 ? restSeconds : 90;
        restEndTimestampRef.current = Date.now() + safeRest * 1000;
        setTotalRestSeconds(safeRest);
        setRestTimer(safeRest);
        if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
      }

      const nextSets = { ...prev, [exerciseId]: currentList };
      triggerLocalAutosave(logs, nextSets, exerciseNotes, activeExerciseIdx);
      return nextSets;
    });
  };

  const handleSkipRest = useCallback(() => {
    setRestTimer(null);
    restEndTimestampRef.current = null;
  }, []);

  const handleAddRestTime = useCallback((seconds: number) => {
    if (restEndTimestampRef.current) {
      const newEnd = restEndTimestampRef.current + seconds * 1000;
      restEndTimestampRef.current = newEnd;
      const remaining = Math.max(0, Math.ceil((newEnd - Date.now()) / 1000));
      setRestTimer(remaining);
      setTotalRestSeconds((prev) => Math.max(prev + seconds, remaining));
    }
  }, []);

  const handleNoteChange = (exerciseId: string, val: string) => {
    setExerciseNotes((prev) => {
      const nextNotes = { ...prev, [exerciseId]: val };
      triggerLocalAutosave(logs, completedSets, nextNotes, activeExerciseIdx);
      return nextNotes;
    });
  };

  const handleOpenFinishFlow = () => {
    setShowQuestionnaireModal(true);
  };

  // ── 4. SALVATAGGIO RESILIENTE CON FALLBACK OFFLINE ──
  const executeWorkoutSave = async () => {
    setIsTimerRunning(false);
    setIsSaving(true);
    setShowQuestionnaireModal(false);

    try {
      // 1. Assicura che esista una sessione valida su Supabase
      let effectiveSessionId = sessionId;
      if (!effectiveSessionId && navigator.onLine) {
        try {
          const startRes = await startWorkoutSession(workout.id, targetAthleteId);
          if (startRes.session?.id) {
            effectiveSessionId = startRes.session.id;
            setSessionId(effectiveSessionId);
          }
        } catch (e) {
          console.warn('Errore creazione sessione all\'uscita:', e);
        }
      }

      if (!effectiveSessionId) {
        effectiveSessionId = crypto.randomUUID ? crypto.randomUUID() : `sess-${Date.now()}`;
      }

      const logsToSave: any[] = [];
      const prResults: string[] = [];

      for (const ex of exercises) {
        const exLogs = logs[ex.id] || [];
        const userFeedback = exerciseNotes[ex.id]?.trim();
        const completedMap = completedSets[ex.id] || [];

        for (let idx = 0; idx < ex.sets; idx++) {
          const setLog = exLogs[idx] || { reps: '', weight: '', rpe: '' };
          const isCompleted = !!completedMap[idx];

          let repsNum = setLog.reps ? parseInt(setLog.reps, 10) : 0;
          let weightNum = setLog.weight ? parseFloat(setLog.weight) : 0;

          // Se la serie è stata spuntata/completata o ha note ma non sono stati digitati i numeri a mano
          if (isCompleted && repsNum === 0) {
            repsNum = parseInt(ex.reps_target, 10) || 10;
          }
          if (isCompleted && weightNum === 0 && ex.target_weight) {
            weightNum = parseFloat(ex.target_weight) || 0;
          }

          if (repsNum > 0 || weightNum > 0 || isCompleted || setLog.rpe || userFeedback) {
            const noteParts = [];
            if (setLog.rpe) noteParts.push(`RPE: ${setLog.rpe}`);
            if (userFeedback && idx === 0) noteParts.push(`Feedback: ${userFeedback}`);

            logsToSave.push({
              session_id: effectiveSessionId,
              exercise_id: ex.id,
              set_number: idx + 1,
              reps_completed: repsNum || 1,
              weight_kg: weightNum || 0,
              notes: noteParts.length > 0 ? noteParts.join(' | ') : null,
            });

            // Calcolo PR
            if (athleteId && weightNum > 0 && repsNum > 0 && navigator.onLine) {
              try {
                const prRes = await checkAndUpdateAutoPR(athleteId, ex.id, ex.name, weightNum, repsNum);
                if (prRes.isNewPR) {
                  prResults.push(`${ex.name}: ${prRes.calculated1RM} kg 1RM!`);
                }
              } catch (_) {}
            }
          }
        }
      }

      const questionnaireNotes = `Questionario: Fatica ${difficulty}/5, Dolore Articolare ${jointPain}/5, Pump ${pump}/5${
        jointPainNotes ? ` — Note: ${jointPainNotes}` : ''
      }`;
      const nowIso = new Date().toISOString();
      const startIso = new Date(startTimestampRef.current).toISOString();
      const weekNum = (exercises[0] as any)?.week_number || 1;
      const dayName = (exercises[0] as any)?.day_name || 'Giorno A';

      // Backup locale istantaneo dei log completati
      try {
        const localLogsMap = JSON.parse(localStorage.getItem('builder_completed_session_logs') || '{}');
        localLogsMap[effectiveSessionId] = logsToSave;
        localStorage.setItem('builder_completed_session_logs', JSON.stringify(localLogsMap));
      } catch (_) {}

      // SE OFFLINE: Salva in coda di sincronizzazione
      if (!navigator.onLine) {
        const pendingItem: PendingCompletedWorkout = {
          id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          sessionId: effectiveSessionId,
          athleteId,
          athleteName: currentAthlete ? `${currentAthlete.firstName} ${currentAthlete.lastName}` : user?.name || 'Atleta',
          workoutId: workout.id,
          workoutTitle: workout.title,
          weekNumber: weekNum,
          dayName,
          startTime: startIso,
          endTime: nowIso,
          durationMinutes: Math.max(1, Math.round(elapsedTime / 60)),
          rpe: difficulty * 2,
          notes: questionnaireNotes,
          difficulty,
          jointPain,
          pump,
          jointPainNotes,
          logsToSave,
          createdAt: Date.now(),
        };

        queueCompletedWorkoutForSync(pendingItem);
        clearActiveWorkoutDraft(athleteId);

        // Aggiorna progresso locale
        try {
          const progressKey = `builder_progress_${athleteId}_${workout.id}`;
          const existing = JSON.parse(localStorage.getItem(progressKey) || '{}');
          existing[`${weekNum}-${dayName}`] = true;
          localStorage.setItem(progressKey, JSON.stringify(existing));
        } catch (_) {}

        showSuccess(
          'Allenamento salvato sul dispositivo! 💾',
          'Sei offline: i dati sono al sicuro e verranno sincronizzati automaticamente col coach appena tornerà la connessione.'
        );

        setIsSaving(false);
        onClose();
        return;
      }

      // SE ONLINE: Procedi con il salvataggio normale su Supabase
      if (logsToSave.length > 0) {
        const { error: logsError } = await saveExerciseLogs(logsToSave);
        if (logsError) {
          console.warn(`Errore salvataggio esercizi: ${logsError}`);
        }
      }

      const { error: sessionError } = await endWorkoutSession(effectiveSessionId, questionnaireNotes, difficulty * 2);
      if (sessionError) {
        console.warn(`Errore chiusura sessione: ${sessionError}`);
      }

      // Alert questionario per il coach
      if (jointPain >= 3 || jointPainNotes.trim() !== '' || difficulty >= 4) {
        try {
          const existingAlerts = JSON.parse(localStorage.getItem('builder_copilot_critical_notes') || '[]');
          const isHighSeverity = jointPain >= 4 || /dolore|pizzico|infortunio|male|strappo/i.test(jointPainNotes);
          const questionnaireSummary = `Questionario Fine Workout — Fatica: ${difficulty}/5 | Dolori Articolari: ${jointPain}/5 | Pump: ${pump}/5${
            jointPainNotes.trim() ? ` | Dettagli: "${jointPainNotes.trim()}"` : ''
          }`;

          const questionnaireAlert = {
            id: `cn-q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            athleteId,
            athleteName: currentAthlete ? `${currentAthlete.firstName} ${currentAthlete.lastName}` : user?.name || 'Atleta',
            workoutTitle: workout.title,
            weekNumber: weekNum,
            dayName,
            exerciseName: 'Questionario Fine Workout',
            noteText: questionnaireSummary,
            severity: isHighSeverity ? 'high' : 'medium',
            date: 'Oggi',
          };
          localStorage.setItem('builder_copilot_critical_notes', JSON.stringify([questionnaireAlert, ...existingAlerts]));
          window.dispatchEvent(new Event('copilot_notes_updated'));
        } catch (_) {}
      }

      // Calcola Volume Totale Sollevato & Serie per la Celebration Screen
      let calculatedVolumeKg = 0;
      let completedSetsTotal = 0;
      let totalSetsPlanned = 0;

      exercises.forEach((ex) => {
        totalSetsPlanned += ex.sets;
        const exLogs = logs[ex.id] || [];
        const exSetsMap = completedSets[ex.id] || [];
        exLogs.forEach((l, sIdx) => {
          const r = parseInt(l.reps, 10) || 0;
          const w = parseFloat(l.weight) || 0;
          if (r > 0 && w > 0) {
            calculatedVolumeKg += r * w;
          }
          if (exSetsMap[sIdx] || (r > 0 && w > 0)) {
            completedSetsTotal++;
          }
        });
      });

      // Aggiorna progresso locale e rimuovi bozza attiva
      try {
        const progressKey = `builder_progress_${athleteId}_${workout.id}`;
        const existing = JSON.parse(localStorage.getItem(progressKey) || '{}');
        existing[`${weekNum}-${dayName}`] = true;
        localStorage.setItem(progressKey, JSON.stringify(existing));
      } catch (_) {}

      clearActiveWorkoutDraft(athleteId);
      setIsSaving(false);

      // Apri la Celebration Screen
      setCelebrationData({
        workoutTitle: workout.title,
        durationMinutes: Math.max(1, Math.round(elapsedTime / 60)),
        totalVolumeKg: Math.round(calculatedVolumeKg),
        completedSetsCount: completedSetsTotal,
        totalSetsCount: totalSetsPlanned,
        newPRs: prResults,
        earnedXP: 100 + (prResults.length * 50),
      });
    } catch (err: any) {
      console.warn('Errore salvataggio server, salvataggio in fallback offline:', err);

      // Calcola Volume Totale per fallback
      let calculatedVolumeKg = 0;
      let completedSetsTotal = 0;
      let totalSetsPlanned = 0;

      exercises.forEach((ex) => {
        totalSetsPlanned += ex.sets;
        const exLogs = logs[ex.id] || [];
        const exSetsMap = completedSets[ex.id] || [];
        exLogs.forEach((l, sIdx) => {
          const r = parseInt(l.reps, 10) || 0;
          const w = parseFloat(l.weight) || 0;
          if (r > 0 && w > 0) {
            calculatedVolumeKg += r * w;
          }
          if (exSetsMap[sIdx] || (r > 0 && w > 0)) {
            completedSetsTotal++;
          }
        });
      });

      // Fallback offline anche in caso di eccezione network
      const nowIso = new Date().toISOString();
      const startIso = new Date(startTimestampRef.current).toISOString();
      const weekNum = (exercises[0] as any)?.week_number || 1;
      const dayName = (exercises[0] as any)?.day_name || 'Giorno A';
      const questionnaireNotes = `Questionario: Fatica ${difficulty}/5, Dolore Articolare ${jointPain}/5, Pump ${pump}/5${
        jointPainNotes ? ` — Note: ${jointPainNotes}` : ''
      }`;

      const pendingItem: PendingCompletedWorkout = {
        id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sessionId,
        athleteId,
        athleteName: currentAthlete ? `${currentAthlete.firstName} ${currentAthlete.lastName}` : user?.name || 'Atleta',
        workoutId: workout.id,
        workoutTitle: workout.title,
        weekNumber: weekNum,
        dayName,
        startTime: startIso,
        endTime: nowIso,
        durationMinutes: Math.max(1, Math.round(elapsedTime / 60)),
        rpe: difficulty * 2,
        notes: questionnaireNotes,
        difficulty,
        jointPain,
        pump,
        jointPainNotes,
        logsToSave: [],
        createdAt: Date.now(),
      };

      queueCompletedWorkoutForSync(pendingItem);
      clearActiveWorkoutDraft(athleteId);
      setIsSaving(false);

      // Apri Celebration Screen
      setCelebrationData({
        workoutTitle: workout.title,
        durationMinutes: Math.max(1, Math.round(elapsedTime / 60)),
        totalVolumeKg: Math.round(calculatedVolumeKg),
        completedSetsCount: completedSetsTotal,
        totalSetsCount: totalSetsPlanned,
        newPRs: [],
        earnedXP: 100,
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-[var(--color-bg)] z-50 flex flex-col font-sans overflow-hidden">
      {/* ── HEADER LIVE CON STATO OFFLINE & SYNC DISCRETO ── */}
      <div className="bg-[var(--color-panel)]/90 backdrop-blur-xl border-b border-[var(--color-panel-border)]/60 p-3.5 sm:p-4 flex items-center justify-between shadow-lg relative z-20">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="p-2 -ml-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800/50 cursor-pointer"
            title="Chiudi sessione"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-bold text-white line-clamp-1 leading-tight">{workout.title}</h1>
            <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-primary)]">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTime(elapsedTime)}
              </span>

              {/* STATO SYNC / OFFLINE DISCRETO */}
              <span className="text-[10px] text-slate-400 font-sans flex items-center gap-1 border-l border-slate-800 pl-2">
                {isOnline ? (
                  <span className="flex items-center gap-1 text-emerald-400" title={lastSavedText}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="hidden sm:inline">{lastSavedText}</span>
                    <span className="sm:hidden">Salvato</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-400 font-bold">
                    <WifiOff className="w-3 h-3 text-amber-400" />
                    <span>Offline (Dati al sicuro)</span>
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenFinishFlow}
          disabled={isSaving}
          className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-black px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 shadow-md active:scale-95 transition-all disabled:opacity-50 cursor-pointer shrink-0"
        >
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
          ) : (
            <Check className="w-4 h-4 stroke-[3]" />
          )}
          <span>{isSaving ? 'Salvataggio...' : 'Fine'}</span>
        </button>
      </div>

      {/* REST TIMER PRO INTERATTIVO & SATINATO */}
      {restTimer !== null && restTimer >= 0 && (
        <InteractiveRestTimer
          remainingSeconds={restTimer}
          totalSeconds={totalRestSeconds}
          onSkip={handleSkipRest}
          onAddTime={handleAddRestTime}
        />
      )}

      {/* SCROLLABLE EXERCISES LIST */}
      <div className="flex-1 overflow-y-auto p-4 pb-32 space-y-4 bg-slate-950">
        {exercises.map((ex, idx) => {
          const isActive = idx === activeExerciseIdx;
          const isCompleted = idx < activeExerciseIdx;

          return (
            <React.Fragment key={ex.id}>
              <ExerciseCard
                exercise={ex}
                index={idx}
                isActive={isActive}
                isCompleted={isCompleted}
                logs={logs[ex.id] || []}
                completedSetsMap={completedSets[ex.id] || []}
                noteFeedback={exerciseNotes[ex.id] || ''}
                previousHistory={previousHistoryMap[ex.id] || previousHistoryMap[ex.name.toLowerCase().trim()]}
                onToggleActive={() => {
                  const nextIdx = isActive ? -1 : idx;
                  setActiveExerciseIdx(nextIdx);
                  triggerLocalAutosave(logs, completedSets, exerciseNotes, nextIdx);
                }}
                onLogChange={(setIdx, field, val) => handleLogChange(ex.id, setIdx, field, val)}
                onNoteFeedbackChange={(val) => handleNoteChange(ex.id, val)}
                onToggleSetComplete={(setIdx) => handleToggleSetComplete(ex.id, setIdx, ex.rest_seconds)}
              />
            </React.Fragment>
          );
        })}
      </div>

      {/* ── QUESTIONARIO POST-ALLENAMENTO MODAL ── */}
      {showQuestionnaireModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)] mx-auto shadow-md">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white">Com'è andato l'allenamento?</h3>
              <p className="text-xs text-slate-400">
                Aiuta il coach e l'IA a regolare i carichi e il recupero per la prossima sessione.
              </p>
            </div>

            {/* Fatica Percepita */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-300">Fatica complessiva (RPE):</span>
                <span className="text-[var(--color-primary)] font-mono">{difficulty} / 5</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setDifficulty(val)}
                    className={`py-2.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                      difficulty === val
                        ? 'bg-[var(--color-primary)] text-slate-950 border-[var(--color-primary)] shadow-md scale-105'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Dolori Articolari / Fastidi */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-300 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  Dolori o fastidi articolari:
                </span>
                <span className={`font-mono ${jointPain >= 3 ? 'text-rose-400' : 'text-slate-400'}`}>
                  {jointPain} / 5
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setJointPain(val)}
                    className={`py-2.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                      jointPain === val
                        ? val >= 3
                          ? 'bg-rose-500 text-white border-rose-400 shadow-md scale-105'
                          : 'bg-emerald-500 text-black border-emerald-400 shadow-md scale-105'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Dettaglio Dolore */}
            {jointPain >= 2 && (
              <div className="space-y-1 animate-in fade-in duration-150">
                <label className="text-[11px] font-bold text-rose-300 block">
                  Specifica dove hai sentito fastidio:
                </label>
                <input
                  type="text"
                  value={jointPainNotes}
                  onChange={(e) => setJointPainNotes(e.target.value)}
                  placeholder="Es: lombare su stacco, spalla destra su panca..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-rose-500/40 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-rose-400"
                />
              </div>
            )}

            {/* Pump Muscolare */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-300">Pump muscolare & attivazione:</span>
                <span className="text-sky-400 font-mono">{pump} / 5</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setPump(val)}
                    className={`py-2.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                      pump === val
                        ? 'bg-sky-500 text-black border-sky-400 shadow-md scale-105'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Pulsanti Azione Modale */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowQuestionnaireModal(false)}
                className="flex-1 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                Torna alla scheda
              </button>
              <button
                type="button"
                onClick={executeWorkoutSave}
                disabled={isSaving}
                className="flex-1 py-3 rounded-2xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-black font-black text-xs transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4 stroke-[3]" />
                )}
                <span>Salva ed Esci</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CELEBRATION SCREEN & CONDIVISIONE RISULTATO ── */}
      {celebrationData && (
        <WorkoutCelebrationModal
          workoutTitle={celebrationData.workoutTitle}
          durationMinutes={celebrationData.durationMinutes}
          totalVolumeKg={celebrationData.totalVolumeKg}
          completedSetsCount={celebrationData.completedSetsCount}
          totalSetsCount={celebrationData.totalSetsCount}
          newPRs={celebrationData.newPRs}
          earnedXP={celebrationData.earnedXP}
          athleteName={currentAthlete?.firstName || user?.name || 'Campione'}
          onClose={() => {
            setCelebrationData(null);
            onClose();
          }}
        />
      )}
    </div>
  );
};
