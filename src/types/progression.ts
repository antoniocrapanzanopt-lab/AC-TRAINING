export type ProgressionMethod =
  | 'double_progression'       // Aumento reps fino a top range, poi aumento carico e reset reps
  | 'linear_load'              // Aumento fisso di carico settimanale (+1kg, +2.5kg, +5kg)
  | 'linear_reps'              // Aumento ripetizioni a carico costante
  | 'linear_sets'              // Aumento del volume in serie (es. da 3 a 5 serie nel mesociclo)
  | 'rir_progression'          // Progressione intensità tramite riduzione RIR (es. RIR 3 -> 2 -> 1 -> 0)
  | 'rpe_progression'          // Progressione tramite target RPE crescente (es. RPE 7 -> 8 -> 9 -> 9.5)
  | 'tut_progression'          // Aumento del tempo sotto tensione (es. eccentrica da 3s a 5s)
  | 'density_progression'      // Riduzione tempi di recupero a pari volume e carico (es. 90s -> 75s -> 60s)
  | 'regression'               // Riduzione carico/volume o semplificazione biomeccanica
  | 'substitution'             // Sostituzione esercizio per attrezzatura occupata o fastidio articolare
  | 'deload';                  // Scarico programmato (-30% volume, -10% carico)

export type ProgressionStatus =
  | 'draft'
  | 'pending_approval'
  | 'active'
  | 'paused'
  | 'completed'
  | 'archived'
  | 'rejected';

export type ProgressionEventType =
  | 'rule_created'
  | 'rule_approved'
  | 'rule_modified'
  | 'rule_paused'
  | 'rule_resumed'
  | 'rule_completed'
  | 'target_achieved'
  | 'target_missed'
  | 'step_advanced'
  | 'step_regressed'
  | 'deload_triggered'
  | 'exercise_substituted'
  | 'ai_suggestion_generated'
  | 'ai_suggestion_rejected';

export interface ProgressionCondition {
  min_completed_reps?: number;
  max_rpe?: number;
  min_rir?: number;
  consecutive_success_sessions?: number; // Quante sedute consecutive superate per avanzare (default 1)
  max_consecutive_failures?: number;     // Quanti fallimenti prima di regredire o scaricare (default 2)
  pain_threshold_max?: number;           // Scala 0-10, default <= 2
}

export interface ProgressionIncrement {
  load_increment_kg?: number;
  load_increment_percentage?: number;
  reps_increment?: number;
  reps_max_cap?: number;
  reps_reset_to?: number;
  sets_increment?: number;
  sets_max_cap?: number;
  rest_reduction_seconds?: number;
  rest_min_cap_seconds?: number;
  tut_eccentric_seconds?: number;
  rir_step?: number;
  rpe_step?: number;
}

export interface ProgressionTarget {
  sets: number;
  reps: string;
  load_kg?: number | null;
  rir?: string | null;
  rpe?: number | null;
  rest_seconds?: number;
  tut?: string | null;
}

export interface ProgressionRule {
  id: string;
  coach_id: string;
  athlete_id?: string | null;           // Se null, è un template globale
  athlete_name?: string | null;
  program_id?: string | null;
  program_name?: string | null;
  workout_exercise_id?: string | null;  // Esercizio specifico nella scheda
  exercise_name?: string | null;
  exercise_catalog_id?: string | null;  // Esercizio dalla libreria globale
  name: string;
  description?: string;
  method: ProgressionMethod;
  status: ProgressionStatus;
  conditions: ProgressionCondition;
  increments: ProgressionIncrement;
  current_step: number;
  max_steps?: number | null;
  current_target: ProgressionTarget;
  success_count: number;
  failure_count: number;
  created_by: string;
  approved_by?: string | null;
  approved_at?: string | null;
  version?: number;
  created_at: string;
  updated_at: string;
}

