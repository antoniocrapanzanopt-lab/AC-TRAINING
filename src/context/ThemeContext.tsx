import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface ThemePreset {
  id: string;
  name: string;
  hex: string;
  rgb: string;
  badgeBg: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  { id: 'gold', name: 'Giallo Oro AC (Default)', hex: '#eab308', rgb: '234, 179, 8', badgeBg: 'bg-amber-500' },
  { id: 'emerald', name: 'Smeraldo Performance', hex: '#10b981', rgb: '16, 185, 129', badgeBg: 'bg-emerald-500' },
  { id: 'cyan', name: 'Ciano High-Tech', hex: '#06b6d4', rgb: '6, 182, 212', badgeBg: 'bg-cyan-500' },
  { id: 'purple', name: 'Viola Reale', hex: '#a855f7', rgb: '168, 85, 247', badgeBg: 'bg-purple-500' },
  { id: 'rose', name: 'Rosso Corsa', hex: '#f43f5e', rgb: '244, 63, 94', badgeBg: 'bg-rose-500' },
  { id: 'orange', name: 'Arancio Neon', hex: '#f97316', rgb: '249, 115, 22', badgeBg: 'bg-orange-500' },
  { id: 'silver', name: 'Titanio Monocromo', hex: '#e2e8f0', rgb: '226, 232, 240', badgeBg: 'bg-slate-200' },
];

export const hexToRgb = (hex: string): string => {
  let cleaned = hex.replace('#', '');
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map(c => c + c).join('');
  }
  const num = parseInt(cleaned, 16);
  if (isNaN(num)) return '234, 179, 8';
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `${r}, ${g}, ${b}`;
};

export const darkenHex = (hex: string, percent: number = 15): string => {
  let cleaned = hex.replace('#', '');
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map(c => c + c).join('');
  }
  const num = parseInt(cleaned, 16);
  if (isNaN(num)) return '#ca8a04';

  let r = (num >> 16) & 255;
  let g = (num >> 8) & 255;
  let b = num & 255;

  r = Math.max(0, Math.floor(r * (1 - percent / 100)));
  g = Math.max(0, Math.floor(g * (1 - percent / 100)));
  b = Math.max(0, Math.floor(b * (1 - percent / 100)));

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

interface ThemeContextType {
  primaryHex: string;
  primaryRgb: string;
  setPrimaryColor: (hex: string) => void;
  resetThemeToDefault: () => void;
  presets: ThemePreset[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [primaryHex, setPrimaryHex] = useState<string>(() => {
    return localStorage.getItem('builder_theme_primary_hex') || '#eab308';
  });

  const [primaryRgb, setPrimaryRgb] = useState<string>(() => {
    return localStorage.getItem('builder_theme_primary_rgb') || '234, 179, 8';
  });

  const applyThemeToDOM = useCallback((hex: string) => {
    const rgb = hexToRgb(hex);
    const hoverHex = darkenHex(hex, 15);

    const root = document.documentElement;
    root.style.setProperty('--color-primary', hex);
    root.style.setProperty('--color-primary-hex', hex);
    root.style.setProperty('--color-primary-rgb', rgb);
    root.style.setProperty('--color-primary-hover', hoverHex);

    setPrimaryHex(hex);
    setPrimaryRgb(rgb);
  }, []);

  useEffect(() => {
    applyThemeToDOM(primaryHex);
  }, [primaryHex, applyThemeToDOM]);

  useEffect(() => {
    const handleStorageOrEventChange = () => {
      const storedHex = localStorage.getItem('builder_theme_primary_hex') || '#eab308';
      applyThemeToDOM(storedHex);
    };

    window.addEventListener('theme_color_changed', handleStorageOrEventChange);
    window.addEventListener('storage', handleStorageOrEventChange);
    return () => {
      window.removeEventListener('theme_color_changed', handleStorageOrEventChange);
      window.removeEventListener('storage', handleStorageOrEventChange);
    };
  }, [applyThemeToDOM]);

  const setPrimaryColor = (hex: string) => {
    const rgb = hexToRgb(hex);
    localStorage.setItem('builder_theme_primary_hex', hex);
    localStorage.setItem('builder_theme_primary_rgb', rgb);
    applyThemeToDOM(hex);
    window.dispatchEvent(new Event('theme_color_changed'));
  };

  const resetThemeToDefault = () => {
    setPrimaryColor('#eab308');
  };

  return (
    <ThemeContext.Provider
      value={{
        primaryHex,
        primaryRgb,
        setPrimaryColor,
        resetThemeToDefault,
        presets: THEME_PRESETS,
      }}
    >
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
