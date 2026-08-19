import React, { useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Dumbbell,
  DollarSign,
  UserPlus,
  ArrowRight,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { NavigationTab } from '../../../types';

export interface PriorityItem {
  id: string;
  type: 'pain' | 'unassigned_workout' | 'overdue_payment' | 'expiring_today' | 'urgent_task' | 'new_lead';
  priorityLevel: 'high' | 'medium' | 'normal';
  title: string;
  subtitle: string;
  actionLabel: string;
  targetTab: NavigationTab;
  athleteId?: string;
}

interface TodayPrioritiesWidgetProps {
  priorities: PriorityItem[];
  onNavigate: (tab: NavigationTab, athleteId?: string) => void;
}

export const TodayPrioritiesWidget: React.FC<TodayPrioritiesWidgetProps> = ({
  priorities,
  onNavigate,
}) => {
  const topPriorities = useMemo(() => {
    return priorities.slice(0, 3);
  }, [priorities]);

  const getPriorityBadge = (level: 'high' | 'medium' | 'normal') => {
    switch (level) {
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-400 border border-rose-500/30 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
            Urgente
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Da fare
          </span>
        );
      case 'normal':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-sky-500/15 text-sky-400 border border-sky-500/30 shrink-0">
            Follow-up
          </span>
        );
    }
  };

  const getIcon = (type: PriorityItem['type']) => {
    switch (type) {
      case 'pain':
        return <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />;
      case 'unassigned_workout':
        return <Dumbbell className="w-3.5 h-3.5 text-amber-400" />;
      case 'overdue_payment':
        return <DollarSign className="w-3.5 h-3.5 text-rose-400" />;
      case 'expiring_today':
        return <Clock className="w-3.5 h-3.5 text-amber-400" />;
      case 'urgent_task':
        return <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />;
      case 'new_lead':
      default:
        return <UserPlus className="w-3.5 h-3.5 text-sky-400" />;
    }
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800/90 shadow-xl space-y-3 relative overflow-hidden">
      {/* Header Compatto */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)] shadow-sm">
            <Zap className="w-3.5 h-3.5 fill-[var(--color-primary)]/30" />
          </div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
              Priorità di Oggi
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800 font-mono">
              {topPriorities.length} {topPriorities.length === 1 ? 'task' : 'task'}
            </span>
          </div>
        </div>

        <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
          Azioni immediate suggerite dal sistema
        </span>
      </div>

      {/* Lista Priorità Compatta */}
      {topPriorities.length === 0 ? (
        <div className="py-2.5 px-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between gap-3 text-slate-300">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs font-bold text-white">
              Tutte le priorità del giorno sono gestite! Nessuna azione bloccante in sospeso.
            </span>
          </div>
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-mono">
            Giornata Pulita ✨
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {topPriorities.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 transition-all flex flex-col justify-between gap-2.5 shadow-sm group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                    {getIcon(item.type)}
                  </div>
                  <h4 className="text-xs font-black text-white tracking-tight truncate group-hover:text-[var(--color-primary)] transition-colors">
                    {item.title}
                  </h4>
                </div>
                {getPriorityBadge(item.priorityLevel)}
              </div>

              <p className="text-[11px] text-slate-400 leading-snug line-clamp-1">
                {item.subtitle}
              </p>

              <button
                type="button"
                onClick={() => onNavigate(item.targetTab, item.athleteId)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-[var(--color-primary)] text-slate-300 hover:text-slate-950 border border-slate-800 hover:border-[var(--color-primary)] font-bold text-[11px] transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-sm"
              >
                <span>{item.actionLabel}</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
