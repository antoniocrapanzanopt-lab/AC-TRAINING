import React, { useState } from 'react';
import {
  Sparkles,
  Check,
  X,
  ShieldCheck,
} from 'lucide-react';
import { ProgressionSuggestion, ProgressionRuleFormData } from '../../types/progression';

interface ProgressionApprovalModalProps {
  suggestion: ProgressionSuggestion;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (adjustedData: Partial<ProgressionRuleFormData>) => Promise<void>;
}

export const ProgressionApprovalModal: React.FC<ProgressionApprovalModalProps> = ({
  suggestion,
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  const [sets, setSets] = useState(suggestion.proposed_target.sets);
  const [reps, setReps] = useState(suggestion.proposed_target.reps);
  const [loadKg, setLoadKg] = useState(suggestion.proposed_target.load_kg || 0);
  const [rir, setRir] = useState(suggestion.proposed_target.rir || 'RIR 2');
  const [restSeconds, setRestSeconds] = useState(suggestion.proposed_target.rest_seconds || 90);
  const [coachNote, setCoachNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onConfirm({
        current_target: {
          sets,
          reps,
          load_kg: loadKg,
          rir,
          rest_seconds: restSeconds,
        },
        description: coachNote ? `Approvato con nota coach: ${coachNote}` : undefined,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-slate-900 border border-purple-500/40 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Revisione Proposta Progressione</h3>
              <p className="text-[11px] text-slate-400">
                {suggestion.exercise_name} • {suggestion.athlete_name}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/20 text-xs text-purple-200">
            <p className="font-bold text-purple-300 mb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" /> Analisi Intelligente:
            </p>
            <p>{suggestion.reason}</p>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider text-slate-400">
              Parametri Obiettivo per la Prossima Seduta
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Serie</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={sets}
                  onChange={(e) => setSets(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Ripetizioni</label>
                <input
                  type="text"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Carico Target (kg)</label>
                <input
                  type="number"
                  step="0.5"
                  value={loadKg}
                  onChange={(e) => setLoadKg(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-[var(--color-primary)] text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Target RIR</label>
                <input
                  type="text"
                  value={rir}
                  onChange={(e) => setRir(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono"
                />
              </div>

              <div className="col-span-2">
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Recupero (secondi)</label>
                <input
                  type="number"
                  step="5"
                  value={restSeconds}
                  onChange={(e) => setRestSeconds(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Nota del Coach all'Atleta (Opzionale)</label>
              <textarea
                rows={2}
                placeholder="Es. Mantieni fermo al petto di 1 secondo e cura la traiettoria..."
                value={coachNote}
                onChange={(e) => setCoachNote(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all shadow shadow-amber-500/10"
            >
              <Check className="w-4 h-4" /> Conferma e Salva Target
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
