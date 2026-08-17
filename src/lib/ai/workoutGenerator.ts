import { Athlete } from '../../types';
import { ExerciseItem } from '../../types/exercise';
import { METODO_ANTONIO_MASTER_PROMPT } from './prompts/workoutMasterPrompt';
import { generatedWorkoutResponseSchema } from './workoutZodSchema';
import { generateContentWithGemini } from './geminiClient';

/**
 * Costruisce il contesto di sicurezza per l'IA analizzando le controindicazioni
 * degli esercizi della libreria in relazione alle note mediche dell'atleta.
 * Restituisce una stringa formattata da iniettare nel prompt.
 */
function buildExerciseSafetyContext(
  athlete: Athlete | undefined,
  coachExercises: ExerciseItem[]
): string {
  if (!athlete) return '';

  const medicalContext = [
    athlete.medicalNotes,
    athlete.notes,
    athlete.goals,
  ].filter(Boolean).join(' ').toLowerCase();

  if (!medicalContext.trim()) return '';

  // Parole chiave cliniche comuni in italiano
  const clinicalKeywords = [
    'spalla', 'cuffia', 'rotatore', 'subacromiale', 'impingement',
    'lombalgia', 'lombare', 'disco', 'ernia', 'protrusione',
    'ginocchio', 'menisco', 'legamento', 'crociato', 'patella',
    'polso', 'gomito', 'epicondilite', 'tendinite', 'tendinopatia',
    'cervicale', 'collo', 'dolore', 'fastidio', 'infortun', 'limitaz',
    'operazione', 'intervento', 'chirurgia', 'riabilitaz',
  ];

  const hasRelevantCondition = clinicalKeywords.some(kw => medicalContext.includes(kw));
  if (!hasRelevantCondition) return '';

  // Raccogli tutte le controindicazioni degli esercizi con dati strutturati
  const exerciseWarnings: string[] = [];
  for (const ex of coachExercises) {
    if (!ex.sicurezza) continue;

    const controindicazioni = ex.sicurezza.controindicazioni || [];
    const criteri = ex.sicurezza.criteri_arresto || [];
    const tolleranze = ex.sicurezza.tolleranze || '';

    if (controindicazioni.length > 0 || criteri.length > 0) {
      exerciseWarnings.push(
        `• ${ex.name}:\n` +
        (controindicazioni.length > 0 ? `  Controindicazioni: ${controindicazioni.join('; ')}\n` : '') +
        (criteri.length > 0 ? `  Criteri di arresto: ${criteri.join('; ')}\n` : '') +
        (tolleranze ? `  Tolleranze: ${tolleranze}` : '')
      );
    }
  }

  if (exerciseWarnings.length === 0) return '';

  return `
⚕️ PROTOCOLLO DI SICUREZZA PERSONALIZZATO (SISTEMA ESPERTO)
L'atleta presenta le seguenti condizioni cliniche: "${[athlete.medicalNotes, athlete.notes].filter(Boolean).join('; ')}".
Di seguito le controindicazioni specifiche degli esercizi in libreria:

${exerciseWarnings.join('\n')}

ISTRUZIONI OBBLIGATORIE PER LA SICUREZZA:
1. Se un esercizio è controindicato per la condizione dell'atleta, SOSTITUISCILO con una variante sicura.
2. Se l'esercizio è eseguibile con tolleranze, aggiungi nel campo 'notes' dell'esercizio una nota di sicurezza specifica, ad esempio: "⚠️ Eseguire solo nel range indolore. Evitare [compenso specifico].".
3. NON includere esercizi che soddisfano i criteri di arresto dell'atleta.
4. Privilegia catene cinetiche chiuse e piani di movimento sicuri per la condizione segnalata.
`.trim();
}

export interface GenerateWorkoutParams {
  athlete?: Athlete;
  goal: string;
  weeks: number;
  daysPerWeek: number;
  availableEquipment: string[];
  limitations?: string;
  coachExercises: ExerciseItem[];
  provider: 'openai' | 'gemini';
  splitStyle?: string;
  targetFocus?: string[];
  extraNotes?: string;
  customAthleteContext?: string;
  experienceLevel?: string;
  sessionDurationMinutes?: number;
  progressionStyle?: string;
  chatContext?: string;
  metricsContext?: { weight_kg?: number; body_fat_percentage?: number };
}

// Interfaccia usata internamente per la risposta AI (senza id generati)
export interface AIWorkoutExercise {
  week_number: number;
  day_name: string;
  name: string;
  sets: number;
  reps_target: string;
  rest_seconds: number;
  target_weight?: string;
  rir_target?: string;
  tut?: string;
  notes?: string;
}

export interface GeneratedWorkoutResponse {
  classificazione_soggetto: string;
  obiettivo_blocco: string;
  durata_blocco: string;
  frequenza_settimanale: string;
  split_scelta: string;
  tempo_massimo_seduta: string;
  logica_progressione: string;
  programma_giorno_per_giorno: AIWorkoutExercise[];
  note_tecniche_essenziali: string;
  regole_adattamento: string;
  domanda_mirata?: string;
  blocco_sicurezza?: string;
}

/**
 * Normalizza qualsiasi etichetta di giorno restituita dall'IA ("Giorno 1", "Day A", "Push", "Lunedì")
 * nel formato standard del sistema ("Giorno A", "Giorno B", ecc.).
 */
