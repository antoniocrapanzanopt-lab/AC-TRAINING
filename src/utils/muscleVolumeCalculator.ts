import { ExerciseItem } from '../types/exercise';
import { WorkoutExercise } from '../types/workout';

export type MuscleGroup =
  | 'Quadricipiti'
  | 'Femorali'
  | 'Glutei'
  | 'Petto'
  | 'Dorso'
  | 'Spalle'
  | 'Bicipiti'
  | 'Tricipiti'
  | 'Trapezio'
  | 'Polpacci'
  | 'Addome'
  | 'Lombari'
  | 'Avambracci';

export type SpecialExerciseCategory =
  | 'Full Body'
  | 'Conditioning'
  | 'Core'
  | 'Mobilità / Prehab'
  | 'Tecnica'
  | 'Non Classificato';

export interface UnclassifiedExerciseInfo {
  name: string;
  sets: number;
  day: string;
  category?: string;
  classificationType: SpecialExerciseCategory;
  reasonLabel: string;
}

export interface MuscleBenchmark {
  name: string;
  mv: string;       // Volume di Mantenimento
  mvMin: number;
  mev: string;      // Volume Minimo Efficace
  mevMin: number;
  mevMax: number;
  mav: string;      // Volume Massimo Adattivo (Target Ipertrofia Ottimale)
  mavMin: number;
  mavMax: number;
  mrv: string;      // Volume Massimo Recuperabile
  mrvMin: number;
  frq: string;      // Frequenza ideale (es. 2–4x / week)
  reps: string;     // Range ripetizioni ideale (es. 6–20)
  rir: string;      // Range RIR ideale (es. 1–3)
}

export type VolumeStatusType =
  | 'under_mv'
  | 'under_mev'
  | 'in_mev'
  | 'in_mav'
  | 'near_mrv'
  | 'above_mrv';

export interface MuscleVolumeDetail {
  muscleGroup: MuscleGroup;
  directSets: number;
  indirectSets: number;
  totalSets: number; // directSets + indirectSets
  effectiveVolume: number; // directSets + (indirectSets * 0.5)
  frequencyDays: string[]; // giorni in cui viene stimolato (es. ['Giorno A', 'Giorno C'])
  exerciseCount: number;
  exercisesList: {
    name: string;
    sets: number;
    type: 'direct' | 'indirect';
    day: string;
  }[];
  benchmark: MuscleBenchmark;
  statusType: VolumeStatusType;
  status: 'low' | 'optimal' | 'high';
  statusLabel: string;
}

export interface VolumeSummaryResult {
  scope: 'day' | 'week' | 'mesocycle';
  scopeLabel: string;
  totalSetsAllMuscles: number;
  totalDirectSets: number;
  totalIndirectSets: number;
  muscleDetails: MuscleVolumeDetail[];
  mostTrainedMuscles: MuscleVolumeDetail[];
  unclassifiedExercises: UnclassifiedExerciseInfo[];
  needsReviewCount: number;
}

