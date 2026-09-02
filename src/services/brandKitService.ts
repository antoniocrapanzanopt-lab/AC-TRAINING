import { BrandKit } from '../types/carousel';

const BRAND_KIT_STORAGE_KEY = 'ac_brand_kit_settings_v1';

export const DEFAULT_BRAND_KIT: BrandKit = {
  logoUrl: null,
  brandName: 'AC COACHING',
  authorHandle: '@antoniocrapanzano_coach',
  authorSignature: 'Antonio Crapanzano • Performance & Biomechanics Coach',
  primaryColor: '#070A10',
  secondaryColor: '#1E293B',
  accentColor: '#F59E0B',
  ctaColor: '#F59E0B',
  titleFont: 'Inter',
  bodyFont: 'Inter',
  logoPosition: 'top_left',
  watermarkText: '• AC COACHING •',
  imageStyle: 'dark_gradient',
};

/**
 * Carica il Brand Kit salvato in localStorage o restituisce il default AC Coaching
 */
export const loadBrandKit = (): BrandKit => {
  try {
    const saved = localStorage.getItem(BRAND_KIT_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_BRAND_KIT, ...parsed };
    }
  } catch {
    // Fallback al default se parsing fallisce
  }
  return { ...DEFAULT_BRAND_KIT };
};

/**
 * Salva il Brand Kit in localStorage per persistenza globale
 */
export const saveBrandKit = (brandKit: BrandKit): void => {
  try {
    localStorage.setItem(BRAND_KIT_STORAGE_KEY, JSON.stringify(brandKit));
  } catch (err) {
    console.error('Errore nel salvataggio del Brand Kit in localStorage:', err);
  }
};
