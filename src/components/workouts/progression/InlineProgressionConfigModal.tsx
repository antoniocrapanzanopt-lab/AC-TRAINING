import React, { useState } from 'react';
import {
  X,
  Sliders,
  Check,
  Play,
  Calendar,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  ProgressionRule,
  ProgressionRuleFormData,
  ProgressionMethod,
  ProgressionTarget,
} from '../../../types/progression';
import { evaluateProgression, NextTargetResult } from '../../../lib/progression/progressionEngine';
import { WeeklyProgressionTimeline } from '../../progressions/WeeklyProgressionTimeline';

interface InlineProgressionConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseName: string;
  athleteId?: string;
  athleteName?: string;
  programId?: string;
  programName?: string;
  workoutExerciseId?: string;
  currentTarget: ProgressionTarget;
  initialRule?: ProgressionRule | null;
  onSaveRule: (data: ProgressionRuleFormData) => Promise<void>;
}

export const InlineProgressionConfigModal: React.FC<InlineProgressionConfigModalProps> = ({
  isOpen,
  onClose,
  exerciseName,
  athleteId,
  athleteName,
  programId,
  programName,
  workoutExerciseId,
  currentTarget,
  initialRule,
  onSaveRule,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [formData, setFormData] = useState<ProgressionRuleFormData>(() => {
    if (initialRule) {
      return {
        name: initialRule.name,
        description: initialRule.description || '',
        athlete_id: initialRule.athlete_id,
        athlete_name: initialRule.athlete_name,
        program_id: initialRule.program_id,
        program_name: initialRule.program_name,
        workout_exercise_id: initialRule.workout_exercise_id,
        exercise_name: initialRule.exercise_name || exerciseName,
        method: initialRule.method,
        status: initialRule.status,
        conditions: { ...initialRule.conditions },
        increments: { ...initialRule.increments },
        current_target: { ...initialRule.current_target },
        max_steps: initialRule.max_steps || 6,
        current_step: initialRule.current_step || 1,
        success_count: initialRule.success_count || 0,
        failure_count: initialRule.failure_count || 0,
        created_by: initialRule.created_by,
      };
    }
    const isHeavy = (exerciseName || '').toLowerCase().includes('panca') ||
      (exerciseName || '').toLowerCase().includes('squat') ||
      (exerciseName || '').toLowerCase().includes('stacco') ||
      (exerciseName || '').toLowerCase().includes('military');

    const defaultInitMethod: ProgressionMethod = isHeavy ? 'linear_load' : 'linear_reps';

    return {
      name: `Progressione ${exerciseName || 'Esercizio'}`,
      description: `Protocollo di progressione per ${exerciseName}`,
      athlete_id: athleteId,
      athlete_name: athleteName,
      program_id: programId,
      program_name: programName,
      workout_exercise_id: workoutExerciseId,
      exercise_name: exerciseName,
      method: defaultInitMethod,
      status: 'active',
      conditions: {
        consecutive_success_sessions: 1,
        max_consecutive_failures: 2,
        max_rpe: 9.0,
        pain_threshold_max: 2,
      },
      increments: {
        load_increment_kg: defaultInitMethod === 'linear_load' ? 2.5 : undefined,
        reps_increment: defaultInitMethod === 'linear_reps' ? 1 : undefined,
        reps_max_cap: 10,
        reps_reset_to: 8,
      },
      current_target: {
        sets: currentTarget.sets || 3,
        reps: currentTarget.reps || '8-10',
        load_kg: currentTarget.load_kg || 60,
        rir: currentTarget.rir || 'RIR 2',
        rest_seconds: currentTarget.rest_seconds || 90,
        tut: currentTarget.tut || '3-0-1-0',
      },
      max_steps: 6,
      current_step: 1,
      success_count: 0,
      failure_count: 0,
    };
  });

  // Current Rule Mock for Live Projection & Simulator
  const currentRuleMock: ProgressionRule = {
    ...formData,
    id: 'inline-preview-rule',
    coach_id: 'coach-current',
    current_step: formData.current_step || 1,
    success_count: formData.success_count || 0,
    failure_count: formData.failure_count || 0,
    created_by: formData.created_by || 'coach-current',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Simulation State (Advanced)
  const [simSets, setSimSets] = useState<number>(currentTarget.sets || 3);
  const [simReps, setSimReps] = useState<string>('10,10,10');
  const [simWeight, setSimWeight] = useState<string>(String(currentTarget.load_kg || 60));
  const [simRpe, setSimRpe] = useState<number>(8.5);
  const [simPain, setSimPain] = useState<number>(0);
  const [simResult, setSimResult] = useState<NextTargetResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSimulate = () => {
    const repsArr = simReps.split(',').map((s) => parseInt(s.trim()) || 8);
    const weightVal = parseFloat(simWeight) || 60;
    const weightsArr = repsArr.map(() => weightVal);

    const result = evaluateProgression(currentRuleMock, {
      sets_completed: simSets,
      reps_per_set: repsArr,
      weights_per_set: weightsArr,
      rpe_reported: simRpe,
      pain_level: simPain,
    });
    setSimResult(result);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveRule(formData);
      onClose();
    } catch {
      // Handled by caller toast
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl z-10 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)]">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Configura Progressione Settimanale</h2>
              <p className="text-xs text-slate-400">
                Esercizio: <span className="text-[var(--color-primary)] font-bold">{exerciseName}</span> • Governa l'evoluzione automatica dei carichi/reps tra le settimane.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {/* Main Controls Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Nome Regola / Strategia</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Metodo</label>
                <select
                  value={formData.method}
                  onChange={(e) => setFormData({ ...formData, method: e.target.value as ProgressionMethod })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-[var(--color-primary)]"
                >
                  <option value="linear_load">Carico Lineare (+kg a target)</option>
                  <option value="linear_reps">Progressione Reps (+reps a carico stabile)</option>
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
                <label className="text-xs font-bold text-slate-300 block mb-1">Durata Blocco</label>
                <select
                  value={formData.max_steps || 6}
                  onChange={(e) => setFormData({ ...formData, max_steps: parseInt(e.target.value) || 6 })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none"
                >
                  <option value={4}>4 Settimane (Blocco Breve)</option>
                  <option value={6}>6 Settimane (Standard Mesociclo)</option>
                  <option value={8}>8 Settimane (Blocco Esteso)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Nome Regola</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            {/* Baseline Target (Week 1) */}
            <div className="pt-2 border-t border-slate-800/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2">
                Target di Partenza (Week 1)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Serie</label>
                  <input
                    type="number"
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
                    className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold text-center"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Reps</label>
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
                    className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold text-center"
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
                    className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-[var(--color-primary)] font-bold text-center"
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
                    className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold text-center"
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
                    className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold text-center"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SEZIONE 2: PROIEZIONE SETTIMANALE DEL BLOCCO (IN PRIMO PIANO) */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[var(--color-primary)]" />
                Sequenza Settimanale del Blocco ({formData.max_steps || 6} Settimane)
              </h4>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const current = formData.max_steps || 6;
                    if (current < 16) {
                      setFormData({ ...formData, max_steps: current + 1 });
                    }
                  }}
                  className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-[var(--color-primary)] border border-slate-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  + Aggiungi Settimana
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

          {/* SEZIONE 3: IMPOSTAZIONI AVANZATE & SIMULATORE (COLLAPSIBLE) */}
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Aumento Carico (+kg)</label>
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
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Aumento Reps (+reps)</label>
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
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-rose-400 block mb-1">Soglia Dolore Max (/10)</label>
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
                      className="w-full px-3 py-2 bg-slate-900 border border-rose-500/40 rounded-xl text-xs font-bold text-rose-300 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Simulatore Live */}
                <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Play className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                      Test Risposta Motore
                    </span>
                    <button
                      type="button"
                      onClick={handleSimulate}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-[var(--color-primary)] rounded-lg transition-colors cursor-pointer"
                    >
                      Esegui Test
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] text-slate-500 block">Set Fatti</label>
                      <input
                        type="number"
                        value={simSets}
                        onChange={(e) => setSimSets(parseInt(e.target.value) || 1)}
                        className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-center"
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block">Reps Fatte</label>
                      <input
                        type="text"
                        value={simReps}
                        onChange={(e) => setSimReps(e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                        placeholder="10,10,10"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block">Carico Usato</label>
                      <input
                        type="text"
                        value={simWeight}
                        onChange={(e) => setSimWeight(e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block">RPE</label>
                      <input
                        type="number"
                        step="0.5"
                        value={simRpe}
                        onChange={(e) => setSimRpe(parseFloat(e.target.value) || 8)}
                        className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-rose-400 block">Dolore (/10)</label>
                      <input
                        type="number"
                        value={simPain}
                        onChange={(e) => setSimPain(parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 bg-slate-950 border border-rose-500/40 rounded-lg text-rose-300"
                      />
                    </div>
                  </div>

                  {simResult && (
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-700 text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-slate-400">Azione Motore:</span>
                        <span className={
                          simResult.action === 'advance' ? 'text-emerald-400'
                          : simResult.action === 'regress' ? 'text-amber-400'
                          : simResult.action === 'pause_pain' ? 'text-rose-400'
                          : 'text-blue-400'
                        }>
                          {simResult.action.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        {simResult.reason}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
          >
            Annulla
          </button>
          
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 bg-[var(--color-primary)] text-black hover:bg-[var(--color-primary-hover)] text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>{initialRule ? 'Aggiorna Istanza nel Programma' : 'Salva & Collega al Programma'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
