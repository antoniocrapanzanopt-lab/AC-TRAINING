import React, { useState, useEffect } from 'react';
import { Sparkles, ChevronUp, ChevronDown, Terminal, Clock, Shield, Cpu } from 'lucide-react';
import {
  subscribeToAIDiagnostics,
  AIDiagnosticInfo,
  getGeminiRuntimeConfig,
} from '../../lib/ai/geminiClient';

interface AIDiagnosticPanelProps {
  className?: string;
  compact?: boolean;
}

export const AIDiagnosticPanel: React.FC<AIDiagnosticPanelProps> = ({ className = '', compact = false }) => {
  const [diag, setDiag] = useState<AIDiagnosticInfo>({
    provider: 'gemini',
    model: 'gemini-2.0-flash',
    apiKeyStatus: 'edge_function_route',
    apiKeyMasked: 'Gestita da Supabase Edge Function (Server-Side)',
    lastCallStatus: 'idle',
  });

  const [isOpen, setIsOpen] = useState(false);
  const runtimeConfig = getGeminiRuntimeConfig();
  const activeModel = runtimeConfig.model || diag.model;

  useEffect(() => {
    return subscribeToAIDiagnostics((info) => {
      setDiag(info);
    });
  }, []);

  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-2.5 py-1 bg-slate-900/80 border border-slate-800 rounded-lg text-[11px] ${className}`}>
        <div className="flex items-center gap-1.5 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-300 font-bold">AI Gateway:</span>
          <span className="text-[var(--color-primary)] font-bold">{activeModel}</span>
        </div>
        <span className="text-slate-600">|</span>
        <span className="text-slate-400">
          Route: <span className="text-emerald-400 font-bold">Edge Function (Server-Side)</span>
        </span>
        <span className="text-slate-600">|</span>
        <span className="text-slate-400">
          Fallback: <span className="text-emerald-400 font-bold">DISABILITATO</span>
        </span>
      </div>
    );
  }

  return (
    <div className={`bg-slate-950/90 border border-slate-800/80 rounded-xl overflow-hidden shadow-lg transition-all ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 bg-slate-900/60 hover:bg-slate-900/90 flex items-center justify-between text-xs transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-purple-500/20 text-purple-400 flex items-center justify-center">
            <Sparkles className="w-3 h-3" />
          </div>
          <span className="font-bold text-slate-200">AI Diagnostic Monitor</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            EDGE FUNCTION ROUTE
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
            Modello: <strong className="text-[var(--color-primary)]">{activeModel}</strong>
          </span>
          {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-3.5 space-y-2.5 border-t border-slate-800/60 text-xs bg-slate-950/95 font-mono">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="p-2 rounded-lg bg-slate-900/50 border border-slate-800/60 flex items-start gap-2">
              <Cpu className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] uppercase text-slate-500 block font-bold">Provider & Modello</span>
                <span className="text-white font-bold">{diag.provider.toUpperCase()}</span>
                <span className="text-purple-300 block text-[11px]">{activeModel}</span>
              </div>
            </div>

            <div className="p-2 rounded-lg bg-slate-900/50 border border-emerald-800/30 flex items-start gap-2">
              <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="text-[10px] uppercase text-slate-500 block font-bold">Sicurezza API Key</span>
                <span className="font-bold text-emerald-400">
                  Gestita Server-Side (Secret Supabase)
                </span>
                <span className="text-slate-400 block text-[11px]">
                  Nessuna chiave esposta nel client o nel bundle
                </span>
              </div>
            </div>
          </div>

          {/* Nota sicurezza */}
          <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-[11px] text-emerald-300">
            <span className="font-bold">🛡️ Architettura Sicura:</span> tutte le chiamate AI passano
            esclusivamente tramite la Supabase Edge Function <code className="bg-emerald-950/60 px-1 rounded">generate-workout</code>,
            con controllo MFA AAL2, RBAC is_coach(), rate limiting e audit log.
            La chiave API è un secret server-side e non raggiunge mai il browser.
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/30 border border-slate-800/40 space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-slate-500" />
                Fallback Silenzioso:
              </span>
              <span className="text-emerald-400 font-bold">DISABILITATO (Fail-Explicit)</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Ultima Esecuzione:
              </span>
              <span className="text-slate-300">
                {diag.lastCallStatus === 'idle' ? (
                  'In attesa di richieste...'
                ) : diag.lastCallStatus === 'success' ? (
                  <span className="text-emerald-400 font-bold">
                    ✓ Success ({diag.lastCallDurationMs}ms)
                  </span>
                ) : (
                  <span className="text-rose-400 font-bold">
                    ✗ Errore ({diag.lastCallDurationMs}ms)
                  </span>
                )}
              </span>
            </div>

            {diag.lastCallTokens && (
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/40">
                <span>Token Prompt: {diag.lastCallTokens.prompt}</span>
                <span>Token Risposta: {diag.lastCallTokens.completion}</span>
              </div>
            )}

            {diag.lastCallError && (
              <div className="p-2 rounded bg-rose-950/40 border border-rose-800/50 text-rose-300 text-[10px] break-all mt-1">
                <strong>Ultimo Errore:</strong> {diag.lastCallError}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
