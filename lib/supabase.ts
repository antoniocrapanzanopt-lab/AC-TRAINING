import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { STORAGE_KEYS } from '../config/storageKeys';
import { getStorageItem } from './storage';

// Funzione per ottenere URL e AnonKey o dalle env o dal localStorage
export const getSupabaseCredentials = (): { url: string; anonKey: string } => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  if (envUrl && envKey) {
    return { url: envUrl, anonKey: envKey };
  }

  // Fallback su impostazioni salvate nell'app
  const settings = getStorageItem<Record<string, string>>(STORAGE_KEYS.SETTINGS, {});
  return {
    url: settings.supabaseUrl || '',
    anonKey: settings.supabaseAnonKey || '',
  };
};

const { url, anonKey } = getSupabaseCredentials();

export const isSupabaseConfigured = Boolean(url && anonKey && url.startsWith('http'));

// Inizializzazione condizionale del client Supabase
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;
