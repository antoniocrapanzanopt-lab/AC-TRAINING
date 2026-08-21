import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Save, Trash2, X, GripVertical, Sliders, Clock, Sparkles, Pencil, Loader2, Info, Dumbbell, Calendar, Copy, Repeat, ArrowLeft, Zap, FileText, Activity, Compass, ArrowRight, Target, RotateCcw, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { generateAISmartSuggestions, CoPilotActionableSuggestion } from '../../lib/ai/workoutGenerator';
import { WorkoutTemplate, WorkoutExercise } from '../../types/workout';
import { useWorkouts } from '../../context/WorkoutsContext';
import { useExercises } from '../../context/ExercisesContext';
import { useAthletes } from '../../context/AthletesContext';
import { useProgressions } from '../../context/ProgressionsContext';
import { useToast } from '../../context/ToastContext';
import { calculateEstimatedWorkoutTime } from '../../utils/workoutUtils';
import { AICoPilotModal } from './AICoPilotModal';
import { GeneratedWorkoutResponse, normalizeDayName } from '../../lib/ai/workoutGenerator';
import { ExerciseProgressionControl } from './progression/ExerciseProgressionControl';
import { generateWeeklyBlockProjection } from '../../lib/progression/progressionEngine';
import { MuscleVolumeSummary } from './MuscleVolumeSummary';
import { AIVolumeCoach } from './AIVolumeCoach';
import { calculateMuscleVolumeSummary } from '../../utils/muscleVolumeCalculator';
import { analyzeVolumeWithAI, ActionPayload } from '../../utils/aiVolumeCoach';

export interface DeletedDayRecord {
  id: string;
  dayName: string;
  exercises: Partial<WorkoutExercise>[];
  dayIndex: number;
  deletedAt: number;
}

interface WorkoutBuilderModalProps {
  athleteId?: string;
  initialWorkout?: WorkoutTemplate | null;
  onClose: () => void;
  onBack?: () => void;
}

