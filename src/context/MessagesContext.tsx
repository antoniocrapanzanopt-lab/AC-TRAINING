import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { Message, Conversation } from '../types/chat';
import { useAthletes } from './AthletesContext';

interface MessagesContextType {
  messages: Message[];
  conversations: Conversation[];
  activeConversation: Conversation | null;
  setActiveConversation: (conv: Conversation | null) => void;
  sendMessage: (receiverId: string, content: string) => Promise<void>;
  markAsRead: (senderId: string) => Promise<void>;
  loading: boolean;
}

const MessagesContext = createContext<MessagesContextType | undefined>(undefined);

export const MessagesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { athletes } = useAthletes();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Load initial messages
  useEffect(() => {
    if (!user) {
      setMessages([]);
      setLoading(false);
      return;
    }

    const fetchMessages = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
      } else {
        setMessages(data || []);
      }
      setLoading(false);
    };

    fetchMessages();

    // Subscribe to realtime changes
    const subscription = supabase
      .channel('messages_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMessages((prev) => [...prev, payload.new as Message]);
          } else if (payload.eventType === 'UPDATE') {
            setMessages((prev) =>
              prev.map((msg) => (msg.id === payload.new.id ? (payload.new as Message) : msg))
            );
          } else if (payload.eventType === 'DELETE') {
            setMessages((prev) => prev.filter((msg) => msg.id !== payload.old.id));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // Se lo abbiamo appena inviato noi, potrebbe essere già nello stato (gestito in modo ottimistico), ma per semplicità aggiungiamo se non c'è.
            setMessages((prev) => {
               if (prev.find(m => m.id === payload.new.id)) return prev;
               return [...prev, payload.new as Message];
            });
          } else if (payload.eventType === 'UPDATE') {
            setMessages((prev) =>
              prev.map((msg) => (msg.id === payload.new.id ? (payload.new as Message) : msg))
            );
          } else if (payload.eventType === 'DELETE') {
            setMessages((prev) => prev.filter((msg) => msg.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user]);

  // Aggregate messages into conversations
  const conversations = useMemo(() => {
    if (!user) return [];

    const convMap = new Map<string, Conversation>();

    messages.forEach((msg) => {
      // Find the other user
      const isSender = msg.sender_id === user.id;
      const otherUserId = isSender ? msg.receiver_id : msg.sender_id;

      let athleteInfo = athletes.find(a => a.auth_user_id === otherUserId);
      
      // If no athlete found with auth_user_id, maybe the other is the coach?
      // In a real app we would have a users table to join, but here we can try to guess from the context
      let athleteName = athleteInfo ? `${athleteInfo.firstName} ${athleteInfo.lastName}` : 'Utente Sconosciuto';
      let tags = athleteInfo?.tags || [];
      
      // Fallback per test in locale senza auth_user_id corretto
      if (otherUserId === 'demo-local') {
          athleteName = 'Coach / Atleta Demo';
      }

      if (!convMap.has(otherUserId)) {
        convMap.set(otherUserId, {
          athlete_id: otherUserId,
          athlete_name: athleteName,
          athlete_initials: athleteName.substring(0, 2).toUpperCase(),
          tags: tags,
          last_message: msg,
          unread_count: (!isSender && !msg.is_read) ? 1 : 0,
        });
      } else {
        const existing = convMap.get(otherUserId)!;
        // Update last message if this one is newer
        if (new Date(msg.created_at) > new Date(existing.last_message!.created_at)) {
          existing.last_message = msg;
        }
        if (!isSender && !msg.is_read) {
          existing.unread_count += 1;
        }
      }
    });

    // Ensure we also show athletes with no messages yet if we are a coach
    if (user.role === 'owner' || user.role === 'coach') {
        athletes.forEach(athlete => {
            if (athlete.auth_user_id && !convMap.has(athlete.auth_user_id)) {
                convMap.set(athlete.auth_user_id, {
                    athlete_id: athlete.auth_user_id,
                    athlete_name: `${athlete.firstName} ${athlete.lastName}`,
                    athlete_initials: `${athlete.firstName} ${athlete.lastName}`.substring(0, 2).toUpperCase(),
                    tags: athlete.tags || [],
                    last_message: null,
                    unread_count: 0
                });
            }
        });
    }

    // Assicuriamoci che se c'è una activeConversationId, essa sia presente nella lista
    // anche se non ci sono messaggi. Questo permette la creazione dinamica di nuove chat.
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

  const sendMessage = async (receiverId: string, content: string) => {
    if (!user) return;
    
    // Optistic update (optional, relying on realtime is also fine)
    const tempMsg: Message = {
        id: `temp-${Date.now()}`,
        sender_id: user.id,
        receiver_id: receiverId,
        content,
        created_at: new Date().toISOString(),
        is_read: false
    };
    setMessages(prev => [...prev, tempMsg]);

    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        receiver_id: receiverId,
        content: content,
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending message (likely demo user):', error);
      // In un'app reale: setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
      // Qui lo manteniamo per permettere di testare l'interfaccia UI senza un auth_user_id valido.
    } else {
        // Rimpiazza temp con reale
        setMessages(prev => prev.map(m => m.id === tempMsg.id ? data : m));
    }
  };

  const markAsRead = async (senderId: string) => {
    if (!user) return;

    // Optimistic update
    setMessages((prev) =>
      prev.map((msg) =>
        msg.sender_id === senderId && msg.receiver_id === user.id && !msg.is_read
          ? { ...msg, is_read: true }
          : msg
      )
    );

    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('sender_id', senderId)
      .eq('receiver_id', user.id)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking as read:', error);
      // Revert in un caso reale...
    }
  };

  return (
    <MessagesContext.Provider
      value={{
        messages,
        conversations,
        activeConversation,
        setActiveConversation,
        sendMessage,
        markAsRead,
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
