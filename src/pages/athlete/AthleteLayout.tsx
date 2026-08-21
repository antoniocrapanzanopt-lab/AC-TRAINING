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
} from 'lucide-react';
import { AthleteDashboard } from './AthleteDashboard';
import { WorkoutPlayer } from './WorkoutPlayer';
import { AthleteChat } from './AthleteChat';
import { AthleteProgressView } from './AthleteProgressView';
import { AthleteProfileView } from './AthleteProfileView';
import { WorkoutTemplate, WorkoutExercise } from '../../types/workout';
import { AthleteMetric } from '../../types/metrics';
import { getActiveWorkoutDraft } from '../../lib/offline/offlineWorkoutStorage';
import { useMetrics } from '../../context/MetricsContext';

export const AthleteLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { athletes } = useAthletes();
  const { messages } = useMessages();
  const { metrics, getAthleteScheduleState } = useMetrics();

  const [activeTab, setActiveTab] = useState<'home' | 'progress' | 'messages' | 'profile'>('home');
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
    id: 'home' | 'progress' | 'messages' | 'profile';
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
  ];

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-white flex flex-col font-sans relative overflow-x-hidden select-none touch-manipulation">
      {/* ─── GLOW AMBIENTALE DI SFONDO COORDINATO ─── */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[250px] bg-[var(--color-primary)]/10 rounded-full blur-[100px] pointer-events-none" />

      {/* ─── TOP APP BAR ATLETA ─── */}
      <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-6 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-950 border border-[var(--color-primary)] p-1 shadow-md shadow-[var(--color-primary)]/20 shrink-0 flex items-center justify-center relative overflow-hidden">
            <img src="/ac-logo-transparent.png" alt="AC" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-black text-base tracking-tight text-white">AC</h1>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/30">
                App
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {currentAthlete?.fullName || user?.name || user?.email || 'Portale Atleta'}
            </p>
          </div>
        </div>

        {/* Pulsante Logout */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={logout}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-xl transition-all cursor-pointer border border-transparent hover:border-slate-800"
            title="Esci dal portale"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ─── CONTENUTO PRINCIPALE TAB ─── */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 pb-28">
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
      </main>

      {/* ─── FLOATING DYNAMIC ISLAND NAVBAR CON BADGE DI NOTIFICA IN-APP ─── */}
      <div className="fixed bottom-3 inset-x-0 z-40 px-3 sm:px-4 flex items-center justify-center pointer-events-none">
        <nav className="w-full max-w-md bg-slate-950/90 backdrop-blur-2xl border border-slate-800/90 p-1.5 rounded-[26px] flex items-center justify-between gap-1 shadow-[0_12px_40px_rgba(0,0,0,0.85)] pointer-events-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 sm:px-2.5 rounded-2xl transition-all duration-200 cursor-pointer select-none active:scale-95 min-h-[46px] relative ${
                  isActive
                    ? 'bg-[var(--color-primary)] text-slate-950 font-black shadow-lg shadow-[var(--color-primary)]/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/80 font-semibold'
                }`}
              >
                <div className="relative flex items-center justify-center">
                  <Icon className={`w-4 h-4 shrink-0 transition-transform ${isActive ? 'stroke-[2.5] scale-110' : item.accentColor}`} />
                  
                  {/* Badge Numerico Messaggi Non Letti */}
                  {Boolean(item.badgeCount && item.badgeCount > 0) && (
                    <span
                      className={`absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-black flex items-center justify-center shadow-lg border border-slate-950 animate-pulse ${
                        isActive
                          ? 'bg-slate-950 text-[var(--color-primary)]'
                          : 'bg-rose-500 text-white shadow-rose-500/50'
                      }`}
                    >
                      {item.badgeCount! > 9 ? '9+' : item.badgeCount}
                    </span>
                  )}

                  {/* Dot di Alert per Bozza Attiva, Profilo o Check in scadenza */}
                  {Boolean(item.hasAlertDot && (!item.badgeCount || item.badgeCount === 0)) && (
                    <span
                      className={`absolute -top-0.5 -right-1 w-2.5 h-2.5 rounded-full border border-slate-950 animate-pulse ${
                        isActive ? 'bg-slate-950' : 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]'
                      }`}
                    />
                  )}
                </div>

                <span className="whitespace-nowrap leading-tight text-[11px] sm:text-xs">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
