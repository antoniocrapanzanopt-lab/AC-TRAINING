import { InstagramCarousel } from '../types/carousel';
import { renderSlideToCanvas, CANVAS_WIDTH, CANVAS_HEIGHT } from './carouselCanvasRenderer';

export type VideoTransitionType = 'swipe' | 'fade' | 'zoom';

export interface CarouselVideoConfig {
  durationPerSlideSeconds: number; // Durata lettura singola slide (es. 2.5, 3.0, 4.0)
  transitionDurationSeconds: number; // Durata transizione (es. 0.5 - 0.7)
  transitionType: VideoTransitionType;
  showProgressBar: boolean;
  enableKenBurns: boolean;
  fps: number; // 30
}

export const DEFAULT_VIDEO_CONFIG: CarouselVideoConfig = {
  durationPerSlideSeconds: 3.2,
  transitionDurationSeconds: 0.6,
  transitionType: 'swipe',
  showProgressBar: true,
  enableKenBurns: true,
  fps: 30,
};

/**
 * Funzione di easing naturale (smooth cubic in-out) per le transizioni swipe e fade
 */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Pre-renderizza tutte le slide del carosello su canvas separati in alta definizione (1080x1350)
 */
export async function preRenderAllCarouselSlides(
  carousel: InstagramCarousel,
  onProgress?: (rendered: number, total: number) => void
): Promise<HTMLCanvasElement[]> {
  const slides = carousel.slides || [];
  const renderedCanvases: HTMLCanvasElement[] = [];

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    await renderSlideToCanvas(canvas, slide, carousel.settings, slides.length);
    renderedCanvases.push(canvas);

    if (onProgress) {
      onProgress(i + 1, slides.length);
    }
  }

  return renderedCanvases;
}

/**
 * Disegna la barra di avanzamento segmentata in alto in stile Instagram Stories/Caroselli
 */
function drawSegmentedProgressBar(
  ctx: CanvasRenderingContext2D,
  totalSlides: number,
  currentTimeSec: number,
  slideDurationSec: number
): void {
  const barY = 28;
  const barHeight = 6;
  const marginX = 48;
  const gap = 8;
  const totalWidth = CANVAS_WIDTH - marginX * 2;
  const segmentWidth = (totalWidth - gap * (totalSlides - 1)) / totalSlides;

  const currentSlideIndex = Math.min(
    totalSlides - 1,
    Math.floor(currentTimeSec / slideDurationSec)
  );
  const timeIntoSlide = currentTimeSec - currentSlideIndex * slideDurationSec;
  const slideProgress = Math.min(1, Math.max(0, timeIntoSlide / slideDurationSec));

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 1;

  for (let i = 0; i < totalSlides; i++) {
    const x = marginX + i * (segmentWidth + gap);

    // Traccia di sfondo
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    ctx.roundRect(x, barY, segmentWidth, barHeight, 3);
    ctx.fill();

    // Riempimento attivo
    let fillRatio = 0;
    if (i < currentSlideIndex) {
      fillRatio = 1;
    } else if (i === currentSlideIndex) {
      fillRatio = slideProgress;
    }

    if (fillRatio > 0) {
      // Gradiente dorato AC Training
      const grad = ctx.createLinearGradient(x, barY, x + segmentWidth, barY);
      grad.addColorStop(0, '#f59e0b');
      grad.addColorStop(1, '#fbbf24');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, barY, segmentWidth * fillRatio, barHeight, 3);
      ctx.fill();
    }
  }

  ctx.restore();
}

/**
 * Disegna un singolo frame di animazione sul target canvas in base al tempo esatto
 */
