import React from 'react';
import { Inbox, ListTodo, Zap, CheckCircle2, User, Dumbbell, Image, Briefcase, Bot, Check } from 'lucide-react';
import { AthleteTask, KanbanStatus, TaskType } from '../../types';
import { deriveTaskType } from '../../context/TasksContext';
import { getDaysRemaining } from '../../lib/statusEngine';

interface Column {
  id: KanbanStatus;
  label: string;
  icon: React.FC<{ className?: string }>;
  color: string;
  headerCls: string;
  borderCls: string;
}

const COLUMNS: Column[] = [
  { id: 'inbox',  label: 'Inbox',     icon: Inbox,        color: 'text-slate-300',  headerCls: 'bg-slate-900/80',   borderCls: 'border-slate-700' },
  { id: 'todo',   label: 'Da Fare',   icon: ListTodo,     color: 'text-blue-400',   headerCls: 'bg-blue-950/40',    borderCls: 'border-blue-800/50' },
  { id: 'doing',  label: 'In Corso',  icon: Zap,          color: 'text-amber-400',  headerCls: 'bg-amber-950/40',   borderCls: 'border-amber-800/50' },
  { id: 'done',   label: 'Completate', icon: CheckCircle2, color: 'text-emerald-400', headerCls: 'bg-emerald-950/40', borderCls: 'border-emerald-800/50' },
];

const TASK_TYPE_ICON: Record<TaskType, React.FC<{ className?: string }>> = {
  personal: User,
  athlete:  Dumbbell,
  content:  Image,
  admin:    Briefcase,
  system:   Bot,
};

const TASK_TYPE_CLS: Record<TaskType, string> = {
  personal: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  athlete:  'text-amber-400  bg-amber-500/10  border-amber-500/20',
  content:  'text-pink-400   bg-pink-500/10   border-pink-500/20',
  admin:    'text-slate-300  bg-slate-800     border-slate-700',
  system:   'text-cyan-400   bg-cyan-500/10   border-cyan-500/20',
};

interface TaskBoardViewProps {
  tasks: AthleteTask[];
  onMoveKanban: (id: string, status: KanbanStatus) => void;
  onComplete: (id: string) => void;
}

export const TaskBoardView: React.FC<TaskBoardViewProps> = ({ tasks, onMoveKanban, onComplete }) => {
  // Task attivi (non completati/cancellati da TaskStatus, separati dalla colonna done kanban)
  const activeTasks = tasks.filter((t) => t.status !== 'cancelled');

  // Raggruppa per colonna kanban
  function getKanbanStatus(task: AthleteTask): KanbanStatus {
    if (task.status === 'completed') return 'done';
    return task.kanban_status ?? (task.origin === 'system' ? 'todo' : 'inbox');
  }

  const grouped = COLUMNS.reduce<Record<KanbanStatus, AthleteTask[]>>(
    (acc, col) => ({ ...acc, [col.id]: [] }),
    {} as Record<KanbanStatus, AthleteTask[]>
  );

  activeTasks.forEach((t) => {
    const col = getKanbanStatus(t);
    grouped[col].push(t);
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      {COLUMNS.map((col) => {
        const ColIcon = col.icon;
        const colTasks = grouped[col.id];

        return (
          <div key={col.id} className={`rounded-2xl border ${col.borderCls} overflow-hidden flex flex-col`}>
            {/* Intestazione colonna */}
            <div className={`${col.headerCls} px-4 py-3 flex items-center justify-between border-b ${col.borderCls}`}>
              <div className="flex items-center gap-2">
                <ColIcon className={`w-4 h-4 ${col.color}`} />
                <span className={`text-xs font-black ${col.color}`}>{col.label}</span>
              </div>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded-full">
                {colTasks.length}
              </span>
            </div>

            {/* Card task nella colonna */}
            <div className="p-2 space-y-2 flex-1 min-h-[180px] bg-slate-950/40">
              {colTasks.length === 0 ? (
                <div className="h-full flex items-center justify-center py-8">
                  <p className="text-[10px] text-slate-600 italic">Nessuna task</p>
                </div>
              ) : (
                colTasks.map((task) => {
                  const taskType = task.task_type ?? deriveTaskType(task.category, task.origin);
                  const TypeIcon = TASK_TYPE_ICON[taskType];
                  const typeCls = TASK_TYPE_CLS[taskType];
                  const days = getDaysRemaining(task.dueDate);
                  const isOverdue = days < 0 && col.id !== 'done';

                  return (
                    <div
                      key={task.id}
                      className={`p-3 rounded-xl bg-slate-900 border transition-all hover:border-slate-600 group ${
                        isOverdue ? 'border-rose-500/30' : 'border-slate-800'
                      }`}
                    >
                      {/* Badge tipo + priorità */}
                      <div className="flex items-center gap-1 mb-2 flex-wrap">
                        <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black border ${typeCls}`}>
                          <TypeIcon className="w-2.5 h-2.5" />
                          {taskType}
                        </span>
                        {isOverdue && (
                          <span className="text-[9px] font-black text-rose-400 bg-rose-950/50 px-1.5 py-0.5 rounded border border-rose-500/30">
                            {Math.abs(days)}g ritardo
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-bold text-white leading-snug mb-2 line-clamp-2">{task.title}</p>

                      {task.athleteName && (
                        <p className="text-[10px] text-[var(--color-primary)] mb-2">{task.athleteName}</p>
                      )}

                      {/* Azioni colonna: sposta o completa */}
                      <div className="flex items-center gap-1 pt-1 border-t border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity">
                        {col.id === 'doing' ? (
                          <button
                            type="button"
                            onClick={() => onComplete(task.id)}
                            className="flex-1 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center justify-center gap-1 hover:bg-emerald-500/30 transition-colors cursor-pointer"
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                            Completa
                          </button>
                        ) : col.id !== 'done' ? (
                          <>
                            {col.id === 'inbox' && (
                              <button
                                type="button"
                                onClick={() => onMoveKanban(task.id, 'todo')}
                                className="flex-1 py-1 rounded-lg bg-blue-500/15 text-blue-400 text-[10px] font-bold hover:bg-blue-500/25 transition-colors cursor-pointer"
                              >
                                → Da Fare
                              </button>
                            )}
                            {col.id === 'todo' && (
                              <button
                                type="button"
                                onClick={() => onMoveKanban(task.id, 'doing')}
                                className="flex-1 py-1 rounded-lg bg-amber-500/15 text-amber-400 text-[10px] font-bold hover:bg-amber-500/25 transition-colors cursor-pointer"
                              >
                                → In Corso
                              </button>
                            )}
                          </>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
