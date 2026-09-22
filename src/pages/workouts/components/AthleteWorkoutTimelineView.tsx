import React from 'react';
import {
  CheckCircle2,
  Clock,
  Activity,
  Zap,
  PlayCircle,
  AlertCircle,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { Athlete } from '../../../types';
import { AthleteAssignedWorkout, WorkoutTemplate } from '../../../types/workout';
import { AthleteProgressDetail } from '../hooks/useAthletesWorkoutProgress';

export interface AthleteFolderItem {
  athlete: Athlete;
  activeAssignment?: AthleteAssignedWorkout;
  activeWorkout?: WorkoutTemplate;
  totalWorkouts: number;
  hasActiveWorkout: boolean;
  allAssignments: AthleteAssignedWorkout[];
}

interface AthleteWorkoutTimelineViewProps {
  athleteFolders: AthleteFolderItem[];
  progressMap: Map<string, AthleteProgressDetail>;
  onSelectAthlete: (athleteId: string) => void;
  onAssignWorkout: (athleteId: string) => void;
  onRetryProgress?: () => void;
}

interface TimelineCategoryDef {
  id: string;
  title: string;
  subtitle: string;
  badgeClass: string;
  dotClass: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TIMELINE_CATEGORIES: TimelineCategoryDef[] = [
  {
    id: 'completed',
    title: '1. Programma completato o quasi completato',
    subtitle: 'Atleti che hanno terminato il blocco e necessitano di nuovo programma o test massimali',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    dotClass: 'bg-emerald-400 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]',
    icon: CheckCircle2,
  },
  {
    id: 'near_end',
    title: '2. Fine programma vicina',
    subtitle: 'Atleti nella penultima o ultima settimana di programmazione (75–99%)',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    dotClass: 'bg-amber-400 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]',
    icon: Clock,
  },
  {
    id: 'in_progress',
    title: '3. Programma in corso',
    subtitle: 'Atleti con allenamento costante e andamento regolare (25–74%)',
    badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    dotClass: 'bg-sky-400 border-sky-500 shadow-[0_0_10px_rgba(56,189,248,0.5)]',
    icon: Activity,
  },
  {
    id: 'just_started',
    title: '4. Programma appena iniziato',
    subtitle: 'Prime sessioni svolte nel nuovo blocco (1–24%)',
    badgeClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    dotClass: 'bg-indigo-400 border-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]',
    icon: Zap,
  },
  {
    id: 'not_started',
    title: '5. Nessun allenamento',
    subtitle: 'Scheda assegnata ma nessun workout completato finora',
    badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
    dotClass: 'bg-slate-500 border-slate-600',
    icon: PlayCircle,
  },
  {
    id: 'no_workout',
    title: '6. Nessuna scheda',
    subtitle: 'Atleti attivi senza scheda di allenamento associata',
    badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    dotClass: 'bg-rose-400 border-rose-500',
    icon: AlertCircle,
  },
];

export const AthleteWorkoutTimelineView: React.FC<AthleteWorkoutTimelineViewProps> = ({
  athleteFolders,
  progressMap,
  onSelectAthlete,
  onAssignWorkout,
}) => {
  // Raggruppa gli atleti nelle 6 categorie
  const groupedAthletes = React.useMemo(() => {
    const groups: Record<string, AthleteFolderItem[]> = {
      completed: [],
      near_end: [],
      in_progress: [],
      just_started: [],
      not_started: [],
      no_workout: [],
    };

    athleteFolders.forEach((item) => {
      if (!item.hasActiveWorkout) {
        groups.no_workout.push(item);
        return;
      }

      const progress = progressMap.get(item.athlete.id);
      const status = progress?.programStatus || 'not_started';

      if (status === 'completed') {
        groups.completed.push(item);
      } else if (status === 'near_end') {
        groups.near_end.push(item);
      } else if (status === 'in_progress') {
        groups.in_progress.push(item);
      } else if (status === 'just_started') {
        groups.just_started.push(item);
      } else if (status === 'not_started') {
        groups.not_started.push(item);
      } else {
        groups.no_workout.push(item);
      }
    });

    return groups;
  }, [athleteFolders, progressMap]);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {TIMELINE_CATEGORIES.map((cat) => {
        const items = groupedAthletes[cat.id] || [];
        const Icon = cat.icon;

        if (items.length === 0) return null;

        return (
          <div key={cat.id} className="relative pl-6 sm:pl-8">
            {/* Linea verticale timeline */}
            <div className="absolute left-2.5 sm:left-3 top-4 bottom-0 w-0.5 bg-slate-800" />

            {/* Nodo timeline intestazione categoria */}
            <div className="absolute left-0 top-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-slate-950 border-2 border-slate-700 flex items-center justify-center z-10">
              <span className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${cat.dotClass}`} />
            </div>

            {/* Intestazione Categoria */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-3 border-b border-slate-800/80 mb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <Icon className="w-4 h-4 text-amber-400" />
                    <span>{cat.title}</span>
                  </h3>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${cat.badgeClass}`}>
                    {items.length} {items.length === 1 ? 'atleta' : 'atleti'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{cat.subtitle}</p>
              </div>
            </div>

            {/* Elementi Atleti nella Categoria */}
            <div className="space-y-2.5">
              {items.map((item) => {
                const ath = item.athlete;
                const progress = progressMap.get(ath.id);
                const hasActive = item.hasActiveWorkout;
                const completedSessions = progress?.completedSessions ?? 0;
                const plannedSessions = progress?.plannedSessions ?? 0;
                const progressPercentage = progress?.progressPercentage ?? 0;
                const lastWorkoutLabel = progress?.lastWorkoutLabel ?? 'Nessuno';
                const nextSessionLabel = progress?.nextSessionLabel ?? 'Non definita';
                const daysSinceLast: number | null = progress?.daysSinceLastWorkout ?? null;
                const totalWeeks = item.activeWorkout?.total_weeks || 4;

                // Testo principale di avanzamento
                const ratioLabel = plannedSessions > 0 ? `${completedSessions} / ${plannedSessions}` : `${completedSessions}`;
                let progressText = `${ratioLabel} completati · ${progressPercentage}%`;
                if (!hasActive) {
                  progressText = 'Nessuna scheda attiva';
                } else if (completedSessions === 0) {
                  progressText = `${ratioLabel} completati · Non iniziato`;
                } else if (progress?.programStatus === 'completed') {
                  // 'completed' SOLO quando completedSessions === plannedSessions
                  progressText = `${ratioLabel} completati · Programma completato`;
                } else if (progress?.programStatus === 'data_error') {
                  progressText = `${ratioLabel} completati · Dati da verificare`;
                }

                // Colore barra — basato su programStatus, NON su progressPercentage >= 100
                let barColor = 'bg-slate-700';
                if (hasActive && completedSessions > 0) {
                  if (progress?.programStatus === 'completed') {
                    barColor = 'bg-gradient-to-r from-emerald-500 to-emerald-400';
                  } else if (progress?.programStatus === 'data_error') {
                    barColor = 'bg-gradient-to-r from-orange-500 to-amber-400';
                  } else if (daysSinceLast !== null && daysSinceLast >= 7) {
                    barColor = 'bg-gradient-to-r from-rose-500 to-rose-400';
                  } else if (progressPercentage >= 75 || progress?.programStatus === 'near_end') {
                    barColor = 'bg-gradient-to-r from-amber-400 to-[var(--color-primary)]';
                  } else if (progressPercentage >= 25) {
                    barColor = 'bg-gradient-to-r from-sky-400 to-emerald-400';
                  } else {
                    barColor = 'bg-gradient-to-r from-sky-400 to-blue-500';
                  }
                }

                return (
                  <div
                    key={ath.id}
                    onClick={() => hasActive ? onSelectAthlete(ath.id) : onAssignWorkout(ath.id)}
                    className="p-4 rounded-2xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-[var(--color-primary)]/50 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer group shadow-sm hover:shadow-lg"
                  >
                    {/* Atleta e Scheda */}
                    <div className="flex items-center gap-3.5 min-w-0 lg:w-1/3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-amber-600 text-slate-950 font-black text-sm flex items-center justify-center shrink-0 shadow group-hover:scale-105 transition-transform">
                        {ath.firstName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-white truncate group-hover:text-[var(--color-primary)] transition-colors">
                            {ath.firstName} {ath.lastName}
                          </h4>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                            hasActive
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                          }`}>
                            {hasActive ? 'Attivo' : 'Senza scheda'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {item.activeWorkout?.title || 'Nessuna scheda assegnata'}
                          {hasActive && (
                            <span className="text-slate-500 ml-1.5 font-medium">
                              • {totalWeeks} {totalWeeks === 1 ? 'settimana' : 'settimane'}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Avanzamento e Dettagli Allenamenti */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center justify-between text-xs gap-2">
                        <span className="font-mono font-bold text-white truncate">
                          {progressText}
                        </span>
                        {hasActive && (
                          <span className="text-[10px] font-medium text-slate-400 shrink-0">
                            {completedSessions}/{plannedSessions} previsti
                          </span>
                        )}
                      </div>

                      {/* Barra di avanzamento */}
                      {hasActive ? (
                        <div className="w-full h-2 bg-slate-800/90 rounded-full overflow-hidden p-0.5 border border-slate-700/40">
                          <div
                            className={`h-full transition-all duration-500 rounded-full ${barColor}`}
                            style={{ width: `${Math.min(100, Math.max(0, progressPercentage))}%` }}
                          />
                        </div>
                      ) : (
                        <div className="w-full h-1.5 bg-slate-800/60 rounded-full" />
                      )}

                      {/* Metriche Temporali: Ultimo allenamento, Prossimo, Giorni di inattività */}
                      {hasActive && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] text-slate-400 pt-0.5">
                          <div className="truncate">
                            <span className="text-slate-500 font-medium">Ultimo: </span>
                            <span className="text-slate-200 font-bold">{lastWorkoutLabel}</span>
                          </div>
                          <div className="truncate">
                            <span className="text-slate-500 font-medium">Prossimo: </span>
                            <span className="text-[var(--color-primary)] font-bold">{nextSessionLabel}</span>
                          </div>
                          <div className="truncate sm:text-right">
                            <span className="text-slate-500 font-medium">Attesa: </span>
                            <span className={`font-bold ${daysSinceLast !== null && daysSinceLast >= 7 ? 'text-rose-400 font-black' : 'text-slate-300'}`}>
                              {daysSinceLast === null ? 'Nessun dato' : daysSinceLast === 0 ? 'Oggi' : `${daysSinceLast} giorni fa`}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottone Azione */}
                    <div className="flex items-center justify-end shrink-0">
                      {hasActive ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectAthlete(ath.id);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-slate-800 group-hover:bg-[var(--color-primary)] text-slate-300 group-hover:text-slate-950 font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <span>Apri</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAssignWorkout(ath.id);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400 text-amber-300 hover:text-slate-950 font-black text-xs transition-all flex items-center gap-1.5 border border-amber-400/30 cursor-pointer shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Assegna scheda</span>
                        </button>
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
};
