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
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('Eccezione durante l\'upload del video:', msg);
    return { url: fallbackDataUrl, isRemote: false };
  }
}

/**
 * Converte un DataURL base64 in un Blob per upload in Supabase Storage.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Carica una Foto Progressi nel Bucket 'progress-photos' su Supabase Storage.
 * Restituisce l'URL pubblico e il path relativo nel bucket.
 */
export async function uploadProgressPhotoToStorage(
  athleteId: string,
  fileOrDataUrl: File | string,
  pose: string = 'front'
): Promise<{ url: string; storagePath: string | null; isRemote: boolean }> {
  try {
    let fileToUpload: Blob;
    let fileExt = 'jpg';

    if (typeof fileOrDataUrl === 'string') {
      if (!fileOrDataUrl.startsWith('data:')) {
        return { url: fileOrDataUrl, storagePath: null, isRemote: true };
      }
      fileToUpload = dataUrlToBlob(fileOrDataUrl);
      if (fileOrDataUrl.includes('image/png')) fileExt = 'png';
      else if (fileOrDataUrl.includes('image/webp')) fileExt = 'webp';
    } else {
      fileToUpload = fileOrDataUrl;
      fileExt = fileOrDataUrl.name.split('.').pop() || 'jpg';
    }

    const cleanId = athleteId || 'general';
    const randomSuffix = Math.random().toString(36).slice(2, 8);
    const fileName = `${cleanId}/${Date.now()}_${pose}_${randomSuffix}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('progress-photos')
      .upload(fileName, fileToUpload, {
        cacheControl: '31536000',
        upsert: true,
      });

    if (error || !data?.path) {
      console.warn('Upload a Supabase Storage fallito (usando fallback DataURL):', error?.message);
      const fallbackUrl = typeof fileOrDataUrl === 'string' ? fileOrDataUrl : URL.createObjectURL(fileOrDataUrl);
      return { url: fallbackUrl, storagePath: null, isRemote: false };
    }

    const { data: publicUrlData } = supabase.storage
      .from('progress-photos')
      .getPublicUrl(data.path);

    return {
      url: publicUrlData.publicUrl,
      storagePath: data.path,
      isRemote: true,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('Eccezione durante upload foto progresso:', msg);
    const fallbackUrl = typeof fileOrDataUrl === 'string' ? fileOrDataUrl : URL.createObjectURL(fileOrDataUrl);
    return { url: fallbackUrl, storagePath: null, isRemote: false };
  }
}