export function drawCarouselVideoFrame(
  targetCtx: CanvasRenderingContext2D,
  slideCanvases: HTMLCanvasElement[],
  currentTimeSec: number,
  config: CarouselVideoConfig
): void {
  const totalSlides = slideCanvases.length;
  if (totalSlides === 0) return;

  const { durationPerSlideSeconds, transitionDurationSeconds, transitionType, showProgressBar, enableKenBurns } = config;
  const totalDurationSec = totalSlides * durationPerSlideSeconds;
  const boundedTime = Math.min(totalDurationSec - 0.001, Math.max(0, currentTimeSec));

  const currentSlideIndex = Math.min(totalSlides - 1, Math.floor(boundedTime / durationPerSlideSeconds));
  const timeInSlide = boundedTime - currentSlideIndex * durationPerSlideSeconds;
  const holdDuration = Math.max(0.1, durationPerSlideSeconds - transitionDurationSeconds);

  const isTransitioning = timeInSlide >= holdDuration && currentSlideIndex < totalSlides - 1;
  const rawTransProgress = isTransitioning ? (timeInSlide - holdDuration) / transitionDurationSeconds : 0;
  const transProgress = easeInOutCubic(Math.min(1, Math.max(0, rawTransProgress)));

  const currentCanvas = slideCanvases[currentSlideIndex];
  const nextCanvas = slideCanvases[Math.min(totalSlides - 1, currentSlideIndex + 1)];

  targetCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Calcolo micro-zoom Ken Burns se abilitato (1.00 -> 1.025 durante la lettura)
  let zoomScale = 1.0;
  if (enableKenBurns && !isTransitioning) {
    const holdProgress = Math.min(1, timeInSlide / holdDuration);
    zoomScale = 1.0 + holdProgress * 0.025;
  }

  const drawZoomed = (imgCanvas: HTMLCanvasElement, scale: number, offsetX = 0, opacity = 1.0) => {
    targetCtx.save();
    if (opacity < 1.0) {
      targetCtx.globalAlpha = opacity;
    }
    if (scale !== 1.0) {
      targetCtx.translate(CANVAS_WIDTH / 2 + offsetX, CANVAS_HEIGHT / 2);
      targetCtx.scale(scale, scale);
      targetCtx.drawImage(imgCanvas, -CANVAS_WIDTH / 2, -CANVAS_HEIGHT / 2);
    } else {
      targetCtx.drawImage(imgCanvas, offsetX, 0);
    }
    targetCtx.restore();
  };

  if (!isTransitioning || currentSlideIndex >= totalSlides - 1) {
    // ─── STATO HOLD: VISUALIZZAZIONE SLIDE CORRENTE ───
    drawZoomed(currentCanvas, zoomScale, 0, 1.0);
  } else {
    // ─── STATO TRANSIZIONE ───
    if (transitionType === 'swipe') {
      // Scorrimento orizzontale continuo (stile swipe Instagram)
      const currentX = -transProgress * CANVAS_WIDTH;
      const nextX = (1 - transProgress) * CANVAS_WIDTH;

      drawZoomed(currentCanvas, 1.0, currentX);
      drawZoomed(nextCanvas, 1.0, nextX);

      // Ombra di divisione morbida tra le due slide
      targetCtx.save();
      const shadowWidth = 40;
      const shadowGrad = targetCtx.createLinearGradient(nextX, 0, nextX + shadowWidth, 0);
      shadowGrad.addColorStop(0, 'rgba(0,0,0,0.45)');
      shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
      targetCtx.fillStyle = shadowGrad;
      targetCtx.fillRect(nextX, 0, shadowWidth, CANVAS_HEIGHT);
      targetCtx.restore();
    } else if (transitionType === 'fade') {
      // Dissolvenza incrociata (Crossfade)
      drawZoomed(currentCanvas, 1.0, 0, 1 - transProgress);
      drawZoomed(nextCanvas, 1.0, 0, transProgress);
    } else if (transitionType === 'zoom') {
      // Zoom-out & crossfade dinamico
      const outScale = 1.0 + transProgress * 0.08;
      const inScale = 0.94 + transProgress * 0.06;
      drawZoomed(currentCanvas, outScale, 0, 1 - transProgress);
      drawZoomed(nextCanvas, inScale, 0, transProgress);
    }
  }

  // ─── OVERLAY: SEGMENTED PROGRESS BAR ───
  if (showProgressBar && totalSlides > 1) {
    drawSegmentedProgressBar(
      targetCtx,
      totalSlides,
      boundedTime,
      durationPerSlideSeconds
    );
  }
}

/**
 * Individua il miglior mimeType video supportato dal browser (MP4 preferito, poi WebM)
 */
