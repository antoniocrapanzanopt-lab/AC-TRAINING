import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  Globe,
  Settings,
  Calendar as CalendarIcon,
  ListFilter,
  Columns,
  Grid,
  Sparkles,
} from 'lucide-react';
import { CalendarEvent, CalendarEventType, CalendarEventFormData } from '../../types';
import { useCalendar } from '../../context/CalendarContext';
import { useToast } from '../../context/ToastContext';
import { CalendarModal } from '../../components/calendar/CalendarModal';
import { GoogleConnectModal } from '../../components/calendar/GoogleConnectModal';

type CalendarViewMode = 'week' | 'month' | 'day' | 'agenda';

const typeConfig: Record<CalendarEventType, { label: string; color: string; bgBadge: string; icon: React.FC<{ className?: string }> }> = {
  payment: { label: 'Pagamento', color: 'text-amber-400 border-amber-400/30', bgBadge: 'bg-amber-500/20 text-amber-300', icon: Euro },
  renewal: { label: 'Rinnovo', color: 'text-yellow-400 border-yellow-400/30', bgBadge: 'bg-yellow-500/20 text-yellow-300', icon: RefreshCw },
  subscription_start: { label: 'Inizio Abbonamento', color: 'text-emerald-400 border-emerald-400/30', bgBadge: 'bg-emerald-500/20 text-emerald-300', icon: CheckCircle2 },
  subscription_end: { label: 'Fine Abbonamento', color: 'text-red-400 border-red-400/30', bgBadge: 'bg-red-500/20 text-red-300', icon: AlertTriangle },
  appointment: { label: 'Appuntamento', color: 'text-sky-400 border-sky-400/30', bgBadge: 'bg-sky-500/20 text-sky-300', icon: Clock },
  checkin: { label: 'Check-in / Pesata', color: 'text-purple-400 border-purple-400/30', bgBadge: 'bg-purple-500/20 text-purple-300', icon: User },
  program_delivery: { label: 'Consegna Scheda', color: 'text-cyan-400 border-cyan-400/30', bgBadge: 'bg-cyan-500/20 text-cyan-300', icon: FileText },
  medical_certificate: { label: 'Certificato Medico', color: 'text-rose-400 border-rose-400/30', bgBadge: 'bg-rose-500/20 text-rose-300', icon: FileCheck2 },
  document: { label: 'Documento', color: 'text-slate-400 border-slate-400/30', bgBadge: 'bg-slate-500/20 text-slate-300', icon: FileText },
  competition: { label: 'Gara', color: 'text-orange-400 border-orange-400/30', bgBadge: 'bg-orange-500/20 text-orange-300', icon: Trophy },
  birthday: { label: 'Compleanno', color: 'text-pink-400 border-pink-400/30', bgBadge: 'bg-pink-500/20 text-pink-300', icon: Gift },
  google_calendar: { label: 'Google Calendar', color: 'text-blue-400 border-blue-400/30', bgBadge: 'bg-blue-500/20 text-blue-300', icon: Globe },
  custom: { label: 'Personalizzato', color: 'text-indigo-400 border-indigo-400/30', bgBadge: 'bg-indigo-500/20 text-indigo-300', icon: Tag },
};

// Funzione per ripulire titoli da emoji ridondanti
const cleanEventTitle = (title: string): string => {
  return title.replace(/^[📅🌐\s]+/, '').trim();
};

