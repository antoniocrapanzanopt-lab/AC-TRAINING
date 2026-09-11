import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { CarouselSlide, CarouselSettings } from '../../../types/carousel';
import { renderSlideToCanvas } from '../../../services/carouselCanvasRenderer';
import { exportSingleSlideAsPng } from '../../../services/carouselExportService';
import { calculateContrastRatio } from '../../../services/coverColorUtils';
import {
  Eye,
  Download,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  Shield,
  Layers,
  Smartphone,
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  Expand,
  Minimize2,
  ArrowLeftRight,
  Grid,
  RotateCcw,
  Hash,
} from 'lucide-react';

export type PreviewViewMode = 'slide' | 'mockup' | 'feed_1_1';

interface CarouselCanvasPreviewProps {
  slide: CarouselSlide;
  settings: CarouselSettings;
  totalSlides: number;
  currentIndex: number;
  onSelectSlide: (index: number) => void;
  fullCarousel: {
    slides: CarouselSlide[];
    settings: CarouselSettings;
    caption_export?: string;
  };
  previousSlide?: CarouselSlide | null;
  isFocusMode?: boolean;
  onToggleFocusMode?: () => void;
  onUpdateSlide?: (updatedSlide: CarouselSlide) => void;
  onToggleSlideCounter?: () => void;
}

type ZoomMode = 'fit' | '75%' | '100%';

