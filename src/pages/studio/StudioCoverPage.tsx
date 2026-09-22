import React, { useState, useMemo } from 'react';
import {
  Image as ImageIcon,
  Plus,
  Edit3,
  Trash2,
} from 'lucide-react';
import { useContents } from '../../context/ContentsContext';
import { useToast } from '../../context/ToastContext';
import { InstagramContent } from '../../types/inboxAndContent';
import { InstagramCoverData } from '../../types/cover';
import { generateDefaultCoverFromContent } from '../../services/coverGeneratorService';
import { getContentGraphics } from '../../services/contentsService';

const CoverStudioModal = React.lazy(() =>
  import('../../components/contents/cover/CoverStudioModal').then((m) => ({ default: m.CoverStudioModal }))
);

interface StudioCoverPageProps {
  initialContent?: InstagramContent | null;
}

export const StudioCoverPage: React.FC<StudioCoverPageProps> = ({
  initialContent,
}) => {
  const { contents, createContent, updateContent, deleteContentById } = useContents();
  const { showSuccess, showError } = useToast();

  // Contenuti con cover o tipo reel/video/post
  const coverEligibleContents = useMemo(() => {
    return contents.filter((c) => Boolean(c.cover_data) || c.type === 'reel' || c.type === 'post');
  }, [contents]);

  const [activeContent, setActiveContent] = useState<InstagramContent | null>(
    initialContent || coverEligibleContents[0] || null
  );
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(Boolean(initialContent));

  const handleOpenEditor = async (content: InstagramContent) => {
    if (!content.cover_data && !content.id.startsWith('temp_')) {
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
    if (!content.cover_data && !content.id.startsWith('temp_')) {
      getContentGraphics(content.id).catch(() => {});
    }
  };

  const handleCreateNewCover = async () => {
    try {
      const newContent = await createContent({
        title: 'Nuova Copertina Reel',
        type: 'reel',
        pillar: 'technique_execution',
        status: 'idea',
        hook: 'IL SEGRETO DELLO STACCO PERFETTO',
      });

      const defaultCover = generateDefaultCoverFromContent(newContent);
      await updateContent(newContent.id, {
        cover_data: defaultCover,
      });

      setActiveContent({ ...newContent, cover_data: defaultCover });
      setIsEditorOpen(true);
      showSuccess('Nuovo progetto Copertina creato! Apertura Cover Studio...');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Errore creazione copertina';
      showError(message);
    }
  };

  const handleSaveCover = async (updatedCover: InstagramCoverData) => {
    if (!activeContent) return;
    try {
      await updateContent(activeContent.id, {
        cover_data: updatedCover,
      });
      showSuccess('Copertina salvata con successo!');
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
              <ImageIcon className="w-7 h-7 text-amber-400" />
              Cover Studio Pro
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              1080×1920 + Crop 1:1 Feed
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Editor grafico fullscreen per copertine Reel e Post: safe area Instagram, preview crop quadrato 1:1, palette AC Coaching e contrasto WCAG.
          </p>
        </div>

        <button
          type="button"
          onClick={handleCreateNewCover}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md shadow-amber-500/20 transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nuova Copertina</span>
        </button>
      </div>

      {/* GRIGLIA COPERTINE */}
      {coverEligibleContents.length === 0 ? (
        <div className="p-16 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-3">
          <ImageIcon className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">Nessuna copertina presente</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Crea la tua prima copertina per Reel con i 4 template editoriali e i colori ufficiali AC Coaching.
          </p>
          <button
            type="button"
            onClick={handleCreateNewCover}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Crea Prima Copertina</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {coverEligibleContents.map((item) => {
            const hasCoverData = Boolean(item.cover_data);
            const coverHeadline = item.cover_data?.headline || item.hook || item.title;
            const coverImage = item.cover_data?.imageUrl;

            return (
              <div
                key={item.id}
                onMouseEnter={() => handlePrefetchGraphics(item)}
                className="group p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col justify-between shadow-md space-y-3"
              >
                <div>
                  {/* ANTEPRIMA 9:16 VERTICALE */}
                  <div
                    onClick={() => handleOpenEditor(item)}
                    className="w-full h-56 rounded-xl bg-slate-950 border border-slate-800 relative overflow-hidden cursor-pointer flex flex-col items-center justify-center p-4 text-center group-hover:border-amber-500/50 transition-colors"
                  >
                    {coverImage ? (
                      <img
                        src={coverImage}
                        alt={coverHeadline}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="space-y-2 p-2">
                        <span className="text-[10px] font-mono text-amber-400 uppercase font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                          {item.cover_data?.templateId || 'bold_editorial'}
                        </span>
                        <h4 className="text-xs font-black text-white uppercase tracking-tight line-clamp-3">
                          {coverHeadline}
                        </h4>
                      </div>
                    )}

                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-900/90 text-amber-300 border border-amber-500/30">
                      9:16 HD
                    </div>
                  </div>

                  <h3
                    onClick={() => handleOpenEditor(item)}
                    className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors cursor-pointer line-clamp-1 mt-3"
                  >
                    {item.title}
                  </h3>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 mt-2 border-t border-slate-800">
                    <span>{hasCoverData ? 'Copertina configurata' : 'Bozza senza grafica'}</span>
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
                    className="flex-1 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Apri Cover Studio</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODALE FULLSCREEN COVER STUDIO */}
      {isEditorOpen && activeContent && (
        <React.Suspense fallback={null}>
          <CoverStudioModal
            isOpen={isEditorOpen}
            onClose={() => setIsEditorOpen(false)}
            content={activeContent}
            onSaveCover={handleSaveCover}
          />
        </React.Suspense>
      )}

    </div>
  );
};
