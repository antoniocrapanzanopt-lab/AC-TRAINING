import {
  ExerciseCategory,
  ExerciseEquipment,
  ExerciseType,
  Bilaterality,
  MovementPlane,
  KineticChain,
  MuscleInvolvement,
  ExerciseExecution,
  ExerciseKeyParams,
  ExerciseSafety,
} from '../../types/exercise';
import { AI_CONFIG } from '../../config/aiConfig';
import { generateContentWithGemini } from './geminiClient';

/** Struttura completa di un esercizio generato dall'IA */
export interface GeneratedAIExercise {
  name: string;
  category: ExerciseCategory;
  equipment: ExerciseEquipment;
  instructions?: string;
  description?: string;
  video_url?: string;
  tipo?: ExerciseType;
  type?: ExerciseType;
  bilateralita?: Bilaterality;
  bilaterality?: Bilaterality;
  piano_movimento?: MovementPlane;
  movement_plane?: MovementPlane;
  catena_cinetica?: KineticChain;
  kinetic_chain?: KineticChain;
  gradi_liberta?: number;
  degrees_of_freedom?: number;
  unilateral_execution?: boolean;
  parametri_chiave?: ExerciseKeyParams;
  key_parameters?: ExerciseKeyParams;
  muscoli_coinvolti?: MuscleInvolvement[];
  muscles?: MuscleInvolvement[];
  esecuzione?: ExerciseExecution;
  execution?: ExerciseExecution;
  sicurezza?: ExerciseSafety;
  safety?: ExerciseSafety;
  is_verified?: boolean;
}

export interface BulkGenerateParams {
  count?: number;
  category?: ExerciseCategory | 'Tutti';
  equipmentFilter?: string;
  customPrompt?: string;
}

export type GenerateExercisesParams = BulkGenerateParams;

// ─── Funzione Generazione Massiva ─────────────────────────────────────────────

export async function generateExercisesWithAI(
  params: BulkGenerateParams,
  onProgress?: (msg: string) => void
): Promise<GeneratedAIExercise[]> {
  const count = params.count || 5;

  if (onProgress) onProgress(`Generazione schede esercizi strutturate con ${AI_CONFIG.GEMINI.DISPLAY_NAME}...`);

  const systemPrompt = `
Sei un docente universitario di Chinesiologia e Biomeccanica applicata al Bodybuilding e Strength & Conditioning.
Il tuo compito è generare un array di ${count} esercizi professionali completi, dettagliati e clinicamente impeccabili.
Ogni esercizio deve avere la struttura JSON ESATTA richiesta, senza omissioni.
`.trim();

  const userPrompt = `
Genera un elenco di ${count} esercizi per la libreria del coach.
${params.category && params.category !== 'Tutti' ? `- Categoria Principale: ${params.category}` : '- Distribuisci gli esercizi in modo bilanciato tra tutte le categorie muscolari'}
${params.equipmentFilter ? `- Attrezzatura specifica: ${params.equipmentFilter}` : ''}
${params.customPrompt ? `- Indicazioni aggiuntive: ${params.customPrompt}` : ''}

Restituisci SOLO l'array JSON valido con la struttura completa per ogni esercizio.
`.trim();

  try {
    const genResult = await generateContentWithGemini({
      provider: AI_CONFIG.DEFAULT_PROVIDER,
      systemPrompt,
      userPrompt,
      temperature: 0.6,
      maxTokens: 8192,
      responseMimeType: 'application/json',
    });

    let rawText = genResult.text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(rawText);

    if (!parsed.exercises || !Array.isArray(parsed.exercises)) {
      if (Array.isArray(parsed)) return parsed;
      throw new Error('Formato risposta IA non valido.');
    }

    return parsed.exercises;
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Errore durante la generazione degli esercizi con l'IA.";
    console.error('Errore generazione esercizi IA:', err);
    throw new Error(errorMessage);
  }
}

// ─── Funzione "Compila con IA" — Suggerimento per singolo esercizio ────────────

/**
 * Dato il nome di un esercizio (e opzionalmente categoria/attrezzatura),
 * Gemini genera la scheda biomeccanica completa pronta da compilare nel wizard.
 */
export async function suggestExerciseWithAI(
  name: string,
  category?: string,
  equipment?: string
): Promise<GeneratedAIExercise> {

  const systemPrompt = `
Sei un esperto di Biomeccanica, Chinesiologia e Metodologia dell'Allenamento di livello accademico.
Il tuo compito è compilare una scheda tecnica COMPLETA e CLINICAMENTE PRECISA per UN SINGOLO esercizio di forza o corpo libero.
Fornisci dati reali, anatomicamente corretti e praticamente utili per un personal trainer certificato.
`.trim();

  const userPrompt = `
Compila la scheda completa per l'esercizio: "${name}"
${category ? `- Categoria suggerita: ${category}` : ''}
${equipment ? `- Attrezzatura: ${equipment}` : ''}

Includi TUTTI i campi:
- Classificazione (tipo, bilateralità, piano di movimento, catena cinetica, gradi di libertà)
- Parametri chiave (ROM, curva di resistenza, punto di picco tensione, TUT, recupero)
- Muscoli coinvolti (minimo 4 muscoli con ruolo e percentuale realistica)
- Esecuzione (setup dettagliato, cues concentrica, cues eccentrica con vettori di forza)
- Sicurezza (almeno 4 compensi da evitare, 4 criteri di arresto, controindicazioni cliniche reali)

Restituisci UN SINGOLO oggetto JSON valido (non un array).
`.trim();

  try {
    const genResult = await generateContentWithGemini({
      provider: AI_CONFIG.DEFAULT_PROVIDER,
      systemPrompt,
      userPrompt,
      temperature: 0.4,
      maxTokens: 8192,
      responseMimeType: 'application/json',
    });

    let rawText = genResult.text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(rawText) as GeneratedAIExercise;
    // Preserva il nome originale inserito dall'utente
    parsed.name = name;
    return parsed;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Errore durante la generazione del suggerimento IA.";
    throw new Error(msg);
  }
}



