import React, { useState, useMemo } from 'react';
import {
  History,
  Dumbbell,
  Search,
  Calendar,
  Clock,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Zap,
  FileText,
  Edit3,
} from 'lucide-react';
import { isPainFeedback } from '../../../utils/painAnalysis';
import {
  CoachWorkoutSessionEditModal,
  EditableWorkoutSession,
} from './CoachWorkoutSessionEditModal';

export interface RawWorkoutSession {
  id: string;
  athlete_id: string;
  workout_id: string;
  start_time: string;
  end_time?: string;
  notes?: string;
  rpe?: number;
  workouts?: { id?: string; title?: string; total_weeks?: number };
}

export interface RawExerciseLogItem {
  id: string;
  session_id: string;
  exercise_id?: string;
  set_number: number;
  reps_completed: number;
  weight_kg: number;
  notes?: string;
}

export interface ExerciseMeta {
  name: string;
  day_name?: string;
  week_number?: number;
}

interface AthleteWorkoutHistorySectionProps {
  athleteId: string;
  athleteName: string;
  activeWorkoutTitle: string;
  sessions: RawWorkoutSession[];
  logs: RawExerciseLogItem[];
  exerciseMetaMap: Map<string, ExerciseMeta>;
  onDataUpdated: () => Promise<void> | void;
  onNavigateToWorkouts: (athleteId: string) => void;
  onNavigateToChat: (athleteId: string) => void;
  onOpenCopilot: (athleteId: string, customAlert?: { category: string; summary?: string }) => void;
}

interface ResolvedSessionItem {
  id: string;
  athleteId: string;
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
  exercises: {
    exerciseId: string;
    name: string;
    sets: {
      logId?: string;
      setNumber: number;
      reps: number;
      weightKg: number;
      rpe?: string;
      notes?: string;
    }[];
    notes?: string;
    totalVolumeKg: number;
  }[];
}

