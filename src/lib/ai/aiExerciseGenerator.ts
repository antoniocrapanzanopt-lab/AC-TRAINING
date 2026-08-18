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
  ResistanceCurve,
  MuscleRole,
  ExerciseRole,
  SystemicCost,
  ExerciseDifficulty,
} from '../../types/exercise';
import { AI_CONFIG } from '../../config/aiConfig';
import { generateContentWithGemini } from './geminiClient';

// ─── Normalizzatori Robusti per Dropdown ──────────────────────────────────────

export function normalizeCategory(val?: string): ExerciseCategory {
  if (!val) return 'Petto';
  const v = val.trim().toLowerCase();
  if (v.includes('dorso') || v.includes('back') || v.includes('dorsal')) return 'Dorso';
  if (v.includes('spall') || v.includes('delto') || v.includes('shoulder')) return 'Spalle';
  if (v.includes('quad') || v.includes('cosc')) return 'Quadricipiti';
  if (v.includes('femor') || v.includes('ischiocrur') || v.includes('hamstring')) return 'Femorali';
  if (v.includes('glut')) return 'Glutei';
  if (v.includes('polp') || v.includes('calf') || v.includes('gastrocnem')) return 'Polpacci';
  if (v.includes('bicip') || v.includes('biceps')) return 'Bicipiti';
  if (v.includes('tricip') || v.includes('triceps')) return 'Tricipiti';
  if (v.includes('avambr') || v.includes('forearm')) return 'Avambracci';
  if (v.includes('addom') || v.includes('abs') || v.includes('retto')) return 'Addome';
  if (v.includes('core')) return 'Core';
  if (v.includes('lomb') || v.includes('erector') || v.includes('lower back')) return 'Lombari';
  if (v.includes('full') || v.includes('globale') || v.includes('total')) return 'Full Body';
  if (v.includes('condiz') || v.includes('cardio') || v.includes('hiit')) return 'Conditioning';
  if (v.includes('pett') || v.includes('chest')) return 'Petto';
  return 'Altro';
}

export function normalizeEquipment(val?: string): ExerciseEquipment {
  if (!val) return 'Manubri';
  const v = val.trim().toLowerCase();
  if (v.includes('bilanc') || v.includes('barbell')) return 'Bilanciere';
  if (v.includes('manub') || v.includes('dumbbell')) return 'Manubri';
  if (v.includes('macchin') || v.includes('machine') || v.includes('pressa') || v.includes('leg ext') || v.includes('lat mach')) return 'Macchina';
  if (v.includes('cav') || v.includes('cable') || v.includes('pulley')) return 'Cavi';
  if (v.includes('corpo') || v.includes('calisthenic') || v.includes('bodyweight') || v.includes('libero')) return 'Corpo Libero';
  if (v.includes('multi') || v.includes('smith')) return 'Multipower';
  if (v.includes('kettle')) return 'Kettlebell';
  if (v.includes('elast') || v.includes('band')) return 'Elastici';
  if (v.includes('trap')) return 'Trap Bar';
  if (v.includes('slitt') || v.includes('sled') || v.includes('prowler')) return 'Slitta';
  if (v.includes('cardio') || v.includes('tapis') || v.includes('bike') || v.includes('rower')) return 'Cardio Machine';
  return 'Altro';
}

export function normalizeTipo(val?: string): ExerciseType {
  if (!val) return 'Ipertrofia';
  const v = val.trim().toLowerCase();
  if (v.includes('forz') || v.includes('strength')) return 'Forza';
  if (v.includes('resist') || v.includes('endur')) return 'Resistenza';
  if (v.includes('potenz') || v.includes('power') || v.includes('esplosiv')) return 'Potenza';
  if (v.includes('mobil') || v.includes('flex')) return 'Mobilità';
  if (v.includes('condiz') || v.includes('cardio')) return 'Condizionamento';
  return 'Ipertrofia';
}

