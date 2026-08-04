import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  AthleteSubscription,
  SubscriptionFormData,
  SubscriptionInstallment,
  SubscriptionStatus,
  PaymentFrequency,
} from '../types';
import { STORAGE_KEYS } from '../config/storageKeys';
import { getStorageItem, setStorageItem } from '../lib/storage';
import { useAthletes } from './AthletesContext';

// ─── Utility Generazione Rate ──────────────────────────────────────────────────

export const generateInstallments = (
  totalAmount: number,
  count: number,
  startDateStr: string,
  frequency: PaymentFrequency
): SubscriptionInstallment[] => {
  if (count <= 1) {
    return [{
      id: `inst-${Date.now()}-1`,
      dueDate: startDateStr,
      amount: totalAmount,
      status: 'pending',
    }];
  }

  const installments: SubscriptionInstallment[] = [];
  const baseAmount = Math.floor((totalAmount / count) * 100) / 100;
  let remaining = totalAmount;

  let currentDate = new Date(startDateStr);

  for (let i = 0; i < count; i++) {
    const isLast = i === count - 1;
    // L'ultima rata assorbe eventuali differenze di arrotondamento sui centesimi
    const amount = isLast ? Number(remaining.toFixed(2)) : baseAmount;
    remaining -= amount;

    installments.push({
      id: `inst-${Date.now()}-${i}`,
      dueDate: currentDate.toISOString(),
      amount: amount,
      status: 'pending',
    });

    // Calcola la data della prossima rata
    if (frequency === 'weekly') currentDate.setDate(currentDate.getDate() + 7);
    else if (frequency === 'monthly') currentDate.setMonth(currentDate.getMonth() + 1);
    else if (frequency === 'quarterly') currentDate.setMonth(currentDate.getMonth() + 3);
    else if (frequency === 'semiannual') currentDate.setMonth(currentDate.getMonth() + 6);
    else if (frequency === 'annual') currentDate.setFullYear(currentDate.getFullYear() + 1);
  }

  return installments;
};

// ─── Dati Dimostrativi ────────────────────────────────────────────────────────

const buildDemoSubscriptions = (): AthleteSubscription[] => {
  const now = new Date();
  const nextMonth = new Date();
  nextMonth.setMonth(now.getMonth() + 1);

  const sub1Total = 600;
  return [
    {
      id: `sub-${Date.now()}-1`,
      athleteId: 'demo-athlete-1', // IPOTETICO: l'atleta esiste nel AthletesContext
      athleteName: 'Mario Rossi',
      packageId: 'pkg-1',
      packageName: 'Abbonamento Annuale PRO',
      startDate: now.toISOString(),
      endDate: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).toISOString(),
      listPrice: sub1Total,
      discountType: 'none',
      discountValue: 0,
      finalPrice: sub1Total,
      paymentFrequency: 'monthly',
      installmentsCount: 12,
      setupFee: 50,
      installments: generateInstallments(sub1Total + 50, 12, now.toISOString(), 'monthly'),
      preferredPaymentMethod: 'card',
      renewalType: 'automatic',
      toleranceDays: 5,
      status: 'active',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }
  ];
};

// ─── Context ──────────────────────────────────────────────────────────────────

interface SubscriptionsContextType {
  subscriptions: AthleteSubscription[];
  isLoading: boolean;
  addSubscription: (data: SubscriptionFormData) => AthleteSubscription;
  updateSubscription: (id: string, data: Partial<AthleteSubscription>) => boolean;
  cancelSubscription: (id: string) => boolean;
  suspendSubscription: (id: string, endDate?: string) => boolean;
  renewSubscription: (id: string) => boolean;
  updateInstallmentStatus: (subId: string, installmentId: string, status: 'pending' | 'paid' | 'overdue', paidDate?: string, method?: string) => boolean;
}

const SubscriptionsContext = createContext<SubscriptionsContextType | undefined>(undefined);

