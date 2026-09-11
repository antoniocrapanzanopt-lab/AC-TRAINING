import { InstagramCarousel, CarouselSlide } from '../types/carousel';
import { renderSlideToCanvas, RecordedTextItem, CANVAS_WIDTH, CANVAS_HEIGHT } from './carouselCanvasRenderer';
import { jsPDF } from 'jspdf';

type PdfBaseline = 'alphabetic' | 'ideographic' | 'bottom' | 'top' | 'middle' | 'hanging';
type PdfAlign = 'left' | 'center' | 'right' | 'justify';

function parseRgbColor(col: string): { r: number; g: number; b: number } {
  if (col.startsWith('#')) {
    const hex = col.replace('#', '');
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
      };
    }
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    };
  }
  const match = col.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (match) {
    return {
      r: parseInt(match[1], 10),
      g: parseInt(match[2], 10),
      b: parseInt(match[3], 10),
    };
  }
  return { r: 255, g: 255, b: 255 };
}

/**
 * Funzione helper per scaricare un Blob come file nel browser
 */
export const triggerFileDownload = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/**
 * Esporta e scarica una singola slide in formato PNG (1080x1350)
 */
export const exportSingleSlideAsPng = async (
  slide: CarouselSlide,
  carousel: InstagramCarousel
): Promise<void> => {
  const canvas = document.createElement('canvas');
  await renderSlideToCanvas(canvas, slide, carousel.settings, carousel.slides.length);
  
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        const slideNum = String(slide.order).padStart(2, '0');
        const filename = `slide_${slideNum}.png`;
        triggerFileDownload(blob, filename);
      }
      resolve();
    }, 'image/png', 1.0);
  });
};

/**
 * Esporta tutte le slide come singoli file PNG sequenziali
 */
export const exportAllSlidesAsPng = async (
  carousel: InstagramCarousel,
  onProgress?: (current: number, total: number) => void
): Promise<void> => {
  const slides = carousel.slides;
  for (let i = 0; i < slides.length; i++) {
    if (onProgress) {
      onProgress(i + 1, slides.length);
    }
    await exportSingleSlideAsPng(slides[i], carousel);
    // Piccolo delay per non saturare la coda di download del browser
    if (i < slides.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
};


/**
 * Esporta il file caption.txt con testo e hashtag
 */
export const exportCaptionTextFile = (carousel: InstagramCarousel): void => {
  const content = carousel.caption_export || '';
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  triggerFileDownload(blob, 'caption_instagram.txt');
};

/**
 * Crea una struttura ZIP pura in memoria (standard PKZIP 2.0 uncompressed)
 * Permette di scaricare tutte le slide in un unico pacchetto .zip senza librerie pesanti
 */
const createSimpleZip = (files: { name: string; data: Uint8Array }[]): Blob => {
  const fileEntries: {
    nameBytes: Uint8Array;
    data: Uint8Array;
    crc32: number;
    offset: number;
  }[] = [];

  // Calcolo CRC32 standard
  const crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crcTable[i] = c;
  }

  const computeCrc32 = (buf: Uint8Array): number => {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  };

  const parts: Uint8Array[] = [];
  let currentOffset = 0;

  // Scrittura Local File Headers
  for (const file of files) {
    const encoder = new TextEncoder();
    const nameBytes = encoder.encode(file.name);
    const crc = computeCrc32(file.data);
    const size = file.data.length;

    // Header 30 bytes
    const header = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x04034b50, true); // Local file header signature
    view.setUint16(4, 20, true);         // Version needed
    view.setUint16(6, 0, true);          // General purpose bit flag
    view.setUint16(8, 0, true);          // Compression method (0 = uncompressed)
    view.setUint16(10, 0, true);         // Mod time
    view.setUint16(12, 0, true);         // Mod date
    view.setUint32(14, crc, true);       // CRC32
    view.setUint32(18, size, true);      // Compressed size
    view.setUint32(22, size, true);      // Uncompressed size
    view.setUint16(26, nameBytes.length, true); // File name length
    view.setUint16(28, 0, true);         // Extra field length
    header.set(nameBytes, 30);

    fileEntries.push({
      nameBytes,
      data: file.data,
      crc32: crc,
      offset: currentOffset,
    });

    parts.push(header);
    parts.push(file.data);
    currentOffset += header.length + file.data.length;
  }

  const centralDirStart = currentOffset;

  // Scrittura Central Directory Headers
  for (const entry of fileEntries) {
    const header = new Uint8Array(46 + entry.nameBytes.length);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x02014b50, true); // Central directory header signature
    view.setUint16(4, 20, true);         // Version made by
    view.setUint16(6, 20, true);         // Version needed
    view.setUint16(8, 0, true);          // General purpose bit flag
    view.setUint16(10, 0, true);         // Compression method (0 = uncompressed)
    view.setUint16(12, 0, true);         // Mod time
    view.setUint16(14, 0, true);         // Mod date
    view.setUint32(16, entry.crc32, true); // CRC32
    view.setUint32(20, entry.data.length, true); // Compressed size
    view.setUint32(24, entry.data.length, true); // Uncompressed size
    view.setUint16(28, entry.nameBytes.length, true); // File name length
    view.setUint16(30, 0, true);         // Extra field length
    view.setUint16(32, 0, true);         // File comment length
    view.setUint16(34, 0, true);         // Disk number start
    view.setUint16(36, 0, true);         // Internal file attributes
    view.setUint32(38, 0, true);         // External file attributes
    view.setUint32(42, entry.offset, true); // Relative offset of local header
    header.set(entry.nameBytes, 46);

    parts.push(header);
    currentOffset += header.length;
  }

  const centralDirSize = currentOffset - centralDirStart;

  // End of Central Directory Record (22 bytes)
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true); // EOCD signature
  eocdView.setUint16(4, 0, true);          // Disk number
  eocdView.setUint16(6, 0, true);          // Disk with central dir
  eocdView.setUint16(8, fileEntries.length, true); // Total entries disk
  eocdView.setUint16(10, fileEntries.length, true); // Total entries
  eocdView.setUint32(12, centralDirSize, true); // Size of central dir
  eocdView.setUint32(16, centralDirStart, true); // Offset of central dir
  eocdView.setUint16(20, 0, true);         // Comment length

  parts.push(eocd);

  return new Blob(parts, { type: 'application/zip' });
};

