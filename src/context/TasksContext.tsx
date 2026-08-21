import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { AthleteTask, TaskFormData, TaskStatus } from '../types';
import { STORAGE_KEYS } from '../config/storageKeys';
import { getStorageItem, setStorageItem } from '../lib/storage';
import { useAthletes } from './AthletesContext';
import { useSubscriptions } from './SubscriptionsContext';
import { usePayments } from './PaymentsContext';
import { getLocalOwnerProfile } from '../lib/ownerProfile';
import { generateSystemAutomatedTasks } from '../lib/taskAutomations';

interface TasksContextType {
  tasks: AthleteTask[];
  isLoading: boolean;
  addTask: (data: TaskFormData) => AthleteTask;
  updateTask: (id: string, updates: Partial<AthleteTask>) => boolean;
  completeTask: (id: string) => boolean;
  rescheduleTask: (id: string, newDueDate: string) => boolean;
  cancelTask: (id: string) => boolean;
  duplicateTask: (id: string) => AthleteTask | null;
  deleteTask: (id: string) => boolean;
}

const TasksContext = createContext<TasksContextType | undefined>(undefined);

export const TasksProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customTasks, setCustomTasks] = useState<AthleteTask[]>([]);
  const [completedSystemTaskIds, setCompletedSystemTaskIds] = useState<Record<string, { completedAt: string }>>(() => {
    return getStorageItem<Record<string, { completedAt: string }>>('builder_completed_system_tasks', {});
  });
  const [dismissedSystemTaskIds, setDismissedSystemTaskIds] = useState<string[]>(() => {
    return getStorageItem<string[]>('builder_dismissed_system_tasks', []);
  });
  const [isLoading, setIsLoading] = useState(true);

  const { athletes, addTimelineEvent } = useAthletes();
  const { subscriptions } = useSubscriptions();
  const { payments } = usePayments();

  useEffect(() => {
    const saved = getStorageItem<AthleteTask[]>(STORAGE_KEYS.ACTIVITIES, []);

    // Filtra e bonifica eventuali residui demo non pertinenti
    const cleanTasks = saved.filter(
      (t) =>
        !t.id?.startsWith('task-demo-') &&
        !t.athleteId?.startsWith('athlete-demo-') &&
        t.athleteName !== 'Marco Bianchi' &&
        t.athleteName !== 'Giulia Esposito'
    );

    setCustomTasks(cleanTasks);
    setStorageItem(STORAGE_KEYS.ACTIVITIES, cleanTasks);
    setIsLoading(false);
  }, []);

  const persist = useCallback((data: AthleteTask[]) => {
    setCustomTasks(data);
    setStorageItem(STORAGE_KEYS.ACTIVITIES, data);
  }, []);

  // Generazione automatica deterministica dei task di sistema
  const systemTasks = useMemo(() => {
    return generateSystemAutomatedTasks({
      athletes,
      payments,
      subscriptions,
    });
  }, [athletes, payments, subscriptions]);

  // Unione dinamica di task manuali e task automatici
  const allTasks = useMemo(() => {
    const activeSystemTasks = systemTasks
      .filter((st) => !dismissedSystemTaskIds.includes(st.id))
      .map((st) => {
        const completion = completedSystemTaskIds[st.id];
        if (completion) {
          return {
            ...st,
            status: 'completed' as TaskStatus,
            completedAt: completion.completedAt,
          };
        }
        return st;
      });

    // Filtra duplicati se un task di sistema è stato sovrascritto/modificato nei customTasks
    const customIds = new Set(customTasks.map((t) => t.id));
    const nonOverriddenSystemTasks = activeSystemTasks.filter((st) => !customIds.has(st.id));

    return [...customTasks, ...nonOverriddenSystemTasks];
  }, [customTasks, systemTasks, completedSystemTaskIds, dismissedSystemTaskIds]);

  const addTask = useCallback(
    (data: TaskFormData): AthleteTask => {
      const nowIso = new Date().toISOString();
      const owner = getLocalOwnerProfile();

      const newTask: AthleteTask = {
        ...data,
        id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        assigneeId: data.assigneeId || owner?.id || 'local-owner',
        assigneeName: data.assigneeName || owner?.fullName || 'Proprietario Coach',
        origin: data.origin || 'manual',
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      const updated = [newTask, ...customTasks];
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
    },
    [customTasks, persist, addTimelineEvent]
  );

  const updateTask = useCallback(
    (id: string, updates: Partial<AthleteTask>): boolean => {
      let found = false;
      const nowIso = new Date().toISOString();

      // Controlla se è un task custom esistente
      const updated = customTasks.map((t) => {
        if (t.id === id) {
          found = true;
          return { ...t, ...updates, updatedAt: nowIso };
        }
        return t;
      });

      if (found) {
        persist(updated);
        return true;
      }

      // Se è un task di sistema che viene modificato per la prima volta, salvalo nei customTasks
      const sysTask = systemTasks.find((st) => st.id === id);
      if (sysTask) {
        const customized: AthleteTask = {
          ...sysTask,
          ...updates,
          updatedAt: nowIso,
        };
        persist([customized, ...customTasks]);
        return true;
      }

      return false;
    },
    [customTasks, systemTasks, persist]
  );

  const completeTask = useCallback(
    (id: string): boolean => {
      const nowIso = new Date().toISOString();

      // 1. Task custom
      let targetTask: AthleteTask | undefined;
      let foundInCustom = false;

      const updatedCustom = customTasks.map((t) => {
        if (t.id === id) {
          foundInCustom = true;
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

      if (foundInCustom && targetTask) {
        persist(updatedCustom);
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

      // 2. Task di sistema
      const sysTask = systemTasks.find((st) => st.id === id);
      if (sysTask) {
        const nextCompleted = {
          ...completedSystemTaskIds,
          [id]: { completedAt: nowIso },
        };
        setCompletedSystemTaskIds(nextCompleted);
        setStorageItem('builder_completed_system_tasks', nextCompleted);

        if (sysTask.athleteId) {
          addTimelineEvent(
            sysTask.athleteId,
            'other',
            'Attività di Sistema Completata',
            `Completata attività: "${sysTask.title}"`
          );
        }
        return true;
      }

      return false;
    },
    [customTasks, systemTasks, completedSystemTaskIds, persist, addTimelineEvent]
  );

  const rescheduleTask = useCallback(
    (id: string, newDueDate: string): boolean => {
      return updateTask(id, {
        dueDate: newDueDate,
        status: 'pending',
      });
    },
    [updateTask]
  );

  const cancelTask = useCallback(
    (id: string): boolean => {
      return updateTask(id, { status: 'cancelled' });
    },
    [updateTask]
  );

  const duplicateTask = useCallback(
    (id: string): AthleteTask | null => {
      const target = allTasks.find((t) => t.id === id);
      if (!target) return null;

      const { id: _id, createdAt: _c, updatedAt: _u, completedAt: _comp, ...formData } = target;
      const duplicatedData: TaskFormData = {
        ...formData,
        title: `${target.title} (Copia)`,
        status: 'pending',
        origin: 'manual',
      };

      return addTask(duplicatedData);
    },
    [allTasks, addTask]
  );

  const deleteTask = useCallback(
    (id: string): boolean => {
      // 1. Rimuovi dai customTasks se presente
      const filteredCustom = customTasks.filter((t) => t.id !== id);
      const wasInCustom = filteredCustom.length !== customTasks.length;
      if (wasInCustom) {
        persist(filteredCustom);
      }

      // 2. Se è un task di sistema, segna come dismesso
      if (id.startsWith('sys-')) {
        const nextDismissed = Array.from(new Set([...dismissedSystemTaskIds, id]));
        setDismissedSystemTaskIds(nextDismissed);
        setStorageItem('builder_dismissed_system_tasks', nextDismissed);
      }

      return true;
    },
    [customTasks, dismissedSystemTaskIds, persist]
  );

  return (
    <TasksContext.Provider
      value={{
        tasks: allTasks,
        isLoading,
        addTask,
        updateTask,
        completeTask,
        rescheduleTask,
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
    throw new Error("useTasks deve essere usato all'interno di un TasksProvider");
  }
  return ctx;
};
