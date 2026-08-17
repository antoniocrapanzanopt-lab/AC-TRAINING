import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  ProgressionRule,
  ProgressionSuggestion,
  ProgressionEvent,
  ProgressionRuleTemplate,
  ProgressionRuleFormData,
} from '../types/progression';
import { STORAGE_KEYS } from '../config/storageKeys';
import { getStorageItem, setStorageItem } from '../lib/storage';
import {
  MASTER_PROGRESSION_TEMPLATES,
  evaluateProgression,
  PerformanceInput,
  NextTargetResult,
} from '../lib/progression/progressionEngine';
import {
  generateAIProgressionSuggestion,
  AthleteProgressionContext,
} from '../lib/ai/progressionAssistant';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';

interface ProgressionsContextType {
  rules: ProgressionRule[];
  suggestions: ProgressionSuggestion[];
  events: ProgressionEvent[];
  templates: ProgressionRuleTemplate[];
  isLoading: boolean;
  createRule: (data: ProgressionRuleFormData) => Promise<ProgressionRule>;
  updateRule: (id: string, data: Partial<ProgressionRuleFormData>) => Promise<boolean>;
  pauseRule: (id: string) => Promise<boolean>;
  resumeRule: (id: string) => Promise<boolean>;
  deleteRule: (id: string) => Promise<boolean>;
  saveCustomTemplate: (template: ProgressionRuleTemplate) => Promise<boolean>;
  deleteCustomTemplate: (templateId: string) => Promise<boolean>;
  approveSuggestion: (suggId: string, adjustedRule?: Partial<ProgressionRuleFormData>) => Promise<boolean>;
  rejectSuggestion: (suggId: string, feedback?: string) => Promise<boolean>;
  requestAISuggestion: (ctx: AthleteProgressionContext) => Promise<ProgressionSuggestion>;
  evaluateAndApplySessionLog: (ruleId: string, perf: PerformanceInput) => Promise<NextTargetResult | null>;
  getRulesForAthlete: (athleteId: string) => ProgressionRule[];
  getRuleForWorkoutExercise: (exerciseId: string) => ProgressionRule | undefined;
}

const ProgressionsContext = createContext<ProgressionsContextType | undefined>(undefined);

