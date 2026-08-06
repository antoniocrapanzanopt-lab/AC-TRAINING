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
    
    // Durata lavoro per serie: se a tempo usa duration_seconds, altrimenti stimiamo 30s - 45s per serie
    const workPerSetMin = ex.is_time_based ? (ex.duration_seconds || 30) : 30;
    const workPerSetMax = ex.is_time_based ? (ex.duration_seconds || 30) : 45;

    const setTotalMin = sets * (workPerSetMin + rest);
    const setTotalMax = sets * (workPerSetMax + rest);

    totalMinSeconds += setTotalMin;
    totalMaxSeconds += setTotalMax;
  });

  // Aggiungiamo 5 minuti di riscaldamento/defaticamento
  const minMin = Math.max(5, Math.round((totalMinSeconds + 300) / 60));
  const maxMin = Math.max(10, Math.round((totalMaxSeconds + 300) / 60));

  if (minMin === maxMin) {
    return { minMin, maxMin, display: `${minMin} min` };
  }
  return { minMin, maxMin, display: `${minMin} - ${maxMin} min` };
}
