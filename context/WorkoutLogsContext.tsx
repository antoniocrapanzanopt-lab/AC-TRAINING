import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { WorkoutSessionLog } from '../types';
import { STORAGE_KEYS } from '../config/storageKeys';
import { getStorageItem, setStorageItem } from '../lib/storage';

interface WorkoutLogsContextValue {
  logs: WorkoutSessionLog[];
  saveWorkoutLog: (log: Omit<WorkoutSessionLog, 'id' | 'completedAt'>) => WorkoutSessionLog;
  getLogsByAthlete: (athleteId: string) => WorkoutSessionLog[];
  deleteWorkoutLog: (id: string) => void;
}

const WorkoutLogsContext = createContext<WorkoutLogsContextValue | null>(null);

export const WorkoutLogsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [logs, setLogs] = useState<WorkoutSessionLog[]>(() => {
    return getStorageItem<WorkoutSessionLog[]>(STORAGE_KEYS.WORKOUT_LOGS, []);
  });

  useEffect(() => {
    setStorageItem(STORAGE_KEYS.WORKOUT_LOGS, logs);
  }, [logs]);

  const saveWorkoutLog = useCallback(
    (logData: Omit<WorkoutSessionLog, 'id' | 'completedAt'>): WorkoutSessionLog => {
      const now = new Date().toISOString();
      const newLog: WorkoutSessionLog = {
        ...logData,
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        completedAt: now,
      };

      setLogs((prev) => [newLog, ...prev]);
      return newLog;
    },
    []
  );

  const getLogsByAthlete = useCallback(
    (athleteId: string): WorkoutSessionLog[] => {
      return logs.filter((l) => l.athleteId === athleteId);
    },
    [logs]
  );

  const deleteWorkoutLog = useCallback((id: string) => {
    setLogs((prev) => prev.filter((l) => l.id !== id));
  }, []);

  return (
    <WorkoutLogsContext.Provider
      value={{ logs, saveWorkoutLog, getLogsByAthlete, deleteWorkoutLog }}
    >
      {children}
    </WorkoutLogsContext.Provider>
  );
};

export const useWorkoutLogs = (): WorkoutLogsContextValue => {
  const ctx = useContext(WorkoutLogsContext);
  if (!ctx) throw new Error('useWorkoutLogs must be used inside WorkoutLogsProvider');
  return ctx;
};