export const AthleteWorkoutHistorySection: React.FC<AthleteWorkoutHistorySectionProps> = ({
  athleteId,
  athleteName,
  activeWorkoutTitle,
  sessions,
  logs,
  exerciseMetaMap,
  onDataUpdated,
  onNavigateToWorkouts,
  onNavigateToChat,
  onOpenCopilot,
}) => {
  // Filtri
  const [searchQuery, setSearchQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState<'all' | '30d' | '90d'>('all');
  const [alertFilter, setAlertFilter] = useState<'all' | 'pain_only' | 'high_rpe'>('all');
  const [expandedSessionIds, setExpandedSessionIds] = useState<Record<string, boolean>>({});

  // Modale di correzione
  const [editingSession, setEditingSession] = useState<EditableWorkoutSession | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Mappa log per sessionId
  const logsBySession = useMemo(() => {
    const map = new Map<string, RawExerciseLogItem[]>();
    logs.forEach((log) => {
      if (!map.has(log.session_id)) {
        map.set(log.session_id, []);
      }
      map.get(log.session_id)!.push(log);
    });
    return map;
  }, [logs]);

  // Risoluzione sessioni dell'atleta
  const athleteSessions: ResolvedSessionItem[] = useMemo(() => {
    const rawForAthlete = sessions.filter((s) => s.athlete_id === athleteId);

    // Ordina dalla più recente alla meno recente
    const sorted = [...rawForAthlete].sort(
      (a, b) =>
        new Date(b.end_time || b.start_time || 0).getTime() -
        new Date(a.end_time || a.start_time || 0).getTime()
    );

    return sorted.map((s, idx) => {
      const startObj = new Date(s.start_time || s.end_time || new Date().toISOString());
      const endObj = new Date(s.end_time || s.start_time || new Date().toISOString());
      const diffMs = Math.max(0, endObj.getTime() - startObj.getTime());
      const durationMinutes = Math.max(1, Math.round(diffMs / 60000));

      const rawTitle = s.workouts?.title;
      const isPlaceholder =
        !rawTitle ||
        rawTitle.trim() === '' ||
        rawTitle.toLowerCase() === 'aaaa' ||
        rawTitle.toLowerCase() === 'allenamento' ||
        rawTitle.toLowerCase() === 'allenamento senza nome';
      const workoutTitle = isPlaceholder ? activeWorkoutTitle : rawTitle;

      const sessionLogs = logsBySession.get(s.id) || [];
      const exMap = new Map<
        string,
        {
          exerciseId: string;
          name: string;
          sets: {
            logId?: string;
            setNumber: number;
            reps: number;
            weightKg: number;
            rpe?: string;
            notes?: string;
          }[];
          notesSet: Set<string>;
        }
      >();

      let detectedDay: string | undefined = undefined;
      let detectedWeek: number | undefined = undefined;
      let sessionVolumeKg = 0;
      let hasPainInLogs = false;
      const painNotesList: string[] = [];

      sessionLogs.forEach((log) => {
        const meta = log.exercise_id ? exerciseMetaMap.get(log.exercise_id) : undefined;
        const exName = meta?.name || 'Esercizio';
        const exId = log.exercise_id || exName;

        if (meta?.day_name && !detectedDay) detectedDay = meta.day_name;
        if (meta?.week_number && !detectedWeek) detectedWeek = meta.week_number;

        if (!exMap.has(exId)) {
          exMap.set(exId, {
            exerciseId: log.exercise_id || '',
            name: exName,
            sets: [],
            notesSet: new Set<string>(),
          });
        }
        const entry = exMap.get(exId)!;

        const reps = Number(log.reps_completed) || 0;
        const weight = Number(log.weight_kg) || 0;
        sessionVolumeKg += reps * weight;

        let extractedRpe: string | undefined = undefined;
        if (log.notes && log.notes.includes('RPE:')) {
          const match = log.notes.match(/RPE:\s*([\d.]+)/i);
          if (match) extractedRpe = match[1];
        }

        entry.sets.push({
          logId: log.id,
          setNumber: Number(log.set_number) || entry.sets.length + 1,
          reps,
          weightKg: weight,
          rpe: extractedRpe,
          notes: log.notes,
        });

        if (log.notes) {
          const cleanNote = log.notes
            .replace(/RPE:\s*[\d.]+\s*\|\s*/i, '')
            .replace(/Feedback:\s*/i, '')
            .trim();
          if (cleanNote) {
            entry.notesSet.add(cleanNote);
          }
          if (isPainFeedback(log.notes)) {
            hasPainInLogs = true;
            painNotesList.push(`${exName}: "${cleanNote || log.notes}"`);
          }
        }
      });

      const dayLetters = ['Giorno A', 'Giorno B', 'Giorno C', 'Giorno D', 'Giorno E'];
      const computedDay =
        detectedDay || dayLetters[idx % 3] || `Seduta ${(idx % 3) + 1}`;
      const computedWeek =
        detectedWeek || Math.min(s.workouts?.total_weeks || 4, Math.floor(idx / 3) + 1);

      const exercises = Array.from(exMap.values()).map((item) => {
        item.sets.sort((a, b) => a.setNumber - b.setNumber);
        const notes = Array.from(item.notesSet).join(' | ');
        const totalVolumeKg = item.sets.reduce(
          (sum, st) => sum + st.reps * st.weightKg,
          0
        );
        return {
          exerciseId: item.exerciseId,
          name: item.name,
          sets: item.sets,
          notes,
          totalVolumeKg,
        };
      });

      const hasPainInSessionNotes = isPainFeedback(s.notes || '');
      if (hasPainInSessionNotes && s.notes) {
        painNotesList.push(`Questionario: "${s.notes}"`);
      }

      const hasPainAlert = hasPainInLogs || hasPainInSessionNotes;
      const rpeVal = Number(s.rpe) || undefined;
      const isHighRpe = rpeVal !== undefined && rpeVal >= 8.5;

      return {
        id: s.id,
        athleteId,
        workoutId: s.workout_id || s.workouts?.id,
        workoutTitle,
        dayName: computedDay,
        weekNumber: computedWeek,
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
        durationMinutes,
        rpe: rpeVal,
        notes: s.notes,
        totalVolumeKg: sessionVolumeKg,
        hasPainAlert,
        painDetails: painNotesList.length > 0 ? painNotesList.join(' • ') : undefined,
        isHighRpe,
        exercises,
      };
    });
  }, [sessions, logs, athleteId, activeWorkoutTitle, exerciseMetaMap, logsBySession]);

  // Filtraggio delle sessioni
  const filteredSessions = useMemo(() => {
    const now = new Date().getTime();
    const q = searchQuery.toLowerCase().trim();

    return athleteSessions.filter((s) => {
      // 1. Filtro Periodo
      if (periodFilter === '30d') {
        const diff = now - new Date(s.endTime || s.startTime || now).getTime();
        if (diff > 30 * 24 * 60 * 60 * 1000) return false;
      } else if (periodFilter === '90d') {
        const diff = now - new Date(s.endTime || s.startTime || now).getTime();
        if (diff > 90 * 24 * 60 * 60 * 1000) return false;
      }

      // 2. Filtro Alert
      if (alertFilter === 'pain_only' && !s.hasPainAlert) {
        return false;
      }
      if (alertFilter === 'high_rpe' && !s.isHighRpe) {
        return false;
      }

      // 3. Ricerca Testo
      if (q) {
        const matchWorkout = s.workoutTitle.toLowerCase().includes(q);
        const matchDay = s.dayName.toLowerCase().includes(q);
        const matchNotes = (s.notes || '').toLowerCase().includes(q);
        const matchExercises = s.exercises.some(
          (e) =>
            e.name.toLowerCase().includes(q) ||
            (e.notes || '').toLowerCase().includes(q)
        );

        if (!matchWorkout && !matchDay && !matchNotes && !matchExercises) {
          return false;
        }
      }

      return true;
    });
  }, [athleteSessions, searchQuery, periodFilter, alertFilter]);

  // Statistiche riassuntive
  const stats = useMemo(() => {
    const totalSessions = athleteSessions.length;
    const totalTonnageKg = athleteSessions.reduce((sum, s) => sum + s.totalVolumeKg, 0);
    const avgRpe =
      totalSessions > 0
        ? (
            athleteSessions.reduce((sum, s) => sum + (s.rpe || 0), 0) /
            Math.max(1, athleteSessions.filter((s) => s.rpe).length)
          ).toFixed(1)
        : '0.0';
    const totalPainAlerts = athleteSessions.filter((s) => s.hasPainAlert).length;

    return {
      totalSessions,
      totalTonnageTon: (totalTonnageKg / 1000).toFixed(1),
      avgRpe,
      totalPainAlerts,
    };
  }, [athleteSessions]);

  const toggleExpand = (id: string) => {
    setExpandedSessionIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleExpandAll = () => {
    const allExp: Record<string, boolean> = {};
    filteredSessions.forEach((s) => {
      allExp[s.id] = true;
    });
    setExpandedSessionIds(allExp);
  };

  const handleCollapseAll = () => {
    setExpandedSessionIds({});
  };

  // Apertura modale di modifica
  const handleOpenEditModal = (session: ResolvedSessionItem) => {
    const editable: EditableWorkoutSession = {
      id: session.id,
      athleteId: session.athleteId,
      athleteName,
      workoutId: session.workoutId,
      workoutTitle: session.workoutTitle,
      dayName: session.dayName,
      weekNumber: session.weekNumber,
      startTime: session.startTime,
      endTime: session.endTime,
      dateFormatted: session.dateFormatted,
      timeFormatted: session.timeFormatted,
      durationMinutes: session.durationMinutes,
      rpe: session.rpe,
      notes: session.notes,
      exercises: session.exercises.map((ex) => ({
        exerciseId: ex.exerciseId,
        name: ex.name,
        sets: ex.sets.map((s) => ({
          logId: s.logId,
          setNumber: s.setNumber,
          reps: s.reps,
          weightKg: s.weightKg,
          rpe: s.rpe,
          notes: s.notes,
        })),
      })),
    };
    setEditingSession(editable);
    setIsEditModalOpen(true);
  };

  return (
    <div className="p-5 sm:p-7 rounded-3xl bg-slate-950/90 border border-slate-800 shadow-2xl space-y-6">
      {/* ─── 1. HEADER SEZIONE CRONOLOGIA & KPI ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10 shrink-0">
            <History className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Cronologia Allenamenti & Registro Sedute
              </h3>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                Live Feed
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Ispeziona i carichi reali eseguiti da {athleteName}, leggi i feedback e adotta correzioni immediate.
            </p>
          </div>
        </div>

        {/* 4 Mini Statistiche Rapide */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 self-stretch md:self-auto">
          <div className="px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Sedute
            </span>
            <span className="text-sm font-black font-mono text-white">
              {stats.totalSessions}
            </span>
          </div>

          <div className="px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Volume
            </span>
            <span className="text-sm font-black font-mono text-emerald-400">
              {stats.totalTonnageTon} t
            </span>
          </div>

          <div className="px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              RPE Medio
            </span>
            <span className="text-sm font-black font-mono text-sky-400">
              {stats.avgRpe}
            </span>
          </div>

          <div className="px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Alert
            </span>
            <span className={`text-sm font-black font-mono ${stats.totalPainAlerts > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
              {stats.totalPainAlerts}
            </span>
          </div>
        </div>
      </div>

      {/* ─── 2. BARRA FILTRI RAPIDI & RICERCA ─── */}
      <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          {/* Cerca Testo */}
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca esercizio, giorno, carico o nota..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-medium focus:outline-none focus:border-amber-500 transition-colors placeholder:text-slate-500"
            />
          </div>

          {/* Filtro Periodo */}
          <div className="sm:col-span-3">
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as 'all' | '30d' | '90d')}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-bold focus:outline-none focus:border-amber-500 transition-colors"
            >
              <option value="all">Tutto lo Storico</option>
              <option value="30d">Ultimi 30 Giorni</option>
              <option value="90d">Ultimi 90 Giorni</option>
            </select>
          </div>

          {/* Filtro Alert */}
          <div className="sm:col-span-3">
            <select
              value={alertFilter}
              onChange={(e) => setAlertFilter(e.target.value as 'all' | 'pain_only' | 'high_rpe')}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-bold focus:outline-none focus:border-amber-500 transition-colors"
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
            Visualizzazione: <strong className="text-white">{filteredSessions.length}</strong> di {athleteSessions.length} sedute
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

            {(searchQuery || periodFilter !== 'all' || alertFilter !== 'all') && (
              <>
                <span className="text-slate-600">•</span>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
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

      {/* ─── 3. FEED DELLE SESSIONI REGISTRATE ─── */}
      <div className="space-y-4">
        {filteredSessions.length === 0 ? (
          <div className="p-10 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-sm">
              <Dumbbell className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-black text-white">Nessuna sessione registrata trovata</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Non ci sono allenamenti che corrispondono ai filtri attuali. Prova ad azzerare la ricerca.
            </p>
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
                    : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 shadow-xl'
                }`}
              >
                {/* Header Seduta */}
                <div className="p-5 sm:p-6 space-y-4">
                  {/* Riga 1: Info Principali + Badge Metriche + Azioni Rapide */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Dettagli Seduta */}
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-xs font-black text-amber-400 bg-amber-500/15 px-2.5 py-0.5 rounded-lg border border-amber-500/30 flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3 text-amber-400" />
                          Settimana {session.weekNumber || 1}
                        </span>

                        <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-slate-950 text-slate-200 border border-slate-800">
                          {session.dayName}
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

                    {/* Metriche & Tasti Azione Coach */}
                    <div className="flex items-center gap-2 flex-wrap self-start lg:self-center">
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {session.durationMinutes} min
                      </span>

                      {session.totalVolumeKg > 0 && (
                        <span className="text-xs font-mono font-bold text-slate-200 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
                          {session.totalVolumeKg.toLocaleString()} kg
                        </span>
                      )}

                      {session.rpe !== undefined && (
                        <span className="text-xs font-bold text-sky-300 bg-sky-500/10 px-2.5 py-1 rounded-xl border border-sky-500/20">
                          RPE {session.rpe}/10
                        </span>
                      )}

                      {/* Bottone Toggle Dettagli */}
                      <button
                        type="button"
                        onClick={() => toggleExpand(session.id)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-sm"
                        title={isExpanded ? 'Comprimi esercizi' : 'Espandi esercizi'}
                      >
                        <span>{isExpanded ? 'Chiudi' : 'Vedi Carichi'}</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-amber-400" /> : <ChevronDown className="w-4 h-4 text-amber-400" />}
                      </button>

                      {/* Bottone Azione: CORREGGI SEDUTA */}
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(session)}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                        title="Modifica carichi, serie, RPE o note di questa seduta"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Correggi Seduta</span>
                      </button>
                    </div>
                  </div>

                  {/* Note Questionario / Fastidi */}
                  {session.notes && (
                    <div
                      className={`p-3.5 rounded-2xl border text-xs ${
                        session.hasPainAlert
                          ? 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                          : 'bg-slate-950/80 border-slate-800 text-slate-300'
                      }`}
                    >
                      <span className="font-black mr-1.5 uppercase text-[10px] tracking-wider text-amber-400 block sm:inline">
                        Questionario Fine Allenamento:
                      </span>
                      "{session.notes}"
                    </div>
                  )}

                  {/* ─── DETTAGLIO ESERCIZI ESPANSO ─── */}
                  {isExpanded && (
                    <div className="pt-4 border-t border-slate-800/80 space-y-4 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
                          <Dumbbell className="w-4 h-4 text-amber-400" />
                          Esercizi Eseguiti & Carichi Utilizzati ({session.exercises.length}):
                        </span>

                        {/* Azioni Rapide Esercizi */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onNavigateToWorkouts(athleteId)}
                            className="text-[11px] font-bold text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <FileText className="w-3 h-3 text-amber-400" />
                            <span>Adotta Correzione Scheda</span>
                          </button>
                          <span className="text-slate-700">•</span>
                          <button
                            type="button"
                            onClick={() => onNavigateToChat(athleteId)}
                            className="text-[11px] font-bold text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <MessageSquare className="w-3 h-3 text-purple-400" />
                            <span>Invia in Chat</span>
                          </button>
                          {session.hasPainAlert && (
                            <>
                              <span className="text-slate-700">•</span>
                              <button
                                type="button"
                                onClick={() =>
                                  onOpenCopilot(athleteId, {
                                    category: 'pain',
                                    summary: session.painDetails || 'Segnalazione fastidio nella seduta',
                                  })
                                }
                                className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Zap className="w-3 h-3" />
                                <span>Intervento Copilot</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {session.exercises.length === 0 ? (
                        <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 text-xs text-slate-400">
                          Nessun carico/set registrato singolarmente in questa sessione.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          {session.exercises.map((ex, exIdx) => (
                            <div
                              key={ex.exerciseId || exIdx}
                              className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3 shadow-md"
                            >
                              {/* Nome Esercizio & Volume Totale */}
                              <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
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
                                    key={s.logId || sIdx}
                                    className="grid grid-cols-12 gap-1 items-center p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono"
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

      {/* ─── MODALE DI MODIFICA/CORREZIONE SEDUTA COACH ─── */}
      {editingSession && isEditModalOpen && (
        <CoachWorkoutSessionEditModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingSession(null);
          }}
          session={editingSession}
          athleteName={athleteName}
          onSessionSaved={onDataUpdated}
        />
      )}
    </div>
  );
};
