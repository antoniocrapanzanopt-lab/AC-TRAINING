import React, { useState } from 'react';
import {
  Plus,
  Sparkles,
  Video,
  Send,
  SlidersHorizontal,
} from 'lucide-react';
import { InstagramContent, ContentStatus } from '../../types/inboxAndContent';
import { useContents } from '../../context/ContentsContext';
import { ContentPipelineCard } from './ContentPipelineCard';

interface ContentKanbanBoardProps {
  contents: InstagramContent[];
  onEditContent: (content: InstagramContent) => void;
  onNewContent: (defaultStatus?: ContentStatus) => void;
}

interface StageGroup {
  id: 'ideation' | 'production' | 'publishing';
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  borderAccent: string;
  badgeBg: string;
  badgeText: string;
  defaultStatus: ContentStatus;
  statuses: { status: ContentStatus; label: string; advanceLabel: string }[];
}

const STAGES: StageGroup[] = [
  {
    id: 'ideation',
    title: '1. Ideazione & Scrittura',
    subtitle: 'Spunti grezzi, scalette e script completi',
    icon: <Sparkles className="w-4 h-4 text-blue-400" />,
    borderAccent: 'border-blue-500/30',
    badgeBg: 'bg-blue-500/20',
    badgeText: 'text-blue-300',
    defaultStatus: 'idea',
    statuses: [
      { status: 'idea', label: '💡 Idee & Spunti', advanceLabel: 'Scrivi Script ➔' },
      { status: 'script_draft', label: '📝 Script in Bozza', advanceLabel: 'Pronto per Video ➔' },
    ],
  },
  {
    id: 'production',
    title: '2. Produzione & Video',
    subtitle: 'Da registrare in studio e da montare',
    icon: <Video className="w-4 h-4 text-amber-400" />,
    borderAccent: 'border-amber-500/40',
    badgeBg: 'bg-amber-500/20',
    badgeText: 'text-amber-300',
    defaultStatus: 'ready_to_record',
    statuses: [
      { status: 'ready_to_record', label: '🎬 Da Registrare', advanceLabel: 'Registrato ➔ Monta' },
      { status: 'editing', label: '✂️ In Montaggio', advanceLabel: 'Pronto per Pubblicare ➔' },
    ],
  },
  {
    id: 'publishing',
    title: '3. Uscite & Pubblicati',
    subtitle: 'Pronti per Instagram, programmati e archivio',
    icon: <Send className="w-4 h-4 text-emerald-400" />,
    borderAccent: 'border-emerald-500/30',
    badgeBg: 'bg-emerald-500/20',
    badgeText: 'text-emerald-300',
    defaultStatus: 'ready_to_publish',
    statuses: [
      { status: 'ready_to_publish', label: '🚀 Pronti da Pubblicare', advanceLabel: 'Segna Pubblicato ✅' },
      { status: 'published', label: '✅ Pubblicati', advanceLabel: 'Completato' },
    ],
  },
];

const ORDERED_STATUSES: ContentStatus[] = [
  'idea',
  'script_draft',
  'ready_to_record',
  'editing',
  'ready_to_publish',
  'published',
];

