import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { Message, Conversation } from '../types/chat';
import { useAthletes } from './AthletesContext';
import { WebPushService } from '../lib/push/pushService';

interface MessagesContextType {
  messages: Message[];
  conversations: Conversation[];
  activeConversation: Conversation | null;
  setActiveConversation: (conv: Conversation | null) => void;
  sendMessage: (receiverId: string, content: string) => Promise<void>;
  markAsRead: (senderId: string) => Promise<void>;
  markAsUnread: (athleteId: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<{ success: boolean; error?: string }>;
  editMessage: (messageId: string, newContent: string) => Promise<{ success: boolean; error?: string }>;
  deleteConversation: (athleteId: string) => Promise<{ success: boolean; error?: string }>;
  loading: boolean;
}

const MessagesContext = createContext<MessagesContextType | undefined>(undefined);

export const MessagesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { athletes } = useAthletes();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const userId = user?.id;
  const athleteId = user?.athleteId;

  // Load initial messages & setup Realtime
  useEffect(() => {
    if (!userId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    const validIds = [userId, athleteId].filter(Boolean) as string[];
    const orConditions = validIds.map(id => `sender_id.eq.${id},receiver_id.eq.${id}`).join(',');

    const fetchMessages = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(orConditions)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
      } else if (data) {
        setMessages((prev) => {
          const tempMsgs = prev.filter(m => m.id.startsWith('temp-'));
          const dbIds = new Set(data.map(m => m.id));
          const filteredTemp = tempMsgs.filter(t => !dbIds.has(t.id));
          return [...data, ...filteredTemp];
        });
      }
      setLoading(false);
    };

    fetchMessages();

    // Channel dedicato in tempo reale (WebSockets a 0ms)
    const channelName = `messages_channel_${userId}`;
    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMsg = payload.new as Message;
          const oldMsg = payload.old as Message;
          if (payload.eventType === 'INSERT') {
            if (newMsg && (validIds.includes(newMsg.sender_id) || validIds.includes(newMsg.receiver_id))) {
              setMessages((prev) => {
                if (prev.some((m) => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });

              // Notifica nativa di sistema su smartphone/desktop se il messaggio è in arrivo
              if (newMsg.receiver_id === userId && newMsg.sender_id !== userId) {
                const ath = athletes.find((a) => a.auth_user_id === newMsg.sender_id || a.id === newMsg.sender_id);
                const senderName = ath ? `${ath.firstName} ${ath.lastName}` : 'Atleta';
                let bodyText = newMsg.content;
                if (bodyText.includes('📷 [Immagine] ')) bodyText = '📷 Ha inviato una foto';
                else if (bodyText.includes('🎥 [Video] ')) bodyText = '🎥 Ha inviato un video';
                else if (bodyText.includes('📎 [File] ')) bodyText = '📎 Ha inviato un documento';

                WebPushService.showLocalNotification(`Nuovo messaggio da ${senderName}`, {
                  body: bodyText,
                  tag: `chat-${newMsg.sender_id}`,
                  url: '/messaggi',
                }).catch(() => {});
              }
            }
          } else if (payload.eventType === 'UPDATE') {
            setMessages((prev) =>
              prev.map((msg) => (msg.id === newMsg.id ? newMsg : msg))
            );
          } else if (payload.eventType === 'DELETE') {
            setMessages((prev) => prev.filter((msg) => msg.id !== oldMsg.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [userId, athleteId]);

  // Aggregate messages into conversations
  const conversations = useMemo(() => {
    if (!user) return [];

    const convMap = new Map<string, Conversation>();

    // 1. Inizializziamo le conversazioni per TUTTI gli atleti a priori (così garantiamo il matching al PK)
    if (user.role === 'owner' || user.role === 'coach') {
      athletes.forEach(athlete => {
        convMap.set(athlete.id, {
          athlete_id: athlete.id, // Chiave UNIVOCA Canonica (Primary Key)
          athlete_name: `${athlete.firstName} ${athlete.lastName}`,
          athlete_initials: `${athlete.firstName} ${athlete.lastName}`.substring(0, 2).toUpperCase(),
          tags: athlete.tags || [],
          last_message: null,
          unread_count: 0,
        });
      });
    }

    // 2. Assegniamo i messaggi ai rispettivi atleti
    messages.forEach((msg) => {
      const isSender = msg.sender_id === user.id;
      const otherId = isSender ? msg.receiver_id : msg.sender_id;
      
      let canonicalAthleteId = otherId;
      
      if (user.role === 'coach' || user.role === 'owner') {
        // Riconduce l'ID di autenticazione all'ID anagrafico PK (che ha creato il convMap)
        const ath = athletes.find(a => a.auth_user_id === otherId || a.id === otherId);
        if (ath) {
          canonicalAthleteId = ath.id;
        }
      }

      if (user.role === 'coach' || user.role === 'owner') {
        const existing = convMap.get(canonicalAthleteId);
        if (existing) {
          if (!existing.last_message || new Date(msg.created_at) > new Date(existing.last_message.created_at)) {
            existing.last_message = msg;
          }
          if (!isSender && !msg.is_read) {
            existing.unread_count += 1;
          }
        }
      } else {
        // Modalità Atleta (Vista Singola)
        if (!convMap.has(canonicalAthleteId)) {
          convMap.set(canonicalAthleteId, {
            athlete_id: canonicalAthleteId,
            athlete_name: 'Coach',
            athlete_initials: 'C',
            tags: [],
            last_message: msg,
            unread_count: (!isSender && !msg.is_read) ? 1 : 0,
          });
        } else {
          const existing = convMap.get(canonicalAthleteId)!;
          if (new Date(msg.created_at) > new Date(existing.last_message!.created_at)) {
            existing.last_message = msg;
          }
          if (!isSender && !msg.is_read) {
            existing.unread_count += 1;
          }
        }
      }
    });

    // Assicuriamoci che se c'è una activeConversationId, essa sia presente nella lista
    if (activeConversationId && !convMap.has(activeConversationId)) {
        const athlete = athletes.find(a => a.auth_user_id === activeConversationId || a.id === activeConversationId);
        if (athlete) {
            convMap.set(activeConversationId, {
                athlete_id: activeConversationId,
                athlete_name: `${athlete.firstName} ${athlete.lastName}`,
                athlete_initials: `${athlete.firstName} ${athlete.lastName}`.substring(0, 2).toUpperCase(),
                tags: athlete.tags || [],
                last_message: null,
                unread_count: 0
            });
        }
    }

    return Array.from(convMap.values()).sort((a, b) => {
      const dateA = a.last_message ? new Date(a.last_message.created_at).getTime() : 0;
      const dateB = b.last_message ? new Date(b.last_message.created_at).getTime() : 0;
      return dateB - dateA; // Descending
    });
  }, [messages, athletes, user, activeConversationId]);

  const activeConversation = useMemo(() => {
    if (!activeConversationId) return null;
    return conversations.find(c => c.athlete_id === activeConversationId) || null;
  }, [activeConversationId, conversations]);

  const setActiveConversation = useCallback((conv: Conversation | null) => {
    setActiveConversationId(conv ? conv.athlete_id : null);
  }, []);

  const sendMessage = useCallback(async (receiverId: string, content: string) => {
    if (!user) return;
    
    // 1. Risolvi subito il mittente e il destinatario dal contesto in memoria (0ms)
    const senderAuthId = user.id;
    const targetAthlete = athletes.find(a => a.id === receiverId || a.auth_user_id === receiverId);
    let finalReceiverId = targetAthlete?.auth_user_id || receiverId;

    // 2. Update ottimistico ISTANTANEO (0ms)
    const tempMsg: Message = {
      id: `temp-${Date.now()}`,
      sender_id: senderAuthId,
      receiver_id: finalReceiverId,
      content,
      created_at: new Date().toISOString(),
      is_read: false
    };
    setMessages(prev => [...prev, tempMsg]);

    // 3. Esecuzione asincrona in background su Supabase senza bloccare l'interfaccia
    (async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const realSenderId = authData?.user?.id || senderAuthId;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        
        if ((!finalReceiverId || finalReceiverId === 'demo-local' || !uuidRegex.test(finalReceiverId)) && user.role === 'athlete') {
          // 1. Tenta tramite l'ID anagrafico
          if (user.athleteId) {
            const { data: dbAth } = await supabase
              .from('athletes')
              .select('assigned_coach_id')
              .eq('id', user.athleteId)
              .maybeSingle();
            if (dbAth?.assigned_coach_id && uuidRegex.test(dbAth.assigned_coach_id)) {
              finalReceiverId = dbAth.assigned_coach_id;
            }
          }
          
          // 2. Tenta tramite auth_user_id
          if (!finalReceiverId || finalReceiverId === 'demo-local') {
            const { data: dbAth } = await supabase
              .from('athletes')
              .select('assigned_coach_id')
              .eq('auth_user_id', realSenderId)
              .maybeSingle();
            if (dbAth?.assigned_coach_id && uuidRegex.test(dbAth.assigned_coach_id)) {
              finalReceiverId = dbAth.assigned_coach_id;
            }
          }
          
          // 3. Fallback Assoluto: Cerca qualsiasi Coach esistente nel sistema
          if (!finalReceiverId || finalReceiverId === 'demo-local') {
            const { data: anyCoach } = await supabase
              .from('athletes')
              .select('assigned_coach_id')
              .not('assigned_coach_id', 'is', null)
              .neq('assigned_coach_id', 'local-owner')
              .limit(1)
              .maybeSingle();
            if (anyCoach?.assigned_coach_id && uuidRegex.test(anyCoach.assigned_coach_id)) {
              finalReceiverId = anyCoach.assigned_coach_id;
            } else {
              // 4. Fallback Estremo
              const { data: anyMsg } = await supabase
                .from('messages')
                .select('sender_id')
                .neq('sender_id', realSenderId)
                .limit(1)
                .maybeSingle();
              if (anyMsg?.sender_id && uuidRegex.test(anyMsg.sender_id)) {
                finalReceiverId = anyMsg.sender_id;
              }
            }
          }
        }

        const { data, error } = await supabase
          .from('messages')
          .insert({
            sender_id: realSenderId,
            receiver_id: finalReceiverId,
            content: content,
          })
          .select()
          .single();

        if (error) {
          console.error('Error sending message to Supabase:', error);
          setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
        } else if (data) {
          setMessages(prev => prev.map(m => m.id === tempMsg.id ? data : m));

          // Se il mittente è un atleta, invia notifica al coach
          if (user.role === 'athlete' && finalReceiverId) {
            try {
              const athleteName = user.name || 'Atleta';
              const athleteId = user.athleteId;
              await supabase.from('coach_notifications').insert({
                coach_id: finalReceiverId,
                type: 'message_received',
                title: `Nuovo messaggio da ${athleteName}`,
                body: content.length > 80 ? content.slice(0, 80) + '...' : content,
                athlete_id: athleteId || null,
                athlete_name: athleteName,
              });
            } catch (notifErr) {
              console.warn('Errore invio notifica message_received:', notifErr);
            }
          }
        }
      } catch (err) {
        console.error('Async message send error:', err);
        setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
      }
    })();
  }, [user, athletes]);

  const markAsRead = useCallback(async (senderId: string) => {
    if (!user) return;

    // Resolves both PK and auth_user_id for the given sender
    const targetAthlete = athletes.find(a => a.id === senderId || a.auth_user_id === senderId);
    const validSenderIds = [senderId, targetAthlete?.id, targetAthlete?.auth_user_id].filter(Boolean) as string[];

    // Optimistic update solo se ci sono messaggi da leggere, previene re-render infiniti
    setMessages((prev) => {
      let hasChanges = false;
      const next = prev.map((msg) => {
        if (validSenderIds.includes(msg.sender_id) && msg.receiver_id === user.id && !msg.is_read) {
          hasChanges = true;
          return { ...msg, is_read: true };
        }
        return msg;
      });
      return hasChanges ? next : prev;
    });

    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .in('sender_id', validSenderIds)
      .eq('receiver_id', user.id)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking as read:', error);
    }
  }, [user, athletes]);

  const markAsUnread = useCallback(async (athleteId: string) => {
    if (!user) return;

    const targetAthlete = athletes.find(a => a.id === athleteId || a.auth_user_id === athleteId);
    const validSenderIds = [athleteId, targetAthlete?.id, targetAthlete?.auth_user_id].filter(Boolean) as string[];

    // 1. Trova l'ultimo messaggio della conversazione (priorità a quelli ricevuti dal coach)
    let foundMsg: Message | undefined;
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (validSenderIds.includes(m.sender_id) && m.receiver_id === user.id) {
        foundMsg = m;
        break;
      }
    }
    if (!foundMsg) {
      for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i];
        if (validSenderIds.includes(m.sender_id) || validSenderIds.includes(m.receiver_id)) {
          foundMsg = m;
          break;
        }
      }
    }

    const targetMsgId = foundMsg?.id;

    // Optimistic Update
    setMessages((prev) => {
      let idToMark = targetMsgId;
      if (!idToMark) {
        for (let i = prev.length - 1; i >= 0; i--) {
          const m = prev[i];
          if ((validSenderIds.includes(m.sender_id) && m.receiver_id === user.id) || 
              validSenderIds.includes(m.sender_id) || validSenderIds.includes(m.receiver_id)) {
            idToMark = m.id;
            break;
          }
        }
      }
      if (!idToMark) return prev;
      return prev.map((msg) => (msg.id === idToMark ? { ...msg, is_read: false } : msg));
    });

    // 2. Persistenza su Supabase
    try {
      if (targetMsgId && !targetMsgId.startsWith('temp-')) {
        await supabase
          .from('messages')
          .update({ is_read: false })
          .eq('id', targetMsgId);
      } else {
        const { data: latestMsg } = await supabase
          .from('messages')
          .select('id')
          .in('sender_id', validSenderIds)
          .eq('receiver_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestMsg?.id) {
          await supabase
            .from('messages')
            .update({ is_read: false })
            .eq('id', latestMsg.id);
        }
      }
    } catch (err) {
      console.error('Error marking as unread in Supabase:', err);
    }
  }, [user, athletes, messages]);

  const deleteMessage = useCallback(async (messageId: string) => {
    // 1. Update ottimistico immediato (0ms)
    setMessages((prev) => prev.filter((m) => m.id !== messageId));

    if (messageId.startsWith('temp-')) {
      return { success: true };
    }

    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) {
        console.error('Error deleting message from Supabase:', error);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('Delete message error:', err);
      return { success: false, error: errorMsg };
    }
  }, []);

  const editMessage = useCallback(async (messageId: string, newContent: string) => {
    // 1. Update ottimistico immediato (0ms)
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, content: newContent } : m))
    );

    if (messageId.startsWith('temp-')) {
      return { success: true };
    }

    try {
      const { error } = await supabase
        .from('messages')
        .update({ content: newContent })
        .eq('id', messageId);

      if (error) {
        console.error('Error editing message in Supabase:', error);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('Edit message error:', err);
      return { success: false, error: errorMsg };
    }
  }, []);

  const deleteConversation = useCallback(async (athleteId: string) => {
    if (!user) return { success: false, error: 'User not authenticated' };

    const targetAthlete = athletes.find(a => a.id === athleteId || a.auth_user_id === athleteId);
    const validIds = [athleteId, targetAthlete?.id, targetAthlete?.auth_user_id].filter(Boolean) as string[];

    // 1. Update ottimistico: rimuovi tutti i messaggi associati (0ms)
    setMessages((prev) =>
      prev.filter(
        (m) =>
          !(
            (validIds.includes(m.sender_id) && m.receiver_id === user.id) ||
            (m.sender_id === user.id && validIds.includes(m.receiver_id))
          )
      )
    );

    if (activeConversationId && validIds.includes(activeConversationId)) {
      setActiveConversationId(null);
    }

    // 2. Eliminazione definitiva da Supabase
    try {
      const orFilter = validIds
        .map((id) => `and(sender_id.eq.${id},receiver_id.eq.${user.id}),and(sender_id.eq.${user.id},receiver_id.eq.${id})`)
        .join(',');

      const { error } = await supabase
        .from('messages')
        .delete()
        .or(orFilter);

      if (error) {
        console.error('Error deleting conversation in Supabase:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('Delete conversation error:', err);
      return { success: false, error: errorMsg };
    }
  }, [user, athletes, activeConversationId]);

  return (
    <MessagesContext.Provider
      value={{
        messages,
        conversations,
        activeConversation,
        setActiveConversation,
        sendMessage,
        markAsRead,
        markAsUnread,
        deleteMessage,
        editMessage,
        deleteConversation,
        loading,
      }}
    >
      {children}
    </MessagesContext.Provider>
  );
};

export const useMessages = (): MessagesContextType => {
  const context = useContext(MessagesContext);
  if (!context) {
    throw new Error('useMessages deve essere utilizzato all\'interno di un MessagesProvider');
  }
  return context;
};
