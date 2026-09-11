import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import {
  CarouselSlide,
  SlideType,
  SlideLayoutId,
  TitleFontFamily,
  BodyFontFamily,
  SubtitleFontFamily,
  SlideImagePosition,
  BrandKit,
} from '../../../types/carousel';
import { SlideImageControlPanel } from '../common/SlideImageControlPanel';
import {
  ArtDirectionFocus,
  ArtDirectionIntensity,
  ART_DIRECTION_FOCUS_OPTIONS,
} from '../../../services/geminiCarouselOptimizer';
import { sanitizeCarouselText, stripInlineColorTags } from '../../../services/carouselCanvasRenderer';
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Copy,
  Trash2,
  Sparkles,
  Plus,
  X,
  Tag,
  Hash,
  Video,
  Layout,
  Type,
  BookOpen,
  GitBranch,
  Sliders,
  MoveVertical,
  Package,
  Bold,
  Underline,
  Palette,
  RotateCcw,
  Camera,
  Upload,
  ShieldCheck,
} from 'lucide-react';

interface CarouselSlideEditorCardProps {
  slide: CarouselSlide;
  index: number;
  totalSlides: number;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (updated: CarouselSlide) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onSwapWithNext?: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onRegenerate: () => void;
  onGeminiOptimize?: () => void;
  onTriggerArtDirection?: (options: { focus: ArtDirectionFocus[]; intensity: ArtDirectionIntensity }) => void;
  previousSlide?: CarouselSlide | null;
  canUndoStyle?: boolean;
  onUndoStyle?: () => void;
  onOpenDiffModal?: () => void;
  onTriggerAIOperation?: (action: string) => void;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
  onMoveToEnd?: () => void;
  isAdvancedOpen?: boolean;
  onToggleAdvanced?: () => void;
  isOptimizingWithGemini?: boolean;
  autoFocusTitle?: boolean;
  targetField?: string;
  contentTitle?: string;
  allSlides?: CarouselSlide[];
  captionText?: string;
  brandKit?: BrandKit;
}

const SLIDE_TYPES: { value: SlideType; label: string }[] = [
  { value: 'cover', label: '🌟 Copertina' },
  { value: 'problem', label: '❌ Errore / Problema' },
  { value: 'principle', label: '🧠 Principio Biomeccanico' },
  { value: 'practical_guide', label: '🏋️ Guida Pratica' },
  { value: 'proof_example', label: '📈 Esempio / Checkpoint' },
  { value: 'recap', label: '📑 Riepilogo Regole' },
  { value: 'cta', label: '🚀 Call to Action' },
];

const SLIDE_LAYOUTS: { value: SlideLayoutId; label: string; icon: string }[] = [
  { value: 'text_center', label: 'Testo Centrato', icon: '🎯' },
  { value: 'dual_tone_cover', label: 'Copertina 2 Toni', icon: '⚡' },
  { value: 'connected_icon_list', label: 'Nodi Connessi con Icone', icon: '🔗' },
  { value: 'diagram_flow', label: 'Diagramma di Flusso', icon: '📊' },
  { value: 'error_vs_correct', label: 'Errore vs Correzione', icon: '⚖️' },
  { value: 'numbered_list', label: 'Lista Numerata', icon: '🔢' },
  { value: 'step_by_step', label: 'Processo Step-by-Step', icon: '📈' },
  { value: 'photo_dominant', label: 'Foto Dominante (50/50)', icon: '🖼️' },
  { value: 'product_breakdown', label: 'Infografica Prodotto (4 Callout)', icon: '📦' },
  { value: 'text_left', label: 'Testo a Sinistra', icon: '◀️' },
  { value: 'final_cta', label: 'Box CTA Finale', icon: '🚀' },
];

const DEFAULT_TEXT_COLOR_SWATCHES = [
  { label: 'Bianco Puro', value: '#FFFFFF', bg: '#FFFFFF' },
  { label: 'Giallo Oro', value: '#F5C518', bg: '#F5C518' },
  { label: 'Ambra', value: '#F59E0B', bg: '#F59E0B' },
  { label: 'Cyan', value: '#38BDF8', bg: '#38BDF8' },
  { label: 'Smeraldo', value: '#10B981', bg: '#10B981' },
  { label: 'Rosa / Rosso', value: '#F43F5E', bg: '#F43F5E' },
  { label: 'Slate Chiaro', value: '#CBD5E1', bg: '#CBD5E1' },
];

const TITLE_FONT_OPTIONS: { label: string; value: TitleFontFamily }[] = [
  { label: 'Inter', value: 'Inter' },
  { label: 'Outfit', value: 'Outfit' },
  { label: 'Montserrat', value: 'Montserrat' },
  { label: 'Bebas Neue', value: 'Bebas Neue' },
];

const SUBTITLE_FONT_OPTIONS: { label: string; value: SubtitleFontFamily }[] = [
  { label: 'Outfit', value: 'Outfit' },
  { label: 'Montserrat', value: 'Montserrat' },
  { label: 'Bebas Neue', value: 'Bebas Neue' },
  { label: 'Inter', value: 'Inter' },
  { label: 'Roboto', value: 'Roboto' },
];

const BODY_FONT_OPTIONS: { label: string; value: BodyFontFamily }[] = [
  { label: 'Inter', value: 'Inter' },
  { label: 'Roboto', value: 'Roboto' },
  { label: 'Montserrat', value: 'Montserrat' },
  { label: 'Outfit', value: 'Outfit' },
];

interface TextCustomizerBarProps {
  fontFamily: string;
  onFontChange: (font: string) => void;
  fontOptions: { label: string; value: string }[];
  fontSizePx: number;
  onFontSizeChange: (px: number) => void;
  quickPxOptions: number[];
  isBold: boolean;
  onToggleBold: () => void;
  isUnderline: boolean;
  onToggleUnderline: () => void;
  currentColor?: string;
  defaultColor: string;
  onColorChange: (color?: string) => void;
  colorSwatches?: { label: string; value: string; bg: string }[];
  accentTheme?: 'amber' | 'purple' | 'cyan';
  labelFont?: string;
}

