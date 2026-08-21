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

// ─── RITUALE CHECK MISURE & PROMEMORIA AUTOMATICI ─────────────────────────

export type CheckFrequency = 7 | 14 | 30;
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Domenica, 1=Lunedì, ...
export type PhotoRequirement = 'none' | 'optional' | 'mandatory';
export type CheckStatus = 'scheduled' | 'due_today' | 'overdue' | 'completed';

export interface RequiredMeasurementsConfig {
  weight: boolean;
  body_fat: boolean;
  neck: boolean;
  shoulders: boolean;
  chest: boolean;
  waist: boolean;
  hips: boolean;
  biceps: boolean;
  thighs: boolean;
  calves: boolean;
}

export interface AthleteCheckScheduleConfig {
  athlete_id: string;
  frequency_days: CheckFrequency;
  preferred_day_of_week?: DayOfWeek;
  required_fields: RequiredMeasurementsConfig;
  photo_requirement: PhotoRequirement;
  reminder_active: boolean;
  second_reminder_active: boolean; // Sollecito dopo 24/48h se non compilato
  custom_notes_prompt?: string;
  updated_at: string;
}

export interface CheckScheduleState {
  status: CheckStatus;
  statusLabel: string;
  lastCheckDate: string | null;
  nextCheckDate: string;
  daysDiff: number; // Giorni rimanenti o di ritardo
  frequencyDays: number;
  isOverdue: boolean;
  isDueToday: boolean;
}

export interface AthleteProgressPhoto {
  id: string;
  athlete_id: string;
  metric_id?: string;
  date: string;
  pose: 'front' | 'back' | 'side' | 'other';
  image_url: string;
  notes?: string;
  created_at: string;
}
