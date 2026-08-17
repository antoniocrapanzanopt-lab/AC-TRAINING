import {
  ProgressionRule,
  ProgressionTarget,
  ProgressionRuleTemplate,
  ProgressionWeekProjection,
  ProgressionWeekPhase,
  BrainStrategyCandidate,
  BrainProgressionDecision,
} from '../../types/progression';

export interface PerformanceInput {
  sets_completed: number;
  reps_per_set: number[];
  weights_per_set: number[];
  rpe_reported?: number;
  rir_reported?: number;
  pain_level?: number; // 0 - 10
  technique_score?: number; // 1 - 5
  fatigue_reported?: 'low' | 'moderate' | 'high' | 'excessive';
}

export interface NextTargetResult {
  action: 'advance' | 'hold' | 'regress' | 'deload' | 'pause_pain' | 'substitute';
  new_target: ProgressionTarget;
  reason: string;
  increment_applied?: {
    load_kg?: number;
    reps?: number;
    sets?: number;
    rest_seconds?: number;
  };
  warnings: string[];
}

/**
 * Pre-configured Master Progression Templates
 */
export const MASTER_PROGRESSION_TEMPLATES: ProgressionRuleTemplate[] = [
  {
    id: 'tpl-linear-load',
    name: 'Sovraccarico Lineare di Peso (Forza Fondamentali 5x5)',
    method: 'linear_load',
    description: 'Incremento fisso settimanale del carico (+2.5kg) a parità di serie e ripetizioni prefissate per esercizi multiarticolari.',
    category: 'Forza',
    conditions: {
      consecutive_success_sessions: 1,
      max_consecutive_failures: 2,
      max_rpe: 9.0,
      pain_threshold_max: 2,
    },
    increments: {
      load_increment_kg: 2.5,
    },
    default_target: {
      sets: 4,
      reps: '5',
      load_kg: 80,
      rir: 'RIR 2',
      rest_seconds: 180,
      tut: '2-0-X-0',
    },
    max_steps: 6,
  },
  {
    id: 'tpl-top-set-backoff',
    name: 'Top Set ad Alta Intensità + Backoff Wave',
    method: 'rpe_progression',
    description: 'Serie primaria pesante di attivazione neurale (Top Set @ RPE 8) seguita da serie di accumulo volume con carico scalato dell\'8-10%.',
    category: 'Forza',
    conditions: {
      consecutive_success_sessions: 1,
      max_consecutive_failures: 2,
      max_rpe: 9.5,
      pain_threshold_max: 2,
    },
    increments: {
      load_increment_kg: 2.0,
    },
    default_target: {
      sets: 4,
      reps: '3-5',
      load_kg: 90,
      rir: 'RPE 8.5',
      rest_seconds: 180,
      tut: '2-0-1-0',
    },
    max_steps: 6,
  },
  {
    id: 'tpl-linear-reps',
    name: 'Progressione Ripetizioni Step-by-Step (Volume & Ipertrofia)',
    method: 'linear_reps',
    description: 'Incremento graduale del volume di ripetizioni a carico stabile (+1 rep ogni settimana) prima di eventuali salti di peso.',
    category: 'Ipertrofia',
    conditions: {
      consecutive_success_sessions: 1,
      max_consecutive_failures: 2,
      max_rpe: 8.5,
      pain_threshold_max: 2,
    },
    increments: {
      reps_increment: 1,
    },
    default_target: {
      sets: 3,
      reps: '8',
      load_kg: 50,
      rir: 'RIR 2',
      rest_seconds: 90,
      tut: '3-0-1-0',
    },
    max_steps: 6,
  },
  {
    id: 'tpl-rir-intensity',
    name: 'Periodizzazione RIR & Autoregolazione (RIR 3 -> 1 -> Deload)',
    method: 'rir_progression',
    description: 'Progressione verso il cedimento controllato: da RIR 3 (Settimana 1) a RIR 1 (Settimana 3) e RIR 0 prima dello scarico attivo.',
    category: 'Forza',
    conditions: {
      consecutive_success_sessions: 1,
      max_consecutive_failures: 2,
      pain_threshold_max: 2,
    },
    increments: {
      rir_step: 1,
    },
    default_target: {
      sets: 3,
      reps: '8',
      load_kg: 70,
      rir: 'RIR 3',
      rest_seconds: 120,
      tut: '3-0-1-0',
    },
    max_steps: 4,
  },
  {
    id: 'tpl-homegym-density',
    name: 'Progressione di Densità & Rest Scalare (Home Gym / Resistenza)',
    method: 'density_progression',
    description: 'Sovraccarico a carico costante mediante riduzione graduale dei tempi di recupero (-15s ogni settimana) e aumento del tempo sotto tensione.',
    category: 'Resistenza',
    conditions: {
      consecutive_success_sessions: 1,
      max_consecutive_failures: 2,
      pain_threshold_max: 2,
    },
    increments: {
      rest_reduction_seconds: 15,
      rest_min_cap_seconds: 45,
    },
    default_target: {
      sets: 4,
      reps: '12',
      load_kg: 40,
      rir: 'RIR 2',
      rest_seconds: 90,
      tut: '3-0-1-0',
    },
    max_steps: 4,
  },
  {
    id: 'tpl-double-progression',
    name: 'Doppia Progressione (Reps fino a Cap → Aumento Carico)',
    method: 'double_progression',
    description: 'Aumenta le ripetizioni all\'interno del range prefissato (es. 8 -> 10 reps), quindi aumenta il carico di +2.5kg e ripristina le ripetizioni iniziali.',
    category: 'Ipertrofia',
    conditions: {
      consecutive_success_sessions: 1,
      max_consecutive_failures: 2,
      max_rpe: 9.0,
      pain_threshold_max: 2,
    },
    increments: {
      reps_increment: 1,
      reps_max_cap: 10,
      reps_reset_to: 8,
      load_increment_kg: 2.5,
    },
    default_target: {
      sets: 3,
      reps: '8-10',
      load_kg: 60,
      rir: 'RIR 2',
      rest_seconds: 90,
      tut: '3-0-1-0',
    },
    max_steps: 6,
  },
  {
    id: 'tpl-technical-reset',
    name: 'Controllo TUT & Tempo Eccentrico Accentauto',
    method: 'tut_progression',
    description: 'Controllo conservativo del movimento con eccentrica controllata (4s) e fermo isometrico per rinforzare lo schema motorio.',
    category: 'Riabilitazione',
    conditions: {
      consecutive_success_sessions: 1,
      max_consecutive_failures: 2,
      pain_threshold_max: 1,
    },
    increments: {
      load_increment_kg: 1.25,
      tut_eccentric_seconds: 4,
    },
    default_target: {
      sets: 3,
      reps: '8',
      load_kg: 50,
      rir: 'RIR 3',
      rest_seconds: 90,
      tut: '4-1-1-0',
    },
    max_steps: 4,
  },
  {
    id: 'tpl-planned-deload',
    name: 'Scarico Attivo Programmato (Deload Mesociclo)',
    method: 'deload',
    description: 'Riduzione del 30% del volume (serie) e del 10% del carico per consentire supercompensazione neuromuscolare e recupero tendineo.',
    category: 'Riabilitazione',
    conditions: {
      pain_threshold_max: 2,
    },
    increments: {},
    default_target: {
      sets: 2,
      reps: '8-10',
      load_kg: 50,
      rir: 'RIR 3-4 (Scarico)',
      rest_seconds: 120,
    },
    max_steps: 1,
  },
  {
    id: 'tpl-beginner-linear',
    name: 'Progressione Principiante (Avanzamento Lineare Base)',
    method: 'linear_reps',
    description: 'Incremento di 1 ripetizione a serie ogni settimana a carico costante fino al consolidamento dello schema motorio.',
    category: 'Ipertrofia',
    conditions: {
      consecutive_success_sessions: 1,
      max_consecutive_failures: 2,
      max_rpe: 8.0,
      pain_threshold_max: 2,
    },
    increments: {
      reps_increment: 1,
      reps_max_cap: 12,
    },
    default_target: {
      sets: 3,
      reps: '8',
      load_kg: 40,
      rir: 'RIR 2-3',
      rest_seconds: 90,
      tut: '2-0-1-0',
    },
    max_steps: 5,
  },
  {
    id: 'tpl-recomposition',
    name: 'Progressione Body Recomposition (Volume & Intensità Controllati)',
    method: 'linear_sets',
    description: 'Aumento graduale del volume (da 3 a 5 serie) mantenendo un RIR costante e recuperi completi per preservare massa magra in deficit.',
    category: 'Ipertrofia',
    conditions: {
      consecutive_success_sessions: 1,
      max_consecutive_failures: 2,
      pain_threshold_max: 2,
    },
    increments: {
      sets_increment: 1,
      sets_max_cap: 5,
    },
    default_target: {
      sets: 3,
      reps: '10',
      load_kg: 55,
      rir: 'RIR 2',
      rest_seconds: 90,
      tut: '3-0-1-0',
    },
    max_steps: 4,
  },
  {
    id: 'tpl-upper-lower-focus',
    name: 'Progressione Focus Upper / Lower (Spinta & Trazione)',
    method: 'double_progression',
    description: 'Protocollo avanzato con micro-carichi (+1.25kg per Upper, +2.5kg per Lower) e progressione rapida di ripetizioni nel range 6-8.',
    category: 'Forza',
    conditions: {
      consecutive_success_sessions: 1,
      max_consecutive_failures: 2,
      max_rpe: 9.0,
      pain_threshold_max: 2,
    },
    increments: {
      reps_increment: 1,
      reps_max_cap: 8,
      reps_reset_to: 6,
      load_increment_kg: 1.25,
    },
    default_target: {
      sets: 4,
      reps: '6-8',
      load_kg: 75,
      rir: 'RIR 1-2',
      rest_seconds: 120,
      tut: '3-0-1-0',
    },
    max_steps: 6,
  },
];

