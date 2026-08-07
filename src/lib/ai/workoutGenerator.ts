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

export function getGeminiKey(): string {
  const stored = getStorageItem<string>('gemini_api_key', '');
  if (stored && typeof stored === 'string' && stored.trim()) return stored.trim();
  return (import.meta.env.VITE_GEMINI_API_KEY as string) || '';
}

export function setGeminiKey(key: string): void {
  setStorageItem('gemini_api_key', key.trim());
}

export async function generateWorkoutWithAI(
  params: GenerateWorkoutParams,
  onProgress?: (msg: string) => void
): Promise<AIWorkoutExercise[]> {
  const apiKey = params.provider === 'openai' ? getOpenAIKey() : getGeminiKey();
  if (!apiKey) {
    throw new Error(`API Key ${params.provider === 'openai' ? 'OpenAI' : 'Gemini'} mancante. Inseriscila nelle impostazioni.`);
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
   - Nel campo 'notes' di ciascun esercizio, fornisci un **Cue percettivo o biomeccanico specifico** e pratico (es. "Spingi il suolo, mantieni le scapole depresse e gomiti a 45°", "Pausa di 1 secondo in massimo accorciamento").

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

  if (onProgress) onProgress(`Generazione del programma in corso con Gemini 3.6 Flash...`);

  try {
    if (params.provider === 'openai') {
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
                      target_weight: { type: "string", description: "Opzionale. Carico target." },
                      rir_target: { type: "string", description: "Opzionale. RIR o RPE." },
                      tut: { type: "string", description: "Opzionale. Time under tension (es. 3-0-1-0)." },
                      notes: { type: "string", description: "Opzionale. Note tecniche." }
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

      const parsed = JSON.parse(content);
      return parsed.exercises as AIWorkoutExercise[];

    } else {
      const geminiModels = [
        'gemini-3.6-flash',
      ];

      let lastError: Error | null = null;
      let data: any = null;

      for (const modelName of geminiModels) {
        if (onProgress) onProgress(`Generazione in corso con Gemini 3.6 Flash...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 secondi per permettere la generazione di tutta la scheda JSON

        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
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
          });
          clearTimeout(timeoutId);

          if (response.ok) {
            data = await response.json();
            break;
          } else {
            const errData = await response.json().catch(() => ({}));
            const msg = errData.error?.message || `Errore HTTP ${response.status}`;
            lastError = new Error(msg);
            
            // Se la chiave API è invalida (400 / 403), blocca. Se è un 429 quota per quel singolo modello, prova il modello successivo
            if (response.status === 403 || (response.status === 400 && msg.toLowerCase().includes('key'))) {
              throw new Error(`Chiave API Gemini non valida: ${msg}`);
            }
          }
        } catch (err: any) {
          clearTimeout(timeoutId);
          if (err.name === 'AbortError') {
            lastError = new Error("La generazione dell'IA ha impiegato troppo tempo. Riprova con un numero inferiore di settimane o giorni.");
          } else if (err.message?.includes('Chiave API Gemini non valida')) {
            throw err;
          } else {
            lastError = err;
          }
        }
      }

      // Fallback Plain JSON Prompt (Se i responseSchema falliscono)
      if (!data) {
        for (const modelName of geminiModels.slice(0, 2)) {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 90000);
          try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal,
              body: JSON.stringify({
                contents: [{
                  role: "user",
                  parts: [{ text: `${systemPrompt}\n\n${userPrompt}\n\nRISPONDI ESCLUSIVAMENTE IN FORMATO JSON VALIDO SENZA MARKDOWN:\n{"exercises": [...]}` }]
                }],
                generationConfig: {
                  temperature: 0.7,
                  responseMimeType: "application/json"
                }
              })
            });
            clearTimeout(timeoutId);

            if (response.ok) {
              data = await response.json();
              break;
            }
          } catch (e) {
            clearTimeout(timeoutId);
          }
        }
      }

      if (!data) {
        throw new Error(lastError?.message || "Chiave API Gemini non valida o limite quota superato. Verifica la tua chiave su Google AI Studio.");
      }

      let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error("Risposta vuota dall'IA Gemini");

      // Clean Markdown code blocks if present
      rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(rawText);

      if (!parsed.exercises || !Array.isArray(parsed.exercises)) {
        throw new Error("Il formato della risposta Gemini non contiene la lista esercizi valida.");
      }

      return parsed.exercises as AIWorkoutExercise[];
    }
  } catch (error: any) {
    console.error("Errore AI Workout Generator:", error);
    throw new Error(error.message || "Errore sconosciuto durante la generazione della scheda.");
  }
}