export function normalizeBilateralita(val?: string): Bilaterality {
  if (!val) return 'Bilaterale';
  const v = val.trim().toLowerCase();
  if (v.includes('unilat') || v.includes('single') || v.includes('singol') || v.includes('monolat')) return 'Unilaterale';
  if (v.includes('altern')) return 'Alternato';
  return 'Bilaterale';
}

export function normalizePianoMovimento(val?: string): MovementPlane {
  if (!val) return 'Sagittale';
  const v = val.trim().toLowerCase();
  if (v.includes('scapolar')) return 'Frontale (scapolare)';
  if (v.includes('trasv') || v.includes('orizzont') || v.includes('transverse')) return 'Trasverso';
  if (v.includes('front') || v.includes('coron')) return 'Frontale';
  if (v.includes('multi') || v.includes('diagon') || v.includes('3d')) return 'Multi-piano';
  return 'Sagittale';
}

export function normalizeCatenaCinetica(val?: string): KineticChain {
  if (!val) return 'Aperta';
  const v = val.trim().toLowerCase();
  if (v.includes('chius') || v.includes('closed')) return 'Chiusa';
  if (v.includes('mist') || v.includes('hybrid')) return 'Mista';
  return 'Aperta';
}

export function normalizeCurvaResistenza(val?: string): ResistanceCurve {
  if (!val) return 'Gravità (costante)';
  const v = val.trim().toLowerCase();
  if (v.includes('ascend')) return 'Ascendente';
  if (v.includes('discend')) return 'Discendente';
  if (v.includes('parabol')) return 'Parabolica';
  if (v.includes('cam') || v.includes('variab')) return 'Variabile (cam)';
  if (v.includes('cav') || v.includes('cable')) return 'Costante (cavi)';
  return 'Gravità (costante)';
}

export function normalizeMuscleRole(val?: string): MuscleRole {
  if (!val) return 'Target';
  const v = val.trim().toLowerCase();
  if (v.includes('sinerg') || v.includes('synerg')) return 'Sinergico';
  if (v.includes('stabil') || v.includes('fiss')) return 'Stabilizzatore';
  if (v.includes('dinam') || v.includes('motor')) return 'Motore dinamico';
  return 'Target';
}

/** Struttura completa di un esercizio generato dall'IA */
export interface GeneratedAIExercise {
  name: string;
  category: ExerciseCategory;
  equipment: ExerciseEquipment;
  instructions?: string;
  description?: string;
  video_url?: string;
  tipo?: ExerciseType | null;
  type?: ExerciseType | null;
  bilateralita?: Bilaterality | null;
  bilaterality?: Bilaterality | null;
  piano_movimento?: MovementPlane | null;
  movement_plane?: MovementPlane | null;
  catena_cinetica?: KineticChain | null;
  kinetic_chain?: KineticChain | null;
  gradi_liberta?: number | null;
  degrees_of_freedom?: number | null;
  target_specifico?: string | null;
  pattern_movimento?: string | null;
  ruolo_esercizio?: ExerciseRole | null;
  costo_sistemico?: SystemicCost | null;
  livello_difficolta?: ExerciseDifficulty | null;
  progression_friendly?: boolean;
  unilateral_execution?: boolean;
  parametri_chiave?: ExerciseKeyParams | null;
  key_parameters?: ExerciseKeyParams | null;
  muscoli_coinvolti?: MuscleInvolvement[] | null;
  muscles?: MuscleInvolvement[] | null;
  esecuzione?: ExerciseExecution | null;
  execution?: ExerciseExecution | null;
  sicurezza?: ExerciseSafety | null;
  safety?: ExerciseSafety | null;
  is_verified?: boolean;
}

export interface BulkGenerateParams {
  count?: number;
  category?: ExerciseCategory | 'Tutti';
  equipmentFilter?: string;
  customPrompt?: string;
}

export type GenerateExercisesParams = BulkGenerateParams;

// ─── Normalizzatore di Oggetto Esercizio Completo ─────────────────────────────

