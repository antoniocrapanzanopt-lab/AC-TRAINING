import React, { useState, useEffect } from 'react';
import { X, Check, Clock, MessageSquare, Activity, ShieldAlert, Flame, Sparkles } from 'lucide-react';

import { WorkoutTemplate, WorkoutExercise } from '../../types/workout';
import { useWorkouts } from '../../context/WorkoutsContext';
import { useToast } from '../../context/ToastContext';
import { useMetrics } from '../../context/MetricsContext';
import { useAuth } from '../../context/AuthContext';
import { useAthletes } from '../../context/AthletesContext';
import { supabase } from '../../lib/supabase';


import { ExerciseCard } from '../../components/workouts/ExerciseCard';

interface WorkoutPlayerProps {
  workout: WorkoutTemplate;
  exercises: WorkoutExercise[];
  targetAthleteId?: string;
  onClose: () => void;
}

export const WorkoutPlayer: React.FC<WorkoutPlayerProps> = ({ workout, exercises, targetAthleteId, onClose }) => {
  const { startWorkoutSession, endWorkoutSession, saveExerciseLogs } = useWorkouts();
  const { showSuccess, showError } = useToast();
  const { checkAndUpdateAutoPR } = useMetrics();
  const { user } = useAuth();
  const { athletes } = useAthletes();

  // Atleta Corrente
  const currentAthlete = user ? athletes.find(a => a.email && a.email.toLowerCase() === user.email.toLowerCase()) : null;
  const athleteId = targetAthleteId || currentAthlete?.id || user?.athleteId || user?.id;

  const [activeExerciseIdx, setActiveExerciseIdx] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // LOGS: Salviamo i dati immessi per ogni set
  const [logs, setLogs] = useState<Record<string, { reps: string, weight: string, rpe: string }[]>>({});
  // SERIE COMPLETATE: Tracciamento booleano immutabile per ogni esercizio/set
  const [completedSets, setCompletedSets] = useState<Record<string, boolean[]>>({});
  // NOTE FEEDBACK: Note dell'atleta per singolo esercizio
  const [exerciseNotes, setExerciseNotes] = useState<Record<string, string>>({});

  // Questionario Post-Allenamento State
  const [showQuestionnaireModal, setShowQuestionnaireModal] = useState(false);
  const [difficulty, setDifficulty] = useState<number>(3);
  const [jointPain, setJointPain] = useState<number>(1);
  const [pump, setPump] = useState<number>(3);
  const [jointPainNotes, setJointPainNotes] = useState<string>('');

  // Inizializza i logs vuoti
  useEffect(() => {
    const initialLogs: any = {};
    exercises.forEach(ex => {
      initialLogs[ex.id] = Array(ex.sets).fill({ reps: '', weight: '', rpe: '' });
    });
    setLogs(initialLogs);
  }, [exercises]);

  // Avvia la sessione reale su DB o locale
  useEffect(() => {
    const initSession = async () => {
      if (athleteId && workout.id) {
        const { session } = await startWorkoutSession(workout.id, athleteId);
        if (session) setSessionId(session.id);
      }
    };
    initSession();
  }, [athleteId, workout.id, startWorkoutSession]);

  const startTimestampRef = React.useRef<number>(Date.now());
  const restEndTimestampRef = React.useRef<number | null>(null);

  // Cronometro Allenamento Globale
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTimestampRef.current) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Cronometro Recupero Tra Serie (timestamp-based contro il throttling in background)
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
    setLogs(prev => {
      const updatedSets = [...(prev[exerciseId] || [])];
      updatedSets[setIndex] = { ...updatedSets[setIndex], [field]: value };
      return { ...prev, [exerciseId]: updatedSets };
    });
  };

  const handleToggleSetComplete = (exerciseId: string, setIdx: number, restSeconds: number) => {
    setCompletedSets(prev => {
      const currentList = prev[exerciseId] ? [...prev[exerciseId]] : [];
      const isNowCompleted = !currentList[setIdx];
      currentList[setIdx] = isNowCompleted;

      if (isNowCompleted) {
        restEndTimestampRef.current = Date.now() + restSeconds * 1000;
        setRestTimer(restSeconds);
        if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
      }

      return { ...prev, [exerciseId]: currentList };
    });
  };

  const handleOpenFinishFlow = () => {
    if (!sessionId) {
      showError('Nessuna sessione attiva trovata');
      onClose();
      return;
    }
    setShowQuestionnaireModal(true);
  };

  const executeWorkoutSave = async () => {
    setIsTimerRunning(false);
    setIsSaving(true);
    setShowQuestionnaireModal(false);

    try {
      // 1. Prepara i log
      const logsToSave: any[] = [];
      const prResults: string[] = [];

      for (const ex of exercises) {
        const exLogs = logs[ex.id] || [];
        const userFeedback = exerciseNotes[ex.id]?.trim();

        if (userFeedback) {
          try {
            const existingAlerts = JSON.parse(localStorage.getItem('builder_copilot_critical_notes') || '[]');
            const isHighSeverity = /dolore|fastidio|male|pizzico|infortunio|strappo/i.test(userFeedback);
            const newAlert = {
              id: `cn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              athleteId: athleteId || 'ath-local',
              athleteName: currentAthlete ? `${currentAthlete.firstName} ${currentAthlete.lastName}` : (user?.name || 'Atleta'),
              workoutTitle: workout.title,
              weekNumber: ex.week_number || 1,
              dayName: ex.day_name || 'Giorno A',
              exerciseName: ex.name,
              noteText: userFeedback,
              severity: isHighSeverity ? 'high' : 'medium',
              date: 'Oggi'
            };
            localStorage.setItem('builder_copilot_critical_notes', JSON.stringify([newAlert, ...existingAlerts]));
            window.dispatchEvent(new Event('copilot_notes_updated'));

            // Notifica Supabase al coach (pain_reported)
            if (isHighSeverity) {
              try {
                const athleteRec = currentAthlete;
                if (athleteRec?.assignedCoachId) {
                  const athleteName = `${athleteRec.firstName} ${athleteRec.lastName}`.trim();
                  await supabase.from('coach_notifications').insert({
                    coach_id: athleteRec.assignedCoachId,
                    type: 'pain_reported',
                    title: `⚠️ Fastidio segnalato da ${athleteName}`,
                    body: `Esercizio: ${ex.name} — "${userFeedback}"`,
                    athlete_id: athleteRec.id,
                    athlete_name: athleteName,
                  });
                }
              } catch (_) {}
            }
          } catch (e) {}
        }

        for (let idx = 0; idx < exLogs.length; idx++) {
          const setLog = exLogs[idx];
          const repsNum = setLog.reps ? parseInt(setLog.reps) : 0;
          const weightNum = setLog.weight ? parseFloat(setLog.weight) : 0;

          if (repsNum || weightNum || setLog.rpe) {
            const noteParts = [];
            if (setLog.rpe) noteParts.push(`RPE: ${setLog.rpe}`);
            if (userFeedback) noteParts.push(`Feedback: ${userFeedback}`);

            logsToSave.push({
              session_id: sessionId,
              exercise_id: ex.id,
              set_number: idx + 1,
              reps_completed: repsNum || null,
              weight_kg: weightNum || null,
              notes: noteParts.length > 0 ? noteParts.join(' | ') : null,
            });

            // Controllo PR automatico se c'è un atleta connesso
            if (athleteId && weightNum > 0 && repsNum > 0) {
              const prRes = await checkAndUpdateAutoPR(athleteId, ex.id, ex.name, weightNum, repsNum);
              if (prRes.isNewPR) {
                prResults.push(`${ex.name}: ${prRes.calculated1RM} kg 1RM!`);
              }
            }
          }
        }
      }

      // Integratore Questionario nel Copilot dell'IA
      if (jointPain >= 3 || jointPainNotes.trim() !== '' || difficulty >= 4) {
        try {
          const existingAlerts = JSON.parse(localStorage.getItem('builder_copilot_critical_notes') || '[]');
          const isHighSeverity = jointPain >= 4 || /dolore|pizzico|infortunio|male|strappo/i.test(jointPainNotes);
          
          const questionnaireSummary = `Questionario Fine Workout — Fatica: ${difficulty}/5 | Dolori Articolari: ${jointPain}/5 | Pump: ${pump}/5${jointPainNotes.trim() ? ` | Dettagli: "${jointPainNotes.trim()}"` : ''}`;

          const firstEx = exercises[0];
          const questionnaireAlert = {
            id: `cn-q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            athleteId: athleteId || 'ath-local',
            athleteName: currentAthlete ? `${currentAthlete.firstName} ${currentAthlete.lastName}` : (user?.name || 'Atleta'),
            workoutTitle: workout.title,
            weekNumber: firstEx?.week_number || 1,
            dayName: firstEx?.day_name || 'Giorno A',
            exerciseName: 'Questionario Fine Workout (Dolori Articolari)',
            noteText: questionnaireSummary,
            severity: isHighSeverity ? 'high' : 'medium',
            date: 'Oggi'
          };
          localStorage.setItem('builder_copilot_critical_notes', JSON.stringify([questionnaireAlert, ...existingAlerts]));
          window.dispatchEvent(new Event('copilot_notes_updated'));

          // Notifica Supabase al coach (questionnaire_submitted)
          try {
            const athleteRec = currentAthlete;
            if (athleteRec?.assignedCoachId) {
              const athleteName = `${athleteRec.firstName} ${athleteRec.lastName}`.trim();
              await supabase.from('coach_notifications').insert({
                coach_id: athleteRec.assignedCoachId,
                type: 'questionnaire_submitted',
                title: `📝 Questionario post-workout da ${athleteName}`,
                body: `Fatica: ${difficulty}/5 | Dolori: ${jointPain}/5 | Pump: ${pump}/5${jointPainNotes.trim() ? ` | "${jointPainNotes.trim()}"` : ''}`,
                athlete_id: athleteRec.id,
                athlete_name: athleteName,
              });
            }
          } catch (_) {}
        } catch (e) {
          console.warn('Errore salvataggio alert questionario copilot:', e);
        }
      }

      // 2. Salva i log su supabase
      if (logsToSave.length > 0) {
        const { error: logsError } = await saveExerciseLogs(logsToSave);
        if (logsError) throw new Error(`Errore salvataggio esercizi: ${logsError}`);
      }

      // 3. Chiudi la sessione con RPE complessivo del questionario
      const questionnaireNotes = `Questionario: Fatica ${difficulty}/5, Dolore Articolare ${jointPain}/5, Pump ${pump}/5${jointPainNotes ? ` — Note: ${jointPainNotes}` : ''}`;
      const { error: sessionError } = await endWorkoutSession(sessionId!, questionnaireNotes, difficulty * 2);
      if (sessionError) throw new Error(`Errore chiusura sessione: ${sessionError}`);

      // 4. Aggiorna il progresso locale per nascondere il giorno appena completato
      try {
        const week = (exercises[0] as any)?.week_number || 1;
        const day = (exercises[0] as any)?.day_name || 'Giorno A';
        const progressKey = `builder_progress_${athleteId}_${workout.id}`;
        const existing = JSON.parse(localStorage.getItem(progressKey) || '{}');
        existing[`${week}-${day}`] = true;
        localStorage.setItem(progressKey, JSON.stringify(existing));
      } catch (e) {
        console.warn('Impossibile salvare il progresso locale', e);
      }

      if (prResults.length > 0) {
        showSuccess('Nuovo Record Personale (PR)! 🎉', prResults.join(' | '));
      } else {
        showSuccess('Allenamento e Questionario completati!');
      }

      setIsSaving(false);
      onClose();
    } catch (err: any) {
      console.error('Errore durante il salvataggio dell\'allenamento:', err);
      showError('Errore di Salvataggio', err.message || 'Impossibile salvare i dati della sessione sul server. Riprova.');
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col font-sans overflow-hidden">
      
      {/* HEADER LIVE */}
      <div className="bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between shadow-lg relative z-20">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 -ml-2 text-slate-400 hover:text-white rounded-full bg-slate-800/50">
            <X className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-bold text-white line-clamp-1 leading-tight">{workout.title}</h1>
            <div className="flex items-center gap-1.5 text-xs font-mono text-[var(--color-primary)]">
              <Clock className="w-3 h-3" />
              {formatTime(elapsedTime)}
            </div>
          </div>
        </div>
        <button 
          onClick={handleOpenFinishFlow}
          disabled={isSaving}
          className="bg-[var(--color-primary)] text-black px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md active:scale-95 transition-transform disabled:opacity-50"
        >
          {isSaving ? (
             <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
          ) : (
             <Check className="w-4 h-4" />
          )}
          {isSaving ? 'Salvataggio...' : 'Fine'}
        </button>
      </div>

      {/* REST TIMER OVERLAY */}
      {restTimer !== null && restTimer > 0 && (
        <div className="bg-blue-500/20 border-b border-blue-500/30 p-3 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 animate-pulse">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Recupero Attivo</p>
              <p className="text-xl font-bold font-mono text-white">{formatTime(restTimer)}</p>
            </div>
          </div>
          <button 
            onClick={() => setRestTimer(0)}
            className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-xl text-xs font-bold"
          >
            Salta
          </button>
        </div>
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
                onToggleActive={() => setActiveExerciseIdx(isActive ? -1 : idx)}
                onLogChange={(setIdx, field, val) => handleLogChange(ex.id, setIdx, field, val)}
                onNoteFeedbackChange={(val) => setExerciseNotes(prev => ({ ...prev, [ex.id]: val }))}
                onToggleSetComplete={(setIdx) => handleToggleSetComplete(ex.id, setIdx, ex.rest_seconds)}
              />

              {isActive && (
                <div className="flex justify-end pt-1">
                  <button 
                    onClick={() => {
                      if (idx < exercises.length - 1) {
                        setActiveExerciseIdx(idx + 1);
                      } else {
                        handleOpenFinishFlow();
                      }
                    }}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors shadow-md cursor-pointer"
                  >
                    {idx < exercises.length - 1 ? 'Esercizio Successivo →' : 'Fine Allenamento'}
                  </button>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* MODALE QUESTIONARIO POST-ALLENAMENTO */}
      {showQuestionnaireModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl space-y-5 p-6 animate-in fade-in zoom-in duration-200">
            {/* Header Modal */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/30">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-black text-white">Questionario Fine Allenamento</h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Rispondi a 3 veloci domande per aggiornare l'<strong>AI Athlete Training Copilot</strong>.
                </p>
              </div>
              <button 
                onClick={() => setShowQuestionnaireModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-800/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
              {/* Domanda 1: Fatica & Difficoltà */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-amber-400" />
                    1. Quanto è stato difficile e faticoso l'allenamento?
                  </label>
                  <span className="text-xs font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/30">
                    {difficulty}/5
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setDifficulty(val)}
                      className={`py-2 rounded-xl font-extrabold text-xs transition-all border ${
                        difficulty === val
                          ? 'bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/20 scale-105'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 px-1 font-medium">
                  <span>🟢 Molto Leggero</span>
                  <span>🔴 Sfinimento</span>
                </div>
              </div>

              {/* Domanda 2: Dolori Articolari */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    2. Dolori articolari o fastidi?
                  </label>
                  <span className={`text-xs font-black px-2 py-0.5 rounded-lg border ${
                    jointPain >= 4 ? 'text-rose-400 bg-rose-500/10 border-rose-500/30' : jointPain === 3 ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                  }`}>
                    {jointPain}/5
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setJointPain(val)}
                      className={`py-2 rounded-xl font-extrabold text-xs transition-all border ${
                        jointPain === val
                          ? val >= 4
                            ? 'bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-500/20 scale-105'
                            : val === 3
                            ? 'bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/20 scale-105'
                            : 'bg-emerald-500 text-black border-emerald-400 shadow-md shadow-emerald-500/20 scale-105'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 px-1 font-medium">
                  <span>🟢 Nessun dolore (1)</span>
                  <span>🔴 Dolore Forte (5)</span>
                </div>
              </div>

              {/* Domanda 3: Pump Post Allenamento */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <Flame className="w-4 h-4 text-emerald-400" />
                    3. Pump muscolare post allenamento?
                  </label>
                  <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                    {pump}/5
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setPump(val)}
                      className={`py-2 rounded-xl font-extrabold text-xs transition-all border ${
                        pump === val
                          ? 'bg-emerald-500 text-black border-emerald-400 shadow-md shadow-emerald-500/20 scale-105'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 px-1 font-medium">
                  <span>🔴 Scarso (1)</span>
                  <span>🔥 Massimo Pump (5)</span>
                </div>
              </div>

              {/* Note Dolori Articolari */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[var(--color-primary)]" />
                  Note Dolori Articolari & Dettagli per l'AI Copilot
                </label>
                <textarea
                  rows={2}
                  value={jointPainNotes}
                  onChange={(e) => setJointPainNotes(e.target.value)}
                  placeholder="Es. Pizzico alla spalla destra durante la panca o fastidio al ginocchio..."
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-[var(--color-primary)] transition-colors resize-none"
                />
              </div>
            </div>

            {/* Footer Modal Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
              <button
                onClick={() => setShowQuestionnaireModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white border border-slate-800 hover:bg-slate-800 transition-colors"
              >
                Torna al Workout
              </button>
              <button
                onClick={executeWorkoutSave}
                disabled={isSaving}
                className="flex-1 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-black font-black text-xs rounded-xl shadow-lg shadow-[var(--color-primary)]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>{isSaving ? 'Salvataggio...' : 'Conferma & Salva Allenamento'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
