import React, { useState } from 'react';
import {
  X,
  Send,
  AlertCircle,
  Stethoscope,
  Briefcase,
  HeartCrack,
  Plane,
  HelpCircle,
} from 'lucide-react';
import { WorkoutTemplate } from '../../types/workout';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';

interface SkipWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  workout: WorkoutTemplate;
  weekNumber: number;
  dayName: string;
  athleteId: string;
  onSuccess: () => void;
}

const PRESET_REASONS = [
  { id: 'health', label: 'Malattia / Indisposizione', icon: Stethoscope },
  { id: 'work', label: 'Lavoro / Studio / Impegni', icon: Briefcase },
  { id: 'pain', label: 'Dolore o Infortunio', icon: HeartCrack },
  { id: 'travel', label: 'Viaggio / Palestra Chiusa', icon: Plane },
  { id: 'other', label: 'Altro Motivo', icon: HelpCircle },
];

export const SkipWorkoutModal: React.FC<SkipWorkoutModalProps> = ({
  isOpen,
  onClose,
  workout,
  weekNumber,
  dayName,
  athleteId,
  onSuccess,
}) => {
  const { showSuccess, showError } = useToast();
  const [selectedReason, setSelectedReason] = useState<string>('Malattia / Indisposizione');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!athleteId || !workout.id) return;

    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      const payload = {
        athlete_id: athleteId,
        workout_id: workout.id,
        start_time: now,
        end_time: now,
        status: 'skipped',
        skip_reason: selectedReason,
        skip_notes: notes.trim() || null,
        coach_justified: null, // In attesa di valutazione del coach
        week_number: weekNumber,
        day_name: dayName,
        rpe: 1,
      };

      if (navigator.onLine) {
        const { error } = await supabase.from('workout_sessions').insert([payload]);
        if (error) throw error;
      }

      // Aggiorna lo stato dei progressi locali per questa settimana e giorno
      const progressKey = `builder_progress_${athleteId}_${workout.id}`;
      let progressMap: Record<string, boolean | string> = {};
      try {
        progressMap = JSON.parse(localStorage.getItem(progressKey) || '{}');
      } catch (_) {}

      progressMap[`${weekNumber}-${dayName}`] = true;
      localStorage.setItem(progressKey, JSON.stringify(progressMap));

      // Salva nei record locali di sessioni saltate
      const skippedSessionsKey = `builder_skipped_sessions_${athleteId}`;
      let skippedList: any[] = [];
      try {
        skippedList = JSON.parse(localStorage.getItem(skippedSessionsKey) || '[]');
      } catch (_) {}

      skippedList.push({
        id: `skip-${Date.now()}`,
        ...payload,
        workoutTitle: workout.title,
      });
      localStorage.setItem(skippedSessionsKey, JSON.stringify(skippedList));

      // Notifica l'applicazione
      window.dispatchEvent(new Event('athlete_draft_updated'));
      window.dispatchEvent(new Event('athlete_workout_skipped'));

      showSuccess(
        'Giustificazione Inviata',
        `Hai segnalato l'assenza per ${dayName}. Il coach valuterà la motivazione.`
      );

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Errore invio salto workout:', err);
      showError('Errore', 'Impossibile inviare la giustificazione. Riprova.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-3xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[var(--color-border)] flex items-start justify-between gap-4 bg-[var(--color-surface-strong)]">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0 shadow-sm">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-[var(--color-text)]">
                Salta Seduta di Allenamento
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                <strong className="text-[var(--color-text)]">{dayName}</strong> • Settimana {weekNumber} ({workout.title})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-[var(--color-surface)] hover:bg-[var(--color-surface-strong)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-[var(--color-border)] flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body & Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Selezione Rapida Motivo */}
          <div className="space-y-2.5">
            <label className="text-xs font-black uppercase tracking-wider text-[var(--color-text-muted)] block">
              Seleziona il Motivo Principale
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESET_REASONS.map((reason) => {
                const isSelected = selectedReason === reason.label;
                const IconComponent = reason.icon;
                return (
                  <button
                    key={reason.id}
                    type="button"
                    onClick={() => setSelectedReason(reason.label)}
                    className={`p-3 rounded-2xl border text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer text-left ${
                      isSelected
                        ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)] border-[var(--color-primary)] shadow-sm ring-1 ring-[var(--color-primary)]/50'
                        : 'bg-[var(--color-surface-strong)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] border-[var(--color-border)]'
                    }`}
                  >
                    <IconComponent className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[var(--color-primary)]' : ''}`} />
                    <span className="truncate">{reason.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dettagli / Spiegazione */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-[var(--color-text-muted)] flex items-center justify-between">
              <span>Note / Spiegazione per il Coach</span>
              <span className="text-[10px] font-normal text-[var(--color-text-muted)]">Opzionale</span>
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Spiega brevemente al coach la motivazione o quando potrai recuperare..."
              className="w-full p-3.5 rounded-2xl bg-[var(--color-surface-strong)] border border-[var(--color-border)] text-xs text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] resize-none"
            />
          </div>

          {/* Avviso Trasparenza Coach */}
          <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs flex items-start gap-2.5 leading-relaxed">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-sky-400" />
            <p>
              La tua giustificazione verrà registrata e inviata al coach. Nel suo gestionale, il coach deciderà se giustificare l'assenza senza penalizzare il tuo punteggio di aderenza.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-strong)] transition-colors cursor-pointer"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Invia Giustificazione</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
