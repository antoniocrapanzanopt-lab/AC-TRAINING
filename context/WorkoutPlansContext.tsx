import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { WorkoutPlan, WorkoutPlanFormData } from '../types';
import { STORAGE_KEYS } from '../config/storageKeys';
import { getStorageItem, setStorageItem } from '../lib/storage';

const DEFAULT_MASTER_TEMPLATES: WorkoutPlan[] = [
  {
    id: 'tpl-ppl-4d',
    name: 'Ipertrofia PPL + Upper (4 Giorni)',
    clientId: '',
    clientName: 'Modello Master',
    isMasterTemplate: true,
    category: 'Ipertrofia PPL 4gg',
    goal: 'ipertrofia',
    durationWeeks: 8,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 56 * 86400000).toISOString().slice(0, 10),
    notes: 'Modello master generico per incremento massa muscolare su frequenza 4 giorni.',
    isDemo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    days: [
      {
        id: 'day-ppl-1',
        label: 'Giorno 1 - Push Focus',
        order: 1,
        exercises: [
          {
            id: 'ex-1',
            exerciseId: 'ex-panca-piana',
            exerciseName: 'Panca Piana Bilanciere',
            primaryMuscle: 'pettorali',
            order: 1,
            params: { sets: 4, repsMin: 6, repsMax: 8, rir: 2, restSeconds: 120, tut: '3-0-1-0' },
            notes: 'Focus sul controllo della fase eccentrica',
          },
          {
            id: 'ex-2',
            exerciseId: 'ex-spinte-inclinata',
            exerciseName: 'Spinte Panca Inclinata Manubri',
            primaryMuscle: 'pettorali',
            order: 2,
            params: { sets: 3, repsMin: 8, repsMax: 10, rir: 2, restSeconds: 90, tut: '2-0-1-0' },
          },
          {
            id: 'ex-3',
            exerciseId: 'ex-lento-manubri',
            exerciseName: 'Military Press / Lento Manubri',
            primaryMuscle: 'spalle',
            order: 3,
            params: { sets: 3, repsMin: 8, repsMax: 10, rir: 2, restSeconds: 90, tut: '2-0-1-0' },
          },
          {
            id: 'ex-4',
            exerciseId: 'ex-french-press',
            exerciseName: 'French Press Cavi / Bilanciere EZ',
            primaryMuscle: 'tricipiti',
            order: 4,
            params: { sets: 3, repsMin: 10, repsMax: 12, rir: 1, restSeconds: 60, tut: '2-0-1-0' },
          },
        ],
      },
      {
        id: 'day-ppl-2',
        label: 'Giorno 2 - Pull Focus',
        order: 2,
        exercises: [
          {
            id: 'ex-5',
            exerciseId: 'ex-trazioni',
            exerciseName: 'Trazioni alla Sbarra / Lat Machine',
            primaryMuscle: 'dorso',
            order: 1,
            params: { sets: 4, repsMin: 6, repsMax: 8, rir: 2, restSeconds: 120, tut: '2-0-1-0' },
          },
          {
            id: 'ex-6',
            exerciseId: 'ex-rematore-bil',
            exerciseName: 'Rematore Bilanciere Busto Flesso',
            primaryMuscle: 'dorso',
            order: 2,
            params: { sets: 4, repsMin: 8, repsMax: 10, rir: 2, restSeconds: 90, tut: '2-0-1-0' },
          },
          {
            id: 'ex-7',
            exerciseId: 'ex-[curl-bicipiti]',
            exerciseName: 'Curl Bicipiti Manubri',
            primaryMuscle: 'bicipiti',
            order: 3,
            params: { sets: 3, repsMin: 10, repsMax: 12, rir: 1, restSeconds: 60, tut: '2-0-1-0' },
          },
        ],
      },
      {
        id: 'day-ppl-3',
        label: 'Giorno 3 - Legs Focus',
        order: 3,
        exercises: [
          {
            id: 'ex-8',
            exerciseId: 'ex-squat',
            exerciseName: 'Squat con Bilanciere',
            primaryMuscle: 'quadricipiti',
            order: 1,
            params: { sets: 4, repsMin: 6, repsMax: 8, rir: 2, restSeconds: 150, tut: '3-0-1-0' },
          },
          {
            id: 'ex-9',
            exerciseId: 'ex-stacco-rumeno',
            exerciseName: 'Stacco Rumeno Manubri/Bilanciere',
            primaryMuscle: 'femorali',
            order: 2,
            params: { sets: 3, repsMin: 8, repsMax: 10, rir: 2, restSeconds: 90, tut: '3-0-1-0' },
          },
          {
            id: 'ex-10',
            exerciseId: 'ex-hip-thrust',
            exerciseName: 'Hip Thrust con Bilanciere',
            primaryMuscle: 'glutei',
            order: 3,
            params: { sets: 4, repsMin: 10, repsMax: 12, rir: 1, restSeconds: 90, tut: '2-1-1-0' },
          },
        ],
      },
      {
        id: 'day-ppl-4',
        label: 'Giorno 4 - Upper Body',
        order: 4,
        exercises: [
          {
            id: 'ex-11',
            exerciseId: 'ex-panca-inclinata-bil',
            exerciseName: 'Panca Inclinata Bilanciere',
            primaryMuscle: 'pettorali',
            order: 1,
            params: { sets: 3, repsMin: 8, repsMax: 10, rir: 2, restSeconds: 90, tut: '2-0-1-0' },
          },
          {
            id: 'ex-12',
            exerciseId: 'ex-pulley',
            exerciseName: 'Pulley Basso Presa Stretta',
            primaryMuscle: 'dorso',
            order: 2,
            params: { sets: 3, repsMin: 8, repsMax: 10, rir: 2, restSeconds: 90, tut: '2-0-1-0' },
          },
          {
            id: 'ex-13',
            exerciseId: 'ex-alzate-laterali',
            exerciseName: 'Alzate Laterali ai Cavi',
            primaryMuscle: 'spalle',
            order: 3,
            params: { sets: 4, repsMin: 12, repsMax: 15, rir: 1, restSeconds: 60, tut: '2-0-1-0' },
          },
        ],
      },
    ],
  },
  {
    id: 'tpl-pb-forza',
    name: 'Powerbuilding Forza & Ipertrofia',
    clientId: '',
    clientName: 'Modello Master',
    isMasterTemplate: true,
    category: 'Powerbuilding Forza/Ipertrofia',
    goal: 'forza',
    durationWeeks: 6,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 42 * 86400000).toISOString().slice(0, 10),
    notes: 'Programma di forza sui fondamentali (Squat, Panca, Stacco) abbinato a complementari ad alto impatto ipertrofico.',
    isDemo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    days: [
      {
        id: 'day-pb-1',
        label: 'Giorno 1 - Panca & Upper Heavy',
        order: 1,
        exercises: [
          {
            id: 'ex-pb-1',
            exerciseId: 'ex-panca-piana',
            exerciseName: 'Panca Piana Bilanciere',
            primaryMuscle: 'pettorali',
            order: 1,
            params: { sets: 5, repsMin: 3, repsMax: 5, rir: 2, restSeconds: 180, tut: '2-0-1-0' },
            progressionSchemeId: 'prog-preset-1',
            progressionSchemeName: 'Progressione Lineare % 1RM',
          },
          {
            id: 'ex-pb-2',
            exerciseId: 'ex-rematore-pendlay',
            exerciseName: 'Pendlay Row con Bilanciere',
            primaryMuscle: 'dorso',
            order: 2,
            params: { sets: 4, repsMin: 6, repsMax: 8, rir: 2, restSeconds: 120, tut: '1-0-1-0' },
          },
        ],
      },
      {
        id: 'day-pb-2',
        label: 'Giorno 2 - Squat & Lower Focus',
        order: 2,
        exercises: [
          {
            id: 'ex-pb-3',
            exerciseId: 'ex-squat',
            exerciseName: 'Squat con Bilanciere',
            primaryMuscle: 'quadricipiti',
            order: 1,
            params: { sets: 5, repsMin: 3, repsMax: 5, rir: 2, restSeconds: 180, tut: '3-0-1-0' },
            progressionSchemeId: 'prog-preset-2',
            progressionSchemeName: 'Ramp 5RM + Backoff 3x5 @80%',
          },
          {
            id: 'ex-pb-4',
            exerciseId: 'ex-leg-press',
            exerciseName: 'Leg Press 45°',
            primaryMuscle: 'quadricipiti',
            order: 2,
            params: { sets: 3, repsMin: 10, repsMax: 12, rir: 2, restSeconds: 90, tut: '2-0-1-0' },
          },
        ],
      },
    ],
  },
  {
    id: 'tpl-calisthenics',
    name: 'Calisthenics Skill & Strength',
    clientId: '',
    clientName: 'Modello Master',
    isMasterTemplate: true,
    category: 'Calisthenics Skill & Strength',
    goal: 'forza',
    durationWeeks: 8,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 56 * 86400000).toISOString().slice(0, 10),
    notes: 'Programma a corpo libero avanzato focalizzato su dip zavorrati, trazioni zavorrate e propedeutiche di forza.',
    isDemo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    days: [
      {
        id: 'day-cal-1',
        label: 'Giorno 1 - Push & Dip Heavy',
        order: 1,
        exercises: [
          {
            id: 'ex-cal-1',
            exerciseId: 'ex-dip-zavorrati',
            exerciseName: 'Dip alle Parallelle Zavorrati',
            primaryMuscle: 'pettorali',
            order: 1,
            params: { sets: 4, repsMin: 4, repsMax: 6, rir: 2, restSeconds: 150, tut: '2-0-1-0' },
          },
        ],
      },
    ],
  },
  {
    id: 'tpl-conditioning',
    name: 'Conditioning & Fat Loss MetCon',
    clientId: '',
    clientName: 'Modello Master',
    isMasterTemplate: true,
    category: 'Conditioning & Fat Loss',
    goal: 'dimagrimento',
    durationWeeks: 4,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 28 * 86400000).toISOString().slice(0, 10),
    notes: 'Circuiti metabolic conditioning ad alta densità per la ricomposizione corporea e l addestramento cardiovascolare.',
    isDemo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    days: [
      {
        id: 'day-cond-1',
        label: 'Giorno 1 - Full Body MetCon',
        order: 1,
        exercises: [
          {
            id: 'ex-cond-1',
            exerciseId: 'ex-kettlebell-swing',
            exerciseName: 'Kettlebell Swing',
            primaryMuscle: 'full_body',
            order: 1,
            params: { sets: 4, repsMin: 15, repsMax: 20, rir: 1, restSeconds: 45, tut: '1-0-1-0' },
          },
        ],
      },
    ],
  },
];