export const ContentKanbanBoard: React.FC<ContentKanbanBoardProps> = ({
  contents,
  onEditContent,
  onNewContent,
}) => {
  const { moveStatus } = useContents();
  const [layoutMode, setLayoutMode] = useState<'3_stages' | '6_columns'>('3_stages');
  const [activeSubFilter, setActiveSubFilter] = useState<{ [key: string]: string }>({
    ideation: 'all',
    production: 'all',
    publishing: 'all',
  });

  const getStatusOrder = (status: ContentStatus): number => {
    return ORDERED_STATUSES.indexOf(status);
  };

  const handleMove = (content: InstagramContent, direction: 'prev' | 'next') => {
    const currentIdx = getStatusOrder(content.status);
    if (direction === 'prev' && currentIdx > 0) {
      moveStatus(content.id, ORDERED_STATUSES[currentIdx - 1]);
    } else if (direction === 'next' && currentIdx < ORDERED_STATUSES.length - 1) {
      moveStatus(content.id, ORDERED_STATUSES[currentIdx + 1]);
    }
  };

  return (
    <div className="space-y-4">
      {/* BARRA SUPERIORE LAYOUT ZERO-SCROLL */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-slate-400">
          <span className="text-white font-bold">Studio Hub Instagram:</span>
          <span className="hidden sm:inline text-slate-500">3 Fasi Chiave del Workflow</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLayoutMode((prev) => (prev === '3_stages' ? '6_columns' : '3_stages'))}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer flex items-center gap-1.5 font-bold"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {layoutMode === '3_stages' ? 'Vista 3 Macro-Fasi (Zero Scroll)' : 'Vista 6 Colonne'}
          </button>
        </div>
      </div>

      {/* DISPOSIZIONE 1: STUDIO A 3 FASI ZERO-SCROLL (DEFAULT) */}
      {layoutMode === '3_stages' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          {STAGES.map((stage) => {
            const stageStatusValues = stage.statuses.map((s) => s.status);
            const rawStageContents = contents.filter((c) => stageStatusValues.includes(c.status));
            
            const subFilter = activeSubFilter[stage.id] || 'all';
            const stageContents = rawStageContents.filter((c) => {
              if (subFilter === 'all') return true;
              return c.status === subFilter;
            });

            return (
              <div
                key={stage.id}
                className={`bg-slate-900/50 border ${stage.borderAccent} rounded-3xl p-4 flex flex-col min-h-[560px] shadow-2xl backdrop-blur-sm space-y-4 relative`}
              >
                {/* INTESTAZIONE MACRO-COLONNA */}
                <div className="border-b border-slate-800/80 pb-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-xl bg-slate-950 border border-slate-800 shadow-inner">
                        {stage.icon}
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-white">{stage.title}</h3>
                        <p className="text-[10px] text-slate-400">{stage.subtitle}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-black ${stage.badgeBg} ${stage.badgeText}`}>
                        {rawStageContents.length}
                      </span>
                      <button
                        onClick={() => onNewContent(stage.defaultStatus)}
                        className="p-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                        title={`Aggiungi in ${stage.title}`}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* SOTTO-FILTRI MICRO-STATI (CHIP VELOCI) */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setActiveSubFilter((prev) => ({ ...prev, [stage.id]: 'all' }))}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                        subFilter === 'all'
                          ? 'bg-slate-800 text-white font-black'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      Tutti ({rawStageContents.length})
                    </button>
                    {stage.statuses.map((st) => {
                      const count = rawStageContents.filter((c) => c.status === st.status).length;
                      return (
                        <button
                          key={st.status}
                          type="button"
                          onClick={() => setActiveSubFilter((prev) => ({ ...prev, [stage.id]: st.status }))}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                            subFilter === st.status
                              ? 'bg-slate-800 text-amber-300 font-black border border-amber-500/30'
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {st.label} ({count})
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* LISTA CARD NELLA FASE */}
                <div className="space-y-3 overflow-y-auto flex-1 max-h-[65vh] pr-1 custom-scrollbar">
                  {stageContents.length === 0 ? (
                    <div className="py-12 px-4 text-center border-2 border-dashed border-slate-800/80 rounded-2xl bg-slate-950/30 space-y-2">
                      <p className="text-xs text-slate-500 font-medium">Nessun contenuto in questa fase</p>
                      <button
                        type="button"
                        onClick={() => onNewContent(stage.defaultStatus)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-amber-400 hover:text-amber-300 text-xs font-bold rounded-xl transition cursor-pointer inline-flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Crea Contenuto
                      </button>
                    </div>
                  ) : (
                    stageContents.map((content) => {
                      const currentIdx = getStatusOrder(content.status);
                      const currentStageStatus = stage.statuses.find((s) => s.status === content.status);
                      const advanceLabel = currentStageStatus?.advanceLabel;

                      return (
                        <ContentPipelineCard
                          key={content.id}
                          content={content}
                          onEdit={onEditContent}
                          advanceActionLabel={advanceLabel}
                          canMovePrev={currentIdx > 0}
                          canMoveNext={currentIdx < ORDERED_STATUSES.length - 1}
                          onMovePrev={() => handleMove(content, 'prev')}
                          onMoveNext={() => handleMove(content, 'next')}
                        />
                      );
                    })
                  )}
                </div>

                {/* FOOTER COLONNA CON QUICK ADD */}
                <button
                  type="button"
                  onClick={() => onNewContent(stage.defaultStatus)}
                  className="w-full py-2.5 rounded-2xl bg-slate-950/70 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4 text-amber-400" />
                  <span>Aggiungi a {stage.title.split('.')[1]}</span>
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        /* DISPOSIZIONE 2: SCROLLER A 6 COLONNE */
        <div className="flex gap-4 overflow-x-auto pb-6 min-h-[500px] custom-scrollbar">
          {ORDERED_STATUSES.map((status, colIdx) => {
            const columnContents = contents.filter((c) => c.status === status);
            return (
              <div
                key={status}
                className="flex-shrink-0 w-80 bg-slate-900/60 border border-slate-800/80 rounded-3xl flex flex-col max-h-[78vh] shadow-xl backdrop-blur-sm"
              >
                <div className="p-3.5 px-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/40 rounded-t-3xl">
                  <h3 className="text-xs font-black text-white">{status.toUpperCase()}</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
                    {columnContents.length}
                  </span>
                </div>
                <div className="p-3 overflow-y-auto flex-1 space-y-3 custom-scrollbar">
                  {columnContents.map((content) => (
                    <ContentPipelineCard
                      key={content.id}
                      content={content}
                      onEdit={onEditContent}
                      advanceActionLabel="Avanza ➔"
                      canMovePrev={colIdx > 0}
                      canMoveNext={colIdx < ORDERED_STATUSES.length - 1}
                      onMovePrev={() => handleMove(content, 'prev')}
                      onMoveNext={() => handleMove(content, 'next')}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
