import React from 'react';
import {
  History,
  Dumbbell,
  DollarSign,
  UserPlus,
  MessageSquare,
  Bot,
  ArrowRight,
} from 'lucide-react';
import { NavigationTab } from '../../../types';

export interface SystemActivityItem {
  id: string;
  type: 'workout' | 'payment' | 'copilot' | 'athlete' | 'message';
  title: string;
  description: string;
  timeFormatted: string;
  targetTab: NavigationTab;
}

interface RecentActivityWidgetProps {
  activities: SystemActivityItem[];
  onNavigate: (tab: NavigationTab) => void;
}

export const RecentActivityWidget: React.FC<RecentActivityWidgetProps> = ({
  activities,
  onNavigate,
}) => {
  const getIcon = (type: SystemActivityItem['type']) => {
    switch (type) {
      case 'workout':
        return <Dumbbell className="w-3.5 h-3.5 text-amber-400" />;
      case 'payment':
        return <DollarSign className="w-3.5 h-3.5 text-emerald-400" />;
      case 'copilot':
        return <Bot className="w-3.5 h-3.5 text-sky-400" />;
      case 'athlete':
        return <UserPlus className="w-3.5 h-3.5 text-indigo-400" />;
      case 'message':
      default:
        return <MessageSquare className="w-3.5 h-3.5 text-purple-400" />;
    }
  };

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-slate-950/90 border border-slate-800/90 shadow-2xl space-y-4 relative overflow-hidden">
      {/* Header Widget */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-600/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-sm">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-white tracking-tight flex items-center gap-2">
              <span>Ultime Attività di Sistema</span>
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">
              Feed in tempo reale delle interazioni e registrazioni atleti
            </p>
          </div>
        </div>
      </div>

      {/* Lista Timeline */}
      {activities.length === 0 ? (
        <div className="py-6 px-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-1">
          <History className="w-5 h-5 text-slate-600 mb-1" />
          <p className="font-bold text-slate-300">Nessun nuovo evento al momento</p>
          <p className="text-[11px] text-slate-500">Le nuove attività di sistema compariranno qui in tempo reale.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-900">
          {activities.slice(0, 5).map((act) => (
            <div
              key={act.id}
              onClick={() => onNavigate(act.targetTab)}
              className="py-3 px-2 flex items-center justify-between gap-3 hover:bg-slate-900/50 rounded-xl transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  {getIcon(act.type)}
                </div>
                <div className="min-w-0">
                  <h5 className="text-xs font-black text-white tracking-tight group-hover:text-[var(--color-primary)] transition-colors truncate">
                    {act.title}
                  </h5>
                  <p className="text-[11px] text-slate-400 truncate">
                    {act.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-slate-500 font-mono font-bold">
                  {act.timeFormatted}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
