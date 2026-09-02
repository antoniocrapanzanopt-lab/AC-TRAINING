import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  X,
  Check,
  Clock,
  ShieldAlert,
  Sparkles,
  WifiOff,
  Info,
  Plus,
  Trash2,
  Play,
  Pause,
  RotateCcw,
  Eye,
} from 'lucide-react';

import { WorkoutTemplate, WorkoutExercise, ExerciseLog } from '../../types/workout';
import { useWorkouts } from '../../context/WorkoutsContext';
import { useToast } from '../../context/ToastContext';
import { useMetrics } from '../../context/MetricsContext';
import { useAuth } from '../../context/AuthContext';
import { useAthletes } from '../../context/AthletesContext';
import { ExerciseCard } from '../../components/workouts/ExerciseCard';
import { ExerciseExecutionModal } from '../../components/workouts/ExerciseExecutionModal';
import { InteractiveRestTimer } from '../../components/workouts/InteractiveRestTimer';
import { WorkoutCelebrationModal } from '../../components/workouts/WorkoutCelebrationModal';
import { SkipWorkoutModal } from '../../components/workouts/SkipWorkoutModal';
import {
  fetchAthletePreviousExerciseHistory,
  PreviousExerciseHistory
} from '../../utils/workoutHistoryResolver';
import {
  initOrResumeAudioContext,
  playRestCompleteTone,
  isRestAudioEnabled,
} from '../../utils/soundEffects';
import {
  requestWorkoutWakeLock,
  releaseWorkoutWakeLock,
  updateLockScreenTimer,
  notifyRestCompleteOnLockScreen,
  stopLockScreenTimer,
  isWakeLockSupported,
} from '../../services/workoutDisplayAndLockService';
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
  targetWeekNumber?: number;
  onClose: () => void;
}