export function normalizeDayName(
  rawDay: string | number | undefined,
  dayIndexFallback = 0,
  totalDays = 7
): string {
  const dayLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  if (!rawDay) {
    const letter = dayLetters[dayIndexFallback % dayLetters.length];
    return `Giorno ${letter}`;
  }

  const str = String(rawDay).trim();

  // 1. Direct match per lettera: "Giorno A", "Giorno B", "Day A", "Sessione A", "A"
  const letterMatch = str.match(/(?:Giorno|Day|Sessione|Workout|Seduta)?\s*([A-G])\b/i) || str.match(/^([A-G])$/i);
  if (letterMatch) {
    return `Giorno ${letterMatch[1].toUpperCase()}`;
  }

  // 2. Numeric match: "Giorno 1", "Day 1", "Sessione 1", "1" -> 1->A, 2->B, 3->C, 4->D, 5->E, 6->F, 7->G
  const numMatch = str.match(/(?:Giorno|Day|Sessione|Workout|Seduta)?\s*([1-7])\b/i);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10);
    const letter = dayLetters[(num - 1) % dayLetters.length];
    return `Giorno ${letter}`;
  }

  // 3. Weekday name match
  const lower = str.toLowerCase();
  if (lower.includes('luned') || lower.includes('mon')) return 'Giorno A';
  if (lower.includes('marted') || lower.includes('tue')) return 'Giorno B';
  if (lower.includes('mercoled') || lower.includes('wed')) return 'Giorno C';
  if (lower.includes('gioved') || lower.includes('thu')) return 'Giorno D';
  if (lower.includes('venerd') || lower.includes('fri')) return 'Giorno E';
  if (lower.includes('sabat') || lower.includes('sat')) return 'Giorno F';
  if (lower.includes('domenic') || lower.includes('sun')) return 'Giorno G';

  // 4. Split name heuristics
  if (totalDays === 3) {
    if (lower.includes('push') || lower.includes('spinta') || lower.includes('petto')) return 'Giorno A';
    if (lower.includes('pull') || lower.includes('trazione') || lower.includes('dorso')) return 'Giorno B';
    if (lower.includes('leg') || lower.includes('gambe') || lower.includes('lower')) return 'Giorno C';
  } else if (totalDays === 4) {
    if (lower.includes('upper 1') || (lower.includes('upper') && !lower.includes('2'))) return 'Giorno A';
    if (lower.includes('lower 1') || (lower.includes('lower') && !lower.includes('2'))) return 'Giorno B';
    if (lower.includes('upper 2') || lower.includes('push')) return 'Giorno C';
    if (lower.includes('lower 2') || lower.includes('pull') || lower.includes('legs')) return 'Giorno D';
  } else if (totalDays >= 5) {
    if (lower.includes('push') || lower.includes('spinta')) return 'Giorno A';
    if (lower.includes('pull') || lower.includes('trazione')) return 'Giorno B';
    if (lower.includes('leg') || lower.includes('gambe')) return 'Giorno C';
    if (lower.includes('upper') || lower.includes('braccia') || lower.includes('torace')) return 'Giorno D';
    if (lower.includes('lower') || lower.includes('full') || lower.includes('richiamo')) return 'Giorno E';
  }

  const letter = dayLetters[dayIndexFallback % dayLetters.length];
  return `Giorno ${letter}`;
}

/**
 * Parser JSON ultra-resiliente per risposte IA.
 * Gestisce troncamenti, a capo non protetti e formatta anche schede parziali se necessario.
 */
