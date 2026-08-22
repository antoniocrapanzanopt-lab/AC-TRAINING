/**
 * Utility per pulire e formattare le note esecutive degli esercizi.
 * Rimuove i dump tecnici grezzi (n_s, t_w, tut, rir, rir_target, target_weight, notes:, fine note., etc.)
 * ed elimina le frasi duplicate per mostrare solo le note cliniche/tecniche chiare.
 */
export function cleanExecutiveNotes(rawNotes?: string): string {
  if (!rawNotes) return '';
  let str = rawNotes;

  // 1. Rimuovi marcatori di fine nota
  str = str.replace(/fine note\.?/gi, ' ');

  // 2. Rimuovi prefissi/marche tecniche
  str = str.replace(/\b(n_s|t_w|rir|tut|rir_target|target_weight)\s*:\s*[^.]+(\.|$)/gi, ' ');
  str = str.replace(/\b(notes|n)\s*:\s*/gi, ' ');
  str = str.replace(/\bTUT:\s*[\d\-]+/gi, ' ');
  str = str.replace(/\bRIR\s*\d+\b/gi, ' ');
  str = str.replace(/\b\d+%\s*1RM\b/gi, ' ');
  str = str.replace(/\b\d-\d-\d-\d\b/g, ' ');

  // 3. Normalizza spazi e punteggiatura
  str = str.replace(/\s+/g, ' ').trim();

  // 4. Splitta in frasi e rimuovi duplicati
  const rawSentences = str
    .split(/(?<=\.|\!|\?)\s+/)
    .map(s => s.trim().replace(/^[\.,:;\s]+/, '').replace(/[\.,:;\s]+$/, ''))
    .filter(s => s.length > 2);

  const uniqueSentences: string[] = [];
  for (const sentence of rawSentences) {
    const lower = sentence.toLowerCase();
    // Ignora frasi troppo brevi o che sono puri resti di chiavi
    if (lower === 'notes' || lower === 'tut' || lower === 'rir' || lower.startsWith('t_w')) continue;
    
    if (!uniqueSentences.some(existing => existing.toLowerCase() === lower || existing.toLowerCase().includes(lower))) {
      uniqueSentences.push(sentence);
    }
  }

  if (uniqueSentences.length === 0) return '';
  
  return uniqueSentences
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join('. ') + '.';
}

/**
 * Estrae l'eventuale tag di raggruppamento Super Serie / Circuito codificato nelle note (es. [GROUP:A] o [SS:1])
 */
export function extractGroupTagFromNotes(rawNotes?: string): { groupTag?: string; cleanNotes: string } {
  if (!rawNotes) return { cleanNotes: '' };
  const match = rawNotes.match(/^\[(?:GROUP|SS):([a-zA-Z0-9_\-]+)\]\s*/i);
  if (match) {
    const groupTag = match[1];
    const cleanNotes = rawNotes.slice(match[0].length).trim();
    return { groupTag, cleanNotes };
  }
  return { cleanNotes: rawNotes };
}

/**
 * Codifica il tag del gruppo Super Serie / Circuito nelle note per la persistenza sicura e retrocompatibile
 */
export function encodeGroupTagInNotes(cleanNotes?: string, groupTag?: string): string {
  const baseNotes = (cleanNotes || '').trim();
  if (!groupTag) return baseNotes;
  return `[GROUP:${groupTag}] ${baseNotes}`.trim();
}

