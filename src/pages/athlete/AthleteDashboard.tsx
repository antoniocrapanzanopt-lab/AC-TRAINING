import React from 'react';
import { Dumbbell, CalendarDays, ChevronRight, Clock, Play } from 'lucide-react';
import { WorkoutTemplate, WorkoutExercise } from '../../types/workout';
import { useWorkouts } from '../../context/WorkoutsContext';
import { useToast } from '../../context/ToastContext';

interface AthleteDashboardProps {
  onStartWorkout: (workout: WorkoutTemplate, exercises: WorkoutExercise[]) => void;
}

export const AthleteDashboard: React.FC<AthleteDashboardProps> = ({ onStartWorkout }) => {
  const { myAssignedWorkouts, getExercisesForWorkout, loading } = useWorkouts();
  const { showError } = useToast();
  const [startingWorkoutId, setStartingWorkoutId] = React.useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = React.useState<number>(1);
  const [selectedDay, setSelectedDay] = React.useState<string>('Giorno A');

  const handleStartWorkout = async (assigned: any) => {
    try {
      setStartingWorkoutId(assigned.workout_id);
      const allExercises = await getExercisesForWorkout(assigned.workout_id);
      if (allExercises.length === 0) {
        showError('Questa scheda non contiene esercizi!');
        setStartingWorkoutId(null);
        return;
      }

      // Filtra gli esercizi per la settimana e giorno selezionati, se presenti
      const filtered = allExercises.filter(ex => {
        const matchWeek = !ex.week_number || ex.week_number === selectedWeek;
        const matchDay = !ex.day_name || ex.day_name === selectedDay;
        return matchWeek && matchDay;
      });

      const finalExercises = filtered.length > 0 ? filtered : allExercises;
      onStartWorkout(assigned.workout, finalExercises);
    } catch (err) {
      showError('Impossibile caricare gli esercizi della scheda');
    } finally {
      setStartingWorkoutId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 font-bold">Caricamento delle tue schede...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Saluto e Riepilogo */}
      <div>
        <h2 className="text-xl font-bold mb-1">Il tuo Allenamento</h2>
        <p className="text-sm text-slate-400">Ecco cosa ha preparato il tuo coach per te.</p>
      </div>

      {myAssignedWorkouts.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center">
           <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
             <Dumbbell className="w-8 h-8 text-slate-500" />
           </div>
           <h3 className="text-lg font-bold text-white mb-2">Nessuna scheda assegnata</h3>
           <p className="text-slate-400 text-sm">Il tuo coach non ti ha ancora assegnato un programma di allenamento. Torna a controllare più tardi!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {myAssignedWorkouts.map((assigned: any, index) => (
            <div key={assigned.id} className="bg-slate-900 border border-[var(--color-primary)]/30 rounded-2xl overflow-hidden shadow-lg shadow-[var(--color-primary)]/5">
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-5 border-b border-slate-800">
                <div className="flex justify-between items-start mb-3">
                  <div className="bg-[var(--color-primary)]/10 text-[var(--color-primary)] p-2 rounded-xl">
                    <Dumbbell className="w-6 h-6" />
                  </div>
                  {index === 0 && (
                    <span className="px-2.5 py-1 bg-green-500/10 text-green-400 text-[10px] font-bold rounded-full uppercase tracking-wide">
                      In Corso
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-white mb-1">{assigned.workout.title}</h3>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {assigned.workout.description || 'Nessuna descrizione'}
                </p>
                
                <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-300 font-medium">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Assegnata il {new Date(assigned.assigned_date).toLocaleDateString()}</span>
                  </div>
                  {assigned.workout.total_weeks && assigned.workout.total_weeks > 1 && (
                    <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 font-bold rounded text-[10px]">
                      Programma di {assigned.workout.total_weeks} Settimane
                    </span>
                  )}
                </div>
              </div>

              {/* Selettore Settimana e Giorno per l'Atleta */}
              <div className="p-4 bg-slate-900/80 border-t border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-300">
                    <span>Settimana:</span>
                    <select
                      value={selectedWeek}
                      onChange={e => setSelectedWeek(parseInt(e.target.value) || 1)}
                      className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1 font-bold focus:outline-none"
                    >
                      {Array.from({ length: assigned.workout.total_weeks || 1 }).map((_, wIdx) => (
                        <option key={wIdx + 1} value={wIdx + 1}>Settimana {wIdx + 1}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5 font-bold text-slate-300">
                    <span>Giorno:</span>
                    <select
                      value={selectedDay}
                      onChange={e => setSelectedDay(e.target.value)}
                      className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1 font-bold focus:outline-none"
                    >
                      <option value="Giorno A">Giorno A</option>
                      <option value="Giorno B">Giorno B</option>
                      <option value="Giorno C">Giorno C</option>
                      <option value="Giorno D">Giorno D</option>
                    </select>
                  </div>
                </div>

                <button 
                  onClick={() => handleStartWorkout(assigned)}
                  disabled={startingWorkoutId === assigned.workout_id}
                  className="w-full flex items-center justify-center gap-2 bg-[var(--color-primary)] text-black font-bold py-3.5 px-4 rounded-xl hover:bg-[var(--color-primary-hover)] transition-all shadow-md active:scale-[0.98] disabled:opacity-50"
                >
                  {startingWorkoutId === assigned.workout_id ? (
                     <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  ) : (
                     <Play className="w-4 h-4 fill-black" />
                  )}
                  {startingWorkoutId === assigned.workout_id ? 'CARICAMENTO...' : `INIZIA ${selectedDay} (Sett. ${selectedWeek})`}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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
