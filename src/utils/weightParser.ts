/**
 * Utility per il parsing e la normalizzazione di carichi (kg) e ripetizioni.
 * Gestisce formati italiani (virgola decimale), suffissi unità (kg, KG),
 * percentuali (72,5%), range (18-20kg) e note descrittive.
 */

export interface ParsedWeightResult {
  /** Valore numerico normalizzato per colonna DB NUMERIC(6,2) */
  weightKg: number;
  /** True se il valore originale rappresentava una percentuale (es. 75%) */
  isPercentage: boolean;
  /** Nota testuale preservata se presente testo descrittivo (es. "per lato", "Top Set") */
  note?: string;
  /** Stringa originale ripulita */
  rawCleaned: string;
}

/**
 * Converte qualsiasi input carico (stringa o numero) in un valore numerico valido per Supabase NUMERIC(6,2).
 * Non restituisce mai NaN o valori nulli invalidi.
 */
export function parseWeightToNumber(input: unknown): ParsedWeightResult {
  if (input === null || input === undefined) {
    return { weightKg: 0, isPercentage: false, rawCleaned: '' };
  }

  if (typeof input === 'number') {
    if (isNaN(input) || !isFinite(input)) {
      return { weightKg: 0, isPercentage: false, rawCleaned: '' };
    }
    // Arrotonda a 2 cifre decimali
    const rounded = Math.round(input * 100) / 100;
    return { weightKg: Math.max(0, rounded), isPercentage: false, rawCleaned: String(input) };
  }

  const rawStr = String(input).trim();
  if (!rawStr) {
    return { weightKg: 0, isPercentage: false, rawCleaned: '' };
  }

  const isPercentage = rawStr.includes('%');

  // Normalizza virgole in punti per i decimali
  let cleaned = rawStr.replace(',', '.');

  // Gestione range come "18-20Kg" o "9-14" o "60-65%"
  // Prendiamo il valore più alto del range come carico effettivo
  const rangeMatch = cleaned.match(/([\d.]+)\s*[-–—/]\s*([\d.]+)/);
  if (rangeMatch && rangeMatch[2]) {
    const highVal = parseFloat(rangeMatch[2]);
    if (!isNaN(highVal)) {
      return {
        weightKg: Math.max(0, Math.round(highVal * 100) / 100),
        isPercentage,
        note: rawStr.includes('per lato') || rawStr.includes('disco') ? rawStr : undefined,
        rawCleaned: rawStr,
      };
    }
  }

  // Estrazione del primo numero decimale trovato (es. "80.5 kg", "22.5 Top Set", "disco da 5 Kg")
  const numMatch = cleaned.match(/([\d]+(?:\.[\d]+)?)/);
  if (numMatch && numMatch[1]) {
    const parsed = parseFloat(numMatch[1]);
    if (!isNaN(parsed) && isFinite(parsed)) {
      const rounded = Math.max(0, Math.round(parsed * 100) / 100);
      
      // Estrae eventuale nota qualitativa se c'è testo reale oltre al numero e suffissi
      const nonNumericText = cleaned
        .replace(numMatch[1], '')
        .replace(/kg|kilos?|chili|%|[.,]/gi, '')
        .trim();

      return {
        weightKg: rounded,
        isPercentage,
        note: nonNumericText.length >= 2 ? rawStr.trim() : undefined,
        rawCleaned: rawStr,
      };
    }
  }

  // Se è testo speciale come "FISSO", "CORPO LIBERO", "QB"
  return {
    weightKg: 0,
    isPercentage: false,
    note: rawStr,
    rawCleaned: rawStr,
  };
}

/**
 * Converte qualsiasi input ripetizioni (stringa o numero) in un integer valido per Supabase INTEGER.
 * Gestisce:
 * - "10-12" -> 10 (target minimo)
 * - "3x10" -> 10 (ripetizioni della serie)
 * - "1 min" -> 60 (secondi per esercizi isometrici/tempo)
 * - "45s" -> 45
 */
export function parseRepsToNumber(input: unknown, fallbackTarget?: number): number {
  if (input === null || input === undefined) {
    return fallbackTarget !== undefined ? Math.max(0, fallbackTarget) : 0;
  }

  if (typeof input === 'number') {
    if (isNaN(input) || !isFinite(input)) {
      return fallbackTarget || 0;
    }
    return Math.max(0, Math.round(input));
  }

  const raw = String(input).trim();
  if (!raw) {
    return fallbackTarget || 0;
  }

  // Gestione formato tipo "3x10" o "4 x 8"
  const multiMatch = raw.match(/\d+\s*[xX*]\s*(\d+)/);
  if (multiMatch && multiMatch[1]) {
    const reps = parseInt(multiMatch[1], 10);
    if (!isNaN(reps)) return reps;
  }

  // Gestione formato tipo tempo "1 min" -> 60, "2 min" -> 120
  const minMatch = raw.match(/(\d+)\s*(?:min|m)(?:['"s]|$)/i);
  if (minMatch && minMatch[1]) {
    const mins = parseInt(minMatch[1], 10);
    if (!isNaN(mins)) return mins * 60;
  }

  // Gestione formato tipo secondi "45s" o "45 sec"
  const secMatch = raw.match(/(\d+)\s*(?:sec|s)(?:['"s]|$)/i);
  if (secMatch && secMatch[1]) {
    const secs = parseInt(secMatch[1], 10);
    if (!isNaN(secs)) return secs;
  }

  // Gestione range come "10-12" -> prende il primo valore
  const rangeMatch = raw.match(/(\d+)\s*[-–—/]\s*\d+/);
  if (rangeMatch && rangeMatch[1]) {
    const firstNum = parseInt(rangeMatch[1], 10);
    if (!isNaN(firstNum)) return firstNum;
  }

  // Estrazione del primo numero intero disponibile
  const singleNum = raw.match(/(\d+)/);
  if (singleNum && singleNum[1]) {
    const parsed = parseInt(singleNum[1], 10);
    if (!isNaN(parsed)) return parsed;
  }

  return fallbackTarget !== undefined ? fallbackTarget : 0;
}

/**
 * Formatta un carico per la visualizzazione all'utente
 */
export function formatWeightDisplay(weightKg: number | null | undefined, isPercentage?: boolean): string {
  if (weightKg === null || weightKg === undefined || weightKg === 0) {
    return '0 kg';
  }
  if (isPercentage) {
    return `${weightKg}%`;
  }
  // Se numero intero mostra senza decimali, altrimenti con virgola italiana
  const formatted = weightKg % 1 === 0 ? String(weightKg) : weightKg.toFixed(1).replace('.', ',');
  return `${formatted} kg`;
}
