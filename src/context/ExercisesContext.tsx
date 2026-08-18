import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { ExerciseItem } from '../types/exercise';
import { DEFAULT_EXERCISES_DATABASE } from '../config/defaultExercises';

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

const normalizeExercise = (raw: Record<string, any>): ExerciseItem => {
  const pk = raw.parametri_chiave || {};
  return {
    ...raw,
    id: raw.id,
    name: raw.name || '',
    category: raw.category || 'Altro',
    equipment: raw.equipment || 'Corpo Libero',
    target_specifico: raw.target_specifico || pk.target_specifico || '',
    pattern_movimento: raw.pattern_movimento || pk.pattern_movimento || '',
    ruolo_esercizio: raw.ruolo_esercizio || pk.ruolo_esercizio || 'Complementare',
    costo_sistemico: raw.costo_sistemico || pk.costo_sistemico || 'Medio',
    livello_difficolta: raw.livello_difficolta || pk.livello_difficolta || 'Intermedio',
    progression_friendly: raw.progression_friendly !== undefined 
      ? raw.progression_friendly 
      : (pk.progression_friendly !== undefined ? pk.progression_friendly : true),
    varianti: raw.varianti || pk.varianti || [],
    regressioni: raw.regressioni || pk.regressioni || [],
    progressioni: raw.progressioni || pk.progressioni || [],
    parametri_chiave: pk,
  } as ExerciseItem;
};

