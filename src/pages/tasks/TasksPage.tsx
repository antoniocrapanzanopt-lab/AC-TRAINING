import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  CheckSquare,
  AlertTriangle,
  User,
  Copy,
  Trash2,
  Edit2,
  CheckCircle2,
  Sparkles,
  Bot,
  Flame,
  Scale,
  Dumbbell,
  CreditCard,
  PhoneCall,
  FileText,
  HeartHandshake,
  Check,
  CalendarDays,
  History,
  ListTodo,
  ExternalLink,
} from 'lucide-react';
import { AthleteTask, TaskPriority, TaskCategory, TaskFormData } from '../../types';
import { useTasks } from '../../context/TasksContext';
import { useAthletes } from '../../context/AthletesContext';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { TaskModal } from '../../components/tasks/TaskModal';
import { getDaysRemaining } from '../../lib/statusEngine';

// Configurazione Categorie Coaching Operativo
export const TASK_CATEGORY_CONFIG: Record<
  TaskCategory,
  { label: string; icon: React.FC<{ className?: string }>; badgeCls: string; borderCls: string }
> = {
  checkin: {
    label: 'Check-in',
    icon: CheckSquare,
    badgeCls: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    borderCls: 'border-purple-500/30 hover:border-purple-400',
  },
  measurements: {
    label: 'Misure & Foto',
    icon: Scale,
    badgeCls: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
    borderCls: 'border-pink-500/30 hover:border-pink-400',
  },
  workout_plan: {
    label: 'Scheda Allenamento',
    icon: Dumbbell,
    badgeCls: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    borderCls: 'border-amber-500/30 hover:border-amber-400',
  },
  nutrition: {
    label: 'Nutrizione & Macro',
    icon: Flame,
    badgeCls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    borderCls: 'border-emerald-500/30 hover:border-emerald-400',
  },
  payment: {
    label: 'Pagamento & Rate',
    icon: CreditCard,
    badgeCls: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    borderCls: 'border-sky-500/30 hover:border-sky-400',
  },
  appointment: {
    label: 'Appuntamento / Call',
    icon: PhoneCall,
    badgeCls: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    borderCls: 'border-cyan-500/30 hover:border-cyan-400',
  },
  document: {
    label: 'Documento / Certificato',
    icon: FileText,
    badgeCls: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    borderCls: 'border-orange-500/30 hover:border-orange-400',
  },
  follow_up: {
    label: 'Follow-up Coach',
    icon: HeartHandshake,
    badgeCls: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    borderCls: 'border-rose-500/30 hover:border-rose-400',
  },
  training: {
    label: 'Allenamento',
    icon: Dumbbell,
    badgeCls: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    borderCls: 'border-amber-500/30 hover:border-amber-400',
  },
  assessment: {
    label: 'Valutazione / Plicometria',
    icon: Scale,
    badgeCls: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
    borderCls: 'border-pink-500/30 hover:border-pink-400',
  },
  call: {
    label: 'Chiamata',
    icon: PhoneCall,
    badgeCls: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    borderCls: 'border-cyan-500/30 hover:border-cyan-400',
  },
  checkup: {
    label: 'Checkup',
    icon: CheckSquare,
    badgeCls: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    borderCls: 'border-purple-500/30 hover:border-purple-400',
  },
  administrative: {
    label: 'Amministrativa',
    icon: FileText,
    badgeCls: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
    borderCls: 'border-slate-700 hover:border-slate-600',
  },
  other: {
    label: 'Altro',
    icon: Sparkles,
    badgeCls: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
    borderCls: 'border-slate-700 hover:border-slate-600',
  },
};

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; cls: string; dotCls: string }> = {
  urgent: {
    label: 'Urgente',
    cls: 'text-rose-400 bg-rose-950/40 border-rose-500/50 font-black',
    dotCls: 'bg-rose-500 animate-pulse shadow-[0_0_8px_#f43f5e]',
  },
  high: {
    label: 'Alta',
    cls: 'text-amber-400 bg-amber-950/40 border-amber-500/40 font-bold',
    dotCls: 'bg-amber-400',
  },
  medium: {
    label: 'Media',
    cls: 'text-blue-400 bg-blue-950/40 border-blue-500/40 font-medium',
    dotCls: 'bg-blue-400',
  },
  low: {
    label: 'Bassa',
    cls: 'text-slate-400 bg-slate-900 border-slate-700 font-medium',
    dotCls: 'bg-slate-500',
  },
};

