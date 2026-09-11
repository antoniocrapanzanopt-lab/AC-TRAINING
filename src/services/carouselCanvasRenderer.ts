import { CarouselSlide, CarouselSettings, SlideLayoutId } from '../types/carousel';
import { calculateImageDrawBounds } from './imageSmartLayoutService';

export const CANVAS_WIDTH = 1080;
export const CANVAS_HEIGHT = 1350;

export interface RecordedTextItem {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  isBold: boolean;
  color: string;
  align: 'left' | 'center' | 'right';
  baseline: 'top' | 'middle' | 'bottom' | 'alphabetic';
  targetWidth?: number;
}

export interface RenderOptions {
  showSafeAreaGuidelines?: boolean;
  showGridCropGuide?: boolean;
  skipText?: boolean;
  onRecordText?: (item: RecordedTextItem) => void;
}

/**
 * Carica un'immagine in modo asincrono
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

interface DrawRichTextOptions {
  fontFamily: string;
  fontSize: number;
  color: string;
  isBold?: boolean;
  isUnderline?: boolean;
  maxWidth: number;
  lineStep?: number;
  align?: CanvasTextAlign;
  maxBottomY?: number;
}

/**
 * Rimuove in modo pulito e sicuro qualsiasi residuo di tag o markup dai testi
 */
export const sanitizeCarouselText = (text?: string | null): string => {
  if (!text) return '';
  return text
    .replace(/<\/?color[^>]*>/gi, '')
    .replace(/<\/?u>/gi, '')
    .replace(/\*\*/g, '');
  // NOTA: i tag [c:#HEX]...[/c] NON vengono rimossi qui: sono usati solo nel bodyText
  // e vengono interpretati dal renderer canvas.
};

/** Rimuove tutti i tag inline [c:...]...[/c] dal testo per la visualizzazione pura */
export const stripInlineColorTags = (text?: string | null): string => {
  if (!text) return '';
  return text.replace(/\[c:[^\]]+\]|\[\/c\]/gi, '');
};

interface TextSegment {
  text: string;
  color?: string; // se undefined usa il colore di default
}

/** Splitta il testo in segmenti con/senza colore inline [c:#HEX]...[/c] */
export const parseInlineColorSegments = (text: string): TextSegment[] => {
  const segments: TextSegment[] = [];
  const regex = /\[c:(#[0-9A-Fa-f]{3,8})\](.*?)\[\/c\]/gs;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index) });
    }
    segments.push({ text: match[2], color: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex) });
  }
  return segments.length > 0 ? segments : [{ text }];
};

/**
 * Disegna righe di Titolo o Testo Evidenziato su Canvas con font, px, colore, grassetto e sottolineato
 */
