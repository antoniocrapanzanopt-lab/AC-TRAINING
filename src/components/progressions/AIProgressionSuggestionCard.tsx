import React, { useState } from 'react';
import {
  Sparkles,
  Check,
  X,
  Sliders,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { ProgressionSuggestion } from '../../types/progression';

interface AIProgressionSuggestionCardProps {
  suggestion: ProgressionSuggestion;
  onApprove: (suggestion: ProgressionSuggestion) => void;
  onReject: (suggestionId: string) => void;
  onModify: (suggestion: ProgressionSuggestion) => void;
}

export const AIProgressionSuggestionCard: React.FC<AIProgressionSuggestionCardProps> = ({
  suggestion,
  onApprove,
  onReject,
  onModify,
}) => {
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const current = suggestion.current_target;
  const proposed = suggestion.proposed_target;

  const handleConfirmReject = () => {
    onReject(suggestion.id);
    setIsRejecting(false);
  };

  return (
    <div className="p-5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] hover:border-purple-500/40 shadow-xl space-y-4 transition-all">
      {/* Header Proposta */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white">{suggestion.exercise_name}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                {(suggestion.confidence_score * 100).toFixed(0)}% Confidenza IA
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Atleta: <span className="text-slate-200 font-bold">{suggestion.athlete_name}</span> • Scheda: {suggestion.program_name || 'Attiva'}
            </p>
          </div>
        </div>

        <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
          <Clock className="w-3 h-3" /> {new Date(suggestion.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Confronto Target Attuale vs Proposto */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs">
        {/* Attuale */}
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-500">Target Attuale</span>
          <div className="font-mono text-slate-300 font-bold">
            {current.sets} x {current.reps} @ {current.load_kg || 0}kg
          </div>
          <span className="text-[11px] text-slate-500 block">
            {current.rir || 'RIR standard'} • Rec: {current.rest_seconds || 90}s
          </span>
        </div>

        {/* Proposta IA */}
        <div className="space-y-1 sm:border-l sm:border-slate-800 sm:pl-3">
          <span className="text-[10px] uppercase font-bold text-purple-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Proposta Suggerita
          </span>
          <div className="font-mono text-white font-black text-sm flex items-center gap-1.5 text-purple-300">
            {proposed.sets} x {proposed.reps} @ {proposed.load_kg || 0}kg
            <ArrowRight className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <span className="text-[11px] text-slate-300 block font-medium">
            {proposed.rir || 'RIR standard'} • Rec: {proposed.rest_seconds || 90}s
          </span>
        </div>
      </div>

      {/* Spiegazione Cinesiologica */}
      <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/20 text-xs text-purple-200 leading-relaxed">
        <p className="font-bold text-purple-300 mb-0.5 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-purple-400" /> Rationale Cinesiologico:
        </p>
        <p>{suggestion.reason}</p>
      </div>

      {/* Warnings & Variante di Sostituzione se presenti */}
      {suggestion.warnings && suggestion.warnings.length > 0 && (
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>{suggestion.warnings.join(' • ')}</span>
        </div>
      )}

      {suggestion.alternative_exercise && (
        <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-xs text-sky-300 space-y-1">
          <p className="font-bold text-sky-200">Variante Consigliata per Scarico Articolare:</p>
          <p className="font-bold text-white">{suggestion.alternative_exercise.name}</p>
          <p className="text-[11px] text-sky-300/80">{suggestion.alternative_exercise.reason}</p>
        </div>
      )}

      {/* Form di Rifiuto con Feedback */}
      {isRejecting ? (
        <div className="p-3 rounded-xl bg-red-950/30 border border-red-800 space-y-2 animate-fadeIn">
          <label className="text-[11px] font-bold text-red-300 block">
            Motivo del Rifiuto (Opzionale, utile per affinare l'IA):
          </label>
          <input
            type="text"
            placeholder="Es. Carico troppo elevato, atleta convalescente..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs"
          />
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={() => setIsRejecting(false)}
              className="px-3 py-1 rounded-lg bg-slate-800 text-white text-xs"
            >
              Annulla
            </button>
            <button
              onClick={handleConfirmReject}
              className="px-3 py-1 rounded-lg bg-red-600 text-white font-bold text-xs"
            >
              Conferma Rifiuto
            </button>
          </div>
        </div>
      ) : (
        /* Barra Azioni Coach */
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
          <button
            onClick={() => setIsRejecting(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-red-500/20 hover:text-red-400 text-slate-400 text-xs font-bold transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Rifiuta
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onModify(suggestion)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
            >
              <Sliders className="w-3.5 h-3.5" /> Modifica
            </button>

            <button
              onClick={() => onApprove(suggestion)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all shadow"
            >
              <Check className="w-4 h-4" /> Approva e Applica
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
