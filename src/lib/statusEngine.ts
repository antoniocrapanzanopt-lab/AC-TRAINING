import {
  PaymentRecord,
  PaymentRecordStatus,
  AthleteSubscription,
  SubscriptionStatus,
  Athlete,
  AthletePaymentStatus,
  AthleteActivity,
} from '../types';

/**
 * Calcola i giorni interi mancanti o trascorsi rispetto a una data di destinazione.
 * @returns Valore positivo se nel futuro, 0 se oggi, negativo se nel passato (scaduto).
 */
export const getDaysRemaining = (targetDateIso: string, fromDateIso?: string): number => {
  const from = fromDateIso ? new Date(fromDateIso) : new Date();
  const target = new Date(targetDateIso);

  // Normalizza alle ore 00:00:00 per confrontare i giorni solari puri
  const fromMidnight = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const targetMidnight = new Date(target.getFullYear(), target.getMonth(), target.getDate());

  const diffMs = targetMidnight.getTime() - fromMidnight.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
};

export interface PaymentStatusCalculation {
  status: PaymentRecordStatus;
  reason: string;
  isOverdue: boolean;
  daysRemaining: number;
}

/**
 * Calcola deterministicamente lo stato di un pagamento e fornisce il motivo dettagliato.
 * NON modifica mai le rate 'cancelled' o 'refunded'.
 */
export const calculatePaymentStatus = (
  payment: PaymentRecord,
  referenceDateIso?: string
): PaymentStatusCalculation => {
  if (payment.status === 'cancelled') {
    return {
      status: 'cancelled',
      reason: 'Rata annullata manualmente',
      isOverdue: false,
      daysRemaining: 0,
    };
  }

  if (payment.status === 'refunded') {
    return {
      status: 'refunded',
      reason: 'Rata interamente rimborsata',
      isOverdue: false,
      daysRemaining: 0,
    };
  }

  if (payment.residualAmount <= 0) {
    return {
      status: 'paid',
      reason: 'Interamente saldato',
      isOverdue: false,
      daysRemaining: getDaysRemaining(payment.dueDate, referenceDateIso),
    };
  }

  // Se la rata è in pausa e la sospensione è tuttora attiva, NON considerare scaduta
  if (payment.suspendedUntil) {
    const pauseDays = getDaysRemaining(payment.suspendedUntil, referenceDateIso);
    if (pauseDays >= 0) {
      return {
        status: payment.paidAmount > 0 ? 'partial' : 'pending',
        reason: `Sospesa in pausa fino al ${new Date(payment.suspendedUntil).toLocaleDateString('it-IT')}`,
        isOverdue: false,
        daysRemaining: getDaysRemaining(payment.dueDate, referenceDateIso),
      };
    }
  }

  const days = getDaysRemaining(payment.dueDate, referenceDateIso);

  if (days < 0) {
    const absDays = Math.abs(days);
    return {
      status: payment.paidAmount > 0 ? 'partial' : 'pending',
      reason: `Scaduto da ${absDays} giorn${absDays === 1 ? 'o' : 'i'} (Residuo: ${payment.residualAmount.toFixed(2)}€)`,
      isOverdue: true,
      daysRemaining: days,
    };
  }

  if (days === 0) {
    return {
      status: payment.paidAmount > 0 ? 'partial' : 'pending',
      reason: `In scadenza oggi (Residuo: ${payment.residualAmount.toFixed(2)}€)`,
      isOverdue: false,
      daysRemaining: 0,
    };
  }

  if (payment.paidAmount > 0) {
    return {
      status: 'partial',
      reason: `Pagamento parziale (${payment.paidAmount.toFixed(2)}€ versati, scade tra ${days} giorn${days === 1 ? 'o' : 'i'})`,
      isOverdue: false,
      daysRemaining: days,
    };
  }

  return {
    status: 'pending',
    reason: `In attesa di saldo (scade tra ${days} giorn${days === 1 ? 'o' : 'i'})`,
    isOverdue: false,
    daysRemaining: days,
  };
};

export interface SubscriptionStatusCalculation {
  status: SubscriptionStatus;
  reason: string;
  daysRemaining: number;
}

/**
 * Calcola lo stato dell'abbonamento e il motivo del suo stato.
 */
