import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export interface CoachNotification {
  id: string;
  coach_id: string;
  type: 'workout_completed' | 'pain_reported' | 'questionnaire_submitted' | 'message_received' | 'new_pr';
  title: string;
  body?: string;
  athlete_id?: string;
  athlete_name?: string;
  metadata?: Record<string, unknown>;
  read_at?: string | null;
  created_at: string;
}

interface NotificationsContextType {
  notifications: CoachNotification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  insertNotification: (
    coachId: string,
    payload: Omit<CoachNotification, 'id' | 'coach_id' | 'read_at' | 'created_at'>
  ) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const useNotifications = (): NotificationsContextType => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used inside NotificationsProvider');
  return ctx;
};

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<CoachNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const isCoach = user?.role === 'owner' || user?.role === 'coach';

  const loadNotifications = useCallback(async () => {
    if (!user?.id || !isCoach) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('coach_notifications')
      .select('*')
      .eq('coach_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setNotifications(data as CoachNotification[]);
    }
    setLoading(false);
  }, [user?.id, isCoach]);

  useEffect(() => {
    if (!user?.id || !isCoach) return;

    loadNotifications();

    const channel = supabase
      .channel(`coach_notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'coach_notifications',
          filter: `coach_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as CoachNotification;
          setNotifications((prev) => [newNotification, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'coach_notifications',
          filter: `coach_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as CoachNotification;
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? updated : n))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, isCoach, loadNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    if (!user?.id) return;
    const now = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: now } : n))
    );
    await supabase
      .from('coach_notifications')
      .update({ read_at: now })
      .eq('id', id)
      .eq('coach_id', user.id);
  }, [user?.id]);

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;
    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? now })));
    await supabase
      .from('coach_notifications')
      .update({ read_at: now })
      .eq('coach_id', user.id)
      .is('read_at', null);
  }, [user?.id]);

  const insertNotification = useCallback(
    async (
      coachId: string,
      payload: Omit<CoachNotification, 'id' | 'coach_id' | 'read_at' | 'created_at'>
    ) => {
      if (!coachId) return;
      await supabase.from('coach_notifications').insert({
        coach_id: coachId,
        ...payload,
      });
    },
    []
  );

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <NotificationsContext.Provider
      value={{ notifications, unreadCount, loading, markAsRead, markAllAsRead, insertNotification }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};
