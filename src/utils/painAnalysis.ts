/**
 * Utility per l'analisi e la rilevazione clinica/motoria dei fastidi e dolori post-workout.
 * 
 * Regole:
 * - Nei questionari strutturati ("Questionario: Fatica X/5, Dolore Articolare Y/5, Pump Z/5"):
 *   Dolore Articolare 1/5 e 2/5 indicano assenza di dolore o lieve affaticamento fisiologico, NON un infortunio o fastidio da alert.
 *   L'alert "Fastidio Segnalato" scatta SOLO per punteggi >= 3/5 o in presenza di fastidi specifici compilati.
 * - Nelle note libere: intercetta parole chiave cliniche filtrando le negazioni ("nessun dolore", "0 fastidio", "tutto ok").
 */

export function isPainFeedback(text?: string | null): boolean {
  if (!text || !text.trim()) return false;
  const lower = text.toLowerCase().trim();

  // 1. Questionario standard di fine sessione
  if (lower.startsWith('questionario:')) {
    // Estrai il punteggio numerico di Dolore Articolare
    const jointMatch = lower.match(/dolore articolare\s*:?\s*([0-9]+)\s*\/\s*5/i);
    const jointPainScore = jointMatch ? parseInt(jointMatch[1], 10) : 1;

    // Controlla se l'atleta ha inserito specifici dettagli nel campo facoltativo "Fastidi"
    const hasExplicitReports = 
      lower.includes('fastidi:') && 
      !lower.includes('fastidi: []') && 
      !lower.includes('fastidi: nessun') && 
      !lower.includes('fastidi: no');

    // Alert solo se dolore >= 3/5 o se c'è un report specifico
    return jointPainScore >= 3 || hasExplicitReports;
  }

  // 2. Negazioni esplicite nelle note
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

  // 3. Parole chiave cliniche di dolore articolare/muscolare acuto
  return /dolore|fastidio|fitta|fitte|fittina|infortunio|strappo|stiramento|infiammazione|tendinite|contrattura|bloccato|pizzico|male acuto|spalla bloccata|fitte al ginocchio/i.test(lower);
}
