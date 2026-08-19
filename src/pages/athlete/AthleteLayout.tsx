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
import { getActiveWorkoutDraft } from '../../lib/offline/offlineWorkoutStorage';

export const AthleteLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { athletes } = useAthletes();
  const { messages } = useMessages();

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
      <div className="absolute bottom-10 left-10 w-[350px] h-[350px] bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />

      {/* ─── HEADER SUPERIORE BRANDED CON LOGO UFFICIALE ─── */}
      <header className="bg-slate-950/80 backdrop-blur-2xl border-b border-slate-800/80 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-lg shadow-black/40">
        {/* Sinistra: Logo Ufficiale AC + Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-900/90 border border-slate-800/90 flex items-center justify-center shrink-0 shadow-lg shadow-black/50 p-1.5 backdrop-blur-md">
            <img 
              src="/ac-logo-transparent.png" 
              alt="AC Coaching Official" 
              className="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-black tracking-tight text-white uppercase">
                <span className="text-[var(--color-primary)]">AC</span> COACHING
              </span>
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-[var(--color-primary)]/15 text-[var(--color-primary)] border border-[var(--color-primary)]/30">
                Atleta
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] inline-block shadow-[0_0_6px_var(--color-primary)] animate-pulse" />
              {user?.name || 'Atleta Performance'}
            </p>
          </div>
        </div>

        {/* Destra: Avatar con Iniziale + Logout */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-[var(--color-primary)] rounded-2xl flex items-center justify-center text-slate-950 font-black text-xs sm:text-sm shadow-md shadow-[var(--color-primary)]/20">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
          </div>

          <button
            type="button"
            onClick={logout}
            className="p-2 text-slate-400 hover:text-rose-400 active:scale-95 transition-all bg-slate-900/90 hover:bg-slate-850 rounded-xl sm:rounded-2xl border border-slate-800 cursor-pointer shadow-sm"
            title="Esci dall'account"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ─── MAIN CONTENT AREA ─── */}
      <main
        className={`flex-1 w-full mx-auto ${
          activeTab === 'messages'
            ? 'flex flex-col min-h-0 overflow-hidden'
            : 'overflow-y-auto p-3.5 sm:p-6 pb-24 max-w-5xl space-y-4'
        }`}
      >
        {activeTab === 'home' && (
          <AthleteDashboard
            onStartWorkout={(workout, exercises, targetAthleteId) =>
              setActiveWorkout({ workout, exercises, targetAthleteId })
            }
          />
        )}
        {activeTab === 'progress' && <AthleteProgressView />}
        {activeTab === 'messages' && <AthleteChat />}
        {activeTab === 'profile' && <AthleteProfileView />}
      </main>

      {/* ─── FLOATING DYNAMIC ISLAND NAVBAR CON BADGE DI NOTIFICA IN-APP ─── */}
      <div className="fixed bottom-3 inset-x-0 z-40 px-3 sm:px-4 flex items-center justify-center pointer-events-none">
        <nav className="w-full max-w-md bg-slate-950/85 backdrop-blur-2xl border border-slate-800/90 p-1.5 rounded-[26px] flex items-center justify-between gap-1 shadow-[0_12px_40px_rgba(0,0,0,0.85)] pointer-events-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 sm:py-2.5 px-1.5 sm:px-3 rounded-2xl text-[10px] sm:text-xs transition-all duration-200 cursor-pointer select-none active:scale-95 min-h-[46px] min-w-0 relative ${
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

                  {/* Dot di Alert per Bozza Attiva o Profilo */}
                  {Boolean(item.hasAlertDot && (!item.badgeCount || item.badgeCount === 0)) && (
                    <span
                      className={`absolute -top-0.5 -right-1 w-2.5 h-2.5 rounded-full border border-slate-950 animate-pulse ${
                        isActive ? 'bg-slate-950' : 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]'
                      }`}
                    />
                  )}
                </div>

                <span className="truncate leading-tight">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
