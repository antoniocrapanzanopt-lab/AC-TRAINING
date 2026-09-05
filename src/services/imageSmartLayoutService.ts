/**
 * Servizio per il calcolo geometrico e layout intelligente delle immagini
 * Supporta Carousel Studio (4:5 / 1080×1350) e Story Studio (9:16 / 1080×1920)
 */

export interface ImageDrawBounds {
  drawX: number;
  drawY: number;
  drawWidth: number;
  drawHeight: number;
}

/**
 * Calcola dimensioni e coordinate di disegno dell'immagine sul canvas
 * preservando il rapporto d'aspetto, applicando zoom (1.0 - 3.0) e posizionamento continuo (0 - 100).
 */
export function calculateImageDrawBounds(
  canvasWidth: number,
  canvasHeight: number,
  imageWidth: number,
  imageHeight: number,
  fit: 'cover' | 'contain' = 'cover',
  positionX: number = 50,
  positionY: number = 50,
  zoom: number = 1.0
): ImageDrawBounds {
  const clampedZoom = Math.max(1.0, Math.min(3.0, zoom || 1.0));
  const clampedX = Math.max(0, Math.min(100, positionX ?? 50));
  const clampedY = Math.max(0, Math.min(100, positionY ?? 50));

  const imgAspect = imageWidth / imageHeight;
  const canvasAspect = canvasWidth / canvasHeight;

  let baseWidth = canvasWidth;
  let baseHeight = canvasHeight;

  if (fit === 'cover') {
    if (imgAspect > canvasAspect) {
      // Immagine più larga del canvas: altezza fissa a canvasHeight
      baseHeight = canvasHeight;
      baseWidth = canvasHeight * imgAspect;
    } else {
      // Immagine più alta del canvas: larghezza fissa a canvasWidth
      baseWidth = canvasWidth;
      baseHeight = canvasWidth / imgAspect;
    }
  } else {
    // fit === 'contain': l'immagine deve essere interamente visibile
    if (imgAspect > canvasAspect) {
      baseWidth = canvasWidth;
      baseHeight = canvasWidth / imgAspect;
    } else {
      baseHeight = canvasHeight;
      baseWidth = canvasHeight * imgAspect;
    }
  }

  const drawWidth = baseWidth * clampedZoom;
  const drawHeight = baseHeight * clampedZoom;

  // Se l'immagine è più larga del canvas, l'offset scorre da 0 a (canvasWidth - drawWidth)
  const drawX = (canvasWidth - drawWidth) * (clampedX / 100);
  const drawY = (canvasHeight - drawHeight) * (clampedY / 100);

  return { drawX, drawY, drawWidth, drawHeight };
}

export interface SmartLayoutProposal {
  suggestedTextAlign: 'left' | 'center' | 'right';
  suggestedOverlay: number; // 0-100
  suggestedFit: 'cover' | 'contain';
  suggestedPositionX: number;
  suggestedPositionY: number;
  explanation: string;
}

/**
 * Propone impostazioni di layout intelligenti in base alla posizione del soggetto e ai cue
 */
export function proposeSmartLayout(
  positionX: number = 50,
  positionY: number = 50,
  currentOverlay?: number,
  visualCue?: string
): SmartLayoutProposal {
  let suggestedTextAlign: 'left' | 'center' | 'right' = 'left';
  let explanation = '';

  const cueHint = visualCue ? ` (${visualCue.trim()})` : '';

  if (positionX > 55) {
    // Soggetto a destra -> testo a sinistra
    suggestedTextAlign = 'left';
    explanation = `Soggetto a destra${cueHint}: allinea il testo a sinistra per non coprire l'atleta.`;
  } else if (positionX < 45) {
    // Soggetto a sinistra -> testo a destra
    suggestedTextAlign = 'right';
    explanation = `Soggetto a sinistra${cueHint}: allinea il testo a destra per bilanciare la composizione.`;
  } else {
    // Soggetto centrale
    suggestedTextAlign = 'center';
    explanation = `Soggetto al centro${cueHint}: centratura bilanciata per impatto visuale simmetrico.`;
  }

  // Se l'overlay scuro è basso, suggerisci un valore idoneo per il contrasto tipografico
  const overlay = (currentOverlay !== undefined && currentOverlay >= 30) ? currentOverlay : 55;

  return {
    suggestedTextAlign,
    suggestedOverlay: overlay,
    suggestedFit: 'cover',
    suggestedPositionX: positionX,
    suggestedPositionY: positionY,
    explanation,
  };
}

export interface FocalPointProposal {
  x: number;
  y: number;
  label: string;
  source: 'cue' | 'default';
}

/**
 * Propone il punto focale ottimale partendo da eventuali cue visivi della slide
 */
export function proposeFocalPointFromCue(visualCue?: string): FocalPointProposal {
  if (!visualCue) {
    return {
      x: 50,
      y: 50,
      label: 'Centro ottico naturale (50%, 50%)',
      source: 'default',
    };
  }

  const cueLower = visualCue.toLowerCase();

  if (
    cueLower.includes('primo piano') ||
    cueLower.includes('viso') ||
    cueLower.includes('volto') ||
    /\bocchi\b/i.test(cueLower) ||
    cueLower.includes('sguardo')
  ) {
    return {
      x: 50,
      y: 25,
      label: 'Primo piano atleta / Volto (25% dall\'alto)',
      source: 'cue',
    };
  }

  if (
    cueLower.includes('ginocchio') ||
    cueLower.includes('ginocchia') ||
    cueLower.includes('caviglia') ||
    cueLower.includes('piede') ||
    cueLower.includes('piedi') ||
    cueLower.includes('scarpe')
  ) {
    return {
      x: 50,
      y: 80,
      label: 'Articolazione inferiore / Piedi (80% in basso)',
      source: 'cue',
    };
  }

  if (
    cueLower.includes('schiena') ||
    cueLower.includes('dorso') ||
    cueLower.includes('dorsali') ||
    cueLower.includes('gluteo') ||
    cueLower.includes('glutei') ||
    cueLower.includes('bacino') ||
    /\banca\b/i.test(cueLower) ||
    /\banche\b/i.test(cueLower)
  ) {
    return {
      x: 50,
      y: 45,
      label: 'Catena cinetica / Dorso-Bacino (45% altezza)',
      source: 'cue',
    };
  }

  if (cueLower.includes('bilanciere') || cueLower.includes('manubri') || cueLower.includes('manubrio') || cueLower.includes('attrezzo') || cueLower.includes('panca') || cueLower.includes('rack')) {
    return {
      x: 50,
      y: 50,
      label: 'Focus attrezzo / Esecuzione bilanciere (50% centro)',
      source: 'cue',
    };
  }

  if (cueLower.includes('destra') || cueLower.includes('laterale dx')) {
    return {
      x: 75,
      y: 50,
      label: 'Soggetto laterale destro (75%, 50%)',
      source: 'cue',
    };
  }

  if (cueLower.includes('sinistra') || cueLower.includes('laterale sx')) {
    return {
      x: 25,
      y: 50,
      label: 'Soggetto laterale sinistro (25%, 50%)',
      source: 'cue',
    };
  }

  return {
    x: 50,
    y: 50,
    label: `Focus bilanciato su "${visualCue}"`,
    source: 'cue',
  };
}
