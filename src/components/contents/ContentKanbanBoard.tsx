import React, { useState } from 'react';
import {
  Plus,
  Inbox,
  Sparkles,
  FileText,
  Video,
  Scissors,
  Send,
  CheckCircle2,
} from 'lucide-react';
import { InstagramContent, ContentStatus } from '../../types/inboxAndContent';
import { useContents } from '../../context/ContentsContext';
import { useInbox } from '../../context/InboxContext';
import { ContentPipelineCard } from './ContentPipelineCard';

interface ContentKanbanBoardProps {
  contents: InstagramContent[];
  onEditContent: (content: InstagramContent) => void;
  onNewContent: (defaultStatus?: ContentStatus) => void;
  onNavigateToInbox?: () => void;
}

interface ColumnDef {
  status: ContentStatus;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  borderAccent: string;
  badgeColor: string;
  headerColor: string;
  filterFn: (content: InstagramContent) => boolean;
}

const COLUMNS: ColumnDef[] = [
  {
    status: 'idea',
    label: 'Idee',
    shortLabel: '💡 Idee',
    icon: <Sparkles className="w-4 h-4 text-blue-400" />,
    borderAccent: 'border-blue-500/30',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    headerColor: 'text-blue-300',
    filterFn: (c) => c.status === 'idea',
  },
  {
    status: 'script_draft',
    label: 'Script',
    shortLabel: '📝 Script',
    icon: <FileText className="w-4 h-4 text-amber-400" />,
    borderAccent: 'border-amber-500/30',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    headerColor: 'text-amber-300',
    filterFn: (c) => c.status === 'script_draft',
  },
  {
    status: 'ready_to_record',
    label: 'Da Registrare',
    shortLabel: '🎬 Video',
    icon: <Video className="w-4 h-4 text-rose-400" />,
    borderAccent: 'border-rose-500/30',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    headerColor: 'text-rose-300',
    filterFn: (c) => c.status === 'ready_to_record',
  },
  {
    status: 'editing',
    label: 'Montaggio',
    shortLabel: '✂️ Montaggio',
    icon: <Scissors className="w-4 h-4 text-purple-400" />,
    borderAccent: 'border-purple-500/30',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    headerColor: 'text-purple-300',
    filterFn: (c) => c.status === 'editing' || c.status === 'recorded',
  },
  {
    status: 'ready_to_publish',
    label: 'Pronti',
    shortLabel: '🚀 Pronti',
    icon: <Send className="w-4 h-4 text-emerald-400" />,
    borderAccent: 'border-emerald-500/30',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    headerColor: 'text-emerald-300',
    filterFn: (c) => c.status === 'ready_to_publish',
  },
  {
    status: 'published',
    label: 'Pubblicati',
    shortLabel: '✅ Pubblicati',
    icon: <CheckCircle2 className="w-4 h-4 text-slate-300" />,
    borderAccent: 'border-slate-800',
    badgeColor: 'bg-slate-800 text-slate-400 border-slate-700',
    headerColor: 'text-slate-300',
    filterFn: (c) => c.status === 'published',
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
  onNavigateToInbox,
}) => {
  const { moveStatus } = useContents();
  const { unprocessedCount } = useInbox();

  // Tab per selezione colonna su mobile
  const [mobileActiveStatus, setMobileActiveStatus] = useState<ContentStatus>('idea');

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
      
      {/* ─── MOBILE: SELETTORE COLONNA ORIZZONTALE CON BADGE ─── */}
      <div className="md:hidden flex items-center gap-1.5 overflow-x-auto pb-2 custom-scrollbar">
        {COLUMNS.map((col) => {
          const count = contents.filter(col.filterFn).length;
          const isActive = mobileActiveStatus === col.status;
          return (
            <button
              key={col.status}
              type="button"
              onClick={() => setMobileActiveStatus(col.status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition cursor-pointer border ${
                isActive
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border-slate-800'
              }`}
            >
              <span>{col.shortLabel}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                isActive ? 'bg-slate-950/30 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── CONTENITORE COLONNE KANBAN: 6 COLONNE CHIARE ─── */}
      <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-4 min-w-full items-start">
        {COLUMNS.map((col, colIdx) => {
          const colContents = contents.filter(col.filterFn);
          const isHiddenOnMobile = mobileActiveStatus !== col.status;

          return (
            <div
              key={col.status}
              className={`w-full md:w-[290px] xl:w-[310px] shrink-0 bg-slate-900/50 border ${col.borderAccent} rounded-3xl p-3.5 flex flex-col min-h-[580px] shadow-xl backdrop-blur-sm space-y-3 ${
                isHiddenOnMobile ? 'hidden md:flex' : 'flex'
              }`}
            >
              {/* INTESTAZIONE COLONNA */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-lg bg-slate-950 border border-slate-800">
                    {col.icon}
                  </div>
                  <h3 className={`text-xs font-black uppercase tracking-wider ${col.headerColor}`}>
                    {col.label}
                  </h3>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold border ${col.badgeColor}`}>
                    {colContents.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => onNewContent(col.status)}
                    className="p-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                    title={`Aggiungi contenuto in ${col.label}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* CARD COMPATTA "INBOX IDEE" (SOLO IN CIMA ALLA COLONNA IDEE) */}
              {col.status === 'idea' && (
                <div className="p-2.5 rounded-xl bg-purple-950/20 border border-dashed border-purple-500/30 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-purple-500/15 text-purple-300 flex items-center justify-center shrink-0">
                      <Inbox className="w-3 h-3" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[11px] font-bold text-white block truncate">Inbox Idee</span>
                      <span className="text-[9px] text-purple-300/70 font-mono block">
                        {unprocessedCount} spunti
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onNavigateToInbox}
                    className="px-2 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-200 border border-purple-500/30 text-[9px] font-black shrink-0 transition cursor-pointer"
                  >
                    Converti ➔
                  </button>
                </div>
              )}

              {/* LISTA CARD CONTENUTI */}
              <div className="flex-1 space-y-2.5 overflow-y-auto custom-scrollbar max-h-[720px] pr-0.5">
                {colContents.length === 0 ? (
                  <div className="py-10 text-center text-slate-500 text-xs flex flex-col items-center justify-center space-y-2 border border-dashed border-slate-800/80 rounded-2xl">
                    <span className="text-xl opacity-40">📭</span>
                    <span>Nessun contenuto in {col.label.toLowerCase()}</span>
                    <button
                      type="button"
                      onClick={() => onNewContent(col.status)}
                      className="text-[11px] text-amber-400 font-bold hover:underline cursor-pointer"
                    >
                      + Aggiungi qui
                    </button>
                  </div>
                ) : (
                  colContents.map((content) => (
                    <ContentPipelineCard
                      key={content.id}
                      content={content}
                      onEdit={onEditContent}
                      canMovePrev={colIdx > 0}
                      canMoveNext={colIdx < COLUMNS.length - 1}
                      onMovePrev={() => handleMove(content, 'prev')}
                      onMoveNext={() => handleMove(content, 'next')}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
