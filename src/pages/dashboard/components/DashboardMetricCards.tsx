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
  Users2,
  Briefcase
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
  const baseCardClass = "relative overflow-hidden p-4 rounded-xl bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 hover:bg-slate-900/60 shadow-lg flex flex-col justify-between text-left group transition-all duration-300";

  return (
    <div className="space-y-6">
      {/* Gruppo 1: Gestione Atleti */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Users2 className="w-5 h-5 text-blue-400" />
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Acquisizione & Atleti</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Atleti Attivi */}
          <button
            onClick={() => onNavigateTab('atleti')}
            className={`${baseCardClass} hover:border-emerald-500/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]`}
          >
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors duration-500"></div>
            <div className="flex items-center justify-between relative z-10">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-emerald-400/80 transition-colors">Atleti Attivi</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 group-hover:bg-emerald-500/20 transition-all">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 relative z-10">
              <span className="text-2xl font-black text-white">{metrics.activeAthletes}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">In regola con l'iscrizione</span>
            </div>
          </button>

          {/* Nuovi Atleti */}
          <button
            onClick={() => onNavigateTab('atleti')}
            className={`${baseCardClass} hover:border-blue-500/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)]`}
          >
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors duration-500"></div>
            <div className="flex items-center justify-between relative z-10">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-blue-400/80 transition-colors">Nuovi Atleti</span>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 group-hover:bg-blue-500/20 transition-all">
                <UserPlus className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 relative z-10">
              <span className="text-2xl font-black text-white">{metrics.newAthletes}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Ultimi 30 giorni o Lead</span>
            </div>
          </button>

          {/* In Prova */}
          <button
            onClick={() => onNavigateTab('atleti')}
            className={`${baseCardClass} hover:border-amber-500/50 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]`}
          >
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors duration-500"></div>
            <div className="flex items-center justify-between relative z-10">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-amber-400/80 transition-colors">In Prova</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 group-hover:bg-amber-500/20 transition-all">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 relative z-10">
              <span className="text-2xl font-black text-amber-400">{metrics.trialAthletes}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Periodo di prova gratuito</span>
            </div>
          </button>

          {/* Sospesi */}
          <button
            onClick={() => onNavigateTab('atleti')}
            className={`${baseCardClass} hover:border-slate-500/50 hover:shadow-[0_0_20px_rgba(100,116,139,0.15)]`}
          >
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-slate-500/5 rounded-full blur-2xl group-hover:bg-slate-500/10 transition-colors duration-500"></div>
            <div className="flex items-center justify-between relative z-10">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-slate-300/80 transition-colors">Sospesi</span>
              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 group-hover:scale-110 group-hover:bg-slate-700 transition-all">
                <UserX className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 relative z-10">
              <span className="text-2xl font-black text-slate-300">{metrics.suspendedAthletes}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Abbonamento in pausa</span>
            </div>
          </button>

          {/* Abb. in Scadenza */}
          <button
            onClick={() => onNavigateTab('abbonamenti')}
            className={`${baseCardClass} hover:border-[var(--color-primary)]/50 hover:shadow-[0_0_20px_rgba(234,179,8,0.15)]`}
          >
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-[var(--color-primary)]/5 rounded-full blur-2xl group-hover:bg-[var(--color-primary)]/10 transition-colors duration-500"></div>
            <div className="flex items-center justify-between relative z-10">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-[var(--color-primary)]/80 transition-colors">Abb. in Scadenza</span>
              <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)] group-hover:scale-110 group-hover:bg-[var(--color-primary)]/20 transition-all">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 relative z-10">
              <span className="text-2xl font-black text-white">{metrics.expiringSubscriptions}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Scadono entro 30 giorni</span>
            </div>
          </button>
        </div>
      </div>

      {/* Gruppo 2: Finanze & Operatività */}
      <div className="space-y-3 mt-4">
        <div className="flex items-center gap-2 px-1">
          <Briefcase className="w-5 h-5 text-[var(--color-primary)]" />
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Finanze & Operatività</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Pagamenti Scadenza */}
          <button
            onClick={() => onNavigateTab('scadenze')}
            className={`${baseCardClass} hover:border-amber-500/50 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]`}
          >
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors duration-500"></div>
            <div className="flex items-center justify-between relative z-10">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-amber-400/80 transition-colors">Rate in Scadenza</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 group-hover:bg-amber-500/20 transition-all">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 relative z-10">
              <span className="text-2xl font-black text-amber-400">{metrics.expiringPayments}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Rate entro 30 giorni</span>
            </div>
          </button>

          {/* Pagamenti Scaduti */}
          <button
            onClick={() => onNavigateTab('scadenze')}
            className={`${baseCardClass} bg-red-950/20 border-red-900/40 hover:bg-red-950/40 hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]`}
          >
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-red-500/5 rounded-full blur-2xl group-hover:bg-red-500/15 transition-colors duration-500"></div>
            <div className="flex items-center justify-between relative z-10">
              <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider group-hover:text-red-300 transition-colors">Rate Scadute</span>
              <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 group-hover:scale-110 group-hover:bg-red-500/20 transition-all">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 relative z-10">
              <span className="text-2xl font-black text-red-400">{metrics.overduePayments}</span>
              <span className="text-[10px] text-red-300/70 block mt-0.5">Rate insolute ed in ritardo</span>
            </div>
          </button>

          {/* Totale Residuo */}
          <button
            onClick={() => onNavigateTab('pagamenti')}
            className={`${baseCardClass} hover:border-emerald-500/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]`}
          >
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors duration-500"></div>
            <div className="flex items-center justify-between relative z-10">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-emerald-400/80 transition-colors">Totale Residuo</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 group-hover:bg-emerald-500/20 transition-all">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 relative z-10">
              <span className="text-lg font-black text-emerald-400">{formatPrice(metrics.totalToCollect)}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Da incassare sui contratti</span>
            </div>
          </button>

          {/* Incassato Mese */}
          <button
            onClick={() => onNavigateTab('pagamenti')}
            className={`${baseCardClass} hover:border-[var(--color-primary)]/50 hover:shadow-[0_0_20px_rgba(234,179,8,0.15)]`}
          >
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-[var(--color-primary)]/5 rounded-full blur-2xl group-hover:bg-[var(--color-primary)]/10 transition-colors duration-500"></div>
            <div className="flex items-center justify-between relative z-10">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-[var(--color-primary)]/80 transition-colors">Incassato Mese</span>
              <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)] group-hover:scale-110 group-hover:bg-[var(--color-primary)]/20 transition-all">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 relative z-10">
              <span className="text-lg font-black text-[var(--color-primary)]">{formatPrice(metrics.collectedThisMonth)}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Saldo mese corrente</span>
            </div>
          </button>

          {/* Attività Aperte */}
          <button
            onClick={() => onNavigateTab('attivita')}
            className={`${baseCardClass} hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]`}
          >
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-colors duration-500"></div>
            <div className="flex items-center justify-between relative z-10">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-purple-400/80 transition-colors">Attività Aperte</span>
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 group-hover:bg-purple-500/20 transition-all">
                <CheckSquare className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 relative z-10">
              <span className="text-2xl font-black text-white">{metrics.tasksToComplete}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Task in sospeso o aperte</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

