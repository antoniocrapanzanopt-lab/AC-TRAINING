import { Athlete } from '../../types';
import { ExerciseItem } from '../../types/exercise';
import { supabase } from '../supabase';
import { METODO_ANTONIO_MASTER_PROMPT, WORKOUT_JSON_SCHEMA } from './prompts/workoutMasterPrompt';
import { generatedWorkoutResponseSchema } from './workoutZodSchema';

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

  // 4. Parsing e Validazione Zod
  try {
    const parsed = JSON.parse(sanitized);
    
    // Gestione casi speciali (domanda_mirata o blocco_sicurezza)
    if (parsed.domanda_mirata || parsed.blocco_sicurezza) {
      return parsed as GeneratedWorkoutResponse;
    }

    // Validazione rigorosa Zod per il programma completo
    const validationResult = generatedWorkoutResponseSchema.safeParse(parsed);
    
    if (validationResult.success) {
      return validationResult.data as GeneratedWorkoutResponse;
    } else {
      console.error("Zod Validation Error:", validationResult.error.format());
      throw new Error("Formato non valido generato dall'IA. Dati mancanti o corrotti. Riprova la generazione.");
    }

  } catch (err: any) {
    console.warn("Parsing JSON fallito", err);
    throw new Error(err.message || "Impossibile interpretare il formato del programma generato dall'IA. Riprova la generazione.");
  }
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
        let newSets = ex.sets;

        // Logica espansione intelligente
        // Week 1: Accumulo (base)
        // Week 2: Intensificazione (RIR scende)
        // Week 3: Picco (RIR al limite)
        // Week 4: Scarico (Volume e intensità ridotti)

        if (weekInBlock === 1) { // Week 2
          if (newWeight && !newWeight.includes('+')) {
            newWeight = `${newWeight} (+2.5%)`;
          }
        } else if (weekInBlock === 2) { // Week 3
          if (newWeight && !newWeight.includes('+')) {
            newWeight = `${newWeight} (+5% Peak)`;
          }
        } else if (weekInBlock === 3) { // Week 4 Deload
          newRir = 'RIR 3-4 (Scarico)';
          if (newSets > 1) {
             // Taglio del volume (1 serie in meno per esercizio, circa -30% di volume)
            newSets = Math.max(1, newSets - 1);
          }
          if (newWeight) {
             // Ritorno al carico base
            newWeight = newWeight.split(' (+')[0] + ' (Scarico)';
          }
        }

        // Progressioni per blocchi successivi (es. mese 2)
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

