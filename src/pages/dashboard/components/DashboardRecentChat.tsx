import React from 'react';
import { MessageSquare, ChevronRight, User } from 'lucide-react';
import { useMessages } from '../../../context/MessagesContext';
import { useApp } from '../../../context/AppContext';

export const DashboardRecentChat: React.FC = () => {
  const { conversations } = useMessages();
  const { setActiveTab } = useApp();

  // Get the most recent 5 conversations that have messages
  const recentChats = conversations
    .filter(c => c.last_message !== null)
    .slice(0, 5);

  return (
    <div className="p-6 rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 shadow-2xl space-y-5 relative overflow-hidden group h-full">
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none group-hover:bg-emerald-500/10 transition-all duration-700" />
      
      <div className="relative z-10 flex items-center justify-between border-b border-slate-800/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-black text-white">Chat Atleti</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Ultimi messaggi ricevuti.
          </p>
        </div>
        <button
          onClick={() => setActiveTab('messaggi')}
          className="text-xs font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1"
        >
          Apri Chat
        </button>
      </div>

      <div className="relative z-10 space-y-2 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
        {recentChats.length === 0 ? (
          // MOCK DATA PER MOSTRARE IL DESIGN SE NON CI SONO CHAT REALI
          [
            { id: '1', initials: 'MR', name: 'Marco Rossi', text: 'Ciao Coach, la scheda di oggi era tosta!', unread: 2 },
            { id: '2', initials: 'GL', name: 'Giulia Bianchi', text: 'Posso spostare l\'allenamento a domani?', unread: 1 },
            { id: '3', initials: 'FR', name: 'Federico Romano', text: 'Video dell\'esecuzione caricato', unread: 0 },
            { id: '4', initials: 'LB', name: 'Luca Brambilla', text: 'Grazie per i consigli sull\'alimentazione.', unread: 0 },
            { id: '5', initials: 'SM', name: 'Sara Martini', text: 'Ho ancora un po\' di fastidio alla spalla.', unread: 0 },
          ].map(chat => (
            <div
              key={chat.id}
              onClick={() => setActiveTab('messaggi')}
              className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-800/80 transition-all flex items-center justify-between gap-3 cursor-pointer group/item"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-400 group-hover/item:text-white transition-colors shrink-0">
                    {chat.initials}
                  </div>
                  {chat.unread > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900 text-[9px] font-black text-white flex items-center justify-center">
                      {chat.unread}
                    </span>
                  )}
                </div>
                
                <div className="truncate">
                  <h4 className="text-sm font-bold text-white truncate group-hover/item:text-emerald-400 transition-colors">
                    {chat.name}
                  </h4>
                  <p className={`text-xs truncate ${chat.unread > 0 ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                    {chat.text}
                  </p>
                </div>
              </div>
              
              <ChevronRight className="w-4 h-4 text-slate-600 group-hover/item:text-emerald-400 group-hover/item:translate-x-1 transition-all shrink-0" />
            </div>
          ))
        ) : (
          recentChats.map(chat => (
            <div
              key={chat.athlete_id}
              onClick={() => setActiveTab('messaggi')}
              className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-800/80 transition-all flex items-center justify-between gap-3 cursor-pointer group/item"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-400 group-hover/item:text-white transition-colors shrink-0">
                    {chat.athlete_initials || <User className="w-4 h-4" />}
                  </div>
                  {chat.unread_count > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900 text-[9px] font-black text-white flex items-center justify-center">
                      {chat.unread_count}
                    </span>
                  )}
                </div>
                
                <div className="truncate">
                  <h4 className="text-sm font-bold text-white truncate group-hover/item:text-emerald-400 transition-colors">
                    {chat.athlete_name}
                  </h4>
                  <p className={`text-xs truncate ${chat.unread_count > 0 ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                    {chat.last_message?.content || 'Nessun messaggio'}
                  </p>
                </div>
              </div>
              
              <ChevronRight className="w-4 h-4 text-slate-600 group-hover/item:text-emerald-400 group-hover/item:translate-x-1 transition-all shrink-0" />
            </div>
          ))
        )}
      </div>
    </div>
  );
};
