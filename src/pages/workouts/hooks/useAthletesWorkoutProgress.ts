import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { Athlete } from '../../../types';
import { AthleteAssignedWorkout } from '../../../types/workout';
import { isCompletedSession, normalizeDayName, matchDayNames } from '../../../services/workoutProgressService';

export type AthleteProgramStatus =
  | 'completed'
  | 'near_end'
  | 'in_progress'
  | 'just_started'
  | 'not_started'
  | 'no_workout'
  | 'data_error';

export interface AthleteProgressDetail {
  athleteId: string;
  workoutId?: string;
  workoutTitle?: string;
  totalWeeks: number;
  hasActiveWorkout: boolean;
  status: 'loading' | 'success' | 'error';
  errorMessage?: string;
  completedSessions: number;
  plannedSessions: number;
  progressPercentage: number;
  lastWorkoutDateIso: string | null;
  lastWorkoutLabel: string;
  nextSessionLabel: string;
  daysSinceLastWorkout: number | null;
  programStatus: AthleteProgramStatus;
  programStatusLabel: string;
  orderedDays?: string[];
  daysPerWeek?: number;
}

interface WorkoutExerciseRow {
  workout_id: string;
  week_number?: number | null;
  day_name?: string | null;
  order_index?: number | null;
}

interface WorkoutSessionRow {
  id: string;
  athlete_id: string;
  workout_id?: string | null;
  week_number?: number | null;
  day_name?: string | null;
  status?: string | null;
  start_time?: string | null;
  end_time?: string | null;
}

/**
 * Calcola data relativa in stile italiano: "oggi", "ieri", "X giorni fa", oppure data breve.
 */
