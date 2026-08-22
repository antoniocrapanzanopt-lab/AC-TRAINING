import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { WorkoutTemplate, WorkoutExercise, AthleteAssignedWorkout, WorkoutSession, ExerciseLog, WorkoutFolder } from '../types/workout';

interface WorkoutsContextType {
  // Coach specific
  coachTemplates: WorkoutTemplate[];
  folders: WorkoutFolder[];
  allAssignedWorkouts: AthleteAssignedWorkout[];
  loadFolders: () => Promise<void>;
  loadAssignedWorkouts: () => Promise<void>;
  createFolder: (name: string, parentId?: string | null) => Promise<{ success: boolean; error?: string }>;
  updateFolder: (folderId: string, name: string) => Promise<{ success: boolean; error?: string }>;
  deleteFolder: (folderId: string) => Promise<{ success: boolean; error?: string }>;
  moveWorkoutToFolder: (workoutId: string, folderId: string | null) => Promise<{ success: boolean; error?: string }>;
  createWorkoutTemplate: (workout: Partial<WorkoutTemplate>, exercises: Partial<WorkoutExercise>[]) => Promise<{ success: boolean; error?: string; workoutId?: string }>;
  updateWorkoutTemplate: (workoutId: string, workout: Partial<WorkoutTemplate>, exercises: Partial<WorkoutExercise>[]) => Promise<{ success: boolean; error?: string }>;
  duplicateWorkoutTemplate: (workoutId: string, customTitle?: string) => Promise<{ success: boolean; newWorkoutId?: string; error?: string }>;
  deleteWorkoutTemplate: (workoutId: string) => Promise<{ success: boolean; error?: string }>;
  assignWorkoutToAthlete: (athleteId: string, workoutId: string) => Promise<{ success: boolean; error?: string }>;
  assignWorkoutToAthletes: (athleteIds: string[], workoutId: string) => Promise<{ success: boolean; error?: string }>;
  unassignWorkoutFromAthlete: (athleteId: string, workoutId: string) => Promise<{ success: boolean; error?: string }>;
  getAssignedWorkoutsForAthlete: (athleteId: string) => Promise<AthleteAssignedWorkout[]>;
  getExercisesForWorkout: (workoutId: string) => Promise<WorkoutExercise[]>;
  forkWorkoutForAthlete: (workoutId: string, athleteId: string, newWorkoutData: Partial<WorkoutTemplate>, newExercises: Partial<WorkoutExercise>[]) => Promise<{ success: boolean; error?: string }>;
  forkWorkoutForAllAssigned: (workoutId: string) => Promise<{ success: boolean; error?: string }>;
  forceSyncMasterTemplate: (masterWorkoutId: string) => Promise<{ success: boolean; error?: string }>;
  
  // Athlete specific
  myAssignedWorkouts: AthleteAssignedWorkout[];
  refreshMyWorkouts: () => Promise<void>;
  startWorkoutSession: (workoutId: string, targetAthleteId?: string) => Promise<{ session: WorkoutSession | null, error?: string }>;
  endWorkoutSession: (sessionId: string, notes?: string, rpe?: number) => Promise<{ success: boolean; error?: string }>;
  saveExerciseLogs: (logs: Partial<ExerciseLog>[]) => Promise<{ success: boolean; error?: string }>;
  
  loading: boolean;
}

const WorkoutsContext = createContext<WorkoutsContextType | undefined>(undefined);

const isCoachRole = (role?: string) => role === 'owner' || role === 'admin' || role === 'coach' || role === 'collaborator';

