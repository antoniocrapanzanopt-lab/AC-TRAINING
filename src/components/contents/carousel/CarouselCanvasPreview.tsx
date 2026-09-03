import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CarouselSlide, CarouselSettings } from '../../../types/carousel';
import { renderSlideToCanvas } from '../../../services/carouselCanvasRenderer';
import { exportSingleSlideAsPng } from '../../../services/carouselExportService';
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
} from 'lucide-react';

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
  isFocusMode?: boolean;
  onToggleFocusMode?: () => void;
}

type ZoomMode = 'fit' | '50%' | '75%' | '100%';

export const CarouselCanvasPreview: React.FC<CarouselCanvasPreviewProps> = ({
  slide,
  settings,
  totalSlides,
  currentIndex,
  onSelectSlide,
  fullCarousel,
  isFocusMode = false,
  onToggleFocusMode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fullscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showSafeArea, setShowSafeArea] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<ZoomMode>('fit');
  const [isInstagramMockup, setIsInstagramMockup] = useState(false);

  // Renderizza canvas principale
  const renderMainCanvas = useCallback(() => {
    if (canvasRef.current && slide) {
      renderSlideToCanvas(canvasRef.current, slide, settings, totalSlides, {
        showSafeAreaGuidelines: showSafeArea,
      });
    }
  }, [slide, settings, totalSlides, showSafeArea]);

  useEffect(() => {
    renderMainCanvas();
  }, [renderMainCanvas]);

  // Renderizza canvas fullscreen se aperto
  const renderFullscreenCanvas = useCallback(() => {
    if (fullscreenCanvasRef.current && slide) {
      renderSlideToCanvas(fullscreenCanvasRef.current, slide, settings, totalSlides, {
        showSafeAreaGuidelines: showSafeArea,
      });
    }
  }, [slide, settings, totalSlides, showSafeArea]);

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

  // Calcolo larghezza massima in base allo zoom selezionato
  const getMaxWidthClass = () => {
    switch (zoomLevel) {
      case '50%':
        return 'max-w-[280px]';
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
      {/* ─── 1. TOOLBAR ANTEPRIMA PRO CON ZOOM, MOCKUP IG & SAFE AREA ─── */}
      <div className="w-full flex items-center justify-between px-1 text-xs flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-300 flex items-center gap-1">
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <span>Slide {currentIndex + 1} di {totalSlides}</span>
          </span>

          {/* Selettore Zoom */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px] font-mono">
            {(['fit', '50%', '75%', '100%'] as ZoomMode[]).map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => setZoomLevel(z)}
                className={`px-1.5 py-0.5 rounded transition cursor-pointer font-bold ${
                  zoomLevel === z
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
                title={`Imposta zoom a ${z}`}
              >
                {z === 'fit' ? 'Adatta' : z}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Modalità Instagram Mockup Frame */}
          <button
            type="button"
            onClick={() => setIsInstagramMockup((prev) => !prev)}
            title="Mostra / Nascondi mockup cornice Instagram Feed"
            className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer flex items-center gap-1 ${
              isInstagramMockup
                ? 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 text-pink-200 border-pink-500/50 shadow'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3 h-3 text-pink-400" />
            <span>{isInstagramMockup ? 'Mockup IG On' : 'Mockup IG'}</span>
          </button>

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

          {/* Modalità Focus */}
          {onToggleFocusMode && (
            <button
              type="button"
              onClick={onToggleFocusMode}
              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                isFocusMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
              title={isFocusMode ? 'Esci dalla Modalità Focus' : 'Attiva Modalità Focus (Nascondi lista laterale)'}
            >
              {isFocusMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Expand className="w-3.5 h-3.5" />}
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

          {/* Download PNG rapido */}
          <button
            type="button"
            onClick={handleDownloadCurrent}
            disabled={isDownloading}
            className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
            title="Scarica PNG ad alta risoluzione di questa singola slide"
          >
            <Download className="w-3 h-3 text-amber-400" />
            <span>{isDownloading ? '...' : 'PNG'}</span>
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
          /* ANTEPRIMA STANDARD PULITA 4:5 */
          <div
            onClick={() => setIsFullscreenOpen(true)}
            className="relative group rounded-3xl overflow-hidden shadow-2xl border border-slate-800/90 bg-slate-950 w-full aspect-[4/5] flex items-center justify-center cursor-pointer transition-transform hover:scale-[1.008]"
            title="Clicca per visualizzare a schermo intero"
          >
            <canvas
              ref={canvasRef}
              width={1080}
              height={1350}
              className="w-full h-full object-contain block select-none pointer-events-none"
            />

            {/* OVERLAY HOVER "SCHERMO INTERO" */}
            <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 text-white pointer-events-none">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 font-black flex items-center justify-center shadow-xl shadow-amber-500/30 scale-90 group-hover:scale-100 transition-transform">
                <Maximize2 className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-amber-300 bg-slate-950/90 px-3 py-1 rounded-full border border-amber-500/30 shadow-md">
                Schermo Intero
              </span>
            </div>

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

      {/* ─── 3. INDICATORE PALLINI SLIDE SOTTO L'ANTEPRIMA ─── */}
      <div className="flex items-center gap-1.5 flex-wrap justify-center py-1">
        {Array.from({ length: totalSlides }).map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectSlide(idx)}
            className={`w-2.5 h-2.5 rounded-full transition cursor-pointer ${
              idx === currentIndex
                ? 'bg-amber-400 scale-125 shadow-md shadow-amber-400/40'
                : 'bg-slate-800 hover:bg-slate-700'
            }`}
            title={`Vai a slide ${idx + 1}`}
          />
        ))}
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
