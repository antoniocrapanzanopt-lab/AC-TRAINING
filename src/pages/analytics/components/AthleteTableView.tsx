import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  AlertCircle,
  Clock,
  CheckCircle2,
  TrendingUp,
  Columns3,
  ChevronDown,
  Activity,
  Ban,
  Zap,
  Search,
  X,
} from 'lucide-react';
import { AthleteTimelineItem, TimelineCategory } from '../utils/timelineCalculator';

interface AthleteTableViewProps {
  timelineItems: AthleteTimelineItem[];
  onSelectAthlete: (athleteId: string) => void;
  isLoading?: boolean;
}

type TableSortColumn = 'name' | 'last_workout' | 'days_inactive' | 'progress';
type SortDirection = 'asc' | 'desc';

type ColumnId = 'stato' | 'ultimo_allenamento' | 'giorni_attivita' | 'avanzamento';

interface ColumnDef {
  id: ColumnId;
  label: string;
  alwaysVisible?: boolean;
}

const COLUMNS: ColumnDef[] = [
  { id: 'stato', label: 'Stato' },
  { id: 'ultimo_allenamento', label: 'Ultimo allenamento' },
  { id: 'giorni_attivita', label: "Giorni dall'attività" },
  { id: 'avanzamento', label: 'Avanzamento' },
];

const DEFAULT_VISIBLE: Record<ColumnId, boolean> = {
  stato: true,
  ultimo_allenamento: true,
  giorni_attivita: true,
  avanzamento: true,
};

