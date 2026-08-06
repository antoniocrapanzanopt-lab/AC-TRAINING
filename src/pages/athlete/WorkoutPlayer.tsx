import React, { useState, useEffect } from 'react';
import { X, Check, Clock, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { WorkoutTemplate, WorkoutExercise } from '../../types/workout';
import { useWorkouts } from '../../context/WorkoutsContext';
import { useToast } from '../../context/ToastContext';

interface WorkoutPlayerProps {
  workout: WorkoutTemplate;
  exercises: WorkoutExercise[];
  onClose: () => void;
}

export const WorkoutPlayer: React.FC<WorkoutPlayerProps> = ({ workout, exercises, onClose }) => {
  const { startWorkoutSession, endWorkoutSession, saveExerciseLogs } = useWorkouts();
  const { showSuccess, showError } = useToast();
  
  const [activeExerciseIdx, setActiveExerciseIdx] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // LOGS: Salviamo i dati immessi per ogni set
  const [logs, setLogs] = useState<Record<string, { reps: string, weight: string, rpe: string }[]>>({});

  // Inizializza i logs vuoti
  useEffect(() => {
    const initialLogs: any = {};
    exercises.forEach(ex => {
      initialLogs[ex.id] = Array(ex.sets).fill({ reps: '', weight: '', rpe: '' });
    });
    setLogs(initialLogs);
  }, [exercises]);

  // Avvia la sessione nel DB quando si apre il player
  useEffect(() => {
    const initSession = async () => {
      const { session, error } = await startWorkoutSession(workout.id);
      if (error) {
        showError('Errore avvio sessione: ' + error);
      } else if (session) {
        setSessionId(session.id);
      }
    };
    initSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cronometro Allenamento Globale
  useEffect(() => {
    let interval: any;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Cronometro Recupero Tra Serie
  useEffect(() => {
    let interval: any;
    if (restTimer !== null && restTimer > 0) {
      interval = setInterval(() => {
        setRestTimer(prev => (prev! > 0 ? prev! - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
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

  const finishSet = (restSeconds: number) => {
    setRestTimer(restSeconds);
    // Vibrate device if possible to notify start of rest (mock)
    if (navigator.vibrate) navigator.vibrate(100);
  };

  const finishWorkout = async () => {
    if (!sessionId) {
      showError('Nessuna sessione attiva trovata');
      onClose();
      return;
    }

    setIsTimerRunning(false);
    setIsSaving(true);

    try {
      // 1. Prepara i log
      const logsToSave: any[] = [];
      exercises.forEach(ex => {
        const exLogs = logs[ex.id] || [];
        exLogs.forEach((setLog, idx) => {
          // Salva solo le serie in cui è stato inserito almeno un dato
          if (setLog.reps || setLog.weight) {
            logsToSave.push({
              session_id: sessionId,
              exercise_id: ex.id,
              set_number: idx + 1,
              reps_completed: setLog.reps ? parseInt(setLog.reps) : null,
              weight_kg: setLog.weight ? parseFloat(setLog.weight) : null,
              notes: setLog.rpe ? `RPE: ${setLog.rpe}` : null,
            });
          }
        });
      });

      // 2. Salva i log su supabase
      if (logsToSave.length > 0) {
        const { error: logsError } = await saveExerciseLogs(logsToSave);
        if (logsError) throw new Error(logsError);
      }

      // 3. Chiudi la sessione
      const { error: sessionError } = await endWorkoutSession(sessionId);
      if (sessionError) throw new Error(sessionError);

      showSuccess('Allenamento completato e salvato!');
      onClose();
    } catch (err: any) {
      console.error(err);
      showError('Errore durante il salvataggio: ' + err.message);
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
          onClick={finishWorkout}
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
            <div 
              key={ex.id} 
              className={`rounded-2xl transition-all duration-300 overflow-hidden border ${isActive ? 'bg-slate-900 border-[var(--color-primary)] shadow-lg shadow-[var(--color-primary)]/10' : 'bg-slate-900/50 border-slate-800 opacity-60'}`}
            >
              {/* Exercise Header */}
              <div 
                className="p-4 flex items-start justify-between cursor-pointer"
                onClick={() => setActiveExerciseIdx(idx)}
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${isActive ? 'bg-[var(--color-primary)] text-black' : isCompleted ? 'bg-green-500/20 text-green-400' : 'bg-slate-800 text-slate-400'}`}>
                    {isCompleted ? <Check className="w-4 h-4" /> : idx + 1}
                  </div>
                  <div>
                    <h3 className={`font-bold leading-tight mb-1 pr-2 ${isActive ? 'text-white text-base' : 'text-slate-300 text-sm'}`}>
                      {ex.name}
                    </h3>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      <span className="px-2 py-0.5 bg-slate-800 rounded text-[10px] text-slate-300 font-mono">
                        {ex.sets}x{ex.reps_target}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-800 rounded text-[10px] text-slate-300 font-mono">
                        Rec: {ex.rest_seconds}s
                      </span>
                    </div>
                  </div>
                </div>
                {isActive ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
              </div>

              {/* Active Exercise Content (Inputs for Sets) */}
              {isActive && (
                <div className="px-4 pb-5 pt-2 border-t border-slate-800/50 bg-slate-900/30">
                  
                  {ex.notes && (
                    <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex gap-2 text-xs text-blue-200">
                      <Info className="w-4 h-4 shrink-0 text-blue-400" />
                      <p className="leading-relaxed">{ex.notes}</p>
                    </div>
                  )}

                  {/* Header Tabella Sets */}
                  <div className="grid grid-cols-12 gap-2 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 text-center">
                    <div className="col-span-2">Set</div>
                    <div className="col-span-3">Reps</div>
                    <div className="col-span-3">Kg</div>
                    <div className="col-span-2">RPE</div>
                    <div className="col-span-2"></div>
                  </div>

                  <div className="space-y-2">
                    {Array.from({ length: ex.sets }).map((_, setIdx) => {
                      const setLog = logs[ex.id]?.[setIdx] || { reps: '', weight: '', rpe: '' };
                      
                      return (
                        <div key={setIdx} className="grid grid-cols-12 gap-2 items-center bg-slate-900 border border-slate-700 rounded-xl p-1.5 transition-colors focus-within:border-[var(--color-primary)]">
                          <div className="col-span-2 text-center text-xs font-bold text-slate-300 bg-slate-800 py-2 rounded-lg">
                            {setIdx + 1}
                          </div>
                          <div className="col-span-3">
                            <input 
                              type="number" 
                              placeholder={ex.reps_target}
                              value={setLog.reps}
                              onChange={(e) => handleLogChange(ex.id, setIdx, 'reps', e.target.value)}
                              className="w-full bg-transparent text-center text-sm text-white font-bold placeholder:text-slate-600 focus:outline-none"
                              inputMode="numeric"
                            />
                          </div>
                          <div className="col-span-3">
                            <input 
                              type="number" 
                              placeholder="0"
                              value={setLog.weight}
                              onChange={(e) => handleLogChange(ex.id, setIdx, 'weight', e.target.value)}
                              className="w-full bg-transparent text-center text-sm text-[var(--color-primary)] font-bold placeholder:text-slate-600 focus:outline-none"
                              inputMode="decimal"
                            />
                          </div>
                          <div className="col-span-2">
                            <input 
                              type="number" 
                              placeholder="-"
                              value={setLog.rpe}
                              onChange={(e) => handleLogChange(ex.id, setIdx, 'rpe', e.target.value)}
                              className="w-full bg-transparent text-center text-xs text-white placeholder:text-slate-600 focus:outline-none"
                              inputMode="numeric"
                            />
                          </div>
                          <div className="col-span-2 flex justify-center">
                            <button 
                              onClick={() => finishSet(ex.rest_seconds)}
                              className="w-8 h-8 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center hover:bg-green-500 hover:text-white transition-colors"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-5 flex justify-end">
                    <button 
                      onClick={() => {
                        if (idx < exercises.length - 1) {
                          setActiveExerciseIdx(idx + 1);
                        } else {
                          finishWorkout();
                        }
                      }}
                      className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-700 transition-colors"
                    >
                      {idx < exercises.length - 1 ? 'Esercizio Successivo' : 'Fine Allenamento'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
