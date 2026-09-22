/**
 * Utility per l'analisi e la rilevazione clinica/motoria dei fastidi e dolori post-workout.
 * 
 * Regole:
 * - Nei questionari strutturati ("Questionario: Fatica X/5, Dolore Articolare Y/5, Pump Z/5"):
 *   Dolore Articolare 1/5 e 2/5 indicano assenza di dolore o lieve affaticamento fisiologico, NON un infortunio o fastidio da alert.
 *   L'alert "Fastidio Segnalato" scatta SOLO per punteggi >= 3/5 o in presenza di fastidi specifici compilati.
 * - Nelle note libere: intercetta parole chiave cliniche filtrando le negazioni ("nessun dolore", "0 fastidio", "tutto ok").
 */

export interface PainFeedbackOptions {
  /** Se true, esclude le note contrassegnate come già risolte dal coach ([RISOLTO DAL COACH]) */
  ignoreResolved?: boolean;
}

/**
 * Verifica se una nota di sessione o di log contiene un fastidio o infortunio reale.
 * 
 * Regole:
 * 1. Punteggi di "Dolore Articolare" 1/5 e 2/5 indicano assenza o minimo affaticamento fisiologico:
 *    NON devono MAI far scattare l'alert, a meno che non sia descritto un fastidio specifico.
 * 2. I fastidi contrassegnati con "[RISOLTO" vengono considerati archiviati se ignoreResolved = true.
 * 3. Le negazioni esplicite ("nessun dolore", "0 fastidio", "tutto ok") vengono filtrate.
 */
export function isPainFeedback(text?: string | null, options?: PainFeedbackOptions): boolean {
  if (!text || !text.trim()) return false;
  const lower = text.toLowerCase().trim();

  // 1. Esclusione se già contrassegnato come risolto dal coach (se richiesto)
  if (options?.ignoreResolved && lower.includes('[risolto')) {
    return false;
  }

  // 2. Questionario strutturato o presenza di indicatore Dolore Articolare
  const jointMatch = lower.match(/dolore articolare\s*:?\s*([0-9]+)\s*\/\s*5/i);
  if (jointMatch) {
    const jointPainScore = parseInt(jointMatch[1], 10);

    // Dettagli specifici nel campo fastidi
    const hasExplicitReports = 
      lower.includes('fastidi:') && 
      !lower.includes('fastidi: []') && 
      !lower.includes('fastidi: nessun') && 
      !lower.includes('fastidi: no') &&
      !lower.includes('fastidi: n/a') &&
      !lower.includes('fastidi: assenti') &&
      !lower.includes('fastidi: -');

    // Se il punteggio articolare è < 3 e non ci sono note specifiche di fastidio, NON è dolore
    if (jointPainScore < 3 && !hasExplicitReports) {
      return false;
    }
    if (jointPainScore >= 3 || hasExplicitReports) {
      return true;
    }
  }

  // 3. Negazioni esplicite nelle note libere
  if (
    /nessun(o|a)?\s+(dolore|fastidio|problema|male)/i.test(lower) ||
    /senza\s+(dolore|fastidio|problemi)/i.test(lower) ||
    /(dolore|fastidio)\s*:\s*0/i.test(lower) ||
    /(dolore|fastidio)\s*:\s*1\s*\/\s*5/i.test(lower) ||
    /(dolore|fastidio)\s*:\s*2\s*\/\s*5/i.test(lower) ||
    /tutto\s+(liscio|bene|ok|perfetto|regolare)/i.test(lower) ||
    lower === 'ok' ||
    lower === 'tutto ok'
  ) {
    return false;
  }

  // 4. Parole chiave cliniche di infortunio, trauma o dolore acuto
  return /dolore|fastidio|fitta|fitte|fittina|infortunio|strappo|stiramento|infiammazione|tendinite|contrattura|bloccato|pizzico|male acuto|spalla bloccata|fitte al ginocchio/i.test(lower);
}

/** Ritorna true se il testo contiene il tag di risoluzione del coach */
export function isPainResolved(text?: string | null): boolean {
  if (!text) return false;
  return text.toLowerCase().includes('[risolto');
}
