import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ChatMessage, MessageSenderRole, MessageType } from '../types';
import { STORAGE_KEYS } from '../config/storageKeys';
import { getStorageItem, setStorageItem } from '../lib/storage';
import { useNotifications } from './NotificationsContext';

interface AthleteChatContextValue {
  messages: ChatMessage[];
  sendMessage: (
    athleteId: string,
    senderRole: MessageSenderRole,
    senderName: string,
    content: string,
    type?: MessageType,
    mediaUrl?: string,
    mediaName?: string
  ) => ChatMessage;
  getMessagesByAthlete: (athleteId: string) => ChatMessage[];
  markAsRead: (athleteId: string, role: MessageSenderRole) => void;
  getUnreadCount: (athleteId: string, role: MessageSenderRole) => number;
}

const AthleteChatContext = createContext<AthleteChatContextValue | null>(null);

export const AthleteChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { addNotification } = useNotifications();
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return getStorageItem<ChatMessage[]>(STORAGE_KEYS.ATHLETE_CHAT_MESSAGES, []);
  });

  useEffect(() => {
    setStorageItem(STORAGE_KEYS.ATHLETE_CHAT_MESSAGES, messages);
  }, [messages]);

  const sendMessage = useCallback(
    (
      athleteId: string,
      senderRole: MessageSenderRole,
      senderName: string,
      content: string,
      type: MessageType = 'text',
      mediaUrl?: string,
      mediaName?: string
    ): ChatMessage => {
      const now = new Date().toISOString();
      const newMessage: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        athleteId,
        senderRole,
        senderName,
        type,
        content,
        mediaUrl,
        mediaName,
        readByCoach: senderRole === 'coach',
        readByAthlete: senderRole === 'athlete',
        createdAt: now,
      };

      setMessages((prev) => [...prev, newMessage]);

      // Innesco notifica nel Centro Notifiche del Coach se inviato dall'atleta
      if (senderRole === 'athlete' && addNotification) {
        addNotification({
          type: 'report_submitted',
          athleteId,
          athleteName: senderName,
          title: `💬 Nuovo messaggio da ${senderName}`,
          message: content.length > 70 ? `${content.slice(0, 70)}...` : content || 'Inviato un allegato multimediale',
          metadata: { conversationAthleteId: athleteId },
        });
      }

      return newMessage;
    },
    [addNotification]
  );

  const getMessagesByAthlete = useCallback(
    (athleteId: string): ChatMessage[] => {
      return messages.filter((m) => m.athleteId === athleteId);
    },
    [messages]
  );

  const markAsRead = useCallback((athleteId: string, role: MessageSenderRole) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.athleteId !== athleteId) return m;
        if (role === 'coach' && !m.readByCoach) return { ...m, readByCoach: true };
        if (role === 'athlete' && !m.readByAthlete) return { ...m, readByAthlete: true };
        return m;
      })
    );
  }, []);

  const getUnreadCount = useCallback(
    (athleteId: string, role: MessageSenderRole): number => {
      return messages.filter((m) => {
        if (m.athleteId !== athleteId) return false;
        return role === 'coach' ? !m.readByCoach : !m.readByAthlete;
      }).length;
    },
    [messages]
  );

  return (
    <AthleteChatContext.Provider
      value={{
        messages,
        sendMessage,
        getMessagesByAthlete,
        markAsRead,
        getUnreadCount,
      }}
    >
      {children}
    </AthleteChatContext.Provider>
  );
};

export const useAthleteChat = (): AthleteChatContextValue => {
  const ctx = useContext(AthleteChatContext);
  if (!ctx) throw new Error('useAthleteChat must be used inside AthleteChatProvider');
  return ctx;
};
