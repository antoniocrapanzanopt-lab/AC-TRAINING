import { MuscleVolumeDetail, VolumeSummaryResult, MuscleGroup } from './muscleVolumeCalculator';
import { WorkoutExercise } from '../types/workout';
import { ExerciseItem } from '../types/exercise';

export type RecommendationPriority = 'high' | 'medium' | 'low';
export type RecommendationCategory = 'critical' | 'optimization' | 'distribution' | 'data_quality';

export interface ActionPayload {
  type: 'reduce_sets' | 'increase_sets' | 'add_exercise' | 'spread_volume';
  targetMuscle: MuscleGroup;
  exerciseNames?: string[];
  setsDelta?: number; // es. -2 o +3
  suggestedExerciseName?: string;
  suggestedSets?: number;
  dayName?: string;
}

export interface VolumeCoachRecommendation {
  id: string;
  category: RecommendationCategory;
  priority: RecommendationPriority;
  muscleGroup: MuscleGroup | 'Generale';
  diagnosis: string;
  recommendation: string;
  reason: string;
  expectedImpact: string;
  involvedExercises?: string[];
  action?: ActionPayload;
}

export interface VolumeCoachAnalysis {
  overallScore: number; // 0 - 100
  scoreLabel: string;
  criticalCount: number;
  optimizationCount: number;
  distributionCount: number;
  dataQualityCount: number;
  recommendations: VolumeCoachRecommendation[];
  byCategory: {
    critical: VolumeCoachRecommendation[];
    optimization: VolumeCoachRecommendation[];
    distribution: VolumeCoachRecommendation[];
    data_quality: VolumeCoachRecommendation[];
  };
}

/**
 * Motore Decisionale AI per l'ottimizzazione del volume per distretto muscolare.
 */
