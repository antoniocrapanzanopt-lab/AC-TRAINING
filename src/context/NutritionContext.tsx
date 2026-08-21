import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  NutritionPlan,
  NutritionPlanStatus,
  NutritionRevision,
  AthleteNutritionCheckIn,
  NutritionCoachAlert,
  MacroValues,
  NutritionGoal,
} from '../types/nutrition';
import { STORAGE_KEYS } from '../config/storageKeys';
import { getStorageItem, setStorageItem } from '../lib/storage';
import { useAthletes } from './AthletesContext';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

interface NutritionContextType {
  plans: NutritionPlan[];
  checkIns: AthleteNutritionCheckIn[];
  isLoading: boolean;
  savePlan: (
    planData: Partial<NutritionPlan> & { athleteId: string; athleteName: string; targetKcal: number; proteinGrams: number; carbGrams: number; fatGrams: number; goal: NutritionGoal },
    revisionReason?: string,
    coachNote?: string
  ) => NutritionPlan;
  createPlanFromEstimator: (
    athleteId: string,
    athleteName: string,
    goal: NutritionGoal,
    targetKcal: number,
    macros: { proteinGrams: number; carbGrams: number; fatGrams: number },
    estimatorBasis?: NutritionPlan['estimatorBasis'],
    startDate?: string,
    reviewDate?: string,
    coachNotes?: string
  ) => NutritionPlan;
  updatePlanStatus: (planId: string, status: NutritionPlanStatus) => boolean;
  addRevision: (planId: string, newValues: MacroValues, reason: string, coachNote?: string) => boolean;
  submitCheckIn: (checkInData: Omit<AthleteNutritionCheckIn, 'id' | 'createdAt'>) => AthleteNutritionCheckIn;
  deleteCheckIn: (checkInId: string) => boolean;
  getAthleteActivePlan: (athleteId: string) => NutritionPlan | undefined;
  getAthletePlans: (athleteId: string) => NutritionPlan[];
  getAthleteCheckIns: (athleteId: string) => AthleteNutritionCheckIn[];
  getAthleteAlerts: (athleteId: string) => NutritionCoachAlert[];
  getAllAlerts: () => NutritionCoachAlert[];
}

const NutritionContext = createContext<NutritionContextType | undefined>(undefined);

