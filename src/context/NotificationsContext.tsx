import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import {
  AppNotification,
  NotificationPreferences,
  NotificationPriority,
  NotificationFilterOptions,
} from '../types/notification';
import { WebPushService } from '../lib/push/pushService';

export interface NotificationsContextType {
  notifications: AppNotification[];
  unreadCount: number;
  unreadTrophiesCount: number;
  totalUnreadCount: number;
  hasUrgentAlert: boolean;
  loading: boolean;
  preferences: NotificationPreferences | null;
  activeToast: AppNotification | null;
  clearActiveToast: () => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  markSelectedAsRead: (ids: string[]) => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
  updatePreferences: (updates: Partial<NotificationPreferences>) => Promise<boolean>;
  enableWebPush: () => Promise<{ success: boolean; error?: string }>;
  disableWebPush: () => Promise<{ success: boolean }>;
  filterNotifications: (options: NotificationFilterOptions) => AppNotification[];
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const useNotifications = (): NotificationsContextType => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used inside NotificationsProvider');
  return ctx;
};

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);

  const isCoach = user?.role === 'owner' || user?.role === 'coach';
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Inizializza audio discreto per notifiche urgenti in-app
  useEffect(() => {
    try {
      audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audioRef.current.volume = 0.4;
    } catch (_) {}
  }, []);

  // 1. Carica le preferenze dell'utente
  useEffect(() => {
    if (!user?.id) return;
    WebPushService.getPreferences(user.id).then((prefs) => {
      if (prefs) setPreferences(prefs);
    });
  }, [user?.id]);

  // 2. Carica le notifiche dal database (con fallback se la tabella notifications è appena creata)
  const loadNotifications = useCallback(
    async (isInitial = true) => {
      if (!user?.id) return;
      setLoading(true);

      const offset = isInitial ? 0 : notifications.length;
      const limit = 50;

      try {
        // Tentativo su tabella notifications
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('recipient_user_id', user.id)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (!error && data) {
          const parsed = data as AppNotification[];
          setNotifications((prev) => (isInitial ? parsed : [...prev, ...parsed]));
          setHasMore(data.length === limit);
        } else if (error && isCoach) {
          // Fallback trasparente su coach_notifications legacy
          const { data: legacyData } = await supabase
            .from('coach_notifications')
            .select('*')
            .eq('coach_id', user.id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

          if (legacyData) {
            const mapped: AppNotification[] = legacyData.map((item: any) => ({
              id: item.id,
              recipient_user_id: item.coach_id,
              athlete_id: item.athlete_id,
              athlete_name: item.athlete_name,
              type: item.type || 'workout_completed',
              priority: (item.type === 'pain_reported' ? 'high' : 'normal') as NotificationPriority,
              title: item.title,
              body: item.body || '',
              action_url: item.athlete_id ? `/athletes?id=${item.athlete_id}` : null,
              metadata: item.metadata || {},
              channel_in_app: true,
              channel_push: false,
              push_status: 'not_requested',
              read_at: item.read_at,
              created_at: item.created_at,
              dedupe_key: null,
            }));
            setNotifications((prev) => (isInitial ? mapped : [...prev, ...mapped]));
            setHasMore(legacyData.length === limit);
          }
        }
      } catch (err) {
        console.warn('Errore caricamento notifiche:', err);
      } finally {
        setLoading(false);
      }
    },
    [user?.id, isCoach, notifications.length]
  );

  // 3. Sottoscrizione Realtime Supabase su WebSocket
  useEffect(() => {
    if (!user?.id) return;

    loadNotifications(true);

    // Canale Realtime dedicato
    const channel = supabase
      .channel(`realtime:notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as AppNotification;
          setNotifications((prev) => {
            if (prev.some((n) => n.id === newNotif.id)) return prev;
            return [newNotif, ...prev];
          });

          // Mostra toast discreto e suono solo per notifiche high o critical
          if (newNotif.priority === 'high' || newNotif.priority === 'critical') {
            setActiveToast(newNotif);
            try {
              audioRef.current?.play().catch(() => {});
            } catch (_) {}
          }

          // Notifica nativa di sistema su smartphone e desktop
          WebPushService.showLocalNotification(newNotif.title, {
            body: newNotif.body,
            tag: `notif-${newNotif.id}`,
            url: newNotif.action_url || '/notifiche',
          }).catch(() => {});
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_user_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as AppNotification;
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? { ...n, ...updated } : n))
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_user_id=eq.${user.id}`,
        },
        (payload) => {
          const deletedId = (payload.old as { id?: string })?.id;
          if (deletedId) {
            setNotifications((prev) => prev.filter((n) => n.id !== deletedId));
          }
        }
      )
      // Ascolto legacy per compatibilità
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'coach_notifications',
          filter: `coach_id=eq.${user.id}`,
        },
        (payload) => {
          const item = payload.new as any;
          const mapped: AppNotification = {
            id: item.id,
            recipient_user_id: item.coach_id,
            athlete_id: item.athlete_id,
            athlete_name: item.athlete_name,
            type: item.type || 'workout_completed',
            priority: (item.type === 'pain_reported' ? 'high' : 'normal') as NotificationPriority,
            title: item.title,
            body: item.body || '',
            action_url: item.athlete_id ? `/athletes?id=${item.athlete_id}` : null,
            metadata: item.metadata || {},
            channel_in_app: true,
            channel_push: false,
            push_status: 'not_requested',
            read_at: item.read_at,
            created_at: item.created_at,
            dedupe_key: null,
          };
          setNotifications((prev) => {
            if (prev.some((n) => n.id === mapped.id)) return prev;
            return [mapped, ...prev];
          });

          // Notifica nativa di sistema su smartphone e desktop
          WebPushService.showLocalNotification(mapped.title, {
            body: mapped.body,
            tag: `notif-${mapped.id}`,
            url: mapped.action_url || '/notifiche',
          }).catch(() => {});
        }
      )
      .subscribe();

    // Gestione riconnessione di rete
    const handleOnline = () => {
      loadNotifications(true);
    };

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
      supabase.removeChannel(channel);
    };
  }, [user?.id, isCoach]);

  // 4. Segna come letta
  const markAsRead = useCallback(
    async (id: string) => {
      if (!user?.id) return;
      const now = new Date().toISOString();

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: now } : n))
      );

      // Aggiorna tabella notifications
      await supabase
        .from('notifications')
        .update({ read_at: now })
        .eq('id', id)
        .eq('recipient_user_id', user.id);

      // Aggiorna anche legacy
      await supabase
        .from('coach_notifications')
        .update({ read_at: now })
        .eq('id', id)
        .eq('coach_id', user.id);
    },
    [user?.id]
  );

  // 5. Segna tutte come lette
  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;
    const now = new Date().toISOString();

    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at ?? now }))
    );

    await supabase
      .from('notifications')
      .update({ read_at: now })
      .eq('recipient_user_id', user.id)
      .is('read_at', null);

    await supabase
      .from('coach_notifications')
      .update({ read_at: now })
      .eq('coach_id', user.id)
      .is('read_at', null);
  }, [user?.id]);

  // 6. Segna selezione come lette
  const markSelectedAsRead = useCallback(
    async (ids: string[]) => {
      if (!user?.id || ids.length === 0) return;
      const now = new Date().toISOString();

      setNotifications((prev) =>
        prev.map((n) => (ids.includes(n.id) ? { ...n, read_at: n.read_at ?? now } : n))
      );

      await supabase
        .from('notifications')
        .update({ read_at: now })
        .in('id', ids)
        .eq('recipient_user_id', user.id);
    },
    [user?.id]
  );

  // 7. Paginazione / Carica altre
  const loadMore = useCallback(async () => {
    if (!loading && hasMore) {
      await loadNotifications(false);
    }
  }, [loading, hasMore, loadNotifications]);

  // 8. Aggiorna preferenze
  const updatePreferencesHandler = useCallback(
    async (updates: Partial<NotificationPreferences>) => {
      if (!user?.id) return false;
      const ok = await WebPushService.updatePreferences(user.id, updates);
      if (ok) {
        setPreferences((prev) => (prev ? { ...prev, ...updates } : null));
      }
      return ok;
    },
    [user?.id]
  );

  // 9. Web Push Attivazione / Disattivazione
  const enableWebPush = useCallback(async () => {
    if (!user?.id) return { success: false, error: 'Utente non autenticato' };
    const res = await WebPushService.subscribeUser(user.id);
    if (res.success) {
      const updated = await WebPushService.getPreferences(user.id);
      if (updated) setPreferences(updated);
    }
    return res;
  }, [user?.id]);

  const disableWebPush = useCallback(async () => {
    if (!user?.id) return { success: false };
    const res = await WebPushService.unsubscribeUser(user.id);
    if (res.success) {
      const updated = await WebPushService.getPreferences(user.id);
      if (updated) setPreferences(updated);
    }
    return res;
  }, [user?.id]);

  // 10. Filtro Notifiche Avanzato
  const filterNotifications = useCallback(
    (options: NotificationFilterOptions): AppNotification[] => {
      return notifications.filter((item) => {
        // Filtro Stato
        if (options.status === 'unread' && item.read_at) return false;
        if (options.status === 'read' && !item.read_at) return false;

        // Filtro Priorità
        if (options.priority && options.priority !== 'all') {
          if (options.priority === 'urgent') {
            if (item.priority !== 'high' && item.priority !== 'critical') return false;
          } else if (item.priority !== options.priority) {
            return false;
          }
        }

        // Filtro Categoria
        if (options.category && options.category !== 'all') {
          if (options.category === 'checkin' && !item.type.startsWith('checkin')) return false;
          if (
            options.category === 'workout' &&
            item.type !== 'workout_completed' &&
            item.type !== 'pain_reported' &&
            item.type !== 'questionnaire_submitted'
          )
            return false;
          if (
            options.category === 'program' &&
            item.type !== 'penultimate_week' &&
            item.type !== 'program_renewal_required' &&
            item.type !== 'adherence_low' &&
            item.type !== 'stall_detected'
          )
            return false;
          if (options.category === 'security' && !item.type.startsWith('security')) return false;
          if (options.category === 'trophies' && item.type !== 'new_pr') return false;
          if (options.category === 'messages' && item.type !== 'message_received') return false;
        }

        // Filtro Atleta
        if (options.athleteId && options.athleteId !== 'all') {
          if (item.athlete_id !== options.athleteId) return false;
        }

        // Filtro Ricerca Testuale
        if (options.searchQuery && options.searchQuery.trim()) {
          const q = options.searchQuery.toLowerCase();
          const matchTitle = item.title.toLowerCase().includes(q);
          const matchBody = item.body.toLowerCase().includes(q);
          const matchAthlete = item.athlete_name?.toLowerCase().includes(q) || false;
          if (!matchTitle && !matchBody && !matchAthlete) return false;
        }

        // Filtro Range Date
        if (options.dateRange?.startDate) {
          if (new Date(item.created_at) < new Date(options.dateRange.startDate)) return false;
        }
        if (options.dateRange?.endDate) {
          const end = new Date(options.dateRange.endDate);
          end.setHours(23, 59, 59, 999);
          if (new Date(item.created_at) > end) return false;
        }

        return true;
      });
    },
    [notifications]
  );

  const clearActiveToast = useCallback(() => {
    setActiveToast(null);
  }, []);

  // Conteggio non lette operative (esclude i trofei per non gonfiare la campanella)
  const unreadCount = notifications.filter((n) => !n.read_at && n.type !== 'new_pr').length;
  const unreadTrophiesCount = notifications.filter((n) => !n.read_at && n.type === 'new_pr').length;
  const totalUnreadCount = notifications.filter((n) => !n.read_at).length;
  const hasUrgentAlert = notifications.some(
    (n) => !n.read_at && (n.priority === 'high' || n.priority === 'critical')
  );

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        unreadTrophiesCount,
        totalUnreadCount,
        hasUrgentAlert,
        loading,
        preferences,
        activeToast,
        clearActiveToast,
        markAsRead,
        markAllAsRead,
        markSelectedAsRead,
        loadMore,
        hasMore,
        updatePreferences: updatePreferencesHandler,
        enableWebPush,
        disableWebPush,
        filterNotifications,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};
