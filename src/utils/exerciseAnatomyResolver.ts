import { MuscleInvolvement } from '../types/exercise';
import { DEFAULT_EXERCISES_DATABASE } from '../config/defaultExercises';

export interface ExerciseAnatomyInfo {
  name: string;
  category: string;
  pattern: string;
  equipment: string;
  targetSummary: string;
  synergistsSummary: string;
  muscles: MuscleInvolvement[];
  instructions?: string;
  setup?: string;
  commonMistakes?: string[];
  tips?: string[];
}

/**
 * Normalizza il nome rimuovendo parole accessorie per un matching ottimale.
 */
function cleanExerciseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[()]/g, ' ')
    .replace(/\b(con|su|ai|al|alla|alle|degli|del|della|di|in|per)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Risolve con massima accuratezza anatomica, biomeccanica e istruzioni per qualsiasi esercizio.
 */
export const resolveExerciseAnatomy = (exerciseName: string): ExerciseAnatomyInfo => {
  const rawName = exerciseName || '';
  const normName = rawName.toLowerCase().trim();
  const cleaned = cleanExerciseName(normName);

  // 1. Cerca nel database predefinito (match esatto o fuzzy)
  const dbMatch = DEFAULT_EXERCISES_DATABASE.find((ex) => {
    const dbNorm = ex.name.toLowerCase().trim();
    const dbCleaned = cleanExerciseName(dbNorm);
    return (
      normName === dbNorm ||
      normName.includes(dbNorm) ||
      dbNorm.includes(normName) ||
      cleaned.includes(dbCleaned) ||
      dbCleaned.includes(cleaned)
    );
  });

  // Se nel DB sono già presenti i muscoli con ruoli definiti
  if (dbMatch && dbMatch.muscoli_coinvolti && dbMatch.muscoli_coinvolti.length > 0) {
    const targets = dbMatch.muscoli_coinvolti
      .filter((m) => m.ruolo === 'Target')
      .map((m) => m.muscolo);
    const synergists = dbMatch.muscoli_coinvolti
      .filter((m) => m.ruolo === 'Sinergico')
      .map((m) => m.muscolo);

    return {
      name: rawName,
      category: dbMatch.category,
      pattern: dbMatch.pattern_movimento || 'Esercizio Specifico',
      equipment: dbMatch.equipment || 'Attrezzatura varia',
      targetSummary: targets.slice(0, 2).join(', ') || dbMatch.category,
      synergistsSummary: synergists.slice(0, 3).join(', ') || 'Muscoli sinergici',
      muscles: dbMatch.muscoli_coinvolti,
      instructions: dbMatch.instructions || undefined,
      setup: dbMatch.target_specifico || undefined,
      commonMistakes: dbMatch.sicurezza?.compensi_da_evitare,
      tips: dbMatch.parametri_chiave?.rom ? [`ROM: ${dbMatch.parametri_chiave.rom}`] : undefined,
    };
  }

  // 2. BIOMECCANICA & PATTERN MATCHING RIGOROSO

  // A. TRAZIONE VERTICALE (Lat Machine, Trazioni, Pulldown, Chin-up) -> DORSO (ZERO PETTO!)
  if (/lat machine|lat pull|trazion|pull-up|pull up|chin-up|chin up|pulldown|vertical pull|trazione verticale/i.test(normName)) {
    const isUnderhand = /chin|supin|inversa|stretta/i.test(normName);
    const muscles: MuscleInvolvement[] = [
      { muscolo: 'Gran Dorsale', ruolo: 'Target', percentuale: 85 },
      { muscolo: 'Trapezio Medio / Inferiore', ruolo: 'Target', percentuale: 60 },
      { muscolo: 'Bicipite Brachiale', ruolo: 'Sinergico', percentuale: isUnderhand ? 65 : 45 },
      { muscolo: 'Deltoide Posteriore', ruolo: 'Sinergico', percentuale: 45 },
      { muscolo: 'Avambracci (Flessori)', ruolo: 'Sinergico', percentuale: 40 },
    ];
    return {
      name: rawName,
      category: 'Dorso',
      pattern: 'Trazione Verticale',
      equipment: normName.includes('sbarra') || normName.includes('corpo libero') ? 'Sbarra / Corpo Libero' : 'Lat Machine / Cavi',
      targetSummary: 'Gran Dorsale, Gran Rotondo',
      synergistsSummary: 'Bicipiti, Spalle Posteriori',
      muscles,
      instructions: 'Seduto con cosce bloccate sotto i rulli. Tira la barra verso la parte alta dello sterno inclinando leggermente il busto all\'indietro (15-20°), deprimendo le scapole e guidando il movimento con i gomiti.',
      commonMistakes: ['Tirare la barra dietro la nuca (stress cervicale)', 'Slanciarsi indietro con il tronco per compensare il peso', 'Gomiti che puntano all\'indietro anziché verso il basso'],
    };
  }

  // B. TRAZIONE ORIZZONTALE (Pulley, Rematore, Row, Seal Row, T-Bar, Meadows Row) -> DORSO (ZERO PETTO!)
  if (/pulley|row|remator|tirata orizzontale|seal row|t-bar|meadows|pendlay/i.test(normName)) {
    const muscles: MuscleInvolvement[] = [
      { muscolo: 'Gran Dorsale', ruolo: 'Target', percentuale: 80 },
      { muscolo: 'Trapezio Medio / Inferiore', ruolo: 'Target', percentuale: 70 },
      { muscolo: 'Deltoide Posteriore', ruolo: 'Sinergico', percentuale: 55 },
      { muscolo: 'Bicipite Brachiale', ruolo: 'Sinergico', percentuale: 45 },
      { muscolo: 'Erettori Spinali / Lombari', ruolo: 'Stabilizzatore', percentuale: 35 },
    ];
    return {
      name: rawName,
      category: 'Dorso',
      pattern: 'Trazione Orizzontale',
      equipment: normName.includes('manubr') ? 'Manubri' : normName.includes('bilancier') ? 'Bilanciere' : 'Cavi / Macchina',
      targetSummary: 'Gran Dorsale, Romboidi, Trapezio',
      synergistsSummary: 'Bicipiti, Spalle Posteriori',
      muscles,
      instructions: 'Busto inclinato a 45 gradi con colonna in assetto neutro. Tira la presa verso l\'ombelico guidando il movimento con i gomiti e adducendo le scapole in massima contrazione.',
      commonMistakes: ['Oscillare eccessivamente col tronco', 'Tirare solo di braccia senza attivare le scapole', 'Spalle anteriorizzate'],
    };
  }

  // C. SPINTA ORIZZONTALE (Panca Piana, Panca Inclinata, Spinte Manubri, Chest Press, Croci, Dip, Push-up) -> PETTO
  if (/panca|chest|spinte|distensioni|croci|dip|push-up|push up|pectoral|pec deck/i.test(normName)) {
    const isHighIncline = /inclinat|30|45|alto|clavic/i.test(normName);
    const isFly = /croci|fly|butterfly|pec deck/i.test(normName);
    const muscles: MuscleInvolvement[] = [
      {
        muscolo: isHighIncline ? 'Grande pettorale (clavicolare)' : 'Grande pettorale (sternocostale)',
        ruolo: 'Target',
        percentuale: 85,
      },
      { muscolo: 'Deltoide Anteriore', ruolo: 'Sinergico', percentuale: isHighIncline ? 60 : 45 },
      { muscolo: 'Tricipite Brachiale', ruolo: isFly ? 'Stabilizzatore' : 'Sinergico', percentuale: isFly ? 15 : 50 },
      { muscolo: 'Addome', ruolo: 'Stabilizzatore', percentuale: 25 },
    ];
    return {
      name: rawName,
      category: 'Petto',
      pattern: isFly ? 'Adduzione Omero' : 'Spinta Orizzontale',
      equipment: normName.includes('manubr') ? 'Manubri' : normName.includes('bilancier') ? 'Bilanciere' : normName.includes('macchina') || normName.includes('press') ? 'Macchina' : 'Panca / Manubri',
      targetSummary: isHighIncline ? 'Pettorale Clavicolare (Fasci Alti)' : 'Gran Pettorale',
      synergistsSummary: 'Deltoidi Anteriori, Tricipiti',
      muscles,
      instructions: 'Posiziona le scapole addotte e depresse contro lo schienale. Discesa controllata fino a sfiorare il petto e spinta fluida senza distendere a scatto i gomiti.',
      commonMistakes: ['Perdita dell\'adduzione scapolare in spinta', 'Rimbalzo del carico sul petto', 'Gomiti a 90° che sovraccaricano la capsula anteriore'],
    };
  }

  // D. SPINTA VERTICALE / SPALLE (Military, Lento Avanti, Shoulder Press, Arnold Press)
  if (/military|lento avanti|shoulder press|overhead|arnold press|spinte verticali/i.test(normName)) {
    const muscles: MuscleInvolvement[] = [
      { muscolo: 'Deltoide Anteriore', ruolo: 'Target', percentuale: 85 },
      { muscolo: 'Deltoide Laterale', ruolo: 'Target', percentuale: 60 },
      { muscolo: 'Tricipite Brachiale', ruolo: 'Sinergico', percentuale: 55 },
      { muscolo: 'Trapezio Superiore', ruolo: 'Sinergico', percentuale: 45 },
      { muscolo: 'Addome', ruolo: 'Stabilizzatore', percentuale: 40 },
    ];
    return {
      name: rawName,
      category: 'Spalle',
      pattern: 'Spinta Verticale',
      equipment: normName.includes('bilancier') ? 'Bilanciere' : normName.includes('manubr') ? 'Manubri' : 'Macchina',
      targetSummary: 'Deltoidi Anteriori & Laterali',
      synergistsSummary: 'Tricipiti, Trapezi',
      muscles,
      instructions: 'Busto compatto, addome contratto e glutei serrati. Spingi il carico verso l\'alto sopra la linea delle spalle senza iperestendere la zona lombare.',
      commonMistakes: ['Inarcare eccessivamente la schiena', 'Spingere il carico in avanti anziché verticale'],
    };
  }

  // E. ALZATE LATERALI / DELTOIDE LATERALE
  if (/alzate lateral|lateral raise|deltoidi lateral|cavi incrociati/i.test(normName)) {
    const muscles: MuscleInvolvement[] = [
      { muscolo: 'Deltoide Laterale', ruolo: 'Target', percentuale: 90 },
      { muscolo: 'Trapezio Superiore', ruolo: 'Sinergico', percentuale: 40 },
      { muscolo: 'Avambracci (Estensori)', ruolo: 'Stabilizzatore', percentuale: 20 },
    ];
    return {
      name: rawName,
      category: 'Spalle',
      pattern: 'Abduzione Omero',
      equipment: normName.includes('cavi') ? 'Cavi' : normName.includes('macchina') ? 'Macchina' : 'Manubri',
      targetSummary: 'Deltoide Laterale',
      synergistsSummary: 'Trapezio Superiore',
      muscles,
      instructions: 'Gomiti leggermente flessi, solleva i manubri lungo il piano scapolare (circa 30° in avanti) fino all\'altezza delle spalle guidando il movimento con i gomiti.',
      commonMistakes: ['Slanciarsi con la schiena', 'Alzare le spalle alle orecchie usando troppo il trapezio'],
    };
  }

  // F. SPALLE POSTERIORI / EXTRA-ROTATORI (Rear Delt, Alzate Posteriori, Reverse Fly, Face Pull)
  if (/posteriore|rear delt|reverse fly|face pull|alzate a 90|croci inverse/i.test(normName)) {
    const muscles: MuscleInvolvement[] = [
      { muscolo: 'Deltoide Posteriore', ruolo: 'Target', percentuale: 85 },
      { muscolo: 'Trapezio Medio / Inferiore', ruolo: 'Target', percentuale: 65 },
      { muscolo: 'Bicipite Brachiale', ruolo: 'Sinergico', percentuale: 30 },
    ];
    return {
      name: rawName,
      category: 'Spalle',
      pattern: 'Abduzione Orizzontale',
      equipment: normName.includes('cavi') ? 'Cavi' : normName.includes('macchina') ? 'Macchina' : 'Manubri',
      targetSummary: 'Deltoidi Posteriori, Romboidi',
      synergistsSummary: 'Trapezio Medio, Rotatori',
      muscles,
      instructions: 'Busto inclinato a 90° o appoggiato su panca. Apri le braccia a croce concentrandoti sulla spremitura della parte posteriore della spalla.',
      commonMistakes: ['Addurre troppo le scapole togliendo lavoro al deltoide posteriore', 'Carico eccessivo che accorcia il ROM'],
    };
  }

  // G. ACCOSCIATA / GAMBE (Squat, Pressa, Hack, Affondi, Leg Extension) -> QUADRICIPITI
  if (/squat|leg press|pressa|affondi|bulgaro|hack|leg extension|goblet|step-up/i.test(normName)) {
    const isIso = /extension/i.test(normName);
    const muscles: MuscleInvolvement[] = [
      { muscolo: 'Quadricipite', ruolo: 'Target', percentuale: 90 },
      { muscolo: 'Grande Gluteo', ruolo: isIso ? 'Stabilizzatore' : 'Target', percentuale: isIso ? 15 : 65 },
      { muscolo: 'Adduttori', ruolo: 'Sinergico', percentuale: 45 },
      { muscolo: 'Erettori Spinali / Lombari', ruolo: 'Stabilizzatore', percentuale: 35 },
    ];
    return {
      name: rawName,
      category: 'Gambe',
      pattern: 'Accosciata / Estensione Ginocchio',
      equipment: normName.includes('manubr') ? 'Manubri' : normName.includes('bilancier') ? 'Bilanciere' : 'Macchina',
      targetSummary: 'Quadricipiti, Glutei',
      synergistsSummary: 'Adduttori, Femorali',
      muscles,
      instructions: 'Piedi alla larghezza spalle, peso sul centro del piede. Scendi controllando il ginocchio in linea con le punte dei piedi e risali spingendo forte a terra.',
      commonMistakes: ['Ginocchia che collassano all\'interno (valgo)', 'Sollevamento dei talloni da terra'],
    };
  }

  // H. CATENA POSTERIORE / FEMORALI & GLUTEI (Stacco, RDL, Leg Curl, Hip Thrust, Hyperextension)
  if (/stacco|deadlift|rdl|rumeno|leg curl|hyperextension|hip thrust|glute bridge|femorali/i.test(normName)) {
    const isGluteFocus = /hip thrust|bridge|glutei/i.test(normName);
    const muscles: MuscleInvolvement[] = [
      { muscolo: isGluteFocus ? 'Grande Gluteo' : 'Ischiocrurali / Femorali', ruolo: 'Target', percentuale: 85 },
      { muscolo: isGluteFocus ? 'Ischiocrurali / Femorali' : 'Grande Gluteo', ruolo: 'Target', percentuale: 70 },
      { muscolo: 'Erettori Spinali / Lombari', ruolo: 'Stabilizzatore', percentuale: 50 },
      { muscolo: 'Adduttori', ruolo: 'Sinergico', percentuale: 35 },
    ];
    return {
      name: rawName,
      category: 'Gambe',
      pattern: 'Cerniera d\'Anca (Hinge)',
      equipment: normName.includes('manubr') ? 'Manubri' : normName.includes('bilancier') ? 'Bilanciere' : 'Macchina',
      targetSummary: isGluteFocus ? 'Glutei, Femorali' : 'Femorali, Glutei',
      synergistsSummary: 'Lombari, Catena Posteriore',
      muscles,
      instructions: 'Spingi il bacino indietro mantenendo la schiena piatta e le tibie verticali. Senti il massimo allungamento sui femorali prima di contrarre i glutei in risalita.',
      commonMistakes: ['Incurvare la zona lombare', 'Piegare troppo le ginocchia trasformandolo in uno squat'],
    };
  }

  // I. BICIPITI (Curl, Hammer, Preacher, Scott)
  if (/curl|bicipit|hammer|scott|spider|drag curl/i.test(normName)) {
    const muscles: MuscleInvolvement[] = [
      { muscolo: 'Bicipite Brachiale', ruolo: 'Target', percentuale: 90 },
      { muscolo: 'Avambracci (Flessori)', ruolo: 'Sinergico', percentuale: 50 },
    ];
    return {
      name: rawName,
      category: 'Braccia',
      pattern: 'Flessione del Gomito',
      equipment: normName.includes('manubr') ? 'Manubri' : normName.includes('bilancier') ? 'Bilanciere' : 'Cavo',
      targetSummary: 'Bicipite Brachiale',
      synergistsSummary: 'Brachiale, Avambracci',
      muscles,
      instructions: 'Gomiti fissi e aderenti al busto. Fletti l\'avambraccio ricercando la massima contrazione di picco e controlla la fase di discesa in 2-3 secondi.',
      commonMistakes: ['Oscillare i gomiti in avanti', 'Slanciarsi con la schiena per sollevare il carico'],
    };
  }

  // J. TRICIPITI (Pushdown, French Press, Skull Crusher, Kickback, Estensioni)
  if (/pushdown|french|tricipit|skull|kickback|estensioni/i.test(normName)) {
    const muscles: MuscleInvolvement[] = [
      { muscolo: 'Tricipite Brachiale', ruolo: 'Target', percentuale: 90 },
      { muscolo: 'Avambracci (Estensori)', ruolo: 'Sinergico', percentuale: 40 },
    ];
    return {
      name: rawName,
      category: 'Braccia',
      pattern: 'Estensione del Gomito',
      equipment: normName.includes('corda') ? 'Corda ai Cavi' : normName.includes('manubr') ? 'Manubri' : 'Cavo / Bilanciere',
      targetSummary: 'Tricipite Brachiale',
      synergistsSummary: 'Anconeo, Avambracci',
      muscles,
      instructions: 'Gomiti bloccati in posizione. Estendi completamente il gomito ricercando la contrazione del tricipite senza muovere le spalle.',
      commonMistakes: ['Allargare eccessivamente i gomiti', 'Muovere le braccia durante la spinta'],
    };
  }

  // K. ADDOME / CORE (Plank, Crunch, Leg Raise, Hollow, Rollout)
  if (/plank|crunch|addom|core|leg raise|hollow|rollout|sit up/i.test(normName)) {
    const muscles: MuscleInvolvement[] = [
      { muscolo: 'Retto dell\'Addome', ruolo: 'Target', percentuale: 85 },
      { muscolo: 'Obliqui', ruolo: 'Target', percentuale: 65 },
      { muscolo: 'Quadricipite', ruolo: 'Stabilizzatore', percentuale: 20 },
    ];
    return {
      name: rawName,
      category: 'Addominali',
      pattern: 'Flessione del Tronco / Anti-Estensione',
      equipment: 'Corpo Libero / Tappetino',
      targetSummary: 'Retto dell\'Addome, Obliqui',
      synergistsSummary: 'Core, Trasverso',
      muscles,
      instructions: 'Mantieni l\'addome contratto portando il bacino in retroversione. Evita di tirare con il collo o inarcare la schiena.',
      commonMistakes: ['Tirare la testa con le mani sforzando la cervicale', 'Inarcare la zona lombare'],
    };
  }

  // L. POLPACCI (Calf)
  if (/calf|polpacc/i.test(normName)) {
    const muscles: MuscleInvolvement[] = [
      { muscolo: 'Gastrocnemio / Polpaccio', ruolo: 'Target', percentuale: 90 },
      { muscolo: 'Tibiale Anteriore', ruolo: 'Stabilizzatore', percentuale: 30 },
    ];
    return {
      name: rawName,
      category: 'Gambe',
      pattern: 'Flessione Plantare',
      equipment: 'Macchina Calf / Gradino',
      targetSummary: 'Gastrocnemio, Soleo',
      synergistsSummary: 'Caviglia, Tendine d\'Achille',
      muscles,
      instructions: 'Massima estensione in alto con 1 secondo di stop in contrazione, discesa controllata fino al massimo allungamento del tendine.',
      commonMistakes: ['Rimbalzare sul fondo senza controllo'],
    };
  }

  // Fallback Generico Intelligente (NO MISCHIARE PETTO E DORSO!)
  const isUpper = /bracc|spall|dors|pett|torac/i.test(normName);
  const fallbackCategory = isUpper ? 'Dorso' : 'Gambe';

  return {
    name: rawName,
    category: dbMatch?.category || fallbackCategory,
    pattern: dbMatch?.pattern_movimento || 'Esercizio Specifico',
    equipment: dbMatch?.equipment || 'Attrezzatura varia',
    targetSummary: dbMatch?.category || 'Muscoli Target',
    synergistsSummary: 'Muscoli Sinergici & Stabilizzatori',
    muscles: [
      { muscolo: 'Gran Dorsale', ruolo: 'Target', percentuale: 70 },
      { muscolo: 'Trapezio Medio / Inferiore', ruolo: 'Sinergico', percentuale: 50 },
      { muscolo: 'Bicipite Brachiale', ruolo: 'Sinergico', percentuale: 40 },
    ],
    instructions: 'Esegui il movimento controllando ogni fase della ripetizione. Mantieni l\'assetto posturale stabile e respira in modo regolare.',
  };
};
