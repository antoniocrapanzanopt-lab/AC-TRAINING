import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getStorageItem, setStorageItem } from '../lib/storage';
import { AthleteMetric, AthleteMaxLift, AthleteMetricInput, AthleteMaxLiftInput } from '../types/metrics';

interface MetricsContextType {
  metrics: AthleteMetric[];
  maxLifts: AthleteMaxLift[];
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
}

const MetricsContext = createContext<MetricsContextType | undefined>(undefined);

export const MetricsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [metrics, setMetrics] = useState<AthleteMetric[]>(() =>
    getStorageItem<AthleteMetric[]>('builder_athlete_metrics', [])
  );

  const [maxLifts, setMaxLifts] = useState<AthleteMaxLift[]>(() =>
    getStorageItem<AthleteMaxLift[]>('builder_athlete_max_lifts', [])
  );

  const [loading, setLoading] = useState(false);

  // Sincronizza lo stato da localStorage (utile per eventi inter-tab e aggiornamenti in tempo reale)
  const syncFromLocalStorage = useCallback(() => {
    const localMetrics = getStorageItem<AthleteMetric[]>('builder_athlete_metrics', []);
    const localLifts = getStorageItem<AthleteMaxLift[]>('builder_athlete_max_lifts', []);
    setMetrics(localMetrics);
    setMaxLifts(localLifts);
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
    if (weightKg <= 0 || reps <= 0) {
      return { isNewPR: false, calculated1RM: 0 };
    }

    const safeReps = Math.min(reps, 36);
    const raw1RM = reps === 1 ? weightKg : weightKg * (36 / (37 - safeReps));
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
        return { isNewPR: true, calculated1RM };
      }

      return { isNewPR: false, calculated1RM };
    } catch (err) {
      console.error('Errore durante il controllo del PR automatico:', err);
      return { isNewPR: false, calculated1RM };
    }
  };

  return (
    <MetricsContext.Provider
      value={{
        metrics,
        maxLifts,
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
