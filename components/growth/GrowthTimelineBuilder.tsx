import React, { useState, useMemo, useCallback } from 'react';
import {
  Layers,
  Sparkles,
  Plus,
  Trash2,
  Sliders,
  Zap,
  Save,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  GrowthProgramState,
  MesocycleBlock,
  ExerciseGrowthProgram,
  WeekProgressionData,
  AutoProgressionType,
} from '../../types';
import { useToast } from '../../context/ToastContext';
import { storageService } from '../../services/storageService';

export interface GrowthTimelineBuilderProps {
  athleteId?: string;
  athleteName?: string;
  initialState?: GrowthProgramState;
  onSaveProgram?: (program: GrowthProgramState) => void;
}

export const GrowthTimelineBuilder: React.FC<GrowthTimelineBuilderProps> = ({
  athleteId = 'ath-1',
  athleteName = 'Marco Rossi',
  initialState,
  onSaveProgram,
}) => {
  const { showSuccess, showInfo } = useToast();

  // 1. STATO PRINCIPALE DURATA E BLOCCHI MESOCICLICI
  const [totalWeeks, setTotalWeeks] = useState<number>(initialState?.totalWeeks || 12);
  const [programTitle, setProgramTitle] = useState<string>(
    initialState?.title || 'Programma Periodizzato di Ipertrofia & Forza'
  );

  // Generatore blocchi predefiniti in base al totale settimane
  const createDefaultBlocks = useCallback((weeks: number): MesocycleBlock[] => {
    if (weeks <= 4) {
      return [
        { id: 'b-1', name: 'Blocco Unico: Intensificazione', startWeek: 1, endWeek: weeks, color: '#3b82f6' },
      ];
    }
    if (weeks <= 8) {
      return [
        { id: 'b-1', name: 'Blocco 1: Accumulo Volume', startWeek: 1, endWeek: 4, color: '#3b82f6' },
        { id: 'b-2', name: 'Blocco 2: Intensificazione', startWeek: 5, endWeek: weeks, color: '#f59e0b' },
      ];
    }
    if (weeks <= 16) {
      const b1End = Math.floor(weeks / 3);
      const b2End = Math.floor((weeks * 2) / 3);
      return [
        { id: 'b-1', name: 'Blocco 1: Accumulo Volume', startWeek: 1, endWeek: b1End, color: '#3b82f6' },
        { id: 'b-2', name: 'Blocco 2: Intensificazione Carico', startWeek: b1End + 1, endWeek: b2End, color: '#f59e0b' },
        { id: 'b-3', name: 'Blocco 3: Realizzazione & Peak', startWeek: b2End + 1, endWeek: weeks, color: '#8b5cf6' },
      ];
    }
    // 17 - 24 Settimane
    return [
      { id: 'b-1', name: 'Blocco 1: Accumulo Ipertrofico', startWeek: 1, endWeek: 6, color: '#3b82f6' },
      { id: 'b-2', name: 'Blocco 2: Forgiatura Forza', startWeek: 7, endWeek: 12, color: '#10b981' },
      { id: 'b-3', name: 'Blocco 3: Alta Intensità Peak', startWeek: 13, endWeek: 18, color: '#f59e0b' },
      { id: 'b-4', name: 'Blocco 4: Realizzazione & Deload Test', startWeek: 19, endWeek: weeks, color: '#8b5cf6' },
    ];
  }, []);

  const [blocks, setBlocks] = useState<MesocycleBlock[]>(() => {
    return initialState?.blocks || createDefaultBlocks(totalWeeks);
  });

  // Generazione settimane iniziali per un esercizio
  const generateInitialWeeksData = useCallback((weeksCount: number, baseLoad: number): WeekProgressionData[] => {
    return Array.from({ length: weeksCount }, (_, i) => {
      const weekNum = i + 1;
      const isDeload = weekNum % 4 === 0;
      const pct = isDeload ? 60 : Math.min(90, 70 + (weekNum % 4) * 5);
      return {
        weekNumber: weekNum,
        sets: isDeload ? 2 : 4,
        targetReps: isDeload ? '6' : '8',
        percentage1RM: pct,
        targetRPE: isDeload ? 6 : 8,
        targetRIR: isDeload ? 4 : 2,
        estimatedLoadKg: Math.round((baseLoad * pct) / 100),
        notes: isDeload ? 'Scarico Attivo (Deload)' : `Settimana ${weekNum}`,
        isDeload,
      };
    });
  }, []);

  // Stato Esercizi
  const [exercises, setExercises] = useState<ExerciseGrowthProgram[]>(() => {
    if (initialState?.exercises && initialState.exercises.length > 0) {
      return initialState.exercises;
    }
    return [
      {
        id: 'ex-g-1',
        exerciseId: 'squat-barbell',
        exerciseName: 'Squat con Bilanciere',
        baseLoadKg: 140,
        weeks: generateInitialWeeksData(totalWeeks, 140),
      },
      {
        id: 'ex-g-2',
        exerciseId: 'bench-press',
        exerciseName: 'Panca Piana Bilanciere',
        baseLoadKg: 100,
        weeks: generateInitialWeeksData(totalWeeks, 100),
      },
    ];
  });

  // Gestione Cambio Totale Settimane (1 - 24)
  const handleWeeksChange = (newWeeks: number) => {
    const clampedWeeks = Math.max(1, Math.min(24, newWeeks));
    setTotalWeeks(clampedWeeks);

    // Aggiorna blocchi mesociclici
    setBlocks(createDefaultBlocks(clampedWeeks));

    // Aggiorna l'array delle settimane per ciascun esercizio preservando i dati esistenti
    setExercises((prev) =>
      prev.map((ex) => {
        let updatedWeeks = [...ex.weeks];
        if (updatedWeeks.length < clampedWeeks) {
          // Aggiungi settimane mancanti
          const additional = generateInitialWeeksData(clampedWeeks, ex.baseLoadKg).slice(
            updatedWeeks.length
          );
          updatedWeeks = [...updatedWeeks, ...additional];
        } else if (updatedWeeks.length > clampedWeeks) {
          // Riduci settimane
          updatedWeeks = updatedWeeks.slice(0, clampedWeeks);
        }
        return { ...ex, weeks: updatedWeeks };
      })
    );
  };

  // 2. CHUNKING & TABBED VIEW DELLE SETTIMANE PER ALTE PRESTAZIONI
  const [selectedBlockId, setSelectedBlockId] = useState<string>('all');

  // Filtro settimane visibili per evitare lag DOM su 24 settimane
  const activeWeekRange = useMemo(() => {
    if (selectedBlockId === 'all') {
      return { start: 1, end: totalWeeks };
    }
    const foundBlock = blocks.find((b) => b.id === selectedBlockId);
    if (!foundBlock) return { start: 1, end: totalWeeks };
    return { start: foundBlock.startWeek, end: foundBlock.endWeek };
  }, [selectedBlockId, blocks, totalWeeks]);

  // 3. MOTORE AUTOCOMPILAZIONE PROGRESSIONI (AUTO-PROGRESSION ENGINE)
  const [isAutoEngineOpen, setIsAutoEngineOpen] = useState(false);
  const [targetExerciseId, setTargetExerciseId] = useState<string | null>(null);
  const [progressionType, setProgressionType] = useState<AutoProgressionType>('lineare_carico');
  const [startLoadKg, setStartLoadKg] = useState<number>(100);
  const [weeklyIncPercent, setWeeklyIncPercent] = useState<number>(2.5);
  const [autoDeloadFrequency, setAutoDeloadFrequency] = useState<number>(4);

  const handleApplyAutoProgression = () => {
    if (!targetExerciseId) return;

    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== targetExerciseId) return ex;

        const updatedWeeks = ex.weeks.map((w, idx) => {
          const weekNum = idx + 1;
          const isDeload = weekNum % autoDeloadFrequency === 0;

          let sets = w.sets;
          let targetReps = w.targetReps;
          let percentage1RM = w.percentage1RM || 70;
          let estimatedLoadKg = w.estimatedLoadKg || startLoadKg;
          let notes = w.notes;

          if (isDeload) {
            sets = Math.max(2, Math.floor(sets / 2));
            percentage1RM = 60;
            estimatedLoadKg = Math.round(startLoadKg * 0.6);
            notes = `Scarico Programmato (Week ${weekNum})`;
          } else {
            if (progressionType === 'lineare_carico') {
              const weekFactor = idx - Math.floor(idx / autoDeloadFrequency);
              const totalInc = 1 + (weekFactor * weeklyIncPercent) / 100;
              estimatedLoadKg = Math.round(startLoadKg * totalInc);
              percentage1RM = Math.min(95, Math.round(70 * totalInc));
              notes = `Progressione Lineare +${weeklyIncPercent}%`;
            } else if (progressionType === 'lineare_reps') {
              const weekFactor = idx % autoDeloadFrequency;
              targetReps = `${8 + weekFactor}`;
              estimatedLoadKg = startLoadKg;
              notes = `Incremento Volume Reps (${targetReps})`;
            } else if (progressionType === 'onda_wave') {
              const waveStep = idx % 3;
              if (waveStep === 0) {
                targetReps = '8';
                percentage1RM = 70;
              } else if (waveStep === 1) {
                targetReps = '6';
                percentage1RM = 75;
              } else {
                targetReps = '4';
                percentage1RM = 80;
              }
              const waveCycle = Math.floor(idx / 3);
              estimatedLoadKg = Math.round(startLoadKg * (1 + (waveCycle * 3) / 100));
              notes = `Onda Step ${waveStep + 1} (${targetReps} reps)`;
            } else if (progressionType === 'volume_set') {
              const step = Math.min(3, Math.floor(idx / 2));
              sets = 3 + step;
              notes = `Progressione Serie (${sets} set)`;
            }
          }

          return {
            ...w,
            sets,
            targetReps,
            percentage1RM,
            estimatedLoadKg,
            notes,
            isDeload,
          };
        });

        return { ...ex, baseLoadKg: startLoadKg, weeks: updatedWeeks };
      })
    );

    setIsAutoEngineOpen(false);
    showSuccess('Progressione Generata!', 'Gli schemi delle 24 settimane sono stati ricalcolati automaticamente.');
  };

  // Modifica diretta cella settimana
  const handleUpdateWeekData = (
    exerciseId: string,
    weekNum: number,
    field: keyof WeekProgressionData,
    val: string | number | boolean
  ) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        const updatedWeeks = ex.weeks.map((w) => {
          if (w.weekNumber !== weekNum) return w;
          return { ...w, [field]: val };
        });
        return { ...ex, weeks: updatedWeeks };
      })
    );
  };

  // Aggiungi/Rimuovi Esercizio dal Programma
  const handleAddExerciseToProgram = () => {
    const newExId = `ex-g-${Date.now()}`;
    const newEx: ExerciseGrowthProgram = {
      id: newExId,
      exerciseId: 'custom-exercise',
      exerciseName: 'Nuovo Esercizio Fondamentale',
      baseLoadKg: 80,
      weeks: generateInitialWeeksData(totalWeeks, 80),
    };
    setExercises((prev) => [...prev, newEx]);
    showInfo('Esercizio Aggiunto', 'Nuovo esercizio inserito nel programma.');
  };

  const handleRemoveExerciseFromProgram = (id: string) => {
    setExercises((prev) => prev.filter((ex) => ex.id !== id));
  };

  // Salva il programma nel sistema e in LocalStorage
  const handleSaveProgramState = () => {
    const fullState: GrowthProgramState = {
      id: initialState?.id || `growth-prog-${Date.now()}`,
      title: programTitle,
      athleteId,
      athleteName,
      totalWeeks,
      blocks,
      exercises,
      updatedAt: new Date().toISOString(),
    };

    storageService.saveData(`growth_program_${fullState.id}`, fullState);
    if (onSaveProgram) {
      onSaveProgram(fullState);
    }
    showSuccess('Programma Salvato!', `Programma a ${totalWeeks} settimane salvato con successo per ${athleteName}.`);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
      {/* ─── HEADER & SELETTORE DURATA 1-24 SETTIMANE ──────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[var(--color-primary)] shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={programTitle}
                onChange={(e) => setProgramTitle(e.target.value)}
                className="text-lg font-black text-white bg-transparent border-b border-dashed border-slate-700 focus:outline-none focus:border-[var(--color-primary)]"
              />
              <span className="text-xs font-mono font-bold bg-amber-500/10 text-[var(--color-primary)] border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                {totalWeeks} Settimane
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Long-Term Program Builder con periodizzazione e mesocicli personalizzati per {athleteName}
            </p>
          </div>
        </div>

        <button
          onClick={handleSaveProgramState}
          className="px-6 py-2.5 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs uppercase tracking-wider hover:brightness-110 transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20 shrink-0"
        >
          <Save className="w-4 h-4" /> Salva Programma Crescita
        </button>
      </div>

      {/* ─── SELETTORE TIMELINE 1-24 SETTIMANE & BLOCCHI ────────────────────── */}
      <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[var(--color-primary)]" />
            Durata Totale del Programma ({totalWeeks} Settimane)
          </label>

          <div className="flex items-center gap-3">
            <input
              type="range"
              min="1"
              max="24"
              value={totalWeeks}
              onChange={(e) => handleWeeksChange(parseInt(e.target.value, 10))}
              className="accent-[var(--color-primary)] bg-slate-800 h-2 rounded-lg cursor-pointer w-48"
            />
            <span className="text-sm font-mono font-bold text-[var(--color-primary)] bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-lg">
              {totalWeeks} W
            </span>
          </div>
        </div>

        {/* VISUALIZZAZIONE E MODIFICA BLOCCHI MESOCICLICI */}
        <div className="space-y-2 pt-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Struttura Mesocicli & Blocchi del Programma
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {blocks.map((block) => (
              <div
                key={block.id}
                style={{ borderColor: `${block.color}50` }}
                className="p-3 rounded-xl bg-slate-900 border space-y-1.5 relative overflow-hidden"
              >
                <div
                  style={{ backgroundColor: block.color }}
                  className="absolute top-0 left-0 right-0 h-1"
                />
                <div className="flex items-center justify-between text-xs font-bold text-white pt-1">
                  <input
                    type="text"
                    value={block.name}
                    onChange={(e) => {
                      const newName = e.target.value;
                      setBlocks((prev) =>
                        prev.map((b) => (b.id === block.id ? { ...b, name: newName } : b))
                      );
                    }}
                    className="bg-transparent border-b border-transparent focus:border-slate-600 text-xs font-bold text-white focus:outline-none w-full mr-2"
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                  <span>
                    Settimane {block.startWeek} - {block.endWeek}
                  </span>
                  <span className="text-slate-500">
                    ({block.endWeek - block.startWeek + 1} Sett)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── NAVEGAZIONE PER MESOCICLO (CHUNKING PERFORMANCE) ─────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedBlockId('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            selectedBlockId === 'all'
              ? 'bg-[var(--color-primary)] text-black font-extrabold shadow-md'
              : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          Tutte le Settimane (1 - {totalWeeks})
        </button>

        {blocks.map((b) => (
          <button
            key={b.id}
            onClick={() => setSelectedBlockId(b.id)}
            style={{
              backgroundColor: selectedBlockId === b.id ? `${b.color}20` : undefined,
              borderColor: selectedBlockId === b.id ? b.color : undefined,
              color: selectedBlockId === b.id ? '#ffffff' : undefined,
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
              selectedBlockId === b.id
                ? 'font-black border shadow-md'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {b.name} (W{b.startWeek}-W{b.endWeek})
          </button>
        ))}
      </div>

      {/* ─── TABELLA ESERCIZI & PROGRESSIONI MULTI-SETTIMANA ───────────────── */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-[var(--color-primary)]" />
            Progressioni Esercizi (Settimane {activeWeekRange.start} - {activeWeekRange.end})
          </h3>
          <button
            onClick={handleAddExerciseToProgram}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700"
          >
            <Plus className="w-3.5 h-3.5 text-[var(--color-primary)]" /> Aggiungi Esercizio
          </button>
        </div>

        {exercises.map((ex) => (
          <div
            key={ex.id}
            className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-xl"
          >
            {/* Header Esercizio */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={ex.exerciseName}
                  onChange={(e) => {
                    const newName = e.target.value;
                    setExercises((prev) =>
                      prev.map((item) => (item.id === ex.id ? { ...item, exerciseName: newName } : item))
                    );
                  }}
                  className="text-sm font-black text-white bg-transparent border-b border-slate-700 focus:outline-none focus:border-[var(--color-primary)]"
                />
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span>Peso Base:</span>
                  <input
                    type="number"
                    value={ex.baseLoadKg}
                    onChange={(e) => {
                      const newBase = parseFloat(e.target.value) || 0;
                      setExercises((prev) =>
                        prev.map((item) => (item.id === ex.id ? { ...item, baseLoadKg: newBase } : item))
                      );
                    }}
                    className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 font-mono text-xs text-[var(--color-primary)] font-bold focus:outline-none"
                  />
                  <span>kg</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setTargetExerciseId(ex.id);
                    setStartLoadKg(ex.baseLoadKg);
                    setIsAutoEngineOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-[var(--color-primary)] border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Genera Progressione Automatica
                </button>

                <button
                  onClick={() => handleRemoveExerciseFromProgram(ex.id)}
                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Elimina Esercizio"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* GRIGLIA MULTI-SETTIMANA (SCROLLABILE ED ESPANDIBILE) */}
            <div className="overflow-x-auto pb-2 scrollbar-thin">
              <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-900 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                    <th className="p-2.5 w-16 text-center">Sett.</th>
                    <th className="p-2.5 w-20 text-center">Set</th>
                    <th className="p-2.5 w-24 text-center">Reps</th>
                    <th className="p-2.5 w-28 text-center">%1RM / RPE</th>
                    <th className="p-2.5 w-28 text-center">Carico (kg)</th>
                    <th className="p-2.5">Note Tecniche & Obiettivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {ex.weeks
                    .filter(
                      (w) =>
                        w.weekNumber >= activeWeekRange.start &&
                        w.weekNumber <= activeWeekRange.end
                    )
                    .map((w) => (
                      <tr
                        key={w.weekNumber}
                        className={`transition-colors ${
                          w.isDeload
                            ? 'bg-amber-500/5 hover:bg-amber-500/10'
                            : 'hover:bg-slate-900/50'
                        }`}
                      >
                        {/* Settimana # */}
                        <td className="p-2.5 text-center font-mono font-bold text-slate-300">
                          W{w.weekNumber}
                          {w.isDeload && (
                            <span className="block text-[9px] text-amber-400 font-extrabold uppercase">
                              Deload
                            </span>
                          )}
                        </td>

                        {/* Set */}
                        <td className="p-2.5 text-center">
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={w.sets}
                            onChange={(e) =>
                              handleUpdateWeekData(
                                ex.id,
                                w.weekNumber,
                                'sets',
                                parseInt(e.target.value, 10) || 1
                              )
                            }
                            className="w-12 bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-center font-mono font-bold text-white focus:outline-none focus:border-[var(--color-primary)]"
                          />
                        </td>

                        {/* Reps */}
                        <td className="p-2.5 text-center">
                          <input
                            type="text"
                            value={w.targetReps}
                            onChange={(e) =>
                              handleUpdateWeekData(
                                ex.id,
                                w.weekNumber,
                                'targetReps',
                                e.target.value
                              )
                            }
                            className="w-16 bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-center font-mono text-slate-200 focus:outline-none focus:border-[var(--color-primary)]"
                          />
                        </td>

                        {/* %1RM / RPE */}
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              value={w.percentage1RM || ''}
                              onChange={(e) =>
                                handleUpdateWeekData(
                                  ex.id,
                                  w.weekNumber,
                                  'percentage1RM',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              placeholder="75"
                              className="w-12 bg-slate-900 border border-slate-800 rounded px-1 py-1 text-center font-mono text-sky-400 font-bold focus:outline-none"
                            />
                            <span className="text-[10px] text-slate-500 font-bold">%</span>
                          </div>
                        </td>

                        {/* Carico stimato */}
                        <td className="p-2.5 text-center">
                          <input
                            type="number"
                            step="0.5"
                            value={w.estimatedLoadKg || ''}
                            onChange={(e) =>
                              handleUpdateWeekData(
                                ex.id,
                                w.weekNumber,
                                'estimatedLoadKg',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-16 bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-center font-mono font-bold text-[var(--color-primary)] focus:outline-none"
                          />
                        </td>

                        {/* Note Tecniche */}
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={w.notes || ''}
                            onChange={(e) =>
                              handleUpdateWeekData(
                                ex.id,
                                w.weekNumber,
                                'notes',
                                e.target.value
                              )
                            }
                            placeholder="Aggiungi indicazioni tecniche..."
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-[var(--color-primary)]"
                          />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* ─── 4. MODALE MOTORE AUTOCOMPILAZIONE PROGRESSIONI ───────────────── */}
      {isAutoEngineOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[var(--color-primary)]">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Auto-Progression Engine</h3>
                  <p className="text-xs text-slate-400">Calcolo automatico sulle {totalWeeks} settimane</p>
                </div>
              </div>
              <button
                onClick={() => setIsAutoEngineOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Selezione Modello Progressione */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold uppercase tracking-wider">
                  Modello di Progressione Automatica
                </label>
                <select
                  value={progressionType}
                  onChange={(e) => setProgressionType(e.target.value as AutoProgressionType)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--color-primary)]"
                >
                  <option value="lineare_carico">a) Progressione Lineare (+2.5% Carico/sett)</option>
                  <option value="lineare_reps">b) Progressione Lineare (+1 Rep/sett)</option>
                  <option value="onda_wave">c) Progressioni ad Onda / Wave Loading (3x8, 3x6, 3x4)</option>
                  <option value="volume_set">d) Progressione di Volume (3 -&gt; 6 Set/sett)</option>
                </select>
              </div>

              {/* Peso di partenza & Incremento */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold uppercase tracking-wider">
                    Carico Iniziale (kg)
                  </label>
                  <input
                    type="number"
                    value={startLoadKg}
                    onChange={(e) => setStartLoadKg(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono text-[var(--color-primary)] font-bold focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-bold uppercase tracking-wider">
                    Incremento %/sett
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={weeklyIncPercent}
                    onChange={(e) => setWeeklyIncPercent(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono text-sky-400 font-bold focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-bold uppercase tracking-wider">
                    Frequenza Deload
                  </label>
                  <select
                    value={autoDeloadFrequency}
                    onChange={(e) => setAutoDeloadFrequency(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                  >
                    <option value={4}>Ogni 4 W (W4, W8...)</option>
                    <option value={6}>Ogni 6 W (W6, W12...)</option>
                    <option value={8}>Ogni 8 W (W8, W16...)</option>
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[#edf5e1] space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-[var(--color-primary)]">
                  <Zap className="w-4 h-4" /> Nota del Motore
                </span>
                <p className="text-[11px] text-slate-300">
                  Il motore ricalcolerà istantaneamente le ripetizioni, le serie, i carichi in kg e le percentuali per l'intero arco di {totalWeeks} settimane, inserendo lo scarico automatico a volume dimezzato.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAutoEngineOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={handleApplyAutoProgression}
                  className="px-5 py-2 rounded-xl bg-[var(--color-primary)] hover:brightness-110 text-black font-black uppercase tracking-wider shadow-lg shadow-amber-500/20"
                >
                  Genera su {totalWeeks} Settimane
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
