import React, { useState, useMemo } from 'react';
import { Search, MessageSquare, Circle } from 'lucide-react';
import { Athlete } from '../../types';
import { useAthleteChat } from '../../context/AthleteChatContext';

interface ChatListProps {
  athletes: Athlete[];
  selectedAthleteId: string | null;
  onSelectAthlete: (athleteId: string) => void;
}

export const ChatList: React.FC<ChatListProps> = ({
  athletes,
  selectedAthleteId,
  onSelectAthlete,
}) => {
  const { getMessagesByAthlete, getUnreadCount } = useAthleteChat();
  const [search, setSearch] = useState('');

  const filteredAthletes = useMemo(() => {
    if (!search.trim()) return athletes;
    const q = search.toLowerCase();
    return athletes.filter(
      (a) =>
        a.fullName.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q)
    );
  }, [athletes, search]);

  return (
    <div className="flex flex-col h-full bg-[#1a1d24] border-r border-slate-800">
      {/* Header & Search */}
      <div className="p-4 border-b border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[var(--color-primary)]" />
            Conversazioni ({athletes.length})
          </h3>
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            className="w-full bg-slate-900 border border-slate-700/60 text-slate-100 rounded-xl pl-10 pr-3 py-2 text-xs placeholder-slate-500 focus:outline-none focus:border-[var(--color-primary)] transition-all"
            placeholder="Cerca atleta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Athlete Conversation Cards List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40 custom-scrollbar">
        {filteredAthletes.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs">
            Nessun atleta trovato.
          </div>
        ) : (
          filteredAthletes.map((athlete) => {
            const isSelected = selectedAthleteId === athlete.id;
            const msgs = getMessagesByAthlete(athlete.id);
            const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
            const unreadCount = getUnreadCount(athlete.id, 'coach');

            return (
              <button
                key={athlete.id}
                onClick={() => onSelectAthlete(athlete.id)}
                className={`w-full p-3.5 flex items-start gap-3 text-left transition-all relative ${
                  isSelected
                    ? 'bg-[var(--color-primary)]/10 border-l-4 border-l-[var(--color-primary)]'
                    : 'hover:bg-slate-800/40'
                }`}
              >
                {/* Avatar with Online Status */}
                <div className="relative shrink-0">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${
                      isSelected
                        ? 'bg-[var(--color-primary)] text-black'
                        : 'bg-slate-700 text-slate-200'
                    }`}
                  >
                    {athlete.firstName ? athlete.firstName[0] : 'A'}
                    {athlete.lastName ? athlete.lastName[0] : ''}
                  </div>
                  <Circle className="w-2.5 h-2.5 fill-emerald-500 text-emerald-500 absolute bottom-0 right-0" />
                </div>

                {/* Body Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p
                      className={`text-xs font-bold truncate ${
                        isSelected ? 'text-[var(--color-primary)]' : 'text-white'
                      }`}
                    >
                      {athlete.fullName}
                    </p>
                    {lastMsg && (
                      <span className="text-[10px] text-slate-500 shrink-0 ml-1">
                        {new Date(lastMsg.createdAt).toLocaleTimeString('it-IT', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[11px] text-slate-400 truncate">
                      {lastMsg
                        ? lastMsg.senderRole === 'coach'
                          ? `Tu: ${lastMsg.content}`
                          : lastMsg.content || (lastMsg.type !== 'text' ? '[Allegato Multimediale]' : '')
                        : 'Nessun messaggio recente'}
                    </p>

                    {/* Unread Badge */}
                    {unreadCount > 0 && (
                      <span className="shrink-0 bg-[var(--color-primary)] text-black font-black text-[10px] px-1.5 py-0.5 rounded-full shadow-sm">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
