import React, { useState, useMemo } from 'react';
import {
  Smartphone,
  Plus,
  Edit3,
  Trash2,
} from 'lucide-react';
import { useContents } from '../../context/ContentsContext';
import { useToast } from '../../context/ToastContext';
import { InstagramContent } from '../../types/inboxAndContent';
import { InstagramStorySequence } from '../../types/story';
import { generateStoriesFromContent } from '../../services/storyGeneratorService';
import { getContentGraphics } from '../../services/contentsService';

const StoryStudioModal = React.lazy(() =>
  import('../../components/contents/story/StoryStudioModal').then((m) => ({ default: m.StoryStudioModal }))
);

interface StudioStoryPageProps {
  initialContent?: InstagramContent | null;
}

export const StudioStoryPage: React.FC<StudioStoryPageProps> = ({
  initialContent,
}) => {
  const { contents, createContent, updateContent, deleteContentById } = useContents();
  const { showSuccess, showError } = useToast();

  const storyContents = useMemo(() => {
    return contents.filter((c) => c.type === 'story');
  }, [contents]);

  const [activeContent, setActiveContent] = useState<InstagramContent | null>(
    initialContent || storyContents[0] || null
  );
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(Boolean(initialContent));

  // Genera o recupera sequenza Stories per il contenuto
  const activeSequence: InstagramStorySequence | null = useMemo(() => {
    if (!activeContent) return null;
    if (activeContent.story_data) return activeContent.story_data;

    return generateStoriesFromContent({
      title: activeContent.title,
      hook: activeContent.hook || activeContent.title,
      scriptBody: activeContent.script_body || undefined,
      cta: activeContent.call_to_action || undefined,
      targetCount: 5,
    });
  }, [activeContent]);

  const handleOpenEditor = async (content: InstagramContent) => {
    if (!content.story_data && !content.id.startsWith('temp_')) {
      try {
        const graphics = await getContentGraphics(content.id);
        const enriched: InstagramContent = { ...content, ...graphics };
        setActiveContent(enriched);
        setIsEditorOpen(true);
        return;
      } catch {
        // Fallback sicuro se offline
      }
    }
    setActiveContent(content);
    setIsEditorOpen(true);
  };

  const handlePrefetchGraphics = (content: InstagramContent) => {
    if (!content.story_data && !content.id.startsWith('temp_')) {
      getContentGraphics(content.id).catch(() => {});
    }
  };

  const handleCreateNewStory = async () => {
    try {
      const defaultSequence = generateStoriesFromContent({
        title: 'Sequenza Story Interattiva',
        hook: 'Fai anche tu questo errore quando ti alleni?',
        cta: 'Scrivimi in DM per la scheda completa!',
        targetCount: 5,
      });

      const newContent = await createContent({
        title: 'Nuova Sequenza Story',
        type: 'story',
        pillar: 'coaching_faq',
        status: 'idea',
        hook: 'Fai anche tu questo errore quando ti alleni?',
        story_data: defaultSequence,
      });

      setActiveContent(newContent);
      setIsEditorOpen(true);
      showSuccess('Nuova Sequenza Story creata! Apertura Story Studio...');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Errore nella creazione della Story';
      showError(message);
    }
  };

  const handleSaveSequence = async (updatedSequence: InstagramStorySequence) => {
    if (!activeContent) return;
    try {
      await updateContent(activeContent.id, {
        story_data: updatedSequence,
        title: updatedSequence.stories[0]?.headline || activeContent.title,
        hook: updatedSequence.stories[0]?.headline || activeContent.hook,
      });
      showSuccess('Sequenza Story salvata con successo!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Errore nel salvataggio';
      showError(message);
    }
  };

  return (
    <div className="space-y-6 max-w-[1700px] mx-auto pb-16">
      
      {/* HEADER DELLA PAGINA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5 font-sans">
              <Smartphone className="w-7 h-7 text-rose-400" />
              Story Studio Pro
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
              1080×1920 Fullscreen
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Editor per sequenze multi-slide verticali: quiz, sondaggi, sticker interattivi, CTA per DM ed esportazione rapida.
          </p>
        </div>

        <button
          type="button"
          onClick={handleCreateNewStory}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-rose-400 hover:bg-rose-300 text-slate-950 shadow-md shadow-rose-500/20 transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nuova Story</span>
        </button>
      </div>

      {/* GRIGLIA STORIES */}
      {storyContents.length === 0 ? (
        <div className="p-16 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-3">
          <Smartphone className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">Nessuna sequenza Story presente</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Crea la tua prima sequenza Story per strutturare sequenze persuasive a 3, 5 o 7 slide con sticker interattivi.
          </p>
          <button
            type="button"
            onClick={handleCreateNewStory}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-400 hover:bg-rose-300 text-slate-950 inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Crea Prima Story</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {storyContents.map((item) => {
            const storyCount = item.story_data?.stories?.length || 4;
            const hookTitle = item.story_data?.stories?.[0]?.headline || item.title;

            return (
              <div
                key={item.id}
                onMouseEnter={() => handlePrefetchGraphics(item)}
                className="group p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-rose-500/40 transition-all flex flex-col justify-between shadow-md space-y-3"
              >
                <div>
                  {/* ANTEPRIMA 9:16 SIMULATA */}
                  <div
                    onClick={() => handleOpenEditor(item)}
                    className="w-full h-48 rounded-xl bg-slate-950 border border-slate-800 relative overflow-hidden cursor-pointer flex flex-col items-center justify-center p-4 text-center group-hover:border-rose-500/50 transition-colors"
                  >
                    <span className="text-[10px] font-mono text-rose-400 uppercase font-bold mb-1">
                      Slide 1 di {storyCount}
                    </span>
                    <h4 className="text-xs font-bold text-white line-clamp-3">
                      {hookTitle}
                    </h4>

                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-900/90 text-rose-300 border border-rose-500/30">
                      {storyCount} Slide
                    </div>
                  </div>

                  <h3
                    onClick={() => handleOpenEditor(item)}
                    className="text-sm font-bold text-white group-hover:text-rose-300 transition-colors cursor-pointer line-clamp-1 mt-3"
                  >
                    {item.title}
                  </h3>

                  {item.hook && (
                    <p className="text-xs text-slate-400 italic line-clamp-2 mt-1">
                      "{item.hook}"
                    </p>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 mt-2 border-t border-slate-800">
                    <span>Pillar: {item.pillar}</span>
                    <span className="uppercase font-mono text-slate-400">{item.status}</span>
                  </div>
                </div>

                {/* PULSANTI AZIONE */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => deleteContentById(item.id)}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-500 hover:text-rose-400 transition-colors"
                    title="Elimina"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEditor(item)}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Apri Studio (9:16)</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODALE FULLSCREEN STORY STUDIO */}
      {isEditorOpen && activeContent && activeSequence && (
        <React.Suspense fallback={null}>
          <StoryStudioModal
            isOpen={isEditorOpen}
            onClose={() => setIsEditorOpen(false)}
            storySequence={activeSequence}
            onSaveSequence={handleSaveSequence}
          />
        </React.Suspense>
      )}

    </div>
  );
};
