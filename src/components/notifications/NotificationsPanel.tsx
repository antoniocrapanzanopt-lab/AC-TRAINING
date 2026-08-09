import React from 'react';
import {
  Bell,
  X,
  CheckCheck,
  Dumbbell,
  MessageCircle,
  AlertTriangle,
  Trophy,
  ClipboardList,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { useNotifications, CoachNotification } from '../../context/NotificationsContext';
import { useApp } from '../../context/AppContext';

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const typeConfig: Record<CoachNotification['type'], {
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
  label: string;
  navTab?: string;
}> = {
  workout_completed: {
    icon: <Dumbbell className="w-4 h-4" />,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    label: 'Allenamento completato',
    navTab: 'atleti',
  },
  pain_reported: {
    icon: <AlertTriangle className="w-4 h-4" />,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    label: 'Fastidio segnalato',
    navTab: 'atleti',
  },
  questionnaire_submitted: {
    icon: <ClipboardList className="w-4 h-4" />,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    label: 'Questionario compilato',
    navTab: 'atleti',
  },
  message_received: {
    icon: <MessageCircle className="w-4 h-4" />,
    color: 'text-sky-400',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/30',
    label: 'Messaggio ricevuto',
    navTab: 'messaggi',
  },
  new_pr: {
    icon: <Trophy className="w-4 h-4" />,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    label: 'Nuovo record personale',
    navTab: 'atleti',
  },
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffMin < 1) return 'Adesso';
  if (diffMin < 60) return `${diffMin} min fa`;
  if (diffH < 24) return `${diffH}h fa`;
  if (diffD === 1) return 'Ieri';
  return `${diffD} giorni fa`;
}

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ isOpen, onClose }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications();
  const { setActiveTab } = useApp();

  if (!isOpen) return null;

  const handleNotificationClick = async (n: CoachNotification) => {
    if (!n.read_at) {
      await markAsRead(n.id);
    }
    const cfg = typeConfig[n.type];
    if (cfg?.navTab) {
      setActiveTab(cfg.navTab as any);
    }
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="absolute right-0 top-full mt-2 w-96 max-h-[80vh] bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--color-panel-border)] shrink-0">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[var(--color-primary)]" />
            <h3 className="text-sm font-black text-white">Notifiche</h3>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-500 text-white">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-[var(--color-primary)] transition-colors"
                title="Segna tutte come lette"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tutte lette</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-12 flex flex-col items-center gap-3 text-slate-500">
              <Bell className="w-8 h-8 animate-pulse" />
              <p className="text-xs">Caricamento notifiche...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 flex flex-col items-center gap-3 text-slate-500">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center">
                <Bell className="w-8 h-8 text-slate-600" />
              </div>
              <p className="text-sm font-bold text-slate-400">Nessuna notifica</p>
              <p className="text-xs text-center text-slate-500 px-6 leading-relaxed">
                Le notifiche degli atleti (allenamenti, messaggi, record...) appariranno qui in tempo reale.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {notifications.map((n) => {
                const cfg = typeConfig[n.type] ?? typeConfig.workout_completed;
                const isUnread = !n.read_at;

                return (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`w-full text-left px-4 py-3.5 flex items-start gap-3 hover:bg-slate-800/50 transition-colors group ${
                      isUnread ? 'bg-slate-900/60' : ''
                    }`}
                  >
                    {/* Icon */}
                    <div
                      className={`p-2 rounded-xl ${cfg.bg} ${cfg.color} border ${cfg.border} shrink-0 mt-0.5`}
                    >
                      {cfg.icon}
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-xs font-bold leading-tight ${
                            isUnread ? 'text-white' : 'text-slate-300'
                          }`}
                        >
                          {n.title}
                        </p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isUnread && (
                            <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
                          )}
                          <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-slate-400 transition-colors" />
                        </div>
                      </div>
                      {n.body && (
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                          {n.body}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color}`}
                        >
                          {cfg.label}
                        </span>
                        <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />
                          {timeAgo(n.created_at)}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
