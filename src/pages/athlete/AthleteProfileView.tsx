import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  FileCheck,
  Award,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAthletes } from '../../context/AthletesContext';
import { useMetrics } from '../../context/MetricsContext';
import { supabase } from '../../lib/supabase';
import { getDaysRemaining } from '../../lib/statusEngine';
import { ChangeLogTab } from '../../components/athletes/ChangeLogTab';
import { AthleteNextAppointmentCard } from '../../components/athlete/AthleteNextAppointmentCard';
import { AthleteTrophiesSection } from '../../components/athlete/AthleteTrophiesSection';
import { AthleteCommunicationsFeed } from '../../components/athlete/AthleteCommunicationsFeed';

interface PastSession {
  id: string;
  workoutTitle: string;
  weekNumber?: number;
  dayName?: string;
  date: string;
  durationMinutes: number;
  rpe: number;
  notes?: string;
  exercises: {
    name: string;
    sets: { setNumber: number; reps: number; weightKg: number }[];
    notes?: string;
  }[];
}

export const AthleteProfileView: React.FC = () => {
  const { user } = useAuth();
  const { athletes } = useAthletes();
  const { maxLifts, metrics, fetchMetricsForAthlete, fetchMaxLiftsForAthlete } = useMetrics();

  const currentAthlete = user 
    ? athletes.find(a => 
        (a.id && a.id === user.athleteId) || 
        (a.email && user.email && a.email.toLowerCase() === user.email.toLowerCase())
      )
    : null;

  const athleteIds = React.useMemo(() => {
    return Array.from(new Set([currentAthlete?.id, user?.athleteId, user?.id].filter(Boolean) as string[]));
  }, [currentAthlete, user]);

  const athleteId = currentAthlete?.id || user?.athleteId || user?.id;

  const [pastSessions, setPastSessions] = useState<PastSession[]>([]);

  // Carica metriche e max lift per il calcolo dei trofei
  useEffect(() => {
    if (athleteId) {
      fetchMetricsForAthlete(athleteId);
      fetchMaxLiftsForAthlete(athleteId);
    }
  }, [athleteId, fetchMetricsForAthlete, fetchMaxLiftsForAthlete]);

  // Carica le sessioni completate in passato dall'atleta
  const fetchPastSessions = React.useCallback(async () => {
    if (athleteIds.length === 0) return;
    try {
      // Fetch scheda attiva per l'atleta come fallback se il titolo è placeholder (es: "aaaa")
      const { data: activeAssignments } = await supabase
        .from('athlete_assigned_workouts')
        .select('workout_id, workouts ( title )')
        .in('athlete_id', athleteIds)
        .eq('is_active', true);

      const activeWorkoutTitle = (activeAssignments?.[0]?.workouts as unknown as {title: string} | null)?.title;

      const { data, error } = await supabase
        .from('workout_sessions')
        .select(`
          id,
          start_time,
          end_time,
          rpe,
          notes,
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
        .in('athlete_id', athleteIds)
        .not('end_time', 'is', null)
        .order('end_time', { ascending: false });

      if (error) throw error;

        if (data) {
          const mapped: PastSession[] = data.map((session: any) => {
            const start = new Date(session.start_time);
            const end = new Date(session.end_time);
            const diffMs = end.getTime() - start.getTime();
            const durationMinutes = Math.max(1, Math.round(diffMs / 60000));

            // Titolo Scheda con fallback se placeholder
            const rawTitle = session.workouts?.title;
            const isPlaceholder = !rawTitle || rawTitle.trim() === '' || rawTitle.toLowerCase() === 'aaaa' || rawTitle.toLowerCase() === 'allenamento' || rawTitle.toLowerCase() === 'allenamento svolto';
            const finalTitle = isPlaceholder ? (activeWorkoutTitle || 'Scheda Personalizzata') : rawTitle;

            const exMap = new Map<string, { sets: any[]; notesSet: Set<string> }>();
            const logs = session.exercise_logs || [];
            let detectedWeek: number | undefined = undefined;
            let detectedDay: string | undefined = undefined;

            logs.forEach((log: any) => {
              if (log.workout_exercises?.week_number && !detectedWeek) {
                detectedWeek = log.workout_exercises.week_number;
              }
              if (log.workout_exercises?.day_name && !detectedDay) {
                detectedDay = log.workout_exercises.day_name;
              }

              const exName = log.workout_exercises?.name || 'Esercizio';
              if (!exMap.has(exName)) {
                exMap.set(exName, { sets: [], notesSet: new Set<string>() });
              }
              const entry = exMap.get(exName)!;
              entry.sets.push({
                setNumber: log.set_number,
                reps: log.reps_completed || 0,
                weightKg: log.weight_kg || 0,
              });
              if (log.notes) {
                entry.notesSet.add(log.notes);
              }
            });

            const exercises = Array.from(exMap.entries()).map(([name, { sets, notesSet }]) => {
              sets.sort((a, b) => a.setNumber - b.setNumber);
              const notes = Array.from(notesSet).join(' | ');
              return { name, sets, notes };
            });

            return {
              id: session.id,
              workoutTitle: finalTitle,
              weekNumber: detectedWeek || 1,
              dayName: detectedDay || 'Giorno A',
              date: session.end_time.slice(0, 10),
              durationMinutes,
              rpe: session.rpe || 0,
              notes: session.notes,
              exercises,
            };
          });

          setPastSessions(mapped);
        }
      } catch (err) {
      console.warn('Errore caricamento storico allenamenti:', err);
    }
  }, [athleteIds]);

  useEffect(() => {
    fetchPastSessions();

    const handleWorkoutDone = () => {
      setTimeout(() => fetchPastSessions(), 500);
    };

    window.addEventListener('athlete_workout_completed', handleWorkoutDone);
    window.addEventListener('athlete_workout_skipped', handleWorkoutDone);

    return () => {
      window.removeEventListener('athlete_workout_completed', handleWorkoutDone);
      window.removeEventListener('athlete_workout_skipped', handleWorkoutDone);
    };
  }, [fetchPastSessions]);

  // Controllo scadenza certificato medico unificato
  const getCertificateStatus = () => {
    if (!currentAthlete?.medicalCertificateExpiryDate) {
      return { status: 'missing', label: 'Certificato Non Presente', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
    }
    const expDate = new Date(currentAthlete.medicalCertificateExpiryDate);
    const diffDays = getDaysRemaining(currentAthlete.medicalCertificateExpiryDate);

    if (diffDays < 0) {
      return { status: 'expired', label: `Scaduto il ${expDate.toLocaleDateString('it-IT')}`, color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' };
    } else if (diffDays <= 30) {
      return { status: 'warning', label: `In scadenza tra ${diffDays} gg (${expDate.toLocaleDateString('it-IT')})`, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
    }
    return { status: 'valid', label: `Valido fino al ${expDate.toLocaleDateString('it-IT')}`, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
  };

  const certStatus = getCertificateStatus();

  // Filtra massimali dell'atleta
  const athletePRs = maxLifts.filter(m => m.athlete_id === athleteId || !m.athlete_id);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-32 font-sans">
      {/* 1. Header Profilo Atleta */}
      <div className="p-6 rounded-3xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-md flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <div className="w-20 h-20 rounded-full bg-[var(--color-primary)] text-slate-950 font-black text-2xl flex items-center justify-center shadow-lg shadow-[var(--color-primary)]/20 shrink-0">
          {(currentAthlete?.firstName?.charAt(0) || user?.name?.charAt(0) || 'A').toUpperCase()}
        </div>

        <div className="flex-1 text-center sm:text-left space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-black text-[var(--color-text)]">
                {currentAthlete ? `${currentAthlete.firstName} ${currentAthlete.lastName}` : (user?.name || 'Atleta')}
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] flex items-center justify-center sm:justify-start gap-1.5 mt-0.5">
                <Mail className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                {user?.email || currentAthlete?.email || 'atleta@cloud.it'}
              </p>
            </div>
            <span className="self-center sm:self-auto px-3 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 rounded-full text-xs font-bold uppercase tracking-wider">
              Atleta Attivo
            </span>
          </div>

          <div className="pt-2 flex flex-wrap justify-center sm:justify-start gap-2">
            <span className={`px-3 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${certStatus.color}`}>
              {certStatus.status === 'valid' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
              {certStatus.label}
            </span>
            {currentAthlete?.phone && (
              <span className="px-3 py-1 rounded-xl text-xs font-medium bg-[var(--color-surface-strong)] text-[var(--color-text)] border border-[var(--color-border)] flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[var(--color-text-muted)]" /> {currentAthlete.phone}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* COMUNICAZIONI E AVVISI DAL COACH */}
      {athleteId && <AthleteCommunicationsFeed athleteId={athleteId} />}

      {/* 2. Dati Anagrafici & Certificato Medico */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Anagrafica */}
        <div className="p-5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-md space-y-3">
          <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2">
            <User className="w-4 h-4 text-[var(--color-primary)]" /> Informazioni Personali
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-[var(--color-border)]">
              <span className="text-[var(--color-text-muted)]">Data di Nascita:</span>
              <span className="font-semibold text-[var(--color-text)]">
                {currentAthlete?.dateOfBirth ? new Date(currentAthlete.dateOfBirth).toLocaleDateString('it-IT') : 'Non specificata'}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[var(--color-border)]">
              <span className="text-[var(--color-text-muted)]">Stato Account:</span>
              <span className="font-semibold text-emerald-500 capitalize">{currentAthlete?.status || 'Attivo'}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-[var(--color-text-muted)]">Codice Fiscale:</span>
              <span className="font-mono text-[var(--color-text)]">{currentAthlete?.fiscalCode || '—'}</span>
            </div>
          </div>
        </div>

        {/* Certificato Medico */}
        <div className="p-5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-md space-y-3">
          <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-emerald-500" /> Certificato Medico
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-[var(--color-border)]">
              <span className="text-[var(--color-text-muted)]">Scadenza Certificato:</span>
              <span className="font-semibold text-[var(--color-text)]">
                {currentAthlete?.medicalCertificateExpiryDate ? new Date(currentAthlete.medicalCertificateExpiryDate).toLocaleDateString('it-IT') : 'Non registrata'}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[var(--color-border)]">
              <span className="text-[var(--color-text-muted)]">Stato idoneità:</span>
              <span className={`font-bold ${certStatus.status === 'valid' ? 'text-emerald-500' : 'text-amber-500'}`}>
                {certStatus.status === 'valid' ? 'Idoneo all\'attività' : 'Revisione Richiesta'}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-[var(--color-text-muted)]">Note medico:</span>
              <span className="text-[var(--color-text-muted)] italic">{currentAthlete?.medicalNotes || 'Nessuna limitazione medica registrata'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Prossimo Appuntamento & Calendario */}
      <AthleteNextAppointmentCard targetAthleteId={athleteId} />

      {/* 4. Record Personali (PR / Massimali) */}
      {athletePRs.length > 0 && (
        <div className="p-5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-md space-y-3">
          <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2">
            <Award className="w-4 h-4 text-[var(--color-primary)]" /> Record Personali & Massimali (1RM)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {athletePRs.map(pr => (
              <div key={pr.id} className="p-3 rounded-xl bg-[var(--color-surface-strong)] border border-[var(--color-border)] text-center space-y-1">
                <span className="text-[10px] font-bold text-[var(--color-text-muted)] line-clamp-1 block">{pr.exercise_name}</span>
                <span className="text-lg font-black text-[var(--color-primary)] block">{pr.calculated_1rm} kg</span>
                <span className="text-[10px] text-[var(--color-text-muted)] block">({pr.weight_kg}kg testati)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Sezione Trofei, Livelli & Gamification */}
      <AthleteTrophiesSection
        completedWorkoutsCount={pastSessions.length}
        maxLifts={maxLifts.filter((l) => String(l.athlete_id) === String(athleteId))}
        metrics={metrics.filter((m) => String(m.athlete_id) === String(athleteId))}
      />

      {/* 5. Change Log / Storico Variazioni Programma */}
      {athleteId && (
        <div className="pt-2">
          <ChangeLogTab athleteId={athleteId} />
        </div>
      )}
    </div>
  );
};
