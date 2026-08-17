/**
 * Configurazione Centralizzata Intelligenza Artificiale (AI)
 * AC TRAINING & ATHLETE MANAGER
 */

export const AI_CONFIG = {
  // Provider di default
  DEFAULT_PROVIDER: 'gemini' as const,

  // Configurazione Google Gemini
  GEMINI: {
    DISPLAY_NAME: 'Google Gemini 3.7 Flash',
    MODEL_ID: 'gemini-3.7-flash',
    SHORT_NAME: 'Gemini 3.7 Flash',
    TAGLINE: 'Google Gemini 3.7 Flash (Integrato nel progetto)',
  },

  // Configurazione OpenAI
  OPENAI: {
    DISPLAY_NAME: 'OpenAI GPT-4o',
    MODEL_ID: 'gpt-4o',
    SHORT_NAME: 'GPT-4o',
    TAGLINE: 'OpenAI GPT-4o (Modello Avanzato)',
  },
} as const;

export type AIProvider = 'gemini' | 'openai';
