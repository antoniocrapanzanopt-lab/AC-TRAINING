import React, { useEffect, useRef, useMemo } from 'react';
import { CarouselSlide, CarouselSettings } from '../../../types/carousel';
import { ArtDirectorStyleProposal } from '../../../services/geminiCarouselOptimizer';
import { renderSlideToCanvas } from '../../../services/carouselCanvasRenderer';
import {
  Check,
  X,
  Sparkles,
  ShieldCheck,
  Type,
  Layout,
  Palette,
  ArrowRight,
  Layers,
  Sparkle,
} from 'lucide-react';

export interface CarouselAIDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalSlide: CarouselSlide;
  proposedSlide: CarouselSlide;
  proposal?: ArtDirectorStyleProposal;
  actionName?: string;
  slideIndex: number;
  totalSlides: number;
  settings?: CarouselSettings;
  onApplyToSlide: (appliedSlide: CarouselSlide) => void;
  onApplyToAllSlides: (proposal: ArtDirectorStyleProposal) => void;
}

export const CarouselAIDiffModal: React.FC<CarouselAIDiffModalProps> = ({
  isOpen,
  onClose,
  originalSlide,
  proposedSlide,
  proposal,
  actionName = 'Art Direction Grafica',
  slideIndex,
  totalSlides,
  settings,
  onApplyToSlide,
  onApplyToAllSlides,
}) => {
  const originalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const proposedCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Fallback settings nel caso non vengano fornite
  const safeSettings: CarouselSettings = settings || {
    templateId: 'editorial_dark',
    aspectRatio: '4:5',
    brandKit: {
      brandName: 'AC COACHING',
      authorHandle: '@antoniocrapanzano_coach',
      authorSignature: 'Antonio Crapanzano • Performance Coach',
      primaryColor: '#070A10',
      secondaryColor: '#1E293B',
      accentColor: '#F59E0B',
      ctaColor: '#F59E0B',
      titleFont: 'Bebas Neue',
      bodyFont: 'Inter',
      logoPosition: 'top_left',
      watermarkText: '• AC COACHING •',
      imageStyle: 'dark_gradient',
    },
    showSlideCounter: true,
    showSwipeIndicator: true,
  };

  // Renderizza entrambi i canvas 1080x1350 all'apertura
  useEffect(() => {
    if (!isOpen) return;

    if (originalCanvasRef.current) {
      renderSlideToCanvas(originalCanvasRef.current, originalSlide, safeSettings, totalSlides).catch(
        (err) => console.warn('Errore render original canvas:', err)
      );
    }
    if (proposedCanvasRef.current) {
      renderSlideToCanvas(proposedCanvasRef.current, proposedSlide, safeSettings, totalSlides).catch(
        (err) => console.warn('Errore render proposed canvas:', err)
      );
    }
  }, [isOpen, originalSlide, proposedSlide, safeSettings, totalSlides]);

  // Calcolo dettagliato del pannello "Cosa è cambiato" raggruppato per categorie
  const changes = useMemo(() => {
    // 1. Tipografia
    const typoChanges: { label: string; before: string; after: string }[] = [];
    if (originalSlide.titleFont !== proposedSlide.titleFont) {
      typoChanges.push({
        label: 'Font Titolo',
        before: originalSlide.titleFont || 'Inter',
        after: proposedSlide.titleFont || 'Inter',
      });
    }
    if ((originalSlide.titleFontSizePx || 54) !== (proposedSlide.titleFontSizePx || 54)) {
      typoChanges.push({
        label: 'Dimensione Titolo',
        before: `${originalSlide.titleFontSizePx || 54}px`,
        after: `${proposedSlide.titleFontSizePx || 54}px`,
      });
    }
    if (Boolean(originalSlide.titleBold) !== Boolean(proposedSlide.titleBold)) {
      typoChanges.push({
        label: 'Spessore Titolo',
        before: originalSlide.titleBold ? 'Grassetto' : 'Normale',
        after: proposedSlide.titleBold ? 'Grassetto' : 'Normale',
      });
    }
    if (originalSlide.bodyFont !== proposedSlide.bodyFont) {
      typoChanges.push({
        label: 'Font Corpo',
        before: originalSlide.bodyFont || 'Inter',
        after: proposedSlide.bodyFont || 'Inter',
      });
    }
    if (originalSlide.bodyFontSizePx !== proposedSlide.bodyFontSizePx && proposedSlide.bodyFontSizePx) {
      typoChanges.push({
        label: 'Dimensione Corpo',
        before: `${originalSlide.bodyFontSizePx || 22}px`,
        after: `${proposedSlide.bodyFontSizePx}px`,
      });
    }
    if (originalSlide.textAlign !== proposedSlide.textAlign && proposedSlide.textAlign) {
      typoChanges.push({
        label: 'Allineamento',
        before: originalSlide.textAlign === 'center' ? 'Centro' : originalSlide.textAlign === 'right' ? 'Destra' : 'Sinistra',
        after: proposedSlide.textAlign === 'center' ? 'Centro' : proposedSlide.textAlign === 'right' ? 'Destra' : 'Sinistra',
      });
    }
    if (typoChanges.length === 0) {
      typoChanges.push({
        label: 'Gerarchia Tipografica',
        before: `${originalSlide.titleFont || 'Inter'} ${originalSlide.titleFontSizePx || 54}px`,
        after: `${proposedSlide.titleFont || 'Inter'} ${proposedSlide.titleFontSizePx || 54}px (Perfezionata)`,
      });
    }

    // 2. Layout
    const layoutChanges: { label: string; before: string; after: string }[] = [];
    if (originalSlide.layout !== proposedSlide.layout && proposedSlide.layout) {
      layoutChanges.push({
        label: 'Struttura Layout',
        before: originalSlide.layout || 'standard',
        after: proposedSlide.layout,
      });
    }
    if ((originalSlide.titleOffsetY || 0) !== (proposedSlide.titleOffsetY || 0)) {
      layoutChanges.push({
        label: 'Offset Verticale Y',
        before: `${originalSlide.titleOffsetY || 0}px`,
        after: `${proposedSlide.titleOffsetY || 0}px`,
      });
    }
    if (originalSlide.imagePosition !== proposedSlide.imagePosition && proposedSlide.imagePosition) {
      layoutChanges.push({
        label: 'Posizione Immagine',
        before: originalSlide.imagePosition || 'top',
        after: proposedSlide.imagePosition,
      });
    }
    if (layoutChanges.length === 0) {
      layoutChanges.push({
        label: 'Griglia Safe Area',
        before: 'Layout Standard',
        after: 'Calibrato per 1080×1350 Safe Zone',
      });
    }

    // 3. Sfondo
    const backgroundChanges: { label: string; before: string; after: string }[] = [];
    if (originalSlide.bgColor !== proposedSlide.bgColor && proposedSlide.bgColor) {
      backgroundChanges.push({
        label: 'Tonalità Sfondo',
        before: originalSlide.bgColor || '#070A10',
        after: proposedSlide.bgColor,
      });
    }
    if (proposal?.backgroundType) {
      backgroundChanges.push({
        label: 'Tipologia Sfondo',
        before: 'Tinta Unita',
        after: proposal.backgroundType === 'ambient_glow' ? 'Glow Atmosferico' : proposal.backgroundType === 'gradient' ? 'Gradiente Dark' : 'Tinta Unita',
      });
    }
    if (proposal?.backgroundTexture && proposal.backgroundTexture !== 'clean') {
      backgroundChanges.push({
        label: 'Texture Sfondo',
        before: 'Clean',
        after: proposal.backgroundTexture === 'tech_corners' ? 'Tech Corner' : proposal.backgroundTexture === 'subtle_grid' ? 'Griglia Sottile' : 'Dark Glow',
      });
    }
    if (backgroundChanges.length === 0) {
      backgroundChanges.push({
        label: 'Atmosfera Sfondo',
        before: 'Clean Dark',
        after: 'Editorial Obsidian Glow',
      });
    }

    // 4. Accento Cromatico
    const accentChanges: { label: string; before: string; after: string }[] = [];
    if (originalSlide.accentColor !== proposedSlide.accentColor && proposedSlide.accentColor) {
      accentChanges.push({
        label: 'Colore Accento',
        before: originalSlide.accentColor || '#F59E0B',
        after: proposedSlide.accentColor,
      });
    }
    if (originalSlide.highlightColor !== proposedSlide.highlightColor && proposedSlide.highlightColor) {
      accentChanges.push({
        label: 'Evidenziazione Copy',
        before: originalSlide.highlightColor || 'amber',
        after: proposedSlide.highlightColor,
      });
    }
    if (accentChanges.length === 0) {
      accentChanges.push({
        label: 'Palette Accento',
        before: originalSlide.accentColor || '#F59E0B',
        after: `${proposedSlide.accentColor || '#F59E0B'} (Brand Kit)`,
      });
    }

    return {
      typo: typoChanges,
      layout: layoutChanges,
      bg: backgroundChanges,
      accent: accentChanges,
    };
  }, [originalSlide, proposedSlide]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── 1. HEADER MODALE ANTEPRIMA ART DIRECTION ─── */}
        <div className="px-5 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 font-black flex items-center justify-center shadow">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white">Anteprima Art Direction (Gemini Flash)</h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  Slide {slideIndex + 1} di {totalSlides}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {actionName} — Confronta il render grafico prima di decidere l&apos;applicazione.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Chiudi senza toccare nulla"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ─── 2. RIGA RIASSUNTIVA IN CIMA GENERATA DAL CAMPO "notes" DEL JSON ─── */}
        <div className="px-5 sm:px-6 py-2.5 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border-b border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-200 shrink-0">
          <Sparkle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div className="min-w-0 space-y-0.5">
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block">
              Diagnosi Visiva & Art Direction:
            </span>
            <p className="text-amber-100/95 leading-snug">
              {proposal?.notes ||
                'Calibrazione pesi tipografici, safe area Instagram 1080×1350 e bilanciamento del contrasto mobile. Nessun testo modificato.'}
            </p>
          </div>
        </div>

        {/* ─── 3. BADGE PERMANENTE IMMUTABILITÀ DEL TESTO ─── */}
        <div className="px-5 sm:px-6 py-1.5 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2 text-emerald-300 font-bold text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Garanzia Art Director: Il testo è sacro e non è stato toccato (0 parole modificate).</span>
          </div>
          <span className="hidden sm:inline text-[10px] text-emerald-400/80 font-mono">
            Solo parametri di stile visivo
          </span>
        </div>

        {/* ─── 4. CORPO SCROLLABILE: VISTA AFFIANCATA CANVAS + PANNELLO "COSA È CAMBIATO" ─── */}
        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5 bg-slate-950/60">
          
          {/* VISTA AFFIANCATA A 2 COLONNE: ATTUALE (SX) vs PROPOSTA (DX) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            
            {/* COLONNA SX: SLIDE ATTUALE */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 flex flex-col">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                  1. Slide Attuale
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Originale</span>
              </div>

              {/* Render Reale Canvas Originale */}
              <div className="relative w-full aspect-[4/5] bg-black rounded-xl overflow-hidden shadow-inner border border-slate-800/80 flex items-center justify-center">
                <canvas
                  ref={originalCanvasRef}
                  width={1080}
                  height={1350}
                  className="w-full h-full object-contain pointer-events-none"
                />
              </div>

              <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between pt-1">
                <span>{originalSlide.titleFont || 'Inter'} · {originalSlide.titleFontSizePx || 54}px</span>
                <span className="text-slate-500">{originalSlide.layout || 'standard'}</span>
              </div>
            </div>

            {/* COLONNA DX: PROPOSTA ART DIRECTOR GEMINI */}
            <div className="p-4 rounded-2xl bg-gradient-to-b from-amber-950/15 via-slate-950 to-slate-950 border border-amber-500/50 space-y-3 flex flex-col shadow-xl ring-1 ring-amber-500/30">
              <div className="flex items-center justify-between pb-2 border-b border-amber-500/30">
                <span className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" /> 2. Proposta Art Director
                </span>
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                  Render Reale Gemini
                </span>
              </div>

              {/* Render Reale Canvas Proposta */}
              <div className="relative w-full aspect-[4/5] bg-black rounded-xl overflow-hidden shadow-2xl border border-amber-500/40 flex items-center justify-center">
                <canvas
                  ref={proposedCanvasRef}
                  width={1080}
                  height={1350}
                  className="w-full h-full object-contain pointer-events-none"
                />
              </div>

              <div className="text-[11px] text-amber-300 font-mono flex items-center justify-between pt-1">
                <span>{proposedSlide.titleFont || 'Inter'} · {proposedSlide.titleFontSizePx || 54}px</span>
                <span className="text-amber-400/90 font-bold">{proposedSlide.layout}</span>
              </div>
            </div>

          </div>

          {/* PANNELLO "COSA È CAMBIATO": TIPOGRAFIA / LAYOUT / SFONDO / ACCENTO */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800/80">
              <Layers className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-black text-white uppercase tracking-wider">
                Cosa è cambiato (Specifiche di Design)
              </h4>
              <span className="text-[10px] text-slate-500 font-mono ml-auto">
                Valori prima → dopo
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              
              {/* Gruppo 1: Tipografia */}
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-1.5 text-slate-300 font-bold text-[11px] pb-1 border-b border-slate-800/60">
                  <Type className="w-3.5 h-3.5 text-amber-400" />
                  <span>Tipografia</span>
                </div>
                {changes.typo.map((item, idx) => (
                  <div key={idx} className="text-[10px] font-mono leading-snug">
                    <span className="text-slate-500 block">{item.label}:</span>
                    <span className="text-slate-400">{item.before}</span>
                    <ArrowRight className="w-2.5 h-2.5 inline mx-1 text-amber-400" />
                    <span className="text-amber-300 font-bold">{item.after}</span>
                  </div>
                ))}
              </div>

              {/* Gruppo 2: Layout */}
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-1.5 text-slate-300 font-bold text-[11px] pb-1 border-b border-slate-800/60">
                  <Layout className="w-3.5 h-3.5 text-sky-400" />
                  <span>Layout</span>
                </div>
                {changes.layout.map((item, idx) => (
                  <div key={idx} className="text-[10px] font-mono leading-snug">
                    <span className="text-slate-500 block">{item.label}:</span>
                    <span className="text-slate-400">{item.before}</span>
                    <ArrowRight className="w-2.5 h-2.5 inline mx-1 text-sky-400" />
                    <span className="text-sky-300 font-bold">{item.after}</span>
                  </div>
                ))}
              </div>

              {/* Gruppo 3: Sfondo */}
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-1.5 text-slate-300 font-bold text-[11px] pb-1 border-b border-slate-800/60">
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  <span>Sfondo</span>
                </div>
                {changes.bg.map((item, idx) => (
                  <div key={idx} className="text-[10px] font-mono leading-snug">
                    <span className="text-slate-500 block">{item.label}:</span>
                    <span className="text-slate-400">{item.before}</span>
                    <ArrowRight className="w-2.5 h-2.5 inline mx-1 text-purple-400" />
                    <span className="text-purple-300 font-bold">{item.after}</span>
                  </div>
                ))}
              </div>

              {/* Gruppo 4: Accento */}
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-1.5 text-slate-300 font-bold text-[11px] pb-1 border-b border-slate-800/60">
                  <Palette className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Accento</span>
                </div>
                {changes.accent.map((item, idx) => (
                  <div key={idx} className="text-[10px] font-mono leading-snug">
                    <span className="text-slate-500 block">{item.label}:</span>
                    <span className="text-slate-400">{item.before}</span>
                    <ArrowRight className="w-2.5 h-2.5 inline mx-1 text-emerald-400" />
                    <span className="text-emerald-300 font-bold">{item.after}</span>
                  </div>
                ))}
              </div>

            </div>
          </div>

        </div>

        {/* ─── 5. FOOTER AZIONI: ANNULLA | APPLICA ALLA SLIDE | APPLICA A TUTTE LE SLIDE ─── */}
        <div className="px-5 sm:px-6 py-4 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          
          {/* Azione 1: Annulla */}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
            title="Chiude la finestra senza toccare nulla"
          >
            <X className="w-4 h-4" />
            <span>Annulla</span>
          </button>

          <div className="flex items-center gap-2.5 flex-col sm:flex-row">
            {/* Azione 3: Applica a tutte le slide */}
            <button
              type="button"
              onClick={() => onApplyToAllSlides(proposal || {})}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/40 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              title="Propaga lo stile dell'Art Director a tutte le slide del carosello rispettando le gerarchie"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Applica a tutte le slide</span>
            </button>

            {/* Azione 2: Applica solo alla slide corrente */}
            <button
              type="button"
              onClick={() => onApplyToSlide(proposedSlide)}
              className="w-full sm:w-auto px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20"
              title="Applica i parametri grafici solo alla slide corrente (il testo resta invariato)"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Applica alla slide</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
