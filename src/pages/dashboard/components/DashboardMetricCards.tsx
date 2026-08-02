import React from 'react';
import {
  Users,
  UserPlus,
  UserCheck,
  UserX,
  CreditCard,
  AlertTriangle,
  Clock,
  TrendingUp,
  DollarSign,
  CheckSquare,
} from 'lucide-react';
import { NavigationTab } from '../../../types';

interface DashboardMetrics {
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
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      <button
        onClick={() => onNavigateTab('atleti')}
        className="p-4 rounded-xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] hover:border-emerald-500/50 shadow-xl flex flex-col justify-between text-left group transition-all"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Atleti Attivi</span>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
            <UserCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <span className="text-2xl font-black text-white">{metrics.activeAthletes}</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">In regola con l'iscrizione</span>
        </div>
      </button>

      <button
        onClick={() => onNavigateTab('atleti')}
        className="p-4 rounded-xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] hover:border-blue-500/50 shadow-xl flex flex-col justify-between text-left group transition-all"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nuovi Atleti</span>
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
            <UserPlus className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <span className="text-2xl font-black text-white">{metrics.newAthletes}</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Ultimi 30 giorni o Lead</span>
        </div>
      </button>

      <button
        onClick={() => onNavigateTab('atleti')}
        className="p-4 rounded-xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] hover:border-amber-500/50 shadow-xl flex flex-col justify-between text-left group transition-all"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">In Prova</span>
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <span className="text-2xl font-black text-amber-400">{metrics.trialAthletes}</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Periodo di prova gratuito</span>
        </div>
      </button>

      <button
        onClick={() => onNavigateTab('atleti')}
        className="p-4 rounded-xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] hover:border-slate-600 shadow-xl flex flex-col justify-between text-left group transition-all"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sospesi</span>
          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 group-hover:scale-110 transition-transform">
            <UserX className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <span className="text-2xl font-black text-slate-300">{metrics.suspendedAthletes}</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Abbonamento in pausa</span>
        </div>
      </button>

      <button
        onClick={() => onNavigateTab('abbonamenti')}
        className="p-4 rounded-xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] hover:border-[var(--color-primary)] shadow-xl flex flex-col justify-between text-left group transition-all"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Abb. in Scadenza</span>
          <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)] group-hover:scale-110 transition-transform">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <span className="text-2xl font-black text-white">{metrics.expiringSubscriptions}</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Scadono entro 30 giorni</span>
        </div>
      </button>

      <button
        onClick={() => onNavigateTab('scadenze')}
        className="p-4 rounded-xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] hover:border-amber-500/50 shadow-xl flex flex-col justify-between text-left group transition-all"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pagamenti Scadenza</span>
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
            <CreditCard className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <span className="text-2xl font-black text-amber-400">{metrics.expiringPayments}</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Rate entro 30 giorni</span>
        </div>
      </button>

      <button
        onClick={() => onNavigateTab('scadenze')}
        className="p-4 rounded-xl bg-red-950/20 border border-red-900/40 hover:border-red-500/50 shadow-xl flex flex-col justify-between text-left group transition-all"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider">Pagamenti Scaduti</span>
          <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <span className="text-2xl font-black text-red-400">{metrics.overduePayments}</span>
          <span className="text-[10px] text-red-300/70 block mt-0.5">Rate insolute ed in ritardo</span>
        </div>
      </button>

      <button
        onClick={() => onNavigateTab('pagamenti')}
        className="p-4 rounded-xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] hover:border-emerald-500/50 shadow-xl flex flex-col justify-between text-left group transition-all"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Totale Residuo</span>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <span className="text-lg font-black text-emerald-400">{formatPrice(metrics.totalToCollect)}</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Da incassare sui contratti</span>
        </div>
      </button>

      <button
        onClick={() => onNavigateTab('pagamenti')}
        className="p-4 rounded-xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] hover:border-[var(--color-primary)] shadow-xl flex flex-col justify-between text-left group transition-all"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Incassato Mese</span>
          <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)] group-hover:scale-110 transition-transform">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <span className="text-lg font-black text-[var(--color-primary)]">{formatPrice(metrics.collectedThisMonth)}</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Saldo mese corrente</span>
        </div>
      </button>

      <button
        onClick={() => onNavigateTab('attivita')}
        className="p-4 rounded-xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] hover:border-purple-500/50 shadow-xl flex flex-col justify-between text-left group transition-all"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Attività Aperte</span>
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
            <CheckSquare className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <span className="text-2xl font-black text-white">{metrics.tasksToComplete}</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Task in sospeso o aperte</span>
        </div>
      </button>
    </div>
  );
};
