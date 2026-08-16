import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AthleteTask, TaskFormData, TaskStatus } from '../types';
import { STORAGE_KEYS } from '../config/storageKeys';
import { getStorageItem, setStorageItem } from '../lib/storage';
import { useAthletes } from './AthletesContext';
import { getLocalOwnerProfile } from '../lib/ownerProfile';

interface TasksContextType {
  tasks: AthleteTask[];
  isLoading: boolean;
  addTask: (data: TaskFormData) => AthleteTask;
  updateTask: (id: string, updates: Partial<AthleteTask>) => boolean;
  completeTask: (id: string) => boolean;
  cancelTask: (id: string) => boolean;
  duplicateTask: (id: string) => AthleteTask | null;
  deleteTask: (id: string) => boolean;
}

const TasksContext = createContext<TasksContextType | undefined>(undefined);

export const TasksProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<AthleteTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { addTimelineEvent } = useAthletes();

  useEffect(() => {
    const saved = getStorageItem<AthleteTask[]>(STORAGE_KEYS.ACTIVITIES, []);

    // Filtra e bonifica eventuali residui demo (Marco Bianchi / Giulia Esposito)
    const cleanTasks = saved.filter(t => 
      !t.id?.startsWith('task-demo-') &&
      !t.athleteId?.startsWith('athlete-demo-') &&
      t.athleteName !== 'Marco Bianchi' &&
      t.athleteName !== 'Giulia Esposito'
    );

    setTasks(cleanTasks);
    setStorageItem(STORAGE_KEYS.ACTIVITIES, cleanTasks);
    setIsLoading(false);
  }, []);

  const persist = useCallback((data: AthleteTask[]) => {
    setTasks(data);
    setStorageItem(STORAGE_KEYS.ACTIVITIES, data);
  }, []);

  const addTask = useCallback((data: TaskFormData): AthleteTask => {
    const nowIso = new Date().toISOString();
    const owner = getLocalOwnerProfile();

    const newTask: AthleteTask = {
      ...data,
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      assigneeId: data.assigneeId || owner?.id || 'local-owner',
      assigneeName: data.assigneeName || owner?.fullName || 'Proprietario Demo',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const updated = [newTask, ...tasks];
    persist(updated);

    if (newTask.athleteId) {
      addTimelineEvent(
        newTask.athleteId,
        'other',
        'Nuova Attività Pianificata',
        `Pianificata attività: "${newTask.title}" per il ${newTask.dueDate}`
      );
    }

    return newTask;
  }, [tasks, persist, addTimelineEvent]);

  const updateTask = useCallback((id: string, updates: Partial<AthleteTask>): boolean => {
    let found = false;
    const nowIso = new Date().toISOString();

    const updated = tasks.map(t => {
      if (t.id === id) {
        found = true;
        return { ...t, ...updates, updatedAt: nowIso };
      }
      return t;
    });

    if (found) persist(updated);
    return found;
  }, [tasks, persist]);

  const completeTask = useCallback((id: string): boolean => {
    const nowIso = new Date().toISOString();
    let targetTask: AthleteTask | undefined;

    const updated = tasks.map(t => {
      if (t.id === id) {
        targetTask = {
          ...t,
          status: 'completed' as TaskStatus,
          completedAt: nowIso,
          updatedAt: nowIso,
        };
        return targetTask;
      }
      return t;
    });

    if (targetTask) {
      persist(updated);

      if (targetTask.athleteId) {
        addTimelineEvent(
          targetTask.athleteId,
          'other',
          'Attività Completata',
          `Completata attività: "${targetTask.title}"`
        );
      }
      return true;
    }
    return false;
  }, [tasks, persist, addTimelineEvent]);

  const cancelTask = useCallback((id: string): boolean => {
    return updateTask(id, { status: 'cancelled' });
  }, [updateTask]);

  const duplicateTask = useCallback((id: string): AthleteTask | null => {
    const target = tasks.find(t => t.id === id);
    if (!target) return null;

    const { id: _id, createdAt: _c, updatedAt: _u, completedAt: _comp, ...formData } = target;
    const duplicatedData: TaskFormData = {
      ...formData,
      title: `${target.title} (Copia)`,
      status: 'pending',
    };

    return addTask(duplicatedData);
  }, [tasks, addTask]);

  const deleteTask = useCallback((id: string): boolean => {
    const updated = tasks.filter(t => t.id !== id);
    if (updated.length !== tasks.length) {
      persist(updated);
      return true;
    }
    return false;
  }, [tasks, persist]);

  return (
    <TasksContext.Provider
      value={{
        tasks,
        isLoading,
        addTask,
        updateTask,
        completeTask,
        cancelTask,
        duplicateTask,
        deleteTask,
      }}
    >
      {children}
    </TasksContext.Provider>
  );
};

export const useTasks = (): TasksContextType => {
  const ctx = useContext(TasksContext);
  if (!ctx) {
    throw new Error('useTasks deve essere usato all\'interno di un TasksProvider');
  }
  return ctx;
};
