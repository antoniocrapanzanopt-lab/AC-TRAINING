import React, { useState } from 'react';
import {
  TrendingUp,
  User,
  Dumbbell,
  Pause,
  Play,
  Sliders,
  ChevronRight,
} from 'lucide-react';
import { useProgressions } from '../../context/ProgressionsContext';
import { ProgressionStatus, ProgressionRule } from '../../types/progression';

interface ActiveProgressionsPageProps {
  onOpenDetail: (ruleId: string) => void;
  onEditRule: (rule: ProgressionRule) => void;
}

export const ActiveProgressionsPage: React.FC<ActiveProgressionsPageProps> = ({
  onOpenDetail,
  onEditRule,
}) => {
  const { rules, pauseRule, resumeRule } = useProgressions();
  const [filterStatus, setFilterStatus] = useState<ProgressionStatus | 'all'>('all');
  const [selectedAthlete, setSelectedAthlete] = useState<string>('all');

  const uniqueAthletes = Array.from(
    new Set(rules.map((r) => r.athlete_name).filter(Boolean))
  ) as string[];

  const filteredRules = rules.filter((r) => {
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    const matchAthlete = selectedAthlete === 'all' || r.athlete_name === selectedAthlete;
    return matchStatus && matchAthlete;
  });

  const getStatusBadge = (status: ProgressionStatus) => {
    switch (status) {
      case 'active':
        return { label: 'Attiva', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
      case 'paused':
        return { label: 'In Pausa', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
      case 'completed':
        return { label: 'Completata', color: 'bg-sky-500/15 text-sky-400 border-sky-500/30' };
      case 'pending_approval':
        return { label: 'In Revisione', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' };
      default:
        return { label: status, color: 'bg-slate-800 text-slate-400 border-slate-700' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Barra Filtri */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-lg">
        <div className="flex flex-wrap items-center gap-2">
          {(['all', 'active', 'paused', 'completed'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterStatus === st
                  ? 'bg-[var(--color-primary)] text-black shadow'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {st === 'all' ? 'Tutte' : st === 'active' ? 'Attive' : st === 'paused' ? 'In Pausa' : 'Completate'}
            </button>
          ))}
        </div>

        {uniqueAthletes.length > 0 && (
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400" />
            <select
              value={selectedAthlete}
              onChange={(e) => setSelectedAthlete(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-bold focus:outline-none focus:border-[var(--color-primary)]"
            >
              <option value="all">Tutti gli Atleti</option>
              {uniqueAthletes.map((ath) => (
                <option key={ath} value={ath}>
                  {ath}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Elenco Progressioni */}
      {filteredRules.length === 0 ? (
        <div className="p-12 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] text-center space-y-3">
          <TrendingUp className="w-12 h-12 text-slate-600 mx-auto" />
          <h4 className="text-base font-bold text-white">Nessuna progressione attiva trovata</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Non ci sono regole di progressione con i filtri selezionati. Crea una regola dalla Libreria o chiedi una proposta all'IA.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRules.map((rule) => {
            const stBadge = getStatusBadge(rule.status);

            return (
              <div
                key={rule.id}
                className="p-5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 transition-all"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-bold uppercase tracking-wider ${stBadge.color}`}>
                      {stBadge.label}
                    </span>
                    <span className="text-xs font-bold text-[var(--color-primary)] flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" /> {rule.athlete_name || 'Template Generale'}
                    </span>
                    {rule.program_name && (
                      <span className="text-[11px] text-slate-400 font-medium">
                        • {rule.program_name}
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="text-base font-black text-white flex items-center gap-2">
                      <Dumbbell className="w-4 h-4 text-sky-400" /> {rule.exercise_name || rule.name}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                      {rule.description || `Metodo: ${rule.method}`}
                    </p>
                  </div>

                  {/* Parametri & Target Attuale */}
                  <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
                    <div className="flex items-center gap-1.5 text-slate-300 font-bold">
                      <span className="text-slate-500 font-normal">Target Attuale:</span>
                      <span className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono">
                        {rule.current_target.sets} x {rule.current_target.reps} @ {rule.current_target.load_kg || 0}kg
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-300">
                      <span className="text-slate-500">Step:</span>
                      <span className="font-bold text-sky-400">
                        {rule.current_step} / {rule.max_steps || '∞'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-300">
                      <span className="text-slate-500">Completati:</span>
                      <span className="font-bold text-emerald-400">{rule.success_count} sedute</span>
                    </div>
                  </div>
                </div>

                {/* Azioni Rapide */}
                <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-800">
                  {rule.status === 'active' ? (
                    <button
                      onClick={() => pauseRule(rule.id)}
                      className="p-2 rounded-xl bg-slate-900 hover:bg-amber-500/20 hover:text-amber-400 text-slate-400 border border-slate-800 transition-colors"
                      title="Metti in Pausa"
                    >
                      <Pause className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => resumeRule(rule.id)}
                      className="p-2 rounded-xl bg-slate-900 hover:bg-emerald-500/20 hover:text-emerald-400 text-slate-400 border border-slate-800 transition-colors"
                      title="Riattiva"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => onEditRule(rule)}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
                    title="Modifica Parametri"
                  >
                    <Sliders className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onOpenDetail(rule.id)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all shadow"
                  >
                    Dettagli & Audit <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
