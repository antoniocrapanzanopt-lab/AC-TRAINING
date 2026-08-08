import React, { useState } from 'react';
import { Palette, Check, RefreshCw, Sparkles, Sliders, Layers } from 'lucide-react';
import { useTheme, THEME_PRESETS } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';

export const ThemeCustomizer: React.FC = () => {
  const { primaryHex, primaryRgb, setPrimaryColor, resetThemeToDefault } = useTheme();
  const { showSuccess } = useToast();
  const [customHex, setCustomHex] = useState(primaryHex);

  const handleSelectPreset = (hex: string, name: string) => {
    setCustomHex(hex);
    setPrimaryColor(hex);
    showSuccess('Tema cromatico aggiornato!', `Tinta "${name}" applicata all'intera piattaforma (Pannello & Atleta).`);
  };

  const handleCustomHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomHex(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      setPrimaryColor(val);
    }
  };

  const handleCustomColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomHex(val);
    setPrimaryColor(val);
  };

  return (
    <div className="p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-6">
      
      {/* Header Sezione */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/30">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Personalizzazione Cromatica Globale</h3>
            <p className="text-xs text-slate-400">Sincronizzazione RGB omogenea per Pannello Coach e Portale Atleta</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            resetThemeToDefault();
            setCustomHex('#eab308');
            showSuccess('Tema ripristinato', 'È stato ripristinato il Giallo Oro predefinito.');
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-bold text-slate-400 hover:text-white transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Ripristina Default</span>
        </button>
      </div>

      {/* Preset Cromatici Pronti */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-[var(--color-primary)]" />
          Palette Predefinite (1-Click)
        </label>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {THEME_PRESETS.map((preset) => {
            const isSelected = primaryHex.toLowerCase() === preset.hex.toLowerCase();
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset.hex, preset.name)}
                className={`p-3 rounded-2xl border transition-all text-left flex flex-col justify-between h-24 relative overflow-hidden group ${
                  isSelected
                    ? 'bg-slate-900 border-[var(--color-primary)] shadow-lg scale-105 ring-2 ring-[var(--color-primary)]/30'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                {/* Visual Swatch Pill */}
                <div className="flex items-center justify-between">
                  <div
                    className="w-7 h-7 rounded-xl shadow-md border border-white/20 flex items-center justify-center transition-transform group-hover:scale-110"
                    style={{ backgroundColor: preset.hex }}
                  >
                    {isSelected && <Check className="w-4 h-4 text-black font-black" />}
                  </div>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-ping" />
                  )}
                </div>

                <div>
                  <span className="text-[11px] font-bold text-white block line-clamp-1">{preset.name.split(' ')[0]}</span>
                  <span className="text-[9px] font-mono text-slate-400 block">{preset.hex}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Color Picker Manuale & Valori RGB */}
      <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
        
        {/* Input HEX & Picker */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
            <Sliders className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            Selettore Colore RGB / HEX Personalizzato
          </label>
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-10 rounded-xl overflow-hidden border border-slate-700 shrink-0 cursor-pointer shadow-md">
              <input
                type="color"
                value={customHex}
                onChange={handleCustomColorPickerChange}
                className="absolute -top-2 -left-2 w-16 h-14 cursor-pointer"
              />
            </div>
            
            <input
              type="text"
              value={customHex}
              onChange={handleCustomHexChange}
              placeholder="#eab308"
              className="flex-1 px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono font-bold text-white uppercase focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>
        </div>

        {/* Info Valori RGB Generati */}
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Codici RGB Attivi in Memory</span>
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-300">RGB:</span>
            <span className="font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded border border-[var(--color-primary)]/20">
              rgb({primaryRgb})
            </span>
          </div>
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-300">HEX principale:</span>
            <span className="font-bold text-white">{primaryHex.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* Anteprima Live dell'Interfaccia */}
      <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3">
        <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
          <Layers className="w-3.5 h-3.5 text-[var(--color-primary)]" />
          Anteprima Omogenea Componenti (Coach & Portale Atleta)
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Componente 1: Pulsante Attivo */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Pulsante Azione Principale</span>
            <button className="w-full py-2 bg-[var(--color-primary)] text-black font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1">
              <span>Pulsante Attivo</span>
            </button>
          </div>

          {/* Componente 2: Badge & Accenti */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Badge Status & Accenti</span>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/30">
                Badge Attivo
              </span>
              <span className="w-3 h-3 rounded-full bg-[var(--color-primary)] inline-block"></span>
            </div>
          </div>

          {/* Componente 3: Tab Navigazione */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Navigazione Sidebar / Tab</span>
            <div className="px-3 py-1.5 rounded-lg bg-[var(--color-primary)] text-black font-extrabold text-xs flex items-center justify-between">
              <span>Dashboard / Workout</span>
              <Check className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
