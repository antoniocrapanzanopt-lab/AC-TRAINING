import React from 'react';
import { Video, ArrowRight, Calendar } from 'lucide-react';
import { useContents } from '../../context/ContentsContext';
import { useApp } from '../../context/AppContext';

export const ContentsTodayWidget: React.FC = () => {
  const { contents, readyToRecordCount } = useContents();
  const { setActiveTab } = useApp();

  const toRecordOrPublish = contents
    .filter((c) => c.status === 'ready_to_record' || c.status === 'ready_to_publish')
    .slice(0, 3);

  return (
    <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-purple-500/40 shadow-xl flex flex-col justify-between transition-all group">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
              <Video className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Contenuti Instagram</h3>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
            {readyToRecordCount} da registrare
          </span>
        </div>

        <p className="text-xs text-slate-400 mb-4">
          Pipeline Reel, Storie e Caroselli pronti per la registrazione o pubblicazione.
        </p>

        {toRecordOrPublish.length === 0 ? (
          <div className="py-4 text-center border border-dashed border-slate-800 rounded-xl">
            <Calendar className="w-4 h-4 text-slate-500 mx-auto mb-1" />
            <p className="text-[11px] text-slate-500">Nessun contenuto in programma oggi.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {toRecordOrPublish.map((c) => (
              <div
                key={c.id}
                className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs flex items-center justify-between gap-2"
              >
                <div className="truncate">
                  <span className="font-bold text-slate-200">{c.title}</span>
                  {c.hook && (
                    <p className="text-[10px] text-amber-400/90 italic truncate">"{c.hook}"</p>
                  )}
                </div>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border shrink-0 ${
                  c.status === 'ready_to_record'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                }`}>
                  {c.status === 'ready_to_record' ? 'Da Registrare' : 'Da Pubblicare'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
        <span className="text-[10px] text-slate-500 font-mono">Instagram Hub</span>
        <button
          type="button"
          onClick={() => setActiveTab('contenuti')}
          className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 group-hover:translate-x-0.5 transition cursor-pointer"
        >
          Apri Pipeline Contenuti
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