// ═════════════════════════════════════════════════════════════════════════════
// BENCHMARK SCIENTIFICI NATIVI PER DISTRETTO MUSCOLARE (MV, MEV, MAV, MRV, FRQ, REPS, RIR)
// ═════════════════════════════════════════════════════════════════════════════
export const MUSCLE_BENCHMARKS: Record<MuscleGroup, MuscleBenchmark> = {
  Quadricipiti: {
    name: 'Quads',
    mv: '6',
    mvMin: 6,
    mev: '8–12',
    mevMin: 8,
    mevMax: 12,
    mav: '12–18',
    mavMin: 12,
    mavMax: 18,
    mrv: '20+',
    mrvMin: 20,
    frq: '1.5–3x',
    reps: '6–20',
    rir: '1–3',
  },
  Femorali: {
    name: 'Femorali',
    mv: '4',
    mvMin: 4,
    mev: '6–10',
    mevMin: 6,
    mevMax: 10,
    mav: '10–16',
    mavMin: 10,
    mavMax: 16,
    mrv: '20+',
    mrvMin: 20,
    frq: '2–3x',
    reps: '6–20',
    rir: '1–3',
  },
  Glutei: {
    name: 'Glutei',
    mv: '0',
    mvMin: 0,
    mev: '0–4',
    mevMin: 0,
    mevMax: 4,
    mav: '4–12',
    mavMin: 4,
    mavMax: 12,
    mrv: '16+',
    mrvMin: 16,
    frq: '2–3x',
    reps: '6–20',
    rir: '1–3',
  },
  Petto: {
    name: 'Pettorali',
    mv: '8',
    mvMin: 8,
    mev: '10–12',
    mevMin: 10,
    mevMax: 12,
    mav: '12–20',
    mavMin: 12,
    mavMax: 20,
    mrv: '22+',
    mrvMin: 22,
    frq: '2–4x',
    reps: '6–20',
    rir: '1–3',
  },
  Dorso: {
    name: 'Dorsali',
    mv: '8',
    mvMin: 8,
    mev: '10–14',
    mevMin: 10,
    mevMax: 14,
    mav: '14–22',
    mavMin: 14,
    mavMax: 22,
    mrv: '25+',
    mrvMin: 25,
    frq: '2–4x',
    reps: '6–20',
    rir: '1–3',
  },
  Spalle: {
    name: 'Deltoidi',
    mv: '0–6',
    mvMin: 0,
    mev: '6–8',
    mevMin: 6,
    mevMax: 8,
    mav: '16–22',
    mavMin: 16,
    mavMax: 22,
    mrv: '26+',
    mrvMin: 26,
    frq: '2–6x',
    reps: '8–20',
    rir: '0–2',
  },
  Bicipiti: {
    name: 'Bicipiti',
    mv: '0–6',
    mvMin: 0,
    mev: '8–14',
    mevMin: 8,
    mevMax: 14,
    mav: '14–20',
    mavMin: 14,
    mavMax: 20,
    mrv: '26+',
    mrvMin: 26,
    frq: '2–6x',
    reps: '8–15',
    rir: '0–2',
  },
  Tricipiti: {
    name: 'Tricipiti',
    mv: '0–4',
    mvMin: 0,
    mev: '6–10',
    mevMin: 6,
    mevMax: 10,
    mav: '10–14',
    mavMin: 10,
    mavMax: 14,
    mrv: '18+',
    mrvMin: 18,
    frq: '2–4x',
    reps: '8–20',
    rir: '0–2',
  },
  Trapezio: {
    name: 'Traps',
    mv: '0',
    mvMin: 0,
    mev: '1–12',
    mevMin: 1,
    mevMax: 12,
    mav: '12–20',
    mavMin: 12,
    mavMax: 20,
    mrv: '26+',
    mrvMin: 26,
    frq: '2–6x',
    reps: '8–20',
    rir: '0–2',
  },
  Polpacci: {
    name: 'Polpacci',
    mv: '0–6',
    mvMin: 0,
    mev: '8–12',
    mevMin: 8,
    mevMax: 12,
    mav: '12–16',
    mavMin: 12,
    mavMax: 16,
    mrv: '20+',
    mrvMin: 20,
    frq: '2–4x',
    reps: '8–20',
    rir: '0–2',
  },
  Addome: {
    name: 'Addome / Abs',
    mv: '0',
    mvMin: 0,
    mev: '1–15',
    mevMin: 1,
    mevMax: 15,
    mav: '16–20',
    mavMin: 16,
    mavMax: 20,
    mrv: '25+',
    mrvMin: 25,
    frq: '2–6x',
    reps: '8–20',
    rir: '0–2',
  },
  Lombari: {
    name: 'Lombari',
    mv: '0–4',
    mvMin: 0,
    mev: '4–8',
    mevMin: 4,
    mevMax: 8,
    mav: '8–14',
    mavMin: 8,
    mavMax: 14,
    mrv: '18+',
    mrvMin: 18,
    frq: '2–3x',
    reps: '8–15',
    rir: '1–3',
  },
  Avambracci: {
    name: 'Avambracci',
    mv: '0–4',
    mvMin: 0,
    mev: '4–8',
    mevMin: 4,
    mevMax: 8,
    mav: '8–14',
    mavMin: 8,
    mavMax: 14,
    mrv: '18+',
    mrvMin: 18,
    frq: '2–4x',
    reps: '10–25',
    rir: '0–2',
  },
};