/**
 * Esporta tutte le slide e la didascalia in un unico file ZIP
 */
export const exportFullCarouselZip = async (
  carousel: InstagramCarousel,
  onProgress?: (current: number, total: number) => void
): Promise<void> => {
  const slides = carousel.slides;
  const files: { name: string; data: Uint8Array }[] = [];
  const canvas = document.createElement('canvas');

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    if (onProgress) onProgress(i + 1, slides.length);

    await renderSlideToCanvas(canvas, slide, carousel.settings, slides.length);

    const blob: Blob | null = await new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/png', 1.0);
    });

    if (blob) {
      const buffer = await blob.arrayBuffer();
      const slideNum = String(i + 1).padStart(2, '0');
      files.push({
        name: `slide_${slideNum}.png`,
        data: new Uint8Array(buffer),
      });
    }
  }

  // Includi file didascalia caption.txt
  if (carousel.caption_export) {
    const encoder = new TextEncoder();
    files.push({
      name: 'caption.txt',
      data: encoder.encode(carousel.caption_export),
    });
  }

  const zipBlob = createSimpleZip(files);
  triggerFileDownload(zipBlob, `carosello_instagram_${Date.now()}.zip`);
};

/**
 * Apre la finestra di anteprima e stampa per esportare in PDF
 */
