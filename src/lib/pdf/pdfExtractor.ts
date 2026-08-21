import * as pdfjsLib from 'pdfjs-dist';

// Imposta il worker di pdfjs-dist tramite CDN per ambiente Vite / browser
if (typeof window !== 'undefined' && 'Worker' in window) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

export interface ParsedPDFWorkout {
  title: string;
  totalWeeks: number;
  weeks: {
    weekNumber: number;
    days: {
      dayName: string;
      exercises: {
        orderLetter?: string;
        rawName: string;
        alternative_exercise?: string;
        sets: number;
        repsTarget: string;
        isTimeBased?: boolean;
        durationSeconds?: number | null;
        restSeconds: number;
        restDisplay?: string;
        notes?: string;
      }[];
    }[];
  }[];
}

interface TextItemWithPos {
  x: number;
  y: number;
  str: string;
}

/**
 * Converte un file File in stringa Base64
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = (err) => reject(err);
  });
};

/**
 * Esegue il parsing del PDF tramite Google Gemini Multimodal Vision API diretta (Client-Side con API Key)
 */
export const parsePDFWithDirectGemini = async (
  file: File,
  apiKey: string,
  modelName: string = 'gemini-3.7-flash'
): Promise<ParsedPDFWorkout> => {
  const base64 = await fileToBase64(file);

  const systemPrompt = `Sei un esperto parser AI specializzato in schede di allenamento fitness e body building in formato PDF.
Il tuo compito è analizzare il PDF fornito (anche su più pagine e con tabelle complesse) ed estrarre la scheda completa in un JSON rigorosamente strutturato.

SCHEMA JSON OBBLIGATORIO DA RESTITUIRE:
{
  "title": "Titolo del programma (es. Programma di Allenamento - Nome Atleta)",
  "totalWeeks": numero_settimane_totali,
  "weeks": [
    {
      "weekNumber": 1,
      "days": [
        {
          "dayName": "GIORNO 1",
          "exercises": [
            {
              "orderLetter": "A",
              "rawName": "Nome Esercizio",
              "alternative_exercise": "Nome eventuale alternativa o null",
              "sets": 3,
              "repsTarget": "10-12",
              "isTimeBased": false,
              "durationSeconds": null,
              "restSeconds": 60,
              "restDisplay": "01:00",
              "notes": "Note dell'esercizio se presenti"
            }
          ]
        }
      ]
    }
  ]
}

REGOLE CRITICHE DI ESTRAZIONE:
1. ESTRAI TUTTI I GIORNI E TUTTE LE SETTIMANE (supporta da 1 a 12 esercizi per giorno).
2. Se un giorno è impaginato su 2 colonne o griglie, mantieni TUTTI gli esercizi nell'ordine alfabetico corretto (A, B, C, D, E, F, G, H, I, J, K, L).
3. Se un esercizio presenta varianti (es. "Alternative: Leg Press..."), inseriscile nel campo "alternative_exercise".
4. Se compaiono note sotto l'esercizio ("Note: ..."), inseriscile in "notes".
5. Estrai correttamente serie intere ("Serie 3" -> 3), ripetizioni ("Ripetizioni 10-12") o tempi ("Periodo 00:30" -> isTimeBased: true, durationSeconds: 30).
6. Restituisci ESCLUSIVAMENTE il JSON valido senza blocchi markdown.`;

  const modelsToTry = [
    modelName,
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-2.5-flash',
    'gemini-1.5-flash',
  ].filter((m, idx, arr) => arr.indexOf(m) === idx);

  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    try {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: 'application/pdf',
                    data: base64,
                  },
                },
                {
                  text: systemPrompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 16384,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        if (res.status === 404 && (errText.includes('not found') || errText.includes('no longer available'))) {
          console.warn(`[Gemini Model] ${model} non disponibile, provo modello successivo...`);
          continue;
        }
        throw new Error(`Errore API Gemini (${res.status}): ${errText}`);
      }

      const resData = await res.json();
      const rawJson = resData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawJson) throw new Error('Nessun contenuto restituito da Gemini.');

      const parsed = robustJsonParse<ParsedPDFWorkout>(rawJson);
      return parsed;
    } catch (err: any) {
      lastError = err;
      if (err.message && err.message.includes('404')) {
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error('Nessun modello Gemini compatibile ha risposto.');
};

/**
 * Funzione di Chiusura Automatica di Parentesi e Stringhe per JSON Troncati
 */
function autoCloseJson(jsonStr: string): string {
  let cleaned = jsonStr.trim();

  let inString = false;
  let escape = false;
  const cleanChars: string[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    if (char === '"' && !escape) {
      inString = !inString;
    }
    escape = char === '\\' && !escape;
    cleanChars.push(char);
  }

  if (inString) {
    cleanChars.push('"');
  }

  cleaned = cleanChars.join('').trim();
  cleaned = cleaned.replace(/,\s*$/, '');
  cleaned = cleaned.replace(/,\s*"[^"]*":\s*$/, '');
  cleaned = cleaned.replace(/,\s*"[^"]*"\s*$/, '');

  const stack: string[] = [];
  inString = false;
  escape = false;

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    if (char === '"' && !escape) {
      inString = !inString;
    }
    escape = char === '\\' && !escape;

    if (!inString) {
      if (char === '{' || char === '[') {
        stack.push(char);
      } else if (char === '}' && stack[stack.length - 1] === '{') {
        stack.pop();
      } else if (char === ']' && stack[stack.length - 1] === '[') {
        stack.pop();
      }
    }
  }

  while (stack.length > 0) {
    const last = stack.pop();
    if (last === '{') cleaned += '}';
    if (last === '[') cleaned += ']';
  }

  return cleaned;
}

