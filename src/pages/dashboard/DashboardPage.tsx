import React, { useMemo } from 'react';
import {
  UserPlus,
  DollarSign,
  ChevronRight,
  RefreshCw,
  FileCheck2,
  MessageSquare,
  ArrowUpRight,
  Calendar,
  Flame,
  HelpCircle,
  BarChart3,
  CheckSquare,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAthletes } from '../../context/AthletesContext';
import { usePackages } from '../../context/PackagesContext';
import { useSubscriptions } from '../../context/SubscriptionsContext';
import { usePayments } from '../../context/PaymentsContext';
import { useRenewals } from '../../context/RenewalsContext';
import { useTasks } from '../../context/TasksContext';
import { useCommunications } from '../../context/CommunicationsContext';
import {
  calculatePaymentStatus,
  calculateSubscriptionStatus,
  getDaysRemaining,
  getMedicalCertificateStatus,
} from '../../lib/statusEngine';
import {
  calculateMRR,
  calculateARR,
  calculateCollectionRate,
  calculateAverageValuePerAthlete,
  calculateRenewalRate,
  calculateEstimatedChurn,
  getKPIFormulaTooltip,
} from '../../utils/dashboardCalculations';
import { NavigationTab } from '../../types';
import { DashboardMetricCards } from './components/DashboardMetricCards';

