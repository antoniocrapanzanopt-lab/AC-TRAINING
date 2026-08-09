import { Athlete } from '../../types';
import { ExerciseItem } from '../../types/exercise';
import { getStorageItem, setStorageItem } from '../storage';

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

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

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

export function getOpenAIKey(): string {
  return getStorageItem('openai_api_key', '');
}

export function setOpenAIKey(key: string): void {
  setStorageItem('openai_api_key', key.trim());
}

export function getGeminiKeysPool(): string[] {
  const pool: string[] = [];

  const stored = getStorageItem<string>('gemini_api_key', '');
  if (stored && typeof stored === 'string' && stored.trim()) {
    pool.push(stored.trim());
  }

  // Controlla VITE_GEMINI_API_KEY e fino a VITE_GEMINI_API_KEY_10
  const primaryEnv = (import.meta.env.VITE_GEMINI_API_KEY as string) || '';
  if (primaryEnv && !pool.includes(primaryEnv)) pool.push(primaryEnv);

  for (let i = 2; i <= 10; i++) {
    const key = (import.meta.env[`VITE_GEMINI_API_KEY_${i}`] as string) || '';
    if (key && typeof key === 'string' && key.trim() && !pool.includes(key.trim())) {
      pool.push(key.trim());
    }
  }

  return pool;
}

export function getGeminiKey(): string {
  const pool = getGeminiKeysPool();
  return pool.length > 0 ? pool[0] : '';
}

export function setGeminiKey(key: string): void {
  setStorageItem('gemini_api_key', key.trim());
}

/**
 * Parser JSON ultra-resiliente per risposte IA.
 * Gestisce troncamenti, a capo non protetti e formatta anche schede parziali se necessario.
 */