export function safeParseWorkoutJSON(rawText: string): GeneratedWorkoutResponse {
  let cleaned = rawText.trim();

  // 1. Rimuovi blocchi Markdown ```json ... ```
  cleaned = cleaned.replace(/^```json/gi, '').replace(/^```/gi, '').replace(/```$/gi, '').trim();

  // 2. Estrai il blocco JSON principale se c'è testo prima o dopo
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }

  // 3. Ripristino di stringhe e a capo non protetti (es. newlines dentro note o stringhe aperte)
  let sanitized = cleaned;
  sanitized = sanitized.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (match) => {
    return match.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
  });

  if (!sanitized.endsWith('}')) {
    const lastObjIndex = sanitized.lastIndexOf('}');
    if (lastObjIndex !== -1) {
      sanitized = sanitized.substring(0, lastObjIndex + 1);
    }
  }

  // 4. Parsing e Validazione Zod con Auto-Repair per troncamenti
  try {
    let parsed: any;
    try {
      parsed = JSON.parse(sanitized);
    } catch {
      // Auto-repair in caso di troncamento del buffer token
      const lastObjClose = sanitized.lastIndexOf('}');
      if (lastObjClose !== -1) {
        try {
          parsed = JSON.parse(sanitized.substring(0, lastObjClose + 1) + '\n]\n}');
        } catch {
          try {
            parsed = JSON.parse(sanitized.substring(0, lastObjClose + 1) + '\n}');
          } catch {
            parsed = JSON.parse(sanitized);
          }
        }
      } else {
        parsed = JSON.parse(sanitized);
      }
    }
    
    // Gestione casi speciali (domanda_mirata o blocco_sicurezza)
    if (parsed.domanda_mirata || parsed.blocco_sicurezza) {
      return parsed as GeneratedWorkoutResponse;
    }

    // Funzione helper per estrarre in modo affidabile il nome dell'esercizio da qualsiasi chiave LLM
    function getExerciseName(item: any): string {
      if (!item || typeof item !== 'object') return '';
      const raw = item.name || item.nome || item.esercizio || item.nome_esercizio || item.exercise || item.exercise_name || item.titolo || item.title || item.label || '';
      return typeof raw === 'string' ? raw.trim() : String(raw || '');
    }

    // Normalizzazione array esercizi (supporta array piatti o strutture annidate giorni/settimane)
    function extractFlat(input: any, currentWeek = 1, currentDay = 'Giorno A'): any[] {
      if (!input) return [];

      if (Array.isArray(input)) {
        const flat: any[] = [];
        for (let idx = 0; idx < input.length; idx++) {
          const item = input[idx];
          if (!item || typeof item !== 'object') continue;

          // Se l'oggetto contiene una lista di esercizi annidata (es. { nome: "Giorno A", esercizi: [...] })
          const nestedExercises = item.esercizi || item.exercises || item.programma;
          if (Array.isArray(nestedExercises)) {
            const w = item.week_number || item.week || item.settimana || currentWeek;
            const rawDayName = item.nome || item.day_name || item.day || item.giorno || item.title || item.name;
            const d = normalizeDayName(rawDayName, idx, 7);
            flat.push(...extractFlat(nestedExercises, w, d));
            continue;
          }

          // Se l'oggetto contiene una lista di giorni annidata
          const nestedDays = item.giorni || item.days;
          if (Array.isArray(nestedDays)) {
            const w = item.week_number || item.week || item.settimana || currentWeek;
            flat.push(...extractFlat(nestedDays, w, currentDay));
            continue;
          }

          // Altrimenti è un singolo esercizio
          const exName = getExerciseName(item);
          const hasSetsOrReps = item.sets || item.serie || item.reps_target || item.ripetizioni || item.reps || item.carico || item.intensita;
          const isActualExercise = hasSetsOrReps || (Boolean(exName) && !item.esercizi && !item.giorni);
          
          if (isActualExercise) {
            const rawDay = item.day_name || item.day || item.giorno || currentDay;
            flat.push({
              week_number: item.week_number || item.week || item.settimana || currentWeek,
              day_name: normalizeDayName(rawDay, 0, 7),
              ...item,
              name: exName || item.name,
            });
          }
        }
        return flat;
      }

      if (typeof input === 'object') {
        const flat: any[] = [];
        let dayIdx = 0;
        for (const [key, val] of Object.entries(input)) {
          let nextDay = currentDay;
          let nextWeek = currentWeek;

          if (/giorno|day|seduta|workout/i.test(key)) {
            nextDay = normalizeDayName(key, dayIdx, 7);
            dayIdx++;
          }
          if (/settimana|week/i.test(key)) {
            const match = key.match(/\d+/);
            if (match) nextWeek = parseInt(match[0], 10);
          }

          if (Array.isArray(val) || typeof val === 'object') {
            flat.push(...extractFlat(val, nextWeek, nextDay));
          }
        }
        return flat;
      }

      return [];
    }

    const rawExercises = extractFlat(
      parsed.programma_giorno_per_giorno 
      || parsed.programma 
      || parsed.exercises 
      || parsed.scheda 
      || parsed.giorni 
      || parsed.settimane 
      || parsed
    );

    const normalizedExercises: AIWorkoutExercise[] = rawExercises.map((ex: any, idx: number) => {
      const exName = getExerciseName(ex) || 'Esercizio Base';
      const setsRaw = parseInt(String(ex.sets || ex.serie || 3).replace(/\D+/g, ''), 10);
      const restRaw = parseInt(String(ex.rest_seconds || ex.rest || ex.recupero || 90).replace(/\D+/g, ''), 10);

      return {
        week_number: Number(ex.week_number || ex.week || ex.settimana || 1),
        day_name: normalizeDayName(ex.day_name, idx, 5),
        name: exName,
        sets: isNaN(setsRaw) || setsRaw <= 0 ? 3 : setsRaw,
        reps_target: String(ex.reps_target || ex.reps || ex.ripetizioni || ex.rip || '8-10'),
        rest_seconds: isNaN(restRaw) || restRaw <= 0 ? 90 : restRaw,
        target_weight: ex.target_weight || ex.carico || ex.load || ex.intensita || undefined,
        rir_target: ex.rir_target || ex.rir || ex.rpe || (typeof ex.intensita === 'string' && ex.intensita.includes('RIR') ? ex.intensita : undefined),
        tut: ex.tut || undefined,
        notes: ex.notes || ex.note || ex.note_tecniche || undefined,
      };
    });

    if (normalizedExercises.length > 0) {
      return {
        classificazione_soggetto: parsed.classificazione_soggetto || parsed.classificazione_atleta || parsed.atleta || 'Atleta Monitorato',
        obiettivo_blocco: parsed.obiettivo_blocco || parsed.obiettivo || 'Ipertrofia & Forza Metodo Antonio',
        durata_blocco: parsed.durata_blocco || parsed.durata || '4 Settimane con Scarico Programmato',
        frequenza_settimanale: parsed.frequenza_settimanale || parsed.frequenza || '3-4 Sedute a Settimana',
        split_scelta: parsed.split_scelta || parsed.split || 'Split Personalizzata',
        tempo_massimo_seduta: parsed.tempo_massimo_seduta || parsed.durata_seduta || '60 min',
        logica_progressione: parsed.logica_progressione || parsed.progressione || 'Progressione RIR/RPE e Carico Settimanale',
        programma_giorno_per_giorno: normalizedExercises,
        note_tecniche_essenziali: parsed.note_tecniche_essenziali || parsed.note || 'Focus su esecuzione tecnica controllata e TUT costante.',
        regole_adattamento: parsed.regole_adattamento || parsed.adattamento || 'Incremento carico del +2.5% solo se completate tutte le serie con RIR target.',
      };
    }

    // Validazione rigorosa Zod per il programma completo se già conforme
    const validationResult = generatedWorkoutResponseSchema.safeParse(parsed);
    if (validationResult.success) {
      return validationResult.data as GeneratedWorkoutResponse;
    }

    throw new Error("Formato non valido generato dall'IA.");

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Impossibile interpretare il formato del programma generato dall'IA.";
    console.warn("Parsing JSON fallito:", message);
    throw new Error(message);
  }
}

/**
 * Garantisce che tutti i giorni della settimana (es. Giorno A, B, C, D, E, F, G) abbiano da 5 a 7 esercizi completi.
 */
export function fillMissingDaysAndExercises(
  exercises: AIWorkoutExercise[],
  requestedDaysPerWeek: number,
  coachExercises?: ExerciseItem[]
): AIWorkoutExercise[] {
  if (!exercises || exercises.length === 0) return [];

  const dayLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const targetDays = dayLetters.slice(0, Math.min(requestedDaysPerWeek, 7)).map(l => `Giorno ${l}`);

  // Normalizza preliminarmente tutti i giorni
  const normalized = exercises.map((ex, idx) => ({
    ...ex,
    week_number: Number(ex.week_number) || 1,
    day_name: normalizeDayName(ex.day_name, idx, requestedDaysPerWeek),
  }));

  // Pool di esercizi complementari bilanciati
  const fallbackExercisePool = (coachExercises && coachExercises.length > 0) ? coachExercises : [
    { name: 'Panca Piana con Manubri', category: 'Petto', equipment: 'Manubri' },
    { name: 'Lat Machine Avanti Presa V', category: 'Dorso', equipment: 'Cavi' },
    { name: 'Leg Press 45°', category: 'Gambe', equipment: 'Macchina' },
    { name: 'Slow Press con Manubri', category: 'Spalle', equipment: 'Manubri' },
    { name: 'Curl Bilanciere Sagomato EZ', category: 'Bicipiti', equipment: 'Bilanciere' },
    { name: 'Pushdown Cavi con Corda', category: 'Tricipiti', equipment: 'Cavi' },
    { name: 'Plank Addominali', category: 'Addominali', equipment: 'Corpo Libero' },
    { name: 'Affondi Camminati con Manubri', category: 'Gambe', equipment: 'Manubri' },
    { name: 'Pulley Basso Presa Stretta', category: 'Dorso', equipment: 'Cavi' },
    { name: 'Alzate Laterali ai Cavi', category: 'Spalle', equipment: 'Cavi' },
    { name: 'Leg Curl Seduto', category: 'Gambe', equipment: 'Macchina' },
    { name: 'Chest Press Isotonica', category: 'Petto', equipment: 'Macchina' }
  ];

  let poolIdx = 0;
  const getNextFallbackExercise = () => {
    const ex = fallbackExercisePool[poolIdx % fallbackExercisePool.length];
    poolIdx++;
    return ex;
  };

  const result: AIWorkoutExercise[] = [...normalized];
  const weeks = Array.from(new Set(normalized.map(e => e.week_number))).sort((a, b) => a - b);
  if (weeks.length === 0) weeks.push(1);

  for (const weekNum of weeks) {
    for (const dayName of targetDays) {
      const existingExs = result.filter(e => e.week_number === weekNum && e.day_name.toLowerCase() === dayName.toLowerCase());

      // Rabbocca solo se un giorno è sotto-dimensionato (meno di 4 esercizi)
      if (existingExs.length < 4) {
        const missingCount = 5 - existingExs.length;
        for (let i = 0; i < missingCount; i++) {
          const fallback = getNextFallbackExercise();
          result.push({
            week_number: weekNum,
            day_name: dayName,
            name: fallback.name,
            sets: 3,
            reps_target: '8-10',
            rest_seconds: 90,
            target_weight: '75% 1RM',
            rir_target: 'RIR 2',
            tut: '3-0-1-0',
            notes: `Esecuzione tecnica controllata, focus sulla contrazione muscolare target.`,
          });
        }
      }
    }
  }

  return result;
}

/**
 * Espande e periodizza il mesociclo a tutte le settimane richieste (es. 4, 6, 8 o 12 settimane).
 */
export function expandMesocycleWeeks(
  generatedExercises: AIWorkoutExercise[],
  requestedWeeks: number
): AIWorkoutExercise[] {
  if (!generatedExercises || generatedExercises.length === 0) return [];

  let normalized = generatedExercises.map((ex, idx) => ({
    ...ex,
    week_number: Number(ex.week_number) || 1,
    day_name: normalizeDayName(ex.day_name, idx),
  }));

  const maxGenWeek = Math.max(...normalized.map(e => e.week_number), 1);

  if (requestedWeeks > maxGenWeek) {
    const result: AIWorkoutExercise[] = [...normalized];
    const rirProgression = ['RIR 3', 'RIR 2', 'RIR 1', 'RIR 4 (Scarico)'];

    for (let w = maxGenWeek + 1; w <= requestedWeeks; w++) {
      const baseWeek = ((w - 1) % Math.min(maxGenWeek, 4)) + 1;
      const baseWeekExercises = normalized.filter(e => e.week_number === baseWeek);
      const blockIndex = Math.floor((w - 1) / 4);
      const weekInBlock = (w - 1) % 4;

      const expandedForWeek = baseWeekExercises.map(ex => {
        let newRir = rirProgression[weekInBlock] || ex.rir_target;
        let newWeight = ex.target_weight;
        let newSets = ex.sets;

        if (weekInBlock === 1) {
          if (newWeight && !newWeight.includes('+')) {
            newWeight = `${newWeight} (+2.5%)`;
          }
        } else if (weekInBlock === 2) {
          if (newWeight && !newWeight.includes('+')) {
            newWeight = `${newWeight} (+5% Peak)`;
          }
        } else if (weekInBlock === 3) {
          newRir = 'RIR 3-4 (Scarico)';
          if (newSets > 1) {
            newSets = Math.max(1, newSets - 1);
          }
          if (newWeight) {
            newWeight = newWeight.split(' (+')[0] + ' (Scarico)';
          }
        }

        if (blockIndex >= 1 && weekInBlock !== 3) {
          if (newWeight && !newWeight.includes('Mese')) {
            newWeight = `${newWeight} (Progress. Mese ${blockIndex + 1})`;
          }
        }

        return {
          ...ex,
          week_number: w,
          rir_target: newRir,
          target_weight: newWeight,
          sets: newSets,
        };
      });

      result.push(...expandedForWeek);
    }

    return result;
  }

  return normalized;
}

// ─── MOTORE DETERMINISTICO DI GENERAZIONE LOCALE (METODO ANTONIO AI ENGINE) ───

export function generateLocalWorkoutResponse(params: GenerateWorkoutParams): GeneratedWorkoutResponse {
  const athleteLevel = params.experienceLevel || (params.athlete?.tags && params.athlete.tags[0]) || 'Intermedio';
  const goal = params.goal || 'Ipertrofia Funzionale e Ricomposizione Corporea';
  const weeks = params.weeks || 4;
  const daysPerWeek = Math.min(Math.max(params.daysPerWeek || 3, 1), 7);
  const sessionMin = params.sessionDurationMinutes || 60;
  const progressionStyle = params.progressionStyle || 'Progressione RIR/RPE a Sovraccarico Progressivo';

  // Determinazione Split
  let splitName = params.splitStyle || 'Upper / Lower Split';
  if (!params.splitStyle || params.splitStyle === 'Auto / Scelta dall\'IA') {
    if (daysPerWeek === 1) splitName = 'Full Body Unica (Total Body)';
    else if (daysPerWeek === 2) splitName = 'Upper / Lower (A/B)';
    else if (daysPerWeek === 3) splitName = 'Push / Pull / Legs (A/B/C)';
    else if (daysPerWeek === 4) splitName = 'Upper / Lower / Upper / Lower (A/B/C/D)';
    else if (daysPerWeek === 5) splitName = 'Push / Pull / Legs / Upper / Lower (A/B/C/D/E)';
    else if (daysPerWeek === 6) splitName = 'Push / Pull / Legs x 2 (A/B/C/D/E/F)';
    else splitName = 'Push / Pull / Legs / Upper / Lower / Focus / Deload';
  }

  // Database strutturato per split cinesiologica
  const libraryByGroup: Record<string, string[]> = {
    push: [
      'Panca Piana con Bilanciere',
      'Spinte Manubri su Panca Inclinata 30°',
      'Chest Press Isotonica Convergente',
      'Croci ai Cavi dall\'Alto',
      'Military Press con Bilanciere',
      'Alzate Laterali con Manubri',
      'French Press su Panca con Bilanciere EZ',
      'Pushdown Cavi con Corda',
      'Dip alle Parallele (Petto/Tricipiti)',
      'Alzate Laterali ai Cavi Singolo Braccio'
    ],
    pull: [
      'Stacco da Terra con Bilanciere',
      'Trazioni alla Sbarra Presa Prona',
      'Lat Machine Avanti Presa V',
      'Rematore con Bilanciere Presa Supina',
      'Pulley Basso al Cavo con Triangolo',
      'Pullover al Cavo Alto',
      'Face Pull al Cavo con Corda',
      'Curl con Bilanciere Sagomato EZ',
      'Hammer Curl con Manubri',
      'Curl Panca Inclinata con Manubri'
    ],
    legs: [
      'Squat con Bilanciere Dietro la Nuca',
      'Leg Press 45° a Carico Libero',
      'Affondi Camminati con Manubri',
      'Bulgarian Split Squat con Manubri',
      'Leg Extension Singola Gamba',
      'Stacco Rumeno con Manubri',
      'Leg Curl Seduto Isotonico',
      'Hip Thrust con Bilanciere',
      'Calf Raise in Piedi al Multipower',
      'Calf Machine Seduto'
    ],
    upper: [
      'Panca Piana con Manubri',
      'Rematore con Manubrio su Panca',
      'Military Press con Manubri',
      'Lat Machine Presa Larga Prona',
      'Alzate Laterali ai Cavi',
      'Curl Bicipiti Alternato con Manubri',
      'Pushdown con Asta Dritta al Cavo'
    ],
    lower: [
      'Front Squat al Multipower',
      'Leg Press Orizzontale',
      'Stacco Rumeno con Bilanciere',
      'Leg Curl Disteso su Panca',
      'Affondi Indietro sul Posto',
      'Calf Raise alla Pressa 45°',
      'Plank a Terra con Isometria'
    ],
    fullBody: [
      'Squat con Bilanciere',
      'Panca Piana con Bilanciere',
      'Trazioni alla Sbarra / Lat Machine',
      'Military Press',
      'Stacco da Terra / Rumeno',
      'Curl Bicipiti EZ',
      'Plank Addominali'
    ]
  };

  // Se il coach ha esercizi custom nella libreria, li integra con priorità
  if (params.coachExercises && params.coachExercises.length > 0) {
    for (const ex of params.coachExercises) {
      const cat = (ex.category || '').toLowerCase();
      if (cat.includes('petto') || cat.includes('spall') || cat.includes('tricipiti')) {
        libraryByGroup.push.unshift(ex.name);
        libraryByGroup.upper.unshift(ex.name);
      } else if (cat.includes('dorso') || cat.includes('bicipiti')) {
        libraryByGroup.pull.unshift(ex.name);
        libraryByGroup.upper.unshift(ex.name);
      } else if (cat.includes('gambe') || cat.includes('polpacci') || cat.includes('glutei')) {
        libraryByGroup.legs.unshift(ex.name);
        libraryByGroup.lower.unshift(ex.name);
      }
    }
  }

  const dayLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].slice(0, daysPerWeek);
  const rawExercisesWeek1: AIWorkoutExercise[] = [];

  dayLetters.forEach((letter, idx) => {
    const dayName = `Giorno ${letter}`;
    let exerciseNamesForDay: string[] = [];

    if (daysPerWeek === 1) {
      exerciseNamesForDay = libraryByGroup.fullBody.slice(0, 6);
    } else if (daysPerWeek === 2) {
      exerciseNamesForDay = idx === 0 ? libraryByGroup.upper.slice(0, 6) : libraryByGroup.lower.slice(0, 6);
    } else if (daysPerWeek === 3) {
      if (idx === 0) exerciseNamesForDay = libraryByGroup.push.slice(0, 6);
      else if (idx === 1) exerciseNamesForDay = libraryByGroup.pull.slice(0, 6);
      else exerciseNamesForDay = libraryByGroup.legs.slice(0, 6);
    } else if (daysPerWeek === 4) {
      if (idx === 0) exerciseNamesForDay = libraryByGroup.upper.slice(0, 6);
      else if (idx === 1) exerciseNamesForDay = libraryByGroup.lower.slice(0, 6);
      else if (idx === 2) exerciseNamesForDay = libraryByGroup.push.slice(0, 6);
      else exerciseNamesForDay = libraryByGroup.pull.slice(0, 6);
    } else {
      if (idx === 0) exerciseNamesForDay = libraryByGroup.push.slice(0, 6);
      else if (idx === 1) exerciseNamesForDay = libraryByGroup.pull.slice(0, 6);
      else if (idx === 2) exerciseNamesForDay = libraryByGroup.legs.slice(0, 6);
      else if (idx === 3) exerciseNamesForDay = libraryByGroup.upper.slice(0, 6);
      else if (idx === 4) exerciseNamesForDay = libraryByGroup.lower.slice(0, 6);
      else if (idx === 5) exerciseNamesForDay = libraryByGroup.push.slice(0, 6);
      else exerciseNamesForDay = libraryByGroup.fullBody.slice(0, 6);
    }

    exerciseNamesForDay.forEach((exName, exIdx) => {
      let sets = 4;
      let reps = '8-10';
      let rest = 90;
      let rir = 'RIR 2';
      let tut = '3-0-1-0';
      let targetWeight = 'Carico target 75% 1RM';

      if (exIdx === 0) {
        // Esercizio Fondamentale
        sets = 4;
        reps = '6-8';
        rest = 120;
        rir = 'RIR 2';
        tut = '3-1-1-0';
        targetWeight = '80% 1RM (Carico Base)';
      } else if (exIdx === 1) {
        // Esercizio Multi-articolare complementare
        sets = 4;
        reps = '8-10';
        rest = 90;
        rir = 'RIR 2';
        tut = '3-0-1-0';
        targetWeight = '75% 1RM';
      } else if (exIdx === 2 || exIdx === 3) {
        // Esercizio di isolamento / tensione continua
        sets = 3;
        reps = '10-12';
        rest = 75;
        rir = 'RIR 1-2';
        tut = '2-0-1-1';
        targetWeight = '70% 1RM';
      } else {
        // Pump / Stabilizzazione / Braccia
        sets = 3;
        reps = '12-15';
        rest = 60;
        rir = 'RIR 1';
        tut = '2-0-1-2';
        targetWeight = '65% 1RM';
      }

      rawExercisesWeek1.push({
        week_number: 1,
        day_name: dayName,
        name: exName,
        sets,
        reps_target: reps,
        rest_seconds: rest,
        target_weight: targetWeight,
        rir_target: rir,
        tut,
        notes: `Focus su traiettoria biomeccanica pulita, fermo isometrico al picco di contrazione e fase eccentrica controllata.`,
      });
    });
  });

  const filled = fillMissingDaysAndExercises(rawExercisesWeek1, daysPerWeek, params.coachExercises || []);
  const expanded = expandMesocycleWeeks(filled, weeks);

  const athleteName = params.athlete ? `${params.athlete.firstName} ${params.athlete.lastName}` : 'Atleta';

  return {
    classificazione_soggetto: `${athleteName} — Livello: ${athleteLevel} | Obiettivo: ${goal}`,
    obiettivo_blocco: `Periodizzazione ${goal} — Volume ed Intensità Metodo Antonio`,
    durata_blocco: `${weeks} Settimane con Scarico Programmato`,
    frequenza_settimanale: `${daysPerWeek} Sedute a Settimana (${dayLetters.map(l => `Giorno ${l}`).join(', ')})`,
    split_scelta: splitName,
    tempo_massimo_seduta: `${sessionMin} minuti`,
    logica_progressione: progressionStyle,
    programma_giorno_per_giorno: expanded,
    note_tecniche_essenziali: `Applicare rigorosamente il TUT indicato su ogni esercizio. Mantenere 1-2 ripetizioni in riserva (RIR) nelle prime due settimane, per poi ricercare il picco di intensità nella settimana 3 prima del deload della settimana 4.`,
    regole_adattamento: `Se l'atleta completa tutte le serie e ripetizioni con RIR inferiore a 1, incrementare il carico del +2.5% per esercizi della parte superiore e +5% per esercizi della parte inferiore nella sessione successiva.`,
  };
}

