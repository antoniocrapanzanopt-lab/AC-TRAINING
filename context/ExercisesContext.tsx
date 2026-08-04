import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { Exercise, ExerciseFormData } from '../types';
import { STORAGE_KEYS } from '../config/storageKeys';
import { getStorageItem, setStorageItem } from '../lib/storage';
import { generateExpandedLibrary } from '../data/expandedExerciseLibrary';

// ─── Database Esercizi di Default ─────────────────────────────────────────────
// Gli esercizi di default sono costanti in memoria e non vengono salvati in localStorage.

const DEFAULT_EXERCISES: Exercise[] = [
  // PETTORALI
  {
    id: 'ex-001',
    name: 'Chest Press Convergente',
    primaryMuscle: 'pettorali',
    secondaryMuscles: ['spalle', 'tricipiti'],
    equipment: 'macchina',
    movementPattern: 'spinta_orizzontale',
    difficulty: 'base',
    description: 'Esercizio di spinta orizzontale su macchina convergente. Ideale per principianti e per isolare i pettorali in sicurezza. Seduto, impugna le maniglie e spingi in avanti mantenendo i gomiti leggermente sotto le spalle.',
    isCustom: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'ex-002',
    name: 'Distensioni su Panca con Manubri',
    primaryMuscle: 'pettorali',
    secondaryMuscles: ['spalle', 'tricipiti'],
    equipment: 'manubri',
    movementPattern: 'spinta_orizzontale',
    difficulty: 'intermedio',
    description: 'Sdraiato su panca piana, manubri alle spalle. Spingi verso l\'alto descrivendo un arco naturale. Maggiore escursione articolare rispetto al bilanciere, ottimo per sviluppo muscolare.',
    isCustom: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'ex-003',
    name: 'Croci ai Cavi (Crossover)',
    primaryMuscle: 'pettorali',
    secondaryMuscles: [],
    equipment: 'cavi',
    movementPattern: 'isolamento',
    difficulty: 'intermedio',
    description: 'In piedi al centro della macchina cavi, con le pulegge alte. Porta le mani verso il centro incrociando leggermente. Esercizio di isolamento che mantiene tensione costante sul muscolo.',
    isCustom: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'ex-004',
    name: 'Pec-Deck (Butterfly)',
    primaryMuscle: 'pettorali',
    secondaryMuscles: [],
    equipment: 'macchina',
    movementPattern: 'isolamento',
    difficulty: 'base',
    description: 'Seduto sulla macchina Pec-Deck, avvicina i bracci davanti al petto mantenendo i gomiti leggermente flessi. Ottimo come esercizio finale di isolamento per i pettorali.',
    isCustom: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'ex-005',
    name: 'Push-Up',
    primaryMuscle: 'pettorali',
    secondaryMuscles: ['spalle', 'tricipiti', 'addome'],
    equipment: 'corpo_libero',
    movementPattern: 'spinta_orizzontale',
    difficulty: 'base',
    description: 'Posizione prona, mani alla larghezza delle spalle. Abbassa il petto verso il suolo e risali estendendo le braccia. Fondamentale esercizio a corpo libero per pettorali e tricipiti.',
    isCustom: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  // DORSO
  {
    id: 'ex-006',
    name: 'Lat Machine Presa Prona',
    primaryMuscle: 'dorso',
    secondaryMuscles: ['bicipiti'],
    equipment: 'macchina',
    movementPattern: 'tirata_verticale',
    difficulty: 'base',
    description: 'Seduto alla Lat Machine, impugna il bilanciere largo con presa prona (palme verso il basso). Tira verso il petto contraendo i dorsali, poi risali controllando il movimento.',
    isCustom: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'ex-007',
    name: 'Lat Machine Presa Neutra',
    primaryMuscle: 'dorso',
    secondaryMuscles: ['bicipiti'],
    equipment: 'macchina',
    movementPattern: 'tirata_verticale',
    difficulty: 'base',
    description: 'Come la Lat Machine prona ma con la barra V-bar o parallele (palme opposte). Presa più naturale per il polso, coinvolge maggiormente il brachiale.',
    isCustom: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'ex-008',
    name: 'Pulley Basso (Rematore ai Cavi)',
    primaryMuscle: 'dorso',
    secondaryMuscles: ['bicipiti', 'spalle'],
    equipment: 'cavi',
    movementPattern: 'tirata_orizzontale',
    difficulty: 'base',
    description: 'Seduto al pulley basso, tira la maniglia verso l\'ombelico mantenendo il busto eretto e la schiena in posizione neutra. Contrai i dorsali alla fine del movimento.',
    isCustom: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'ex-009',
    name: 'T-Bar Row',
    primaryMuscle: 'dorso',
    secondaryMuscles: ['bicipiti', 'spalle'],
    equipment: 'bilanciere',
    movementPattern: 'tirata_orizzontale',
    difficulty: 'avanzato',
    description: 'Con il bilanciere fisso a un\'estremità, piegati in avanti e tira il peso verso il petto con una presa stretta. Esercizio compound eccellente per la massa del dorso.',
    isCustom: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'ex-010',
    name: 'Rematore con Bilanciere',
    primaryMuscle: 'dorso',
    secondaryMuscles: ['bicipiti', 'spalle'],
    equipment: 'bilanciere',
    movementPattern: 'tirata_orizzontale',
    difficulty: 'avanzato',
    description: 'Piegato in avanti con schiena parallela al suolo, tira il bilanciere verso l\'addome. Esercizio fondamentale per il volume del dorso. Richiede buona tecnica per proteggere la lombare.',
    isCustom: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  // SPALLE
  {
    id: 'ex-011',
    name: 'Shoulder Press con Manubri',
    primaryMuscle: 'spalle',
    secondaryMuscles: ['tricipiti'],
    equipment: 'manubri',
    movementPattern: 'spinta_verticale',
    difficulty: 'intermedio',
    description: 'Seduto o in piedi, con i manubri all\'altezza delle orecchie. Spingi verso l\'alto fino a quasi estendere le braccia, poi torna alla posizione di partenza con controllo.',
    isCustom: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'ex-012',
    name: 'Alzate Laterali con Manubri',
    primaryMuscle: 'spalle',
    secondaryMuscles: [],
    equipment: 'manubri',
    movementPattern: 'isolamento',
    difficulty: 'base',
    description: 'In piedi con i manubri ai fianchi, alza le braccia lateralmente fino all\'altezza delle spalle con i gomiti leggermente flessi. Ideale per sviluppare il deltoide laterale.',
    isCustom: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'ex-013',
    name: 'Alzate Frontali con Manubri',
    primaryMuscle: 'spalle',
    secondaryMuscles: ['pettorali'],
    equipment: 'manubri',
    movementPattern: 'isolamento',
    difficulty: 'base',
    description: 'In piedi, alza i manubri anteriormente fino all\'altezza delle spalle. Coinvolge principalmente il fascio anteriore del deltoide.',
    isCustom: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'ex-014',
    name: 'Alzate Posteriori (Rear Delt)',
    primaryMuscle: 'spalle',
    secondaryMuscles: ['dorso'],
    equipment: 'manubri',
    movementPattern: 'isolamento',
    difficulty: 'intermedio',
    description: 'Seduto piegato in avanti, apri le braccia lateralmente fino all\'altezza delle spalle. Coinvolge il fascio posteriore del deltoide e i romboidi.',
    isCustom: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  // BICIPITI
  {
    id: 'ex-015',
    name: 'Curl con Bilanciere',
    primaryMuscle: 'bicipiti',
    secondaryMuscles: [],
    equipment: 'bilanciere',
    movementPattern: 'isolamento',
    difficulty: 'base',
    description: 'In piedi, impugna il bilanciere con presa supina e porta le mani verso le spalle flettendo i gomiti. Esercizio base per la massa dei bicipiti.',
    isCustom: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'ex-016',
    name: 'Curl Alternato con Manubri',
    primaryMuscle: 'bicipiti',
    secondaryMuscles: [],
    equipment: 'manubri',
    movementPattern: 'isolamento',
    difficulty: 'base',
    description: 'In piedi, alterna la flessione del gomito con ciascun manubrio. Permette una supinazione del polso durante il movimento per maggiore attivazione del capo lungo.',
    isCustom: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'ex-017',
    name: 'Curl Martello',
    primaryMuscle: 'bicipiti',
    secondaryMuscles: [],
    equipment: 'manubri',
    movementPattern: 'isolamento',
    difficulty: 'base',
    description: 'Come il curl con manubri ma con presa neutra (palmo verso il corpo). Coinvolge maggiormente il brachioradiale e il capo lungo del bicipite.',
    isCustom: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  // TRICIPITI
  {
    id: 'ex-018',
    name: 'French Press (Skull Crusher)',
    primaryMuscle: 'tricipiti',
    secondaryMuscles: [],
    equipment: 'bilanciere',
    movementPattern: 'isolamento',
    difficulty: 'intermedio',
    description: 'Sdraiato su panca, tieni il bilanciere a braccia estese sopra il petto. Abbassa il peso verso la fronte flettendo solo i gomiti, poi estendi. Ottimo per il capo lungo del tricipite.',
    isCustom: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'ex-019',
    name: 'Push-Down al Cavo',
    primaryMuscle: 'tricipiti',
    secondaryMuscles: [],
    equipment: 'cavi',
    movementPattern: 'isolamento',
    difficulty: 'base',
    description: 'In piedi davanti alla carrucola alta, spingi verso il basso tenendo i gomiti fermi ai fianchi. Esercizio di isolamento ideale per rifinire i tricipiti.',
    isCustom: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'ex-020',
    name: 'Dips alle Parallele',
    primaryMuscle: 'tricipiti',
    secondaryMuscles: ['pettorali', 'spalle'],
    equipment: 'corpo_libero',
    movementPattern: 'spinta_verticale',
    difficulty: 'avanzato',
    description: 'Tra le parallele, abbassa il corpo flettendo i gomiti e risali spingendo. Se il busto è eretto coinvolge più i tricipiti; se inclinato in avanti, più i pettorali.',
    isCustom: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  // QUADRICIPITI
  {
    id: 'ex-021',
    name: 'Squat Libero',
    primaryMuscle: 'quadricipiti',
    secondaryMuscles: ['glutei', 'femorali'],
    equipment: 'bilanciere',
    movementPattern: 'squat',
    difficulty: 'avanzato',
    description: 'Con il bilanciere in appoggio sulla trapezio, scendi flettendo ginocchia e fianchi fino a parallelo. Re\'esercizio fondamentale per la forza degli arti inferiori.',
    isCustom: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'ex-022',
    name: 'Leg Press',
    primaryMuscle: 'quadricipiti',
    secondaryMuscles: ['glutei', 'femorali'],
    equipment: 'macchina',
    movementPattern: 'squat',
    difficulty: 'base',
    description: 'Seduto alla Leg Press, spingi la pedana verso l\'alto estendendo le gambe. La posizione dei piedi determina il coinvolgimento muscolare. Sicuro e adatto a tutti i livelli.',
    isCustom: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'ex-023',
    name: 'Leg Extension',
    primaryMuscle: 'quadricipiti',
    secondaryMuscles: [],
    equipment: 'macchina',
    movementPattern: 'isolamento',
    difficulty: 'base',
    description: 'Seduto alla macchina Leg Extension, estendi le gambe sollevando il rullo. Esercizio di isolamento per i quadricipiti, ottimo per la definizione e il recupero.',
    isCustom: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'ex-024',
    name: 'Affondi con Manubri',
    primaryMuscle: 'quadricipiti',
    secondaryMuscles: ['glutei', 'femorali'],
    equipment: 'manubri',
    movementPattern: 'lunge',
    difficulty: 'intermedio',
    description: 'In piedi con i manubri ai fianchi, fai un passo in avanti e abbassa il ginocchio posteriore verso il suolo. Migliora equilibrio, coordinazione e forza funzionale.',
    isCustom: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  // FEMORALI
  {
    id: 'ex-025',
    name: 'Romanian Deadlift',
    primaryMuscle: 'femorali',
    secondaryMuscles: ['glutei', 'dorso'],
    equipment: 'bilanciere',
    movementPattern: 'hip_hinge',
    difficulty: 'intermedio',
    description: 'Con il bilanciere in mano, inclina il busto in avanti mantenendo le gambe quasi estese. Senti lo stiramento dei femorali poi risali contraendo i glutei. Fondamentale per la catena posteriore.',
    isCustom: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'ex-026',
    name: 'Leg Curl Sdraiato',
    primaryMuscle: 'femorali',
    secondaryMuscles: [],
    equipment: 'macchina',
    movementPattern: 'isolamento',
    difficulty: 'base',
    description: 'Sdraiato prono sulla macchina, fletti le gambe portando i talloni verso i glutei. Esercizio di isolamento per i femorali, eseguibile anche seduto sulla variante specifica.',
    isCustom: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  // GLUTEI
  {
    id: 'ex-027',
    name: 'Hip Thrust',
    primaryMuscle: 'glutei',
    secondaryMuscles: ['femorali', 'quadricipiti'],
    equipment: 'bilanciere',
    movementPattern: 'hip_hinge',
    difficulty: 'intermedio',
    description: 'Con le spalle appoggiate a una panca e il bilanciere sull\'anca, spingi i fianchi verso l\'alto contraendo i glutei. Esercizio più efficace per l\'attivazione e l\'ipertrofia dei glutei.',
    isCustom: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'ex-028',
    name: 'Abductor Machine',
    primaryMuscle: 'glutei',
    secondaryMuscles: [],
    equipment: 'macchina',
    movementPattern: 'isolamento',
    difficulty: 'base',
    description: 'Seduto sulla macchina abductor, apri le gambe contro la resistenza. Coinvolge il medio gluteo e i muscoli abduttori dell\'anca. Ottimo per le donne con obiettivi estetici.',
    isCustom: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'ex-029',
    name: 'Glute Bridge',
    primaryMuscle: 'glutei',
    secondaryMuscles: ['femorali'],
    equipment: 'corpo_libero',
    movementPattern: 'hip_hinge',
    difficulty: 'base',
    description: 'Sdraiato supino con i piedi a terra, solleva i fianchi contraendo i glutei. Versione accessibile dell\'Hip Thrust, ideale per principianti o come attivazione pre-allenamento.',
    isCustom: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  // POLPACCI
  {
    id: 'ex-030',
    name: 'Calf Raise in Piedi',
    primaryMuscle: 'polpacci',
    secondaryMuscles: [],
    equipment: 'macchina',
    movementPattern: 'isolamento',
    difficulty: 'base',
    description: 'In piedi sulla macchina calf raise, solleva i talloni il più in alto possibile e abbassa lentamente. Coinvolge principalmente il gastrocnemio.',
    isCustom: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'ex-031',
    name: 'Calf Raise Seduto',
    primaryMuscle: 'polpacci',
    secondaryMuscles: [],
    equipment: 'macchina',
    movementPattern: 'isolamento',
    difficulty: 'base',
    description: 'Seduto alla macchina apposita con le ginocchia a 90°. Solleva i talloni. Con le gambe flesse il soleo viene stimolato maggiormente rispetto al gastrocnemio.',
    isCustom: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  // ADDOME
  {
    id: 'ex-032',
    name: 'Crunch Classico',
    primaryMuscle: 'addome',
    secondaryMuscles: [],
    equipment: 'corpo_libero',
    movementPattern: 'core',
    difficulty: 'base',
    description: 'Sdraiato supino con le ginocchia piegate, solleva le spalle da terra contraendo i retti addominali. Esercizio base per il rinforzo dell\'addome anteriore.',
    isCustom: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'ex-033',
    name: 'Plank',
    primaryMuscle: 'addome',
    secondaryMuscles: ['spalle', 'glutei'],
    equipment: 'corpo_libero',
    movementPattern: 'core',
    difficulty: 'base',
    description: 'Posizione di puntamento sugli avambracci, corpo allineato dalla testa ai piedi. Mantieni la posizione. Esercizio isometrico fondamentale per la stabilità del core.',
    isCustom: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'ex-034',
    name: 'Russian Twist',
    primaryMuscle: 'addome',
    secondaryMuscles: [],
    equipment: 'corpo_libero',
    movementPattern: 'rotazione',
    difficulty: 'intermedio',
    description: 'Seduto con le gambe sollevate e il busto inclinato, ruota il tronco da destra a sinistra. Ottimo per i muscoli obliqui. Si può eseguire con o senza peso.',
    isCustom: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'ex-035',
    name: 'Leg Raise',
    primaryMuscle: 'addome',
    secondaryMuscles: [],
    equipment: 'corpo_libero',
    movementPattern: 'core',
    difficulty: 'intermedio',
    description: 'Sdraiato supino, solleva le gambe tese fino a 90° con il busto e abbassale controllando. Coinvolge soprattutto il retto inferiore e il muscolo ileopsoas.',
    isCustom: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'ex-036',
    name: 'Ab Wheel Rollout',
    primaryMuscle: 'addome',
    secondaryMuscles: ['dorso', 'spalle'],
    equipment: 'altro',
    movementPattern: 'core',
    difficulty: 'avanzato',
    description: 'In ginocchio con la ruota addominale, estendi il corpo in avanti mantenendo il core teso, poi torna alla posizione iniziale. Uno degli esercizi più efficaci per il core complessivo.',
    isCustom: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

// ─── Interfaccia Context ───────────────────────────────────────────────────────

interface ExercisesContextValue {
  exercises: Exercise[];
  customExercises: Exercise[];
  addExercise: (data: ExerciseFormData) => Exercise;
  updateExercise: (id: string, updates: Partial<ExerciseFormData>) => boolean;
  deleteExercise: (id: string) => boolean;
  addCustomExercise: (data: ExerciseFormData) => Exercise;
  deleteCustomExercise: (id: string) => void;
  getExerciseById: (id: string) => Exercise | undefined;
  seedMultidisciplinaryLibrary: () => number; // Returns count of added exercises
}

const ExercisesContext = createContext<ExercisesContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const ExercisesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customExercises, setCustomExercises] = useState<Exercise[]>(() =>
    getStorageItem<Exercise[]>(STORAGE_KEYS.EXERCISES_CUSTOM, [])
  );

  const [exerciseOverrides, setExerciseOverrides] = useState<Record<string, Partial<Exercise>>>(() =>
    getStorageItem<Record<string, Partial<Exercise>>>(STORAGE_KEYS.EXERCISES_OVERRIDES, {})
  );

  const [deletedDefaultIds, setDeletedDefaultIds] = useState<string[]>(() =>
    getStorageItem<string[]>(STORAGE_KEYS.EXERCISES_DELETED, [])
  );

  // Persistence
  useEffect(() => {
    setStorageItem(STORAGE_KEYS.EXERCISES_CUSTOM, customExercises);
  }, [customExercises]);

  useEffect(() => {
    setStorageItem(STORAGE_KEYS.EXERCISES_OVERRIDES, exerciseOverrides);
  }, [exerciseOverrides]);

  useEffect(() => {
    setStorageItem(STORAGE_KEYS.EXERCISES_DELETED, deletedDefaultIds);
  }, [deletedDefaultIds]);

  // Combined active exercises
  const exercises: Exercise[] = useMemo(() => {
    const activeDefaults = DEFAULT_EXERCISES
      .filter((e) => !deletedDefaultIds.includes(e.id))
      .map((e) => {
        const override = exerciseOverrides[e.id];
        if (!override) return e;
        return { ...e, ...override };
      });
    return [...activeDefaults, ...customExercises];
  }, [customExercises, exerciseOverrides, deletedDefaultIds]);

  const addExercise = useCallback((data: ExerciseFormData): Exercise => {
    const now = new Date().toISOString();
    const newExercise: Exercise = {
      ...data,
      id: `ex-custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      isCustom: true,
      createdAt: now,
    };
    setCustomExercises((prev) => [newExercise, ...prev]);
    return newExercise;
  }, []);

  const updateExercise = useCallback((id: string, updates: Partial<ExerciseFormData>): boolean => {
    if (!id) return false;
    let found = false;

    // Se è un esercizio custom
    setCustomExercises((prev) =>
      prev.map((e) => {
        if (e.id === id) {
          found = true;
          return { ...e, ...updates };
        }
        return e;
      })
    );

    // Se è un esercizio di default
    if (DEFAULT_EXERCISES.some((e) => e.id === id)) {
      found = true;
      setExerciseOverrides((prev) => ({
        ...prev,
        [id]: { ...(prev[id] || {}), ...updates },
      }));
    }

    return found;
  }, []);

  const deleteExercise = useCallback((id: string): boolean => {
    if (!id) return false;

    // Se è custom
    setCustomExercises((prev) => prev.filter((e) => e.id !== id));

    // Se è di default
    if (DEFAULT_EXERCISES.some((e) => e.id === id)) {
      setDeletedDefaultIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    }

    return true;
  }, []);

  const seedMultidisciplinaryLibrary = useCallback((): number => {
    const library = generateExpandedLibrary();
    // Filtra solo quelli non già presenti (per nome, case-insensitive)
    setCustomExercises((prev) => {
      const existingNames = new Set([
        ...DEFAULT_EXERCISES.map((e) => e.name.toLowerCase()),
        ...prev.map((e) => e.name.toLowerCase()),
      ]);
      const toAdd = library.filter((ex) => !existingNames.has(ex.name.toLowerCase()));
      if (toAdd.length === 0) return prev;
      return [...prev, ...toAdd];
    });
    // Return count (approximate, the real count is computed inside setState)
    const existingNames = new Set([
      ...DEFAULT_EXERCISES.map((e) => e.name.toLowerCase()),
      ...customExercises.map((e) => e.name.toLowerCase()),
    ]);
    return library.filter((ex) => !existingNames.has(ex.name.toLowerCase())).length;
  }, [customExercises]);

  // Aliases per retrocompatibilità
  const addCustomExercise = addExercise;
  const deleteCustomExercise = useCallback((id: string) => {
    deleteExercise(id);
  }, [deleteExercise]);

  const getExerciseById = useCallback(
    (id: string): Exercise | undefined => {
      return exercises.find((e) => e.id === id);
    },
    [exercises]
  );

  return (
    <ExercisesContext.Provider
      value={{
        exercises,
        customExercises,
        addExercise,
        updateExercise,
        deleteExercise,
        addCustomExercise,
        deleteCustomExercise,
        getExerciseById,
        seedMultidisciplinaryLibrary,
      }}
    >
      {children}
    </ExercisesContext.Provider>
  );
};

// ─── Hook ──────────────────────────────────────────────────────────────────────

export const useExercises = (): ExercisesContextValue => {
  const ctx = useContext(ExercisesContext);
  if (!ctx) throw new Error('useExercises must be used inside ExercisesProvider');
  return ctx;
};
