import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Save,
  Video,
  Calendar,
  Flame,
  FileText,
  MessageSquare,
  Share2,
  Copy,
  Check,
  Sparkles,
  Layers,
  ChevronDown,
  Maximize2,
  Minimize2,
  Type,
  Play,
  Pause,
  Clock,
  SlidersHorizontal,
  Plus,
  RotateCcw,
  SplitSquareVertical,
  Hash,
  Smile,
} from 'lucide-react';
import {
  InstagramContent,
  ContentType,
  ContentPillar,
  ContentStatus,
} from '../../types/inboxAndContent';
import { InstagramCarousel } from '../../types/carousel';
import { useContents } from '../../context/ContentsContext';
import { useToast } from '../../context/ToastContext';
import { generateCarouselFromContent } from '../../services/carouselGeneratorService';

const CarouselStudioModal = React.lazy(() =>
  import('./carousel/CarouselStudioModal').then((m) => ({ default: m.CarouselStudioModal }))
);
const CarouselStructuredEditor = React.lazy(() =>
  import('./carousel/CarouselStructuredEditor').then((m) => ({ default: m.CarouselStructuredEditor }))
);

interface ContentDrawerEditorProps {
  isOpen: boolean;
  onClose: () => void;
  contentToEdit?: InstagramContent | null;
  initialData?: Partial<InstagramContent>;
}

const CONTENT_TYPES: { value: ContentType; label: string; icon: string; desc: string }[] = [
  { value: 'reel', label: 'Reel', icon: '🎬', desc: 'Video breve 9:16' },
  { value: 'story', label: 'Storia', icon: '📱', desc: 'Interazione 24h' },
  { value: 'carousel', label: 'Carosello', icon: '📑', desc: 'Post a schede 4:5' },
  { value: 'post', label: 'Post', icon: '🖼️', desc: 'Foto + Caption' },
];

const CONTENT_PILLARS: { value: ContentPillar; label: string }[] = [
  { value: 'technique_execution', label: '🏋️ Tecnica & Esecuzione' },
  { value: 'common_mistakes', label: '❌ Errori Comuni' },
  { value: 'mindset_discipline', label: '🧠 Mindset & Disciplina' },
  { value: 'nutrition_science', label: '🥗 Scienza della Nutrizione' },
  { value: 'client_transformation', label: '⭐ Trasformazioni Clienti' },
  { value: 'coaching_faq', label: '💬 Domande Frequenti (FAQ)' },
  { value: 'authority_lifestyle', label: '👑 Authority & Lifestyle' },
  { value: 'promotion_launch', label: '🚀 Promozione & Lanci' },
];

const CONTENT_STATUSES: { value: ContentStatus; label: string }[] = [
  { value: 'idea', label: '💡 Idee & Spunti' },
  { value: 'script_draft', label: '📝 Script in Bozza' },
  { value: 'ready_to_record', label: '🎬 Pronto da Registrare' },
  { value: 'recorded', label: '📹 Registrato' },
  { value: 'editing', label: '✂️ In Montaggio' },
  { value: 'ready_to_publish', label: '🚀 Pronto da Pubblicare' },
  { value: 'published', label: '✅ Pubblicato' },
  { value: 'repurpose', label: '♻️ Da Riutilizzare' },
];

const QUICK_HOOK_TEMPLATES = [
  'Se senti [Esercizio] su [Muscolo errato], fermati subito: stai facendo questo errore...',
  'Il 90% delle persone sbaglia [Esercizio] perché non conosce questa regola...',
  'Smetti di fare [Esercizio/Abitudine] se vuoi [Risultato desiderato]. Fai invece così...',
  '3 errori invisibili che ti impediscono di progredire su [Obiettivo]...',
];

const POPULAR_FITNESS_HASHTAGS = [
  '#allenamento',
  '#bodybuildingitalia',
  '#coachingonline',
  '#ipertrofia',
  '#biomeccanica',
  '#palestra',
  '#fitnessitalia',
  '#nutrizionesportiva',
];

const COMMON_EMOJIS = ['🔥', '💪', '🏋️', '❌', '✅', '🧠', '🥗', '📈', '🚀', '👇'];

const SCRIPT_TEMPLATES: Record<ContentType, string> = {
  reel: `1. Gancio visivo (0-3s): Mostra subito l'errore o il punto critico
2. Spiegazione rapida (4-15s): Perché questo compromette i risultati / provoca fastidio
3. Dimostrazione corretta (16-35s): Esecuzione guidata passo-passo con cue verbali
4. Ricapitolazione & CTA (36-45s): "Salva il video e applicalo nel prossimo allenamento"`,
  carousel: `Slide 1 (Copertina): Titolo forte + Immagine chiara del problema
Slide 2: Perché il metodo tradizionale fallisce
Slide 3: Il principio biomeccanico / nutrizionale corretto
Slide 4: Guida pratica applicabile in palestra
Slide 5: Esempio pratico / Tabella riassuntiva
Slide 6: CTA finale (Salva / Commenta per approfondire)`,
  story: `Storia 1: Sondaggio / Domanda per agganciare ("Ti capita mai di...?")
Storia 2: Spiegazione breve del perché succede
Storia 3: Consiglio pratico / Dimostrazione rapida
Storia 4: Box domande o invito ad andare in DM`,
  post: `Gancio iniziale (prima riga ad alto impatto)

Corpo del post: Spiegazione dettagliata con punti elenco per facilitare la lettura.

Call to Action finale.`,
};

