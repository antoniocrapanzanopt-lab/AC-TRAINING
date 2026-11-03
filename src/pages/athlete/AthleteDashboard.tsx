import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dumbbell,
  RotateCcw,
  WifiOff,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Calendar,
  ShieldCheck,
  AlertCircle,
  XCircle,
  Clock,
  Play,
  FileText,
  Eye,
} from 'lucide-react';
import { WorkoutTemplate, WorkoutExercise, AthleteAssignedWorkout } from '../../types/workout';
import { useWorkouts } from '../../context/WorkoutsContext';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useAthletes } from '../../context/AthletesContext';
import { supabase } from '../../lib/supabase';
import {
  getActiveWorkoutDraft,
  saveActiveWorkoutDraft,
  clearActiveWorkoutDraft,
  syncPendingWorkoutsWithServer,
  getPendingSyncQueue,
  ActiveWorkoutDraft,
} from '../../lib/offline/offlineWorkoutStorage';
import { PwaInstallBanner } from '../../components/pwa/PwaInstallBanner';
import { AthleteWorkoutHistory, SessionRow } from '../../components/athlete/AthleteWorkoutHistory';
import { AthleteQuestionnaireWizard } from '../../components/questionnaires/AthleteQuestionnaireWizard';
import { AthleteAdherenceCard } from '../../components/athlete/AthleteAdherenceCard';
import { getAthleteOnboardingResponse } from '../../services/questionnaireService';
import { fetchAthleteAdherenceData, AdherenceScoreResult } from '../../services/adherenceService';
import { AthleteOnboardingRecord } from '../../types/questionnaire';
import { Sparkles } from 'lucide-react';
import { ContractSignatureModal } from '../../components/contract/ContractSignatureModal';
import {
  getAthleteSignedContract,
  getAthleteContractStatus,
} from '../../services/contractService';
import { AthleteSignedContract } from '../../types/contract';
import {
  isCompletedSession,
  isSessionWithinAssignmentCycle,
  normalizeDayName,
  matchDayNames,
  resolveRelatedWorkoutIds,
  calculateCurrentActiveWeek,
} from '../../services/workoutProgressService';

interface AthleteDashboardProps {
  onStartWorkout: (workout: WorkoutTemplate, exercises: WorkoutExercise[], targetAthleteId?: string, targetWeekNumber?: number, targetDayName?: string) => void;
}

// ─── COMPONENTE GIORNI DI ALLENAMENTO PULITO & LINEARE ─────────────────────────
interface WorkoutDayListProps {
  assigned: AthleteAssignedWorkout;
  onStart: (assigned: AthleteAssignedWorkout, week: number, day: string) => void;
  activeDraft: ActiveWorkoutDraft | null;
  completedMap: Record<string, boolean>;
  sessionDetailsMap: Record<string, { status?: string; skip_reason?: string; coach_justified?: boolean | null; skip_notes?: string }>;
  days: string[];
  exercises: WorkoutExercise[];
  isLoadingDays?: boolean;
  /** Numero sessioni completate per settimana (numero settimana → conteggio).  
   *  Usato come fallback in calculateCurrentActiveWeek quando i nomi giorni non corrispondono. */
  completedSessionsPerWeek?: Record<number, number>;
}

