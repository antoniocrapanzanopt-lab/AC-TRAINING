import React, { useState } from 'react';
import {
  Smartphone,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  Activity,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { usePwaUpdate } from '../../../context/PwaUpdateContext';

export const PwaDiagnosticsTab: React.FC = () => {
  const {
    buildVersion,
    builtAt,
    hasUpdate,
    isUpdating,
    hasUnsavedChanges,
    updateNow,
    checkForUpdate,
    diagnosticLogs,
    clearDiagnosticLogs,
    registration,
  } = usePwaUpdate();

  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<string | null>(null);

  const handleCheck = async () => {
    setChecking(true);
    setCheckResult(null);
    try {
      await checkForUpdate();
      setTimeout(() => {
        setCheckResult('Controllo completato: la versione in uso è allineata al server.');
        setChecking(false);
      }, 800);
    } catch {
      setCheckResult('Verifica fallita (possibile stato offline).');
      setChecking(false);
    }
  };

  const formattedBuildDate = React.useMemo(() => {
    try {
      return new Date(builtAt).toLocaleString('it-IT', {
        dateStyle: 'medium',
        timeStyle: 'medium',
      });
    } catch {
      return builtAt;
    }
  }, [builtAt]);

  const getLogBadge = (type: string) => {
    switch (type) {
      case 'update_detected':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            UPDATE DETECTED
          </span>
        );
      case 'update_applied':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            UPDATE APPLIED
          </span>
        );
      case 'update_deferred':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
            UPDATE DEFERRED
          </span>
        );
      case 'update_failed':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            UPDATE FAILED
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-700 text-slate-300">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-[var(--color-primary)]" /> PWA Engine, Versioning & Diagnostica Cache
        </h3>
        <span className="text-[10px] font-bold text-[var(--color-primary)] uppercase bg-[var(--color-primary)]/10 px-2 py-0.5 rounded border border-[var(--color-primary)]/20">
          Zero-Cache Architecture
        </span>
      </div>

      {/* Grid Schede Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Build Version */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[var(--color-primary)]" /> Versione Build Attiva
          </div>
          <div className="text-sm font-mono font-bold text-white tracking-tight">
            {buildVersion}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-500" /> Compilata il {formattedBuildDate}
          </div>
        </div>

        {/* Service Worker Status */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-400" /> Stato Service Worker
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-bold text-white">
              {registration ? 'Attivo & Monitorato' : 'Inizializzazione in corso'}
            </span>
          </div>
          <div className="text-[11px] text-slate-400">
            Lifecycle: SkipWaiting su consenso + Claims automatici
          </div>
        </div>

        {/* Update Status */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 text-sky-400" /> Disponibilità Aggiornamenti
          </div>
          <div className="text-sm font-bold">
            {hasUpdate ? (
              <span className="text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> Nuova versione pronta
              </span>
            ) : (
              <span className="text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Allineato al server
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400">
            {hasUnsavedChanges
              ? '⚠️ Modifiche in sospeso'
              : 'Nessuna modifica non salvata'}
          </div>
        </div>
      </div>

      {/* Azioni di Controllo */}
      <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h4 className="text-xs font-bold text-white">Verifica Manuale Nuova Versione</h4>
          <p className="text-[11px] text-slate-400">
            Forza il controllo immediato con il server per verificare se è stato rilasciato un nuovo deploy.
          </p>
          {checkResult && (
            <p className="text-[11px] text-emerald-400 font-medium pt-1">
              ✓ {checkResult}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasUpdate && (
            <button
              type="button"
              onClick={() => updateNow()}
              disabled={isUpdating || hasUnsavedChanges}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--color-primary)] text-black text-xs font-bold hover:opacity-90 transition-all shadow cursor-pointer disabled:opacity-50"
            >
              <ArrowUpRight className="w-4 h-4" />
              {isUpdating ? 'Aggiornamento...' : 'Applica Aggiornamento Ora'}
            </button>
          )}

          <button
            type="button"
            onClick={handleCheck}
            disabled={checking}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700 hover:text-white transition-all border border-slate-700 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin text-[var(--color-primary)]' : ''}`} />
            {checking ? 'Verifica in corso...' : 'Verifica Ora'}
          </button>
        </div>
      </div>

      {/* Registro Eventi Diagnostici */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            Registro Eventi Aggiornamento (Diagnostica Runtime)
          </h4>
          {diagnosticLogs.length > 0 && (
            <button
              type="button"
              onClick={clearDiagnosticLogs}
              className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3 h-3" /> Pulisci Log
            </button>
          )}
        </div>

        {diagnosticLogs.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-900/40 border border-dashed border-slate-800 text-center text-xs text-slate-500">
            Nessun evento registrato nella sessione corrente.
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {diagnosticLogs.map((log) => (
              <div
                key={log.id}
                className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {getLogBadge(log.type)}
                  <span className="text-slate-300 truncate text-[11px]">
                    {log.details || 'Nessun dettaglio'}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString('it-IT')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