export interface ProgressionSuggestion {
  id: string;
  coach_id: string;
  athlete_id: string;
  athlete_name?: string;
  program_id: string;
  program_name?: string;
  workout_exercise_id: string;
  exercise_name: string;
  current_target: ProgressionTarget;
  proposed_target: ProgressionTarget;
  suggested_method: ProgressionMethod;
  reason: string;
  confidence_score: number; // 0.0 - 1.0
  warnings?: string[];
  alternative_exercise?: {
    id: string;
    name: string;
    reason: string;
  } | null;
  status: 'pending_approval' | 'approved' | 'rejected' | 'modified';
  requires_coach_approval: boolean;
  coach_feedback?: string;
  version?: number;
  created_at: string;
  reviewed_at?: string | null;
}

export interface ProgressionEvent {
  id: string;
  sequence_number?: number;
  previous_event_hash?: string;
  event_hash?: string;
  payload_hash?: string;
  rule_id?: string | null;
  suggestion_id?: string | null;
  athlete_id: string;
  athlete_name?: string | null;
  program_id?: string | null;
  program_name?: string | null;
  workout_exercise_id?: string | null;
  exercise_name?: string | null;
  event_type: ProgressionEventType;
  previous_target?: ProgressionTarget | null;
  new_target?: ProgressionTarget | null;
  performed_data?: {
    sets_done?: number;
    reps_done?: number[];
    weight_kg?: number[];
    rpe_reported?: number;
    rir_reported?: number;
    pain_level?: number;
    notes?: string;
  } | null;
  reason: string;
  triggered_by: 'system_engine' | 'coach' | 'ai_assistant';
  created_at: string;
}

export type ProgressionRuleFormData = Omit<
  ProgressionRule,
  'id' | 'created_at' | 'updated_at' | 'coach_id' | 'current_step' | 'success_count' | 'failure_count' | 'created_by' | 'approved_by' | 'approved_at'
> & {
  id?: string;
  current_step?: number;
  success_count?: number;
  failure_count?: number;
  created_by?: string;
  approved_by?: string | null;
  approved_at?: string | null;
};

export interface ProgressionRuleTemplate {
  id: string;
  name: string;
  method: ProgressionMethod;
  description: string;
  conditions: ProgressionCondition;
  increments: ProgressionIncrement;
  default_target: ProgressionTarget;
  max_steps?: number;
  category: 'Forza' | 'Ipertrofia' | 'Resistenza' | 'Riabilitazione' | 'Personalizzato';
  source?: 'coach' | 'ai' | 'system';
  created_at?: string;
  updated_at?: string;
  objective?: string;
}

export type ProgressionWeekPhase = 
  | 'accumulation'    // Volume / Ripetizioni in salita
  | 'intensification' // Incremento del carico / RPE alto
  | 'peak'            // Top range o target massimo
  | 'deload'          // Scarico rigenerativo (-30% volume, -10% carico)
  | 'hold'            // Consolidamento / Ripetizione carico
  | 'regression';     // Ricalibrazione conservativa

export interface ProgressionWeekProjection {
  week_number: number;
  phase: ProgressionWeekPhase;
  phase_label: string;
  sets: number;
  reps: string;
  load_kg?: number;
  load_display?: string;
  rir?: string;
  rpe?: number;
  rest_seconds?: number;
  tut?: string;
  condition: string;
  expected_action: string;
  is_deload?: boolean;
  notes?: string;
}

export interface AIProgressionGenerationContext {
  athlete_id?: string;
  athlete_name?: string;
  athlete_level?: 'principiante' | 'intermedio' | 'avanzato' | 'elite';
  program_id?: string;
  program_name?: string;
  workout_exercise_id?: string;
  exercise_name: string;
  exercise_family?: string;
  objective?: 'ipertrofia' | 'forza' | 'densita' | 'ricomposizione' | 'riabilitazione';
  block_phase?: 'accumulo' | 'intensificazione' | 'peak' | 'riatletizzazione' | 'deload';
  block_duration_weeks?: number;
  equipment?: 'palestra_completa' | 'bilanciere_rack' | 'home_gym' | 'manubri' | 'corpo_libero';
  limitations?: string;
  baseline_target: ProgressionTarget;
  coach_notes?: string;
}