export const WorkoutPlayer: React.FC<WorkoutPlayerProps> = ({
  workout,
  exercises,
  targetAthleteId,
  targetWeekNumber,
  onClose,
}) => {
  const { startWorkoutSession, endWorkoutSession, saveExerciseLogs } = useWorkouts();
  const { showSuccess, showError } = useToast();
  const { checkAndUpdateAutoPR } = useMetrics();
  const { user } = useAuth();
  const { athletes } = useAthletes();

  // Atleta Corrente
  const currentAthlete = user
    ? athletes.find((a) => a.email && a.email.toLowerCase() === user.email.toLowerCase())
    : null;

  // Precedenza assoluta al targetAthleteId (es. assegnato dal Coach)
  // Per evitare fallback errati al profilo del coach (che corrompe i log).
  const athleteId = targetAthleteId || (user?.role === 'athlete' ? (user?.athleteId || user?.id) : null) || currentAthlete?.id || 'ath-local';

  const totalWeeks = workout?.total_weeks || 1;
  const currentWeekNumber = useMemo(() => {
    const candidate = targetWeekNumber || exercises?.[0]?.week_number || 1;
    const maxW = totalWeeks > 0 ? totalWeeks : 1;
    return Math.min(maxW, Math.max(1, candidate));
  }, [targetWeekNumber, exercises, totalWeeks]);

  // Sanitizzazione di sicurezza: una sessione di allenamento appartiene a 1 solo Giorno e 1 sola Settimana
  const activeExercises = useMemo(() => {
    if (!exercises || exercises.length === 0) return [];

    const targetDay = (exercises[0].day_name || 'Giorno A').trim().toLowerCase();

    const singleDayExercises = exercises.filter((ex) => {
      const exDay = (ex.day_name || 'Giorno A').trim().toLowerCase();
      return exDay === targetDay;
    });

    const list = singleDayExercises.length > 0 ? singleDayExercises : exercises;
    return list.map((ex) => ({
      ...ex,
      week_number: currentWeekNumber,
    }));
  }, [exercises, currentWeekNumber]);

  const currentDayName = useMemo(() => {
    return activeExercises?.[0]?.day_name || 'Giorno A';
  }, [activeExercises]);

  // Stato Connessione Realtime
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [lastSavedText, setLastSavedText] = useState<string>('Salvato');

  const [activeExerciseModalIndex, setActiveExerciseModalIndex] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isWorkoutStarted, setIsWorkoutStarted] = useState(false);
  const [isSkipModalOpen, setIsSkipModalOpen] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [totalRestSeconds, setTotalRestSeconds] = useState<number>(90);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // LOGS: Dati immessi per ogni set
  const [logs, setLogs] = useState<Record<string, { reps: string; weight: string; rpe: string }[]>>({});
  // SERIE COMPLETATE: Tracciamento booleano per ogni esercizio/set
  const [completedSets, setCompletedSets] = useState<Record<string, boolean[]>>({});

  // Individua l'indice dell'esercizio attivo corrente (il primo non ancora completato)
  const currentActiveExerciseIndex = useMemo(() => {
    const firstUnfinished = activeExercises.findIndex((ex) => {
      const isDone = Boolean(completedSets[ex.id]?.length === ex.sets && completedSets[ex.id].every(Boolean));
      return !isDone;
    });
    return firstUnfinished !== -1 ? firstUnfinished : 0;
  }, [activeExercises, completedSets]);

  // Stato Screen Wake Lock (Display sempre attivo)
  const [isWakeLockActive, setIsWakeLockActive] = useState<boolean>(false);

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
  const [painReports, setPainReports] = useState<Array<{ id: string; exercise: string; bodyPart: string }>>([
    { id: 'pain-1', exercise: '', bodyPart: '' },
  ]);

  const handleAddPainReport = () => {
    setPainReports((prev) => [
      ...prev,
      { id: `pain-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, exercise: '', bodyPart: '' },
    ]);
  };

  const handleRemovePainReport = (id: string) => {
    setPainReports((prev) => (prev.length > 1 ? prev.filter((p) => p.id !== id) : prev));
  };

  const handleUpdatePainReport = (id: string, field: 'exercise' | 'bodyPart', value: string) => {
    setPainReports((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const startTimestampRef = useRef<number>(Date.now());
  const restEndTimestampRef = useRef<number | null>(null);
  const hasInitializedRef = useRef<boolean>(false);
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Snapshot per autosave continuo senza causare re-render a catena
  const draftStateRef = useRef({
    logs,
    completedSets,
    exerciseNotes,
    elapsedTime,
    sessionId,
    difficulty,
    jointPain,
    pump,
    painReports,
  });

  useEffect(() => {
    draftStateRef.current = {
      logs,
      completedSets,
      exerciseNotes,
      elapsedTime,
      sessionId,
      difficulty,
      jointPain,
      pump,
      painReports,
    };
  }, [logs, completedSets, exerciseNotes, elapsedTime, sessionId, difficulty, jointPain, pump, painReports]);

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
    const hasAnyCompletedSet = savedDraft?.completedSets && Object.values(savedDraft.completedSets).some((arr) => arr.some(Boolean));

    if (savedDraft && (savedDraft.workout?.id === workout.id || savedDraft.workout?.title === workout.title) && (hasAnyCompletedSet || (savedDraft.elapsedSeconds && savedDraft.elapsedSeconds > 0))) {
      // Ripristina lo stato precedente solo se era un allenamento effettivamente iniziato
      setLogs(savedDraft.logs || {});
      setCompletedSets(savedDraft.completedSets || {});
      setExerciseNotes(savedDraft.exerciseNotes || {});
      setSessionId(savedDraft.sessionId || null);

      if (savedDraft.startTimestamp) {
        startTimestampRef.current = savedDraft.startTimestamp;
        const diffSec = Math.floor((Date.now() - savedDraft.startTimestamp) / 1000);
        const currentElapsed = Math.max(savedDraft.elapsedSeconds || 0, diffSec);
        setElapsedTime(currentElapsed);
        if (currentElapsed > 0 || hasAnyCompletedSet) {
          setIsWorkoutStarted(true);
          setIsTimerRunning(true);
        }
      }

      setLastSavedText(`Ripristinato alle ${new Date(savedDraft.lastSavedTimestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`);
    } else {
      // Inizializza in MODALITÀ CONSULTAZIONE / ANTEPRIMA (Timer fermo, nessuna sessione avviata)
      const initialLogs: Record<string, { reps: string; weight: string; rpe: string }[]> = {};
      activeExercises.forEach((ex) => {
        initialLogs[ex.id] = Array(ex.sets).fill({ reps: '', weight: '', rpe: '' });
      });
      setLogs(initialLogs);
      setIsWorkoutStarted(false);
      setIsTimerRunning(false);
      setElapsedTime(0);

      // Carica storico prestazioni precedenti (Ghost Log)
      if (athleteId && athleteId !== 'ath-local') {
        fetchAthletePreviousExerciseHistory(athleteId).then((history) => {
          setPreviousHistoryMap(history);
        });
      }
    }
  }, [athleteId, workout, activeExercises]);

  // Carica SEMPRE lo storico delle prestazioni precedenti dell'atleta (Ghost Log)
  useEffect(() => {
    if (athleteId && athleteId !== 'ath-local') {
      fetchAthletePreviousExerciseHistory(athleteId).then((history) => {
        setPreviousHistoryMap(history);
      });
    }
  }, [athleteId]);

  // ── 3. AUTOSAVE LOCALE DEBOUNCED ANTI-FREEZE ──
  const flushAutosave = useCallback(() => {
    if (!athleteId) return;
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
      autosaveTimeoutRef.current = null;
    }
    const current = draftStateRef.current;
    const hasAnyCompletedSet = Object.values(current.completedSets || {}).some((arr) => arr.some(Boolean));

    // Se l'allenamento non è stato avviato e non ci sono serie fatte, cancella la bozza
    if (!isWorkoutStarted && !hasAnyCompletedSet && current.elapsedTime === 0) {
      clearActiveWorkoutDraft(athleteId);
      window.dispatchEvent(new Event('athlete_draft_updated'));
      return;
    }

    const draft: ActiveWorkoutDraft = {
      draftId: `draft-${athleteId}-${workout.id}`,
      sessionId: current.sessionId,
      athleteId,
      workout,
      exercises: activeExercises,
      targetAthleteId,
      startTimestamp: startTimestampRef.current,
      lastSavedTimestamp: Date.now(),
      elapsedSeconds: current.elapsedTime,
      activeExerciseIdx: 0,
      logs: current.logs,
      completedSets: current.completedSets,
      exerciseNotes: current.exerciseNotes,
      difficulty: current.difficulty,
      jointPain: current.jointPain,
      pump: current.pump,
      jointPainNotes: current.painReports ? current.painReports.map(p => `${p.exercise}: ${p.bodyPart}`).join(', ') : '',
      syncStatus: navigator.onLine ? 'local_saved' : 'pending_sync',
    };

    saveActiveWorkoutDraft(draft);
    window.dispatchEvent(new Event('athlete_draft_updated'));
    const timeStr = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    setLastSavedText(`Salvato alle ${timeStr}`);
  }, [athleteId, workout, activeExercises, targetAthleteId, isWorkoutStarted]);

  const scheduleAutosave = useCallback((immediate = false) => {
    if (immediate) {
      flushAutosave();
    } else {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
      autosaveTimeoutRef.current = setTimeout(() => {
        flushAutosave();
      }, 600);
    }
  }, [flushAutosave]);

  useEffect(() => {
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, []);

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

  const handleSkipRest = useCallback(() => {
    setRestTimer(null);
    restEndTimestampRef.current = null;
    stopLockScreenTimer();
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

  // Cronometro Recupero Tra Serie & Sincronizzazione con la Lock Screen
  useEffect(() => {
    const checkTimer = () => {
      if (!restEndTimestampRef.current) {
        setRestTimer((prev) => (prev !== null ? null : prev));
        return;
      }
      const remaining = Math.max(0, Math.ceil((restEndTimestampRef.current - Date.now()) / 1000));
      if (remaining > 0) {
        setRestTimer(remaining);

        // Aggiorna in tempo reale la schermata di blocco dello smartphone
        const currentEx = activeExercises[currentActiveExerciseIndex];
        const currentSetNum = (completedSets[currentEx?.id]?.filter(Boolean).length || 0) + 1;
        updateLockScreenTimer({
          remainingSeconds: remaining,
          totalSeconds: totalRestSeconds,
          exerciseName: currentEx?.name || 'Recupero Esercizio',
          setNumber: currentSetNum,
          totalSets: currentEx?.sets || 3,
          workoutTitle: workout?.title || 'AC Training Session',
          onSkipRest: handleSkipRest,
          onAddRestTime: handleAddRestTime,
        });
      } else {
        restEndTimestampRef.current = null;
        setRestTimer(null);

        // Notifica visiva in lock screen + suoni e vibrazione
        notifyRestCompleteOnLockScreen(activeExercises[currentActiveExerciseIndex]?.name);
        if (isRestAudioEnabled()) {
          playRestCompleteTone();
        }
        if (navigator.vibrate) {
          navigator.vibrate([120, 60, 200]);
        }
      }
    };

    const interval = setInterval(checkTimer, 300);

    const handleVisibilityOrFocus = () => {
      if (!document.hidden) {
        checkTimer();
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
  }, [activeExercises, currentActiveExerciseIndex, completedSets, totalRestSeconds, workout?.title, handleSkipRest, handleAddRestTime]);

  // Gestione Screen Wake Lock (Schermo sempre attivo durante il workout per evitare standby)
  useEffect(() => {
    let mounted = true;
    requestWorkoutWakeLock().then((active) => {
      if (mounted) setIsWakeLockActive(active);
    });

    return () => {
      mounted = false;
      releaseWorkoutWakeLock();
      stopLockScreenTimer();
    };
  }, []);

  const toggleWakeLock = useCallback(async () => {
    if (isWakeLockActive) {
      await releaseWorkoutWakeLock();
      setIsWakeLockActive(false);
      showSuccess('Standby Standard Ripristinato', 'Lo schermo seguirà le impostazioni del dispositivo.');
    } else {
      const success = await requestWorkoutWakeLock();
      setIsWakeLockActive(success);
      if (success) {
        showSuccess('Schermo Sempre Attivo', 'Il display rimarrà acceso durante l\'allenamento.');
      } else {
        showError('Screen Wake Lock Non Supportato', 'Il browser non consente di mantenere il display sempre attivo.');
      }
    }
  }, [isWakeLockActive, showSuccess, showError]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStartOrResumeTimer = useCallback(() => {
    setIsWorkoutStarted(true);
    startTimestampRef.current = Date.now() - elapsedTime * 1000;
    setIsTimerRunning(true);

    if (!sessionId && navigator.onLine) {
      const weekNum = currentWeekNumber;
      const dayName = activeExercises[0]?.day_name || 'Giorno A';
      startWorkoutSession(workout.id, targetAthleteId || athleteId, weekNum, dayName).then((res) => {
        if (res.session) {
          setSessionId(res.session.id);
        } else if (res.error) {
          showError('Errore', 'Impossibile avviare la sessione sul server.');
        }
      });
    }

    scheduleAutosave(true);
    showSuccess('Allenamento Avviato', 'Cronometro partito! Buon allenamento 💪');
  }, [elapsedTime, sessionId, workout.id, targetAthleteId, athleteId, startWorkoutSession, scheduleAutosave, showSuccess, showError]);

  const handlePauseTimer = useCallback(() => {
    setIsTimerRunning(false);
    scheduleAutosave(true);
  }, [scheduleAutosave]);

  const handleResetTimer = useCallback(() => {
    setIsTimerRunning(false);
    setIsWorkoutStarted(false);
    setElapsedTime(0);
    startTimestampRef.current = Date.now();

    // Re-inizializza i log vuoti
    const resetLogs: Record<string, { reps: string; weight: string; rpe: string }[]> = {};
    activeExercises.forEach((ex) => {
      resetLogs[ex.id] = Array(ex.sets).fill({ reps: '', weight: '', rpe: '' });
    });
    setLogs(resetLogs);
    setCompletedSets({});
    setExerciseNotes({});

    // Cancella esplicitamente la bozza locale in modo che la dashboard non mostri più "Riprendi allenamento"
    clearActiveWorkoutDraft(athleteId);
    window.dispatchEvent(new Event('athlete_draft_updated'));

    showSuccess('Sessione Resettata', 'Il cronometro e i dati sono stati azzerati.');
  }, [athleteId, activeExercises, showSuccess]);

  const handleLogChange = useCallback((exerciseId: string, setIndex: number, field: 'reps' | 'weight' | 'rpe', value: string) => {
    setLogs((prev) => {
      const updatedSets = [...(prev[exerciseId] || [])];
      updatedSets[setIndex] = { ...updatedSets[setIndex], [field]: value };
      return { ...prev, [exerciseId]: updatedSets };
    });
    scheduleAutosave(false);
  }, [scheduleAutosave]);

  const handleToggleSetComplete = useCallback((exerciseId: string, setIdx: number, restSeconds: number) => {
    setCompletedSets((prev) => {
      const currentList = prev[exerciseId] ? [...prev[exerciseId]] : [];
      const isNowCompleted = !currentList[setIdx];
      currentList[setIdx] = isNowCompleted;

      if (isNowCompleted) {
        initOrResumeAudioContext();
        if (!isWorkoutStarted) {
          setIsWorkoutStarted(true);
          setIsTimerRunning(true);
          startTimestampRef.current = Date.now() - elapsedTime * 1000;
          if (!sessionId && navigator.onLine) {
            const weekNum = currentWeekNumber;
            const dayName = activeExercises[0]?.day_name || 'Giorno A';
            startWorkoutSession(workout.id, targetAthleteId || athleteId, weekNum, dayName).then((res) => {
              if (res.session) {
                setSessionId(res.session.id);
              }
            });
          }
        }
        const safeRest = restSeconds > 0 ? restSeconds : 90;
        restEndTimestampRef.current = Date.now() + safeRest * 1000;
        setTotalRestSeconds(safeRest);
        setRestTimer(safeRest);
        if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
      }

      return { ...prev, [exerciseId]: currentList };
    });
    scheduleAutosave(true); // Salvataggio immediato al completamento della serie
  }, [scheduleAutosave, isWorkoutStarted, elapsedTime, sessionId, activeExercises, startWorkoutSession, workout.id, targetAthleteId, athleteId, currentWeekNumber]);

  const handleNoteChange = useCallback((exerciseId: string, val: string) => {
    setExerciseNotes((prev) => ({ ...prev, [exerciseId]: val }));
    scheduleAutosave(false);
  }, [scheduleAutosave]);

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
          const weekNum = currentWeekNumber;
          const dayName = activeExercises[0]?.day_name || 'Giorno A';
          const startRes = await startWorkoutSession(workout.id, targetAthleteId || athleteId, weekNum, dayName);
          if (startRes.session?.id) {
            effectiveSessionId = startRes.session.id;
            setSessionId(effectiveSessionId);
          } else {
            console.error('[CRITICAL] startWorkoutSession ha fallito la persistenza DB:', startRes.error);
            showError('Errore di Connessione', startRes.error || 'Impossibile registrare la sessione sul database.');
            setIsSaving(false);
            return;
          }
        } catch (e: any) {
          console.error('[CRITICAL] Errore creazione sessione all\'uscita:', e);
          showError('Errore', 'Impossibile comunicare con il database per avviare la sessione.');
          setIsSaving(false);
          return;
        }
      }

      if (!effectiveSessionId && navigator.onLine) {
        showError('Errore Sessione', 'Nessuna sessione attiva presente sul database. Salvataggio interrotto.');
        setIsSaving(false);
        return;
      }

      const logsToSave: Partial<ExerciseLog>[] = [];
      const prResults: string[] = [];
      const bestLoadsMap = new Map<string, { exerciseId: string; exerciseName: string; weightKg: number; reps: number }>();

      for (const ex of activeExercises) {
        const exLogs = logs[ex.id] || [];
        const userFeedback = exerciseNotes[ex.id]?.trim();
        const completedMap = completedSets[ex.id] || [];

        for (let idx = 0; idx < ex.sets; idx++) {
          const setLog = exLogs[idx] || { reps: '', weight: '', rpe: '' };
          const isCompleted = !!completedMap[idx];

          let repsNum = setLog.reps ? parseInt(String(setLog.reps).replace(/[^0-9]/g, ''), 10) : 0;
          let weightNum = setLog.weight ? parseFloat(String(setLog.weight).replace(',', '.')) : 0;

          // Se la serie è stata spuntata/completata ma non sono stati digitati i numeri a mano
          if (isCompleted && repsNum === 0) {
            const parsedTargetReps = parseInt(String(ex.reps_target || '').replace(/[^0-9]/g, ''), 10);
            if (parsedTargetReps > 0) {
              repsNum = parsedTargetReps;
            } else {
              const hist = previousHistoryMap[ex.id] || previousHistoryMap[ex.name.toLowerCase().trim()];
              const histSet = hist?.sets?.[idx] || hist?.sets?.[hist.sets.length - 1];
              repsNum = Number(histSet?.reps) || 10;
            }
          }
          if (isCompleted && weightNum === 0) {
            if (ex.target_weight) {
              weightNum = parseFloat(String(ex.target_weight).replace(',', '.')) || 0;
            }
            if (weightNum === 0) {
              const hist = previousHistoryMap[ex.id] || previousHistoryMap[ex.name.toLowerCase().trim()];
              const histSet = hist?.sets?.[idx] || hist?.sets?.[hist.sets.length - 1];
              if (histSet?.weightKg) {
                weightNum = Number(histSet.weightKg) || 0;
              }
            }
          }

          if (repsNum > 0 || weightNum > 0 || isCompleted || setLog.rpe || userFeedback) {
            const noteParts: string[] = [];
            if (setLog.rpe) noteParts.push(`RPE: ${setLog.rpe}`);
            if (userFeedback && idx === 0) noteParts.push(`Feedback: ${userFeedback}`);

            logsToSave.push({
              session_id: effectiveSessionId || 'offline-pending',
              exercise_id: ex.id,
              set_number: idx + 1,
              reps_completed: repsNum || 1,
              weight_kg: weightNum || 0,
              notes: noteParts.length > 0 ? noteParts.join(' | ') : undefined,
            });

            // Raggruppa i migliori carichi per il check PR veloce
            if (weightNum > 0 && repsNum > 0) {
              const prevBest = bestLoadsMap.get(ex.id);
              if (!prevBest || weightNum > prevBest.weightKg || (weightNum === prevBest.weightKg && repsNum > prevBest.reps)) {
                bestLoadsMap.set(ex.id, {
                  exerciseId: ex.id,
                  exerciseName: ex.name,
                  weightKg: weightNum,
                  reps: repsNum,
                });
              }
            }
          }
        }
      }

      // Check PR in parallelo non bloccante (1 sola chiamata per esercizio)
      if (athleteId && athleteId !== 'ath-local' && bestLoadsMap.size > 0 && navigator.onLine) {
        try {
          const prPromises = Array.from(bestLoadsMap.values()).map((item) =>
            checkAndUpdateAutoPR(athleteId, item.exerciseId, item.exerciseName, item.weightKg, item.reps)
              .then((res) => (res.isNewPR ? `${item.exerciseName}: ${res.calculated1RM} kg 1RM!` : null))
              .catch(() => null)
          );
          const prOutputs = await Promise.all(prPromises);
          prOutputs.forEach((res) => {
            if (res) prResults.push(res);
          });
        } catch (_) {}
      }

      const validPainReports = painReports.filter((p) => p.exercise.trim() || p.bodyPart.trim());
      const painDetailsFormatted = validPainReports
        .map((p, idx) => `[#${idx + 1} Esercizio: ${p.exercise || 'Non specificato'} — Zona: ${p.bodyPart || 'Non specificata'}]`)
        .join('; ');

      const questionnaireNotes = `Questionario: Fatica ${difficulty}/5, Dolore Articolare ${jointPain}/5, Pump ${pump}/5${
        painDetailsFormatted ? ` — Fastidi: ${painDetailsFormatted}` : ''
      }`;
      const nowIso = new Date().toISOString();
      const startIso = new Date(startTimestampRef.current).toISOString();
      const weekNum = currentWeekNumber;
      const dayName = activeExercises[0]?.day_name || 'Giorno A';

      // Backup locale istantaneo dei log completati
      if (effectiveSessionId) {
        try {
          const localLogsMap = JSON.parse(localStorage.getItem('builder_completed_session_logs') || '{}');
          localLogsMap[effectiveSessionId] = logsToSave;
          localStorage.setItem('builder_completed_session_logs', JSON.stringify(localLogsMap));
        } catch (_) {}
      }

      // SE ONLINE: Salva su Supabase con controllo errori rigoroso
      if (navigator.onLine && effectiveSessionId) {
        if (logsToSave.length > 0) {
          const logsRes = await saveExerciseLogs(logsToSave);
          if (!logsRes.success) {
            console.error('[CRITICAL] Errore salvataggio exercise_logs su Supabase:', logsRes.error);
            showError('Errore Salvataggio Carichi', logsRes.error || 'Impossibile registrare le serie sul database. Salvataggio interrotto per proteggere i dati.');
            setIsSaving(false);
            return;
          }
        }
        const endRes = await endWorkoutSession(effectiveSessionId, questionnaireNotes, difficulty * 2, weekNum, dayName);
        if (!endRes.success) {
          console.error('[CRITICAL] endWorkoutSession ha fallito l\'update su Supabase:', endRes.error);
          showError('Errore Completamento', endRes.error || 'Impossibile contrassegnare la sessione come completata.');
          setIsSaving(false);
          return;
        }
      } else if (!navigator.onLine) {
        // SE OFFLINE: accoda per sincronizzazione futura (la sessione DB reale verrà creata/risolta al ritorno online)
        const pendingItem: PendingCompletedWorkout = {
          id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          sessionId: effectiveSessionId || null,
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
          jointPainNotes: painDetailsFormatted,
          logsToSave: logsToSave as PendingCompletedWorkout['logsToSave'],
          createdAt: Date.now(),
        };
        queueCompletedWorkoutForSync(pendingItem);
      }

      // Alert questionario per il coach se presente dolore o fatica estrema
      if (jointPain >= 3 || validPainReports.length > 0 || difficulty >= 4) {
        try {
          const existingAlerts = JSON.parse(localStorage.getItem('builder_copilot_critical_notes') || '[]');
          const isHighSeverity = jointPain >= 4 || validPainReports.some((p) => /dolore|pizzico|infortunio|male|strappo/i.test(p.bodyPart));

          const newAlerts = validPainReports.length > 0
            ? validPainReports.map((p, pIdx) => ({
                id: `cn-q-${Date.now()}-${pIdx}-${Math.random().toString(36).slice(2, 6)}`,
                athleteId,
                athleteName: currentAthlete ? `${currentAthlete.firstName} ${currentAthlete.lastName}` : user?.name || 'Atleta',
                workoutTitle: workout.title,
                weekNumber: weekNum,
                dayName,
                exerciseName: p.exercise || 'Esercizio con fastidio',
                noteText: `Questionario Fine Workout — Dolori Articolari: ${jointPain}/5 | Esercizio: "${p.exercise || 'Non specificato'}" | Zona: "${p.bodyPart || 'Non specificata'}"`,
                severity: isHighSeverity ? ('high' as const) : ('medium' as const),
                date: 'Oggi',
                category: 'pain',
              }))
            : [{
                id: `cn-q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                athleteId,
                athleteName: currentAthlete ? `${currentAthlete.firstName} ${currentAthlete.lastName}` : user?.name || 'Atleta',
                workoutTitle: workout.title,
                weekNumber: weekNum,
                dayName,
                exerciseName: 'Questionario Fine Workout',
                noteText: `Questionario Fine Workout — Fatica: ${difficulty}/5 | Dolori Articolari: ${jointPain}/5`,
                severity: isHighSeverity ? ('high' as const) : ('medium' as const),
                date: 'Oggi',
                category: 'pain',
              }];

          localStorage.setItem('builder_copilot_critical_notes', JSON.stringify([...newAlerts, ...existingAlerts]));
          window.dispatchEvent(new Event('copilot_notes_updated'));
        } catch (_) {}
      }

      // Alert se sessione completata senza carichi registrati (Volume 0 kg)
      if (logsToSave.length === 0 || logsToSave.every(l => !l.weight_kg || l.weight_kg === 0)) {
        try {
          const existingAlerts = JSON.parse(localStorage.getItem('builder_copilot_critical_notes') || '[]');
          const missingWeightsAlert = {
            id: `cn-mw-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            athleteId,
            athleteName: currentAthlete ? `${currentAthlete.firstName} ${currentAthlete.lastName}` : user?.name || 'Atleta',
            workoutTitle: workout.title,
            weekNumber: weekNum,
            dayName,
            exerciseName: 'Log Incompleto (Volume 0 kg)',
            noteText: `Sessione completata senza carichi registrati. Invia promemoria compilazione.`,
            severity: 'medium',
            date: 'Oggi',
            category: 'missing_weights',
          };
          localStorage.setItem('builder_copilot_critical_notes', JSON.stringify([missingWeightsAlert, ...existingAlerts]));
          window.dispatchEvent(new Event('copilot_notes_updated'));
        } catch (_) {}
      }

      // Calcola Volume Totale Sollevato & Serie per la Celebration Screen direttamente dai log effettivi salvati
      const calculatedVolumeKg = logsToSave.reduce(
        (sum, item) => sum + ((Number(item.weight_kg) || 0) * (Number(item.reps_completed) || 0)),
        0
      );

      const completedSetsTotal = activeExercises.reduce((acc, ex) => {
        const completedMap = completedSets[ex.id] || [];
        return acc + completedMap.filter(Boolean).length;
      }, 0);

      const totalSetsPlanned = activeExercises.reduce((acc, ex) => acc + (ex.sets || 0), 0);

      // Aggiorna progresso locale e rimuovi bozza attiva
      try {
        const norm = (s: string) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
        const keys = [
          `builder_progress_${athleteId}_${workout.id}`,
          `builder_progress_${targetAthleteId || athleteId}_${workout.id}`,
        ];
        keys.forEach((pk) => {
          const existing = JSON.parse(localStorage.getItem(pk) || '{}');
          existing[`${weekNum}-${dayName}`] = true;
          existing[`${weekNum}-${norm(dayName)}`] = true;
          localStorage.setItem(pk, JSON.stringify(existing));
        });
      } catch (_) {}

      clearActiveWorkoutDraft(athleteId);
      if (targetAthleteId) clearActiveWorkoutDraft(targetAthleteId);
      if (user?.athleteId) clearActiveWorkoutDraft(user.athleteId);
      if (user?.id) clearActiveWorkoutDraft(user.id);
      window.dispatchEvent(new Event('athlete_workout_completed'));
      window.dispatchEvent(new Event('athlete_draft_updated'));
      setIsSaving(false);

      // Apri la Celebration Screen
      setCelebrationData({
        workoutTitle: workout.title,
        durationMinutes: Math.max(1, Math.round(elapsedTime / 60)),
        totalVolumeKg: Math.round(calculatedVolumeKg),
        completedSetsCount: completedSetsTotal > 0 ? completedSetsTotal : logsToSave.length,
        totalSetsCount: totalSetsPlanned,
        newPRs: prResults,
        earnedXP: 100 + (prResults.length * 50),
      });
    } catch (err: unknown) {
      console.warn('Errore in executeWorkoutSave, fallback completamento immediato:', err);
      clearActiveWorkoutDraft(athleteId);
      setIsSaving(false);

      let fallbackVolume = 0;
      let fallbackCompletedSets = 0;

      activeExercises.forEach((ex) => {
        const exLogs = logs[ex.id] || [];
        const completedMap = completedSets[ex.id] || [];
        for (let idx = 0; idx < ex.sets; idx++) {
          const l = exLogs[idx];
          const isDone = !!completedMap[idx];
          if (isDone) fallbackCompletedSets++;

          let w = l?.weight ? parseFloat(String(l.weight).replace(',', '.')) || 0 : 0;
          let r = l?.reps ? parseInt(String(l.reps).replace(/[^0-9]/g, ''), 10) || 0 : 0;

          if (isDone && w === 0 && ex.target_weight) {
            w = parseFloat(String(ex.target_weight).replace(',', '.')) || 0;
          }
          if (isDone && r === 0 && ex.reps_target) {
            r = parseInt(String(ex.reps_target).replace(/[^0-9]/g, ''), 10) || 10;
          }

          if (w > 0 && r > 0) {
            fallbackVolume += w * r;
          }
        }
      });

      setCelebrationData({
        workoutTitle: workout.title,
        durationMinutes: Math.max(1, Math.round(elapsedTime / 60)),
        totalVolumeKg: Math.round(fallbackVolume),
        completedSetsCount: fallbackCompletedSets,
        totalSetsCount: activeExercises.reduce((acc, e) => acc + e.sets, 0),
        newPRs: [],
        earnedXP: 100,
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-[var(--color-bg)] z-50 flex flex-col font-sans overflow-hidden">
      {/* ── HEADER LIVE ELEGANTE & SPAZIOSO ── */}
      <div className="bg-[var(--color-surface)]/95 backdrop-blur-xl border-b border-[var(--color-border)] px-4 sm:px-6 lg:px-8 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pb-3 sm:pb-4 shadow-lg relative z-20 shrink-0">
        <div className="max-w-4xl xl:max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => {
                flushAutosave();
                onClose();
              }}
              className="min-w-[44px] min-h-[44px] w-11 h-11 text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded-2xl bg-[var(--color-surface-strong)] hover:bg-[var(--color-panel)] border border-[var(--color-border)] flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0 shadow-sm"
              title="Chiudi sessione"
              aria-label="Chiudi sessione"
            >
              <X className="w-5 h-5" />
            </button>

            {!isWorkoutStarted ? (
              /* STATO ANTEPRIMA: SOLO GIORNO + SETTIMANA + ICONA OCCHIO */
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="text-base sm:text-xl font-black text-[var(--color-text)] truncate">
                  {currentDayName}
                </h1>
                <span className="text-xs sm:text-sm text-[var(--color-text-muted)] font-bold shrink-0">
                  • Settimana {currentWeekNumber}
                </span>
                <span className="p-1 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0" title="Anteprima scheda">
                  <Eye className="w-3.5 h-3.5" />
                </span>
              </div>
            ) : (
              /* STATO WORKOUT AVVIATO: CRONOMETRO & STATO SYNC */
              <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                {/* Timer Badge Interattivo con Controlli Play / Pausa / Reset */}
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border transition-all shadow-sm ${
                  isTimerRunning
                    ? 'bg-amber-500/15 border-amber-500/35 text-[var(--color-primary)]'
                    : 'bg-amber-500/10 border-amber-500/25 text-amber-400'
                }`}>
                  <span className="font-mono text-xs sm:text-sm font-black flex items-center gap-1.5">
                    <Clock className={`w-3.5 h-3.5 ${isTimerRunning ? 'text-[var(--color-primary)] animate-pulse' : 'text-slate-400'}`} />
                    {formatTime(elapsedTime)}
                  </span>

                  {/* Divider */}
                  <div className="w-[1px] h-3.5 bg-slate-700/60 mx-0.5" />

                  {/* Pulsante Pausa / Riprendi */}
                  <button
                    type="button"
                    onClick={isTimerRunning ? handlePauseTimer : handleStartOrResumeTimer}
                    className={`p-1 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                      isTimerRunning
                        ? 'text-amber-300 hover:bg-amber-500/20'
                        : 'text-emerald-400 hover:bg-emerald-500/20 flex items-center gap-1 px-1.5'
                    }`}
                    title={isTimerRunning ? 'Metti in pausa il cronometro' : 'Riprendi il cronometro'}
                  >
                    {isTimerRunning ? (
                      <Pause className="w-3.5 h-3.5 fill-current" />
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current text-emerald-400" />
                        <span className="text-[10px] font-black uppercase">Riprendi</span>
                      </>
                    )}
                  </button>

                  {/* Pulsante Reset */}
                  <button
                    type="button"
                    onClick={handleResetTimer}
                    className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all active:scale-95 cursor-pointer"
                    title="Azzera il cronometro"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </div>

                {/* Badge Stato Salvataggio */}
                <span className="text-xs text-[var(--color-text-muted)] hidden sm:flex items-center gap-1.5 font-medium">
                  {isOnline ? (
                    <span className="flex items-center gap-1.5 text-emerald-500 font-bold" title={lastSavedText}>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{lastSavedText}</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-amber-500 font-bold">
                      <WifiOff className="w-3.5 h-3.5 text-amber-500" />
                      <span>Offline (Dati al sicuro)</span>
                    </span>
                  )}
                </span>
                {/* Toggle Schermo Sempre Acceso (Screen Wake Lock) */}
                {isWakeLockSupported() && (
                  <button
                    type="button"
                    onClick={toggleWakeLock}
                    className={`hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-mono font-bold border transition cursor-pointer ${
                      isWakeLockActive
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-sm'
                        : 'bg-slate-900/80 text-slate-500 border-slate-800 hover:text-slate-300'
                    }`}
                    title={isWakeLockActive ? 'Schermo sempre attivo (Standby disattivato)' : 'Standby standard attivo (clicca per tenere lo schermo sempre acceso)'}
                  >
                    <span>{isWakeLockActive ? '💡 Schermo ON' : '💤 Standby'}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Destra: Azioni Header */}
          <div className="flex items-center gap-2 shrink-0">
            {isWorkoutStarted && (
              <button
                type="button"
                onClick={handleOpenFinishFlow}
                disabled={isSaving}
                className="min-h-[44px] px-4 sm:px-6 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Completa</span>
              </button>
            )}
          </div>
        </div>
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

      {/* SCROLLABLE EXERCISES LIST - OTTIMIZZATO PER SPAZIO E LARGHEZZA */}
      <div className={`flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 ${!isWorkoutStarted ? 'pb-36' : 'pb-28'} bg-[var(--color-bg)]`}>
        <div className="max-w-4xl xl:max-w-5xl mx-auto space-y-3 sm:space-y-4">
          {activeExercises.map((ex, idx) => {
            const isCompleted = Boolean(completedSets[ex.id]?.length === ex.sets && completedSets[ex.id].every(Boolean));
            const isActive = idx === currentActiveExerciseIndex;

            return (
              <React.Fragment key={ex.id}>
                <ExerciseCard
                  exercise={ex}
                  index={idx}
                  isActive={isActive}
                  isCompleted={isCompleted}
                  completedSetsMap={completedSets[ex.id] || []}
                  previousHistory={previousHistoryMap[ex.id] || previousHistoryMap[ex.name.toLowerCase().trim()]}
                  onOpenExecutionModal={() => setActiveExerciseModalIndex(idx)}
                />
              </React.Fragment>
            );
          })}

          {/* Card di supporto Imprevisto / Modulazione Seduta */}
          {!isWorkoutStarted && (
            <div className="p-4 sm:p-5 rounded-3xl bg-[var(--color-surface)]/90 border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left mt-8 shadow-sm">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5 shadow-sm">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-black text-[var(--color-text)]">
                    Hai un imprevisto o non ti senti al 100%?
                  </h4>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed max-w-xl">
                    Comunica subito al tuo coach se oggi non puoi allenarti: adatteremo il percorso e la frequenza settimanale senza alcuno stress.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSkipModalOpen(true)}
                className="min-h-[44px] px-4 py-2.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-black transition-all active:scale-95 cursor-pointer shrink-0 self-start sm:self-auto shadow-sm flex items-center gap-1.5"
              >
                <span>Comunica Imprevisto</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── BARRA FISSA IN BASSO PER INIZIARE ALLENAMENTO (SOLO QUANDO NON AVVIATO) ── */}
      {!isWorkoutStarted && (
        <div className="fixed bottom-0 left-0 right-0 p-4 sm:p-5 bg-[var(--color-surface)]/95 backdrop-blur-xl border-t border-[var(--color-border)] shadow-2xl z-30">
          <div className="max-w-4xl xl:max-w-5xl mx-auto">
            <button
              type="button"
              onClick={handleStartOrResumeTimer}
              className="w-full py-4 px-6 rounded-2xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-slate-950 font-black text-base flex items-center justify-center gap-2.5 shadow-xl shadow-[var(--color-primary)]/25 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Inizia Allenamento</span>
            </button>
          </div>
        </div>
      )}

      {/* ── MODALE DI COMPILAZIONE FOCALIZZATA ESERCIZIO ── */}
      {activeExerciseModalIndex !== null && activeExercises[activeExerciseModalIndex] && (() => {
        const currentEx = activeExercises[activeExerciseModalIndex];
        return (
          <ExerciseExecutionModal
            isOpen={true}
            exercise={currentEx}
            exerciseIndex={activeExerciseModalIndex}
            totalExercises={activeExercises.length}
            logs={logs[currentEx.id] || []}
            completedSetsMap={completedSets[currentEx.id] || []}
            noteFeedback={exerciseNotes[currentEx.id] || ''}
            previousHistory={previousHistoryMap[currentEx.id] || previousHistoryMap[currentEx.name.toLowerCase().trim()]}
            restTimer={restTimer}
            totalRestSeconds={totalRestSeconds}
            onSkipRest={handleSkipRest}
            onAddRestTime={handleAddRestTime}
            onLogChange={(setIdx, field, val) => handleLogChange(currentEx.id, setIdx, field, val)}
            onNoteFeedbackChange={(val) => handleNoteChange(currentEx.id, val)}
            onToggleSetComplete={(setIdx) => handleToggleSetComplete(currentEx.id, setIdx, currentEx.rest_seconds)}
            onNavigateNext={() => {
              if (activeExerciseModalIndex < activeExercises.length - 1) {
                setActiveExerciseModalIndex(activeExerciseModalIndex + 1);
              } else {
                setActiveExerciseModalIndex(null);
              }
            }}
            onNavigatePrev={() => {
              if (activeExerciseModalIndex > 0) {
                setActiveExerciseModalIndex(activeExerciseModalIndex - 1);
              }
            }}
            hasNext={activeExerciseModalIndex < activeExercises.length - 1}
            hasPrev={activeExerciseModalIndex > 0}
            onClose={() => setActiveExerciseModalIndex(null)}
          />
        );
      })()}

      {/* ── QUESTIONARIO POST-ALLENAMENTO MODAL ── */}
      {showQuestionnaireModal && (() => {
        let totalSetsPlanned = 0;
        let setsWithWeightAndReps = 0;
        let emptyExercisesCount = 0;

        activeExercises.forEach((ex) => {
          totalSetsPlanned += ex.sets;
          const exLogs = logs[ex.id] || [];
          const completedMap = completedSets[ex.id] || [];
          let exerciseHasAnyWeight = false;

          for (let i = 0; i < ex.sets; i++) {
            const l = exLogs[i];
            const isDone = !!completedMap[i];
            let w = l?.weight ? parseFloat(String(l.weight).replace(',', '.')) || 0 : 0;
            let r = l?.reps ? parseInt(String(l.reps).replace(/[^0-9]/g, ''), 10) || 0 : 0;

            if (isDone && w === 0 && ex.target_weight) {
              w = parseFloat(String(ex.target_weight).replace(',', '.')) || 0;
            }
            if (isDone && w === 0) {
              const hist = previousHistoryMap[ex.id] || previousHistoryMap[ex.name.toLowerCase().trim()];
              const histSet = hist?.sets?.[i] || hist?.sets?.[hist.sets.length - 1];
              if (histSet?.weightKg) {
                w = Number(histSet.weightKg) || 0;
              }
            }
            if (isDone && r === 0 && ex.reps_target) {
              r = parseInt(String(ex.reps_target).replace(/[^0-9]/g, ''), 10) || 10;
            }
            if (isDone && r === 0) {
              const hist = previousHistoryMap[ex.id] || previousHistoryMap[ex.name.toLowerCase().trim()];
              const histSet = hist?.sets?.[i] || hist?.sets?.[hist.sets.length - 1];
              r = Number(histSet?.reps) || 10;
            }

            if (w > 0 && r > 0) {
              setsWithWeightAndReps++;
              exerciseHasAnyWeight = true;
            }
          }

          if (!exerciseHasAnyWeight) {
            emptyExercisesCount++;
          }
        });

        const isCompletelyEmpty = setsWithWeightAndReps === 0;
        const isPartiallyEmpty = setsWithWeightAndReps > 0 && setsWithWeightAndReps < totalSetsPlanned;
        const hasMissingData = isCompletelyEmpty || isPartiallyEmpty;

        return (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)] mx-auto shadow-md">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-[var(--color-text)]">Com'è andato l'allenamento?</h3>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Aiuta il coach e l'IA a regolare i carichi e il recupero per la prossima sessione.
                </p>
              </div>

              {/* Avviso Serie / Carichi Non Registrati o Parziali */}
              {hasMissingData && (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-1.5 text-xs animate-in fade-in">
                  <div className="flex items-center gap-1.5 text-amber-600 font-bold">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>
                      {isCompletelyEmpty
                        ? 'Non hai inserito i carichi usati oggi'
                        : `Compilazione incompleta (${setsWithWeightAndReps}/${totalSetsPlanned} serie registrate)`}
                    </span>
                  </div>
                  <p className="text-[var(--color-text)] text-[11px] leading-relaxed">
                    {isCompletelyEmpty
                      ? 'Non hai inserito i carichi usati oggi. Inserire i pesi e le ripetizioni aiuta il tuo coach a monitorare i tuoi progressi!'
                      : `Hai lasciato ${emptyExercisesCount > 0 ? `${emptyExercisesCount} esercizio/i` : 'alcune serie'} senza carichi o ripetizioni. Completa tutti gli esercizi per consentire al coach di tracciare l'andamento reale!`}
                  </p>
                </div>
              )}

            {/* Fatica Percepita */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-[var(--color-text)]">Fatica complessiva (RPE):</span>
                <span className="text-[var(--color-primary)] font-mono font-bold">{difficulty} / 5</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setDifficulty(val)}
                    className={`py-2.5 rounded-xl font-black text-xs border transition-all cursor-pointer ${
                      difficulty === val
                        ? 'bg-[var(--color-primary)] text-slate-950 border-[var(--color-primary)] shadow-md scale-105'
                        : 'bg-[var(--color-surface-strong)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:text-[var(--color-text)]'
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
                <span className="text-[var(--color-text)] flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                  Dolori o fastidi articolari:
                </span>
                <span className={`font-mono font-bold ${jointPain >= 3 ? 'text-rose-500' : 'text-[var(--color-text-muted)]'}`}>
                  {jointPain} / 5
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setJointPain(val)}
                    className={`py-2.5 rounded-xl font-black text-xs border transition-all cursor-pointer ${
                      jointPain === val
                        ? val >= 3
                          ? 'bg-rose-500 text-white border-rose-400 shadow-md scale-105'
                          : 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md scale-105'
                        : 'bg-[var(--color-surface-strong)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:text-[var(--color-text)]'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Dettaglio Dolore: Supporto Multi-Esercizio */}
            {jointPain >= 2 && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-500">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Dettaglio Fastidi Articolari ({painReports.length})</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddPainReport}
                    className="px-2.5 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-600 text-[11px] font-bold border border-rose-500/40 flex items-center gap-1 transition-all cursor-pointer active:scale-95 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Aggiungi esercizio</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {painReports.map((report, rIdx) => (
                    <div
                      key={report.id}
                      className="p-3 bg-[var(--color-surface)] border border-rose-500/30 rounded-xl space-y-2 relative group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-rose-500">
                          Esercizio #{rIdx + 1}
                        </span>
                        {painReports.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePainReport(report.id)}
                            className="text-[var(--color-text-muted)] hover:text-rose-500 p-1 rounded-lg transition-colors cursor-pointer"
                            title="Rimuovi questo esercizio"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Dropdown Esercizio */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block">
                          Su quale esercizio?
                        </label>
                        <select
                          value={report.exercise}
                          onChange={(e) => handleUpdatePainReport(report.id, 'exercise', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-[var(--color-surface-strong)] border border-rose-500/40 text-[var(--color-text)] text-xs focus:outline-none focus:border-rose-500 cursor-pointer"
                        >
                          <option value="">-- Seleziona esercizio --</option>
                          {activeExercises.map((ex) => (
                            <option key={ex.id} value={ex.name}>
                              {ex.name}
                            </option>
                          ))}
                          <option value="Generale / Più esercizi">Generale / Più esercizi</option>
                        </select>
                      </div>

                      {/* Input Zona / Articolazione */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block">
                          Dove hai sentito fastidio?
                        </label>
                        <input
                          type="text"
                          value={report.bodyPart}
                          onChange={(e) => handleUpdatePainReport(report.id, 'bodyPart', e.target.value)}
                          placeholder="Es: spalla anteriore destra, gomito interno..."
                          className="w-full px-3 py-2 rounded-xl bg-[var(--color-surface-strong)] border border-rose-500/40 text-[var(--color-text)] text-xs placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-rose-500"
                        />
                        {/* Chip Rapidi */}
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {['Spalla', 'Gomito', 'Lombare', 'Ginocchio', 'Anca', 'Polso'].map((chip) => (
                            <button
                              key={chip}
                              type="button"
                              onClick={() => {
                                const cur = report.bodyPart;
                                handleUpdatePainReport(
                                  report.id,
                                  'bodyPart',
                                  cur ? `${cur}, ${chip}` : chip
                                );
                              }}
                              className="px-2 py-0.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-600 text-[10px] font-bold hover:bg-rose-500/30 cursor-pointer"
                            >
                              +{chip}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pump Muscolare */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-[var(--color-text)]">Pump muscolare & attivazione:</span>
                <span className="text-sky-600 font-mono font-bold">{pump} / 5</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setPump(val)}
                    className={`py-2.5 rounded-xl font-black text-xs border transition-all cursor-pointer ${
                      pump === val
                        ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-md scale-105'
                        : 'bg-[var(--color-surface-strong)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:text-[var(--color-text)]'
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
                className="flex-1 py-3 rounded-2xl bg-[var(--color-surface-strong)] hover:bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] font-bold text-xs border border-[var(--color-border)] transition-colors cursor-pointer"
              >
                Torna alla scheda
              </button>
              <button
                type="button"
                onClick={executeWorkoutSave}
                disabled={isSaving}
                className="flex-1 py-3 rounded-2xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-slate-950 font-black text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4 stroke-[3]" />
                )}
                <span>Salva ed Esci</span>
              </button>
            </div>
          </div>
        </div>
      );
    })()}

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
            window.dispatchEvent(new Event('athlete_workout_completed'));
            window.dispatchEvent(new Event('athlete_draft_updated'));
            onClose();
          }}
        />
      )}

      {/* ── MODALE SALTO SEDUTA CON GIUSTIFICAZIONE ── */}
      {isSkipModalOpen && (
        <SkipWorkoutModal
          isOpen={isSkipModalOpen}
          onClose={() => setIsSkipModalOpen(false)}
          workout={workout}
          weekNumber={currentWeekNumber}
          dayName={activeExercises[0]?.day_name || 'Giorno A'}
          athleteId={targetAthleteId || athleteId}
          onSuccess={() => {
            clearActiveWorkoutDraft(targetAthleteId || athleteId);
            onClose();
          }}
        />
      )}
    </div>
  );
};
