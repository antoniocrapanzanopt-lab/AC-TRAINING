import React, { useState } from 'react';
import {
  X,
  Sliders,
  Pause,
  Play,
} from 'lucide-react';
import { useProgressions } from '../../context/ProgressionsContext';
import { ProgressionHistory } from './ProgressionHistory';

interface ProgressionDetailDrawerProps {
  ruleId: string;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
}

export const ProgressionDetailDrawer: React.FC<ProgressionDetailDrawerProps> = ({
  ruleId,
  isOpen,
  onClose,
  onEdit,
}) => {
  const { rules, events, pauseRule, resumeRule } = useProgressions();
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');

  if (!isOpen) return null;

  const rule = rules.find((r) => r.id === ruleId);
  if (!rule) return null;

  const current = rule.current_target;
  const inc = rule.increments;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-end z-50 animate-fadeIn">
      <div className="bg-[var(--color-panel)] border-l border-[var(--color-panel-border)] w-full max-w-xl h-full flex flex-col shadow-2xl overflow-hidden animate-slideLeft">
        {/* Header Drawer */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="space-y-1">
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[var(--color-primary)]/15 text-[var(--color-primary)] font-bold border border-[var(--color-primary)]/30 uppercase">
              {rule.method}
            </span>
            <h3 className="text-lg font-black text-white">{rule.name}</h3>
            <p className="text-xs text-slate-400">
              Atleta: <span className="text-white font-bold">{rule.athlete_name || 'Template'}</span> • {rule.exercise_name}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/30 px-5 pt-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'overview'
                ? 'border-[var(--color-primary)] text-white'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Panoramica & Target
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'history'
                ? 'border-[var(--color-primary)] text-white'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Cronologia Audit ({events.filter((e) => e.rule_id === rule.id).length})
          </button>
        </div>

        {/* Body Contenuto */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'overview' ? (
            <>
              {/* Progress Bar Step */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-400">Avanzamento Mesociclo:</span>
                  <span className="text-[var(--color-primary)]">
                    Step {rule.current_step} di {rule.max_steps || '∞'}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                  <div
                    className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (rule.current_step / (rule.max_steps || 6)) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Target Attuale */}
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider text-slate-400">
                  Target Attivo per la Prossima Seduta
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase block">Serie</span>
                    <span className="text-base font-black text-white font-mono">{current.sets}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase block">Reps</span>
                    <span className="text-base font-black text-white font-mono">{current.reps}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase block">Carico</span>
                    <span className="text-base font-black text-[var(--color-primary)] font-mono">
                      {current.load_kg || 0} kg
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase block">Margine</span>
                    <span className="text-xs font-black text-slate-300 font-mono mt-1 block">
                      {current.rir || 'RIR 2'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Regole & Incrementi */}
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3 text-xs">
                <h4 className="font-bold text-white uppercase tracking-wider text-slate-400">
                  Regole e Vincoli Configurate
                </h4>
                <div className="space-y-2 text-slate-300">
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-500">Step Carico al Successo:</span>
                    <span className="font-bold text-sky-400">+{inc.load_increment_kg || 2.5} kg</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-500">Step Ripetizioni:</span>
                    <span className="font-bold text-amber-400">+{inc.reps_increment || 1} reps</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-500">Soglia Max Dolore:</span>
                    <span className="font-bold text-red-400">{rule.conditions.pain_threshold_max ?? 2}/10</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Fallimenti prima di Regredire:</span>
                    <span className="font-bold text-white">{rule.conditions.max_consecutive_failures ?? 2} sedute</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <ProgressionHistory events={events} ruleId={rule.id} athleteId={rule.athlete_id || undefined} />
          )}
        </div>

        {/* Footer Azioni */}
        <div className="p-5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3">
          {rule.status === 'active' ? (
            <button
              onClick={() => pauseRule(rule.id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-amber-500/20 hover:text-amber-400 text-slate-300 text-xs font-bold border border-slate-800 transition-colors"
            >
              <Pause className="w-4 h-4" /> Metti in Pausa
            </button>
          ) : (
            <button
              onClick={() => resumeRule(rule.id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-emerald-500/20 hover:text-emerald-400 text-slate-300 text-xs font-bold border border-slate-800 transition-colors"
            >
              <Play className="w-4 h-4" /> Riattiva Regola
            </button>
          )}

          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all shadow"
          >
            <Sliders className="w-4 h-4" /> Modifica Parametri
          </button>
        </div>
      </div>
    </div>
  );
};