// Mappatura automatica delle sinergie muscolari biomeccaniche
const BIOMECHANICAL_SYNERGIES: Record<string, { direct: MuscleGroup[]; indirect: MuscleGroup[] }> = {
  panca: { direct: ['Petto'], indirect: ['Tricipiti', 'Spalle'] },
  chest: { direct: ['Petto'], indirect: ['Tricipiti', 'Spalle'] },
  spinte: { direct: ['Petto'], indirect: ['Tricipiti', 'Spalle'] },
  dip: { direct: ['Petto', 'Tricipiti'], indirect: ['Spalle'] },
  croci: { direct: ['Petto'], indirect: ['Spalle'] },
  pushup: { direct: ['Petto'], indirect: ['Tricipiti', 'Spalle', 'Addome'] },
  piegamenti: { direct: ['Petto'], indirect: ['Tricipiti', 'Spalle', 'Addome'] },

  trazioni: { direct: ['Dorso'], indirect: ['Bicipiti', 'Spalle'] },
  lat: { direct: ['Dorso'], indirect: ['Bicipiti'] },
  pulldown: { direct: ['Dorso'], indirect: ['Bicipiti'] },
  rematore: { direct: ['Dorso'], indirect: ['Bicipiti', 'Lombari'] },
  row: { direct: ['Dorso'], indirect: ['Bicipiti'] },
  pulley: { direct: ['Dorso'], indirect: ['Bicipiti'] },
  pull: { direct: ['Dorso'], indirect: ['Bicipiti'] },

  military: { direct: ['Spalle'], indirect: ['Tricipiti'] },
  overhead: { direct: ['Spalle'], indirect: ['Tricipiti'] },
  shoulder: { direct: ['Spalle'], indirect: ['Tricipiti'] },
  lento: { direct: ['Spalle'], indirect: ['Tricipiti'] },
  alzate: { direct: ['Spalle'], indirect: [] },
  deltoid: { direct: ['Spalle'], indirect: [] },

  squat: { direct: ['Quadricipiti'], indirect: ['Glutei', 'Lombari', 'Addome'] },
  press: { direct: ['Quadricipiti'], indirect: ['Glutei'] },
  pressa: { direct: ['Quadricipiti'], indirect: ['Glutei'] },
  affondi: { direct: ['Quadricipiti', 'Glutei'], indirect: ['Femorali'] },
  lunge: { direct: ['Quadricipiti', 'Glutei'], indirect: ['Femorali'] },
  leg_ext: { direct: ['Quadricipiti'], indirect: [] },
  extension: { direct: ['Quadricipiti'], indirect: [] },
  quad: { direct: ['Quadricipiti'], indirect: [] },

  stacco: { direct: ['Femorali', 'Glutei'], indirect: ['Lombari', 'Dorso', 'Trapezio'] },
  deadlift: { direct: ['Femorali', 'Glutei'], indirect: ['Lombari', 'Dorso', 'Trapezio'] },
  leg_curl: { direct: ['Femorali'], indirect: [] },
  curl_femorale: { direct: ['Femorali'], indirect: [] },
  rdl: { direct: ['Femorali', 'Glutei'], indirect: ['Lombari'] },
  hip_thrust: { direct: ['Glutei'], indirect: ['Femorali'] },
  thrust: { direct: ['Glutei'], indirect: ['Femorali'] },

  curl: { direct: ['Bicipiti'], indirect: ['Avambracci'] },
  hammer: { direct: ['Bicipiti', 'Avambracci'], indirect: [] },
  biceps: { direct: ['Bicipiti'], indirect: [] },

  pushdown: { direct: ['Tricipiti'], indirect: [] },
  french: { direct: ['Tricipiti'], indirect: [] },
  skull: { direct: ['Tricipiti'], indirect: [] },
  triceps: { direct: ['Tricipiti'], indirect: [] },

  shrug: { direct: ['Trapezio'], indirect: [] },
  scrollata: { direct: ['Trapezio'], indirect: [] },
  traps: { direct: ['Trapezio'], indirect: [] },

  calf: { direct: ['Polpacci'], indirect: [] },
  polpacci: { direct: ['Polpacci'], indirect: [] },

  crunch: { direct: ['Addome'], indirect: [] },
  plank: { direct: ['Addome'], indirect: ['Lombari', 'Spalle'] },
  situp: { direct: ['Addome'], indirect: [] },
  leg_raise: { direct: ['Addome'], indirect: [] },
  abs: { direct: ['Addome'], indirect: [] },
};

