import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  InstagramStory,
  InstagramStorySequence,
  StoryStatus,
} from '../../../types/story';
import { InstagramCarousel } from '../../../types/carousel';
import {
  generateStoriesWithGemini,
} from '../../../services/geminiStoryOptimizer';
import {
  exportFullStorySequenceZip,
} from '../../../services/storyExportService';
import { renderStoryToCanvas } from '../../../services/storyCanvasRenderer';
import {
  validateEntireStorySequence,
} from '../../../services/storyQualityService';
import { useToast } from '../../../context/ToastContext';
import {
  Maximize2,
  Sparkles,
  Download,
  FileArchive,
  Plus,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronUp,
  Loader2,
  Layers,
} from 'lucide-react';

interface StoryStructuredEditorProps {
  storySequence: InstagramStorySequence | null;
  onChange: (updatedSequence: InstagramStorySequence) => void;
  onOpenFullscreenStudio: (storyIndex?: number) => void;
  contentTitle?: string;
  scriptBody?: string;
  hook?: string;
  cta?: string;
  carouselData?: InstagramCarousel | null;
}

const STATUS_LABELS: Record<StoryStatus, { label: string; color: string }> = {
  not_generated: { label: 'Non Generato', color: 'bg-slate-800 text-slate-400 border-slate-700' },
  sequence_ready: { label: 'Sequenza Pronta', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  processing: { label: 'In Elaborazione', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse' },
  draft: { label: 'Bozza', color: 'bg-slate-800 text-slate-300 border-slate-700' },
  needs_review: { label: 'Da Rivedere', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  ready: { label: 'Pronta per Pubblicazione', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  exported: { label: 'Esportata', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
};

export const StoryStructuredEditor: React.FC<StoryStructuredEditorProps> = ({
  storySequence,
  onChange,
  onOpenFullscreenStudio,
  contentTitle,
  scriptBody,
  hook,
  cta,
}) => {
  const { showSuccess, showError } = useToast();
  const miniCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [exportProgress, setExportProgress] = useState('');
  const [expandedStoryIndex, setExpandedStoryIndex] = useState<number | null>(0);
  const [showAiPresetMenu, setShowAiPresetMenu] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const stories = storySequence?.stories || [];
  const hasStories = stories.length > 0;
  const firstStory = stories[0];

  // Calcolo qualità sequenza
  const sequenceQuality = useMemo(() => {
    if (!storySequence || stories.length === 0) {
      return { score: 0, warningCount: 0, blockedCount: 0, canExport: false };
    }
    return validateEntireStorySequence(storySequence);
  }, [storySequence, stories.length]);

  // Stato dinamico della sequenza
  const sequenceStatus: StoryStatus = useMemo(() => {
    if (!hasStories) return 'not_generated';
    if (storySequence?.status === 'exported') return 'exported';
    if (sequenceQuality.blockedCount > 0) return 'needs_review';
    if (sequenceQuality.canExport) return 'ready';
    return storySequence?.status || 'sequence_ready';
  }, [hasStories, storySequence?.status, sequenceQuality]);

  const currentStatusConfig = STATUS_LABELS[sequenceStatus] || STATUS_LABELS.draft;

  // Render miniatura Story 01
  useEffect(() => {
    if (firstStory && storySequence?.settings && miniCanvasRef.current) {
      renderStoryToCanvas(miniCanvasRef.current, firstStory, storySequence.settings, {
        totalStories: stories.length,
        currentStoryIndex: 0,
        showSafeArea: false,
        showIgMockup: false,
      });
    }
  }, [firstStory, storySequence?.settings, stories.length]);

  // 1. GENERATORE CON AI (3, 5, 7 STORIES) CON GOOGLE GEMINI 3.8 FLASH
  const handleGenerateAI = async (count: 3 | 5 | 7 = 5) => {
    setIsGeneratingAi(true);
    try {
      const fresh = await generateStoriesWithGemini({
        title: contentTitle || 'Storia Instagram',
        scriptBody,
        hook,
        cta,
        targetCount: count,
        templateId: storySequence?.settings?.templateId || 'minimal_dark',
      });
      fresh.status = 'sequence_ready';
      onChange(fresh);
      setShowAiPresetMenu(false);
      setExpandedStoryIndex(0);
      showSuccess(`Sequenza di ${count} stories generata con Google Gemini 3.8 Flash!`);
    } catch {
      showError('Errore AI', 'Impossibile completare la generazione con Gemini');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // 2. SCRIVO LA SCALETTA (TEMPLATE VUOTO DA COMPILARE)
  const handleStartManualScript = () => {
    const baseStories: InstagramStory[] = [
      {
        id: `story_hook_${Date.now()}`,
        order: 1,
        type: 'visual_hook',
        layout: 'visual_hook',
        headline: hook || contentTitle || 'IL TUO GANCIO VISIVO',
        headlineHighlight: '',
        subheadline: '',
        bodyText: '',
        status: 'draft',
      },
      {
        id: `story_val_${Date.now() + 1}`,
        order: 2,
        type: 'educational_value',
        layout: 'visual_hook',
        headline: 'IL CONCETTO CHIAVE',
        bodyText: 'Spiega il problema o la tecnica in 1-2 frasi chiare.',
        status: 'draft',
      },
      {
        id: `story_cta_${Date.now() + 2}`,
        order: 3,
        type: 'final_cta_dm',
        layout: 'visual_hook',
        headline: 'VUOI APPROFONDIRE?',
        bodyText: cta || 'Inviami un messaggio in DM per ricevere il protocollo completo.',
        status: 'draft',
      },
    ];

    const newSeq: InstagramStorySequence = {
      id: `story_seq_${Date.now()}`,
      title: contentTitle || 'Nuova Sequenza Stories',
      status: 'sequence_ready',
      settings: storySequence?.settings || {
        templateId: 'minimal_dark',
        fontFamily: 'Inter',
        brandName: 'AC Coaching',
        brandHandle: '@antoniocrapanzano_coach',
        showWatermark: true,
        watermarkText: '• AC COACHING •',
      },
      stories: baseStories,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    onChange(newSeq);
    setExpandedStoryIndex(0);
    showSuccess('Struttura scaletta creata! Compila le scene qui sotto.');
  };

  // AGGIUNTA SCENA
  const handleAddScene = () => {
    if (!storySequence) {
      handleStartManualScript();
      return;
    }
    const nextOrder = stories.length + 1;
    const newStory: InstagramStory = {
      id: `story_scene_${Date.now()}`,
      order: nextOrder,
      type: 'educational_value',
      layout: 'visual_hook',
      headline: `SCENA ${nextOrder}`,
      bodyText: '',
      status: 'draft',
    };
    const updated = {
      ...storySequence,
      stories: [...stories, newStory],
      updated_at: new Date().toISOString(),
    };
    onChange(updated);
    setExpandedStoryIndex(stories.length);
    showSuccess(`Scena ${nextOrder} aggiunta alla sequenza!`);
  };

  // IMPOSTA CTA FINALE
  const handleSetFinalCta = () => {
    if (stories.length === 0) {
      handleAddScene();
      return;
    }
    const lastIdx = stories.length - 1;
    updateStory(lastIdx, {
      type: 'final_cta_dm',
      headline: 'SCRIVIMI IN DIRECT',
      bodyText: cta || 'Inviami un messaggio per ricevere l\'analisi personalizzata.',
    });
    setExpandedStoryIndex(lastIdx);
    showSuccess('CTA finale impostata sull\'ultima story!');
  };

  // MODIFICA STORY
  const updateStory = (index: number, patch: Partial<InstagramStory>) => {
    if (!storySequence) return;
    const updatedStories = [...stories];
    updatedStories[index] = {
      ...updatedStories[index],
      ...patch,
    };
    onChange({
      ...storySequence,
      stories: updatedStories,
      updated_at: new Date().toISOString(),
    });
  };

  // CONTROLLI RIORDINO ED ELIMINAZIONE
  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (!storySequence) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= stories.length) return;

    const newStories = [...stories];
    const temp = newStories[index];
    newStories[index] = newStories[targetIndex];
    newStories[targetIndex] = temp;

    newStories.forEach((s, idx) => {
      s.order = idx + 1;
    });

    onChange({
      ...storySequence,
      stories: newStories,
      updated_at: new Date().toISOString(),
    });
    setExpandedStoryIndex(targetIndex);
  };

  const handleDuplicate = (index: number) => {
    if (!storySequence) return;
    const item = stories[index];
    const duplicate: InstagramStory = {
      ...item,
      id: `story_dup_${Date.now()}`,
      order: index + 2,
      headline: `${item.headline} (Copia)`,
    };
    const newStories = [...stories];
    newStories.splice(index + 1, 0, duplicate);
    newStories.forEach((s, idx) => {
      s.order = idx + 1;
    });
    onChange({
      ...storySequence,
      stories: newStories,
      updated_at: new Date().toISOString(),
    });
    setExpandedStoryIndex(index + 1);
  };

  const handleDelete = (index: number) => {
    if (!storySequence || stories.length <= 1) {
      showError('La sequenza deve contenere almeno una story.');
      return;
    }
    const newStories = stories.filter((_, idx) => idx !== index);
    newStories.forEach((s, idx) => {
      s.order = idx + 1;
    });
    onChange({
      ...storySequence,
      stories: newStories,
      updated_at: new Date().toISOString(),
    });
    setExpandedStoryIndex(Math.max(0, index - 1));
  };

  // ESPORTAZIONE ZIP
  const handleExportZip = async () => {
    if (!storySequence) return;
    setIsExportingZip(true);
    setExportProgress('Generazione stories 1080×1920...');
    try {
      await exportFullStorySequenceZip(storySequence, (curr, tot) => {
        setExportProgress(`Story ${curr}/${tot}...`);
      });
      onChange({ ...storySequence, status: 'exported' });
      showSuccess('Archivio ZIP Stories scaricato con successo!');
    } catch {
      showError('Errore durante la creazione del file ZIP');
    } finally {
      setIsExportingZip(false);
      setExportProgress('');
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-slate-900/60 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3 overflow-hidden">
      
      {/* ─── 1. HEADER INTEGRATO STORY STUDIO ─── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80 shrink-0">
        
        {/* MINIATURA 9:16 + TITOLO + METADATI */}
        <div className="flex items-center gap-3 min-w-0">
          {hasStories ? (
            <div
              onClick={() => onOpenFullscreenStudio(0)}
              className="w-10 h-16 rounded-lg overflow-hidden shadow-md border border-purple-500/30 bg-slate-950 relative group cursor-pointer shrink-0 flex items-center justify-center transition hover:border-purple-400"
              title="Clicca per aprire la sequenza nello Studio a schermo intero"
            >
              <canvas
                ref={miniCanvasRef}
                className="w-full h-full object-contain block select-none pointer-events-none"
              />
              <div className="absolute inset-0 bg-purple-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-purple-300">
                <Maximize2 className="w-3.5 h-3.5" />
              </div>
            </div>
          ) : (
            <div className="w-10 h-16 rounded-lg border border-dashed border-slate-700 bg-slate-950/70 flex items-center justify-center text-slate-500 text-[10px] font-mono shrink-0">
              9:16
            </div>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-black text-white tracking-wide flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-purple-400" />
                Story Studio
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 font-mono">
                {stories.length} {stories.length === 1 ? 'story' : 'stories'} · 9:16
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${currentStatusConfig.color}`}>
                {currentStatusConfig.label}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
              {hasStories
                ? 'Scrivi qui titoli e testi essenziali, o apri lo Studio per grafica e font.'
                : 'Crea la sequenza con AI o inserisci le scene manualmente.'}
            </p>
          </div>
        </div>

        {/* AZIONI PRINCIPALI (APRI STUDIO + SCARICA ZIP) */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          {hasStories && (
            <button
              type="button"
              onClick={handleExportZip}
              disabled={isExportingZip}
              className="py-1.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              title="Scarica tutte le stories in alta definizione 1080×1920 in formato ZIP"
            >
              <FileArchive className="w-3.5 h-3.5 text-purple-400" />
              <span>{isExportingZip ? 'Esporto...' : 'Scarica ZIP'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenFullscreenStudio(expandedStoryIndex ?? 0)}
            className="py-1.5 px-3.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-purple-500/20 transition cursor-pointer"
            title="Apri lo Studio grafico completo a schermo intero"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Apri Story Studio</span>
          </button>
        </div>
      </div>

      {exportProgress && (
        <div className="p-1.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[11px] font-mono text-center animate-pulse">
          <Download className="w-3 h-3 inline mr-1" />
          {exportProgress}
        </div>
      )}

      {/* ─── 2. TOOLBAR ESSENZIALE (3 AZIONI CHIARE) ─── */}
      <div className="flex items-center justify-between gap-2 shrink-0 bg-slate-950/80 p-2 rounded-xl border border-slate-800/80">
        <div className="flex items-center gap-2">
          {/* + NUOVA STORY */}
          <button
            type="button"
            onClick={handleAddScene}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-purple-400" />
            <span>Nuova Story</span>
          </button>

          {/* CTA FINALE */}
          <button
            type="button"
            onClick={handleSetFinalCta}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <span className="text-emerald-400 font-bold">✉</span>
            <span>CTA Finale</span>
          </button>
        </div>

        {/* GENERA CON AI (DROPDOWN COMPATTO) */}
        <div className="relative">
          <button
            type="button"
            disabled={isGeneratingAi}
            onClick={() => setShowAiPresetMenu((prev) => !prev)}
            className="px-3 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 hover:text-white border border-purple-500/30 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
          >
            {isGeneratingAi ? (
              <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            )}
            <span>{isGeneratingAi ? 'Generazione...' : 'Genera con AI'}</span>
            <ChevronDown className="w-3 h-3 text-purple-400" />
          </button>

          {showAiPresetMenu && (
            <div className="absolute right-0 top-full mt-1.5 w-52 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl p-1.5 z-30 space-y-1">
              <div className="px-2.5 py-1 text-[10px] font-black text-purple-400 border-b border-slate-800 uppercase tracking-wider">
                ⚡ Gemini 3.8 Flash
              </div>
              <button
                type="button"
                disabled={isGeneratingAi}
                onClick={() => handleGenerateAI(3)}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
              >
                ⚡ 3 Stories (Lead Gen rapida)
              </button>
              <button
                type="button"
                disabled={isGeneratingAi}
                onClick={() => handleGenerateAI(5)}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold text-purple-300 hover:text-white hover:bg-purple-900/40 transition cursor-pointer disabled:opacity-50"
              >
                ✨ 5 Stories (Consigliata)
              </button>
              <button
                type="button"
                disabled={isGeneratingAi}
                onClick={() => handleGenerateAI(7)}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
              >
                🧠 7 Stories (Approfondita)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── 3. CORPO: STATO VUOTO O LISTA SCENE SNELLE ─── */}
      {!hasStories ? (
        <div className="flex-1 flex flex-col justify-center items-center text-center p-6 space-y-4 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Sparkles className="w-6 h-6" />
          </div>
          
          <div className="space-y-1">
            <h4 className="text-sm font-black text-white">Nessuna story nella sequenza</h4>
            <p className="text-xs text-slate-400 max-w-sm">
              Scegli come iniziare a strutturare le tue Instagram Stories a 1080×1920.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md text-left pt-1">
            <button
              type="button"
              disabled={isGeneratingAi}
              onClick={() => handleGenerateAI(5)}
              className="p-3.5 rounded-xl bg-slate-950 hover:bg-slate-900 border border-purple-500/30 hover:border-purple-500 transition cursor-pointer group disabled:opacity-50"
            >
              <div className="flex items-center gap-2">
                {isGeneratingAi ? (
                  <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 text-purple-400" />
                )}
                <span className="text-xs font-black text-white group-hover:text-purple-300">
                  {isGeneratingAi ? 'Generazione...' : 'Genera con AI'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                Crea 5 scene persuasive con hook, valore e CTA finale.
              </p>
            </button>

            <button
              type="button"
              onClick={handleStartManualScript}
              className="p-3.5 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 transition cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">✍️</span>
                <span className="text-xs font-black text-white group-hover:text-amber-300">
                  Inizia da zero
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                Inserisci direttamente la tua scaletta di scene.
              </p>
            </button>
          </div>
        </div>
      ) : (
        /* LISTA DELLE STORIES COMPATTA E ORDINATA */
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
          {stories.map((story, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === stories.length - 1;
            const isExpanded = expandedStoryIndex === idx;

            return (
              <div
                key={story.id || idx}
                className={`rounded-xl border transition-all ${
                  isExpanded
                    ? 'bg-slate-950 border-purple-500/50 shadow-md'
                    : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* RIGA COMPATTA STORY */}
                <div
                  onClick={() => setExpandedStoryIndex(isExpanded ? null : idx)}
                  className="p-2.5 flex items-center justify-between gap-2.5 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {/* INDICE 01 */}
                    <span className="w-5 h-5 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-400 flex items-center justify-center shrink-0 font-mono">
                      {String(idx + 1).padStart(2, '0')}
                    </span>

                    {/* BADGE TIPO SINTETICO */}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                      isFirst
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : isLast
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                    }`}>
                      {isFirst ? '⚡ Hook' : isLast ? '✉️ CTA' : `⚡ Story ${idx + 1}`}
                    </span>

                    {/* TITOLO INLINE & SNIPPET */}
                    <div className="min-w-0 flex-1 flex items-baseline gap-2">
                      <span className="text-xs font-bold text-white truncate">
                        {story.headline || 'Senza titolo'}
                      </span>
                      {story.bodyText && !isExpanded && (
                        <span className="text-[11px] text-slate-500 truncate hidden md:inline">
                          — {story.bodyText}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* CONTROLLI RAPIDI */}
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {/* PULSANTE DIRETTO ALLO STUDIO PER QUESTA STORY */}
                    <button
                      type="button"
                      onClick={() => onOpenFullscreenStudio(idx)}
                      className="px-2 py-1 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 hover:text-white border border-purple-500/25 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer mr-1"
                      title="Apri questa story nello Studio a schermo intero"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span className="hidden sm:inline">Studio</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMove(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-20 cursor-pointer"
                      title="Sposta su"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMove(idx, 'down')}
                      disabled={idx === stories.length - 1}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-20 cursor-pointer"
                      title="Sposta giù"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicate(idx)}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-amber-400 cursor-pointer"
                      title="Duplica story"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(idx)}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400 cursor-pointer"
                      title="Elimina story"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedStoryIndex(isExpanded ? null : idx)}
                      className="p-1 text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* ─── CORPO ESPANSO: SOLO 2 CAMPI ESSENZIALI (TITOLO + TESTO) ─── */}
                {isExpanded && (
                  <div className="p-3.5 border-t border-slate-800/80 space-y-3 bg-slate-900/30">
                    
                    {/* 1. TITOLO / HOOK (HEADLINE) */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                        <span>{isFirst ? 'Titolo / Hook Principale *' : isLast ? 'Titolo CTA *' : 'Titolo della Story *'}</span>
                        <span className={`text-[10px] font-mono ${
                          (story.headline?.length || 0) > 180 ? 'text-amber-400' : 'text-slate-500'
                        }`}>
                          {story.headline?.length || 0} / 200 car.
                        </span>
                      </div>
                      <input
                        type="text"
                        maxLength={200}
                        value={story.headline}
                        onChange={(e) => updateStory(idx, { headline: e.target.value })}
                        placeholder={isFirst ? 'es. GUARDO LE VOSTRE STORIES' : 'es. PESO SPOSTATO CONTRO LEVA'}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 font-bold tracking-wide"
                      />
                    </div>

                    {/* 2. TESTO DELLA STORY */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                        <span>{isLast ? 'Testo Call to Action *' : 'Testo della Story / Spiegazione'}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {story.bodyText ? story.bodyText.trim().split(/\s+/).filter(Boolean).length : 0} parole
                        </span>
                      </div>
                      <textarea
                        rows={3}
                        value={story.bodyText || ''}
                        onChange={(e) => updateStory(idx, { bodyText: e.target.value })}
                        placeholder={isLast ? 'es. Inviami "LEVE" in DM per ricevere il protocollo completo...' : 'Spiega il concetto in 1 o 2 frasi chiare e concise...'}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500 resize-none font-medium leading-relaxed"
                      />
                    </div>

                    {/* LINK DIRETTO ALLO STUDIO PER PERSONALIZZAZIONE VISIVA */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/40">
                      <span className="text-[10px] text-slate-500">
                        Font, dimensione (fino a 200px), colori e posizione Y si regolano nello Studio.
                      </span>
                      <button
                        type="button"
                        onClick={() => onOpenFullscreenStudio(idx)}
                        className="text-[11px] font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer transition hover:underline"
                      >
                        <Maximize2 className="w-3 h-3" />
                        <span>Apri nello Studio ↗</span>
                      </button>
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

