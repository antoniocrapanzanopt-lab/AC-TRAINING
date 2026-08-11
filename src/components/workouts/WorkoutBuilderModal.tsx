import React, { useState, useEffect } from 'react';
import { X, Plus, Save, Trash2, GripVertical, Dumbbell, Calendar, Clock, Copy, Sliders, Repeat, Sparkles, ArrowLeft } from 'lucide-react';
import { WorkoutTemplate, WorkoutExercise } from '../../types/workout';
import { useWorkouts } from '../../context/WorkoutsContext';
import { useExercises } from '../../context/ExercisesContext';
import { useAthletes } from '../../context/AthletesContext';
import { useToast } from '../../context/ToastContext';
import { calculateEstimatedWorkoutTime } from '../../utils/workoutUtils';
import { AICoPilotModal } from './AICoPilotModal';
import { AIWorkoutExercise } from '../../lib/ai/workoutGenerator';

interface WorkoutBuilderModalProps {
  athleteId?: string;
  initialWorkout?: WorkoutTemplate | null;
  onClose: () => void;
  onBack?: () => void;
}

export const WorkoutBuilderModal: React.FC<WorkoutBuilderModalProps> = ({ athleteId, initialWorkout, onClose, onBack }) => {
  const { createWorkoutTemplate, updateWorkoutTemplate, assignWorkoutToAthlete, getExercisesForWorkout, folders, forkWorkoutForAthlete, forkWorkoutForAllAssigned } = useWorkouts();
  const { exercises: libraryExercises } = useExercises();
  const { athletes } = useAthletes();
  const { showSuccess, showError } = useToast();
  
  const currentAthlete = athleteId ? athletes.find(a => a.id === athleteId) : null;

  const [title, setTitle] = useState(initialWorkout?.title || '');
  const [description, setDescription] = useState(initialWorkout?.description || '');
  const [folderId, setFolderId] = useState<string | null>(initialWorkout?.folder_id || null);
  const [totalWeeks, setTotalWeeks] = useState<number>(initialWorkout?.total_weeks || 1);
  const [activeWeek, setActiveWeek] = useState<number>(1);
  const [activeDay, setActiveDay] = useState<string>('Giorno A');
  const [daysList, setDaysList] = useState<string[]>(['Giorno A', 'Giorno B']);

  const [exercises, setExercises] = useState<Partial<WorkoutExercise>[]>([
    { name: '', sets: 3, reps_target: '10', rest_seconds: 60, week_number: 1, day_name: 'Giorno A' }
  ]);
  const [expandedExerciseIndex, setExpandedExerciseIndex] = useState<number | null>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isCoPilotOpen, setIsCoPilotOpen] = useState(false);
  const [showTemplateUpdatePrompt, setShowTemplateUpdatePrompt] = useState(false);

  useEffect(() => {
    if (initialWorkout) {
      getExercisesForWorkout(initialWorkout.id).then((fetchedExercises) => {
        if (fetchedExercises && fetchedExercises.length > 0) {
          setExercises(fetchedExercises);
          
          // Estrai giorni unici
          const uniqueDays = Array.from(new Set(fetchedExercises.map(e => e.day_name || 'Giorno A')));
          if (uniqueDays.length > 0) setDaysList(uniqueDays);
          
          // Estrai max settimane
          const maxW = Math.max(...fetchedExercises.map(e => e.week_number || 1), initialWorkout.total_weeks || 1);
          setTotalWeeks(maxW);
        }
      }).catch((err) => {
        console.error("Error fetching exercises:", err);
      });
    }
  }, [initialWorkout]);

  // Esercizi filtrati per la settimana ed il giorno correntemente selezionati
  const currentWeekDayExercises = exercises.filter(
    ex => (ex.week_number || 1) === activeWeek && 
          (ex.day_name || 'Giorno A').trim().toLowerCase() === activeDay.trim().toLowerCase()
  );

  const estimatedTime = calculateEstimatedWorkoutTime(currentWeekDayExercises);

  const handleAIGenerated = (aiExercises: AIWorkoutExercise[]) => {
    // Normalizzazione pulita dei nomi del giorno (es. da "Giorno A - Push" a "Giorno A")
    const mapped = aiExercises.map(ex => {
      let cleanDay = (ex.day_name || 'Giorno A').trim();
      const match = cleanDay.match(/(Giorno\s+[A-Z0-9]+)/i);
      if (match) {
        // Formatta come "Giorno A", "Giorno B"
        const dayLetter = match[1].split(/\s+/)[1].toUpperCase();
        cleanDay = `Giorno ${dayLetter}`;
      }

      return {
        ...ex,
        day_name: cleanDay,
        is_time_based: false,
      };
    });

    setExercises(mapped);

    // Aggiorna le settimane totali in base al massimo generato
    const maxW = Math.max(...mapped.map(e => e.week_number || 1), 1);
    setTotalWeeks(maxW);

    // Aggiorna i giorni unici generati
    const uniqueDays = Array.from(new Set(mapped.map(e => e.day_name || 'Giorno A')));
    if (uniqueDays.length > 0) {
      setDaysList(uniqueDays);
      setActiveDay(uniqueDays[0]); // Seleziona il primo giorno generato
    }
    setActiveWeek(1);
    setExpandedExerciseIndex(null); // Chiudi espansioni per vista pulita
  };

  const addExercise = () => {
    const newEx: Partial<WorkoutExercise> = {
      name: '',
      sets: 3,
      reps_target: '10',
      rest_seconds: 60,
      week_number: activeWeek,
      day_name: activeDay,
      is_time_based: false,
    };
    setExercises([...exercises, newEx]);
    setExpandedExerciseIndex(exercises.length);
  };

  const updateExercise = (globalIndex: number, field: keyof WorkoutExercise, value: any) => {
    setExercises(prev => {
      const copy = [...prev];
      copy[globalIndex] = { ...copy[globalIndex], [field]: value };
      return copy;
    });
  };

  const updateExerciseFields = (globalIndex: number, fields: Partial<WorkoutExercise>) => {
    setExercises(prev => {
      const copy = [...prev];
      copy[globalIndex] = { ...copy[globalIndex], ...fields };
      return copy;
    });
  };

  const removeExercise = (globalIndex: number) => {
    const newEx = exercises.filter((_, i) => i !== globalIndex);
    setExercises(newEx);
  };

  const addDay = () => {
    const nextChar = String.fromCharCode(65 + daysList.length); // A, B, C, D...
    const newDayName = `Giorno ${nextChar}`;
    if (!daysList.includes(newDayName)) {
      setDaysList([...daysList, newDayName]);
      setActiveDay(newDayName);
    }
  };

  const addWeek = () => {
    const newWeekNum = totalWeeks + 1;
    setTotalWeeks(newWeekNum);
    setActiveWeek(newWeekNum);
  };

  const cloneWeek = (sourceWeekNum: number, targetWeekNum: number) => {
    const sourceExercises = exercises.filter(ex => (ex.week_number || 1) === sourceWeekNum);
    if (sourceExercises.length === 0) {
      showError(`Nessun esercizio presente nella Settimana ${sourceWeekNum} da clonare.`);
      return;
    }

    // Rimuovi eventuali esercizi esistenti nella settimana target
    const otherExercises = exercises.filter(ex => (ex.week_number || 1) !== targetWeekNum);

    // Clona gli esercizi cambiando il week_number
    const cloned = sourceExercises.map(ex => ({
      ...ex,
      id: undefined, // nuovo ID generato dal backend
      week_number: targetWeekNum,
    }));

    setExercises([...otherExercises, ...cloned]);
    showSuccess(`Settimana ${sourceWeekNum} clonata con successo in Settimana ${targetWeekNum}! Ora puoi regolare le progressioni.`);
  };

  const handleSave = async (globalUpdateMode?: 'ALL' | 'NEW_ONLY') => {
    if (!title.trim()) {
      showError('Inserisci un titolo per la scheda');
      return;
    }
    
    const validExercises = exercises.filter(ex => ex.name?.trim() !== '');
    if (validExercises.length === 0) {
      showError('Inserisci almeno un esercizio valido');
      return;
    }

    // Modalità "Edit Template" dal catalogo
    if (initialWorkout && initialWorkout.is_template && !athleteId && !globalUpdateMode) {
      setShowTemplateUpdatePrompt(true);
      return;
    }

    setIsSaving(true);

    try {
      if (initialWorkout) {
        if (athleteId && initialWorkout.is_template) {
          // Edit di un template dalla pagina di un singolo Atleta -> FORK!
          const { success, error } = await forkWorkoutForAthlete(
            initialWorkout.id,
            athleteId,
            { title, description, total_weeks: totalWeeks, estimated_duration_minutes: estimatedTime.display },
            validExercises
          );
          if (!success) throw new Error(error);
          showSuccess('Copia locale creata e assegnata all\'atleta con successo!');
        } else {
          // Edit di un template dal catalogo (con globalUpdateMode) o di una scheda già privata
          if (globalUpdateMode === 'NEW_ONLY') {
            await forkWorkoutForAllAssigned(initialWorkout.id);
          }
          const { success, error } = await updateWorkoutTemplate(
            initialWorkout.id,
            { title, description, total_weeks: totalWeeks, folder_id: folderId, estimated_duration_minutes: estimatedTime.display },
            validExercises
          );
          if (!success) throw new Error(error);
          showSuccess(globalUpdateMode === 'NEW_ONLY' ? 'Template aggiornato (le vecchie assegnazioni sono state congelate).' : 'Scheda aggiornata con successo!');
        }
      } else {
        // Creazione nuova scheda
        const { success, error, workoutId } = await createWorkoutTemplate(
          { title, description, is_template: !athleteId, total_weeks: totalWeeks, folder_id: folderId, estimated_duration_minutes: estimatedTime.display }, 
          validExercises
        );

        if (!success) throw new Error(error);

        if (workoutId && athleteId) {
          await assignWorkoutToAthlete(athleteId, workoutId);
          showSuccess('Scheda creata e assegnata con successo!');
        } else {
          showSuccess('Scheda salvata nel catalogo!');
        }
      }
      
      onClose();
    } catch (err: any) {
      console.error(err);
      showError('Errore durante il salvataggio: ' + (err.message || ''));
    } finally {
      setIsSaving(false);
      setShowTemplateUpdatePrompt(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-5xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl shadow-2xl flex flex-col h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-panel-border)]">
          <div className="flex items-center gap-3">
            {onBack && (
              <button 
                onClick={onBack}
                className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
                title="Indietro"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-[var(--color-primary)]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex flex-col sm:flex-row sm:items-center gap-2">
                {athleteId ? (
                  <>
                    <span className="text-sm font-bold text-[var(--color-primary)] uppercase tracking-wide">
                      Stai modificando la scheda di:
                    </span>
                    <span>{currentAthlete ? `${currentAthlete.firstName} ${currentAthlete.lastName}` : 'Atleta'}</span>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-bold text-amber-400 uppercase tracking-wide">
                      Modello Master (Template):
                    </span>
                    <span>{initialWorkout ? 'Modifica Programma' : 'Costruttore Programma Avanzato'}</span>
                  </>
                )}
              </h2>
              <p className="text-sm text-slate-400">
                {athleteId ? (
                  `Le modifiche apportate influenzeranno solo ed esclusivamente la scheda di questo atleta.`
                ) : (
                  `Gestisci giorni, settimane, carichi target e progressioni parametrizzate`
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCoPilotOpen(true)}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-300 hover:text-indigo-200 hover:bg-indigo-500/30 rounded-xl transition-all font-bold text-xs"
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Genera con IA
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Info Generali Scheda */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-800/30 p-5 rounded-xl border border-slate-700/50">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">Titolo del Programma</label>
              <input
                type="text"
                placeholder="es. Ipertrofia & Forza - Mesociclo 1"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">Cartella di Archiviazione</label>
              <select
                value={folderId || ''}
                onChange={e => setFolderId(e.target.value || null)}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-[var(--color-primary)] font-bold text-xs"
              >
                <option value="">Nessuna Cartella (Principale)</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id}>📁 {f.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">Durata (Settimane)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={totalWeeks}
                  onChange={e => setTotalWeeks(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-center font-bold focus:outline-none focus:border-[var(--color-primary)]"
                />
                <span className="text-xs text-slate-400 font-semibold">sett.</span>
              </div>
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">Descrizione & Obiettivi</label>
              <textarea
                placeholder="Note generali sul mesociclo, focus e indicazioni generali per l'atleta..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-[var(--color-primary)] transition-colors resize-none"
              />
            </div>
          </div>

          {/* BARRA TAB: SETTIMANE */}
          <div className="border-b border-slate-800 pb-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[var(--color-primary)]" />
                Seleziona Settimana
              </span>

              {activeWeek > 1 && (
                <button
                  onClick={() => cloneWeek(1, activeWeek)}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Clona Settimana 1 in Settimana {activeWeek}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pt-1">
              {Array.from({ length: totalWeeks }).map((_, wIdx) => {
                const wNum = wIdx + 1;
                const isCurrent = activeWeek === wNum;
                const countEx = exercises.filter(e => (e.week_number || 1) === wNum).length;

                return (
                  <button
                    key={wNum}
                    onClick={() => setActiveWeek(wNum)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${isCurrent ? 'bg-[var(--color-primary)] text-black shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                  >
                    <span>Settimana {wNum}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${isCurrent ? 'bg-black/20 text-black' : 'bg-slate-900 text-slate-400'}`}>
                      {countEx} es.
                    </span>
                  </button>
                );
              })}

              <button
                onClick={addWeek}
                className="px-3 py-2 bg-slate-800/60 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors border border-dashed border-slate-700"
              >
                <Plus className="w-3.5 h-3.5" /> Settimana
              </button>
            </div>
          </div>

          {/* BARRA SUB-TAB: GIORNI DI ALLENAMENTO */}
          <div className="flex items-center justify-between bg-slate-900/60 p-2 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 overflow-x-auto">
              {daysList.map(dName => {
                const isCurrentDay = activeDay === dName;
                const exCountDay = exercises.filter(e => (e.week_number || 1) === activeWeek && (e.day_name || 'Giorno A') === dName).length;

                return (
                  <button
                    key={dName}
                    onClick={() => setActiveDay(dName)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${isCurrentDay ? 'bg-slate-700 text-white border border-slate-600' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                  >
                    <span>{dName}</span>
                    <span className="text-[10px] opacity-60">({exCountDay})</span>
                  </button>
                );
              })}

              <button
                onClick={addDay}
                className="px-2.5 py-1.5 text-xs font-bold text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded-lg transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Giorno
              </button>
            </div>
          </div>

          {/* LISTA ESERCIZI DEL GIORNO SELEZIONATO */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>{activeDay}</span>
                  <span className="text-xs font-normal text-slate-400">(Settimana {activeWeek})</span>
                </h3>

                {/* Badge Durata Stimata */}
                {currentWeekDayExercises.length > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-full text-xs font-bold shadow-sm">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{estimatedTime.display}</span>
                  </div>
                )}
              </div>
              <button 
                onClick={addExercise}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[var(--color-primary)] text-black hover:bg-[var(--color-primary-hover)] rounded-lg transition-colors shadow-md"
              >
                <Plus className="w-4 h-4" />
                Aggiungi Esercizio
              </button>
            </div>

            {currentWeekDayExercises.length === 0 ? (
              <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-xl p-8 text-center">
                <p className="text-sm text-slate-400 mb-3">Nessun esercizio inserito per {activeDay} nella Settimana {activeWeek}.</p>
                <button
                  onClick={addExercise}
                  className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-700 transition-colors"
                >
                  + Inserisci Primo Esercizio
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {exercises.map((ex, globalIdx) => {
                  if ((ex.week_number || 1) !== activeWeek || (ex.day_name || 'Giorno A') !== activeDay) {
                    return null;
                  }

                  const isExpanded = expandedExerciseIndex === globalIdx;

                  return (
                    <div 
                      key={globalIdx} 
                      className={`bg-slate-900 border rounded-2xl transition-all overflow-hidden ${isExpanded ? 'border-[var(--color-primary)]/60 shadow-lg shadow-[var(--color-primary)]/5' : 'border-slate-800 hover:border-slate-700'}`}
                    >
                      {/* Standard Header Row */}
                      <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-800/40">
                        <div className="flex items-center gap-3 flex-1 w-full">
                          <div className="cursor-move text-slate-600 hidden sm:block">
                            <GripVertical className="w-4 h-4" />
                          </div>
                          
                          <div className="flex-1">
                            <input
                              type="text"
                              placeholder="Nome esercizio (es. Panca Piana)"
                              value={ex.name || ''}
                              onChange={e => {
                                const val = e.target.value;
                                const matched = libraryExercises.find(libEx => libEx.name.trim().toLowerCase() === val.trim().toLowerCase());
                                if (matched && matched.instructions) {
                                  updateExerciseFields(globalIdx, { name: val, notes: matched.instructions });
                                } else {
                                  updateExerciseFields(globalIdx, { name: val });
                                }
                              }}
                              list="exercises-library-list"
                              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-[var(--color-primary)]"
                            />
                          </div>
                        </div>

                        {/* Parametri di base in riga */}
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                          {/* Toggle Tipo Lavoro: Reps vs Tempo */}
                          <button
                            type="button"
                            onClick={() => updateExercise(globalIdx, 'is_time_based', !ex.is_time_based)}
                            className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1 border transition-colors ${ex.is_time_based ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}
                            title="Alterna lavoro a ripetizioni o a tempo"
                          >
                            {ex.is_time_based ? <Clock className="w-3.5 h-3.5" /> : <Repeat className="w-3.5 h-3.5" />}
                            <span>{ex.is_time_based ? 'Tempo' : 'Reps'}</span>
                          </button>

                          {/* Sets */}
                          <div className="flex items-center border border-slate-700 rounded-lg overflow-hidden bg-slate-950">
                            <span className="px-2 text-[10px] text-slate-400 font-bold uppercase bg-slate-800 py-2">Set</span>
                            <input
                              type="number"
                              value={ex.sets || 3}
                              onChange={e => updateExercise(globalIdx, 'sets', parseInt(e.target.value) || 1)}
                              className="w-12 px-1 py-1.5 bg-transparent text-xs text-white font-bold text-center focus:outline-none"
                              min="1"
                            />
                          </div>

                          {/* Reps Target oppure Durata in Secondi */}
                          {ex.is_time_based ? (
                            <div className="flex items-center border border-slate-700 rounded-lg overflow-hidden bg-slate-950">
                              <span className="px-2 text-[10px] text-amber-400 font-bold uppercase bg-slate-800 py-2">Sec</span>
                              <input
                                type="number"
                                placeholder="45"
                                value={ex.duration_seconds || ''}
                                onChange={e => updateExercise(globalIdx, 'duration_seconds', parseInt(e.target.value) || 0)}
                                className="w-14 px-1 py-1.5 bg-transparent text-xs text-white font-bold text-center focus:outline-none"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center border border-slate-700 rounded-lg overflow-hidden bg-slate-950">
                              <span className="px-2 text-[10px] text-slate-400 font-bold uppercase bg-slate-800 py-2">Rep</span>
                              <input
                                type="text"
                                placeholder="8-10"
                                value={ex.reps_target || ''}
                                onChange={e => updateExercise(globalIdx, 'reps_target', e.target.value)}
                                className="w-16 px-1 py-1.5 bg-transparent text-xs text-white font-bold text-center focus:outline-none"
                              />
                            </div>
                          )}

                          {/* Rest Seconds */}
                          <div className="flex items-center border border-slate-700 rounded-lg overflow-hidden bg-slate-950">
                            <span className="px-2 text-[10px] text-slate-400 font-bold uppercase bg-slate-800 py-2">Rec</span>
                            <input
                              type="number"
                              placeholder="60"
                              value={ex.rest_seconds || 60}
                              onChange={e => updateExercise(globalIdx, 'rest_seconds', parseInt(e.target.value) || 0)}
                              className="w-12 px-1 py-1.5 bg-transparent text-xs text-white font-bold text-center focus:outline-none"
                            />
                          </div>

                          {/* Toggle Espansione Parametri Avanzati */}
                          <button
                            onClick={() => setExpandedExerciseIndex(isExpanded ? null : globalIdx)}
                            className={`p-2 rounded-lg text-xs font-bold transition-colors ${isExpanded ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                            title="Mostra parametri avanzati (RIR, TUT, Carico)"
                          >
                            <Sliders className="w-4 h-4" />
                          </button>

                          {/* Elimina Esercizio */}
                          <button
                            onClick={() => removeExercise(globalIdx)}
                            className="p-2 text-slate-500 hover:text-red-400 transition-colors rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Advanced Fields Section (Expanded) */}
                      {isExpanded && (
                        <div className="p-4 bg-slate-950/80 border-t border-slate-800 space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            {/* Carico Target */}
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Carico Target / Peso</label>
                              <input
                                type="text"
                                placeholder="es. 80 kg o 75% 1RM"
                                value={ex.target_weight || ''}
                                onChange={e => updateExercise(globalIdx, 'target_weight', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-[var(--color-primary)] font-bold focus:outline-none"
                              />
                            </div>

                            {/* RIR / RPE */}
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">RIR / RPE Target</label>
                              <input
                                type="text"
                                placeholder="es. RIR 2 o RPE 8"
                                value={ex.rir_target || ''}
                                onChange={e => updateExercise(globalIdx, 'rir_target', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-bold focus:outline-none"
                              />
                            </div>

                            {/* TUT (Time Under Tension) */}
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">TUT (Tempo Esecuzione)</label>
                              <input
                                type="text"
                                placeholder="es. 3-0-1-0"
                                value={ex.tut || ''}
                                onChange={e => updateExercise(globalIdx, 'tut', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none"
                              />
                            </div>

                            {/* Esercizio Alternativo */}
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Esercizio Alternativo</label>
                              <input
                                type="text"
                                placeholder="es. Leg Press se occupato"
                                value={ex.alternative_exercise || ''}
                                onChange={e => updateExercise(globalIdx, 'alternative_exercise', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-300 focus:outline-none"
                              />
                            </div>
                          </div>

                          {/* Note Tecniche */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Note Tecniche per l'Atleta</label>
                            <input
                              type="text"
                              placeholder="es. Fermo al petto di 1 secondo, discesa controllata"
                              value={ex.notes || ''}
                              onChange={e => updateExercise(globalIdx, 'notes', e.target.value)}
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-300 focus:outline-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--color-panel-border)] bg-slate-900/50 flex justify-end gap-3 rounded-b-2xl">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-slate-300 hover:text-white transition-colors"
          >
            Annulla
          </button>
          <button 
            onClick={() => handleSave()}
            disabled={isSaving || exercises.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-xl font-black text-sm shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isSaving ? 'Salvataggio...' : initialWorkout ? 'Salva Modifiche' : athleteId ? 'Salva e Assegna' : 'Salva Programma'}
          </button>
        </div>

      </div>

      <datalist id="exercises-library-list">
        {libraryExercises.map(libEx => (
          <option key={libEx.id} value={libEx.name}>
            {libEx.category} - {libEx.equipment}
          </option>
        ))}
      </datalist>

      {isCoPilotOpen && (
        <AICoPilotModal
          onClose={() => setIsCoPilotOpen(false)}
          onGenerate={handleAIGenerated}
        />
      )}

      {/* Modale Conferma Modifica Template */}
      {showTemplateUpdatePrompt && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-5 relative">
            <h3 className="text-lg font-black text-white text-center">Aggiornamento Template Globale</h3>
            <p className="text-sm text-slate-300 text-center">
              Stai modificando un Template condiviso. Come vuoi applicare questi cambiamenti?
            </p>
            
            <div className="space-y-3">
              <button
                onClick={() => handleSave('ALL')}
                disabled={isSaving}
                className="w-full p-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left transition-colors"
              >
                <div className="font-bold text-white mb-1">Applica a tutti gli atleti attuali</div>
                <div className="text-xs text-slate-400">La modifica influenzerà le schede in corso di tutti gli atleti collegati.</div>
              </button>
              <button
                onClick={() => handleSave('NEW_ONLY')}
                disabled={isSaving}
                className="w-full p-4 rounded-xl bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/30 text-left transition-colors"
              >
                <div className="font-bold text-[var(--color-primary)] mb-1">Solo alle nuove assegnazioni</div>
                <div className="text-xs text-[var(--color-primary)]/70">Gli atleti attuali manterranno la versione precedente della scheda.</div>
              </button>
            </div>

            <div className="flex justify-center mt-2">
              <button
                onClick={() => setShowTemplateUpdatePrompt(false)}
                disabled={isSaving}
                className="text-xs text-slate-500 hover:text-white font-bold"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
