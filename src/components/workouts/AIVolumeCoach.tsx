import React, { useState } from 'react';
import {
  Sparkles,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Sliders,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Calendar,
  Layers,
  FileQuestion,
  Dumbbell,
} from 'lucide-react';
import {
  VolumeCoachAnalysis,
  VolumeCoachRecommendation,
  RecommendationCategory,
  ActionPayload,
} from '../../utils/aiVolumeCoach';

interface AIVolumeCoachProps {
  analysis: VolumeCoachAnalysis;
  onApplyAction?: (action: ActionPayload) => void;
  className?: string;
}

export const AIVolumeCoach: React.FC<AIVolumeCoachProps> = ({
  analysis,
  onApplyAction,
  className = '',
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | RecommendationCategory>('all');
  const [appliedIds, setAppliedIds] = useState<Record<string, boolean>>({});
  const [expandedDetailsIds, setExpandedDetailsIds] = useState<Record<string, boolean>>({});
  const [showAllItems, setShowAllItems] = useState(false);

  const handleApply = (rec: VolumeCoachRecommendation) => {
    if (!rec.action || !onApplyAction) return;
    onApplyAction(rec.action);
    setAppliedIds((prev) => ({ ...prev, [rec.id]: true }));
  };

  const toggleDetails = (id: string) => {
    setExpandedDetailsIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Filtraggio delle raccomandazioni in base alla categoria attiva
  const filteredList =
    activeCategory === 'all'
      ? analysis.recommendations
      : analysis.byCategory[activeCategory] || [];

  // Limitazione vista default a top 3 per categoria se in vista 'all'
  const displayedList =
    activeCategory === 'all' && !showAllItems
      ? filteredList.slice(0, 4)
      : filteredList;

  const getPriorityBadge = (priority: VolumeCoachRecommendation['priority']) => {
    switch (priority) {
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 shrink-0">
            <Flame className="w-3 h-3 text-rose-400" />
            <span>Critica</span>
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span>Media</span>
          </span>
        );
      case 'low':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40 shrink-0">
            <CheckCircle2 className="w-3 h-3 text-sky-400" />
            <span>Info</span>
          </span>
        );
    }
  };

  return (
    <div
      className={`rounded-3xl border border-slate-800/90 bg-[#0c1018] p-4 sm:p-5 shadow-2xl space-y-4 ${className}`}
    >
      {/* ─── 1. HEADER COMPATTO CON SCORE & KPI ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0 shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
              <span>AI Volume Coach</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">
                Assistente Operativo
              </span>
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              Diagnosi biomeccanica & correzioni guidate a 1-click
            </p>
          </div>
        </div>

        {/* Score Sintetico */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 px-3 rounded-xl border border-slate-800 shrink-0 self-start sm:self-auto">
          <span className="text-[10px] uppercase font-bold text-slate-400">Score Volume:</span>
          <span className="text-xs font-black text-slate-200">{analysis.scoreLabel}</span>
          <span className="font-mono text-xs font-black px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 ml-1">
            {analysis.overallScore}/100
          </span>
        </div>
      </div>

      {/* ─── 2. SELETTORE A PILLOLE PER LE 4 CATEGORIE ─── */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
        <button
          type="button"
          onClick={() => {
            setActiveCategory('all');
            setShowAllItems(false);
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
            activeCategory === 'all'
              ? 'bg-amber-500 text-black font-black shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Tutti ({analysis.recommendations.length})</span>
        </button>

        {analysis.criticalCount > 0 && (
          <button
            type="button"
            onClick={() => {
              setActiveCategory('critical');
              setShowAllItems(true);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              activeCategory === 'critical'
                ? 'bg-rose-500 text-white font-black shadow-md'
                : 'bg-rose-950/20 text-rose-300 hover:bg-rose-900/30 border border-rose-500/30'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>Criticità ({analysis.criticalCount})</span>
          </button>
        )}

        {analysis.optimizationCount > 0 && (
          <button
            type="button"
            onClick={() => {
              setActiveCategory('optimization');
              setShowAllItems(true);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              activeCategory === 'optimization'
                ? 'bg-amber-500 text-black font-black shadow-md'
                : 'bg-amber-950/20 text-amber-300 hover:bg-amber-900/30 border border-amber-500/30'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Ottimizzazioni ({analysis.optimizationCount})</span>
          </button>
        )}

        {analysis.distributionCount > 0 && (
          <button
            type="button"
            onClick={() => {
              setActiveCategory('distribution');
              setShowAllItems(true);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              activeCategory === 'distribution'
                ? 'bg-sky-500 text-black font-black shadow-md'
                : 'bg-sky-950/20 text-sky-300 hover:bg-sky-900/30 border border-sky-500/30'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-sky-400" />
            <span>Distribuzione ({analysis.distributionCount})</span>
          </button>
        )}

        {analysis.dataQualityCount > 0 && (
          <button
            type="button"
            onClick={() => {
              setActiveCategory('data_quality');
              setShowAllItems(true);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              activeCategory === 'data_quality'
                ? 'bg-purple-500 text-white font-black shadow-md'
                : 'bg-purple-950/20 text-purple-300 hover:bg-purple-900/30 border border-purple-500/30'
            }`}
          >
            <FileQuestion className="w-3.5 h-3.5 text-purple-400" />
            <span>Qualità Dati ({analysis.dataQualityCount})</span>
          </button>
        )}
      </div>

      {/* ─── 3. LISTA DELLE CARD CONSIGLIO ULTRA-COMPATTE ─── */}
      <div className="space-y-2.5">
        {displayedList.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
            Nessun suggerimento in questa categoria.
          </div>
        ) : (
          displayedList.map((rec) => {
            const isApplied = appliedIds[rec.id];
            const isDetailsOpen = expandedDetailsIds[rec.id];

            return (
              <div
                key={rec.id}
                className={`rounded-2xl border p-3 sm:p-3.5 transition-all space-y-2 ${
                  isApplied
                    ? 'bg-emerald-950/20 border-emerald-500/40'
                    : rec.priority === 'high'
                    ? 'bg-rose-950/15 border-rose-500/30 hover:border-rose-500/50'
                    : rec.priority === 'medium'
                    ? 'bg-amber-950/15 border-amber-500/30 hover:border-amber-500/50'
                    : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Riga 1: Header Sintetico (Priorità + Distretto + Diagnosi + Tasto Applica) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    {getPriorityBadge(rec.priority)}
                    <span className="text-[10px] font-black text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 shrink-0">
                      {rec.muscleGroup}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-white truncate">
                      {rec.diagnosis}
                    </span>
                  </div>

                  {/* Azione Rapida */}
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    {isApplied ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                        <ShieldCheck className="w-3 h-3" /> Applicata
                      </span>
                    ) : rec.action ? (
                      <button
                        type="button"
                        onClick={() => handleApply(rec)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-black text-[11px] font-black transition-all shadow-sm cursor-pointer"
                      >
                        <Zap className="w-3 h-3 fill-black" />
                        <span>
                          Applica ({rec.action.setsDelta && rec.action.setsDelta > 0 ? `+${rec.action.setsDelta}` : rec.action.setsDelta} set)
                        </span>
                      </button>
                    ) : null}

                    {/* Toggle Dettagli */}
                    <button
                      type="button"
                      onClick={() => toggleDetails(rec.id)}
                      className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
                      title={isDetailsOpen ? 'Nascondi dettagli' : 'Mostra dettagli ed esercizi'}
                    >
                      {isDetailsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Riga 2: Modifica Consigliata in 1 Riga */}
                <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                  <Sliders className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="truncate">{rec.recommendation}</span>
                </div>

                {/* Riga 3: Dettagli Espandibili On-Demand (Chiusi di default) */}
                {isDetailsOpen && (
                  <div className="pt-2 border-t border-slate-800/80 space-y-2 text-xs animate-in fade-in duration-100">
                    {/* Motivo Fisiologico */}
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 leading-relaxed">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                        Motivo Fisiologico & Biomeccanico:
                      </span>
                      <p>{rec.reason}</p>
                    </div>

                    {/* Impatto & Esercizi Coinvolti */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-slate-300">
                        <span className="text-[9px] font-bold text-sky-400 uppercase tracking-wider block mb-0.5">
                          Impatto Previsto:
                        </span>
                        <p className="text-[11px]">{rec.expectedImpact}</p>
                      </div>

                      {rec.involvedExercises && rec.involvedExercises.length > 0 && (
                        <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300">
                          <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider block mb-0.5 flex items-center gap-1">
                            <Dumbbell className="w-3 h-3" />
                            <span>Esercizi Coinvolti:</span>
                          </span>
                          <p className="text-[11px] font-semibold text-slate-200">
                            {rec.involvedExercises.join(', ')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ─── 4. FOOTER "MOSTRA ALTRI CONSIGLI" SE IN VISTA 'ALL' ─── */}
      {activeCategory === 'all' && filteredList.length > 4 && !showAllItems && (
        <div className="pt-1 text-center">
          <button
            type="button"
            onClick={() => setShowAllItems(true)}
            className="text-xs font-bold text-amber-400 hover:text-amber-300 px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 transition-all cursor-pointer inline-flex items-center gap-1.5"
          >
            <span>Mostra altri {filteredList.length - 4} suggerimenti</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
