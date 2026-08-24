import React, { useState } from 'react';
import { Bot, ChevronDown, ChevronRight, Check, AlertTriangle, ExternalLink } from 'lucide-react';
import { AthleteTask } from '../../types';
import { getDaysRemaining } from '../../lib/statusEngine';

interface SystemTasksPanelProps {
  tasks: AthleteTask[];
  onComplete: (id: string) => void;
  onNavigateAthlete?: (athleteId?: string) => void;
}

export const SystemTasksPanel: React.FC<SystemTasksPanelProps> = ({
  tasks,
  onComplete,
  onNavigateAthlete,
}) => {
  const [open, setOpen] = useState(false);

  const activeTasks = tasks.filter(
    (t) => t.origin === 'system' && t.status !== 'completed' && t.status !== 'cancelled'
  );

  if (activeTasks.length === 0) return null;

  const urgentCount = activeTasks.filter((t) => {
    const days = getDaysRemaining(t.dueDate);
    return days <= 0 || t.priority === 'urgent';
  }).length;

  return (
    <div className="rounded-2xl border border-cyan-900/40 bg-cyan-950/10 overflow-hidden shadow-sm">
      {/* Header collassabile */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-4 hover:bg-cyan-950/20 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
            <Bot className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-left">
            <span className="text-xs font-black text-cyan-300">Automazioni Sistema</span>
            <p className="text-[10px] text-slate-400 font-medium">
              {activeTasks.length} task rilevate automaticamente
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {urgentCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[10px] font-black">
              <AlertTriangle className="w-3 h-3 animate-pulse" />
              {urgentCount} urgenti
            </span>
          )}
          <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold">
            {activeTasks.length}
          </span>
          {open ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {/* Lista task sistema */}
      {open && (
        <div className="border-t border-cyan-900/30 divide-y divide-cyan-900/20">
          {activeTasks.map((task) => {
            const days = getDaysRemaining(task.dueDate);
            const isOverdue = days < 0 || task.status === 'overdue';
            return (
              <div
                key={task.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-cyan-950/20 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => onComplete(task.id)}
                  title="Segna come completata"
                  className="w-6 h-6 rounded-lg border border-cyan-700/50 hover:border-emerald-400 hover:bg-emerald-500/20 flex items-center justify-center text-transparent hover:text-emerald-400 transition-all shrink-0 cursor-pointer"
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{task.title}</p>
                  {task.athleteName && (
                    <button
                      type="button"
                      onClick={() => onNavigateAthlete?.(task.athleteId)}
                      className="flex items-center gap-1 text-[10px] text-[var(--color-primary)] hover:underline mt-0.5 cursor-pointer"
                    >
                      {task.athleteName}
                      <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border shrink-0 ${
                    isOverdue
                      ? 'text-rose-400 bg-rose-950/50 border-rose-500/40'
                      : days === 0
                      ? 'text-amber-400 bg-amber-950/40 border-amber-500/30'
                      : 'text-slate-400 bg-slate-900 border-slate-800'
                  }`}
                >
                  {isOverdue
                    ? `${Math.abs(days)}g ritardo`
                    : days === 0
                    ? 'Oggi'
                    : `${days}g`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