export const WorkoutsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [coachTemplates, setCoachTemplates] = useState<WorkoutTemplate[]>([]);
  const [folders, setFolders] = useState<WorkoutFolder[]>([]);
  const [allAssignedWorkouts, setAllAssignedWorkouts] = useState<AthleteAssignedWorkout[]>([]);
  const [myAssignedWorkouts, setMyAssignedWorkouts] = useState<AthleteAssignedWorkout[]>([]);
  const [loading, setLoading] = useState(false);

  // --- COACH LOGIC ---

  const loadAssignedWorkouts = useCallback(async () => {
    if (!user || !isCoachRole(user.role)) return;
    const { data, error } = await supabase
      .from('athlete_assigned_workouts')
      .select(`
        *,
        athlete:athletes(id, first_name, last_name, email, status),
        workout:workouts(*)
      `)
      .eq('is_active', true)
      .order('assigned_date', { ascending: false });

    if (!error && data) {
      // Filtra via record con workout orfano/cancellato
      const valid = (data as AthleteAssignedWorkout[]).filter(a => a.workout != null);
      setAllAssignedWorkouts(valid);

      // Pulizia asincrona delle righe orfane nel DB se presenti
      const orphanIds = (data as AthleteAssignedWorkout[]).filter(a => a.workout == null).map(a => a.id);
      if (orphanIds.length > 0) {
        supabase.from('athlete_assigned_workouts').delete().in('id', orphanIds).then();
      }
    }
  }, [user]);

  const loadFolders = useCallback(async () => {
    if (!user || !isCoachRole(user.role)) return;

    try {
      const { data, error } = await supabase
        .from('workout_folders')
        .select('*')
        .eq('coach_id', user.id)
        .order('name', { ascending: true });

      if (error) {
        console.warn('Errore nel caricamento delle cartelle workout:', error.message);
      } else if (data) {
        setFolders(data);
      }
    } catch (err: unknown) {
      console.error('Eccezione loadFolders:', err);
    }
  }, [user]);

  const createFolder = async (name: string, parentId?: string | null) => {
    if (!user || !isCoachRole(user.role)) return { success: false, error: 'Unauthorized' };
    try {
      const { error } = await supabase
        .from('workout_folders')
        .insert({
          coach_id: user.id,
          name: name.trim(),
          parent_id: parentId || null,
        });

      if (error) throw error;
      await loadFolders();
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: msg };
    }
  };

  const updateFolder = async (folderId: string, name: string) => {
    if (!user || !isCoachRole(user.role)) return { success: false, error: 'Unauthorized' };
    try {
      const { error } = await supabase
        .from('workout_folders')
        .update({
          name: name.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', folderId);

      if (error) throw error;
      await loadFolders();
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: msg };
    }
  };

  const deleteFolder = async (folderId: string) => {
    if (!user || !isCoachRole(user.role)) return { success: false, error: 'Unauthorized' };
    try {
      const { error } = await supabase
        .from('workout_folders')
        .delete()
        .eq('id', folderId);

      if (error) throw error;
      await loadFolders();
      await loadCoachTemplates();
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: msg };
    }
  };

  const moveWorkoutToFolder = async (workoutId: string, folderId: string | null) => {
    if (!user || !isCoachRole(user.role)) return { success: false, error: 'Unauthorized' };
    try {
      const { error } = await supabase
        .from('workouts')
        .update({
          folder_id: folderId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', workoutId);

      if (error) throw error;
      await loadCoachTemplates();
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: msg };
    }
  };

  const loadCoachTemplates = useCallback(async () => {
    if (!user || !isCoachRole(user.role)) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('coach_id', user.id)
        .or('is_template.eq.true,is_template.is.null')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Errore nel caricamento delle schede coach:', error.message);
      } else if (data) {
        setCoachTemplates(data);
      }
    } catch (err: unknown) {
      console.error('Eccezione loadCoachTemplates:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && isCoachRole(user.role)) {
      loadFolders();
      loadCoachTemplates();
      loadAssignedWorkouts();
    }
  }, [user, loadFolders, loadCoachTemplates, loadAssignedWorkouts]);

  const createWorkoutTemplate = async (workout: Partial<WorkoutTemplate>, exercises: Partial<WorkoutExercise>[]) => {
    if (!user || !isCoachRole(user.role)) return { success: false, error: 'Unauthorized' };
    
    try {
      // 1. Inserisci il workout
      const { data: newWorkout, error: workoutError } = await supabase
        .from('workouts')
        .insert({
          title: workout.title,
          description: workout.description,
          coach_id: user.id,
          folder_id: workout.folder_id || null,
          is_template: workout.is_template || false,
          total_weeks: workout.total_weeks || 1,
          estimated_duration_minutes: workout.estimated_duration_minutes ? String(workout.estimated_duration_minutes) : null,
        })
        .select()
        .single();

      if (workoutError) throw workoutError;

      // 2. Inserisci gli esercizi
      if (exercises.length > 0) {
        const exercisesToInsert = exercises.map((ex, index) => ({
          workout_id: newWorkout.id,
          name: ex.name,
          sets: ex.sets || 1,
          reps_target: ex.reps_target || '10',
          rest_seconds: ex.rest_seconds || 60,
          order_index: index,
          notes: ex.notes || null,
          day_name: ex.day_name || 'Giorno A',
          week_number: ex.week_number || 1,
          target_weight: ex.target_weight || null,
          rir_target: ex.rir_target || null,
          tut: ex.tut || null,
          is_time_based: ex.is_time_based || false,
          duration_seconds: ex.duration_seconds || null,
          alternative_exercise: ex.alternative_exercise || null,
        }));

        const { error: exercisesError } = await supabase
          .from('workout_exercises')
          .insert(exercisesToInsert);

        if (exercisesError) throw exercisesError;
      }

      await loadCoachTemplates();
      return { success: true, workoutId: newWorkout.id };
    } catch (error: unknown) {
      console.error("Error creating workout:", error);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: msg };
    }
  };

  const updateWorkoutTemplate = async (workoutId: string, workout: Partial<WorkoutTemplate>, exercises: Partial<WorkoutExercise>[]) => {
    if (!user || !isCoachRole(user.role)) return { success: false, error: 'Unauthorized' };

    try {
      const { error: workoutError } = await supabase
        .from('workouts')
        .update({
          title: workout.title,
          description: workout.description,
          folder_id: workout.folder_id !== undefined ? workout.folder_id : null,
          total_weeks: workout.total_weeks || 1,
          estimated_duration_minutes: workout.estimated_duration_minutes ? String(workout.estimated_duration_minutes) : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', workoutId);

      if (workoutError) throw workoutError;

      const { error: deleteError } = await supabase
        .from('workout_exercises')
        .delete()
        .eq('workout_id', workoutId);

      if (deleteError) throw deleteError;

      if (exercises.length > 0) {
        const exercisesToInsert = exercises.map((ex, index) => ({
          workout_id: workoutId,
          name: ex.name,
          sets: ex.sets || 1,
          reps_target: ex.reps_target || '10',
          rest_seconds: ex.rest_seconds || 60,
          order_index: index,
          notes: ex.notes || null,
          day_name: ex.day_name || 'Giorno A',
          week_number: ex.week_number || 1,
          target_weight: ex.target_weight || null,
          rir_target: ex.rir_target || null,
          tut: ex.tut || null,
          is_time_based: ex.is_time_based || false,
          duration_seconds: ex.duration_seconds || null,
          alternative_exercise: ex.alternative_exercise || null,
        }));

        const { error: exercisesError } = await supabase
          .from('workout_exercises')
          .insert(exercisesToInsert);

        if (exercisesError) throw exercisesError;
      }

      await loadCoachTemplates();
      return { success: true };
    } catch (error: unknown) {
      console.error("Error updating workout:", error);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: msg };
    }
  };

  const deleteWorkoutTemplate = async (workoutId: string) => {
    if (!user || !isCoachRole(user.role)) return { success: false, error: 'Unauthorized' };

    try {
      // 1. Elimina le assegnazioni attive della scheda
      await supabase
        .from('athlete_assigned_workouts')
        .delete()
        .eq('workout_id', workoutId);

      // 2. Trova e rimuovi eventuali schede forked/personalizzate collegate e relative assegnazioni
      const { data: forkedWorkouts } = await supabase
        .from('workouts')
        .select('id')
        .eq('parent_template_id', workoutId);

      if (forkedWorkouts && forkedWorkouts.length > 0) {
        const forkedIds = forkedWorkouts.map(f => f.id);
        await supabase
          .from('athlete_assigned_workouts')
          .delete()
          .in('workout_id', forkedIds);

        await supabase
          .from('workouts')
          .delete()
          .in('id', forkedIds);
      }

      // 3. Elimina il workout principale
      const { error } = await supabase
        .from('workouts')
        .delete()
        .eq('id', workoutId);

      if (error) throw error;

      // 4. Ricarica sia i template coach che le assegnazioni atleti
      await Promise.all([
        loadCoachTemplates(),
        loadAssignedWorkouts(),
      ]);
      return { success: true };
    } catch (error: unknown) {
      console.error("Error deleting workout:", error);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: msg };
    }
  };

  const duplicateWorkoutTemplate = async (workoutId: string, customTitle?: string) => {
    if (!user || !isCoachRole(user.role)) return { success: false, error: 'Unauthorized' };

    try {
      // 1. Carica il template originale
      const { data: original, error: origError } = await supabase
        .from('workouts')
        .select('*')
        .eq('id', workoutId)
        .single();

      if (origError || !original) {
        throw new Error(origError?.message || 'Scheda originale non trovata');
      }

      // 2. Carica gli esercizi originali
      const origExercises = await getExercisesForWorkout(workoutId);

      // 3. Clona tramite createWorkoutTemplate
      const newTitle = customTitle || `${original.title} (Copia)`;
      const result = await createWorkoutTemplate(
        {
          title: newTitle,
          description: original.description || '',
          folder_id: original.folder_id || null,
          is_template: true,
          total_weeks: original.total_weeks || 1,
          estimated_duration_minutes: original.estimated_duration_minutes || null,
        },
        origExercises || []
      );

      if (!result.success) {
        throw new Error(result.error || 'Errore durante la creazione della copia');
      }

      return { success: true, newWorkoutId: result.workoutId };
    } catch (error: unknown) {
      console.error("Error duplicating workout:", error);
      const msg = error instanceof Error ? error.message : (typeof error === 'object' && error !== null && 'message' in error ? String((error as { message?: unknown }).message) : 'Errore sconosciuto');
      return { success: false, error: msg };
    }
  };

  const assignWorkoutToAthlete = async (athleteId: string, workoutId: string) => {
    return assignWorkoutToAthletes([athleteId], workoutId);
  };

  const assignWorkoutToAthletes = async (athleteIds: string[], workoutId: string) => {
    if (!user || !isCoachRole(user.role)) return { success: false, error: 'Unauthorized' };
    if (athleteIds.length === 0) return { success: true };
    try {
      const rowsToInsert = athleteIds.map((athId) => ({
        athlete_id: athId,
        workout_id: workoutId,
        assigned_by: user.id,
      }));

      const { error } = await supabase
        .from('athlete_assigned_workouts')
        .insert(rowsToInsert);

      if (error) throw error;
      await loadAssignedWorkouts();
      return { success: true };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: msg };
    }
  };

  const unassignWorkoutFromAthlete = async (athleteId: string, workoutId: string) => {
    if (!user || !isCoachRole(user.role)) return { success: false, error: 'Unauthorized' };
    try {
      // 1. Elimina l'assegnazione
      const { error } = await supabase
        .from('athlete_assigned_workouts')
        .delete()
        .eq('athlete_id', athleteId)
        .eq('workout_id', workoutId);

      if (error) throw error;

      // 2. Se era una copia privata personalizzata dell'atleta (is_template = false), rimuovila
      const { data: wk } = await supabase
        .from('workouts')
        .select('is_template')
        .eq('id', workoutId)
        .maybeSingle();

      if (wk && !wk.is_template) {
        await supabase.from('workouts').delete().eq('id', workoutId);
      }

      await loadAssignedWorkouts();
      return { success: true };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: msg };
    }
  };

  const getAssignedWorkoutsForAthlete = async (athleteId: string) => {
    const { data, error } = await supabase
      .from('athlete_assigned_workouts')
      .select(`
        *,
        workout:workouts(*)
      `)
      .eq('athlete_id', athleteId)
      .eq('is_active', true)
      .order('assigned_date', { ascending: false });

    if (error) {
      console.error(error);
      return [];
    }
    return (data || []) as any; // Type coercion for nested join
  };

  const getExercisesForWorkout = async (workoutId: string) => {
    const { data, error } = await supabase
      .from('workout_exercises')
      .select('*')
      .eq('workout_id', workoutId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error(error);
      return [];
    }
    return data as WorkoutExercise[];
  };

  const forkWorkoutForAthlete = async (originalWorkoutId: string, athleteId: string, newWorkoutData: Partial<WorkoutTemplate>, newExercises: Partial<WorkoutExercise>[]) => {
    if (!user || !isCoachRole(user.role)) return { success: false, error: 'Unauthorized' };
    try {
      // 1. Create a private copy of the workout
      const { data: clonedWorkout, error: workoutError } = await supabase
        .from('workouts')
        .insert({
          title: newWorkoutData.title || 'Scheda Personalizzata',
          description: newWorkoutData.description,
          coach_id: user.id,
          folder_id: null,
          is_template: false, // It's a local copy, not a global template
          parent_template_id: originalWorkoutId,
          total_weeks: newWorkoutData.total_weeks || 1,
          estimated_duration_minutes: newWorkoutData.estimated_duration_minutes ? String(newWorkoutData.estimated_duration_minutes) : null,
        })
        .select()
        .single();

      if (workoutError) throw workoutError;

      // 2. Insert exercises for the clone
      if (newExercises.length > 0) {
        const exercisesToInsert = newExercises.map((ex, index) => ({
          workout_id: clonedWorkout.id,
          name: ex.name,
          sets: ex.sets || 1,
          reps_target: ex.reps_target || '10',
          rest_seconds: ex.rest_seconds || 60,
          order_index: index,
          notes: ex.notes || null,
          day_name: ex.day_name || 'Giorno A',
          week_number: ex.week_number || 1,
          target_weight: ex.target_weight || null,
          rir_target: ex.rir_target || null,
          tut: ex.tut || null,
          is_time_based: ex.is_time_based || false,
          duration_seconds: ex.duration_seconds || null,
          alternative_exercise: ex.alternative_exercise || null,
        }));

        const { error: exercisesError } = await supabase
          .from('workout_exercises')
          .insert(exercisesToInsert);

        if (exercisesError) throw exercisesError;
      }

      // 3. Unassign the old global template
      await supabase
        .from('athlete_assigned_workouts')
        .delete()
        .eq('athlete_id', athleteId)
        .eq('workout_id', originalWorkoutId);

      // 4. Assign the new local copy
      await assignWorkoutToAthlete(athleteId, clonedWorkout.id);
      
      return { success: true };
    } catch (error: unknown) {
      console.error("Error forking workout for athlete:", error);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: msg };
    }
  };

  const forkWorkoutForAllAssigned = async (workoutId: string) => {
    if (!user || !isCoachRole(user.role)) return { success: false, error: 'Unauthorized' };
    try {
      // Find all athletes assigned to this template
      const { data: assignments, error: assignmentsError } = await supabase
        .from('athlete_assigned_workouts')
        .select('athlete_id')
        .eq('workout_id', workoutId)
        .eq('is_active', true);

      if (assignmentsError) throw assignmentsError;
      if (!assignments || assignments.length === 0) return { success: true };

      // Load original workout
      const { data: originalWorkout, error: fetchWorkoutError } = await supabase
        .from('workouts')
        .select('*')
        .eq('id', workoutId)
        .single();
      if (fetchWorkoutError) throw fetchWorkoutError;

      // Load original exercises
      const originalExercises = await getExercisesForWorkout(workoutId);

      // Create a single "frozen" legacy copy of the template
      const { data: frozenWorkout, error: freezeError } = await supabase
        .from('workouts')
        .insert({
          title: originalWorkout.title + ' (Versione Precedente)',
          description: originalWorkout.description,
          coach_id: user.id,
          folder_id: originalWorkout.folder_id,
          is_template: false, 
          total_weeks: originalWorkout.total_weeks,
          estimated_duration_minutes: originalWorkout.estimated_duration_minutes,
        })
        .select()
        .single();

      if (freezeError) throw freezeError;

      if (originalExercises.length > 0) {
        const exercisesToInsert = originalExercises.map((ex) => ({
          ...ex,
          id: undefined, // let DB generate
          workout_id: frozenWorkout.id,
        }));
        const { error: exercisesError } = await supabase
          .from('workout_exercises')
          .insert(exercisesToInsert);
        if (exercisesError) throw exercisesError;
      }

      // Reassign all current athletes to the frozen workout
      const athleteIds = assignments.map(a => a.athlete_id);
      
      // Delete old assignments
      await supabase
        .from('athlete_assigned_workouts')
        .delete()
        .in('athlete_id', athleteIds)
        .eq('workout_id', workoutId);
        
      // Create new assignments
      const newAssignments = athleteIds.map(aid => ({
        athlete_id: aid,
        workout_id: frozenWorkout.id,
        assigned_by: user.id
      }));
      await supabase
        .from('athlete_assigned_workouts')
        .insert(newAssignments);

      await loadAssignedWorkouts();
      return { success: true };
    } catch (error: unknown) {
      console.error("Error freezing workout for assigned athletes:", error);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: msg };
    }
  };

  const forceSyncMasterTemplate = async (masterWorkoutId: string) => {
    if (!user || !isCoachRole(user.role)) return { success: false, error: 'Unauthorized' };

    try {
      const { data: assignments, error: fetchError } = await supabase
        .from('athlete_assigned_workouts')
        .select('id, workout_id, workout:workouts(parent_template_id)')
        .eq('is_active', true);

      if (fetchError) throw fetchError;

      const customizedAssignments = (assignments || []).filter(a => {
        const w = Array.isArray(a.workout) ? a.workout[0] : a.workout;
        return w && (w as { parent_template_id?: string }).parent_template_id === masterWorkoutId;
      });
      
      if (customizedAssignments.length > 0) {
        for (const assignment of customizedAssignments) {
          const { error: assignError } = await supabase
            .from('athlete_assigned_workouts')
            .update({ workout_id: masterWorkoutId })
            .eq('id', assignment.id);
          
          if (assignError) throw assignError;

          if (assignment.workout_id) {
            await supabase.from('workouts').delete().eq('id', assignment.workout_id);
          }
        }
      }

      await loadAssignedWorkouts();
      return { success: true };
    } catch (err: unknown) {
      console.error("Error force syncing master template:", err);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: msg };
    }
  };

  // --- ATHLETE LOGIC ---

  const refreshMyWorkouts = useCallback(async () => {
    if (!user || user.role !== 'athlete') return;
    setLoading(true);
    
    // Siccome siamo un atleta, possiamo leggere le nostre assegnazioni grazie alle RLS
    // Dobbiamo usare l'id dell'atleta. user.id in AuthContext è mappato a athlete.id
    const { data, error } = await supabase
      .from('athlete_assigned_workouts')
      .select(`
        *,
        workout:workouts(*)
      `)
      .eq('athlete_id', user.athleteId || user.id)
      .eq('is_active', true)
      .order('assigned_date', { ascending: false });

    if (!error && data) {
      setMyAssignedWorkouts(data as any);
    }
    setLoading(false);
  }, [user]);

  const startWorkoutSession = async (workoutId: string, targetAthleteId?: string) => {
    if (!user) return { session: null, error: 'Unauthorized' };
    const effectiveAthleteId = targetAthleteId || user.athleteId || user.id;

    try {
      const { data, error } = await supabase
        .from('workout_sessions')
        .insert({
          athlete_id: effectiveAthleteId,
          workout_id: workoutId,
        })
        .select()
        .single();
        
      if (!error && data) {
        return { session: data as WorkoutSession };
      }

      // Fallback session con UUID valido se Supabase restituisce errore
      const fallbackSession: WorkoutSession = {
        id: crypto.randomUUID ? crypto.randomUUID() : `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0')}`,
        athlete_id: effectiveAthleteId,
        workout_id: workoutId,
        start_time: new Date().toISOString()
      };
      return { session: fallbackSession };
    } catch (error: unknown) {
      const fallbackSession: WorkoutSession = {
        id: crypto.randomUUID ? crypto.randomUUID() : `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0')}`,
        athlete_id: effectiveAthleteId,
        workout_id: workoutId,
        start_time: new Date().toISOString()
      };
      return { session: fallbackSession };
    }
  };

  const endWorkoutSession = async (sessionId: string, notes?: string, rpe?: number) => {
    try {
      const updateData: Record<string, unknown> = { end_time: new Date().toISOString() };
      if (notes) updateData.notes = notes;
      if (rpe) updateData.rpe = rpe;

      const { error } = await supabase
        .from('workout_sessions')
        .update(updateData)
        .eq('id', sessionId);
        
      if (error) {
        console.warn('endWorkoutSession warning:', error.message);
      }

      // Invia notifica al coach
      try {
        const { data: sessionData } = await supabase
          .from('workout_sessions')
          .select('athlete_id, workout_id, workouts(title, coach_id), athletes:athlete_id(first_name, last_name)')
          .eq('id', sessionId)
          .single();

        if (sessionData) {
          const workout = sessionData.workouts as unknown as { title: string; coach_id: string } | null;
          const athlete = sessionData.athletes as unknown as { first_name: string; last_name: string } | null;
          if (workout?.coach_id && athlete) {
            const athleteName = `${athlete.first_name} ${athlete.last_name}`.trim();
            await supabase.from('coach_notifications').insert({
              coach_id: workout.coach_id,
              type: 'workout_completed',
              title: `${athleteName} ha completato un allenamento`,
              body: `Scheda: ${workout.title}${rpe ? ` • RPE: ${rpe}/10` : ''}${notes ? ` • Note: "${notes}"` : ''}`,
              athlete_id: sessionData.athlete_id,
              athlete_name: athleteName,
            });
          }
        }
      } catch (notifErr) {
        console.warn('Errore invio notifica workout_completed:', notifErr);
      }

      return { success: true };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.warn('endWorkoutSession exception:', msg);
      return { success: true };
    }
  };

  const saveExerciseLogs = async (logs: Partial<ExerciseLog>[]) => {
    if (logs.length === 0) return { success: true };
    try {
      const sanitizedLogs = logs.map((l: any) => ({
        session_id: l.session_id,
        exercise_id: l.exercise_id,
        set_number: Number(l.set_number) || 1,
        reps_completed: l.reps_completed !== undefined && l.reps_completed !== null ? Number(l.reps_completed) : null,
        weight_kg: l.weight_kg !== undefined && l.weight_kg !== null ? Number(l.weight_kg) : null,
        notes: l.notes || null,
      }));

      const { error } = await supabase
        .from('exercise_logs')
        .insert(sanitizedLogs);
        
      if (error) {
        console.warn('saveExerciseLogs warning:', error.message);
      }
      return { success: !error, error: error?.message };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.warn('saveExerciseLogs exception:', msg);
      return { success: false, error: msg };
    }
  };

  // --- INIT ---
  useEffect(() => {
    if (user?.role === 'owner') {
      loadCoachTemplates();
    } else if (user?.role === 'athlete') {
      refreshMyWorkouts();
    }
  }, [user, loadCoachTemplates, refreshMyWorkouts]);

  return (
    <WorkoutsContext.Provider
        value={{
          coachTemplates,
          folders,
          allAssignedWorkouts,
          loadFolders,
          loadAssignedWorkouts,
          createFolder,
          updateFolder,
          deleteFolder,
          moveWorkoutToFolder,
          createWorkoutTemplate,
          updateWorkoutTemplate,
          duplicateWorkoutTemplate,
          deleteWorkoutTemplate,
          assignWorkoutToAthlete,
          assignWorkoutToAthletes,
          unassignWorkoutFromAthlete,
          getAssignedWorkoutsForAthlete,
          getExercisesForWorkout,
          forkWorkoutForAthlete,
          forkWorkoutForAllAssigned,
          forceSyncMasterTemplate,
          myAssignedWorkouts,
          refreshMyWorkouts,
          startWorkoutSession,
          endWorkoutSession,
          saveExerciseLogs,
          loading,
        }}
    >
      {children}
    </WorkoutsContext.Provider>
  );
};

export const useWorkouts = () => {
  const context = useContext(WorkoutsContext);
  if (context === undefined) {
    throw new Error('useWorkouts must be used within a WorkoutsProvider');
  }
  return context;
};
