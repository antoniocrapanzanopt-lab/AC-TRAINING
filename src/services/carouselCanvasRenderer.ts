import { CarouselSlide, CarouselSettings, SlideLayoutId } from '../types/carousel';
import { calculateImageDrawBounds } from './imageSmartLayoutService';

export const CANVAS_WIDTH = 1080;
export const CANVAS_HEIGHT = 1350;

interface RenderOptions {
  showSafeAreaGuidelines?: boolean;
  showGridCropGuide?: boolean;
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
  const baseline = ctx.textBaseline || 'top';
  ctx.font = `${isBold ? '900' : '500'} ${fontSize}px "${fontFamily}", system-ui, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align;

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
        let underlineY = currentY + Math.round(fontSize * 0.95);
        if (baseline === 'middle') {
          underlineY = currentY + Math.round(fontSize * 0.55);
        } else if (baseline === 'alphabetic' || baseline === 'bottom') {
          underlineY = currentY + 4;
        }
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
  const clean = sanitizeCarouselText(text);
  if (!clean) return startY;

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
  const baseline = ctx.textBaseline || 'top';
  let currentY = startY;

  // Split per paragrafi (rispetta gli "a capo" dell'utente)
  const paragraphs = clean.split('\n');

  for (const para of paragraphs) {
    if (currentY > maxBottomY) break;
    if (!para.trim()) {
      currentY += Math.round(lineStep * 0.7);
      continue;
    }

    const weight = isBold ? '700' : '400';
    ctx.font = `${weight} ${fontSize}px "${fontFamily}", system-ui, sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = align;

    const lines = wrapText(ctx, para, maxWidth);