/**
 * Parser e Riparatore JSON Resiliente per Output LLM
 */
export function robustJsonParse<T = any>(rawText: string): T {
  if (!rawText) throw new Error('Risposta AI vuota');

  // 1. Rimuovi blocchi markdown ```json ... ```
  let cleaned = rawText.replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, '$1').trim();

  // 2. Trova il primo '{'
  const firstBrace = cleaned.indexOf('{');
  if (firstBrace !== -1) {
    cleaned = cleaned.substring(firstBrace);
  }

  // 3. Rimuovi commenti // o /* */
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, '$1');

  // 4. Auto-chiudi eventuali parentesi non chiuse da risposte lunghe/troncate
  cleaned = autoCloseJson(cleaned);

  // 5. Rimuovi trailing commas (virgole prima di } o ])
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');

  // 6. Tentativo diretto di parse
  try {
    return JSON.parse(cleaned);
  } catch (err1) {
    console.warn('Tentativo 1 parsing JSON fallito, applicazione riparazione quote/chiavi...');

    // Ripara chiavi non quotate: es. { title: "..." } -> { "title": "..." }
    let repaired = cleaned.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
    repaired = autoCloseJson(repaired);
    repaired = repaired.replace(/,\s*([}\]])/g, '$1');

    try {
      return JSON.parse(repaired);
    } catch (err2) {
      console.warn('Tentativo 2 fallito, utilizzo Function constructor loose parser...');
      try {
        const looseObj = new Function(`"use strict"; return (${repaired});`)();
        return looseObj;
      } catch (err3) {
        console.error('Testo JSON restituito da Gemini:', rawText);
        throw new Error(`Impossibile formattare la risposta dell'AI: ${err1 instanceof Error ? err1.message : String(err1)}`);
      }
    }
  }
}

/**
 * Ordinamento standard per altezza Y (dall'alto in basso) e coordinata X (da sinistra a destra)
 */
function groupStandardByY(items: TextItemWithPos[]): string[] {
  const yMap = new Map<number, TextItemWithPos[]>();
  for (const item of items) {
    const yKey = Math.round(item.y / 6) * 6;
    if (!yMap.has(yKey)) yMap.set(yKey, []);
    yMap.get(yKey)!.push(item);
  }
  const sortedY = Array.from(yMap.keys()).sort((a, b) => b - a);

  const lines: string[] = [];
  sortedY.forEach((y) => {
    const lineItems = yMap.get(y)!;
    lineItems.sort((a, b) => a.x - b.x);
    lines.push(lineItems.map((i) => i.str).join(' ').trim());
  });
  return lines;
}

/**
 * Algoritmo di Ordine di Lettura Naturale (Row-by-Row Left-to-Right)
 */
export function extractNaturalReadingOrderLines(items: TextItemWithPos[]): string[] {
  if (!items || items.length === 0) return [];

  const xValues = items.map((i) => i.x);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const midX = minX + (maxX - minX) / 2;

  const cardStarts = items.filter((i) => i.str.match(/^([A-Z])(?:\s+|$)/));
  
  if (cardStarts.length < 2) {
    return groupStandardByY(items);
  }

  const rowYMap = new Map<number, TextItemWithPos[]>();
  for (const item of items) {
    const yKey = Math.round(item.y / 25) * 25;
    if (!rowYMap.has(yKey)) rowYMap.set(yKey, []);
    rowYMap.get(yKey)!.push(item);
  }

  const sortedYRows = Array.from(rowYMap.keys()).sort((a, b) => b - a);
  const lines: string[] = [];

  for (const yRow of sortedYRows) {
    const rowItems = rowYMap.get(yRow)!;

    const leftItems = rowItems.filter((i) => i.x < midX);
    const rightItems = rowItems.filter((i) => i.x >= midX);

    if (leftItems.length > 0) {
      lines.push(...groupStandardByY(leftItems));
    }

    if (rightItems.length > 0) {
      lines.push(...groupStandardByY(rightItems));
    }
  }

  return lines;
}

