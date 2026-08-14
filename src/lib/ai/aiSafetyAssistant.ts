import { Athlete } from '../../types';
import { WorkoutExercise, WorkoutTemplate } from '../../types/workout';
import { ExerciseItem } from '../../types/exercise';
import { supabase } from '../supabase';

export interface SafetyWarning {
  id: string;
  exerciseName: string;
  riskLevel: 'high' | 'medium' | 'low';
  reason: string;
  athleteCondition: string;
  suggestedAlternatives: string[];
}

export interface CoachChatMessage {
  id: string;
  sender: 'coach' | 'assistant';
  text: string;
  timestamp: string;
  warnings?: SafetyWarning[];
}

export interface SafetyAnalysisParams {
  athlete?: Athlete | null;
  exercises: Partial<WorkoutExercise>[];
  coachExercises: ExerciseItem[];
  provider: 'openai' | 'gemini';
}

/**
 * Analizza la sicurezza degli esercizi inseriti rispetto al profilo sanitario dell'atleta.
 */
export async function analyzeWorkoutSafety(params: SafetyAnalysisParams): Promise<SafetyWarning[]> {
  const { athlete, exercises, coachExercises, provider } = params;

  // Se non c'è atleta o l'atleta non ha note mediche/infortuni/limitazioni né note coach, restituisci vuoto
  if (!athlete) return [];

  const athleteConditions = [
    athlete.medicalNotes ? `Note Mediche/Infortuni: ${athlete.medicalNotes}` : '',
    athlete.notes ? `Note Coach: ${athlete.notes}` : '',
    athlete.goals ? `Obiettivi: ${athlete.goals}` : ''
  ].filter(Boolean).join('\n');

  if (!athleteConditions.trim()) return [];

  const validExercises = exercises.filter(e => e.name && e.name.trim().length > 0);
  if (validExercises.length === 0) return [];

  try {
    const exerciseNames = validExercises.map(e => e.name).join(', ');
    const libraryNames = coachExercises.map(e => e.name).join(', ');
    const systemPrompt = `
Sei un esperto di Chinesiologia, Fisioterapia e Sicurezza dell'Allenamento.
Analizza la seguente lista di esercizi impostati per l'atleta e confrontala con le sue note mediche, infortuni e limitazioni fisiche.

Dati Atleta:
- Nome: ${athlete.firstName} ${athlete.lastName}
${athleteConditions}

Libreria Esercizi Preferiti del Coach: [${libraryNames}]

Esercizi Inseriti nella Scheda: [${exerciseNames}]

Compito:
Identifica eventuali esercizio o movimento a rischio o controindicato per le condizioni fisiche dell'atleta.
Restituisci ESCLUSIVAMENTE un oggetto JSON valido con la seguente struttura:
{
  "warnings": [
    {
      "exerciseName": "Nome esatto dell'esercizio a rischio",
      "riskLevel": "high" | "medium" | "low",
      "reason": "Spiegazione sintetica del rischio clinico/biomeccanico",
      "athleteCondition": "La condizione/infortunio rilevato",
      "suggestedAlternatives": ["Alternativa sicura 1", "Alternativa sicura 2"]
    }
  ]
}
Se non ci sono infortuni o tutti gli esercizi sono sicuri, restituisci {"warnings": []}.
`;

    const { data, error } = await supabase.functions.invoke('generate-workout', {
      body: {
        provider: provider,
        systemPrompt: systemPrompt,
        userPrompt: "Analizza questa scheda e restituisci SOLO un JSON valido.",
        model: provider === 'openai' ? 'gpt-4o' : 'gemini-1.5-pro',
        maxTokens: 2048,
        temperature: 0.2,
        responseFormat: { type: 'json_object' }
      }
    });

    if (error || !data || !data.text) {
      console.warn("Nessuna risposta o errore Edge Function per safety.");
      return [];
    }

    let rawText = data.text.replace(/```json/gi, '').replace(/```/gi, '').trim();
    const parsed = JSON.parse(rawText);
    const warnings: SafetyWarning[] = (parsed.warnings || []).map((w: any, index: number) => ({
      id: `warn-${Date.now()}-${index}`,
      exerciseName: w.exerciseName || '',
      riskLevel: w.riskLevel || 'medium',
      reason: w.reason || '',
      athleteCondition: w.athleteCondition || '',
      suggestedAlternatives: w.suggestedAlternatives || []
    }));

    return warnings;

  } catch (err) {
    console.error("Errore analisi sicurezza IA:", err);
    return [];
  }
}

/**
 * Chat interattiva con l'Assistente IA del Coach.
 */