    for (const line of lines) {
      if (currentY > maxBottomY) break;
      ctx.fillText(line, startX, currentY);

      if (isUnderline && line.trim()) {
        const textW = ctx.measureText(line).width;
        let lineX = startX;
        if (align === 'center') {
          lineX = startX - textW / 2;
        } else if (align === 'right') {
          lineX = startX - textW;
        }
        const thickness = Math.max(2, Math.round(fontSize * 0.08));
        let underlineY = currentY + Math.round(fontSize * 0.95);
        if (baseline === 'middle') {
          underlineY = currentY + Math.round(fontSize * 0.55);
        } else if (baseline === 'alphabetic' || baseline === 'bottom') {
          underlineY = currentY + 4;
        }
        ctx.fillRect(lineX, underlineY, textW, thickness);
      }

      currentY += lineStep;
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

  // Calcolo esatto dimensione caratteri in pixel (priorità a titleFontSizePx / bodyFontSizePx)
  const defaultTitleSize = slide.titleSize === 'xl' ? 64 : slide.titleSize === 'lg' ? 52 : slide.titleSize === 'md' ? 44 : 36;
  const titleFontSize = slide.titleFontSizePx || defaultTitleSize;

  const defaultBodySize = slide.bodyFontSize === 'lg' ? 30 : slide.bodyFontSize === 'sm' ? 22 : 26;
  const bodyFontSize = slide.bodyFontSizePx || defaultBodySize;

  // Sfondo & Colori personalizzati per template
  let bgColor = slide.bgColor || brandKit.primaryColor || '#070A10';
  let accentColor = slide.accentColor || brandKit.accentColor || '#F59E0B';

  if (templateId === 'hypertrophy_science') {
    bgColor = slide.bgColor || '#0C081A';
    accentColor = slide.accentColor || '#C084FC';
  } else if (templateId === 'bold_impact') {
    bgColor = slide.bgColor || '#060709';
    accentColor = slide.accentColor || '#F59E0B';
  } else if (templateId === 'coach_framework') {
    bgColor = slide.bgColor || '#0B1120';
  }

  const primaryTextColor = '#FFFFFF';
  const secondaryTextColor = templateId === 'personal_story' ? '#E2E8F0' : '#94A3B8';

  // Titolo Slide (Riga 1): Font, Dimensioni px, Colore, Grassetto, Sottolineato
  const titleColor = slide.titleColor || primaryTextColor;
  const isTitleBold = slide.titleBold !== undefined ? slide.titleBold : true;
  const isTitleUnderline = !!slide.titleUnderline;

  // Testo Evidenziato / Riga 2: Font, Dimensioni px, Colore, Grassetto, Sottolineato
  const highlightFont = slide.highlightFont || titleFont;
  const highlightFontSize = slide.highlightFontSizePx || titleFontSize;
  const highlightColor = slide.highlightColor || accentColor;
  const isHighlightBold = slide.highlightBold !== undefined ? slide.highlightBold : true;
  const isHighlightUnderline = !!slide.highlightUnderline;

  // Sottotitolo / Gancio Dati: Font, Dimensioni px, Colore, Grassetto, Sottolineato
  const subtitleFont = slide.subtitleFont || bodyFont;
  const defaultSubtitleSize = (layout === 'dual_tone_cover' || layout === 'text_center') ? 28 : 26;
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
  if (slide.imageUrl) {
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

  // ─── 3. SAFE AREA & PADDING ───
  const marginX = 80;
  const contentWidth = CANVAS_WIDTH - marginX * 2;
  const topSafeY = 85;
  const bottomSafeY = CANVAS_HEIGHT - 85;

  // ─── 4. LOGO CARICATO IN ALTO (SE PRESENTE) ───
  if (brandKit.logoUrl && brandKit.logoPosition !== 'none') {
    try {
      const logoImg = await loadImage(brandKit.logoUrl);
      const logoSize = 44;
      if (brandKit.logoPosition === 'top_left') {
        ctx.drawImage(logoImg, marginX, topSafeY - 4, logoSize, logoSize);
      } else if (brandKit.logoPosition === 'top_right') {
        ctx.drawImage(logoImg, CANVAS_WIDTH - marginX - logoSize, topSafeY - 4, logoSize, logoSize);
      } else if (brandKit.logoPosition === 'bottom_left') {
        ctx.drawImage(logoImg, marginX, bottomSafeY - 8, logoSize, logoSize);
      }
    } catch {}
  }

  // ─── 5. TOP BAR: CATEGORY TAG / PILLOLA TAKEAWAY & CONTATORE SLIDE ───
  const hasTopLeftLogo = Boolean(brandKit.logoUrl && brandKit.logoPosition === 'top_left');
  const rawCategoryTag = slide.categoryTag;
  const isTecnicaBiomeccanica = Boolean(rawCategoryTag && /tecnica\s*&\s*biomeccanica/i.test(rawCategoryTag));
  const categoryTagText = !isTecnicaBiomeccanica && rawCategoryTag ? rawCategoryTag : null;
  const isStepTag = Boolean(slide.takeawayTag && /^step\s*\d+/i.test(slide.takeawayTag.trim()));

  // Se c'è già il logo in alto a sinistra, lasciamo SOLO il logo senza scritte o pillole STEP
  if (!hasTopLeftLogo) {
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

  // Contatore slide in alto a destra (con linea o frazione stile 2/8)
  const isSlideCounterVisible = settings.showSlideCounter !== false && slide.showSlideNumber !== false;
  if (isSlideCounterVisible) {
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    if (templateId === 'bold_impact' || templateId === 'hypertrophy_science') {
      ctx.font = `bold 24px ${bodyFont}, monospace`;
      ctx.fillStyle = primaryTextColor;
      ctx.fillText(`${slide.order}/${totalSlides}`, CANVAS_WIDTH - marginX, topSafeY + 12);
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(CANVAS_WIDTH - marginX - 50, topSafeY + 28);
      ctx.lineTo(CANVAS_WIDTH - marginX, topSafeY + 28);
      ctx.stroke();
    } else {
      const counterText = `${String(slide.order).padStart(2, '0')} / ${String(totalSlides).padStart(2, '0')}`;
      ctx.font = `bold 22px ${bodyFont}, monospace`;
      ctx.fillStyle = secondaryTextColor;
      ctx.fillText(counterText, CANVAS_WIDTH - marginX, topSafeY + 18);
    }
    ctx.textAlign = 'left';
  }

  // ─── 6. CONTENUTO SLIDE IN BASE AL LAYOUT SELEZIONATO ───
  const titleOffsetY = slide.titleOffsetY || 0;
  const contentOffsetY = slide.contentOffsetY || 0;
  let startY = (layout === 'photo_dominant' ? CANVAS_HEIGHT * 0.44 : topSafeY + 70) + titleOffsetY;

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

    // Nodi Connessi Verticali
    const bullets = slide.bulletPoints && slide.bulletPoints.length > 0
      ? slide.bulletPoints
      : ['sanno dove vogliono andare.', 'capiscono cosa le sta bloccando.', 'imparano a vivere in modo diverso.'];

    const iconPool = ['🎯', '🔒', '📈', '💡', '⚡', '🏋️', '🧠'];
    let nodeY = startY;

    bullets.forEach((bullet, idx) => {
      const icon = iconPool[idx % iconPool.length];
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
      const textLines = wrapText(ctx, bullet, contentWidth - 80);
      let tY = circleCenterY;
      textLines.forEach((tl) => {
        ctx.fillText(tl, marginX + 75, tY);
        tY += 34;
      });

      nodeY += Math.max(circleRadius * 2 + 45, textLines.length * 34 + 30);
    });

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

    // Step 1 Diagramma
    const step1 = slide.diagramStep1 || slide.bodyText || 'Non riuscire più a completare il compito stabilito!';
    ctx.font = `700 26px ${bodyFont}, system-ui, sans-serif`;
    ctx.fillStyle = '#FFFFFF';
    const s1Lines = wrapText(ctx, step1, contentWidth);
    for (const l of s1Lines) {
      ctx.fillText(l, marginX, startY);
      startY += 36;
    }

    // Freccia discendente `↓`
    startY += 10;
    ctx.font = `900 36px ${titleFont}, system-ui, sans-serif`;
    ctx.fillStyle = accentColor;
    ctx.fillText('↓', marginX + 20, startY);
    startY += 45;

    // Step 2 & Risultato Evidenziato (es. TASK FAILURE!)
    const step2 = slide.diagramStep2 || 'Quello che viene definito più correttamente:';
    const resultHighlight = slide.diagramHighlightResult || 'TASK FAILURE!';

    ctx.font = `500 26px ${bodyFont}, system-ui, sans-serif`;
    ctx.fillStyle = '#CBD5E1';
    ctx.fillText(step2, marginX, startY);
    startY += 38;

    ctx.font = `900 38px ${titleFont}, system-ui, sans-serif`;
    ctx.fillStyle = accentColor;
    ctx.fillText(resultHighlight, marginX, startY);
    startY += 55;

    // Pillola Punchline Coach (es. "ED È PROPRIO QUI CHE NASCE IL PRIMO EQUIVOCO...")
    const punchline = slide.punchlineQuote || 'ED È PROPRIO QUI CHE NASCE IL PRIMO EQUIVOCO...';
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

    startY += 12 + contentOffsetY;

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
      startY += 10;
    }

    // Statistica / Numero in evidenza (se presente)
    if (slide.statNumber) {
      ctx.font = `900 44px "${titleFont}", system-ui, sans-serif`;
      ctx.fillStyle = accentColor;
      ctx.fillText(slide.statNumber, marginX, startY);
      startY += 52;
    }

    // Corpo del Testo (spiegazione/paragrafo cover)
    if (slide.bodyText) {
      startY += 6;
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
      startY += 10;
    }

    // Punti Elenco (se presenti)
    if (slide.bulletPoints && slide.bulletPoints.length > 0) {
      for (const bp of slide.bulletPoints) {
        if (startY > bottomSafeY - 110) break;
        ctx.font = `500 ${bodyFontSize}px ${bodyFont}, system-ui, sans-serif`;
        ctx.fillStyle = accentColor;
        ctx.fillText('•', marginX, startY);
        ctx.fillStyle = '#F8FAFC';
        const bpLines = wrapText(ctx, bp, contentWidth - 35);
        for (const bpl of bpLines) {
          ctx.fillText(bpl, marginX + 25, startY);
          startY += bodyFontSize + 10;
        }
        startY += 6;
      }
      startY += 10;
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

    startY += 20;

    const wrongBoxY = startY;

    // BOX ❌ ERRORE (Rosso) - Altezza Dinamica
    ctx.font = `500 25px ${bodyFont}, system-ui, sans-serif`;
    const wrongLines = wrapText(ctx, slide.wrongText || slide.bodyText || 'Movimento scorretto', contentWidth - 50);
    const wrongBoxHeight = Math.max(160, 75 + wrongLines.length * 36 + 15);

    ctx.fillStyle = 'rgba(244, 63, 94, 0.08)';
    drawRoundedRect(ctx, marginX, wrongBoxY, contentWidth, wrongBoxHeight, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.35)';
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, marginX, wrongBoxY, contentWidth, wrongBoxHeight, 18);
    ctx.stroke();

    ctx.font = `900 24px ${titleFont}, system-ui, sans-serif`;
    ctx.fillStyle = '#F43F5E';
    ctx.fillText('❌ ERRORE COMUNE DA EVITARE:', marginX + 25, wrongBoxY + 30);

    ctx.font = `500 25px ${bodyFont}, system-ui, sans-serif`;
    ctx.fillStyle = '#FFE4E6';
    let wY = wrongBoxY + 70;
    for (const line of wrongLines) {
      ctx.fillText(line, marginX + 25, wY);
      wY += 36;
    }

    // BOX ✅ CORREZIONE (Verde) - Altezza Dinamica
    const correctLines = wrapText(ctx, slide.correctText || slide.subheadline || 'Adattamento corretto delle leve', contentWidth - 50);
    const correctBoxHeight = Math.max(160, 75 + correctLines.length * 36 + 15);
    const correctBoxY = wrongBoxY + wrongBoxHeight + 20;

    ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
    drawRoundedRect(ctx, marginX, correctBoxY, contentWidth, correctBoxHeight, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, marginX, correctBoxY, contentWidth, correctBoxHeight, 18);
    ctx.stroke();

    ctx.font = `900 24px ${titleFont}, system-ui, sans-serif`;
    ctx.fillStyle = '#10B981';
    ctx.fillText('✅ CORREZIONE BIOMECCANICA OTTIMALE:', marginX + 25, correctBoxY + 30);

    ctx.font = `500 25px ${bodyFont}, system-ui, sans-serif`;
    ctx.fillStyle = '#D1FAE5';
    let cY = correctBoxY + 70;
    for (const line of correctLines) {
      ctx.fillText(line, marginX + 25, cY);
      cY += 36;
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
      ctx.font = `bold 22px ${bodyFont}, system-ui, sans-serif`;
      ctx.fillStyle = accentColor;
      ctx.fillText(`STEP ${stepIdx}`, marginX + 60, startY);

      ctx.font = `500 ${bodyFontSize}px ${bodyFont}, system-ui, sans-serif`;
      const stepLines = wrapText(ctx, st.replace(/^(?:Step\s*\d+:?|[-•])\s*/i, ''), contentWidth - 70);
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
    
    // Watermark centrale
    ctx.font = `bold 22px ${bodyFont}, system-ui, sans-serif`;
    ctx.fillStyle = accentColor;
    ctx.fillText(brandKit.watermarkText || `• ${brandKit.brandName} •`, CANVAS_WIDTH / 2, startY);
    startY += 55;

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
      startY += 15;
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

    startY += 25;

    // Calcolo dinamico dell'altezza e posizionamento del box CTA per evitare sovrapposizioni tra testo e firma
    ctx.font = `500 ${bodyFontSize}px ${bodyFont}, system-ui, sans-serif`;
    const ctaBodyLines = wrapText(ctx, slide.bodyText || 'Commenta per ricevere l\'analisi video in DM.', contentWidth - 70);
    const bodyTextHeight = ctaBodyLines.length * (bodyFontSize + 12);
    const signatureHeight = brandKit.authorSignature ? 40 : 10;
    const boxPaddingTop = 80;
    const boxBottomPadding = 25;
    const totalBoxHeight = Math.max(180, boxPaddingTop + bodyTextHeight + signatureHeight + boxBottomPadding);

    // Posizionamento del box rispettando sia lo startY sia la safe area inferiore del footer
    const ctaBoxY = Math.min(
      Math.max(startY, CANVAS_HEIGHT - totalBoxHeight - 120),
      bottomSafeY - totalBoxHeight - 15
    );

    ctx.fillStyle = `${accentColor}22`;
    drawRoundedRect(ctx, marginX, ctaBoxY, contentWidth, totalBoxHeight, 24);
    ctx.fill();

    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2.5;
    drawRoundedRect(ctx, marginX, ctaBoxY, contentWidth, totalBoxHeight, 24);
    ctx.stroke();

    // Titolo Box CTA
    ctx.font = `900 30px ${titleFont}, system-ui, sans-serif`;
    ctx.fillStyle = accentColor;
    ctx.fillText('💾 SALVA IL POST & COMMENTA', marginX + 35, ctaBoxY + 35);

    // Testo del corpo dinamico
    ctx.font = `${isBodyBold ? 'bold' : '500'} ${bodyFontSize}px "${bodyFont}", system-ui, sans-serif`;
    ctx.fillStyle = slide.bodyColor || '#FEF3C7';
    let currentY = ctaBoxY + 80;
    for (const bl of ctaBodyLines) {
      ctx.fillText(bl, marginX + 35, currentY);
      if (isBodyUnderline && bl.trim()) {
        const textW = ctx.measureText(bl).width;
        ctx.fillRect(marginX + 35, currentY + Math.round(bodyFontSize * 0.95), textW, Math.max(2, Math.round(bodyFontSize * 0.08)));
      }
      currentY += bodyFontSize + 12;
    }

    // Firma Brand posizionata SEMPRE sotto al testo, mai sovrapposta
    if (brandKit.authorSignature) {
      currentY += 15;
      ctx.font = `600 20px ${bodyFont}, system-ui, sans-serif`;
      ctx.fillStyle = '#94A3B8';
      ctx.fillText(brandKit.authorSignature, marginX + 35, currentY);
    }

  // ─── LAYOUT F: PRODUCT / EXERCISE BREAKDOWN (INFOGRAFICA 4 CALLOUT CON SOGGETTO CENTRALE & PUNTATORI) ───
  } else if (layout === 'product_breakdown') {
    // 1. Banner Superiore Orizzontale (Sito Web / Handle)
    const bannerH = 56;
    ctx.save();
    ctx.fillStyle = brandKit.accentColor || '#38BDF8';
    ctx.fillRect(0, 0, CANVAS_WIDTH, bannerH);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `italic 700 22px ${bodyFont}, monospace`;
    ctx.fillStyle = '#070A10';
    const bannerStr = slide.topBannerText || brandKit.authorHandle || `www.${brandKit.brandName.toLowerCase().replace(/\s+/g, '')}.coach`;
    ctx.fillText(bannerStr, CANVAS_WIDTH / 2, bannerH / 2);
    ctx.restore();

    // 2. Titolo & Highlight Centrati in Alto
    let pTitleY = bannerH + 40 + titleOffsetY;
    const pTitleSize = slide.titleFontSizePx || (slide.titleSize === 'xl' ? 52 : slide.titleSize === 'lg' ? 44 : 38);

    pTitleY = drawTitleLine(ctx, slide.headline, CANVAS_WIDTH / 2, pTitleY, contentWidth - 40, {
      fontFamily: titleFont,
      fontSize: pTitleSize,
      color: titleColor,
      isBold: isTitleBold,
      isUnderline: isTitleUnderline,
      align: 'center',
      maxBottomY: bottomSafeY - 100,
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
        maxBottomY: bottomSafeY - 100,
      });
    }

    // 3. Soggetto Centrale & Alone Luminoso
    const centerX = CANVAS_WIDTH / 2;
    const centerY = CANVAS_HEIGHT * 0.52 + contentOffsetY;
    const pBoxW = 380;
    const pBoxH = 380;

    // Alone luminoso di contrasto
    const pGlow = ctx.createRadialGradient(centerX, centerY, 30, centerX, centerY, 230);
    pGlow.addColorStop(0, 'rgba(245, 158, 11, 0.12)');
    pGlow.addColorStop(0.6, 'rgba(30, 41, 59, 0.3)');
    pGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = pGlow;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 230, 0, Math.PI * 2);
    ctx.fill();

    // Disegno Immagine o Placeholder
    if (slide.imageUrl) {
      try {
        const prodImg = await loadImage(slide.imageUrl);
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 25;
        ctx.shadowOffsetY = 12;
        const aspect = prodImg.width / prodImg.height;
        let dw = pBoxW;
        let dh = pBoxH;
        if (aspect > 1) {
          dh = pBoxW / aspect;
        } else {
          dw = pBoxH * aspect;
        }
        ctx.drawImage(prodImg, centerX - dw / 2, centerY - dh / 2, dw, dh);
        ctx.restore();
      } catch {}
    } else {
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      drawRoundedRect(ctx, centerX - pBoxW / 2, centerY - pBoxH / 2, pBoxW, pBoxH, 24);
      ctx.stroke();
      ctx.fill();
      ctx.setLineDash([]);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `bold 26px ${bodyFont}, system-ui, sans-serif`;
      ctx.fillStyle = '#94A3B8';
      ctx.fillText('📦 SOGGETTO CENTRALE', centerX, centerY - 14);
      ctx.font = `500 16px ${bodyFont}, system-ui, sans-serif`;
      ctx.fillStyle = '#64748B';
      ctx.fillText('(Carica foto prodotto o esercizio)', centerX, centerY + 18);
      ctx.restore();
    }

    // 4. Linee Guida Tratteggiate e Pallini verso il Prodotto
    const railYTop = centerY - 130;
    const railYBottom = centerY + 130;
    const railDotLeftX = marginX + 10;
    const railDotRightX = CANVAS_WIDTH - marginX - 10;
    const pMargin = 165;

    ctx.save();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);

