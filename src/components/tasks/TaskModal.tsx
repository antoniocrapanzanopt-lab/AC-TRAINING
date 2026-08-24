import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  Calendar,
  Clock,
  User,
  Bell,
  CheckCircle2,
  Dumbbell,
  Image,
  Briefcase,
  Sparkles,
} from 'lucide-react';
import { AthleteTask, TaskFormData, TaskPriority, TaskCategory, TaskType } from '../../types';
import { useAthletes } from '../../context/AthletesContext';
import { getLocalOwnerProfile } from '../../lib/ownerProfile';
import { deriveTaskType } from '../../context/TasksContext';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: TaskFormData) => void;
  editingTask: AthleteTask | null;
}

const WORKSPACE_TYPES: Array<{
  type: TaskType;
  label: string;
  icon: React.FC<{ className?: string }>;
  activeCls: string;
  defaultCategory: TaskCategory;
}> = [
  {
    type: 'personal',
    label: 'Personale',
    icon: User,
    activeCls: 'bg-violet-500/20 text-violet-300 border-violet-500/50 shadow-[0_0_12px_rgba(139,92,246,0.2)]',
    defaultCategory: 'other',
  },
  {
    type: 'athlete',
    label: 'Atleta',
    icon: Dumbbell,
    activeCls: 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.2)]',
    defaultCategory: 'workout_plan',
  },
  {
    type: 'content',
    label: 'Contenuto',
    icon: Image,
    activeCls: 'bg-pink-500/20 text-pink-300 border-pink-500/50 shadow-[0_0_12px_rgba(236,72,153,0.2)]',
    defaultCategory: 'other',
  },
  {
    type: 'admin',
    label: 'Admin',
    icon: Briefcase,
    activeCls: 'bg-slate-700/50 text-slate-200 border-slate-500/50 shadow-[0_0_12px_rgba(148,163,184,0.15)]',
    defaultCategory: 'administrative',
  },
];

const PRIORITIES: Array<{
  priority: TaskPriority;
  label: string;
  dotCls: string;
  activeCls: string;
}> = [
  { priority: 'low', label: 'Bassa', dotCls: 'bg-slate-500', activeCls: 'bg-slate-800 text-slate-200 border-slate-600' },
  { priority: 'medium', label: 'Media', dotCls: 'bg-blue-400', activeCls: 'bg-blue-950/50 text-blue-300 border-blue-500/50' },
  { priority: 'high', label: 'Alta', dotCls: 'bg-amber-400', activeCls: 'bg-amber-950/50 text-amber-300 border-amber-500/50' },
  { priority: 'urgent', label: 'Urgente', dotCls: 'bg-rose-500 animate-pulse', activeCls: 'bg-rose-950/60 text-rose-300 border-rose-500/60 font-black' },
];

