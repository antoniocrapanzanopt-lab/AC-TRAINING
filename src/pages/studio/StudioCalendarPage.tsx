import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Video,
  Layers,
  Smartphone,
  FileText,
  Clock,
} from 'lucide-react';
import { useContents } from '../../context/ContentsContext';
import { useToast } from '../../context/ToastContext';
import {
  InstagramContent,
  ContentType,
  ContentStatus,
} from '../../types/inboxAndContent';
import { StudioFormatFilter } from '../../types/studio';

interface StudioCalendarPageProps {
  onOpenContentEditor: (content: InstagramContent) => void;
  onQuickNewContent: (defaultType?: ContentType, defaultStatus?: ContentStatus, scheduledDate?: string) => void;
}

type CalendarViewMode = 'month' | 'week' | 'day';

const SHORT_DAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

export const StudioCalendarPage: React.FC<StudioCalendarPageProps> = ({
  onOpenContentEditor,
  onQuickNewContent,
}) => {
  const { contents, updateContent } = useContents();
  const { showSuccess, showError } = useToast();

  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [formatFilter, setFormatFilter] = useState<StudioFormatFilter>('all');
  const [draggedContentId, setDraggedContentId] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Mese/Settimana/Giorno titolo
  const currentTitle = useMemo(() => {
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
    } else if (viewMode === 'week') {
      // Inizio settimana (lunedì)
      const d = new Date(currentDate);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      const sunday = new Date(d.setDate(diff + 6));
      return `Settimana ${monday.getDate()} ${monday.toLocaleDateString('it-IT', { month: 'short' })} - ${sunday.getDate()} ${sunday.toLocaleDateString('it-IT', { month: 'short', year: 'numeric' })}`;
    } else {
      return currentDate.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
  }, [currentDate, viewMode]);

  // Navigazione temporale
  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() - 1);
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() - 7);
    } else {
      d.setDate(d.getDate() - 1);
    }
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() + 1);
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() + 7);
    } else {
      d.setDate(d.getDate() + 1);
    }
    setCurrentDate(d);
  };

  const handleGoToday = () => {
    setCurrentDate(new Date());
  };

  // Filtraggio contenuti per formato
  const filteredContents = useMemo(() => {
    if (formatFilter === 'all') return contents;
    return contents.filter((c) => c.type === formatFilter);
  }, [contents, formatFilter]);

  // Contenuti mappati per data YYYY-MM-DD
  const contentsByDate = useMemo(() => {
    const map: Record<string, InstagramContent[]> = {};
    filteredContents.forEach((c) => {
      const dateStr = c.scheduled_for || c.published_at;
      if (dateStr) {
        const key = dateStr.slice(0, 10);
        if (!map[key]) map[key] = [];
        map[key].push(c);
      }
    });
    return map;
  }, [filteredContents]);

  // Contenuti non ancora programmati
  const unscheduledContents = useMemo(() => {
    return filteredContents.filter((c) => !c.scheduled_for && !c.published_at && c.status !== 'published');
  }, [filteredContents]);

  // Gestione Drag & Drop per cambiare data di pubblicazione
  const handleDropOnDate = async (targetDateStr: string) => {
    if (!draggedContentId) return;
    const item = contents.find((c) => c.id === draggedContentId);
    if (!item) return;

    try {
      // Manteniamo l'orario se già presente, altrimenti impostiamo le 18:00
      const existingTime = item.scheduled_for ? item.scheduled_for.slice(11, 16) : '18:00';
      const newScheduledFor = `${targetDateStr}T${existingTime}:00`;

      await updateContent(item.id, {
        scheduled_for: newScheduledFor,
      });
      showSuccess(`"${item.title}" programmato per il ${new Date(targetDateStr).toLocaleDateString('it-IT')}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Errore nella pianificazione';
      showError(message);
    } finally {
      setDraggedContentId(null);
    }
  };

  // Generazione celle del mese
  const monthCells = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let startDayIndex = firstDay.getDay() - 1;
    if (startDayIndex === -1) startDayIndex = 6; // Lunedì = 0

    const totalDays = lastDay.getDate();
    const cells: { dateStr: string; dayNum: number; isCurrentMonth: boolean; isToday: boolean }[] = [];
    const todayStr = new Date().toISOString().slice(0, 10);

    // Giorni mese precedente
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      const prevDate = new Date(year, month - 1, day);
      const dateStr = prevDate.toISOString().slice(0, 10);
      cells.push({ dateStr, dayNum: day, isCurrentMonth: false, isToday: dateStr === todayStr });
    }

    // Giorni mese corrente
    for (let d = 1; d <= totalDays; d++) {
      const currentD = new Date(year, month, d);
      const dateStr = currentD.toISOString().slice(0, 10);
      cells.push({ dateStr, dayNum: d, isCurrentMonth: true, isToday: dateStr === todayStr });
    }

    // Giorni mese successivo per completare la griglia (multiplo di 7)
    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) {
      for (let n = 1; n <= remaining; n++) {
        const nextD = new Date(year, month + 1, n);
        const dateStr = nextD.toISOString().slice(0, 10);
        cells.push({ dateStr, dayNum: n, isCurrentMonth: false, isToday: dateStr === todayStr });
      }
    }

    return cells;
  }, [year, month]);

  // Generazione giorni settimana
  const weekDays = useMemo(() => {
    const d = new Date(currentDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));

    const todayStr = new Date().toISOString().slice(0, 10);
    const days: { dateStr: string; dayNum: number; dayName: string; isToday: boolean }[] = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const dateStr = date.toISOString().slice(0, 10);
      days.push({
        dateStr,
        dayNum: date.getDate(),
        dayName: SHORT_DAYS[i],
        isToday: dateStr === todayStr,
      });
    }

    return days;
  }, [currentDate]);

  const renderFormatIcon = (type: ContentType) => {
    switch (type) {
      case 'reel':
        return <Video className="w-3 h-3 text-sky-400" />;
      case 'carousel':
        return <Layers className="w-3 h-3 text-purple-400" />;
      case 'story':
        return <Smartphone className="w-3 h-3 text-rose-400" />;
      case 'post':
        return <FileText className="w-3 h-3 text-emerald-400" />;
    }
  };

  return (
    <div className="space-y-6 max-w-[1920px] mx-auto pb-16">
      
      {/* TOP HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5 font-sans">
              <CalendarIcon className="w-7 h-7 text-amber-400" />
              Calendario Editoriale Social
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              Drag & Drop Ready
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Pianifica date, orari di pubblicazione e piattaforme per Reel, Stories, Caroselli e Post.
          </p>
        </div>

        {/* CONTROLLI VISTA: MESE / SETTIMANA / GIORNO & BOTTONE OGGI */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="p-1 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'month' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Mese
            </button>
            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'week' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Settimana
            </button>
            <button
              type="button"
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'day' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Giorno
            </button>
          </div>

          <button
            type="button"
            onClick={handleGoToday}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            Oggi
          </button>

          <button
            type="button"
            onClick={() => onQuickNewContent('reel', 'idea', new Date().toISOString().slice(0, 10))}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md shadow-amber-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Pianifica</span>
          </button>
        </div>
      </div>

      {/* BARRA FILTRI FORMATO E NAVIGAZIONE MESE/DATA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
        
        {/* NAVIGAZIONE DATA CON FRECCE */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrev}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white capitalize font-sans">
            {currentTitle}
          </h2>
        </div>

        {/* FILTRI FORMATO (Tutti, Reel, Stories, Caroselli, Post) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setFormatFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              formatFilter === 'all'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            Tutti
          </button>
          <button
            type="button"
            onClick={() => setFormatFilter('reel')}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              formatFilter === 'reel'
                ? 'bg-sky-500 text-slate-950 font-bold'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Video className="w-3 h-3" /> Reel
          </button>
          <button
            type="button"
            onClick={() => setFormatFilter('story')}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              formatFilter === 'story'
                ? 'bg-rose-500 text-slate-950 font-bold'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3 h-3" /> Stories
          </button>
          <button
            type="button"
            onClick={() => setFormatFilter('carousel')}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              formatFilter === 'carousel'
                ? 'bg-purple-500 text-slate-950 font-bold'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3 h-3" /> Caroselli
          </button>
          <button
            type="button"
            onClick={() => setFormatFilter('post')}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              formatFilter === 'post'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3 h-3" /> Post
          </button>
        </div>

      </div>

      {/* LAYOUT PRINCIPALE: CALENDARIO A SINISTRA + SIDEBAR NON PROGRAMMATI A DESTRA */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* GRIGLIA CALENDARIO (3 COLONNE SU XL) */}
        <div className="xl:col-span-3 space-y-4">
          
          {/* VISTA MESE */}
          {viewMode === 'month' && (
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden shadow-lg">
              {/* Intestazione giorni */}
              <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-950/80 text-center py-2.5">
                {SHORT_DAYS.map((d) => (
                  <div key={d} className="text-xs font-bold text-slate-400 uppercase font-mono">
                    {d}
                  </div>
                ))}
              </div>

              {/* Celle del mese */}
              <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-800/60">
                {monthCells.map((cell) => {
                  const dayItems = contentsByDate[cell.dateStr] || [];

                  return (
                    <div
                      key={cell.dateStr}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDropOnDate(cell.dateStr)}
                      className={`min-h-[120px] p-2 flex flex-col justify-between transition-colors ${
                        !cell.isCurrentMonth
                          ? 'bg-slate-950/40 text-slate-600'
                          : cell.isToday
                          ? 'bg-amber-500/5 text-white'
                          : 'bg-slate-900/30 hover:bg-slate-800/30'
                      }`}
                    >
                      {/* INTESTAZIONE CELLA */}
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className={`text-xs font-mono font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                            cell.isToday
                              ? 'bg-amber-500 text-slate-950'
                              : cell.isCurrentMonth
                              ? 'text-slate-300'
                              : 'text-slate-600'
                          }`}
                        >
                          {cell.dayNum}
                        </span>

                        <button
                          type="button"
                          onClick={() => onQuickNewContent('reel', 'idea', cell.dateStr)}
                          className="opacity-0 group-hover:opacity-100 hover:opacity-100 text-slate-400 hover:text-amber-400 p-0.5 rounded transition-opacity"
                          title="Aggiungi contenuto in questa data"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* LISTA CONTENUTI IN QUESTA DATA */}
                      <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[140px] custom-scrollbar">
                        {dayItems.map((item) => (
                          <div
                            key={item.id}
                            draggable
                            onDragStart={() => setDraggedContentId(item.id)}
                            onClick={() => onOpenContentEditor(item)}
                            className="group cursor-pointer p-1.5 rounded-lg bg-slate-950/90 border border-slate-800 hover:border-amber-500/50 transition-all text-left shadow-sm space-y-1"
                          >
                            <div className="flex items-center justify-between gap-1 text-[10px]">
                              <div className="flex items-center gap-1 font-semibold truncate">
                                {renderFormatIcon(item.type)}
                                <span className="text-white truncate group-hover:text-amber-300">
                                  {item.title}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between text-[9px] text-slate-400 pt-0.5 border-t border-slate-900">
                              <span className="font-mono text-amber-300">
                                {item.scheduled_for ? item.scheduled_for.slice(11, 16) : '18:00'}
                              </span>
                              <span className="capitalize text-slate-400">{item.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VISTA SETTIMANA */}
          {viewMode === 'week' && (
            <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
              {weekDays.map((day) => {
                const dayItems = contentsByDate[day.dateStr] || [];

                return (
                  <div
                    key={day.dateStr}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDropOnDate(day.dateStr)}
                    className={`rounded-2xl p-3 border min-h-[350px] flex flex-col justify-between ${
                      day.isToday
                        ? 'bg-amber-500/10 border-amber-500/40'
                        : 'bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                        <div>
                          <div className="text-xs font-mono font-bold uppercase text-slate-400">
                            {day.dayName}
                          </div>
                          <div className="text-lg font-black text-white font-mono">
                            {day.dayNum}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onQuickNewContent('reel', 'idea', day.dateStr)}
                          className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="space-y-2">
                        {dayItems.length === 0 ? (
                          <div className="text-center py-6 text-xs text-slate-500">
                            Libero
                          </div>
                        ) : (
                          dayItems.map((item) => (
                            <div
                              key={item.id}
                              draggable
                              onDragStart={() => setDraggedContentId(item.id)}
                              onClick={() => onOpenContentEditor(item)}
                              className="cursor-pointer p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-amber-500/40 transition-all text-xs"
                            >
                              <div className="flex items-center gap-1.5 font-bold text-white mb-1">
                                {renderFormatIcon(item.type)}
                                <span className="truncate">{item.title}</span>
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-900">
                                <span className="font-mono text-amber-300">
                                  {item.scheduled_for ? item.scheduled_for.slice(11, 16) : '18:00'}
                                </span>
                                <span className="text-slate-300 font-medium">{item.status}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="pt-2 text-center text-[10px] text-slate-500 font-mono">
                      {dayItems.length} {dayItems.length === 1 ? 'post' : 'post'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* VISTA GIORNO */}
          {viewMode === 'day' && (
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-black text-white">
                    Palinsesto {currentDate.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Orari e contenuti programmati per la giornata
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onQuickNewContent('reel', 'idea', currentDate.toISOString().slice(0, 10))}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-400 text-slate-950 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Aggiungi per oggi</span>
                </button>
              </div>

              {/* TIMELINE GIORNALIERA */}
              <div className="space-y-3">
                {['09:00', '12:30', '15:00', '18:00', '20:30'].map((timeSlot) => {
                  const targetDateKey = currentDate.toISOString().slice(0, 10);
                  const itemsAtSlot = (contentsByDate[targetDateKey] || []).filter((item) => {
                    const time = item.scheduled_for ? item.scheduled_for.slice(11, 16) : '18:00';
                    return time.slice(0, 2) === timeSlot.slice(0, 2);
                  });

                  return (
                    <div
                      key={timeSlot}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDropOnDate(targetDateKey)}
                      className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                          {timeSlot}
                        </span>
                        <span className="text-xs text-slate-400">
                          Slot suggerito per Engagement
                        </span>
                      </div>

                      <div className="flex-1 flex flex-wrap items-center gap-2 sm:justify-end">
                        {itemsAtSlot.length === 0 ? (
                          <span className="text-xs text-slate-500 italic">Slot libero</span>
                        ) : (
                          itemsAtSlot.map((item) => (
                            <div
                              key={item.id}
                              onClick={() => onOpenContentEditor(item)}
                              className="cursor-pointer px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-amber-400 text-xs font-semibold text-white flex items-center gap-2"
                            >
                              {renderFormatIcon(item.type)}
                              <span>{item.title}</span>
                              <span className="text-[10px] text-amber-300 font-mono">({item.status})</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* SIDEBAR DESTRA: TRAY CONTENUTI NON PROGRAMMATI */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                Da Pianificare ({unscheduledContents.length})
              </h3>
            </div>
          </div>

          <p className="text-xs text-slate-400">
            Trascina una card sul calendario per assegnarle data e orario di pubblicazione.
          </p>

          <div className="space-y-2.5 overflow-y-auto max-h-[500px] custom-scrollbar">
            {unscheduledContents.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
                Tutti i contenuti sono stati programmati!
              </div>
            ) : (
              unscheduledContents.map((item) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => setDraggedContentId(item.id)}
                  onClick={() => onOpenContentEditor(item)}
                  className="cursor-grab active:cursor-grabbing p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/40 transition-all text-xs space-y-1.5 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 font-bold text-white">
                      {renderFormatIcon(item.type)}
                      <span className="truncate max-w-[160px]">{item.title}</span>
                    </div>
                    <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {item.status}
                    </span>
                  </div>

                  {item.hook && (
                    <p className="text-[11px] text-slate-400 italic line-clamp-1">
                      "{item.hook}"
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
