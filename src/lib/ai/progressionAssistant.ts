import {
  ProgressionRule,
  ProgressionSuggestion,
  ProgressionTarget,
  BrainProgressionDecision,
  BrainAnchoredProgressionProposal,
} from '../../types/progression';
import { ExerciseItem } from '../../types/exercise';
import { 
  PerformanceInput, 
  evaluateBrainProgressionDecision 
} from '../progression/progressionEngine';
import {
  computeCanonicalPayloadHash,
  CURRENT_BRAIN_DECISION_VERSION,
  DEFAULT_PROPOSAL_EXPIRY_HOURS,
} from '../progression/progressionHardening';
import { generateContentWithGemini } from './geminiClient';

export interface AthleteProgressionContext {
  athlete_id: string;
  athlete_name: string;
  program_id: string;
  program_name: string;
  workout_exercise_id: string;
  exercise_name: string;
  current_target: ProgressionTarget;
  current_rule?: ProgressionRule;
  recent_logs: PerformanceInput[];
  available_exercises: ExerciseItem[];
  equipment_available?: string[];
  mesocycle_week?: number;
  coach_notes?: string;
  objective?: 'forza' | 'ipertrofia' | 'densita' | 'ricomposizione' | 'riabilitazione';
  athlete_level?: 'principiante' | 'intermedio' | 'avanzato' | 'elite';
  limitations?: string;
}

/**
 * ============================================================================
 * SINERGIA CERVELLO ↔ IA: Generazione Proposta Ancorata con Human-In-The-Loop
 * ============================================================================
 * 1. Il Cervello valuta in modo deterministico scoring, vincoli e ranking.
 * 2. L'IA riceve il contratto decisionale e formula spiegazione, confronto e cue.
 * 3. Nessuna modifica viene applicata senza approvazione esplicita del coach.
 */
