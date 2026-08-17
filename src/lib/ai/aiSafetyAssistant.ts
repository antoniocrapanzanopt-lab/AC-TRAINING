import { Athlete } from '../../types';
import { WorkoutExercise, WorkoutTemplate } from '../../types/workout';
import { ExerciseItem } from '../../types/exercise';
import { supabase } from '../supabase';
import { generateContentWithGemini } from './geminiClient';

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

    const genResult = await generateContentWithGemini({
      provider: provider,
      systemPrompt: systemPrompt,
      userPrompt: "Analizza questa scheda e restituisci SOLO un JSON valido.",
      model: provider === 'openai' ? 'gpt-4o' : 'gemini-1.5-pro',
      maxTokens: 2048,
      temperature: 0.2,
      responseMimeType: 'application/json'
    });

    if (!genResult || !genResult.text) {
      console.warn("Nessuna risposta o errore Edge Function per safety.");
      return [];
    }

    let rawText = genResult.text.replace(/```json/gi, '').replace(/```/gi, '').trim();
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

  const selectedAthlete = allAthletes.find(a => a.id === selectedAthleteId);

  const selectedAthleteSection = selectedAthlete ? `
<selected_athlete>
NOME: ${selectedAthlete.firstName} ${selectedAthlete.lastName}
ID: ${selectedAthlete.id}
STATO: ${selectedAthlete.status}
STATO PAGAMENTO: ${selectedAthlete.paymentStatus}
OBIETTIVI: ${selectedAthlete.goals || 'Non specificato'}
NOTE MEDICHE / FASTIDI / INFORTUNI: ${selectedAthlete.medicalNotes || 'Nessun infortunio o fastidio segnalato'}
NOTE COACH: ${selectedAthlete.notes || 'Nessuna nota coach'}
LIVELLO / TAGS: ${selectedAthlete.tags?.join(', ') || 'N/D'}
SCADENZA CERTIFICATO MEDICO: ${selectedAthlete.medicalCertificateExpiryDate || 'Dato non presente'}
DATA REGISTRAZIONE: ${selectedAthlete.createdAt || 'N/D'}
</selected_athlete>
` : `
<selected_athlete>
null (Nessun atleta selezionato. Il contesto attivo è il team/database globale).
</selected_athlete>
`;

  const athletesSummary = allAthletes.map(a => {
    return `- ${a.firstName} ${a.lastName} (ID: ${a.id}) | Stato: ${a.status} | Pagamento: ${a.paymentStatus} | Obiettivi: ${a.goals || 'Non specificato'} | Note Mediche/Infortuni: ${a.medicalNotes || 'Nessuna'} | Note Coach: ${a.notes || 'Nessuna'} | Livello: ${a.tags?.join(', ') || 'N/D'}`;
  }).join('\n');

  const workoutsSummary = allWorkouts.slice(0, 20).map(w => {
    return `- ${w.title} (${w.total_weeks || 1} sett.) | ${w.description || 'Nessuna descrizione'}`;
  }).join('\n');

  const exerciseLibraryNames = coachExercises.map(e => e.name).slice(0, 50).join(', ');

  const systemPrompt = `
<coach_context>
Sei Assistente AI Coach per uno staff tecnico e medico sportivo della piattaforma Builder Athlete Manager.
Lavori solo con i dati autorizzati degli atleti assegnati all’utente (${allAthletes.length} atleti totali).
Il tuo obiettivo è aiutare il coach a leggere rischio, aderenza, stallo, carico e necessità di intervento.
Rispondi sempre in italiano, con tono operativo, concreto e asciutto.
</coach_context>

${selectedAthleteSection}

<team_context>
DATABASE ATLETI DISPONIBILE (${allAthletes.length} Atleti Registrati):
${athletesSummary || 'Nessun atleta presente a sistema.'}

SOMMARIO SCHEDE ATTIVE E TEMPLATE:
${workoutsSummary || 'Nessuna scheda presente.'}

LIBRERIA ESERCIZI DEL COACH:
${exerciseLibraryNames || 'Generale'}
</team_context>

<scope_rules>
Se è presente un atleta selezionato (<selected_athlete>), assumilo come contesto primario e vincolante della risposta.
In presenza di atleta selezionato:
- rispondi prima e principalmente su quell’atleta
- non restituire panoramiche globali dei ${allAthletes.length} atleti salvo richiesta esplicita
- i prompt rapidi devono applicarsi unicamente all’atleta selezionato
- se i dati specifici del selected athlete sono incompleti, non fare overview del team per riempire il vuoto: dichiara chiaramente che il dato non è presente e suggerisci l'azione utile

Richieste che autorizzano una vista globale:
- “tutti gli atleti”
- “panoramica team”
- “globale”
- “fammi una classifica”
- “chi sono”
- “overview”
</scope_rules>

<selected_athlete_priority>
Quando esiste <selected_athlete>, questo contesto ha priorità superiore rispetto al contesto generale del coach.
Non mischiare risposta individuale e risposta di gruppo nella stessa prima risposta.
HARD RULE: Se esiste un atleta selezionato, non restituire una panoramica dei ${allAthletes.length} atleti a meno che l’utente non chieda esplicitamente una vista globale.
</selected_athlete_priority>

<response_policy>
Se selected_athlete è presente, usa questo formato:
1. Stato atleta
2. Evidenza disponibile
3. Rischio o urgenza
4. Azione consigliata

Se selected_athlete non è presente (o su richiesta globale esplicita):
- usa bullet point ordinati per priorità
- evidenzia solo i casi rilevanti
- se nessun problema emerge, dillo chiaramente
</response_policy>

<quick_actions>
Scope Selected Athlete (quando un atleta è selezionato):
- Check in scadenza? → controlla solo il check-in e lo stato di quell’atleta
- Atleti in stallo? → interpreta come "questo atleta è in stallo?" analizzando i suoi dati
- Segnalazioni fastidi → mostra solo i fastidi/infortuni dell’atleta selezionato
- Schede da rinnovare → controlla solo la scheda dell’atleta selezionato
- Aggiungi Preferito → se l’atleta selezionato non è già preferito, proponi lui; non fare ranking globale

Scope Team Overview (quando nessun atleta è selezionato o su richiesta globale):
- Aggiungi Preferito → mostra i 3 atleti più utili da fissare in preferiti in base a rischio/stallo/scadenze
- Check in scadenza? → elenca atleti con check-in in scadenza o mancanti, ordinati per urgenza
- Atleti in stallo? → identifica atleti con trend piatto o peggioramento nelle ultime settimane
- Segnalazioni fastidi → riassumi segnalazioni fisiche, raggruppa per gravità e recenza
- Schede da rinnovare → trova schede prossime alla scadenza o già scadute
</quick_actions>

<guardrails>
- Non confondere UI text con prompt del cervello.
- Non assumere accesso a dati non presenti.
- Non suggerire di bypassare controlli di sicurezza.
- Se una richiesta tocca dati sensibili, mantieni il perimetro del coach autorizzato.
</guardrails>

<examples>
Esempio 1:
selected_athlete: VALENTINA BATTAGLIA
user: "Check in scadenza?"
assistant:
"Per VALENTINA BATTAGLIA il check-in risulta da monitorare. Non emerge una data certa dell’ultimo check-in nel contesto disponibile, quindi lo stato va considerato attenzionato. Azione consigliata: inviare sollecito individuale o verificare ultimo contatto registrato."

Esempio 2:
selected_athlete: DANIEL GHISLENI
user: "Atleti in stallo?"
assistant:
"Per DANIEL GHISLENI non emergono indicatori espliciti di stallo nel contesto disponibile. La progressione risulta standard, ma manca evidenza dettagliata sui trend recenti di carico. Azione consigliata: controllare ultime sedute e aderenza prima di modificare il programma."

Esempio 3:
selected_athlete: null
user: "Atleti in stallo?"
assistant:
"Nessun atleta presenta al momento indicatori espliciti di plateau o stallo prolungato nei dati disponibili. I 7 atleti monitorati risultano in progressione standard attiva. Azione consigliata: verificare i carichi dell’ultima seduta completata per anticipare eventuali plateau."
</examples>
`;

  try {
    const genResult = await generateContentWithGemini({
      provider: provider,
      systemPrompt: systemPrompt,
      userPrompt: userText,
      maxTokens: 2048,
      temperature: 0.5,
    });

    if (genResult && genResult.text) {
      return genResult.text;
    }
  } catch (err: unknown) {
    console.warn("Chiamata AI fallita, utilizzo fallback locale assistente:", err);
  }

  // Motore di fallback deterministico con risoluzione rigorosa di scope
  return generateLocalCoachAIResponse({
    userText,
    allAthletes,
    allWorkouts,
    selectedAthleteId,
  });
}

