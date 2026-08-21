import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  Calendar,
  FileCheck,
  Dumbbell,
  Clock,
  ChevronDown,
  ChevronUp,
  Award,
  Activity,
  CheckCircle2,
  AlertCircle,
  Flame,
  Sparkles,
  ArrowRight,
  Smartphone,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAthletes } from '../../context/AthletesContext';
import { useMetrics } from '../../context/MetricsContext';
import { supabase } from '../../lib/supabase';
import { getDaysRemaining } from '../../lib/statusEngine';
import { ChangeLogTab } from '../../components/athletes/ChangeLogTab';
import { AthleteNutritionModal } from '../../components/athlete/AthleteNutritionModal';
import { AthleteNextAppointmentCard } from '../../components/athlete/AthleteNextAppointmentCard';
import { AthleteTrophiesSection } from '../../components/athlete/AthleteTrophiesSection';
import { AthleteCommunicationsFeed } from '../../components/athlete/AthleteCommunicationsFeed';
import { PwaInstallModal } from '../../components/pwa/PwaInstallModal';

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

  const athleteId = currentAthlete?.id || user?.athleteId || user?.id;

  const [pastSessions, setPastSessions] = useState<PastSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [isHistorySectionOpen, setIsHistorySectionOpen] = useState<boolean>(false);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [isNutritionModalOpen, setIsNutritionModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  // Carica metriche e max lift per il calcolo dei trofei
  useEffect(() => {
    if (athleteId) {
      fetchMetricsForAthlete(athleteId);
      fetchMaxLiftsForAthlete(athleteId);
    }
  }, [athleteId, fetchMetricsForAthlete, fetchMaxLiftsForAthlete]);

  // Carica le sessioni completate in passato dall'atleta
  useEffect(() => {
    const fetchPastSessions = async () => {
      if (!athleteId) {
        setLoadingSessions(false);
        return;
      }
      setLoadingSessions(true);
      try {
        // Fetch scheda attiva per l'atleta come fallback se il titolo è placeholder (es: "aaaa")
        const { data: activeAssignments } = await supabase
          .from('athlete_assigned_workouts')
          .select('workout_id, workouts ( title )')
          .eq('athlete_id', athleteId)
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
          .eq('athlete_id', athleteId)
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
          if (mapped.length > 0) {
            setExpandedSessionId(mapped[0].id);
          }
        }
      } catch (err) {
        console.warn('Errore caricamento storico allenamenti:', err);
      } finally {
        setLoadingSessions(false);
      }
    };

    fetchPastSessions();
  }, [athleteId]);

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
    <div className="space-y-6 max-w-4xl mx-auto pb-32">
      {/* 1. Header Profilo Atleta */}
      <div className="p-6 rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 shadow-xl flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <div className="w-20 h-20 rounded-full bg-[var(--color-primary)] text-slate-950 font-black text-2xl flex items-center justify-center shadow-lg shadow-[var(--color-primary)]/20 shrink-0">
          {(currentAthlete?.firstName?.charAt(0) || user?.name?.charAt(0) || 'A').toUpperCase()}
        </div>

        <div className="flex-1 text-center sm:text-left space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-black text-white">
                {currentAthlete ? `${currentAthlete.firstName} ${currentAthlete.lastName}` : (user?.name || 'Atleta')}
              </h2>
              <p className="text-xs text-slate-400 flex items-center justify-center sm:justify-start gap-1.5 mt-0.5">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                {user?.email || currentAthlete?.email || 'atleta@cloud.it'}
              </p>
            </div>
            <span className="self-center sm:self-auto px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-bold uppercase tracking-wider">
              Atleta Attivo
            </span>
          </div>

          <div className="pt-2 flex flex-wrap justify-center sm:justify-start gap-2">
            <span className={`px-3 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${certStatus.color}`}>
              {certStatus.status === 'valid' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
              {certStatus.label}
            </span>
            {currentAthlete?.phone && (
              <span className="px-3 py-1 rounded-xl text-xs font-medium bg-slate-900/80 text-slate-300 border border-slate-700/80 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" /> {currentAthlete.phone}
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
        <div className="p-5 rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 shadow-lg space-y-3">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <User className="w-4 h-4 text-[var(--color-primary)]" /> Informazioni Personali
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400">Data di Nascita:</span>
              <span className="font-semibold text-white">
                {currentAthlete?.dateOfBirth ? new Date(currentAthlete.dateOfBirth).toLocaleDateString('it-IT') : 'Non specificata'}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400">Stato Account:</span>
              <span className="font-semibold text-emerald-400 capitalize">{currentAthlete?.status || 'Attivo'}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Codice Fiscale:</span>
              <span className="font-mono text-slate-300">{currentAthlete?.fiscalCode || '—'}</span>
            </div>
          </div>
        </div>

        {/* Certificato Medico */}
        <div className="p-5 rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 shadow-lg space-y-3">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-emerald-400" /> Certificato Medico
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Scadenza Certificato:</span>
              <span className="font-semibold text-white">
                {currentAthlete?.medicalCertificateExpiryDate ? new Date(currentAthlete.medicalCertificateExpiryDate).toLocaleDateString('it-IT') : 'Non registrata'}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Stato idoneità:</span>
              <span className={`font-bold ${certStatus.status === 'valid' ? 'text-emerald-400' : 'text-amber-400'}`}>
                {certStatus.status === 'valid' ? 'Idoneo all\'attività' : 'Revisione Richiesta'}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Note medico:</span>
              <span className="text-slate-400 italic">{currentAthlete?.medicalNotes || currentAthlete?.notes || 'Nessuna nota medica'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Prossimo Appuntamento & Calendario */}
      <AthleteNextAppointmentCard targetAthleteId={athleteId} />

      {/* 4. Stima Fabbisogno Energetico (Card Compatta con Modale Dedicata) */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-500/10">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-white">Stima Fabbisogno Energetico</h3>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-bold text-[9px] uppercase border border-amber-500/30">
                BMR • TDEE • Macro
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Calcola le calorie giornaliere orientative e la ripartizione dei macronutrienti per i tuoi obiettivi.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsNutritionModalOpen(true)}
          className="px-4 py-2.5 bg-[var(--color-primary)] text-slate-950 font-black text-xs rounded-2xl hover:bg-[var(--color-primary-hover)] active:scale-95 transition-all shadow-md shadow-[var(--color-primary)]/20 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>Apri Calcolatore</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Modale Dedicata a Tutto Schermo / Satinata */}
      <AthleteNutritionModal
        isOpen={isNutritionModalOpen}
        onClose={() => setIsNutritionModalOpen(false)}
      />

      {/* 4. Record Personali (PR / Massimali) */}
      {athletePRs.length > 0 && (
        <div className="p-5 rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 shadow-lg space-y-3">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Award className="w-4 h-4 text-[var(--color-primary)]" /> Record Personali & Massimali (1RM)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {athletePRs.map(pr => (
              <div key={pr.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center space-y-1">
                <span className="text-[10px] font-bold text-slate-400 line-clamp-1 block">{pr.exercise_name}</span>
                <span className="text-lg font-black text-[var(--color-primary)] block">{pr.calculated_1rm} kg</span>
                <span className="text-[10px] text-slate-500 block">({pr.weight_kg}kg testati)</span>
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

      {/* 6. Storico Allenamenti Completati con Tendina Apri/Chiudi */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 shadow-xl space-y-4 transition-all">
        
        {/* Header Sezione Cliccabile */}
        <div
          onClick={() => setIsHistorySectionOpen((prev) => !prev)}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none group pb-1"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0 shadow-md shadow-sky-500/10 group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-white group-hover:text-sky-300 transition-colors">
                  Storico Allenamenti Completati
                </h3>
                <span className="text-[11px] font-bold text-sky-400 bg-sky-500/10 px-2.5 py-0.5 rounded-full border border-sky-500/20">
                  {pastSessions.length} completati
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Tutti i workout svolti in passato con dettagli di carichi, serie, ripetizioni e feedback
              </p>
            </div>
          </div>

          {/* Pulsante Tendina */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsHistorySectionOpen((prev) => !prev);
            }}
            className={`px-3.5 py-2 rounded-xl border text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-sm shrink-0 cursor-pointer self-start sm:self-center ${
              isHistorySectionOpen
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-sky-500/10'
                : 'bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border-slate-800'
            }`}
          >
            <span>{isHistorySectionOpen ? 'Chiudi' : 'Vedi Storico'}</span>
            {isHistorySectionOpen ? (
              <ChevronUp className="w-4 h-4 text-sky-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-sky-400" />
            )}
          </button>
        </div>

        {/* Anteprima Compatta quando la tendina è chiusa */}
        {!isHistorySectionOpen && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800/80 px-1">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="font-bold text-slate-300">Ultima sessione:</span>
              {pastSessions.length > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 font-medium text-slate-200">
                  <Dumbbell className="w-3.5 h-3.5 text-amber-400" />
                  <span>{pastSessions[0].workoutTitle}</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400">{new Date(pastSessions[0].date).toLocaleDateString('it-IT')}</span>
                </span>
              ) : (
                <span className="italic text-slate-500">Nessuna sessione registrata</span>
              )}
            </div>

            {pastSessions.length > 0 && (
              <button
                type="button"
                onClick={() => setIsHistorySectionOpen(true)}
                className="text-xs font-black text-sky-400 hover:text-sky-300 hover:underline flex items-center gap-1 cursor-pointer self-start sm:self-auto"
              >
                <span>Mostra tutti i {pastSessions.length} workout</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Contenuto Completo Espanso */}
        {isHistorySectionOpen && (
          <div className="space-y-3 pt-3 border-t border-slate-800/80 animate-in fade-in slide-in-from-top-2 duration-200">
            {loadingSessions ? (
              <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
                <span>Caricamento dello storico allenamenti...</span>
              </div>
            ) : pastSessions.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs space-y-2">
                <Dumbbell className="w-10 h-10 text-slate-700 mx-auto" />
                <p className="font-bold text-slate-400 text-sm">Nessun allenamento ancora registrato</p>
                <p>I workout completati dall'atleta verranno salvati qui nello storico permanente.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pastSessions.map((session) => {
                  const isExpanded = expandedSessionId === session.id;

                  return (
                    <div
                      key={session.id}
                      className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/90 transition-all space-y-3 hover:border-slate-700 shadow-md"
                    >
                      <div
                        onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)] shrink-0">
                            <Dumbbell className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-bold text-white">{session.workoutTitle}</h4>
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30">
                                Settimana {session.weekNumber || 1}
                                {session.dayName ? ` • ${session.dayName}` : ''}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              <span>Eseguito il {new Date(session.date).toLocaleDateString('it-IT')}</span>
                              <span>•</span>
                              <Clock className="w-3.5 h-3.5 text-slate-500" />
                              <span>{session.durationMinutes} min</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                          {session.rpe > 0 && (
                            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400">
                              RPE: {session.rpe}/10
                            </span>
                          )}
                          <button className="p-1 text-slate-400 hover:text-white cursor-pointer">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-sky-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-sky-400" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Dettaglio Esercizi, Carichi e Serie */}
                      {isExpanded && (
                        <div className="pt-3 border-t border-slate-800/80 space-y-3">
                          {session.notes && (
                            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
                              <strong className="text-[var(--color-primary)]">Note Allenamento:</strong> "{session.notes}"
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {session.exercises.map((ex, i) => (
                              <div
                                key={i}
                                className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2"
                              >
                                <span className="text-xs font-bold text-white block">{ex.name}</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {ex.sets.map((set, setIdx) => (
                                    <span
                                      key={setIdx}
                                      className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300"
                                    >
                                      Set {set.setNumber}:{' '}
                                      <strong className="text-[var(--color-primary)]">{set.reps} reps</strong> @{' '}
                                      {set.weightKg}kg
                                    </span>
                                  ))}
                                </div>
                                {ex.notes && (
                                  <div className="mt-1.5 p-2 rounded-lg bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 text-[11px] text-[var(--color-primary)] font-medium leading-relaxed">
                                    💬 <strong>Feedback:</strong> {ex.notes}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pulsante Richiudi in fondo */}
            {pastSessions.length > 0 && (
              <div className="pt-2 text-center border-t border-slate-800/60">
                <button
                  type="button"
                  onClick={() => setIsHistorySectionOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-white border border-slate-800 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <ChevronUp className="w-4 h-4 text-sky-400" />
                  <span>Comprimi Storico Allenamenti</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. Change Log / Storico Variazioni Programma */}
      {athleteId && (
        <div className="pt-2">
          <ChangeLogTab athleteId={athleteId} />
        </div>
      )}

      {/* 6. Impostazioni App Mobile & Aggiunta a Schermata Home */}
      <div className="pt-2">
        <div className="p-5 rounded-3xl bg-gradient-to-r from-slate-950 via-[#0d1424] to-slate-950 border border-cyan-500/30 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[var(--color-primary)] to-amber-300 p-0.5 shadow-lg shadow-[var(--color-primary)]/20 shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center relative overflow-hidden">
                <span className="font-black text-sm italic text-[var(--color-primary)]">AC</span>
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white">App Mobile AC & Schermata Home</h3>
                <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  Home Screen
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Aggiungi l'icona AC sul tuo smartphone per aprire il portale a schermo intero in un tocco.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsInstallModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-[var(--color-primary)] text-slate-950 font-black text-xs hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20 cursor-pointer self-start sm:self-auto shrink-0"
          >
            <Smartphone className="w-4 h-4" />
            <span>Guida Installazione</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
          </button>
        </div>
      </div>

      {/* Modale Guida Installazione PWA */}
      <PwaInstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />
    </div>
  );
};