export function safeParseWorkoutJSON(rawText: string): AIWorkoutExercise[] {
  let cleaned = rawText.trim();

  // 1. Rimuovi blocchi Markdown ```json ... ```
  cleaned = cleaned.replace(/^```json/gi, '').replace(/^```/gi, '').replace(/```$/gi, '').trim();

  // 2. Estrai il blocco JSON principale se c'è testo prima o dopo
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }

  // 3. Prova prima il JSON.parse diretto
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed.exercises && Array.isArray(parsed.exercises)) {
      return parsed.exercises;
    }
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (err) {
    console.warn("JSON.parse diretto fallito, tentativo di ripristino stringa...", err);
  }

  // 4. Ripristino di stringhe e a capo non protetti (es. newlines dentro note o stringhe aperte)
  try {
    let sanitized = cleaned;

    // Sostituisci a capo letterali dentro i valori tra virgolette
    sanitized = sanitized.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (match) => {
      return match.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
    });

    // Se la stringa si è troncata a fine risposta (manca la chiusura } o ])
    if (!sanitized.endsWith('}')) {
      const lastObjIndex = sanitized.lastIndexOf('}');
      if (lastObjIndex !== -1) {
        sanitized = sanitized.substring(0, lastObjIndex + 1) + ']}';
      }
    }

    const parsed = JSON.parse(sanitized);
    if (parsed.exercises && Array.isArray(parsed.exercises)) {
      return parsed.exercises;
    }
  } catch (err) {
    console.warn("Ripristino parziale fallito, passaggio all'estrazione regex singoli oggetti...", err);
  }

  // 5. Fallback Regex Ultra-Resiliente: Estrai ogni singolo oggetto esercizio valido dal testo grezzo
  const exerciseMatches = cleaned.match(/\{[^{}]*"name"[^{}]*\}/g) || cleaned.match(/\{[^{}]*"week_number"[^{}]*\}/g);
  if (exerciseMatches && exerciseMatches.length > 0) {
    const recoveredExercises: AIWorkoutExercise[] = [];
    for (const objStr of exerciseMatches) {
      try {
        const obj = JSON.parse(objStr);
        if (obj.name && (obj.week_number !== undefined || obj.day_name)) {
          recoveredExercises.push({
            week_number: Number(obj.week_number) || 1,
            day_name: String(obj.day_name || 'Giorno A'),
            name: String(obj.name),
            sets: Number(obj.sets) || 3,
            reps_target: String(obj.reps_target || '10'),
            rest_seconds: Number(obj.rest_seconds) || 60,
            target_weight: obj.target_weight ? String(obj.target_weight) : undefined,
            rir_target: obj.rir_target ? String(obj.rir_target) : undefined,
            tut: obj.tut ? String(obj.tut) : undefined,
            notes: obj.notes ? String(obj.notes) : undefined,
          });
        }
      } catch (e) {
        // Ignora singolo oggetto malformato
      }
    }
    if (recoveredExercises.length > 0) {
      return recoveredExercises;
    }
  }

  throw new Error("Impossibile interpretare il formato del programma generato dall'IA. Riprova la generazione.");
}

async function fetchGeminiWithRetry(
  url: string,
  options: RequestInit,
  onProgress?: (msg: string) => void,
  maxRetries = 3
): Promise<Response> {
  let attempt = 0;
  while (attempt < maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        return response;
      }

      if (response.status === 429 && attempt < maxRetries) {
        const errData = await response.clone().json().catch(() => ({}));
        const msg = errData.error?.message || '';
        
        const retryMatch = msg.match(/retry in ([0-9\.]+)\s*s/i);
        const delaySec = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) + 1 : 3.5;
        const delayMs = Math.max(3000, delaySec * 1000);

        if (onProgress) {
          onProgress(`Quota temporanea raggiunta (20 req/min). Attesa di ${Math.round(delayMs / 1000)}s per il tentativo ${attempt + 1}/${maxRetries}...`);
        }
        await new Promise(res => setTimeout(res, delayMs));
        continue;
      }

      return response;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error("La generazione dell'IA ha impiegato troppo tempo.");
      }
      if (attempt >= maxRetries) throw err;
      await new Promise(res => setTimeout(res, 3000));
    }
  }
  throw new Error("Impossibile completare la richiesta dopo diversi tentativi.");
}

export async function fetchGeminiWithMultiKeyPool(
  endpointAction: string,
  options: RequestInit,
  onProgress?: (msg: string) => void
): Promise<Response> {
  const keysPool = getGeminiKeysPool();
  if (keysPool.length === 0) {
    throw new Error("Chiave API Gemini mancante. Verificare la configurazione del progetto.");
  }

  const fallbackModels = ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'];
  let lastResponse: Response | null = null;
  let lastErrorMsg = '';

  for (const modelName of fallbackModels) {
    for (let kIdx = 0; kIdx < keysPool.length; kIdx++) {
      const key = keysPool[kIdx];
      const fullUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}${endpointAction}?key=${key}`;

      try {
        const response = await fetchGeminiWithRetry(fullUrl, options, onProgress, 1);
        if (response.ok) {
          return response;
        }

        lastResponse = response;
        const errData = await response.clone().json().catch(() => ({}));
        lastErrorMsg = errData.error?.message || `Errore HTTP ${response.status}`;

        if (response.status === 429 || response.status === 403 || lastErrorMsg.toLowerCase().includes('quota')) {
          console.warn(`Modello ${modelName} su chiave #${kIdx + 1} ha raggiunto la quota. Scalo al modello/chiave successivo...`);
          if (onProgress) {
            onProgress(`Sostituzione automatica modello (${modelName} -> Gemini Flash)...`);
          }
          continue;
        } else {
          return response;
        }
      } catch (e: any) {
        lastErrorMsg = e.message || '';
      }
    }
  }

  if (lastResponse) return lastResponse;
  throw new Error(`Quota temporanea Gemini superata (20 req/min). Attendi 30 secondi o attiva il piano Pay-As-You-Go su Google AI Studio.`);
}

