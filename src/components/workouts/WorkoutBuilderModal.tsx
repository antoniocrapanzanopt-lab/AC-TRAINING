import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Save, Trash2, X, GripVertical, Sliders, Clock, Sparkles, Pencil, Loader2, Info, Dumbbell, Calendar, Copy, Repeat, ArrowLeft, Zap, FileText, Activity, Compass, ArrowRight, Target, RotateCcw, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Flame, TrendingUp, User, Link2, Unlink2, Layers, AlertTriangle, FastForward } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { generateAISmartSuggestions, CoPilotActionableSuggestion } from '../../lib/ai/workoutGenerator';
import { WorkoutTemplate, WorkoutExercise } from '../../types/workout';
import { useWorkouts } from '../../context/WorkoutsContext';
import { useExercises } from '../../context/ExercisesContext';
import { useAthletes } from '../../context/AthletesContext';
import { useProgressions } from '../../context/ProgressionsContext';
import { useToast } from '../../context/ToastContext';
import { calculateEstimatedWorkoutTime } from '../../utils/workoutUtils';
import { extractGroupTagFromNotes, encodeGroupTagInNotes } from '../../utils/noteCleaner';
import { AICoPilotModal } from './AICoPilotModal';
import { GeneratedWorkoutResponse, normalizeDayName } from '../../lib/ai/workoutGenerator';
import { ExerciseProgressionControl } from './progression/ExerciseProgressionControl';
import { generateWeeklyBlockProjection } from '../../lib/progression/progressionEngine';
import { MuscleVolumeSummary } from './MuscleVolumeSummary';
import { AIVolumeCoach } from './AIVolumeCoach';
import { calculateMuscleVolumeSummary } from '../../utils/muscleVolumeCalculator';
import { analyzeVolumeWithAI, ActionPayload } from '../../utils/aiVolumeCoach';

