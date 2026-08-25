import React, { useState, useEffect } from 'react';
import {
  Sun,
  Moon,
  Check,
  Sparkles,
  Sliders,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { ThemeMode } from '../../types';

export const AthleteSettingsView: React.FC = () => {
  const {
    mode,
    effectiveTheme,
    accentColor,
    previewMode,
    savePreferences,
  } = useTheme();

  const { showSuccess } = useToast();

  const [selectedMode, setSelectedMode] = useState<ThemeMode>(
    mode === 'light' ? 'light' : 'dark'
  );

  useEffect(() => {
    setSelectedMode(mode === 'light' ? 'light' : 'dark');
  }, [mode]);

  // Gestione cambio tema istantaneo e salvataggio automatico (Solo Chiaro / Scuro)
  const handleModeChange = (newMode: 'dark' | 'light') => {
    setSelectedMode(newMode);
    previewMode(newMode);
    savePreferences({
      mode: newMode,
      accentColor: accentColor || '#eab308',
    });
    const label = newMode === 'dark' ? 'Tema Scuro 🌙' : 'Tema Chiaro ☀️';
    showSuccess('Aspetto Aggiornato', `Hai attivato il ${label}.`);
  };

  const isLight = effectiveTheme === 'light';

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-12 animate-in fade-in duration-200">
      
      {/* ─── HEADER IMPOSTAZIONI ATLETA ─── */}
      <div className="p-6 rounded-3xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/30 flex items-center justify-center shadow-inner shrink-0">
          <Sliders className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-black text-[var(--color-text)] tracking-tight">
            Impostazioni & Aspetto
          </h2>
          <p className="text-xs text-[var(--color-text-muted)]">
            Scegli se utilizzare l'applicazione in modalità chiara o scura.
          </p>
        </div>
      </div>

      {/* ─── SELEZIONE MODALITÀ: SOLO CHIARO O SCURO ─── */}
      <div className="p-6 rounded-3xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--color-primary)]" />
            <h3 className="text-xs font-black uppercase tracking-wider text-[var(--color-text)]">
              Modalità Aspetto
            </h3>
          </div>
          <span className="text-xs font-bold text-[var(--color-text-muted)]">
            Attivo: <strong className="text-[var(--color-primary)] capitalize">{selectedMode === 'dark' ? 'Scuro 🌙' : 'Chiaro ☀️'}</strong>
          </span>
        </div>

        <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
          Seleziona il tema grafico che preferisci per consultare le tue schede e registrare gli allenamenti:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          
          {/* Opzione 1: TEMA SCURO */}
          <button
            type="button"
            onClick={() => handleModeChange('dark')}
            className={`p-5 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between min-h-[135px] ${
              selectedMode === 'dark'
                ? 'bg-slate-900 border-[var(--color-primary)] shadow-xl shadow-[var(--color-primary)]/15 ring-2 ring-[var(--color-primary)]/40'
                : isLight
                  ? 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/50'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-amber-400 shadow-inner">
                <Moon className="w-5 h-5" />
              </div>
              {selectedMode === 'dark' && (
                <span className="w-6 h-6 rounded-full bg-[var(--color-primary)] text-slate-950 flex items-center justify-center font-black shadow-md">
                  <Check className="w-4 h-4 stroke-[3]" />
                </span>
              )}
            </div>
            <div className="mt-3">
              <span className={`text-sm font-black block ${selectedMode === 'dark' ? 'text-white' : 'text-[var(--color-text)]'}`}>
                Tema Scuro
              </span>
              <span className={`text-xs block mt-0.5 ${selectedMode === 'dark' ? 'text-slate-300' : 'text-[var(--color-text-muted)]'}`}>
                Sfondo nero e antracite con finiture oro
              </span>
            </div>
          </button>

          {/* Opzione 2: TEMA CHIARO */}
          <button
            type="button"
            onClick={() => handleModeChange('light')}
            className={`p-5 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between min-h-[135px] ${
              selectedMode === 'light'
                ? isLight
                  ? 'bg-amber-500/10 border-[var(--color-primary)] shadow-xl shadow-[var(--color-primary)]/20 ring-2 ring-[var(--color-primary)]/40'
                  : 'bg-amber-500/10 border-[var(--color-primary)] shadow-xl ring-2 ring-[var(--color-primary)]/30'
                : isLight
                  ? 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/50'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-500 shadow-inner">
                <Sun className="w-5 h-5" />
              </div>
              {selectedMode === 'light' && (
                <span className="w-6 h-6 rounded-full bg-[var(--color-primary)] text-slate-950 flex items-center justify-center font-black shadow-md">
                  <Check className="w-4 h-4 stroke-[3]" />
                </span>
              )}
            </div>
            <div className="mt-3">
              <span className="text-sm font-black text-[var(--color-text)] block">
                Tema Chiaro
              </span>
              <span className="text-xs text-[var(--color-text-muted)] block mt-0.5">
                Sfondo chiaro luminoso ad alta leggibilità
              </span>
            </div>
          </button>

        </div>
      </div>

    </div>
  );
};