export const AthleteTableView: React.FC<AthleteTableViewProps> = ({
  timelineItems,
  onSelectAthlete,
  isLoading = false,
}) => {
  const [sortColumn, setSortColumn] = useState<TableSortColumn>('progress');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | TimelineCategory>('all');
  const [visibleCols, setVisibleCols] = useState<Record<ColumnId, boolean>>(DEFAULT_VISIBLE);
  const [showColMenu, setShowColMenu] = useState(false);
  const colMenuRef = useRef<HTMLDivElement>(null);

  // Chiudi il menu colonne cliccando fuori
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node)) {
        setShowColMenu(false);
      }
    };
    if (showColMenu) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showColMenu]);

  const handleSort = (col: TableSortColumn) => {
    if (sortColumn === col) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(col);
      setSortDir(col === 'name' ? 'asc' : 'desc');
    }
  };

  const filteredAndSortedItems = useMemo(() => {
    let items = [...timelineItems];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(
        (item) =>
          item.athleteName.toLowerCase().includes(q) ||
          item.workoutTitle.toLowerCase().includes(q) ||
          item.statusLabel.toLowerCase().includes(q)
      );
    }

    if (categoryFilter !== 'all') {
      items = items.filter((item) => item.category === categoryFilter);
    }

    items.sort((a, b) => {
      let valA: string | number = 0;
      let valB: string | number = 0;

      switch (sortColumn) {
        case 'name':
          valA = a.athleteName.toLowerCase();
          valB = b.athleteName.toLowerCase();
          break;
        case 'last_workout':
          valA = a.lastSessionDateIso ? new Date(a.lastSessionDateIso).getTime() : 0;
          valB = b.lastSessionDateIso ? new Date(b.lastSessionDateIso).getTime() : 0;
          break;
        case 'days_inactive':
          valA = a.daysSinceLastWorkout ?? 9999;
          valB = b.daysSinceLastWorkout ?? 9999;
          break;
        case 'progress':
          valA = a.progressPercent;
          valB = b.progressPercent;
          break;
      }

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return a.athleteName.localeCompare(b.athleteName);
    });

    return items;
  }, [timelineItems, searchQuery, categoryFilter, sortColumn, sortDir]);

  const renderSortIcon = (col: TableSortColumn) => {
    if (sortColumn !== col) {
      return <ArrowUpDown className="w-3 h-3 text-slate-600 group-hover:text-slate-400 inline-block ml-1" />;
    }
    return sortDir === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-[var(--color-primary)] inline-block ml-1" />
    ) : (
      <ArrowDown className="w-3 h-3 text-[var(--color-primary)] inline-block ml-1" />
    );
  };

  const getStatusBadge = (item: AthleteTimelineItem) => {
    switch (item.statusColor) {
      case 'red':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/15 text-rose-300 border border-rose-500/30 whitespace-nowrap">
            <AlertCircle className="w-2.5 h-2.5 text-rose-400 shrink-0" />
            <span>{item.statusLabel}</span>
          </span>
        );
      case 'yellow':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-300 border border-amber-500/30 whitespace-nowrap">
            <Clock className="w-2.5 h-2.5 text-amber-400 shrink-0" />
            <span>{item.statusLabel}</span>
          </span>
        );
      case 'emerald':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
            <span>{item.statusLabel}</span>
          </span>
        );
      case 'sky':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-500/15 text-sky-300 border border-sky-500/30 whitespace-nowrap">
            <TrendingUp className="w-2.5 h-2.5 text-sky-400 shrink-0" />
            <span>{item.statusLabel}</span>
          </span>
        );
      case 'slate':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-800 text-slate-300 border border-slate-700 whitespace-nowrap">
            <span>{item.statusLabel}</span>
          </span>
        );
    }
  };

  /** Formatta "Giorni dall'attività" con testo semplice e colore appropriato */
  const renderDaysCell = (item: AthleteTimelineItem) => {
    const days = item.daysSinceLastWorkout;
    if (days === null) {
      return (
        <span className="inline-flex items-center gap-1 text-slate-500 text-[11px]">
          <Ban className="w-3 h-3 shrink-0" />
          <span>N/D</span>
        </span>
      );
    }
    if (days === 0) {
      return (
        <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
          <Activity className="w-3 h-3 shrink-0" />
          <span>Oggi</span>
        </span>
      );
    }
    if (days === 1) {
      return (
        <span className="inline-flex items-center gap-1 text-sky-400 font-bold text-[11px]">
          <Zap className="w-3 h-3 shrink-0" />
          <span>1 giorno fa</span>
        </span>
      );
    }
    if (days <= 3) {
      return (
        <span className="font-mono font-bold text-amber-300 text-[11px]">
          {days} giorni fa
        </span>
      );
    }
    if (days < 7) {
      return (
        <span className="font-mono font-bold text-amber-500 text-[11px]">
          {days} giorni fa
        </span>
      );
    }
    return (
      <span className="font-mono font-bold text-rose-400 text-[11px]">
        {days}+ giorni fa
      </span>
    );
  };

  /** Testo avanzamento chiaro */
  const getProgressText = (item: AthleteTimelineItem): string => {
    const count = item.completedSessionsCount ?? 0;
    const pct = Math.round(item.progressPercent);
    if (count === 0) return '0 allenamenti · Non iniziato';
    if (pct >= 100) return `${count} allenamenti · Completato`;
    return `${count} allenamenti · ${pct}%`;
  };

  const getProgressBarColor = (item: AthleteTimelineItem): string => {
    if (item.progressPercent >= 100) return 'bg-gradient-to-r from-emerald-500 to-emerald-400';
    if (item.statusColor === 'red') return 'bg-gradient-to-r from-rose-500 to-rose-400';
    if (item.statusColor === 'yellow') return 'bg-gradient-to-r from-amber-400 to-amber-500';
    if (item.progressPercent >= 25) return 'bg-gradient-to-r from-sky-400 to-[var(--color-primary)]';
    return 'bg-slate-600';
  };

  const toggleCol = (id: ColumnId) => {
    setVisibleCols((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const show = visibleCols;

  return (
    <div className="rounded-3xl bg-slate-950/90 border border-slate-800/90 shadow-xl overflow-hidden">
      {/* Toolbar sopra la tabella: Ricerca, Filtro Categoria e Colonne */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-4 py-3 border-b border-slate-800/70 bg-slate-900/40">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Barra di ricerca */}
          <div className="relative min-w-[200px] max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca atleta o scheda..."
              className="w-full pl-8 pr-7 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[var(--color-primary)] transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-0.5"
                title="Cancella ricerca"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Filtro rapido categoria */}
          <div className="flex items-center gap-1 overflow-x-auto py-0.5 custom-scrollbar">
            {[
              { id: 'all', label: 'Tutti' },
              { id: 'late', label: 'In ritardo' },
              { id: 'today', label: 'Attivi oggi' },
              { id: 'end_of_block', label: 'Fine blocco' },
              { id: 'no_activity', label: 'Senza attività' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryFilter(cat.id as 'all' | TimelineCategory)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                  categoryFilter === cat.id
                    ? 'bg-[var(--color-primary)] text-slate-950 font-black shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Menu a discesa colonne visibili */}
        <div className="relative shrink-0 self-end lg:self-auto" ref={colMenuRef}>
          <button
            type="button"
            onClick={() => setShowColMenu((p) => !p)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-bold text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            <Columns3 className="w-3.5 h-3.5" />
            <span>Colonne</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${showColMenu ? 'rotate-180' : ''}`} />
          </button>

          {showColMenu && (
            <div className="absolute right-0 top-full mt-1.5 z-50 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 min-w-[180px]">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-2 pb-1.5 pt-0.5">
                Colonne visibili
              </p>
              <p className="text-[10px] text-slate-400 font-medium px-2 pb-2 border-b border-slate-800">
                Atleta sempre visibile
              </p>
              {COLUMNS.map((col) => (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => toggleCol(col.id)}
                  className="flex items-center justify-between w-full px-2 py-1.5 rounded-lg hover:bg-slate-800 text-[11px] text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <span>{col.label}</span>
                  <span
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      show[col.id]
                        ? 'bg-[var(--color-primary)] border-[var(--color-primary)]'
                        : 'bg-transparent border-slate-600'
                    }`}
                  >
                    {show[col.id] && (
                      <svg className="w-2.5 h-2.5 text-slate-950" viewBox="0 0 10 10" fill="none">
                        <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-500 text-xs">
          Verifica in corso…
        </div>
      ) : filteredAndSortedItems.length === 0 ? (
        <div className="p-12 text-center text-slate-500 text-xs">
          {searchQuery || categoryFilter !== 'all'
            ? 'Nessun atleta trovato con i filtri applicati.'
            : 'Nessun atleta registrato.'}
        </div>
      ) : (
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800/90 bg-slate-900/70 text-slate-400 select-none">
                {/* Atleta — sempre visibile */}
                <th
                  onClick={() => handleSort('name')}
                  className="py-3 px-4 font-bold uppercase tracking-wider text-[10px] cursor-pointer group hover:text-white"
                >
                  <div className="flex items-center">
                    <span>Atleta</span>
                    {renderSortIcon('name')}
                  </div>
                </th>

                {show.stato && (
                  <th className="py-3 px-4 font-bold uppercase tracking-wider text-[10px]">
                    Stato
                  </th>
                )}

                {show.ultimo_allenamento && (
                  <th
                    onClick={() => handleSort('last_workout')}
                    className="py-3 px-4 font-bold uppercase tracking-wider text-[10px] cursor-pointer group hover:text-white"
                  >
                    <div className="flex items-center">
                      <span>Ultimo allenamento</span>
                      {renderSortIcon('last_workout')}
                    </div>
                  </th>
                )}

                {show.giorni_attivita && (
                  <th
                    onClick={() => handleSort('days_inactive')}
                    className="py-3 px-4 font-bold uppercase tracking-wider text-[10px] cursor-pointer group hover:text-white text-center"
                  >
                    <div className="flex items-center justify-center">
                      <span>Giorni</span>
                      {renderSortIcon('days_inactive')}
                    </div>
                  </th>
                )}

                {show.avanzamento && (
                  <th
                    onClick={() => handleSort('progress')}
                    className="py-3 px-4 font-bold uppercase tracking-wider text-[10px] cursor-pointer group hover:text-white"
                  >
                    <div className="flex items-center">
                      <span>Avanzamento</span>
                      {renderSortIcon('progress')}
                    </div>
                  </th>
                )}

                {/* Azione — sempre visibile */}
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[10px] text-right">
                  Azione
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredAndSortedItems.map((item) => {
                const initials = item.athleteName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .substring(0, 2)
                  .toUpperCase() || 'AT';

                const progressTooltip = `${item.completedSessionsCount ?? 0} allenamenti completati su ${item.totalPlannedSessions ?? '?'} previsti`;

                return (
                  <tr
                    key={item.athleteId}
                    onClick={() => onSelectAthlete(item.athleteId)}
                    className="hover:bg-slate-900/60 transition-colors cursor-pointer group"
                  >
                    {/* Atleta */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5 min-w-[160px] max-w-[220px]">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-amber-600 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 shadow group-hover:scale-105 transition-transform">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div
                            title={item.athleteName}
                            className="font-bold text-white group-hover:text-[var(--color-primary)] transition-colors truncate max-w-[140px]"
                          >
                            {item.athleteName}
                          </div>
                          <div
                            title={item.workoutTitle}
                            className="text-[10px] text-slate-500 truncate max-w-[140px]"
                          >
                            {item.workoutTitle || 'Nessuna scheda'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Stato */}
                    {show.stato && (
                      <td className="py-3 px-4">
                        {getStatusBadge(item)}
                      </td>
                    )}

                    {/* Ultimo allenamento */}
                    {show.ultimo_allenamento && (
                      <td className="py-3 px-4">
                        {item.lastSessionLabel ? (
                          <div>
                            <div
                              title={item.lastSessionLabel}
                              className="font-medium text-slate-200 truncate max-w-[160px]"
                            >
                              {item.lastSessionLabel}
                            </div>
                            {item.lastSessionRelative && (
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                {item.lastSessionRelative}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-600 text-[11px]">—</span>
                        )}
                      </td>
                    )}

                    {/* Giorni dall'attività */}
                    {show.giorni_attivita && (
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {renderDaysCell(item)}
                      </td>
                    )}

                    {/* Avanzamento */}
                    {show.avanzamento && (
                      <td className="py-3 px-4 whitespace-nowrap min-w-[160px]">
                        <div title={progressTooltip}>
                          <div className="font-mono font-bold text-white text-[11px] mb-1">
                            {getProgressText(item)}
                          </div>
                          <div className="w-28 h-1.5 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(item)}`}
                              style={{ width: `${Math.min(100, Math.max(0, item.progressPercent))}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    )}

                    {/* Azione */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectAthlete(item.athleteId);
                        }}
                        className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-bold text-slate-300 hover:text-slate-950 hover:bg-[var(--color-primary)] hover:border-[var(--color-primary)] transition-all cursor-pointer inline-flex items-center gap-1 shadow-sm"
                      >
                        <span>Apri</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
