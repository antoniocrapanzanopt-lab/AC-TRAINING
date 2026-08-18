import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Sparkles,
  TrendingDown,
  Clock,
  ShieldAlert,
  Zap,
  Dumbbell,
  Calendar,
  ChevronDown,
  ChevronUp,
  Activity,
  CheckCircle2,
  FilePlus2,
  ArrowRight,
} from 'lucide-react';
import { useAthletes } from '../../../context/AthletesContext';
import { useApp } from '../../../context/AppContext';
import { useWorkouts } from '../../../context/WorkoutsContext';
import { AICopilotActionModal, CopilotAlertContext } from './AICopilotActionModal';
import { supabase } from '../../../lib/supabase';

export type AttentionCategory = 'all' | 'pain' | 'plateau' | 'inactivity' | 'penultimate_week' | 'unassigned';

export interface RecentSessionSummary {
  id: string;
  dateFormatted: string;
  dayName: string;
  workoutTitle: string;
  durationMinutes: number;
  rpe?: number;
  totalVolumeKg?: number;
  isPainReported?: boolean;
  notes?: string;
}

export interface AttentionAthleteItem {
  id: string;
  athleteId: string;
  athleteName: string;
  workoutTitle?: string;
  currentWeek?: number;
  totalWeeks?: number;
  currentDayName?: string;
  blockProgressPercent?: number;
  completedWorkoutsInWeek?: number;
  targetWorkoutsInWeek?: number;
  primaryAlertCategory: 'pain' | 'plateau' | 'inactivity' | 'penultimate_week' | 'unassigned';
  alertBadgeLabel: string;
  alertBadgeColor: string;
  exerciseName?: string;
  aiShortInsight?: string;
  fullDetailNote?: string;
  recentSessions?: RecentSessionSummary[];
  copilotContext?: CopilotAlertContext;
}

