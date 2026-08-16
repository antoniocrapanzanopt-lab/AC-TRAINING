import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { ExerciseItem } from '../types/exercise';

interface ExercisesContextType {
  exercises: ExerciseItem[];
  loading: boolean;
  loadExercises: () => Promise<void>;
  createExercise: (exercise: Partial<ExerciseItem>) => Promise<{ success: boolean; error?: string }>;
  createExercisesBatch: (exercisesList: Partial<ExerciseItem>[]) => Promise<{ success: boolean; count?: number; error?: string }>;
  updateExercise: (id: string, exercise: Partial<ExerciseItem>) => Promise<{ success: boolean; error?: string }>;
  deleteExercise: (id: string) => Promise<{ success: boolean; error?: string }>;
}

const ExercisesContext = createContext<ExercisesContextType | undefined>(undefined);

const isCoachRole = (role?: string) => role === 'owner' || role === 'admin' || role === 'coach' || role === 'collaborator';

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
    if (!user || !isCoachRole(user.role)) return { success: false, error: 'Non autorizzato' };

    try {
      const { error } = await supabase
        .from('exercises')
        .insert({
          name: exercise.name,
          category: exercise.category || 'Altro',
          equipment: exercise.equipment || 'Corpo Libero',
          video_url: exercise.video_url || null,
          instructions: exercise.instructions || null,
          // ── Informazioni Chiave ────────────────────────────────────────────
          tipo: exercise.tipo || null,
          bilateralita: exercise.bilateralita || null,
          piano_movimento: exercise.piano_movimento || null,
          catena_cinetica: exercise.catena_cinetica || null,
          gradi_liberta: exercise.gradi_liberta || null,
          // ── Blocchi JSONB ──────────────────────────────────────────────────
          parametri_chiave: exercise.parametri_chiave || null,
          muscoli_coinvolti: exercise.muscoli_coinvolti || null,
          esecuzione: exercise.esecuzione || null,
          sicurezza: exercise.sicurezza || null,
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

  const createExercisesBatch = async (exercisesList: Partial<ExerciseItem>[]) => {
    if (!user || !isCoachRole(user.role)) return { success: false, error: 'Non autorizzato' };
    if (!exercisesList || exercisesList.length === 0) return { success: true, count: 0 };

    try {
      const recordsToInsert = exercisesList.map(ex => ({
        name: ex.name,
        category: ex.category || 'Altro',
        equipment: ex.equipment || 'Corpo Libero',
        video_url: ex.video_url || null,
        instructions: ex.instructions || null,
        // ── Informazioni Chiave ────────────────────────────────────────────
        tipo: ex.tipo || null,
        bilateralita: ex.bilateralita || null,
        piano_movimento: ex.piano_movimento || null,
        catena_cinetica: ex.catena_cinetica || null,
        gradi_liberta: ex.gradi_liberta || null,
        // ── Blocchi JSONB ──────────────────────────────────────────────────
        parametri_chiave: ex.parametri_chiave || null,
        muscoli_coinvolti: ex.muscoli_coinvolti || null,
        esecuzione: ex.esecuzione || null,
        sicurezza: ex.sicurezza || null,
        coach_id: user.id,
      }));

      const { error } = await supabase
        .from('exercises')
        .insert(recordsToInsert);

      if (error) throw error;
      await loadExercises();
      return { success: true, count: recordsToInsert.length };
    } catch (error: any) {
      console.error('Error creating batch exercises:', error);
      return { success: false, error: error.message };
    }
  };

  const updateExercise = async (id: string, exercise: Partial<ExerciseItem>) => {
    if (!user || !isCoachRole(user.role)) return { success: false, error: 'Non autorizzato' };

    try {
      const updatePayload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      // Campi base — aggiorna solo se esplicitamente forniti
      if (exercise.name !== undefined) updatePayload.name = exercise.name;
      if (exercise.category !== undefined) updatePayload.category = exercise.category;
      if (exercise.equipment !== undefined) updatePayload.equipment = exercise.equipment;
      if (exercise.video_url !== undefined) updatePayload.video_url = exercise.video_url || null;
      if (exercise.instructions !== undefined) updatePayload.instructions = exercise.instructions || null;

      // Informazioni Chiave strutturate
      if (exercise.tipo !== undefined) updatePayload.tipo = exercise.tipo || null;
      if (exercise.bilateralita !== undefined) updatePayload.bilateralita = exercise.bilateralita || null;
      if (exercise.piano_movimento !== undefined) updatePayload.piano_movimento = exercise.piano_movimento || null;
      if (exercise.catena_cinetica !== undefined) updatePayload.catena_cinetica = exercise.catena_cinetica || null;
      if (exercise.gradi_liberta !== undefined) updatePayload.gradi_liberta = exercise.gradi_liberta || null;

      // Blocchi JSONB
      if (exercise.parametri_chiave !== undefined) updatePayload.parametri_chiave = exercise.parametri_chiave || null;
      if (exercise.muscoli_coinvolti !== undefined) updatePayload.muscoli_coinvolti = exercise.muscoli_coinvolti || null;
      if (exercise.esecuzione !== undefined) updatePayload.esecuzione = exercise.esecuzione || null;
      if (exercise.sicurezza !== undefined) updatePayload.sicurezza = exercise.sicurezza || null;

      const { error } = await supabase
        .from('exercises')
        .update(updatePayload)
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
    if (!user || !isCoachRole(user.role)) return { success: false, error: 'Non autorizzato' };

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
        createExercisesBatch,
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
