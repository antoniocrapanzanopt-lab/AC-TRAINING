import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ThemeMode, ThemePreferences, ThemePreset, ColorContrastResult } from '../types';
import { STORAGE_KEYS } from '../config/storageKeys';

// ─── 7 PALETTE BRAND AC COACHING ─────────────────────────────────────────────

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'gold',
    name: 'Oro AC (Brand)',
    description: 'Identità istituzionale AC Coaching ad alto contrasto',
    accent: '#eab308',
    accentHover: '#ca8a04',
    accentActive: '#a16207',
    accentSoft: 'rgba(234, 179, 8, 0.14)',
    foreground: '#000000',
    badgeBg: 'bg-amber-500',
  },
  {
    id: 'electric-blue',
    name: 'Blu Elettrico',
    description: 'Focus atletico, telemetria e precisione',
    accent: '#3b82f6',
    accentHover: '#2563eb',
    accentActive: '#1d4ed8',
    accentSoft: 'rgba(59, 130, 246, 0.14)',
    foreground: '#ffffff',
    badgeBg: 'bg-blue-500',
  },
  {
    id: 'cyan-tech',
    name: 'Ciano Tecnico',
    description: 'High performance, innovazione e biomeccanica',
    accent: '#06b6d4',
    accentHover: '#0891b2',
    accentActive: '#0e7490',
    accentSoft: 'rgba(6, 182, 212, 0.14)',
    foreground: '#000000',
    badgeBg: 'bg-cyan-500',
  },
  {
    id: 'emerald-performance',
    name: 'Verde Performance',
    description: 'Resistenza organica, recupero e vitalità',
    accent: '#10b981',
    accentHover: '#059669',
    accentActive: '#047857',
    accentSoft: 'rgba(16, 185, 129, 0.14)',
    foreground: '#000000',
    badgeBg: 'bg-emerald-500',
  },
  {
    id: 'red-control',
    name: 'Rosso Controllo',
    description: 'Potenza pura, intensità anaerobica e gara',
    accent: '#f43f5e',
    accentHover: '#e11d48',
    accentActive: '#be123c',
    accentSoft: 'rgba(244, 63, 94, 0.14)',
    foreground: '#ffffff',
    badgeBg: 'bg-rose-500',
  },
  {
    id: 'orange-energy',
    name: 'Arancio Energia',
    description: 'Dinamismo esplosivo e carica motivazionale',
    accent: '#f97316',
    accentHover: '#ea580c',
    accentActive: '#c2410c',
    accentSoft: 'rgba(249, 115, 22, 0.14)',
    foreground: '#000000',
    badgeBg: 'bg-orange-500',
  },
  {
    id: 'titanium-neutral',
    name: 'Neutro Titanio',
    description: 'Minimalismo sobrio, eleganza high-tech',
    accent: '#94a3b8',
    accentHover: '#64748b',
    accentActive: '#475569',
    accentSoft: 'rgba(148, 163, 184, 0.14)',
    foreground: '#000000',
    badgeBg: 'bg-slate-400',
  },
];

export const DEFAULT_THEME_PREFERENCES: ThemePreferences = {
  mode: 'dark',
  accentColor: '#eab308',
  customAccentColor: undefined,
  savedAt: '2026-01-01T00:00:00.000Z',
};

// ─── COLOR CONVERSION & CONTRAST UTILITIES ───────────────────────────────────

export const hexToRgb = (hex: string): string => {
  let cleaned = hex.replace('#', '').trim();
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map(c => c + c).join('');
  }
  const num = parseInt(cleaned, 16);
  if (isNaN(num) || cleaned.length !== 6) return '234, 179, 8';
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `${r}, ${g}, ${b}`;
};

export const hexToRgbValues = (hex: string): [number, number, number] => {
  let cleaned = hex.replace('#', '').trim();
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map(c => c + c).join('');
  }
  const num = parseInt(cleaned, 16);
  if (isNaN(num) || cleaned.length !== 6) return [234, 179, 8];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
};