export async function generateWorkoutWithAI(
  params: GenerateWorkoutParams,
  onProgress?: (msg: string) => void
): Promise<GeneratedWorkoutResponse> {

  if (onProgress) onProgress('Analisi del profilo atleta e parametri cinesiologici...');

  const exerciseNames = (params.coachExercises || []).map(e => e.name).join(', ');

  const weeksToPrompt = (params.daysPerWeek >= 5 || (params.sessionDurationMinutes || 60) >= 90) ? 1 : Math.min(params.weeks, 4);
  const daysToPrompt = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].slice(0, Math.min(params.daysPerWeek, 7));

  const targetMin = params.sessionDurationMinutes || 60;
  let recommendedExCount = '5 - 7';
  if (targetMin <= 45) recommendedExCount = '4 - 5';
  else if (targetMin >= 90) recommendedExCount = '7 - 10';

  const systemPrompt = METODO_ANTONIO_MASTER_PROMPT;

  let athleteContext = '';
  if (params.athlete) {
    const safeId = params.athlete.id ? params.athlete.id.substring(0, 6) : 'Anonimo';
    athleteContext = `
Dati Atleta Selezionato:
- Identificativo: Atleta_${safeId}
- Età: ${params.athlete.dateOfBirth ? new Date().getFullYear() - new Date(params.athlete.dateOfBirth).getFullYear() : 'N/D'}
- Livello stimato: ${params.athlete.tags?.join(', ') || 'N/D'}
- Obiettivi Atleta: ${params.athlete.goals || 'Non specificato'}
- Note Mediche: ${params.athlete.medicalNotes || 'Nessuna'}
- Note Interne Coach: ${params.athlete.notes || 'Nessuna'}
`;
    if (params.metricsContext) {
      athleteContext += `- Peso Attuale: ${params.metricsContext.weight_kg ? params.metricsContext.weight_kg + 'kg' : 'N/D'}\n`;
      athleteContext += `- Massa Grassa (BF): ${params.metricsContext.body_fat_percentage ? params.metricsContext.body_fat_percentage + '%' : 'N/D'}\n`;
    }
  }

  if (params.customAthleteContext?.trim()) {
    athleteContext += `\nContesto / Stile di Vita Aggiuntivo:\n<user_input_context>\n${params.customAthleteContext.trim()}\n</user_input_context>\n`;
  }
  
  if (params.chatContext?.trim()) {
    athleteContext += `\nSTORICO RECENTE CHAT CON IL COACH (FEEDBACK ATLETA):\n<chat_history>\n${params.chatContext.trim()}\n</chat_history>\n`;
  }

  const safetyContext = buildExerciseSafetyContext(params.athlete, params.coachExercises || []);

  const userPrompt = `
Genera il programma di allenamento basato su queste specifiche:
${athleteContext}

PARAMETRI CHIAVE DEL PROGRAMMA:
- Obiettivo specifico: ${params.goal || params.athlete?.goals || 'Ipertrofia'}
- Livello Esperienza Atleta: ${params.experienceLevel || 'Intermedio'}
- Durata Target Sessione: ${targetMin} minuti
- Stile di Progressione: ${params.progressionStyle || 'RIR/RPE Progressivo'}
${params.targetFocus && params.targetFocus.length > 0 ? `- Focus Muscolare Specifico: ${params.targetFocus.join(', ')}` : ''}
${params.splitStyle ? `- Stile della Split: ${params.splitStyle}` : ''}
- Settimane totali da programmare: ${weeksToPrompt}
- Giorni per settimana: ${params.daysPerWeek} (Usa esattamente questi giorni: ${daysToPrompt.map(d => `"Giorno ${d}"`).join(', ')})
- Attrezzatura a disposizione: ${(params.availableEquipment && params.availableEquipment.length > 0) ? params.availableEquipment.join(', ') : 'Palestra Completa'}
${params.limitations ? `- INFORTUNI / LIMITAZIONI DA EVITARE:\n<limitations>\n${params.limitations}\n</limitations>` : '- Nessuna limitazione segnalata'}
${params.extraNotes ? `- Note aggiuntive / Istruzioni del Coach:\n<coach_notes>\n${params.extraNotes}\n</coach_notes>` : ''}

${safetyContext ? safetyContext + '\n' : ''}
LIBRERIA ESERCIZI PREFERITA COACH:
[${exerciseNames || 'Esercizi base della disciplina'}]

REGOLE TASSATIVE: 
1. Assicurati di generare tra ${recommendedExCount} esercizi per CIASCUN giorno di CIASCUNA settimana (${daysToPrompt.map(d => `"Giorno ${d}"`).join(', ')}).
2. Usa principalmente la libreria esercizi del coach.
3. Se mancano dati critici per generare, usa il campo "domanda_mirata".
4. Se c'è un blocco di sicurezza (es. infortunio non compatibile), usa il campo "blocco_sicurezza".
`.trim();

  if (onProgress) onProgress('Elaborazione scheda con AI e periodizzazione avanzata...');

  // Chiamata trasparente a Google Gemini
  const genResult = await generateContentWithGemini({
    provider: params.provider,
    systemPrompt,
    userPrompt,
    temperature: 0.7,
    maxTokens: 16384,
    responseMimeType: 'application/json',
  });

  if (onProgress) onProgress('Finalizzazione del programma e validazione biomeccanica...');
  const content = genResult.text;
  const parsedObj = safeParseWorkoutJSON(content);

  if (parsedObj.domanda_mirata || parsedObj.blocco_sicurezza) {
    return parsedObj;
  }

  const filled = fillMissingDaysAndExercises(parsedObj.programma_giorno_per_giorno || [], params.daysPerWeek, params.coachExercises);
  const expanded = expandMesocycleWeeks(filled, params.weeks);
  parsedObj.programma_giorno_per_giorno = expanded;

  return parsedObj;
}

