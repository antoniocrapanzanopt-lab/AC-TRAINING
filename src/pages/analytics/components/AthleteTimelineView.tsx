import React, { useState, useMemo } from 'react';
import {
  Clock,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Flame,
  User,
} from 'lucide-react';
import {
  AthleteTimelineItem,
  TimelineCategory,
  TimelinePeriodFilter,
  TimelineSortOption,
  filterTimelineByPeriod,
  sortTimelineItems,
} from '../utils/timelineCalculator';

interface AthleteTimelineViewProps {
  timelineItems: AthleteTimelineItem[];
  onSelectAthlete: (athleteId: string) => void;
  isLoading?: boolean;
}

export const AthleteTimelineView: React.FC<AthleteTimelineViewProps> = ({
  timelineItems,
  onSelectAthlete,
  isLoading = false,
}) => {
  const [periodFilter, setPeriodFilter] = useState<TimelinePeriodFilter>('all');
  const [sortBy, setSortBy] = useState<TimelineSortOption>('next_session');

  // Filtra e ordina
  const processedItems = useMemo(() => {
    const filtered = filterTimelineByPeriod(timelineItems, periodFilter);
    return sortTimelineItems(filtered, sortBy);
  }, [timelineItems, periodFilter, sortBy]);

  // Raggruppa per corsia/categoria
  const lanes = useMemo(() => {
    const groups: Record<TimelineCategory, AthleteTimelineItem[]> = {
      today: [],
      late: [],
      in_progress: [],
      end_of_block: [],
      no_activity: [],
    };

    processedItems.forEach((item) => {
      groups[item.category].push(item);
    });

    return groups;
  }, [processedItems]);

  const laneConfigs: {
    category: TimelineCategory;
    title: string;
    description: string;
    accentColor: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    icon: React.FC<{ className?: string }>;
  }[] = [
    {
      category: 'today',
      title: 'OGGI',
      description: 'Atleti con allenamento completato oggi o sessione odierna',
      accentColor: '#10b981',
      badgeBg: 'bg-emerald-500/15',
      badgeText: 'text-emerald-400',
      badgeBorder: 'border-emerald-500/30',
      icon: Flame,
    },
    {
      category: 'late',
      title: 'IN RITARDO',
      description: 'Ultimo allenamento oltre 4 giorni fa o tabella di marcia interrotta',
      accentColor: '#ef4444',
      badgeBg: 'bg-rose-500/15',
      badgeText: 'text-rose-400',
      badgeBorder: 'border-rose-500/30',
      icon: AlertTriangle,
    },
    {
      category: 'in_progress',
      title: 'IN CORSO',
      description: 'Allenamenti regolari e mesociclo in progressione attiva',
      accentColor: '#38bdf8',
      badgeBg: 'bg-sky-500/15',
      badgeText: 'text-sky-400',
      badgeBorder: 'border-sky-500/30',
      icon: TrendingUp,
    },
    {
      category: 'end_of_block',
      title: 'FINE BLOCCO',
      description: 'Penultima/ultima settimana o avanzamento >= 80% (pronti per revisione)',
      accentColor: '#f59e0b',
      badgeBg: 'bg-amber-500/15',
      badgeText: 'text-amber-400',
      badgeBorder: 'border-amber-500/30',
      icon: Clock,
    },
    {
      category: 'no_activity',
      title: 'SENZA ATTIVITÀ',
      description: 'Scheda assegnata ma nessun allenamento registrato, o programma assente',
      accentColor: '#64748b',
      badgeBg: 'bg-slate-800/70',
      badgeText: 'text-slate-400',
      badgeBorder: 'border-slate-700/60',
      icon: User,
    },
  ];

  const getStatusBadge = (item: AthleteTimelineItem) => {
    switch (item.statusColor) {
      case 'red':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
            <span>{item.statusLabel}</span>
          </span>
        );
      case 'yellow':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Clock className="w-3 h-3 text-amber-400 shrink-0" />
            <span>{item.statusLabel}</span>
          </span>
        );
      case 'emerald':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>{item.statusLabel}</span>
          </span>
        );
      case 'sky':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-sky-500/15 text-sky-300 border border-sky-500/30">
            <TrendingUp className="w-3 h-3 text-sky-400 shrink-0" />
            <span>{item.statusLabel}</span>
          </span>
        );
      case 'slate':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-800 text-slate-300 border border-slate-700">
            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
            <span>{item.statusLabel}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── 1. HEADER TIMELINE: TITOLO, SOTTOTITOLO, FILTRO PERIODO & ORDINAMENTO ─── */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-950/80 border border-slate-800/90 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)]">
                <Clock className="w-4 h-4" />
              </div>
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                Timeline allenamenti
              </h3>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Avanzamento degli atleti ordinato per attività e prossima sessione.
            </p>
          </div>

          {/* Filtri Periodo e Ordinamento */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filtro Periodo */}
            <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-900 border border-slate-800">
              {[
                { id: 'all', label: 'Tutto il blocco' },
                { id: 'today', label: 'Oggi' },
                { id: '7d', label: 'Ultimi 7 giorni' },
                { id: '30d', label: 'Ultimi 30 giorni' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriodFilter(p.id as TimelinePeriodFilter)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    periodFilter === p.id
                      ? 'bg-[var(--color-primary)] text-slate-950 font-black shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Ordinamento */}
            <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] font-bold text-slate-500 uppercase px-2 hidden sm:inline">
                Ordina:
              </span>
              {[
                { id: 'next_session', label: 'Prossima sessione' },
                { id: 'last_workout', label: 'Ultimo allenamento' },
                { id: 'progress', label: 'Avanzamento' },
                { id: 'end_of_block', label: 'Fine blocco' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSortBy(s.id as TimelineSortOption)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    sortBy === s.id
                      ? 'bg-slate-800 text-white font-black border border-slate-700'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. CORSIE TEMPORALI DELLA TIMELINE ─── */}
      {isLoading ? (
        <div className="p-12 text-center bg-slate-950/60 border border-slate-800/80 rounded-3xl">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 animate-pulse">
            <Clock className="w-4 h-4 animate-spin" />
            <span>Verifica in corso…</span>
          </div>
        </div>
      ) : processedItems.length === 0 ? (
        <div className="p-12 text-center bg-slate-950/60 border border-slate-800/80 rounded-3xl text-slate-400 text-xs">
          Nessun atleta corrisponde al periodo o ai criteri selezionati.
        </div>
      ) : (
        <div className="space-y-8">
          {laneConfigs.map((lane) => {
            const laneItems = lanes[lane.category];
            if (laneItems.length === 0) return null;

            const LaneIcon = lane.icon;

            return (
              <div key={lane.category} className="space-y-3">
                {/* Intestazione Sezione Timeline */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: lane.accentColor }}
                    />
                    <span style={{ color: lane.accentColor }} className="flex items-center">
                      <LaneIcon className="w-4 h-4 shrink-0" />
                    </span>
                    <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <span>{lane.title}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black border ${lane.badgeBg} ${lane.badgeText} ${lane.badgeBorder}`}>
                        {laneItems.length}
                      </span>
                    </h4>
                    <span className="text-xs text-slate-500 hidden md:inline">
                      — {lane.description}
                    </span>
                  </div>
                </div>

                {/* Lista Atleti in questa Corsia (Riga orizzontale compatta su desktop) */}
                <div className="space-y-2.5">
                  {laneItems.map((item) => {
                    const initials = item.athleteName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .substring(0, 2)
                      .toUpperCase() || 'AT';

                    return (
                      <div
                        key={item.athleteId}
                        onClick={() => onSelectAthlete(item.athleteId)}
                        className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/90 border border-slate-800/80 hover:border-[var(--color-primary)]/50 transition-all cursor-pointer shadow-lg hover:shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 group"
                      >
                        {/* 1. Profilo Atleta & Scheda */}
                        <div className="flex items-center gap-3 min-w-[220px] shrink-0">
                          <div className="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-sm font-black text-[var(--color-primary)] shrink-0 group-hover:scale-105 transition-transform">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h5 className="text-sm font-black text-white truncate group-hover:text-[var(--color-primary)] transition-colors">
                                {item.athleteName}
                              </h5>
                              {getStatusBadge(item)}
                            </div>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {item.workoutTitle}
                            </p>
                          </div>
                        </div>

                        {/* 2. Informazioni Prossima & Ultima Sessione */}
                        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs flex-1 min-w-0">
                          {/* Prossima sessione */}
                          <div className="min-w-0">
                            <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block">
                              Prossima Sessione
                            </span>
                            <span className="font-bold text-white truncate block mt-0.5">
                              {item.nextSessionLabel}
                            </span>
                          </div>

                          {/* Ultimo allenamento */}
                          <div className="min-w-0">
                            <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block">
                              Ultimo Allenamento
                            </span>
                            <span className="font-bold text-slate-300 truncate block mt-0.5">
                              {item.lastSessionRelative}
                              {item.daysSinceLastWorkout !== null && item.daysSinceLastWorkout > 1 && (
                                <span className="text-[10px] text-slate-500 ml-1">
                                  ({item.daysSinceLastWorkout}gg fa)
                                </span>
                              )}
                            </span>
                          </div>

                          {/* Stima fine blocco */}
                          <div className="min-w-0 col-span-2 sm:col-span-1">
                            <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block">
                              Fine Blocco
                            </span>
                            <span className="font-bold text-slate-300 truncate block mt-0.5">
                              {item.estimatedEndBlock}
                            </span>
                          </div>
                        </div>

                        {/* 3. Avanzamento Mesociclo & Azione */}
                        <div className="flex items-center justify-between lg:justify-end gap-4 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800/60">
                          {/* Barra e Percentuale Avanzamento */}
                          <div className="w-36 sm:w-44 space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-mono">
                              <span className="text-slate-400">Avanzamento</span>
                              <strong className="text-white">
                                {item.completedSessionsCount}/{item.totalPlannedSessions} ({item.progressPercent}%)
                              </strong>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden border border-slate-800/60">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  item.statusColor === 'red'
                                    ? 'bg-rose-500'
                                    : item.statusColor === 'yellow'
                                    ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                                    : 'bg-[var(--color-primary)]'
                                }`}
                                style={{ width: `${Math.min(100, item.progressPercent)}%` }}
                              />
                            </div>
                          </div>

                          {/* Badge "Storico da riallineare" se presente */}
                          {item.needsRealignment && (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 hidden xl:inline" title="L'atleta ha sessioni collegate a una versione precedente della scheda">
                              Storico da riallineare
                            </span>
                          )}

                          {/* Pulsante Apri Atleta */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectAthlete(item.athleteId);
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-200 hover:text-white hover:bg-[var(--color-primary)] hover:text-slate-950 hover:border-[var(--color-primary)] transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm"
                          >
                            <span>Apri atleta</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
