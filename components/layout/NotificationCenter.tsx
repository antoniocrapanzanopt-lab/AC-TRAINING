import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, Trash2, Video, TrendingDown, FileText, ChevronRight } from 'lucide-react';
import { useNotifications } from '../../context/NotificationsContext';
import { NotificationItem } from '../../types';

interface NotificationCenterProps {
  onVideoCorrectionClick?: (notification: NotificationItem) => void;
  onProfileClick?: (athleteId: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  onVideoCorrectionClick,
  onProfileClick
}) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, archiveNotification } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const activeNotifications = notifications.filter(n => !n.isArchived);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIconForType = (type: string) => {
    switch (type) {
      case 'video_correction': return <Video className="w-4 h-4 text-blue-400" />;
      case 'performance_drop': return <TrendingDown className="w-4 h-4 text-red-400" />;
      case 'report_submitted': return <FileText className="w-4 h-4 text-[var(--color-primary)]" />;
      default: return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  const handleNotificationClick = (notification: NotificationItem) => {
    markAsRead(notification.id);
    
    if (notification.type === 'video_correction' && onVideoCorrectionClick) {
      onVideoCorrectionClick(notification);
      setIsOpen(false);
    } else if (onProfileClick && notification.athleteId) {
      onProfileClick(notification.athleteId);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg border-2 border-[var(--color-panel)]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[80vh]">
          
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-panel-border)] bg-slate-900/50">
            <h3 className="font-bold text-white text-sm">Centro Notifiche</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-[11px] text-[var(--color-primary)] hover:text-white transition-colors flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                Segna tutte come lette
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {activeNotifications.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">
                Nessuna nuova notifica.
              </div>
            ) : (
              <ul className="divide-y divide-[var(--color-panel-border)]">
                {activeNotifications.map((notif) => (
                  <li 
                    key={notif.id}
                    className={`p-4 transition-colors hover:bg-slate-800/50 ${!notif.isRead ? 'bg-[var(--color-primary)]/5' : ''}`}
                  >
                    <div className="flex gap-3">
                      <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${!notif.isRead ? 'bg-[var(--color-primary)]/20' : 'bg-slate-800'}`}>
                        {getIconForType(notif.type)}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex justify-between items-start gap-2">
                          <p className={`text-sm ${!notif.isRead ? 'text-white font-semibold' : 'text-slate-200'}`}>
                            {notif.title}
                          </p>
                          <span className="text-[10px] text-slate-500 shrink-0">
                            {new Date(notif.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                        
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                          {notif.message}
                        </p>

                        <div className="mt-3 flex items-center gap-2">
                          <button
                            onClick={() => handleNotificationClick(notif)}
                            className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 transition-colors flex items-center justify-center gap-1"
                          >
                            {notif.type === 'video_correction' ? 'Rispondi' : 'Vai al Profilo'}
                            <ChevronRight className="w-3 h-3" />
                          </button>
                          
                          <button
                            onClick={() => archiveNotification(notif.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                            title="Archivia"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
