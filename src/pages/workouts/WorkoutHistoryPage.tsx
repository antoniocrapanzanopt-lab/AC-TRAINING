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
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import { useAthletes } from '../../context/AthletesContext';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';

export interface ExerciseSetDetail {
  setNumber: number;
  reps: number;
  weightKg: number;
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

      const { data, error } = await supabase
        .from('workout_sessions')
        .select(`
          id,
          athlete_id,
          workout_id,
          start_time,
          end_time,
          rpe,
          notes,
          workouts ( id, title ),
          athletes ( id, first_name, last_name, email ),
          exercise_logs (
            id,
            set_number,
            reps_completed,
            weight_kg,
            notes,
            workout_exercises ( name, week_number, day_name )
          )
        `)
        .order('end_time', { ascending: false })
        .limit(200);

      if (error) throw error;

      if (data) {
        const feedItems: CoachWorkoutSessionFeedItem[] = data.map((s: any) => {
          // Risoluzione atleta
          const athFromDb = s.athletes;
          const athFromMap = s.athlete_id ? athleteMap.get(s.athlete_id) : null;
          const safeName =
            athFromMap?.fullName ||
            [athFromDb?.first_name, athFromDb?.last_name].filter(Boolean).join(' ') ||
            'Atleta';

          // Calcolo orari e durata
          const endObj = new Date(s.end_time || s.start_time || new Date().toISOString());
          const startObj = new Date(s.start_time || s.end_time || new Date().toISOString());
          const diffMs = Math.max(0, endObj.getTime() - startObj.getTime());
          const durationMin = Math.max(1, Math.round(diffMs / 60000));

          // Raggruppamento esercizi e carichi
          const exMap = new Map<string, { sets: ExerciseSetDetail[]; notesSet: Set<string> }>();
          const logs = s.exercise_logs || [];
          let detectedDay = 'Sessione Allenamento';
          let detectedWeek: number | undefined = undefined;
          let sessionVolume = 0;
          let hasPainInLogs = false;
          const painNotesList: string[] = [];

          logs.forEach((log: any) => {
            if (log.workout_exercises?.day_name && detectedDay === 'Sessione Allenamento') {
              detectedDay = log.workout_exercises.day_name;
            }
            if (log.workout_exercises?.week_number && !detectedWeek) {
              detectedWeek = log.workout_exercises.week_number;
            }

            const exName = log.workout_exercises?.name || 'Esercizio';
            if (!exMap.has(exName)) {
              exMap.set(exName, { sets: [], notesSet: new Set<string>() });
            }
            const entry = exMap.get(exName)!;

            const reps = Number(log.reps_completed) || 0;
            const weight = Number(log.weight_kg) || 0;
            sessionVolume += reps * weight;

            entry.sets.push({
              setNumber: Number(log.set_number) || entry.sets.length + 1,
              reps,
              weightKg: weight,
            });

            if (log.notes) {
              entry.notesSet.add(log.notes);
              if (isPainText(log.notes)) {
                hasPainInLogs = true;
                painNotesList.push(`${exName}: "${log.notes}"`);
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
            athleteId: s.athlete_id || athFromDb?.id || '',
            athleteName: safeName,
            athleteEmail: athFromMap?.email || athFromDb?.email,
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
      }
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
        if (!s.endTime || !s.endTime.startsWith(todayStr)) return false;
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

      // 4. Ricerca Testuale
      if (q) {
        const matchName = s.athleteName.toLowerCase().includes(q);
        const matchTitle = s.workoutTitle.toLowerCase().includes(q);
        const matchDay = s.dayName.toLowerCase().includes(q);
        const matchNotes = (s.notes || '').toLowerCase().includes(q);
        const matchExercises = s.exercises.some((e) => e.name.toLowerCase().includes(q));

        if (!matchName && !matchTitle && !matchDay && !matchNotes && !matchExercises) {
          return false;
        }
      }

      return true;
    });
  }, [sessions, selectedAthleteFilter, periodFilter, alertFilter, searchQuery]);

  // Metriche Riassuntive Globali
  const kpis = useMemo(() => {
    const totalCount = filteredSessions.length;
    const totalTonnageKg = filteredSessions.reduce((sum, s) => sum + s.totalVolumeKg, 0);
    const totalMinutes = filteredSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
    const avgMin = totalCount > 0 ? Math.round(totalMinutes / totalCount) : 0;
    const painCount = filteredSessions.filter((s) => s.hasPainAlert).length;

    const rpeSessions = filteredSessions.filter((s) => s.rpe !== undefined);
    const avgRpe =
      rpeSessions.length > 0
        ? (rpeSessions.reduce((sum, s) => sum + (s.rpe || 0), 0) / rpeSessions.length).toFixed(1)
        : '—';

    return {
      totalCount,
      tonnageFormatted: `${(totalTonnageKg / 1000).toFixed(1)} t`,
      tonnageExactKg: totalTonnageKg,
      avgMinFormatted: `${avgMin} min`,
      avgRpe,
      painCount,
    };
  }, [filteredSessions]);

  const toggleSession = (id: string) => {
    setExpandedSessionIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleNavigateToAthlete = (athleteId: string) => {
    setSelectedAthleteId(athleteId);
    setActiveTab('atleti');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ─── 1. HEADER SEZIONE ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shrink-0">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <span>Cronologia Allenamenti</span>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500 text-black">
                Live Feed
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 font-medium mt-0.5">
              Registro completo delle sedute svolte dagli atleti, carichi sollevati e feedback in tempo reale
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadFeed}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-300 hover:text-white border border-slate-800 transition-all shadow-md cursor-pointer self-start sm:self-auto"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          <span>Aggiorna Dati</span>
        </button>
      </div>

      {/* ─── 2. KPI METRICHE RIASSUNTIVE GLOBALI ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Totale Allenamenti */}
        <div className="p-4 rounded-3xl bg-slate-950/90 border border-slate-800 shadow-xl space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Sedute Eseguite
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">{kpis.totalCount}</span>
            <span className="text-xs text-emerald-400 font-bold flex items-center gap-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> completate
            </span>
          </div>
        </div>

        {/* 2. Volume Complessivo */}
        <div className="p-4 rounded-3xl bg-slate-950/90 border border-slate-800 shadow-xl space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Volume Sollevato
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
              {kpis.tonnageExactKg > 0 ? kpis.tonnageFormatted : '0 kg'}
            </span>
            <span className="text-xs text-slate-500 font-semibold">
              ({kpis.tonnageExactKg.toLocaleString()} kg)
            </span>
          </div>
        </div>

        {/* 3. Durata Media & RPE */}
        <div className="p-4 rounded-3xl bg-slate-950/90 border border-slate-800 shadow-xl space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Durata Media & RPE
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-sky-400 font-mono">
              {kpis.avgMinFormatted}
            </span>
            <span className="text-xs text-slate-400 font-bold">
              • RPE {kpis.avgRpe}
            </span>
          </div>
        </div>

        {/* 4. Alert & Fastidi Segnalati */}
        <div className="p-4 rounded-3xl bg-slate-950/90 border border-slate-800 shadow-xl space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Segnalazioni Dolori
          </span>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl sm:text-3xl font-black font-mono ${
                kpis.painCount > 0 ? 'text-rose-400' : 'text-slate-400'
              }`}
            >
              {kpis.painCount}
            </span>
            <span className="text-xs text-slate-500 font-semibold">sessioni con alert</span>
          </div>
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
              placeholder="Cerca atleta, scheda o esercizio..."
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

        {/* Indicatore Conteggio Risultati */}
        <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-1 pt-1 border-t border-slate-800/60">
          <span>
            Visualizzazione: <strong className="text-white">{filteredSessions.length}</strong> sessioni trovate
          </span>
          {(searchQuery || selectedAthleteFilter !== 'all' || periodFilter !== 'all' || alertFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedAthleteFilter('all');
                setPeriodFilter('all');
                setAlertFilter('all');
              }}
              className="text-amber-400 hover:underline cursor-pointer"
            >
              Azzera filtri
            </button>
          )}
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
                            className="text-base font-black text-white hover:text-amber-300 transition-colors tracking-tight text-left cursor-pointer"
                          >
                            {session.athleteName}
                          </button>

                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-900 text-slate-300 border border-slate-800">
                            {session.dayName}
                          </span>

                          <span className="text-xs font-black text-amber-400 bg-amber-500/15 px-2.5 py-0.5 rounded-lg border border-amber-500/30 flex items-center gap-1 font-mono">
                            <Calendar className="w-3 h-3 text-amber-400" />
                            Settimana {session.weekNumber || 1}
                          </span>

                          {session.hasPainAlert && (
                            <span className="text-[10px] font-black text-rose-300 bg-rose-500/20 px-2.5 py-0.5 rounded-full border border-rose-500/40 flex items-center gap-1">
                              <ShieldAlert className="w-3 h-3 text-rose-400" /> Fastidio Segnalato
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap font-medium">
                          <span className="flex items-center gap-1 text-slate-300">
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
                        className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
                        title={isExpanded ? 'Comprimi esercizi' : 'Espandi esercizi'}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Note Questionario / Fastidi */}
                  {session.notes && (
                    <div
                      className={`p-3.5 rounded-2xl border text-xs italic ${
                        session.hasPainAlert
                          ? 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                          : 'bg-slate-900/80 border-slate-800 text-slate-300'
                      }`}
                    >
                      <span className="font-bold not-italic mr-1.5 uppercase text-[10px] tracking-wider text-amber-400 block sm:inline">
                        Feedback Questionario:
                      </span>
                      "{session.notes}"
                    </div>
                  )}

                  {/* Dettaglio Esercizi Espanso */}
                  {isExpanded && (
                    <div className="pt-3 border-t border-slate-800/80 space-y-3 animate-in fade-in duration-150">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                        Esercizi e Serie Completate ({session.exercises.length}):
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {session.exercises.map((ex, exIdx) => (
                          <div
                            key={exIdx}
                            className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <h5 className="text-xs font-black text-white truncate">{ex.name}</h5>
                              {ex.totalVolumeKg > 0 && (
                                <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                  {ex.totalVolumeKg.toLocaleString()} kg tot
                                </span>
                              )}
                            </div>

                            {/* Serie */}
                            <div className="flex flex-wrap gap-1.5">
                              {ex.sets.map((s, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-bold text-slate-200 font-mono"
                                >
                                  S{s.setNumber}: {s.reps}r @ {s.weightKg}kg
                                </span>
                              ))}
                            </div>

                            {ex.notes && (
                              <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/60 italic">
                                Nota: "{ex.notes}"
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
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
