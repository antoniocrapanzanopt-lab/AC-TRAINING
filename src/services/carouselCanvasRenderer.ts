import { CarouselSlide, CarouselSettings, SlideLayoutId } from '../types/carousel';

export const CANVAS_WIDTH = 1080;
export const CANVAS_HEIGHT = 1350;

interface RenderOptions {
  showSafeAreaGuidelines?: boolean;
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
  const layout: SlideLayoutId = slide.layout || (slide.order === 1 ? 'text_center' : slide.order === totalSlides ? 'final_cta' : 'numbered_list');

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

  // ─── 2. IMMAGINE SE PRESENTE (POSIZIONE PERSONALIZZABILE: IN BASSO, A DESTRA, IN ALTO, SFONDO) ───
  if (slide.imageUrl) {
    try {
      const img = await loadImage(slide.imageUrl);
      const imgPos = slide.imagePosition || (layout === 'photo_dominant' ? 'top_half' : 'background_full');
      const opacity = slide.imageOpacity !== undefined ? slide.imageOpacity : 0.6;

      if (imgPos === 'bottom_cutout') {
        // Taglio/Soggetto in basso (metà inferiore) che sfuma sul fondo
        const imgH = CANVAS_HEIGHT * 0.54;
        const imgW = CANVAS_WIDTH;
        const imgY = CANVAS_HEIGHT - imgH;

        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.drawImage(img, 0, imgY, imgW, imgH);
        ctx.restore();

        // Sfumatura di transizione in cima all'immagine
        const blendGrad = ctx.createLinearGradient(0, imgY - 40, 0, imgY + 80);
        blendGrad.addColorStop(0, bgColor);
        blendGrad.addColorStop(1, 'rgba(7, 10, 16, 0)');
        ctx.fillStyle = blendGrad;
        ctx.fillRect(0, imgY - 40, CANVAS_WIDTH, 120);

      } else if (imgPos === 'right_side') {
        // Split laterale a destra (50% a destra)
        const imgW = CANVAS_WIDTH * 0.52;
        const imgH = CANVAS_HEIGHT;
        const imgX = CANVAS_WIDTH - imgW;

        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.drawImage(img, imgX, 0, imgW, imgH);
        ctx.restore();

        // Sfumatura laterale da sinistra a destra
        const sideGrad = ctx.createLinearGradient(imgX - 60, 0, imgX + 80, 0);
        sideGrad.addColorStop(0, bgColor);
        sideGrad.addColorStop(1, 'rgba(7, 10, 16, 0)');
        ctx.fillStyle = sideGrad;
        ctx.fillRect(imgX - 60, 0, 140, CANVAS_HEIGHT);

      } else if (imgPos === 'top_half' || layout === 'photo_dominant') {
        // Metà superiore
        const imgHeight = CANVAS_HEIGHT * 0.48;
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.drawImage(img, 0, 0, CANVAS_WIDTH, imgHeight);
        ctx.restore();

        const blendGrad = ctx.createLinearGradient(0, imgHeight - 160, 0, imgHeight + 40);
        blendGrad.addColorStop(0, 'rgba(7, 10, 16, 0)');
        blendGrad.addColorStop(1, bgColor);
        ctx.fillStyle = blendGrad;
        ctx.fillRect(0, imgHeight - 160, CANVAS_WIDTH, 200);

      } else {
        // Sfondo a tutto schermo con overlay
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.restore();

        const overlayGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
        overlayGrad.addColorStop(0, 'rgba(7, 10, 16, 0.72)');
        overlayGrad.addColorStop(0.5, 'rgba(7, 10, 16, 0.88)');
        overlayGrad.addColorStop(1, 'rgba(7, 10, 16, 0.98)');
        ctx.fillStyle = overlayGrad;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }
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
  const categoryTagText = slide.categoryTag || (templateId === 'hypertrophy_science' ? '■ FISIOLOGIA DELL\'ALLENAMENTO' : null);
  
  if (categoryTagText) {
    // Top Left Category Tag stile Screenshot 3 & 4 (■ CATEGORIA)
    ctx.font = `bold 20px ${bodyFont}, system-ui, sans-serif`;
    ctx.fillStyle = accentColor;
    ctx.textBaseline = 'middle';
    ctx.fillText(categoryTagText, marginX, topSafeY + 16);
  } else {
    // Pillola Tag Standard
    const tagText = slide.takeawayTag || (isFirstSlide ? (brandKit.brandName || 'GUIDA PRATICA') : isLastSlide ? 'SALVA IL POST' : `STEP ${slide.order}`);
    ctx.font = `bold 22px ${bodyFont}, system-ui, sans-serif`;
    const tagMetrics = ctx.measureText(tagText);
    const tagPadX = 18;
    const tagWidth = tagMetrics.width + tagPadX * 2;
    const tagHeight = 38;
    const tagStartX = brandKit.logoUrl && brandKit.logoPosition === 'top_left' ? marginX + 54 : marginX;

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

  // Contatore slide in alto a destra (con linea o frazione stile 2/8)
  if (settings.showSlideCounter) {
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
  let startY = layout === 'photo_dominant' ? CANVAS_HEIGHT * 0.44 : topSafeY + 70;

  // ─── LAYOUT 1: CONNECTED ICON LIST (STILE SCREENSHOT 2: NODI CONNESSI & PAROLE CHIAVE) ───
  if (layout === 'connected_icon_list') {
    // Titolo Gigante Impatto
    const fontSize = titleFontSize;
    ctx.font = `900 ${fontSize}px ${titleFont}, system-ui, sans-serif`;
    ctx.fillStyle = primaryTextColor;
    ctx.textBaseline = 'top';
    const headlineLines = wrapText(ctx, slide.headline, contentWidth);
    for (const line of headlineLines) {
      ctx.fillText(line, marginX, startY);
      startY += fontSize + 10;
    }

    if (slide.headlineHighlight) {
      ctx.font = `900 ${fontSize}px ${titleFont}, system-ui, sans-serif`;
      ctx.fillStyle = accentColor;
      const hLines = wrapText(ctx, slide.headlineHighlight, contentWidth);
      for (const hl of hLines) {
        ctx.fillText(hl, marginX, startY);
        startY += fontSize + 10;
      }
    }

    // Linea divisoria sottile
    startY += 10;
    ctx.strokeStyle = `${accentColor}88`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(marginX, startY);
    ctx.lineTo(marginX + 80, startY);
    ctx.stroke();
    startY += 25;

    // Sottotitolo / Intro
    if (slide.subheadline) {
      ctx.font = `600 28px ${bodyFont}, system-ui, sans-serif`;
      ctx.fillStyle = '#E2E8F0';
      const subLines = wrapText(ctx, slide.subheadline, contentWidth);
      for (const sl of subLines) {
        ctx.fillText(sl, marginX, startY);
        startY += 38;
      }
      startY += 20;
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
      ctx.font = `500 24px ${bodyFont}, system-ui, sans-serif`;
      ctx.fillStyle = secondaryTextColor;
      ctx.textBaseline = 'top';
      const bodyLines = wrapText(ctx, slide.bodyText, contentWidth);
      for (const bl of bodyLines) {
        ctx.fillText(bl, marginX, startY);
        startY += 34;
      }
    }

  // ─── LAYOUT 2: DIAGRAM FLOW (STILE SCREENSHOT 4: PREMESSA -> FRECCIA -> TASK FAILURE -> PUNCHLINE) ───
  } else if (layout === 'diagram_flow') {
    // Titolo a due toni gigante
    const fontSize = titleFontSize;
    ctx.font = `900 ${fontSize}px ${titleFont}, system-ui, sans-serif`;
    ctx.fillStyle = primaryTextColor;
    ctx.textBaseline = 'top';
    const headlineLines = wrapText(ctx, slide.headline, contentWidth);
    for (const line of headlineLines) {
      ctx.fillText(line, marginX, startY);
      startY += fontSize + 8;
    }

    if (slide.headlineHighlight) {
      ctx.font = `900 ${fontSize}px ${titleFont}, system-ui, sans-serif`;
      ctx.fillStyle = accentColor;
      const hLines = wrapText(ctx, slide.headlineHighlight, contentWidth);
      for (const hl of hLines) {
        ctx.fillText(hl, marginX, startY);
        startY += fontSize + 8;
      }
    }

    startY += 15;

    // Box Premessa con barra verticale a sinistra
    if (slide.subheadline) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      const subLines = wrapText(ctx, slide.subheadline, contentWidth - 40);
      const boxH = subLines.length * 36 + 30;
      drawRoundedRect(ctx, marginX, startY, contentWidth, boxH, 12);
      ctx.fill();

      // Barra laterale accent
      ctx.fillStyle = accentColor;
      ctx.fillRect(marginX, startY, 5, boxH);

      ctx.font = `500 24px ${bodyFont}, system-ui, sans-serif`;
      ctx.fillStyle = '#E2E8F0';
      let bY = startY + 20;
      for (const sl of subLines) {
        ctx.fillText(sl, marginX + 25, bY);
        bY += 34;
      }
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
    const fontSize = titleFontSize;
    
    // Riga 1: Titolo Bianco
    ctx.font = `900 ${fontSize}px ${titleFont}, system-ui, sans-serif`;
    ctx.fillStyle = primaryTextColor;
    ctx.textBaseline = 'top';
    const lines1 = wrapText(ctx, slide.headline, contentWidth);
    for (const l of lines1) {
      ctx.fillText(l, marginX, startY);
      startY += fontSize + 10;
    }

    // Riga 2: Titolo Evidenziato Accento
    if (slide.headlineHighlight) {
      ctx.font = `900 ${fontSize}px ${titleFont}, system-ui, sans-serif`;
      ctx.fillStyle = accentColor;
      const lines2 = wrapText(ctx, slide.headlineHighlight, contentWidth);
      for (const l of lines2) {
        ctx.fillText(l, marginX, startY);
        startY += fontSize + 10;
      }
    }

    startY += 15;

    // Sottotitolo / Hook
    if (slide.subheadline) {
      ctx.font = `700 28px ${bodyFont}, system-ui, sans-serif`;
      ctx.fillStyle = '#E2E8F0';
      const subLines = wrapText(ctx, slide.subheadline, contentWidth);
      for (const sl of subLines) {
        ctx.fillText(sl, marginX, startY);
        startY += 38;
      }
    }

    // Box Swipe in basso
    const swipeY = Math.max(startY + 40, CANVAS_HEIGHT - 220);
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
    ctx.fillText('Scorri per scoprire i dati ➔', CANVAS_WIDTH / 2, swipeY + 35);
    ctx.textAlign = 'left';

  // ─── LAYOUT A: ERROR VS CORRECT (CONFRONTO SPLIT) ───
  } else if (layout === 'error_vs_correct') {
    ctx.font = `900 48px ${titleFont}, system-ui, sans-serif`;
    ctx.fillStyle = primaryTextColor;
    ctx.textBaseline = 'top';
    const headlineLines = wrapText(ctx, slide.headline, contentWidth);
    for (const line of headlineLines) {
      ctx.fillText(line, marginX, startY);
      startY += 60;
    }
    startY += 20;

    const boxHeight = 220;
    const wrongBoxY = startY;

    // BOX ❌ ERRORE (Rosso)
    ctx.fillStyle = 'rgba(244, 63, 94, 0.08)';
    drawRoundedRect(ctx, marginX, wrongBoxY, contentWidth, boxHeight, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.35)';
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, marginX, wrongBoxY, contentWidth, boxHeight, 18);
    ctx.stroke();

    ctx.font = `900 24px ${titleFont}, system-ui, sans-serif`;
    ctx.fillStyle = '#F43F5E';
    ctx.fillText('❌ ERRORE COMUNE DA EVITARE:', marginX + 25, wrongBoxY + 30);

    ctx.font = `500 25px ${bodyFont}, system-ui, sans-serif`;
    ctx.fillStyle = '#FFE4E6';
    const wrongLines = wrapText(ctx, slide.wrongText || slide.bodyText || 'Movimento scorretto', contentWidth - 50);
    let wY = wrongBoxY + 70;
    for (const line of wrongLines) {
      ctx.fillText(line, marginX + 25, wY);
      wY += 36;
    }

    // BOX ✅ CORREZIONE (Verde)
    const correctBoxY = wrongBoxY + boxHeight + 25;
    ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
    drawRoundedRect(ctx, marginX, correctBoxY, contentWidth, boxHeight, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, marginX, correctBoxY, contentWidth, boxHeight, 18);
    ctx.stroke();

    ctx.font = `900 24px ${titleFont}, system-ui, sans-serif`;
    ctx.fillStyle = '#10B981';
    ctx.fillText('✅ CORREZIONE BIOMECCANICA OTTIMALE:', marginX + 25, correctBoxY + 30);

    ctx.font = `500 25px ${bodyFont}, system-ui, sans-serif`;
    ctx.fillStyle = '#D1FAE5';
    const correctLines = wrapText(ctx, slide.correctText || slide.subheadline || 'Adattamento corretto delle leve', contentWidth - 50);
    let cY = correctBoxY + 70;
    for (const line of correctLines) {
      ctx.fillText(line, marginX + 25, cY);
      cY += 36;
    }

  // ─── LAYOUT B: NUMBERED LIST / ELENCO PUNTATO CON CARD ───
  } else if (layout === 'numbered_list') {
    ctx.font = `900 48px ${titleFont}, system-ui, sans-serif`;
    ctx.fillStyle = primaryTextColor;
    ctx.textBaseline = 'top';
    const headlineLines = wrapText(ctx, slide.headline, contentWidth);
    for (const line of headlineLines) {
      ctx.fillText(line, marginX, startY);
      startY += 58;
    }

    if (slide.subheadline) {
      startY += 10;
      ctx.font = `600 26px ${bodyFont}, system-ui, sans-serif`;
      ctx.fillStyle = accentColor;
      const subLines = wrapText(ctx, slide.subheadline, contentWidth);
      for (const line of subLines) {
        ctx.fillText(line, marginX, startY);
        startY += 38;
      }
    }

    startY += 25;

    const bullets = slide.bulletPoints && slide.bulletPoints.length > 0 ? slide.bulletPoints : [slide.bodyText];
    let num = 1;
    for (const b of bullets) {
      ctx.font = `500 26px ${bodyFont}, system-ui, sans-serif`;
      const bLines = wrapText(ctx, b.replace(/^[0-9•✅❌-]\.?\s*/, ''), contentWidth - 90);
      const cardHeight = Math.max(90, bLines.length * 36 + 40);

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
      ctx.font = `500 25px ${bodyFont}, system-ui, sans-serif`;
      ctx.fillStyle = '#F1F5F9';
      let bTextY = startY + (cardHeight - bLines.length * 36) / 2 + 10;
      for (const bl of bLines) {
        ctx.fillText(bl, marginX + 75, bTextY);
        bTextY += 36;
      }

      startY += cardHeight + 16;
      num++;
    }

  // ─── LAYOUT C: STEP BY STEP / PROGRESSIONE TIMELINE ───
  } else if (layout === 'step_by_step') {
    ctx.font = `900 48px ${titleFont}, system-ui, sans-serif`;
    ctx.fillStyle = primaryTextColor;
    ctx.textBaseline = 'top';
    const headlineLines = wrapText(ctx, slide.headline, contentWidth);
    for (const line of headlineLines) {
      ctx.fillText(line, marginX, startY);
      startY += 58;
    }

    startY += 30;

    const steps = slide.bulletPoints && slide.bulletPoints.length > 0 ? slide.bulletPoints : [slide.bodyText];
    let stepIdx = 1;

    for (const st of steps) {
      ctx.font = `bold 22px ${bodyFont}, system-ui, sans-serif`;
      ctx.fillStyle = accentColor;
      ctx.fillText(`STEP ${stepIdx}`, marginX + 60, startY);

      ctx.font = `500 26px ${bodyFont}, system-ui, sans-serif`;
      const stepLines = wrapText(ctx, st.replace(/^(?:Step\s*\d+:?|[-•])\s*/i, ''), contentWidth - 70);
      let sY = startY + 36;
      for (const sl of stepLines) {
        ctx.fillStyle = '#E2E8F0';
        ctx.fillText(sl, marginX + 60, sY);
        sY += 36;
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
        ctx.lineTo(marginX + 20, sY + 20);
        ctx.stroke();
      }

      startY = sY + 30;
      stepIdx++;
    }

  // ─── LAYOUT D: TEXT CENTER / COPERTINA (DEFAULT COVER) ───
  } else if (layout === 'text_center' || isFirstSlide) {
    ctx.textAlign = 'center';
    
    // Watermark centrale
    ctx.font = `bold 22px ${bodyFont}, system-ui, sans-serif`;
    ctx.fillStyle = accentColor;
    ctx.fillText(brandKit.watermarkText || `• ${brandKit.brandName} •`, CANVAS_WIDTH / 2, startY);
    startY += 55;

    // Titolo Gigante Centrato
    const fontSize = titleFontSize;
    ctx.font = `900 ${fontSize}px ${titleFont}, system-ui, sans-serif`;
    ctx.fillStyle = primaryTextColor;
    ctx.textBaseline = 'top';
    const headlineLines = wrapText(ctx, slide.headline, contentWidth);
    for (const line of headlineLines) {
      ctx.fillText(line, CANVAS_WIDTH / 2, startY);
      startY += fontSize + 16;
    }

    // Headline Highlight (seconda riga) se presente
    if (slide.headlineHighlight) {
      ctx.font = `900 ${fontSize}px ${titleFont}, system-ui, sans-serif`;
      ctx.fillStyle = accentColor;
      const hlLines = wrapText(ctx, slide.headlineHighlight, contentWidth);
      for (const hl of hlLines) {
        ctx.fillText(hl, CANVAS_WIDTH / 2, startY);
        startY += fontSize + 16;
      }
    }

    startY += 25;

    // Linea divisoria oro centrata
    ctx.fillStyle = accentColor;
    ctx.fillRect(CANVAS_WIDTH / 2 - 120, startY, 240, 4);
    startY += 40;

    // Sottotitolo centrato
    if (slide.subheadline) {
      ctx.font = `600 ${Math.max(22, Math.round(titleFontSize * 0.55))}px ${bodyFont}, system-ui, sans-serif`;
      ctx.fillStyle = '#E2E8F0';
      const subLines = wrapText(ctx, slide.subheadline, contentWidth);
      for (const line of subLines) {
        ctx.fillText(line, CANVAS_WIDTH / 2, startY);
        startY += 44;
      }
    }

    // Box swipe in copertina
    const swipeY = Math.max(startY + 40, CANVAS_HEIGHT - 260);
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
    ctx.fillText('Scorri per la guida completa ➔', CANVAS_WIDTH / 2, swipeY + 37.5);
    ctx.textAlign = 'left';

  // ─── LAYOUT E: FINAL CTA / CHIUSURA BRAND ───
  } else if (layout === 'final_cta' || isLastSlide) {
    ctx.font = `900 52px ${titleFont}, system-ui, sans-serif`;
    ctx.fillStyle = primaryTextColor;
    ctx.textBaseline = 'top';
    const headlineLines = wrapText(ctx, slide.headline, contentWidth);
    for (const line of headlineLines) {
      ctx.fillText(line, marginX, startY);
      startY += 62;
    }

    if (slide.subheadline) {
      startY += 15;
      ctx.font = `600 28px ${bodyFont}, system-ui, sans-serif`;
      ctx.fillStyle = '#CBD5E1';
      const subLines = wrapText(ctx, slide.subheadline, contentWidth);
      for (const line of subLines) {
        ctx.fillText(line, marginX, startY);
        startY += 40;
      }
    }

    startY += 40;

    const ctaBoxY = Math.max(startY, CANVAS_HEIGHT - 380);
    ctx.fillStyle = `${accentColor}22`;
    drawRoundedRect(ctx, marginX, ctaBoxY, contentWidth, 190, 24);
    ctx.fill();

    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2.5;
    drawRoundedRect(ctx, marginX, ctaBoxY, contentWidth, 190, 24);
    ctx.stroke();

    ctx.font = `900 30px ${titleFont}, system-ui, sans-serif`;
    ctx.fillStyle = accentColor;
    ctx.fillText('💾 SALVA IL POST & COMMENTA', marginX + 35, ctaBoxY + 35);

    ctx.font = `500 24px ${bodyFont}, system-ui, sans-serif`;
    ctx.fillStyle = '#FEF3C7';
    const ctaBodyLines = wrapText(ctx, slide.bodyText || 'Commenta per ricevere l\'analisi video in DM.', contentWidth - 70);
    let ctaBodyY = ctaBoxY + 80;
    for (const bl of ctaBodyLines) {
      ctx.fillText(bl, marginX + 35, ctaBodyY);
      ctaBodyY += 34;
    }

    ctx.font = `600 20px ${bodyFont}, system-ui, sans-serif`;
    ctx.fillStyle = '#94A3B8';
    ctx.fillText(brandKit.authorSignature, marginX + 35, ctaBoxY + 150);

  // ─── LAYOUT DEFAULT: TEXT LEFT ───
  } else {
    ctx.font = `900 50px ${titleFont}, system-ui, sans-serif`;
    ctx.fillStyle = primaryTextColor;
    ctx.textBaseline = 'top';
    const headlineLines = wrapText(ctx, slide.headline, contentWidth);
    for (const line of headlineLines) {
      ctx.fillText(line, marginX, startY);
      startY += 60;
    }

    if (slide.headlineHighlight) {
      ctx.font = `900 50px ${titleFont}, system-ui, sans-serif`;
      ctx.fillStyle = accentColor;
      const hlLines = wrapText(ctx, slide.headlineHighlight, contentWidth);
      for (const hl of hlLines) {
        ctx.fillText(hl, marginX, startY);
        startY += 60;
      }
    }

    if (slide.subheadline) {
      startY += 12;
      ctx.font = `600 26px ${bodyFont}, system-ui, sans-serif`;
      ctx.fillStyle = accentColor;
      const subLines = wrapText(ctx, slide.subheadline, contentWidth);
      for (const line of subLines) {
        ctx.fillText(line, marginX, startY);
        startY += 38;
      }
    }

    if (slide.bodyText) {
      startY += 20;
      ctx.font = `normal ${bodyFontSize}px ${bodyFont}, system-ui, sans-serif`;
      ctx.fillStyle = secondaryTextColor;
      const bodyLines = wrapText(ctx, slide.bodyText, contentWidth);
      for (const line of bodyLines) {
        ctx.fillText(line, marginX, startY);
        startY += bodyFontSize + 14;
      }
    }
  }

  // ─── 7. BOTTOM BAR: CITAZIONE STUDIO / AUTHOR HANDLE & SWIPE / ARROW ───
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(marginX, bottomSafeY - 20);
  ctx.lineTo(CANVAS_WIDTH - marginX, bottomSafeY - 20);
  ctx.stroke();

  // Citazione Scientifica Studio / PMID (se presente) in basso a sinistra (Stile Screenshot 4)
  if (slide.citationSource) {
    ctx.font = `italic 18px ${bodyFont}, monospace`;
    ctx.fillStyle = '#64748B';
    ctx.textBaseline = 'middle';
    ctx.fillText(slide.citationSource, marginX, bottomSafeY + 10);
  } else {
    // Author handle a sinistra
    ctx.font = `bold 22px ${bodyFont}, system-ui, sans-serif`;
    ctx.fillStyle = '#E2E8F0';
    ctx.textBaseline = 'middle';
    ctx.fillText(brandKit.authorHandle, marginX, bottomSafeY + 10);
  }

  // Indicatore Swipe / Freccia Oro a destra (Stile Screenshot 2)
  ctx.textAlign = 'right';
  ctx.font = `bold 24px ${bodyFont}, system-ui, sans-serif`;
  ctx.fillStyle = accentColor;
  if (isLastSlide) {
    ctx.fillText('Salva per dopo 🔖', CANVAS_WIDTH - marginX, bottomSafeY + 10);
  } else {
    ctx.fillText('➔', CANVAS_WIDTH - marginX, bottomSafeY + 10);
  }
  ctx.textAlign = 'left';

  // ─── 8. LINEE GUIDA SAFE AREA OPZIONALI ───
  if (options.showSafeAreaGuidelines) {
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.strokeRect(marginX, topSafeY, contentWidth, bottomSafeY - topSafeY);
    ctx.setLineDash([]);
  }
};