/**
 * Motore AI deterministico locale per analisi atleti, check-in, fastidi e stalli.
 * Supporta la risoluzione gerarchica di scope: Selected Athlete vs Team Overview.
 */
function generateLocalCoachAIResponse(params: {
  userText: string;
  allAthletes: Athlete[];
  allWorkouts: WorkoutTemplate[];
  selectedAthleteId?: string;
}): string {
  const { userText, allAthletes, allWorkouts, selectedAthleteId } = params;
  const lower = userText.toLowerCase().trim();

  // Verifica se l'utente richiede esplicitamente una vista globale del team
  const isExplicitGlobal = /(tutti gli atleti|panoramica team|globale|fammi una classifica|chi sono|overview|tutti|classifica)/i.test(lower);

  // Trova l'atleta selezionato se presente
  const selectedAthlete = selectedAthleteId
    ? allAthletes.find(a => a.id === selectedAthleteId)
    : undefined;

  // =========================================================================
  // SCOPE 1: SELECTED ATHLETE (Priorità Assoluta se presente e non globale)
  // =========================================================================
  if (selectedAthlete && !isExplicitGlobal) {
    const athleteName = selectedAthlete.fullName.toUpperCase();

    // 1.1 Quick Action: Check in scadenza?
    if (lower.includes('check in scadenza') || lower.includes('check-in') || lower.includes('rinnovo in scadenza')) {
      const isAttenzionato = selectedAthlete.paymentStatus === 'overdue' || selectedAthlete.paymentStatus === 'expiring' || selectedAthlete.status === 'trial';
      const hasExpiryDate = Boolean(selectedAthlete.medicalCertificateExpiryDate);

      return `Per ${athleteName} il check-in risulta ${isAttenzionato ? 'urgente e da regolarizzare' : 'da monitorare'}. ` +
        (hasExpiryDate
          ? `Scadenza certificato: ${selectedAthlete.medicalCertificateExpiryDate}. `
          : `Non emerge una data certa dell’ultimo check-in nel contesto disponibile, quindi lo stato va considerato attenzionato. `) +
        `Azione consigliata: inviare sollecito individuale o verificare ultimo contatto registrato.`;
    }

    // 1.2 Quick Action: Atleti in stallo? (interpretato come: "questo atleta è in stallo?")
    if (lower.includes('stallo') || lower.includes('plateau') || lower.includes('trend piatto')) {
      const hasStallNotes = selectedAthlete.notes && (selectedAthlete.notes.toLowerCase().includes('stallo') || selectedAthlete.notes.toLowerCase().includes('fatica'));

      if (hasStallNotes) {
        return `Per ${athleteName} sono presenti segnalazioni di fatica o carico: "${selectedAthlete.notes}". Azione consigliata: applicare uno scarico attivo (deload) per 1 settimana o ridurre il volume del 20%.`;
      }

      return `Per ${athleteName} non emergono indicatori espliciti di stallo nel contesto disponibile. La progressione risulta standard, ma manca evidenza dettagliata sui trend recenti di carico. Azione consigliata: controllare ultime sedute e aderenza prima di modificare il programma.`;
    }

    // 1.3 Quick Action: Segnalazioni fastidi
    if (lower.includes('fastidi') || lower.includes('dolor') || lower.includes('infortun') || lower.includes('sanitar')) {
      if (selectedAthlete.medicalNotes && selectedAthlete.medicalNotes.trim().length > 0) {
        return `Per ${athleteName} è segnalata la seguente condizione fisica: "${selectedAthlete.medicalNotes}".\n\n` +
          `• **Rischio:** Sovraccarico articolare/muscolare sui pattern di movimento correlati.\n` +
          `• **Azione consigliata:** Sostituire gli esercizi a carico diretto sul distretto e verificare l'assenza di dolore.`;
      }

      return `Per ${athleteName} non risultano segnalazioni di fastidi o infortuni attivi nel contesto disponibile. Azione consigliata: mantenere la scheda in corso.`;
    }

    // 1.4 Quick Action: Schede da rinnovare
    if (lower.includes('schede da rinnovare') || lower.includes('schede in scadenza') || lower.includes('rinnovare')) {
      return `Per ${athleteName} la scheda di allenamento è attiva. Azione consigliata: verificare la settimana corrente del mesociclo per concordare il rinnovo della scheda.`;
    }

    // 1.5 Quick Action: Aggiungi Preferito
    if (lower.includes('aggiungi preferito') || lower.includes('preferit') || lower.includes('fissare')) {
      const reason = selectedAthlete.medicalNotes
        ? `il monitoraggio delle note sanitarie ("${selectedAthlete.medicalNotes}")`
        : `il monitoraggio dell'obiettivo ("${selectedAthlete.goals || 'ipertrofia/forza'}")`;
      return `Proponi ${athleteName} nei preferiti per ${reason}. Azione consigliata: confermare l'atleta nei preferiti della sidebar.`;
    }

    // 1.6 Risposta Generale / Analisi Singolo Atleta (Formato Response Policy)
    const hasMedical = Boolean(selectedAthlete.medicalNotes && selectedAthlete.medicalNotes.trim().length > 0);
    return `1. **Stato atleta:** ${athleteName} — Stato ${selectedAthlete.status.toUpperCase()}, Pagamento: ${selectedAthlete.paymentStatus.toUpperCase()}\n\n` +
      `2. **Evidenza disponibile:** ${hasMedical ? `Note sanitarie: "${selectedAthlete.medicalNotes}". ` : 'Nessuna limitazione fisica segnalata. '}Obiettivi: ${selectedAthlete.goals || 'Non specificati'}. Note: ${selectedAthlete.notes || 'Nessuna'}.\n\n` +
      `3. **Rischio o urgenza:** ${hasMedical ? 'Presenza di fastidi fisici da attenzionare.' : selectedAthlete.paymentStatus === 'overdue' ? 'Pagamento scaduto.' : 'Basso rischio clinico.'}\n\n` +
      `4. **Azione consigliata:** ${hasMedical ? 'Adattare gli esercizi con varianti safe a basso stress articolare.' : 'Mantenere la progressione di carico programmata.'}`;
  }

  // =========================================================================
  // SCOPE 2: TEAM OVERVIEW (Quando nessun atleta è selezionato o richiesta globale)
  // =========================================================================

  // 2.1 Quick Action: Aggiungi Preferito
  if (lower.includes('aggiungi preferito') || lower.includes('preferit') || lower.includes('fissare')) {
    const scoredAthletes = allAthletes.map(a => {
      let score = 0;
      const reasons: string[] = [];

      if (a.medicalNotes && a.medicalNotes.trim().length > 0) {
        score += 5;
        reasons.push(`Fastidio/Note sanitarie: "${a.medicalNotes}"`);
      }
      if (a.paymentStatus === 'overdue' || a.paymentStatus === 'expiring') {
        score += 3;
        reasons.push(`Stato abbonamento/pagamento: ${a.paymentStatus}`);
      }
      if (a.status === 'trial' || a.status === 'suspended') {
        score += 2;
        reasons.push(`Stato atleta: ${a.status}`);
      }
      if (a.medicalCertificateExpiryDate) {
        const expiry = new Date(a.medicalCertificateExpiryDate).getTime();
        const diffDays = (expiry - Date.now()) / (1000 * 60 * 60 * 24);
        if (diffDays <= 15) {
          score += 4;
          reasons.push(`Certificato medico in scadenza (${Math.round(diffDays)} gg)`);
        }
      }

      return { athlete: a, score, reasons };
    }).sort((a, b) => b.score - a.score);

    const top3 = scoredAthletes.slice(0, 3);
    if (top3.length === 0) {
      return "Nessun atleta prioritario da fissare al momento. Tutti gli atleti risultano in stato regolare.";
    }

    const bullets = top3.map((item, idx) => {
      const { athlete, reasons } = item;
      const mainReason = reasons.length > 0 ? reasons.join('; ') : 'Monitoraggio standard';
      return `• **${idx + 1}. ${athlete.fullName}** (ID: ${athlete.id})\n  - **Priorità:** ${item.score >= 4 ? 'Alta 🚨' : 'Media ⚠️'}\n  - **Motivo:** ${mainReason}\n  - **Azione consigliata:** Fissare nei preferiti per monitorare l'evoluzione clinico-tecnica.`;
    }).join('\n\n');

    return `Ecco i 3 atleti prioritari da fissare nei preferiti in base a rischio, stato e scadenze:\n\n${bullets}`;
  }

  // 2.2 Quick Action: Check in scadenza?
  if (lower.includes('check in scadenza') || lower.includes('check-in') || lower.includes('rinnovo in scadenza')) {
    const overdueList = allAthletes.filter(a => a.paymentStatus === 'overdue' || a.paymentStatus === 'expiring' || a.status === 'trial');
    const activeList = allAthletes.filter(a => a.status === 'active' && a.paymentStatus !== 'overdue');
    const missingData = allAthletes.filter(a => !a.medicalCertificateExpiryDate && !a.notes);

    const bullets: string[] = [];

    if (overdueList.length > 0) {
      bullets.push(`• 🚨 **Urgenza Alta (Check-in/Rinnovi in Scadenza o Mancanti):**\n` +
        overdueList.map(a => `  - **${a.fullName}**: Stato ${a.status} / Pagamento ${a.paymentStatus}${a.medicalNotes ? ` (Fastidio: ${a.medicalNotes})` : ''}`).join('\n'));
    }

    if (activeList.length > 0) {
      bullets.push(`• ⚠️ **Urgenza Media (Atleti Attivi in Monitoraggio):**\n` +
        activeList.slice(0, 4).map(a => `  - **${a.fullName}**: Monitoraggio e check-in settimanale programmato`).join('\n'));
    }

    if (missingData.length > 0) {
      bullets.push(`• ℹ️ **Dato non presente:**\n` +
        `  - Per ${missingData.length} atleta/i non è registrata una data di ultimo check-in a sistema.`);
    }

    if (bullets.length === 0) {
      return "Tutti i check-in sono regolari. Nessuna scadenza rilevata nei prossimi 7 giorni.";
    }

    return `Stato check-in atleti ordinato per urgenza:\n\n${bullets.join('\n\n')}\n\n**Azione consigliata:** Inviare notifica di sollecito ai profili in alta priorità.`;
  }

  // 2.3 Quick Action: Atleti in stallo?
  if (lower.includes('stallo') || lower.includes('plateau') || lower.includes('trend piatto')) {
    const stalledAthletes = allAthletes.filter(a =>
      a.status === 'suspended' ||
      (a.notes && (a.notes.toLowerCase().includes('stallo') || a.notes.toLowerCase().includes('fatica') || a.notes.toLowerCase().includes('carico')))
    );

    if (stalledAthletes.length === 0) {
      return `Nessun atleta presenta al momento indicatori espliciti di plateau o stallo prolungato nei dati disponibili. I ${allAthletes.length} atleti monitorati risultano in progressione standard attiva. Azione consigliata: verificare i carichi dell’ultima seduta completata per anticipare eventuali plateau.`;
    }

    const list = stalledAthletes.map(a => `• **${a.fullName}**: ${a.notes || 'Stato sospeso o carico costante senza progressione'}`).join('\n');
    return `Atleti con indicatori di stallo o plateau:\n\n${list}\n\n**Azione consigliata:** Ridurre il volume del 20% o applicare uno scarico attivo (deload) per 1 settimana.`;
  }

  // 2.4 Quick Action: Segnalazioni fastidi
  if (lower.includes('fastidi') || lower.includes('dolor') || lower.includes('infortun') || lower.includes('sanitar')) {
    const injured = allAthletes.filter(a => a.medicalNotes && a.medicalNotes.trim().length > 0);

    if (injured.length === 0) {
      return "Nessun atleta ha segnalato infortuni o fastidi fisici attivi nel database.";
    }

    const highRiskKeywords = ['operaz', 'chirurg', 'rottur', 'ernia', 'lesione', 'acuto'];
    const high = injured.filter(a => highRiskKeywords.some(kw => (a.medicalNotes || '').toLowerCase().includes(kw)));
    const medium = injured.filter(a => !highRiskKeywords.some(kw => (a.medicalNotes || '').toLowerCase().includes(kw)));

    const result: string[] = [];
    if (high.length > 0) {
      result.push(`• 🚨 **Gravità Alta (Da escalare a medico sportivo/fisioterapista):**\n` +
        high.map(a => `  - **${a.fullName}**: ${a.medicalNotes}`).join('\n'));
    }
    if (medium.length > 0) {
      result.push(`• ⚠️ **Gravità Media (Adattamento carichi & varianti):**\n` +
        medium.map(a => `  - **${a.fullName}**: ${a.medicalNotes}`).join('\n'));
    }

    return `Riepilogo segnalazioni fisiche e fastidi:\n\n${result.join('\n\n')}\n\n**Azione consigliata:** Sostituire gli esercizi che sovraccaricano i distretti interessati e verificare l'assenza di dolore durante il movimento.`;
  }

  // 2.5 Quick Action: Schede da rinnovare
  if (lower.includes('schede da rinnovare') || lower.includes('schede in scadenza') || lower.includes('rinnovare')) {
    if (allWorkouts.length === 0) {
      return "Nessuna scheda presente a sistema. Creare una scheda template o assegnarne una dal catalogo.";
    }

    const list = allWorkouts.slice(0, 5).map(w => `• **${w.title}**: Durata ${w.total_weeks || 1} sett. (${w.description || 'Programma base'})`).join('\n');
    return `Stato schede di allenamento nel catalogo:\n\n${list}\n\n**Azione consigliata:** Verificare le assegnazioni attive agli atleti per programmare il prossimo mesociclo.`;
  }

  // 2.6 Ricerca atleta per nome nel testo
  const athleteByName = allAthletes.find(a =>
    lower.includes(a.firstName.toLowerCase()) ||
    lower.includes(a.lastName.toLowerCase()) ||
    lower.includes(a.fullName.toLowerCase())
  );

  if (athleteByName) {
    const hasMedical = Boolean(athleteByName.medicalNotes && athleteByName.medicalNotes.trim().length > 0);
    return `1. **Stato atleta:** ${athleteByName.fullName} — Stato ${athleteByName.status.toUpperCase()}, Pagamento: ${athleteByName.paymentStatus.toUpperCase()}\n\n` +
      `2. **Evidenza disponibile:** ${hasMedical ? `Note sanitarie: "${athleteByName.medicalNotes}". ` : 'Nessuna limitazione fisica segnalata. '}Obiettivi: ${athleteByName.goals || 'Non specificati'}. Note: ${athleteByName.notes || 'Nessuna'}.\n\n` +
      `3. **Rischio o urgenza:** ${hasMedical ? 'Presenza di fastidi fisici da attenzionare.' : athleteByName.paymentStatus === 'overdue' ? 'Pagamento scaduto.' : 'Basso rischio clinico.'}\n\n` +
      `4. **Azione consigliata:** ${hasMedical ? 'Adattare gli esercizi con varianti safe a basso stress articolare.' : 'Mantenere la progressione di carico programmata.'}`;
  }

  // 2.7 Risposta Globale Team di Default
  return `Database atleti operativo (${allAthletes.length} atleti registrati, ${allWorkouts.length} schede nel catalogo).\n\n` +
    `• **Atleti con segnalazioni sanitarie:** ${allAthletes.filter(a => a.medicalNotes).length}\n` +
    `• **Atleti attivi:** ${allAthletes.filter(a => a.status === 'active').length}\n` +
    `• **Atleti con pagamenti da regolarizzare:** ${allAthletes.filter(a => a.paymentStatus === 'overdue' || a.paymentStatus === 'expiring').length}\n\n` +
    `Utilizza uno dei prompt rapidi in alto o seleziona un atleta per un'analisi specifica.`;
}
