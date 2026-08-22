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
  ArrowRight,
  HelpCircle,
  TrendingUp,
  Check,
  SlidersHorizontal,
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

  // Limitazione vista default a top 4 se in vista 'all'
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
              Diagnosi biomeccanica, anteprima modifiche settimanali & spiegazione scientifica
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

      {/* ─── 3. LISTA DELLE CARD CONSIGLIO CON DETTAGLIO MODIFICHE ─── */}
      <div className="space-y-3">
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
                className={`rounded-2xl border p-3.5 sm:p-4 transition-all space-y-2.5 ${
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    {getPriorityBadge(rec.priority)}
                    <span className="text-[10px] font-black text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 shrink-0">
                      {rec.muscleGroup}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-white truncate">
                      {rec.diagnosis}
                    </span>
                  </div>

                  {/* Azione Rapida e Toggle */}
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    {isApplied ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                        <ShieldCheck className="w-3.5 h-3.5" /> Modifica Applicata
                      </span>
                    ) : rec.action ? (
                      <button
                        type="button"
                        onClick={() => handleApply(rec)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-black text-xs font-black transition-all shadow-md hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5 fill-black" />
                        <span>
                          Applica ({rec.action.setsDelta && rec.action.setsDelta > 0 ? `+${rec.action.setsDelta}` : rec.action.setsDelta} set)
                        </span>
                      </button>
                    ) : null}

                    {/* Toggle Dettagli */}
                    <button
                      type="button"
                      onClick={() => toggleDetails(rec.id)}
                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold ${
                        isDetailsOpen
                          ? 'bg-slate-800 text-amber-400 border-amber-500/30'
                          : 'bg-slate-900/80 text-slate-400 hover:text-white border-slate-800'
                      }`}
                      title={isDetailsOpen ? 'Nascondi dettagli modifiche' : 'Mostra come e perché cambia la scheda'}
                    >
                      <span className="text-[10px] hidden sm:inline">
                        {isDetailsOpen ? 'Chiudi Dettagli' : 'Mostra Come & Perché'}
                      </span>
                      {isDetailsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Riga 2: Modifica Consigliata in 1 Riga */}
                <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">{rec.recommendation}</span>
                </div>

                {/* ─── RIGA 3: DETTAGLI APPROFONDITI "COME & PERCHÉ" (ESPANDIBILE) ─── */}
                {isDetailsOpen && (
                  <div className="pt-3 border-t border-slate-800/80 space-y-3 text-xs animate-in fade-in duration-150">
                    
                    {/* A. PIANO DI MODIFICA DELLA SETTIMANA (BEFORE / AFTER & ESERCIZI COINVOLTI) */}
                    <div className="p-3 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-slate-800/70">
                        <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Sliders className="w-3.5 h-3.5" />
                          Piano di Modifica della Settimana (Cosa cambia)
                        </span>

                        {rec.beforeSummary && rec.afterSummary && (
                          <div className="flex items-center gap-1.5 text-[11px] font-mono">
                            <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                              {rec.beforeSummary}
                            </span>
                            <ArrowRight className="w-3 h-3 text-amber-400" />
                            <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30">
                              {rec.afterSummary}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Lista Dettagliata Esercizio per Esercizio */}
                      {rec.plannedChanges && rec.plannedChanges.length > 0 ? (
                        <div className="space-y-1.5">
                          <div className="text-[10px] font-bold text-slate-400 uppercase">
                            Dettaglio Intervento sugli Esercizi:
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {rec.plannedChanges.map((change, cIdx) => (
                              <div
                                key={cIdx}
                                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/90 hover:border-slate-700 transition"
                              >
                                <div className="space-y-0.5 min-w-0 pr-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className="px-1.5 py-0.5 rounded bg-slate-950 text-[9px] font-mono text-cyan-300 font-bold border border-slate-800">
                                      {change.dayName}
                                    </span>
                                    <span className="font-bold text-white truncate text-xs">
                                      {change.exerciseName}
                                    </span>
                                  </div>
                                  {change.reason && (
                                    <p className="text-[10px] text-slate-400 truncate">
                                      {change.reason}
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-slate-400 line-through text-xs font-mono">
                                    {change.currentSets}s
                                  </span>
                                  <ArrowRight className="w-3 h-3 text-slate-500" />
                                  <span className="text-[var(--color-primary)] font-black text-xs font-mono">
                                    {change.newSets}s
                                  </span>
                                  <span
                                    className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                                      change.deltaSets > 0
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                    }`}
                                  >
                                    {change.deltaSets > 0 ? `+${change.deltaSets}` : change.deltaSets}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        rec.involvedExercises && rec.involvedExercises.length > 0 && (
                          <div className="flex items-center gap-2 pt-1 flex-wrap">
                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                              <Dumbbell className="w-3 h-3 text-amber-400" />
                              <span>Esercizi del Distretto:</span>
                            </span>
                            {rec.involvedExercises.map((exName, eIdx) => (
                              <span
                                key={eIdx}
                                className="px-2 py-0.5 rounded-lg bg-slate-900 text-slate-300 text-[11px] font-medium border border-slate-800"
                              >
                                {exName}
                              </span>
                            ))}
                          </div>
                        )
                      )}
                    </div>

                    {/* B. SCHEDE AFFIANCATE: COME (OPERATIVO) & PERCHÉ (SCIENTIFICO) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      
                      {/* Box COME */}
                      <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-1">
                        <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5" />
                          Come viene applicato nella settimana:
                        </span>
                        <p className="text-slate-200 text-xs leading-relaxed font-medium">
                          {rec.how || rec.recommendation}
                        </p>
                      </div>

                      {/* Box PERCHÉ */}
                      <div className="p-3 rounded-2xl bg-purple-500/5 border border-purple-500/20 space-y-1">
                        <span className="text-[10px] font-black text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                          <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
                          Perché questa modifica (Razionale Fisiologico):
                        </span>
                        <p className="text-slate-300 text-xs leading-relaxed">
                          {rec.why || rec.reason}
                        </p>
                      </div>
                    </div>

                    {/* C. IMPATTO ATTESO */}
                    {rec.expectedImpact && (
                      <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-start gap-2">
                        <Check className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block">
                            Impatto Previsto sull'Atleta:
                          </span>
                          <p className="text-xs text-sky-200 leading-relaxed">
                            {rec.expectedImpact}
                          </p>
                        </div>
                      </div>
                    )}
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
