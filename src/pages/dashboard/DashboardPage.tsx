import React, { useState, useMemo } from 'react';
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
  Dumbbell,
  X,
  Info,
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
import { AITrainingCopilotWidget } from './components/AITrainingCopilotWidget';
import { DashboardChart } from './components/DashboardChart';

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

  const [showKPIInfoModal, setShowKPIInfoModal] = useState(false);

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 shadow-2xl relative overflow-hidden group">
        <div className="absolute right-0 top-0 w-96 h-96 bg-[var(--color-primary)]/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-[var(--color-primary)]/20 transition-all duration-700" />
        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold text-[10px] uppercase tracking-wider border border-[var(--color-primary)]/20">
              Centro di Controllo Gestionale & Performance
            </span>
            <span className="text-xs text-slate-500 font-semibold">{new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Centro Comando, {ownerProfile?.fullName || 'Coach'} 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Monitoraggio finanziario, controllo diretto delle trattative ed analisi avanzata dell'andamento delle schede atleta.
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
            onClick={() => setActiveTab('schede')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold text-xs hover:border-[var(--color-primary)] transition-all shadow"
          >
            <Dumbbell className="w-4 h-4 text-amber-400" /> Nuova Scheda
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

      {/* SEZIONE SPECIALE: KPI & FINANCIAL PERFORMANCE (MRR / ARR / CHURN / ARPU) */}
      <div className="p-6 rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 shadow-2xl space-y-4 relative group/kpi">
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-purple-500/5 rounded-full blur-[80px] group-hover/kpi:bg-purple-500/10 transition-all duration-700" />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3 relative z-10">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[var(--color-primary)]" />
            <h3 className="text-base font-bold text-white">KPI & Financial Performance</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowKPIInfoModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-[11px] font-bold text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Visualizza la guida alle formule dei KPI"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[var(--color-primary)]" />
              <span>Guida Formule</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 relative z-10 pt-2">
          {/* MRR */}
          <div className="p-4 rounded-xl bg-slate-900/40 backdrop-blur-md border border-slate-800/60 flex flex-col justify-between relative group hover:bg-slate-900/60 hover:border-[var(--color-primary)]/50 hover:shadow-[0_0_20px_rgba(234,179,8,0.15)] transition-all duration-300">
            <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
              <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-[var(--color-primary)]/5 rounded-full blur-xl group-hover:bg-[var(--color-primary)]/20 transition-colors duration-500"></div>
            </div>
            <div className="flex items-center justify-between gap-1 relative z-10">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">MRR</span>
            </div>
            <div className="mt-2 relative z-10">
              <span className="text-lg font-black text-[var(--color-primary)]">{formatPrice(metrics.mrr)}</span>
              <span className="text-[9px] text-slate-500 block">Ricavo Mensile Ricorrente</span>
            </div>
          </div>

          {/* ARR */}
          <div className="p-4 rounded-xl bg-slate-900/40 backdrop-blur-md border border-slate-800/60 flex flex-col justify-between relative group hover:bg-slate-900/60 hover:border-[var(--color-primary)]/50 hover:shadow-[0_0_20px_rgba(234,179,8,0.15)] transition-all duration-300">
            <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
              <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-white/5 rounded-full blur-xl group-hover:bg-[var(--color-primary)]/20 transition-colors duration-500"></div>
            </div>
            <div className="flex items-center justify-between gap-1 relative z-10">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">ARR</span>
            </div>
            <div className="mt-2 relative z-10">
              <span className="text-lg font-black text-white">{formatPrice(metrics.arr)}</span>
              <span className="text-[9px] text-slate-500 block">Proiezione Annuale (MRR×12)</span>
            </div>
          </div>

          {/* Tasso di Incasso */}
          <div className="p-4 rounded-xl bg-slate-900/40 backdrop-blur-md border border-slate-800/60 flex flex-col justify-between relative group hover:bg-slate-900/60 hover:border-emerald-500/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] transition-all duration-300">
            <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
              <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-colors duration-500"></div>
            </div>
            <div className="flex items-center justify-between gap-1 relative z-10">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Tasso Incasso</span>
            </div>
            <div className="mt-2 relative z-10">
              <span className="text-lg font-black text-emerald-400">{metrics.collectionRate}%</span>
              <span className="text-[9px] text-slate-500 block">Saldo su Entrate Previste</span>
            </div>
          </div>

          {/* Valore Medio Atleta (ARPU) */}
          <div className="p-4 rounded-xl bg-slate-900/40 backdrop-blur-md border border-slate-800/60 flex flex-col justify-between relative group hover:bg-slate-900/60 hover:border-blue-500/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] transition-all duration-300">
            <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
              <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-blue-500/5 rounded-full blur-xl group-hover:bg-blue-500/20 transition-colors duration-500"></div>
            </div>
            <div className="flex items-center justify-between gap-1 relative z-10">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate" title="Valore/Atleta (ARPU)">Valore/Atleta</span>
            </div>
            <div className="mt-2 relative z-10">
              <span className="text-lg font-black text-blue-400">{formatPrice(metrics.averageValuePerAthlete)}</span>
              <span className="text-[9px] text-slate-500 block">ARPU Mensile Stimato</span>
            </div>
          </div>

          {/* Tasso di Rinnovo */}
          <div className="p-4 rounded-xl bg-slate-900/40 backdrop-blur-md border border-slate-800/60 flex flex-col justify-between relative group hover:bg-slate-900/60 hover:border-yellow-500/50 hover:shadow-[0_0_20px_rgba(234,179,8,0.15)] transition-all duration-300">
            <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
              <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-yellow-500/5 rounded-full blur-xl group-hover:bg-yellow-500/20 transition-colors duration-500"></div>
            </div>
            <div className="flex items-center justify-between gap-1 relative z-10">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Tasso Rinnovo</span>
            </div>
            <div className="mt-2 relative z-10">
              <span className="text-lg font-black text-yellow-400">{metrics.renewalRate}%</span>
              <span className="text-[9px] text-slate-500 block">Fidelizzazione Contratti</span>
            </div>
          </div>

          {/* Churn Stimato */}
          <div className="p-4 rounded-xl bg-slate-900/40 backdrop-blur-md border border-slate-800/60 flex flex-col justify-between relative group hover:bg-slate-900/60 hover:border-rose-500/50 hover:shadow-[0_0_20px_rgba(244,63,94,0.15)] transition-all duration-300">
            <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
              <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-rose-500/5 rounded-full blur-xl group-hover:bg-rose-500/20 transition-colors duration-500"></div>
            </div>
            <div className="flex items-center justify-between gap-1 relative z-10">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Churn Rate</span>
            </div>
            <div className="mt-2 relative z-10">
              <span className="text-lg font-black text-rose-400">{metrics.estimatedChurn}%</span>
              <span className="text-[9px] text-slate-500 block">Abbandono Stimato</span>
            </div>
          </div>
        </div>
      </div>

      {/* MODALE GUIDA FORMULE KPI FINANCIAL */}
      {showKPIInfoModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowKPIInfoModal(false)}
        >
          <div
            className="w-full max-w-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl shadow-2xl p-6 space-y-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Guida Formule KPI & Metriche Ricorrenti</h3>
                  <p className="text-xs text-slate-400">Algoritmi applicati per l'analisi finanziaria e contrattuale</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowKPIInfoModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[65vh] overflow-y-auto pr-1">
              {[
                { key: 'mrr', label: 'MRR (Monthly Recurring Revenue)' },
                { key: 'arr', label: 'ARR (Annual Recurring Revenue)' },
                { key: 'collectionRate', label: 'Tasso di Incasso' },
                { key: 'averageValuePerAthlete', label: 'Valore Medio / ARPU' },
                { key: 'renewalRate', label: 'Tasso di Rinnovo' },
                { key: 'estimatedChurn', label: 'Churn Rate (Tasso Abbandono)' },
              ].map(({ key, label }) => {
                const info = getKPIFormulaTooltip(key);
                return (
                  <div key={key} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <span className="text-xs font-bold text-[var(--color-primary)] block">{label}</span>
                    <p className="text-xs font-mono font-bold text-white">{info.formula}</p>
                    <p className="text-[11px] text-slate-400">{info.description}</p>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex justify-end border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowKPIInfoModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Chiudi Guida
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GRAFICO ANDAMENTO */}
      <DashboardChart />

      {/* WIDGET AI ATHLETE TRAINING COPILOT */}
      <AITrainingCopilotWidget />

      {/* SEZIONI RAPIDE E OPERATIVE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLONNA 1: Scadenze di Oggi e Prossimi 7 Giorni */}
        <div className="space-y-6">
          {/* Scadenze di Oggi */}
          <div className="p-5 rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 shadow-2xl space-y-4 relative overflow-hidden group">
            <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full blur-[50px] pointer-events-none group-hover:bg-white/10 transition-all duration-700" />
            <div className="relative z-10 flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" /> Scadenze di Oggi
              </h3>
              <span className="text-[10px] font-bold text-slate-500 uppercase">{todayDeadlines.length} Totali</span>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
              {todayDeadlines.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center">
                    <CheckSquare className="w-5 h-5 text-slate-600" />
                  </div>
                  <p className="text-xs text-slate-500 font-medium">Nessuna scadenza prevista per oggi.<br/>Tutto sotto controllo! ✨</p>
                </div>
              ) : (
                todayDeadlines.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => setActiveTab(item.tab)}
                    className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/50 hover:border-[var(--color-primary)]/50 hover:bg-slate-800/50 flex items-center justify-between cursor-pointer transition-all duration-300 group/item"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400 group-hover/item:text-white transition-colors">
                        {item.title.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="text-[9px] font-bold uppercase text-[var(--color-primary)] px-1.5 py-0.5 rounded bg-[var(--color-primary)]/10">
                          {item.category}
                        </span>
                        <h4 className="text-xs font-bold text-white mt-1 line-clamp-1">{item.title}</h4>
                        <p className="text-[10px] text-slate-400">{item.subtitle}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover/item:text-[var(--color-primary)] group-hover/item:translate-x-1 transition-all" />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Prossimi 7 Giorni */}
          <div className="p-5 rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 shadow-2xl space-y-4 relative overflow-hidden group">
            <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full blur-[50px] pointer-events-none group-hover:bg-white/10 transition-all duration-700" />
            <div className="relative z-10 flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sky-400" /> Prossimi 7 Giorni
              </h3>
              <button onClick={() => setActiveTab('scadenze')} className="text-xs font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1">
                Vedi Tutti <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              {upcoming7Days.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-slate-600" />
                  </div>
                  <p className="text-xs text-slate-500 font-medium">Nessuna scadenza critica<br/>nei prossimi 7 giorni.</p>
                </div>
              ) : (
                upcoming7Days.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => setActiveTab(item.tab)}
                    className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/50 hover:border-sky-500/50 hover:bg-slate-800/50 flex items-center justify-between cursor-pointer transition-all duration-300"
                  >
                    <span className="text-xs font-medium text-slate-200 line-clamp-1 pr-2">{item.title}</span>
                    <span className="text-[10px] font-bold px-2 py-1 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 whitespace-nowrap">
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
          <div className="p-5 rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 shadow-2xl space-y-4 relative overflow-hidden group">
            <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full blur-[50px] pointer-events-none group-hover:bg-white/10 transition-all duration-700" />
            <div className="relative z-10 flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-yellow-400" /> Rinnovi da Contattare
              </h3>
              <button onClick={() => setActiveTab('rinnovi')} className="text-xs font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1">
                Trattative <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              {renewalsToContact.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 text-slate-600" />
                  </div>
                  <p className="text-xs text-slate-500 font-medium">Nessun rinnovo in trattativa<br/>al momento.</p>
                </div>
              ) : (
                renewalsToContact.map(ren => (
                  <div
                    key={ren.id}
                    onClick={() => setActiveTab('rinnovi')}
                    className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/50 hover:border-yellow-500/50 hover:bg-slate-800/50 flex items-center justify-between cursor-pointer transition-all duration-300"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center text-[10px] font-bold text-yellow-500">
                        {ren.athleteName.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">{ren.athleteName}</h4>
                        <p className="text-[10px] text-slate-400">Scadenza: {formatDate(ren.endDate)}</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-1 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 uppercase">
                      {ren.status.replace('_', ' ')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Attività Urgenti */}
          <div className="p-5 rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 shadow-2xl space-y-4 relative overflow-hidden group">
            <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full blur-[50px] pointer-events-none group-hover:bg-white/10 transition-all duration-700" />
            <div className="relative z-10 flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-purple-400" /> Attività Urgenti
              </h3>
              <button onClick={() => setActiveTab('attivita')} className="text-xs font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1">
                Tutte le Task <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              {urgentTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center">
                    <CheckSquare className="w-5 h-5 text-slate-600" />
                  </div>
                  <p className="text-xs text-slate-500 font-medium">Nessuna attività urgente<br/>in sospeso. Ottimo lavoro!</p>
                </div>
              ) : (
                urgentTasks.map(t => (
                  <div
                    key={t.id}
                    onClick={() => setActiveTab('attivita')}
                    className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/50 hover:border-purple-500/50 hover:bg-slate-800/50 flex items-center justify-between cursor-pointer transition-all duration-300"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-[10px] font-bold text-purple-400">
                        {t.athleteName ? t.athleteName.substring(0, 2).toUpperCase() : 'TK'}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white line-clamp-1">{t.title}</h4>
                        <p className="text-[10px] text-slate-400 line-clamp-1">{t.athleteName || 'Generale'}</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-1 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase">
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
          <div className="p-5 rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 shadow-2xl space-y-4 relative overflow-hidden group">
            <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full blur-[50px] pointer-events-none group-hover:bg-white/10 transition-all duration-700" />
            <div className="relative z-10 flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-rose-400" /> Certificati Medici
              </h3>
              <button onClick={() => setActiveTab('documenti')} className="text-xs font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1">
                Documenti <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              {medicalAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center">
                    <FileCheck2 className="w-5 h-5 text-slate-600" />
                  </div>
                  <p className="text-xs text-slate-500 font-medium">Tutti i certificati agonistici<br/>sono in regola.</p>
                </div>
              ) : (
                medicalAlerts.map(({ athlete, status }) => (
                  <div
                    key={athlete.id}
                    onClick={() => setActiveTab('documenti')}
                    className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/50 hover:border-rose-500/50 hover:bg-slate-800/50 flex items-center justify-between cursor-pointer transition-all duration-300"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        status === 'missing' ? 'bg-orange-500/10 text-orange-400' : status === 'expired' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {athlete.fullName.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">{athlete.fullName}</h4>
                        <p className="text-[10px] text-slate-400">
                          {athlete.medicalCertificateExpiryDate ? `Scadenza: ${formatDate(athlete.medicalCertificateExpiryDate)}` : 'Nessuna data registrata'}
                        </p>
                      </div>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-1 rounded border uppercase ${
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
                <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-slate-600" />
                  </div>
                  <p className="text-xs text-slate-500 font-medium">Nessuna comunicazione registrata<br/>di recente.</p>
                </div>
              ) : (
                recentCommunications.map(comm => (
                  <div
                    key={comm.id}
                    onClick={() => setActiveTab('comunicazioni')}
                    className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/50 hover:border-emerald-500/50 hover:bg-slate-800/50 flex items-center justify-between cursor-pointer transition-all duration-300"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-[10px] font-bold text-emerald-400">
                        {comm.athleteName.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">{comm.athleteName}</h4>
                        <p className="text-[10px] text-slate-400 truncate max-w-[140px]">{comm.subject}</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
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