export const CarouselCanvasPreview: React.FC<CarouselCanvasPreviewProps> = ({
  slide,
  settings,
  totalSlides,
  currentIndex,
  onSelectSlide,
  fullCarousel,
  previousSlide,
  isFocusMode = false,
  onToggleFocusMode,
  onUpdateSlide,
  onToggleSlideCounter,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fullscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showSafeArea, setShowSafeArea] = useState(false);
  const [viewMode, setViewMode] = useState<PreviewViewMode>('slide');
  const isInstagramMockup = viewMode === 'mockup';
  const showGridCropGuide = viewMode === 'feed_1_1';
  const [isDownloading, setIsDownloading] = useState(false);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<ZoomMode>('fit');
  const [isShowingComparison, setIsShowingComparison] = useState(false);

  // Stato e riferimenti per drag & touch interattivo su immagine
  const isImageInteractive = Boolean(slide.imageUrl && onUpdateSlide);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    initialPosX: number;
    initialPosY: number;
    hasMoved: boolean;
  }>({ startX: 0, startY: 0, initialPosX: 50, initialPosY: 50, hasMoved: false });

  const touchDistanceRef = useRef<number | null>(null);
  const initialZoomRef = useRef<number>(1.0);

  // Renderizza canvas principale con supporto a confronto Prima/Dopo e Guide Safe/Grid
  const renderMainCanvas = useCallback(() => {
    const s = isShowingComparison && previousSlide ? previousSlide : slide;
    if (canvasRef.current && s) {
      renderSlideToCanvas(canvasRef.current, s, settings, totalSlides, {
        showSafeAreaGuidelines: showSafeArea,
        showGridCropGuide,
      });
    }
  }, [slide, previousSlide, isShowingComparison, settings, totalSlides, showSafeArea, showGridCropGuide]);

  useEffect(() => {
    renderMainCanvas();
  }, [renderMainCanvas]);

  // Renderizza canvas fullscreen se aperto
  const renderFullscreenCanvas = useCallback(() => {
    const s = isShowingComparison && previousSlide ? previousSlide : slide;
    if (fullscreenCanvasRef.current && s) {
      renderSlideToCanvas(fullscreenCanvasRef.current, s, settings, totalSlides, {
        showSafeAreaGuidelines: showSafeArea,
        showGridCropGuide,
      });
    }
  }, [slide, previousSlide, isShowingComparison, settings, totalSlides, showSafeArea, showGridCropGuide]);

  useEffect(() => {
    if (isFullscreenOpen) {
      renderFullscreenCanvas();
      const t = setTimeout(renderFullscreenCanvas, 50);
      return () => clearTimeout(t);
    }
  }, [isFullscreenOpen, renderFullscreenCanvas]);

  // Gestione tastiera nello schermo intero (Esc per chiudere, Frecce per scorrere)
  useEffect(() => {
    if (!isFullscreenOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreenOpen(false);
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        onSelectSlide(currentIndex - 1);
      } else if (e.key === 'ArrowRight' && currentIndex < totalSlides - 1) {
        onSelectSlide(currentIndex + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreenOpen, currentIndex, totalSlides, onSelectSlide]);

  const handleDownloadCurrent = async () => {
    setIsDownloading(true);
    try {
      await exportSingleSlideAsPng(slide, {
        id: 'preview',
        content_id: 'preview',
        status: 'draft',
        slides: fullCarousel.slides,
        settings,
        caption_export: fullCarousel.caption_export,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // Calcolo micro-indicatore di contrasto WCAG (invisibile se conforme AAA/AA, puntino arancione se sotto soglia)
  const contrastWarning = useMemo(() => {

    const bg = slide.bgColor || '#070A10';
    const titleCol = slide.titleColor || '#FFFFFF';
    const bodyCol = slide.bodyColor || '#E2E8F0';
    const ratioTitle = calculateContrastRatio(titleCol, bg);
    const ratioBody = calculateContrastRatio(bodyCol, bg);
    const minRatio = Math.min(ratioTitle, ratioBody);
    // Soglia minima di contrasto WCAG (4.5:1 per standard AAA su testo grande / AA su testo normale)
    if (minRatio < 4.5) {
      return {
        ratio: Math.round(minRatio * 10) / 10,
        message: `Attenzione: contrasto testo/sfondo ridotto (${(Math.round(minRatio * 10) / 10)}:1 - raccomandato ≥ 4.5:1)`,
      };
    }
    return null;
  }, [slide.bgColor, slide.titleColor, slide.bodyColor]);

  // Calcolo larghezza massima in base allo zoom selezionato e alla modalità Focus
  const getMaxWidthClass = () => {

    if (isFocusMode) {
      switch (zoomLevel) {
        case '75%':
          return 'max-w-[440px]';
        case '100%':
          return 'max-w-[620px]';
        case 'fit':
        default:
          return 'max-w-[560px] xl:max-w-[620px] 2xl:max-w-[680px]';
      }
    }
    switch (zoomLevel) {
      case '75%':
        return 'max-w-[390px]';
      case '100%':
        return 'max-w-[540px]';
      case 'fit':
      default:
        return 'max-w-[450px] xl:max-w-[490px] 2xl:max-w-[530px]';
    }
  };

  return (
    <div className="flex flex-col items-center space-y-3 w-full">
      {/* ─── 1. TOOLBAR SUPERIORE ANTEPRIMA ─── */}
      <div className="w-full flex items-center justify-between pb-2 border-b border-slate-800/80 px-1 text-xs flex-wrap gap-2">
        {/* SINISTRA: TITOLO + CONTRASTO WCAG (INVISIBILE SE AAA) + ZOOM + FOCUS */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-slate-400 font-bold">
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Anteprima</span>
          </div>

          {/* Micro-indicatore Contrasto (invisibile quando conforme AAA, puntino arancione con tooltip se sotto soglia) */}
          {contrastWarning && (
            <div
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/40 text-[10px] text-amber-300 font-mono cursor-help transition"
              title={contrastWarning.message}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 animate-pulse" />
              <span className="hidden xl:inline text-[9px] font-bold">Contrasto basso</span>
            </div>
          )}

          {/* Selettore Zoom */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[11px]">
            {(['fit', '75%', '100%'] as ZoomMode[]).map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => setZoomLevel(z)}
                className={`px-2 py-0.5 rounded transition cursor-pointer font-medium ${
                  zoomLevel === z
                    ? 'bg-amber-500/20 text-amber-300 font-bold'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
                title={`Imposta zoom a ${z === 'fit' ? 'Adatta' : z}`}
              >
                {z === 'fit' ? 'Adatta' : z}
              </button>
            ))}

            {onToggleFocusMode && (
              <button
                type="button"
                onClick={onToggleFocusMode}
                className={`px-1.5 py-0.5 rounded transition cursor-pointer font-bold ml-0.5 flex items-center gap-1 border-l border-slate-800 pl-1.5 ${
                  isFocusMode
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'text-slate-400 hover:text-white'
                }`}
                title={isFocusMode ? 'Esci dalla Modalità Focus' : 'Attiva Modalità Focus'}
              >
                {isFocusMode ? <Minimize2 className="w-2.5 h-2.5" /> : <Expand className="w-2.5 h-2.5" />}
                <span>Focus</span>
              </button>
            )}
          </div>
        </div>

        {/* DESTRA: SELETTORE UNIFICATO "VISTA" + SAFE AREA + NUMERI + FULLSCREEN */}
        <div className="flex items-center gap-1.5">
          {/* Confronto Prima / Dopo (se disponibile versione precedente) */}
          {previousSlide && (
            <button
              type="button"
              onClick={() => setIsShowingComparison((prev) => !prev)}
              title="Confronta versione attuale con versione precedente"
              className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer flex items-center gap-1 ${
                isShowingComparison
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <ArrowLeftRight className="w-3 h-3 text-amber-400" />
              <span>{isShowingComparison ? 'Versione Prec.' : 'Prima / Dopo'}</span>
            </button>
          )}

          {/* UNICO SELETTORE "VISTA": Slide / Mockup IG / Feed 1:1 */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[11px]">
            <span className="text-[10px] text-slate-500 font-bold px-1.5 hidden xl:inline">Vista:</span>
            <button
              type="button"
              onClick={() => setViewMode('slide')}
              className={`px-2 py-0.5 rounded transition cursor-pointer font-bold ${
                viewMode === 'slide'
                  ? 'bg-amber-500/20 text-amber-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Vista standard slide carosello 1080×1350 (4:5)"
            >
              Slide
            </button>
            <button
              type="button"
              onClick={() => setViewMode('mockup')}
              className={`px-2 py-0.5 rounded transition cursor-pointer font-bold flex items-center gap-1 ${
                viewMode === 'mockup'
                  ? 'bg-pink-500/20 text-pink-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Mostra anteprima dentro il frame mockup smartphone Instagram"
            >
              <Smartphone className="w-3 h-3 text-pink-400" />
              <span>Mockup IG</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('feed_1_1')}
              className={`px-2 py-0.5 rounded transition cursor-pointer font-bold flex items-center gap-1 ${
                viewMode === 'feed_1_1'
                  ? 'bg-sky-500/20 text-sky-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Guida di ritaglio quadrato 1:1 per la griglia feed profilo"
            >
              <Grid className="w-3 h-3 text-sky-400" />
              <span>Feed 1:1</span>
            </button>
          </div>

          {/* Safe Area Toggle */}
          <button
            type="button"
            onClick={() => setShowSafeArea((prev) => !prev)}
            title="Mostra / Nascondi linee guida Safe Area Instagram"
            className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer flex items-center gap-1 ${
              showSafeArea
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3 h-3 text-rose-400" />
            <span>{showSafeArea ? 'Safe Area On' : 'Safe Area'}</span>
          </button>

          {/* Toggle Numeri Slide (Mostra / Rimuovi numerini) */}
          {onToggleSlideCounter && (
            <button
              type="button"
              onClick={onToggleSlideCounter}
              title={
                settings.showSlideCounter !== false
                  ? 'Rimuovi i numerini delle slide dal carosello (es. 2/2)'
                  : 'Mostra i numerini delle slide nel carosello (es. 2/2)'
              }
              className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer flex items-center gap-1 ${
                settings.showSlideCounter !== false
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                  : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
              }`}
            >
              <Hash className={`w-3 h-3 ${settings.showSlideCounter !== false ? 'text-amber-400' : 'text-slate-500'}`} />
              <span>{settings.showSlideCounter !== false ? 'Numeri On' : 'Numeri Off'}</span>
            </button>
          )}

          {/* Schermo Intero Lightbox */}
          <button
            type="button"
            onClick={() => setIsFullscreenOpen(true)}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-700 hover:text-amber-200 transition cursor-pointer"
            title="Visualizza a schermo intero (1080x1350)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ─── 2. CONTENITORE ANTEPRIMA (CON OPZIONE MOCKUP INSTAGRAM) ─── */}
      <div className={`w-full flex items-center justify-center transition-all ${getMaxWidthClass()}`}>
        {isInstagramMockup ? (
          /* MOCKUP INTERFACCIA SMARTPHONE INSTAGRAM */
          <div className="w-full bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl space-y-0">
            {/* Top Bar Profilo Instagram */}
            <div className="px-3.5 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs text-white">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-[1.5px]">
                  <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-[10px] font-bold text-amber-400">
                    AC
                  </div>
                </div>
                <div>
                  <span className="font-bold text-[11px] block leading-none">antoniocrapanzano_coach</span>
                  <span className="text-[9px] text-slate-400 block pt-0.5">AC Training Lab • Audio originale</span>
                </div>
              </div>
              <MoreHorizontal className="w-4 h-4 text-slate-400" />
            </div>

            {/* Canvas 4:5 */}
            <div
              onClick={() => setIsFullscreenOpen(true)}
              className="relative group w-full aspect-[4/5] flex items-center justify-center cursor-pointer bg-slate-950"
              title="Clicca per visualizzare a schermo intero"
            >
              <canvas
                ref={canvasRef}
                width={1080}
                height={1350}
                className="w-full h-full object-contain block select-none pointer-events-none"
              />

              {/* Frecce navigazione */}
              {currentIndex > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectSlide(currentIndex - 1);
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-slate-950/80 text-white border border-slate-700 shadow transition cursor-pointer z-10"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}

              {currentIndex < totalSlides - 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectSlide(currentIndex + 1);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-slate-950/80 text-white border border-slate-700 shadow transition cursor-pointer z-10"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Bottom Bar Azioni Instagram Feed */}
            <div className="p-3 bg-slate-900/90 border-t border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-slate-300">
                <div className="flex items-center gap-3">
                  <Heart className="w-4 h-4 hover:text-rose-500 cursor-pointer transition" />
                  <MessageCircle className="w-4 h-4 hover:text-sky-400 cursor-pointer transition" />
                  <Send className="w-4 h-4 hover:text-emerald-400 cursor-pointer transition" />
                </div>

                {/* Pallini swipe Instagram */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalSlides }).map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${
                        idx === currentIndex ? 'bg-sky-400 scale-125' : 'bg-slate-700'
                      }`}
                    />
                  ))}
                </div>

                <Bookmark className="w-4 h-4 hover:text-amber-400 cursor-pointer transition" />
              </div>

              {/* Dettaglio Caption Preview */}
              <div className="text-[10px] text-slate-400 pt-0.5 line-clamp-1">
                <strong className="text-white font-bold">antoniocrapanzano_coach</strong> {slide.headline}...
              </div>
            </div>
          </div>
        ) : (
          /* ANTEPRIMA STANDARD PULITA 4:5 CON DRAG / TOUCH INTERATTIVO */
          <div
            onPointerDown={(e) => {
              if (!isImageInteractive) return;
              if ((e.target as HTMLElement).closest('button')) return;
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              setIsDragging(true);
              dragStartRef.current = {
                startX: e.clientX,
                startY: e.clientY,
                initialPosX: slide.imagePositionX ?? 50,
                initialPosY: slide.imagePositionY ?? 50,
                hasMoved: false,
              };
            }}
            onPointerMove={(e) => {
              if (!isDragging || !isImageInteractive) return;
              const rect = canvasRef.current?.getBoundingClientRect();
              if (!rect) return;

              const deltaX = e.clientX - dragStartRef.current.startX;
              const deltaY = e.clientY - dragStartRef.current.startY;

              if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
                dragStartRef.current.hasMoved = true;
              }

              const zoom = slide.imageZoom || 1.0;
              const sensX = 100 / (rect.width * Math.max(0.4, zoom - 0.4));
              const sensY = 100 / (rect.height * Math.max(0.4, zoom - 0.4));

              const newPosX = Math.max(0, Math.min(100, Math.round(dragStartRef.current.initialPosX - deltaX * sensX)));
              const newPosY = Math.max(0, Math.min(100, Math.round(dragStartRef.current.initialPosY - deltaY * sensY)));

              onUpdateSlide?.({
                ...slide,
                imagePositionX: newPosX,
                imagePositionY: newPosY,
              });
            }}
            onPointerUp={(e) => {
              if (!isDragging) return;
              try {
                (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
              } catch {
                // Ignore capture release error
              }
              setIsDragging(false);
            }}
            onPointerCancel={() => setIsDragging(false)}
            onTouchStart={(e) => {
              if (e.touches.length === 2 && isImageInteractive) {
                const dist = Math.hypot(
                  e.touches[0].clientX - e.touches[1].clientX,
                  e.touches[0].clientY - e.touches[1].clientY
                );
                touchDistanceRef.current = dist;
                initialZoomRef.current = slide.imageZoom ?? 1.0;
              }
            }}
            onTouchMove={(e) => {
              if (e.touches.length === 2 && isImageInteractive && touchDistanceRef.current !== null) {
                const dist = Math.hypot(
                  e.touches[0].clientX - e.touches[1].clientX,
                  e.touches[0].clientY - e.touches[1].clientY
                );
                const scale = dist / touchDistanceRef.current;
                const newZoom = Math.max(1.0, Math.min(3.0, Math.round(initialZoomRef.current * scale * 100) / 100));
                onUpdateSlide?.({
                  ...slide,
                  imageZoom: newZoom,
                });
              }
            }}
            onTouchEnd={() => {
              touchDistanceRef.current = null;
            }}
            onDoubleClick={(e) => {
              if (!isImageInteractive) return;
              if ((e.target as HTMLElement).closest('button')) return;
              onUpdateSlide?.({
                ...slide,
                imagePositionX: 50,
                imagePositionY: 50,
              });
            }}
            onWheel={(e) => {
              if (!isImageInteractive) return;
              if (e.ctrlKey || e.metaKey || isDragging) {
                e.preventDefault();
                const currentZoom = slide.imageZoom ?? 1.0;
                const zoomDelta = e.deltaY < 0 ? 0.05 : -0.05;
                const newZoom = Math.max(1.0, Math.min(3.0, Math.round((currentZoom + zoomDelta) * 100) / 100));
                onUpdateSlide?.({
                  ...slide,
                  imageZoom: newZoom,
                });
              }
            }}
            onClick={() => {
              if (!isImageInteractive && !dragStartRef.current.hasMoved) {
                setIsFullscreenOpen(true);
              }
            }}
            className={`relative group rounded-3xl overflow-hidden shadow-2xl border border-slate-800/90 bg-slate-950 w-full aspect-[4/5] flex items-center justify-center select-none transition-transform ${
              isImageInteractive
                ? isDragging
                  ? 'cursor-grabbing'
                  : 'cursor-grab hover:border-amber-500/50'
                : 'cursor-pointer hover:scale-[1.008]'
            }`}
            title={
              isImageInteractive
                ? 'Trascina per posizionare · Rotellina per zoom · Doppio clic per centrare'
                : 'Clicca per visualizzare a schermo intero'
            }
          >
            <canvas
              ref={canvasRef}
              width={1080}
              height={1350}
              className="w-full h-full object-contain block select-none pointer-events-none"
            />

            {/* LIVE HUD OVERLAY QUANDO LA FOTO È PRESENTE */}
            {slide.imageUrl && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700/80 shadow-xl text-[11px] font-mono text-slate-200">
                <span className="text-amber-400 font-bold">
                  Zoom {Math.round((slide.imageZoom ?? 1.0) * 100)}%
                </span>
                <span className="text-slate-600">|</span>
                <span>
                  X: <strong className="text-white">{slide.imagePositionX ?? 50}%</strong> Y: <strong className="text-white">{slide.imagePositionY ?? 50}%</strong>
                </span>
                {((slide.imagePositionX ?? 50) !== 50 || (slide.imagePositionY ?? 50) !== 50 || (slide.imageZoom ?? 1.0) !== 1.0) && (
                  <>
                    <span className="text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateSlide?.({
                          ...slide,
                          imagePositionX: 50,
                          imagePositionY: 50,
                          imageZoom: 1.0,
                        });
                      }}
                      className="text-amber-300 hover:text-white flex items-center gap-1 font-bold cursor-pointer transition"
                      title="Ricentra immagine a 50%, 50% e zoom 100%"
                    >
                      <RotateCcw className="w-3 h-3" /> Centra
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Pulsante rapido Schermo Intero in alto a destra */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsFullscreenOpen(true);
              }}
              className="absolute top-3 right-3 z-20 p-2 rounded-xl bg-slate-950/80 hover:bg-slate-900 text-slate-300 hover:text-amber-300 border border-slate-700/80 shadow-md transition cursor-pointer"
              title="Apri a schermo intero (1080x1350)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            {/* Badge overlay Versione Precedente */}
            {isShowingComparison && previousSlide && (
              <div className="absolute top-3 left-3 bg-amber-500 text-slate-950 font-black text-[10px] px-2.5 py-1 rounded-full shadow-xl pointer-events-none z-20 flex items-center gap-1 animate-in fade-in">
                <ArrowLeftRight className="w-3 h-3" />
                <span>VERSIONE PRECEDENTE</span>
              </div>
            )}

            {/* Hint visivo in basso al passaggio del mouse */}
            {slide.imageUrl && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-slate-300 bg-slate-900/90 backdrop-blur px-3 py-1 rounded-full border border-slate-700 shadow-md">
                Trascina per spostare · Doppio clic per centrare
              </div>
            )}

            {/* Frecce navigazione */}
            {currentIndex > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectSlide(currentIndex - 1);
                }}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-950/80 hover:bg-slate-900 text-white border border-slate-700/80 shadow-lg opacity-80 hover:opacity-100 transition cursor-pointer z-10"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}

            {currentIndex < totalSlides - 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectSlide(currentIndex + 1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-950/80 hover:bg-slate-900 text-white border border-slate-700/80 shadow-lg opacity-80 hover:opacity-100 transition cursor-pointer z-10"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ─── 3. BARRA INFERIORE: SPECIFICHE 1080x1350 & NAVIGAZIONE SLIDE ─── */}
      <div className="w-full flex items-center justify-between px-2 pt-1 border-t border-slate-800/80 text-[11px] gap-2 flex-wrap">
        <span className="text-[10px] font-mono text-slate-500">
          Instagram 1080×1350 (4:5)
        </span>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-slate-400 font-bold">
            {currentIndex + 1} / {totalSlides}
          </span>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalSlides }).map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectSlide(idx)}
                className={`w-2 h-2 rounded-full transition cursor-pointer ${
                  idx === currentIndex
                    ? 'bg-amber-400 scale-125 shadow-sm shadow-amber-400/40'
                    : 'bg-slate-800 hover:bg-slate-700'
                }`}
                title={`Vai a slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ─── 4. MODALE FULLSCREEN LIGHTBOX 1080x1350 ─── */}
      {isFullscreenOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-lg flex flex-col items-center justify-between p-4 sm:p-6 animate-in fade-in duration-150 select-none"
          onClick={() => setIsFullscreenOpen(false)}
        >
          {/* HEADER FULLSCREEN LIGHTBOX */}
          <div
            className="w-full max-w-4xl flex items-center justify-between z-20 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 text-white">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-black block">
                  Anteprima a Schermo Intero • Slide {currentIndex + 1} di {totalSlides}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Risoluzione Nativa 1080 × 1350 px (4:5)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSafeArea((prev) => !prev)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                  showSafeArea
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:text-white'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-rose-400" />
                <span>Safe Area: {showSafeArea ? 'On' : 'Off'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadCurrent}
                disabled={isDownloading}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-lg transition cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isDownloading ? 'Esporto...' : 'Scarica PNG'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsFullscreenOpen(false)}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition cursor-pointer"
                title="Chiudi schermo intero (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* CANVAS CENTRALE IN GRANDI DIMENSIONI */}
          <div
            className="relative my-auto h-[76vh] w-[calc(76vh*0.8)] max-w-[90vw] aspect-[4/5] flex items-center justify-center rounded-3xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-950"
            onClick={(e) => e.stopPropagation()}
          >
            <canvas
              ref={fullscreenCanvasRef}
              width={1080}
              height={1350}
              className="w-full h-full object-contain block select-none pointer-events-none"
            />

            {/* FRECCE DI NAVIGAZIONE FULLSCREEN */}
            {currentIndex > 0 && (
              <button
                type="button"
                onClick={() => onSelectSlide(currentIndex - 1)}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-slate-950/85 hover:bg-slate-900 text-white border border-slate-700 shadow-2xl transition cursor-pointer"
                title="Slide precedente (◄)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {currentIndex < totalSlides - 1 && (
              <button
                type="button"
                onClick={() => onSelectSlide(currentIndex + 1)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-slate-950/85 hover:bg-slate-900 text-white border border-slate-700 shadow-2xl transition cursor-pointer"
                title="Slide successiva (►)"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* FOOTER FULLSCREEN CON PALLINI & SCORCIATOIE */}
          <div
            className="w-full max-w-4xl flex items-center justify-between text-xs text-slate-400 z-20 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="font-mono text-[11px]">💡 Usa ◄ / ► per navigare • Esc per uscire</span>

            <div className="flex items-center gap-2">
              {Array.from({ length: totalSlides }).map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSelectSlide(idx)}
                  className={`w-3 h-3 rounded-full transition cursor-pointer ${
                    idx === currentIndex
                      ? 'bg-amber-400 scale-125 shadow-lg shadow-amber-400/50'
                      : 'bg-slate-800 hover:bg-slate-700'
                  }`}
                  title={`Slide ${idx + 1}`}
                />
              ))}
            </div>

            <span className="font-mono text-amber-300 font-bold">
              Slide {currentIndex + 1} / {totalSlides}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
