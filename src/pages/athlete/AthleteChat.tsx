import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Send, Clock, ArrowLeft, CheckCheck, Check, Sparkles, MessageSquare } from 'lucide-react';
import { useMessages } from '../../context/MessagesContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

interface AthleteChatProps {
  onBack?: () => void;
}

export const AthleteChat: React.FC<AthleteChatProps> = ({ onBack }) => {
  const { user } = useAuth();
  const { messages, sendMessage, loading, markAsRead } = useMessages();
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // ID dell'utente atleta (sia sessionUser.id che athleteId)
  const myIds = useMemo(() => {
    if (!user) return [];
    return [user.id, user.athleteId].filter(Boolean) as string[];
  }, [user]);

  // Messaggi filtrati coinvolgenti l'atleta
  const athleteMessages = useMemo(() => {
    if (myIds.length === 0) return [];
    return messages.filter(m => myIds.includes(m.sender_id) || myIds.includes(m.receiver_id));
  }, [messages, myIds]);

  const [coachId, setCoachId] = useState<string>('demo-local');

  // Individuazione automatica e robusta dell'ID del Coach
  useEffect(() => {
    if (athleteMessages.length > 0) {
      const firstMsg = athleteMessages[0];
      const foundCoachId = myIds.includes(firstMsg.sender_id) ? firstMsg.receiver_id : firstMsg.sender_id;
      if (foundCoachId) setCoachId(foundCoachId);
    } else if (user?.id) {
      supabase
        .from('athletes')
        .select('assigned_coach_id')
        .eq('auth_user_id', user.id)
        .maybeSingle()
        .then(async ({ data }) => {
          let cid = data?.assigned_coach_id;
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          
          if (!cid || !uuidRegex.test(cid)) {
            const { data: anyCoach } = await supabase
              .from('athletes')
              .select('assigned_coach_id')
              .not('assigned_coach_id', 'is', null)
              .neq('assigned_coach_id', 'local-owner')
              .neq('assigned_coach_id', '')
              .limit(1)
              .maybeSingle();
              
            if (anyCoach?.assigned_coach_id && uuidRegex.test(anyCoach.assigned_coach_id)) {
              cid = anyCoach.assigned_coach_id;
            } else {
              const { data: msgData } = await supabase
                .from('messages')
                .select('sender_id')
                .neq('sender_id', user.id)
                .limit(1)
                .maybeSingle();
              if (msgData?.sender_id) {
                cid = msgData.sender_id;
              }
            }
          }
          
          if (cid) {
            setCoachId(cid);
          }
        });
    }
  }, [athleteMessages, user, myIds]);

  // Scroll sempre in fondo sui nuovi messaggi
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [athleteMessages]);

  // Segna come letti i messaggi ricevuti dal coach
  useEffect(() => {
    if (coachId && coachId !== 'demo-local') {
      markAsRead(coachId);
    }
  }, [athleteMessages, coachId, markAsRead]);

  const handleSendMessage = async (e?: React.FormEvent, textOverride?: string) => {
    if (e) e.preventDefault();
    const textToSend = textOverride || newMessage;
    if (!textToSend.trim() || !user || isSending) return;
    
    setIsSending(true);
    try {
      await sendMessage(coachId, textToSend.trim());
      if (!textOverride) setNewMessage('');
    } catch (err) {
      console.error('Error in AthleteChat handleSendMessage:', err);
    } finally {
      setIsSending(false);
    }
  };

  const quickReplies = [
    { label: '🏋️‍♂️ Domanda sulla scheda', text: 'Ciao Coach! Ho una domanda su uno degli esercizi della scheda.' },
    { label: '💪 Allenamento completato!', text: 'Ho appena completato l\'allenamento di oggi! 🔥' },
    { label: '📅 Cambiamento orario', text: 'Ciao Coach, vorrei verificare l\'orario della nostra prossima sessione.' },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 font-sans relative overflow-hidden">
      {/* Header Premium Glassmorphic */}
      <div className="bg-slate-900/90 backdrop-blur-xl border-b border-slate-800/80 px-4 py-3.5 flex items-center justify-between sticky top-0 z-20 shadow-lg shadow-black/40">
        <div className="flex items-center gap-3">
          {onBack && (
            <button 
              onClick={onBack} 
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-full transition-all active:scale-95"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--color-primary)]/30 to-amber-500/10 border border-[var(--color-primary)]/40 flex items-center justify-center text-[var(--color-primary)] font-black text-sm shadow-inner">
              C
            </div>
            <span className="absolute bottom-0 right-0 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-slate-950"></span>
            </span>
          </div>

          <div>
            <h2 className="text-white font-bold text-sm tracking-tight flex items-center gap-1.5">
              Il Tuo Coach
              <Sparkles className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            </h2>
            <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
              Online • Risposta rapida
            </p>
          </div>
        </div>

        <div className="px-3 py-1 rounded-full bg-slate-800/60 border border-slate-700/50 text-[10px] font-bold text-slate-300 uppercase tracking-wider hidden sm:block">
          Supporto Diretto
        </div>
      </div>

      {/* Area Messaggi */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar bg-gradient-to-b from-slate-950 via-slate-950/90 to-slate-900/30"
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-500 text-xs">
            <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
            <span>Sincronizzazione chat...</span>
          </div>
        ) : athleteMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8 max-w-sm mx-auto">
            <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800/80 flex items-center justify-center mb-4 text-[var(--color-primary)] shadow-xl shadow-[var(--color-primary)]/5">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Chat Diretta col Coach</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Invia un messaggio per richiedere consigli sul tuo programma, aggiornamenti o chiarimenti sugli esercizi.
            </p>

            {/* Quick Prompts Iniziali */}
            <div className="w-full space-y-2">
              {quickReplies.map((qr, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(undefined, qr.text)}
                  className="w-full p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-left text-xs font-semibold text-slate-300 hover:text-white hover:border-[var(--color-primary)]/50 hover:bg-slate-900 transition-all flex items-center justify-between group"
                >
                  <span>{qr.label}</span>
                  <Send className="w-3.5 h-3.5 text-slate-500 group-hover:text-[var(--color-primary)] transition-colors" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          athleteMessages.map((msg, idx, arr) => {
            const isMine = myIds.includes(msg.sender_id);
            const showDate = idx === 0 || new Date(msg.created_at).toDateString() !== new Date(arr[idx-1].created_at).toDateString();
            
            return (
              <React.Fragment key={msg.id}>
                {showDate && (
                  <div className="flex justify-center my-4">
                    <span className="px-3.5 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-widest shadow-sm">
                      {new Date(msg.created_at).toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                )}

                <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} group`}>
                  <div className={`max-w-[85%] sm:max-w-[75%] px-4 py-3 rounded-2xl text-sm shadow-md transition-all ${
                    isMine 
                      ? 'bg-gradient-to-r from-[var(--color-primary)] to-amber-400 text-slate-950 font-medium rounded-tr-xs shadow-[var(--color-primary)]/10' 
                      : 'bg-slate-900 text-slate-100 border border-slate-800/90 rounded-tl-xs'
                  }`}>
                    <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                  </div>
                  
                  <div className={`flex items-center gap-1 mt-1 text-[10px] font-semibold px-1 ${isMine ? 'text-slate-400' : 'text-slate-500'}`}>
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>{new Date(msg.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
                    {isMine && (
                      msg.is_read ? (
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-400 ml-0.5" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
                      )
                    )}
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
      </div>

      {/* Quick Action Chips se ci sono già messaggi */}
      {athleteMessages.length > 0 && (
        <div className="px-4 py-1.5 bg-slate-950 flex gap-2 overflow-x-auto custom-scrollbar border-t border-slate-900">
          {quickReplies.map((qr, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(undefined, qr.text)}
              className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 hover:border-[var(--color-primary)]/40 text-[11px] font-semibold text-slate-400 hover:text-white whitespace-nowrap transition-colors"
            >
              {qr.label}
            </button>
          ))}
        </div>
      )}

      {/* Input Form Floating Glass */}
      <div className="p-3 sm:p-4 bg-slate-950/95 backdrop-blur-2xl border-t border-slate-800/80 sticky bottom-0 z-10">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <div className="flex-1 flex items-center bg-slate-900/90 border border-slate-800 rounded-2xl px-4 focus-within:border-[var(--color-primary)] focus-within:ring-1 focus-within:ring-[var(--color-primary)]/40 transition-all shadow-inner">
            <input
              type="text"
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder="Scrivi un messaggio al coach..."
              disabled={isSending}
              className="w-full py-3 bg-transparent text-white text-sm focus:outline-none placeholder:text-slate-500 disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={!newMessage.trim() || isSending}
            className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-amber-500 text-slate-950 font-bold flex items-center justify-center shrink-0 shadow-lg shadow-[var(--color-primary)]/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:hover:scale-100 disabled:shadow-none"
          >
            {isSending ? (
              <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Send className="w-5 h-5 ml-0.5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
