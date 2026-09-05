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
  createEmptyCoverSlide,
  createEmptyCarousel,
} from '../../../services/carouselGeneratorService';
import {
  validateEntireCarousel,
} from '../../../services/carouselQualityService';
import {
  exportFullCarouselZip,
  exportCarouselAsPdfPreview,
} from '../../../services/carouselExportService';
import {
  optimizeSlideWithGemini,
  optimizeEntireCarouselWithGemini,
  CarouselAIOperationType,
  CAROUSEL_AI_OPERATIONS,
} from '../../../services/geminiCarouselOptimizer';
import { CarouselSlideEditorCard } from './CarouselSlideEditorCard';
import { CarouselCanvasPreview } from './CarouselCanvasPreview';
import { BrandKitModal } from './BrandKitModal';
import { CarouselAIDiffModal } from './CarouselAIDiffModal';
import { CarouselQualityChecklistModal } from './CarouselQualityChecklistModal';
import { CarouselExportProtectionModal } from './CarouselExportProtectionModal';
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
  ShieldCheck,
  Expand,
  Minimize2,
  Hash,
} from 'lucide-react';

interface CarouselStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: Partial<InstagramContent>;
  onSaveCarousel: (carousel: InstagramCarousel) => void;
  initialSlideIndex?: number;
  initialTargetField?: string;
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
  initialSlideIndex = 0,
  initialTargetField,
}) => {
  const { showSuccess, showError } = useToast();

  // Inizializza il carosello dal contenuto se non già presente, ripulendo tag indesiderati
  const [carousel, setCarousel] = useState<InstagramCarousel>(() => {
    let raw: InstagramCarousel;
    if (content.carousel_data && content.carousel_data.slides && content.carousel_data.slides.length > 0) {
      raw = content.carousel_data;
    } else if (content.carousel_data) {
      raw = content.carousel_data;
    } else {
      raw = createEmptyCarousel(content.id || '');
    }

    return {
      ...raw,
      slides: (raw.slides || []).map((s) => ({
        ...s,
        categoryTag: s.categoryTag && /tecnica\s*&\s*biomeccanica/i.test(s.categoryTag) ? undefined : s.categoryTag,
        takeawayTag: s.takeawayTag && (/tecnica\s*&\s*biomeccanica/i.test(s.takeawayTag) || /^step\s*\d+/i.test(s.takeawayTag.trim())) ? undefined : s.takeawayTag,
      })),
    };
  });

  const [selectedSlideIndex, setSelectedSlideIndex] = useState<number>(initialSlideIndex || 0);

  // Sincronizza selectedSlideIndex quando il modale si apre su una slide specifica
  useEffect(() => {
    if (isOpen && typeof initialSlideIndex === 'number') {
      setSelectedSlideIndex(Math.max(0, initialSlideIndex));
    }
  }, [isOpen, initialSlideIndex]);

  const [isExportingZip, setIsExportingZip] = useState<boolean>(false);
  const [isGeminiOptimizing, setIsGeminiOptimizing] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<string>('');
  const [isBrandKitOpen, setIsBrandKitOpen] = useState<boolean>(false);
  const [isQualityModalOpen, setIsQualityModalOpen] = useState<boolean>(false);
  const [isExportProtectionModalOpen, setIsExportProtectionModalOpen] = useState<boolean>(false);
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [lastSavedText, setLastSavedText] = useState<string>('ora');

  // Mappa delle versioni precedenti delle slide per il confronto Prima / Dopo
  const [previousSlideMap, setPreviousSlideMap] = useState<Record<string, CarouselSlide>>({});

  // Stato modale confronto Diff AI
  const [aiDiffState, setAiDiffState] = useState<{
    isOpen: boolean;
    originalSlide: CarouselSlide | null;
    proposedSlide: CarouselSlide | null;
    actionName: string;
  }>({
    isOpen: false,
    originalSlide: null,
    proposedSlide: null,
    actionName: '',
  });

  // Tracciamento delta del punteggio per visualizzare i miglioramenti (es. 82 → 88)
  const [scoreDelta, setScoreDelta] = useState<{ from: number; to: number } | null>(null);
  const prevScoreRef = useRef<number | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latestCarouselRef = useRef<InstagramCarousel>(carousel);
  latestCarouselRef.current = carousel;

  // Calcolo validazione qualitativa ed editoriale a 360°
  const validationReport = useMemo(() => {
    return validateEntireCarousel(carousel);
  }, [carousel]);

  // Tracciamento delta punteggio dopo ogni modifica
  useEffect(() => {
    if (prevScoreRef.current !== null && prevScoreRef.current !== validationReport.score) {
      const from = prevScoreRef.current;
      const to = validationReport.score;
      setScoreDelta({ from, to });
      const timer = setTimeout(() => {
        setScoreDelta(null);
      }, 6000);
      prevScoreRef.current = to;
      return () => clearTimeout(timer);
    }
    prevScoreRef.current = validationReport.score;
  }, [validationReport.score]);

  const slides = carousel.slides || [];
  const safeIndex = Math.min(Math.max(0, selectedSlideIndex), Math.max(0, slides.length - 1));
  const activeSlide = slides.length > 0 ? (slides[safeIndex] || slides[0]) : null;
  const activePreviousSlide = activeSlide ? previousSlideMap[activeSlide.id] : null;

  // Esecuzione autosave con debounce rigoroso a 800 ms
  const triggerDebouncedAutosave = useCallback(
    (updatedCarousel: InstagramCarousel) => {
      // Non salvare automaticamente se il carosello è vuoto / non iniziato
      if (!updatedCarousel.slides || updatedCarousel.slides.length === 0) return;
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
      }, 800);
    },
    [onSaveCarousel]
  );

  // Flush immediato dell'autosave
  const flushAutosave = useCallback(() => {
    if (!latestCarouselRef.current.slides || latestCarouselRef.current.slides.length === 0) return;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    onSaveCarousel(latestCarouselRef.current);
    setSaveStatus('saved');
  }, [onSaveCarousel]);

  // Protezione beforeunload se ci sono modifiche in salvataggio
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatus === 'saving') {
        e.preventDefault();
        e.returnValue = 'Ci sono modifiche in fase di salvataggio. Vuoi uscire comunque?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveStatus]);

  // Aggiornamento singola slide con conservazione dello storico per il Prima/Dopo
  const handleUpdateSlide = (updatedSlide: CarouselSlide) => {
    const oldSlide = slides.find((s) => s.id === updatedSlide.id);
    if (oldSlide) {
      setPreviousSlideMap((prev) => ({ ...prev, [updatedSlide.id]: oldSlide }));
    }

    const updatedSlides = slides.map((s) => (s.id === updatedSlide.id ? updatedSlide : s));
    const updatedCarousel: InstagramCarousel = {
      ...carousel,
      slides: updatedSlides,
      updated_at: new Date().toISOString(),
    };
    setCarousel(updatedCarousel);
    triggerDebouncedAutosave(updatedCarousel);
  };

  // Cambio template senza cancellare dati
  const handleSelectTemplate = (templateId: CarouselTemplateId) => {
    const updatedCarousel: InstagramCarousel = {
      ...carousel,
      settings: { ...carousel.settings, templateId },
      updated_at: new Date().toISOString(),
    };
    setCarousel(updatedCarousel);
    triggerDebouncedAutosave(updatedCarousel);
  };

  // Attiva / Disattiva i numerini carosello globali (settings.showSlideCounter)
  const handleToggleSlideCounter = () => {
    const nextVal = carousel.settings.showSlideCounter === false ? true : false;
    const updatedCarousel: InstagramCarousel = {
      ...carousel,
      settings: {
        ...carousel.settings,
        showSlideCounter: nextVal,
      },
      updated_at: new Date().toISOString(),
    };
    setCarousel(updatedCarousel);
    triggerDebouncedAutosave(updatedCarousel);
    if (nextVal) {
      showSuccess('Numeri slide riattivati sul carosello.');
    } else {
      showSuccess('Numeri slide rimossi dal carosello.');
    }
  };

  // Spostamento slide con rinumerazione atomica
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

  // Spostamento di una slide alla fine del carosello
  const handleMoveSlideToEnd = (index: number) => {
    if (index >= slides.length - 1) return;

    const newSlides = [...slides];
    const [moved] = newSlides.splice(index, 1);
    newSlides.push(moved);

    const reordered = newSlides.map((s, idx) => ({ ...s, order: idx + 1 }));
    const updatedCarousel = { ...carousel, slides: reordered };
    setCarousel(updatedCarousel);
    triggerDebouncedAutosave(updatedCarousel);
    setSelectedSlideIndex(reordered.length - 1);
    showSuccess('CTA spostata in ultima posizione!');
  };

  // Duplicazione slide con rinumerazione automatica
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

  // Eliminazione slide con rinumerazione atomica
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

  // Aggiunta nuova slide con rinumerazione atomica
  const handleAddNewSlide = () => {
    if (slides.length >= 10) {
      showError('Limite massimo raggiunto: Instagram supporta fino a 10 slide.');
      return;
    }

    if (slides.length === 0) {
      const firstSlide = createEmptyCoverSlide(content.title || '');
      const updatedCarousel = {
        ...carousel,
        slides: [firstSlide],
      };
      setCarousel(updatedCarousel);
      triggerDebouncedAutosave(updatedCarousel);
      setSelectedSlideIndex(0);
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

  // Rigenerazione singola slide con template locale
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

  // Trigger azione contestuale AI con Gemini 3.8 Flash e apertura diff obbligatorio
  const handleTriggerAIOperation = async (action: CarouselAIOperationType = 'improve_all') => {
    if (!activeSlide) return;
    setIsGeminiOptimizing(true);
    try {
      const actionOption = CAROUSEL_AI_OPERATIONS.find((o) => o.id === action);
      const actionLabel = actionOption?.label || 'Miglioramento Slide';
      const optimized = await optimizeSlideWithGemini(activeSlide, content, safeIndex, slides.length, action);

      // Mostra sempre il diff visivo prima di qualsiasi applicazione
      setAiDiffState({
        isOpen: true,
        originalSlide: activeSlide,
        proposedSlide: optimized,
        actionName: actionLabel,
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Errore durante l\'ottimizzazione';
      showError('Errore Gemini 3.8 Flash', errMsg);
    } finally {
      setIsGeminiOptimizing(false);
    }
  };

  // Applicazione esplicita delle modifiche proposte da Gemini
  const handleApplyAIDiff = (appliedSlide: CarouselSlide) => {
    handleUpdateSlide(appliedSlide);
    setAiDiffState({ isOpen: false, originalSlide: null, proposedSlide: null, actionName: '' });
    showSuccess('✨ Modifiche AI applicate!', `Slide ${safeIndex + 1} aggiornata.`);
  };

  // Ottimizzazione intero carosello con Gemini 3.8 Flash
  const handleGeminiOptimizeAll = async () => {
    setIsGeminiOptimizing(true);
    try {
      const optimized = await optimizeEntireCarouselWithGemini(carousel, content);
      setCarousel(optimized);
      triggerDebouncedAutosave(optimized);
      showSuccess('🚀 Carosello Perfezionato con Gemini 3.8 Flash!', 'Tutte le slide sono state ottimizzate.');
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Errore durante l\'ottimizzazione';
      showError('Errore Gemini 3.8 Flash', errMsg);
    } finally {
      setIsGeminiOptimizing(false);
    }
  };

  // Apertura modale di protezione ed esportazione ZIP
  const handleOpenExportModal = () => {
    if (slides.length === 0) {
      showError('Impossibile esportare', 'Nessuna slide ancora creata nel carosello.');
      return;
    }
    setIsExportProtectionModalOpen(true);
  };

  // Esecuzione definitiva esportazione ZIP (chiamata dalla modale di protezione)
  const handleExecuteExportZip = async () => {
    flushAutosave();
    setIsExportingZip(true);
    setExportProgress('Rendering ad alta risoluzione 1080×1350...');
    try {
      await exportFullCarouselZip(carousel, (current, total) => {
        setExportProgress(`Generazione immagine ${current} di ${total}...`);
      });
      const updated = { ...carousel, status: 'exported' as const };
      setCarousel(updated);
      onSaveCarousel(updated);
      setIsExportProtectionModalOpen(false);
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
                <span>Carousel Studio</span>
                <span className="text-[11px] font-mono font-bold text-amber-400">• 1080×1350</span>
              </h2>

              {/* STATO AUTOSAVE REALE */}
              <div className="text-[11px] flex items-center gap-1.5 mt-0.5">
                {saveStatus === 'saving' ? (
                  <span className="text-amber-400 font-medium flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Salvataggio...</span>
                  </span>
                ) : saveStatus === 'saved' ? (
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Salvato ora ({lastSavedText})</span>
                  </span>
                ) : (
                  <span className="text-rose-400 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Errore di salvataggio — Riprova</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* CENTRO: SELETTORE TEMPLATE COMPATTO & QUALITY SCORE PILL */}
        <div className="hidden md:flex items-center gap-3">
          {/* Dropdown Template Compatto */}
          <div className="relative">
            <select
              value={carousel.settings.templateId}
              onChange={(e) => handleSelectTemplate(e.target.value as CarouselTemplateId)}
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-amber-300 focus:outline-none focus:border-amber-500 cursor-pointer appearance-none pr-7 shadow-sm"
              title="Seleziona stile grafico carosello"
            >
              {TEMPLATE_OPTIONS.map((tmpl) => (
                <option key={tmpl.id} value={tmpl.id} className="bg-slate-900 text-white font-medium">
                  {tmpl.icon} {tmpl.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-bold">▼</span>
          </div>

          {/* Pill Quality Score Formato: 91/100 · 1 warning · 0 blocchi */}
          {slides.length === 0 ? (
            <div
              className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-400 text-xs font-mono font-bold flex items-center gap-2 shadow-sm"
              title="Carosello non ancora inizializzato"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
              <span>Non iniziato</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsQualityModalOpen(true)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-2 transition cursor-pointer shadow-sm ${
                validationReport.blockedCount > 0
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 hover:bg-rose-500/25'
                  : validationReport.warningCount > 0
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
              }`}
              title={`Checklist Qualità: ${validationReport.score}/100\n${validationReport.warningCount} warning · ${validationReport.blockedCount} blocchi\n\nMotivazione:\n${validationReport.qualityReason}`}
            >
              <ShieldCheck className={`w-3.5 h-3.5 ${
                validationReport.blockedCount > 0 ? 'text-rose-400' : validationReport.warningCount > 0 ? 'text-amber-400' : 'text-emerald-400'
              }`} />
              {scoreDelta && scoreDelta.from !== scoreDelta.to ? (
                <span className="flex items-center gap-1 font-mono">
                  <span className="text-slate-500 line-through text-[10px]">{scoreDelta.from}</span>
                  <span className="text-emerald-300 font-black animate-pulse">
                    {scoreDelta.from} → {scoreDelta.to} {scoreDelta.to > scoreDelta.from ? `(+${scoreDelta.to - scoreDelta.from})` : `(${scoreDelta.to - scoreDelta.from})`}
                  </span>
                </span>
              ) : (
                <span className="font-black text-white">{validationReport.score}/100</span>
              )}
              <span className="text-slate-500">·</span>
              <span className="text-amber-300">{validationReport.warningCount} warning</span>
              <span className="text-slate-500">·</span>
              <span className={validationReport.blockedCount > 0 ? 'text-rose-400 font-black' : 'text-slate-400'}>
                {validationReport.blockedCount} blocchi
              </span>
            </button>
          )}
        </div>

        {/* DESTRA: RAGGRUPPAMENTO TOOL (FOCUS, BRAND KIT, AI) + EXPORT & SALVA */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Switcher Tab Mobile */}
          <div className="flex xl:hidden bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setMobileTab('editor')}
              className={`px-2 py-1 rounded-lg font-bold flex items-center gap-1 ${
                mobileTab === 'editor' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400'
              }`}
            >
              <Edit3 className="w-3 h-3" />
              <span>Editor</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('preview')}
              className={`px-2 py-1 rounded-lg font-bold flex items-center gap-1 ${
                mobileTab === 'preview' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400'
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>Anteprima</span>
            </button>
          </div>

          {/* GRUPPO STRUMENTI: FOCUS, BRAND KIT & AI */}
          <div className="flex items-center bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs gap-1">
            {/* Modalità Focus Toggle */}
            <button
              type="button"
              onClick={() => setIsFocusMode((prev) => !prev)}
              className={`px-2.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer ${
                isFocusMode
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
              title={isFocusMode ? 'Mostra colonna miniature' : 'Nascondi colonna miniature per editing focalizzato'}
            >
              {isFocusMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Expand className="w-3.5 h-3.5" />}
              <span className="hidden lg:inline">{isFocusMode ? 'Esci Focus' : 'Focus'}</span>
            </button>

            {/* Brand Kit */}
            <button
              type="button"
              onClick={() => setIsBrandKitOpen(true)}
              className="px-2.5 py-1.5 rounded-xl text-purple-300 hover:text-white hover:bg-slate-900 font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="Personalizza Brand Kit (Colori, Tipografia, Watermark)"
            >
              <Palette className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden lg:inline">Brand Kit</span>
            </button>

            {/* Toggle Numeri Slide Rapido */}
            <button
              type="button"
              onClick={handleToggleSlideCounter}
              className={`px-2.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer ${
                carousel.settings.showSlideCounter !== false
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'
              }`}
              title={
                carousel.settings.showSlideCounter !== false
                  ? 'Rimuovi numerini dalle slide (es. 2/2)'
                  : 'Mostra numerini sulle slide (es. 2/2)'
              }
            >
              <Hash className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden lg:inline">{carousel.settings.showSlideCounter !== false ? 'Numeri On' : 'Numeri Off'}</span>
            </button>

            {/* Ottimizza Tutto con Gemini 3.8 Flash */}
            <button
              type="button"
              onClick={handleGeminiOptimizeAll}
              disabled={isGeminiOptimizing || slides.length === 0}
              className="px-2.5 py-1.5 rounded-xl text-amber-300 hover:text-white hover:bg-slate-900 font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              title="Ottimizza intero carosello con Gemini 3.8 Flash"
            >
              <Sparkles className={`w-3.5 h-3.5 text-amber-300 ${isGeminiOptimizing ? 'animate-spin' : ''}`} />
              <span className="hidden lg:inline">{isGeminiOptimizing ? 'Ottimizzazione...' : 'Gemini AI'}</span>
            </button>
          </div>

          {/* Scarica ZIP protetto da verifica preventiva */}
          <button
            type="button"
            onClick={handleOpenExportModal}
            disabled={isExportingZip || slides.length === 0}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition cursor-pointer disabled:opacity-50 ${
              slides.length === 0
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : validationReport.blockedCount > 0
                ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white hover:from-rose-500 hover:to-rose-600 ring-1 ring-rose-400/30'
                : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950'
            }`}
            title={slides.length === 0 ? 'Nessuna slide da esportare' : validationReport.blockedCount > 0 ? 'Esportazione bloccata: sono presenti errori critici' : 'Scarica pacchetto ZIP carosello'}
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isExportingZip ? 'Esporto...' : 'Scarica ZIP'}</span>
          </button>

          {/* Salva Sempre Raggiungibile */}
          <button
            type="button"
            onClick={handleSaveAndClose}
            className="px-4 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border border-emerald-500/40 shadow-sm"
            title="Salva e torna al contenuto"
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
        
        {/* ─── COLONNA 1 (SINISTRA): LISTA MINIATURE VERTICALI DELLE SLIDE ─── */}
        {!isFocusMode && (
          <div className={`lg:col-span-2 xl:col-span-2 flex flex-col h-full min-h-0 bg-slate-900/60 border border-slate-800 rounded-3xl p-3.5 space-y-3 overflow-hidden ${
            mobileTab === 'preview' ? 'hidden xl:flex' : 'flex'
          }`}>
            
            {/* Header Miniature con + Nuova Slide e Rigenera */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 shrink-0">
              <span className="text-xs font-bold text-slate-200 font-mono">
                {slides.length} / 10 slide
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

            {/* LISTA VERTICALE DELLE SCHEDE SLIDE: TIPO, STATO E WARNING SEPARATI */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-2 pr-1">
              {slides.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500 text-xs">
                  <span>Nessuna slide</span>
                </div>
              ) : (
                slides.map((s, idx) => {
                  const isSelected = idx === safeIndex;
                  const sr = validationReport.slideReports[idx] || {
                    status: 'ready',
                    wordCount: 0,
                    issues: [],
                  };
                  const isFirst = idx === 0;
                  const isLast = idx === slides.length - 1;

                  // Separazione semantica rigorosa:
                  // PRONTA = esportabile
                  // DA RIVEDERE = warning/miglioramenti consigliati
                  // BLOCCATA = errore critico che impedisce l'export
                  const isBlocked = sr.status === 'blocked';
                  const isWarning = sr.status === 'warning';
                  const isDraft = sr.status === 'draft';
                  const isHookImprovable = sr.editorialStatus === 'hook_improvable';

                  const statusBadgeStyle = isBlocked
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : isWarning
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : isDraft
                    ? 'bg-slate-800 text-slate-400 border-slate-700'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';

                  const statusLabel = isBlocked
                    ? 'BLOCCATA'
                    : isWarning
                    ? 'DA RIVEDERE'
                    : isDraft
                    ? 'BOZZA'
                    : 'PRONTA';

                  const typeLabel = isFirst
                    ? 'Copertina'
                    : isLast
                    ? 'CTA Finale'
                    : s.type === 'problem'
                    ? 'Problema'
                    : s.type === 'practical_guide'
                    ? 'Guida Pratica'
                    : s.type === 'principle'
                    ? 'Principio'
                    : s.type === 'recap'
                    ? 'Recap'
                    : s.type === 'proof_example'
                    ? 'Esempio'
                    : 'Slide';

                  const mainWarning =
                    sr.issues.find((i) => i.severity === 'critical') ||
                    sr.issues.find((i) => i.severity === 'warning');

                  return (
                    <div
                      key={s.id}
                      onClick={() => setSelectedSlideIndex(idx)}
                      className={`p-2.5 rounded-2xl border transition-all cursor-pointer space-y-1.5 relative ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-500/80 text-amber-200 shadow-lg ring-1 ring-amber-500/40'
                          : isFirst
                          ? 'bg-slate-950/90 border-amber-500/30 hover:border-amber-500/60'
                          : isLast
                          ? 'bg-slate-950/90 border-purple-500/30 hover:border-purple-500/60'
                          : 'bg-slate-950/80 border-slate-800/90 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {/* RIGA 1: NUMERO, TITOLO COMPLETO (SENZA TRONCAMENTI FORZATI) E TIPO */}
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="flex items-start gap-1.5 min-w-0 flex-1">
                          <span className="w-5 h-5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <p className="text-xs font-bold text-white leading-snug break-words line-clamp-2">
                            {s.headline || `Slide ${idx + 1}`}
                          </p>
                        </div>
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 shrink-0 flex items-center gap-1">
                          <span>{TYPE_ICONS[s.type] || '📄'}</span>
                          <span>{typeLabel}</span>
                        </span>
                      </div>

                      {/* RIGA 2: STATO SEPARATO, EVENTUALE HOOK MIGLIORABILE E PAROLE */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full border ${statusBadgeStyle}`}>
                          {statusLabel}
                        </span>

                        {isHookImprovable && (
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            Hook migliorabile
                          </span>
                        )}

                        <span className="text-[9px] font-mono text-slate-500 ml-auto">
                          {sr.wordCount} parole
                        </span>
                      </div>

                      {/* RIGA 3: WARNING SEPARATO E VISIBILE (SE PRESENTE) */}
                      {mainWarning && (
                        <div
                          className={`text-[10px] px-2 py-1 rounded-lg border leading-tight ${
                            mainWarning.severity === 'critical'
                              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                              : 'bg-amber-500/10 border-amber-500/25 text-amber-300'
                          }`}
                        >
                          <span className="line-clamp-2">⚠️ {mainWarning.title}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-500 text-center font-mono">
              💡 ◄ / ► per scorrere
            </div>
          </div>
        )}

        {/* ─── COLONNA 2 (CENTRO): EDITOR SINGOLA SLIDE ─── */}
        <div className={`${
          isFocusMode ? 'lg:col-span-6 xl:col-span-5' : 'lg:col-span-5 xl:col-span-5'
        } flex flex-col h-full min-h-0 overflow-y-auto custom-scrollbar pr-1 ${
          mobileTab === 'preview' ? 'hidden xl:flex' : 'flex'
        }`}>
          {activeSlide ? (
            <CarouselSlideEditorCard
              slide={activeSlide}
              index={safeIndex}
              totalSlides={slides.length}
              isSelected={true}
              autoFocusTitle={true}
              targetField={initialTargetField}
              allSlides={slides}
              captionText={carousel.caption_export}
              onSelect={() => {}}
              onChange={handleUpdateSlide}
              onMoveUp={() => handleMoveSlide(safeIndex, 'up')}
              onMoveDown={() => handleMoveSlide(safeIndex, 'down')}
              onDuplicate={() => handleDuplicateSlide(safeIndex)}
              onDelete={() => handleDeleteSlide(safeIndex)}
              onRegenerate={() => handleRegenerateSlide(safeIndex)}
              onGeminiOptimize={() => handleTriggerAIOperation('improve_all')}
              onTriggerAIOperation={handleTriggerAIOperation}
              onNavigatePrev={() => setSelectedSlideIndex((prev) => Math.max(0, prev - 1))}
              onNavigateNext={() => setSelectedSlideIndex((prev) => Math.min(slides.length - 1, prev + 1))}
              onMoveToEnd={() => handleMoveSlideToEnd(safeIndex)}
              isAdvancedOpen={isAdvancedOpen}
              onToggleAdvanced={() => setIsAdvancedOpen((prev) => !prev)}
              isOptimizingWithGemini={isGeminiOptimizing}
              contentTitle={content.title}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border border-dashed border-slate-800 rounded-3xl bg-slate-900/30">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-300 text-2xl mb-4">
                📱
              </div>
              <h3 className="text-base font-bold text-white mb-1">Nuovo Carosello</h3>
              <p className="text-xs text-slate-400 mb-2">Nessuna slide ancora creata.</p>
              <p className="text-[11px] font-mono text-slate-500 mb-6">Instagram 1080x1350 · 4:5</p>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={handleRegenerateAll}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-950/40 transition cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-purple-200" />
                  <span>Genera struttura con AI</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const firstSlide = createEmptyCoverSlide(content.title || '');
                    const updated = {
                      ...carousel,
                      slides: [firstSlide],
                    };
                    setCarousel(updated);
                    triggerDebouncedAutosave(updated);
                    setSelectedSlideIndex(0);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-2 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-amber-400" />
                  <span>Inizia da zero</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ─── COLONNA 3 (DESTRA): ANTEPRIMA LIVE 1080x1350 CON PRIMA/DOPO ─── */}
        <div className={`${
          isFocusMode ? 'lg:col-span-6 xl:col-span-7' : 'lg:col-span-5 xl:col-span-5'
        } flex flex-col h-full min-h-0 bg-slate-900/40 border border-slate-800 rounded-3xl p-4 overflow-y-auto custom-scrollbar items-center justify-between ${
          mobileTab === 'editor' ? 'hidden xl:flex' : 'flex'
        }`}>
          
          {/* Anteprima Canvas 4:5 con Zoom, Mockup IG e Confronto Prima/Dopo */}
          <div className="w-full flex-1 flex flex-col items-center justify-center">
            {activeSlide ? (
              <CarouselCanvasPreview
                slide={activeSlide}
                settings={carousel.settings}
                totalSlides={slides.length}
                currentIndex={safeIndex}
                onSelectSlide={setSelectedSlideIndex}
                fullCarousel={carousel}
                previousSlide={activePreviousSlide}
                isFocusMode={isFocusMode}
                onToggleFocusMode={() => setIsFocusMode((prev) => !prev)}
                onUpdateSlide={handleUpdateSlide}
                onToggleSlideCounter={handleToggleSlideCounter}
              />
            ) : (
              <div className="w-48 h-60 rounded-2xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center p-4 text-center">
                <span className="text-2xl mb-2">🖼️</span>
                <span className="text-xs font-mono text-slate-400">Anteprima 4:5</span>
                <span className="text-[10px] text-slate-600 mt-1">Nessuna slide da visualizzare</span>
              </div>
            )}
          </div>

          {/* Pulsanti Rapidi in Fondo all'Anteprima */}
          <div className="w-full pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            {slides.length > 0 ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsQualityModalOpen(true)}
                  className="flex items-center gap-1.5 text-xs text-amber-300 font-mono font-bold bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/30 hover:bg-amber-500/20 transition cursor-pointer"
                  title={validationReport.qualityReason}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Qualità: {validationReport.score}/100 · {validationReport.warningCount} warning · {validationReport.blockedCount} blocchi</span>
                </button>

                <button
                  type="button"
                  onClick={() => exportCarouselAsPdfPreview(carousel)}
                  className="text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Anteprima PDF</span>
                </button>
              </>
            ) : (
              <span className="text-slate-600 text-[11px] font-mono mx-auto">Nessuna slide presente</span>
            )}
          </div>
        </div>
      </div>

      {/* ─── 3. MODALI INTEGRATE (DIFF AI, CHECKLIST QUALITÀ, BRAND KIT, PROTEZIONE EXPORT) ─── */}

      {/* MODALE CONFRONTO DIFF AI GEMINI 3.8 FLASH */}
      {aiDiffState.isOpen && aiDiffState.originalSlide && aiDiffState.proposedSlide && (
        <CarouselAIDiffModal
          isOpen={aiDiffState.isOpen}
          onClose={() => setAiDiffState({ isOpen: false, originalSlide: null, proposedSlide: null, actionName: '' })}
          originalSlide={aiDiffState.originalSlide}
          proposedSlide={aiDiffState.proposedSlide}
          actionName={aiDiffState.actionName}
          slideIndex={safeIndex}
          totalSlides={slides.length}
          onApply={handleApplyAIDiff}
        />
      )}

      {/* MODALE CHECKLIST QUALITÀ A 7 CRITERI */}
      {isQualityModalOpen && (
        <CarouselQualityChecklistModal
          isOpen={isQualityModalOpen}
          onClose={() => setIsQualityModalOpen(false)}
          carousel={carousel}
          onSelectSlide={(idx) => setSelectedSlideIndex(idx)}
          onOptimizeSlide={(_idx) => handleTriggerAIOperation('improve_all')}
        />
      )}

      {/* MODALE PROTEZIONE ED ESPORTAZIONE ZIP */}
      {isExportProtectionModalOpen && (
        <CarouselExportProtectionModal
          isOpen={isExportProtectionModalOpen}
          onClose={() => setIsExportProtectionModalOpen(false)}
          report={validationReport}
          slides={slides}
          onGoToSlide={(idx) => setSelectedSlideIndex(idx)}
          onConfirmExport={handleExecuteExportZip}
          isExporting={isExportingZip}
          exportProgress={exportProgress}
        />
      )}

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
                showSlideCounter: updatedKit.showSlideCounter !== undefined ? updatedKit.showSlideCounter : carousel.settings.showSlideCounter,
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