export async function generateBrainAnchoredProgressionProposal(
  ctx: AthleteProgressionContext
): Promise<BrainAnchoredProgressionProposal> {
  // PASSO 1: Il Cervello calcola la decisione deterministica
  const brainDecision: BrainProgressionDecision = evaluateBrainProgressionDecision({
    exercise_name: ctx.exercise_name,
    athlete_name: ctx.athlete_name,
    current_target: ctx.current_target,
    recent_logs: ctx.recent_logs,
    objective: ctx.objective || 'ipertrofia',
    athlete_level: ctx.athlete_level || 'intermedio',
    limitations: ctx.limitations,
  });

  const proposalId = `prop-brain-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  // Default Humanized Content calcolato se l'AI è offline o fallisce
  let humanRationale = `Il motore decisionale raccomanda come opzione primaria "${brainDecision.primary_strategy.name}" (Score: ${brainDecision.primary_strategy.score}/100) per garantire un sovraccarico progressivo ottimale su ${ctx.exercise_name}.`;
  let comparison = {
    primary_why: brainDecision.primary_strategy.rationale_technical,
    alternative_when: `In alternativa, puoi adottare "${brainDecision.alternative_strategy.name}" qualora l'atleta richieda una gestione diversa della fatica o una progressione alternativa.`,
  };
  let coachingCues: string[] = [
    `Rispettare il target: ${brainDecision.primary_strategy.target.sets} serie × ${brainDecision.primary_strategy.target.reps} @ ${brainDecision.primary_strategy.target.load_kg || 'carico target'}kg (${brainDecision.primary_strategy.target.rir || 'RIR controllato'}).`,
    `Focalizzarsi sul controllo del tempo sotto tensione e non forzare carichi oltre l'RPE pianificato.`,
  ];
  let missingDataPrompts: string[] = [];

  if (ctx.recent_logs.length === 0) {
    missingDataPrompts.push('Nessun log recente registrato: inserisci il feedback della prima seduta completata.');
  }

  // PASSO 2: L'IA interpreta e arricchisce la presentazione per il Coach (senza bypassare il Cervello)
  try {
    const systemPrompt = `Sei l'Assistente AI del Master Coach. Il tuo ruolo è interpretare la decisione deterministica calcolata dal Cervello centrale e presentarla in modo chiaro, scientifico ed empatico al Coach.
NON puoi modificare la strategia primaria o i carichi calcolati dal Cervello. Il tuo compito è spiegare il razionale e assistere il coach.
Restituisci SOLO un JSON valido con questo schema esatto:
{
  "human_rationale": "Spiegazione chiara e pedagogica del perché questa strategia è ideale per questo atleta",
  "comparison": {
    "primary_why": "Perché la primaria è la scelta d'elezione",
    "alternative_when": "In quale scenario specifico il coach dovrebbe preferire l'alternativa"
  },
  "coaching_cues": ["Cue tecnico 1", "Cue motivazionale/focalizzazione 2"],
  "missing_data_prompts": ["Eventuale dato mancante utile"]
}`;

    const userPrompt = `
Dati Atleta: ${ctx.athlete_name} (${ctx.athlete_level || 'Intermedio'})
Esercizio: ${ctx.exercise_name}
Note Coach: ${ctx.coach_notes || 'Nessuna'}

Decisione Ufficiale del Cervello:
- Strategia Primaria: ${brainDecision.primary_strategy.name} (Metodo: ${brainDecision.primary_strategy.method}, Score: ${brainDecision.primary_strategy.score}/100, Target: ${JSON.stringify(brainDecision.primary_strategy.target)})
- Strategia Alternativa: ${brainDecision.alternative_strategy.name} (Metodo: ${brainDecision.alternative_strategy.method}, Score: ${brainDecision.alternative_strategy.score}/100, Target: ${JSON.stringify(brainDecision.alternative_strategy.target)})
- Confidenza Complessiva: ${brainDecision.confidence_overall}
- Sicurezza / Dolore Rilevato: ${brainDecision.safety_constraints.pain_level_detected}/10, Fatica: ${brainDecision.safety_constraints.fatigue_level_detected}
- Warnings: ${brainDecision.safety_constraints.warnings.join('; ') || 'Nessuno'}

Genera la presentazione conversazionale per il Coach.
`.trim();

    const genResult = await generateContentWithGemini({
      provider: 'gemini',
      systemPrompt,
      userPrompt,
      temperature: 0.4,
      maxTokens: 2048,
      responseMimeType: 'application/json',
    });

    let rawText = genResult.text.replace(/^```json/gi, '').replace(/^```/gi, '').replace(/```$/gi, '').trim();
    const match = rawText.match(/\{[\s\S]*\}/);
    if (match) rawText = match[0];
    const parsed = JSON.parse(rawText);

    if (parsed.human_rationale) humanRationale = parsed.human_rationale;
    if (parsed.comparison) comparison = parsed.comparison;
    if (Array.isArray(parsed.coaching_cues) && parsed.coaching_cues.length > 0) coachingCues = parsed.coaching_cues;
    if (Array.isArray(parsed.missing_data_prompts)) missingDataPrompts = parsed.missing_data_prompts;

  } catch (err) {
    console.warn("AI interpretation skipped, using deterministic brain rationale:", err);
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + DEFAULT_PROPOSAL_EXPIRY_HOURS * 3600 * 1000).toISOString();
  const policySnapshot = {
    objective: ctx.objective || 'ipertrofia',
    athlete_level: ctx.athlete_level || 'intermedio',
    limitations: ctx.limitations || 'Nessuna',
    scoring_weights: {
      exercise_affinity: 25,
      fatigue_and_recovery: 25,
      goal_alignment: 25,
      safety_compliance: 25,
    },
  };

  const proposalHash = await computeCanonicalPayloadHash({
    decision: brainDecision,
    version: CURRENT_BRAIN_DECISION_VERSION,
    policy: policySnapshot,
  });

  return {
    id: proposalId,
    brain_decision: brainDecision,
    brain_decision_version: CURRENT_BRAIN_DECISION_VERSION,
    policy_snapshot: policySnapshot,
    proposal_hash: proposalHash,
    human_rationale: humanRationale,
    comparison,
    missing_data_prompts: missingDataPrompts.length > 0 ? missingDataPrompts : undefined,
    coaching_cues: coachingCues,
    status: 'pending_approval',
    requires_coach_approval: true,
    version: 1,
    created_at: now.toISOString(),
    expires_at: expiresAt,
  };
}

/**
 * Genera una proposta di progressione assistita da IA (ancorata al Cervello).
 */
export async function generateAIProgressionSuggestion(
  ctx: AthleteProgressionContext
): Promise<ProgressionSuggestion> {
  const proposal = await generateBrainAnchoredProgressionProposal(ctx);
  const primary = proposal.brain_decision.primary_strategy;

  return {
    id: `sugg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    coach_id: 'coach-current',
    athlete_id: ctx.athlete_id,
    athlete_name: ctx.athlete_name,
    program_id: ctx.program_id,
    program_name: ctx.program_name,
    workout_exercise_id: ctx.workout_exercise_id,
    exercise_name: ctx.exercise_name,
    current_target: ctx.current_target,
    proposed_target: primary.target,
    suggested_method: primary.method,
    reason: `${proposal.human_rationale} (${primary.rationale_technical})`,
    confidence_score: primary.confidence,
    warnings: proposal.brain_decision.safety_constraints.warnings,
    alternative_exercise: proposal.brain_decision.safety_constraints.mandatory_action === 'substitute' 
      ? { id: 'alt-var-1', name: 'Variante a minor impatto articolare', reason: 'Riduzione dello stress e del carico articolare' } 
      : null,
    status: 'pending_approval',
    requires_coach_approval: true,
    created_at: new Date().toISOString(),
  };
}

/**
 * Classificazione Biomeccanica dell'Esercizio
 */
export function classifyExerciseBiomechanics(
  exerciseName: string,
  family?: string
): 'compound_fundamental' | 'secondary_compound' | 'isolation_accessory' {
  const name = exerciseName.toLowerCase();
  const fam = (family || '').toLowerCase();

  // Fondamentali Multi-articolari ad alta richiesta neurale
  if (
    name.includes('panca') ||
    name.includes('squat') ||
    name.includes('stacco') ||
    name.includes('deadlift') ||
    name.includes('military') ||
    name.includes('lento avanti') ||
    name.includes('dip') ||
    name.includes('trazioni zavorrate') ||
    name.includes('overhead press') ||
    fam.includes('accosciata') ||
    fam.includes('catena posteriore')
  ) {
    return 'compound_fundamental';
  }

  // Multi-articolari Secondari
  if (
    name.includes('rematore') ||
    name.includes('pressa') ||
    name.includes('affondi') ||
    name.includes('hip thrust') ||
    name.includes('lat machine') ||
    name.includes('pulley') ||
    name.includes('spinte') ||
    fam.includes('trazione') ||
    fam.includes('spinta')
  ) {
    return 'secondary_compound';
  }

  // Isolamento & Cavi/Macchine
  return 'isolation_accessory';
}

