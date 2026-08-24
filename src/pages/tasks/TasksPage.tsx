import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  CheckCircle2,
  AlertTriangle,
  ListTodo,
  LayoutGrid,
  CalendarDays,
  History,
  Inbox,
  Trash2,
  Bot,
  Edit2,
  Check,
} from 'lucide-react';
import { AthleteTask, TaskPriority, TaskCategory, TaskFormData, TaskType } from '../../types';
import { useTasks, deriveTaskType } from '../../context/TasksContext';
import { useAthletes } from '../../context/AthletesContext';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { TaskModal } from '../../components/tasks/TaskModal';
import { QuickCapture } from '../../components/tasks/QuickCapture';
import { DayFocusBlock } from '../../components/tasks/DayFocusBlock';
import { SystemTasksPanel } from '../../components/tasks/SystemTasksPanel';
import { TaskRow } from '../../components/tasks/TaskRow';
import { TaskBoardView } from '../../components/tasks/TaskBoardView';
import { getDaysRemaining } from '../../lib/statusEngine';
import { getLocalOwnerProfile } from '../../lib/ownerProfile';

// ─── Tipi vista ───────────────────────────────────────────────────────────────
type ViewMode = 'today' | 'list' | 'board' | 'week' | 'completed' | 'inbox';

// ─── Config categorie (mantenuta per backward compat con componenti legacy) ──
export const TASK_CATEGORY_CONFIG: Record<
  TaskCategory,
  { label: string; icon: React.FC<{ className?: string }>; badgeCls: string; borderCls: string }