const WorkoutDayList: React.FC<WorkoutDayListProps> = ({
  assigned,
  onStart,
  activeDraft,
  completedMap,
  sessionDetailsMap,
  days,
  exercises,
  isLoadingDays = false,
  completedSessionsPerWeek,
}) => {
  const totalWeeks = assigned.workout?.total_weeks && assigned.workout.total_weeks > 0 ? assigned.workout.total_weeks : 1;
  const normDay = (str: string) => (str || '').trim().toLowerCase().replace(/\s+/g, ' ');

  // Calcola la settimana attiva corrente in base all'avanzamento reale dell'atleta
  const currentActiveWeek = useMemo(() => {
    return calculateCurrentActiveWeek({
      totalWeeks,
      days,
      completedMap,
      completedSessionsPerWeek,
    });
  }, [totalWeeks, days, completedMap, completedSessionsPerWeek]);

  const [selectedWeek, setSelectedWeek] = useState<number>(currentActiveWeek);
  const [expandedPreviewDay, setExpandedPreviewDay] = useState<string | null>(null);
  const [isCoachNotesOpen, setIsCoachNotesOpen] = useState<boolean>(false);

  useEffect(() => {
    setSelectedWeek(currentActiveWeek);
  }, [currentActiveWeek]);

  // Trova il primo giorno non completato della settimana selezionata
  const nextPendingDay = useMemo(() => {
    return days.find((d) => !completedMap[`${selectedWeek}-${d}`] && !completedMap[`${selectedWeek}-${normDay(d)}`]) || null;
  }, [days, completedMap, selectedWeek]);

  const cleanCoachDescription = useMemo(() => {
    const raw = (assigned.workout?.description || '').trim();
    if (!raw || raw.toLowerCase().startsWith('importata automaticamente da file pdf')) return '';
    return raw;
  }, [assigned.workout?.description]);

  if (isLoadingDays && days.length === 0) {
    return <WorkoutDaysSkeleton />;
  }

  if (!isLoadingDays && days.length === 0) {
    return (
      <div className="bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl p-6 text-center space-y-1 shadow-sm">
        <h4 className="text-sm font-bold text-[var(--color-text)]">{assigned.workout?.title || 'Scheda di Allenamento'}</h4>
        <p className="text-xs text-[var(--color-text-muted)]">
          Nessun giorno o esercizio attualmente configurato per questa scheda dal coach.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-1">
      {/* ─── EVENTUALI NOTE / OBIETTIVI DEL COACH SULLA SCHEDA ─── */}
      {cleanCoachDescription && (
        <div className="rounded-2xl bg-[var(--color-panel)] border border-[var(--color-primary)]/30 px-3.5 py-2.5 shadow-sm">
          <button
            type="button"
            onClick={() => setIsCoachNotesOpen((prev) => !prev)}
            className="w-full flex items-center justify-between gap-2 text-left cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
              <span className="text-xs font-black text-[var(--color-text)] uppercase tracking-wider">
                Indicazioni & Note del Coach
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-[var(--color-primary)] shrink-0">
              <span>{isCoachNotesOpen ? 'Chiudi' : 'Leggi'}</span>
              {isCoachNotesOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </div>
          </button>
          {isCoachNotesOpen && (
            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed whitespace-pre-line pt-2.5 mt-2 border-t border-[var(--color-border)]">
              {cleanCoachDescription}
            </p>
          )}
        </div>
      )}

      {/* ─── SELETTORE SETTIMANE SCALABILE & TOUCH (SUPPORTA FINO A 12+ SETTIMANE) ─── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar className="w-4 h-4 text-[var(--color-primary)]" />
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[var(--color-text)]">
              Settimana {selectedWeek} di {totalWeeks}
            </h3>
            {selectedWeek === currentActiveWeek && (
              <span className="px-2 py-0.5 rounded-full bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-[10px] font-black border border-[var(--color-primary)]/30">
                In corso
              </span>
            )}
          </div>

          {/* Frecce di Navigazione Rapida per scorrere qualsiasi numero di settimane (es. 1..12) */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={selectedWeek <= 1}
              onClick={() => setSelectedWeek((prev) => Math.max(1, prev - 1))}
              className="w-8 h-8 rounded-xl bg-[var(--color-panel)] hover:bg-[var(--color-surface-strong)] border border-[var(--color-panel-border)] disabled:opacity-25 disabled:pointer-events-none text-[var(--color-text)] flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
              title="Settimana precedente"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={selectedWeek >= totalWeeks}
              onClick={() => setSelectedWeek((prev) => Math.min(totalWeeks, prev + 1))}
              className="w-8 h-8 rounded-xl bg-[var(--color-panel)] hover:bg-[var(--color-surface-strong)] border border-[var(--color-panel-border)] disabled:opacity-25 disabled:pointer-events-none text-[var(--color-text)] flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
              title="Settimana successiva"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Barra Pillole Compatta con Scroll Orizzontale Fluido */}
        <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-1 -mx-1 px-1 touch-pan-x scroll-smooth">
          {Array.from({ length: totalWeeks }, (_, idx) => {
            const wNum = idx + 1;
            const isSelected = selectedWeek === wNum;
            const isWeekDone = days.length > 0 && days.every((d) => completedMap[`${wNum}-${d}`] || completedMap[`${wNum}-${normDay(d)}`]);
            const isCurrent = currentActiveWeek === wNum;

            return (
              <button
                key={wNum}
                type="button"
                onClick={() => setSelectedWeek(wNum)}
                className={`min-h-[44px] px-4 sm:px-5 py-2.5 rounded-2xl text-sm sm:text-base font-black transition-all flex items-center gap-2 shrink-0 cursor-pointer select-none active:scale-95 shadow-sm whitespace-nowrap ${
                  isSelected
                    ? 'bg-[var(--color-primary)] text-slate-950 font-black shadow-md shadow-[var(--color-primary)]/20 ring-2 ring-[var(--color-primary)]'
                    : isWeekDone
                    ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/40 hover:bg-emerald-500/25'
                    : isCurrent
                    ? 'bg-[var(--color-panel)] text-[var(--color-text)] border-2 border-[var(--color-primary)]/70'
                    : 'bg-[var(--color-panel)] text-[var(--color-text-muted)] border border-[var(--color-panel-border)] hover:text-[var(--color-text)] hover:border-[var(--color-primary)]/40'
                }`}
              >
                <span>Sett. {wNum}</span>
                {isWeekDone ? (
                  <span className="text-emerald-500 font-black text-sm">✓</span>
                ) : isCurrent && !isSelected ? (
                  <span className="text-xs text-amber-500 font-black bg-amber-500/15 px-2 py-0.5 rounded-md">• Attiva</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── LISTA LINEARE DELLE SEDUTE (GIORNO PER GIORNO) ─── */}
      <div className="space-y-3 pt-1">
        {days.map((dayName, dayIndex) => {
          const key = `${selectedWeek}-${dayName}`;
          const isDone = Boolean(completedMap[key] || completedMap[`${selectedWeek}-${normDay(dayName)}`]);
          const detail = sessionDetailsMap[key] || sessionDetailsMap[`${selectedWeek}-${normDay(dayName)}`];
          const isSkipped = detail?.status === 'skipped';

          const draftDayName = activeDraft?.exercises?.[0]?.day_name;
          const draftWeekNum = activeDraft?.exercises?.[0]?.week_number;
          const hasDraftProgress = Boolean(
            activeDraft &&
            ((activeDraft.elapsedSeconds && activeDraft.elapsedSeconds > 0) ||
             (activeDraft.completedSets && Object.values(activeDraft.completedSets).some((arr) => arr.some(Boolean))))
          );
          const isDraftForThisDay = Boolean(
            hasDraftProgress &&
              activeDraft &&
              (activeDraft.workout?.id === assigned.workout_id ||
                activeDraft.workout?.title === assigned.workout?.title) &&
              Boolean(draftDayName && draftDayName.trim().toLowerCase() === dayName.trim().toLowerCase()) &&
              (typeof draftWeekNum === 'number' ? draftWeekNum === selectedWeek : true)
          );

          const isNextUpcoming = !isDone && nextPendingDay === dayName && selectedWeek === currentActiveWeek && !isDraftForThisDay;

          // Esercizi previsti per questo giorno e settimana (con fallback a settimana 1 se la settimana specifica non ha righe duplicate)
          const dayExercises = exercises.filter(
            (ex) => (ex.week_number || 1) === selectedWeek && matchDayNames(ex.day_name || '', dayName)
          );
          const resolvedDayExercises =
            dayExercises.length > 0
              ? dayExercises
              : exercises.filter((ex) => matchDayNames(ex.day_name || '', dayName));

          const totalSetsInDay = resolvedDayExercises.reduce((acc, ex) => acc + (Number(ex.sets) || 3), 0);
          const estMinutes = resolvedDayExercises.length > 0 ? Math.max(20, Math.round(totalSetsInDay * 2.5 + 8)) : 0;
          const isPreviewExpanded = expandedPreviewDay === dayName;

          return (
            <div
              key={dayName}
              className={`rounded-2xl sm:rounded-3xl border-2 transition-all shadow-md relative z-10 overflow-hidden ${
                isSkipped
                  ? 'bg-amber-500/10 border-amber-500/40 hover:border-amber-500/60'
                  : isDone
                  ? 'bg-[var(--color-panel)] border-[var(--color-panel-border)] hover:border-emerald-500/40'
                  : isDraftForThisDay
                  ? 'bg-amber-500/10 border-[var(--color-primary)] shadow-lg shadow-[var(--color-primary)]/15 ring-2 ring-[var(--color-primary)]/40'
                  : isNextUpcoming
                  ? 'bg-[var(--color-panel)] border-[var(--color-primary)] hover:border-[var(--color-primary)] shadow-lg shadow-[var(--color-primary)]/10 ring-1 ring-[var(--color-primary)]/30'
                  : 'bg-[var(--color-panel)] border-[var(--color-panel-border)] hover:border-[var(--color-primary)]/50'
              }`}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  onStart(assigned, selectedWeek, dayName);
                }}
                className="p-4 sm:p-5 flex items-center justify-between gap-3 sm:gap-4 cursor-pointer select-none group active:scale-[0.99] touch-manipulation"
              >
                {/* Stato a Sinistra + Nome Giorno */}
                <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
                  <div
                    className={`w-11 h-11 sm:w-13 sm:h-13 rounded-2xl flex items-center justify-center font-black text-base sm:text-lg shrink-0 transition-transform group-hover:scale-105 shadow-sm ${
                      isSkipped
                        ? detail?.coach_justified === true
                          ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/40'
                          : detail?.coach_justified === false
                          ? 'bg-rose-500/20 text-rose-500 border border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-500 border border-amber-500/40'
                        : isDone
                        ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/35'
                        : isDraftForThisDay
                        ? 'bg-[var(--color-primary)] text-slate-950 shadow-md shadow-[var(--color-primary)]/30 animate-pulse font-black'
                        : isNextUpcoming
                        ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border-2 border-[var(--color-primary)]/60 font-black'
                        : 'bg-[var(--color-surface-strong)] text-[var(--color-text)] border border-[var(--color-border)] font-bold'
                    }`}
                  >
                    {isSkipped ? (
                      detail?.coach_justified === true ? (
                        <ShieldCheck className="w-6 h-6 text-emerald-500" />
                      ) : detail?.coach_justified === false ? (
                        <XCircle className="w-6 h-6 text-rose-500" />
                      ) : (
                        <AlertCircle className="w-6 h-6 text-amber-500" />
                      )
                    ) : isDone ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    ) : isDraftForThisDay ? (
                      <RotateCcw className="w-6 h-6" />
                    ) : (
                      dayIndex + 1
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                      <h4 className="text-base sm:text-xl font-black text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors truncate">
                        {dayName}
                      </h4>
                      {isSkipped ? (
                        detail?.coach_justified === true ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 text-xs font-black border border-emerald-500/35 shrink-0 flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" /> Giustificato
                          </span>
                        ) : detail?.coach_justified === false ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-500 text-xs font-black border border-rose-500/35 shrink-0 flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" /> Non Giustificato
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 text-xs font-black border border-amber-500/35 shrink-0 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> In attesa
                          </span>
                        )
                      ) : isDone ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 text-xs font-black border border-emerald-500/35 shrink-0">
                          ✓ Completato
                        </span>
                      ) : isDraftForThisDay ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500 text-xs font-black border border-amber-500/40 shrink-0">
                          In corso
                        </span>
                      ) : isNextUpcoming ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-xs font-black border border-[var(--color-primary)]/40 shrink-0">
                          ★ Prossimo
                        </span>
                      ) : null}
                    </div>

                    {/* Metadati: Numero esercizi, Serie e Durata stimata */}
                    {resolvedDayExercises.length > 0 ? (
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap text-xs font-bold text-[var(--color-text-muted)]">
                        <span>{resolvedDayExercises.length} esercizi</span>
                        <span className="opacity-50">•</span>
                        <span>{totalSetsInDay} serie</span>
                        <span className="opacity-50">•</span>
                        <span className="text-[var(--color-primary)] flex items-center gap-1 font-black">
                          <Clock className="w-3 h-3" /> ~{estMinutes} min
                        </span>
                      </div>
                    ) : (
                      <p className="text-sm font-medium text-[var(--color-text-muted)] mt-1 truncate">
                        {isSkipped
                          ? `Saltato: ${detail?.skip_reason || 'Motivi personali'}`
                          : isDone
                          ? 'Seduta già registrata'
                          : isDraftForThisDay
                          ? 'Sessione salvata in sospeso'
                          : isNextUpcoming
                          ? 'Pronta per essere svolta'
                          : 'Seduta di allenamento'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Azione a Destra + Anteprima */}
                <div className="flex items-center gap-2 shrink-0">
                  {resolvedDayExercises.length > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedPreviewDay((prev) => (prev === dayName ? null : dayName));
                      }}
                      className={`w-10 h-10 rounded-xl sm:rounded-2xl flex items-center justify-center border transition-all cursor-pointer ${
                        isPreviewExpanded
                          ? 'bg-[var(--color-primary)] text-slate-950 border-[var(--color-primary)] shadow-sm'
                          : 'bg-[var(--color-surface-strong)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] border-[var(--color-border)]'
                      }`}
                      title={isPreviewExpanded ? 'Chiudi anteprima esercizi' : 'Anteprima esercizi della seduta'}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}

                  {isDone ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onStart(assigned, selectedWeek, dayName);
                      }}
                      className="min-h-[44px] px-4 sm:px-5 py-2.5 rounded-xl sm:rounded-2xl bg-[var(--color-surface-strong)] hover:bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] text-xs sm:text-sm font-black transition-all cursor-pointer shadow-sm"
                    >
                      Rivedi
                    </button>
                  ) : isDraftForThisDay ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onStart(assigned, selectedWeek, dayName);
                      }}
                      className="min-h-[44px] px-5 sm:px-6 py-2.5 rounded-xl sm:rounded-2xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-slate-950 font-black text-sm sm:text-base transition-all cursor-pointer shadow-lg shadow-[var(--color-primary)]/20 flex items-center gap-2 active:scale-95"
                    >
                      <RotateCcw className="w-4 h-4 stroke-[2.5]" />
                      <span>Riprendi</span>
                    </button>
                  ) : isNextUpcoming ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onStart(assigned, selectedWeek, dayName);
                      }}
                      className="min-h-[44px] px-5 sm:px-6 py-2.5 rounded-xl sm:rounded-2xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-slate-950 font-black text-sm sm:text-base transition-all cursor-pointer shadow-lg shadow-[var(--color-primary)]/25 flex items-center gap-2 active:scale-95"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Inizia</span>
                    </button>
                  ) : (
                    <div className="w-10 h-10 rounded-xl sm:rounded-2xl flex items-center justify-center bg-[var(--color-surface-strong)] text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] border border-[var(--color-border)] group-hover:border-[var(--color-primary)]/50 transition-all">
                      <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  )}
                </div>
              </div>

              {/* ── CASSETTO ANTEPRIMA RAPIDA ESERCIZI DELLA SEDUTA (ARMONIZZATO TEMA CHIARO/SCURO) ── */}
              {isPreviewExpanded && resolvedDayExercises.length > 0 && (
                <div className="px-4 sm:px-5 pb-4 pt-3 border-t border-[var(--color-border)] bg-[var(--color-surface-strong)]/80 space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] px-1">
                    <span>Anteprima Esercizi ({resolvedDayExercises.length})</span>
                    <span>Serie × Ripetizioni</span>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {resolvedDayExercises.map((ex, idx) => (
                      <div
                        key={ex.id || idx}
                        className="px-3 py-2 rounded-xl bg-[var(--color-panel)] border border-[var(--color-border)] flex items-center justify-between gap-3 text-xs shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-5 h-5 rounded-md bg-[var(--color-primary)]/15 text-[var(--color-primary)] border border-[var(--color-primary)]/30 font-mono font-black text-[10px] flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-[var(--color-text)] truncate">{ex.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                          <span className="text-[var(--color-text)] font-black bg-[var(--color-surface-strong)] px-2 py-0.5 rounded-md border border-[var(--color-border)]">
                            {ex.sets || 3} × {ex.reps_target || '10'}
                          </span>
                          {ex.target_weight && (
                            <span className="text-[var(--color-primary)] font-black bg-[var(--color-primary)]/15 px-2 py-0.5 rounded-md border border-[var(--color-primary)]/30">
                              {ex.target_weight} kg
                            </span>
                          )}
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
  );
};

// ─── SKELETON SCHEDA ALLENAMENTO NON BLOCCANTE ────────────────────────────────
const WorkoutDaysSkeleton: React.FC = () => (
  <div className="space-y-4 pt-2 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="h-4 w-36 bg-slate-800 rounded-md" />
      <div className="flex gap-1.5">
        <div className="w-8 h-8 rounded-xl bg-slate-800" />
        <div className="w-8 h-8 rounded-xl bg-slate-800" />
      </div>
    </div>
    <div className="flex gap-2 overflow-hidden py-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-8 w-20 bg-slate-800 rounded-2xl shrink-0" />
      ))}
    </div>
    <div className="space-y-2.5 pt-1">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-4 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-800" />
            <div className="space-y-1.5">
              <div className="h-4 w-28 bg-slate-800 rounded-md" />
              <div className="h-3 w-40 bg-slate-800/60 rounded-md" />
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-slate-800" />
        </div>
      ))}
    </div>
  </div>
);

