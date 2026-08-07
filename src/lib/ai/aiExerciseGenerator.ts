import { ExerciseCategory, ExerciseEquipment } from '../../types/exercise';
import { getGeminiKey } from './workoutGenerator';

export interface GeneratedAIExercise {
  name: string;
  category: ExerciseCategory;
  equipment: ExerciseEquipment;
  instructions?: string;
  video_url?: string;
}

export interface GenerateExercisesParams {
  category?: ExerciseCategory | 'Tutti';
  equipmentFilter?: string;
  count?: number; // 10, 20, 30, 50
  customPrompt?: string;
}

export async function generateExercisesWithAI(
  params: GenerateExercisesParams,
  onProgress?: (msg: string) => void
): Promise<GeneratedAIExercise[]> {
  const apiKey = getGeminiKey();
  if (!apiKey) {
    throw new Error("Chiave API Gemini non trovata.");
  }

  if (onProgress) onProgress("Generazione dell'elenco esercizi in corso con Gemini 3.6 Flash...");

  const count = params.count || 20;

  const systemPrompt = `
Sei un docente universitario di Biomeccanica e Chinesiologia e Master Trainer d'élite.
Il tuo compito è generare un elenco di ${count} esercizi di allenamento coi pesi e a corpo libero altissima qualità, anatomicamente precisi e vari.

Regole di Generazione:
1. Genera ESATTAMENTE ${count} esercizi ben dettagliati.
2. Nomi in ITALIANO corretto, chiari e standard nel settore (es. "Panca Piana con Bilanciere", "Stacco Rumeno con Manubri", "Lat Machine Presa Inversa", "Squat Bulgaro", "Face Pull ai Cavi").
3. Categorie ammesse: 'Petto', 'Dorso', 'Gambe', 'Spalle', 'Bicipiti', 'Tricipiti', 'Addominali', 'Full Body', 'Cardio', 'Altro'.
4. Attrezzatura ammessa: 'Bilanciere', 'Manubri', 'Cavi', 'Macchina', 'Corpo Libero', 'Kettlebell', 'Elastici', 'Altro'.
5. Per ogni esercizio includi una breve descrizione tecnica nel campo 'instructions' con i principali cue biomeccanici.
`;

  const userPrompt = `
Genera un elenco di ${count} esercizi per la libreria del coach.
${params.category && params.category !== 'Tutti' ? `- Categoria Principale: ${params.category}` : '- Distribuisci gli esercizi in modo bilanciato tra tutte le categorie muscolari (Petto, Dorso, Gambe, Spalle, Braccia, Core)'}
${params.equipmentFilter ? `- Attrezzatura specifica: ${params.equipmentFilter}` : ''}
${params.customPrompt ? `- Indicazioni aggiuntive: ${params.customPrompt}` : ''}

Restituisci solo l'array JSON valido.
`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;
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
                    name: { type: "string" },
                    category: { type: "string" },
                    equipment: { type: "string" },
                    instructions: { type: "string" },
                    video_url: { type: "string" }
                  },
                  required: ["name", "category", "equipment"]
                }
              }
            },
            required: ["exercises"]
          }
        }
      })
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Errore HTTP ${response.status} da Gemini`);
    }

    const data = await response.json();
    let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error("Risposta vuota dall'IA.");

    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(rawText);

    if (!parsed.exercises || !Array.isArray(parsed.exercises)) {
      throw new Error("Formato risposta IA non valido.");
    }

    return parsed.exercises as GeneratedAIExercise[];
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.error("Errore generazione esercizi IA:", err);
    throw new Error(err.message || "Errore durante la generazione degli esercizi con l'IA.");
  }
}
