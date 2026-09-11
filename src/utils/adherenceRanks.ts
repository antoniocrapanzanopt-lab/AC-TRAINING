/**
 * Sistema di classificazione dell'aderenza basato sui Gradi Cavallereschi.
 * Design premium, sobrio, dark/tech per il portale atleti e coach.
 */

export interface AdherenceRankConfig {
  id: string;
  name: string;
  minScore: number;
  maxScore: number;
  color: string;
  colorName: string;
}

export const ADHERENCE_RANKS: readonly AdherenceRankConfig[] = [
  { id: 'senza_stendardo', name: 'Senza Stendardo', minScore: 0, maxScore: 9, color: '#64748B', colorName: 'grafite' },
  { id: 'iniziato', name: 'Iniziato', minScore: 10, maxScore: 19, color: '#3B82F6', colorName: 'blu acciaio' },
  { id: 'scudiero', name: 'Scudiero', minScore: 20, maxScore: 29, color: '#38BDF8', colorName: 'azzurro' },
  { id: 'portastendardo', name: 'Portastendardo', minScore: 30, maxScore: 39, color: '#22D3EE', colorName: 'ciano' },
  { id: 'guardia', name: 'Guardia', minScore: 40, maxScore: 49, color: '#2DD4BF', colorName: 'turchese' },
  { id: 'cavaliere', name: 'Cavaliere', minScore: 50, maxScore: 59, color: '#34D399', colorName: 'smeraldo' },
  { id: 'cavaliere_giurato', name: 'Cavaliere Giurato', minScore: 60, maxScore: 69, color: '#84CC16', colorName: 'verde lime' },
  { id: 'cavaliere_onore', name: "Cavaliere d'Onore", minScore: 70, maxScore: 79, color: '#A3E635', colorName: 'lime chiaro' },
  { id: 'cavaliere_elite', name: "Cavaliere d'Élite", minScore: 80, maxScore: 89, color: '#F59E0B', colorName: 'ambra' },
  { id: 'maestro_armi', name: "Maestro d'Armi", minScore: 90, maxScore: 99, color: '#FACC15', colorName: 'oro' },
  { id: 'gran_maestro', name: 'Gran Maestro', minScore: 100, maxScore: 100, color: '#FDE047', colorName: 'oro brillante' },
] as const;

export interface AdherenceRankResult {
  isValid: boolean;
  score: number | null;
  rank: AdherenceRankConfig | null;
  nextRank: AdherenceRankConfig | null;
  pointsToNextRank: number | null;
  nextThreshold: number | null;
  nextRankMessage: string;
  pointsRemainingMessage: string;
  tooltipText: string;
  ariaLabel: string;
  isMaxRank: boolean;
}

/**
 * Calcola il grado cavalleresco associato a una percentuale di aderenza.
 * Normalizza il valore tra 0 e 100. Restituisce uno stato neutro se il valore è non valido.
 */
export function getAdherenceRank(adherence: number | null | undefined): AdherenceRankResult {
  if (adherence === null || adherence === undefined || isNaN(adherence)) {
    return {
      isValid: false,
      score: null,
      rank: null,
      nextRank: null,
      pointsToNextRank: null,
      nextThreshold: null,
      nextRankMessage: '',
      pointsRemainingMessage: '',
      tooltipText: 'Dati insufficienti per calcolare il grado di aderenza',
      ariaLabel: 'Dati di aderenza insufficienti',
      isMaxRank: false,
    };
  }

  // Normalizza punteggio tra 0 e 100 con arrotondamento matematico
  const score = Math.min(100, Math.max(0, Math.round(adherence)));

  const rankIndex = ADHERENCE_RANKS.findIndex(
    (r) => score >= r.minScore && score <= r.maxScore
  );

  const rank = rankIndex !== -1 ? ADHERENCE_RANKS[rankIndex] : ADHERENCE_RANKS[0];
  const isMaxRank = rank.id === 'gran_maestro' || score >= 100;
  const nextRank = !isMaxRank && rankIndex < ADHERENCE_RANKS.length - 1 ? ADHERENCE_RANKS[rankIndex + 1] : null;

  const nextThreshold = nextRank ? nextRank.minScore : null;
  const pointsToNextRank = nextThreshold !== null ? Math.max(1, nextThreshold - score) : null;

  let nextRankMessage = '';
  let pointsRemainingMessage = '';

  if (nextRank && nextThreshold !== null && pointsToNextRank !== null) {
    nextRankMessage = `Prossimo grado: ${nextRank.name} al ${nextThreshold}%`;
    pointsRemainingMessage = pointsToNextRank === 1
      ? `Manca 1 punto al grado ${nextRank.name}`
      : `Mancano ${pointsToNextRank} punti al grado ${nextRank.name}`;
  } else {
    nextRankMessage = 'Grado massimo raggiunto: Gran Maestro';
    pointsRemainingMessage = 'Massimo grado d’onore raggiunto';
  }

  const tooltipText = nextRank && nextThreshold !== null && pointsToNextRank !== null
    ? `Grado: ${rank.name} (${score}%) · ${pointsRemainingMessage} (Soglia: ${nextThreshold}%)`
    : `Grado: ${rank.name} (${score}%) · Massimo grado raggiunto`;

  const ariaLabel = nextRank && nextThreshold !== null
    ? `Grado ${rank.name}, aderenza ${score} percento. Prossimo grado ${nextRank.name} al ${nextThreshold} percento.`
    : `Grado ${rank.name}, aderenza ${score} percento. Massimo grado raggiunto.`;

  return {
    isValid: true,
    score,
    rank,
    nextRank,
    pointsToNextRank,
    nextThreshold,
    nextRankMessage,
    pointsRemainingMessage,
    tooltipText,
    ariaLabel,
    isMaxRank,
  };
}
