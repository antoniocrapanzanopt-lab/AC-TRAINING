export type Gender = 'male' | 'female';

export type ActivityLevel = 
  | 'sedentary' 
  | 'light' 
  | 'moderate' 
  | 'high' 
  | 'very_high';

export type NutritionGoal = 'cutting' | 'maintenance' | 'bulking';

export type FormulaType = 'mifflin_st_jeor' | 'katch_mcardle';

export interface NutritionInput {
  gender: Gender;
  weightKg: number;
  heightCm: number;
  age: number;
  activityLevel: ActivityLevel;
  bodyFatPercent?: number;
  goal: NutritionGoal;
  customDeficitSurplusKcal?: number;
  formula: FormulaType;
}

export interface MacroDistribution {
  proteinGrams: number;
  proteinKcal: number;
  proteinGramsPerKg: number;
  proteinPercent: number;

  fatGrams: number;
  fatKcal: number;
  fatGramsPerKg: number;
  fatPercent: number;

  carbGrams: number;
  carbKcal: number;
  carbGramsPerKg: number;
  carbPercent: number;
}

export interface NutritionResult {
  bmr: number;
  tdee: number;
  targetKcal: number;
  goalOffsetKcal: number;
  lbmKg?: number;
  formulaUsed: FormulaType;
  activityMultiplier: number;
  macros: MacroDistribution;
}

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, { multiplier: number; label: string; description: string }> = {
  sedentary: {
    multiplier: 1.2,
    label: 'Sedentario',
    description: 'Lavoro d’ufficio / poco o nessun esercizio fisico.',
  },
  light: {
    multiplier: 1.375,
    label: 'Attività Leggera',
    description: 'Allenamento leggero o sport 1-3 giorni a settimana.',
  },
  moderate: {
    multiplier: 1.55,
    label: 'Attività Moderata',
    description: 'Allenamento moderato 3-5 giorni a settimana.',
  },
  high: {
    multiplier: 1.725,
    label: 'Attività Alta',
    description: 'Allenamento intenso 6-7 giorni a settimana.',
  },
  very_high: {
    multiplier: 1.9,
    label: 'Attività Molto Alta',
    description: 'Lavoro fisico pesante o doppio allenamento quotidiano.',
  },
};

export const GOAL_OFFSETS: Record<NutritionGoal, { defaultOffset: number; label: string; description: string; rangeText: string }> = {
  cutting: {
    defaultOffset: -350,
    label: 'Definizione / Dimagrimento',
    description: 'Deficit calorico controllato per favorire la perdita di grasso preservando la massa magra.',
    rangeText: '-250 / -500 kcal',
  },
  maintenance: {
    defaultOffset: 0,
    label: 'Mantenimento',
    description: 'Apporto isocalorico per stabilizzare il peso corporeo e ottimizzare le prestazioni.',
    rangeText: '0 kcal (TDEE)',
  },
  bulking: {
    defaultOffset: 250,
    label: 'Massa / Ipertrofia',
    description: 'Surplus calorico moderato per massimizzare la crescita muscolare e il recupero.',
    rangeText: '+200 / +300 kcal',
  },
};

export const NUTRITION_DISCLAIMER = `I valori calcolati sono una stima orientativa basata su formule generali e dati inseriti dall’utente. Non costituiscono prescrizione medica, dietetica o nutrizionale personalizzata. Il professionista non si assume responsabilità per l’uso autonomo di queste stime. Per condizioni cliniche, patologie, gravidanza, disturbi alimentari o esigenze specifiche è necessario rivolgersi a un medico o a un nutrizionista qualificato.`;

export const NUTRITION_GUIDE_TEXT = `Inserisci i dati corporei, seleziona il livello di attività e ottieni una stima orientativa di calorie e macronutrienti.`;

/**
 * Calcola BMR, TDEE, Calorie Target e Ripartizione Macronutrienti
 */