export function sanitizeGeneratedExercise(raw: Record<string, any>, fallbackName: string): GeneratedAIExercise {
  const name = (raw.name || fallbackName || '').trim();
  const category = normalizeCategory(raw.category);
  const equipment = normalizeEquipment(raw.equipment);
  const instructions = raw.instructions || raw.description || raw.note || raw.descrizione || '';
  const tipo = normalizeTipo(raw.tipo || raw.type || raw.parametri_chiave?.tipo_stimolo);
  const bilateralita = normalizeBilateralita(raw.bilateralita || raw.bilaterality);
  const piano_movimento = normalizePianoMovimento(raw.piano_movimento || raw.movement_plane);
  const catena_cinetica = normalizeCatenaCinetica(raw.catena_cinetica || raw.kinetic_chain);
  const gradi_liberta = typeof raw.gradi_liberta === 'number' ? raw.gradi_liberta : (raw.degrees_of_freedom || 2);

  // Muscoli coinvolti
  const rawMuscles = Array.isArray(raw.muscoli_coinvolti) ? raw.muscoli_coinvolti : (Array.isArray(raw.muscles) ? raw.muscles : []);
  const muscoli_coinvolti: MuscleInvolvement[] = rawMuscles.map((m: any) => ({
    muscolo: String(m.muscolo || m.name || m.muscle || 'Muscolo Target').trim(),
    ruolo: normalizeMuscleRole(m.ruolo || m.role),
    percentuale: Number(m.percentuale || m.percentage || 30),
  }));

  // Esecuzione
  const rawExec = raw.esecuzione || raw.execution || {};
  const esecuzione: ExerciseExecution = {
    setup: Array.isArray(rawExec.setup) && rawExec.setup.length > 0 
      ? rawExec.setup.map((s: any) => String(s).trim()).filter(Boolean) 
      : ['Posiziona il corpo garantendo stabilità articolare e setting posturale corretto.'],
    concentrica: {
      descrizione: String(rawExec.concentrica?.descrizione || rawExec.concentric?.description || 'Esegui la fase di spinta/trazione in modo esplosivo e controllato.').trim(),
      vettore_movimento: String(rawExec.concentrica?.vettore_movimento || rawExec.concentric?.movement_vector || '').trim() || undefined,
      traiettoria: String(rawExec.concentrica?.traiettoria || rawExec.concentric?.trajectory || '').trim() || undefined,
      cues: Array.isArray(rawExec.concentrica?.cues) && rawExec.concentrica.cues.length > 0 
        ? rawExec.concentrica.cues.map((c: any) => String(c).trim()).filter(Boolean) 
        : ['Espira durante la massima contrazione'],
    },
    eccentrica: {
      descrizione: String(rawExec.eccentrica?.descrizione || rawExec.eccentric?.description || 'Ritorna alla posizione di partenza con discesa frenata di 2-3 secondi.').trim(),
      vettore_resistenza: String(rawExec.eccentrica?.vettore_resistenza || rawExec.eccentric?.resistance_vector || '').trim() || undefined,
      cues: Array.isArray(rawExec.eccentrica?.cues) && rawExec.eccentrica.cues.length > 0 
        ? rawExec.eccentrica.cues.map((c: any) => String(c).trim()).filter(Boolean) 
        : ['Inspira e mantieni il controllo articolare'],
    },
  };

  // Parametri chiave
  const rawParams = raw.parametri_chiave || raw.key_parameters || {};
  const parametri_chiave: ExerciseKeyParams = {
    rom: String(rawParams.rom || 'Range of motion fisiologico completo').trim(),
    curva_resistenza: normalizeCurvaResistenza(rawParams.curva_resistenza || rawParams.resistance_curve),
    punto_picco: String(rawParams.punto_picco || rawParams.peak_tension || 'A metà ROM o in massimo allungamento').trim(),
    tipo_stimolo: tipo,
    tut: {
      min: Number(rawParams.tut?.min || 30),
      max: Number(rawParams.tut?.max || 45),
    },
    recupero: {
      min: Number(rawParams.recupero?.min || 60),
      max: Number(rawParams.recupero?.max || 90),
    },
    target_specifico: String(raw.target_specifico || rawParams.target_specifico || '').trim(),
    pattern_movimento: String(raw.pattern_movimento || rawParams.pattern_movimento || '').trim(),
    ruolo_esercizio: (raw.ruolo_esercizio || rawParams.ruolo_esercizio || 'Complementare') as ExerciseRole,
    costo_sistemico: (raw.costo_sistemico || rawParams.costo_sistemico || 'Medio') as SystemicCost,
    livello_difficolta: (raw.livello_difficolta || rawParams.livello_difficolta || 'Intermedio') as ExerciseDifficulty,
    progression_friendly: raw.progression_friendly !== undefined ? Boolean(raw.progression_friendly) : true,
  };

  // Sicurezza
  const rawSafety = raw.sicurezza || raw.safety || {};
  const sicurezza: ExerciseSafety = {
    compensi_da_evitare: Array.isArray(rawSafety.compensi_da_evitare) && rawSafety.compensi_da_evitare.length > 0
      ? rawSafety.compensi_da_evitare.map((c: any) => String(c).trim()).filter(Boolean)
      : ['Perdita dell\'assetto posturale', 'Utilizzo di slanci o inerzia eccessiva'],
    criteri_arresto: Array.isArray(rawSafety.criteri_arresto) && rawSafety.criteri_arresto.length > 0
      ? rawSafety.criteri_arresto.map((c: any) => String(c).trim()).filter(Boolean)
      : ['Dolore articolare acuto', 'Cedimento tecnico della postura'],
    controindicazioni: Array.isArray(rawSafety.controindicazioni) && rawSafety.controindicazioni.length > 0
      ? rawSafety.controindicazioni.map((c: any) => String(c).trim()).filter(Boolean)
      : ['Infiammazioni tendinee in fase acuta'],
    tolleranze: String(rawSafety.tolleranze || rawSafety.tolerances || 'Adattare il carico e l\'escursione in base alla mobilità individuale.').trim(),
  };

  return {
    name,
    category,
    equipment,
    instructions,
    tipo,
    bilateralita,
    piano_movimento,
    catena_cinetica,
    gradi_liberta,
    target_specifico: parametri_chiave.target_specifico,
    pattern_movimento: parametri_chiave.pattern_movimento,
    ruolo_esercizio: parametri_chiave.ruolo_esercizio,
    costo_sistemico: parametri_chiave.costo_sistemico,
    livello_difficolta: parametri_chiave.livello_difficolta,
    progression_friendly: parametri_chiave.progression_friendly,
    parametri_chiave,
    muscoli_coinvolti,
    esecuzione,
    sicurezza,
  };
}

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
Ogni esercizio deve avere TUTTI i campi valorizzati.
Valori consentiti per i campi ENUM:
- category: ["Petto", "Dorso", "Spalle", "Quadricipiti", "Femorali", "Glutei", "Polpacci", "Bicipiti", "Tricipiti", "Avambracci", "Addome", "Core", "Lombari", "Full Body", "Conditioning"]
- equipment: ["Bilanciere", "Manubri", "Macchina", "Cavi", "Corpo Libero", "Multipower", "Kettlebell", "Elastici", "Trap Bar", "Slitta", "Cardio Machine", "Altro"]
- tipo: ["Forza", "Ipertrofia", "Resistenza", "Potenza", "Mobilità", "Condizionamento"]
- bilateralita: ["Bilaterale", "Unilaterale", "Alternato"]
- piano_movimento: ["Sagittale", "Frontale (scapolare)", "Frontale", "Trasverso", "Multi-piano"]
- catena_cinetica: ["Aperta", "Chiusa", "Mista"]
- curva_resistenza: ["Gravità (costante)", "Ascendente", "Discendente", "Parabolica", "Variabile (cam)", "Costante (cavi)"]
`.trim();

  const userPrompt = `
