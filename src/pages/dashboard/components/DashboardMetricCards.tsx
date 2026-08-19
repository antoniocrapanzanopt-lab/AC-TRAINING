import React from 'react';
import {
  Users,
  UserPlus,
  UserCheck,
  UserX,
  CreditCard,
  Clock,
  DollarSign,
  Briefcase,
  Users2,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { NavigationTab } from '../../../types';

export interface DashboardMetrics {
  activeAthletes: number;
  newAthletes: number;
  trialAthletes: number;
  suspendedAthletes: number;
  expiringSubscriptions: number;
  expiringPayments: number;
  overduePayments: number;
  totalToCollect: number;
  collectedThisMonth: number;
  tasksToComplete: number;
}

interface DashboardMetricCardsProps {
  metrics: DashboardMetrics;
  onNavigateTab: (tab: NavigationTab) => void;
  formatPrice: (price: number) => string;
}

export const DashboardMetricCards: React.FC<DashboardMetricCardsProps> = ({
  metrics,
  onNavigateTab,
  formatPrice,
}) => {
  return (
    <div className="space-y-6">
      {/* ── GRUPPO 1: ACQUISIZIONE & ATLETI ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Users2 className="w-4 h-4 text-sky-400" />
            <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider">
              Acquisizione & Stato Atleti
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Totale iscritti: {metrics.activeAthletes + metrics.trialAthletes + metrics.suspendedAthletes}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* ATLETI ATTIVI (POSITIVO / OPERATIVO) */}
          <button
            type="button"
            onClick={() => onNavigateTab('atleti')}
            className="p-4 rounded-2xl bg-slate-950/90 border border-emerald-500/30 hover:border-emerald-500/60 hover:bg-slate-900/80 transition-all text-left shadow-lg cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider group-hover:text-emerald-400 transition-colors">
                Atleti Attivi
              </span>
              <div className="w-7 h-7 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <UserCheck className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-white font-mono">{metrics.activeAthletes}</div>
              <span className="text-[10px] text-emerald-400/90 font-bold block mt-0.5">
                In regola con l'iscrizione
              </span>
            </div>
          </button>

          {/* NUOVI ATLETI (OPERATIVO / CRESCITA) */}
          <button
            type="button"
            onClick={() => onNavigateTab('atleti')}
            className="p-4 rounded-2xl bg-slate-950/90 border border-sky-500/30 hover:border-sky-500/60 hover:bg-slate-900/80 transition-all text-left shadow-lg cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider group-hover:text-sky-400 transition-colors">
                Nuovi Iscritti
              </span>
              <div className="w-7 h-7 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
                <UserPlus className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-white font-mono">{metrics.newAthletes}</div>
              <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                {metrics.newAthletes > 0 ? 'Ultimi 30 giorni' : 'Nessun nuovo lead'}
              </span>
            </div>
          </button>

          {/* IN PROVA (NEUTRO) */}
          <button
            type="button"
            onClick={() => onNavigateTab('atleti')}
            className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 hover:border-amber-500/40 hover:bg-slate-900/80 transition-all text-left shadow-lg cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider group-hover:text-amber-400 transition-colors">
                In Prova
              </span>
              <div className="w-7 h-7 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                <Users className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-slate-200 font-mono">{metrics.trialAthletes}</div>
              <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                {metrics.trialAthletes > 0 ? 'Periodo di prova' : 'Nessun atleta in prova'}
              </span>
            </div>
          </button>

          {/* SOSPESI (NEUTRO/ATTENZIONE) */}
          <button
            type="button"
            onClick={() => onNavigateTab('atleti')}
            className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 hover:border-slate-700 hover:bg-slate-900/80 transition-all text-left shadow-lg cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider group-hover:text-slate-300 transition-colors">
                Sospesi
              </span>
              <div className="w-7 h-7 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:scale-110 transition-transform">
                <UserX className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-slate-400 font-mono">{metrics.suspendedAthletes}</div>
              <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                {metrics.suspendedAthletes > 0 ? 'Abbonamento in pausa' : 'Tutti gli atleti attivi'}
              </span>
            </div>
          </button>

          {/* ABB. IN SCADENZA (ATTENZIONE / AMBRA) */}
          <button
            type="button"
            onClick={() => onNavigateTab('abbonamenti')}
            className={`p-4 rounded-2xl bg-slate-950/90 border transition-all text-left shadow-lg cursor-pointer group flex flex-col justify-between ${
              metrics.expiringSubscriptions > 0
                ? 'border-amber-500/40 hover:border-amber-500/70 hover:bg-slate-900/80'
                : 'border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider group-hover:text-amber-400 transition-colors">
                Abb. in Scadenza
              </span>
              <div className="w-7 h-7 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <div className={`text-2xl font-black font-mono ${metrics.expiringSubscriptions > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                {metrics.expiringSubscriptions}
              </div>
              <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                {metrics.expiringSubscriptions > 0 ? 'Entro i prossimi 30gg' : 'Nessun rinnovo a breve'}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* ── GRUPPO 2: FINANZE & CONTROLLO INCASSI ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[var(--color-primary)]" />
            <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider">
              Finanze & Controllo Operativo
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* INCASSATO QUESTO MESE (POSITIVO / PRIMARIO) */}
          <button
            type="button"
            onClick={() => onNavigateTab('pagamenti')}
            className="p-4 rounded-2xl bg-slate-950/90 border border-emerald-500/40 hover:border-emerald-500/70 hover:bg-slate-900/80 transition-all text-left shadow-lg cursor-pointer group flex flex-col justify-between col-span-2 sm:col-span-1"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider group-hover:text-emerald-400 transition-colors">
                Incassato Mese
              </span>
              <div className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <DollarSign className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                {formatPrice(metrics.collectedThisMonth)}
              </div>
              <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                Incassi confermati nel mese
              </span>
            </div>
          </button>

          {/* RATE IN SCADENZA (ATTENZIONE) */}
          <button
            type="button"
            onClick={() => onNavigateTab('scadenze')}
            className={`p-4 rounded-2xl bg-slate-950/90 border transition-all text-left shadow-lg cursor-pointer group flex flex-col justify-between ${
              metrics.expiringPayments > 0
                ? 'border-amber-500/30 hover:border-amber-500/60 hover:bg-slate-900/80'
                : 'border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider group-hover:text-amber-400 transition-colors">
                Rate a 30 Giorni
              </span>
              <div className="w-7 h-7 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                <CreditCard className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <div className={`text-2xl font-black font-mono ${metrics.expiringPayments > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                {metrics.expiringPayments}
              </div>
              <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                {metrics.expiringPayments > 0 ? 'In arrivo a breve' : 'Nessuna rata in scadenza'}
              </span>
            </div>
          </button>

          {/* RATE SCADUTE / INSOLUTI (CRITICO) */}
          <button
            type="button"
            onClick={() => onNavigateTab('scadenze')}
            className={`p-4 rounded-2xl bg-slate-950/90 border transition-all text-left shadow-lg cursor-pointer group flex flex-col justify-between ${
              metrics.overduePayments > 0
                ? 'border-rose-500/50 bg-rose-950/10 hover:border-rose-500 hover:bg-rose-950/20'
                : 'border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider group-hover:text-rose-400 transition-colors">
                Rate Scadute
              </span>
              <div className={`w-7 h-7 rounded-xl border flex items-center justify-center ${
                metrics.overduePayments > 0
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-400 animate-pulse'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}>
                {metrics.overduePayments > 0 ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              </div>
            </div>
            <div className="mt-3">
              <div className={`text-2xl font-black font-mono ${metrics.overduePayments > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {metrics.overduePayments}
              </div>
              <span className="text-[10px] font-medium block mt-0.5 text-slate-400">
                {metrics.overduePayments > 0 ? 'Richiede sollecito' : 'Nessuna rata scaduta'}
              </span>
            </div>
          </button>

          {/* TOTALE DA INCASSARE */}
          <button
            type="button"
            onClick={() => onNavigateTab('pagamenti')}
            className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 hover:border-slate-700 hover:bg-slate-900/80 transition-all text-left shadow-lg cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider group-hover:text-slate-300 transition-colors">
                Residuo Totale
              </span>
              <div className="w-7 h-7 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xl sm:text-2xl font-black text-slate-200 font-mono">
                {formatPrice(metrics.totalToCollect)}
              </div>
              <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                {metrics.totalToCollect > 0 ? 'Da riscuotere' : 'Nessun credito pendente'}
              </span>
            </div>
          </button>

          {/* TASK DA COMPLETARE */}
          <button
            type="button"
            onClick={() => onNavigateTab('attivita')}
            className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 hover:border-[var(--color-primary)]/40 hover:bg-slate-900/80 transition-all text-left shadow-lg cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider group-hover:text-[var(--color-primary)] transition-colors">
                Task Aperti
              </span>
              <div className="w-7 h-7 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)] group-hover:scale-110 transition-transform">
                <Briefcase className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-white font-mono">{metrics.tasksToComplete}</div>
              <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                {metrics.tasksToComplete > 0 ? 'Attività operative' : 'Tutti i task completati'}
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
