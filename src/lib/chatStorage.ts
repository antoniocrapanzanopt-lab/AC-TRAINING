import { supabase } from './supabase';

/**
 * Carica un allegato multimediale su Supabase Storage nel bucket 'chat-attachments'.
 * Se l'upload sul bucket fallisce o il bucket non esiste, esegue il fallback sicuro.
 */
export const uploadChatAttachment = async (file: File): Promise<string> => {
  try {
    const fileExt = file.name.split('.').pop() || 'png';
    const cleanFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `chat/${cleanFileName}`;

    // 1. Tenta l'upload su Supabase Storage (Bucket: chat-attachments)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('chat-attachments')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (!uploadError && uploadData?.path) {
      // 2. Recupera l'URL Pubblico generato da Supabase Storage
      const { data: publicUrlData } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(filePath);

      if (publicUrlData?.publicUrl) {
        return publicUrlData.publicUrl;
      }
    } else {
      console.warn('Supabase Storage upload warning (fallback to compressed DataURL):', uploadError?.message);
    }
  } catch (err) {
    console.warn('Supabase Storage exception, using fallback:', err);
  }

  // 3. Fallback di Sicurezza (Compressione Canvas DataURL in locale se Storage non è ancora configurato)
  return compressFileToDataUrl(file);
};

const compressFileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
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
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    };
    img.src = url;
  });
};
