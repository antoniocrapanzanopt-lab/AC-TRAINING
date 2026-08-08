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
  date: string;
  durationMinutes: number;
  rpe: number;
  notes?: string;
  exercises: {
    name: string;
    sets: { setNumber: number; reps: number; weightKg: number }[];
  }[];
}

const buildDemoCompletedSessions = (): WorkoutSessionDemo[] => {
  const today = new Date();
  const d1 = new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const d2 = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const d3 = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return [
    {
      id: 'sess-1',
      workoutTitle: 'Ipertrofia Petto & Tricipiti',
      date: d1,
      durationMinutes: 65,
      rpe: 8,
      notes: 'Ottima sensazione sulla panca piana. Aumentato il carico a 85kg.',
      exercises: [
        {
          name: 'Panca Piana Bilanciere',
          sets: [
            { setNumber: 1, reps: 10, weightKg: 80 },
            { setNumber: 2, reps: 10, weightKg: 80 },
            { setNumber: 3, reps: 8, weightKg: 85 },
            { setNumber: 4, reps: 8, weightKg: 85 },
          ],
        },
        {
          name: 'Spinte Manubri Inclinata',
          sets: [
            { setNumber: 1, reps: 12, weightKg: 28 },
            { setNumber: 2, reps: 10, weightKg: 30 },
            { setNumber: 3, reps: 10, weightKg: 30 },
          ],
        },
        {
          name: 'Pushdown Cavo Alto Tricipiti',
          sets: [
            { setNumber: 1, reps: 12, weightKg: 35 },
            { setNumber: 2, reps: 12, weightKg: 40 },
            { setNumber: 3, reps: 10, weightKg: 40 },
          ],
        },
      ],
    },
    {
      id: 'sess-2',
      workoutTitle: 'Gambe & Addome Power',
      date: d2,
      durationMinutes: 75,
      rpe: 9,
      notes: 'Squat impegnativo ma eseguito con buona profondità.',
      exercises: [
        {
          name: 'Back Squat Bilanciere',
          sets: [
            { setNumber: 1, reps: 8, weightKg: 100 },
            { setNumber: 2, reps: 8, weightKg: 110 },
            { setNumber: 3, reps: 6, weightKg: 115 },
          ],
        },
        {
          name: 'Leg Press 45°',
          sets: [
            { setNumber: 1, reps: 12, weightKg: 180 },
            { setNumber: 2, reps: 12, weightKg: 200 },
            { setNumber: 3, reps: 10, weightKg: 220 },
          ],
        },
      ],
    },
    {
      id: 'sess-3',
      workoutTitle: 'Dorso & Bicipiti Focus',
      date: d3,
      durationMinutes: 60,
      rpe: 7.5,
      notes: 'Buona connessione mente-muscolo nei rematori.',
      exercises: [
        {
          name: 'Trazioni alla Sbarra',
          sets: [
            { setNumber: 1, reps: 10, weightKg: 0 },
            { setNumber: 2, reps: 8, weightKg: 5 },
            { setNumber: 3, reps: 8, weightKg: 5 },
          ],
        },
        {
          name: 'Rematore Bilanciere',
          sets: [
            { setNumber: 1, reps: 10, weightKg: 65 },
            { setNumber: 2, reps: 10, weightKg: 70 },
            { setNumber: 3, reps: 8, weightKg: 75 },
          ],
        },
      ],
    },
  ];
};

export const ActivityTab: React.FC<ActivityTabProps> = ({ athleteName }) => {
  const [completedSessions] = useState<WorkoutSessionDemo[]>(buildDemoCompletedSessions());
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>('sess-1');

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
      streakWeeks: 4,
    };
  }, [completedSessions]);

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
                      <h5 className="text-sm font-black text-white">{session.workoutTitle}</h5>
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