// ─── DASHBOARD PRINCIPALE HOME OPERATIVA ATLETA ─────────────────────────────
export const AthleteDashboard: React.FC<AthleteDashboardProps> = ({ onStartWorkout }) => {
  const { myAssignedWorkouts, getExercisesForWorkout, loading } = useWorkouts();
  const { showSuccess, showError } = useToast();
  const { user } = useAuth();
  const { athletes } = useAthletes();

  const currentAthlete = useMemo(() => {
    if (!user) return null;
    return athletes.find(
      (a) =>
        (a.email && a.email.toLowerCase() === user.email?.toLowerCase()) ||
        (user.id && a.auth_user_id === user.id)
    );
  }, [athletes, user]);

  const athleteId = user?.athleteId || currentAthlete?.id || (user?.role === 'athlete' ? user?.id : null) || 'ath-local';
  const athleteFirstName = useMemo(() => {
    if (user?.name && user.name.trim().length > 0) {
      const parts = user.name.trim().split(' ');
      const rawFirst = parts[0];
      const alphaOnly = rawFirst.replace(/[0-9._-]/g, '');
      if (alphaOnly.length >= 2) {
        return alphaOnly.charAt(0).toUpperCase() + alphaOnly.slice(1).toLowerCase();
      }
      return rawFirst;
    }
    if (user?.email) {
      const prefix = user.email.split('@')[0].replace(/[0-9._-]/g, '');
      if (prefix.length >= 2) {
        return prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase();
      }
    }
    return '';
  }, [user]);

  const [activeDraft, setActiveDraft] = useState<ActiveWorkoutDraft | null>(() => {
    if (typeof window !== 'undefined' && athleteId) {
      try {
        return getActiveWorkoutDraft(athleteId);
      } catch {}
    }
    return null;
  });

  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState<boolean>(false);
  const [onboardingRecord, setOnboardingRecord] = useState<AthleteOnboardingRecord | null>(null);
  const [isLoadingOnboarding, setIsLoadingOnboarding] = useState<boolean>(false);
  const [signedContract, setSignedContract] = useState<AthleteSignedContract | null>(null);
  const [needsContractSignature, setNeedsContractSignature] = useState<boolean>(false);
  const [isLoadingContract, setIsLoadingContract] = useState<boolean>(true);
  const [isContractModalOpen, setIsContractModalOpen] = useState<boolean>(false);

  const [adherenceData, setAdherenceData] = useState<AdherenceScoreResult | null>(() => {
    if (typeof window !== 'undefined' && athleteId) {
      try {
        const saved = localStorage.getItem(`ac_cached_adherence_${athleteId}`);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return null;
  });
  const [isLoadingAdherence, setIsLoadingAdherence] = useState<boolean>(false);
  const [isUpdatingAdherence, setIsUpdatingAdherence] = useState<boolean>(false);

  // Caricamento in background non bloccante di Indice Aderenza & Onboarding
  useEffect(() => {
    if (!athleteId) return;
    let isMounted = true;

    // 1. Revalidazione silenziosa Indice Aderenza in background (rispetta la cache in memoria/locale)
    const loadAdherence = (isBackground = true, force = false) => {
      if (isBackground) {
        setIsUpdatingAdherence(true);
      } else if (!adherenceData) {
        setIsLoadingAdherence(true);
      }

      fetchAthleteAdherenceData(athleteId, force)
        .then((data) => {
          if (isMounted) {
            setAdherenceData(data);
            try {
              localStorage.setItem(`ac_cached_adherence_${athleteId}`, JSON.stringify(data));
            } catch {}
          }
        })
        .catch((e) => console.warn('[AthleteDashboard] Errore aderenza background:', e))
        .finally(() => {
          if (isMounted) {
            setIsLoadingAdherence(false);
            setIsUpdatingAdherence(false);
          }
        });
    };

    loadAdherence(Boolean(adherenceData), false);

    // 2. Caricamento differito del questionario onboarding (dopo 300ms)
    const onboardingTimer = setTimeout(() => {
      setIsLoadingOnboarding(true);
      getAthleteOnboardingResponse(athleteId)
        .then((rec) => {
          if (isMounted) setOnboardingRecord(rec);
        })
        .catch(() => {})
        .finally(() => {
          if (isMounted) setIsLoadingOnboarding(false);
        });
    }, 300);

    // 3. Caricamento contratto firmato & stato versione attiva
    getAthleteContractStatus(athleteId)
      .then((status) => {
        if (isMounted) {
          setSignedContract(status.latestSignature);
          setNeedsContractSignature(status.needsSignature);
          setIsLoadingContract(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          getAthleteSignedContract(athleteId)
            .then((sc) => {
              if (isMounted) {
                setSignedContract(sc);
                setNeedsContractSignature(!sc);
                setIsLoadingContract(false);
              }
            })
            .catch(() => {
              if (isMounted) setIsLoadingContract(false);
            });
        }
      });

    const handleAdherenceRefresh = () => loadAdherence(true, true);
    window.addEventListener('athlete_draft_updated', handleAdherenceRefresh);
    window.addEventListener('pending_sync_queue_updated', handleAdherenceRefresh);

    return () => {
      isMounted = false;
      clearTimeout(onboardingTimer);
      window.removeEventListener('athlete_draft_updated', handleAdherenceRefresh);
      window.removeEventListener('pending_sync_queue_updated', handleAdherenceRefresh);
    };
  }, [athleteId]);

  const checkDraftAndQueue = useCallback(() => {
    if (athleteId) {
      let draft = getActiveWorkoutDraft(athleteId);
      const hasAnyCompletedSet = draft?.completedSets && Object.values(draft.completedSets).some((arr) => arr.some(Boolean));
      const hasAnyTime = Boolean(draft && draft.elapsedSeconds && draft.elapsedSeconds > 0);

      // Se la bozza è vuota o azzerata, eliminala e non considerarla attiva
      if (draft && !hasAnyCompletedSet && !hasAnyTime) {
        clearActiveWorkoutDraft(athleteId);
        draft = null;
      }

      if (draft && myAssignedWorkouts.length > 0) {
        const matching = myAssignedWorkouts.find(
          (aw: any) =>
            aw.workout_id === draft?.workout?.id ||
            aw.workout?.id === draft?.workout?.id ||
            (draft?.workout?.title &&
              aw.workout?.title &&
              aw.workout.title.toLowerCase().includes('scheda') &&
              draft.workout.title.toLowerCase().includes('scheda'))
        );

        if (matching?.workout?.title && matching.workout.title !== draft.workout.title) {
          draft = {
            ...draft,
            workout: {
              ...draft.workout,
              title: matching.workout.title,
              description: matching.workout.description ?? draft.workout.description,
            },
          };
          saveActiveWorkoutDraft(draft);
        }
      }
      setActiveDraft(draft);
      const queue = getPendingSyncQueue();
      setPendingSyncCount(queue.length);
    }
  }, [athleteId, myAssignedWorkouts]);

  useEffect(() => {
    checkDraftAndQueue();

    const handleDraftEvent = () => checkDraftAndQueue();
    window.addEventListener('athlete_draft_updated', handleDraftEvent);
    window.addEventListener('pending_sync_queue_updated', handleDraftEvent);

    return () => {
      window.removeEventListener('athlete_draft_updated', handleDraftEvent);
      window.removeEventListener('pending_sync_queue_updated', handleDraftEvent);
    };
  }, [checkDraftAndQueue]);

  // Sincronizzazione automatica all'avvio e al ritorno online
  useEffect(() => {
    const handleSync = async () => {
      if (navigator.onLine) {
        const res = await syncPendingWorkoutsWithServer();
        if (res.syncedCount > 0) {
          showSuccess('Dati sincronizzati col coach', `${res.syncedCount} allenamento/i inviato/i con successo.`);
          checkDraftAndQueue();
        }
      }
    };

    handleSync();
    window.addEventListener('online', handleSync);
    return () => window.removeEventListener('online', handleSync);
  }, [showSuccess, checkDraftAndQueue]);

  const handleStartWorkout = async (assigned: AthleteAssignedWorkout, selectedWeek?: number, selectedDay?: string) => {
    try {
      console.log('[AthleteDashboard] Avvio workout richiesto:', { assigned, selectedWeek, selectedDay });
      const targetWIds = Array.from(
        new Set([assigned.workout_id, assigned.workout?.id, assigned.workout?.parent_template_id].filter(Boolean) as string[])
      );

      let allExercises: WorkoutExercise[] = [];
      for (const wId of targetWIds) {
        const exs = await getExercisesForWorkout(wId);
        if (exs && exs.length > 0) {
          allExercises = exs;
          break;
        }
      }

      console.log(`[AthleteDashboard] Esercizi recuperati dal DB: ${allExercises.length}`);

      const norm = (s: string) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
      const isDayMatch = (d1: string, d2: string) => {
        const n1 = norm(d1);
        const n2 = norm(d2);
        if (!n1 || !n2) return false;
        if (n1 === n2) return true;
        if (n1.startsWith(n2) || n2.startsWith(n1)) return true;
        const l1 = n1.replace(/[^a-z0-9]/g, '');
        const l2 = n2.replace(/[^a-z0-9]/g, '');
        return l1 === l2 || (l1.length > 0 && l2.length > 0 && (l1.includes(l2) || l2.includes(l1)));
      };

      const maxTotalWeeks = assigned.workout?.total_weeks && assigned.workout.total_weeks > 0 ? assigned.workout.total_weeks : 1;
      const targetWeek = Math.min(maxTotalWeeks, Math.max(1, selectedWeek || 1));
      const targetDay = (selectedDay && selectedDay.trim()) || '';

      // 1. Filtra per settimana e giorno
      let filtered = allExercises.filter((ex) => {
        const exWeek = ex.week_number || 1;
        const exDay = ex.day_name || '';
        return exWeek === targetWeek && isDayMatch(exDay, targetDay);
      });

      // 2. Se non trova per settimana specifica, cerca per giorno in qualsiasi settimana
      if (filtered.length === 0 && targetDay) {
        filtered = allExercises.filter((ex) => isDayMatch(ex.day_name || '', targetDay));
      }

      // 3. Se ancora vuoto ma ci sono esercizi, usa tutti o il primo giorno disponibile per evitare player vuoto
      if (filtered.length === 0 && allExercises.length > 0) {
        console.warn(`[AthleteDashboard] Nessun esercizio trovato per ${targetDay} (Settimana ${targetWeek}), uso fallback primi esercizi.`);
        const firstDay = allExercises[0].day_name || targetDay || 'Giorno 1';
        filtered = allExercises.filter((ex) => isDayMatch(ex.day_name || '', firstDay));
      }

      const resolvedDayName = targetDay || filtered[0]?.day_name || allExercises[0]?.day_name || 'Giorno 1';
      // Sanitizza e assicura settimana e giorno coerenti per il player
      const sanitizedFiltered: WorkoutExercise[] = (filtered.length > 0 ? filtered : allExercises).map((ex) => ({
        ...ex,
        week_number: targetWeek,
        day_name: ex.day_name || resolvedDayName,
      }));

      console.log(`[AthleteDashboard] Esercizi filtrati e sanitizzati per il player: ${sanitizedFiltered.length}`, sanitizedFiltered.map(e => `${e.name} (${e.day_name}, Sett.${e.week_number})`));

      const workoutObj: WorkoutTemplate = assigned.workout || {
        id: assigned.workout_id,
        title: 'Programma di Allenamento',
        description: '',
        total_weeks: maxTotalWeeks,
        coach_id: '',
        is_template: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      onStartWorkout(workoutObj, sanitizedFiltered, assigned.athlete_id, targetWeek, resolvedDayName);
    } catch (err) {
      console.error('[AthleteDashboard] Errore avvio workout:', err);
      showError('Impossibile caricare gli esercizi della scheda');
    }
  };

  // Identifica la scheda attiva: ordina SEMPRE per data decrescente, poi cerca is_active=true
  // CRITICO: garantisce che se ci sono più schede attive o storiche venga scelta quella più recente
  const firstAssigned = useMemo(() => {
    if (myAssignedWorkouts.length === 0) return undefined;
    const sorted = [...myAssignedWorkouts].sort((a, b) => {
      const dA = new Date(a.assigned_date || a.start_date || 0).getTime();
      const dB = new Date(b.assigned_date || b.start_date || 0).getTime();
      return dB - dA;
    });
    const active = sorted.find((a) => a.is_active === true);
    if (active) return active;
    return sorted[0];
  }, [myAssignedWorkouts]);

  const memoizedAthleteIds = useMemo(() => {
    return Array.from(new Set([firstAssigned?.athlete_id, user?.athleteId, user?.id].filter(Boolean) as string[]));
  }, [firstAssigned?.athlete_id, user?.athleteId, user?.id]);

  // ─── STATO PROGRESSO CENTRALIZZATO NEL PARENT (NON SI SMONTA MAI) ───────────
  const [cachedSessionsForHistory, setCachedSessionsForHistory] = useState<SessionRow[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const athId = user?.athleteId || user?.id || athleteId;
        if (athId && athId !== 'ath-local') {
          const cached = localStorage.getItem(`ac_cached_sessions_${athId}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
          }
        }
      } catch {}
    }
    return [];
  });

  const [globalProgressMap, setGlobalProgressMap] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const athId = user?.athleteId || user?.id || athleteId;
        if (firstAssigned?.workout_id && athId) {
          const cached = localStorage.getItem(`builder_progress_${athId}_${firstAssigned.workout_id}`);
          if (cached) return JSON.parse(cached);
        }
      } catch {}
    }
    return {};
  });

  const [globalSessionDetailsMap, setGlobalSessionDetailsMap] = useState<
    Record<string, { status?: string; skip_reason?: string; coach_justified?: boolean | null; skip_notes?: string }>
  >(() => {
    if (typeof window !== 'undefined') {
      try {
        const athId = user?.athleteId || user?.id || athleteId;
        if (firstAssigned?.workout_id && athId && athId !== 'ath-local') {
          const cached = localStorage.getItem(`ac_cached_details_map_${athId}_${firstAssigned.workout_id}`);
          if (cached) return JSON.parse(cached);
        }
      } catch {}
    }
    return {};
  });

  // Conteggio sessioni completate per settimana (fallback count-based per calculateCurrentActiveWeek)
  const [globalSessionsPerWeek, setGlobalSessionsPerWeek] = useState<Record<number, number>>({});

  // Idratazione reattiva della cache quando cambia la scheda attiva (firstAssigned.workout_id)
  useEffect(() => {
    const realAthId = user?.athleteId || user?.id || (athleteId !== 'ath-local' ? athleteId : '');
    if (!realAthId) return;
    try {
      if (firstAssigned?.workout_id) {
        const progCached = localStorage.getItem(`builder_progress_${realAthId}_${firstAssigned.workout_id}`);
        if (progCached) {
          setGlobalProgressMap(JSON.parse(progCached));
        } else {
          setGlobalProgressMap({});
        }
        const detailsCached = localStorage.getItem(`ac_cached_details_map_${realAthId}_${firstAssigned.workout_id}`);
        if (detailsCached) {
          setGlobalSessionDetailsMap(JSON.parse(detailsCached));
        } else {
          setGlobalSessionDetailsMap({});
        }
        setGlobalSessionsPerWeek({});
      } else {
        setGlobalProgressMap({});
        setGlobalSessionDetailsMap({});
        setGlobalSessionsPerWeek({});
      }
      const sessCached = localStorage.getItem(`ac_cached_sessions_${realAthId}`);
      if (sessCached) {
        const parsed = JSON.parse(sessCached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCachedSessionsForHistory((prev) => (prev.length === 0 ? parsed : prev));
        }
      }
    } catch {}
  }, [user?.athleteId, user?.id, athleteId, firstAssigned?.workout_id]);

  // Mappa giorni reali ed esercizi per ogni scheda assegnata
  const [workoutDaysMap, setWorkoutDaysMap] = useState<Record<string, string[]>>(() => {
    const initialMap: Record<string, string[]> = {};
    myAssignedWorkouts.forEach((assigned) => {
      try {
        const cached = localStorage.getItem(`builder_days_v2_${assigned.workout_id}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            initialMap[assigned.workout_id] = parsed;
          }
        }
      } catch (_) {}
    });
    return initialMap;
  });
  const [workoutExercisesMap, setWorkoutExercisesMap] = useState<Record<string, WorkoutExercise[]>>(() => {
    const initialExMap: Record<string, WorkoutExercise[]> = {};
    myAssignedWorkouts.forEach((assigned) => {
      try {
        const cachedEx = localStorage.getItem(`ac_cached_exercises_v1_${assigned.workout_id}`);
        if (cachedEx) {
          const parsedEx = JSON.parse(cachedEx);
          if (Array.isArray(parsedEx) && parsedEx.length > 0) {
            initialExMap[assigned.workout_id] = parsedEx;
          }
        }
      } catch (_) {}
    });
    return initialExMap;
  });
  const [loadingDaysMap, setLoadingDaysMap] = useState<Record<string, boolean>>({});

  // Carica i giorni reali per ciascuna scheda assegnata con singola query batch e guardia isMounted
  useEffect(() => {
    if (myAssignedWorkouts.length === 0) return;
    let isMounted = true;

    const workoutToTargetIdsMap = new Map<string, string[]>();
    const allQueryIds: string[] = [];

    myAssignedWorkouts.forEach((assigned) => {
      const wId = assigned.workout_id;
      const targetWIds = Array.from(
        new Set([wId, assigned.workout?.id, assigned.workout?.parent_template_id].filter(Boolean) as string[])
      );
      if (targetWIds.length > 0) {
        workoutToTargetIdsMap.set(wId, targetWIds);
        allQueryIds.push(...targetWIds);
      }
    });

    if (allQueryIds.length === 0) return;
    const uniqueQueryIds = Array.from(new Set(allQueryIds));

    setLoadingDaysMap((prev) => {
      const next = { ...prev };
      myAssignedWorkouts.forEach((a) => {
        next[a.workout_id] = true;
      });
      return next;
    });

    (async () => {
      try {
        const { data, error } = await supabase
          .from('workout_exercises')
          .select('*')
          .in('workout_id', uniqueQueryIds)
          .order('week_number', { ascending: true })
          .order('order_index', { ascending: true });

        if (!isMounted) return;

        if (error) {
          console.warn('[AthleteDashboard] Errore caricamento giorni (uso cache offline):', error.message);
          const fallbackDaysMap: Record<string, string[]> = {};
          const fallbackExMap: Record<string, WorkoutExercise[]> = {};
          myAssignedWorkouts.forEach((assigned) => {
            const wId = assigned.workout_id;
            const targetWIds = workoutToTargetIdsMap.get(wId) || [wId];
            for (const tid of targetWIds) {
              try {
                const rawEx = localStorage.getItem(`ac_cached_exercises_v1_${tid}`);
                if (rawEx) {
                  const parsedEx = JSON.parse(rawEx) as WorkoutExercise[];
                  if (Array.isArray(parsedEx) && parsedEx.length > 0) {
                    fallbackExMap[wId] = parsedEx;
                  }
                  const unique: string[] = [];
                  parsedEx.forEach((e) => {
                    const d = (e.day_name || '').trim();
                    if (d && !unique.includes(d)) unique.push(d);
                  });
                  if (unique.length > 0) {
                    fallbackDaysMap[wId] = unique;
                    break;
                  }
                }
              } catch {}
            }
          });
          if (Object.keys(fallbackDaysMap).length > 0) {
            setWorkoutDaysMap((prev) => ({ ...prev, ...fallbackDaysMap }));
          }
          if (Object.keys(fallbackExMap).length > 0) {
            setWorkoutExercisesMap((prev) => ({ ...prev, ...fallbackExMap }));
          }
        } else if (data) {
          const newWorkoutDaysMap: Record<string, string[]> = {};
          const newWorkoutExercisesMap: Record<string, WorkoutExercise[]> = {};

          // Salva anche gli esercizi completi per ciascun workout_id nella cache offline
          for (const qId of uniqueQueryIds) {
            const rowsForId = data.filter((e) => e.workout_id === qId);
            if (rowsForId.length > 0) {
              try {
                localStorage.setItem(`ac_cached_exercises_v1_${qId}`, JSON.stringify(rowsForId));
              } catch (_) {}
            }
          }

          myAssignedWorkouts.forEach((assigned) => {
            const wId = assigned.workout_id;
            const targetWIds = workoutToTargetIdsMap.get(wId) || [wId];
            const matchingRows = data.filter((e) => targetWIds.includes(e.workout_id)) as WorkoutExercise[];
            if (matchingRows.length > 0) {
              newWorkoutExercisesMap[wId] = matchingRows;
              try {
                localStorage.setItem(`ac_cached_exercises_v1_${wId}`, JSON.stringify(matchingRows));
              } catch (_) {}
            }
            const rawDays = matchingRows.map((e) => (e.day_name || '').trim()).filter(Boolean);
            const unique: string[] = [];
            rawDays.forEach((d) => {
              if (d && !unique.includes(d)) unique.push(d);
            });
            const daysToSet = unique.length > 0 ? unique : ['Giorno 1'];
            newWorkoutDaysMap[wId] = daysToSet;
            try {
              localStorage.setItem(`builder_days_v2_${wId}`, JSON.stringify(daysToSet));
            } catch (_) {}
          });

          setWorkoutDaysMap((prev) => ({ ...prev, ...newWorkoutDaysMap }));
          setWorkoutExercisesMap((prev) => ({ ...prev, ...newWorkoutExercisesMap }));
        }
      } catch (fetchErr) {
        console.warn('[AthleteDashboard] Eccezione fetch giorni (modalità offline):', fetchErr);
      } finally {
        if (isMounted) {
          setLoadingDaysMap((prev) => {
            const next = { ...prev };
            myAssignedWorkouts.forEach((a) => {
              next[a.workout_id] = false;
            });
            return next;
          });
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [myAssignedWorkouts]);

  const firstAssignedRef = React.useRef(firstAssigned);
  firstAssignedRef.current = firstAssigned;
  const workoutDaysMapRef = React.useRef(workoutDaysMap);
  workoutDaysMapRef.current = workoutDaysMap;
  const myAssignedWorkoutsRef = React.useRef(myAssignedWorkouts);
  myAssignedWorkoutsRef.current = myAssignedWorkouts;
  const isSyncingRef = React.useRef(false);
  const lastSyncTimestampRef = React.useRef(0);

  // Sync progresso da Supabase — vive nel parent, sopravvive allo smontaggio del player
  const syncProgressFromDb = useCallback(async (force = false) => {
    const currentFirstAssigned = firstAssignedRef.current;
    if (!currentFirstAssigned || isSyncingRef.current) return;

    // Cooldown per evitare query ripetute a cascata sui render iniziali
    // NOTA: il primo sync (lastSyncTimestampRef.current === 0) bypassa sempre il cooldown
    // per non restare bloccati sulla cache localStorage stale all'avvio.
    const now = Date.now();
    const isFirstSync = lastSyncTimestampRef.current === 0;
    if (!force && !isFirstSync && now - lastSyncTimestampRef.current < 6000) return;

    const athIds = Array.from(
      new Set([currentFirstAssigned.athlete_id, user?.athleteId, currentAthlete?.id, user?.id].filter(Boolean) as string[])
    );
    if (athIds.length === 0) return;

    isSyncingRef.current = true;
    lastSyncTimestampRef.current = now;
    const startTime = performance.now();

    const totalWeeksCount = currentFirstAssigned.workout?.total_weeks && currentFirstAssigned.workout.total_weeks > 0
      ? currentFirstAssigned.workout.total_weeks
      : 1;

    const relatedWorkoutIds = resolveRelatedWorkoutIds({
      assignedWorkoutId: currentFirstAssigned.workout_id,
      parentTemplateId: currentFirstAssigned.workout?.parent_template_id,
    });
    const activeAssignedDate = currentFirstAssigned.assigned_date || currentFirstAssigned.start_date || null;

    try {
      let rawSessions: SessionRow[] = [];
      let query = supabase
        .from('workout_sessions')
        .select('id, week_number, day_name, status, skip_reason, skip_notes, coach_justified, coach_feedback, start_time, end_time, rpe, notes, workout_id, workouts(title, total_weeks)')
        .in('athlete_id', athIds);

      const { data, error } = await query.order('start_time', { ascending: true });

      if (error) {
        let retryQuery = supabase
          .from('workout_sessions')
          .select('id, week_number, day_name, status, start_time, end_time, rpe, notes, workout_id, workouts(title, total_weeks)')
          .in('athlete_id', athIds);
        const retry = await retryQuery.order('start_time', { ascending: true });
        if (retry.error) {
          console.warn('[AthleteDashboard] Errore query workout_sessions:', retry.error);
          return;
        }
        rawSessions = (retry.data as unknown as SessionRow[]) || [];
      } else {
        rawSessions = (data as unknown as SessionRow[]) || [];
      }

      console.log(`[AthleteDashboard] syncProgressFromDb completato in ${(performance.now() - startTime).toFixed(1)}ms. Righe: ${rawSessions.length}`);

      const currentMap: Record<string, boolean> = {};
      const detailsMap: Record<string, { status?: string; skip_reason?: string; coach_justified?: boolean | null; skip_notes?: string }> = {};

      // Usa la ref per evitare closure stale (workoutDaysMap potrebbe non essere ancora popolata
      // al momento della creazione della callback, ma la ref ha sempre il valore aggiornato)
      const currentDays = workoutDaysMapRef.current[currentFirstAssigned.workout_id] || [];

      rawSessions.forEach((s) => {
        const rawWeek = Number(s.week_number);
        const rawD = (s.day_name || '').trim();
        const normD = normalizeDayName(rawD);
        const isDone = isCompletedSession(s);
        const isSkipped = s.status === 'skipped';

        // Solo le sessioni pertinenti alla scheda attiva (e al ciclo corrente di assegnazione) con settimana e giorno validi
        const isCurrentWorkout = Boolean(
          s.workout_id &&
          relatedWorkoutIds.length > 0 &&
          relatedWorkoutIds.includes(s.workout_id) &&
          isSessionWithinAssignmentCycle(s, activeAssignedDate)
        );

        if (isCurrentWorkout && rawWeek > 0 && normD) {
          const wNum = totalWeeksCount > 0 ? Math.min(totalWeeksCount, rawWeek) : rawWeek;
          const matchedPlannedDay = currentDays.find((d) => matchDayNames(d, rawD));
          const canonicalDay = matchedPlannedDay || rawD;
          const normCanonical = normalizeDayName(canonicalDay);

          [rawD, normD, canonicalDay, normCanonical].filter(Boolean).forEach((key) => {
            if (isDone) {
              currentMap[`${wNum}-${key}`] = true;
            }
            if (isDone || isSkipped) {
              detailsMap[`${wNum}-${key}`] = {
                status: s.status || undefined,
                skip_reason: s.skip_reason || undefined,
                skip_notes: s.skip_notes || undefined,
                coach_justified: s.coach_justified,
              };
            }
          });
        }
      });

      // Riconciliazione avanzamento: se le sessioni completate in una settimana coprono il numero di giorni previsti
      // CRITICO: filtra per il workout corrente e per il ciclo di assegnazione attivo
      const currentWorkoutSessions = rawSessions.filter((s) =>
        isCompletedSession(s) &&
        relatedWorkoutIds.length > 0 &&
        s.workout_id != null &&
        relatedWorkoutIds.includes(s.workout_id) &&
        isSessionWithinAssignmentCycle(s, activeAssignedDate)
      );
      const completedSessionsByWeek = new Map<number, number>();
      currentWorkoutSessions.forEach((s) => {
        const w = Number(s.week_number);
        if (w > 0) completedSessionsByWeek.set(w, (completedSessionsByWeek.get(w) || 0) + 1);
      });

      if (currentDays.length > 0) {
        completedSessionsByWeek.forEach((count, w) => {
          if (count >= currentDays.length) {
            currentDays.forEach((d) => {
              const norm = normalizeDayName(d);
              currentMap[`${w}-${d}`] = true;
              currentMap[`${w}-${norm}`] = true;
            });
          }
        });
      }

      setGlobalProgressMap(currentMap);
      setGlobalSessionDetailsMap(detailsMap);
      // Salva il conteggio sessioni per settimana per il fallback count-based di calculateCurrentActiveWeek
      const sessionsPerWeekRecord: Record<number, number> = {};
      completedSessionsByWeek.forEach((count, w) => { sessionsPerWeekRecord[w] = count; });
      setGlobalSessionsPerWeek(sessionsPerWeekRecord);
      setCachedSessionsForHistory(rawSessions);

      // Aggiorna anche localStorage come cache (rigorosamente scoped per workout_id)
      athIds.forEach((aid) => {
        try {
          localStorage.setItem(`builder_progress_${aid}_${currentFirstAssigned.workout_id}`, JSON.stringify(currentMap));
          localStorage.setItem(`ac_cached_details_map_${aid}_${currentFirstAssigned.workout_id}`, JSON.stringify(detailsMap));
          localStorage.setItem(`ac_cached_sessions_${aid}`, JSON.stringify(rawSessions));
        } catch (_) {}
      });
    } finally {
      isSyncingRef.current = false;
    }
  }, [user?.athleteId, user?.id]);

  // Esegui sync all'avvio, al cambio scheda attiva e ad ogni evento di completamento con debounce
  useEffect(() => {
    syncProgressFromDb(true);
    let timer: ReturnType<typeof setTimeout> | null = null;
    const handleWorkoutDone = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => syncProgressFromDb(true), 300);
    };
    window.addEventListener('athlete_workout_completed', handleWorkoutDone);
    window.addEventListener('athlete_workout_skipped', handleWorkoutDone);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('athlete_workout_completed', handleWorkoutDone);
      window.removeEventListener('athlete_workout_skipped', handleWorkoutDone);
    };
  }, [syncProgressFromDb, firstAssigned?.workout_id, firstAssigned?.assigned_date]);

  // Quando workoutDaysMap si popola per la prima volta, forza un nuovo sync
  // così la riconciliazione settimanale può usare i giorni reali della scheda
  const prevDaysMapKeyCountRef = React.useRef(0);
  useEffect(() => {
    const currentKeyCount = Object.keys(workoutDaysMap).length;
    if (currentKeyCount > 0 && prevDaysMapKeyCountRef.current === 0) {
      syncProgressFromDb(true);
    }
    prevDaysMapKeyCountRef.current = currentKeyCount;
  }, [workoutDaysMap, syncProgressFromDb]);

  if (isOnboardingModalOpen) {
    return (
      <div className="py-4">
        <AthleteQuestionnaireWizard
          athleteId={athleteId}
          athleteName={athleteFirstName}
          onClose={() => setIsOnboardingModalOpen(false)}
          onComplete={(newRec) => {
            setOnboardingRecord(newRec);
            setIsOnboardingModalOpen(false);
            showSuccess('Questionario inviato!', 'I tuoi dati sono stati registrati con successo.');
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-32 font-sans max-w-3xl mx-auto animate-in fade-in duration-200">
      {/* ─── 1. HEADER: SALUTO PULITO & MINIMALE (0 MS) ─── */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-[var(--color-text)] tracking-tight">
          {athleteFirstName ? `Ciao ${athleteFirstName} 👋` : 'Il tuo Allenamento'}
        </h2>
      </div>

      {/* ─── BANNER INVITO AGGIUNGI AC ALLA HOME ─── */}
      <PwaInstallBanner />

      {/* ─── BANNER ONBOARDING QUESTIONARIO SE NON COMPLETATO ─── */}
      {!isLoadingOnboarding && (!onboardingRecord || onboardingRecord.status !== 'completed') && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-500/15 via-[var(--color-primary)]/10 to-amber-500/5 border border-[var(--color-primary)]/40 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[var(--color-primary)] text-black text-[10px] font-black uppercase">
                Primo Check-in
              </span>
              {onboardingRecord?.currentStep && onboardingRecord.currentStep > 1 && (
                <span className="text-[11px] font-bold text-amber-400">
                  • Bozza salvata al Passo {onboardingRecord.currentStep}
                </span>
              )}
            </div>
            <h3 className="text-base font-black text-white">
              Compila il Questionario Anamnesi Iniziale
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed max-w-lg">
              Aiuta il tuo coach a definire i tuoi massimali, orari, preferenze alimentari e prevenire fastidi articolari prima di iniziare.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsOnboardingModalOpen(true)}
            className="px-5 py-3 rounded-2xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all shadow-lg shrink-0 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>{onboardingRecord?.currentStep && onboardingRecord.currentStep > 1 ? 'Riprendi Compilazione' : 'Compila in 5 Minuti'}</span>
          </button>
        </div>
      )}

      {/* ─── BANNER ACCORDO & PATTO DI TESTIMONIANZA SE NON FIRMATO O DA RINNOVARE ─── */}
      {!isLoadingContract && needsContractSignature && (
        <div className="p-5 rounded-3xl bg-slate-900 border border-amber-400/40 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase">
                Documento in Sospeso
              </span>
            </div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
              Termini e condizioni di utilizzo 2026/2027
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setIsContractModalOpen(true)}
            className="px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-400/20 shrink-0 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <span>Firma Ora</span>
          </button>
        </div>
      )}

      {/* ─── 2. INDICE ADERENZA AL PERCORSO (STALE-WHILE-REVALIDATE IMMEDIATO) ─── */}
      {adherenceData && (
        <AthleteAdherenceCard
          adherence={adherenceData}
          loading={isLoadingAdherence}
          isUpdating={isUpdatingAdherence}
        />
      )}

      {/* ─── 3. BANNER MODALITÀ OFFLINE E CODA SINCRONIZZAZIONE ─── */}
      {!isOnline && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-300 shadow-sm">
          <div className="flex items-center gap-2.5">
            <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Modalità Offline attiva</strong> — La tua scheda è salvata sul dispositivo: puoi aprire ed eseguire tutti gli allenamenti anche senza connessione.
            </span>
          </div>
        </div>
      )}

      {pendingSyncCount > 0 && (
        <div className="p-3.5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-primary)]/30 flex items-center justify-between text-xs text-[var(--color-text)] shadow-sm">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
            <span>
              <strong>{pendingSyncCount}</strong> allenamento/i salvato/i in locale in attesa di connessione.
            </span>
          </div>
          <button
            type="button"
            onClick={async () => {
              const res = await syncPendingWorkoutsWithServer();
              if (res.syncedCount > 0) {
                showSuccess('Dati sincronizzati!', `${res.syncedCount} allenamento/i caricato/i.`);
                checkDraftAndQueue();
              }
            }}
            className="px-3 py-1.5 rounded-xl bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/30 font-bold hover:bg-[var(--color-primary)]/30 transition-colors cursor-pointer shrink-0"
          >
            Sincronizza
          </button>
        </div>
      )}

      {/* ─── 4. TUTTI I GIORNI DELLA SCHEDA IN ELENCO LINEARE PULITO ─── */}
      {loading && !firstAssigned ? (
        <WorkoutDaysSkeleton />
      ) : !firstAssigned ? (
        <div className="bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-3xl p-8 sm:p-12 text-center space-y-3 shadow-md">
          <div className="w-14 h-14 bg-[var(--color-surface-strong)] rounded-2xl flex items-center justify-center mx-auto text-[var(--color-text-muted)]">
            <Dumbbell className="w-7 h-7" />
          </div>
          <h3 className="text-base sm:text-lg font-black text-[var(--color-text)]">Nessuna scheda assegnata</h3>
          <p className="text-[var(--color-text-muted)] text-xs max-w-sm mx-auto leading-relaxed">
            Il tuo coach non ti ha ancora assegnato un programma di allenamento. Riceverai una notifica non appena sarà pronto!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <WorkoutDayList
            key={firstAssigned.id}
            assigned={firstAssigned}
            onStart={handleStartWorkout}
            activeDraft={activeDraft}
            completedMap={globalProgressMap}
            sessionDetailsMap={globalSessionDetailsMap}
            days={workoutDaysMap[firstAssigned.workout_id] || []}
            exercises={workoutExercisesMap[firstAssigned.workout_id] || []}
            isLoadingDays={Boolean(loadingDaysMap[firstAssigned.workout_id])}
            completedSessionsPerWeek={globalSessionsPerWeek}
          />
        </div>
      )}

      {/* ─── 5. STORICO ALLENAMENTI COMPLETATI (RAGGRUPPATO PER SCHEDA -> SETTIMANA) ─── */}
      <AthleteWorkoutHistory
        athleteId={athleteId}
        athleteIds={memoizedAthleteIds}
        activeWorkoutId={firstAssigned?.workout_id}
        activeWorkoutTitle={firstAssigned?.workout?.title}
        activeAssignedDate={firstAssigned?.assigned_date || firstAssigned?.start_date}
        initialSessions={cachedSessionsForHistory}
      />

      {/* Modale Firma Rapida Contratto */}
      {athleteId && (
        <ContractSignatureModal
          isOpen={isContractModalOpen}
          onClose={() => setIsContractModalOpen(false)}
          athleteId={athleteId}
          athleteName={athleteFirstName ? `${athleteFirstName} ${currentAthlete?.lastName || ''}`.trim() : (user?.name || 'Atleta')}
          athleteBirthDate={currentAthlete?.dateOfBirth}
          athleteBirthPlace={currentAthlete?.city}
          athleteAddress={currentAthlete?.address}
          athleteFiscalCode={currentAthlete?.fiscalCode}
          readOnly={!needsContractSignature && Boolean(signedContract)}
          onSignedSuccess={(newSigned) => {
            setSignedContract(newSigned);
            setNeedsContractSignature(false);
            setIsContractModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
