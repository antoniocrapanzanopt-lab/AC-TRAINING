import React from 'react';
import {
  Check, Edit2, Copy, Trash2, ExternalLink,
  User, Bot, Dumbbell, Image, Briefcase,
} from 'lucide-react';
import { AthleteTask, TaskType } from '../../types';
import { getDaysRemaining } from '../../lib/statusEngine';

// Config priorità (ripresa da TasksPage per coerenza)
const PRIORITY_CONFIG = {
  urgent: { label: 'Urgente', cls: 'text-rose-400 bg-rose-950/40 border-rose-500/50 font-black', dotCls: 'bg-rose-500 animate-pulse shadow-[0_0_8px_#f43f5e]' },
  high:   { label: 'Alta',    cls: 'text-amber-400 bg-amber-950/40 border-amber-500/40 font-bold', dotCls: 'bg-amber-400' },
  medium: { label: 'Media',   cls: 'text-blue-400 bg-blue-950/40 border-blue-500/40 font-medium', dotCls: 'bg-blue-400' },
  low:    { label: 'Bassa',   cls: 'text-slate-400 bg-slate-900 border-slate-700 font-medium', dotCls: 'bg-slate-500' },
};

// Badge tipo task
const TASK_TYPE_CONFIG: Record<TaskType, { label: string; icon: React.FC<{ className?: string }>; cls: string }> = {
  personal: { label: 'Personale',  icon: User,      cls: 'text-violet-400 bg-violet-500/15 border-violet-500/30' },
  athlete:  { label: 'Atleta',     icon: Dumbbell,  cls: 'text-amber-400  bg-amber-500/15  border-amber-500/30'  },
  content:  { label: 'Contenuto',  icon: Image,     cls: 'text-pink-400   bg-pink-500/15   border-pink-500/30'   },
  admin:    { label: 'Admin',      icon: Briefcase, cls: 'text-slate-300  bg-slate-800     border-slate-700'      },
  system:   { label: 'Sistema',    icon: Bot,       cls: 'text-cyan-400   bg-cyan-500/15   border-cyan-500/30'   },
};

function formatDeadline(dueDate: string) {
  const days = getDaysRemaining(dueDate);
  if (days < 0) return { text: `${Math.abs(days)}g ritardo`, cls: 'text-rose-400 bg-rose-950/60 border-rose-500/50', isOverdue: true };
  if (days === 0) return { text: 'Oggi', cls: 'text-amber-400 bg-amber-950/50 border-amber-500/40', isOverdue: false };
  if (days === 1) return { text: 'Domani', cls: 'text-sky-300 bg-sky-950/40 border-sky-500/30', isOverdue: false };
  return {
    text: `${days}g · ${new Date(dueDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}`,
    cls: 'text-slate-300 bg-slate-900 border-slate-800',
    isOverdue: false,
  };
}

interface TaskRowProps {
  task: AthleteTask;
  taskType: TaskType;
  onComplete: (id: string) => void;
  onEdit: (task: AthleteTask) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onReschedule: (id: string, days: number) => void;
  onNavigateAthlete?: (athleteId?: string) => void;
  /** Se true mostra i pulsanti di posticipo veloce */
  showReschedule?: boolean;
}

export const TaskRow: React.FC<TaskRowProps> = ({
  task,
  taskType,
  onComplete,
  onEdit,
  onDuplicate,
  onDelete,
  onReschedule,
  onNavigateAthlete,
  showReschedule = true,
}) => {
  const prioCfg = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.medium;
  const typeCfg = TASK_TYPE_CONFIG[taskType];
  const TypeIcon = typeCfg.icon;
  const deadline = formatDeadline(task.dueDate);

  return (
    <div
      className={`p-3.5 rounded-2xl bg-slate-950/90 border transition-all hover:bg-slate-900/60 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 group ${
        deadline.isOverdue ? 'border-rose-500/40 shadow-rose-950/20' : 'border-slate-800/90 hover:border-slate-700'
      }`}
    >
      {/* Sinistra */}
      <div className="flex items-start gap-3.5 min-w-0 flex-1">
        <button
          type="button"
          onClick={() => onComplete(task.id)}
          title="Segna come completata"
          className="w-7 h-7 rounded-xl border-2 border-slate-700 hover:border-emerald-400 hover:bg-emerald-500/20 flex items-center justify-center text-transparent hover:text-emerald-400 transition-all shrink-0 mt-0.5 cursor-pointer shadow-sm active:scale-90"
        >
          <Check className="w-4 h-4 stroke-[3]" />
        </button>

        <div className="min-w-0 space-y-1 flex-1">
          {/* Badges riga superiore */}
          <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
            {/* Tipo task */}
            <span className={`px-2 py-0.5 rounded-md font-black border flex items-center gap-1 ${typeCfg.cls}`}>
              <TypeIcon className="w-3 h-3 shrink-0" />
              {typeCfg.label}
            </span>

            {/* Priorità */}
            <span className={`px-2 py-0.5 rounded-md border flex items-center gap-1 ${prioCfg.cls}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${prioCfg.dotCls}`} />
              {prioCfg.label}
            </span>

            {/* Scadenza */}
            <span className={`px-2 py-0.5 rounded-md border ${deadline.cls}`}>
              {deadline.text}
            </span>

            {/* Tag */}
            {task.tags?.map((tag) => (
              <span key={tag} className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
                #{tag}
              </span>
            ))}
          </div>

          {/* Titolo e descrizione */}
          <div>
            <h4 className="text-xs sm:text-sm font-black text-white leading-snug">{task.title}</h4>
            {task.description && (
              <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{task.description}</p>
            )}
          </div>

          {/* Atleta collegato */}
          {task.athleteName && (
            <div className="flex items-center gap-1.5 pt-0.5">
              <span className="text-[10px] text-slate-500 font-bold uppercase">Atleta:</span>
              <button
                type="button"
                onClick={() => onNavigateAthlete?.(task.athleteId)}
                className="text-xs font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                {task.athleteName}
                <ExternalLink className="w-2.5 h-2.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Destra: azioni */}
      <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800/80">
        {showReschedule && (
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5 gap-0.5 text-[10px]">
            {[1, 3, 7].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => onReschedule(task.id, d)}
                title={`Posticipa di ${d} ${d === 1 ? 'giorno' : d === 7 ? 'settimana' : 'giorni'}`}
                className="px-2 py-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 font-bold transition-colors cursor-pointer"
              >
                +{d === 7 ? '1s' : `${d}g`}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => onEdit(task)}
          title="Modifica"
          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onDuplicate(task.id)}
          title="Duplica"
          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(task.id)}
          title="Elimina"
          className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/40 transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
