import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
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

export const AthleteLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'home' | 'progress' | 'messages' | 'profile'>('home');
  const [activeWorkout, setActiveWorkout] = useState<{
    workout: WorkoutTemplate;
    exercises: WorkoutExercise[];
    targetAthleteId?: string;
  } | null>(null);

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
  }[] = [
    { id: 'home', label: 'Oggi', icon: Dumbbell },
    { id: 'progress', label: 'Progressi', icon: Scale },
    { id: 'messages', label: 'Messaggi', icon: MessageCircle },
    { id: 'profile', label: 'Profilo', icon: User },
  ];

  return (
    <div className="min-h-[100dvh] bg-[#07090e] text-white flex flex-col font-sans relative overflow-x-hidden select-none touch-manipulation">
      {/* Glow Ambientale di Sfondo */}
      <div className="absolute top-0 right-1/4 w-96 h-40 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* ─── HEADER SUPERIORE COMPATTO MOBILE-FIRST ─── */}
      <header className="bg-slate-950/85 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-md">
        {/* Profilo / Avatar */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-amber-400 to-amber-500 rounded-xl sm:rounded-2xl flex items-center justify-center text-black font-black text-xs sm:text-sm shadow-md shadow-amber-500/20">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-xs sm:text-sm font-black text-white leading-tight tracking-tight">
                {user?.name || 'Atleta'}
              </h1>
              <span className="text-[8px] sm:text-[9px] font-black uppercase px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                Area Atleta
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium">Portale di Allenamento</p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          type="button"
          onClick={logout}
          className="p-2 text-slate-400 hover:text-rose-400 active:scale-95 transition-all bg-slate-900 hover:bg-slate-800 rounded-xl sm:rounded-2xl border border-slate-800 cursor-pointer shadow-sm"
          title="Esci dall'account"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      {/* ─── MAIN CONTENT AREA ─── */}
      <main
        className={`flex-1 w-full mx-auto ${
          activeTab === 'messages'
            ? 'flex flex-col min-h-0 overflow-hidden'
            : 'overflow-y-auto p-3.5 sm:p-6 pb-6 max-w-5xl space-y-4'
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

      {/* ─── FOOTER BAR DI NAVIGAZIONE MOBILE-FIRST (NON SOVRAPPOSTA) ─── */}
      <footer className="sticky bottom-0 z-30 bg-slate-950/95 backdrop-blur-2xl border-t border-slate-800/80 px-3 py-2 sm:py-2.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-center shadow-[0_-10px_30px_rgba(0,0,0,0.6)]">
        <nav className="w-full sm:w-auto max-w-md bg-slate-900/90 border border-slate-800/90 p-1 sm:p-1.5 rounded-2xl flex items-center justify-around sm:justify-center sm:gap-2 shadow-inner">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex-1 sm:flex-initial flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-1.5 sm:py-2 px-2 sm:px-5 rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer select-none active:scale-95 min-h-[44px] ${
                  isActive
                    ? 'bg-amber-500 text-black font-black shadow-md shadow-amber-500/25 scale-[1.02]'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 sm:w-4 sm:h-4 ${isActive ? 'stroke-[2.5]' : ''}`} />
                <span className={isActive ? 'font-black' : 'font-semibold'}>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </footer>
    </div>
  );
};
