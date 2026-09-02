import React, { useRef, useEffect } from 'react';
import {
  CarouselSlide,
  SlideType,
  SlideLayoutId,
  TitleFontFamily,
  BodyFontFamily,
  SlideImagePosition,
} from '../../../types/carousel';
import {
  ChevronUp,
  ChevronDown,
  Copy,
  Trash2,
  Sparkles,
  Image as ImageIcon,
  Plus,
  X,
  Tag,
  Hash,
  Video,
  AlertTriangle,
  Layout,
  Type,
  BookOpen,
  MessageSquare,
  GitBranch,
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
  onDuplicate: () => void;
  onDelete: () => void;
  onRegenerate: () => void;
  onGeminiOptimize?: () => void;
  isOptimizingWithGemini?: boolean;
  autoFocusTitle?: boolean;
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
  { value: 'text_left', label: 'Testo a Sinistra', icon: '◀️' },
  { value: 'final_cta', label: 'Box CTA Finale', icon: '🚀' },
];

export const CarouselSlideEditorCard: React.FC<CarouselSlideEditorCardProps> = ({
  slide,
  index,
  totalSlides,
  isSelected,
  onSelect,
  onChange,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  onRegenerate,
  onGeminiOptimize,
  isOptimizingWithGemini = false,
  autoFocusTitle = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const headlineInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-focus sul titolo della slide attiva
  useEffect(() => {
    if (isSelected && autoFocusTitle && headlineInputRef.current) {
      headlineInputRef.current.focus();
    }
  }, [index, isSelected, autoFocusTitle]);

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
  const totalWords = allText ? allText.split(/\s+/).length : 0;
  const isOverflowing = totalWords > 55 || totalChars > 360;

  const currentLayout: SlideLayoutId = slide.layout || (index === 0 ? 'text_center' : index === totalSlides - 1 ? 'final_cta' : 'numbered_list');

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onChange({
            ...slide,
            imageUrl: event.target.result as string,
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddBullet = () => {
    const bullets = slide.bulletPoints || [];
    onChange({
      ...slide,
      bulletPoints: [...bullets, 'Nuovo punto chiave...'],
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

  return (
    <div
      onClick={onSelect}
      className={`p-4 sm:p-5 rounded-3xl border transition-all duration-200 cursor-pointer relative space-y-4 ${
        isSelected
          ? 'bg-slate-900/95 border-amber-500/80 shadow-2xl shadow-amber-500/5 ring-1 ring-amber-500/30'
          : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900/40'
      }`}
    >
      {/* HEADER CARD: NUMERO SLIDE, TIPO, LAYOUT & AZIONI */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700 text-xs font-black font-mono text-white flex items-center gap-1">
            <span>Slide {index + 1} di {totalSlides}</span>
          </span>
          
          {/* Selettore Tipo Slide */}
          <select
            value={slide.type}
            onChange={(e) => onChange({ ...slide, type: e.target.value as SlideType })}
            onClick={(e) => e.stopPropagation()}
            className="px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            {SLIDE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          {/* Selettore Layout Slide */}
          <div className="flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-700" onClick={(e) => e.stopPropagation()}>
            <Layout className="w-3 h-3 text-amber-400" />
            <select
              value={currentLayout}
              onChange={(e) => onChange({ ...slide, layout: e.target.value as SlideLayoutId })}
              className="bg-transparent text-xs font-bold text-amber-300 focus:outline-none cursor-pointer"
            >
              {SLIDE_LAYOUTS.map((l) => (
                <option key={l.value} value={l.value} className="bg-slate-900 text-white">
                  {l.icon} {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* METRICHE CARATTERI & WARNING OVERFLOW */}
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border ${
              isOverflowing
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold animate-pulse'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
          >
            {totalChars} car. • {totalWords} p.
          </span>

          {/* PULSANTE GEMINI 3.7 FLASH & AZIONI SULLA SLIDE */}
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            {onGeminiOptimize && (
              <button
                type="button"
                onClick={onGeminiOptimize}
                disabled={isOptimizingWithGemini}
                className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-purple-600/30 via-amber-500/20 to-purple-600/30 hover:from-purple-600/40 hover:to-amber-500/30 text-amber-200 border border-amber-500/40 text-[11px] font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
                title="Migliora layout, impaginazione, font e posizionamento immagini con Gemini 3.7 Flash"
              >
                <Sparkles className={`w-3.5 h-3.5 text-amber-300 ${isOptimizingWithGemini ? 'animate-spin' : ''}`} />
                <span>{isOptimizingWithGemini ? 'Ottimizzazione...' : '⚡ Migliora con Gemini 3.7'}</span>
              </button>
            )}

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

            <button
              type="button"
              onClick={onRegenerate}
              title="Cambia layout rapido"
              className="p-1.5 rounded-lg text-slate-400 hover:text-purple-300 hover:bg-purple-500/15 transition cursor-pointer"
            >
              <Layout className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onDuplicate}
              title="Duplica slide"
              className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-slate-800 transition cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>

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
      </div>

      {/* BANNER WARNING OVERFLOW TESTO (NON BLOCCANTE) */}
      {isOverflowing && (
        <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>
            <strong>Attenzione leggibilità ({totalWords} parole):</strong> Consigliamo massimo 45-50 parole per garantire un'impaginazione pulita e leggibile da mobile.
          </span>
        </div>
      )}

      {/* 1. TIPOGRAFIA & DIMENSIONE ESATTA IN PIXEL (PX) */}
      <div className="p-3.5 bg-slate-950/90 rounded-2xl border border-slate-800 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5 text-amber-400" />
            <span>Personalizzazione Caratteri & Grandezza (px)</span>
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

        {/* FAMIGLIE DI FONT (TITOLO + CORPO) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Selettore Font Titoli */}
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

          {/* Selettore Font Corpo */}
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

        {/* REGOLAZIONE ESATTA IN PIXEL (PX) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
          {/* Grandezza Titolo in px */}
          <div className="space-y-1.5 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-[11px]">
              <label className="font-bold text-slate-300">Grandezza Titolo</label>
              <div className="flex items-center gap-1 font-mono">
                <input
                  type="number"
                  min="24"
                  max="96"
                  value={slide.titleFontSizePx || (slide.titleSize === 'xl' ? 64 : slide.titleSize === 'lg' ? 52 : slide.titleSize === 'md' ? 44 : 36)}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) {
                      onChange({ ...slide, titleFontSizePx: Math.max(20, Math.min(100, val)) });
                    }
                  }}
                  className="w-12 px-1.5 py-0.5 bg-slate-950 border border-amber-500/50 rounded text-center text-amber-300 font-bold focus:outline-none focus:border-amber-400"
                />
                <span className="text-slate-500">px</span>
              </div>
            </div>
            <input
              type="range"
              min="28"
              max="84"
              step="2"
              value={slide.titleFontSizePx || (slide.titleSize === 'xl' ? 64 : slide.titleSize === 'lg' ? 52 : slide.titleSize === 'md' ? 44 : 36)}
              onChange={(e) => onChange({ ...slide, titleFontSizePx: parseInt(e.target.value, 10) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono">
              <span>28px (Compatto)</span>
              <span>52px</span>
              <span>84px (Gigante)</span>
            </div>
          </div>

          {/* Grandezza Corpo in px */}
          <div className="space-y-1.5 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-[11px]">
              <label className="font-bold text-slate-300">Grandezza Testo & Liste</label>
              <div className="flex items-center gap-1 font-mono">
                <input
                  type="number"
                  min="16"
                  max="48"
                  value={slide.bodyFontSizePx || (slide.bodyFontSize === 'lg' ? 30 : slide.bodyFontSize === 'sm' ? 22 : 26)}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) {
                      onChange({ ...slide, bodyFontSizePx: Math.max(14, Math.min(50, val)) });
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
              max="40"
              step="1"
              value={slide.bodyFontSizePx || (slide.bodyFontSize === 'lg' ? 30 : slide.bodyFontSize === 'sm' ? 22 : 26)}
              onChange={(e) => onChange({ ...slide, bodyFontSizePx: parseInt(e.target.value, 10) })}
              className="w-full accent-purple-500 cursor-pointer"
            />
            <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono">
              <span>18px (Minimo)</span>
              <span>26px</span>
              <span>40px (Grande)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. TITOLO A 2 TONI (BIANCO + ACCENTO) */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-300">Titolo Slide (Riga 1 - Bianco) *</label>
        <input
          ref={headlineInputRef}
          type="text"
          value={slide.headline}
          onChange={(e) => onChange({ ...slide, headline: e.target.value })}
          placeholder="es. CEDIMENTO TECNICO (o NESSUNO CAMBIA)"
          className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-bold"
        />

        <div className="space-y-1">
          <label className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
            <span>✨ Testo Evidenziato / Riga 2 (Colore Accento)</span>
          </label>
          <input
            type="text"
            value={slide.headlineHighlight || ''}
            onChange={(e) => onChange({ ...slide, headlineHighlight: e.target.value })}
            placeholder="es. O MUSCOLARE? (o QUALCOSA DI NUOVO)"
            className="w-full px-3.5 py-2 bg-slate-950 border border-amber-500/40 rounded-xl text-xs text-amber-300 placeholder-amber-500/40 focus:outline-none focus:border-amber-400 font-bold"
          />
        </div>
      </div>

      {/* 2. SOTTOTITOLO / INTRO */}
      <div className="space-y-1">
        <label className="text-xs font-bold text-slate-400">Sottotitolo / Gancio Dati</label>
        <input
          type="text"
          value={slide.subheadline || ''}
          onChange={(e) => onChange({ ...slide, subheadline: e.target.value })}
          placeholder="es. VEDIAMO COSA MOSTRANO DAVVERO I DATI! (o Le persone cambiano quando:)"
          className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700/80 rounded-2xl text-xs text-amber-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
        />
      </div>

      {/* 3. CAMPI SPECIALI IN BASE AL LAYOUT */}
      {currentLayout === 'diagram_flow' ? (
        /* FLUSSO DIAGRAMMA (PREMESSA -> FRECCIA -> RISULTATO -> PUNCHLINE) */
        <div className="space-y-3 p-3.5 rounded-2xl bg-slate-950 border border-purple-500/30">
          <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5" />
            Configurazione Diagramma di Flusso
          </span>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400">Step 1 (Premessa)</label>
            <input
              type="text"
              value={slide.diagramStep1 || ''}
              onChange={(e) => onChange({ ...slide, diagramStep1: e.target.value })}
              placeholder="es. Non riuscire più a completare il compito stabilito (ROM o tecnica)"
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Step 2 (Definizione)</label>
              <input
                type="text"
                value={slide.diagramStep2 || ''}
                onChange={(e) => onChange({ ...slide, diagramStep2: e.target.value })}
                placeholder="es. Quello che viene definito:"
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-amber-400">Risultato Evidenziato</label>
              <input
                type="text"
                value={slide.diagramHighlightResult || ''}
                onChange={(e) => onChange({ ...slide, diagramHighlightResult: e.target.value })}
                placeholder="es. TASK FAILURE!"
                className="w-full px-3 py-1.5 bg-slate-900 border border-amber-500/50 rounded-xl text-xs text-amber-300 font-bold"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
              <MessageSquare className="w-3 h-3 text-amber-400" /> Pillola Coach / Transizione
            </label>
            <input
              type="text"
              value={slide.punchlineQuote || ''}
              onChange={(e) => onChange({ ...slide, punchlineQuote: e.target.value })}
              placeholder="es. ED È PROPRIO QUI CHE NASCE IL PRIMO EQUIVOCO..."
              className="w-full px-3 py-1.5 bg-slate-900 border border-amber-500/40 rounded-xl text-xs text-amber-200 font-bold"
            />
          </div>
        </div>
      ) : currentLayout === 'error_vs_correct' ? (
        /* ERRORE VS CORRETTO */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
          <div className="space-y-1">
            <label className="text-xs font-bold text-rose-400 flex items-center gap-1">
              <span>❌ Errore Comune</span>
            </label>
            <textarea
              rows={2}
              value={slide.wrongText || ''}
              onChange={(e) => onChange({ ...slide, wrongText: e.target.value })}
              placeholder="es. Curvare la schiena e strappare il carico all'inizio..."
              className="w-full px-3 py-2 bg-rose-500/5 border border-rose-500/30 rounded-xl text-xs text-rose-100 placeholder-rose-400/40 focus:outline-none focus:border-rose-400 resize-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-emerald-400 flex items-center gap-1">
              <span>✅ Correzione Ottimale</span>
            </label>
            <textarea
              rows={2}
              value={slide.correctText || ''}
              onChange={(e) => onChange({ ...slide, correctText: e.target.value })}
              placeholder="es. Spingere i piedi nel pavimento e attivare i dorsali..."
              className="w-full px-3 py-2 bg-emerald-500/5 border border-emerald-500/30 rounded-xl text-xs text-emerald-100 placeholder-emerald-400/40 focus:outline-none focus:border-emerald-400 resize-none"
            />
          </div>
        </div>
      ) : (
        /* CORPO TESTO STANDARD */
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-400">Corpo del Testo</label>
          <textarea
            rows={3}
            value={slide.bodyText}
            onChange={(e) => onChange({ ...slide, bodyText: e.target.value })}
            placeholder="Spiegazione chiara ed essenziale del concetto..."
            className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-2xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none leading-relaxed"
          />
        </div>
      )}

      {/* 4. PUNTI ELENCO / NODI CONNESSI */}
      {currentLayout !== 'error_vs_correct' && currentLayout !== 'diagram_flow' && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-400">
              {currentLayout === 'connected_icon_list' ? 'Nodi Connessi con Icone' : 'Punti Elenco (Bullet List)'}
            </label>
            <button
              type="button"
              onClick={handleAddBullet}
              className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-0.5 cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Aggiungi punto
            </button>
          </div>

          {slide.bulletPoints && slide.bulletPoints.length > 0 ? (
            <div className="space-y-2">
              {slide.bulletPoints.map((bullet, bIdx) => (
                <div key={bIdx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={bullet}
                    onChange={(e) => handleUpdateBullet(bIdx, e.target.value)}
                    placeholder="es. 🎯 sanno dove vogliono andare."
                    className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveBullet(bIdx)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-xs text-slate-500 italic block">Nessun punto elenco (opzionale)</span>
          )}
        </div>
      )}

      {/* 5. CATEGORIA TESTATA (■ FISIOLOGIA) & CITAZIONE SCIENTIFICA (PMID) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-purple-300 flex items-center gap-1">
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
            <BookOpen className="w-3 h-3 text-amber-400" /> Fonte / Citazione Studio (PMID)
          </label>
          <input
            type="text"
            value={slide.citationSource || ''}
            onChange={(e) => onChange({ ...slide, citationSource: e.target.value })}
            placeholder="es. Pelland et al 2022: PMID 35247203"
            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>
      </div>

      {/* 6. CUE VISIVO / REGIA & NUMERO EVIDENZA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-800/80">
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

      {/* 7. GESTIONE IMMAGINE & POSIZIONE PERSONALIZZABILE */}
      <div className="pt-3 border-t border-slate-800/80 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {slide.imageUrl ? (
              <div className="flex items-center gap-2">
                <img
                  src={slide.imageUrl}
                  alt="Slide preview"
                  className="w-10 h-10 rounded-xl object-cover border border-slate-700 shadow"
                />
                <div>
                  <span className="text-xs font-bold text-white block">Foto Caricata</span>
                  <button
                    type="button"
                    onClick={() => onChange({ ...slide, imageUrl: null })}
                    className="text-[11px] text-rose-400 hover:underline cursor-pointer"
                  >
                    Rimuovi
                  </button>
                </div>
              </div>
            ) : (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5 text-slate-600" /> Sfondo dinamico predefinito
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
              <span>{slide.imageUrl ? 'Sostituisci Foto' : 'Carica Foto'}</span>
            </button>
          </div>
        </div>

        {/* CONTROLLI POSIZIONE & OPACITÀ SE L'IMMAGINE È PRESENTE */}
        {slide.imageUrl && (
          <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80 space-y-3">
            {/* Selettore Posizione Immagine */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300">Posizione Immagine nella Slide</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {[
                  { id: 'bottom_cutout', label: '⬇️ In Basso', desc: 'Taglio / Soggetto' },
                  { id: 'right_side', label: '➡️ A Destra', desc: 'Split 50/50' },
                  { id: 'top_half', label: '⬆️ In Alto', desc: 'Metà Superiore' },
                  { id: 'background_full', label: '🌌 Sfondo Intero', desc: 'Full Bleed' },
                ].map((pos) => (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => onChange({ ...slide, imagePosition: pos.id as SlideImagePosition })}
                    className={`p-2 rounded-xl border text-left cursor-pointer transition text-xs ${
                      (slide.imagePosition || 'bottom_cutout') === pos.id
                        ? 'bg-amber-500/20 border-amber-500/70 text-amber-200 ring-1 ring-amber-500/30'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <span className="font-bold block">{pos.label}</span>
                    <span className="text-[9px] text-slate-500 block">{pos.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Slider Opacità Immagine */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-400">Opacità / Contrasto Foto</span>
                <span className="font-mono text-amber-300 font-bold">
                  {Math.round((slide.imageOpacity !== undefined ? slide.imageOpacity : 0.6) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={slide.imageOpacity !== undefined ? slide.imageOpacity : 0.6}
                onChange={(e) => onChange({ ...slide, imageOpacity: parseFloat(e.target.value) })}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
