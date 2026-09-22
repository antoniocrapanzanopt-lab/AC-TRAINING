import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  History,
  Dumbbell,
  Search,
  Calendar,
  Clock,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  MessageSquare,
  ChevronRight,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { useAthletes } from '../../context/AthletesContext';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../lib/supabase';
import { isPainFeedback, isPainResolved } from '../../utils/painAnalysis';

export interface ExerciseSetDetail {
  setNumber: number;
  reps: number;
  weightKg: number;
  rpe?: string;
  notes?: string;
}

export interface ExerciseGroupDetail {
  name: string;
  sets: ExerciseSetDetail[];
  notes?: string;
  totalVolumeKg: number;
}

export interface CoachWorkoutSessionFeedItem {
  id: string;
  athleteId: string;
  athleteName: string;
  athleteEmail?: string;
  workoutId?: string;
  workoutTitle: string;
  dayName: string;
  weekNumber?: number;
  startTime?: string;
  endTime?: string;
  dateFormatted: string;
  timeFormatted: string;
  durationMinutes: number;
  rpe?: number;
  notes?: string;
  totalVolumeKg: number;
  hasPainAlert: boolean;
  isPainResolved?: boolean;
  painDetails?: string;
  isHighRpe: boolean;
  exercises: ExerciseGroupDetail[];
  hasExplicitLoads: boolean;
  scheduledExercises?: Array<{
    name: string;
    sets: number;
    reps_target?: string;
    target_weight?: number;
    day_name?: string;
  }>;
}

interface RawWorkoutSessionQueryResult {
  id: string;
  athlete_id: string | null;
  workout_id: string | null;
  start_time: string | null;
  end_time: string | null;
  rpe: number | null;
  notes: string | null;
  week_number: number | null;
  day_name: string | null;
  status: string | null;
  workouts: { id: string; title: string; total_weeks: number } | null;
}

interface RawExerciseLogQueryResult {
  id: string;
  session_id: string;
  exercise_id: string | null;
  set_number: number;
  reps_completed: number | null;
  weight_kg: number | null;
  notes: string | null;
  workout_exercises?: { name?: string; day_name?: string; week_number?: number } | null;
}

interface RawWorkoutExerciseQueryResult {
  id: string;
  workout_id: string | null;
  name: string;
  day_name: string | null;
  week_number: number | null;
  sets?: number | null;
  reps_target?: string | null;
  target_weight?: number | null;
  order_index?: number | null;
}