/**
 * Valuta la prestazione della seduta e determina in modo deterministico il prossimo target.
 */
export function evaluateProgression(
  rule: ProgressionRule,
  performance: PerformanceInput
): NextTargetResult {
  // 1. Controllo Sicurezza e Dolore (Hard Stop Cinesiologico)
  if (
    performance.pain_level !== undefined &&
    performance.pain_level > (rule.conditions.pain_threshold_max ?? 2)
  ) {
    return {
      action: 'pause_pain',
      new_target: { ...rule.current_target },
      reason: `Segnalato fastidio/dolore livello ${performance.pain_level}/10 (soglia di sicurezza max ${rule.conditions.pain_threshold_max ?? 2}/10). Progressione temporaneamente sospesa per tutela articolare.`,
      warnings: ['Segnalazione dolore oltre soglia', 'Consigliata valutazione del coach o variante biomeccanica di scarico'],
    };
  }

  // 2. Controllo Condizione di Deload (Fatica o fine blocco)
  if (shouldDeload(rule, performance)) {
    return applyDeloadRule(rule);
  }

  // 3. Verifica Target Raggiunto
  const isTargetAchieved = checkTargetSuccess(rule, performance);

  if (isTargetAchieved) {
    return applySuccessRule(rule, performance);
  } else {
    return applyFailureRule(rule, performance);
  }
}

