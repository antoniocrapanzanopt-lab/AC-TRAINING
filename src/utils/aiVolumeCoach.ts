import { MuscleVolumeDetail, VolumeSummaryResult, MuscleGroup } from './muscleVolumeCalculator';
import { WorkoutExercise } from '../types/workout';
import { ExerciseItem } from '../types/exercise';

export type RecommendationPriority = 'high' | 'medium' | 'low';
export type RecommendationCategory = 'critical' | 'optimization' | 'distribution' | 'data_quality';

export interface ExerciseChangePlan {
  exerciseId?: string;
  exerciseName: string;
  dayName: string;
  currentSets: number;
  newSets: number;
  deltaSets: number;
  type?: 'direct' | 'indirect';
  reason?: string;
}

export interface ActionPayload {
  type: 'reduce_sets' | 'increase_sets' | 'add_exercise' | 'spread_volume';
  targetMuscle: MuscleGroup;
  exerciseNames?: string[];
  setsDelta?: number; // es. -2 o +3
  suggestedExerciseName?: string;
  suggestedSets?: number;
  dayName?: string;
  plannedChanges?: ExerciseChangePlan[];
  beforeSummary?: string;
  afterSummary?: string;
  how?: string;
  why?: string;
}

export interface VolumeCoachRecommendation {
  id: string;
  category: RecommendationCategory;
  priority: RecommendationPriority;
  muscleGroup: MuscleGroup | 'Generale';
  diagnosis: string;
  recommendation: string;
  reason: string;
  how?: string;
  why?: string;
  beforeSummary?: string;
  afterSummary?: string;
  expectedImpact: string;
  involvedExercises?: string[];
  plannedChanges?: ExerciseChangePlan[];
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
 * Calcola in modo deterministico e trasparente il piano di modifiche esercizio per esercizio
 */
function calculatePlannedExerciseChanges(params: {
  actionType: 'reduce_sets' | 'increase_sets';
  targetMuscle: MuscleGroup;
  targetDelta: number;
  targetExercisesList: { name: string; sets: number; type: 'direct' | 'indirect'; day: string }[];
  allExercises: Partial<WorkoutExercise>[];
  preferredExerciseNames?: string[];
}): {
  plannedChanges: ExerciseChangePlan[];
  howText: string;
} {
  const { actionType, targetMuscle, targetDelta, targetExercisesList, allExercises, preferredExerciseNames } = params;
  const plannedChanges: ExerciseChangePlan[] = [];
  const absDelta = Math.abs(targetDelta);

  // Trova gli esercizi candidati presenti nella scheda (match per nome)
  const candidateExercises = allExercises.filter((ex) => {
    if (!ex.name) return false;
    const nameLower = ex.name.toLowerCase();

    // Se ci sono nomi preferiti
    if (preferredExerciseNames && preferredExerciseNames.length > 0) {
      if (preferredExerciseNames.some((p) => nameLower.includes(p.toLowerCase()) || p.toLowerCase().includes(nameLower))) {
        return true;
      }
    }

    // Altrimenti controlla se è nella exercisesList del distretto muscolare
    return targetExercisesList.some((item) => item.name.toLowerCase() === nameLower);
  });

  if (actionType === 'reduce_sets') {
    let remainingToReduce = absDelta;
    // Priorità agli esercizi con più serie o che si trovano nei giorni di picco
    const sorted = [...candidateExercises].sort((a, b) => (Number(b.sets) || 0) - (Number(a.sets) || 0));

    for (const ex of sorted) {
      if (remainingToReduce <= 0) break;
      const currentSets = Number(ex.sets) || 3;
      if (currentSets <= 1) continue; // non ridurre a zero

      const maxCanReduce = Math.max(1, currentSets - 2); // lascia almeno 2 serie se possibile
      const reduceCount = Math.min(remainingToReduce, Math.min(2, maxCanReduce));

      if (reduceCount > 0) {
        remainingToReduce -= reduceCount;
        plannedChanges.push({
          exerciseId: ex.id,
          exerciseName: ex.name || 'Esercizio',
          dayName: ex.day_name || 'Giorno non spec.',
          currentSets,
          newSets: currentSets - reduceCount,
          deltaSets: -reduceCount,
          type: 'direct',
          reason: `Decongestiona ${ex.day_name || 'la seduta'} eliminando il volume spazzatura`,
        });
      }
    }

    const howText =
      plannedChanges.length > 0
        ? `Riduce ${absDelta - remainingToReduce} serie complessive ripartite su: ${plannedChanges
            .map((p) => `${p.exerciseName} in ${p.dayName} (${p.currentSets} ➔ ${p.newSets}s)`)
            .join(', ')}.`
        : `Riduce ${absDelta} serie dagli esercizi target di ${targetMuscle} per riportare il carico sotto MRV.`;

    return { plannedChanges, howText };
  } else {
    // increase_sets
    let remainingToAdd = absDelta;

    // Se abbiamo esercizi candidati in scheda
    if (candidateExercises.length > 0) {
      for (const ex of candidateExercises) {
        if (remainingToAdd <= 0) break;
        const currentSets = Number(ex.sets) || 3;
        const addCount = Math.min(remainingToAdd, 2);

        remainingToAdd -= addCount;
        plannedChanges.push({
          exerciseId: ex.id,
          exerciseName: ex.name || 'Esercizio',
          dayName: ex.day_name || 'Giorno non spec.',
          currentSets,
          newSets: currentSets + addCount,
          deltaSets: addCount,
          type: 'direct',
          reason: `Incrementa lo stimolo target su ${ex.day_name || 'la seduta'} senza alterare la struttura base`,
        });
      }
    }

    const howText =
      plannedChanges.length > 0
        ? `Aggiunge ${absDelta - remainingToAdd} serie distribuite su: ${plannedChanges
            .map((p) => `${p.exerciseName} in ${p.dayName} (${p.currentSets} ➔ ${p.newSets}s)`)
            .join(', ')}.`
        : `Aggiunge ${absDelta} serie efficaci inserendo o incrementando un esercizio per ${targetMuscle}.`;

    return { plannedChanges, howText };
  }
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
      const targetDelta = -Math.min(excess > 0 ? excess : 2, 4);
      const topEx = d.exercisesList.slice(0, 3).map((e) => e.name);
      const peakInfo = muscleDaySets[d.muscleGroup];

      const { plannedChanges, howText } = calculatePlannedExerciseChanges({
        actionType: 'reduce_sets',
        targetMuscle: d.muscleGroup,
        targetDelta,
        targetExercisesList: d.exercisesList,
        allExercises: exercises,
        preferredExerciseNames: topEx,
      });

      const beforeSummary = `${d.totalSets} serie tot. (Sopra MRV max ${b.mrvMin})`;
      const afterSummary = `${Math.max(1, d.totalSets + targetDelta)} serie tot. (Rientra nel MAV Ottimale ✓)`;
      const whyText = `Il volume programmato (${d.totalSets}s) supera il massimo recuperabile fisiologico (${b.mrv} del distretto). Superata questa soglia, lo stimolo si converte in fatica sistemica e infiammazione articolare senza produrre crescita ipertrofica.`;

      recommendations.push({
        id: `mrv_${d.muscleGroup}`,
        category: 'critical',
        priority: 'high',
        muscleGroup: d.muscleGroup,
        diagnosis: `${d.muscleGroup} sopra MRV: ${d.totalSets} serie tot. (max ${b.mrvMin})${
          peakInfo ? ` con picchi in ${peakInfo.days.join(', ')}` : ''
        }`,
        recommendation: `Riduci ${Math.abs(targetDelta)} serie totali e rimuovi l'isolamento ridondante (${topEx.slice(0, 2).join(', ')}).`,
        reason: whyText,
        how: howText,
        why: whyText,
        beforeSummary,
        afterSummary,
        expectedImpact: `Recupero muscolare accelerato (+30%), prevenzione di tendiniti e maggiore freschezza neurale sulle serie pesanti.`,
        involvedExercises: topEx,
        plannedChanges,
        action: {
          type: 'reduce_sets',
          targetMuscle: d.muscleGroup,
          exerciseNames: topEx,
          setsDelta: targetDelta,
          plannedChanges,
          beforeSummary,
          afterSummary,
          how: howText,
          why: whyText,
        },
      });
      deductions += 25;
    }
  });

  // Squilibrio Agonista / Antagonista (Quads vs Femorali)
  const quads = detailMap.get('Quadricipiti');
  const femorali = detailMap.get('Femorali');
  if (quads && femorali && quads.directSets >= 14 && femorali.directSets <= 4) {
    const targetDelta = 4;
    const { plannedChanges, howText } = calculatePlannedExerciseChanges({
      actionType: 'increase_sets',
      targetMuscle: 'Femorali',
      targetDelta,
      targetExercisesList: femorali.exercisesList,
      allExercises: exercises,
    });

    const beforeSummary = `Femorali ${femorali.directSets}s vs Quads ${quads.directSets}s (Squilibrio > 3:1)`;
    const afterSummary = `Femorali ${femorali.directSets + targetDelta}s vs Quads ${quads.directSets}s (Rapporto Riequilibrato ✓)`;
    const whyText = `Il rapporto di carico tra estensori e flessori è sbilanciato oltre 3:1, generando forze di taglio anteriori sul ginocchio e instabilità pelvica.`;

    recommendations.push({
      id: 'ratio_quads_hams',
      category: 'critical',
      priority: 'high',
      muscleGroup: 'Femorali',
      diagnosis: `Squilibrio Catena Posteriore: Quads ${quads.directSets}s vs Femorali ${femorali.directSets}s`,
      recommendation: `Aggiungi 4–6 serie per i flessori del ginocchio (es. Leg Curl seduto o RDL).`,
      reason: whyText,
      how: howText,
      why: whyText,
      beforeSummary,
      afterSummary,
      expectedImpact: `Riequilibrio posturale dell'anca e prevenzione di infortuni al legamento crociato e rotuleo.`,
      involvedExercises: femorali.exercisesList.map((e) => e.name),
      plannedChanges,
      action: {
        type: 'increase_sets',
        targetMuscle: 'Femorali',
        setsDelta: targetDelta,
        suggestedExerciseName: 'Leg Curl Seduto',
        plannedChanges,
        beforeSummary,
        afterSummary,
        how: howText,
        why: whyText,
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

    if (weeklyVol < b.mevMin && b.mevMin > 0) {
      const deficit = b.mevMin - Math.round(weeklyVol);
      const targetSetsToAdd = Math.max(deficit, 3);
      const exNames = d.exercisesList.map((e) => e.name);

      const { plannedChanges, howText } = calculatePlannedExerciseChanges({
        actionType: 'increase_sets',
        targetMuscle: d.muscleGroup,
        targetDelta: targetSetsToAdd,
        targetExercisesList: d.exercisesList,
        allExercises: exercises,
      });

      const beforeSummary = `${d.directSets} serie dir. (Sotto MEV: min ${b.mevMin})`;
      const afterSummary = `${d.directSets + targetSetsToAdd} serie dir. (MEV Raggiunto ✓)`;
      const whyText = `Il volume (${d.directSets}s dirette) è al di sotto della soglia minima per innescare adattamenti ipertrofici consistenti (MEV: ${b.mevMin} serie). L'aggiunta mirata garantisce lo stimolo biologico senza sovraccaricare la sessione.`;

      recommendations.push({
        id: `mev_${d.muscleGroup}`,
        category: 'optimization',
        priority: 'medium',
        muscleGroup: d.muscleGroup,
        diagnosis: `${d.muscleGroup} sotto MEV (${d.directSets}s dir., minimo efficace: ${b.mevMin})`,
        recommendation: `Aggiungi ${targetSetsToAdd} serie dirette (aumentando i set o inserendo un complementare).`,
        reason: whyText,
        how: howText,
        why: whyText,
        beforeSummary,
        afterSummary,
        expectedImpact: `Attivazione della massima sintesi proteica e sviluppo muscolare armonioso.`,
        involvedExercises: exNames,
        plannedChanges,
        action: {
          type: 'increase_sets',
          targetMuscle: d.muscleGroup,
          setsDelta: targetSetsToAdd,
          exerciseNames: exNames,
          plannedChanges,
          beforeSummary,
          afterSummary,
          how: howText,
          why: whyText,
        },
      });
      deductions += 10;
    } else if (d.statusType === 'near_mrv' && !handledMusclesForMRV.has(d.muscleGroup)) {
      const whyText = `Volume elevato in prossimità del limite di tolleranza (${b.mrv}). Ottimale solo in fasi finali di accumulo o peaking.`;
      const howText = `Mantieni monitorata la progressione e scarica 2 serie nei giorni di affaticamento o DOMS > 48h.`;

      recommendations.push({
        id: `near_mrv_${d.muscleGroup}`,
        category: 'optimization',
        priority: 'medium',
        muscleGroup: d.muscleGroup,
        diagnosis: `${d.muscleGroup} al limite MRV (${d.totalSets} serie totali)`,
        recommendation: `Mantieni monitorata la progressione e scarica 2 serie se i DOMS persistono > 48h.`,
        reason: whyText,
        how: howText,
        why: whyText,
        beforeSummary: `${d.totalSets} serie tot. (Vicino al limite MRV ${b.mrvMin})`,
        afterSummary: `Mantenimento monitorato`,
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
    const targetDelta = -2;
    const { plannedChanges, howText } = calculatePlannedExerciseChanges({
      actionType: 'reduce_sets',
      targetMuscle: 'Tricipiti',
      targetDelta,
      targetExercisesList: tricipiti.exercisesList.filter((e) => e.type === 'direct'),
      allExercises: exercises,
    });

    const beforeSummary = `${tricipiti.directSets}s dir. + ${tricipiti.indirectSets}s ind. (Saturazione articolare)`;
    const afterSummary = `${Math.max(2, tricipiti.directSets + targetDelta)}s dir. + ${tricipiti.indirectSets}s ind. (Ottimale ✓)`;
    const whyText = `Le distensioni per il petto (${petto.directSets}s) sovraccaricano già i gomiti. Un volume di isolamento eccessivo crea infiammazioni tendinee senza benefici ipertrofici aggiuntivi.`;

    recommendations.push({
      id: 'synergy_triceps',
      category: 'optimization',
      priority: 'medium',
      muscleGroup: 'Tricipiti',
      diagnosis: `Tricipiti con alto carico indiretto da spinte (${tricipiti.indirectSets}s ind. + ${tricipiti.directSets}s dir.)`,
      recommendation: `Riduci 2–4 serie di isolamento monoarticolare mantenendo solo movimenti a cavo/allungamento.`,
      reason: whyText,
      how: howText,
      why: whyText,
      beforeSummary,
      afterSummary,
      expectedImpact: `Salute preservata dell'articolazione del gomito e maggiore forza nelle spinte pesanti.`,
      involvedExercises: tricipiti.exercisesList.filter((e) => e.type === 'direct').map((e) => e.name),
      plannedChanges,
      action: {
        type: 'reduce_sets',
        targetMuscle: 'Tricipiti',
        setsDelta: targetDelta,
        exerciseNames: tricipiti.exercisesList.filter((e) => e.type === 'direct').map((e) => e.name),
        plannedChanges,
        beforeSummary,
        afterSummary,
        how: howText,
        why: whyText,
      },
    });
    deductions += 8;
  }

  // ── 3. DISTRIBUZIONE SETTIMANALE & JUNK VOLUME (Unificato per distretto) ─────────
  for (const [mGroup, peak] of Object.entries(muscleDaySets)) {
    // Se il distretto non è già stato segnalato come MRV critico
    if (!handledMusclesForMRV.has(mGroup) && peak.days.length > 0) {
      const howText = `Suddividi le ${peak.totalPeaks} serie di ${mGroup} in 2 sessioni distinte (ad esempio max 6–8 serie a seduta).`;
      const whyText = `Oltre le 8–10 serie per seduta sullo stesso distretto, la fatica periferica degrada la tensione meccanica efficace ("junk volume").`;

      recommendations.push({
        id: `distrib_${mGroup}`,
        category: 'distribution',
        priority: 'medium',
        muscleGroup: mGroup as MuscleGroup,
        diagnosis: `Picco di volume su ${mGroup} in ${peak.dayDetails.join(', ')}`,
        recommendation: `Distribuisci il carico su 2 sedute distinte (max 6–8 serie a seduta).`,
        reason: whyText,
        how: howText,
        why: whyText,
        beforeSummary: `Picco concentrato in ${peak.days.join(', ')} (${peak.totalPeaks}s)`,
        afterSummary: `Distribuzione multi-frequenza (max 6-8s per seduta)`,
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

    const howText = `Accedi alla Libreria Esercizi o usa la Compilazione Magica IA per associare i muscoli target agli esercizi liberi.`;
    const whyText = `Gli esercizi (${unclassifiedNames.join(', ')}) non hanno un distretto muscolare primario assegnato nel database.`;

    recommendations.push({
      id: 'data_quality_review',
      category: 'data_quality',
      priority: 'low',
      muscleGroup: 'Generale',
      diagnosis: `${volumeData.needsReviewCount} esercizi richiedono mappatura distretto`,
      recommendation: `Accedi alla Libreria Esercizi o usa la Compilazione Magica IA per impostare i muscoli target.`,
      reason: whyText,
      how: howText,
      why: whyText,
      beforeSummary: `${volumeData.needsReviewCount} esercizi senza distretto`,
      afterSummary: `Mappatura 100% completata`,
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
      how: 'Mantieni invariato il set scheme attuale e concentrati su carichi e RIR.',
      why: 'Il volume settimanale rispetta tutte le finestre fisiologiche di stimolo e recupero.',
      beforeSummary: 'Struttura MAV Ottimale',
      afterSummary: 'Massima Efficacia Ipertrofica',
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