export function identifyMuscleInvolvement(
  exerciseName: string,
  libraryExercise?: ExerciseItem
): { direct: MuscleGroup[]; indirect: MuscleGroup[]; specialCategory?: SpecialExerciseCategory } {
  // Controlla se appartiene a categorie di allenamento speciali (es. Conditioning, Mobilità, Full Body, Tecnica)
  const nameLower = exerciseName.toLowerCase();

  if (
    nameLower.includes('corsa') ||
    nameLower.includes('cardio') ||
    nameLower.includes('tapis') ||
    nameLower.includes('cyclette') ||
    nameLower.includes('airbike') ||
    nameLower.includes('vogatore') ||
    nameLower.includes('hiit') ||
    nameLower.includes('conditioning') ||
    nameLower.includes('salto')
  ) {
    return { direct: [], indirect: [], specialCategory: 'Conditioning' };
  }

  if (
    nameLower.includes('mobilit') ||
    nameLower.includes('stretching') ||
    nameLower.includes('prehab') ||
    nameLower.includes('foam roller') ||
    nameLower.includes('riscaldamento') ||
    nameLower.includes('warmup') ||
    nameLower.includes('flessibilit')
  ) {
    return { direct: [], indirect: [], specialCategory: 'Mobilità / Prehab' };
  }

  if (nameLower.includes('tecnica') || nameLower.includes('propedeutic') || nameLower.includes('drill')) {
    return { direct: [], indirect: [], specialCategory: 'Tecnica' };
  }

  if (nameLower.includes('burpee') || nameLower.includes('clean') || nameLower.includes('snatch') || nameLower.includes('thruster') || nameLower.includes('kettlebell swing')) {
    return { direct: [], indirect: [], specialCategory: 'Full Body' };
  }

  // 1. Controlla muscoli coinvolti mappati nella scheda esercizio
  if (libraryExercise && libraryExercise.muscoli_coinvolti && libraryExercise.muscoli_coinvolti.length > 0) {
    const direct: MuscleGroup[] = [];
    const indirect: MuscleGroup[] = [];

    libraryExercise.muscoli_coinvolti.forEach((m) => {
      const g = mapStringToMuscleGroup(m.muscolo);
      if (g) {
        if (m.ruolo === 'Target') {
          if (!direct.includes(g)) direct.push(g);
        } else {
          if (!indirect.includes(g)) indirect.push(g);
        }
      }
    });

    if (direct.length > 0) {
      return {
        direct,
        indirect: indirect.filter((g) => !direct.includes(g)),
      };
    }
  }

  // 2. Fallback su sinergie biomeccaniche
  for (const [key, map] of Object.entries(BIOMECHANICAL_SYNERGIES)) {
    if (nameLower.includes(key)) {
      return map;
    }
  }

  // 3. Fallback su categoria della libreria
  if (libraryExercise?.category) {
    const directCategory = mapStringToMuscleGroup(libraryExercise.category);
    if (directCategory) {
      return { direct: [directCategory], indirect: [] };
    }
  }

  // Nessuna classificazione anatomica valida trovata -> needs review
  return { direct: [], indirect: [], specialCategory: 'Non Classificato' };
}

export function mapStringToMuscleGroup(name: string): MuscleGroup | null {
  const s = name.toLowerCase();
  if (s.includes('pettor') || s.includes('petto') || s.includes('chest')) return 'Petto';
  if (s.includes('dorsal') || s.includes('dorso') || s.includes('gran dorsale') || s.includes('lat')) return 'Dorso';
  if (s.includes('spall') || s.includes('deltoid') || s.includes('shoulder')) return 'Spalle';
  if (s.includes('quadricipit') || s.includes('vasto') || s.includes('quad')) return 'Quadricipiti';
  if (s.includes('ischiocrural') || s.includes('femorali') || s.includes('hamstring')) return 'Femorali';
  if (s.includes('glute')) return 'Glutei';
  if (s.includes('polpacc') || s.includes('gastrocnem') || s.includes('soleo') || s.includes('calf')) return 'Polpacci';
  if (s.includes('bicipit') || s.includes('brachial') || s.includes('biceps')) return 'Bicipiti';
  if (s.includes('tricipit') || s.includes('triceps')) return 'Tricipiti';
  if (s.includes('trapez') || s.includes('shrug') || s.includes('traps')) return 'Trapezio';
  if (s.includes('addom') || s.includes('core') || s.includes('obliqu') || s.includes('abs') || s.includes('retto')) return 'Addome';
  if (s.includes('lombar') || s.includes('erettor')) return 'Lombari';
  if (s.includes('avambracc') || s.includes('forearm')) return 'Avambracci';
  return null;
}