export const AITrainingCopilotWidget: React.FC = () => {
  const { athletes, setSelectedAthleteId } = useAthletes();
  const { allAssignedWorkouts } = useWorkouts();
  const { setActiveTab } = useApp();

  // Filtro Categoria Overview
  const [selectedCategory, setSelectedCategory] = useState<AttentionCategory>('all');

  // Modale Copilot Guidato
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<CopilotAlertContext | null>(null);

  // Dettagli espandibili per card
  const [expandedNotesIds, setExpandedNotesIds] = useState<Record<string, boolean>>({});

  // Dati Reali caricati da Supabase & LocalStorage
  const [realAttentionList, setRealAttentionList] = useState<AttentionAthleteItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const isPainText = (text: string): boolean => {
    return /dolore|fastidio|male|schiena|lombare|spalla|ginocchio|gomito|anca|collo|polso|caviglia|pizzico|infortunio|strappo|infiammazione|tendine|contrattura|bloccato|dolor|articolare|rpe 10/i.test(
      text || ''
    );
  };

  const fetchRealAttentionData = useCallback(async () => {
    if (!athletes || athletes.length === 0) {
      setRealAttentionList([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const athleteIds = athletes.map((a) => a.id);
      const athleteMap = new Map(athletes.map((a) => [a.id, a]));

      // 0. Carica note salvate in locale da WorkoutPlayer (realtime in-session)
      let localAlerts: any[] = [];
      try {
        localAlerts = JSON.parse(localStorage.getItem('builder_copilot_critical_notes') || '[]');
      } catch (e) {
        console.warn('Errore lettura note copilot locale:', e);
      }

      // 1. Schede Assegnate Attive per gli atleti reali (da WorkoutsContext + Supabase)
      const activeWorkoutByAthlete = new Map<
        string,
        { title: string; durationWeeks: number; startDate?: string }
      >();

      // Da allAssignedWorkouts
      if (allAssignedWorkouts && allAssignedWorkouts.length > 0) {
        allAssignedWorkouts.forEach((a) => {
          if (a.athlete_id && a.is_active) {
            activeWorkoutByAthlete.set(a.athlete_id, {
              title: a.workout?.title || 'Scheda Assegnata',
              durationWeeks: a.workout?.total_weeks || 4,
              startDate: a.assigned_date,
            });
          }
        });
      }

      // Query diretta di conferma su Supabase
      const { data: activeAssignments } = await supabase
        .from('athlete_assigned_workouts')
        .select(`
          id,
          athlete_id,
          workout_id,
          assigned_date,
          is_active,
          workout:workouts(id, title, total_weeks)
        `)
        .in('athlete_id', athleteIds)
        .eq('is_active', true);

      if (activeAssignments) {
        activeAssignments.forEach((a: any) => {
          if (a.athlete_id) {
            const workoutObj = a.workout || a.workouts;
            const resolvedTitle = workoutObj?.title || activeWorkoutByAthlete.get(a.athlete_id)?.title || 'Scheda Assegnata';
            const resolvedDuration = workoutObj?.total_weeks || activeWorkoutByAthlete.get(a.athlete_id)?.durationWeeks || 4;
            activeWorkoutByAthlete.set(a.athlete_id, {
              title: resolvedTitle,
              durationWeeks: resolvedDuration,
              startDate: a.assigned_date,
            });
          }
        });
      }

      // 2. Note dei singoli esercizi con volume e dettagli
      const { data: logsData } = await supabase
        .from('exercise_logs')
        .select(`
          id,
          session_id,
          notes,
          rpe,
          reps_completed,
          weight_kg,
          created_at,
          workout_exercises ( name, week_number, day_name ),
          workout_sessions ( athlete_id, workout_id, workouts ( title ) )
        `)
        .not('notes', 'is', null)
        .order('created_at', { ascending: false })
        .limit(60);

      // 3. Questionari Sessioni Reali con dettagli completi per cronologia
      const { data: questionnaireData } = await supabase
        .from('workout_sessions')
        .select(`
          id,
          notes,
          rpe,
          start_time,
          end_time,
          athlete_id,
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
        .order('end_time', { ascending: false })
        .limit(100);

      // 4. Mappatura Sessioni per Atleta (Timeline & Ultimi Allenamenti)
      const now = new Date().getTime();
      const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

      const sessionsByAthlete = new Map<string, any[]>();
      const recentSessionsMap = new Map<string, RecentSessionSummary[]>();

      if (questionnaireData) {
        questionnaireData.forEach((s: any) => {
          if (s.athlete_id) {
            if (!sessionsByAthlete.has(s.athlete_id)) {
              sessionsByAthlete.set(s.athlete_id, []);
            }
            sessionsByAthlete.get(s.athlete_id)!.push(s);

            if (!recentSessionsMap.has(s.athlete_id)) {
              recentSessionsMap.set(s.athlete_id, []);
            }

            // Calcola dati sessione
            const start = new Date(s.start_time || s.end_time);
            const end = new Date(s.end_time || s.start_time);
            const durationMin = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
            const logs = s.exercise_logs || [];
            let totalVolume = 0;
            let dayName = 'Allenamento';

            logs.forEach((l: any) => {
              totalVolume += (l.reps_completed || 0) * (l.weight_kg || 0);
              if (l.workout_exercises?.day_name && dayName === 'Allenamento') {
                dayName = l.workout_exercises.day_name;
              }
            });

            const isPain = isPainText(s.notes || '') || logs.some((l: any) => isPainText(l.notes || ''));

            recentSessionsMap.get(s.athlete_id)!.push({
              id: s.id,
              dateFormatted: new Date(s.end_time || s.start_time).toLocaleDateString('it-IT', {
                day: '2-digit',
                month: 'short',
              }),
              dayName,
              workoutTitle: s.workouts?.title || 'Scheda',
              durationMinutes: durationMin,
              rpe: s.rpe || undefined,
              totalVolumeKg: totalVolume > 0 ? totalVolume : undefined,
              isPainReported: isPain,
              notes: s.notes || undefined,
            });
          }
        });
      }

      const items: AttentionAthleteItem[] = [];
      const processedAthletes = new Set<string>();

      // ── A1. SEGNALAZIONI LOCALI (Istantanee da portale atleta) ───────────────
      localAlerts.forEach((loc) => {
        const athId = loc.athleteId;
        const athlete = athId
          ? athleteMap.get(athId) || athletes.find((a) => a.fullName.toLowerCase() === (loc.athleteName || '').toLowerCase())
          : null;
        const resolvedAthId = athlete ? athlete.id : athId;
        const resolvedAthName = athlete ? athlete.fullName : loc.athleteName || 'Atleta';

        if (isPainText(loc.noteText || '') && !processedAthletes.has(resolvedAthId)) {
          processedAthletes.add(resolvedAthId);

          const assignedInfo = activeWorkoutByAthlete.get(resolvedAthId);
          const workoutTitle = assignedInfo?.title || loc.workoutTitle || 'Scheda Personalizzata';
          const totalWeeks = assignedInfo?.durationWeeks || 4;
          const currentWeek = loc.weekNumber || 1;
          const exName = loc.exerciseName || 'Esercizio / Questionario';
          const athleteRecents = recentSessionsMap.get(resolvedAthId) || [];

          items.push({
            id: `loc-pain-${loc.id || Math.random()}`,
            athleteId: resolvedAthId,
            athleteName: resolvedAthName,
            workoutTitle,
            currentWeek,
            totalWeeks,
            currentDayName: loc.dayName || 'Sessione Recente',
            blockProgressPercent: Math.round((currentWeek / totalWeeks) * 100),
            completedWorkoutsInWeek: 1,
            targetWorkoutsInWeek: 3,
            primaryAlertCategory: 'pain',
            alertBadgeLabel: `Segnalazione: ${exName}`,
            alertBadgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
            exerciseName: exName,
            aiShortInsight: `Segnalato fastidio articolare su ${exName}. Consigliata sostituzione biomeccanica guidata o riduzione carico del 10-15%.`,
            fullDetailNote: loc.noteText,
            recentSessions: athleteRecents.slice(0, 3),
            copilotContext: {
              athleteId: resolvedAthId,
              athleteName: resolvedAthName,
              workoutTitle,
              weekNumber: currentWeek,
              dayName: loc.dayName || 'Giorno A',
              exerciseName: exName,
              noteText: loc.noteText,
              type: 'critical_note',
            },
          });
        }
      });

      // ── A2. NOTE QUESTIONARIO DI FINE WORKOUT DAL DB (workout_sessions) ──────
      if (questionnaireData) {
        questionnaireData.forEach((s: any) => {
          const athId = s.athlete_id;
          const athlete = athId ? athleteMap.get(athId) : null;
          if (!athlete || !s.notes || s.notes.trim().length === 0) return;

          if (isPainText(s.notes) && !processedAthletes.has(athId)) {
            processedAthletes.add(athId);

            const assignedInfo = activeWorkoutByAthlete.get(athId);
            const workoutTitle = assignedInfo?.title || s.workouts?.title || 'Scheda Personalizzata';
            const totalWeeks = assignedInfo?.durationWeeks || 4;

            const athleteSessions = sessionsByAthlete.get(athId) || [];
            const athleteRecents = recentSessionsMap.get(athId) || [];
            const weekSessionsCount = athleteSessions.filter((sess: any) => {
              const t = sess.end_time ? new Date(sess.end_time).getTime() : 0;
              return t >= oneWeekAgo;
            }).length;

            items.push({
              id: `db-sess-pain-${s.id}`,
              athleteId: athId,
              athleteName: athlete.fullName,
              workoutTitle,
              currentWeek: 1,
              totalWeeks,
              currentDayName: 'Questionario Fine Workout',
              blockProgressPercent: 25,
              completedWorkoutsInWeek: weekSessionsCount,
              targetWorkoutsInWeek: 3,
              primaryAlertCategory: 'pain',
              alertBadgeLabel: 'Fastidio nel Questionario Post-Workout',
              alertBadgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
              exerciseName: 'Questionario Fine Workout',
              aiShortInsight: `L'atleta ha segnalato dolori/fastidi nel questionario post-workout. Consigliata revisione del carico o variante guidata.`,
              fullDetailNote: s.notes,
              recentSessions: athleteRecents.slice(0, 3),
              copilotContext: {
                athleteId: athId,
                athleteName: athlete.fullName,
                workoutTitle,
                weekNumber: 1,
                dayName: 'Fine Workout',
                exerciseName: 'Questionario Fine Workout',
                noteText: s.notes,
                type: 'critical_note',
              },
            });
          }
        });
      }

      // ── A3. NOTE ESERCIZI DAL DB (exercise_logs) ────────────────────────────
      if (logsData) {
        logsData.forEach((l: any) => {
          const athId = l.workout_sessions?.athlete_id;
          const athlete = athId ? athleteMap.get(athId) : null;
          if (!athlete || !l.notes || l.notes.trim().length === 0) return;

          if (isPainText(l.notes) && !processedAthletes.has(athId)) {
            processedAthletes.add(athId);

            const assignedInfo = activeWorkoutByAthlete.get(athId);
            const workoutTitle = assignedInfo?.title || l.workout_sessions?.workouts?.title || 'Scheda Personalizzata';
            const totalWeeks = assignedInfo?.durationWeeks || 4;
            const currentWeek = l.workout_exercises?.week_number || 1;
            const dayName = l.workout_exercises?.day_name || 'Giorno A';
            const exName = l.workout_exercises?.name || 'Esercizio Target';

            const athleteSessions = sessionsByAthlete.get(athId) || [];
            const athleteRecents = recentSessionsMap.get(athId) || [];
            const weekSessionsCount = athleteSessions.filter((s: any) => {
              const t = s.end_time ? new Date(s.end_time).getTime() : 0;
              return t >= oneWeekAgo;
            }).length;

            items.push({
              id: `db-log-pain-${l.id}`,
              athleteId: athId,
              athleteName: athlete.fullName,
              workoutTitle,
              currentWeek,
              totalWeeks,
              currentDayName: dayName,
              blockProgressPercent: Math.round((currentWeek / totalWeeks) * 100),
              completedWorkoutsInWeek: weekSessionsCount,
              targetWorkoutsInWeek: 3,
              primaryAlertCategory: 'pain',
              alertBadgeLabel: `Fastidio: ${exName}`,
              alertBadgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
              exerciseName: exName,
              aiShortInsight: `Rilevato fastidio articolare su ${exName}. Consigliata sostituzione biomeccanica guidata o riduzione carico del 10-15%.`,
              fullDetailNote: l.notes,
              recentSessions: athleteRecents.slice(0, 3),
              copilotContext: {
                athleteId: athId,
                athleteName: athlete.fullName,
                workoutTitle,
                weekNumber: currentWeek,
                dayName,
                exerciseName: exName,
                noteText: l.notes,
                type: 'critical_note',
              },
            });
          }
        });
      }

      // ── B. PROGRAMMA NON ASSEGNATO / DA PROGRAMMARE ───────────────────────
      athletes.forEach((athlete) => {
        if (processedAthletes.has(athlete.id)) return;

        const assignedInfo = activeWorkoutByAthlete.get(athlete.id);
        const hasActiveWorkout = !!assignedInfo;

        if (!hasActiveWorkout) {
          processedAthletes.add(athlete.id);
          items.push({
            id: `real-unassigned-${athlete.id}`,
            athleteId: athlete.id,
            athleteName: athlete.fullName,
            primaryAlertCategory: 'unassigned',
            alertBadgeLabel: 'Programma non assegnato',
            alertBadgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
            aiShortInsight: 'L\'atleta non ha ancora un programma di allenamento assegnato. Assegna una scheda per iniziare.',
            fullDetailNote: 'Nessun programma attivo trovato per questo atleta nel database.',
            recentSessions: [],
          });
        }
      });

      // ── C. INATTIVITÀ REALE (> 6 giorni SENZA sessioni ma CON PROGRAMMA) ───
      athletes.forEach((athlete) => {
        if (processedAthletes.has(athlete.id)) return;

        const assignedInfo = activeWorkoutByAthlete.get(athlete.id);
        if (assignedInfo) {
          const athleteSessions = sessionsByAthlete.get(athlete.id) || [];
          const athleteRecents = recentSessionsMap.get(athlete.id) || [];
          const lastSession = athleteSessions.find((s: any) => s.end_time);

          let diffDays = 0;
          if (lastSession && lastSession.end_time) {
            diffDays = Math.floor((now - new Date(lastSession.end_time).getTime()) / (1000 * 60 * 60 * 24));
          } else if (assignedInfo.startDate) {
            diffDays = Math.floor((now - new Date(assignedInfo.startDate).getTime()) / (1000 * 60 * 60 * 24));
          }

          if (diffDays >= 6) {
            processedAthletes.add(athlete.id);
            const totalWeeks = assignedInfo.durationWeeks || 4;

            items.push({
              id: `real-ina-${athlete.id}`,
              athleteId: athlete.id,
              athleteName: athlete.fullName,
              workoutTitle: assignedInfo.title,
              currentWeek: 1,
              totalWeeks,
              currentDayName: 'Sessione in attesa',
              blockProgressPercent: 25,
              completedWorkoutsInWeek: 0,
              targetWorkoutsInWeek: 3,
              primaryAlertCategory: 'inactivity',
              alertBadgeLabel: `Inattivo da ${diffDays} Giorni`,
              alertBadgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
              aiShortInsight: `Nessuna sessione registrata negli ultimi ${diffDays} giorni. Consigliata sessione di ricondizionamento con volume ridotto.`,
              fullDetailNote: `Ultima attività registrata ${diffDays} giorni fa.`,
              recentSessions: athleteRecents.slice(0, 3),
              copilotContext: {
                athleteId: athlete.id,
                athleteName: athlete.fullName,
                workoutTitle: assignedInfo.title,
                weekNumber: 1,
                type: 'inactivity',
              },
            });
          }
        }
      });

      // ── D. PENULTIMA SETTIMANA REALE (es. Settimana totalWeeks - 1) ────────
      athletes.forEach((athlete) => {
        if (processedAthletes.has(athlete.id)) return;

        const assignedInfo = activeWorkoutByAthlete.get(athlete.id);
        if (assignedInfo && assignedInfo.startDate) {
          const startMs = new Date(assignedInfo.startDate).getTime();
          const elapsedWeeks = Math.max(1, Math.floor((now - startMs) / (7 * 24 * 60 * 60 * 1000)) + 1);
          const totalWeeks = assignedInfo.durationWeeks || 4;

          if (elapsedWeeks === totalWeeks - 1 && totalWeeks >= 2) {
            processedAthletes.add(athlete.id);
            const athleteSessions = sessionsByAthlete.get(athlete.id) || [];
            const athleteRecents = recentSessionsMap.get(athlete.id) || [];
            const weekSessionsCount = athleteSessions.filter((s: any) => {
              const t = s.end_time ? new Date(s.end_time).getTime() : 0;
              return t >= oneWeekAgo;
            }).length;

            items.push({
              id: `real-penult-${athlete.id}`,
              athleteId: athlete.id,
              athleteName: athlete.fullName,
              workoutTitle: assignedInfo.title,
              currentWeek: elapsedWeeks,
              totalWeeks,
              currentDayName: 'Fase di Accumulo Avanzato',
              blockProgressPercent: Math.round((elapsedWeeks / totalWeeks) * 100),
              completedWorkoutsInWeek: weekSessionsCount,
              targetWorkoutsInWeek: 3,
              primaryAlertCategory: 'penultimate_week',
              alertBadgeLabel: `⚠️ Penultima Settimana (${elapsedWeeks} di ${totalWeeks})`,
              alertBadgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
              aiShortInsight: `L'atleta è a settimana ${elapsedWeeks} di ${totalWeeks}: momento ideale per preparare il nuovo mesociclo o pianificare lo scarico attivo.`,
              fullDetailNote: `Blocco in scadenza tra 1 settimana. Dati di progressione pronti per il blocco successivo.`,
              recentSessions: athleteRecents.slice(0, 3),
              copilotContext: {
                athleteId: athlete.id,
                athleteName: athlete.fullName,
                workoutTitle: assignedInfo.title,
                weekNumber: elapsedWeeks,
                type: 'progression',
              },
            });
          }
        }
      });

      setRealAttentionList(items);
      setIsLoading(false);
    } catch (err) {
      console.warn('Errore calcolo atleti da attenzionare:', err);
      setRealAttentionList([]);
      setIsLoading(false);
    }
  }, [athletes, allAssignedWorkouts]);

  useEffect(() => {
    fetchRealAttentionData();

    window.addEventListener('copilot_notes_updated', fetchRealAttentionData);
    window.addEventListener('storage', fetchRealAttentionData);

    return () => {
      window.removeEventListener('copilot_notes_updated', fetchRealAttentionData);
      window.removeEventListener('storage', fetchRealAttentionData);
    };
  }, [fetchRealAttentionData]);

  // Conteggi Overview Calcolati
  const counts = useMemo(() => {
    return {
      pain: realAttentionList.filter((a) => a.primaryAlertCategory === 'pain').length,
      plateau: realAttentionList.filter((a) => a.primaryAlertCategory === 'plateau').length,
      inactivity: realAttentionList.filter((a) => a.primaryAlertCategory === 'inactivity').length,
      penultimate_week: realAttentionList.filter((a) => a.primaryAlertCategory === 'penultimate_week').length,
      unassigned: realAttentionList.filter((a) => a.primaryAlertCategory === 'unassigned').length,
    };
  }, [realAttentionList]);

  // Lista Filtrata
  const filteredAthletes = useMemo(() => {
    if (selectedCategory === 'all') return realAttentionList;
    return realAttentionList.filter((a) => a.primaryAlertCategory === selectedCategory);
  }, [realAttentionList, selectedCategory]);

  const handleOpenCopilot = (context?: CopilotAlertContext) => {
    if (!context) return;
    setSelectedAlert(context);
    setIsActionModalOpen(true);
  };

  const handleAssignProgram = (athleteId: string) => {
    setSelectedAthleteId(athleteId);
    setActiveTab('atleti');
  };

  const toggleDetails = (id: string) => {
    setExpandedNotesIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="p-6 sm:p-7 rounded-3xl bg-[#0c1018] border border-slate-800 shadow-2xl space-y-6 relative overflow-hidden">
      {/* Glow Ambientale */}
      <div className="absolute top-0 right-1/4 w-96 h-40 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* ─── HEADER DASHBOARD COACH ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2.5">
                <span>Atleti da attenzionare</span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500 text-black">
                  Coach Copilot
                </span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 font-medium mt-0.5">
                Panoramica prioritaria degli atleti reali che richiedono modifiche, assegnazioni o nuovo blocco
              </p>
            </div>
          </div>
        </div>

        {/* Totale Atleti in Evidenza */}
        <div className="flex items-center gap-2 bg-slate-950 p-2 px-3.5 rounded-2xl border border-slate-800 shrink-0 self-start sm:self-auto">
          <Activity className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-slate-300">Atleti in evidenza:</span>
          <span className="font-mono text-sm font-black text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-lg border border-amber-500/30">
            {realAttentionList.length}
          </span>
        </div>
      </div>

      {/* ─── 5 OVERVIEW CARDS (DOLORI, PLATEAU, INATTIVI, PENULTIMA SETT., DA PROGRAMMARE) ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* CARD 1: DOLORI & FASTIDI */}
        <button
          type="button"
          onClick={() => setSelectedCategory(selectedCategory === 'pain' ? 'all' : 'pain')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2.5 ${
            selectedCategory === 'pain'
              ? 'bg-rose-950/30 border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.2)] ring-1 ring-rose-500'
              : 'bg-slate-950/80 border-slate-800/90 hover:border-rose-500/40 hover:bg-slate-900/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Dolori</span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-white font-mono">{counts.pain}</span>
            <span className="text-[10px] text-slate-400 font-medium">alert</span>
          </div>
        </button>

        {/* CARD 2: PLATEAU & STALLI */}
        <button
          type="button"
          onClick={() => setSelectedCategory(selectedCategory === 'plateau' ? 'all' : 'plateau')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2.5 ${
            selectedCategory === 'plateau'
              ? 'bg-purple-950/30 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.2)] ring-1 ring-purple-500'
              : 'bg-slate-950/80 border-slate-800/90 hover:border-purple-500/40 hover:bg-slate-900/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Plateau</span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-white font-mono">{counts.plateau}</span>
            <span className="text-[10px] text-slate-400 font-medium">stalli</span>
          </div>
        </button>

        {/* CARD 3: INATTIVI (>5gg con programma) */}
        <button
          type="button"
          onClick={() => setSelectedCategory(selectedCategory === 'inactivity' ? 'all' : 'inactivity')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2.5 ${
            selectedCategory === 'inactivity'
              ? 'bg-orange-950/30 border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.2)] ring-1 ring-orange-500'
              : 'bg-slate-950/80 border-slate-800/90 hover:border-orange-500/40 hover:bg-slate-900/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Inattivi</span>
            <div className="w-7 h-7 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-white font-mono">{counts.inactivity}</span>
            <span className="text-[10px] text-slate-400 font-medium">&gt; 5gg</span>
          </div>
        </button>

        {/* CARD 4: PENULTIMA SETTIMANA */}
        <button
          type="button"
          onClick={() => setSelectedCategory(selectedCategory === 'penultimate_week' ? 'all' : 'penultimate_week')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2.5 ${
            selectedCategory === 'penultimate_week'
              ? 'bg-amber-950/30 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)] ring-1 ring-amber-500'
              : 'bg-slate-950/80 border-slate-800/90 hover:border-amber-500/40 hover:bg-slate-900/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Penultima Sett.</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-white font-mono">{counts.penultimate_week}</span>
            <span className="text-[10px] text-slate-400 font-medium">in scadenza</span>
          </div>
        </button>

        {/* CARD 5: DA PROGRAMMARE (PROGRAMMA NON ASSEGNATO) */}
        <button
          type="button"
          onClick={() => setSelectedCategory(selectedCategory === 'unassigned' ? 'all' : 'unassigned')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2.5 ${
            selectedCategory === 'unassigned'
              ? 'bg-indigo-950/30 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.2)] ring-1 ring-indigo-500'
              : 'bg-slate-950/80 border-slate-800/90 hover:border-indigo-500/40 hover:bg-slate-900/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Da Programmare</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <FilePlus2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-white font-mono">{counts.unassigned}</span>
            <span className="text-[10px] text-slate-400 font-medium">senza piano</span>
          </div>
        </button>
      </div>

      {/* ─── LISTA PRINCIPALE O EMPTY STATE REALE ─── */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="p-10 rounded-3xl bg-slate-950/40 border border-slate-800 text-center text-xs text-slate-400">
            Caricamento dati di monitoraggio atleti in corso...
          </div>
        ) : filteredAthletes.length === 0 ? (
          /* EMPTY STATE REALE DEDICATO */
          <div className="p-10 sm:p-12 rounded-3xl bg-slate-950/60 border border-dashed border-slate-800 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-black text-white">Nessun atleta in questa categoria</h4>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                Tutti i programmi e gli stati degli atleti sono aggiornati. Nessun alert pendente in questa sezione.
              </p>
            </div>
          </div>
        ) : (
          filteredAthletes.map((ath) => {
            const isNoteOpen = expandedNotesIds[ath.id];
            const isUnassigned = ath.primaryAlertCategory === 'unassigned';

            return (
              <div
                key={ath.id}
                className="p-5 sm:p-6 rounded-3xl bg-slate-950/90 border border-slate-800 hover:border-slate-700 transition-all space-y-4 shadow-xl relative overflow-hidden"
              >
                {/* RIGA 1: TESTATA ATLETA + ALERT PRINCIPALE + CTA */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
                  {/* Info Atleta & Scheda */}
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h4 className="text-base sm:text-lg font-black text-white tracking-tight">
                        {ath.athleteName}
                      </h4>
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full border shadow-sm ${ath.alertBadgeColor}`}
                      >
                        {ath.alertBadgeLabel}
                      </span>
                    </div>

                    {!isUnassigned && ath.workoutTitle && (
                      <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold flex-wrap">
                        <span className="flex items-center gap-1 text-slate-300">
                          <Dumbbell className="w-3.5 h-3.5 text-amber-400" />
                          {ath.workoutTitle}
                        </span>
                        {ath.currentDayName && (
                          <>
                            <span>•</span>
                            <span className="text-slate-400 font-mono">
                              {ath.currentDayName}
                            </span>
                          </>
                        )}
                      </div>
                    )}

                    {isUnassigned && (
                      <p className="text-xs text-slate-400 font-medium">
                        Nessun piano di allenamento attivo associato a questo atleta.
                      </p>
                    )}
                  </div>

                  {/* Pulsante CTA Primaria: Se non assegnato -> "Assegna Programma", altrimenti -> "Apri Copilot" */}
                  {isUnassigned ? (
                    <button
                      type="button"
                      onClick={() => handleAssignProgram(ath.athleteId)}
                      className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white font-black text-xs sm:text-sm transition-all shadow-lg hover:shadow-indigo-500/20 shrink-0 cursor-pointer self-start md:self-center"
                    >
                      <FilePlus2 className="w-4 h-4" />
                      <span>Assegna programma</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenCopilot(ath.copilotContext)}
                      className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-black font-black text-xs sm:text-sm transition-all shadow-lg hover:shadow-amber-500/20 shrink-0 cursor-pointer self-start md:self-center"
                    >
                      <Zap className="w-4 h-4 fill-black" />
                      <span>Apri Copilot</span>
                    </button>
                  )}
                </div>

                {/* RIGA 2: STATO DEL BLOCCO (Mostrato SOLO se ha un programma attivo) */}
                {!isUnassigned && ath.currentWeek && ath.totalWeeks && (
                  <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    {/* Settimana & Progress Bar */}
                    <div className="sm:col-span-8 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-amber-400" />
                          <span>Settimana {ath.currentWeek} di {ath.totalWeeks}</span>
                          {ath.currentWeek === ath.totalWeeks - 1 && (
                            <span className="text-[10px] font-black uppercase text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30 ml-1">
                              Penultima Settimana
                            </span>
                          )}
                        </span>
                        <span className="font-mono text-slate-400 font-bold">
                          {ath.blockProgressPercent}% Blocco
                        </span>
                      </div>

                      {/* Progress Bar Mesociclo */}
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            ath.currentWeek === ath.totalWeeks - 1
                              ? 'bg-amber-400 shadow-[0_0_10px_#f59e0b]'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${ath.blockProgressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Allenamenti Completati nella Settimana */}
                    <div className="sm:col-span-4 sm:border-l sm:border-slate-800 sm:pl-3 flex sm:flex-col justify-between sm:justify-center text-xs">
                      <span className="text-[10px] font-bold uppercase text-slate-400">Completati Settimana:</span>
                      <span className="font-mono text-xs sm:text-sm font-black text-slate-200 mt-0.5">
                        {ath.completedWorkoutsInWeek || 0} / {ath.targetWorkoutsInWeek || 3} sessioni
                      </span>
                    </div>
                  </div>
                )}

                {/* RIGA 3: BREVE INSIGHT IA (Se presente) */}
                {ath.aiShortInsight && (
                  <div
                    className={`flex items-start gap-2.5 p-3 rounded-2xl text-xs ${
                      isUnassigned
                        ? 'bg-indigo-500/10 border border-indigo-500/20 text-slate-300'
                        : 'bg-amber-500/10 border border-amber-500/20 text-slate-200'
                    }`}
                  >
                    <Sparkles
                      className={`w-4 h-4 shrink-0 mt-0.5 ${isUnassigned ? 'text-indigo-400' : 'text-amber-400'}`}
                    />
                    <div className="min-w-0">
                      <span
                        className={`font-bold mr-1.5 uppercase text-[10px] tracking-wider block sm:inline ${
                          isUnassigned ? 'text-indigo-400' : 'text-amber-400'
                        }`}
                      >
                        {isUnassigned ? 'Azione Consigliata:' : 'Insight IA:'}
                      </span>
                      <span className="font-medium">{ath.aiShortInsight}</span>
                    </div>
                  </div>
                )}



                {/* RIGA 5: DETTAGLI QUESTIONARIO / NOTE COLLASSATI DI DEFAULT */}
                {ath.fullDetailNote && !isUnassigned && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => toggleDetails(ath.id)}
                      className="text-[11px] font-bold text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>{isNoteOpen ? 'Nascondi feedback questionario' : 'Vedi feedback integrale atleta'}</span>
                      {isNoteOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {isNoteOpen && (
                      <div className="mt-2 p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 italic animate-in fade-in duration-100">
                        "{ath.fullDetailNote}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MODALE DI AZIONE COPILOT GUIDATA A 2 STEP */}
      {isActionModalOpen && selectedAlert && (
        <AICopilotActionModal
          isOpen={isActionModalOpen}
          onClose={() => {
            setIsActionModalOpen(false);
            setSelectedAlert(null);
          }}
          alertData={selectedAlert}
        />
      )}
    </div>
  );
};
