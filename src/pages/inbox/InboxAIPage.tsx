import React, { useState } from 'react';
import {
  Inbox,
  Sparkles,
  Search,
  RefreshCw,
  Archive,
  Lightbulb,
} from 'lucide-react';
import { useInbox } from '../../context/InboxContext';
import { QuickBrainDumpInput } from '../../components/inbox/QuickBrainDumpInput';
import { InboxEntryCard } from '../../components/inbox/InboxEntryCard';
import { InboxReviewQueue } from '../../components/inbox/InboxReviewQueue';
import { InboxCategory, InboxEntry } from '../../types/inboxAndContent';
import { ContentDrawerEditor } from '../../components/contents/ContentDrawerEditor';

export const InboxAIPage: React.FC = () => {
  const { entries, isLoading, refreshEntries, unprocessedCount } = useInbox();

  const [activeFilter, setActiveFilter] = useState<'all' | 'unprocessed' | InboxCategory | 'archived'>('unprocessed');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntryForContent, setSelectedEntryForContent] = useState<InboxEntry | null>(null);

  // Filtraggio
  const filteredEntries = entries.filter((entry) => {
    // Ricerca testuale
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchRaw = entry.raw_content.toLowerCase().includes(q);
      const matchTitle = entry.ai_title?.toLowerCase().includes(q);
      const matchSummary = entry.ai_summary?.toLowerCase().includes(q);
      if (!matchRaw && !matchTitle && !matchSummary) return false;
    }

    // Filtro per stato/categoria
    if (activeFilter === 'unprocessed') {
      return entry.status === 'raw' || entry.status === 'processed';
    }
    if (activeFilter === 'archived') {
      return entry.status === 'archived';
    }
    if (activeFilter === 'all') {
      return entry.status !== 'archived';
    }
    return entry.ai_category === activeFilter && entry.status !== 'archived';
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* HEADER DELLA PAGINA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Inbox className="w-6 h-6 text-amber-400" />
              Inbox AI & Smistamento Operativo
            </h1>
            {unprocessedCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20">
                {unprocessedCount} da revisionare
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Cattura al volo errori, pensieri e spunti: l'AI estrae Task, Hook per Instagram e Note clienti
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refreshEntries()}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            title="Ricarica Inbox"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* QUICK BRAIN DUMP INPUT */}
      <QuickBrainDumpInput />

      {/* CODA DI REVISIONE ATTIVA CON DECISIONI RAPIDE */}
      <InboxReviewQueue
        entries={entries}
        onOpenContentModal={(entry) => setSelectedEntryForContent(entry)}
      />

      {/* FILTRI & RICERCA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        {/* TABS FILTRO */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
          <button
            onClick={() => setActiveFilter('unprocessed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              activeFilter === 'unprocessed'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Da Smistare ({unprocessedCount})
          </button>

          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
              activeFilter === 'all'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Tutti ({entries.length})
          </button>

          <button
            onClick={() => setActiveFilter('content_idea')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
              activeFilter === 'content_idea'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Idee Contenuti
          </button>

          <button
            onClick={() => setActiveFilter('client_observation')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
              activeFilter === 'client_observation'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Osservazioni Clienti
          </button>

          <button
            onClick={() => setActiveFilter('business_task')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
              activeFilter === 'business_task'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Task
          </button>

          <button
            onClick={() => setActiveFilter('archived')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
              activeFilter === 'archived'
                ? 'bg-slate-800 text-slate-300 border border-slate-700'
                : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Archive className="w-3 h-3 inline mr-1" />
            Archiviati
          </button>
        </div>

        {/* BARRA DI RICERCA */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cerca nei pensieri..."
            className="w-full pl-9 pr-4 py-1.5 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      {/* LISTA DELLE ENTRIES */}
      {filteredEntries.length === 0 ? (
        <div className="text-center py-12 px-6 bg-slate-900/40 border-2 border-dashed border-slate-800/80 rounded-3xl space-y-4 max-w-2xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/5">
            <Lightbulb className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-black text-white">Centrale libera! Nessun elemento da smistare.</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
              La tua Inbox AI è pulita. Usa il modulo in alto per catturare qualsiasi pensiero sparso o promemoria durante la giornata.
            </p>
          </div>
          
          <div className="pt-2 text-xs text-slate-500 font-mono">
            ⚡ <strong>Consiglio Operativo:</strong> Annota un errore visto durante i check, un'idea per un Reel o un compito da delegare.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredEntries.map((entry) => (
            <InboxEntryCard
              key={entry.id}
              entry={entry}
              onOpenContentModal={(e) => setSelectedEntryForContent(e)}
            />
          ))}
        </div>
      )}

      {/* DRAWER / MODAL EDITOR CONTENUTO DA INBOX SE SELEZIONATO */}
      {selectedEntryForContent && (
        <ContentDrawerEditor
          isOpen={true}
          onClose={() => {
            setSelectedEntryForContent(null);
            refreshEntries();
          }}
          initialData={{
            origin_inbox_id: selectedEntryForContent.id,
            title: selectedEntryForContent.ai_title || 'Nuovo Contenuto',
            type: selectedEntryForContent.ai_content_opportunity?.suggestedType || 'reel',
            pillar: selectedEntryForContent.ai_content_opportunity?.pillar || 'technique_execution',
            hook: selectedEntryForContent.ai_content_opportunity?.hook || '',
            script_body: selectedEntryForContent.ai_content_opportunity?.scriptOutline || selectedEntryForContent.raw_content,
            call_to_action: selectedEntryForContent.ai_content_opportunity?.callToAction || '',
            internal_notes: `Origine Inbox AI. Sintesi: ${selectedEntryForContent.ai_summary || ''}`,
          }}
        />
      )}
    </div>
  );
};