/**
 * Calcola l'avanzamento positivo in base al metodo configurato.
 */
export function applySuccessRule(
  rule: ProgressionRule,
  _performance: PerformanceInput
): NextTargetResult {
  const current = rule.current_target;
  const inc = rule.increments;

  switch (rule.method) {
    case 'double_progression': {
      const repsParts = current.reps.split('-').map(Number);
      const topReps = repsParts.length > 1 ? repsParts[1] : repsParts[0];
      const bottomReps = repsParts[0];
      const maxCap = inc.reps_max_cap || (topReps + 2);

      if (topReps < maxCap) {
        const nextBottom = bottomReps + (inc.reps_increment || 1);
        const nextTop = topReps + (inc.reps_increment || 1);
        const nextReps = `${nextBottom}-${nextTop}`;
        return {
          action: 'advance',
          new_target: { ...current, reps: nextReps },
          reason: `Target seduta completato con successo. Incremento volume ripetizioni (${nextReps}) mantenendo il carico di ${current.load_kg || 0}kg.`,
          increment_applied: { reps: inc.reps_increment || 1 },
          warnings: [],
        };
      } else {
        const loadInc = inc.load_increment_kg || (current.load_kg ? Math.round(current.load_kg * 0.025 * 2) / 2 : 2.5);
        const newLoad = (current.load_kg || 0) + loadInc;
        const resetReps = inc.reps_reset_to ? `${inc.reps_reset_to}` : `${bottomReps}-${bottomReps + 2}`;

        return {
          action: 'advance',
          new_target: { ...current, load_kg: newLoad, reps: resetReps },
          reason: `Top range di ripetizioni raggiunto (${topReps} reps)! Aumento carico di +${loadInc}kg (totale: ${newLoad}kg) e reset ripetizioni a ${resetReps}.`,
          increment_applied: { load_kg: loadInc },
          warnings: [],
        };
      }
    }

    case 'linear_load': {
      const loadInc = inc.load_increment_kg || 2.5;
      const newLoad = (current.load_kg || 0) + loadInc;
      return {
        action: 'advance',
        new_target: { ...current, load_kg: newLoad },
        reason: `Target serie e ripetizioni completato. Incremento lineare del carico di +${loadInc}kg (nuovo target: ${newLoad}kg).`,
        increment_applied: { load_kg: loadInc },
        warnings: [],
      };
    }

    case 'linear_reps': {
      const repsNum = parseInt(current.reps, 10) || 8;
      const nextReps = repsNum + (inc.reps_increment || 1);
      return {
        action: 'advance',
        new_target: { ...current, reps: `${nextReps}` },
        reason: `Incremento ripetizioni a carico costante (${nextReps} reps previste).`,
        increment_applied: { reps: inc.reps_increment || 1 },
        warnings: [],
      };
    }

    case 'linear_sets': {
      const maxSets = inc.sets_max_cap || 5;
      const nextSets = Math.min(maxSets, current.sets + (inc.sets_increment || 1));
      return {
        action: 'advance',
        new_target: { ...current, sets: nextSets },
        reason: `Accumulo volume: aggiunta di +${inc.sets_increment || 1} serie (totale: ${nextSets} serie).`,
        increment_applied: { sets: inc.sets_increment || 1 },
        warnings: nextSets >= maxSets ? ['Raggiunto il volume massimo programmato per il blocco'] : [],
      };
    }

    case 'rir_progression': {
      const currentRirNum = parseInt(current.rir?.replace(/\D/g, '') || '2', 10);
      const nextRirNum = Math.max(0, currentRirNum - (inc.rir_step || 1));
      return {
        action: 'advance',
        new_target: { ...current, rir: `RIR ${nextRirNum}` },
        reason: `Intensificazione programmata del blocco: margine ridotto a RIR ${nextRirNum}.`,
        warnings: nextRirNum === 0 ? ['RIR 0 (Cedimento muscolare completo): monitorare recupero'] : [],
      };
    }

    case 'density_progression': {
      const currentRest = current.rest_seconds || 90;
      const reduction = inc.rest_reduction_seconds || 15;
      const minCap = inc.rest_min_cap_seconds || 45;
      const newRest = Math.max(minCap, currentRest - reduction);
      return {
        action: 'advance',
        new_target: { ...current, rest_seconds: newRest },
        reason: `Aumento della densità di lavoro: tempo di recupero ridotto a ${newRest}s (-${reduction}s).`,
        increment_applied: { rest_seconds: -reduction },
        warnings: [],
      };
    }

    default:
      return {
        action: 'advance',
        new_target: { ...current },
        reason: `Seduta completata con successo secondo il piano stabilito.`,
        warnings: [],
      };
  }
}