export const darkenHex = (hex: string, percent: number = 15): string => {
  const [r, g, b] = hexToRgbValues(hex);
  const factor = Math.max(0, 1 - percent / 100);
  const dr = Math.floor(r * factor);
  const dg = Math.floor(g * factor);
  const db = Math.floor(b * factor);
  return `#${((1 << 24) + (dr << 16) + (dg << 8) + db).toString(16).slice(1)}`;
};

export const lightenHex = (hex: string, percent: number = 15): string => {
  const [r, g, b] = hexToRgbValues(hex);
  const factor = percent / 100;
  const lr = Math.min(255, Math.floor(r + (255 - r) * factor));
  const lg = Math.min(255, Math.floor(g + (255 - g) * factor));
  const lb = Math.min(255, Math.floor(b + (255 - b) * factor));
  return `#${((1 << 24) + (lr << 16) + (lg << 8) + lb).toString(16).slice(1)}`;
};

/**
 * Calcolo della luminanza relativa secondo WCAG 2.1
 */
export const getRelativeLuminance = (r: number, g: number, b: number): number => {
  const [rs, gs, bs] = [r, g, b].map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

/**
 * Calcolo del rapporto di contrasto WCAG tra due colori (es. 4.5:1)
 */
export const getContrastRatio = (hex1: string, hex2: string): number => {
  const [r1, g1, b1] = hexToRgbValues(hex1);
  const [r2, g2, b2] = hexToRgbValues(hex2);
  const l1 = getRelativeLuminance(r1, g1, b1);
  const l2 = getRelativeLuminance(r2, g2, b2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * Valutazione accessibilità WCAG del colore primario rispetto allo sfondo e al testo
 */
export const evaluateContrast = (accentHex: string, mode: 'dark' | 'light'): ColorContrastResult => {
  const bgHex = mode === 'dark' ? '#09090b' : '#f8fafc';
  const ratioOnBg = getContrastRatio(accentHex, bgHex);
  const ratioWithBlack = getContrastRatio(accentHex, '#000000');
  const ratioWithWhite = getContrastRatio(accentHex, '#ffffff');
  const maxTextRatio = Math.max(ratioWithBlack, ratioWithWhite);

  const rounded = Math.round(maxTextRatio * 10) / 10;
  const roundedBg = Math.round(ratioOnBg * 10) / 10;

  if (rounded >= 7.0 && roundedBg >= 3.0) {
    return {
      ratio: rounded,
      score: 'AAA',
      isAccessible: true,
      message: `Contrasto ottimale (${rounded}:1) - Conforme WCAG Livello AAA`,
    };
  } else if (rounded >= 4.5) {
    return {
      ratio: rounded,
      score: 'AA',
      isAccessible: true,
      message: `Buon contrasto (${rounded}:1) - Conforme WCAG Livello AA`,
    };
  } else if (rounded >= 3.0) {
    return {
      ratio: rounded,
      score: 'AA Large',
      isAccessible: true,
      message: `Contrasto medio (${rounded}:1) - Adatto per testo grande o elementi grafici`,
    };
  } else {
    return {
      ratio: rounded,
      score: 'Fail',
      isAccessible: false,
      message: `Contrasto basso (${rounded}:1) - Potrebbe risultare poco leggibile su alcuni schermi`,
    };
  }
};

// ─── PARSER SICURO CON FALLBACK E MIGRATION ──────────────────────────────────

export const loadStoredThemePreferences = (): ThemePreferences => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.THEME_PREFERENCES);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ThemePreferences>;
      if (parsed && typeof parsed === 'object') {
        const mode: ThemeMode =
          parsed.mode === 'dark' || parsed.mode === 'light' || parsed.mode === 'system'
            ? parsed.mode
            : 'dark';

        const accentColor =
          parsed.accentColor && /^#[0-9A-Fa-f]{6}$/.test(parsed.accentColor)
            ? parsed.accentColor
            : '#eab308';

        return {
          mode,
          accentColor,
          customAccentColor: parsed.customAccentColor,
          savedAt: parsed.savedAt || new Date().toISOString(),
        };
      }
    }

    // Fallback retrocompatibile con chiavi legacy
    const legacyHex = localStorage.getItem('builder_theme_primary_hex');
    if (legacyHex && /^#[0-9A-Fa-f]{6}$/.test(legacyHex)) {
      return {
        mode: 'dark',
        accentColor: legacyHex,
        savedAt: new Date().toISOString(),
      };
    }
  } catch (err) {
    console.warn('Errore lettura preferenze tema da storage, applicato fallback brand sicuro:', err);
  }

  return { ...DEFAULT_THEME_PREFERENCES };
};