// Helper di formattazione e parsing per i tempi di recupero (REC)
export function formatRestSeconds(seconds?: number): string {
  if (seconds === undefined || seconds === null || isNaN(seconds) || seconds < 0) return '01:00';
  const total = Math.max(0, Math.round(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function parseRestInput(input: string): number {
  const clean = input.trim().toLowerCase();
  if (!clean) return 60;

  // Formato mm:ss o m:s o m.s o m,s o m's (es. 1:30, 01:30, 1.30, 1,30, 1'30)
  const colonMatch = clean.match(/^(\d+)[.:',](\d+)$/);
  if (colonMatch) {
    const mins = parseInt(colonMatch[1], 10) || 0;
    const secs = parseInt(colonMatch[2], 10) || 0;
    return mins * 60 + secs;
  }

  // Formato con minuti es. 2m, 2min, 2', 1.5m
  const minMatch = clean.match(/^(\d+(?:\.\d+)?)\s*(?:m|min|')$/);
  if (minMatch) {
    const mins = parseFloat(minMatch[1]) || 0;
    return Math.round(mins * 60);
  }

  // Formato con secondi es. 90s, 90", 45sec
  const secMatch = clean.match(/^(\d+)\s*(?:s|sec|"|'')?$/);
  if (secMatch) {
    const num = parseInt(secMatch[1], 10) || 0;
    return num;
  }

  // Fallback a numero puro (se <= 10 interpretato come minuti, altrimenti secondi)
  const num = parseInt(clean, 10);
  if (!isNaN(num)) {
    return num;
  }

  return 60;
}

const REST_PRESETS = [
  { label: '30"', sec: 30 },
  { label: '45"', sec: 45 },
  { label: '1\'00"', sec: 60 },
  { label: '1\'15"', sec: 75 },
  { label: '1\'30"', sec: 90 },
  { label: '2\'00"', sec: 120 },
  { label: '2\'30"', sec: 150 },
  { label: '3\'00"', sec: 180 },
];

export const RestTimeCell: React.FC<{
  restSeconds?: number;
  onChange: (seconds: number) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}> = ({ restSeconds = 60, onChange, onKeyDown }) => {
  const [isFocused, setIsFocused] = useState(false);
  const [localText, setLocalText] = useState('');
  const [showPresets, setShowPresets] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const formattedValue = useMemo(() => {
    return formatRestSeconds(restSeconds);
  }, [restSeconds]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowPresets(false);
      }
    };
    if (showPresets) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPresets]);

  const handleFocus = () => {
    setIsFocused(true);
    setLocalText(formattedValue);
  };

  const handleBlur = () => {
    setIsFocused(false);
    const parsed = parseRestInput(localText);
    onChange(parsed);
  };

  const handleKeyDownInternal = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const parsed = parseRestInput(localText);
      onChange(parsed);
      (e.target as HTMLInputElement).blur();
    }
    if (onKeyDown) onKeyDown(e);
  };

  const adjustSeconds = (delta: number) => {
    const next = Math.max(0, (restSeconds || 60) + delta);
    onChange(next);
  };

  return (
    <div className="relative group/rec" ref={containerRef}>
      <div className="relative flex items-center">
        <input
          type="text"
          placeholder="01:30"
          value={isFocused ? localText : formattedValue}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={(e) => setLocalText(e.target.value)}
          onKeyDown={handleKeyDownInternal}
          className="workout-cell-input w-full px-1 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-bold text-center focus:outline-none focus:border-[var(--color-primary)] font-mono tracking-tight"
          title="Digita es. 90, 1:30, 45s o clicca l'orologio per opzioni rapide"
        />
        
        {/* Pulsante rapido popover preset */}
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShowPresets(prev => !prev)}
          className="absolute right-0.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-500 hover:text-amber-400 opacity-40 hover:opacity-100 transition cursor-pointer"
          title="Apri tempi di recupero preimpostati (+/- 15s)"
        >
          <Clock className="w-2.5 h-2.5" />
        </button>
      </div>

      {/* Popover dei preset rapidi */}
      {showPresets && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 p-2 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl space-y-1.5 min-w-[175px] animate-in fade-in">
          <div className="flex items-center justify-between gap-1 pb-1 border-b border-slate-800">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Recupero</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => adjustSeconds(-15)}
                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[9px] font-bold text-slate-300 hover:text-white cursor-pointer"
                title="-15 secondi"
              >
                -15s
              </button>
              <button
                type="button"
                onClick={() => adjustSeconds(15)}
                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[9px] font-bold text-slate-300 hover:text-white cursor-pointer"
                title="+15 secondi"
              >
                +15s
              </button>
            </div>
          </div>

          {/* Griglia Preset Rapidi */}
          <div className="grid grid-cols-4 gap-1">
            {REST_PRESETS.map((p) => (
              <button
                key={p.sec}
                type="button"
                onClick={() => {
                  onChange(p.sec);
                  setShowPresets(false);
                }}
                className={`py-1 px-0.5 rounded-md text-[10px] font-bold transition text-center cursor-pointer ${
                  restSeconds === p.sec
                    ? 'bg-amber-500 text-black font-black'
                    : 'bg-slate-950 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper per convertire l'indice numerico (0, 1, 2...) in lettere d'ordine (A, B, C... Z, AA)
export const indexToLetter = (index: number): string => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (index < 26) return letters[index];
  const first = letters[Math.floor(index / 26) - 1];
  const second = letters[index % 26];
  return `${first}${second}`;
};

export interface DayExerciseGroupInfo {
  label: string; // "A", "B1", "B2", "C", "D1", "D2", "D3"
  baseLetter: string; // "A", "B", "C", "D"
  isGrouped: boolean; // true se il gruppo ha >= 2 esercizi
  groupTag?: string;
  groupSize: number;
  positionInGroup: number; // 0, 1, 2...
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  groupType: 'single' | 'superset' | 'circuit';
}

export function computeDayExerciseGroups(dayExercises: Partial<WorkoutExercise>[]): DayExerciseGroupInfo[] {
  const result: DayExerciseGroupInfo[] = [];
  let letterIndex = 0;
  let i = 0;

  while (i < dayExercises.length) {
    const currentEx = dayExercises[i];
    const groupTag = currentEx.group_tag;

    if (!groupTag) {
      const letter = indexToLetter(letterIndex);
      result.push({
        label: letter,
        baseLetter: letter,
        isGrouped: false,
        groupSize: 1,
        positionInGroup: 0,
        isFirstInGroup: true,
        isLastInGroup: true,
        groupType: 'single',
      });
      letterIndex++;
      i++;
    } else {
      let j = i;
      while (j < dayExercises.length && dayExercises[j].group_tag === groupTag) {
        j++;
      }
      const groupLength = j - i;
      const letter = indexToLetter(letterIndex);
      const isActuallyGrouped = groupLength > 1;
      const groupType: 'single' | 'superset' | 'circuit' = groupLength >= 3 ? 'circuit' : groupLength === 2 ? 'superset' : 'single';

      for (let k = 0; k < groupLength; k++) {
        result.push({
          label: isActuallyGrouped ? `${letter}${k + 1}` : letter,
          baseLetter: letter,
          isGrouped: isActuallyGrouped,
          groupTag,
          groupSize: groupLength,
          positionInGroup: k,
          isFirstInGroup: k === 0,
          isLastInGroup: k === groupLength - 1,
          groupType,
        });
      }

      letterIndex++;
      i = j;
    }
  }

  return result;
}

export interface DeletedDayRecord {
  id: string;
  dayName: string;
  scope: 'single_week' | 'all_weeks';
  weekNumber?: number;
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

export const WorkoutBuilderModal: React.FC<WorkoutBuilderModalProps> = ({ athleteId: initialAthleteIdProp, initialWorkout, onClose, onBack }) => {
  const { 
    createWorkoutTemplate, 
    updateWorkoutTemplate, 
    assignWorkoutToAthlete, 
    unassignWorkoutFromAthlete,
    allAssignedWorkouts,
    getExercisesForWorkout, 
    folders, 
    forkWorkoutForAthlete, 
    forkWorkoutForAllAssigned, 
    forceSyncMasterTemplate 
  } = useWorkouts();
  const { exercises: libraryExercises, createExercise } = useExercises();
  const { athletes } = useAthletes();
  const { rules } = useProgressions();
  const { showSuccess, showError, showInfo } = useToast();
  
  // Risoluzione atleta iniziale: dalla prop o dal record di assegnazione esistente
  const initialFoundAthleteId = useMemo(() => {
    if (initialAthleteIdProp) return initialAthleteIdProp;
    if (initialWorkout?.id) {
      const match = allAssignedWorkouts.find(a => a.workout_id === initialWorkout.id);
      return match?.athlete_id;
    }
    return undefined;
  }, [initialAthleteIdProp, initialWorkout?.id, allAssignedWorkouts]);

  const [assignedAthleteId, setAssignedAthleteId] = useState<string | undefined>(initialFoundAthleteId);
  const [initialAssignedAthleteId, setInitialAssignedAthleteId] = useState<string | undefined>(initialFoundAthleteId);

  useEffect(() => {
    if (initialFoundAthleteId) {
      setAssignedAthleteId(initialFoundAthleteId);
      setInitialAssignedAthleteId(initialFoundAthleteId);
    }
  }, [initialFoundAthleteId]);

  const currentAthlete = assignedAthleteId ? athletes.find(a => a.id === assignedAthleteId) : null;

  const [title, setTitle] = useState(initialWorkout?.title || '');
  const [description, setDescription] = useState(initialWorkout?.description || '');
  const [isDescriptionModalOpen, setIsDescriptionModalOpen] = useState(false);
  const [folderId, setFolderId] = useState<string | null>(initialWorkout?.folder_id || null);
  const [totalWeeks, setTotalWeeks] = useState<number>(initialWorkout?.total_weeks || 1);
  const [activeWeek, setActiveWeek] = useState<number>(1);
  const [activeDay, setActiveDay] = useState<string>('Giorno A');
  const [daysList, setDaysList] = useState<string[]>(['Giorno A', 'Giorno B']);

  // Opzione: Propagazione automatica di ogni modifica alle settimane successive
  const [autoPropagateToFutureWeeks, setAutoPropagateToFutureWeeks] = useState<boolean>(() => {
    return localStorage.getItem('builder_auto_propagate_future_weeks') === 'true';
  });

  const toggleAutoPropagate = () => {
    setAutoPropagateToFutureWeeks((prev) => {
      const next = !prev;
      localStorage.setItem('builder_auto_propagate_future_weeks', String(next));
      if (next) {
        showSuccess(
          'Sincronizzazione Attiva ⚡',
          'Ogni modifica applicata a un esercizio in questa settimana si rifletterà in automatico nelle settimane successive.'
        );
      } else {
        showInfo(
          'Sincronizzazione Disattivata',
          'Le modifiche agli esercizi influenzeranno solo la settimana corrente.'
        );
      }
      return next;
    });
  };

  // Registro e stato di ripristino per i giorni eliminati accidentalmente
  const [deletedDaysHistory, setDeletedDaysHistory] = useState<DeletedDayRecord[]>([]);
  const [undoBanner, setUndoBanner] = useState<{ record: DeletedDayRecord; timerId: NodeJS.Timeout | null } | null>(null);
  const [isRestoreDropdownOpen, setIsRestoreDropdownOpen] = useState(false);
  const [isReorderDaysModalOpen, setIsReorderDaysModalOpen] = useState(false);
  const [isBulkDeleteWeeksModalOpen, setIsBulkDeleteWeeksModalOpen] = useState(false);
  const [selectedWeeksToDelete, setSelectedWeeksToDelete] = useState<number[]>([]);

  // Dialogo di scelta per eliminazione giorno (singola settimana vs tutto il programma)
  const [dayToDeletePrompt, setDayToDeletePrompt] = useState<{
    dayName: string;
    weekNumber: number;
    exCountActiveWeek: number;
    exCountAllWeeks: number;
  } | null>(null);

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

  // Drag and Drop & Riordinamento Esercizi
  const [draggedExerciseGlobalIndex, setDraggedExerciseGlobalIndex] = useState<number | null>(null);
  const [dragOverExerciseGlobalIndex, setDragOverExerciseGlobalIndex] = useState<number | null>(null);

  const handleExerciseDragStart = (globalIdx: number, e: React.DragEvent) => {
    setDraggedExerciseGlobalIndex(globalIdx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(globalIdx));
  };

  const handleExerciseDragOver = (globalIdx: number, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverExerciseGlobalIndex !== globalIdx) {
      setDragOverExerciseGlobalIndex(globalIdx);
    }
  };

  const handleExerciseDrop = (targetGlobalIdx: number, e: React.DragEvent) => {
    e.preventDefault();
    if (draggedExerciseGlobalIndex === null || draggedExerciseGlobalIndex === targetGlobalIdx) {
      setDraggedExerciseGlobalIndex(null);
      setDragOverExerciseGlobalIndex(null);
      return;
    }

    const sourceEx = exercises[draggedExerciseGlobalIndex];
    setExercises((prev) => {
      const next = [...prev];
      const [moved] = next.splice(draggedExerciseGlobalIndex, 1);
      next.splice(targetGlobalIdx, 0, moved);
      return next;
    });

    showSuccess('Esercizio Spostato', `"${sourceEx?.name || 'Esercizio'}" riposizionato con successo.`);
    setDraggedExerciseGlobalIndex(null);
    setDragOverExerciseGlobalIndex(null);
  };

  const handleExerciseDragEnd = () => {
    setDraggedExerciseGlobalIndex(null);
    setDragOverExerciseGlobalIndex(null);
  };

  const moveExerciseWithinDay = (globalIndex: number, direction: 'up' | 'down') => {
    const currentEx = exercises[globalIndex];
    if (!currentEx) return;

    const currentWeek = currentEx.week_number || 1;
    const currentDayName = currentEx.day_name || 'Giorno A';

    // Indici degli esercizi nel giorno attivo
    const dayIndices: number[] = [];
    exercises.forEach((ex, idx) => {
      if ((ex.week_number || 1) === currentWeek && (ex.day_name || 'Giorno A') === currentDayName) {
        dayIndices.push(idx);
      }
    });

    const posInDay = dayIndices.indexOf(globalIndex);
    if (posInDay === -1) return;

    const targetPosInDay = direction === 'up' ? posInDay - 1 : posInDay + 1;
    if (targetPosInDay < 0 || targetPosInDay >= dayIndices.length) return;

    const targetGlobalIndex = dayIndices[targetPosInDay];

    setExercises((prev) => {
      const next = [...prev];
      const temp = next[globalIndex];
      next[globalIndex] = next[targetGlobalIndex];
      next[targetGlobalIndex] = temp;
      return next;
    });

    showSuccess(
      'Ordine Esercizi Aggiornato',
      `"${currentEx.name || 'Esercizio'}" spostato ${direction === 'up' ? 'in alto' : 'in basso'}.`
    );
  };

  const invertExercisesOrderInDay = () => {
    const dayIndices: number[] = [];
    exercises.forEach((ex, idx) => {
      if (
        (ex.week_number || 1) === activeWeek && 
        (ex.day_name || 'Giorno A').trim().toLowerCase() === activeDay.trim().toLowerCase()
      ) {
        dayIndices.push(idx);
      }
    });

    if (dayIndices.length < 2) {
      showError('Servono almeno 2 esercizi per invertire l\'ordine.');
      return;
    }

    setExercises((prev) => {
      const next = [...prev];
      const reversed = dayIndices.map((idx) => prev[idx]).reverse();
      dayIndices.forEach((targetIdx, i) => {
        next[targetIdx] = reversed[i];
      });
      return next;
    });

    showSuccess('Ordine Invertito', `Invertita la sequenza dei ${dayIndices.length} esercizi in "${activeDay}".`);
  };

  // ─── GESTIONE SUPER SERIE & CIRCUITI ───
  const linkWithNextExercise = (globalIndex: number) => {
    const currentEx = exercises[globalIndex];
    if (!currentEx) return;

    const currentWeek = currentEx.week_number || 1;
    const currentDay = currentEx.day_name || 'Giorno A';

    // Trova tutti gli indici del giorno attivo
    const dayIndices = exercises.reduce<number[]>((acc, e, i) => {
      if ((e.week_number || 1) === currentWeek && (e.day_name || 'Giorno A') === currentDay) {
        acc.push(i);
      }
      return acc;
    }, []);

    const posInDay = dayIndices.indexOf(globalIndex);
    if (posInDay === -1 || posInDay >= dayIndices.length - 1) {
      showError("Nessun esercizio successivo con cui collegare.");
      return;
    }

    const nextGlobalIndex = dayIndices[posInDay + 1];
    const nextEx = exercises[nextGlobalIndex];
    if (!nextEx) return;

    const targetGroupTag = currentEx.group_tag || nextEx.group_tag || `ss-${Date.now()}`;

    setExercises((prev) => {
      const next = [...prev];
      next[globalIndex] = { ...next[globalIndex], group_tag: targetGroupTag };
      next[nextGlobalIndex] = { ...next[nextGlobalIndex], group_tag: targetGroupTag };
      return next;
    });

    showSuccess(
      "Super Serie Creata",
      `"${currentEx.name || 'Esercizio'}" e "${nextEx.name || 'Esercizio'}" sono ora collegati.`
    );
  };

  const unlinkExerciseFromGroup = (globalIndex: number) => {
    const targetEx = exercises[globalIndex];
    if (!targetEx || !targetEx.group_tag) return;

    const groupTag = targetEx.group_tag;
    const currentWeek = targetEx.week_number || 1;
    const currentDay = targetEx.day_name || 'Giorno A';

    setExercises((prev) => {
      let next = prev.map((ex, idx) => {
        if (idx === globalIndex) {
          return { ...ex, group_tag: undefined };
        }
        return ex;
      });

      // Conta quanti esercizi rimangono nel gruppo per questo giorno
      const remainingInGroup = next.filter(
        (e) =>
          (e.week_number || 1) === currentWeek &&
          (e.day_name || 'Giorno A') === currentDay &&
          e.group_tag === groupTag
      );

      // Se ne rimane solo 1, sciogli completamente il gruppo rendendolo singolo
      if (remainingInGroup.length <= 1) {
        next = next.map((e) => {
          if (
            (e.week_number || 1) === currentWeek &&
            (e.day_name || 'Giorno A') === currentDay &&
            e.group_tag === groupTag
          ) {
            return { ...e, group_tag: undefined };
          }
          return e;
        });
      }

      return next;
    });

    showSuccess("Esercizio Scollegato", "L'esercizio è tornato singolo.");
  };

  const unlinkEntireGroup = (groupTag?: string) => {
    if (!groupTag) return;
    setExercises((prev) =>
      prev.map((ex) => {
        if (
          (ex.week_number || 1) === activeWeek &&
          (ex.day_name || 'Giorno A').trim().toLowerCase() === activeDay.trim().toLowerCase() &&
          ex.group_tag === groupTag
        ) {
          return { ...ex, group_tag: undefined };
        }
        return ex;
      })
    );
    showSuccess("Gruppo Scollegato", "Tutti gli esercizi del gruppo sono ora indipendenti.");
  };

  const [exercises, setExercises] = useState<Partial<WorkoutExercise>[]>([
    { name: '', sets: 3, reps_target: '10', rest_seconds: 60, week_number: 1, day_name: 'Giorno A', is_time_based: false }
  ]);
  const [isCompactMode, setIsCompactMode] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState(false);

  // Stati per modali rapidi note, alternativo e progressione nel layout a griglia
  const [editingNoteIndex, setEditingNoteIndex] = useState<number | null>(null);
  const [noteDraftText, setNoteDraftText] = useState<string>('');
  const [editingAltIndex, setEditingAltIndex] = useState<number | null>(null);
  const [altDraftText, setAltDraftText] = useState<string>('');
  const [activeProgressionExerciseIndex, setActiveProgressionExerciseIndex] = useState<number | null>(null);

  // Navigazione rapida da tastiera: Invio passa al campo successivo nella riga o all'esercizio successivo
  const handleNumericKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const allInputs = Array.from(
        document.querySelectorAll<HTMLInputElement>('input.workout-cell-input:not([disabled])')
      );
      const currentIndex = allInputs.indexOf(e.currentTarget);
      if (currentIndex >= 0 && currentIndex < allInputs.length - 1) {
        allInputs[currentIndex + 1].focus();
        allInputs[currentIndex + 1].select?.();
      }
    }
  };
  const handleApplyVolumeAction = (action: ActionPayload) => {
    if (action.plannedChanges && action.plannedChanges.length > 0) {
      const changesMap = new Map<string, number>();
      action.plannedChanges.forEach((p) => {
        const key = `${(p.exerciseName || '').toLowerCase()}__${p.dayName || ''}`;
        changesMap.set(key, p.newSets);
      });

      setExercises((prev) =>
        prev.map((ex) => {
          if (action.plannedChanges) {
            const matchedById = action.plannedChanges.find((p) => p.exerciseId && p.exerciseId === ex.id);
            if (matchedById) {
              return { ...ex, sets: matchedById.newSets };
            }
          }
          const key = `${(ex.name || '').toLowerCase()}__${ex.day_name || ''}`;
          if (changesMap.has(key)) {
            return { ...ex, sets: changesMap.get(key)! };
          }
          const planByName = action.plannedChanges?.find(
            (p) => (p.exerciseName || '').toLowerCase() === (ex.name || '').toLowerCase()
          );
          if (planByName && !action.plannedChanges?.some((p) => p.dayName === ex.day_name)) {
            return { ...ex, sets: planByName.newSets };
          }
          return ex;
        })
      );

      const summaryList = action.plannedChanges
        .map((p) => `${p.exerciseName} (${p.dayName}): ${p.currentSets} ➔ ${p.newSets}s`)
        .join(', ');
      showSuccess('Modifiche Settimana Applicate!', summaryList);
      return;
    }

    if (action.type === 'reduce_sets' && action.exerciseNames && action.setsDelta) {
      let remainingToReduce = Math.abs(action.setsDelta);
      setExercises((prev) =>
        prev.map((ex) => {
          if (
            remainingToReduce > 0 &&
            action.exerciseNames?.some((name) => (ex.name || '').toLowerCase().includes(name.toLowerCase()))
          ) {
            const currentSets = Number(ex.sets) || 3;
            const reduceBy = Math.min(remainingToReduce, Math.max(1, currentSets - 2));
            remainingToReduce -= reduceBy;
            return { ...ex, sets: Math.max(1, currentSets - reduceBy) };
          }
          return ex;
        })
      );
      showSuccess('Modifica Volume Applicata!', `Ridotte le serie per ${action.targetMuscle}.`);
    } else if (action.type === 'increase_sets' && action.setsDelta) {
      let remainingToAdd = action.setsDelta;
      setExercises((prev) =>
        prev.map((ex) => {
          if (
            remainingToAdd > 0 &&
            (!action.exerciseNames?.length ||
              action.exerciseNames.some((name) => (ex.name || '').toLowerCase().includes(name.toLowerCase())))
          ) {
            const currentSets = Number(ex.sets) || 3;
            const addBy = Math.min(remainingToAdd, 2);
            remainingToAdd -= addBy;
            return { ...ex, sets: currentSets + addBy };
          }
          return ex;
        })
      );
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
          const mapped = fetchedExercises.map((ex) => {
            const { groupTag, cleanNotes } = extractGroupTagFromNotes(ex.notes);
            return {
              ...ex,
              group_tag: ex.group_tag || groupTag,
              notes: cleanNotes !== undefined ? cleanNotes : ex.notes,
            };
          });
          setExercises(mapped);
          
          // Estrai giorni unici
          const uniqueDays = Array.from(new Set(fetchedExercises.map(e => e.day_name || 'Giorno A')));
          if (uniqueDays.length > 0) {
            setDaysList(uniqueDays);
            setActiveDay(uniqueDays[0]);
          }
          
          // Estrai max settimane
          const maxW = Math.max(...fetchedExercises.map(e => e.week_number || 1), initialWorkout.total_weeks || 1);
          setTotalWeeks(maxW);
        }
      }).catch((err) => {
        console.error("Error fetching exercises:", err);
      });
    }
  }, [initialWorkout]);

  // Sincronizzazione automatica di activeDay con i giorni reali disponibili
  useEffect(() => {
    if (daysList.length > 0) {
      const match = daysList.find(d => d.trim().toLowerCase() === activeDay.trim().toLowerCase());
      if (match) {
        if (match !== activeDay) {
          setActiveDay(match);
        }
      } else {
        setActiveDay(daysList[0]);
      }
    }
  }, [daysList, activeDay]);

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
    if (!assignedAthleteId) return;

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
          .eq('athlete_id', assignedAthleteId)
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
          const first = sessionsData[0];
          lastDateIso = first.end_time || first.start_time;
          lastRpe = first.rpe || null;

          sessionsData.forEach(session => {
            const logs = session.exercise_logs;
            if (Array.isArray(logs)) {
              logs.forEach((log: any) => {
                const we = log.workout_exercises;
                if (we && we.week_number && we.day_name) {
                  const key = `${we.week_number}-${we.day_name}`;
                  dbCompletedMap[key] = true;
                  if (!lastCompWeek) {
                    lastCompWeek = we.week_number;
                    lastCompDay = we.day_name;
                  }
                }
              });
            }
          });
        }

        const completedCount = Object.keys(dbCompletedMap).length;
        const progressPct = Math.min(100, Math.round((completedCount / totalPlanned) * 100));

        let currentW = 1;
        let currentD = currentDays[0] || 'Giorno A';
        let foundPending = false;

        for (let w = 1; w <= totalWeeks; w++) {
          for (const d of currentDays) {
            if (!dbCompletedMap[`${w}-${d}`]) {
              currentW = w;
              currentD = d;
              foundPending = true;
              break;
            }
          }
          if (foundPending) break;
        }

        if (!foundPending && completedCount > 0) {
          currentW = totalWeeks;
          currentD = currentDays[currentDays.length - 1] || 'Giorno A';
        }

        let formattedDate: string | null = null;
        if (lastDateIso) {
          const d = new Date(lastDateIso);
          formattedDate = d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
        }

        if (isMounted) {
          setAthleteProgress({
            loading: false,
            hasStarted: completedCount > 0,
            currentWeek: currentW,
            currentDay: currentD,
            lastSessionDateFormatted: formattedDate,
            lastSessionRpe: lastRpe,
            lastCompletedDay: lastCompDay,
            lastCompletedWeek: lastCompWeek,
            completedMap: dbCompletedMap,
            completedSessionsCount: completedCount,
            totalPlannedSessions: totalPlanned,
            progressPercent: progressPct,
          });
        }
      } catch (err: any) {
        console.error("Errore fetch avanzamento atleta:", err);
        if (isMounted) {
          setAthleteProgress(prev => ({ ...prev, loading: false }));
        }
      }
    };

    fetchAthleteProgress();

    return () => {
      isMounted = false;
    };
  }, [assignedAthleteId, initialWorkout?.id, totalWeeks, daysList]);

  // Esercizi filtrati per la settimana ed il giorno correntemente selezionati
  const currentWeekDayExercises = exercises.filter(
    ex => (ex.week_number || 1) === activeWeek && 
          (ex.day_name || 'Giorno A').trim().toLowerCase() === activeDay.trim().toLowerCase()
  );

  const estimatedTime = calculateEstimatedWorkoutTime(currentWeekDayExercises);

  const handleAIGenerated = (result: GeneratedWorkoutResponse, generatedAthleteId?: string) => {
    try {
      if (!result || !result.programma_giorno_per_giorno || result.programma_giorno_per_giorno.length === 0) {
        showError("Nessun esercizio generato dall'IA.");
        return;
      }

      // Se l'utente ha selezionato un atleta specifico nel wizard IA, assegnalo subito
      if (generatedAthleteId) {
        setAssignedAthleteId(generatedAthleteId);
        const targetAthlete = athletes.find(a => a.id === generatedAthleteId);
        if (targetAthlete) {
          showSuccess(
            'Scheda Assegnata con Successo 🎯',
            `Il programma generato con l'IA è stato associato a ${targetAthlete.firstName} ${targetAthlete.lastName}.`
          );
        }
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
      notes: '',
    };
    setExercises([...exercises, newEx]);
  };

  const updateExercise = (globalIndex: number, field: keyof WorkoutExercise, value: any) => {
    setExercises(prev => {
      const copy = [...prev];
      const targetEx = copy[globalIndex];
      if (!targetEx) return copy;

      copy[globalIndex] = { ...targetEx, [field]: value };

      if (autoPropagateToFutureWeeks && totalWeeks > 1) {
        const targetWeek = targetEx.week_number || 1;
        const targetDay = targetEx.day_name || 'Giorno A';
        if (targetWeek < totalWeeks) {
          const dayExercises = prev.filter(
            ex => (ex.week_number || 1) === targetWeek && (ex.day_name || 'Giorno A') === targetDay
          );
          const posInDay = dayExercises.indexOf(targetEx);

          for (let w = targetWeek + 1; w <= totalWeeks; w++) {
            const futureDayExercises = copy.filter(
              ex => (ex.week_number || 1) === w && (ex.day_name || 'Giorno A') === targetDay
            );
            const matchingEx = (posInDay >= 0 && posInDay < futureDayExercises.length)
              ? futureDayExercises[posInDay]
              : futureDayExercises.find(ex => ex.name?.trim().toLowerCase() === (targetEx.name || '').trim().toLowerCase());

            if (matchingEx) {
              const matchIdx = copy.findIndex(ex => ex === matchingEx || (ex.id && ex.id === matchingEx.id));
              if (matchIdx !== -1) {
                copy[matchIdx] = { ...copy[matchIdx], [field]: value };
              }
            }
          }
        }
      }

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
      const exToUpdate = copy[globalIndex];
      if (!exToUpdate) return copy;

      copy[globalIndex] = { ...exToUpdate, ...fields };

      if (autoPropagateToFutureWeeks && totalWeeks > 1) {
        const targetWeek = exToUpdate.week_number || 1;
        const targetDay = exToUpdate.day_name || 'Giorno A';
        if (targetWeek < totalWeeks) {
          const dayExercises = prev.filter(
            ex => (ex.week_number || 1) === targetWeek && (ex.day_name || 'Giorno A') === targetDay
          );
          const posInDay = dayExercises.indexOf(exToUpdate);

          for (let w = targetWeek + 1; w <= totalWeeks; w++) {
            const futureDayExercises = copy.filter(
              ex => (ex.week_number || 1) === w && (ex.day_name || 'Giorno A') === targetDay
            );
            const matchingEx = (posInDay >= 0 && posInDay < futureDayExercises.length)
              ? futureDayExercises[posInDay]
              : futureDayExercises.find(ex => ex.name?.trim().toLowerCase() === (exToUpdate.name || '').trim().toLowerCase());

            if (matchingEx) {
              const matchIdx = copy.findIndex(ex => ex === matchingEx || (ex.id && ex.id === matchingEx.id));
              if (matchIdx !== -1) {
                copy[matchIdx] = { ...copy[matchIdx], ...fields };
              }
            }
          }
        }
      }

      return copy;
    });
  };

  // Funzione: Propaga un singolo esercizio a tutte le settimane successive
  const propagateExerciseToFutureWeeks = (globalIndex: number) => {
    const targetEx = exercises[globalIndex];
    if (!targetEx) return;
    const targetWeek = targetEx.week_number || 1;
    const targetDay = targetEx.day_name || 'Giorno A';

    if (totalWeeks <= 1 || targetWeek >= totalWeeks) {
      showInfo('Nessuna settimana successiva', 'Questa è già l\'ultima settimana del programma.');
      return;
    }

    const dayExercises = exercises.filter(
      ex => (ex.week_number || 1) === targetWeek && (ex.day_name || 'Giorno A') === targetDay
    );
    const posInDay = dayExercises.indexOf(targetEx);

    setExercises(prev => {
      let next = [...prev];

      for (let w = targetWeek + 1; w <= totalWeeks; w++) {
        const futureDayExercises = next.filter(
          ex => (ex.week_number || 1) === w && (ex.day_name || 'Giorno A') === targetDay
        );

        const matchingEx = (posInDay >= 0 && posInDay < futureDayExercises.length)
          ? futureDayExercises[posInDay]
          : futureDayExercises.find(ex => ex.name?.trim().toLowerCase() === (targetEx.name || '').trim().toLowerCase());

        if (matchingEx) {
          const matchIdx = next.findIndex(ex => ex === matchingEx || (ex.id && ex.id === matchingEx.id));
          if (matchIdx !== -1) {
            next[matchIdx] = {
              ...next[matchIdx],
              name: targetEx.name,
              sets: targetEx.sets,
              reps_target: targetEx.reps_target,
              rest_seconds: targetEx.rest_seconds,
              target_weight: targetEx.target_weight,
              rir_target: targetEx.rir_target,
              tut: targetEx.tut,
              notes: targetEx.notes,
              is_time_based: targetEx.is_time_based,
              duration_seconds: targetEx.duration_seconds,
              alternative_exercise: targetEx.alternative_exercise,
              video_url: targetEx.video_url,
              group_tag: targetEx.group_tag,
              order_label: targetEx.order_label,
            };
          }
        } else {
          const newFutureEx: Partial<WorkoutExercise> = {
            ...targetEx,
            id: `w${w}-prop-ex-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            week_number: w,
            day_name: targetDay,
          };
          next.push(newFutureEx);
        }
      }

      return next;
    });

    showSuccess(
      'Modifiche Esercizio Propagate! ⚡',
      `"${targetEx.name || 'Esercizio'}" applicato alle settimane da W${targetWeek + 1} a W${totalWeeks}.`
    );
  };

  // Funzione: Propaga un intero giorno a tutte le settimane successive
  const propagateDayToFutureWeeks = (dayName: string) => {
    if (totalWeeks <= 1 || activeWeek >= totalWeeks) {
      showInfo('Nessuna settimana successiva', 'Questa è già l\'ultima settimana del programma.');
      return;
    }

    const currentDayExercises = exercises.filter(
      ex => (ex.week_number || 1) === activeWeek && (ex.day_name || 'Giorno A') === dayName
    );

    if (currentDayExercises.length === 0) {
      showError(`Il ${dayName} non contiene esercizi da propagare.`);
      return;
    }

    setExercises(prev => {
      const filtered = prev.filter(
        ex => !((ex.week_number || 1) > activeWeek && (ex.day_name || 'Giorno A') === dayName)
      );

      const clonedFutureExercises: Partial<WorkoutExercise>[] = [];

      for (let w = activeWeek + 1; w <= totalWeeks; w++) {
        currentDayExercises.forEach((ex, idx) => {
          clonedFutureExercises.push({
            ...ex,
            id: `w${w}-${dayName}-prop-${Date.now()}-${idx}`,
            week_number: w,
            day_name: dayName,
          });
        });
      }

      return [...filtered, ...clonedFutureExercises];
    });

    showSuccess(
      'Giorno Propagato! ⚡',
      `Tutti gli esercizi di ${dayName} sono stati copiati nelle settimane da W${activeWeek + 1} a W${totalWeeks}.`
    );
  };

  // Funzione: Propaga l'intera settimana a tutte le settimane successive
  const propagateEntireWeekToFutureWeeks = (sourceWeek: number) => {
    if (totalWeeks <= 1 || sourceWeek >= totalWeeks) {
      showInfo('Nessuna settimana successiva', 'Questa è già l\'ultima settimana del programma.');
      return;
    }

    const sourceExercises = exercises.filter(ex => (ex.week_number || 1) === sourceWeek);
    if (sourceExercises.length === 0) {
      showError(`La Settimana ${sourceWeek} non contiene esercizi da propagare.`);
      return;
    }

    setExercises(prev => {
      const filtered = prev.filter(ex => (ex.week_number || 1) <= sourceWeek);
      const clonedFutureExercises: Partial<WorkoutExercise>[] = [];

      for (let w = sourceWeek + 1; w <= totalWeeks; w++) {
        sourceExercises.forEach((ex, idx) => {
          clonedFutureExercises.push({
            ...ex,
            id: `w${w}-fullprop-${Date.now()}-${idx}`,
            week_number: w,
          });
        });
      }

      return [...filtered, ...clonedFutureExercises];
    });

    showSuccess(
      'Intera Settimana Propagata! ⚡',
      `La configurazione della Settimana ${sourceWeek} è stata applicata a tutte le settimane da W${sourceWeek + 1} a W${totalWeeks}.`
    );
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
      (ex.day_name || 'Giorno A').trim().toLowerCase() === activeDay.trim().toLowerCase() ? { ...ex, day_name: newName } : ex
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

  const swapWeeks = (weekA: number, weekB: number) => {
    if (weekA === weekB || weekA < 1 || weekB < 1 || weekA > totalWeeks || weekB > totalWeeks) return;
    setExercises((prev) =>
      prev.map((ex) => {
        const w = ex.week_number || 1;
        if (w === weekA) return { ...ex, week_number: weekB };
        if (w === weekB) return { ...ex, week_number: weekA };
        return ex;
      })
    );
    showSuccess('Settimane Scambiate', `Scambiati i contenuti tra Settimana ${weekA} e Settimana ${weekB}.`);
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

  const deleteMultipleWeeks = (weeksToDelete: number[]) => {
    if (weeksToDelete.length === 0) return;
    if (weeksToDelete.length >= totalWeeks) {
      showError('Il programma deve contenere almeno una settimana.');
      return;
    }

    // 1. Calcola le settimane superstiti in ordine crescente
    const remainingOldWeeks: number[] = [];
    for (let w = 1; w <= totalWeeks; w++) {
      if (!weeksToDelete.includes(w)) {
        remainingOldWeeks.push(w);
      }
    }

    // 2. Mappa da vecchio numero settimana a nuovo numero sequenziale
    const weekNumberMapping = new Map<number, number>();
    remainingOldWeeks.forEach((oldW, idx) => {
      weekNumberMapping.set(oldW, idx + 1);
    });

    // 3. Riassegna gli esercizi alle nuove settimane
    const newExercises = exercises
      .filter((ex) => !weeksToDelete.includes(ex.week_number || 1))
      .map((ex) => {
        const oldW = ex.week_number || 1;
        const newW = weekNumberMapping.get(oldW) || 1;
        return { ...ex, week_number: newW };
      });

    const nextTotalWeeks = remainingOldWeeks.length;
    const newActiveWeek = weekNumberMapping.get(activeWeek) || 1;

    setTotalWeeks(nextTotalWeeks);
    setExercises(newExercises);
    setActiveWeek(newActiveWeek);
    setIsBulkDeleteWeeksModalOpen(false);
    setSelectedWeeksToDelete([]);

    showSuccess(
      'Settimane Rimosse',
      `Eliminate ${weeksToDelete.length} settimane con successo. Il programma ora ha ${nextTotalWeeks} settimana/e.`
    );
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

    const exCountActiveWeek = exercises.filter(
      (ex) => (ex.week_number || 1) === activeWeek && (ex.day_name || 'Giorno A') === dayName
    ).length;
    const exCountAllWeeks = exercises.filter(
      (ex) => (ex.day_name || 'Giorno A') === dayName
    ).length;

    // Se ci sono più settimane nel programma, apri la modale di scelta ambito
    if (totalWeeks > 1) {
      setDayToDeletePrompt({
        dayName,
        weekNumber: activeWeek,
        exCountActiveWeek,
        exCountAllWeeks,
      });
      return;
    }

    // Se c'è solo 1 settimana, elimina direttamente dal programma
    confirmDeleteDayAllWeeks(dayName);
  };

  const confirmDeleteDayCurrentWeekOnly = (dayName: string, weekNum: number) => {
    const targetExercises = exercises.filter(
      (ex) => (ex.week_number || 1) === weekNum && (ex.day_name || 'Giorno A') === dayName
    );
    const dayIndex = daysList.indexOf(dayName);

    const record: DeletedDayRecord = {
      id: `del-day-w${weekNum}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      dayName,
      scope: 'single_week',
      weekNumber: weekNum,
      exercises: JSON.parse(JSON.stringify(targetExercises)),
      dayIndex: dayIndex >= 0 ? dayIndex : daysList.length - 1,
      deletedAt: Date.now(),
    };

    // Rimuovi solo gli esercizi di questo giorno per questa specifica settimana
    setExercises((prev) =>
      prev.filter(
        (ex) => !((ex.week_number || 1) === weekNum && (ex.day_name || 'Giorno A') === dayName)
      )
    );

    // Aggiungi alla cronologia giorni eliminati
    setDeletedDaysHistory((prev) => [record, ...prev]);

    // Mostra banner di ripristino rapido (10 secondi)
    if (undoBanner?.timerId) {
      clearTimeout(undoBanner.timerId);
    }
    const timer = setTimeout(() => {
      setUndoBanner(null);
    }, 10000);

    setUndoBanner({ record, timerId: timer });
    setDayToDeletePrompt(null);

    showSuccess(
      `Giorno Svuotato per Settimana ${weekNum}`,
      `Rimossi ${targetExercises.length} esercizi da "${dayName}" solo per la Settimana ${weekNum}. Le altre ${totalWeeks - 1} settimane sono rimaste invariate.`
    );
  };

  const confirmDeleteDayAllWeeks = (dayName: string) => {
    const dayExercises = exercises.filter((ex) => (ex.day_name || 'Giorno A') === dayName);
    const dayIndex = daysList.indexOf(dayName);

    const record: DeletedDayRecord = {
      id: `del-day-all-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      dayName,
      scope: 'all_weeks',
      exercises: JSON.parse(JSON.stringify(dayExercises)),
      dayIndex: dayIndex >= 0 ? dayIndex : daysList.length - 1,
      deletedAt: Date.now(),
    };

    // Rimuovi il giorno e tutti i suoi esercizi da tutte le settimane
    setExercises((prev) => prev.filter((ex) => (ex.day_name || 'Giorno A') !== dayName));
    const nextDays = daysList.filter((d) => d !== dayName);
    setDaysList(nextDays);
    setActiveDay(nextDays[0] || 'Giorno A');

    // Aggiungi alla cronologia giorni eliminati
    setDeletedDaysHistory((prev) => [record, ...prev]);

    // Mostra banner di ripristino rapido (10 secondi)
    if (undoBanner?.timerId) {
      clearTimeout(undoBanner.timerId);
    }
    const timer = setTimeout(() => {
      setUndoBanner(null);
    }, 10000);

    setUndoBanner({ record, timerId: timer });
    setDayToDeletePrompt(null);

    showSuccess(
      'Giorno Eliminato da Tutto il Programma',
      `"${dayName}" e ${dayExercises.length} esercizi rimossi da tutte le ${totalWeeks} settimane.`
    );
  };

  const restoreDay = (record: DeletedDayRecord) => {
    if (undoBanner?.timerId) {
      clearTimeout(undoBanner.timerId);
    }
    setUndoBanner(null);

    if (record.scope === 'single_week' && record.weekNumber) {
      // Ripristino per singola settimana
      let targetName = record.dayName;
      if (!daysList.includes(targetName)) {
        const newDaysList = [...daysList];
        const insertIndex = Math.min(record.dayIndex, newDaysList.length);
        newDaysList.splice(insertIndex, 0, targetName);
        setDaysList(newDaysList);
      }

      const restoredExercises = record.exercises.map((ex, idx) => ({
        ...ex,
        day_name: targetName,
        week_number: record.weekNumber,
        id: `restored-w-ex-${Date.now()}-${idx}`,
      }));

      // Rimuovi eventuali duplicati prima di aggiungere
      setExercises((prev) => [
        ...prev.filter(
          (ex) => !((ex.week_number || 1) === record.weekNumber && (ex.day_name || 'Giorno A') === targetName)
        ),
        ...restoredExercises,
      ]);

      setActiveWeek(record.weekNumber);
      setActiveDay(targetName);
      setDeletedDaysHistory((prev) => prev.filter((d) => d.id !== record.id));
      setIsRestoreDropdownOpen(false);

      showSuccess(
        'Giorno Ripristinato',
        `"${targetName}" è stato ripristinato nella Settimana ${record.weekNumber} con ${record.exercises.length} esercizi.`
      );
      return;
    }

    // Ripristino globale su tutte le settimane
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

    setExercises((prev) => [...prev, ...restoredExercises]);
    setActiveDay(targetName);

    // Rimuovi dal registro eliminati
    setDeletedDaysHistory((prev) => prev.filter((d) => d.id !== record.id));
    setIsRestoreDropdownOpen(false);

    showSuccess(
      'Giorno Ripristinato in Tutto il Programma',
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
    showSuccess('Esercizio Duplicato', `"${cloned.name}" aggiunto alla seduta.`);
  };

  const handleUnassignAthlete = async () => {
    const targetAthId = assignedAthleteId || initialAssignedAthleteId;
    if (!targetAthId) return;

    const targetAth = athletes.find(a => a.id === targetAthId);
    const athleteName = targetAth ? `${targetAth.firstName} ${targetAth.lastName}` : 'questo atleta';

    if (!window.confirm(`Vuoi rimuovere l'assegnazione della scheda da ${athleteName}? La scheda rimarrà salvata come Template Master nel catalogo.`)) {
      return;
    }

    if (initialWorkout?.id) {
      setIsSaving(true);
      try {
        const res = await unassignWorkoutFromAthlete(targetAthId, initialWorkout.id, false);
        if (!res.success) throw new Error(res.error);
        
        await updateWorkoutTemplate(
          initialWorkout.id,
          { is_template: true },
          exercises.filter(ex => ex.name?.trim() !== '')
        );

        setAssignedAthleteId(undefined);
        setInitialAssignedAthleteId(undefined);
        showSuccess('Assegnazione Rimossa!', `La scheda è stata scollegata da ${athleteName} ed è ora un Template Master.`);
      } catch (err: any) {
        showError('Errore durante la revoca: ' + (err.message || ''));
      } finally {
        setIsSaving(false);
      }
    } else {
      setAssignedAthleteId(undefined);
      setInitialAssignedAthleteId(undefined);
      showSuccess('Assegnazione Rimossa', 'La nuova scheda non verrà assegnata ad alcun atleta.');
    }
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
    if (initialWorkout && initialWorkout.is_template && !assignedAthleteId && !globalUpdateMode) {
      setShowTemplateUpdatePrompt(true);
      return;
    }

    setIsSaving(true);

    const exercisesToSave = validExercises.map((ex) => ({
      ...ex,
      notes: encodeGroupTagInNotes(ex.notes, ex.group_tag),
    }));

    try {
      if (initialWorkout) {
        if (assignedAthleteId && initialWorkout.is_template) {
          // Edit di un template dalla pagina di un singolo Atleta -> FORK!
          const { success, error } = await forkWorkoutForAthlete(
            initialWorkout.id,
            assignedAthleteId,
            { title, description, total_weeks: totalWeeks, estimated_duration_minutes: estimatedTime.display },
            exercisesToSave
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
            { 
              title, 
              description, 
              total_weeks: totalWeeks, 
              folder_id: folderId, 
              is_template: !assignedAthleteId,
              estimated_duration_minutes: estimatedTime.display 
            },
            exercisesToSave
          );
          if (!success) throw new Error(error);

          if (globalUpdateMode === 'ALL') {
            const syncResult = await forceSyncMasterTemplate(initialWorkout.id);
            if (!syncResult.success) throw new Error(syncResult.error);
          }

          // Sincronizzazione assegnazione se rimossa o modificata
          if (initialAssignedAthleteId && !assignedAthleteId) {
            await unassignWorkoutFromAthlete(initialAssignedAthleteId, initialWorkout.id, false);
          } else if (initialAssignedAthleteId && assignedAthleteId && initialAssignedAthleteId !== assignedAthleteId) {
            await unassignWorkoutFromAthlete(initialAssignedAthleteId, initialWorkout.id, false);
            await assignWorkoutToAthlete(assignedAthleteId, initialWorkout.id);
          } else if (!initialAssignedAthleteId && assignedAthleteId) {
            await assignWorkoutToAthlete(assignedAthleteId, initialWorkout.id);
          }
          
          showSuccess(globalUpdateMode === 'NEW_ONLY' ? 'Template aggiornato (le vecchie assegnazioni sono state congelate).' : 'Scheda e assegnazioni aggiornate con successo!');
        }
      } else {
        // Creazione nuova scheda
        const { success, error, workoutId } = await createWorkoutTemplate(
          { title, description, is_template: !assignedAthleteId, total_weeks: totalWeeks, folder_id: folderId, estimated_duration_minutes: estimatedTime.display }, 
          exercisesToSave
        );

        if (!success) throw new Error(error);

        if (workoutId && assignedAthleteId) {
          await assignWorkoutToAthlete(assignedAthleteId, workoutId);
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
    <div className="fixed inset-0 z-50 flex flex-col bg-[#090d14] w-screen h-screen overflow-hidden">
      <div className="w-full h-full flex flex-col overflow-hidden bg-[#090d14]">
        
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
                {assignedAthleteId ? (
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
              {assignedAthleteId ? (
                <div className="space-y-1.5 mt-0.5">
                  <p className="text-xs text-slate-400">
                    Le modifiche apportate influenzeranno la scheda di questo atleta.
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
          <div className="flex items-center gap-2 sm:gap-3">
            {assignedAthleteId && (
              <button
                type="button"
                onClick={handleUnassignAthlete}
                className="flex items-center gap-1.5 px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                title="Rimuovi l'assegnazione da questo atleta e converti in Template Master"
              >
                <Unlink2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Scollega da Atleta</span>
                <span className="sm:hidden">Scollega</span>
              </button>
            )}
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
          {assignedAthleteId && (
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
                <div className="md:col-span-5">
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

                {/* Destinazione / Atleta Assegnato */}
                <div className="md:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase tracking-wider flex items-center justify-between">
                    <span>Assegnato a</span>
                    {assignedAthleteId && (
                      <button
                        type="button"
                        onClick={handleUnassignAthlete}
                        className="text-[10px] text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        title="Scollega da questo atleta"
                      >
                        <Unlink2 className="w-3 h-3" />
                        <span>Scollega</span>
                      </button>
                    )}
                  </label>
                  <select
                    value={assignedAthleteId || ''}
                    onChange={e => setAssignedAthleteId(e.target.value || undefined)}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500 font-bold text-xs cursor-pointer"
                  >
                    <option value="">📁 Template Master (Nessun Atleta)</option>
                    {athletes.map(a => (
                      <option key={a.id} value={a.id}>👤 {a.firstName} {a.lastName}</option>
                    ))}
                  </select>
                </div>

                {/* Cartella di Archiviazione */}
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase tracking-wider">
                    Cartella
                  </label>
                  <select
                    value={folderId || ''}
                    onChange={e => setFolderId(e.target.value || null)}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500 font-bold text-xs cursor-pointer"
                  >
                    <option value="">Nessuna (Principale)</option>
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
                {totalWeeks > 1 && (
                  <button
                    type="button"
                    onClick={toggleAutoPropagate}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 border cursor-pointer ${
                      autoPropagateToFutureWeeks
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.25)] font-black'
                        : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border-slate-700'
                    }`}
                    title={
                      autoPropagateToFutureWeeks
                        ? 'Auto-sincronizzazione attiva: ogni modifica a un esercizio in questa settimana si applica automaticamente anche nelle settimane successive'
                        : 'Attiva per applicare automaticamente ogni modifica alle settimane successive'
                    }
                  >
                    <FastForward className={`w-3.5 h-3.5 ${autoPropagateToFutureWeeks ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`} />
                    <span>Auto-propaga a W+: {autoPropagateToFutureWeeks ? 'ON' : 'OFF'}</span>
                  </button>
                )}

                {totalWeeks > 1 && activeWeek < totalWeeks && (
                  <button
                    type="button"
                    onClick={() => propagateEntireWeekToFutureWeeks(activeWeek)}
                    className="px-2.5 py-1 text-xs font-bold bg-cyan-600/15 hover:bg-cyan-600/25 text-cyan-300 border border-cyan-500/40 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    title={`Applica la configurazione della Settimana ${activeWeek} a tutte le settimane da W${activeWeek + 1} a W${totalWeeks}`}
                  >
                    <FastForward className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Propaga Sett. {activeWeek} a W+</span>
                  </button>
                )}

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
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        // Preseleziona le settimane vuote (0 es.) se presenti, senza selezionarle tutte
                        const emptyWeeks = Array.from({ length: totalWeeks }, (_, idx) => idx + 1).filter(
                          (w) => exercises.filter((e) => (e.week_number || 1) === w).length === 0
                        );
                        if (emptyWeeks.length > 0 && emptyWeeks.length < totalWeeks) {
                          setSelectedWeeksToDelete(emptyWeeks);
                        } else {
                          setSelectedWeeksToDelete([]);
                        }
                        setIsBulkDeleteWeeksModalOpen(true);
                      }}
                      className="px-2.5 py-1 text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                      title="Elimina più settimane contemporaneamente"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>Elimina Settimane</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteWeek(activeWeek)}
                      className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                      title={`Elimina solo Settimana ${activeWeek}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
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
                const isWeekCompleted = assignedAthleteId && daysList.length > 0 && daysList.every(d => Boolean(athleteProgress.completedMap[`${wNum}-${d}`]));
                const isAthleteCurrentWeek = assignedAthleteId && athleteProgress.currentWeek === wNum && athleteProgress.hasStarted;

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

                    {/* Frecce veloci per scambiare / invertire la settimana */}
                    {totalWeeks > 1 && isCurrent && (
                      <div className="flex items-center gap-0.5 ml-1 pl-1 border-l border-black/30">
                        {wNum > 1 && (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              swapWeeks(wNum, wNum - 1);
                              setActiveWeek(wNum - 1);
                            }}
                            className="p-0.5 hover:bg-black/20 text-slate-950 rounded transition-colors"
                            title={`Scambia Settimana ${wNum} con Settimana ${wNum - 1}`}
                          >
                            <ChevronLeft className="w-3 h-3" />
                          </span>
                        )}
                        {wNum < totalWeeks && (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              swapWeeks(wNum, wNum + 1);
                              setActiveWeek(wNum + 1);
                            }}
                            className="p-0.5 hover:bg-black/20 text-slate-950 rounded transition-colors"
                            title={`Scambia Settimana ${wNum} con Settimana ${wNum + 1}`}
                          >
                            <ChevronRight className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    )}
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
                  const isCurrentDay = activeDay.trim().toLowerCase() === dName.trim().toLowerCase();
                  const exCountDay = exercises.filter(
                    e => (e.week_number || 1) === activeWeek && (e.day_name || 'Giorno A').trim().toLowerCase() === dName.trim().toLowerCase()
                  ).length;

                  // Calcolo avanzamento giorno per la settimana attiva
                  const isDayDone = assignedAthleteId && Boolean(athleteProgress.completedMap[`${activeWeek}-${dName}`]);
                  const isAthleteTargetDay = assignedAthleteId && athleteProgress.currentWeek === activeWeek && athleteProgress.currentDay === dName && athleteProgress.hasStarted;

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
              <div className="flex items-center gap-2 mt-2 sm:mt-0 flex-wrap">
                {/* Toggle Vista Compatta Scheda */}
                <button
                  type="button"
                  onClick={() => setIsCompactMode(prev => !prev)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors border cursor-pointer min-h-[36px] sm:min-h-0 ${
                    isCompactMode
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm font-black'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
                  }`}
                  title="Attiva/disattiva la vista compatta ad alta densità per compilare rapidamente le schede senza scroll eccessivo"
                >
                  <Sliders className={`w-3.5 h-3.5 ${isCompactMode ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span>{isCompactMode ? 'Vista Compatta: ON' : 'Vista Compatta'}</span>
                </button>

                {currentWeekDayExercises.length >= 2 && (
                  <button
                    type="button"
                    onClick={invertExercisesOrderInDay}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors border border-slate-700 shadow-sm cursor-pointer min-h-[36px] sm:min-h-0"
                    title="Inverti l'ordine di tutti gli esercizi di questo giorno (es. da 1..N a N..1)"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
                    <span>Inverti Ordine</span>
                  </button>
                )}
                {totalWeeks > 1 && activeWeek < totalWeeks && currentWeekDayExercises.length > 0 && (
                  <button
                    type="button"
                    onClick={() => propagateDayToFutureWeeks(activeDay)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-lg transition-colors shadow-sm cursor-pointer min-h-[36px] sm:min-h-0"
                    title={`Copia tutti gli esercizi di ${activeDay} alle settimane da W${activeWeek + 1} a W${totalWeeks}`}
                  >
                    <FastForward className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Propaga {activeDay} a W+</span>
                  </button>
                )}

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
              <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-10 text-center">
                <p className="text-sm text-slate-400 mb-3 font-medium">Nessun esercizio inserito per {activeDay} nella Settimana {activeWeek}.</p>
                <button
                  type="button"
                  onClick={addExercise}
                  className="px-5 py-2.5 bg-[var(--color-primary)] text-black text-xs font-bold rounded-xl hover:bg-[var(--color-primary-hover)] transition-colors cursor-pointer shadow-md"
                >
                  + Inserisci Primo Esercizio
                </button>
              </div>
            ) : (
              <div className="w-full overflow-x-auto pb-4">
                <div className="min-w-[1180px] space-y-2">
                  {/* INTESTAZIONE TABELLA COLONNE */}
                  <div className="grid grid-cols-[minmax(260px,2fr)_120px_64px_95px_85px_85px_70px_70px_85px_minmax(180px,1.5fr)_155px] gap-2 px-3.5 py-2 text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-950/70 border border-slate-800/90 rounded-xl items-center select-none shadow-sm">
                    <div>ESERCIZIO</div>
                    <div>TIPO</div>
                    <div className="text-center">SERIE</div>
                    <div className="text-center">RIP / TEMPO</div>
                    <div className="text-center">REC</div>
                    <div className="text-center">PESO (KG)</div>
                    <div className="text-center">RPE</div>
                    <div className="text-center">RIR</div>
                    <div className="text-center">TUT</div>
                    <div>NOTE</div>
                    <div className="text-right pr-2">AZIONI</div>
                  </div>

                  {/* RIGHE ESERCIZI CON CALCOLO SUPER SERIE / CIRCUITI */}
                  {(() => {
                    const currentDayIndices = exercises.reduce<number[]>((acc, e, i) => {
                      if (
                        (e.week_number || 1) === activeWeek && 
                        (e.day_name || 'Giorno A').trim().toLowerCase() === activeDay.trim().toLowerCase()
                      ) {
                        acc.push(i);
                      }
                      return acc;
                    }, []);

                    const currentDayExercises = currentDayIndices.map(idx => exercises[idx]);
                    const dayGroupInfos = computeDayExerciseGroups(currentDayExercises);

                    return exercises.map((ex, globalIdx) => {
                      if (
                        (ex.week_number || 1) !== activeWeek || 
                        (ex.day_name || 'Giorno A').trim().toLowerCase() !== activeDay.trim().toLowerCase()
                      ) {
                        return null;
                      }

                      const posInDay = currentDayIndices.indexOf(globalIdx);
                      const totalInDay = currentDayIndices.length;
                      const groupInfo = dayGroupInfos[posInDay] || {
                        label: indexToLetter(posInDay),
                        baseLetter: indexToLetter(posInDay),
                        isGrouped: false,
                        groupSize: 1,
                        positionInGroup: 0,
                        isFirstInGroup: true,
                        isLastInGroup: true,
                        groupType: 'single' as const,
                      };

                      const isDragging = draggedExerciseGlobalIndex === globalIdx;
                      const isDragOver = dragOverExerciseGlobalIndex === globalIdx && !isDragging;
                      const isProgressionOpen = activeProgressionExerciseIndex === globalIdx;

                      const workMode: 'reps' | 'minutes' | 'seconds' = !ex.is_time_based
                        ? 'reps'
                        : (ex.reps_target && ex.reps_target.includes('min')) || (ex.duration_seconds && ex.duration_seconds >= 60 && ex.duration_seconds % 30 === 0 && !ex.reps_target?.includes('s'))
                        ? 'minutes'
                        : 'seconds';

                      return (
                        <React.Fragment key={globalIdx}>
                          {/* BANNER RAGGRUPPAMENTO SUPER SERIE / CIRCUITO (MOSTRATO SOPRA IL PRIMO ELEMENTO DEL BLOCCO) */}
                          {groupInfo.isFirstInGroup && groupInfo.isGrouped && (
                            <div className={`flex items-center justify-between px-3.5 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider shadow-sm mt-3 mb-1 ${
                              groupInfo.groupType === 'superset'
                                ? 'bg-purple-950/40 border-purple-800/60 text-purple-300'
                                : 'bg-cyan-950/40 border-cyan-800/60 text-cyan-300'
                            }`}>
                              <div className="flex items-center gap-2">
                                {groupInfo.groupType === 'superset' ? (
                                  <Layers className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                ) : (
                                  <Repeat className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                )}
                                <span>
                                  {groupInfo.groupType === 'superset' ? 'Super Serie' : 'Circuito'} {groupInfo.baseLetter} ({groupInfo.groupSize} Esercizi a rotazione continua)
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                {posInDay + groupInfo.groupSize < currentDayIndices.length && (
                                  <button
                                    type="button"
                                    tabIndex={-1}
                                    onClick={() => linkWithNextExercise(currentDayIndices[posInDay + groupInfo.groupSize - 1])}
                                    className="hover:underline flex items-center gap-1 text-slate-300 hover:text-white cursor-pointer"
                                    title="Aggiungi il prossimo esercizio a questo circuito"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>Aggiungi al Circuito</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  tabIndex={-1}
                                  onClick={() => unlinkEntireGroup(groupInfo.groupTag)}
                                  className="hover:underline flex items-center gap-1 text-rose-400 hover:text-rose-300 cursor-pointer"
                                  title="Separa tutti gli esercizi di questo gruppo in singoli"
                                >
                                  <Unlink2 className="w-3 h-3" />
                                  <span>Scollega Gruppo</span>
                                </button>
                              </div>
                            </div>
                          )}

                          <div 
                            draggable={true}
                            onDragStart={(e) => handleExerciseDragStart(globalIdx, e)}
                            onDragOver={(e) => handleExerciseDragOver(globalIdx, e)}
                            onDrop={(e) => handleExerciseDrop(globalIdx, e)}
                            onDragEnd={handleExerciseDragEnd}
                            className={`grid grid-cols-[minmax(260px,2fr)_120px_64px_95px_85px_85px_70px_70px_85px_minmax(180px,1.5fr)_155px] gap-2 px-3 py-2.5 rounded-xl border transition-all items-center ${
                              isDragging 
                                ? 'opacity-40 border-amber-500 bg-amber-500/5' 
                                : isDragOver
                                ? 'border-cyan-400 ring-2 ring-cyan-400/40 bg-slate-800/80'
                                : isProgressionOpen
                                ? 'bg-slate-900 border-cyan-500/60 shadow-lg shadow-cyan-500/5'
                                : groupInfo.isGrouped
                                ? groupInfo.groupType === 'superset'
                                  ? 'bg-purple-950/15 border-purple-900/50 border-l-4 border-l-purple-500 hover:border-purple-700/70 shadow-sm'
                                  : 'bg-cyan-950/15 border-cyan-900/50 border-l-4 border-l-cyan-500 hover:border-cyan-700/70 shadow-sm'
                                : ex.progression_rule_id
                                ? 'bg-slate-900/90 border-cyan-900/50 hover:border-cyan-700/60'
                                : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            {/* 1. ESERCIZIO: Grip + Lettera Gruppo + Frecce + Nome */}
                            <div className="flex items-center gap-1.5 min-w-0">
                              {/* Grip handle */}
                              <div 
                                className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-white p-0.5 hover:bg-slate-800 rounded transition-colors shrink-0"
                                title="Trascina per riordinare"
                              >
                                <GripVertical className="w-3.5 h-3.5" />
                              </div>

                              {/* Lettera Ordine / Gruppo: A, B1, B2, C... */}
                              <span 
                                className={`w-7 h-6 rounded-md text-xs font-black flex items-center justify-center font-mono border shrink-0 shadow-sm ${
                                  groupInfo.isGrouped
                                    ? groupInfo.groupType === 'superset'
                                      ? 'bg-purple-500/25 text-purple-300 border-purple-500/60 shadow-[0_0_8px_rgba(168,85,247,0.2)]'
                                      : 'bg-cyan-500/25 text-cyan-300 border-cyan-500/60 shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                                    : 'bg-slate-800/90 text-amber-400 border-slate-700/80'
                                }`}
                                title={`Esercizio ${groupInfo.label}${groupInfo.isGrouped ? ` (${groupInfo.groupType === 'superset' ? 'Super Serie' : 'Circuito'})` : ''}`}
                              >
                                {groupInfo.label}
                              </span>

                              {/* Frecce veloci Sposta Su / Giù */}
                              {totalInDay > 1 && (
                                <div className="flex flex-col gap-0.5 shrink-0">
                                  <button
                                    type="button"
                                    tabIndex={-1}
                                    disabled={posInDay === 0}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      moveExerciseWithinDay(globalIdx, 'up');
                                    }}
                                    className="p-0.5 text-slate-500 hover:text-white disabled:opacity-20 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                                    title="Sposta esercizio prima (su)"
                                  >
                                    <ArrowUp className="w-2.5 h-2.5" />
                                  </button>
                                  <button
                                    type="button"
                                    tabIndex={-1}
                                    disabled={posInDay === totalInDay - 1}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      moveExerciseWithinDay(globalIdx, 'down');
                                    }}
                                    className="p-0.5 text-slate-500 hover:text-white disabled:opacity-20 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                                    title="Sposta esercizio dopo (giù)"
                                  >
                                    <ArrowDown className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              )}

                              {/* Input Nome Esercizio */}
                              <div className="flex-1 min-w-0 relative">
                                <input
                                  type="text"
                                  placeholder="es. Panca Piana"
                                  value={ex.name || ''}
                                  onKeyDown={handleNumericKeyDown}
                                  onChange={e => {
                                    const val = e.target.value;
                                    const oldName = ex.name || '';
                                    const matched = libraryExercises.find(libEx => libEx.name.trim().toLowerCase() === val.trim().toLowerCase());
                                    if (matched) {
                                      updateExerciseFields(globalIdx, { 
                                        name: matched.name, 
                                        notes: matched.instructions || '',
                                      });
                                    } else if (val.trim().toLowerCase() !== oldName.trim().toLowerCase()) {
                                      updateExerciseFields(globalIdx, { 
                                        name: val, 
                                        notes: '' 
                                      });
                                    } else {
                                      updateExerciseFields(globalIdx, { name: val });
                                    }
                                  }}
                                  list="exercises-library-list"
                                  className="workout-cell-input w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-bold text-white focus:outline-none focus:border-[var(--color-primary)] truncate"
                                />
                                {ex.progression_rule_id && (
                                  <span title="Progressione settimanale attiva" className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <Zap className="w-3 h-3 text-cyan-400" />
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* 2. TIPO: Ripetizioni / Minuti / Secondi */}
                            <div>
                              <select
                                tabIndex={-1}
                                value={workMode}
                                onChange={e => {
                                  const mode = e.target.value;
                                  if (mode === 'reps') {
                                    updateExerciseFields(globalIdx, {
                                      is_time_based: false,
                                      reps_target: '10-12',
                                    });
                                  } else if (mode === 'minutes') {
                                    updateExerciseFields(globalIdx, {
                                      is_time_based: true,
                                      duration_seconds: 60,
                                      reps_target: '1 min',
                                    });
                                  } else {
                                    updateExerciseFields(globalIdx, {
                                      is_time_based: true,
                                      duration_seconds: 45,
                                      reps_target: '45s',
                                    });
                                  }
                                }}
                                className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-semibold text-slate-300 focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
                              >
                                <option value="reps">Ripetizioni</option>
                                <option value="minutes">Minuti (Tempo)</option>
                                <option value="seconds">Secondi (Tempo)</option>
                              </select>
                            </div>

                            {/* 3. SERIE (Sets) */}
                            <div>
                              <input
                                type="number"
                                min="1"
                                placeholder="3"
                                value={ex.sets === 0 ? '' : (ex.sets || 3)}
                                onKeyDown={handleNumericKeyDown}
                                onChange={e => updateExercise(globalIdx, 'sets', e.target.value === '' ? 0 : (parseInt(e.target.value) || 1))}
                                className="workout-cell-input w-full px-1.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-bold text-center focus:outline-none focus:border-[var(--color-primary)]"
                              />
                            </div>

                            {/* 4. RIP / TEMPO */}
                            <div>
                              <input
                                type="text"
                                placeholder={workMode === 'reps' ? '10-12' : workMode === 'minutes' ? '1 min' : '45s'}
                                value={
                                  ex.is_time_based
                                    ? (ex.reps_target?.includes('min') ? ex.reps_target : ex.duration_seconds ? `${ex.duration_seconds}s` : ex.reps_target || '45s')
                                    : (ex.reps_target || '')
                                }
                                onKeyDown={handleNumericKeyDown}
                                onChange={e => {
                                  const val = e.target.value;
                                  if (ex.is_time_based) {
                                    if (val.includes('min')) {
                                      const num = parseFloat(val.replace('min', '')) || 1;
                                      updateExerciseFields(globalIdx, {
                                        duration_seconds: Math.round(num * 60),
                                        reps_target: val,
                                      });
                                    } else {
                                      const num = parseInt(val.replace('s', '')) || 45;
                                      updateExerciseFields(globalIdx, {
                                        duration_seconds: num,
                                        reps_target: val.endsWith('s') ? val : `${val}s`,
                                      });
                                    }
                                  } else {
                                    updateExercise(globalIdx, 'reps_target', val);
                                  }
                                }}
                                className="workout-cell-input w-full px-1.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-bold text-center focus:outline-none focus:border-[var(--color-primary)]"
                              />
                            </div>

                            {/* 5. REC (Recupero) */}
                            <div>
                              <RestTimeCell
                                restSeconds={ex.rest_seconds}
                                onChange={(secs) => updateExercise(globalIdx, 'rest_seconds', secs)}
                                onKeyDown={handleNumericKeyDown}
                              />
                            </div>

                            {/* 6. PESO (Carico Target kg) */}
                            <div>
                              <input
                                type="text"
                                placeholder="es. 60"
                                value={ex.target_weight || ''}
                                onKeyDown={handleNumericKeyDown}
                                onChange={e => updateExercise(globalIdx, 'target_weight', e.target.value)}
                                className="workout-cell-input w-full px-1.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-[var(--color-primary)] font-black text-center focus:outline-none focus:border-[var(--color-primary)]"
                              />
                            </div>

                            {/* 7. RPE Target */}
                            <div>
                              <input
                                type="text"
                                placeholder="8"
                                value={ex.rir_target?.startsWith('RPE') ? ex.rir_target.replace('RPE', '').trim() : ''}
                                onKeyDown={handleNumericKeyDown}
                                onChange={e => {
                                  const val = e.target.value.trim();
                                  updateExercise(globalIdx, 'rir_target', val ? `RPE ${val}` : '');
                                }}
                                className="workout-cell-input w-full px-1.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-bold text-center focus:outline-none focus:border-[var(--color-primary)]"
                              />
                            </div>

                            {/* 8. RIR Target */}
                            <div>
                              <input
                                type="text"
                                placeholder="2"
                                value={ex.rir_target?.startsWith('RIR') ? ex.rir_target.replace('RIR', '').trim() : (!ex.rir_target?.startsWith('RPE') ? (ex.rir_target || '') : '')}
                                onKeyDown={handleNumericKeyDown}
                                onChange={e => {
                                  const val = e.target.value.trim();
                                  updateExercise(globalIdx, 'rir_target', val ? (val.toLowerCase().startsWith('rir') ? val : `RIR ${val}`) : '');
                                }}
                                className="workout-cell-input w-full px-1.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-bold text-center focus:outline-none focus:border-[var(--color-primary)]"
                              />
                            </div>

                            {/* 9. TUT (Tempo) */}
                            <div>
                              <input
                                type="text"
                                placeholder="3-0-1-0"
                                value={ex.tut || ''}
                                onKeyDown={handleNumericKeyDown}
                                onChange={e => updateExercise(globalIdx, 'tut', e.target.value)}
                                className="workout-cell-input w-full px-1.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono text-center focus:outline-none focus:border-[var(--color-primary)]"
                              />
                            </div>

                            {/* 10. NOTE */}
                            <div className="min-w-0">
                              {ex.notes && ex.notes.trim() ? (
                                <button
                                  type="button"
                                  tabIndex={-1}
                                  onClick={() => {
                                    setEditingNoteIndex(globalIdx);
                                    setNoteDraftText(ex.notes || '');
                                  }}
                                  className="w-full text-left flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition text-xs text-amber-200 truncate cursor-pointer group"
                                  title={ex.notes}
                                >
                                  <Pencil className="w-3 h-3 text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
                                  <span className="truncate">{ex.notes}</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  tabIndex={-1}
                                  onClick={() => {
                                    setEditingNoteIndex(globalIdx);
                                    setNoteDraftText('');
                                  }}
                                  className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-slate-500 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Pencil className="w-3 h-3" />
                                  <span>Aggiungi nota</span>
                                </button>
                              )}
                            </div>

                            {/* 11. AZIONI: Super Serie/Circuito + Alternativo + Duplica + Progressione + Elimina */}
                            <div className="flex items-center justify-end gap-1 shrink-0">
                              {/* Super Serie / Circuito Link / Unlink */}
                              {groupInfo.isGrouped ? (
                                <button
                                  type="button"
                                  tabIndex={-1}
                                  onClick={() => unlinkExerciseFromGroup(globalIdx)}
                                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                    groupInfo.groupType === 'superset'
                                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30'
                                      : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30'
                                  }`}
                                  title={`Scollega ${groupInfo.label} da ${groupInfo.groupType === 'superset' ? 'Super Serie' : 'Circuito'}`}
                                >
                                  <Unlink2 className="w-3.5 h-3.5" />
                                </button>
                              ) : posInDay < totalInDay - 1 ? (
                                <button
                                  type="button"
                                  tabIndex={-1}
                                  onClick={() => linkWithNextExercise(globalIdx)}
                                  className="p-1.5 text-slate-400 hover:text-purple-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                  title="Collega in Super Serie con l'esercizio successivo (es. A1 + A2)"
                                >
                                  <Link2 className="w-3.5 h-3.5" />
                                </button>
                              ) : null}

                              {/* Esercizio Alternativo */}
                              <button
                                type="button"
                                tabIndex={-1}
                                onClick={() => {
                                  setEditingAltIndex(globalIdx);
                                  setAltDraftText(ex.alternative_exercise || '');
                                }}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  ex.alternative_exercise && ex.alternative_exercise.trim()
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                }`}
                                title={ex.alternative_exercise ? `Alternativo: ${ex.alternative_exercise}` : 'Imposta esercizio alternativo'}
                              >
                                <User className="w-3.5 h-3.5" />
                              </button>

                              {/* Propaga Esercizio a Settimane Successive */}
                              {totalWeeks > 1 && (ex.week_number || 1) < totalWeeks && (
                                <button
                                  type="button"
                                  tabIndex={-1}
                                  onClick={() => propagateExerciseToFutureWeeks(globalIdx)}
                                  className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-cyan-950/40 rounded-lg transition-colors cursor-pointer"
                                  title={`Applica questo esercizio a tutte le settimane successive (W${(ex.week_number || 1) + 1}..W${totalWeeks})`}
                                >
                                  <FastForward className="w-3.5 h-3.5 text-cyan-400" />
                                </button>
                              )}

                              {/* Duplica */}
                              <button
                                type="button"
                                tabIndex={-1}
                                onClick={() => duplicateExercise(globalIdx)}
                                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                title="Duplica esercizio"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>

                              {/* Progressione */}
                              <button
                                type="button"
                                tabIndex={-1}
                                onClick={() => setActiveProgressionExerciseIndex(isProgressionOpen ? null : globalIdx)}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  isProgressionOpen
                                    ? 'bg-cyan-500 text-black font-bold shadow-md'
                                    : ex.progression_rule_id
                                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                    : 'text-slate-400 hover:text-cyan-400 hover:bg-slate-800'
                                }`}
                                title="Gestisci progressione settimanale (IA / Modelli)"
                              >
                                <TrendingUp className="w-3.5 h-3.5" />
                              </button>

                              {/* Elimina */}
                              <button
                                type="button"
                                tabIndex={-1}
                                onClick={() => removeExercise(globalIdx)}
                                className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                                title="Elimina esercizio"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Pannello Inline Progressione Contestuale (se aperto) */}
                          {isProgressionOpen && ex.name && (
                            <div className="p-3.5 bg-slate-950/95 rounded-xl border border-cyan-500/30 shadow-xl space-y-2 animate-in fade-in">
                              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                                <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                                  <Zap className="w-3.5 h-3.5 text-cyan-400" /> Progressione per "{ex.name}"
                                </span>
                                <button 
                                  type="button"
                                  onClick={() => setActiveProgressionExerciseIndex(null)}
                                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 text-xs"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <ExerciseProgressionControl
                                exercise={ex}
                                exerciseIndex={globalIdx}
                                athleteId={assignedAthleteId}
                                athleteName={currentAthlete ? `${currentAthlete.firstName} ${currentAthlete.lastName}` : undefined}
                                programId={initialWorkout?.id}
                                programName={title}
                                onUpdateExercise={(fields) => updateExerciseFields(globalIdx, fields)}
                              />
                            </div>
                          )}
                        </React.Fragment>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

            {/* Modal Rapido Note Tecniche */}
            {editingNoteIndex !== null && (
              <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Pencil className="w-4 h-4 text-amber-400" />
                      Note Tecniche: {exercises[editingNoteIndex]?.name || 'Esercizio'}
                    </h4>
                    <button onClick={() => setEditingNoteIndex(null)} className="text-slate-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={noteDraftText}
                    onChange={(e) => setNoteDraftText(e.target.value)}
                    placeholder="es. Fermo al petto di 1 secondo, discesa lenta e controllata..."
                    autoFocus
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-[var(--color-primary)] resize-y leading-relaxed"
                  />
                  <div className="flex items-center justify-between gap-2 pt-2">
                    {noteDraftText ? (
                      <button
                        type="button"
                        onClick={() => {
                          updateExercise(editingNoteIndex, 'notes', '');
                          setEditingNoteIndex(null);
                        }}
                        className="px-3 py-1.5 text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 border border-rose-500/20 rounded-lg cursor-pointer flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Rimuovi Nota</span>
                      </button>
                    ) : <div />}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingNoteIndex(null)}
                        className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white rounded-lg cursor-pointer"
                      >
                        Annulla
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          updateExercise(editingNoteIndex, 'notes', noteDraftText);
                          setEditingNoteIndex(null);
                        }}
                        className="px-4 py-1.5 text-xs font-bold bg-[var(--color-primary)] text-black rounded-lg hover:bg-[var(--color-primary-hover)] shadow-sm cursor-pointer"
                      >
                        Salva Nota
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Rapido Esercizio Alternativo */}
            {editingAltIndex !== null && (
              <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <User className="w-4 h-4 text-purple-400" />
                      Esercizio Alternativo: {exercises[editingAltIndex]?.name || 'Esercizio'}
                    </h4>
                    <button onClick={() => setEditingAltIndex(null)} className="text-slate-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={altDraftText}
                    onChange={(e) => setAltDraftText(e.target.value)}
                    placeholder="es. Leg Press se Squat occupato o dolore al ginocchio"
                    autoFocus
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-purple-400"
                  />
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingAltIndex(null)}
                      className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white rounded-lg"
                    >
                      Annulla
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateExercise(editingAltIndex, 'alternative_exercise', altDraftText);
                        setEditingAltIndex(null);
                      }}
                      className="px-4 py-1.5 text-xs font-bold bg-purple-500 text-white rounded-lg hover:bg-purple-400 shadow-sm"
                    >
                      Salva Alternativo
                    </button>
                  </div>
                </div>
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
            {isSaving ? 'Salvataggio...' : initialWorkout ? 'Salva Modifiche' : assignedAthleteId ? 'Salva e Assegna' : 'Salva Programma'}
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
          initialAthleteId={assignedAthleteId}
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
                const isSelected = activeDay.trim().toLowerCase() === dName.trim().toLowerCase();

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

            <div className="pt-2 flex items-center gap-2">
              {daysList.length >= 2 && (
                <button
                  type="button"
                  onClick={() => {
                    setDaysList((prev) => [...prev].reverse());
                    showSuccess('Sequenza Giorni Invertita', 'L\'ordine di tutti i giorni è stato invertito.');
                  }}
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  title="Inverte l'ordine dei giorni (es. da 1..N a N..1)"
                >
                  <Repeat className="w-3.5 h-3.5 text-amber-400" />
                  <span>Inverti Giorni</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsReorderDaysModalOpen(false)}
                className="flex-1 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-black font-black text-xs rounded-xl shadow transition-all cursor-pointer text-center"
              >
                Conferma Ordine Giorni
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale Eliminazione Multipla Settimane */}
      {isBulkDeleteWeeksModalOpen && (() => {
        const emptyWeeks = Array.from({ length: totalWeeks }, (_, idx) => idx + 1).filter(
          (w) => exercises.filter((e) => (e.week_number || 1) === w).length === 0
        );
        const isAllSelected = selectedWeeksToDelete.length === totalWeeks;
        const isNoneSelected = selectedWeeksToDelete.length === 0;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
            <div className="bg-[#0c1017] border border-slate-700/80 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Elimina Più Settimane</h3>
                    <p className="text-[11px] text-slate-400">Seleziona le settimane da rimuovere dal programma</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBulkDeleteWeeksModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quick selection toolbar */}
              <div className="flex items-center justify-between gap-2 text-xs">
                {emptyWeeks.length > 0 && emptyWeeks.length < totalWeeks && (
                  <button
                    type="button"
                    onClick={() => setSelectedWeeksToDelete(emptyWeeks)}
                    className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
                  >
                    Seleziona {emptyWeeks.length} vuote (0 es.)
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (selectedWeeksToDelete.length > 0) {
                      setSelectedWeeksToDelete([]);
                    } else {
                      // Seleziona tutte tranne una
                      const allExceptOne = Array.from({ length: totalWeeks }, (_, idx) => idx + 1).filter(
                        (w) => w !== (activeWeek || 1)
                      );
                      setSelectedWeeksToDelete(allExceptOne);
                    }
                  }}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold text-[11px] border border-slate-700 transition-colors ml-auto cursor-pointer"
                >
                  {selectedWeeksToDelete.length > 0 ? 'Deseleziona Tutto' : 'Seleziona Altre'}
                </button>
              </div>

              {/* Elenco Settimane con Checkbox */}
              <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                {Array.from({ length: totalWeeks }).map((_, idx) => {
                  const wNum = idx + 1;
                  const countEx = exercises.filter((e) => (e.week_number || 1) === wNum).length;
                  const isChecked = selectedWeeksToDelete.includes(wNum);
                  const isCurrent = activeWeek === wNum;

                  return (
                    <div
                      key={wNum}
                      onClick={() => {
                        setSelectedWeeksToDelete((prev) =>
                          prev.includes(wNum) ? prev.filter((w) => w !== wNum) : [...prev, wNum]
                        );
                      }}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all cursor-pointer select-none ${
                        isChecked
                          ? 'bg-rose-950/30 border-rose-500/60 text-white shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // Gestito dal container onClick
                          className="w-4 h-4 rounded text-rose-500 bg-slate-900 border-slate-700 focus:ring-rose-500 focus:ring-offset-slate-950 cursor-pointer"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm">Settimana {wNum}</span>
                            {isCurrent && (
                              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-[var(--color-primary)] text-slate-950">
                                Attiva
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {countEx === 0 ? '0 esercizi (Vuota)' : `${countEx} esercizi`}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg border ${
                          countEx === 0
                            ? 'bg-slate-900 text-slate-500 border-slate-800'
                            : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                        }`}
                      >
                        {countEx} es.
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Warning se tutte selezionate */}
              {isAllSelected && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Devi mantenere almeno una settimana nel programma.</span>
                </div>
              )}

              {/* Footer Azioni */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBulkDeleteWeeksModalOpen(false)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition-colors cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  disabled={isNoneSelected || isAllSelected}
                  onClick={() => {
                    if (
                      confirm(
                        `Sei sicuro di voler eliminare ${selectedWeeksToDelete.length} settimane e tutti i relativi esercizi? Le settimane rimanenti verranno riordinate automaticamente.`
                      )
                    ) {
                      deleteMultipleWeeks(selectedWeeksToDelete);
                    }
                  }}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:hover:bg-rose-600 text-white font-black text-xs rounded-xl transition-all shadow-lg shadow-rose-900/30 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>
                    Elimina {selectedWeeksToDelete.length > 0 ? `(${selectedWeeksToDelete.length})` : ''}
                  </span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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

      {/* ─── MODALE DI CONFERMA ELIMINAZIONE GIORNO (AMBITO SETTIMANA VS TUTTO IL PROGRAMMA) ─── */}
      {dayToDeletePrompt && (
        <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Elimina Giorno di Allenamento</h3>
                  <p className="text-xs text-slate-400">
                    Giorno: <strong className="text-amber-400 font-mono">{dayToDeletePrompt.dayName}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDayToDeletePrompt(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Informazioni di contesto */}
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-300">
                <span>Settimana Attualmente Visualizzata:</span>
                <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  Settimana {dayToDeletePrompt.weekNumber}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Esercizi in Settimana {dayToDeletePrompt.weekNumber}:</span>
                <span className="font-mono font-bold text-white">
                  {dayToDeletePrompt.exCountActiveWeek} {dayToDeletePrompt.exCountActiveWeek === 1 ? 'esercizio' : 'esercizi'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Esercizi Totali nel Programma ({totalWeeks} sett.):</span>
                <span className="font-mono font-bold text-slate-400">
                  {dayToDeletePrompt.exCountAllWeeks} esercizi
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Puoi scegliere se svuotare/eliminare gli esercizi solo da <strong className="text-white">Settimana {dayToDeletePrompt.weekNumber}</strong> (preservando intatte le altre {totalWeeks - 1} settimane), oppure cancellare definitivamente il giorno da <strong className="text-rose-400">tutte le {totalWeeks} settimane</strong> del programma.
            </p>

            {/* Opzioni di eliminazione */}
            <div className="space-y-2.5 pt-1">
              {/* Opzione 1: Solo Settimana Attiva */}
              <button
                type="button"
                onClick={() =>
                  confirmDeleteDayCurrentWeekOnly(
                    dayToDeletePrompt.dayName,
                    dayToDeletePrompt.weekNumber
                  )
                }
                className="w-full p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/40 text-left transition flex items-center justify-between group cursor-pointer"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-black text-white group-hover:text-amber-400 transition">
                    <Calendar className="w-4 h-4 text-amber-400" />
                    <span>Elimina solo da Settimana {dayToDeletePrompt.weekNumber}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Rimuove i {dayToDeletePrompt.exCountActiveWeek} esercizi di "{dayToDeletePrompt.dayName}" solo da questa settimana. Le altre {totalWeeks - 1} settimane non vengono toccate.
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition shrink-0 ml-2" />
              </button>

              {/* Opzione 2: Tutte le Settimane */}
              <button
                type="button"
                onClick={() => confirmDeleteDayAllWeeks(dayToDeletePrompt.dayName)}
                className="w-full p-3.5 rounded-2xl bg-rose-950/20 hover:bg-rose-950/40 border border-rose-500/30 hover:border-rose-500/60 text-left transition flex items-center justify-between group cursor-pointer"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-black text-rose-300 group-hover:text-rose-200 transition">
                    <Flame className="w-4 h-4 text-rose-400" />
                    <span>Elimina da TUTTE le {totalWeeks} Settimane</span>
                  </div>
                  <p className="text-[11px] text-rose-300/70">
                    Rimuove completamente la colonna "{dayToDeletePrompt.dayName}" e tutti i suoi {dayToDeletePrompt.exCountAllWeeks} esercizi dall'intero mesociclo.
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-rose-400 group-hover:text-rose-200 transition shrink-0 ml-2" />
              </button>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDayToDeletePrompt(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                Annulla
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
