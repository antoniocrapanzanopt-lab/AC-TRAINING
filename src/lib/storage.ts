import { supabase } from './supabase';

interface CachedSignedUrl {
  signedUrl: string;
  expiresAt: number;
}

const medicalCertUrlCache = new Map<string, CachedSignedUrl>();

/**
 * Funzioni di utilità per il localStorage per preferenze visive e fallback.
 */
export function getStorageItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading localStorage key "${key}":`, error);
    return defaultValue;
  }
}

export function setStorageItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error setting localStorage key "${key}":`, error);
  }
}

/**
 * Risolve un percorso storage o un URL legacy di certificato medico in una Signed URL temporanea.
 * Durata predefinita: 900 secondi (15 minuti) con cache in memoria.
 */
export async function getSignedMedicalCertificateUrl(
  pathOrUrl: string,
  expiresInSeconds = 900
): Promise<string | null> {
  try {
    const trimmed = (pathOrUrl || '').trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('data:')) return trimmed;

    let relativePath = trimmed;
    if (trimmed.includes('/medical-certificates/')) {
      const parts = trimmed.split('/medical-certificates/');
      const extracted = parts[1]?.split('?')[0];
      if (extracted) {
        relativePath = decodeURIComponent(extracted);
      }
    }

    const cached = medicalCertUrlCache.get(relativePath);
    const now = Date.now();
    if (cached && now < cached.expiresAt - 60_000) {
      return cached.signedUrl;
    }

    const { data, error } = await supabase.storage
      .from('medical-certificates')
      .createSignedUrl(relativePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      return null;
    }

    medicalCertUrlCache.set(relativePath, {
      signedUrl: data.signedUrl,
      expiresAt: now + expiresInSeconds * 1000,
    });

    return data.signedUrl;
  } catch {
    return null;
  }
}

/**
 * Carica un file di Certificato Medico nel Bucket Privato 'medical-certificates' su Supabase Storage.
 * Salva esclusivamente il path relativo nel DB.
 */
export async function uploadMedicalCertificateToStorage(
  athleteId: string,
  compressedFile: File,
  fallbackDataUrl: string
): Promise<{ url: string; isRemote: boolean; error?: string }> {
  try {
    const fileExt = compressedFile.name.split('.').pop() || 'jpg';
    const fileName = `${athleteId}/${Date.now()}_cert.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('medical-certificates')
      .upload(fileName, compressedFile, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error || !data?.path) {
      console.warn('Supabase Storage error (fallback attivato):', error?.message);
      return { url: fallbackDataUrl, isRemote: false };
    }

    // Salva il path relativo nel database
    return { url: data.path, isRemote: true };
  } catch (err: any) {
    console.warn('Eccezione durante l\'upload del file (fallback DataURL attivato):', err.message);
    return { url: fallbackDataUrl, isRemote: false };
  }
}

/**
 * Carica un Video di Esecuzione Esercizio nel Bucket 'exercise-videos' su Supabase Storage.
 */
export async function uploadExerciseVideoToStorage(
  exerciseId: string,
  videoFile: File,
  fallbackDataUrl: string
): Promise<{ url: string; isRemote: boolean; error?: string }> {
  try {
    const fileExt = videoFile.name.split('.').pop() || 'mp4';
    const fileName = `exercises/${exerciseId || 'custom'}/${Date.now()}_video.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('exercise-videos')
      .upload(fileName, videoFile, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.warn('Supabase Storage error per video (fallback attivato):', error.message);
      return { url: fallbackDataUrl, isRemote: false };
    }

    const { data: publicUrlData } = supabase.storage
      .from('exercise-videos')
      .getPublicUrl(data.path);

    return { url: publicUrlData.publicUrl, isRemote: true };
  } catch (err: any) {
    console.warn('Eccezione durante l\'upload del video:', err.message);
    return { url: fallbackDataUrl, isRemote: false };
  }
}
