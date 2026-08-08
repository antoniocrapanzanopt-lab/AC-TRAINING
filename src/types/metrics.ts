export interface AthleteMetric {
  id: string;
  athlete_id: string;
  date: string;
  weight_kg?: number | null;
  height_cm?: number | null;
  body_fat_percentage?: number | null;
  neck_cm?: number | null;
  shoulders_cm?: number | null;
  chest_cm?: number | null;
  waist_cm?: number | null;
  hips_cm?: number | null;
  bicep_right_cm?: number | null;
  bicep_left_cm?: number | null;
  thigh_right_cm?: number | null;
  thigh_left_cm?: number | null;
  calf_right_cm?: number | null;
  calf_left_cm?: number | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AthleteMaxLift {
  id: string;
  athlete_id: string;
  exercise_id?: string | null;
  exercise_name: string;
  weight_kg: number;
  reps: number;
  calculated_1rm: number;
  is_real_1rm: boolean;
  date: string;
  notes?: string | null;
  created_at?: string;
}

export type AthleteMetricInput = Omit<AthleteMetric, 'id' | 'created_at' | 'updated_at'>;
export type AthleteMaxLiftInput = Omit<AthleteMaxLift, 'id' | 'created_at'>;
