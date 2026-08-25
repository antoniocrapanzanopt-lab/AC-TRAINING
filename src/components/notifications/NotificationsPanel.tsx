import React, { useState } from 'react';
import {
  X,
  CheckCheck,
  Dumbbell,
  AlertTriangle,
  ClipboardList,
  MessageSquare,
  Trophy,
  Scale,
  ShieldAlert,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationsContext';
import { useAthletes } from '../../context/AthletesContext';
import { useCommunications } from '../../context/CommunicationsContext';
import { NavigationTab } from '../../types';
import { AppNotification } from '../../types/notification';
import { resolveNotificationNavigation } from '../../utils/notificationNavigator';

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToAll?: () => void;
  onNavigateTab?: (tab: NavigationTab) => void;
}

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
  isOpen,
  onClose,
  onNavigateToAll,
  onNavigateTab,
}) => {
  const { notifications, unreadCount, unreadTrophiesCount, markAsRead, markAllAsRead } =
    useNotifications();
  const { setSelectedAthleteId } = useAthletes();
  const { markRecipientRead } = useCommunications();
  const [activeSubTab, setActiveSubTab] = useState<'operative' | 'urgent' | 'trophies'>('operative');

  if (!isOpen) return null;

  // Filtra notifiche in base alla tab attiva nel popover
  const filteredNotifications = notifications.filter((n) => {
    if (activeSubTab === 'trophies') return n.type === 'new_pr';
    if (activeSubTab === 'urgent')
      return (n.priority === 'high' || n.priority === 'critical') && n.type !== 'new_pr';
    return n.type !== 'new_pr';
  });

  // Mostra al massimo 8-10 eventi recenti nel pannello dropdown
  const displayedNotifications = filteredNotifications.slice(0, 8);

  const getNotificationIcon = (item: AppNotification) => {
    if (item.priority === 'critical')
      return <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />;
    if (item.priority === 'high' || item.type === 'pain_reported')
      return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;

    switch (item.type) {
      case 'workout_completed':
        return <Dumbbell className="w-4 h-4 text-[var(--color-primary)] shrink-0" />;
      case 'checkin_submitted':
      case 'checkin_alert':
        return <Scale className="w-4 h-4 text-purple-400 shrink-0" />;
      case 'penultimate_week':
      case 'program_renewal_required':
        return <ClipboardList className="w-4 h-4 text-blue-400 shrink-0" />;
      case 'message_received':
        return <MessageSquare className="w-4 h-4 text-cyan-400 shrink-0" />;
      case 'new_pr':
        return <Trophy className="w-4 h-4 text-amber-400 shrink-0" />;
      default:
        return <Dumbbell className="w-4 h-4 text-slate-400 shrink-0" />;
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return 'Adesso';
    if (diff < 3600) return `${Math.floor(diff / 60)} min fa`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ore fa`;
    if (diff < 172800) return 'Ieri';
    return new Date(dateStr).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
  };

  const handleItemClick = (item: AppNotification) => {
    if (!item.read_at) {
      markAsRead(item.id);
    }

    if (item.metadata?.broadcastId && item.athlete_id) {
      markRecipientRead(item.metadata.broadcastId as string, item.athlete_id);
    }

    // Risoluzione intelligente della navigazione per scheda/copilot/atleta
    const target = resolveNotificationNavigation(item);
    if (target.athleteId) {
      setSelectedAthleteId(target.athleteId);
    }

    if (onNavigateTab) {
      onNavigateTab(target.tab);
    }

    onClose();
  };

  const handleOpenAll = () => {
    if (onNavigateToAll) {
      onNavigateToAll();
    }
    onClose();
  };

  return (
    <>
      {/* Overlay invisibile per chiusura click-outside */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div className="absolute right-0 top-full mt-2 w-96 max-w-[calc(100vw-1.5rem)] bg-slate-950/95 backdrop-blur-2xl border border-slate-800 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-50 overflow-hidden flex flex-col font-sans animate-in fade-in zoom-in-95 duration-150 select-none">
        {/* Header Pannello */}
        <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2">
            <h3 className="font-black text-white text-xs tracking-wider uppercase">Notifiche</h3>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-[var(--color-primary)] text-slate-950 font-black text-[10px]">
                {unreadCount > 99 ? '99+' : unreadCount} nuove
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="text-[11px] font-bold text-slate-400 hover:text-[var(--color-primary)] px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
                title="Segna tutte come lette"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Lette</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Sub-filtri */}
        <div className="flex items-center border-b border-slate-800 bg-slate-900/30 px-2 pt-1 gap-1">
          <button
            onClick={() => setActiveSubTab('operative')}
            className={`flex-1 py-2 text-[11px] font-bold text-center border-b-2 transition-all cursor-pointer ${
              activeSubTab === 'operative'
                ? 'border-[var(--color-primary)] text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Operative
          </button>
          <button
            onClick={() => setActiveSubTab('urgent')}
            className={`flex-1 py-2 text-[11px] font-bold text-center border-b-2 transition-all cursor-pointer ${
              activeSubTab === 'urgent'
                ? 'border-rose-500 text-rose-400 font-black'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🚨 Urgenti
          </button>
          <button
            onClick={() => setActiveSubTab('trophies')}
            className={`flex-1 py-2 text-[11px] font-bold text-center border-b-2 transition-all flex items-center justify-center gap-1 cursor-pointer ${
              activeSubTab === 'trophies'
                ? 'border-amber-400 text-amber-300 font-black'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🏆 Trofei</span>
            {unreadTrophiesCount > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block animate-pulse" />
            )}
          </button>
        </div>

        {/* Lista Notifiche (max 8-10) */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-800/60 custom-scrollbar">
          {displayedNotifications.length === 0 ? (
            <div className="py-10 text-center text-slate-500">
              <p className="text-xs font-medium">Nessuna notifica in questa sezione</p>
            </div>
          ) : (
            displayedNotifications.map((item) => {
              const isUnread = !item.read_at;
              const isCritical = item.priority === 'critical';
              const isHigh = item.priority === 'high' || item.type === 'pain_reported';

              return (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`p-3 transition-colors flex items-start gap-2.5 cursor-pointer relative group ${
                    isUnread
                      ? isCritical
                        ? 'bg-rose-500/10 hover:bg-rose-500/15'
                        : isHigh
                        ? 'bg-amber-500/10 hover:bg-amber-500/15'
                        : 'bg-slate-900/40 hover:bg-slate-900/80'
                      : 'hover:bg-slate-900/40 opacity-75 hover:opacity-100'
                  }`}
                >
                  {/* Punto non letto */}
                  {isUnread && (
                    <span
                      className={`absolute left-1.5 top-4 w-1.5 h-1.5 rounded-full ${
                        isCritical
                          ? 'bg-rose-500 animate-pulse'
                          : isHigh
                          ? 'bg-amber-400'
                          : 'bg-[var(--color-primary)]'
                      }`}
                    />
                  )}

                  {/* Icona Categoria / Priorità */}
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ml-1.5 ${
                      isCritical
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : isHigh
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-slate-900 border border-slate-800'
                    }`}
                  >
                    {getNotificationIcon(item)}
                  </div>

                  {/* Testo Notifica */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h4
                        className={`text-xs font-bold truncate ${
                          isUnread ? 'text-white' : 'text-slate-300'
                        }`}
                      >
                        {item.title}
                      </h4>
                      <span className="text-[10px] text-slate-500 shrink-0 font-medium">
                        {formatRelativeTime(item.created_at)}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {item.body}
                    </p>

                    <div className="flex items-center justify-between mt-1.5">
                      {item.athlete_name && (
                        <span className="text-[10px] text-slate-400 font-bold bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-800">
                          {item.athlete_name}
                        </span>
                      )}
                      <span className="text-[10px] font-black text-[var(--color-primary)] flex items-center gap-0.5 ml-auto group-hover:translate-x-0.5 transition-transform">
                        Apri <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer con Link a Pagina Completa */}
        <div className="p-2.5 border-t border-slate-800 bg-slate-900/70 flex items-center justify-between text-xs">
          <button
            onClick={handleOpenAll}
            className="w-full py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 hover:text-white font-bold text-center flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Vedi tutte le notifiche</span>
            <ExternalLink className="w-3.5 h-3.5 text-[var(--color-primary)]" />
          </button>
        </div>
      </div>
    </>
  );
};
