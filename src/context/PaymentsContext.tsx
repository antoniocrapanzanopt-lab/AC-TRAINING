import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  PaymentRecord,
  FinancialAuditLog,
  PaymentRecordStatus,
  PaymentMethod,
  FinancialAuditAction,
} from '../types';
import { STORAGE_KEYS } from '../config/storageKeys';
import { getStorageItem, setStorageItem } from '../lib/storage';
import { useSubscriptions } from './SubscriptionsContext';
import { getLocalOwnerProfile } from '../lib/ownerProfile';

interface PaymentsContextType {
  payments: PaymentRecord[];
  auditLogs: FinancialAuditLog[];
  isLoading: boolean;
  createInstallment: (data: Partial<PaymentRecord>) => PaymentRecord;
  createPaymentRecord: (data: Partial<PaymentRecord>) => PaymentRecord;
  registerPayment: (id: string, amount: number, method: PaymentMethod, reference?: string) => boolean;
  refundPayment: (id: string, amount: number, reason: string) => boolean;
  cancelPayment: (id: string, reason: string) => boolean;
  deletePayment: (id: string, reason: string) => boolean;
  updatePaymentRecord: (id: string, updates: Partial<PaymentRecord>) => boolean;
  savePaymentRecord: (id: string, updates: Partial<PaymentRecord>) => boolean;
  addAuditLog: (entry: Omit<FinancialAuditLog, 'id' | 'timestamp'>) => void;
}

const PaymentsContext = createContext<PaymentsContextType | undefined>(undefined);