Genera ${count} esercizi per la libreria.
${params.category && params.category !== 'Tutti' ? `- Categoria Principale: ${params.category}` : '- Distribuisci in modo bilanciato'}
${params.equipmentFilter ? `- Attrezzatura specifica: ${params.equipmentFilter}` : ''}
${params.customPrompt ? `- Indicazioni aggiuntive: ${params.customPrompt}` : ''}

Per ogni esercizio fornisci:
{
  "name": "Nome Esercizio",
  "category": "Petto",
  "equipment": "Manubri",
  "instructions": "Istruzioni rapide ed efficaci per l'atleta...",
  "tipo": "Ipertrofia",
  "bilateralita": "Bilaterale",
  "piano_movimento": "Trasverso",
  "catena_cinetica": "Aperta",
  "gradi_liberta": 2,
  "muscoli_coinvolti": [{"muscolo": "Gran Pettorale", "ruolo": "Target", "percentuale": 60}],
  "esecuzione": {
    "setup": ["Punto 1", "Punto 2"],
    "concentrica": {"descrizione": "...", "vettore_movimento": "...", "cues": ["..."]},
    "eccentrica": {"descrizione": "...", "vettore_resistenza": "...", "cues": ["..."]}
  },
  "parametri_chiave": {
    "rom": "Completo",
    "curva_resistenza": "Gravità (costante)",
    "punto_picco": "Allungamento",
    "tipo_stimolo": "Ipertrofia",
    "tut": {"min": 30, "max": 45},
    "recupero": {"min": 60, "max": 90}
  },
  "sicurezza": {
    "compensi_da_evitare": ["..."],
    "criteri_arresto": ["..."],
    "controindicazioni": ["..."],
    "tolleranze": "..."
  }
}