export function calculateNutritionEstimates(input: NutritionInput): NutritionResult {
  const {
    gender,
    weightKg,
    heightCm,
    age,
    activityLevel,
    bodyFatPercent,
    goal,
    customDeficitSurplusKcal,
    formula,
  } = input;

  const validWeight = Math.max(30, Math.min(300, weightKg || 70));
  const validHeight = Math.max(100, Math.min(250, heightCm || 175));
  const validAge = Math.max(14, Math.min(100, age || 25));

  // 1. Calcolo BMR
  let bmr = 0;
  let lbmKg: number | undefined = undefined;
  let formulaUsed: FormulaType = formula;

  const hasValidBodyFat = typeof bodyFatPercent === 'number' && bodyFatPercent > 3 && bodyFatPercent < 60;

  if (formula === 'katch_mcardle' && hasValidBodyFat) {
    // Katch-McArdle
    lbmKg = validWeight * (1 - (bodyFatPercent as number) / 100);
    bmr = 370 + 21.6 * lbmKg;
  } else {
    // Mifflin-St Jeor
    formulaUsed = 'mifflin_st_jeor';
    if (gender === 'male') {
      bmr = 10 * validWeight + 6.25 * validHeight - 5 * validAge + 5;
    } else {
      bmr = 10 * validWeight + 6.25 * validHeight - 5 * validAge - 161;
    }
  }

  bmr = Math.round(bmr);

  // 2. Calcolo TDEE
  const activityInfo = ACTIVITY_MULTIPLIERS[activityLevel] || ACTIVITY_MULTIPLIERS.moderate;
  const tdee = Math.round(bmr * activityInfo.multiplier);

  // 3. Target Calorico
  const goalInfo = GOAL_OFFSETS[goal] || GOAL_OFFSETS.maintenance;
  const goalOffsetKcal = typeof customDeficitSurplusKcal === 'number' 
    ? customDeficitSurplusKcal 
    : goalInfo.defaultOffset;

  const targetKcal = Math.max(1200, Math.round(tdee + goalOffsetKcal));

  // 4. Ripartizione Macronutrienti
  // Proteine: 2.0 g/kg (4 kcal/g)
  const proteinGramsPerKg = 2.0;
  const proteinGrams = Math.round(validWeight * proteinGramsPerKg);
  const proteinKcal = proteinGrams * 4;

  // Grassi: 0.9 g/kg (9 kcal/g)
  const fatGramsPerKg = 0.9;
  const fatGrams = Math.round(validWeight * fatGramsPerKg);
  const fatKcal = fatGrams * 9;

  // Carboidrati: calorie rimanenti / 4
  const remainingKcalForCarbs = Math.max(0, targetKcal - proteinKcal - fatKcal);
  const carbGrams = Math.round(remainingKcalForCarbs / 4);
  const carbKcal = carbGrams * 4;
  const carbGramsPerKg = Number((carbGrams / validWeight).toFixed(2));

  const totalCalculatedKcal = proteinKcal + fatKcal + carbKcal;
  const proteinPercent = Math.round((proteinKcal / (totalCalculatedKcal || 1)) * 100);
  const fatPercent = Math.round((fatKcal / (totalCalculatedKcal || 1)) * 100);
  const carbPercent = Math.max(0, 100 - proteinPercent - fatPercent);

  return {
    bmr,
    tdee,
    targetKcal,
    goalOffsetKcal,
    lbmKg: lbmKg ? Number(lbmKg.toFixed(1)) : undefined,
    formulaUsed,
    activityMultiplier: activityInfo.multiplier,
    macros: {
      proteinGrams,
      proteinKcal,
      proteinGramsPerKg,
      proteinPercent,

      fatGrams,
      fatKcal,
      fatGramsPerKg,
      fatPercent,

      carbGrams,
      carbKcal,
      carbGramsPerKg,
      carbPercent,
    },
  };
}