export const PaymentsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<FinancialAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { updateInstallmentStatus } = useSubscriptions();

  useEffect(() => {
    const savedPayments = getStorageItem<PaymentRecord[]>(STORAGE_KEYS.PAYMENTS, []) as PaymentRecord[];
    const savedLogs = getStorageItem<FinancialAuditLog[]>(STORAGE_KEYS.FINANCIAL_AUDIT, []) as FinancialAuditLog[];
    setPayments(savedPayments);
    setAuditLogs(savedLogs);
    setIsLoading(false);
  }, []);

  const persistPayments = useCallback((data: PaymentRecord[]) => {
    const dataRecords = data as PaymentRecord[];
    setPayments(dataRecords);
    setStorageItem(STORAGE_KEYS.PAYMENTS, dataRecords);
  }, []);

  const persistAudit = useCallback((data: FinancialAuditLog[]) => {
    const logsData = data as FinancialAuditLog[];
    setAuditLogs(logsData);
    setStorageItem(STORAGE_KEYS.FINANCIAL_AUDIT, logsData);
  }, []);

  const logAudit = useCallback((params: {
    paymentRecordId: string;
    athleteId?: string;
    athleteName?: string;
    subscriptionId?: string;
    action: FinancialAuditAction;
    previousValue?: string | number | null;
    newValue?: string | number | null;
    amount?: number;
    description: string;
  }) => {
    const owner = getLocalOwnerProfile();
    const newLog: FinancialAuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      paymentRecordId: params.paymentRecordId,
      athleteId: params.athleteId,
      athleteName: params.athleteName,
      subscriptionId: params.subscriptionId,
      action: params.action,
      previousValue: params.previousValue,
      newValue: params.newValue,
      amount: params.amount,
      description: params.description,
      authorId: owner?.id || 'unknown',
      authorName: owner?.fullName || 'Sistema',
      timestamp: new Date().toISOString(),
    };
    persistAudit([newLog, ...auditLogs] as FinancialAuditLog[]);
  }, [auditLogs, persistAudit]);

  const createInstallment = useCallback((data: Partial<PaymentRecord>): PaymentRecord => {
    const now = new Date().toISOString();
    const initialStatus: PaymentRecordStatus = data.status || 'pending';
    const newRecord: PaymentRecord = {
      id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      athleteId: data.athleteId || '',
      athleteName: data.athleteName || '',
      subscriptionId: data.subscriptionId,
      installmentId: data.installmentId,
      installmentNumber: data.installmentNumber,
      expectedAmount: data.expectedAmount || 0,
      paidAmount: data.paidAmount || 0,
      refundedAmount: 0,
      residualAmount: Math.max(0, (data.expectedAmount || 0) - (data.paidAmount || 0)),
      dueDate: data.dueDate || now,
      paymentDate: data.paymentDate,
      method: data.method,
      status: initialStatus,
      transactionReference: data.transactionReference,
      receiptNumber: data.receiptNumber || `REC-${Date.now().toString().slice(-6)}`,
      invoiceNumber: data.invoiceNumber,
      notes: data.notes,
      createdBy: 'system',
      updatedBy: 'system',
      createdAt: now,
      updatedAt: now,
    };
    
    persistPayments([...payments, newRecord] as PaymentRecord[]);
    logAudit({
      paymentRecordId: newRecord.id,
      athleteId: newRecord.athleteId,
      athleteName: newRecord.athleteName,
      subscriptionId: newRecord.subscriptionId,
      action: 'creation',
      previousValue: null,
      newValue: newRecord.expectedAmount,
      amount: newRecord.expectedAmount,
      description: 'Creazione rata prevista',
    });
    return newRecord;
  }, [payments, persistPayments, logAudit]);

  const registerPayment = useCallback((id: string, amount: number, method: PaymentMethod, reference?: string): boolean => {
    let targetPayment: PaymentRecord | null = null;
    let newStatus: PaymentRecordStatus = 'pending';

    const updated = payments.map(p => {
      if (p.id === id) {
        if (p.status === 'cancelled' || p.status === 'refunded') return p; // Non modificabili
        
        targetPayment = p;
        const newPaidAmount = p.paidAmount + amount;
        const residual = Math.max(0, p.expectedAmount - newPaidAmount);
        
        let calculatedStatus: PaymentRecordStatus = p.status;
        if (residual === 0) {
          calculatedStatus = 'paid';
        } else if (newPaidAmount > 0) {
          calculatedStatus = 'partial';
        } else {
          calculatedStatus = 'pending';
        }
        
        newStatus = calculatedStatus;

        return {
          ...p,
          paidAmount: newPaidAmount,
          residualAmount: residual,
          status: calculatedStatus,
          method,
          paymentDate: new Date().toISOString(),
          transactionReference: reference || p.transactionReference,
          updatedAt: new Date().toISOString(),
        } as PaymentRecord;
      }
      return p;
    });

    if (targetPayment) {
      const target = targetPayment as PaymentRecord;
      persistPayments(updated as PaymentRecord[]);
      
      const isPaidFull = (newStatus as PaymentRecordStatus) === 'paid';
      const action: FinancialAuditAction = isPaidFull ? 'full_payment' : 'partial_payment';
      
      logAudit({
        paymentRecordId: target.id,
        athleteId: target.athleteId,
        athleteName: target.athleteName,
        subscriptionId: target.subscriptionId,
        action,
        previousValue: target.paidAmount,
        newValue: target.paidAmount + amount,
        amount,
        description: `Registrato pagamento ${isPaidFull ? 'a saldo' : 'parziale'}`,
      });
      
      if (target.subscriptionId && target.installmentId) {
        const subStatus = isPaidFull ? 'paid' : 'pending';
        updateInstallmentStatus(target.subscriptionId, target.installmentId, subStatus, new Date().toISOString(), method);
      }
      return true;
    }
    return false;
  }, [payments, persistPayments, logAudit, updateInstallmentStatus]);

  const refundPayment = useCallback((id: string, amount: number, reason: string): boolean => {
    let targetPayment: PaymentRecord | null = null;
    let isFullRefund = false;

    const updated = payments.map(p => {
      if (p.id === id) {
        targetPayment = p;
        const newRefundedAmount = p.refundedAmount + amount;
        isFullRefund = newRefundedAmount >= p.paidAmount;

        const newStatus: PaymentRecordStatus = isFullRefund ? 'refunded' : p.status;

        return {
          ...p,
          refundedAmount: newRefundedAmount,
          status: newStatus,
          updatedAt: new Date().toISOString(),
        } as PaymentRecord;
      }
      return p;
    });

    if (targetPayment) {
      const target = targetPayment as PaymentRecord;
      persistPayments(updated as PaymentRecord[]);
      
      logAudit({
        paymentRecordId: target.id,
        athleteId: target.athleteId,
        athleteName: target.athleteName,
        subscriptionId: target.subscriptionId,
        action: 'refund',
        previousValue: target.refundedAmount,
        newValue: target.refundedAmount + amount,
        amount,
        description: `Rimborso ${isFullRefund ? 'totale' : 'parziale'}: ${reason}`,
      });
      
      if (isFullRefund && target.subscriptionId && target.installmentId) {
        updateInstallmentStatus(target.subscriptionId, target.installmentId, 'pending', undefined, undefined); // Torna da pagare
      }
      return true;
    }
    return false;
  }, [payments, persistPayments, logAudit, updateInstallmentStatus]);

  const cancelPayment = useCallback((id: string, reason: string): boolean => {
    let targetPayment: PaymentRecord | null = null;

    const updated = payments.map(p => {
      if (p.id === id) {
        targetPayment = p;
        return {
          ...p,
          status: 'cancelled' as PaymentRecordStatus,
          updatedAt: new Date().toISOString(),
        } as PaymentRecord;
      }
      return p;
    });

    if (targetPayment) {
      const target = targetPayment as PaymentRecord;
      persistPayments(updated as PaymentRecord[]);
      logAudit({
        paymentRecordId: target.id,
        athleteId: target.athleteId,
        athleteName: target.athleteName,
        subscriptionId: target.subscriptionId,
        action: 'cancellation',
        previousValue: target.status,
        newValue: 'cancelled',
        amount: 0,
        description: `Pagamento annullato: ${reason}`,
      });
      return true;
    }
    return false;
  }, [payments, persistPayments, logAudit]);

  const deletePayment = useCallback((id: string, reason: string): boolean => {
    const p = payments.find(pay => pay.id === id);
    if (!p) return false;

    const updated = payments.filter(pay => pay.id !== id);
    persistPayments(updated as PaymentRecord[]);
    logAudit({
      paymentRecordId: p.id,
      athleteId: p.athleteId,
      athleteName: p.athleteName,
      subscriptionId: p.subscriptionId,
      action: 'deletion',
      previousValue: p.expectedAmount,
      newValue: null,
      amount: p.paidAmount,
      description: `Record pagamento eliminato: ${reason}`,
    });
    
    // Se era collegato, rimettiamo in pending
    if (p.subscriptionId && p.installmentId) {
      updateInstallmentStatus(p.subscriptionId, p.installmentId, 'pending', undefined, undefined);
    }
    return true;
  }, [payments, persistPayments, logAudit, updateInstallmentStatus]);

  const updatePaymentRecord = useCallback((id: string, updates: Partial<PaymentRecord>): boolean => {
    let targetPayment: PaymentRecord | null = null;

    const updated = payments.map(p => {
      if (p.id === id) {
        targetPayment = p;
        const newExpected = updates.expectedAmount !== undefined ? updates.expectedAmount : p.expectedAmount;
        const newResidual = Math.max(0, newExpected - p.paidAmount);
        
        return {
          ...p,
          ...updates,
          expectedAmount: newExpected,
          residualAmount: newResidual,
          updatedAt: new Date().toISOString(),
        } as PaymentRecord;
      }
      return p;
    });

    if (targetPayment) {
      const target = targetPayment as PaymentRecord;
      persistPayments(updated as PaymentRecord[]);

      if (updates.expectedAmount !== undefined && updates.expectedAmount !== target.expectedAmount) {
        logAudit({
          paymentRecordId: target.id,
          athleteId: target.athleteId,
          athleteName: target.athleteName,
          subscriptionId: target.subscriptionId,
          action: 'amount_change',
          previousValue: target.expectedAmount,
          newValue: updates.expectedAmount,
          description: `Importo modificato da ${target.expectedAmount}€ a ${updates.expectedAmount}€`,
        });
      }

      if (updates.dueDate !== undefined && updates.dueDate !== target.dueDate) {
        logAudit({
          paymentRecordId: target.id,
          athleteId: target.athleteId,
          athleteName: target.athleteName,
          subscriptionId: target.subscriptionId,
          action: 'due_date_change',
          previousValue: target.dueDate,
          newValue: updates.dueDate,
          description: `Scadenza modificata a ${updates.dueDate}`,
        });
      }

      if (updates.status !== undefined && updates.status !== target.status) {
        logAudit({
          paymentRecordId: target.id,
          athleteId: target.athleteId,
          athleteName: target.athleteName,
          subscriptionId: target.subscriptionId,
          action: 'status_change',
          previousValue: target.status,
          newValue: updates.status,
          description: `Stato modificato da ${target.status} a ${updates.status}`,
        });
      }

      return true;
    }
    return false;
  }, [payments, persistPayments, logAudit]);

  return (
    <PaymentsContext.Provider
      value={{
        payments,
        auditLogs,
        isLoading,
        createInstallment,
        createPaymentRecord: createInstallment,
        registerPayment,
        refundPayment,
        cancelPayment,
        deletePayment,
        updatePaymentRecord,
        savePaymentRecord: updatePaymentRecord,
        addAuditLog: logAudit,
      }}
    >
      {children}
    </PaymentsContext.Provider>
  );
};

export const usePayments = (): PaymentsContextType => {
  const ctx = useContext(PaymentsContext);
  if (!ctx) {
    throw new Error('usePayments deve essere usato all\'interno di un PaymentsProvider');
  }
  return ctx;
};