export const DashboardPage: React.FC = () => {
  const { setActiveTab, ownerProfile } = useApp();
  const { athletes } = useAthletes();
  const { packages } = usePackages();
  const { subscriptions } = useSubscriptions();
  const { payments } = usePayments();
  const { renewals } = useRenewals();
  const { tasks } = useTasks();
  const { communications } = useCommunications();

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const todayStr = now.toISOString().slice(0, 10);

  // 1. Calcoli Metriche Generali dai Context
  const metrics = useMemo(() => {
    const activeAthletes = athletes.filter(a => a.status === 'active').length;
    const trialAthletes = athletes.filter(a => a.status === 'trial').length;
    const suspendedAthletes = athletes.filter(a => a.status === 'suspended').length;
    const newAthletes = athletes.filter(a => {
      const createdDaysAgo = Math.floor((now.getTime() - new Date(a.createdAt).getTime()) / (1000 * 3600 * 24));
      return createdDaysAgo <= 30;
    }).length;

    const expiringSubscriptions = subscriptions.filter(s => {
      if (s.status !== 'active') return false;
      const calc = calculateSubscriptionStatus(s);
      return calc.daysRemaining >= 0 && calc.daysRemaining <= 30;
    }).length;

    const activePayments = payments.filter(p => p.status !== 'cancelled' && p.status !== 'refunded' && p.residualAmount > 0);

    const expiringPayments = activePayments.filter(p => {
      const calc = calculatePaymentStatus(p);
      return !calc.isOverdue && calc.daysRemaining >= 0 && calc.daysRemaining <= 30;
    }).length;

    const overduePayments = activePayments.filter(p => {
      const calc = calculatePaymentStatus(p);
      return calc.isOverdue;
    }).length;

    const totalToCollect = activePayments.reduce((sum, p) => sum + p.residualAmount, 0);

    const collectedThisMonth = payments.reduce((sum, p) => {
      const paidDateStr = p.paymentDate || p.paidDate;
      if (paidDateStr && paidDateStr.startsWith(currentMonthStr)) {
        return sum + p.paidAmount;
      }
      return sum;
    }, 0);

    const tasksToComplete = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length;

    // KPI avanzati da dashboardCalculations
    const mrr = calculateMRR(subscriptions, packages);
    const arr = calculateARR(mrr);
    const collectionRate = calculateCollectionRate(payments);
    const averageValuePerAthlete = calculateAverageValuePerAthlete(collectedThisMonth, activeAthletes);
    const renewalRate = calculateRenewalRate(renewals);
    const estimatedChurn = calculateEstimatedChurn(athletes, renewals);

    return {
      activeAthletes,
      newAthletes,
      trialAthletes,
      suspendedAthletes,
      expiringSubscriptions,
      expiringPayments,
      overduePayments,
      totalToCollect,
      collectedThisMonth,
      tasksToComplete,
      mrr,
      arr,
      collectionRate,
      averageValuePerAthlete,
      renewalRate,
      estimatedChurn,
    };
  }, [athletes, subscriptions, packages, payments, renewals, tasks, currentMonthStr, now]);

  // 2. Sezioni Rapide
  const todayDeadlines = useMemo(() => {
    const list: { title: string; subtitle: string; category: string; tab: NavigationTab }[] = [];

    payments.forEach(p => {
      if (p.status !== 'cancelled' && p.status !== 'refunded' && p.residualAmount > 0) {
        const calc = calculatePaymentStatus(p);
        if (calc.daysRemaining === 0) {
          list.push({
            title: `Pagamento: ${p.athleteName}`,
            subtitle: `Residuo: € ${p.residualAmount.toFixed(2)}`,
            category: 'Pagamento',
            tab: 'pagamenti',
          });
        }
      }
    });

    subscriptions.forEach(s => {
      if (s.status === 'active') {
        const calc = calculateSubscriptionStatus(s);
        if (calc.daysRemaining === 0) {
          list.push({
            title: `Abbonamento: ${s.athleteName}`,
            subtitle: `Pacchetto: ${s.packageName}`,
            category: 'Abbonamento',
            tab: 'abbonamenti',
          });
        }
      }
    });

    tasks.forEach(t => {
      if (t.status !== 'completed' && t.status !== 'cancelled' && t.dueDate.startsWith(todayStr)) {
        list.push({
          title: `Task: ${t.title}`,
          subtitle: `Atleta: ${t.athleteName || 'Generale'}`,
          category: 'Attività',
          tab: 'attivita',
        });
      }
    });

    return list;
  }, [payments, subscriptions, tasks, todayStr]);

  const upcoming7Days = useMemo(() => {
    const list: { title: string; daysLeft: number; tab: NavigationTab }[] = [];

    payments.forEach(p => {
      if (p.status !== 'cancelled' && p.status !== 'refunded' && p.residualAmount > 0) {
        const calc = calculatePaymentStatus(p);
        if (calc.daysRemaining > 0 && calc.daysRemaining <= 7) {
          list.push({
            title: `Rata ${p.athleteName} (€ ${p.residualAmount.toFixed(2)})`,
            daysLeft: calc.daysRemaining,
            tab: 'pagamenti',
          });
        }
      }
    });

    subscriptions.forEach(s => {
      if (s.status === 'active') {
        const calc = calculateSubscriptionStatus(s);
        if (calc.daysRemaining > 0 && calc.daysRemaining <= 7) {
          list.push({
            title: `Fine abbonamento ${s.athleteName}`,
            daysLeft: calc.daysRemaining,
            tab: 'abbonamenti',
          });
        }
      }
    });

    return list.sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 5);
  }, [payments, subscriptions]);

  const renewalsToContact = useMemo(() => {
    return renewals
      .filter(r => ['to_contact', 'contacted', 'interested', 'evaluating', 'unreachable'].includes(r.status))
      .slice(0, 5);
  }, [renewals]);

  const urgentTasks = useMemo(() => {
    return tasks
      .filter(t => t.status !== 'completed' && t.status !== 'cancelled' && (t.priority === 'urgent' || t.priority === 'high' || getDaysRemaining(t.dueDate) < 0))
      .slice(0, 5);
  }, [tasks]);

  const medicalAlerts = useMemo(() => {
    return athletes
      .map(a => ({ athlete: a, status: getMedicalCertificateStatus(a) }))
      .filter(item => item.status !== 'valid')
      .slice(0, 5);
  }, [athletes]);

  const recentCommunications = useMemo(() => {
    return [...communications]
      .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())
      .slice(0, 5);
  }, [communications]);

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return '-';
    return new Date(isoStr).toLocaleDateString('it-IT');
  };

  return (
    <div className="space-y-8">
      {/* Header Benvenuto */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-[var(--color-primary)]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold text-[10px] uppercase tracking-wider border border-[var(--color-primary)]/20">
              Panoramica Gestionale
            </span>
            <span className="text-xs text-slate-500 font-semibold">{new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Bentornato, {ownerProfile?.fullName || 'Proprietario Gym'} 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Ecco il riepilogo in tempo reale dell'andamento finanziario, atleti ed operatività della tua palestra.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 z-10">
          <button
            onClick={() => setActiveTab('atleti')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold text-xs hover:border-[var(--color-primary)] transition-all shadow"
          >
            <UserPlus className="w-4 h-4 text-[var(--color-primary)]" /> Nuovo Atleta
          </button>
          <button
            onClick={() => setActiveTab('pagamenti')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all shadow-[0_0_20px_rgba(234,179,8,0.2)]"
          >
            <DollarSign className="w-4 h-4" /> Registra Incasso
          </button>
        </div>
      </div>

      {/* GRIGLIA METRIC CARDS TOP-LEVEL (10 CARDS) */}
      <DashboardMetricCards
        metrics={metrics}
        onNavigateTab={setActiveTab}
        formatPrice={formatPrice}
      />

      {/* SEZIONE SPECIALE: KPI & PERFORMANCE RICORRENTI (MRR / ARR / CHURN / ARPU) */}
      <div className="p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[var(--color-primary)]" />
            <h3 className="text-base font-bold text-white">KPI & Financial Performance (Ricorrenti)</h3>
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg">
            Algoritmo Puro
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* MRR */}
          {(() => {
            const info = getKPIFormulaTooltip('mrr');
            return (
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between relative group hover:border-[var(--color-primary)]/50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">MRR</span>
                  <div className="relative group/tip">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-500 cursor-help" />
                    <div className="absolute right-0 top-6 hidden group-hover/tip:block z-30 w-56 p-3 rounded-xl bg-slate-950 border border-slate-700 text-[10px] text-slate-300 shadow-2xl space-y-1">
                      <p className="font-bold text-white">{info.formula}</p>
                      <p className="text-slate-400">{info.description}</p>
                      <p className="text-[9px] font-bold text-[var(--color-primary)] uppercase pt-1 border-t border-slate-800">{info.disclaimer}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-lg font-black text-[var(--color-primary)]">{formatPrice(metrics.mrr)}</span>
                  <span className="text-[9px] text-slate-500 block">Ricavo Mensile Ricorrente</span>
                </div>
              </div>
            );
          })()}

          {/* ARR */}
          {(() => {
            const info = getKPIFormulaTooltip('arr');
            return (
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between relative group hover:border-[var(--color-primary)]/50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ARR</span>
                  <div className="relative group/tip">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-500 cursor-help" />
                    <div className="absolute right-0 top-6 hidden group-hover/tip:block z-30 w-56 p-3 rounded-xl bg-slate-950 border border-slate-700 text-[10px] text-slate-300 shadow-2xl space-y-1">
                      <p className="font-bold text-white">{info.formula}</p>
                      <p className="text-slate-400">{info.description}</p>
                      <p className="text-[9px] font-bold text-[var(--color-primary)] uppercase pt-1 border-t border-slate-800">{info.disclaimer}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-lg font-black text-white">{formatPrice(metrics.arr)}</span>
                  <span className="text-[9px] text-slate-500 block">Proiezione Annuale (MRR×12)</span>
                </div>
              </div>
            );
          })()}

          {/* Tasso di Incasso */}
          {(() => {
            const info = getKPIFormulaTooltip('collectionRate');
            return (
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between relative group hover:border-emerald-500/50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tasso Incasso</span>
                  <div className="relative group/tip">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-500 cursor-help" />
                    <div className="absolute right-0 top-6 hidden group-hover/tip:block z-30 w-56 p-3 rounded-xl bg-slate-950 border border-slate-700 text-[10px] text-slate-300 shadow-2xl space-y-1">
                      <p className="font-bold text-white">{info.formula}</p>
                      <p className="text-slate-400">{info.description}</p>
                      <p className="text-[9px] font-bold text-[var(--color-primary)] uppercase pt-1 border-t border-slate-800">{info.disclaimer}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-lg font-black text-emerald-400">{metrics.collectionRate}%</span>
                  <span className="text-[9px] text-slate-500 block">Saldo su Entrate Previste</span>
                </div>
              </div>
            );
          })()}

          {/* Valore Medio Atleta (ARPU) */}
          {(() => {
            const info = getKPIFormulaTooltip('averageValuePerAthlete');
            return (
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between relative group hover:border-blue-500/50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valore/Atleta</span>
                  <div className="relative group/tip">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-500 cursor-help" />
                    <div className="absolute right-0 top-6 hidden group-hover/tip:block z-30 w-56 p-3 rounded-xl bg-slate-950 border border-slate-700 text-[10px] text-slate-300 shadow-2xl space-y-1">
                      <p className="font-bold text-white">{info.formula}</p>
                      <p className="text-slate-400">{info.description}</p>
                      <p className="text-[9px] font-bold text-[var(--color-primary)] uppercase pt-1 border-t border-slate-800">{info.disclaimer}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-lg font-black text-blue-400">{formatPrice(metrics.averageValuePerAthlete)}</span>
                  <span className="text-[9px] text-slate-500 block">ARPU Mensile Stimato</span>
                </div>
              </div>
            );
          })()}

          {/* Tasso di Rinnovo */}
          {(() => {
            const info = getKPIFormulaTooltip('renewalRate');
            return (
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between relative group hover:border-yellow-500/50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tasso Rinnovo</span>
                  <div className="relative group/tip">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-500 cursor-help" />
                    <div className="absolute right-0 top-6 hidden group-hover/tip:block z-30 w-56 p-3 rounded-xl bg-slate-950 border border-slate-700 text-[10px] text-slate-300 shadow-2xl space-y-1">
                      <p className="font-bold text-white">{info.formula}</p>
                      <p className="text-slate-400">{info.description}</p>
                      <p className="text-[9px] font-bold text-[var(--color-primary)] uppercase pt-1 border-t border-slate-800">{info.disclaimer}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-lg font-black text-yellow-400">{metrics.renewalRate}%</span>
                  <span className="text-[9px] text-slate-500 block">Fidelizzazione Contratti</span>
                </div>
              </div>
            );
          })()}

          {/* Churn Stimato */}
          {(() => {
            const info = getKPIFormulaTooltip('estimatedChurn');
            return (
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between relative group hover:border-rose-500/50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Churn Rate</span>
                  <div className="relative group/tip">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-500 cursor-help" />
                    <div className="absolute right-0 top-6 hidden group-hover/tip:block z-30 w-56 p-3 rounded-xl bg-slate-950 border border-slate-700 text-[10px] text-slate-300 shadow-2xl space-y-1">
                      <p className="font-bold text-white">{info.formula}</p>
                      <p className="text-slate-400">{info.description}</p>
                      <p className="text-[9px] font-bold text-[var(--color-primary)] uppercase pt-1 border-t border-slate-800">{info.disclaimer}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-lg font-black text-rose-400">{metrics.estimatedChurn}%</span>
                  <span className="text-[9px] text-slate-500 block">Abbandono Stimato</span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* SEZIONI RAPIDE E OPERATIVE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLONNA 1: Scadenze di Oggi e Prossimi 7 Giorni */}
        <div className="space-y-6">
          {/* Scadenze di Oggi */}
          <div className="p-5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" /> Scadenze di Oggi
              </h3>
              <span className="text-[10px] font-bold text-slate-500 uppercase">{todayDeadlines.length} Totali</span>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto">
              {todayDeadlines.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">Nessuna scadenza prevista per la giornata di oggi.</p>
              ) : (
                todayDeadlines.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => setActiveTab(item.tab)}
                    className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-[var(--color-primary)] flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div>
                      <span className="text-[9px] font-bold uppercase text-[var(--color-primary)] px-1.5 py-0.5 rounded bg-[var(--color-primary)]/10">
                        {item.category}
                      </span>
                      <h4 className="text-xs font-bold text-white mt-1">{item.title}</h4>
                      <p className="text-[10px] text-slate-400">{item.subtitle}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Prossimi 7 Giorni */}
          <div className="p-5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sky-400" /> Prossimi 7 Giorni
              </h3>
              <button onClick={() => setActiveTab('scadenze')} className="text-xs font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1">
                Vedi Tutti <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              {upcoming7Days.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">Nessuna scadenza critica nei prossimi 7 giorni.</p>
              ) : (
                upcoming7Days.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => setActiveTab(item.tab)}
                    className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-sky-500/50 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span className="text-xs font-medium text-slate-200">{item.title}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      Tra {item.daysLeft} gg
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* COLONNA 2: Rinnovi da Contattare ed Attività Urgenti */}
        <div className="space-y-6">
          {/* Rinnovi da Contattare */}
          <div className="p-5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-yellow-400" /> Rinnovi da Contattare
              </h3>
              <button onClick={() => setActiveTab('rinnovi')} className="text-xs font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1">
                Trattative <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              {renewalsToContact.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">Nessun rinnovo in trattativa al momento.</p>
              ) : (
                renewalsToContact.map(ren => (
                  <div
                    key={ren.id}
                    onClick={() => setActiveTab('rinnovi')}
                    className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-yellow-500/50 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-white">{ren.athleteName}</h4>
                      <p className="text-[10px] text-slate-400">Scadenza: {formatDate(ren.endDate)}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 uppercase">
                      {ren.status.replace('_', ' ')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Attività Urgenti */}
          <div className="p-5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-purple-400" /> Attività Urgenti
              </h3>
              <button onClick={() => setActiveTab('attivita')} className="text-xs font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1">
                Tutte le Task <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              {urgentTasks.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">Nessuna attività urgente in sospeso.</p>
              ) : (
                urgentTasks.map(t => (
                  <div
                    key={t.id}
                    onClick={() => setActiveTab('attivita')}
                    className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-purple-500/50 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-white">{t.title}</h4>
                      <p className="text-[10px] text-slate-400">{t.athleteName || 'Generale'}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase">
                      {t.priority}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* COLONNA 3: Certificati Medici ed Ultime Comunicazioni */}
        <div className="space-y-6">
          {/* Certificati Medici */}
          <div className="p-5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-rose-400" /> Certificati Medici
              </h3>
              <button onClick={() => setActiveTab('documenti')} className="text-xs font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1">
                Documenti <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              {medicalAlerts.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">Tutti i certificati agonistici sono in regola.</p>
              ) : (
                medicalAlerts.map(({ athlete, status }) => (
                  <div
                    key={athlete.id}
                    onClick={() => setActiveTab('documenti')}
                    className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-500/50 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-white">{athlete.fullName}</h4>
                      <p className="text-[10px] text-slate-400">
                        {athlete.medicalCertificateExpiryDate ? `Scadenza: ${formatDate(athlete.medicalCertificateExpiryDate)}` : 'Nessuna data registrata'}
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                      status === 'missing'
                        ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                        : status === 'expired'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {status === 'missing' ? 'Mancante' : status === 'expired' ? 'Scaduto' : 'In Scadenza'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Ultime Comunicazioni */}
          <div className="p-5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" /> Ultime Comunicazioni
              </h3>
              <button onClick={() => setActiveTab('comunicazioni')} className="text-xs font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1">
                Centro Contatti <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              {recentCommunications.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">Nessuna comunicazione registrata di recente.</p>
              ) : (
                recentCommunications.map(comm => (
                  <div
                    key={comm.id}
                    onClick={() => setActiveTab('comunicazioni')}
                    className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-white">{comm.athleteName}</h4>
                      <p className="text-[10px] text-slate-400 truncate max-w-[160px]">{comm.subject}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                      {comm.channel}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
