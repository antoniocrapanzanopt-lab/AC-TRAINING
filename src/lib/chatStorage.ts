import { supabase } from './supabase';

interface CachedSignedUrl {
  signedUrl: string;
  expiresAt: number; // timestamp in millisecondi
}

// Cache in memoria singleton per le Signed URL
const signedUrlCache = new Map<string, CachedSignedUrl>();

/**
 * Estrae il percorso storage del file da un path relativo o da un URL pubblico legacy.
 */
export const extractChatStoragePath = (pathOrUrl: string): { isDataUrl: boolean; path: string } => {
  const trimmed = (pathOrUrl || '').trim();
  if (trimmed.startsWith('data:')) {
    return { isDataUrl: true, path: trimmed };
  }

  // Supporto retrocompatibile per i messaggi legacy contenenti URL pubblici Supabase Storage
  if (trimmed.includes('/chat-attachments/')) {
    const parts = trimmed.split('/chat-attachments/');
    const extracted = parts[1]?.split('?')[0];
    if (extracted) {
      return { isDataUrl: false, path: decodeURIComponent(extracted) };
    }
  }

  return { isDataUrl: false, path: trimmed };
};

/**
 * Risolve un path o un URL legacy in una Signed URL temporanea con cache in memoria.
 * Durata predefinita: 900 secondi (15 minuti).
 */
export const getSignedChatAttachmentUrl = async (
  pathOrUrl: string,
  expiresInSeconds = 900
): Promise<string | null> => {
  try {
    const { isDataUrl, path } = extractChatStoragePath(pathOrUrl);
    if (isDataUrl) return path;
    if (!path) return null;

    // 1. Verifica Cache in memoria con margine di sicurezza di 60 secondi
    const cached = signedUrlCache.get(path);
    const now = Date.now();
    if (cached && now < cached.expiresAt - 60_000) {
      return cached.signedUrl;
    }

    // 2. Richiesta di creazione Signed URL su bucket privato 'chat-attachments'
    const { data, error } = await supabase.storage
      .from('chat-attachments')
      .createSignedUrl(path, expiresInSeconds);

    if (error || !data?.signedUrl) {
      return null;
    }

    // 3. Salva in cache
    signedUrlCache.set(path, {
      signedUrl: data.signedUrl,
      expiresAt: now + expiresInSeconds * 1000,
    });

    return data.signedUrl;
  } catch {
    return null;
  }
};

/**
 * Carica un allegato multimediale su Supabase Storage nel bucket privato 'chat-attachments'.
 * Salva nel percorso chat/<athleteId>/<filename> o chat/<filename>.
 * Restituisce esclusivamente il path relativo (es. 'chat/...') o DataURL di fallback.
 */
export const uploadChatAttachment = async (file: File, athleteId?: string): Promise<string> => {
  try {
    const fileExt = file.name.split('.').pop() || 'png';
    const cleanFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = athleteId ? `chat/${athleteId}/${cleanFileName}` : `chat/${cleanFileName}`;

    // 1. Tenta l'upload su Supabase Storage (Bucket privato: chat-attachments)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('chat-attachments')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (!uploadError && uploadData?.path) {
      // Restituisce esclusivamente il path relativo memorizzato nel bucket
      return uploadData.path;
    }
  } catch {
    // Fallback silente senza log di parametri sensibili
  }

  // 2. Fallback di Sicurezza (Compressione Canvas DataURL in locale se Storage non è raggiungibile)
  return compressFileToDataUrl(file);
};

const compressFileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.readAsDataURL(file);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      const maxDim = 1200;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.readAsDataURL(file);
    };
    img.src = url;
  });
};
