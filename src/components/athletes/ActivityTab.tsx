import React, { useState, useMemo, useEffect } from 'react';
import {
  Activity,
  Dumbbell,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Calendar,
  Filter,
  ShieldAlert,
  ShieldCheck,
  AlertCircle,
  XCircle,
  Send,
  Sparkles,
  TrendingUp,
  Clock,
  Layers,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useWorkouts } from '../../context/WorkoutsContext';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { isPainFeedback } from '../../utils/painAnalysis';

interface ActivityTabProps {
  athleteId: string;
  athleteName: string;
}

export interface WorkoutExerciseSetLog {
  setNumber: number;
  reps: number;
  weightKg: number;
  rpe?: string;
}

export interface WorkoutExerciseLogGroup {
  name: string;
  sets: WorkoutExerciseSetLog[];
  notes?: string;
  totalVolumeKg: number;
}

export interface DetailedWorkoutSession {
  id: string;
  workoutId?: string;
  workoutTitle: string;
  weekNumber: number;
  totalWeeks: number;
  dayName: string;
  startTime: string;
  endTime: string;
  dateFormatted: string;
  durationMinutes: number;
  rpe: number;
  notes?: string;
  totalVolumeKg: number;
  hasPainAlert: boolean;
  painAlertReason?: string;
  isHighRpe: boolean;
  status?: 'completed' | 'skipped';
  skipReason?: string;
  skipNotes?: string;
  coachJustified?: boolean | null;
  coachFeedback?: string;
  exercises: WorkoutExerciseLogGroup[];
}

