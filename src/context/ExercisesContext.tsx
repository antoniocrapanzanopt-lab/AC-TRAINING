import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { ExerciseItem } from '../types/exercise';

interface ExercisesContextType {
  exercises: ExerciseItem[];
  loading: boolean;
  loadExercises: () => Promise<void>;
  createExercise: (exercise: Partial<ExerciseItem>) => Promise<{ success: boolean; error?: string }>;
  updateExercise: (id: string, exercise: Partial<ExerciseItem>) => Promise<{ success: boolean; error?: string }>;
  deleteExercise: (id: string) => Promise<{ success: boolean; error?: string }>;
}

const ExercisesContext = createContext<ExercisesContextType | undefined>(undefined);

export const ExercisesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [exercises, setExercises] = useState<ExerciseItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadExercises = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error loading exercises:', error);
      } else if (data) {
        // Deduplica per nome (preferendo quelli del coach rispetto a quelli di sistema)
        const uniqueMap = new Map<string, ExerciseItem>();
        (data as ExerciseItem[]).forEach(ex => {
          const key = ex.name.trim().toLowerCase();
          if (!uniqueMap.has(key) || ex.coach_id) {
            uniqueMap.set(key, ex);
          }
        });
        setExercises(Array.from(uniqueMap.values()));
      }
    } catch (err) {
      console.error('Error in loadExercises:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadExercises();
    }
  }, [user, loadExercises]);

  const createExercise = async (exercise: Partial<ExerciseItem>) => {
    if (!user || user.role !== 'owner') return { success: false, error: 'Non autorizzato' };

    try {
      const { error } = await supabase
        .from('exercises')
        .insert({
          name: exercise.name,
          category: exercise.category || 'Altro',
          equipment: exercise.equipment || 'Corpo Libero',
          video_url: exercise.video_url || null,
          instructions: exercise.instructions || null,
          coach_id: user.id,
        });

      if (error) throw error;
      await loadExercises();
      return { success: true };
    } catch (error: any) {
      console.error('Error creating exercise:', error);
      return { success: false, error: error.message };
    }
  };

  const updateExercise = async (id: string, exercise: Partial<ExerciseItem>) => {
    if (!user || user.role !== 'owner') return { success: false, error: 'Non autorizzato' };

    try {
      const { error } = await supabase
        .from('exercises')
        .update({
          name: exercise.name,
          category: exercise.category,
          equipment: exercise.equipment,
          video_url: exercise.video_url || null,
          instructions: exercise.instructions || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      await loadExercises();
      return { success: true };
    } catch (error: any) {
      console.error('Error updating exercise:', error);
      return { success: false, error: error.message };
    }
  };

  const deleteExercise = async (id: string) => {
    if (!user || user.role !== 'owner') return { success: false, error: 'Non autorizzato' };

    try {
      const { error } = await supabase
        .from('exercises')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadExercises();
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting exercise:', error);
      return { success: false, error: error.message };
    }
  };

  return (
    <ExercisesContext.Provider
      value={{
        exercises,
        loading,
        loadExercises,
        createExercise,
        updateExercise,
        deleteExercise,
      }}
    >
      {children}
    </ExercisesContext.Provider>
  );
};

export const useExercises = (): ExercisesContextType => {
  const context = useContext(ExercisesContext);
  if (!context) {
    throw new Error('useExercises deve essere utilizzato all\'interno di un ExercisesProvider');
  }
  return context;
};
