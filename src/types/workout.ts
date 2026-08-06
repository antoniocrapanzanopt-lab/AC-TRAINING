export interface WorkoutFolder {
  id: string;
  coach_id: string;
  parent_id?: string | null;
  name: string;
  color?: string;
  created_at?: string;
  updated_at?: string;
}

export interface WorkoutTemplate {
  id: string;
  title: string;
  description?: string;
  coach_id: string;
  folder_id?: string | null;
  is_template: boolean;
  total_weeks?: number;
  created_at: string;
  updated_at: string;
}

export interface WorkoutExercise {
  id: string;
  workout_id: string;
  name: string;
  sets: number;
  reps_target: string;
  rest_seconds: number;
  order_index: number;
  notes?: string;
  day_name?: string;
  week_number?: number;
  target_weight?: string;
  rir_target?: string;
  tut?: string;
  is_time_based?: boolean;
  duration_seconds?: number;
  alternative_exercise?: string;
}

export interface AthleteAssignedWorkout {
  id: string;
  athlete_id: string;
  workout_id: string;
  assigned_by: string;
  assigned_date: string;
  is_active: boolean;
  workout?: WorkoutTemplate; // joined data
}

export interface WorkoutSession {
  id: string;
  athlete_id: string;
  workout_id: string;
  start_time: string;
  end_time?: string;
  notes?: string;
  rpe?: number;
}

export interface ExerciseLog {
  id: string;
  session_id: string;
  exercise_id: string;
  set_number: number;
  reps_completed: number;
  weight_kg: number;
  notes?: string;
}
