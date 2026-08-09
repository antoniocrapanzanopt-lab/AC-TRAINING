import React, { useState, useMemo } from 'react';
import {
  Activity,
  Dumbbell,
  Flame,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ActivityTabProps {
  athleteId: string;
  athleteName: string;
}

interface WorkoutSessionDemo {
  id: string;
  workoutTitle: string;
  weekNumber?: number;
  dayName?: string;
  date: string;
  durationMinutes: number;
  rpe: number;
  notes?: string;
  exercises: {
    name: string;
    sets: { setNumber: number; reps: number; weightKg: number }[];
    notes?: string;
  }[];
}

import { supabase } from '../../lib/supabase';

export const ActivityTab: React.FC<ActivityTabProps> = ({ athleteId, athleteName }) => {
  const [completedSessions, setCompletedSessions] = useState<WorkoutSessionDemo[]>([]);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const fetchSessions = async () => {
      setLoading(true);
      try {
        // Fetch scheda attiva per l'atleta come fallback se il titolo è placeholder (es: "aaaa")
        const { data: activeAssignments } = await supabase
          .from('athlete_assigned_workouts')
          .select('workout_id, workouts ( title )')
          .eq('athlete_id', athleteId)
          .eq('is_active', true);

        const activeWorkoutTitle = (activeAssignments?.[0]?.workouts as unknown as {title: string} | null)?.title;

        const { data, error } = await supabase
          .from('workout_sessions')
          .select(`
            id,
            start_time,
            end_time,
            rpe,
            notes,
            workout_id,
            workouts ( title ),
            exercise_logs (
              set_number,
              reps_completed,
              weight_kg,
              notes,
              workout_exercises ( name, week_number, day_name )
            )
          `)
          .eq('athlete_id', athleteId)
          .not('end_time', 'is', null)
          .order('end_time', { ascending: false });

        if (error) throw error;

        if (data) {
          const mapped: WorkoutSessionDemo[] = data.map((session: any) => {
            // Calcolo durata
            const start = new Date(session.start_time);
            const end = new Date(session.end_time);
            const diffMs = end.getTime() - start.getTime();
            const durationMinutes = Math.max(1, Math.round(diffMs / 60000));

            // Titolo Scheda con fallback se placeholder
            const rawTitle = session.workouts?.title;
            const isPlaceholder = !rawTitle || rawTitle.trim() === '' || rawTitle.toLowerCase() === 'aaaa' || rawTitle.toLowerCase() === 'allenamento' || rawTitle.toLowerCase() === 'allenamento senza nome';
            const finalTitle = isPlaceholder ? (activeWorkoutTitle || 'Scheda Personalizzata') : rawTitle;

            // Raggruppiamo i log per nome esercizio e troviamo settimana/giorno
            const exMap = new Map<string, { sets: any[]; notesSet: Set<string> }>();
            const logs = session.exercise_logs || [];
            let detectedWeek: number | undefined = undefined;
            let detectedDay: string | undefined = undefined;
            
            logs.forEach((log: any) => {
              if (log.workout_exercises?.week_number && !detectedWeek) {
                detectedWeek = log.workout_exercises.week_number;
              }
              if (log.workout_exercises?.day_name && !detectedDay) {
                detectedDay = log.workout_exercises.day_name;
              }

              const exName = log.workout_exercises?.name || 'Esercizio Sconosciuto';
              if (!exMap.has(exName)) {
                exMap.set(exName, { sets: [], notesSet: new Set<string>() });
              }
              const entry = exMap.get(exName)!;
              entry.sets.push({
                setNumber: log.set_number,
                reps: log.reps_completed || 0,
                weightKg: log.weight_kg || 0
              });
              if (log.notes) {
                entry.notesSet.add(log.notes);
              }
            });

            const exercises = Array.from(exMap.entries()).map(([name, { sets, notesSet }]) => {
              sets.sort((a, b) => a.setNumber - b.setNumber);
              const notes = Array.from(notesSet).join(' | ');
              return { name, sets, notes };
            });

            return {
              id: session.id,
              workoutTitle: finalTitle,
              weekNumber: detectedWeek || 1,
              dayName: detectedDay || 'Giorno A',
              date: session.end_time.slice(0, 10),
              durationMinutes,
              rpe: session.rpe || 0,
              notes: session.notes,
              exercises
            };
          });
          
          setCompletedSessions(mapped);
          if (mapped.length > 0) {
            setExpandedSessionId(mapped[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching workout sessions:', err);
      } finally {
        setLoading(false);
      }
    };

    if (athleteId) {
      fetchSessions();
    }
  }, [athleteId]);

  // Calcolo KPI di Rendimento
  const metrics = useMemo(() => {
    const totalSessions = completedSessions.length;
    const totalMinutes = completedSessions.reduce((acc, s) => acc + s.durationMinutes, 0);
    const avgRpe = totalSessions > 0 ? (completedSessions.reduce((acc, s) => acc + s.rpe, 0) / totalSessions).toFixed(1) : '0.0';

    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;

    return {
      totalSessions,
      totalDurationFormatted: `${hours}h ${mins}m`,
      avgRpe,
      streakWeeks: totalSessions > 0 ? 1 : 0, // Placeholder logico
    };
  }, [completedSessions]);

  if (loading) {
    return (
      <div className="flex justify-center p-10 text-[var(--color-primary)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Sezione */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-[var(--color-primary)]" /> Registro Attività & Allenamenti Svolti
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitora le sessioni eseguite, la frequenza ed i carichi sollevati per {athleteName}.
          </p>
        </div>
      </div>

      {/* KPI Cards di Rendimento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Sessioni Completate */}
        <div className="p-4 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sessioni Mese</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{metrics.totalSessions}</span>
            <span className="text-xs text-emerald-400 font-bold flex items-center gap-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> completate
            </span>
          </div>
        </div>

        {/* 2. Tempo Totale in Allenamento */}
        <div className="p-4 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tempo Allenato</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-400">{metrics.totalDurationFormatted}</span>
            <span className="text-xs text-slate-500 font-semibold">totali</span>
          </div>
        </div>

        {/* 3. Intensità RPE Media */}
        <div className="p-4 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Intensità RPE Media</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-sky-400">{metrics.avgRpe}</span>
            <span className="text-xs text-slate-500 font-semibold">su 10</span>
          </div>
        </div>

        {/* 4. Streak Costanza */}
        <div className="p-4 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Costanza / Streak</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-orange-400 flex items-center gap-1">
              <Flame className="w-5 h-5 text-orange-500" /> {metrics.streakWeeks} sett.
            </span>
          </div>
        </div>
      </div>

      {/* Registro Sessioni & Carichi */}
      <div className="p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-[var(--color-primary)]" /> Cronologia Schede Eseguite dall'Atleta
            </h4>
            <p className="text-xs text-slate-400">Dettaglio per esercizio con serie, ripetizioni e kg reali sollevati</p>
          </div>
          <span className="text-xs font-bold text-slate-400 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
            {completedSessions.length} sessioni registrate
          </span>
        </div>

        <div className="space-y-3">
          {completedSessions.map(session => {
            const isExpanded = expandedSessionId === session.id;

            return (
              <div
                key={session.id}
                className="p-4 rounded-xl bg-slate-900 border border-slate-800 transition-all space-y-3"
              >
                <div
                  onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)] shrink-0">
                      <Dumbbell className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h5 className="text-sm font-black text-white">{session.workoutTitle}</h5>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30">
                          Settimana {session.weekNumber || 1}{session.dayName ? ` • ${session.dayName}` : ''}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">
                        Eseguito il {new Date(session.date).toLocaleDateString('it-IT')} • Durata: {session.durationMinutes} min
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400">
                      RPE: {session.rpe}/10
                    </span>
                    <button className="p-1 text-slate-400 hover:text-white">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Dettaglio Esercizi (Espandibile) */}
                {isExpanded && (
                  <div className="pt-3 border-t border-slate-800/80 space-y-3">
                    {session.notes && (
                      <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-300">
                        <strong className="text-amber-400">Note Atleta:</strong> "{session.notes}"
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {session.exercises.map((ex, i) => (
                        <div key={i} className="p-3 rounded-lg bg-slate-950/40 border border-slate-800 space-y-2">
                          <span className="text-xs font-bold text-white block">{ex.name}</span>
                          <div className="flex flex-wrap gap-1.5">
                            {ex.sets.map((set, setIdx) => (
                              <span
                                key={setIdx}
                                className="text-[11px] font-semibold px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300"
                              >
                                Set {set.setNumber}: <strong className="text-amber-400">{set.reps} reps</strong> @ {set.weightKg}kg
                              </span>
                            ))}
                          </div>
                          {ex.notes && (
                            <div className="mt-1.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 font-medium leading-relaxed">
                              💬 <strong>Feedback / Note:</strong> {ex.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