export const calculateSubscriptionStatus = (
  subscription: AthleteSubscription,
  referenceDateIso?: string
): SubscriptionStatusCalculation => {
  if (subscription.status === 'cancelled') {
    return {
      status: 'cancelled',
      reason: 'Abbonamento annullato',
      daysRemaining: 0,
    };
  }

  if (subscription.status === 'suspended') {
    const days = getDaysRemaining(subscription.endDate, referenceDateIso);
    return {
      status: 'suspended',
      reason: 'Abbonamento in pausa/sospensione concordata',
      daysRemaining: days,
    };
  }

  const days = getDaysRemaining(subscription.endDate, referenceDateIso);

  if (days < 0) {
    const absDays = Math.abs(days);
    return {
      status: 'expired',
      reason: `Abbonamento scaduto da ${absDays} giorn${absDays === 1 ? 'o' : 'i'}`,
      daysRemaining: days,
    };
  }

  if (days === 0) {
    return {
      status: 'active',
      reason: 'L\'abbonamento scade oggi',
      daysRemaining: 0,
    };
  }

  if (days <= 7) {
    return {
      status: 'active',
      reason: `In scadenza a breve (${days} giorn${days === 1 ? 'o' : 'i'} rimast${days === 1 ? 'o' : 'i'})`,
      daysRemaining: days,
    };
  }

  return {
    status: 'active',
    reason: `Abbonamento attivo (${days} giorni rimasti)`,
    daysRemaining: days,
  };
};

/**
 * Calcola la situazione finanziaria globale dell'atleta.
 */
export const calculateAthleteFinancialStatus = (
  athleteId: string,
  athletePayments: PaymentRecord[],
  athleteSubscriptions: AthleteSubscription[]
): { paymentStatus: AthletePaymentStatus; reason: string } => {
  const myPayments = athletePayments.filter(p => p.athleteId === athleteId);
  const mySubs = athleteSubscriptions.filter(s => s.athleteId === athleteId);

  // 1. Controlla se ci sono rate scadute insolute
  const overduePayment = myPayments.find(p => {
    if (p.status === 'cancelled' || p.status === 'refunded') return false;
    const calc = calculatePaymentStatus(p);
    return calc.isOverdue;
  });

  if (overduePayment) {
    const calc = calculatePaymentStatus(overduePayment);
    return {
      paymentStatus: 'overdue',
      reason: `Presenti rate scadute: ${calc.reason}`,
    };
  }

  // 2. Controlla se ci sono rate in scadenza imminente (nei prossimi 7 giorni)
  const expiringPayment = myPayments.find(p => {
    if (p.status === 'cancelled' || p.status === 'refunded' || p.residualAmount <= 0) return false;
    const days = getDaysRemaining(p.dueDate);
    return days >= 0 && days <= 7;
  });

  if (expiringPayment) {
    const days = getDaysRemaining(expiringPayment.dueDate);
    return {
      paymentStatus: 'expiring',
      reason: `Rata in scadenza tra ${days} giorn${days === 1 ? 'o' : 'i'}`,
    };
  }

  // 3. Controlla abbonamenti attivi
  const activeSub = mySubs.find(s => s.status === 'active');
  if (activeSub) {
    return {
      paymentStatus: 'regular',
      reason: 'Pagamenti in regola e abbonamento attivo',
    };
  }

  return {
    paymentStatus: 'none',
    reason: 'Nessun abbonamento attivo registrato',
  };
};

export interface DeadlinesSummary {
  overduePayments: { payment: PaymentRecord; calc: PaymentStatusCalculation }[];
  expiringPayments: {
    today: { payment: PaymentRecord; calc: PaymentStatusCalculation }[];
    within7Days: { payment: PaymentRecord; calc: PaymentStatusCalculation }[];
    within15Days: { payment: PaymentRecord; calc: PaymentStatusCalculation }[];
    within30Days: { payment: PaymentRecord; calc: PaymentStatusCalculation }[];
  };
  expiringSubscriptions: {
    today: { subscription: AthleteSubscription; calc: SubscriptionStatusCalculation }[];
    within7Days: { subscription: AthleteSubscription; calc: SubscriptionStatusCalculation }[];
    within15Days: { subscription: AthleteSubscription; calc: SubscriptionStatusCalculation }[];
    within30Days: { subscription: AthleteSubscription; calc: SubscriptionStatusCalculation }[];
  };
  medicalCertificates: {
    expired: { athlete: Athlete; days: number }[];
    expiringSoon: { athlete: Athlete; days: number }[];
    missing: { athlete: Athlete }[];
  };
  expiredActivities: { activity: AthleteActivity; days: number }[];
}

export type MedicalCertificateStatus = 'valid' | 'expiring' | 'expired' | 'missing';

export const getMedicalCertificateStatus = (athlete: Athlete): MedicalCertificateStatus => {
  if (!athlete.medicalCertificateExpiryDate) return 'missing';
  const days = getDaysRemaining(athlete.medicalCertificateExpiryDate);
  if (days < 0) return 'expired';
  if (days <= 30) return 'expiring';
  return 'valid';
};

/**
 * Organizza e struttura tutte le scadenze del sistema per intervalli temporali.
 */
