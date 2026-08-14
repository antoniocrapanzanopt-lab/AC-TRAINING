import { supabase } from './supabase';

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
 * Carica un file di Certificato Medico nel Bucket Privato 'medical-certificates' su Supabase Storage.
 * Se il bucket non è ancora configurato, effettua un fallback sicuro restituendo il DataURL compresso.
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

    if (error) {
      console.warn('Supabase Storage error (fallback attivato):', error.message);
      return { url: fallbackDataUrl, isRemote: false };
    }

    // Per bucket privati, ottieni Signed URL (scadenza 15 minuti) o Public URL
    const { data: signedUrlData } = await supabase.storage
      .from('medical-certificates')
      .createSignedUrl(data.path, 60 * 15); // 15 Minuti

    if (signedUrlData?.signedUrl) {
      return { url: signedUrlData.signedUrl, isRemote: true };
    }

    const { data: publicUrlData } = supabase.storage
      .from('medical-certificates')
      .getPublicUrl(data.path);

    return { url: publicUrlData.publicUrl, isRemote: true };
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