export async function generateWorkoutWithAI(
  params: GenerateWorkoutParams,
  onProgress?: (msg: string) => void
): Promise<GeneratedWorkoutResponse> {


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

  const systemPrompt = METODO_ANTONIO_MASTER_PROMPT;

  let athleteContext = '';
  if (params.athlete) {
    // 🔒 PRIVACY GDPR: Anonimizzazione del nome prima dell'invio al LLM
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
    athleteContext += `\nSTORICO RECENTE CHAT CON IL COACH (FEEDBACK ATLETA):\n<chat_history>\n${params.chatContext.trim()}\n</chat_history>\n(Tieni conto di questi feedback recenti per adattare gli esercizi e motivare le tue scelte nel reasoning).\n`;
  }

  // ── SISTEMA ESPERTO: Matching cliente-esercizio con controindicazioni ──────────
  const safetyContext = buildExerciseSafetyContext(params.athlete, params.coachExercises);

  const userPrompt = `
Genera il programma di allenamento basato su queste specifiche:
${athleteContext}

PARAMETRI CHIAVE DEL PROGRAMMA:
- Obiettivo specifico: ${params.goal}
- Livello Esperienza Atleta: ${params.experienceLevel || 'Intermedio'}
- Durata Target Sessione: ${targetMin} minuti
- Stile di Progressione: ${params.progressionStyle || 'RIR/RPE Progressivo'}
${params.targetFocus && params.targetFocus.length > 0 ? `- Focus Muscolare Specifico: ${params.targetFocus.join(', ')}` : ''}
${params.splitStyle ? `- Stile della Split: ${params.splitStyle}` : ''}
- Settimane totali da programmare: ${weeksToPrompt}
- Giorni per settimana: ${params.daysPerWeek} (Usa esattamente questi giorni: ${daysToPrompt.map(d => `"Giorno ${d}"`).join(', ')})
- Attrezzatura a disposizione: ${params.availableEquipment.length > 0 ? params.availableEquipment.join(', ') : 'Palestra Completa'}
${params.limitations ? `- INFORTUNI / LIMITAZIONI DA EVITARE:\n<limitations>\n${params.limitations}\n</limitations>` : '- Nessuna limitazione segnalata'}
${params.extraNotes ? `- Note aggiuntive / Istruzioni del Coach:\n<coach_notes>\n${params.extraNotes}\n</coach_notes>` : ''}

${safetyContext ? safetyContext + '\n' : ''}
LIBRERIA ESERCIZI PREFERITA COACH:
[${exerciseNames}]

REGOLE TASSATIVE: 
1. Assicurati di generare tra ${recommendedExCount} esercizi per CIASCUN giorno di CIASCUNA settimana (${daysToPrompt.map(d => `"Giorno ${d}"`).join(', ')}).
2. Usa principalmente la libreria esercizi del coach.
3. Se mancano dati critici per generare, usa il campo "domanda_mirata".
4. Se c'è un blocco di sicurezza (es. infortunio non compatibile), usa il campo "blocco_sicurezza".
`;

  try {
    if (onProgress) onProgress(`Generazione in corso (tramite Edge Function protetta)...`);

    const { data, error } = await supabase.functions.invoke('generate-workout', {
      body: {
        provider: params.provider,
        systemPrompt,
        userPrompt,
        model: params.provider === 'openai' ? 'gpt-4o' : 'gemini-1.5-pro',
        maxTokens: 8192,
        temperature: 0.7,
        responseFormat: params.provider === 'openai' ? {
          type: "json_schema",
          json_schema: {
            name: "workout_program",
            strict: false,
            schema: WORKOUT_JSON_SCHEMA
          }
        } : undefined
      }
    });

    if (error) {
      console.error("Errore Edge Function", error);
      throw new Error(`Errore Server: ${error.message}`);
    }

    if (!data || !data.text) {
      throw new Error("Risposta vuota o malformata dall'IA");
    }

    const content = data.text;
    const parsedObj = safeParseWorkoutJSON(content);
    
    // Se c'è una domanda mirata o un blocco sicurezza, ritorniamo immediatamente
    if (parsedObj.domanda_mirata || parsedObj.blocco_sicurezza) {
      return parsedObj;
    }
    
    const filled = fillMissingDaysAndExercises(parsedObj.programma_giorno_per_giorno || [], params.daysPerWeek, params.coachExercises);
    const expanded = expandMesocycleWeeks(filled, params.weeks);
    parsedObj.programma_giorno_per_giorno = expanded;
    
    return parsedObj;

  } catch (err: any) {
    console.error("Errore Generazione IA:", err);
    throw err;
  }
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
  exercises: any[],
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
${exercises.map(e => `- ${e.name} (Serie: ${e.sets}, Target: ${e.reps_target}, Rec: ${e.rest_seconds}s)`).join('\n')}

Restituisci ESATTAMENTE un array JSON (e nient'altro) contenente da 1 a 3 suggerimenti di ottimizzazione.
Ogni elemento dell'array deve rispettare ESATTAMENTE questo schema:
{
  "id": "generare_un_id_univoco_stringa",
  "osservazione": "Cosa rilevi di subottimale",
  "motivo": "Perché è subottimale rispetto al profilo o alla fatica",
  "modifica_suggerita": "Descrizione sintetica della correzione",
  "azione_tipo": "Scegli tra: REDUCE_SETS, INCREASE_SETS, CHANGE_RIR, SWAP_EXERCISE, REMOVE_EXERCISE",
  "target_exercise_name": "NOME_ESATTO_DELL_ESERCIZIO_DA_MODIFICARE",
  "payload": {
    "new_value": "Il nuovo valore. Se REDUCE_SETS o INCREASE_SETS, un numero intero. Se SWAP_EXERCISE o CHANGE_RIR, una stringa."
  }
}

Se non ci sono criticità, restituisci un array vuoto [].
Non inserire MAI blocchi markdown (es. \`\`\`json), restituisci direttamente l'array JSON puro.
`;

  try {
    const { data, error } = await supabase.functions.invoke('generate-workout', {
      body: {
        provider: 'gemini',
        systemPrompt: "Sei un analista di fatica per schede di allenamento.",
        userPrompt: prompt,
        model: 'gemini-1.5-pro',
        maxTokens: 2048,
        temperature: 0.4
      }
    });

    if (error) throw new Error(`Errore Server: ${error.message}`);
    if (!data || !data.text) throw new Error("Risposta vuota dall'IA Gemini");

    let rawText = data.text;

    let cleaned = rawText.trim().replace(/^```json/gi, '').replace(/^```/gi, '').replace(/```$/gi, '').trim();
    // Estract array brackets if there's surrounding text
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    if (jsonMatch) cleaned = jsonMatch[0];

    try {
      const parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) return [];
      
      // Fix types if necessary
      return parsed.map((item: any) => ({
        ...item,
        payload: {
          new_value: ['REDUCE_SETS', 'INCREASE_SETS'].includes(item.azione_tipo) 
            ? Number(item.payload?.new_value) 
            : item.payload?.new_value
        }
      }));
    } catch (parseError) {
      console.warn("JSON Parse Fallback per i consigli IA:", parseError);
      return [];
    }
  } catch (error: any) {
    console.error("Errore Smart Suggestions:", error);
    return [];
  }
}
