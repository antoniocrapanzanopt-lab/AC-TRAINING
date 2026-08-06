import React from 'react';
import { Dumbbell, CalendarDays, ChevronRight, Clock, Play } from 'lucide-react';
import { WorkoutTemplate, WorkoutExercise } from '../../types/workout';

interface AthleteDashboardProps {
  onStartWorkout: (workout: WorkoutTemplate, exercises: WorkoutExercise[]) => void;
}

export const AthleteDashboard: React.FC<AthleteDashboardProps> = ({ onStartWorkout }) => {
  // MOCK DATA: Questo in futuro verrà da Supabase in base all'assigned_workouts dell'atleta loggato
  const mockWorkout: WorkoutTemplate = {
    id: 'w-1',
    title: 'Forza Ipertrofia (Giorno A)',
    description: 'Focus su petto, spalle e tricipiti. Mantieni i tempi di recupero e concentrati sulla tecnica.',
    coach_id: 'coach-1',
    is_template: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockExercises: WorkoutExercise[] = [
    {
      id: 'ex-1',
      workout_id: 'w-1',
      name: 'Panca Piana con Bilanciere',
      sets: 4,
      reps_target: '8-10',
      rest_seconds: 120,
      order_index: 0,
      notes: 'Discesa controllata (3s), spinta esplosiva',
    },
    {
      id: 'ex-2',
      workout_id: 'w-1',
      name: 'Spinte con Manubri su Panca Inclinata',
      sets: 3,
      reps_target: '10-12',
      rest_seconds: 90,
      order_index: 1,
    },
    {
      id: 'ex-3',
      workout_id: 'w-1',
      name: 'Croci ai Cavi',
      sets: 3,
      reps_target: '15',
      rest_seconds: 60,
      order_index: 2,
      notes: 'Massimo allungamento e contrazione di picco (1s)',
    }
  ];

  return (
    <div className="space-y-6">
      
      {/* Saluto e Riepilogo */}
      <div>
        <h2 className="text-xl font-bold mb-1">Il tuo Allenamento</h2>
        <p className="text-sm text-slate-400">Ecco cosa ha preparato il tuo coach per te oggi.</p>
      </div>

      {/* Card Allenamento del Giorno */}
      <div className="bg-slate-900 border border-[var(--color-primary)]/30 rounded-2xl overflow-hidden shadow-lg shadow-[var(--color-primary)]/5">
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-5 border-b border-slate-800">
          <div className="flex justify-between items-start mb-3">
            <div className="bg-[var(--color-primary)]/10 text-[var(--color-primary)] p-2 rounded-xl">
              <Dumbbell className="w-6 h-6" />
            </div>
            <span className="px-2.5 py-1 bg-green-500/10 text-green-400 text-[10px] font-bold rounded-full uppercase tracking-wide">
              Oggi
            </span>
          </div>
          <h3 className="text-lg font-bold text-white mb-1">{mockWorkout.title}</h3>
          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
            {mockWorkout.description}
          </p>
          
          <div className="mt-4 flex items-center gap-4 text-xs text-slate-300 font-medium">
            <div className="flex items-center gap-1.5">
              <Dumbbell className="w-3.5 h-3.5 text-slate-500" />
              <span>{mockExercises.length} esercizi</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>~45 min</span>
            </div>
          </div>
        </div>
        
        <div className="p-4 bg-slate-900/50">
          <button 
            onClick={() => onStartWorkout(mockWorkout, mockExercises)}
            className="w-full flex items-center justify-center gap-2 bg-[var(--color-primary)] text-black font-bold py-3.5 px-4 rounded-xl hover:bg-[var(--color-primary-hover)] transition-all shadow-md active:scale-[0.98]"
          >
            <Play className="w-4 h-4 fill-black" />
            INIZIA ALLENAMENTO
          </button>
        </div>
      </div>

      {/* Prossimi Allenamenti */}
      <div>
        <h3 className="text-sm font-bold text-slate-300 mb-3 uppercase tracking-wider flex items-center gap-2">
          <CalendarDays className="w-4 h-4" /> I prossimi giorni
        </h3>
        <div className="space-y-3">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between opacity-70">
            <div>
              <p className="text-[10px] text-[var(--color-primary)] font-bold uppercase mb-1">Domani</p>
              <h4 className="text-sm font-bold">Giorno B: Dorso e Bicipiti</h4>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between opacity-50">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Giovedì</p>
              <h4 className="text-sm font-bold text-slate-300">Giorno C: Gambe e Core</h4>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-700" />
          </div>
        </div>
      </div>

    </div>
  );
};