export const WorkoutBuilderModal: React.FC<WorkoutBuilderModalProps> = ({ athleteId, initialWorkout, onClose, onBack }) => {
  const { createWorkoutTemplate, updateWorkoutTemplate, assignWorkoutToAthlete, getExercisesForWorkout, folders, forkWorkoutForAthlete, forkWorkoutForAllAssigned, forceSyncMasterTemplate } = useWorkouts();
  const { exercises: libraryExercises, createExercise } = useExercises();
  const { athletes } = useAthletes();
  const { rules } = useProgressions();
  const { showSuccess, showError } = useToast();
  
  const currentAthlete = athleteId ? athletes.find(a => a.id === athleteId) : null;

  const [title, setTitle] = useState(initialWorkout?.title || '');
  const [description, setDescription] = useState(initialWorkout?.description || '');
  const [isDescriptionModalOpen, setIsDescriptionModalOpen] = useState(false);
  const [folderId, setFolderId] = useState<string | null>(initialWorkout?.folder_id || null);
  const [totalWeeks, setTotalWeeks] = useState<number>(initialWorkout?.total_weeks || 1);
  const [activeWeek, setActiveWeek] = useState<number>(1);
  const [activeDay, setActiveDay] = useState<string>('Giorno A');
  const [daysList, setDaysList] = useState<string[]>(['Giorno A', 'Giorno B']);

  // Registro e stato di ripristino per i giorni eliminati accidentalmente
  const [deletedDaysHistory, setDeletedDaysHistory] = useState<DeletedDayRecord[]>([]);
  const [undoBanner, setUndoBanner] = useState<{ record: DeletedDayRecord; timerId: NodeJS.Timeout | null } | null>(null);
  const [isRestoreDropdownOpen, setIsRestoreDropdownOpen] = useState(false);
  const [isReorderDaysModalOpen, setIsReorderDaysModalOpen] = useState(false);

  const moveDay = (fromIndex: number, toIndex: number) => {
    if (fromIndex < 0 || fromIndex >= daysList.length || toIndex < 0 || toIndex >= daysList.length || fromIndex === toIndex) {
      return;
    }
    const newDays = [...daysList];
    const [moved] = newDays.splice(fromIndex, 1);
    newDays.splice(toIndex, 0, moved);
    setDaysList(newDays);
    showSuccess('Ordine Giorni Aggiornato', `"${moved}" spostato in posizione ${toIndex + 1}.`);
  };

  const moveDayLeft = (dayName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const idx = daysList.indexOf(dayName);
    if (idx > 0) {
      moveDay(idx, idx - 1);
    }
  };

  const moveDayRight = (dayName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const idx = daysList.indexOf(dayName);
    if (idx >= 0 && idx < daysList.length - 1) {
      moveDay(idx, idx + 1);
    }
  };

  const [exercises, setExercises] = useState<Partial<WorkoutExercise>[]>([
    { name: '', sets: 3, reps_target: '10', rest_seconds: 60, week_number: 1, day_name: 'Giorno A', is_time_based: false }
  ]);
  const [expandedExerciseIndex, setExpandedExerciseIndex] = useState<number | null>(0);
  const [isSaving, setIsSaving] = useState(false);
  const handleApplyVolumeAction = (action: ActionPayload) => {
    if (action.type === 'reduce_sets' && action.exerciseNames && action.setsDelta) {
      let remainingToReduce = Math.abs(action.setsDelta);
      setExercises(prev => prev.map(ex => {
        if (remainingToReduce > 0 && action.exerciseNames?.some(name => (ex.name || '').toLowerCase().includes(name.toLowerCase()))) {
          const currentSets = Number(ex.sets) || 3;
          const reduceBy = Math.min(remainingToReduce, Math.max(1, currentSets - 2));
          remainingToReduce -= reduceBy;
          return { ...ex, sets: Math.max(1, currentSets - reduceBy) };
        }
        return ex;
      }));
      showSuccess('Modifica Volume Applicata!', `Ridotte le serie per ${action.targetMuscle}.`);
    } else if (action.type === 'increase_sets' && action.setsDelta) {
      let remainingToAdd = action.setsDelta;
      setExercises(prev => prev.map(ex => {
        if (remainingToAdd > 0 && (!action.exerciseNames?.length || action.exerciseNames.some(name => (ex.name || '').toLowerCase().includes(name.toLowerCase())))) {
          const currentSets = Number(ex.sets) || 3;
          const addBy = Math.min(remainingToAdd, 2);
          remainingToAdd -= addBy;
          return { ...ex, sets: currentSets + addBy };
        }
        return ex;
      }));
      showSuccess('Modifica Volume Applicata!', `Incrementate le serie per ${action.targetMuscle}.`);
    }
  };
  const [isCoPilotOpen, setIsCoPilotOpen] = useState(false);
  const [showTemplateUpdatePrompt, setShowTemplateUpdatePrompt] = useState(false);
  const [confirmGlobalOverwrite, setConfirmGlobalOverwrite] = useState(false);
  
  // Clipboard States for Duplication/Copy-Paste
  const [copiedWeekNumber, setCopiedWeekNumber] = useState<number | null>(null);
  const [copiedDayData, setCopiedDayData] = useState<{ dayName: string; exercises: Partial<WorkoutExercise>[] } | null>(null);

  // Day Renaming State
  const [isRenamingDay, setIsRenamingDay] = useState(false);
  const [dayNameInput, setDayNameInput] = useState('');

  // Tab di navigazione modulare per eliminare lo scroll monolitico
  const [activeBuilderTab, setActiveBuilderTab] = useState<'exercises' | 'volume' | 'ai_coach' | 'info'>('exercises');

  // Calcolo centralizzato del volume e delle raccomandazioni AI
  const volumeData = useMemo(() => {
    return calculateMuscleVolumeSummary({
      exercises,
      libraryExercises,
      scope: 'week',
      activeWeek,
      activeDay,
      totalWeeks,
    });
  }, [exercises, libraryExercises, activeWeek, activeDay, totalWeeks]);

  const aiAnalysis = useMemo(() => {
    return analyzeVolumeWithAI({
      volumeData,
      exercises,
      libraryExercises,
      scope: 'week',
      totalWeeks,
    });
  }, [volumeData, exercises, libraryExercises, totalWeeks]);

  // AI Suggestions
  const [isAiSuggestionsOpen, setIsAiSuggestionsOpen] = useState(false);
  const [aiSuggestionsLoading, setAiSuggestionsLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<CoPilotActionableSuggestion[] | null>(null);

  // Box Motivazione IA
  const [aiReasoning, setAiReasoning] = useState<string>('');

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

  // ─── TRACCIAMENTO AVANZAMENTO ATLETA (SETTIMANA & GIORNO CORRENTI) ───
  interface AthleteExecutionProgress {
    loading: boolean;
    hasStarted: boolean;
    currentWeek: number;
    currentDay: string;
    lastSessionDateFormatted: string | null;
    lastSessionRpe: number | null;
    lastCompletedDay: string | null;
    lastCompletedWeek: number | null;
    completedMap: Record<string, boolean>;
    completedSessionsCount: number;
    totalPlannedSessions: number;
    progressPercent: number;
  }

  const [athleteProgress, setAthleteProgress] = useState<AthleteExecutionProgress>({
    loading: false,
    hasStarted: false,
    currentWeek: 1,
    currentDay: 'Giorno A',
    lastSessionDateFormatted: null,
    lastSessionRpe: null,
    lastCompletedDay: null,
    lastCompletedWeek: null,
    completedMap: {},
    completedSessionsCount: 0,
    totalPlannedSessions: 0,
    progressPercent: 0,
  });

  useEffect(() => {
    if (!athleteId) return;

    let isMounted = true;

    const fetchAthleteProgress = async () => {
      setAthleteProgress(prev => ({ ...prev, loading: true }));
      try {
        const currentDays = daysList.length > 0 ? daysList : ['Giorno A', 'Giorno B', 'Giorno C'];
        const totalPlanned = Math.max(1, totalWeeks * currentDays.length);

        // 1. Query Supabase (fonte di verità reale: solo sessioni effettivamente completate)
        let query = supabase
          .from('workout_sessions')
          .select(`
            id,
            start_time,
            end_time,
            notes,
            rpe,
            workout_id,
            exercise_logs (
              id,
              exercise_id,
              workout_exercises (
                id,
                week_number,
                day_name
              )
            )
          `)
          .eq('athlete_id', athleteId)
          .not('end_time', 'is', null)
          .order('start_time', { ascending: false });

        if (initialWorkout?.id) {
          query = query.eq('workout_id', initialWorkout.id);
        }

        const { data: sessionsData } = await query.limit(50);

        const dbCompletedMap: Record<string, boolean> = {};
        let lastDateIso: string | null = null;
        let lastRpe: number | null = null;
        let lastCompWeek: number | null = null;
        let lastCompDay: string | null = null;

        if (sessionsData && sessionsData.length > 0) {
          // Ultimo workout (più recente)
          lastDateIso = sessionsData[0].end_time || sessionsData[0].start_time;
          lastRpe = sessionsData[0].rpe ? Number(sessionsData[0].rpe) : null;

          // Mappa le sessioni dalla più vecchia alla più recente per simulare la progressione cronologica
          const sortedChronological = [...sessionsData].reverse();

          sortedChronological.forEach((sess) => {
            let mappedThisSession = false;
            const logs = sess.exercise_logs || [];

            logs.forEach((log) => {
              const weRaw = log.workout_exercises;
              const weList = Array.isArray(weRaw) ? weRaw : weRaw ? [weRaw] : [];
              weList.forEach((we) => {
                if (we && we.week_number && we.day_name) {
                  dbCompletedMap[`${we.week_number}-${we.day_name}`] = true;
                  lastCompWeek = Number(we.week_number);
                  lastCompDay = String(we.day_name);
                  mappedThisSession = true;
                }
              });
            });

            // Se i log non avevano la foreign key esplicita, assegna la sessione al prossimo giorno non completato
            if (!mappedThisSession) {
              for (let w = 1; w <= totalWeeks; w++) {
                for (const d of currentDays) {
                  if (!dbCompletedMap[`${w}-${d}`]) {
                    dbCompletedMap[`${w}-${d}`] = true;
                    lastCompWeek = w;
                    lastCompDay = d;
                    mappedThisSession = true;
                    break;
                  }
                }
                if (mappedThisSession) break;
              }
            }
          });
        }

        const completedKeys = Object.keys(dbCompletedMap).filter(k => dbCompletedMap[k]);
        const completedCount = completedKeys.length;

        // Trova la prima settimana e giorno non ancora completati (prossimo allenamento da svolgere)
        let detectedWeek = 1;
        let detectedDay = currentDays[0] || 'Giorno A';
        let foundActive = false;

        for (let w = 1; w <= totalWeeks; w++) {
          for (const d of currentDays) {
            const isDone = Boolean(dbCompletedMap[`${w}-${d}`]);
            if (!isDone && !foundActive) {
              detectedWeek = w;
              detectedDay = d;
              foundActive = true;
              break;
            }
          }
          if (foundActive) break;
        }

        if (!foundActive && completedCount > 0) {
          detectedWeek = totalWeeks;
          detectedDay = currentDays[currentDays.length - 1] || 'Giorno A';
        }

        let dateFormatted: string | null = null;
        if (lastDateIso) {
          const dObj = new Date(lastDateIso);
          const now = new Date();
          const diffMs = now.getTime() - dObj.getTime();
          const diffDays = Math.floor(diffMs / (24 * 3600 * 1000));
          
          if (diffDays === 0) {
            dateFormatted = `Oggi, ${dObj.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`;
          } else if (diffDays === 1) {
            dateFormatted = `Ieri, ${dObj.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`;
          } else if (diffDays < 7) {
            dateFormatted = `${diffDays} gg fa`;
          } else {
            dateFormatted = dObj.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
          }
        }

        const hasStarted = completedCount > 0 || Boolean(lastDateIso);
        const percent = Math.min(100, Math.round((completedCount / totalPlanned) * 100));

        if (isMounted) {
          setAthleteProgress({
            loading: false,
            hasStarted,
            currentWeek: detectedWeek,
            currentDay: detectedDay,
            lastSessionDateFormatted: dateFormatted,
            lastSessionRpe: lastRpe,
            lastCompletedWeek: lastCompWeek,
            lastCompletedDay: lastCompDay,
            completedMap: dbCompletedMap,
            completedSessionsCount: completedCount,
            totalPlannedSessions: totalPlanned,
            progressPercent: percent,
          });
        }
      } catch (err) {
        console.warn('Errore calcolo progresso atleta:', err);
        if (isMounted) {
          setAthleteProgress(prev => ({ ...prev, loading: false }));
        }
      }
    };

    fetchAthleteProgress();

    return () => {
      isMounted = false;
    };
  }, [athleteId, initialWorkout?.id, totalWeeks, daysList]);

  // Esercizi filtrati per la settimana ed il giorno correntemente selezionati
  const currentWeekDayExercises = exercises.filter(
    ex => (ex.week_number || 1) === activeWeek && 
          (ex.day_name || 'Giorno A').trim().toLowerCase() === activeDay.trim().toLowerCase()
  );

  const estimatedTime = calculateEstimatedWorkoutTime(currentWeekDayExercises);

  const handleAIGenerated = (result: GeneratedWorkoutResponse) => {
    try {
      if (!result || !result.programma_giorno_per_giorno || result.programma_giorno_per_giorno.length === 0) {
        showError("Nessun esercizio generato dall'IA.");
        return;
      }

      // Normalizzazione pulita e garantita dei giorni (es. Giorno 1 -> Giorno A, Push -> Giorno A, ecc.)
      const mapped: Partial<WorkoutExercise>[] = result.programma_giorno_per_giorno.map((ex, idx) => {
        const cleanDay = normalizeDayName(ex.day_name, idx);

        const exName = ex.name || (ex as { nome?: string; esercizio?: string; exercise?: string }).nome || (ex as { nome?: string; esercizio?: string; exercise?: string }).esercizio || (ex as { nome?: string; esercizio?: string; exercise?: string }).exercise || 'Esercizio Base';

        return {
          id: `ai-gen-${Date.now()}-${idx}`,
          name: exName,
          sets: Number(ex.sets) || 3,
          reps_target: String(ex.reps_target || '10'),
          rest_seconds: Number(ex.rest_seconds) || 60,
          target_weight: ex.target_weight || '',
          rir_target: ex.rir_target || '',
          tut: ex.tut || '',
          notes: ex.notes || '',
          week_number: Number(ex.week_number) || 1,
          day_name: cleanDay,
          is_time_based: false,
          order_index: idx
        };
      });

      setExercises(mapped);

      // Aggiorna le settimane totali in base al massimo generato
      const maxW = Math.max(...mapped.map(e => e.week_number || 1), 1);
      setTotalWeeks(maxW);

      // Aggiorna i giorni unici generati ordinandoli alfabeticamente ('Giorno A', 'Giorno B', ...)
      const uniqueDays = Array.from(new Set(mapped.map(e => e.day_name || 'Giorno A')))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

      if (uniqueDays.length > 0) {
        setDaysList(uniqueDays);
        setActiveDay(uniqueDays[0]); // Seleziona il primo giorno generato
      }
      setActiveWeek(1);
      setExpandedExerciseIndex(null); // Chiudi espansioni per vista pulita

      // Formatta i metadati generati in una stringa Markdown e mettila nella descrizione
      const metaDescription = `
**Soggetto:** ${result.classificazione_soggetto || '-'}
**Obiettivo Blocco:** ${result.obiettivo_blocco || '-'}
**Durata & Frequenza:** ${result.durata_blocco || '-'} - ${result.frequenza_settimanale || '-'} (${result.tempo_massimo_seduta || '-'})
**Split Selezionata:** ${result.split_scelta || '-'}
**Logica Progressione:** ${result.logica_progressione || '-'}

**Note Tecniche:**
${result.note_tecniche_essenziali || '-'}

**Regole di Adattamento (Sicurezza / Fatica):**
${result.regole_adattamento || '-'}
`.trim();

      setDescription(prev => prev ? `${prev}\n\n---\n\n${metaDescription}` : metaDescription);
    } catch (err: unknown) {
      console.error("Errore importazione scheda generata:", err);
      showError("Errore durante l'applicazione del programma generato.");
    }
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

  // Sincronizzazione automatica della progressione su tutte le settimane dello stesso esercizio
  const updateExerciseFields = (globalIndex: number, fields: Partial<WorkoutExercise>) => {
    const targetEx = exercises[globalIndex];
    if (!targetEx) return;

    if ('progression_rule_id' in fields || 'progression_mode' in fields) {
      const ruleId = fields.progression_rule_id;
      const isRemoving = !ruleId || fields.progression_mode === 'none';

      if (isRemoving) {
        setExercises(prev => prev.map(ex => {
          const isSameEx = ex.name?.trim().toLowerCase() === targetEx.name?.trim().toLowerCase() &&
                           (ex.day_name || 'Giorno A').trim().toLowerCase() === (targetEx.day_name || 'Giorno A').trim().toLowerCase();
          if (isSameEx) {
            return {
              ...ex,
              progression_rule_id: undefined,
              progression_mode: 'none',
              progression_summary: undefined,
            };
          }
          return ex;
        }));
        return;
      }

      // Troviamo la regola associata per calcolare le proiezioni multi-settimana
      const rule = rules.find(r => r.id === ruleId);
      const baseTarget = rule ? rule.current_target : {
        sets: targetEx.sets || 3,
        reps: targetEx.reps_target || '8-10',
        load_kg: targetEx.target_weight ? parseFloat(targetEx.target_weight) : 60,
        rir: targetEx.rir_target || 'RIR 2',
        rest_seconds: targetEx.rest_seconds || 90,
        tut: targetEx.tut || '3-0-1-0',
      };

      const projections = rule
        ? generateWeeklyBlockProjection(rule, baseTarget, totalWeeks)
        : [];

      setExercises(prev => prev.map(ex => {
        const isSameEx = ex.name?.trim().toLowerCase() === targetEx.name?.trim().toLowerCase() &&
                         (ex.day_name || 'Giorno A').trim().toLowerCase() === (targetEx.day_name || 'Giorno A').trim().toLowerCase();

        if (isSameEx) {
          const w = ex.week_number || 1;
          const proj = projections[w - 1];

          return {
            ...ex,
            ...fields,
            sets: proj ? proj.sets : ex.sets,
            reps_target: proj ? proj.reps : ex.reps_target,
            target_weight: proj ? String(proj.load_kg) : ex.target_weight,
            rir_target: proj ? proj.rir : ex.rir_target,
            rest_seconds: proj ? proj.rest_seconds : ex.rest_seconds,
            tut: proj ? (proj.tut || ex.tut) : ex.tut,
          };
        }
        return ex;
      }));
      return;
    }

    setExercises(prev => {
      const copy = [...prev];
      copy[globalIndex] = { ...copy[globalIndex], ...fields };
      return copy;
    });
  };

  // Auto-sincronizzazione iniziale o su cambio settimane:
  // Se un esercizio ha una regola di progressione in una settimana, assicura che tutte le settimane
  // per quell'esercizio nello stesso giorno abbiano la regola e i carichi proiettati
  useEffect(() => {
    if (exercises.length === 0 || rules.length === 0) return;

    const ruleAssignments = new Map<string, { ruleId: string; mode: string; summary?: string }>();
    exercises.forEach(ex => {
      if (ex.progression_rule_id && ex.name) {
        const key = `${ex.name.trim().toLowerCase()}__${(ex.day_name || 'Giorno A').trim().toLowerCase()}`;
        if (!ruleAssignments.has(key)) {
          ruleAssignments.set(key, {
            ruleId: ex.progression_rule_id,
            mode: ex.progression_mode || 'linked_template',
            summary: ex.progression_summary,
          });
        }
      }
    });

    if (ruleAssignments.size === 0) return;

    let needsSync = false;
    const updated = exercises.map(ex => {
      if (!ex.name) return ex;
      const key = `${ex.name.trim().toLowerCase()}__${(ex.day_name || 'Giorno A').trim().toLowerCase()}`;
      const assignment = ruleAssignments.get(key);

      if (assignment) {
        const rule = rules.find(r => r.id === assignment.ruleId);
        const w = ex.week_number || 1;
        const projections = rule ? generateWeeklyBlockProjection(rule, rule.current_target, totalWeeks) : [];
        const proj = projections[w - 1];

        const isMissingRule = !ex.progression_rule_id;
        const isMismatchedTarget = proj && (
          ex.sets !== proj.sets ||
          ex.reps_target !== proj.reps ||
          ex.target_weight !== String(proj.load_kg)
        );

        if (isMissingRule || isMismatchedTarget) {
          needsSync = true;
          return {
            ...ex,
            progression_rule_id: assignment.ruleId,
            progression_mode: (assignment.mode as any) || 'linked_template',
            progression_summary: assignment.summary || ex.progression_summary,
            sets: proj ? proj.sets : ex.sets,
            reps_target: proj ? proj.reps : ex.reps_target,
            target_weight: proj ? String(proj.load_kg) : ex.target_weight,
            rir_target: proj ? proj.rir : ex.rir_target,
            rest_seconds: proj ? proj.rest_seconds : ex.rest_seconds,
            tut: proj ? (proj.tut || ex.tut) : ex.tut,
          };
        }
      }
      return ex;
    });

    if (needsSync) {
      setExercises(updated);
    }
  }, [rules, totalWeeks]);

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

  const renameActiveDay = (newName: string) => {
    if (!newName.trim() || newName === activeDay || daysList.includes(newName)) {
      setIsRenamingDay(false);
      return;
    }
    setDaysList(prev => prev.map(d => d === activeDay ? newName : d));
    setExercises(prev => prev.map(ex => 
      (ex.day_name || 'Giorno A') === activeDay ? { ...ex, day_name: newName } : ex
    ));
    setActiveDay(newName);
    setIsRenamingDay(false);
  };

  const fetchAiSuggestions = async () => {
    if (currentWeekDayExercises.length === 0) {
      showError("Aggiungi qualche esercizio al giorno corrente prima di chiedere all'IA.");
      return;
    }
    setAiSuggestionsLoading(true);
    setIsAiSuggestionsOpen(true);
    try {
      const context = {
        athleteLevel: currentAthlete?.tags?.join(', ') || 'Non specificato',
        athleteGoal: currentAthlete?.goals || 'Non specificato',
        sessionDuration: estimatedTime?.maxMin || 60,
        limitations: currentAthlete?.medicalNotes || 'Nessuna limitazione nota'
      };
      const result = await generateAISmartSuggestions(currentWeekDayExercises, context);
      setAiSuggestions(result);
    } catch (err: any) {
      showError(err.message);
      setIsAiSuggestionsOpen(false);
    } finally {
      setAiSuggestionsLoading(false);
    }
  };

  const dismissSuggestion = (id: string) => {
    if (!aiSuggestions) return;
    setAiSuggestions(aiSuggestions.filter((s, idx) => (s.id || String(idx)) !== id));
  };

  const applySuggestion = (suggestion: CoPilotActionableSuggestion, index: number) => {
    const globalIndex = exercises.findIndex(ex => 
      (ex.week_number || 1) === activeWeek && 
      (ex.day_name || 'Giorno A').trim().toLowerCase() === activeDay.trim().toLowerCase() &&
      ex.name?.toLowerCase().includes(suggestion.target_exercise_name.toLowerCase())
    );

    if (globalIndex === -1) {
      showError(`Impossibile trovare l'esercizio bersaglio "${suggestion.target_exercise_name}". Modificalo manualmente.`);
      return;
    }

    const val = suggestion.payload.new_value;
    const updates: Partial<WorkoutExercise> = {};

    switch (suggestion.azione_tipo) {
      case 'REDUCE_SETS':
      case 'INCREASE_SETS':
        updates.sets = typeof val === 'number' ? val : parseInt(String(val)) || 3;
        break;
      case 'CHANGE_RIR':
        updates.rir_target = String(val);
        break;
      case 'SWAP_EXERCISE':
        updates.name = String(val);
        break;
      case 'REMOVE_EXERCISE':
        removeExercise(globalIndex);
        dismissSuggestion(suggestion.id || String(index));
        showSuccess('Esercizio rimosso con successo.');
        return;
      case 'NONE':
        dismissSuggestion(suggestion.id || String(index));
        return;
      default:
        showError('Tipo di azione non supportato.');
        return;
    }

    updateExerciseFields(globalIndex, updates);
    dismissSuggestion(suggestion.id || String(index));
    showSuccess('Suggerimento applicato!');
  };

  // --- GESTIONE E DUPLICAZIONE SETTIMANE ---
  const addWeek = () => {
    const newWeekNum = totalWeeks + 1;
    setTotalWeeks(newWeekNum);
    setActiveWeek(newWeekNum);
  };

  const duplicateWeek = (sourceWeekNum: number) => {
    const sourceExercises = exercises.filter(ex => (ex.week_number || 1) === sourceWeekNum);
    if (sourceExercises.length === 0) {
      showError(`Nessun esercizio presente nella Settimana ${sourceWeekNum} da duplicare.`);
      return;
    }

    const newWeekNum = totalWeeks + 1;
    const cloned = sourceExercises.map((ex, idx) => {
      let targetWeight = ex.target_weight;
      let repsTarget = ex.reps_target;
      let sets = ex.sets;
      let rirTarget = ex.rir_target;
      let restSec = ex.rest_seconds;
      let tut = ex.tut;

      if (ex.progression_rule_id) {
        const rule = rules.find(r => r.id === ex.progression_rule_id);
        if (rule) {
          const projections = generateWeeklyBlockProjection(rule, rule.current_target, newWeekNum);
          const proj = projections[newWeekNum - 1];
          if (proj) {
            sets = proj.sets;
            repsTarget = proj.reps;
            targetWeight = String(proj.load_kg);
            rirTarget = proj.rir;
            restSec = proj.rest_seconds;
            tut = proj.tut || tut;
          }
        }
      }

      return {
        ...ex,
        id: `cloned-w-ex-${Date.now()}-${idx}`,
        week_number: newWeekNum,
        sets,
        reps_target: repsTarget,
        target_weight: targetWeight,
        rir_target: rirTarget,
        rest_seconds: restSec,
        tut,
      };
    });

    setTotalWeeks(newWeekNum);
    setExercises(prev => [...prev, ...cloned]);
    setActiveWeek(newWeekNum);
    showSuccess(
      'Settimana Duplicata',
      `La Settimana ${sourceWeekNum} (${sourceExercises.length} esercizi) è stata duplicata come Settimana ${newWeekNum} con progressione ricalcolata.`
    );
  };

  const copyWeek = (sourceWeekNum: number) => {
    const sourceExercises = exercises.filter(ex => (ex.week_number || 1) === sourceWeekNum);
    if (sourceExercises.length === 0) {
      showError(`La Settimana ${sourceWeekNum} non contiene esercizi da copiare.`);
      return;
    }
    setCopiedWeekNumber(sourceWeekNum);
    showSuccess('Settimana Copiata', `Settimana ${sourceWeekNum} salvata negli appunti. Seleziona una settimana e clicca "Incolla".`);
  };

  const pasteWeek = (targetWeekNum: number) => {
    if (!copiedWeekNumber) {
      showError('Nessuna settimana copiata negli appunti.');
      return;
    }
    const sourceExercises = exercises.filter(ex => (ex.week_number || 1) === copiedWeekNumber);
    if (sourceExercises.length === 0) {
      showError('La settimana copiata non contiene esercizi.');
      return;
    }

    const otherExercises = exercises.filter(ex => (ex.week_number || 1) !== targetWeekNum);
    const pasted = sourceExercises.map((ex, idx) => {
      let targetWeight = ex.target_weight;
      let repsTarget = ex.reps_target;
      let sets = ex.sets;
      let rirTarget = ex.rir_target;
      let restSec = ex.rest_seconds;
      let tut = ex.tut;

      if (ex.progression_rule_id) {
        const rule = rules.find(r => r.id === ex.progression_rule_id);
        if (rule) {
          const projections = generateWeeklyBlockProjection(rule, rule.current_target, totalWeeks);
          const proj = projections[targetWeekNum - 1];
          if (proj) {
            sets = proj.sets;
            repsTarget = proj.reps;
            targetWeight = String(proj.load_kg);
            rirTarget = proj.rir;
            restSec = proj.rest_seconds;
            tut = proj.tut || tut;
          }
        }
      }

      return {
        ...ex,
        id: `pasted-w-ex-${Date.now()}-${idx}`,
        week_number: targetWeekNum,
        sets,
        reps_target: repsTarget,
        target_weight: targetWeight,
        rir_target: rirTarget,
        rest_seconds: restSec,
        tut,
      };
    });

    setExercises([...otherExercises, ...pasted]);
    showSuccess('Settimana Incollata', `Contenuto della Settimana ${copiedWeekNumber} incollato nella Settimana ${targetWeekNum} con progressione applicata.`);
  };

  const deleteWeek = (weekNum: number) => {
    if (totalWeeks <= 1) {
      showError('Il programma deve contenere almeno una settimana.');
      return;
    }
    if (confirm(`Sei sicuro di voler eliminare la Settimana ${weekNum} e tutti i suoi esercizi?`)) {
      const remainingExercises = exercises
        .filter(ex => (ex.week_number || 1) !== weekNum)
        .map(ex => {
          const w = ex.week_number || 1;
          return w > weekNum ? { ...ex, week_number: w - 1 } : ex;
        });

      const nextTotalWeeks = totalWeeks - 1;
      setTotalWeeks(nextTotalWeeks);
      setExercises(remainingExercises);
      setActiveWeek(prev => Math.max(1, Math.min(prev === weekNum ? 1 : (prev > weekNum ? prev - 1 : prev), nextTotalWeeks)));
      showSuccess('Settimana Eliminata', `Settimana ${weekNum} rimossa.`);
    }
  };

  // --- GESTIONE E DUPLICAZIONE GIORNI ---
  const duplicateDay = (sourceDayName: string) => {
    const sourceExercises = exercises.filter(
      ex => (ex.week_number || 1) === activeWeek && (ex.day_name || 'Giorno A') === sourceDayName
    );

    // Trova la prossima lettera disponibile per il giorno
    const existingLetters = daysList.map(d => {
      const m = d.match(/Giorno\s+([A-Z])/i);
      return m ? m[1].toUpperCase() : '';
    }).filter(Boolean);

    let nextLetter = 'A';
    for (let code = 65; code <= 90; code++) {
      const char = String.fromCharCode(code);
      if (!existingLetters.includes(char)) {
        nextLetter = char;
        break;
      }
    }
    const newDayName = `Giorno ${nextLetter}`;

    const cloned = sourceExercises.map((ex, idx) => ({
      ...ex,
      id: `cloned-d-ex-${Date.now()}-${idx}`,
      day_name: newDayName,
      week_number: activeWeek,
    }));

    setDaysList(prev => [...prev, newDayName]);
    setExercises(prev => [...prev, ...cloned]);
    setActiveDay(newDayName);
    showSuccess('Giorno Duplicato', `Creato "${newDayName}" con ${sourceExercises.length} esercizi duplicati da "${sourceDayName}".`);
  };

  const copyDay = (sourceDayName: string) => {
    const sourceExercises = exercises.filter(
      ex => (ex.week_number || 1) === activeWeek && (ex.day_name || 'Giorno A') === sourceDayName
    );
    if (sourceExercises.length === 0) {
      showError(`"${sourceDayName}" non contiene esercizi da copiare.`);
      return;
    }
    setCopiedDayData({ dayName: sourceDayName, exercises: sourceExercises });
    showSuccess('Giorno Copiato', `Esercizi di "${sourceDayName}" copiati negli appunti.`);
  };

  const pasteDay = (targetDayName: string) => {
    if (!copiedDayData) {
      showError('Nessun giorno copiato negli appunti.');
      return;
    }

    const otherExercises = exercises.filter(
      ex => !((ex.week_number || 1) === activeWeek && (ex.day_name || 'Giorno A') === targetDayName)
    );

    const pasted = copiedDayData.exercises.map((ex, idx) => ({
      ...ex,
      id: `pasted-d-ex-${Date.now()}-${idx}`,
      day_name: targetDayName,
      week_number: activeWeek,
    }));

    setExercises([...otherExercises, ...pasted]);
    showSuccess('Giorno Incollato', `Esercizi incollati in "${targetDayName}".`);
  };

  const deleteDay = (dayName: string) => {
    if (daysList.length <= 1) {
      showError('La scheda deve contenere almeno un giorno di allenamento.');
      return;
    }

    // Salva un backup completo di tutti gli esercizi associati a questo giorno per tutte le settimane
    const dayExercises = exercises.filter(ex => (ex.day_name || 'Giorno A') === dayName);
    const dayIndex = daysList.indexOf(dayName);

    const record: DeletedDayRecord = {
      id: `del-day-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      dayName,
      exercises: JSON.parse(JSON.stringify(dayExercises)),
      dayIndex: dayIndex >= 0 ? dayIndex : daysList.length - 1,
      deletedAt: Date.now(),
    };

    // Rimuovi il giorno e i relativi esercizi
    setExercises(prev => prev.filter(ex => (ex.day_name || 'Giorno A') !== dayName));
    const nextDays = daysList.filter(d => d !== dayName);
    setDaysList(nextDays);
    setActiveDay(nextDays[0] || 'Giorno A');

    // Aggiungi alla cronologia giorni eliminati
    setDeletedDaysHistory(prev => [record, ...prev]);

    // Mostra banner di ripristino rapido (10 secondi)
    if (undoBanner?.timerId) {
      clearTimeout(undoBanner.timerId);
    }
    const timer = setTimeout(() => {
      setUndoBanner(null);
    }, 10000);

    setUndoBanner({ record, timerId: timer });
    showSuccess('Giorno Rimosso', `"${dayName}" eliminato. Puoi ripristinarlo in qualsiasi momento.`);
  };

  const restoreDay = (record: DeletedDayRecord) => {
    if (undoBanner?.timerId) {
      clearTimeout(undoBanner.timerId);
    }
    setUndoBanner(null);

    // Se il giorno esiste già nella scheda (es. è stato ricreato), usa suffisso
    let targetName = record.dayName;
    if (daysList.includes(targetName)) {
      targetName = `${record.dayName} (Ripristinato)`;
    }

    // Reinserisci il giorno nella posizione originale o in coda
    const newDaysList = [...daysList];
    const insertIndex = Math.min(record.dayIndex, newDaysList.length);
    newDaysList.splice(insertIndex, 0, targetName);
    setDaysList(newDaysList);

    // Rigenera ID univoci per gli esercizi ripristinati e assegna il targetName
    const restoredExercises = record.exercises.map((ex, idx) => ({
      ...ex,
      day_name: targetName,
      id: `restored-d-ex-${Date.now()}-${idx}`,
    }));

    setExercises(prev => [...prev, ...restoredExercises]);
    setActiveDay(targetName);

    // Rimuovi dal registro eliminati
    setDeletedDaysHistory(prev => prev.filter(d => d.id !== record.id));
    setIsRestoreDropdownOpen(false);

    showSuccess(
      'Giorno Ripristinato',
      `"${targetName}" è stato ripristinato con tutti i suoi ${record.exercises.length} esercizi.`
    );
  };

  // --- DUPLICAZIONE SINGOLO ESERCIZIO ---
  const duplicateExercise = (globalIndex: number) => {
    const target = exercises[globalIndex];
    if (!target) return;

    const cloned: Partial<WorkoutExercise> = {
      ...target,
      id: `cloned-single-ex-${Date.now()}`,
      name: `${target.name || 'Esercizio'} (Copia)`,
    };

    const next = [...exercises];
    next.splice(globalIndex + 1, 0, cloned);
    setExercises(next);
    setExpandedExerciseIndex(globalIndex + 1);
    showSuccess('Esercizio Duplicato', `"${cloned.name}" aggiunto alla seduta.`);
  };

  const handleSave = async (globalUpdateMode?: 'ALL' | 'NEW_ONLY') => {
    if (!title.trim()) {
      showError('Inserisci un titolo per la scheda');
      return;
    }
    
    const validExercises = exercises
      .filter(ex => ex.name?.trim() !== '')
      .sort((a, b) => {
        const weekDiff = (a.week_number || 1) - (b.week_number || 1);
        if (weekDiff !== 0) return weekDiff;
        const dayIndexA = daysList.indexOf(a.day_name || 'Giorno A');
        const dayIndexB = daysList.indexOf(b.day_name || 'Giorno A');
        const safeA = dayIndexA >= 0 ? dayIndexA : 999;
        const safeB = dayIndexB >= 0 ? dayIndexB : 999;
        return safeA - safeB;
      });
    if (validExercises.length === 0) {
      showError('Inserisci almeno un esercizio valido');
      return;
    }

    // Registra in background nella libreria globale eventuali nuovi esercizi personalizzati
    validExercises.forEach(ex => {
      if (ex.name && ex.name.trim().length > 1) {
        const isPresent = libraryExercises.some(libEx => libEx.name.trim().toLowerCase() === ex.name!.trim().toLowerCase());
        if (!isPresent) {
          createExercise({
            name: ex.name.trim(),
            category: 'Altro',
            equipment: 'Corpo Libero',
          }).catch(err => console.warn('Auto-salvataggio esercizio custom in libreria:', err));
        }
      }
    });

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

          if (globalUpdateMode === 'ALL') {
            const syncResult = await forceSyncMasterTemplate(initialWorkout.id);
            if (!syncResult.success) throw new Error(syncResult.error);
          }
          
          showSuccess(globalUpdateMode === 'NEW_ONLY' ? 'Template aggiornato (le vecchie assegnazioni sono state congelate).' : 'Scheda e assegnazioni aggiornate con successo!');
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
      setConfirmGlobalOverwrite(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4">
      <div className="w-full max-w-[1520px] bg-[#090d14] border border-slate-800 rounded-3xl shadow-2xl flex flex-col h-[95vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-[#0d121c] to-[#090d14]">
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
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white flex flex-col sm:flex-row sm:items-center gap-2 tracking-tight">
                {athleteId ? (
                  <>
                    <span className="text-sm font-bold text-amber-400 uppercase tracking-wide">
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
              {athleteId ? (
                <div className="space-y-1.5 mt-0.5">
                  <p className="text-xs text-slate-400">
                    Le modifiche apportate influenzeranno solo ed esclusivamente la scheda di questo atleta.
                  </p>
                    {/* Badge Rapido di Avanzamento nell'Header */}
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-300">
                      <Compass className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="font-bold">Avanzamento:</span>
                      {athleteProgress.hasStarted ? (
                        <span className="font-black text-white bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/30">
                          Settimana {athleteProgress.currentWeek} • {athleteProgress.currentDay}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Non ancora iniziato (Settimana 1)</span>
                      )}
                      {athleteProgress.lastSessionDateFormatted && (
                        <span className="text-[11px] text-slate-400">
                          (Ultimo workout: <strong className="text-slate-200">{athleteProgress.lastSessionDateFormatted}</strong>{athleteProgress.lastCompletedDay ? ` • ${athleteProgress.lastCompletedDay} fatto` : ''})
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">
                    Gestisci giorni, settimane, carichi target e progressioni parametrizzate
                  </p>
                )}
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

        {/* Scrollable Body (Senza Barre di Scorrimento Visibili) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 no-scrollbar">
          
          {/* BANNER PROMINENTE AVANZAMENTO ATLETA */}
          {athleteId && (
            <div className="p-4 rounded-3xl bg-slate-950/90 border border-amber-500/30 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex items-center gap-3.5 min-w-0 relative z-10">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-500/10">
                  <Compass className="w-6 h-6 animate-pulse" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
                      Stato Attuale di {currentAthlete ? currentAthlete.firstName : 'Atleta'}:
                    </span>
                    {athleteProgress.hasStarted ? (
                      <span className="text-sm font-black text-white px-2.5 py-0.5 rounded-xl bg-amber-500/20 border border-amber-500/40 shadow-sm flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                        Settimana {athleteProgress.currentWeek} • {athleteProgress.currentDay}
                        {athleteProgress.lastCompletedDay && (
                          <span className="text-[10px] text-emerald-400 font-mono font-bold ml-1 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                            (Ultimo svolto: {athleteProgress.lastCompletedDay})
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-slate-400 italic">
                        Scheda assegnata • In attesa del primo allenamento
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3 mt-2 flex-wrap text-xs text-slate-400">
                    {athleteProgress.lastSessionDateFormatted && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>Ultimo workout: <strong className="text-slate-200">{athleteProgress.lastSessionDateFormatted}</strong></span>
                        {athleteProgress.lastSessionRpe && (
                          <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                            RPE {athleteProgress.lastSessionRpe}/10
                          </span>
                        )}
                      </span>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <div className="w-28 sm:w-36 h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700/60">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-500"
                          style={{ width: `${athleteProgress.progressPercent}%` }}
                        />
                      </div>
                      <span className="font-mono font-bold text-slate-300 text-[11px]">
                        {athleteProgress.completedSessionsCount}/{athleteProgress.totalPlannedSessions} sessioni ({athleteProgress.progressPercent}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Azione rapida Salta alla settimana corrente */}
              {athleteProgress.hasStarted && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveWeek(athleteProgress.currentWeek);
                    setActiveDay(athleteProgress.currentDay);
                    setActiveBuilderTab('exercises');
                  }}
                  className="self-start md:self-auto px-4 py-2.5 rounded-2xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-slate-950 font-black text-xs transition-all flex items-center gap-2 shrink-0 cursor-pointer shadow-lg shadow-[var(--color-primary)]/20 active:scale-95 relative z-10"
                >
                  <Target className="w-4 h-4" />
                  <span>Vai a Sett. {athleteProgress.currentWeek} ({athleteProgress.currentDay})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
          
          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* SEGMENTED NAVIGATION BAR PRINCIPALE A 4 MODULI                     */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          <div className="flex items-center gap-1.5 p-1.5 bg-slate-950/90 rounded-2xl border border-slate-800 shadow-xl overflow-x-auto no-scrollbar shrink-0 sticky top-0 z-30 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setActiveBuilderTab('exercises')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shrink-0 cursor-pointer ${
                activeBuilderTab === 'exercises'
                  ? 'bg-[var(--color-primary)] text-black shadow-lg font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Dumbbell className="w-4 h-4" />
              <span>Esercizi & Scheda</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-black/20 font-bold">
                {exercises.filter(e => (e.name || '').trim()).length} es.
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveBuilderTab('volume')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shrink-0 cursor-pointer ${
                activeBuilderTab === 'volume'
                  ? 'bg-[var(--color-primary)] text-black shadow-lg font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Analisi Volume</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-black/20 font-bold">
                {volumeData.totalSetsAllMuscles} set
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveBuilderTab('ai_coach')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shrink-0 cursor-pointer ${
                activeBuilderTab === 'ai_coach'
                  ? 'bg-[var(--color-primary)] text-black shadow-lg font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>AI Volume Coach</span>
              {aiAnalysis.criticalCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-rose-500 text-white font-black animate-pulse">
                  {aiAnalysis.criticalCount} criticità
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-black/20 font-bold">
                  {aiAnalysis.overallScore}/100
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveBuilderTab('info')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shrink-0 cursor-pointer ${
                activeBuilderTab === 'info'
                  ? 'bg-[var(--color-primary)] text-black shadow-lg font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Dati & Note</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-black/20 font-bold">
                {totalWeeks} sett.
              </span>
            </button>
          </div>

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* TAB 4: DATI GENERALI, CARTELLA & NOTE PROGRAMMA                    */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {activeBuilderTab === 'info' && (
            <div className="bg-slate-800/40 p-5 rounded-3xl border border-slate-700/60 space-y-4 animate-in fade-in duration-150">
              <h3 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <span>Impostazioni & Note del Programma</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end pt-1">
                {/* Titolo Programma */}
                <div className="md:col-span-6">
                  <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase tracking-wider">
                    Titolo del Programma
                  </label>
                  <input
                    type="text"
                    placeholder="es. Ipertrofia & Forza - Mesociclo 1"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-semibold text-sm focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                {/* Cartella di Archiviazione */}
                <div className="md:col-span-4">
                  <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase tracking-wider">
                    Cartella di Archiviazione
                  </label>
                  <select
                    value={folderId || ''}
                    onChange={e => setFolderId(e.target.value || null)}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500 font-bold text-xs cursor-pointer"
                  >
                    <option value="">Nessuna Cartella (Principale)</option>
                    {folders.map(f => (
                      <option key={f.id} value={f.id}>📁 {f.name}</option>
                    ))}
                  </select>
                </div>

                {/* Durata Settimane */}
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase tracking-wider text-center">
                    Durata
                  </label>
                  <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2">
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={totalWeeks}
                      onChange={e => setTotalWeeks(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-transparent text-white text-center font-extrabold text-sm focus:outline-none"
                    />
                    <span className="text-xs text-slate-400 font-semibold shrink-0">sett.</span>
                  </div>
                </div>
              </div>

              {/* Barra Descrizione & Obiettivi */}
              <div className="pt-3 border-t border-slate-700/40">
                <button
                  type="button"
                  onClick={() => setIsDescriptionModalOpen(true)}
                  className="w-full flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all text-left group cursor-pointer"
                  title="Clicca per aprire la finestra dedicata"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors block">
                        Descrizione & Obiettivi del Programma
                      </span>
                      {description.trim() ? (
                        <p className="text-xs text-slate-400 truncate italic mt-0.5">
                          "{description.replace(/\n+/g, ' ')}"
                        </p>
                      ) : (
                        <p className="text-xs text-slate-500 italic mt-0.5">
                          Nessuna nota inserita • Clicca per compilare la descrizione dettagliata
                        </p>
                      )}
                    </div>
                  </div>

                  <span className="text-xs font-bold text-amber-400 group-hover:text-amber-300 shrink-0 pl-2">
                    Apri Finestra Note →
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* TAB 2: ANALISI VOLUME (Radar Chart + Tabella Benchmark)            */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {activeBuilderTab === 'volume' && (
            <div className="animate-in fade-in duration-150">
              <MuscleVolumeSummary
                exercises={exercises}
                libraryExercises={libraryExercises}
                activeWeek={activeWeek}
                activeDay={activeDay}
                totalWeeks={totalWeeks}
              />
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* TAB 3: AI VOLUME COACH (Sistema Decisionale Compatto)             */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {activeBuilderTab === 'ai_coach' && (
            <div className="animate-in fade-in duration-150">
              <AIVolumeCoach
                analysis={aiAnalysis}
                onApplyAction={handleApplyVolumeAction}
              />
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* TAB 1: COSTRUTTORE OPERATIVO (Settimane, Giorni, Esercizi)         */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {activeBuilderTab === 'exercises' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Header Rapido Scheda */}
              <div className="flex items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-black text-white truncate">
                    {title || 'Programma Senza Titolo'}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold shrink-0">
                    • {totalWeeks} sett.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveBuilderTab('info')}
                  className="text-xs font-bold text-amber-400 hover:text-amber-300 underline cursor-pointer shrink-0"
                >
                  Modifica Dati & Note
                </button>
              </div>

          {/* BARRA SETTIMANE */}
          <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <Calendar className="w-4 h-4 text-[var(--color-primary)]" />
                <span className="text-xs font-black text-white uppercase tracking-wider">
                  Settimane ({totalWeeks})
                </span>
                {copiedWeekNumber && (
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
                    📋 Settimana {copiedWeekNumber} copiata
                  </span>
                )}
              </div>

              {/* Azioni Struttura Settimana */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => duplicateWeek(activeWeek)}
                  className="px-2.5 py-1 text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  title="Duplica la settimana attiva con tutti i suoi giorni ed esercizi"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Duplica Sett. {activeWeek}</span>
                </button>

                <button
                  type="button"
                  onClick={() => copyWeek(activeWeek)}
                  className="px-2 py-1 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors flex items-center gap-1 border border-slate-700 cursor-pointer"
                  title="Copia la settimana negli appunti"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copia</span>
                </button>

                {copiedWeekNumber && (
                  <button
                    type="button"
                    onClick={() => pasteWeek(activeWeek)}
                    className="px-2.5 py-1 text-xs font-bold bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    title={`Incolla Settimana ${copiedWeekNumber} su Settimana ${activeWeek}`}
                  >
                    <span>Incolla su Sett. {activeWeek}</span>
                  </button>
                )}

                {totalWeeks > 1 && (
                  <button
                    type="button"
                    onClick={() => deleteWeek(activeWeek)}
                    className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                    title={`Elimina Settimana ${activeWeek}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Pillole Settimane */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
              {Array.from({ length: totalWeeks }).map((_, wIdx) => {
                const wNum = wIdx + 1;
                const isCurrent = activeWeek === wNum;
                const countEx = exercises.filter(e => (e.week_number || 1) === wNum).length;

                // Calcolo stato avanzamento atleta per questa settimana
                const isWeekCompleted = athleteId && daysList.length > 0 && daysList.every(d => Boolean(athleteProgress.completedMap[`${wNum}-${d}`]));
                const isAthleteCurrentWeek = athleteId && athleteProgress.currentWeek === wNum && athleteProgress.hasStarted;

                return (
                  <button
                    key={wNum}
                    type="button"
                    onClick={() => setActiveWeek(wNum)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer relative ${
                      isCurrent
                        ? 'bg-[var(--color-primary)] text-black font-black shadow-md'
                        : isAthleteCurrentWeek
                        ? 'bg-amber-500/15 text-amber-300 border-2 border-amber-500/70 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                        : isWeekCompleted
                        ? 'bg-emerald-950/30 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700/60'
                    }`}
                  >
                    <span>Settimana {wNum}</span>

                    {/* Indicatori Avanzamento Atleta */}
                    {isWeekCompleted && (
                      <span className="text-[11px] text-emerald-400 font-bold" title="Settimana completata dall'atleta">✓</span>
                    )}
                    {isAthleteCurrentWeek && !isWeekCompleted && (
                      <span className="px-1.5 py-0.2 rounded-md text-[9px] font-black bg-amber-500 text-slate-950">
                        📍 In corso
                      </span>
                    )}

                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                        isCurrent ? 'bg-black/20 text-black' : 'bg-slate-900 text-slate-400'
                      }`}
                    >
                      {countEx} es.
                    </span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={addWeek}
                className="px-3 py-1.5 bg-slate-800/60 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors border border-dashed border-slate-700 shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nuova Settimana</span>
              </button>
            </div>
          </div>

          {/* BARRA GIORNI */}
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
                <span className="text-[11px] font-bold text-slate-400 mr-1">Giorni:</span>
                {daysList.map((dName, dIdx) => {
                  const isCurrentDay = activeDay === dName;
                  const exCountDay = exercises.filter(
                    e => (e.week_number || 1) === activeWeek && (e.day_name || 'Giorno A') === dName
                  ).length;

                  // Calcolo avanzamento giorno per la settimana attiva
                  const isDayDone = athleteId && Boolean(athleteProgress.completedMap[`${activeWeek}-${dName}`]);
                  const isAthleteTargetDay = athleteId && athleteProgress.currentWeek === activeWeek && athleteProgress.currentDay === dName && athleteProgress.hasStarted;

                  return (
                    <div key={dName} className="flex items-center group/day shrink-0">
                      <button
                        type="button"
                        onClick={() => setActiveDay(dName)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          isCurrentDay
                            ? 'bg-slate-700 text-white border border-[var(--color-primary)] font-black shadow-sm'
                            : isAthleteTargetDay
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/60 font-black'
                            : isDayDone
                            ? 'bg-emerald-950/30 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-800/50 text-slate-400 border border-transparent hover:bg-slate-800'
                        }`}
                      >
                        {isDayDone && <span className="text-emerald-400 font-bold text-[10px]" title="Giorno completato">✓</span>}
                        {isAthleteTargetDay && <span className="text-amber-400 font-bold text-[10px]" title="Giorno attuale atleta">📍</span>}
                        <span>{dName}</span>
                        <span className="text-[10px] opacity-70">({exCountDay})</span>

                        {/* Frecce veloci per riordinare giorno a sinistra o a destra */}
                        {daysList.length > 1 && isCurrentDay && (
                          <div className="flex items-center gap-0.5 ml-1 pl-1 border-l border-slate-500/60">
                            {dIdx > 0 && (
                              <span
                                role="button"
                                tabIndex={0}
                                onClick={(e) => moveDayLeft(dName, e)}
                                className="p-0.5 hover:bg-slate-600 text-slate-300 hover:text-white rounded transition-colors"
                                title={`Sposta "${dName}" prima`}
                              >
                                <ChevronLeft className="w-3 h-3" />
                              </span>
                            )}
                            {dIdx < daysList.length - 1 && (
                              <span
                                role="button"
                                tabIndex={0}
                                onClick={(e) => moveDayRight(dName, e)}
                                className="p-0.5 hover:bg-slate-600 text-slate-300 hover:text-white rounded transition-colors"
                                title={`Sposta "${dName}" dopo`}
                              >
                                <ChevronRight className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={addDay}
                  className="px-2.5 py-1 text-xs font-bold text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded-lg transition-colors flex items-center gap-1 shrink-0 border border-dashed border-[var(--color-primary)]/30 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Giorno
                </button>
              </div>

              {/* Azioni Struttura Giorno */}
              <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0 flex-wrap">
                {/* Riordina Giorni */}
                {daysList.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setIsReorderDaysModalOpen(true)}
                    className="px-2 py-1 text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors flex items-center gap-1 border border-slate-700 cursor-pointer"
                    title="Riordina la sequenza dei giorni di allenamento"
                  >
                    <ArrowUpDown className="w-3 h-3 text-[var(--color-primary)]" />
                    <span>Riordina</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => duplicateDay(activeDay)}
                  className="px-2 py-1 text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors flex items-center gap-1 border border-slate-700 cursor-pointer"
                  title="Duplica il giorno attivo e i suoi esercizi"
                >
                  <Copy className="w-3 h-3" />
                  <span>Duplica Giorno</span>
                </button>

                <button
                  type="button"
                  onClick={() => copyDay(activeDay)}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="Copia esercizi del giorno negli appunti"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>

                {copiedDayData && (
                  <button
                    type="button"
                    onClick={() => pasteDay(activeDay)}
                    className="px-2 py-1 text-[11px] font-bold bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    title={`Incolla esercizi da "${copiedDayData.dayName}" in "${activeDay}"`}
                  >
                    <span>Incolla su {activeDay}</span>
                  </button>
                )}

                {daysList.length > 1 && (
                  <button
                    type="button"
                    onClick={() => deleteDay(activeDay)}
                    className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                    title="Elimina giorno"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Ripristina Giorno Eliminato */}
                {deletedDaysHistory.length > 0 && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsRestoreDropdownOpen(!isRestoreDropdownOpen)}
                      className="px-2 py-1 text-[11px] font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-sm"
                      title="Ripristina giorni cancellati accidentalmente"
                    >
                      <RotateCcw className="w-3 h-3 text-amber-400" />
                      <span>Ripristina ({deletedDaysHistory.length})</span>
                    </button>

                    {isRestoreDropdownOpen && (
                      <div className="absolute right-0 top-full mt-1.5 w-64 p-2 rounded-2xl bg-slate-900 border border-amber-500/40 shadow-2xl z-50 space-y-1.5 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between px-2 py-1 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <span>Giorni Eliminati ({deletedDaysHistory.length})</span>
                          <button
                            type="button"
                            onClick={() => setIsRestoreDropdownOpen(false)}
                            className="hover:text-white cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="max-h-48 overflow-y-auto space-y-1">
                          {deletedDaysHistory.map((rec) => (
                            <div
                              key={rec.id}
                              className="p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 flex items-center justify-between gap-2 transition-colors"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-white truncate">{rec.dayName}</p>
                                <p className="text-[10px] text-slate-400">
                                  {rec.exercises.length} {rec.exercises.length === 1 ? 'esercizio' : 'esercizi'}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => restoreDay(rec)}
                                className="px-2 py-1 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-slate-950 font-black text-[10px] shrink-0 cursor-pointer shadow-sm"
                              >
                                Ripristina
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* LIVELLO B & C: CONTENUTO SEDUTA & PROGRESSIONE CONTESTUALE      */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2 group cursor-pointer" onClick={() => {
                  if (!isRenamingDay) {
                    setDayNameInput(activeDay);
                    setIsRenamingDay(true);
                  }
                }}>
                  {isRenamingDay ? (
                    <input 
                      type="text" 
                      value={dayNameInput}
                      onChange={e => setDayNameInput(e.target.value)}
                      onBlur={() => renameActiveDay(dayNameInput)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') renameActiveDay(dayNameInput);
                        if (e.key === 'Escape') setIsRenamingDay(false);
                      }}
                      autoFocus
                      className="bg-slate-800 text-white px-2 py-1 rounded border border-[var(--color-primary)] outline-none text-base font-bold w-48"
                    />
                  ) : (
                    <>
                      <span>{activeDay}</span>
                      <Pencil className="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover:opacity-100 hover:text-[var(--color-primary)] transition-all" />
                    </>
                  )}
                  <span className="text-xs font-normal text-slate-400 ml-1">(Settimana {activeWeek})</span>
                </h3>

                {/* Badge Durata Stimata */}
                {currentWeekDayExercises.length > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-full text-xs font-bold shadow-sm">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{estimatedTime.display}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2 sm:mt-0">
                <button 
                  onClick={fetchAiSuggestions}
                  disabled={aiSuggestionsLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 rounded-lg transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {aiSuggestionsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {aiSuggestionsLoading ? 'Analisi...' : 'Consigli IA'}
                </button>
                <button 
                  onClick={addExercise}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[var(--color-primary)] text-black hover:bg-[var(--color-primary-hover)] rounded-lg transition-colors shadow-md shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Aggiungi Esercizio
                </button>
              </div>
            </div>

            {isAiSuggestionsOpen && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 relative shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
                <button onClick={() => setIsAiSuggestionsOpen(false)} className="absolute top-3 right-3 text-slate-400 hover:text-amber-500 transition-colors">
                  <X className="w-4 h-4" />
                </button>
                <h4 className="text-amber-500 font-bold text-sm flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4" /> Consigli Co-Pilot
                </h4>
                {aiSuggestionsLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
                  </div>
                ) : aiSuggestions && aiSuggestions.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {aiSuggestions.map((suggestion, idx) => {
                      const sId = suggestion.id || String(idx);
                      return (
                        <div key={sId} className="bg-slate-900/60 p-4 rounded-xl border border-amber-500/20 shadow-sm flex flex-col gap-2 relative">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h5 className="text-[11px] uppercase font-bold text-amber-500 mb-1 flex items-center gap-1.5"><Info className="w-3.5 h-3.5"/> Osservazione</h5>
                              <p className="text-xs text-slate-300 leading-relaxed mb-3">{suggestion.osservazione}</p>
                              
                              <h5 className="text-[11px] uppercase font-bold text-rose-400 mb-1 flex items-center gap-1.5"><X className="w-3.5 h-3.5"/> Motivo</h5>
                              <p className="text-xs text-slate-300 leading-relaxed mb-3">{suggestion.motivo}</p>

                              <h5 className="text-[11px] uppercase font-bold text-emerald-400 mb-1 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5"/> Modifica Suggerita</h5>
                              <p className="text-xs text-slate-200 font-bold leading-relaxed">{suggestion.modifica_suggerita}</p>
                              <p className="text-[10px] text-slate-500 mt-1">Target: <span className="font-mono bg-slate-800 px-1 py-0.5 rounded">{suggestion.target_exercise_name}</span></p>
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-slate-800/50">
                            <button onClick={() => dismissSuggestion(sId)} className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer">
                              Ignora
                            </button>
                            <button onClick={() => applySuggestion(suggestion, idx)} className="px-3 py-1.5 text-xs font-bold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer">
                              <Sparkles className="w-3 h-3"/> Applica
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : aiSuggestions && aiSuggestions.length === 0 ? (
                  <div className="text-center py-6">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-2">
                      <Sparkles className="w-5 h-5 text-emerald-500" />
                    </div>
                    <p className="text-sm text-emerald-400 font-bold mb-1">Nessuna criticità rilevata!</p>
                    <p className="text-xs text-slate-400">La seduta sembra ben bilanciata e coerente.</p>
                  </div>
                ) : null}
              </div>
            )}

            {aiReasoning && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-4 relative shadow-sm flex gap-3 animate-in fade-in">
                <button onClick={() => setAiReasoning('')} className="absolute top-2 right-2 text-slate-400 hover:text-blue-400 transition-colors">
                  <X className="w-4 h-4" />
                </button>
                <div className="shrink-0 mt-0.5">
                  <Sparkles className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-blue-400 font-bold text-sm mb-1">Motivazione IA</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{aiReasoning}</p>
                </div>
              </div>
            )}

            {currentWeekDayExercises.length === 0 ? (
              <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-xl p-8 text-center">
                <p className="text-sm text-slate-400 mb-3">Nessun esercizio inserito per {activeDay} nella Settimana {activeWeek}.</p>
                <button
                  type="button"
                  onClick={addExercise}
                  className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-700 transition-colors cursor-pointer"
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
                      {/* LIVELLO B: Intestazione Esercizio & Parametri Primari */}
                      <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-800/40">
                        <div className="flex items-center gap-2 flex-1 w-full">
                          <div className="cursor-move text-slate-500 hover:text-white p-1.5 hover:bg-slate-700/50 rounded-lg transition-colors hidden sm:flex items-center justify-center shrink-0">
                            <GripVertical className="w-4 h-4" />
                          </div>
                          
                          <div className="flex-1 space-y-1">
                            <input
                              type="text"
                              placeholder="Nome esercizio (es. Panca Piana o Riccio Squat)"
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

                            {/* Badge & Azione Rapida se Esercizio Personalizzato non presente nella Libreria */}
                            {ex.name && ex.name.trim().length > 1 && !libraryExercises.some(libEx => libEx.name.trim().toLowerCase() === ex.name!.trim().toLowerCase()) && (
                              <div className="flex items-center justify-between gap-2 pt-1 flex-wrap animate-in fade-in duration-150">
                                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 flex items-center gap-1">
                                  <Sparkles className="w-3 h-3 text-amber-400" />
                                  Esercizio personalizzato (incluso nella programmazione)
                                </span>

                                <button
                                  type="button"
                                  onClick={async () => {
                                    const res = await createExercise({
                                      name: ex.name!.trim(),
                                      category: 'Altro',
                                      equipment: 'Corpo Libero',
                                    });
                                    if (res.success) {
                                      showSuccess('Aggiunto alla Libreria!', `"${ex.name}" è ora salvato anche nella libreria generale.`);
                                    } else {
                                      showError('Impossibile salvare in libreria: ' + (res.error || ''));
                                    }
                                  }}
                                  className="text-[10px] font-black text-amber-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-0.5 rounded-lg border border-slate-600 transition-colors flex items-center gap-1 cursor-pointer"
                                  title="Salva questo esercizio anche nel catalogo/database generale"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Salva in Libreria Esercizi</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Parametri di base in riga */}
                        {ex.progression_rule_id ? (
                          /* SE PROGRESSIONE ATTIVA: Mostra badge integrato elegante del target della settimana corrente */
                          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end mt-2 sm:mt-0">
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-950/50 border border-cyan-500/30 rounded-xl text-xs font-bold text-cyan-300 shadow-sm">
                              <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                              <span className="text-cyan-400 font-extrabold">Settimana {activeWeek}:</span>
                              <span className="text-white">{ex.sets || 3} Set</span>
                              <span className="text-slate-600">•</span>
                              <span className="text-white">{ex.is_time_based ? (ex.reps_target?.includes('min') ? ex.reps_target : (ex.duration_seconds && ex.duration_seconds >= 60 ? `${(ex.duration_seconds / 60).toFixed(1).replace('.0', '')} min` : `${ex.duration_seconds || 45}s`)) : `${ex.reps_target || '8-10'} Rep`}</span>
                              <span className="text-slate-600">•</span>
                              <span className="text-amber-400 font-black">{ex.target_weight ? `${ex.target_weight} kg` : 'Progressione'}</span>
                              <span className="text-slate-600">•</span>
                              <span className="text-slate-300">{ex.rest_seconds || 90}s Rec</span>
                            </div>

                            {/* Duplica Singolo Esercizio */}
                            <button
                              type="button"
                              onClick={() => duplicateExercise(globalIdx)}
                              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors border border-slate-700 cursor-pointer"
                              title="Duplica questo esercizio"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            {/* Toggle Espansione Dettagli (Note / Alternativo) */}
                            <button
                              type="button"
                              onClick={() => setExpandedExerciseIndex(isExpanded ? null : globalIdx)}
                              className={`p-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${isExpanded ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                              title="Mostra note tecniche ed esercizio alternativo"
                            >
                              <Sliders className="w-4 h-4" />
                            </button>

                            {/* Elimina Esercizio */}
                            <button
                              type="button"
                              onClick={() => removeExercise(globalIdx)}
                              className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors rounded-lg cursor-pointer"
                              title="Elimina esercizio"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          /* SE NESSUNA PROGRESSIONE (MODALITÀ MANUALE FISSA): Mostra i campi di input modificabili standard */
                          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto justify-between sm:justify-end mt-2 sm:mt-0">
                            {/* Toggle Tipo Lavoro: Reps vs Minuti vs Secondi */}
                            {(() => {
                              const workMode: 'reps' | 'minutes' | 'seconds' = !ex.is_time_based
                                ? 'reps'
                                : (ex.reps_target && ex.reps_target.includes('min')) || (ex.duration_seconds && ex.duration_seconds >= 60 && ex.duration_seconds % 30 === 0 && !ex.reps_target?.includes('s'))
                                ? 'minutes'
                                : 'seconds';

                              const cycleMode = () => {
                                if (workMode === 'reps') {
                                  // Da Reps a Minuti
                                  const prev = parseFloat(ex.reps_target || '') || 1;
                                  const mins = prev > 10 ? 1 : prev;
                                  updateExerciseFields(globalIdx, {
                                    is_time_based: true,
                                    duration_seconds: Math.round(mins * 60),
                                    reps_target: `${mins} min`,
                                  });
                                } else if (workMode === 'minutes') {
                                  // Da Minuti a Secondi
                                  const secs = ex.duration_seconds || 45;
                                  updateExerciseFields(globalIdx, {
                                    is_time_based: true,
                                    duration_seconds: secs,
                                    reps_target: `${secs}s`,
                                  });
                                } else {
                                  // Da Secondi a Reps
                                  updateExerciseFields(globalIdx, {
                                    is_time_based: false,
                                    reps_target: '10-12',
                                  });
                                }
                              };

                              return (
                                <>
                                  {/* Bottone Ciclo Unità: Reps / Minuti / Secondi */}
                                  <button
                                    type="button"
                                    onClick={cycleMode}
                                    className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1 border transition-colors cursor-pointer ${
                                      workMode === 'minutes'
                                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-sm'
                                        : workMode === 'seconds'
                                        ? 'bg-sky-500/15 text-sky-300 border-sky-500/40 shadow-sm'
                                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                                    }`}
                                    title="Clicca per alternare: Ripetizioni (Reps) ➔ Minuti (Min) ➔ Secondi (Sec)"
                                  >
                                    {workMode === 'minutes' ? (
                                      <>
                                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                                        <span>Minuti</span>
                                      </>
                                    ) : workMode === 'seconds' ? (
                                      <>
                                        <Clock className="w-3.5 h-3.5 text-sky-400" />
                                        <span>Secondi</span>
                                      </>
                                    ) : (
                                      <>
                                        <Repeat className="w-3.5 h-3.5 text-slate-400" />
                                        <span>Reps</span>
                                      </>
                                    )}
                                  </button>

                                  {/* Sets */}
                                  <div className="flex items-center border border-slate-700 rounded-lg overflow-hidden bg-slate-950">
                                    <span className="px-2 text-[10px] text-slate-400 font-bold uppercase bg-slate-800 py-2">Set</span>
                                    <input
                                      type="number"
                                      value={ex.sets === 0 ? '' : (ex.sets || 3)}
                                      onChange={e => updateExercise(globalIdx, 'sets', e.target.value === '' ? 0 : (parseInt(e.target.value) || 1))}
                                      className="w-12 px-1 py-1.5 bg-transparent text-xs text-white font-bold text-center focus:outline-none"
                                      min="1"
                                    />
                                  </div>

                                  {/* Target Reps / Minuti / Secondi */}
                                  {workMode === 'minutes' ? (
                                    <div className="flex items-center border border-amber-500/40 rounded-lg overflow-hidden bg-slate-950 ring-1 ring-amber-500/20">
                                      <button
                                        type="button"
                                        onClick={cycleMode}
                                        className="px-2 text-[10px] text-amber-300 font-black uppercase bg-amber-500/20 py-2 hover:bg-amber-500/30 transition-colors cursor-pointer"
                                        title="Cambia unità: Reps / Min / Sec"
                                      >
                                        Min
                                      </button>
                                      <input
                                        type="text"
                                        placeholder="1"
                                        value={
                                          ex.reps_target?.includes('min')
                                            ? ex.reps_target.replace('min', '').trim()
                                            : ex.duration_seconds
                                            ? (ex.duration_seconds / 60).toString()
                                            : '1'
                                        }
                                        onChange={e => {
                                          const val = e.target.value;
                                          const num = parseFloat(val) || 0;
                                          updateExerciseFields(globalIdx, {
                                            is_time_based: true,
                                            duration_seconds: Math.round(num * 60),
                                            reps_target: `${val} min`,
                                          });
                                        }}
                                        className="w-16 px-1 py-1.5 bg-transparent text-xs text-amber-200 font-black text-center focus:outline-none"
                                      />
                                    </div>
                                  ) : workMode === 'seconds' ? (
                                    <div className="flex items-center border border-sky-500/40 rounded-lg overflow-hidden bg-slate-950 ring-1 ring-sky-500/20">
                                      <button
                                        type="button"
                                        onClick={cycleMode}
                                        className="px-2 text-[10px] text-sky-300 font-black uppercase bg-sky-500/20 py-2 hover:bg-sky-500/30 transition-colors cursor-pointer"
                                        title="Cambia unità: Reps / Min / Sec"
                                      >
                                        Sec
                                      </button>
                                      <input
                                        type="number"
                                        placeholder="45"
                                        value={ex.duration_seconds === 0 ? '' : (ex.duration_seconds || 45)}
                                        onChange={e => {
                                          const num = e.target.value === '' ? 0 : (parseInt(e.target.value) || 0);
                                          updateExerciseFields(globalIdx, {
                                            is_time_based: true,
                                            duration_seconds: num,
                                            reps_target: `${num}s`,
                                          });
                                        }}
                                        className="w-14 px-1 py-1.5 bg-transparent text-xs text-sky-200 font-black text-center focus:outline-none"
                                      />
                                    </div>
                                  ) : (
                                    <div className="flex items-center border border-slate-700 rounded-lg overflow-hidden bg-slate-950">
                                      <button
                                        type="button"
                                        onClick={cycleMode}
                                        className="px-2 text-[10px] text-slate-400 font-bold uppercase bg-slate-800 py-2 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
                                        title="Cambia unità: Reps / Min / Sec"
                                      >
                                        Rep
                                      </button>
                                      <input
                                        type="text"
                                        placeholder="8-10"
                                        value={ex.reps_target || ''}
                                        onChange={e => updateExercise(globalIdx, 'reps_target', e.target.value)}
                                        className="w-16 px-1 py-1.5 bg-transparent text-xs text-white font-bold text-center focus:outline-none"
                                      />
                                    </div>
                                  )}
                                </>
                              );
                            })()}

                            {/* Target Carico (kg) */}
                            <div className="flex items-center border border-slate-700 rounded-lg overflow-hidden bg-slate-950">
                              <span className="px-2 text-[10px] text-sky-400 font-bold uppercase bg-slate-800 py-2">Kg</span>
                              <input
                                type="number"
                                step="0.5"
                                placeholder="60"
                                value={ex.target_weight || ''}
                                onChange={e => updateExercise(globalIdx, 'target_weight', e.target.value)}
                                className="w-14 px-1 py-1.5 bg-transparent text-xs text-white font-bold text-center focus:outline-none"
                              />
                            </div>

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

                            {/* Duplica Singolo Esercizio */}
                            <button
                              type="button"
                              onClick={() => duplicateExercise(globalIdx)}
                              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors border border-slate-700 cursor-pointer"
                              title="Duplica questo esercizio"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            {/* Toggle Espansione Parametri Avanzati */}
                            <button
                              type="button"
                              onClick={() => setExpandedExerciseIndex(isExpanded ? null : globalIdx)}
                              className={`p-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${isExpanded ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                              title="Mostra parametri avanzati (RIR, TUT, Note)"
                            >
                              <Sliders className="w-4 h-4" />
                            </button>

                            {/* Elimina Esercizio */}
                            <button
                              type="button"
                              onClick={() => removeExercise(globalIdx)}
                              className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors rounded-lg cursor-pointer"
                              title="Elimina esercizio"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* LIVELLO C: Progressione Contestuale Separata */}
                      {ex.name && (
                        <div className="px-4 pb-3 bg-slate-800/20">
                          <ExerciseProgressionControl
                            exercise={ex}
                            exerciseIndex={globalIdx}
                            athleteId={athleteId}
                            athleteName={currentAthlete?.fullName}
                            programId={initialWorkout?.id}
                            programName={title}
                            onUpdateExercise={(fields) => updateExerciseFields(globalIdx, fields)}
                          />
                        </div>
                      )}

                      {/* Advanced Fields Section (Expanded) */}
                      {isExpanded && (
                        <div className="p-4 bg-slate-950/80 border-t border-slate-800 space-y-3">
                          {ex.progression_rule_id ? (
                            <>
                              <div className="flex items-center gap-2 p-2.5 bg-cyan-950/30 border border-cyan-800/40 rounded-xl text-cyan-300 text-xs font-semibold">
                                <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
                                <span>Carico, ripetizioni, RIR e parametri di questa scheda sono automatizzati dalla progressione settimanale attiva.</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {/* Esercizio Alternativo */}
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Esercizio Alternativo</label>
                                  <input
                                    type="text"
                                    placeholder="es. Leg Press se occupato"
                                    value={ex.alternative_exercise || ''}
                                    onChange={e => updateExercise(globalIdx, 'alternative_exercise', e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-[var(--color-primary)]"
                                  />
                                </div>

                                {/* Note Tecniche */}
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Note Tecniche per l'Atleta</label>
                                  <input
                                    type="text"
                                    placeholder="es. Fermo al petto di 1 secondo, discesa controllata"
                                    value={ex.notes || ''}
                                    onChange={e => updateExercise(globalIdx, 'notes', e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-[var(--color-primary)]"
                                  />
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                {/* Carico Target */}
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Carico Target / Peso</label>
                                  <input
                                    type="text"
                                    placeholder="es. 80 kg o 75% 1RM"
                                    value={ex.target_weight || ''}
                                    onChange={e => updateExercise(globalIdx, 'target_weight', e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-[var(--color-primary)] font-bold focus:outline-none focus:border-[var(--color-primary)]"
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
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-bold focus:outline-none focus:border-[var(--color-primary)]"
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
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-[var(--color-primary)]"
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
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-[var(--color-primary)]"
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
                                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-[var(--color-primary)]"
                                />
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

    </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--color-panel-border)] bg-slate-900/50 flex justify-end gap-3 rounded-b-2xl">
          <button 
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-slate-300 hover:text-white transition-colors"
          >
            Annulla
          </button>
          <button 
            type="button"
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

      {/* Modale Riordina Sequenza Giorni */}
      {isReorderDaysModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-[#0c1017] border border-slate-700/80 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <ArrowUpDown className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Riordina Sequenza Giorni</h3>
                  <p className="text-[11px] text-slate-400">Modifica l'ordine dei giorni nella scheda</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsReorderDaysModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
              {daysList.map((dName, idx) => {
                const exCount = exercises.filter(
                  e => (e.week_number || 1) === activeWeek && (e.day_name || 'Giorno A') === dName
                ).length;
                const isSelected = activeDay === dName;

                return (
                  <div
                    key={dName}
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                      isSelected
                        ? 'bg-slate-900/90 border-[var(--color-primary)]/60 shadow-sm'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-xl bg-slate-800 text-amber-300 text-xs font-black flex items-center justify-center border border-slate-700">
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <span>{dName}</span>
                          {isSelected && (
                            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                              Attivo
                            </span>
                          )}
                        </h4>
                        <span className="text-[11px] text-slate-400">{exCount} esercizi in W{activeWeek}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveDay(idx, idx - 1)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-200 rounded-xl border border-slate-700 transition-colors cursor-pointer"
                        title="Sposta su"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === daysList.length - 1}
                        onClick={() => moveDay(idx, idx + 1)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-200 rounded-xl border border-slate-700 transition-colors cursor-pointer"
                        title="Sposta giù"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsReorderDaysModalOpen(false)}
                className="w-full py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-black font-black text-xs rounded-xl shadow transition-all cursor-pointer text-center"
              >
                Conferma Ordine Giorni
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale Conferma Modifica Template */}
      {showTemplateUpdatePrompt && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-5 relative">
            {!confirmGlobalOverwrite ? (
              <>
                <h3 className="text-lg font-black text-white text-center">Aggiornamento Template Globale</h3>
                <p className="text-sm text-slate-300 text-center">
                  Stai modificando un Template condiviso. Come vuoi applicare questi cambiamenti?
                </p>
                
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setConfirmGlobalOverwrite(true)}
                    disabled={isSaving}
                    className="w-full p-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left transition-colors"
                  >
                    <div className="font-bold text-white mb-1">Applica a tutti gli atleti attuali</div>
                    <div className="text-xs text-slate-400">La modifica influenzerà le schede in corso di tutti gli atleti collegati.</div>
                  </button>
                  <button
                    type="button"
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
                    onClick={() => {
                      setShowTemplateUpdatePrompt(false);
                      setConfirmGlobalOverwrite(false);
                    }}
                    disabled={isSaving}
                    className="text-xs text-slate-500 hover:text-white font-bold"
                  >
                    Annulla
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <span className="text-4xl mb-3 block">⚠️</span>
                  <h3 className="text-lg font-black text-white">Sei sicuro?</h3>
                </div>
                <p className="text-sm text-slate-300 text-center bg-red-500/10 border border-red-500/20 p-4 rounded-xl">
                  <strong>Attenzione:</strong> applicando le modifiche a tutti gli atleti, sovrascriverai anche le schede contrassegnate come 'Personalizzate'. Vuoi procedere?
                </p>
                
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setConfirmGlobalOverwrite(false)}
                    disabled={isSaving}
                    className="flex-1 p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors"
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSave('ALL')}
                    disabled={isSaving}
                    className="flex-1 p-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    {isSaving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    Conferma e Sovrascrivi Tutto
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Finestra Dedicata per Descrizione & Obiettivi */}
      {isDescriptionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-[#090d14] border border-slate-700/80 rounded-3xl p-6 shadow-2xl space-y-4 relative flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Descrizione, Focus & Obiettivi</h3>
                  <p className="text-xs text-slate-400">Note generali visibili all'atleta per questo programma</p>
                </div>
              </div>
              <button
                onClick={() => setIsDescriptionModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 min-h-[300px] flex flex-col">
              <textarea
                placeholder="Scrivi qui gli obiettivi del mesociclo, indicazioni su carichi, recupero, alimentazione o focus specifici..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={12}
                autoFocus
                className="w-full flex-1 p-4 bg-slate-900/90 border border-slate-700/70 rounded-2xl text-slate-200 text-sm leading-relaxed focus:outline-none focus:border-[var(--color-primary)] transition-colors resize-none no-scrollbar"
              />
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => setIsDescriptionModalOpen(false)}
                className="px-5 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-black text-xs font-black rounded-xl transition-all shadow-md cursor-pointer"
              >
                Salva & Chiudi Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── BANNER FLUTTUANTE RIPRISTINO RAPIDO GIORNO ELIMINATO ─── */}
      {undoBanner && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="p-4 rounded-2xl bg-slate-900/95 border border-amber-500/50 shadow-2xl backdrop-blur-xl flex items-center gap-4 text-white shadow-black/80">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                <span>Giorno eliminato</span>
              </h4>
              <p className="text-[11px] text-slate-300 truncate max-w-[200px]">
                "{undoBanner.record.dayName}" ({undoBanner.record.exercises.length} es.)
              </p>
            </div>
            <button
              type="button"
              onClick={() => restoreDay(undoBanner.record)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-amber-400 text-slate-950 font-black text-xs hover:scale-105 active:scale-95 transition-all shadow-lg shadow-amber-500/20 cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Ripristina</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (undoBanner.timerId) clearTimeout(undoBanner.timerId);
                setUndoBanner(null);
              }}
              className="p-1 text-slate-500 hover:text-white rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
