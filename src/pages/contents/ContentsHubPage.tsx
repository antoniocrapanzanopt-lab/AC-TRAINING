import React, { useState } from 'react';
import {
  Video,
  Plus,
  LayoutGrid,
  List,
  Search,
  RefreshCw,
  Sparkles,
  Flame,
  CheckCircle2,
  Calendar,
  ChevronDown,
  X,
  Layers,
} from 'lucide-react';
import { useContents } from '../../context/ContentsContext';
import { ContentFeedView } from '../../components/contents/ContentFeedView';
import { ContentKanbanBoard } from '../../components/contents/ContentKanbanBoard';
import { ContentListView } from '../../components/contents/ContentListView';
import { ContentDrawerEditor } from '../../components/contents/ContentDrawerEditor';
import {
  InstagramContent,
  ContentStatus,
} from '../../types/inboxAndContent';

export const ContentsHubPage: React.FC = () => {
  const {
    contents,
    isLoading,
    refreshContents,
    ideasCount,
    readyToRecordCount,
    readyToPublishCount,
    publishedCount,
  } = useContents();

  const [viewMode, setViewMode] = useState<'feed' | 'kanban' | 'list'>('feed');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedPillar, setSelectedPillar] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [onlyAiOrigin, setOnlyAiOrigin] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [contentToEdit, setContentToEdit] = useState<InstagramContent | null>(null);
  const [defaultNewStatus, setDefaultNewStatus] = useState<ContentStatus>('idea');

  // Filtraggio avanzato
  const filteredContents = contents.filter((c) => {
    if (selectedType !== 'all' && c.type !== selectedType) return false;
    if (selectedPillar !== 'all' && c.pillar !== selectedPillar) return false;
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (onlyAiOrigin && !c.origin_inbox_id) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = c.title.toLowerCase().includes(q);
      const matchHook = c.hook?.toLowerCase().includes(q);
      const matchNotes = c.internal_notes?.toLowerCase().includes(q);
      if (!matchTitle && !matchHook && !matchNotes) return false;
    }
    return true;
  });

  const handleOpenNew = (status: ContentStatus = 'idea') => {
    setContentToEdit(null);
    setDefaultNewStatus(status);
    setIsEditorOpen(true);
  };

  const handleEditContent = (content: InstagramContent) => {
    setContentToEdit(content);
    setIsEditorOpen(true);
  };

  const toggleStatusFilter = (status: string) => {
    setStatusFilter((prev) => (prev === status ? 'all' : status));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-7 animate-fadeIn">
      
      {/* HEADER PAGINA */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Video className="w-5 h-5" />
            </div>
            Pipeline Contenuti Instagram
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Gestisci la creazione di Reel, Storie e Caroselli: dall'idea allo script fino alla pubblicazione
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refreshContents()}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            title="Ricarica Contenuti"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => handleOpenNew('idea')}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nuovo Contenuto
          </button>
        </div>
      </div>

      {/* KPI METRICHE INTERATTIVE */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        
        {/* IDEE */}
        <div
          onClick={() => toggleStatusFilter('idea')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
            statusFilter === 'idea'
              ? 'bg-blue-500/15 border-blue-500 shadow-lg shadow-blue-500/10'
              : 'bg-slate-900/70 border-slate-800/90 hover:border-slate-700 hover:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1">
            <span className="flex items-center gap-1.5 text-blue-400">
              <Sparkles className="w-3.5 h-3.5" />
              Idee in Bozza
            </span>
            {statusFilter === 'idea' && (
              <span className="text-[9px] font-mono bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">Filtro attivo</span>
            )}
          </div>
          <div className="text-2xl font-black text-white">{ideasCount}</div>
        </div>

        {/* DA REGISTRARE (HIGHLIGHT ORO) */}
        <div
          onClick={() => toggleStatusFilter('ready_to_record')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
            statusFilter === 'ready_to_record'
              ? 'bg-amber-500/20 border-amber-500 shadow-lg shadow-amber-500/15 ring-1 ring-amber-500/30'
              : 'bg-slate-900/70 border-amber-500/30 hover:border-amber-500/60 hover:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-amber-400 mb-1">
            <span className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              Da Registrare
            </span>
            {statusFilter === 'ready_to_record' && (
              <span className="text-[9px] font-mono bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">Filtro attivo</span>
            )}
          </div>
          <div className="text-2xl font-black text-amber-300">{readyToRecordCount}</div>
        </div>

        {/* PRONTI DA PUBBLICARE */}
        <div
          onClick={() => toggleStatusFilter('ready_to_publish')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
            statusFilter === 'ready_to_publish'
              ? 'bg-emerald-500/20 border-emerald-500 shadow-lg shadow-emerald-500/15'
              : 'bg-slate-900/70 border-emerald-500/30 hover:border-emerald-500/60 hover:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-emerald-400 mb-1">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Pronti da Pubblicare
            </span>
            {statusFilter === 'ready_to_publish' && (
              <span className="text-[9px] font-mono bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">Filtro attivo</span>
            )}
          </div>
          <div className="text-2xl font-black text-emerald-300">{readyToPublishCount}</div>
        </div>

        {/* PUBBLICATI */}
        <div
          onClick={() => toggleStatusFilter('published')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
            statusFilter === 'published'
              ? 'bg-purple-500/15 border-purple-500 shadow-lg shadow-purple-500/10'
              : 'bg-slate-900/70 border-slate-800/90 hover:border-slate-700 hover:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1">
            <span className="flex items-center gap-1.5 text-purple-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Pubblicati
            </span>
            {statusFilter === 'published' && (
              <span className="text-[9px] font-mono bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">Filtro attivo</span>
            )}
          </div>
          <div className="text-2xl font-black text-slate-300">{publishedCount}</div>
        </div>
      </div>

      {/* TOOLBAR: SWITCHER VISTA, QUICK PILLS, FILTRI E RICERCA */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        
        {/* FILTRI A SINISTRA */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* SWITCHER VISTA */}
          <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('feed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'feed' ? 'bg-amber-500 text-slate-950 shadow font-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Feed Schede
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'kanban' ? 'bg-amber-500 text-slate-950 shadow font-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Board
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'list' ? 'bg-amber-500 text-slate-950 shadow font-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Tabella
            </button>
          </div>

          {/* QUICK PILL: SOLO REEL */}
          <button
            type="button"
            onClick={() => setSelectedType((prev) => (prev === 'reel' ? 'all' : 'reel'))}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
              selectedType === 'reel'
                ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            🎬 Solo Reel
          </button>

          {/* QUICK PILL: DA INBOX AI */}
          <button
            type="button"
            onClick={() => setOnlyAiOrigin((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
              onlyAiOrigin
                ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Da Inbox AI
          </button>

          {/* FILTRO FORMATO DROPDOWN */}
          <div className="relative">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="pl-3 pr-8 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-medium appearance-none cursor-pointer"
            >
              <option value="all">Tutti i Formati</option>
              <option value="reel">🎬 Reel</option>
              <option value="story">📱 Storia</option>
              <option value="carousel">📑 Carosello</option>
              <option value="post">🖼️ Post</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* FILTRO PILASTRO DROPDOWN */}
          <div className="relative">
            <select
              value={selectedPillar}
              onChange={(e) => setSelectedPillar(e.target.value)}
              className="pl-3 pr-8 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-medium appearance-none cursor-pointer"
            >
              <option value="all">Tutti i Pilastri</option>
              <option value="technique_execution">🏋️ Tecnica & Esecuzione</option>
              <option value="common_mistakes">❌ Errori Comuni</option>
              <option value="mindset_discipline">🧠 Mindset</option>
              <option value="nutrition_science">🥗 Nutrizione</option>
              <option value="client_transformation">⭐ Trasformazioni</option>
              <option value="coaching_faq">💬 FAQ</option>
              <option value="authority_lifestyle">👑 Authority</option>
              <option value="promotion_launch">🚀 Promozione</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* RESET FILTRI ATTIVI */}
          {(selectedType !== 'all' || selectedPillar !== 'all' || statusFilter !== 'all' || onlyAiOrigin || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSelectedType('all');
                setSelectedPillar('all');
                setStatusFilter('all');
                setOnlyAiOrigin(false);
                setSearchQuery('');
              }}
              className="text-[11px] text-rose-400 hover:text-rose-300 font-bold underline cursor-pointer ml-1"
            >
              Azzera filtri
            </button>
          )}
        </div>

        {/* RICERCA TESTUALE A DESTRA */}
        <div className="relative min-w-[240px] sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cerca per titolo, hook o note..."
            className="w-full pl-9 pr-8 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="p-1 text-slate-400 hover:text-white absolute right-2 top-1/2 -translate-y-1/2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* VISTA PRINCIPALE */}
      {viewMode === 'feed' ? (
        <ContentFeedView
          contents={filteredContents}
          onEditContent={handleEditContent}
          onNewContent={(status) => handleOpenNew(status)}
        />
      ) : viewMode === 'kanban' ? (
        <ContentKanbanBoard
          contents={filteredContents}
          onEditContent={handleEditContent}
          onNewContent={(status) => handleOpenNew(status)}
        />
      ) : (
        <ContentListView
          contents={filteredContents}
          onEditContent={handleEditContent}
        />
      )}

      {/* MODALE EDITOR CENTRATA */}
      {isEditorOpen && (
        <ContentDrawerEditor
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          contentToEdit={contentToEdit}
          initialData={contentToEdit ? undefined : { status: defaultNewStatus }}
        />
      )}
    </div>
  );
};
