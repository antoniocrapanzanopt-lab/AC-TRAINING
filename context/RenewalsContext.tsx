import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  AthleteRenewal,
  RenewalFormData,
  RenewalStatus,
  PaymentFrequency,
  PaymentMethod,
  RenewalType,
  SubscriptionPause,
  PauseExpiryOption,
  PauseInstallmentsOption,
} from '../types';
import { STORAGE_KEYS } from '../config/storageKeys';
import { getStorageItem, setStorageItem } from '../lib/storage';
import { useAthletes } from './AthletesContext';
import { useSubscriptions } from './SubscriptionsContext';
import { usePayments } from './PaymentsContext';
import { getLocalOwnerProfile } from '../lib/ownerProfile';
import { generateInstallments } from './SubscriptionsContext';

export interface ConfirmRenewalParams {
  renewalId: string;
  mode: 'extend' | 'new_subscription';
  packageId: string;
  packageName: string;
  startDate: string;
  endDate: string;
  listPrice: number;
  finalPrice: number;
  setupFee?: number;
  downPayment?: number;
  installmentsCount: number;
  firstInstallmentDate: string;
  paymentFrequency: PaymentFrequency;
  preferredPaymentMethod: PaymentMethod;
  renewalType: RenewalType;
  managerName: string;
  notes?: string;
}

export interface CreatePauseParams {
  subscriptionId: string;
  startDate: string;
  expectedEndDate: string;
  reason: string;
  authorizedBy: string;
  notes?: string;
  expiryOption: PauseExpiryOption;
  installmentsOption: PauseInstallmentsOption;
}

interface RenewalsContextType {
  renewals: AthleteRenewal[];
  pauses: SubscriptionPause[];
  isLoading: boolean;
  addRenewal: (data: RenewalFormData) => AthleteRenewal;
  updateRenewal: (id: string, updates: Partial<AthleteRenewal>) => boolean;
  updateRenewalStatus: (id: string, status: RenewalStatus, notes?: string) => boolean;
  confirmRenewal: (params: ConfirmRenewalParams) => boolean;
  deleteRenewal: (id: string) => boolean;
  createSubscriptionPause: (params: CreatePauseParams) => SubscriptionPause | null;
  endSubscriptionPause: (pauseId: string) => boolean;
  syncOwnerNameInRenewalsAndPauses: (oldOwnerName: string, newOwnerName: string) => void;
}

const RenewalsContext = createContext<RenewalsContextType | undefined>(undefined);

