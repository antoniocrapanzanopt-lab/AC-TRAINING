import { ExerciseItem } from '../../types/exercise';

/**
 * Normalizza una stringa per il confronto: minuscolo, senza accenti, senza punteggiatura superflua
 */
export const normalizeString = (str: string): string => {
  return (str || '')
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

/**
 * Calcola il coefficiente di Sørensen-Dice tra due stringhe (0.0 - 1.0)
 */
export const calculateStringSimilarity = (str1: string, str2: string): number => {
  const s1 = normalizeString(str1);
  const s2 = normalizeString(str2);

  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0;
  if (s1.includes(s2) || s2.includes(s1)) {
    const minLen = Math.min(s1.length, s2.length);
    const maxLen = Math.max(s1.length, s2.length);
    if (minLen / maxLen > 0.6) return 0.88;
  }

  const getBigrams = (string: string) => {
    const bigrams = new Set<string>();
    for (let i = 0; i < string.length - 1; i++) {
      bigrams.add(string.substring(i, i + 2));
    }
    return bigrams;
  };

  const b1 = getBigrams(s1);
  const b2 = getBigrams(s2);

  if (b1.size === 0 || b2.size === 0) return 0;

  let intersection = 0;
  b1.forEach((bigram) => {
    if (b2.has(bigram)) intersection++;
  });

  return (2.0 * intersection) / (b1.size + b2.size);
};

export interface ExerciseMatchResult {
  rawName: string;
  matchedExercise?: ExerciseItem;
  confidence: number; // 0.0 - 1.0
  suggestions: ExerciseItem[];
  status: 'exact' | 'partial' | 'unmatched';
}

/**
 * Confronta un nome di esercizio estratto con la libreria di esercizi master
 */
export const matchExerciseToCatalog = (
  rawName: string,
  catalog: ExerciseItem[]
): ExerciseMatchResult => {
  if (!rawName || !catalog || catalog.length === 0) {
    return {
      rawName,
      confidence: 0,
      suggestions: [],
      status: 'unmatched',
    };
  }

  const scored = catalog.map((item) => ({
    item,
    score: calculateStringSimilarity(rawName, item.name),
  }));

  // Ordina per punteggio decrescente
  scored.sort((a, b) => b.score - a.score);

  const topMatch = scored[0];
  const suggestions = scored.slice(0, 4).map((s) => s.item);

  if (topMatch && topMatch.score >= 0.85) {
    return {
      rawName,
      matchedExercise: topMatch.item,
      confidence: topMatch.score,
      suggestions,
      status: 'exact',
    };
  }

  if (topMatch && topMatch.score >= 0.45) {
    return {
      rawName,
      matchedExercise: topMatch.item,
      confidence: topMatch.score,
      suggestions,
      status: 'partial',
    };
  }

  return {
    rawName,
    confidence: topMatch ? topMatch.score : 0,
    suggestions: suggestions.slice(0, 3),
    status: 'unmatched',
  };
};
