import React, { useState, useEffect, useRef } from 'react';
import { Send, User, Clock, ArrowLeft } from 'lucide-react';
import { useMessages } from '../../context/MessagesContext';
import { useAuth } from '../../context/AuthContext';

interface AthleteChatProps {
  onBack?: () => void;
}

export const AthleteChat: React.FC<AthleteChatProps> = ({ onBack }) => {
  const { user } = useAuth();
  const { messages, sendMessage, loading, markAsRead } = useMessages();
  const [newMessage, setNewMessage] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Per l'atleta, il coach è l'altro partecipante (o receiver o sender).
  // Se non ci sono messaggi, non sappiamo il suo ID a meno che non lo passiamo.
  // Ma in questa demo, la chat coach-atleta assume che il coach ci abbia contattato o 
  // che possiamo estrarre l'ID del coach. Se user.role === 'athlete', 
  // il coach ID è in genere quello assegnato all'atleta (es. 'demo-local' o un uuid).
  // Per semplicità, filtriamo i messaggi dove l'atleta è coinvolto.
  
  const athleteMessages = messages.filter(m => m.sender_id === user?.id || m.receiver_id === user?.id);
  
  // Troviamo il coach ID dal primo messaggio
  const coachId = athleteMessages.length > 0 
    ? (athleteMessages[0].sender_id === user?.id ? athleteMessages[0].receiver_id : athleteMessages[0].sender_id)
    : 'demo-local'; // fallback

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    // Segna come letti i messaggi ricevuti dal coach
    if (coachId) {
      markAsRead(coachId);
    }
  }, [messages, coachId, markAsRead]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;
    
    await sendMessage(coachId, newMessage.trim());
    setNewMessage('');
  };

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 p-4 flex items-center gap-3 sticky top-0 z-10">
        {onBack && (
          <button onClick={onBack} className="p-2 text-slate-400 hover:text-white rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)] font-bold">
          C
        </div>
        <div>
          <h2 className="text-white font-bold text-sm">Il Tuo Coach</h2>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Online
          </div>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-950/50"
      >
        {loading ? (
          <div className="flex justify-center py-10 text-slate-500 text-sm">Caricamento messaggi...</div>
        ) : athleteMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-500">
            <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mb-4">
              <User className="w-8 h-8 text-slate-600" />
            </div>
            <p className="text-sm">Invia un messaggio al tuo coach per iniziare.</p>
          </div>
        ) : (
          athleteMessages.map((msg, idx, arr) => {
            const isMine = msg.sender_id === user?.id;
            const showDate = idx === 0 || new Date(msg.created_at).toDateString() !== new Date(arr[idx-1].created_at).toDateString();
            
            return (
              <React.Fragment key={msg.id}>
                {showDate && (
                  <div className="flex justify-center my-4">
                    <span className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      {new Date(msg.created_at).toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long' })}
                    </span>
                  </div>
                )}
                <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                    isMine 
                      ? 'bg-[var(--color-primary)] text-black rounded-tr-sm' 
                      : 'bg-slate-800 text-white rounded-tl-sm border border-slate-700'
                  }`}>
                    <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
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

      {/* Input */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 sticky bottom-[60px]">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Scrivi un messaggio..."
            className="flex-1 px-4 py-2.5 rounded-full bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-slate-500"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="w-10 h-10 rounded-full bg-[var(--color-primary)] text-black hover:bg-[var(--color-primary-hover)] transition-colors flex items-center justify-center shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