export function getBestSupportedVideoMimeType(): { mimeType: string; extension: string } {
  if (typeof window === 'undefined' || !window.MediaRecorder) {
    return { mimeType: 'video/webm', extension: 'webm' };
  }

  const candidateTypes = [
    { mimeType: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', extension: 'mp4' },
    { mimeType: 'video/mp4;codecs=h264', extension: 'mp4' },
    { mimeType: 'video/mp4', extension: 'mp4' },
    { mimeType: 'video/webm;codecs=h264', extension: 'mp4' },
    { mimeType: 'video/webm;codecs=vp9', extension: 'webm' },
    { mimeType: 'video/webm;codecs=vp8', extension: 'webm' },
    { mimeType: 'video/webm', extension: 'webm' },
  ];

  for (const candidate of candidateTypes) {
    if (MediaRecorder.isTypeSupported(candidate.mimeType)) {
      return candidate;
    }
  }

  return { mimeType: '', extension: 'webm' };
}

/**
 * Esporta e registra l'intero carosello come file video Full HD 1080x1350 (4:5)
 */
export async function recordCarouselVideo(
  carousel: InstagramCarousel,
  config: CarouselVideoConfig = DEFAULT_VIDEO_CONFIG,
  onProgress?: (percent: number, statusText: string) => void,
  shouldAbort?: () => boolean
): Promise<{ blob: Blob; filename: string }> {
  const slides = carousel.slides || [];
  if (slides.length === 0) {
    throw new Error('Il carosello non contiene alcuna slide da esportare in video.');
  }

  if (onProgress) onProgress(5, 'Pre-rendering delle slide grafiche ad alta risoluzione...');

  // 1. Pre-renderizza tutte le slide
  const slideCanvases = await preRenderAllCarouselSlides(carousel, (rendered, total) => {
    if (onProgress) {
      const pct = 5 + Math.round((rendered / total) * 30);
      onProgress(pct, `Pre-rendering slide ${rendered}/${total}...`);
    }
  });

  if (shouldAbort && shouldAbort()) {
    throw new Error('Esportazione video annullata.');
  }

  // 2. Prepara canvas di registrazione
  const recordCanvas = document.createElement('canvas');
  recordCanvas.width = CANVAS_WIDTH;
  recordCanvas.height = CANVAS_HEIGHT;
  const ctx = recordCanvas.getContext('2d');
  if (!ctx) throw new Error('Impossibile ottenere il contesto 2D del canvas.');

  // Disegna subito il primo frame
  drawCarouselVideoFrame(ctx, slideCanvases, 0, config);

  const fps = config.fps || 30;
  const frameIntervalMs = 1000 / fps;
  const totalDurationSec = slides.length * config.durationPerSlideSeconds;
  const totalFrames = Math.ceil(totalDurationSec * fps);

  // 3. Configura MediaRecorder
  const { mimeType, extension } = getBestSupportedVideoMimeType();
  const stream = recordCanvas.captureStream(fps);

  const recorderOptions: MediaRecorderOptions = {
    videoBitsPerSecond: 10_000_000, // 10 Mbps per massima nitidezza 1080p
  };
  if (mimeType) {
    recorderOptions.mimeType = mimeType;
  }

  const recordedChunks: Blob[] = [];
  const recorder = new MediaRecorder(stream, recorderOptions);

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      recordedChunks.push(e.data);
    }
  };

  if (onProgress) onProgress(40, 'Avvio generazione flusso video...');

  // 4. Registrazione frame per frame sincrona con pacing temporale
  return new Promise((resolve, reject) => {
    recorder.onstop = () => {
      const finalBlob = new Blob(recordedChunks, { type: mimeType || 'video/webm' });
      const safeTitle = (carousel.settings?.brandKit?.brandName || carousel.settings?.brandWatermark || 'carosello_animato')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_');
      const filename = `${safeTitle}_4x5_1080x1350.${extension}`;
      if (onProgress) onProgress(100, 'Video pronto!');
      resolve({ blob: finalBlob, filename });
    };

    recorder.onerror = (err) => {
      reject(new Error(`Errore durante la registrazione video: ${err}`));
    };

    recorder.start(100); // Raccogli dati ogni 100ms

    let currentFrame = 0;

    const renderNextFrame = () => {
      if (shouldAbort && shouldAbort()) {
        try { recorder.stop(); } catch (_) {}
        reject(new Error('Esportazione video annullata dall\'utente.'));
        return;
      }

      if (currentFrame >= totalFrames) {
        // Stop della registrazione
        setTimeout(() => {
          try {
            recorder.stop();
          } catch (e) {
            reject(e);
          }
        }, 300);
        return;
      }

      const currentTimeSec = (currentFrame / fps);
      drawCarouselVideoFrame(ctx, slideCanvases, currentTimeSec, config);

      currentFrame++;

      if (onProgress && currentFrame % 10 === 0) {
        const pct = 40 + Math.round((currentFrame / totalFrames) * 58);
        const secRemaining = Math.max(0, Math.ceil((totalFrames - currentFrame) / fps));
        onProgress(pct, `Generazione fotogrammi: ${currentFrame}/${totalFrames} (tempo stimato: ${secRemaining}s)...`);
      }

      setTimeout(renderNextFrame, frameIntervalMs);
    };

    renderNextFrame();
  });
}
