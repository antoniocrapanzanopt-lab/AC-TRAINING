import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  InstagramCarousel,
  CarouselSlide,
  SlideType,
  CarouselTemplateId,
} from '../../../types/carousel';
import {
  generateCarouselFromContent,
  createEmptyCoverSlide,
  generateCarouselProposalFromIdea,
} from '../../../services/carouselGeneratorService';
import {
  exportFullCarouselZip,
} from '../../../services/carouselExportService';
import { renderSlideToCanvas } from '../../../services/carouselCanvasRenderer';
import {
  validateSlideQuality,
  validateEntireCarousel,
} from '../../../services/carouselQualityService';
import { useToast } from '../../../context/ToastContext';
import {
  Maximize2,
  Sparkles,
  Download,
  FileArchive,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Plus,
  X,
} from 'lucide-react';

interface CarouselStructuredEditorProps {
  carousel: InstagramCarousel;
  onChange: (updatedCarousel: InstagramCarousel) => void;
  onOpenFullscreenStudio: (slideIndex?: number, targetField?: string) => void;
  contentTitle?: string;
  onFocusTitle?: () => void;
  showDetails: boolean;
  onToggleDetails: () => void;
}

const TYPE_CONFIG: Record<SlideType, { label: string; icon: string; badgeClass: string }> = {
  cover: { label: 'Copertina', icon: '🌟', badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  problem: { label: 'Problema', icon: '❌', badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
  principle: { label: 'Principio', icon: '🧠', badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  practical_guide: { label: 'Guida Pratica', icon: '🏋️', badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
  proof_example: { label: 'Caso Studio', icon: '📈', badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  recap: { label: 'Recap', icon: '📑', badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
  cta: { label: 'CTA Finale', icon: '🚀', badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
};

const TEMPLATE_OPTIONS: { id: CarouselTemplateId; label: string; desc: string }[] = [
  { id: 'editorial_dark', label: 'Editorial Dark', desc: 'Sfondo nero ossidiana, accenti caldi ambra e tipografia bold' },
  { id: 'hypertrophy_science', label: 'Hypertrophy Science', desc: 'Badge metodologici, dati scientifici ed evidenziazioni' },
  { id: 'bold_impact', label: 'Bold Impact', desc: 'Contrasto massimo per hook ad altissimo impatto visivo' },
  { id: 'coach_framework', label: 'Coach Framework', desc: 'Layout strutturato per guide passo-passo e analisi tecniche' },
];

export const CarouselStructuredEditor: React.FC<CarouselStructuredEditorProps> = ({
  carousel,
  onChange,
  onOpenFullscreenStudio,
  contentTitle,
  showDetails,
  onToggleDetails,
}) => {
  const { showSuccess, showError } = useToast();
  const coverSectionCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [exportProgress, setExportProgress] = useState('');

  // Modale per generazione proposta AI su Carosello vuoto
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiSlideCount, setAiSlideCount] = useState<3 | 5 | 7 | 10>(7);
  const [aiIdeaInput, setAiIdeaInput] = useState('');
  const [aiProposalSlides, setAiProposalSlides] = useState<CarouselSlide[] | null>(null);

  // Stato espansione elenco completo slide (modalità compatta default)
  const [isFullSlideListOpen, setIsFullSlideListOpen] = useState(false);

  // Creazione da zero (Slide 01 vuota, tipo cover, stato bozza, zero demo text)
  const handleStartFromScratch = () => {
    const emptyCover = createEmptyCoverSlide(contentTitle || '');
    onChange({
      ...carousel,
      slides: [emptyCover],
      status: 'draft',
    });
    showSuccess('Slide 01 di copertina creata! Puoi iniziare a scrivere.');
  };

  // Genera proposta AI da idea
  const handleGenerateProposal = () => {
    const promptText = aiIdeaInput.trim() || contentTitle?.trim() || 'Guida Pratica Biomeccanica';
    const proposal = generateCarouselProposalFromIdea(promptText, aiSlideCount);
    setAiProposalSlides(proposal);
  };

  // Applica proposta AI solo dopo conferma
  const handleApplyAiProposal = () => {
    if (!aiProposalSlides || aiProposalSlides.length === 0) return;
    onChange({
      ...carousel,
      slides: aiProposalSlides,
      status: 'draft',
    });
    setIsAiModalOpen(false);
    setAiProposalSlides(null);
    showSuccess(`Struttura a ${aiProposalSlides.length} slide generata e applicata!`);
  };

  const slides = carousel.slides || [];
  const coverSlide = slides[0];

  // Calcolo report qualità per l'intero carosello (UNICA FONTE DI VERITÀ)
  const carouselQuality = useMemo(() => {
    return validateEntireCarousel(carousel);
  }, [carousel]);

  // Report di qualità per ogni slide (UNICA FONTE DI VERITÀ)
  const slideQualityReports = useMemo(() => {
    return slides.map((s, idx) =>
      validateSlideQuality(s, idx, slides.length, slides, carousel.caption_export)
    );
  }, [slides, carousel.caption_export]);

  const coverQualityReport = slideQualityReports[0];

  // ─── 5. STATO CALCOLATO DEL CONTENUTO (SEZIONE 5) ───
  const computedStatus = useMemo(() => {
    if (slides.length === 0) {
      return {
        label: 'Non iniziato',
        color: 'bg-slate-800 text-slate-400 border-slate-700',
      };
    }
    if (!contentTitle?.trim()) {
      return {
        label: 'Da completare · Titolo mancante',
        color: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      };
    }
    if (carouselQuality.blockedCount > 0) {
      return {
        label: `Bozza · ${carouselQuality.blockedCount} blocchi`,
        color: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      };
    }
    if (carouselQuality.draftCount > 0) {
      return {
        label: 'Bozza',
        color: 'bg-slate-800 text-slate-300 border-slate-700',
      };
    }
    if (carouselQuality.warningCount > 0) {
      return {
        label: 'Da rivedere',
        color: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      };
    }
    return {
      label: 'Pronto per Pubblicazione',
      color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    };
  }, [slides.length, contentTitle, carouselQuality.blockedCount, carouselQuality.draftCount, carouselQuality.warningCount]);

  // ─── 4. RIEPILOGO COMPATTO DINAMICO (SEZIONE 4) ───
  // Mostra sempre:
  // - Slide 01 / Cover;
  // - Tutte le slide con warning o blocchi;
  // - Ultima slide / CTA finale;
  // - Pulsante "Mostra tutte le slide" per espandere.
  const displayedSlideIndices = useMemo(() => {
    if (slides.length === 0) return [];
    if (isFullSlideListOpen) {
      return slides.map((_, i) => i);
    }
    const set = new Set<number>();
    set.add(0); // Slide 01 Cover
    slides.forEach((_, idx) => {
      const rep = slideQualityReports[idx];
      if (
        rep &&
        (rep.status === 'blocked' ||
          rep.status === 'warning' ||
          rep.hasCriticalIssue ||
          rep.issues.some((i) => i.severity === 'critical' || i.severity === 'warning') ||
          rep.editorialStatus === 'hook_improvable')
      ) {
        set.add(idx);
      }
    });
    set.add(slides.length - 1); // Ultima slide CTA
    return Array.from(set).sort((a, b) => a - b);
  }, [slides, isFullSlideListOpen, slideQualityReports]);

  // Stato testuale della Cover (Slide 01)
  const coverStatusText = useMemo(() => {
    if (!coverSlide) return 'Cover non creata';
    if (coverQualityReport?.status === 'blocked') return 'Cover · Bloccata · Testo da ridurre';
    if (coverQualityReport?.editorialStatus === 'hook_improvable') return 'Cover · Pronta · Hook migliorabile';
    if (coverQualityReport?.status === 'ready') return 'Cover · Pronta · Ottimo Hook';
    return 'Cover · Bozza';
  }, [coverSlide, coverQualityReport]);

  // Renderizza la miniatura della cover (Slide 01)
  useEffect(() => {
    if (coverSlide && carousel.settings && coverSectionCanvasRef.current) {
      renderSlideToCanvas(coverSectionCanvasRef.current, coverSlide, carousel.settings, slides.length);
    }
  }, [coverSlide, carousel.settings, slides.length]);

  // Esporta ZIP completo
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

  // Rigenera con AI (con conferma)
  const handleRegenerate = () => {
    if (window.confirm('Rigenerare la struttura del carosello con l\'AI? Le slide attuali verranno reimpostate.')) {
      const fresh = generateCarouselFromContent({
        title: contentTitle,
        caption: carousel.caption_export,
      });
      onChange(fresh);
      showSuccess('Nuova struttura carosello generata con AI!');
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-4">
      {/* ─── STATO VUOTO: NESSUNA SLIDE CREATA (START FROM SCRATCH O PROPOSTA AI) ─── */}
      {slides.length === 0 ? (
        <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col items-center text-center space-y-4 shadow-xl animate-fadeIn">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-2xl shadow-lg shadow-amber-500/10">
            📑
          </div>

          <div className="space-y-1 max-w-md">
            <h3 className="text-base sm:lg font-black text-white">
              Nuovo Carosello
            </h3>
            <p className="text-[11px] text-amber-400 font-mono">
              Instagram 4:5 · 1080×1350
            </p>
            <p className="text-xs text-slate-400 font-medium pt-1">
              Nessuna slide creata.
            </p>
          </div>

          <div className="space-y-2.5 w-full max-w-sm pt-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Come vuoi iniziare?
            </span>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setAiIdeaInput(contentTitle || '');
                  setAiSlideCount(7);
                  setAiProposalSlides(null);
                  setIsAiModalOpen(true);
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Genera struttura con AI</span>
              </button>

              <button
                type="button"
                onClick={handleStartFromScratch}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Inizia da zero</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* ─── 2. BLOCCO CAROSELLO (MINIATURA COVER + STATO + CONTATORI UNIFICATI) ─── */}
          <div className="bg-slate-950/95 border border-slate-800/90 rounded-2xl p-4 shadow-md space-y-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="text-base">📑</span>
                <div>
                  <span className="text-xs font-black text-white uppercase tracking-wider block">
                    Carosello Instagram
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono block">
                    1080×1350 · Formato 4:5
                  </span>
                </div>
              </div>

              {/* BADGE STATO CONTENUTO DINAMICO (SEZIONE 5) */}
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${computedStatus.color}`}>
                  {computedStatus.label}
                </span>
              </div>
            </div>

            {/* COVER & INFO SINTETICA SLIDE (CONTATORI UNIFICATI) */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 w-full sm:w-auto">
                {/* MINIATURA COPERTINA (SLIDE 01) */}
                <div
                  onClick={() => onOpenFullscreenStudio(0)}
                  className="w-14 h-18 rounded-xl overflow-hidden shadow-md border border-slate-700 bg-slate-900 relative group cursor-pointer shrink-0 flex items-center justify-center"
                  title="Clicca per aprire la copertina (Slide 01) nello Studio"
                >
                  <canvas
                    ref={coverSectionCanvasRef}
                    className="w-full h-full object-contain block select-none pointer-events-none"
                  />
                  <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-amber-400">
                    <Maximize2 className="w-4 h-4" />
                  </div>
                </div>

                <div className="min-w-0 space-y-1">
                  {/* CONTATORI RIGOROSI (SEZIONE 6) */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black text-white">
                      {slides.length} slide
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className={`text-[11px] font-bold ${
                      carouselQuality.warningCount > 0 ? 'text-amber-400' : 'text-slate-400'
                    }`}>
                      {carouselQuality.warningCount} da rivedere
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className={`text-[11px] font-bold ${
                      carouselQuality.blockedCount > 0 ? 'text-rose-400' : 'text-slate-400'
                    }`}>
                      {carouselQuality.blockedCount} bloccate
                    </span>
                  </div>

                  {/* STATO COVER + DEEP-LINK A SLIDE 01 */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] text-slate-300 font-medium">
                      {coverStatusText}
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenFullscreenStudio(0)}
                      className="text-[11px] text-amber-400 hover:text-amber-300 font-bold hover:underline cursor-pointer"
                    >
                      [Modifica nello Studio]
                    </button>
                  </div>
                </div>
              </div>

              {/* AZIONE PRIMARIA: APRI STUDIO CAROSELLO */}
              <div className="w-full sm:w-auto flex justify-end">
                <button
                  type="button"
                  onClick={() => onOpenFullscreenStudio(0)}
                  className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition cursor-pointer"
                >
                  <Maximize2 className="w-4 h-4" />
                  <span>Apri Studio Carosello</span>
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

          {/* ─── 3. RIEPILOGO COMPATTO SLIDE (SEZIONE 4: COVER + AVVISI + CTA) ─── */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 space-y-3 shadow-md">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-200 uppercase tracking-wider">
                  {isFullSlideListOpen ? `Tutte le Slide (${slides.length})` : 'Riepilogo Slide'}
                </span>
                {!isFullSlideListOpen && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                    Cover + Avvisi + CTA
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                Clicca per aprire nello Studio
              </span>
            </div>

            {/* LISTA SCHEDE SLIDE: NUMERO · TIPO · TITOLO + STATO E WARNING RIGOROSI */}
            <div className="space-y-2">
              {displayedSlideIndices.map((idx) => {
                const slide = slides[idx];
                if (!slide) return null;
                const report = slideQualityReports[idx];
                const typeConf = TYPE_CONFIG[slide.type] || TYPE_CONFIG.problem;
                const isFirst = idx === 0;
                const isLast = idx === slides.length - 1;
                const slideNum = String(idx + 1).padStart(2, '0');

                const isBlocked = report?.status === 'blocked' || report?.hasCriticalIssue;
                const isWarning =
                  report?.status === 'warning' ||
                  (report?.issues && report.issues.some((i) => i.severity === 'warning')) ||
                  report?.editorialStatus === 'hook_improvable';

                const mainIssue =
                  report?.issues.find((i) => i.severity === 'critical') ||
                  report?.issues.find((i) => i.severity === 'warning');

                const targetField =
                  mainIssue?.id.includes('headline') || mainIssue?.id.includes('hook') || mainIssue?.id.includes('title')
                    ? 'headline'
                    : mainIssue?.id.includes('overflow') || mainIssue?.id.includes('body')
                    ? 'body'
                    : undefined;

                return (
                  <div
                    key={slide.id || idx}
                    className="p-3 rounded-xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800/90 hover:border-amber-500/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 group cursor-pointer shadow-sm"
                    onClick={() => onOpenFullscreenStudio(idx, targetField)}
                  >
                    {/* SINISTRA: NUMERO + TIPO + TITOLO */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-amber-400 shrink-0">
                          {slideNum}
                        </span>
                        <span className="text-slate-600 font-mono">·</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${typeConf.badgeClass}`}>
                          {typeConf.icon} {isFirst ? 'Copertina' : isLast ? 'CTA Finale' : typeConf.label}
                        </span>
                        <span className="text-slate-600 font-mono">·</span>
                        <span className="text-xs font-bold text-white group-hover:text-amber-300 transition truncate">
                          {slide.headline || (isFirst ? 'Titolo Copertina' : `Slide ${slideNum}`)}
                        </span>
                      </div>

                      {/* RIGA SOTTO: STATO + DESCRIZIONE DEL PROBLEMA ESATTAMENTE ALLINEATA */}
                      <div className="flex items-center gap-2 flex-wrap text-[11px] pt-0.5">
                        {isBlocked ? (
                          <>
                            <span className="px-2 py-0.5 rounded-full font-black text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                              <XCircle className="w-3 h-3" />
                              <span>Bloccata</span>
                            </span>
                            <span className="text-rose-300/90 font-medium truncate">
                              {mainIssue?.title || mainIssue?.message || 'Errori critici presenti'}
                            </span>
                          </>
                        ) : isWarning ? (
                          <>
                            <span className="px-2 py-0.5 rounded-full font-black text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Da rivedere</span>
                            </span>
                            <span className="text-amber-300/90 font-medium truncate">
                              {mainIssue?.title ||
                                (report?.editorialStatus === 'hook_improvable'
                                  ? 'Hook di copertina migliorabile'
                                  : 'Elementi da revisionare')}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="px-2 py-0.5 rounded-full font-black text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Pronta</span>
                            </span>
                            <span className="text-slate-400 font-medium">
                              {isFirst
                                ? 'Ottimo Hook di copertina'
                                : isLast
                                ? 'CTA configurata'
                                : `${report?.wordCount || 0} parole · Layout ottimale`}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* DESTRA: PULSANTE [Apri nello Studio] */}
                    <div className="shrink-0 flex items-center self-end sm:self-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenFullscreenStudio(idx, targetField);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 group-hover:bg-amber-500/20 text-slate-300 group-hover:text-amber-300 border border-slate-700 group-hover:border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <span>Apri nello Studio</span>
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* PULSANTE MOSTRA TUTTE LE SLIDE / MOSTRA RIEPILOGO COMPATTO */}
            {slides.length > 2 && (
              <div className="pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsFullSlideListOpen((prev) => !prev)}
                  className="w-full py-2 px-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
                >
                  {isFullSlideListOpen ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
                      <span>Mostra riepilogo compatto (Cover, avvisi e CTA)</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
                      <span>Mostra tutte le slide ({slides.length})</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* ─── 4. PULSANTE TOGGLE OPZIONI GRAFICHE & TEMPLATE ─── */}
          <div className="flex items-center justify-center pt-1">
            <button
              type="button"
              onClick={onToggleDetails}
              className="px-4 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-2 transition cursor-pointer shadow-sm"
            >
              {showDetails ? (
                <>
                  <ChevronUp className="w-4 h-4 text-amber-400" />
                  <span>Nascondi opzioni grafiche e template</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 text-amber-400" />
                  <span>Mostra opzioni template e azioni carosello</span>
                </>
              )}
            </button>
          </div>

          {/* ─── 5. DETTAGLI TEMPLATE COLLASSABILI ─── */}
          {showDetails && (
            <div className="space-y-3.5 pt-1 animate-fadeIn">
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                  <span className="text-xs font-black text-slate-300 uppercase tracking-wider">
                    Dettagli Grafici & Template
                  </span>

                  {/* AZIONI SECONDARIE */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRegenerate}
                      title="Rigenera struttura carosello con AI"
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>Rigenera con AI</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleExportZip}
                      disabled={isExportingZip}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                    >
                      <FileArchive className="w-3.5 h-3.5 text-amber-400" />
                      <span>Scarica ZIP</span>
                    </button>
                  </div>
                </div>

                {/* SELETTORE TEMPLATE */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {TEMPLATE_OPTIONS.map((tmpl) => {
                    const isActive = carousel.settings?.templateId === tmpl.id;
                    return (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => onChange({
                          ...carousel,
                          settings: {
                            ...carousel.settings,
                            templateId: tmpl.id,
                          },
                        })}
                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                          isActive
                            ? 'bg-amber-500/10 border-amber-500/50 text-white'
                            : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black">{tmpl.label}</span>
                          {isActive && <div className="w-2 h-2 rounded-full bg-amber-400" />}
                        </div>
                        <span className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                          {tmpl.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── MODALE PROPOSTA AI PER CAROSELLO (CONFERMA OBBLIGATORIA) ─── */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl animate-scaleIn max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-black text-white">
                  Genera Struttura Carosello con AI
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAiModalOpen(false);
                  setAiProposalSlides(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Titolo o Idea del Carosello</label>
                <input
                  type="text"
                  value={aiIdeaInput}
                  onChange={(e) => setAiIdeaInput(e.target.value)}
                  placeholder="es. Come impostare lo stacco rumeno per glutei e femorali"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-medium shadow-inner"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Numero di Slide</label>
                <div className="grid grid-cols-4 gap-2">
                  {([3, 5, 7, 10] as const).map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => {
                        setAiSlideCount(count);
                        setAiProposalSlides(null);
                      }}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        aiSlideCount === count
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm shadow-amber-500/10'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      {count} Slide
                    </button>
                  ))}
                </div>
              </div>

              {!aiProposalSlides && (
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleGenerateProposal}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Crea Proposta AI</span>
                  </button>
                </div>
              )}

              {/* ANTEPRIMA PROPOSTA AI PRIMA DI APPLICARE */}
              {aiProposalSlides && (
                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                      Anteprima Proposta ({aiProposalSlides.length} slide):
                    </span>
                    <button
                      type="button"
                      onClick={handleGenerateProposal}
                      className="text-[10px] text-slate-400 hover:text-amber-300 underline cursor-pointer"
                    >
                      Rigenera variante
                    </button>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                    {aiProposalSlides.map((slide, idx) => (
                      <div
                        key={slide.id || idx}
                        className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2.5 text-left"
                      >
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 font-bold shrink-0">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-white block truncate">
                            {slide.headline || 'Slide'}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate">
                            {slide.subheadline || slide.bodyText || 'Layout: ' + slide.layout}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setAiProposalSlides(null)}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
                    >
                      Annulla
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyAiProposal}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-md shadow-amber-500/25 transition cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Conferma e Applica</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
