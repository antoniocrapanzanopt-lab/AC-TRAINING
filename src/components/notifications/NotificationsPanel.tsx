import React, { useState, useMemo } from 'react';
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
  Trash2,
  Sparkles,
  Layers,
} from 'lucide-react';
import { useNotifications, CoachNotification } from '../../context/NotificationsContext';
import { useApp } from '../../context/AppContext';
import { useAthletes } from '../../context/AthletesContext';

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type FilterCategory = 'all' | 'unread' | 'alerts' | 'workouts' | 'messages' | 'trophies';

const typeConfig: Record<CoachNotification['type'], {
  icon: React.FC<{ className?: string }>;
  color: string;
  bg: string;
  border: string;
  label: string;
  navTab?: string;
}> = {
  workout_completed: {
    icon: Dumbbell,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/25',
    label: 'Allenamento completato',
    navTab: 'atleti',
  },
  pain_reported: {
    icon: AlertTriangle,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/25',
    label: 'Fastidio segnalato',
    navTab: 'atleti',
  },
  questionnaire_submitted: {
    icon: ClipboardList,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/25',
    label: 'Questionario compilato',
    navTab: 'atleti',
  },
  message_received: {
    icon: MessageCircle,
    color: 'text-sky-400',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/25',
    label: 'Messaggio ricevuto',
    navTab: 'messaggi',
  },
  new_pr: {
    icon: Trophy,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/25',
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
  if (diffMin < 60) return `${diffMin}m fa`;
  if (diffH < 24) return `${diffH}h fa`;
  if (diffD === 1) return 'Ieri';
  return `${diffD}gg fa`;
}

// Struttura aggregata per smart grouping
interface AggregatedNotificationItem {
  id: string;
  isGrouped: boolean;
  type: CoachNotification['type'];
  athleteId?: string;
  athleteName?: string;
  title: string;
  items: { id: string; body?: string; createdAt: string; isUnread: boolean }[];
  isUnread: boolean;
  latestCreatedAt: string;
  originalNotifications: CoachNotification[];
}

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ isOpen, onClose }) => {
  const {
    notifications,
    unreadCount,
    unreadTrophiesCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearReadNotifications,
    loading,
  } = useNotifications();

  const { setActiveTab } = useApp();
  const { athletes, setSelectedAthleteId } = useAthletes();
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');

  // Conteggi separati per filtri
  const counts = useMemo(() => {
    const operative = notifications.filter((n) => n.type !== 'new_pr');
    const alerts = notifications.filter((n) => n.type === 'pain_reported');
    const workouts = notifications.filter((n) => n.type === 'workout_completed');
    const messages = notifications.filter((n) => n.type === 'message_received' || n.type === 'questionnaire_submitted');
    const trophies = notifications.filter((n) => n.type === 'new_pr');

    return {
      allOperative: operative.length,
      unreadOperative: unreadCount,
      alerts: alerts.length,
      workouts: workouts.length,
      messages: messages.length,
      trophies: trophies.length,
      unreadTrophies: unreadTrophiesCount,
    };
  }, [notifications, unreadCount, unreadTrophiesCount]);

  // Smart Grouping: Raggruppa i record multipli (PR) dello stesso atleta nello stesso giorno
  const processedNotifications = useMemo(() => {
    // 1. Filtro base: 'all' e 'unread' mostrano SOLO notifiche operative di default (senza intasare di PR/Trofei)
    let filtered: CoachNotification[] = [];
    if (activeFilter === 'all') {
      filtered = notifications.filter((n) => n.type !== 'new_pr');
    } else if (activeFilter === 'unread') {
      filtered = notifications.filter((n) => !n.read_at && n.type !== 'new_pr');
    } else if (activeFilter === 'alerts') {
      filtered = notifications.filter((n) => n.type === 'pain_reported');
    } else if (activeFilter === 'workouts') {
      filtered = notifications.filter((n) => n.type === 'workout_completed');
    } else if (activeFilter === 'messages') {
      filtered = notifications.filter((n) => n.type === 'message_received' || n.type === 'questionnaire_submitted');
    } else if (activeFilter === 'trophies') {
      filtered = notifications.filter((n) => n.type === 'new_pr');
    }

    // 2. Raggruppamento per atleta e tipo 'new_pr' nello stesso giorno
    const groups: AggregatedNotificationItem[] = [];
    const prGroupsMap: Record<string, CoachNotification[]> = {};

    filtered.forEach((notif) => {
      if (notif.type === 'new_pr' && notif.athlete_id) {
        const dateDay = notif.created_at.slice(0, 10);
        const groupKey = `${notif.athlete_id}_${dateDay}`;
        if (!prGroupsMap[groupKey]) {
          prGroupsMap[groupKey] = [];
        }
        prGroupsMap[groupKey].push(notif);
      } else {
        // Notifica singola standard
        groups.push({
          id: notif.id,
          isGrouped: false,
          type: notif.type,
          athleteId: notif.athlete_id,
          athleteName: notif.athlete_name,
          title: notif.title,
          items: [{
            id: notif.id,
            body: notif.body,
            createdAt: notif.created_at,
            isUnread: !notif.read_at,
          }],
          isUnread: !notif.read_at,
          latestCreatedAt: notif.created_at,
          originalNotifications: [notif],
        });
      }
    });

    // 3. Aggiungi i gruppi di PR aggregati
    Object.values(prGroupsMap).forEach((prList) => {
      if (prList.length === 1) {
        const notif = prList[0];
        groups.push({
          id: notif.id,
          isGrouped: false,
          type: notif.type,
          athleteId: notif.athlete_id,
          athleteName: notif.athlete_name,
          title: notif.title,
          items: [{
            id: notif.id,
            body: notif.body,
            createdAt: notif.created_at,
            isUnread: !notif.read_at,
          }],
          isUnread: !notif.read_at,
          latestCreatedAt: notif.created_at,
          originalNotifications: [notif],
        });
      } else {
        // Più PR per lo stesso atleta: ACCORPA IN UN'UNICA CARD CUMULATIVA
        const athleteName = prList[0].athlete_name || 'Atleta';
        const hasUnread = prList.some((n) => !n.read_at);
        const latestTime = prList[0].created_at;

        groups.push({
          id: `grouped-pr-${prList[0].id}`,
          isGrouped: true,
          type: 'new_pr',
          athleteId: prList[0].athlete_id,
          athleteName,
          title: `🏆 ${athleteName}: ${prList.length} nuovi record personali!`,
          items: prList.map((n) => ({
            id: n.id,
            body: n.body,
            createdAt: n.created_at,
            isUnread: !n.read_at,
          })),
          isUnread: hasUnread,
          latestCreatedAt: latestTime,
          originalNotifications: prList,
        });
      }
    });

    // Ordina per data più recente
    return groups.sort((a, b) => b.latestCreatedAt.localeCompare(a.latestCreatedAt));
  }, [notifications, activeFilter]);

  if (!isOpen) return null;

  const handleItemClick = async (aggItem: AggregatedNotificationItem) => {
    // 1. Segna tutte come lette nel gruppo
    for (const notif of aggItem.originalNotifications) {
      if (!notif.read_at) {
        await markAsRead(notif.id);
      }
    }

    // 2. Risolvi l'ID dell'atleta
    let targetAthleteId = aggItem.athleteId || aggItem.originalNotifications.find((n) => n.athlete_id)?.athlete_id;
    if (!targetAthleteId) {
      const searchTerms = [aggItem.athleteName, aggItem.title, ...aggItem.originalNotifications.map((n) => n.athlete_name || n.title)].filter(Boolean) as string[];
      for (const term of searchTerms) {
        const lowerTerm = term.toLowerCase();
        const match = athletes.find((a) => {
          const fullName = `${a.firstName} ${a.lastName}`.trim().toLowerCase();
          return fullName && (lowerTerm.includes(fullName) || lowerTerm.includes(a.firstName.toLowerCase()));
        });
        if (match) {
          targetAthleteId = match.id;
          break;
        }
      }
    }

    // 3. Routing preciso
    if (aggItem.type === 'message_received') {
      setActiveTab('messaggi');
    } else if (targetAthleteId) {
      setSelectedAthleteId(targetAthleteId);
      setActiveTab('atleti');
    } else if (aggItem.type === 'workout_completed' || aggItem.type === 'new_pr') {
      setActiveTab('cronologia_allenamenti');
    } else {
      const cfg = typeConfig[aggItem.type];
      if (cfg?.navTab) {
        setActiveTab(cfg.navTab as any);
      }
    }

    onClose();
  };

  const handleDeleteItem = async (e: React.MouseEvent, aggItem: AggregatedNotificationItem) => {
    e.stopPropagation();
    for (const notif of aggItem.originalNotifications) {
      await deleteNotification(notif.id);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Popover Panel */}
      <div className="absolute right-0 top-full mt-2 w-[400px] sm:w-[440px] max-h-[85vh] bg-slate-950/95 backdrop-blur-2xl border border-slate-800/90 rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden select-none animate-in fade-in slide-in-from-top-2 duration-150">
        {/* ── HEADER NOTIFICHE ── */}
        <div className="p-4 border-b border-slate-800/80 shrink-0 bg-slate-950 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)]">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  Notifiche Hub
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.2 rounded-full text-[10px] font-mono font-black bg-rose-500 text-white">
                      {unreadCount} nuove
                    </span>
                  )}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-bold text-slate-300 hover:text-white hover:border-slate-700 transition-colors cursor-pointer"
                  title="Segna tutte come lette"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-sky-400" />
                  <span>Tutte lette</span>
                </button>
              )}

              {notifications.some((n) => n.read_at) && (
                <button
                  type="button"
                  onClick={clearReadNotifications}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-bold text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition-colors cursor-pointer"
                  title="Cancella le notifiche già lette"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Pulisci lette</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer ml-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── FILTRI CATEGORIE RAPIDI A PILLOLA ── */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pt-1 pb-0.5 text-xs">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap text-[11px] ${
                activeFilter === 'all'
                  ? 'bg-[var(--color-primary)] text-slate-950 font-black shadow-sm'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Tutte ({counts.allOperative})
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('unread')}
              className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap text-[11px] ${
                activeFilter === 'unread'
                  ? 'bg-[var(--color-primary)] text-slate-950 font-black shadow-sm'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Da leggere ({counts.unreadOperative})
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('alerts')}
              className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap text-[11px] ${
                activeFilter === 'alerts'
                  ? 'bg-rose-500 text-white font-black shadow-sm'
                  : counts.alerts > 0
                  ? 'bg-rose-500/10 text-rose-300 hover:text-rose-200 border border-rose-500/30'
                  : 'bg-slate-900/80 text-slate-400 hover:text-rose-400 border border-slate-800'
              }`}
            >
              🚨 Dolori ({counts.alerts})
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('workouts')}
              className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap text-[11px] ${
                activeFilter === 'workouts'
                  ? 'bg-[var(--color-primary)] text-slate-950 font-black shadow-sm'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              🏋️ Allenamenti ({counts.workouts})
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('messages')}
              className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap text-[11px] ${
                activeFilter === 'messages'
                  ? 'bg-[var(--color-primary)] text-slate-950 font-black shadow-sm'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              💬 Messaggi ({counts.messages})
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('trophies')}
              className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap text-[11px] flex items-center gap-1.5 ${
                activeFilter === 'trophies'
                  ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                  : 'bg-amber-500/10 text-amber-300/90 hover:text-amber-200 border border-amber-500/25'
              }`}
            >
              <span>🏆 Trofei & PR ({counts.trophies})</span>
              {counts.unreadTrophies > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-black ${
                  activeFilter === 'trophies' ? 'bg-slate-950 text-amber-400' : 'bg-amber-500 text-slate-950'
                }`}>
                  {counts.unreadTrophies}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── LISTA NOTIFICHE AGGREGATE E PULITE ── */}
        <div className="flex-1 overflow-y-auto max-h-[58vh] custom-scrollbar divide-y divide-slate-900">
          {loading ? (
            <div className="py-16 flex flex-col items-center gap-3 text-slate-500">
              <Bell className="w-8 h-8 animate-pulse text-[var(--color-primary)]" />
              <p className="text-xs font-bold">Caricamento notifiche...</p>
            </div>
          ) : processedNotifications.length === 0 ? (
            <div className="py-16 px-6 flex flex-col items-center gap-2 text-center text-slate-500">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600">
                {activeFilter === 'trophies' ? (
                  <Trophy className="w-6 h-6 text-amber-400" />
                ) : (
                  <CheckCheck className="w-6 h-6 text-emerald-400" />
                )}
              </div>
              <p className="text-sm font-bold text-slate-300">
                {activeFilter === 'trophies'
                  ? 'Nessun trofeo o record recente'
                  : 'Tutte le notifiche sono in regola'}
              </p>
              <p className="text-xs text-slate-500">
                {activeFilter === 'trophies'
                  ? 'I nuovi record personali (PR) e i traguardi degli atleti vengono raccolti qui in modo dedicato.'
                  : 'Nessuna nuova notifica nella categoria selezionata.'}
              </p>
            </div>
          ) : (
            processedNotifications.map((n) => {
              const cfg = typeConfig[n.type] ?? typeConfig.workout_completed;
              const IconComp = cfg.icon;
              const isUnread = n.isUnread;

              return (
                <div
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  className={`w-full text-left p-3.5 flex items-start gap-3 hover:bg-slate-900/80 transition-colors group cursor-pointer relative ${
                    isUnread ? 'bg-slate-900/40' : ''
                  }`}
                >
                  {/* Dot non letto a sinistra */}
                  {isUnread && (
                    <span className="absolute left-1 top-4 bottom-4 w-[2.5px] rounded-r-full bg-[var(--color-primary)]" />
                  )}

                  {/* Icona Categoria */}
                  <div
                    className={`p-2 rounded-xl ${cfg.bg} ${cfg.color} border ${cfg.border} shrink-0 mt-0.5`}
                  >
                    <IconComp className="w-4 h-4" />
                  </div>

                  {/* Testo & Corpo */}
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                        <p
                          className={`text-xs font-black leading-snug truncate ${
                            isUnread ? 'text-white' : 'text-slate-300'
                          }`}
                        >
                          {n.title}
                        </p>
                        {n.isGrouped && (
                          <span className="flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            <Layers className="w-2.5 h-2.5" /> {n.items.length} eventi accorpati
                          </span>
                        )}
                      </div>

                      {/* Bottone Cancella su Hover */}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteItem(e, n)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 rounded-md transition-all cursor-pointer shrink-0"
                        title="Elimina notifica"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Dettagli notifiche (singole o aggregate) */}
                    {n.isGrouped ? (
                      <div className="mt-2 space-y-1">
                        {n.items.map((it, idx) => (
                          <div
                            key={idx}
                            className="p-1.5 rounded-lg bg-slate-900/90 border border-slate-800/80 text-[11px] text-slate-300 font-mono flex items-center justify-between"
                          >
                            <span className="truncate">{it.body}</span>
                            <span className="text-[9px] text-slate-500 shrink-0 ml-2">
                              {timeAgo(it.createdAt)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      n.items[0]?.body && (
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed font-mono">
                          {n.items[0].body}
                        </p>
                      )
                    )}

                    <div className="flex items-center justify-between mt-2 text-[10px] text-slate-500">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        {timeAgo(n.latestCreatedAt)}
                      </span>

                      <span className="flex items-center gap-0.5 text-slate-400 group-hover:text-[var(--color-primary)] font-bold transition-colors">
                        Apri <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
};
