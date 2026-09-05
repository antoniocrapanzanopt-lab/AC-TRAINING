import { CoverColors, CoverTemplateId } from '../types/cover';

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

/**
 * Valida se una stringa è un formato HEX valido (#RGB o #RRGGBB)
 */
export const isValidHex = (hex: string): boolean => {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex.trim());
};

/**
 * Normalizza una stringa HEX assicurando prefisso #, espansione a 6 caratteri e maiuscolo.
 */
export const normalizeHex = (hex: string, fallback: string = '#FFFFFF'): string => {
  let clean = hex.trim();
  if (!clean.startsWith('#')) {
    clean = '#' + clean;
  }
  if (!isValidHex(clean)) {
    return fallback.toUpperCase();
  }
  if (clean.length === 4) {
    clean =
      '#' +
      clean[1] +
      clean[1] +
      clean[2] +
      clean[2] +
      clean[3] +
      clean[3];
  }
  return clean.toUpperCase();
};

/**
 * Converte HEX in RGB [0-255]
 */
export const hexToRgb = (hex: string): RGBColor | null => {
  const normalized = normalizeHex(hex, '');
  if (!normalized || normalized.length !== 7) return null;

  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);

  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return { r, g, b };
};

/**
 * Clampa un valore numerico nel range [0, 255]
 */
export const clampByte = (val: number): number => {
  if (isNaN(val)) return 0;
  return Math.max(0, Math.min(255, Math.round(val)));
};

/**
 * Converte RGB in formato stringa HEX (#RRGGBB)
 */
export const rgbToHex = (r: number, g: number, b: number): string => {
  const cr = clampByte(r).toString(16).padStart(2, '0');
  const cg = clampByte(g).toString(16).padStart(2, '0');
  const cb = clampByte(b).toString(16).padStart(2, '0');
  return `#${cr}${cg}${cb}`.toUpperCase();
};

/**
 * Calcola la luminanza relativa WCAG da componenti RGB
 */
export const calculateLuminance = (r: number, g: number, b: number): number => {
  const a = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
};

/**
 * Calcola il rapporto di contrasto WCAG (da 1 a 21) tra due colori HEX
 */
export const calculateContrastRatio = (foregroundHex: string, backgroundHex: string): number => {
  const fgRgb = hexToRgb(foregroundHex) || { r: 255, g: 255, b: 255 };
  const bgRgb = hexToRgb(backgroundHex) || { r: 0, g: 0, b: 0 };

  const lum1 = calculateLuminance(fgRgb.r, fgRgb.g, fgRgb.b);
  const lum2 = calculateLuminance(bgRgb.r, bgRgb.g, bgRgb.b);

  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);

  return (brightest + 0.05) / (darkest + 0.05);
};

export interface ContrastFeedback {
  isAccessible: boolean;
  label: '✓ Leggibile' | '⚠ Contrasto basso';
  ratio: number;
}

/**
 * Valuta l'accessibilità del testo rispetto allo sfondo (soglia AA per testi grandi / headline: 3.0:1)
 */
export const getContrastFeedback = (
  foregroundHex: string,
  backgroundHex: string,
  isLargeText: boolean = true
): ContrastFeedback => {
  const ratio = calculateContrastRatio(foregroundHex, backgroundHex);
  const threshold = isLargeText ? 3.0 : 4.5;
  const isAccessible = ratio >= threshold;

  return {
    isAccessible,
    label: isAccessible ? '✓ Leggibile' : '⚠ Contrasto basso',
    ratio: Math.round(ratio * 10) / 10,
  };
};

/**
 * Palette predefinite ufficiali per ciascun template
 */
export const getTemplateDefaultColors = (templateId: CoverTemplateId): CoverColors => {
  switch (templateId) {
    case 'scientific_breakdown':
      return {
        badgeColor: '#38BDF8',
        titleColor: '#FFFFFF',
        highlightColor: '#38BDF8',
        subtitleColor: '#CBD5E1',
        handleColor: '#FFFFFF',
        overlayColor: '#030712',
        decorativeColor: '#38BDF8',
      };
    case 'minimal_focus':
      return {
        badgeColor: '#E5E7EB',
        titleColor: '#FFFFFF',
        highlightColor: '#F5C518',
        subtitleColor: '#9CA3AF',
        handleColor: '#FFFFFF',
        overlayColor: '#000000',
        decorativeColor: '#4B5563',
      };
    case 'badge_impact':
      return {
        badgeColor: '#F5C518',
        titleColor: '#FFFFFF',
        highlightColor: '#F5C518',
        subtitleColor: '#F3F4F6',
        handleColor: '#FFFFFF',
        overlayColor: '#050505',
        decorativeColor: '#F5C518',
      };
    case 'bold_editorial':
    default:
      return {
        badgeColor: '#F5C518',
        titleColor: '#FFFFFF',
        highlightColor: '#F5C518',
        subtitleColor: '#E5E7EB',
        handleColor: '#FFFFFF',
        overlayColor: '#000000',
        decorativeColor: '#F5C518',
      };
  }
};