/**
 * Modello Decisionale Evidence-Informed / Euristica Pesata Multi-Fattoriale
 * Applica profili di peso adattivi (Forza, Ipertrofia, Rehab, Home Gym) e deriva la confidenza in modo trasparente.
 */
export function evaluateWeightedRepsScoring(
  ctx: import('../../types/progression').AIProgressionGenerationContext,
  biomechanics: 'compound_fundamental' | 'secondary_compound' | 'isolation_accessory'
): {
  primary: import('../../types/progression').AIRepStrategyScored;
  secondary: import('../../types/progression').AIRepStrategyScored;
  confidenceScore: number;
  confidenceBreakdown: import('../../types/progression').AIConfidenceBreakdown;
} {
  const objective = ctx.objective || 'ipertrofia';
  const level = ctx.athlete_level || 'intermedio';
  const hasLimitations = Boolean(ctx.limitations && ctx.limitations !== 'nessuna' && ctx.limitations.trim() !== '');
  const isHomeGym = ctx.equipment === 'home_gym' || ctx.equipment === 'manubri' || ctx.equipment === 'corpo_libero';

  // 1. Selezione del Profilo di Weighting Adattivo
  let weightingProfile: import('../../types/progression').AIConfidenceBreakdown['weighting_profile'] = 'standard';
  if (objective === 'riabilitazione' || hasLimitations) {
    weightingProfile = 'rehab_cautelativo';
  } else if (isHomeGym) {
    weightingProfile = 'home_gym_compensativo';
  } else if (objective === 'forza') {
    weightingProfile = 'forza_centrico';
  } else {
    weightingProfile = 'ipertrofia_bilanciato';
  }

  interface Candidate {
    name: string;
    repRange: string;
    focus: string;
    rationale: string;
    score: number;
  }

  const candidates: Candidate[] = [
    {
      name: level === 'elite' ? 'Top Set Neurale + Backoff Wave' : 'Forza & Tensione ad Alte Percentuali',
      repRange: level === 'elite' ? 'Top 1x3 @ RPE 8 + 3x5' : level === 'avanzato' ? '3-5' : '5-6',
      focus: 'Reclutamento Neurale & Tensione Meccanica Massimale',
      rationale: 'Focalizza il lavoro su intensità elevata (% 1RM) e reclutamento delle unità motorie a soglia più alta.',
      score: 50,
    },
    {
      name: 'Ipertrofia a Tensione Meccanica (Range Medio-Basso)',
      repRange: biomechanics === 'isolation_accessory' ? '8-10' : '6-8',
      focus: 'Tensione Meccanica & Micro-Carichi',
      rationale: 'Preferenza per carico elevato e tempo di esposizione alla tensione per stimolare l\'ipertrofia miofibrillare.',
      score: 50,
    },
    {
      name: 'Ipertrofia a Volume Fisiologico Standard',
      repRange: isHomeGym ? '8-12' : (biomechanics === 'compound_fundamental' ? '8-10' : '8-12'),
      focus: 'Volume Efficace & Saturazione dello Stimolo',
      rationale: 'Range preferenziale per accumulare tonnellaggio ed evitare affaticamento connettivo precoce.',
      score: 50,
    },
    {
      name: 'Densità Metabolica & Accumulo Lattacido',
      repRange: '10-14',
      focus: 'Densità di Lavoro & Tolleranza al Lattato',
      rationale: 'Range indicato per massimizzare lo stress metabolico e la densità, compensando salti fissi dei manubri.',
      score: 50,
    },
    {
      name: 'Tutela Articolare, TUT Controllato & Rientro Cauto',
      repRange: '12-16',
      focus: 'Controllo Eccentrico & Sicurezza Tendinea',
      rationale: 'Strategia cautelativa con carico ridotto e tempo controllato (TUT 4-0-1-1) a bassa sollecitazione articolare.',
      score: 50,
    },
  ];

  // 2. Applicazione dei Pesi in base al Profilo Adattivo
  switch (weightingProfile) {
    case 'forza_centrico': {
      // Biomeccanica 35%, Livello 25%, Obiettivo 25%, Attrezzatura 10%, Sicurezza 5%
      candidates[0].score += 42;
      candidates[1].score += 24;
      candidates[2].score += 8;
      candidates[3].score -= 20;
      candidates[4].score -= 30;

      if (biomechanics === 'compound_fundamental') candidates[0].score += 22;
      if (level === 'elite' || level === 'avanzato') candidates[0].score += 18;
      break;
    }

    case 'rehab_cautelativo': {
      // Sicurezza 40%, Biomeccanica 25%, Obiettivo 15%, Livello 10%, Attrezzatura 10%
      candidates[0].score -= 45;
      candidates[1].score -= 25;
      candidates[2].score += 10;
      candidates[3].score += 20;
      candidates[4].score += 48;
      break;
    }

    case 'home_gym_compensativo': {
      // Attrezzatura 35%, Biomeccanica 25%, Obiettivo 20%, Livello 10%, Sicurezza 10%
      candidates[0].score -= 20;
      candidates[1].score += 10;
      candidates[2].score += 25;
      candidates[3].score += 35;
      candidates[4].score += 15;
      break;
    }

    case 'ipertrofia_bilanciato':
    default: {
      // Biomeccanica 25%, Obiettivo 25%, Livello 20%, Attrezzatura 15%, Sicurezza 15%
      candidates[0].score += (biomechanics === 'compound_fundamental' && level === 'elite' ? 12 : -12);
      candidates[1].score += (biomechanics === 'compound_fundamental' ? 28 : 18);
      candidates[2].score += 30;
      candidates[3].score += (biomechanics === 'isolation_accessory' ? 24 : 14);
      candidates[4].score += 6;

      if (biomechanics === 'isolation_accessory') {
        candidates[0].score -= 25;
        candidates[2].score += 15;
        candidates[3].score += 20;
      }
      break;
    }
  }

  // Ordina candidati per score decrescente
  candidates.sort((a, b) => b.score - a.score);

  const top1 = candidates[0];
  const top2 = candidates[1];

  // Normalizza punteggi in scala 0-100
  const score1 = Math.min(98, Math.max(65, Math.round(top1.score)));
  const score2 = Math.min(score1 - 4, Math.max(55, Math.round(top2.score)));

  // 3. Calcolo Trasparente della Confidenza
  // a) Separazione tra top1 e top2 (distanza punteggio)
  const separation = Math.max(4, score1 - score2);
  const marginFactor = Math.min(100, Math.round(separation * 6.5));

  // b) Completezza del contesto disponibile
  let contextPoints = 60;
  if (ctx.athlete_id && ctx.athlete_id !== 'general') contextPoints += 10;
  if (ctx.exercise_family) contextPoints += 10;
  if (ctx.baseline_target.load_kg && ctx.baseline_target.load_kg > 0) contextPoints += 10;
  if (ctx.equipment && ctx.equipment !== 'palestra_completa') contextPoints += 10;
  const contextCompleteness = Math.min(100, contextPoints);

  // c) Allineamento con sicurezza e limitazioni
  const safetyAlignment = hasLimitations ? 95 : 90;

  // d) Confidenza finale pesata
  const confidenceVal = (marginFactor * 0.35 + contextCompleteness * 0.35 + safetyAlignment * 0.30) / 100;
  const confidence = Math.min(0.96, Math.max(0.80, Math.round(confidenceVal * 100) / 100));

  const confidenceBreakdown: import('../../types/progression').AIConfidenceBreakdown = {
    margin_factor: marginFactor,
    context_completeness: contextCompleteness,
    safety_alignment: safetyAlignment,
    weighting_profile: weightingProfile,
  };

  return {
    primary: {
      strategy_name: top1.name,
      rep_range: top1.repRange,
      score: score1,
      focus: top1.focus,
      rationale: top1.rationale,
    },
    secondary: {
      strategy_name: top2.name,
      rep_range: top2.repRange,
      score: score2,
      focus: top2.focus,
      rationale: top2.rationale,
    },
    confidenceScore: confidence,
    confidenceBreakdown,
  };
}

