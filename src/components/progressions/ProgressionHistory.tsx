import React from 'react';
import {
  History,
  CheckCircle2,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';
import { ProgressionEvent, ProgressionEventType } from '../../types/progression';

interface ProgressionHistoryProps {
  events: ProgressionEvent[];
  athleteId?: string;
  ruleId?: string;
}

export const ProgressionHistory: React.FC<ProgressionHistoryProps> = ({
  events,
  athleteId,
  ruleId,
}) => {
  const filteredEvents = events.filter((evt) => {
    const matchAthlete = !athleteId || evt.athlete_id === athleteId;
    const matchRule = !ruleId || evt.rule_id === ruleId;
    return matchAthlete && matchRule;
  });

  const getEventBadge = (type: ProgressionEventType) => {
    switch (type) {
      case 'step_advanced':
        return { label: 'Avanzamento Target', icon: ArrowUpRight, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
      case 'step_regressed':
        return { label: 'Regressione Carico', icon: ArrowDownRight, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
      case 'deload_triggered':
        return { label: 'Deload Attivo', icon: RotateCcw, color: 'text-teal-400 bg-teal-500/10 border-teal-500/30' };
      case 'rule_paused':
        return { label: 'In Pausa (Sicurezza)', icon: Pause, color: 'text-red-400 bg-red-500/10 border-red-500/30' };
      case 'rule_resumed':
        return { label: 'Riattivata', icon: Play, color: 'text-sky-400 bg-sky-500/10 border-sky-500/30' };
      case 'rule_approved':
        return { label: 'Approvata dal Coach', icon: CheckCircle2, color: 'text-[var(--color-primary)] bg-amber-500/10 border-amber-500/30' };
      case 'ai_suggestion_generated':
        return { label: 'Proposta IA Generata', icon: Sparkles, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' };
      default:
        return { label: type, icon: History, color: 'text-slate-400 bg-slate-800 border-slate-700' };
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h4 className="text-sm font-black text-white flex items-center gap-2">
          <History className="w-4 h-4 text-[var(--color-primary)]" /> Registro Cronologico & Audit Log
        </h4>
        <span className="text-xs font-mono text-slate-400">{filteredEvents.length} eventi</span>
      </div>

      {filteredEvents.length === 0 ? (
        <div className="p-8 text-center text-slate-500 text-xs">
          Nessun evento di progressione registrato in questo periodo.
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
          {filteredEvents.map((evt) => {
            const badge = getEventBadge(evt.event_type);
            const Icon = badge.icon;

            return (
              <div
                key={evt.id}
                className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold flex items-center gap-1 ${badge.color}`}>
                      <Icon className="w-3 h-3" /> {badge.label}
                    </span>
                    <span className="font-bold text-white">{evt.exercise_name}</span>
                    {evt.athlete_name && (
                      <span className="text-slate-400 text-[11px]">• {evt.athlete_name}</span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono shrink-0">
                    {new Date(evt.created_at).toLocaleString('it-IT')}
                  </span>
                </div>

                <p className="text-slate-300 leading-relaxed text-[11px]">
                  {evt.reason}
                </p>

                {/* Dati Prestazione & Variazione Target */}
                <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px]">
                  {evt.new_target && (
                    <div className="text-slate-400 font-mono">
                      Nuovo Target:{' '}
                      <span className="text-[var(--color-primary)] font-bold">
                        {evt.new_target.sets} x {evt.new_target.reps} @ {evt.new_target.load_kg || 0}kg
                      </span>
                    </div>
                  )}

                  {evt.performed_data && evt.performed_data.reps_done && (
                    <div className="text-slate-400 font-mono">
                      Log Effettuato:{' '}
                      <span className="text-slate-200">
                        {evt.performed_data.sets_done} set ({evt.performed_data.reps_done.join(', ')} reps)
                      </span>
                    </div>
                  )}

                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-500 font-mono ml-auto">
                    Trigger: {evt.triggered_by}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
