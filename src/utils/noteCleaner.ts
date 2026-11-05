/**
 * Utility per pulire e formattare le note esecutive degli esercizi.
 * Rimuove i dump tecnici grezzi (n_s, t_w, tut, rir, rir_target, target_weight, notes:, fine note., etc.)
 * ed elimina le frasi duplicate per mostrare solo le note cliniche/tecniche chiare.
 */
export function cleanExecutiveNotes(rawNotes?: string): string {
  if (!rawNotes) return '';
  let str = rawNotes;

  // 1. Rimuovi marcatori di fine nota e tag di raggruppamento (es. [GROUP:...], [SS:...], [CIRCUIT:...])
  str = str.replace(/fine note\.?/gi, ' ');
  str = str.replace(/\[(?:GROUP|SS|CIRCUIT|HIIT):[^\]]+\]\s*/gi, ' ');

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
 * Estrae l'eventuale tag di raggruppamento Super Serie / Jump Set / Circuito codificato nelle note (es. [GROUP:A] o [SS:1])
 */
export function extractGroupTagFromNotes(rawNotes?: string): { groupTag?: string; cleanNotes: string } {
  if (!rawNotes) return { cleanNotes: '' };
  const match = rawNotes.match(/\[(?:GROUP|SS|JS):([a-zA-Z0-9_\-]+)\]\s*/i);
  if (match) {
    const groupTag = match[1];
    const cleanNotes = rawNotes.replace(match[0], '').trim();
    return { groupTag, cleanNotes };
  }
  return { cleanNotes: rawNotes };
}

/**
 * Codifica il tag del gruppo Super Serie / Jump Set / Circuito nelle note per la persistenza sicura e retrocompatibile
 */
export function encodeGroupTagInNotes(cleanNotes?: string, groupTag?: string): string {
  const baseNotes = (cleanNotes || '').replace(/\[(?:GROUP|SS|JS):[a-zA-Z0-9_\-]+\]\s*/gi, '').trim();
  if (!groupTag) return baseNotes;
  return `[GROUP:${groupTag}] ${baseNotes}`.trim();
}

/**
 * Rileva e assegna automaticamente group_tag anche per le schede già salvate nel DB prima dell'introduzione di [GROUP:...],
 * riconoscendo:
 * 1) Tag espliciti [GROUP:...], [SS:...], [JS:...] nelle note;
 * 2) Menzioni di "Jump set", "Superserie", "Superset", "Biserie" nelle note;
 * 3) Coppie di esercizi consecutivi nello stesso giorno dove il primo ha recupero 0s ("No Recupero" / Jump Set da PDF) e il successivo ha recupero > 0s.
 */
export function hydrateGroupTagsForExercises<T extends {
  id?: string;
  name?: string;
  notes?: string;
  group_tag?: string;
  order_label?: string;
  rest_seconds?: number;
  week_number?: number;
  day_name?: string;
  is_time_based?: boolean;
}>(exercises: T[]): T[] {
  if (!exercises || exercises.length === 0) return exercises;

  // 1. Estrai eventuali tag espliciti [GROUP:...] dalle note
  const result = exercises.map((ex) => {
    const { groupTag } = extractGroupTagFromNotes(ex.notes);
    return {
      ...ex,
      group_tag: ex.group_tag || groupTag,
    };
  });

  // 2. Raggruppa gli indici per (week_number, day_name) così da analizzare ogni seduta in ordine
  const dayBuckets = new Map<string, number[]>();
  result.forEach((ex, idx) => {
    const key = `${ex.week_number || 1}__${(ex.day_name || 'Giorno A').trim().toLowerCase()}`;
    const bucket = dayBuckets.get(key) || [];
    bucket.push(idx);
    dayBuckets.set(key, bucket);
  });

  const jumpRegex = /\b(jump\s*set|jumpset|jump\s*serie|jumpserie|super\s*serie|superserie|superset|biserie)\b/i;

  dayBuckets.forEach((indices, dayKey) => {
    for (let i = 0; i < indices.length - 1; i++) {
      const currIdx = indices[i];
      const nextIdx = indices[i + 1];
      const curr = result[currIdx];
      const next = result[nextIdx];

      if (curr.group_tag && next.group_tag) continue;

      const currText = `${curr.notes || ''} ${curr.name || ''}`;
      const nextText = `${next.notes || ''} ${next.name || ''}`;
      const hasExplicitNoteMention = jumpRegex.test(currText) || jumpRegex.test(nextText);

      // Nei PDF importati o nelle schede con Jump Set:
      // - il primo esercizio ha "No Recupero" (0s) oppure un recupero breve di transizione (<= 45s) seguito da esercizio con recupero più lungo (>= 75s)
      // - oppure l'esercizio inizia con lettera numerata (es. "F1 ...", "F2 ...")
      const hasNumberedPrefix =
        /^[A-Z]\d+\s+/i.test((curr.name || '').trim()) &&
        /^[A-Z]\d+\s+/i.test((next.name || '').trim());

      const isJumpRestPair =
        !curr.is_time_based &&
        !next.is_time_based &&
        typeof curr.rest_seconds === 'number' &&
        typeof next.rest_seconds === 'number' &&
        (
          (curr.rest_seconds === 0 && next.rest_seconds > 0) ||
          (curr.rest_seconds > 0 && curr.rest_seconds <= 45 && next.rest_seconds >= 75)
        );

      if (hasExplicitNoteMention || hasNumberedPrefix || isJumpRestPair) {
        const tag = curr.group_tag || next.group_tag || `auto-ss-${dayKey}-${i}`;
        result[currIdx] = { ...curr, group_tag: tag };
        result[nextIdx] = { ...next, group_tag: tag };
      }
    }
  });

  return result;
}

/**
 * Estrae la configurazione Circuito/HIIT codificata nelle note (es. [CIRCUIT:3:90])
 */
export function extractCircuitConfigFromNotes(rawNotes?: string): {
  isCircuit: boolean;
  totalRounds: number;
  restBetweenRoundsSec: number;
  cleanNotes: string;
} {
  if (!rawNotes) {
    return { isCircuit: false, totalRounds: 3, restBetweenRoundsSec: 90, cleanNotes: '' };
  }
  const match = rawNotes.match(/\[(?:CIRCUIT|HIIT):(\d+):(\d+)\]\s*/i);
  if (match) {
    const totalRounds = parseInt(match[1], 10) || 3;
    const restBetweenRoundsSec = parseInt(match[2], 10) || 90;
    const cleanNotes = rawNotes.replace(match[0], '').trim();
    return {
      isCircuit: true,
      totalRounds,
      restBetweenRoundsSec,
      cleanNotes,
    };
  }
  return { isCircuit: false, totalRounds: 3, restBetweenRoundsSec: 90, cleanNotes: rawNotes };
}

/**
 * Codifica o aggiorna/rimuove la configurazione Circuito/HIIT nelle note
 */
export function encodeCircuitConfigInNotes(
  cleanNotes?: string,
  isCircuit?: boolean,
  totalRounds: number = 3,
  restBetweenRoundsSec: number = 90
): string {
  let str = (cleanNotes || '').replace(/\[(?:CIRCUIT|HIIT):(\d+):(\d+)\]\s*/gi, '').trim();
  if (isCircuit) {
    str = `[CIRCUIT:${totalRounds}:${restBetweenRoundsSec}] ${str}`.trim();
  }
  return str;
}