/**
 * Genera 3 proposte contestuali e complementari di progressione basate su atleta, pattern, obiettivo e limitazioni.
 */
export async function generateAIProgressionProposals(
  ctx: import('../../types/progression').AIProgressionGenerationContext
): Promise<import('../../types/progression').AIProgressionProposal[]> {
  const duration = ctx.block_duration_weeks || 6;
  const level = ctx.athlete_level || 'intermedio';
  const isBeginner = level === 'principiante';
  const isAdvanced = level === 'avanzato';
  const isElite = level === 'elite';

  const objective = ctx.objective || 'ipertrofia';
  const isStrength = objective === 'forza';
  const isHypertrophy = objective === 'ipertrofia';
  const isRecomposition = objective === 'ricomposizione';
  const isRehab = objective === 'riabilitazione';
  const isDensity = objective === 'densita';

  const hasLimitations = Boolean(ctx.limitations && ctx.limitations !== 'nessuna' && ctx.limitations.trim() !== '');
  const isHomeGym = ctx.equipment === 'home_gym' || ctx.equipment === 'manubri' || ctx.equipment === 'corpo_libero';

  const biomechanics = classifyExerciseBiomechanics(ctx.exercise_name, ctx.exercise_family);
  const isUpper = ctx.exercise_family?.toLowerCase().includes('spinta') || ctx.exercise_family?.toLowerCase().includes('trazione') || ctx.exercise_name.toLowerCase().includes('panca') || ctx.exercise_name.toLowerCase().includes('rematore');

  // Scoring Pesato
  const scored = evaluateWeightedRepsScoring(ctx, biomechanics);

  // Step di carico calibrato su Upper/Lower, Livello e Attrezzatura
  let baseLoadStep = isUpper ? 1.25 : 2.5;
  if (isBeginner) baseLoadStep = Math.min(baseLoadStep, 1.25);
  if (isHomeGym) baseLoadStep = 2.0; // Salto fisso manubri
  const painCutoff = hasLimitations ? 1 : 2;

  // Calcolo Dinamico dei Range di Ripetizioni Primari
  let baseSets = ctx.baseline_target.sets || 3;
  let baseReps = scored.primary.rep_range;
  let baseWeight = ctx.baseline_target.load_kg || 60;
  let baseRest = ctx.baseline_target.rest_seconds || 90;
  let baseTut = '3-0-1-0';
  let baseRir = 'RIR 2';

  if (isRehab || hasLimitations) {
    baseTut = '4-0-1-1';
    baseRir = 'RIR 3-4';
    baseRest = 90;
  } else if (isStrength) {
    baseRest = biomechanics === 'compound_fundamental' ? 150 : 120;
    baseTut = '2-0-1-0';
    baseRir = isElite ? 'RPE 8 / RIR 1-2' : 'RIR 2';
    if (biomechanics === 'compound_fundamental' && (isElite || isAdvanced)) {
      baseSets = 4;
    }
  } else if (isHypertrophy) {
    if (biomechanics === 'compound_fundamental') {
      baseRest = 120;
      if (isAdvanced) baseSets = 4;
    } else if (biomechanics === 'isolation_accessory') {
      baseTut = '3-0-1-1';
      baseRest = 60;
      baseRir = 'RIR 1-2';
    }
  } else if (isRecomposition) {
    baseRest = 75;
    baseRir = 'RIR 2';
  } else if (isDensity) {
    baseRest = 60;
    baseRir = 'RIR 2';
  }

  type ProgressionCategory = 'Forza' | 'Ipertrofia' | 'Resistenza' | 'Riabilitazione' | 'Personalizzato';

  // --- PROPOSTA 1: Strategia Primaria Adattata al Livello e Biomeccanica ---
  let prop1Method: import('../../types/progression').ProgressionMethod = 'linear_reps';
  let prop1Title = `Progressione Ripetizioni ad Alta Efficienza (${baseReps} reps)`;
  let prop1Focus = 'Ipertrofia & Volume Ottimale';
  let prop1Category: ProgressionCategory = 'Ipertrofia';

  if (isRehab || hasLimitations) {
    prop1Method = 'tut_progression';
    prop1Title = `Riatletizzazione Protetta & Controllo TUT (${baseReps} reps)`;
    prop1Focus = 'Tutela Articolare & Rientro Cauto';
    prop1Category = 'Riabilitazione';
  } else if (isElite && isStrength) {
    prop1Method = 'rpe_progression';
    prop1Title = `Top Set ad Alta Intensità + Backoff Wave (${baseReps})`;
    prop1Focus = 'Forza & Reclutamento Neurale Elite';
    prop1Category = 'Forza';
  } else if (isStrength || (biomechanics === 'compound_fundamental' && !isHomeGym)) {
    prop1Method = 'linear_load';
    prop1Title = `Sovraccarico Lineare Diretto di Carico (${baseReps} reps, +${baseLoadStep}kg)`;
    prop1Focus = 'Forza & Tensione Meccanica';
    prop1Category = 'Forza';
  } else if (isHomeGym) {
    prop1Method = 'linear_reps';
    prop1Title = `Progressione Reps per Carichi Fissi (${baseReps} reps)`;
    prop1Focus = 'Densità & Adattamento Home Gym';
    prop1Category = 'Ipertrofia';
  } else if (isDensity) {
    prop1Method = 'density_progression';
    prop1Title = `Progressione di Densità & Rest Scalare (${baseReps} reps)`;
    prop1Focus = 'Densità & Efficienza Metabolica';
    prop1Category = 'Ipertrofia';
  } else if (biomechanics === 'secondary_compound') {
    prop1Method = 'double_progression';
    prop1Title = `Progressione a Doppio Binario Reps/Carico (${baseReps} reps)`;
    prop1Focus = 'Ipertrofia & Tensione Meccanica';
    prop1Category = 'Ipertrofia';
  }

  const proposal1: import('../../types/progression').AIProgressionProposal = {
    id: `ai-prop-1-${Date.now()}`,
    title: prop1Title,
    method: prop1Method,
    focus: prop1Focus,
    rationale: isElite
      ? `Struttura specifica consigliata per profilo Elite su ${ctx.exercise_name}: serie primaria Top Set (1x3-4 @ RPE 8) per reclutamento neurale seguita da serie di backoff (-8% carico) per accumulo di volume pulito senza cedimento precoce.`
      : isStrength || biomechanics === 'compound_fundamental'
      ? `Metodo lineare diretto su ${ctx.exercise_name}: incremento fisso di +${baseLoadStep}kg ogni settimana per massimizzare la tensione meccanica a parità di ripetizioni (${baseReps}).`
      : isBeginner
      ? `Protocollo preferenziale per principiante su ${ctx.exercise_name}: volume fisso (${baseSets} serie) con incremento reps da ${baseReps.split('-')[0] || '8'} a ${baseReps.split('-')[1] || '10'} a carico stabile per consolidare lo schema motorio.`
      : hasLimitations
      ? `Scelta contestuale prudente: soglia dolore cauta a ${painCutoff}/10 e TUT accentuato (${baseTut}) per stimolare la muscolatura senza sovraccarico compressivo sull'articolazione.`
      : `Sovraccarico progressivo graduale: le ripetizioni salgono nel range consigliato ${baseReps} prima di incrementare il carico di +${baseLoadStep}kg, riducendo il rischio di stallo.`,
    block_duration_weeks: duration,
    reps_analysis: {
      recommended_range: baseReps,
      primary_strategy: scored.primary,
      secondary_viable_strategy: scored.secondary,
      confidence_score: scored.confidenceScore,
      confidence_breakdown: scored.confidenceBreakdown,
      pattern_rationale: biomechanics === 'compound_fundamental'
        ? `Fondamentale multi-articolare: range consigliato compatto (${baseReps}) per prevenire il deterioramento tecnico dovuto alla fatica sistemica.`
        : biomechanics === 'secondary_compound'
        ? `Esercizio multi-articolare secondario: range preferenziale ${baseReps} bilanciato per ipertrofia e stimolo metabolico.`
        : `Esercizio di isolamento: range preferenziale elevato (${baseReps}) per massimizzare il tempo sotto tensione e la connessione mente-muscolo.`,
      level_adaptation: isElite
        ? 'Livello Elite: autoregolazione del buffer (RIR 1-2) con separazione tra stimolo neurale e volumetrico.'
        : isAdvanced
        ? 'Livello Avanzato: utilizzo di micro-carichi e deload reattivo a metà blocco per gestire la fatica del SNC.'
        : isBeginner
        ? 'Livello Principiante: focus primario sull\'aumento delle ripetizioni prima del carico per tutelare tendini e legamenti.'
        : 'Livello Intermedio: progressione bilanciata con step di carico e ripetizioni definiti.',
      volume_intensity_curve: isStrength
        ? 'Curva ad intensità crescente: il carico sale gradualmente a settimana mentre il volume si mantiene compatto.'
        : 'Curva a volume crescente: incremento del numero totale di ripetizioni a carico costante.',
      deload_strategy: duration >= 8
        ? 'Due finestre di scarico: mini-deload a Week 4 (-20% volume) e deload completo di rigenerazione a Week 8.'
        : 'Scarico attivo consigliato a Week 4/fine blocco (-30% volume serie, -10% carico, RIR 3-4).',
      structure_type: isElite ? 'top_set_backoff' : isAdvanced ? 'wave_loading' : (isRehab || hasLimitations) ? 'rehab_tempo' : 'linear_step',
    },
    template: {
      id: `ai-tpl-1-${Date.now()}`,
      name: `AI: ${prop1Title}`,
      method: prop1Method,
      category: prop1Category,
      description: `Protocollo IA su misura per ${ctx.exercise_name} (${level.toUpperCase()}).`,
      conditions: {
        consecutive_success_sessions: 1,
        max_consecutive_failures: 2,
        max_rpe: isElite ? 9.0 : isBeginner ? 8.0 : 8.5,
        pain_threshold_max: painCutoff,
      },
      increments: {
        reps_increment: prop1Method === 'linear_reps' || prop1Method === 'double_progression' ? 1 : undefined,
        reps_max_cap: parseInt(baseReps.split('-')[1] || '10', 10),
        reps_reset_to: parseInt(baseReps.split('-')[0] || '8', 10),
        load_increment_kg: prop1Method === 'linear_load' || prop1Method === 'double_progression' ? baseLoadStep : undefined,
      },
      default_target: {
        sets: baseSets,
        reps: baseReps,
        load_kg: baseWeight,
        rir: baseRir,
        rest_seconds: baseRest,
        tut: baseTut,
      },
      max_steps: duration,
    },
    rule_form_data: {
      name: `AI: ${prop1Title}`,
      description: `Protocollo IA per ${ctx.athlete_name || 'Atleta'} su ${ctx.exercise_name}.`,
      method: prop1Method,
      status: 'active',
      athlete_id: ctx.athlete_id,
      athlete_name: ctx.athlete_name,
      program_id: ctx.program_id,
      program_name: ctx.program_name,
      workout_exercise_id: ctx.workout_exercise_id,
      exercise_name: ctx.exercise_name,
      conditions: {
        consecutive_success_sessions: 1,
        max_consecutive_failures: 2,
        max_rpe: isElite ? 9.0 : isBeginner ? 8.0 : 8.5,
        pain_threshold_max: painCutoff,
      },
      increments: {
        reps_increment: prop1Method === 'linear_reps' || prop1Method === 'double_progression' ? 1 : undefined,
        reps_max_cap: parseInt(baseReps.split('-')[1] || '10', 10),
        reps_reset_to: parseInt(baseReps.split('-')[0] || '8', 10),
        load_increment_kg: prop1Method === 'linear_load' || prop1Method === 'double_progression' ? baseLoadStep : undefined,
      },
      current_step: 1,
      max_steps: duration,
      current_target: {
        sets: baseSets,
        reps: baseReps,
        load_kg: baseWeight,
        rir: baseRir,
        rest_seconds: baseRest,
        tut: baseTut,
      },
      success_count: 0,
      failure_count: 0,
    },
  };

  // --- PROPOSTA 2: Strategia Alternativa Viabile e Complementare ---
  let prop2Method: import('../../types/progression').ProgressionMethod = 'rir_progression';
  let prop2Reps = baseReps;
  let prop2Category: ProgressionCategory = 'Forza';

  if (prop1Method === 'linear_load' || prop1Method === 'rpe_progression') {
    prop2Method = 'rir_progression';
    prop2Reps = isElite ? '4-6' : '5-6';
    prop2Category = 'Forza';
  } else if (prop1Method === 'tut_progression') {
    prop2Method = 'density_progression';
    prop2Reps = '12-15';
    prop2Category = 'Riabilitazione';
  } else if (prop1Method === 'linear_reps') {
    prop2Method = isHomeGym ? 'density_progression' : 'linear_load';
    prop2Reps = isHomeGym ? '10-14' : '6-8';
    prop2Category = isHomeGym ? 'Ipertrofia' : 'Forza';
  } else {
    prop2Method = 'linear_load';
    prop2Reps = '6-8';
    prop2Category = 'Forza';
  }

  const proposal2: import('../../types/progression').AIProgressionProposal = {
    id: `ai-prop-2-${Date.now()}`,
    title: prop2Method === 'linear_load'
      ? `Sovraccarico Lineare Diretto (${prop2Reps} reps, +${baseLoadStep}kg/W)`
      : `Intensificazione RIR & Cedimento Pianificato (${prop2Reps} reps)`,
    method: prop2Method,
    focus: 'Intensità di Carico & Sforzo Percepito',
    rationale: prop2Method === 'linear_load'
      ? `Carico lineare a volume fisso (${baseSets}x${prop2Reps}): incrementa +${baseLoadStep}kg ogni settimana in cui tutte le serie sono completate a target con RIR $\\ge 1$.`
      : `Autoregolazione RIR: mantiene il carico costante e riduce gradualmente il buffer (Settimana 1: RIR 3 $\\rightarrow$ Settimana 3: RIR 1 $\\rightarrow$ Settimana 4: Scarico RIR 4).`,
    block_duration_weeks: duration,
    reps_analysis: {
      recommended_range: prop2Reps,
      primary_strategy: scored.primary,
      secondary_viable_strategy: scored.secondary,
      confidence_score: Math.max(0.78, Math.round((scored.confidenceScore - 0.04) * 100) / 100),
      confidence_breakdown: scored.confidenceBreakdown,
      pattern_rationale: `Target preferenziale ristretto a ${prop2Reps} ripetizioni per concentrare il lavoro sulla tensione meccanica pura ad alta percentuale di 1RM.`,
      level_adaptation: isBeginner
        ? 'Principiante: incremento contenuto (+1.0kg) e stop immediato in caso di cedimento tecnico.'
        : 'Avanzato/Elite: gestione autonoma del RPE e picco di intensità a fine mesociclo.',
      volume_intensity_curve: 'Intensità crescente con carico o sforzo percepito in aumento a parità di ripetizioni.',
      deload_strategy: 'Settimana di deload con ripristino del buffer a RIR 3-4 e taglio del carico del 10%.',
      structure_type: 'linear_step',
    },
    template: {
      id: `ai-tpl-2-${Date.now()}`,
      name: `AI: ${prop2Method === 'linear_load' ? 'Carico Lineare' : 'Intensificazione RIR'} - ${ctx.exercise_name}`,
      method: prop2Method,
      category: prop2Category,
      description: `Intensità programmata con step di ${baseLoadStep}kg o riduzione progressiva del buffer.`,
      conditions: {
        consecutive_success_sessions: 1,
        max_consecutive_failures: 2,
        max_rpe: 9.0,
        pain_threshold_max: painCutoff,
      },
      increments: {
        load_increment_kg: baseLoadStep,
        rir_step: 1,
      },
      default_target: {
        sets: baseSets,
        reps: prop2Reps,
        load_kg: baseWeight,
        rir: prop2Method === 'linear_load' ? 'RIR 2' : 'RIR 3',
        rest_seconds: Math.max(90, baseRest),
        tut: '2-0-1-0',
      },
      max_steps: duration,
    },
    rule_form_data: {
      name: `AI: ${prop2Method === 'linear_load' ? 'Carico Lineare' : 'Intensificazione RIR'} - ${ctx.exercise_name}`,
      description: `Intensità programmata per ${ctx.exercise_name} (${ctx.athlete_name || 'Generale'}).`,
      method: prop2Method,
      status: 'active',
      athlete_id: ctx.athlete_id,
      athlete_name: ctx.athlete_name,
      program_id: ctx.program_id,
      program_name: ctx.program_name,
      workout_exercise_id: ctx.workout_exercise_id,
      exercise_name: ctx.exercise_name,
      conditions: {
        consecutive_success_sessions: 1,
        max_consecutive_failures: 2,
        max_rpe: 9.0,
        pain_threshold_max: painCutoff,
      },
      increments: {
        load_increment_kg: baseLoadStep,
        rir_step: 1,
      },
      current_step: 1,
      max_steps: duration,
      current_target: {
        sets: baseSets,
        reps: prop2Reps,
        load_kg: baseWeight,
        rir: prop2Method === 'linear_load' ? 'RIR 2' : 'RIR 3',
        rest_seconds: Math.max(90, baseRest),
        tut: '2-0-1-0',
      },
      success_count: 0,
      failure_count: 0,
    },
  };

  // --- PROPOSTA 3: Approccio Densità / Volume / Tempo sotto tensione ---
  const prop3Method: import('../../types/progression').ProgressionMethod = (isHomeGym || hasLimitations || isDensity)
    ? 'density_progression'
    : 'linear_sets';

  const prop3Reps = prop3Method === 'density_progression'
    ? (biomechanics === 'isolation_accessory' ? '12-15' : '10-12')
    : (biomechanics === 'compound_fundamental' ? '8-10' : '10-12');

  const proposal3: import('../../types/progression').AIProgressionProposal = {
    id: `ai-prop-3-${Date.now()}`,
    title: prop3Method === 'density_progression'
      ? `Progressione di Densità & Rest Scalare (${prop3Reps} reps)`
      : `Accumulo Volumetrico Mesociclo (${baseSets} $\\rightarrow$ ${baseSets + 2} Serie)`,
    method: prop3Method,
    focus: prop3Method === 'density_progression' ? 'Densità Metabolica & Recupero' : 'Volume Totale di Lavoro',
    rationale: prop3Method === 'density_progression'
      ? `Strategia a carico fisso e sicuro: riduce il recupero (-15s ogni settimana) mantenendo ${prop3Reps} ripetizioni stabili. Ideale per limitare lo stress articolare o compensare attrezzatura limitata (home gym).`
      : `Aumento progressivo delle serie allenanti (da ${baseSets} a ${Math.min(5, baseSets + 2)} serie) nel corso delle settimane, stimolando l'ipertrofia attraverso l'aumento del tonnellaggio.`,
    block_duration_weeks: duration,
    reps_analysis: {
      recommended_range: prop3Reps,
      primary_strategy: scored.primary,
      secondary_viable_strategy: scored.secondary,
      confidence_score: Math.max(0.75, Math.round((scored.confidenceScore - 0.08) * 100) / 100),
      confidence_breakdown: scored.confidenceBreakdown,
      pattern_rationale: `Range preferenziale ${prop3Reps} reps calibrato per massimizzare la glicolisi e l'accumulo di metaboliti senza necessità di carichi massimali.`,
      level_adaptation: hasLimitations
        ? 'Tutela Articolare: progressione metabolica conservativa che evita aumenti di carico potenzialmente rischiosi.'
        : 'Adattamento Home Gym: sfrutta la riduzione dei recuperi per aumentare l\'intensità senza variare il carico dei manubri.',
      volume_intensity_curve: prop3Method === 'density_progression'
        ? 'Densità in aumento con tempo totale di seduta decrescente.'
        : 'Volume in serie crescente con carico e reps stabili.',
      deload_strategy: 'Ripristino dei tempi di recupero originali o taglio di 2 serie per dissipare la fatica locale.',
      structure_type: prop3Method === 'density_progression' ? 'density_tut' : 'linear_step',
    },
    template: {
      id: `ai-tpl-3-${Date.now()}`,
      name: `AI: ${prop3Method === 'density_progression' ? 'Densità' : 'Volume Serie'} - ${ctx.exercise_name}`,
      method: prop3Method,
      category: 'Resistenza',
      description: `Protocollo IA basato sulla variazione di densità/volume a tutela articolare.`,
      conditions: {
        consecutive_success_sessions: 1,
        max_consecutive_failures: 2,
        pain_threshold_max: painCutoff,
      },
      increments: {
        rest_reduction_seconds: 15,
        rest_min_cap_seconds: 45,
        sets_increment: 1,
        sets_max_cap: Math.min(5, baseSets + 2),
      },
      default_target: {
        sets: baseSets,
        reps: prop3Reps,
        load_kg: baseWeight,
        rir: 'RIR 2',
        rest_seconds: baseRest || 90,
        tut: '3-0-1-0',
      },
      max_steps: duration,
    },
    rule_form_data: {
      name: `AI: ${prop3Method === 'density_progression' ? 'Densità' : 'Volume Serie'} - ${ctx.exercise_name}`,
      description: `Strategia volumetrica / densità per ${ctx.exercise_name}.`,
      method: prop3Method,
      status: 'active',
      athlete_id: ctx.athlete_id,
      athlete_name: ctx.athlete_name,
      program_id: ctx.program_id,
      program_name: ctx.program_name,
      workout_exercise_id: ctx.workout_exercise_id,
      exercise_name: ctx.exercise_name,
      conditions: {
        consecutive_success_sessions: 1,
        max_consecutive_failures: 2,
        pain_threshold_max: painCutoff,
      },
      increments: {
        rest_reduction_seconds: 15,
        rest_min_cap_seconds: 45,
        sets_increment: 1,
        sets_max_cap: Math.min(5, baseSets + 2),
      },
      current_step: 1,
      max_steps: duration,
      current_target: {
        sets: baseSets,
        reps: prop3Reps,
        load_kg: baseWeight,
        rir: 'RIR 2',
        rest_seconds: baseRest || 90,
        tut: '3-0-1-0',
      },
      success_count: 0,
      failure_count: 0,
    },
  };

  return [proposal1, proposal2, proposal3];
}


