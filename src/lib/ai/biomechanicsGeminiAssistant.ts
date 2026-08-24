/**
 * BIOMECHANICS & KINESIOLOGY AI ENGINE — GOOGLE GEMINI 3.7 FLASH
 * 
 * Motore avanzato per l'ottimizzazione e generazione clinico-biomeccanica
 * degli esercizi della libreria Coach AC Training.
 */

import {
  ExerciseCategory,
  ExerciseEquipment,
  ExerciseType,
  Bilaterality,
  MovementPlane,
  KineticChain,
  MuscleInvolvement,
  ExerciseRole,
  SystemicCost,
  ExerciseDifficulty,
  ExerciseExecution,
  ExerciseKeyParams,
  ExerciseSafety
} from '../../types/exercise';
import { AI_CONFIG } from '../../config/aiConfig';
import { generateContentWithGemini } from './geminiClient';
import {
  normalizeCategory,
  normalizeEquipment,
  normalizeTipo,
  normalizeBilateralita,
  normalizePianoMovimento,
  normalizeCatenaCinetica,
  normalizeCurvaResistenza,
  normalizeMuscleRole
} from './aiExerciseGenerator';

export interface OptimizedBiomechanicsResult {
  name: string;
  category: ExerciseCategory;
  equipment: ExerciseEquipment;
  pattern_movimento: string;
  target_specifico: string;
  instructions: string;
  tipo: ExerciseType;
  bilateralita: Bilaterality;
  piano_movimento: MovementPlane;
  catena_cinetica: KineticChain;
  gradi_liberta: number;
  ruolo_esercizio: ExerciseRole;
  costo_sistemico: SystemicCost;
  livello_difficolta: ExerciseDifficulty;
  muscoli_coinvolti: MuscleInvolvement[];
  esecuzione: ExerciseExecution;
  parametri_chiave: ExerciseKeyParams;
  sicurezza: ExerciseSafety;
  modelUsed?: string;
}

/**
 * Recupera la chiave API Gemini:
 * 1. Parametro esplicito
 * 2. localStorage ('gemini_api_key' o 'builder_gemini_api_key')
 * 3. Variabile d'ambiente Vite
 */
export function getActiveGeminiApiKey(customKey?: string): string {
  if (customKey && customKey.trim().length > 5) return customKey.trim();

  if (typeof window !== 'undefined') {
    const localKey = localStorage.getItem('gemini_api_key') || localStorage.getItem('builder_gemini_api_key');
    if (localKey && localKey.trim().length > 5) return localKey.trim();
  }

  const envKey = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined);
  if (envKey && envKey.trim().length > 5) return envKey.trim();

  return '';
}

/**
 * Salva la chiave API Gemini nel localStorage del browser
 */
export function saveGeminiApiKey(key: string): void {
  if (typeof window !== 'undefined') {
    const trimmed = key.trim();
    if (trimmed) {
      localStorage.setItem('gemini_api_key', trimmed);
      localStorage.setItem('builder_gemini_api_key', trimmed);
    } else {
      localStorage.removeItem('gemini_api_key');
      localStorage.removeItem('builder_gemini_api_key');
    }
  }
}

/**
 * Chiamata diretta REST all'API Google Gemini 3.7 Flash
 */
