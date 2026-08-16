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
import { supabase } from '../supabase';
import { AI_CONFIG } from '../../config/aiConfig';

/** Struttura completa di un esercizio generato dall'IA */
export interface GeneratedAIExercise {
  name: string;
  category: ExerciseCategory;
  equipment: ExerciseEquipment;
  instructions?: string;
  video_url?: string;
  // ── Informazioni Chiave ──────────────────────────────────────────────────
  tipo?: ExerciseType;
  bilateralita?: Bilaterality;
  piano_movimento?: MovementPlane;
  catena_cinetica?: KineticChain;
  gradi_liberta?: number;
  // ── Blocchi JSONB Strutturati ────────────────────────────────────────────
  parametri_chiave?: ExerciseKeyParams;
  muscoli_coinvolti?: MuscleInvolvement[];
  esecuzione?: ExerciseExecution;
  sicurezza?: ExerciseSafety;
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
  if (onProgress) onProgress(`Generazione schede esercizi strutturate con ${AI_CONFIG.GEMINI.DISPLAY_NAME}...`);

  const count = params.count || 20;

  const systemPrompt = `
Sei un docente universitario di Biomeccanica e Chinesiologia e Master Trainer d'élite certificato NSCA/FISIOCREM.
Il tuo compito è generare un elenco di ${count} esercizi di allenamento con pesi e a corpo libero di altissima qualità, anatomicamente precisi e vari.

Regole di Generazione:
1. Genera ESATTAMENTE ${count} esercizi ben dettagliati.
2. Nomi in ITALIANO corretto, chiari e standard nel settore (es. "Panca Piana con Bilanciere", "Alzate Laterali con Manubri", "Lat Machine Presa Inversa").
3. Categorie ammesse: 'Petto', 'Dorso', 'Gambe', 'Spalle', 'Bicipiti', 'Tricipiti', 'Addominali', 'Full Body', 'Cardio', 'Altro'.
4. Attrezzatura ammessa: 'Bilanciere', 'Manubri', 'Cavi', 'Macchina', 'Corpo Libero', 'Kettlebell', 'Elastici', 'Altro'.
5. Per ogni esercizio compila TUTTI i campi strutturati descritti nello schema JSON.
6. Le controindicazioni devono essere clinicamente accurate e specifiche (es. "Conflitto subacromiale", "Protrusione discale lombare L4-L5").
7. I muscoli coinvolti devono avere percentuali coerenti (la somma dei 'Target' non supera 100%).
8. I cue tecnici devono essere pratici, concisi e orientati all'atleta.
`.trim();

  const userPrompt = `
Genera un elenco di ${count} esercizi per la libreria del coach.
${params.category && params.category !== 'Tutti' ? `- Categoria Principale: ${params.category}` : '- Distribuisci gli esercizi in modo bilanciato tra tutte le categorie muscolari'}
${params.equipmentFilter ? `- Attrezzatura specifica: ${params.equipmentFilter}` : ''}
${params.customPrompt ? `- Indicazioni aggiuntive: ${params.customPrompt}` : ''}

Restituisci SOLO l'array JSON valido con la struttura completa per ogni esercizio.
`.trim();

  try {
    const { data, error } = await supabase.functions.invoke('generate-workout', {
      body: {
        provider: AI_CONFIG.DEFAULT_PROVIDER,
        systemPrompt: systemPrompt,
        userPrompt: userPrompt,
        model: AI_CONFIG.GEMINI.MODEL_ID,
        maxTokens: 8192,
        temperature: 0.6
      }
    });

    if (error) throw new Error(`Errore Server: ${error.message}`);
    if (!data || !data.text) throw new Error("Risposta vuota dall'IA.");

    let rawText = data.text;

    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(rawText);

    if (!parsed.exercises || !Array.isArray(parsed.exercises)) {
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
    const { data, error } = await supabase.functions.invoke('generate-workout', {
      body: {
        provider: AI_CONFIG.DEFAULT_PROVIDER,
        systemPrompt: systemPrompt,
        userPrompt: userPrompt,
        model: AI_CONFIG.GEMINI.MODEL_ID,
        maxTokens: 8192,
        temperature: 0.4
      }
    });

    if (error) throw new Error(`Errore Server: ${error.message}`);
    if (!data || !data.text) throw new Error("Risposta vuota dall'IA.");

    let rawText = data.text;

    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(rawText) as GeneratedAIExercise;

    // Preserva il nome originale inserito dall'utente
    parsed.name = name;
    return parsed;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Errore durante la generazione del suggerimento IA.";
    throw new Error(msg);
  }
}