export const WorkoutHistoryPage: React.FC = () => {
  const { athletes, setSelectedAthleteId } = useAthletes();
  const { setActiveTab } = useApp();
  const { showSuccess, showError } = useToast();

  const [sessions, setSessions] = useState<CoachWorkoutSessionFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSessionIds, setExpandedSessionIds] = useState<Record<string, boolean>>({});
  const [resolvingSessionId, setResolvingSessionId] = useState<string | null>(null);

  // Filtri
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAthleteFilter, setSelectedAthleteFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<'all' | 'today' | '7d' | '30d' | '90d'>('all');
  const [alertFilter, setAlertFilter] = useState<'all' | 'pain_only' | 'high_rpe'>('all');

  const isPainText = (text: string): boolean => {
    return isPainFeedback(text);
  };

  const loadFeed = useCallback(async () => {
    setLoading(true);
    try {
      const athleteMap = new Map(athletes.map((a) => [a.id, a]));

      // 1. Recupero sessioni allenamento completate
      const { data: sessionsData, error: sessError } = await supabase
        .from('workout_sessions')
        .select(`
          id,
          athlete_id,
          workout_id,
          start_time,
          end_time,
          rpe,
          notes,
          week_number,
          day_name,
          status,
          workouts ( id, title, total_weeks )
        `)
        .not('end_time', 'is', null)
        .order('start_time', { ascending: false })
        .limit(250);

      if (sessError) {
        console.error('Errore query workout_sessions:', sessError);
      }

      const sessionsRaw = (sessionsData || []) as unknown as RawWorkoutSessionQueryResult[];
      const sessionIds = sessionsRaw.map((s) => s.id).filter(Boolean);
      const workoutIds = Array.from(new Set(sessionsRaw.map((s) => s.workout_id).filter(Boolean))) as string[];

      // 2. Mappa esercizi della scheda e template programmato
      const exercisesById = new Map<string, { name: string; day_name?: string; week_number?: number; workout_id?: string; sets?: number; reps_target?: string; target_weight?: number }>();
      const scheduledExercisesByWorkout = new Map<string, Array<{ name: string; day_name?: string; week_number?: number; sets: number; reps_target?: string; target_weight?: number }>>();

      if (workoutIds.length > 0) {
        const { data: weData, error: weErr } = await supabase
          .from('workout_exercises')
          .select('id, workout_id, name, day_name, week_number, sets, reps_target, target_weight, order_index')
          .in('workout_id', workoutIds)
          .order('order_index', { ascending: true });

        if (weErr) {
          console.warn('Avviso recupero workout_exercises:', weErr);
        }

        if (weData) {
          (weData as unknown as RawWorkoutExerciseQueryResult[]).forEach((we) => {
            const item = {
              name: we.name,
              day_name: we.day_name || undefined,
              week_number: we.week_number || undefined,
              workout_id: we.workout_id || undefined,
              sets: we.sets || 3,
              reps_target: we.reps_target || undefined,
              target_weight: we.target_weight || undefined,
            };
            exercisesById.set(we.id, item);

            if (we.workout_id) {
              if (!scheduledExercisesByWorkout.has(we.workout_id)) {
                scheduledExercisesByWorkout.set(we.workout_id, []);
              }
              scheduledExercisesByWorkout.get(we.workout_id)!.push(item);
            }
          });
        }
      }

      // 3. Recupero set ed esecuzioni da exercise_logs
      const logsBySession = new Map<string, RawExerciseLogQueryResult[]>();
      if (sessionIds.length > 0) {
        const { data: logsData, error: logsErr } = await supabase
          .from('exercise_logs')
          .select('id, session_id, exercise_id, set_number, reps_completed, weight_kg, notes')
          .in('session_id', sessionIds)
          .order('set_number', { ascending: true });

        if (logsErr) {
          console.warn('Avviso recupero exercise_logs:', logsErr);
        }

        if (logsData && logsData.length > 0) {
          const typedLogs = logsData as unknown as RawExerciseLogQueryResult[];
          const missingIds = Array.from(
            new Set(typedLogs.map((l) => l.exercise_id).filter((id): id is string => typeof id === 'string' && id.length > 0 && !exercisesById.has(id)))
          );

          if (missingIds.length > 0) {
            const { data: extraWe } = await supabase
              .from('workout_exercises')
              .select('id, workout_id, name, day_name, week_number')
              .in('id', missingIds);

            if (extraWe) {
              (extraWe as unknown as RawWorkoutExerciseQueryResult[]).forEach((we) => {
                exercisesById.set(we.id, {
                  name: we.name,
                  day_name: we.day_name || undefined,
                  week_number: we.week_number || undefined,
                  workout_id: we.workout_id || undefined,
                });
              });
            }
          }

          typedLogs.forEach((l) => {
            if (!logsBySession.has(l.session_id)) {
              logsBySession.set(l.session_id, []);
            }
            logsBySession.get(l.session_id)!.push(l);
          });
        }
      }

      // 4. Unione con backup locale istantaneo se presente sul client
      try {
        const localCompletedLogs = JSON.parse(localStorage.getItem('builder_completed_session_logs') || '{}') as Record<string, RawExerciseLogQueryResult[]>;
        sessionsRaw.forEach((s) => {
          if ((!logsBySession.has(s.id) || logsBySession.get(s.id)!.length === 0) && localCompletedLogs[s.id]) {
            logsBySession.set(s.id, localCompletedLogs[s.id]);
          }
        });
      } catch (_) {}

      // 5. Mappatura completa degli item per il feed
      const feedItems: CoachWorkoutSessionFeedItem[] = sessionsRaw.map((s) => {
        const athFromMap = s.athlete_id
          ? athleteMap.get(s.athlete_id) || athletes.find((a) => a.auth_user_id === s.athlete_id || a.id === s.athlete_id)
          : null;
        const safeName = athFromMap?.fullName || 'Atleta';

        const endObj = new Date(s.end_time || s.start_time || new Date().toISOString());
        const startObj = new Date(s.start_time || s.end_time || new Date().toISOString());
        const diffMs = Math.max(0, endObj.getTime() - startObj.getTime());
        const durationMin = Math.max(1, Math.round(diffMs / 60000));

        const exMap = new Map<string, { sets: ExerciseSetDetail[]; notesSet: Set<string> }>();
        const logs = logsBySession.get(s.id) || [];
        let detectedDay = s.day_name || 'Sessione Allenamento';
        let detectedWeek: number | undefined = s.week_number || undefined;
        let sessionVolume = 0;
        let hasPainInLogs = false;
        const painNotesList: string[] = [];

        logs.forEach((log) => {
          const weFromMap = log.exercise_id ? exercisesById.get(log.exercise_id) : null;
          const day = log.workout_exercises?.day_name || weFromMap?.day_name;
          const week = log.workout_exercises?.week_number || weFromMap?.week_number;

          if (day && detectedDay === 'Sessione Allenamento') {
            detectedDay = day;
          }
          if (week && !detectedWeek) {
            detectedWeek = week;
          }

          const exName = log.workout_exercises?.name || weFromMap?.name || 'Esercizio';
          if (!exMap.has(exName)) {
            exMap.set(exName, { sets: [], notesSet: new Set<string>() });
          }
          const entry = exMap.get(exName)!;

          const reps = Number(log.reps_completed) || 0;
          const weight = Number(log.weight_kg) || 0;
          sessionVolume += reps * weight;

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

        const exercises: ExerciseGroupDetail[] = Array.from(exMap.entries()).map(
          ([name, { sets, notesSet }]) => {
            sets.sort((a, b) => a.setNumber - b.setNumber);
            const notes = Array.from(notesSet).join(' | ');
            const totalVolumeKg = sets.reduce((sum, item) => sum + item.reps * item.weightKg, 0);
            return { name, sets, notes, totalVolumeKg };
          }
        );

        // Fallback su esercizi programmati della scheda: filtra ESCLUSIVAMENTE per la settimana e il giorno della seduta svolta
        const scheduled = s.workout_id ? scheduledExercisesByWorkout.get(s.workout_id) || [] : [];
        const targetWeek = detectedWeek || s.week_number;
        const targetDayClean = (detectedDay && detectedDay !== 'Sessione Allenamento' ? detectedDay : s.day_name || '').toLowerCase().trim();

        let filteredScheduled = scheduled.filter((sc) => {
          const matchWeek = targetWeek ? sc.week_number === targetWeek : true;
          const matchDay = targetDayClean && sc.day_name ? sc.day_name.toLowerCase().trim() === targetDayClean : true;
          return matchWeek && matchDay;
        });

        // Se il match combinato è troppo restrittivo (es. week diversa), tenta per solo giorno
        if (filteredScheduled.length === 0 && targetDayClean) {
          filteredScheduled = scheduled.filter((sc) => sc.day_name && sc.day_name.toLowerCase().trim() === targetDayClean);
        }

        // Se ancora vuoto, prendi solo il primo giorno disponibile per non riversare l'intera scheda di 42 esercizi
        if (filteredScheduled.length === 0 && scheduled.length > 0) {
          const firstDay = scheduled[0]?.day_name;
          filteredScheduled = scheduled.filter((sc) => sc.day_name === firstDay);
        }

        // Deduplica per nome esercizio se presenti ripetizioni
        const seenNames = new Set<string>();
        const fallbackScheduled = filteredScheduled.filter((item) => {
          const key = item.name.toLowerCase().trim();
          if (seenNames.has(key)) return false;
          seenNames.add(key);
          return true;
        });

        const hasPainInQuestionnaire = isPainFeedback(s.notes || '');
        const isPainAlreadyResolved = isPainResolved(s.notes || '');
        if (hasPainInQuestionnaire && s.notes) {
          painNotesList.push(`Questionario: "${s.notes}"`);
        }

        const hasPain = hasPainInLogs || hasPainInQuestionnaire || isPainAlreadyResolved;
        const rpeVal = Number(s.rpe) || undefined;
        const isHighRpe = rpeVal !== undefined && rpeVal >= 8.5;

        return {
          id: s.id,
          athleteId: s.athlete_id || athFromMap?.id || '',
          athleteName: safeName,
          athleteEmail: athFromMap?.email,
          workoutId: s.workout_id || s.workouts?.id,
          workoutTitle: s.workouts?.title || 'Scheda Personalizzata',
          dayName: detectedDay,
          weekNumber: detectedWeek,
          startTime: s.start_time || undefined,
          endTime: s.end_time || undefined,
          dateFormatted: endObj.toLocaleDateString('it-IT', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }),
          timeFormatted: endObj.toLocaleTimeString('it-IT', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          durationMinutes: durationMin,
          rpe: rpeVal,
          notes: s.notes || undefined,
          totalVolumeKg: sessionVolume,
          hasPainAlert: hasPain,
          isPainResolved: isPainAlreadyResolved,
          painDetails: painNotesList.join(' | '),
          isHighRpe,
          exercises,
          hasExplicitLoads: exercises.length > 0,
          scheduledExercises: fallbackScheduled,
        };
      });

      setSessions(feedItems);
    } catch (err) {
      console.error('Errore caricamento feed cronologia allenamenti:', err);
    } finally {
      setLoading(false);
    }
  }, [athletes]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  // Filtraggio avanzato del Feed
  const filteredSessions = useMemo(() => {
    const now = new Date().getTime();
    const q = searchQuery.toLowerCase().trim();

    return sessions.filter((s) => {
      // 1. Filtro Atleta
      if (selectedAthleteFilter !== 'all' && s.athleteId !== selectedAthleteFilter) {
        return false;
      }

      // 2. Filtro Periodo
      if (periodFilter === 'today') {
        const todayStr = new Date().toISOString().slice(0, 10);
        if (!s.endTime && !s.startTime) return false;
        const sessionDate = (s.endTime || s.startTime || '').slice(0, 10);
        if (sessionDate !== todayStr) return false;
      } else if (periodFilter === '7d') {
        const diff = now - new Date(s.endTime || s.startTime || now).getTime();
        if (diff > 7 * 24 * 60 * 60 * 1000) return false;
      } else if (periodFilter === '30d') {
        const diff = now - new Date(s.endTime || s.startTime || now).getTime();
        if (diff > 30 * 24 * 60 * 60 * 1000) return false;
      } else if (periodFilter === '90d') {
        const diff = now - new Date(s.endTime || s.startTime || now).getTime();
        if (diff > 90 * 24 * 60 * 60 * 1000) return false;
      }

      // 3. Filtro Alert
      if (alertFilter === 'pain_only' && !s.hasPainAlert) {
        return false;
      }
      if (alertFilter === 'high_rpe' && !s.isHighRpe) {
        return false;
      }

      // 4. Ricerca Testo
      if (q) {
        const matchName = s.athleteName.toLowerCase().includes(q);
        const matchWorkout = s.workoutTitle.toLowerCase().includes(q);
        const matchDay = s.dayName.toLowerCase().includes(q);
        const matchNotes = (s.notes || '').toLowerCase().includes(q);
        const matchExercises = s.exercises.some(
          (e) => e.name.toLowerCase().includes(q) || (e.notes || '').toLowerCase().includes(q)
        );

        if (!matchName && !matchWorkout && !matchDay && !matchNotes && !matchExercises) {
          return false;
        }
      }

      return true;
    });
  }, [sessions, selectedAthleteFilter, periodFilter, alertFilter, searchQuery]);

  const toggleSession = (id: string) => {
    setExpandedSessionIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleExpandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    filteredSessions.forEach((s) => {
      allExpanded[s.id] = true;
    });
    setExpandedSessionIds(allExpanded);
  };

  const handleCollapseAll = () => {
    setExpandedSessionIds({});
  };

  const handleNavigateToAthlete = (athleteId: string) => {
    setSelectedAthleteId(athleteId);
    setActiveTab('atleti');
  };

  const handleOpenAthleteWorkout = (athleteId: string) => {
    setSelectedAthleteId(athleteId);
    setActiveTab('schede');
  };

  const handleToggleResolvePain = async (
    sessionId: string,
    currentNotes: string = '',
    isResolved: boolean = false
  ) => {
    setResolvingSessionId(sessionId);
    try {
      let updatedNotes = currentNotes;
      if (!isResolved) {
        const dateTag = new Date().toLocaleDateString('it-IT');
        if (!updatedNotes.includes('[RISOLTO DAL COACH')) {
          updatedNotes = updatedNotes.trim()
            ? `${updatedNotes}\n[RISOLTO DAL COACH — ${dateTag}]`
            : `[RISOLTO DAL COACH — ${dateTag}]`;
        }
      } else {
        updatedNotes = updatedNotes.replace(/\n?\[RISOLTO DAL COACH[^\]]*\]/gi, '').trim();
      }

      const { error } = await supabase
        .from('workout_sessions')
        .update({ notes: updatedNotes })
        .eq('id', sessionId);

      if (error) throw error;

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== sessionId) return s;
          const painNotesList: string[] = [];
          const hasPainInLogs = s.exercises.some((ex) =>
            (ex.notes && isPainFeedback(ex.notes)) ||
            ex.sets.some((st) => st.notes && isPainFeedback(st.notes))
          );
          const hasPainInQuestionnaire = isPainFeedback(updatedNotes);
          if (hasPainInQuestionnaire && updatedNotes) {
            painNotesList.push(`Questionario: "${updatedNotes}"`);
          }
          const stillHasPain = hasPainInLogs || hasPainInQuestionnaire;
          const newlyResolved = isPainResolved(updatedNotes);

          return {
            ...s,
            notes: updatedNotes,
            hasPainAlert: stillHasPain || newlyResolved,
            isPainResolved: newlyResolved,
            painDetails: painNotesList.join(' | '),
          };
        })
      );

      showSuccess(
        !isResolved
          ? 'Fastidio contrassegnato come risolto con successo!'
          : 'Segnalazione fastidio riaperta.'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Impossibile aggiornare la segnalazione.';
      showError(msg);
    } finally {
      setResolvingSessionId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      {/* ─── 1. HEADER & KPI STATS ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
              <History className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Cronologia Allenamenti Live
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 font-medium">
                Visualizza in tempo reale tutti i carichi, le serie e le note lasciate dagli atleti
              </p>
            </div>
          </div>
        </div>

        {/* Azioni Rapide */}
        <div className="flex items-center gap-2 self-start md:self-center">
          <button
            type="button"
            onClick={loadFeed}
            className="px-3.5 py-2 rounded-2xl bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 text-xs font-bold flex items-center gap-2 transition-all active:scale-95 cursor-pointer shadow-sm"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
            <span>Aggiorna Dati</span>
          </button>
        </div>
      </div>

      {/* ─── 2. BANNER KPI RAPIDI ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Sessioni Totali
          </span>
          <p className="text-xl sm:text-2xl font-black font-mono text-white">{sessions.length}</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Atleti Attivi
          </span>
          <p className="text-xl sm:text-2xl font-black font-mono text-amber-400">
            {new Set(sessions.map((s) => s.athleteId)).size}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Tonnellaggio Totale
          </span>
          <p className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
            {Math.round(
              sessions.reduce((acc, s) => acc + (s.totalVolumeKg || 0), 0) / 1000
            )}{' '}
            <span className="text-xs font-sans font-bold">Ton</span>
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Alert & Fastidi
          </span>
          <p className="text-xl sm:text-2xl font-black font-mono text-rose-400">
            {sessions.filter((s) => s.hasPainAlert).length}
          </p>
        </div>
      </div>

      {/* ─── 3. BARRA FILTRI INTERATTIVI ─── */}
      <div className="p-4 rounded-3xl bg-slate-950/90 border border-slate-800 shadow-xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Cerca Testo */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca atleta, esercizio, carico o nota..."
              className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-white text-xs font-medium focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          {/* Filtro Atleta */}
          <div>
            <select
              value={selectedAthleteFilter}
              onChange={(e) => setSelectedAthleteFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-white text-xs font-bold focus:outline-none focus:border-amber-500 transition-colors"
            >
              <option value="all">Tutti gli Atleti ({athletes.length})</option>
              {athletes.map((ath) => (
                <option key={ath.id} value={ath.id}>
                  {ath.fullName}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Periodo */}
          <div>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-white text-xs font-bold focus:outline-none focus:border-amber-500 transition-colors"
            >
              <option value="all">Tutto lo Storico</option>
              <option value="today">Solo Oggi</option>
              <option value="7d">Ultimi 7 Giorni</option>
              <option value="30d">Ultimi 30 Giorni</option>
              <option value="90d">Ultimi 90 Giorni</option>
            </select>
          </div>

          {/* Filtro Alert */}
          <div>
            <select
              value={alertFilter}
              onChange={(e) => setAlertFilter(e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-white text-xs font-bold focus:outline-none focus:border-amber-500 transition-colors"
            >
              <option value="all">Tutte le Sessioni</option>
              <option value="pain_only">⚠️ Solo con Segnalazioni Dolori</option>
              <option value="high_rpe">🔥 Solo RPE Elevato (≥ 8.5)</option>
            </select>
          </div>
        </div>

        {/* Indicatore Conteggio Risultati & Tasti Espandi/Comprimi */}
        <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-1 pt-1 border-t border-slate-800/60 flex-wrap gap-2">
          <span>
            Visualizzazione: <strong className="text-white">{filteredSessions.length}</strong> sessioni trovate
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExpandAll}
              className="text-amber-400 hover:text-amber-300 text-xs font-bold cursor-pointer transition-colors"
            >
              Espandi Tutto
            </button>
            <span className="text-slate-600">•</span>
            <button
              type="button"
              onClick={handleCollapseAll}
              className="text-slate-400 hover:text-white text-xs font-bold cursor-pointer transition-colors"
            >
              Comprimi Tutto
            </button>

            {(searchQuery || selectedAthleteFilter !== 'all' || periodFilter !== 'all' || alertFilter !== 'all') && (
              <>
                <span className="text-slate-600">•</span>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedAthleteFilter('all');
                    setPeriodFilter('all');
                    setAlertFilter('all');
                  }}
                  className="text-rose-400 hover:underline cursor-pointer"
                >
                  Azzera filtri
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ─── 4. FEED PRINCIPALE DELLE SESSIONI ─── */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 rounded-3xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400 space-y-2">
            <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin mx-auto" />
            <p>Caricamento live feed cronologia allenamenti in corso...</p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="p-12 rounded-3xl bg-slate-950/60 border border-dashed border-slate-800 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-sm">
              <Dumbbell className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-black text-white">Nessuna sessione trovata</h4>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                Nessun allenamento registrato corrisponde ai filtri selezionati. Prova a modificare i parametri di ricerca o il periodo temporale.
              </p>
            </div>
          </div>
        ) : (
          filteredSessions.map((session) => {
            const isExpanded = !!expandedSessionIds[session.id];

            return (
              <div
                key={session.id}
                className={`rounded-3xl border transition-all overflow-hidden ${
                  session.hasPainAlert
                    ? session.isPainResolved
                      ? 'bg-slate-950/95 border-emerald-500/40 shadow-xl shadow-emerald-500/5'
                      : 'bg-slate-950/95 border-rose-500/40 shadow-xl shadow-rose-500/5'
                    : 'bg-slate-950/90 border-slate-800 hover:border-slate-700 shadow-xl'
                }`}
              >
                {/* Header Seduta Feed */}
                <div className="p-5 sm:p-6 space-y-4">
                  {/* Riga 1: Atleta + Scheda + Data & Orario + CTA Profilo */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
                    {/* Profilo Atleta & Dettaglio Seduta */}
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                      {/* Avatar Iniziali */}
                      <button
                        type="button"
                        onClick={() => handleNavigateToAthlete(session.athleteId)}
                        className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center font-black text-sm text-amber-400 shadow-md shrink-0 hover:border-amber-400 transition-colors cursor-pointer"
                        title={`Apri profilo ${session.athleteName}`}
                      >
                        {session.athleteName
                          .split(' ')
                          .map((n) => n[0])
                          .filter(Boolean)
                          .join('')
                          .slice(0, 2)
                          .toUpperCase() || 'AT'}
                      </button>

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleNavigateToAthlete(session.athleteId)}
                            className="text-base font-black text-white hover:text-amber-300 transition-colors tracking-tight text-left cursor-pointer flex items-center gap-1"
                          >
                            <span>{session.athleteName}</span>
                            <ChevronRight className="w-4 h-4 text-slate-500" />
                          </button>

                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-900 text-slate-300 border border-slate-800">
                            {session.dayName}
                          </span>

                          <span className="text-xs font-black text-amber-400 bg-amber-500/15 px-2.5 py-0.5 rounded-lg border border-amber-500/30 flex items-center gap-1 font-mono">
                            <Calendar className="w-3 h-3 text-amber-400" />
                            Settimana {session.weekNumber || 1}
                          </span>

                          {session.hasPainAlert && (
                            session.isPainResolved ? (
                              <span className="text-[10px] font-black text-emerald-300 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/40 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Fastidio Risolto ✓
                              </span>
                            ) : (
                              <span className="text-[10px] font-black text-rose-300 bg-rose-500/20 px-2.5 py-0.5 rounded-full border border-rose-500/40 flex items-center gap-1 animate-pulse">
                                <ShieldAlert className="w-3 h-3 text-rose-400" /> Fastidio Segnalato
                              </span>
                            )
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap font-medium">
                          <span className="flex items-center gap-1 text-slate-300 font-bold">
                            <Dumbbell className="w-3.5 h-3.5 text-amber-400" />
                            {session.workoutTitle}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-slate-400">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {session.dateFormatted} alle {session.timeFormatted}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Badge Metriche Sessione */}
                    <div className="flex items-center gap-2.5 flex-wrap self-start md:self-center">
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {session.durationMinutes} min
                      </span>

                      {session.totalVolumeKg > 0 && (
                        <span className="text-xs font-mono font-bold text-slate-200 bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-800">
                          {session.totalVolumeKg.toLocaleString()} kg
                        </span>
                      )}

                      {session.rpe !== undefined && (
                        <span className="text-xs font-bold text-sky-300 bg-sky-500/10 px-2.5 py-1 rounded-xl border border-sky-500/20">
                          RPE {session.rpe}/10
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => toggleSession(session.id)}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-sm"
                        title={isExpanded ? 'Comprimi esercizi' : 'Espandi esercizi'}
                      >
                        <span>{isExpanded ? 'Chiudi' : 'Vedi Carichi & Note'}</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-amber-400" /> : <ChevronDown className="w-4 h-4 text-amber-400" />}
                      </button>
                    </div>
                  </div>

                  {/* Note Questionario / Fastidi Generali con Azioni di Risoluzione */}
                  {session.notes && (
                    <div
                      className={`p-4 rounded-2xl border text-xs space-y-2.5 ${
                        session.hasPainAlert
                          ? session.isPainResolved
                            ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                            : 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                          : 'bg-slate-900/80 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="font-black uppercase text-[10px] tracking-wider text-amber-400 flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5" />
                          Questionario Fine Allenamento:
                        </span>

                        {session.hasPainAlert && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={resolvingSessionId === session.id}
                              onClick={() => handleToggleResolvePain(session.id, session.notes, session.isPainResolved)}
                              className={`px-3 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                session.isPainResolved
                                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-md shadow-emerald-500/20 active:scale-95'
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{session.isPainResolved ? 'Riapri Segnalazione' : 'Segna come Risolto'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenAthleteWorkout(session.athleteId)}
                              className="px-3 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                              title="Apri scheda dell'atleta per correggere o sostituire esercizi"
                            >
                              <Dumbbell className="w-3.5 h-3.5 text-amber-400" />
                              <span>Modifica Scheda Atleta</span>
                            </button>
                          </div>
                        )}
                      </div>

                      <p className="italic text-slate-200 leading-relaxed pl-1">
                        "{session.notes.replace(/\n?\[RISOLTO DAL COACH[^\\]]*\]/gi, '').trim()}"
                      </p>

                      {session.isPainResolved && (
                        <div className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 pt-1 border-t border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Contrassegnato come risolto dal coach</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ─── DETTAGLIO ESERCIZI ESPANSO CON TABELLA DEI CARICHI & NOTE ─── */}
                  {isExpanded && (
                    <div className="pt-4 border-t border-slate-800/80 space-y-4 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
                          <Dumbbell className="w-4 h-4 text-amber-400" />
                          {session.hasExplicitLoads
                            ? `Esercizi Eseguiti & Carichi Utilizzati (${session.exercises.length}):`
                            : `Esercizi Scheda Prescritta (${session.scheduledExercises?.length || 0}):`}
                        </span>

                        {!session.hasExplicitLoads && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Registrazione Rapida (Durata & RPE)
                          </span>
                        )}
                      </div>

                      {session.hasExplicitLoads ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          {session.exercises.map((ex, exIdx) => (
                            <div
                              key={exIdx}
                              className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/90 space-y-3 shadow-md"
                            >
                              {/* Nome Esercizio & Volume Totale */}
                              <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
                                <h5 className="text-sm font-black text-white truncate flex items-center gap-1.5">
                                  <span className="w-5 h-5 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] text-amber-400 font-mono">
                                    {exIdx + 1}
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
                                  <MessageSquare className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
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
                      ) : session.scheduledExercises && session.scheduledExercises.length > 0 ? (
                        <div className="space-y-3">
                          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-xs text-amber-300">
                            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <div className="leading-relaxed">
                              <span className="font-bold block">Sessione completata a livello di scheda & questionario.</span>
                              <span className="text-slate-300 text-[11px]">
                                L'atleta ha registrato la durata ({session.durationMinutes} min), l'RPE ({session.rpe !== undefined ? `${session.rpe}/10` : 'N/D'}) e il questionario finale. I carichi specifici non sono stati modificati manualmente rispetto ai target prescritti sotto:
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {session.scheduledExercises.map((sc, scIdx) => (
                              <div
                                key={scIdx}
                                className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-2.5 shadow-sm"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-xs text-amber-400 font-mono shrink-0">
                                    {scIdx + 1}
                                  </span>
                                  <div className="min-w-0">
                                    <h6 className="text-xs font-black text-white truncate">{sc.name}</h6>
                                    <span className="text-[11px] text-slate-400 font-medium">
                                      {sc.sets} serie {sc.reps_target ? `× ${sc.reps_target}` : ''}{sc.target_weight ? ` @ ${sc.target_weight} kg` : ''}
                                    </span>
                                  </div>
                                </div>
                                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20 shrink-0">
                                  <CheckCircle2 className="w-3 h-3" /> Eseguito
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-dashed border-slate-800 text-xs text-slate-400 space-y-1">
                          <p className="font-bold text-slate-300">Nessun dettaglio serie registrato singolarmente per questa sessione.</p>
                          <p className="text-[11px] text-slate-500">
                            I dati generali di durata ({session.durationMinutes} min), RPE ({session.rpe || 'N/D'}) e questionario sono conservati con successo.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
