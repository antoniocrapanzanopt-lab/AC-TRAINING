import { Athlete } from '../../types';
import { ExerciseItem } from '../../types/exercise';
import { getStorageItem, setStorageItem } from '../storage';

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

  const systemPrompt = `
Sei un Master Strength & Conditioning Coach ed esperto di metodologia dell'allenamento di livello mondiale.
Il tuo compito è generare un programma di allenamento ESTREMAMENTE PERSONALIZZATO, scientifico e pronto all'uso, diviso per settimane e per giorni, restituendo ESCLUSIVAMENTE un array JSON strutturato.

PRINCIPI DI PROGRAMMAZIONE D'ÉLITE DA APPLICARE:

1. **PERIODO E PROGRESSIONE (WAVE / MICROCICLI)**:
   - Durata totale: ${params.weeks} settimane, con ${params.daysPerWeek} giorni di allenamento a settimana.
   - Modellazione della progressione: ${params.progressionStyle || 'RIR/RPE Progressivo (Overload + Scarico)'}.
   - In caso di 4 settimane: Settimana 1 = RIR 3 (accumulo); Settimana 2 = RIR 2 (carico progressivo); Settimana 3 = RIR 1 (picco di intensità); Settimana 4 = RIR 4-5 (scarico attivo / deload con volume ridotto del 30-40%).

2. **VOLUME & ESPERIENZA DELL'ATLETA**:
   - Livello Atleta: ${params.experienceLevel || 'Intermedio'}.
   - Se Principiante: 10-12 serie totali per gruppo muscolare/settimana, focus su schemi motori puliti.
   - Se Intermedio: 14-18 serie totali per gruppo muscolare/settimana.
   - Se Avanzato: 18-22 serie totali per gruppo muscolare/settimana, intensificazione mirata.

3. **TEMPO PER SEDUTA & TIMING**:
   - Durata massima consigliata per sessione: ${params.sessionDurationMinutes || 60} minuti.
   - Struttura l'allenamento con un numero calibrato di esercizi (es. 4-5 esercizi per 45-60 min; 6-7 per 75-90 min) in modo che i tempi di esecuzione e recupero rientrino perfettamente nei minuti a disposizione del cliente!

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
1. **QUANTITÀ ESERCIZI PER GIORNO**: Ogni giorno di allenamento (es. Giorno A) in OGNI settimana DEVE contenere da 4 a 7 esercizi completi. È severamente vietato generare solo 1 o 2 esercizi per seduta!
2. **FORMATO NOMI GIORNO**: Il campo 'day_name' deve essere ESATTAMENTE e solo "Giorno A", "Giorno B", "Giorno C", "Giorno D" (senza suffissi come '- Push' o note extra).

Struttura JSON richiesta per ogni esercizio (array di oggetti):
- week_number (numero da 1 a ${params.weeks})
- day_name (stringa pulita: ESATTAMENTE "Giorno A", "Giorno B", "Giorno C"...)
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

      return safeParseWorkoutJSON(content);

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

      return safeParseWorkoutJSON(rawText);
    }
  } catch (error: any) {
    console.error("Errore AI Workout Generator:", error);
    throw new Error(error.message || "Errore sconosciuto durante la generazione della scheda.");
  }
}
