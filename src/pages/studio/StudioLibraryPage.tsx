import React, { useState, useMemo } from 'react';
import {
  FolderArchive,
  Search,
  Video,
  Layers,
  Smartphone,
  FileText,
  Copy,
  ExternalLink,
  LayoutGrid,
  List,
} from 'lucide-react';
import { useContents } from '../../context/ContentsContext';
import { useToast } from '../../context/ToastContext';
import {
  InstagramContent,
  ContentType,
  ContentPillar,
} from '../../types/inboxAndContent';
import { StudioFormatFilter, StudioTab } from '../../types/studio';

interface StudioLibraryPageProps {
  onOpenContentEditor: (content: InstagramContent) => void;
  onNavigateToStudio: (tab: StudioTab, content?: InstagramContent) => void;
}

type LibraryCategoryTab = 'all' | 'published' | 'drafts' | 'covers' | 'exported';

const PILLAR_LABELS: Record<ContentPillar, string> = {
  technique_execution: 'Tecnica & Biomeccanica',
  common_mistakes: 'Errori Comuni & Correzioni',
  mindset_discipline: 'Mindset & Disciplina',
  nutrition_science: 'Nutrizione & Scienza',
  client_transformation: 'Casi Studio & Trasformazioni',
  coaching_faq: 'FAQ & Risposte Coach',
  authority_lifestyle: 'Autorità & Filosofia',
  promotion_launch: 'Promo & Lanci',
};

