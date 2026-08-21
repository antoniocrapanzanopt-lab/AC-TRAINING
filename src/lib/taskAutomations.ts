import { AthleteTask, TaskPriority, TaskCategory, Athlete, PaymentRecord, AthleteSubscription } from '../types';
import { getDaysRemaining } from './statusEngine';

export interface SystemAutomationContext {
  athletes: Athlete[];
  payments: PaymentRecord[];
  subscriptions: AthleteSubscription[];
  allAssignedWorkouts?: any[];
  nutritionPlans?: any[];
  workoutSessions?: any[];
}

/**
 * Genera in modo deterministico e idempotente le attività automatiche di sistema
 * basate sulle regole operative del coaching (check-in saltati, schede in scadenza,
 * certificati, pagamenti in ritardo, inattività).
 */
export function generateSystemAutomatedTasks(ctx: SystemAutomationContext): AthleteTask[] {
  const { athletes, payments, subscriptions, allAssignedWorkouts = [], nutritionPlans = [] } = ctx;
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const nowIso = now.toISOString();

  const systemTasks: AthleteTask[] = [];

  // 1. Certificati Medici in scadenza (entro 15gg) o già scaduti
  athletes.forEach((athlete) => {
    if (athlete.medicalCertificateExpiryDate) {
      const days = getDaysRemaining(athlete.medicalCertificateExpiryDate);
      if (days <= 15) {
        const isOverdue = days < 0;
        const safeName = athlete.fullName || `${athlete.firstName || ''} ${athlete.lastName || ''}`.trim() || 'Atleta';
        const priority: TaskPriority = isOverdue ? 'urgent' : days <= 5 ? 'high' : 'medium';
        const status = isOverdue ? 'overdue' : 'pending';

        systemTasks.push({
          id: `sys-med-${athlete.id}`,
          title: isOverdue
            ? `Certificato medico scaduto per ${safeName}`
            : `Rinnovo certificato medico per ${safeName}`,
          description: isOverdue
            ? `Il certificato medico di ${safeName} è scaduto il ${new Date(athlete.medicalCertificateExpiryDate).toLocaleDateString('it-IT')}. Richiedi il nuovo documento.`
            : `Il certificato medico di ${safeName} scadrà tra ${days} giorni (${new Date(athlete.medicalCertificateExpiryDate).toLocaleDateString('it-IT')}). Invia reminder all'atleta.`,
          athleteId: athlete.id,
          athleteName: safeName,
          assigneeId: 'system',
          assigneeName: 'Automazione Sistema',
          priority,
          dueDate: isOverdue ? todayStr : athlete.medicalCertificateExpiryDate.slice(0, 10),
          status,
          category: 'document' as TaskCategory,
          origin: 'system',
          systemRule: 'medical_expiring',
          reminder: true,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      }
    }
  });

  // 2. Pagamenti e Rate in ritardo (scadenza superata con importo residuo > 0)
  payments.forEach((payment) => {
    if (payment.status !== 'cancelled' && payment.residualAmount > 0) {
      const days = getDaysRemaining(payment.dueDate);
      if (days < 0) {
        systemTasks.push({
          id: `sys-pay-${payment.id}`,
          title: `Rata insoluta (${payment.residualAmount}€) - ${payment.athleteName}`,
          description: `Rata #${payment.installmentNumber || 1} di ${payment.expectedAmount}€ scaduta il ${new Date(payment.dueDate).toLocaleDateString('it-IT')}. Saldo residuo: ${payment.residualAmount}€.`,
          athleteId: payment.athleteId,
          athleteName: payment.athleteName,
          assigneeId: 'system',
          assigneeName: 'Automazione Sistema',
          priority: 'high' as TaskPriority,
          dueDate: todayStr,
          status: 'overdue',
          category: 'payment' as TaskCategory,
          origin: 'system',
          systemRule: 'payment_overdue',
          reminder: true,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      }
    }
  });

  // 3. Schede di allenamento alla penultima o ultima settimana (da preparare nuovo blocco)
  allAssignedWorkouts.forEach((assign: any) => {
    const athlete = athletes.find((a) => a.id === assign.athlete_id);
    const safeName = athlete?.fullName || assign.athlete_name || 'Atleta';
    const totalWeeks = assign.workout?.total_weeks || 5;
    
    // Calcolo settimana corrente da data assegnazione
    if (assign.assigned_date) {
      const assignDate = new Date(assign.assigned_date);
      const elapsedDays = Math.max(0, Math.floor((now.getTime() - assignDate.getTime()) / (1000 * 3600 * 24)));
      const curWeek = Math.min(totalWeeks, Math.floor(elapsedDays / 7) + 1);

      if (curWeek >= totalWeeks - 1 && assign.is_active !== false) {
        const isLastWeek = curWeek >= totalWeeks;
        systemTasks.push({
          id: `sys-wkt-${assign.id || assign.athlete_id}`,
          title: isLastWeek
            ? `Ultima settimana scheda per ${safeName} (Sett. ${curWeek}/${totalWeeks})`
            : `Penultima settimana scheda per ${safeName} (Sett. ${curWeek}/${totalWeeks})`,
          description: isLastWeek
            ? `${safeName} sta completando l'ultima settimana del programma "${assign.workout?.title || 'Scheda Attiva'}". Prepara e assegna il nuovo mesociclo.`
            : `${safeName} è alla penultima settimana di "${assign.workout?.title || 'Scheda Attiva'}". Inizia a pianificare la progressione per il prossimo blocco.`,
          athleteId: assign.athlete_id,
          athleteName: safeName,
          assigneeId: 'system',
          assigneeName: 'Automazione Sistema',
          priority: isLastWeek ? 'high' : 'medium',
          dueDate: todayStr,
          status: 'pending',
          category: 'workout_plan' as TaskCategory,
          origin: 'system',
          systemRule: 'workout_penultimate_week',
          reminder: true,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      }
    }
  });

  // 4. Abbonamenti in scadenza entro 7 giorni o scaduti da rinnovare
  subscriptions.forEach((sub) => {
    if (sub.status === 'active') {
      const days = getDaysRemaining(sub.endDate);
      if (days <= 7) {
        const isOverdue = days < 0;
        systemTasks.push({
          id: `sys-sub-${sub.id}`,
          title: isOverdue
            ? `Abbonamento scaduto: ${sub.athleteName}`
            : `Scadenza abbonamento (${days}gg): ${sub.athleteName}`,
          description: `Pacchetto ${sub.packageName} in scadenza il ${new Date(sub.endDate).toLocaleDateString('it-IT')}. Contatta l'atleta per la proposta di rinnovo.`,
          athleteId: sub.athleteId,
          athleteName: sub.athleteName,
          assigneeId: 'system',
          assigneeName: 'Automazione Sistema',
          priority: isOverdue ? 'urgent' : 'high',
          dueDate: isOverdue ? todayStr : sub.endDate.slice(0, 10),
          status: isOverdue ? 'overdue' : 'pending',
          category: 'follow_up' as TaskCategory,
          origin: 'system',
          systemRule: 'subscription_expiring',
          reminder: true,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      }
    }
  });

  // 5. Revisione Piano Nutrizionale (se presente reviewDate)
  nutritionPlans.forEach((plan: any) => {
    if (plan.status === 'active' && plan.reviewDate) {
      const days = getDaysRemaining(plan.reviewDate);
      if (days <= 3) {
        const isOverdue = days < 0;
        systemTasks.push({
          id: `sys-nutr-${plan.id}`,
          title: `Revisione target nutrizionali: ${plan.athleteName}`,
          description: `È prevista la revisione del piano nutrizionale e dei macro (${plan.targetKcal} kcal) per ${plan.athleteName}.`,
          athleteId: plan.athleteId,
          athleteName: plan.athleteName,
          assigneeId: 'system',
          assigneeName: 'Automazione Sistema',
          priority: isOverdue ? 'high' : 'medium',
          dueDate: isOverdue ? todayStr : plan.reviewDate.slice(0, 10),
          status: isOverdue ? 'overdue' : 'pending',
          category: 'nutrition' as TaskCategory,
          origin: 'system',
          systemRule: 'nutrition_review',
          reminder: true,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      }
    }
  });

  return systemTasks;
}