// Initial Demo Seed Data
const buildInitialDemoRules = (): ProgressionRule[] => [
  {
    id: 'rule-demo-1',
    coach_id: 'coach-current',
    athlete_id: 'ath-1',
    athlete_name: 'Marco Rossi',
    program_id: 'prog-1',
    program_name: 'Forza & Ipertrofia Mesociclo 1',
    workout_exercise_id: 'ex-bench-1',
    exercise_name: 'Panca Piana con Bilanciere',
    name: 'Doppia Progressione Panca Piana',
    description: 'Progressione 8-10 reps su 3 serie. Raggiunte le 10 reps a carico fisso, aumento di +2.5kg.',
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
    current_step: 2,
    max_steps: 6,
    current_target: {
      sets: 3,
      reps: '8-10',
      load_kg: 82.5,
      rir: 'RIR 2',
      rest_seconds: 90,
      tut: '3-0-1-0',
    },
    success_count: 2,
    failure_count: 0,
    created_by: 'coach-current',
    approved_by: 'coach-current',
    approved_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'rule-demo-2',
    coach_id: 'coach-current',
    athlete_id: 'ath-2',
    athlete_name: 'Giulia Bianchi',
    program_id: 'prog-2',
    program_name: 'Recomposition & Lower Body Focus',
    workout_exercise_id: 'ex-squat-1',
    exercise_name: 'Squat con Bilanciere',
    name: 'Sovraccarico Lineare Squat',
    description: 'Aumento settimanale di +2.5kg con 4 serie da 5 ripetizioni.',
    method: 'linear_load',
    status: 'active',
    conditions: {
      consecutive_success_sessions: 1,
      max_consecutive_failures: 2,
      max_rpe: 8.5,
      pain_threshold_max: 2,
    },
    increments: {
      load_increment_kg: 2.5,
    },
    current_step: 3,
    max_steps: 5,
    current_target: {
      sets: 4,
      reps: '5',
      load_kg: 75,
      rir: 'RIR 2',
      rest_seconds: 150,
      tut: '2-0-X-0',
    },
    success_count: 3,
    failure_count: 0,
    created_by: 'coach-current',
    approved_by: 'coach-current',
    approved_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
];

const buildInitialDemoSuggestions = (): ProgressionSuggestion[] => [
  {
    id: 'sugg-demo-1',
    coach_id: 'coach-current',
    athlete_id: 'ath-1',
    athlete_name: 'Marco Rossi',
    program_id: 'prog-1',
    program_name: 'Forza & Ipertrofia Mesociclo 1',
    workout_exercise_id: 'ex-bench-1',
    exercise_name: 'Panca Piana con Bilanciere',
    current_target: {
      sets: 3,
      reps: '8-10',
      load_kg: 82.5,
      rir: 'RIR 2',
      rest_seconds: 90,
      tut: '3-0-1-0',
    },
    proposed_target: {
      sets: 3,
      reps: '8-10',
      load_kg: 85,
      rir: 'RIR 2',
      rest_seconds: 90,
      tut: '3-0-1-0',
    },
    suggested_method: 'double_progression',
    reason: 'L\'atleta ha completato 3 serie da 10 reps a 82.5kg con RPE 8.0 e nessun fastidio. Consigliato avanzamento a 85kg.',
    confidence_score: 0.96,
    warnings: [],
    alternative_exercise: null,
    status: 'pending_approval',
    requires_coach_approval: true,
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'sugg-demo-2',
    coach_id: 'coach-current',
    athlete_id: 'ath-3',
    athlete_name: 'Andrea Ferrari',
    program_id: 'prog-3',
    program_name: 'Powerbuilding Block A',
    workout_exercise_id: 'ex-deadlift-1',
    exercise_name: 'Stacco da Terra (Deadlift)',
    current_target: {
      sets: 4,
      reps: '5',
      load_kg: 140,
      rir: 'RIR 1-2',
      rest_seconds: 180,
    },
    proposed_target: {
      sets: 3,
      reps: '5',
      load_kg: 125,
      rir: 'RIR 3 (Scarico)',
      rest_seconds: 180,
    },
    suggested_method: 'deload',
    reason: 'Accumulo di fatica sistemica e RPE 9.5 raggiunto nell\'ultima seduta. Proposta settimana di scarico attivo prima del nuovo blocco.',
    confidence_score: 0.91,
    warnings: ['Fatica neuromuscolare elevata segnalata'],
    alternative_exercise: null,
    status: 'pending_approval',
    requires_coach_approval: true,
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
];

const buildInitialDemoEvents = (): ProgressionEvent[] => [
  {
    id: 'evt-demo-1',
    rule_id: 'rule-demo-1',
    athlete_id: 'ath-1',
    athlete_name: 'Marco Rossi',
    program_id: 'prog-1',
    workout_exercise_id: 'ex-bench-1',
    exercise_name: 'Panca Piana con Bilanciere',
    event_type: 'step_advanced',
    previous_target: {
      sets: 3,
      reps: '8-10',
      load_kg: 80,
      rir: 'RIR 2',
    },
    new_target: {
      sets: 3,
      reps: '8-10',
      load_kg: 82.5,
      rir: 'RIR 2',
    },
    performed_data: {
      sets_done: 3,
      reps_done: [10, 10, 10],
      weight_kg: [80, 80, 80],
      rpe_reported: 8,
      pain_level: 0,
    },
    reason: 'Top range di ripetizioni raggiunto (3x10 a 80kg). Carico aumentato a 82.5kg.',
    triggered_by: 'system_engine',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
];

export const ProgressionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rules, setRules] = useState<ProgressionRule[]>([]);
  const [suggestions, setSuggestions] = useState<ProgressionSuggestion[]>([]);
  const [events, setEvents] = useState<ProgressionEvent[]>([]);
  const [templates, setTemplates] = useState<ProgressionRuleTemplate[]>(MASTER_PROGRESSION_TEMPLATES);
  const [isLoading, setIsLoading] = useState(true);

  const { showSuccess, showError, showInfo } = useToast();
  const { user } = useAuth();

  // Caricamento iniziale con persistenza storage
  useEffect(() => {
    const savedRules = getStorageItem<ProgressionRule[]>(STORAGE_KEYS.PROGRESSION_RULES, []);
    const savedSuggestions = getStorageItem<ProgressionSuggestion[]>(STORAGE_KEYS.PROGRESSION_SUGGESTIONS, []);
    const savedEvents = getStorageItem<ProgressionEvent[]>(STORAGE_KEYS.PROGRESSION_EVENTS, []);
    const savedCustomTemplates = getStorageItem<ProgressionRuleTemplate[]>(STORAGE_KEYS.PROGRESSION_TEMPLATES, []);

    if (savedCustomTemplates && savedCustomTemplates.length > 0) {
      setTemplates([...MASTER_PROGRESSION_TEMPLATES, ...savedCustomTemplates]);
    } else {
      setTemplates(MASTER_PROGRESSION_TEMPLATES);
    }

    if (savedRules.length === 0) {
      const initialRules = buildInitialDemoRules();
      setRules(initialRules);
      setStorageItem(STORAGE_KEYS.PROGRESSION_RULES, initialRules);
    } else {
      setRules(savedRules);
    }

    if (savedSuggestions.length === 0) {
      const initialSugg = buildInitialDemoSuggestions();
      setSuggestions(initialSugg);
      setStorageItem(STORAGE_KEYS.PROGRESSION_SUGGESTIONS, initialSugg);
    } else {
      setSuggestions(savedSuggestions);
    }

    if (savedEvents.length === 0) {
      const initialEvt = buildInitialDemoEvents();
      setEvents(initialEvt);
      setStorageItem(STORAGE_KEYS.PROGRESSION_EVENTS, initialEvt);
    } else {
      setEvents(savedEvents);
    }

    setIsLoading(false);
  }, []);

  const saveCustomTemplate = useCallback(async (template: ProgressionRuleTemplate): Promise<boolean> => {
    try {
      const now = new Date().toISOString();
      const enrichedTemplate: ProgressionRuleTemplate = {
        ...template,
        source: template.source || (template.id.includes('ai') ? 'ai' : 'coach'),
        created_at: template.created_at || now,
        updated_at: now,
      };

      const savedCustom = getStorageItem<ProgressionRuleTemplate[]>(STORAGE_KEYS.PROGRESSION_TEMPLATES, []);
      const existsIdx = savedCustom.findIndex(t => t.id === enrichedTemplate.id);
      let nextCustom: ProgressionRuleTemplate[];
      if (existsIdx >= 0) {
        nextCustom = [...savedCustom];
        nextCustom[existsIdx] = enrichedTemplate;
      } else {
        nextCustom = [enrichedTemplate, ...savedCustom];
      }
      setStorageItem(STORAGE_KEYS.PROGRESSION_TEMPLATES, nextCustom);
      setTemplates([...MASTER_PROGRESSION_TEMPLATES, ...nextCustom]);
      showSuccess('Template Salvato', `Il protocollo "${enrichedTemplate.name}" è ora disponibile in cima alla tua libreria.`);
      return true;
    } catch {
      showError('Errore', 'Impossibile salvare il template.');
      return false;
    }
  }, [showSuccess, showError]);

  const deleteCustomTemplate = useCallback(async (templateId: string): Promise<boolean> => {
    try {
      const savedCustom = getStorageItem<ProgressionRuleTemplate[]>(STORAGE_KEYS.PROGRESSION_TEMPLATES, []);
      const nextCustom = savedCustom.filter(t => t.id !== templateId);
      setStorageItem(STORAGE_KEYS.PROGRESSION_TEMPLATES, nextCustom);
      setTemplates([...MASTER_PROGRESSION_TEMPLATES, ...nextCustom]);
      showInfo('Template Rimosso', 'Il template personalizzato è stato eliminato dalla libreria.');
      return true;
    } catch {
      showError('Errore', 'Impossibile eliminare il template.');
      return false;
    }
  }, [showInfo, showError]);

  const persistRules = useCallback((data: ProgressionRule[]) => {
    setRules(data);
    setStorageItem(STORAGE_KEYS.PROGRESSION_RULES, data);
  }, []);

  const persistSuggestions = useCallback((data: ProgressionSuggestion[]) => {
    setSuggestions(data);
    setStorageItem(STORAGE_KEYS.PROGRESSION_SUGGESTIONS, data);
  }, []);

  const persistEvents = useCallback((data: ProgressionEvent[]) => {
    setEvents(data);
    setStorageItem(STORAGE_KEYS.PROGRESSION_EVENTS, data);
  }, []);

  // 1. CREAZIONE REGOLA DI PROGRESSIONE
  const createRule = useCallback(async (formData: ProgressionRuleFormData): Promise<ProgressionRule> => {
    const now = new Date().toISOString();
    const newRule: ProgressionRule = {
      ...formData,
      id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      coach_id: user?.id || 'coach-current',
      created_by: user?.id || 'coach-current',
      approved_by: user?.id || 'coach-current',
      approved_at: formData.status === 'active' ? now : undefined,
      current_step: 1,
      success_count: 0,
      failure_count: 0,
      created_at: now,
      updated_at: now,
    };

    const newEvent: ProgressionEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      rule_id: newRule.id,
      athlete_id: newRule.athlete_id || 'unassigned',
      athlete_name: newRule.athlete_name || undefined,
      program_id: newRule.program_id || undefined,
      program_name: newRule.program_name || undefined,
      workout_exercise_id: newRule.workout_exercise_id || undefined,
      exercise_name: newRule.exercise_name || newRule.name,
      event_type: 'rule_created',
      new_target: newRule.current_target,
      reason: `Creata nuova regola di progressione "${newRule.name}" (${newRule.method})`,
      triggered_by: 'coach',
      created_at: now,
    };

    const updatedRules = [newRule, ...rules];
    const updatedEvents = [newEvent, ...events];

    persistRules(updatedRules);
    persistEvents(updatedEvents);

    showSuccess('Regola Creata', `Progressione "${newRule.name}" attivata con successo.`);
    return newRule;
  }, [rules, events, user, persistRules, persistEvents, showSuccess]);

  // 2. MODIFICA REGOLA
  const updateRule = useCallback(async (id: string, data: Partial<ProgressionRuleFormData>): Promise<boolean> => {
    const targetRule = rules.find(r => r.id === id);
    if (!targetRule) return false;

    const now = new Date().toISOString();
    const updatedRule: ProgressionRule = {
      ...targetRule,
      ...data,
      updated_at: now,
    };

    const updatedRules = rules.map(r => (r.id === id ? updatedRule : r));
    persistRules(updatedRules);

    const newEvent: ProgressionEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      rule_id: id,
      athlete_id: updatedRule.athlete_id || 'unassigned',
      athlete_name: updatedRule.athlete_name || undefined,
      program_id: updatedRule.program_id || undefined,
      program_name: updatedRule.program_name || undefined,
      workout_exercise_id: updatedRule.workout_exercise_id || undefined,
      exercise_name: updatedRule.exercise_name || undefined,
      event_type: 'rule_modified',
      previous_target: targetRule.current_target,
      new_target: updatedRule.current_target,
      reason: 'Parametri della regola di progressione aggiornati dal coach.',
      triggered_by: 'coach',
      created_at: now,
    };

    persistEvents([newEvent, ...events]);
    showSuccess('Regola Aggiornata', 'I parametri della progressione sono stati aggiornati.');
    return true;
  }, [rules, events, persistRules, persistEvents, showSuccess]);

  // 3. PAUSA REGOLA
  const pauseRule = useCallback(async (id: string): Promise<boolean> => {
    const targetRule = rules.find(r => r.id === id);
    if (!targetRule) return false;

    const now = new Date().toISOString();
    const updatedRules = rules.map(r => (r.id === id ? { ...r, status: 'paused' as const, updated_at: now } : r));
    persistRules(updatedRules);

    const newEvent: ProgressionEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      rule_id: id,
      athlete_id: targetRule.athlete_id || 'unassigned',
      athlete_name: targetRule.athlete_name || undefined,
      program_id: targetRule.program_id || undefined,
      program_name: targetRule.program_name || undefined,
      workout_exercise_id: targetRule.workout_exercise_id || undefined,
      exercise_name: targetRule.exercise_name || undefined,
      event_type: 'rule_paused',
      reason: 'Progressione messa temporaneamente in pausa dal coach.',
      triggered_by: 'coach',
      created_at: now,
    };
    persistEvents([newEvent, ...events]);
    showInfo('Progressione in Pausa', `La regola per ${targetRule.exercise_name || targetRule.name} è in pausa.`);
    return true;
  }, [rules, events, persistRules, persistEvents, showInfo]);

  // 4. RIPRESA REGOLA
  const resumeRule = useCallback(async (id: string): Promise<boolean> => {
    const targetRule = rules.find(r => r.id === id);
    if (!targetRule) return false;

    const now = new Date().toISOString();
    const updatedRules = rules.map(r => (r.id === id ? { ...r, status: 'active' as const, updated_at: now } : r));
    persistRules(updatedRules);

    const newEvent: ProgressionEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      rule_id: id,
      athlete_id: targetRule.athlete_id || 'unassigned',
      athlete_name: targetRule.athlete_name || undefined,
      program_id: targetRule.program_id || undefined,
      program_name: targetRule.program_name || undefined,
      workout_exercise_id: targetRule.workout_exercise_id || undefined,
      exercise_name: targetRule.exercise_name || undefined,
      event_type: 'rule_resumed',
      reason: 'Progressione riattivata dal coach.',
      triggered_by: 'coach',
      created_at: now,
    };
    persistEvents([newEvent, ...events]);
    showSuccess('Progressione Riattivata', `Regola per ${targetRule.exercise_name || targetRule.name} ripristinata ad attiva.`);
    return true;
  }, [rules, events, persistRules, persistEvents, showSuccess]);

  // 5. ELIMINAZIONE REGOLA
  const deleteRule = useCallback(async (id: string): Promise<boolean> => {
    const targetRule = rules.find(r => r.id === id);
    if (!targetRule) return false;

    const updatedRules = rules.filter(r => r.id !== id);
    persistRules(updatedRules);
    showInfo('Regola Eliminata', `La regola "${targetRule.name}" è stata rimossa.`);
    return true;
  }, [rules, persistRules, showInfo]);

  // 6. APPROVAZIONE PROPOSTA AI
  const approveSuggestion = useCallback(async (
    suggId: string,
    adjustedRule?: Partial<ProgressionRuleFormData>
  ): Promise<boolean> => {
    const suggestion = suggestions.find(s => s.id === suggId);
    if (!suggestion) return false;

    const now = new Date().toISOString();
    const existingRule = rules.find(r => r.workout_exercise_id === suggestion.workout_exercise_id);

    let finalRule: ProgressionRule;

    if (existingRule) {
      finalRule = {
        ...existingRule,
        current_target: adjustedRule?.current_target || suggestion.proposed_target,
        method: (adjustedRule?.method || suggestion.suggested_method),
        status: 'active',
        current_step: existingRule.current_step + 1,
        success_count: existingRule.success_count + 1,
        approved_by: user?.id || 'coach-current',
        approved_at: now,
        updated_at: now,
      };
      persistRules(rules.map(r => (r.id === existingRule.id ? finalRule : r)));
    } else {
      finalRule = {
        id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        coach_id: user?.id || 'coach-current',
        athlete_id: suggestion.athlete_id,
        athlete_name: suggestion.athlete_name,
        program_id: suggestion.program_id,
        program_name: suggestion.program_name,
        workout_exercise_id: suggestion.workout_exercise_id,
        exercise_name: suggestion.exercise_name,
        name: `Progressione ${suggestion.exercise_name}`,
        method: suggestion.suggested_method,
        status: 'active',
        conditions: {
          consecutive_success_sessions: 1,
          max_consecutive_failures: 2,
          max_rpe: 9.0,
          pain_threshold_max: 2,
        },
        increments: {
          load_increment_kg: 2.5,
          reps_increment: 1,
        },
        current_step: 1,
        max_steps: 6,
        current_target: adjustedRule?.current_target || suggestion.proposed_target,
        success_count: 1,
        failure_count: 0,
        created_by: user?.id || 'coach-current',
        approved_by: user?.id || 'coach-current',
        approved_at: now,
        created_at: now,
        updated_at: now,
      };
      persistRules([finalRule, ...rules]);
    }

    // Aggiorna suggestion
    const updatedSuggestions = suggestions.map(s =>
      s.id === suggId ? { ...s, status: 'approved' as const, reviewed_at: now } : s
    );
    persistSuggestions(updatedSuggestions);

    // Audit Event
    const newEvent: ProgressionEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      rule_id: finalRule.id,
      suggestion_id: suggId,
      athlete_id: suggestion.athlete_id,
      athlete_name: suggestion.athlete_name,
      program_id: suggestion.program_id,
      workout_exercise_id: suggestion.workout_exercise_id,
      exercise_name: suggestion.exercise_name,
      event_type: 'rule_approved',
      previous_target: suggestion.current_target,
      new_target: finalRule.current_target,
      reason: `Proposta approvata dal coach: ${suggestion.reason}`,
      triggered_by: 'coach',
      created_at: now,
    };
    persistEvents([newEvent, ...events]);

    showSuccess('Proposta Approvata', `Nuovo target applicato per ${suggestion.exercise_name}.`);
    return true;
  }, [suggestions, rules, events, user, persistRules, persistSuggestions, persistEvents, showSuccess]);

  // 7. RIFIUTO PROPOSTA AI
  const rejectSuggestion = useCallback(async (suggId: string, feedback?: string): Promise<boolean> => {
    const suggestion = suggestions.find(s => s.id === suggId);
    if (!suggestion) return false;

    const now = new Date().toISOString();
    const updatedSuggestions = suggestions.map(s =>
      s.id === suggId ? { ...s, status: 'rejected' as const, coach_feedback: feedback, reviewed_at: now } : s
    );
    persistSuggestions(updatedSuggestions);

    const newEvent: ProgressionEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      suggestion_id: suggId,
      athlete_id: suggestion.athlete_id,
      athlete_name: suggestion.athlete_name,
      program_id: suggestion.program_id,
      workout_exercise_id: suggestion.workout_exercise_id,
      exercise_name: suggestion.exercise_name,
      event_type: 'ai_suggestion_rejected',
      reason: feedback ? `Proposta rifiutata dal coach: ${feedback}` : 'Proposta respinta senza modifiche.',
      triggered_by: 'coach',
      created_at: now,
    };
    persistEvents([newEvent, ...events]);
    showInfo('Proposta Rifiutata', 'La proposta AI è stata archiviata senza modificare il programma.');
    return true;
  }, [suggestions, events, persistSuggestions, persistEvents, showInfo]);

  // 8. RICHIESTA SUGGERIMENTO AI
  const requestAISuggestion = useCallback(async (ctx: AthleteProgressionContext): Promise<ProgressionSuggestion> => {
    try {
      const suggestion = await generateAIProgressionSuggestion(ctx);
      persistSuggestions([suggestion, ...suggestions]);

      const newEvent: ProgressionEvent = {
        id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        suggestion_id: suggestion.id,
        athlete_id: ctx.athlete_id,
        athlete_name: ctx.athlete_name,
        program_id: ctx.program_id,
        workout_exercise_id: ctx.workout_exercise_id,
        exercise_name: ctx.exercise_name,
        event_type: 'ai_suggestion_generated',
        new_target: suggestion.proposed_target,
        reason: `Generata proposta AI (Confidenza ${(suggestion.confidence_score * 100).toFixed(0)}%) in attesa di approvazione coach.`,
        triggered_by: 'ai_assistant',
        created_at: new Date().toISOString(),
      };
      persistEvents([newEvent, ...events]);

      showSuccess('Proposta Generata', 'L\'assistente IA ha elaborato una nuova proposta di progressione.');
      return suggestion;
    } catch {
      showError('Errore AI', 'Impossibile elaborare il suggerimento in questo momento.');
      throw new Error('AI progression generation failed');
    }
  }, [suggestions, events, persistSuggestions, persistEvents, showSuccess, showError]);

  // 9. VALUTAZIONE ED APPLICAZIONE AUTOMATICA LOG SEDUTA
  const evaluateAndApplySessionLog = useCallback(async (
    ruleId: string,
    perf: PerformanceInput
  ): Promise<NextTargetResult | null> => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule || rule.status !== 'active') return null;

    const result = evaluateProgression(rule, perf);
    const now = new Date().toISOString();

    let updatedSuccess = rule.success_count;
    let updatedFailure = rule.failure_count;
    let updatedStep = rule.current_step;
    let updatedStatus: ProgressionRule['status'] = rule.status;

    if (result.action === 'advance') {
      updatedSuccess += 1;
      updatedFailure = 0;
      updatedStep += 1;
    } else if (result.action === 'hold' || result.action === 'regress') {
      updatedFailure += 1;
    } else if (result.action === 'pause_pain') {
      updatedStatus = 'paused';
    }

    const updatedRule: ProgressionRule = {
      ...rule,
      current_target: result.new_target,
      current_step: updatedStep,
      success_count: updatedSuccess,
      failure_count: updatedFailure,
      status: updatedStatus,
      updated_at: now,
    };

    persistRules(rules.map(r => (r.id === ruleId ? updatedRule : r)));

    const eventType = result.action === 'advance' ? 'step_advanced'
      : result.action === 'regress' ? 'step_regressed'
      : result.action === 'deload' ? 'deload_triggered'
      : result.action === 'pause_pain' ? 'rule_paused'
      : 'target_missed';

    const newEvent: ProgressionEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      rule_id: rule.id,
      athlete_id: rule.athlete_id || 'unassigned',
      athlete_name: rule.athlete_name || undefined,
      program_id: rule.program_id || undefined,
      program_name: rule.program_name || undefined,
      workout_exercise_id: rule.workout_exercise_id || undefined,
      exercise_name: rule.exercise_name || undefined,
      event_type: eventType,
      previous_target: rule.current_target,
      new_target: result.new_target,
      performed_data: {
        sets_done: perf.sets_completed,
        reps_done: perf.reps_per_set,
        weight_kg: perf.weights_per_set,
        rpe_reported: perf.rpe_reported,
        rir_reported: perf.rir_reported,
        pain_level: perf.pain_level,
      },
      reason: result.reason,
      triggered_by: 'system_engine',
      created_at: now,
    };

    persistEvents([newEvent, ...events]);
    return result;
  }, [rules, events, persistRules, persistEvents]);

  const getRulesForAthlete = useCallback((athleteId: string) => {
    return rules.filter(r => r.athlete_id === athleteId);
  }, [rules]);

  const getRuleForWorkoutExercise = useCallback((exerciseId: string) => {
    return rules.find(r => r.workout_exercise_id === exerciseId && r.status === 'active');
  }, [rules]);

  return (
    <ProgressionsContext.Provider
      value={{
        rules,
        suggestions,
        events,
        templates,
        isLoading,
        createRule,
        updateRule,
        pauseRule,
        resumeRule,
        deleteRule,
        saveCustomTemplate,
        deleteCustomTemplate,
        approveSuggestion,
        rejectSuggestion,
        requestAISuggestion,
        evaluateAndApplySessionLog,
        getRulesForAthlete,
        getRuleForWorkoutExercise,
      }}
    >
      {children}
    </ProgressionsContext.Provider>
  );
};

export const useProgressions = (): ProgressionsContextType => {
  const ctx = useContext(ProgressionsContext);
  if (!ctx) {
    throw new Error('useProgressions deve essere utilizzato all\'interno di ProgressionsProvider');
  }
  return ctx;
};
