/**
 * Utility di compressione e validazione allegati (Immagini e Video) lato client.
 */

export interface CompressionResult {
  file: File;
  dataUrl: string;
  originalSizeKB: number;
  compressedSizeKB: number;
  reductionPercentage: number;
}

/**
 * Comprime un'immagine lato client utilizzando HTML5 Canvas.
 * Ridimensiona e riduce il bitrate per ottenere un file < 300-500 KB.
 */
export async function compressImageFile(
  file: File,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.75
): Promise<CompressionResult> {
  const originalSizeKB = Math.round(file.size / 1024);

  // Se è un PDF, non lo trasformiamo con Canvas, restituiamo DataURL validando la dimensione
  if (file.type === 'application/pdf') {
    const dataUrl = await fileToDataUrl(file);
    return {
      file,
      dataUrl,
      originalSizeKB,
      compressedSizeKB: originalSizeKB,
      reductionPercentage: 0,
    };
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calcola ridimensionamento mantenendo l'aspect ratio
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Impossibile inizializzare il contesto Canvas per la compressione.'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Esporta in formato JPEG compresso
        const dataUrl = canvas.toDataURL('image/jpeg', quality);

        // Converti DataURL in un oggetto File compresso
        const arr = dataUrl.split(',');
        const mimeMatch = arr[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);

        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }

        const compressedFile = new File([u8arr], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: mime });
        const compressedSizeKB = Math.round(compressedFile.size / 1024);
        const reductionPercentage = originalSizeKB > 0
          ? Math.max(0, Math.round(((originalSizeKB - compressedSizeKB) / originalSizeKB) * 100))
          : 0;

        resolve({
          file: compressedFile,
          dataUrl,
          originalSizeKB,
          compressedSizeKB,
          reductionPercentage,
        });
      };

      img.onerror = () => reject(new Error('Errore durante il caricamento dell\'immagine per la compressione.'));
    };

    reader.onerror = () => reject(new Error('Errore di lettura del file.'));
  });
}

export interface VideoValidationResult {
  valid: boolean;
  durationSeconds: number;
  sizeMB: number;
  error?: string;
}

/**
 * Valida la durata (max 20s) ed il peso (max 15MB) per i clip video degli esercizi.
 */
export async function validateAndInspectVideoFile(
  file: File,
  maxDurationSeconds = 20,
  maxSizeMB = 15
): Promise<VideoValidationResult> {
  const sizeMB = file.size / (1024 * 1024);
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      durationSeconds: 0,
      sizeMB: Math.round(sizeMB * 10) / 10,
      error: `Il video supera la dimensione massima consentita di ${maxSizeMB} MB (peso attuale: ${sizeMB.toFixed(1)} MB).`,
    };
  }

  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      const durationSeconds = Math.round(video.duration);

      if (durationSeconds > maxDurationSeconds) {
        resolve({
          valid: false,
          durationSeconds,
          sizeMB: Math.round(sizeMB * 10) / 10,
          error: `La durata del video (${durationSeconds} sec) supera il limite massimo consentito di ${maxDurationSeconds} secondi per le clip di esecuzione.`,
        });
      } else {
        resolve({
          valid: true,
          durationSeconds,
          sizeMB: Math.round(sizeMB * 10) / 10,
        });
      }
    };

    video.onerror = () => {
      resolve({
        valid: false,
        durationSeconds: 0,
        sizeMB: Math.round(sizeMB * 10) / 10,
        error: 'Formato video non supportato o file danneggiato.',
      });
    };

    video.src = URL.createObjectURL(file);
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
