import React, { useState, useEffect } from 'react';
import { Sparkles, ChevronUp, ChevronDown, Terminal, Clock, Key, Cpu } from 'lucide-react';
import {
  subscribeToAIDiagnostics,
  AIDiagnosticInfo,
  getGeminiRuntimeConfig,
  setGeminiApiKey,
  clearGeminiApiKey,
} from '../../lib/ai/geminiClient';

interface AIDiagnosticPanelProps {
  className?: string;
  compact?: boolean;
}

export const AIDiagnosticPanel: React.FC<AIDiagnosticPanelProps> = ({ className = '', compact = false }) => {
  const [diag, setDiag] = useState<AIDiagnosticInfo>({
    provider: 'gemini',
    model: 'gemini-2.0-flash',
    apiKeyStatus: 'missing',
    apiKeyMasked: 'NON PRESENTE',
    lastCallStatus: 'idle',
  });

  const [isOpen, setIsOpen] = useState(false);
  const [inputKey, setInputKey] = useState('');
  const runtimeConfig = getGeminiRuntimeConfig();

  useEffect(() => {
    return subscribeToAIDiagnostics((info) => {
      setDiag(info);
    });
  }, []);

  const isConfigured = diag.apiKeyStatus !== 'missing' || Boolean(runtimeConfig.apiKey);
  const activeModel = runtimeConfig.model || diag.model;

  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-2.5 py-1 bg-slate-900/80 border border-slate-800 rounded-lg text-[11px] ${className}`}>
        <div className="flex items-center gap-1.5 font-mono">
          <span className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <span className="text-slate-300 font-bold">AI Gateway:</span>
          <span className="text-[var(--color-primary)] font-bold">{activeModel}</span>
        </div>
        <span className="text-slate-600">|</span>
        <span className="text-slate-400">
          Key: <span className={isConfigured ? 'text-emerald-400' : 'text-amber-400'}>{runtimeConfig.maskedKey}</span>
        </span>
        <span className="text-slate-600">|</span>
        <span className="text-slate-400">
          Fallback Silenzioso: <span className="text-emerald-400 font-bold">DISABILITATO</span>
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
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
            isConfigured ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
          }`}>
            {isConfigured ? 'LIVE GEMINI' : 'SERVER ROUTE'}
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

            <div className="p-2 rounded-lg bg-slate-900/50 border border-slate-800/60 flex items-start gap-2">
              <Key className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="text-[10px] uppercase text-slate-500 block font-bold">Stato API Key</span>
                <span className={`font-bold ${isConfigured ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {runtimeConfig.apiKey ? 'Google Gemini API (Attiva)' : 'Non Rilevata (Richiesta Chiave)'}
                </span>
                <span className="text-slate-400 block text-[11px]">{runtimeConfig.maskedKey}</span>
              </div>
            </div>
          </div>

          {/* Sezione Gestione Rapida Chiave API Gemini */}
          <div className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-bold text-[11px]">Chiave API Google Gemini (Google AI Studio)</span>
              {runtimeConfig.apiKey && (
                <button
                  type="button"
                  onClick={() => {
                    clearGeminiApiKey();
                    setInputKey('');
                  }}
                  className="text-[10px] text-rose-400 hover:text-rose-300 underline cursor-pointer"
                >
                  Rimuovi
                </button>
              )}
            </div>
            <div className="flex gap-1.5">
              <input
                type="password"
                placeholder={runtimeConfig.apiKey ? "Chiave configurata (incolla per sovrascrivere)" : "Incolla qui la chiave AQ.Ab8..."}
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                className="flex-1 px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[var(--color-primary)] font-mono"
              />
              <button
                type="button"
                onClick={() => {
                  if (inputKey.trim()) {
                    setGeminiApiKey(inputKey.trim());
                    setInputKey('');
                  }
                }}
                disabled={!inputKey.trim()}
                className="px-3 py-1.5 bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-40 text-black font-bold rounded text-xs transition cursor-pointer"
              >
                Salva
              </button>
            </div>
            <p className="text-[10px] text-slate-500">
              La chiave viene salvata in modo sicuro nel browser per le chiamate dirette all'API Gemini.
            </p>
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