export async function askCoachAIAssistant(
  userText: string,
  athlete: Athlete | null | undefined,
  exercises: Partial<WorkoutExercise>[],
  coachExercises: ExerciseItem[],
  provider: 'openai' | 'gemini'
): Promise<string> {
  const athleteContext = athlete ? `
Atleta Attuale: ${athlete.firstName} ${athlete.lastName}
Obiettivi: ${athlete.goals || 'Non specificati'}
Note Mediche / Infortuni: ${athlete.medicalNotes || 'Nessuna'}
Note Coach: ${athlete.notes || 'Nessuna'}
` : 'Nessun atleta specifico selezionato (Template Generico).';

  const exercisesList = exercises.map(e => `- ${e.name} (${e.sets || 3}x${e.reps_target || '10'}, rec: ${e.rest_seconds || 60}s)`).join('\n');
  const libraryNames = coachExercises.map(e => e.name).join(', ');

  const systemPrompt = `
Sei l'Assistente IA Co-Pilot personale del Coach. Il tuo obiettivo è aiutare il coach a programmare allenamenti perfetti, prevenire infortuni e rispondere a qualsiasi dubbio metodologico o tecnico sugli esercizi.

Contesto Corrente:
${athleteContext}

Esercizi attualmente presenti nella scheda:
${exercisesList || 'Nessun esercizio inserito.'}

Libreria Esercizi Preferiti Coach:
[${libraryNames || 'Libreria generale'}]

Regole di Risposta:
- Rispondi in modo professionale, amichevole, diretto e conciso in italiano.
- Se ti viene chiesto un consiglio su un esercizio o una sostituzione per infortunio, proponi alternative sicure attingendo possibilmente dalla libreria preferita del coach.
- Se l'utente usa "@" o cita un programma/esercizio, fai riferimento specifico al contesto della scheda.
`;

  try {
    const { data, error } = await supabase.functions.invoke('generate-workout', {
      body: {
        provider: provider,
        systemPrompt: systemPrompt,
        userPrompt: userText,
        model: provider === 'openai' ? 'gpt-4o' : 'gemini-1.5-pro',
        maxTokens: 2048,
        temperature: 0.7,
      }
    });

    if (error) {
      throw new Error(`Errore Server: ${error.message}`);
    }

    if (!data || !data.text) {
      return "Scusa, non sono riuscito a elaborare una risposta.";
    }

    return data.text;
  } catch (err: any) {
    console.error("Errore Coach AI Assistant:", err);
    throw new Error(err.message || "Errore durante la comunicazione con l'Assistente IA.");
  }
}

/**
 * Chat Globale dell'Assistente IA del Coach con accesso a TUTTO il database atleti e schede.
 */
export async function askGlobalCoachAIAssistant(params: {
  userText: string;
  allAthletes: Athlete[];
  allWorkouts?: WorkoutTemplate[];
  coachExercises: ExerciseItem[];
  selectedAthleteId?: string;
  provider: 'openai' | 'gemini';
}): Promise<string> {
  const { userText, allAthletes, allWorkouts = [], coachExercises, selectedAthleteId, provider } = params;

  // Costruisci il sommario strutturato di tutti gli atleti nel database
  const athletesSummary = allAthletes.map(a => {
    return `- ${a.firstName} ${a.lastName} (ID: ${a.id}) | Stato: ${a.status} | Obiettivi: ${a.goals || 'Non specificato'} | Note Mediche/Infortuni: ${a.medicalNotes || 'Nessuna'} | Note Coach: ${a.notes || 'Nessuna'} | Livello: ${a.tags?.join(', ') || 'N/D'}`;
  }).join('\n');

  const workoutsSummary = allWorkouts.slice(0, 20).map(w => {
    return `- ${w.title} (${w.total_weeks || 1} sett.) | ${w.description || 'Nessuna descrizione'}`;
  }).join('\n');

  const exerciseLibraryNames = coachExercises.map(e => e.name).slice(0, 50).join(', ');

  const selectedAthlete = allAthletes.find(a => a.id === selectedAthleteId);
  const focusContext = selectedAthlete 
    ? `\nFOCUS ATLETA SELEZIONATO:\n- ${selectedAthlete.firstName} ${selectedAthlete.lastName}\n- Obiettivi: ${selectedAthlete.goals || 'N/D'}\n- Note Mediche: ${selectedAthlete.medicalNotes || 'Nessuna'}\n- Note Coach: ${selectedAthlete.notes || 'Nessuna'}\n`
    : '\nNessun atleta singolo in focus; stai operando sull\'intero database atleti.\n';

  const systemPrompt = `
Sei l'Assistente IA Co-Pilot Globale del Coach per la piattaforma Builder Athlete Manager.
Hai accesso completo a tutti i dati degli atleti, alle schede di allenamento e alla libreria esercizi.

DATABASE ATLETI COMPLETO (${allAthletes.length} Atleti Registrati):
${athletesSummary || 'Nessun atleta presente a sistema.'}

FOCUS CORRENTE:
${focusContext}

SOMMARIO SCHEDE RECENTI:
${workoutsSummary || 'Nessuna scheda presente.'}

LIBRERIA ESERCIZI DEL COACH:
${exerciseLibraryNames || 'Generale'}

Il tuo ruolo:
1. Rispondi con massima precisione, professionalità e tono amichevole e diretto in italiano.
2. Puoi analizzare e confrontare gli atleti, trovare chi ha infortuni (es. dolori alle ginocchia, spalle, schiena), suggerire schede o identificare incompatibilità.
3. Se il coach ti chiede informazioni su un atleta specifico o su una lista di atleti, estrai i dati reali dal contesto sopra indicato.
4. Mantieni le risposte ben strutturate, evidenziando i nomi in grassetto e usando elenchi puntati dove opportuno.
`;

  try {
    const { data, error } = await supabase.functions.invoke('generate-workout', {
      body: {
        provider: provider,
        systemPrompt: systemPrompt,
        userPrompt: userText,
        model: provider === 'openai' ? 'gpt-4o' : 'gemini-1.5-pro',
        maxTokens: 2048,
        temperature: 0.6,
      }
    });

    if (error) {
      throw new Error(`Errore Server: ${error.message}`);
    }

    if (!data || !data.text) {
      return "Scusa, non sono riuscito a elaborare una risposta.";
    }

    return data.text;
  } catch (err: any) {
    console.error("Errore Global Coach AI Assistant:", err);
    throw new Error(err.message || "Errore nella comunicazione con l'Assistente IA.");
  }
}
