import React, { useState, useMemo } from 'react';
import {
  UserPlus,
  DollarSign,
  ChevronRight,
  RefreshCw,
  FileCheck2,
  ArrowUpRight,
  Calendar,
  Flame,
  HelpCircle,
  BarChart3,
  CheckSquare,
  Dumbbell,
  X,
  Info,
  Sparkles,
  Briefcase,
  Users,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAthletes } from '../../context/AthletesContext';
import { usePackages } from '../../context/PackagesContext';
import { useSubscriptions } from '../../context/SubscriptionsContext';
import { usePayments } from '../../context/PaymentsContext';
import { useRenewals } from '../../context/RenewalsContext';
import { useTasks } from '../../context/TasksContext';
import { useCommunications } from '../../context/CommunicationsContext';
import { useWorkouts } from '../../context/WorkoutsContext';
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
import { DashboardChart } from './components/DashboardChart';
import { TodayPrioritiesWidget, PriorityItem } from './components/TodayPrioritiesWidget';
import { RecentActivityWidget, SystemActivityItem } from './components/RecentActivityWidget';
import { InboxAIWidget } from '../../components/dashboard/InboxAIWidget';
import { ContentsTodayWidget } from '../../components/dashboard/ContentsTodayWidget';

export const DashboardPage: React.FC = () => {
  const { setActiveTab, ownerProfile } = useApp();
  const { athletes, setSelectedAthleteId } = useAthletes();
  const { packages } = usePackages();
  const { subscriptions } = useSubscriptions();
  const { payments } = usePayments();
  const { renewals } = useRenewals();
  const { tasks } = useTasks();
  const { communications } = useCommunications();
  const { allAssignedWorkouts } = useWorkouts();

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const todayStr = now.toISOString().slice(0, 10);

  const [showKPIInfoModal, setShowKPIInfoModal] = useState(false);

  // 1. Calcoli Metriche Generali dai Context
  const metrics = useMemo(() => {
    const activeAthletes = athletes.filter((a) => a.status === 'active').length;
    const trialAthletes = athletes.filter((a) => a.status === 'trial').length;
    const suspendedAthletes = athletes.filter((a) => a.status === 'suspended').length;
    const newAthletes = athletes.filter((a) => {
      const createdDaysAgo = Math.floor((now.getTime() - new Date(a.createdAt).getTime()) / (1000 * 3600 * 24));
      return createdDaysAgo <= 30;
    }).length;

    const expiringSubscriptions = subscriptions.filter((s) => {
      if (s.status !== 'active') return false;
      const calc = calculateSubscriptionStatus(s);
      return calc.daysRemaining >= 0 && calc.daysRemaining <= 30;
    }).length;

    const activePayments = payments.filter((p) => p.status !== 'cancelled' && p.status !== 'refunded' && p.residualAmount > 0);

    const expiringPayments = activePayments.filter((p) => {
      const calc = calculatePaymentStatus(p);
      return !calc.isOverdue && calc.daysRemaining >= 0 && calc.daysRemaining <= 30;
    }).length;

    const overduePayments = activePayments.filter((p) => {
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

    const tasksToComplete = tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled').length;

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

  // Atleti senza scheda attiva
  const unassignedAthletes = useMemo(() => {
    return athletes.filter((a) => {
      return !allAssignedWorkouts.some((aw) => aw.athlete_id === a.id && aw.is_active);
    });
  }, [athletes, allAssignedWorkouts]);

  // Task urgenti
  const urgentTasks = useMemo(() => {
    return tasks
      .filter(
        (t) =>
          t.status !== 'completed' &&
          t.status !== 'cancelled' &&
          (t.priority === 'urgent' || t.priority === 'high' || getDaysRemaining(t.dueDate) < 0)
      )
      .slice(0, 5);
  }, [tasks]);

  // ── GENERATORE DINAMICO "PRIORITÀ DI OGGI" ──
  const todayPriorities: PriorityItem[] = useMemo(() => {
    const list: PriorityItem[] = [];

    // 1. Rate Scadute (Critiche)
    const overdueList = payments.filter((p) => {
      if (p.status === 'cancelled' || p.status === 'refunded' || p.residualAmount <= 0) return false;
      return calculatePaymentStatus(p).isOverdue;
    });
    if (overdueList.length > 0) {
      const first = overdueList[0];
      list.push({
        id: `pr-overdue-${first.id}`,
        type: 'overdue_payment',
        priorityLevel: 'high',
        title: `Rata Scaduta: ${first.athleteName}`,
        subtitle: `Residuo di € ${first.residualAmount.toFixed(2)} da sollecitare o registrare`,
        actionLabel: 'Registra Pagamento',
        targetTab: 'pagamenti',
        athleteId: first.athleteId,
      });
    }

    // 2. Atleti da Avviare (Senza Scheda Assegnata)
    if (unassignedAthletes.length > 0) {
      const first = unassignedAthletes[0];
      list.push({
        id: `pr-unassigned-${first.id}`,
        type: 'unassigned_workout',
        priorityLevel: 'medium',
        title: `Scheda da Assegnare: ${first.fullName}`,
        subtitle: `${unassignedAthletes.length} atleta/i senza scheda di allenamento attiva`,
        actionLabel: 'Assegna Scheda',
        targetTab: 'schede',
        athleteId: first.id,
      });
    }

    // 3. Task Urgenti con Scadenza Oggi o Scaduti
    if (urgentTasks.length > 0) {
      const first = urgentTasks[0];
      list.push({
        id: `pr-task-${first.id}`,
        type: 'urgent_task',
        priorityLevel: first.priority === 'urgent' ? 'high' : 'medium',
        title: `Task: ${first.title}`,
        subtitle: first.athleteName ? `Atleta: ${first.athleteName}` : 'Attività prioritaria del giorno',
        actionLabel: 'Completa Task',
        targetTab: 'attivita',
      });
    }

    // 4. Nuovi Lead / Iscritti da Contattare
    const newLeads = athletes.filter((a) => a.status === 'inactive');
    if (newLeads.length > 0 && list.length < 3) {
      const first = newLeads[0];
      list.push({
        id: `pr-lead-${first.id}`,
        type: 'new_lead',
        priorityLevel: 'normal',
        title: `Contatta: ${first.fullName}`,
        subtitle: 'Invia il messaggio di benvenuto o pianifica il check-in conoscitivo',
        actionLabel: 'Invia Messaggio',
        targetTab: 'messaggi',
        athleteId: first.id,
      });
    }

    return list.slice(0, 3);
  }, [payments, unassignedAthletes, urgentTasks, athletes]);

  // ── GENERATORE DINAMICO "ULTIME ATTIVITÀ DI SISTEMA" ──
  const systemActivities: SystemActivityItem[] = useMemo(() => {
    const list: SystemActivityItem[] = [];

    // Comunicazioni recenti
    communications.slice(0, 3).forEach((c) => {
      list.push({
        id: `act-comm-${c.id}`,
        type: 'message',
        title: `Comunicazione: ${c.athleteName}`,
        description: c.subject || 'Messaggio inviato',
        timeFormatted: new Date(c.dateTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
        targetTab: 'comunicazioni',
      });
    });

    // Pagamenti recenti
    payments
      .filter((p) => (p.paymentDate || p.paidDate))
      .slice(0, 2)
      .forEach((p) => {
        list.push({
          id: `act-pay-${p.id}`,
          type: 'payment',
          title: `Incasso Registrato: € ${p.paidAmount.toFixed(2)}`,
          description: `Atleta: ${p.athleteName}`,
          timeFormatted: 'Recente',
          targetTab: 'pagamenti',
        });
      });

    return list.slice(0, 5);
  }, [communications, payments]);

  // 2. Sezioni Rapide
  const todayDeadlines = useMemo(() => {
    const list: { title: string; subtitle: string; category: string; tab: NavigationTab }[] = [];

    payments.forEach((p) => {
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

    subscriptions.forEach((s) => {
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

    tasks.forEach((t) => {
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

    payments.forEach((p) => {
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

    subscriptions.forEach((s) => {
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
      .filter((r) => ['to_contact', 'contacted', 'interested', 'evaluating', 'unreachable'].includes(r.status))
      .slice(0, 5);
  }, [renewals]);

  const medicalAlerts = useMemo(() => {
    return athletes
      .map((a) => ({ athlete: a, status: getMedicalCertificateStatus(a) }))
      .filter((item) => item.status !== 'valid')
      .slice(0, 5);
  }, [athletes]);

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return '-';
    return new Date(isoStr).toLocaleDateString('it-IT');
  };

  return (
    <div className="space-y-7 max-w-[1600px] mx-auto pb-12 animate-in fade-in duration-200">
      {/* ─── 1. HERO SECTION OPERATIVA: CENTRO COMANDO ─── */}
      <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-slate-900/95 via-slate-950 to-slate-950 border border-slate-800 shadow-2xl space-y-6 relative overflow-hidden group">
        <div className="absolute right-0 top-0 w-96 h-96 bg-[var(--color-primary)]/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-[var(--color-primary)]/15 transition-all duration-700" />

        {/* Riga Superiore: Saluto e Pulsanti Rapidi */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10 border-b border-slate-800/80 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold text-[10px] uppercase tracking-wider border border-[var(--color-primary)]/25 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Centro di Controllo Gestionale & Performance
              </span>
              <span className="text-xs text-slate-500 font-semibold">
                {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Centro Comando, {ownerProfile?.fullName || 'Coach Antonio'} 👋
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-medium">
              Monitoraggio finanziario, controllo diretto delle trattative ed analisi avanzata delle schede atleta.
            </p>
          </div>

          {/* 3 Pulsanti Rapidi Primari */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('atleti')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-[var(--color-primary)] text-white font-bold text-xs transition-all shadow cursor-pointer active:scale-95"
            >
              <UserPlus className="w-4 h-4 text-[var(--color-primary)]" />
              <span>Nuovo Atleta</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('schede')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-400 text-white font-bold text-xs transition-all shadow cursor-pointer active:scale-95"
            >
              <Dumbbell className="w-4 h-4 text-amber-400" />
              <span>Nuova Scheda</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pagamenti')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-slate-950 font-black text-xs transition-all shadow-[0_0_20px_rgba(234,179,8,0.25)] cursor-pointer active:scale-95"
            >
              <DollarSign className="w-4 h-4" />
              <span>Registra Incasso</span>
            </button>
          </div>
        </div>

        {/* Riepilogo Operativo Integrato a 4 Indicatori Live con Evidenza Azioni */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10">
          {/* Box 1: Lead da Contattare */}
          <button
            type="button"
            onClick={() => setActiveTab('atleti')}
            className={`p-3.5 rounded-2xl border transition-all text-left cursor-pointer group/box flex flex-col justify-between ${
              metrics.newAthletes > 0
                ? 'bg-sky-950/20 border-sky-500/40 hover:border-sky-500 hover:bg-sky-950/30'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider group-hover/box:text-sky-400 transition-colors">
                Lead / Nuovi
              </span>
              <Users className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <div className="text-xl sm:text-2xl font-black text-white font-mono">{metrics.newAthletes}</div>
              {metrics.newAthletes > 0 ? (
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  Da Contattare
                </span>
              ) : (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-900 text-slate-500 border border-slate-800">
                  In Regola
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 font-medium block mt-1">
              {metrics.newAthletes > 0 ? 'Nuovi atleti o lead' : 'Nessun lead pendente'}
            </span>
          </button>

          {/* Box 2: Schede da Assegnare */}
          <button
            type="button"
            onClick={() => setActiveTab('schede')}
            className={`p-3.5 rounded-2xl border transition-all text-left cursor-pointer group/box flex flex-col justify-between ${
              unassignedAthletes.length > 0
                ? 'bg-amber-950/25 border-amber-500/50 hover:border-amber-400 hover:bg-amber-950/35 shadow-sm shadow-amber-500/10'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider group-hover/box:text-amber-400 transition-colors">
                Da Assegnare
              </span>
              <Dumbbell className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <div className={`text-xl sm:text-2xl font-black font-mono ${unassignedAthletes.length > 0 ? 'text-amber-400' : 'text-white'}`}>
                {unassignedAthletes.length}
              </div>
              {unassignedAthletes.length > 0 ? (
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                  Richiede Azione
                </span>
              ) : (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-900 text-slate-500 border border-slate-800">
                  In Regola
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 font-medium block mt-1">
              {unassignedAthletes.length > 0 ? 'Atleti senza programma' : 'Tutte le schede assegnate'}
            </span>
          </button>

          {/* Box 3: Incassi in Arrivo / Scaduti */}
          <button
            type="button"
            onClick={() => setActiveTab('scadenze')}
            className={`p-3.5 rounded-2xl border transition-all text-left cursor-pointer group/box flex flex-col justify-between ${
              metrics.overduePayments > 0
                ? 'bg-rose-950/25 border-rose-500/50 hover:border-rose-400 hover:bg-rose-950/35'
                : (metrics.expiringPayments + metrics.overduePayments) > 0
                ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-500 hover:bg-amber-950/30'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider group-hover/box:text-emerald-400 transition-colors">
                Rate da Gestire
              </span>
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <div className={`text-xl sm:text-2xl font-black font-mono ${metrics.overduePayments > 0 ? 'text-rose-400' : 'text-white'}`}>
                {metrics.expiringPayments + metrics.overduePayments}
              </div>
              {metrics.overduePayments > 0 ? (
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {metrics.overduePayments} Scadute
                </span>
              ) : metrics.expiringPayments > 0 ? (
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  In Arrivo
                </span>
              ) : (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-900 text-slate-500 border border-slate-800">
                  In Regola
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 font-medium block mt-1">
              {metrics.overduePayments > 0 ? 'Solleciti necessari' : 'Nessun insoluto pendente'}
            </span>
          </button>

          {/* Box 4: Task Urgenti */}
          <button
            type="button"
            onClick={() => setActiveTab('attivita')}
            className={`p-3.5 rounded-2xl border transition-all text-left cursor-pointer group/box flex flex-col justify-between ${
              urgentTasks.length > 0
                ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-400 hover:bg-amber-950/30'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider group-hover/box:text-[var(--color-primary)] transition-colors">
                Task Urgenti
              </span>
              <Briefcase className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <div className="text-xl sm:text-2xl font-black text-white font-mono">{urgentTasks.length}</div>
              {urgentTasks.length > 0 ? (
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Oggi
                </span>
              ) : (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-900 text-slate-500 border border-slate-800">
                  Completati
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 font-medium block mt-1">
              {urgentTasks.length > 0 ? 'Scadenze prioritarie' : 'Tutti i task completati'}
            </span>
          </button>
        </div>
      </div>

      {/* ─── 2. PRIORITÀ DI OGGI (MAX 3 TASK FOCUS) ─── */}
      <TodayPrioritiesWidget
        priorities={todayPriorities}
        onNavigate={(tab, athleteId) => {
          if (athleteId) {
            setSelectedAthleteId(athleteId);
          }
          setActiveTab(tab);
        }}
      />

      {/* ─── 3. KPI PRINCIPALI & SEMANTICI ─── */}
      <DashboardMetricCards
        metrics={metrics}
        onNavigateTab={setActiveTab}
        formatPrice={formatPrice}
      />

      {/* ─── 3.5 HUB COACH: INBOX AI & PIPELINE CONTENUTI ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InboxAIWidget />
        <ContentsTodayWidget />
      </div>

      {/* ─── 4. FINANCIAL PERFORMANCE & GRAFICI MRR / ARR ─── */}
      <div className="p-6 rounded-3xl bg-slate-950/90 border border-slate-800/90 shadow-2xl space-y-4 relative group/kpi">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-tight">KPI & Financial Performance</h3>
              <p className="text-[11px] text-slate-400 font-medium">Metriche contrattuali e ricorrenti</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowKPIInfoModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer shadow-sm self-start sm:self-auto"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            <span>Guida Formule</span>
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 relative z-10 pt-1">
          {/* MRR */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">MRR</span>
            <div className="mt-2">
              <span className="text-lg font-black text-[var(--color-primary)] font-mono">{formatPrice(metrics.mrr)}</span>
              <span className="text-[9px] text-slate-500 block mt-0.5">Ricavo Mensile Ricorrente</span>
            </div>
          </div>

          {/* ARR */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ARR</span>
            <div className="mt-2">
              <span className="text-lg font-black text-white font-mono">{formatPrice(metrics.arr)}</span>
              <span className="text-[9px] text-slate-500 block mt-0.5">Proiezione Annuale (MRR×12)</span>
            </div>
          </div>

          {/* Tasso di Incasso */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tasso Incasso</span>
            <div className="mt-2">
              <span className="text-lg font-black text-emerald-400 font-mono">{metrics.collectionRate}%</span>
              <span className="text-[9px] text-slate-500 block mt-0.5">Saldo su Entrate Previste</span>
            </div>
          </div>

          {/* Valore Medio Atleta (ARPU) */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valore/Atleta</span>
            <div className="mt-2">
              <span className="text-lg font-black text-sky-400 font-mono">{formatPrice(metrics.averageValuePerAthlete)}</span>
              <span className="text-[9px] text-slate-500 block mt-0.5">ARPU Mensile Stimato</span>
            </div>
          </div>

          {/* Tasso di Rinnovo */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tasso Rinnovo</span>
            <div className="mt-2">
              <span className="text-lg font-black text-amber-400 font-mono">{metrics.renewalRate}%</span>
              <span className="text-[9px] text-slate-500 block mt-0.5">Fidelizzazione Contratti</span>
            </div>
          </div>

          {/* Churn Stimato */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Churn Rate</span>
            <div className="mt-2">
              <span className="text-lg font-black text-rose-400 font-mono">{metrics.estimatedChurn}%</span>
              <span className="text-[9px] text-slate-500 block mt-0.5">Abbandono Stimato</span>
            </div>
          </div>
        </div>
      </div>

      {/* GRAFICO ANDAMENTO */}
      <DashboardChart />

      {/* ─── 5. GRIGLIA SEZIONI OPERATIVE RAPIDE & ULTIME ATTIVITÀ ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLONNA 1: Scadenze di Oggi e Prossimi 7 Giorni */}
        <div className="space-y-6">
          {/* Scadenze di Oggi */}
          <div className="p-5 rounded-3xl bg-slate-950/90 border border-slate-800/90 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" /> Scadenze di Oggi
              </h4>
              <span className="text-[10px] font-bold text-slate-500 uppercase font-mono">{todayDeadlines.length} Totali</span>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
              {todayDeadlines.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center space-y-1.5">
                  <div className="w-9 h-9 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400">
                    <CheckSquare className="w-4 h-4" />
                  </div>
                  <p className="text-xs text-slate-300 font-bold">Nessuna scadenza oggi.</p>
                  <p className="text-[11px] text-slate-500">Ottimo, giornata pulita! ✨</p>
                </div>
              ) : (
                todayDeadlines.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => setActiveTab(item.tab)}
                    className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-[var(--color-primary)] hover:bg-slate-900 flex items-center justify-between cursor-pointer transition-all duration-200 group/item"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-[10px] font-black text-amber-400">
                        {item.title.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h5 className="text-xs font-black text-white line-clamp-1">{item.title}</h5>
                        <p className="text-[10px] text-slate-400">{item.subtitle}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover/item:text-[var(--color-primary)] group-hover/item:translate-x-0.5 transition-all" />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Prossimi 7 Giorni */}
          <div className="p-5 rounded-3xl bg-slate-950/90 border border-slate-800/90 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sky-400" /> Prossimi 7 Giorni
              </h4>
              <button
                type="button"
                onClick={() => setActiveTab('scadenze')}
                className="text-xs font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                Vedi Tutti <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              {upcoming7Days.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center space-y-1.5">
                  <div className="w-9 h-9 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <p className="text-xs text-slate-300 font-bold">Nessuna scadenza nei prossimi 7 giorni.</p>
                  <p className="text-[11px] text-slate-500">Tutto regolare e sotto controllo.</p>
                </div>
              ) : (
                upcoming7Days.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => setActiveTab(item.tab)}
                    className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-sky-500/50 hover:bg-slate-900 flex items-center justify-between cursor-pointer transition-all duration-200"
                  >
                    <span className="text-xs font-bold text-slate-200 line-clamp-1 pr-2">{item.title}</span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 whitespace-nowrap font-mono">
                      Tra {item.daysLeft} gg
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* COLONNA 2: Rinnovi da Contattare & Attività Urgenti */}
        <div className="space-y-6">
          {/* Rinnovi da Contattare */}
          <div className="p-5 rounded-3xl bg-slate-950/90 border border-slate-800/90 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-amber-400" /> Rinnovi da Contattare
              </h4>
              <button
                type="button"
                onClick={() => setActiveTab('rinnovi')}
                className="text-xs font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                Trattative <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              {renewalsToContact.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center space-y-1.5">
                  <div className="w-9 h-9 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <p className="text-xs text-slate-300 font-bold">Nessun rinnovo aperto al momento.</p>
                  <p className="text-[11px] text-slate-500">Nessuna trattativa pendente.</p>
                </div>
              ) : (
                renewalsToContact.map((ren) => (
                  <div
                    key={ren.id}
                    onClick={() => setActiveTab('rinnovi')}
                    className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-900 flex items-center justify-between cursor-pointer transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[10px] font-black text-amber-400">
                        {ren.athleteName.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h5 className="text-xs font-black text-white">{ren.athleteName}</h5>
                        <p className="text-[10px] text-slate-400">Scadenza: {formatDate(ren.endDate)}</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase font-mono">
                      {ren.status.replace('_', ' ')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Certificati Medici (Compatto e Allineato a Prossimi 7 Giorni) */}
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-950/90 border border-slate-800/90 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-rose-400" /> Certificati Medici
              </h4>
              <button
                type="button"
                onClick={() => setActiveTab('documenti')}
                className="text-xs font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                Documenti <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
              {medicalAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-4 text-center space-y-1">
                  <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400">
                    <FileCheck2 className="w-4 h-4" />
                  </div>
                  <p className="text-xs text-slate-300 font-bold">Tutti i certificati medici sono in regola.</p>
                  <p className="text-[11px] text-slate-500">Nessun documento scaduto o in scadenza.</p>
                </div>
              ) : (
                medicalAlerts.map(({ athlete, status }) => (
                  <div
                    key={athlete.id}
                    onClick={() => setActiveTab('documenti')}
                    className="py-2 px-2.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-rose-500/50 hover:bg-slate-900 flex items-center justify-between cursor-pointer transition-all duration-200"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black shrink-0 ${
                          status === 'missing'
                            ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                            : status === 'expired'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {athlete.fullName.substring(0, 2).toUpperCase()}
                      </div>
                      <h5 className="text-xs font-black text-white truncate max-w-[130px] sm:max-w-[160px]">
                        {athlete.fullName}
                      </h5>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {athlete.medicalCertificateExpiryDate && (
                        <span className="text-[10px] text-slate-400 hidden sm:inline font-mono">
                          {formatDate(athlete.medicalCertificateExpiryDate)}
                        </span>
                      )}
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border uppercase font-mono ${
                          status === 'missing'
                            ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                            : status === 'expired'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}
                      >
                        {status === 'missing' ? 'Mancante' : status === 'expired' ? 'Scaduto' : 'In Scadenza'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* COLONNA 3: Attività Urgenti & Mini Timeline */}
        <div className="space-y-6">
          {/* Attività Urgenti / Task */}
          <div className="p-5 rounded-3xl bg-slate-950/90 border border-slate-800/90 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-purple-400" /> Attività & Task
              </h4>
              <button
                type="button"
                onClick={() => setActiveTab('attivita')}
                className="text-xs font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                Tutti i Task <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
              {urgentTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center space-y-1.5">
                  <div className="w-9 h-9 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400">
                    <CheckSquare className="w-4 h-4" />
                  </div>
                  <p className="text-xs text-slate-300 font-bold">Nessun task urgente in sospeso.</p>
                  <p className="text-[11px] text-slate-500">Tutti i compiti sono aggiornati! ✨</p>
                </div>
              ) : (
                urgentTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setActiveTab('attivita')}
                    className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-900 flex items-center justify-between cursor-pointer transition-all duration-200"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-[10px] font-black text-purple-400 shrink-0">
                        {t.athleteName ? t.athleteName.substring(0, 2).toUpperCase() : 'TK'}
                      </div>
                      <div className="min-w-0">
                        <h5 className="text-xs font-black text-white truncate">{t.title}</h5>
                        <p className="text-[10px] text-slate-400 truncate">{t.athleteName || 'Generale'}</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase font-mono shrink-0">
                      {t.priority}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Mini Timeline Ultime Attività */}
          <RecentActivityWidget
            activities={systemActivities}
            onNavigate={setActiveTab}
          />
        </div>
      </div>

      {/* MODALE GUIDA FORMULE KPI FINANCIAL */}
      {showKPIInfoModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowKPIInfoModal(false)}
        >
          <div
            className="w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Guida Formule KPI & Metriche Ricorrenti</h3>
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
                  <div key={key} className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5">
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
    </div>
  );
};
