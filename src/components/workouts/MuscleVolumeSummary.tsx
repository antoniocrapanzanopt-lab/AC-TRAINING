import React, { useState, useMemo } from 'react';
import {
  Activity,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Flame,
  Info,
  Layers,
  Sparkles,
  Dumbbell,
  Calendar,
  AlertTriangle,
  Target,
} from 'lucide-react';
import { WorkoutExercise } from '../../types/workout';
import { ExerciseItem } from '../../types/exercise';
import {
  calculateMuscleVolumeSummary,
  VolumeSummaryResult,
  VolumeStatusType,
} from '../../utils/muscleVolumeCalculator';
import { MuscleVolumeRadarChart } from './MuscleVolumeRadarChart';

interface MuscleVolumeSummaryProps {
  exercises: Partial<WorkoutExercise>[];
  libraryExercises?: ExerciseItem[];
  activeWeek?: number;
  activeDay?: string;
  totalWeeks?: number;
  className?: string;
  initialCollapsed?: boolean;
}

export const MuscleVolumeSummary: React.FC<MuscleVolumeSummaryProps> = ({
  exercises,
  libraryExercises = [],
  activeWeek = 1,
  activeDay = 'Giorno A',
  totalWeeks = 1,
  className = '',
  initialCollapsed = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(!initialCollapsed);
  const [scope, setScope] = useState<'day' | 'week' | 'mesocycle'>('week');
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Stato per il confronto con un'altra settimana
  const [compareWeek, setCompareWeek] = useState<number | null>(null);

  // Calcolo del volume per il periodo attivo
  const volumeData: VolumeSummaryResult = useMemo(() => {
    return calculateMuscleVolumeSummary({
      exercises,
      libraryExercises,
      scope,
      activeWeek,
      activeDay,
      totalWeeks,
    });
  }, [exercises, libraryExercises, scope, activeWeek, activeDay, totalWeeks]);

  // Calcolo del volume di confronto (se selezionato)
  const compareVolumeData: VolumeSummaryResult | null = useMemo(() => {
    if (!compareWeek || scope !== 'week') return null;
    return calculateMuscleVolumeSummary({
      exercises,
      libraryExercises,
      scope: 'week',
      activeWeek: compareWeek,
      activeDay,
      totalWeeks,
    });
  }, [exercises, libraryExercises, scope, compareWeek, activeDay, totalWeeks]);

  const hasVolume = volumeData.muscleDetails.length > 0;
  const maxTotalSets = useMemo(() => {
    if (!hasVolume) return 1;
    const currentMax = Math.max(...volumeData.muscleDetails.map((m) => m.totalSets), 1);
    const compareMax = compareVolumeData
      ? Math.max(...compareVolumeData.muscleDetails.map((m) => m.totalSets), 1)
      : 1;
    return Math.max(currentMax, compareMax);
  }, [volumeData, compareVolumeData, hasVolume]);

  const handleSelectMuscle = (muscleGroup: string) => {
    if (selectedMuscle === muscleGroup) {
      setSelectedMuscle(null);
      setExpandedRow(null);
    } else {
      setSelectedMuscle(muscleGroup);
      setExpandedRow(muscleGroup);
    }
  };

  const renderStatusBadge = (statusType: VolumeStatusType, statusLabel: string) => {
    switch (statusType) {
      case 'in_mav':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            <span>{statusLabel}</span>
          </span>
        );
      case 'in_mev':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
            <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
            <span>{statusLabel}</span>
          </span>
        );
      case 'under_mev':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <Info className="w-3.5 h-3.5 text-amber-400" />
            <span>{statusLabel}</span>
          </span>
        );
      case 'under_mv':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-500/20 text-orange-300 border border-orange-500/40">
            <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
            <span>{statusLabel}</span>
          </span>
        );
      case 'near_mrv':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-purple-500/20 text-purple-300 border border-purple-500/40">
            <Flame className="w-3.5 h-3.5 text-purple-400" />
            <span>{statusLabel}</span>
          </span>
        );
      case 'above_mrv':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.3)] animate-pulse">
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>{statusLabel}</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`rounded-3xl border border-slate-800/90 bg-gradient-to-b from-slate-900/95 via-[#0c1017]/98 to-[#070a0f] shadow-2xl backdrop-blur-xl transition-all duration-300 overflow-hidden ${className}`}
    >
      {/* ─── HEADER PRINCIPALE ─── */}
      <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.25)] shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight uppercase flex items-center gap-2">
                <span>Volume per Distretto & Benchmark Scientifici</span>
                <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b] animate-pulse" />
              </h3>
              <span className="px-3 py-0.5 rounded-full text-xs font-black bg-amber-500/15 text-amber-400 border border-amber-500/30 font-mono">
                {volumeData.totalSetsAllMuscles} serie tot.
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 font-medium mt-0.5">
              Confronto dinamico con soglie MV • MEV • MAV • MRV • {volumeData.scopeLabel}
            </p>
          </div>
        </div>

        {/* CONTROLLI SCOPE, CONFRONTO E TOGGLE */}
        <div className="flex items-center gap-2.5 self-end lg:self-auto flex-wrap">
          {/* Selettore Confronto Settimane */}
          {scope === 'week' && totalWeeks > 1 && (
            <div className="flex items-center gap-1.5 bg-slate-950/80 p-1.5 px-3 rounded-xl border border-purple-500/30">
              <Layers className="w-4 h-4 text-purple-400 shrink-0" />
              <span className="text-xs font-bold text-purple-300 hidden sm:inline">Confronta:</span>
              <select
                value={compareWeek || ''}
                onChange={(e) => setCompareWeek(e.target.value ? Number(e.target.value) : null)}
                className="bg-transparent text-purple-200 text-xs font-bold focus:outline-none cursor-pointer pr-1"
              >
                <option value="" className="bg-slate-900 text-slate-300">
                  Nessun confronto
                </option>
                {Array.from({ length: totalWeeks })
                  .map((_, i) => i + 1)
                  .filter((w) => w !== activeWeek)
                  .map((w) => (
                    <option key={w} value={w} className="bg-slate-900 text-purple-200">
                      Settimana {w}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Selettore Scope (Giorno / Settimana / Programma) */}
          <div className="flex items-center p-1 bg-slate-950/90 rounded-2xl border border-slate-800 shadow-inner">
            <button
              type="button"
              onClick={() => {
                setScope('day');
                setCompareWeek(null);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                scope === 'day'
                  ? 'bg-amber-500 text-black shadow-md font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Volume della seduta attiva"
            >
              Giorno
            </button>
            <button
              type="button"
              onClick={() => setScope('week')}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                scope === 'week'
                  ? 'bg-amber-500 text-black shadow-md font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Volume totale della settimana attiva"
            >
              Settimana
            </button>
            <button
              type="button"
              onClick={() => {
                setScope('mesocycle');
                setCompareWeek(null);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                scope === 'mesocycle'
                  ? 'bg-amber-500 text-black shadow-md font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Volume aggregato dell'intero programma"
            >
              Programma
            </button>
          </div>

          {/* Toggle Espandi / Comprimi */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2.5 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/70 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={isExpanded ? 'Comprimi riepilogo' : 'Espandi riepilogo'}
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* ─── CONTENUTO ESPANSO IN DUE LIVELLI ─── */}
      {isExpanded ? (
        <div className="p-4 sm:p-6 space-y-7 animate-in fade-in duration-200">
          {!hasVolume ? (
            <div className="p-10 text-center text-slate-400 text-sm font-medium border border-dashed border-slate-800 rounded-3xl">
              Nessun esercizio presente in questa selezione per il calcolo del volume.
            </div>
          ) : (
            <>
              {/* ══════════════════════════════════════════════════════════════ */}
              {/* LIVELLO 1: RADAR CHART GRANDE E PROTAGONISTA FULL-WIDTH        */}
              {/* ══════════════════════════════════════════════════════════════ */}
              <div className="rounded-3xl bg-slate-950/80 border border-slate-800/90 shadow-2xl p-5 sm:p-7 relative overflow-hidden flex flex-col items-center">
                {/* Luci Ambientali */}
                <div className="absolute -top-24 -left-24 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

                {/* Titolo Sezione Radar */}
                <div className="w-full flex items-center justify-between gap-3 mb-2 pb-3 border-b border-slate-800/70">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="text-xs sm:text-sm font-black text-slate-200 uppercase tracking-wider">
                      Sintesi Visiva — Forma & Bilanciamento del Volume
                    </span>
                  </div>
                  {selectedMuscle && (
                    <button
                      type="button"
                      onClick={() => setSelectedMuscle(null)}
                      className="text-xs font-bold text-amber-400 hover:text-amber-300 underline cursor-pointer"
                    >
                      Deseleziona Filtro ({selectedMuscle})
                    </button>
                  )}
                </div>

                <MuscleVolumeRadarChart
                  muscleDetails={volumeData.muscleDetails}
                  compareDetails={compareVolumeData?.muscleDetails}
                  compareLabel={compareWeek ? `Settimana ${compareWeek}` : undefined}
                  selectedMuscle={selectedMuscle}
                  onSelectMuscle={handleSelectMuscle}
                  scope={scope}
                />
              </div>

              {/* ══════════════════════════════════════════════════════════════ */}
              {/* LIVELLO 2: TABELLA ANALITICA CON TUTTE LE COLONNE BENCHMARK    */}
              {/* ══════════════════════════════════════════════════════════════ */}
              <div className="space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                  <div>
                    <h4 className="text-sm font-black text-slate-200 uppercase tracking-wider flex items-center gap-2">
                      <span>Dettaglio Analitico vs Benchmark Scientifici</span>
                      <span className="text-xs font-normal text-slate-400 normal-case">
                        (MV • MEV • MAV • MRV • FRQ • REPS • RIR)
                      </span>
                    </h4>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-400">
                    {volumeData.muscleDetails.length} distretti muscolari attivi
                  </span>
                </div>

                {/* TABELLA BENCHMARK SCIENTIFICA */}
                <div className="overflow-x-auto no-scrollbar rounded-2xl border border-slate-800/90 bg-slate-950/80 shadow-2xl">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-bold text-xs uppercase tracking-wider">
                        <th className="py-4 px-4 whitespace-nowrap">Distretto</th>
                        <th className="py-4 px-3 text-center whitespace-nowrap">Dir.</th>
                        <th className="py-4 px-3 text-center whitespace-nowrap">Ind.</th>
                        <th className="py-4 px-3 text-center whitespace-nowrap">Totale</th>
                        <th className="py-4 px-3 text-center whitespace-nowrap text-amber-400 font-black">MV</th>
                        <th className="py-4 px-3 text-center whitespace-nowrap text-sky-400 font-black">MEV</th>
                        <th className="py-4 px-3 text-center whitespace-nowrap text-emerald-400 font-black">MAV</th>
                        <th className="py-4 px-3 text-center whitespace-nowrap text-rose-400 font-black">MRV</th>
                        <th className="py-4 px-3 text-center whitespace-nowrap">FRQ</th>
                        <th className="py-4 px-3 text-center whitespace-nowrap">REPS</th>
                        <th className="py-4 px-3 text-center whitespace-nowrap">RIR</th>
                        <th className="py-4 px-4 whitespace-nowrap">Stato Volume</th>
                        <th className="py-4 px-4 text-right whitespace-nowrap">Esercizi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium">
                      {volumeData.muscleDetails.map((detail) => {
                        const isSelected = selectedMuscle === detail.muscleGroup;
                        const isRowOpen = expandedRow === detail.muscleGroup;
                        const b = detail.benchmark;

                        const directPct = (detail.directSets / maxTotalSets) * 100;
                        const indirectPct = (detail.indirectSets / maxTotalSets) * 100;

                        return (
                          <React.Fragment key={detail.muscleGroup}>
                            <tr
                              onClick={() => handleSelectMuscle(detail.muscleGroup)}
                              className={`transition-all duration-150 cursor-pointer group ${
                                isSelected
                                  ? 'bg-amber-500/15 border-l-4 border-l-amber-400'
                                  : 'hover:bg-slate-900/60'
                              }`}
                            >
                              {/* 1. Distretto */}
                              <td className="py-3.5 px-4 font-bold text-white whitespace-nowrap">
                                <div className="flex items-center gap-2.5">
                                  <span
                                    className={`w-2.5 h-2.5 rounded-full transition-transform ${
                                      isSelected
                                        ? 'bg-amber-400 scale-125 shadow-[0_0_8px_#f59e0b]'
                                        : 'bg-slate-600 group-hover:bg-amber-400'
                                    }`}
                                  />
                                  <span className="font-black text-white text-sm">
                                    {detail.muscleGroup}
                                  </span>
                                </div>
                              </td>

                              {/* 2. Serie Dirette con Mini Barra */}
                              <td className="py-3.5 px-3 text-center whitespace-nowrap">
                                <div className="flex flex-col items-center gap-1">
                                  <span className="font-mono font-black text-amber-400 text-xs sm:text-sm">
                                    {detail.directSets}
                                  </span>
                                  <div className="w-12 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                                    <div
                                      style={{ width: `${directPct}%` }}
                                      className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full"
                                    />
                                  </div>
                                </div>
                              </td>

                              {/* 3. Serie Indirette con Mini Barra */}
                              <td className="py-3.5 px-3 text-center whitespace-nowrap">
                                <div className="flex flex-col items-center gap-1">
                                  <span className="font-mono font-bold text-sky-400 text-xs sm:text-sm">
                                    {detail.indirectSets > 0 ? `+${detail.indirectSets}` : '—'}
                                  </span>
                                  {detail.indirectSets > 0 && (
                                    <div className="w-12 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                                      <div
                                        style={{ width: `${indirectPct}%` }}
                                        className="h-full bg-sky-400 rounded-full"
                                      />
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* 4. Totale & Effettivo */}
                              <td className="py-3.5 px-3 text-center whitespace-nowrap">
                                <div className="flex flex-col items-center">
                                  <span className="font-mono font-black text-white text-xs sm:text-sm">
                                    {detail.totalSets}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    eff. {detail.effectiveVolume.toFixed(1)}
                                  </span>
                                </div>
                              </td>

                              {/* 5. MV */}
                              <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-300 text-xs sm:text-sm whitespace-nowrap bg-slate-950/40">
                                {b.mv}
                              </td>

                              {/* 6. MEV */}
                              <td className="py-3.5 px-3 text-center font-mono font-bold text-sky-300 text-xs sm:text-sm whitespace-nowrap bg-slate-950/40">
                                {b.mev}
                              </td>

                              {/* 7. MAV */}
                              <td className="py-3.5 px-3 text-center font-mono font-black text-emerald-400 text-xs sm:text-sm whitespace-nowrap bg-emerald-950/20">
                                {b.mav}
                              </td>

                              {/* 8. MRV */}
                              <td className="py-3.5 px-3 text-center font-mono font-black text-rose-400 text-xs sm:text-sm whitespace-nowrap bg-rose-950/20">
                                {b.mrv}
                              </td>

                              {/* 9. FRQ */}
                              <td className="py-3.5 px-3 text-center font-mono text-slate-300 text-xs whitespace-nowrap">
                                {b.frq}
                              </td>

                              {/* 10. REPS */}
                              <td className="py-3.5 px-3 text-center font-mono text-slate-300 text-xs whitespace-nowrap">
                                {b.reps}
                              </td>

                              {/* 11. RIR */}
                              <td className="py-3.5 px-3 text-center font-mono text-slate-300 text-xs whitespace-nowrap">
                                {b.rir}
                              </td>

                              {/* 12. Stato Volume */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                {renderStatusBadge(detail.statusType, detail.statusLabel)}
                              </td>

                              {/* 13. Esercizi Coinvolti & Accordion Trigger */}
                              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                <div className="inline-flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-300 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-xl">
                                    {detail.exerciseCount} es.
                                  </span>
                                  <span className="text-slate-400 group-hover:text-white transition-transform">
                                    {isRowOpen ? (
                                      <ChevronUp className="w-4 h-4 text-amber-400" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4" />
                                    )}
                                  </span>
                                </div>
                              </td>
                            </tr>

                            {/* RIGA FISARMONICA: DETTAGLIO ESERCIZI ASSOCIATI */}
                            {isRowOpen && (
                              <tr className="bg-slate-900/70 border-b border-slate-800">
                                <td colSpan={13} className="p-4 pl-10">
                                  <div className="space-y-2">
                                    <p className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                                      <Dumbbell className="w-4 h-4" />
                                      <span>Esercizi associati a {detail.muscleGroup}:</span>
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-1">
                                      {detail.exercisesList.map((ex, idx) => (
                                        <div
                                          key={idx}
                                          className="p-3 rounded-2xl bg-slate-950/90 border border-slate-800 flex items-center justify-between gap-2.5 shadow-md"
                                        >
                                          <div className="min-w-0">
                                            <span className="text-xs sm:text-sm font-bold text-white truncate block">
                                              {ex.name}
                                            </span>
                                            <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                              <Calendar className="w-3 h-3 text-slate-500" />
                                              {ex.day || 'Seduta'}
                                            </span>
                                          </div>
                                          <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono font-bold text-xs shrink-0">
                                            {ex.sets || 3} set
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* BOX ESERCIZI SPECIALI / NON CLASSIFICATI (Mobilità, Conditioning, Full Body, Needs Review) */}
                {volumeData.unclassifiedExercises.length > 0 && (
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-sky-400" />
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                          Esercizi a Classificazione Speciale / Da Revisionare ({volumeData.unclassifiedExercises.length})
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        Esclusi dal calcolo del volume ipertrofico per distretto muscolare
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                      {volumeData.unclassifiedExercises.map((un, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <span className="font-bold text-white truncate block">{un.name}</span>
                            <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">
                              {un.day} • {un.reasonLabel}
                            </span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold shrink-0 ${
                              un.classificationType === 'Conditioning'
                                ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                                : un.classificationType === 'Mobilità / Prehab'
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                : un.classificationType === 'Full Body'
                                ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                                : un.classificationType === 'Tecnica'
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                : 'bg-orange-500/15 text-orange-300 border border-orange-500/30'
                            }`}
                          >
                            {un.classificationType} ({un.sets}s)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      ) : (
        /* ─── VISTA COMPATTA COLLASSATA ─── */
        <div className="p-3.5 sm:px-6 flex items-center justify-between gap-4 text-xs bg-slate-950/40">
          <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-0.5">
            <span className="text-xs font-bold text-slate-400 shrink-0">Top Distretti:</span>
            {volumeData.mostTrainedMuscles.map((d) => (
              <span
                key={d.muscleGroup}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-2 shrink-0"
              >
                <span className="font-bold text-amber-400">{d.muscleGroup}:</span>
                <span className="font-mono text-white font-black">{d.totalSets} set</span>
                <span className="text-[11px] text-slate-400">({d.directSets} dir)</span>
              </span>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="text-xs sm:text-sm font-black text-amber-400 hover:text-amber-300 hover:underline shrink-0 cursor-pointer flex items-center gap-1"
          >
            <span>Visualizza Radar & Benchmark</span>
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