// ─── Interfaccia Context ───────────────────────────────────────────────────────

interface WorkoutPlansContextValue {
  plans: WorkoutPlan[];
  editingPlan: WorkoutPlan | null;
  setEditingPlan: (plan: WorkoutPlan | null) => void;
  addPlan: (data: WorkoutPlanFormData) => WorkoutPlan;
  updatePlan: (id: string, data: WorkoutPlanFormData) => void;
  deletePlan: (id: string) => void;
  duplicatePlan: (id: string) => WorkoutPlan | null;
  getPlanById: (id: string) => WorkoutPlan | undefined;
  assignTemplateToAthletes: (
    templateId: string,
    athletes: { id: string; fullName: string }[],
    startDate: string
  ) => WorkoutPlan[];
}

const WorkoutPlansContext = createContext<WorkoutPlansContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const WorkoutPlansProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [plans, setPlans] = useState<WorkoutPlan[]>(() => {
    const stored = getStorageItem<WorkoutPlan[]>(STORAGE_KEYS.WORKOUT_PLANS, []);
    if (!stored || stored.length === 0) {
      setStorageItem(STORAGE_KEYS.WORKOUT_PLANS, DEFAULT_MASTER_TEMPLATES);
      return DEFAULT_MASTER_TEMPLATES;
    }
    return stored;
  });

  const [editingPlan, setEditingPlan] = useState<WorkoutPlan | null>(null);

  useEffect(() => {
    setStorageItem(STORAGE_KEYS.WORKOUT_PLANS, plans);
  }, [plans]);

  const addPlan = useCallback((data: WorkoutPlanFormData): WorkoutPlan => {
    const now = new Date().toISOString();
    const newPlan: WorkoutPlan = {
      ...data,
      id: `plan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      isDemo: false,
      createdAt: now,
      updatedAt: now,
    };
    setPlans((prev) => [newPlan, ...prev]);
    return newPlan;
  }, []);

  const updatePlan = useCallback((id: string, data: WorkoutPlanFormData) => {
    setPlans((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, ...data, updatedAt: new Date().toISOString() }
          : p
      )
    );
  }, []);

  const deletePlan = useCallback((id: string) => {
    setPlans((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const duplicatePlan = useCallback((id: string): WorkoutPlan | null => {
    const source = plans.find((p) => p.id === id);
    if (!source) return null;
    const now = new Date().toISOString();
    const copy: WorkoutPlan = {
      ...source,
      id: `plan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: `${source.name} (Copia)`,
      isDemo: false,
      createdAt: now,
      updatedAt: now,
    };
    setPlans((prev) => [copy, ...prev]);
    return copy;
  }, [plans]);

  const assignTemplateToAthletes = useCallback(
    (
      templateId: string,
      athletes: { id: string; fullName: string }[],
      startDate: string
    ): WorkoutPlan[] => {
      const template = plans.find((p) => p.id === templateId);
      if (!template) return [];

      const now = new Date().toISOString();
      const start = new Date(startDate);
      const end = new Date(start.getTime() + template.durationWeeks * 7 * 86400000);
      const endDateStr = end.toISOString().slice(0, 10);

      const assignedPlans: WorkoutPlan[] = athletes.map((a) => ({
        ...template,
        id: `plan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${a.id.slice(0, 4)}`,
        clientId: a.id,
        clientName: a.fullName,
        isMasterTemplate: false,
        startDate,
        endDate: endDateStr,
        isDemo: false,
        createdAt: now,
        updatedAt: now,
      }));

      setPlans((prev) => [...assignedPlans, ...prev]);
      return assignedPlans;
    },
    [plans]
  );

  const getPlanById = useCallback(
    (id: string): WorkoutPlan | undefined => plans.find((p) => p.id === id),
    [plans]
  );

  return (
    <WorkoutPlansContext.Provider
      value={{
        plans,
        editingPlan,
        setEditingPlan,
        addPlan,
        updatePlan,
        deletePlan,
        duplicatePlan,
        getPlanById,
        assignTemplateToAthletes,
      }}
    >
      {children}
    </WorkoutPlansContext.Provider>
  );
};

// ─── Hook ──────────────────────────────────────────────────────────────────────

export const useWorkoutPlans = (): WorkoutPlansContextValue => {
  const ctx = useContext(WorkoutPlansContext);
  if (!ctx) throw new Error('useWorkoutPlans must be used inside WorkoutPlansProvider');
  return ctx;
};
