import React, { useState } from 'react';
import {
  Sliders,
  Save,
  X,
  Play,
  Dumbbell,
  Calendar,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  ProgressionRule,
  ProgressionRuleFormData,
  ProgressionMethod,
  ProgressionRuleTemplate,
} from '../../types/progression';
import { evaluateProgression, NextTargetResult } from '../../lib/progression/progressionEngine';
import { useExercises } from '../../context/ExercisesContext';
import { WeeklyProgressionTimeline } from './WeeklyProgressionTimeline';

interface ProgressionBuilderProps {
  initialData?: Partial<ProgressionRule> | ProgressionRuleTemplate;
  onSave: (data: ProgressionRuleFormData) => Promise<void>;
  onCancel: () => void;
}

export const ProgressionBuilder: React.FC<ProgressionBuilderProps> = ({
  initialData,
  onSave,
  onCancel,
}) => {
  const { exercises } = useExercises();

  const isTemplate = 'category' in (initialData || {});
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [formData, setFormData] = useState<ProgressionRuleFormData>({
    name: initialData?.name || 'Nuova Regola di Sovraccarico',
    description: initialData?.description || '',
    method: (initialData?.method as ProgressionMethod) || 'linear_load',
    status: (initialData && 'status' in initialData ? initialData.status : 'active') || 'active',
    athlete_id: initialData && 'athlete_id' in initialData ? initialData.athlete_id : undefined,
    athlete_name: initialData && 'athlete_name' in initialData ? initialData.athlete_name : undefined,
    program_id: initialData && 'program_id' in initialData ? initialData.program_id : undefined,
    program_name: initialData && 'program_name' in initialData ? initialData.program_name : undefined,
    workout_exercise_id: initialData && 'workout_exercise_id' in initialData ? initialData.workout_exercise_id : undefined,
    exercise_name: initialData && 'exercise_name' in initialData ? initialData.exercise_name : 'Panca Piana con Bilanciere',
    conditions: {
      consecutive_success_sessions: initialData?.conditions?.consecutive_success_sessions ?? 1,
      max_consecutive_failures: initialData?.conditions?.max_consecutive_failures ?? 2,
      max_rpe: initialData?.conditions?.max_rpe ?? 9.0,
      pain_threshold_max: initialData?.conditions?.pain_threshold_max ?? 2,
    },
    increments: {
      load_increment_kg: initialData?.increments?.load_increment_kg ?? 2.5,
      reps_increment: initialData?.increments?.reps_increment ?? 1,
      reps_max_cap: initialData?.increments?.reps_max_cap ?? 10,
      reps_reset_to: initialData?.increments?.reps_reset_to ?? 8,
      sets_increment: initialData?.increments?.sets_increment ?? 1,
      rest_reduction_seconds: initialData?.increments?.rest_reduction_seconds ?? 15,
      rir_step: initialData?.increments?.rir_step ?? 1,
    },
    current_step: 1,
    max_steps: initialData?.max_steps ?? 6,
    current_target: (initialData && 'current_target' in initialData ? initialData.current_target : undefined) ||
      (initialData && 'default_target' in initialData ? (initialData as ProgressionRuleTemplate).default_target : {
        sets: 3,
        reps: '8-10',
        load_kg: 60,
        rir: 'RIR 2',
        rest_seconds: 90,
        tut: '3-0-1-0',
      }),
    success_count: 0,
    failure_count: 0,
    created_by: 'coach-current',
  });

  // Current Rule Mock for Live Projection & Simulator
  const currentRuleMock: ProgressionRule = {
    ...formData,
    id: 'preview-rule',
    coach_id: 'coach-current',
    current_step: formData.current_step || 1,
    success_count: formData.success_count || 0,
    failure_count: formData.failure_count || 0,
    created_by: formData.created_by || 'coach-current',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Simulatore di Test (Avanzate)
  const [testSets, setTestSets] = useState(formData.current_target.sets || 3);
  const [testReps, setTestReps] = useState(10);
  const [testWeight, setTestWeight] = useState(formData.current_target.load_kg || 60);
  const [testRpe, setTestRpe] = useState(8.5);
  const [testPain, setTestPain] = useState(0);
  const [simulationResult, setSimulationResult] = useState<NextTargetResult | null>(null);

  const handleSimulate = () => {
    const res = evaluateProgression(currentRuleMock, {
      sets_completed: testSets,
      reps_per_set: Array(testSets).fill(testReps),
      weights_per_set: Array(testSets).fill(testWeight),
      rpe_reported: testRpe,
      pain_level: testPain,
    });

    setSimulationResult(res);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)]">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">
              {initialData && 'id' in initialData && !isTemplate ? 'Modifica Weekly Progression' : 'Weekly Progression Builder'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Imposta il protocollo di sovraccarico e visualizza la sequenza settimana per settimana.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* SEZIONE 1: PARAMETRI ESSENZIALI */}
      <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Nome Modello / Regola *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Strategia / Metodo di Progressione *</label>
            <select
              value={formData.method}
              onChange={(e) => setFormData({ ...formData, method: e.target.value as ProgressionMethod })}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-[var(--color-primary)]"
            >
              <option value="linear_load">Carico Lineare (+kg a target costante)</option>
              <option value="linear_reps">Progressione Ripetizioni (+reps a carico stabile)</option>
              <option value="double_progression">Doppia Progressione (Reps fino a Cap → Carico)</option>
              <option value="rir_progression">Periodizzazione RIR (Buffer scalare)</option>
              <option value="rpe_progression">Top Set + Backoff Wave (RPE)</option>
              <option value="density_progression">Progressione di Densità (-recupero)</option>
              <option value="tut_progression">Controllo TUT & Tempo Eccentrico</option>
              <option value="linear_sets">Accumulo Serie (+volume)</option>
              <option value="deload">Scarico Programmato (Deload)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1 flex items-center gap-1">
              <Dumbbell className="w-3.5 h-3.5 text-[var(--color-primary)]" /> Esercizio Target
            </label>
            <input
              type="text"
              value={formData.exercise_name || ''}
              onChange={(e) => setFormData({ ...formData, exercise_name: e.target.value })}
              list="exercises-progression-builder-list"
              placeholder="es. Panca Piana Bilanciere"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold focus:outline-none"
            />
            <datalist id="exercises-progression-builder-list">
              {exercises.map((ex) => (
                <option key={ex.id} value={ex.name} />
              ))}
            </datalist>
          </div>
        </div>

        {/* Target di Base / Settimana 1 */}
        <div className="pt-2 border-t border-slate-800/80">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2">
            Parametri di Partenza (Week 1 Baseline)
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Serie</label>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.current_target.sets}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    current_target: {
                      ...formData.current_target,
                      sets: parseInt(e.target.value) || 1,
                    },
                  })
                }
                className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold text-center"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Reps Target</label>
              <input
                type="text"
                value={formData.current_target.reps}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    current_target: {
                      ...formData.current_target,
                      reps: e.target.value,
                    },
                  })
                }
                placeholder="8-10"
                className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold text-center"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Carico (kg)</label>
              <input
                type="number"
                step="0.5"
                value={formData.current_target.load_kg || 60}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    current_target: {
                      ...formData.current_target,
                      load_kg: parseFloat(e.target.value) || 0,
                    },
                  })
                }
                className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-[var(--color-primary)] text-xs font-bold text-center"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">RIR / RPE</label>
              <input
                type="text"
                value={formData.current_target.rir || 'RIR 2'}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    current_target: {
                      ...formData.current_target,
                      rir: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold text-center"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Recupero (s)</label>
              <input
                type="number"
                step="5"
                value={formData.current_target.rest_seconds || 90}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    current_target: {
                      ...formData.current_target,
                      rest_seconds: parseInt(e.target.value) || 60,
                    },
                  })
                }
                className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold text-center"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SEZIONE 2: PROIEZIONE SETTIMANALE DEL BLOCCO (IN PRIMO PIANO) */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[var(--color-primary)]" />
              Sequenza Settimanale del Blocco ({formData.max_steps || 6} Settimane)
            </h4>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const current = formData.max_steps || 6;
                if (current < 16) {
                  setFormData({ ...formData, max_steps: current + 1 });
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-[var(--color-primary)] border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Aggiungi una nuova settimana al blocco"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>+ Aggiungi Settimana</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const current = formData.max_steps || 6;
                if (current > 2) {
                  setFormData({ ...formData, max_steps: current - 1 });
                }
              }}
              disabled={(formData.max_steps || 6) <= 2}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              title="Rimuovi ultima settimana"
            >
              - 1W
            </button>
          </div>
        </div>

        <WeeklyProgressionTimeline
          ruleOrTemplate={currentRuleMock}
          baseTarget={formData.current_target}
          currentStep={formData.current_step || 1}
          totalWeeks={formData.max_steps || 6}
          onChangeTotalWeeks={(newWeeks) => setFormData({ ...formData, max_steps: newWeeks })}
        />
      </div>

      {/* SEZIONE 3: IMPOSTAZIONI AVANZATE & TEST MOTORE (COLLAPSIBLE) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full p-4 flex items-center justify-between text-xs font-bold text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-slate-400" />
            <span>Impostazioni Avanzate, Filtri di Sicurezza & Simulatore</span>
          </div>
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showAdvanced && (
          <div className="p-4 border-t border-slate-800 space-y-4 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Incremento Carico (+kg)</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.increments.load_increment_kg || 2.5}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      increments: {
                        ...formData.increments,
                        load_increment_kg: parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Incremento Reps (+reps)</label>
                <input
                  type="number"
                  value={formData.increments.reps_increment || 1}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      increments: {
                        ...formData.increments,
                        reps_increment: parseInt(e.target.value) || 1,
                      },
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Soglia Dolore Max (/10)</label>
                <input
                  type="number"
                  value={formData.conditions.pain_threshold_max ?? 2}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      conditions: {
                        ...formData.conditions,
                        pain_threshold_max: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-900 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Max Fallimenti prima di Regredire</label>
                <input
                  type="number"
                  value={formData.conditions.max_consecutive_failures || 2}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      conditions: {
                        ...formData.conditions,
                        max_consecutive_failures: parseInt(e.target.value) || 2,
                      },
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs font-bold"
                />
              </div>
            </div>

            {/* Simulatore Integrato */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 text-[var(--color-primary)]" /> Test Risposta Motore
                </span>
                <button
                  type="button"
                  onClick={handleSimulate}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-[var(--color-primary)] text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Esegui Test
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-slate-500 block">Set Fatti</label>
                  <input
                    type="number"
                    value={testSets}
                    onChange={(e) => setTestSets(parseInt(e.target.value) || 1)}
                    className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-center"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block">Reps Fatte</label>
                  <input
                    type="number"
                    value={testReps}
                    onChange={(e) => setTestReps(parseInt(e.target.value) || 8)}
                    className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-center"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block">Carico (kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={testWeight}
                    onChange={(e) => setTestWeight(parseFloat(e.target.value) || 60)}
                    className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-center"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block">RPE</label>
                  <input
                    type="number"
                    step="0.5"
                    value={testRpe}
                    onChange={(e) => setTestRpe(parseFloat(e.target.value) || 8)}
                    className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-center"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-rose-400 block">Dolore (/10)</label>
                  <input
                    type="number"
                    value={testPain}
                    onChange={(e) => setTestPain(parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 bg-slate-950 border border-rose-500/40 rounded-lg text-rose-300 font-mono text-center"
                  />
                </div>
              </div>

              {simulationResult && (
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-700 text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-slate-400">Esito Motore:</span>
                    <span className="text-emerald-400 uppercase">{simulationResult.action}</span>
                  </div>
                  <p className="text-[11px] text-slate-300">{simulationResult.reason}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-slate-800 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
        >
          Annulla
        </button>

        <button
          type="submit"
          className="px-6 py-2.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-black text-xs font-black shadow-lg shadow-[var(--color-primary)]/20 transition-all flex items-center gap-2 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{isTemplate || !formData.workout_exercise_id ? 'Salva Template nella Libreria' : 'Salva Regola & Settimane'}</span>
        </button>
      </div>
    </form>
  );
};
