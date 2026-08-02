import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Euro,
  RefreshCw,
  FileCheck2,
  Trophy,
  User,
  Clock,
  Tag,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Gift,
  FileText,
} from 'lucide-react';
import { CalendarEvent, CalendarEventType, CalendarEventFormData } from '../../types';
import { useCalendar } from '../../context/CalendarContext';
import { useToast } from '../../context/ToastContext';
import { CalendarModal } from '../../components/calendar/CalendarModal';

const typeConfig: Record<CalendarEventType, { label: string; color: string; icon: React.FC<{ className?: string }> }> = {
  payment: { label: 'Pagamento', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20', icon: Euro },
  renewal: { label: 'Rinnovo', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20', icon: RefreshCw },
  subscription_start: { label: 'Inizio Abbonamento', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', icon: CheckCircle2 },
  subscription_end: { label: 'Fine Abbonamento', color: 'text-red-400 bg-red-400/10 border-red-400/20', icon: AlertTriangle },
  appointment: { label: 'Appuntamento', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20', icon: Clock },
  checkin: { label: 'Check-in / Pesata', color: 'text-purple-400 bg-purple-400/10 border-purple-400/20', icon: User },
  program_delivery: { label: 'Consegna Programma', color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20', icon: FileText },
  medical_certificate: { label: 'Certificato Medico', color: 'text-rose-400 bg-rose-400/10 border-rose-400/20', icon: FileCheck2 },
  document: { label: 'Documento', color: 'text-slate-400 bg-slate-400/10 border-slate-400/20', icon: FileText },
  competition: { label: 'Gara', color: 'text-orange-400 bg-orange-400/10 border-orange-400/20', icon: Trophy },
  birthday: { label: 'Compleanno', color: 'text-pink-400 bg-pink-400/10 border-pink-400/20', icon: Gift },
  custom: { label: 'Personalizzato', color: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20', icon: Tag },
};

export const CalendarPage: React.FC = () => {
  const { allEvents, addCustomEvent, updateCustomEvent, deleteCustomEvent } = useCalendar();
  const { showSuccess, showInfo } = useToast();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(new Date().toISOString().slice(0, 10));
  const [filterType, setFilterType] = useState<CalendarEventType | 'all'>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  const [deleteModal, setDeleteModal] = useState<{ open: boolean; eventId: string | null }>({
    open: false,
    eventId: null,
  });

  // Mese e anno correnti
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthName = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(currentDate);

  // Calcolo della griglia mensile (giorni)
  const calendarGrid = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Giorno della settimana dell'1 del mese (0 = Domenica, 1 = Lunedì...)
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6; // aggiustamento per Lunedì come primo giorno

    const daysInMonth = lastDayOfMonth.getDate();
    const days: { dateStr: string; dayNumber: number; isCurrentMonth: boolean }[] = [];

    // Giorni mese precedente per completare la prima riga
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const pDate = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({
        dateStr: pDate.toISOString().slice(0, 10),
        dayNumber: prevMonthLastDay - i,
        isCurrentMonth: false,
      });
    }

    // Giorni mese corrente
    for (let d = 1; d <= daysInMonth; d++) {
      const cDate = new Date(year, month, d);
      // Formattazione YYYY-MM-DD locale sicura
      const yearStr = cDate.getFullYear();
      const monthStr = String(cDate.getMonth() + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const dateStr = `${yearStr}-${monthStr}-${dayStr}`;

      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
      });
    }

    // Giorni mese successivo per completare l'ultima riga a 35 o 42 celle
    const remainingCells = (42 - days.length) % 7;
    for (let i = 1; i <= remainingCells; i++) {
      const nDate = new Date(year, month + 1, i);
      days.push({
        dateStr: nDate.toISOString().slice(0, 10),
        dayNumber: i,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [year, month]);

  // Mappa eventi per data YYYY-MM-DD
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};

    allEvents.forEach(evt => {
      if (filterType !== 'all' && evt.type !== filterType) return;
      if (!map[evt.date]) map[evt.date] = [];
      map[evt.date].push(evt);
    });

    return map;
  }, [allEvents, filterType]);

  // Eventi del giorno selezionato
  const selectedDayEvents = useMemo(() => {
    return (eventsByDate[selectedDateStr] || []).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  }, [eventsByDate, selectedDateStr]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDateStr(now.toISOString().slice(0, 10));
  };

  const handleSaveEvent = (data: CalendarEventFormData) => {
    if (editingEvent) {
      updateCustomEvent(editingEvent.id, data);
      showSuccess('Modificato', 'L\'evento è stato aggiornato con successo.');
    } else {
      addCustomEvent(data);
      showSuccess('Creato', 'Nuovo evento personalizzato aggiunto al calendario.');
    }
  };

  const handleDeleteEvent = (id: string) => {
    deleteCustomEvent(id);
    showInfo('Eliminato', 'L\'evento personalizzato è stato rimosso.');
    setDeleteModal({ open: false, eventId: null });
  };

  const formatDate = (isoStr: string) => {
    return new Date(isoStr).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Calendario Appuntamenti ed Eventi</h1>
          <p className="text-sm text-slate-400 mt-1">
            Visualizza scadenze di sistema ed appuntamenti personalizzati.
          </p>
        </div>
        <button
          onClick={() => { setEditingEvent(null); setIsModalOpen(true); }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all shadow-[0_0_20px_rgba(234,179,8,0.2)]"
        >
          <Plus className="w-4 h-4" /> Nuovo Evento
        </button>
      </div>

      {/* Bar Navigazione Mese e Filtro */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
            <button onClick={handlePrevMonth} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={handleToday} className="px-3 py-1 text-xs font-bold text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
              Oggi
            </button>
            <button onClick={handleNextMonth} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <h2 className="text-lg font-black text-white capitalize">{monthName}</h2>
        </div>

        {/* Filtro per Tipo Evento */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase">Tipo:</span>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-[var(--color-primary)] transition-colors"
          >
            <option value="all">Tutti gli eventi</option>
            <option value="payment">Pagamenti</option>
            <option value="renewal">Rinnovi</option>
            <option value="subscription_start">Inizio Abbonamento</option>
            <option value="subscription_end">Fine Abbonamento</option>
            <option value="appointment">Appuntamenti</option>
            <option value="checkin">Check-in / Pesate</option>
            <option value="program_delivery">Consegna Programmi</option>
            <option value="medical_certificate">Certificati Medici</option>
            <option value="competition">Gare</option>
            <option value="custom">Personalizzati</option>
          </select>
        </div>
      </div>

      {/* Grid Layout: Griglia Mensile (2/3) e Elenco Giorno Selezionato (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Griglia Mensile */}
        <div className="lg:col-span-2 p-4 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4">
          {/* Header Giorni della Settimana */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-400 uppercase border-b border-slate-800 pb-2">
            <div>Lun</div>
            <div>Mar</div>
            <div>Mer</div>
            <div>Gio</div>
            <div>Ven</div>
            <div className="text-amber-500/80">Sab</div>
            <div className="text-amber-500/80">Dom</div>
          </div>

          {/* Celledel Mese */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {calendarGrid.map((cell, idx) => {
              const dayEvts = eventsByDate[cell.dateStr] || [];
              const isSelected = cell.dateStr === selectedDateStr;
              const isToday = cell.dateStr === new Date().toISOString().slice(0, 10);

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDateStr(cell.dateStr)}
                  className={`min-h-[70px] sm:min-h-[90px] p-2 rounded-xl border flex flex-col justify-between text-left transition-all relative ${
                    isSelected
                      ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/50'
                      : isToday
                      ? 'bg-amber-950/20 border-amber-500/50'
                      : cell.isCurrentMonth
                      ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      : 'bg-slate-950/30 border-slate-900/50 opacity-40'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-bold ${isToday ? 'text-[var(--color-primary)]' : 'text-slate-300'}`}>
                      {cell.dayNumber}
                    </span>
                    {dayEvts.length > 0 && (
                      <span className="w-5 h-5 rounded-full bg-[var(--color-primary)] text-black font-black text-[10px] flex items-center justify-center">
                        {dayEvts.length}
                      </span>
                    )}
                  </div>

                  {/* Indicatori visuali / pallini tipo eventi */}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {dayEvts.slice(0, 4).map((e, i) => {
                      const cfg = typeConfig[e.type] || typeConfig.custom;
                      return (
                        <span
                          key={i}
                          className={`w-2 h-2 rounded-full ${cfg.color.split(' ')[0].replace('text-', 'bg-')}`}
                          title={`${e.title}`}
                        />
                      );
                    })}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Elenco Eventi Giorno Selezionato */}
        <div className="p-5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl flex flex-col space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Giorno Selezionato</span>
            <h3 className="text-base font-bold text-white capitalize">{formatDate(selectedDateStr)}</h3>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 max-h-[500px]">
            {selectedDayEvents.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                Nessun evento o scadenza prevista per questa data.
              </div>
            ) : (
              selectedDayEvents.map(evt => {
                const cfg = typeConfig[evt.type] || typeConfig.custom;
                const IconComponent = cfg.icon;

                return (
                  <div
                    key={evt.id}
                    className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-2 shadow-lg ${
                      evt.isSystemGenerated
                        ? 'bg-slate-900/60 border-slate-800'
                        : 'bg-slate-900 border-[var(--color-primary)]/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`p-1.5 rounded-lg border shrink-0 ${cfg.color}`}>
                          <IconComponent className="w-4 h-4" />
                        </span>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white truncate">{evt.title}</h4>
                          <span className="text-[10px] text-slate-400 font-semibold">{cfg.label}</span>
                        </div>
                      </div>

                      {/* Badge Origine Evento */}
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border shrink-0 ${
                        evt.isSystemGenerated
                          ? 'bg-slate-800 text-slate-400 border-slate-700'
                          : 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border-[var(--color-primary)]/40'
                      }`}>
                        {evt.isSystemGenerated ? 'Sistema' : 'Personalizzato'}
                      </span>
                    </div>

                    {evt.description && (
                      <p className="text-[11px] text-slate-300 line-clamp-2">{evt.description}</p>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
                      {evt.startTime ? (
                        <span className="flex items-center gap-1 text-slate-300">
                          <Clock className="w-3 h-3 text-slate-500" /> {evt.startTime} {evt.endTime ? `- ${evt.endTime}` : ''}
                        </span>
                      ) : (
                        <span>Tutto il giorno</span>
                      )}

                      {/* Azioni su eventi personalizzati */}
                      {!evt.isSystemGenerated && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { setEditingEvent(evt); setIsModalOpen(true); }}
                            className="p-1 text-slate-400 hover:text-white transition-colors"
                            title="Modifica"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteModal({ open: true, eventId: evt.id })}
                            className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                            title="Elimina"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modal Eventi Personalizzati */}
      <CalendarModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveEvent}
        editingEvent={editingEvent}
        initialDate={selectedDateStr}
      />

      {/* Modal Conferma Eliminazione */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setDeleteModal({ open: false, eventId: null })} />
          <div className="relative w-full max-w-sm bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4 text-red-500">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Eliminare Evento?</h3>
            </div>
            <p className="text-sm text-slate-400 mb-6">Sei sicuro di voler eliminare questo evento personalizzato dal calendario?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteModal({ open: false, eventId: null })}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={() => deleteModal.eventId && handleDeleteEvent(deleteModal.eventId)}
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
