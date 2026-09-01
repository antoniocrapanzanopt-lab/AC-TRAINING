import React, { useState } from 'react';
import {
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  CheckCircle2,
  MessageSquare,
  ClipboardCheck,
  Sparkles,
} from 'lucide-react';
import { AdherenceScoreResult } from '../../services/adherenceService';

interface AthleteAdherenceCardProps {
  adherence: AdherenceScoreResult;
  loading?: boolean;
  isUpdating?: boolean;
}

export const AthleteAdherenceCard: React.FC<AthleteAdherenceCardProps> = ({
  adherence,
  loading = false,
  isUpdating = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (loading && !adherence) {
    return (
      <div className="p-5 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] animate-pulse">
        <div className="h-5 w-48 bg-slate-800 rounded-lg mb-3" />
        <div className="h-8 w-24 bg-slate-800 rounded-lg" />
      </div>
    );
  }

  const { score, label, colorClass, bgClass, borderClass, message, pillars } = adherence;

  return (
    <div className="rounded-3xl bg-[var(--color-surface)]/90 backdrop-blur-xl border border-[var(--color-border)] p-4 sm:p-5 shadow-lg space-y-3.5 transition-all relative">
      {/* ── HEADER CARD: TITOLO + BADGE LIVELLO + SCORE NUMERICO ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-10 h-10 rounded-2xl ${bgClass} border ${borderClass} flex items-center justify-center ${colorClass} shrink-0 shadow-sm relative`}>
            <ShieldCheck className="w-5 h-5" />
            {isUpdating && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[var(--color-primary)] ring-2 ring-slate-950 animate-pulse" title="Sincronizzazione in corso..." />
            )}
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] block">
              Qualità del Percorso (Ultimi 28 gg)
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-[var(--color-text)]">
                Indice Aderenza
              </h3>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-black border ${bgClass} ${colorClass} ${borderClass}`}>
                {label}
              </span>
            </div>
          </div>
        </div>

        {/* Score Display (Grande e Chiaro) */}
        <div className="text-right shrink-0">
          <div className="flex items-baseline justify-end gap-1">
            <span className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${colorClass}`}>
              {score}
            </span>
            <span className="text-xs sm:text-sm font-bold text-[var(--color-text-muted)] font-mono">
              / 100
            </span>
          </div>
        </div>
      </div>

      {/* ── BARRA DI PROGRESSO PRINCIPALE (GRADIENTE DINAMICO) ── */}
      <div className="space-y-1.5">
        <div className="h-2.5 w-full bg-[var(--color-surface-strong)] rounded-full overflow-hidden p-0.5 border border-[var(--color-border)]">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              score >= 90
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                : score >= 75
                ? 'bg-gradient-to-r from-sky-500 to-emerald-400'
                : score >= 50
                ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                : 'bg-gradient-to-r from-rose-500 to-rose-400'
            }`}
            style={{ width: `${Math.max(5, score)}%` }}
          />
        </div>
        <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
          {message}
        </p>
      </div>

      {/* ── MINI BREAKDOWN COMPATTO (4 PILASTRI UFFICIALI) ── */}
      <div className="grid grid-cols-4 gap-1.5 pt-1 text-center">
        <div className="bg-[var(--color-panel)] p-2 rounded-xl border border-[var(--color-border)]/60">
          <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] block">Sedute</span>
          <span className="text-xs font-black font-mono text-[var(--color-primary)]">{pillars.workouts.score}%</span>
        </div>
        <div className="bg-[var(--color-panel)] p-2 rounded-xl border border-[var(--color-border)]/60">
          <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] block">Serie</span>
          <span className="text-xs font-black font-mono text-emerald-400">{pillars.sets.score}%</span>
        </div>
        <div className="bg-[var(--color-panel)] p-2 rounded-xl border border-[var(--color-border)]/60">
          <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] block">Feedback</span>
          <span className="text-xs font-black font-mono text-purple-400">{pillars.feedback.score}%</span>
        </div>
        <div className="bg-[var(--color-panel)] p-2 rounded-xl border border-[var(--color-border)]/60">
          <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] block">Check-in</span>
          <span className="text-xs font-black font-mono text-sky-400">{pillars.checkins.score}%</span>
        </div>
      </div>

      {/* ── TOGGLE DETTAGLIO BREAKDOWN ESTESO ── */}
      <div className="pt-1 border-t border-[var(--color-border)]/60">
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="w-full flex items-center justify-between text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)] py-1 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            <span>{isExpanded ? 'Nascondi Dettaglio Fattori' : 'Come viene calcolato il tuo indice?'}</span>
          </span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {isExpanded && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3 animate-in fade-in duration-200">
            {/* 1. Costanza Sedute (40%) */}
            <div className="p-3 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-border)] space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-[var(--color-text)] flex items-center gap-1.5">
                  <Dumbbell className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                  <span>Costanza (40%)</span>
                </span>
                <span className="font-mono font-bold text-[var(--color-primary)]">{pillars.workouts.score}%</span>
              </div>
              <div className="h-1.5 w-full bg-[var(--color-surface)] rounded-full overflow-hidden">
                <div className="h-full bg-[var(--color-primary)] rounded-full" style={{ width: `${pillars.workouts.score}%` }} />
              </div>
              <span className="text-[11px] text-[var(--color-text-muted)] block">{pillars.workouts.label}</span>
            </div>

            {/* 2. Compilazione Serie (30%) */}
            <div className="p-3 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-border)] space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-[var(--color-text)] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Compilazione Serie (30%)</span>
                </span>
                <span className="font-mono font-bold text-emerald-400">{pillars.sets.score}%</span>
              </div>
              <div className="h-1.5 w-full bg-[var(--color-surface)] rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pillars.sets.score}%` }} />
              </div>
              <span className="text-[11px] text-[var(--color-text-muted)] block">{pillars.sets.label}</span>
            </div>

            {/* 3. Feedback & RPE (20%) */}
            <div className="p-3 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-border)] space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-[var(--color-text)] flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                  <span>Feedback & RPE (20%)</span>
                </span>
                <span className="font-mono font-bold text-purple-400">{pillars.feedback.score}%</span>
              </div>
              <div className="h-1.5 w-full bg-[var(--color-surface)] rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${pillars.feedback.score}%` }} />
              </div>
              <span className="text-[11px] text-[var(--color-text-muted)] block">{pillars.feedback.detail}</span>
            </div>

            {/* 4. Check-in & Anamnesi (10%) */}
            <div className="p-3 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-border)] space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-[var(--color-text)] flex items-center gap-1.5">
                  <ClipboardCheck className="w-3.5 h-3.5 text-sky-400" />
                  <span>Check-in (10%)</span>
                </span>
                <span className="font-mono font-bold text-sky-400">{pillars.checkins.score}%</span>
              </div>
              <div className="h-1.5 w-full bg-[var(--color-surface)] rounded-full overflow-hidden">
                <div className="h-full bg-sky-500 rounded-full" style={{ width: `${pillars.checkins.score}%` }} />
              </div>
              <span className="text-[11px] text-[var(--color-text-muted)] block">{pillars.checkins.label}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
