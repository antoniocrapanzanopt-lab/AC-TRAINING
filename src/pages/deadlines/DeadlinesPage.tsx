import React, { useState, useMemo } from 'react';
import {
  Clock,
  AlertTriangle,
  Calendar,
  Euro,
  RefreshCw,
  User,
  Activity,
  FileCheck2,
  CheckCircle2,
  X,
} from 'lucide-react';
import { usePayments } from '../../context/PaymentsContext';
import { useSubscriptions } from '../../context/SubscriptionsContext';
import { useAthletes } from '../../context/AthletesContext';
import { useTasks } from '../../context/TasksContext';
import { useToast } from '../../context/ToastContext';
import { PaymentRecord, AthleteActivity, PaymentMethod } from '../../types';
import { PaymentModal } from '../../components/payments/PaymentModal';
import {
  getDeadlinesSummary,
  recalculateAllStatuses,
  RecalculationReport,
} from '../../lib/statusEngine';

export const DeadlinesPage: React.FC = () => {
  const { payments, registerPayment } = usePayments();
  const { subscriptions } = useSubscriptions();
  const { athletes } = useAthletes();
  const { tasks } = useTasks();
  const { showSuccess } = useToast();

  const [activeTab, setActiveTab] = useState<'all' | 'payments' | 'subscriptions' | 'medical' | 'activities'>('all');
  const [daysFilter, setDaysFilter] = useState<'all' | '0' | '7' | '15' | '30'>('all');
  
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const [reportModal, setReportModal] = useState<{ open: boolean; report: RecalculationReport | null }>({
    open: false,
    report: null,
  });

  // Sintesi Scadenze con Attività Reali
  const activitiesList: AthleteActivity[] = useMemo(() => {
    return tasks
      .filter((t): t is typeof t & { athleteId: string; athleteName: string } => !!t.athleteId && !!t.athleteName)
      .map(t => {
        const activityStatus: AthleteActivity['status'] =
          t.status === 'in_progress' ? 'pending' : t.status === 'overdue' ? 'overdue' : t.status === 'completed' ? 'completed' : t.status === 'cancelled' ? 'cancelled' : 'pending';

        let activityCategory: AthleteActivity['category'] = 'other';
        if (t.category === 'workout_plan' || t.category === 'training') activityCategory = 'training';
        else if (t.category === 'measurements' || t.category === 'assessment' || t.category === 'checkup' || t.category === 'checkin') activityCategory = 'assessment';
        else if (t.category === 'call' || t.category === 'appointment' || t.category === 'follow_up') activityCategory = 'call';
        else if (t.category === 'payment' || t.category === 'document' || t.category === 'administrative') activityCategory = 'administrative';

        return {
          id: t.id,
          athleteId: t.athleteId,
          athleteName: t.athleteName,
          title: t.title,
          dueDate: t.dueDate,
          status: activityStatus,
          category: activityCategory,
          createdAt: t.createdAt,
        };
      });
  }, [tasks]);

  const summary = useMemo(() => {
    return getDeadlinesSummary(payments, subscriptions, athletes, activitiesList);
  }, [payments, subscriptions, athletes, activitiesList]);

  const handleManualRecalculate = () => {
    const report = recalculateAllStatuses(athletes, subscriptions, payments);
    setReportModal({ open: true, report });
    showSuccess('Ricalcolo completato', 'Gli stati delle scadenze sono stati aggiornati.');
  };

  const handleSavePayment = (amount: number, method: PaymentMethod, reference: string, _date: string, _notes: string) => {
    if (selectedPayment) {
      registerPayment(selectedPayment.id, amount, method, reference);
      showSuccess('Incasso registrato', `Registrato versamento di ${amount}€ per ${selectedPayment.athleteName}.`);
    }
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const formatDate = (isoStr: string) => {
    return new Date(isoStr).toLocaleDateString('it-IT');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Scadenze e Scadenzario</h1>
          <p className="text-sm text-slate-400 mt-1">
            Monitora rate in sospeso, abbonamenti, certificati ed attività scadute.
          </p>
        </div>
        <button
          onClick={handleManualRecalculate}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all shadow-[0_0_20px_rgba(234,179,8,0.2)]"
        >
          <RefreshCw className="w-4 h-4" /> Ricalcola Stati
        </button>
      </div>

      {/* Bar di Navigazione Tab & Filtro Temporale */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-[var(--color-primary)] text-black shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Tutte le Scadenze
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'payments'
                ? 'bg-[var(--color-primary)] text-black shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Pagamenti ({summary.overduePayments.length + summary.expiringPayments.today.length + summary.expiringPayments.within7Days.length + summary.expiringPayments.within15Days.length + summary.expiringPayments.within30Days.length})
          </button>
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'subscriptions'
                ? 'bg-[var(--color-primary)] text-black shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Abbonamenti
          </button>
          <button
            onClick={() => setActiveTab('medical')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'medical'
                ? 'bg-[var(--color-primary)] text-black shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Certificati Medici ({summary.medicalCertificates.expired.length + summary.medicalCertificates.expiringSoon.length})
          </button>
          <button
            onClick={() => setActiveTab('activities')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'activities'
                ? 'bg-[var(--color-primary)] text-black shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Attività ({summary.expiredActivities.length})
          </button>
        </div>

        {/* Filtro Giorni per le sezioni in scadenza */}
        <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-4">
          <span className="text-xs font-bold text-slate-500 uppercase">Intervallo:</span>
          <select
            value={daysFilter}
            onChange={(e) => setDaysFilter(e.target.value as any)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-[var(--color-primary)] transition-colors"
          >
            <option value="all">Tutti (0 - 30 gg)</option>
            <option value="0">Oggi</option>
            <option value="7">Entro 7 Giorni</option>
            <option value="15">Entro 15 Giorni</option>
            <option value="30">Entro 30 Giorni</option>
          </select>
        </div>
      </div>

      {/* SEZIONE 1: PAGAMENTI SCADUTI */}
      {(activeTab === 'all' || activeTab === 'payments') && summary.overduePayments.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="w-5 h-5" />
            <h2 className="text-lg font-bold text-white">Pagamenti Scaduti ({summary.overduePayments.length})</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {summary.overduePayments.map(({ payment, calc }) => (
              <div key={payment.id} className="p-4 rounded-xl bg-red-950/20 border border-red-900/40 shadow-xl flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-400/10 border border-red-400/20 mb-1">
                      Scaduto
                    </span>
                    <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                      <User className="w-4 h-4 text-red-400" />
                      {payment.athleteName}
                    </h3>
                    <p className="text-xs text-red-300/80 mt-1 font-medium">{calc.reason}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-lg font-black text-red-400">{formatPrice(payment.residualAmount)}</span>
                    <p className="text-[10px] text-slate-500 uppercase">Residuo Rata</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-red-900/30 text-xs">
                  <span className="text-slate-400">Scaduto il: <strong className="text-slate-200">{formatDate(payment.dueDate)}</strong></span>
                  <button
                    onClick={() => { setSelectedPayment(payment); setIsPaymentModalOpen(true); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-black text-xs font-bold hover:bg-emerald-600 transition-colors"
                  >
                    <Euro className="w-3.5 h-3.5" /> Registra Incasso
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEZIONE 2: PAGAMENTI IN SCADENZA */}
      {(activeTab === 'all' || activeTab === 'payments') && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-amber-400">
            <Clock className="w-5 h-5" />
            <h2 className="text-lg font-bold text-white">Pagamenti in Scadenza (Prossimi 30 giorni)</h2>
          </div>

          {summary.expiringPayments.today.length === 0 &&
           summary.expiringPayments.within7Days.length === 0 &&
           summary.expiringPayments.within15Days.length === 0 &&
           summary.expiringPayments.within30Days.length === 0 ? (
            <div className="p-6 rounded-xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] text-center text-slate-500 text-xs">
              Nessun pagamento in scadenza nell'intervallo selezionato.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                ...summary.expiringPayments.today,
                ...summary.expiringPayments.within7Days,
                ...summary.expiringPayments.within15Days,
                ...summary.expiringPayments.within30Days,
              ]
                .filter(({ calc }) => {
                  if (daysFilter === '0') return calc.daysRemaining === 0;
                  if (daysFilter === '7') return calc.daysRemaining <= 7;
                  if (daysFilter === '15') return calc.daysRemaining <= 15;
                  if (daysFilter === '30') return calc.daysRemaining <= 30;
                  return true;
                })
                .map(({ payment, calc }) => (
                  <div key={payment.id} className="p-4 rounded-xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl flex flex-col justify-between space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-1 ${
                          calc.daysRemaining === 0 ? 'text-red-400 bg-red-400/10 border border-red-400/20' : 'text-amber-400 bg-amber-400/10 border border-amber-400/20'
                        }`}>
                          {calc.daysRemaining === 0 ? 'Scade Oggi' : `Scade in ${calc.daysRemaining} gg`}
                        </span>
                        <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                          <User className="w-4 h-4 text-slate-400" />
                          {payment.athleteName}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">{calc.reason}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-lg font-bold text-[var(--color-primary)]">{formatPrice(payment.residualAmount)}</span>
                        <p className="text-[10px] text-slate-500 uppercase">Residuo</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                      <span className="text-slate-400">Scadenza: <strong className="text-slate-200">{formatDate(payment.dueDate)}</strong></span>
                      <button
                        onClick={() => { setSelectedPayment(payment); setIsPaymentModalOpen(true); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-black text-xs font-bold hover:bg-emerald-600 transition-colors"
                      >
                        <Euro className="w-3.5 h-3.5" /> Registra Incasso
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* SEZIONE 3: ABBONAMENTI IN SCADENZA */}
      {(activeTab === 'all' || activeTab === 'subscriptions') && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[var(--color-primary)]">
            <Calendar className="w-5 h-5" />
            <h2 className="text-lg font-bold text-white">Abbonamenti in Scadenza</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              ...summary.expiringSubscriptions.today,
              ...summary.expiringSubscriptions.within7Days,
              ...summary.expiringSubscriptions.within15Days,
              ...summary.expiringSubscriptions.within30Days,
            ].map(({ subscription, calc }) => (
              <div key={subscription.id} className="p-4 rounded-xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary)] bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 mb-1">
                      {calc.daysRemaining === 0 ? 'Scade Oggi' : `Scade in ${calc.daysRemaining} giorni`}
                    </span>
                    <h3 className="text-base font-bold text-white">{subscription.athleteName}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{subscription.packageName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-bold text-white">{formatPrice(subscription.finalPrice)}</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
                  Motivo: <strong className="text-white">{calc.reason}</strong>
                </div>

                <div className="flex justify-between items-center text-xs text-slate-400 pt-1">
                  <span>Valido fino al: <strong className="text-white">{formatDate(subscription.endDate)}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEZIONE 4: CERTIFICATI MEDICI */}
      {(activeTab === 'all' || activeTab === 'medical') && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-rose-400">
            <FileCheck2 className="w-5 h-5" />
            <h2 className="text-lg font-bold text-white">Certificati Medici</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {summary.medicalCertificates.missing.map(({ athlete }) => (
              <div key={athlete.id} className="p-4 rounded-xl bg-orange-950/20 border border-orange-900/40 shadow-xl flex items-center justify-between">
                <div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-orange-400 bg-orange-400/10 border border-orange-400/20 mb-1">
                    Certificato Mancante
                  </span>
                  <h3 className="text-base font-bold text-white">{athlete.fullName}</h3>
                  <p className="text-xs text-orange-300/80 mt-0.5">Nessuna data di scadenza registrata a sistema.</p>
                </div>
              </div>
            ))}

            {summary.medicalCertificates.expired.map(({ athlete, days }) => (
              <div key={athlete.id} className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/40 shadow-xl flex items-center justify-between">
                <div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-rose-400 bg-rose-400/10 border border-rose-400/20 mb-1">
                    Certificato Scaduto ({Math.abs(days)} gg fa)
                  </span>
                  <h3 className="text-base font-bold text-white">{athlete.fullName}</h3>
                  <p className="text-xs text-rose-300/80 mt-0.5">Scadenza: {formatDate(athlete.medicalCertificateExpiryDate!)}</p>
                </div>
              </div>
            ))}

            {summary.medicalCertificates.expiringSoon.map(({ athlete, days }) => (
              <div key={athlete.id} className="p-4 rounded-xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl flex items-center justify-between">
                <div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 border border-amber-400/20 mb-1">
                    Scade in {days} giorni
                  </span>
                  <h3 className="text-base font-bold text-white">{athlete.fullName}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Scadenza: {formatDate(athlete.medicalCertificateExpiryDate!)}</p>
                </div>
              </div>
            ))}

            {summary.medicalCertificates.missing.length === 0 && summary.medicalCertificates.expired.length === 0 && summary.medicalCertificates.expiringSoon.length === 0 && (
              <div className="p-6 rounded-xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] text-center text-slate-500 text-xs md:col-span-2">
                Nessun certificato medico in scadenza, scaduto o mancante trovato.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SEZIONE 5: ATTIVITÀ SCADUTE */}
      {(activeTab === 'all' || activeTab === 'activities') && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-purple-400">
            <Activity className="w-5 h-5" />
            <h2 className="text-lg font-bold text-white">Attività Scadute ({summary.expiredActivities.length})</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {summary.expiredActivities.map(({ activity, days }) => (
              <div key={activity.id} className="p-4 rounded-xl bg-purple-950/20 border border-purple-900/40 shadow-xl space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-400/10 border border-purple-400/20 mb-1">
                      Scaduta da {Math.abs(days)} giorni
                    </span>
                    <h3 className="text-base font-bold text-white">{activity.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Atleta: {activity.athleteName}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modale Registrazione Incasso Rapido */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSave={handleSavePayment}
        paymentRecord={selectedPayment}
      />

      {/* Modale Report Ricalcolo Manuale */}
      {reportModal.open && reportModal.report && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setReportModal({ open: false, report: null })} />
          <div className="relative w-full max-w-lg bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)]">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Esito Ricalcolo Stati</h3>
                  <p className="text-xs text-slate-400">Report sintetico scadenze</p>
                </div>
              </div>
              <button onClick={() => setReportModal({ open: false, report: null })} className="p-2 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
                {reportModal.report.summary}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-500 uppercase block font-bold text-[10px]">Atleti Analizzati</span>
                  <span className="text-lg font-black text-white">{reportModal.report.totalAthletesAnalysed}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-500 uppercase block font-bold text-[10px]">Abbonamenti Analizzati</span>
                  <span className="text-lg font-black text-white">{reportModal.report.totalSubscriptionsAnalysed}</span>
                </div>
                <div className="p-3 rounded-xl bg-red-950/30 border border-red-900/50">
                  <span className="text-red-400 uppercase block font-bold text-[10px]">Rate Scadute Invece</span>
                  <span className="text-lg font-black text-red-400">{reportModal.report.overduePaymentsCount}</span>
                </div>
                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-900/50">
                  <span className="text-amber-400 uppercase block font-bold text-[10px]">Abbonamenti in Scadenza</span>
                  <span className="text-lg font-black text-amber-400">{reportModal.report.expiringSubscriptionsCount}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setReportModal({ open: false, report: null })}
                className="px-5 py-2 rounded-xl bg-[var(--color-primary)] text-black text-xs font-bold hover:bg-[var(--color-primary-hover)] transition-colors"
              >
                Chiudi Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