/**
 * Palette predefinita Brand AC Coaching (Default Metodo AC)
 */
export const AC_BRAND_PALETTE: CoverColors = {
  badgeColor: '#F5C518',
  titleColor: '#FFFFFF',
  highlightColor: '#F5C518',
  subtitleColor: '#E5E7EB',
  handleColor: '#FFFFFF',
  overlayColor: '#000000',
  decorativeColor: '#F5C518',
};

export interface ThemePreset {
  id: string;
  name: string;
  badge: string;
  accentColor: string;
  colors: CoverColors;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'metodo_ac',
    name: 'Metodo AC',
    badge: '🟡 Oro & Bianco',
    accentColor: '#F5C518',
    colors: {
      badgeColor: '#F5C518',
      titleColor: '#FFFFFF',
      highlightColor: '#F5C518',
      subtitleColor: '#E5E7EB',
      handleColor: '#FFFFFF',
      overlayColor: '#000000',
      decorativeColor: '#F5C518',
    },
  },
  {
    id: 'scientific',
    name: 'Scientific',
    badge: '🔵 Blu Neon',
    accentColor: '#38BDF8',
    colors: {
      badgeColor: '#38BDF8',
      titleColor: '#FFFFFF',
      highlightColor: '#38BDF8',
      subtitleColor: '#CBD5E1',
      handleColor: '#FFFFFF',
      overlayColor: '#030712',
      decorativeColor: '#38BDF8',
    },
  },
  {
    id: 'power_warning',
    name: 'Power / Errore',
    badge: '🔴 Rosso Fuoco',
    accentColor: '#EF4444',
    colors: {
      badgeColor: '#EF4444',
      titleColor: '#FFFFFF',
      highlightColor: '#EF4444',
      subtitleColor: '#F3F4F6',
      handleColor: '#FFFFFF',
      overlayColor: '#050505',
      decorativeColor: '#EF4444',
    },
  },
  {
    id: 'minimal_clean',
    name: 'Minimal Clean',
    badge: '⚪ Bianco & Grigio',
    accentColor: '#E5E7EB',
    colors: {
      badgeColor: '#E5E7EB',
      titleColor: '#FFFFFF',
      highlightColor: '#F5C518',
      subtitleColor: '#9CA3AF',
      handleColor: '#FFFFFF',
      overlayColor: '#000000',
      decorativeColor: '#4B5563',
    },
  },
];

export const SWATCH_ACCENT_COLORS = [
  { name: 'AC Giallo Oro', hex: '#F5C518' },
  { name: 'Ambra Intenso', hex: '#F59E0B' },
  { name: 'AC Blu Neon', hex: '#38BDF8' },
  { name: 'Rosso Fuoco', hex: '#EF4444' },
  { name: 'Verde Smeraldo', hex: '#10B981' },
  { name: 'Viola Tech', hex: '#A855F7' },
  { name: 'Bianco Puro', hex: '#FFFFFF' },
  { name: 'Grigio Chiaro', hex: '#CBD5E1' },
];

export const SWATCH_BG_COLORS = [
  { name: 'Nero Profondo', hex: '#000000', desc: 'Massimo contrasto (consigliato)' },
  { name: 'Nero Grafite', hex: '#0A0B0D', desc: 'Tono cinematografico' },
  { name: 'Dark Navy', hex: '#030712', desc: 'Blu scurissimo' },
  { name: 'Dark Slate', hex: '#0F172A', desc: 'Ardesia notte' },
  { name: 'Dark Charcoal', hex: '#18181B', desc: 'Carbone neutro' },
];

export const BRAND_SWATCH_PRESETS = SWATCH_ACCENT_COLORS;

