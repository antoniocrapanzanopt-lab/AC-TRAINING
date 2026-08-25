import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Calendar,
  Clock,
  Video,
  MapPin,
  CheckCircle2,
  CalendarPlus,
  ExternalLink,
  History,
  FileText,
} from 'lucide-react';
import { CalendarEvent } from '../../types';
import { exportEventToIcs } from '../../utils/calendarExport';

interface AthleteAppointmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  nextAppointment: CalendarEvent | null;
  futureAppointments: CalendarEvent[];
  pastAppointments: CalendarEvent[];
}

export const AthleteAppointmentsModal: React.FC<AthleteAppointmentsModalProps> = ({
  isOpen,
  onClose,
  nextAppointment,
  futureAppointments,
  pastAppointments,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('it-IT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
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

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 font-sans">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Contenitore Modale con Header Fisso e Body Scrollabile */}
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-3xl shadow-2xl flex flex-col overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Fisso */}
        <div className="px-5 sm:px-7 py-4 bg-[var(--color-panel)] border-b border-[var(--color-border)] flex items-center justify-between shrink-0 z-30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)] shrink-0 shadow-sm">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-[var(--color-text)] uppercase tracking-tight">
                  I Tuoi Appuntamenti & Check
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[var(--color-primary)]/15 text-[var(--color-primary)] font-black text-[9px] uppercase border border-[var(--color-primary)]/30">
                  Calendario
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-[var(--color-text-muted)] font-medium mt-0.5">
                Riepilogo delle sessioni, call e check programmati con il coach
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] bg-[var(--color-surface-strong)] hover:bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] transition-all cursor-pointer shadow-sm"
            aria-label="Chiudi finestra"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Scrollabile */}
        <div className="p-5 sm:p-7 overflow-y-auto flex-1 space-y-6">
          
          {/* ─── 1. PROSSIMO APPUNTAMENTO IN EVIDENZA ─── */}
          {nextAppointment ? (
            <div className="p-5 sm:p-6 rounded-3xl bg-[var(--color-surface-strong)] border-2 border-[var(--color-primary)]/40 shadow-md space-y-4 relative overflow-hidden">
              <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] pb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-primary)] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse" />
                  Prossimo Appuntamento in Evidenza
                </span>
                <div className="flex items-center gap-1.5">
                  {isOnline(nextAppointment) ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-600 border border-purple-500/30 text-[10px] font-black flex items-center gap-1">
                      <Video className="w-3 h-3" /> Online
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 text-[10px] font-black flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> In Presenza
                    </span>
                  )}
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                    nextAppointment.status === 'scheduled' || nextAppointment.status === 'completed'
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                  }`}>
                    <CheckCircle2 className="w-3 h-3" />
                    {nextAppointment.status === 'scheduled' || nextAppointment.status === 'completed' ? 'Confermato' : 'Da confermare'}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-black text-[var(--color-text)] capitalize">
                  {nextAppointment.title}
                </h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-[var(--color-text-muted)] font-medium">
                  <span className="flex items-center gap-1.5 text-[var(--color-text)] font-bold capitalize">
                    <Calendar className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                    {formatDate(nextAppointment.date)}
                  </span>
                  {nextAppointment.startTime && (
                    <span className="flex items-center gap-1 text-[var(--color-text-muted)] font-mono">
                      <Clock className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                      {nextAppointment.startTime} {nextAppointment.endTime ? `- ${nextAppointment.endTime}` : ''}
                      {getDurationText(nextAppointment) && (
                        <span className="text-[10px] text-[var(--color-text-muted)] font-sans ml-1">
                          ({getDurationText(nextAppointment)})
                        </span>
                      )}
                    </span>
                  )}
                </div>
              </div>

              {/* Note o Dettagli del Coach */}
              {(nextAppointment.description || nextAppointment.notes) && (
                <div className="p-3.5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-border)] text-xs text-[var(--color-text)] leading-relaxed flex items-start gap-2.5">
                  <FileText className="w-4 h-4 text-[var(--color-text-muted)] shrink-0 mt-0.5" />
                  <p className="italic">
                    "{nextAppointment.description || nextAppointment.notes}"
                  </p>
                </div>
              )}

              {/* Azioni Prossimo Appuntamento */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                {nextAppointment.htmlLink && (
                  <a
                    href={nextAppointment.htmlLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-95"
                  >
                    <Video className="w-4 h-4" />
                    <span>Partecipa alla Call</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => exportEventToIcs(nextAppointment)}
                  className="py-2.5 px-4 rounded-xl bg-[var(--color-panel)] hover:bg-[var(--color-surface)] text-[var(--color-text)] font-bold text-xs border border-[var(--color-border)] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <CalendarPlus className="w-4 h-4 text-[var(--color-primary)]" />
                  <span>Aggiungi al Calendario (.ics)</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 sm:p-8 rounded-3xl bg-[var(--color-surface-strong)] border border-[var(--color-border)] text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] mx-auto">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-bold text-[var(--color-text)]">Nessun appuntamento programmato</h4>
                <p className="text-xs text-[var(--color-text-muted)] mt-1 max-w-sm mx-auto">
                  Qui vedrai il tuo prossimo check o incontro con il coach non appena verrà fissato.
                </p>
              </div>
            </div>
          )}

          {/* ─── 2. LISTA APPUNTAMENTI FUTURI ─── */}
          {futureAppointments.length > 1 && (
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[var(--color-primary)]" />
                Altri Appuntamenti Futuri ({futureAppointments.length - 1})
              </h4>
              <div className="space-y-2.5">
                {futureAppointments.slice(1).map((evt) => (
                  <div
                    key={evt.id}
                    className="p-4 rounded-2xl bg-[var(--color-surface-strong)] border border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[var(--color-primary)]/40 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-[var(--color-text)]">{evt.title}</span>
                        {isOnline(evt) ? (
                          <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20 text-[9px] font-bold">
                            Online
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[9px] font-bold">
                            In Presenza
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-[var(--color-text-muted)]">
                        <span>{formatDate(evt.date)}</span>
                        {evt.startTime && <span>• {evt.startTime}</span>}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => exportEventToIcs(evt)}
                      className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] bg-[var(--color-panel)] rounded-xl border border-[var(--color-border)] transition-colors self-end sm:self-center"
                      title="Scarica per il tuo calendario"
                    >
                      <CalendarPlus className="w-4 h-4 text-[var(--color-primary)]" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── 3. STORICO APPUNTAMENTI PASSATI ─── */}
          {pastAppointments.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-[var(--color-border)]">
              <h4 className="text-xs font-black uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-2">
                <History className="w-4 h-4 text-[var(--color-text-muted)]" />
                Storico Incontri Passati ({pastAppointments.length})
              </h4>
              <div className="space-y-2">
                {pastAppointments.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-3.5 rounded-2xl bg-[var(--color-surface-strong)] border border-[var(--color-border)] flex items-center justify-between gap-3 opacity-80"
                  >
                    <div>
                      <span className="text-xs font-semibold text-[var(--color-text)] block">{evt.title}</span>
                      <span className="text-[10px] text-[var(--color-text-muted)]">{formatDate(evt.date)}</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
                      Concluso
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>,
    document.body
  );
};
