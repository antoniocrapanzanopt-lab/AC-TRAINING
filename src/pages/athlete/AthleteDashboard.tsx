import React, { useState, useEffect, useCallback } from 'react';
import { Dumbbell, Clock, Play, RotateCcw, WifiOff } from 'lucide-react';
import { WorkoutTemplate, WorkoutExercise } from '../../types/workout';
import { useWorkouts } from '../../context/WorkoutsContext';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  getActiveWorkoutDraft,
  saveActiveWorkoutDraft,
  clearActiveWorkoutDraft,
  syncPendingWorkoutsWithServer,
  getPendingSyncQueue,
  ActiveWorkoutDraft,
} from '../../lib/offline/offlineWorkoutStorage';
import { AthleteNextAppointmentCard } from '../../components/athlete/AthleteNextAppointmentCard';

interface AthleteDashboardProps {
  onStartWorkout: (workout: WorkoutTemplate, exercises: WorkoutExercise[], targetAthleteId?: string) => void;
}

// Componente per singola scheda di allenamento
const WorkoutCard: React.FC<{
  assigned: any;
  isFirst: boolean;
  onStart: (assigned: any, week: number, day: string) => void;
  startingWorkoutId: string | null;
}> = ({ assigned, isFirst, onStart, startingWorkoutId }) => {
  const progressKey = `builder_progress_${assigned.athlete_id}_${assigned.workout_id}`;
  const [completedMap, setCompletedMap] = React.useState<Record<string, boolean>>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(progressKey) || '{}');
      // Riconciliazione immediata sincrona: se l'atleta ha completato gli altri 4 giorni o ha un Giorno B nello storico
      const hasAnyB = raw['5-Giorno B'] || raw['1-Giorno B'] || raw['2-Giorno B'] || raw['3-Giorno B'] || raw['4-Giorno B'] || raw['Giorno B'];
      const hasACDE = raw['1-Giorno A'] || raw['1-Giorno C'] || raw['1-Giorno D'] || raw['1-Giorno E'];
      if (hasAnyB || hasACDE) {
        raw['1-Giorno A'] = true;
        raw['1-Giorno B'] = true;
        raw['1-Giorno C'] = true;
        raw['1-Giorno D'] = true;
        raw['1-Giorno E'] = true;
        localStorage.setItem(progressKey, JSON.stringify(raw));
      }
      return raw;
    } catch {
      return {};
    }
  });

  const [days, setDays] = React.useState<string[]>(['Giorno A', 'Giorno B', 'Giorno C', 'Giorno D', 'Giorno E']);

  // Carica dinamicamente tutti i giorni reali presenti negli esercizi della scheda assegnata
  React.useEffect(() => {
    const fetchWorkoutDays = async () => {
      if (!assigned.workout_id) return;
      try {
        const { data: exData } = await supabase
          .from('workout_exercises')
          .select('day_name')
          .eq('workout_id', assigned.workout_id);

        if (exData && exData.length > 0) {
          const uniqueDays = Array.from(new Set(exData.map((e: any) => e.day_name || 'Giorno A')))
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

          if (uniqueDays.length > 0) {
            setDays(uniqueDays);
          }
        }
      } catch (err) {
        console.warn('Errore lettura giorni scheda atleta:', err);
      }
    };

    fetchWorkoutDays();
  }, [assigned.workout_id]);

  // Carica i progressi da Supabase se l'utente ha fatto il relogin
  React.useEffect(() => {
    const syncProgressFromDb = async () => {
      try {
        const athId = assigned.athlete_id;
        const wId = assigned.workout_id;
        if (!athId || !wId) return;

        let currentMap: Record<string, boolean> = {};
        try {
          currentMap = JSON.parse(localStorage.getItem(progressKey) || '{}');
        } catch {}

        const { data } = await supabase
          .from('workout_sessions')
          .select(`
            id,
            end_time,
            notes
          `)
          .eq('athlete_id', athId)
          .eq('workout_id', wId)
          .not('end_time', 'is', null);

        const daysList = days.length > 0 ? days : ['Giorno A', 'Giorno B', 'Giorno C', 'Giorno D', 'Giorno E'];
        const totalSessionCount = (data?.length || 0);

        if (totalSessionCount >= 4) {
          // Se ci sono almeno 4 sessioni registrate, la Settimana 1 è completata
          daysList.forEach((dName) => {
            currentMap[`1-${dName}`] = true;
          });
        }

        setCompletedMap({ ...currentMap });
        localStorage.setItem(progressKey, JSON.stringify(currentMap));
      } catch (e) {
        console.warn('Errore sync progressi da DB:', e);
      }
    };

    syncProgressFromDb();
  }, [assigned.athlete_id, assigned.workout_id, days, progressKey]);

  const totalWeeks = assigned.workout?.total_weeks || 4;
  const isStartingThis = startingWorkoutId === assigned.workout_id;

  // Calcola la prima settimana attiva non ancora completata al 100%
  const currentActiveWeek = React.useMemo(() => {
    for (let w = 1; w <= totalWeeks; w++) {
      const allDone = days.length > 0 && days.every((d) => completedMap[`${w}-${d}`]);
      if (!allDone) return w;
    }
    return totalWeeks;
  }, [totalWeeks, days, completedMap]);

  const [selectedWeek, setSelectedWeek] = React.useState<number>(currentActiveWeek);

  // Aggiorna la settimana selezionata se cambia la settimana attiva
  React.useEffect(() => {
    setSelectedWeek(currentActiveWeek);
  }, [currentActiveWeek]);

  // Conteggio allenamenti completati nella settimana selezionata
  const weekCompletedCount = React.useMemo(() => {
    return days.filter((d) => completedMap[`${selectedWeek}-${d}`]).length;
  }, [days, completedMap, selectedWeek]);

  const isCurrentWeekAllDone = weekCompletedCount === days.length;

  return (
    <div className={`bg-slate-900/40 backdrop-blur-xl border ${isFirst ? 'border-[var(--color-primary)]/40 shadow-xl shadow-[var(--color-primary)]/5' : 'border-slate-800/60'} rounded-3xl p-5 sm:p-6 mb-4 space-y-5 shadow-lg`}>
      {/* Testata Scheda */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-base sm:text-lg font-black text-white leading-tight">{assigned.workout?.title}</h3>
            {isFirst && (
              <span className="bg-[var(--color-primary)] text-slate-950 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-sm">
                Attiva
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
            {assigned.workout?.description || 'Nessuna descrizione specificata dal coach.'}
          </p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800/80 px-3 py-1 rounded-xl text-xs font-mono font-bold text-[var(--color-primary)] shrink-0 shadow-inner">
          {totalWeeks} settimane
        </div>
      </div>

      {/* ── SELETTORE SETTIMANA A PILLOLA ORIZZONTALE ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Seleziona Settimana:
          </span>
          <span className="text-xs font-bold text-[var(--color-primary)] font-mono">
            {weekCompletedCount} di {days.length} sedute completate
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {Array.from({ length: totalWeeks }, (_, idx) => {
            const wNum = idx + 1;
            const isSelected = selectedWeek === wNum;
            const isWeekDone = days.every((d) => completedMap[`${wNum}-${d}`]);
            const isCurrent = currentActiveWeek === wNum;

            return (
              <button
                key={wNum}
                type="button"
                onClick={() => setSelectedWeek(wNum)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer select-none ${
                  isSelected
                    ? 'bg-[var(--color-primary)] text-slate-950 shadow-md shadow-[var(--color-primary)]/20 scale-105'
                    : isWeekDone
                    ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-900/40'
                    : isCurrent
                    ? 'bg-slate-800 text-white border border-[var(--color-primary)]/50'
                    : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                <span>Settimana {wNum}</span>
                {isWeekDone && <span className="text-[11px]">✓</span>}
                {isCurrent && !isWeekDone && !isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── GIORNI DELLA SETTIMANA SELEZIONATA ── */}
      <div className="space-y-3 pt-2 border-t border-slate-800/80">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-black text-white flex items-center gap-2">
            <span>Settimana {selectedWeek}</span>
            {isCurrentWeekAllDone ? (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                ✓ Completata
              </span>
            ) : (
              <span className="text-[10px] font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-full border border-[var(--color-primary)]/20">
                In corso
              </span>
            )}
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {days.map((dayName) => {
            const key = `${selectedWeek}-${dayName}`;
            const isDone = Boolean(completedMap[key]);

            return (
              <button
                key={dayName}
                type="button"
                disabled={isStartingThis}
                onClick={() => onStart(assigned, selectedWeek, dayName)}
                className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between group cursor-pointer shadow-md ${
                  isDone
                    ? 'bg-slate-950/70 border-slate-800/60 text-slate-500 opacity-75'
                    : 'bg-slate-900/50 backdrop-blur-md border-slate-800/80 hover:border-[var(--color-primary)]/60 hover:bg-slate-900/80 text-white'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-3">
                  <span className="text-sm font-black truncate">{dayName}</span>
                  {isDone ? (
                    <span className="text-xs text-emerald-400 font-black bg-emerald-500/15 px-2 py-0.5 rounded-md border border-emerald-500/30">
                      ✓ Completato
                    </span>
                  ) : (
                    <div className="w-7 h-7 rounded-xl bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)] group-hover:scale-110 transition-transform">
                      <Play className="w-3.5 h-3.5 fill-[var(--color-primary)] text-[var(--color-primary)]" />
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/60">
                  <span className="flex items-center gap-1 font-medium">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {isDone ? 'Eseguito' : 'Da completare'}
                  </span>
                  <span className="text-[11px] font-bold text-[var(--color-primary)] group-hover:underline">
                    {isDone ? 'Rivedi / Rifai' : 'Inizia ora →'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const AthleteDashboard: React.FC<AthleteDashboardProps> = ({ onStartWorkout }) => {
  const { myAssignedWorkouts, getExercisesForWorkout, loading } = useWorkouts();
  const { showSuccess, showError } = useToast();
  const { user } = useAuth();

  const athleteId = user?.athleteId || user?.id || 'ath-local';
  const [startingWorkoutId, setStartingWorkoutId] = useState<string | null>(null);
  const [activeDraft, setActiveDraft] = useState<ActiveWorkoutDraft | null>(null);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);

  const checkDraftAndQueue = useCallback(() => {
    if (athleteId) {
      let draft = getActiveWorkoutDraft(athleteId);
      if (draft && myAssignedWorkouts.length > 0) {
        // Se il workout assegnato ha un titolo aggiornato nel DB (es. da "MARIA BARCELLA" a "MARIA"), aggiorniamo la bozza
        const matching = myAssignedWorkouts.find(
          (aw: any) =>
            aw.workout_id === draft?.workout?.id ||
            aw.workout?.id === draft?.workout?.id ||
            (draft?.workout?.title && aw.workout?.title && (
              aw.workout.title.toLowerCase().includes('scheda') &&
              draft.workout.title.toLowerCase().includes('scheda')
            ))
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

  const handleStartWorkout = async (assigned: any, selectedWeek: number, selectedDay: string) => {
    try {
      setStartingWorkoutId(assigned.workout_id);
      const allExercises = await getExercisesForWorkout(assigned.workout_id);
      if (allExercises.length === 0) {
        showError('Questa scheda non contiene esercizi!');
        setStartingWorkoutId(null);
        return;
      }

      // Filtra gli esercizi per la settimana e giorno selezionati, se presenti
      const filtered = allExercises.filter((ex) => {
        const matchWeek = !ex.week_number || ex.week_number === selectedWeek;
        const matchDay = !ex.day_name || ex.day_name === selectedDay;
        return matchWeek && matchDay;
      });

      const finalExercises = filtered.length > 0 ? filtered : allExercises;
      onStartWorkout(assigned.workout, finalExercises, assigned.athlete_id);
    } catch (err) {
      showError('Impossibile caricare gli esercizi della scheda');
    } finally {
      setStartingWorkoutId(null);
    }
  };

  const handleResumeDraft = () => {
    if (!activeDraft) return;
    onStartWorkout(activeDraft.workout, activeDraft.exercises, activeDraft.targetAthleteId);
  };

  const handleDiscardDraft = () => {
    if (confirm('Vuoi annullare la sessione salvata e ricominciare da zero?')) {
      clearActiveWorkoutDraft(athleteId);
      setActiveDraft(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 font-bold">Caricamento delle tue schede...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Saluto e Riepilogo */}
      <div>
        <h2 className="text-xl font-bold mb-0.5">Il tuo Allenamento</h2>
        <p className="text-xs text-slate-400">Ecco cosa ha preparato il tuo coach per te.</p>
      </div>

      {/* ── CARD PROSSIMO APPUNTAMENTO IN EVIDENZA ── */}
      <AthleteNextAppointmentCard />

      {/* ── BANNER 1: RIPRENDI ALLENAMENTO IN CORSO SALVATO IN LOCALE ── */}
      {activeDraft && (
        <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-[var(--color-primary)]/40 shadow-xl space-y-3 animate-in fade-in">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary)]/15 text-[var(--color-primary)] border border-[var(--color-primary)]/30 flex items-center justify-center shrink-0 shadow-md">
                <RotateCcw className="w-5 h-5 animate-spin-slow" />
              </div>
              <div>
                <span className="text-[10px] font-black text-[var(--color-primary)] uppercase tracking-wider block">
                  Sessione in corso salvata sul dispositivo
                </span>
                <h4 className="text-sm sm:text-base font-black text-white">
                  {activeDraft.workout?.title}
                </h4>
                <p className="text-[11px] text-slate-300 font-medium mt-0.5">
                  Ultimo salvataggio: {new Date(activeDraft.lastSavedTimestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleResumeDraft}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-black font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>Riprendi Allenamento</span>
            </button>
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="py-2.5 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 text-xs font-bold border border-slate-800 transition-colors cursor-pointer"
            >
              Scarta
            </button>
          </div>
        </div>
      )}

      {/* ── BANNER 2: ALLENAMENTI IN CODA DI SINCRONIZZAZIONE ── */}
      {pendingSyncCount > 0 && (
        <div className="p-3 rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-[var(--color-primary)]/30 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
            <span>
              <strong>{pendingSyncCount}</strong> allenamento/i salvato/i sul dispositivo in attesa di sincronizzazione.
            </span>
          </div>
          <button
            type="button"
            onClick={async () => {
              const res = await syncPendingWorkoutsWithServer();
              if (res.syncedCount > 0) {
                showSuccess('Dati sincronizzati!', `${res.syncedCount} allenamento/i caricato/i.`);
                checkDraftAndQueue();
              } else if (!navigator.onLine) {
                showError('Dispositivo Offline', 'Connettiti a internet per inviare le sessioni.');
              }
            }}
            className="px-3 py-1 rounded-lg bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/30 font-bold hover:bg-[var(--color-primary)]/30 transition-colors cursor-pointer shrink-0"
          >
            Sincronizza ora
          </button>
        </div>
      )}

      {/* Elenco Schede Assegnate */}
      {myAssignedWorkouts.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Dumbbell className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Nessuna scheda assegnata</h3>
          <p className="text-slate-400 text-sm">
            Il tuo coach non ti ha ancora assegnato un programma di allenamento. Torna a controllare più tardi!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {myAssignedWorkouts.map((assigned: any, index) => (
            <WorkoutCard
              key={assigned.id}
              assigned={assigned}
              isFirst={index === 0}
              onStart={handleStartWorkout}
              startingWorkoutId={startingWorkoutId}
            />
          ))}
        </div>
      )}
    </div>
  );
};
