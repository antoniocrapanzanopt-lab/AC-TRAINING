import React, { useState, useEffect } from 'react';
import { 
  Palette, 
  Check, 
  RefreshCw, 
  Sparkles, 
  Sliders, 
  Save, 
  Play, 
  Undo2, 
  Moon, 
  Sun, 
  Laptop, 
  ShieldCheck, 
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { useTheme, THEME_PRESETS, hexToRgb } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { ThemeMode } from '../../types';

export const ThemeCustomizer: React.FC = () => {
  const {
    mode,
    effectiveTheme,
    accentColor,
    savedPreferences,
    hasUnsavedChanges,
    contrastResult,
    previewAccent,
    previewMode,
    applySessionTheme,
    savePreferences,
    cancelPreview,
    resetThemeToDefault,
  } = useTheme();

  const { showSuccess, showInfo, showError } = useToast();

  // Stato bozza locale
  const [draftMode, setDraftMode] = useState<ThemeMode>(mode);
  const [draftAccent, setDraftAccent] = useState<string>(accentColor);
  const [hexInputText, setHexInputText] = useState<string>(accentColor);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState<boolean>(false);

  // Sincronizza lo stato bozza quando il tema attivo cambia dall'esterno
  useEffect(() => {
    setDraftMode(mode);
    setDraftAccent(accentColor);
    setHexInputText(accentColor);
  }, [mode, accentColor]);

  const draftRgb = hexToRgb(draftAccent);

  // ─── HANDLERS MODALITÀ & PALETTE ──────────────────────────────────────────

  const handleSelectMode = (newMode: ThemeMode) => {
    setDraftMode(newMode);
    previewMode(newMode);
  };

  const handleSelectPreset = (presetAccent: string) => {
    setDraftAccent(presetAccent);
    setHexInputText(presetAccent);
    previewAccent(presetAccent);
  };

  const handleCustomColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDraftAccent(val);
    setHexInputText(val);
    previewAccent(val);
  };

  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    setHexInputText(rawVal);

    let formatted = rawVal.trim();
    if (!formatted.startsWith('#')) {
      formatted = '#' + formatted;
    }

    if (/^#[0-9A-Fa-f]{6}$/.test(formatted)) {
      setDraftAccent(formatted);
      previewAccent(formatted);
    }
  };

  // ─── AZIONI DI PERSISTENZA ────────────────────────────────────────────────

  const handleApplySession = () => {
    applySessionTheme(draftAccent, draftMode);
    showInfo('Tema applicato alla sessione', 'La tinta e la modalità sono attive in memoria per la sessione corrente.');
  };

  const handleSavePermanent = () => {
    if (!/^#[0-9A-Fa-f]{6}$/.test(draftAccent)) {
      showError('Codice colore non valido', 'Inserisci un codice HEX a 6 cifre valido (es. #EAB308).');
      return;
    }

    savePreferences({
      mode: draftMode,
      accentColor: draftAccent,
    });
    showSuccess('Tema salvato definitivamente!', 'Le preferenze sono state salvate e rimarranno attive su tutti i dispositivi e dopo ogni reload.');
  };

  const handleCancelChanges = () => {
    cancelPreview();
    setDraftMode(savedPreferences.mode);
    setDraftAccent(savedPreferences.accentColor);
    setHexInputText(savedPreferences.accentColor);
    showInfo('Modifiche annullate', 'Ripristinato il tema salvato nel profilo.');
  };

  const handleConfirmResetDefault = () => {
    resetThemeToDefault();
    setDraftMode('dark');
    setDraftAccent('#eab308');
    setHexInputText('#eab308');
    setShowResetConfirmModal(false);
    showSuccess('Tema predefinito ripristinato', 'È stato ripristinato e salvato il tema Oro AC Scuro (#EAB308).');
  };

  const isSavedMatch = 
    savedPreferences.mode === draftMode && 
    savedPreferences.accentColor.toLowerCase() === draftAccent.toLowerCase();

  return (
    <div className="p-6 rounded-3xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-2xl space-y-8 animate-fadeIn">
      
      {/* ─── HEADER SEZIONE & AZIONE RESET ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-panel-border)] pb-5">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] border border-[var(--color-primary)]/30 shadow-inner">
            <Palette className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
              Colori & Tema Live <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-[var(--color-primary-soft)] text-[var(--color-primary)] border border-[var(--color-primary)]/20">AC Engine v2</span>
            </h3>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              Personalizza l'aspetto grafico, le tinte e la modalità scura/chiara con anteprima istantanea e persistenza garantita.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowResetConfirmModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-bold text-slate-400 hover:text-white transition-all cursor-pointer shadow-sm"
            title="Ripristina il tema Oro AC Scuro predefinito"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Ripristina Predefiniti</span>
          </button>
        </div>
      </div>

      {/* ─── LIVE STATUS & NOTIFICA MODIFICHE NON SALVATE ───────────────────── */}
      <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-inner">
        <div className="flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full shrink-0 ${hasUnsavedChanges ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
          <div className="text-xs">
            <span className="font-bold text-white">
              {hasUnsavedChanges ? 'Anteprima Live Attiva (Modifiche non salvate)' : 'Tema Sincronizzato & Salvato'}
            </span>
            <span className="text-[11px] text-slate-400 block font-mono">
              Modalità: <strong className="text-slate-200 capitalize">{draftMode}</strong> ({effectiveTheme === 'dark' ? 'Scuro' : 'Chiaro'}) • Accento: <strong className="text-[var(--color-primary)]">{draftAccent.toUpperCase()}</strong> (rgb: {draftRgb})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasUnsavedChanges ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-black bg-amber-500/15 text-amber-300 border border-amber-500/30">
              <Sparkles className="w-3.5 h-3.5" /> Bozza in corso
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Check className="w-3.5 h-3.5" /> Salvato nel profilo
            </span>
          )}
        </div>
      </div>

      {/* ─── LIVELLO 1: ASPETTO GENERALE (SCURO / CHIARO / SISTEMA) ─────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black text-slate-200 flex items-center gap-2 uppercase tracking-wider">
            <Moon className="w-4 h-4 text-[var(--color-primary)]" />
            1. Modalità Display & Aspetto Generale
          </label>
          <span className="text-[11px] text-slate-400">
            Attivo: <strong className="text-white capitalize">{draftMode === 'system' ? `Sistema (${effectiveTheme})` : draftMode}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Opzione 1: Scuro */}
          <button
            type="button"
            onClick={() => handleSelectMode('dark')}
            className={`p-4 rounded-2xl border transition-all text-left flex items-center justify-between group cursor-pointer ${
              draftMode === 'dark'
                ? 'bg-slate-900 border-[var(--color-primary)] ring-2 ring-[var(--color-focus)] shadow-lg'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl border ${draftMode === 'dark' ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)] border-[var(--color-primary)]/30' : 'bg-slate-900 text-slate-400 border-slate-800'}`}>
                <Moon className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-extrabold text-white block">Tema Scuro</span>
                <span className="text-[11px] text-slate-400 block">Identità AC Coaching</span>
              </div>
            </div>
            {draftMode === 'dark' && <Check className="w-4 h-4 text-[var(--color-primary)]" />}
          </button>

          {/* Opzione 2: Chiaro */}
          <button
            type="button"
            onClick={() => handleSelectMode('light')}
            className={`p-4 rounded-2xl border transition-all text-left flex items-center justify-between group cursor-pointer ${
              draftMode === 'light'
                ? 'bg-slate-900 border-[var(--color-primary)] ring-2 ring-[var(--color-focus)] shadow-lg'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl border ${draftMode === 'light' ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)] border-[var(--color-primary)]/30' : 'bg-slate-900 text-slate-400 border-slate-800'}`}>
                <Sun className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-extrabold text-white block">Tema Chiaro</span>
                <span className="text-[11px] text-slate-400 block">Ambiente illuminato</span>
              </div>
            </div>
            {draftMode === 'light' && <Check className="w-4 h-4 text-[var(--color-primary)]" />}
          </button>

          {/* Opzione 3: Sistema */}
          <button
            type="button"
            onClick={() => handleSelectMode('system')}
            className={`p-4 rounded-2xl border transition-all text-left flex items-center justify-between group cursor-pointer ${
              draftMode === 'system'
                ? 'bg-slate-900 border-[var(--color-primary)] ring-2 ring-[var(--color-focus)] shadow-lg'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl border ${draftMode === 'system' ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)] border-[var(--color-primary)]/30' : 'bg-slate-900 text-slate-400 border-slate-800'}`}>
                <Laptop className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-extrabold text-white block">Sistema OS</span>
                <span className="text-[11px] text-slate-400 block">Adatta automaticamente</span>
              </div>
            </div>
            {draftMode === 'system' && <Check className="w-4 h-4 text-[var(--color-primary)]" />}
          </button>
        </div>
      </div>

      {/* ─── LIVELLO 2: PALETTE BRAND AC COACHING ──────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black text-slate-200 flex items-center gap-2 uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-[var(--color-primary)]" />
            2. Palette Colori Brand AC Coaching
          </label>
          <span className="text-[11px] text-slate-400">
            Seleziona per anteprima immediata
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {THEME_PRESETS.map((preset) => {
            const isSelected = draftAccent.toLowerCase() === preset.accent.toLowerCase();
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset.accent)}
                className={`p-3 rounded-2xl border transition-all text-left flex flex-col justify-between h-28 relative overflow-hidden group cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 border-[var(--color-primary)] shadow-xl scale-105 ring-2 ring-[var(--color-focus)]'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                {/* Visual Swatch Pill */}
                <div className="flex items-center justify-between">
                  <div
                    className="w-8 h-8 rounded-xl shadow-md border border-white/20 flex items-center justify-center transition-transform group-hover:scale-110"
                    style={{ backgroundColor: preset.accent }}
                  >
                    {isSelected && <Check className="w-4 h-4 text-black font-black" />}
                  </div>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-ping" />
                  )}
                </div>

                <div>
                  <span className="text-[11px] font-black text-white block line-clamp-1">{preset.name}</span>
                  <span className="text-[9px] font-mono text-slate-400 block">{preset.accent}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── LIVELLO 3: SELETTORE MANUALE & ANALISI CONTRASTO WCAG ──────────── */}
      <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
        
        {/* Input HEX & Picker */}
        <div className="space-y-2.5">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
            <Sliders className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            Colore Personalizzato (Color Picker & HEX)
          </label>
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-11 rounded-xl overflow-hidden border border-slate-700 shrink-0 cursor-pointer shadow-md">
              <input
                type="color"
                value={draftAccent}
                onChange={handleCustomColorPickerChange}
                className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer"
                title="Scegli colore con il selettore cromatico"
              />
            </div>
            
            <div className="relative flex-1">
              <input
                type="text"
                value={hexInputText}
                onChange={handleHexInputChange}
                placeholder="#EAB308"
                maxLength={7}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono font-bold text-white uppercase focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-focus)]"
              />
            </div>
          </div>
        </div>

        {/* Analisi Accessibilità e Contrasto WCAG */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[var(--color-primary)]" />
              Accessibilità & Contrasto WCAG 2.1
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
              contrastResult.score === 'AAA' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
              contrastResult.score === 'AA' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' :
              contrastResult.score === 'AA Large' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
              'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}>
              Rating: {contrastResult.score} ({contrastResult.ratio}:1)
            </span>
          </div>

          <p className="text-[11px] text-slate-300 flex items-center gap-1.5">
            {contrastResult.isAccessible ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span>{contrastResult.message}</span>
          </p>
        </div>
      </div>

      {/* ─── LIVELLO 4: BARRA DI AZIONI FINALI ──────────────────────────────── */}
      <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3.5 border-t border-[var(--color-panel-border)]">
        <div>
          {hasUnsavedChanges && (
            <button
              type="button"
              onClick={handleCancelChanges}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-2 border border-slate-800 transition-all cursor-pointer shadow-sm"
              title="Annulla l'anteprima e ripristina il tema salvato"
            >
              <Undo2 className="w-4 h-4 text-slate-400" />
              <span>Annulla Modifiche ({savedPreferences.accentColor.toUpperCase()})</span>
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleApplySession}
            disabled={!hasUnsavedChanges}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all cursor-pointer"
            title="Applica alla sessione corrente senza scrivere su disco permanente"
          >
            <Play className="w-4 h-4 text-sky-400" />
            <span>Applica alla Sessione</span>
          </button>

          <button
            type="button"
            onClick={handleSavePermanent}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all shadow-lg shadow-[var(--color-primary-soft)] flex items-center justify-center gap-2 cursor-pointer"
            title="Salva le modifiche in modo definitivo in memoria"
          >
            <Save className="w-4 h-4" />
            <span>{isSavedMatch ? 'Tema Salvato (Predefinito)' : 'Salva Tema Definitivo'}</span>
          </button>
        </div>
      </div>

      {/* ─── MODALE CONFERMA RIPRISTINO PREDEFINITI ─────────────────────────── */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-black text-white">Ripristino Tema Predefinito</h4>
                <p className="text-xs text-slate-400">Vuoi reimpostare il tema istituzionale AC Coaching?</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
              Verrà ripristinata la modalità <strong>Scuro</strong> con il colore brand <strong>Giallo Oro AC (#EAB308)</strong> e salvata come preferenza permanente.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white border border-slate-800 hover:bg-slate-800 transition-colors"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleConfirmResetDefault}
                className="px-5 py-2.5 rounded-xl bg-amber-500 text-black font-black text-xs hover:bg-amber-400 transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Conferma Ripristino</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
