import React, { useState, useEffect } from 'react';
import { X, CheckSquare, AlertTriangle, Calendar, Clock, User, Bell, Tag } from 'lucide-react';
import { AthleteTask, TaskFormData, TaskPriority, TaskCategory } from '../../types';
import { useAthletes } from '../../context/AthletesContext';
import { getLocalOwnerProfile } from '../../lib/ownerProfile';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: TaskFormData) => void;
  editingTask: AthleteTask | null;
}

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
  const [assigneeName, setAssigneeName] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [category, setCategory] = useState<TaskCategory>('training');
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueTime, setDueTime] = useState('10:00');
  const [reminder, setReminder] = useState(false);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description || '');
      setAthleteId(editingTask.athleteId || '');
      setAssigneeName(editingTask.assigneeName);
      setPriority(editingTask.priority);
      setCategory(editingTask.category);
      setDueDate(editingTask.dueDate);
      setDueTime(editingTask.dueTime || '10:00');
      setReminder(editingTask.reminder);
      setNotes(editingTask.notes || '');
    } else {
      setTitle('');
      setDescription('');
      setAthleteId('');
      setAssigneeName(owner?.fullName || 'Proprietario Demo');
      setPriority('medium');
      setCategory('training');
      setDueDate(new Date().toISOString().slice(0, 10));
      setDueTime('10:00');
      setReminder(false);
      setNotes('');
    }
    setErrors([]);
  }, [isOpen, editingTask, owner]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: string[] = [];

    if (!title.trim()) errs.push('Il titolo dell\'attività è obbligatorio.');
    if (!dueDate) errs.push('La data di scadenza è obbligatoria.');

    if (errs.length > 0) {
      setErrors(errs);
      return;
    }

    const selectedAthlete = athletes.find(a => a.id === athleteId);

    const formData: TaskFormData = {
      title,
      description,
      athleteId: athleteId || undefined,
      athleteName: selectedAthlete ? selectedAthlete.fullName : undefined,
      assigneeId: owner?.id || 'local-owner',
      assigneeName: assigneeName || owner?.fullName || 'Proprietario Demo',
      priority,
      category,
      dueDate,
      dueTime,
      status: editingTask ? editingTask.status : 'pending',
      reminder,
      notes,
    };

    onSave(formData);
    onClose();
  };

  const inputCls = "w-full px-3 py-2 rounded-xl bg-slate-950 border border-[var(--color-panel-border)] text-white text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-slate-600";
  const labelCls = "block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl shadow-2xl flex flex-col my-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-panel-border)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)]">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {editingTask ? 'Modifica Attività' : 'Nuova Attività / Task'}
              </h2>
              <p className="text-xs text-slate-400">Pianifica le azioni operative ed i checkup per atleti</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form id="task-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          {errors.length > 0 && (
            <div className="p-4 rounded-xl bg-red-950/30 border border-red-900/50 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-400">Attenzione:</p>
                <ul className="text-xs text-red-300 list-disc list-inside mt-1">
                  {errors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            </div>
          )}

          <div>
            <label className={labelCls}>Titolo Attività *</label>
            <input
              type="text"
              placeholder="Es. Consegna Scheda Allenamento, Pesata, Chiamata..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Atleta Collegato (Opzionale)</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <select
                  value={athleteId}
                  onChange={e => setAthleteId(e.target.value)}
                  className={`${inputCls} pl-9`}
                >
                  <option value="">-- Attività Generale / Nessun Atleta --</option>
                  {athletes.map(a => (
                    <option key={a.id} value={a.id}>{a.fullName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={labelCls}>Categoria Attività *</label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as TaskCategory)}
                  className={`${inputCls} pl-9`}
                >
                  <option value="checkin">📊 Check-in</option>
                  <option value="measurements">📏 Misure & Foto Progressi</option>
                  <option value="workout_plan">🏋️ Scheda Allenamento</option>
                  <option value="nutrition">🥗 Nutrizione & Macro</option>
                  <option value="payment">💳 Pagamento / Rata</option>
                  <option value="appointment">📞 Appuntamento / Call</option>
                  <option value="document">📄 Documento / Certificato</option>
                  <option value="follow_up">🤝 Follow-up Coach</option>
                  <option value="training">Allenamento</option>
                  <option value="administrative">Amministrativa</option>
                  <option value="other">Altro</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Priorità *</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as TaskPriority)}
                className={inputCls}
              >
                <option value="low">Bassa</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>

            <div>
              <label className={labelCls}>Data Scadenza *</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className={`${inputCls} pl-9`}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Ora Scadenza</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="time"
                  value={dueTime}
                  onChange={e => setDueTime(e.target.value)}
                  className={`${inputCls} pl-9`}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Responsabile Assegnato *</label>
              <input
                type="text"
                value={assigneeName}
                onChange={e => setAssigneeName(e.target.value)}
                className={inputCls}
              />
            </div>

            <div className="flex items-center pt-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reminder}
                  onChange={e => setReminder(e.target.checked)}
                  className="w-4 h-4 accent-[var(--color-primary)] rounded"
                />
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Bell className="w-4 h-4 text-[var(--color-primary)]" /> Attiva Promemoria Notifica
                </span>
              </label>
            </div>
          </div>

          <div>
            <label className={labelCls}>Descrizione Dettagliata</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className={`${inputCls} resize-none`}
              rows={2}
              placeholder="Fornisci istruzioni o dettagli aggiuntivi per l'attività..."
            />
          </div>

          <div>
            <label className={labelCls}>Note Riservate</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className={`${inputCls} resize-none`}
              rows={2}
              placeholder="Note di supporto o appunti interni..."
            />
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--color-panel-border)] bg-slate-900/30 flex items-center justify-end gap-3 shrink-0 rounded-b-2xl">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors">
            Annulla
          </button>
          <button type="submit" form="task-form" className="px-6 py-2 rounded-xl bg-[var(--color-primary)] text-black text-xs font-black hover:bg-[var(--color-primary-hover)] transition-colors shadow-lg">
            Salva Attività
          </button>
        </div>
      </div>
    </div>
  );
};