export interface AIRepStrategyScored {
  strategy_name: string;
  rep_range: string;
  score: number; // 0-100
  focus: string;
  rationale: string;
}

export interface AIConfidenceBreakdown {
  margin_factor: number; // 0-100 (separazione primaria vs secondaria)
  context_completeness: number; // 0-100 (dati atleta/pattern specificati)
  safety_alignment: number; // 0-100 (rispetto vincoli dolore/attrezzatura)
  weighting_profile: 'forza_centrico' | 'ipertrofia_bilanciato' | 'rehab_cautelativo' | 'home_gym_compensativo' | 'standard';
}

export interface AIRepsAnalysis {
  recommended_range: string;
  primary_strategy: AIRepStrategyScored;
  secondary_viable_strategy: AIRepStrategyScored;
  confidence_score: number; // 0.0 - 1.0
  confidence_breakdown?: AIConfidenceBreakdown;
  pattern_rationale: string;
  level_adaptation: string;
  volume_intensity_curve: string;
  deload_strategy: string;
  structure_type: 'linear_step' | 'double_progression' | 'wave_loading' | 'top_set_backoff' | 'density_tut' | 'rehab_tempo';
}

export interface AIProgressionProposal {
  id: string;
  title: string;
  method: ProgressionMethod;
  focus: string;
  rationale: string;
  block_duration_weeks: number;
  template: ProgressionRuleTemplate;
  rule_form_data: ProgressionRuleFormData;
  reps_analysis?: AIRepsAnalysis;
}

/**
 * Candidato Strategico calcolato deterministamente dal Motore (Cervello)
 */
export interface BrainStrategyCandidate {
  method: ProgressionMethod;
  name: string;
  category: 'Forza' | 'Ipertrofia' | 'Resistenza' | 'Recupero';
  score: number; // 0 - 100
  confidence: number; // 0.0 - 1.0
  target: ProgressionTarget;
  increments: ProgressionIncrement;
  conditions: ProgressionCondition;
  rule_template_id?: string;
  scoring_breakdown: {
    exercise_affinity: number; // multiarticolare vs isolamento
    fatigue_and_recovery: number; // rpe/dolore/stress
    goal_alignment: number; // forza, ipertrofia, ricomposizione
    safety_compliance: number; // assenza infortuni/controindicazioni
  };
  rationale_technical: string;
}

/**
 * Output Ufficiale del Motore Decisionale (Cervello)
 */
export interface BrainProgressionDecision {
  exercise_name: string;
  athlete_name: string;
  primary_strategy: BrainStrategyCandidate;
  alternative_strategy: BrainStrategyCandidate;
  confidence_overall: number; // 0.0 - 1.0
  safety_constraints: {
    is_safe: boolean;
    pain_level_detected: number;
    fatigue_level_detected: 'low' | 'moderate' | 'high' | 'excessive';
    warnings: string[];
    mandatory_action: 'none' | 'deload' | 'substitute' | 'hold';
  };
  evaluated_at: string;
}

export interface BrainAnchoredProgressionProposal {
  id: string;
  brain_decision: BrainProgressionDecision;
  brain_decision_version: string;
  policy_snapshot: Record<string, unknown>;
  proposal_hash: string;
  human_rationale: string;
  comparison: {
    primary_why: string;
    alternative_when: string;
  };
  missing_data_prompts?: string[];
  coaching_cues: string[];
  status: 'pending_approval' | 'approved' | 'rejected' | 'modified' | 'expired';
  requires_coach_approval: true;
  applied_choice?: 'primary' | 'alternative' | 'custom' | 'rejected';
  final_action?: 'applied_primary' | 'applied_alternative' | 'applied_custom' | 'rejected' | 'expired';
  approved_by?: string | null;
  approved_at?: string | null;
  rejected_by?: string | null;
  rejected_at?: string | null;
  version: number;
  created_at: string;
  expires_at: string;
}