Restituisci SOLO un array JSON [ {...} ] o un oggetto { "exercises": [ {...} ] }.
`.trim();

  try {
    const genResult = await generateContentWithGemini({
      provider: AI_CONFIG.DEFAULT_PROVIDER,
      systemPrompt,
      userPrompt,
      temperature: 0.5,
      maxTokens: 8192,
      responseMimeType: 'application/json',
    });

    let rawText = genResult.text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(rawText);

    const list = Array.isArray(parsed) ? parsed : (parsed.exercises || []);
    return list.map((item: any) => sanitizeGeneratedExercise(item, 'Esercizio'));
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Errore durante la generazione degli esercizi con l'IA.";
    console.error('Errore generazione esercizi IA:', err);
    throw new Error(errorMessage);
  }
}

// ─── Funzione "Compila con IA" — Suggerimento per singolo esercizio ────────────

export async function suggestExerciseWithAI(
  name: string,
  category?: string,
  equipment?: string
): Promise<GeneratedAIExercise> {

  const systemPrompt = `
Sei un esperto di Biomeccanica, Chinesiologia e Metodologia dell'Allenamento di livello accademico.
Il tuo compito è compilare una scheda tecnica COMPLETA e CLINICAMENTE PRECISA al 100% per UN SINGOLO esercizio.
Tutti i campi devono essere compilati con valori validi e pertinenti. Non omettere nessun campo.

Valori ammessi per i campi categorici:
- category: ["Petto", "Dorso", "Spalle", "Quadricipiti", "Femorali", "Glutei", "Polpacci", "Bicipiti", "Tricipiti", "Avambracci", "Addome", "Core", "Lombari", "Full Body", "Conditioning"]
- equipment: ["Bilanciere", "Manubri", "Macchina", "Cavi", "Corpo Libero", "Multipower", "Kettlebell", "Elastici", "Trap Bar", "Slitta", "Cardio Machine", "Altro"]
- tipo: ["Forza", "Ipertrofia", "Resistenza", "Potenza", "Mobilità", "Condizionamento"]
- bilateralita: ["Bilaterale", "Unilaterale", "Alternato"]
- piano_movimento: ["Sagittale", "Frontale (scapolare)", "Frontale", "Trasverso", "Multi-piano"]
- catena_cinetica: ["Aperta", "Chiusa", "Mista"]
- curva_resistenza: ["Gravità (costante)", "Ascendente", "Discendente", "Parabolica", "Variabile (cam)", "Costante (cavi)"]
`.trim();

  const userPrompt = `
Compila la scheda tecnica completa al 100% per l'esercizio: "${name}"
${category ? `- Categoria suggerita: ${category}` : ''}
${equipment ? `- Attrezzatura: ${equipment}` : ''}

