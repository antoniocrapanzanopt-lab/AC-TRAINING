import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, ChevronLeft, Trash2 } from 'lucide-react';
import { useMessages } from '../../context/MessagesContext';
import { useAuth } from '../../context/AuthContext';
import { useAthletes } from '../../context/AthletesContext';

export const FloatingChatWidget: React.FC = () => {
  const { conversations, activeConversation, setActiveConversation, messages, sendMessage, markAsRead, deleteMessage, deleteConversation } = useMessages();
  const { user } = useAuth();
  const { athletes } = useAthletes();
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeMessages = activeConversation
    ? messages.filter((m) => {
        const athlete = athletes.find(a => a.id === activeConversation.athlete_id);
        const authId = athlete?.auth_user_id;
        const pkId = activeConversation.athlete_id;
        
        return m.sender_id === pkId || m.receiver_id === pkId || 
               (authId && (m.sender_id === authId || m.receiver_id === authId));
      })
    : [];

  useEffect(() => {
    if (isOpen && activeConversation) {
      markAsRead(activeConversation.athlete_id);
    }
  }, [isOpen, activeConversation, messages.length, markAsRead]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeMessages.length, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConversation) return;

    const content = inputText;
    setInputText('');
    await sendMessage(activeConversation.athlete_id, content);
  };

  const totalUnread = conversations.reduce((acc, curr) => acc + curr.unread_count, 0);

  return (
    <>
      {/* FLOATING BUTTON */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[var(--color-primary)] text-black flex items-center justify-center shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:scale-105 transition-all z-50 group"
        >
          <MessageSquare className="w-6 h-6" />
          {totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 border-2 border-[var(--color-bg)] text-white text-[10px] font-black flex items-center justify-center animate-bounce">
              {totalUnread}
            </span>
          )}
        </button>
      )}

      {/* CHAT WINDOW */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[360px] h-[550px] bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-2xl rounded-2xl flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-5">
          
          {/* HEADER */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-panel-border)] bg-[var(--color-panel)]/90 backdrop-blur-md shrink-0">
            {activeConversation ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveConversation(null)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-300">
                      {activeConversation.athlete_initials}
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-[var(--color-panel)]"></span>
                  </div>
                  <span className="text-sm font-bold text-white uppercase">{activeConversation.athlete_name}</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white">Chat Atleti</h3>
              </div>
            )}

            <div className="flex items-center gap-1">
              {activeConversation && (
                <button
                  onClick={async () => {
                    if (confirm(`Eliminare tutta la conversazione con ${activeConversation.athlete_name}?`)) {
                      await deleteConversation(activeConversation.athlete_id);
                      setActiveConversation(null);
                    }
                  }}
                  className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                  title="Elimina conversazione"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => {
                  setIsOpen(false);
                  setActiveConversation(null);
                }}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

          </div>

          {/* BODY */}
          <div className="flex-1 overflow-y-auto bg-slate-950/50 p-4 custom-scrollbar flex flex-col relative">
            {!activeConversation ? (
              /* LISTA CONVERSAZIONI */
              <div className="space-y-2">
                {conversations.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center mt-10">Nessuna conversazione attiva.</p>
                ) : (
                  conversations.map(conv => (
                    <div
                      key={conv.athlete_id}
                      onClick={() => setActiveConversation(conv)}
                      className="p-3 rounded-xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] hover:border-[var(--color-primary)]/50 cursor-pointer flex items-center justify-between gap-3 group transition-all"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="relative shrink-0">
                          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">
                            {conv.athlete_initials}
                          </div>
                          {conv.unread_count > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[9px] font-black text-white flex items-center justify-center">
                              {conv.unread_count}
                            </span>
                          )}
                        </div>
                        <div className="truncate">
                          <h4 className="text-sm font-bold text-white group-hover:text-[var(--color-primary)] transition-colors truncate">
                            {conv.athlete_name}
                          </h4>
                          <p className={`text-xs truncate ${conv.unread_count > 0 ? 'text-white font-medium' : 'text-slate-400'}`}>
                            {conv.last_message?.content || 'Nessun messaggio'}
                          </p>
                        </div>
                      </div>
                      {conv.last_message && (
                        <span className="text-[9px] text-slate-500 shrink-0 whitespace-nowrap self-start mt-1">
                          {new Date(conv.last_message.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            ) : (
              /* CHAT ATTIVA */
              <div className="space-y-4">
                {activeMessages.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center mt-10">Nessun messaggio. Scrivi per iniziare.</p>
                ) : (
                  activeMessages.map((msg, idx) => {
                    const isMe = msg.sender_id === user?.id;
                    return (
                      <div key={msg.id || idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}>
                        <div className="flex items-center gap-1.5 max-w-[85%] group/msg">
                          {isMe && (
                            <button
                              onClick={() => deleteMessage(msg.id)}
                              className="opacity-0 group-hover/msg:opacity-100 p-1 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded transition-all"
                              title="Elimina messaggio"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                          <div
                            className={`rounded-2xl px-4 py-2.5 text-sm flex-1 ${
                              isMe
                                ? 'bg-[var(--color-primary)] text-black rounded-tr-sm'
                                : 'bg-[var(--color-panel)] border border-[var(--color-panel-border)] text-slate-200 rounded-tl-sm'
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                          </div>
                          {!isMe && (
                            <button
                              onClick={() => deleteMessage(msg.id)}
                              className="opacity-0 group-hover/msg:opacity-100 p-1 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded transition-all"
                              title="Elimina messaggio"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <span className="text-[9px] text-slate-500 mt-1 px-1">
                          {new Date(msg.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* INPUT AREA (Only if conversation is active) */}
          {activeConversation && (
            <div className="p-3 border-t border-[var(--color-panel-border)] bg-[var(--color-panel)] shrink-0">
              <form onSubmit={handleSend} className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Scrivi un messaggio..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="p-2 rounded-xl bg-[var(--color-primary)] text-black hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </>
  );
};
