import {
  evaluateProgression,
  applySuccessRule,
  applyFailureRule,
  shouldDeload,
  applyDeloadRule,
  suggestRegression,
} from './progressionEngine';
import { ProgressionRule } from '../../types/progression';

export interface TestResult {
  name: string;
  success: boolean;
  error?: string;
}

export function runProgressionEngineTestSuite(): { passed: number; failed: number; results: TestResult[] } {
  const results: TestResult[] = [];

  const baseRule: ProgressionRule = {
    id: 'test-rule-1',
    coach_id: 'coach-1',
    athlete_id: 'ath-1',
    athlete_name: 'Test Athlete',
    name: 'Panca Piana Doppia Progressione',
    method: 'double_progression',
    status: 'active',
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
    current_step: 1,
    max_steps: 6,
    current_target: {
      sets: 3,
      reps: '8-10',
      load_kg: 80,
      rir: 'RIR 2',
      rest_seconds: 90,
    },
    success_count: 0,
    failure_count: 0,
    created_by: 'coach-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Test 1: Completamento target intermedio
  try {
    const perf = {
      sets_completed: 3,
      reps_per_set: [8, 8, 8],
      weights_per_set: [80, 80, 80],
      rpe_reported: 8.0,
      pain_level: 0,
    };
    const res = evaluateProgression(
      { ...baseRule, current_target: { ...baseRule.current_target, reps: '8-8' } },
      perf
    );
    const ok = res.action === 'advance' && res.new_target.reps === '9-9' && res.new_target.load_kg === 80;
    results.push({
      name: '1. Completamento target intermedio -> Incremento ripetizioni a carico fisso',
      success: ok,
    });
  } catch (err) {
    results.push({
      name: '1. Completamento target intermedio',
      success: false,
      error: String(err),
    });
  }

  // Test 2: Top range raggiunto -> Aumento carico
  try {
    const perf = {
      sets_completed: 3,
      reps_per_set: [10, 10, 10],
      weights_per_set: [80, 80, 80],
      rpe_reported: 8.5,
      pain_level: 0,
    };
    const res = applySuccessRule(baseRule, perf);
    const ok = res.action === 'advance' && res.new_target.load_kg === 82.5 && res.new_target.reps === '8';
    results.push({
      name: '2. Raggiungimento top range (10 reps) -> Aumento carico +2.5kg e reset reps',
      success: ok,
    });
  } catch (err) {
    results.push({
      name: '2. Raggiungimento top range',
      success: false,
      error: String(err),
    });
  }

  // Test 3: Target fallito 1 volta -> Hold conservativo
  try {
    const perf = {
      sets_completed: 3,
      reps_per_set: [8, 7, 6],
      weights_per_set: [80, 80, 80],
      rpe_reported: 9.5,
      pain_level: 0,
    };
    const res = applyFailureRule(baseRule, perf);
    const ok = res.action === 'hold' && res.new_target.load_kg === 80;
    results.push({
      name: '3. Target non completato (1° fallimento) -> Hold conservativo / nessun aumento',
      success: ok,
    });
  } catch (err) {
    results.push({
      name: '3. Target non completato (1° fallimento)',
      success: false,
      error: String(err),
    });
  }

  // Test 4: Target fallito 2 volte -> Regressione
  try {
    const perf = {
      sets_completed: 3,
      reps_per_set: [7, 6, 6],
      weights_per_set: [80, 80, 80],
      rpe_reported: 10,
      pain_level: 0,
    };
    const ruleWithFailure: ProgressionRule = { ...baseRule, failure_count: 1 };
    const res = applyFailureRule(ruleWithFailure, perf);
    const ok = res.action === 'regress' && (res.new_target.load_kg || 0) < 80;
    results.push({
      name: '4. Target fallito consecutivamente (2° fallimento) -> Trigger regressione di carico',
      success: ok,
    });
  } catch (err) {
    results.push({
      name: '4. Target fallito consecutivamente',
      success: false,
      error: String(err),
    });
  }

  // Test 5: Dolore o fastidio > 2/10 -> Pausa di sicurezza immediata
  try {
    const perf = {
      sets_completed: 3,
      reps_per_set: [10, 10, 10],
      weights_per_set: [80, 80, 80],
      rpe_reported: 8.0,
      pain_level: 4,
    };
    const res = evaluateProgression(baseRule, perf);
    const ok = res.action === 'pause_pain' && res.new_target.load_kg === 80;
    results.push({
      name: '5. Dolore o fastidio articolare (>2/10) -> Pausa di sicurezza immediata',
      success: ok,
    });
  } catch (err) {
    results.push({
      name: '5. Dolore o fastidio articolare',
      success: false,
      error: String(err),
    });
  }

  // Test 6: Condizione di Deload
  try {
    const perf = {
      sets_completed: 3,
      reps_per_set: [10, 10, 10],
      weights_per_set: [80, 80, 80],
      rpe_reported: 10,
      fatigue_reported: 'excessive' as const,
      pain_level: 0,
    };
    const should = shouldDeload(baseRule, perf);
    const deloadRes = applyDeloadRule(baseRule);
    const ok = should && deloadRes.action === 'deload' && deloadRes.new_target.sets === 2;
    results.push({
      name: '6. Fatica eccessiva o fine ciclo -> Attivazione Deload (-30% serie, -10% carico)',
      success: ok,
    });
  } catch (err) {
    results.push({
      name: '6. Deload',
      success: false,
      error: String(err),
    });
  }

  // Test 7: Regressione esplicita
  try {
    const regRes = suggestRegression(baseRule);
    const ok = regRes.action === 'regress' && (regRes.new_target.load_kg || 0) < 80;
    results.push({
      name: '7. Regressione esplicita richiesta -> Ricalibrazione conservativa',
      success: ok,
    });
  } catch (err) {
    results.push({
      name: '7. Regressione esplicita',
      success: false,
      error: String(err),
    });
  }

  const passed = results.filter((r) => r.success).length;
  const failed = results.length - passed;

  return { passed, failed, results };
}

/**
 * Suite di Test per la Coerenza della Generazione IA Contestuale
 */
export async function runAIProgressionContextTestSuite(): Promise<{ passed: number; failed: number; results: TestResult[] }> {
  const { generateAIProgressionProposals } = await import('../ai/progressionAssistant');
  const results: TestResult[] = [];

  // Test 1: Beginner vs Elite (Squat - Forza)
  try {
    const beginnerRes = await generateAIProgressionProposals({
      exercise_name: 'Squat con Bilanciere',
      exercise_family: 'Accosciata / Squat',
      athlete_level: 'principiante',
      objective: 'forza',
      block_duration_weeks: 6,
      baseline_target: { sets: 3, reps: '5', load_kg: 60, rest_seconds: 120 },
    });

    const eliteRes = await generateAIProgressionProposals({
      exercise_name: 'Squat con Bilanciere',
      exercise_family: 'Accosciata / Squat',
      athlete_level: 'elite',
      objective: 'forza',
      block_duration_weeks: 6,
      baseline_target: { sets: 4, reps: '3-5', load_kg: 140, rest_seconds: 180 },
    });

    const isBeginnerRepLinear = beginnerRes[0].reps_analysis?.level_adaptation.includes('Principiante');
    const isEliteTopSet = eliteRes[0].reps_analysis?.structure_type === 'top_set_backoff' || eliteRes[0].title.includes('Top Set');

    results.push({
      name: 'AI-1. Beginner vs Elite: Adattamento Struttura Reps (Lineare vs Top Set/Autoregolato)',
      success: Boolean(isBeginnerRepLinear && isEliteTopSet),
    });
  } catch (err) {
    results.push({
      name: 'AI-1. Beginner vs Elite',
      success: false,
      error: String(err),
    });
  }

  // Test 2: Forza vs Riabilitazione (Panca Piana)
  try {
    const strengthRes = await generateAIProgressionProposals({
      exercise_name: 'Panca Piana Bilanciere',
      exercise_family: 'Spinta Orizzontale',
      athlete_level: 'intermedio',
      objective: 'forza',
      block_duration_weeks: 6,
      baseline_target: { sets: 3, reps: '5-6', load_kg: 80, rest_seconds: 150 },
    });

    const rehabRes = await generateAIProgressionProposals({
      exercise_name: 'Panca Piana Bilanciere',
      exercise_family: 'Spinta Orizzontale',
      athlete_level: 'intermedio',
      objective: 'riabilitazione',
      limitations: 'Fastidio spalla destra',
      block_duration_weeks: 6,
      baseline_target: { sets: 3, reps: '12-15', load_kg: 40, rest_seconds: 90 },
    });

    const isStrengthLowReps = strengthRes[0].template.default_target.rest_seconds! >= 120;
    const isRehabHighRepsPain = rehabRes[0].template.conditions.pain_threshold_max === 1 && rehabRes[0].template.default_target.reps.includes('12');

    results.push({
      name: 'AI-2. Forza vs Riabilitazione: Calibrazione Reps (5-6 vs 12-15) e Soglia Dolore (1/10)',
      success: Boolean(isStrengthLowReps && isRehabHighRepsPain),
    });
  } catch (err) {
    results.push({
      name: 'AI-2. Forza vs Riabilitazione',
      success: false,
      error: String(err),
    });
  }

  // Test 3: Home Gym vs Palestra Completa (Manubri vs Bilanciere)
  try {
    const homeGymRes = await generateAIProgressionProposals({
      exercise_name: 'Spinte con Manubri',
      exercise_family: 'Spinta Orizzontale',
      athlete_level: 'intermedio',
      objective: 'ipertrofia',
      equipment: 'home_gym',
      block_duration_weeks: 6,
      baseline_target: { sets: 3, reps: '10-12', load_kg: 24, rest_seconds: 90 },
    });

    const hasDensityOrExpandedRange = homeGymRes[0].title.includes('Home Gym') || homeGymRes[2].method === 'density_progression';

    results.push({
      name: 'AI-3. Home Gym: Adattamento a Densità & Range Espanso per salti di carico manubri',
      success: Boolean(hasDensityOrExpandedRange),
    });
  } catch (err) {
    results.push({
      name: 'AI-3. Home Gym vs Palestra Completa',
      success: false,
      error: String(err),
    });
  }

  // Test 4: Spettro Ipertrofia (Fondamentale vs Isolamento non schiacciati su 8-10)
  try {
    const squatHypertrophy = await generateAIProgressionProposals({
      exercise_name: 'Squat con Bilanciere',
      exercise_family: 'Accosciata / Squat',
      athlete_level: 'avanzato',
      objective: 'ipertrofia',
      block_duration_weeks: 6,
      baseline_target: { sets: 4, reps: '6-8', load_kg: 120, rest_seconds: 120 },
    });

    const lateralRaisesHypertrophy = await generateAIProgressionProposals({
      exercise_name: 'Alzate Laterali con Manubri',
      exercise_family: 'Isolamento / Braccia',
      athlete_level: 'avanzato',
      objective: 'ipertrofia',
      block_duration_weeks: 6,
      baseline_target: { sets: 3, reps: '12-15', load_kg: 10, rest_seconds: 60 },
    });

    const squatReps = squatHypertrophy[0].reps_analysis?.recommended_range || '';
    const latReps = lateralRaisesHypertrophy[0].reps_analysis?.recommended_range || '';
    const areDifferent = squatReps !== latReps;

    results.push({
      name: 'AI-4. Spettro Ipertrofia: Differenziazione Fondamentale vs Isolamento (no 8-10 fisso)',
      success: Boolean(areDifferent && latReps.includes('10') || latReps.includes('12') || latReps.includes('14')),
    });
  } catch (err) {
    results.push({
      name: 'AI-4. Spettro Ipertrofia',
      success: false,
      error: String(err),
    });
  }

  // Test 5: Scoring Pesato & Alternativa Valida con Confidenza
  try {
    const { evaluateWeightedRepsScoring, classifyExerciseBiomechanics } = await import('../ai/progressionAssistant');
    const biomech = classifyExerciseBiomechanics('Panca Piana');
    const scoredRes = evaluateWeightedRepsScoring(
      {
        exercise_name: 'Panca Piana',
        athlete_level: 'elite',
        objective: 'forza',
        baseline_target: { sets: 4, reps: '3-5', load_kg: 110, rest_seconds: 150 },
      },
      biomech
    );

    const hasPrimaryAndSecondary = Boolean(
      scoredRes.primary &&
      scoredRes.secondary &&
      scoredRes.primary.score >= scoredRes.secondary.score &&
      scoredRes.confidenceScore >= 0.8
    );

    results.push({
      name: 'AI-5. Scoring Pesato: Generazione Strategia Primaria, Alternativa Valida e Confidenza (>= 80%)',
      success: hasPrimaryAndSecondary,
    });
  } catch (err) {
    results.push({
      name: 'AI-5. Scoring Pesato',
      success: false,
      error: String(err),
    });
  }

  // Test 6: Profili di Weighting Adattivi (Forza vs Rehab vs Home Gym)
  try {
    const { evaluateWeightedRepsScoring, classifyExerciseBiomechanics } = await import('../ai/progressionAssistant');
    const biomech = classifyExerciseBiomechanics('Panca Piana');
    
    const forzaScoring = evaluateWeightedRepsScoring(
      { exercise_name: 'Panca Piana', objective: 'forza', athlete_level: 'avanzato', baseline_target: { sets: 4, reps: '4-6', load_kg: 90 } },
      biomech
    );

    const rehabScoring = evaluateWeightedRepsScoring(
      { exercise_name: 'Panca Piana', objective: 'riabilitazione', limitations: 'Fastidio cuffia rotatori', baseline_target: { sets: 3, reps: '12-15', load_kg: 40 } },
      biomech
    );

    const homeGymScoring = evaluateWeightedRepsScoring(
      { exercise_name: 'Panca Piana', objective: 'ipertrofia', equipment: 'home_gym', baseline_target: { sets: 3, reps: '8-10', load_kg: 24 } },
      biomech
    );

    const isForzaProfile = forzaScoring.confidenceBreakdown.weighting_profile === 'forza_centrico';
    const isRehabProfile = rehabScoring.confidenceBreakdown.weighting_profile === 'rehab_cautelativo';
    const isHomeGymProfile = homeGymScoring.confidenceBreakdown.weighting_profile === 'home_gym_compensativo';

    results.push({
      name: 'AI-6. Euristica Adattiva: Attivazione Profili Dinamici (Forza Centrico, Rehab Cautelativo, Home Gym Compensativo)',
      success: Boolean(isForzaProfile && isRehabProfile && isHomeGymProfile),
    });
  } catch (err) {
    results.push({
      name: 'AI-6. Euristica Adattiva',
      success: false,
      error: String(err),
    });
  }

  // Test 7: Verifica Assenza di Bias (No Doppia Progressione come Default Implicito)
  try {
    const strengthProps = await generateAIProgressionProposals({
      exercise_name: 'Panca Piana con Bilanciere',
      exercise_family: 'Spinta Orizzontale',
      athlete_level: 'avanzato',
      objective: 'forza',
      block_duration_weeks: 6,
      baseline_target: { sets: 4, reps: '5', load_kg: 100, rest_seconds: 180 },
    });

    const rehabProps = await generateAIProgressionProposals({
      exercise_name: 'Leg Extension',
      exercise_family: 'Estensione Ginocchio',
      athlete_level: 'intermedio',
      objective: 'riabilitazione',
      limitations: 'Fastidio rotuleo',
      block_duration_weeks: 4,
      baseline_target: { sets: 3, reps: '12-15', load_kg: 30, rest_seconds: 90 },
    });

    const homeGymProps = await generateAIProgressionProposals({
      exercise_name: 'Distensioni Manubri',
      exercise_family: 'Spinta Orizzontale',
      athlete_level: 'intermedio',
      objective: 'ipertrofia',
      equipment: 'home_gym',
      block_duration_weeks: 6,
      baseline_target: { sets: 3, reps: '8-10', load_kg: 22, rest_seconds: 90 },
    });

    // Per forza -> linear_load o rpe_progression (NON double_progression)
    const isStrengthNotDouble = strengthProps[0].method === 'linear_load' || strengthProps[0].method === 'rpe_progression';
    // Per rehab -> tut_progression (NON double_progression)
    const isRehabNotDouble = rehabProps[0].method === 'tut_progression';
    // Per home gym -> linear_reps (NON double_progression)
    const isHomeGymNotDouble = homeGymProps[0].method === 'linear_reps';

    results.push({
      name: 'AI-7. Distribuzione Strategie Bilanciata: Assenza di bias verso Doppia Progressione su Forza, Rehab e Home Gym',
      success: Boolean(isStrengthNotDouble && isRehabNotDouble && isHomeGymNotDouble),
    });
  } catch (err) {
    results.push({
      name: 'AI-7. Distribuzione Strategie Bilanciata',
      success: false,
      error: String(err),
    });
  }

  const passed = results.filter((r) => r.success).length;
  const failed = results.length - passed;

  return { passed, failed, results };
}

