import { InstagramCoverData } from '../types/cover';
import { hexToRgb } from './coverColorUtils';
import { RecordedTextItem } from './carouselCanvasRenderer';
import { jsPDF } from 'jspdf';

export const REEL_WIDTH = 1080;
export const REEL_HEIGHT = 1920;
export const POST_WIDTH = 1080;
export const POST_HEIGHT = 1350;
export const GRID_SQUARE_SIZE = 1080;

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

export interface CoverRenderOptions {
  previewMode?: 'full' | 'grid'; // 'full' (intero canvas) o 'grid' (crop 1:1 feed instagram)
  showSafeArea?: boolean;
  skipText?: boolean;
  onRecordText?: (item: RecordedTextItem) => void;
}

/**
 * Carica un'immagine in modo asincrono con crossOrigin
 */
const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Impossibile caricare immagine: ${src}`));
    img.src = src;
  });
};

/**
 * Manda a capo il testo automaticamente calcolando la larghezza massima
 */
const wrapText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] => {
  if (!text) return [];
  const lines: string[] = [];
  const paragraphs = text.split('\n');

  for (const para of paragraphs) {
    if (!para.trim()) {
      lines.push('');
      continue;
    }
    const words = para.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = ctx.measureText(testLine).width;

      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines;
};

/**
 * Disegna un rettangolo arrotondato
 */
const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
};

/**
 * Renderizza la copertina Instagram (Reel 1080x1920 o Post 1080x1350) su canvas HTML
 */
export async function renderCoverToCanvas(
  canvas: HTMLCanvasElement,
  cover: InstagramCoverData,
  options: CoverRenderOptions = {}
): Promise<void> {
  const isReel = cover.format === '9:16';
  const width = isReel ? REEL_WIDTH : POST_WIDTH;
  const height = isReel ? REEL_HEIGHT : POST_HEIGHT;

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const originalFillText = ctx.fillText.bind(ctx);
  if (options.skipText || options.onRecordText) {
    ctx.fillText = function (text: string | number, x: number, y: number) {
      const textStr = String(text ?? '');
      if (!textStr.trim()) return;

      if (options.onRecordText) {
        const fontStr = ctx.font || '';
        const sizeMatch = fontStr.match(/(\d+)px/);
        const fontSize = sizeMatch ? parseInt(sizeMatch[1], 10) : 28;
        const isBold = fontStr.includes('bold') || fontStr.includes('700') || fontStr.includes('800') || fontStr.includes('900');
        const color = typeof ctx.fillStyle === 'string' ? ctx.fillStyle : '#FFFFFF';
        const align: 'left' | 'center' | 'right' = (ctx.textAlign as 'left' | 'center' | 'right') || 'left';
        const rawBaseline = ctx.textBaseline;
        const baseline: 'top' | 'middle' | 'bottom' | 'alphabetic' =
          rawBaseline === 'middle' ? 'middle' : rawBaseline === 'top' ? 'top' : rawBaseline === 'bottom' ? 'bottom' : 'alphabetic';

        options.onRecordText({
          text: textStr,
          x,
          y,
          fontSize,
          isBold,
          color,
          align,
          baseline,
        });
      }

      if (!options.skipText) {
        originalFillText(textStr, x, y);
      }
    };
  }

  const badgeColor = cover.badgeColor || cover.accentColor || '#F5C518';
  const titleColor = cover.titleColor || cover.textColor || '#FFFFFF';
  const highlightColor = cover.highlightColor || cover.accentColor || '#F5C518';
  const subtitleColor = cover.subtitleColor || '#E5E7EB';
  const handleColor = cover.handleColor || '#FFFFFF';
  const overlayColor = cover.overlayColor || '#000000';
  const decorativeColor = cover.decorativeColor || cover.accentColor || '#F5C518';
  const darkBgColor = cover.darkBgColor || overlayColor || '#0A0B0D';
  const fontTitle = cover.fontTitle || 'Outfit';
  const fontBody = cover.fontBody || 'Inter';

  const overlayRgb = hexToRgb(overlayColor) || { r: 0, g: 0, b: 0 };
  const bgRgb = hexToRgb(darkBgColor) || { r: 10, g: 11, b: 13 };

  // Calcolo luminanza: se l'overlay o lo sfondo sono stati impostati su colori chiari per errore,
  // scalali a tonalità scure protettive per preservare sempre il contrasto della foto e del testo
  const overlayLum = (overlayRgb.r * 0.299 + overlayRgb.g * 0.587 + overlayRgb.b * 0.114) / 255;
  const safeOverlayRgb =
    overlayLum > 0.15
      ? {
          r: Math.round(overlayRgb.r * 0.12),
          g: Math.round(overlayRgb.g * 0.12),
          b: Math.round(overlayRgb.b * 0.12),
        }
      : overlayRgb;

  const bgLum = (bgRgb.r * 0.299 + bgRgb.g * 0.587 + bgRgb.b * 0.114) / 255;
  const safeBgColor = bgLum > 0.2 ? '#0A0B0D' : darkBgColor;

  // 1. Sfondo Base Scuro
  ctx.fillStyle = safeBgColor;
  ctx.fillRect(0, 0, width, height);

  // 2. Rendering Immagine Fotografica di Sfondo (se presente)
  if (cover.imageUrl) {
    try {
      const img = await loadImage(cover.imageUrl);
      ctx.save();

      const scale = cover.imageScale || 1.0;
      const posXPercent = cover.imagePosition?.x || 0; // -50 a 50
      const posYPercent = cover.imagePosition?.y || 0; // -50 a 50

      const imgAspect = img.width / img.height;
      const canvasAspect = width / height;

      let drawWidth = width;
      let drawHeight = height;

      if (imgAspect > canvasAspect) {
        drawHeight = height * scale;
        drawWidth = drawHeight * imgAspect;
      } else {
        drawWidth = width * scale;
        drawHeight = drawWidth / imgAspect;
      }

      const offsetX = (width - drawWidth) / 2 + (posXPercent * width) / 100;
      const offsetY = (height - drawHeight) / 2 + (posYPercent * height) / 100;

      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
      ctx.restore();

      // Overlay scuro progressivo per leggibilità
      const opacity = typeof cover.imageOpacity === 'number' ? cover.imageOpacity : 0.55;
      ctx.fillStyle = `rgba(${safeOverlayRgb.r}, ${safeOverlayRgb.g}, ${safeOverlayRgb.b}, ${opacity})`;
      ctx.fillRect(0, 0, width, height);
    } catch (err) {
      console.warn('Errore rendering immagine copertina:', err);
    }
  }

  // 3. Gradiente Radiale d'Impatto Cinematografico (Brand Kit AC)
  const grad = ctx.createRadialGradient(
    width / 2,
    isReel ? height * 0.48 : height * 0.45,
    50,
    width / 2,
    height / 2,
    width * 0.85
  );
  grad.addColorStop(0, `${highlightColor}18`);
  grad.addColorStop(0.5, `rgba(${safeOverlayRgb.r}, ${safeOverlayRgb.g}, ${safeOverlayRgb.b}, 0.35)`);
  grad.addColorStop(1, 'rgba(5, 7, 10, 0.95)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // 3b. Logo AC Watermark in Background
  if (cover.showLogoWatermark) {
    try {
      const isBlue = cover.logoWatermarkVariant === 'blue';
      const logoSrc = isBlue ? '/ac-logo.png' : '/ac-logo-transparent.png';
      const logoImg = await loadImage(logoSrc);
      const logoSize = cover.logoWatermarkSize || (isReel ? 620 : 540);
      const defaultOpacity = isBlue ? 0.16 : 0.12;
      const logoOpacity = cover.logoWatermarkOpacity !== undefined ? cover.logoWatermarkOpacity : defaultOpacity;
      const logoX = (width - logoSize) / 2;
      const contentCenterY = isReel ? 960 : 660;
      const offsetY = cover.logoWatermarkOffsetY || 0;
      const logoY = contentCenterY - logoSize / 2 + offsetY;

      ctx.save();
      ctx.globalAlpha = Math.max(0.02, Math.min(0.60, logoOpacity));
      ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
      ctx.restore();
    } catch (e) {
      console.warn('Errore rendering watermark logo su cover:', e);
    }
  }

  // 4. Bordo Geometrico & Angoli Tech (Hypertrophy Science / Brand Kit)
  if (cover.templateId === 'scientific_breakdown' || cover.templateId === 'bold_editorial') {
    const pad = 45;
    const len = 50;
    ctx.save();
    ctx.strokeStyle = `${decorativeColor}66`;
    ctx.lineWidth = 3;

    // Angoli tech
    ctx.beginPath();
    ctx.moveTo(pad, pad + len);
    ctx.lineTo(pad, pad);
    ctx.lineTo(pad + len, pad);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(width - pad - len, pad);
    ctx.lineTo(width - pad, pad);
    ctx.lineTo(width - pad, pad + len);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(pad, height - pad - len);
    ctx.lineTo(pad, height - pad);
    ctx.lineTo(pad + len, height - pad);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(width - pad - len, height - pad);
    ctx.lineTo(width - pad, height - pad);
    ctx.lineTo(width - pad, height - pad - len);
    ctx.stroke();
    ctx.restore();
  }

  // 5. Layout Testi e Contenuti
  // Nei Reel (1080x1920), il contenuto principale DEVE trovarsi nella zona centrale (Y: 450 - 1450)
  // per restare perfettamente visibile sia a tutto schermo che nel crop quadrato (1080x1080) del profilo Instagram!
  const contentCenterY = isReel ? 960 : 660;

  // Calcolo altezze testi
  const headline = (cover.headline || 'TITOLO COPERTINA').toUpperCase();
  const headlineHighlight = (cover.headlineHighlight || '').toUpperCase();
  const subheadline = cover.subheadline || '';
  const categoryBadge = (cover.categoryBadge ?? '').trim();
  const hasBadge = Boolean(categoryBadge);
  const authorHandle = cover.authorHandle || '@antoniocrapanzano_coach';

  const maxWidth = width - 180;

  // Font metrics
  ctx.font = `900 68px "${fontTitle}", Inter, sans-serif`;
  const headlineLines = wrapText(ctx, headline, maxWidth);

  ctx.font = `900 68px "${fontTitle}", Inter, sans-serif`;
  const highlightLines = headlineHighlight ? wrapText(ctx, headlineHighlight, maxWidth) : [];

  ctx.font = `500 32px "${fontBody}", Inter, sans-serif`;
  const subheadlineLines = subheadline ? wrapText(ctx, subheadline, maxWidth - 40) : [];

  const headlineLineHeight = 78;
  const highlightLineHeight = 78;
  const subheadlineLineHeight = 44;

  const totalTextBlockHeight =
    (hasBadge ? 50 : 0) + // badge gap solo se presente
    headlineLines.length * headlineLineHeight +
    (highlightLines.length > 0 ? highlightLines.length * highlightLineHeight + 10 : 0) +
    (subheadlineLines.length > 0 ? subheadlineLines.length * subheadlineLineHeight + 35 : 0);

  let currentY = contentCenterY - totalTextBlockHeight / 2;

  // 5a. Badge Categoria (se presente e non rimosso)
  if (hasBadge) {
    ctx.font = `800 24px "${fontBody}", Inter, sans-serif`;
    const badgeText = categoryBadge.toUpperCase();
    const badgeWidth = ctx.measureText(badgeText).width + 36;
    const badgeHeight = 42;
    const badgeX = (width - badgeWidth) / 2;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 17, 21, 0.9)';
    ctx.strokeStyle = `${badgeColor}88`;
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, badgeX, currentY - 50, badgeWidth, badgeHeight, 21);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = badgeColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, width / 2, currentY - 29);
    ctx.restore();
  }

  // 5b. Titolo Principale (Riga 1)
  ctx.save();
  ctx.fillStyle = titleColor;
  ctx.font = `900 68px "${fontTitle}", Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  for (const line of headlineLines) {
    // Ombra per contrasto estremo su sfondi fotografici
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;
    ctx.fillText(line, width / 2, currentY);
    currentY += headlineLineHeight;
  }
  ctx.restore();

  // 5c. Testo Evidenziato (Riga 2)
  if (highlightLines.length > 0) {
    ctx.save();
    ctx.fillStyle = highlightColor;
    ctx.font = `900 68px "${fontTitle}", Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.shadowColor = `${highlightColor}66`;
    ctx.shadowBlur = 24;

    for (const line of highlightLines) {
      ctx.fillText(line, width / 2, currentY + 6);
      currentY += highlightLineHeight;
    }
    ctx.restore();
    currentY += 10;
  }

  // 5d. Sottotitolo / Gancio Dati
  if (subheadlineLines.length > 0) {
    currentY += 24;
    ctx.save();
    ctx.fillStyle = subtitleColor;
    ctx.font = `500 32px "${fontBody}", Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 12;

    for (const line of subheadlineLines) {
      ctx.fillText(line, width / 2, currentY);
      currentY += subheadlineLineHeight;
    }
    ctx.restore();
  }

  // 6. Handle Autore e Branding Inferiore
  const footerY = isReel ? 1720 : 1240;
  ctx.save();
  ctx.font = `700 24px "${fontBody}", Inter, sans-serif`;
  ctx.fillStyle = handleColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 8;
  ctx.fillText(authorHandle, width / 2, footerY);
  ctx.restore();

  // 7. Modalità Crop Griglia Profilo Instagram (1080x1080)
  if (options.previewMode === 'grid') {
    const gridYStart = (height - GRID_SQUARE_SIZE) / 2;
    const gridYEnd = gridYStart + GRID_SQUARE_SIZE;

    ctx.save();
    // Oscura la porzione superiore
    ctx.fillStyle = 'rgba(2, 6, 23, 0.82)';
    ctx.fillRect(0, 0, width, gridYStart);

    // Oscura la porzione inferiore
    ctx.fillRect(0, gridYEnd, width, height - gridYEnd);

    // Cornice colorata attorno al crop 1:1
    ctx.strokeStyle = decorativeColor;
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 8]);
    ctx.strokeRect(2, gridYStart + 2, width - 4, GRID_SQUARE_SIZE - 4);

    // Badge esplicativo Feed Grid
    ctx.setLineDash([]);
    ctx.fillStyle = decorativeColor;
    ctx.fillRect(width / 2 - 140, gridYStart + 16, 280, 36);
    ctx.fillStyle = overlayColor;
    ctx.font = '900 16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ANTEPRIMA GRIGLIA FEED (1:1)', width / 2, gridYStart + 34);
    ctx.restore();
  }

  // 8. Guide Safe Area Instagram
  if (options.showSafeArea) {
    const decorativeRgb = hexToRgb(decorativeColor) || { r: 245, g: 197, b: 24 };
    ctx.save();
    ctx.strokeStyle = decorativeColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);

    if (isReel) {
      // Safe area superiore (180px)
      ctx.strokeRect(40, 180, width - 80, height - 180 - 340);

      // Area UI superiore
      ctx.fillStyle = `rgba(${decorativeRgb.r}, ${decorativeRgb.g}, ${decorativeRgb.b}, 0.12)`;
      ctx.fillRect(0, 0, width, 180);
      ctx.fillStyle = decorativeColor;
      ctx.font = '700 18px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ZONA UI INSTAGRAM REEL SUPERIORE (Profilo & Audio)', width / 2, 90);

      // Area UI inferiore
      ctx.fillStyle = `rgba(${decorativeRgb.r}, ${decorativeRgb.g}, ${decorativeRgb.b}, 0.12)`;
      ctx.fillRect(0, height - 340, width, 340);
      ctx.fillStyle = decorativeColor;
      ctx.fillText('ZONA UI INSTAGRAM REEL INFERIORE (Didascalia & Icone)', width / 2, height - 170);
    } else {
      // Safe area post standard (margini 90px)
      ctx.strokeRect(60, 90, width - 120, height - 180);
    }
    ctx.restore();
  }

  if (options.skipText || options.onRecordText) {
    ctx.fillText = originalFillText;
  }
}

