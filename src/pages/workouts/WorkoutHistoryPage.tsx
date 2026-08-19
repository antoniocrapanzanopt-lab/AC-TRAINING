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
  ChevronRight
} from 'lucide-react';
import { useAthletes } from '../../context/AthletesContext';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';

export interface ExerciseSetDetail {
  setNumber: number;
  reps: number;
  weightKg: number;
  rpe?: string;
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
  painDetails?: string;
  isHighRpe: boolean;
  exercises: ExerciseGroupDetail[];
}

export const WorkoutHistoryPage: React.FC = () => {
  const { athletes, setSelectedAthleteId } = useAthletes();
  const { setActiveTab } = useApp();

  const [sessions, setSessions] = useState<CoachWorkoutSessionFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSessionIds, setExpandedSessionIds] = useState<Record<string, boolean>>({});

  // Filtri
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAthleteFilter, setSelectedAthleteFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<'all' | 'today' | '7d' | '30d' | '90d'>('all');
  const [alertFilter, setAlertFilter] = useState<'all' | 'pain_only' | 'high_rpe'>('all');

  const isPainText = (text: string): boolean => {
    return /dolore|fastidio|male|schiena|lombare|spalla|ginocchio|gomito|anca|collo|polso|caviglia|pizzico|infortunio|strappo|infiammazione|tendine|contrattura|bloccato|dolor|articolare|rpe 10/i.test(
      text || ''
    );
  };

  const loadFeed = useCallback(async () => {
    setLoading(true);
    try {
      const athleteMap = new Map(athletes.map((a) => [a.id, a]));

      // 1. Recupero sessioni allenamento
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
          workouts ( id, title, total_weeks )
        `)
        .order('start_time', { ascending: false })
        .limit(250);

      if (sessError) {
        console.error('Errore query workout_sessions:', sessError);
      }

      const sessionsRaw = sessionsData || [];

      // 2. Recupero tutti gli exercise_logs collegati
      const sessionIds = sessionsRaw.map((s: any) => s.id);
      const workoutIds = Array.from(new Set(sessionsRaw.map((s: any) => s.workout_id).filter(Boolean)));
      const logsBySession = new Map<string, any[]>();
      const exercisesById = new Map<string, { name: string; day_name?: string; week_number?: number; workout_id?: string }>();

      // Caricamento dizionario esercizi delle schede
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
              workout_id: we.workout_id,
            });
          });
        }
      }

      if (sessionIds.length > 0) {
        const { data: logsData, error: logsError } = await supabase
          .from('exercise_logs')
          .select(`
            id,
            session_id,
            exercise_id,
            set_number,
            reps_completed,
            weight_kg,
            notes,
            workout_exercises ( id, name, week_number, day_name )
          `)
          .in('session_id', sessionIds);

        if (logsError) {
          console.warn('Errore query exercise_logs:', logsError);
        } else if (logsData) {
          logsData.forEach((l: any) => {
            if (!logsBySession.has(l.session_id)) {
              logsBySession.set(l.session_id, []);
            }
            logsBySession.get(l.session_id)!.push(l);
          });
        }
      }

      // Unione con backup locale istantaneo se presente sul client
      try {
        const localCompletedLogs = JSON.parse(localStorage.getItem('builder_completed_session_logs') || '{}');
        sessionsRaw.forEach((s: any) => {
          if ((!logsBySession.has(s.id) || logsBySession.get(s.id)!.length === 0) && localCompletedLogs[s.id]) {
            logsBySession.set(s.id, localCompletedLogs[s.id]);
          }
        });
      } catch (_) {}

      const feedItems: CoachWorkoutSessionFeedItem[] = sessionsRaw.map((s: any) => {
        // Risoluzione atleta sia da athlete.id che da auth_user_id
        const athFromMap = s.athlete_id
          ? athleteMap.get(s.athlete_id) || athletes.find((a) => a.auth_user_id === s.athlete_id || a.id === s.athlete_id)
          : null;
        const safeName = athFromMap?.fullName || 'Atleta';

        // Calcolo orari e durata
        const endObj = new Date(s.end_time || s.start_time || new Date().toISOString());
        const startObj = new Date(s.start_time || s.end_time || new Date().toISOString());
        const diffMs = Math.max(0, endObj.getTime() - startObj.getTime());
        const durationMin = Math.max(1, Math.round(diffMs / 60000));

        // Raggruppamento esercizi e carichi
        const exMap = new Map<string, { sets: ExerciseSetDetail[]; notesSet: Set<string> }>();
        const logs = logsBySession.get(s.id) || [];
        let detectedDay = 'Sessione Allenamento';
        let detectedWeek: number | undefined = undefined;
        let sessionVolume = 0;
        let hasPainInLogs = false;
        const painNotesList: string[] = [];

        logs.forEach((log: any) => {
          const weFromMap = log.exercise_id ? exercisesById.get(log.exercise_id) : null;
          const day = log.workout_exercises?.day_name || weFromMap?.day_name;
          const week = log.workout_exercises?.week_number || weFromMap?.week_number;

          if (day && detectedDay === 'Sessione Allenamento') {
            detectedDay = day;
          }
          if (week && !detectedWeek) {
            detectedWeek = week;
          }

          // Recupero nome reale esercizio con fallback robusto
          const exName = log.workout_exercises?.name || weFromMap?.name || 'Esercizio';
          if (!exMap.has(exName)) {
            exMap.set(exName, { sets: [], notesSet: new Set<string>() });
          }
          const entry = exMap.get(exName)!;

          const reps = Number(log.reps_completed) || 0;
          const weight = Number(log.weight_kg) || 0;
          sessionVolume += reps * weight;

          // Estrazione RPE se salvato nelle note (es. "RPE: 8.5")
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

        // Controllo alert questionario finale
        const hasPainInQuestionnaire = isPainText(s.notes || '');
        if (hasPainInQuestionnaire && s.notes) {
          painNotesList.push(`Questionario: "${s.notes}"`);
        }

        const hasPain = hasPainInLogs || hasPainInQuestionnaire;
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
          startTime: s.start_time,
          endTime: s.end_time,
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
          painDetails: painNotesList.length > 0 ? painNotesList.join(' • ') : undefined,
          isHighRpe,
          exercises,
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
                    ? 'bg-slate-950/95 border-rose-500/40 shadow-xl shadow-rose-500/5'
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
                            <span className="text-[10px] font-black text-rose-300 bg-rose-500/20 px-2.5 py-0.5 rounded-full border border-rose-500/40 flex items-center gap-1 animate-pulse">
                              <ShieldAlert className="w-3 h-3 text-rose-400" /> Fastidio Segnalato
                            </span>
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

                  {/* Note Questionario / Fastidi Generali */}
                  {session.notes && (
                    <div
                      className={`p-3.5 rounded-2xl border text-xs ${
                        session.hasPainAlert
                          ? 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                          : 'bg-slate-900/80 border-slate-800 text-slate-300'
                      }`}
                    >
                      <span className="font-black mr-1.5 uppercase text-[10px] tracking-wider text-amber-400 block sm:inline">
                        Questionario Fine Allenamento:
                      </span>
                      "{session.notes}"
                    </div>
                  )}

                  {/* ─── DETTAGLIO ESERCIZI ESPANSO CON TABELLA DEI CARICHI & NOTE ─── */}
                  {isExpanded && (
                    <div className="pt-4 border-t border-slate-800/80 space-y-4 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
                          <Dumbbell className="w-4 h-4 text-amber-400" />
                          Esercizi Eseguiti & Carichi Utilizzati ({session.exercises.length}):
                        </span>
                      </div>

                      {session.exercises.length === 0 ? (
                        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-dashed border-slate-800 text-xs text-slate-400 space-y-1">
                          <p className="font-bold text-slate-300">Nessun carico/set registrato singolarmente in questa sessione.</p>
                          <p className="text-[11px] text-slate-500">
                            I dati del questionario, durata e RPE sono stati salvati correttamente. I prossimi allenamenti registrati con il Workout Player salveranno e mostreranno automaticamente tutti i carichi (kg), le serie e i feedback in questa griglia!
                          </p>
                        </div>
                      ) : (
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
