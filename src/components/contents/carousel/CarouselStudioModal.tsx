import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  InstagramCarousel,
  CarouselSlide,
  CarouselTemplateId,
  SlideType,
} from '../../../types/carousel';
import { InstagramContent } from '../../../types/inboxAndContent';
import {
  generateCarouselFromContent,
  generateSlideId,
  regenerateSingleSlide,
} from '../../../services/carouselGeneratorService';
import { auditCarouselQuality } from '../../../services/carouselQualityService';
import {
  exportFullCarouselZip,
  exportCarouselAsPdfPreview,
} from '../../../services/carouselExportService';
import {
  optimizeSlideWithGemini,
  optimizeEntireCarouselWithGemini,
} from '../../../services/geminiCarouselOptimizer';
import { CarouselSlideEditorCard } from './CarouselSlideEditorCard';
import { CarouselCanvasPreview } from './CarouselCanvasPreview';
import { BrandKitModal } from './BrandKitModal';
import { useToast } from '../../../context/ToastContext';
import {
  ArrowLeft,
  Save,
  Download,
  FileText,
  Sparkles,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Palette,
  Eye,
  Edit3,
  Loader2,
} from 'lucide-react';

interface CarouselStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: Partial<InstagramContent>;
  onSaveCarousel: (carousel: InstagramCarousel) => void;
}

type SaveStatus = 'saved' | 'saving' | 'error';

const TEMPLATE_OPTIONS: { id: CarouselTemplateId; label: string; icon: string }[] = [
  { id: 'editorial_dark', label: 'Editorial Dark', icon: '🌑' },
  { id: 'hypertrophy_science', label: 'Hypertrophy Science', icon: '🧬' },
  { id: 'bold_impact', label: 'Bold Impact', icon: '⚡' },
  { id: 'coach_framework', label: 'Coach Framework', icon: '📐' },
  { id: 'error_correction', label: 'Error / Correction', icon: '⚖️' },
  { id: 'personal_story', label: 'Personal Story', icon: '📖' },
  { id: 'exercise_breakdown', label: 'Exercise Breakdown', icon: '🏋️' },
];

const TYPE_ICONS: Record<SlideType, string> = {
  cover: '🌟',
  problem: '❌',
  principle: '🧠',
  practical_guide: '🏋️',
  proof_example: '📈',
  recap: '📑',
  cta: '🚀',
};

