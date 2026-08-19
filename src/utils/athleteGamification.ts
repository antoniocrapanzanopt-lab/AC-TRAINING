/**
 * Motore di Gamification & Trofei per l'Atleta
 * Valuta progressi, record, allenamenti e costanza assegnando livelli ed XP.
 */

import { AthleteMaxLift, AthleteMetric } from '../types/metrics';

export type AchievementCategory = 'workout' | 'strength' | 'checkin' | 'dedication';
export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'diamond';

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  tier: AchievementTier;
  icon: string;
  xpValue: number;
  isUnlocked: boolean;
  currentProgress: number;
  targetProgress: number;
  progressLabel: string;
  unlockedDate?: string;
}

export interface AthleteLevelInfo {
  level: number;
  levelTitle: string;
  totalXP: number;
  currentLevelXP: number;
  nextLevelXP: number;
  progressPercent: number;
  unlockedBadgesCount: number;
  totalBadgesCount: number;
}

const LEVEL_TIERS = [
  { level: 1, title: 'Recluta AC', minXP: 0 },
  { level: 2, title: 'Atleta Costante', minXP: 100 },
  { level: 3, title: 'Guerriero del Ferro', minXP: 300 },
  { level: 4, title: 'Atleta Avanzato', minXP: 600 },
  { level: 5, title: 'Specialista della Forza', minXP: 1000 },
  { level: 6, title: 'Macchina da Guerra', minXP: 1500 },
  { level: 7, title: 'Titano AC', minXP: 2200 },
  { level: 8, title: 'Maestro del Metodo', minXP: 3000 },
  { level: 9, title: 'Élite Performance', minXP: 4000 },
  { level: 10, title: 'Leggenda Vivente', minXP: 5500 },
];

/**
 * Valuta tutti gli achievement dell'atleta partendo dai dati reali
 */