const CATEGORY_OPTIONS: Array<{ value: TaskCategory; label: string }> = [
  { value: 'workout_plan', label: '🏋️ Scheda Allenamento' },
  { value: 'checkin', label: '📊 Check-in Settimanale' },
  { value: 'measurements', label: '📏 Misure & Foto' },
  { value: 'nutrition', label: '🥗 Nutrizione & Macro' },
  { value: 'follow_up', label: '🤝 Follow-up Coach' },
  { value: 'call', label: '📞 Chiamata / Consulenza' },
  { value: 'appointment', label: '📅 Appuntamento' },
  { value: 'payment', label: '💳 Pagamento & Rate' },
  { value: 'document', label: '📄 Documenti & Certificati' },
  { value: 'training', label: '⚡ Allenamento' },
  { value: 'administrative', label: '⚙️ Amministrazione' },
  { value: 'other', label: '📝 Altro / Appunti' },
];

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingTask,
}) => {
  const { athletes } = useAthletes();
  const owner = getLocalOwnerProfile();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [athleteId, setAthleteId] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [category, setCategory] = useState<TaskCategory>('workout_plan');
  const [taskType, setTaskType] = useState<TaskType>('athlete');
  const [tagsInput, setTagsInput] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueTime, setDueTime] = useState('10:00');
  const [reminder, setReminder] = useState(false);
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description || '');
      setAthleteId(editingTask.athleteId || '');
      setPriority(editingTask.priority);
      setCategory(editingTask.category);
      setTaskType(editingTask.task_type ?? deriveTaskType(editingTask.category, editingTask.origin));
      setTagsInput((editingTask.tags ?? []).join(', '));
      setDueDate(editingTask.dueDate);
      setDueTime(editingTask.dueTime || '10:00');
      setReminder(editingTask.reminder);
      setNotes(editingTask.notes || '');
      setShowNotes(Boolean(editingTask.notes));
    } else {
      setTitle('');
      setDescription('');
      setAthleteId('');
      setPriority('medium');
      setCategory('workout_plan');
      setTaskType('athlete');
      setTagsInput('');
      setDueDate(new Date().toISOString().slice(0, 10));
      setDueTime('10:00');
      setReminder(false);
      setNotes('');
      setShowNotes(false);
    }
    setErrors([]);
  }, [isOpen, editingTask]);

  if (!isOpen) return null;

  const handleTypeSelect = (selected: TaskType) => {
    setTaskType(selected);
    const config = WORKSPACE_TYPES.find((w) => w.type === selected);
    if (config && (!editingTask || !category)) {
      setCategory(config.defaultCategory);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: string[] = [];

    if (!title.trim()) errs.push('Il titolo dell\'attività è obbligatorio.');
    if (!dueDate) errs.push('La data di scadenza è obbligatoria.');

    if (errs.length > 0) {
      setErrors(errs);
      return;
    }

    const selectedAthlete = athletes.find((a) => a.id === athleteId);
    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    const formData: TaskFormData = {
      title: title.trim(),
      description: description.trim() || undefined,
      athleteId: athleteId || undefined,
      athleteName: selectedAthlete ? selectedAthlete.fullName : undefined,
      assigneeId: owner?.id || 'local-owner',
      assigneeName: owner?.fullName || 'Coach',
      priority,
      category,
      task_type: taskType,
      tags: parsedTags.length > 0 ? parsedTags : undefined,
      dueDate,
      dueTime: dueTime || undefined,
      status: editingTask ? editingTask.status : 'pending',
      reminder,
      notes: notes.trim() || undefined,
    };

    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-black/85 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full max-w-xl bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl flex flex-col my-auto max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header Elegante */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800/80 bg-gradient-to-r from-slate-900/60 to-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)] shadow-[0_0_15px_rgba(234,179,8,0.15)]">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight">
                {editingTask ? 'Modifica Task' : 'Nuova Task'}
              </h2>
              <p className="text-xs text-slate-400 font-medium">Workspace Personale del Coach</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form id="task-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {errors.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/40 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-200 space-y-0.5 font-medium">
                {errors.map((err, i) => (
                  <p key={i}>{err}</p>
                ))}
              </div>
            </div>
          )}

          {/* 1. Titolo Task */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
              Cosa devi fare? *
            </label>
            <input
              type="text"
              autoFocus
              placeholder="Es. Rinnovare scheda Mario, Verificare check-in, Preparare post..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-white text-sm font-semibold placeholder:text-slate-500 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all shadow-inner"
            />
          </div>

          {/* 2. Selezione Tipo Workspace (Pillole interattive 1-click) */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
              Tipo Attività
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {WORKSPACE_TYPES.map(({ type: t, label, icon: Icon, activeCls }) => {
                const isSelected = taskType === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleTypeSelect(t)}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                      isSelected
                        ? activeCls
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Atleta Collegato & Categoria */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                Atleta Collegato
              </label>
              <select
                value={athleteId}
                onChange={(e) => {
                  setAthleteId(e.target.value);
                  if (e.target.value && taskType === 'personal') {
                    setTaskType('athlete');
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs font-bold text-white focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
              >
                <option value="">— Nessun Atleta (Generale) —</option>
                {athletes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                Categoria Operativa
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TaskCategory)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs font-bold text-white focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
              >
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. Priorità (Pills con dot) */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
              Priorità
            </label>
            <div className="grid grid-cols-4 gap-2">
              {PRIORITIES.map(({ priority: p, label, dotCls, activeCls }) => {
                const isSelected = priority === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? activeCls
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${dotCls}`} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Scadenza (Data + Ora) & Promemoria */}
          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Data Scadenza *
                </label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Ora Scadenza
                </label>
                <div className="relative">
                  <Clock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
              </div>
            </div>

            {/* Toggle Promemoria */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
              <div className="flex items-center gap-2">
                <Bell className={`w-4 h-4 ${reminder ? 'text-[var(--color-primary)]' : 'text-slate-500'}`} />
                <span className="text-xs font-bold text-slate-300">Promemoria Notifica</span>
              </div>
              <button
                type="button"
                onClick={() => setReminder((v) => !v)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  reminder ? 'bg-[var(--color-primary)]' : 'bg-slate-800'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-slate-950 shadow-lg ring-0 transition duration-200 ease-in-out ${
                    reminder ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* 6. Tag */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
              Tag (opzionali, separati da virgola)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="es. instagram, check-in, follow-up"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs font-medium text-white placeholder:text-slate-500 focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          {/* 7. Descrizione */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
              Descrizione o Istruzioni
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Aggiungi dettagli o contesto operativo..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs font-medium text-white placeholder:text-slate-500 focus:outline-none focus:border-[var(--color-primary)] resize-none"
            />
          </div>

          {/* 8. Note Riservate (Opzionali/Espandibili) */}
          <div>
            {!showNotes && !notes ? (
              <button
                type="button"
                onClick={() => setShowNotes(true)}
                className="text-[11px] font-bold text-slate-400 hover:text-[var(--color-primary)] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                + Aggiungi note riservate
              </button>
            ) : (
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Note Riservate Coach
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Appunti interni personali..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs font-medium text-white placeholder:text-slate-500 focus:outline-none focus:border-[var(--color-primary)] resize-none"
                />
              </div>
            )}
          </div>
        </form>

        {/* Footer con Pulsanti */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
          >
            Annulla
          </button>
          <button
            type="submit"
            form="task-form"
            className="px-6 py-2.5 rounded-xl bg-[var(--color-primary)] text-slate-950 text-xs font-black hover:bg-[var(--color-primary-hover)] transition-all shadow-[0_0_20px_rgba(234,179,8,0.25)] cursor-pointer active:scale-95"
          >
            {editingTask ? 'Salva Modifiche' : 'Crea Task'}
          </button>
        </div>
      </div>
    </div>
  );
};
