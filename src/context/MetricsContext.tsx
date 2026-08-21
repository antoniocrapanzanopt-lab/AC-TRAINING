import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getStorageItem, setStorageItem } from '../lib/storage';
import {
  AthleteMetric,
  AthleteMaxLift,
  AthleteMetricInput,
  AthleteMaxLiftInput,
  AthleteCheckScheduleConfig,
  CheckScheduleState,
  AthleteProgressPhoto,
} from '../types/metrics';
import { STORAGE_KEYS } from '../config/storageKeys';

interface MetricsContextType {
  metrics: AthleteMetric[];
  maxLifts: AthleteMaxLift[];
  progressPhotos: AthleteProgressPhoto[];
  loading: boolean;
  fetchMetricsForAthlete: (athleteId: string) => Promise<AthleteMetric[]>;
  fetchAllMetrics: () => Promise<void>;
  addMetric: (metricData: AthleteMetricInput) => Promise<{ success: boolean; error?: string; data?: AthleteMetric }>;
  updateMetric: (id: string, metricData: Partial<AthleteMetricInput>) => Promise<{ success: boolean; error?: string }>;
  deleteMetric: (id: string) => Promise<{ success: boolean; error?: string }>;
  fetchMaxLiftsForAthlete: (athleteId: string) => Promise<AthleteMaxLift[]>;
  fetchAllMaxLifts: () => Promise<void>;
  addMaxLift: (liftData: AthleteMaxLiftInput) => Promise<{ success: boolean; error?: string; data?: AthleteMaxLift }>;
  deleteMaxLift: (id: string) => Promise<{ success: boolean; error?: string }>;
  checkAndUpdateAutoPR: (
    athleteId: string,
    exerciseId: string | null,
    exerciseName: string,
    weightKg: number,
    reps: number
  ) => Promise<{ isNewPR: boolean; calculated1RM: number }>;
  getAthleteSchedule: (athleteId: string) => AthleteCheckScheduleConfig;
  saveAthleteSchedule: (config: AthleteCheckScheduleConfig) => Promise<void>;
  getAthleteScheduleState: (athleteId: string, latestMetricDate?: string | null) => CheckScheduleState;
  addProgressPhoto: (photo: Omit<AthleteProgressPhoto, 'id' | 'created_at'>) => Promise<AthleteProgressPhoto>;
  getAthleteProgressPhotos: (athleteId: string) => AthleteProgressPhoto[];
  deleteProgressPhoto: (photoId: string) => Promise<void>;
}

const MetricsContext = createContext<MetricsContextType | undefined>(undefined);