const buildDemoRenewals = (ownerName: string): AthleteRenewal[] => {
  const now = new Date();
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString();
  
  return [
    {
      id: `ren-${Date.now()}-1`,
      athleteId: 'athlete-demo-01',
      athleteName: 'Marco Bianchi',
      currentSubscriptionId: 'sub-demo-1',
      packageId: 'pkg-1',
      packageName: 'Abbonamento Annuale PRO',
      price: 600,
      coachName: ownerName,
      endDate: nextWeek,
      paymentStatus: 'regular',
      lastCommunicationDate: new Date(Date.now() - 2 * 86400000).toISOString(),
      nextActionDate: new Date(Date.now() + 1 * 86400000).toISOString(),
      nextActionNotes: 'Inviare proposta di rinnovo scontata del 10%',
      managerId: 'local-owner',
      managerName: ownerName,
      status: 'to_contact',
      notes: 'L\'atleta si dice molto soddisfatto del percorso di forza.',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: `ren-${Date.now()}-2`,
      athleteId: 'athlete-demo-02',
      athleteName: 'Giulia Esposito',
      currentSubscriptionId: 'sub-demo-2',
      packageId: 'pkg-2',
      packageName: 'Trimestrale Base',
      price: 150,
      coachName: ownerName,
      endDate: new Date(Date.now() + 3 * 86400000).toISOString(),
      paymentStatus: 'expiring',
      lastCommunicationDate: new Date(Date.now() - 5 * 86400000).toISOString(),
      nextActionDate: new Date(Date.now() + 2 * 86400000).toISOString(),
      nextActionNotes: 'Chiamata telefonica per proporre l\'annuale',
      managerId: 'local-owner',
      managerName: ownerName,
      status: 'contacted',
      notes: 'In attesa di decisione sulla rateizzazione.',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
  ];
};

export const RenewalsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [renewals, setRenewals] = useState<AthleteRenewal[]>([]);
  const [pauses, setPauses] = useState<SubscriptionPause[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { addTimelineEvent, updateAthleteStatus } = useAthletes();
  const { addSubscription, updateSubscription, subscriptions } = useSubscriptions();
  const { createInstallment, updatePaymentRecord, payments } = usePayments();

  useEffect(() => {
    const owner = getLocalOwnerProfile();
    const ownerName = owner?.fullName || 'Proprietario Demo';
    const savedRenewals = getStorageItem<AthleteRenewal[]>(STORAGE_KEYS.RENEWALS, []);
    const savedPauses = getStorageItem<SubscriptionPause[]>(STORAGE_KEYS.PAUSES, []);

    if (savedRenewals.length === 0) {
      const demo = buildDemoRenewals(ownerName);
      setStorageItem(STORAGE_KEYS.RENEWALS, demo);
      setRenewals(demo);
    } else {
      setRenewals(savedRenewals);
    }

    setPauses(savedPauses);
    setIsLoading(false);
  }, []);

  const persistRenewals = useCallback((data: AthleteRenewal[]) => {
    setRenewals(data);
    setStorageItem(STORAGE_KEYS.RENEWALS, data);
  }, []);

  const addRenewal = useCallback((data: RenewalFormData): AthleteRenewal => {
    const now = new Date().toISOString();
    const owner = getLocalOwnerProfile();

    const newRenewal: AthleteRenewal = {
      ...data,
      id: `ren-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      managerId: owner?.id || 'local-owner',
      managerName: owner?.fullName || 'Proprietario Demo',
      createdAt: now,
      updatedAt: now,
    };

    persistRenewals([newRenewal, ...renewals]);
    return newRenewal;
  }, [renewals, persistRenewals]);

  const updateRenewal = useCallback((id: string, updates: Partial<AthleteRenewal>): boolean => {
    let found = false;
    const updated = renewals.map(r => {
      if (r.id === id) {
        found = true;
        return { ...r, ...updates, updatedAt: new Date().toISOString() } as AthleteRenewal;
      }
      return r;
    });

    if (found) persistRenewals(updated);
    return found;
  }, [renewals, persistRenewals]);

  const updateRenewalStatus = useCallback((id: string, status: RenewalStatus, notes?: string): boolean => {
    let found = false;
    const updated = renewals.map(r => {
      if (r.id === id) {
        found = true;
        return {
          ...r,
          status,
          notes: notes !== undefined ? notes : r.notes,
          lastCommunicationDate: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as AthleteRenewal;
      }
      return r;
    });

    if (found) persistRenewals(updated);
    return found;
  }, [renewals, persistRenewals]);

  const confirmRenewal = useCallback((params: ConfirmRenewalParams): boolean => {
    const targetRenewal = renewals.find(r => r.id === params.renewalId);
    if (!targetRenewal) return false;

    const owner = getLocalOwnerProfile();
    const managerName = params.managerName || owner?.fullName || 'Proprietario Demo';
    const nowIso = new Date().toISOString();

    if (params.mode === 'extend') {
      const existingSub = subscriptions.find(s => s.id === targetRenewal.currentSubscriptionId);
      if (existingSub) {
        updateSubscription(existingSub.id, {
          endDate: new Date(params.endDate).toISOString(),
          finalPrice: existingSub.finalPrice + params.finalPrice,
        });
      }

      if (params.installmentsCount > 0) {
        const amountToFinance = params.finalPrice;
        const installments = generateInstallments(
          amountToFinance,
          params.installmentsCount,
          params.firstInstallmentDate,
          params.paymentFrequency
        );

        installments.forEach((inst, index) => {
          createInstallment({
            athleteId: targetRenewal.athleteId,
            athleteName: targetRenewal.athleteName,
            subscriptionId: targetRenewal.currentSubscriptionId,
            installmentId: inst.id,
            installmentNumber: (existingSub?.installments.length || 0) + index + 1,
            expectedAmount: inst.amount,
            dueDate: inst.dueDate,
            status: 'pending',
          });
        });
      }
    } else {
      const newSub = addSubscription({
        athleteId: targetRenewal.athleteId,
        athleteName: targetRenewal.athleteName,
        packageId: params.packageId,
        packageName: params.packageName,
        startDate: new Date(params.startDate).toISOString(),
        endDate: new Date(params.endDate).toISOString(),
        listPrice: params.listPrice,
        discountType: 'none',
        discountValue: 0,
        finalPrice: params.finalPrice,
        paymentFrequency: params.paymentFrequency,
        installmentsCount: params.installmentsCount,
        setupFee: params.setupFee || 0,
        preferredPaymentMethod: params.preferredPaymentMethod,
        renewalType: params.renewalType,
        toleranceDays: 5,
        firstInstallmentDate: new Date(params.firstInstallmentDate).toISOString(),
        notes: params.notes || `Rinnovo da abbonamento ${targetRenewal.currentSubscriptionId}`,
      });

      newSub.installments.forEach((inst, index) => {
        createInstallment({
          athleteId: newSub.athleteId,
          athleteName: newSub.athleteName,
          subscriptionId: newSub.id,
          installmentId: inst.id,
          installmentNumber: index + 1,
          expectedAmount: inst.amount,
          dueDate: inst.dueDate,
          status: 'pending',
        });
      });
    }

    const updatedRenewals = renewals.map(r => {
      if (r.id === params.renewalId) {
        return {
          ...r,
          status: 'renewed' as RenewalStatus,
          managerName,
          lastCommunicationDate: nowIso,
          updatedAt: nowIso,
        } as AthleteRenewal;
      }
      return r;
    });

    persistRenewals(updatedRenewals);

    updateAthleteStatus(targetRenewal.athleteId, 'active');
    addTimelineEvent(
      targetRenewal.athleteId,
      'subscription_renewed',
      'Rinnovo Confermato',
      `Rinnovo completato con pacchetto ${params.packageName}. Operatore: ${managerName}`
    );

    return true;
  }, [renewals, subscriptions, updateSubscription, addSubscription, createInstallment, persistRenewals, updateAthleteStatus, addTimelineEvent]);

  const deleteRenewal = useCallback((id: string): boolean => {
    const updated = renewals.filter(r => r.id !== id);
    if (updated.length !== renewals.length) {
      persistRenewals(updated);
      return true;
    }
    return false;
  }, [renewals, persistRenewals]);

  const createSubscriptionPause = useCallback((params: CreatePauseParams): SubscriptionPause | null => {
    const sub = subscriptions.find(s => s.id === params.subscriptionId);
    if (!sub) return null;

    const nowIso = new Date().toISOString();
    const owner = getLocalOwnerProfile();
    const authorizedBy = params.authorizedBy || owner?.fullName || 'Proprietario Demo';

    const startMs = new Date(params.startDate).getTime();
    const endMs = new Date(params.expectedEndDate).getTime();
    const pauseDays = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)));

    let newEndDate = sub.endDate;

    // 1. Opzioni Scadenza:
    // - 'extend': proroga la fine dell'abbonamento ed emette log/timeline
    // - 'unchanged': lascia la data originale (NESSUN LOG DI MODIFICA DATA SCRITTO!)
    if (params.expiryOption === 'extend') {
      const origEnd = new Date(sub.endDate);
      origEnd.setDate(origEnd.getDate() + pauseDays);
      newEndDate = origEnd.toISOString().slice(0, 10);

      updateSubscription(sub.id, {
        endDate: newEndDate,
        status: 'suspended',
        suspensionStartDate: params.startDate,
        suspensionEndDate: params.expectedEndDate,
      });

      addTimelineEvent(
        sub.athleteId,
        'other',
        'Proroga Scadenza per Pausa',
        `Scadenza abbonamento prorogata di ${pauseDays} giorni (nuova scadenza: ${newEndDate})`
      );
    } else {
      updateSubscription(sub.id, {
        status: 'suspended',
        suspensionStartDate: params.startDate,
        suspensionEndDate: params.expectedEndDate,
      });
    }

    // 2. Opzioni Rate:
    // - 'active': non cambia nulla (NESSUN LOG DI MODIFICA RATE SCRITTO)
    // - 'reschedule': sposta realmente dueDate delle rate non saldate ed emette audit log due_date_change via updatePaymentRecord
    // - 'suspend': imposta suspendedUntil e non le considera scadute durante la pausa
    const unpaidPayments = payments.filter(
      p => p.subscriptionId === sub.id && p.residualAmount > 0 && p.status !== 'cancelled' && p.status !== 'refunded'
    );

    if (params.installmentsOption === 'reschedule') {
      unpaidPayments.forEach(p => {
        const origDue = new Date(p.dueDate);
        origDue.setDate(origDue.getDate() + pauseDays);
        const newDueStr = origDue.toISOString().slice(0, 10);

        updatePaymentRecord(p.id, { dueDate: newDueStr });
      });

      addTimelineEvent(
        sub.athleteId,
        'other',
        'Riprogrammazione Rate in Pausa',
        `Date di scadenza delle rate aggiornate di ${pauseDays} giorni`
      );
    } else if (params.installmentsOption === 'suspend') {
      unpaidPayments.forEach(p => {
        updatePaymentRecord(p.id, { suspendedUntil: params.expectedEndDate });
      });

      addTimelineEvent(
        sub.athleteId,
        'other',
        'Sospensione Rate in Pausa',
        `Rate sospese temporaneamente fino al ${params.expectedEndDate}`
      );
    }

    const newPause: SubscriptionPause = {
      id: `pause-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      subscriptionId: sub.id,
      athleteId: sub.athleteId,
      athleteName: sub.athleteName,
      startDate: params.startDate,
      expectedEndDate: params.expectedEndDate,
      reason: params.reason,
      authorizedBy,
      notes: params.notes,
      expiryOption: params.expiryOption,
      installmentsOption: params.installmentsOption,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const updatedPauses = [newPause, ...pauses];
    setPauses(updatedPauses);
    setStorageItem(STORAGE_KEYS.PAUSES, updatedPauses);

    addTimelineEvent(
      sub.athleteId,
      'other',
      'Pausa Abbonamento Avviata',
      `Pausa avviata dal ${params.startDate} al ${params.expectedEndDate}. Motivo: ${params.reason}. Autorizzato da: ${authorizedBy}`
    );

    return newPause;
  }, [subscriptions, payments, pauses, updateSubscription, updatePaymentRecord, addTimelineEvent]);

  const endSubscriptionPause = useCallback((pauseId: string): boolean => {
    const pause = pauses.find(p => p.id === pauseId);
    if (!pause) return false;

    const nowIso = new Date().toISOString();
    const sub = subscriptions.find(s => s.id === pause.subscriptionId);

    if (sub) {
      updateSubscription(sub.id, {
        status: 'active',
        suspensionStartDate: undefined,
        suspensionEndDate: undefined,
      });
    }

    const pausedPayments = payments.filter(p => p.subscriptionId === pause.subscriptionId && p.suspendedUntil);
    pausedPayments.forEach(p => {
      updatePaymentRecord(p.id, { suspendedUntil: undefined });
    });

    const updatedPauses = pauses.map(p => {
      if (p.id === pauseId) {
        return { ...p, actualEndDate: nowIso, updatedAt: nowIso };
      }
      return p;
    });

    setPauses(updatedPauses);
    setStorageItem(STORAGE_KEYS.PAUSES, updatedPauses);

    addTimelineEvent(
      pause.athleteId,
      'other',
      'Pausa Abbonamento Conclusa',
      'Terminata la sospensione dell\'abbonamento. Ripristinati i normali calcoli delle scadenze.'
    );

    return true;
  }, [pauses, subscriptions, payments, updateSubscription, updatePaymentRecord, addTimelineEvent]);

  const syncOwnerNameInRenewalsAndPauses = useCallback((oldOwnerName: string, newOwnerName: string) => {
    setRenewals(prev => {
      const updated = prev.map(r => {
        if (r.managerName === oldOwnerName || r.coachName === oldOwnerName || r.managerId === 'local-owner') {
          return {
            ...r,
            managerName: newOwnerName,
            coachName: r.coachName === oldOwnerName ? newOwnerName : r.coachName,
            updatedAt: new Date().toISOString(),
          };
        }
        return r;
      });
      persistRenewals(updated);
      return updated;
    });

    setPauses(prev => {
      const updated = prev.map(p => {
        if (p.authorizedBy === oldOwnerName || p.authorizedBy === 'Proprietario Demo' || p.authorizedBy === 'Proprietario') {
          return {
            ...p,
            authorizedBy: newOwnerName,
            updatedAt: new Date().toISOString(),
          };
        }
        return p;
      });
      setStorageItem(STORAGE_KEYS.PAUSES, updated);
      return updated;
    });
  }, [persistRenewals]);

  return (
    <RenewalsContext.Provider
      value={{
        renewals,
        pauses,
        isLoading,
        addRenewal,
        updateRenewal,
        updateRenewalStatus,
        confirmRenewal,
        deleteRenewal,
        createSubscriptionPause,
        endSubscriptionPause,
        syncOwnerNameInRenewalsAndPauses,
      }}
    >
      {children}
    </RenewalsContext.Provider>
  );
};

export const useRenewals = (): RenewalsContextType => {
  const ctx = useContext(RenewalsContext);
  if (!ctx) {
    throw new Error('useRenewals deve essere usato all\'interno di un RenewalsProvider');
  }
  return ctx;
};
