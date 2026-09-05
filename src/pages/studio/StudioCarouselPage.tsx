import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Layers,
  Plus,
  Edit3,
  Trash2,
} from 'lucide-react';
import { useContents } from '../../context/ContentsContext';
import { useToast } from '../../context/ToastContext';
import { InstagramContent } from '../../types/inboxAndContent';
import { InstagramCarousel } from '../../types/carousel';
import { createEmptyCarousel, createEmptyCoverSlide } from '../../services/carouselGeneratorService';

// Precaricamento anticipato del chunk per eliminare la latenza di caricamento dinamico
const preloadCarouselModal = () => {
  import('../../components/contents/carousel/CarouselStudioModal');
};

const CarouselStudioModal = React.lazy(() =>
  import('../../components/contents/carousel/CarouselStudioModal').then((m) => ({ default: m.CarouselStudioModal }))
);

interface StudioCarouselPageProps {
  initialContent?: InstagramContent | null;
}

export const StudioCarouselPage: React.FC<StudioCarouselPageProps> = ({
  initialContent,
}) => {
  const { contents, createContent, updateContent, deleteContentById } = useContents();
  const { showError } = useToast();

  const carouselContents = useMemo(() => {
    return contents.filter((c) => c.type === 'carousel');
  }, [contents]);

  // Modale editor Carousel Studio
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(Boolean(initialContent));
  const [activeContent, setActiveContent] = useState<InstagramContent | null>(
    initialContent || carouselContents[0] || null
  );

  // Riferimenti per sincronizzazione ottimistica background
  const pendingCreationRef = useRef<Promise<InstagramContent> | null>(null);
  const currentActiveIdRef = useRef<string | null>(activeContent?.id || null);

  // Precarica il chunk lazy immediatamente al caricamento della pagina
  useEffect(() => {
    preloadCarouselModal();
  }, []);

  // Apertura editor per contenuto esistente
  const handleOpenEditor = (content: InstagramContent) => {
    currentActiveIdRef.current = content.id;
    pendingCreationRef.current = null;
    setActiveContent(content);
    setIsEditorOpen(true);
  };

  // Creazione NUOVO Carousel istantaneo (0ms di attesa + Slide 1 Cover già pronta da editare)
  const handleCreateNewCarousel = () => {
    try {
      const tempId = `temp_carousel_${Date.now()}`;
      currentActiveIdRef.current = tempId;

      // Inizializza subito con Slide 1 (Cover pronta) per atterrare direttamente nell'editor attivo
      const initialSlide = createEmptyCoverSlide('Nuovo Carosello Formativo');
      const defaultCarousel: InstagramCarousel = {
        ...createEmptyCarousel(tempId),
        slides: [initialSlide],
      };

      const optimisticContent: InstagramContent = {
        id: tempId,
        coach_id: '',
        title: 'Nuovo Carosello Formativo',
        type: 'carousel',
        pillar: 'technique_execution',
        status: 'idea',
        hook: '3 Errori Comuni che bloccano i tuoi progressi...',
        carousel_data: defaultCarousel,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // 1. Apertura immediata della modale (0ms latenza percepita)
      setActiveContent(optimisticContent);
      setIsEditorOpen(true);

      // 2. Persistenza asincrona in background su Supabase
      const creationPromise = createContent({
        title: 'Nuovo Carosello Formativo',
        type: 'carousel',
        pillar: 'technique_execution',
        status: 'idea',
        hook: '3 Errori Comuni che bloccano i tuoi progressi...',
        carousel_data: defaultCarousel,
      });
      pendingCreationRef.current = creationPromise;

      creationPromise
        .then((newContent) => {
          currentActiveIdRef.current = newContent.id;
          setActiveContent((prev) => {
            if (prev && prev.id === tempId) {
              return {
                ...newContent,
                carousel_data: prev.carousel_data || newContent.carousel_data,
                title: prev.carousel_data?.slides?.[0]?.headline || newContent.title,
                hook: prev.carousel_data?.slides?.[0]?.headline || newContent.hook,
              };
            }
            return prev;
          });
        })
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : 'Errore creazione Carosello';
          showError(message);
        });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Errore creazione Carosello';
      showError(message);
    }
  };

  // Salvataggio carosello modificato (supporta sia ID reali che salvataggio concorrente con creazione background)
  const handleSaveCarousel = async (updatedCarousel: InstagramCarousel) => {
    try {
      let targetId = currentActiveIdRef.current || activeContent?.id;
      if (!targetId) return;

      // Se la creazione in background è ancora in corso, attendiamo la risoluzione dell'ID reale
      if (targetId.startsWith('temp_') && pendingCreationRef.current) {
        try {
          const realContent = await pendingCreationRef.current;
          targetId = realContent.id;
          currentActiveIdRef.current = realContent.id;
        } catch {
          return;
        }
      }

      await updateContent(targetId, {
        carousel_data: updatedCarousel,
        title: updatedCarousel.slides[0]?.headline || activeContent?.title || 'Nuovo Carosello',
        hook: updatedCarousel.slides[0]?.headline || activeContent?.hook || '',
      });
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
              <Layers className="w-7 h-7 text-purple-400" />
              Carousel Studio Pro
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
              1080×1350 Canvas HD
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Editor fullscreen per caroselli Instagram: layout slide, testi scientifici, numerini on/off ed export ZIP ad alta risoluzione.
          </p>
        </div>

        <button
          type="button"
          onClick={handleCreateNewCarousel}
          onMouseEnter={preloadCarouselModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-purple-400 hover:bg-purple-300 text-slate-950 shadow-md shadow-purple-500/20 transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nuovo Carosello</span>
        </button>
      </div>

      {/* GRIGLIA DEI CAROSELLI */}
      {carouselContents.length === 0 ? (
        <div className="p-16 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-3">
          <Layers className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">Nessun Carosello presente in archivio</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Crea il tuo primo carosello per iniziare a impaginare slide professionali con contrasto ottimale e numeratore configurabile.
          </p>
          <button
            type="button"
            onClick={handleCreateNewCarousel}
            onMouseEnter={preloadCarouselModal}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-400 hover:bg-purple-300 text-slate-950 inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Crea Primo Carosello</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {carouselContents.map((item) => {
            const slideCount = item.carousel_data?.slides?.length || 0;
            const coverHeadline = item.carousel_data?.slides?.[0]?.headline || item.title;
            const coverImage = item.carousel_data?.slides?.[0]?.imageUrl;

            return (
              <div
                key={item.id}
                className="group p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-purple-500/40 transition-all flex flex-col justify-between shadow-md space-y-3"
              >
                <div>
                  {/* ANTEPRIMA COVER SLIDE #1 */}
                  <div
                    onClick={() => handleOpenEditor(item)}
                    onMouseEnter={preloadCarouselModal}
                    className="w-full h-44 rounded-xl bg-slate-950 border border-slate-800 relative overflow-hidden cursor-pointer flex items-center justify-center p-4 text-center group-hover:border-purple-500/50 transition-colors"
                  >
                    {coverImage ? (
                      <img
                        src={coverImage}
                        alt={coverHeadline}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono text-purple-400 uppercase font-bold">
                          Cover Slide 1/{slideCount || 1}
                        </span>
                        <h4 className="text-xs font-bold text-white line-clamp-3">
                          {coverHeadline}
                        </h4>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-900/90 text-purple-300 border border-purple-500/30">
                      {slideCount} Slide
                    </div>
                  </div>

                  {/* TITOLO CONTENUTO */}
                  <h3
                    onClick={() => handleOpenEditor(item)}
                    className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors cursor-pointer line-clamp-1 mt-3"
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
                    onMouseEnter={preloadCarouselModal}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Apri Studio (1080×1350)</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODALE FULLSCREEN CAROUSEL STUDIO */}
      {isEditorOpen && activeContent && (
        <React.Suspense fallback={null}>
          <CarouselStudioModal
            isOpen={isEditorOpen}
            onClose={() => setIsEditorOpen(false)}
            content={activeContent}
            onSaveCarousel={handleSaveCarousel}
          />
        </React.Suspense>
      )}

    </div>
  );
};