export interface CoPilotActionableSuggestion {
  id: string;
  osservazione: string;
  motivo: string;
  modifica_suggerita: string;
  azione_tipo: 'REDUCE_SETS' | 'INCREASE_SETS' | 'CHANGE_RIR' | 'SWAP_EXERCISE' | 'REMOVE_EXERCISE' | 'NONE';
  target_exercise_name: string;
  payload: {
    new_value?: string | number;
  };
}

export interface AISmartSuggestionsContext {
  athleteLevel: string;
  athleteGoal: string;
  sessionDuration: number;
  limitations: string;
}

export async function generateAISmartSuggestions(
  exercises: { name?: string; sets?: number; reps_target?: string; rest_seconds?: number }[],
  context?: AISmartSuggestionsContext
): Promise<CoPilotActionableSuggestion[]> {
  const profileContext = context 
    ? `Profilo Atleta: ${context.athleteLevel}. Obiettivo: ${context.athleteGoal}. Tempo Seduta: ${context.sessionDuration} min. Limitazioni/Fastidi: ${context.limitations || 'Nessuna'}.`
    : `Nessun profilo specifico fornito.`;

  const prompt = `
Agisci come un Senior Coach esperto (Metodo Antonio) che sta revisionando la scheda di un collega.
Analizza la seguente sessione di allenamento contestualizzandola sul profilo dell'atleta.

${profileContext}

Esercizi nella sessione:
${exercises.map(e => `- ${e.name}`).join('\n')}

Restituisci ESATTAMENTE un array JSON (e nient'altro) contenente da 1 a 3 suggerimenti di ottimizzazione.
Ogni elemento dell'array deve rispettare ESATTAMENTE questo schema:
{
  "id": "generare_un_id_univoco_stringa",
  "osservazione": "Cosa rilevi di subottimale",
  "motivo": "Spiegazione cinesiologica",
  "modifica_suggerita": "Cosa fare",
  "azione_tipo": "REDUCE_SETS" | "INCREASE_SETS" | "CHANGE_RIR" | "SWAP_EXERCISE" | "REMOVE_EXERCISE" | "NONE",
  "target_exercise_name": "Nome dell'esercizio target esatto",
  "payload": { "new_value": "valore" }
}
`;

  const genResult = await generateContentWithGemini({
    provider: 'gemini',
    systemPrompt: 'Sei un Senior Master Trainer e Docente di Biomeccanica.',
    userPrompt: prompt,
    temperature: 0.5,
    maxTokens: 4096,
    responseMimeType: 'application/json',
  });

  let rawText = genResult.text.replace(/^```json/gi, '').replace(/^```/gi, '').replace(/```$/gi, '').trim();
  const match = rawText.match(/\[[\s\S]*\]/);
  if (match) rawText = match[0];
  const parsed = JSON.parse(rawText);
  if (Array.isArray(parsed)) {
    return parsed as CoPilotActionableSuggestion[];
  }
  throw new Error("Formato risposta suggerimenti IA non valido.");
}
