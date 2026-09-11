import React, { useState, useMemo, useEffect } from 'react';
import {
  Kanban,
  Plus,
  Video,
  Layers,
  Smartphone,
  FileText,
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Trash2,
  Inbox,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useContents } from '../../context/ContentsContext';
import { useInbox } from '../../context/InboxContext';
import { useToast } from '../../context/ToastContext';
import {
  InstagramContent,
  ContentType,
  ContentStatus,
  InboxEntry,
} from '../../types/inboxAndContent';
import {
  StudioFormatFilter,
  StudioPipelineStatus,
  STUDIO_PIPELINE_COLUMNS,
  StudioTab,
} from '../../types/studio';
import { preloadDrawerEditors } from '../../components/contents/ContentDrawerEditor';

interface StudioPipelinePageProps {
  onOpenContentEditor: (content: InstagramContent) => void;
  onNavigateToStudio: (tab: StudioTab, content?: InstagramContent) => void;
  onQuickNewContent: (defaultType?: ContentType, defaultStatus?: ContentStatus) => void;
}

export const StudioPipelinePage: React.FC<StudioPipelinePageProps> = ({
  onOpenContentEditor,
  onNavigateToStudio,
  onQuickNewContent,
}) => {
  const { contents, moveStatus, deleteContentById, refreshContents } = useContents();
  const { entries: inboxEntries, convertToContentAction } = useInbox();
  const { showSuccess, showError } = useToast();

  const [formatFilter, setFormatFilter] = useState<StudioFormatFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [convertingId, setConvertingId] = useState<string | null>(null);

  // Spunti e idee ancora non convertiti in contenuti
  const activeInboxIdeas = useMemo(() => {
    return inboxEntries.filter((e) => e.status === 'raw' || e.status === 'processed');
  }, [inboxEntries]);

  // Conversione 1-Click direttamente dalla colonna Idee
  const handleConvertInboxIdea = async (idea: InboxEntry) => {
    try {
      setConvertingId(idea.id);
      const suggestedType = idea.ai_content_opportunity?.suggestedType || 'reel';
      await convertToContentAction(idea, {
        type: suggestedType,
        pillar: idea.ai_content_opportunity?.pillar || 'technique_execution',
        hook: idea.ai_content_opportunity?.hook || '',
        script_body: idea.ai_content_opportunity?.scriptOutline || idea.raw_content,
      });
      await refreshContents();
      showSuccess(`Idea convertita in ${suggestedType.toUpperCase()} e inserita nella Pipeline!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore durante la conversione';
      showError(msg);
    } finally {
      setConvertingId(null);
    }
  };

  // Precarica i moduli editor pesanti in background dopo il primo render
  useEffect(() => {
    const timer = setTimeout(() => {
      preloadDrawerEditors();
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  // Eliminazione contenuto con conferma
  const handleDeleteContent = async (item: InstagramContent) => {
    const confirmDelete = window.confirm(
      `Sei sicuro di voler eliminare definitivamente "${item.title}"?`
    );
    if (!confirmDelete) return;
    try {
      await deleteContentById(item.id);
    } catch {
      // Notifica già gestita nel context
    }
  };

  // Spostamento di colonna
  const handleMoveColumn = async (
    content: InstagramContent,
    direction: 'prev' | 'next'
  ) => {
    const colOrder: StudioPipelineStatus[] = [
      'idea',
      'script_draft',
      'ready_to_record',
      'editing',
      'ready_to_publish',
      'published',
    ];

    let currentNormStatus: StudioPipelineStatus = 'idea';
    if (content.status === 'script_draft') currentNormStatus = 'script_draft';
    else if (content.status === 'ready_to_record') currentNormStatus = 'ready_to_record';
    else if (content.status === 'editing' || content.status === 'recorded') currentNormStatus = 'editing';
    else if (content.status === 'ready_to_publish') currentNormStatus = 'ready_to_publish';
    else if (content.status === 'published' || content.status === 'repurpose') currentNormStatus = 'published';

    const currentIndex = colOrder.indexOf(currentNormStatus);
    const targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

    if (targetIndex >= 0 && targetIndex < colOrder.length) {
      const nextStatus = colOrder[targetIndex];
      try {
        await moveStatus(content.id, nextStatus as ContentStatus);
        showSuccess(`Contenuto spostato in "${STUDIO_PIPELINE_COLUMNS[targetIndex].label}"`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Errore nello spostamento';
        showError(message);
      }
    }
  };

  // Apertura studio dedicato
  const handleOpenDedicatedStudio = (content: InstagramContent) => {
    if (content.type === 'reel') {
      onNavigateToStudio('reel_studio', content);
    } else if (content.type === 'carousel') {
      onNavigateToStudio('carousel_studio', content);
    } else if (content.type === 'story') {
      onNavigateToStudio('story_studio', content);
    } else {
      onOpenContentEditor(content);
    }
  };

  // Filtraggio per formato e ricerca
  const filteredContents = useMemo(() => {
    return contents.filter((c) => {
      // Formato (Stories incluse come formato filtrabile)
      if (formatFilter !== 'all' && c.type !== formatFilter) {
        return false;
      }
      // Ricerca
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = c.title.toLowerCase().includes(q);
        const matchHook = c.hook?.toLowerCase().includes(q);
        const matchNotes = c.internal_notes?.toLowerCase().includes(q);
        if (!matchTitle && !matchHook && !matchNotes) return false;
      }
      return true;
    });
  }, [contents, formatFilter, searchQuery]);

  // Raggruppamento per le 6 colonne univoche richieste
  const columnsData = useMemo(() => {
    const map: Record<StudioPipelineStatus, InstagramContent[]> = {
      idea: [],
      script_draft: [],
      ready_to_record: [],
      editing: [],
      ready_to_publish: [],
      published: [],
    };

    filteredContents.forEach((c) => {
      if (c.status === 'idea') {
        map.idea.push(c);
      } else if (c.status === 'script_draft') {
        map.script_draft.push(c);
      } else if (c.status === 'ready_to_record') {
        map.ready_to_record.push(c);
      } else if (c.status === 'editing' || c.status === 'recorded') {
        map.editing.push(c);
      } else if (c.status === 'ready_to_publish') {
        map.ready_to_publish.push(c);
      } else if (c.status === 'published' || c.status === 'repurpose') {
        map.published.push(c);
      } else {
        map.idea.push(c);
      }
    });

    return map;
  }, [filteredContents]);

  const renderFormatBadge = (type: ContentType) => {
    switch (type) {
      case 'reel':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-sky-500/20 text-sky-300 border border-sky-500/30">
            <Video className="w-3 h-3" /> Reel
          </span>
        );
      case 'carousel':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
            <Layers className="w-3 h-3" /> Carousel
          </span>
        );
      case 'story':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
            <Smartphone className="w-3 h-3" /> Story
          </span>
        );
      case 'post':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <FileText className="w-3 h-3" /> Post
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-[1920px] mx-auto pb-16">
      
      {/* HEADER DELLA PIPELINE */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5 font-sans">
              <Kanban className="w-7 h-7 text-amber-400" />
              Pipeline Produzione Contenuti
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              6 Fasi di Produzione
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Gestisci il ciclo completo: dall'idea allo script, alle riprese, al montaggio fino alla pubblicazione.
          </p>
        </div>

        {/* PULSANTE NUOVO CONTENUTO */}
        <button
          type="button"
          onClick={() => onQuickNewContent(formatFilter === 'all' ? 'reel' : formatFilter, 'idea')}
          className="self-start lg:self-auto flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md shadow-amber-500/20 transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>Nuovo Contenuto</span>
        </button>
      </div>

      {/* FILTRI FORMATO E BARRA DI RICERCA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
        
        {/* FORMAT FILTER TABS (Tutti, Reel, Stories, Caroselli, Post) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-slate-400 font-mono uppercase font-bold mr-1 hidden sm:inline">
            Formato:
          </span>

          <button
            type="button"
            onClick={() => setFormatFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              formatFilter === 'all'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
            }`}
          >
            Tutti ({contents.length + activeInboxIdeas.length})
          </button>

          <button
            type="button"
            onClick={() => setFormatFilter('reel')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              formatFilter === 'reel'
                ? 'bg-sky-500 text-slate-950 font-bold shadow-sm'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Reel ({contents.filter((c) => c.type === 'reel').length})</span>
          </button>

          <button
            type="button"
            onClick={() => setFormatFilter('story')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              formatFilter === 'story'
                ? 'bg-rose-500 text-slate-950 font-bold shadow-sm'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Stories ({contents.filter((c) => c.type === 'story').length})</span>
          </button>

          <button
            type="button"
            onClick={() => setFormatFilter('carousel')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              formatFilter === 'carousel'
                ? 'bg-purple-500 text-slate-950 font-bold shadow-sm'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Caroselli ({contents.filter((c) => c.type === 'carousel').length})</span>
          </button>

          <button
            type="button"
            onClick={() => setFormatFilter('post')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              formatFilter === 'post'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Post ({contents.filter((c) => c.type === 'post').length})</span>
          </button>
        </div>

        {/* SEARCH INPUT */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cerca per titolo o hook..."
            className="w-full pl-10 pr-4 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800 focus:border-amber-500 text-white placeholder-slate-500 text-xs"
          />
        </div>
      </div>

      {/* KANBAN BOARD A 6 COLONNE UNIVOCHE */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4 overflow-x-auto pb-6">
        {STUDIO_PIPELINE_COLUMNS.map((column, colIdx) => {
          const colItems = columnsData[column.id];
          const isIdeaCol = column.id === 'idea';
          const totalColCount = isIdeaCol ? colItems.length + activeInboxIdeas.length : colItems.length;

          return (
            <div
              key={column.id}
              className="flex flex-col rounded-2xl bg-slate-900/60 border border-slate-800/80 min-h-[500px] shadow-md"
            >
              {/* COL HEADER */}
              <div className={`p-3.5 border-b border-slate-800 bg-gradient-to-b ${column.bgGradient} rounded-t-2xl`}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="text-xs font-bold text-white tracking-wide uppercase font-mono">
                    {column.label}
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${column.badgeColor}`}>
                    {totalColCount}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 line-clamp-1">
                  {column.description}
                </p>
              </div>

              {/* CARDS CONTAINER */}
              <div className="flex-1 p-2.5 space-y-3 overflow-y-auto max-h-[calc(100vh-320px)] custom-scrollbar">
                {/* SEZIONE INBOX IDEE ATTIVE DA LAVORARE */}
                {isIdeaCol && activeInboxIdeas.length > 0 && (
                  <div className="space-y-2 mb-3 pb-3 border-b border-amber-500/25">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[11px] font-black text-amber-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        Dalla Inbox ({activeInboxIdeas.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => onNavigateToStudio('inbox')}
                        className="text-[10px] text-amber-400 hover:text-amber-300 hover:underline font-bold cursor-pointer flex items-center gap-0.5"
                      >
                        <span>Apri Inbox</span>
                        <ArrowRight className="w-2.5 h-2.5" />
                      </button>
                    </div>

                    {activeInboxIdeas.map((idea) => {
                      const suggestedType = idea.ai_content_opportunity?.suggestedType || 'reel';
                      const isConverting = convertingId === idea.id;
                      return (
                        <div
                          key={idea.id}
                          className="p-3 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-950/20 border border-amber-500/35 hover:border-amber-400/60 transition-all shadow-sm space-y-2"
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              <Inbox className="w-2.5 h-2.5" />
                              Spunto Inbox
                            </span>
                            <span className="text-[9px] text-amber-300/80 uppercase font-mono font-bold">
                              {suggestedType}
                            </span>
                          </div>

                          <h4
                            onClick={() => onNavigateToStudio('inbox')}
                            className="text-xs font-bold text-white hover:text-amber-300 cursor-pointer transition-colors line-clamp-2"
                          >
                            {idea.ai_title || idea.raw_content}
                          </h4>

                          {idea.ai_summary && (
                            <p className="text-[10px] text-slate-400 line-clamp-2 italic bg-slate-950/50 p-1.5 rounded border border-amber-500/10">
                              "{idea.ai_summary}"
                            </p>
                          )}

                          <div className="pt-1.5 border-t border-amber-500/20 flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => onNavigateToStudio('inbox')}
                              className="text-[10px] font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
                            >
                              Dettagli
                            </button>
                            <button
                              type="button"
                              disabled={isConverting}
                              onClick={() => handleConvertInboxIdea(idea)}
                              className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 text-[10px] font-black flex items-center gap-1 transition cursor-pointer shadow-sm active:scale-95"
                              title="Converti e sposta nella Pipeline"
                            >
                              <Plus className="w-3 h-3 stroke-[3]" />
                              <span>{isConverting ? 'Conversione...' : 'Avvia in Pipeline'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {colItems.length === 0 && (!isIdeaCol || activeInboxIdeas.length === 0) ? (
                  <div className="p-6 rounded-xl border border-dashed border-slate-800/80 text-center">
                    <p className="text-[11px] text-slate-500">Nessun contenuto in questa fase</p>
                    <button
                      type="button"
                      onClick={() => onQuickNewContent(formatFilter === 'all' ? 'reel' : formatFilter, column.id as ContentStatus)}
                      className="mt-2 text-[10px] font-semibold text-amber-400 hover:text-amber-300 hover:underline"
                    >
                      + Aggiungi qui
                    </button>
                  </div>
                ) : (
                  colItems.map((item) => (
                    <div
                      key={item.id}
                      className="group p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/90 hover:border-amber-500/40 hover:bg-slate-900/90 transition-all shadow-sm space-y-2.5"
                    >
                      {/* HEADER CARD: BADGE FORMATO + PROGRAMMAZIONE + ELIMINA */}
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {renderFormatBadge(item.type)}
                          {item.scheduled_for && (
                            <span className="text-[10px] font-mono text-amber-300 flex items-center gap-1">
                              <Calendar className="w-2.5 h-2.5 text-amber-400" />
                              {new Date(item.scheduled_for).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteContent(item);
                          }}
                          className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/15 transition-all cursor-pointer"
                          title="Elimina contenuto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* TITOLO CONTENUTO */}
                      <h4
                        onClick={() => onOpenContentEditor(item)}
                        className="text-xs font-bold text-white hover:text-amber-300 cursor-pointer transition-colors line-clamp-2"
                      >
                        {item.title}
                      </h4>

                      {/* HOOK PRIMI SECONDI SE PRESENTE */}
                      {item.hook && (
                        <p className="text-[11px] text-slate-400 italic line-clamp-2 bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                          "{item.hook}"
                        </p>
                      )}

                      {/* PILLAR & NOTE */}
                      <div className="text-[10px] text-slate-500 truncate">
                        Pillar: <span className="text-slate-400">{item.pillar}</span>
                      </div>

                      {/* AZIONI SULLA CARD */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1">
                        
                        {/* TASTO INDIETRO COLONNA */}
                        <button
                          type="button"
                          disabled={colIdx === 0}
                          onClick={() => handleMoveColumn(item, 'prev')}
                          className="p-1 rounded bg-slate-800/60 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                          title="Sposta a colonna precedente"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>

                        <div className="flex items-center gap-1.5">
                          {/* APRI EDITOR / STUDIO DEDICATO */}
                          <button
                            type="button"
                            onClick={() => handleOpenDedicatedStudio(item)}
                            className="px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <span>Studio</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </button>

                          {/* ELIMINA CONTENUTO */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteContent(item);
                            }}
                            className="p-1 rounded bg-slate-800/60 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700/50 hover:border-rose-500/40 transition-all cursor-pointer"
                            title="Elimina contenuto"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>

                        {/* TASTO AVANTI COLONNA */}
                        <button
                          type="button"
                          disabled={colIdx === STUDIO_PIPELINE_COLUMNS.length - 1}
                          onClick={() => handleMoveColumn(item, 'next')}
                          className="p-1 rounded bg-slate-800/60 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                          title="Sposta a colonna successiva"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>

                      </div>

                    </div>
                  ))
                )}
              </div>

              {/* FOOTER COLONNA */}
              <div className="p-2 border-t border-slate-800/80 text-center">
                <button
                  type="button"
                  onClick={() => onQuickNewContent(formatFilter === 'all' ? 'reel' : formatFilter, column.id as ContentStatus)}
                  className="w-full py-1.5 rounded-lg text-[11px] font-semibold text-slate-400 hover:text-amber-300 hover:bg-slate-800/50 transition-colors flex items-center justify-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Nuovo</span>
                </button>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
