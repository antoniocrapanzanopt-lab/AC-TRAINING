import React from 'react';
import { Inbox, ArrowRight, Lightbulb } from 'lucide-react';
import { useInbox } from '../../context/InboxContext';
import { useApp } from '../../context/AppContext';

export const InboxAIWidget: React.FC = () => {
  const { entries, unprocessedCount } = useInbox();
  const { setActiveTab } = useApp();

  const recentUnprocessed = entries
    .filter((e) => e.status === 'raw' || e.status === 'processed')
    .slice(0, 3);

  return (
    <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 shadow-xl flex flex-col justify-between transition-all group">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <Inbox className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Inbox AI & Brain Dump</h3>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            {unprocessedCount} da smistare
          </span>
        </div>

        <p className="text-xs text-slate-400 mb-4">
          Idee veloci e osservazioni sui clienti in attesa di essere trasformate in contenuti o task.
        </p>

        {recentUnprocessed.length === 0 ? (
          <div className="py-4 text-center border border-dashed border-slate-800 rounded-xl">
            <Lightbulb className="w-4 h-4 text-slate-500 mx-auto mb-1" />
            <p className="text-[11px] text-slate-500">Inbox vuota! Nessun pensiero in sospeso.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentUnprocessed.map((e) => (
              <div
                key={e.id}
                className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs flex items-center justify-between gap-2"
              >
                <div className="truncate">
                  <span className="font-bold text-slate-200">{e.ai_title || e.raw_content}</span>
                  {e.ai_summary && (
                    <p className="text-[10px] text-slate-400 truncate">{e.ai_summary}</p>
                  )}
                </div>
                {e.ai_content_opportunity?.hasOpportunity && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                    Idea {e.ai_content_opportunity.suggestedType.toUpperCase()}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
        <span className="text-[10px] text-slate-500 font-mono">Gemini 3.7 Flash</span>
        <button
          type="button"
          onClick={() => setActiveTab('inbox_ai')}
          className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 group-hover:translate-x-0.5 transition cursor-pointer"
        >
          Apri Inbox AI
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
