import React, { useState } from 'react';
import { Palette, Check, RefreshCw, Sparkles, Sliders, Layers, Save, Play } from 'lucide-react';
import { useTheme, THEME_PRESETS, hexToRgb } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';

export const ThemeCustomizer: React.FC = () => {
  const { primaryHex, savedHex, applySessionTheme, saveTheme, resetThemeToDefault } = useTheme();
  const { showSuccess, showInfo } = useToast();
  
  // Colore in Anteprima (Bozza locale)
  const [selectedHex, setSelectedHex] = useState<string>(primaryHex);

  const previewRgb = hexToRgb(selectedHex);

  const handleSelectPreset = (hex: string) => {
    setSelectedHex(hex);
  };

  const handleCustomHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSelectedHex(val);
  };

  const handleCustomColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSelectedHex(val);
  };

  // 1. Applica alla sessione corrente
  const handleApplySession = () => {
    applySessionTheme(selectedHex);
    showInfo('Tema applicato alla sessione', 'La tinta è ora attiva in memoria per la sessione corrente.');
  };

  // 2. Salva in modo permanente
  const handleSavePermanent = () => {
    saveTheme(selectedHex);
    showSuccess('Tema salvato con successo!', 'La tinta scelta è stata salvata e rimarrà attiva anche dopo il ricaricamento.');
  };

  // 3. Ripristina predefiniti
  const handleResetDefault = () => {
    resetThemeToDefault();
    setSelectedHex('#eab308');
    showSuccess('Tema ripristinato', 'È stato ripristinato il Giallo Oro predefinito (#eab308).');
  };

  const isAppliedToSession = primaryHex.toLowerCase() === selectedHex.toLowerCase();
  const isSavedPermanently = savedHex.toLowerCase() === selectedHex.toLowerCase();

  return (
    <div className="p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-6">
      
      {/* Header Sezione */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/30">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Personalizzazione Cromatica & Tema Live</h3>
            <p className="text-xs text-slate-400">Modifica l'anteprima, applica alla sessione o salva in modo permanente</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefault}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-bold text-slate-400 hover:text-white transition-all cursor-pointer"
            title="Ripristina il tema Giallo Oro AC predefinito"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Ripristina Predefiniti</span>
          </button>
        </div>
      </div>

      {/* Preset Cromatici Pronti */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            Palette Predefinite (Seleziona per l'anteprima)
          </label>
          <span className="text-[11px] text-slate-400">
            Anteprima attiva: <strong className="font-mono text-white">{selectedHex.toUpperCase()}</strong>
          </span>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {THEME_PRESETS.map((preset) => {
            const isSelected = selectedHex.toLowerCase() === preset.hex.toLowerCase();
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset.hex)}
                className={`p-3 rounded-2xl border transition-all text-left flex flex-col justify-between h-24 relative overflow-hidden group cursor-pointer ${
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
                value={selectedHex}
                onChange={handleCustomColorPickerChange}
                className="absolute -top-2 -left-2 w-16 h-14 cursor-pointer"
              />
            </div>
            
            <input
              type="text"
              value={selectedHex}
              onChange={handleCustomHexChange}
              placeholder="#eab308"
              className="flex-1 px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono font-bold text-white uppercase focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>
        </div>

        {/* Info Valori RGB Generati */}
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Stato Tinte & Sincronizzazione</span>
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-300">In Anteprima:</span>
            <span className="font-bold text-white px-2 py-0.5 rounded border border-slate-700 bg-slate-800">
              {selectedHex.toUpperCase()} (rgb: {previewRgb})
            </span>
          </div>
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-300">Salvato Permanente:</span>
            <span className="font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded border border-[var(--color-primary)]/20">
              {savedHex.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Anteprima Live dell'Interfaccia con la Tinta Selezionata */}
      <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3">
        <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
          <Layers className="w-3.5 h-3.5" style={{ color: selectedHex }} />
          Anteprima Componenti Live con Tinta: <span className="font-mono text-white ml-1">{selectedHex.toUpperCase()}</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Componente 1: Pulsante Attivo in Anteprima */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Pulsante Azione Principale</span>
            <button 
              type="button" 
              className="w-full py-2 text-black font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1"
              style={{ backgroundColor: selectedHex }}
            >
              <span>Pulsante Attivo</span>
            </button>
          </div>

          {/* Componente 2: Badge & Accenti in Anteprima */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Badge Status & Accenti</span>
            <div className="flex items-center gap-2">
              <span 
                className="px-2.5 py-1 rounded-lg text-xs font-bold border"
                style={{ 
                  backgroundColor: `rgba(${previewRgb}, 0.15)`, 
                  color: selectedHex, 
                  borderColor: `rgba(${previewRgb}, 0.3)` 
                }}
              >
                Badge Attivo
              </span>
              <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: selectedHex }}></span>
            </div>
          </div>

          {/* Componente 3: Tab Navigazione in Anteprima */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Navigazione Sidebar / Tab</span>
            <div 
              className="px-3 py-1.5 rounded-lg text-black font-extrabold text-xs flex items-center justify-between"
              style={{ backgroundColor: selectedHex }}
            >
              <span>Dashboard / Workout</span>
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
          </div>
        </div>
      </div>

      {/* Barra di Azioni: Applica alla Sessione & Salva */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-slate-800">
        <button
          type="button"
          onClick={handleApplySession}
          disabled={isAppliedToSession}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all cursor-pointer"
        >
          <Play className="w-4 h-4 text-sky-400" />
          <span>{isAppliedToSession ? 'Applicato alla sessione' : 'Applica alla Sessione'}</span>
        </button>

        <button
          type="button"
          onClick={handleSavePermanent}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all shadow-[0_0_20px_rgba(234,179,8,0.2)] flex items-center justify-center gap-2 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{isSavedPermanently ? 'Tema Salvato (Predefinito)' : 'Salva Tema Definitivo'}</span>
        </button>
      </div>

    </div>
  );
};
