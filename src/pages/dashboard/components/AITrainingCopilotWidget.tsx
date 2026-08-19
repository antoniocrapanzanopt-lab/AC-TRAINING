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
  Search,
  ArrowUpDown,
  Filter,
  Check,
  RotateCcw,
} from 'lucide-react';
import { useAthletes } from '../../../context/AthletesContext';
import { useApp } from '../../../context/AppContext';
import { useWorkouts } from '../../../context/WorkoutsContext';
import { useToast } from '../../../context/ToastContext';
import { AICopilotActionModal, CopilotAlertContext } from './AICopilotActionModal';
import { supabase } from '../../../lib/supabase';

export type AttentionCategory = 'all' | 'pain' | 'plateau' | 'inactivity' | 'penultimate_week' | 'unassigned';
export type PriorityLevel = 'high' | 'medium' | 'low';
export type SortOption = 'priority' | 'date' | 'name';

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
  athleteEmail?: string;
  athleteCreatedAt?: string;
  workoutTitle?: string;
  currentWeek?: number;
  totalWeeks?: number;
  currentDayName?: string;
  blockProgressPercent?: number;
  completedWorkoutsInWeek?: number;
  targetWorkoutsInWeek?: number;
  primaryAlertCategory: AttentionCategory;
  priority: PriorityLevel;
  priorityScore: number;
  detectedAtIso: string;
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
  const { showSuccess, showInfo } = useToast();

  // 1. FILTRI, RICERCA & ORDINAMENTO
  const [selectedCategory, setSelectedCategory] = useState<AttentionCategory>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('priority');
  const [showDismissed, setShowDismissed] = useState<boolean>(false);

  // 2. ALERT GESTITI (DISMISSED) PERSISTITI IN LOCALSTORAGE
  const [dismissedAlertIds, setDismissedAlertIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('builder_copilot_dismissed_alerts');
      return saved ? new Set<string>(JSON.parse(saved)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  // 3. CARD ESPANDIBILI (DEFAULT COLLASSATE)
  const [expandedCardIds, setExpandedCardIds] = useState<Record<string, boolean>>({});

  // 4. MODALE COPILOT GUIDATA
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<CopilotAlertContext | null>(null);

  // 5. DATI REALI CARICATI DA SUPABASE & LOCALSTORAGE
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
        { workoutId?: string; title: string; durationWeeks: number; daysPerWeek: number; startDate?: string }
      >();

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

      const allUniqueWorkoutIds = Array.from(
        new Set(
          (activeAssignments || [])
            .map((a: any) => a.workout_id || a.workout?.id)
            .concat(allAssignedWorkouts.map((a) => a.workout_id))
            .filter(Boolean)
        )
      );

      const daysPerWorkoutMap = new Map<string, number>();

      if (allUniqueWorkoutIds.length > 0) {
        const { data: workoutExData } = await supabase
          .from('workout_exercises')
          .select('workout_id, day_name')
          .in('workout_id', allUniqueWorkoutIds);

        if (workoutExData) {
          const daysSetMap = new Map<string, Set<string>>();
          workoutExData.forEach((we: any) => {
            if (!daysSetMap.has(we.workout_id)) {
              daysSetMap.set(we.workout_id, new Set<string>());
            }
            if (we.day_name) daysSetMap.get(we.workout_id)!.add(we.day_name);
          });

          daysSetMap.forEach((days, wId) => {
            daysPerWorkoutMap.set(wId, Math.max(1, days.size));
          });
        }
      }

      if (activeAssignments && activeAssignments.length > 0) {
        activeAssignments.forEach((assign: any) => {
          const wId = assign.workout_id || assign.workout?.id;
          const calculatedDays = (wId && daysPerWorkoutMap.get(wId)) || 3;
          activeWorkoutByAthlete.set(assign.athlete_id, {
            workoutId: wId,
            title: assign.workout?.title || 'Scheda Attiva',
            durationWeeks: Number(assign.workout?.total_weeks) || 5,
            daysPerWeek: calculatedDays,
            startDate: assign.assigned_date,
          });
        });
      }

      allAssignedWorkouts.forEach((assign: any) => {
        if (!activeWorkoutByAthlete.has(assign.athlete_id)) {
          const calculatedDays = (assign.workout_id && daysPerWorkoutMap.get(assign.workout_id)) || 3;
          activeWorkoutByAthlete.set(assign.athlete_id, {
            workoutId: assign.workout_id,
            title: assign.workout?.title || assign.workout_title || 'Scheda Attiva',
            durationWeeks: 5,
            daysPerWeek: calculatedDays,
            startDate: assign.assigned_date || assign.created_at,
          });
        }
      });

      // 2. Fetch sessioni recenti completate (ultimi 30gg)
      const thirtyDaysAgoIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: recentSessionsData } = await supabase
        .from('workout_sessions')
        .select(`
          id,
          athlete_id,
          workout_id,
          start_time,
          end_time,
          notes,
          rpe,
          workouts ( title )
        `)
        .in('athlete_id', athleteIds)
        .gte('start_time', thirtyDaysAgoIso)
        .order('start_time', { ascending: false });

      const sessionsByAthlete = new Map<string, any[]>();
      if (recentSessionsData) {
        recentSessionsData.forEach((s: any) => {
          if (!sessionsByAthlete.has(s.athlete_id)) {
            sessionsByAthlete.set(s.athlete_id, []);
          }
          sessionsByAthlete.get(s.athlete_id)!.push(s);
        });
      }

      const sevenDaysAgoTime = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const items: AttentionAthleteItem[] = [];

      athletes.forEach((athlete) => {
        const assignedInfo = activeWorkoutByAthlete.get(athlete.id);
        const athleteSessions = sessionsByAthlete.get(athlete.id) || [];
        const localAthleteAlerts = localAlerts.filter(
          (a: any) =>
            a.athleteId === athlete.id ||
            (a.athleteName && a.athleteName.toLowerCase() === athlete.fullName.toLowerCase())
        );

        const athleteRecents: RecentSessionSummary[] = athleteSessions.map((s: any) => {
          const isPain = isPainText(s.notes);
          const endD = new Date(s.end_time || s.start_time);
          const startD = new Date(s.start_time);
          const durMin = Math.max(1, Math.round((endD.getTime() - startD.getTime()) / 60000));
          return {
            id: s.id,
            dateFormatted: new Date(s.start_time).toLocaleDateString('it-IT', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            }),
            dayName: s.workouts?.title || 'Sessione',
            workoutTitle: s.workouts?.title || 'Allenamento',
            durationMinutes: durMin,
            rpe: s.rpe,
            isPainReported: isPain,
            notes: s.notes,
          };
        });

        // ── CASO 1: NESSUN PIANO ASSEGNATO ──
        if (!assignedInfo) {
          items.push({
            id: `unassigned-${athlete.id}`,
            athleteId: athlete.id,
            athleteName: athlete.fullName,
            athleteEmail: athlete.email,
            athleteCreatedAt: athlete.createdAt,
            primaryAlertCategory: 'unassigned',
            priority: 'low',
            priorityScore: 1,
            detectedAtIso: athlete.createdAt || new Date().toISOString(),
            alertBadgeLabel: 'Da Programmare',
            alertBadgeColor: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
            aiShortInsight: `L'atleta non ha ancora un programma di allenamento assegnato. Crea o assegna una scheda per avviare il monitoraggio.`,
            fullDetailNote: `Stato: Atleta senza piano attivo. Nessuna scheda collegata nel database.`,
            recentSessions: athleteRecents.slice(0, 2),
            copilotContext: {
              athleteId: athlete.id,
              athleteName: athlete.fullName,
              type: 'progression',
            },
          });
          return;
        }

        // ── CASO 2: FASTIDI ARTICOLARI O SEGNALAZIONI DOLORE ──
        const painSessions = athleteRecents.filter((r) => r.isPainReported);
        const hasLocalPain = localAthleteAlerts.some((a: any) => a.isPain || isPainText(a.notes));

        if (painSessions.length > 0 || hasLocalPain) {
          const mostRecentPain = painSessions[0];
          const localNoteObj = localAthleteAlerts.find((a: any) => a.isPain || isPainText(a.notes));
          const noteExcerpt = localNoteObj?.notes || mostRecentPain?.notes || 'Fastidio articolare segnalato';

          items.push({
            id: `pain-${athlete.id}`,
            athleteId: athlete.id,
            athleteName: athlete.fullName,
            athleteEmail: athlete.email,
            workoutTitle: assignedInfo.title,
            currentWeek: 1,
            totalWeeks: assignedInfo.durationWeeks || 5,
            currentDayName: mostRecentPain?.dayName || 'Questionario Fine Workout',
            blockProgressPercent: 25,
            completedWorkoutsInWeek: athleteSessions.filter((s: any) => new Date(s.start_time).getTime() >= sevenDaysAgoTime).length,
            targetWorkoutsInWeek: assignedInfo.daysPerWeek || 3,
            primaryAlertCategory: 'pain',
            priority: 'high',
            priorityScore: 3,
            detectedAtIso: mostRecentPain ? new Date().toISOString() : new Date().toISOString(),
            alertBadgeLabel: 'Segnalazione: Questionario Post-Workout (Dolori Articolari)',
            alertBadgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-rose-500/10',
            aiShortInsight: `L'atleta ha segnalato dolori o fastidi articolari post-sessione. Consigliata revisione del carico, variante biomeccanica guidata o riduzione volume.`,
            fullDetailNote: noteExcerpt,
            recentSessions: athleteRecents.slice(0, 3),
            copilotContext: {
              athleteId: athlete.id,
              athleteName: athlete.fullName,
              workoutTitle: assignedInfo.title,
              type: 'critical_note',
            },
          });
          return;
        }

        // ── CASO 3: INATTIVITÀ PROLUNGATA (> 5 GIORNI CON PROGRAMMA ATTIVO) ──
        if (athleteRecents.length > 0) {
          const lastSessionTime = new Date(athleteSessions[0].start_time).getTime();
          const daysSinceLastSession = Math.floor((Date.now() - lastSessionTime) / (1000 * 60 * 60 * 24));

          if (daysSinceLastSession >= 5) {
            const isVeryHigh = daysSinceLastSession >= 10;
            items.push({
              id: `inactivity-${athlete.id}`,
              athleteId: athlete.id,
              athleteName: athlete.fullName,
              athleteEmail: athlete.email,
              workoutTitle: assignedInfo.title,
              currentWeek: Math.min(assignedInfo.durationWeeks, Math.max(1, Math.ceil(athleteSessions.length / (assignedInfo.daysPerWeek || 3)))),
              totalWeeks: assignedInfo.durationWeeks,
              currentDayName: `Inattivo da ${daysSinceLastSession} giorni`,
              blockProgressPercent: Math.min(100, Math.round((athleteSessions.length / ((assignedInfo.durationWeeks || 5) * (assignedInfo.daysPerWeek || 3))) * 100)),
              completedWorkoutsInWeek: 0,
              targetWorkoutsInWeek: assignedInfo.daysPerWeek || 3,
              primaryAlertCategory: 'inactivity',
              priority: isVeryHigh ? 'high' : 'medium',
              priorityScore: isVeryHigh ? 3 : 2,
              detectedAtIso: new Date(lastSessionTime).toISOString(),
              alertBadgeLabel: `⚠️ Inattivo da ${daysSinceLastSession} giorni`,
              alertBadgeColor: isVeryHigh
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-orange-500/20 text-orange-300 border-orange-500/40',
              aiShortInsight: `Ultimo workout svolto ${daysSinceLastSession} giorni fa (${new Date(lastSessionTime).toLocaleDateString('it-IT')}). Invia un messaggio motivazionale o verifica la continuità.`,
              fullDetailNote: `Nessuna sessione registrata negli ultimi ${daysSinceLastSession} giorni. Scheda attiva: ${assignedInfo.title}.`,
              recentSessions: athleteRecents.slice(0, 3),
              copilotContext: {
                athleteId: athlete.id,
                athleteName: athlete.fullName,
                workoutTitle: assignedInfo.title,
                type: 'progression',
              },
            });
            return;
          }
        }

        // ── CASO 4: PENULTIMA SETTIMANA DEL BLOCCO MESOCICLO ──
        if (assignedInfo.startDate) {
          const startMs = new Date(assignedInfo.startDate).getTime();
          const elapsedWeeks = Math.max(1, Math.ceil((Date.now() - startMs) / (1000 * 60 * 60 * 24 * 7)));
          const totalWeeks = assignedInfo.durationWeeks || 5;

          if (elapsedWeeks === totalWeeks - 1 || elapsedWeeks >= totalWeeks) {
            const weekSessionsCount = athleteSessions.filter(
              (s: any) => new Date(s.start_time).getTime() >= sevenDaysAgoTime
            ).length;

            items.push({
              id: `penultimate-${athlete.id}`,
              athleteId: athlete.id,
              athleteName: athlete.fullName,
              athleteEmail: athlete.email,
              workoutTitle: assignedInfo.title,
              currentWeek: Math.min(totalWeeks, elapsedWeeks),
              totalWeeks,
              currentDayName: 'Fase di Accumulo Avanzato',
              blockProgressPercent: Math.round((Math.min(totalWeeks, elapsedWeeks) / totalWeeks) * 100),
              completedWorkoutsInWeek: weekSessionsCount,
              targetWorkoutsInWeek: assignedInfo.daysPerWeek || 3,
              primaryAlertCategory: 'penultimate_week',
              priority: 'medium',
              priorityScore: 2,
              detectedAtIso: new Date().toISOString(),
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

  // ── GESTIONE DISMISS ALERT (SEGNA COME GESTITO) ──
  const handleDismissAlert = (id: string, athleteName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = new Set(dismissedAlertIds);
    updated.add(id);
    setDismissedAlertIds(updated);
    try {
      localStorage.setItem('builder_copilot_dismissed_alerts', JSON.stringify(Array.from(updated)));
    } catch (_) {}

    showSuccess(
      'Alert Segnato come Gestito',
      `La segnalazione per ${athleteName} è stata archiviata.`
    );
  };

  const handleRestoreAlert = (id: string, athleteName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = new Set(dismissedAlertIds);
    updated.delete(id);
    setDismissedAlertIds(updated);
    try {
      localStorage.setItem('builder_copilot_dismissed_alerts', JSON.stringify(Array.from(updated)));
    } catch (_) {}

    showInfo(
      'Alert Ripristinato',
      `La segnalazione per ${athleteName} è tornata tra gli alert attivi.`
    );
  };

  // ── CONTEGGI OVERVIEW METRICHE DINAMICI ──
  const activeAttentionList = useMemo(() => {
    if (showDismissed) return realAttentionList;
    return realAttentionList.filter((a) => !dismissedAlertIds.has(a.id));
  }, [realAttentionList, dismissedAlertIds, showDismissed]);

  const counts = useMemo(() => {
    return {
      totalActive: realAttentionList.filter((a) => !dismissedAlertIds.has(a.id)).length,
      dismissedTotal: dismissedAlertIds.size,
      pain: activeAttentionList.filter((a) => a.primaryAlertCategory === 'pain').length,
      plateau: activeAttentionList.filter((a) => a.primaryAlertCategory === 'plateau').length,
      inactivity: activeAttentionList.filter((a) => a.primaryAlertCategory === 'inactivity').length,
      penultimate_week: activeAttentionList.filter((a) => a.primaryAlertCategory === 'penultimate_week').length,
      unassigned: activeAttentionList.filter((a) => a.primaryAlertCategory === 'unassigned').length,
    };
  }, [activeAttentionList, realAttentionList, dismissedAlertIds]);

  // ── LISTA FILTRATA, RICERCATA E ORDINATA ──
  const filteredAndSortedAthletes = useMemo(() => {
    let result = activeAttentionList;

    // 1. Filtro Categoria
    if (selectedCategory !== 'all') {
      result = result.filter((a) => a.primaryAlertCategory === selectedCategory);
    }

    // 2. Ricerca Testuale
    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (a) =>
          a.athleteName.toLowerCase().includes(q) ||
          (a.workoutTitle && a.workoutTitle.toLowerCase().includes(q)) ||
          (a.athleteEmail && a.athleteEmail.toLowerCase().includes(q)) ||
          (a.aiShortInsight && a.aiShortInsight.toLowerCase().includes(q))
      );
    }

    // 3. Ordinamento
    return [...result].sort((a, b) => {
      if (sortBy === 'priority') {
        // Prima Priorità (3 -> 2 -> 1), poi Data più recente
        if (b.priorityScore !== a.priorityScore) {
          return b.priorityScore - a.priorityScore;
        }
        return new Date(b.detectedAtIso).getTime() - new Date(a.detectedAtIso).getTime();
      }
      if (sortBy === 'date') {
        return new Date(b.detectedAtIso).getTime() - new Date(a.detectedAtIso).getTime();
      }
      if (sortBy === 'name') {
        return a.athleteName.localeCompare(b.athleteName);
      }
      return 0;
    });
  }, [activeAttentionList, selectedCategory, searchTerm, sortBy]);

  const handleOpenCopilot = (context?: CopilotAlertContext, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!context) return;
    setSelectedAlert(context);
    setIsActionModalOpen(true);
  };

  const handleAssignProgram = (athleteId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedAthleteId(athleteId);
    setActiveTab('schede');
  };

  const toggleCardExpand = (id: string) => {
    setExpandedCardIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getPriorityBadge = (priority: PriorityLevel) => {
    switch (priority) {
      case 'high':
        return {
          label: 'Priorità Alta',
          className: 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-rose-500/10',
          dotColor: 'bg-rose-400',
        };
      case 'medium':
        return {
          label: 'Priorità Media',
          className: 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-amber-500/10',
          dotColor: 'bg-amber-400',
        };
      case 'low':
      default:
        return {
          label: 'Priorità Bassa',
          className: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
          dotColor: 'bg-indigo-400',
        };
    }
  };

  return (
    <div className="p-5 sm:p-7 rounded-3xl bg-[#0c1018] border border-slate-800 shadow-2xl space-y-6 relative overflow-hidden">
      {/* Glow Ambientale */}
      <div className="absolute top-0 right-1/4 w-96 h-40 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* ─── HEADER DASHBOARD COACH COPILOT ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2.5">
                <span>Atleti da attenzionare</span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-amber-500 text-black">
                  Coach Copilot
                </span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 font-medium mt-0.5">
                Panoramica prioritaria con azioni rapide, filtri per categoria e assegnazione schede
              </p>
            </div>
          </div>
        </div>

        {/* Totale Atleti in Evidenza & Tasto Mostra/Nascondi Gestiti */}
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          {dismissedAlertIds.size > 0 && (
            <button
              type="button"
              onClick={() => setShowDismissed(!showDismissed)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                showDismissed
                  ? 'bg-slate-800 text-white border-slate-700'
                  : 'bg-slate-950 text-slate-400 hover:text-white border-slate-800'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{showDismissed ? 'Nascondi Gestiti' : `Gestiti (${dismissedAlertIds.size})`}</span>
            </button>
          )}

          <div className="flex items-center gap-2 bg-slate-950 p-2 px-3.5 rounded-2xl border border-slate-800 shrink-0">
            <Activity className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-slate-300">Atleti in evidenza:</span>
            <span className="font-mono text-sm font-black text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-lg border border-amber-500/30">
              {counts.totalActive}
            </span>
          </div>
        </div>
      </div>

      {/* ─── 1. METRICHE CLICCABILI (FILTRI ATTIVI INTERATTIVI) ─── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            Filtra per Categoria Alert:
          </span>
          {selectedCategory !== 'all' && (
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className="text-xs font-black text-[var(--color-primary)] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Mostra Tutti ({counts.totalActive})</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* CARD 1: DOLORI & FASTIDI */}
          <button
            type="button"
            onClick={() => setSelectedCategory(selectedCategory === 'pain' ? 'all' : 'pain')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2.5 relative group ${
              selectedCategory === 'pain'
                ? 'bg-rose-950/40 border-rose-500 shadow-[0_0_25px_rgba(244,63,94,0.3)] ring-2 ring-rose-500 scale-[1.02]'
                : 'bg-slate-950/80 border-slate-800/90 hover:border-rose-500/50 hover:bg-slate-900/70'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 group-hover:text-rose-300 transition-colors">
                Dolori Articolari
              </span>
              <div className="w-7 h-7 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <ShieldAlert className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-white font-mono">{counts.pain}</span>
                <span className="text-[10px] text-slate-400 font-medium">alert</span>
              </div>
              {selectedCategory === 'pain' && (
                <span className="text-[9px] font-black uppercase text-rose-400 bg-rose-500/20 px-1.5 py-0.5 rounded">
                  Attivo
                </span>
              )}
            </div>
          </button>

          {/* CARD 2: PLATEAU & STALLI */}
          <button
            type="button"
            onClick={() => setSelectedCategory(selectedCategory === 'plateau' ? 'all' : 'plateau')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2.5 relative group ${
              selectedCategory === 'plateau'
                ? 'bg-purple-950/40 border-purple-500 shadow-[0_0_25px_rgba(168,85,247,0.3)] ring-2 ring-purple-500 scale-[1.02]'
                : 'bg-slate-950/80 border-slate-800/90 hover:border-purple-500/50 hover:bg-slate-900/70'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 group-hover:text-purple-300 transition-colors">
                Plateau / Stalli
              </span>
              <div className="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <TrendingDown className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-white font-mono">{counts.plateau}</span>
                <span className="text-[10px] text-slate-400 font-medium">stalli</span>
              </div>
              {selectedCategory === 'plateau' && (
                <span className="text-[9px] font-black uppercase text-purple-400 bg-purple-500/20 px-1.5 py-0.5 rounded">
                  Attivo
                </span>
              )}
            </div>
          </button>

          {/* CARD 3: INATTIVI (>5gg con programma) */}
          <button
            type="button"
            onClick={() => setSelectedCategory(selectedCategory === 'inactivity' ? 'all' : 'inactivity')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2.5 relative group ${
              selectedCategory === 'inactivity'
                ? 'bg-orange-950/40 border-orange-500 shadow-[0_0_25px_rgba(249,115,22,0.3)] ring-2 ring-orange-500 scale-[1.02]'
                : 'bg-slate-950/80 border-slate-800/90 hover:border-orange-500/50 hover:bg-slate-900/70'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 group-hover:text-orange-300 transition-colors">
                Inattività
              </span>
              <div className="w-7 h-7 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-white font-mono">{counts.inactivity}</span>
                <span className="text-[10px] text-slate-400 font-medium">&gt; 5gg</span>
              </div>
              {selectedCategory === 'inactivity' && (
                <span className="text-[9px] font-black uppercase text-orange-400 bg-orange-500/20 px-1.5 py-0.5 rounded">
                  Attivo
                </span>
              )}
            </div>
          </button>

          {/* CARD 4: PENULTIMA SETTIMANA */}
          <button
            type="button"
            onClick={() => setSelectedCategory(selectedCategory === 'penultimate_week' ? 'all' : 'penultimate_week')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2.5 relative group ${
              selectedCategory === 'penultimate_week'
                ? 'bg-amber-950/40 border-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.3)] ring-2 ring-amber-500 scale-[1.02]'
                : 'bg-slate-950/80 border-slate-800/90 hover:border-amber-500/50 hover:bg-slate-900/70'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 group-hover:text-amber-300 transition-colors">
                Penultima Sett.
              </span>
              <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Calendar className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-white font-mono">{counts.penultimate_week}</span>
                <span className="text-[10px] text-slate-400 font-medium">in scadenza</span>
              </div>
              {selectedCategory === 'penultimate_week' && (
                <span className="text-[9px] font-black uppercase text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded">
                  Attivo
                </span>
              )}
            </div>
          </button>

          {/* CARD 5: DA PROGRAMMARE (SENZA PIANO) */}
          <button
            type="button"
            onClick={() => setSelectedCategory(selectedCategory === 'unassigned' ? 'all' : 'unassigned')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2.5 relative group ${
              selectedCategory === 'unassigned'
                ? 'bg-indigo-950/40 border-indigo-500 shadow-[0_0_25px_rgba(99,102,241,0.3)] ring-2 ring-indigo-500 scale-[1.02]'
                : 'bg-slate-950/80 border-slate-800/90 hover:border-indigo-500/50 hover:bg-slate-900/70'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 group-hover:text-indigo-300 transition-colors">
                Da Programmare
              </span>
              <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <FilePlus2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-white font-mono">{counts.unassigned}</span>
                <span className="text-[10px] text-slate-400 font-medium">senza piano</span>
              </div>
              {selectedCategory === 'unassigned' && (
                <span className="text-[9px] font-black uppercase text-indigo-400 bg-indigo-500/20 px-1.5 py-0.5 rounded">
                  Attivo
                </span>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* ─── 2. TOOLBAR DI RICERCA & ORDINAMENTO ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800/90">
        {/* Campo Ricerca */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cerca atleta per nome o scheda..."
            className="w-full pl-9.5 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[var(--color-primary)] transition-colors"
          />
        </div>

        {/* Controllo Ordinamento */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            Ordina per:
          </span>
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            {[
              { id: 'priority', label: 'Urgenza' },
              { id: 'date', label: 'Data' },
              { id: 'name', label: 'Nome A-Z' },
            ].map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSortBy(s.id as SortOption)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  sortBy === s.id
                    ? 'bg-[var(--color-primary)] text-slate-950 font-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── 3. LISTA ATLETI ATTENZIONATI (CARD COMPATTE & COLLASSATE DI DEFAULT) ─── */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-12 rounded-3xl bg-slate-950/40 border border-slate-800 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
            <span>Analisi atleti e calcolo priorità in corso...</span>
          </div>
        ) : filteredAndSortedAthletes.length === 0 ? (
          /* EMPTY STATE */
          <div className="p-10 sm:p-12 rounded-3xl bg-slate-950/60 border border-dashed border-slate-800 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-black text-white">Nessun atleta in questa vista</h4>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                Tutti i programmi e gli stati degli atleti sono allineati. Nessuna azione pendente per i filtri selezionati.
              </p>
            </div>
          </div>
        ) : (
          filteredAndSortedAthletes.map((ath) => {
            const isExpanded = !!expandedCardIds[ath.id];
            const isUnassigned = ath.primaryAlertCategory === 'unassigned';
            const isDismissed = dismissedAlertIds.has(ath.id);
            const priorityBadge = getPriorityBadge(ath.priority);

            return (
              <div
                key={ath.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all duration-300 space-y-3 relative overflow-hidden shadow-lg ${
                  isDismissed
                    ? 'bg-gradient-to-r from-emerald-950/30 via-slate-950/90 to-slate-950 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.12)] ring-1 ring-emerald-500/20'
                    : isExpanded
                    ? 'bg-slate-950/95 border-slate-700 ring-1 ring-slate-700/50'
                    : 'bg-slate-950/80 border-slate-800/90 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                {/* ── RIGA COMPATTA TESTATA: AVATAR, NOME, PRIORITÀ, ALERT & AZIONI ── */}
                <div
                  onClick={() => toggleCardExpand(ath.id)}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 cursor-pointer select-none"
                >
                  {/* Info Principali */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Avatar Iniziale */}
                    <div
                      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl border flex items-center justify-center font-black text-sm shrink-0 shadow-inner transition-colors ${
                        isDismissed
                          ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-400'
                          : 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700/80 text-amber-400'
                      }`}
                    >
                      {isDismissed ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : ath.athleteName.substring(0, 2).toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-base font-black text-white tracking-tight truncate">
                          {ath.athleteName}
                        </h4>

                        {/* Badge Stato: Se Gestito -> Verde Smeraldo 'Completato', altrimenti Priorità */}
                        {isDismissed ? (
                          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-md border flex items-center gap-1.5 uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Completato • Gestito
                          </span>
                        ) : (
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-md border flex items-center gap-1.5 uppercase tracking-wider ${priorityBadge.className}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${priorityBadge.dotColor}`} />
                            {priorityBadge.label}
                          </span>
                        )}

                        {/* Badge Categoria Alert */}
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border shadow-sm ${
                            isDismissed
                              ? 'bg-slate-900/80 text-slate-300 border-slate-700'
                              : ath.alertBadgeColor
                          }`}
                        >
                          {ath.alertBadgeLabel}
                        </span>
                      </div>

                      {/* Info Scheda Attiva (se assegnata) o Email */}
                      <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold truncate">
                        {!isUnassigned && ath.workoutTitle ? (
                          <span className="flex items-center gap-1.5 text-slate-300">
                            <Dumbbell className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="truncate">{ath.workoutTitle}</span>
                            {ath.currentDayName && (
                              <span className="text-slate-500 font-normal">• {ath.currentDayName}</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs font-normal">
                            Nessun piano attivo associato • {ath.athleteEmail || 'Email non registrata'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── AZIONI RAPIDE SULLA DESTRA ── */}
                  <div
                    className="flex items-center gap-2 shrink-0 self-end md:self-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Azione Rapida: Segna come gestito / Ripristina */}
                    {isDismissed ? (
                      <button
                        type="button"
                        onClick={(e) => handleRestoreAlert(ath.id, ath.athleteName, e)}
                        className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                        title="Ripristina tra gli alert attivi"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                        <span>Riapri Alert</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => handleDismissAlert(ath.id, ath.athleteName, e)}
                        className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-emerald-400 border border-slate-800 hover:border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 group/dismiss"
                        title="Segna come gestito / archivia questo alert"
                      >
                        <Check className="w-4 h-4 text-emerald-400 group-hover/dismiss:scale-110 transition-transform" />
                        <span className="hidden sm:inline">Segna come gestito</span>
                      </button>
                    )}

                    {/* Azione Primaria: Assegna Programma o Apri Copilot */}
                    {isUnassigned ? (
                      <button
                        type="button"
                        onClick={(e) => handleAssignProgram(ath.athleteId, e)}
                        className="flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-black text-xs transition-all shadow-md hover:shadow-indigo-500/20 shrink-0 cursor-pointer active:scale-95"
                      >
                        <FilePlus2 className="w-3.5 h-3.5" />
                        <span>Assegna scheda</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => handleOpenCopilot(ath.copilotContext, e)}
                        className={`flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl font-black text-xs transition-all shadow-md shrink-0 cursor-pointer active:scale-95 ${
                          isDismissed
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                            : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-slate-950 hover:shadow-amber-500/20'
                        }`}
                      >
                        <Zap className={`w-3.5 h-3.5 ${isDismissed ? 'text-amber-400 fill-amber-400' : 'fill-slate-950'}`} />
                        <span>{isDismissed ? 'Rivedi Copilot' : 'Apri Copilot'}</span>
                      </button>
                    )}

                    {/* Freccia Espandi / Comprimi */}
                    <button
                      type="button"
                      onClick={() => toggleCardExpand(ath.id)}
                      className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800 cursor-pointer transition-colors"
                      title={isExpanded ? 'Comprimi dettagli' : 'Espandi dettagli'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* ── RIGA BREVE INSIGHT IA (SEMPRE VISIBILE O ANTEPRIMA) ── */}
                {isDismissed ? (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl text-xs bg-emerald-500/10 border border-emerald-500/25 text-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <p className="min-w-0 text-[11px] leading-snug">
                      <strong className="mr-1 uppercase text-[9px] tracking-wider text-emerald-400">
                        Stato Intervento:
                      </strong>
                      Modifiche applicate con successo dal Coach Copilot. Programma aggiornato e notifica inviata.
                    </p>
                  </div>
                ) : (
                  ath.aiShortInsight && (
                    <div
                      className={`flex items-start gap-2 p-2.5 rounded-xl text-xs ${
                        isUnassigned
                          ? 'bg-indigo-500/10 border border-indigo-500/20 text-slate-300'
                          : 'bg-amber-500/10 border border-amber-500/20 text-slate-200'
                      }`}
                    >
                      <Sparkles
                        className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                          isUnassigned ? 'text-indigo-400' : 'text-amber-400'
                        }`}
                      />
                      <p className="min-w-0 text-[11px] leading-snug">
                        <strong
                          className={`mr-1 uppercase text-[9px] tracking-wider ${
                            isUnassigned ? 'text-indigo-400' : 'text-amber-400'
                          }`}
                        >
                          {isUnassigned ? 'Azione Consigliata:' : 'Insight IA:'}
                        </strong>
                        {ath.aiShortInsight}
                      </p>
                    </div>
                  )
                )}

                {/* ── CONTENUTO ESPANSO (PROGRESS BAR, FEEDBACK INTEGRALE & SESSIONI RECENTI) ── */}
                {isExpanded && (
                  <div className="pt-3 border-t border-slate-800/80 space-y-3.5 animate-in fade-in slide-in-from-top-1 duration-150">
                    {/* STATO DEL BLOCCO & FREQUENZA SETTIMANALE */}
                    {!isUnassigned && ath.currentWeek && ath.totalWeeks && (
                      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                        {/* Settimana & Progress Bar */}
                        <div className="sm:col-span-8 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-white flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-amber-400" />
                              <span>Settimana {ath.currentWeek} di {ath.totalWeeks}</span>
                              {ath.currentWeek === ath.totalWeeks - 1 && (
                                <span className="text-[9px] font-black uppercase text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30 ml-1">
                                  Penultima Settimana
                                </span>
                              )}
                            </span>
                            <span className="font-mono text-slate-400 font-bold text-xs">
                              {ath.blockProgressPercent}% Blocco
                            </span>
                          </div>

                          <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
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
                          <span className="text-[10px] font-bold uppercase text-slate-400">
                            Completati Settimana:
                          </span>
                          <span className="font-mono text-xs sm:text-sm font-black text-slate-200 mt-0.5">
                            {ath.completedWorkoutsInWeek || 0} / {ath.targetWorkoutsInWeek || 3} sessioni
                          </span>
                        </div>
                      </div>
                    )}

                    {/* FEEDBACK INTEGRALE QUESTIONARIO / NOTE */}
                    {ath.fullDetailNote && (
                      <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1 text-xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Feedback Integrale / Dettagli Segnalazione:
                        </span>
                        <p className="text-slate-200 italic font-mono text-[11px] leading-relaxed">
                          "{ath.fullDetailNote}"
                        </p>
                      </div>
                    )}

                    {/* STORICO ULTIME SEDUTE SVOLTE DALL'ATLETA */}
                    {ath.recentSessions && ath.recentSessions.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Ultime Sedute Registrate:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {ath.recentSessions.map((s) => (
                            <div
                              key={s.id}
                              className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/80 text-xs space-y-1"
                            >
                              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                                <span>{s.dateFormatted}</span>
                                {s.rpe ? <span className="text-sky-400 font-mono">RPE {s.rpe}</span> : null}
                              </div>
                              <p className="font-bold text-white text-[11px] truncate">{s.workoutTitle}</p>
                              {s.isPainReported && (
                                <span className="text-[9px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 inline-block">
                                  Fastidio segnalato
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
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
          onApplied={(athleteId) => {
            const matchingItems = realAttentionList.filter((a) => a.athleteId === athleteId);
            if (matchingItems.length > 0) {
              matchingItems.forEach((item) => {
                handleDismissAlert(item.id, item.athleteName);
              });
            } else {
              handleDismissAlert(athleteId, selectedAlert.athleteName);
            }
          }}
          alertData={selectedAlert}
        />
      )}
    </div>
  );
};
