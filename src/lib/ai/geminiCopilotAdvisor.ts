/**
 * GEMINI 3.7 FLASH COPILOT ADVISOR
 * 
 * Motore di consulenza biomeccanica e metodologica per il Coach Copilot.
 * Analizza le criticità (dolori, plateau, rientro da inattività, progressioni)
 * e fornisce diagnosi kinesiologiche, cue tecnici, istruzioni per video check
 * e risposte chat personalizzate.
 */

import { getActiveGeminiApiKey } from './biomechanicsGeminiAssistant';

export interface CopilotAdvisorInput {
  athleteName: string;
  exerciseName?: string;
  workoutTitle?: string;
  targetWeek?: string;
  noteText?: string;
  issueType: 'critical_note' | 'plateau' | 'inactivity' | 'progression' | 'missing_weights';
  rpe?: number;
  customApiKey?: string;
}

export interface CopilotAdvisorOutput {
  diagnosisSummary: string;
  biomechanicalDiagnosis: string;
  correctiveTechnicalCue: string;
  videoCheckGuidance: string;
  primaryActionTitle: string;
  primaryActionReason: string;
  diffPreview: { before: string; after: string };
  chatMessage: string;
  modelUsed: string;
}

export async function generateCopilotAdviceWithGemini(
  input: CopilotAdvisorInput
): Promise<CopilotAdvisorOutput> {
  const apiKey = getActiveGeminiApiKey(input.customApiKey);
  const exName = input.exerciseName || 'Esercizio Principale';
  const note = input.noteText || '';
  const week = input.targetWeek || 'Settimana Corrente';

  // Fallback deterministico di alta qualità se offline o API key non inserita
  const fallbackOutput: CopilotAdvisorOutput = generateLocalFallbackAdvice(input);

  if (!apiKey) {
    return fallbackOutput;
  }

  const systemPrompt = `Sei il Master Biomeccanico e Metodologo Ufficiale di "AC Training Base", una piattaforma gestionale d'élite per personal trainer e strength coach.
Il tuo compito è analizzare i feedback dell'atleta e generare una risposta altamente professionale, scientifica ma pratica, focalizzata su:
1. Diagnosi kinesiologica/biomeccanica della causa (errori tecnici, compensi, forze di taglio, curva di resistenza).
2. Cue tecnico correttivo immediato da insegnare all'atleta.
3. Istruzioni esatte per richiedere un video esecutivo (inquadratura e dettagli tecnici da controllare).
4. Variante o rimodulazione consigliata (se il fastidio o stallo persiste).
5. Messaggio chat pronto, empatico, autorevole e motivante.

Rispondi ESCLUSIVAMENTE in formato JSON valido aderente a questo schema:
{
  "diagnosisSummary": "Sintesi chiara in 1 riga del problema",
  "biomechanicalDiagnosis": "Spiegazione kinesiologica sintetica della causa probabile (2-3 frasi)",
  "correctiveTechnicalCue": "Cue motorio pratico da dare all'atleta (es. assetto scapolare, traiettoria gomiti, baricentro)",
  "videoCheckGuidance": "Angolazione e istruzioni per il video (es. ripresa a 45° ad altezza bacino)",
  "primaryActionTitle": "Titolo azione principale consigliata",
  "primaryActionReason": "Razionale metodologico dell'azione",
  "diffBefore": "Impostazione precedente (es. Panca Bilanciere 4x6)",
  "diffAfter": "Impostazione suggerita (es. Panca Manubri 30° presa semi-neutra 3x8-10)",
  "chatMessage": "Messaggio umano e diretto per l'atleta, pronto per WhatsApp/Chat"
}`;

  const userPrompt = `Dati Atleta:
- Nome: ${input.athleteName}
- Scheda attiva: ${input.workoutTitle || 'Scheda Personalizzata'}
- Settimana: ${week}
- Tipo criticità: ${input.issueType}
- Esercizio: ${exName}
- Nota/Feedback dell'atleta: "${note || 'Nessuna nota specifica'}"
- RPE registrato: ${input.rpe || 'Standard'}

Genera l'analisi biomeccanica ottimale con Google Gemini 3.7 Flash.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!response.ok) {
      console.warn(`Gemini 3.7 Flash API error (${response.status}), fallback attivato`);
      return fallbackOutput;
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) return fallbackOutput;

    const parsed = JSON.parse(rawText);

    return {
      diagnosisSummary: parsed.diagnosisSummary || fallbackOutput.diagnosisSummary,
      biomechanicalDiagnosis: parsed.biomechanicalDiagnosis || fallbackOutput.biomechanicalDiagnosis,
      correctiveTechnicalCue: parsed.correctiveTechnicalCue || fallbackOutput.correctiveTechnicalCue,
      videoCheckGuidance: parsed.videoCheckGuidance || fallbackOutput.videoCheckGuidance,
      primaryActionTitle: parsed.primaryActionTitle || fallbackOutput.primaryActionTitle,
      primaryActionReason: parsed.primaryActionReason || fallbackOutput.primaryActionReason,
      diffPreview: {
        before: parsed.diffBefore || fallbackOutput.diffPreview.before,
        after: parsed.diffAfter || fallbackOutput.diffPreview.after,
      },
      chatMessage: parsed.chatMessage || fallbackOutput.chatMessage,
      modelUsed: 'Google Gemini 3.7 Flash',
    };
  } catch (err) {
    console.warn('Errore chiamata Gemini 3.7 Flash:', err);
    return fallbackOutput;
  }
}

function generateLocalFallbackAdvice(input: CopilotAdvisorInput): CopilotAdvisorOutput {
  const athleteFirstName = input.athleteName ? input.athleteName.trim().split(' ')[0] : 'Atleta';
  const exName = input.exerciseName || 'Esercizio Principale';
  const note = input.noteText || '';

  if (input.issueType === 'critical_note') {
    return {
      diagnosisSummary: note || `Fastidio o stress articolare rilevato su ${exName}`,
      biomechanicalDiagnosis: `Possibile alterazione della traiettoria di spinta o compenso articolare (over-flaring o perdita di compattezza del core). Prima di escludere l'esercizio, è fondamentale verificare l'assetto tecnico con un video.`,
      correctiveTechnicalCue: `Concentrati sul controllo della fase eccentrica in 3 secondi e mantieni le articolazioni in asse fisiologico senza rimbalzi.`,
      videoCheckGuidance: `Richiedi video laterale a 45° ad altezza bacino durante la 1° o 2° serie allenante.`,
      primaryActionTitle: `Check Video Tecnico & Rimodulazione Carico (-15%)`,
      primaryActionReason: `Identifica subito eventuali errori esecutivi e protegge le articolazioni senza interrompere la progressione neurale.`,
      diffPreview: {
        before: `${exName} — Carico Attuale (Feedback: "${note || 'Fastidio avvertito'}")`,
        after: `${exName} — Focus Tecnico + Video Check (TUT 3-1-1, Carico -15%)`,
      },
      chatMessage: `Ciao ${athleteFirstName}! Ho letto la tua nota su ${exName}. Prima di cambiare esercizio, alla prossima sessione registrami un video laterale a 45° di una serie target: verifichiamo insieme l'assetto e sistemiamo la traiettoria per spingere in totale sicurezza!`,
      modelUsed: 'AC Biomechanics Engine (Locale)',
    };
  }

  if (input.issueType === 'plateau') {
    return {
      diagnosisSummary: note || `Stallo di carico o stasi su ${exName}`,
      biomechanicalDiagnosis: `Adattamento neuromuscolare stabilizzato. Il volume attuale non genera sufficiente tensione meccanica di picco o la fatica sistemica accumulata maschera la reale espressione di forza.`,
      correctiveTechnicalCue: `Focalizza la massima accelerazione concentrica mantenendo un fermo isometrico pulito nel punto di inversione.`,
      videoCheckGuidance: `Verifica la velocità di barra o tempo concentrico con video fronto-laterale.`,
      primaryActionTitle: `Tecnica Rest-Pause & Ottimizzazione Volume`,
      primaryActionReason: `Rompe la stasi neurale reclutando le unità motorie ad alta soglia senza generare fatica spazzatura.`,
      diffPreview: {
        before: `${exName} — 4x8 (Stallo Carico, RPE 9.5)`,
        after: `${exName} — 1x6 Target + 2 Rest-Pause (TUT 2-0-1, Carico +2.5%)`,
      },
      chatMessage: `Ciao ${athleteFirstName}! Ho analizzato i dati su ${exName}. Per sbloccare la forza e superare questo punto critico ho inserito una tecnica Rest-Pause mirata. Spingi forte!`,
      modelUsed: 'AC Biomechanics Engine (Locale)',
    };
  }

  if (input.issueType === 'missing_weights') {
    return {
      diagnosisSummary: note || `Sessione completata ma carichi non registrati (Volume 0 kg)`,
      biomechanicalDiagnosis: `Mancanza dei parametri di carico (kg e reps). Senza questi dati non è possibile calcolare il volume effettivo, la progressione di forza né l'adattamento neuromuscolare.`,
      correctiveTechnicalCue: `Registrare peso e ripetizioni per ogni serie immediatamente dopo aver completato l'esercizio.`,
      videoCheckGuidance: `Nessun video richiesto. Necessario inserimento numerico dei carichi.`,
      primaryActionTitle: `Promemoria Educativo Compilazione Carichi`,
      primaryActionReason: `Educa l'atleta all'importanza del tracciamento continuo dei carichi per ottimizzare i risultati.`,
      diffPreview: {
        before: `Sessione registrata senza pesi (Volume 0 kg)`,
        after: `Sollecito inviato — Educazione al Tracciamento Dati`,
      },
      chatMessage: `Ciao ${athleteFirstName}! Ho visto che hai completato l'allenamento, ottimo lavoro! 💪 Ho notato però che non hai registrato i carichi usati e le ripetizioni: per me è fondamentale avere questi numeri per capire i tuoi progressi e calibrare la scheda. Dalla prossima seduta ricordati di segnarli per ogni serie. Se hai dubbi chiedimi pure!`,
      modelUsed: 'AC Biomechanics Engine (Locale)',
    };
  }

  if (input.issueType === 'inactivity') {
    return {
      diagnosisSummary: note || `In attesa del primo allenamento o rientro da pausa`,
      biomechanicalDiagnosis: `Necessario ripristino graduale della capacità di lavoro e re-idratazione del tessuto connettivo per evitare DOMS invalidanti.`,
      correctiveTechnicalCue: `Movimenti fluidi a ROM completo con carichi sub-massimali (RPE 7).`,
      videoCheckGuidance: `Nessun video richiesto per la seduta di rientro.`,
      primaryActionTitle: `Supporto di Benvenuto & Avvio Programma`,
      primaryActionReason: `Offre assistenza immediata e stimola la costanza dell'atleta sin dalla prima settimana.`,
      diffPreview: {
        before: `Programma In attesa di avvio`,
        after: `Supporto Coach Attivo (Promemoria & Allineamento)`,
      },
      chatMessage: `Ciao ${athleteFirstName}! La tua nuova scheda di allenamento è pronta e attiva. Fammi sapere quando programmi il primo allenamento o se hai qualsiasi dubbio sui carichi o sugli esercizi!`,
      modelUsed: 'AC Biomechanics Engine (Locale)',
    };
  }

  return {
    diagnosisSummary: note || `Progressione standard e monitoraggio attivo`,
    biomechanicalDiagnosis: `Ottimo adattamento alle richieste di carico. L'atleta esprime efficienza meccanica e risponde positivamente al volume programmato.`,
    correctiveTechnicalCue: `Consolida il controllo tecnico mantenendo la stabilità in tutto il ROM.`,
    videoCheckGuidance: `Video facoltativo per verifica massimale o serie pesante.`,
    primaryActionTitle: `Sovraccarico Progressivo Calcolato (+2.5%)`,
    primaryActionReason: `Continua a stimolare l'ipertrofia sfruttando il momentum positivo.`,
    diffPreview: {
      before: `${exName} — Target Base`,
      after: `${exName} — Target Incrementato (+2.5%)`,
    },
    chatMessage: `Grande prestazione su ${exName}, ${athleteFirstName}! 🔥 Ho aggiornato i tuoi carichi target per la prossima settimana. Continua così!`,
    modelUsed: 'AC Biomechanics Engine (Locale)',
  };
}
