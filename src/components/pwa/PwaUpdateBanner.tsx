import React from 'react';
import { Sparkles, RefreshCw, X, ArrowUpRight, AlertTriangle, ShieldCheck } from 'lucide-react';
import { usePwaUpdate } from '../../context/PwaUpdateContext';

export const PwaUpdateBanner: React.FC = () => {
  const { hasUpdate, isUpdating, hasUnsavedChanges, updateNow, dismissUpdate } = usePwaUpdate();

  if (!hasUpdate) return null;

  const handleUpdateClick = () => {
    if (hasUnsavedChanges) {
      return;
    }
    updateNow();
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-md z-[99999] animate-in fade-in slide-in-from-bottom-5 duration-300 pointer-events-auto"
    >
      <div className="bg-[#0b0f19]/95 backdrop-blur-md border border-[var(--color-primary)]/40 shadow-2xl shadow-black/80 rounded-2xl p-4 text-slate-100 ring-1 ring-[var(--color-primary)]/20">
        <div className="flex items-start gap-3">
          {/* Icona */}
          <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30 flex items-center justify-center shrink-0 text-[var(--color-primary)] mt-0.5">
            {isUpdating ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : hasUnsavedChanges ? (
              <AlertTriangle className="w-5 h-5 text-amber-400 animate-pulse" />
            ) : (
              <Sparkles className="w-5 h-5 animate-pulse" />
            )}
          </div>

          {/* Testo */}
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-slate-100 tracking-tight">
                Nuova versione disponibile
              </h4>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--color-primary)]/20 text-[var(--color-primary)]">
                PWA Update
              </span>
            </div>

            {hasUnsavedChanges ? (
              <div className="mt-1.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                <span>
                  <strong>Modifiche non salvate:</strong> Salva la scheda, check-in o form in corso prima di applicare l'aggiornamento.
                </span>
              </div>
            ) : (
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                È disponibile un aggiornamento con nuove funzionalità. Puoi aggiornare ora in totale sicurezza.
              </p>
            )}

            {/* Pulsanti */}
            <div className="flex items-center gap-2.5 mt-3">
              <button
                type="button"
                onClick={handleUpdateClick}
                disabled={isUpdating}
                className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  hasUnsavedChanges
                    ? 'bg-slate-800 text-amber-300 border border-amber-500/30 hover:bg-slate-700'
                    : 'bg-[var(--color-primary)] text-black hover:opacity-90 shadow-[var(--color-primary)]/20'
                }`}
                title={hasUnsavedChanges ? 'Salva prima le modifiche' : 'Aggiorna ora'}
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Aggiornamento...</span>
                  </>
                ) : hasUnsavedChanges ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>Salva per aggiornare</span>
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Aggiorna ora</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={dismissUpdate}
                disabled={isUpdating}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 active:scale-95 transition-all cursor-pointer"
              >
                Più tardi
              </button>
            </div>
          </div>

          {/* Tasto chiusura */}
          <button
            type="button"
            onClick={dismissUpdate}
            disabled={isUpdating}
            className="text-slate-500 hover:text-slate-300 p-1 rounded-lg hover:bg-slate-800/50 transition-colors shrink-0 cursor-pointer"
            aria-label="Chiudi avviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
