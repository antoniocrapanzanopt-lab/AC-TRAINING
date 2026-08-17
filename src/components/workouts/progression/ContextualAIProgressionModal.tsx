import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Check,
  Clock,
  AlertTriangle,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { generateAIProgressionSuggestion } from '../../../lib/ai/progressionAssistant';
import { ProgressionSuggestion } from '../../../types/progression';
import { useExercises } from '../../../context/ExercisesContext';
import { useToast } from '../../../context/ToastContext';

interface ContextualAIProgressionModalProps {
  isOpen: boolean;
  onClose: () => void;
  athleteId?: string;
  athleteName?: string;
  programId?: string;
  programName?: string;
  workoutExerciseId?: string;
  exerciseName: string;
  currentTarget: {
    sets: number;
    reps: string;
    load_kg?: number;
    rir?: string;
    rest_seconds?: number;
    tut?: string;
  };
  onApplyProposal: (
    suggestion: ProgressionSuggestion,
    saveAsPending: boolean
  ) => Promise<void>;
}

export const ContextualAIProgressionModal: React.FC<ContextualAIProgressionModalProps> = ({
  isOpen,
  onClose,
  athleteId = 'ath-demo',
  athleteName = 'Atleta Selezionato',
  programId = 'prog-current',
  programName = 'Scheda Corrente',
  workoutExerciseId = 'ex-temp',
  exerciseName,
  currentTarget,
  onApplyProposal,
}) => {
  const { exercises: libraryExercises } = useExercises();
  const { showSuccess, showError } = useToast();

  const [coachPrompt, setCoachPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedSuggestion, setGeneratedSuggestion] = useState<ProgressionSuggestion | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const suggestion = await generateAIProgressionSuggestion({
        athlete_id: athleteId,
        athlete_name: athleteName,
        program_id: programId,
        program_name: programName,
        workout_exercise_id: workoutExerciseId,
        exercise_name: exerciseName,
        current_target: {
          sets: currentTarget.sets,
          reps: currentTarget.reps,
          load_kg: currentTarget.load_kg || 60,
          rir: currentTarget.rir || 'RIR 2',
          rest_seconds: currentTarget.rest_seconds || 90,
          tut: currentTarget.tut || '3-0-1-0',
        },
        recent_logs: [],
        available_exercises: libraryExercises,
        coach_notes: coachPrompt.trim() || undefined,
      });

      setGeneratedSuggestion(suggestion);
      showSuccess('Proposta IA Generata', 'L\'assistente ha elaborato la progressione contestuale.');
    } catch {
      showError('Errore Generazione', 'Impossibile elaborare la proposta IA.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = async (saveAsPending: boolean) => {
    if (!generatedSuggestion) return;
    setIsApplying(true);
    try {
      await onApplyProposal(generatedSuggestion, saveAsPending);
      onClose();
    } catch {
      showError('Errore Salvataggio', 'Impossibile applicare la proposta.');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] shadow-2xl z-10 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Chiedi Progressione all'IA</h2>
              <p className="text-xs text-slate-400">
                Analisi per <span className="text-amber-400 font-bold">{exerciseName}</span> • Atleta: {athleteName}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          
          {/* Target Attuale dell'Esercizio */}
          <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block mb-1">
                Target di Partenza Scheda
              </span>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>{currentTarget.sets} Set × {currentTarget.reps}</span>
                {currentTarget.load_kg ? <span className="text-[var(--color-primary)]">@ {currentTarget.load_kg} kg</span> : null}
                {currentTarget.rir && <span className="text-xs text-slate-400">({currentTarget.rir})</span>}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 block">Recupero</span>
              <span className="text-xs font-bold text-slate-300">{currentTarget.rest_seconds || 60}s</span>
            </div>
          </div>

          {/* Istruzioni opzionali del Coach */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>Indicazioni specifiche per l'IA (Opzionale)</span>
              <span className="text-[10px] text-slate-500">es. "Focus forza", "Fastidio a una spalla"</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="es. Preferisci incremento ripetizioni prima di aumentare il carico..."
                value={coachPrompt}
                onChange={(e) => setCoachPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleGenerate(); }}
                className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isLoading}
                className="px-4 py-2.5 bg-amber-500 text-black hover:bg-amber-400 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 shadow-md shrink-0 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Elabora</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Risultato della Proposta Generata */}
          {generatedSuggestion && (
            <div className="p-5 bg-slate-950 rounded-2xl border border-amber-500/30 space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Metodo: {generatedSuggestion.suggested_method.replace('_', ' ').toUpperCase()}
                </span>
                <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Confidenza: {Math.round((generatedSuggestion.confidence_score || 0.9) * 100)}%
                </span>
              </div>

              {/* Target Proposto */}
              <div className="p-4 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Obiettivo Proposto</span>
                <div className="flex items-center gap-3 text-sm font-bold text-white">
                  <span className="text-[var(--color-primary)]">
                    {generatedSuggestion.proposed_target.sets} set × {generatedSuggestion.proposed_target.reps}
                  </span>
                  {generatedSuggestion.proposed_target.load_kg && (
                    <span className="text-emerald-400 font-mono">
                      @ {generatedSuggestion.proposed_target.load_kg} kg
                    </span>
                  )}
                  {generatedSuggestion.proposed_target.rir && (
                    <span className="text-xs text-slate-400">
                      ({generatedSuggestion.proposed_target.rir})
                    </span>
                  )}
                </div>
              </div>

              {/* Motivazione Scientifica */}
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Razionale Cinesiologico</span>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  {generatedSuggestion.reason}
                </p>
              </div>

              {/* Avvisi / Precauzioni */}
              {generatedSuggestion.warnings && generatedSuggestion.warnings.length > 0 && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{generatedSuggestion.warnings.join(' • ')}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors"
          >
            Annulla
          </button>

          {generatedSuggestion ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleApply(true)}
                disabled={isApplying}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5" />
                Salva come Proposta in Attesa
              </button>
              <button
                type="button"
                onClick={() => handleApply(false)}
                disabled={isApplying}
                className="px-4 py-2 bg-[var(--color-primary)] text-black hover:bg-[var(--color-primary-hover)] text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-md"
              >
                <Check className="w-4 h-4" />
                Applica Subito alla Scheda
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isLoading}
              className="px-4 py-2 bg-amber-500 text-black hover:bg-amber-400 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-md"
            >
              <Sparkles className="w-4 h-4" />
              Genera Suggerimento
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
