import React, { useState } from 'react';
import {
  TrendingUp,
  Layers,
  Sparkles,
  Sliders,
  Check,
  X,
  Pause,
  Play,
  Calendar,
  ChevronDown,
  ChevronUp,
  History,
} from 'lucide-react';
import { WorkoutExercise, ExerciseProgressionMode } from '../../../types/workout';
import {
  ProgressionRule,
  ProgressionRuleTemplate,
  ProgressionRuleFormData,
} from '../../../types/progression';
import { useProgressions } from '../../../context/ProgressionsContext';
import { ExistingProgressionPickerModal } from './ExistingProgressionPickerModal';
import { AIProgressionAssistantModal } from '../../progressions/AIProgressionAssistantModal';
import { InlineProgressionConfigModal } from './InlineProgressionConfigModal';
import { WeeklyProgressionTimeline } from '../../progressions/WeeklyProgressionTimeline';
import { ProgressionDetailDrawer } from '../../progressions/ProgressionDetailDrawer';

interface ExerciseProgressionControlProps {
  exercise: Partial<WorkoutExercise>;
  exerciseIndex: number;
  athleteId?: string;
  athleteName?: string;
  programId?: string;
  programName?: string;
  onUpdateExercise: (fields: Partial<WorkoutExercise>) => void;
}

