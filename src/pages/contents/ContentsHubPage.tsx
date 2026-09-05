import React, { useState, useMemo } from 'react';
import {
  Video,
  Plus,
  LayoutGrid,
  List,
  Calendar as CalendarIcon,
  Search,
  RefreshCw,
  Clock,
  Flame,
  CheckCircle2,
  X,
  SlidersHorizontal,
  Send,
} from 'lucide-react';
import { useContents } from '../../context/ContentsContext';
import { ContentKanbanBoard } from '../../components/contents/ContentKanbanBoard';
import { ContentListView } from '../../components/contents/ContentListView';
import { ContentCalendarView } from '../../components/contents/ContentCalendarView';
import { ContentDrawerEditor } from '../../components/contents/ContentDrawerEditor';
import {
  InstagramContent,
  ContentStatus,
  ContentType,
  ContentPillar,
} from '../../types/inboxAndContent';

interface ContentsHubPageProps {
  initialView?: 'kanban' | 'list' | 'calendar';
  initialStatus?: string;
  onNavigateToTab?: (tab: string) => void;
}

export const ContentsHubPage: React.FC<ContentsHubPageProps> = ({
  initialView = 'kanban',
  initialStatus = 'all',
  onNavigateToTab,
}) => {
  const { contents, isLoading, refreshContents } = useContents();

  // 1. UNIFICAZIONE NAVIGAZIONE: Board (default), Lista, Calendario
  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'calendar'>(initialView);

  // 2. STATO FILTRI
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedType, setSelectedType] = useState<ContentType | 'all'>('all');
  const [selectedPillar, setSelectedPillar] = useState<ContentPillar | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'this_week' | 'this_month' | 'unscheduled'>('all');
  const [onlyAiOrigin, setOnlyAiOrigin] = useState<boolean>(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState<boolean>(false);

  // 3. DRAWER EDITOR
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [contentToEdit, setContentToEdit] = useState<InstagramContent | null>(null);
  const [defaultNewStatus, setDefaultNewStatus] = useState<ContentStatus>('idea');
  const [newScheduledDate, setNewScheduledDate] = useState<string | undefined>(undefined);

  // Calcolo data odierna
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // 4. KPI INTERATTIVI CALCOLATI
  const dueTodayCount = useMemo(() => {
    return contents.filter((c) => {
      if (c.status === 'published') return false;
      if (c.scheduled_for && c.scheduled_for.slice(0, 10) <= todayStr) return true;
      return false;
    }).length;
  }, [contents, todayStr]);

  const inProgressCount = useMemo(() => {
    return contents.filter((c) =>
      ['script_draft', 'ready_to_record', 'editing', 'recorded'].includes(c.status)
    ).length;
  }, [contents]);

  const readyToPublishCount = useMemo(() => {
    return contents.filter((c) => c.status === 'ready_to_publish').length;
  }, [contents]);

  const publishedCount = useMemo(() => {
    return contents.filter((c) => c.status === 'published').length;
  }, [contents]);

  // Conteggio filtri attivi (escluso searchQuery)
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedType !== 'all') count++;
    if (selectedPillar !== 'all') count++;
    if (statusFilter !== 'all') count++;
    if (dateFilter !== 'all') count++;
    if (onlyAiOrigin) count++;
    return count;
  }, [selectedType, selectedPillar, statusFilter, dateFilter, onlyAiOrigin]);

  // Gestione click KPI per attivare filtri corrispondenti
  const handleKpiClick = (kpiType: 'today' | 'in_progress' | 'ready' | 'published') => {
    if (kpiType === 'today') {
      setDateFilter((prev) => (prev === 'today' ? 'all' : 'today'));
    } else if (kpiType === 'in_progress') {
      setStatusFilter((prev) => (prev === 'in_progress' ? 'all' : 'in_progress'));
    } else if (kpiType === 'ready') {
      setStatusFilter((prev) => (prev === 'ready_to_publish' ? 'all' : 'ready_to_publish'));
    } else if (kpiType === 'published') {
      setStatusFilter((prev) => (prev === 'published' ? 'all' : 'published'));
    }
  };

  // 5. FILTRAGGIO CONTENUTI MEMORIZZATO
  const filteredContents = useMemo(() => {
    return contents.filter((c) => {
      // Filtro formato
      if (selectedType !== 'all' && c.type !== selectedType) return false;

      // Filtro pilastro
      if (selectedPillar !== 'all' && c.pillar !== selectedPillar) return false;

      // Filtro stato
      if (statusFilter === 'in_progress') {
        if (!['script_draft', 'ready_to_record', 'editing', 'recorded'].includes(c.status)) {
          return false;
        }
      } else if (statusFilter !== 'all' && c.status !== statusFilter) {
        return false;
      }

      // Filtro data
      if (dateFilter === 'today') {
        if (c.status === 'published') return false;
        if (!c.scheduled_for || c.scheduled_for.slice(0, 10) > todayStr) return false;
      } else if (dateFilter === 'unscheduled') {
        if (c.scheduled_for) return false;
      } else if (dateFilter === 'this_week') {
        if (!c.scheduled_for) return false;
        const sched = new Date(c.scheduled_for);
        const now = new Date();
        const diffDays = (sched.getTime() - now.getTime()) / (1000 * 3600 * 24);
        if (diffDays < -1 || diffDays > 7) return false;
      } else if (dateFilter === 'this_month') {
        if (!c.scheduled_for) return false;
        const schedMonth = c.scheduled_for.slice(0, 7);
        const currentMonth = todayStr.slice(0, 7);
        if (schedMonth !== currentMonth) return false;
      }

      // Filtro origine Inbox AI
      if (onlyAiOrigin && !c.origin_inbox_id) return false;

      // Ricerca per titolo, hook, note
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = c.title.toLowerCase().includes(q);
        const matchHook = c.hook?.toLowerCase().includes(q);
        const matchNotes = c.internal_notes?.toLowerCase().includes(q);
        if (!matchTitle && !matchHook && !matchNotes) return false;
      }

      return true;
    });
  }, [contents, selectedType, selectedPillar, statusFilter, dateFilter, onlyAiOrigin, searchQuery, todayStr]);

  // Reset filtri
  const handleResetFilters = () => {
    setSelectedType('all');
    setSelectedPillar('all');
    setStatusFilter('all');
    setDateFilter('all');
    setOnlyAiOrigin(false);
    setSearchQuery('');
  };

  const [defaultNewType, setDefaultNewType] = useState<ContentType>('reel');

  // Creazione nuovo contenuto con default status e rispetto del formato attivo o selezionato
  const handleOpenNew = (
    status: ContentStatus = 'idea',
    scheduledDate?: string,
    targetType?: ContentType
  ) => {
    setContentToEdit(null);
    setDefaultNewStatus(status);
    setNewScheduledDate(scheduledDate);
    const resolvedType = targetType || (selectedType !== 'all' ? selectedType : 'reel');
    setDefaultNewType(resolvedType);
    setIsEditorOpen(true);
  };

  const newContentInitialData = useMemo(() => {
    if (contentToEdit) return undefined;
    return {
      status: defaultNewStatus,
      scheduled_for: newScheduledDate,
      type: defaultNewType,
    };
  }, [contentToEdit, defaultNewStatus, newScheduledDate, defaultNewType]);

  const handleEditContent = (content: InstagramContent) => {
    setContentToEdit(content);
    setIsEditorOpen(true);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      
      {/* ─── 1. HEADER: TITOLO & UNICA CTA PRIMARIA [+ NUOVO CONTENUTO] ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Video className="w-5 h-5" />
            </div>
            <span>Pipeline Contenuti</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Dall'idea alla registrazione fino alla pubblicazione per Instagram
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => refreshContents()}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            title="Aggiorna contenuti"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* UNICA CTA PRIMARIA */}
          <button
            type="button"
            onClick={() => handleOpenNew('idea')}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuovo Contenuto</span>
          </button>
        </div>
      </div>

      {/* ─── 2. KPI SEMPLIFICATI E ORIENTATI ALL'AZIONE ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        
        {/* KPI 1: DA FARE OGGI */}
        <div
          onClick={() => handleKpiClick('today')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
            dateFilter === 'today'
              ? 'bg-amber-500/15 border-amber-500 ring-1 ring-amber-500/30'
              : 'bg-slate-900/70 border-slate-800/90 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-amber-400 mb-1">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Da fare oggi
            </span>
            {dateFilter === 'today' && (
              <span className="text-[9px] font-mono bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">
                Attivo
              </span>
            )}
          </div>
          <div className="text-2xl font-black text-amber-300">{dueTodayCount}</div>
        </div>

        {/* KPI 2: IN LAVORAZIONE (SCRIPT + VIDEO + MONTAGGIO) */}
        <div
          onClick={() => handleKpiClick('in_progress')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
            statusFilter === 'in_progress'
              ? 'bg-purple-500/15 border-purple-500 ring-1 ring-purple-500/30'
              : 'bg-slate-900/70 border-slate-800/90 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-purple-300 mb-1">
            <span className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-purple-400" />
              In lavorazione
            </span>
            {statusFilter === 'in_progress' && (
              <span className="text-[9px] font-mono bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">
                Attivo
              </span>
            )}
          </div>
          <div className="text-2xl font-black text-white">{inProgressCount}</div>
        </div>

        {/* KPI 3: PRONTI */}
        <div
          onClick={() => handleKpiClick('ready')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
            statusFilter === 'ready_to_publish'
              ? 'bg-emerald-500/15 border-emerald-500 ring-1 ring-emerald-500/30'
              : 'bg-slate-900/70 border-slate-800/90 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-emerald-400 mb-1">
            <span className="flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5" />
              Pronti
            </span>
            {statusFilter === 'ready_to_publish' && (
              <span className="text-[9px] font-mono bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">
                Attivo
              </span>
            )}
          </div>
          <div className="text-2xl font-black text-emerald-300">{readyToPublishCount}</div>
        </div>

        {/* KPI 4: PUBBLICATI (DATO SECONDARIO) */}
        <div
          onClick={() => handleKpiClick('published')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none opacity-80 hover:opacity-100 ${
            statusFilter === 'published'
              ? 'bg-slate-800 border-slate-600 ring-1 ring-slate-500'
              : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 mb-1">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
              Pubblicati
            </span>
            {statusFilter === 'published' && (
              <span className="text-[9px] font-mono bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                Attivo
              </span>
            )}
          </div>
          <div className="text-xl font-bold text-slate-400">{publishedCount}</div>
        </div>
      </div>

      {/* ─── 3. TOOLBAR: SWITCHER VISTA + FILTRI + RICERCA ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        
        {/* VISTA BOARD / LISTA / CALENDARIO */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl">
            {/* BOARD (DEFAULT) */}
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-amber-500 text-slate-950 shadow font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Board</span>
            </button>

            {/* LISTA */}
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-amber-500 text-slate-950 shadow font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista</span>
            </button>

            {/* CALENDARIO */}
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'calendar'
                  ? 'bg-amber-500 text-slate-950 shadow font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Calendario</span>
            </button>
          </div>

          {/* PULSANTE [FILTRI] CON CONTEGGIO ATTIVI */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFilterPanelOpen((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                activeFiltersCount > 0
                  ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filtri</span>
              {activeFiltersCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-purple-500 text-white text-[10px] font-black">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* PANNELLO FILTRI A COMPARSA */}
            {isFilterPanelOpen && (
              <div className="absolute left-0 top-full mt-2 w-72 sm:w-80 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-4 z-30 space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Filtri Pipeline
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsFilterPanelOpen(false)}
                    className="p-1 rounded text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Formato */}
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 font-bold block">Formato</label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                  >
                    <option value="all">Tutti i formati</option>
                    <option value="reel">🎬 Reel</option>
                    <option value="story">📱 Story</option>
                    <option value="carousel">📑 Carosello</option>
                    <option value="post">🖼️ Post</option>
                  </select>
                </div>

                {/* Pilastro */}
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 font-bold block">Pilastro</label>
                  <select
                    value={selectedPillar}
                    onChange={(e) => setSelectedPillar(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                  >
                    <option value="all">Tutti i pilastri</option>
                    <option value="technique_execution">🏋️ Tecnica</option>
                    <option value="common_mistakes">❌ Errori Comuni</option>
                    <option value="mindset_discipline">🧠 Mindset</option>
                    <option value="nutrition_science">🥗 Nutrizione</option>
                    <option value="client_transformation">⭐ Trasformazioni</option>
                    <option value="coaching_faq">💬 FAQ</option>
                    <option value="authority_lifestyle">👑 Authority</option>
                    <option value="promotion_launch">🚀 Lanci</option>
                  </select>
                </div>

                {/* Stato Pipeline */}
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 font-bold block">Stato Pipeline</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                  >
                    <option value="all">Tutti gli stati</option>
                    <option value="idea">💡 Idee</option>
                    <option value="script_draft">📝 Script</option>
                    <option value="ready_to_record">🎬 Da Registrare</option>
                    <option value="editing">✂️ Montaggio</option>
                    <option value="ready_to_publish">🚀 Pronti</option>
                    <option value="published">✅ Pubblicati</option>
                  </select>
                </div>

                {/* Data */}
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 font-bold block">Data Pubblicazione</label>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                  >
                    <option value="all">Tutte le date</option>
                    <option value="today">Oggi / In scadenza</option>
                    <option value="this_week">Questa settimana</option>
                    <option value="this_month">Questo mese</option>
                    <option value="unscheduled">Non programmato</option>
                  </select>
                </div>

                {/* Origine Inbox AI */}
                <div className="pt-1 flex items-center justify-between">
                  <span className="text-xs text-slate-300 font-medium">Solo da Inbox Idee</span>
                  <input
                    type="checkbox"
                    checked={onlyAiOrigin}
                    onChange={(e) => setOnlyAiOrigin(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-500 bg-slate-900 border-slate-700 cursor-pointer"
                  />
                </div>

                {/* Footer Pannello */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-xs text-rose-400 hover:underline font-bold cursor-pointer"
                  >
                    Azzera filtri
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFilterPanelOpen(false)}
                    className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white border border-slate-800"
                  >
                    Applica
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RESET RAPIDO SE CI SONO FILTRI ATTIVI */}
          {(activeFiltersCount > 0 || searchQuery) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-rose-400 hover:text-rose-300 font-bold underline cursor-pointer ml-1"
            >
              Azzera filtri
            </button>
          )}
        </div>

        {/* RICERCA SEMPRE VISIBILE */}
        <div className="relative min-w-[220px] sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cerca titolo, hook o note..."
            className="w-full pl-8 pr-7 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="p-1 text-slate-400 hover:text-white absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* ─── 4. VISTA ATTIVA: BOARD (DEFAULT) / LISTA / CALENDARIO ─── */}
      {viewMode === 'kanban' ? (
        <ContentKanbanBoard
          contents={filteredContents}
          onEditContent={handleEditContent}
          onNewContent={(status) => handleOpenNew(status)}
          onNavigateToInbox={() => onNavigateToTab?.('inbox_ai')}
        />
      ) : viewMode === 'list' ? (
        <ContentListView
          contents={filteredContents}
          onEditContent={handleEditContent}
        />
      ) : (
        <ContentCalendarView
          contents={filteredContents}
          onEditContent={handleEditContent}
          onNewContent={(status, date) => handleOpenNew(status, date)}
        />
      )}

      {/* ─── 5. DRAWER DETTAGLIO CONTENUTO (CARICATO SOLO ALL'APERTURA) ─── */}
      {isEditorOpen && (
        <ContentDrawerEditor
          isOpen={isEditorOpen}
          mode={contentToEdit && contentToEdit.id ? 'edit' : 'create'}
          onClose={() => {
            setIsEditorOpen(false);
            setContentToEdit(null);
            setNewScheduledDate(undefined);
          }}
          contentToEdit={contentToEdit}
          initialData={newContentInitialData}
        />
      )}
    </div>
  );
};
