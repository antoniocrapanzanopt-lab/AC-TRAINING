import React, { useEffect, useRef, useState } from 'react';
import { ContentType } from '../../../types/inboxAndContent';
import { InstagramCoverData } from '../../../types/cover';
import { InstagramCarousel } from '../../../types/carousel';
import { renderCoverToCanvas } from '../../../services/coverCanvasRenderer';
import { renderSlideToCanvas } from '../../../services/carouselCanvasRenderer';
import { useToast } from '../../../context/ToastContext';
import {
  Image as ImageIcon,
  Maximize2,
  Download,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface CoverCardPreviewProps {
  type: ContentType;
  coverData?: InstagramCoverData | null;
  carouselData?: InstagramCarousel | null;
  onOpenCoverStudio: () => void;
  onOpenCarouselStudioAtSlide: (slideIndex: number) => void;
}

export const CoverCardPreview: React.FC<CoverCardPreviewProps> = ({
  type,
  coverData,
  carouselData,
  onOpenCoverStudio,
  onOpenCarouselStudioAtSlide,
}) => {
  const { showSuccess, showError } = useToast();
  const miniCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const isCarousel = type === 'carousel';
  const isReel = type === 'reel';

  // 1. Rendering Miniatura Canvas
  useEffect(() => {
    if (!miniCanvasRef.current) return;

    if (isCarousel) {
      // Per carosello, renderizza la Slide 01
      const coverSlide = carouselData?.slides?.[0];
      if (coverSlide && carouselData?.settings) {
        renderSlideToCanvas(
          miniCanvasRef.current,
          coverSlide,
          carouselData.settings,
          carouselData.slides.length
        );
      }
    } else if (coverData) {
      // Per Reel e Post, renderizza coverData
      renderCoverToCanvas(miniCanvasRef.current, coverData, { previewMode: 'full' });
    }
  }, [isCarousel, coverData, carouselData]);

  // 2. Download rapido PNG ad alta risoluzione
  const handleDownloadPng = async () => {
    if (!miniCanvasRef.current) return;
    setIsExporting(true);
    try {
      // Crea un canvas ad alta risoluzione separato per l'export a piena risoluzione
      const exportCanvas = document.createElement('canvas');
      if (isCarousel) {
        const coverSlide = carouselData?.slides?.[0];
        if (coverSlide && carouselData?.settings) {
          await renderSlideToCanvas(
            exportCanvas,
            coverSlide,
            carouselData.settings,
            carouselData.slides.length
          );
        }
      } else if (coverData) {
        await renderCoverToCanvas(exportCanvas, coverData, { previewMode: 'full' });
      }

      exportCanvas.toBlob((blob) => {
        if (!blob) throw new Error('Generazione blob fallita');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cover_${type}_${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showSuccess('Copertina PNG scaricata con successo!');
      }, 'image/png');
    } catch (err) {
      console.error('Errore download copertina:', err);
      showError('Errore durante il download della copertina');
    } finally {
      setIsExporting(false);
    }
  };

  // Stato per badge
  const coverStatus = isCarousel
    ? (carouselData?.slides?.[0]?.headline ? 'ready' : 'draft')
    : (coverData?.status || 'to_create');

  return (
    <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      {/* MINIATURA CANVAS + INFO TESTO */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* MINIATURA CANVAS */}
        <div
          onClick={isCarousel ? () => onOpenCarouselStudioAtSlide(0) : onOpenCoverStudio}
          className={`rounded-xl overflow-hidden shadow-md border border-amber-500/30 bg-slate-950 relative group cursor-pointer shrink-0 flex items-center justify-center transition hover:border-amber-400 ${
            isReel ? 'w-10 h-16' : 'w-12 h-15'
          }`}
          title={isCarousel ? 'Clicca per modificare la copertina nel Carousel Studio' : 'Clicca per aprire il Cover Studio a schermo intero'}
        >
          <canvas
            ref={miniCanvasRef}
            className="w-full h-full object-contain block select-none pointer-events-none"
          />
          <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-amber-400">
            <Maximize2 className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* METADATI E STATO */}
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black text-white flex items-center gap-1.5">
              {isCarousel ? (
                <Layers className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>{isCarousel ? 'Cover Carosello (Slide 01)' : 'Copertina Instagram'}</span>
            </span>

            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
              {isCarousel
                ? '4:5 · 1080×1350'
                : isReel
                ? '9:16 · 1080×1920'
                : '4:5 · 1080×1350'}
            </span>

            {/* BADGE STATO */}
            {coverStatus === 'ready' ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5" /> Pronta
              </span>
            ) : coverStatus === 'draft' ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <AlertCircle className="w-2.5 h-2.5" /> Bozza
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                Da creare
              </span>
            )}
          </div>

          <p className="text-[11px] text-slate-400 truncate">
            {coverData?.headline ? (
              <span className="text-slate-300 font-bold">"{coverData.headline}"</span>
            ) : isReel ? (
              'Grafica 9:16 con anteprima crop griglia profilo Instagram (1:1).'
            ) : isCarousel ? (
              'Copertina ufficiale generata dalla prima slide del carosello.'
            ) : (
              'Grafica copertina ad alto impatto per post feed 4:5.'
            )}
          </p>
        </div>
      </div>

      {/* AZIONI RAPIDE */}
      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
        {isCarousel ? (
          <button
            type="button"
            onClick={() => onOpenCarouselStudioAtSlide(0)}
            className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <span>Modifica Cover nello Studio</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={handleDownloadPng}
              disabled={isExporting}
              title="Scarica cover in PNG ad alta risoluzione"
              className="py-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">{isExporting ? 'Esporto...' : 'Scarica PNG'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenCoverStudio}
              className="py-1.5 px-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition cursor-pointer"
              title="Apri lo Studio Copertine a schermo intero"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Apri Cover Studio</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