export const exportCarouselAsPdfPreview = async (carousel: InstagramCarousel): Promise<void> => {
  const slides = carousel.slides;
  const canvas = document.createElement('canvas');
  const slideImages: string[] = [];

  for (const slide of slides) {
    await renderSlideToCanvas(canvas, slide, carousel.settings, slides.length);
    slideImages.push(canvas.toDataURL('image/png', 0.95));
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Anteprima PDF Carosello Instagram</title>
        <style>
          @page {
            size: 1080px 1350px;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
            background: #0b0f17;
            display: flex;
            flex-direction: column;
            align-items: center;
            font-family: system-ui, sans-serif;
          }
          .slide-page {
            page-break-after: always;
            width: 1080px;
            height: 1350px;
            margin-bottom: 20px;
          }
          img {
            width: 100%;
            height: 100%;
            display: block;
          }
          @media print {
            body { background: transparent; }
            .slide-page { margin: 0; }
          }
        </style>
      </head>
      <body>
        ${slideImages.map((src, i) => `<div class="slide-page"><img src="${src}" alt="Slide ${i + 1}" /></div>`).join('')}
        <script>
          window.onload = () => {
            setTimeout(() => {
              window.print();
            }, 500);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};

/**
 * Esporta il carosello in PDF vettoriale multipagina modificabile direttamente su Canva
 */
export const exportCarouselAsVectorPdf = async (
  carousel: InstagramCarousel,
  onProgress?: (progressText: string) => void,
  title?: string
): Promise<void> => {
  const slides = carousel.slides;
  if (!slides || slides.length === 0) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'px',
    format: [CANVAS_WIDTH, CANVAS_HEIGHT],
    hotfixes: ['px_scaling'],
  });

  const canvas = document.createElement('canvas');

  for (let i = 0; i < slides.length; i++) {
    if (onProgress) {
      onProgress(`Generazione pagina ${i + 1}/${slides.length} vettoriale per Canva...`);
    }

    if (i > 0) {
      doc.addPage([CANVAS_WIDTH, CANVAS_HEIGHT], 'portrait');
    }

    const recordedTexts: RecordedTextItem[] = [];

    // 1. Renderizza la canvas con skipText: true per ottenere lo sfondo grafico pulito (senza testi rasterizzati)
    await renderSlideToCanvas(canvas, slides[i], carousel.settings, slides.length, {
      skipText: true,
      onRecordText: (item) => recordedTexts.push(item),
    });

    // 2. Inserisci lo sfondo grafico (gradienti, foto, watermark logo, box e card) come layer di fondo PNG nitido
    const bgDataUrl = canvas.toDataURL('image/png');
    doc.addImage(bgDataUrl, 'PNG', 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, undefined, 'FAST');

    // 3. Posiziona tutti i testi vettoriali nativi con font e coordinate esatte (completamente modificabili su Canva)
    for (const item of recordedTexts) {
      doc.setFont('helvetica', item.isBold ? 'bold' : 'normal');

      // Conversione precisa pixel -> pt: in jsPDF setFontSize accetta sempre pt (1 pt = 1.3333 px -> pt = px * 0.75)
      let ptSize = item.fontSize * 0.75;
      doc.setFontSize(ptSize);

      // Adattamento metriche: Helvetica ha glifi leggermente più larghi di Inter.
      // Se il testo è stato misurato su canvas (targetWidth) e su Helvetica risulta più largo,
      // scaliamo la dimensione proporzionalmente in modo che occupi esattamente la larghezza visiva prevista
      let measuredPdfWidth = doc.getTextWidth(item.text);
      if (item.targetWidth && item.targetWidth > 0 && measuredPdfWidth > item.targetWidth) {
        const scale = item.targetWidth / measuredPdfWidth;
        ptSize = Math.max(6, ptSize * scale);
        doc.setFontSize(ptSize);
        measuredPdfWidth = doc.getTextWidth(item.text);
      }

      // Safeguard anti-taglio bordi pagina (margine di sicurezza 50px)
      const minMargin = 50;
      let leftEdge = item.x;
      if (item.align === 'center') {
        leftEdge = item.x - measuredPdfWidth / 2;
      } else if (item.align === 'right') {
        leftEdge = item.x - measuredPdfWidth;
      }
      const rightEdge = leftEdge + measuredPdfWidth;

      if (rightEdge > CANVAS_WIDTH - minMargin || leftEdge < minMargin) {
        const maxAvailableWidth = item.align === 'center'
          ? Math.max(100, Math.min(item.x - minMargin, (CANVAS_WIDTH - minMargin) - item.x) * 2)
          : item.align === 'right'
          ? Math.max(100, item.x - minMargin)
          : Math.max(100, (CANVAS_WIDTH - minMargin) - item.x);

        if (measuredPdfWidth > maxAvailableWidth) {
          const fitScale = maxAvailableWidth / measuredPdfWidth;
          ptSize = Math.max(6, ptSize * fitScale);
          doc.setFontSize(ptSize);
        }
      }

      const rgb = parseRgbColor(item.color);
      doc.setTextColor(rgb.r, rgb.g, rgb.b);

      const baseline: PdfBaseline =
        item.baseline === 'middle'
          ? 'middle'
          : item.baseline === 'bottom'
          ? 'bottom'
          : item.baseline === 'alphabetic'
          ? 'alphabetic'
          : 'top';

      const align: PdfAlign =
        item.align === 'center' ? 'center' : item.align === 'right' ? 'right' : 'left';

      doc.text(item.text, item.x, item.y, {
        align,
        baseline,
      });
    }
  }

  const cleanTitle = (title || carousel.slides?.[0]?.headline || 'carosello')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .slice(0, 30);
  const fileName = `${cleanTitle}_vettoriale_canva_${Date.now()}.pdf`;
  doc.save(fileName);
};
