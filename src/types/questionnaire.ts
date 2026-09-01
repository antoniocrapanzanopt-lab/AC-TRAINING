// ─── TYPES: QUESTIONARIO ONBOARDING & ANAMNESI AC COACHING ───────────────────

export type QuestionnaireStatus = 'draft' | 'completed' | 'archived';

// Step 1: Biometria
export type BiometricsGender = 'uomo' | 'donna' | 'altro';
export type OccupationType = 'sedentario' | 'moderato' | 'pesante' | 'turnista';

// Step 2: Obiettivi
export type PrimaryGoalType = 
  | 'ipertrofia' 
  | 'dimagrimento' 
  | 'ricomposizione' 
  | 'forza_performance' 
  | 'benessere_tonificazione';

export type SessionDurationMinutes = 45 | 60 | 75 | 90 | 120;
export type PreferredTrainingTime = 
  | 'morning_early'   // 06:00 - 09:00
  | 'morning'         // 09:00 - 12:00
  | 'lunch'           // 12:00 - 15:00
  | 'afternoon'       // 15:00 - 18:00
  | 'evening'         // 18:00 - 21:00
  | 'night';          // 21:00+

// Step 3: Allenamento
export type ExperienceLevel = 'principiante' | 'intermedio' | 'avanzato';
export type TrainingLocationType = 'palestra' | 'home_gym' | 'corpo_libero' | 'ibrido';

// Step 4: Stile di vita
export type SleepQuality = 'pessimo' | 'discontinuo' | 'buono' | 'eccellente';
export type EnergyTrend = 'stabile' | 'calo_pomeridiano' | 'piu_mattina' | 'piu_sera';
export type SmokeAlcoholHabit = 'nessuna' | 'alcol_occasionale' | 'fumo_regolare' | 'entrambi';

// Step 5: Salute
export type MedicalCertStatusOption = 'valido_non_agonistico' | 'valido_agonistico' | 'scaduto_o_mancante';

// Step 6: Nutrizione
export type MealsPerDay = 2 | 3 | 4 | 5 | 6;
export type BreakfastHabit = 'salata' | 'dolce' | 'digiuno' | 'solo_caffe';
export type CalorieTrackingPrecision = 'al_grammo' | 'approssimativo' | 'solo_passato_a_occhio';
export type DietaryRegime = 'onnivoro' | 'flessibile' | 'vegetariano' | 'vegano' | 'pescatariano' | 'chetogenico_lowcarb';
export type WaterIntakeLiters = 'meno_1_5L' | '1_5_2_5L' | '2_5_3_5L' | 'piu_3_5L';

// Struttura dati per le foto del check iniziale
export interface OnboardingPhotoAttachment {
  id: string;
  pose: 'front' | 'side' | 'back' | 'other';
  url: string;
  notes?: string;
}

export interface OnboardingDocAttachment {
  id: string;
  name: string;
  url: string;
  type: 'workout_plan' | 'medical_exam' | 'other';
  sizeBytes?: number;
}

// ─── MODELLO COMPLETO RISPOSTE QUESTIONARIO ─────────────────────────────────

export interface OnboardingQuestionnaireData {
  // Step 1: Profilo & Biometria
  gender: BiometricsGender;
  birthDate: string; // YYYY-MM-DD
  heightCm: number;
  weightKg: number;
  targetWeightKg?: number;
  occupationType: OccupationType;

  // Step 2: Obiettivi & Disponibilità
  primaryGoal: PrimaryGoalType;
  goalNotes?: string;
  weeklyDaysTarget: number; // 2..6
  sessionDurationMinutes: SessionDurationMinutes;
  preferredTrainingTime: PreferredTrainingTime;

  // Step 3: Allenamento & Esperienza
  experienceLevel: ExperienceLevel;
  pastSports: string[];
  trainingLocation: TrainingLocationType;
  homeGymEquipment?: string[];
  dislikedExercises?: string;
  indicativeMaxLifts?: {
    squatKg?: number;
    benchKg?: number;
    deadliftKg?: number;
    pullupsReps?: number;
  };

  // Step 4: Stile di Vita, Sonno & Recupero
  sleepHours: number; // es: 7.5
  sleepQuality: SleepQuality;
  dailyStressLevel: number; // 1..10
  energyDuringDay: EnergyTrend;
  habitsSmokeAlcohol: SmokeAlcoholHabit;

  // Step 5: Salute, Infortuni & Limitazioni (Safety Check)
  hasPastInjuries: boolean;
  pastInjuriesDetails?: string;
  hasJointPain: boolean;
  jointPainLocations?: string[]; // es: ['Spalla Dx', 'Ginocchio Sx']
  jointPainTriggers?: string;
  hasMedicalConditions: boolean;
  medicalConditionsDetails?: string;
  medicalCertificateStatus: MedicalCertStatusOption;

  // Step 6: Nutrizione & Abitudini
  mealsPerDay: MealsPerDay;
  breakfastHabit: BreakfastHabit;
  calorieTracking: boolean;
  calorieTrackingDetails?: {
    appUsed?: string;
    precision?: CalorieTrackingPrecision;
  };
  dietaryRegime: DietaryRegime;
  foodAllergiesIntolerances: string[];
  waterIntake: WaterIntakeLiters;
  currentSupplements: string[];

  // Step 7: Allegati, Foto & Note
  progressPhotos: OnboardingPhotoAttachment[];
  documentAttachments: OnboardingDocAttachment[];
  finalNotesForCoach?: string;
  privacyConsent: boolean;
}

// ─── EXECUTIVE DOSSIER & SINTESI PER IL COACH ───────────────────────────────

export interface QuestionnaireExecutiveSummary {
  // Red Flags / Safety Highlights
  safetyAlerts: {
    type: 'injury' | 'joint_pain' | 'medical_condition' | 'medical_cert';
    severity: 'danger' | 'warning' | 'info';
    title: string;
    description: string;
  }[];

  // Snapshot KPI
  primaryGoalLabel: string;
  weeklyAvailabilitySummary: string; // es: "4 sedute • 75 min • Sera (18-21)"
  trainingLocationLabel: string;
  experienceLabel: string;
  lifestyleScoreSummary: string; // es: "Sonno: 7.5h (Buono) • Stress: 5/10 • Lavoro: Sedentario"
  nutritionSummary: string; // es: "4 pasti • Traccia con MyFitnessPal • No Lattosio"
  photosCount: number;
  documentsCount: number;

  // Azioni suggerite
  suggestedWorkoutSplit?: string; // es: "Upper / Lower (4 giorni)"
  targetDailyCaloriesBasis?: number;
}

// Record salvato a database
export interface AthleteOnboardingRecord {
  id: string;
  athleteId: string;
  athleteName?: string;
  coachId?: string;
  version: string;
  status: QuestionnaireStatus;
  currentStep: number;
  answers: Partial<OnboardingQuestionnaireData>;
  summary?: QuestionnaireExecutiveSummary;
  photoUrls: OnboardingPhotoAttachment[];
  documentUrls: OnboardingDocAttachment[];
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}
