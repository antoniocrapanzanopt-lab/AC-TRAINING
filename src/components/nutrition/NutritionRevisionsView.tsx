import React from 'react';
import {
  History,
  Calendar,
  User,
  FileText,
  Clock,
} from 'lucide-react';
import { NutritionPlan } from '../../types/nutrition';

interface NutritionRevisionsViewProps {
  plan?: NutritionPlan;
}

export const NutritionRevisionsView: React.FC<NutritionRevisionsViewProps> = ({ plan }) => {
  const revisions = plan?.revisions || [];

  if (!plan) {
    return (
      <div className="p-8 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] text-center space-y-2">
        <History className="w-8 h-8 text-slate-600 mx-auto" />
        <p className="text-sm font-bold text-slate-400">Nessun piano nutrizionale attivo selezionato.</p>
      </div>
    );
  }

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
            <History className="w-4 h-4 text-[var(--color-primary)]" />
            Storico Revisioni & Modifiche Piano
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Tracciamento trasparente di tutte le variazioni apportate ai target calorici e macronutrienti.
          </p>
        </div>
        <span className="text-xs font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-3 py-1 rounded-full border border-[var(--color-primary)]/30">
          {revisions.length} revision{revisions.length === 1 ? 'e' : 'i'}
        </span>
      </div>

      {/* Target Attuali In Sintesi */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
            Target Attualmente in Vigore
          </span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-xl font-black text-white">{plan.targetKcal} kcal</span>
            <span className="text-xs text-slate-400">
              (P: {plan.proteinGrams}g • C: {plan.carbGrams}g • F: {plan.fatGrams}g)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <span>Inizio: {plan.startDate}</span>
          {plan.reviewDate && <span>• Prossima revisione: {plan.reviewDate}</span>}
        </div>
      </div>

      {revisions.length === 0 ? (
        <div className="py-8 text-center space-y-2">
          <History className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-sm font-bold text-slate-400">Nessuna revisione registrata per questo piano.</p>
          <p className="text-xs text-slate-500">
            Ogni modifica ai macronutrienti o alle calorie genererà automaticamente una nuova voce con la motivazione.
          </p>
        </div>
      ) : (
        <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-800">
          {revisions.map((rev) => {
            const kcalDelta = rev.newValues.targetKcal - rev.oldValues.targetKcal;
            const pDelta = rev.newValues.proteinGrams - rev.oldValues.proteinGrams;
            const cDelta = rev.newValues.carbGrams - rev.oldValues.carbGrams;
            const fDelta = rev.newValues.fatGrams - rev.oldValues.fatGrams;

            return (
              <div key={rev.id} className="relative pl-9 space-y-2">
                {/* Dot timeline */}
                <div className="absolute left-1.5 top-1.5 w-4 h-4 rounded-full bg-[var(--color-primary)]/20 border-2 border-[var(--color-primary)] flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]" />
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-md">
                  {/* Header Revisione */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white">{rev.reason}</span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {new Date(rev.date).toLocaleDateString('it-IT')} {new Date(rev.date).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="flex items-center gap-1 font-bold text-slate-300">
                        <User className="w-3 h-3 text-[var(--color-primary)]" />
                        {rev.author}
                      </span>
                    </div>
                  </div>

                  {/* Confronto Vecchi vs Nuovi Valori */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Valori Precedenti */}
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                        Valori Precedenti
                      </span>
                      <div className="text-sm font-black text-slate-300">
                        {rev.oldValues.targetKcal} kcal
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span>P: {rev.oldValues.proteinGrams}g</span>
                        <span>•</span>
                        <span>C: {rev.oldValues.carbGrams}g</span>
                        <span>•</span>
                        <span>F: {rev.oldValues.fatGrams}g</span>
                      </div>
                    </div>

                    {/* Nuovi Valori */}
                    <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-700/80 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide block">
                          Nuovi Target
                        </span>
                        {kcalDelta !== 0 && (
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                            kcalDelta > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-sky-500/10 text-sky-400'
                          }`}>
                            {kcalDelta > 0 ? `+${kcalDelta}` : kcalDelta} kcal
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-black text-white">
                        {rev.newValues.targetKcal} kcal
                      </div>
                      <div className="text-[11px] text-slate-300 flex items-center gap-2 font-medium">
                        <span className={pDelta !== 0 ? 'text-cyan-400 font-bold' : ''}>
                          P: {rev.newValues.proteinGrams}g {pDelta !== 0 && `(${pDelta > 0 ? '+' : ''}${pDelta})`}
                        </span>
                        <span>•</span>
                        <span className={cDelta !== 0 ? 'text-amber-400 font-bold' : ''}>
                          C: {rev.newValues.carbGrams}g {cDelta !== 0 && `(${cDelta > 0 ? '+' : ''}${cDelta})`}
                        </span>
                        <span>•</span>
                        <span className={fDelta !== 0 ? 'text-rose-400 font-bold' : ''}>
                          F: {rev.newValues.fatGrams}g {fDelta !== 0 && `(${fDelta > 0 ? '+' : ''}${fDelta})`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Note Coach associate alla revisione */}
                  {rev.coachNote && (
                    <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800 text-xs text-slate-300 italic flex items-start gap-2">
                      <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                      <span>"{rev.coachNote}"</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
