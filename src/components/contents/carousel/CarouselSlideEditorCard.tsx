import React, { useRef, useEffect, useState } from 'react';
import {
  CarouselSlide,
  SlideType,
  SlideLayoutId,
  TitleFontFamily,
  BodyFontFamily,
  SlideImagePosition,
} from '../../../types/carousel';
import {
  CAROUSEL_AI_OPERATIONS,
  CarouselAIOperationType,
} from '../../../services/geminiCarouselOptimizer';
import {
  ChevronLeft,
  ChevronRight,
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
  GitBranch,
  Sliders,
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
  onTriggerAIOperation?: (action: CarouselAIOperationType) => void;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
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
  onTriggerAIOperation,
  onNavigatePrev,
  onNavigateNext,
  isOptimizingWithGemini = false,
  autoFocusTitle = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const headlineInputRef = useRef<HTMLTextAreaElement | null>(null);
  const aiMenuRef = useRef<HTMLDivElement | null>(null);

  // Modalità Semplice di default con memoria di sessione
  const [isStyleExpanded, setIsStyleExpanded] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('carousel_style_expanded') === 'true';
    }
    return false;
  });

  const [isAIMenuOpen, setIsAIMenuOpen] = useState<boolean>(false);

  const toggleStylePanel = () => {
    setIsStyleExpanded((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('carousel_style_expanded', String(next));
      }
      return next;
    });
  };

  // Chiudi menu AI se si clicca fuori
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (aiMenuRef.current && !aiMenuRef.current.contains(e.target as Node)) {
        setIsAIMenuOpen(false);
      }
    };
    if (isAIMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isAIMenuOpen]);

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
  const totalWords = allText ? allText.split(/\s+/).filter(Boolean).length : 0;
  const isOverflowing = totalWords > 50 || totalChars > 340;

  const currentLayout: SlideLayoutId = slide.layout || (index === 0 ? 'dual_tone_cover' : index === totalSlides - 1 ? 'final_cta' : 'numbered_list');

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

  const executeAIOperation = (actionId: CarouselAIOperationType) => {
    setIsAIMenuOpen(false);
    if (onTriggerAIOperation) {
      onTriggerAIOperation(actionId);
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

          {/* MENU CONTESTUALE AI: "MIGLIORA QUESTA SLIDE" */}
          <div className="relative" ref={aiMenuRef}>
            <button
              type="button"
              onClick={() => setIsAIMenuOpen((prev) => !prev)}
              disabled={isOptimizingWithGemini}
              className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-purple-600/30 via-amber-500/20 to-purple-600/30 hover:from-purple-600/50 hover:to-amber-500/30 text-amber-200 border border-amber-500/40 text-[11px] font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
              title="Apri menu azioni AI Gemini 3.8 Flash per questa slide"
            >
              <Sparkles className={`w-3.5 h-3.5 text-amber-300 ${isOptimizingWithGemini ? 'animate-spin' : ''}`} />
              <span>{isOptimizingWithGemini ? 'Elaborazione...' : '✨ Migliora questa slide'}</span>
              <ChevronDown className="w-3 h-3 text-amber-400/80" />
            </button>

            {/* DROPDOWN DELLE 8 AZIONI CONTESTUALI */}
            {isAIMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-64 bg-slate-950 border border-slate-700/90 rounded-2xl shadow-2xl p-1.5 z-40 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="px-2 py-1 text-[10px] font-mono font-bold text-slate-400 border-b border-slate-800 flex items-center justify-between">
                  <span>Azioni Gemini 3.8 Flash</span>
                  <span className="text-amber-400 font-normal">Mostra diff prima</span>
                </div>

                <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-0.5">
                  {CAROUSEL_AI_OPERATIONS.map((op) => (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => executeAIOperation(op.id)}
                      className="w-full text-left p-2 rounded-xl hover:bg-slate-900 transition flex items-start gap-2 text-xs group cursor-pointer"
                    >
                      <span className="text-sm shrink-0 mt-0.5">{op.icon}</span>
                      <div className="min-w-0">
                        <span className="font-bold text-white group-hover:text-amber-300 block truncate">
                          {op.label}
                        </span>
                        <span className="text-[10px] text-slate-400 line-clamp-1 block">
                          {op.desc}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

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

      {/* BANNER WARNING OVERFLOW TESTO (NON BLOCCANTE) */}
      {isOverflowing && (
        <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              <strong>Attenzione leggibilità ({totalWords} parole):</strong> Consigliamo max 45-50 parole per garantire un&apos;impaginazione pulita e leggibile da mobile.
            </span>
          </div>
          <button
            type="button"
            onClick={() => executeAIOperation('reduce_text')}
            className="px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[10px] font-bold shrink-0 border border-amber-500/40 transition cursor-pointer"
          >
            Sintetizza con AI
          </button>
        </div>
      )}

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
            <label className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
              <Layout className="w-3 h-3 text-amber-400" /> Layout Visivo
            </label>
            <select
              value={currentLayout}
              onChange={(e) => onChange({ ...slide, layout: e.target.value as SlideLayoutId })}
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
            <label className="text-xs font-bold text-slate-300">Titolo Slide (Riga 1 - Bianco) *</label>
            <span className="text-[10px] text-amber-400/80 font-mono">↵ Premi Invio per andare a capo</span>
          </div>
          <textarea
            ref={headlineInputRef}
            rows={2}
            value={slide.headline}
            onChange={(e) => onChange({ ...slide, headline: e.target.value })}
            placeholder="es. CEDIMENTO TECNICO (premi Invio per spezzare le righe a piacere)"
            className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700/80 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-bold resize-y min-h-[56px] leading-relaxed"
          />

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                <span>✨ Testo Evidenziato / Riga 2 (Colore Accento)</span>
              </label>
              <span className="text-[10px] text-amber-400/70 font-mono">↵ Invio per a capo</span>
            </div>
            <textarea
              rows={1}
              value={slide.headlineHighlight || ''}
              onChange={(e) => onChange({ ...slide, headlineHighlight: e.target.value })}
              placeholder="es. O MUSCOLARE? (premi Invio per andare a capo)"
              className="w-full px-3.5 py-1.5 bg-slate-950 border border-amber-500/40 rounded-xl text-xs text-amber-300 placeholder-amber-500/40 focus:outline-none focus:border-amber-400 font-bold resize-y min-h-[42px] leading-relaxed"
            />
          </div>
        </div>

        {/* SOTTOTITOLO / INTRO */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-400">Sottotitolo / Gancio Dati</label>
            <span className="text-[10px] text-slate-500 font-mono">↵ Invio per a capo</span>
          </div>
          <textarea
            rows={2}
            value={slide.subheadline || ''}
            onChange={(e) => onChange({ ...slide, subheadline: e.target.value })}
            placeholder="es. VEDIAMO COSA MOSTRANO DAVVERO I DATI! (premi Invio per andare a capo)"
            className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700/80 rounded-2xl text-xs text-amber-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-y min-h-[50px] leading-relaxed"
          />
        </div>

        {/* CORPO DEL TESTO */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300">Corpo del Testo / Spiegazione</label>
            <span className="text-[10px] text-slate-500">Formattazione libera per mobile</span>
          </div>
          <textarea
            rows={3}
            value={slide.bodyText || ''}
            onChange={(e) => onChange({ ...slide, bodyText: e.target.value })}
            placeholder="Scrivi qui la spiegazione, le regole da seguire o l'approfondimento..."
            className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-2xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-y min-h-[75px] leading-relaxed"
          />
        </div>

        {/* ─── CAMPI SPECIFICI IN BASE AL LAYOUT ATTIVO ─── */}
        {currentLayout === 'diagram_flow' && (
          <div className="space-y-3 p-3.5 rounded-2xl bg-slate-950 border border-purple-500/30">
            <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5" /> Flusso Diagramma (Premessa ➔ Risultato)
            </span>
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
          </div>
        )}

        {currentLayout === 'error_vs_correct' && (
          <div className="space-y-2.5 p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <span>⚖️ Confronto Split: Errore vs Correzione Ottimale</span>
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <textarea
                rows={2}
                value={slide.wrongText || ''}
                onChange={(e) => onChange({ ...slide, wrongText: e.target.value })}
                placeholder="❌ Errore da evitare..."
                className="w-full px-2.5 py-1.5 bg-rose-950/20 border border-rose-500/40 rounded-xl text-xs text-rose-200 placeholder-rose-500/40 resize-y"
              />
              <textarea
                rows={2}
                value={slide.correctText || ''}
                onChange={(e) => onChange({ ...slide, correctText: e.target.value })}
                placeholder="✅ Correzione biomeccanica ottimale..."
                className="w-full px-2.5 py-1.5 bg-emerald-950/20 border border-emerald-500/40 rounded-xl text-xs text-emerald-200 placeholder-emerald-500/40 resize-y"
              />
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
              <button
                type="button"
                onClick={handleAddBullet}
                className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Aggiungi punto
              </button>
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

        {/* GESTIONE FOTO RAPIDA */}
        <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-2xl border border-slate-800" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2.5 min-w-0">
            {slide.imageUrl ? (
              <div className="flex items-center gap-2">
                <img
                  src={slide.imageUrl}
                  alt="Slide preview"
                  className="w-9 h-9 rounded-xl object-cover border border-slate-700 shadow"
                />
                <div>
                  <span className="text-xs font-bold text-white block">Foto Caricata</span>
                  <button
                    type="button"
                    onClick={() => onChange({ ...slide, imageUrl: null })}
                    className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                  >
                    Rimuovi
                  </button>
                </div>
              </div>
            ) : (
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-slate-500" /> Sfondo dinamico predefinito
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                      {[44, 84, 120, 200].map((sz) => (
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
                      value={slide.titleFontSizePx || (slide.titleSize === 'xl' ? 64 : slide.titleSize === 'lg' ? 52 : slide.titleSize === 'md' ? 44 : 36)}
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
                  value={slide.titleFontSizePx || (slide.titleSize === 'xl' ? 64 : slide.titleSize === 'lg' ? 52 : slide.titleSize === 'md' ? 44 : 36)}
                  onChange={(e) => onChange({ ...slide, titleFontSizePx: parseInt(e.target.value, 10) })}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono">
                  <span>24px (Compatto)</span>
                  <span>100px</span>
                  <span>200px (Max Impatto)</span>
                </div>
              </div>

              {/* Slider Grandezza Corpo in px */}
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
          </div>
        )}
      </div>
    </div>
  );
};