export const ExerciseProgressionControl: React.FC<ExerciseProgressionControlProps> = ({
  exercise,
  exerciseIndex: _exerciseIndex,
  athleteId,
  athleteName,
  programId,
  programName,
  onUpdateExercise,
}) => {
  const { rules, createRule, updateRule, pauseRule, resumeRule, saveCustomTemplate, approveSuggestion, rejectSuggestion, suggestions } = useProgressions();

  // Modals state
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [selectedDrawerRuleId, setSelectedDrawerRuleId] = useState<string | null>(null);

  const activeRule: ProgressionRule | undefined = exercise.progression_rule_id
    ? rules.find((r) => r.id === exercise.progression_rule_id)
    : undefined;

  const currentMode: ExerciseProgressionMode = exercise.progression_mode || (activeRule ? 'linked_template' : 'none');

  // Pending AI suggestion for this exercise
  const pendingSuggestion = suggestions.find(
    (s) =>
      s.status === 'pending_approval' &&
      (s.workout_exercise_id === exercise.id ||
        (s.exercise_name?.toLowerCase().trim() === exercise.name?.toLowerCase().trim() && s.program_id === programId))
  );

  // 1. Applica Template Esistente (1-Click o Duplicato)
  const handleApplyExistingTemplate = async (
    template: ProgressionRuleTemplate,
    mode: 'linked_template' | 'custom_rule'
  ) => {
    const created = await createRule({
      name: `${template.name} (${exercise.name || 'Esercizio'})`,
      description: template.description,
      athlete_id: athleteId,
      athlete_name: athleteName,
      program_id: programId,
      program_name: programName,
      workout_exercise_id: exercise.id,
      exercise_name: exercise.name,
      method: template.method,
      status: 'active',
      conditions: template.conditions,
      increments: template.increments,
      current_target: {
        sets: exercise.sets || 3,
        reps: exercise.reps_target || '8-10',
        load_kg: exercise.target_weight ? parseFloat(exercise.target_weight) : 60,
        rir: exercise.rir_target || 'RIR 2',
        rest_seconds: exercise.rest_seconds || 90,
        tut: exercise.tut || '3-0-1-0',
      },
      max_steps: template.max_steps,
    });

    onUpdateExercise({
      progression_rule_id: created.id,
      progression_mode: mode,
      progression_summary: `${template.name} • ${template.method.replace('_', ' ')}`,
    });
  };

  // 2. Salva Regola Custom da Modal
  const handleSaveCustomRule = async (formData: ProgressionRuleFormData) => {
    if (activeRule) {
      await updateRule(activeRule.id, formData);
      onUpdateExercise({
        progression_summary: `${formData.name} • ${formData.method.replace('_', ' ')}`,
      });
    } else {
      const created = await createRule(formData);
      onUpdateExercise({
        progression_rule_id: created.id,
        progression_mode: 'custom_rule',
        progression_summary: `${formData.name} • ${formData.method.replace('_', ' ')}`,
      });
    }
  };

  // 3. Disconnetti Progressione
  const handleRemoveProgression = () => {
    onUpdateExercise({
      progression_rule_id: undefined,
      progression_mode: 'none',
      progression_summary: undefined,
    });
    setShowTimeline(false);
  };

  // ─── RENDER: STATO NESSUNA PROGRESSIONE (none) ──────────────────────────────
  if (currentMode === 'none' && !pendingSuggestion) {
    return (
      <>
        <div className="mt-2.5 p-2.5 rounded-xl border border-dashed border-slate-800 bg-slate-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
              <TrendingUp className="w-3 h-3" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-300 block">
                ✏️ Parametri Manuali Fissi
              </span>
              <span className="text-[10px] text-slate-500">
                I target inseriti restano fissi a meno che non applichi un modello di progressione.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setIsAiModalOpen(true)}
              className="px-2.5 py-1 bg-purple-600/15 hover:bg-purple-600/25 text-purple-300 border border-purple-500/30 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span>Chiedi IA</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPickerOpen(true)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-[var(--color-primary)] text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 border border-slate-700 cursor-pointer"
            >
              <Layers className="w-3 h-3 text-[var(--color-primary)]" />
              <span>Scegli Modello</span>
            </button>

            <button
              type="button"
              onClick={() => setIsConfigModalOpen(true)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 border border-slate-700 cursor-pointer"
            >
              <Sliders className="w-3 h-3 text-slate-400" />
              <span>Regola Manuale</span>
            </button>
          </div>
        </div>

        <ExistingProgressionPickerModal
          isOpen={isPickerOpen}
          onClose={() => setIsPickerOpen(false)}
          exerciseName={exercise.name}
          currentTarget={{
            sets: exercise.sets,
            reps: exercise.reps_target,
            load_kg: exercise.target_weight ? parseFloat(exercise.target_weight) : undefined,
            rir: exercise.rir_target,
            rest_seconds: exercise.rest_seconds,
          }}
          onApplyTemplate={handleApplyExistingTemplate}
        />

        <AIProgressionAssistantModal
          isOpen={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
          initialContext={{
            athlete_id: athleteId,
            athlete_name: athleteName,
            program_id: programId,
            program_name: programName,
            workout_exercise_id: exercise.id,
            exercise_name: exercise.name || 'Esercizio',
            baseline_target: {
              sets: exercise.sets || 3,
              reps: exercise.reps_target || '8-10',
              load_kg: exercise.target_weight ? parseFloat(exercise.target_weight) : 60,
              rir: exercise.rir_target || 'RIR 2',
              rest_seconds: exercise.rest_seconds || 90,
              tut: exercise.tut || '3-0-1-0',
            },
          }}
          onOpenInBuilder={(template) => {
            setIsAiModalOpen(false);
            handleApplyExistingTemplate(template, 'custom_rule');
          }}
          onSaveAsTemplate={async (template) => {
            await saveCustomTemplate(template);
          }}
          onApplyToExercise={async (formData) => {
            await handleSaveCustomRule(formData);
            setIsAiModalOpen(false);
          }}
        />

        <InlineProgressionConfigModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          exerciseName={exercise.name || 'Esercizio'}
          athleteId={athleteId}
          athleteName={athleteName}
          programId={programId}
          programName={programName}
          workoutExerciseId={exercise.id}
          currentTarget={{
            sets: exercise.sets || 3,
            reps: exercise.reps_target || '8-10',
            load_kg: exercise.target_weight ? parseFloat(exercise.target_weight) : 60,
            rir: exercise.rir_target || 'RIR 2',
            rest_seconds: exercise.rest_seconds || 90,
            tut: exercise.tut || '3-0-1-0',
          }}
          initialRule={null}
          onSaveRule={handleSaveCustomRule}
        />
      </>
    );
  }

  // ─── RENDER: PROPOSTA IA IN ATTESA (pending_approval) ───────────────────────
  if (currentMode === 'ai_suggested_pending' || (pendingSuggestion && currentMode === 'none')) {
    const sug = pendingSuggestion;
    return (
      <>
        <div className="mt-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 animate-in fade-in">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
            <div>
              <span className="text-xs font-bold text-amber-400 block">
                Proposta IA in Attesa di Approvazione
              </span>
              <p className="text-[11px] text-slate-300">
                {sug?.suggested_method ? sug.suggested_method.replace('_', ' ').toUpperCase() : 'Metodo IA'}:{' '}
                {sug?.proposed_target ? `${sug.proposed_target.sets} set × ${sug.proposed_target.reps} @ ${sug.proposed_target.load_kg || 0}kg` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {sug && (
              <>
                <button
                  type="button"
                  onClick={async () => {
                    await approveSuggestion(sug.id, {});
                    onUpdateExercise({
                      progression_mode: 'custom_rule',
                      progression_summary: `Approvata: ${sug.suggested_method.replace('_', ' ')}`,
                    });
                  }}
                  className="px-2.5 py-1 bg-emerald-500 text-black hover:bg-emerald-400 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
                >
                  <Check className="w-3 h-3" />
                  Approva
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await rejectSuggestion(sug.id, 'Rifiutata dal coach nella scheda');
                    onUpdateExercise({ progression_mode: 'none' });
                  }}
                  className="p-1 text-slate-400 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                  title="Rifiuta proposta"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setIsConfigModalOpen(true)}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold rounded-lg border border-slate-700 cursor-pointer"
            >
              Modifica
            </button>
          </div>
        </div>

        <InlineProgressionConfigModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          exerciseName={exercise.name || 'Esercizio'}
          athleteId={athleteId}
          athleteName={athleteName}
          programId={programId}
          programName={programName}
          workoutExerciseId={exercise.id}
          currentTarget={{
            sets: exercise.sets || 3,
            reps: exercise.reps_target || '8-10',
            load_kg: exercise.target_weight ? parseFloat(exercise.target_weight) : 60,
            rir: exercise.rir_target || 'RIR 2',
            rest_seconds: exercise.rest_seconds || 90,
            tut: exercise.tut || '3-0-1-0',
          }}
          initialRule={activeRule || null}
          onSaveRule={handleSaveCustomRule}
        />
      </>
    );
  }

  // ─── RENDER: STATO PROGRESSIONE ATTIVA (linked_template / custom_rule) ───────
  const isPaused = activeRule?.status === 'paused';
  const methodLabel = activeRule?.method
    ? activeRule.method.replace('_', ' ').toUpperCase()
    : exercise.progression_summary || 'ATTIVA';

  const dummyRuleForTimeline: ProgressionRule = activeRule || {
    id: 'temp-timeline-rule',
    coach_id: 'coach-current',
    athlete_id: athleteId,
    name: exercise.progression_summary || 'Progressione',
    method: 'double_progression',
    status: 'active',
    conditions: { consecutive_success_sessions: 1, max_consecutive_failures: 2, max_rpe: 9, pain_threshold_max: 2 },
    increments: { reps_increment: 1, reps_max_cap: 10, reps_reset_to: 8, load_increment_kg: 2.5 },
    current_step: 1,
    max_steps: 6,
    current_target: {
      sets: exercise.sets || 3,
      reps: exercise.reps_target || '8-10',
      load_kg: exercise.target_weight ? parseFloat(exercise.target_weight) : 60,
      rir: exercise.rir_target || 'RIR 2',
      rest_seconds: exercise.rest_seconds || 90,
      tut: exercise.tut || '3-0-1-0',
    },
    success_count: 0,
    failure_count: 0,
    created_by: 'coach-current',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return (
    <>
      <div
        className={`mt-2.5 p-2.5 rounded-xl border transition-all ${
          isPaused
            ? 'bg-slate-950/60 border-slate-800 opacity-75'
            : 'bg-[var(--color-primary)]/5 border-[var(--color-primary)]/30 shadow-sm'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                isPaused
                  ? 'bg-slate-800 text-slate-400'
                  : 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-white truncate">
                  {activeRule?.name || methodLabel}
                </span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                    isPaused
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}
                >
                  {isPaused ? 'In Pausa' : 'Attiva'}
                </span>
              </div>

              <p className="text-[10px] text-slate-400 truncate">
                ⚡ Aggiorna automaticamente i target settimanali • Step {exercise.week_number || activeRule?.current_step || 1}/{activeRule?.max_steps || 6}
                {activeRule?.increments.load_increment_kg ? ` (+${activeRule.increments.load_increment_kg}kg)` : activeRule?.increments.reps_increment ? ` (+${activeRule.increments.reps_increment} reps)` : ''}
              </p>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-1">
            {/* Toggle Timeline Settimane */}
            <button
              type="button"
              onClick={() => setShowTimeline(!showTimeline)}
              className={`px-2 py-1 text-[11px] font-bold rounded-lg border transition-colors flex items-center gap-1 cursor-pointer ${
                showTimeline
                  ? 'bg-[var(--color-primary)] text-black border-[var(--color-primary)] shadow-sm'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
              title="Mostra sequenza target settimana per settimana"
            >
              <Calendar className="w-3 h-3" />
              <span>Settimane</span>
              {showTimeline ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {activeRule && (
              <button
                type="button"
                onClick={() => (isPaused ? resumeRule(activeRule.id) : pauseRule(activeRule.id))}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title={isPaused ? 'Riattiva progressione' : 'Metti in pausa'}
              >
                {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5" />}
              </button>
            )}

            {activeRule && (
              <button
                type="button"
                onClick={() => setSelectedDrawerRuleId(activeRule.id)}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold rounded-lg border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                title="Visualizza storico sedute e log avanzamenti"
              >
                <History className="w-3 h-3 text-cyan-400" />
                Storico
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsConfigModalOpen(true)}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-lg border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Sliders className="w-3 h-3 text-[var(--color-primary)]" />
              Modifica
            </button>

            <button
              type="button"
              onClick={() => setIsPickerOpen(true)}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold rounded-lg border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
              title="Sostituisci con un altro template"
            >
              <Layers className="w-3 h-3" />
              Sostituisci
            </button>

            <button
              type="button"
              onClick={handleRemoveProgression}
              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
              title="Rimuovi progressione dall'esercizio"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Accordion Inline Weekly Timeline Preview */}
        {showTimeline && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 animate-in fade-in duration-150">
            <WeeklyProgressionTimeline
              ruleOrTemplate={dummyRuleForTimeline}
              baseTarget={{
                sets: exercise.sets || 3,
                reps: exercise.reps_target || '8-10',
                load_kg: exercise.target_weight ? parseFloat(exercise.target_weight) : 60,
                rir: exercise.rir_target || 'RIR 2',
                rest_seconds: exercise.rest_seconds || 90,
                tut: exercise.tut || '3-0-1-0',
              }}
              currentStep={activeRule?.current_step || 1}
              totalWeeks={activeRule?.max_steps || 6}
            />
          </div>
        )}
      </div>

      <ExistingProgressionPickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        exerciseName={exercise.name}
        currentTarget={{
          sets: exercise.sets,
          reps: exercise.reps_target,
          load_kg: exercise.target_weight ? parseFloat(exercise.target_weight) : undefined,
          rir: exercise.rir_target,
          rest_seconds: exercise.rest_seconds,
        }}
        onApplyTemplate={handleApplyExistingTemplate}
      />

      <InlineProgressionConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        exerciseName={exercise.name || 'Esercizio'}
        athleteId={athleteId}
        athleteName={athleteName}
        programId={programId}
        programName={programName}
        workoutExerciseId={exercise.id}
        currentTarget={{
          sets: exercise.sets || 3,
          reps: exercise.reps_target || '8-10',
          load_kg: exercise.target_weight ? parseFloat(exercise.target_weight) : 60,
          rir: exercise.rir_target || 'RIR 2',
          rest_seconds: exercise.rest_seconds || 90,
          tut: exercise.tut || '3-0-1-0',
        }}
        initialRule={activeRule || null}
        onSaveRule={handleSaveCustomRule}
      />

      {/* Drawer Dettaglio & Audit Log */}
      {selectedDrawerRuleId && (
        <ProgressionDetailDrawer
          ruleId={selectedDrawerRuleId}
          isOpen={Boolean(selectedDrawerRuleId)}
          onClose={() => setSelectedDrawerRuleId(null)}
          onEdit={() => {
            setSelectedDrawerRuleId(null);
            setIsConfigModalOpen(true);
          }}
        />
      )}
    </>
  );
};