type ViewMode = 'operative' | 'timeline' | 'completed';
type SortOption = 'urgent' | 'deadline' | 'recent' | 'athlete';

export const TasksPage: React.FC = () => {
  const {
    tasks,
    addTask,
    updateTask,
    completeTask,
    rescheduleTask,
    duplicateTask,
    deleteTask,
  } = useTasks();
  const { athletes, setSelectedAthleteId } = useAthletes();
  const { setActiveTab } = useApp();
  const { showSuccess, showInfo } = useToast();

  // Vista Selezionata
  const [viewMode, setViewMode] = useState<ViewMode>('operative');

  // Filtri
  const [query, setQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'overdue' | 'today' | 'upcoming' | 'system' | 'manual'>('all');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<TaskCategory | 'all'>('all');
  const [filterAthleteId, setFilterAthleteId] = useState<string>('all');
  const [sortOption, setSortOption] = useState<SortOption>('urgent');

  // Modali
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<AthleteTask | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; taskId: string | null; taskTitle?: string }>({
    open: false,
    taskId: null,
  });

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // ─── 1. CALCOLO METRICHE & STATO DECISIONALE ───
  const metrics = useMemo(() => {
    let overdue = 0;
    let today = 0;
    let upcoming = 0;
    let completed = 0;
    let urgentToday = 0;
    let lateCheckins = 0;
    let expiringWorkouts = 0;
    let followUps = 0;
    let systemGenerated = 0;

    tasks.forEach((t) => {
      const isCompleted = t.status === 'completed';
      const isCancelled = t.status === 'cancelled';

      if (isCompleted) {
        completed++;
        return;
      }
      if (isCancelled) return;

      if (t.origin === 'system') systemGenerated++;

      const days = getDaysRemaining(t.dueDate);
      const isOverdue = t.status === 'overdue' || days < 0;
      const isToday = t.dueDate === todayStr;

      if (isOverdue) overdue++;
      else if (isToday) today++;
      else if (days > 0) upcoming++;

      if ((isOverdue || isToday) && (t.priority === 'urgent' || t.priority === 'high')) {
        urgentToday++;
      }

      if (t.category === 'checkin' || t.category === 'measurements' || t.category === 'checkup') {
        if (isOverdue || isToday) lateCheckins++;
      }

      if (t.category === 'workout_plan' || t.category === 'training') {
        if (isOverdue || isToday || (days >= 0 && days <= 5)) expiringWorkouts++;
      }

      if (t.category === 'follow_up' || t.category === 'call' || t.category === 'appointment') {
        if (isOverdue || isToday) followUps++;
      }
    });

    const totalActive = tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled').length;

    return {
      total: tasks.length,
      totalActive,
      overdue,
      today,
      upcoming,
      completed,
      urgentToday,
      lateCheckins,
      expiringWorkouts,
      followUps,
      systemGenerated,
    };
  }, [tasks, todayStr]);

  // ─── 2. FILTRAGGIO & ORDINAMENTO TASK ───
  const filteredTasks = useMemo(() => {
    const q = query.toLowerCase().trim();

    return tasks
      .filter((t) => {
        // Filtro Vista
        if (viewMode === 'completed') {
          if (t.status !== 'completed') return false;
        } else {
          // In vista operativa o timeline escludiamo i completati/annullati
          if (t.status === 'completed' || t.status === 'cancelled') return false;
        }

        // Filtro Tab
        const days = getDaysRemaining(t.dueDate);
        const isOverdue = t.status === 'overdue' || days < 0;
        const isToday = t.dueDate === todayStr;

        if (filterTab === 'overdue' && !isOverdue) return false;
        if (filterTab === 'today' && (!isToday || isOverdue)) return false;
        if (filterTab === 'upcoming' && (days <= 0 || isOverdue)) return false;
        if (filterTab === 'system' && t.origin !== 'system') return false;
        if (filterTab === 'manual' && t.origin === 'system') return false;

        // Filtro Ricerca
        if (q) {
          const matchTitle = t.title.toLowerCase().includes(q);
          const matchAthlete = (t.athleteName || '').toLowerCase().includes(q);
          const matchDesc = (t.description || '').toLowerCase().includes(q);
          if (!matchTitle && !matchAthlete && !matchDesc) return false;
        }

        // Filtri Dropdown
        if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
        if (filterCategory !== 'all' && t.category !== filterCategory) return false;
        if (filterAthleteId !== 'all' && t.athleteId !== filterAthleteId) return false;

        return true;
      })
      .sort((a, b) => {
        if (viewMode === 'completed') {
          const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
          const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
          return dateB - dateA;
        }

        if (sortOption === 'urgent') {
          const pOrder: Record<TaskPriority, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
          const daysA = getDaysRemaining(a.dueDate);
          const daysB = getDaysRemaining(b.dueDate);
          const overdueA = daysA < 0 ? 10 : 0;
          const overdueB = daysB < 0 ? 10 : 0;
          const scoreA = pOrder[a.priority] + overdueA;
          const scoreB = pOrder[b.priority] + overdueB;
          if (scoreB !== scoreA) return scoreB - scoreA;
          return daysA - daysB;
        }

        if (sortOption === 'deadline') {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }

        if (sortOption === 'recent') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }

        if (sortOption === 'athlete') {
          return (a.athleteName || '').localeCompare(b.athleteName || '');
        }

        return 0;
      });
  }, [tasks, viewMode, filterTab, query, filterPriority, filterCategory, filterAthleteId, sortOption, todayStr]);

  // ─── 3. RAGGRUPPAMENTO PER TIMELINE TEMPORALE ───
  const timelineGroups = useMemo(() => {
    if (viewMode !== 'timeline') return null;

    const overdueList: AthleteTask[] = [];
    const todayList: AthleteTask[] = [];
    const tomorrowList: AthleteTask[] = [];
    const thisWeekList: AthleteTask[] = [];
    const nextWeekAndBeyondList: AthleteTask[] = [];

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    filteredTasks.forEach((t) => {
      const days = getDaysRemaining(t.dueDate);
      if (days < 0 || t.status === 'overdue') {
        overdueList.push(t);
      } else if (t.dueDate === todayStr) {
        todayList.push(t);
      } else if (t.dueDate === tomorrowStr) {
        tomorrowList.push(t);
      } else if (days <= 7) {
        thisWeekList.push(t);
      } else {
        nextWeekAndBeyondList.push(t);
      }
    });

    return {
      overdueList,
      todayList,
      tomorrowList,
      thisWeekList,
      nextWeekAndBeyondList,
    };
  }, [viewMode, filteredTasks, todayStr]);

  // ─── AZIONI RAPIDE SUI TASK ───
  const handleSave = (data: TaskFormData) => {
    if (editingTask) {
      updateTask(editingTask.id, data);
      showSuccess('Modificato', 'Attività aggiornata con successo.');
    } else {
      addTask(data);
      showSuccess('Pianificata', 'Nuova attività aggiunta al registro.');
    }
  };

  const handleComplete = (id: string) => {
    if (completeTask(id)) {
      showSuccess('Attività completata!', 'Registrata nello storico completate.');
    }
  };

  const handleReschedule = (id: string, daysToAdd: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysToAdd);
    const newDate = target.toISOString().slice(0, 10);
    rescheduleTask(id, newDate);
    showSuccess(
      'Riprogrammata',
      `Attività posticipata al ${new Date(newDate).toLocaleDateString('it-IT')}.`
    );
  };

  const handleDuplicate = (id: string) => {
    const dup = duplicateTask(id);
    if (dup) {
      showInfo('Attività duplicata', `Creata copia: "${dup.title}".`);
    }
  };

  const handleDelete = (id: string) => {
    deleteTask(id);
    showInfo('Eliminata', 'Attività rimossa dal registro.');
    setDeleteModal({ open: false, taskId: null });
  };

  const handleNavigateToAthlete = (athleteId?: string) => {
    if (athleteId) {
      setSelectedAthleteId(athleteId);
      setActiveTab('atleti');
    }
  };

  // Helper formattazione scadenza
  const formatDeadline = (dueDate: string) => {
    const days = getDaysRemaining(dueDate);
    if (days < 0) {
      return {
        text: `In ritardo di ${Math.abs(days)} ${Math.abs(days) === 1 ? 'giorno' : 'giorni'}`,
        cls: 'text-rose-400 bg-rose-950/60 border-rose-500/50 font-black',
        isOverdue: true,
      };
    }
    if (days === 0) {
      return {
        text: 'Scade oggi',
        cls: 'text-amber-400 bg-amber-950/50 border-amber-500/40 font-bold',
        isOverdue: false,
      };
    }
    if (days === 1) {
      return {
        text: 'Scade domani',
        cls: 'text-sky-300 bg-sky-950/40 border-sky-500/30',
        isOverdue: false,
      };
    }
    return {
      text: `Tra ${days} giorni (${new Date(dueDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })})`,
      cls: 'text-slate-300 bg-slate-900 border-slate-800',
      isOverdue: false,
    };
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16 animate-in fade-in duration-200">
      
      {/* ─── HEADER PRINCIPALE ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Registro Attività e Task
            </h1>
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[var(--color-primary)]/15 text-[var(--color-primary)] border border-[var(--color-primary)]/30">
              Centro Operativo Coach
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
            Decision-first: monitora ritardi, automazioni di sistema e priorità di coaching.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingTask(null);
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[var(--color-primary)] text-slate-950 font-black text-xs sm:text-sm hover:bg-[var(--color-primary-hover)] transition-all shadow-[0_0_20px_rgba(234,179,8,0.25)] cursor-pointer self-start sm:self-auto active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Nuova Attività</span>
        </button>
      </div>

      {/* ─── 1. BLOCCO PRIORITÀ OGGI (DECISION-FIRST COMMAND CENTER) ─── */}
      <div className="p-5 sm:p-7 rounded-3xl bg-gradient-to-r from-slate-950 via-[#101420] to-slate-950 border border-slate-800 shadow-2xl space-y-5 relative overflow-hidden">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-primary)] block">
              Priorità & Decisioni Oggi
            </span>
            <h2 className="text-lg sm:text-xl font-black text-white mt-0.5">
              Cosa richiede il tuo intervento immediato
            </h2>
          </div>

          {/* Quick Action CTA */}
          <div className="flex items-center gap-2 flex-wrap">
            {metrics.overdue > 0 && (
              <button
                type="button"
                onClick={() => {
                  setViewMode('operative');
                  setFilterTab('overdue');
                }}
                className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                <span>Apri Urgenti & Ritardi ({metrics.overdue})</span>
              </button>
            )}

            {metrics.lateCheckins > 0 && (
              <button
                type="button"
                onClick={() => {
                  setViewMode('operative');
                  setFilterCategory('checkin');
                  setFilterTab('all');
                }}
                className="px-3.5 py-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/40 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <CheckSquare className="w-3.5 h-3.5 text-purple-400" />
                <span>Check-in / Misure ({metrics.lateCheckins})</span>
              </button>
            )}

            {metrics.expiringWorkouts > 0 && (
              <button
                type="button"
                onClick={() => {
                  setViewMode('operative');
                  setFilterCategory('workout_plan');
                  setFilterTab('all');
                }}
                className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Dumbbell className="w-3.5 h-3.5 text-amber-400" />
                <span>Schede in Scadenza ({metrics.expiringWorkouts})</span>
              </button>
            )}
          </div>
        </div>

        {/* 5 Card di Sintesi Decisionale */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 relative z-10">
          
          {/* 1. Urgenti / In Ritardo */}
          <div
            onClick={() => {
              setViewMode('operative');
              setFilterTab('overdue');
            }}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
              metrics.overdue > 0
                ? 'bg-rose-950/40 border-rose-500/40 hover:border-rose-400 shadow-lg shadow-rose-950/30'
                : 'bg-slate-900/60 border-slate-800 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">Scaduti / Ritardi</span>
              <AlertTriangle className={`w-3.5 h-3.5 ${metrics.overdue > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-600'}`} />
            </div>
            <div className="text-2xl font-black text-white mt-1">{metrics.overdue}</div>
            <span className="text-[10px] text-slate-400 block mt-0.5">Richiedono azione</span>
          </div>

          {/* 2. Check-in & Misure */}
          <div
            onClick={() => {
              setViewMode('operative');
              setFilterCategory('checkin');
            }}
            className="p-3.5 rounded-2xl bg-slate-900/60 border border-purple-500/30 hover:border-purple-400 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-400">Check-in / Misure</span>
              <Scale className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-white mt-1">{metrics.lateCheckins}</div>
            <span className="text-[10px] text-slate-400 block mt-0.5">Da verificare o inviare</span>
          </div>

          {/* 3. Rinnovi Schede & Piani */}
          <div
            onClick={() => {
              setViewMode('operative');
              setFilterCategory('workout_plan');
            }}
            className="p-3.5 rounded-2xl bg-slate-900/60 border border-amber-500/30 hover:border-amber-400 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">Schede in Scadenza</span>
              <Dumbbell className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-white mt-1">{metrics.expiringWorkouts}</div>
            <span className="text-[10px] text-slate-400 block mt-0.5">Fine blocco o mesociclo</span>
          </div>

          {/* 4. Follow-up & Call */}
          <div
            onClick={() => {
              setViewMode('operative');
              setFilterCategory('follow_up');
            }}
            className="p-3.5 rounded-2xl bg-slate-900/60 border border-rose-500/30 hover:border-rose-400 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-300">Follow-up Coach</span>
              <HeartHandshake className="w-3.5 h-3.5 text-rose-300" />
            </div>
            <div className="text-2xl font-black text-white mt-1">{metrics.followUps}</div>
            <span className="text-[10px] text-slate-400 block mt-0.5">Dolori o contatto</span>
          </div>

          {/* 5. Automazioni Sistema */}
          <div
            onClick={() => {
              setViewMode('operative');
              setFilterTab('system');
            }}
            className="p-3.5 rounded-2xl bg-slate-900/60 border border-cyan-500/30 hover:border-cyan-400 transition-all cursor-pointer col-span-2 sm:col-span-1"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400">Task Sistema</span>
              <Bot className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-2xl font-black text-white mt-1">{metrics.systemGenerated}</div>
            <span className="text-[10px] text-slate-400 block mt-0.5">Rilevate in automatico</span>
          </div>

        </div>

      </div>

      {/* ─── 2. KPI DI STATO INTERATTIVI & NAVIGAZIONE VISTE ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Toggle Viste Principali */}
        <div className="inline-flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800 gap-1 shadow-inner self-start">
          <button
            type="button"
            onClick={() => setViewMode('operative')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              viewMode === 'operative'
                ? 'bg-[var(--color-primary)] text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ListTodo className="w-4 h-4" />
            <span>Task da Fare ({metrics.totalActive})</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('timeline')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              viewMode === 'timeline'
                ? 'bg-[var(--color-primary)] text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>Timeline Prossime</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('completed')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              viewMode === 'completed'
                ? 'bg-[var(--color-primary)] text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Storico Completate ({metrics.completed})</span>
          </button>
        </div>

        {/* Tab Filtro Rapido Stato (per vista operativa) */}
        {viewMode === 'operative' && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterTab === 'all'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              Tutte ({metrics.totalActive})
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('overdue')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                filterTab === 'overdue'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'text-slate-400 hover:text-rose-300'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Scadute ({metrics.overdue})
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('today')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                filterTab === 'today'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-amber-300'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Oggi ({metrics.today})
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('upcoming')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                filterTab === 'upcoming'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                  : 'text-slate-400 hover:text-blue-300'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              Prossime ({metrics.upcoming})
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('system')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                filterTab === 'system'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-cyan-300'
              }`}
            >
              <Bot className="w-3 h-3 text-cyan-400" />
              Sistema ({metrics.systemGenerated})
            </button>
          </div>
        )}

      </div>

      {/* ─── 3. BARRA DI RICERCA, FILTRI AVANZATI & ORDINAMENTO ─── */}
      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 shadow-xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          
          {/* Cerca */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cerca per titolo, atleta o note..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          {/* Filtro Categoria */}
          <div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as TaskCategory | 'all')}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200 focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
            >
              <option value="all">Tutte le Categorie</option>
              <option value="checkin">📊 Check-in</option>
              <option value="measurements">📏 Misure & Foto</option>
              <option value="workout_plan">🏋️ Scheda Allenamento</option>
              <option value="nutrition">🥗 Nutrizione & Macro</option>
              <option value="payment">💳 Pagamento / Rata</option>
              <option value="appointment">📞 Appuntamento / Call</option>
              <option value="document">📄 Documento / Certificato</option>
              <option value="follow_up">🤝 Follow-up Coach</option>
              <option value="other">⚙️ Altro / Amministrativo</option>
            </select>
          </div>

          {/* Filtro Atleta */}
          <div>
            <select
              value={filterAthleteId}
              onChange={(e) => setFilterAthleteId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200 focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
            >
              <option value="all">Tutti gli Atleti</option>
              {athletes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.fullName}
                </option>
              ))}
            </select>
          </div>

          {/* Ordinamento */}
          <div>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200 focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
            >
              <option value="urgent">⚡ Più Urgenti & Scaduti</option>
              <option value="deadline">📅 Scadenza più vicina</option>
              <option value="recent">⏱️ Più Recenti</option>
              <option value="athlete">👤 Nome Atleta (A-Z)</option>
            </select>
          </div>

        </div>
      </div>

      {/* ─── 4. CONTENUTO PRINCIPALE IN BASE ALLA VISTA ─── */}

      {/* ─── VISTA 1: TASK OPERATIVO COMPATTO (DECISION-FIRST) ─── */}
      {viewMode === 'operative' && (
        <div className="space-y-2.5">
          {filteredTasks.length === 0 ? (
            <div className="py-16 px-4 rounded-3xl bg-slate-950/80 border border-slate-800 text-center space-y-4 shadow-xl">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-base sm:text-lg font-black text-white">Tutto sotto controllo!</h3>
                <p className="text-xs text-slate-400">
                  {query || filterCategory !== 'all' || filterAthleteId !== 'all' || filterTab !== 'all'
                    ? 'Nessuna attività trovata con i filtri selezionati.'
                    : 'Non ci sono attività urgenti o task in attesa di essere gestiti.'}
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                {(query || filterCategory !== 'all' || filterAthleteId !== 'all' || filterTab !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      setFilterTab('all');
                      setFilterCategory('all');
                      setFilterAthleteId('all');
                      setFilterPriority('all');
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold cursor-pointer"
                  >
                    Resetta Filtri
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setEditingTask(null);
                    setIsModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-[var(--color-primary)] text-slate-950 font-black text-xs cursor-pointer shadow-md"
                >
                  + Nuova Attività
                </button>
              </div>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const catCfg = TASK_CATEGORY_CONFIG[task.category] || TASK_CATEGORY_CONFIG.other;
              const CatIcon = catCfg.icon;
              const prioCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
              const deadline = formatDeadline(task.dueDate);
              const isSystem = task.origin === 'system';

              return (
                <div
                  key={task.id}
                  className={`p-3.5 sm:p-4 rounded-2xl bg-slate-950/90 border transition-all hover:bg-slate-900/60 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 group ${
                    deadline.isOverdue
                      ? 'border-rose-500/40 shadow-rose-950/20'
                      : 'border-slate-800/90 hover:border-slate-700'
                  }`}
                >
                  {/* Sinistra: Checkbox & Dettagli Task */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    
                    {/* Checkbox Completa Subito */}
                    <button
                      type="button"
                      onClick={() => handleComplete(task.id)}
                      title="Segna come completata"
                      className="w-7 h-7 rounded-xl border-2 border-slate-700 hover:border-emerald-400 hover:bg-emerald-500/20 flex items-center justify-center text-transparent hover:text-emerald-400 transition-all shrink-0 mt-0.5 cursor-pointer shadow-sm active:scale-90"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                    </button>

                    <div className="min-w-0 space-y-1 flex-1">
                      
                      {/* Riga Superiore: Categoria, Origine, Priorità */}
                      <div className="flex items-center gap-2 flex-wrap text-[10px]">
                        
                        {/* Categoria */}
                        <span className={`px-2 py-0.5 rounded-md font-black border flex items-center gap-1 ${catCfg.badgeCls}`}>
                          <CatIcon className="w-3 h-3 shrink-0" />
                          <span>{catCfg.label}</span>
                        </span>

                        {/* Origine: Sistema vs Coach */}
                        {isSystem ? (
                          <span className="px-2 py-0.5 rounded-md font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                            <Bot className="w-3 h-3 text-cyan-400" />
                            <span>Automatico</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md font-bold bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            <span>Creato dal coach</span>
                          </span>
                        )}

                        {/* Priorità */}
                        <span className={`px-2 py-0.5 rounded-md border flex items-center gap-1 ${prioCfg.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${prioCfg.dotCls}`} />
                          <span>{prioCfg.label}</span>
                        </span>

                        {/* Scadenza Badge */}
                        <span className={`px-2 py-0.5 rounded-md border text-[10px] ${deadline.cls}`}>
                          {deadline.text}
                        </span>

                      </div>

                      {/* Titolo e Descrizione */}
                      <div>
                        <h4 className="text-xs sm:text-sm font-black text-white leading-snug">
                          {task.title}
                        </h4>
                        {task.description && (
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            {task.description}
                          </p>
                        )}
                      </div>

                      {/* Atleta Collegato */}
                      {task.athleteName && (
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <span className="text-[10px] text-slate-500 font-bold uppercase">Atleta:</span>
                          <button
                            type="button"
                            onClick={() => handleNavigateToAthlete(task.athleteId)}
                            className="text-xs font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>{task.athleteName}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      )}

                    </div>
                  </div>

                  {/* Destra: Azioni Rapide */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800/80">
                    
                    {/* Riprogramma Veloce */}
                    <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5 gap-0.5 text-[10px]">
                      <button
                        type="button"
                        onClick={() => handleReschedule(task.id, 1)}
                        title="Posticipa di 1 giorno"
                        className="px-2 py-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 font-bold transition-colors cursor-pointer"
                      >
                        +1g
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReschedule(task.id, 3)}
                        title="Posticipa di 3 giorni"
                        className="px-2 py-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 font-bold transition-colors cursor-pointer"
                      >
                        +3g
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReschedule(task.id, 7)}
                        title="Posticipa di 1 settimana"
                        className="px-2 py-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 font-bold transition-colors cursor-pointer"
                      >
                        +1sett
                      </button>
                    </div>

                    {/* Modifica */}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTask(task);
                        setIsModalOpen(true);
                      }}
                      title="Modifica attività"
                      className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Duplica */}
                    <button
                      type="button"
                      onClick={() => handleDuplicate(task.id)}
                      title="Duplica attività"
                      className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    {/* Elimina */}
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteModal({
                          open: true,
                          taskId: task.id,
                          taskTitle: task.title,
                        })
                      }
                      title="Elimina attività"
                      className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/40 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                  </div>

                </div>
              );
            })
          )}
        </div>
      )}

      {/* ─── VISTA 2: TIMELINE PROSSIME ATTIVITÀ ─── */}
      {viewMode === 'timeline' && timelineGroups && (
        <div className="space-y-6">
          
          {/* 🔴 In Ritardo / Scadute */}
          {timelineGroups.overdueList.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_#f43f5e]" />
                <h3 className="text-sm font-black text-rose-400 uppercase tracking-wider">
                  In Ritardo & Scadute ({timelineGroups.overdueList.length})
                </h3>
              </div>
              <div className="space-y-2">
                {timelineGroups.overdueList.map((task) => (
                  <TimelineTaskRow
                    key={task.id}
                    task={task}
                    onComplete={handleComplete}
                    onNavigateAthlete={handleNavigateToAthlete}
                    onEdit={(t) => {
                      setEditingTask(t);
                      setIsModalOpen(true);
                    }}
                    onReschedule={handleReschedule}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 🟡 Oggi */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-400" />
              <h3 className="text-sm font-black text-amber-300 uppercase tracking-wider">
                Oggi ({timelineGroups.todayList.length})
              </h3>
            </div>
            {timelineGroups.todayList.length === 0 ? (
              <p className="text-xs text-slate-500 italic pl-5">Nessuna attività programmata per oggi.</p>
            ) : (
              <div className="space-y-2">
                {timelineGroups.todayList.map((task) => (
                  <TimelineTaskRow
                    key={task.id}
                    task={task}
                    onComplete={handleComplete}
                    onNavigateAthlete={handleNavigateToAthlete}
                    onEdit={(t) => {
                      setEditingTask(t);
                      setIsModalOpen(true);
                    }}
                    onReschedule={handleReschedule}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 🔵 Domani */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-sky-400" />
              <h3 className="text-sm font-black text-sky-300 uppercase tracking-wider">
                Domani ({timelineGroups.tomorrowList.length})
              </h3>
            </div>
            {timelineGroups.tomorrowList.length === 0 ? (
              <p className="text-xs text-slate-500 italic pl-5">Nessuna attività per domani.</p>
            ) : (
              <div className="space-y-2">
                {timelineGroups.tomorrowList.map((task) => (
                  <TimelineTaskRow
                    key={task.id}
                    task={task}
                    onComplete={handleComplete}
                    onNavigateAthlete={handleNavigateToAthlete}
                    onEdit={(t) => {
                      setEditingTask(t);
                      setIsModalOpen(true);
                    }}
                    onReschedule={handleReschedule}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 🟣 Questa Settimana */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-purple-400" />
              <h3 className="text-sm font-black text-purple-300 uppercase tracking-wider">
                Questa Settimana ({timelineGroups.thisWeekList.length})
              </h3>
            </div>
            {timelineGroups.thisWeekList.length === 0 ? (
              <p className="text-xs text-slate-500 italic pl-5">Nessuna attività nei prossimi giorni della settimana.</p>
            ) : (
              <div className="space-y-2">
                {timelineGroups.thisWeekList.map((task) => (
                  <TimelineTaskRow
                    key={task.id}
                    task={task}
                    onComplete={handleComplete}
                    onNavigateAthlete={handleNavigateToAthlete}
                    onEdit={(t) => {
                      setEditingTask(t);
                      setIsModalOpen(true);
                    }}
                    onReschedule={handleReschedule}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ⚪ Prossima Settimana & Oltre */}
          {timelineGroups.nextWeekAndBeyondList.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-slate-600" />
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider">
                  Prossima Settimana & Oltre ({timelineGroups.nextWeekAndBeyondList.length})
                </h3>
              </div>
              <div className="space-y-2">
                {timelineGroups.nextWeekAndBeyondList.map((task) => (
                  <TimelineTaskRow
                    key={task.id}
                    task={task}
                    onComplete={handleComplete}
                    onNavigateAthlete={handleNavigateToAthlete}
                    onEdit={(t) => {
                      setEditingTask(t);
                      setIsModalOpen(true);
                    }}
                    onReschedule={handleReschedule}
                  />
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ─── VISTA 3: STORICO COMPLETATE ─── */}
      {viewMode === 'completed' && (
        <div className="space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs font-bold rounded-3xl bg-slate-950 border border-slate-800">
              Nessuna attività completata nello storico.
            </div>
          ) : (
            filteredTasks.map((task) => {
              const catCfg = TASK_CATEGORY_CONFIG[task.category] || TASK_CATEGORY_CONFIG.other;
              const CatIcon = catCfg.icon;

              return (
                <div
                  key={task.id}
                  className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 opacity-75 hover:opacity-100 transition-opacity flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border flex items-center gap-1 ${catCfg.badgeCls}`}>
                          <CatIcon className="w-2.5 h-2.5 shrink-0" />
                          <span>{catCfg.label}</span>
                        </span>
                        {task.athleteName && (
                          <span className="text-[11px] font-bold text-[var(--color-primary)]">
                            {task.athleteName}
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-300 line-through mt-0.5">
                        {task.title}
                      </h4>
                    </div>
                  </div>

                  <div className="text-right text-[11px] text-slate-400 shrink-0">
                    <span className="block font-medium">
                      Completata il {task.completedAt ? new Date(task.completedAt).toLocaleDateString('it-IT') : new Date().toLocaleDateString('it-IT')}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ─── MODALE CREAZIONE / MODIFICA TASK ─── */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSave}
        editingTask={editingTask}
      />

      {/* ─── MODALE CONFERMA ELIMINAZIONE ─── */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-white">Elimina Attività</h3>
              <p className="text-xs text-slate-400">
                Sei sicuro di voler rimuovere "{deleteModal.taskTitle || 'questa attività'}" dal registro?
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

    </div>
  );
};

// Componente riga compatto per la Timeline
const TimelineTaskRow: React.FC<{
  task: AthleteTask;
  onComplete: (id: string) => void;
  onNavigateAthlete: (athleteId?: string) => void;
  onEdit: (task: AthleteTask) => void;
  onReschedule: (id: string, days: number) => void;
}> = ({ task, onComplete, onNavigateAthlete, onEdit, onReschedule }) => {
  const catCfg = TASK_CATEGORY_CONFIG[task.category] || TASK_CATEGORY_CONFIG.other;
  const isSystem = task.origin === 'system';

  return (
    <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between gap-3 shadow-md">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={() => onComplete(task.id)}
          title="Completa subito"
          className="w-6 h-6 rounded-lg border-2 border-slate-700 hover:border-emerald-400 hover:bg-emerald-500/20 flex items-center justify-center text-transparent hover:text-emerald-400 transition-all shrink-0 cursor-pointer"
        >
          <Check className="w-3.5 h-3.5 stroke-[3]" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px]">
            <span className={`px-1.5 py-0.5 rounded font-black border ${catCfg.badgeCls}`}>
              {catCfg.label}
            </span>
            {isSystem && (
              <span className="text-cyan-400 font-bold flex items-center gap-0.5">
                <Bot className="w-2.5 h-2.5" /> Auto
              </span>
            )}
            {task.athleteName && (
              <button
                type="button"
                onClick={() => onNavigateAthlete(task.athleteId)}
                className="font-bold text-[var(--color-primary)] hover:underline truncate"
              >
                {task.athleteName}
              </button>
            )}
          </div>
          <h4 className="text-xs font-black text-white truncate mt-0.5">{task.title}</h4>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[10px]">
          <button
            type="button"
            onClick={() => onReschedule(task.id, 1)}
            title="Posticipa di 1 giorno"
            className="px-1.5 py-0.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 font-bold transition-colors cursor-pointer"
          >
            +1g
          </button>
          <button
            type="button"
            onClick={() => onReschedule(task.id, 3)}
            title="Posticipa di 3 giorni"
            className="px-1.5 py-0.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 font-bold transition-colors cursor-pointer"
          >
            +3g
          </button>
        </div>
        <button
          type="button"
          onClick={() => onEdit(task)}
          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs cursor-pointer"
        >
          <Edit2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
