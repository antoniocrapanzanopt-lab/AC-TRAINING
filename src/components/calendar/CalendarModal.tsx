import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, AlertTriangle, Clock, User, MapPin, Tag } from 'lucide-react';
import { CalendarEvent, CalendarEventFormData, CalendarEventType } from '../../types';
import { useAthletes } from '../../context/AthletesContext';

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CalendarEventFormData) => void;
  editingEvent: CalendarEvent | null;
  initialDate?: string;
  initialStartTime?: string;
  initialEndTime?: string;
}

export const CalendarModal: React.FC<CalendarModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingEvent,
  initialDate,
  initialStartTime,
  initialEndTime,
}) => {
  const { athletes } = useAthletes();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<CalendarEventType>('appointment');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [athleteId, setAthleteId] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    if (editingEvent) {
      setTitle(editingEvent.title);
      setDescription(editingEvent.description || '');
      setType(editingEvent.type);
      setDate(editingEvent.date);
      setStartTime(editingEvent.startTime || '10:00');
      setEndTime(editingEvent.endTime || '11:00');
      setAthleteId(editingEvent.athleteId || '');
      setLocation(editingEvent.location || '');
      setNotes(editingEvent.notes || '');
    } else {
      setTitle('');
      setDescription('');
      setType('appointment');
      setDate(initialDate || new Date().toISOString().slice(0, 10));
      setStartTime(initialStartTime || '10:00');
      setEndTime(initialEndTime || '11:00');
      setAthleteId('');
      setLocation('');
      setNotes('');
    }
    setErrors([]);
  }, [isOpen, editingEvent, initialDate, initialStartTime, initialEndTime]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: string[] = [];

    if (!title.trim()) errs.push('Il titolo dell\'evento è obbligatorio.');
    if (!date) errs.push('La data è obbligatoria.');

    if (errs.length > 0) {
      setErrors(errs);
      return;
    }

    const selectedAthlete = athletes.find(a => a.id === athleteId);

    const formData: CalendarEventFormData = {
      title,
      description,
      type,
      date,
      startTime,
      endTime,
      athleteId: athleteId || undefined,
      athleteName: selectedAthlete ? selectedAthlete.fullName : undefined,
      status: editingEvent ? editingEvent.status : 'scheduled',
      location,
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
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {editingEvent ? 'Modifica Evento Personalizzato' : 'Nuovo Evento Calendario'}
              </h2>
              <p className="text-xs text-slate-400">Pianifica un appuntamento, check-in, gara o evento</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form id="calendar-event-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
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
            <label className={labelCls}>Titolo Evento *</label>
            <input
              type="text"
              placeholder="Es. Appuntamento in Palestra, Gara Regionale, Check-in Plicometria..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Tipo Evento *</label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <select
                  value={type}
                  onChange={e => setType(e.target.value as CalendarEventType)}
                  className={`${inputCls} pl-9`}
                >
                  <option value="appointment">📆 Appuntamento / Sessione</option>
                  <option value="google_calendar">📅 Google Calendar Sync</option>
                  <option value="checkin">⚖️ Check-in / Pesata</option>
                  <option value="program_delivery">📋 Consegna Programma</option>
                  <option value="competition">🏆 Gara / Competizione</option>
                  <option value="custom">📌 Altro (Personalizzato)</option>
                </select>
              </div>
            </div>

            <div>
              <label className={labelCls}>Atleta Collegato (Opzionale)</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <select
                  value={athleteId}
                  onChange={e => setAthleteId(e.target.value)}
                  className={`${inputCls} pl-9`}
                >
                  <option value="">-- Evento Generale / Nessun Atleta --</option>
                  {athletes.map(a => (
                    <option key={a.id} value={a.id}>{a.fullName}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Data *</label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className={`${inputCls} pl-9`}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Ora Inizio</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className={`${inputCls} pl-9`}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Ora Fine</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className={`${inputCls} pl-9`}
                />
              </div>
            </div>
          </div>

          <div>
            <label className={labelCls}>Luogo / Sede</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Es. Palestra Principale, Studio Medico, Palasport..."
                value={location}
                onChange={e => setLocation(e.target.value)}
                className={`${inputCls} pl-9`}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Descrizione</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className={`${inputCls} resize-none`}
              rows={2}
              placeholder="Descrizione dettagliata dell'evento..."
            />
          </div>

          <div>
            <label className={labelCls}>Note Riservate</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className={`${inputCls} resize-none`}
              rows={2}
              placeholder="Eventuali indicazioni interne..."
            />
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--color-panel-border)] bg-slate-900/30 flex items-center justify-end gap-3 shrink-0 rounded-b-2xl">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors">
            Annulla
          </button>
          <button type="submit" form="calendar-event-form" className="px-6 py-2 rounded-xl bg-[var(--color-primary)] text-black text-xs font-black hover:bg-[var(--color-primary-hover)] transition-colors shadow-lg">
            Salva Evento
          </button>
        </div>
      </div>
    </div>
  );
};