/**
 * Gestione del mancato raggiungimento del target (Hold conservativo o Regressione).
 */
export function applyFailureRule(
  rule: ProgressionRule,
  performance: PerformanceInput
): NextTargetResult {
  const currentFailures = rule.failure_count + 1;
  const maxFailures = rule.conditions.max_consecutive_failures ?? 2;

  if (currentFailures >= maxFailures) {
    return suggestRegression(
      rule,
      `Target non completato per ${currentFailures} sedute consecutive. Ricalibrazione conservativa del carico per ripristinare la fluidità esecutiva.`
    );
  }

  return {
    action: 'hold',
    new_target: { ...rule.current_target },
    reason: `Target non completato nella seduta odierna (${performance.reps_per_set.join(', ')} reps registrate). Carico e ripetizioni mantenuti invariati per consolidamento tecnico (Tentativo ${currentFailures}/${maxFailures}).`,
    warnings: ['Carico invariato per consolidamento'],
  };
}

/**
 * Valuta se è necessario attivare uno scarico (deload).
 */
export function shouldDeload(
  rule: ProgressionRule,
  performance: PerformanceInput
): boolean {
  if (rule.max_steps && rule.current_step >= rule.max_steps && rule.method !== 'deload') {
    return true;
  }
  if (performance.fatigue_reported === 'excessive' && (performance.rpe_reported || 0) >= 9.5) {
    return true;
  }
  return false;
}

/**
 * Applica le metriche di scarico controllato (-30% volume, -10% carico).
 */
export function applyDeloadRule(rule: ProgressionRule): NextTargetResult {
  const current = rule.current_target;
  const deloadSets = Math.max(1, Math.round(current.sets * 0.7));
  const deloadLoad = current.load_kg ? Math.round((current.load_kg * 0.9) * 2) / 2 : undefined;

  return {
    action: 'deload',
    new_target: {
      ...current,
      sets: deloadSets,
      load_kg: deloadLoad,
      rir: 'RIR 3-4 (Scarico)',
    },
    reason: `Attivata settimana di scarico attivo (Deload): volume ridotto a ${deloadSets} serie e carico alleggerito del 10% per consentire supercompensazione neuromuscolare e recupero tendineo.`,
    warnings: ['Fase di scarico attivo programmata'],
  };
}

/**
 * Suggerisce una regressione di carico controllata (-7.5%).
 */
export function suggestRegression(rule: ProgressionRule, customReason?: string): NextTargetResult {
  const current = rule.current_target;
  const regressedLoad = current.load_kg ? Math.max(0, Math.round((current.load_kg * 0.925) * 2) / 2) : undefined;

  return {
    action: 'regress',
    new_target: {
      ...current,
      load_kg: regressedLoad,
      rir: 'RIR 2-3',
    },
    reason: customReason || `Ricalibrazione del carico a ${regressedLoad}kg (-7.5%) per ricostruire la progressione con tecnica ottimale.`,
    warnings: ['Reset conservativo del carico'],
  };
}

/**
 * Suggerisce una variante di sostituzione per fastidio articolare o attrezzatura.
 */
export function suggestSubstitution(
  rule: ProgressionRule,
  replacementExerciseName: string,
  reason: string
): NextTargetResult {
  return {
    action: 'substitute',
    new_target: {
      ...rule.current_target,
    },
    reason: `Esercizio sostituito con ${replacementExerciseName}. Motivo: ${reason}`,
    warnings: ['Esercizio sostituito: verificare parametri di impostazione'],
  };
}

function checkTargetSuccess(rule: ProgressionRule, performance: PerformanceInput): boolean {
  const targetReps = parseInt(rule.current_target.reps.split('-')[0] || '8', 10);
  const allSetsCompleted = performance.sets_completed >= rule.current_target.sets;
  const repsHit = performance.reps_per_set.length > 0 && performance.reps_per_set.every(r => r >= targetReps);
  const rpeAcceptable = !performance.rpe_reported || performance.rpe_reported <= (rule.conditions.max_rpe ?? 9.5);

  return allSetsCompleted && repsHit && rpeAcceptable;
}

/**
 * Calcola e proietta la timeline settimana-per-settimana del blocco di allenamento
 * in base alla regola o al template scelto.
 */