    // Top rails
    ctx.beginPath();
    ctx.moveTo(railDotLeftX, railYTop);
    ctx.lineTo(centerX - pMargin, railYTop);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(centerX + pMargin, railYTop);
    ctx.lineTo(railDotRightX, railYTop);
    ctx.stroke();

    // Bottom rails
    ctx.beginPath();
    ctx.moveTo(railDotLeftX, railYBottom);
    ctx.lineTo(centerX - pMargin, railYBottom);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(centerX + pMargin, railYBottom);
    ctx.lineTo(railDotRightX, railYBottom);
    ctx.stroke();

    ctx.setLineDash([]);

    // Pallini ai 4 vertici
    ctx.fillStyle = accentColor;
    const renderDot = (x: number, y: number) => {
      ctx.beginPath();
      ctx.arc(x, y, 6.5, 0, Math.PI * 2);
      ctx.fill();
    };
    renderDot(railDotLeftX, railYTop);
    renderDot(railDotRightX, railYTop);
    renderDot(railDotLeftX, railYBottom);
    renderDot(railDotRightX, railYBottom);
    ctx.restore();

    // 5. I 4 Quadranti di Callout
    const colW = (CANVAS_WIDTH / 2) - marginX - 25;
    const leftColX = marginX;
    const rightColX = centerX + 25;

