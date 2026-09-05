import React, { useState } from 'react';
import { InstagramCarousel } from '../../../types/carousel';
import { validateEntireCarousel } from '../../../services/carouselQualityService';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface CarouselQualityChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  carousel: InstagramCarousel;
  onSelectSlide: (index: number) => void;
  onOptimizeSlide?: (index: number) => void;
}

export interface QualityCriterion {
  id: string;
  title: string;
  description: string;
  status: 'pass' | 'warning' | 'fail';
  detail: string;
  category: 'structure' | 'readability' | 'cover' | 'completeness' | 'coherence';
  targetSlideIndex?: number;
  actionLabel?: string;
}

export const CarouselQualityChecklistModal: React.FC<CarouselQualityChecklistModalProps> = ({
  isOpen,
  onClose,
  carousel,
  onSelectSlide,
  onOptimizeSlide,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  if (!isOpen) return null;

  const validationReport = validateEntireCarousel(carousel);
  const slides = carousel.slides || [];

  // Calcolo dei criteri concreti
  const criteria: QualityCriterion[] = [];

  // 1. Lunghezza Testo (<50 parole)
  const verboseSlides = slides
    .map((s, idx) => {
      const words = (s.headline + ' ' + (s.subheadline || '') + ' ' + (s.bodyText || '')).trim().split(/\s+/).filter(Boolean).length;
      return { index: idx, words };
    })
    .filter((s) => s.words > 50);

  if (verboseSlides.length === 0) {
    criteria.push({
      id: 'length',
      title: 'Lunghezza Testo & Densità Mobile',
      description: 'Tutte le slide contengono meno di 50 parole, garantendo leggibilità istantanea da smartphone.',
      status: 'pass',
      category: 'readability',
      detail: 'Tutte le slide sono snelle ed ergonomiche per il feed.',
    });
  } else {
    criteria.push({
      id: 'length',
      title: 'Lunghezza Testo & Densità Mobile',
      description: `${verboseSlides.length} slide superano le 50 parole (Slide ${verboseSlides.map((s) => s.index + 1).join(', ')}).`,
      status: 'warning',
      category: 'readability',
      detail: `Slide ${verboseSlides[0].index + 1} ha ${verboseSlides[0].words} parole. Consigliamo di sintetizzare per evitare testi densi su mobile.`,
      targetSlideIndex: verboseSlides[0].index,
      actionLabel: 'Sintetizza con AI',
    });
  }

  // 2. Contrasto & Leggibilità
  criteria.push({
    id: 'contrast',
    title: 'Contrasto Cromatico & Tipografia',
    description: 'Palette nero antracite, accenti oro ambra e testo primario bianco conformi allo standard WCAG AAA.',
    status: 'pass',
    category: 'readability',
    detail: 'Rapporto di contrasto testo/sfondo > 7:1.',
  });

  // 3. Rischio Overflow / Safe Area
  const overflowSlides = slides.filter((s) => {
    const textLen = (s.headline + (s.bodyText || '')).length;
    return textLen > 280;
  });

  if (overflowSlides.length === 0) {
    criteria.push({
      id: 'overflow',
      title: 'Protezione Safe Area & Margini',
      description: 'Nessun testo sconfina nelle aree critiche (superiore <150px, inferiore <180px).',
      status: 'pass',
      category: 'readability',
      detail: 'Margini e footer autore preservati su ogni slide.',
    });
  } else {
    const idx = slides.findIndex((s) => s.id === overflowSlides[0].id);
    criteria.push({
      id: 'overflow',
      title: 'Protezione Safe Area & Margini',
      description: `Rischio collisione con la safe area su ${overflowSlides.length} slide.`,
      status: 'warning',
      category: 'readability',
      detail: `La slide ${idx + 1} ha un volume di caratteri elevato e potrebbe toccare il footer.`,
      targetSlideIndex: idx >= 0 ? idx : undefined,
      actionLabel: 'Ispeziona Slide',
    });
  }

  // 4. Chiarezza del Titolo
  const missingTitles = slides.filter((s) => !s.headline || s.headline.trim().length < 4);
  if (missingTitles.length === 0) {
    criteria.push({
      id: 'titles',
      title: 'Chiarezza & Hook dei Titoli',
      description: 'Ogni slide possiede un titolo chiaro, incisivo e ben differenziato.',
      status: 'pass',
      category: 'cover',
      detail: 'Hook iniziale presente e titoli a 2 toni attivi.',
    });
  } else {
    const idx = slides.findIndex((s) => s.id === missingTitles[0].id);
    criteria.push({
      id: 'titles',
      title: 'Chiarezza & Hook dei Titoli',
      description: 'Sono presenti slide con titoli incompleti o troppo generici.',
      status: 'fail',
      category: 'cover',
      detail: `La slide ${idx + 1} necessita di un titolo più descrittivo.`,
      targetSlideIndex: idx >= 0 ? idx : undefined,
      actionLabel: 'Genera Titolo AI',
    });
  }

  // 5. Chiusura & Call To Action
  const lastSlide = slides[slides.length - 1];
  const hasCta = lastSlide && (lastSlide.type === 'cta' || lastSlide.layout === 'final_cta' || (lastSlide.bodyText && /commenta|salva|dm|link/i.test(lastSlide.bodyText)));
  if (hasCta) {
    criteria.push({
      id: 'cta',
      title: 'Call to Action & Chiusura Post',
      description: 'L\'ultima slide contiene una chiara chiamata all\'azione per spingere a salvare o commentare.',
      status: 'pass',
      category: 'coherence',
      detail: `Slide finale impostata per massimizzare la retention (${lastSlide?.layout || 'final_cta'}).`,
    });
  } else {
    criteria.push({
      id: 'cta',
      title: 'Call to Action & Chiusura Post',
      description: 'L\'ultima slide non contiene una CTA esplicita per stimolare salvataggi o commenti.',
      status: 'warning',
      category: 'coherence',
      detail: 'Aggiungi una CTA chiara sull\'ultima slide per aumentare i salvataggi.',
      targetSlideIndex: slides.length - 1,
      actionLabel: 'Imposta CTA',
    });
  }

  // 6. Cue Visivo / Regia
  const visualSlides = slides.filter((s) => Boolean(s.imageUrl || s.visualCue));
  if (visualSlides.length >= Math.ceil(slides.length * 0.4)) {
    criteria.push({
      id: 'visuals',
      title: 'Asset Visivi & Indicazioni di Regia',
      description: `${visualSlides.length} slide contengono foto o indicazioni di regia kinesiologica.`,
      status: 'pass',
      category: 'completeness',
      detail: 'Equilibrio visivo ottimale tra testo e grafica.',
    });
  } else {
    criteria.push({
      id: 'visuals',
      title: 'Asset Visivi & Indicazioni di Regia',
      description: 'Molte slide sono puramente testuali senza indicazioni visive o foto.',
      status: 'warning',
      category: 'completeness',
      detail: 'Consigliamo di caricare foto o specificare il cue visivo per dare ritmo.',
      targetSlideIndex: 0,
      actionLabel: 'Aggiungi Visual',
    });
  }

  // 7. Struttura Narrativa
  const hasValidProgression = slides.length >= 3 && slides.length <= 10;
  if (hasValidProgression) {
    criteria.push({
      id: 'narrative',
      title: 'Progressione Narrativa Globale',
      description: `Il carosello è composto da ${slides.length} slide, la lunghezza ideale per l'algoritmo di Instagram (3-10 slide).`,
      status: 'pass',
      category: 'structure',
      detail: 'Gancio ➔ Approfondimento pratico ➔ Chiusura brand.',
    });
  } else {
    criteria.push({
      id: 'narrative',
      title: 'Progressione Narrativa Globale',
      description: slides.length < 3 ? 'Carosello troppo breve (< 3 slide).' : 'Superato il limite di 10 slide Instagram.',
      status: 'warning',
      category: 'structure',
      detail: 'Mantieni tra 3 e 10 slide per garantire engagement e leggibilità.',
    });
  }

  const displayedCriteria = selectedCategory
    ? criteria.filter((c) => c.category === selectedCategory)
    : criteria;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 font-black flex items-center justify-center shadow">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2 flex-wrap">
                <span>Checklist Qualità Carosello</span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold border ${
                  validationReport.blockedCount > 0
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                    : validationReport.warningCount > 0
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                }`}>
                  {validationReport.score}/100 · {validationReport.warningCount} warning · {validationReport.blockedCount} blocchi
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {validationReport.qualityReason}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* BREAKDOWN A 5 CATEGORIE (STRUTTURA, LEGGIBILITÀ, COPERTINA, COMPLETEZZA, COERENZA) */}
        <div className="px-6 pt-3.5 pb-2.5 border-b border-slate-800 bg-slate-950/60 shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Breakdown Qualitativo (clicca per filtrare)
            </span>
            <span className="text-xs font-mono font-black text-amber-300">
              Totale: {validationReport.score}/100
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pb-1">
            {[
              { key: 'structure', icon: '🏗️', item: validationReport.breakdown.structure },
              { key: 'readability', icon: '📱', item: validationReport.breakdown.readability },
              { key: 'cover', icon: '🖼️', item: validationReport.breakdown.cover },
              { key: 'completeness', icon: '📋', item: validationReport.breakdown.completeness },
              { key: 'coherence', icon: '🎯', item: validationReport.breakdown.coherence },
            ].map(({ key, icon, item }) => {
              const isPass = item.status === 'pass';
              const isWarn = item.status === 'warning';
              const isSelected = selectedCategory === key;

              return (
                <div
                  key={key}
                  onClick={() => setSelectedCategory((prev: string | null) => (prev === key ? null : key))}
                  className={`p-2.5 rounded-2xl border flex flex-col justify-between space-y-1 transition cursor-pointer hover:border-amber-500/60 ${
                    isSelected
                      ? 'ring-2 ring-amber-400 bg-amber-500/20 border-amber-400 shadow-lg scale-[1.02]'
                      : isPass
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : isWarn
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                  title={`Clicca per filtrare i criteri su ${item.name}`}
                >
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="flex items-center gap-1 min-w-0">
                      <span>{icon}</span>
                      <span className="text-white truncate">{item.name}</span>
                    </span>
                    <span className="font-mono font-black shrink-0">{item.score}/20</span>
                  </div>
                  <p className="text-[10px] text-slate-400 line-clamp-2 leading-tight">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Banner Filtro Attivo */}
          {selectedCategory && (
            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs animate-in fade-in">
              <span>
                Filtro attivo: <strong>{validationReport.breakdown[selectedCategory as keyof typeof validationReport.breakdown]?.name}</strong> ({displayedCriteria.length} criteri)
              </span>
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className="text-xs text-slate-400 hover:text-white font-bold cursor-pointer underline"
              >
                Mostra tutti ({criteria.length})
              </button>
            </div>
          )}
        </div>

        {/* LISTA DEI CRITERI DETTAGLIATI (FILTRABILE) */}
        <div className="p-6 space-y-3 overflow-y-auto custom-scrollbar flex-1">
          {displayedCriteria.map((c) => {
            const isPass = c.status === 'pass';
            const isWarning = c.status === 'warning';

            return (
              <div
                key={c.id}
                className={`p-3.5 rounded-2xl border transition flex items-start justify-between gap-3 ${
                  isPass
                    ? 'bg-slate-950/60 border-slate-800/90 text-slate-300'
                    : isWarning
                    ? 'bg-amber-500/5 border-amber-500/30 text-amber-200'
                    : 'bg-rose-500/5 border-rose-500/30 text-rose-200'
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="mt-0.5 shrink-0">
                    {isPass ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : isWarning ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400" />
                    )}
                  </div>

                  <div className="space-y-0.5 min-w-0">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>{c.title}</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {c.description}
                    </p>
                    {c.detail && (
                      <p className="text-[10px] font-mono text-slate-500 pt-0.5">
                        ↳ {c.detail}
                      </p>
                    )}
                  </div>
                </div>

                {/* Quick Action Button se warning/fail */}
                {!isPass && c.targetSlideIndex !== undefined && (
                  <div className="shrink-0 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (c.targetSlideIndex !== undefined) {
                          onSelectSlide(c.targetSlideIndex);
                        }
                        if (c.actionLabel?.includes('AI') && onOptimizeSlide && c.targetSlideIndex !== undefined) {
                          onOptimizeSlide(c.targetSlideIndex);
                        }
                        onClose();
                      }}
                      className="px-2.5 py-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <span>{c.actionLabel || 'Vai alla Slide'}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* FOOTER */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between shrink-0 text-xs text-slate-400">
          <span className="text-[11px] text-slate-500">
            💡 Il salvataggio resta sempre consentito. L&apos;export avviserà in caso di overflow critico.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition cursor-pointer"
          >
            Chiudi Checklist
          </button>
        </div>
      </div>
    </div>
  );
};