function formatRelativeWorkoutDate(dateIso: string): string {
  const date = new Date(dateIso);
  const now = new Date();
  
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const sessionDayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((todayStart - sessionDayStart) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 'oggi';
  if (diffDays === 1) return 'ieri';
  if (diffDays >= 2 && diffDays <= 6) return `${diffDays} giorni fa`;
  
  return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

export function useAthletesWorkoutProgress(
  athletes: Athlete[],
  allAssignedWorkouts: AthleteAssignedWorkout[]
) {
  const [progressMap, setProgressMap] = useState<Map<string, AthleteProgressDetail>>(new Map());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const retry = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function fetchProgressData() {
      setIsLoading(true);
      setError(null);

      // Prepara mappa iniziale con stato "loading" per ogni atleta
      const initialMap = new Map<string, AthleteProgressDetail>();
      athletes.forEach((ath) => {
        initialMap.set(ath.id, {
          athleteId: ath.id,
          totalWeeks: 4,
          hasActiveWorkout: false,
          status: 'loading',
          completedSessions: 0,
          plannedSessions: 0,
          progressPercentage: 0,
          lastWorkoutDateIso: null,
          lastWorkoutLabel: 'Verifica in corso…',
          nextSessionLabel: 'Verifica in corso…',
          daysSinceLastWorkout: null,
          programStatus: 'not_started',
          programStatusLabel: 'Verifica in corso…',
        });
      });
      setProgressMap(initialMap);

      try {
        // 1. Mappa assegnazioni attive per atleta
        const activeAssignmentsMap = new Map<string, AthleteAssignedWorkout>();
        const targetWorkoutIds = new Set<string>();
        const allTargetAthleteIds = new Set<string>();

        for (const ath of athletes) {
          allTargetAthleteIds.add(ath.id);
          if (ath.auth_user_id) {
            allTargetAthleteIds.add(ath.auth_user_id);
          }

          // Cerca assegnazione attiva per questo atleta
          const assignment = allAssignedWorkouts.find(
            (a) =>
              (a.athlete_id === ath.id || (ath.auth_user_id && a.athlete_id === ath.auth_user_id)) &&
              a.is_active &&
              a.workout != null
          );

          if (assignment && assignment.workout) {
            activeAssignmentsMap.set(ath.id, assignment);
            if (assignment.workout.id) targetWorkoutIds.add(assignment.workout.id);
            if (assignment.workout.parent_template_id) {
              targetWorkoutIds.add(assignment.workout.parent_template_id);
            }
          }
        }

        const workoutIdsArray = Array.from(targetWorkoutIds);
        const athleteIdsArray = Array.from(allTargetAthleteIds);

        // Se non ci sono atleti o schede attive, restituisci subito
        if (workoutIdsArray.length === 0 || athleteIdsArray.length === 0) {
          if (!isMounted) return;
          const emptyMap = new Map<string, AthleteProgressDetail>();
          athletes.forEach((ath) => {
            emptyMap.set(ath.id, {
              athleteId: ath.id,
              totalWeeks: 0,
              hasActiveWorkout: false,
              status: 'success',
              completedSessions: 0,
              plannedSessions: 0,
              progressPercentage: 0,
              lastWorkoutDateIso: null,
              lastWorkoutLabel: 'Nessun allenamento registrato',
              nextSessionLabel: 'Nessun avanzamento disponibile',
              daysSinceLastWorkout: null,
              programStatus: 'no_workout',
              programStatusLabel: 'Senza scheda',
            });
          });
          setProgressMap(emptyMap);
          setIsLoading(false);
          return;
        }

        // 2. Query parallela: workout_exercises (struttura reale giorni) e workout_sessions (sessioni svolte)
        const [exercisesRes, sessionsRes] = await Promise.all([
          supabase
            .from('workout_exercises')
            .select('workout_id, week_number, day_name, order_index')
            .in('workout_id', workoutIdsArray)
            .order('week_number', { ascending: true })
            .order('order_index', { ascending: true }),
          supabase
            .from('workout_sessions')
            .select('id, athlete_id, workout_id, week_number, day_name, status, start_time, end_time')
            .in('athlete_id', athleteIdsArray)
            .not('end_time', 'is', null)
            .order('end_time', { ascending: false })
            .limit(1000),

        ]);

        if (exercisesRes.error) {
          throw new Error(`Errore caricamento esercizi: ${exercisesRes.error.message}`);
        }
        if (sessionsRes.error) {
          throw new Error(`Errore caricamento sessioni: ${sessionsRes.error.message}`);
        }

        if (!isMounted) return;

        const exercisesData = (exercisesRes.data || []) as WorkoutExerciseRow[];
        const sessionsData = (sessionsRes.data || []) as WorkoutSessionRow[];

        // Raggruppa esercizi per workout_id
        const exercisesByWorkout = new Map<string, WorkoutExerciseRow[]>();
        exercisesData.forEach((ex) => {
          const list = exercisesByWorkout.get(ex.workout_id) || [];
          list.push(ex);
          exercisesByWorkout.set(ex.workout_id, list);
        });

        // Raggruppa sessioni per athlete_id
        const sessionsByAthlete = new Map<string, WorkoutSessionRow[]>();
        sessionsData.forEach((sess) => {
          const list = sessionsByAthlete.get(sess.athlete_id) || [];
          list.push(sess);
          sessionsByAthlete.set(sess.athlete_id, list);
        });

        // 3. Elaborazione puntuale per ogni atleta
        const resultMap = new Map<string, AthleteProgressDetail>();

        athletes.forEach((ath) => {
          const activeAssignment = activeAssignmentsMap.get(ath.id);

          if (!activeAssignment || !activeAssignment.workout) {
            resultMap.set(ath.id, {
              athleteId: ath.id,
              totalWeeks: 0,
              hasActiveWorkout: false,
              status: 'success',
              completedSessions: 0,
              plannedSessions: 0,
              progressPercentage: 0,
              lastWorkoutDateIso: null,
              lastWorkoutLabel: 'Nessun allenamento registrato',
              nextSessionLabel: 'Nessun avanzamento disponibile',
              daysSinceLastWorkout: null,
              programStatus: 'no_workout',
              programStatusLabel: 'Nessuna scheda attiva',
            });
            return;
          }

          const workout = activeAssignment.workout;
          const workoutId = workout.id;
          const parentTemplateId = workout.parent_template_id;
          const totalWeeks = Math.max(1, Number(workout.total_weeks) || 4);

          // Esercizi del workout (o del parent template se la copia non ha ancora righe)
          const workoutExercises =
            exercisesByWorkout.get(workoutId) ||
            (parentTemplateId ? exercisesByWorkout.get(parentTemplateId) : null) ||
            [];

          // Giorni unici reali in ordine di apparizione
          const orderedDays: string[] = [];
          workoutExercises.forEach((ex) => {
            const d = (ex.day_name || '').trim();
            if (d && !orderedDays.includes(d)) {
              orderedDays.push(d);
            }
          });

          // Calcolo plannedSessions reale
          // IMPORTANTE: non usare distinctWeekDayPairs.size perché non tutte le settimane
          // potrebbero avere righe proprie in workout_exercises (propagazione parziale).
          // La fonte di verità è: total_weeks (metadato affidabile) × giorni unici trovati in qualsiasi settimana.
          let plannedSessions = 0;
          if (orderedDays.length > 0) {
            plannedSessions = Math.max(1, totalWeeks * orderedDays.length);
          } else {
            // Nessun esercizio trovato: fallback minimo
            plannedSessions = Math.max(1, totalWeeks * 3);
          }

          // Conserviamo distinctWeekDayPairs solo per il flag diagnostico hasRealPlannedData
          const distinctWeekDayPairs = new Set<string>();
          workoutExercises.forEach((ex) => {
            const w = Number(ex.week_number) || 1;
            const d = normalizeDayName(ex.day_name);
            if (d) distinctWeekDayPairs.add(`${w}-${d}`);
          });

          // Sessioni dell'atleta (controlla sia id atleta che eventuale auth_user_id)
          const athSessions = [
            ...(sessionsByAthlete.get(ath.id) || []),
            ...(ath.auth_user_id ? sessionsByAthlete.get(ath.auth_user_id) || [] : []),
          ];

          // Filtra solo sessioni completate per il workout assegnato (e parent template)
          // REGOLA FONDAMENTALE: contare solo sessioni con week_number + day_name validi.
          // Le sessioni phantom (senza week/day) NON vengono conteggiate come avanzamento.
          const uniqueCompletedKeys = new Set<string>();
          const phantomSessionIds = new Set<string>();
          const matchedCompletedSessions: WorkoutSessionRow[] = [];

          athSessions.forEach((s) => {
            const isMatch =
              s.workout_id === workoutId ||
              (parentTemplateId && s.workout_id === parentTemplateId);
            if (!isMatch) return;

            // Condizione completata uniforme
            if (!isCompletedSession(s)) return;

            const w = Number(s.week_number);
            const rawD = (s.day_name || '').trim();
            const normD = normalizeDayName(rawD);
            if (w > 0 && normD) {
              const matchedPlannedDay = orderedDays.find((d) => matchDayNames(d, rawD));
              const canonicalDay = matchedPlannedDay || rawD;
              const normCanonical = normalizeDayName(canonicalDay);
              uniqueCompletedKeys.add(`${w}-${normCanonical}`);
              matchedCompletedSessions.push(s);
            } else {
              // Sessione phantom: ha end_time ma manca week/day — NON conta per l'avanzamento
              phantomSessionIds.add(s.id);
            }
          });

          // REGOLA: avanzamento basato rigorosamente sulle sessioni pianificate completate
          let plannedCompletedCount = 0;
          if (orderedDays.length > 0 && totalWeeks > 0) {
            for (let w = 1; w <= totalWeeks; w++) {
              for (const day of orderedDays) {
                const normD = normalizeDayName(day);
                if (uniqueCompletedKeys.has(`${w}-${normD}`)) {
                  plannedCompletedCount++;
                }
              }
            }
          }
          const completedSessions = orderedDays.length > 0 && totalWeeks > 0
            ? plannedCompletedCount
            : Math.min(plannedSessions, uniqueCompletedKeys.size);

          // Calcolo percentuale — REGOLA: non mostrare 100% se completedSessions < plannedSessions
          // Un programma è completato SOLO quando completedSessions === plannedSessions.
          const progressPercentage: number = (() => {
            if (plannedSessions <= 0) return 0;
            const raw = Math.round((completedSessions / plannedSessions) * 100);
            if (completedSessions < plannedSessions) {
              // Non permettere mai 100% se non davvero completato
              return Math.min(99, raw);
            }
            if (completedSessions > plannedSessions) {
              // Anomalia: più completate delle previste, mostra comunque max 100
              return 100;
            }
            return 100; // completedSessions === plannedSessions
          })();

          // Calcolo ultimo allenamento
          matchedCompletedSessions.sort((a, b) => {
            const timeA = new Date(a.end_time || a.start_time || 0).getTime();
            const timeB = new Date(b.end_time || b.start_time || 0).getTime();
            return timeB - timeA;
          });

          const lastSession = matchedCompletedSessions[0] || null;
          let lastWorkoutDateIso: string | null = null;
          let lastWorkoutLabel = 'Nessuno';

          if (lastSession) {
            lastWorkoutDateIso = lastSession.end_time || lastSession.start_time || null;
            if (lastWorkoutDateIso) {
              lastWorkoutLabel = formatRelativeWorkoutDate(lastWorkoutDateIso);
            }
          }

          // Calcolo prossima sessione prevista
          let nextSessionLabel = 'Non definita';
          if (orderedDays.length > 0 && totalWeeks > 0) {
            let found = false;
            for (let w = 1; w <= totalWeeks; w++) {
              for (const day of orderedDays) {
                const normD = normalizeDayName(day);
                const key = `${w}-${normD}`;
                if (!uniqueCompletedKeys.has(key)) {
                  nextSessionLabel = `Settimana ${w} · ${day}`;
                  found = true;
                  break;
                }
              }
              if (found) break;
            }
            if (!found) {
              if (completedSessions >= plannedSessions && plannedSessions > 0) {
                nextSessionLabel = 'Programma completato';
              } else {
                nextSessionLabel = `Settimana ${totalWeeks} · ${orderedDays[orderedDays.length - 1]}`;
              }
            }
          } else if (orderedDays.length > 0) {
            nextSessionLabel = `Settimana 1 · ${orderedDays[0]}`;
          }

          // Giorni trascorsi dall'ultimo allenamento
          let daysSinceLastWorkout: number | null = null;
          if (lastWorkoutDateIso) {
            const date = new Date(lastWorkoutDateIso);
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
            const sessionDayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
            daysSinceLastWorkout = Math.max(0, Math.round((todayStart - sessionDayStart) / (1000 * 60 * 60 * 24)));
          }

          // ─── STATO E CATEGORIA DI AVANZAMENTO ───
          // REGOLA FONDAMENTALE: "completato" SOLO quando completedSessions >= plannedSessions
          // e plannedSessions deriva dalla struttura reale (non da fallback).
          // Non usare progressPercentage >= 100 come criterio di completamento.
          let programStatus: AthleteProgramStatus = 'in_progress';
          let programStatusLabel = 'Programma in corso';

          const hasRealPlannedData = plannedSessions > 0 && distinctWeekDayPairs.size > 0;

          if (!hasRealPlannedData) {
            // Struttura non idratata: non possiamo sapere lo stato reale
            programStatus = 'in_progress';
            programStatusLabel = completedSessions > 0 ? `Avanzamento parziale (dati struttura non disponibili)` : 'Non iniziato';
          } else if (completedSessions === 0) {
            programStatus = 'not_started';
            programStatusLabel = 'Non iniziato';
          } else if (completedSessions > plannedSessions) {
            // Più sessioni completate di quelle previste — anomalia da segnalare
            programStatus = 'data_error';
            programStatusLabel = `Dati da verificare (${completedSessions}/${plannedSessions})`;
          } else if (completedSessions === plannedSessions) {
            // Solo qui si dichiara completato
            programStatus = 'completed';
            programStatusLabel = 'Programma completato';
          } else if (progressPercentage >= 75) {
            programStatus = 'near_end';
            programStatusLabel = 'Fine programma vicina';
          } else if (progressPercentage >= 25) {
            programStatus = 'in_progress';
            programStatusLabel = 'Programma in corso';
          } else {
            programStatus = 'just_started';
            programStatusLabel = 'Appena iniziato';
          }

          console.log(`[useAthletesWorkoutProgress] ✅ ${ath.id}: ${completedSessions}/${plannedSessions} (${progressPercentage}%) → ${programStatusLabel}`);

          resultMap.set(ath.id, {
            athleteId: ath.id,
            workoutId,
            workoutTitle: workout.title,
            totalWeeks,
            hasActiveWorkout: true,
            status: 'success',
            completedSessions,
            plannedSessions,
            progressPercentage,
            lastWorkoutDateIso,
            lastWorkoutLabel,
            nextSessionLabel,
            daysSinceLastWorkout,
            programStatus,
            programStatusLabel,
            orderedDays,
            daysPerWeek: orderedDays.length || (totalWeeks > 0 ? Math.round(plannedSessions / totalWeeks) : 3),
          });
        });

        setProgressMap(resultMap);
        setIsLoading(false);
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : 'Errore sconosciuto nel caricamento dati';
        console.error('[useAthletesWorkoutProgress] Errore:', msg);
        setError(msg);

        // Imposta stato di errore per ogni atleta per consentire retry
        const errMap = new Map<string, AthleteProgressDetail>();
        athletes.forEach((ath) => {
          errMap.set(ath.id, {
            athleteId: ath.id,
            totalWeeks: 0,
            hasActiveWorkout: false,
            status: 'error',
            errorMessage: msg,
            completedSessions: 0,
            plannedSessions: 0,
            progressPercentage: 0,
            lastWorkoutDateIso: null,
            lastWorkoutLabel: 'Non disponibile',
            nextSessionLabel: 'Non disponibile',
            daysSinceLastWorkout: null,
            programStatus: 'not_started',
            programStatusLabel: 'Non disponibile',
          });
        });
        setProgressMap(errMap);
        setIsLoading(false);
      }
    }

    fetchProgressData();

    return () => {
      isMounted = false;
    };
  }, [athletes, allAssignedWorkouts, refreshTrigger]);

  return {
    progressMap,
    isLoading,
    error,
    retry,
  };
}