/**
 * Estrae il testo da tutte le pagine di un file PDF usando pdfjs-dist
 */
export const extractPagesFromPDFFile = async (file: File): Promise<{ pageNumber: number; text: string; lines: string[] }[]> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDocument = await loadingTask.promise;

    const pages: { pageNumber: number; text: string; lines: string[] }[] = [];

    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();

      const items: TextItemWithPos[] = [];
      for (const item of textContent.items as any[]) {
        if (!item.str || !item.str.trim()) continue;
        const x = item.transform ? item.transform[4] : 0;
        const y = item.transform ? item.transform[5] : 0;
        items.push({ x, y, str: item.str });
      }

      const pageLines = extractNaturalReadingOrderLines(items);

      pages.push({
        pageNumber: pageNum,
        text: pageLines.join('\n'),
        lines: pageLines,
      });
    }

    return pages;
  } catch (err) {
    console.warn("Estrazione testo pdfjs fallita:", err);
    return [];
  }
};

/**
 * Parsa le righe di testo estraendo le card esercizio
 */
function parsePageLines(lines: string[]) {
  const RESERVED_KEYWORDS = [
    'serie',
    'note',
    'notes',
    'alternative',
    'settimana',
    'programma',
    'giorno',
    'allenamento',
    'antonio crapanzano'
  ];

  const exercises: any[] = [];
  let currentEx: any = null;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) continue;

    if (
      line.match(/^SETTIMANA\s+\d+/i) ||
      line.match(/^PROGRAMMA DI ALLENAMENTO/i) ||
      line.match(/^Antonio Crapanzano/i)
    ) {
      continue;
    }

    let inlineAlternative: string | undefined = undefined;
    if (line.match(/Alternative:\s*/i)) {
      const parts = line.split(/Alternative:\s*/i);
      line = parts[0].trim();
      inlineAlternative = parts[1].trim();
    }

    const cardMatch = line.match(/^([A-Z])\s+(.+)$/);

    if (cardMatch) {
      const letter = cardMatch[1];
      const restOfLine = cardMatch[2].trim();
      const lowerRest = restOfLine.toLowerCase();

      const isReserved = RESERVED_KEYWORDS.some((kw) => lowerRest.startsWith(kw));

      if (!isReserved) {
        if (currentEx) {
          exercises.push(currentEx);
        }

        currentEx = {
          orderLetter: letter,
          rawName: restOfLine,
          alternative_exercise: inlineAlternative,
          sets: 3,
          repsTarget: '10-12',
          isTimeBased: false,
          durationSeconds: undefined,
          restSeconds: 60,
          restDisplay: '01:00',
          notes: '',
          isParsingNotes: false,
        };
        continue;
      }
    }

    if (!currentEx) continue;

    if (inlineAlternative && !currentEx.alternative_exercise) {
      currentEx.alternative_exercise = inlineAlternative;
    }

    if (line.includes('Serie')) {
      currentEx.isParsingNotes = false;
      const setsMatch = line.match(/Serie\s+(\d+)/i);
      if (setsMatch) currentEx.sets = parseInt(setsMatch[1], 10);

      if (line.includes('Periodo')) {
        currentEx.isTimeBased = true;
        currentEx.repsTarget = '';
        const durMatch = line.match(/Periodo\s+(\d{2}:\d{2})/i);
        if (durMatch) {
          const parts = durMatch[1].split(':');
          currentEx.durationSeconds = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
        }
      } else {
        const repsMatch = line.match(/Ripetizioni\s+([\d\-\sx\slato]+?)(?:\s+\d{2}(?::\d{2})?)?$/i);
        if (repsMatch) {
          currentEx.repsTarget = repsMatch[1].trim();
        }
      }

      if (line.includes('No Recupero')) {
        currentEx.restSeconds = 0;
        currentEx.restDisplay = 'No Recupero';
      } else {
        const restMatch = line.match(/(\d{2}:\d{2})\s*$/);
        if (restMatch) {
          currentEx.restDisplay = restMatch[1];
          const parts = restMatch[1].split(':');
          currentEx.restSeconds = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
        }
      }
      continue;
    }

    if (line.match(/^Notes?:\s*/i)) {
      currentEx.notes = line.replace(/^Notes?:\s*/i, '').trim();
      currentEx.isParsingNotes = true;
      continue;
    }

    if (currentEx.isParsingNotes) {
      currentEx.notes += (currentEx.notes ? ' ' : '') + line;
    }
  }

  if (currentEx) {
    exercises.push(currentEx);
  }

  return exercises;
}