export const getDeadlinesSummary = (
  payments: PaymentRecord[],
  subscriptions: AthleteSubscription[],
  athletes: Athlete[],
  activities: AthleteActivity[] = []
): DeadlinesSummary => {
  // Pagamenti scaduti
  const overduePayments: DeadlinesSummary['overduePayments'] = [];
  
  // Pagamenti in scadenza
  const expiringPayments: DeadlinesSummary['expiringPayments'] = {
    today: [],
    within7Days: [],
    within15Days: [],
    within30Days: [],
  };

  payments.forEach(p => {
    if (p.status === 'cancelled' || p.status === 'refunded' || p.residualAmount <= 0) return;
    const calc = calculatePaymentStatus(p);
    
    if (calc.isOverdue) {
      overduePayments.push({ payment: p, calc });
    } else {
      if (calc.daysRemaining === 0) expiringPayments.today.push({ payment: p, calc });
      else if (calc.daysRemaining > 0 && calc.daysRemaining <= 7) expiringPayments.within7Days.push({ payment: p, calc });
      else if (calc.daysRemaining > 7 && calc.daysRemaining <= 15) expiringPayments.within15Days.push({ payment: p, calc });
      else if (calc.daysRemaining > 15 && calc.daysRemaining <= 30) expiringPayments.within30Days.push({ payment: p, calc });
    }
  });

  // Abbonamenti in scadenza
  const expiringSubscriptions: DeadlinesSummary['expiringSubscriptions'] = {
    today: [],
    within7Days: [],
    within15Days: [],
    within30Days: [],
  };

  subscriptions.forEach(s => {
    if (s.status === 'cancelled') return;
    const calc = calculateSubscriptionStatus(s);

    if (calc.daysRemaining === 0) expiringSubscriptions.today.push({ subscription: s, calc });
    else if (calc.daysRemaining > 0 && calc.daysRemaining <= 7) expiringSubscriptions.within7Days.push({ subscription: s, calc });
    else if (calc.daysRemaining > 7 && calc.daysRemaining <= 15) expiringSubscriptions.within15Days.push({ subscription: s, calc });
    else if (calc.daysRemaining > 15 && calc.daysRemaining <= 30) expiringSubscriptions.within30Days.push({ subscription: s, calc });
  });

  // Certificati medici
  const medicalCertificates: DeadlinesSummary['medicalCertificates'] = {
    expired: [],
    expiringSoon: [],
    missing: [],
  };

  athletes.forEach(a => {
    if (!a.medicalCertificateExpiryDate) {
      medicalCertificates.missing.push({ athlete: a });
    } else {
      const days = getDaysRemaining(a.medicalCertificateExpiryDate);
      if (days < 0) medicalCertificates.expired.push({ athlete: a, days });
      else if (days <= 30) medicalCertificates.expiringSoon.push({ athlete: a, days });
    }
  });

  // Attività scadute
  const expiredActivities: DeadlinesSummary['expiredActivities'] = activities
    .filter(act => act.status !== 'completed' && act.status !== 'cancelled' && getDaysRemaining(act.dueDate) < 0)
    .map(act => ({ activity: act, days: getDaysRemaining(act.dueDate) }));

  return {
    overduePayments,
    expiringPayments,
    expiringSubscriptions,
    medicalCertificates,
    expiredActivities,
  };
};

export interface RecalculationReport {
  timestamp: string;
  totalAthletesAnalysed: number;
  totalPaymentsAnalysed: number;
  totalSubscriptionsAnalysed: number;
  overduePaymentsCount: number;
  expiringSubscriptionsCount: number;
  expiredMedicalCount: number;
  summary: string;
}

/**
 * Ricalcola gli stati complessivi di pagamenti, abbonamenti ed atleti e restituisce un report sintetico.
 */
export const recalculateAllStatuses = (
  athletes: Athlete[],
  subscriptions: AthleteSubscription[],
  payments: PaymentRecord[]
): RecalculationReport => {
  const summaryData = getDeadlinesSummary(payments, subscriptions, athletes, []);

  return {
    timestamp: new Date().toISOString(),
    totalAthletesAnalysed: athletes.length,
    totalPaymentsAnalysed: payments.length,
    totalSubscriptionsAnalysed: subscriptions.length,
    overduePaymentsCount: summaryData.overduePayments.length,
    expiringSubscriptionsCount: 
      summaryData.expiringSubscriptions.today.length +
      summaryData.expiringSubscriptions.within7Days.length +
      summaryData.expiringSubscriptions.within15Days.length +
      summaryData.expiringSubscriptions.within30Days.length,
    expiredMedicalCount: summaryData.medicalCertificates.expired.length,
    summary: `Ricalcolo completato con successo. Analizzati ${athletes.length} atleti, ${subscriptions.length} abbonamenti e ${payments.length} rate di pagamento.`,
  };
};