    const renderCalloutBlock = (
      x: number,
      y: number,
      title: string,
      text: string
    ) => {
      ctx.save();
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      ctx.font = `bold 22px ${bodyFont}, system-ui, sans-serif`;
      ctx.fillStyle = accentColor;
      const tLines = wrapText(ctx, title, colW);
      let curY = y;
      for (const tl of tLines) {
        ctx.fillText(tl, x, curY);
        curY += 28;
      }

      ctx.font = `normal 19px ${bodyFont}, system-ui, sans-serif`;
      ctx.fillStyle = '#E2E8F0';
      const bLines = wrapText(ctx, text, colW);
      for (const bl of bLines) {
        ctx.fillText(bl, x, curY);
        curY += 26;
      }
      ctx.restore();
    };

    const q1 = slide.calloutTopLeft || {
      title: slide.bulletPoints?.[0] ? slide.bulletPoints[0].split(':')[0] : 'Assunzione a digiuno:',
      text: slide.bulletPoints?.[0] ? (slide.bulletPoints[0].split(':')[1] || slide.bulletPoints[0]) : 'Senza substrato la sintesi proteica non si attiva.',
    };
    const q2 = slide.calloutTopRight || {
      title: slide.bulletPoints?.[1] ? slide.bulletPoints[1].split(':')[0] : 'Sedute ravvicinate:',
      text: slide.bulletPoints?.[1] ? (slide.bulletPoints[1].split(':')[1] || slide.bulletPoints[1]) : 'Ideale quando tra due sessioni manca il tempo per mangiare.',
    };
    const q3 = slide.calloutBottomLeft || {
      title: slide.bulletPoints?.[2] ? slide.bulletPoints[2].split(':')[0] : 'Dieta povera di proteine:',
      text: slide.bulletPoints?.[2] ? (slide.bulletPoints[2].split(':')[1] || slide.bulletPoints[2]) : 'Coprono il pool aminoacidico mancante nella giornata.',
    };
    const q4 = slide.calloutBottomRight || {
      title: slide.bulletPoints?.[3] ? slide.bulletPoints[3].split(':')[0] : 'Quando non servono:',
      text: slide.bulletPoints?.[3] ? (slide.bulletPoints[3].split(':')[1] || slide.bulletPoints[3]) : 'Se l\'apporto proteico totale è già a 1.6–2.2 g/kg.',
    };