type RightTabMode = 'script' | 'caption' | 'split';
type ScriptFontSize = 'sm' | 'base' | 'lg' | 'xl';
type ScriptFontFamily = 'sans' | 'mono';

const FONT_SIZE_CLASSES: Record<ScriptFontSize, { editor: string; label: string; px: string }> = {
  sm: { editor: 'text-xs leading-relaxed', label: 'Compatto', px: '12px' },
  base: { editor: 'text-sm leading-relaxed', label: 'Standard', px: '14px' },
  lg: { editor: 'text-base leading-relaxed', label: 'Grande', px: '16px' },
  xl: { editor: 'text-lg leading-loose', label: 'Leggibile', px: '18px' },
};

const FOCUS_FONT_SIZE_CLASSES: Record<ScriptFontSize, string> = {
  sm: 'text-base leading-relaxed',
  base: 'text-lg leading-relaxed',
  lg: 'text-xl leading-loose',
  xl: 'text-2xl leading-loose',
};

export const ContentDrawerEditor: React.FC<ContentDrawerEditorProps> = ({
  isOpen,
  onClose,
  contentToEdit,
  initialData,
}) => {
  const { createContent, updateContent } = useContents();
  const { showSuccess } = useToast();

  const [title, setTitle] = useState('');
  const [type, setType] = useState<ContentType>('reel');
  const [pillar, setPillar] = useState<ContentPillar>('technique_execution');
  const [status, setStatus] = useState<ContentStatus>('idea');
  const [hook, setHook] = useState('');
  const [scriptBody, setScriptBody] = useState('');
  const [caption, setCaption] = useState('');
  const [callToAction, setCallToAction] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [carouselData, setCarouselData] = useState<InstagramCarousel | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  // Modale Carousel Studio
  const [isCarouselStudioOpen, setIsCarouselStudioOpen] = useState(false);

  // Tab di visualizzazione colonna destra: 'script' | 'caption' | 'split'
  const [activeTab, setActiveTab] = useState<RightTabMode>('script');

  // Impostazioni di lettura e visualizzazione script
  const [fontSize, setFontSize] = useState<ScriptFontSize>('base');
  const [fontFamily, setFontFamily] = useState<ScriptFontFamily>('sans');
  const [isFocusMode, setIsFocusMode] = useState(false);

  // Teleprompter per la modalità Focus
  const [isTeleprompterActive, setIsTeleprompterActive] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState<number>(2); // 1 = lento, 2 = medio, 3 = rapido
  const focusScrollContainerRef = useRef<HTMLDivElement>(null);
  const teleprompterAnimationRef = useRef<number | null>(null);

  useEffect(() => {
    if (contentToEdit) {
      setTitle(contentToEdit.title || '');
      setType(contentToEdit.type || 'reel');
      setPillar(contentToEdit.pillar || 'technique_execution');
      setStatus(contentToEdit.status || 'idea');
      setHook(contentToEdit.hook || '');
      setScriptBody(contentToEdit.script_body || '');
      setCaption(contentToEdit.caption || '');
      setCallToAction(contentToEdit.call_to_action || '');
      setScheduledFor(contentToEdit.scheduled_for ? contentToEdit.scheduled_for.slice(0, 16) : '');
      setInternalNotes(contentToEdit.internal_notes || '');
      setCarouselData(contentToEdit.carousel_data || null);
    } else if (initialData) {
      setTitle(initialData.title || '');
      setType(initialData.type || 'reel');
      setPillar(initialData.pillar || 'technique_execution');
      setStatus(initialData.status || 'idea');
      setHook(initialData.hook || '');
      setScriptBody(initialData.script_body || '');
      setCaption(initialData.caption || '');
      setCallToAction(initialData.call_to_action || '');
      setScheduledFor(initialData.scheduled_for ? initialData.scheduled_for.slice(0, 16) : '');
      setInternalNotes(initialData.internal_notes || '');
      setCarouselData(initialData.carousel_data || null);
    } else {
      setTitle('');
      setType('reel');
      setPillar('technique_execution');
      setStatus('idea');
      setHook('');
      setScriptBody('');
      setCaption('');
      setCallToAction('');
      setScheduledFor('');
      setInternalNotes('');
      setCarouselData(null);
    }
  }, [contentToEdit, initialData, isOpen]);

  // Gestione Teleprompter Auto-Scroll in Focus Mode
  useEffect(() => {
    if (!isTeleprompterActive) {
      if (teleprompterAnimationRef.current) {
        cancelAnimationFrame(teleprompterAnimationRef.current);
        teleprompterAnimationRef.current = null;
      }
      return;
    }

    const scrollContainer = focusScrollContainerRef.current;
    if (!scrollContainer) return;

    let lastTimestamp = performance.now();
    const speedFactor = scrollSpeed === 1 ? 0.4 : scrollSpeed === 2 ? 0.8 : 1.4;

    const autoScroll = (currentTimestamp: number) => {
      const delta = currentTimestamp - lastTimestamp;
      lastTimestamp = currentTimestamp;

      if (scrollContainer) {
        scrollContainer.scrollTop += (delta * 0.05 * speedFactor);
        
        // Verifica fine scorrimento
        if (scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - 2) {
          setIsTeleprompterActive(false);
          return;
        }
      }

      teleprompterAnimationRef.current = requestAnimationFrame(autoScroll);
    };

    teleprompterAnimationRef.current = requestAnimationFrame(autoScroll);

    return () => {
      if (teleprompterAnimationRef.current) {
        cancelAnimationFrame(teleprompterAnimationRef.current);
      }
    };
  }, [isTeleprompterActive, scrollSpeed]);

  const handleSave = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim() || isSaving) return;

    setIsSaving(true);
    try {
      const payload: Partial<InstagramContent> = {
        title: title.trim(),
        type,
        pillar,
        status,
        hook: hook.trim() || null,
        script_body: scriptBody.trim() || null,
        caption: caption.trim() || null,
        call_to_action: callToAction.trim() || null,
        scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
        internal_notes: internalNotes.trim() || null,
        carousel_data: carouselData,
        origin_inbox_id: contentToEdit?.origin_inbox_id || initialData?.origin_inbox_id || null,
      };

      if (contentToEdit) {
        await updateContent(contentToEdit.id, payload);
      } else {
        await createContent(payload);
      }
      onClose();
    } catch {
      // Errore gestito nel context
    } finally {
      setIsSaving(false);
    }
  }, [title, isSaving, type, pillar, status, hook, scriptBody, caption, callToAction, scheduledFor, internalNotes, carouselData, contentToEdit, initialData, updateContent, createContent, onClose]);

  // Scorciatoia da tastiera: Cmd+S / Ctrl+S per salvare, Esc per chiudere focus
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if (e.key === 'Escape') {
        if (isFocusMode) {
          setIsTeleprompterActive(false);
          setIsFocusMode(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFocusMode, handleSave]);

  if (!isOpen) return null;

  // Calcoli metriche dello Script
  const trimmedScript = scriptBody.trim();
  const wordCount = trimmedScript ? trimmedScript.split(/\s+/).length : 0;
  // Velocità di parlato standard: ~130 parole al minuto (~2.1 parole al secondo)
  const readingSeconds = Math.round((wordCount / 130) * 60);
  const readingTimeFormatted = readingSeconds < 60 
    ? `~${readingSeconds}s` 
    : `~${Math.floor(readingSeconds / 60)}m ${readingSeconds % 60}s`;

  // Rilevamento automatico scene/slide
  const sceneMatches = scriptBody.match(/(?:(?:Slide|Scena|Storia|Punto)\s*\d+|\b\d+\.\s+)/gi);
  const sceneCount = sceneMatches ? sceneMatches.length : (trimmedScript ? 1 : 0);

  // Metriche Caption
  const trimmedCaption = caption.trim();
  const captionWords = trimmedCaption ? trimmedCaption.split(/\s+/).length : 0;

  const handleCopyCaption = () => {
    if (!caption) return;
    navigator.clipboard.writeText(caption);
    setCopiedCaption(true);
    showSuccess('Didascalia copiata negli appunti!');
    setTimeout(() => setCopiedCaption(false), 2000);
  };

  const handleCopyScript = () => {
    if (!scriptBody) return;
    navigator.clipboard.writeText(scriptBody);
    setCopiedScript(true);
    showSuccess('Script copiato negli appunti!');
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handleApplyScriptTemplate = () => {
    const template = SCRIPT_TEMPLATES[type];
    if (template) {
      setScriptBody((prev) => (prev ? `${prev}\n\n${template}` : template));
    }
  };

  const handleInsertSnippet = (snippetType: 'scene' | 'slide' | 'cue' | 'cta') => {
    if (snippetType === 'slide') {
      const nextSlideNum = sceneCount + 1;
      const snippet = `\n\nSlide ${nextSlideNum}: [Titolo Concetto]\n- Spiegazione chiara ed essenziale`;
      setScriptBody((prev) => `${prev.trimEnd()}${snippet}`);
    } else if (snippetType === 'scene') {
      const nextSceneNum = sceneCount + 1;
      const snippet = `\n\nScena ${nextSceneNum} ([0-0s]):\n- Azione visiva:\n- Audio parlato: `;
      setScriptBody((prev) => `${prev.trimEnd()}${snippet}`);
    } else if (snippetType === 'cue') {
      const snippet = `\n[🎬 CUE VISIVO: Inquadratura ravvicinata del movimento / Text overlay a schermo]`;
      setScriptBody((prev) => `${prev.trimEnd()}${snippet}`);
    } else if (snippetType === 'cta') {
      const snippet = `\n\nCTA: "Salva questo post e commenta '${type.toUpperCase()}' per ricevere la guida completa in DM!"`;
      setScriptBody((prev) => `${prev.trimEnd()}${snippet}`);
    }
  };

  const handleInsertHashtag = (tag: string) => {
    setCaption((prev) => (prev ? `${prev} ${tag}` : tag));
  };

  const handleInsertEmoji = (emoji: string) => {
    setCaption((prev) => `${prev}${emoji}`);
  };

  const cycleFontSize = () => {
    const sizes: ScriptFontSize[] = ['sm', 'base', 'lg', 'xl'];
    const currentIndex = sizes.indexOf(fontSize);
    const nextSize = sizes[(currentIndex + 1) % sizes.length];
    setFontSize(nextSize);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950 flex flex-col h-screen w-screen overflow-hidden animate-in fade-in duration-150"
      onClick={(e) => e.stopPropagation()}
    >
      {/* ─── 1. TOP HEADER STUDIO (FIXED HEIGHT) ─── */}
      <header className="h-16 px-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center justify-center shadow-md shadow-purple-500/10">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-white flex items-center gap-2">
              {contentToEdit ? 'Modifica Contenuto' : 'Nuovo Contenuto Instagram'}
              <span className="text-xs font-semibold text-slate-400 font-mono">
                • Creator Studio
              </span>
              {(contentToEdit?.origin_inbox_id || initialData?.origin_inbox_id) && (
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  Da Inbox AI ✨
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400 hidden sm:block">
              Ambiente a schermo intero con tab intelligenti per Script, Didascalia e Teleprompter
            </p>
          </div>
        </div>

        {/* HEADER ACTIONS */}
        <div className="flex items-center gap-2.5">
          {/* BOTTONE GENERA CAROSELLO INSTAGRAM (1080x1350) */}
          <button
            type="button"
            onClick={() => setIsCarouselStudioOpen(true)}
            title="Genera ed esporta Carosello Instagram 4:5 (1080x1350)"
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-purple-500/20 hover:from-amber-500/30 hover:to-purple-500/30 border border-amber-500/40 text-amber-300 text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-md"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Genera Carosello (1080×1350)</span>
            {carouselData?.slides && (
              <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-500/30 text-[10px] font-mono text-amber-200">
                {carouselData.slides.length} slide
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsFocusMode(true)}
            title="Apri Modalità Focus / Teleprompter a Schermo Intero"
            className="px-3.5 py-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5 text-purple-400" />
            <span>Teleprompter</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={!title.trim() || isSaving}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Salvataggio...' : contentToEdit ? 'Salva Modifiche' : 'Crea Contenuto'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            title="Chiudi editor"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ─── 2. MAIN WORKSPACE (FLEX-1, ZERO OVERFLOW OUTSIDE) ─── */}
      <main className="flex-1 min-h-0 p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
        
        {/* ─── COLONNA SINISTRA (5/12): SETUP, HOOK, CTA & PIANIFICAZIONE ─── */}
        <div className="lg:col-span-5 flex flex-col h-full min-h-0 space-y-4 overflow-y-auto custom-scrollbar pr-2">
          
          {/* TITOLO CONTENUTO */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>Titolo Contenuto / Idea *</span>
              <span className="text-[10px] text-slate-500 font-mono">{title.length} car.</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="es. Errore Stacco Rumeno: Cerniera vs Accosciata"
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700/80 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-bold tracking-tight shadow-inner"
            />
          </div>

          {/* SELETTORE FORMATO */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Formato Contenuto</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CONTENT_TYPES.map((t) => {
                const isActive = type === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isActive
                        ? 'bg-purple-500/20 border-purple-500 text-white shadow-md shadow-purple-500/10'
                        : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base">{t.icon}</span>
                      {isActive && <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />}
                    </div>
                    <div className="mt-1">
                      <span className="text-xs font-bold block">{t.label}</span>
                      <span className="text-[10px] text-slate-500 block truncate">{t.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* HOOK IN EVIDENZA (GIALLO ORO) */}
          <div className="space-y-2 p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/30 shadow-lg shadow-amber-500/5 relative">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-400" />
                Hook Iniziale (I primi 3 secondi)
              </label>
              <span className="text-[10px] text-amber-400/80 font-mono uppercase tracking-wider">Blocca-scroll</span>
            </div>
            
            <textarea
              rows={2}
              value={hook}
              onChange={(e) => setHook(e.target.value)}
              placeholder="es. Se senti lo stacco rumeno sui quadricipiti invece che sui glutei, fermati subito e guarda questo..."
              className="w-full px-3.5 py-2 bg-slate-950 border border-amber-500/40 rounded-xl text-xs text-amber-100 placeholder-amber-500/40 focus:outline-none focus:border-amber-400 resize-none font-medium leading-relaxed shadow-inner"
            />

            {/* QUICK HOOK TEMPLATES */}
            {!hook && (
              <div className="pt-1">
                <span className="text-[10px] font-bold text-slate-500 block mb-1">
                  💡 Suggerimenti per l'Hook:
                </span>
                <div className="space-y-1">
                  {QUICK_HOOK_TEMPLATES.map((tmpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setHook(tmpl)}
                      className="w-full text-left p-1.5 rounded-lg bg-slate-950/60 hover:bg-slate-900 border border-slate-800 text-[11px] text-slate-400 hover:text-amber-300 truncate transition cursor-pointer"
                    >
                      • {tmpl}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* CALL TO ACTION (CTA) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5 text-emerald-400" />
              Call to Action (CTA)
            </label>
            <input
              type="text"
              value={callToAction}
              onChange={(e) => setCallToAction(e.target.value)}
              placeholder="es. Salva il Reel e commenta 'STACCO' per ricevere la scheda completa in DM"
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium"
            />
          </div>

          {/* CARD PIANIFICAZIONE & METADATI */}
          <div className="p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800/90 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
              <span>Pianificazione & Dettagli Board</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* PILASTRO */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400">Pilastro Editoriale</label>
                <div className="relative">
                  <select
                    value={pillar}
                    onChange={(e) => setPillar(e.target.value as ContentPillar)}
                    className="w-full pl-3 pr-8 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-medium appearance-none cursor-pointer"
                  >
                    {CONTENT_PILLARS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* FASE PIPELINE */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400">Fase Pipeline</label>
                <div className="relative">
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ContentStatus)}
                    className="w-full pl-3 pr-8 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-medium appearance-none cursor-pointer"
                  >
                    {CONTENT_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* DATA PROGRAMMATA */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-amber-400" />
                  Data / Ora Pubblicazione
                </label>
                <input
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              {/* NOTE INTERNE */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-slate-400" />
                  Note Interne
                </label>
                <input
                  type="text"
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="es. Maglietta nera, luce ad anello"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ─── COLONNA DESTRA (7/12): STUDIO SCRITTURA CON TAB INTELLIGENTI A PIENA ALTEZZA ─── */}
        <div className="lg:col-span-7 flex flex-col h-full min-h-0 space-y-3">
          
          {/* TAB BAR SUPERIORE */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/90 border border-slate-800 p-1.5 rounded-2xl shrink-0">
            {/* TABS SELECTOR */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTab('script')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                  activeTab === 'script'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-md shadow-purple-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <FileText className="w-4 h-4 text-purple-400" />
                <span>Script & Scaletta Scene</span>
                {wordCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-md bg-slate-950 text-[10px] font-mono text-purple-300 border border-purple-500/20">
                    {wordCount} p.
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('caption')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                  activeTab === 'caption'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-md shadow-blue-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-blue-400" />
                <span>Caption & Didascalia Post</span>
                {captionWords > 0 && (
                  <span className="px-1.5 py-0.5 rounded-md bg-slate-950 text-[10px] font-mono text-blue-300 border border-blue-500/20">
                    {captionWords} p.
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('split')}
                title="Visualizza Script e Caption contemporaneamente"
                className={`p-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === 'split'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <SplitSquareVertical className="w-4 h-4" />
              </button>
            </div>

            {/* CONTROLLI DI FORMATTAZIONE CONDIVISI */}
            <div className="flex items-center gap-1.5">
              {/* Selettore Dimensione Testo */}
              <button
                type="button"
                onClick={cycleFontSize}
                title={`Dimensione testo: ${FONT_SIZE_CLASSES[fontSize].label} (${FONT_SIZE_CLASSES[fontSize].px}). Clicca per cambiare.`}
                className="px-2 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 flex items-center gap-1 transition cursor-pointer"
              >
                <Type className="w-3.5 h-3.5 text-purple-400" />
                <span>{FONT_SIZE_CLASSES[fontSize].px}</span>
              </button>

              {/* Toggle Sans / Mono */}
              <button
                type="button"
                onClick={() => setFontFamily((prev) => (prev === 'sans' ? 'mono' : 'sans'))}
                title={fontFamily === 'sans' ? 'Passa a font monospaziato' : 'Passa a font proporzionale (ad alta leggibilità)'}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  fontFamily === 'mono'
                    ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                    : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-400'
                }`}
              >
                {fontFamily === 'mono' ? 'Mono' : 'Sans'}
              </button>

              {/* Copia Rapida in base al tab attivo */}
              {activeTab === 'caption' ? (
                caption && (
                  <button
                    type="button"
                    onClick={handleCopyCaption}
                    className="px-3 py-1.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-xs font-bold text-blue-300 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    {copiedCaption ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCaption ? 'Copiata!' : 'Copia'}</span>
                  </button>
                )
              ) : (
                scriptBody && (
                  <button
                    type="button"
                    onClick={handleCopyScript}
                    className="px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-xs font-bold text-purple-300 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedScript ? 'Copiato!' : 'Copia'}</span>
                  </button>
                )
              )}
            </div>
          </div>

          {/* ─── TAB 1: SCRIPT STUDIO & SCALETTA SCENE (SEMPRE EDITABILE E SCORRIBILE) ─── */}
          {activeTab === 'script' && (
            <div className="flex-1 min-h-0 flex flex-col space-y-3">
              {/* BANNER CAROSELLO IN CIMA SE IL FORMATO È CAROSELLO */}
              {type === 'carousel' && (
                <React.Suspense
                  fallback={
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-center text-amber-400 text-xs">
                      <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mr-2" />
                      <span>Caricamento carosello...</span>
                    </div>
                  }
                >
                  <CarouselStructuredEditor
                    carousel={
                      carouselData ||
                      generateCarouselFromContent({
                        id: contentToEdit?.id,
                        title,
                        type,
                        pillar,
                        status,
                        hook,
                        script_body: scriptBody,
                        caption,
                        call_to_action: callToAction,
                        internal_notes: internalNotes,
                      })
                    }
                    onChange={(updated) => {
                      setCarouselData(updated);
                    }}
                    onOpenFullscreenStudio={() => setIsCarouselStudioOpen(true)}
                    contentTitle={title}
                  />
                </React.Suspense>
              )}

              {/* EDITOR DI TESTO SCALETTA & SCENE (SEMPRE VISIBILE E SCRIVIBILE) */}
              <div className="flex-1 min-h-0 flex flex-col bg-slate-900/60 border border-slate-800 rounded-2xl p-4 shadow-inner space-y-3 relative">
                
                {/* SUB-HEADER SCRIPT CON METRICHE & SNIPPET */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-300">
                      {type === 'carousel' ? 'Testo & Note Slide:' : 'Scaletta & Cues:'}
                    </span>
                    {wordCount > 0 && (
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                        <span className="bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 text-amber-300 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5 text-amber-400" />
                          {readingTimeFormatted} di parlato
                        </span>
                        <span className="bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20 text-purple-300">
                          🎬 {sceneCount} scene
                        </span>
                      </div>
                    )}
                  </div>

                  {/* HELPER RAPIDI INSERIMENTO SCENE & SCHEMI */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleInsertSnippet('scene')}
                      className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-[11px] font-medium flex items-center gap-1 transition cursor-pointer"
                    >
                      <Plus className="w-3 h-3 text-purple-400" />
                      Nuova Scena
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertSnippet('cue')}
                      className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-[11px] font-medium flex items-center gap-1 transition cursor-pointer"
                    >
                      <Plus className="w-3 h-3 text-amber-400" />
                      Cue Visivo
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertSnippet('cta')}
                      className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-[11px] font-medium flex items-center gap-1 transition cursor-pointer"
                    >
                      <Plus className="w-3 h-3 text-emerald-400" />
                      CTA Vocale
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyScriptTemplate}
                      className="text-[11px] font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer transition hover:underline ml-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      Schema {type.toUpperCase()}
                    </button>
                  </div>
                </div>

                {/* TEXTAREA DELLO SCRIPT A TUTTA ALTEZZA (PIENA VISIBILITÀ CONTINUA) */}
                <div className="relative flex-1 min-h-0 h-full">
                  <textarea
                    value={scriptBody}
                    onChange={(e) => setScriptBody(e.target.value)}
                    placeholder="1. Copertina / Gancio: Titolo forte e impatto visivo...&#10;2. Errore comune: Perché le ginocchia cedono all'interno...&#10;3. Correzione tecnica: Allineamento tibia e caviglia...&#10;4. Guida pratica: 3 step esecutivi...&#10;5. CTA: Salva il post per non dimenticarlo."
                    className={`w-full h-full min-h-0 px-4 py-3.5 bg-slate-950/95 border border-slate-700/90 focus:border-purple-500 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none resize-none editor-scrollbar shadow-inner ${
                      fontFamily === 'mono' ? 'font-mono' : 'font-sans'
                    } ${FONT_SIZE_CLASSES[fontSize].editor}`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB 2: CAPTION STUDIO A TUTTA ALTEZZA ─── */}
          {activeTab === 'caption' && (
            <div className="flex-1 min-h-0 flex flex-col bg-slate-900/60 border border-slate-800 rounded-2xl p-4 shadow-inner space-y-3 relative">
              
              {/* SUB-HEADER CAPTION CON HASHTAG & EMOJI RAPIDI */}
              <div className="space-y-2 pb-2 border-b border-slate-800/80 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-300">Didascalia Feed Instagram:</span>
                    {captionWords > 0 && (
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                        {captionWords} parole • {caption.length} caratteri
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                      <Smile className="w-3 h-3 text-amber-400" /> Emoji:
                    </span>
                    {COMMON_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleInsertEmoji(emoji)}
                        className="p-1 hover:bg-slate-800 rounded text-xs transition cursor-pointer"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* HASHTAG CLOUD RAPIDA */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                    <Hash className="w-3 h-3 text-blue-400" /> Hashtag rapidi:
                  </span>
                  {POPULAR_FITNESS_HASHTAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleInsertHashtag(tag)}
                      className="px-2 py-0.5 rounded-md bg-slate-950 hover:bg-blue-500/20 text-slate-400 hover:text-blue-300 border border-slate-800 text-[10px] font-mono transition cursor-pointer"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* TEXTAREA DELLA CAPTION A TUTTA ALTEZZA */}
              <div className="relative flex-1 min-h-0 h-full">
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Scrivi qui il testo completo della didascalia da pubblicare su Instagram:&#10;&#10;• Gancio iniziale accattivante&#10;• Spiegazione approfondita del concetto&#10;• Punti chiave pratici&#10;• Invito all'azione (CTA) finale&#10;• Hashtag pertinenti..."
                  className={`w-full h-full min-h-0 px-4 py-3.5 bg-slate-950/95 border border-slate-700/90 focus:border-blue-500 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none resize-none editor-scrollbar shadow-inner ${
                    fontFamily === 'mono' ? 'font-mono' : 'font-sans'
                  } ${FONT_SIZE_CLASSES[fontSize].editor}`}
                />
              </div>
            </div>
          )}

          {/* ─── TAB 3: VISTA DIVISA / SPLIT (SCRIPT IN ALTO + CAPTION IN BASSO) ─── */}
          {activeTab === 'split' && (
            <div className="flex-1 min-h-0 grid grid-rows-2 gap-3">
              
              {/* SCRIPT CARD (50%) */}
              <div className="flex flex-col bg-slate-900/60 border border-slate-800 rounded-2xl p-3 shadow-inner space-y-2 min-h-0">
                <div className="flex items-center justify-between shrink-0">
                  <label className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-purple-400" />
                    Script & Scaletta Scene
                  </label>
                  <span className="text-[10px] font-mono text-slate-400">{wordCount} parole</span>
                </div>
                <textarea
                  value={scriptBody}
                  onChange={(e) => setScriptBody(e.target.value)}
                  placeholder="Script e scaletta scene..."
                  className={`w-full flex-1 min-h-0 px-3 py-2 bg-slate-950/95 border border-slate-700/90 focus:border-purple-500 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none resize-none editor-scrollbar ${
                    fontFamily === 'mono' ? 'font-mono' : 'font-sans'
                  } ${FONT_SIZE_CLASSES[fontSize].editor}`}
                />
              </div>

              {/* CAPTION CARD (50%) */}
              <div className="flex flex-col bg-slate-900/60 border border-slate-800 rounded-2xl p-3 shadow-inner space-y-2 min-h-0">
                <div className="flex items-center justify-between shrink-0">
                  <label className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                    Caption / Didascalia Instagram
                  </label>
                  <span className="text-[10px] font-mono text-slate-400">{captionWords} parole</span>
                </div>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Caption e testo post..."
                  className={`w-full flex-1 min-h-0 px-3 py-2 bg-slate-950/95 border border-slate-700/90 focus:border-blue-500 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none resize-none editor-scrollbar ${
                    fontFamily === 'mono' ? 'font-mono' : 'font-sans'
                  } ${FONT_SIZE_CLASSES[fontSize].editor}`}
                />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ─── 3. BOTTOM FOOTER BAR (FIXED HEIGHT) ─── */}
      <footer className="h-14 px-6 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between shrink-0 z-20 backdrop-blur-md">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
        >
          Chiudi / Annulla
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsCarouselStudioOpen(true)}
            className="px-3.5 py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-bold rounded-xl text-xs border border-amber-500/30 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            Apri Studio Carosello
          </button>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={!title.trim() || isSaving}
            className="px-6 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Salvataggio...' : contentToEdit ? 'Salva Modifiche' : 'Crea Contenuto'}
          </button>
        </div>
      </footer>

      {/* ─── 4. MODALITÀ FOCUS / TELEPROMPTER A SCHERMO INTERO ─── */}
      {isFocusMode && (
        <div className="absolute inset-0 z-50 bg-slate-950/98 backdrop-blur-xl flex flex-col p-4 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
          
          {/* FOCUS HEADER & CONTROLS */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/80 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/40 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  {title || 'Senza Titolo'}
                  <span className="text-[11px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20 uppercase">
                    {type}
                  </span>
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span>{wordCount} parole</span>
                  <span>•</span>
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {readingTimeFormatted} di parlato
                  </span>
                  <span>•</span>
                  <span>{type === 'carousel' ? `${sceneCount} slide` : `${sceneCount} scene`}</span>
                </div>
              </div>
            </div>

            {/* TELEPROMPTER & VIEW CONTROLS */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Teleprompter Auto-Scroll Play/Pause */}
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setIsTeleprompterActive((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    isTeleprompterActive
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  {isTeleprompterActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-amber-400" />}
                  <span>{isTeleprompterActive ? 'Pausa' : 'Auto-Scroll'}</span>
                </button>

                {/* Velocità Scroll */}
                {isTeleprompterActive && (
                  <div className="flex items-center gap-1 px-1">
                    {([1, 2, 3] as const).map((spd) => (
                      <button
                        key={spd}
                        type="button"
                        onClick={() => setScrollSpeed(spd)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition ${
                          scrollSpeed === spd
                            ? 'bg-purple-500 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>
                )}

                {/* Reset scroll */}
                <button
                  type="button"
                  onClick={() => {
                    if (focusScrollContainerRef.current) {
                      focusScrollContainerRef.current.scrollTop = 0;
                    }
                  }}
                  title="Torna all'inizio dello script"
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Selettore Dimensione Testo Focus */}
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1 text-xs">
                <button
                  type="button"
                  onClick={cycleFontSize}
                  className="px-2.5 py-1 rounded-lg text-slate-300 hover:text-white flex items-center gap-1 font-bold cursor-pointer"
                >
                  <Type className="w-3 h-3 text-purple-400" />
                  <span>{FONT_SIZE_CLASSES[fontSize].px}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFontFamily((prev) => (prev === 'sans' ? 'mono' : 'sans'))}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                    fontFamily === 'mono' ? 'bg-purple-500/20 text-purple-300' : 'text-slate-400'
                  }`}
                >
                  {fontFamily === 'mono' ? 'Mono' : 'Sans'}
                </button>
              </div>

              {/* Copia Script */}
              {scriptBody && (
                <button
                  type="button"
                  onClick={handleCopyScript}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{copiedScript ? 'Copiato!' : 'Copia'}</span>
                </button>
              )}

              {/* Chiudi Focus Mode */}
              <button
                type="button"
                onClick={() => {
                  setIsTeleprompterActive(false);
                  setIsFocusMode(false);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Esci dal Focus</span>
              </button>
            </div>
          </div>

          {/* FOCUS SCRIPT AREA */}
          <div
            ref={focusScrollContainerRef}
            className="flex-1 overflow-y-auto max-w-4xl mx-auto w-full py-8 px-4 sm:px-8 editor-scrollbar min-h-0"
          >
            {/* Hook promemoria in alto */}
            {hook && (
              <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
                <span className="text-xs font-black text-amber-400 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                  <Flame className="w-4 h-4" /> Hook dei primi 3 secondi
                </span>
                <p className="text-sm font-semibold italic">"{hook}"</p>
              </div>
            )}

            {/* Textarea ad alto contrasto per teleprompter e scrittura focus */}
            <textarea
              value={scriptBody}
              onChange={(e) => setScriptBody(e.target.value)}
              placeholder="Inizia a scrivere o incollare qui lo script..."
              className={`w-full min-h-[60vh] bg-transparent border-none focus:outline-none text-slate-100 placeholder-slate-600 resize-none font-normal ${
                fontFamily === 'mono' ? 'font-mono' : 'font-sans'
              } ${FOCUS_FONT_SIZE_CLASSES[fontSize]}`}
            />
          </div>

          {/* FOCUS FOOTER RAPIDO */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500 max-w-4xl mx-auto w-full shrink-0">
            <span className="font-mono">Tip: Modifica il testo in tempo reale o premi Auto-Scroll per leggere a ritmo naturale</span>
            <button
              type="button"
              onClick={() => {
                setIsTeleprompterActive(false);
                setIsFocusMode(false);
              }}
              className="text-amber-400 font-bold hover:underline cursor-pointer"
            >
              Torna all'Editor Standard →
            </button>
          </div>
        </div>
      )}

      {/* ─── 5. STUDIO CAROSELLI INSTAGRAM MODALE FULLSCREEN (LAZY LOADED) ─── */}
      {isCarouselStudioOpen && (
        <React.Suspense
          fallback={
            <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
              <div className="flex flex-col items-center gap-3 text-amber-400">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-bold font-mono">Caricamento Studio Caroselli...</span>
              </div>
            </div>
          }
        >
          <CarouselStudioModal
            isOpen={isCarouselStudioOpen}
            onClose={() => setIsCarouselStudioOpen(false)}
            content={{
              id: contentToEdit?.id,
              title,
              type,
              pillar,
              status,
              hook,
              script_body: scriptBody,
              caption,
              call_to_action: callToAction,
              internal_notes: internalNotes,
              carousel_data: carouselData,
            }}
            onSaveCarousel={(updatedCarousel) => {
              setCarouselData(updatedCarousel);
            }}
          />
        </React.Suspense>
      )}
    </div>
  );
};
