import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Home, Dumbbell, User } from 'lucide-react';
import { AthleteDashboard } from './AthleteDashboard';
import { WorkoutPlayer } from './WorkoutPlayer';
import { WorkoutTemplate, WorkoutExercise } from '../../types/workout';

export const AthleteLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'home' | 'profile'>('home');
  const [activeWorkout, setActiveWorkout] = useState<{ workout: WorkoutTemplate, exercises: WorkoutExercise[] } | null>(null);

  if (activeWorkout) {
    return (
      <WorkoutPlayer 
        workout={activeWorkout.workout} 
        exercises={activeWorkout.exercises} 
        onClose={() => setActiveWorkout(null)} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[var(--color-primary)] rounded-full flex items-center justify-center text-black font-bold text-sm shadow-md">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight">Ciao, {user?.name}</h1>
            <p className="text-[10px] text-[var(--color-primary)] font-medium">Area Atleta</p>
          </div>
        </div>
        <button 
          onClick={logout}
          className="p-2 text-slate-400 hover:text-red-400 transition-colors bg-slate-800 rounded-full"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 pb-24">
        {activeTab === 'home' ? (
          <AthleteDashboard onStartWorkout={(workout, exercises) => setActiveWorkout({ workout, exercises })} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm">
            <User className="w-12 h-12 mb-4 opacity-50" />
            <p>Il tuo profilo sarà disponibile a breve.</p>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-slate-900/90 backdrop-blur-md border-t border-slate-800 p-2 pb-safe fixed bottom-0 w-full flex justify-around z-20">
        <button 
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl min-w-[64px] transition-all ${activeTab === 'home' ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'text-slate-400'}`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-medium">Oggi</span>
        </button>
        <button 
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl min-w-[64px] transition-all ${activeTab === 'profile' ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'text-slate-400'}`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] font-medium">Profilo</span>
        </button>
      </nav>
    </div>
  );
};
