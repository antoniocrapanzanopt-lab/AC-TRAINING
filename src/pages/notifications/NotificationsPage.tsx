import React, { useState, useMemo } from 'react';
import {
  Bell,
  Search,
  CheckCheck,
  AlertTriangle,
  ShieldAlert,
  Dumbbell,
  Scale,
  ClipboardList,
  Trophy,
  MessageSquare,
  CheckSquare,
  Square,
  Clock,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationsContext';
import { useAthletes } from '../../context/AthletesContext';
import {
  AppNotification,
  NotificationFilterOptions,
  NotificationPriority,
} from '../../types/notification';
import { NavigationTab } from '../../types';
import { resolveNotificationNavigation } from '../../utils/notificationNavigator';

interface NotificationsPageProps {
  onNavigateToTab?: (tab: NavigationTab) => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({ onNavigateToTab }) => {
  const {
    notifications,
    unreadCount,
    totalUnreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    markSelectedAsRead,
    loadMore,
    hasMore,
    filterNotifications,
  } = useNotifications();

  const { athletes, setSelectedAthleteId } = useAthletes();

  // Stati dei filtri
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [priorityFilter, setPriorityFilter] = useState<NotificationPriority | 'all' | 'urgent'>('all');
  const [categoryFilter, setCategoryFilter] = useState<
    'all' | 'checkin' | 'workout' | 'program' | 'security' | 'trophies' | 'messages'
  >('all');
  const [selectedAthleteIdFilter, setSelectedAthleteIdFilter] = useState<string | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Notifiche filtrate
  const filteredList = useMemo(() => {
    const filterOptions: NotificationFilterOptions = {
      status: statusFilter,
      priority: priorityFilter,
      category: categoryFilter,
      athleteId: selectedAthleteIdFilter,
      searchQuery,
    };
    return filterNotifications(filterOptions);
  }, [
    filterNotifications,
    statusFilter,
    priorityFilter,
    categoryFilter,
    selectedAthleteIdFilter,
    searchQuery,
  ]);

  // Statistiche riepilogative
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayCount = notifications.filter((n) => n.created_at.startsWith(todayStr)).length;
    const urgentCount = notifications.filter(
      (n) => !n.read_at && (n.priority === 'high' || n.priority === 'critical')
    ).length;

    return {
      total: notifications.length,
      unread: totalUnreadCount,
      urgent: urgentCount,
      today: todayCount,
    };
  }, [notifications, totalUnreadCount]);

  // Gestione selezione multipla
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    if (selectedIds.length === filteredList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredList.map((n) => n.id));
    }
  };

  const handleMarkSelected = async () => {
    if (selectedIds.length === 0) return;
    await markSelectedAsRead(selectedIds);
    setSelectedIds([]);
  };

  // Navigazione al click
  const handleOpenNotification = (item: AppNotification) => {
    if (!item.read_at) {
      markAsRead(item.id);
    }

    const target = resolveNotificationNavigation(item);
    if (target.athleteId) {
      setSelectedAthleteId(target.athleteId);
    }

    if (onNavigateToTab) {
      onNavigateToTab(target.tab);
    }
  };

  const getNotificationIcon = (item: AppNotification) => {
    if (item.priority === 'critical')
      return <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />;
    if (item.priority === 'high' || item.type === 'pain_reported')
      return <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;

    switch (item.type) {
      case 'workout_completed':
        return <Dumbbell className="w-5 h-5 text-[var(--color-primary)] shrink-0" />;
      case 'checkin_submitted':
      case 'checkin_alert':
        return <Scale className="w-5 h-5 text-purple-400 shrink-0" />;
      case 'penultimate_week':
      case 'program_renewal_required':
        return <ClipboardList className="w-5 h-5 text-blue-400 shrink-0" />;
      case 'message_received':
        return <MessageSquare className="w-5 h-5 text-cyan-400 shrink-0" />;
      case 'new_pr':
        return <Trophy className="w-5 h-5 text-amber-400 shrink-0" />;
      default:
        return <Bell className="w-5 h-5 text-slate-400 shrink-0" />;
    }
  };

  const formatExactDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6 pb-12 font-sans select-none animate-in fade-in duration-200">
      {/* ─── TESTATA DELLA PAGINA ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800/80 p-5 rounded-3xl backdrop-blur-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-primary)]/5 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)] shadow-lg shadow-[var(--color-primary)]/10">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                Centro Notifiche
              </h1>
              {unreadCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-[var(--color-primary)] text-slate-950 font-black text-xs shadow-sm">
                  {unreadCount > 99 ? '99+' : unreadCount} nuove
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Monitoraggio in tempo reale di check-in, completamento schede, alert dolori e sicurezza.
            </p>
          </div>
        </div>

        {/* Azioni Rapide Testata */}
        <div className="flex items-center gap-2">
          {totalUnreadCount > 0 && (
            <button
              onClick={() => markAllAsRead()}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <CheckCheck className="w-4 h-4 text-[var(--color-primary)]" />
              <span>Segna tutte come lette</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── METRICHE STATISTICHE IN EVIDENZA ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
            Totale Ricevute
          </span>
          <div className="text-2xl font-black text-white">{stats.total}</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
            Da Leggere
          </span>
          <div className="text-2xl font-black text-[var(--color-primary)]">{stats.unread}</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl">
          <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 block mb-1">
            🚨 Urgenti / Dolori
          </span>
          <div className="text-2xl font-black text-rose-400">{stats.urgent}</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
            Oggi
          </span>
          <div className="text-2xl font-black text-slate-200">{stats.today}</div>
        </div>
      </div>

      {/* ─── FILTRI AVANZATI & RICERCA ─── */}
      <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-3xl space-y-4">
        {/* Barra di ricerca e selettori dropdown */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Cerca testo */}
          <div className="md:col-span-5 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca titolo, atleta o note..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-[var(--color-primary)] font-medium"
            />
          </div>

          {/* Filtro Stato (Tutte / Non lette / Lette) */}
          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)] font-bold"
            >
              <option value="all">Tutti gli stati</option>
              <option value="unread">Solo non lette</option>
              <option value="read">Solo già lette</option>
            </select>
          </div>

          {/* Filtro Priorità */}
          <div className="md:col-span-2">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)] font-bold"
            >
              <option value="all">Tutte le priorità</option>
              <option value="urgent">🚨 Solo Urgenti</option>
              <option value="critical">🔴 Critica</option>
              <option value="high">🟠 Alta</option>
              <option value="normal">🟢 Normale</option>
              <option value="low">⚪ Bassa</option>
            </select>
          </div>

          {/* Filtro Atleta */}
          <div className="md:col-span-2">
            <select
              value={selectedAthleteIdFilter}
              onChange={(e) => setSelectedAthleteIdFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)] font-bold"
            >
              <option value="all">Tutti gli atleti</option>
              {athletes.map((ath) => (
                <option key={ath.id} value={ath.id}>
                  {ath.fullName || `${ath.firstName} ${ath.lastName}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Categorie orizzontali (Chips) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs font-bold">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              categoryFilter === 'all'
                ? 'bg-[var(--color-primary)] text-slate-950 font-black'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Tutte le Categorie
          </button>
          <button
            onClick={() => setCategoryFilter('checkin')}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              categoryFilter === 'checkin'
                ? 'bg-purple-500 text-white font-black'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            ⚖️ Check-in
          </button>
          <button
            onClick={() => setCategoryFilter('workout')}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              categoryFilter === 'workout'
                ? 'bg-amber-500 text-slate-950 font-black'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            🏋️ Allenamenti & Dolori
          </button>
          <button
            onClick={() => setCategoryFilter('program')}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              categoryFilter === 'program'
                ? 'bg-blue-500 text-white font-black'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            📋 Programmi & Rinnovi
          </button>
          <button
            onClick={() => setCategoryFilter('trophies')}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              categoryFilter === 'trophies'
                ? 'bg-amber-400 text-slate-950 font-black'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            🏆 Trofei & PR
          </button>
          <button
            onClick={() => setCategoryFilter('security')}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              categoryFilter === 'security'
                ? 'bg-rose-500 text-white font-black'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            🛡️ Sicurezza
          </button>
        </div>
      </div>

      {/* ─── BARRA AZIONI MULTIPLE (SELEZIONE) ─── */}
      <div className="flex items-center justify-between px-2 text-xs font-bold text-slate-400">
        <div className="flex items-center gap-3">
          <button
            onClick={handleSelectAllFiltered}
            className="flex items-center gap-1.5 hover:text-white cursor-pointer transition-colors"
          >
            {selectedIds.length === filteredList.length && filteredList.length > 0 ? (
              <CheckSquare className="w-4 h-4 text-[var(--color-primary)]" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            <span>Seleziona tutti ({filteredList.length})</span>
          </button>

          {selectedIds.length > 0 && (
            <span className="text-[var(--color-primary)] font-black">
              {selectedIds.length} selezionati
            </span>
          )}
        </div>

        {selectedIds.length > 0 && (
          <button
            onClick={handleMarkSelected}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <CheckCheck className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            <span>Segna selezionati come letti</span>
          </button>
        )}
      </div>

      {/* ─── LISTA DELLE NOTIFICHE ─── */}
      <div className="space-y-3">
        {filteredList.length === 0 ? (
          <div className="py-16 text-center bg-slate-900/40 border border-slate-800/80 rounded-3xl">
            <Bell className="w-10 h-10 mx-auto text-slate-600 mb-3 opacity-50" />
            <h3 className="text-base font-bold text-white mb-1">Nessuna notifica trovata</h3>
            <p className="text-xs text-slate-400">
              Non ci sono eventi che corrispondono ai filtri selezionati.
            </p>
          </div>
        ) : (
          filteredList.map((item) => {
            const isUnread = !item.read_at;
            const isCritical = item.priority === 'critical';
            const isHigh = item.priority === 'high' || item.type === 'pain_reported';
            const isSelected = selectedIds.includes(item.id);

            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition-all flex items-start gap-3.5 relative group ${
                  isSelected
                    ? 'border-[var(--color-primary)]/60 bg-slate-900/90'
                    : isUnread
                    ? isCritical
                      ? 'bg-rose-950/20 border-rose-500/40'
                      : isHigh
                      ? 'bg-amber-950/20 border-amber-500/40'
                      : 'bg-slate-900/70 border-slate-800'
                    : 'bg-slate-950/40 border-slate-800/60 opacity-80 hover:opacity-100'
                }`}
              >
                {/* Checkbox di Selezione */}
                <button
                  type="button"
                  onClick={() => handleToggleSelect(item.id)}
                  className="mt-1 text-slate-500 hover:text-white cursor-pointer transition-colors"
                >
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 text-[var(--color-primary)]" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>

                {/* Icona Priorità / Tipologia */}
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                    isCritical
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : isHigh
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-slate-900 border border-slate-800'
                  }`}
                >
                  {getNotificationIcon(item)}
                </div>

                {/* Contenuto Notifica */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-2">
                      <h3
                        className={`text-sm font-black tracking-tight ${
                          isUnread ? 'text-white' : 'text-slate-300'
                        }`}
                      >
                        {item.title}
                      </h3>
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] inline-block shadow-[0_0_6px_var(--color-primary)]" />
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-slate-500 text-[11px] font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatExactDate(item.created_at)}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{item.body}</p>

                  {/* Badges & Azione */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-800/60">
                    <div className="flex items-center gap-2">
                      {item.athlete_name && (
                        <span className="text-[10px] font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                          {item.athlete_name}
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          isCritical
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : isHigh
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-800/80 text-slate-400'
                        }`}
                      >
                        {item.priority}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isUnread && (
                        <button
                          onClick={() => markAsRead(item.id)}
                          className="text-[11px] font-bold text-slate-400 hover:text-white px-2.5 py-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          Segna come letta
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenNotification(item)}
                        className="text-[11px] font-black text-slate-950 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] px-3 py-1.5 rounded-xl flex items-center gap-1 transition-all shadow-md shadow-[var(--color-primary)]/20 cursor-pointer"
                      >
                        <span>Apri Profilo</span>
                        <ArrowUpRight className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pulsante Carica Altri */}
      {hasMore && (
        <div className="text-center pt-4">
          <button
            onClick={() => loadMore()}
            disabled={loading}
            className="px-5 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-white font-bold text-xs flex items-center gap-2 mx-auto transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin text-[var(--color-primary)]" />
            ) : (
              <span>Carica notifiche precedenti</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