export const StudioLibraryPage: React.FC<StudioLibraryPageProps> = ({
  onOpenContentEditor,
  onNavigateToStudio,
}) => {
  const { contents, createContent } = useContents();
  const { showSuccess, showError } = useToast();

  const [categoryTab, setCategoryTab] = useState<LibraryCategoryTab>('all');
  const [formatFilter, setFormatFilter] = useState<StudioFormatFilter>('all');
  const [selectedPillar, setSelectedPillar] = useState<ContentPillar | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewStyle, setViewStyle] = useState<'grid' | 'table'>('grid');

  // Duplica contenuto come nuova bozza
  const handleDuplicate = async (original: InstagramContent) => {
    try {
      await createContent({
        title: `${original.title} (Copia)`,
        type: original.type,
        pillar: original.pillar,
        status: 'idea',
        hook: original.hook,
        script_body: original.script_body,
        caption: original.caption,
        call_to_action: original.call_to_action,
        carousel_data: original.carousel_data,
        cover_data: original.cover_data,
        story_data: original.story_data,
      });
      showSuccess('Contenuto duplicato con successo!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Errore nella duplicazione';
      showError(message);
    }
  };

  // Filtraggio completo
  const filteredContents = useMemo(() => {
    return contents.filter((c) => {
      // Formato (Stories incluse come formato filtrabile)
      if (formatFilter !== 'all' && c.type !== formatFilter) return false;

      // Categoria asset
      if (categoryTab === 'published' && c.status !== 'published') return false;
      if (categoryTab === 'drafts' && (c.status === 'published' || c.status === 'ready_to_publish')) return false;
      if (categoryTab === 'covers' && !c.cover_data) return false;
      if (categoryTab === 'exported' && !c.carousel_data?.caption_export && c.status !== 'published') return false;

      // Pillar
      if (selectedPillar !== 'all' && c.pillar !== selectedPillar) return false;

      // Ricerca full-text
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = c.title.toLowerCase().includes(q);
        const matchHook = c.hook?.toLowerCase().includes(q);
        const matchScript = c.script_body?.toLowerCase().includes(q);
        const matchCaption = c.caption?.toLowerCase().includes(q);
        const matchNotes = c.internal_notes?.toLowerCase().includes(q);
        if (!matchTitle && !matchHook && !matchScript && !matchCaption && !matchNotes) return false;
      }

      return true;
    });
  }, [contents, formatFilter, categoryTab, selectedPillar, searchQuery]);

  const renderFormatBadge = (type: ContentType) => {
    switch (type) {
      case 'reel':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-sky-500/15 text-sky-300 border border-sky-500/30">
            <Video className="w-3 h-3" /> Reel
          </span>
        );
      case 'carousel':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <Layers className="w-3 h-3" /> Carousel
          </span>
        );
      case 'story':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <Smartphone className="w-3 h-3" /> Story
          </span>
        );
      case 'post':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <FileText className="w-3 h-3" /> Post
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-[1920px] mx-auto pb-16">
      
      {/* HEADER DELLA LIBRERIA */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5 font-sans">
              <FolderArchive className="w-7 h-7 text-amber-400" />
              Libreria Asset & Archivio Contenuti
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              {filteredContents.length} Risorse
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Archivio storico: contenuti pubblicati, bozze, script, cover generate e template da riusare.
          </p>
        </div>

        {/* TOGGLE VISTA GRIGLIA / LISTA */}
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setViewStyle('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewStyle === 'grid' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
              title="Vista Griglia Visuale"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewStyle('table')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewStyle === 'table' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
              title="Vista Elenco Tabellare"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* FILTRI ASSET TABS & FORMATI */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
        
        {/* TAB LIVELLO 1: CATEGORIA ASSET */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setCategoryTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                categoryTab === 'all'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              Tutti gli Asset ({contents.length})
            </button>
            <button
              type="button"
              onClick={() => setCategoryTab('published')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                categoryTab === 'published'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              Pubblicati ({contents.filter((c) => c.status === 'published').length})
            </button>
            <button
              type="button"
              onClick={() => setCategoryTab('drafts')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                categoryTab === 'drafts'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              Bozze & Script
            </button>
            <button
              type="button"
              onClick={() => setCategoryTab('covers')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                categoryTab === 'covers'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              Cover Generate ({contents.filter((c) => Boolean(c.cover_data)).length})
            </button>
          </div>

          {/* SEARCH BOX */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca per titolo, hook o script..."
              className="w-full pl-10 pr-4 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 focus:border-amber-500 text-white placeholder-slate-500 text-xs"
            />
          </div>
        </div>

        {/* TAB LIVELLO 2: FILTRI FORMATO & PILLAR */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/70 text-xs">
          <span className="text-slate-500 font-mono uppercase text-[10px] mr-1">Formato:</span>

          <button
            type="button"
            onClick={() => setFormatFilter('all')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              formatFilter === 'all' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-950 text-slate-300'
            }`}
          >
            Tutti
          </button>
          <button
            type="button"
            onClick={() => setFormatFilter('reel')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              formatFilter === 'reel' ? 'bg-sky-500 text-slate-950 font-bold' : 'bg-slate-950 text-slate-300'
            }`}
          >
            Reel
          </button>
          <button
            type="button"
            onClick={() => setFormatFilter('story')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              formatFilter === 'story' ? 'bg-rose-500 text-slate-950 font-bold' : 'bg-slate-950 text-slate-300'
            }`}
          >
            Stories
          </button>
          <button
            type="button"
            onClick={() => setFormatFilter('carousel')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              formatFilter === 'carousel' ? 'bg-purple-500 text-slate-950 font-bold' : 'bg-slate-950 text-slate-300'
            }`}
          >
            Caroselli
          </button>
          <button
            type="button"
            onClick={() => setFormatFilter('post')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              formatFilter === 'post' ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-950 text-slate-300'
            }`}
          >
            Post
          </button>

          <span className="text-slate-500 font-mono uppercase text-[10px] ml-3 mr-1">Tema:</span>
          <select
            value={selectedPillar}
            onChange={(e) => setSelectedPillar(e.target.value as ContentPillar | 'all')}
            className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 max-w-xs truncate"
          >
            <option value="all">Tutti i Temi</option>
            {Object.entries(PILLAR_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>

      </div>

      {/* RISULTATI: VISTA A GRIGLIA */}
      {filteredContents.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800 text-center">
          <FolderArchive className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-white">Nessun contenuto trovato con questi filtri</p>
          <p className="text-xs text-slate-400 mt-1">
            Modifica i filtri o la query di ricerca per visualizzare altri asset.
          </p>
        </div>
      ) : viewStyle === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
          {filteredContents.map((item) => {
            const hasCover = Boolean(item.cover_data?.imageUrl || item.carousel_data?.slides?.[0]?.imageUrl);
            const coverImg = item.cover_data?.imageUrl || item.carousel_data?.slides?.[0]?.imageUrl;

            return (
              <div
                key={item.id}
                className="group p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col justify-between shadow-md space-y-3"
              >
                <div>
                  {/* PREVIEW MINIATURA SE PRESENTE */}
                  {hasCover ? (
                    <div className="w-full h-36 rounded-xl bg-slate-950 overflow-hidden relative mb-3 border border-slate-800">
                      <img
                        src={coverImg || ''}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />
                      <div className="absolute top-2 left-2">
                        {renderFormatBadge(item.type)}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2 mb-2">
                      {renderFormatBadge(item.type)}
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        {item.status}
                      </span>
                    </div>
                  )}

                  {/* TITOLO */}
                  <h3
                    onClick={() => onOpenContentEditor(item)}
                    className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors cursor-pointer line-clamp-2"
                  >
                    {item.title}
                  </h3>

                  {/* HOOK SE PRESENTE */}
                  {item.hook && (
                    <p className="text-xs text-slate-400 italic line-clamp-2 mt-1">
                      "{item.hook}"
                    </p>
                  )}

                  {/* PILLAR & METRICHE */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 mt-2 border-t border-slate-800/80">
                    <span className="truncate max-w-[150px]">{PILLAR_LABELS[item.pillar] || item.pillar}</span>
                    {item.performance_metrics?.views !== undefined && (
                      <span className="font-mono text-slate-400">
                        👁 {item.performance_metrics.views}
                      </span>
                    )}
                  </div>
                </div>

                {/* AZIONI: DUPLICA, MODIFICA, STUDIO */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleDuplicate(item)}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors text-xs flex items-center gap-1"
                    title="Duplica e riusa come nuova bozza"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline text-[10px]">Duplica</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onOpenContentEditor(item)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
                    >
                      Dettagli
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (item.type === 'reel') onNavigateToStudio('reel_studio', item);
                        else if (item.type === 'carousel') onNavigateToStudio('carousel_studio', item);
                        else if (item.type === 'story') onNavigateToStudio('story_studio', item);
                        else onOpenContentEditor(item);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-1 transition-all"
                    >
                      <span>Studio</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VISTA ELENCO TABELLARE */
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-[10px] uppercase font-mono text-slate-400">
                <tr>
                  <th className="p-3">Formato</th>
                  <th className="p-3">Titolo & Hook</th>
                  <th className="p-3">Pillar</th>
                  <th className="p-3">Stato</th>
                  <th className="p-3">Pianificato</th>
                  <th className="p-3 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredContents.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="p-3">{renderFormatBadge(item.type)}</td>
                    <td className="p-3 font-semibold text-white">
                      <div className="max-w-md truncate">{item.title}</div>
                      {item.hook && <div className="text-[11px] text-slate-400 font-normal italic truncate">"{item.hook}"</div>}
                    </td>
                    <td className="p-3 text-slate-400">{item.pillar}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
                        {item.status}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-400">
                      {item.scheduled_for ? new Date(item.scheduled_for).toLocaleDateString('it-IT') : '—'}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDuplicate(item)}
                          className="p-1 rounded text-slate-400 hover:text-white"
                          title="Duplica"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenContentEditor(item)}
                          className="px-2 py-1 rounded bg-slate-800 text-white font-medium hover:bg-slate-700"
                        >
                          Apri
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
