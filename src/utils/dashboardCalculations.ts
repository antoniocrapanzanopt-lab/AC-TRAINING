import { PaymentRecord, AthleteSubscription, PackageItem, AthleteRenewal, Athlete } from '../types';

export interface KPICalculationResult {
  collectedInPeriod: number;
  expectedRevenue: number;
  unpaidAmount: number;
  collectionRate: number; // in percentuale (0-100)
  averageValuePerAthlete: number; // ARPU
  renewalRate: number; // in percentuale (0-100)
  estimatedChurn: number; // in percentuale (0-100)
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
}

/**
 * Calcola l'incassato netto nel periodo (esclude pagamenti annullati o rimborsati completamente; detrae rimborsi parziali).
 */
export const calculateCollectedInPeriod = (
  payments: PaymentRecord[],
  startDate?: string,
  endDate?: string
): number => {
  return payments.reduce((sum, p) => {
    if (p.status === 'cancelled' || p.status === 'refunded') return sum;

    const dateToUse = p.paymentDate || p.paidDate || p.dueDate;
    if (startDate && dateToUse < startDate) return sum;
    if (endDate && dateToUse > endDate) return sum;

    const netPaid = Math.max(0, p.paidAmount - (p.refundedAmount || 0));
    return sum + netPaid;
  }, 0);
};

/**
 * Calcola le entrate previste nel periodo per contratti e rate non annullate/rimborsate.
 */
export const calculateExpectedRevenue = (
  payments: PaymentRecord[],
  startDate?: string,
  endDate?: string
): number => {
  return payments.reduce((sum, p) => {
    if (p.status === 'cancelled' || p.status === 'refunded') return sum;

    if (startDate && p.dueDate < startDate) return sum;
    if (endDate && p.dueDate > endDate) return sum;

    return sum + p.expectedAmount;
  }, 0);
};

/**
 * Calcola il totale degli insoluti/scaduti con residuo > 0.
 */
export const calculateUnpaidAmount = (
  payments: PaymentRecord[],
  startDate?: string,
  endDate?: string
): number => {
  return payments.reduce((sum, p) => {
    if (p.status === 'cancelled' || p.status === 'refunded' || p.residualAmount <= 0) return sum;

    if (startDate && p.dueDate < startDate) return sum;
    if (endDate && p.dueDate > endDate) return sum;

    return sum + p.residualAmount;
  }, 0);
};

/**
 * Calcola il tasso di incasso (% tra incassato netto ed entrate previste). Evita divisioni per zero.
 */
export const calculateCollectionRate = (
  payments: PaymentRecord[],
  startDate?: string,
  endDate?: string
): number => {
  const expected = calculateExpectedRevenue(payments, startDate, endDate);
  if (expected <= 0) return 0;

  const collected = calculateCollectedInPeriod(payments, startDate, endDate);
  const rate = (collected / expected) * 100;
  return Math.min(100, Math.max(0, parseFloat(rate.toFixed(1))));
};

/**
 * Calcola il valore medio per atleta (ARPU). Gestisce 0 atleti.
 */
export const calculateAverageValuePerAthlete = (
  totalCollected: number,
  activeAthletesCount: number
): number => {
  if (activeAthletesCount <= 0) return 0;
  return parseFloat((totalCollected / activeAthletesCount).toFixed(2));
};

/**
 * Calcola il tasso di rinnovo (% trattative rinnovate/confermate su totale trattative concluse).
 */
export const calculateRenewalRate = (
  renewals: AthleteRenewal[],
  startDate?: string,
  endDate?: string
): number => {
  const filtered = renewals.filter(r => {
    if (startDate && r.endDate < startDate) return false;
    if (endDate && r.endDate > endDate) return false;
    return true;
  });

  const concluded = filtered.filter(r => ['renewed', 'confirmed', 'not_renewed'].includes(r.status));
  if (concluded.length === 0) return 0;

  const successful = concluded.filter(r => r.status === 'renewed' || r.status === 'confirmed').length;
  const rate = (successful / concluded.length) * 100;
  return parseFloat(rate.toFixed(1));
};

/**
 * Calcola il tasso di churn stimato (% atleti diventati inattivi, archiviati o non rinnovati).
 */
