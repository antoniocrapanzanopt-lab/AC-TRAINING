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
  History,
  Zap,
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

  // Sanitizzazione di sicurezza: una sessione di allenamento appartiene a 1 solo Giorno e 1 sola Settimana
  const activeExercises = React.useMemo(() => {
    if (!exercises || exercises.length === 0) return [];

    const targetDay = (exercises[0].day_name || 'Giorno A').trim().toLowerCase();
    const targetWeek = exercises[0].week_number || 1;

    const singleDayExercises = exercises.filter((ex) => {
      const exDay = (ex.day_name || 'Giorno A').trim().toLowerCase();
      const exWeek = ex.week_number || 1;
      return exDay === targetDay && exWeek === targetWeek;
    });

    return singleDayExercises.length > 0 ? singleDayExercises : exercises;
  }, [exercises]);

  // Stato Connessione Realtime
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [lastSavedText, setLastSavedText] = useState<string>('Salvato');

  const [expandedExerciseMap, setExpandedExerciseMap] = useState<Record<number, boolean>>({ 0: true });
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
  const [isHistoryBannerDismissed, setIsHistoryBannerDismissed] = useState<boolean>(false);

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

    if (savedDraft && (savedDraft.workout?.id === workout.id || savedDraft.workout?.title === workout.title)) {
      // Ripristina lo stato precedente
      setLogs(savedDraft.logs || {});
      setCompletedSets(savedDraft.completedSets || {});
      setExerciseNotes(savedDraft.exerciseNotes || {});
      setExpandedExerciseMap({ [savedDraft.activeExerciseIdx || 0]: true });
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
      activeExercises.forEach((ex) => {
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
  }, [athleteId, workout, activeExercises, sessionId, startWorkoutSession, targetAthleteId]);

  // Carica SEMPRE lo storico delle prestazioni precedenti dell'atleta (Ghost Log)
  useEffect(() => {
    if (athleteId && athleteId !== 'ath-local') {
      fetchAthletePreviousExerciseHistory(athleteId).then((history) => {
        setPreviousHistoryMap(history);
      });
    }
  }, [athleteId]);

  const hasAnyPreviousHistory = useMemo(() => {
    return activeExercises.some((ex) => {
      const hist = previousHistoryMap[ex.id] || previousHistoryMap[ex.name.toLowerCase().trim()];
      return Boolean(hist?.sets && hist.sets.length > 0);
    });
  }, [activeExercises, previousHistoryMap]);

  // Applica in 1 solo tap i carichi e le ripetizioni dell'ultima volta su tutti gli esercizi del workout
  const handleApplyAllPreviousLoads = useCallback(() => {
    let appliedCount = 0;
    setLogs((prevLogs) => {
      const updatedLogs = { ...prevLogs };
      activeExercises.forEach((ex) => {
        const hist = previousHistoryMap[ex.id] || previousHistoryMap[ex.name.toLowerCase().trim()];
        if (hist?.sets && hist.sets.length > 0) {
          const currentSets = updatedLogs[ex.id] || Array(ex.sets).fill({ reps: '', weight: '', rpe: '' });
          const newSets = currentSets.map((s, sIdx) => {
            const histSet = hist.sets[sIdx] || hist.sets[hist.sets.length - 1];
            return {
              ...s,
              reps: histSet?.reps !== null && histSet?.reps !== undefined ? String(histSet.reps) : s.reps,
              weight: histSet?.weightKg !== null && histSet?.weightKg !== undefined ? String(histSet.weightKg) : s.weight,
              rpe: histSet?.rpe !== null && histSet?.rpe !== undefined ? String(histSet.rpe) : s.rpe,
            };
          });
          updatedLogs[ex.id] = newSets;
          appliedCount++;
        }
      });
      return updatedLogs;
    });

    if (appliedCount > 0) {
      setIsHistoryBannerDismissed(true);
      showSuccess('Carichi applicati', `Pre-compilati i carichi precedenti per ${appliedCount} esercizio/i!`);
    } else {
      showSuccess('Nessun dato precedente', 'Non sono presenti sessioni registrate per gli esercizi di oggi.');
    }
  }, [activeExercises, previousHistoryMap, showSuccess]);

  // ── 3. AUTOSAVE LOCALE DEBOUNCED ANTI-FREEZE ──
  const flushAutosave = useCallback(() => {
    if (!athleteId) return;
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
      autosaveTimeoutRef.current = null;
    }
    const current = draftStateRef.current;
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
    const timeStr = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    setLastSavedText(`Salvato alle ${timeStr}`);
  }, [athleteId, workout, activeExercises, targetAthleteId]);

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

  // Cronometro Recupero Tra Serie (Risolto: Non si interrompe mai al cambio esercizio o scrolling)
  useEffect(() => {
    const checkTimer = () => {
      if (!restEndTimestampRef.current) {
        setRestTimer(null);
        return;
      }
      const remaining = Math.max(0, Math.ceil((restEndTimestampRef.current - Date.now()) / 1000));
      if (remaining > 0) {
        setRestTimer(remaining);
      } else {
        restEndTimestampRef.current = null;
        setRestTimer(null);
      }
    };

    const interval = setInterval(checkTimer, 400);

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
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleToggleExerciseActive = useCallback((idx: number) => {
    setExpandedExerciseMap((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  }, []);

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
        const safeRest = restSeconds > 0 ? restSeconds : 90;
        restEndTimestampRef.current = Date.now() + safeRest * 1000;
        setTotalRestSeconds(safeRest);
        setRestTimer(safeRest);
        if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
      }

      return { ...prev, [exerciseId]: currentList };
    });
    scheduleAutosave(true); // Salvataggio immediato al completamento della serie
  }, [scheduleAutosave]);

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
        effectiveSessionId = crypto.randomUUID ? crypto.randomUUID() : `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0')}`;
      }

      const logsToSave: any[] = [];
      const prResults: string[] = [];
      const bestLoadsMap = new Map<string, { exerciseId: string; exerciseName: string; weightKg: number; reps: number }>();

      for (const ex of activeExercises) {
        const exLogs = logs[ex.id] || [];
        const userFeedback = exerciseNotes[ex.id]?.trim();
        const completedMap = completedSets[ex.id] || [];

        for (let idx = 0; idx < ex.sets; idx++) {
          const setLog = exLogs[idx] || { reps: '', weight: '', rpe: '' };
          const isCompleted = !!completedMap[idx];

          let repsNum = setLog.reps ? parseInt(setLog.reps, 10) : 0;
          let weightNum = setLog.weight ? parseFloat(setLog.weight) : 0;

          // Se la serie è stata spuntata/completata ma non sono stati digitati i numeri a mano
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
      const weekNum = (activeExercises[0] as any)?.week_number || 1;
      const dayName = (activeExercises[0] as any)?.day_name || 'Giorno A';

      // Backup locale istantaneo dei log completati
      try {
        const localLogsMap = JSON.parse(localStorage.getItem('builder_completed_session_logs') || '{}');
        localLogsMap[effectiveSessionId] = logsToSave;
        localStorage.setItem('builder_completed_session_logs', JSON.stringify(localLogsMap));
      } catch (_) {}

      // SE ONLINE: Esegui il salvataggio con protezione Timeout di 3.5s per evitare qualsiasi attesa all'atleta
      if (navigator.onLine) {
        try {
          const serverSaveTask = (async () => {
            if (logsToSave.length > 0) {
              await saveExerciseLogs(logsToSave);
            }
            await endWorkoutSession(effectiveSessionId, questionnaireNotes, difficulty * 2);
          })();

          await Promise.race([
            serverSaveTask,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Network Timeout')), 3500)),
          ]);
        } catch (netErr) {
          console.warn('Salvataggio server lento o in timeout, salvataggio in coda offline:', netErr);
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
            jointPainNotes: painDetailsFormatted,
            logsToSave,
            createdAt: Date.now(),
          };
          queueCompletedWorkoutForSync(pendingItem);
        }
      } else {
        // SE OFFLINE
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
          jointPainNotes: painDetailsFormatted,
          logsToSave,
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
                severity: isHighSeverity ? 'high' : 'medium',
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
                severity: isHighSeverity ? 'high' : 'medium',
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

      // Calcola Volume Totale Sollevato & Serie per la Celebration Screen
      let calculatedVolumeKg = 0;
      let completedSetsTotal = 0;
      let totalSetsPlanned = 0;

      activeExercises.forEach((ex) => {
        totalSetsPlanned += ex.sets;
        const exLogs = logs[ex.id] || [];
        const exSetsMap = completedSets[ex.id] || [];
        exLogs.forEach((l, sIdx) => {
          if (exSetsMap[sIdx]) {
            completedSetsTotal += 1;
            const w = parseFloat(l.weight) || 0;
            const r = parseInt(l.reps, 10) || 0;
            calculatedVolumeKg += w * r;
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
      console.warn('Errore in executeWorkoutSave, fallback completamento immediato:', err);
      clearActiveWorkoutDraft(athleteId);
      setIsSaving(false);

      setCelebrationData({
        workoutTitle: workout.title,
        durationMinutes: Math.max(1, Math.round(elapsedTime / 60)),
        totalVolumeKg: 0,
        completedSetsCount: 0,
        totalSetsCount: activeExercises.reduce((acc, e) => acc + e.sets, 0),
        newPRs: [],
        earnedXP: 100,
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-[var(--color-bg)] z-50 flex flex-col font-sans overflow-hidden">
      {/* ── HEADER LIVE CON STATO OFFLINE & SYNC DISCRETO CON SUPPORTO SAFE AREA iOS ── */}
      <div className="bg-[var(--color-surface)]/95 backdrop-blur-xl border-b border-[var(--color-border)] px-3.5 sm:px-4 pt-[calc(0.875rem+env(safe-area-inset-top,0px))] pb-3.5 sm:pb-4 flex items-center justify-between shadow-md relative z-20">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              flushAutosave();
              onClose();
            }}
            className="p-2 -ml-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded-full bg-[var(--color-surface-strong)] hover:bg-[var(--color-panel)] transition-colors cursor-pointer"
            title="Chiudi sessione"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-black text-[var(--color-text)] line-clamp-1 leading-tight">{workout.title}</h1>
            <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-primary)]">
              <span className="flex items-center gap-1 font-bold">
                <Clock className="w-3 h-3" />
                {formatTime(elapsedTime)}
              </span>

              {/* STATO SYNC / OFFLINE DISCRETO */}
              <span className="text-[10px] text-[var(--color-text-muted)] font-sans flex items-center gap-1 border-l border-[var(--color-border)] pl-2">
                {isOnline ? (
                  <span className="flex items-center gap-1 text-emerald-600 font-bold" title={lastSavedText}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="hidden sm:inline">{lastSavedText}</span>
                    <span className="sm:hidden">Salvato</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-600 font-bold">
                    <WifiOff className="w-3 h-3 text-amber-600" />
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
          className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-slate-950 px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 shadow-md active:scale-95 transition-all disabled:opacity-50 cursor-pointer shrink-0"
        >
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
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

      {/* QUICK ACTIONS BANNER: APPLICA TUTTI I CARICHI PRECEDENTI */}
      {hasAnyPreviousHistory && !isHistoryBannerDismissed && (
        <div className="bg-[var(--color-surface-strong)] border-b border-[var(--color-border)] px-4 py-2 flex items-center justify-between gap-2.5 text-xs shadow-sm shrink-0 transition-all animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-sky-600 font-bold min-w-0">
            <History className="w-4 h-4 text-sky-600 shrink-0" />
            <span className="truncate">Storico carichi precedenti disponibile</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleApplyAllPreviousLoads}
              className="px-3 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-700 hover:text-sky-800 border border-sky-500/40 rounded-xl text-xs font-black flex items-center gap-1.5 shrink-0 transition-all active:scale-95 cursor-pointer shadow-sm"
              title="Pre-compila automaticamente i carichi dell'ultima volta su tutti gli esercizi di oggi"
            >
              <Zap className="w-3.5 h-3.5 fill-current text-sky-600" />
              <span>Pre-compila tutti i carichi</span>
            </button>
            <button
              type="button"
              onClick={() => setIsHistoryBannerDismissed(true)}
              className="p-1.5 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-panel)] transition-all cursor-pointer"
              title="Nascondi questo avviso"
              aria-label="Chiudi avviso storico carichi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* SCROLLABLE EXERCISES LIST */}
      <div className="flex-1 overflow-y-auto p-4 pb-32 space-y-4 bg-[var(--color-bg)]">
        {activeExercises.map((ex, idx) => {
          const isExpanded = Boolean(expandedExerciseMap[idx]);
          const isCompleted = Boolean(completedSets[ex.id]?.length === ex.sets && completedSets[ex.id].every(Boolean));

          return (
            <React.Fragment key={ex.id}>
              <ExerciseCard
                exercise={ex}
                index={idx}
                isActive={isExpanded}
                isCompleted={isCompleted}
                logs={logs[ex.id] || []}
                completedSetsMap={completedSets[ex.id] || []}
                noteFeedback={exerciseNotes[ex.id] || ''}
                previousHistory={previousHistoryMap[ex.id] || previousHistoryMap[ex.name.toLowerCase().trim()]}
                onToggleActive={() => handleToggleExerciseActive(idx)}
                onLogChange={(setIdx, field, val) => handleLogChange(ex.id, setIdx, field, val)}
                onNoteFeedbackChange={(val) => handleNoteChange(ex.id, val)}
                onToggleSetComplete={(setIdx) => handleToggleSetComplete(ex.id, setIdx, ex.rest_seconds)}
              />
            </React.Fragment>
          );
        })}
      </div>

      {/* ── QUESTIONARIO POST-ALLENAMENTO MODAL ── */}
      {showQuestionnaireModal && (() => {
        let totalSetsPlanned = 0;
        let setsWithWeightAndReps = 0;
        let emptyExercisesCount = 0;

        activeExercises.forEach((ex) => {
          totalSetsPlanned += ex.sets;
          const exLogs = logs[ex.id] || [];
          let exerciseHasAnyWeight = false;

          for (let i = 0; i < ex.sets; i++) {
            const l = exLogs[i];
            const w = parseFloat(l?.weight || '') || 0;
            const r = parseInt(l?.reps || '', 10) || 0;
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
            onClose();
          }}
        />
      )}
    </div>
  );
};