const TextCustomizerBar: React.FC<TextCustomizerBarProps> = ({
  fontFamily,
  onFontChange,
  fontOptions,
  fontSizePx,
  onFontSizeChange,
  quickPxOptions,
  isBold,
  onToggleBold,
  isUnderline,
  onToggleUnderline,
  currentColor,
  defaultColor,
  onColorChange,
  colorSwatches = DEFAULT_TEXT_COLOR_SWATCHES,
  accentTheme = 'amber',
  labelFont = 'Font',
}) => {
  const activeColor = currentColor || defaultColor;

  return (
    <div className="flex flex-wrap items-center justify-between gap-1.5 p-1.5 bg-slate-950/80 rounded-xl border border-slate-800/80 shadow-sm">
      {/* Sinistra: Selezione Font e Dimensioni px */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Selettore Font */}
        <select
          value={fontFamily}
          onChange={(e) => onFontChange(e.target.value)}
          className="bg-slate-900 border border-slate-700/80 rounded-lg px-2 py-1 text-[11px] font-bold text-amber-200/90 focus:outline-none focus:border-amber-500 cursor-pointer"
          title={labelFont}
        >
          {fontOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Input px */}
        <div className="flex items-center gap-1 bg-slate-900 px-1.5 py-0.5 rounded-lg border border-slate-700/80 font-mono">
          <input
            type="number"
            min="12"
            max="80"
            value={fontSizePx}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val)) {
                onFontSizeChange(Math.max(12, Math.min(80, val)));
              }
            }}
            className="w-8 bg-transparent text-center text-[11px] font-bold text-white focus:outline-none"
            title="Dimensione esatta in pixel"
          />
          <span className="text-[10px] text-slate-400">px</span>
        </div>

        {/* Chip rapidi px */}
        <div className="flex items-center gap-0.5">
          {quickPxOptions.map((px) => {
            const isChipActive = fontSizePx === px;
            return (
              <button
                key={px}
                type="button"
                onClick={() => onFontSizeChange(px)}
                className={`px-1.5 py-0.5 rounded text-[9px] font-mono transition cursor-pointer border ${
                  isChipActive
                    ? accentTheme === 'purple'
                      ? 'bg-purple-500/25 text-purple-300 border-purple-500/60 font-bold'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/60 font-bold'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border-slate-800'
                }`}
                title={`Imposta a ${px}px`}
              >
                {px}
              </button>
            );
          })}
        </div>
      </div>

      {/* Destra: Grassetto (B), Sottolineato (U), Palette Colori & Custom Picker */}
      <div className="flex items-center gap-1 flex-wrap">
        {/* B (Grassetto) */}
        <button
          type="button"
          onClick={onToggleBold}
          className={`px-2 py-1 rounded-lg text-xs font-black transition cursor-pointer border flex items-center justify-center ${
            isBold
              ? 'bg-amber-500/25 border-amber-500/70 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.25)]'
              : 'bg-slate-900 border-slate-700/80 text-slate-400 hover:text-white'
          }`}
          title="Grassetto (B)"
        >
          <Bold className="w-3 h-3" />
        </button>

        {/* U (Sottolineato) */}
        <button
          type="button"
          onClick={onToggleUnderline}
          className={`px-2 py-1 rounded-lg text-xs font-bold transition cursor-pointer border flex items-center justify-center ${
            isUnderline
              ? 'bg-amber-500/25 border-amber-500/70 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.25)]'
              : 'bg-slate-900 border-slate-700/80 text-slate-400 hover:text-white'
          }`}
          title="Sottolineato (U)"
        >
          <Underline className="w-3 h-3" />
        </button>

        {/* Palette Colori */}
        <div className="flex items-center gap-1 pl-1 border-l border-slate-800">
          {colorSwatches.map((col) => {
            const isCurrent = activeColor.toUpperCase() === col.value.toUpperCase();
            return (
              <button
                key={col.value}
                type="button"
                onClick={() => onColorChange(col.value)}
                className={`w-4 h-4 rounded-full transition cursor-pointer border ${
                  isCurrent
                    ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-slate-950 scale-110 border-white'
                    : 'border-slate-700 hover:scale-110 opacity-85 hover:opacity-100'
                }`}
                style={{ backgroundColor: col.bg }}
                title={`Colore ${col.label} (${col.value})`}
              />
            );
          })}

          {/* Selettore colore HTML nativo */}
          <label
            className="relative w-5 h-5 rounded-md bg-slate-900 border border-slate-700 flex items-center justify-center cursor-pointer hover:border-amber-500 overflow-hidden"
            title="Colore personalizzato"
          >
            <Palette className="w-3 h-3 text-slate-300" />
            <input
              type="color"
              value={activeColor}
              onChange={(e) => onColorChange(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </label>

          {/* Reset Colore */}
          {currentColor && (
            <button
              type="button"
              onClick={() => onColorChange(undefined)}
              className="p-1 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
              title="Ripristina colore predefinito"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const CarouselSlideEditorCard: React.FC<CarouselSlideEditorCardProps> = ({
  slide,
  index,
  totalSlides,
  isSelected,
  onSelect,
  onChange,
  onMoveUp,
  onMoveDown,
  onSwapWithNext,
  onDuplicate,
  onDelete,
  onRegenerate,
  onGeminiOptimize,
  onTriggerArtDirection,
  previousSlide: _previousSlide,
  canUndoStyle = false,
  onUndoStyle,
  onOpenDiffModal: _onOpenDiffModal,
  onNavigatePrev,
  onNavigateNext,
  isAdvancedOpen = false,
  onToggleAdvanced,
  isOptimizingWithGemini = false,
  autoFocusTitle = false,
  targetField,
  brandKit,
}) => {
  const headlineInputRef = useRef<HTMLTextAreaElement | null>(null);
  const subtitleInputRef = useRef<HTMLTextAreaElement | null>(null);
  const bodyInputRef = useRef<HTMLTextAreaElement | null>(null);
  const productPhotoInputRef = useRef<HTMLInputElement | null>(null);

  const brandAccent = brandKit?.accentColor || '#F59E0B';
  const brandTitleFont = brandKit?.titleFont || 'Inter';
  const brandBodyFont = brandKit?.bodyFont || 'Inter';

  const colorSwatches = useMemo(() => {
    const list = [
      { label: 'Bianco Puro', value: '#FFFFFF', bg: '#FFFFFF' },
      { label: 'Brand Accento', value: brandAccent, bg: brandAccent },
      { label: 'Giallo Oro', value: '#F5C518', bg: '#F5C518' },
      { label: 'Ambra', value: '#F59E0B', bg: '#F59E0B' },
      { label: 'Cyan', value: '#38BDF8', bg: '#38BDF8' },
      { label: 'Smeraldo', value: '#10B981', bg: '#10B981' },
      { label: 'Rosa / Rosso', value: '#F43F5E', bg: '#F43F5E' },
      { label: 'Slate Chiaro', value: '#CBD5E1', bg: '#CBD5E1' },
    ];
    const seen = new Set<string>();
    return list.filter((item) => {
      const key = item.value.toUpperCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [brandAccent]);

  // Stato inline color toolbar (bodyText)
  const [inlineColorToolbar, setInlineColorToolbar] = useState<{ selStart: number; selEnd: number } | null>(null);
  const [inlineColorPick, setInlineColorPick] = useState<string>('#F5C518');
  const [inlineEditText, setInlineEditText] = useState<string>('');
  const bodyWrapRef = useRef<HTMLDivElement | null>(null);

  // Inserisce tag [c:#HEX]testo[/c] — sostituisce l'intera selezione raw con tag pulito
  const applyInlineColor = useCallback((color: string) => {
    if (!inlineColorToolbar) return;
    const textToColor = inlineEditText.trim();
    if (!textToColor) return;
    const { selStart, selEnd } = inlineColorToolbar;
    const current = slide.bodyText || '';
    // Sostituiamo l'intera selezione raw (anche se contiene tag esistenti)
    // con un tag pulito che contiene solo il testo visibile
    const tagged = `[c:${color}]${textToColor}[/c]`;
    const newText = current.slice(0, selStart) + tagged + current.slice(selEnd);
    onChange({ ...slide, bodyText: newText });
    setInlineColorToolbar(null);
    setInlineEditText('');
  }, [inlineColorToolbar, inlineEditText, slide, onChange]);

  // Mostra toolbar quando l'utente seleziona testo nel bodyText
  const handleBodySelect = useCallback(() => {
    const ta = bodyInputRef.current;
    if (!ta) return;
    const start = ta.selectionStart ?? 0;
    const end = ta.selectionEnd ?? 0;
    if (end <= start) return;
    const raw = (ta.value || '').slice(start, end);
    if (!raw.trim()) return;
    // Mostra il testo PULITO (senza tag [c:...][/c]) nel campo editabile
    const clean = stripInlineColorTags(raw).trim();
    if (!clean) return;
    setInlineEditText(clean);
    setInlineColorToolbar({ selStart: start, selEnd: end });
  }, []);

  // Chiudi toolbar se si clicca fuori dall'area bodyText
  useEffect(() => {
    if (!inlineColorToolbar) return;
    const handler = (e: MouseEvent) => {
      if (bodyWrapRef.current && !bodyWrapRef.current.contains(e.target as Node)) {
        setInlineColorToolbar(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [inlineColorToolbar]);

  const handleProductPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Seleziona un file immagine valido (JPEG, PNG, WebP, SVG).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        onChange({
          ...slide,
          imageUrl: event.target.result,
          imageFit: slide.imageFit || 'contain',
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Auto-riparazione sicura: sanitizza testi SOLO se contengono markup residuo vietato (<color:...>, </color>, <u>, </u>, **)
  useEffect(() => {
    const hasForbidden = (t?: string | null) => Boolean(t && (/<\/?(?:color|u)[^>]*>/i.test(t) || t.includes('**')));
    if (
      hasForbidden(slide.headline) ||
      hasForbidden(slide.headlineHighlight) ||
      hasForbidden(slide.subheadline) ||
      hasForbidden(slide.bodyText)
    ) {
      onChange({
        ...slide,
        headline: sanitizeCarouselText(slide.headline) || slide.headline,
        headlineHighlight: slide.headlineHighlight ? sanitizeCarouselText(slide.headlineHighlight) : slide.headlineHighlight,
        subheadline: slide.subheadline ? sanitizeCarouselText(slide.subheadline) : slide.subheadline,
        bodyText: slide.bodyText ? sanitizeCarouselText(slide.bodyText) : slide.bodyText,
      });
    }
  }, [slide.id]);

  // Modalità Semplice di default con stato in-memory
  const [internalStyleExpanded, setInternalStyleExpanded] = useState<boolean>(false);
  const isStyleExpanded = onToggleAdvanced !== undefined ? isAdvancedOpen : internalStyleExpanded;

  const toggleStylePanel = () => {
    if (onToggleAdvanced) {
      onToggleAdvanced();
    } else {
      setInternalStyleExpanded((prev) => !prev);
    }
  };

  // Stato Art Direction (Gemini)
  const [selectedFocuses, setSelectedFocuses] = useState<ArtDirectionFocus[]>([
    'typography_hierarchy',
    'palette_contrast',
    'positioning_layout',
  ]);
  const [selectedIntensity, setSelectedIntensity] = useState<ArtDirectionIntensity>('medium');

  const toggleFocus = (f: ArtDirectionFocus) => {
    setSelectedFocuses((prev) =>
      prev.includes(f)
        ? prev.length > 1
          ? prev.filter((item) => item !== f)
          : prev
        : [...prev, f]
    );
  };



  // Auto-focus sul titolo o sul corpo della slide attiva in base al targetField
  useEffect(() => {
    if (isSelected) {
      if (targetField === 'body' && bodyInputRef.current) {
        bodyInputRef.current.focus();
        bodyInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if ((targetField === 'headline' || autoFocusTitle) && headlineInputRef.current) {
        headlineInputRef.current.focus();
      }
    }
  }, [isSelected, targetField, autoFocusTitle, index]);



  // Calcolo metriche e lunghezza testo per slide
  const allText = [
    slide.headline,
    slide.headlineHighlight || '',
    slide.subheadline || '',
    slide.bodyText,
    slide.wrongText || '',
    slide.correctText || '',
    slide.punchlineQuote || '',
    ...(slide.bulletPoints || []),
  ].join(' ').trim();

  const totalChars = allText.length;
  const totalWords = allText ? allText.split(/\s+/).filter(Boolean).length : 0;
  const isOverflowing = totalWords > 50 || totalChars > 340;

  // Suggerimento intensità IA in base alla densità del copy (solo indicatore visivo, mai selezione forzata)
  const recommendedIntensity: ArtDirectionIntensity | null = useMemo(() => {
    if (totalWords < 10) return 'strong';
    if (totalWords > 40) return 'light';
    return null;
  }, [totalWords]);

  const currentLayout: SlideLayoutId = slide.layout || (index === 0 ? 'dual_tone_cover' : index === totalSlides - 1 ? 'final_cta' : 'numbered_list');

  const hasLayoutSpecificData = Boolean(
    slide.wrongTitle ||
    slide.wrongText ||
    slide.correctTitle ||
    slide.correctText ||
    slide.diagramStep1 ||
    slide.diagramStep2 ||
    slide.diagramHighlightResult ||
    slide.topBannerText ||
    slide.calloutTopLeft?.title ||
    slide.calloutTopLeft?.text ||
    slide.calloutTopRight?.title ||
    slide.calloutTopRight?.text ||
    slide.calloutBottomLeft?.title ||
    slide.calloutBottomLeft?.text ||
    slide.calloutBottomRight?.title ||
    slide.calloutBottomRight?.text ||
    slide.badgeCoachName ||
    slide.badgeCoachTitle ||
    slide.punchlineQuote ||
    slide.ctaBoxTitle
  );

  const handleLayoutChange = (newLayout: SlideLayoutId) => {
    const updated: CarouselSlide = { ...slide, layout: newLayout };
    // Quando si cambia layout, puliamo i dati specifici del vecchio layout per evitare preset o residui
    if (currentLayout !== newLayout) {
      if (newLayout !== 'diagram_flow') {
        delete updated.diagramStep1;
        delete updated.diagramStep2;
        delete updated.diagramHighlightResult;
      }
      if (newLayout !== 'error_vs_correct') {
        delete updated.wrongTitle;
        delete updated.wrongText;
        delete updated.correctTitle;
        delete updated.correctText;
      }
      if (newLayout !== 'product_breakdown') {
        delete updated.topBannerText;
        delete updated.calloutTopLeft;
        delete updated.calloutTopRight;
        delete updated.calloutBottomLeft;
        delete updated.calloutBottomRight;
        delete updated.badgeCoachName;
        delete updated.badgeCoachTitle;
      }
      if (newLayout !== 'final_cta') {
        delete updated.ctaBoxTitle;
      }
    }
    onChange(updated);
  };

  const handleResetCurrentLayoutFields = () => {
    const updated: CarouselSlide = { ...slide };
    delete updated.wrongTitle;
    delete updated.wrongText;
    delete updated.correctTitle;
    delete updated.correctText;
    delete updated.diagramStep1;
    delete updated.diagramStep2;
    delete updated.diagramHighlightResult;
    delete updated.topBannerText;
    delete updated.calloutTopLeft;
    delete updated.calloutTopRight;
    delete updated.calloutBottomLeft;
    delete updated.calloutBottomRight;
    delete updated.badgeCoachName;
    delete updated.badgeCoachTitle;
    delete updated.punchlineQuote;
    delete updated.ctaBoxTitle;
    onChange(updated);
  };

  const handleAddBullet = () => {
    const bullets = slide.bulletPoints || [];
    onChange({
      ...slide,
      bulletPoints: [...bullets, 'Nuovo punto pratico...'],
    });
  };

  const handleUpdateBullet = (bIdx: number, val: string) => {
    const bullets = [...(slide.bulletPoints || [])];
    bullets[bIdx] = val;
    onChange({
      ...slide,
      bulletPoints: bullets,
    });
  };

  const handleRemoveBullet = (bIdx: number) => {
    const bullets = (slide.bulletPoints || []).filter((_, i) => i !== bIdx);
    onChange({
      ...slide,
      bulletPoints: bullets.length > 0 ? bullets : undefined,
    });
  };

  const handleArtDirectionAction = () => {
    if (onTriggerArtDirection) {
      onTriggerArtDirection({ focus: selectedFocuses, intensity: selectedIntensity });
    } else if (onGeminiOptimize) {
      onGeminiOptimize();
    }
  };

  return (
    <div
      onClick={onSelect}
      className={`p-4 sm:p-5 rounded-3xl border transition-all duration-200 cursor-pointer relative space-y-4 ${
        isSelected
          ? 'bg-slate-900/95 border-amber-500/80 shadow-2xl shadow-amber-500/5 ring-1 ring-amber-500/30'
          : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900/40'
      }`}
    >
      {/* ─── 1. HEADER DI NAVIGAZIONE & GERARCHIA SLIDE X DI Y ─── */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800/80 flex-wrap">
        
        {/* SINISTRA: SLIDE X DI Y + TASTI NAVIGAZIONE PRECEDENTE/SUCCESSIVA */}
        <div className="flex items-center gap-2">
          {/* Navigazione Precedente */}
          {onNavigatePrev && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNavigatePrev();
              }}
              disabled={index === 0}
              className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-300 text-xs font-bold transition cursor-pointer disabled:cursor-not-allowed flex items-center gap-1"
              title="Slide precedente (Tasto ◄)"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Prec.</span>
            </button>
          )}

          {/* Badge EVIDENTE: Slide X di Y */}
          <div className="px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/40 text-amber-300 font-mono font-black text-xs flex items-center gap-1.5 shadow-sm">
            <span>Slide {index + 1} di {totalSlides}</span>
          </div>

          {/* Navigazione Successiva */}
          {onNavigateNext && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNavigateNext();
              }}
              disabled={index >= totalSlides - 1}
              className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-300 text-xs font-bold transition cursor-pointer disabled:cursor-not-allowed flex items-center gap-1"
              title="Slide successiva (Tasto ►)"
            >
              <span className="hidden sm:inline">Succ.</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* DESTRA: METRICHE CARATTERI, MENU AI E AZIONI RAPIDE */}
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {/* Badge Conteggio Parole */}
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border ${
              isOverflowing
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold animate-pulse'
                : 'bg-slate-950 text-slate-400 border-slate-800'
            }`}
            title={isOverflowing ? 'Attenzione: oltre 50 parole, rischia overflow su mobile' : 'Lunghezza ideale per mobile'}
          >
            {totalWords} parole
          </span>

          {/* PULSANTE ART DIRECTOR: "MIGLIORA GRAFICA CON GEMINI" */}
          <button
            type="button"
            onClick={handleArtDirectionAction}
            disabled={isOptimizingWithGemini}
            className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/30 hover:from-amber-500/30 hover:to-amber-600/40 text-amber-200 border border-amber-500/40 text-[11px] font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
            title="Migliora grafica della slide con Gemini Flash (il testo rimane intatto al 100%)"
          >
            <Sparkles className={`w-3.5 h-3.5 text-amber-300 ${isOptimizingWithGemini ? 'animate-spin' : ''}`} />
            <span>{isOptimizingWithGemini ? 'Elaborazione grafica...' : '✨ Migliora grafica con Gemini'}</span>
          </button>

          {onRegenerate && (
            <button
              type="button"
              onClick={onRegenerate}
              title="Cambia layout rapido"
              className="p-1.5 rounded-lg text-slate-400 hover:text-purple-300 hover:bg-purple-500/15 transition cursor-pointer"
            >
              <Layout className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Riordino Su/Giù */}
          {index > 0 && (
            <button
              type="button"
              onClick={onMoveUp}
              title="Sposta prima (Su)"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          )}

          {index < totalSlides - 1 && (
            <button
              type="button"
              onClick={onMoveDown}
              title="Sposta dopo (Giù)"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          )}

          {onSwapWithNext && index < totalSlides - 1 && (
            <button
              type="button"
              onClick={onSwapWithNext}
              title={`Inverti posizione con slide ${index + 2}`}
              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Duplica */}
          <button
            type="button"
            onClick={onDuplicate}
            title="Duplica slide"
            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-slate-800 transition cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          {/* Elimina */}
          {totalSlides > 1 && (
            <button
              type="button"
              onClick={onDelete}
              title="Elimina slide"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>


      {/* ─── 2. MODALITÀ SEMPLICE (DEFAULT): I CAMPI FONDAMENTALI ─── */}
      <div className="space-y-3.5">
        
        {/* SELEZIONE TIPO SLIDE & LAYOUT GRAFICO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" onClick={(e) => e.stopPropagation()}>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400">Tipo Slide</label>
            <select
              value={slide.type}
              onChange={(e) => onChange({ ...slide, type: e.target.value as SlideType })}
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs font-bold text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              {SLIDE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                <Layout className="w-3 h-3 text-amber-400" /> Layout Visivo
              </label>
              {hasLayoutSpecificData && (
                <button
                  type="button"
                  onClick={handleResetCurrentLayoutFields}
                  className="text-[10px] text-rose-400 hover:text-rose-300 font-medium underline cursor-pointer"
                  title="Resetta i campi specifici del layout per questa slide"
                >
                  Resetta campi layout
                </button>
              )}
            </div>
            <select
              value={currentLayout}
              onChange={(e) => handleLayoutChange(e.target.value as SlideLayoutId)}
              className="w-full px-3 py-1.5 bg-slate-950 border border-amber-500/40 rounded-xl text-xs font-bold text-amber-300 focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              {SLIDE_LAYOUTS.map((l) => (
                <option key={l.value} value={l.value} className="bg-slate-900 text-white">
                  {l.icon} {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* TITOLO A 2 TONI (BIANCO + ACCENTO) CON INVIO PER A CAPO */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <span>Titolo Slide (Riga 1 - Bianco) *</span>
              {slide.titleColor && (
                <span
                  className="w-2.5 h-2.5 rounded-full border border-slate-700 shadow"
                  style={{ backgroundColor: slide.titleColor }}
                  title={`Colore attivo: ${slide.titleColor}`}
                />
              )}
            </label>
            <span className="text-[10px] text-amber-400/80 font-mono">↵ Premi Invio per andare a capo</span>
          </div>

          <TextCustomizerBar
            fontFamily={slide.titleFont || brandTitleFont}
            onFontChange={(font) => onChange({ ...slide, titleFont: font as TitleFontFamily })}
            fontOptions={TITLE_FONT_OPTIONS}
            fontSizePx={slide.titleFontSizePx || (slide.titleSize === 'xl' ? 82 : slide.titleSize === 'lg' ? 72 : slide.titleSize === 'md' ? 62 : 52)}
            onFontSizeChange={(px) => onChange({ ...slide, titleFontSizePx: px })}
            quickPxOptions={[52, 64, 76, 88]}
            isBold={slide.titleBold !== false}
            onToggleBold={() => onChange({ ...slide, titleBold: slide.titleBold === false ? true : false })}
            isUnderline={!!slide.titleUnderline}
            onToggleUnderline={() => onChange({ ...slide, titleUnderline: !slide.titleUnderline })}
            currentColor={slide.titleColor}
            defaultColor="#FFFFFF"
            onColorChange={(color) => {
              const updated = { ...slide };
              if (color !== undefined) updated.titleColor = color;
              else delete updated.titleColor;
              onChange({ ...updated, _colorTs: Date.now() } as typeof updated);
            }}
            colorSwatches={colorSwatches}
            labelFont="Font Titolo"
          />

          <textarea
            ref={headlineInputRef}
            rows={3}
            value={slide.headline ?? ''}
            onChange={(e) => onChange({ ...slide, headline: e.target.value })}
            onBlur={(e) => {
              const clean = sanitizeCarouselText(e.target.value);
              if (clean !== e.target.value) {
                onChange({ ...slide, headline: clean });
              }
            }}
            placeholder="es. CEDIMENTO TECNICO (premi Invio per spezzare le righe a piacere)"
            className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-2xl text-xs text-white placeholder-slate-500 font-bold resize-y min-h-[64px] leading-relaxed focus:outline-none focus:border-amber-500"
          />

          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                <span>✨ Testo Evidenziato / Riga 2 (Colore Accento)</span>
                {slide.highlightColor && (
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-slate-700 shadow"
                    style={{ backgroundColor: slide.highlightColor }}
                    title={`Colore attivo: ${slide.highlightColor}`}
                  />
                )}
              </label>
              <span className="text-[10px] text-amber-400/70 font-mono">↵ Invio per a capo</span>
            </div>

            <TextCustomizerBar
              fontFamily={slide.highlightFont || slide.titleFont || brandTitleFont}
              onFontChange={(font) => onChange({ ...slide, highlightFont: font as TitleFontFamily })}
              fontOptions={TITLE_FONT_OPTIONS}
              fontSizePx={slide.highlightFontSizePx || slide.titleFontSizePx || (slide.titleSize === 'xl' ? 82 : slide.titleSize === 'lg' ? 72 : slide.titleSize === 'md' ? 62 : 52)}
              onFontSizeChange={(px) => onChange({ ...slide, highlightFontSizePx: px })}
              quickPxOptions={[52, 64, 76, 88]}
              isBold={slide.highlightBold !== false}
              onToggleBold={() => onChange({ ...slide, highlightBold: slide.highlightBold === false ? true : false })}
              isUnderline={!!slide.highlightUnderline}
              onToggleUnderline={() => onChange({ ...slide, highlightUnderline: !slide.highlightUnderline })}
              currentColor={slide.highlightColor}
              defaultColor={brandAccent}
              onColorChange={(color) => {
                const updated = { ...slide };
                if (color !== undefined) updated.highlightColor = color;
                else delete updated.highlightColor;
                onChange({ ...updated, _colorTs: Date.now() } as typeof updated);
              }}
              colorSwatches={colorSwatches}
              labelFont="Font Evidenziato"
            />

            <textarea
              rows={2}
              value={slide.headlineHighlight ?? ''}
              onChange={(e) => onChange({ ...slide, headlineHighlight: e.target.value })}
              onBlur={(e) => {
                const clean = sanitizeCarouselText(e.target.value);
                if (clean !== e.target.value) {
                  onChange({ ...slide, headlineHighlight: clean });
                }
              }}
              placeholder="es. O MUSCOLARE? (premi Invio per andare a capo)"
              className="w-full px-3.5 py-2 bg-slate-950 border border-amber-500/40 rounded-xl text-xs text-amber-300 placeholder-amber-500/40 focus:outline-none focus:border-amber-400 font-bold resize-y min-h-[46px] leading-relaxed"
            />
          </div>
        </div>

        {/* SOTTOTITOLO / INTRO */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <span>Sottotitolo / Gancio Dati</span>
              {slide.subtitleColor && (
                <span
                  className="w-2.5 h-2.5 rounded-full border border-slate-700 shadow"
                  style={{ backgroundColor: slide.subtitleColor }}
                  title={`Colore attivo: ${slide.subtitleColor}`}
                />
              )}
            </label>
            <span className="text-[10px] text-slate-500 font-mono">↵ Invio per a capo</span>
          </div>

          <TextCustomizerBar
            fontFamily={slide.subtitleFont || brandTitleFont || 'Outfit'}
            onFontChange={(font) => onChange({ ...slide, subtitleFont: font as SubtitleFontFamily })}
            fontOptions={SUBTITLE_FONT_OPTIONS}
            fontSizePx={slide.subtitleFontSizePx || 38}
            onFontSizeChange={(px) => onChange({ ...slide, subtitleFontSizePx: px })}
            quickPxOptions={[28, 34, 40, 48]}
            isBold={slide.subtitleBold !== false}
            onToggleBold={() => onChange({ ...slide, subtitleBold: slide.subtitleBold === false ? true : false })}
            isUnderline={!!slide.subtitleUnderline}
            onToggleUnderline={() => onChange({ ...slide, subtitleUnderline: !slide.subtitleUnderline })}
            currentColor={slide.subtitleColor}
            defaultColor="#E2E8F0"
            onColorChange={(color) => {
              const updated = { ...slide };
              if (color !== undefined) updated.subtitleColor = color;
              else delete updated.subtitleColor;
              onChange({ ...updated, _colorTs: Date.now() } as typeof updated);
            }}
            colorSwatches={colorSwatches}
            labelFont="Font Sottotitolo"
          />

          <textarea
            ref={subtitleInputRef}
            rows={2}
            value={slide.subheadline ?? ''}
            onChange={(e) => onChange({ ...slide, subheadline: e.target.value })}
            onBlur={(e) => {
              const clean = sanitizeCarouselText(e.target.value);
              if (clean !== e.target.value) {
                onChange({ ...slide, subheadline: clean });
              }
            }}
            placeholder="es. VEDIAMO COSA MOSTRANO DAVVERO I DATI! (premi Invio per andare a capo)"
            className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700/80 rounded-2xl text-xs text-amber-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-y min-h-[50px] leading-relaxed"
          />
        </div>

        {/* CORPO DEL TESTO */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <span>Corpo del Testo / Spiegazione</span>
              {slide.bodyColor && (
                <span
                  className="w-2.5 h-2.5 rounded-full border border-slate-700 shadow"
                  style={{ backgroundColor: slide.bodyColor }}
                  title={`Colore attivo: ${slide.bodyColor}`}
                />
              )}
            </label>
            <span className="text-[10px] text-slate-500">Formattazione libera per mobile</span>
          </div>

          <TextCustomizerBar
            fontFamily={slide.bodyFont || brandBodyFont}
            onFontChange={(font) => onChange({ ...slide, bodyFont: font as BodyFontFamily })}
            fontOptions={BODY_FONT_OPTIONS}
            fontSizePx={slide.bodyFontSizePx || (slide.bodyFontSize === 'lg' ? 40 : slide.bodyFontSize === 'sm' ? 28 : 34)}
            onFontSizeChange={(px) => onChange({ ...slide, bodyFontSizePx: px })}
            quickPxOptions={[26, 32, 36, 42]}
            isBold={!!slide.bodyBold}
            onToggleBold={() => onChange({ ...slide, bodyBold: !slide.bodyBold })}
            isUnderline={!!slide.bodyUnderline}
            onToggleUnderline={() => onChange({ ...slide, bodyUnderline: !slide.bodyUnderline })}
            currentColor={slide.bodyColor}
            defaultColor="#CBD5E1"
            onColorChange={(color) => {
              const updated = { ...slide };
              if (color !== undefined) updated.bodyColor = color;
              else delete updated.bodyColor;
              onChange({ ...updated, _colorTs: Date.now() } as typeof updated);
            }}
            colorSwatches={colorSwatches}
            accentTheme="purple"
            labelFont="Font Corpo"
          />

          {/* Body Text con Inline Color Toolbar */}
          <div ref={bodyWrapRef} className="space-y-1.5">
            <textarea
              ref={bodyInputRef}
              rows={3}
              value={slide.bodyText || ''}
              onChange={(e) => onChange({ ...slide, bodyText: e.target.value })}
              onMouseUp={handleBodySelect}
              onKeyUp={handleBodySelect}
              placeholder="Scrivi qui il testo. Seleziona una parola per colorarla!"
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-2xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-y min-h-[75px] leading-relaxed"
            />

            {/* Toolbar inline colore — appare SOTTO il textarea quando c'è una selezione */}
            {inlineColorToolbar && (
              <div
                className="flex flex-col gap-2 bg-slate-950 border border-amber-500/50 rounded-xl px-3 py-2.5 shadow-lg"
                onMouseDown={(e) => {
                  if ((e.target as HTMLElement).tagName !== 'INPUT') {
                    e.preventDefault();
                  }
                }}
              >
                {/* Riga 1: campo testo editabile */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-amber-400 font-bold whitespace-nowrap">✏️ Colora:</span>
                  <input
                    type="text"
                    value={inlineEditText}
                    onChange={(e) => setInlineEditText(e.target.value)}
                    className="flex-1 min-w-0 bg-slate-800 border border-slate-600 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none focus:border-amber-400 font-mono"
                    placeholder="es. Martedì"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setInlineColorToolbar(null)}
                    className="shrink-0 text-slate-500 hover:text-white transition text-xs cursor-pointer px-1"
                  >✕</button>
                </div>
                {/* Riga 2: palette colori */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">Colore:</span>
                  {['#F5C518', '#F59E0B', '#38BDF8', '#10B981', '#F43F5E', '#FF6B6B', '#FFFFFF'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => applyInlineColor(c)}
                      disabled={!inlineEditText.trim()}
                      className="w-5 h-5 rounded-full border-2 border-slate-700 hover:scale-125 hover:border-white transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ backgroundColor: c }}
                      title={inlineEditText.trim() ? `Colora "${inlineEditText.trim()}" in ${c}` : 'Inserisci il testo da colorare'}
                    />
                  ))}
                  <label className="relative w-6 h-5 rounded-md bg-slate-800 border border-slate-600 flex items-center justify-center cursor-pointer hover:border-amber-400 overflow-hidden ml-1" title="Colore personalizzato">
                    <Palette className="w-3 h-3 text-slate-300 pointer-events-none" />
                    <input
                      type="color"
                      value={inlineColorPick}
                      onChange={(e) => setInlineColorPick(e.target.value)}
                      onBlur={(e) => { if (inlineEditText.trim()) applyInlineColor(e.target.value); }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </label>
                </div>
              </div>
            )}

            {(slide.bodyText || '').includes('[c:') && (
              <p className="text-[10px] text-amber-400/70 pl-1">✨ Colori inline attivi — visibili nell'anteprima canvas</p>
            )}
          </div>
        </div>

        {/* ─── CAMPI SPECIFICI IN BASE AL LAYOUT ATTIVO ─── */}
        {currentLayout === 'diagram_flow' && (
          <div className="space-y-3 p-3.5 rounded-2xl bg-slate-950 border border-purple-500/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5" /> Flusso Diagramma (Premessa ➔ Risultato)
              </span>
              {(slide.diagramStep1 || slide.diagramStep2 || slide.diagramHighlightResult || slide.punchlineQuote) && (
                <button
                  type="button"
                  onClick={() => {
                    const updated = { ...slide };
                    delete updated.diagramStep1;
                    delete updated.diagramStep2;
                    delete updated.diagramHighlightResult;
                    delete updated.punchlineQuote;
                    onChange(updated);
                  }}
                  className="text-[10px] text-rose-400 hover:text-rose-300 font-medium underline cursor-pointer"
                >
                  Svuota campi
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input
                type="text"
                value={slide.diagramStep1 || ''}
                onChange={(e) => onChange({ ...slide, diagramStep1: e.target.value })}
                placeholder="Step 1: Premessa"
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
              />
              <input
                type="text"
                value={slide.diagramHighlightResult || ''}
                onChange={(e) => onChange({ ...slide, diagramHighlightResult: e.target.value })}
                placeholder="Risultato Evidenziato (es. TASK FAILURE!)"
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-amber-500/50 rounded-xl text-xs text-amber-300 font-bold"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input
                type="text"
                value={slide.diagramStep2 || ''}
                onChange={(e) => onChange({ ...slide, diagramStep2: e.target.value })}
                placeholder="Step 2: Dettaglio / Chiarimento (opzionale)"
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-300"
              />
              <input
                type="text"
                value={slide.punchlineQuote || ''}
                onChange={(e) => onChange({ ...slide, punchlineQuote: e.target.value })}
                placeholder="Punchline Coach (opzionale)"
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-amber-300"
              />
            </div>
          </div>
        )}

        {currentLayout === 'error_vs_correct' && (
          <div className="space-y-3 p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <span>⚖️ Confronto Split: Errore vs Correzione</span>
              </span>
              {(slide.wrongText || slide.correctText || slide.wrongTitle || slide.correctTitle) && (
                <button
                  type="button"
                  onClick={() => {
                    const updated = { ...slide };
                    delete updated.wrongTitle;
                    delete updated.wrongText;
                    delete updated.correctTitle;
                    delete updated.correctText;
                    onChange(updated);
                  }}
                  className="text-[10px] text-rose-400 hover:text-rose-300 font-medium underline cursor-pointer"
                >
                  Svuota campi
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Box Errore */}
              <div className="space-y-1.5 p-2.5 rounded-xl bg-rose-950/20 border border-rose-500/30">
                <label className="text-[10px] font-bold text-rose-400 flex items-center justify-between">
                  <span>Box Rosso (Errore)</span>
                  <span className="text-[9px] text-slate-500 font-normal">Titolo opzionale</span>
                </label>
                <input
                  type="text"
                  value={slide.wrongTitle || ''}
                  onChange={(e) => onChange({ ...slide, wrongTitle: e.target.value })}
                  placeholder="Titolo (es. ❌ ERRORE DA EVITARE, o vuoto)"
                  className="w-full px-2.5 py-1 bg-slate-900 border border-rose-500/40 rounded-lg text-xs text-rose-300 font-bold focus:outline-none focus:border-rose-400"
                />
                <textarea
                  rows={2}
                  value={slide.wrongText || ''}
                  onChange={(e) => onChange({ ...slide, wrongText: e.target.value })}
                  placeholder="Descrivi l'errore da evitare..."
                  className="w-full px-2.5 py-1.5 bg-slate-900/90 border border-rose-500/30 rounded-lg text-xs text-rose-200 placeholder-rose-500/40 resize-y focus:outline-none focus:border-rose-400"
                />
              </div>

              {/* Box Correzione */}
              <div className="space-y-1.5 p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
                <label className="text-[10px] font-bold text-emerald-400 flex items-center justify-between">
                  <span>Box Verde (Correzione)</span>
                  <span className="text-[9px] text-slate-500 font-normal">Titolo opzionale</span>
                </label>
                <input
                  type="text"
                  value={slide.correctTitle || ''}
                  onChange={(e) => onChange({ ...slide, correctTitle: e.target.value })}
                  placeholder="Titolo (es. ✅ CORREZIONE OTTIMALE, o vuoto)"
                  className="w-full px-2.5 py-1 bg-slate-900 border border-emerald-500/40 rounded-lg text-xs text-emerald-300 font-bold focus:outline-none focus:border-emerald-400"
                />
                <textarea
                  rows={2}
                  value={slide.correctText || ''}
                  onChange={(e) => onChange({ ...slide, correctText: e.target.value })}
                  placeholder="Descrivi la correzione biomeccanica o regola..."
                  className="w-full px-2.5 py-1.5 bg-slate-900/90 border border-emerald-500/30 rounded-lg text-xs text-emerald-200 placeholder-emerald-500/40 resize-y focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>
          </div>
        )}

        {currentLayout === 'product_breakdown' && (
          <div className="space-y-3.5 p-3.5 rounded-2xl bg-slate-950 border border-amber-500/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-amber-400" /> Infografica Prodotto & 4 Callout Quadranti
              </span>
              <div className="flex items-center gap-2">
                {(slide.topBannerText || slide.calloutTopLeft || slide.calloutTopRight || slide.calloutBottomLeft || slide.calloutBottomRight || slide.badgeCoachName || slide.badgeCoachTitle || slide.imageUrl) && (
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...slide };
                      delete updated.topBannerText;
                      delete updated.calloutTopLeft;
                      delete updated.calloutTopRight;
                      delete updated.calloutBottomLeft;
                      delete updated.calloutBottomRight;
                      delete updated.badgeCoachName;
                      delete updated.badgeCoachTitle;
                      delete updated.imageUrl;
                      onChange(updated);
                    }}
                    className="text-[10px] text-rose-400 hover:text-rose-300 font-medium underline cursor-pointer"
                  >
                    Svuota campi
                  </button>
                )}
                <span className="text-[10px] text-slate-400 font-mono">Layout Stile @ironmanager</span>
              </div>
            </div>

            {/* Foto Soggetto Centrale (Prodotto / Esercizio) */}
            <div className="p-3 rounded-xl bg-slate-900/90 border border-amber-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-amber-300">Foto Soggetto Centrale</span>
                  <span className="text-[10px] text-slate-400">(Prodotto, Integratore, Esercizio o Atleta)</span>
                </div>
                {slide.imageUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...slide };
                      delete updated.imageUrl;
                      onChange(updated);
                    }}
                    className="text-[10px] text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" /> Rimuovi foto
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* Miniatura o Placeholder di Caricamento */}
                {slide.imageUrl ? (
                  <div className="relative group shrink-0">
                    <img
                      src={slide.imageUrl}
                      alt="Soggetto Centrale"
                      className="w-16 h-16 rounded-xl object-contain bg-slate-950 border border-amber-500/50 shadow-md p-1"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...slide };
                        delete updated.imageUrl;
                        onChange(updated);
                      }}
                      title="Rimuovi"
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => productPhotoInputRef.current?.click()}
                    className="w-16 h-16 rounded-xl border-2 border-dashed border-amber-500/40 hover:border-amber-400 bg-amber-500/5 hover:bg-amber-500/10 flex flex-col items-center justify-center text-amber-300 gap-1 transition cursor-pointer shrink-0"
                  >
                    <Upload className="w-5 h-5 text-amber-400" />
                    <span className="text-[9px] font-bold">Carica</span>
                  </button>
                )}

                {/* Controlli e Selezione Modalità Fit */}
                <div className="flex-1 space-y-1.5 min-w-0">
                  <input
                    ref={productPhotoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleProductPhotoUpload}
                    className="hidden"
                  />

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => productPhotoInputRef.current?.click()}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-amber-400" />
                      {slide.imageUrl ? 'Sostituisci Foto' : 'Carica Foto'}
                    </button>

                    <div className="flex items-center rounded-lg bg-slate-950 border border-slate-800 p-0.5 text-[10px]">
                      <button
                        type="button"
                        onClick={() => onChange({ ...slide, imageFit: 'contain' })}
                        className={`px-2 py-0.5 rounded-md font-semibold transition cursor-pointer ${
                          (slide.imageFit || 'contain') === 'contain'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Intera (contain)
                      </button>
                      <button
                        type="button"
                        onClick={() => onChange({ ...slide, imageFit: 'cover' })}
                        className={`px-2 py-0.5 rounded-md font-semibold transition cursor-pointer ${
                          slide.imageFit === 'cover'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Riempi (cover)
                      </button>
                    </div>
                  </div>

                  {/* Campo URL diretto opzionale */}
                  <input
                    type="text"
                    value={slide.imageUrl || ''}
                    onChange={(e) => onChange({ ...slide, imageUrl: e.target.value.trim() ? e.target.value : undefined })}
                    placeholder="Oppure incolla URL immagine (https://...)"
                    className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-[11px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>
            </div>

            {/* Banner Superiore (URL o Nome) */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400">Banner Superiore (URL / Sito o Testo Evidenziato)</label>
              <input
                type="text"
                value={slide.topBannerText || ''}
                onChange={(e) => onChange({ ...slide, topBannerText: e.target.value })}
                placeholder="es. WWW.IRONMANAGER.COACH oppure IL TUO SITO WEB"
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-amber-300 font-bold tracking-wider uppercase focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* 4 Quadranti Callout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {/* Top Left */}
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-amber-300 font-bold">
                  <span>↖ Callout Alto Sinistra</span>
                </div>
                <input
                  type="text"
                  value={slide.calloutTopLeft?.title || ''}
                  onChange={(e) =>
                    onChange({
                      ...slide,
                      calloutTopLeft: {
                        title: e.target.value,
                        text: slide.calloutTopLeft?.text || '',
                      },
                    })
                  }
                  placeholder="Titolo (es. 1. DIGESTIONE)"
                  className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs text-amber-200 font-bold"
                />
                <textarea
                  rows={2}
                  value={slide.calloutTopLeft?.text || ''}
                  onChange={(e) =>
                    onChange({
                      ...slide,
                      calloutTopLeft: {
                        title: slide.calloutTopLeft?.title || '',
                        text: e.target.value,
                      },
                    })
                  }
                  placeholder="Descrizione / dettagli..."
                  className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 resize-y"
                />
              </div>

              {/* Top Right */}
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-amber-300 font-bold">
                  <span>↗ Callout Alto Destra</span>
                </div>
                <input
                  type="text"
                  value={slide.calloutTopRight?.title || ''}
                  onChange={(e) =>
                    onChange({
                      ...slide,
                      calloutTopRight: {
                        title: e.target.value,
                        text: slide.calloutTopRight?.text || '',
                      },
                    })
                  }
                  placeholder="Titolo (es. 2. ASSORBIMENTO)"
                  className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs text-amber-200 font-bold"
                />
                <textarea
                  rows={2}
                  value={slide.calloutTopRight?.text || ''}
                  onChange={(e) =>
                    onChange({
                      ...slide,
                      calloutTopRight: {
                        title: slide.calloutTopRight?.title || '',
                        text: e.target.value,
                      },
                    })
                  }
                  placeholder="Descrizione / dettagli..."
                  className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 resize-y"
                />
              </div>

              {/* Bottom Left */}
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-amber-300 font-bold">
                  <span>↙ Callout Basso Sinistra</span>
                </div>
                <input
                  type="text"
                  value={slide.calloutBottomLeft?.title || ''}
                  onChange={(e) =>
                    onChange({
                      ...slide,
                      calloutBottomLeft: {
                        title: e.target.value,
                        text: slide.calloutBottomLeft?.text || '',
                      },
                    })
                  }
                  placeholder="Titolo (es. 3. PUREZZA)"
                  className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs text-amber-200 font-bold"
                />
                <textarea
                  rows={2}
                  value={slide.calloutBottomLeft?.text || ''}
                  onChange={(e) =>
                    onChange({
                      ...slide,
                      calloutBottomLeft: {
                        title: slide.calloutBottomLeft?.title || '',
                        text: e.target.value,
                      },
                    })
                  }
                  placeholder="Descrizione / dettagli..."
                  className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 resize-y"
                />
              </div>

              {/* Bottom Right */}
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-amber-300 font-bold">
                  <span>↘ Callout Basso Destra</span>
                </div>
                <input
                  type="text"
                  value={slide.calloutBottomRight?.title || ''}
                  onChange={(e) =>
                    onChange({
                      ...slide,
                      calloutBottomRight: {
                        title: e.target.value,
                        text: slide.calloutBottomRight?.text || '',
                      },
                    })
                  }
                  placeholder="Titolo (es. 4. TIMING)"
                  className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs text-amber-200 font-bold"
                />
                <textarea
                  rows={2}
                  value={slide.calloutBottomRight?.text || ''}
                  onChange={(e) =>
                    onChange({
                      ...slide,
                      calloutBottomRight: {
                        title: slide.calloutBottomRight?.title || '',
                        text: e.target.value,
                      },
                    })
                  }
                  placeholder="Descrizione / dettagli..."
                  className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 resize-y"
                />
              </div>
            </div>

            {/* Footer Badge Autore opzionale */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400">Nome Badge Footer (es. Coach)</label>
                <input
                  type="text"
                  value={slide.badgeCoachName || ''}
                  onChange={(e) => onChange({ ...slide, badgeCoachName: e.target.value })}
                  placeholder="es. Antonio Crapanzano"
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400">Qualifica Badge Footer</label>
                <input
                  type="text"
                  value={slide.badgeCoachTitle || ''}
                  onChange={(e) => onChange({ ...slide, badgeCoachTitle: e.target.value })}
                  placeholder="es. Head Coach & Prep"
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-300"
                />
              </div>
            </div>
          </div>
        )}

        {/* CARD: LOGO AC IN BACKGROUND PER COPERTINA */}
        {(index === 0 || slide.type === 'cover' || ['dual_tone_cover', 'bold_center', 'text_center'].includes(currentLayout)) && (
          <div className="space-y-3 p-3.5 rounded-2xl bg-slate-950 border border-amber-500/30">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={slide.showLogoWatermarkBg ?? false}
                  onChange={(e) => onChange({ ...slide, showLogoWatermarkBg: e.target.checked })}
                  className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <span>✨ Logo AC in Background (Watermark Copertina)</span>
              </label>
              <span className="text-[10px] text-amber-400/90 font-mono font-semibold">
                {slide.showLogoWatermarkBg ? 'Attivo' : 'Spento'}
              </span>
            </div>

            {slide.showLogoWatermarkBg && (
              <div className="space-y-2.5 pl-3 border-l-2 border-amber-500/30 pt-1">
                {/* Variante Logo */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-slate-400">Stile Logo Sfondo</span>
                  <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() => onChange({ ...slide, logoWatermarkVariant: 'white' })}
                      className={`px-2.5 py-1 text-[10px] rounded font-bold transition-all cursor-pointer ${
                        slide.logoWatermarkVariant !== 'blue'
                          ? 'bg-slate-200 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Bianco (Trasparente)
                    </button>
                    <button
                      type="button"
                      onClick={() => onChange({ ...slide, logoWatermarkVariant: 'blue' })}
                      className={`px-2.5 py-1 text-[10px] rounded font-bold transition-all cursor-pointer ${
                        slide.logoWatermarkVariant === 'blue'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Cerchio Blu
                    </button>
                  </div>
                </div>

                {/* Opacità Sfondo */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Opacità Sfondo</span>
                    <span className="font-mono text-amber-400 font-bold">
                      {Math.round((slide.logoWatermarkOpacity ?? (slide.logoWatermarkVariant === 'blue' ? 0.16 : 0.12)) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="45"
                    step="1"
                    value={Math.round((slide.logoWatermarkOpacity ?? (slide.logoWatermarkVariant === 'blue' ? 0.16 : 0.12)) * 100)}
                    onChange={(e) => onChange({ ...slide, logoWatermarkOpacity: Number(e.target.value) / 100 })}
                    className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-amber-400"
                  />
                </div>

                {/* Dimensione Logo */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Dimensione Logo</span>
                    <span className="font-mono text-amber-400 font-bold">
                      {slide.logoWatermarkSize || 560}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="350"
                    max="750"
                    step="20"
                    value={slide.logoWatermarkSize || 560}
                    onChange={(e) => onChange({ ...slide, logoWatermarkSize: Number(e.target.value) })}
                    className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-amber-400"
                  />
                </div>

                {/* Posizione Verticale Offset Y */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Posizione Verticale (Offset Y)</span>
                    <span className="font-mono text-amber-400 font-bold">
                      {slide.logoWatermarkOffsetY ? `${slide.logoWatermarkOffsetY > 0 ? '+' : ''}${slide.logoWatermarkOffsetY}px` : '0px (Centrato)'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-250"
                    max="250"
                    step="10"
                    value={slide.logoWatermarkOffsetY || 0}
                    onChange={(e) => onChange({ ...slide, logoWatermarkOffsetY: Number(e.target.value) })}
                    className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-amber-400"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {currentLayout === 'final_cta' && (
          <div className="space-y-3 p-3.5 rounded-2xl bg-slate-950 border border-amber-500/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <span>🚀 Box Call to Action Finale</span>
              </span>
              {slide.ctaBoxTitle && (
                <button
                  type="button"
                  onClick={() => {
                    const updated = { ...slide };
                    delete updated.ctaBoxTitle;
                    onChange(updated);
                  }}
                  className="text-[10px] text-rose-400 hover:text-rose-300 font-medium underline cursor-pointer"
                >
                  Svuota titolo
                </button>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400">Titolo Box CTA (opzionale, lascia vuoto per nessun titolo)</label>
              <input
                type="text"
                value={slide.ctaBoxTitle || ''}
                onChange={(e) => onChange({ ...slide, ctaBoxTitle: e.target.value })}
                placeholder="es. 💾 SALVA IL POST & COMMENTA (o lascia vuoto)"
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-amber-500/40 rounded-xl text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Background Logo Watermark Controls */}
            <div className="pt-2.5 border-t border-slate-800/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={slide.showLogoWatermarkBg ?? true}
                    onChange={(e) => onChange({ ...slide, showLogoWatermarkBg: e.target.checked })}
                    className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  <span>Logo AC in Background (Watermark)</span>
                </label>
                <span className="text-[10px] text-amber-400/90 font-mono font-semibold">
                  {(slide.showLogoWatermarkBg ?? true) ? 'Attivo' : 'Spento'}
                </span>
              </div>

              {(slide.showLogoWatermarkBg ?? true) && (
                <div className="space-y-2.5 pl-3 border-l-2 border-amber-500/30">
                  {/* Variante Logo */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-slate-400">Stile Logo Sfondo</span>
                    <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                      <button
                        type="button"
                        onClick={() => onChange({ ...slide, logoWatermarkVariant: 'white' })}
                        className={`px-2.5 py-1 text-[10px] rounded font-bold transition-all cursor-pointer ${
                          slide.logoWatermarkVariant !== 'blue'
                            ? 'bg-slate-200 text-slate-950 shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Bianco (Trasparente)
                      </button>
                      <button
                        type="button"
                        onClick={() => onChange({ ...slide, logoWatermarkVariant: 'blue' })}
                        className={`px-2.5 py-1 text-[10px] rounded font-bold transition-all cursor-pointer ${
                          slide.logoWatermarkVariant === 'blue'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Cerchio Blu
                      </button>
                    </div>
                  </div>

                  {/* Opacità Sfondo */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Opacità Sfondo</span>
                      <span className="font-mono text-amber-400 font-bold">
                        {Math.round((slide.logoWatermarkOpacity ?? (slide.logoWatermarkVariant === 'blue' ? 0.16 : 0.12)) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="4"
                      max="45"
                      step="1"
                      value={Math.round((slide.logoWatermarkOpacity ?? (slide.logoWatermarkVariant === 'blue' ? 0.16 : 0.12)) * 100)}
                      onChange={(e) => onChange({ ...slide, logoWatermarkOpacity: Number(e.target.value) / 100 })}
                      className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-amber-400"
                    />
                  </div>

                  {/* Dimensione Logo */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Dimensione Logo</span>
                      <span className="font-mono text-amber-400 font-bold">
                        {slide.logoWatermarkSize || 560}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="350"
                      max="750"
                      step="20"
                      value={slide.logoWatermarkSize || 560}
                      onChange={(e) => onChange({ ...slide, logoWatermarkSize: Number(e.target.value) })}
                      className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-amber-400"
                    />
                  </div>

                  {/* Posizione Verticale Offset Y */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Posizione Verticale (Offset Y)</span>
                      <span className="font-mono text-amber-400 font-bold">
                        {slide.logoWatermarkOffsetY ? `${slide.logoWatermarkOffsetY > 0 ? '+' : ''}${slide.logoWatermarkOffsetY}px` : '0px (Centrato)'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-250"
                      max="250"
                      step="10"
                      value={slide.logoWatermarkOffsetY || 0}
                      onChange={(e) => onChange({ ...slide, logoWatermarkOffsetY: Number(e.target.value) })}
                      className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-amber-400"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Punti Elenco (Bullet Points) se layout list o se presenti */}
        {(currentLayout === 'numbered_list' || currentLayout === 'connected_icon_list' || (slide.bulletPoints && slide.bulletPoints.length > 0)) && (
          <div className="space-y-2 p-3 bg-slate-950/80 rounded-2xl border border-slate-800" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                <span>Punti Elenco (Bullet List)</span>
              </span>
              <div className="flex items-center gap-2">
                {slide.bulletPoints && slide.bulletPoints.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...slide };
                      delete updated.bulletPoints;
                      onChange(updated);
                    }}
                    className="text-[10px] text-rose-400 hover:text-rose-300 font-medium underline cursor-pointer"
                  >
                    Svuota lista
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleAddBullet}
                  className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Aggiungi punto
                </button>
              </div>
            </div>

            {(!slide.bulletPoints || slide.bulletPoints.length === 0) ? (
              <p className="text-[11px] text-slate-500 italic">Nessun punto elenco (opzionale)</p>
            ) : (
              <div className="space-y-1.5">
                {slide.bulletPoints.map((b, bIdx) => (
                  <div key={bIdx} className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-amber-400 font-bold w-4 text-center">
                      {bIdx + 1}.
                    </span>
                    <input
                      type="text"
                      value={b}
                      onChange={(e) => handleUpdateBullet(bIdx, e.target.value)}
                      placeholder="Punto pratico..."
                      className="flex-1 px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveBullet(bIdx)}
                      className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                      title="Rimuovi punto"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── NUOVO PANNELLO: ART DIRECTION (GEMINI) NELLA COLONNA CENTRALE ─── */}
        <div
          className="p-4 sm:p-5 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border border-amber-500/40 space-y-4 shadow-xl ring-1 ring-amber-500/20"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Intestazione Pannello & Badge Permanente */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 font-black flex items-center justify-center shadow-md">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span>Art Direction (Gemini)</span>
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30 font-bold">
                    Grafica Pura
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  Calibrazione estetica, gerarchia visiva, safe area e contrasto per smartphone.
                </p>
              </div>
            </div>

            {/* Badge Permanente: Il testo non verrà mai modificato */}
            <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold flex items-center gap-1.5 shadow-sm shrink-0 self-start sm:self-center">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Il testo non verrà mai modificato</span>
            </div>
          </div>

          {/* Selettore Focus Multiplo */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                <span>Seleziona Focus di Design (multiplo)</span>
              </label>
              <span className="text-[10px] text-slate-500 font-mono">
                {selectedFocuses.length} di {ART_DIRECTION_FOCUS_OPTIONS.length} attivi
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {ART_DIRECTION_FOCUS_OPTIONS.map((opt) => {
                const isFocused = selectedFocuses.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleFocus(opt.id)}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-start gap-2 ${
                      isFocused
                        ? 'bg-amber-500/15 border-amber-500/50 text-white shadow-sm ring-1 ring-amber-500/20'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <span className="text-base shrink-0 mt-0.5">{opt.icon}</span>
                    <div className="min-w-0">
                      <span className={`text-xs font-bold block truncate ${isFocused ? 'text-amber-300' : 'text-slate-300'}`}>
                        {opt.label}
                      </span>
                      <span className="text-[10px] text-slate-400 line-clamp-1 block leading-tight">
                        {opt.desc}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selettore Intensità */}
          <div className="space-y-2 pt-1">
            <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
              <span>Intensità Intervento Grafico</span>
              <span className="text-[10px] text-slate-400 font-normal">
                {selectedIntensity === 'light'
                  ? 'Leggera: micro-aggiustamenti di contrasto e pixel'
                  : selectedIntensity === 'medium'
                  ? 'Media: bilanciamento ideale ingombri e layout'
                  : 'Decisa: riorganizzazione visiva e palette ad alto impatto'}
              </span>
            </label>

            <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
              {(['light', 'medium', 'strong'] as ArtDirectionIntensity[]).map((level) => {
                const isCurrent = selectedIntensity === level;
                const isRecommended = recommendedIntensity === level;
                const labels: Record<ArtDirectionIntensity, { title: string; subtitle: string }> = {
                  light: { title: 'Leggera', subtitle: 'Fine-tuning' },
                  medium: { title: 'Media', subtitle: 'Equilibrata' },
                  strong: { title: 'Decisa', subtitle: 'Audace' },
                };
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setSelectedIntensity(level)}
                    className={`py-2 px-2 rounded-xl text-center transition cursor-pointer flex flex-col items-center justify-center relative ${
                      isCurrent
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black shadow-sm'
                        : isRecommended
                        ? 'bg-slate-900/90 text-slate-300 border border-amber-500/30 hover:border-amber-500/50 hover:text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900 font-medium border border-transparent'
                    }`}
                  >
                    <span className="text-xs block">{labels[level].title}</span>
                    <span className="text-[9px] text-slate-500 block">{labels[level].subtitle}</span>
                    {isRecommended && (
                      <span className="text-[8px] font-mono px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 mt-1 font-bold">
                        Consigliata
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pulsante Primario + Azione Undo Storico */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 border-t border-slate-800/80">
            <div className="flex items-center gap-2">
              {onUndoStyle && (
                <button
                  type="button"
                  onClick={onUndoStyle}
                  disabled={!canUndoStyle}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
                  title={
                    canUndoStyle
                      ? "Ripristina l'ultimo stile grafico precedente (il testo resta invariato)"
                      : 'Nessuno stile precedente da annullare'
                  }
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Annulla ultimo stile</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleArtDirectionAction}
              disabled={isOptimizingWithGemini}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isOptimizingWithGemini ? 'animate-spin' : ''}`} />
              <span>{isOptimizingWithGemini ? 'Elaborazione Art Direction...' : 'Migliora grafica con Gemini'}</span>
            </button>
          </div>
        </div>

        {/* GESTIONE FOTO COMPLETA (UPLOAD, PRESET, ZOOM, FIT, OVERLAY, SMART LAYOUT) */}
        {currentLayout !== 'product_breakdown' && (
          <div onClick={(e) => e.stopPropagation()}>
            <SlideImageControlPanel
              imageUrl={slide.imageUrl}
              imageFit={slide.imageFit || 'cover'}
              imagePositionX={slide.imagePositionX ?? 50}
              imagePositionY={slide.imagePositionY ?? 50}
              imageZoom={slide.imageZoom ?? 1.0}
              imageOverlay={slide.imageOverlay ?? (slide.imageOpacity !== undefined ? Math.round((1 - slide.imageOpacity) * 100) : 0)}
              imageFocalPoint={slide.imageFocalPoint}
              visualCue={slide.visualCue}
              textAlign={slide.textAlign || 'left'}
              headline={slide.headline}
              onUpdateImageParams={(params) => {
                onChange({
                  ...slide,
                  ...params,
                });
              }}
              presetSampleImage={
                index === 0
                  ? {
                      label: 'Foto Squat Leve',
                      url: '/assets/squat_tall_athlete_cover.jpg',
                    }
                  : undefined
              }
            />
          </div>
        )}
      </div>

      {/* ─── 3. PANNELLO A SOFFIETTO: PERSONALIZZA STILE & DETTAGLI AVANZATI ─── */}
      <div className="pt-2 border-t border-slate-800/80" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={toggleStylePanel}
          className="w-full p-2.5 rounded-2xl bg-slate-950/70 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between text-xs font-bold text-slate-300 hover:text-white cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Personalizza Stile & Dettagli Avanzati</span>
            <span className="text-[10px] text-slate-500 font-normal">
              (Font, px, allineamento, citazioni, regia)
            </span>
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isStyleExpanded ? 'rotate-180 text-amber-400' : ''}`} />
        </button>

        {isStyleExpanded && (
          <div className="mt-3 p-4 bg-slate-950/90 rounded-2xl border border-slate-800 space-y-4 animate-in fade-in slide-in-from-top-2 duration-150">
            
            {/* TIPOGRAFIA & ALLINEAMENTO */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-amber-400" />
                  <span>Caratteri & Allineamento</span>
                </span>

                {/* Allineamento Testo */}
                <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-700 text-xs">
                  <button
                    type="button"
                    onClick={() => onChange({ ...slide, textAlign: 'left' })}
                    className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
                      (!slide.textAlign || slide.textAlign === 'left') ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-white'
                    }`}
                    title="Allinea a sinistra"
                  >
                    ◀
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange({ ...slide, textAlign: 'center' })}
                    className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
                      slide.textAlign === 'center' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-white'
                    }`}
                    title="Allinea al centro"
                  >
                    ⏺
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange({ ...slide, textAlign: 'right' })}
                    className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
                      slide.textAlign === 'right' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-white'
                    }`}
                    title="Allinea a destra"
                  >
                    ▶
                  </button>
                </div>
              </div>

              {/* Famiglie di Font */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400">Font Titoli</label>
                  <select
                    value={slide.titleFont || 'Inter'}
                    onChange={(e) => onChange({ ...slide, titleFont: e.target.value as TitleFontFamily })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="Bebas Neue">Bebas Neue (Impatto Alto)</option>
                    <option value="Montserrat">Montserrat (Geometrico)</option>
                    <option value="Outfit">Outfit (Bold Moderno)</option>
                    <option value="Inter">Inter (Tecnico Pulito)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400">Font Sottotitoli</label>
                  <select
                    value={slide.subtitleFont || 'Outfit'}
                    onChange={(e) => onChange({ ...slide, subtitleFont: e.target.value as SubtitleFontFamily })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-amber-200 cursor-pointer focus:outline-none focus:border-amber-500"
                  >
                    <option value="Outfit">Outfit</option>
                    <option value="Montserrat">Montserrat</option>
                    <option value="Bebas Neue">Bebas Neue</option>
                    <option value="Inter">Inter</option>
                    <option value="Roboto">Roboto</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400">Font Corpo / Dettagli</label>
                  <select
                    value={slide.bodyFont || 'Inter'}
                    onChange={(e) => onChange({ ...slide, bodyFont: e.target.value as BodyFontFamily })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 cursor-pointer focus:outline-none focus:border-amber-500"
                  >
                    <option value="Inter">Inter</option>
                    <option value="Roboto">Roboto</option>
                    <option value="Montserrat">Montserrat</option>
                    <option value="Outfit">Outfit</option>
                  </select>
                </div>
              </div>

              {/* Slider Grandezza Titolo in px (fino a 200px) */}
              <div className="space-y-1.5 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <label className="font-bold text-slate-300">Grandezza Titolo</label>
                    <div className="flex items-center gap-1">
                      {[52, 68, 80, 100].map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => onChange({ ...slide, titleFontSizePx: sz })}
                          className="px-1.5 py-0.2 rounded bg-slate-800 hover:bg-amber-500/20 text-[9px] text-amber-300/80 hover:text-amber-200 border border-slate-700/60 font-mono transition cursor-pointer"
                          title={`Imposta titolo a ${sz}px`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 font-mono">
                    <input
                      type="number"
                      min="20"
                      max="200"
                      value={slide.titleFontSizePx || (slide.titleSize === 'xl' ? 82 : slide.titleSize === 'lg' ? 72 : slide.titleSize === 'md' ? 62 : 52)}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) {
                          onChange({ ...slide, titleFontSizePx: Math.max(20, Math.min(200, val)) });
                        }
                      }}
                      className="w-14 px-1.5 py-0.5 bg-slate-950 border border-amber-500/50 rounded text-center text-amber-300 font-bold focus:outline-none focus:border-amber-400"
                    />
                    <span className="text-slate-500">px</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="24"
                  max="200"
                  step="2"
                  value={slide.titleFontSizePx || (slide.titleSize === 'xl' ? 82 : slide.titleSize === 'lg' ? 72 : slide.titleSize === 'md' ? 62 : 52)}
                  onChange={(e) => onChange({ ...slide, titleFontSizePx: parseInt(e.target.value, 10) })}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono">
                  <span>24px</span>
                  <span>72px (Standard Cover)</span>
                  <span>200px (Max Impatto)</span>
                </div>
              </div>

              {/* Slider Grandezza Sottotitolo in px */}
              <div className="space-y-1.5 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <label className="font-bold text-slate-300">Grandezza Sottotitolo</label>
                    <div className="flex items-center gap-1">
                      {[28, 34, 42, 52].map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => onChange({ ...slide, subtitleFontSizePx: sz })}
                          className="px-1.5 py-0.2 rounded bg-slate-800 hover:bg-amber-500/20 text-[9px] text-amber-300/80 hover:text-amber-200 border border-slate-700/60 font-mono transition cursor-pointer"
                          title={`Imposta sottotitolo a ${sz}px`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 font-mono">
                    <input
                      type="number"
                      min="16"
                      max="80"
                      value={slide.subtitleFontSizePx || 38}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) {
                          onChange({ ...slide, subtitleFontSizePx: Math.max(14, Math.min(80, val)) });
                        }
                      }}
                      className="w-12 px-1.5 py-0.5 bg-slate-950 border border-amber-500/50 rounded text-center text-amber-300 font-bold focus:outline-none focus:border-amber-400"
                    />
                    <span className="text-slate-500">px</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="16"
                  max="80"
                  step="1"
                  value={slide.subtitleFontSizePx || 38}
                  onChange={(e) => onChange({ ...slide, subtitleFontSizePx: parseInt(e.target.value, 10) })}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono">
                  <span>16px</span>
                  <span>38px (Standard Mobile)</span>
                  <span>80px (Grande)</span>
                </div>
              </div>

              {/* Slider Grandezza Corpo in px */}
              <div className="space-y-1.5 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <label className="font-bold text-slate-300">Grandezza Testo & Liste</label>
                    <div className="flex items-center gap-1">
                      {[26, 32, 36, 42].map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => onChange({ ...slide, bodyFontSizePx: sz })}
                          className="px-1.5 py-0.2 rounded bg-slate-800 hover:bg-purple-500/20 text-[9px] text-purple-300/80 hover:text-purple-200 border border-slate-700/60 font-mono transition cursor-pointer"
                          title={`Imposta corpo a ${sz}px`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 font-mono">
                    <input
                      type="number"
                      min="16"
                      max="56"
                      value={slide.bodyFontSizePx || (slide.bodyFontSize === 'lg' ? 40 : slide.bodyFontSize === 'sm' ? 28 : 34)}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) {
                          onChange({ ...slide, bodyFontSizePx: Math.max(14, Math.min(56, val)) });
                        }
                      }}
                      className="w-12 px-1.5 py-0.5 bg-slate-950 border border-purple-500/50 rounded text-center text-purple-300 font-bold focus:outline-none focus:border-purple-400"
                    />
                    <span className="text-slate-500">px</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="18"
                  max="52"
                  step="1"
                  value={slide.bodyFontSizePx || (slide.bodyFontSize === 'lg' ? 40 : slide.bodyFontSize === 'sm' ? 28 : 34)}
                  onChange={(e) => onChange({ ...slide, bodyFontSizePx: parseInt(e.target.value, 10) })}
                  className="w-full accent-purple-500 cursor-pointer"
                />
                <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono">
                  <span>18px (Minimo)</span>
                  <span>34px (Standard Mobile)</span>
                  <span>52px (Max Leggibilità)</span>
                </div>
              </div>

              {/* Spostamento Verticale Titolo & Testi (Offset Y) */}
              <div className="space-y-2.5 bg-slate-900/70 p-3 rounded-xl border border-amber-500/30">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                    <MoveVertical className="w-3.5 h-3.5 text-amber-400" /> Posizionamento Libero Verticale (Offset Y)
                  </span>
                  <span className="text-[9px] text-slate-400">Evita sovrapposizioni e sposta su / giù</span>
                </div>

                {/* Spostamento Titolo */}
                <div className="space-y-1 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-semibold text-slate-300">Posizione Titolo (Su / Giù)</span>
                    <div className="flex items-center gap-1">
                      {[-40, -20, 0, 20, 40].map((off) => (
                        <button
                          key={off}
                          type="button"
                          onClick={() => onChange({ ...slide, titleOffsetY: off })}
                          className={`px-1.5 py-0.2 rounded text-[9px] font-mono cursor-pointer transition ${
                            (slide.titleOffsetY || 0) === off
                              ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                              : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60'
                          }`}
                        >
                          {off > 0 ? `+${off}` : off}
                        </button>
                      ))}
                      <span className="font-mono font-bold text-amber-400 ml-1">
                        {(slide.titleOffsetY || 0) > 0 ? `+${slide.titleOffsetY}px` : `${slide.titleOffsetY || 0}px`}
                      </span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="-150"
                    max="150"
                    step="5"
                    value={slide.titleOffsetY || 0}
                    onChange={(e) => onChange({ ...slide, titleOffsetY: parseInt(e.target.value, 10) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <div className="flex items-center justify-between text-[8px] text-slate-500 font-mono">
                    <span>-150px (Più in alto)</span>
                    <span>0px (Default)</span>
                    <span>+150px (Più in basso)</span>
                  </div>
                </div>

                {/* Spostamento Corpo / Oggetto */}
                <div className="space-y-1 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-semibold text-slate-300">Posizione Testi / Corpo (Su / Giù)</span>
                    <div className="flex items-center gap-1">
                      {[-40, -20, 0, 20, 40].map((off) => (
                        <button
                          key={off}
                          type="button"
                          onClick={() => onChange({ ...slide, contentOffsetY: off })}
                          className={`px-1.5 py-0.2 rounded text-[9px] font-mono cursor-pointer transition ${
                            (slide.contentOffsetY || 0) === off
                              ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                              : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60'
                          }`}
                        >
                          {off > 0 ? `+${off}` : off}
                        </button>
                      ))}
                      <span className="font-mono font-bold text-purple-400 ml-1">
                        {(slide.contentOffsetY || 0) > 0 ? `+${slide.contentOffsetY}px` : `${slide.contentOffsetY || 0}px`}
                      </span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="-150"
                    max="150"
                    step="5"
                    value={slide.contentOffsetY || 0}
                    onChange={(e) => onChange({ ...slide, contentOffsetY: parseInt(e.target.value, 10) })}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                  <div className="flex items-center justify-between text-[8px] text-slate-500 font-mono">
                    <span>-150px (Più in alto)</span>
                    <span>0px (Default)</span>
                    <span>+150px (Più in basso)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* METADATI SCIENTIFICI, TAG & REGIA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-800">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-purple-400" /> Categoria Testata (■ Tag)
                </label>
                <input
                  type="text"
                  value={slide.categoryTag || ''}
                  onChange={(e) => onChange({ ...slide, categoryTag: e.target.value })}
                  placeholder="es. ■ FISIOLOGIA DELL'ALLENAMENTO"
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-purple-500/30 rounded-xl text-xs text-purple-200 focus:outline-none focus:border-purple-400 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                  <BookOpen className="w-3 h-3 text-amber-400" /> Fonte / Studio (PMID)
                </label>
                <input
                  type="text"
                  value={slide.citationSource || ''}
                  onChange={(e) => onChange({ ...slide, citationSource: e.target.value })}
                  placeholder="es. Pelland et al 2022: PMID 35247203"
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                  <Video className="w-3 h-3 text-purple-400" /> Cue Visivo / Regia Slide
                </label>
                <input
                  type="text"
                  value={slide.visualCue || ''}
                  onChange={(e) => onChange({ ...slide, visualCue: e.target.value })}
                  placeholder="es. Inquadratura con freccia rossa"
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                  <Hash className="w-3 h-3 text-amber-400" /> Numero Evidenza / Stat
                </label>
                <input
                  type="text"
                  value={slide.statNumber || ''}
                  onChange={(e) => onChange({ ...slide, statNumber: e.target.value })}
                  placeholder="es. 90% o +15kg"
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-amber-400 font-bold focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>

            {/* VISIBILITÀ NUMERO SLIDE IN ALTO A DESTRA */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <div className="space-y-0.5 min-w-0">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-amber-400" />
                  <span>Numero di Slide in alto a destra ({slide.order}/{totalSlides})</span>
                </span>
                <p className="text-[11px] text-slate-400">
                  {slide.showSlideNumber === false
                    ? 'Il numerino è attualmente rimosso da questa specifica slide.'
                    : 'Il numerino è visibile su questa slide (se abilitato a livello carosello).'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onChange({ ...slide, showSlideNumber: slide.showSlideNumber === false ? true : false })}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  slide.showSlideNumber !== false
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                    : 'bg-slate-950 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-900'
                }`}
              >
                <span>{slide.showSlideNumber !== false ? 'Mostra Numero' : 'Nascondi Numero'}</span>
              </button>
            </div>

            {/* CONTROLLI POSIZIONE IMMAGINE (SE FOTO PRESENTE) */}
            {slide.imageUrl && (
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <label className="text-[11px] font-bold text-slate-300">Posizione & Opacità Immagine</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { id: 'bottom_cutout', label: '⬇️ In Basso', desc: 'Taglio' },
                    { id: 'right_side', label: '➡️ A Destra', desc: 'Split' },
                    { id: 'top_half', label: '⬆️ In Alto', desc: 'Metà' },
                    { id: 'background_full', label: '🌌 Sfondo', desc: 'Full' },
                  ].map((pos) => (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() => onChange({ ...slide, imagePosition: pos.id as SlideImagePosition })}
                      className={`p-2 rounded-xl border text-left cursor-pointer transition text-xs ${
                        (slide.imagePosition || 'bottom_cutout') === pos.id
                          ? 'bg-amber-500/20 border-amber-500/70 text-amber-200 ring-1 ring-amber-500/30'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="font-bold block">{pos.label}</span>
                      <span className="text-[10px] text-slate-500">{pos.desc}</span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <span className="text-[11px] text-slate-400">Opacità:</span>
                  <input
                    type="range"
                    min="0.2"
                    max="1"
                    step="0.05"
                    value={slide.imageOpacity ?? 0.6}
                    onChange={(e) => onChange({ ...slide, imageOpacity: parseFloat(e.target.value) })}
                    className="flex-1 accent-amber-500 cursor-pointer"
                  />
                  <span className="text-[11px] font-mono text-amber-300">
                    {Math.round((slide.imageOpacity ?? 0.6) * 100)}%
                  </span>
                </div>
              </div>
            )}

            {/* LOGO WATERMARK DI SFONDO (PER QUALSIASI ALTRA SLIDE DEL CAROSELLO) */}
            {!(index === 0 || slide.type === 'cover' || ['dual_tone_cover', 'bold_center', 'text_center', 'final_cta'].includes(currentLayout)) && (
              <div className="pt-2 border-t border-slate-800 space-y-2.5 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={slide.showLogoWatermarkBg ?? false}
                      onChange={(e) => onChange({ ...slide, showLogoWatermarkBg: e.target.checked })}
                      className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                    <span>Logo AC in Background (Watermark)</span>
                  </label>
                  <span className="text-[10px] text-amber-400 font-mono font-bold">
                    {slide.showLogoWatermarkBg ? 'Attivo' : 'Disattivato'}
                  </span>
                </div>

                {slide.showLogoWatermarkBg && (
                  <div className="space-y-2.5 pt-1 border-t border-slate-800">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-slate-400">Stile Logo Sfondo</span>
                      <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                        <button
                          type="button"
                          onClick={() => onChange({ ...slide, logoWatermarkVariant: 'white' })}
                          className={`px-2 py-0.5 text-[10px] rounded font-bold transition-all cursor-pointer ${
                            slide.logoWatermarkVariant !== 'blue'
                              ? 'bg-slate-200 text-slate-950 shadow-sm'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Bianco
                        </button>
                        <button
                          type="button"
                          onClick={() => onChange({ ...slide, logoWatermarkVariant: 'blue' })}
                          className={`px-2 py-0.5 text-[10px] rounded font-bold transition-all cursor-pointer ${
                            slide.logoWatermarkVariant === 'blue'
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Cerchio Blu
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Opacità Sfondo</span>
                        <span className="font-mono text-amber-400 font-bold">
                          {Math.round((slide.logoWatermarkOpacity ?? (slide.logoWatermarkVariant === 'blue' ? 0.16 : 0.12)) * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="4"
                        max="45"
                        step="1"
                        value={Math.round((slide.logoWatermarkOpacity ?? (slide.logoWatermarkVariant === 'blue' ? 0.16 : 0.12)) * 100)}
                        onChange={(e) => onChange({ ...slide, logoWatermarkOpacity: Number(e.target.value) / 100 })}
                        className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-400"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
