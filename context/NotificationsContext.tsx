import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { NotificationItem } from '../types';
import { getStorageItem, setStorageItem } from '../lib/storage';

const NOTIFICATIONS_STORAGE_KEY = 'builder_athlete_notifications';

interface NotificationsContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  addNotification: (notification: Omit<NotificationItem, 'id' | 'createdAt' | 'isRead' | 'isArchived'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  archiveNotification: (id: string) => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const NotificationsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Load from local storage on mount
  useEffect(() => {
    const saved = getStorageItem<NotificationItem[]>(NOTIFICATIONS_STORAGE_KEY, []);
    setNotifications(saved);
  }, []);

  // Save to local storage whenever notifications change
  useEffect(() => {
    setStorageItem(NOTIFICATIONS_STORAGE_KEY, notifications);
  }, [notifications]);

  const addNotification = (
    data: Omit<NotificationItem, 'id' | 'createdAt' | 'isRead' | 'isArchived'>
  ) => {
    const newNotification: NotificationItem = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      isRead: false,
      isArchived: false,
    };
    setNotifications((prev) => [newNotification, ...prev]);
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const archiveNotification = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isArchived: true } : n))
    );
  };

  const unreadCount = notifications.filter((n) => !n.isRead && !n.isArchived).length;

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        archiveNotification,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
};