export function evaluateAthleteAchievements(params: {
  completedWorkoutsCount: number;
  maxLifts: AthleteMaxLift[];
  metrics: AthleteMetric[];
}): { badges: AchievementBadge[]; levelInfo: AthleteLevelInfo } {
  const { completedWorkoutsCount, maxLifts, metrics } = params;

  // Calcolo carichi massimi su qualsiasi esercizio
  const highest1RM = maxLifts.reduce((max, l) => Math.max(max, l.calculated_1rm || 0), 0);
  const totalPRsCount = maxLifts.length;
  const totalCheckinsCount = metrics.length;

  const rawBadges: Omit<AchievementBadge, 'isUnlocked' | 'unlockedDate'>[] = [
    // ── Categoria: Allenamento
    {
      id: 'first-step',
      title: 'Primo Passo',
      description: 'Completa il tuo primo allenamento nel portale.',
      category: 'workout',
      tier: 'bronze',
      icon: '🎯',
      xpValue: 50,
      currentProgress: Math.min(1, completedWorkoutsCount),
      targetProgress: 1,
      progressLabel: `${Math.min(1, completedWorkoutsCount)}/1 Allenamento`,
    },
    {
      id: 'workout-5',
      title: 'Riscaldamento Fatto',
      description: 'Completa con successo 5 sessioni di allenamento.',
      category: 'workout',
      tier: 'bronze',
      icon: '🥉',
      xpValue: 100,
      currentProgress: Math.min(5, completedWorkoutsCount),
      targetProgress: 5,
      progressLabel: `${Math.min(5, completedWorkoutsCount)}/5 Allenamenti`,
    },
    {
      id: 'workout-15',
      title: 'Macchina da Guerra',
      description: 'Completa 15 sessioni di allenamento nel tuo programma.',
      category: 'workout',
      tier: 'silver',
      icon: '🥈',
      xpValue: 250,
      currentProgress: Math.min(15, completedWorkoutsCount),
      targetProgress: 15,
      progressLabel: `${Math.min(15, completedWorkoutsCount)}/15 Allenamenti`,
    },
    {
      id: 'workout-30',
      title: 'Costanza Titanica',
      description: 'Raggiungi 30 sessioni di allenamento completate.',
      category: 'workout',
      tier: 'gold',
      icon: '🥇',
      xpValue: 500,
      currentProgress: Math.min(30, completedWorkoutsCount),
      targetProgress: 30,
      progressLabel: `${Math.min(30, completedWorkoutsCount)}/30 Allenamenti`,
    },
    {
      id: 'workout-50',
      title: 'Leggenda AC',
      description: 'Completa oltre 50 sessioni di allenamento guidate.',
      category: 'workout',
      tier: 'diamond',
      icon: '👑',
      xpValue: 1000,
      currentProgress: Math.min(50, completedWorkoutsCount),
      targetProgress: 50,
      progressLabel: `${Math.min(50, completedWorkoutsCount)}/50 Allenamenti`,
    },

    // ── Categoria: Forza & PR
    {
      id: 'club-100',
      title: 'Club dei 100 kg',
      description: 'Raggiungi un massimale 1RM pari o superiore a 100 kg.',
      category: 'strength',
      tier: 'silver',
      icon: '🏋️‍♂️',
      xpValue: 200,
      currentProgress: Math.min(100, highest1RM),
      targetProgress: 100,
      progressLabel: `${Math.round(highest1RM)}/100 kg`,
    },
    {
      id: 'club-150',
      title: 'Club dei 150 kg',
      description: 'Supera i 150 kg di massimale stimato 1RM.',
      category: 'strength',
      tier: 'gold',
      icon: '💥',
      xpValue: 400,
      currentProgress: Math.min(150, highest1RM),
      targetProgress: 150,
      progressLabel: `${Math.round(highest1RM)}/150 kg`,
    },
    {
      id: 'club-200',
      title: 'Club dei 200 kg',
      description: 'Raggiungi il traguardo titanico dei 200 kg di massimale 1RM.',
      category: 'strength',
      tier: 'diamond',
      icon: '⚡',
      xpValue: 800,
      currentProgress: Math.min(200, highest1RM),
      targetProgress: 200,
      progressLabel: `${Math.round(highest1RM)}/200 kg`,
    },
    {
      id: 'pr-hunter',
      title: 'Cacciatore di PR',
      description: 'Registra almeno 3 Record Personali (PR) differenti.',
      category: 'strength',
      tier: 'silver',
      icon: '🚀',
      xpValue: 150,
      currentProgress: Math.min(3, totalPRsCount),
      targetProgress: 3,
      progressLabel: `${Math.min(3, totalPRsCount)}/3 PR`,
    },

    // ── Categoria: Check-in & Monitoraggio
    {
      id: 'first-checkin',
      title: 'Primo Check-in',
      description: 'Registra la prima misurazione di peso e circonferenze.',
      category: 'checkin',
      tier: 'bronze',
      icon: '⚖️',
      xpValue: 50,
      currentProgress: Math.min(1, totalCheckinsCount),
      targetProgress: 1,
      progressLabel: `${Math.min(1, totalCheckinsCount)}/1 Check-in`,
    },
    {
      id: 'checkin-5',
      title: 'Scienza & Metodo',
      description: 'Registra con costanza almeno 5 check-in periodici.',
      category: 'checkin',
      tier: 'silver',
      icon: '📈',
      xpValue: 200,
      currentProgress: Math.min(5, totalCheckinsCount),
      targetProgress: 5,
      progressLabel: `${Math.min(5, totalCheckinsCount)}/5 Check-in`,
    },
    {
      id: 'checkin-10',
      title: 'Metamorfosi',
      description: 'Raggiungi 10 check-in per tracciare la tua trasformazione completa.',
      category: 'checkin',
      tier: 'gold',
      icon: '💎',
      xpValue: 500,
      currentProgress: Math.min(10, totalCheckinsCount),
      targetProgress: 10,
      progressLabel: `${Math.min(10, totalCheckinsCount)}/10 Check-in`,
    },
  ];

  let totalXP = 0;
  const badges: AchievementBadge[] = rawBadges.map((b) => {
    const isUnlocked = b.currentProgress >= b.targetProgress;
    if (isUnlocked) {
      totalXP += b.xpValue;
    }
    return {
      ...b,
      isUnlocked,
    };
  });

  // Calcolo Livello Atleta
  let currentLevelObj = LEVEL_TIERS[0];
  let nextLevelObj = LEVEL_TIERS[1];

  for (let i = LEVEL_TIERS.length - 1; i >= 0; i--) {
    if (totalXP >= LEVEL_TIERS[i].minXP) {
      currentLevelObj = LEVEL_TIERS[i];
      nextLevelObj = LEVEL_TIERS[i + 1] || LEVEL_TIERS[i];
      break;
    }
  }

  const isMaxLevel = currentLevelObj.level === LEVEL_TIERS[LEVEL_TIERS.length - 1].level;
  const currentLevelMin = currentLevelObj.minXP;
  const nextLevelMin = isMaxLevel ? currentLevelObj.minXP + 1000 : nextLevelObj.minXP;
  const xpInCurrentLevel = totalXP - currentLevelMin;
  const xpNeededForNext = nextLevelMin - currentLevelMin;
  const progressPercent = isMaxLevel ? 100 : Math.min(100, Math.max(0, Math.round((xpInCurrentLevel / xpNeededForNext) * 100)));

  const levelInfo: AthleteLevelInfo = {
    level: currentLevelObj.level,
    levelTitle: currentLevelObj.title,
    totalXP,
    currentLevelXP: totalXP,
    nextLevelXP: nextLevelMin,
    progressPercent,
    unlockedBadgesCount: badges.filter((b) => b.isUnlocked).length,
    totalBadgesCount: badges.length,
  };

  return { badges, levelInfo };
}
