import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  CheckCircle2,
  Filter,
  Send,
  User,
  Clock,
  MoreVertical,
  X,
} from 'lucide-react';
import { useMessages } from '../../context/MessagesContext';
import { useAuth } from '../../context/AuthContext';
import { useAthletes } from '../../context/AthletesContext';

export const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const {
    messages,
    conversations,
    activeConversation,
    setActiveConversation,
    sendMessage,
    markAsRead,
    loading
  } = useMessages();

  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [newMessage, setNewMessage] = useState('');
  
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState('');
  
  const { athletes } = useAthletes();

  // Filtri categorie uniche presenti nei tag degli atleti
  const uniqueCategories = useMemo(() => {
    const categories = new Set<string>();
    conversations.forEach(c => c.tags?.forEach(t => categories.add(t)));
    return Array.from(categories);
  }, [conversations]);

  // Lista conversazioni filtrata
  const filteredConversations = useMemo(() => {
    return conversations.filter(c => {
      const matchSearch = c.athlete_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchTab = activeTab === 'all' || c.unread_count > 0;
      const matchCategory = filterCategory === 'all' || (c.tags && c.tags.includes(filterCategory));
      return matchSearch && matchTab && matchCategory;
    });
  }, [conversations, searchQuery, activeTab, filterCategory]);

  const totalUnread = useMemo(() => {
    return conversations.reduce((acc, c) => acc + c.unread_count, 0);
  }, [conversations]);

  // Atleti filtrati per nuova chat
  const newChatAthletes = useMemo(() => {
    return athletes.filter(a => {
      const search = newChatSearch.toLowerCase();
      return a.firstName.toLowerCase().includes(search) || a.lastName.toLowerCase().includes(search);
    });
  }, [athletes, newChatSearch]);

  // Messaggi della conversazione attiva con id canonico
  const activeConversationMessages = useMemo(() => {
    if (!activeConversation) return [];
    return messages.filter(m => {
      const otherId = m.sender_id === user?.id ? m.receiver_id : m.sender_id;
      const athlete = athletes.find(a => a.auth_user_id === otherId || a.id === otherId);
      const canonicalId = athlete ? (athlete.auth_user_id || athlete.id) : otherId;
      return (
        canonicalId === activeConversation.athlete_id ||
        m.sender_id === activeConversation.athlete_id ||
        m.receiver_id === activeConversation.athlete_id
      );
    });
  }, [messages, activeConversation, user, athletes]);

  const handleStartNewChat = (athlete: any) => {
    const chatUserId = athlete.auth_user_id || athlete.id;
    
    // Cerca se esiste già la conversazione
    const existing = conversations.find(c => c.athlete_id === chatUserId);
    if (existing) {
      setActiveConversation(existing);
    } else {
      // Crea una sintetica
      setActiveConversation({
        athlete_id: chatUserId,
        athlete_name: `${athlete.firstName} ${athlete.lastName}`,
        athlete_initials: `${athlete.firstName} ${athlete.lastName}`.substring(0, 2).toUpperCase(),
        tags: athlete.tags || [],
        last_message: null,
        unread_count: 0
      });
    }
    setShowNewChatModal(false);
    setNewChatSearch('');
  };

  // Scroll to bottom when new message arrives or conversation changes
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, activeConversation]);

  // Mark as read when opening a conversation
  useEffect(() => {
    if (activeConversation && activeConversation.unread_count > 0) {
      markAsRead(activeConversation.athlete_id);
    }
  }, [activeConversation, markAsRead]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversation) return;
    
    await sendMessage(activeConversation.athlete_id, newMessage.trim());
    setNewMessage('');
  };

  const handleMarkAllAsRead = () => {
    conversations.forEach(c => {
      if (c.unread_count > 0) {
        markAsRead(c.athlete_id);
      }
    });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const today = new Date();
    
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    }
    
    return date.toLocaleDateString('it-IT', { 
      weekday: 'long', 
      day: '2-digit', 
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getTagColor = (tag: string) => {
    if (tag.toLowerCase().includes('training')) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    if (tag.toLowerCase().includes('coaching')) return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  };

  return (
    <div className="flex flex-col h-full space-y-4 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Messaggi</h1>
          <p className="text-sm text-slate-400 mt-1">
            Gestisci le conversazioni in tempo reale con i tuoi atleti.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleMarkAllAsRead}
            disabled={totalUnread === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 font-bold text-xs hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="w-4 h-4" /> Segna lette
          </button>
          
          <button
            onClick={() => setShowNewChatModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all shadow-lg"
          >
            Nuova Chat
          </button>
        </div>
      </div>

      {/* Main Layout (Master-Detail) */}
      <div className="flex-1 flex overflow-hidden rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] shadow-xl min-h-[600px] h-[calc(100vh-200px)]">
        
        {/* Left Side: Conversations List */}
        <div className="w-full md:w-80 lg:w-96 flex flex-col border-r border-[var(--color-panel-border)] bg-slate-950/30">
          
          {/* Header & Filters */}
          <div className="p-4 space-y-4 border-b border-[var(--color-panel-border)]">
            <div className="flex gap-2 p-1 bg-slate-900 rounded-xl">
              <button
                onClick={() => setActiveTab('all')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${activeTab === 'all' ? 'bg-[var(--color-primary)] text-black shadow' : 'text-slate-400 hover:text-white'}`}
              >
                Tutte
              </button>
              <button
                onClick={() => setActiveTab('unread')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${activeTab === 'unread' ? 'bg-[var(--color-primary)] text-black shadow' : 'text-slate-400 hover:text-white'}`}
              >
                Da leggere
                {totalUnread > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] leading-none">
                    {totalUnread}
                  </span>
                )}
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Cerca per nome cliente..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-slate-500"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
              <Filter className="w-4 h-4 text-slate-500 shrink-0" />
              <button
                onClick={() => setFilterCategory('all')}
                className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap border ${filterCategory === 'all' ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border-[var(--color-primary)]' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
              >
                Tutte le categorie
              </button>
              {uniqueCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap border ${filterCategory === cat ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border-[var(--color-primary)]' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
                >
                  {cat.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                Nessuna conversazione trovata.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/50">
                {filteredConversations.map(conv => (
                  <button
                    key={conv.athlete_id}
                    onClick={() => setActiveConversation(conv)}
                    className={`w-full text-left p-4 hover:bg-slate-900/50 transition-colors flex items-start gap-3 ${activeConversation?.athlete_id === conv.athlete_id ? 'bg-slate-900/80 border-l-2 border-[var(--color-primary)]' : 'border-l-2 border-transparent'}`}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {conv.athlete_avatar ? (
                        <img src={conv.athlete_avatar} alt={conv.athlete_name} className="w-12 h-12 rounded-full object-cover border border-slate-700" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-lg">
                          {conv.athlete_initials}
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-[var(--color-panel)] rounded-full"></div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="text-sm font-bold text-white truncate pr-2">{conv.athlete_name}</h4>
                        {conv.last_message && (
                          <span className="text-[10px] text-slate-500 shrink-0 mt-0.5">
                            {formatDate(conv.last_message.created_at)}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        {conv.tags?.slice(0,2).map(tag => (
                          <span key={tag} className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${getTagColor(tag)}`}>
                            {tag}
                          </span>
                        ))}
                        {conv.unread_count > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none ml-auto">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>

                      <p className={`text-xs truncate ${conv.unread_count > 0 ? 'text-white font-semibold' : 'text-slate-400'}`}>
                        {conv.last_message?.content || 'Inizia una nuova conversazione...'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Chat Window */}
        {activeConversation ? (
          <div className="flex-1 flex flex-col bg-slate-950/20">
            {/* Chat Header */}
            <div className="h-16 px-6 border-b border-[var(--color-panel-border)] flex items-center justify-between bg-slate-900/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold">
                  {activeConversation.athlete_initials}
                </div>
                <div>
                  <h3 className="text-white font-bold">{activeConversation.athlete_name}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Online
                  </div>
                </div>
              </div>
              <button className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Messages */}
            <div 
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar"
            >
              {loading ? (
                 <div className="flex justify-center py-10 text-slate-500">Caricamento...</div>
              ) : activeConversationMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-500">
                  <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mb-4">
                    <User className="w-8 h-8 text-slate-600" />
                  </div>
                  <p>Invia il tuo primo messaggio a {activeConversation.athlete_name}</p>
                </div>
              ) : (
                activeConversationMessages
                  .map((msg, idx, arr) => {
                    const isMine = msg.sender_id === user?.id;
                    const showDate = idx === 0 || new Date(msg.created_at).toDateString() !== new Date(arr[idx-1].created_at).toDateString();
                    
                    return (
                      <React.Fragment key={msg.id}>
                        {showDate && (
                          <div className="flex justify-center my-6">
                            <span className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              {new Date(msg.created_at).toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long' })}
                            </span>
                          </div>
                        )}
                        <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                          <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm shadow-sm ${
                            isMine 
                              ? 'bg-[var(--color-primary)] text-black rounded-tr-sm' 
                              : 'bg-slate-800 text-white rounded-tl-sm border border-slate-700'
                          }`}>
                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                          </div>
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500 font-medium px-1">
                            <Clock className="w-3 h-3" />
                            {new Date(msg.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })
              )}
            </div>

            {/* Chat Input */}
            <div className="p-4 bg-slate-900/50 border-t border-[var(--color-panel-border)]">
              <form onSubmit={handleSendMessage} className="flex gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Scrivi un messaggio..."
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-slate-500"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="px-5 py-3 rounded-xl bg-[var(--color-primary)] text-black hover:bg-[var(--color-primary-hover)] transition-colors flex items-center justify-center shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="hidden md:flex flex-1 flex-col items-center justify-center text-center bg-slate-950/20 text-slate-500">
            <div className="w-20 h-20 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-6">
              <Search className="w-8 h-8 text-slate-700" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Le tue conversazioni</h3>
            <p className="max-w-xs text-sm">
              Seleziona una conversazione dalla barra laterale o cerca un cliente per iniziare.
            </p>
          </div>
        )}
      </div>

      {/* Modal Nuova Chat */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowNewChatModal(false)} />
          <div className="relative w-full max-w-md bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Nuova Conversazione</h3>
              <button onClick={() => setShowNewChatModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 border-b border-slate-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Cerca atleta..."
                  value={newChatSearch}
                  onChange={e => setNewChatSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
              {newChatAthletes.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-sm">Nessun atleta trovato.</div>
              ) : (
                <div className="space-y-1">
                  {newChatAthletes.map(a => (
                    <button
                      key={a.id}
                      onClick={() => handleStartNewChat(a)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-900/80 transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold">
                        {a.firstName.charAt(0)}{a.lastName.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-bold text-white">{a.firstName} {a.lastName}</div>
                        {!a.auth_user_id && <div className="text-[10px] text-amber-500 font-medium">Non attivato</div>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