// ─── INTERFACCIA DEL CONTESTO ────────────────────────────────────────────────

interface ThemeContextType {
  // Stato corrente (può essere bozza/anteprima o sessione o salvato)
  mode: ThemeMode;
  effectiveTheme: 'dark' | 'light';
  accentColor: string;
  savedPreferences: ThemePreferences;
  isLivePreview: boolean;
  hasUnsavedChanges: boolean;
  contrastResult: ColorContrastResult;

  // Azioni
  setMode: (mode: ThemeMode) => void;
  previewAccent: (hex: string) => void;
  previewMode: (mode: ThemeMode) => void;
  applySessionTheme: (hex?: string, mode?: ThemeMode) => void;
  savePreferences: (newPrefs?: Partial<ThemePreferences>) => void;
  cancelPreview: () => void;
  resetThemeToDefault: () => void;

  // Retrocompatibilità
  primaryHex: string;
  primaryRgb: string;
  savedHex: string;
  setPrimaryColor: (hex: string) => void;
  saveTheme: (hex: string) => void;
  presets: ThemePreset[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Preferenze salvate (sorgente permanente di verità)
  const [savedPreferences, setSavedPreferences] = useState<ThemePreferences>(loadStoredThemePreferences);

  // Stato attivo in memoria/anteprima
  const [activeMode, setActiveMode] = useState<ThemeMode>(() => savedPreferences.mode);
  const [activeAccent, setActiveAccent] = useState<string>(() => savedPreferences.accentColor);

  // Risoluzione tema effettivo (dark/light) considerando 'system'
  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return true;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Ascolta cambi tema a livello di sistema operativo
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setSystemIsDark(e.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const effectiveTheme: 'dark' | 'light' = useMemo(() => {
    if (activeMode === 'system') {
      return systemIsDark ? 'dark' : 'light';
    }
    return activeMode;
  }, [activeMode, systemIsDark]);

  // ─── APPLICAZIONE VARIABILI CSS AL DOM ─────────────────────────────────────
  const applyTokensToDOM = useCallback((accent: string, theme: 'dark' | 'light') => {
    const root = document.documentElement;
    const rgb = hexToRgb(accent);
    const hoverHex = darkenHex(accent, 12);
    const activeHex = darkenHex(accent, 25);
    const softBg = `rgba(${rgb}, 0.14)`;
    const focusRing = `rgba(${rgb}, 0.4)`;

    // 1. Modalità dark / light
    root.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }

    // 2. Variabili Accent
    root.style.setProperty('--color-primary', accent);
    root.style.setProperty('--color-primary-hex', accent);
    root.style.setProperty('--color-primary-rgb', rgb);
    root.style.setProperty('--color-primary-hover', hoverHex);
    root.style.setProperty('--color-primary-active', activeHex);
    root.style.setProperty('--color-primary-soft', softBg);
    root.style.setProperty('--color-focus', focusRing);
  }, []);

  // Applicazione reattiva continua
  useEffect(() => {
    applyTokensToDOM(activeAccent, effectiveTheme);
  }, [activeAccent, effectiveTheme, applyTokensToDOM]);

  // Sincronizzazione cross-tab / storage
  useEffect(() => {
    const handleStorageChange = () => {
      const fresh = loadStoredThemePreferences();
      setSavedPreferences(fresh);
      setActiveMode(fresh.mode);
      setActiveAccent(fresh.accentColor);
    };

    window.addEventListener('theme_color_changed', handleStorageChange);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('theme_color_changed', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // ─── AZIONI TEMA ──────────────────────────────────────────────────────────

  // 1. Anteprima Live Accento
  const previewAccent = useCallback((hex: string) => {
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      setActiveAccent(hex);
    }
  }, []);

  // 2. Anteprima Live Modalità (Scuro / Chiaro / Sistema)
  const previewMode = useCallback((mode: ThemeMode) => {
    setActiveMode(mode);
  }, []);

  const setMode = useCallback((mode: ThemeMode) => {
    setActiveMode(mode);
  }, []);

  // 3. Applica alla sessione corrente (in memoria senza salvare su disco)
  const applySessionTheme = useCallback((hex?: string, mode?: ThemeMode) => {
    if (hex && /^#[0-9A-Fa-f]{6}$/.test(hex)) {
      setActiveAccent(hex);
    }
    if (mode) {
      setActiveMode(mode);
    }
  }, []);

  // 4. Salva definitivamente in localStorage
  const savePreferences = useCallback((newPrefs?: Partial<ThemePreferences>) => {
    const finalMode = newPrefs?.mode || activeMode;
    const finalAccent = newPrefs?.accentColor || activeAccent;
    const finalCustom = newPrefs?.customAccentColor !== undefined ? newPrefs.customAccentColor : savedPreferences.customAccentColor;

    const updated: ThemePreferences = {
      mode: finalMode,
      accentColor: finalAccent,
      customAccentColor: finalCustom,
      savedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(STORAGE_KEYS.THEME_PREFERENCES, JSON.stringify(updated));
      // Sincronizzazione retrocompatibile con vecchie chiavi legacy
      localStorage.setItem('builder_theme_primary_hex', finalAccent);
      localStorage.setItem('builder_theme_primary_rgb', hexToRgb(finalAccent));
    } catch (e) {
      console.error('Impossibile salvare le preferenze tema in localStorage:', e);
    }

    setSavedPreferences(updated);
    setActiveMode(finalMode);
    setActiveAccent(finalAccent);

    window.dispatchEvent(new Event('theme_color_changed'));
  }, [activeMode, activeAccent, savedPreferences.customAccentColor]);

  // 5. Annulla l'anteprima e torna al tema salvato
  const cancelPreview = useCallback(() => {
    setActiveMode(savedPreferences.mode);
    setActiveAccent(savedPreferences.accentColor);
  }, [savedPreferences]);

  // 6. Ripristina predefiniti (Oro AC + Scuro)
  const resetThemeToDefault = useCallback(() => {
    savePreferences({
      mode: 'dark',
      accentColor: '#eab308',
      customAccentColor: undefined,
    });
  }, [savePreferences]);

  // ─── COMPATIBILITÀ CON CHIAMATE LEGACY ────────────────────────────────────
  const setPrimaryColor = useCallback((hex: string) => {
    savePreferences({ accentColor: hex });
  }, [savePreferences]);

  const saveTheme = useCallback((hex: string) => {
    savePreferences({ accentColor: hex });
  }, [savePreferences]);

  // Controllo modifiche non salvate
  const hasUnsavedChanges = useMemo(() => {
    return (
      activeMode !== savedPreferences.mode ||
      activeAccent.toLowerCase() !== savedPreferences.accentColor.toLowerCase()
    );
  }, [activeMode, activeAccent, savedPreferences]);

  const isLivePreview = hasUnsavedChanges;

  // Calcolo accessibilità del colore attivo
  const contrastResult = useMemo(() => {
    return evaluateContrast(activeAccent, effectiveTheme);
  }, [activeAccent, effectiveTheme]);

  const contextValue: ThemeContextType = {
    mode: activeMode,
    effectiveTheme,
    accentColor: activeAccent,
    savedPreferences,
    isLivePreview,
    hasUnsavedChanges,
    contrastResult,

    setMode,
    previewAccent,
    previewMode,
    applySessionTheme,
    savePreferences,
    cancelPreview,
    resetThemeToDefault,

    // Legacy mapping
    primaryHex: activeAccent,
    primaryRgb: hexToRgb(activeAccent),
    savedHex: savedPreferences.accentColor,
    setPrimaryColor,
    saveTheme,
    presets: THEME_PRESETS,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve essere usato all\'interno di ThemeProvider');
  }
  return context;
};