export function analyzeVolumeWithAI(params: {
  volumeData: VolumeSummaryResult;
  exercises: Partial<WorkoutExercise>[];
  libraryExercises?: ExerciseItem[];
  scope: 'day' | 'week' | 'mesocycle';
  totalWeeks?: number;
}): VolumeCoachAnalysis {
  const { volumeData, exercises, scope, totalWeeks = 1 } = params;
  const recommendations: VolumeCoachRecommendation[] = [];

  const emptyAnalysis: VolumeCoachAnalysis = {
    overallScore: 100,
    scoreLabel: 'Nessun volume inserito',
    criticalCount: 0,
    optimizationCount: 0,
    distributionCount: 0,
    dataQualityCount: 0,
    recommendations: [],
    byCategory: {
      critical: [],
      optimization: [],
      distribution: [],
      data_quality: [],
    },
  };

  if (volumeData.muscleDetails.length === 0) {
    return emptyAnalysis;
  }

  // Mappa dei dettagli per distretto
  const detailMap = new Map<MuscleGroup, MuscleVolumeDetail>();
  volumeData.muscleDetails.forEach((d) => detailMap.set(d.muscleGroup, d));

  let deductions = 0;

  // Calcolo picchi di volume per distretto e per giorno
  const muscleDaySets: Record<string, { days: string[]; totalPeaks: number; dayDetails: string[] }> = {};
  const dayMuscleSets: Record<string, Record<string, number>> = {};

  exercises.forEach((ex) => {
    const rawSets = Number(ex.sets) || 0;
    const day = ex.day_name || 'Giorno A';
    const nameLower = (ex.name || '').toLowerCase();

    volumeData.muscleDetails.forEach((d) => {
      const match = d.exercisesList.some((e) => e.name.toLowerCase() === nameLower && e.type === 'direct');
      if (match) {
        if (!dayMuscleSets[day]) dayMuscleSets[day] = {};
        dayMuscleSets[day][d.muscleGroup] = (dayMuscleSets[day][d.muscleGroup] || 0) + rawSets;
      }
    });
  });

  for (const [day, muscles] of Object.entries(dayMuscleSets)) {
    for (const [mGroup, sCount] of Object.entries(muscles)) {
      if (sCount >= 10 && scope !== 'day') {
        if (!muscleDaySets[mGroup]) {
          muscleDaySets[mGroup] = { days: [], totalPeaks: 0, dayDetails: [] };
        }
        muscleDaySets[mGroup].days.push(day);
        muscleDaySets[mGroup].totalPeaks += sCount;
        muscleDaySets[mGroup].dayDetails.push(`${day} (${sCount}s)`);
      }
    }
  }

  // ── 1. CONTROLLO CRITICITÀ (MRV Superato / Sbilanciamento Grave) ─────────────────
  const handledMusclesForMRV = new Set<string>();

  volumeData.muscleDetails.forEach((d) => {
    const b = d.benchmark;
    const weeklyVol =
      scope === 'mesocycle'
        ? d.directSets / Math.max(totalWeeks, 1)
        : scope === 'day'
        ? d.directSets * 2.5
        : d.directSets;

    if (weeklyVol > b.mrvMin) {
      handledMusclesForMRV.add(d.muscleGroup);
      const excess = Math.round(weeklyVol - b.mavMax);
      const topEx = d.exercisesList.slice(0, 3).map((e) => e.name);
      const peakInfo = muscleDaySets[d.muscleGroup];

      recommendations.push({
        id: `mrv_${d.muscleGroup}`,
        category: 'critical',
        priority: 'high',
        muscleGroup: d.muscleGroup,
        diagnosis: `${d.muscleGroup} sopra MRV: ${d.totalSets} serie tot. (max ${b.mrvMin})${
          peakInfo ? ` con picchi in ${peakInfo.days.join(', ')}` : ''
        }`,
        recommendation: `Riduci ${excess > 0 ? excess : 4} serie totali e rimuovi l'isolamento ridondante (${topEx.slice(0, 2).join(', ')}).`,
        reason: `Il volume programmato supera il massimo recuperabile fisiologico (${b.mrv} del distretto). Superata questa soglia, lo stimolo si converte in fatica sistemica e infiammazione articolare senza produrre crescita ipertrofica.`,
        expectedImpact: `Recupero muscolare accelerato (+30%), prevenzione di tendiniti e maggiore freschezza neurale sulle serie pesanti.`,
        involvedExercises: topEx,
        action: {
          type: 'reduce_sets',
          targetMuscle: d.muscleGroup,
          exerciseNames: topEx,
          setsDelta: -Math.min(excess > 0 ? excess : 2, 4),
        },
      });
      deductions += 25;
    }
  });

  // Squilibrio Agonista / Antagonista (Quads vs Femorali)
  const quads = detailMap.get('Quadricipiti');
  const femorali = detailMap.get('Femorali');
  if (quads && femorali && quads.directSets >= 14 && femorali.directSets <= 4) {
    recommendations.push({
      id: 'ratio_quads_hams',
      category: 'critical',
      priority: 'high',
      muscleGroup: 'Femorali',
      diagnosis: `Squilibrio Catena Posteriore: Quads ${quads.directSets}s vs Femorali ${femorali.directSets}s`,
      recommendation: `Aggiungi 4–6 serie per i flessori del ginocchio (es. Leg Curl seduto o RDL).`,
      reason: `Il rapporto di carico tra estensori e flessori è sbilanciato oltre 3:1, generando forze di taglio anteriori sul ginocchio e instabilità pelvica.`,
      expectedImpact: `Riequilibrio posturale dell'anca e prevenzione di infortuni al legamento crociato e rotuleo.`,
      involvedExercises: femorali.exercisesList.map((e) => e.name),
      action: {
        type: 'increase_sets',
        targetMuscle: 'Femorali',
        setsDelta: 4,
        suggestedExerciseName: 'Leg Curl Seduto',
      },
    });
    deductions += 15;
  }

  // ── 2. OTTIMIZZAZIONI (Sotto MEV, Saturazioni Sinergiche, Limite MRV) ─────────────
  volumeData.muscleDetails.forEach((d) => {
    const b = d.benchmark;
    const weeklyVol =
      scope === 'mesocycle'
        ? d.directSets / Math.max(totalWeeks, 1)
        : scope === 'day'
        ? d.directSets * 2.5
        : d.directSets;

    if (weeklyVol < b.mevMin && b.mevMin > 0 && d.totalSets > 0) {
      const deficit = b.mevMin - Math.round(weeklyVol);
      const targetSetsToAdd = Math.max(deficit, 3);
      const exNames = d.exercisesList.map((e) => e.name);

      recommendations.push({
        id: `mev_${d.muscleGroup}`,
        category: 'optimization',
        priority: 'medium',
        muscleGroup: d.muscleGroup,
        diagnosis: `${d.muscleGroup} sotto MEV (${d.directSets}s dir., minimo efficace: ${b.mevMin})`,
        recommendation: `Aggiungi ${targetSetsToAdd} serie dirette (aumentando i set o inserendo un complementare).`,
        reason: `Il volume è al di sotto della soglia minima per innescare adattamenti ipertrofici consistenti.`,
        expectedImpact: `Attivazione della massima sintesi proteica e sviluppo muscolare armonioso.`,
        involvedExercises: exNames,
        action: {
          type: 'increase_sets',
          targetMuscle: d.muscleGroup,
          setsDelta: targetSetsToAdd,
          exerciseNames: exNames,
        },
      });
      deductions += 10;
    } else if (d.statusType === 'near_mrv' && !handledMusclesForMRV.has(d.muscleGroup)) {
      recommendations.push({
        id: `near_mrv_${d.muscleGroup}`,
        category: 'optimization',
        priority: 'medium',
        muscleGroup: d.muscleGroup,
        diagnosis: `${d.muscleGroup} al limite MRV (${d.totalSets} serie totali)`,
        recommendation: `Mantieni monitorata la progressione e scarica 2 serie se i DOMS persistono > 48h.`,
        reason: `Volume elevato in prossimità del limite di tolleranza (${b.mrv}). Ottimale solo in fasi finali di accumulo.`,
        expectedImpact: `Mantenimento dell'intensità di picco senza incorrere in overreaching non funzionale.`,
        involvedExercises: d.exercisesList.map((e) => e.name),
      });
      deductions += 6;
    }
  });

  // Saturazione Tricipiti da spinte
  const tricipiti = detailMap.get('Tricipiti');
  const petto = detailMap.get('Petto');
  if (tricipiti && petto && petto.directSets >= 12 && tricipiti.indirectSets >= 8 && tricipiti.directSets >= 8) {
    recommendations.push({
      id: 'synergy_triceps',
      category: 'optimization',
      priority: 'medium',
      muscleGroup: 'Tricipiti',
      diagnosis: `Tricipiti con alto carico indiretto da spinte (${tricipiti.indirectSets}s ind. + ${tricipiti.directSets}s dir.)`,
      recommendation: `Riduci 2–4 serie di isolamento monoarticolare mantenendo solo movimenti a cavo/allungamento.`,
      reason: `Le distensioni per il petto sovraccaricano già i gomiti. Un volume di isolamento eccessivo crea infiammazioni tendinee senza benefici ipertrofici aggiuntivi.`,
      expectedImpact: `Salute preservata dell'articolazione del gomito e maggiore forza nelle spinte pesanti.`,
      involvedExercises: tricipiti.exercisesList.filter((e) => e.type === 'direct').map((e) => e.name),
      action: {
        type: 'reduce_sets',
        targetMuscle: 'Tricipiti',
        setsDelta: -2,
        exerciseNames: tricipiti.exercisesList.filter((e) => e.type === 'direct').map((e) => e.name),
      },
    });
    deductions += 8;
  }

  // ── 3. DISTRIBUZIONE SETTIMANALE & JUNK VOLUME (Unificato per distretto) ─────────
  for (const [mGroup, peak] of Object.entries(muscleDaySets)) {
    // Se il distretto non è già stato segnalato come MRV critico
    if (!handledMusclesForMRV.has(mGroup) && peak.days.length > 0) {
      recommendations.push({
        id: `distrib_${mGroup}`,
        category: 'distribution',
        priority: 'medium',
        muscleGroup: mGroup as MuscleGroup,
        diagnosis: `Picco di volume su ${mGroup} in ${peak.dayDetails.join(', ')}`,
        recommendation: `Distribuisci il carico su 2 sedute distinte (max 6–8 serie a seduta).`,
        reason: `Oltre le 8–10 serie per seduta sullo stesso distretto, la fatica periferica degrada la tensione meccanica efficace ("junk volume").`,
        expectedImpact: `Incremento del rendimento qualitativo medio per serie (+15-20% stimolo utile).`,
      });
      deductions += 6;
    }
  }

  // ── 4. QUALITÀ DATI & CLASSIFICAZIONE (Separata dal volume) ──────────────────────
  if (volumeData.needsReviewCount > 0) {
    const unclassifiedNames = volumeData.unclassifiedExercises
      .filter((e) => e.classificationType === 'Non Classificato')
      .map((e) => e.name)
      .slice(0, 4);

    recommendations.push({
      id: 'data_quality_review',
      category: 'data_quality',
      priority: 'low',
      muscleGroup: 'Generale',
      diagnosis: `${volumeData.needsReviewCount} esercizi richiedono mappatura distretto`,
      recommendation: `Accedi alla Libreria Esercizi o usa la Compilazione Magica IA per impostare i muscoli target.`,
      reason: `Gli esercizi (${unclassifiedNames.join(', ')}) non hanno un distretto muscolare assegnato.`,
      expectedImpact: `Precisione del 100% nei calcoli del volume settimanale e nel Radar Chart.`,
      involvedExercises: unclassifiedNames,
    });
  }

  // Se tutto è perfettamente bilanciato
  if (recommendations.length === 0) {
    recommendations.push({
      id: 'optimal_volume_all',
      category: 'optimization',
      priority: 'low',
      muscleGroup: 'Generale',
      diagnosis: 'Programmazione del Volume Perfettamente Bilanciata',
      recommendation: 'Mantieni questa struttura applicando sovraccarico progressivo (carico o ripetizioni).',
      reason: 'Tutti i distretti muscolari si trovano nel range MAV con frequenza e sinergie biomeccaniche ottimali.',
      expectedImpact: 'Massima risposta ipertrofica con eccellente capacità di recupero sistemico.',
    });
  }

  // Calcolo dello Score complessivo
  const overallScore = Math.max(10, Math.min(100, 100 - deductions));
  let scoreLabel = 'Eccellente (Ottimale)';
  if (overallScore < 60) scoreLabel = 'Criticità Rilevate';
  else if (overallScore < 85) scoreLabel = 'Buono con Margine di Ottimizzazione';

  const byCategory = {
    critical: recommendations.filter((r) => r.category === 'critical'),
    optimization: recommendations.filter((r) => r.category === 'optimization'),
    distribution: recommendations.filter((r) => r.category === 'distribution'),
    data_quality: recommendations.filter((r) => r.category === 'data_quality'),
  };

  return {
    overallScore,
    scoreLabel,
    criticalCount: byCategory.critical.length,
    optimizationCount: byCategory.optimization.length,
    distributionCount: byCategory.distribution.length,
    dataQualityCount: byCategory.data_quality.length,
    recommendations,
    byCategory,
  };
}