export const MetricsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [metrics, setMetrics] = useState<AthleteMetric[]>(() =>
    getStorageItem<AthleteMetric[]>('builder_athlete_metrics', [])
  );

  const [maxLifts, setMaxLifts] = useState<AthleteMaxLift[]>(() =>
    getStorageItem<AthleteMaxLift[]>('builder_athlete_max_lifts', [])
  );

  const [checkSchedules, setCheckSchedules] = useState<Record<string, AthleteCheckScheduleConfig>>(() =>
    getStorageItem<Record<string, AthleteCheckScheduleConfig>>(STORAGE_KEYS.CHECK_SCHEDULES, {})
  );

  const [progressPhotos, setProgressPhotos] = useState<AthleteProgressPhoto[]>(() =>
    getStorageItem<AthleteProgressPhoto[]>(STORAGE_KEYS.PROGRESS_PHOTOS, [])
  );

  const [loading, setLoading] = useState(false);

  // Sincronizza lo stato da localStorage (utile per eventi inter-tab e aggiornamenti in tempo reale)
  const syncFromLocalStorage = useCallback(() => {
    const localMetrics = getStorageItem<AthleteMetric[]>('builder_athlete_metrics', []);
    const localLifts = getStorageItem<AthleteMaxLift[]>('builder_athlete_max_lifts', []);
    const localSchedules = getStorageItem<Record<string, AthleteCheckScheduleConfig>>(STORAGE_KEYS.CHECK_SCHEDULES, {});
    const localPhotos = getStorageItem<AthleteProgressPhoto[]>(STORAGE_KEYS.PROGRESS_PHOTOS, []);
    setMetrics(localMetrics);
    setMaxLifts(localLifts);
    setCheckSchedules(localSchedules);
    setProgressPhotos(localPhotos);
  }, []);

  // Ascolta eventi storage per aggiornare in tempo reale se il check viene fatto in un'altra scheda/finestra
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'builder_athlete_metrics' || e.key === 'builder_athlete_max_lifts') {
        syncFromLocalStorage();
      }
    };
    const handleCustomEvent = () => {
      syncFromLocalStorage();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('metrics_updated', handleCustomEvent);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('metrics_updated', handleCustomEvent);
    };
  }, [syncFromLocalStorage]);

  const notifyChange = () => {
    window.dispatchEvent(new Event('metrics_updated'));
  };

  // Carica TUTTE le metriche dal DB e le fonde con localStorage
  const fetchAllMetrics = useCallback(async (): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('athlete_metrics')
        .select('*')
        .order('date', { ascending: false });

      if (!error && data) {
        setMetrics(prev => {
          const localList = getStorageItem<AthleteMetric[]>('builder_athlete_metrics', prev);
          const map = new Map<string, AthleteMetric>();
          localList.forEach(m => map.set(m.id, m));
          (data as AthleteMetric[]).forEach(m => map.set(m.id, m));
          const merged = Array.from(map.values());
          setStorageItem('builder_athlete_metrics', merged);
          return merged;
        });
      }
    } catch (err) {
      console.warn('Eccezione in fetchAllMetrics:', err);
    }
  }, []);

  // Carica TUTTI i massimali dal DB e li fonde con localStorage
  const fetchAllMaxLifts = useCallback(async (): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('athlete_max_lifts')
        .select('*')
        .order('date', { ascending: false });

      if (!error && data) {
        setMaxLifts(prev => {
          const localList = getStorageItem<AthleteMaxLift[]>('builder_athlete_max_lifts', prev);
          const map = new Map<string, AthleteMaxLift>();
          localList.forEach(l => map.set(l.id, l));
          (data as AthleteMaxLift[]).forEach(l => map.set(l.id, l));
          const merged = Array.from(map.values());
          setStorageItem('builder_athlete_max_lifts', merged);
          return merged;
        });
      }
    } catch (err) {
      console.warn('Eccezione in fetchAllMaxLifts:', err);
    }
  }, []);

  useEffect(() => {
    fetchAllMetrics();
    fetchAllMaxLifts();
  }, [fetchAllMetrics, fetchAllMaxLifts]);

  // Carica le metriche di uno specifico atleta e fonde Supabase + localStorage
  const fetchMetricsForAthlete = useCallback(async (athleteId: string): Promise<AthleteMetric[]> => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('athlete_metrics')
        .select('*')
        .eq('athlete_id', athleteId)
        .order('date', { ascending: false });

      const remoteMetrics = (error ? [] : (data as AthleteMetric[])) || [];

      setMetrics(prev => {
        const localList = getStorageItem<AthleteMetric[]>('builder_athlete_metrics', prev);
        const map = new Map<string, AthleteMetric>();
        localList.forEach(m => map.set(m.id, m));
        remoteMetrics.forEach(m => map.set(m.id, m));
        const merged = Array.from(map.values());
        setStorageItem('builder_athlete_metrics', merged);
        return merged;
      });

      return remoteMetrics;
    } catch (err) {
      console.error('Errore in fetchMetricsForAthlete:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Inserisce una nuova misurazione (con persistenza sia remota che locale e notifica globale)
  const addMetric = async (metricData: AthleteMetricInput): Promise<{ success: boolean; error?: string; data?: AthleteMetric }> => {
    const newMetric: AthleteMetric = {
      id: `metric-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...metricData,
    };

    try {
      const { data, error } = await supabase
        .from('athlete_metrics')
        .insert([metricData])
        .select()
        .single();

      if (!error && data) {
        newMetric.id = data.id;
      } else if (error) {
        console.warn('Supabase insert warning (mantenuto in locale):', error.message);
      }
    } catch (err) {
      console.warn('Eccezione inserimento remoto metriche (mantenuto in locale):', err);
    }

    setMetrics(prev => {
      const updated = [newMetric, ...prev.filter(m => m.id !== newMetric.id)];
      setStorageItem('builder_athlete_metrics', updated);
      return updated;
    });

    notifyChange();
    return { success: true, data: newMetric };
  };

  // Aggiorna una misurazione esistente
  const updateMetric = async (id: string, metricData: Partial<AthleteMetricInput>): Promise<{ success: boolean; error?: string }> => {
    try {
      await supabase
        .from('athlete_metrics')
        .update({ ...metricData, updated_at: new Date().toISOString() })
        .eq('id', id);
    } catch (err) {
      console.warn('Aggiornamento remoto fallito, aggiornato in locale:', err);
    }

    setMetrics(prev => {
      const updated = prev.map(m => (m.id === id ? { ...m, ...metricData } : m));
      setStorageItem('builder_athlete_metrics', updated);
      return updated;
    });

    notifyChange();
    return { success: true };
  };

  // Elimina una misurazione
  const deleteMetric = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await supabase
        .from('athlete_metrics')
        .delete()
        .eq('id', id);
    } catch (err) {
      console.warn('Eliminazione remota fallita, rimosso da locale:', err);
    }

    setMetrics(prev => {
      const updated = prev.filter(m => m.id !== id);
      setStorageItem('builder_athlete_metrics', updated);
      return updated;
    });

    notifyChange();
    return { success: true };
  };

  // Carica i massimali di uno specifico atleta e fonde Supabase + localStorage
  const fetchMaxLiftsForAthlete = useCallback(async (athleteId: string): Promise<AthleteMaxLift[]> => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('athlete_max_lifts')
        .select('*')
        .eq('athlete_id', athleteId)
        .order('date', { ascending: false });

      const remoteLifts = (error ? [] : (data as AthleteMaxLift[])) || [];

      setMaxLifts(prev => {
        const localList = getStorageItem<AthleteMaxLift[]>('builder_athlete_max_lifts', prev);
        const map = new Map<string, AthleteMaxLift>();
        localList.forEach(l => map.set(l.id, l));
        remoteLifts.forEach(l => map.set(l.id, l));
        const merged = Array.from(map.values());
        setStorageItem('builder_athlete_max_lifts', merged);
        return merged;
      });

      return remoteLifts;
    } catch (err) {
      console.error('Errore in fetchMaxLiftsForAthlete:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Inserisce un nuovo massimale
  const addMaxLift = async (liftData: AthleteMaxLiftInput): Promise<{ success: boolean; error?: string; data?: AthleteMaxLift }> => {
    const newLift: AthleteMaxLift = {
      id: `lift-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      created_at: new Date().toISOString(),
      ...liftData,
    };

    try {
      const { data, error } = await supabase
        .from('athlete_max_lifts')
        .insert([liftData])
        .select()
        .single();

      if (!error && data) {
        newLift.id = data.id;
      } else if (error) {
        console.warn('Supabase insert max lift warning (mantenuto locale):', error.message);
      }
    } catch (err) {
      console.warn('Eccezione inserimento remoto massimale (mantenuto locale):', err);
    }

    setMaxLifts(prev => {
      const updated = [newLift, ...prev.filter(l => l.id !== newLift.id)];
      setStorageItem('builder_athlete_max_lifts', updated);
      return updated;
    });

    notifyChange();
    return { success: true, data: newLift };
  };

  // Elimina un massimale
  const deleteMaxLift = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await supabase
        .from('athlete_max_lifts')
        .delete()
        .eq('id', id);
    } catch (err) {
      console.warn('Eliminazione remota fallita, rimosso da locale:', err);
    }

    setMaxLifts(prev => {
      const updated = prev.filter(l => l.id !== id);
      setStorageItem('builder_athlete_max_lifts', updated);
      return updated;
    });

    notifyChange();
    return { success: true };
  };

  // Calcola e aggiorna automaticamente il PR (1RM) se supera il record dell'atleta
  const checkAndUpdateAutoPR = async (
    athleteId: string,
    exerciseId: string | null,
    exerciseName: string,
    weightKg: number,
    reps: number
  ): Promise<{ isNewPR: boolean; calculated1RM: number }> => {
    // Se le ripetizioni superano 15, la stima 1RM non è scientificamente affidabile
    if (weightKg <= 0 || reps <= 0 || reps > 15) {
      return { isNewPR: false, calculated1RM: reps === 1 ? weightKg : 0 };
    }

    const raw1RM = reps === 1 ? weightKg : weightKg * (36 / (37 - reps));
    const calculated1RM = Math.round(raw1RM * 10) / 10;

    try {
      const allLiftsForAthlete = maxLifts.filter(
        l => String(l.athlete_id) === String(athleteId) && l.exercise_name.toLowerCase() === exerciseName.trim().toLowerCase()
      );

      const topCalculated = allLiftsForAthlete.reduce((max, curr) => (curr.calculated_1rm > max ? curr.calculated_1rm : max), 0);

      if (calculated1RM > topCalculated) {
        const todayStr = new Date().toISOString().slice(0, 10);
        await addMaxLift({
          athlete_id: athleteId,
          exercise_id: exerciseId,
          exercise_name: exerciseName.trim(),
          weight_kg: weightKg,
          reps,
          calculated_1rm: calculated1RM,
          is_real_1rm: reps === 1,
          date: todayStr,
          notes: reps === 1 ? 'Nuovo 1RM Reale' : `Nuovo PR stimato (${weightKg}kg x ${reps} reps)`
        });

        // Notifica PR al coach con deduplicazione intelligente
        try {
          const { data: athData } = await supabase
            .from('athletes')
            .select('first_name, last_name, assigned_coach_id')
            .eq('id', athleteId)
            .maybeSingle();
          if (athData?.assigned_coach_id) {
            const athleteName = `${athData.first_name} ${athData.last_name}`.trim();
            const coachId = athData.assigned_coach_id;
            const newBody = `${exerciseName}: ${calculated1RM} kg 1RM (${weightKg}kg x ${reps} reps)`;
            const title = `🏆 Nuovo record personale di ${athleteName}!`;

            // Controlla se esiste già una notifica PR oggi per questo atleta ed esercizio
            const twelveHoursAgo = new Date(Date.now() - 12 * 3600000).toISOString();
            const { data: existingNotifs } = await supabase
              .from('coach_notifications')
              .select('id, body')
              .eq('coach_id', coachId)
              .eq('athlete_id', athleteId)
              .eq('type', 'new_pr')
              .gte('created_at', twelveHoursAgo)
              .ilike('body', `%${exerciseName}%`)
              .limit(1);

            if (existingNotifs && existingNotifs.length > 0) {
              // Aggiorna la notifica esistente senza crearne un duplicato
              await supabase
                .from('coach_notifications')
                .update({
                  body: newBody,
                  read_at: null, // riaccende la notifica col valore aggiornato
                })
                .eq('id', existingNotifs[0].id);
            } else {
              // Inserisci solo se non esiste già
              await supabase.from('coach_notifications').insert({
                coach_id: coachId,
                type: 'new_pr',
                title,
                body: newBody,
                athlete_id: athleteId,
                athlete_name: athleteName,
              });
            }
          }
        } catch (_) {}

        return { isNewPR: true, calculated1RM };
      }

      return { isNewPR: false, calculated1RM };
    } catch (err) {
      console.error('Errore durante il controllo del PR automatico:', err);
      return { isNewPR: false, calculated1RM };
    }
  };

  // ─── GESTIONE RITUALE CHECK MISURE & PROMEMORIA ───────────────────────

  const DEFAULT_REQUIRED_FIELDS = {
    weight: true,
    body_fat: false,
    neck: false,
    shoulders: false,
    chest: false,
    waist: true,
    hips: false,
    biceps: false,
    thighs: false,
    calves: false,
  };

  const DEFAULT_SCHEDULE = (athId: string): AthleteCheckScheduleConfig => ({
    athlete_id: athId,
    frequency_days: 7,
    preferred_day_of_week: 1, // Lunedì
    required_fields: { ...DEFAULT_REQUIRED_FIELDS },
    photo_requirement: 'optional',
    reminder_active: true,
    second_reminder_active: true,
    custom_notes_prompt: 'Come ti senti in questa fase? Segnala eventuali note su recupero o aderenza.',
    updated_at: new Date().toISOString(),
  });

  const getAthleteSchedule = useCallback((athId: string): AthleteCheckScheduleConfig => {
    if (!athId) return DEFAULT_SCHEDULE('');
    const saved = checkSchedules[athId];
    if (saved) return saved;
    return DEFAULT_SCHEDULE(athId);
  }, [checkSchedules]);

  const saveAthleteSchedule = useCallback(async (config: AthleteCheckScheduleConfig): Promise<void> => {
    setCheckSchedules(prev => {
      const updated = { ...prev, [config.athlete_id]: { ...config, updated_at: new Date().toISOString() } };
      setStorageItem(STORAGE_KEYS.CHECK_SCHEDULES, updated);
      return updated;
    });
    notifyChange();
  }, []);

  const getAthleteScheduleState = useCallback((athId: string, latestMetricDate?: string | null): CheckScheduleState => {
    const schedule = getAthleteSchedule(athId);
    const freq = schedule.frequency_days || 7;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!latestMetricDate) {
      return {
        status: 'due_today',
        statusLabel: 'Primo check progressi da effettuare',
        lastCheckDate: null,
        nextCheckDate: today.toISOString().slice(0, 10),
        daysDiff: 0,
        frequencyDays: freq,
        isOverdue: false,
        isDueToday: true,
      };
    }

    const lastDate = new Date(latestMetricDate);
    lastDate.setHours(0, 0, 0, 0);

    const nextCheck = new Date(lastDate);
    nextCheck.setDate(nextCheck.getDate() + freq);
    const nextCheckDateStr = nextCheck.toISOString().slice(0, 10);

    const diffTime = today.getTime() - lastDate.getTime();
    const daysSinceLast = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (daysSinceLast === 0) {
      return {
        status: 'completed',
        statusLabel: 'Check completato oggi',
        lastCheckDate: latestMetricDate,
        nextCheckDate: nextCheckDateStr,
        daysDiff: freq,
        frequencyDays: freq,
        isOverdue: false,
        isDueToday: false,
      };
    }

    if (daysSinceLast < freq) {
      const daysRemaining = freq - daysSinceLast;
      const dateFormatted = nextCheck.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'short' });
      return {
        status: 'scheduled',
        statusLabel: `Prossimo check: ${dateFormatted} (tra ${daysRemaining} ${daysRemaining === 1 ? 'giorno' : 'giorni'})`,
        lastCheckDate: latestMetricDate,
        nextCheckDate: nextCheckDateStr,
        daysDiff: daysRemaining,
        frequencyDays: freq,
        isOverdue: false,
        isDueToday: false,
      };
    }

    if (daysSinceLast === freq) {
      return {
        status: 'due_today',
        statusLabel: 'È il giorno del check progressi!',
        lastCheckDate: latestMetricDate,
        nextCheckDate: nextCheckDateStr,
        daysDiff: 0,
        frequencyDays: freq,
        isOverdue: false,
        isDueToday: true,
      };
    }

    const daysOverdue = daysSinceLast - freq;
    return {
      status: 'overdue',
      statusLabel: `Check in ritardo di ${daysOverdue} ${daysOverdue === 1 ? 'giorno' : 'giorni'}`,
      lastCheckDate: latestMetricDate,
      nextCheckDate: nextCheckDateStr,
      daysDiff: daysOverdue,
      frequencyDays: freq,
      isOverdue: true,
      isDueToday: false,
    };
  }, [getAthleteSchedule]);

  // ─── GESTIONE FOTO PROGRESSI ──────────────────────────────────────────

  const addProgressPhoto = useCallback(async (photoData: Omit<AthleteProgressPhoto, 'id' | 'created_at'>): Promise<AthleteProgressPhoto> => {
    const newPhoto: AthleteProgressPhoto = {
      ...photoData,
      id: 'photo_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      created_at: new Date().toISOString(),
    };

    setProgressPhotos(prev => {
      const updated = [newPhoto, ...prev];
      setStorageItem(STORAGE_KEYS.PROGRESS_PHOTOS, updated);
      return updated;
    });

    notifyChange();
    return newPhoto;
  }, []);

  const getAthleteProgressPhotos = useCallback((athId: string): AthleteProgressPhoto[] => {
    return progressPhotos.filter(p => p.athlete_id === athId);
  }, [progressPhotos]);

  const deleteProgressPhoto = useCallback(async (photoId: string): Promise<void> => {
    setProgressPhotos(prev => {
      const updated = prev.filter(p => p.id !== photoId);
      setStorageItem(STORAGE_KEYS.PROGRESS_PHOTOS, updated);
      return updated;
    });
    notifyChange();
  }, []);

  return (
    <MetricsContext.Provider
      value={{
        metrics,
        maxLifts,
        progressPhotos,
        loading,
        fetchMetricsForAthlete,
        fetchAllMetrics,
        addMetric,
        updateMetric,
        deleteMetric,
        fetchMaxLiftsForAthlete,
        fetchAllMaxLifts,
        addMaxLift,
        deleteMaxLift,
        checkAndUpdateAutoPR,
        getAthleteSchedule,
        saveAthleteSchedule,
        getAthleteScheduleState,
        addProgressPhoto,
        getAthleteProgressPhotos,
        deleteProgressPhoto,
      }}
    >
      {children}
    </MetricsContext.Provider>
  );
};

export const useMetrics = (): MetricsContextType => {
  const context = useContext(MetricsContext);
  if (!context) {
    throw new Error('useMetrics deve essere utilizzato all\'interno di un MetricsProvider');
  }
  return context;
};