export const NutritionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { athletes, addTimelineEvent } = useAthletes();
  const { user } = useAuth();

  const [plans, setPlans] = useState<NutritionPlan[]>([]);
  const [checkIns, setCheckIns] = useState<AthleteNutritionCheckIn[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Inizializzazione dati da storage e database Supabase
  useEffect(() => {
    const savedPlans = getStorageItem<NutritionPlan[]>(STORAGE_KEYS.NUTRITION_PLANS, []);
    const savedCheckIns = getStorageItem<AthleteNutritionCheckIn[]>(STORAGE_KEYS.NUTRITION_CHECKINS, []);

    setPlans(savedPlans);
    setCheckIns(savedCheckIns);

    // Carica da Supabase athlete_timeline eventi nutrizionali per idratazione cross-session
    supabase
      .from('athlete_timeline')
      .select('*')
      .eq('type', 'nutrition')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) {
          // Idratazione opzionale se storage locale vuoto
        }
      });

    setIsLoading(false);
  }, []);

  // Salvataggio su Storage
  const persistPlans = useCallback((newPlans: NutritionPlan[]) => {
    setPlans(newPlans);
    try {
      setStorageItem(STORAGE_KEYS.NUTRITION_PLANS, newPlans);
      window.dispatchEvent(new CustomEvent('nutrition_plans_updated'));
    } catch (err) {
      console.error('Errore salvataggio piani nutrizionali:', err);
    }
  }, []);

  const persistCheckIns = useCallback((newCheckIns: AthleteNutritionCheckIn[]) => {
    setCheckIns(newCheckIns);
    try {
      setStorageItem(STORAGE_KEYS.NUTRITION_CHECKINS, newCheckIns);
      window.dispatchEvent(new CustomEvent('nutrition_checkins_updated'));
    } catch (err) {
      console.error('Errore salvataggio check-in nutrizionali:', err);
    }
  }, []);

  // Sincronizzazione Realtime
  useEffect(() => {
    const handleSync = () => {
      const p = getStorageItem<NutritionPlan[]>(STORAGE_KEYS.NUTRITION_PLANS, []);
      const c = getStorageItem<AthleteNutritionCheckIn[]>(STORAGE_KEYS.NUTRITION_CHECKINS, []);
      setPlans(p);
      setCheckIns(c);
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('nutrition_plans_updated', handleSync);
    window.addEventListener('nutrition_checkins_updated', handleSync);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('nutrition_plans_updated', handleSync);
      window.removeEventListener('nutrition_checkins_updated', handleSync);
    };
  }, []);

  // Salva o aggiorna un piano nutrizionale con tracciamento revisione
  const savePlan = useCallback((
    planData: Partial<NutritionPlan> & { athleteId: string; athleteName: string; targetKcal: number; proteinGrams: number; carbGrams: number; fatGrams: number; goal: NutritionGoal },
    revisionReason?: string,
    coachNote?: string
  ): NutritionPlan => {
    const nowIso = new Date().toISOString();
    const existingIndex = planData.id ? plans.findIndex(p => p.id === planData.id) : -1;

    let savedPlan: NutritionPlan;

    if (existingIndex >= 0) {
      const existingPlan = plans[existingIndex];
      const hasMacroChanges = 
        existingPlan.targetKcal !== planData.targetKcal ||
        existingPlan.proteinGrams !== planData.proteinGrams ||
        existingPlan.carbGrams !== planData.carbGrams ||
        existingPlan.fatGrams !== planData.fatGrams;

      const newRevisions = [...(existingPlan.revisions || [])];

      if (hasMacroChanges || revisionReason) {
        const rev: NutritionRevision = {
          id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          planId: existingPlan.id,
          date: nowIso,
          oldValues: {
            targetKcal: existingPlan.targetKcal,
            proteinGrams: existingPlan.proteinGrams,
            carbGrams: existingPlan.carbGrams,
            fatGrams: existingPlan.fatGrams,
          },
          newValues: {
            targetKcal: planData.targetKcal,
            proteinGrams: planData.proteinGrams,
            carbGrams: planData.carbGrams,
            fatGrams: planData.fatGrams,
          },
          reason: revisionReason || 'Aggiornamento target nutrizionali',
          coachNote: coachNote || planData.coachNotes || existingPlan.coachNotes,
          author: user?.name || 'Coach',
        };
        newRevisions.unshift(rev);
      }

      savedPlan = {
        ...existingPlan,
        ...planData,
        revisions: newRevisions,
        updatedAt: nowIso,
      };

      const updatedPlans = [...plans];
      updatedPlans[existingIndex] = savedPlan;
      persistPlans(updatedPlans);
    } else {
      // Se si attiva un nuovo piano, archivia i vecchi piani attivi dello stesso atleta
      const athleteId = planData.athleteId;
      const otherPlans = plans.map(p => {
        if (p.athleteId === athleteId && p.status === 'active' && planData.status === 'active') {
          return { ...p, status: 'archived' as NutritionPlanStatus, updatedAt: nowIso };
        }
        return p;
      });

      savedPlan = {
        id: planData.id || `nutri-plan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        athleteId: planData.athleteId,
        athleteName: planData.athleteName,
        status: planData.status || 'active',
        goal: planData.goal || 'maintenance',
        targetKcal: planData.targetKcal,
        proteinGrams: planData.proteinGrams,
        carbGrams: planData.carbGrams,
        fatGrams: planData.fatGrams,
        startDate: planData.startDate || nowIso.slice(0, 10),
        reviewDate: planData.reviewDate,
        coachNotes: coachNote || planData.coachNotes,
        mode: planData.mode || 'auto',
        estimatorBasis: planData.estimatorBasis,
        revisions: [],
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      persistPlans([savedPlan, ...otherPlans]);
    }

    // Registra nella timeline dell'atleta
    addTimelineEvent(
      savedPlan.athleteId,
      'nutrition',
      `Piano Nutrizionale: ${savedPlan.targetKcal} kcal (${savedPlan.goal})`,
      `Target: P ${savedPlan.proteinGrams}g | C ${savedPlan.carbGrams}g | F ${savedPlan.fatGrams}g`,
      user?.id,
      user?.name,
      { planId: savedPlan.id, targetKcal: savedPlan.targetKcal }
    );

    return savedPlan;
  }, [plans, persistPlans, addTimelineEvent, user]);

  // Crea piano direttamente dal calcolatore/stima
  const createPlanFromEstimator = useCallback((
    athleteId: string,
    athleteName: string,
    goal: NutritionGoal,
    targetKcal: number,
    macros: { proteinGrams: number; carbGrams: number; fatGrams: number },
    estimatorBasis?: NutritionPlan['estimatorBasis'],
    startDate?: string,
    reviewDate?: string,
    coachNotes?: string
  ): NutritionPlan => {
    return savePlan({
      athleteId,
      athleteName,
      status: 'active',
      goal,
      targetKcal,
      proteinGrams: macros.proteinGrams,
      carbGrams: macros.carbGrams,
      fatGrams: macros.fatGrams,
      startDate: startDate || new Date().toISOString().slice(0, 10),
      reviewDate,
      coachNotes,
      mode: 'auto',
      estimatorBasis,
    }, 'Creazione piano da stima energetica iniziale');
  }, [savePlan]);

  // Cambia stato del piano
  const updatePlanStatus = useCallback((planId: string, status: NutritionPlanStatus): boolean => {
    const targetPlan = plans.find(p => p.id === planId);
    if (!targetPlan) return false;

    const nowIso = new Date().toISOString();
    const updated = plans.map(p => {
      if (p.id === planId) {
        return { ...p, status, updatedAt: nowIso };
      }
      // Se attivato, archivia gli altri piani dello stesso atleta
      if (status === 'active' && p.athleteId === targetPlan.athleteId && p.id !== planId && p.status === 'active') {
        return { ...p, status: 'archived' as NutritionPlanStatus, updatedAt: nowIso };
      }
      return p;
    });

    persistPlans(updated);
    return true;
  }, [plans, persistPlans]);

  // Aggiungi revisione manuale
  const addRevision = useCallback((
    planId: string,
    newValues: MacroValues,
    reason: string,
    coachNote?: string
  ): boolean => {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return false;

    savePlan({
      ...plan,
      targetKcal: newValues.targetKcal,
      proteinGrams: newValues.proteinGrams,
      carbGrams: newValues.carbGrams,
      fatGrams: newValues.fatGrams,
      coachNotes: coachNote || plan.coachNotes,
    }, reason, coachNote);

    return true;
  }, [plans, savePlan]);

  // Invia Check-in nutrizionale atleta
  const submitCheckIn = useCallback((checkInData: Omit<AthleteNutritionCheckIn, 'id' | 'createdAt'>): AthleteNutritionCheckIn => {
    const nowIso = new Date().toISOString();
    const newCheckIn: AthleteNutritionCheckIn = {
      ...checkInData,
      id: `chk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: nowIso,
    };

    const updated = [newCheckIn, ...checkIns];
    persistCheckIns(updated);

    // Registra nella timeline dell'atleta
    addTimelineEvent(
      checkInData.athleteId,
      'nutrition',
      `Check-in Nutrizione: ${checkInData.weightKg} kg (Aderenza: ${checkInData.adherenceScore}/5)`,
      `Fame: ${checkInData.hungerScore}/5 | Energia: ${checkInData.energyScore}/5 | Sonno: ${checkInData.sleepScore}/5`,
      user?.id,
      user?.name,
      { checkInId: newCheckIn.id, weightKg: newCheckIn.weightKg }
    );

    return newCheckIn;
  }, [checkIns, persistCheckIns, addTimelineEvent, user]);

  // Elimina check-in
  const deleteCheckIn = useCallback((checkInId: string): boolean => {
    const updated = checkIns.filter(c => c.id !== checkInId);
    persistCheckIns(updated);
    return true;
  }, [checkIns, persistCheckIns]);

  // Helpers query
  const getAthleteActivePlan = useCallback((athleteId: string): NutritionPlan | undefined => {
    return plans.find(p => p.athleteId === athleteId && p.status === 'active') ||
           plans.find(p => p.athleteId === athleteId);
  }, [plans]);

  const getAthletePlans = useCallback((athleteId: string): NutritionPlan[] => {
    return plans
      .filter(p => p.athleteId === athleteId)
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
  }, [plans]);

  const getAthleteCheckIns = useCallback((athleteId: string): AthleteNutritionCheckIn[] => {
    return checkIns
      .filter(c => c.athleteId === athleteId)
      .sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
  }, [checkIns]);

  // Alert intelligenti per il coach
  const getAthleteAlerts = useCallback((athleteId: string): NutritionCoachAlert[] => {
    const athlete = athletes.find(a => a.id === athleteId);
    const athleteName = athlete?.fullName || 'Atleta';
    const activePlan = plans.find(p => p.athleteId === athleteId && p.status === 'active');
    const athleteChks = checkIns
      .filter(c => c.athleteId === athleteId)
      .sort((a, b) => new Date(a.date || a.createdAt).getTime() - new Date(b.date || b.createdAt).getTime());

    const alerts: NutritionCoachAlert[] = [];
    const today = new Date().toISOString().slice(0, 10);

    // 1. Revisione piano in scadenza o scaduta
    if (activePlan?.reviewDate) {
      const reviewDate = new Date(activePlan.reviewDate);
      const diffDays = Math.round((reviewDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) {
        alerts.push({
          id: `alert-review-overdue-${athleteId}`,
          athleteId,
          athleteName,
          type: 'review_due',
          severity: 'warning',
          title: 'Revisione Piano Scaduta',
          description: `La revisione del piano nutrizionale era programmata per il ${activePlan.reviewDate} (${Math.abs(diffDays)} giorni fa).`,
          suggestedActions: ['modify_kcal', 'modify_macros', 'keep', 'contact_athlete'],
          createdAt: today,
        });
      } else if (diffDays <= 3) {
        alerts.push({
          id: `alert-review-due-${athleteId}`,
          athleteId,
          athleteName,
          type: 'review_due',
          severity: 'info',
          title: 'Revisione Piano Imminente',
          description: `La revisione del piano è prevista tra ${diffDays === 0 ? 'oggi' : `${diffDays} giorni`} (${activePlan.reviewDate}).`,
          suggestedActions: ['keep', 'modify_kcal', 'request_checkin'],
          createdAt: today,
        });
      }
    }

    // 2. Check-in mancato
    if (activePlan) {
      const lastCheckIn = athleteChks[athleteChks.length - 1];
      if (lastCheckIn) {
        const lastDate = new Date(lastCheckIn.date || lastCheckIn.createdAt);
        const daysSinceLast = Math.round((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceLast >= 10) {
          alerts.push({
            id: `alert-missed-checkin-${athleteId}`,
            athleteId,
            athleteName,
            type: 'missed_checkin',
            severity: 'warning',
            title: 'Check-in Nutrizionale Mancante',
            description: `Nessun check-in registrato negli ultimi ${daysSinceLast} giorni (ultimo: ${lastCheckIn.date}).`,
            suggestedActions: ['request_checkin', 'contact_athlete'],
            createdAt: today,
          });
        }
      } else {
        // Nessun check-in mai registrato
        alerts.push({
          id: `alert-no-checkin-${athleteId}`,
          athleteId,
          athleteName,
          type: 'missed_checkin',
          severity: 'info',
          title: 'Primo Check-in da Effettuare',
          description: `Il piano nutrizionale è attivo ma l'atleta non ha ancora inserito il primo check-in.`,
          suggestedActions: ['request_checkin', 'contact_athlete'],
          createdAt: today,
        });
      }
    }

    // Analisi ultimi check-in
    if (athleteChks.length >= 2) {
      const recent = athleteChks.slice(-3);
      const latest = recent[recent.length - 1];
      const prev = recent[recent.length - 2];

      // 3. Fame alta persistente
      if (recent.length >= 2 && recent.every(c => c.hungerScore >= 4)) {
        alerts.push({
          id: `alert-high-hunger-${athleteId}`,
          athleteId,
          athleteName,
          type: 'high_hunger',
          severity: 'alert',
          title: 'Livello di Fame Elevato Persistente',
          description: `L'atleta ha segnalato fame elevata (${latest.hungerScore}/5) negli ultimi check-in consecutivi.`,
          suggestedActions: ['modify_kcal', 'modify_macros', 'contact_athlete'],
          createdAt: today,
        });
      }

      // 4. Energia bassa
      if (recent.length >= 2 && recent.every(c => c.energyScore <= 2)) {
        alerts.push({
          id: `alert-low-energy-${athleteId}`,
          athleteId,
          athleteName,
          type: 'low_energy',
          severity: 'warning',
          title: 'Calo di Energia Segnalato',
          description: `Livello di energia basso (${latest.energyScore}/5). Potrebbe indicare deficit eccessivo o scarso recupero.`,
          suggestedActions: ['modify_kcal', 'modify_macros', 'contact_athlete'],
          createdAt: today,
        });
      }

      // 5. Aderenza scarsa
      if (latest.adherenceScore <= 2) {
        alerts.push({
          id: `alert-low-adherence-${athleteId}`,
          athleteId,
          athleteName,
          type: 'low_adherence',
          severity: 'warning',
          title: 'Aderenza Nutrizionale Scarsa',
          description: `L'atleta ha dichiarato difficoltà nel seguire il piano (Aderenza: ${latest.adherenceScore}/5).`,
          suggestedActions: ['contact_athlete', 'modify_macros', 'keep'],
          createdAt: today,
        });
      }

      // 6. Andamento peso troppo rapido (> 1.2 kg in 7 giorni)
      const daysDiff = Math.max(1, Math.round((new Date(latest.date).getTime() - new Date(prev.date).getTime()) / (1000 * 60 * 60 * 24)));
      if (daysDiff <= 10) {
        const weightDelta = latest.weightKg - prev.weightKg;
        if (Math.abs(weightDelta) >= 1.3) {
          alerts.push({
            id: `alert-rapid-weight-${athleteId}`,
            athleteId,
            athleteName,
            type: 'rapid_weight_change',
            severity: 'warning',
            title: `Variazione Peso Rapida (${weightDelta > 0 ? '+' : ''}${weightDelta.toFixed(1)} kg)`,
            description: `Variazione di ${Math.abs(weightDelta).toFixed(1)} kg in soli ${daysDiff} giorni. Valutare fluttuazioni idriche o target calorico.`,
            suggestedActions: ['keep', 'modify_kcal', 'request_checkin'],
            createdAt: today,
          });
        }
      }

      // 7. Peso fermo da 3+ check-in
      if (recent.length >= 3 && activePlan && (activePlan.goal === 'cutting' || activePlan.goal === 'bulking')) {
        const w1 = recent[0].weightKg;
        const w2 = recent[1].weightKg;
        const w3 = recent[2].weightKg;
        const maxDiff = Math.max(Math.abs(w3 - w1), Math.abs(w3 - w2), Math.abs(w2 - w1));
        if (maxDiff < 0.25) {
          alerts.push({
            id: `alert-weight-stall-${athleteId}`,
            athleteId,
            athleteName,
            type: 'weight_stall',
            severity: 'info',
            title: `Stallo del Peso (${activePlan.goal === 'cutting' ? 'Definizione' : 'Massa'})`,
            description: `Il peso è rimasto stabile a ~${w3.toFixed(1)} kg negli ultimi 3 check-in. Valutare se necessario un adattamento calorico.`,
            suggestedActions: ['modify_kcal', 'modify_macros', 'keep'],
            createdAt: today,
          });
        }
      }
    }

    return alerts;
  }, [athletes, plans, checkIns]);

  // Tutti gli alert complessivi per il coach
  const getAllAlerts = useCallback((): NutritionCoachAlert[] => {
    const all: NutritionCoachAlert[] = [];
    const athletesWithPlansOrChks = new Set([
      ...plans.map(p => p.athleteId),
      ...checkIns.map(c => c.athleteId),
    ]);

    athletesWithPlansOrChks.forEach(athId => {
      const athAlerts = getAthleteAlerts(athId);
      all.push(...athAlerts);
    });

    return all;
  }, [plans, checkIns, getAthleteAlerts]);

  const value = useMemo(() => ({
    plans,
    checkIns,
    isLoading,
    savePlan,
    createPlanFromEstimator,
    updatePlanStatus,
    addRevision,
    submitCheckIn,
    deleteCheckIn,
    getAthleteActivePlan,
    getAthletePlans,
    getAthleteCheckIns,
    getAthleteAlerts,
    getAllAlerts,
  }), [
    plans,
    checkIns,
    isLoading,
    savePlan,
    createPlanFromEstimator,
    updatePlanStatus,
    addRevision,
    submitCheckIn,
    deleteCheckIn,
    getAthleteActivePlan,
    getAthletePlans,
    getAthleteCheckIns,
    getAthleteAlerts,
    getAllAlerts,
  ]);

  return (
    <NutritionContext.Provider value={value}>
      {children}
    </NutritionContext.Provider>
  );
};

export const useNutrition = (): NutritionContextType => {
  const context = useContext(NutritionContext);
  if (!context) {
    throw new Error('useNutrition must be used within a NutritionProvider');
  }
  return context;
};
