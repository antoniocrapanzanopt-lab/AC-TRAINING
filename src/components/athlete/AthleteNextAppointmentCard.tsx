import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  CheckCircle2,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { useCalendar } from '../../context/CalendarContext';
import { useAuth } from '../../context/AuthContext';
import { useAthletes } from '../../context/AthletesContext';
import { CalendarEvent } from '../../types';
import { AthleteAppointmentsModal } from './AthleteAppointmentsModal';

interface AthleteNextAppointmentCardProps {
  targetAthleteId?: string;
}

export const AthleteNextAppointmentCard: React.FC<AthleteNextAppointmentCardProps> = ({ targetAthleteId }) => {
  const { user } = useAuth();
  const { athletes } = useAthletes();
  const { allEvents } = useCalendar();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Risoluzione ID Atleta
  const currentAthlete = useMemo(() => {
    if (targetAthleteId) {
      return athletes.find((a) => a.id === targetAthleteId) || null;
    }
    if (!user) return null;
    if (user.athleteId) {
      return athletes.find((a) => a.id === user.athleteId) || null;
    }
    if (user.email) {
      return athletes.find((a) => a.email && a.email.toLowerCase() === user.email.toLowerCase()) || null;
    }
    return null;
  }, [targetAthleteId, user, athletes]);

  const athleteId = targetAthleteId || currentAthlete?.id || user?.athleteId || user?.id;

  // Filtro eventi per atleta ordinati cronologicamente
  const { nextAppointment, futureAppointments, pastAppointments } = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    
    // Trova eventi associati a questo atleta o eventi generali indirizzati
    const athleteEvents = allEvents.filter((evt) => {
      if (evt.status === 'cancelled') return false;
      const isIdMatch = evt.athleteId && evt.athleteId === athleteId;
      const isNameMatch = currentAthlete?.fullName && evt.athleteName && evt.athleteName.toLowerCase() === currentAthlete.fullName.toLowerCase();
      const isEmailMatch = user?.email && evt.description && evt.description.toLowerCase().includes(user.email.toLowerCase());
      return isIdMatch || isNameMatch || isEmailMatch;
    });

    // Separa futuri e passati
    const future = athleteEvents
      .filter((evt) => evt.date >= todayStr)
      .sort((a, b) => {
        const dateDiff = a.date.localeCompare(b.date);
        if (dateDiff !== 0) return dateDiff;
        return (a.startTime || '').localeCompare(b.startTime || '');
      });

    const past = athleteEvents
      .filter((evt) => evt.date < todayStr || evt.status === 'completed')
      .sort((a, b) => b.date.localeCompare(a.date));

    const next = future.length > 0 ? future[0] : null;

    return {
      nextAppointment: next,
      futureAppointments: future,
      pastAppointments: past,
    };
  }, [allEvents, athleteId, currentAthlete, user]);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('it-IT', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
    } catch {
      return dateStr;
    }
  };

  const isOnline = (evt: CalendarEvent) => {
    const loc = (evt.location || '').toLowerCase();
    return Boolean(evt.htmlLink) || loc.includes('online') || loc.includes('meet') || loc.includes('zoom') || loc.includes('call');
  };

  const getDurationText = (evt: CalendarEvent) => {
    if (!evt.startTime) return null;
    if (!evt.endTime) return '45 min';
    const [sh, sm] = evt.startTime.split(':').map(Number);
    const [eh, em] = evt.endTime.split(':').map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    return diff > 0 ? `${diff} min` : '45 min';
  };

  return (
    <>
      <div className="rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 p-4 sm:p-5 shadow-xl transition-all hover:border-slate-700/80 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800/70 pb-2.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            Prossimo Appuntamento
          </span>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="text-[11px] font-bold text-[var(--color-primary)] hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            <span>Vedi dettagli</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {nextAppointment ? (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-0.5 min-w-0">
                <h4 className="text-sm sm:text-base font-black text-white capitalize truncate">
                  {nextAppointment.title}
                </h4>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-300">
                  <span className="font-bold text-white capitalize flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-[var(--color-primary)]" />
                    {formatDate(nextAppointment.date)}
                  </span>
                  {nextAppointment.startTime && (
                    <span className="text-slate-400 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {nextAppointment.startTime}
                      {getDurationText(nextAppointment) && (
                        <span className="text-[10px] text-slate-500 font-sans">
                          ({getDurationText(nextAppointment)})
                        </span>
                      )}
                    </span>
                  )}
                </div>
              </div>

              {/* Badge Modalità & Stato */}
              <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
                {isOnline(nextAppointment) ? (
                  <span className="px-2.5 py-1 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[10px] font-black flex items-center gap-1">
                    <Video className="w-3 h-3" /> Online
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-black flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> In Presenza
                  </span>
                )}
                <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border flex items-center gap-1 ${
                  nextAppointment.status === 'scheduled' || nextAppointment.status === 'completed'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}>
                  <CheckCircle2 className="w-3 h-3" />
                  {nextAppointment.status === 'scheduled' || nextAppointment.status === 'completed' ? 'Confermato' : 'Da confermare'}
                </span>
              </div>
            </div>

            {/* Pulsanti Rapidi */}
            <div className="flex items-center gap-2 pt-1">
              {nextAppointment.htmlLink && (
                <a
                  href={nextAppointment.htmlLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/20 transition-all cursor-pointer"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Partecipa alla Call</span>
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </a>
              )}
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className={`py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs border border-slate-700 transition-all cursor-pointer ${
                  nextAppointment.htmlLink ? 'shrink-0' : 'flex-1 text-center'
                }`}
              >
                Vedi dettagli
              </button>
            </div>
          </div>
        ) : (
          <div className="py-2 text-center space-y-1">
            <p className="text-xs font-bold text-slate-300">Nessun appuntamento programmato</p>
            <p className="text-[11px] text-slate-500">Qui vedrai il tuo prossimo check o incontro con il coach.</p>
          </div>
        )}
      </div>

      {/* Modale Completa Appuntamenti & Calendario */}
      <AthleteAppointmentsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        nextAppointment={nextAppointment}
        futureAppointments={futureAppointments}
        pastAppointments={pastAppointments}
      />
    </>
  );
};
