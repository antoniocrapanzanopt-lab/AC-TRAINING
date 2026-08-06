import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { WorkoutTemplate, WorkoutExercise, AthleteAssignedWorkout, WorkoutSession, ExerciseLog, WorkoutFolder } from '../types/workout';

interface WorkoutsContextType {
  // Coach specific
  coachTemplates: WorkoutTemplate[];
  folders: WorkoutFolder[];
  loadFolders: () => Promise<void>;
  createFolder: (name: string, parentId?: string | null) => Promise<{ success: boolean; error?: string }>;
  updateFolder: (folderId: string, name: string) => Promise<{ success: boolean; error?: string }>;
  deleteFolder: (folderId: string) => Promise<{ success: boolean; error?: string }>;
  moveWorkoutToFolder: (workoutId: string, folderId: string | null) => Promise<{ success: boolean; error?: string }>;
  createWorkoutTemplate: (workout: Partial<WorkoutTemplate>, exercises: Partial<WorkoutExercise>[]) => Promise<{ success: boolean; error?: string; workoutId?: string }>;
  updateWorkoutTemplate: (workoutId: string, workout: Partial<WorkoutTemplate>, exercises: Partial<WorkoutExercise>[]) => Promise<{ success: boolean; error?: string }>;
  deleteWorkoutTemplate: (workoutId: string) => Promise<{ success: boolean; error?: string }>;
  assignWorkoutToAthlete: (athleteId: string, workoutId: string) => Promise<{ success: boolean; error?: string }>;
  getAssignedWorkoutsForAthlete: (athleteId: string) => Promise<AthleteAssignedWorkout[]>;
  getExercisesForWorkout: (workoutId: string) => Promise<WorkoutExercise[]>;
  
  // Athlete specific
  myAssignedWorkouts: AthleteAssignedWorkout[];
  refreshMyWorkouts: () => Promise<void>;
  startWorkoutSession: (workoutId: string) => Promise<{ session: WorkoutSession | null, error?: string }>;
  endWorkoutSession: (sessionId: string, notes?: string, rpe?: number) => Promise<{ success: boolean; error?: string }>;
  saveExerciseLogs: (logs: Partial<ExerciseLog>[]) => Promise<{ success: boolean; error?: string }>;
  
  loading: boolean;
}

const WorkoutsContext = createContext<WorkoutsContextType | undefined>(undefined);

export const WorkoutsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [coachTemplates, setCoachTemplates] = useState<WorkoutTemplate[]>([]);
  const [folders, setFolders] = useState<WorkoutFolder[]>([]);
  const [myAssignedWorkouts, setMyAssignedWorkouts] = useState<AthleteAssignedWorkout[]>([]);
  const [loading, setLoading] = useState(false);

  // --- COACH LOGIC ---

  const loadFolders = useCallback(async () => {
    if (!user || user.role !== 'owner') return;
    const { data, error } = await supabase
      .from('workout_folders')
      .select('*')
      .eq('coach_id', user.id)
      .order('name', { ascending: true });

    if (!error && data) {
      setFolders(data);
    }
  }, [user]);

  const createFolder = async (name: string, parentId?: string | null) => {
    if (!user || user.role !== 'owner') return { success: false, error: 'Unauthorized' };
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
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const updateFolder = async (folderId: string, name: string) => {
    if (!user || user.role !== 'owner') return { success: false, error: 'Unauthorized' };
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
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const deleteFolder = async (folderId: string) => {
    if (!user || user.role !== 'owner') return { success: false, error: 'Unauthorized' };
    try {
      const { error } = await supabase
        .from('workout_folders')
        .delete()
        .eq('id', folderId);

      if (error) throw error;
      await loadFolders();
      await loadCoachTemplates();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const moveWorkoutToFolder = async (workoutId: string, folderId: string | null) => {
    if (!user || user.role !== 'owner') return { success: false, error: 'Unauthorized' };
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
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const loadCoachTemplates = useCallback(async () => {
    if (!user || user.role !== 'owner') return;
    setLoading(true);
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('coach_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCoachTemplates(data);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user && user.role === 'owner') {
      loadFolders();
      loadCoachTemplates();
    }
  }, [user, loadFolders, loadCoachTemplates]);

  const createWorkoutTemplate = async (workout: Partial<WorkoutTemplate>, exercises: Partial<WorkoutExercise>[]) => {
    if (!user || user.role !== 'owner') return { success: false, error: 'Unauthorized' };
    
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
    } catch (error: any) {
      console.error("Error creating workout:", error);
      return { success: false, error: error.message };
    }
  };

  const updateWorkoutTemplate = async (workoutId: string, workout: Partial<WorkoutTemplate>, exercises: Partial<WorkoutExercise>[]) => {
    if (!user || user.role !== 'owner') return { success: false, error: 'Unauthorized' };

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
    } catch (error: any) {
      console.error("Error updating workout:", error);
      return { success: false, error: error.message };
    }
  };

  const deleteWorkoutTemplate = async (workoutId: string) => {
    if (!user || user.role !== 'owner') return { success: false, error: 'Unauthorized' };

    try {
      const { error } = await supabase
        .from('workouts')
        .delete()
        .eq('id', workoutId);

      if (error) throw error;

      await loadCoachTemplates();
      return { success: true };
    } catch (error: any) {
      console.error("Error deleting workout:", error);
      return { success: false, error: error.message };
    }
  };

  const assignWorkoutToAthlete = async (athleteId: string, workoutId: string) => {
    if (!user || user.role !== 'owner') return { success: false, error: 'Unauthorized' };
    try {
      const { error } = await supabase
        .from('athlete_assigned_workouts')
        .insert({
          athlete_id: athleteId,
          workout_id: workoutId,
          assigned_by: user.id,
        });

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
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
      .eq('athlete_id', user.id)
      .eq('is_active', true)
      .order('assigned_date', { ascending: false });

    if (!error && data) {
      setMyAssignedWorkouts(data as any);
    }
    setLoading(false);
  }, [user]);

  const startWorkoutSession = async (workoutId: string) => {
    if (!user || user.role !== 'athlete') return { session: null, error: 'Unauthorized' };
    try {
      const { data, error } = await supabase
        .from('workout_sessions')
        .insert({
          athlete_id: user.id,
          workout_id: workoutId,
        })
        .select()
        .single();
        
      if (error) throw error;
      return { session: data as WorkoutSession };
    } catch (error: any) {
      return { session: null, error: error.message };
    }
  };

  const endWorkoutSession = async (sessionId: string, notes?: string, rpe?: number) => {
    try {
      const updateData: any = { end_time: new Date().toISOString() };
      if (notes) updateData.notes = notes;
      if (rpe) updateData.rpe = rpe;

      const { error } = await supabase
        .from('workout_sessions')
        .update(updateData)
        .eq('id', sessionId);
        
      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const saveExerciseLogs = async (logs: Partial<ExerciseLog>[]) => {
    if (logs.length === 0) return { success: true };
    try {
      const { error } = await supabase
        .from('exercise_logs')
        .insert(logs as any);
        
      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
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
          loadFolders,
          createFolder,
          updateFolder,
          deleteFolder,
          moveWorkoutToFolder,
          createWorkoutTemplate,
          updateWorkoutTemplate,
          deleteWorkoutTemplate,
          assignWorkoutToAthlete,
          getAssignedWorkoutsForAthlete,
          getExercisesForWorkout,
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
