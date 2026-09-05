import { InstagramStory, InstagramStorySettings, StoryLayoutId } from '../types/story';
import { calculateImageDrawBounds } from './imageSmartLayoutService';

export const STORY_CANVAS_WIDTH = 1080;
export const STORY_CANVAS_HEIGHT = 1920;

export const STORY_SAFE_AREA = {
  top: 160,
  bottom: 280,
  left: 64,
  right: 64,
};

export interface StoryRenderOptions {
  showSafeArea?: boolean;
  showIgMockup?: boolean;
  showGridCropGuide?: boolean;
  totalStories?: number;
  currentStoryIndex?: number;
}

const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Impossibile caricare immagine: ${src}`));
    img.src = src;
  });
};

// Utility per disegnare rettangoli arrotondati
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
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
}

// Utility per a capo automatico
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  if (!text) return [];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = ctx.measureText(testLine).width;
    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

/**
 * Renderizza una singola Instagram Story su un elemento HTMLCanvasElement a 1080x1920
 */
export async function renderStoryToCanvas(
  canvas: HTMLCanvasElement,
  story: InstagramStory,
  settings: InstagramStorySettings,
  options: StoryRenderOptions = {}
): Promise<void> {
  canvas.width = STORY_CANVAS_WIDTH;
  canvas.height = STORY_CANVAS_HEIGHT;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const totalStories = options.totalStories || 5;
  const currentStoryIndex = options.currentStoryIndex !== undefined ? options.currentStoryIndex : (story.order - 1);
  const templateId = settings.templateId || 'minimal_dark';

  // Palette colori
  let bgColor = story.bgColor || '#080A0F';
  let accentColor = story.accentColor || '#F59E0B'; // default gold

  if (templateId === 'science_highlight') {
    bgColor = story.bgColor || '#0C081A';
    accentColor = story.accentColor || '#C084FC'; // purple neon
  } else if (templateId === 'bold_impact') {
    bgColor = story.bgColor || '#060709';
    accentColor = story.accentColor || '#F59E0B';
  } else if (templateId === 'coach_direct') {
    bgColor = story.bgColor || '#0B1120';
    accentColor = story.accentColor || '#38BDF8';
  }

  const primaryTextColor = story.colorTitle || '#FFFFFF';
  const highlightTextColor = story.colorHighlight || accentColor || '#F59E0B';
  const secondaryTextColor = story.colorSubtitle || '#CBD5E1';
  const bodyTextColor = story.colorBody || '#E2E8F0';
  const fontFamily = story.fontFamily || settings.fontFamily || 'Inter';
  const marginX = STORY_SAFE_AREA.left;
  const contentWidth = STORY_CANVAS_WIDTH - marginX * 2;
  const topSafeY = STORY_SAFE_AREA.top;
  const bottomSafeY = STORY_CANVAS_HEIGHT - STORY_SAFE_AREA.bottom;

  // 1. Sfondo base
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, STORY_CANVAS_WIDTH, STORY_CANVAS_HEIGHT);

  // 1.1 Immagine di sfondo se presente (supporto a zoom, fit, posizionamento continuo e overlay)
  if (story.imageUrl) {
    try {
      const img = await loadImage(story.imageUrl);
      const opacity = story.imageOpacity !== undefined ? story.imageOpacity : 1.0;
      const zoom = story.imageZoom || 1.0;
      const posX = story.imagePositionX ?? 50;
      const posY = story.imagePositionY ?? 50;
      const fit = story.imageFit || 'cover';
      const overlayPercent = story.imageOverlay !== undefined
        ? story.imageOverlay / 100
        : 0.65;

      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const bounds = calculateImageDrawBounds(
        STORY_CANVAS_WIDTH,
        STORY_CANVAS_HEIGHT,
        img.width,
        img.height,
        fit,
        posX,
        posY,
        zoom
      );

      ctx.globalAlpha = opacity;
      ctx.drawImage(img, bounds.drawX, bounds.drawY, bounds.drawWidth, bounds.drawHeight);
      ctx.restore();

      // Overlay scuro progressivo per massima leggibilità
      const effOverlay = overlayPercent > 0 ? overlayPercent : 0.65;
      const overlayGrad = ctx.createLinearGradient(0, 0, 0, STORY_CANVAS_HEIGHT);
      overlayGrad.addColorStop(0, `rgba(8, 10, 15, ${Math.min(1.0, effOverlay * 0.75)})`);
      overlayGrad.addColorStop(0.35, `rgba(8, 10, 15, ${Math.min(1.0, effOverlay * 0.85)})`);
      overlayGrad.addColorStop(0.7, `rgba(8, 10, 15, ${Math.min(1.0, effOverlay)})`);
      overlayGrad.addColorStop(1, `rgba(8, 10, 15, ${Math.min(1.0, effOverlay * 1.1)})`);
      ctx.fillStyle = overlayGrad;
      ctx.fillRect(0, 0, STORY_CANVAS_WIDTH, STORY_CANVAS_HEIGHT);
    } catch {
      // Fallback trasparente
    }
  }

  // Gradienti d'atmosfera
  if (templateId === 'science_highlight') {
    const radial = ctx.createRadialGradient(
      STORY_CANVAS_WIDTH * 0.5,
      STORY_CANVAS_HEIGHT * 0.25,
      50,
      STORY_CANVAS_WIDTH * 0.5,
      STORY_CANVAS_HEIGHT * 0.25,
      800
    );
    radial.addColorStop(0, 'rgba(168, 85, 247, 0.22)');
    radial.addColorStop(1, 'rgba(12, 8, 26, 0)');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, STORY_CANVAS_WIDTH, STORY_CANVAS_HEIGHT);
  } else {
    const radial = ctx.createRadialGradient(
      STORY_CANVAS_WIDTH * 0.8,
      STORY_CANVAS_HEIGHT * 0.2,
      50,
      STORY_CANVAS_WIDTH * 0.8,
      STORY_CANVAS_HEIGHT * 0.2,
      800
    );
    radial.addColorStop(0, `${accentColor}1A`);
    radial.addColorStop(1, 'rgba(8, 10, 15, 0)');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, STORY_CANVAS_WIDTH, STORY_CANVAS_HEIGHT);
  }

  let startY = topSafeY + 25;

  // Calcolo posizione Y personalizzata (se specificata da 10% a 85%)
  if (typeof story.textPositionY === 'number') {
    const targetY = Math.round(STORY_CANVAS_HEIGHT * (story.textPositionY / 100));
    startY = Math.max(topSafeY + 15, Math.min(bottomSafeY - 100, targetY));
  }

  // ─── 3. BRANDING: LOGO & NOME SULLA GRAFICA DELLA STORY ───
  const shouldShowLogo = story.showLogo !== undefined ? story.showLogo : (settings.showLogo !== false);
  const shouldShowBrandName = story.showBrandName !== undefined ? story.showBrandName : (settings.showBrandName !== false);
  const brandName = story.brandName || settings.brandName || 'AC COACHING';
  const logoUrl = story.logoUrl !== undefined ? story.logoUrl : (settings.logoUrl || null);
  const brandPosition = story.brandPosition || settings.brandPosition || 'top';
  const isTop = brandPosition === 'top';
  const badgeHeight = 52;
  const badgeY = isTop ? topSafeY + 8 : bottomSafeY - badgeHeight - 15;

  if (shouldShowLogo || shouldShowBrandName) {
    ctx.save();
    const align = story.textAlign || 'left';

    // Misurazione testo brand
    ctx.font = 'bold 22px Inter, system-ui, sans-serif';
    const textWidth = shouldShowBrandName ? ctx.measureText(brandName).width : 0;
    const logoSize = shouldShowLogo ? 38 : 0;
    const spacing = (shouldShowLogo && shouldShowBrandName) ? 12 : 0;
    const padX = 18;
    const totalContentWidth = logoSize + spacing + textWidth;
    const badgeWidth = totalContentWidth + padX * 2;

    let badgeX = marginX;
    if (align === 'center') {
      badgeX = (STORY_CANVAS_WIDTH - badgeWidth) / 2;
    } else if (align === 'right') {
      badgeX = STORY_CANVAS_WIDTH - marginX - badgeWidth;
    }

    // Badge Pillola Glassmorphism
    ctx.fillStyle = 'rgba(8, 10, 16, 0.7)';
    drawRoundedRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, badgeHeight / 2);
    ctx.fill();
    ctx.strokeStyle = `${accentColor}45`;
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, badgeHeight / 2);
    ctx.stroke();

    let curX = badgeX + padX;

    // Disegno Logo
    if (shouldShowLogo) {
      const logoY = badgeY + (badgeHeight - logoSize) / 2;
      let logoDrawn = false;
      if (logoUrl) {
        try {
          const logoImg = await loadImage(logoUrl);
          ctx.save();
          ctx.beginPath();
          ctx.arc(curX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(logoImg, curX, logoY, logoSize, logoSize);
          ctx.restore();
          logoDrawn = true;
        } catch {
          // fallback monogram
        }
      }

      if (!logoDrawn) {
        // Monogram elegante con iniziali del brand
        const initials = (brandName.match(/\b\w/g) || ['A', 'C']).slice(0, 2).join('').toUpperCase();
        ctx.fillStyle = `${accentColor}25`;
        ctx.beginPath();
        ctx.arc(curX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.font = 'bold 18px Inter, system-ui, sans-serif';
        ctx.fillStyle = accentColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(initials, curX + logoSize / 2, logoY + logoSize / 2);
      }

      curX += logoSize + spacing;
    }

    // Disegno Nome Brand
    if (shouldShowBrandName) {
      ctx.font = 'bold 22px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowBlur = 8;
      ctx.fillText(brandName, curX, badgeY + badgeHeight / 2);
    }

    ctx.restore();

    // Se il badge è in alto, facciamo partire lo startY del contenuto sotto il badge
    if (isTop) {
      const minStartYUnderBadge = badgeY + badgeHeight + 28;
      startY = Math.max(startY, minStartYUnderBadge);
    }
  }

  const layout: StoryLayoutId = story.layout || 'visual_hook';

  // 4. RENDERING LAYOUT SPECIFICO
  if (layout === 'visual_hook') {
    // ─── LAYOUT 1: VISUAL HOOK (DIVISO IN 1. TITOLO & HIGHLIGHT E 2. SOTTOTITOLO & CORPO) ───
    const titleSize = Math.max(36, Math.min(200, story.fontSizeTitle || 70));
    const subheadlineSize = Math.max(18, Math.min(90, story.fontSizeSubtitle || Math.max(24, Math.min(48, Math.round(titleSize * 0.44)))));
    const bodySize = Math.max(16, Math.min(80, story.fontSizeBody || 32));
    const align = story.textAlign || 'left';

    let textX = marginX;
    if (align === 'center') {
      textX = STORY_CANVAS_WIDTH / 2;
    } else if (align === 'right') {
      textX = STORY_CANVAS_WIDTH - marginX;
    }

    ctx.textAlign = align;
    ctx.textBaseline = 'top';

    const titleLineStep = Math.round(titleSize * 1.15);

    // ─── 1. POSIZIONE & RENDERING TITOLO E TESTO EVIDENZIATO ───
    let titleY = startY;
    const rawTitlePos = typeof story.titlePositionY === 'number'
      ? story.titlePositionY
      : (typeof story.textPositionY === 'number' ? story.textPositionY : 14);

    const targetTitleY = Math.round(STORY_CANVAS_HEIGHT * (rawTitlePos / 100));
    titleY = Math.max(topSafeY + 15, Math.min(bottomSafeY - 120, targetTitleY));

    if (isTop) {
      const minStartYUnderBadge = badgeY + badgeHeight + 28;
      titleY = Math.max(titleY, minStartYUnderBadge);
    }

    let curY = titleY;

    // Titolo Gigante Magnetico (fino a 200px)
    ctx.save();
    ctx.font = `900 ${titleSize}px "${fontFamily}", Inter, sans-serif`;
    ctx.fillStyle = primaryTextColor;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = Math.min(28, Math.round(titleSize * 0.25));
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;

    const hlLines = wrapText(ctx, story.headline || 'TITOLO HOOK DELLA STORIA', contentWidth);
    for (const l of hlLines) {
      ctx.fillText(l, textX, curY);
      curY += titleLineStep;
    }
    ctx.restore();

    // Riga Highlight dorata / colore personalizzato
    if (story.headlineHighlight) {
      curY += Math.round(titleSize * 0.12);
      ctx.save();
      ctx.font = `900 ${titleSize}px "${fontFamily}", Inter, sans-serif`;
      ctx.fillStyle = highlightTextColor;
      ctx.shadowColor = `${highlightTextColor}55`;
      ctx.shadowBlur = 24;

      const hl2Lines = wrapText(ctx, story.headlineHighlight, contentWidth);
      for (const l of hl2Lines) {
        ctx.fillText(l, textX, curY);
        curY += titleLineStep;
      }
      ctx.restore();
    }

    // ─── 2. POSIZIONE & RENDERING SOTTOTITOLO E CORPO DEL TESTO ───
    let subBodyY: number;
    if (typeof story.bodyPositionY === 'number') {
      const targetSubBodyY = Math.round(STORY_CANVAS_HEIGHT * (story.bodyPositionY / 100));
      subBodyY = Math.max(topSafeY + 15, Math.min(bottomSafeY - 60, targetSubBodyY));
      if (!isTop && (shouldShowLogo || shouldShowBrandName)) {
        subBodyY = Math.min(subBodyY, badgeY - 40);
      }
    } else {
      // Fallback consecutivo se bodyPositionY non è specificato
      subBodyY = curY + Math.max(20, Math.round(titleSize * 0.2));
    }

    // Sottotitolo / Contesto (dimensione e colore personalizzabili)
    if (story.subheadline) {
      ctx.save();
      ctx.font = `600 ${subheadlineSize}px "${fontFamily}", Inter, sans-serif`;
      ctx.fillStyle = secondaryTextColor;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 14;

      const subLineStep = Math.round(subheadlineSize * 1.35);
      const subLines = wrapText(ctx, story.subheadline, contentWidth);
      for (const l of subLines) {
        ctx.fillText(l, textX, subBodyY);
        subBodyY += subLineStep;
      }
      ctx.restore();
    }

    // Corpo del Testo (dimensione e colore personalizzabili)
    if (story.bodyText) {
      if (story.subheadline) {
        subBodyY += Math.max(16, Math.round(subheadlineSize * 0.25));
      }
      ctx.save();
      ctx.font = `normal ${bodySize}px "${fontFamily}", Inter, sans-serif`;
      ctx.fillStyle = bodyTextColor;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 12;

      const bodyLineStep = Math.round(bodySize * 1.45);
      const bLines = wrapText(ctx, story.bodyText, contentWidth);
      for (const l of bLines) {
        if (subBodyY > bottomSafeY - 35) break;
        ctx.fillText(l, textX, subBodyY);
        subBodyY += bodyLineStep;
      }
      ctx.restore();
    }
  } else if (layout === 'poll_sticker') {
    // ─── LAYOUT 2: POLL STICKER INTERATTIVO ───
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Titolo
    const titleSize = 58;
    ctx.font = `900 ${titleSize}px Inter, sans-serif`;
    ctx.fillStyle = primaryTextColor;
    const hLines = wrapText(ctx, story.headline, contentWidth);
    for (const l of hLines) {
      ctx.fillText(l, marginX, startY);
      startY += titleSize + 14;
    }

    if (story.headlineHighlight) {
      ctx.font = `900 ${titleSize}px Inter, sans-serif`;
      ctx.fillStyle = accentColor;
      const hlLines = wrapText(ctx, story.headlineHighlight, contentWidth);
      for (const l of hlLines) {
        ctx.fillText(l, marginX, startY);
        startY += titleSize + 14;
      }
    }

    if (story.bodyText) {
      startY += 20;
      ctx.font = '500 30px Inter, sans-serif';
      ctx.fillStyle = secondaryTextColor;
      const bLines = wrapText(ctx, story.bodyText, contentWidth);
      for (const l of bLines) {
        ctx.fillText(l, marginX, startY);
        startY += 44;
      }
    }

    // STICKER SONDAGGIO INSTAGRAM
    const sticker = story.sticker && story.sticker.type === 'poll'
      ? story.sticker
      : {
          type: 'poll' as const,
          question: 'E tu come lo esegui?',
          optionA: 'Cerniera d\'anca ✅',
          optionB: 'Accosciata ❌',
          percentA: 74,
          percentB: 26,
        };

    const pollCardY = Math.max(startY + 40, 850);
    const pollCardHeight = 360;

    // Card Sfondo Sticker
    ctx.fillStyle = '#181E2A';
    drawRoundedRect(ctx, marginX + 30, pollCardY, contentWidth - 60, pollCardHeight, 28);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, marginX + 30, pollCardY, contentWidth - 60, pollCardHeight, 28);
    ctx.stroke();

    // Domanda Sondaggio
    ctx.textAlign = 'center';
    ctx.font = 'bold 34px Inter, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(sticker.question, STORY_CANVAS_WIDTH / 2, pollCardY + 45);

    // Opzione A
    const optAY = pollCardY + 130;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    drawRoundedRect(ctx, marginX + 60, optAY, contentWidth - 120, 80, 20);
    ctx.fill();
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, marginX + 60, optAY, contentWidth - 120, 80, 20);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.font = 'bold 28px Inter, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(sticker.optionA, marginX + 90, optAY + 26);
    if (sticker.percentA) {
      ctx.textAlign = 'right';
      ctx.font = '900 28px Inter, sans-serif';
      ctx.fillStyle = accentColor;
      ctx.fillText(`${sticker.percentA}%`, STORY_CANVAS_WIDTH - marginX - 90, optAY + 26);
    }

    // Opzione B
    const optBY = pollCardY + 235;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    drawRoundedRect(ctx, marginX + 60, optBY, contentWidth - 120, 80, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, marginX + 60, optBY, contentWidth - 120, 80, 20);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.font = 'bold 28px Inter, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(sticker.optionB, marginX + 90, optBY + 26);
    if (sticker.percentB) {
      ctx.textAlign = 'right';
      ctx.font = '900 28px Inter, sans-serif';
      ctx.fillStyle = '#94A3B8';
      ctx.fillText(`${sticker.percentB}%`, STORY_CANVAS_WIDTH - marginX - 90, optBY + 26);
    }

  } else if (layout === 'question_box') {
    // ─── LAYOUT 3: BOX DOMANDE INSTAGRAM ───
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const titleSize = 60;
    ctx.font = `900 ${titleSize}px Inter, sans-serif`;
    ctx.fillStyle = primaryTextColor;
    const hLines = wrapText(ctx, story.headline, contentWidth);
    for (const l of hLines) {
      ctx.fillText(l, marginX, startY);
      startY += titleSize + 14;
    }

    if (story.headlineHighlight) {
      ctx.font = `900 ${titleSize}px Inter, sans-serif`;
      ctx.fillStyle = accentColor;
      const hlLines = wrapText(ctx, story.headlineHighlight, contentWidth);
      for (const l of hlLines) {
        ctx.fillText(l, marginX, startY);
        startY += titleSize + 14;
      }
    }

    const questionBoxY = Math.max(startY + 50, 880);
    const boxHeight = 340;

    // Card Instagram Question Sticker
    ctx.fillStyle = '#1E293B';
    drawRoundedRect(ctx, marginX + 40, questionBoxY, contentWidth - 80, boxHeight, 28);
    ctx.fill();
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2.5;
    drawRoundedRect(ctx, marginX + 40, questionBoxY, contentWidth - 80, boxHeight, 28);
    ctx.stroke();

    // Prompt Header
    const promptText = story.sticker && story.sticker.type === 'question'
      ? story.sticker.prompt
      : (story.bodyText || 'Fammi una domanda su questo esercizio...');

    ctx.textAlign = 'center';
    ctx.font = 'bold 32px Inter, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(promptText, STORY_CANVAS_WIDTH / 2, questionBoxY + 50);

    // Box input fittizio bianco
    const inputY = questionBoxY + 150;
    ctx.fillStyle = '#0F172A';
    drawRoundedRect(ctx, marginX + 80, inputY, contentWidth - 160, 130, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, marginX + 80, inputY, contentWidth - 160, 130, 20);
    ctx.stroke();

    ctx.font = '500 24px Inter, sans-serif';
    ctx.fillStyle = '#64748B';
    ctx.fillText('Scrivi la tua risposta o dubbio...', STORY_CANVAS_WIDTH / 2, inputY + 50);

  } else if (layout === 'final_cta_dm') {
    // ─── LAYOUT 4: FINAL CTA DM / CONVERSIONE ───
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const titleSize = 64;
    ctx.font = `900 ${titleSize}px Inter, sans-serif`;
    ctx.fillStyle = primaryTextColor;
    const hLines = wrapText(ctx, story.headline || 'VUOI IL PROTOCOLLO COMPLETO?', contentWidth);
    for (const l of hLines) {
      ctx.fillText(l, marginX, startY);
      startY += titleSize + 14;
    }

    if (story.headlineHighlight) {
      ctx.font = `900 ${titleSize}px Inter, sans-serif`;
      ctx.fillStyle = accentColor;
      const hlLines = wrapText(ctx, story.headlineHighlight, contentWidth);
      for (const l of hlLines) {
        ctx.fillText(l, marginX, startY);
        startY += titleSize + 14;
      }
    }

    if (story.bodyText) {
      startY += 25;
      ctx.font = '500 32px Inter, sans-serif';
      ctx.fillStyle = secondaryTextColor;
      const bLines = wrapText(ctx, story.bodyText, contentWidth);
      for (const l of bLines) {
        ctx.fillText(l, marginX, startY);
        startY += 46;
      }
    }

    // BOX GRANDE DM CALLOUT
    const ctaCardY = Math.max(startY + 60, 920);
    const ctaHeight = 320;

    ctx.fillStyle = `${accentColor}1A`;
    drawRoundedRect(ctx, marginX, ctaCardY, contentWidth, ctaHeight, 28);
    ctx.fill();
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2.5;
    drawRoundedRect(ctx, marginX, ctaCardY, contentWidth, ctaHeight, 28);
    ctx.stroke();

    // Icona Paper Plane / DM
    ctx.font = '900 44px Inter, sans-serif';
    ctx.fillStyle = accentColor;
    ctx.fillText('✉️ SCRIVIMI IN DM', marginX + 45, ctaCardY + 45);

    ctx.font = '600 28px Inter, sans-serif';
    ctx.fillStyle = '#FEF3C7';
    const keyword = story.sticker && story.sticker.type === 'dm' ? story.sticker.keyword : 'GUIDA';
    ctx.fillText(`Invia la parola "${keyword}" direttamente nei messaggi`, marginX + 45, ctaCardY + 115);
    ctx.fillText('per ricevere l\'analisi video personalizzata.', marginX + 45, ctaCardY + 160);

    // Pillola "Rispondi a questa storia"
    const replyPillY = ctaCardY + 220;
    ctx.fillStyle = '#FFFFFF';
    drawRoundedRect(ctx, marginX + 45, replyPillY, contentWidth - 90, 65, 18);
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.font = '900 24px Inter, sans-serif';
    ctx.fillStyle = '#080A0F';
    ctx.fillText(`SCRIVI "${keyword}" NELLA BARRA IN BASSO ➔`, STORY_CANVAS_WIDTH / 2, replyPillY + 22);

  } else if (layout === 'slider_rating') {
    // ─── LAYOUT: SLIDER CON EMOJI 🔥 ───
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const titleSize = 58;
    ctx.font = `900 ${titleSize}px Inter, sans-serif`;
    ctx.fillStyle = primaryTextColor;
    const hLines = wrapText(ctx, story.headline || 'QUANTO LO SENTI INTENSO?', contentWidth);
    for (const l of hLines) {
      ctx.fillText(l, marginX, startY);
      startY += titleSize + 14;
    }

    if (story.headlineHighlight) {
      ctx.font = `900 ${titleSize}px Inter, sans-serif`;
      ctx.fillStyle = accentColor;
      const hlLines = wrapText(ctx, story.headlineHighlight, contentWidth);
      for (const l of hlLines) {
        ctx.fillText(l, marginX, startY);
        startY += titleSize + 14;
      }
    }

    if (story.bodyText) {
      startY += 20;
      ctx.font = '500 30px Inter, sans-serif';
      ctx.fillStyle = secondaryTextColor;
      const bLines = wrapText(ctx, story.bodyText, contentWidth);
      for (const l of bLines) {
        ctx.fillText(l, marginX, startY);
        startY += 44;
      }
    }

    // STICKER SLIDER EMOJI INSTAGRAM
    const sticker = story.sticker && story.sticker.type === 'slider'
      ? story.sticker
      : {
          type: 'slider' as const,
          question: 'Valuta l\'intensità da 1 a 10',
          emoji: '🔥',
          initialValue: 80,
        };

    const sliderCardY = Math.max(startY + 50, 900);
    const sliderCardHeight = 280;

    // Sfondo Sticker Glassmorphism
    ctx.fillStyle = '#181E2A';
    drawRoundedRect(ctx, marginX + 30, sliderCardY, contentWidth - 60, sliderCardHeight, 28);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, marginX + 30, sliderCardY, contentWidth - 60, sliderCardHeight, 28);
    ctx.stroke();

    // Domanda
    ctx.textAlign = 'center';
    ctx.font = 'bold 32px Inter, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(sticker.question, STORY_CANVAS_WIDTH / 2, sliderCardY + 45);

    // Barra Slider
    const barX = marginX + 80;
    const barY = sliderCardY + 140;
    const barW = contentWidth - 160;
    const barH = 20;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    drawRoundedRect(ctx, barX, barY, barW, barH, 10);
    ctx.fill();

    const progressW = barW * 0.8;
    ctx.fillStyle = accentColor;
    drawRoundedRect(ctx, barX, barY, progressW, barH, 10);
    ctx.fill();

    // Emoji Knob
    const knobX = barX + progressW;
    const knobY = barY + barH / 2;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(knobX, knobY, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(knobX, knobY, 32, 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = '32px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sticker.emoji || '🔥', knobX, knobY);
    ctx.textBaseline = 'top';

  } else if (layout === 'quiz_interactive') {
    // ─── LAYOUT: QUIZ INTERATTIVO INSTAGRAM ───
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const titleSize = 58;
    ctx.font = `900 ${titleSize}px Inter, sans-serif`;
    ctx.fillStyle = primaryTextColor;
    const hLines = wrapText(ctx, story.headline || 'METTITI ALLA PROVA', contentWidth);
    for (const l of hLines) {
      ctx.fillText(l, marginX, startY);
      startY += titleSize + 14;
    }

    if (story.headlineHighlight) {
      ctx.font = `900 ${titleSize}px Inter, sans-serif`;
      ctx.fillStyle = accentColor;
      const hlLines = wrapText(ctx, story.headlineHighlight, contentWidth);
      for (const l of hlLines) {
        ctx.fillText(l, marginX, startY);
        startY += titleSize + 14;
      }
    }

    const sticker = story.sticker && story.sticker.type === 'quiz'
      ? story.sticker
      : {
          type: 'quiz' as const,
          question: 'Qual è il muscolo principale?',
          options: [
            { text: 'Grande Gluteo ✅', isCorrect: true },
            { text: 'Quadrato dei lombi', isCorrect: false },
            { text: 'Retto femorale', isCorrect: false },
          ],
        };

    const quizCardY = Math.max(startY + 40, 840);
    const quizCardHeight = 420;

    // Sfondo Sticker
    ctx.fillStyle = '#181E2A';
    drawRoundedRect(ctx, marginX + 20, quizCardY, contentWidth - 40, quizCardHeight, 28);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, marginX + 20, quizCardY, contentWidth - 40, quizCardHeight, 28);
    ctx.stroke();

    // Domanda Quiz
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px Inter, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(sticker.question, STORY_CANVAS_WIDTH / 2, quizCardY + 40);

    // Opzioni Quiz (fino a 3 o 4)
    const options = sticker.options.slice(0, 3);
    const letters = ['A', 'B', 'C', 'D'];
    let optY = quizCardY + 110;

    for (let oIdx = 0; oIdx < options.length; oIdx++) {
      const opt = options[oIdx];
      const isCorrect = opt.isCorrect;

      ctx.fillStyle = isCorrect ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.06)';
      drawRoundedRect(ctx, marginX + 50, optY, contentWidth - 100, 75, 18);
      ctx.fill();
      ctx.strokeStyle = isCorrect ? '#22C55E' : 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = isCorrect ? 2.5 : 1.5;
      drawRoundedRect(ctx, marginX + 50, optY, contentWidth - 100, 75, 18);
      ctx.stroke();

      // Lettera cerchietto
      ctx.fillStyle = isCorrect ? '#22C55E' : 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.arc(marginX + 90, optY + 37, 22, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '900 20px Inter, sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(letters[oIdx], marginX + 90, optY + 37);
      ctx.textBaseline = 'top';

      // Testo opzione
      ctx.textAlign = 'left';
      ctx.font = 'bold 26px Inter, sans-serif';
      ctx.fillStyle = isCorrect ? '#4ADE80' : '#FFFFFF';
      ctx.fillText(opt.text, marginX + 130, optY + 24);

      optY += 95;
    }

  } else {
    // ─── LAYOUT DEFAULT: TEXT CARD ───
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const titleSize = 58;
    ctx.font = `900 ${titleSize}px Inter, sans-serif`;
    ctx.fillStyle = primaryTextColor;
    const hLines = wrapText(ctx, story.headline, contentWidth);
    for (const l of hLines) {
      ctx.fillText(l, marginX, startY);
      startY += titleSize + 14;
    }

    if (story.headlineHighlight) {
      ctx.font = `900 ${titleSize}px Inter, sans-serif`;
      ctx.fillStyle = accentColor;
      const hlLines = wrapText(ctx, story.headlineHighlight, contentWidth);
      for (const l of hlLines) {
        ctx.fillText(l, marginX, startY);
        startY += titleSize + 14;
      }
    }

    if (story.subheadline) {
      startY += 15;
      ctx.font = '600 30px Inter, sans-serif';
      ctx.fillStyle = accentColor;
      const subLines = wrapText(ctx, story.subheadline, contentWidth);
      for (const l of subLines) {
        ctx.fillText(l, marginX, startY);
        startY += 44;
      }
    }

    if (story.bodyText) {
      startY += 25;
      ctx.font = 'normal 32px Inter, sans-serif';
      ctx.fillStyle = secondaryTextColor;
      const bLines = wrapText(ctx, story.bodyText, contentWidth);
      for (const l of bLines) {
        if (startY > bottomSafeY - 60) break;
        ctx.fillText(l, marginX, startY);
        startY += 48;
      }
    }

    if (story.bulletPoints && story.bulletPoints.length > 0) {
      startY += 20;
      for (const bp of story.bulletPoints) {
        if (startY > bottomSafeY - 60) break;
        ctx.font = 'bold 30px Inter, sans-serif';
        ctx.fillStyle = accentColor;
        ctx.fillText('✔', marginX, startY);

        ctx.font = '500 28px Inter, sans-serif';
        ctx.fillStyle = '#F1F5F9';
        const bpLines = wrapText(ctx, bp, contentWidth - 45);
        for (const bpl of bpLines) {
          ctx.fillText(bpl, marginX + 35, startY);
          startY += 42;
        }
        startY += 10;
      }
    }
  }

  // 5. WATERMARK BRAND IN BASSO
  if (settings.showWatermark !== false) {
    ctx.textAlign = 'center';
    ctx.font = 'bold 18px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fillText(settings.watermarkText || '• AC PERFORMANCE METHOD •', STORY_CANVAS_WIDTH / 2, bottomSafeY - 20);
  }

  // 6. OVERLAY SAFE AREA (SE RICHIESTO)
  if (options.showSafeArea) {
    ctx.save();
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.85)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([12, 10]);

    // Top boundary
    ctx.beginPath();
    ctx.moveTo(0, topSafeY);
    ctx.lineTo(STORY_CANVAS_WIDTH, topSafeY);
    ctx.stroke();

    // Bottom boundary
    ctx.beginPath();
    ctx.moveTo(0, bottomSafeY);
    ctx.lineTo(STORY_CANVAS_WIDTH, bottomSafeY);
    ctx.stroke();

    // Left/Right boundaries
    ctx.beginPath();
    ctx.moveTo(marginX, topSafeY);
    ctx.lineTo(marginX, bottomSafeY);
    ctx.moveTo(STORY_CANVAS_WIDTH - marginX, topSafeY);
    ctx.lineTo(STORY_CANVAS_WIDTH - marginX, bottomSafeY);
    ctx.stroke();

    // Label Safe Area
    ctx.font = '900 18px Inter, sans-serif';
    ctx.fillStyle = '#FB7185';
    ctx.textAlign = 'left';
    ctx.fillText('🔒 SAFE AREA INSTAGRAM (TOP 160PX)', marginX + 10, topSafeY - 12);
    ctx.fillText('🔒 SAFE AREA INSTAGRAM (BOTTOM 280PX)', marginX + 10, bottomSafeY + 26);
    ctx.restore();
  }

  // 7. OVERLAY MOCKUP IG (SE RICHIESTO)
  if (options.showIgMockup) {
    ctx.save();

    // 7a. Barrette temporali Story Instagram in alto
    const barTopY = 36;
    const barHeight = 6;
    const barGap = 8;
    const totalBarWidth = STORY_CANVAS_WIDTH - 40;
    const singleBarWidth = (totalBarWidth - (totalStories - 1) * barGap) / totalStories;

    for (let i = 0; i < totalStories; i++) {
      const barX = 20 + i * (singleBarWidth + barGap);
      ctx.fillStyle = i <= currentStoryIndex ? '#FFFFFF' : 'rgba(255, 255, 255, 0.35)';
      drawRoundedRect(ctx, barX, barTopY, singleBarWidth, barHeight, 3);
      ctx.fill();
    }

    // 7b. Header Autore Instagram simulato (sotto le barrette)
    const headerY = 56;
    const avatarSize = 54;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    drawRoundedRect(ctx, 28, headerY, avatarSize, avatarSize, avatarSize / 2);
    ctx.fill();
    ctx.strokeStyle = `${accentColor}90`;
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, 28, headerY, avatarSize, avatarSize, avatarSize / 2);
    ctx.stroke();

    ctx.font = '900 20px Inter, sans-serif';
    ctx.fillStyle = accentColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('AC', 28 + avatarSize / 2, headerY + avatarSize / 2);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(settings.brandHandle || '@antoniocrapanzano_coach', 96, headerY + 4);

    ctx.font = '500 18px Inter, sans-serif';
    ctx.fillStyle = '#94A3B8';
    ctx.fillText(`Story ${currentStoryIndex + 1} di ${totalStories} • ${settings.brandName || 'AC Coaching'}`, 96, headerY + 30);

    // 7c. Barra di risposta messaggio in basso
    const replyBarY = STORY_CANVAS_HEIGHT - 120;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    drawRoundedRect(ctx, 40, replyBarY, STORY_CANVAS_WIDTH - 180, 70, 35);
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.font = '500 24px Inter, sans-serif';
    ctx.fillStyle = '#CBD5E1';
    ctx.fillText('Invia un messaggio...', 75, replyBarY + 24);

    // Cuoricino
    ctx.font = '36px Inter, sans-serif';
    ctx.fillText('🤍', STORY_CANVAS_WIDTH - 110, replyBarY + 20);
    ctx.restore();
  }

  // 8. GUIDA RITAGLIO GRIGLIA REEL 1:1 E FEED 4:5 (SE RICHIESTA)
  if (options.showGridCropGuide) {
    ctx.save();
    // 1:1 Square (1080x1080) centrato verticalmente a Y = (1920 - 1080) / 2 = 420
    const squareY = (STORY_CANVAS_HEIGHT - STORY_CANVAS_WIDTH) / 2;
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 8]);
    ctx.strokeRect(0, squareY, STORY_CANVAS_WIDTH, STORY_CANVAS_WIDTH);

    ctx.font = '900 16px Inter, sans-serif';
    ctx.fillStyle = '#38BDF8';
    ctx.textAlign = 'center';
    ctx.fillText('📐 ANTEPRIMA GRIGLIA PROFILO 1:1 (1080×1080)', STORY_CANVAS_WIDTH / 2, squareY + 28);

    // 4:5 Feed Crop (1080x1350) centrato verticalmente a Y = (1920 - 1350) / 2 = 285
    const feedH = 1350;
    const feedY = (STORY_CANVAS_HEIGHT - feedH) / 2;
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(0, feedY, STORY_CANVAS_WIDTH, feedH);

    ctx.fillStyle = '#F59E0B';
    ctx.fillText('📱 ANTEPRIMA FEED 4:5 (1080×1350)', STORY_CANVAS_WIDTH / 2, feedY - 12);
    ctx.restore();
  }
}