/**
 * Esporta la singola copertina in formato PDF vettoriale per Canva
 */
export async function exportCoverAsVectorPdf(
  cover: InstagramCoverData
): Promise<void> {
  const isReel = cover.format === '9:16';
  const width = isReel ? REEL_WIDTH : POST_WIDTH;
  const height = isReel ? REEL_HEIGHT : POST_HEIGHT;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'px',
    format: [width, height],
    hotfixes: ['px_scaling'],
  });

  const canvas = document.createElement('canvas');
  const recordedTexts: RecordedTextItem[] = [];

  // 1. Renderizza la canvas con skipText: true
  await renderCoverToCanvas(canvas, cover, {
    skipText: true,
    onRecordText: (item) => recordedTexts.push(item),
  });

  // 2. Inserisci lo sfondo grafico come layer di fondo
  const bgDataUrl = canvas.toDataURL('image/jpeg', 0.96);
  doc.addImage(bgDataUrl, 'JPEG', 0, 0, width, height, undefined, 'FAST');

  // 3. Posiziona tutti i testi vettoriali nativi
  for (const item of recordedTexts) {
    doc.setFont('helvetica', item.isBold ? 'bold' : 'normal');
    doc.setFontSize(item.fontSize);
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

  const cleanTitle = (cover.headline || 'copertina')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .slice(0, 30);
  const fileName = `${cleanTitle}_copertina_canva_${Date.now()}.pdf`;
  doc.save(fileName);
}
