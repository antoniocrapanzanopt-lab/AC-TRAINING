import {
  ExerciseCategory,
  ExerciseEquipment,
  ExerciseType,
  Bilaterality,
  MovementPlane,
  KineticChain,
  ResistanceCurve,
  MuscleRole,
  MuscleInvolvement,
  ExerciseExecution,
  ExerciseKeyParams,
  ExerciseSafety,
} from '../../types/exercise';
import { fetchGeminiWithMultiKeyPool } from './workoutGenerator';

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
  if (onProgress) onProgress("Generazione schede esercizi strutturate con Gemini 3.6 Flash...");

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
    const response = await fetchGeminiWithMultiKeyPool(
      ':generateContent',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 32768,
            responseMimeType: 'application/json',
            responseSchema: buildExerciseResponseSchema(count),
          },
        }),
      },
      onProgress
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error((err as { error?: { message?: string } }).error?.message || `Errore HTTP ${response.status} da Gemini`);
    }

    const data = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error("Risposta vuota dall'IA.");

    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(rawText) as { exercises?: GeneratedAIExercise[] };

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

/** Costruisce lo schema JSON strutturato per la risposta di Gemini */
function buildExerciseResponseSchema(count: number): object {
  const muscleRoles: MuscleRole[] = ['Target', 'Sinergico', 'Stabilizzatore', 'Motore dinamico'];
  const resistanceCurves: ResistanceCurve[] = ['Gravità (costante)', 'Ascendente', 'Discendente', 'Parabolica', 'Variabile (cam)', 'Costante (cavi)'];
  const exerciseTypes: ExerciseType[] = ['Forza', 'Ipertrofia', 'Resistenza', 'Potenza', 'Mobilità'];
  const bilateralities: Bilaterality[] = ['Bilaterale', 'Unilaterale'];
  const movementPlanes: MovementPlane[] = ['Sagittale', 'Frontale (scapolare)', 'Frontale', 'Trasverso', 'Multi-piano'];
  const kineticChains: KineticChain[] = ['Aperta', 'Chiusa', 'Mista'];

  const executionPhaseSchema = {
    type: 'object',
    properties: {
      descrizione: { type: 'string' },
      vettore_movimento: { type: 'string' },
      vettore_resistenza: { type: 'string' },
      traiettoria: { type: 'string' },
      cues: { type: 'array', items: { type: 'string' } },
    },
    required: ['descrizione', 'cues'],
  };

  return {
    type: 'object',
    properties: {
      exercises: {
        type: 'array',
        minItems: count,
        maxItems: count,
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            category: { type: 'string', enum: ['Petto', 'Dorso', 'Gambe', 'Spalle', 'Bicipiti', 'Tricipiti', 'Addominali', 'Full Body', 'Cardio', 'Altro'] },
            equipment: { type: 'string', enum: ['Bilanciere', 'Manubri', 'Cavi', 'Macchina', 'Corpo Libero', 'Kettlebell', 'Elastici', 'Altro'] },
            instructions: { type: 'string' },
            tipo: { type: 'string', enum: exerciseTypes },
            bilateralita: { type: 'string', enum: bilateralities },
            piano_movimento: { type: 'string', enum: movementPlanes },
            catena_cinetica: { type: 'string', enum: kineticChains },
            gradi_liberta: { type: 'integer', minimum: 1, maximum: 3 },
            parametri_chiave: {
              type: 'object',
              properties: {
                rom: { type: 'string' },
                curva_resistenza: { type: 'string', enum: resistanceCurves },
                punto_picco: { type: 'string' },
                tipo_stimolo: { type: 'string', enum: exerciseTypes },
                tut: {
                  type: 'object',
                  properties: { min: { type: 'integer' }, max: { type: 'integer' } },
                  required: ['min', 'max'],
                },
                recupero: {
                  type: 'object',
                  properties: { min: { type: 'integer' }, max: { type: 'integer' } },
                  required: ['min', 'max'],
                },
              },
              required: ['rom', 'curva_resistenza', 'punto_picco', 'tipo_stimolo', 'tut', 'recupero'],
            },
            muscoli_coinvolti: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  muscolo: { type: 'string' },
                  ruolo: { type: 'string', enum: muscleRoles },
                  percentuale: { type: 'integer', minimum: 0, maximum: 100 },
                },
                required: ['muscolo', 'ruolo', 'percentuale'],
              },
            },
            esecuzione: {
              type: 'object',
              properties: {
                setup: { type: 'array', items: { type: 'string' } },
                concentrica: executionPhaseSchema,
                eccentrica: executionPhaseSchema,
              },
              required: ['setup', 'concentrica', 'eccentrica'],
            },
            sicurezza: {
              type: 'object',
              properties: {
                compensi_da_evitare: { type: 'array', items: { type: 'string' } },
                criteri_arresto: { type: 'array', items: { type: 'string' } },
                controindicazioni: { type: 'array', items: { type: 'string' } },
                tolleranze: { type: 'string' },
              },
              required: ['compensi_da_evitare', 'criteri_arresto', 'controindicazioni', 'tolleranze'],
            },
          },
          required: ['name', 'category', 'equipment', 'tipo', 'bilateralita', 'piano_movimento', 'catena_cinetica', 'gradi_liberta', 'parametri_chiave', 'muscoli_coinvolti', 'esecuzione', 'sicurezza'],
        },
      },
    },
    required: ['exercises'],
  };
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
  const schema = buildExerciseSingleSchema();

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
    const response = await fetchGeminiWithMultiKeyPool(
      ':generateContent',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 8192,
            responseMimeType: 'application/json',
            responseSchema: schema,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(err.error?.message || `Errore HTTP ${response.status} da Gemini`);
    }

    const data = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error("Risposta vuota dall'IA.");

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

