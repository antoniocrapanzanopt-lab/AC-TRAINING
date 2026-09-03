import React from 'react';
import { CarouselSlide } from '../../../types/carousel';
import { Check, X, Sparkles, ArrowRight, ArrowLeftRight, Layers, FileText, Type } from 'lucide-react';

interface CarouselAIDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalSlide: CarouselSlide;
  proposedSlide: CarouselSlide;
  actionName: string;
  slideIndex: number;
  totalSlides: number;
  onApply: (appliedSlide: CarouselSlide) => void;
}

export const CarouselAIDiffModal: React.FC<CarouselAIDiffModalProps> = ({
  isOpen,
  onClose,
  originalSlide,
  proposedSlide,
  actionName,
  slideIndex,
  totalSlides,
  onApply,
}) => {
  if (!isOpen) return null;

  const originalWords = (originalSlide.headline + ' ' + (originalSlide.subheadline || '') + ' ' + (originalSlide.bodyText || '')).trim().split(/\s+/).filter(Boolean).length;
  const proposedWords = (proposedSlide.headline + ' ' + (proposedSlide.subheadline || '') + ' ' + (proposedSlide.bodyText || '')).trim().split(/\s+/).filter(Boolean).length;
  const wordsDiff = proposedWords - originalWords;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER MODALE */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-500 to-amber-500 text-slate-950 font-black flex items-center justify-center shadow">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white">Proposta Ottimizzata da Gemini 3.8 Flash</h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  Slide {slideIndex + 1} di {totalSlides}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Azione: <strong className="text-purple-300">{actionName}</strong> — Verifica le differenze prima di confermare.
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

        {/* METRICHE RAPIDE DIFF */}
        <div className="px-6 py-2 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span className="flex items-center gap-1.5">
            <ArrowLeftRight className="w-3.5 h-3.5 text-amber-400" />
            <span>Confronto Parole:</span>
            <span className="font-mono text-slate-300">{originalWords} p.</span>
            <ArrowRight className="w-3 h-3 text-slate-500" />
            <span className={`font-mono font-bold ${wordsDiff <= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {proposedWords} p. ({wordsDiff > 0 ? `+${wordsDiff}` : wordsDiff})
            </span>
          </span>

          <span className="text-[11px] text-slate-500 italic">
            Nessun contenuto verrà sovrascritto senza il tuo click su &quot;Applica&quot;.
          </span>
        </div>

        {/* CORPO CONFRONTO A DUE COLONNE */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto custom-scrollbar flex-1">
          {/* COLONNA 1: ORIGINALE */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Versione Attuale</span>
              <span className="text-[10px] text-slate-500 font-mono">Originale</span>
            </div>

            {/* Titolo */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                <Type className="w-3 h-3" /> Titolo
              </span>
              <p className="text-sm font-bold text-white bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                {originalSlide.headline}
              </p>
              {originalSlide.headlineHighlight && (
                <p className="text-xs font-bold text-amber-400 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                  ✨ {originalSlide.headlineHighlight}
                </p>
              )}
            </div>

            {/* Sottotitolo */}
            {originalSlide.subheadline && (
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Sottotitolo</span>
                <p className="text-xs text-slate-300 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                  {originalSlide.subheadline}
                </p>
              </div>
            )}

            {/* Corpo Testo */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                <FileText className="w-3 h-3" /> Corpo del Testo
              </span>
              <p className="text-xs text-slate-300 bg-slate-900/80 p-3 rounded-xl border border-slate-800 leading-relaxed whitespace-pre-line">
                {originalSlide.bodyText || <em className="text-slate-500">Nessun testo presente</em>}
              </p>
            </div>

            {/* Layout */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60 text-slate-400">
              <span className="flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" /> Layout:
              </span>
              <span className="font-mono text-slate-300">{originalSlide.layout || 'standard'}</span>
            </div>
          </div>

          {/* COLONNA 2: PROPOSTA AI */}
          <div className="p-4 rounded-2xl bg-gradient-to-b from-purple-950/20 to-slate-950 border border-purple-500/40 space-y-3.5 shadow-lg ring-1 ring-purple-500/20">
            <div className="flex items-center justify-between pb-2 border-b border-purple-500/30">
              <span className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Proposta Gemini 3.8
              </span>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                Ottimizzata
              </span>
            </div>

            {/* Titolo */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-purple-300 uppercase flex items-center gap-1">
                <Type className="w-3 h-3" /> Titolo Ottimizzato
              </span>
              <p className="text-sm font-bold text-white bg-slate-900 p-2.5 rounded-xl border border-purple-500/40">
                {proposedSlide.headline}
              </p>
              {proposedSlide.headlineHighlight && (
                <p className="text-xs font-bold text-amber-300 bg-amber-500/15 p-2 rounded-lg border border-amber-500/30">
                  ✨ {proposedSlide.headlineHighlight}
                </p>
              )}
            </div>

            {/* Sottotitolo */}
            {proposedSlide.subheadline && (
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-purple-300 uppercase">Sottotitolo</span>
                <p className="text-xs text-amber-200 bg-slate-900 p-2 rounded-lg border border-slate-700">
                  {proposedSlide.subheadline}
                </p>
              </div>
            )}

            {/* Corpo Testo */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-purple-300 uppercase flex items-center gap-1">
                <FileText className="w-3 h-3" /> Corpo Ottimizzato
              </span>
              <p className="text-xs text-slate-100 bg-slate-900 p-3 rounded-xl border border-purple-500/30 leading-relaxed whitespace-pre-line font-medium">
                {proposedSlide.bodyText || <em className="text-slate-500">Nessun testo generato</em>}
              </p>
            </div>

            {/* Bullet Points (se generati) */}
            {proposedSlide.bulletPoints && proposedSlide.bulletPoints.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-amber-400 uppercase">Punti Elenco Chiave</span>
                <ul className="text-xs text-slate-200 bg-slate-900 p-2.5 rounded-xl border border-amber-500/30 space-y-1">
                  {proposedSlide.bulletPoints.map((bp, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-amber-400 font-bold">•</span>
                      <span>{bp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Layout */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-purple-500/30 text-purple-200">
              <span className="flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-amber-400" /> Layout Consigliato:
              </span>
              <span className="font-mono text-amber-300 font-bold">{proposedSlide.layout}</span>
            </div>
          </div>
        </div>

        {/* FOOTER CON BOTTONI APPLICA O ANNULLA */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
          >
            <X className="w-4 h-4" />
            <span>Annulla e Mantieni Attuale</span>
          </button>

          <button
            type="button"
            onClick={() => onApply(proposedSlide)}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Applica Modifiche alla Slide</span>
          </button>
        </div>
      </div>
    </div>
  );
};