Struttura JSON ESATTA richiesta (oggetto singolo):
{
  "name": "${name}",
  "category": "Petto",
  "equipment": "Manubri",
  "instructions": "Descrizione chiara e sintetica dell'esercizio con consigli tecnici per l'atleta (almeno 2-3 frasi).",
  "tipo": "Ipertrofia",
  "bilateralita": "Bilaterale",
  "piano_movimento": "Trasverso",
  "catena_cinetica": "Aperta",
  "gradi_liberta": 2,
  "target_specifico": "Fascio sternocostale gran pettorale",
  "pattern_movimento": "Adduzione orizzontale dell'omero",
  "ruolo_esercizio": "Isolamento",
  "costo_sistemico": "Basso",
  "livello_difficolta": "Intermedio",
  "muscoli_coinvolti": [
    {"muscolo": "Gran Pettorale", "ruolo": "Target", "percentuale": 65},
    {"muscolo": "Deltoide Anteriore", "ruolo": "Sinergico", "percentuale": 20},
    {"muscolo": "Bicipite Brachiale (capo breve)", "ruolo": "Stabilizzatore", "percentuale": 10},
    {"muscolo": "Coracobrachiale", "ruolo": "Sinergico", "percentuale": 5}
  ],
  "esecuzione": {
    "setup": [
      "Sdraiati supino sulla panca piana con piedi ben saldi a terra e glutei aderenti",
      "Impugna i manubri con presa neutra (palmi rivolti l'uno verso l'altro)",
      "Retrai e deprimi le scapole per aprire la cassa toracica"
    ],
    "concentrica": {
      "descrizione": "Adduci le braccia compiendo un arco verso l'alto fino a portare i manubri sopra il petto senza farli toccare.",
      "vettore_movimento": "Craniale e mediale",
      "traiettoria": "Arco sul piano trasverso",
      "cues": ["Chiudi stringendo il petto", "Mantieni i gomiti con angolo costante di 15-20°"]
    },
    "eccentrica": {
      "descrizione": "Apri le braccia controllando la discesa per 3 secondi fino ad avvertire un moderato allungamento sul pettorale.",
      "vettore_resistenza": "Gravità verso il basso",
      "cues": ["Apri il torace durante la discesa", "Frena il carico senza far scendere i gomiti sotto il livello della panca"]
    }
  },
  "parametri_chiave": {
    "rom": "Completo fino al piano del tronco senza iperestensione omerale",
    "curva_resistenza": "Gravità (costante)",
    "punto_picco": "In massimo allungamento a braccia aperte",
    "tipo_stimolo": "Ipertrofia",
    "tut": {"min": 35, "max": 50},
    "recupero": {"min": 60, "max": 90}
  },
  "sicurezza": {
    "compensi_da_evitare": [
      "Eccessivo inarcamento lombare durante il punto di massimo carico",
      "Estensione o flessione eccessiva dei gomiti trasformando l'esercizio in una distensione",
      "Perdita dell'assetto scapolare con anteriorizzazione delle spalle"
    ],
    "criteri_arresto": [
      "Dolore o pizzicore anteriore alla capsula gleno-omerale",
      "Incapacità di frenare la discesa eccentrica in sicurezza"
    ],
    "controindicazioni": [
      "Instabilità anteriore di spalla o sindrome da conflitto sub-acromiale in fase acuta"
    ],
    "tolleranze": "Limitare il ROM terminale in soggetti con lassità legamentosa anteriore."
  }
}

Restituisci SOLO l'oggetto JSON.
`.trim();

  try {
    const genResult = await generateContentWithGemini({
      provider: AI_CONFIG.DEFAULT_PROVIDER,
      systemPrompt,
      userPrompt,
      temperature: 0.3,
      maxTokens: 8192,
      responseMimeType: 'application/json',
    });

    let rawText = genResult.text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(rawText);
    return sanitizeGeneratedExercise(parsed, name);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Errore durante la generazione del suggerimento IA.";
    throw new Error(msg);
  }
}