/**
 * Garantisce che tutti i giorni della settimana (es. Giorno A, B, C, D, E, F, G) abbiano da 6 a 8 esercizi completi.
 * Se l'IA ha interrotto la generazione per un giorno o ha saltato dei giorni a causa del limite di token,
 * questa funzione completa ed integra in modo trasparente tutti i giorni mancanti.
 */
export function fillMissingDaysAndExercises(
  exercises: AIWorkoutExercise[],
  requestedDaysPerWeek: number,
  coachExercises: ExerciseItem[]
): AIWorkoutExercise[] {
  if (!exercises || exercises.length === 0) return [];

  const dayLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const targetDays = dayLetters.slice(0, Math.min(requestedDaysPerWeek, 7)).map(l => `Giorno ${l}`);

  // Pool di esercizi complementari bilanciati
  const fallbackExercisePool = coachExercises.length > 0 ? coachExercises : [
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

  const result: AIWorkoutExercise[] = [...exercises];
  const weeks = Array.from(new Set(exercises.map(e => Number(e.week_number) || 1))).sort((a, b) => a - b);
  if (weeks.length === 0) weeks.push(1);

  for (const weekNum of weeks) {
    for (const dayName of targetDays) {
      const existingExs = result.filter(e => (e.week_number || 1) === weekNum && (e.day_name || '').trim().toLowerCase() === dayName.toLowerCase());

      // Se il giorno ha meno di 5 esercizi (o se è incompleto/troncato dall'IA)
      if (existingExs.length < 6) {
        const missingCount = 6 - existingExs.length;
        for (let i = 0; i < missingCount; i++) {
          const fallback = getNextFallbackExercise();
          result.push({
            week_number: weekNum,
            day_name: dayName,
            name: fallback.name,
            sets: 4,
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
 * Espande e periodizza il mesociclo a tutte le settimane richieste (es. 8 o 12 settimane),
 * garantendo che ciascuna settimana e ciascun giorno abbiano 4-7 esercizi completi.
 */
export function expandMesocycleWeeks(
  generatedExercises: AIWorkoutExercise[],
  requestedWeeks: number
): AIWorkoutExercise[] {
  if (!generatedExercises || generatedExercises.length === 0) return [];

  // Normalizza week_number e day_name
  let normalized = generatedExercises.map(ex => {
    let cleanDay = (ex.day_name || 'Giorno A').trim();
    const match = cleanDay.match(/(Giorno\s+[A-Z0-9]+)/i);
    if (match) {
      const dayLetter = match[1].split(/\s+/)[1].toUpperCase();
      cleanDay = `Giorno ${dayLetter}`;
    }
    return {
      ...ex,
      week_number: Number(ex.week_number) || 1,
      day_name: cleanDay,
    };
  });

  const maxGenWeek = Math.max(...normalized.map(e => e.week_number), 1);

  // Se sono state generate meno settimane di quelle richieste (es. 1 o 4 settimane anziché 12 per limiti di token)
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

        if (blockIndex === 1) {
          if (newWeight && !newWeight.includes('+')) {
            newWeight = `${newWeight} (+2.5% progressione)`;
          }
        } else if (blockIndex === 2) {
          if (newWeight && !newWeight.includes('+')) {
            newWeight = `${newWeight} (+5% picco)`;
          }
        }

        return {
          ...ex,
          week_number: w,
          rir_target: newRir,
          target_weight: newWeight,
        };
      });

      result.push(...expandedForWeek);
    }

    return result;
  }

  return normalized;
}

export async function generateWorkoutWithAI(
  params: GenerateWorkoutParams,
  onProgress?: (msg: string) => void
): Promise<AIWorkoutExercise[]> {
  const keysPool = getGeminiKeysPool();
  if (params.provider === 'openai' && !getOpenAIKey()) {
    throw new Error(`API Key OpenAI mancante. Inseriscila nelle impostazioni.`);
  } else if (params.provider !== 'openai' && keysPool.length === 0) {
    throw new Error(`API Key Gemini mancante. Inseriscila nelle impostazioni.`);
  }

  if (onProgress) onProgress('Preparazione del contesto e della periodizzazione scientifica...');

  const exerciseNames = params.coachExercises.map(e => e.name).join(', ');

  // Se i giorni o il minutaggio sono elevati (es. 7 giorni / 120 min), chiediamo all'IA 1 settimana master completa con 7-10 esercizi per seduta
  // Questo evita di superare il limite di 8192 token di output di Gemini ed evita risposte troncate
  const weeksToPrompt = (params.daysPerWeek >= 5 || (params.sessionDurationMinutes || 60) >= 90) ? 1 : Math.min(params.weeks, 4);
  const daysToPrompt = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].slice(0, Math.min(params.daysPerWeek, 7));

  const targetMin = params.sessionDurationMinutes || 60;
  let recommendedExCount = '5 - 7';
  if (targetMin <= 45) recommendedExCount = '4 - 5';
  else if (targetMin >= 90) recommendedExCount = '7 - 10';

  const systemPrompt = `
Sei un Master Strength & Conditioning Coach ed esperto di metodologia dell'allenamento di livello mondiale.
Il tuo compito è generare un programma di allenamento ESTREMAMENTE PERSONALIZZATO, scientifico e pronto all'uso, diviso per settimane e per giorni, restituendo ESCLUSIVAMENTE un array JSON strutturato.

PRINCIPI DI PROGRAMMAZIONE D'ÉLITE DA APPLICARE:

1. **PERIODO E PROGRESSIONE (WAVE / MICROCICLI)**:
   - Genera gli esercizi per le settimane da 1 a ${weeksToPrompt}, coprendo TUTTI i ${params.daysPerWeek} giorni per ciascuna settimana (${daysToPrompt.map(d => `"Giorno ${d}"`).join(', ')}).
   - Modellazione della progressione: ${params.progressionStyle || 'RIR/RPE Progressivo (Overload + Scarico)'}.
   - Settimana 1 = RIR 3 (accumulo); Settimana 2 = RIR 2 (carico progressivo); Settimana 3 = RIR 1 (picco di intensità); Settimana 4 = RIR 4-5 (scarico attivo / deload con volume ridotto del 30-40%).

2. **VOLUME & ESPERIENZA DELL'ATLETA**:
   - Livello Atleta: ${params.experienceLevel || 'Intermedio'}.
   - Se Principiante: 10-12 serie totali per gruppo muscolare/settimana, focus su schemi motori puliti.
   - Se Intermedio: 14-18 serie totali per gruppo muscolare/settimana.
   - Se Avanzato: 18-22 serie totali per gruppo muscolare/settimana, intensificazione mirata.

3. **DURATA SEDUTA & CALIBRAZIONE TEMPO (${targetMin} MINUTI)**:
   - L'atleta ha selezionato ben **${targetMin} MINUTI DI TEMPO MASSIMO PER SEDUTA**!
   - TASSATIVO: Calibra la quantità di esercizi e serie affinché la seduta sia ricca e completa per occupare pienamente i ${targetMin} minuti a disposizione! Per una durata di ${targetMin} minuti DEVI inserire esattamente **${recommendedExCount} ESERCIZI per ciascuna giornata** (con 4-5 serie per esercizio e recuperi di 90-180s per i multiarticolari).

4. **GERARCHIA DEGLI ESERCIZI NELLE SEDUTE**:
   - Per ciascun giorno, ordina gli esercizi secondo la fisiologia dell'allenamento:
     a. **Fondamentale Multiarticolare**: primo esercizio neurale pesante (3-5 serie, recupero 120-180s, TUT tipo '3-1-1-0').
     b. **Complementare Multiarticolare**: secondo esercizio a medio-alto carico (3-4 serie, recupero 90s).
     c. **Isolamento / Monolaterale**: esercizi di rifinitura ipertrofica (3-4 serie, recupero 60s, RIR stretto).
     d. **Core / Accessorio Finale**: chiusura seduta.

5. **ADATTAMENTO BIOMECCANICO ED INFORTUNI**:
   - Sostituisci IMMEDIATAMENTE qualsiasi esercizio rischioso per la condizione dell'atleta con varianti biomeccanicamente perfette (es. sbarra o manubri al posto del bilanciere in caso di impingement spalla; belt squat/leg press al posto di squat con bilanciere in caso di lombalgia).

6. **NOTE TECNICHE E CUE PER L'ATLETA**:
   - Nel campo 'notes' di ciascun esercizio, fornisci un **Cue percettivo o biomeccanico specifico** e pratico (senza virgolette doppie o caratteri di a capo).

LIBRERIA ESERCIZI PREFERITA COACH:
[${exerciseNames}]
Scegli gli esercizi PRINCIPALMENTE da questa libreria. Se necessario per l'adattamento biomeccanico, proponi esercizi adatti.

REGOLE TASSATIVE DI QUANTITÀ E NOMI GIORNO:
1. **COPERTURA GIORNI E QUANTITÀ**: DEVI generare esercizi per TUTTI i ${params.daysPerWeek} giorni per OGNI settimana (da week_number 1 a ${weeksToPrompt}). Ogni singolo giorno (${daysToPrompt.map(d => `"Giorno ${d}"`).join(', ')}) DEVE contenere esattamente **${recommendedExCount} esercizi completi**. È severamente vietato generare solo 1, 2 o 4 esercizi quando il tempo a disposizione è di ${targetMin} minuti!
2. **FORMATO NOMI GIORNO**: Il campo 'day_name' deve essere ESATTAMENTE uno tra: ${daysToPrompt.map(d => `"Giorno ${d}"`).join(', ')}.

Struttura JSON richiesta per ogni esercizio (array di oggetti):
- week_number (numero da 1 a ${weeksToPrompt})
- day_name (ESATTAMENTE uno tra ${daysToPrompt.map(d => `"Giorno ${d}"`).join(', ')})
- name (stringa)
- sets (numero)
- reps_target (stringa, es. "8-10" o "6")
- rest_seconds (numero, es. 60, 90, 120, 180)
- target_weight (stringa opzionale, es. "%RM", "Carico sfidante" o stimato)
- rir_target (stringa opzionale, es. "RIR 2" o "RIR 4 (Deload)")
- tut (stringa opzionale, es. "3-1-1-0")
- notes (stringa opzionale per l'atleta con cue biomeccanico pratico)
`;

  let athleteContext = '';
  if (params.athlete) {
    athleteContext = `
Dati Atleta Selezionato:
- Nome: ${params.athlete.firstName} ${params.athlete.lastName}
- Età: ${params.athlete.dateOfBirth ? new Date().getFullYear() - new Date(params.athlete.dateOfBirth).getFullYear() : 'N/D'}
- Livello stimato: ${params.athlete.tags?.join(', ') || 'N/D'}
- Obiettivi Atleta: ${params.athlete.goals || 'Non specificato'}
- Note Mediche: ${params.athlete.medicalNotes || 'Nessuna'}
- Note Interne Coach: ${params.athlete.notes || 'Nessuna'}
`;
  }

  if (params.customAthleteContext?.trim()) {
    athleteContext += `\nContesto / Stile di Vita Aggiuntivo:\n${params.customAthleteContext.trim()}\n`;
  }

  // ── SISTEMA ESPERTO: Matching cliente-esercizio con controindicazioni ──────────
  const safetyContext = buildExerciseSafetyContext(params.athlete, params.coachExercises);

  const userPrompt = `
Genera il programma di allenamento basato su queste specifiche:
${athleteContext}

PARAMETRI CHIAVE DEL PROGRAMMA:
- Obiettivo specifico: ${params.goal}
- Livello Esperienza Atleta: ${params.experienceLevel || 'Intermedio'}
- Durata Target Sessione: ${params.sessionDurationMinutes || 60} minuti
- Stile di Progressione: ${params.progressionStyle || 'RIR/RPE Progressivo'}
${params.targetFocus && params.targetFocus.length > 0 ? `- Focus Muscolare Specifico: ${params.targetFocus.join(', ')}` : ''}
${params.splitStyle ? `- Stile della Split: ${params.splitStyle}` : ''}
- Settimane totali: ${params.weeks}
- Giorni per settimana: ${params.daysPerWeek}
- Attrezzatura a disposizione: ${params.availableEquipment.length > 0 ? params.availableEquipment.join(', ') : 'Palestra Completa'}
${params.limitations ? `- INFORTUNI / LIMITAZIONI DA EVITARE: ${params.limitations}` : '- Nessuna limitazione segnalata'}
${params.extraNotes ? `- Note aggiuntive / Istruzioni del Coach: ${params.extraNotes}` : ''}

${safetyContext ? safetyContext + '\n' : ''}
IMPORTANTE: Assicurati di generare tra 4 e 7 esercizi per CIASCUN giorno di CIASCUNA settimana. Usa solo "Giorno A", "Giorno B", "Giorno C" come day_name.

Restituisci ESCLUSIVAMENTE l'array JSON valido secondo lo schema richiesto.
`;

  try {
    if (params.provider === 'openai') {
      const apiKey = getOpenAIKey();
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 8192,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "workout_program",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  exercises: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        week_number: { type: "number", description: "Numero della settimana (es. 1)" },
                        day_name: { type: "string", description: "Nome del giorno (es. Giorno A)" },
                        name: { type: "string", description: "Nome dell'esercizio" },
                        sets: { type: "number" },
                        reps_target: { type: "string" },
                        rest_seconds: { type: "number" },
                        target_weight: { type: "string" },
                        rir_target: { type: "string" },
                        tut: { type: "string" },
                        notes: { type: "string" }
                      },
                      required: ["week_number", "day_name", "name", "sets", "reps_target", "rest_seconds"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["exercises"],
                additionalProperties: false
              }
            }
          }
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `Errore HTTP ${response.status} da OpenAI`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      if (!content) throw new Error("Risposta vuota dall'IA");

      const parsed = safeParseWorkoutJSON(content);
      const filled = fillMissingDaysAndExercises(parsed, params.daysPerWeek, params.coachExercises);
      return expandMesocycleWeeks(filled, params.weeks);

    } else {
      if (onProgress) onProgress(`Generazione in corso con Gemini 3.6 Flash...`);

      const response = await fetchGeminiWithMultiKeyPool(
        ':generateContent',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: "user", parts: [{ text: userPrompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 8192,
              responseMimeType: "application/json",
              responseSchema: {
                type: "object",
                properties: {
                  exercises: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        week_number: { type: "number" },
                        day_name: { type: "string" },
                        name: { type: "string" },
                        sets: { type: "number" },
                        reps_target: { type: "string" },
                        rest_seconds: { type: "number" },
                        target_weight: { type: "string" },
                        rir_target: { type: "string" },
                        tut: { type: "string" },
                        notes: { type: "string" }
                      },
                      required: ["week_number", "day_name", "name", "sets", "reps_target", "rest_seconds"]
                    }
                  }
                },
                required: ["exercises"]
              }
            }
          })
        },
        onProgress
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Errore HTTP ${response.status} da Gemini`);
      }

      const data = await response.json();
      let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error("Risposta vuota dall'IA Gemini");

      const parsed = safeParseWorkoutJSON(rawText);
      const filled = fillMissingDaysAndExercises(parsed, params.daysPerWeek, params.coachExercises);
      return expandMesocycleWeeks(filled, params.weeks);
    }
  } catch (error: any) {
    console.error("Errore AI Workout Generator:", error);
    throw new Error(error.message || "Errore sconosciuto durante la generazione della scheda.");
  }
}
