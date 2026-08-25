import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAthletes } from '../../context/AthletesContext';
import { useMessages } from '../../context/MessagesContext';
import {
  LogOut,
  Dumbbell,
  User,
  Scale,
  MessageCircle,
  Settings,
} from 'lucide-react';
import { AthleteDashboard } from './AthleteDashboard';
import { WorkoutPlayer } from './WorkoutPlayer';
import { AthleteChat } from './AthleteChat';
import { AthleteProgressView } from './AthleteProgressView';
import { AthleteProfileView } from './AthleteProfileView';
import { AthleteSettingsView } from './AthleteSettingsView';
import { WorkoutTemplate, WorkoutExercise } from '../../types/workout';
import { AthleteMetric } from '../../types/metrics';
import { getActiveWorkoutDraft } from '../../lib/offline/offlineWorkoutStorage';
import { useMetrics } from '../../context/MetricsContext';

export const AthleteLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { athletes } = useAthletes();
  const { messages } = useMessages();
  const { metrics, getAthleteScheduleState } = useMetrics();

  const [activeTab, setActiveTab] = useState<'home' | 'progress' | 'messages' | 'profile' | 'settings'>('home');
  const [activeWorkout, setActiveWorkout] = useState<{
    workout: WorkoutTemplate;
    exercises: WorkoutExercise[];
    targetAthleteId?: string;
  } | null>(null);

  // Risoluzione atleta e ID
  const currentAthlete = useMemo(() => {
    if (!user) return null;
    return athletes.find(
      (a) => a.id === user.athleteId || (a.email && user.email && a.email.trim().toLowerCase() === user.email.trim().toLowerCase())
    );
  }, [athletes, user]);

  const athleteId = currentAthlete?.id || user?.athleteId || user?.id || 'ath-local';

  // 1. Badge Messaggi Non Letti
  const unreadMessagesCount = useMemo(() => {
    if (!user) return 0;
    const myIds = [user.id, user.athleteId, currentAthlete?.id].filter(Boolean) as string[];
    return messages.filter((m) => myIds.includes(m.receiver_id) && !m.is_read).length;
  }, [messages, user, currentAthlete]);

  // 2. Alert Bozza Allenamento Attiva in Sospeso
  const hasActiveDraft = useMemo(() => {
    if (!athleteId) return false;
    return !!getActiveWorkoutDraft(athleteId);
  }, [athleteId]);

  // 3. Alert Profilo (es. Certificato Medico in Scadenza / Scaduto)
  const hasProfileAlert = useMemo(() => {
    if (!currentAthlete?.medicalCertificateExpiryDate) return false;
    const expiry = new Date(currentAthlete.medicalCertificateExpiryDate);
    const today = new Date();
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 15; // Scaduto o in scadenza entro 15 giorni
  }, [currentAthlete]);

  // 4. Alert Check Misure in Scadenza / Scaduto Oggi
  const hasCheckDueAlert = useMemo(() => {
    if (!athleteId) return false;
    const list = metrics.filter((m: AthleteMetric) => String(m.athlete_id) === String(athleteId));
    const sorted = [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const latestDate = sorted[0]?.date || null;
    const scheduleState = getAthleteScheduleState(athleteId, latestDate);
    return scheduleState.isDueToday || scheduleState.isOverdue;
  }, [athleteId, metrics, getAthleteScheduleState]);

  if (activeWorkout) {
    return (
      <WorkoutPlayer
        workout={activeWorkout.workout}
        exercises={activeWorkout.exercises}
        targetAthleteId={activeWorkout.targetAthleteId}
        onClose={() => setActiveWorkout(null)}
      />
    );
  }

  const navItems: {
    id: 'home' | 'progress' | 'messages' | 'profile' | 'settings';
    label: string;
    icon: React.FC<{ className?: string }>;
    accentColor: string;
    badgeCount?: number;
    hasAlertDot?: boolean;
  }[] = [
    {
      id: 'home',
      label: 'Oggi',
      icon: Dumbbell,
      accentColor: 'text-sky-400',
      hasAlertDot: hasActiveDraft,
    },
    {
      id: 'progress',
      label: 'Progressi',
      icon: Scale,
      accentColor: 'text-emerald-400',
      hasAlertDot: hasCheckDueAlert,
    },
    {
      id: 'messages',
      label: 'Messaggi',
      icon: MessageCircle,
      accentColor: 'text-purple-400',
      badgeCount: unreadMessagesCount,
    },
    {
      id: 'profile',
      label: 'Profilo',
      icon: User,
      accentColor: 'text-[var(--color-primary)]',
      hasAlertDot: hasProfileAlert,
    },
    {
      id: 'settings',
      label: 'Impostazioni',
      icon: Settings,
      accentColor: 'text-amber-400',
    },
  ];

  return (
    <div className="min-h-[100dvh] bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col font-sans relative overflow-x-hidden select-none touch-manipulation transition-colors duration-200">
      {/* ─── GLOW AMBIENTALE DI SFONDO COORDINATO ─── */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[250px] bg-[var(--color-primary)]/10 rounded-full blur-[100px] pointer-events-none" />

      {/* ─── TOP APP BAR ATLETA CON SUPPORTO SAFE AREA NOTCH / DYNAMIC ISLAND iOS ─── */}
      <header className="sticky top-0 z-30 bg-[var(--color-surface)]/85 backdrop-blur-xl border-b border-[var(--color-border)] px-4 sm:px-6 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pb-3 flex items-center justify-between shadow-md transition-colors duration-200">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[var(--color-surface)] border-2 border-[var(--color-primary)] shadow-md shrink-0 flex items-center justify-center relative overflow-hidden">
            <img src="/ac-logo-transparent.png" alt="AC" className="w-full h-full object-contain scale-115" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-black text-lg tracking-tight text-[var(--color-text)]">AC</h1>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/30">
                App
              </span>
            </div>
            <p className="text-[10px] text-[var(--color-text-muted)] font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {currentAthlete?.fullName || user?.name || user?.email || 'Portale Atleta'}
            </p>
          </div>
        </div>

        {/* Pulsante Logout */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={logout}
            className="p-2 text-[var(--color-text-muted)] hover:text-rose-500 hover:bg-[var(--color-surface-strong)] rounded-xl transition-all cursor-pointer border border-transparent hover:border-[var(--color-border)]"
            title="Esci dal portale"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ─── CONTENUTO PRINCIPALE TAB ─── */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 pb-[calc(7rem+env(safe-area-inset-bottom,0px))]">
        {activeTab === 'home' && (
          <AthleteDashboard
            onStartWorkout={(workout, exercises, targetAthleteId) => {
              setActiveWorkout({ workout, exercises, targetAthleteId });
            }}
          />
        )}

        {activeTab === 'progress' && <AthleteProgressView targetAthleteId={athleteId} />}

        {activeTab === 'messages' && <AthleteChat />}

        {activeTab === 'profile' && <AthleteProfileView />}

        {activeTab === 'settings' && <AthleteSettingsView />}
      </main>

      {/* ─── FLOATING DYNAMIC ISLAND NAVBAR CON BADGE DI NOTIFICA IN-APP & SAFE AREA ─── */}
      <div className="fixed bottom-[max(0.75rem,calc(env(safe-area-inset-bottom,0px)+0.5rem))] inset-x-0 z-40 px-3 sm:px-4 flex items-center justify-center pointer-events-none">
        <nav className="w-full max-w-lg bg-[var(--color-surface)]/95 backdrop-blur-2xl border border-[var(--color-border)] p-1.5 rounded-[28px] grid grid-cols-5 gap-1 shadow-[0_12px_40px_rgba(0,0,0,0.15)] pointer-events-auto transition-colors duration-200">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all duration-200 cursor-pointer select-none active:scale-95 min-h-[50px] relative ${
                  isActive
                    ? 'bg-[var(--color-primary)] text-slate-950 font-black shadow-md shadow-[var(--color-primary)]/20'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-strong)] font-semibold'
                }`}
              >
                <div className="relative flex items-center justify-center mb-0.5">
                  <Icon className={`w-4 h-4 shrink-0 transition-transform ${isActive ? 'stroke-[2.5] scale-110' : item.accentColor}`} />
                  
                  {/* Badge Numerico Messaggi Non Letti */}
                  {Boolean(item.badgeCount && item.badgeCount > 0) && (
                    <span
                      className={`absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-black flex items-center justify-center shadow-md border ${
                        isActive
                          ? 'bg-slate-950 text-[var(--color-primary)] border-[var(--color-primary)]'
                          : 'bg-rose-500 text-white border-[var(--color-surface)]'
                      }`}
                    >
                      {item.badgeCount! > 9 ? '9+' : item.badgeCount}
                    </span>
                  )}

                  {/* Dot di Alert per Bozza Attiva, Profilo o Check in scadenza */}
                  {Boolean(item.hasAlertDot && (!item.badgeCount || item.badgeCount === 0)) && (
                    <span
                      className={`absolute -top-0.5 -right-1 w-2 h-2 rounded-full ring-2 ${
                        isActive
                          ? 'bg-slate-950 ring-[var(--color-primary)]'
                          : 'bg-amber-500 ring-[var(--color-surface)]'
                      }`}
                    />
                  )}
                </div>

                <span className="leading-tight text-[10px] sm:text-[11px] truncate max-w-full text-center">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