export function calculateMuscleVolumeSummary(params: {
  exercises: Partial<WorkoutExercise>[];
  libraryExercises?: ExerciseItem[];
  scope: 'day' | 'week' | 'mesocycle';
  activeWeek?: number;
  activeDay?: string;
  totalWeeks?: number;
}): VolumeSummaryResult {
  const {
    exercises,
    libraryExercises = [],
    scope,
    activeWeek = 1,
    activeDay = 'Giorno A',
    totalWeeks = 1,
  } = params;

  let filteredExercises = exercises.filter((ex) => (ex.name || '').trim().length > 0);

  let scopeLabel = `Settimana ${activeWeek}`;
  if (scope === 'day') {
    filteredExercises = filteredExercises.filter(
      (ex) => (ex.week_number || 1) === activeWeek && (ex.day_name || 'Giorno A') === activeDay
    );
    scopeLabel = `${activeDay} (Sett. ${activeWeek})`;
  } else if (scope === 'week') {
    filteredExercises = filteredExercises.filter((ex) => (ex.week_number || 1) === activeWeek);
    scopeLabel = `Settimana ${activeWeek} (Tutte le sedute)`;
  } else if (scope === 'mesocycle') {
    scopeLabel = `Intero Programma (${totalWeeks} Settimane)`;
  }

  const allGroups: MuscleGroup[] = [
    'Quadricipiti',
    'Femorali',
    'Glutei',
    'Petto',
    'Dorso',
    'Spalle',
    'Bicipiti',
    'Tricipiti',
    'Trapezio',
    'Polpacci',
    'Addome',
    'Lombari',
    'Avambracci',
  ];

  const detailsMap: Record<MuscleGroup, MuscleVolumeDetail> = {} as Record<MuscleGroup, MuscleVolumeDetail>;
  allGroups.forEach((g) => {
    detailsMap[g] = createEmptyDetail(g);
  });

  const unclassifiedExercises: UnclassifiedExerciseInfo[] = [];

  let totalSetsAll = 0;
  let totalDirectSets = 0;
  let totalIndirectSets = 0;

  filteredExercises.forEach((ex) => {
    const rawSets = Number(ex.sets) || 0;
    if (rawSets <= 0) return;

    const libEx = libraryExercises.find(
      (l) => l.name.toLowerCase().trim() === (ex.name || '').toLowerCase().trim()
    );

    const { direct, indirect, specialCategory } = identifyMuscleInvolvement(ex.name || '', libEx);
    const dayName = ex.day_name || 'Seduta';

    // Se non ha nessun distretto muscolare associato, lo registriamo come esercizio non classificato / speciale
    if (direct.length === 0 && indirect.length === 0) {
      unclassifiedExercises.push({
        name: ex.name || 'Esercizio senza nome',
        sets: rawSets,
        day: dayName,
        category: libEx?.category,
        classificationType: specialCategory || 'Non Classificato',
        reasonLabel:
          specialCategory === 'Conditioning'
            ? 'Lavoro Cardiovascolare / Conditioning'
            : specialCategory === 'Mobilità / Prehab'
            ? 'Mobilità Articolare / Prehab'
            : specialCategory === 'Full Body'
            ? 'Movimento Globale Multi-distretto (Full Body)'
            : specialCategory === 'Tecnica'
            ? 'Esercizio Tecnico / Propedeutico'
            : 'Distretto muscolare non specificato in Libreria',
      });
      return;
    }

    totalSetsAll += rawSets;

    direct.forEach((g) => {
      detailsMap[g].directSets += rawSets;
      detailsMap[g].totalSets += rawSets;
      detailsMap[g].effectiveVolume += rawSets;
      detailsMap[g].exerciseCount += 1;
      if (!detailsMap[g].frequencyDays.includes(dayName)) {
        detailsMap[g].frequencyDays.push(dayName);
      }
      detailsMap[g].exercisesList.push({
        name: ex.name || 'Esercizio',
        sets: rawSets,
        type: 'direct',
        day: dayName,
      });
      totalDirectSets += rawSets;
    });

    indirect.forEach((g) => {
      detailsMap[g].indirectSets += rawSets;
      detailsMap[g].totalSets += rawSets;
      detailsMap[g].effectiveVolume += rawSets * 0.5;
      detailsMap[g].exerciseCount += 1;
      if (!detailsMap[g].frequencyDays.includes(dayName)) {
        detailsMap[g].frequencyDays.push(dayName);
      }
      detailsMap[g].exercisesList.push({
        name: ex.name || 'Esercizio',
        sets: rawSets,
        type: 'indirect',
        day: dayName,
      });
      totalIndirectSets += rawSets;
    });
  });

  // Valutazione automatica dello stato basata sui benchmark scientifici
  const muscleDetails: MuscleVolumeDetail[] = Object.values(detailsMap)
    .filter((d) => d.totalSets > 0)
    .map((d) => {
      const b = d.benchmark;
      const weeklyVolume =
        scope === 'mesocycle'
          ? d.directSets / Math.max(totalWeeks, 1)
          : scope === 'day'
          ? d.directSets * 2.5
          : d.directSets;

      let statusType: VolumeStatusType = 'in_mav';
      let status: 'low' | 'optimal' | 'high' = 'optimal';
      let statusLabel = 'Dentro MAV (Ottimale)';

      if (weeklyVolume < b.mvMin && b.mvMin > 0) {
        statusType = 'under_mv';
        status = 'low';
        statusLabel = `Sotto MV (< ${b.mvMin} set)`;
      } else if (weeklyVolume < b.mevMin) {
        statusType = 'under_mev';
        status = 'low';
        statusLabel = `Sotto MEV (< ${b.mevMin} set)`;
      } else if (weeklyVolume >= b.mevMin && weeklyVolume < b.mavMin) {
        statusType = 'in_mev';
        status = 'optimal';
        statusLabel = `Dentro MEV (${b.mev} set)`;
      } else if (weeklyVolume >= b.mavMin && weeklyVolume <= b.mavMax) {
        statusType = 'in_mav';
        status = 'optimal';
        statusLabel = `Dentro MAV (${b.mav} set ⭐)`;
      } else if (weeklyVolume > b.mavMax && weeklyVolume <= b.mrvMin) {
        statusType = 'near_mrv';
        status = 'high';
        statusLabel = `Vicino MRV (${weeklyVolume.toFixed(0)}/${b.mrvMin} set)`;
      } else {
        statusType = 'above_mrv';
        status = 'high';
        statusLabel = `Sopra MRV (> ${b.mrvMin} set ⚠️)`;
      }

      return {
        ...d,
        statusType,
        status,
        statusLabel,
      };
    })
    .sort((a, b) => b.effectiveVolume - a.effectiveVolume);

  const needsReviewCount = unclassifiedExercises.filter(
    (e) => e.classificationType === 'Non Classificato'
  ).length;

  return {
    scope,
    scopeLabel,
    totalSetsAllMuscles: totalSetsAll,
    totalDirectSets,
    totalIndirectSets,
    muscleDetails,
    mostTrainedMuscles: muscleDetails.slice(0, 4),
    unclassifiedExercises,
    needsReviewCount,
  };
}

function createEmptyDetail(muscleGroup: MuscleGroup): MuscleVolumeDetail {
  return {
    muscleGroup,
    directSets: 0,
    indirectSets: 0,
    totalSets: 0,
    effectiveVolume: 0,
    frequencyDays: [],
    exerciseCount: 0,
    exercisesList: [],
    benchmark: MUSCLE_BENCHMARKS[muscleGroup],
    statusType: 'under_mv',
    status: 'low',
    statusLabel: 'Nessun volume',
  };
}
