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
  return getStorageItem('gemini_api_key', '');
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

  if (onProgress) onProgress('Preparazione del contesto e della libreria esercizi...');

  const exerciseNames = params.coachExercises.map(e => e.name).join(', ');

  const systemPrompt = `
Sei un Personal Trainer d'élite ed esperto programmatore dell'allenamento.
Il tuo compito è generare un programma di allenamento altamente professionale, diviso per settimane e per giorni, restituendo ESCLUSIVAMENTE un array JSON strutturato.

Regole Fondamentali:
1. Devi generare una scheda di allenamento della durata di ${params.weeks} settimane, con ${params.daysPerWeek} giorni di allenamento a settimana.
2. Usa nomi standard per i giorni: "Giorno A", "Giorno B", "Giorno C", ecc.
3. Le settimane devono andare da 1 a ${params.weeks}.
4. Scegli gli esercizi PRINCIPALMENTE (ma non esclusivamente) da questa libreria preferita del coach: [${exerciseNames}]. Se serve un esercizio non in lista, puoi proporlo.
5. Progressione: implementa una progressione sensata (es. aumento volume, o aumento intensità/RPE) nel corso delle settimane.

Struttura JSON richiesta per ogni esercizio (array di oggetti):
- week_number (numero)
- day_name (stringa, es. "Giorno A")
- name (stringa)
- sets (numero)
- reps_target (stringa, es. "8-10" o "12")
- rest_seconds (numero, es. 90, 120)
- target_weight (stringa opzionale, es. "%RM" o carico specifico se stimato)
- rir_target (stringa opzionale, es. "1-2" o "RPE 8")
- tut (stringa opzionale, es. "3-1-1-1")
- notes (stringa opzionale per l'atleta, es. focus tecnico)
`;

  let athleteContext = '';
  if (params.athlete) {
    athleteContext = `
Dati Atleta:
- Nome: ${params.athlete.firstName} ${params.athlete.lastName}
- Età: ${params.athlete.dateOfBirth ? new Date().getFullYear() - new Date(params.athlete.dateOfBirth).getFullYear() : 'N/D'}
- Livello stimato: ${params.athlete.tags?.join(', ') || 'N/D'}
- Obiettivo dell'atleta: ${params.athlete.goals || 'Non specificato'}
- Note Mediche/Infortuni: ${params.athlete.medicalNotes || 'Nessuna'}
- Note interne del coach: ${params.athlete.notes || 'Nessuna'}
`;
  }

  const userPrompt = `
Genera il programma di allenamento basato su queste specifiche:
${athleteContext}

Obiettivo specifico di questa scheda: ${params.goal}
Settimane totali: ${params.weeks}
Giorni per settimana: ${params.daysPerWeek}
Attrezzatura a disposizione: ${params.availableEquipment.join(', ')}
Eventuali limitazioni o note per questa scheda: ${params.limitations || 'Nessuna'}

Restituisci solo l'array JSON valido.
`;

  if (onProgress) onProgress(`Generazione del programma in corso con ${params.provider === 'openai' ? 'OpenAI (GPT-4o)' : 'Gemini (1.5 Pro)'}...`);

  try {
    if (params.provider === 'openai') {
      const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o', // Modello top di gamma per ragionamento complesso
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
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
      // GEMINI IMPLEMENTATION (Con fallback automatico sui modelli v1beta disponibili)
      const geminiModels = [
        'gemini-1.5-flash',
        'gemini-2.0-flash',
        'gemini-1.5-pro-latest',
        'gemini-pro'
      ];

      let lastError: Error | null = null;
      let data: any = null;

      for (const modelName of geminiModels) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              system_instruction: {
                parts: [{ text: systemPrompt }]
              },
              contents: [{
                role: "user",
                parts: [{ text: userPrompt }]
              }],
              generationConfig: {
                temperature: 0.7,
                responseMimeType: "application/json",
                responseSchema: {
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
                        required: ["week_number", "day_name", "name", "sets", "reps_target", "rest_seconds"]
                      }
                    }
                  },
                  required: ["exercises"]
                }
              }
            })
          });

          if (response.ok) {
            data = await response.json();
            break; // Successo! Usciamo dal loop
          } else {
            const err = await response.json().catch(() => ({}));
            lastError = new Error(err.error?.message || `Errore HTTP ${response.status} da Gemini (${modelName})`);
          }
        } catch (err: any) {
          lastError = err;
        }
      }

      if (!data) {
        throw lastError || new Error("Nessun modello Gemini è stato in grado di completare la richiesta.");
      }

      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!content) throw new Error("Risposta vuota dall'IA Gemini");

      const parsed = JSON.parse(content);
      return parsed.exercises as AIWorkoutExercise[];
    }

  } catch (error: any) {
    console.error("Errore AI Workout Generator:", error);
    throw new Error(error.message || "Errore sconosciuto durante la generazione della scheda.");
  }
}
