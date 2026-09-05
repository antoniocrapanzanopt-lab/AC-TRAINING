import React, { useState, useEffect } from 'react';
import {
  Palette,
  RotateCcw,
  Sparkles,
  Plus,
  Trash2,
  Check,
  AlertTriangle,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import { InstagramCoverData, CoverTemplateId, CoverColors } from '../../../types/cover';
import {
  hexToRgb,
  rgbToHex,
  isValidHex,
  normalizeHex,
  clampByte,
  getContrastFeedback,
  getTemplateDefaultColors,
  THEME_PRESETS,
  SWATCH_ACCENT_COLORS,
  SWATCH_BG_COLORS,
} from '../../../services/coverColorUtils';

interface CoverColorBrandingSectionProps {
  cover: InstagramCoverData;
  onChangeCover: (updater: (prev: InstagramCoverData) => InstagramCoverData) => void;
}

interface ColorTargetConfig {
  key: keyof CoverColors;
  label: string;
  shortLabel: string;
  defaultHex: string;
  isText: boolean;
  isLargeText?: boolean;
}

const COLOR_TARGETS: ColorTargetConfig[] = [
  {
    key: 'highlightColor',
    label: 'Testo Evidenziato / Riga 2 (Accento)',
    shortLabel: '⚡ Evidenziato',
    defaultHex: '#F5C518',
    isText: true,
    isLargeText: true,
  },
  {
    key: 'titleColor',
    label: 'Titolo Principale (Riga 1)',
    shortLabel: 'Titolo',
    defaultHex: '#FFFFFF',
    isText: true,
    isLargeText: true,
  },
  {
    key: 'badgeColor',
    label: 'Badge Categoria (Superiore)',
    shortLabel: 'Badge',
    defaultHex: '#F5C518',
    isText: true,
    isLargeText: false,
  },
  {
    key: 'subtitleColor',
    label: 'Sottotitolo / Gancio',
    shortLabel: 'Sottotitolo',
    defaultHex: '#E5E7EB',
    isText: true,
    isLargeText: false,
  },
  {
    key: 'handleColor',
    label: 'Handle Autore / Branding',
    shortLabel: 'Handle',
    defaultHex: '#FFFFFF',
    isText: true,
    isLargeText: false,
  },
  {
    key: 'decorativeColor',
    label: 'Bordi & Angoli Safe Area',
    shortLabel: 'Bordi Tech',
    defaultHex: '#F5C518',
    isText: false,
  },
  {
    key: 'overlayColor',
    label: 'Tonalità Sfondo & Filtro Foto',
    shortLabel: 'Sfondo Scuro',
    defaultHex: '#000000',
    isText: false,
  },
];

const LOCAL_STORAGE_SAVED_COLORS_KEY = 'ac_cover_saved_custom_colors';

export const CoverColorBrandingSection: React.FC<CoverColorBrandingSectionProps> = ({
  cover,
  onChangeCover,
}) => {
  const [activeTargetKey, setActiveTargetKey] = useState<keyof CoverColors>('highlightColor');
  const [savedCustomColors, setSavedCustomColors] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_SAVED_COLORS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_SAVED_COLORS_KEY, JSON.stringify(savedCustomColors));
    } catch (err) {
      console.warn('Impossibile salvare colori in localStorage:', err);
    }
  }, [savedCustomColors]);

  const activeConfig =
    COLOR_TARGETS.find((c) => c.key === activeTargetKey) || COLOR_TARGETS[0];

  // Risoluzione valore colore corrente
  const getColorValue = (key: keyof CoverColors, defaultHex: string): string => {
    const raw = cover[key];
    if (raw && isValidHex(raw)) return normalizeHex(raw);
    if (key === 'overlayColor') return normalizeHex(cover.darkBgColor || defaultHex);
    if (key === 'titleColor') return normalizeHex(cover.textColor || defaultHex);
    if (key === 'highlightColor' || key === 'badgeColor' || key === 'decorativeColor') {
      return normalizeHex(cover.accentColor || defaultHex);
    }
    return normalizeHex(defaultHex);
  };

  const currentColorHex = getColorValue(activeTargetKey, activeConfig.defaultHex);
  const currentRgb = hexToRgb(currentColorHex) || { r: 255, g: 255, b: 255 };

  // Aggiorna colore elemento attivo
  const handleUpdateColor = (key: keyof CoverColors, newHex: string) => {
    const normalized = normalizeHex(newHex);
    onChangeCover((prev) => {
      const updated: InstagramCoverData = {
        ...prev,
        [key]: normalized,
      };
      if (key === 'highlightColor' || key === 'badgeColor') {
        updated.accentColor = normalized;
      }
      if (key === 'titleColor') {
        updated.textColor = normalized;
      }
      if (key === 'overlayColor') {
        updated.darkBgColor = normalized;
      }
      return updated;
    });
  };

  const handleUpdateRgb = (channel: 'r' | 'g' | 'b', val: number) => {
    const clamped = clampByte(val);
    const updatedRgb = { ...currentRgb, [channel]: clamped };
    handleUpdateColor(activeTargetKey, rgbToHex(updatedRgb.r, updatedRgb.g, updatedRgb.b));
  };

  // Applica tema armonioso 1-clic
  const handleApplyTheme = (colors: CoverColors) => {
    onChangeCover((prev) => ({
      ...prev,
      ...colors,
      accentColor: colors.highlightColor,
      textColor: colors.titleColor,
      darkBgColor: colors.overlayColor,
    }));
  };

  // Applica palette ufficiale AC Coaching
  const handleApplyAcCoachingPalette = () => {
    const acColors: CoverColors = {
      badgeColor: '#F5C518',
      titleColor: '#FFFFFF',
      highlightColor: '#F5C518',
      subtitleColor: '#E5E7EB',
      handleColor: '#FFFFFF',
      overlayColor: '#000000',
      decorativeColor: '#F5C518',
    };
    onChangeCover((prev) => ({
      ...prev,
      ...acColors,
      accentColor: '#F5C518',
      textColor: '#FFFFFF',
      darkBgColor: '#000000',
    }));
  };

  // Ripristina colori template
  const handleReset = () => {
    const defaults = getTemplateDefaultColors(cover.templateId as CoverTemplateId);
    onChangeCover((prev) => ({
      ...prev,
      ...defaults,
      accentColor: defaults.highlightColor,
      textColor: defaults.titleColor,
      darkBgColor: defaults.overlayColor,
    }));
  };

  // Salva colore personalizzato
  const handleSaveColor = () => {
    if (!savedCustomColors.includes(currentColorHex)) {
      setSavedCustomColors((prev) => [currentColorHex, ...prev.slice(0, 7)]);
    }
  };

  const handleRemoveSavedColor = (hex: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedCustomColors((prev) => prev.filter((c) => c !== hex));
  };

  // Calcolo contrasto WCAG (rispetto al nero dello sfondo scuro)
  const contrast = activeConfig.isText
    ? getContrastFeedback(currentColorHex, '#05070A', activeConfig.isLargeText)
    : null;

  const BRAND_PALETTE = [
    { name: 'AC Yellow', hex: '#F5C518', rgb: 'RGB(245, 197, 24)' },
    { name: 'AC Blue', hex: '#38BDF8', rgb: 'RGB(56, 189, 248)' },
    { name: 'White', hex: '#FFFFFF', rgb: 'RGB(255, 255, 255)' },
    { name: 'Black', hex: '#000000', rgb: 'RGB(0, 0, 0)' },
  ];

  return (
    <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/90 space-y-3.5">
      
      {/* HEADER SEZIONE + PULSANTI APPLICA PALETTE & RIPRISTINO */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <Palette className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-xs font-black text-white flex items-center gap-1.5">
              Colori & Branding
              <span className="text-[9px] font-bold text-amber-400/80 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                Live Preview
              </span>
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleApplyAcCoachingPalette}
            title="Imposta la palette ufficiale: badge e highlight giallo AC, titolo bianco, sottotitolo #E5E7EB, overlay nero"
            className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 border border-amber-500/40 text-amber-300 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer shadow-sm"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Applica palette AC Coaching</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            title="Ripristina i colori originali del template selezionato"
            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
          >
            <RotateCcw className="w-3 h-3 text-slate-400" />
            <span>Ripristina colori</span>
          </button>
        </div>
      </div>

      {/* ─── 0. PALETTE BRAND CON BOTTONI RAPIDI (AC YELLOW, AC BLUE, WHITE, BLACK, + SALVA) ─── */}
      <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-[10px]">
          <span className="font-bold text-slate-300 flex items-center gap-1">
            <span>🎨 Palette Brand Ufficiale:</span>
          </span>
          <span className="text-slate-500 text-[9px] font-mono">Applica all'elemento selezionato</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {BRAND_PALETTE.map((col) => {
            const isCurrent = currentColorHex.toUpperCase() === col.hex.toUpperCase();
            return (
              <button
                key={col.hex}
                type="button"
                onClick={() => handleUpdateColor(activeTargetKey, col.hex)}
                title={`${col.name} ${col.rgb}`}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition cursor-pointer ${
                  isCurrent
                    ? 'bg-amber-500/25 border-amber-400 text-white shadow-sm ring-1 ring-amber-400/50'
                    : 'bg-slate-900 hover:bg-slate-850 border-slate-700/80 text-slate-300 hover:text-white'
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full border border-white/30 shrink-0"
                  style={{ backgroundColor: col.hex }}
                />
                <span>{col.name}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={handleSaveColor}
            title="Salva il colore attivo nella palette personalizzata"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-dashed border-amber-500/40 text-amber-300 text-[11px] font-bold transition cursor-pointer"
          >
            <Plus className="w-3 h-3 text-amber-400" />
            <span>+ Salva colore</span>
          </button>
        </div>
      </div>

      {/* ─── 1. PRESET TEMATICI ARMONIOSI (1 CLIC) ─── */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>Combinazioni Consigliate (1 Clic)</span>
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {THEME_PRESETS.map((t) => {
            const isMatch =
              getColorValue('highlightColor', '#F5C518') === t.colors.highlightColor &&
              getColorValue('titleColor', '#FFFFFF') === t.colors.titleColor;

            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleApplyTheme(t.colors)}
                className={`p-2 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                  isMatch
                    ? 'bg-amber-500/15 border-amber-500/40 shadow-sm'
                    : 'bg-slate-950/80 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full shrink-0 border border-white/20"
                    style={{ backgroundColor: t.accentColor }}
                  />
                  <span className="text-[11px] font-bold text-slate-200 truncate">
                    {t.name}
                  </span>
                </div>
                <span className="text-[9px] font-mono text-slate-400">
                  {t.badge.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── 2. SELETTORE ELEMENTO MIRATO (PILLS COME STORY STUDIO) ─── */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
          <Layers className="w-3 h-3 text-amber-400" />
          <span>Scegli Elemento da Modificare</span>
        </label>
        <div className="flex items-center gap-1.5 flex-wrap">
          {COLOR_TARGETS.map((target) => {
            const isSelected = activeTargetKey === target.key;
            const targetHex = getColorValue(target.key, target.defaultHex);

            return (
              <button
                key={target.key}
                type="button"
                onClick={() => setActiveTargetKey(target.key)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer border ${
                  isSelected
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                    : 'bg-slate-950/70 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full border border-white/30 shrink-0"
                  style={{ backgroundColor: targetHex }}
                />
                <span>{target.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── 3. PANNELLO DI CONTROLLO DELL'ELEMENTO ATTIVO ─── */}
      <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
        
        {/* TITOLO ELEMENTO + CONTRASTO WCAG */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="w-3 h-3 rounded-full border border-white/20 shrink-0"
              style={{ backgroundColor: currentColorHex }}
            />
            <span className="text-xs font-bold text-white truncate">
              {activeConfig.label}
            </span>
          </div>

          {contrast ? (
            <div
              title={`Rapporto di contrasto WCAG rispetto allo sfondo: ${contrast.ratio}:1`}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold shrink-0 border ${
                contrast.isAccessible
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
              }`}
            >
              {contrast.isAccessible ? (
                <Check className="w-2.5 h-2.5" />
              ) : (
                <AlertTriangle className="w-2.5 h-2.5" />
              )}
              <span>{contrast.label}</span>
              <span className="opacity-70 font-mono text-[8px]">({contrast.ratio}:1)</span>
            </div>
          ) : activeTargetKey === 'overlayColor' ? (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold text-slate-400 bg-slate-900 border border-slate-800">
              <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
              <span>Tono Scuro Protettivo</span>
            </div>
          ) : null}
        </div>

        {/* SWATCHES RAPIDI DIVERSIFICATI PER TESTO vs SFONDO */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
            <span>
              {activeTargetKey === 'overlayColor'
                ? 'Tonalità Sfondo Consigliate (Scure per Alto Contrasto):'
                : 'Tonalità Rapide Consigliate:'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {activeTargetKey === 'overlayColor'
              ? /* SWATCHES SOLO SCURI PER SFONDO */
                SWATCH_BG_COLORS.map((swatch) => (
                  <button
                    key={swatch.hex}
                    type="button"
                    onClick={() => handleUpdateColor('overlayColor', swatch.hex)}
                    title={`${swatch.name} (${swatch.desc})`}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-medium transition cursor-pointer ${
                      currentColorHex === swatch.hex
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full border border-white/20 shrink-0"
                      style={{ backgroundColor: swatch.hex }}
                    />
                    <span>{swatch.name}</span>
                  </button>
                ))
              : /* SWATCHES BRILLANTI PER TESTI */
                SWATCH_ACCENT_COLORS.map((swatch) => (
                  <button
                    key={swatch.hex}
                    type="button"
                    onClick={() => handleUpdateColor(activeTargetKey, swatch.hex)}
                    title={`${swatch.name} (${swatch.hex})`}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-medium transition cursor-pointer ${
                      currentColorHex === swatch.hex
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full border border-white/20 shrink-0"
                      style={{ backgroundColor: swatch.hex }}
                    />
                    <span>{swatch.name}</span>
                  </button>
                ))}

            {/* COLORI SALVATI */}
            {savedCustomColors.map((hex) => (
              <div
                key={hex}
                onClick={() => handleUpdateColor(activeTargetKey, hex)}
                title={`Colore salvato: ${hex}`}
                className="group flex items-center gap-1 px-1.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition cursor-pointer"
              >
                <span
                  className="w-3 h-3 rounded-full border border-white/20 shrink-0"
                  style={{ backgroundColor: hex }}
                />
                <span className="text-[10px] font-mono text-slate-300">{hex}</span>
                <button
                  type="button"
                  onClick={(e) => handleRemoveSavedColor(hex, e)}
                  title="Elimina"
                  className="opacity-0 group-hover:opacity-100 hover:text-rose-400 text-slate-500 p-0.5 cursor-pointer"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={handleSaveColor}
              title="Salva questo colore nei preferiti"
              className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-dashed border-slate-700 text-slate-400 hover:text-amber-400 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
            >
              <Plus className="w-2.5 h-2.5" />
              <span>Salva</span>
            </button>
          </div>
        </div>

        {/* CONTROLLI DI PRECISIONE: COLOR PICKER + HEX + RGB */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 flex-wrap justify-between">
          
          <div className="flex items-center gap-2">
            {/* COLOR PICKER NATIVO */}
            <div className="relative flex items-center">
              <input
                type="color"
                id="active-target-color-picker"
                value={currentColorHex}
                onChange={(e) => handleUpdateColor(activeTargetKey, e.target.value)}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              />
              <label
                htmlFor="active-target-color-picker"
                className="w-8 h-8 rounded-xl border border-white/25 shadow-inner cursor-pointer flex items-center justify-center transition hover:scale-105"
                style={{ backgroundColor: currentColorHex }}
                title="Selettore colore nativo"
              >
                <span className="sr-only">Selettore colore</span>
              </label>
            </div>

            {/* CAMPO HEX */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 focus-within:border-amber-500/60">
              <span className="text-[10px] font-mono text-slate-500 mr-1 select-none">#</span>
              <input
                type="text"
                value={currentColorHex.replace(/^#/, '')}
                onChange={(e) => {
                  const clean = e.target.value.trim().replace(/[^0-9A-Fa-f]/g, '').slice(0, 6);
                  if (clean.length === 3 || clean.length === 6) {
                    handleUpdateColor(activeTargetKey, `#${clean}`);
                  }
                }}
                placeholder="FFFFFF"
                className="w-16 bg-transparent text-xs font-mono text-white uppercase focus:outline-none font-bold"
              />
            </div>
          </div>

          {/* CAMPI RGB NUMERICI */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl px-2 py-1">
            <div className="flex items-center gap-0.5">
              <span className="text-[9px] font-mono font-bold text-rose-400 select-none">R</span>
              <input
                type="number"
                min={0}
                max={255}
                value={currentRgb.r}
                onChange={(e) => handleUpdateRgb('r', parseInt(e.target.value, 10))}
                className="w-9 bg-slate-950 text-center text-[10px] font-mono text-white rounded py-0.5 border border-slate-800 focus:outline-none focus:border-rose-500"
              />
            </div>
            <div className="flex items-center gap-0.5">
              <span className="text-[9px] font-mono font-bold text-emerald-400 select-none">G</span>
              <input
                type="number"
                min={0}
                max={255}
                value={currentRgb.g}
                onChange={(e) => handleUpdateRgb('g', parseInt(e.target.value, 10))}
                className="w-9 bg-slate-950 text-center text-[10px] font-mono text-white rounded py-0.5 border border-slate-800 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex items-center gap-0.5">
              <span className="text-[9px] font-mono font-bold text-sky-400 select-none">B</span>
              <input
                type="number"
                min={0}
                max={255}
                value={currentRgb.b}
                onChange={(e) => handleUpdateRgb('b', parseInt(e.target.value, 10))}
                className="w-9 bg-slate-950 text-center text-[10px] font-mono text-white rounded py-0.5 border border-slate-800 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