    // ↖️ Quadrante Alto-Sinistra
    renderCalloutBlock(leftColX, railYTop - 110, q1.title, q1.text);
    // ↗️ Quadrante Alto-Destra
    renderCalloutBlock(rightColX, railYTop - 110, q2.title, q2.text);
    // ↙️ Quadrante Basso-Sinistra
    renderCalloutBlock(leftColX, railYBottom + 20, q3.title, q3.text);
    // ↘️ Quadrante Basso-Destra
    renderCalloutBlock(rightColX, railYBottom + 20, q4.title, q4.text);

    // 6. Footer con Badge Autore & Logo
    const footerY = CANVAS_HEIGHT - 125;
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
    const fontSize = titleFontSize;
    const titleLineStep = fontSize + Math.max(8, Math.round(fontSize * 0.08));
    ctx.font = `900 ${fontSize}px ${titleFont}, system-ui, sans-serif`;
    ctx.fillStyle = primaryTextColor;
    ctx.textBaseline = 'top';
    const headlineLines = wrapText(ctx, slide.headline, contentWidth);
    for (const line of headlineLines) {
      ctx.fillText(line, marginX, startY);
      startY += titleLineStep;
    }

    if (slide.headlineHighlight) {
      ctx.font = `900 ${fontSize}px ${titleFont}, system-ui, sans-serif`;
      ctx.fillStyle = accentColor;
      const hlLines = wrapText(ctx, slide.headlineHighlight, contentWidth);
      for (const hl of hlLines) {
        ctx.fillText(hl, marginX, startY);
        startY += titleLineStep;
      }
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
  if (layout === 'product_breakdown') {
    return;
  }

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
};
