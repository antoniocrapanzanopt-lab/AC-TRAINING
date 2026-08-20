import React from 'react';
import { Bell, AlertTriangle } from 'lucide-react';
import { useNotifications } from '../../context/NotificationsContext';

interface NotificationBellProps {
  onClick: () => void;
  isOpen: boolean;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onClick, isOpen }) => {
  const { unreadCount, hasUrgentAlert } = useNotifications();

  return (
    <button
      id="notifications-bell-btn"
      onClick={onClick}
      className={`relative p-2 rounded-xl transition-all border ${
        isOpen
          ? 'bg-slate-800 border-[var(--color-primary)]/50 text-[var(--color-primary)]'
          : 'text-slate-400 hover:text-white hover:bg-slate-800/80 border-transparent hover:border-slate-700'
      }`}
      title="Notifiche"
      aria-label="Apri centro notifiche"
    >
      {hasUrgentAlert ? (
        <AlertTriangle className="w-5 h-5 text-rose-400 animate-pulse" />
      ) : (
        <Bell className="w-5 h-5" />
      )}

      {unreadCount > 0 && (
        <span
          className={`absolute -top-1 -right-1 min-w-[19px] h-[19px] px-1 rounded-full text-[10px] font-mono font-black flex items-center justify-center shadow-lg transition-transform ${
            hasUrgentAlert
              ? 'bg-rose-500 text-white shadow-rose-500/50 animate-bounce'
              : 'bg-[var(--color-primary)] text-slate-950 shadow-[var(--color-primary)]/40'
          }`}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
};