export const drawTitleLine = (
  ctx: CanvasRenderingContext2D,
  text: string,
  startX: number,
  startY: number,
  contentWidth: number,
  options: {
    fontFamily: string;
    fontSize: number;
    color: string;
    isBold: boolean;
    isUnderline: boolean;
    align?: CanvasTextAlign;
    maxBottomY?: number;
  }
): number => {
  if (!text) return startY;
  const clean = sanitizeCarouselText(text);
  if (!clean) return startY;

  const {
    fontFamily,
    fontSize,
    color,
    isBold,
    isUnderline,
    align = 'left',
    maxBottomY = CANVAS_HEIGHT - 60,
  } = options;

  const lineStep = fontSize + Math.max(8, Math.round(fontSize * 0.08));
  ctx.font = `${isBold ? '900' : '500'} ${fontSize}px "${fontFamily}", system-ui, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';

  const paragraphs = clean.split('\n');
  let currentY = startY;

  for (const para of paragraphs) {
    if (currentY > maxBottomY) break;
    if (!para.trim()) {
      currentY += Math.round(lineStep * 0.6);
      continue;
    }

    const lines = wrapText(ctx, para, contentWidth);
    for (const l of lines) {
      if (currentY > maxBottomY) break;
      ctx.fillText(l, startX, currentY);

      if (isUnderline && l.trim()) {
        const textW = ctx.measureText(l).width;
        let lineX = startX;
        if (align === 'center') {
          lineX = startX - textW / 2;
        } else if (align === 'right') {
          lineX = startX - textW;
        }
        const underlineY = currentY + Math.round(fontSize * 1.04);
        ctx.fillRect(lineX, underlineY, textW, Math.max(3, Math.round(fontSize * 0.08)));
      }

      currentY += lineStep;
    }
  }

  ctx.textAlign = 'left';
  return currentY;
};

/**
 * Disegna blocchi di testo formattati con supporto per font custom, px, colore, grassetto e sottolineatura
 */
export const drawRichTextLines = (
  ctx: CanvasRenderingContext2D,
  text: string,
  startX: number,
  startY: number,
  options: DrawRichTextOptions
): number => {
  if (!text) return startY;

  const {
    fontFamily,
    fontSize,
    color,
    isBold = false,
    isUnderline = false,
    maxWidth,
    align = 'left',
    maxBottomY = CANVAS_HEIGHT - 50,
  } = options;

  const lineStep = options.lineStep || Math.round(fontSize * 1.36);
  let currentY = startY;
  const weight = isBold ? '700' : '400';
  ctx.textBaseline = 'top';
  ctx.textAlign = align;

  // Controlla se ci sono tag inline di colore
  const hasInlineColors = text.includes('[c:');

  const paragraphs = text.split('\n');

  for (const para of paragraphs) {
    if (currentY > maxBottomY) break;
    if (!para.trim()) {
      currentY += Math.round(lineStep * 0.7);
      continue;
    }

    if (!hasInlineColors) {
      // Percorso veloce: nessun tag inline, disegno normale
      ctx.font = `${weight} ${fontSize}px "${fontFamily}", system-ui, sans-serif`;
      ctx.fillStyle = color;
      const lines = wrapText(ctx, sanitizeCarouselText(para), maxWidth);
      for (const line of lines) {
        if (currentY > maxBottomY) break;
        ctx.fillText(line, startX, currentY);
        if (isUnderline && line.trim()) {
          const textW = ctx.measureText(line).width;
          let lineX = startX;
          if (align === 'center') lineX = startX - textW / 2;
          else if (align === 'right') lineX = startX - textW;
          ctx.fillRect(lineX, currentY + Math.round(fontSize * 1.04), textW, Math.max(2, Math.round(fontSize * 0.08)));
        }
        currentY += lineStep;
      }
    } else {
      // Percorso rich: segmenti colorati inline
      // 1. Calcola il testo plain e il wrapping
      const plainPara = stripInlineColorTags(para);
      ctx.font = `${weight} ${fontSize}px "${fontFamily}", system-ui, sans-serif`;
      const wrappedLines = wrapText(ctx, plainPara, maxWidth);

      // 2. Costruisci colorMap: per ogni indice del testo plain, quale colore usare
      //    Questo garantisce che il colore sia corretto indipendentemente dal wrap.
      const segments = parseInlineColorSegments(para);
      const colorMap: string[] = [];
      for (const seg of segments) {
        const segPlain = stripInlineColorTags(seg.text);
        const segColor = seg.color || color;
        for (let i = 0; i < segPlain.length; i++) {
          colorMap.push(segColor);
        }
      }
      // Riempi eventuali posizioni mancanti col colore di default
      while (colorMap.length < plainPara.length) colorMap.push(color);

      // 3. Disegna ogni riga wrappata leggendo colorMap in sequenza
      let plainCharIdx = 0; // posizione globale nel testo plain
      for (const wrappedLine of wrappedLines) {
        if (currentY > maxBottomY) break;
        let cursorX = startX;
        // Disegna run consecutivi dello stesso colore
        let runStart = 0;
        let runColor = colorMap[plainCharIdx] ?? color;
        for (let i = 0; i <= wrappedLine.length; i++) {
          const charColor = i < wrappedLine.length ? (colorMap[plainCharIdx + i] ?? color) : null;
          if (charColor !== runColor || i === wrappedLine.length) {
            const run = wrappedLine.slice(runStart, i);
            if (run) {
              ctx.fillStyle = runColor;
              ctx.fillText(run, cursorX, currentY);
              const runW = ctx.measureText(run).width;
              if (isUnderline && run.trim()) {
                ctx.fillRect(cursorX, currentY + Math.round(fontSize * 1.04), runW, Math.max(2, Math.round(fontSize * 0.08)));
              }
              cursorX += runW;
            }
            runStart = i;
            runColor = charColor ?? color;
          }
        }
        // Avanza il puntatore globale: +lunghezza riga, +1 per lo spazio consumato dal wrap
        plainCharIdx += wrappedLine.length;
        if (plainCharIdx < plainPara.length && plainPara[plainCharIdx] === ' ') {
          plainCharIdx++; // consuma lo spazio usato da wrapText come separatore
        }
        currentY += lineStep;
      }
    }

  }

  return currentY;
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
 * Disegna angoli tech geometrici futuristici (Template Hypertrophy Science)
 */
const drawTechCorners = (ctx: CanvasRenderingContext2D, color: string) => {
  const pad = 30;
  const len = 40;
  ctx.save();
  ctx.strokeStyle = `${color}66`;
  ctx.lineWidth = 2;

  // Top Left
  ctx.beginPath();
  ctx.moveTo(pad, pad + len);
  ctx.lineTo(pad, pad);
  ctx.lineTo(pad + len, pad);
  ctx.stroke();

  // Top Right
  ctx.beginPath();
  ctx.moveTo(CANVAS_WIDTH - pad - len, pad);
  ctx.lineTo(CANVAS_WIDTH - pad, pad);
  ctx.lineTo(CANVAS_WIDTH - pad, pad + len);
  ctx.stroke();

  // Bottom Left
  ctx.beginPath();
  ctx.moveTo(pad, CANVAS_HEIGHT - pad - len);
  ctx.lineTo(pad, CANVAS_HEIGHT - pad);
  ctx.lineTo(pad + len, CANVAS_HEIGHT - pad);
  ctx.stroke();

  // Bottom Right
  ctx.beginPath();
  ctx.moveTo(CANVAS_WIDTH - pad - len, CANVAS_HEIGHT - pad);
  ctx.lineTo(CANVAS_WIDTH - pad, CANVAS_HEIGHT - pad);
  ctx.lineTo(CANVAS_WIDTH - pad, CANVAS_HEIGHT - pad - len);
  ctx.stroke();

  ctx.restore();
};

/**
 * Renderizza una singola slide sul Canvas HTML5 a 1080x1350 px con supporto completo per 7 Template & 11 Layout
 */
export const renderSlideToCanvas = async (
  canvas: HTMLCanvasElement,
  slide: CarouselSlide,
  settings: CarouselSettings,
  totalSlides: number,
  options: RenderOptions = {}
): Promise<void> => {
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {}
  }

  const originalFillText = ctx.fillText.bind(ctx);
  if (options.skipText || options.onRecordText) {
    ctx.fillText = function (text: string | number, x: number, y: number) {
      const textStr = String(text ?? '');
      if (!textStr.trim()) return;

      if (options.onRecordText) {
        const fontStr = ctx.font || '';
        const sizeMatch = fontStr.match(/(\d+)px/);
        const fontSize = sizeMatch ? parseInt(sizeMatch[1], 10) : 24;
        const isBold = fontStr.includes('bold') || fontStr.includes('700') || fontStr.includes('800') || fontStr.includes('900');
        const color = typeof ctx.fillStyle === 'string' ? ctx.fillStyle : '#FFFFFF';
        const align: 'left' | 'center' | 'right' = (ctx.textAlign as 'left' | 'center' | 'right') || 'left';
        const rawBaseline = ctx.textBaseline;
        const baseline: 'top' | 'middle' | 'bottom' | 'alphabetic' =
          rawBaseline === 'middle' ? 'middle' : rawBaseline === 'top' ? 'top' : rawBaseline === 'bottom' ? 'bottom' : 'alphabetic';

        let targetWidth: number | undefined;
        try {
          targetWidth = ctx.measureText ? ctx.measureText(textStr).width : undefined;
        } catch {
          targetWidth = undefined;
        }

        options.onRecordText({
          text: textStr,
          x,
          y,
          fontSize,
          isBold,
          color,
          align,
          baseline,
          targetWidth,
        });
      }

      if (!options.skipText) {
        originalFillText(textStr, x, y);
      }
    };
  }

  const brandKit = settings.brandKit || {
    brandName: settings.brandWatermark || 'AC COACHING',
    authorHandle: settings.authorHandle || '@antoniocrapanzano_coach',
    authorSignature: 'Antonio Crapanzano • Performance Coach',
    primaryColor: settings.darkBgColor || '#070A10',
    secondaryColor: '#1E293B',
    accentColor: settings.accentColor || '#F59E0B',
    ctaColor: '#F59E0B',
    titleFont: 'Inter',
    bodyFont: 'Inter',
    logoPosition: 'top_left',
    watermarkText: '• AC COACHING •',
    imageStyle: 'dark_gradient',
  };

  const templateId = settings.templateId || 'editorial_dark';
  const layout: SlideLayoutId = slide.layout || (slide.order === 1 ? 'dual_tone_cover' : slide.order === totalSlides ? 'final_cta' : 'numbered_list');

  const titleFont = slide.titleFont || brandKit.titleFont || 'Inter';
  const bodyFont = slide.bodyFont || brandKit.bodyFont || 'Inter';

  // Calcolo esatto dimensione caratteri in pixel (Mobile-First 1080x1350 per feed Instagram)
  const isCoverLayout = layout === 'dual_tone_cover' || layout === 'text_center' || slide.type === 'cover' || slide.order === 1;

  const defaultTitleSize = isCoverLayout
    ? (slide.titleSize === 'xl' ? 82 : slide.titleSize === 'lg' ? 72 : slide.titleSize === 'sm' ? 52 : 62)
    : (slide.titleSize === 'xl' ? 72 : slide.titleSize === 'lg' ? 62 : slide.titleSize === 'sm' ? 44 : 52);
  const titleFontSize = slide.titleFontSizePx || defaultTitleSize;

  const defaultBodySize = isCoverLayout
    ? (slide.bodyFontSize === 'lg' ? 40 : slide.bodyFontSize === 'sm' ? 28 : 34)
    : (slide.bodyFontSize === 'lg' ? 38 : slide.bodyFontSize === 'sm' ? 26 : 32);
  const bodyFontSize = slide.bodyFontSizePx || defaultBodySize;

  // Sfondo & Colori: priorità a slide specifica, poi Brand Kit ufficiale, poi default template
  const templateDefaults: Record<string, { bg: string; accent: string }> = {
    editorial_dark: { bg: '#070A10', accent: '#F59E0B' },
    hypertrophy_science: { bg: '#0C081A', accent: '#C084FC' },
    bold_impact: { bg: '#060709', accent: '#F59E0B' },
    coach_framework: { bg: '#0B1120', accent: '#38BDF8' },
    error_correction: { bg: '#070A10', accent: '#F43F5E' },
    personal_story: { bg: '#0A0E17', accent: '#F59E0B' },
    exercise_breakdown: { bg: '#070A10', accent: '#10B981' },
  };
  const tDef = templateDefaults[templateId] || templateDefaults.editorial_dark;
  let bgColor = slide.bgColor || brandKit.primaryColor || tDef.bg;
  let accentColor = slide.accentColor || brandKit.accentColor || tDef.accent;

  const primaryTextColor = '#FFFFFF';
  const secondaryTextColor = templateId === 'personal_story' ? '#E2E8F0' : '#94A3B8';

  // Titolo Slide (Riga 1): Font, Dimensioni px, Colore, Grassetto, Sottolineato
  const titleColor = slide.titleColor || primaryTextColor;
  const isTitleBold = slide.titleBold !== undefined ? slide.titleBold : true;
  const isTitleUnderline = !!slide.titleUnderline;

  // Testo Evidenziato / Riga 2: Font, Dimensioni px, Colore, Grassetto, Sottolineato
  const highlightFont = slide.highlightFont || titleFont;
  const highlightFontSize = slide.highlightFontSizePx || (isCoverLayout ? Math.max(titleFontSize, 62) : titleFontSize);
  const highlightColor = slide.highlightColor || accentColor;
  const isHighlightBold = slide.highlightBold !== undefined ? slide.highlightBold : true;
  const isHighlightUnderline = !!slide.highlightUnderline;

  // Sottotitolo / Gancio Dati: Font, Dimensioni px, Colore, Grassetto, Sottolineato
  const subtitleFont = slide.subtitleFont || bodyFont;
  const defaultSubtitleSize = isCoverLayout ? 40 : 34;
  const subtitleFontSize = slide.subtitleFontSizePx || defaultSubtitleSize;
  const defaultSubtitleColor = (layout === 'dual_tone_cover' || layout === 'connected_icon_list' || layout === 'final_cta') ? '#E2E8F0' : accentColor;
  const subtitleColor = slide.subtitleColor || defaultSubtitleColor;
  const isSubtitleBold = slide.subtitleBold !== undefined ? slide.subtitleBold : true;
  const isSubtitleUnderline = !!slide.subtitleUnderline;

  // Corpo del Testo / Spiegazione: Dimensioni px, Colore, Grassetto, Sottolineato
  const defaultBodyColor = layout === 'dual_tone_cover' ? '#CBD5E1' : secondaryTextColor;
  const bodyColor = slide.bodyColor || defaultBodyColor;
  const isBodyBold = !!slide.bodyBold;
  const isBodyUnderline = !!slide.bodyUnderline;

  const isFirstSlide = slide.order === 1;
  const isLastSlide = slide.order === totalSlides;

  // ─── 1. SFONDO BASE & AMBIENT GLOW ───
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Gradienti d'atmosfera in base al template e al colore accento
  if (templateId === 'hypertrophy_science') {
    const radialGlow = ctx.createRadialGradient(CANVAS_WIDTH * 0.5, CANVAS_HEIGHT * 0.2, 50, CANVAS_WIDTH * 0.5, CANVAS_HEIGHT * 0.2, 700);
    radialGlow.addColorStop(0, 'rgba(168, 85, 247, 0.18)');
    radialGlow.addColorStop(1, 'rgba(12, 8, 26, 0)');
    ctx.fillStyle = radialGlow;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    drawTechCorners(ctx, accentColor);
  } else if (templateId === 'bold_impact' || templateId === 'editorial_dark' || templateId === 'exercise_breakdown') {
    const radialGlow = ctx.createRadialGradient(CANVAS_WIDTH * 0.85, CANVAS_HEIGHT * 0.15, 50, CANVAS_WIDTH * 0.85, CANVAS_HEIGHT * 0.15, 650);
    radialGlow.addColorStop(0, `${accentColor}1F`);
    radialGlow.addColorStop(1, 'rgba(7, 10, 16, 0)');
    ctx.fillStyle = radialGlow;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  } else if (templateId === 'coach_framework') {
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.25)';
    ctx.lineWidth = 1;
    for (let x = 60; x < CANVAS_WIDTH; x += 120) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 60; y < CANVAS_HEIGHT; y += 120) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }
  } else if (templateId === 'error_correction') {
    const topGlow = ctx.createRadialGradient(CANVAS_WIDTH * 0.2, CANVAS_HEIGHT * 0.35, 50, CANVAS_WIDTH * 0.2, CANVAS_HEIGHT * 0.35, 500);
    topGlow.addColorStop(0, 'rgba(244, 63, 94, 0.09)');
    topGlow.addColorStop(1, 'rgba(7, 10, 16, 0)');
    ctx.fillStyle = topGlow;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const botGlow = ctx.createRadialGradient(CANVAS_WIDTH * 0.8, CANVAS_HEIGHT * 0.7, 50, CANVAS_WIDTH * 0.8, CANVAS_HEIGHT * 0.7, 500);
    botGlow.addColorStop(0, 'rgba(16, 185, 129, 0.09)');
    botGlow.addColorStop(1, 'rgba(7, 10, 16, 0)');
    ctx.fillStyle = botGlow;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  // ─── 2. IMMAGINE SE PRESENTE (POSIZIONAMENTO MANUALE, ZOOM, FIT, OVERLAY) ───
  if (slide.imageUrl && layout !== 'product_breakdown') {
    try {
      const img = await loadImage(slide.imageUrl);
      const imgPos = slide.imagePosition || (layout === 'photo_dominant' ? 'top_half' : 'background_full');
      const opacity = slide.imageOpacity !== undefined ? slide.imageOpacity : 1.0;
      const zoom = slide.imageZoom || 1.0;
      const posX = slide.imagePositionX ?? 50;
      const posY = slide.imagePositionY ?? 50;
      const fit = slide.imageFit || 'cover';
      const overlayPercent = slide.imageOverlay !== undefined
        ? slide.imageOverlay / 100
        : (imgPos === 'background_full' ? 0.72 : 0);

      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      if (imgPos === 'bottom_cutout') {
        const areaH = CANVAS_HEIGHT * 0.54;
        const areaW = CANVAS_WIDTH;
        const areaY = CANVAS_HEIGHT - areaH;

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, areaY, areaW, areaH);
        ctx.clip();

        const bounds = calculateImageDrawBounds(areaW, areaH, img.width, img.height, fit, posX, posY, zoom);
        ctx.globalAlpha = opacity;
        ctx.drawImage(img, bounds.drawX, areaY + bounds.drawY, bounds.drawWidth, bounds.drawHeight);

        if (overlayPercent > 0) {
          ctx.fillStyle = `rgba(7, 10, 16, ${overlayPercent})`;
          ctx.fillRect(0, areaY, areaW, areaH);
        }
        ctx.restore();

        // Sfumatura di transizione in cima all'immagine
        const blendGrad = ctx.createLinearGradient(0, areaY - 40, 0, areaY + 80);
        blendGrad.addColorStop(0, bgColor);
        blendGrad.addColorStop(1, 'rgba(7, 10, 16, 0)');
        ctx.fillStyle = blendGrad;
        ctx.fillRect(0, areaY - 40, CANVAS_WIDTH, 120);

      } else if (imgPos === 'right_side') {
        const areaW = CANVAS_WIDTH * 0.52;
        const areaH = CANVAS_HEIGHT;
        const areaX = CANVAS_WIDTH - areaW;

        ctx.save();
        ctx.beginPath();
        ctx.rect(areaX, 0, areaW, areaH);
        ctx.clip();

        const bounds = calculateImageDrawBounds(areaW, areaH, img.width, img.height, fit, posX, posY, zoom);
        ctx.globalAlpha = opacity;
        ctx.drawImage(img, areaX + bounds.drawX, bounds.drawY, bounds.drawWidth, bounds.drawHeight);

        if (overlayPercent > 0) {
          ctx.fillStyle = `rgba(7, 10, 16, ${overlayPercent})`;
          ctx.fillRect(areaX, 0, areaW, areaH);
        }
        ctx.restore();

        // Sfumatura laterale da sinistra a destra
        const sideGrad = ctx.createLinearGradient(areaX - 60, 0, areaX + 80, 0);
        sideGrad.addColorStop(0, bgColor);
        sideGrad.addColorStop(1, 'rgba(7, 10, 16, 0)');
        ctx.fillStyle = sideGrad;
        ctx.fillRect(areaX - 60, 0, 140, CANVAS_HEIGHT);

      } else if (imgPos === 'top_half' || layout === 'photo_dominant') {
        const areaH = CANVAS_HEIGHT * 0.48;
        const areaW = CANVAS_WIDTH;

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, areaW, areaH);
        ctx.clip();

        const bounds = calculateImageDrawBounds(areaW, areaH, img.width, img.height, fit, posX, posY, zoom);
        ctx.globalAlpha = opacity;
        ctx.drawImage(img, bounds.drawX, bounds.drawY, bounds.drawWidth, bounds.drawHeight);

        if (overlayPercent > 0) {
          ctx.fillStyle = `rgba(7, 10, 16, ${overlayPercent})`;
          ctx.fillRect(0, 0, areaW, areaH);
        }
        ctx.restore();

        const blendGrad = ctx.createLinearGradient(0, areaH - 160, 0, areaH + 40);
        blendGrad.addColorStop(0, 'rgba(7, 10, 16, 0)');
        blendGrad.addColorStop(1, bgColor);
        ctx.fillStyle = blendGrad;
        ctx.fillRect(0, areaH - 160, CANVAS_WIDTH, 200);

      } else {
        // Sfondo a tutto schermo con supporto completo a zoom, fit e posizione
        ctx.save();
        const bounds = calculateImageDrawBounds(CANVAS_WIDTH, CANVAS_HEIGHT, img.width, img.height, fit, posX, posY, zoom);
        ctx.globalAlpha = opacity;
        ctx.drawImage(img, bounds.drawX, bounds.drawY, bounds.drawWidth, bounds.drawHeight);
        ctx.restore();

        // Overlay scuro progressivo
        const effOverlay = overlayPercent > 0 ? overlayPercent : 0.72;
        const overlayGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
        overlayGrad.addColorStop(0, `rgba(7, 10, 16, ${Math.min(1.0, effOverlay * 0.85)})`);
        overlayGrad.addColorStop(0.5, `rgba(7, 10, 16, ${Math.min(1.0, effOverlay)})`);
        overlayGrad.addColorStop(1, `rgba(7, 10, 16, ${Math.min(1.0, effOverlay * 1.15)})`);
        ctx.fillStyle = overlayGrad;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }
      ctx.restore();
    } catch {
      // Fallback trasparente
    }
  }

  // ─── 2b. LOGO WATERMARK IN BACKGROUND (SPECIALE PER COPERTINE, FINAL_CTA E BRANDING) ───
  const shouldShowLogoWatermark = slide.showLogoWatermarkBg ?? (layout === 'final_cta');
  if (shouldShowLogoWatermark) {
    try {
      const isBlue = slide.logoWatermarkVariant === 'blue';
      const defaultLogo = isBlue ? '/ac-logo.png' : '/ac-logo-transparent.png';
      const logoSrc = slide.logoWatermarkUrl || defaultLogo;
      const logoImg = await loadImage(logoSrc);

      const logoSize = slide.logoWatermarkSize || (layout === 'final_cta' ? 560 : (isCoverLayout ? 560 : 480));
      const defaultOpacity = isBlue ? 0.16 : 0.12;
      const logoOpacity = slide.logoWatermarkOpacity !== undefined ? slide.logoWatermarkOpacity : defaultOpacity;
      const logoX = (CANVAS_WIDTH - logoSize) / 2;
      const offsetY = slide.logoWatermarkOffsetY || 0;
      const logoY = (CANVAS_HEIGHT - logoSize) / 2 + offsetY;

      ctx.save();
      ctx.globalAlpha = Math.max(0.02, Math.min(0.60, logoOpacity));
      ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
      ctx.restore();
    } catch {
      // Fallback silenzioso
    }
  }

  // ─── 3. SAFE AREA & PADDING ───
  const marginX = 80;
  const contentWidth = CANVAS_WIDTH - marginX * 2;
  const topSafeY = 85;
  const bottomSafeY = CANVAS_HEIGHT - 85;

  // ─── 4. LOGO CARICATO IN ALTO O IN BASSO (SE PRESENTE) ───
  const hasTopLeftLogo = Boolean(brandKit.logoUrl && brandKit.logoPosition === 'top_left');
  const hasTopRightLogo = Boolean(brandKit.logoUrl && brandKit.logoPosition === 'top_right');
  const logoSize = 44;

  if (brandKit.logoUrl && brandKit.logoPosition !== 'none' && layout !== 'product_breakdown') {
    try {
      const logoImg = await loadImage(brandKit.logoUrl);
      ctx.save();
      if (brandKit.logoPosition === 'top_left') {
        // Taglio arrotondato elegante (r=10)
        ctx.beginPath();
        drawRoundedRect(ctx, marginX, topSafeY - 4, logoSize, logoSize, 10);
        ctx.clip();
        ctx.drawImage(logoImg, marginX, topSafeY - 4, logoSize, logoSize);
      } else if (brandKit.logoPosition === 'top_right') {
        ctx.beginPath();
        drawRoundedRect(ctx, CANVAS_WIDTH - marginX - logoSize, topSafeY - 4, logoSize, logoSize, 10);
        ctx.clip();
        ctx.drawImage(logoImg, CANVAS_WIDTH - marginX - logoSize, topSafeY - 4, logoSize, logoSize);
      } else if (brandKit.logoPosition === 'bottom_left') {
        ctx.beginPath();
        drawRoundedRect(ctx, marginX, bottomSafeY - 8, logoSize, logoSize, 8);
        ctx.clip();
        ctx.drawImage(logoImg, marginX, bottomSafeY - 8, logoSize, logoSize);
      }
      ctx.restore();
    } catch {}
  }

  // ─── 5. TOP BAR: CATEGORY TAG / PILLOLA TAKEAWAY & CONTATORE SLIDE ───
  const rawCategoryTag = slide.categoryTag;
  const isTecnicaBiomeccanica = Boolean(rawCategoryTag && /tecnica\s*&\s*biomeccanica/i.test(rawCategoryTag));
  const categoryTagText = !isTecnicaBiomeccanica && rawCategoryTag ? rawCategoryTag : null;
  const isStepTag = Boolean(slide.takeawayTag && /^step\s*\d+/i.test(slide.takeawayTag.trim()));

  if (layout !== 'product_breakdown') {
    if (hasTopLeftLogo) {
      // Se c'è il logo in alto a sinistra, affianchiamo la pillola del Brand o della Categoria
      const brandBadgeText = categoryTagText || (slide.takeawayTag && !isStepTag ? slide.takeawayTag : null) || brandKit.brandName;
      if (brandBadgeText) {
        ctx.save();
        const bPadX = 14;
        const bHeight = 34;
        const bStartX = marginX + logoSize + 12;
        const bStartY = topSafeY + (logoSize - bHeight) / 2 - 4;
        ctx.font = `bold 18px ${bodyFont}, system-ui, sans-serif`;
        const bWidth = ctx.measureText(brandBadgeText).width + bPadX * 2;

        ctx.fillStyle = `${accentColor}1A`;
        drawRoundedRect(ctx, bStartX, bStartY, bWidth, bHeight, 9);
        ctx.fill();

        ctx.strokeStyle = `${accentColor}4D`;
        ctx.lineWidth = 1.2;
        drawRoundedRect(ctx, bStartX, bStartY, bWidth, bHeight, 9);
        ctx.stroke();

        ctx.fillStyle = accentColor;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(brandBadgeText, bStartX + bPadX, bStartY + bHeight / 2);
        ctx.restore();
      }
    } else {
      if (categoryTagText) {
        ctx.font = `bold 20px ${bodyFont}, system-ui, sans-serif`;
        ctx.fillStyle = accentColor;
        ctx.textBaseline = 'middle';
        ctx.fillText(categoryTagText, marginX, topSafeY + 16);
      } else if (slide.takeawayTag && !isStepTag && !/tecnica\s*&\s*biomeccanica/i.test(slide.takeawayTag)) {
        // Pillola Tag esplicita personalizzata solo se non è STEP X
        const tagText = slide.takeawayTag;
        ctx.font = `bold 22px ${bodyFont}, system-ui, sans-serif`;
        const tagMetrics = ctx.measureText(tagText);
        const tagPadX = 18;
        const tagWidth = tagMetrics.width + tagPadX * 2;
        const tagHeight = 38;
        const tagStartX = marginX;

        ctx.fillStyle = `${accentColor}1F`;
        drawRoundedRect(ctx, tagStartX, topSafeY, tagWidth, tagHeight, 10);
        ctx.fill();
        ctx.strokeStyle = `${accentColor}55`;
        ctx.lineWidth = 1.5;
        drawRoundedRect(ctx, tagStartX, topSafeY, tagWidth, tagHeight, 10);
        ctx.stroke();

        ctx.fillStyle = accentColor;
        ctx.textBaseline = 'middle';
        ctx.fillText(tagText, tagStartX + tagPadX, topSafeY + tagHeight / 2);
      } else if (isFirstSlide && (brandKit.brandName || 'GUIDA PRATICA')) {
        const tagText = brandKit.brandName || 'GUIDA PRATICA';
        ctx.font = `bold 22px ${bodyFont}, system-ui, sans-serif`;
        const tagMetrics = ctx.measureText(tagText);
        const tagPadX = 18;
        const tagWidth = tagMetrics.width + tagPadX * 2;
        const tagHeight = 38;
        const tagStartX = marginX;

        ctx.fillStyle = `${accentColor}1F`;
        drawRoundedRect(ctx, tagStartX, topSafeY, tagWidth, tagHeight, 10);
        ctx.fill();
        ctx.strokeStyle = `${accentColor}55`;
        ctx.lineWidth = 1.5;
        drawRoundedRect(ctx, tagStartX, topSafeY, tagWidth, tagHeight, 10);
        ctx.stroke();

        ctx.fillStyle = accentColor;
        ctx.textBaseline = 'middle';
        ctx.fillText(tagText, tagStartX + tagPadX, topSafeY + tagHeight / 2);
      }
    }
  }

  // Contatore slide in alto a destra (con linea o frazione stile 2/8)
  const isSlideCounterVisible = settings.showSlideCounter !== false && slide.showSlideNumber !== false;
  if (isSlideCounterVisible) {
    const counterEndX = hasTopRightLogo ? CANVAS_WIDTH - marginX - logoSize - 16 : CANVAS_WIDTH - marginX;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    if (templateId === 'bold_impact' || templateId === 'hypertrophy_science') {
      ctx.font = `bold 24px ${bodyFont}, monospace`;
      ctx.fillStyle = primaryTextColor;
      ctx.fillText(`${slide.order}/${totalSlides}`, counterEndX, topSafeY + 12);
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(counterEndX - 50, topSafeY + 28);
      ctx.lineTo(counterEndX, topSafeY + 28);
      ctx.stroke();
    } else {
      const counterText = `${String(slide.order).padStart(2, '0')} / ${String(totalSlides).padStart(2, '0')}`;
      ctx.font = `bold 22px ${bodyFont}, monospace`;
      ctx.fillStyle = secondaryTextColor;
      ctx.fillText(counterText, counterEndX, topSafeY + 18);
    }
    ctx.textAlign = 'left';
  }

  // ─── 6. CONTENUTO SLIDE IN BASE AL LAYOUT SELEZIONATO ───
  const titleOffsetY = slide.titleOffsetY || 0;
  const contentOffsetY = slide.contentOffsetY || 0;
  const hasTopHeader = hasTopLeftLogo || Boolean(categoryTagText) || Boolean(slide.takeawayTag) || (isFirstSlide && Boolean(brandKit.brandName));
  const baseHeaderOffset = hasTopHeader ? 95 : 65;
  const minTitleStartY = hasTopLeftLogo ? topSafeY + logoSize + 25 : topSafeY + 45;
  const coverBaseY = isCoverLayout ? CANVAS_HEIGHT * 0.18 : topSafeY + baseHeaderOffset;
  let startY = Math.max(
    minTitleStartY,
    (layout === 'photo_dominant' ? CANVAS_HEIGHT * 0.44 : coverBaseY) + titleOffsetY
  );

  // ─── LAYOUT 1: CONNECTED ICON LIST (STILE SCREENSHOT 2: NODI CONNESSI & PAROLE CHIAVE) ───
  if (layout === 'connected_icon_list') {
    // Titolo Gigante Impatto
    startY = drawTitleLine(ctx, slide.headline, marginX, startY, contentWidth, {
      fontFamily: titleFont,
      fontSize: titleFontSize,
      color: titleColor,
      isBold: isTitleBold,
      isUnderline: isTitleUnderline,
      maxBottomY: bottomSafeY - 100,
    });

    if (slide.headlineHighlight) {
      startY = drawTitleLine(ctx, slide.headlineHighlight, marginX, startY, contentWidth, {
        fontFamily: highlightFont,
        fontSize: highlightFontSize,
        color: highlightColor,
        isBold: isHighlightBold,
        isUnderline: isHighlightUnderline,
        maxBottomY: bottomSafeY - 100,
      });
    }

    // Linea divisoria sottile
    startY += 10 + contentOffsetY;
    ctx.strokeStyle = `${accentColor}88`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(marginX, startY);
    ctx.lineTo(marginX + 80, startY);
    ctx.stroke();
    startY += 25;

    // Sottotitolo / Intro
    if (slide.subheadline) {
      ctx.textBaseline = 'top';
      startY = drawRichTextLines(ctx, slide.subheadline, marginX, startY, {
        fontFamily: subtitleFont,
        fontSize: subtitleFontSize,
        color: subtitleColor,
        isBold: isSubtitleBold,
        isUnderline: isSubtitleUnderline,
        maxWidth: contentWidth,
        maxBottomY: bottomSafeY - 100,
      });
      startY += 15;
    }

    // Nodi Connessi Verticali (solo se inseriti esplicitamente dall'utente)
    const bullets = slide.bulletPoints && slide.bulletPoints.length > 0 ? slide.bulletPoints : [];
    let nodeY = startY;

    if (bullets.length > 0) {
      const iconPool = ['🎯', '🔒', '📈', '💡', '⚡', '🏋️', '🧠'];

      bullets.forEach((bullet, idx) => {
        // Se il bullet inizia con emoji o icona specifica dell'utente, usa quella
        const emojiMatch = bullet.match(/^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Emoji})\s*/u);
        const icon = emojiMatch ? emojiMatch[1] : iconPool[idx % iconPool.length];
        const cleanBullet = emojiMatch ? bullet.slice(emojiMatch[0].length) : bullet;
        const circleRadius = 26;
        const circleCenterX = marginX + circleRadius;
        const circleCenterY = nodeY + circleRadius;

        // Cerchio nodo icona
        ctx.fillStyle = `${accentColor}1A`;
        ctx.beginPath();
        ctx.arc(circleCenterX, circleCenterY, circleRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(circleCenterX, circleCenterY, circleRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Emoji/Icona al centro
        ctx.font = '22px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(icon, circleCenterX, circleCenterY);
        ctx.textAlign = 'left';

        // Linea connettore tra i nodi
        if (idx < bullets.length - 1) {
          ctx.strokeStyle = `${accentColor}66`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(circleCenterX, circleCenterY + circleRadius);
          ctx.lineTo(circleCenterX, circleCenterY + circleRadius + 45);
          ctx.stroke();
        }

        // Testo del nodo con evidenziazione parole
        ctx.font = `500 26px ${bodyFont}, system-ui, sans-serif`;
        ctx.fillStyle = '#F8FAFC';
        ctx.textBaseline = 'middle';
        const textLines = wrapText(ctx, cleanBullet, contentWidth - 80);
        let tY = circleCenterY;
        textLines.forEach((tl) => {
          ctx.fillText(tl, marginX + 75, tY);
          tY += 34;
        });

        nodeY += Math.max(circleRadius * 2 + 45, textLines.length * 34 + 30);
      });
    }

    // Frase di chiusura / Body Text
    if (slide.bodyText) {
      startY = nodeY + 15;
      ctx.textBaseline = 'top';
      startY = drawRichTextLines(ctx, slide.bodyText, marginX, startY, {
        fontFamily: bodyFont,
        fontSize: bodyFontSize,
        color: bodyColor,
        isBold: isBodyBold,
        isUnderline: isBodyUnderline,
        maxWidth: contentWidth,
        maxBottomY: bottomSafeY - 80,
      });
    }

  // ─── LAYOUT 2: DIAGRAM FLOW (STILE SCREENSHOT 4: PREMESSA -> FRECCIA -> TASK FAILURE -> PUNCHLINE) ───
  } else if (layout === 'diagram_flow') {
    // Titolo a due toni gigante
    startY = drawTitleLine(ctx, slide.headline, marginX, startY, contentWidth, {
      fontFamily: titleFont,
      fontSize: titleFontSize,
      color: titleColor,
      isBold: isTitleBold,
      isUnderline: isTitleUnderline,
      maxBottomY: bottomSafeY - 100,
    });

    if (slide.headlineHighlight) {
      startY = drawTitleLine(ctx, slide.headlineHighlight, marginX, startY, contentWidth, {
        fontFamily: highlightFont,
        fontSize: highlightFontSize,
        color: highlightColor,
        isBold: isHighlightBold,
        isUnderline: isHighlightUnderline,
        maxBottomY: bottomSafeY - 100,
      });
    }

    startY += 15;

    // Box Premessa con barra verticale a sinistra
    if (slide.subheadline) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      const subLines = wrapText(ctx, slide.subheadline, contentWidth - 40);
      const boxH = Math.max(70, subLines.length * Math.round(subtitleFontSize * 1.4) + 26);
      drawRoundedRect(ctx, marginX, startY, contentWidth, boxH, 12);
      ctx.fill();

      // Barra laterale accent
      ctx.fillStyle = accentColor;
      ctx.fillRect(marginX, startY, 5, boxH);

      ctx.textBaseline = 'top';
      drawRichTextLines(ctx, slide.subheadline, marginX + 25, startY + 18, {
        fontFamily: subtitleFont,
        fontSize: subtitleFontSize,
        color: subtitleColor,
        isBold: isSubtitleBold,
        isUnderline: isSubtitleUnderline,
        maxWidth: contentWidth - 45,
        maxBottomY: startY + boxH - 10,
      });
      startY += boxH + 25;
    }

    // Step 1 Diagramma (solo se inserito)
    const step1 = slide.diagramStep1 || slide.bodyText;
    if (step1) {
      ctx.font = `700 26px ${bodyFont}, system-ui, sans-serif`;
      ctx.fillStyle = '#FFFFFF';
      const s1Lines = wrapText(ctx, step1, contentWidth);
      for (const l of s1Lines) {
        ctx.fillText(l, marginX, startY);
        startY += 36;
      }
    }

    // Step 2 & Risultato Evidenziato (solo se inseriti dall'utente)
    const step2 = slide.diagramStep2;
    const resultHighlight = slide.diagramHighlightResult;

    if (step2 || resultHighlight) {
      startY += 10;
      ctx.font = `900 36px ${titleFont}, system-ui, sans-serif`;
      ctx.fillStyle = accentColor;
      ctx.fillText('↓', marginX + 20, startY);
      startY += 45;

      if (step2) {
        ctx.font = `500 26px ${bodyFont}, system-ui, sans-serif`;
        ctx.fillStyle = '#CBD5E1';
        ctx.fillText(step2, marginX, startY);
        startY += 38;
      }

      if (resultHighlight) {
        ctx.font = `900 38px ${titleFont}, system-ui, sans-serif`;
        ctx.fillStyle = accentColor;
        ctx.fillText(resultHighlight, marginX, startY);
        startY += 55;
      }
    }

    // Pillola Punchline Coach (solo se inserita esplicitamente)
    const punchline = slide.punchlineQuote;
    if (punchline) {
      const punchY = Math.max(startY + 20, CANVAS_HEIGHT - 240);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      const pLines = wrapText(ctx, punchline, contentWidth - 80);
      const pH = pLines.length * 32 + 30;
      drawRoundedRect(ctx, marginX, punchY, contentWidth, pH, 16);
      ctx.fill();
      ctx.strokeStyle = `${accentColor}66`;
      ctx.lineWidth = 1.5;
      drawRoundedRect(ctx, marginX, punchY, contentWidth, pH, 16);
      ctx.stroke();

      // Avatar coach circolare
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.arc(marginX + 35, punchY + pH / 2, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '18px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('👤', marginX + 35, punchY + pH / 2);
      ctx.textAlign = 'left';

      // Testo punchline oro/accent
      ctx.font = `900 22px ${titleFont}, system-ui, sans-serif`;
      ctx.fillStyle = accentColor;
      let ptY = punchY + (pH - pLines.length * 30) / 2 + 5;
      for (const pl of pLines) {
        ctx.fillText(pl, marginX + 68, ptY);
        ptY += 30;
      }
    }

  // ─── LAYOUT 3: DUAL TONE COVER (STILE SCREENSHOT 3: TITOLO ALTERNATO BIANCO/VIOLA GIGANTE) ───
  } else if (layout === 'dual_tone_cover') {
    // Riga 1: Titolo
    startY = drawTitleLine(ctx, slide.headline, marginX, startY, contentWidth, {
      fontFamily: titleFont,
      fontSize: titleFontSize,
      color: titleColor,
      isBold: isTitleBold,
      isUnderline: isTitleUnderline,
      maxBottomY: bottomSafeY - 100,
    });

    // Riga 2: Titolo Evidenziato Accento
    if (slide.headlineHighlight) {
      startY = drawTitleLine(ctx, slide.headlineHighlight, marginX, startY, contentWidth, {
        fontFamily: highlightFont,
        fontSize: highlightFontSize,
        color: highlightColor,
        isBold: isHighlightBold,
        isUnderline: isHighlightUnderline,
        maxBottomY: bottomSafeY - 100,
      });
    }

    startY += 16 + contentOffsetY;

    // Sottotitolo / Hook
    if (slide.subheadline) {
      ctx.textBaseline = 'top';
      startY = drawRichTextLines(ctx, slide.subheadline, marginX, startY, {
        fontFamily: subtitleFont,
        fontSize: subtitleFontSize,
        color: subtitleColor,
        isBold: isSubtitleBold,
        isUnderline: isSubtitleUnderline,
        maxWidth: contentWidth,
        maxBottomY: bottomSafeY - 100,
      });
      startY += 18;
    }

    // Statistica / Numero in evidenza (se presente)
    if (slide.statNumber) {
      ctx.font = `900 64px "${titleFont}", system-ui, sans-serif`;
      ctx.fillStyle = accentColor;
      ctx.fillText(slide.statNumber, marginX, startY);
      startY += 72;
    }

    // Corpo del Testo (spiegazione/paragrafo cover)
    if (slide.bodyText) {
      startY += 8;
      ctx.textBaseline = 'top';
      startY = drawRichTextLines(ctx, slide.bodyText, marginX, startY, {
        fontFamily: bodyFont,
        fontSize: bodyFontSize,
        color: bodyColor,
        isBold: isBodyBold,
        isUnderline: isBodyUnderline,
        maxWidth: contentWidth,
        maxBottomY: bottomSafeY - 110,
      });
      startY += 16;
    }

    // Punti Elenco (se presenti)
    if (slide.bulletPoints && slide.bulletPoints.length > 0) {
      startY += 8;
      for (const bp of slide.bulletPoints) {
        if (startY > bottomSafeY - 110) break;
        ctx.font = `600 ${bodyFontSize}px ${bodyFont}, system-ui, sans-serif`;
        ctx.fillStyle = accentColor;
        ctx.fillText('•', marginX, startY);
        ctx.fillStyle = '#F8FAFC';
        const bpLines = wrapText(ctx, bp, contentWidth - 42);
        for (const bpl of bpLines) {
          ctx.fillText(bpl, marginX + 30, startY);
          startY += bodyFontSize + 12;
        }
        startY += 8;
      }
      startY += 14;
    }

    // Box CTA / Punchline opzionale (mostrato solo se configurato esplicitamente)
    if (slide.punchlineQuote) {
      const swipeY = Math.min(
        Math.max(startY + 30, CANVAS_HEIGHT - 220),
        bottomSafeY - 95
      );
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      drawRoundedRect(ctx, marginX, swipeY, contentWidth, 70, 16);
      ctx.fill();
      ctx.strokeStyle = `${accentColor}55`;
      ctx.lineWidth = 1.5;
      drawRoundedRect(ctx, marginX, swipeY, contentWidth, 70, 16);
      ctx.stroke();

      ctx.font = `bold 24px ${bodyFont}, system-ui, sans-serif`;
      ctx.fillStyle = accentColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(slide.punchlineQuote, CANVAS_WIDTH / 2, swipeY + 35);
      ctx.textAlign = 'left';
    }

  // ─── LAYOUT A: ERROR VS CORRECT (CONFRONTO SPLIT) ───
  } else if (layout === 'error_vs_correct') {
    startY = drawTitleLine(ctx, slide.headline, marginX, startY, contentWidth, {
      fontFamily: titleFont,
      fontSize: titleFontSize,
      color: titleColor,
      isBold: isTitleBold,
      isUnderline: isTitleUnderline,
      maxBottomY: bottomSafeY - 100,
    });

    if (slide.headlineHighlight) {
      startY += 4;
      startY = drawTitleLine(ctx, slide.headlineHighlight, marginX, startY, contentWidth, {
        fontFamily: highlightFont,
        fontSize: highlightFontSize,
        color: highlightColor,
        isBold: isHighlightBold,
        isUnderline: isHighlightUnderline,
        maxBottomY: bottomSafeY - 100,
      });
    }

    if (slide.subheadline) {
      startY += 10;
      ctx.textBaseline = 'top';
      startY = drawRichTextLines(ctx, slide.subheadline, marginX, startY, {
        fontFamily: subtitleFont,
        fontSize: subtitleFontSize,
        color: subtitleColor,
        isBold: isSubtitleBold,
        isUnderline: isSubtitleUnderline,
        maxWidth: contentWidth,
        maxBottomY: bottomSafeY - 100,
      });
    }

    if (slide.bodyText && slide.bodyText !== slide.wrongText) {
      startY += 10;
      ctx.textBaseline = 'top';
      startY = drawRichTextLines(ctx, slide.bodyText, marginX, startY, {
        fontFamily: bodyFont,
        fontSize: bodyFontSize,
        color: bodyColor,
        isBold: isBodyBold,
        isUnderline: isBodyUnderline,
        maxWidth: contentWidth,
        maxBottomY: bottomSafeY - 100,
      });
    }

    const wrongText = slide.wrongText?.trim();
    const correctText = slide.correctText?.trim();
    const wrongTitle = slide.wrongTitle?.trim();
    const correctTitle = slide.correctTitle?.trim();

    // BOX ❌ ERRORE (Rosso) - solo se compilato dall'utente
    if (wrongText) {
      startY += 15;
      const wrongBoxY = startY;
      ctx.font = `500 25px ${bodyFont}, system-ui, sans-serif`;
      const wrongLines = wrapText(ctx, wrongText, contentWidth - 50);
      const hasWrongTitle = Boolean(wrongTitle);
      const wrongBoxHeight = Math.max(80, (hasWrongTitle ? 65 : 25) + wrongLines.length * 36 + 20);

      ctx.fillStyle = 'rgba(244, 63, 94, 0.08)';
      drawRoundedRect(ctx, marginX, wrongBoxY, contentWidth, wrongBoxHeight, 18);
      ctx.fill();
      ctx.strokeStyle = 'rgba(244, 63, 94, 0.35)';
      ctx.lineWidth = 1.5;
      drawRoundedRect(ctx, marginX, wrongBoxY, contentWidth, wrongBoxHeight, 18);
      ctx.stroke();

      if (hasWrongTitle) {
        ctx.font = `900 24px ${titleFont}, system-ui, sans-serif`;
        ctx.fillStyle = '#F43F5E';
        ctx.fillText(wrongTitle!, marginX + 25, wrongBoxY + 30);
      }

      ctx.font = `500 25px ${bodyFont}, system-ui, sans-serif`;
      ctx.fillStyle = '#FFE4E6';
      let wY = wrongBoxY + (hasWrongTitle ? 70 : 30);
      for (const line of wrongLines) {
        ctx.fillText(line, marginX + 25, wY);
        wY += 36;
      }

      startY = wrongBoxY + wrongBoxHeight;
    }

    // BOX ✅ CORREZIONE (Verde) - solo se compilato dall'utente
    if (correctText) {
      startY += 15;
      const correctBoxY = startY;
      ctx.font = `500 25px ${bodyFont}, system-ui, sans-serif`;
      const correctLines = wrapText(ctx, correctText, contentWidth - 50);
      const hasCorrectTitle = Boolean(correctTitle);
      const correctBoxHeight = Math.max(80, (hasCorrectTitle ? 65 : 25) + correctLines.length * 36 + 20);

      ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
      drawRoundedRect(ctx, marginX, correctBoxY, contentWidth, correctBoxHeight, 18);
      ctx.fill();
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
      ctx.lineWidth = 1.5;
      drawRoundedRect(ctx, marginX, correctBoxY, contentWidth, correctBoxHeight, 18);
      ctx.stroke();

      if (hasCorrectTitle) {
        ctx.font = `900 24px ${titleFont}, system-ui, sans-serif`;
        ctx.fillStyle = '#10B981';
        ctx.fillText(correctTitle!, marginX + 25, correctBoxY + 30);
      }

      ctx.font = `500 25px ${bodyFont}, system-ui, sans-serif`;
      ctx.fillStyle = '#D1FAE5';
      let cY = correctBoxY + (hasCorrectTitle ? 70 : 30);
      for (const line of correctLines) {
        ctx.fillText(line, marginX + 25, cY);
        cY += 36;
      }

      startY = correctBoxY + correctBoxHeight;
    }

  // ─── LAYOUT B: NUMBERED LIST / ELENCO PUNTATO CON CARD ───
  } else if (layout === 'numbered_list') {
    startY = drawTitleLine(ctx, slide.headline, marginX, startY, contentWidth, {
      fontFamily: titleFont,
      fontSize: titleFontSize,
      color: titleColor,
      isBold: isTitleBold,
      isUnderline: isTitleUnderline,
      maxBottomY: bottomSafeY - 100,
    });

    if (slide.headlineHighlight) {
      startY += 4;
      startY = drawTitleLine(ctx, slide.headlineHighlight, marginX, startY, contentWidth, {
        fontFamily: highlightFont,
        fontSize: highlightFontSize,
        color: highlightColor,
        isBold: isHighlightBold,
        isUnderline: isHighlightUnderline,
        maxBottomY: bottomSafeY - 100,
      });
    }

    if (slide.subheadline) {
      startY += 10;
      ctx.textBaseline = 'top';
      startY = drawRichTextLines(ctx, slide.subheadline, marginX, startY, {
        fontFamily: subtitleFont,
        fontSize: subtitleFontSize,
        color: subtitleColor,
        isBold: isSubtitleBold,
        isUnderline: isSubtitleUnderline,
        maxWidth: contentWidth,
        maxBottomY: bottomSafeY - 100,
      });
      startY += 10;
    }

    // Se c'è bodyText (intro/spiegazione) e ci sono anche bulletPoints, mostriamolo prima delle card
    if (slide.bodyText && slide.bulletPoints && slide.bulletPoints.length > 0) {
      ctx.textBaseline = 'top';
      startY = drawRichTextLines(ctx, slide.bodyText, marginX, startY, {
        fontFamily: bodyFont,
        fontSize: bodyFontSize,
        color: bodyColor,
        isBold: isBodyBold,
        isUnderline: isBodyUnderline,
        maxWidth: contentWidth,
        maxBottomY: bottomSafeY - 100,
      });
      startY += 15;
    }

    startY += 15;

    const bullets = slide.bulletPoints && slide.bulletPoints.length > 0 ? slide.bulletPoints : (slide.bodyText ? [slide.bodyText] : []);
    let num = 1;
    for (const b of bullets) {
      ctx.font = `500 ${bodyFontSize}px ${bodyFont}, system-ui, sans-serif`;
      const bLines = wrapText(ctx, b.replace(/^[0-9•✅❌-]\.?\s*/, ''), contentWidth - 90);
      const cardHeight = Math.max(90, bLines.length * (bodyFontSize + 10) + 40);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      drawRoundedRect(ctx, marginX, startY, contentWidth, cardHeight, 16);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      drawRoundedRect(ctx, marginX, startY, contentWidth, cardHeight, 16);
      ctx.stroke();

      // Badge numerico circolare
      ctx.fillStyle = `${accentColor}2A`;
      ctx.beginPath();
      ctx.arc(marginX + 38, startY + cardHeight / 2, 22, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = `bold 22px ${bodyFont}, monospace`;
      ctx.fillStyle = accentColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(num), marginX + 38, startY + cardHeight / 2);
      ctx.textAlign = 'left';

      // Testo riga
      ctx.font = `500 ${bodyFontSize}px ${bodyFont}, system-ui, sans-serif`;
      ctx.fillStyle = '#F1F5F9';
      let bTextY = startY + (cardHeight - bLines.length * (bodyFontSize + 10)) / 2 + 8;
      for (const bl of bLines) {
        ctx.fillText(bl, marginX + 75, bTextY);
        bTextY += bodyFontSize + 10;
      }

      startY += cardHeight + 16;
      num++;
    }

  // ─── LAYOUT C: STEP BY STEP / PROGRESSIONE TIMELINE ───
  } else if (layout === 'step_by_step') {
    startY = drawTitleLine(ctx, slide.headline, marginX, startY, contentWidth, {
      fontFamily: titleFont,
      fontSize: titleFontSize,
      color: titleColor,
      isBold: isTitleBold,
      isUnderline: isTitleUnderline,
      maxBottomY: bottomSafeY - 100,
    });

    if (slide.headlineHighlight) {
      startY += 4;
      startY = drawTitleLine(ctx, slide.headlineHighlight, marginX, startY, contentWidth, {
        fontFamily: highlightFont,
        fontSize: highlightFontSize,
        color: highlightColor,
        isBold: isHighlightBold,
        isUnderline: isHighlightUnderline,
        maxBottomY: bottomSafeY - 100,
      });
    }

    if (slide.subheadline) {
      startY += 10;
      ctx.textBaseline = 'top';
      startY = drawRichTextLines(ctx, slide.subheadline, marginX, startY, {
        fontFamily: subtitleFont,
        fontSize: subtitleFontSize,
        color: subtitleColor,
        isBold: isSubtitleBold,
        isUnderline: isSubtitleUnderline,
        maxWidth: contentWidth,
        maxBottomY: bottomSafeY - 100,
      });
    }

    // Intro se presente insieme a step
    if (slide.bodyText && slide.bulletPoints && slide.bulletPoints.length > 0) {
      startY += 12;
      ctx.textBaseline = 'top';
      startY = drawRichTextLines(ctx, slide.bodyText, marginX, startY, {
        fontFamily: bodyFont,
        fontSize: bodyFontSize,
        color: bodyColor,
        isBold: isBodyBold,
        isUnderline: isBodyUnderline,
        maxWidth: contentWidth,
        maxBottomY: bottomSafeY - 100,
      });
      startY += 15;
    } else {
      startY += 25;
    }

    const steps = slide.bulletPoints && slide.bulletPoints.length > 0 ? slide.bulletPoints : (slide.bodyText ? [slide.bodyText] : []);
    let stepIdx = 1;

    for (const st of steps) {
      // Se il testo dell'utente specifica una label custom (es. "FASE 1:", "PARTE 1:", "REGOLA:"), usa quella
      const customLabelMatch = st.match(/^([A-ZÀ-Úa-zà-ù0-9\s#]+:)\s*(.*)/);
      const stepLabel = customLabelMatch ? customLabelMatch[1].replace(/:$/, '').trim() : `STEP ${stepIdx}`;
      const stepContent = customLabelMatch ? customLabelMatch[2] : st.replace(/^(?:Step\s*\d+:?|[-•])\s*/i, '');

      ctx.font = `bold 22px ${bodyFont}, system-ui, sans-serif`;
      ctx.fillStyle = accentColor;
      ctx.fillText(stepLabel, marginX + 60, startY);

      ctx.font = `500 ${bodyFontSize}px ${bodyFont}, system-ui, sans-serif`;
      const stepLines = wrapText(ctx, stepContent, contentWidth - 70);
      let sY = startY + 34;
      for (const sl of stepLines) {
        ctx.fillStyle = '#E2E8F0';
        ctx.fillText(sl, marginX + 60, sY);
        sY += bodyFontSize + 10;
      }

      // Pallino timeline
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.arc(marginX + 20, startY + 12, 10, 0, Math.PI * 2);
      ctx.fill();

      if (stepIdx < steps.length) {
        ctx.strokeStyle = `${accentColor}55`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(marginX + 20, startY + 26);
        ctx.lineTo(marginX + 20, sY + 16);
        ctx.stroke();
      }

      startY = sY + 26;
      stepIdx++;
    }

  // ─── LAYOUT D: TEXT CENTER / COPERTINA (DEFAULT COVER) ───
  } else if (layout === 'text_center') {
    ctx.textAlign = 'center';
    


    // Titolo Gigante Centrato
    startY = drawTitleLine(ctx, slide.headline, CANVAS_WIDTH / 2, startY, contentWidth, {
      fontFamily: titleFont,
      fontSize: titleFontSize,
      color: titleColor,
      isBold: isTitleBold,
      isUnderline: isTitleUnderline,
      align: 'center',
      maxBottomY: bottomSafeY - 100,
    });

    // Headline Highlight (seconda riga) se presente
    if (slide.headlineHighlight) {
      startY = drawTitleLine(ctx, slide.headlineHighlight, CANVAS_WIDTH / 2, startY, contentWidth, {
        fontFamily: highlightFont,
        fontSize: highlightFontSize,
        color: highlightColor,
        isBold: isHighlightBold,
        isUnderline: isHighlightUnderline,
        align: 'center',
        maxBottomY: bottomSafeY - 100,
      });
    }

    startY += 25 + contentOffsetY;

    // Linea divisoria oro centrata
    ctx.fillStyle = accentColor;
    ctx.fillRect(CANVAS_WIDTH / 2 - 120, startY, 240, 4);
    startY += 40;

    // Sottotitolo centrato
    if (slide.subheadline) {
      ctx.textBaseline = 'top';
      startY = drawRichTextLines(ctx, slide.subheadline, CANVAS_WIDTH / 2, startY, {
        fontFamily: subtitleFont,
        fontSize: subtitleFontSize,
        color: subtitleColor,
        isBold: isSubtitleBold,
        isUnderline: isSubtitleUnderline,
        maxWidth: contentWidth,
        align: 'center',
        maxBottomY: bottomSafeY - 100,
      });
      startY += 15;
    }

    // Statistica / Numero in evidenza (se presente)
    if (slide.statNumber) {
      ctx.font = `900 48px "${titleFont}", system-ui, sans-serif`;
      ctx.fillStyle = accentColor;
      ctx.fillText(slide.statNumber, CANVAS_WIDTH / 2, startY);
      startY += 56;
    }

    // Corpo del Testo centrato (se presente)
    if (slide.bodyText) {
      ctx.textBaseline = 'top';
      startY = drawRichTextLines(ctx, slide.bodyText, CANVAS_WIDTH / 2, startY, {
        fontFamily: bodyFont,
        fontSize: bodyFontSize,
        color: bodyColor,
        isBold: isBodyBold,
        isUnderline: isBodyUnderline,
        maxWidth: contentWidth - 40,
        align: 'center',
        maxBottomY: bottomSafeY - 110,
      });
      startY += 15;
    }

    // Punti Elenco centrati (se presenti)
    if (slide.bulletPoints && slide.bulletPoints.length > 0) {
      for (const bp of slide.bulletPoints) {
        if (startY > bottomSafeY - 110) break;
        ctx.font = `500 ${bodyFontSize}px ${bodyFont}, system-ui, sans-serif`;
        ctx.fillStyle = '#F8FAFC';
        const bpLines = wrapText(ctx, `• ${bp}`, contentWidth - 60);
        for (const bpl of bpLines) {
          ctx.fillText(bpl, CANVAS_WIDTH / 2, startY);
          startY += bodyFontSize + 12;
        }
        startY += 6;
      }
      startY += 15;
    }

    // Box swipe / CTA in copertina (mostrato solo se esplicitamente configurato in punchlineQuote)
    if (slide.punchlineQuote) {
      const swipeY = Math.min(
        Math.max(startY + 35, CANVAS_HEIGHT - 260),
        bottomSafeY - 95
      );
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      drawRoundedRect(ctx, marginX, swipeY, contentWidth, 75, 16);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      drawRoundedRect(ctx, marginX, swipeY, contentWidth, 75, 16);
      ctx.stroke();

      ctx.font = `bold 24px ${bodyFont}, system-ui, sans-serif`;
      ctx.fillStyle = accentColor;
      ctx.textBaseline = 'middle';
      ctx.fillText(slide.punchlineQuote, CANVAS_WIDTH / 2, swipeY + 37.5);
    }
    ctx.textAlign = 'left';

  // ─── LAYOUT E: FINAL CTA / CHIUSURA BRAND ───
  } else if (layout === 'final_cta') {
    const hasTopTitle = Boolean(slide.headline && slide.headline.trim());
    const hasHighlight = Boolean(slide.headlineHighlight && slide.headlineHighlight.trim());
    const hasSubtitle = Boolean(slide.subheadline && slide.subheadline.trim());

    if (hasTopTitle) {
      startY = drawTitleLine(ctx, slide.headline, marginX, startY, contentWidth, {
        fontFamily: titleFont,
        fontSize: titleFontSize,
        color: titleColor,
        isBold: isTitleBold,
        isUnderline: isTitleUnderline,
        maxBottomY: bottomSafeY - 100,
      });
    }

    if (hasHighlight && slide.headlineHighlight) {
      startY += 6;
      startY = drawTitleLine(ctx, slide.headlineHighlight, marginX, startY, contentWidth, {
        fontFamily: highlightFont,
        fontSize: highlightFontSize,
        color: highlightColor,
        isBold: isHighlightBold,
        isUnderline: isHighlightUnderline,
        maxBottomY: bottomSafeY - 100,
      });
    }

    if (hasSubtitle && slide.subheadline) {
      startY += 16;
      ctx.textBaseline = 'top';
      startY = drawRichTextLines(ctx, slide.subheadline, marginX, startY, {
        fontFamily: subtitleFont,
        fontSize: subtitleFontSize,
        color: subtitleColor,
        isBold: isSubtitleBold,
        isUnderline: isSubtitleUnderline,
        maxWidth: contentWidth,
        maxBottomY: bottomSafeY - 100,
      });
    }

    // Calcolo dinamico dell'altezza e posizionamento del box CTA per evitare sovrapposizioni tra testo e firma
    ctx.font = `500 ${bodyFontSize}px ${bodyFont}, system-ui, sans-serif`;
    const ctaBodyLines = slide.bodyText ? wrapText(ctx, slide.bodyText, contentWidth - 76) : [];
    const bodyTextHeight = ctaBodyLines.length > 0 ? ctaBodyLines.length * (bodyFontSize + 12) : 0;
    
    // Controlla se il testo già contiene la firma dell'autore per non duplicarla
    const bodyAlreadyHasSignature = Boolean(
      slide.bodyText && (
        slide.bodyText.toLowerCase().includes('antonio crapanzano') ||
        (brandKit.authorSignature && slide.bodyText.includes(brandKit.authorSignature))
      )
    );
    const signatureHeight = (!bodyAlreadyHasSignature && brandKit.authorSignature) ? 40 : 10;
    const ctaTitle = slide.ctaBoxTitle !== undefined ? slide.ctaBoxTitle.trim() : (slide.punchlineQuote?.trim() || '');
    const hasCtaTitle = Boolean(ctaTitle);
    const boxPaddingTop = hasCtaTitle ? (ctaBodyLines.length > 0 ? 80 : 50) : 36;
    const boxBottomPadding = 30;
    const totalBoxHeight = Math.max(120, boxPaddingTop + bodyTextHeight + signatureHeight + boxBottomPadding);

    // Posizionamento del box: se non c'è titolo/sottotitolo in cima, centra otticamente il box nel canvas!
    let ctaBoxY: number;
    const topLimit = hasTopLeftLogo ? topSafeY + logoSize + 40 : topSafeY + 55;
    const bottomLimit = bottomSafeY - 25;

    if (!hasTopTitle && !hasHighlight && !hasSubtitle) {
      const availableH = bottomLimit - topLimit;
      ctaBoxY = Math.max(topLimit, Math.round(topLimit + (availableH - totalBoxHeight) / 2) + titleOffsetY);
    } else {
      const remainingSpace = bottomLimit - (startY + 25);
      if (remainingSpace > totalBoxHeight) {
        ctaBoxY = Math.round((startY + 25) + (remainingSpace - totalBoxHeight) / 2 + titleOffsetY);
      } else {
        ctaBoxY = Math.min(startY + 25 + titleOffsetY, bottomLimit - totalBoxHeight);
      }
    }

    // Sfondo del Box CTA: satinato scuro semitrasparente con riflesso elegante
    ctx.save();
    const boxGrad = ctx.createLinearGradient(marginX, ctaBoxY, marginX + contentWidth, ctaBoxY + totalBoxHeight);
    boxGrad.addColorStop(0, `${accentColor}1A`);
    boxGrad.addColorStop(1, 'rgba(10, 15, 26, 0.88)');
    ctx.fillStyle = boxGrad;
    drawRoundedRect(ctx, marginX, ctaBoxY, contentWidth, totalBoxHeight, 28);
    ctx.fill();

    // Bordo box
    ctx.strokeStyle = `${accentColor}99`;
    ctx.lineWidth = 2.5;
    drawRoundedRect(ctx, marginX, ctaBoxY, contentWidth, totalBoxHeight, 28);
    ctx.stroke();

    // Glow accento nell'angolo in alto a sinistra del box
    const cornerGlow = ctx.createRadialGradient(marginX + 50, ctaBoxY + 40, 0, marginX + 50, ctaBoxY + 40, 220);
    cornerGlow.addColorStop(0, `${accentColor}25`);
    cornerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = cornerGlow;
    drawRoundedRect(ctx, marginX, ctaBoxY, contentWidth, totalBoxHeight, 28);
    ctx.fill();
    ctx.restore();

    // Titolo Box CTA (mostrato solo se definito esplicitamente dall'utente)
    if (hasCtaTitle) {
      ctx.font = `900 32px ${titleFont}, system-ui, sans-serif`;
      ctx.fillStyle = accentColor;
      ctx.fillText(ctaTitle, marginX + 38, ctaBoxY + 38);
    }

    // Testo del corpo dinamico (solo se presente testo effettivo)
    let currentY = ctaBoxY + (hasCtaTitle ? 82 : 36);
    if (ctaBodyLines.length > 0) {
      ctx.font = `${isBodyBold ? 'bold' : '500'} ${bodyFontSize}px "${bodyFont}", system-ui, sans-serif`;
      ctx.fillStyle = slide.bodyColor || '#FEF3C7';
      for (const bl of ctaBodyLines) {
        ctx.fillText(bl, marginX + 38, currentY);
        if (isBodyUnderline && bl.trim()) {
          const textW = ctx.measureText(bl).width;
          ctx.fillRect(marginX + 38, currentY + Math.round(bodyFontSize * 0.95), textW, Math.max(2, Math.round(bodyFontSize * 0.08)));
        }
        currentY += bodyFontSize + 12;
      }
    } else {
      currentY = ctaBoxY + (hasCtaTitle ? 52 : 28);
    }

    // Firma Brand posizionata SEMPRE sotto al testo (se non già presente nel corpo)
    if (!bodyAlreadyHasSignature && brandKit.authorSignature) {
      currentY += 15;
      ctx.font = `600 22px ${bodyFont}, system-ui, sans-serif`;
      ctx.fillStyle = '#94A3B8';
      ctx.fillText(brandKit.authorSignature, marginX + 38, currentY);
    }

  // ─── LAYOUT F: PRODUCT / EXERCISE BREAKDOWN (INFOGRAFICA 4 CALLOUT CON SOGGETTO CENTRALE & PUNTATORI) ───
  } else if (layout === 'product_breakdown') {
    // 1. Banner Superiore Orizzontale (Sito Web / Handle) - solo se specificato
    const bannerStr = slide.topBannerText?.trim();
    if (bannerStr) {
      ctx.save();
      const bannerH = 42;
      ctx.font = `italic 700 20px ${bodyFont}, monospace`;
      const bannerW = Math.min(520, ctx.measureText(bannerStr).width + 48);
      const bannerX = (CANVAS_WIDTH - bannerW) / 2;
      const bannerY = topSafeY - 10;
      ctx.fillStyle = `${accentColor}22`;
      drawRoundedRect(ctx, bannerX, bannerY, bannerW, bannerH, 21);
      ctx.fill();
      ctx.strokeStyle = `${accentColor}88`;
      ctx.lineWidth = 1.5;
      drawRoundedRect(ctx, bannerX, bannerY, bannerW, bannerH, 21);
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = accentColor;
      ctx.fillText(bannerStr, CANVAS_WIDTH / 2, bannerY + bannerH / 2);
      ctx.restore();
    }

    // 2. Titolo & Highlight Centrati in Alto (spaziati in modo ottimale)
    let pTitleY = (bannerStr ? topSafeY + 48 : topSafeY + 8) + titleOffsetY;
    const pTitleSize = slide.titleFontSizePx || (slide.titleSize === 'xl' ? 52 : slide.titleSize === 'lg' ? 44 : 38);

    pTitleY = drawTitleLine(ctx, slide.headline, CANVAS_WIDTH / 2, pTitleY, contentWidth - 40, {
      fontFamily: titleFont,
      fontSize: pTitleSize,
      color: titleColor,
      isBold: isTitleBold,
      isUnderline: isTitleUnderline,
      align: 'center',
      maxBottomY: CANVAS_HEIGHT * 0.45,
    });

    if (slide.headlineHighlight) {
      pTitleY += 4;
      pTitleY = drawTitleLine(ctx, slide.headlineHighlight, CANVAS_WIDTH / 2, pTitleY, contentWidth - 40, {
        fontFamily: highlightFont,
        fontSize: slide.highlightFontSizePx || pTitleSize,
        color: highlightColor,
        isBold: isHighlightBold,
        isUnderline: isHighlightUnderline,
        align: 'center',
        maxBottomY: CANVAS_HEIGHT * 0.48,
      });
    }

    // 3. Soggetto Centrale & Alone Luminoso
    const centerX = CANVAS_WIDTH / 2;
    const centerY = Math.max(CANVAS_HEIGHT * 0.53, pTitleY + 210) + contentOffsetY;
    const pBoxW = 340;
    const pBoxH = 340;

    // Alone luminoso di contrasto dietro al soggetto centrale
    const pGlow = ctx.createRadialGradient(centerX, centerY, 40, centerX, centerY, 240);
    pGlow.addColorStop(0, `${accentColor}2A`);
    pGlow.addColorStop(0.6, 'rgba(30, 41, 59, 0.35)');
    pGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = pGlow;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 240, 0, Math.PI * 2);
    ctx.fill();

    // Disegno Immagine Soggetto Centrale o Placeholder Elegante
    const boxX = centerX - pBoxW / 2;
    const boxY = centerY - pBoxH / 2;

    if (slide.imageUrl) {
      try {
        const prodImg = await loadImage(slide.imageUrl);
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 30;
        ctx.shadowOffsetY = 14;

        // Clip arrotondata per l'immagine centrale
        ctx.beginPath();
        drawRoundedRect(ctx, boxX, boxY, pBoxW, pBoxH, 24);
        ctx.clip();

        // Background scuro dentro il riquadro
        ctx.fillStyle = '#090D16';
        ctx.fillRect(boxX, boxY, pBoxW, pBoxH);

        const imgAspect = prodImg.width / prodImg.height;
        const boxAspect = pBoxW / pBoxH;
        let dw = pBoxW;
        let dh = pBoxH;
        let dx = boxX;
        let dy = boxY;

        if (slide.imageFit === 'contain') {
          if (imgAspect > boxAspect) {
            dh = pBoxW / imgAspect;
            dy = boxY + (pBoxH - dh) / 2;
          } else {
            dw = pBoxH * imgAspect;
            dx = boxX + (pBoxW - dw) / 2;
          }
        } else {
          // Default cover
          if (imgAspect > boxAspect) {
            dw = pBoxH * imgAspect;
            dx = boxX - (dw - pBoxW) / 2;
          } else {
            dh = pBoxW / imgAspect;
            dy = boxY - (dh - pBoxH) / 2;
          }
        }

        ctx.drawImage(prodImg, dx, dy, dw, dh);
        ctx.restore();

        // Bordo di contorno al box centrale con immagine
        ctx.save();
        ctx.strokeStyle = `${accentColor}55`;
        ctx.lineWidth = 2.5;
        drawRoundedRect(ctx, boxX, boxY, pBoxW, pBoxH, 24);
        ctx.stroke();
        ctx.restore();
      } catch {
        // Fallback se errore nel caricamento immagine
      }
    } else {
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = `${accentColor}44`;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      drawRoundedRect(ctx, boxX, boxY, pBoxW, pBoxH, 24);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '36px system-ui';
      ctx.fillText('📷', centerX, centerY - 35);
      ctx.font = `bold 22px ${titleFont}, system-ui, sans-serif`;
      ctx.fillStyle = accentColor;
      ctx.fillText('SOGGETTO CENTRALE', centerX, centerY + 8);
      ctx.font = `500 15px ${bodyFont}, system-ui, sans-serif`;
      ctx.fillStyle = '#94A3B8';
      ctx.fillText('Carica la foto dall\'editor', centerX, centerY + 34);
      ctx.restore();
    }

    // 4. I 4 Quadranti di Callout (Card Eleganti e Connessioni a Puntatore)
    const cardW = 270;
    const leftColX = 55;
    const rightColX = CANVAS_WIDTH - 55 - cardW; // 755

    const renderCalloutCard = (
      x: number,
      y: number,
      title: string,
      text: string,
      badgeNumber: string,
      isRightSide: boolean
    ) => {
      ctx.save();
      const padX = 18;
      const padY = 14;
      const innerW = cardW - padX * 2;

      ctx.font = `bold 20px ${titleFont}, system-ui, sans-serif`;
      const tLines = title ? wrapText(ctx, title, innerW) : [];
      const titleH = tLines.length > 0 ? tLines.length * 26 + 6 : 0;

      ctx.font = `500 16px ${bodyFont}, system-ui, sans-serif`;
      const bLines = text ? wrapText(ctx, text, innerW) : [];
      const bodyH = bLines.length * 22;

      const cardH = Math.max(115, padY * 2 + titleH + bodyH);

      // Card Background (dark glassmorphism)
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      drawRoundedRect(ctx, x, y, cardW, cardH, 18);
      ctx.fill();

      // Card Border
      ctx.strokeStyle = `${accentColor}33`;
      ctx.lineWidth = 1.5;
      drawRoundedRect(ctx, x, y, cardW, cardH, 18);
      ctx.stroke();

      // Badge numerico (es. 01, 02) nell'angolo
      ctx.font = `900 14px ${bodyFont}, monospace`;
      ctx.fillStyle = `${accentColor}99`;
      ctx.textAlign = isRightSide ? 'right' : 'left';
      ctx.textBaseline = 'top';
      const badgeX = isRightSide ? x + cardW - padX : x + padX;
      ctx.fillText(badgeNumber, badgeX, y + 10);

      // Titolo Callout
      ctx.textAlign = 'left';
      let curY = y + padY + 14;
      if (tLines.length > 0) {
        ctx.font = `bold 19px ${titleFont}, system-ui, sans-serif`;
        ctx.fillStyle = accentColor;
        for (const tl of tLines) {
          ctx.fillText(tl, x + padX, curY);
          curY += 24;
        }
        curY += 4;
      }

      // Testo Callout
      if (bLines.length > 0) {
        ctx.font = `500 16px ${bodyFont}, system-ui, sans-serif`;
        ctx.fillStyle = '#CBD5E1';
        for (const bl of bLines) {
          ctx.fillText(bl, x + padX, curY);
          curY += 22;
        }
      }

      // Linea di collegamento a puntatore verso il box centrale
      const pointerY = y + cardH / 2;
      ctx.strokeStyle = `${accentColor}66`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      if (!isRightSide) {
        ctx.moveTo(x + cardW, pointerY);
        ctx.lineTo(boxX, pointerY);
      } else {
        ctx.moveTo(x, pointerY);
        ctx.lineTo(boxX + pBoxW, pointerY);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Pallino accento sul punto di contatto del box centrale
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      const dotX = !isRightSide ? boxX : boxX + pBoxW;
      ctx.arc(dotX, pointerY, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    const q1 = slide.calloutTopLeft;
    const q2 = slide.calloutTopRight;
    const q3 = slide.calloutBottomLeft;
    const q4 = slide.calloutBottomRight;

    const topCardY = centerY - 170;
    const botCardY = centerY + 15;

    // ↖️ Quadrante Alto-Sinistra
    if (q1 && (q1.title?.trim() || q1.text?.trim())) {
      renderCalloutCard(leftColX, topCardY, q1.title || '', q1.text || '', '01', false);
    }
    // ↗️ Quadrante Alto-Destra
    if (q2 && (q2.title?.trim() || q2.text?.trim())) {
      renderCalloutCard(rightColX, topCardY, q2.title || '', q2.text || '', '02', true);
    }
    // ↙️ Quadrante Basso-Sinistra
    if (q3 && (q3.title?.trim() || q3.text?.trim())) {
      renderCalloutCard(leftColX, botCardY, q3.title || '', q3.text || '', '03', false);
    }
    // ↘️ Quadrante Basso-Destra
    if (q4 && (q4.title?.trim() || q4.text?.trim())) {
      renderCalloutCard(rightColX, botCardY, q4.title || '', q4.text || '', '04', true);
    }

    // 5. Footer con Badge Autore & Logo
    const footerY = CANVAS_HEIGHT - 120;
    const badgeW = 340;
    const badgeH = 68;

    // Card Autore (Sinistra)
    ctx.save();
    ctx.fillStyle = '#0F172A';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, marginX, footerY, badgeW, badgeH, 20);
    ctx.fill();
    ctx.stroke();

    // Avatar Autore
    const avatarX = marginX + 16;
    const avatarY = footerY + 14;
    const avatarR = 20;
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarR, avatarY + avatarR, avatarR, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = accentColor;
    ctx.fillRect(avatarX, avatarY, avatarR * 2, avatarR * 2);
    ctx.font = `bold 20px ${bodyFont}, system-ui, sans-serif`;
    ctx.fillStyle = '#070A10';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('AC', avatarX + avatarR, avatarY + avatarR);
    ctx.restore();

    // Testi Badge Autore
    const coachName = slide.badgeCoachName || brandKit.authorSignature.split('•')[0].trim() || 'Antonio Crapanzano';
    const coachRole = slide.badgeCoachTitle || (brandKit.authorSignature.includes('•') ? brandKit.authorSignature.split('•')[1].trim() : 'Performance & Biomechanics Coach');

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = `bold 18px ${bodyFont}, system-ui, sans-serif`;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(coachName, avatarX + avatarR * 2 + 12, footerY + 14);

    ctx.font = `normal 14px ${bodyFont}, system-ui, sans-serif`;
    ctx.fillStyle = '#94A3B8';
    ctx.fillText(coachRole, avatarX + avatarR * 2 + 12, footerY + 38);
    ctx.restore();

    // Logo / Brand Name (Destra)
    ctx.save();
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    if (brandKit.logoUrl) {
      try {
        const logoImg = await loadImage(brandKit.logoUrl);
        const lSize = 54;
        ctx.drawImage(logoImg, CANVAS_WIDTH - marginX - lSize, footerY + (badgeH - lSize) / 2, lSize, lSize);
      } catch {}
    } else {
      ctx.font = `900 24px ${titleFont}, system-ui, sans-serif`;
      ctx.fillStyle = accentColor;
      ctx.fillText(brandKit.brandName || 'AC COACHING', CANVAS_WIDTH - marginX, footerY + badgeH / 2);
    }
    ctx.restore();

  // ─── LAYOUT DEFAULT: TEXT LEFT ───
  } else {
    startY = drawTitleLine(ctx, slide.headline, marginX, startY, contentWidth, {
      fontFamily: titleFont,
      fontSize: titleFontSize,
      color: titleColor,
      isBold: isTitleBold,
      isUnderline: isTitleUnderline,
      maxBottomY: bottomSafeY - 100,
    });

    if (slide.headlineHighlight) {
      startY = drawTitleLine(ctx, slide.headlineHighlight, marginX, startY, contentWidth, {
        fontFamily: highlightFont,
        fontSize: highlightFontSize,
        color: highlightColor,
        isBold: isHighlightBold,
        isUnderline: isHighlightUnderline,
        maxBottomY: bottomSafeY - 100,
      });
    }

    if (slide.subheadline) {
      startY += 12 + contentOffsetY;
      ctx.textBaseline = 'top';
      startY = drawRichTextLines(ctx, slide.subheadline, marginX, startY, {
        fontFamily: subtitleFont,
        fontSize: subtitleFontSize,
        color: subtitleColor,
        isBold: isSubtitleBold,
        isUnderline: isSubtitleUnderline,
        maxWidth: contentWidth,
        maxBottomY: bottomSafeY - 100,
      });
    }

    if (slide.statNumber) {
      startY += 15;
      ctx.font = `900 48px "${titleFont}", system-ui, sans-serif`;
      ctx.fillStyle = accentColor;
      ctx.fillText(slide.statNumber, marginX, startY);
      startY += 56;
    }

    if (slide.bodyText) {
      startY += 20;
      ctx.textBaseline = 'top';
      startY = drawRichTextLines(ctx, slide.bodyText, marginX, startY, {
        fontFamily: bodyFont,
        fontSize: bodyFontSize,
        color: bodyColor,
        isBold: isBodyBold,
        isUnderline: isBodyUnderline,
        maxWidth: contentWidth,
        maxBottomY: bottomSafeY - 40,
      });
    }

    if (slide.bulletPoints && slide.bulletPoints.length > 0) {
      startY += 15;
      for (const bp of slide.bulletPoints) {
        if (startY > bottomSafeY - 40) break;
        ctx.font = `500 ${bodyFontSize}px ${bodyFont}, system-ui, sans-serif`;
        ctx.fillStyle = accentColor;
        ctx.fillText('•', marginX, startY);
        ctx.fillStyle = '#F8FAFC';
        const bpLines = wrapText(ctx, bp, contentWidth - 35);
        for (const bpl of bpLines) {
          ctx.fillText(bpl, marginX + 25, startY);
          startY += bodyFontSize + 12;
        }
        startY += 8;
      }
    }
  }

  // ─── 7. BOTTOM BAR: CITAZIONE STUDIO / AUTHOR HANDLE & SWIPE / ARROW ───
  if (layout !== 'product_breakdown') {
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(marginX, bottomSafeY - 20);
    ctx.lineTo(CANVAS_WIDTH - marginX, bottomSafeY - 20);
    ctx.stroke();

    // Offset per il testo se il logo è posizionato in basso a sinistra
    const handleStartX = (brandKit.logoUrl && brandKit.logoPosition === 'bottom_left')
      ? marginX + 44 + 14
      : marginX;

    // Citazione Scientifica Studio / PMID (se presente) in basso a sinistra (Stile Screenshot 4)
    if (slide.citationSource) {
      ctx.font = `italic 18px ${bodyFont}, monospace`;
      ctx.fillStyle = '#64748B';
      ctx.fillText(slide.citationSource, handleStartX, bottomSafeY + 10);
    } else {
      // Author handle a sinistra, rigorosamente allineato a sinistra all'interno dei margini
      const rawHandle = brandKit.authorHandle || '@antoniocrapanzano_coach';
      const displayHandle = rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`;

      ctx.font = `bold 22px ${bodyFont}, system-ui, sans-serif`;
      ctx.fillStyle = '#E2E8F0';
      ctx.fillText(displayHandle, handleStartX, bottomSafeY + 10);
    }

    // Indicatore Swipe / Freccia Oro a destra (solo sulle slide intermedie, rimosso Salva per dopo)
    if (!isLastSlide) {
      ctx.textAlign = 'right';
      ctx.font = `bold 24px ${bodyFont}, system-ui, sans-serif`;
      ctx.fillStyle = accentColor;
      ctx.fillText('➔', CANVAS_WIDTH - marginX, bottomSafeY + 10);
    }

    ctx.restore();
  }

  // ─── 8. LINEE GUIDA SAFE AREA OPZIONALI & GRIGLIA FEED 1:1 ───
  if (options.showSafeAreaGuidelines) {
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.strokeRect(marginX, topSafeY, contentWidth, bottomSafeY - topSafeY);
    ctx.setLineDash([]);
  }

  if (options.showGridCropGuide) {
    const cropTop = (CANVAS_HEIGHT - CANVAS_WIDTH) / 2; // 135px
    const cropBottom = cropTop + CANVAS_WIDTH; // 1215px
    ctx.save();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(0, cropTop);
    ctx.lineTo(CANVAS_WIDTH, cropTop);
    ctx.moveTo(0, cropBottom);
    ctx.lineTo(CANVAS_WIDTH, cropBottom);
    ctx.stroke();

    ctx.fillStyle = 'rgba(56, 189, 248, 0.95)';
    ctx.font = 'bold 22px Inter, sans-serif';
    ctx.fillText('TAGLIO FEED 1:1 (GRIGLIA PROFILO)', 28, cropTop - 12);
    ctx.restore();
  }

  if (options.skipText || options.onRecordText) {
    ctx.fillText = originalFillText;
  }
};
