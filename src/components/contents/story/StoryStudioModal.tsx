import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  InstagramStory,
  InstagramStorySequence,
  StoryTemplateId,
} from '../../../types/story';
import {
  renderStoryToCanvas,
} from '../../../services/storyCanvasRenderer';
import {
  exportSingleStoryAsPng,
  exportFullStorySequenceZip,
} from '../../../services/storyExportService';
import {
  validateStoryQuality,
  validateEntireStorySequence,
} from '../../../services/storyQualityService';
import {
  generateStoriesWithGemini,
  optimizeSingleStoryWithGemini,
} from '../../../services/geminiStoryOptimizer';
import { useToast } from '../../../context/ToastContext';
import {
  X,
  Save,
  Download,
  FileArchive,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  ShieldCheck,
  Eye,
  Loader2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
  MoveVertical,
  Palette,
  RotateCcw,
  Check,
  AlertTriangle,
  BadgeCheck,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';
import {
  isValidHex,
  normalizeHex,
  getContrastFeedback,
} from '../../../services/coverColorUtils';
import { SlideImageControlPanel } from '../common/SlideImageControlPanel';
import { BrandKitModal } from '../carousel/BrandKitModal';
import { loadBrandKit } from '../../../services/brandKitService';
import { BrandKit } from '../../../types/carousel';

interface StoryStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  storySequence: InstagramStorySequence;
  onSaveSequence: (updated: InstagramStorySequence) => void;
  initialStoryIndex?: number;
  contentTitle?: string;
  scriptBody?: string;
  hook?: string;
  cta?: string;
}

const TEMPLATES: { id: StoryTemplateId; label: string; desc: string; accent: string }[] = [
  { id: 'minimal_dark', label: 'Minimal Dark', desc: 'Nero profondo & Oro Brand', accent: '#F59E0B' },
  { id: 'science_highlight', label: 'Science Tech', desc: 'Viola ipertrofia & Neon', accent: '#C084FC' },
  { id: 'bold_impact', label: 'Bold Impact', desc: 'Alto contrasto & Gancio massiccio', accent: '#F59E0B' },
  { id: 'coach_direct', label: 'Coach Direct', desc: 'Stile autentico Instagram & Ciano', accent: '#38BDF8' },
];

export const STORY_FONT_PRESETS = [
  { id: 'Inter', label: 'Inter', desc: 'Pulito & Tecnico (Sans)' },
  { id: 'Outfit', label: 'Outfit', desc: 'Moderno & Bold' },
  { id: 'Montserrat', label: 'Montserrat', desc: 'Geometrico & Impatto' },
  { id: 'Bebas Neue', label: 'Bebas Neue', desc: 'Condensato Display' },
  { id: 'Roboto', label: 'Roboto', desc: 'Lineare Classico' },
];

export const STORY_COLOR_SWATCHES = [
  { name: 'Oro AC', hex: '#F59E0B' },
  { name: 'Giallo Oro', hex: '#F5C518' },
  { name: 'Bianco Puro', hex: '#FFFFFF' },
  { name: 'Platino', hex: '#E2E8F0' },
  { name: 'Grigio Slate', hex: '#94A3B8' },
  { name: 'Viola Neon', hex: '#A855F7' },
  { name: 'Blu Neon', hex: '#38BDF8' },
  { name: 'Smeraldo', hex: '#10B981' },
  { name: 'Rosso Acceso', hex: '#EF4444' },
];

type StoryColorTarget = 'title' | 'highlight' | 'subtitle' | 'body' | 'accent';

