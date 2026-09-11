import React, { useState, useEffect, useMemo } from 'react';
import { CarouselSlide } from '../../../types/carousel';
import { parseScriptToCarouselSlides, exportSlidesToScript } from '../../../services/carouselGeneratorService';
import { useToast } from '../../../context/ToastContext';
import {
  X,
  FileText,
  MessageSquare,
  Copy,
  Check,
  Plus,
  RefreshCw,
  Hash,
  Wand2,
  SplitSquareVertical,
  Type,
} from 'lucide-react';

interface CarouselTextEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentTitle?: string;
  scriptBody: string;
  onChangeScriptBody: (text: string) => void;
  caption: string;
  onChangeCaption: (text: string) => void;
  slides?: CarouselSlide[];
  onApplyDraftToSlides?: (parsedSlides: CarouselSlide[]) => void;
}

export const CarouselTextEditorModal: React.FC<CarouselTextEditorModalProps> = ({
  isOpen,
  onClose,
  contentTitle,
  scriptBody,
  onChangeScriptBody,
  caption,
  onChangeCaption,
  slides = [],
  onApplyDraftToSlides,
}) => {
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState<'script' | 'caption' | 'split'>('split');
  const [isCopiedScript, setIsCopiedScript] = useState(false);
  const [isCopiedCaption, setIsCopiedCaption] = useState(false);
  const [fontFamily, setFontFamily] = useState<'sans' | 'mono'>('sans');

  // Gestione tasto Esc per chiusura
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const scriptWordCount = useMemo(() => {
    return scriptBody.trim() ? scriptBody.trim().split(/\s+/).length : 0;
  }, [scriptBody]);

  const detectedSlideCount = useMemo(() => {
    if (!scriptBody.trim()) return 0;
    const matches = scriptBody.match(/(?:(?:Slide|Scena|Punto)\s*\d+|---)/gi);
    return matches ? Math.max(matches.length, 1) : 1;
  }, [scriptBody]);

  const captionWordCount = useMemo(() => {
    return caption.trim() ? caption.trim().split(/\s+/).length : 0;
  }, [caption]);

  const handleCopyScript = () => {
    if (!scriptBody) return;
    navigator.clipboard.writeText(scriptBody);
    setIsCopiedScript(true);
    showSuccess('Bozza testuale copiata negli appunti!');
    setTimeout(() => setIsCopiedScript(false), 2000);
  };

  const handleCopyCaption = () => {
    if (!caption) return;
    navigator.clipboard.writeText(caption);
    setIsCopiedCaption(true);
    showSuccess('Didascalia (caption) copiata negli appunti!');
    setTimeout(() => setIsCopiedCaption(false), 2000);
  };

  const handleInsertSlide = () => {
    const nextNum = Math.max(slides.length + 1, detectedSlideCount + 1);
    const addition = scriptBody.trim() ? `\n\n---\nSlide ${nextNum}\n` : `Slide 1\n`;
    onChangeScriptBody(scriptBody + addition);
  };

  const handleExtractFromSlides = () => {
    if (slides.length === 0) {
      showError('Nessuna slide grafica da cui estrarre il testo.');
      return;
    }
    const extracted = exportSlidesToScript(slides);
    onChangeScriptBody(extracted);
    showSuccess('Bozza testuale estratta con successo dalle slide attuali!');
  };

  const handleApplyDraft = () => {
    if (!scriptBody.trim()) {
      showError('Inserisci prima del testo nella bozza per generare le slide.');
      return;
    }
    const parsed = parseScriptToCarouselSlides(scriptBody, contentTitle || 'Nuovo Carosello');
    if (parsed.length === 0) {
      showError('Nessuna slide rilevata dal testo. Usa il formato "Slide 1\\nTitolo\\n---\\nSlide 2..."');
      return;
    }
    if (onApplyDraftToSlides) {
      onApplyDraftToSlides(parsed);
      showSuccess(`${parsed.length} slide create e collegate dalla bozza testuale!`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-6xl h-[90vh] bg-slate-950 border border-slate-800 rounded-3xl flex flex-col shadow-2xl overflow-hidden">
        
        {/* ─── 1. HEADER MODALE ─── */}
        <header className="px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-white tracking-tight">
                  Editor Bozza Testuale &amp; Caption
                </h2>
                {contentTitle && (
                  <span className="text-[11px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 max-w-[200px] truncate">
                    {contentTitle}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Scrivi o incolla il testo delle slide e la didascalia Instagram
              </p>
            </div>
          </div>

          {/* CONTROLLI VISTA AL CENTRO */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('split')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'split'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <SplitSquareVertical className="w-3.5 h-3.5" />
              <span>Affiancata (Bozza + Caption)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('script')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'script'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Solo Bozza Slide</span>
              {scriptWordCount > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-amber-400">
                  {scriptWordCount} p.
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('caption')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'caption'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Solo Caption</span>
              {captionWordCount > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-blue-300">
                  {captionWordCount} p.
                </span>
              )}
            </button>
          </div>

          {/* DESTRA: FONT TOGGLE & CHIUDI */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFontFamily((prev) => (prev === 'sans' ? 'mono' : 'sans'))}
              title={fontFamily === 'mono' ? 'Passa a Sans' : 'Passa a Monospazio'}
              className="px-2 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 flex items-center gap-1 transition cursor-pointer"
            >
              <Type className="w-3.5 h-3.5 text-amber-400" />
              <span>{fontFamily === 'mono' ? 'Mono' : 'Sans'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              title="Chiudi finestra (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* ─── 2. CORPO PRINCIPALE DELL'EDITOR ─── */}
        <div className="flex-1 min-h-0 p-4 sm:p-5 overflow-hidden">
          {activeTab === 'split' ? (
            /* VISTA AFFIANCATA: BOZZA A SINISTRA, CAPTION A DESTRA */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
              
              {/* COLONNA SINISTRA: BOZZA TESTO SLIDE */}
              <div className="flex flex-col h-full bg-slate-900/50 border border-slate-800 rounded-2xl p-4 shadow-inner min-h-0">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-amber-400" />
                      Bozza / Testo Slide
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                      {scriptWordCount} parole • {detectedSlideCount} slide
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleInsertSlide}
                      title="Aggiungi separatore nuova slide"
                      className="px-2 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Plus className="w-3 h-3 text-amber-400" />
                      <span>+ Slide</span>
                    </button>

                    {slides.length > 0 && !scriptBody.trim() && (
                      <button
                        type="button"
                        onClick={handleExtractFromSlides}
                        title="Estrai testo dalle slide grafiche"
                        className="px-2 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-amber-300 border border-slate-800 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Estrai</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleCopyScript}
                      disabled={!scriptBody.trim()}
                      className="px-2 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 disabled:opacity-40 text-slate-300 hover:text-white border border-slate-800 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      {isCopiedScript ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{isCopiedScript ? 'Copiato' : 'Copia'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex-1 min-h-0 pt-3">
                  <textarea
                    value={scriptBody}
                    onChange={(e) => onChangeScriptBody(e.target.value)}
                    placeholder={`Slide 1\nSEI ALTO E FAI FATICA A METTERE MASSA?\n---\nSlide 2\nSe sei alto più di 1,85 m, il cambiamento si percepisce più lentamente...\n---\nSlide 3\nL'ALTEZZA NON DESCRIVE LA TUA STRUTTURA\nDue uomini di 1,90 m possono avere una struttura molto diversa...\n---\nSlide 4\nNON USARE IL METRO DEGLI ALTRI\nNon devi aspettarti che 2 kg di massa cambino un fisico di 1,92 m nello stesso modo.`}
                    className={`w-full h-full p-4 bg-slate-950/90 border border-slate-800/90 focus:border-amber-500/80 rounded-xl text-slate-100 placeholder-slate-600 text-xs sm:text-sm leading-relaxed focus:outline-none resize-none transition custom-scrollbar shadow-inner ${
                      fontFamily === 'mono' ? 'font-mono' : 'font-sans'
                    }`}
                  />
                </div>
              </div>

              {/* COLONNA DESTRA: CAPTION & DIDASCALIA */}
              <div className="flex flex-col h-full bg-slate-900/50 border border-slate-800 rounded-2xl p-4 shadow-inner min-h-0">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                      Caption &amp; Didascalia
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                      {captionWordCount} parole • {caption.length} car.
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const tags = '\n\n#bodybuilding #ipertrofia #allenamento #biomeccanica #fitness';
                        onChangeCaption(caption + tags);
                      }}
                      className="px-2 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-blue-300 border border-slate-800 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Hash className="w-3 h-3" />
                      <span>+ Hashtag</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyCaption}
                      disabled={!caption.trim()}
                      className="px-2 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 disabled:opacity-40 text-slate-300 hover:text-white border border-slate-800 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      {isCopiedCaption ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{isCopiedCaption ? 'Copiata' : 'Copia'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex-1 min-h-0 pt-3">
                  <textarea
                    value={caption}
                    onChange={(e) => onChangeCaption(e.target.value)}
                    placeholder={`CAPTION\n\nSe sei alto più di 1,85 m e fai fatica a vedere cambiamenti, il problema spesso non è il muscolo che "non cresce"...\n\nNel POST di oggi ho messo in ordine i punti che uso quando analizzo atleti alti:\n• Perché il cambiamento sembra più lento\n• Perché l'altezza non descrive la tua struttura\n• Perché non puoi usare il metro degli altri\n\nSe vuoi che analizzi la tua struttura nel dettaglio, commenta "STRUTTURA" o scrivimi in DM.`}
                    className={`w-full h-full p-4 bg-slate-950/90 border border-slate-800/90 focus:border-blue-500/80 rounded-xl text-slate-100 placeholder-slate-600 text-xs sm:text-sm leading-relaxed focus:outline-none resize-none transition custom-scrollbar shadow-inner ${
                      fontFamily === 'mono' ? 'font-mono' : 'font-sans'
                    }`}
                  />
                </div>
              </div>
            </div>
          ) : activeTab === 'script' ? (
            /* VISTA SOLO BOZZA SLIDE A PIENO SCHERMO */
            <div className="flex flex-col h-full bg-slate-900/50 border border-slate-800 rounded-2xl p-4 shadow-inner min-h-0">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    Bozza / Testo Slide
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                    {scriptWordCount} parole • {detectedSlideCount} slide
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleInsertSlide}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-400" />
                    <span>Aggiungi Nuova Slide</span>
                  </button>

                  {slides.length > 0 && !scriptBody.trim() && (
                    <button
                      type="button"
                      onClick={handleExtractFromSlides}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Estrai da Slide Grafiche</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleCopyScript}
                    disabled={!scriptBody.trim()}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    {isCopiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopiedScript ? 'Copiato!' : 'Copia Testo'}</span>
                  </button>
                </div>
              </div>

              <div className="flex-1 min-h-0 pt-3">
                <textarea
                  value={scriptBody}
                  onChange={(e) => onChangeScriptBody(e.target.value)}
                  placeholder={`Slide 1\nSEI ALTO E FAI FATICA A METTERE MASSA?\n---\nSlide 2\nSe sei alto più di 1,85 m, il cambiamento si percepisce più lentamente...\n---\nSlide 3\nL'ALTEZZA NON DESCRIVE LA TUA STRUTTURA\nDue uomini di 1,90 m possono avere una struttura molto diversa...`}
                  className={`w-full h-full p-4 bg-slate-950/90 border border-slate-800/90 focus:border-amber-500/80 rounded-xl text-slate-100 placeholder-slate-600 text-sm leading-relaxed focus:outline-none resize-none transition custom-scrollbar shadow-inner ${
                    fontFamily === 'mono' ? 'font-mono' : 'font-sans'
                  }`}
                />
              </div>
            </div>
          ) : (
            /* VISTA SOLO CAPTION A PIENO SCHERMO */
            <div className="flex flex-col h-full bg-slate-900/50 border border-slate-800 rounded-2xl p-4 shadow-inner min-h-0">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                    Caption &amp; Didascalia Instagram
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                    {captionWordCount} parole • {caption.length} caratteri
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const tags = '\n\n#bodybuilding #ipertrofia #allenamento #biomeccanica #fitness';
                      onChangeCaption(caption + tags);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-blue-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Hash className="w-3.5 h-3.5" />
                    <span>Aggiungi Hashtag</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyCaption}
                    disabled={!caption.trim()}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    {isCopiedCaption ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopiedCaption ? 'Copiata!' : 'Copia Caption'}</span>
                  </button>
                </div>
              </div>

              <div className="flex-1 min-h-0 pt-3">
                <textarea
                  value={caption}
                  onChange={(e) => onChangeCaption(e.target.value)}
                  placeholder="Scrivi qui la didascalia (caption) per il post di Instagram..."
                  className={`w-full h-full p-4 bg-slate-950/90 border border-slate-800/90 focus:border-blue-500/80 rounded-xl text-slate-100 placeholder-slate-600 text-sm leading-relaxed focus:outline-none resize-none transition custom-scrollbar shadow-inner ${
                    fontFamily === 'mono' ? 'font-mono' : 'font-sans'
                  }`}
                />
              </div>
            </div>
          )}
        </div>

        {/* ─── 3. FOOTER MODALE ─── */}
        <footer className="px-5 py-3.5 bg-slate-900/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-mono flex items-center gap-2">
            <span>Usa <strong className="text-slate-400">---</strong> per separare le slide</span>
            <span>•</span>
            <span>Modifiche sincronizzate automaticamente</span>
          </div>

          <div className="flex items-center gap-2.5">
            {scriptBody.trim() && onApplyDraftToSlides && (
              <button
                type="button"
                onClick={handleApplyDraft}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black flex items-center gap-2 transition cursor-pointer shadow-md shadow-amber-500/20"
              >
                <Wand2 className="w-4 h-4" />
                <span>Applica Bozza a Slide Grafiche</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition cursor-pointer border border-slate-700"
            >
              Fatto / Chiudi
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
