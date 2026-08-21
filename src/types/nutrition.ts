import { Gender, ActivityLevel, NutritionGoal, FormulaType } from '../utils/nutritionCalculator';

export type { Gender, ActivityLevel, NutritionGoal, FormulaType };

export type NutritionPlanStatus = 'draft' | 'active' | 'archived';

export interface MacroValues {
  targetKcal: number;
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;
}

export interface MacroPercentages {
  proteinPercent: number;
  carbPercent: number;
  fatPercent: number;
}

export interface MacroGramsPerKg {
  proteinPerKg: number;
  carbPerKg: number;
  fatPerKg: number;
}

export interface NutritionRevision {
  id: string;
  planId: string;
  date: string;
  oldValues: MacroValues;
  newValues: MacroValues;
  reason: string;
  coachNote?: string;
  author: string;
}

export interface NutritionPlan {
  id: string;
  athleteId: string;
  athleteName: string;
  status: NutritionPlanStatus;
  goal: NutritionGoal;
  targetKcal: number;
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;
  startDate: string;
  reviewDate?: string;
  coachNotes?: string;
  mode: 'auto' | 'manual';
  estimatorBasis?: {
    weightKg: number;
    heightCm: number;
    age: number;
    gender: Gender;
    activityLevel: ActivityLevel;
    bodyFatPercent?: number;
    formula: FormulaType;
    bmr: number;
    tdee: number;
  };
  revisions: NutritionRevision[];
  createdAt: string;
  updatedAt: string;
}

export interface AthleteNutritionCheckIn {
  id: string;
  athleteId: string;
  athleteName?: string;
  date: string;
  weightKg: number;
  adherenceScore: number; // 1 (scarsa) - 5 (perfetta)
  hungerScore: number;    // 1 (bassa/sazio) - 5 (fame estrema)
  energyScore: number;    // 1 (molto stanco) - 5 (molta energia)
  sleepScore: number;     // 1 (pessimo) - 5 (ottimo)
  digestionScore: number; // 1 (pesantezza/gonfiore) - 5 (ottima)
  notes?: string;
  createdAt: string;
}

export type NutritionAlertType = 
  | 'weight_stall' 
  | 'rapid_weight_change' 
  | 'high_hunger' 
  | 'low_energy' 
  | 'low_adherence' 
  | 'missed_checkin' 
  | 'review_due';

export type NutritionSuggestedAction = 
  | 'keep' 
  | 'modify_kcal' 
  | 'modify_macros' 
  | 'contact_athlete' 
  | 'request_checkin';

export interface NutritionCoachAlert {
  id: string;
  athleteId: string;
  athleteName: string;
  type: NutritionAlertType;
  severity: 'warning' | 'alert' | 'info';
  title: string;
  description: string;
  suggestedActions: NutritionSuggestedAction[];
  createdAt: string;
}
