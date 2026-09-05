import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  AlertTriangle,
} from 'lucide-react';
import { InstagramContent, ContentType, ContentStatus } from '../../types/inboxAndContent';

interface ContentCalendarViewProps {
  contents: InstagramContent[];
  onEditContent: (content: InstagramContent) => void;
  onNewContent: (defaultStatus?: ContentStatus, scheduledDate?: string) => void;
}

const TYPE_ICONS: Record<ContentType, string> = {
  reel: '🎬',
  story: '📱',
  carousel: '📑',
  post: '🖼️',
};

const STATUS_BORDER: Record<ContentStatus, string> = {
  idea: 'border-blue-500/40 bg-blue-500/10 text-blue-200',
  script_draft: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
  ready_to_record: 'border-rose-500/40 bg-rose-500/10 text-rose-200',
  editing: 'border-purple-500/40 bg-purple-500/10 text-purple-200',
  recorded: 'border-purple-500/40 bg-purple-500/10 text-purple-200',
  ready_to_publish: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
  published: 'border-slate-700 bg-slate-800 text-slate-300',
  repurpose: 'border-slate-700 bg-slate-800 text-slate-400',
};

const DAYS_OF_WEEK = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

export const ContentCalendarView: React.FC<ContentCalendarViewProps> = ({
  contents,
  onEditContent,
  onNewContent,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Mese e anno formattati
  const monthName = currentDate.toLocaleDateString('it-IT', {
    month: 'long',
    year: 'numeric',
  });

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Mappa dei contenuti raggruppati per data "YYYY-MM-DD"
  const contentsByDate = useMemo(() => {
    const map: Record<string, InstagramContent[]> = {};
    contents.forEach((c) => {
      const dateStr = c.scheduled_for || c.published_at;
      if (dateStr) {
        const key = dateStr.slice(0, 10);
        if (!map[key]) map[key] = [];
        map[key].push(c);
      }
    });
    return map;
  }, [contents]);

  // Contenuti non programmati
  const unscheduledContents = useMemo(() => {
    return contents.filter((c) => !c.scheduled_for && !c.published_at && c.status !== 'published');
  }, [contents]);

  // Generazione celle del calendario mensile
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Giorno della settimana del 1° del mese (0 = lunedì, 6 = domenica)
    let startDay = firstDayOfMonth.getDay() - 1;
    if (startDay === -1) startDay = 6;

    const daysInMonth = lastDayOfMonth.getDate();
    const cells: { dateStr: string; dayNumber: number; isCurrentMonth: boolean; isToday: boolean }[] = [];

    const todayStr = new Date().toISOString().slice(0, 10);

    // Giorni del mese precedente
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const prevD = new Date(year, month - 1, dayNum);
      const dateStr = prevD.toISOString().slice(0, 10);
      cells.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
    }

    // Giorni del mese corrente
    for (let day = 1; day <= daysInMonth; day++) {
      const currD = new Date(year, month, day);
      const dateStr = currD.toISOString().slice(0, 10);
      cells.push({
        dateStr,
        dayNumber: day,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
      });
    }

    // Giorni del mese successivo per completare la griglia (multiplo di 7)
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let nextDay = 1; nextDay <= remaining; nextDay++) {
      const nextD = new Date(year, month + 1, nextDay);
      const dateStr = nextD.toISOString().slice(0, 10);
      cells.push({
        dateStr,
        dayNumber: nextDay,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
    }

    return cells;
  }, [year, month]);

  return (
    <div className="space-y-4">
      {/* HEADER CALENDARIO */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-black text-white capitalize">{monthName}</h2>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={goToToday}
            className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-bold transition cursor-pointer"
          >
            Oggi
          </button>
          <button
            type="button"
            onClick={prevMonth}
            className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            title="Mese precedente"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            title="Mese successivo"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* GRIGLIA CALENDARIO */}
      <div className="bg-slate-950/90 border border-slate-800/90 rounded-3xl p-3.5 shadow-xl space-y-2 overflow-hidden">
        {/* INTESTAZIONE GIORNI */}
        <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-bold text-slate-400 pb-1 border-b border-slate-800/80">
          {DAYS_OF_WEEK.map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>

        {/* CELLE DEI GIORNI */}
        <div className="grid grid-cols-7 gap-1.5">
          {calendarCells.map((cell) => {
            const dayContents = contentsByDate[cell.dateStr] || [];

            return (
              <div
                key={cell.dateStr}
                onClick={() => onNewContent('idea', `${cell.dateStr}T18:00:00`)}
                className={`min-h-[105px] sm:min-h-[120px] p-2 rounded-2xl border transition-all flex flex-col justify-between group cursor-pointer ${
                  cell.isToday
                    ? 'bg-amber-500/10 border-amber-500/50 ring-1 ring-amber-500/20'
                    : cell.isCurrentMonth
                    ? 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/80'
                    : 'bg-slate-950/30 border-slate-900/60 opacity-40 hover:opacity-80'
                }`}
              >
                {/* NUMERO GIORNO E CONTATORE */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-mono font-black ${
                      cell.isToday
                        ? 'text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded-md'
                        : cell.isCurrentMonth
                        ? 'text-slate-300'
                        : 'text-slate-600'
                    }`}
                  >
                    {cell.dayNumber}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNewContent('idea', `${cell.dateStr}T18:00:00`);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                    title={`Aggiungi contenuto il ${cell.dayNumber}`}
                  >
                    <Plus className="w-3 h-3 text-amber-400" />
                  </button>
                </div>

                {/* LISTA MINI-CHIP CONTENUTI PROGRAMMATI */}
                <div className="space-y-1 my-1 overflow-y-auto max-h-[75px] custom-scrollbar">
                  {dayContents.map((content) => {
                    const icon = TYPE_ICONS[content.type] || '🎬';
                    const borderCls = STATUS_BORDER[content.status] || STATUS_BORDER.idea;

                    return (
                      <div
                        key={content.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditContent(content);
                        }}
                        className={`px-1.5 py-1 rounded-lg border text-[10px] font-bold truncate flex items-center justify-between gap-1 shadow-sm transition hover:scale-[1.02] cursor-pointer ${borderCls}`}
                        title={`${content.title} (${content.status})`}
                      >
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="shrink-0">{icon}</span>
                          <span className="truncate">{content.title || 'Senza Titolo'}</span>
                        </div>
                        {content.status === 'ready_to_publish' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="text-[9px] font-mono text-slate-500 text-right">
                  {dayContents.length > 0 ? `${dayContents.length} cont.` : ''}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CASSETTO INFERIORE: CONTENUTI NON ANCORA PROGRAMMATI */}
      {unscheduledContents.length > 0 && (
        <div className="p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Contenuti da programmare ({unscheduledContents.length})
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Clicca per aprire e assegnare una data
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
            {unscheduledContents.slice(0, 8).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onEditContent(c)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/40 text-[11px] font-bold text-slate-200 hover:text-white shrink-0 flex items-center gap-1.5 transition cursor-pointer"
              >
                <span>{TYPE_ICONS[c.type]}</span>
                <span className="max-w-[150px] truncate">{c.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