export const StoryStudioModal: React.FC<StoryStudioModalProps> = ({
  isOpen,
  onClose,
  storySequence: initialSequence,
  onSaveSequence,
  initialStoryIndex = 0,
  contentTitle,
  scriptBody,
  hook,
  cta,
}) => {
  const { showSuccess, showError } = useToast();

  // Stato locale di lavoro - Sequenza interamente standardizzata su 'visual_hook'
  const [sequence, setSequence] = useState<InstagramStorySequence>(() => {
    let parsed: InstagramStorySequence;
    if (initialSequence && initialSequence.stories && initialSequence.stories.length > 0) {
      parsed = JSON.parse(JSON.stringify(initialSequence));
    } else if (initialSequence && Array.isArray(initialSequence.stories)) {
      parsed = JSON.parse(JSON.stringify(initialSequence));
    } else {
      const defaultBrandKit = loadBrandKit();
      parsed = {
        id: initialSequence?.id || `seq_${Date.now()}`,
        title: initialSequence?.title || contentTitle || 'Stories Instagram',
        status: 'draft',
        stories: [],
        settings: initialSequence?.settings || {
          templateId: 'minimal_dark',
          fontFamily: defaultBrandKit.titleFont || 'Inter',
          brandName: defaultBrandKit.brandName || 'AC COACHING',
          brandHandle: defaultBrandKit.authorHandle || '@antoniocrapanzano_coach',
          showWatermark: true,
          watermarkText: defaultBrandKit.watermarkText || '• AC COACHING •',
          logoUrl: defaultBrandKit.logoUrl || null,
          showLogo: true,
          showBrandName: true,
          brandPosition: 'top',
        },
        created_at: initialSequence?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
    const defaultBrandKit = loadBrandKit();
    if (parsed.settings) {
      parsed.settings.logoUrl = parsed.settings.logoUrl ?? defaultBrandKit.logoUrl ?? null;
      parsed.settings.brandName = parsed.settings.brandName || defaultBrandKit.brandName || 'AC COACHING';
      parsed.settings.brandHandle = parsed.settings.brandHandle || defaultBrandKit.authorHandle || '@antoniocrapanzano_coach';
      parsed.settings.showLogo = parsed.settings.showLogo ?? true;
      parsed.settings.showBrandName = parsed.settings.showBrandName ?? true;
      parsed.settings.brandPosition = parsed.settings.brandPosition ?? 'top';
    }
    // Normalizziamo ogni storia su 'visual_hook' garantendo parametri tipografici, colori e branding completi
    if (parsed.stories && parsed.stories.length > 0) {
      parsed.stories = parsed.stories.map((s) => ({
        ...s,
        layout: 'visual_hook',
        type: 'visual_hook',
        fontSizeTitle: s.fontSizeTitle ?? 70,
        fontSizeSubtitle: s.fontSizeSubtitle ?? 32,
        fontSizeBody: s.fontSizeBody ?? 32,
        textAlign: s.textAlign ?? 'left',
        textPositionY: s.textPositionY ?? 12,
        fontFamily: s.fontFamily ?? parsed.settings?.fontFamily ?? 'Inter',
        colorTitle: s.colorTitle ?? '#FFFFFF',
        colorHighlight: s.colorHighlight ?? '#F59E0B',
        colorSubtitle: s.colorSubtitle ?? '#94A3B8',
        colorBody: s.colorBody ?? '#E2E8F0',
        showLogo: s.showLogo ?? parsed.settings?.showLogo ?? true,
        showBrandName: s.showBrandName ?? parsed.settings?.showBrandName ?? true,
        brandName: s.brandName || parsed.settings?.brandName || defaultBrandKit.brandName || 'AC COACHING',
        logoUrl: s.logoUrl ?? parsed.settings?.logoUrl ?? defaultBrandKit.logoUrl ?? null,
        brandPosition: s.brandPosition ?? parsed.settings?.brandPosition ?? 'top',
      }));
    }
    return parsed;
  });

  const [activeStoryIndex, setActiveStoryIndex] = useState(
    Math.min(initialStoryIndex, (sequence.stories?.length || 1) - 1)
  );
  const [activeColorTarget, setActiveColorTarget] = useState<StoryColorTarget>('title');
  const [showSafeArea, setShowSafeArea] = useState(true);
  const [showGridCropGuide, setShowGridCropGuide] = useState(false);
  const [showIgMockup, setShowIgMockup] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [exportProgress, setExportProgress] = useState('');
  const [isGeminiGenerating, setIsGeminiGenerating] = useState(false);
  const [geminiStatusText, setGeminiStatusText] = useState('');

  // Riferimenti per drag su canvas Story
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    initialPosX: number;
    initialPosY: number;
    hasMoved: boolean;
  }>({ startX: 0, startY: 0, initialPosX: 50, initialPosY: 50, hasMoved: false });

  // Modale AI Gemini
  const [aiProposalModal, setAiProposalModal] = useState<{
    isOpen: boolean;
    type: '3_stories' | '5_stories' | '7_stories' | 'shorten_text' | 'improve_hook';
    previewSequence?: InstagramStorySequence;
  }>({
    isOpen: false,
    type: '5_stories',
  });

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);
  const [brandKit, setBrandKit] = useState(() => loadBrandKit());
  const [isBrandKitModalOpen, setIsBrandKitModalOpen] = useState(false);

  const stories = sequence.stories || [];
  const currentStory = stories[activeStoryIndex] || null;

  // Risoluzione valore colore e contrasto per il target attivo
  const activeColorValue = useMemo(() => {
    if (!currentStory) return '#FFFFFF';
    switch (activeColorTarget) {
      case 'title':
        return currentStory.colorTitle || '#FFFFFF';
      case 'highlight':
        return currentStory.colorHighlight || currentStory.accentColor || '#F59E0B';
      case 'subtitle':
        return currentStory.colorSubtitle || '#94A3B8';
      case 'body':
        return currentStory.colorBody || '#E2E8F0';
      case 'accent':
        return currentStory.accentColor || '#F59E0B';
      default:
        return '#FFFFFF';
    }
  }, [currentStory, activeColorTarget]);

  const handleUpdateActiveColor = (newHex: string) => {
    switch (activeColorTarget) {
      case 'title':
        updateCurrentStory({ colorTitle: newHex });
        break;
      case 'highlight':
        updateCurrentStory({ colorHighlight: newHex });
        break;
      case 'subtitle':
        updateCurrentStory({ colorSubtitle: newHex });
        break;
      case 'body':
        updateCurrentStory({ colorBody: newHex });
        break;
      case 'accent':
        updateCurrentStory({ accentColor: newHex });
        break;
    }
  };

  const contrastFeedback = useMemo(() => {
    const bg = currentStory?.bgColor || '#080A0F';
    const isLarge = activeColorTarget === 'title' || activeColorTarget === 'highlight';
    return getContrastFeedback(activeColorValue, bg, isLarge);
  }, [activeColorValue, currentStory?.bgColor, activeColorTarget]);

  // Report di qualità
  const sequenceQuality = useMemo(() => {
    return validateEntireStorySequence(sequence);
  }, [sequence]);

  const currentStoryQuality = useMemo(() => {
    if (!currentStory) return null;
    return validateStoryQuality(currentStory, activeStoryIndex, stories.length);
  }, [currentStory, activeStoryIndex, stories.length]);

  // Aggiorna anteprima canvas
  useEffect(() => {
    if (previewCanvasRef.current && currentStory && sequence.settings) {
      renderStoryToCanvas(previewCanvasRef.current, currentStory, sequence.settings, {
        totalStories: stories.length,
        currentStoryIndex: activeStoryIndex,
        showSafeArea,
        showIgMockup,
        showGridCropGuide,
      });
    }
  }, [currentStory, sequence.settings, stories.length, activeStoryIndex, showSafeArea, showIgMockup, showGridCropGuide]);

  if (!isOpen) return null;

  // Modifica singola story
  const updateCurrentStory = (patch: Partial<InstagramStory>) => {
    setSequence((prev) => {
      const updatedStories = [...prev.stories];
      if (updatedStories[activeStoryIndex]) {
        updatedStories[activeStoryIndex] = {
          ...updatedStories[activeStoryIndex],
          ...patch,
        };
      }
      return {
        ...prev,
        stories: updatedStories,
        updated_at: new Date().toISOString(),
      };
    });
  };

  // Modifica settings globali
  const updateSettings = (patch: Partial<typeof sequence.settings>) => {
    setSequence((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...patch },
      updated_at: new Date().toISOString(),
    }));
  };

  // Azioni sidebar stories
  const handleAddStory = () => {
    setSequence((prev) => {
      const newOrder = prev.stories.length + 1;
      const newStory: InstagramStory = {
        id: `story_${Date.now()}`,
        order: newOrder,
        type: 'visual_hook',
        layout: 'visual_hook',
        headline: 'NUOVA STORIA',
        headlineHighlight: '',
        subheadline: '',
        bodyText: '',
        fontSizeTitle: 70,
        fontSizeSubtitle: 32,
        fontSizeBody: 32,
        textAlign: 'left',
        textPositionY: 12,
        fontFamily: prev.settings?.fontFamily || 'Inter',
        colorTitle: '#FFFFFF',
        colorHighlight: '#F59E0B',
        colorSubtitle: '#94A3B8',
        colorBody: '#E2E8F0',
        status: 'ready',
        showLogo: prev.settings?.showLogo ?? true,
        showBrandName: prev.settings?.showBrandName ?? true,
        brandName: prev.settings?.brandName || 'AC COACHING',
        logoUrl: prev.settings?.logoUrl ?? null,
        brandPosition: prev.settings?.brandPosition ?? 'top',
      };
      return {
        ...prev,
        stories: [...prev.stories, newStory],
        updated_at: new Date().toISOString(),
      };
    });
    setActiveStoryIndex(stories.length);
    showSuccess('Nuova storia aggiunta alla sequenza');
  };

  const handleDuplicateStory = (index: number) => {
    const target = stories[index];
    if (!target) return;
    const duplicated: InstagramStory = {
      ...JSON.parse(JSON.stringify(target)),
      id: `story_copy_${Date.now()}`,
      order: index + 2,
    };
    const updated = [...stories];
    updated.splice(index + 1, 0, duplicated);
    const reordered = updated.map((s, i) => ({ ...s, order: i + 1 }));
    setSequence((prev) => ({ ...prev, stories: reordered, updated_at: new Date().toISOString() }));
    setActiveStoryIndex(index + 1);
    showSuccess(`Story ${index + 1} duplicata`);
  };

  const handleDeleteStory = (index: number) => {
    if (stories.length <= 1) {
      showError('La sequenza deve contenere almeno una storia');
      return;
    }
    const updated = stories.filter((_, i) => i !== index);
    const reordered = updated.map((s, i) => ({ ...s, order: i + 1 }));
    setSequence((prev) => ({ ...prev, stories: reordered, updated_at: new Date().toISOString() }));
    setActiveStoryIndex(Math.max(0, index - 1));
    showSuccess('Storia eliminata');
  };

  const handleMoveStory = (index: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= stories.length) return;
    const updated = [...stories];
    const temp = updated[index];
    updated[index] = updated[newIdx];
    updated[newIdx] = temp;
    const reordered = updated.map((s, i) => ({ ...s, order: i + 1 }));
    setSequence((prev) => ({ ...prev, stories: reordered, updated_at: new Date().toISOString() }));
    setActiveStoryIndex(newIdx);
  };

  // Esportazioni
  const handleExportCurrent = async () => {
    try {
      await exportSingleStoryAsPng(currentStory, sequence);
      showSuccess(`Story ${currentStory.order} esportata a 1080×1920 PNG!`);
    } catch {
      showError('Errore durante l\'esportazione della story');
    }
  };

  const handleExportZip = async () => {
    setIsExportingZip(true);
    setExportProgress('Generazione ZIP stories 1080×1920...');
    try {
      await exportFullStorySequenceZip(sequence, (curr, tot) => {
        setExportProgress(`Story ${curr}/${tot}...`);
      });
      showSuccess('Archivio ZIP scaricato!');
    } catch {
      showError('Errore durante la creazione dello ZIP');
    } finally {
      setIsExportingZip(false);
      setExportProgress('');
    }
  };

  // Salva ed Esci
  const handleSaveAndClose = () => {
    onSaveSequence(sequence);
    showSuccess('Sequenza Stories salvata con successo!');
    onClose();
  };

  // Gestione Logo & Branding Story
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const dataUrl = event.target.result as string;
          updateCurrentStory({ logoUrl: dataUrl, showLogo: true });
          updateSettings({ logoUrl: dataUrl, showLogo: true });
          showSuccess('Logo caricato con successo sulla story!');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    updateCurrentStory({ logoUrl: null });
    updateSettings({ logoUrl: null });
    showSuccess('Logo rimosso dalla story');
  };

  const handleApplyBrandingToAll = () => {
    if (!currentStory) return;
    const currentShowLogo = currentStory.showLogo !== undefined ? currentStory.showLogo : (sequence.settings?.showLogo ?? true);
    const currentShowBrandName = currentStory.showBrandName !== undefined ? currentStory.showBrandName : (sequence.settings?.showBrandName ?? true);
    const currentBrandName = currentStory.brandName || sequence.settings?.brandName || 'AC COACHING';
    const currentLogoUrl = currentStory.logoUrl !== undefined ? currentStory.logoUrl : (sequence.settings?.logoUrl ?? null);
    const currentPosition = currentStory.brandPosition || sequence.settings?.brandPosition || 'top';

    setSequence((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        showLogo: currentShowLogo,
        showBrandName: currentShowBrandName,
        brandName: currentBrandName,
        logoUrl: currentLogoUrl,
        brandPosition: currentPosition,
      },
      stories: prev.stories.map((st) => ({
        ...st,
        showLogo: currentShowLogo,
        showBrandName: currentShowBrandName,
        brandName: currentBrandName,
        logoUrl: currentLogoUrl,
        brandPosition: currentPosition,
      })),
      updated_at: new Date().toISOString(),
    }));
    showSuccess('Branding (Logo, Nome e Posizione) applicato a tutta la sequenza!');
  };

  const handleSaveBrandKit = (updated: BrandKit) => {
    setBrandKit(updated);
    setSequence((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        logoUrl: updated.logoUrl ?? prev.settings?.logoUrl ?? null,
        brandName: updated.brandName || prev.settings?.brandName || 'AC COACHING',
        brandHandle: updated.authorHandle || prev.settings?.brandHandle || '@antoniocrapanzano_coach',
      },
      stories: prev.stories.map((s) => ({
        ...s,
        logoUrl: updated.logoUrl !== undefined ? updated.logoUrl : s.logoUrl,
        brandName: updated.brandName || s.brandName || 'AC COACHING',
      })),
      updated_at: new Date().toISOString(),
    }));
  };

  const handleApplyPositionsToAll = () => {
    if (!currentStory) return;
    const titlePos = currentStory.titlePositionY ?? currentStory.textPositionY ?? 14;
    const bodyPos = currentStory.bodyPositionY;
    setSequence((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        textPositionY: titlePos,
        titlePositionY: titlePos,
        bodyPositionY: bodyPos,
      },
      stories: prev.stories.map((s) => ({
        ...s,
        textPositionY: titlePos,
        titlePositionY: titlePos,
        bodyPositionY: bodyPos,
      })),
      updated_at: new Date().toISOString(),
    }));
    showSuccess('Posizioni verticali (Titolo & Corpo) applicate a tutta la sequenza!');
  };

  // Trigger proposta AI con Google Gemini 3.8 Flash
  const openAiProposal = async (type: '3_stories' | '5_stories' | '7_stories' | 'shorten_text' | 'improve_hook') => {
    setIsGeminiGenerating(true);
    setGeminiStatusText(
      type === '3_stories' || type === '5_stories' || type === '7_stories'
        ? `Gemini 3.8 Flash: Creo sequenza...`
        : `Gemini 3.8 Flash: Ottimizzo story...`
    );

    try {
      let previewSeq: InstagramStorySequence | undefined;

      if (type === '3_stories' || type === '5_stories' || type === '7_stories') {
        const targetCount = type === '3_stories' ? 3 : type === '5_stories' ? 5 : 7;
        previewSeq = await generateStoriesWithGemini({
          title: contentTitle,
          scriptBody,
          hook,
          cta,
          targetCount,
          templateId: sequence.settings?.templateId || 'minimal_dark',
        });
      } else if (type === 'shorten_text') {
        previewSeq = JSON.parse(JSON.stringify(sequence));
        if (previewSeq && previewSeq.stories[activeStoryIndex]) {
          const currentStory = previewSeq.stories[activeStoryIndex];
          const optimized = await optimizeSingleStoryWithGemini(currentStory, 'shorten_text', {
            title: contentTitle,
            hook,
          });
          previewSeq.stories[activeStoryIndex] = optimized;
        }
      } else if (type === 'improve_hook') {
        previewSeq = JSON.parse(JSON.stringify(sequence));
        if (previewSeq && previewSeq.stories[0]) {
          const hookStory = previewSeq.stories[0];
          const optimized = await optimizeSingleStoryWithGemini(hookStory, 'improve_hook', {
            title: contentTitle,
            hook,
          });
          previewSeq.stories[0] = optimized;
        }
      }

      setAiProposalModal({
        isOpen: true,
        type,
        previewSequence: previewSeq,
      });
    } catch (err) {
      showError('Errore Gemini 3.8 Flash', err instanceof Error ? err.message : 'Impossibile elaborare con Gemini');
    } finally {
      setIsGeminiGenerating(false);
      setGeminiStatusText('');
    }
  };

  const applyAiProposal = () => {
    if (aiProposalModal.previewSequence) {
      const normalized: InstagramStorySequence = {
        ...aiProposalModal.previewSequence,
        stories: (aiProposalModal.previewSequence.stories || []).map((s) => ({
          ...s,
          layout: 'visual_hook' as const,
          type: 'visual_hook' as const,
          fontSizeTitle: s.fontSizeTitle ?? 70,
          fontSizeBody: s.fontSizeBody ?? 32,
          textAlign: s.textAlign ?? 'left',
          textPositionY: s.textPositionY ?? 12,
        })),
      };
      setSequence(normalized);
      setActiveStoryIndex(0);
      showSuccess('Proposta AI applicata alla sequenza Stories!');
    }
    setAiProposalModal({ isOpen: false, type: '5_stories' });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col text-slate-100 select-none">
      
      {/* ─── 1. TOP HEADER TOOLBAR ─── */}
      <header className="h-16 px-4 sm:px-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0 gap-4">
        {/* SINISTRA: TORNA INDIETRO + TITOLO */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={handleSaveAndClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            title="Salva e torna al pannello principale"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-white truncate">
                {contentTitle || 'Story Studio Fullscreen'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 font-mono">
                1080×1920 (9:16)
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Story {activeStoryIndex + 1} di {stories.length}
            </p>
          </div>
        </div>

        {/* CENTRO: QUALITY SCORE & ASSISTENTE AI GEMINI 3.8 FLASH */}
        <div className="hidden xl:flex items-center gap-2.5 shrink-0">
          {/* BADGE GEMINI 3.8 FLASH */}
          <div
            title="Generazione e ottimizzazione alimentata da Google Gemini 3.8 Flash"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold shadow-sm shadow-purple-500/10"
          >
            {isGeminiGenerating ? (
              <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            )}
            <span>{isGeminiGenerating ? geminiStatusText : '⚡ Gemini 3.8 Flash'}</span>
          </div>

          {/* QUALITY SCORE BADGE */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <span className="text-slate-400">Qualità:</span>
            <span className={`font-black ${sequenceQuality.score >= 85 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {sequenceQuality.score}/100
            </span>
          </div>

          {/* PULSANTI AI PRESET */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-xl">
            <button
              type="button"
              disabled={isGeminiGenerating}
              onClick={() => openAiProposal('3_stories')}
              className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
            >
              3 Stories
            </button>
            <button
              type="button"
              disabled={isGeminiGenerating}
              onClick={() => openAiProposal('5_stories')}
              className="px-2.5 py-1 rounded-lg text-xs font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition cursor-pointer disabled:opacity-50"
            >
              5 Stories (Ideale)
            </button>
            <button
              type="button"
              disabled={isGeminiGenerating}
              onClick={() => openAiProposal('7_stories')}
              className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
            >
              7 Stories
            </button>
          </div>
        </div>

        {/* DESTRA: BRAND KIT + SAFE AREA + EXPORT + SALVA */}
        <div className="flex items-center gap-2 shrink-0">
          {/* BRAND KIT */}
          <button
            type="button"
            onClick={() => setIsBrandKitModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-bold text-amber-300 flex items-center gap-1.5 transition cursor-pointer shrink-0"
            title="Gestisci Brand Kit (Logo, Colori, Nome Brand)"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Brand Kit</span>
          </button>

          {/* TOGGLE SAFE AREA */}
          <button
            type="button"
            onClick={() => setShowSafeArea((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
              showSafeArea
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Safe Area IG</span>
          </button>

          {/* EXPORT SINGOLA */}
          <button
            type="button"
            onClick={handleExportCurrent}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition cursor-pointer shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">PNG Story</span>
          </button>

          {/* EXPORT ZIP */}
          <button
            type="button"
            onClick={handleExportZip}
            disabled={isExportingZip}
            className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-purple-600/25 transition cursor-pointer disabled:opacity-50 shrink-0"
          >
            <FileArchive className="w-3.5 h-3.5" />
            <span>{isExportingZip ? (exportProgress || 'Esporto...') : 'Scarica ZIP'}</span>
          </button>

          {/* SALVA ED ESCI */}
          <button
            type="button"
            onClick={handleSaveAndClose}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition cursor-pointer shrink-0"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Salva</span>
          </button>
        </div>
      </header>

      {/* ─── 2. WORKSPACE CENTRALE A 3 PANNELLI ─── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        
        {/* PANNELLO 1: SIDEBAR SEQUENZA STORIES (2/12) */}
        <div className="lg:col-span-3 xl:col-span-2 bg-slate-950 border-r border-slate-800 flex flex-col min-h-0">
          <div className="p-3 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-black text-slate-300 uppercase tracking-wider">
              Sequenza ({stories.length})
            </span>
            <button
              type="button"
              onClick={handleAddStory}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-purple-500/20 border border-slate-800 text-purple-400 hover:text-purple-300 transition cursor-pointer"
              title="Aggiungi story"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* LISTA STORIES */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1.5">
            {stories.map((story, idx) => {
              const isActive = idx === activeStoryIndex;
              return (
                <div
                  key={story.id || idx}
                  onClick={() => setActiveStoryIndex(idx)}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between gap-2 ${
                    isActive
                      ? 'bg-purple-500/15 border-purple-500 text-white shadow-sm'
                      : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[11px] font-mono font-black text-purple-400 shrink-0">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0">
                      <span className="text-xs font-bold block truncate">
                        ⚡ {story.headline || 'Senza titolo'}
                      </span>
                      <span className="text-[10px] text-amber-400/80 font-mono block">
                        Hook Visuale
                      </span>
                    </div>
                  </div>

                  {/* CONTROLLI RAPIDI */}
                  {isActive && (
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleMoveStory(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-20 cursor-pointer"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveStory(idx, 'down')}
                        disabled={idx === stories.length - 1}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-20 cursor-pointer"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDuplicateStory(idx)}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-amber-400 cursor-pointer"
                        title="Duplica story"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteStory(idx)}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400 cursor-pointer"
                        title="Elimina story"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* SELETTORE TEMPLATE */}
          <div className="p-3 border-t border-slate-800 space-y-1.5 bg-slate-950/80">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              Template Globale
            </label>
            <select
              value={sequence.settings.templateId}
              onChange={(e) => updateSettings({ templateId: e.target.value as StoryTemplateId })}
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 font-bold"
            >
              {TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        {stories.length === 0 ? (
          <div className="lg:col-span-9 xl:col-span-10 flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 bg-slate-950/40 m-6 rounded-3xl border border-dashed border-slate-800">
            <div className="w-16 h-16 rounded-3xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 text-3xl shadow-lg shadow-purple-500/10">
              📱
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-white">Nessuna story ancora creata</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Inizia generando una sequenza narrativa di Stories con l'AI oppure crea subito una prima story manuale.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isGeminiGenerating}
                onClick={async () => {
                  setIsGeminiGenerating(true);
                  setGeminiStatusText('Gemini 3.8 Flash: Creo sequenza...');
                  try {
                    const fresh = await generateStoriesWithGemini({
                      title: contentTitle,
                      scriptBody,
                      hook,
                      cta,
                      targetCount: 5,
                      templateId: sequence.settings?.templateId || 'minimal_dark',
                    });
                    setSequence(fresh);
                    setActiveStoryIndex(0);
                    showSuccess('Sequenza di 5 stories generata con Google Gemini 3.8 Flash!');
                  } catch (err) {
                    showError('Errore AI', 'Impossibile generare con Gemini');
                  } finally {
                    setIsGeminiGenerating(false);
                    setGeminiStatusText('');
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-purple-500/25 transition cursor-pointer disabled:opacity-50"
              >
                {isGeminiGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>{isGeminiGenerating ? 'Generazione con Gemini 3.8 Flash...' : 'Genera con Gemini 3.8 Flash'}</span>
              </button>

              <button
                type="button"
                onClick={handleAddStory}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer"
              >
                <Plus className="w-4 h-4 text-purple-400" />
                <span>Nuova Story</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* PANNELLO 2: EDITOR STORY SELEZIONATA (5/12) */}
            <div className="lg:col-span-5 xl:col-span-6 bg-slate-900/40 border-r border-slate-800 flex flex-col min-h-0 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-4">
          
          {/* HEADER LAYOUT: UNIFICATO SU HOOK VISUALE */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-purple-500/10 border border-purple-500/25">
            <div className="flex items-center gap-2">
              <span className="text-base">⚡</span>
              <div>
                <span className="text-xs font-black text-white block">Layout Story: Hook Visuale</span>
                <span className="text-[10px] text-purple-300">Focus grafico d'impatto, massima leggibilità e tipografia scalabile</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-[10px] font-bold text-purple-300">
              Story {activeStoryIndex + 1} di {stories.length}
            </span>
          </div>

          {/* ─── BLOCCO 1: TITOLO & TESTO EVIDENZIATO ─── */}
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/90 space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
              <span className="text-xs font-black text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                <span>1. Titolo & Testo Evidenziato</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Hook Grafico</span>
            </div>

            {/* A. TITOLO / HEADLINE (MAX 200 CARATTERI) */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>Titolo Principale (Headline) *</span>
                <span className={`text-[10px] font-mono ${
                  (currentStory?.headline.length || 0) > 180 ? 'text-amber-400' : 'text-slate-500'
                }`}>
                  {currentStory?.headline.length || 0} / 200 car.
                </span>
              </label>
              <input
                type="text"
                maxLength={200}
                value={currentStory?.headline || ''}
                onChange={(e) => updateCurrentStory({ headline: e.target.value.toUpperCase() })}
                placeholder="es. VUOI AVERE IL FISICO DEI TUOI SOGNI?"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 font-black tracking-tight"
              />
            </div>

            {/* B. RIGA ACCENTO / HIGHLIGHT (MAX 200 CARATTERI) */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-amber-300 flex items-center justify-between">
                <span>Testo Evidenziato (Highlight Dorato)</span>
                <span className="text-[10px] text-amber-400/70 font-mono">
                  {currentStory?.headlineHighlight?.length || 0} / 200 car.
                </span>
              </label>
              <input
                type="text"
                maxLength={200}
                value={currentStory?.headlineHighlight || ''}
                onChange={(e) => updateCurrentStory({ headlineHighlight: e.target.value.toUpperCase() })}
                placeholder="es. DEI TUOI SOGNI?"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-amber-500/30 rounded-xl text-xs text-amber-200 placeholder-amber-500/30 focus:outline-none focus:border-amber-400 font-black tracking-tight"
              />
            </div>
          </div>

          {/* ─── BLOCCO 2: SOTTOTITOLO & CORPO DEL TESTO ─── */}
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/90 space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
              <span className="text-xs font-black text-purple-400 flex items-center gap-1.5 uppercase tracking-wider">
                <span>2. Sottotitolo & Corpo del Testo</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Contesto & Dettagli</span>
            </div>

            {/* A. SOTTOTITOLO / CONTESTO (MAX 200 CARATTERI) */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>Sottotitolo / Contesto</span>
                <span className={`text-[10px] font-mono ${
                  (currentStory?.subheadline?.length || 0) > 180 ? 'text-amber-400' : 'text-slate-500'
                }`}>
                  {currentStory?.subheadline?.length || 0} / 200 car.
                </span>
              </label>
              <input
                type="text"
                maxLength={200}
                value={currentStory?.subheadline || ''}
                onChange={(e) => updateCurrentStory({ subheadline: e.target.value })}
                placeholder="es. Cosa succede al bacino durante la discesa"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500 font-medium"
              />
            </div>

            {/* B. CORPO DELLA STORIA */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">Corpo del Testo</label>
                {currentStoryQuality && (
                  <span className={`text-[10px] font-mono ${
                    currentStoryQuality.wordCount > 40 ? 'text-amber-400' : 'text-slate-500'
                  }`}>
                    {currentStoryQuality.wordCount} parole (ideale &lt; 35)
                  </span>
                )}
              </div>
              <textarea
                rows={3}
                value={currentStory?.bodyText || ''}
                onChange={(e) => updateCurrentStory({ bodyText: e.target.value })}
                placeholder="Spiega il concetto in 1 o 2 frasi corte e perentorie..."
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500 resize-none font-medium leading-relaxed"
              />
            </div>
          </div>

          {/* 5. GESTIONE FOTO STORY */}
          <div className="pt-1">
            <SlideImageControlPanel
              imageUrl={currentStory?.imageUrl}
              imageFit={currentStory?.imageFit || 'cover'}
              imagePositionX={currentStory?.imagePositionX ?? 50}
              imagePositionY={currentStory?.imagePositionY ?? 50}
              imageZoom={currentStory?.imageZoom ?? 1.0}
              imageOverlay={currentStory?.imageOverlay ?? 40}
              imageFocalPoint={currentStory?.imageFocalPoint}
              textAlign="center"
              headline={currentStory?.headline}
              onUpdateImageParams={(params) => {
                updateCurrentStory({
                  ...params,
                });
              }}
              presetSampleImage={
                activeStoryIndex === 0
                  ? {
                      label: 'Foto Squat Leve',
                      url: '/assets/squat_tall_athlete_cover.jpg',
                    }
                  : undefined
              }
            />
          </div>

          {/* CARD 1: TIPOGRAFIA, FONT, DIMENSIONI & POSIZIONI TESTO */}
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/90 space-y-3.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
              <span className="text-xs font-black text-white flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-purple-400" />
                <span>Tipografia & Posizioni Testo</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleApplyPositionsToAll}
                  className="text-[10px] font-bold text-purple-400 hover:text-purple-300 hover:underline cursor-pointer"
                  title="Applica posizioni verticali a tutta la sequenza di Stories"
                >
                  Applica posizioni a tutte
                </button>
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md font-mono">
                  Max 200 px
                </span>
              </div>
            </div>

            {/* A. SELEZIONE FAMIGLIA FONT (TIPOGRAFIA) */}
            <div className="space-y-1.5 pb-2 border-b border-slate-800/60">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-slate-300 flex items-center gap-1">
                  <span>Famiglia Font</span>
                  <span className="text-[10px] text-purple-400 font-mono">({currentStory?.fontFamily || sequence.settings?.fontFamily || 'Inter'})</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const currentFont = currentStory?.fontFamily || sequence.settings?.fontFamily || 'Inter';
                    setSequence((prev) => ({
                      ...prev,
                      settings: { ...prev.settings, fontFamily: currentFont },
                      stories: prev.stories.map((s) => ({ ...s, fontFamily: currentFont })),
                      updated_at: new Date().toISOString(),
                    }));
                    showSuccess(`Font "${currentFont}" applicato a tutta la sequenza!`);
                  }}
                  className="text-[10px] font-bold text-purple-400 hover:text-purple-300 hover:underline cursor-pointer"
                  title="Applica questo font a tutte le stories della sequenza"
                >
                  Applica a tutte
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {STORY_FONT_PRESETS.map((f) => {
                  const isSel = (currentStory?.fontFamily || sequence.settings?.fontFamily || 'Inter') === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => updateCurrentStory({ fontFamily: f.id })}
                      className={`px-2.5 py-1.5 rounded-xl border text-left transition cursor-pointer ${
                        isSel
                          ? 'bg-purple-500/20 border-purple-500 text-white shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold truncate" style={{ fontFamily: f.id }}>
                        {f.label}
                      </div>
                      <div className="text-[9px] text-slate-500 truncate">{f.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ─── 1. TITOLO & TESTO EVIDENZIATO (DIMENSIONI & POSIZIONE Y) ─── */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-amber-500/20 space-y-3">
              <div className="flex items-center justify-between pb-1.5 border-b border-amber-500/20">
                <span className="text-xs font-black text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <span>1. Titolo & Testo Evidenziato</span>
                </span>
                <span className="text-[10px] font-mono text-amber-400/80">Hook Visivo</span>
              </div>

              {/* A. DIMENSIONE TITOLO / HEADLINE (36px - 200px) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-slate-300 flex items-center gap-1">
                    <span>Dimensione Titolo Principale</span>
                    <span className="text-[10px] text-slate-500 font-normal">(36 - 200 px)</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={36}
                      max={200}
                      value={currentStory?.fontSizeTitle || 70}
                      onChange={(e) => {
                        const val = Math.max(36, Math.min(200, Number(e.target.value) || 70));
                        updateCurrentStory({ fontSizeTitle: val });
                      }}
                      className="w-14 bg-slate-950 border border-slate-700 rounded-lg px-2 py-0.5 text-center text-xs font-mono font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-slate-500 text-xs font-mono">px</span>
                  </div>
                </div>

                {/* Slider continuo Titolo */}
                <input
                  type="range"
                  min={36}
                  max={200}
                  step={2}
                  value={currentStory?.fontSizeTitle || 70}
                  onChange={(e) => updateCurrentStory({ fontSizeTitle: Number(e.target.value) })}
                  className="w-full accent-amber-400 cursor-pointer"
                />

                {/* Preset rapidi Titolo */}
                <div className="flex items-center gap-1 flex-wrap">
                  {[
                    { label: '56px', val: 56 },
                    { label: '70px (Std)', val: 70 },
                    { label: '90px', val: 90 },
                    { label: '120px (Impatto)', val: 120 },
                    { label: '160px', val: 160 },
                    { label: '200px (Max)', val: 200 },
                  ].map((p) => {
                    const isCurrent = (currentStory?.fontSizeTitle || 70) === p.val;
                    return (
                      <button
                        key={p.val}
                        type="button"
                        onClick={() => updateCurrentStory({ fontSizeTitle: p.val })}
                        className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer border ${
                          isCurrent
                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* B. POSIZIONE VERTICALE Y (TITOLO & HIGHLIGHT) */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-slate-300 flex items-center gap-1">
                    <MoveVertical className="w-3 h-3 text-amber-400" />
                    <span>Posizione Verticale Titolo & Highlight (Y)</span>
                  </label>
                  <span className="text-[11px] font-mono font-bold text-amber-300">
                    {currentStory?.titlePositionY ?? currentStory?.textPositionY ?? 14}%
                  </span>
                </div>

                <input
                  type="range"
                  min={8}
                  max={75}
                  step={1}
                  value={currentStory?.titlePositionY ?? currentStory?.textPositionY ?? 14}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    updateCurrentStory({ titlePositionY: val, textPositionY: val });
                  }}
                  className="w-full accent-amber-400 cursor-pointer"
                />

                <div className="flex items-center gap-1.5">
                  {[
                    { label: '⬆ In Alto (12%)', val: 12 },
                    { label: '⬍ Al Centro (28%)', val: 28 },
                    { label: '⬇ In Basso (48%)', val: 48 },
                  ].map((pos) => {
                    const curVal = currentStory?.titlePositionY ?? currentStory?.textPositionY ?? 14;
                    const isCur = curVal === pos.val;
                    return (
                      <button
                        key={pos.val}
                        type="button"
                        onClick={() => updateCurrentStory({ titlePositionY: pos.val, textPositionY: pos.val })}
                        className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer border ${
                          isCur
                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                        }`}
                      >
                        {pos.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ─── 2. SOTTOTITOLO & CORPO DEL TESTO (DIMENSIONI & POSIZIONE Y) ─── */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-purple-500/20 space-y-3">
              <div className="flex items-center justify-between pb-1.5 border-b border-purple-500/20">
                <span className="text-xs font-black text-purple-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <span>2. Sottotitolo & Corpo del Testo</span>
                </span>
                <span className="text-[10px] font-mono text-purple-400/80">Contesto & Spiegazione</span>
              </div>

              {/* A. DIMENSIONE SOTTOTITOLO (20px - 80px) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-slate-300 flex items-center gap-1">
                    <span>Dimensione Sottotitolo</span>
                    <span className="text-[10px] text-slate-500 font-normal">(20 - 80 px)</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={20}
                      max={80}
                      value={currentStory?.fontSizeSubtitle || 32}
                      onChange={(e) => {
                        const val = Math.max(20, Math.min(80, Number(e.target.value) || 32));
                        updateCurrentStory({ fontSizeSubtitle: val });
                      }}
                      className="w-14 bg-slate-950 border border-slate-700 rounded-lg px-2 py-0.5 text-center text-xs font-mono font-bold text-purple-300 focus:outline-none focus:border-purple-500"
                    />
                    <span className="text-slate-500 text-xs font-mono">px</span>
                  </div>
                </div>

                <input
                  type="range"
                  min={20}
                  max={80}
                  step={2}
                  value={currentStory?.fontSizeSubtitle || 32}
                  onChange={(e) => updateCurrentStory({ fontSizeSubtitle: Number(e.target.value) })}
                  className="w-full accent-purple-400 cursor-pointer"
                />

                <div className="flex items-center gap-1 flex-wrap">
                  {[
                    { label: '24px', val: 24 },
                    { label: '28px', val: 28 },
                    { label: '32px (Std)', val: 32 },
                    { label: '38px', val: 38 },
                    { label: '48px', val: 48 },
                    { label: '60px (Grande)', val: 60 },
                  ].map((p) => {
                    const isCurrent = (currentStory?.fontSizeSubtitle || 32) === p.val;
                    return (
                      <button
                        key={p.val}
                        type="button"
                        onClick={() => updateCurrentStory({ fontSizeSubtitle: p.val })}
                        className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer border ${
                          isCurrent
                            ? 'bg-purple-500 text-white border-purple-400'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* B. DIMENSIONE CORPO DEL TESTO (18px - 70px) */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-slate-300 flex items-center gap-1">
                    <span>Dimensione Corpo del Testo</span>
                    <span className="text-[10px] text-slate-500 font-normal">(18 - 70 px)</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={18}
                      max={70}
                      value={currentStory?.fontSizeBody || 32}
                      onChange={(e) => {
                        const val = Math.max(18, Math.min(70, Number(e.target.value) || 32));
                        updateCurrentStory({ fontSizeBody: val });
                      }}
                      className="w-14 bg-slate-950 border border-slate-700 rounded-lg px-2 py-0.5 text-center text-xs font-mono font-bold text-slate-300 focus:outline-none focus:border-slate-500"
                    />
                    <span className="text-slate-500 text-xs font-mono">px</span>
                  </div>
                </div>

                <input
                  type="range"
                  min={18}
                  max={70}
                  step={2}
                  value={currentStory?.fontSizeBody || 32}
                  onChange={(e) => updateCurrentStory({ fontSizeBody: Number(e.target.value) })}
                  className="w-full accent-slate-400 cursor-pointer"
                />

                <div className="flex items-center gap-1 flex-wrap">
                  {[
                    { label: '22px (Compatto)', val: 22 },
                    { label: '28px', val: 28 },
                    { label: '32px (Std)', val: 32 },
                    { label: '38px', val: 38 },
                    { label: '46px (Grande)', val: 46 },
                    { label: '56px (Massimo)', val: 56 },
                  ].map((p) => {
                    const isCurrent = (currentStory?.fontSizeBody || 32) === p.val;
                    return (
                      <button
                        key={p.val}
                        type="button"
                        onClick={() => updateCurrentStory({ fontSizeBody: p.val })}
                        className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer border ${
                          isCurrent
                            ? 'bg-slate-700 text-white border-slate-500'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* C. POSIZIONE VERTICALE Y (SOTTOTITOLO & CORPO) */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-slate-300 flex items-center gap-1">
                    <MoveVertical className="w-3 h-3 text-purple-400" />
                    <span>Posizione Verticale Sottotitolo & Corpo (Y)</span>
                  </label>
                  <span className="text-[11px] font-mono font-bold text-purple-300">
                    {typeof currentStory?.bodyPositionY === 'number' ? `${currentStory.bodyPositionY}%` : 'Auto (Sotto Titolo)'}
                  </span>
                </div>

                <input
                  type="range"
                  min={15}
                  max={85}
                  step={1}
                  value={typeof currentStory?.bodyPositionY === 'number' ? currentStory.bodyPositionY : 56}
                  onChange={(e) => updateCurrentStory({ bodyPositionY: Number(e.target.value) })}
                  className="w-full accent-purple-400 cursor-pointer"
                />

                <div className="flex items-center gap-1.5">
                  {[
                    { label: '⬆ Auto (Sotto Titolo)', val: undefined },
                    { label: '⬍ Centro-Basso (56%)', val: 56 },
                    { label: '⬇ In Basso (70%)', val: 70 },
                  ].map((pos, idx) => {
                    const isCur = pos.val === undefined
                      ? currentStory?.bodyPositionY === undefined
                      : currentStory?.bodyPositionY === pos.val;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => updateCurrentStory({ bodyPositionY: pos.val })}
                        className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer border ${
                          isCur
                            ? 'bg-purple-500 text-white border-purple-400'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                        }`}
                      >
                        {pos.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* F. ALLINEAMENTO ORIZZONTALE TESTO */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-slate-300">Allineamento Testo</label>
                <span className="text-[10px] text-slate-500 font-mono capitalize">
                  {currentStory?.textAlign || 'left'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'left' as const, label: 'Sinistra', icon: AlignLeft },
                  { id: 'center' as const, label: 'Centro', icon: AlignCenter },
                  { id: 'right' as const, label: 'Destra', icon: AlignRight },
                ].map((al) => {
                  const Icon = al.icon;
                  const isSel = (currentStory?.textAlign || 'left') === al.id;
                  return (
                    <button
                      key={al.id}
                      type="button"
                      onClick={() => updateCurrentStory({ textAlign: al.id })}
                      className={`py-1.5 px-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        isSel
                          ? 'bg-purple-500/20 border-purple-500 text-purple-200'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{al.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* CARD 2: COLORI TESTO & BRANDING STORY */}
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/90 space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
              <span className="text-xs font-black text-white flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-amber-400" />
                <span>Colori Testo & Branding</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    updateCurrentStory({
                      colorTitle: '#FFFFFF',
                      colorHighlight: '#F59E0B',
                      colorSubtitle: '#94A3B8',
                      colorBody: '#E2E8F0',
                      accentColor: '#F59E0B',
                    });
                    showSuccess('Colori predefiniti ripristinati per questa story!');
                  }}
                  className="text-[10px] font-bold text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer transition hover:underline"
                  title="Ripristina colori predefiniti"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
                <span className="text-slate-700">|</span>
                <button
                  type="button"
                  onClick={() => {
                    const s = currentStory;
                    if (!s) return;
                    setSequence((prev) => ({
                      ...prev,
                      stories: prev.stories.map((st) => ({
                        ...st,
                        colorTitle: s.colorTitle || '#FFFFFF',
                        colorHighlight: s.colorHighlight || '#F59E0B',
                        colorSubtitle: s.colorSubtitle || '#94A3B8',
                        colorBody: s.colorBody || '#E2E8F0',
                        accentColor: s.accentColor || '#F59E0B',
                      })),
                      updated_at: new Date().toISOString(),
                    }));
                    showSuccess('Colori applicati a tutte le stories della sequenza!');
                  }}
                  className="text-[10px] font-bold text-amber-400 hover:text-amber-300 hover:underline cursor-pointer"
                  title="Copia i colori su tutte le stories"
                >
                  Applica a tutte
                </button>
              </div>
            </div>

            {/* SELEZIONE TARGET COLORE */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1">
              {[
                { id: 'title' as const, label: 'Titolo', color: currentStory?.colorTitle || '#FFFFFF' },
                { id: 'highlight' as const, label: 'Highlight', color: currentStory?.colorHighlight || '#F59E0B' },
                { id: 'subtitle' as const, label: 'Sottotitolo', color: currentStory?.colorSubtitle || '#94A3B8' },
                { id: 'body' as const, label: 'Corpo', color: currentStory?.colorBody || '#E2E8F0' },
                { id: 'accent' as const, label: 'Accento', color: currentStory?.accentColor || '#F59E0B' },
              ].map((target) => {
                const isSel = activeColorTarget === target.id;
                return (
                  <button
                    key={target.id}
                    type="button"
                    onClick={() => setActiveColorTarget(target.id)}
                    className={`p-1.5 rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer text-center ${
                      isSel
                        ? 'bg-amber-500/15 border-amber-400 text-white shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div
                      className="w-4 h-4 rounded-full border border-slate-700 shadow-inner"
                      style={{ backgroundColor: target.color }}
                    />
                    <span className="text-[10px] font-bold truncate max-w-full">{target.label}</span>
                  </button>
                );
              })}
            </div>

            {/* CONTROLLI DEL COLORE SELEZIONATO */}
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Color picker nativo */}
                  <label className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-700 cursor-pointer shadow-sm shrink-0 block">
                    <input
                      type="color"
                      value={normalizeHex(activeColorValue, '#FFFFFF')}
                      onChange={(e) => handleUpdateActiveColor(e.target.value)}
                      className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer opacity-0"
                    />
                    <div
                      className="w-full h-full rounded-lg"
                      style={{ backgroundColor: activeColorValue }}
                    />
                  </label>

                  {/* Input HEX editabile */}
                  <div>
                    <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1">
                      <span className="text-slate-500 font-mono text-xs">#</span>
                      <input
                        type="text"
                        maxLength={6}
                        value={activeColorValue.replace(/^#/, '')}
                        onChange={(e) => {
                          const raw = '#' + e.target.value;
                          if (isValidHex(raw)) {
                            handleUpdateActiveColor(normalizeHex(raw));
                          } else {
                            handleUpdateActiveColor(raw);
                          }
                        }}
                        className="w-20 bg-transparent text-xs font-mono font-bold text-white focus:outline-none uppercase"
                      />
                    </div>
                  </div>
                </div>

                {/* WCAG Contrast badge */}
                {contrastFeedback && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                      contrastFeedback.isAccessible
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    {contrastFeedback.isAccessible ? <Check className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                    <span>
                      {contrastFeedback.isAccessible ? 'Leggibile' : 'Contrasto basso'} ({contrastFeedback.ratio}:1)
                    </span>
                  </span>
                )}
              </div>

              {/* Palette Rapida AC Brand Swatches */}
              <div className="space-y-1">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Palette Rapida Brand
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {STORY_COLOR_SWATCHES.map((swatch) => (
                    <button
                      key={swatch.hex}
                      type="button"
                      onClick={() => handleUpdateActiveColor(swatch.hex)}
                      title={`${swatch.name} (${swatch.hex})`}
                      className={`w-6 h-6 rounded-lg border flex items-center justify-center transition cursor-pointer hover:scale-110 ${
                        normalizeHex(activeColorValue, '') === swatch.hex.toUpperCase()
                          ? 'border-white ring-2 ring-amber-400 shadow-md scale-105'
                          : 'border-slate-800 hover:border-slate-600'
                      }`}
                      style={{ backgroundColor: swatch.hex }}
                    >
                      {normalizeHex(activeColorValue, '') === swatch.hex.toUpperCase() && (
                        <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* CARD 3: BRANDING GRAFICA (LOGO & NOME BRAND) */}
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/90 space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
              <span className="text-xs font-black text-white flex items-center gap-1.5">
                <BadgeCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Branding Grafica (Logo & Nome)</span>
              </span>
              <button
                type="button"
                onClick={handleApplyBrandingToAll}
                className="text-[10px] font-bold text-amber-400 hover:text-amber-300 hover:underline cursor-pointer"
                title="Applica logo, nome e posizione a tutte le stories della sequenza"
              >
                Applica a tutte
              </button>
            </div>

            {/* TOGGLE VISIBILITÀ LOGO E NOME */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  const currentVal = currentStory?.showLogo !== undefined ? currentStory.showLogo : (sequence.settings?.showLogo ?? true);
                  updateCurrentStory({ showLogo: !currentVal });
                }}
                className={`px-3 py-2 rounded-xl border flex items-center justify-between text-xs font-bold transition cursor-pointer ${
                  (currentStory?.showLogo !== undefined ? currentStory.showLogo : (sequence.settings?.showLogo ?? true))
                    ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${
                    (currentStory?.showLogo !== undefined ? currentStory.showLogo : (sequence.settings?.showLogo ?? true))
                      ? 'bg-amber-400'
                      : 'bg-slate-600'
                  }`} />
                  Mostra Logo
                </span>
                <span className="text-[10px] uppercase font-mono">
                  {(currentStory?.showLogo !== undefined ? currentStory.showLogo : (sequence.settings?.showLogo ?? true)) ? 'ON' : 'OFF'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const currentVal = currentStory?.showBrandName !== undefined ? currentStory.showBrandName : (sequence.settings?.showBrandName ?? true);
                  updateCurrentStory({ showBrandName: !currentVal });
                }}
                className={`px-3 py-2 rounded-xl border flex items-center justify-between text-xs font-bold transition cursor-pointer ${
                  (currentStory?.showBrandName !== undefined ? currentStory.showBrandName : (sequence.settings?.showBrandName ?? true))
                    ? 'bg-purple-500/15 border-purple-500/50 text-purple-300'
                    : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${
                    (currentStory?.showBrandName !== undefined ? currentStory.showBrandName : (sequence.settings?.showBrandName ?? true))
                      ? 'bg-purple-400'
                      : 'bg-slate-600'
                  }`} />
                  Mostra Nome
                </span>
                <span className="text-[10px] uppercase font-mono">
                  {(currentStory?.showBrandName !== undefined ? currentStory.showBrandName : (sequence.settings?.showBrandName ?? true)) ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>

            {/* NOME BRAND INPUT */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                <span>Nome / Firma Brand</span>
                <span className="text-[10px] text-slate-500">Mostrato sulla story</span>
              </label>
              <input
                type="text"
                value={currentStory?.brandName ?? sequence.settings?.brandName ?? 'AC COACHING'}
                onChange={(e) => updateCurrentStory({ brandName: e.target.value })}
                placeholder="Es. AC COACHING o Nome Coach"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-bold"
              />
            </div>

            {/* GESTIONE LOGO IMMAGINE */}
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                  <span>Logo Story</span>
                </span>
                {(currentStory?.logoUrl || sequence.settings?.logoUrl) && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="text-[10px] font-bold text-rose-400 hover:text-rose-300 hover:underline cursor-pointer"
                  >
                    Rimuovi Logo
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* Preview Thumbnail */}
                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                  {(currentStory?.logoUrl || sequence.settings?.logoUrl) ? (
                    <img
                      src={currentStory?.logoUrl || sequence.settings?.logoUrl || ''}
                      alt="Logo story preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-black text-xs text-amber-400 bg-amber-500/10">
                      AC
                    </div>
                  )}
                </div>

                {/* Upload Action */}
                <div className="flex-1 space-y-1">
                  <input
                    ref={logoFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => logoFileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-amber-400" />
                      <span>{(currentStory?.logoUrl || sequence.settings?.logoUrl) ? 'Cambia Logo' : 'Carica Logo'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsBrandKitModalOpen(true)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-[11px] font-semibold transition cursor-pointer"
                      title="Apri impostazioni complete Brand Kit"
                    >
                      Brand Kit ⚙️
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    {(currentStory?.logoUrl || sequence.settings?.logoUrl)
                      ? 'Logo caricato e visibile sulla grafica'
                      : 'Se non carichi un logo personalizzato, verrà usato il monogramma con le iniziali'}
                  </p>
                </div>
              </div>
            </div>

            {/* POSIZIONE SULLA STORY: IN ALTO vs IN BASSO */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300">
                Posizione Badge sulla Story
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'top' as const, label: 'In Alto (Sotto Safe Area)', desc: 'Standard IG' },
                  { id: 'bottom' as const, label: 'In Basso (Sopra Input)', desc: 'Più discreto' },
                ].map((pos) => {
                  const currentPos = currentStory?.brandPosition || sequence.settings?.brandPosition || 'top';
                  const isSel = currentPos === pos.id;
                  return (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() => updateCurrentStory({ brandPosition: pos.id })}
                      className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                        isSel
                          ? 'bg-amber-500/15 border-amber-400 text-white shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <div className="text-xs font-bold">{pos.label}</div>
                      <div className="text-[9px] text-slate-500">{pos.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* PANNELLO 3: LIVE PREVIEW 1080×1920 (5/12 o 4/12) */}
        <div className="lg:col-span-4 xl:col-span-4 bg-slate-950 flex flex-col items-center justify-between p-4 sm:p-6 min-h-0">
          
          {/* CONTROLLI ANTEPRIMA */}
          <div className="w-full flex items-center justify-between gap-2 pb-2 text-xs text-slate-400 flex-wrap">
            <span className="font-mono">
              Story {activeStoryIndex + 1} di {stories.length}
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setShowSafeArea((prev) => !prev)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition ${
                  showSafeArea ? 'bg-rose-500/20 border-rose-500 text-rose-300' : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                Safe Area
              </button>
              <button
                type="button"
                onClick={() => setShowGridCropGuide((prev) => !prev)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition ${
                  showGridCropGuide ? 'bg-sky-500/20 border-sky-500 text-sky-300' : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                Griglia 1:1
              </button>
              <button
                type="button"
                onClick={() => setShowIgMockup((prev) => !prev)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition ${
                  showIgMockup ? 'bg-purple-500/20 border-purple-500 text-purple-300' : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                Mockup UI IG
              </button>
            </div>
          </div>

          {/* CANVAS CONTAINER 9:16 CON DRAG / TOUCH INTERATTIVO */}
          <div className="flex-1 w-full flex items-center justify-center min-h-0 relative">
            <div
              onPointerDown={(e) => {
                if (!currentStory?.imageUrl) return;
                if ((e.target as HTMLElement).closest('button')) return;
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                setIsDragging(true);
                dragStartRef.current = {
                  startX: e.clientX,
                  startY: e.clientY,
                  initialPosX: currentStory.imagePositionX ?? 50,
                  initialPosY: currentStory.imagePositionY ?? 50,
                  hasMoved: false,
                };
              }}
              onPointerMove={(e) => {
                if (!isDragging || !currentStory?.imageUrl) return;
                const rect = previewCanvasRef.current?.getBoundingClientRect();
                if (!rect) return;

                const deltaX = e.clientX - dragStartRef.current.startX;
                const deltaY = e.clientY - dragStartRef.current.startY;

                if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
                  dragStartRef.current.hasMoved = true;
                }

                const sensX = 100 / rect.width;
                const sensY = 100 / rect.height;

                const newPosX = Math.max(0, Math.min(100, Math.round(dragStartRef.current.initialPosX - deltaX * sensX)));
                const newPosY = Math.max(0, Math.min(100, Math.round(dragStartRef.current.initialPosY - deltaY * sensY)));

                updateCurrentStory({
                  imagePositionX: newPosX,
                  imagePositionY: newPosY,
                });
              }}
              onPointerUp={(e) => {
                if (!isDragging) return;
                try {
                  (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
                } catch {
                  // Ignore
                }
                setIsDragging(false);
              }}
              onPointerCancel={() => setIsDragging(false)}
              onDoubleClick={() => {
                if (!currentStory?.imageUrl) return;
                updateCurrentStory({
                  imagePositionX: 50,
                  imagePositionY: 50,
                });
              }}
              className={`relative h-full max-h-[72vh] aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-800 bg-slate-950 select-none ${
                currentStory?.imageUrl
                  ? isDragging
                    ? 'cursor-grabbing'
                    : 'cursor-grab hover:border-purple-500/50'
                  : ''
              }`}
            >
              <canvas
                ref={previewCanvasRef}
                width={1080}
                height={1920}
                className="w-full h-full object-contain block select-none pointer-events-none"
              />

              {/* Hint visivo in basso al passaggio del mouse */}
              {currentStory?.imageUrl && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none opacity-0 hover:opacity-100 transition-opacity text-[10px] text-slate-300 bg-slate-900/90 backdrop-blur px-3 py-1 rounded-full border border-slate-700 shadow-md">
                  Trascina per spostare la foto · Doppio clic per centrare
                </div>
              )}
            </div>
          </div>

          {/* NAVIGAZIONE FOOTER (PREV / NEXT) */}
          <div className="w-full pt-3 pb-8 sm:pb-3 flex items-center justify-between gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveStoryIndex((prev) => Math.max(0, prev - 1))}
              disabled={activeStoryIndex === 0}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 disabled:opacity-30 flex items-center gap-1 transition cursor-pointer shrink-0"
            >
              <ChevronLeft className="w-4 h-4 shrink-0" />
              <span>Precedente</span>
            </button>

            {/* PALLINI / INDICATORE */}
            <div className="flex items-center gap-1 shrink-0">
              {stories.map((_, i) => (
                <div
                  key={i}
                  onClick={() => setActiveStoryIndex(i)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    i === activeStoryIndex ? 'w-5 bg-purple-400' : 'w-1.5 bg-slate-700'
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => setActiveStoryIndex((prev) => Math.min(stories.length - 1, prev + 1))}
              disabled={activeStoryIndex === stories.length - 1}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 disabled:opacity-30 flex items-center gap-1 transition cursor-pointer shrink-0"
            >
              <span>Successiva</span>
              <ChevronRight className="w-4 h-4 shrink-0" />
            </button>
          </div>
        </div>
        </>
      )}
      </div>

      {/* ─── MODALE DI CONFERMA PROPOSTA AI ─── */}
      {aiProposalModal.isOpen && aiProposalModal.previewSequence && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Proposta Sequenza Stories con Google Gemini 3.8 Flash</span>
              </h3>
              <button
                type="button"
                onClick={() => setAiProposalModal({ isOpen: false, type: '5_stories' })}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Google Gemini 3.8 Flash ha strutturato una sequenza di{' '}
              <strong className="text-purple-300 font-black">{aiProposalModal.previewSequence.stories.length} stories 9:16</strong>{' '}
              ottimizzate per aggancio nei primi 2 secondi, densità ergonomica &lt;35 parole e CTA finale diretta.
            </p>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                Anteprima scaletta proposta:
              </span>
              {aiProposalModal.previewSequence.stories.map((s, idx) => (
                <div key={idx} className="text-xs text-slate-200 font-mono">
                  <span className="text-purple-400 font-bold">{idx + 1}.</span> {s.headline}
                  {s.headlineHighlight && <span className="text-amber-400 font-bold ml-1">[{s.headlineHighlight}]</span>}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAiProposalModal({ isOpen: false, type: '5_stories' })}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-semibold border border-slate-800 transition cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={applyAiProposal}
                className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black shadow-md shadow-purple-600/25 transition cursor-pointer"
              >
                Applica Proposta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BRAND KIT COMPLETO */}
      <BrandKitModal
        isOpen={isBrandKitModalOpen}
        onClose={() => setIsBrandKitModalOpen(false)}
        brandKit={brandKit}
        onSave={handleSaveBrandKit}
      />
    </div>
  );
};
