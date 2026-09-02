import React, { useEffect, useRef, useState } from 'react';
import {
  InstagramCarousel,
  CarouselStatus,
} from '../../../types/carousel';
import {
  generateCarouselFromContent,
} from '../../../services/carouselGeneratorService';
import {
  exportFullCarouselZip,
} from '../../../services/carouselExportService';
import { renderSlideToCanvas } from '../../../services/carouselCanvasRenderer';
import { useToast } from '../../../context/ToastContext';
import {
  Maximize2,
  Sparkles,
  Download,
  Layers,
  FileArchive,
} from 'lucide-react';

interface CarouselStructuredEditorProps {
  carousel: InstagramCarousel;
  onChange: (updatedCarousel: InstagramCarousel) => void;
  onOpenFullscreenStudio: () => void;
  contentTitle?: string;
}

const STATUS_LABELS: Record<CarouselStatus, { label: string; color: string }> = {
  draft: { label: 'Bozza', color: 'bg-slate-800 text-slate-300 border-slate-700' },
  needs_review: { label: 'Da Rivedere', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  ready: { label: 'Pronto per Pubblicazione', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  exported: { label: 'Esportato', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
};

export const CarouselStructuredEditor: React.FC<CarouselStructuredEditorProps> = ({
  carousel,
  onChange,
  onOpenFullscreenStudio,
  contentTitle,
}) => {
  const { showSuccess, showError } = useToast();
  const miniCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [exportProgress, setExportProgress] = useState('');

  const slides = carousel.slides || [];
  const coverSlide = slides[0];
  const currentStatus = STATUS_LABELS[carousel.status] || STATUS_LABELS.draft;

  // Renderizza la miniatura della copertina
  useEffect(() => {
    if (miniCanvasRef.current && coverSlide) {
      renderSlideToCanvas(miniCanvasRef.current, coverSlide, carousel.settings, slides.length);
    }
  }, [coverSlide, carousel.settings, slides.length]);

  // Rigenera con AI
  const handleRegenerate = () => {
    const fresh = generateCarouselFromContent({
      title: contentTitle,
      caption: carousel.caption_export,
    });
    onChange(fresh);
    showSuccess('Nuova struttura carosello generata con AI!');
  };

  // Esporta ZIP
  const handleExportZip = async () => {
    setIsExportingZip(true);
    setExportProgress('Rendering slide...');
    try {
      await exportFullCarouselZip(carousel, (curr, tot) => {
        setExportProgress(`Slide ${curr}/${tot}...`);
      });
      onChange({ ...carousel, status: 'exported' });
      showSuccess('Archivio ZIP scaricato con successo!');
    } catch {
      showError('Errore durante la creazione del file ZIP');
    } finally {
      setIsExportingZip(false);
      setExportProgress('');
    }
  };

  return (
    <div className="bg-slate-950/90 border border-slate-800/90 rounded-2xl p-3 sm:p-4 shadow-md shrink-0 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        
        {/* SINISTRA: MINIATURA COPERTINA + INFO CAROSELLO */}
        <div className="flex items-center gap-3">
          <div
            onClick={onOpenFullscreenStudio}
            className="w-11 h-14 rounded-xl overflow-hidden shadow-md border border-slate-700 bg-slate-900 relative group cursor-pointer shrink-0 flex items-center justify-center"
            title="Clicca per aprire l'editor carosello fullscreen"
          >
            <canvas
              ref={miniCanvasRef}
              className="w-full h-full object-contain block select-none pointer-events-none"
            />
            <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-amber-400">
              <Maximize2 className="w-3.5 h-3.5" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>Carosello Instagram</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono">
                {slides.length} Slide • 4:5
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-xs sm:max-w-md">
              Template: <strong className="text-slate-200 uppercase">{carousel.settings.templateId.replace('_', ' ')}</strong>
            </p>
          </div>
        </div>

        {/* DESTRA: STATO + PULSANTI APRI STUDIO / RIGENERA / EXPORT */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={carousel.status}
            onChange={(e) => onChange({ ...carousel, status: e.target.value as CarouselStatus })}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border focus:outline-none cursor-pointer ${currentStatus.color}`}
          >
            <option value="draft">Bozza</option>
            <option value="needs_review">Da Rivedere</option>
            <option value="ready">Pronto</option>
            <option value="exported">Esportato</option>
          </select>

          <button
            type="button"
            onClick={onOpenFullscreenStudio}
            className="py-1.5 px-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Apri Editor Carosello</span>
          </button>

          <button
            type="button"
            onClick={handleRegenerate}
            title="Rigenera struttura carosello con AI"
            className="py-1.5 px-2.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">Rigenera</span>
          </button>

          <button
            type="button"
            onClick={handleExportZip}
            disabled={isExportingZip}
            title="Scarica archivio ZIP"
            className="py-1.5 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
          >
            <FileArchive className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">{isExportingZip ? 'Esporto...' : 'ZIP'}</span>
          </button>
        </div>
      </div>

      {exportProgress && (
        <div className="p-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-mono text-center animate-pulse">
          <Download className="w-3 h-3 inline mr-1" />
          {exportProgress}
        </div>
      )}
    </div>
  );
};