const buildDbPayload = (exercise: Partial<ExerciseItem>, coachId: string) => {
  const mergedPk = {
    ...(exercise.parametri_chiave || {}),
    target_specifico: exercise.target_specifico || exercise.parametri_chiave?.target_specifico || '',
    pattern_movimento: exercise.pattern_movimento || exercise.parametri_chiave?.pattern_movimento || '',
    ruolo_esercizio: exercise.ruolo_esercizio || exercise.parametri_chiave?.ruolo_esercizio || 'Complementare',
    costo_sistemico: exercise.costo_sistemico || exercise.parametri_chiave?.costo_sistemico || 'Medio',
    livello_difficolta: exercise.livello_difficolta || exercise.parametri_chiave?.livello_difficolta || 'Intermedio',
    progression_friendly: exercise.progression_friendly !== undefined ? exercise.progression_friendly : true,
    varianti: exercise.varianti || exercise.parametri_chiave?.varianti || [],
    regressioni: exercise.regressioni || exercise.parametri_chiave?.regressioni || [],
    progressioni: exercise.progressioni || exercise.parametri_chiave?.progressioni || [],
  };

  return {
    name: exercise.name,
    category: exercise.category || 'Altro',
    equipment: exercise.equipment || 'Corpo Libero',
    video_url: exercise.video_url || null,
    instructions: exercise.instructions || null,
    tipo: exercise.tipo || null,
    bilateralita: exercise.bilateralita || null,
    piano_movimento: exercise.piano_movimento || null,
    catena_cinetica: exercise.catena_cinetica || null,
    gradi_liberta: (exercise.gradi_liberta !== undefined && exercise.gradi_liberta !== null) ? Number(exercise.gradi_liberta) : null,
    parametri_chiave: mergedPk,
    muscoli_coinvolti: exercise.muscoli_coinvolti || null,
    esecuzione: exercise.esecuzione || null,
    sicurezza: exercise.sicurezza || null,
    coach_id: coachId,
  };
};

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

      const uniqueMap = new Map<string, ExerciseItem>();

      // 1. Inserisci i default di sistema come base
      DEFAULT_EXERCISES_DATABASE.forEach(def => {
        const key = def.name.trim().toLowerCase();
        uniqueMap.set(key, normalizeExercise({ ...def, id: def.id }));
      });

      // 2. Sovrascrivi/arricchisci con i dati presenti su Supabase
      if (!error && data) {
        data.forEach(raw => {
          const ex = normalizeExercise(raw);
          const key = ex.name.trim().toLowerCase();
          uniqueMap.set(key, ex);
        });
      }

      setExercises(Array.from(uniqueMap.values()));
    } catch (err) {
      console.error('Error in loadExercises:', err);
      // Fallback sicuro al catalogo di sistema
      setExercises(DEFAULT_EXERCISES_DATABASE.map(d => normalizeExercise(d)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExercises();
  }, [user, loadExercises]);

  const createExercise = async (exercise: Partial<ExerciseItem>) => {
    if (!user || !isCoachRole(user.role)) return { success: false, error: 'Non autorizzato' };

    try {
      const payload = buildDbPayload(exercise, user.id);
      const { error } = await supabase
        .from('exercises')
        .insert(payload);

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
      const recordsToInsert = exercisesList.map(ex => buildDbPayload(ex, user.id));

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
      const existing = exercises.find(e => e.id === id);
      const mergedPk = {
        ...(existing?.parametri_chiave || {}),
        ...(exercise.parametri_chiave || {}),
        target_specifico: exercise.target_specifico !== undefined ? exercise.target_specifico : (existing?.target_specifico || existing?.parametri_chiave?.target_specifico),
        pattern_movimento: exercise.pattern_movimento !== undefined ? exercise.pattern_movimento : (existing?.pattern_movimento || existing?.parametri_chiave?.pattern_movimento),
        ruolo_esercizio: exercise.ruolo_esercizio !== undefined ? exercise.ruolo_esercizio : (existing?.ruolo_esercizio || existing?.parametri_chiave?.ruolo_esercizio || 'Complementare'),
        costo_sistemico: exercise.costo_sistemico !== undefined ? exercise.costo_sistemico : (existing?.costo_sistemico || existing?.parametri_chiave?.costo_sistemico || 'Medio'),
        livello_difficolta: exercise.livello_difficolta !== undefined ? exercise.livello_difficolta : (existing?.livello_difficolta || existing?.parametri_chiave?.livello_difficolta || 'Intermedio'),
        progression_friendly: exercise.progression_friendly !== undefined ? exercise.progression_friendly : (existing?.progression_friendly ?? true),
        varianti: exercise.varianti !== undefined ? exercise.varianti : (existing?.varianti || []),
        regressioni: exercise.regressioni !== undefined ? exercise.regressioni : (existing?.regressioni || []),
        progressioni: exercise.progressioni !== undefined ? exercise.progressioni : (existing?.progressioni || []),
      };

      const updatePayload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
        parametri_chiave: mergedPk,
      };

      if (exercise.name !== undefined) updatePayload.name = exercise.name;
      if (exercise.category !== undefined) updatePayload.category = exercise.category;
      if (exercise.equipment !== undefined) updatePayload.equipment = exercise.equipment;
      if (exercise.video_url !== undefined) updatePayload.video_url = exercise.video_url || null;
      if (exercise.instructions !== undefined) updatePayload.instructions = exercise.instructions || null;
      if (exercise.tipo !== undefined) updatePayload.tipo = exercise.tipo || null;
      if (exercise.bilateralita !== undefined) updatePayload.bilateralita = exercise.bilateralita || null;
      if (exercise.piano_movimento !== undefined) updatePayload.piano_movimento = exercise.piano_movimento || null;
      if (exercise.catena_cinetica !== undefined) updatePayload.catena_cinetica = exercise.catena_cinetica || null;
      if (exercise.gradi_liberta !== undefined) updatePayload.gradi_liberta = exercise.gradi_liberta !== null ? Number(exercise.gradi_liberta) : null;
      if (exercise.muscoli_coinvolti !== undefined) updatePayload.muscoli_coinvolti = exercise.muscoli_coinvolti || null;
      if (exercise.esecuzione !== undefined) updatePayload.esecuzione = exercise.esecuzione || null;
      if (exercise.sicurezza !== undefined) updatePayload.sicurezza = exercise.sicurezza || null;

      // Se l'esercizio è di sistema e viene modificato, creane una copia per il coach
      const isSystem = id.startsWith('ex-');
      if (isSystem) {
        const exItem = exercises.find(e => e.id === id);
        if (exItem) {
          const payloadToInsert = buildDbPayload({ ...exItem, ...exercise }, user.id);
          const { error } = await supabase.from('exercises').insert(payloadToInsert);
          if (error) throw error;
        }
      } else {
        const { error } = await supabase
          .from('exercises')
          .update(updatePayload)
          .eq('id', id);

        if (error) throw error;
      }

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

export const useExercises = () => {
  const context = useContext(ExercisesContext);
  if (!context) {
    throw new Error('useExercises must be used within an ExercisesProvider');
  }
  return context;
};