export const ActivityTab: React.FC<ActivityTabProps> = ({ athleteId, athleteName }) => {
  const { allAssignedWorkouts } = useWorkouts();
  const { setActiveTab: setAppActiveTab } = useApp();
  const { showSuccess, showError } = useToast();

  const [completedSessions, setCompletedSessions] = useState<DetailedWorkoutSession[]>([]);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, string>>({});
  const [savingEvaluationId, setSavingEvaluationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeWorkoutDaysCount, setActiveWorkoutDaysCount] = useState<number>(3);

  // Filtri
  const [periodFilter, setPeriodFilter] = useState<'all' | '30d' | '90d'>('all');
  const [programFilter, setProgramFilter] = useState<string>('all');
  const [alertFilter, setAlertFilter] = useState<'all' | 'pain_only' | 'high_rpe'>('all');

  const isPainText = (text: string): boolean => {
    return isPainFeedback(text);
  };

  // Scheda Attiva Assegnata
  const assignedWorkout = useMemo(() => {
    return allAssignedWorkouts.find((a) => a.athlete_id === athleteId && a.is_active);
  }, [allAssignedWorkouts, athleteId]);

  const activeWorkoutTitle = assignedWorkout?.workout?.title || 'Scheda Personalizzata';
  const totalWeeks = assignedWorkout?.workout?.total_weeks || 4;

  useEffect(() => {
    const fetchSessions = async () => {
      setLoading(true);
      try {
        // 1. Recupera giorni unici del programma attivo se presente
        if (assignedWorkout?.workout_id) {
          const { data: exData } = await supabase
            .from('workout_exercises')
            .select('day_name')
            .eq('workout_id', assignedWorkout.workout_id);

          if (exData && exData.length > 0) {
            const uniqueDays = new Set(exData.map((e: any) => e.day_name).filter(Boolean));
            if (uniqueDays.size > 0) {
              setActiveWorkoutDaysCount(uniqueDays.size);
            }
          }
        }

        // 2. Recupera sessioni completate dell'atleta
        const primarySessionsRes = await supabase
          .from('workout_sessions')
          .select(`
            id,
            start_time,
            end_time,
            rpe,
            notes,
            workout_id,
            status,
            skip_reason,
            skip_notes,
            coach_justified,
            coach_feedback,
            week_number,
            day_name,
            workouts ( id, title, total_weeks )
          `)
          .eq('athlete_id', athleteId)
          .not('end_time', 'is', null)
          .order('start_time', { ascending: false });

        let rawSessions: Record<string, unknown>[] = [];

        if (primarySessionsRes.error) {
          const fallbackSessionsRes = await supabase
            .from('workout_sessions')
            .select(`
              id,
              start_time,
              end_time,
              rpe,
              notes,
              workout_id,
              status,
              week_number,
              day_name,
              workouts ( id, title, total_weeks )
            `)
            .eq('athlete_id', athleteId)
            .not('end_time', 'is', null)
            .order('start_time', { ascending: false });

          if (fallbackSessionsRes.error) throw fallbackSessionsRes.error;
          rawSessions = (fallbackSessionsRes.data || []) as Record<string, unknown>[];
        } else {
          rawSessions = (primarySessionsRes.data || []) as Record<string, unknown>[];
        }

        // Recupero logs per queste sessioni
        const sessionIds = (rawSessions || []).map((s) => String(s.id));
        const workoutIds = Array.from(new Set((rawSessions || []).map((s) => s.workout_id).filter(Boolean))) as string[];
        const logsBySession = new Map<string, any[]>();
        const exercisesById = new Map<string, { name: string; day_name?: string; week_number?: number }>();

        if (workoutIds.length > 0) {
          const { data: weData } = await supabase
            .from('workout_exercises')
            .select('id, workout_id, name, day_name, week_number')
            .in('workout_id', workoutIds);

          if (weData) {
            weData.forEach((we: any) => {
              exercisesById.set(we.id, {
                name: we.name,
                day_name: we.day_name,
                week_number: we.week_number,
              });
            });
          }
        }

        if (sessionIds.length > 0) {
          const { data: logsData } = await supabase
            .from('exercise_logs')
            .select('id, session_id, exercise_id, set_number, reps_completed, weight_kg, notes')
            .in('session_id', sessionIds);

          if (logsData && logsData.length > 0) {
            const missingIds = Array.from(
              new Set(logsData.map((l: any) => l.exercise_id).filter((id: string) => id && !exercisesById.has(id)))
            );

            if (missingIds.length > 0) {
              const { data: extraWe } = await supabase
                .from('workout_exercises')
                .select('id, workout_id, name, day_name, week_number')
                .in('id', missingIds);

              if (extraWe) {
                extraWe.forEach((we: any) => {
                  exercisesById.set(we.id, {
                    name: we.name,
                    day_name: we.day_name,
                    week_number: we.week_number,
                  });
                });
              }
            }

            logsData.forEach((l: any) => {
              if (!logsBySession.has(l.session_id)) {
                logsBySession.set(l.session_id, []);
              }
              logsBySession.get(l.session_id)!.push(l);
            });
          }
        }

        // Unione backup locale
        try {
          const localCompletedLogs = JSON.parse(localStorage.getItem('builder_completed_session_logs') || '{}');
          (rawSessions || []).forEach((s: any) => {
            if ((!logsBySession.has(s.id) || logsBySession.get(s.id)!.length === 0) && localCompletedLogs[s.id]) {
              logsBySession.set(s.id, localCompletedLogs[s.id]);
            }
          });
        } catch (_) {}

        if (rawSessions) {
          const chronoSorted = [...rawSessions].sort(
            (a, b) =>
              new Date(String(a.end_time || a.start_time || '')).getTime() -
              new Date(String(b.end_time || b.start_time || '')).getTime()
          );

          const daysPerWeek = activeWorkoutDaysCount || 3;

          const mapped: DetailedWorkoutSession[] = chronoSorted.map((session: any, idx: number) => {
            const start = new Date(session.start_time || session.end_time || new Date().toISOString());
            const end = new Date(session.end_time || session.start_time || new Date().toISOString());
            const diffMs = Math.max(0, end.getTime() - start.getTime());
            const durationMinutes = Math.max(1, Math.round(diffMs / 60000));

            const rawTitle = session.workouts?.title;
            const isPlaceholder =
              !rawTitle ||
              rawTitle.trim() === '' ||
              rawTitle.toLowerCase() === 'aaaa' ||
              rawTitle.toLowerCase() === 'allenamento' ||
              rawTitle.toLowerCase() === 'allenamento senza nome';
            const finalTitle = isPlaceholder ? activeWorkoutTitle : rawTitle;
            const sessionTotalWeeks = session.workouts?.total_weeks || totalWeeks;

            // Raggruppiamo i log per nome esercizio e calcoliamo il volume
            const exMap = new Map<string, { sets: WorkoutExerciseSetLog[]; notesSet: Set<string> }>();
            const logs = logsBySession.get(session.id) || [];
            let detectedWeek: number | undefined = undefined;
            let detectedDay: string | undefined = undefined;
            let sessionVolumeKg = 0;
            let hasPainInLogs = false;
            const painNotesList: string[] = [];

            logs.forEach((log: any) => {
              if (log.workout_exercises?.week_number && !detectedWeek) {
                detectedWeek = log.workout_exercises.week_number;
              }
              if (log.workout_exercises?.day_name && !detectedDay) {
                detectedDay = log.workout_exercises.day_name;
              }

              const exName = log.workout_exercises?.name || 'Esercizio';
              if (!exMap.has(exName)) {
                exMap.set(exName, { sets: [], notesSet: new Set<string>() });
              }
              const entry = exMap.get(exName)!;

              const reps = Number(log.reps_completed) || 0;
              const weight = Number(log.weight_kg) || 0;
              sessionVolumeKg += reps * weight;

              // Estrazione RPE se presente
              let extractedRpe: string | undefined = undefined;
              if (log.notes && log.notes.includes('RPE:')) {
                const match = log.notes.match(/RPE:\s*([\d.]+)/i);
                if (match) extractedRpe = match[1];
              }

              entry.sets.push({
                setNumber: Number(log.set_number) || entry.sets.length + 1,
                reps,
                weightKg: weight,
                rpe: extractedRpe,
              });

              if (log.notes) {
                const cleanNote = log.notes.replace(/RPE:\s*[\d.]+\s*\|\s*/i, '').replace(/Feedback:\s*/i, '').trim();
                if (cleanNote) {
                  entry.notesSet.add(cleanNote);
                }
                if (isPainText(log.notes)) {
                  hasPainInLogs = true;
                  painNotesList.push(`${exName}: "${cleanNote || log.notes}"`);
                }
              }
            });

            const dayLetters = ['Giorno A', 'Giorno B', 'Giorno C', 'Giorno D', 'Giorno E'];

            const exercises: WorkoutExerciseLogGroup[] = Array.from(exMap.entries()).map(
              ([name, { sets, notesSet }]) => {
                sets.sort((a, b) => a.setNumber - b.setNumber);
                const notes = Array.from(notesSet).join(' | ');
                const totalVolumeKg = sets.reduce((sum, s) => sum + s.reps * s.weightKg, 0);
                return { name, sets, notes, totalVolumeKg };
              }
            );

            // Controllo alert su questionario di fine workout
            const hasPainInSessionNotes = isPainText(session.notes || '');
            if (hasPainInSessionNotes && session.notes) {
              painNotesList.push(`Questionario: "${session.notes}"`);
            }

            const isSkipped = session.status === 'skipped';
            const hasPainAlert = !isSkipped && (hasPainInLogs || hasPainInSessionNotes);
            const rpeVal = Number(session.rpe) || 0;
            const isHighRpe = !isSkipped && rpeVal >= 8.5;

            const computedWeek = session.week_number || detectedWeek || Math.min(sessionTotalWeeks, Math.floor(idx / daysPerWeek) + 1);
            const computedDay = session.day_name || detectedDay || dayLetters[idx % daysPerWeek] || `Seduta ${(idx % daysPerWeek) + 1}`;

            return {
              id: session.id,
              workoutId: session.workout_id || session.workouts?.id,
              workoutTitle: finalTitle,
              weekNumber: computedWeek,
              totalWeeks: sessionTotalWeeks,
              dayName: computedDay,
              startTime: session.start_time,
              endTime: session.end_time,
              dateFormatted: new Date(session.end_time).toLocaleDateString('it-IT', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              }),
              durationMinutes: isSkipped ? 0 : durationMinutes,
              rpe: rpeVal,
              notes: session.notes,
              totalVolumeKg: isSkipped ? 0 : sessionVolumeKg,
              hasPainAlert,
              painAlertReason: painNotesList.join(' • '),
              isHighRpe,
              status: isSkipped ? 'skipped' : 'completed',
              skipReason: session.skip_reason,
              skipNotes: session.skip_notes,
              coachJustified: session.coach_justified,
              coachFeedback: session.coach_feedback,
              exercises,
            };
          });

          // Riordiniamo dalla più recente alla più vecchia per il feed
          mapped.reverse();
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
  }, [athleteId, allAssignedWorkouts, assignedWorkout, activeWorkoutTitle, totalWeeks, activeWorkoutDaysCount]);

  const handleEvaluateSkip = async (sessionId: string, isJustified: boolean, feedbackText?: string) => {
    setSavingEvaluationId(sessionId);
    try {
      const updatePayload: Record<string, any> = {
        coach_justified: isJustified,
      };
      if (feedbackText !== undefined) {
        updatePayload.coach_feedback = feedbackText.trim() || null;
      }

      const { error } = await supabase
        .from('workout_sessions')
        .update(updatePayload)
        .eq('id', sessionId);

      if (error) throw error;

      setCompletedSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                coachJustified: isJustified,
                coachFeedback: feedbackText !== undefined ? feedbackText.trim() : s.coachFeedback,
              }
            : s
        )
      );

      showSuccess(
        isJustified ? 'Assenza Giustificata' : 'Penalità Applicata',
        isJustified
          ? 'Nessuna penalità applicata al punteggio dell\'atleta.'
          : 'Penalità applicata all\'aderenza dell\'atleta.'
      );
    } catch (err: any) {
      console.error('Errore valutazione salto:', err);
      showError('Errore', 'Impossibile salvare la valutazione.');
    } finally {
      setSavingEvaluationId(null);
    }
  };

  // Calcolo avanzamento Programma Attivo (Schede fatte vs rimanenti)
  const activeProgramProgress = useMemo(() => {
    if (!assignedWorkout) return null;

    const daysPerWeek = activeWorkoutDaysCount || 3;
    const totalPlannedSessions = totalWeeks * daysPerWeek;

    // Sessioni completate per questa scheda attiva
    const completedForThisWorkout = completedSessions.filter(
      (s) => (s.workoutId === assignedWorkout.workout_id || s.workoutTitle === activeWorkoutTitle) && s.status !== 'skipped'
    ).length;

    const remainingSessions = Math.max(0, totalPlannedSessions - completedForThisWorkout);
    const progressPercent = Math.min(
      100,
      Math.round((completedForThisWorkout / Math.max(1, totalPlannedSessions)) * 100)
    );
    const currentWeekEstimated = Math.min(
      totalWeeks,
      Math.floor(completedForThisWorkout / daysPerWeek) + 1
    );

    return {
      title: activeWorkoutTitle,
      totalWeeks,
      daysPerWeek,
      totalPlannedSessions,
      completedSessionsCount: completedForThisWorkout,
      remainingSessions,
      progressPercent,
      currentWeekEstimated,
    };
  }, [assignedWorkout, activeWorkoutTitle, totalWeeks, activeWorkoutDaysCount, completedSessions]);

  // Lista Programmi disponibili per il filtro
  const availablePrograms = useMemo(() => {
    const set = new Set<string>();
    completedSessions.forEach((s) => {
      if (s.workoutTitle) set.add(s.workoutTitle);
    });
    return Array.from(set);
  }, [completedSessions]);

  // Filtraggio delle Sessioni
  const filteredSessions = useMemo(() => {
    const now = new Date().getTime();

    return completedSessions.filter((s) => {
      // 1. Filtro Periodo
      if (periodFilter === '30d') {
        const diffMs = now - new Date(s.endTime).getTime();
        if (diffMs > 30 * 24 * 60 * 60 * 1000) return false;
      } else if (periodFilter === '90d') {
        const diffMs = now - new Date(s.endTime).getTime();
        if (diffMs > 90 * 24 * 60 * 60 * 1000) return false;
      }

      // 2. Filtro Programma
      if (programFilter !== 'all' && s.workoutTitle !== programFilter) {
        return false;
      }

      // 3. Filtro Alert
      if (alertFilter === 'pain_only' && !s.hasPainAlert) {
        return false;
      }
      if (alertFilter === 'high_rpe' && !s.isHighRpe) {
        return false;
      }

      return true;
    });
  }, [completedSessions, periodFilter, programFilter, alertFilter]);

  // Metriche Riassuntive Calcolate
  const metrics = useMemo(() => {
    const totalSessions = filteredSessions.length;
    const totalMinutes = filteredSessions.reduce((acc, s) => acc + s.durationMinutes, 0);
    const totalTonnageKg = filteredSessions.reduce((acc, s) => acc + s.totalVolumeKg, 0);
    const avgRpe =
      totalSessions > 0
        ? (filteredSessions.reduce((acc, s) => acc + s.rpe, 0) / totalSessions).toFixed(1)
        : '0.0';
    const totalPainAlerts = filteredSessions.filter((s) => s.hasPainAlert).length;

    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;

    return {
      totalSessions,
      totalDurationFormatted: `${hours}h ${mins}m`,
      totalTonnageFormatted: `${(totalTonnageKg / 1000).toFixed(1)} t`,
      totalTonnageExactKg: totalTonnageKg,
      avgRpe,
      totalPainAlerts,
    };
  }, [filteredSessions]);

  const toggleExpand = (id: string) => {
    setExpandedSessionId((prev) => (prev === id ? null : id));
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12 text-[var(--color-primary)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── 1. HEADER SEZIONE ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h3 className="text-xl font-black text-white flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-amber-400" />
            <span>Cronologia & Registro Allenamenti</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Registro storico delle sessioni, carichi sollevati, intensità e avanzamento per {athleteName}.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setAppActiveTab('schede')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Dumbbell className="w-4 h-4 text-amber-400" />
          <span>Gestisci Schede</span>
        </button>
      </div>

      {/* BANNER NOTIFICA GIUSTIFICAZIONI IN SOSPESO */}
      {completedSessions.some((s) => s.status === 'skipped' && s.coachJustified === null) && (
        <div className="p-4 sm:p-5 rounded-3xl bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/40">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-black text-white truncate">
                Giustificazioni in attesa di valutazione
              </h4>
              <p className="text-xs text-amber-200/80 mt-0.5">
                L'atleta ha segnalato delle sedute saltate. Decidi se giustificare l'assenza o applicare la penalità sul punteggio.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-amber-500 text-slate-950 font-black text-xs shrink-0 shadow-md">
            {completedSessions.filter((s) => s.status === 'skipped' && s.coachJustified === null).length} in attesa
          </span>
        </div>
      )}

      {/* ─── 2. HERO BOX AVANZAMENTO PROGRAMMA ATTIVO (SCHEDE FATTE / RIMANGONO / SETTIMANA) ─── */}
      {activeProgramProgress && (
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-[#0c1018] border border-amber-500/30 shadow-2xl space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Testata Scheda Attiva */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Avanzamento Programma Attivo
                </span>
                <h4 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                  <span>{activeProgramProgress.title}</span>
                  <span className="text-xs font-bold text-amber-400 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                    Settimana {activeProgramProgress.currentWeekEstimated} di {activeProgramProgress.totalWeeks}
                  </span>
                </h4>
              </div>
            </div>

            {/* Indicatori Schede Fatte / Rimangono */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-baseline gap-1.5">
                <span className="text-xs text-slate-400 font-bold">Eseguite:</span>
                <span className="text-sm font-black text-emerald-400 font-mono">
                  {activeProgramProgress.completedSessionsCount}
                </span>
                <span className="text-xs text-slate-500">/ {activeProgramProgress.totalPlannedSessions}</span>
              </div>

              <div className="px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-baseline gap-1.5">
                <span className="text-xs text-slate-400 font-bold">Rimangono:</span>
                <span className="text-sm font-black text-amber-400 font-mono">
                  {activeProgramProgress.remainingSessions}
                </span>
                <span className="text-xs text-slate-500">sedute</span>
              </div>
            </div>
          </div>

          {/* Barra di Avanzamento del Mesociclo */}
          <div className="space-y-1.5 relative z-10">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-300 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                <span>Progresso Mesociclo ({activeProgramProgress.daysPerWeek} sedute/settimana)</span>
              </span>
              <span className="text-amber-400 font-mono">{activeProgramProgress.progressPercent}% completato</span>
            </div>

            <div className="w-full h-2.5 rounded-full bg-slate-800/80 overflow-hidden p-0.5 border border-slate-700/50">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 shadow-[0_0_12px_rgba(245,158,11,0.5)] transition-all duration-700"
                style={{ width: `${Math.max(4, activeProgramProgress.progressPercent)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── 3. KPI METRICHE RIASSUNTIVE ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Sessioni Completate */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-xl space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Sessioni Eseguite
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">{metrics.totalSessions}</span>
            <span className="text-xs text-emerald-400 font-bold flex items-center gap-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> completate
            </span>
          </div>
        </div>

        {/* 2. Tonnellaggio Totale */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-xl space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Volume Totale Sollevato
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-400 font-mono">
              {metrics.totalTonnageExactKg > 0 ? metrics.totalTonnageFormatted : '0 kg'}
            </span>
            <span className="text-xs text-slate-500 font-semibold">
              ({metrics.totalTonnageExactKg.toLocaleString()} kg)
            </span>
          </div>
        </div>

        {/* 3. Intensità RPE Media */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-xl space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            RPE Medio Percepito
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-sky-400 font-mono">{metrics.avgRpe}</span>
            <span className="text-xs text-slate-500 font-semibold">su 10</span>
          </div>
        </div>

        {/* 4. Segnalazioni Fastidi */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-xl space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Segnalazioni Dolori
          </span>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-black font-mono ${
                metrics.totalPainAlerts > 0 ? 'text-rose-400' : 'text-slate-400'
              }`}
            >
              {metrics.totalPainAlerts}
            </span>
            <span className="text-xs text-slate-500 font-semibold">sessioni con alert</span>
          </div>
        </div>
      </div>

      {/* ─── 4. FILTRI INTERATTIVI ─── */}
      <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="font-bold text-slate-400 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-amber-400" /> Periodo:
          </span>
          <button
            type="button"
            onClick={() => setPeriodFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              periodFilter === 'all'
                ? 'bg-amber-500 text-black shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Tutto lo Storico
          </button>
          <button
            type="button"
            onClick={() => setPeriodFilter('30d')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              periodFilter === '30d'
                ? 'bg-amber-500 text-black shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Ultimi 30 Giorni
          </button>
          <button
            type="button"
            onClick={() => setPeriodFilter('90d')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              periodFilter === '90d'
                ? 'bg-amber-500 text-black shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Ultimi 90 Giorni
          </button>
        </div>

        {/* Filtro Programma & Alert */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {availablePrograms.length > 1 && (
            <select
              value={programFilter}
              onChange={(e) => setProgramFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-bold focus:outline-none focus:border-amber-500"
            >
              <option value="all">Tutti i Programmi</option>
              {availablePrograms.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          )}

          <select
            value={alertFilter}
            onChange={(e) => setAlertFilter(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-bold focus:outline-none focus:border-amber-500"
          >
            <option value="all">Tutte le Sessioni</option>
            <option value="pain_only">⚠️ Solo con Segnalazioni Dolori</option>
            <option value="high_rpe">🔥 Solo RPE Elevato (≥ 8.5)</option>
          </select>
        </div>
      </div>

      {/* ─── 5. TIMELINE CRONOLOGICA DELLE SEDUTE CON GIORNO & SETTIMANA ─── */}
      <div className="space-y-4">
        {filteredSessions.length === 0 ? (
          /* EMPTY STATE DEDICATO */
          <div className="p-12 rounded-3xl bg-slate-950/60 border border-dashed border-slate-800 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-sm">
              <Dumbbell className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-black text-white">Nessuna sessione registrata</h4>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                L'atleta non ha ancora registrato allenamenti per i filtri selezionati. Le sessioni eseguite dal portale appariranno qui con serie e carichi reali.
              </p>
            </div>
          </div>
        ) : (
          filteredSessions.map((session) => {
            const isExpanded = expandedSessionId === session.id;

            if (session.status === 'skipped') {
              return (
                <div
                  key={session.id}
                  className="rounded-3xl border border-amber-500/30 bg-slate-950/90 shadow-xl overflow-hidden"
                >
                  <div
                    onClick={() => toggleExpand(session.id)}
                    className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none group"
                  >
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-sm">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm sm:text-base font-black text-white group-hover:text-amber-300 transition-colors">
                            {session.dayName}
                          </h4>
                          <span className="text-xs font-black text-amber-400 bg-amber-500/15 px-2.5 py-0.5 rounded-lg border border-amber-500/30 flex items-center gap-1 font-mono">
                            <Calendar className="w-3 h-3 text-amber-400" />
                            Settimana {session.weekNumber} di {session.totalWeeks}
                          </span>
                          <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                            Saltato: {session.skipReason || 'Non specificato'}
                          </span>
                          {session.coachJustified === true ? (
                            <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" /> Giustificato (Nessuna penalità)
                            </span>
                          ) : session.coachJustified === false ? (
                            <span className="text-[10px] font-black text-rose-400 bg-rose-500/15 px-2.5 py-0.5 rounded-full border border-rose-500/30 flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> Non Giustificato (Penalizzato)
                            </span>
                          ) : (
                            <span className="text-[10px] font-black text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/40 animate-pulse flex items-center gap-1">
                              ⏳ In attesa di tua decisione
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Clock className="w-3 h-3" />
                          <span>Segnalato il {session.dateFormatted}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      <span className="text-xs font-bold text-amber-400">Dettagli & Valutazione</span>
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-amber-400" /> : <ChevronDown className="w-5 h-5 text-amber-400" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-5 border-t border-slate-800 space-y-4 bg-slate-900/60">
                      {/* Spiegazione dell'atleta */}
                      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                        <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider block">
                          Motivazione fornita dall'atleta:
                        </span>
                        <p className="text-xs text-slate-200 italic leading-relaxed">
                          "{session.skipNotes || 'Nessuna nota descrittiva aggiunta dall\'atleta.'}"
                        </p>
                      </div>

                      {/* Risposta precedente del coach */}
                      {session.coachFeedback && (
                        <div className="p-3.5 rounded-2xl bg-sky-950/20 border border-sky-500/30 space-y-1">
                          <span className="text-[10px] font-black text-sky-400 uppercase tracking-wider block">
                            La tua nota / risposta inviata:
                          </span>
                          <p className="text-xs text-sky-200 italic leading-relaxed">
                            "{session.coachFeedback}"
                          </p>
                        </div>
                      )}

                      {/* Azioni Decisionali Coach */}
                      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                        <span className="text-xs font-black text-white uppercase tracking-wider block">
                          Valuta questa assenza:
                        </span>
                        <div className="flex flex-col sm:flex-row items-center gap-2.5">
                          <button
                            type="button"
                            disabled={savingEvaluationId === session.id}
                            onClick={() => handleEvaluateSkip(session.id, true, feedbackDrafts[session.id])}
                            className={`w-full sm:flex-1 py-3 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                              session.coachJustified === true
                                ? 'bg-emerald-500 text-slate-950 shadow-md ring-2 ring-emerald-400'
                                : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30'
                            }`}
                          >
                            <ShieldCheck className="w-4 h-4" />
                            <span>Giustifica (Nessuna Penalità)</span>
                          </button>

                          <button
                            type="button"
                            disabled={savingEvaluationId === session.id}
                            onClick={() => handleEvaluateSkip(session.id, false, feedbackDrafts[session.id])}
                            className={`w-full sm:flex-1 py-3 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                              session.coachJustified === false
                                ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-400'
                                : 'bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 border border-rose-500/30'
                            }`}
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Non Giustificare (Applica Penalità)</span>
                          </button>
                        </div>

                        {/* Campo Risposta / Feedback per l'atleta */}
                        <div className="space-y-1.5 pt-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Invia nota o messaggio di risposta all'atleta (opzionale):
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={feedbackDrafts[session.id] ?? session.coachFeedback ?? ''}
                              onChange={(e) =>
                                setFeedbackDrafts((prev) => ({ ...prev, [session.id]: e.target.value }))
                              }
                              placeholder="Es: 'Tranquillo, recuperiamo il giorno di riposo'..."
                              className="flex-1 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                            />
                            <button
                              type="button"
                              disabled={savingEvaluationId === session.id || !feedbackDrafts[session.id]}
                              onClick={() =>
                                handleEvaluateSkip(
                                  session.id,
                                  session.coachJustified ?? true,
                                  feedbackDrafts[session.id]
                                )
                              }
                              className="px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer shrink-0"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Salva Nota</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div
                key={session.id}
                className={`rounded-3xl border transition-all overflow-hidden ${
                  session.hasPainAlert
                    ? 'bg-slate-950/90 border-rose-500/40 shadow-lg shadow-rose-500/5'
                    : 'bg-slate-950/90 border-slate-800 hover:border-slate-700 shadow-xl'
                }`}
              >
                {/* Header Seduta Cliccabile */}
                <div
                  onClick={() => toggleExpand(session.id)}
                  className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none group"
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                        session.hasPainAlert
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      <Dumbbell className="w-5 h-5" />
                    </div>

                    <div className="space-y-1.5 min-w-0">
                      {/* Riga 1: Giorno + Badge Settimana + Nome Scheda + Alert */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm sm:text-base font-black text-white group-hover:text-amber-300 transition-colors">
                          {session.dayName}
                        </h4>

                        {/* BADGE SETTIMANA ESPLICITO */}
                        <span className="text-xs font-black text-amber-400 bg-amber-500/15 px-2.5 py-0.5 rounded-lg border border-amber-500/30 flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3 text-amber-400" />
                          Settimana {session.weekNumber} di {session.totalWeeks}
                        </span>

                        <span className="text-[11px] font-bold text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          {session.workoutTitle}
                        </span>

                        {session.hasPainAlert && (
                          <span className="text-[10px] font-black text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded-full border border-rose-500/40 flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3 text-rose-400" /> Fastidio Segnalato
                          </span>
                        )}
                      </div>

                      {/* Riga 2: Data, Durata, Volume e RPE */}
                      <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap font-medium">
                        <span className="text-slate-300 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {session.dateFormatted}
                        </span>
                        <span>•</span>
                        <span className="text-emerald-400 font-bold">
                          ✓ {session.durationMinutes} min
                        </span>
                        {session.totalVolumeKg > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-slate-200 font-mono font-bold">
                              {session.totalVolumeKg.toLocaleString()} kg sollevati
                            </span>
                          </>
                        )}
                        {session.rpe ? (
                          <>
                            <span>•</span>
                            <span className="text-sky-300 font-bold bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                              RPE {session.rpe}/10
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                    <span className="text-xs text-slate-400 font-bold">
                      {session.exercises.length} esercizi svolti
                    </span>
                    <div className="p-1 text-slate-400 group-hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* Dettagli Espansi Seduta */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-1 border-t border-slate-800/80 space-y-4 animate-in fade-in duration-150">
                    {/* Alert / Questionario Note */}
                    {session.notes && (
                      <div
                        className={`p-3.5 rounded-2xl border text-xs space-y-1 ${
                          session.hasPainAlert
                            ? 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                            : 'bg-slate-900 border border-slate-800 text-slate-200'
                        }`}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Questionario / Note Sessione:
                        </span>
                        <p className="leading-relaxed font-medium italic">
                          "{session.notes}"
                        </p>
                      </div>
                    )}

                    {/* Tabella Dettaglio Esercizi */}
                    <div className="space-y-3">
                      <span className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
                        <Dumbbell className="w-4 h-4 text-amber-400" />
                        Esercizi Svolti & Carichi Utilizzati ({session.exercises.length}):
                      </span>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {session.exercises.map((ex, idx) => (
                          <div
                            key={idx}
                            className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/90 space-y-3 shadow-md"
                          >
                            {/* Nome Esercizio & Volume Totale */}
                            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
                              <h5 className="text-sm font-black text-white truncate flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] text-amber-400 font-mono">
                                  {idx + 1}
                                </span>
                                <span>{ex.name}</span>
                              </h5>

                              {ex.totalVolumeKg > 0 && (
                                <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20 shrink-0">
                                  {ex.totalVolumeKg.toLocaleString()} kg tot
                                </span>
                              )}
                            </div>

                            {/* Tabella Serie / Carichi */}
                            <div className="space-y-1.5">
                              <div className="grid grid-cols-12 gap-1 text-[10px] font-bold uppercase text-slate-400 px-2">
                                <span className="col-span-3">SET</span>
                                <span className="col-span-4 text-center">CARICO</span>
                                <span className="col-span-5 text-right">REPS EFFETTIVE</span>
                              </div>

                              {ex.sets.map((s, sIdx) => (
                                <div
                                  key={sIdx}
                                  className="grid grid-cols-12 gap-1 items-center p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono"
                                >
                                  <span className="col-span-3 font-bold text-slate-400">
                                    Set {s.setNumber}
                                  </span>
                                  <span className="col-span-4 text-center font-black text-amber-300">
                                    {s.weightKg} kg
                                  </span>
                                  <span className="col-span-5 text-right font-black text-emerald-400">
                                    {s.reps} reps {s.rpe ? `@ RPE ${s.rpe}` : ''}
                                  </span>
                                </div>
                              ))}
                            </div>

                            {/* Note / Feedback dell'Atleta sull'Esercizio */}
                            {ex.notes && (
                              <div className="p-2.5 rounded-xl bg-blue-950/30 border border-blue-500/30 text-xs text-blue-200 flex items-start gap-2">
                                <Activity className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                                <div className="space-y-0.5">
                                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">
                                    Feedback Atleta:
                                  </span>
                                  <p className="italic leading-snug">"{ex.notes}"</p>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
