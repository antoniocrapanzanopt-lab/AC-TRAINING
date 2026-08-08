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
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAthletes } from '../../context/AthletesContext';
import { useMetrics } from '../../context/MetricsContext';
import { supabase } from '../../lib/supabase';

interface PastSession {
  id: string;
  workoutTitle: string;
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
  const { maxLifts } = useMetrics();

  const currentAthlete = user 
    ? athletes.find(a => 
        (a.id && a.id === user.athleteId) || 
        (a.email && user.email && a.email.toLowerCase() === user.email.toLowerCase())
      )
    : null;

  const athleteId = currentAthlete?.id || user?.athleteId || user?.id;

  const [pastSessions, setPastSessions] = useState<PastSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  // Carica le sessioni completate in passato dall'atleta
  useEffect(() => {
    const fetchPastSessions = async () => {
      if (!athleteId) {
        setLoadingSessions(false);
        return;
      }
      setLoadingSessions(true);
      try {
        const { data, error } = await supabase
          .from('workout_sessions')
          .select(`
            id,
            start_time,
            end_time,
            rpe,
            notes,
            workouts ( title ),
            exercise_logs (
              set_number,
              reps_completed,
              weight_kg,
              notes,
              workout_exercises ( name )
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

            const exMap = new Map<string, { sets: any[]; notesSet: Set<string> }>();
            const logs = session.exercise_logs || [];

            logs.forEach((log: any) => {
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
              workoutTitle: session.workouts?.title || 'Allenamento Svolto',
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

  // Controllo scadenza certificato medico
  const getCertificateStatus = () => {
    if (!currentAthlete?.medicalCertificateExpiryDate) {
      return { status: 'missing', label: 'Certificato Non Presente', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
    }
    const expDate = new Date(currentAthlete.medicalCertificateExpiryDate);
    const today = new Date();
    const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

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
    <div className="space-y-6 max-w-4xl mx-auto pb-8">
      {/* 1. Header Profilo Atleta */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <div className="w-20 h-20 rounded-full bg-[var(--color-primary)] text-black font-black text-2xl flex items-center justify-center shadow-lg shadow-[var(--color-primary)]/20 shrink-0">
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
              <span className="px-3 py-1 rounded-xl text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" /> {currentAthlete.phone}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Dati Anagrafici & Certificato Medico */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Anagrafica */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <User className="w-4 h-4 text-[var(--color-primary)]" /> Informazioni Personali
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Data di Nascita:</span>
              <span className="font-semibold text-white">
                {currentAthlete?.dateOfBirth ? new Date(currentAthlete.dateOfBirth).toLocaleDateString('it-IT') : 'Non specificata'}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
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
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
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

      {/* 3. Record Personali (PR / Massimali) */}
      {athletePRs.length > 0 && (
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" /> Record Personali & Massimali (1RM)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {athletePRs.map(pr => (
              <div key={pr.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center space-y-1">
                <span className="text-[10px] font-bold text-slate-400 line-clamp-1 block">{pr.exercise_name}</span>
                <span className="text-lg font-black text-amber-400 block">{pr.calculated_1rm} kg</span>
                <span className="text-[10px] text-slate-500 block">({pr.weight_kg}kg testati)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Storico Allenamenti Completati */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-[var(--color-primary)]" /> Storico Allenamenti Completati
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Tutti i workout svolti in passato con dettagli di carichi e ripetizioni</p>
          </div>
          <span className="text-xs font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-3 py-1.5 rounded-xl border border-[var(--color-primary)]/20">
            {pastSessions.length} completati
          </span>
        </div>

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
            {pastSessions.map(session => {
              const isExpanded = expandedSessionId === session.id;

              return (
                <div 
                  key={session.id} 
                  className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 transition-all space-y-3 hover:border-slate-700"
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
                        <h4 className="text-sm font-bold text-white">{session.workoutTitle}</h4>
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
                      <button className="p-1 text-slate-400 hover:text-white">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Dettaglio Esercizi */}
                  {isExpanded && (
                    <div className="pt-3 border-t border-slate-800/80 space-y-3">
                      {session.notes && (
                        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
                          <strong className="text-amber-400">Note Allenamento:</strong> "{session.notes}"
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {session.exercises.map((ex, i) => (
                          <div key={i} className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2">
                            <span className="text-xs font-bold text-white block">{ex.name}</span>
                            <div className="flex flex-wrap gap-1.5">
                              {ex.sets.map((set, setIdx) => (
                                <span 
                                  key={setIdx}
                                  className="text-[11px] font-semibold px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300"
                                >
                                  Set {set.setNumber}: <strong className="text-amber-400">{set.reps} reps</strong> @ {set.weightKg}kg
                                </span>
                              ))}
                            </div>
                            {ex.notes && (
                              <div className="mt-1.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 font-medium leading-relaxed">
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
      </div>
    </div>
  );
};
