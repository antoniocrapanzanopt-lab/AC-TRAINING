/**
 * Utility per il calcolo delle piastre e dischi su bilanciere (Plate Calculator)
 */

export interface PlateInfo {
  weight: number;
  color: string;
  borderColor: string;
  textColor: string;
  heightClass: string; // Altezza visiva relativa del disco sul bilanciere
}

export const AVAILABLE_PLATES: PlateInfo[] = [
  { weight: 25, color: '#ef4444', borderColor: '#b91c1c', textColor: '#ffffff', heightClass: 'h-24 sm:h-28' }, // Rosso
  { weight: 20, color: '#3b82f6', borderColor: '#1d4ed8', textColor: '#ffffff', heightClass: 'h-22 sm:h-26' }, // Blu
  { weight: 15, color: '#eab308', borderColor: '#a16207', textColor: '#000000', heightClass: 'h-20 sm:h-24' }, // Giallo
  { weight: 10, color: '#22c55e', borderColor: '#15803d', textColor: '#ffffff', heightClass: 'h-18 sm:h-20' }, // Verde
  { weight: 5, color: '#f8fafc', borderColor: '#94a3b8', textColor: '#000000', heightClass: 'h-14 sm:h-16' },  // Bianco
  { weight: 2.5, color: '#1e293b', borderColor: '#475569', textColor: '#ffffff', heightClass: 'h-12 sm:h-14' }, // Nero / Grigio scuro
  { weight: 1.25, color: '#94a3b8', borderColor: '#cbd5e1', textColor: '#000000', heightClass: 'h-10 sm:h-12' }, // Argento
  { weight: 0.5, color: '#f97316', borderColor: '#c2410c', textColor: '#ffffff', heightClass: 'h-8 sm:h-9' },   // Arancione Micro
];

export interface PlateCalculationResult {
  targetWeight: number;
  barbellWeight: number;
  weightPerSide: number;
  platesPerSide: { plate: PlateInfo; count: number }[];
  totalLoadedWeight: number;
  remainder: number;
}

/**
 * Calcola la composizione greedy ottimale dei dischi per lato del bilanciere
 */
export function calculatePlates(
  targetWeight: number,
  barbellWeight = 20,
  availableWeights: number[] = [25, 20, 15, 10, 5, 2.5, 1.25, 0.5]
): PlateCalculationResult {
  const safeTarget = Math.max(0, targetWeight);
  const safeBar = Math.max(0, barbellWeight);

  if (safeTarget <= safeBar) {
    return {
      targetWeight: safeTarget,
      barbellWeight: safeBar,
      weightPerSide: 0,
      platesPerSide: [],
      totalLoadedWeight: safeBar,
      remainder: 0,
    };
  }

  const weightNeeded = safeTarget - safeBar;
  let weightPerSide = weightNeeded / 2;

  const platesMap = new Map<number, number>();
  const sortedWeights = [...availableWeights].sort((a, b) => b - a);

  for (const w of sortedWeights) {
    if (w <= 0) continue;
    const count = Math.floor(weightPerSide / w);
    if (count > 0) {
      platesMap.set(w, count);
      weightPerSide = Math.round((weightPerSide - count * w) * 100) / 100;
    }
  }

  const platesPerSide: { plate: PlateInfo; count: number }[] = [];
  let calculatedSideWeight = 0;

  for (const plate of AVAILABLE_PLATES) {
    const count = platesMap.get(plate.weight);
    if (count && count > 0) {
      platesPerSide.push({ plate, count });
      calculatedSideWeight += plate.weight * count;
    }
  }

  const totalLoaded = safeBar + calculatedSideWeight * 2;
  const remainder = Math.round((safeTarget - totalLoaded) * 100) / 100;

  return {
    targetWeight: safeTarget,
    barbellWeight: safeBar,
    weightPerSide: calculatedSideWeight,
    platesPerSide,
    totalLoadedWeight: totalLoaded,
    remainder,
  };
}