async function callDirectGeminiAPI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  modelName: string = 'gemini-3.7-flash'
): Promise<{ text: string; model: string }> {
  const modelsToTry = [
    modelName,
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-2.5-flash',
    'gemini-1.5-flash'
  ].filter((m, idx, arr) => arr.indexOf(m) === idx);

  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: userPrompt }]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 8192,
            responseMimeType: 'application/json'
          }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        if (response.status === 404 && (errText.includes('not found') || errText.includes('no longer available'))) {
          console.warn(`[Gemini API] Modello ${model} non disponibile, passo al successivo...`);
          continue;
        }
        throw new Error(`Errore API Gemini (${response.status}): ${errText}`);
      }

      const resData = await response.json();
      const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error('Nessun contenuto testuale restituito da Gemini.');

      return { text: rawText, model };
    } catch (err: any) {
      lastError = err;
      if (err.message && err.message.includes('404')) {
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error('Nessun modello Gemini ha risposto.');
}

/**
 * Ottimizza e rigenera la scheda biomeccanica completa di un esercizio con Google Gemini 3.7 Flash
 */
export async function optimizeExerciseBiomechanicsWithGemini(
  exerciseName: string,
  options?: {
    currentCategory?: string;
    currentEquipment?: string;
    customApiKey?: string;
    specificNotes?: string;
  }
): Promise<OptimizedBiomechanicsResult> {
  const apiKey = getActiveGeminiApiKey(options?.customApiKey);

  const systemPrompt = `
Sei il Capo Dipartimento di Biomeccanica, Chinesiologia e Fisiologia Muscolare Applicata di AC Training.
Il tuo compito è generare o revisionare l'analisi biomeccanica completa, rigorosa e scientificamente ineccepibile per l'esercizio indicato.

REGOLE TASSATIVE DI BIOMECCANICA:
1. DISTINZIONE RIGOROSA PETTO / DORSO / SPALLE:
   - Esercizi di tirata verticale (Lat Machine, Trazioni, Pulldown) o tirata orizzontale (Pulley, Rematori, Row) hanno come target PRIMARIO il Gran Dorsale e Trapezi, MAI il gran pettorale.
   - Esercizi di spinta orizzontale (Panca, Push-up, Chest Press) hanno come target il Gran Pettorale.
   - Esercizi di spinta verticale (Military, OHP, Shoulder Press) hanno come target i Deltoidi Anteriori/Laterali.
   - Il Plank e gli esercizi isometrici di tenuta hanno come pattern "Anti-Estensione / Hold Isometrico Core" e coinvolgono il Retto dell'Addome, Obliqui e Trasverso come stabilizzatori/target senza fasi concentriche/eccentriche dinamiche articolari.
2. MUSCOLI COINVOLTI:
   - Assegna percentuali realistiche di attivazione elettromiografica (EMG stimata, totale target attorno a 70-95%, stabilizzatori e sinergici 20-55%).
   - Specifica il ruolo esatto: "Target", "Sinergico", "Stabilizzatore", "Motore dinamico".
3. VETTORI E CURVA DI RESISTENZA:
   - Specifica se la resistenza è Gravitazionale (costante/variabile con braccio di leva), Cavi (costante orientata), Cam/Macchina o Elastica.
4. CUES VERBALI & COMPENSI:
   - Fornisci indicazioni verbali d'impatto ("Spingi il pavimento", "Scapole in tasca", "Gomiti a 45°").
   - Elenca gli errori/compensi biomeccanici più frequenti che disperdono la tensione o creano stress articolare.

Valori categorici rigorosi:
- category: ["Petto", "Dorso", "Spalle", "Quadricipiti", "Femorali", "Glutei", "Polpacci", "Bicipiti", "Tricipiti", "Avambracci", "Addome", "Core", "Lombari", "Full Body", "Conditioning"]
- equipment: ["Bilanciere", "Manubri", "Macchina", "Cavi", "Corpo Libero", "Multipower", "Kettlebell", "Elastici", "Trap Bar", "Slitta", "Cardio Machine", "Altro"]
- tipo: ["Forza", "Ipertrofia", "Resistenza", "Potenza", "Mobilità", "Condizionamento"]
- bilateralita: ["Bilaterale", "Unilaterale", "Alternato"]
- piano_movimento: ["Sagittale", "Frontale (scapolare)", "Frontale", "Trasverso", "Multi-piano"]
- catena_cinetica: ["Aperta", "Chiusa", "Mista"]
- curva_resistenza: ["Gravità (costante)", "Ascendente", "Discendente", "Parabolica", "Variabile (cam)", "Costante (cavi)"]
`.trim();

  const userPrompt = `
Esegui l'analisi biomeccanica scientifica completa per l'esercizio: "${exerciseName}".
${options?.currentCategory ? `- Categoria indicata: ${options.currentCategory}` : ''}
${options?.currentEquipment ? `- Attrezzatura indicata: ${options.currentEquipment}` : ''}
${options?.specificNotes ? `- Note/Focus richiesto dal Coach: ${options.specificNotes}` : ''}

Restituisci unicamente il JSON conforme alla seguente interfaccia:
{
  "name": "${exerciseName}",
  "category": "Petto",
  "equipment": "Bilanciere",
  "pattern_movimento": "Spinta Orizzontale",
  "target_specifico": "Fascio sternocostale gran pettorale",
  "instructions": "Descrizione chiara ed esaustiva della tecnica ideale in 2-3 frasi.",
  "tipo": "Ipertrofia",
  "bilateralita": "Bilaterale",
  "piano_movimento": "Trasverso",
  "catena_cinetica": "Aperta",
  "gradi_liberta": 2,
  "ruolo_esercizio": "Fondamentale",
  "costo_sistemico": "Alto",
  "livello_difficolta": "Intermedio",
  "muscoli_coinvolti": [
    {"muscolo": "Gran Pettorale", "ruolo": "Target", "percentuale": 85},
    {"muscolo": "Deltoide Anteriore", "ruolo": "Sinergico", "percentuale": 50},
    {"muscolo": "Tricipite Brachiale", "ruolo": "Sinergico", "percentuale": 45}
  ],
  "esecuzione": {
    "setup": [
      "Punti di contatto stabili: piedi a terra, glutei e scapole a contatto con il supporto",
      "Scapole addotte e depresse con cassa toracica aperta"
    ],
    "concentrica": {
      "descrizione": "Spinta potente lungo la traiettoria ideale senza perdere l'assetto scapolare.",
      "vettore_movimento": "Spinta verso l'alto / craniale",
      "traiettoria": "Curva a J o rettilinea conforme alla leva",
      "cues": ["Spingi via il pavimento", "Spremi il muscolo target"]
    },
    "eccentrica": {
      "descrizione": "Discesa controllata in 2-3 secondi mantenendo la tensione attiva.",
      "vettore_resistenza": "Gravità",
      "cues": ["Controlla la discesa", "Apri il torace"]
    }
  },
  "parametri_chiave": {
    "rom": "Completo con escursione attiva fisiologica",
    "curva_resistenza": "Gravità (costante)",
    "punto_picco": "Punto di massima contrazione / massimo allungamento",
    "tipo_stimolo": "Ipertrofia",
    "tut": {"min": 30, "max": 50},
    "recupero": {"min": 90, "max": 180}
  },
  "sicurezza": {
    "compensi_da_evitare": [
      "Perdita di neutralità della colonna",
      "Gomiti o ginocchia che collassano fuori asse",
      "Slancio o rimbalzo balistico sul fondo del movimento"
    ],
    "criteri_arresto": [
      "Incapacità di mantenere la velocità e tecnica corretta (RPE 10 / cedimento tecnico)",
      "Dolore articolare o pizzicore capsulare"
    ],
    "controindicazioni": [
      "Patologie o infiammazioni acute a carico delle articolazioni coinvolte"
    ],
    "tolleranze": "Adattare la larghezza della presa o il ROM alla mobilità soggettiva dell'atleta."
  }
}
`.trim();

  let rawJson = '';
  let modelUsed = 'gemini-3.7-flash';

  if (apiKey) {
    // Chiamata diretta con chiave Gemini dell'utente / coach
    const res = await callDirectGeminiAPI(apiKey, systemPrompt, userPrompt, 'gemini-3.7-flash');
    rawJson = res.text;
    modelUsed = res.model;
  } else {
    // Chiamata centralizzata tramite Edge Function
    const genResult = await generateContentWithGemini({
      provider: AI_CONFIG.DEFAULT_PROVIDER,
      systemPrompt,
      userPrompt,
      temperature: 0.2,
      maxTokens: 8192,
      responseMimeType: 'application/json'
    });
    rawJson = genResult.text;
    modelUsed = genResult.model;
  }

  // Pulizia e parsing robusto
  const cleanJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
  const parsed = JSON.parse(cleanJson);

  // Normalizzazione e validazione schema
  const muscoliNormalized: MuscleInvolvement[] = Array.isArray(parsed.muscoli_coinvolti)
    ? parsed.muscoli_coinvolti.map((m: any) => ({
        muscolo: String(m.muscolo || 'Muscolo'),
        ruolo: normalizeMuscleRole(m.ruolo),
        percentuale: typeof m.percentuale === 'number' ? Math.min(100, Math.max(5, m.percentuale)) : 50
      }))
    : [
        { muscolo: 'Gran Dorsale', ruolo: 'Target', percentuale: 80 },
        { muscolo: 'Bicipite Brachiale', ruolo: 'Sinergico', percentuale: 45 }
      ];

  const result: OptimizedBiomechanicsResult = {
    name: String(parsed.name || exerciseName),
    category: normalizeCategory(parsed.category),
    equipment: normalizeEquipment(parsed.equipment),
    pattern_movimento: String(parsed.pattern_movimento || 'Movimento Composto'),
    target_specifico: String(parsed.target_specifico || parsed.category || ''),
    instructions: String(parsed.instructions || ''),
    tipo: normalizeTipo(parsed.tipo),
    bilateralita: normalizeBilateralita(parsed.bilateralita),
    piano_movimento: normalizePianoMovimento(parsed.piano_movimento),
    catena_cinetica: normalizeCatenaCinetica(parsed.catena_cinetica),
    gradi_liberta: typeof parsed.gradi_liberta === 'number' ? parsed.gradi_liberta : 2,
    ruolo_esercizio: (['Fondamentale', 'Complementare', 'Isolamento', 'Tecnico', 'Prehab / Riabilitativo'].includes(parsed.ruolo_esercizio)
      ? parsed.ruolo_esercizio
      : 'Complementare') as ExerciseRole,
    costo_sistemico: (['Molto Alto', 'Alto', 'Medio', 'Basso', 'Molto Basso'].includes(parsed.costo_sistemico)
      ? parsed.costo_sistemico
      : 'Medio') as SystemicCost,
    livello_difficolta: (['Principiante', 'Intermedio', 'Avanzato'].includes(parsed.livello_difficolta)
      ? parsed.livello_difficolta
      : 'Intermedio') as ExerciseDifficulty,
    muscoli_coinvolti: muscoliNormalized,
    esecuzione: {
      setup: Array.isArray(parsed.esecuzione?.setup) ? parsed.esecuzione.setup.filter(Boolean) : ['Posizionati con assetto neutro'],
      concentrica: {
        descrizione: String(parsed.esecuzione?.concentrica?.descrizione || ''),
        vettore_movimento: String(parsed.esecuzione?.concentrica?.vettore_movimento || ''),
        traiettoria: String(parsed.esecuzione?.concentrica?.traiettoria || ''),
        cues: Array.isArray(parsed.esecuzione?.concentrica?.cues) ? parsed.esecuzione.concentrica.cues.filter(Boolean) : []
      },
      eccentrica: {
        descrizione: String(parsed.esecuzione?.eccentrica?.descrizione || ''),
        vettore_resistenza: String(parsed.esecuzione?.eccentrica?.vettore_resistenza || ''),
        cues: Array.isArray(parsed.esecuzione?.eccentrica?.cues) ? parsed.esecuzione.eccentrica.cues.filter(Boolean) : []
      }
    },
    parametri_chiave: {
      rom: String(parsed.parametri_chiave?.rom || 'ROM completo fisiologico'),
      curva_resistenza: normalizeCurvaResistenza(parsed.parametri_chiave?.curva_resistenza),
      punto_picco: String(parsed.parametri_chiave?.punto_picco || 'Picco di contrazione'),
      tipo_stimolo: normalizeTipo(parsed.parametri_chiave?.tipo_stimolo),
      tut: {
        min: Number(parsed.parametri_chiave?.tut?.min || 30),
        max: Number(parsed.parametri_chiave?.tut?.max || 45)
      },
      recupero: {
        min: Number(parsed.parametri_chiave?.recupero?.min || 60),
        max: Number(parsed.parametri_chiave?.recupero?.max || 120)
      }
    },
    sicurezza: {
      compensi_da_evitare: Array.isArray(parsed.sicurezza?.compensi_da_evitare)
        ? parsed.sicurezza.compensi_da_evitare.filter(Boolean)
        : ['Evitare compensi lombari'],
      criteri_arresto: Array.isArray(parsed.sicurezza?.criteri_arresto)
        ? parsed.sicurezza.criteri_arresto.filter(Boolean)
        : ['Cedimento tecnico'],
      controindicazioni: Array.isArray(parsed.sicurezza?.controindicazioni)
        ? parsed.sicurezza.controindicazioni.filter(Boolean)
        : [],
      tolleranze: String(parsed.sicurezza?.tolleranze || '')
    },
    modelUsed
  };

  return result;
}