export function generateWeeklyBlockProjection(
  ruleOrTemplate: ProgressionRule | ProgressionRuleTemplate,
  baseTarget?: ProgressionTarget,
  totalWeeks: number = 6
): ProgressionWeekProjection[] {
  const method = ruleOrTemplate.method;
  const increments = ruleOrTemplate.increments || {};
  const target: ProgressionTarget = baseTarget || ('current_target' in ruleOrTemplate ? ruleOrTemplate.current_target : ruleOrTemplate.default_target);

  const startSets = target.sets || 3;
  const startLoad = target.load_kg || 60;
  const startRest = target.rest_seconds || 90;
  const startTut = target.tut || '3-0-1-0';
  
  // Parse base reps e max reps
  let baseRepsMin = 8;
  let baseRepsMax = 10;
  if (typeof target.reps === 'string') {
    const parts = target.reps.split('-').map(p => parseInt(p.trim(), 10));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      baseRepsMin = parts[0];
      baseRepsMax = parts[1];
    } else if (parts.length === 1 && !isNaN(parts[0])) {
      baseRepsMin = parts[0];
      baseRepsMax = parts[0];
    }
  }

  const loadInc = increments.load_increment_kg || 2.5;
  const repsInc = increments.reps_increment || 1;
  const repsCap = increments.reps_max_cap || (baseRepsMax > baseRepsMin ? baseRepsMax : baseRepsMin + 2);
  const restDec = increments.rest_reduction_seconds || 15;
  const restFloor = increments.rest_min_cap_seconds || 45;

  const projections: ProgressionWeekProjection[] = [];

  let currentSets = startSets;
  let currentLoad = startLoad;
  let currentReps = baseRepsMin;
  let currentRest = startRest;

  for (let w = 1; w <= totalWeeks; w++) {
    const isDeloadWeek = w === 4 || (totalWeeks >= 8 && w === 8);

    if (isDeloadWeek) {
      // Settimana di scarico attivo
      const deloadSets = Math.max(2, currentSets - 1);
      const deloadLoad = Math.max(0, Math.round(currentLoad * 0.9 * 2) / 2);
      projections.push({
        week_number: w,
        phase: 'deload',
        phase_label: 'Scarico (Deload)',
        sets: deloadSets,
        reps: `${currentReps}`,
        load_kg: deloadLoad,
        load_display: `${deloadLoad} kg (-10%)`,
        rir: 'RIR 3-4',
        rpe: 6.5,
        rest_seconds: currentRest + 15,
        tut: startTut,
        is_deload: true,
        condition: 'Completare con focus su tecnica e recupero',
        expected_action: 'Recupero attivo e supercompensazione per il prossimo blocco',
        notes: 'Volume ridotto e carico moderato per dissipare fatica sistemica.',
      });
      continue;
    }

    let phase: ProgressionWeekPhase = 'accumulation';
    let phaseLabel = 'Accumulo Volume';
    let expectedAction = '';
    let condition = 'Tutte le serie completate a target';
    let repsString = `${currentReps}`;
    let rirStr = 'RIR 2';
    let rpeVal = 8.0;

    switch (method) {
      case 'double_progression': {
        if (w === 1) {
          repsString = `${baseRepsMin}`;
          phase = 'accumulation';
          phaseLabel = 'Baseline';
          expectedAction = `Eseguire ${startSets} set × ${baseRepsMin} reps @ ${currentLoad} kg`;
          condition = `Se raggiunte ${baseRepsMin} reps in tutti i set → +${repsInc} rep`;
          rirStr = 'RIR 2-3';
          rpeVal = 7.5;
        } else if (currentReps + repsInc <= repsCap) {
          currentReps += repsInc;
          repsString = `${currentReps}`;
          phase = currentReps === repsCap ? 'peak' : 'accumulation';
          phaseLabel = currentReps === repsCap ? 'Target Top Range' : 'Incremento Reps';
          expectedAction = `Aumentare a ${currentReps} reps mantenendo ${currentLoad} kg fissi`;
          condition = currentReps === repsCap 
            ? `Top range (${repsCap} reps) completato → Aumento carico +${loadInc} kg` 
            : `Se tutte le ${currentReps} reps sono valide → +${repsInc} rep`;
          rirStr = 'RIR 1-2';
          rpeVal = 8.5;
        } else {
          // Top range superato -> aumento carico e reset reps
          currentLoad += loadInc;
          currentReps = increments.reps_reset_to || baseRepsMin;
          repsString = `${currentReps}`;
          phase = 'intensification';
          phaseLabel = 'Aumento Carico (+kg)';
          expectedAction = `Nuovo carico ${currentLoad} kg (+${loadInc}kg) con reset a ${currentReps} reps`;
          condition = `Consolidare il nuovo carico @ ${currentLoad} kg`;
          rirStr = 'RIR 2';
          rpeVal = 8.5;
        }
        break;
      }

      case 'linear_load': {
        if (w > 1) {
          currentLoad += loadInc;
        }
        repsString = `${baseRepsMin}`;
        phase = w === 1 ? 'accumulation' : (w === totalWeeks ? 'peak' : 'intensification');
        phaseLabel = w === 1 ? 'Carico Base' : `+${loadInc * (w - 1)} kg`;
        expectedAction = `Aumento lineare: ${startSets} set × ${repsString} @ ${currentLoad} kg`;
        condition = `Raggiungere tutte le reps con RIR >= 1`;
        rirStr = w <= 2 ? 'RIR 2-3' : 'RIR 1-2';
        rpeVal = 7.5 + (w * 0.3);
        break;
      }

      case 'linear_reps': {
        if (w > 1) {
          currentReps = Math.min(repsCap, currentReps + repsInc);
        }
        repsString = `${currentReps}`;
        phase = currentReps === repsCap ? 'peak' : 'accumulation';
        phaseLabel = `+${repsInc} Reps / Settimana`;
        expectedAction = `Incremento volume: ${startSets} set × ${repsString} reps @ ${currentLoad} kg`;
        condition = `Completare il volume target a carico costante`;
        rirStr = 'RIR 2';
        rpeVal = 8.0;
        break;
      }

      case 'linear_sets': {
        if (w > 1 && !isDeloadWeek) {
          currentSets = Math.min(6, currentSets + (increments.sets_increment || 1));
        }
        repsString = `${baseRepsMin}`;
        phase = currentSets >= 5 ? 'peak' : 'accumulation';
        phaseLabel = `${currentSets} Serie Totali`;
        expectedAction = `Sovraccarico di volume sistemico: ${currentSets} set × ${repsString} @ ${currentLoad} kg`;
        condition = `Mantenere l'intensità su tutte le serie aggiuntive`;
        rirStr = 'RIR 2';
        rpeVal = 8.0 + (currentSets * 0.2);
        break;
      }

      case 'rir_progression':
      case 'rpe_progression': {
        const targetRirMap = ['RIR 3 (RPE 7)', 'RIR 2 (RPE 8)', 'RIR 1 (RPE 9)', 'RIR 0-1 (RPE 9.5)', 'RIR 0 (Cedimento)'];
        const rirIdx = Math.min(targetRirMap.length - 1, w - 1);
        rirStr = targetRirMap[rirIdx];
        rpeVal = 7 + (rirIdx * 0.6);
        repsString = `${baseRepsMin}`;
        phase = rirIdx >= 3 ? 'peak' : 'intensification';
        phaseLabel = `Aumento Intensità (${rirStr})`;
        expectedAction = `Incremento sforzo percepito: ${startSets} set × ${repsString} @ ${currentLoad} kg a ${rirStr}`;
        condition = `Raggiungere l'intensità target senza degradazione tecnica`;
        break;
      }

      case 'density_progression': {
        if (w > 1) {
          currentRest = Math.max(restFloor, currentRest - restDec);
        }
        repsString = `${baseRepsMin}`;
        phase = currentRest <= 60 ? 'intensification' : 'accumulation';
        phaseLabel = `Recupero ${currentRest}s (-${restDec}s)`;
        expectedAction = `Aumento densità: ${startSets} set × ${repsString} con soli ${currentRest}s di rest`;
        condition = `Mantenere le reps con tempo di recupero ridotto`;
        rirStr = 'RIR 2';
        rpeVal = 8.0 + (w * 0.25);
        break;
      }

      case 'tut_progression': {
        const tutProgression = ['3-0-1-0', '3-1-1-0 (Pausa 1s)', '4-1-1-0 (Eccentrica 4s)', '4-2-1-0'];
        const tutVal = tutProgression[Math.min(tutProgression.length - 1, w - 1)];
        repsString = `${baseRepsMin}`;
        phase = 'intensification';
        phaseLabel = `TUT: ${tutVal}`;
        expectedAction = `Sovraccarico tempo sotto tensione: ${startSets} set × ${repsString} @ tempo ${tutVal}`;
        condition = `Rispettare rigorosamente il tempo prescritto su ogni ripetizione`;
        rirStr = 'RIR 2';
        rpeVal = 8.5;
        break;
      }

      default: {
        repsString = `${baseRepsMin}`;
        phase = 'accumulation';
        phaseLabel = `Settimana ${w}`;
        expectedAction = `${startSets} set × ${repsString} @ ${currentLoad} kg`;
        condition = `Avanzamento standard da target`;
        break;
      }
    }

    projections.push({
      week_number: w,
      phase,
      phase_label: phaseLabel,
      sets: currentSets,
      reps: repsString,
      load_kg: currentLoad,
      load_display: `${currentLoad} kg`,
      rir: rirStr,
      rpe: Math.round(rpeVal * 10) / 10,
      rest_seconds: currentRest,
      tut: startTut,
      is_deload: false,
      condition,
      expected_action: expectedAction,
      notes: `Target calcolato dal motore per la Settimana ${w}.`,
    });
  }

  return projections;
}