export const CalendarPage: React.FC = () => {
  const {
    allEvents,
    addCustomEvent,
    updateCustomEvent,
    deleteCustomEvent,
    syncGoogleCalendar,
  } = useCalendar();
  const { showSuccess, showInfo } = useToast();

  const [viewMode, setViewMode] = useState<CalendarViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(new Date().toISOString().slice(0, 10));
  const [filterType, setFilterType] = useState<CalendarEventType | 'all'>('all');
  const [isSyncingGoogle, setIsSyncingGoogle] = useState(false);

  // Fascia Oraria Intelligente: default 07:00 - 22:00 (16h), opzionale 24h completa
  const [isFull24h, setIsFull24h] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ac_calendar_full_24h') === 'true';
    } catch {
      return false;
    }
  });

  const toggleFull24h = () => {
    setIsFull24h((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('ac_calendar_full_24h', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const currentHours = useMemo(() => {
    if (isFull24h) {
      return Array.from({ length: 24 }, (_, i) => i);
    }
    // Fascia operativa 07:00 -> 22:00
    return Array.from({ length: 16 }, (_, i) => i + 7);
  }, [isFull24h]);

  // Tempo Reale per la linea indicatrice
  const [nowTime, setNowTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNowTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const currentHour = nowTime.getHours();
  const currentMinute = nowTime.getMinutes();
  const todayIsoStr = nowTime.toISOString().slice(0, 10);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  // Per pre-compilare orari da clic su slot
  const [modalInitialTimes, setModalInitialTimes] = useState<{ dateStr: string; startTime: string; endTime: string } | null>(null);

  const [deleteModal, setDeleteModal] = useState<{ open: boolean; eventId: string | null }>({
    open: false,
    eventId: null,
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll a 08:00 quando si passa alla vista Settimana o Giorno (se in modalità 24h)
  useEffect(() => {
    if ((viewMode === 'week' || viewMode === 'day') && scrollRef.current && isFull24h) {
      scrollRef.current.scrollTop = 7 * 56;
    }
  }, [viewMode, isFull24h]);

  const handleManualGoogleSync = async () => {
    setIsSyncingGoogle(true);
    await syncGoogleCalendar();
    setIsSyncingGoogle(false);
    showSuccess('Sincronizzato', 'Eventi di Google Calendar aggiornati.');
  };

  // ----------------------------------------------------
  // Calcolo Settimana Corrente (Lunedì - Domenica)
  // ----------------------------------------------------
  const weekDays = useMemo(() => {
    const d = new Date(currentDate);
    const dayOfWeek = d.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diffToMonday);

    const days: { dateStr: string; dayName: string; dayNumber: number; dateObj: Date; isToday: boolean }[] = [];
    const dayNames = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + i);

      const y = dayDate.getFullYear();
      const m = String(dayDate.getMonth() + 1).padStart(2, '0');
      const dd = String(dayDate.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${dd}`;

      days.push({
        dateStr,
        dayName: dayNames[i],
        dayNumber: dayDate.getDate(),
        dateObj: dayDate,
        isToday: dateStr === todayIsoStr,
      });
    }

    return days;
  }, [currentDate, todayIsoStr]);

  // ----------------------------------------------------
  // Calcolo Mese Corrente
  // ----------------------------------------------------
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const calendarGrid = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const daysInMonth = lastDayOfMonth.getDate();
    const days: { dateStr: string; dayNumber: number; isCurrentMonth: boolean; isToday: boolean }[] = [];

    // Giorni mese precedente
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const pDate = new Date(year, month - 1, prevMonthLastDay - i);
      const dateStr = pDate.toISOString().slice(0, 10);
      days.push({
        dateStr,
        dayNumber: prevMonthLastDay - i,
        isCurrentMonth: false,
        isToday: dateStr === todayIsoStr,
      });
    }

    // Giorni mese corrente
    for (let d = 1; d <= daysInMonth; d++) {
      const cDate = new Date(year, month, d);
      const yearStr = cDate.getFullYear();
      const monthStr = String(cDate.getMonth() + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const dateStr = `${yearStr}-${monthStr}-${dayStr}`;

      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dateStr === todayIsoStr,
      });
    }

    // Mese successivo
    const remainingCells = (42 - days.length) % 7;
    for (let i = 1; i <= remainingCells; i++) {
      const nDate = new Date(year, month + 1, i);
      const dateStr = nDate.toISOString().slice(0, 10);
      days.push({
        dateStr,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: dateStr === todayIsoStr,
      });
    }

    return days;
  }, [year, month, todayIsoStr]);

  // ----------------------------------------------------
  // Mappa Eventi per Data
  // ----------------------------------------------------
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};

    allEvents.forEach((evt) => {
      if (filterType !== 'all' && evt.type !== filterType) return;
      if (!map[evt.date]) map[evt.date] = [];
      map[evt.date].push(evt);
    });

    return map;
  }, [allEvents, filterType]);

  // Quick stats del giorno odierno
  const todayStats = useMemo(() => {
    const todayList = eventsByDate[todayIsoStr] || [];
    const appointments = todayList.filter((e) => e.type === 'appointment').length;
    const checkins = todayList.filter((e) => e.type === 'checkin').length;
    const googleEvents = todayList.filter((e) => e.type === 'google_calendar').length;
    const deadlines = todayList.filter((e) => e.type === 'payment' || e.type === 'renewal' || e.type === 'subscription_end').length;

    return {
      total: todayList.length,
      appointments,
      checkins,
      googleEvents,
      deadlines,
    };
  }, [eventsByDate, todayIsoStr]);

  // ----------------------------------------------------
  // Formattazione Titolo Header Dinamico
  // ----------------------------------------------------
  const headerTitle = useMemo(() => {
    if (viewMode === 'month') {
      return new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(currentDate);
    }
    if (viewMode === 'week') {
      const first = weekDays[0].dateObj;
      const last = weekDays[6].dateObj;
      const m1 = new Intl.DateTimeFormat('it-IT', { month: 'short' }).format(first);
      const m2 = new Intl.DateTimeFormat('it-IT', { month: 'short' }).format(last);
      const y1 = first.getFullYear();
      const y2 = last.getFullYear();

      if (m1 === m2 && y1 === y2) {
        return `${first.getDate()} - ${last.getDate()} ${new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(first)}`;
      }
      return `${first.getDate()} ${m1} - ${last.getDate()} ${m2} ${y2}`;
    }
    if (viewMode === 'day') {
      return new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(currentDate);
    }
    return 'Agenda Completa';
  }, [viewMode, currentDate, weekDays]);

  // Navigazione temporale
  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() - 1);
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() - 7);
    } else if (viewMode === 'day') {
      d.setDate(d.getDate() - 1);
    } else {
      d.setMonth(d.getMonth() - 1);
    }
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() + 1);
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() + 7);
    } else if (viewMode === 'day') {
      d.setDate(d.getDate() + 1);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
    setCurrentDate(d);
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDateStr(now.toISOString().slice(0, 10));
  };

  // Clic su uno slot orario nella griglia
  const handleSlotClick = (dateStr: string, hour: number) => {
    const startH = String(hour).padStart(2, '0');
    const endH = String((hour + 1) % 24).padStart(2, '0');
    setModalInitialTimes({
      dateStr,
      startTime: `${startH}:00`,
      endTime: `${endH}:00`,
    });
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  const handleSaveEvent = (data: CalendarEventFormData) => {
    if (editingEvent) {
      updateCustomEvent(editingEvent.id, data);
      showSuccess('Modificato', 'L\'evento è stato aggiornato con successo.');
    } else {
      addCustomEvent(data);
      showSuccess('Creato', 'Nuovo evento aggiunto al calendario.');
    }
  };

  const handleDeleteEvent = (id: string) => {
    deleteCustomEvent(id);
    showInfo('Eliminato', 'L\'evento è stato rimosso.');
    setDeleteModal({ open: false, eventId: null });
  };

  // Eventi per agenda (tutti gli eventi ordinati per data e ora)
  const agendaEventsList = useMemo(() => {
    const list: CalendarEvent[] = [];
    allEvents.forEach((evt) => {
      if (filterType !== 'all' && evt.type !== filterType) return;
      list.push(evt);
    });
    return list.sort((a, b) => {
      const cmpDate = a.date.localeCompare(b.date);
      if (cmpDate !== 0) return cmpDate;
      return (a.startTime || '').localeCompare(b.startTime || '');
    });
  }, [allEvents, filterType]);

  return (
    <div className="space-y-6 pb-12">
      {/* ─── 1. HEADER TITOLO & AZIONI PRINCIPALI ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Calendario Appuntamenti</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30 text-[var(--color-primary)] text-[10px] font-bold tracking-wider uppercase">
              Live Agenda
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Gestisci sessioni, check-in, scadenze e appuntamenti sincronizzati in tempo reale.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleManualGoogleSync}
            disabled={isSyncingGoogle}
            title="Sincronizza subito Google Calendar"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all text-xs font-bold shadow-sm cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${isSyncingGoogle ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sincronizza Google</span>
          </button>

          <button
            onClick={() => setIsGoogleModalOpen(true)}
            title="Configura Google Calendar"
            className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setEditingEvent(null);
              setModalInitialTimes(null);
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-slate-950 font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all shadow-md shadow-[var(--color-primary)]/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Nuovo Evento
          </button>
        </div>
      </div>

      {/* ─── 2. QUICK BAR OPERATIVA DEL GIORNO ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Sessioni Oggi</div>
              <div className="text-sm font-black text-white">{todayStats.appointments}</div>
            </div>
          </div>
          <span className="text-[10px] font-mono text-slate-500">PT</span>
        </div>

        <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <User className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Check-in Oggi</div>
              <div className="text-sm font-black text-white">{todayStats.checkins}</div>
            </div>
          </div>
          <span className="text-[10px] font-mono text-slate-500">Form</span>
        </div>

        <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Google Sync</div>
              <div className="text-sm font-black text-white">{todayStats.googleEvents}</div>
            </div>
          </div>
          <span className="text-[10px] font-mono text-slate-500">GCal</span>
        </div>

        <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Totale Eventi</div>
              <div className="text-sm font-black text-white">{todayStats.total}</div>
            </div>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 font-bold">Oggi</span>
        </div>
      </div>

      {/* ─── 3. CONTROL BAR: NAVIGAZIONE, VISTA & TOGGLE 24H ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800/90 shadow-xl">
        {/* Controlli Data e Titolo */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 shrink-0">
            <button
              onClick={handlePrev}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Precedente"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1 text-xs font-bold text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Oggi
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Successivo"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <h2 className="text-sm sm:text-base font-black text-white capitalize">{headerTitle}</h2>
        </div>

        {/* Selettore Modalità Vista, Toggle Fascia & Filtro Eventi */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Toggle Fascia Oraria 07-22 vs 24h (visibile in Settimana e Giorno) */}
          {(viewMode === 'week' || viewMode === 'day') && (
            <button
              type="button"
              onClick={toggleFull24h}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                isFull24h
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title={isFull24h ? 'Passa alla fascia operativa (07-22)' : 'Espandi a tutte le 24 ore'}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{isFull24h ? '24 Ore (00-24)' : 'Fascia 07-22'}</span>
            </button>
          )}

          {/* Tabs Selettore Vista */}
          <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-xl p-1 text-xs font-bold">
            <button
              onClick={() => setViewMode('month')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                viewMode === 'month'
                  ? 'bg-[var(--color-primary)] text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid className="w-3.5 h-3.5" /> Mese
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                viewMode === 'week'
                  ? 'bg-[var(--color-primary)] text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Columns className="w-3.5 h-3.5" /> Settimana
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                viewMode === 'day'
                  ? 'bg-[var(--color-primary)] text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" /> Giorno
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                viewMode === 'agenda'
                  ? 'bg-[var(--color-primary)] text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" /> Agenda
            </button>
          </div>

          {/* Filtro Tipo Evento */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs font-bold focus:outline-none focus:border-[var(--color-primary)] transition-colors cursor-pointer"
          >
            <option value="all">Tutti gli eventi</option>
            <option value="appointment">🔵 Sessioni / Appuntamenti</option>
            <option value="checkin">🟣 Check-in / Valutazioni</option>
            <option value="renewal">🟡 Rinnovi</option>
            <option value="payment">💶 Pagamenti</option>
            <option value="google_calendar">🩵 Google Calendar</option>
            <option value="program_delivery">📋 Consegna Schede</option>
            <option value="competition">🏆 Gare</option>
            <option value="custom">📌 Personalizzati</option>
          </select>
        </div>
      </div>

      {/* ======================================================================== */}
      {/* VISTA 1: SETTIMANA (GRIGLIA ORARIA CON INDICATORE NOW)                    */}
      {/* ======================================================================== */}
      {viewMode === 'week' && (
        <div className="rounded-2xl bg-slate-950/90 border border-slate-800/90 shadow-2xl overflow-hidden flex flex-col">
          {/* Header Giorni della Settimana */}
          <div className="grid grid-cols-8 border-b border-slate-800 bg-slate-950 sticky top-0 z-20">
            {/* Slot Angolo Ora */}
            <div className="p-3 border-r border-slate-800/80 text-center text-[10px] font-bold text-slate-500 uppercase flex items-center justify-center">
              Ora
            </div>

            {/* 7 Giorni della Settimana */}
            {weekDays.map((d, i) => (
              <div
                key={i}
                onClick={() => {
                  setSelectedDateStr(d.dateStr);
                  setCurrentDate(d.dateObj);
                }}
                className={`p-2.5 text-center border-r border-slate-800/80 last:border-r-0 cursor-pointer transition-colors ${
                  d.isToday ? 'bg-[var(--color-primary)]/10' : 'hover:bg-slate-900/40'
                }`}
              >
                <span className="block text-[10px] font-bold uppercase text-slate-400">{d.dayName}</span>
                <span
                  className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black mt-0.5 ${
                    d.isToday
                      ? 'bg-[var(--color-primary)] text-slate-950 shadow-md shadow-[var(--color-primary)]/20'
                      : 'text-white'
                  }`}
                >
                  {d.dayNumber}
                </span>
              </div>
            ))}
          </div>

          {/* Griglia Oraria con Scroll Verticale */}
          <div ref={scrollRef} className="max-h-[620px] overflow-y-auto relative divide-y divide-slate-800/60 custom-scrollbar">
            {currentHours.map((hour) => {
              const hourLabel = `${String(hour).padStart(2, '0')}:00`;

              return (
                <div key={hour} className="grid grid-cols-8 min-h-[58px] group">
                  {/* Etichetta Oraria */}
                  <div className="p-2 border-r border-slate-800/80 text-right pr-3 text-xs font-mono font-bold text-slate-500 bg-slate-950/40 select-none flex items-start justify-end">
                    {hourLabel}
                  </div>

                  {/* 7 Celle per i giorni della settimana */}
                  {weekDays.map((day, dayIdx) => {
                    const dayEvts = (eventsByDate[day.dateStr] || []).filter((e) => {
                      if (!e.startTime) return hour === (isFull24h ? 0 : 7);
                      const h = parseInt(e.startTime.split(':')[0], 10);
                      return h === hour;
                    });

                    const isNowCell = day.isToday && currentHour === hour;

                    return (
                      <div
                        key={dayIdx}
                        onClick={() => handleSlotClick(day.dateStr, hour)}
                        className={`p-1 border-r border-slate-800/60 last:border-r-0 relative hover:bg-[var(--color-primary)]/[0.03] transition-colors cursor-pointer min-h-[58px] ${
                          day.isToday ? 'bg-slate-900/20' : ''
                        }`}
                      >
                        {/* LINEA INDICATRICE ORA ATTUALE ("NOW") */}
                        {isNowCell && (
                          <div
                            className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                            style={{ top: `${(currentMinute / 60) * 100}%` }}
                          >
                            <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e] -ml-1 shrink-0" />
                            <div className="flex-1 h-[1.5px] bg-rose-500/90 shadow-[0_0_4px_#f43f5e]" />
                          </div>
                        )}

                        {/* Card Eventi nello Slot */}
                        <div className="space-y-1 relative z-10">
                          {dayEvts.map((evt) => {
                            const cfg = typeConfig[evt.type] || typeConfig.custom;
                            const IconComp = cfg.icon;
                            const title = cleanEventTitle(evt.title);

                            return (
                              <div
                                key={evt.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingEvent(evt);
                                  setIsModalOpen(true);
                                }}
                                className={`p-1.5 rounded-xl border text-xs transition-all hover:scale-[1.02] shadow-sm flex flex-col justify-between cursor-pointer ${
                                  evt.type === 'google_calendar'
                                    ? 'bg-blue-950/40 border-blue-500/30 hover:border-blue-400'
                                    : evt.type === 'appointment'
                                    ? 'bg-sky-950/40 border-sky-500/30 hover:border-sky-400'
                                    : evt.type === 'checkin'
                                    ? 'bg-purple-950/40 border-purple-500/30 hover:border-purple-400'
                                    : 'bg-slate-900/90 border-slate-800 hover:border-[var(--color-primary)]/50'
                                }`}
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <IconComp className={`w-3.5 h-3.5 shrink-0 ${cfg.color.split(' ')[0]}`} />
                                  <span className="font-black text-white truncate text-[11px] tracking-tight">{title}</span>
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 font-mono">
                                  <span>{evt.startTime || 'Tutto il giorno'}</span>
                                  {evt.athleteName && (
                                    <span className="truncate max-w-[70px] text-[var(--color-primary)] font-bold">{evt.athleteName}</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================================== */}
      {/* VISTA 2: GIORNO (GRIGLIA GIORNALIERA DETTAGLIATA)                       */}
      {/* ======================================================================== */}
      {viewMode === 'day' && (
        <div className="rounded-2xl bg-slate-950/90 border border-slate-800/90 shadow-2xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Vista Giornaliera Dettagliata</span>
              <h3 className="text-base sm:text-lg font-black text-white capitalize">{headerTitle}</h3>
            </div>
            <button
              onClick={() => handleSlotClick(currentDate.toISOString().slice(0, 10), new Date().getHours())}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-200 hover:text-white transition-colors cursor-pointer"
            >
              + Aggiungi a Quest'Ora
            </button>
          </div>

          <div ref={scrollRef} className="max-h-[620px] overflow-y-auto relative divide-y divide-slate-800/60 custom-scrollbar">
            {currentHours.map((hour) => {
              const hourLabel = `${String(hour).padStart(2, '0')}:00`;
              const dayStr = currentDate.toISOString().slice(0, 10);
              const dayEvts = (eventsByDate[dayStr] || []).filter((e) => {
                if (!e.startTime) return hour === (isFull24h ? 0 : 7);
                const h = parseInt(e.startTime.split(':')[0], 10);
                return h === hour;
              });

              const isTodayView = dayStr === todayIsoStr;
              const isNowCell = isTodayView && currentHour === hour;

              return (
                <div key={hour} className="flex min-h-[68px] group relative">
                  {/* Orario Left */}
                  <div className="w-20 p-3 border-r border-slate-800/80 text-right text-xs font-mono font-bold text-slate-400 bg-slate-950/40 select-none shrink-0 flex items-start justify-end">
                    {hourLabel}
                  </div>

                  {/* Slot per gli appuntamenti dell'ora */}
                  <div
                    onClick={() => handleSlotClick(dayStr, hour)}
                    className="flex-1 p-2 relative hover:bg-[var(--color-primary)]/[0.03] transition-colors cursor-pointer flex flex-wrap items-start gap-2"
                  >
                    {/* Linea NOW */}
                    {isNowCell && (
                      <div
                        className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                        style={{ top: `${(currentMinute / 60) * 100}%` }}
                      >
                        <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e] -ml-1 shrink-0" />
                        <div className="flex-1 h-[1.5px] bg-rose-500/90 shadow-[0_0_4px_#f43f5e]" />
                      </div>
                    )}

                    {dayEvts.length === 0 ? (
                      <span className="text-[10px] text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity pl-2 pt-1 font-mono">
                        + Clicca per aggiungere
                      </span>
                    ) : (
                      dayEvts.map((evt) => {
                        const cfg = typeConfig[evt.type] || typeConfig.custom;
                        const IconComp = cfg.icon;
                        const title = cleanEventTitle(evt.title);

                        return (
                          <div
                            key={evt.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingEvent(evt);
                              setIsModalOpen(true);
                            }}
                            className="p-3 rounded-2xl border bg-slate-900/90 border-slate-800 hover:border-[var(--color-primary)]/50 text-xs transition-all shadow-md flex-1 min-w-[280px] max-w-md cursor-pointer"
                          >
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className={`p-1.5 rounded-xl border ${cfg.color}`}>
                                  <IconComp className="w-4 h-4" />
                                </span>
                                <div>
                                  <h4 className="font-black text-white text-xs">{title}</h4>
                                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase font-mono ${cfg.bgBadge}`}>
                                    {cfg.label}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                {!evt.isSystemGenerated && (
                                  <>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingEvent(evt);
                                        setIsModalOpen(true);
                                      }}
                                      className="p-1 text-slate-400 hover:text-white cursor-pointer"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteModal({ open: true, eventId: evt.id });
                                      }}
                                      className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                            {evt.description && <p className="text-slate-300 text-xs my-1">{evt.description}</p>}

                            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80 mt-2 font-mono">
                              <span className="flex items-center gap-1 text-slate-300 font-semibold">
                                <Clock className="w-3.5 h-3.5 text-slate-500" />
                                {evt.startTime ? `${evt.startTime} ${evt.endTime ? `- ${evt.endTime}` : ''}` : 'Tutto il giorno'}
                              </span>
                              {evt.athleteName && (
                                <span className="flex items-center gap-1 text-[var(--color-primary)] font-bold">
                                  <User className="w-3.5 h-3.5" /> {evt.athleteName}
                                </span>
                              )}
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
        </div>
      )}

      {/* ======================================================================== */}
      {/* VISTA 3: MESE (GRIGLIA MENSILE CLASSICA)                                 */}
      {/* ======================================================================== */}
      {viewMode === 'month' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-slate-800/90 shadow-2xl space-y-4">
            <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-400 uppercase border-b border-slate-800 pb-2">
              <div>Lun</div>
              <div>Mar</div>
              <div>Mer</div>
              <div>Gio</div>
              <div>Ven</div>
              <div className="text-amber-400">Sab</div>
              <div className="text-amber-400">Dom</div>
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {calendarGrid.map((cell, idx) => {
                const dayEvts = eventsByDate[cell.dateStr] || [];
                const isSelected = cell.dateStr === selectedDateStr;

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDateStr(cell.dateStr)}
                    className={`min-h-[75px] sm:min-h-[90px] p-2 rounded-2xl border flex flex-col justify-between text-left transition-all relative cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--color-primary)]/15 border-[var(--color-primary)] shadow-lg shadow-[var(--color-primary)]/10'
                        : cell.isToday
                        ? 'bg-slate-900 border-[var(--color-primary)]/50'
                        : cell.isCurrentMonth
                        ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                        : 'bg-slate-950/30 border-slate-900/50 opacity-40'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className={`text-xs font-bold ${cell.isToday ? 'text-[var(--color-primary)] font-black' : 'text-slate-300'}`}>
                        {cell.dayNumber}
                      </span>
                      {dayEvts.length > 0 && (
                        <span className="w-4 h-4 rounded-full bg-[var(--color-primary)] text-slate-950 font-black text-[9px] flex items-center justify-center">
                          {dayEvts.length}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col gap-1 w-full mt-1 overflow-hidden">
                      {dayEvts.slice(0, 2).map((e, i) => {
                        const cfg = typeConfig[e.type] || typeConfig.custom;
                        const title = cleanEventTitle(e.title);
                        return (
                          <div
                            key={i}
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded truncate border ${cfg.color} bg-slate-900`}
                          >
                            {e.startTime ? `${e.startTime} ` : ''}{title}
                          </div>
                        );
                      })}
                      {dayEvts.length > 2 && (
                        <span className="text-[9px] font-bold text-slate-400">+{dayEvts.length - 2} altri</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Elenco Giorno Selezionato */}
          <div className="p-5 rounded-2xl bg-slate-950/90 border border-slate-800/90 shadow-2xl flex flex-col space-y-4">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Giorno Selezionato</span>
                <h3 className="text-sm sm:text-base font-black text-white capitalize">
                  {new Date(selectedDateStr).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </h3>
              </div>
              <button
                onClick={() => {
                  setModalInitialTimes({ dateStr: selectedDateStr, startTime: '10:00', endTime: '11:00' });
                  setEditingEvent(null);
                  setIsModalOpen(true);
                }}
                className="p-2 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/20 transition-colors cursor-pointer"
                title="Nuovo evento in questo giorno"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[500px] custom-scrollbar">
              {(eventsByDate[selectedDateStr] || []).length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  Nessun evento previsto per questa data.
                </div>
              ) : (
                (eventsByDate[selectedDateStr] || []).map((evt) => {
                  const cfg = typeConfig[evt.type] || typeConfig.custom;
                  const IconComponent = cfg.icon;
                  const title = cleanEventTitle(evt.title);

                  return (
                    <div
                      key={evt.id}
                      className="p-3 rounded-2xl border bg-slate-900/90 border-slate-800 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`p-1.5 rounded-xl border shrink-0 ${cfg.color}`}>
                            <IconComponent className="w-4 h-4" />
                          </span>
                          <div className="min-w-0">
                            <h4 className="text-xs font-black text-white truncate">{title}</h4>
                            <span className="text-[10px] text-slate-400 font-semibold">{cfg.label}</span>
                          </div>
                        </div>
                        {!evt.isSystemGenerated && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => { setEditingEvent(evt); setIsModalOpen(true); }}
                              className="p-1 text-slate-400 hover:text-white cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteModal({ open: true, eventId: evt.id })}
                              className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60 font-mono">
                        <span>{evt.startTime ? `${evt.startTime} ${evt.endTime ? `- ${evt.endTime}` : ''}` : 'Tutto il giorno'}</span>
                        {evt.athleteName && <span className="text-[var(--color-primary)] font-bold">{evt.athleteName}</span>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================== */}
      {/* VISTA 4: AGENDA (LISTA CRONOLOGICA ORDINATA)                             */}
      {/* ======================================================================== */}
      {viewMode === 'agenda' && (
        <div className="p-6 rounded-2xl bg-slate-950/90 border border-slate-800/90 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">Elenco Cronologico Appuntamenti</h3>
              <p className="text-xs text-slate-400 mt-0.5">Tutti gli eventi e scadenze in ordine temporale</p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-400 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
              Totale: {agendaEventsList.length} eventi
            </span>
          </div>

          <div className="divide-y divide-slate-800 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {agendaEventsList.length === 0 ? (
              <div className="text-center py-16 text-slate-500 text-sm">
                Nessun evento in agenda.
              </div>
            ) : (
              agendaEventsList.map((evt) => {
                const cfg = typeConfig[evt.type] || typeConfig.custom;
                const IconComp = cfg.icon;
                const title = cleanEventTitle(evt.title);

                return (
                  <div key={evt.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-900/40 p-2 rounded-xl transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`p-2 rounded-xl border shrink-0 ${cfg.color}`}>
                        <IconComp className="w-5 h-5" />
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-black text-white truncate">{title}</h4>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${cfg.bgBadge}`}>{cfg.label}</span>
                          {evt.athleteName && <span>• Atleta: <strong className="text-[var(--color-primary)]">{evt.athleteName}</strong></span>}
                          {evt.location && <span>• Luogo: {evt.location}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 border-slate-800/60 pt-2 sm:pt-0">
                      <div className="text-right">
                        <span className="block text-xs font-bold text-white">
                          {new Date(evt.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {evt.startTime ? `${evt.startTime} ${evt.endTime ? `- ${evt.endTime}` : ''}` : 'Tutto il giorno'}
                        </span>
                      </div>

                      {!evt.isSystemGenerated && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { setEditingEvent(evt); setIsModalOpen(true); }}
                            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteModal({ open: true, eventId: evt.id })}
                            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
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
      )}

      {/* ─── MODALI ─── */}
      <CalendarModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setModalInitialTimes(null);
        }}
        onSave={handleSaveEvent}
        editingEvent={editingEvent}
        initialDate={modalInitialTimes?.dateStr || selectedDateStr}
        initialStartTime={modalInitialTimes?.startTime}
        initialEndTime={modalInitialTimes?.endTime}
      />

      <GoogleConnectModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
      />

      {/* Modal Conferma Eliminazione */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setDeleteModal({ open: false, eventId: null })} />
          <div className="relative w-full max-w-sm bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4 text-rose-500">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-white">Eliminare Evento?</h3>
            </div>
            <p className="text-xs text-slate-400 mb-6">Sei sicuro di voler eliminare questo evento dal calendario?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteModal({ open: false, eventId: null })}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                Annulla
              </button>
              <button
                onClick={() => deleteModal.eventId && handleDeleteEvent(deleteModal.eventId)}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-colors cursor-pointer"
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
