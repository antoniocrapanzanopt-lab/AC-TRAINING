import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  CheckSquare,
  Clock,
  AlertTriangle,
  User,
  Calendar,
  Copy,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  Bell,
} from 'lucide-react';
import { AthleteTask, TaskPriority, TaskStatus, TaskCategory, TaskFormData } from '../../types';
import { useTasks } from '../../context/TasksContext';
import { useToast } from '../../context/ToastContext';
import { TaskModal } from '../../components/tasks/TaskModal';
import { getDaysRemaining } from '../../lib/statusEngine';

const priorityColors: Record<TaskPriority, string> = {
  low: 'text-slate-400 bg-slate-800 border-slate-700',
  medium: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  high: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  urgent: 'text-red-400 bg-red-400/10 border-red-400/20 font-black animate-pulse',
};

const categoryLabels: Record<TaskCategory, string> = {
  training: 'Allenamento',
  assessment: 'Valutazione / Plicometria',
  call: 'Chiamata',
  checkup: 'Checkup',
  administrative: 'Amministrativa',
  other: 'Altro',
};

export const TasksPage: React.FC = () => {
  const { tasks, addTask, updateTask, completeTask, cancelTask, duplicateTask, deleteTask } = useTasks();
  const { showSuccess, showInfo } = useToast();

  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<TaskCategory | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'all' | 'overdue' | 'today' | 'upcoming' | 'completed'>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<AthleteTask | null>(null);

  const [deleteModal, setDeleteModal] = useState<{ open: boolean; taskId: string | null }>({
    open: false,
    taskId: null,
  });

  const todayStr = new Date().toISOString().slice(0, 10);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return tasks.filter(t => {
      if (q && !t.title.toLowerCase().includes(q) && !(t.athleteName || '').toLowerCase().includes(q)) return false;
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
      if (filterCategory !== 'all' && t.category !== filterCategory) return false;

      const days = getDaysRemaining(t.dueDate);

      if (activeTab === 'overdue') return (t.status === 'overdue' || (days < 0 && t.status !== 'completed' && t.status !== 'cancelled'));
      if (activeTab === 'today') return t.dueDate === todayStr && t.status !== 'completed' && t.status !== 'cancelled';
      if (activeTab === 'upcoming') return days > 0 && t.status !== 'completed' && t.status !== 'cancelled';
      if (activeTab === 'completed') return t.status === 'completed';

      return true;
    }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [tasks, query, filterStatus, filterPriority, filterCategory, activeTab, todayStr]);

  const metrics = useMemo(() => {
    const overdue = tasks.filter(t => (t.status === 'overdue' || getDaysRemaining(t.dueDate) < 0) && t.status !== 'completed' && t.status !== 'cancelled').length;
    const today = tasks.filter(t => t.dueDate === todayStr && t.status !== 'completed' && t.status !== 'cancelled').length;
    const upcoming = tasks.filter(t => getDaysRemaining(t.dueDate) > 0 && t.status !== 'completed' && t.status !== 'cancelled').length;
    const completed = tasks.filter(t => t.status === 'completed').length;

    return { total: tasks.length, overdue, today, upcoming, completed };
  }, [tasks, todayStr]);

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
      showSuccess('Attività completata!', 'La data ed ora di completamento sono state registrate.');
    }
  };

  const handleDuplicate = (id: string) => {
    const dup = duplicateTask(id);
    if (dup) {
      showInfo('Attività duplicata', `Creata copia: "${dup.title}".`);
    }
  };

  const handleDelete = (id: string) => {
    deleteTask(id);
    showInfo('Eliminata', 'L\'attività è stata rimossa dal registro.');
    setDeleteModal({ open: false, taskId: null });
  };

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return '-';
    return new Date(isoStr).toLocaleDateString('it-IT');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Registro Attività e Task</h1>
          <p className="text-sm text-slate-400 mt-1">
            Gestisci schede di allenamento, plicometrie, chiamate e scadenze operative.
          </p>
        </div>
        <button
          onClick={() => { setEditingTask(null); setIsModalOpen(true); }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all shadow-[0_0_20px_rgba(234,179,8,0.2)]"
        >
          <Plus className="w-4 h-4" /> Nuova Attività
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <button
          onClick={() => setActiveTab('all')}
          className={`p-3 rounded-xl border text-left transition-all ${
            activeTab === 'all' ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]' : 'bg-[var(--color-panel)] border-[var(--color-panel-border)]'
          }`}
        >
          <span className="text-[10px] font-bold text-slate-500 uppercase block">Tutte ({metrics.total})</span>
          <span className="text-xl font-black text-white">{metrics.total}</span>
        </button>

        <button
          onClick={() => setActiveTab('overdue')}
          className={`p-3 rounded-xl border text-left transition-all ${
            activeTab === 'overdue' ? 'bg-red-950/40 border-red-500' : 'bg-[var(--color-panel)] border-[var(--color-panel-border)]'
          }`}
        >
          <span className="text-[10px] font-bold text-red-400 uppercase block flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Scadute</span>
          <span className="text-xl font-black text-red-400">{metrics.overdue}</span>
        </button>

        <button
          onClick={() => setActiveTab('today')}
          className={`p-3 rounded-xl border text-left transition-all ${
            activeTab === 'today' ? 'bg-amber-950/40 border-amber-500' : 'bg-[var(--color-panel)] border-[var(--color-panel-border)]'
          }`}
        >
          <span className="text-[10px] font-bold text-amber-400 uppercase block flex items-center gap-1"><Clock className="w-3 h-3" /> Oggi</span>
          <span className="text-xl font-black text-amber-400">{metrics.today}</span>
        </button>

        <button
          onClick={() => setActiveTab('upcoming')}
          className={`p-3 rounded-xl border text-left transition-all ${
            activeTab === 'upcoming' ? 'bg-blue-950/40 border-blue-500' : 'bg-[var(--color-panel)] border-[var(--color-panel-border)]'
          }`}
        >
          <span className="text-[10px] font-bold text-blue-400 uppercase block flex items-center gap-1"><Calendar className="w-3 h-3" /> Prossime</span>
          <span className="text-xl font-black text-blue-400">{metrics.upcoming}</span>
        </button>

        <button
          onClick={() => setActiveTab('completed')}
          className={`p-3 rounded-xl border text-left transition-all ${
            activeTab === 'completed' ? 'bg-emerald-950/40 border-emerald-500' : 'bg-[var(--color-panel)] border-[var(--color-panel-border)]'
          }`}
        >
          <span className="text-[10px] font-bold text-emerald-400 uppercase block flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Completate</span>
          <span className="text-xl font-black text-emerald-400">{metrics.completed}</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 p-4 rounded-xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Cerca attività per titolo o atleta..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-slate-500"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-[var(--color-primary)] transition-colors"
          >
            <option value="all">Stati (Tutti)</option>
            <option value="pending">In attesa</option>
            <option value="in_progress">In corso</option>
            <option value="completed">Completata</option>
            <option value="overdue">Scaduta</option>
            <option value="cancelled">Annullata</option>
          </select>

          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-[var(--color-primary)] transition-colors"
          >
            <option value="all">Priorità (Tutte)</option>
            <option value="low">Bassa</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
            <option value="urgent">Urgente</option>
          </select>

          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-[var(--color-primary)] transition-colors col-span-2 sm:col-span-1"
          >
            <option value="all">Categorie (Tutte)</option>
            <option value="training">Allenamento</option>
            <option value="assessment">Plicometria</option>
            <option value="call">Chiamata</option>
            <option value="checkup">Checkup</option>
            <option value="administrative">Amministrativa</option>
            <option value="other">Altro</option>
          </select>
        </div>
      </div>

      {/* Task List / Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl shadow-xl">
          <div className="w-16 h-16 rounded-3xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-4 text-slate-500 shadow-inner">
            <CheckSquare className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Nessuna attività trovata</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Non ci sono task che rispondono ai filtri o all'intervallo temporale selezionato.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(t => {
            const daysLeft = getDaysRemaining(t.dueDate);
            const isDone = t.status === 'completed';
            const isOver = (daysLeft < 0 || t.status === 'overdue') && !isDone && t.status !== 'cancelled';

            return (
              <div
                key={t.id}
                className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 shadow-xl transition-all ${
                  isDone
                    ? 'bg-slate-900/40 border-slate-800 text-slate-400'
                    : isOver
                    ? 'bg-red-950/20 border-red-900/50'
                    : 'bg-[var(--color-panel)] border-[var(--color-panel-border)]'
                }`}
              >
                <div className="space-y-2">
                  {/* Badges Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${priorityColors[t.priority]}`}>
                        {t.priority}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold text-slate-300 bg-slate-900 border border-slate-800">
                        {categoryLabels[t.category]}
                      </span>
                      {t.reminder && (
                        <span className="text-[10px] text-amber-400 flex items-center gap-0.5" title="Promemoria attivo">
                          <Bell className="w-3 h-3" />
                        </span>
                      )}
                    </div>

                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      isDone ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' : isOver ? 'bg-red-950 text-red-400 border border-red-900' : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}>
                      {isDone ? 'Completata' : isOver ? `Scaduta (${Math.abs(daysLeft)} gg)` : t.dueDate === todayStr ? 'Oggi' : `In scadenza (${daysLeft} gg)`}
                    </span>
                  </div>

                  {/* Title & Athlete */}
                  <div>
                    <h3 className={`text-base font-bold ${isDone ? 'line-through text-slate-500' : 'text-white'}`}>
                      {t.title}
                    </h3>
                    {t.athleteName && (
                      <p className="text-xs text-[var(--color-primary)] font-semibold flex items-center gap-1 mt-0.5">
                        <User className="w-3.5 h-3.5" /> Atleta: {t.athleteName}
                      </p>
                    )}
                  </div>

                  {t.description && <p className="text-xs text-slate-300 line-clamp-2">{t.description}</p>}
                </div>

                {/* Footer Info & Actions */}
                <div className="pt-3 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Scadenza: <strong className="text-slate-200">{formatDate(t.dueDate)} {t.dueTime || ''}</strong></span>
                    {t.completedAt && <span className="text-emerald-400">Completata il: {formatDate(t.completedAt)}</span>}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    {!isDone ? (
                      <button
                        onClick={() => handleComplete(t.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-emerald-500 text-black text-xs font-bold hover:bg-emerald-400 transition-colors shadow-md"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Segna Completata
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Conservata nel registro
                      </span>
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDuplicate(t.id)}
                        className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                        title="Duplica Attività"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => { setEditingTask(t); setIsModalOpen(true); }}
                        className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                        title="Modifica Attività"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {!isDone && t.status !== 'cancelled' && (
                        <button
                          onClick={() => cancelTask(t.id)}
                          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-orange-400 transition-colors"
                          title="Annulla Attività"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => setDeleteModal({ open: true, taskId: t.id })}
                        className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 transition-colors"
                        title="Elimina"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        editingTask={editingTask}
      />

      {/* Delete Confirmation Modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setDeleteModal({ open: false, taskId: null })} />
          <div className="relative w-full max-w-sm bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4 text-red-500">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Eliminare Attività?</h3>
            </div>
            <p className="text-sm text-slate-400 mb-6">Sei sicuro di voler eliminare questa attività dal registro?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteModal({ open: false, taskId: null })}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={() => deleteModal.taskId && handleDelete(deleteModal.taskId)}
                className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors"
              >
                Elimina Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