export const CarouselStudioModal: React.FC<CarouselStudioModalProps> = ({
  isOpen,
  onClose,
  content,
  onSaveCarousel,
}) => {
  const { showSuccess, showError } = useToast();

  // Inizializza il carosello dal contenuto se non già presente
  const [carousel, setCarousel] = useState<InstagramCarousel>(() => {
    if (content.carousel_data && content.carousel_data.slides.length > 0) {
      return content.carousel_data;
    }
    return generateCarouselFromContent(content);
  });

  const [selectedSlideIndex, setSelectedSlideIndex] = useState<number>(0);
  const [isExportingZip, setIsExportingZip] = useState<boolean>(false);
  const [isGeminiOptimizing, setIsGeminiOptimizing] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<string>('');
  const [isBrandKitOpen, setIsBrandKitOpen] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [lastSavedText, setLastSavedText] = useState<string>('ora');

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latestCarouselRef = useRef<InstagramCarousel>(carousel);
  latestCarouselRef.current = carousel;

  // Calcolo audit qualità AI in tempo reale
  const qualityAudit = useMemo(() => {
    return auditCarouselQuality(carousel);
  }, [carousel]);

  const slides = carousel.slides || [];
  const safeIndex = Math.min(Math.max(0, selectedSlideIndex), Math.max(0, slides.length - 1));
  const activeSlide = slides[safeIndex] || slides[0];

  // Esecuzione autosave con debounce tra 600 e 1000 ms (750ms)
  const triggerDebouncedAutosave = useCallback(
    (updatedCarousel: InstagramCarousel) => {
      setSaveStatus('saving');
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        try {
          onSaveCarousel(updatedCarousel);
          setSaveStatus('saved');
          const timeStr = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setLastSavedText(timeStr);
        } catch {
          setSaveStatus('error');
        }
      }, 750);
    },
    [onSaveCarousel]
  );

  // Flush immediato dell'autosave
  const flushAutosave = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    onSaveCarousel(latestCarouselRef.current);
    setSaveStatus('saved');
  }, [onSaveCarousel]);

  // Aggiornamento singola slide
  const handleUpdateSlide = (updatedSlide: CarouselSlide) => {
    const updatedSlides = slides.map((s) => (s.id === updatedSlide.id ? updatedSlide : s));
    const updatedCarousel: InstagramCarousel = {
      ...carousel,
      slides: updatedSlides,
      updated_at: new Date().toISOString(),
    };
    setCarousel(updatedCarousel);
    triggerDebouncedAutosave(updatedCarousel);
  };

  // Cambio template (mantiene invariati testi, immagini e CTA)
  const handleSelectTemplate = (templateId: CarouselTemplateId) => {
    const updatedCarousel: InstagramCarousel = {
      ...carousel,
      settings: { ...carousel.settings, templateId },
      updated_at: new Date().toISOString(),
    };
    setCarousel(updatedCarousel);
    triggerDebouncedAutosave(updatedCarousel);
  };

  // Spostamento slide
  const handleMoveSlide = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= slides.length) return;

    const newSlides = [...slides];
    const [moved] = newSlides.splice(index, 1);
    newSlides.splice(targetIndex, 0, moved);

    const reordered = newSlides.map((s, idx) => ({ ...s, order: idx + 1 }));
    const updatedCarousel = { ...carousel, slides: reordered };
    setCarousel(updatedCarousel);
    triggerDebouncedAutosave(updatedCarousel);
    setSelectedSlideIndex(targetIndex);
  };

  // Duplicazione slide
  const handleDuplicateSlide = (index: number) => {
    if (slides.length >= 10) {
      showError('Instagram supporta un massimo di 10 slide per carosello.');
      return;
    }

    const target = slides[index];
    const duplicated: CarouselSlide = {
      ...target,
      id: generateSlideId(),
      headline: `${target.headline} (Copia)`,
      order: index + 2,
    };

    const newSlides = [...slides];
    newSlides.splice(index + 1, 0, duplicated);
    const reordered = newSlides.map((s, idx) => ({ ...s, order: idx + 1 }));
    const updatedCarousel = { ...carousel, slides: reordered };
    setCarousel(updatedCarousel);
    triggerDebouncedAutosave(updatedCarousel);
    setSelectedSlideIndex(index + 1);
  };

  // Eliminazione slide
  const handleDeleteSlide = (index: number) => {
    if (slides.length <= 1) {
      showError('Il carosello deve avere almeno 1 slide.');
      return;
    }

    const newSlides = slides.filter((_, idx) => idx !== index);
    const reordered = newSlides.map((s, idx) => ({ ...s, order: idx + 1 }));
    const updatedCarousel = { ...carousel, slides: reordered };
    setCarousel(updatedCarousel);
    triggerDebouncedAutosave(updatedCarousel);
    setSelectedSlideIndex(Math.max(0, index - 1));
  };

  // Aggiunta nuova slide
  const handleAddNewSlide = () => {
    if (slides.length >= 10) {
      showError('Limite massimo raggiunto: Instagram supporta fino a 10 slide.');
      return;
    }

    const newSlide: CarouselSlide = {
      id: generateSlideId(),
      order: slides.length + 1,
      type: 'practical_guide',
      layout: 'numbered_list',
      headline: `Nuova Slide #${slides.length + 1}`,
      bodyText: 'Inserisci qui la spiegazione o la regola pratica per la slide.',
      takeawayTag: 'STEP TECNICO',
      isAiSuggested: false,
    };

    const updatedCarousel = {
      ...carousel,
      slides: [...slides, newSlide],
    };
    setCarousel(updatedCarousel);
    triggerDebouncedAutosave(updatedCarousel);
    setSelectedSlideIndex(slides.length);
  };

  // Rigenerazione singola slide con AI
  const handleRegenerateSlide = (index: number) => {
    const target = slides[index];
    const regenerated = regenerateSingleSlide(target, content.title || 'questo esercizio', slides.length);
    handleUpdateSlide(regenerated);
  };

  // Rigenerazione completa carosello
  const handleRegenerateAll = () => {
    const fresh = generateCarouselFromContent(content);
    setCarousel(fresh);
    triggerDebouncedAutosave(fresh);
    setSelectedSlideIndex(0);
    showSuccess('Struttura carosello rigenerata con AI!');
  };

  // Ottimizzazione avanzata singola slide con Google Gemini 3.7 Flash
  const handleGeminiOptimizeSlide = async (index: number) => {
    setIsGeminiOptimizing(true);
    try {
      const target = slides[index];
      const optimized = await optimizeSlideWithGemini(target, content, index, slides.length);
      handleUpdateSlide(optimized);
      showSuccess('✨ Slide Perfezionata con Gemini 3.7 Flash!', 'Layout, caratteri e posizionamento ottimizzati.');
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Errore durante l\'ottimizzazione';
      showError('Errore Gemini 3.7 Flash', errMsg);
    } finally {
      setIsGeminiOptimizing(false);
    }
  };

  // Ottimizzazione avanzata intero carosello con Google Gemini 3.7 Flash
  const handleGeminiOptimizeAll = async () => {
    setIsGeminiOptimizing(true);
    try {
      const optimized = await optimizeEntireCarouselWithGemini(carousel, content);
      setCarousel(optimized);
      triggerDebouncedAutosave(optimized);
      showSuccess('🚀 Carosello Perfezionato con Gemini 3.7 Flash!', 'Tutte le slide, layout e impaginazione sono stati ottimizzati.');
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Errore durante l\'ottimizzazione';
      showError('Errore Gemini 3.7 Flash', errMsg);
    } finally {
      setIsGeminiOptimizing(false);
    }
  };

  // Esportazione ZIP
  const handleExportZip = async () => {
    flushAutosave();
    setIsExportingZip(true);
    setExportProgress('Inizializzazione rendering slide 1080x1350...');
    try {
      await exportFullCarouselZip(carousel, (current, total) => {
        setExportProgress(`Generazione immagine ${current} di ${total}...`);
      });
      const updated = { ...carousel, status: 'exported' as const };
      setCarousel(updated);
      onSaveCarousel(updated);
      showSuccess('Carosello esportato con successo in ZIP!');
    } catch {
      showError('Errore durante l\'esportazione del carosello');
    } finally {
      setIsExportingZip(false);
      setExportProgress('');
    }
  };

  // Navigazione da tastiera tramite frecce (ArrowLeft, ArrowRight)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isInputField =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        (e.target as HTMLElement)?.isContentEditable;

      if (isInputField) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setSelectedSlideIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setSelectedSlideIndex((prev) => Math.min(slides.length - 1, prev + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, slides.length]);

  // Salvataggio e chiusura sicura
  const handleSaveAndClose = () => {
    flushAutosave();
    showSuccess('Modifiche carosello salvate!');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950 flex flex-col h-screen w-screen overflow-hidden animate-in fade-in duration-150 select-none"
      onClick={(e) => e.stopPropagation()}
    >
      {/* ─── 1. TOP HEADER STUDIO FULLSCREEN ─── */}
      <header className="h-16 px-4 sm:px-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0 z-20">
        
        {/* SINISTRA: TORNA AL CONTENUTO & STATO AUTOSAVE REALE */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSaveAndClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            title="Torna al contenuto (Salva automaticamente)"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Torna al Contenuto</span>
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 font-black flex items-center justify-center shadow-md">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white flex items-center gap-1.5">
                <span>Editor Carosello</span>
                <span className="text-[11px] font-mono font-bold text-amber-400">• 1080×1350</span>
              </h2>

              {/* STATO AUTOSAVE REALE */}
              <div className="text-[11px] flex items-center gap-1.5 mt-0.5">
                {saveStatus === 'saving' ? (
                  <span className="text-amber-400 font-medium flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Salvataggio in corso...</span>
                  </span>
                ) : saveStatus === 'saved' ? (
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Salvato {lastSavedText}</span>
                  </span>
                ) : (
                  <span className="text-rose-400 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Errore di salvataggio</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* CENTRO: SELETTORE DEI 5 TEMPLATE */}
        <div className="hidden lg:flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          {TEMPLATE_OPTIONS.map((tmpl) => (
            <button
              key={tmpl.id}
              type="button"
              onClick={() => handleSelectTemplate(tmpl.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                carousel.settings.templateId === tmpl.id
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>{tmpl.icon}</span>
              <span>{tmpl.label}</span>
            </button>
          ))}
        </div>

        {/* DESTRA: BRAND KIT, EXPORT ZIP & SALVA */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Switcher Tab Mobile */}
          <div className="flex xl:hidden bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setMobileTab('editor')}
              className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 ${
                mobileTab === 'editor' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editor</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('preview')}
              className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 ${
                mobileTab === 'preview' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Anteprima</span>
            </button>
          </div>

          {/* Brand Kit */}
          <button
            type="button"
            onClick={() => setIsBrandKitOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-amber-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Palette className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Brand Kit</span>
          </button>

          {/* Ottimizza Tutto con Gemini 3.7 Flash */}
          <button
            type="button"
            onClick={handleGeminiOptimizeAll}
            disabled={isGeminiOptimizing}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600/30 via-amber-500/20 to-purple-600/30 hover:from-purple-600/50 hover:to-amber-500/30 text-amber-200 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
            title="Ottimizza layout, impaginazione, font e posizionamento immagini di tutte le slide con Gemini 3.7 Flash"
          >
            <Sparkles className={`w-3.5 h-3.5 text-amber-300 ${isGeminiOptimizing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isGeminiOptimizing ? 'Ottimizzazione...' : '⚡ Gemini 3.7 Flash'}</span>
          </button>

          {/* Scarica ZIP */}
          <button
            type="button"
            onClick={handleExportZip}
            disabled={isExportingZip}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-md transition cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isExportingZip ? 'Esporto...' : 'Scarica ZIP'}</span>
          </button>

          {/* Salva */}
          <button
            type="button"
            onClick={handleSaveAndClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border border-slate-700"
          >
            <Save className="w-3.5 h-3.5 text-emerald-400" />
            <span>Salva</span>
          </button>
        </div>
      </header>

      {exportProgress && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-2 text-amber-300 text-xs font-mono text-center flex items-center justify-center gap-2 animate-pulse shrink-0">
          <Download className="w-3.5 h-3.5" />
          <span>{exportProgress}</span>
        </div>
      )}

      {/* ─── 2. MAIN WORKSPACE FULLSCREEN A 3 COLONNE (MINIATURE | EDITOR SLIDE | ANTEPRIMA 1080x1350) ─── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 overflow-hidden bg-slate-950">
        
        {/* ─── COLONNA 1 (SINISTRA - 2/12): LISTA MINIATURE VERTICALI DELLE SLIDE ─── */}
        <div className={`lg:col-span-2 xl:col-span-2 flex flex-col h-full min-h-0 bg-slate-900/60 border border-slate-800 rounded-3xl p-3.5 space-y-3 overflow-hidden ${
          mobileTab === 'preview' ? 'hidden xl:flex' : 'flex'
        }`}>
          
          {/* HEADER MINIATURE CON + NUOVA SLIDE E RIGENERA AI */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 shrink-0">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
              <span>Slide ({slides.length}/10)</span>
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleAddNewSlide}
                className="px-2 py-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Aggiungi
              </button>
              <button
                type="button"
                onClick={handleRegenerateAll}
                title="Rigenera struttura con AI"
                className="p-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* LISTA VERTICALE DELLE SCHEDE SLIDE */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-2 pr-1">
            {slides.map((s, idx) => {
              const isSelected = idx === safeIndex;
              const wordCount = (s.headline + ' ' + (s.subheadline || '') + ' ' + s.bodyText).trim().split(/\s+/).length;
              const hasOverflow = wordCount > 50;

              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedSlideIndex(idx)}
                  className={`p-2 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500/70 text-amber-200 shadow-md ring-1 ring-amber-500/30'
                      : 'bg-slate-950/70 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="text-sm shrink-0">{TYPE_ICONS[s.type] || '📄'}</span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold truncate text-white">
                        {s.headline || `Slide ${idx + 1}`}
                      </p>
                      <span className="text-[9px] text-slate-500 block truncate">
                        {s.layout?.replace('_', ' ') || s.type}
                      </span>
                    </div>
                  </div>

                  {hasOverflow && (
                    <span title="Testo denso per mobile">
                      <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-500 text-center font-mono">
            💡 ◄ / ► per scorrere
          </div>
        </div>

        {/* ─── COLONNA 2 (CENTRO - 5/12): EDITOR SINGOLA SLIDE ─── */}
        <div className={`lg:col-span-5 xl:col-span-5 flex flex-col h-full min-h-0 overflow-y-auto custom-scrollbar pr-1 ${
          mobileTab === 'preview' ? 'hidden xl:flex' : 'flex'
        }`}>
          {activeSlide ? (
            <CarouselSlideEditorCard
              slide={activeSlide}
              index={safeIndex}
              totalSlides={slides.length}
              isSelected={true}
              autoFocusTitle={true}
              onSelect={() => {}}
              onChange={handleUpdateSlide}
              onMoveUp={() => handleMoveSlide(safeIndex, 'up')}
              onMoveDown={() => handleMoveSlide(safeIndex, 'down')}
              onDuplicate={() => handleDuplicateSlide(safeIndex)}
              onDelete={() => handleDeleteSlide(safeIndex)}
              onRegenerate={() => handleRegenerateSlide(safeIndex)}
              onGeminiOptimize={() => handleGeminiOptimizeSlide(safeIndex)}
              isOptimizingWithGemini={isGeminiOptimizing}
            />
          ) : (
            <div className="p-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-3xl">
              Nessuna slide selezionata.
            </div>
          )}
        </div>

        {/* ─── COLONNA 3 (DESTRA - 5/12): ANTEPRIMA LIVE 1080x1350 INGRANDITA ─── */}
        <div className={`lg:col-span-5 xl:col-span-5 flex flex-col h-full min-h-0 bg-slate-900/40 border border-slate-800 rounded-3xl p-4 overflow-y-auto custom-scrollbar items-center justify-between ${
          mobileTab === 'editor' ? 'hidden xl:flex' : 'flex'
        }`}>
          
          {/* ANTEPRIMA CANVAS 4:5 */}
          <div className="w-full flex flex-col items-center">
            {activeSlide && (
              <CarouselCanvasPreview
                slide={activeSlide}
                settings={carousel.settings}
                totalSlides={slides.length}
                currentIndex={safeIndex}
                onSelectSlide={setSelectedSlideIndex}
                fullCarousel={carousel}
              />
            )}
          </div>

          {/* PULSANTI RAPIDI IN FONDO ALL'ANTEPRIMA */}
          <div className="w-full pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono">Qualità AI: {qualityAudit.score}/100</span>
            <button
              type="button"
              onClick={() => exportCarouselAsPdfPreview(carousel)}
              className="text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Anteprima PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODALE BRAND KIT */}
      {isBrandKitOpen && (
        <BrandKitModal
          isOpen={isBrandKitOpen}
          onClose={() => setIsBrandKitOpen(false)}
          brandKit={carousel.settings.brandKit}
          onSave={(updatedKit) => {
            const updatedCarousel = {
              ...carousel,
              settings: {
                ...carousel.settings,
                brandKit: updatedKit,
                authorHandle: updatedKit.authorHandle,
                brandWatermark: updatedKit.brandName,
                accentColor: updatedKit.accentColor,
                darkBgColor: updatedKit.primaryColor,
              },
            };
            setCarousel(updatedCarousel);
            triggerDebouncedAutosave(updatedCarousel);
          }}
        />
      )}
    </div>
  );
};