/**
 * Raggruppa gli esercizi in Giorni
 */
function groupExercisesByDays(exercises: any[]) {
  const days: { dayName: string; exercises: any[] }[] = [];
  let currentDayExercises: any[] = [];
  let dayCounter = 1;

  for (const ex of exercises) {
    if (ex.orderLetter === 'A' && currentDayExercises.length > 0) {
      days.push({
        dayName: `GIORNO ${dayCounter}`,
        exercises: [...currentDayExercises],
      });
      dayCounter++;
      currentDayExercises = [];
    }
    delete ex.isParsingNotes;
    currentDayExercises.push(ex);
  }

  if (currentDayExercises.length > 0) {
    days.push({
      dayName: `GIORNO ${dayCounter}`,
      exercises: [...currentDayExercises],
    });
  }

  return days;
}

/**
 * Parser Deterministico Client-Side
 */
export const parseLocalPDFWorkoutText = (
  pages: { pageNumber: number; text: string; lines: string[] }[],
  defaultTitle: string = 'Programma di Allenamento'
): ParsedPDFWorkout => {
  let title = defaultTitle;
  const fullText = pages.map((p) => p.text).join('\n');

  const nameMatch = fullText.match(/(?:PROGRAMMA DI ALLENAMENTO\s+)([A-Za-z\s]+)/i);
  if (nameMatch && nameMatch[1]) {
    const athleteName = nameMatch[1].trim().split('\n')[0].trim();
    if (athleteName && athleteName.length > 2) {
      title = `Programma di Allenamento - ${athleteName}`;
    }
  }

  const weeks: { weekNumber: number; days: { dayName: string; exercises: any[] }[] }[] = [];

  pages.forEach((page, idx) => {
    const weekNum = idx + 1;
    const rawExList = parsePageLines(page.lines);
    const days = groupExercisesByDays(rawExList);

    weeks.push({
      weekNumber: weekNum,
      days,
    });
  });

  return {
    title,
    totalWeeks: weeks.length || 1,
    weeks,
  };
};

/**
 * Funzione principale per l'analisi del PDF:
 * Utilizza ESCLUSIVAMENTE la chiave API Google Gemini per la massima precisione visiva e multimodale.
 */
export const parsePDFWorkoutFile = async (
  file: File,
  customApiKey?: string
): Promise<{ success: boolean; data?: ParsedPDFWorkout; error?: string }> => {
  const envKey =
    typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)
      : undefined;
  const storageKey =
    typeof window !== 'undefined' ? localStorage.getItem('gemini_api_key') : null;
  const activeGeminiKey = (customApiKey || envKey || storageKey || '').trim();

  if (!activeGeminiKey) {
    return {
      success: false,
      error:
        'Chiave API Gemini richiesta. Inserisci la tua API Key Gemini nel riquadro per analizzare la scheda PDF.',
    };
  }

  try {
    console.log('🤖 Esecuzione Google Gemini Multimodal Vision AI sul PDF...');
    const geminiResult = await parsePDFWithDirectGemini(file, activeGeminiKey);
    if (geminiResult && geminiResult.weeks && geminiResult.weeks.length > 0) {
      return { success: true, data: geminiResult };
    } else {
      return {
        success: false,
        error: 'Gemini non ha trovato esercizi validi all\'interno del file PDF.',
      };
    }
  } catch (geminiErr: any) {
    console.error('❌ Errore durante la chiamata Gemini API:', geminiErr);
    let errorMsg = geminiErr.message || 'Errore durante la chiamata a Google Gemini.';
    if (errorMsg.includes('API_KEY_INVALID') || errorMsg.includes('400')) {
      errorMsg = 'Chiave API Gemini non valida. Verifica la chiave inserita.';
    } else if (errorMsg.includes('429') || errorMsg.includes('QUOTA')) {
      errorMsg = 'Limite di richieste Gemini superato (Quota Exceeded). Riprova tra poco.';
    }
    return {
      success: false,
      error: errorMsg,
    };
  }
};