export const SubscriptionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [subscriptions, setSubscriptions] = useState<AthleteSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Essendo il SubscriptionsProvider ANNIDATO dentro AthletesProvider (in App.tsx), possiamo usare useAthletes!
  const { updateAthleteStatus, updatePaymentStatus, addTimelineEvent } = useAthletes();

  useEffect(() => {
    const saved = getStorageItem<AthleteSubscription[]>(STORAGE_KEYS.SUBSCRIPTIONS, []);
    if (saved.length === 0) {
      const demo = buildDemoSubscriptions();
      setStorageItem(STORAGE_KEYS.SUBSCRIPTIONS, demo);
      setSubscriptions(demo);
    } else {
      setSubscriptions(saved);
    }
    setIsLoading(false);
  }, []);

  const persist = useCallback((data: AthleteSubscription[]) => {
    setSubscriptions(data);
    setStorageItem(STORAGE_KEYS.SUBSCRIPTIONS, data);
  }, []);

  const addSubscription = useCallback((data: SubscriptionFormData): AthleteSubscription => {
    const now = new Date().toISOString();
    
    // 1. Genera le rate
    const amountToFinance = data.finalPrice;
    const generatedInstallments = generateInstallments(
      amountToFinance,
      data.installmentsCount,
      data.firstInstallmentDate,
      data.paymentFrequency
    );

    const newSub: AthleteSubscription = {
      ...data,
      id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      installments: generatedInstallments,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    persist([newSub, ...subscriptions]);

    // 2. Aggiorna lo stato dell'atleta (Context incrociato)
    updateAthleteStatus(newSub.athleteId, 'active');
    updatePaymentStatus(newSub.athleteId, 'regular');
    addTimelineEvent(
      newSub.athleteId, 
      'subscription_created', 
      'Nuovo abbonamento creato', 
      `Pacchetto: ${newSub.packageName}`
    );

    return newSub;
  }, [subscriptions, persist, updateAthleteStatus, updatePaymentStatus, addTimelineEvent]);

  const updateSubscription = useCallback((id: string, data: Partial<AthleteSubscription>): boolean => {
    let found = false;
    const updated = subscriptions.map(sub => {
      if (sub.id === id) {
        found = true;
        // Se cambiano i dati che influenzano le rate (prezzo, numero rate, frequenza o data prima rata),
        // potremmo dover rigenerare le rate in futuro. Per ora modifichiamo solo i dati base.
        return { ...sub, ...data, updatedAt: new Date().toISOString() };
      }
      return sub;
    });
    if (found) persist(updated);
    return found;
  }, [subscriptions, persist]);

  const cancelSubscription = useCallback((id: string): boolean => {
    let athleteId = '';
    const updated = subscriptions.map(sub => {
      if (sub.id === id) {
        athleteId = sub.athleteId;
        return { ...sub, status: 'cancelled' as SubscriptionStatus, updatedAt: new Date().toISOString() };
      }
      return sub;
    });
    
    if (athleteId) {
      persist(updated);
      updateAthleteStatus(athleteId, 'inactive');
      addTimelineEvent(athleteId, 'other', 'Abbonamento annullato');
      return true;
    }
    return false;
  }, [subscriptions, persist, updateAthleteStatus, addTimelineEvent]);

  const suspendSubscription = useCallback((id: string, endDate?: string): boolean => {
    let athleteId = '';
    const updated = subscriptions.map(sub => {
      if (sub.id === id) {
        athleteId = sub.athleteId;
        return { 
          ...sub, 
          status: 'suspended' as SubscriptionStatus, 
          suspensionStartDate: new Date().toISOString(),
          suspensionEndDate: endDate,
          updatedAt: new Date().toISOString() 
        };
      }
      return sub;
    });

    if (athleteId) {
      persist(updated);
      updateAthleteStatus(athleteId, 'suspended');
      addTimelineEvent(athleteId, 'other', 'Abbonamento sospeso');
      return true;
    }
    return false;
  }, [subscriptions, persist, updateAthleteStatus, addTimelineEvent]);

  const renewSubscription = useCallback((id: string): boolean => {
    const sub = subscriptions.find(s => s.id === id);
    if (!sub) return false;

    // Qui andrebbe calcolata la nuova data fine basandosi sulla durata del pacchetto, ecc.
    // In questa demo base lo estendiamo di un anno.
    const newEnd = new Date(sub.endDate);
    newEnd.setFullYear(newEnd.getFullYear() + 1);

    const updated = subscriptions.map(s => {
      if (s.id === id) {
        return { 
          ...s, 
          status: 'active' as SubscriptionStatus, 
          endDate: newEnd.toISOString(),
          updatedAt: new Date().toISOString() 
        };
      }
      return s;
    });

    persist(updated);
    updateAthleteStatus(sub.athleteId, 'active');
    addTimelineEvent(sub.athleteId, 'subscription_renewed', 'Abbonamento rinnovato');
    return true;
  }, [subscriptions, persist, updateAthleteStatus, addTimelineEvent]);

  const updateInstallmentStatus = useCallback((subId: string, installmentId: string, status: 'pending' | 'paid' | 'overdue', paidDate?: string, method?: string) => {
    let found = false;
    const updated = subscriptions.map(sub => {
      if (sub.id === subId) {
        let changed = false;
        const newInstallments = sub.installments.map(inst => {
          if (inst.id === installmentId) {
            changed = true;
            return { ...inst, status, paidDate, paymentMethod: method as any };
          }
          return inst;
        });
        if (changed) {
          found = true;
          return { ...sub, installments: newInstallments, updatedAt: new Date().toISOString() };
        }
      }
      return sub;
    });

    if (found) persist(updated);
    return found;
  }, [subscriptions, persist]);

  return (
    <SubscriptionsContext.Provider
      value={{
        subscriptions,
        isLoading,
        addSubscription,
        updateSubscription,
        cancelSubscription,
        suspendSubscription,
        renewSubscription,
        updateInstallmentStatus,
      }}
    >
      {children}
    </SubscriptionsContext.Provider>
  );
};

export const useSubscriptions = (): SubscriptionsContextType => {
  const ctx = useContext(SubscriptionsContext);
  if (!ctx) {
    throw new Error('useSubscriptions deve essere usato all\'interno di un SubscriptionsProvider');
  }
  return ctx;
};