export interface EvaluateBrainDecisionParams {
  exercise_name: string;
  athlete_name?: string;
  current_target: ProgressionTarget;
  recent_logs?: PerformanceInput[];
  objective?: 'forza' | 'ipertrofia' | 'densita' | 'ricomposizione' | 'riabilitazione';
  athlete_level?: 'principiante' | 'intermedio' | 'avanzato' | 'elite';
  limitations?: string;
}

/**
 * ============================================================================
 * CERVELLO CENTRALE: Valutazione Deterministica e Ranking delle Strategie
 * ============================================================================
 * Calcola in modo matematico e cinesiologico:
 * - Scoring pesato (Affinità Biomeccanica, Fatica/Recupero, Obiettivo, Sicurezza)
 * - Strategia Primaria e Alternativa Valida
 * - Punteggio di Confidenza complessivo (0.0 - 1.0)
 * - Vincoli di Sicurezza stringenti (dolore, stallo, fatica eccessiva)
 */
export function evaluateBrainProgressionDecision(
  params: EvaluateBrainDecisionParams
): BrainProgressionDecision {
  const exNameLower = (params.exercise_name || '').toLowerCase();
  const lastLog = params.recent_logs && params.recent_logs.length > 0 
    ? params.recent_logs[params.recent_logs.length - 1] 
    : undefined;

  const painLevel = lastLog?.pain_level || 0;
  const fatigueLevel = lastLog?.fatigue_reported || 'moderate';
  const lastRpe = lastLog?.rpe_reported || 8;
  const targetObj = params.objective || 'ipertrofia';
  const targetLevel = params.athlete_level || 'intermedio';

  // 1. Biomechanical Classification
  const isHeavyCompound = /squat|panca|stacco|deadlift|overhead|military|trazioni|dip|rematore/i.test(exNameLower);
  const isDumbbellCompound = /manubri|press|spinte/i.test(exNameLower) && !isHeavyCompound;
  const isMachineOrCable = /machine|cavi|cavo|pulley|lat machine|pressa|leg press|leg extension|leg curl/i.test(exNameLower);
  const isIsolation = !isHeavyCompound && (/curl|alzate|estensioni|french|pushdown|polpacci|calf|addominali|crunch/i.test(exNameLower) || isMachineOrCable);

  // 2. Safety Gate Evaluation
  const warnings: string[] = [];
  let mandatoryAction: 'none' | 'deload' | 'substitute' | 'hold' = 'none';

  if (painLevel >= 5) {
    mandatoryAction = 'substitute';
    warnings.push(`Livello dolore articolare elevato (${painLevel}/10). Sostituzione esercizio raccomandata.`);
  } else if (painLevel >= 3) {
    warnings.push(`Fastidio articolare moderato (${painLevel}/10). Limitare intensità di carico.`);
  }

  if (fatigueLevel === 'excessive' && lastRpe >= 9.5) {
    mandatoryAction = 'deload';
    warnings.push('Fatica sistemica eccessiva con RPE massimale. Attivare settimana di scarico attivo.');
  }

  // 3. Strategy Candidate Scorers
  const candidates: BrainStrategyCandidate[] = [
    // STRATEGIA A: Sovraccarico Lineare di Peso
    {
      method: 'linear_load',
      name: 'Sovraccarico Lineare di Carico (+2.0kg / +2.5kg)',
      category: 'Forza',
      score: 0,
      confidence: 0,
      target: {
        ...params.current_target,
        load_kg: (params.current_target.load_kg || 60) + (isHeavyCompound ? 2.5 : 1.0),
        rir: 'RIR 2',
      },
      increments: { load_increment_kg: isHeavyCompound ? 2.5 : 1.0 },
      conditions: { consecutive_success_sessions: 1, max_rpe: 9.0, pain_threshold_max: 2 },
      rule_template_id: 'tpl-linear-load',
      scoring_breakdown: {
        exercise_affinity: isHeavyCompound ? 25 : (isDumbbellCompound ? 14 : 8),
        fatigue_and_recovery: fatigueLevel === 'low' ? 25 : (fatigueLevel === 'moderate' ? 20 : 10),
        goal_alignment: (targetObj === 'forza' ? 25 : (targetObj === 'ipertrofia' ? 18 : 12)) + (targetLevel === 'principiante' ? 2 : 0),
        safety_compliance: painLevel > 2 ? 5 : 25,
      },
      rationale_technical: `Ideale per multiarticolari di forza; massimizza il reclutamento delle unità motorie ad alta soglia tramite tensione meccanica crescente.`,
    },

    // STRATEGIA B: RPE Wave / Top Set + Backoff
    {
      method: 'rpe_progression',
      name: 'Top Set Pesante + Backoff Wave a RIR Controllato',
      category: 'Forza',
      score: 0,
      confidence: 0,
      target: {
        ...params.current_target,
        rir: 'RIR 1-2 (RPE 8.5)',
      },
      increments: { rpe_step: 0.5, load_increment_kg: 2.0 },
      conditions: { consecutive_success_sessions: 1, max_rpe: 9.5, pain_threshold_max: 2 },
      rule_template_id: 'tpl-top-set-backoff',
      scoring_breakdown: {
        exercise_affinity: isHeavyCompound ? 25 : (isDumbbellCompound ? 18 : 10),
        fatigue_and_recovery: fatigueLevel === 'high' ? 12 : 23,
        goal_alignment: (targetObj === 'forza' ? 24 : (targetObj === 'ipertrofia' ? 22 : 15)) + (targetLevel === 'avanzato' || targetLevel === 'elite' ? 2 : 0),
        safety_compliance: painLevel > 2 ? 8 : 24,
      },
      rationale_technical: `Garantisce stimolo neurale elevato sul top set limitando l'accumulo di fatica sistemica grazie al volume scalato dei backoff set.`,
    },

    // STRATEGIA C: Doppia Progressione (Reps Cap poi Carico)
    {
      method: 'double_progression',
      name: 'Doppia Progressione Dinamica (Range Reps → Carico)',
      category: 'Ipertrofia',
      score: 0,
      confidence: 0,
      target: {
        ...params.current_target,
        reps: '8-10',
        rir: 'RIR 1-2',
      },
      increments: { reps_increment: 1, reps_max_cap: 10, reps_reset_to: 8, load_increment_kg: 2.5 },
      conditions: { consecutive_success_sessions: 1, max_rpe: 9.0, pain_threshold_max: 2 },
      rule_template_id: 'tpl-double-progression',
      scoring_breakdown: {
        exercise_affinity: isDumbbellCompound || isMachineOrCable ? 25 : (isIsolation ? 22 : 18),
        fatigue_and_recovery: fatigueLevel === 'high' ? 15 : 22,
        goal_alignment: targetObj === 'ipertrofia' ? 25 : (targetObj === 'ricomposizione' ? 22 : 16),
        safety_compliance: painLevel > 2 ? 14 : 25,
      },
      rationale_technical: `Ottimizza il volume ipertrofico saturando prima il range di ripetizioni prima di forzare aumenti di carico esterno.`,
    },

    // STRATEGIA D: Progressione Lineare Ripetizioni (Volume a carico fisso)
    {
      method: 'linear_reps',
      name: 'Progressione Reps a Carico Costante (+1 Rep / Settimana)',
      category: 'Ipertrofia',
      score: 0,
      confidence: 0,
      target: {
        ...params.current_target,
        rir: 'RIR 2',
      },
      increments: { reps_increment: 1, reps_max_cap: 15 },
      conditions: { consecutive_success_sessions: 1, max_rpe: 8.5, pain_threshold_max: 2 },
      rule_template_id: 'tpl-linear-reps',
      scoring_breakdown: {
        exercise_affinity: isIsolation || isMachineOrCable ? 25 : 16,
        fatigue_and_recovery: fatigueLevel === 'high' ? 18 : 24,
        goal_alignment: targetObj === 'ipertrofia' || targetObj === 'densita' ? 24 : 14,
        safety_compliance: painLevel > 2 ? 18 : 25,
      },
      rationale_technical: `Ideale per macchine ed esercizi di isolamento; massimizza il tempo sotto tensione e lo stress metabolico con minimo stress articolare.`,
    },

    // STRATEGIA E: Densità di Lavoro (Riduzione Recuperi)
    {
      method: 'density_progression',
      name: 'Progressione di Densità (Riduzione Recupero -15s)',
      category: 'Resistenza',
      score: 0,
      confidence: 0,
      target: {
        ...params.current_target,
        rest_seconds: Math.max(45, (params.current_target.rest_seconds || 90) - 15),
      },
      increments: { rest_reduction_seconds: 15, rest_min_cap_seconds: 45 },
      conditions: { consecutive_success_sessions: 1, max_rpe: 8.5, pain_threshold_max: 1 },
      rule_template_id: 'tpl-density-progressive',
      scoring_breakdown: {
        exercise_affinity: isIsolation || isMachineOrCable ? 24 : 10,
        fatigue_and_recovery: fatigueLevel === 'high' ? 10 : 20,
        goal_alignment: targetObj === 'densita' || targetObj === 'ricomposizione' ? 25 : 12,
        safety_compliance: 24,
      },
      rationale_technical: `Aumenta il lavoro per unità di tempo stimolando la capacità lattacida e l'efficienza mitocondriale a parità di carico.`,
    },
  ];

  // 4. Calculate total score and confidence for each candidate
  for (const c of candidates) {
    const b = c.scoring_breakdown;
    c.score = b.exercise_affinity + b.fatigue_and_recovery + b.goal_alignment + b.safety_compliance;
    c.confidence = Math.round((c.score / 100) * 100) / 100;
  }

  // 5. Rank candidates
  candidates.sort((a, b) => b.score - a.score);

  const primary = candidates[0];
  // Ensure alternative has a different method
  const alternative = candidates.find(c => c.method !== primary.method) || candidates[1];

  const overallConfidence = Math.round(((primary.confidence + alternative.confidence) / 2) * 100) / 100;

  return {
    exercise_name: params.exercise_name,
    athlete_name: params.athlete_name || 'Atleta',
    primary_strategy: primary,
    alternative_strategy: alternative,
    confidence_overall: overallConfidence,
    safety_constraints: {
      is_safe: painLevel <= 2 && fatigueLevel !== 'excessive',
      pain_level_detected: painLevel,
      fatigue_level_detected: fatigueLevel,
      warnings,
      mandatory_action: mandatoryAction,
    },
    evaluated_at: new Date().toISOString(),
  };
}
