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
  exportCarouselAsVectorPdf,
  exportSingleSlideAsPng,
  exportAllSlidesAsPng,
} from '../../../services/carouselExportService';
import {
  generateArtDirectionForSlide,
  propagateArtDirectorStyleToCarousel,
  ArtDirectionFocus,
  ArtDirectionIntensity,
  ArtDirectorStyleProposal,
} from '../../../services/geminiCarouselOptimizer';
import { CarouselSlideEditorCard } from './CarouselSlideEditorCard';
import { CarouselCanvasPreview } from './CarouselCanvasPreview';
import { BrandKitModal } from './BrandKitModal';
import { CarouselAIDiffModal } from './CarouselAIDiffModal';
import { CarouselQualityChecklistModal } from './CarouselQualityChecklistModal';
import { CarouselExportProtectionModal } from './CarouselExportProtectionModal';
import { CarouselVideoModal } from './CarouselVideoModal';
import { useToast } from '../../../context/ToastContext';
import {
  ArrowLeft,
  Save,
  Download,
  FileText,
  Sparkles,
  Film,
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
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  GripVertical,
  Repeat,
  FileImage,
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
  const [isVideoModalOpen, setIsVideoModalOpen] = useState<boolean>(false);
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [lastSavedText, setLastSavedText] = useState<string>('ora');

  // Storico per slide (max 10 stati ciascuna per Undo completo)
  const [slideStyleHistory, setSlideStyleHistory] = useState<Record<string, CarouselSlide[]>>({});

  // Dropdown per esportazioni (ZIP, PNG corrente, PNG tutte)
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState<boolean>(false);
  const exportDropdownRef = useRef<HTMLDivElement | null>(null);

  // Drag & Drop e Inversione/Spostamento slide
  const [draggedSlideIndex, setDraggedSlideIndex] = useState<number | null>(null);
  const [dragOverSlideIndex, setDragOverSlideIndex] = useState<number | null>(null);
  const [showReverseMenu, setShowReverseMenu] = useState<boolean>(false);
  const reverseMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showReverseMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (reverseMenuRef.current && !reverseMenuRef.current.contains(e.target as Node)) {
        setShowReverseMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showReverseMenu]);

  // Stato modale anteprima obbligatoria Art Direction (Gemini Flash)
  const [aiDiffState, setAiDiffState] = useState<{
    isOpen: boolean;
    originalSlide: CarouselSlide | null;
    proposedSlide: CarouselSlide | null;
    proposal: ArtDirectorStyleProposal | null;
    actionName: string;
    targetSlideIndex: number;
  }>({
    isOpen: false,
    originalSlide: null,
    proposedSlide: null,
    proposal: null,
    actionName: '',
    targetSlideIndex: 0,
  });

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latestCarouselRef = useRef<InstagramCarousel>(carousel);
  latestCarouselRef.current = carousel;

  // Chiudi dropdown esportazione al click esterno
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target as Node)) {
        setIsExportDropdownOpen(false);
      }
    };
    if (isExportDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isExportDropdownOpen]);

  // Calcolo validazione qualitativa ed editoriale a 360° (utilizzato da export protection)
  const validationReport = useMemo(() => {
    return validateEntireCarousel(carousel);
  }, [carousel]);

  const slides = carousel.slides || [];
  const safeIndex = Math.min(Math.max(0, selectedSlideIndex), Math.max(0, slides.length - 1));
  const activeSlide = slides.length > 0 ? (slides[safeIndex] || slides[0]) : null;
  const activePreviousSlide = activeSlide && slideStyleHistory[activeSlide.id]?.length
    ? slideStyleHistory[activeSlide.id][slideStyleHistory[activeSlide.id].length - 1]
    : null;


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

  // Scambio / Inversione di posizione atomica tra due slide
  const handleSwapSlides = (indexA: number, indexB: number) => {
    if (indexA < 0 || indexA >= slides.length || indexB < 0 || indexB >= slides.length || indexA === indexB) return;

    const newSlides = [...slides];
    const temp = newSlides[indexA];
    newSlides[indexA] = newSlides[indexB];
    newSlides[indexB] = temp;

    const reordered = newSlides.map((s, idx) => ({ ...s, order: idx + 1 }));
    const updatedCarousel = { ...carousel, slides: reordered };
    setCarousel(updatedCarousel);
    triggerDebouncedAutosave(updatedCarousel);
    setSelectedSlideIndex(indexB);
    showSuccess(`Slide ${indexA + 1} e ${indexB + 1} invertite!`);
  };

  // Inversione ordine dell'intero carosello o delle sole slide intermedie (mantiene Copertina/CTA)
  const handleReverseSlides = (mode: 'all' | 'content' = 'all') => {
    if (slides.length <= 1) return;

    const newSlides = [...slides];
    if (mode === 'content' && slides.length > 2) {
      const hasCover = slides[0].type === 'cover';
      const hasCta = slides[slides.length - 1].type === 'cta';
      const startIdx = hasCover ? 1 : 0;
      const endIdx = hasCta ? slides.length - 2 : slides.length - 1;

      if (endIdx > startIdx) {
        const middle = newSlides.slice(startIdx, endIdx + 1).reverse();
        newSlides.splice(startIdx, middle.length, ...middle);
      } else {
        newSlides.reverse();
      }
    } else {
      newSlides.reverse();
    }

    const reordered = newSlides.map((s, idx) => ({ ...s, order: idx + 1 }));
    const updatedCarousel = { ...carousel, slides: reordered };
    setCarousel(updatedCarousel);
    triggerDebouncedAutosave(updatedCarousel);
    setSelectedSlideIndex(0);
    showSuccess(mode === 'content' ? 'Slide di contenuto invertite!' : 'Ordine di tutte le slide invertito!');
  };

  // Drag and Drop per riordinare le miniature nella barra laterale
  const handleSlideDragStart = (index: number, e: React.DragEvent) => {
    setDraggedSlideIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleSlideDragOver = (index: number, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverSlideIndex !== index) {
      setDragOverSlideIndex(index);
    }
  };

  const handleSlideDrop = (targetIndex: number, e: React.DragEvent) => {
    e.preventDefault();
    if (draggedSlideIndex === null || draggedSlideIndex === targetIndex) {
      setDraggedSlideIndex(null);
      setDragOverSlideIndex(null);
      return;
    }

    const newSlides = [...slides];
    const [moved] = newSlides.splice(draggedSlideIndex, 1);
    newSlides.splice(targetIndex, 0, moved);

    const reordered = newSlides.map((s, idx) => ({ ...s, order: idx + 1 }));
    const updatedCarousel = { ...carousel, slides: reordered };
    setCarousel(updatedCarousel);
    triggerDebouncedAutosave(updatedCarousel);
    setSelectedSlideIndex(targetIndex);
    setDraggedSlideIndex(null);
    setDragOverSlideIndex(null);
    showSuccess(`Slide spostata in posizione ${targetIndex + 1}!`);
  };

  const handleSlideDragEnd = () => {
    setDraggedSlideIndex(null);
    setDragOverSlideIndex(null);
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

  // Trigger Art Direction con Gemini Flash e apertura anteprima obbligatoria prima/dopo
  const handleTriggerArtDirection = async (
    slideIndex: number,
    options: { focus: ArtDirectionFocus[]; intensity: ArtDirectionIntensity }
  ) => {
    const targetSlide = slides[slideIndex];
    if (!targetSlide) return;
    setIsGeminiOptimizing(true);
    try {
      const result = await generateArtDirectionForSlide(
        targetSlide,
        content,
        slideIndex,
        slides.length,
        {
          focus: options.focus,
          intensity: options.intensity,
          brandKit: carousel.settings.brandKit,
          currentTemplateId: carousel.settings.templateId,
        }
      );

      // NON applica direttamente! Apre la modale obbligatoria di anteprima prima/dopo
      setAiDiffState({
        isOpen: true,
        originalSlide: targetSlide,
        proposedSlide: result.appliedSlide,
        proposal: result.proposal,
        actionName: `Art Direction (${options.intensity === 'light' ? 'Leggera' : options.intensity === 'strong' ? 'Decisa' : 'Media'})`,
        targetSlideIndex: slideIndex,
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Errore durante l\'elaborazione grafica';
      showError('Errore Art Director Gemini', errMsg);
    } finally {
      setIsGeminiOptimizing(false);
    }
  };

  // Applicazione esplicita dello stile alla SINGOLA slide (salva nello storico fino a 10 stati)
  const handleApplyAIDiffToSlide = (appliedSlide: CarouselSlide) => {
    const slideId = appliedSlide.id;
    const currentSlide = slides.find((s) => s.id === slideId);

    // Salva nello storico della slide per l'annullamento (max 10 stati)
    if (currentSlide) {
      setSlideStyleHistory((prev) => {
        const stack = prev[slideId] || [];
        return {
          ...prev,
          [slideId]: [...stack.slice(-9), { ...currentSlide }],
        };
      });
    }

    handleUpdateSlide(appliedSlide);
    setAiDiffState({
      isOpen: false,
      originalSlide: null,
      proposedSlide: null,
      proposal: null,
      actionName: '',
      targetSlideIndex: 0,
    });
    showSuccess('✨ Stile grafico applicato alla slide!', `Slide ${safeIndex + 1} aggiornata (testo intatto al 100%).`);
  };

  // Applicazione dello stile a TUTTE le slide del carosello
  const handleApplyAIDiffToAllSlides = (proposal: ArtDirectorStyleProposal) => {
    // Salva lo stato corrente di tutte le slide nei rispettivi storici
    setSlideStyleHistory((prev) => {
      const updated = { ...prev };
      for (const s of slides) {
        const stack = updated[s.id] || [];
        updated[s.id] = [...stack.slice(-9), { ...s }];
      }
      return updated;
    });

    const updatedCarousel = propagateArtDirectorStyleToCarousel(carousel, proposal);
    setCarousel(updatedCarousel);
    triggerDebouncedAutosave(updatedCarousel);
    setAiDiffState({
      isOpen: false,
      originalSlide: null,
      proposedSlide: null,
      proposal: null,
      actionName: '',
      targetSlideIndex: 0,
    });
    showSuccess('🚀 Stile Art Director applicato a tutte le slide!', `Tutte le ${slides.length} slide sono state armonizzate graficamente.`);
  };

  // Annulla ultimo stile grafico (Undo dallo storico a 10 livelli) preservando il testo
  const handleUndoStyle = (slideId?: string) => {
    if (!slideId) return;
    const history = slideStyleHistory[slideId];
    if (!history || history.length === 0) return;

    const previousState = history[history.length - 1];
    const newHistory = history.slice(0, -1);
    const current = slides.find((s) => s.id === slideId);
    if (!current || !previousState) return;

    // Ripristina parametri grafici preservando qualsiasi testo inserito dall'utente
    const revertedSlide: CarouselSlide = {
      ...previousState,
      headline: current.headline,
      headlineHighlight: current.headlineHighlight,
      subheadline: current.subheadline,
      bodyText: current.bodyText,
      wrongText: current.wrongText,
      correctText: current.correctText,
      bulletPoints: current.bulletPoints,
      diagramStep1: current.diagramStep1,
      diagramStep2: current.diagramStep2,
      diagramHighlightResult: current.diagramHighlightResult,
      ctaBoxTitle: current.ctaBoxTitle,
      takeawayTag: current.takeawayTag,
    };

    setSlideStyleHistory((prev) => ({
      ...prev,
      [slideId]: newHistory,
    }));

    handleUpdateSlide(revertedSlide);
    showSuccess('Stile grafico precedente ripristinato (testo intatto al 100%)!');
  };

  // Esportazione singola slide corrente in formato PNG
  const handleExportCurrentSlidePng = async () => {
    const currentSlide = slides[safeIndex];
    if (!currentSlide) return;
    setIsExportDropdownOpen(false);
    setIsExportingZip(true);
    setExportProgress(`Rendering slide ${safeIndex + 1} (PNG 1080×1350)...`);
    try {
      await exportSingleSlideAsPng(currentSlide, carousel);
      showSuccess(`Slide ${safeIndex + 1} esportata in PNG!`);
    } catch (err) {
      showError('Errore esportazione PNG', err instanceof Error ? err.message : 'Errore durante l\'esportazione');
    } finally {
      setIsExportingZip(false);
      setExportProgress('');
    }
  };

  // Esportazione di tutte le slide in file PNG individuali
  const handleExportAllSlidesPng = async () => {
    if (slides.length === 0) return;
    setIsExportDropdownOpen(false);
    setIsExportingZip(true);
    setExportProgress('Rendering di tutte le slide in PNG...');
    try {
      await exportAllSlidesAsPng(carousel, (current, total) => {
        setExportProgress(`Download slide ${current} di ${total} (PNG)...`);
      });
      showSuccess(`Tutte le ${slides.length} slide sono state esportate in PNG!`);
    } catch (err) {
      showError('Errore esportazione PNG', err instanceof Error ? err.message : 'Errore durante l\'esportazione');
    } finally {
      setIsExportingZip(false);
      setExportProgress('');
    }
  };

  // Esportazione in PDF Vettoriale multipagina modificabile direttamente con Canva
  const handleExportVectorPdf = async () => {
    if (slides.length === 0) return;
    setIsExportDropdownOpen(false);
    setIsExportingZip(true);
    setExportProgress('Generazione PDF Vettoriale per Canva in corso...');
    try {
      await exportCarouselAsVectorPdf(carousel, (msg) => {
        setExportProgress(msg);
      }, content.title);
      showSuccess('PDF Vettoriale per Canva scaricato! Trascinalo su Canva per modificare testi e grafica.');
    } catch (err) {
      showError('Errore esportazione PDF Vettoriale', err instanceof Error ? err.message : 'Errore durante la creazione del PDF');
    } finally {
      setIsExportingZip(false);
      setExportProgress('');
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

          {/* Indicatore Neutro di Stato Progetto */}
          <div
            className="px-3.5 py-1.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-300 text-xs font-mono font-bold flex items-center gap-2 shadow-sm"
            title="Progetto Carosello Instagram 1080×1350"
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-slate-300 font-sans font-bold">Progetto Carosello</span>
            <span className="text-slate-600 font-mono">•</span>
            <span className="text-amber-300">{slides.length} {slides.length === 1 ? 'slide' : 'slide'}</span>
            <span className="text-slate-600 font-mono">•</span>
            <span className="text-slate-400 font-medium">1080×1350 (4:5)</span>
          </div>
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

            {/* Video Animato */}
            <button
              type="button"
              onClick={() => setIsVideoModalOpen(true)}
              disabled={slides.length === 0}
              className="px-2.5 py-1.5 rounded-xl text-amber-300 hover:text-white hover:bg-slate-900 border border-amber-500/20 hover:border-amber-500/40 font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40 disabled:pointer-events-none shadow-sm"
              title="Crea ed esporta video animato 4:5 per Instagram Post"
            >
              <Film className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden lg:inline">Video Animato</span>
            </button>

          </div>

          {/* Dropdown Esportazione: Scarica ZIP / Slide PNG / Tutte PNG / Video Animato */}
          <div className="relative" ref={exportDropdownRef}>
            <button
              type="button"
              onClick={() => setIsExportDropdownOpen((prev) => !prev)}
              disabled={isExportingZip || slides.length === 0}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition cursor-pointer disabled:opacity-50 ${
                slides.length === 0
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : validationReport.blockedCount > 0
                  ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white hover:from-rose-500 hover:to-rose-600 ring-1 ring-rose-400/30'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950'
              }`}
              title="Menu esportazione carosello"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isExportingZip ? 'Esporto...' : 'Scarica / Esporta'}</span>
              <ChevronDown className="w-3 h-3 ml-0.5 opacity-80" />
            </button>

            {isExportDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 p-1.5 space-y-1 animate-in fade-in slide-in-from-top-1">
                {/* VOCE 1: VIDEO ANIMATO 4:5 */}
                <button
                  type="button"
                  onClick={() => {
                    setIsExportDropdownOpen(false);
                    setIsVideoModalOpen(true);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-amber-300 hover:bg-slate-800 hover:text-white transition flex items-center gap-2 cursor-pointer border-b border-slate-800/80 pb-2 mb-1"
                >
                  <Film className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="block flex items-center gap-1.5">
                      <span>Video Animato (4:5)</span>
                      <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 text-[9px] font-mono rounded-md border border-amber-500/30">1080×1350</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal block">Post video animato per Instagram</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsExportDropdownOpen(false);
                    handleOpenExportModal();
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-amber-300 hover:bg-slate-800 hover:text-white transition flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <div>
                    <span className="block">Scarica ZIP</span>
                    <span className="text-[10px] text-slate-400 font-normal block">Tutte le slide + didascalia txt</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleExportCurrentSlidePng}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-white transition flex items-center gap-2 cursor-pointer"
                >
                  <FileImage className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <div>
                    <span className="block">Esporta slide corrente (PNG)</span>
                    <span className="text-[10px] text-slate-400 font-normal block">Slide {safeIndex + 1} a 1080×1350</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleExportAllSlidesPng}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-white transition flex items-center gap-2 cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <div>
                    <span className="block">Esporta tutte (PNG)</span>
                    <span className="text-[10px] text-slate-400 font-normal block">{slides.length} file PNG individuali</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleExportVectorPdf}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-purple-300 hover:bg-purple-950/50 hover:text-purple-200 transition flex items-center gap-2 cursor-pointer border-t border-slate-800/80"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <div>
                    <span className="block flex items-center gap-1.5">
                      <span>Esporta PDF per Canva</span>
                      <span className="px-1.5 py-0.2 bg-purple-500/20 text-purple-300 text-[9px] font-mono rounded-md border border-purple-500/30">Vettoriale</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal block">Testi 100% modificabili su Canva</span>
                  </div>
                </button>
              </div>
            )}
          </div>

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
            
            {/* Header Miniature con + Nuova Slide, Inverti e Contatore */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 shrink-0 gap-1">
              <span className="text-xs font-bold text-slate-200 font-mono shrink-0">
                {slides.length} / 10 slide
              </span>

              <div className="flex items-center gap-1.5 relative" ref={reverseMenuRef}>
                {slides.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowReverseMenu((prev) => !prev)}
                      title="Inverti l'ordine delle slide"
                      className="px-2 py-1 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer shadow-sm"
                    >
                      <ArrowUpDown className="w-3 h-3" />
                      <span>Inverti</span>
                    </button>

                    {showReverseMenu && (
                      <div className="absolute right-0 top-full mt-1.5 w-60 bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl p-2 z-50 space-y-1.5 text-xs backdrop-blur-md animate-in fade-in zoom-in-95">
                        {slides.length > 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              handleReverseSlides('content');
                              setShowReverseMenu(false);
                            }}
                            className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-purple-500/20 text-slate-200 hover:text-purple-200 flex flex-col gap-0.5 transition cursor-pointer"
                          >
                            <span className="font-bold flex items-center gap-1.5 text-purple-300">
                              <Repeat className="w-3.5 h-3.5" /> Inverti contenuti (2-{slides.length})
                            </span>
                            <span className="text-[10px] text-slate-400 leading-tight">
                              Mantiene intatta la Copertina come slide #1
                            </span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            handleReverseSlides('all');
                            setShowReverseMenu(false);
                          }}
                          className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-purple-500/20 text-slate-200 hover:text-purple-200 flex flex-col gap-0.5 transition cursor-pointer"
                        >
                          <span className="font-bold flex items-center gap-1.5 text-white">
                            <ArrowUpDown className="w-3.5 h-3.5" /> Inverti tutte (1-{slides.length})
                          </span>
                          <span className="text-[10px] text-slate-400 leading-tight">
                            Capovolge completamente l'ordine di tutte le slide
                          </span>
                        </button>
                      </div>
                    )}
                  </>
                )}

                <button
                  type="button"
                  onClick={handleAddNewSlide}
                  className="px-2 py-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Aggiungi
                </button>
              </div>
            </div>

            {/* LISTA VERTICALE DELLE SCHEDE SLIDE: TIPO, STATO, DRAG & DROP E SPOSTAMENTO */}
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
                  const isDraggingThis = draggedSlideIndex === idx;
                  const isDragOverThis = dragOverSlideIndex === idx && !isDraggingThis;

                  // Separazione semantica rigorosa:
                  // PRONTA = esportabile
                  // DA RIVEDERE = warning/miglioramenti consigliati
                  // BLOCCATA = errore critico che impedisce l'export
                  const isBlocked = sr.status === 'blocked';
                  const isWarning = sr.status === 'warning';
                  const isDraft = sr.status === 'draft';

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

                  return (
                    <div
                      key={s.id}
                      draggable={true}
                      onDragStart={(e) => handleSlideDragStart(idx, e)}
                      onDragOver={(e) => handleSlideDragOver(idx, e)}
                      onDragLeave={() => {
                        if (dragOverSlideIndex === idx) setDragOverSlideIndex(null);
                      }}
                      onDrop={(e) => handleSlideDrop(idx, e)}
                      onDragEnd={handleSlideDragEnd}
                      onClick={() => setSelectedSlideIndex(idx)}
                      className={`p-2.5 rounded-2xl border transition-all cursor-pointer space-y-1.5 relative group ${
                        isDraggingThis
                          ? 'opacity-40 scale-[0.98] border-dashed border-amber-500/80 bg-amber-500/5'
                          : isDragOverThis
                          ? 'ring-2 ring-amber-400 border-amber-400 bg-amber-500/15 scale-[1.01]'
                          : isSelected
                          ? 'bg-amber-500/15 border-amber-500/80 text-amber-200 shadow-lg ring-1 ring-amber-500/40'
                          : isFirst
                          ? 'bg-slate-950/90 border-amber-500/30 hover:border-amber-500/60'
                          : isLast
                          ? 'bg-slate-950/90 border-purple-500/30 hover:border-purple-500/60'
                          : 'bg-slate-950/80 border-slate-800/90 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {/* RIGA 1: DRAG GRIP, NUMERO, TITOLO E TIPO */}
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="flex items-start gap-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-0.5 shrink-0 mt-0.5">
                            <GripVertical className="w-3 h-3 text-slate-600 group-hover:text-slate-400 cursor-grab active:cursor-grabbing" />
                            <span className="w-5 h-5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-mono font-bold flex items-center justify-center">
                              {String(idx + 1).padStart(2, '0')}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-white leading-snug break-words line-clamp-2">
                            {s.headline || `Slide ${idx + 1}`}
                          </p>
                        </div>
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 shrink-0 flex items-center gap-1">
                          <span>{TYPE_ICONS[s.type] || '📄'}</span>
                          <span>{typeLabel}</span>
                        </span>
                      </div>

                      {/* RIGA 2: STATO, CONTEGGIO PAROLE E CONTROLLI SPOSTA / INVERTI */}
                      <div className="flex items-center justify-between gap-1.5 pt-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full border ${statusBadgeStyle}`}>
                            {statusLabel}
                          </span>

                          <span className="text-[9px] font-mono text-slate-500 truncate">
                            {sr.wordCount} p.
                          </span>
                        </div>

                        {/* PULSANTI SPOSTA E INVERTI RAPIDI */}
                        <div
                          className="flex items-center gap-0.5 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveSlide(idx, 'up');
                              }}
                              title="Sposta prima (Su)"
                              className="p-1 rounded bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800/80 transition cursor-pointer"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>
                          )}

                          {idx < slides.length - 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveSlide(idx, 'down');
                              }}
                              title="Sposta dopo (Giù)"
                              className="p-1 rounded bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800/80 transition cursor-pointer"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          )}

                          {idx < slides.length - 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSwapSlides(idx, idx + 1);
                              }}
                              title={`Inverti con Slide ${idx + 2}`}
                              className="p-1 rounded bg-slate-900/80 hover:bg-amber-500/20 text-slate-400 hover:text-amber-300 border border-slate-800/80 transition cursor-pointer"
                            >
                              <ArrowUpDown className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-500 text-center font-mono">
              💡 Trascina o usa ▲ ▼ ⇄ per spostare o invertire
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
              onSwapWithNext={() => handleSwapSlides(safeIndex, safeIndex + 1)}
              onDuplicate={() => handleDuplicateSlide(safeIndex)}
              onDelete={() => handleDeleteSlide(safeIndex)}
              onRegenerate={() => handleRegenerateSlide(safeIndex)}
              onGeminiOptimize={() =>
                handleTriggerArtDirection(safeIndex, {
                  focus: ['typography_hierarchy', 'palette_contrast', 'positioning_layout'],
                  intensity: 'medium',
                })
              }
              onTriggerArtDirection={(opts) => handleTriggerArtDirection(safeIndex, opts)}
              previousSlide={activePreviousSlide}
              canUndoStyle={Boolean(activePreviousSlide)}
              onUndoStyle={() => handleUndoStyle(activeSlide?.id)}
              onOpenDiffModal={() => {
                if (activeSlide && activePreviousSlide) {
                  setAiDiffState({
                    isOpen: true,
                    originalSlide: activePreviousSlide,
                    proposedSlide: activeSlide,
                    proposal: null,
                    actionName: 'Confronto Stile Precedente vs Attuale',
                    targetSlideIndex: safeIndex,
                  });
                }
              }}
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

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleExportVectorPdf}
                    className="text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 cursor-pointer"
                    title="Scarica PDF multipagina vettoriale modificabile direttamente in Canva"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>PDF per Canva</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => exportCarouselAsPdfPreview(carousel)}
                    className="text-slate-400 hover:text-slate-200 font-bold flex items-center gap-1 cursor-pointer"
                    title="Anteprima e stampa rapida PDF"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Stampa</span>
                  </button>
                </div>
              </>
            ) : (
              <span className="text-slate-600 text-[11px] font-mono mx-auto">Nessuna slide presente</span>
            )}
          </div>
        </div>
      </div>

      {/* ─── 3. MODALI INTEGRATE (DIFF AI, CHECKLIST QUALITÀ, BRAND KIT, PROTEZIONE EXPORT) ─── */}

      {/* MODALE ANTEPRIMA ART DIRECTION OBBLIGATORIA (GEMINI FLASH) */}
      {aiDiffState.isOpen && aiDiffState.originalSlide && aiDiffState.proposedSlide && (
        <CarouselAIDiffModal
          isOpen={aiDiffState.isOpen}
          onClose={() =>
            setAiDiffState({
              isOpen: false,
              originalSlide: null,
              proposedSlide: null,
              proposal: null,
              actionName: '',
              targetSlideIndex: 0,
            })
          }
          originalSlide={aiDiffState.originalSlide}
          proposedSlide={aiDiffState.proposedSlide}
          proposal={aiDiffState.proposal || undefined}
          actionName={aiDiffState.actionName}
          slideIndex={aiDiffState.targetSlideIndex}
          totalSlides={slides.length}
          settings={carousel.settings}
          onApplyToSlide={handleApplyAIDiffToSlide}
          onApplyToAllSlides={handleApplyAIDiffToAllSlides}
        />
      )}

      {/* MODALE CHECKLIST QUALITÀ A 7 CRITERI */}
      {isQualityModalOpen && (
        <CarouselQualityChecklistModal
          isOpen={isQualityModalOpen}
          onClose={() => setIsQualityModalOpen(false)}
          carousel={carousel}
          onSelectSlide={(idx) => setSelectedSlideIndex(idx)}
          onOptimizeSlide={(idx) =>
            handleTriggerArtDirection(idx, {
              focus: ['typography_hierarchy', 'palette_contrast', 'positioning_layout'],
              intensity: 'medium',
            })
          }
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

      {/* MODALE CAROSELLO VIDEO ANIMATO (4:5 1080x1350) */}
      {isVideoModalOpen && (
        <CarouselVideoModal
          isOpen={isVideoModalOpen}
          onClose={() => setIsVideoModalOpen(false)}
          carousel={carousel}
        />
      )}
    </div>
  );
};
