import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  AlertTriangle,
  TrendingDown,
  Clock,
  TrendingUp,
  ChevronRight,
  ShieldAlert,
  Flame,
  Zap,
  CheckCircle2,
  Dumbbell,
  Calendar,
} from 'lucide-react';
import { useAthletes } from '../../../context/AthletesContext';
import { AICopilotActionModal, CopilotAlertContext } from './AICopilotActionModal';
import { supabase } from '../../../lib/supabase';

interface CriticalNoteAlert {
  id: string;
  athleteId: string;
  athleteName: string;
  workoutTitle: string;
  weekNumber?: number | string;
  dayName?: string;
  exerciseName: string;
  noteText: string;
  severity: 'high' | 'medium';
  date: string;
}

interface PlateauAlert {
  id: string;
  athleteId: string;
  athleteName: string;
  exerciseName: string;
  currentWeightKg: number;
  weeksStagnant: number;
  suggestion: string;
}

interface InactivityAlert {
  id: string;
  athleteId: string;
  athleteName: string;
  lastWorkoutDate: string;
  daysInactive: number;
}

interface PRProgression {
  id: string;
  athleteId: string;
  athleteName: string;
  exerciseName: string;
  gainDescription: string;
  date: string;
}

export const AITrainingCopilotWidget: React.FC = () => {
  const { athletes } = useAthletes();

  const [activeSubTab, setActiveSubTab] = useState<'critical_notes' | 'plateaus' | 'inactivity' | 'progressions'>('critical_notes');

  // Modale Azione Decisionale IA
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<CopilotAlertContext | null>(null);

  const [customNotes, setCustomNotes] = useState<CriticalNoteAlert[]>([]);
  const [realDbNotes, setRealDbNotes] = useState<CriticalNoteAlert[]>([]);
  const [realPRs, setRealPRs] = useState<PRProgression[]>([]);
  const [realInactivity, setRealInactivity] = useState<InactivityAlert[]>([]);

  // Carica le note reali registrate dagli atleti sia locali che da Supabase
  React.useEffect(() => {
    const loadCustomNotes = () => {
      try {
        const saved = JSON.parse(localStorage.getItem('builder_copilot_critical_notes') || '[]');
        setCustomNotes(saved);
      } catch (e) {
        console.warn('Errore lettura note copilot locale:', e);
      }
    };

    const fetchCopilotDbData = async () => {
      try {
        // 0. Mappa delle schede attive per athleteId
        const { data: activeAssignments } = await supabase
          .from('athlete_assigned_workouts')
          .select('athlete_id, workout_id, workouts(title)')
          .eq('is_active', true);

        const activeWorkoutMap = new Map<string, string>();
        if (activeAssignments) {
          activeAssignments.forEach((a: any) => {
            if (a.athlete_id && a.workouts?.title) {
              activeWorkoutMap.set(a.athlete_id, a.workouts.title);
            }
          });
        }

        // 1a. Fetch note degli esercizi dal DB con settimana ed esercizio
        const { data: logsData } = await supabase
          .from('exercise_logs')
          .select(`
            id,
            notes,
            created_at,
            workout_exercises ( name, week_number, day_name ),
            workout_sessions ( athlete_id, workout_id, workouts ( title ), athletes:athlete_id ( first_name, last_name ) )
          `)
          .not('notes', 'is', null)
          .order('created_at', { ascending: false })
          .limit(20);

        // 1b. Fetch note dei questionari sessione dal DB
        const { data: questionnaireSessionsData } = await supabase
          .from('workout_sessions')
          .select(`
            id,
            notes,
            rpe,
            start_time,
            athlete_id,
            workout_id,
            workouts ( title ),
            athletes:athlete_id ( first_name, last_name )
          `)
          .not('notes', 'is', null)
          .order('start_time', { ascending: false })
          .limit(20);

        const dbNotes: CriticalNoteAlert[] = [];

        if (logsData) {
          logsData
            .filter((l: any) => l.notes && l.notes.trim().length > 0)
            .forEach((l: any) => {
              const ath = l.workout_sessions?.athletes;
              const athName = ath ? `${ath.first_name || ''} ${ath.last_name || ''}`.trim() : 'Atleta';
              const isHigh = /dolore|fastidio|male|pizzico|infortunio|strappo/i.test(l.notes);
              const athId = l.workout_sessions?.athlete_id || 'ath-1';
              
              const sessionWorkoutTitle = l.workout_sessions?.workouts?.title;
              const fallbackWorkoutTitle = activeWorkoutMap.get(athId);
              const resolvedWorkoutTitle = (sessionWorkoutTitle && sessionWorkoutTitle.trim() !== '' && sessionWorkoutTitle.toLowerCase() !== 'allenamento') 
                ? sessionWorkoutTitle 
                : (fallbackWorkoutTitle || sessionWorkoutTitle || 'Scheda Personalizzata');

              const weekNum = l.workout_exercises?.week_number || 1;
              const dayName = l.workout_exercises?.day_name || undefined;

              dbNotes.push({
                id: `db-cn-${l.id}`,
                athleteId: athId,
                athleteName: athName || 'Atleta Registrato',
                workoutTitle: resolvedWorkoutTitle,
                weekNumber: weekNum,
                dayName,
                exerciseName: l.workout_exercises?.name || 'Esercizio',
                noteText: l.notes,
                severity: isHigh ? 'high' : 'medium',
                date: l.created_at ? new Date(l.created_at).toLocaleDateString('it-IT') : 'Oggi'
              });
            });
        }

        if (questionnaireSessionsData) {
          questionnaireSessionsData
            .filter((s: any) => s.notes && s.notes.trim().length > 0)
            .forEach((s: any) => {
              const ath = s.athletes;
              const athName = ath ? `${ath.first_name || ''} ${ath.last_name || ''}`.trim() : 'Atleta';
              const isHigh = /dolore|fastidio|male|pizzico|infortunio|strappo|dolore articolare 4|dolore articolare 5/i.test(s.notes);
              const athId = s.athlete_id || 'ath-1';

              const sessionWorkoutTitle = s.workouts?.title;
              const fallbackWorkoutTitle = activeWorkoutMap.get(athId);
              const resolvedWorkoutTitle = (sessionWorkoutTitle && sessionWorkoutTitle.trim() !== '' && sessionWorkoutTitle.toLowerCase() !== 'allenamento completo') 
                ? sessionWorkoutTitle 
                : (fallbackWorkoutTitle || sessionWorkoutTitle || 'Scheda Personalizzata');

              dbNotes.push({
                id: `db-sn-${s.id}`,
                athleteId: athId,
                athleteName: athName || 'Atleta Registrato',
                workoutTitle: resolvedWorkoutTitle,
                weekNumber: 1,
                exerciseName: 'Questionario Post-Workout',
                noteText: s.notes,
                severity: isHigh ? 'high' : 'medium',
                date: s.start_time ? new Date(s.start_time).toLocaleDateString('it-IT') : 'Oggi'
              });
            });
        }

        setRealDbNotes(dbNotes);

        // 2. Fetch PR dal DB
        const { data: prsData } = await supabase
          .from('athlete_max_lifts')
          .select(`
            id,
            exercise_name,
            weight_kg,
            calculated_1rm,
            date,
            athlete_id,
            athletes:athlete_id ( first_name, last_name )
          `)
          .order('date', { ascending: false })
          .limit(10);

        if (prsData) {
          const mappedPRs: PRProgression[] = prsData.map((pr: any) => {
            const ath = pr.athletes;
            const athName = ath ? `${ath.first_name || ''} ${ath.last_name || ''}`.trim() : 'Atleta';
            return {
              id: `db-pr-${pr.id}`,
              athleteId: pr.athlete_id,
              athleteName: athName || 'Atleta Registrato',
              exerciseName: pr.exercise_name,
              gainDescription: `Nuovo Record: ${pr.calculated_1rm}kg 1RM (${pr.weight_kg}kg sollevati)`,
              date: pr.date ? new Date(pr.date).toLocaleDateString('it-IT') : 'Oggi'
            };
          });
          setRealPRs(mappedPRs);
        }

        // 3. Calcola inattività reale per gli atleti
        const { data: sessionsData } = await supabase
          .from('workout_sessions')
          .select('athlete_id, end_time')
          .not('end_time', 'is', null)
          .order('end_time', { ascending: false });

        if (sessionsData && athletes.length > 0) {
          const now = new Date().getTime();
          const inactiveList: InactivityAlert[] = [];

          athletes.forEach(ath => {
            const lastSess = sessionsData.find((s: any) => s.athlete_id === ath.id);
            if (lastSess && lastSess.end_time) {
              const diffDays = Math.floor((now - new Date(lastSess.end_time).getTime()) / (1000 * 60 * 60 * 24));
              if (diffDays >= 7) {
                inactiveList.push({
                  id: `in-real-${ath.id}`,
                  athleteId: ath.id,
                  athleteName: ath.fullName,
                  lastWorkoutDate: `${diffDays} giorni fa`,
                  daysInactive: diffDays
                });
              }
            }
          });

          setRealInactivity(inactiveList);
        }
      } catch (e) {
        console.warn('Errore fetch copilot DB:', e);
      }
    };

    loadCustomNotes();
    fetchCopilotDbData();

    window.addEventListener('copilot_notes_updated', () => {
      loadCustomNotes();
      fetchCopilotDbData();
    });
    return () => window.removeEventListener('copilot_notes_updated', loadCustomNotes);
  }, [athletes]);

  // Note Reali Deduplicate per l'analisi tecnica delle schede
  const criticalNotes: CriticalNoteAlert[] = useMemo(() => {
    const raw = [...customNotes, ...realDbNotes];
    const seen = new Set<string>();
    const deduplicated: CriticalNoteAlert[] = [];

    for (const item of raw) {
      const key = `${item.athleteId}-${item.exerciseName}-${item.noteText.trim().toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(item);
      }
    }

    return deduplicated;
  }, [customNotes, realDbNotes]);

  const plateaus: PlateauAlert[] = useMemo(() => {
    return [];
  }, []);

  const inactivities: InactivityAlert[] = useMemo(() => {
    return realInactivity;
  }, [realInactivity]);

  const progressions: PRProgression[] = useMemo(() => {
    return realPRs;
  }, [realPRs]);

  const handleOpenActionModal = (context: CopilotAlertContext) => {
    setSelectedAlert(context);
    setIsActionModalOpen(true);
  };

  return (
    <div className="p-6 rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 shadow-2xl space-y-6 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--color-primary)]/5 rounded-full blur-[80px] pointer-events-none group-hover:bg-[var(--color-primary)]/10 transition-all duration-700" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-rose-500/5 rounded-full blur-[60px] pointer-events-none transition-all duration-700" />
      
      <div className="relative z-10 space-y-6">
        {/* Header Widget */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-black text-white">AI Athlete Training Copilot</h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[var(--color-primary)] text-black uppercase tracking-wider">
              Gemini 3.6 Flash
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            L'assistente IA basato su Google Gemini 3.6 Flash scansiona in tempo reale le schede degli atleti per segnalare dolori, stallo carichi ed inattività.
          </p>
        </div>

        {/* Sub-Tabs Selector */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveSubTab('critical_notes')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeSubTab === 'critical_notes'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" /> Note & Fastidi ({criticalNotes.length})
          </button>
          <button
            onClick={() => setActiveSubTab('plateaus')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeSubTab === 'plateaus'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" /> Plateau ({plateaus.length})
          </button>
          <button
            onClick={() => setActiveSubTab('inactivity')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeSubTab === 'inactivity'
                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> Inattività ({inactivities.length})
          </button>
          <button
            onClick={() => setActiveSubTab('progressions')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeSubTab === 'progressions'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" /> Record ({progressions.length})
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: NOTE & FASTIDI SEGNALATI */}
      {activeSubTab === 'critical_notes' && (
        <div className="space-y-3">
          {criticalNotes.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto opacity-80" />
              <p className="text-sm font-bold text-slate-300">Nessuna nota o segnalazione critica al momento</p>
              <p className="text-xs text-slate-500">I feedback ed eventuali fastidi segnalati dagli atleti appariranno qui in automatico.</p>
            </div>
          ) : (
            criticalNotes.map(item => (
              <div
                key={item.id}
                onClick={() => handleOpenActionModal({
                  athleteId: item.athleteId,
                  athleteName: item.athleteName,
                  workoutTitle: item.workoutTitle,
                  weekNumber: item.weekNumber,
                  dayName: item.dayName,
                  exerciseName: item.exerciseName,
                  noteText: item.noteText,
                  type: 'critical_note',
                })}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-rose-500/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 shrink-0 mt-0.5">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h4 className="text-sm font-black text-white group-hover:text-rose-400 transition-colors">
                        {item.athleteName}
                      </h4>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <Dumbbell className="w-3 h-3 text-amber-400 shrink-0" />
                        Scheda: {item.workoutTitle}
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-sky-500/10 text-sky-300 border border-sky-500/30 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-sky-400 shrink-0" />
                        Settimana {item.weekNumber || 1}{item.dayName ? ` • ${item.dayName}` : ''}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">• {item.date}</span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                      <strong className="text-rose-400 font-bold">{item.exerciseName}:</strong> "{item.noteText}"
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-primary)] group-hover:text-white shrink-0 self-end sm:self-center bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
                  <Zap className="w-4 h-4 text-[var(--color-primary)]" />
                  <span>Prendi Decisione IA</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* SUB-TAB 2: ANALISI PLATEAU / STALLO CARICHI */}
      {activeSubTab === 'plateaus' && (
        <div className="space-y-3">
          {plateaus.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto opacity-80" />
              <p className="text-sm font-bold text-slate-300">Nessuno stallo nei carichi rilevato</p>
              <p className="text-xs text-slate-500">I carichi degli atleti stanno progredendo regolarmente.</p>
            </div>
          ) : (
            plateaus.map(item => (
              <div
                key={item.id}
                onClick={() => handleOpenActionModal({
                  athleteId: item.athleteId,
                  athleteName: item.athleteName,
                  exerciseName: item.exerciseName,
                  suggestion: item.suggestion,
                  type: 'plateau',
                })}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0 mt-0.5">
                    <TrendingDown className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-black text-white group-hover:text-amber-400 transition-colors">
                        {item.athleteName}
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        Stallo da {item.weeksStagnant} settimane
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      Esercizio: <strong className="text-white">{item.exerciseName}</strong> ({item.currentWeightKg} kg)
                    </p>
                    <p className="text-xs text-amber-300/90 mt-1 bg-amber-950/30 p-2.5 rounded-xl border border-amber-900/40">
                      💡 <strong>Suggerimento IA:</strong> {item.suggestion}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-primary)] group-hover:text-white shrink-0 self-end sm:self-center bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
                  <Zap className="w-4 h-4 text-[var(--color-primary)]" />
                  <span>Varia Programma IA</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* SUB-TAB 3: INATTIVITÀ & COSTANZA SCHEDE */}
      {activeSubTab === 'inactivity' && (
        <div className="space-y-3">
          {inactivities.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto opacity-80" />
              <p className="text-sm font-bold text-slate-300">Tutti gli atleti sono attivi</p>
              <p className="text-xs text-slate-500">Tutti gli atleti hanno ultimato i loro allenamenti negli ultimi 7 giorni.</p>
            </div>
          ) : (
            inactivities.map(item => (
              <div
                key={item.id}
                onClick={() => handleOpenActionModal({
                  athleteId: item.athleteId,
                  athleteName: item.athleteName,
                  type: 'inactivity',
                })}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-orange-500/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white group-hover:text-orange-400 transition-colors">
                      {item.athleteName}
                    </h4>
                    <span className="text-xs text-slate-400 block">
                      Nessuna scheda ultimata negli ultimi <strong className="text-orange-400">{item.daysInactive} giorni</strong> (Ultimo allenamento: {item.lastWorkoutDate})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-primary)] group-hover:text-white shrink-0 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
                  <Zap className="w-4 h-4 text-[var(--color-primary)]" />
                  <span>Gestisci con IA</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* SUB-TAB 4: RECORD & PROGRESSIONI CARICHI */}
      {activeSubTab === 'progressions' && (
        <div className="space-y-3">
          {progressions.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 text-center text-slate-400 space-y-2">
              <Sparkles className="w-8 h-8 text-[var(--color-primary)] mx-auto opacity-80" />
              <p className="text-sm font-bold text-slate-300">Nessun nuovo record al momento</p>
              <p className="text-xs text-slate-500">I nuovi PR sollevati dagli atleti appariranno qui in automatico.</p>
            </div>
          ) : (
            progressions.map(item => (
              <div
                key={item.id}
                onClick={() => handleOpenActionModal({
                  athleteId: item.athleteId,
                  athleteName: item.athleteName,
                  exerciseName: item.exerciseName,
                  type: 'progression',
                })}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0">
                    <Flame className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-black text-white group-hover:text-emerald-400 transition-colors">
                        {item.athleteName}
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        Nuovo PR 🔥
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      <strong className="text-white">{item.exerciseName}:</strong> {item.gainDescription}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-primary)] group-hover:text-white shrink-0 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
                  <Zap className="w-4 h-4 text-[var(--color-primary)]" />
                  <span>Invia Congratulazioni IA</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      </div>

      {/* MODALE AZIONI DECISIONALI IA */}
      <AICopilotActionModal
        isOpen={isActionModalOpen}
        onClose={() => {
          setIsActionModalOpen(false);
          setSelectedAlert(null);
        }}
        alertData={selectedAlert}
      />
    </div>
  );
};