> = {
  checkin:       { label: 'Check-in',            icon: CheckCircle2,    badgeCls: 'bg-purple-500/15 text-purple-300 border-purple-500/30',  borderCls: 'border-purple-500/30' },
  measurements:  { label: 'Misure & Foto',        icon: CheckCircle2,    badgeCls: 'bg-pink-500/15 text-pink-300 border-pink-500/30',        borderCls: 'border-pink-500/30' },
  workout_plan:  { label: 'Scheda Allenamento',   icon: CheckCircle2,    badgeCls: 'bg-amber-500/15 text-amber-300 border-amber-500/30',     borderCls: 'border-amber-500/30' },
  nutrition:     { label: 'Nutrizione',           icon: CheckCircle2,    badgeCls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', borderCls: 'border-emerald-500/30' },
  payment:       { label: 'Pagamento',            icon: CheckCircle2,    badgeCls: 'bg-sky-500/15 text-sky-300 border-sky-500/30',           borderCls: 'border-sky-500/30' },
  appointment:   { label: 'Appuntamento',         icon: CheckCircle2,    badgeCls: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',        borderCls: 'border-cyan-500/30' },
  document:      { label: 'Documento',            icon: CheckCircle2,    badgeCls: 'bg-orange-500/15 text-orange-300 border-orange-500/30',  borderCls: 'border-orange-500/30' },
  follow_up:     { label: 'Follow-up',            icon: CheckCircle2,    badgeCls: 'bg-rose-500/15 text-rose-300 border-rose-500/30',        borderCls: 'border-rose-500/30' },
  training:      { label: 'Allenamento',          icon: CheckCircle2,    badgeCls: 'bg-amber-500/15 text-amber-300 border-amber-500/30',     borderCls: 'border-amber-500/30' },
  assessment:    { label: 'Valutazione',          icon: CheckCircle2,    badgeCls: 'bg-pink-500/15 text-pink-300 border-pink-500/30',        borderCls: 'border-pink-500/30' },
  call:          { label: 'Chiamata',             icon: CheckCircle2,    badgeCls: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',        borderCls: 'border-cyan-500/30' },
  checkup:       { label: 'Checkup',              icon: CheckCircle2,    badgeCls: 'bg-purple-500/15 text-purple-300 border-purple-500/30',  borderCls: 'border-purple-500/30' },
  administrative:{ label: 'Amministrativa',       icon: CheckCircle2,    badgeCls: 'bg-slate-500/15 text-slate-300 border-slate-500/30',     borderCls: 'border-slate-700' },
  other:         { label: 'Altro',                icon: CheckCircle2,    badgeCls: 'bg-slate-500/15 text-slate-300 border-slate-500/30',     borderCls: 'border-slate-700' },
};

// ─── Helper data/ora ──────────────────────────────────────────────────────────
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Buongiorno';
  if (h < 18) return 'Buon pomeriggio';
  return 'Buonasera';
}

function formatTodayLabel(): string {
  return new Date().toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// ─── Viste disponibili ────────────────────────────────────────────────────────
const VIEW_TABS: Array<{ id: ViewMode; label: string; icon: React.FC<{ className?: string }> }> = [
  { id: 'today',     label: 'Oggi',        icon: CheckCircle2  },
  { id: 'list',      label: 'Lista',       icon: ListTodo      },
  { id: 'board',     label: 'Board',       icon: LayoutGrid    },
  { id: 'week',      label: 'Settimana',   icon: CalendarDays  },
  { id: 'completed', label: 'Completate',  icon: History       },
  { id: 'inbox',     label: 'Inbox',       icon: Inbox         },
];

// ─── COMPONENTE PRINCIPALE ────────────────────────────────────────────────────
export const TasksPage: React.FC = () => {
  const {
    tasks,
    dayFocus,
    setDayFocus,
    addTask,
    updateTask,
    updateTaskKanban,
    completeTask,
    rescheduleTask,
    duplicateTask,
    deleteTask,
  } = useTasks();
  const { athletes, setSelectedAthleteId } = useAthletes();
  const { setActiveTab } = useApp();
  const { showSuccess, showInfo } = useToast();

  const [viewMode, setViewMode] = useState<ViewMode>('today');

  // Filtri (Vista Lista)
  const [query, setQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<TaskCategory | 'all'>('all');
  const [filterAthleteId, setFilterAthleteId] = useState<string>('all');
  const [filterType, setFilterType] = useState<TaskType | 'all'>('all');

  // Modali
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<AthleteTask | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; taskId: string | null; taskTitle?: string }>({
    open: false, taskId: null,
  });

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const owner = getLocalOwnerProfile();

  // ─── METRICHE ────────────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    let overdue = 0, today = 0, upcoming = 0, completed = 0, highPrio = 0, followUps = 0;

    tasks.forEach((t) => {
      if (t.status === 'completed') { completed++; return; }
      if (t.status === 'cancelled') return;

      const days = getDaysRemaining(t.dueDate);
      const isOverdue = t.status === 'overdue' || days < 0;
      const isToday = t.dueDate === todayStr;

      if (isOverdue) overdue++;
      else if (isToday) today++;
      else if (days > 0) upcoming++;

      if ((isOverdue || isToday) && (t.priority === 'urgent' || t.priority === 'high')) highPrio++;

      if (['follow_up', 'call', 'appointment'].includes(t.category) && (isOverdue || isToday)) followUps++;
    });

    return {
      total: tasks.length,
      totalActive: tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled').length,
      overdue, today, upcoming, completed, highPrio, followUps,
    };
  }, [tasks, todayStr]);

  // ─── TASK "OGGI" (personali + atleta, non sistema) ────────────────────────
  const todayPersonalTasks = useMemo(() =>
    tasks.filter((t) => {
      if (t.status === 'completed' || t.status === 'cancelled') return false;
      if (t.origin === 'system') return false;
      const days = getDaysRemaining(t.dueDate);
      return t.dueDate === todayStr || days < 0;
    }).sort((a, b) => {
      const pOrder: Record<TaskPriority, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
      return pOrder[b.priority] - pOrder[a.priority];
    }),
  [tasks, todayStr]);

  // ─── TASK INBOX ───────────────────────────────────────────────────────────
  const inboxTasks = useMemo(() =>
    tasks.filter((t) => {
      if (t.status === 'completed' || t.status === 'cancelled') return false;
      if (t.origin === 'system') return false;
      const ks = t.kanban_status;
      return ks === 'inbox' || (!ks && !t.dueDate);
    }),
  [tasks]);

  // ─── TASK LISTA (filtrate) ────────────────────────────────────────────────
  const listTasks = useMemo(() => {
    const q = query.toLowerCase().trim();
    return tasks
      .filter((t) => {
        if (viewMode !== 'completed' && (t.status === 'completed' || t.status === 'cancelled')) return false;
        if (viewMode === 'completed' && t.status !== 'completed') return false;

        if (q && !t.title.toLowerCase().includes(q) && !(t.athleteName || '').toLowerCase().includes(q)) return false;
        if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
        if (filterCategory !== 'all' && t.category !== filterCategory) return false;
        if (filterAthleteId !== 'all' && t.athleteId !== filterAthleteId) return false;
        if (filterType !== 'all') {
          const tt = t.task_type ?? deriveTaskType(t.category, t.origin);
          if (tt !== filterType) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (viewMode === 'completed') {
          return new Date(b.completedAt ?? b.updatedAt).getTime() - new Date(a.completedAt ?? a.updatedAt).getTime();
        }
        const pOrder: Record<TaskPriority, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
        const daysA = getDaysRemaining(a.dueDate);
        const daysB = getDaysRemaining(b.dueDate);
        const scoreA = pOrder[a.priority] + (daysA < 0 ? 10 : 0);
        const scoreB = pOrder[b.priority] + (daysB < 0 ? 10 : 0);
        return scoreB - scoreA;
      });
  }, [tasks, viewMode, query, filterPriority, filterCategory, filterAthleteId, filterType]);

  // ─── TIMELINE SETTIMANALE ─────────────────────────────────────────────────
  const weekGroups = useMemo(() => {
    if (viewMode !== 'week') return null;
    const active = tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled');
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    const overdueList: AthleteTask[] = [];
    const todayList: AthleteTask[] = [];
    const tomorrowList: AthleteTask[] = [];
    const thisWeekList: AthleteTask[] = [];
    const beyondList: AthleteTask[] = [];

    active.forEach((t) => {
      const days = getDaysRemaining(t.dueDate);
      if (days < 0 || t.status === 'overdue') overdueList.push(t);
      else if (t.dueDate === todayStr) todayList.push(t);
      else if (t.dueDate === tomorrowStr) tomorrowList.push(t);
      else if (days <= 7) thisWeekList.push(t);
      else beyondList.push(t);
    });

    return { overdueList, todayList, tomorrowList, thisWeekList, beyondList };
  }, [viewMode, tasks, todayStr]);

  // ─── HANDLERS ────────────────────────────────────────────────────────────
  const handleSave = (data: TaskFormData) => {
    if (editingTask) {
      updateTask(editingTask.id, data);
      showSuccess('Modificata', 'Attività aggiornata.');
    } else {
      addTask(data);
      showSuccess('Aggiunta', 'Nuova attività salvata.');
    }
  };

  const handleComplete = (id: string) => {
    if (completeTask(id)) showSuccess('Completata!', 'Attività segnata come conclusa.');
  };

  const handleReschedule = (id: string, daysToAdd: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysToAdd);
    rescheduleTask(id, target.toISOString().slice(0, 10));
    showSuccess('Riprogrammata', `Posticipata di ${daysToAdd} ${daysToAdd === 1 ? 'giorno' : 'giorni'}.`);
  };

  const handleDuplicate = (id: string) => {
    const dup = duplicateTask(id);
    if (dup) showInfo('Duplicata', `Copia: "${dup.title}"`);
  };

  const handleDelete = (id: string) => {
    deleteTask(id);
    showInfo('Eliminata', 'Attività rimossa.');
    setDeleteModal({ open: false, taskId: null });
  };

  const handleNavigateToAthlete = (athleteId?: string) => {
    if (athleteId) { setSelectedAthleteId(athleteId); setActiveTab('atleti'); }
  };

  // Quick Capture → crea task in inbox
  const handleQuickCapture = (title: string, task_type: TaskType) => {
    const nowStr = new Date().toISOString().slice(0, 10);
    addTask({
      title,
      task_type,
      kanban_status: 'inbox',
      priority: 'medium',
      category: 'other',
      status: 'pending',
      dueDate: nowStr,
      reminder: false,
      origin: 'manual',
      assigneeId: owner?.id || 'local-owner',
      assigneeName: owner?.fullName || 'Coach',
    });
    showSuccess('Catturata!', `"${title}" aggiunta all'Inbox.`);
  };

  // ─── TASK ROW PROPS HELPER ────────────────────────────────────────────────
  const taskRowProps = (task: AthleteTask) => ({
    task,
    taskType: task.task_type ?? deriveTaskType(task.category, task.origin),
    onComplete: handleComplete,
    onEdit: (t: AthleteTask) => { setEditingTask(t); setIsModalOpen(true); },
    onDuplicate: handleDuplicate,
    onDelete: (id: string) => setDeleteModal({ open: true, taskId: id, taskTitle: task.title }),
    onReschedule: handleReschedule,
    onNavigateAthlete: handleNavigateToAthlete,
  });

  // ─── RENDER ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 max-w-[1600px] mx-auto pb-16 animate-in fade-in duration-200">

      {/* ─── HEADER PERSONALE ─── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {getGreeting()} 👋
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-medium capitalize">{formatTodayLabel()}</p>
          <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
            {metrics.overdue > 0
              ? `${metrics.overdue} attività in ritardo · ${metrics.today} per oggi`
              : metrics.today > 0
              ? `${metrics.today} attività per oggi`
              : 'Nessuna urgenza in coda — ottimo lavoro!'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => { setEditingTask(null); setIsModalOpen(true); }}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[var(--color-primary)] text-slate-950 font-black text-xs sm:text-sm hover:bg-[var(--color-primary-hover)] transition-all shadow-[0_0_20px_rgba(234,179,8,0.25)] cursor-pointer self-start sm:self-auto active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Nuova Task</span>
        </button>
      </div>

      {/* ─── KPI SINTETICI ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Scadute',    value: metrics.overdue,    color: metrics.overdue > 0 ? 'border-rose-500/40 bg-rose-950/30' : 'border-slate-800', text: metrics.overdue > 0 ? 'text-rose-400' : 'text-slate-500', onClick: () => { setViewMode('list'); setFilterPriority('all'); } },
          { label: 'Oggi',       value: metrics.today,      color: 'border-amber-500/30 bg-amber-950/20',    text: 'text-amber-400',   onClick: () => setViewMode('today')    },
          { label: 'Alta Priorità', value: metrics.highPrio,color: 'border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5', text: 'text-[var(--color-primary)]', onClick: () => { setViewMode('list'); setFilterPriority('high'); } },
          { label: 'Follow-up',  value: metrics.followUps,  color: 'border-violet-500/30 bg-violet-950/20',  text: 'text-violet-400',  onClick: () => { setViewMode('list'); setFilterCategory('follow_up'); } },
        ].map(({ label, value, color, text, onClick }) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            className={`p-4 rounded-2xl border transition-all cursor-pointer hover:opacity-90 text-left ${color}`}
          >
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">{label}</span>
            <span className={`text-2xl font-black block mt-1 ${text}`}>{value}</span>
          </button>
        ))}
      </div>

      {/* ─── TABS VISTA ─── */}
      <div className="flex items-center gap-1 flex-wrap bg-slate-950 border border-slate-800 rounded-2xl p-1.5 shadow-inner">
        {VIEW_TABS.map(({ id, label, icon: Icon }) => {
          const count = id === 'today' ? metrics.today + metrics.overdue
            : id === 'list' ? metrics.totalActive
            : id === 'completed' ? metrics.completed
            : id === 'inbox' ? inboxTasks.length
            : null;

          return (
            <button
              key={id}
              type="button"
              onClick={() => setViewMode(id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                viewMode === id
                  ? 'bg-[var(--color-primary)] text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              {count !== null && count > 0 && (
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                  viewMode === id ? 'bg-slate-950/30 text-slate-950' : 'bg-slate-800 text-slate-300'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ════════════════════════════════════════════════════
          VISTA: OGGI
      ════════════════════════════════════════════════════ */}
      {viewMode === 'today' && (
        <div className="space-y-4">
          {/* Focus del giorno */}
          <DayFocusBlock focus={dayFocus} onChange={setDayFocus} />

          {/* Quick Capture */}
          <QuickCapture onCapture={handleQuickCapture} />

          {/* Task di oggi */}
          {todayPersonalTasks.length === 0 ? (
            <div className="py-10 rounded-2xl bg-slate-950 border border-slate-800 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3 opacity-60" />
              <p className="text-sm font-black text-white">Tutto sotto controllo!</p>
              <p className="text-xs text-slate-400 mt-1">Nessuna task personale per oggi. Ottimo lavoro!</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                  Task di Oggi ({todayPersonalTasks.length})
                </span>
              </div>
              {todayPersonalTasks.map((task) => (
                <TaskRow key={task.id} {...taskRowProps(task)} />
              ))}
            </div>
          )}

          {/* Pannello sistema — collassato di default */}
          <SystemTasksPanel
            tasks={tasks}
            onComplete={handleComplete}
            onNavigateAthlete={handleNavigateToAthlete}
          />
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          VISTA: LISTA
      ════════════════════════════════════════════════════ */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {/* Filtri */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 shadow-xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              <div className="relative lg:col-span-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cerca..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as TaskType | 'all')}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200 focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
              >
                <option value="all">Tutti i Tipi</option>
                <option value="personal">🟣 Personale</option>
                <option value="athlete">🟡 Atleta</option>
                <option value="content">🩷 Contenuto</option>
                <option value="admin">⚙️ Admin</option>
                <option value="system">🤖 Sistema</option>
              </select>
              <select
                value={filterAthleteId}
                onChange={(e) => setFilterAthleteId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200 focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
              >
                <option value="all">Tutti gli Atleti</option>
                {athletes.map((a) => (
                  <option key={a.id} value={a.id}>{a.fullName}</option>
                ))}
              </select>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value as TaskPriority | 'all')}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200 focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
              >
                <option value="all">Tutte le Priorità</option>
                <option value="urgent">🔴 Urgente</option>
                <option value="high">🟠 Alta</option>
                <option value="medium">🔵 Media</option>
                <option value="low">⚪ Bassa</option>
              </select>
            </div>
          </div>

          {listTasks.length === 0 ? (
            <div className="py-14 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto opacity-60" />
              <p className="text-sm font-black text-white">Nessuna task trovata</p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setQuery(''); setFilterPriority('all'); setFilterCategory('all'); setFilterAthleteId('all'); setFilterType('all'); }}
                  className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold cursor-pointer"
                >
                  Resetta Filtri
                </button>
                <button type="button" onClick={() => { setEditingTask(null); setIsModalOpen(true); }} className="px-4 py-2 rounded-xl bg-[var(--color-primary)] text-slate-950 font-black text-xs cursor-pointer">
                  + Nuova Task
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {listTasks.map((task) => (
                <TaskRow key={task.id} {...taskRowProps(task)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          VISTA: BOARD / KANBAN
      ════════════════════════════════════════════════════ */}
      {viewMode === 'board' && (
        <TaskBoardView
          tasks={tasks}
          onMoveKanban={updateTaskKanban}
          onComplete={handleComplete}
        />
      )}

      {/* ════════════════════════════════════════════════════
          VISTA: SETTIMANA
      ════════════════════════════════════════════════════ */}
      {viewMode === 'week' && weekGroups && (
        <div className="space-y-6">
          {(
            [
              { list: weekGroups.overdueList,    label: 'In Ritardo',        dotCls: 'bg-rose-500 animate-pulse',  textCls: 'text-rose-400'    },
              { list: weekGroups.todayList,       label: 'Oggi',              dotCls: 'bg-amber-400',               textCls: 'text-amber-300'   },
              { list: weekGroups.tomorrowList,    label: 'Domani',            dotCls: 'bg-sky-400',                 textCls: 'text-sky-300'     },
              { list: weekGroups.thisWeekList,    label: 'Questa Settimana',  dotCls: 'bg-purple-400',              textCls: 'text-purple-300'  },
              { list: weekGroups.beyondList,      label: 'Oltre 7 Giorni',    dotCls: 'bg-slate-600',               textCls: 'text-slate-400'   },
            ] as const
          ).map(({ list, label, dotCls, textCls }) =>
            list.length > 0 ? (
              <div key={label} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${dotCls}`} />
                  <h3 className={`text-xs font-black uppercase tracking-wider ${textCls}`}>
                    {label} ({list.length})
                  </h3>
                </div>
                {list.map((task) => (
                  <TaskRow key={task.id} {...taskRowProps(task)} showReschedule />
                ))}
              </div>
            ) : null
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          VISTA: COMPLETATE
      ════════════════════════════════════════════════════ */}
      {viewMode === 'completed' && (
        <div className="space-y-2">
          {/* Filtro ricerca sullo storico */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cerca nelle completate..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>
          {listTasks.length === 0 ? (
            <div className="py-14 rounded-2xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-500 font-bold">
              Nessuna attività completata nello storico.
            </div>
          ) : (
            listTasks.map((task) => (
              <div
                key={task.id}
                className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 opacity-75 hover:opacity-100 transition-opacity flex items-center gap-3"
              >
                <div className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
                <div className="flex-1 min-w-0">
                  {task.athleteName && <p className="text-[10px] text-[var(--color-primary)] font-bold">{task.athleteName}</p>}
                  <h4 className="text-xs font-bold text-slate-300 line-through truncate">{task.title}</h4>
                </div>
                <span className="text-[10px] text-slate-500 shrink-0">
                  {task.completedAt ? new Date(task.completedAt).toLocaleDateString('it-IT') : '—'}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          VISTA: INBOX
      ════════════════════════════════════════════════════ */}
      {viewMode === 'inbox' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-black text-slate-300">Inbox personale</span>
              <p className="text-[10px] text-slate-500 mt-0.5">Idee, note e task non ancora organizzate</p>
            </div>
          </div>

          {/* Quick Capture anche nell'inbox */}
          <QuickCapture onCapture={handleQuickCapture} />

          {inboxTasks.length === 0 ? (
            <div className="py-14 rounded-2xl bg-slate-950 border border-slate-800 text-center">
              <Inbox className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-black text-white">Inbox vuota</p>
              <p className="text-xs text-slate-400 mt-1">Cattura idee e note sopra — ci penserai dopo!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {inboxTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  {...taskRowProps(task)}
                  showReschedule={false}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── MODALE TASK ─── */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingTask(null); }}
        onSave={handleSave}
        editingTask={editingTask}
      />

      {/* ─── MODALE ELIMINAZIONE ─── */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-white">Elimina Task</h3>
              <p className="text-xs text-slate-400">
                Sei sicuro di voler rimuovere "{deleteModal.taskTitle || 'questa attività'}"?
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModal({ open: false, taskId: null })}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => deleteModal.taskId && handleDelete(deleteModal.taskId)}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs cursor-pointer shadow-lg shadow-rose-600/30"
              >
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Componente Bot icona per backward compat */}
      <span className="hidden"><Bot /></span>
      <span className="hidden"><Edit2 /></span>
      <span className="hidden"><AlertTriangle /></span>
    </div>
  );
};
