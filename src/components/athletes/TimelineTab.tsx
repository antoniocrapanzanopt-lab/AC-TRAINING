import React, { useState, useMemo } from 'react';
import {
  Clock,
  User,
  Calendar,
  Plus,
  X,
  CreditCard,
  FileText,
  MessageSquare,
  Award,
} from 'lucide-react';
import { TimelineEvent } from '../../types';
import { useAthletes } from '../../context/AthletesContext';
import { useToast } from '../../context/ToastContext';

interface TimelineTabProps {
  athleteId: string;
  athleteName: string;
  events: TimelineEvent[];
}

type TimelineCategoryFilter = 'all' | 'commercial' | 'workouts' | 'documents' | 'communications';

const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getEventIcon = (type: TimelineEvent['type']) => {
  switch (type) {
    case 'subscription_created':
    case 'subscription_renewed':
    case 'subscription_expired':
    case 'payment_received':
    case 'payment_overdue':
      return <CreditCard className="w-3.5 h-3.5 text-amber-400" />;
    case 'goal_set':
    case 'goal_achieved':
      return <Award className="w-3.5 h-3.5 text-emerald-400" />;
    case 'document_uploaded':
      return <FileText className="w-3.5 h-3.5 text-sky-400" />;
    case 'communication':
    case 'message_sent':
    case 'note_added':
      return <MessageSquare className="w-3.5 h-3.5 text-purple-400" />;
    case 'joined':
      return <User className="w-3.5 h-3.5 text-emerald-400" />;
    default:
      return <Clock className="w-3.5 h-3.5 text-slate-400" />;
  }
};

export const TimelineTab: React.FC<TimelineTabProps> = ({
  athleteId,
  athleteName,
  events = [],
}) => {
  const { addTimelineEvent } = useAthletes();
  const { showSuccess } = useToast();

  const [categoryFilter, setCategoryFilter] = useState<TimelineCategoryFilter>('all');

  // Modale Aggiunta Nota Manuale
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteDescription, setNoteDescription] = useState('');

  // Filtraggio Eventi
  const filteredEvents = useMemo(() => {
    const sorted = [...(events || [])].filter(Boolean).sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return (isNaN(tb) ? 0 : tb) - (isNaN(ta) ? 0 : ta);
    });

    if (categoryFilter === 'all') return sorted;

    return sorted.filter(event => {
      if (categoryFilter === 'commercial') {
        return ['subscription_created', 'subscription_renewed', 'subscription_expired', 'payment_received', 'payment_overdue'].includes(event.type);
      }
      if (categoryFilter === 'workouts') {
        return ['goal_set', 'goal_achieved'].includes(event.type);
      }
      if (categoryFilter === 'documents') {
        return ['document_uploaded'].includes(event.type);
      }
      if (categoryFilter === 'communications') {
        return ['communication', 'message_sent', 'note_added', 'status_changed', 'coach_assigned', 'joined', 'other'].includes(event.type);
      }
      return true;
    });
  }, [events, categoryFilter]);

  const handleAddManualEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim()) return;

    addTimelineEvent(athleteId, 'note_added', noteTitle.trim(), noteDescription.trim() || undefined);
    showSuccess('Nota Inserita', 'Evento salvato nella timeline dell\'atleta.');

    setNoteTitle('');
    setNoteDescription('');
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Sezione */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-[var(--color-primary)]" /> Timeline & Audit Trail dell'Atleta
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Registro cronologico completo di tutte le attività, iscrizioni, pagamenti e comunicazioni di {athleteName}.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all shadow-md shrink-0"
        >
          <Plus className="w-4 h-4" /> Aggiungi Nota in Timeline
        </button>
      </div>

      {/* Bar Filtri Categoria */}
      <div className="p-4 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              categoryFilter === 'all'
                ? 'bg-[var(--color-primary)] text-black'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Tutti gli Eventi ({events.length})
          </button>
          <button
            onClick={() => setCategoryFilter('commercial')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              categoryFilter === 'commercial'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" /> Commerciale
          </button>
          <button
            onClick={() => setCategoryFilter('documents')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              categoryFilter === 'documents'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Documenti
          </button>
          <button
            onClick={() => setCategoryFilter('communications')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              categoryFilter === 'communications'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" /> Note & Contatti
          </button>
        </div>

        <span className="text-xs text-slate-500 font-semibold">
          {filteredEvents.length} eventi trovati
        </span>
      </div>

      {/* Lista Timeline */}
      <div className="p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-400">Nessun evento nella timeline per questo filtro.</p>
            <p className="text-xs text-slate-500 mt-1">Le operazioni registrate appariranno automaticamente in questa lista.</p>
          </div>
        ) : (
          <div className="relative pl-6 space-y-0">
            {/* Linea verticale guida */}
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-800" />

            {filteredEvents.map((event, idx) => (
              <div key={event.id} className={`relative flex gap-4 ${idx < filteredEvents.length - 1 ? 'pb-6' : ''}`}>
                {/* Pallino Icona */}
                <div className="absolute -left-6 mt-1 w-5 h-5 rounded-full border border-slate-700 bg-slate-900 flex items-center justify-center shrink-0 z-10">
                  {getEventIcon(event.type)}
                </div>

                <div className="flex-1 bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 hover:border-slate-700 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                    <h4 className="text-sm font-bold text-white">{event.title}</h4>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 shrink-0">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      {formatDateTime(event.createdAt)}
                    </span>
                  </div>

                  {event.description && (
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/50">
                      {event.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-500 font-semibold">
                    <User className="w-3 h-3 text-slate-500" /> Autore: {event.authorName || 'Sistema'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modale Aggiungi Nota/Evento Manuale */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)} />
          <div className="relative w-full max-w-md bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-[var(--color-primary)]" /> Aggiungi Nota in Timeline
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddManualEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Titolo Evento / Nota *</label>
                <input
                  type="text"
                  required
                  value={noteTitle}
                  onChange={e => setNoteTitle(e.target.value)}
                  placeholder="Es. Infortunio spalla sinistra, Traguardo raggiunto..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Dettagli / Descrizione</label>
                <textarea
                  rows={3}
                  value={noteDescription}
                  onChange={e => setNoteDescription(e.target.value)}
                  placeholder="Aggiungi ulteriori informazioni utili..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-[var(--color-primary)] resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[var(--color-primary)] text-black text-xs font-black hover:bg-[var(--color-primary-hover)] transition-all shadow-md"
                >
                  Salva in Timeline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
