import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { WorkoutTemplate, WorkoutExercise, AthleteAssignedWorkout, WorkoutSession, ExerciseLog, WorkoutFolder } from '../types/workout';
import { parseWeightToNumber, parseRepsToNumber } from '../utils/weightParser';
import { extractErrorMessage } from '../utils/errorUtils';
import { technicalLogger } from '../utils/technicalLogger';

// video_url è confermata nello schema (full_schema.sql riga 307) — nessuna probe query necessaria
let isVideoUrlSupportedCache: boolean | null = true;
const checkVideoUrlSupport = async (): Promise<boolean> => {
  if (isVideoUrlSupportedCache !== null) return isVideoUrlSupportedCache;
  try {
    const { error } = await supabase.from('workout_exercises').select('video_url').limit(1);
    isVideoUrlSupportedCache = !error || error.code !== '42703';
  } catch {
    isVideoUrlSupportedCache = false;
  }
  return isVideoUrlSupportedCache;
};


const isValidUuid = (val: unknown): boolean =>
  typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());

/**
 * Sanitizza rigorosamente ogni record di esercizio prima di inviarlo a Supabase workout_exercises,
 * evitando errori di tipo, valori NaN o colonne mancanti (come video_url finché la migrazione non è applicata).
 */
const sanitizeExerciseRecord = async (
  ex: Partial<WorkoutExercise>,
  orderIndex: number,
  workoutId?: string
): Promise<Record<string, unknown>> => {
  const supportsVideo = await checkVideoUrlSupport();

  const record: Record<string, unknown> = {
    name: ex.name?.trim() || 'Esercizio',
    sets: Math.max(1, Number(ex.sets) || 1),
    reps_target: ex.reps_target ? String(ex.reps_target).trim() : '10',
    rest_seconds: Math.max(0, Number(ex.rest_seconds) || 60),
    order_index: typeof orderIndex === 'number' && !isNaN(orderIndex) ? orderIndex : 0,
    notes: ex.notes ? String(ex.notes) : null,
    day_name: ex.day_name ? String(ex.day_name) : 'Giorno A',
    week_number: Math.max(1, Number(ex.week_number) || 1),
    target_weight: ex.target_weight ? String(ex.target_weight).trim() : null,
    rir_target: ex.rir_target ? String(ex.rir_target).trim() : null,
    tut: ex.tut ? String(ex.tut).trim() : null,
    is_time_based: Boolean(ex.is_time_based),
    duration_seconds: ex.duration_seconds && !isNaN(Number(ex.duration_seconds)) ? Math.round(Number(ex.duration_seconds)) : null,
    alternative_exercise: ex.alternative_exercise ? String(ex.alternative_exercise).trim() : null,
    progression_rule_id: isValidUuid(ex.progression_rule_id) ? (ex.progression_rule_id as string).trim() : null,
  };

  if (workoutId) {
    record.workout_id = workoutId;
  }

  if (supportsVideo && ex.video_url !== undefined) {
    record.video_url = ex.video_url ? String(ex.video_url).trim() : null;
  }

  return record;
};

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
  updateWorkoutTemplate: (workoutId: string, workout: Partial<WorkoutTemplate>, exercises: Partial<WorkoutExercise>[], options?: { confirmedDestructive?: boolean; deletedExerciseIds?: string[] }) => Promise<{ success: boolean; error?: string }>;
  getWorkoutSnapshots: (workoutId: string) => Array<{ key: string; timestamp: number; workout: WorkoutTemplate; exercises: WorkoutExercise[] }>;
  restoreWorkoutSnapshot: (snapshotKey: string) => Promise<{ success: boolean; error?: string }>;
  duplicateWorkoutTemplate: (workoutId: string, customTitle?: string) => Promise<{ success: boolean; newWorkoutId?: string; error?: string }>;
  deleteWorkoutTemplate: (workoutId: string) => Promise<{ success: boolean; error?: string }>;
  assignWorkoutToAthlete: (athleteId: string, workoutId: string, startDate?: string) => Promise<{ success: boolean; error?: string }>;
  assignWorkoutToAthletes: (athleteIds: string[], workoutId: string, startDate?: string) => Promise<{ success: boolean; error?: string }>;
  unassignWorkoutFromAthlete: (athleteId: string, workoutId: string, deletePrivateWorkout?: boolean) => Promise<{ success: boolean; error?: string }>;
  getAssignedWorkoutsForAthlete: (athleteId: string) => Promise<AthleteAssignedWorkout[]>;
  getExercisesForWorkout: (workoutId: string) => Promise<WorkoutExercise[]>;
  forkWorkoutForAthlete: (workoutId: string, athleteId: string, newWorkoutData: Partial<WorkoutTemplate>, newExercises: Partial<WorkoutExercise>[]) => Promise<{ success: boolean; error?: string }>;
  forkWorkoutForAllAssigned: (workoutId: string) => Promise<{ success: boolean; error?: string }>;
  forceSyncMasterTemplate: (masterWorkoutId: string) => Promise<{ success: boolean; error?: string }>;
  
  // Athlete specific
  myAssignedWorkouts: AthleteAssignedWorkout[];
  refreshMyWorkouts: () => Promise<void>;
  startWorkoutSession: (workoutId: string, targetAthleteId?: string, weekNumber?: number, dayName?: string) => Promise<{ session: WorkoutSession | null, error?: string }>;
  endWorkoutSession: (sessionId: string, notes?: string, rpe?: number, weekNumber?: number, dayName?: string, workoutId?: string, targetAthleteId?: string) => Promise<{ success: boolean; error?: string }>;
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
  const [myAssignedWorkouts, setMyAssignedWorkouts] = useState<AthleteAssignedWorkout[]>(() => {
    try {
      // 1. Prova prima con la chiave versionata se athleteId è noto
      if (typeof window !== 'undefined') {
        const directKeys = Object.keys(localStorage).filter(k => k.startsWith('ac_cached_my_workouts_v2_'));
        if (directKeys.length > 0) {
          const directData = localStorage.getItem(directKeys[0]);
          if (directData) {
            const parsed = JSON.parse(directData);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
          }
        }
        const cached = localStorage.getItem('builder_cached_my_workouts');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) return parsed;
        }
      }
      return [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);

  // --- COACH LOGIC ---

  const loadAssignedWorkouts = useCallback(async () => {
    if (!user || !isCoachRole(user.role)) return;
    const { data, error } = await supabase
      .from('athlete_assigned_workouts')
      .select(`
        *,
        athlete:athletes(id, first_name, last_name, email, status),
        workout:workouts(id, title, description, total_weeks, estimated_duration_minutes, is_template, coach_id, parent_template_id, folder_id, created_at, updated_at)
      `)
      .order('assigned_date', { ascending: false });

    if (!error && data) {
      // Filtra via record con workout orfano/cancellato senza cancellare nulla dal DB
      const valid = (data as AthleteAssignedWorkout[]).filter(a => a.workout != null);
      setAllAssignedWorkouts(valid);
      
      const unlinkedCount = (data as AthleteAssignedWorkout[]).filter(a => a.workout == null).length;
      if (unlinkedCount > 0) {
        technicalLogger.warn('workouts', 'UNLINKED_ASSIGNMENTS_DETECTED', `${unlinkedCount} assegnazioni hanno workout non risolto (record preservati nel DB per sicurezza)`);
      }
    } else if (error) {
      technicalLogger.error('workouts', 'LOAD_ASSIGNED_WORKOUTS_ERROR', error.message);
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
      const msg = extractErrorMessage(err);
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
      const msg = extractErrorMessage(err);
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
      const msg = extractErrorMessage(err);
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
      const msg = extractErrorMessage(err);
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
        const exercisesToInsert = await Promise.all(
          exercises.map((ex, index) => sanitizeExerciseRecord(ex, index, newWorkout.id))
        );

        const { error: exercisesError } = await supabase
          .from('workout_exercises')
          .insert(exercisesToInsert);

        if (exercisesError) throw exercisesError;
      }

      await loadCoachTemplates();
      return { success: true, workoutId: newWorkout.id };
    } catch (error: unknown) {
      console.error("Error creating workout:", error);
      const msg = extractErrorMessage(error);
      return { success: false, error: msg };
    }
  };

  const updateWorkoutTemplate = async (
    workoutId: string,
    workout: Partial<WorkoutTemplate>,
    exercises: Partial<WorkoutExercise>[],
    options?: { confirmedDestructive?: boolean; deletedExerciseIds?: string[] }
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user || !isCoachRole(user.role)) return { success: false, error: 'Unauthorized' };
    if (!workoutId || typeof workoutId !== 'string' || workoutId.trim() === '') {
      technicalLogger.error('workouts', 'UPDATE_BLOCKED_INVALID_ID', 'ID workout mancante o non valido per update.');
      return { success: false, error: 'ID scheda non valido' };
    }

    try {
      // 1. Fetch record correnti dal database (Workout ed Esercizi)
      const { data: existingWorkout, error: workoutFetchErr } = await supabase
        .from('workouts')
        .select('*')
        .eq('id', workoutId)
        .maybeSingle();

      if (workoutFetchErr || !existingWorkout) {
        const msg = workoutFetchErr?.message || 'Scheda non trovata nel database';
        technicalLogger.error('workouts', 'UPDATE_FETCH_WORKOUT_FAILED', msg, { workoutId });
        return { success: false, error: msg };
      }

      const { data: existingExercisesData, error: exercisesFetchErr } = await supabase
        .from('workout_exercises')
        .select('*')
        .eq('workout_id', workoutId)
        .order('week_number', { ascending: true })
        .order('order_index', { ascending: true });

      if (exercisesFetchErr) {
        technicalLogger.error('workouts', 'UPDATE_FETCH_EXERCISES_FAILED', exercisesFetchErr.message, { workoutId });
        return { success: false, error: `Errore lettura esercizi DB: ${exercisesFetchErr.message}` };
      }

      const dbExercises = (existingExercisesData || []) as WorkoutExercise[];

      // 2. Snapshot automatico di sicurezza prima di qualsiasi modifica
      try {
        if (typeof window !== 'undefined') {
          const snapshotKey = `ac_workout_snapshot_${workoutId}_${Date.now()}`;
          localStorage.setItem(snapshotKey, JSON.stringify({ workout: existingWorkout, exercises: dbExercises }));
          technicalLogger.info('workouts', 'SNAPSHOT_CREATED', `Snapshot salvato con chiave ${snapshotKey}`);
        }
      } catch (snapErr) {
        technicalLogger.warn('workouts', 'SNAPSHOT_CREATION_FAILED', 'Impossibile creare snapshot locale prima di update', { error: String(snapErr) });
      }

      // 3. Controllo diagnostico e guardie anti-perdita dati
      const originalExerciseCount = dbExercises.length;
      const nextExerciseCount = exercises.length;

      const missingDbIds = dbExercises
        .map(e => e.id)
        .filter(id => !exercises.some(payloadEx => payloadEx.id === id));

      const unconfirmedMissingIds = missingDbIds.filter(
        id => !options?.deletedExerciseIds?.includes(id)
      );

      if (
        nextExerciseCount < originalExerciseCount &&
        !options?.confirmedDestructive &&
        unconfirmedMissingIds.length > 0
      ) {
        const errorMsg = 'Il salvataggio contiene meno esercizi rispetto alla scheda originale. Nessun dato è stato modificato.';
        technicalLogger.error('workouts', 'UPDATE_BLOCKED_LESS_EXERCISES', errorMsg, {
          originalCount: originalExerciseCount,
          nextCount: nextExerciseCount,
          unconfirmedCount: unconfirmedMissingIds.length,
        });
        return { success: false, error: errorMsg };
      }

      if (exercises.length === 0 && !options?.confirmedDestructive) {
        return { success: false, error: 'Impossibile salvare una scheda vuota senza conferma esplicita.' };
      }

      // 4. Aggiornamento metadati scheda
      const updateData: Record<string, unknown> = {
        title: workout.title ?? existingWorkout.title,
        description: workout.description !== undefined ? workout.description : existingWorkout.description,
        folder_id: workout.folder_id !== undefined ? workout.folder_id : existingWorkout.folder_id,
        total_weeks: workout.total_weeks || existingWorkout.total_weeks || 1,
        estimated_duration_minutes: workout.estimated_duration_minutes ? String(workout.estimated_duration_minutes) : existingWorkout.estimated_duration_minutes,
        updated_at: new Date().toISOString(),
      };
      if (workout.is_template !== undefined) {
        updateData.is_template = workout.is_template;
      }

      const { error: workoutUpdateError } = await supabase
        .from('workouts')
        .update(updateData)
        .eq('id', workoutId);

      if (workoutUpdateError) {
        technicalLogger.error('workouts', 'WORKOUT_METADATA_UPDATE_FAILED', workoutUpdateError.message);
        throw workoutUpdateError;
      }

      // 5. Categorizzazione ed esecuzione transazionale-sicura degli esercizi
      const dbExerciseMap = new Map<string, WorkoutExercise>();
      dbExercises.forEach(ex => dbExerciseMap.set(ex.id, ex));

      const exercisesToUpdate: Array<{ id: string; payload: Partial<WorkoutExercise>; order: number }> = [];
      const exercisesToInsert: Array<{ payload: Partial<WorkoutExercise>; order: number }> = [];

      exercises.forEach((ex, idx) => {
        const order = typeof ex.order_index === 'number' ? ex.order_index : idx;
        if (ex.id && dbExerciseMap.has(ex.id)) {
          exercisesToUpdate.push({ id: ex.id, payload: ex, order });
        } else {
          exercisesToInsert.push({ payload: ex, order });
        }
      });

      // A) Aggiornamento record esistenti tramite ID (nessun record ricreato, foreign keys e log intatti!)
      for (const item of exercisesToUpdate) {
        const updatePayload = await sanitizeExerciseRecord(item.payload, item.order);
        const { error: updateErr } = await supabase
          .from('workout_exercises')
          .update(updatePayload)
          .eq('id', item.id)
          .eq('workout_id', workoutId);

        if (updateErr) {
          technicalLogger.error('workouts', 'UPDATE_EXERCISE_ERROR', updateErr.message, { id: item.id });
          throw updateErr;
        }
      }

      // B) Inserimento solo nuovi esercizi
      if (exercisesToInsert.length > 0) {
        const rowsToInsert = await Promise.all(
          exercisesToInsert.map(item => sanitizeExerciseRecord(item.payload, item.order, workoutId))
        );

        const { error: insertErr } = await supabase
          .from('workout_exercises')
          .insert(rowsToInsert);

        if (insertErr) {
          technicalLogger.error('workouts', 'INSERT_EXERCISES_ERROR', insertErr.message);
          throw insertErr;
        }
      }

      // C) Eliminazione ESCLUSIVAMENTE degli ID confermati dall'utente
      let idsToDelete: string[] = [];
      if (options?.confirmedDestructive) {
        idsToDelete = missingDbIds;
      } else if (options?.deletedExerciseIds && options.deletedExerciseIds.length > 0) {
        idsToDelete = options.deletedExerciseIds.filter(id => dbExerciseMap.has(id));
      }

      if (idsToDelete.length > 0) {
        const { error: deleteErr } = await supabase
          .from('workout_exercises')
          .delete()
          .eq('workout_id', workoutId)
          .in('id', idsToDelete);

        if (deleteErr) {
          technicalLogger.error('workouts', 'DELETE_EXERCISES_ERROR', deleteErr.message, { idsToDelete });
          throw deleteErr;
        }
        technicalLogger.info('workouts', 'EXERCISES_DELETED_CONFIRMED', `Eliminati ${idsToDelete.length} esercizi confermati.`);
      }

      // 6. Ricarica e verifica post-salvataggio da database
      const { data: verifiedData, error: verifyErr } = await supabase
        .from('workout_exercises')
        .select('*')
        .eq('workout_id', workoutId)
        .order('week_number', { ascending: true })
        .order('order_index', { ascending: true });

      if (verifyErr) {
        technicalLogger.error('workouts', 'POST_SAVE_VERIFY_FAILED', verifyErr.message);
        return { success: false, error: `Verifica post-salvataggio fallita: ${verifyErr.message}` };
      }

      const verifiedExercises = verifiedData || [];
      const expectedTotal = exercisesToUpdate.length + exercisesToInsert.length;

      if (verifiedExercises.length === 0 && expectedTotal > 0) {
        const msg = 'Verifica fallita: la scheda risulta vuota nel database dopo il salvataggio.';
        technicalLogger.error('workouts', 'POST_SAVE_EMPTY_DETECTED', msg);
        return { success: false, error: msg };
      }

      if (verifiedExercises.length < expectedTotal) {
        const msg = `Verifica fallita: attesi ${expectedTotal} esercizi, ma nel database ne risultano ${verifiedExercises.length}.`;
        technicalLogger.error('workouts', 'POST_SAVE_COUNT_UNDERFLOW', msg);
        return { success: false, error: msg };
      }

      // Verifica che tutti gli ID aggiornati siano presenti
      const verifiedIds = new Set(verifiedExercises.map(e => e.id));
      for (const upd of exercisesToUpdate) {
        if (!verifiedIds.has(upd.id)) {
          const msg = `Verifica fallita: esercizio ID ${upd.id} non riscontrato nel database dopo il salvataggio.`;
          technicalLogger.error('workouts', 'POST_SAVE_ID_MISSING', msg);
          return { success: false, error: msg };
        }
      }

      await Promise.all([
        loadCoachTemplates(),
        loadAssignedWorkouts(),
      ]);

      technicalLogger.info('workouts', 'WORKOUT_SAVED_AND_VERIFIED', `Workout ${workoutId} salvato con successo. Esercizi verificati: ${verifiedExercises.length}`);
      return { success: true };
    } catch (error: unknown) {
      console.error("Error updating workout:", error);
      const msg = extractErrorMessage(error);
      return { success: false, error: msg };
    }
  };

  const getWorkoutSnapshots = useCallback((workoutId: string) => {
    if (typeof window === 'undefined' || !workoutId) return [];
    try {
      const results: Array<{ key: string; timestamp: number; workout: WorkoutTemplate; exercises: WorkoutExercise[] }> = [];
      const prefix = `ac_workout_snapshot_${workoutId}_`;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            const tsStr = key.replace(prefix, '');
            const timestamp = parseInt(tsStr, 10) || 0;
            if (parsed.workout) {
              results.push({
                key,
                timestamp,
                workout: parsed.workout,
                exercises: parsed.exercises || [],
              });
            }
          }
        }
      }
      return results.sort((a, b) => b.timestamp - a.timestamp);
    } catch (e) {
      console.error('[getWorkoutSnapshots] Errore lettura snapshot:', e);
      return [];
    }
  }, []);

  const restoreWorkoutSnapshot = useCallback(async (snapshotKey: string) => {
    if (!user || !isCoachRole(user.role)) return { success: false, error: 'Unauthorized' };
    if (typeof window === 'undefined') return { success: false, error: 'Window not available' };
    try {
      const raw = localStorage.getItem(snapshotKey);
      if (!raw) return { success: false, error: 'Snapshot non trovato' };
      const parsed = JSON.parse(raw);
      const { workout, exercises } = parsed;
      if (!workout?.id) return { success: false, error: 'Dati snapshot non validi' };

      technicalLogger.info('workouts', 'RESTORE_SNAPSHOT_INITIATED', `Ripristino snapshot ${snapshotKey} per workout ${workout.id}`);

      // 1. Ripristina metadati scheda
      const { error: workoutErr } = await supabase
        .from('workouts')
        .update({
          title: workout.title,
          description: workout.description,
          folder_id: workout.folder_id || null,
          total_weeks: workout.total_weeks || 1,
          estimated_duration_minutes: workout.estimated_duration_minutes ? String(workout.estimated_duration_minutes) : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', workout.id);

      if (workoutErr) throw workoutErr;

      // 2. Ripristina esercizi
      await supabase.from('workout_exercises').delete().eq('workout_id', workout.id);

      if (Array.isArray(exercises) && exercises.length > 0) {
        const toInsert = exercises.map((ex: Partial<WorkoutExercise>, idx: number) => ({
          workout_id: workout.id,
          name: ex.name || 'Esercizio',
          sets: ex.sets || 1,
          reps_target: ex.reps_target || '10',
          rest_seconds: ex.rest_seconds || 60,
          order_index: typeof ex.order_index === 'number' ? ex.order_index : idx,
          notes: ex.notes || null,
          day_name: ex.day_name || 'Giorno 1',
          week_number: ex.week_number || 1,
          target_weight: ex.target_weight || null,
          rir_target: ex.rir_target || null,
          tut: ex.tut || null,
          is_time_based: ex.is_time_based || false,
          duration_seconds: ex.duration_seconds || null,
          alternative_exercise: ex.alternative_exercise || null,
        }));
        const { error: insErr } = await supabase.from('workout_exercises').insert(toInsert);
        if (insErr) throw insErr;
      }

      await Promise.all([
        loadCoachTemplates(),
        loadAssignedWorkouts(),
      ]);
      technicalLogger.info('workouts', 'RESTORE_SNAPSHOT_SUCCESS', `Snapshot ${snapshotKey} ripristinato con successo.`);
      return { success: true };
    } catch (err) {
      const msg = extractErrorMessage(err, 'Errore ripristino snapshot');
      technicalLogger.error('workouts', 'RESTORE_SNAPSHOT_FAILED', msg);
      return { success: false, error: msg };
    }
  }, [user, loadCoachTemplates, loadAssignedWorkouts]);

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
      const msg = extractErrorMessage(error);
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
      const msg = extractErrorMessage(error);
      return { success: false, error: msg };
    }
  };

  const assignWorkoutToAthlete = async (athleteId: string, workoutId: string, startDate?: string) => {
    return assignWorkoutToAthletes([athleteId], workoutId, startDate);
  };

  const assignWorkoutToAthletes = async (athleteIds: string[], workoutId: string, startDate?: string) => {
    if (!user || !isCoachRole(user.role)) return { success: false, error: 'Unauthorized' };
    if (athleteIds.length === 0) return { success: true };
    try {
      const assignedTimestamp = startDate ? new Date(startDate).toISOString() : new Date().toISOString();

      // 1. Archivia le eventuali schede precedenti attualmente attive per questi atleti
      await supabase
        .from('athlete_assigned_workouts')
        .update({ is_active: false })
        .in('athlete_id', athleteIds)
        .eq('is_active', true);

      // 2. Inserisci la nuova assegnazione attiva
      const rowsToInsert = athleteIds.map((athId) => ({
        athlete_id: athId,
        workout_id: workoutId,
        assigned_by: user.id,
        assigned_date: assignedTimestamp,
        is_active: true,
      }));

      const { error } = await supabase
        .from('athlete_assigned_workouts')
        .insert(rowsToInsert);

      if (error) throw error;
      
      await Promise.all([
        loadAssignedWorkouts(),
        loadCoachTemplates(),
      ]);
      return { success: true };
    } catch (error: unknown) {
      const msg = extractErrorMessage(error);
      return { success: false, error: msg };
    }
  };

  const unassignWorkoutFromAthlete = async (athleteId: string, workoutId: string, deletePrivateWorkout: boolean = false) => {
    if (!user || !isCoachRole(user.role)) return { success: false, error: 'Unauthorized' };
    try {
      // 1. Elimina l'assegnazione
      const { error } = await supabase
        .from('athlete_assigned_workouts')
        .delete()
        .eq('athlete_id', athleteId)
        .eq('workout_id', workoutId);

      if (error) throw error;

      // 2. Se esplicitamente richiesto di eliminare il record privato dal catalogo
      if (deletePrivateWorkout) {
        const { data: wk } = await supabase
          .from('workouts')
          .select('is_template')
          .eq('id', workoutId)
          .maybeSingle();

        if (wk && !wk.is_template) {
          await supabase.from('workouts').delete().eq('id', workoutId);
        }
      } else {
        // Altrimenti ci assicuriamo che rimanga accessibile nel catalogo template master
        await supabase
          .from('workouts')
          .update({ is_template: true })
          .eq('id', workoutId);
      }

      await Promise.all([
        loadAssignedWorkouts(),
        loadCoachTemplates(),
      ]);
      return { success: true };
    } catch (error: unknown) {
      const msg = extractErrorMessage(error);
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
    return (data || []) as unknown as AthleteAssignedWorkout[];
  };

  const getExercisesForWorkout = async (workoutId: string): Promise<WorkoutExercise[]> => {
    if (!workoutId) return [];
    const { data, error } = await supabase
      .from('workout_exercises')
      .select('*')
      .eq('workout_id', workoutId)
      .order('week_number', { ascending: true })
      .order('order_index', { ascending: true });

    if (error) {
      technicalLogger.error('workouts', 'GET_EXERCISES_ERROR', error.message, { workoutId });
      throw new Error(`Errore caricamento esercizi dal database: ${error.message}`);
    }
    return (data || []) as WorkoutExercise[];
  };

  const forkWorkoutForAthlete = async (originalWorkoutId: string, athleteId: string, newWorkoutData: Partial<WorkoutTemplate>, newExercises: Partial<WorkoutExercise>[]) => {
    if (!user || !isCoachRole(user.role)) return { success: false, error: 'Unauthorized' };
    try {
      // 1. Crea copia privata del workout
      const { data: clonedWorkout, error: workoutError } = await supabase
        .from('workouts')
        .insert({
          title: newWorkoutData.title || 'Scheda Personalizzata',
          description: newWorkoutData.description,
          coach_id: user.id,
          folder_id: null,
          is_template: false, // Copia locale specifica per l'atleta
          parent_template_id: originalWorkoutId,
          total_weeks: newWorkoutData.total_weeks || 1,
          estimated_duration_minutes: newWorkoutData.estimated_duration_minutes ? String(newWorkoutData.estimated_duration_minutes) : null,
        })
        .select()
        .single();

      if (workoutError) throw workoutError;

      // 2. Inserisci gli esercizi per il clone preservando tutti i campi
      let insertedExercises: WorkoutExercise[] = [];
      if (newExercises.length > 0) {
        const exercisesToInsert = await Promise.all(
          newExercises.map((ex, index) => {
            const order = typeof ex.order_index === 'number' ? ex.order_index : index;
            return sanitizeExerciseRecord(ex, order, clonedWorkout.id);
          })
        );

        const { data: insertedData, error: exercisesError } = await supabase
          .from('workout_exercises')
          .insert(exercisesToInsert)
          .select();

        if (exercisesError) throw exercisesError;
        insertedExercises = (insertedData || []) as WorkoutExercise[];
      }

      // 3. Mappa vecchio ID -> nuovo ID per migrare sessioni e log storici dell'atleta
      const oldToNewExMap = new Map<string, string>();
      newExercises.forEach((oldEx, idx) => {
        if (oldEx.id && insertedExercises[idx]) {
          oldToNewExMap.set(oldEx.id, insertedExercises[idx].id);
        }
      });

      // 4. MIGRAZIONE SESSIONI: non azzerare lo storico dell'atleta (es. Settimana 2 in corso)
      const { data: athleteSessions } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('athlete_id', athleteId)
        .eq('workout_id', originalWorkoutId);

      if (athleteSessions && athleteSessions.length > 0) {
        const sessionIds = athleteSessions.map(s => s.id);
        await supabase
          .from('workout_sessions')
          .update({ workout_id: clonedWorkout.id })
          .eq('athlete_id', athleteId)
          .eq('workout_id', originalWorkoutId);

        if (oldToNewExMap.size > 0) {
          for (const [oldId, newId] of oldToNewExMap.entries()) {
            await supabase
              .from('exercise_logs')
              .update({ exercise_id: newId })
              .in('session_id', sessionIds)
              .eq('exercise_id', oldId);
          }
        }
      }

      // 5. Rimuovi vecchia assegnazione e assegna la nuova copia
      await supabase
        .from('athlete_assigned_workouts')
        .delete()
        .eq('athlete_id', athleteId)
        .eq('workout_id', originalWorkoutId);

      await assignWorkoutToAthlete(athleteId, clonedWorkout.id);

      // 6. Verifica post-fork
      const { data: verifyExercises } = await supabase
        .from('workout_exercises')
        .select('id')
        .eq('workout_id', clonedWorkout.id);

      if (!verifyExercises || verifyExercises.length < newExercises.length) {
        throw new Error('Verifica copia scheda fallita: esercizi incompleti nel database.');
      }
      
      return { success: true };
    } catch (error: unknown) {
      console.error("Error forking workout for athlete:", error);
      const msg = extractErrorMessage(error);
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
      const msg = extractErrorMessage(error);
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
      const msg = extractErrorMessage(err);
      return { success: false, error: msg };
    }
  };

  // --- ATHLETE LOGIC ---

  const refreshMyWorkouts = useCallback(async () => {
    if (!user || user.role !== 'athlete') return;
    setLoading(true);

    try {
      // 1. Risoluzione sicura dell'id atleta (athletes.id, non auth_user_id)
      let targetAthleteId = user.athleteId;
      if (!targetAthleteId && user.id) {
        const { data: athRecord } = await supabase
          .from('athletes')
          .select('id')
          .or(`auth_user_id.eq.${user.id},email.ilike.${(user.email || '').trim()}`)
          .maybeSingle();

        if (athRecord?.id) {
          targetAthleteId = athRecord.id;
        }
      }

      if (!targetAthleteId) {
        technicalLogger.warn('athlete', 'RESOLVE_ATHLETE_ID_PENDING', 'Athlete ID non ancora risolto, preservato stato/cache corrente.');
        return;
      }

      // 2. Query assegnazioni con join sul workout
      let { data, error } = await supabase
        .from('athlete_assigned_workouts')
        .select(`
          *,
          workout:workouts(*)
        `)
        .eq('athlete_id', targetAthleteId)
        .eq('is_active', true)
        .order('assigned_date', { ascending: false });

      // 3. Fallback resiliente se is_active non è impostato o è null
      if (!error && (!data || data.length === 0)) {
        const fallbackRes = await supabase
          .from('athlete_assigned_workouts')
          .select(`
            *,
            workout:workouts(*)
          `)
          .eq('athlete_id', targetAthleteId)
          .order('assigned_date', { ascending: false });

        if (!fallbackRes.error && fallbackRes.data && fallbackRes.data.length > 0) {
          data = fallbackRes.data;
          error = null;
        }
      }

      if (error) {
        technicalLogger.error('workouts', 'FETCH_MY_WORKOUTS_ERROR', error.message, { athleteId: targetAthleteId });
        return;
      }

      const validAssigned = ((data || []) as AthleteAssignedWorkout[]).filter(
        (a) => a.workout != null
      );

      // 4. Regola di sicurezza Anti-Wipe: non cancellare la cache se la query è vuota ma esisteva già una scheda valida
      const versionedCacheKey = `ac_cached_my_workouts_v2_${targetAthleteId}`;
      if (validAssigned.length === 0) {
        const existingCached = localStorage.getItem(versionedCacheKey) || localStorage.getItem('builder_cached_my_workouts');
        if (existingCached) {
          try {
            const parsed = JSON.parse(existingCached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              technicalLogger.warn('workouts', 'ANTI_WIPE_PREVENTED', 'Risposta vuota dal backend ignorata: conservata scheda valida esistente in cache.');
              setMyAssignedWorkouts(parsed as AthleteAssignedWorkout[]);
              return;
            }
          } catch {
            // parsing non critico
          }
        }
      }

      setMyAssignedWorkouts(validAssigned);
      try {
        if (validAssigned.length > 0) {
          const serialized = JSON.stringify(validAssigned);
          localStorage.setItem(versionedCacheKey, serialized);
          localStorage.setItem('builder_cached_my_workouts', serialized);
        }
      } catch (cacheErr) {
        technicalLogger.warn('workouts', 'CACHE_WRITE_FAILED', String(cacheErr));
      }
    } catch (err: unknown) {
      const msg = extractErrorMessage(err);
      technicalLogger.error('workouts', 'REFRESH_MY_WORKOUTS_EXCEPTION', msg);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && isCoachRole(user.role)) {
      loadFolders();
      loadCoachTemplates();
      loadAssignedWorkouts();
    } else if (user && user.role === 'athlete') {
      refreshMyWorkouts();
    }
  }, [user, loadFolders, loadCoachTemplates, loadAssignedWorkouts, refreshMyWorkouts]);

  const resolveValidAthleteId = useCallback(async (candidateId?: string): Promise<string | null> => {
    // 1. Se il candidateId è fornito ed è diverso da 'ath-local' e diverso dall'auth UID di user
    if (candidateId && candidateId !== 'ath-local' && candidateId !== user?.id) {
      return candidateId;
    }
    // 2. Se il profilo utente ha già l'athleteId risolto
    if (user?.athleteId) {
      return user.athleteId;
    }
    // 3. Risoluzione su public.athletes tramite auth_user_id o email
    if (user?.id) {
      try {
        const { data: athRecord } = await supabase
          .from('athletes')
          .select('id')
          .or(`auth_user_id.eq.${user.id},email.ilike.${(user.email || '').trim()}`)
          .maybeSingle();

        if (athRecord?.id) {
          return athRecord.id;
        }
      } catch (err) {
        console.warn('[WorkoutsContext] Errore lookup athletes.id:', err);
      }
    }
    return null;
  }, [user]);

  const startWorkoutSession = async (workoutId: string, targetAthleteId?: string, weekNumber?: number, dayName?: string) => {
    if (!user) return { session: null, error: 'Unauthorized' };
    
    // Risoluzione sicura di athletes.id (mai auth.users.id per foreign key)
    const effectiveAthleteId = await resolveValidAthleteId(targetAthleteId);
    
    if (!effectiveAthleteId) {
      console.warn("startWorkoutSession: targetAthleteId non risolvibile nel DB. Sessione annullata per evitare errori di vincolo.");
      return { session: null, error: 'Identificativo atleta non valido' };
    }

    // 1. CONTROLLO IDEMPOTENZA: Riprendi sessione in sospeso invece di duplicare
    try {
      let query = supabase
        .from('workout_sessions')
        .select('*')
        .eq('athlete_id', effectiveAthleteId)
        .eq('workout_id', workoutId)
        .is('end_time', null);
      
      if (weekNumber) query = query.eq('week_number', weekNumber);
      if (dayName) query = query.eq('day_name', dayName);
      
      const { data: existingSessions, error: findErr } = await query.order('start_time', { ascending: false }).limit(1);
      
      if (!findErr && existingSessions && existingSessions.length > 0) {
        console.log("Ripresa sessione esistente:", existingSessions[0].id);
        return { session: existingSessions[0] as WorkoutSession };
      }
    } catch (e) {
      console.warn("Errore controllo sessioni in sospeso", e);
    }

    const insertPayload: Record<string, unknown> = {
      athlete_id: effectiveAthleteId,
      workout_id: workoutId,
      status: 'in_progress',
    };
    if (weekNumber) insertPayload.week_number = weekNumber;
    if (dayName) insertPayload.day_name = dayName;

    try {
      const { data, error } = await supabase
        .from('workout_sessions')
        .insert(insertPayload)
        .select()
        .single();
        
      if (!error && data) {
        return { session: data as WorkoutSession };
      }

      const errMsg = error ? error.message : 'Impossibile creare la sessione su Supabase';
      console.error('[CRITICAL] startWorkoutSession fallito:', errMsg, { insertPayload, error });
      return { session: null, error: errMsg };
    } catch (error: unknown) {
      const errMsg = extractErrorMessage(error, 'Errore imprevisto creazione sessione');
      console.error('[CRITICAL] startWorkoutSession eccezione:', errMsg, error);
      return { session: null, error: errMsg };
    }
  };

  const endWorkoutSession = async (
    sessionId: string,
    notes?: string,
    rpe?: number,
    weekNumber?: number,
    dayName?: string,
    workoutId?: string,
    targetAthleteId?: string
  ) => {
    if (!sessionId) {
      console.error('[CRITICAL] endWorkoutSession invocato senza sessionId');
      return { success: false, error: 'Session ID mancante' };
    }

    try {
      const updateData: Record<string, unknown> = {
        end_time: new Date().toISOString(),
        status: 'completed',
      };
      if (notes) updateData.notes = notes;
      if (rpe) updateData.rpe = rpe;
      if (weekNumber) updateData.week_number = weekNumber;
      if (dayName) updateData.day_name = dayName;

      const { data, error } = await supabase
        .from('workout_sessions')
        .update(updateData)
        .eq('id', sessionId)
        .select('id');
        
      if (error) {
        console.error('[CRITICAL] endWorkoutSession errore Supabase update:', error.message, { sessionId, updateData });
        return { success: false, error: error.message };
      }

      if (!data || data.length === 0) {
        console.warn('[CRITICAL] endWorkoutSession: nessuna sessione aggiornata per id:', sessionId, 'tentativo self-heal insert...');
        // Self-heal resiliente: se l'ID sessione non esiste o era stale/locale, inseriamo la sessione completata
        if (workoutId) {
          const resolvedAthleteId = await resolveValidAthleteId(targetAthleteId);
          if (resolvedAthleteId) {
            const { data: newSess, error: insertErr } = await supabase
              .from('workout_sessions')
              .insert({
                athlete_id: resolvedAthleteId,
                workout_id: workoutId,
                status: 'completed',
                start_time: new Date(Date.now() - 3600000).toISOString(),
                end_time: new Date().toISOString(),
                notes: notes || null,
                rpe: rpe || null,
                week_number: weekNumber || 1,
                day_name: dayName || 'Giorno 1',
              })
              .select('id');

            if (!insertErr && newSess && newSess.length > 0) {
              console.log('[WorkoutsContext] Sessione creata ex-novo con successo (self-heal):', newSess[0].id);
              return { success: true };
            }
          }
        }
        return { success: false, error: 'Sessione non presente nel database' };
      }

      // Invia notifica al coach in modo sicuro non bloccante
      try {
        const { data: sessionData } = await supabase
          .from('workout_sessions')
          .select('athlete_id, workout_id, workouts(title, coach_id), athletes:athlete_id(first_name, last_name)')
          .eq('id', sessionId)
          .maybeSingle();

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
      const msg = extractErrorMessage(error);
      console.error('[CRITICAL] endWorkoutSession exception:', msg, error);
      return { success: false, error: msg };
    }
  };

  const saveExerciseLogs = async (logs: Partial<ExerciseLog>[]) => {
    if (logs.length === 0) return { success: true };
    try {
      const sanitizedLogs = logs.map((l) => {
        const parsedWeight = parseWeightToNumber(l.weight_kg);
        const parsedReps = parseRepsToNumber(l.reps_completed, 0);

        let combinedNotes = l.notes || null;
        if (parsedWeight.note) {
          combinedNotes = combinedNotes ? `${combinedNotes} | ${parsedWeight.note}` : parsedWeight.note;
        }

        return {
          session_id: l.session_id,
          exercise_id: l.exercise_id,
          set_number: Number(l.set_number) || 1,
          reps_completed: parsedReps > 0 ? parsedReps : (l.reps_completed !== null && l.reps_completed !== undefined ? Math.max(0, Number(l.reps_completed) || 0) : null),
          weight_kg: parsedWeight.weightKg,
          notes: combinedNotes,
        };
      });

      console.log('[saveExerciseLogs] Invio a Supabase:', {
        tabella: 'exercise_logs',
        righe_da_inserire: sanitizedLogs.length,
        session_id: sanitizedLogs[0]?.session_id,
        payload: sanitizedLogs,
      });

      const { data: insertedRows, error } = await supabase
        .from('exercise_logs')
        .insert(sanitizedLogs)
        .select();
        
      if (error) {
        console.warn('[saveExerciseLogs] Batch insert iniziale fallito, tentativo di filtro esercizi validi:', error.message);
        
        // Se c'è una violazione di chiave esterna su exercise_id, filtra solo gli ID validi esistenti su workout_exercises
        try {
          const distinctExIds = Array.from(new Set(sanitizedLogs.map((l) => l.exercise_id).filter(Boolean))) as string[];
          const { data: validExs } = await supabase
            .from('workout_exercises')
            .select('id')
            .in('id', distinctExIds);

          const validSet = new Set((validExs || []).map((e) => e.id));
          const filteredLogs = sanitizedLogs.filter((l) => l.exercise_id && validSet.has(l.exercise_id));

          if (filteredLogs.length > 0) {
            const retryRes = await supabase
              .from('exercise_logs')
              .insert(filteredLogs)
              .select();

            if (!retryRes.error) {
              console.log('[saveExerciseLogs] Salvataggio parziale riuscito su esercizi validi:', retryRes.data?.length);
              return { success: true };
            }
          }
        } catch (retryErr) {
          console.warn('[saveExerciseLogs] Fallito retry su esercizi validi:', retryErr);
        }

        console.error('[CRITICAL] saveExerciseLogs errore Supabase:', {
          message: error.message,
          code: error.code,
          details: error.details,
          payload: sanitizedLogs,
        });
        return { success: false, error: error.message };
      }

      console.log('[saveExerciseLogs] Successo:', {
        righe_inserite: insertedRows?.length ?? 0,
        ids: insertedRows?.map((r) => r.id),
      });
      return { success: true };
    } catch (error: unknown) {
      const msg = extractErrorMessage(error);
      console.error('[CRITICAL] saveExerciseLogs exception:', msg, error);
      return { success: false, error: msg };
    }
  };


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
          getWorkoutSnapshots,
          restoreWorkoutSnapshot,
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
