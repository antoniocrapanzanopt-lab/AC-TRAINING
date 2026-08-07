import { WorkoutExercise } from '../types/workout';

export function calculateEstimatedWorkoutTime(exercises: Partial<WorkoutExercise>[]): { minMin: number; maxMin: number; display: string } {
  if (!exercises || exercises.length === 0) {
    return { minMin: 0, maxMin: 0, display: '0 min' };
  }

  let totalMinSeconds = 0;
  let totalMaxSeconds = 0;

  exercises.forEach(ex => {
    const sets = ex.sets || 1;
    const rest = ex.rest_seconds || 60;
    
    // Tempo di esecuzione per serie: 40s - 55s per reps classiche coi pesi
    const workPerSetMin = ex.is_time_based ? (ex.duration_seconds || 30) : 40;
    const workPerSetMax = ex.is_time_based ? (ex.duration_seconds || 30) : 55;

    // Tempo totale lavoro + recupero per le serie
    const setTotalMin = sets * (workPerSetMin + rest);
    const setTotalMax = sets * (workPerSetMax + rest);

    // Cambio postazione/carico bilanciere/manubri: 90s ad esercizio
    const transitionSeconds = 90;

    totalMinSeconds += setTotalMin + transitionSeconds;
    totalMaxSeconds += setTotalMax + transitionSeconds;
  });

  // Aggiungiamo 8-10 minuti di riscaldamento generale, mobilità e defaticamento
  const minMin = Math.max(8, Math.round((totalMinSeconds + 480) / 60));
  const maxMin = Math.max(12, Math.round((totalMaxSeconds + 600) / 60));

  if (minMin === maxMin) {
    return { minMin, maxMin, display: `${minMin} min` };
  }
  return { minMin, maxMin, display: `${minMin} - ${maxMin} min` };
}
