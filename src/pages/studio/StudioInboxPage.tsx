import React, { useState, useMemo } from 'react';
import {
  Inbox,
  Plus,
  Search,
  Sparkles,
  Video,
  Layers,
  Smartphone,
  FileText,
  CheckCircle2,
  Trash2,
  Archive,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { useInbox } from '../../context/InboxContext';
import { useContents } from '../../context/ContentsContext';
import { useToast } from '../../context/ToastContext';
import { InboxEntry, ContentType, ContentPillar, InboxPriority, InstagramContent } from '../../types/inboxAndContent';
import { StudioTab } from '../../types/studio';

interface StudioInboxPageProps {
  onNavigateToStudio: (tab: StudioTab, content?: InstagramContent) => void;
  onOpenContentEditor: (content: InstagramContent) => void;
}

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

export const StudioInboxPage: React.FC<StudioInboxPageProps> = ({
  onNavigateToStudio,
  onOpenContentEditor,
}) => {
  const { entries, addEntry, deleteEntryById, archiveEntry, convertToContentAction, refreshEntries, isLoading } = useInbox();
  const { refreshContents } = useContents();
  const { showSuccess, showError } = useToast();

  // Input per nuova idea rapida
  const [newIdeaText, setNewIdeaText] = useState('');
  const [newIdeaFormat, setNewIdeaFormat] = useState<ContentType>('reel');
  const [newIdeaPillar, setNewIdeaPillar] = useState<ContentPillar>('technique_execution');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtri
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<ContentType | 'all'>('all');
  const [selectedPillar, setSelectedPillar] = useState<ContentPillar | 'all'>('all');
  const [selectedPriority, setSelectedPriority] = useState<InboxPriority | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'unprocessed' | 'converted' | 'archived'>('unprocessed');

  // Gestione aggiunta rapida
  const handleCreateIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIdeaText.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await addEntry(newIdeaText.trim(), true);
      setNewIdeaText('');
      showSuccess('Idea aggiunta alla Inbox con successo!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Errore nel salvataggio dell\'idea';
      showError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Conversione 1-Click
  const handleConvert = async (entry: InboxEntry, targetType: ContentType) => {
    try {
      const created = await convertToContentAction(entry, {
        type: targetType,
        pillar: entry.ai_content_opportunity?.pillar || newIdeaPillar,
        hook: entry.ai_content_opportunity?.hook || '',
        script_body: entry.ai_content_opportunity?.scriptOutline || entry.raw_content,
      });

      await refreshContents();
      showSuccess(`Idea convertita in ${targetType.toUpperCase()}! Apertura editor...`);

      if (targetType === 'reel') {
        onNavigateToStudio('reel_studio', created);
      } else if (targetType === 'carousel') {
        onNavigateToStudio('carousel_studio', created);
      } else if (targetType === 'story') {
        onNavigateToStudio('story_studio', created);
      } else {
        onOpenContentEditor(created);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Errore durante la conversione';
      showError(message);
    }
  };

  // Filtraggio delle idee
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      // Ricerca
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchRaw = entry.raw_content.toLowerCase().includes(q);
        const matchTitle = entry.ai_title?.toLowerCase().includes(q);
        const matchHook = entry.ai_content_opportunity?.hook?.toLowerCase().includes(q);
        if (!matchRaw && !matchTitle && !matchHook) return false;
      }

      // Stato
      if (selectedStatus === 'unprocessed') {
        if (entry.status === 'converted_content' || entry.status === 'archived') return false;
      } else if (selectedStatus === 'converted') {
        if (entry.status !== 'converted_content') return false;
      } else if (selectedStatus === 'archived') {
        if (entry.status !== 'archived') return false;
      }

      // Formato
      if (selectedFormat !== 'all') {
        if (entry.ai_content_opportunity?.suggestedType !== selectedFormat) return false;
      }

      // Pillar
      if (selectedPillar !== 'all') {
        if (entry.ai_content_opportunity?.pillar !== selectedPillar) return false;
      }

      // Priorità
      if (selectedPriority !== 'all') {
        if (entry.ai_priority !== selectedPriority) return false;
      }

      return true;
    });
  }, [entries, searchQuery, selectedStatus, selectedFormat, selectedPillar, selectedPriority]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5 font-sans">
              <Inbox className="w-7 h-7 text-amber-400" />
              Inbox Idee & Spunti Social
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              {filteredEntries.length} {filteredEntries.length === 1 ? 'Idea' : 'Idee'}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Raccogli hook, spunti, note e link. Organizza per tema e formato e converti in 1 clic per la produzione.
          </p>
        </div>

        <button
          type="button"
          onClick={() => refreshEntries()}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Aggiorna</span>
        </button>
      </div>

      {/* QUICK BRAIN DUMP & CREAZIONE RAPIDA */}
      <form onSubmit={handleCreateIdea} className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-slate-900/90 to-slate-950 border border-amber-500/30 shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-amber-300 font-mono">
            Aggiungi Nuovo Spunto / Hook / Link
          </span>
        </div>

        <div className="space-y-3">
          <textarea
            value={newIdeaText}
            onChange={(e) => setNewIdeaText(e.target.value)}
            placeholder="Scrivi qui la tua idea, una domanda sentita da un atleta, un hook o incolla un link di riferimento..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-slate-700/80 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-white placeholder-slate-500 text-sm resize-none"
          />

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-3">
              {/* Formato stimato */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 font-medium">Formato:</span>
                <select
                  value={newIdeaFormat}
                  onChange={(e) => setNewIdeaFormat(e.target.value as ContentType)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-medium text-white focus:border-amber-400"
                >
                  <option value="reel">🎬 Reel</option>
                  <option value="carousel">📑 Carousel</option>
                  <option value="story">📱 Story</option>
                  <option value="post">📝 Post Singolo</option>
                </select>
              </div>

              {/* Pillar tematico */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 font-medium">Tema:</span>
                <select
                  value={newIdeaPillar}
                  onChange={(e) => setNewIdeaPillar(e.target.value as ContentPillar)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-medium text-white focus:border-amber-400"
                >
                  {Object.entries(PILLAR_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={!newIdeaText.trim() || isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center gap-2 shadow-md shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? 'Salvataggio...' : 'Salva in Inbox'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* FILTRI E RICERCA */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* SEARCH BAR */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca per testo, hook o parola chiave..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950/70 border border-slate-800 focus:border-amber-500 text-white placeholder-slate-500 text-xs"
            />
          </div>

          {/* TAB STATO */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              type="button"
              onClick={() => setSelectedStatus('unprocessed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedStatus === 'unprocessed'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              Idee Attive
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus('converted')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedStatus === 'converted'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              Già Convertite
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus('archived')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedStatus === 'archived'
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              Archiviate
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedStatus === 'all'
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              Tutte
            </button>
          </div>
        </div>

        {/* FILTRI DI SECONDO LIVELLO: FORMATO, TEMA, PRIORITÀ */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/60 text-xs">
          <span className="text-slate-500 font-mono uppercase text-[10px] mr-1">Filtri:</span>

          <select
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value as ContentType | 'all')}
            className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:border-slate-700"
          >
            <option value="all">Tutti i Formati</option>
            <option value="reel">Reel</option>
            <option value="carousel">Carousel</option>
            <option value="story">Story</option>
            <option value="post">Post</option>
          </select>

          <select
            value={selectedPillar}
            onChange={(e) => setSelectedPillar(e.target.value as ContentPillar | 'all')}
            className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:border-slate-700 max-w-xs truncate"
          >
            <option value="all">Tutti i Temi</option>
            {Object.entries(PILLAR_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value as InboxPriority | 'all')}
            className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:border-slate-700"
          >
            <option value="all">Tutte le Priorità</option>
            <option value="urgent">Urgente</option>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Bassa</option>
          </select>

          {(selectedFormat !== 'all' || selectedPillar !== 'all' || selectedPriority !== 'all' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSelectedFormat('all');
                setSelectedPillar('all');
                setSelectedPriority('all');
                setSearchQuery('');
              }}
              className="text-[11px] text-amber-400 hover:underline ml-2"
            >
              Azzera filtri
            </button>
          )}
        </div>
      </div>

      {/* LISTA DELLE IDEE CON CONVERSIONE 1-CLIC */}
      {filteredEntries.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800/80 text-center">
          <Inbox className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-white">Nessuna idea trovata con questi filtri</p>
          <p className="text-xs text-slate-400 mt-1">
            Usa il box in alto per annotare nuovi hook o appunti per i tuoi prossimi contenuti.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEntries.map((entry) => {
            const opportunity = entry.ai_content_opportunity;
            const isConverted = entry.status === 'converted_content';
            const isArchived = entry.status === 'archived';

            return (
              <div
                key={entry.id}
                className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/90 hover:border-amber-500/40 transition-all flex flex-col justify-between shadow-md space-y-4"
              >
                <div>
                  {/* META HEADER DELLA CARD */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {opportunity?.suggestedType && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-sky-500/15 text-sky-300 border border-sky-500/30">
                          {opportunity.suggestedType}
                        </span>
                      )}
                      {opportunity?.pillar && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-800 text-slate-300">
                          {PILLAR_LABELS[opportunity.pillar] || opportunity.pillar}
                        </span>
                      )}
                      {entry.ai_priority && (
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                            entry.ai_priority === 'urgent'
                              ? 'bg-rose-500/20 text-rose-300'
                              : entry.ai_priority === 'high'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {entry.ai_priority}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {!isArchived && (
                        <button
                          type="button"
                          onClick={() => archiveEntry(entry.id)}
                          className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
                          title="Archivia"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => deleteEntryById(entry.id)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        title="Elimina"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* TITOLO O SINTESI */}
                  <h3 className="text-sm font-bold text-white mb-1">
                    {entry.ai_title || 'Nota rapida'}
                  </h3>

                  {/* HOOK SE PRESENTE */}
                  {opportunity?.hook && (
                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 my-2">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-amber-400 uppercase font-bold mb-1">
                        <Zap className="w-3 h-3" /> Hook consigliato:
                      </div>
                      <p className="text-xs text-amber-200 italic font-medium">"{opportunity.hook}"</p>
                    </div>
                  )}

                  {/* TESTO GREZZO */}
                  <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
                    {entry.raw_content}
                  </p>
                </div>

                {/* PULSANTI CONVERSIONE 1-CLIC */}
                <div className="pt-3 border-t border-slate-800/80">
                  <div className="text-[10px] font-mono uppercase text-slate-400 mb-2 flex items-center justify-between">
                    <span>⚡ Conversione 1-Clic:</span>
                    {isConverted && (
                      <span className="text-emerald-400 flex items-center gap-1 font-bold">
                        <CheckCircle2 className="w-3 h-3" /> Già in produzione
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleConvert(entry, 'reel')}
                      className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-sky-500/10 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 transition-all shadow-sm"
                    >
                      <Video className="w-3 h-3" /> Reel
                    </button>

                    <button
                      type="button"
                      onClick={() => handleConvert(entry, 'carousel')}
                      className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-purple-500/10 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 transition-all shadow-sm"
                    >
                      <Layers className="w-3 h-3" /> Carousel
                    </button>

                    <button
                      type="button"
                      onClick={() => handleConvert(entry, 'story')}
                      className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition-all shadow-sm"
                    >
                      <Smartphone className="w-3 h-3" /> Story
                    </button>

                    <button
                      type="button"
                      onClick={() => handleConvert(entry, 'post')}
                      className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-all shadow-sm"
                    >
                      <FileText className="w-3 h-3" /> Post
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