export const calculateEstimatedChurn = (
  athletes: Athlete[],
  renewals: AthleteRenewal[],
  startDate?: string,
  endDate?: string
): number => {
  if (athletes.length === 0) return 0;

  const inactiveCount = athletes.filter(a => a.status === 'inactive' || a.status === 'archived').length;
  
  const filteredRenewals = renewals.filter(r => {
    if (startDate && r.endDate < startDate) return false;
    if (endDate && r.endDate > endDate) return false;
    return true;
  });
  const notRenewedCount = filteredRenewals.filter(r => r.status === 'not_renewed').length;

  const churnedTotal = inactiveCount + notRenewedCount;
  const rate = (churnedTotal / (athletes.length + notRenewedCount)) * 100;
  return Math.min(100, parseFloat(rate.toFixed(1)));
};

/**
 * Calcola il Monthly Recurring Revenue (MRR).
 * REGOLE:
 * - Soltanto per abbonamenti attivi (`status === 'active'`).
 * - ESCLUDE servizi singoli, carnet una tantum e consulenze (`paymentFrequency === 'single'`).
 * - Ripartisce la quota mensile equivalente per abbonamenti plurimensili o annuali.
 */
export const calculateMRR = (
  subscriptions: AthleteSubscription[],
  packages: PackageItem[]
): number => {
  const activeSubs = subscriptions.filter(s => s.status === 'active');

  const totalMRR = activeSubs.reduce((sum, sub) => {
    const pkg = packages.find(p => p.id === sub.packageId);
    
    // Esclusione carnet / servizi una tantum
    if (sub.paymentFrequency === 'single' || (pkg && pkg.paymentFrequency === 'single')) {
      return sum;
    }

    const price = sub.finalPrice;
    let monthlyEquivalent = 0;

    switch (sub.paymentFrequency) {
      case 'monthly':
        monthlyEquivalent = price;
        break;
      case 'quarterly':
        monthlyEquivalent = price / 3;
        break;
      case 'semiannual':
        monthlyEquivalent = price / 6;
        break;
      case 'annual':
        monthlyEquivalent = price / 12;
        break;
      case 'weekly':
        monthlyEquivalent = price * 4.33;
        break;
      default:
        // Se plurimensile ma con frequenza non definita, dividi per la durata in mesi
        if (pkg && pkg.durationUnit === 'months' && pkg.duration > 0) {
          monthlyEquivalent = price / pkg.duration;
        } else {
          monthlyEquivalent = price;
        }
    }

    return sum + monthlyEquivalent;
  }, 0);

  return parseFloat(totalMRR.toFixed(2));
};

/**
 * Calcola l'Annual Recurring Revenue (ARR = MRR * 12).
 */
export const calculateARR = (mrr: number): number => {
  return parseFloat((mrr * 12).toFixed(2));
};

/**
 * Restituisce formula e disclaimer esplicativo per i tooltip dei KPI.
 */
export const getKPIFormulaTooltip = (kpiKey: string): { formula: string; description: string; disclaimer: string } => {
  const disclaimer = 'Calcolo in tempo reale';

  switch (kpiKey) {
    case 'collectionRate':
      return {
        formula: '(Incassato Netto / Atteso) × 100',
        description: '% rate saldate su totale atteso.',
        disclaimer,
      };
    case 'averageValuePerAthlete':
      return {
        formula: 'Incassato / Atleti Attivi',
        description: 'Ricavo medio per atleta (ARPU).',
        disclaimer,
      };
    case 'renewalRate':
      return {
        formula: '(Rinnovi / Scadenze) × 100',
        description: '% contratti rinnovati alla scadenza.',
        disclaimer,
      };
    case 'estimatedChurn':
      return {
        formula: '(Inattivi / Totale) × 100',
        description: '% abbandoni e mancati rinnovi.',
        disclaimer,
      };
    case 'mrr':
      return {
        formula: 'Σ (Abbonamenti Attivi / Mesi)',
        description: 'Ricavo mensile ricorrente netto.',
        disclaimer,
      };
    case 'arr':
      return {
        formula: 'MRR × 12',
        description: 'Proiezione ricavo ricorrente annuale.',
        disclaimer,
      };
    default:
      return {
        formula: 'Calcolo algoritmico interno',
        description: 'Indicatore prestazionale.',
        disclaimer,
      };
  }
};