/** Schema JSON per un singolo esercizio (senza wrapper exercises[]) */
function buildExerciseSingleSchema(): object {
  const muscleRoles: MuscleRole[] = ['Target', 'Sinergico', 'Stabilizzatore', 'Motore dinamico'];
  const resistanceCurves: ResistanceCurve[] = ['Gravità (costante)', 'Ascendente', 'Discendente', 'Parabolica', 'Variabile (cam)', 'Costante (cavi)'];
  const exerciseTypes: ExerciseType[] = ['Forza', 'Ipertrofia', 'Resistenza', 'Potenza', 'Mobilità'];
  const bilateralities: Bilaterality[] = ['Bilaterale', 'Unilaterale'];
  const movementPlanes: MovementPlane[] = ['Sagittale', 'Frontale (scapolare)', 'Frontale', 'Trasverso', 'Multi-piano'];
  const kineticChains: KineticChain[] = ['Aperta', 'Chiusa', 'Mista'];

  const phaseSchema = {
    type: 'object',
    properties: {
      descrizione: { type: 'string' },
      vettore_movimento: { type: 'string' },
      vettore_resistenza: { type: 'string' },
      traiettoria: { type: 'string' },
      cues: { type: 'array', items: { type: 'string' } },
    },
    required: ['descrizione', 'cues'],
  };

  return {
    type: 'object',
    properties: {
      name: { type: 'string' },
      category: { type: 'string', enum: ['Petto', 'Dorso', 'Gambe', 'Spalle', 'Bicipiti', 'Tricipiti', 'Addominali', 'Full Body', 'Cardio', 'Altro'] },
      equipment: { type: 'string', enum: ['Bilanciere', 'Manubri', 'Cavi', 'Macchina', 'Corpo Libero', 'Kettlebell', 'Elastici', 'Altro'] },
      instructions: { type: 'string' },
      tipo: { type: 'string', enum: exerciseTypes },
      bilateralita: { type: 'string', enum: bilateralities },
      piano_movimento: { type: 'string', enum: movementPlanes },
      catena_cinetica: { type: 'string', enum: kineticChains },
      gradi_liberta: { type: 'integer', minimum: 1, maximum: 3 },
      parametri_chiave: {
        type: 'object',
        properties: {
          rom: { type: 'string' },
          curva_resistenza: { type: 'string', enum: resistanceCurves },
          punto_picco: { type: 'string' },
          tipo_stimolo: { type: 'string', enum: exerciseTypes },
          tut: { type: 'object', properties: { min: { type: 'integer' }, max: { type: 'integer' } }, required: ['min', 'max'] },
          recupero: { type: 'object', properties: { min: { type: 'integer' }, max: { type: 'integer' } }, required: ['min', 'max'] },
        },
        required: ['rom', 'curva_resistenza', 'punto_picco', 'tipo_stimolo', 'tut', 'recupero'],
      },
      muscoli_coinvolti: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            muscolo: { type: 'string' },
            ruolo: { type: 'string', enum: muscleRoles },
            percentuale: { type: 'integer', minimum: 0, maximum: 100 },
          },
          required: ['muscolo', 'ruolo', 'percentuale'],
        },
      },
      esecuzione: {
        type: 'object',
        properties: {
          setup: { type: 'array', items: { type: 'string' } },
          concentrica: phaseSchema,
          eccentrica: phaseSchema,
        },
        required: ['setup', 'concentrica', 'eccentrica'],
      },
      sicurezza: {
        type: 'object',
        properties: {
          compensi_da_evitare: { type: 'array', items: { type: 'string' } },
          criteri_arresto: { type: 'array', items: { type: 'string' } },
          controindicazioni: { type: 'array', items: { type: 'string' } },
          tolleranze: { type: 'string' },
        },
        required: ['compensi_da_evitare', 'criteri_arresto', 'controindicazioni', 'tolleranze'],
      },
    },
    required: ['name', 'category', 'equipment', 'tipo', 'bilateralita', 'piano_movimento', 'catena_cinetica', 'gradi_liberta', 'parametri_chiave', 'muscoli_coinvolti', 'esecuzione', 'sicurezza'],
  };
}

