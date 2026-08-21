import React from 'react';
import { Sparkles, Video, ArrowRight, CheckCircle2 } from 'lucide-react';
import { InboxEntry } from '../../types/inboxAndContent';
import { useInbox } from '../../context/InboxContext';

interface InboxReviewQueueProps {
  entries: InboxEntry[];
  onOpenContentModal: (entry: InboxEntry) => void;
}

export const InboxReviewQueue: React.FC<InboxReviewQueueProps> = ({
  entries,
  onOpenContentModal,
}) => {
  const { convertToTaskAction, archiveEntry } = useInbox();

  // Filtrate: solo le entry attive che richiedono un'AZIONE CONCRETA:
  // 1. Opportunità Reel/Post pronta da convertire
  // 2. Task operative estratte da approvare
  // 3. Priorità 'urgent' o 'high' da gestire
  const reviewItems = entries.filter((e) => {
    if (e.status === 'converted_content' || e.status === 'converted_task' || e.status === 'archived') {
      return false;
    }

    const hasContentOpp = Boolean(e.ai_content_opportunity?.hasOpportunity);
    const hasSuggestedTasks = Boolean(e.ai_suggested_tasks && e.ai_suggested_tasks.length > 0);
    const isHighPriority = e.ai_priority === 'urgent' || e.ai_priority === 'high';

    return hasContentOpp || hasSuggestedTasks || isHighPriority;
  });

  if (reviewItems.length === 0) {
    return null;
  }

  return (
    <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-500/10 via-slate-900/90 to-slate-950 border border-amber-500/30 shadow-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              Coda di Revisione Attiva
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-slate-950">
                {reviewItems.length} da decidere
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              L'AI ha identificato opportunità e task. Approva o converti con un click.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {reviewItems.slice(0, 3).map((item) => (
          <div
            key={item.id}
            className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-amber-500/40 flex flex-col justify-between space-y-3 transition"
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider font-mono">
                  {item.ai_category === 'content_idea' ? '💡 Idea Social' : '🏋️ Da Smistare'}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {new Date(item.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                </span>
              </div>

              <h4 className="text-xs font-bold text-white line-clamp-1">
                {item.ai_title || item.raw_content}
              </h4>

              {item.ai_content_opportunity?.hook ? (
                <p className="text-[11px] text-amber-200/90 italic line-clamp-2 bg-slate-900 p-2 rounded-xl border border-amber-500/20">
                  "{item.ai_content_opportunity.hook}"
                </p>
              ) : item.ai_summary ? (
                <p className="text-[11px] text-slate-400 line-clamp-2">
                  {item.ai_summary}
                </p>
              ) : null}
            </div>

            {/* BOTTONI DECISIONE RAPIDA */}
            <div className="pt-2 border-t border-slate-900 flex items-center justify-between gap-2">
              {item.ai_content_opportunity?.hasOpportunity ? (
                <button
                  type="button"
                  onClick={() => onOpenContentModal(item)}
                  className="flex-1 py-1.5 px-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-[10px] flex items-center justify-center gap-1 shadow-md shadow-purple-500/20 transition cursor-pointer"
                >
                  <Video className="w-3 h-3" />
                  Crea Reel
                  <ArrowRight className="w-3 h-3" />
                </button>
              ) : item.ai_suggested_tasks && item.ai_suggested_tasks.length > 0 ? (
                <button
                  type="button"
                  onClick={() => convertToTaskAction(item, item.ai_suggested_tasks![0])}
                  className="flex-1 py-1.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] flex items-center justify-center gap-1 shadow-md shadow-emerald-500/20 transition cursor-pointer"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Approva Task
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => archiveEntry(item.id)}
                  className="flex-1 py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px] transition cursor-pointer"
                >
                  Archivia
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
