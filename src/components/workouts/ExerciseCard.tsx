import React, { useState } from 'react';
import {
  Check,
  ChevronUp,
  Video,
  Dumbbell,
  History,
  Zap,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { WorkoutExercise } from '../../types/workout';
import { cleanExecutiveNotes } from '../../utils/noteCleaner';
import { ExerciseAnatomyModal } from './ExerciseAnatomyModal';
import { PlateCalculatorModal } from './PlateCalculatorModal';
import { ExerciseHistoryModal } from './ExerciseHistoryModal';
import { PreviousExerciseHistory, PreviousSetData } from '../../utils/workoutHistoryResolver';

interface ExerciseCardProps {
  exercise: WorkoutExercise;
  index: number;
  isActive: boolean;
  isCompleted: boolean;
  logs: { reps: string; weight: string; rpe: string }[];
  completedSetsMap: boolean[];
  noteFeedback: string;
  previousHistory?: PreviousExerciseHistory;
  onToggleActive: () => void;
  onLogChange: (setIndex: number, field: 'reps' | 'weight' | 'rpe', value: string) => void;
  onNoteFeedbackChange: (value: string) => void;
  onToggleSetComplete: (setIndex: number) => void;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = React.memo(({
  exercise,
  index,
  isActive,
  isCompleted,
  logs,
  completedSetsMap,
  noteFeedback,
  previousHistory,
  onToggleActive,
  onLogChange,
  onNoteFeedbackChange,
  onToggleSetComplete,
}) => {
  const [showAnatomyModal, setShowAnatomyModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [justApplied, setJustApplied] = useState(false);
  const [plateCalculatorTarget, setPlateCalculatorTarget] = useState<{
    setIndex: number;
    currentWeight: number;
  } | null>(null);

  const cleanNotes = cleanExecutiveNotes(exercise.notes);

  // Copia i carichi e le ripetizioni precedenti su tutte le serie dell'esercizio
  const handleCopyPreviousLoads = (customSets?: PreviousSetData[]) => {
    const sourceSets = customSets || previousHistory?.sets;
    if (!sourceSets || sourceSets.length === 0) return;

    // Compila le serie esistenti
    sourceSets.forEach((s, idx) => {
      if (idx < exercise.sets) {
        if (s.reps !== null && s.reps !== undefined) {
          onLogChange(idx, 'reps', String(s.reps));
        }
        if (s.weightKg !== null && s.weightKg !== undefined) {
          onLogChange(idx, 'weight', String(s.weightKg));
        }
        if (s.rpe !== null && s.rpe !== undefined) {
          onLogChange(idx, 'rpe', String(s.rpe));
        }
      }
    });

    // Se l'esercizio attuale ha più serie di quelle storiche, propaga l'ultimo carico
    if (exercise.sets > sourceSets.length && sourceSets.length > 0) {
      const lastSet = sourceSets[sourceSets.length - 1];
      for (let idx = sourceSets.length; idx < exercise.sets; idx++) {
        if (lastSet.reps !== null && lastSet.reps !== undefined) {
          onLogChange(idx, 'reps', String(lastSet.reps));
        }
        if (lastSet.weightKg !== null && lastSet.weightKg !== undefined) {
          onLogChange(idx, 'weight', String(lastSet.weightKg));
        }
        if (lastSet.rpe !== null && lastSet.rpe !== undefined) {
          onLogChange(idx, 'rpe', String(lastSet.rpe));
        }
      }
    }

    setJustApplied(true);
    setTimeout(() => setJustApplied(false), 2500);
  };

  // Applica i target prescritti dal Coach (se non c'è storico)
  const handleApplyCoachTargets = () => {
    const targetReps = exercise.reps_target || '10';
    const targetWeight = exercise.target_weight ? String(exercise.target_weight) : '0';

    for (let idx = 0; idx < exercise.sets; idx++) {
      onLogChange(idx, 'reps', targetReps);
      if (exercise.target_weight) {
        onLogChange(idx, 'weight', targetWeight);
      }
    }

    setJustApplied(true);
    setTimeout(() => setJustApplied(false), 2500);
  };

  const isTimeBased = Boolean(
    exercise.is_time_based ||
    (exercise.duration_seconds && exercise.duration_seconds > 0) ||
    exercise.reps_target?.toLowerCase().includes('min') ||
    exercise.reps_target?.toLowerCase().includes('sec') ||
    exercise.reps_target?.toLowerCase().includes('s') ||
    exercise.name.toLowerCase().includes('plank') ||
    exercise.name.toLowerCase().includes('hollow') ||
    exercise.name.toLowerCase().includes('wall sit') ||
    exercise.name.toLowerCase().includes('dead bug') ||
    exercise.name.toLowerCase().includes('isometr')
  );

  const formattedTarget = (() => {
    if (isTimeBased) {
      if (exercise.duration_seconds && exercise.duration_seconds > 0) {
        if (exercise.duration_seconds >= 60 && exercise.duration_seconds % 60 === 0) {
          return `${exercise.duration_seconds / 60} min`;
        }
        return `${exercise.duration_seconds}s`;
      }
      if (exercise.reps_target && (exercise.reps_target.includes('min') || exercise.reps_target.includes('s'))) {
        return exercise.reps_target;
      }
      if (exercise.name.toLowerCase().includes('plank')) {
        return '1 min';
      }
      return exercise.reps_target || '60s';
    }
    return exercise.reps_target || '10-12';
  })();

  return (
    <div
      className={`rounded-3xl transition-all duration-300 overflow-hidden border ${
        isActive
          ? 'bg-slate-900/60 backdrop-blur-xl border-[var(--color-primary)] shadow-xl shadow-[var(--color-primary)]/10 ring-1 ring-[var(--color-primary)]/20'
          : 'bg-slate-900/40 backdrop-blur-md border-slate-800/60 opacity-85 hover:opacity-100'
      }`}
    >
      {/* 1. Header: Numero progressivo, Nome Esercizio, Unico Pulsante Tutorial (con Anatomia & Guida) e Chevron */}
      <div
        className="p-4 sm:p-5 flex items-center justify-between cursor-pointer select-none"
        onClick={onToggleActive}
      >
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          {/* Numero progressivo */}
          <div
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center font-black text-sm sm:text-base shrink-0 transition-transform ${
              isActive
                ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-black shadow-md shadow-amber-500/20 scale-105'
                : isCompleted
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border border-slate-700/80'
            }`}
          >
            {isCompleted ? <Check className="w-5 h-5 stroke-[2.5]" /> : index + 1}
          </div>

          {/* Nome Esercizio */}
          <div className="min-w-0 flex-1">
            <h3
              className={`font-extrabold leading-tight tracking-tight truncate ${
                isActive ? 'text-white text-lg sm:text-xl' : 'text-slate-200 text-base sm:text-lg'
              }`}
            >
              {exercise.name}
            </h3>
            {previousHistory && previousHistory.sets.length > 0 && !isActive && (
              <span className="text-[11px] text-blue-400 flex items-center gap-1 font-mono mt-0.5">
                <History className="w-3 h-3" />
                Ultima volta ({previousHistory.formattedDate}): {previousHistory.sets[0]?.weightKg || 0}kg × {previousHistory.sets[0]?.reps || 0}
              </span>
            )}
          </div>
        </div>

        {/* Azioni Header: Singolo Pulsante Tutorial + Storico + Chevron */}
        <div className="flex items-center gap-2 shrink-0 ml-3">
          {previousHistory && previousHistory.sets.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowHistoryModal(true);
              }}
              className="p-2 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-300 hover:text-white hover:bg-blue-500/25 transition-all cursor-pointer shadow-sm"
              title="Visualizza lo storico completo delle prestazioni su questo esercizio"
            >
              <History className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowAnatomyModal(true);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-300 hover:text-white font-extrabold text-xs flex items-center gap-1.5 hover:bg-blue-500/25 transition-all active:scale-95 cursor-pointer shadow-sm"
            title="Apri Tutorial video, guida tecnica e mappa anatomica 3D"
          >
            <Video className="w-4 h-4 text-blue-400" />
            <span>Tutorial</span>
          </button>

          <button
            type="button"
            onClick={onToggleActive}
            className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronUp className={`w-6 h-6 text-amber-400 shrink-0 transition-transform ${isActive ? '' : 'rotate-180'}`} />
          </button>
        </div>
      </div>

      {/* 2. Target Prescritto dal Coach (Reps, Sets, RPE, Rest) */}
      <div className="px-4 sm:px-5 pb-4 grid grid-cols-4 gap-2 text-center text-xs">
        <div className="bg-slate-950/70 border border-slate-800/80 p-2.5 rounded-2xl">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Serie</span>
          <span className="text-sm sm:text-base font-extrabold text-white">{exercise.sets}</span>
        </div>
        <div className="bg-slate-950/70 border border-slate-800/80 p-2.5 rounded-2xl">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">
            {isTimeBased ? 'Target Tempo' : 'Target Reps'}
          </span>
          <span className="text-sm sm:text-base font-extrabold text-[var(--color-primary)]">
            {formattedTarget}
          </span>
        </div>
        <div className="bg-slate-950/70 border border-slate-800/80 p-2.5 rounded-2xl">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Target RIR/RPE</span>
          <span className="text-sm sm:text-base font-extrabold text-purple-300">{exercise.rir_target || '-'}</span>
        </div>
        <div className="bg-slate-950/70 border border-slate-800/80 p-2.5 rounded-2xl">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Recupero</span>
          <span className="text-sm sm:text-base font-extrabold text-emerald-400 font-mono">{exercise.rest_seconds}s</span>
        </div>
      </div>

      {/* 3. Note Tecniche / Esecutive del Coach (se presenti) */}
      {cleanNotes && (
        <div className="px-4 sm:px-5 pb-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-200/90 leading-relaxed">
            <span className="font-bold text-amber-400">Note Esecuzione: </span>
            {cleanNotes}
          </div>
        </div>
      )}

      {/* 4. Tabella Inserimento Serie (Visibile se espanso / attivo) */}
      {isActive && (
        <div className="p-4 sm:p-5 border-t border-slate-800/80 bg-slate-950/60">
          
          {/* ─── BANNER MEMORIA STORICO & 1-TAP COPIA CARICHI ─── */}
          {previousHistory && previousHistory.sets.length > 0 ? (
            <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/50 via-slate-900/90 to-slate-950 border border-blue-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5" />
                    Ultima Esecuzione ({previousHistory.formattedDate})
                  </span>
                  {justApplied && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black flex items-center gap-1 border border-emerald-500/40 animate-in fade-in">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Carichi applicati!
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {previousHistory.sets.map((s, idx) => (
                    <span
                      key={idx}
                      className="bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300"
                    >
                      S{s.setNumber}: <strong className="text-white">{s.weightKg || 0}kg</strong> × {s.reps || 0}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(true)}
                  className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  title="Visualizza tutte le sessioni passate"
                >
                  <History className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden sm:inline">Tutto lo Storico</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyPreviousLoads()}
                  className={`px-3.5 py-2 rounded-xl border text-xs font-black flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-md ${
                    justApplied
                      ? 'bg-emerald-500 text-black border-emerald-400 shadow-emerald-500/20'
                      : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-slate-950 border-[var(--color-primary)] shadow-[var(--color-primary)]/20'
                  }`}
                  title="Applica i carichi e le ripetizioni dell'ultima volta su tutte le serie"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>{justApplied ? 'Applicati ✓' : 'Applica Ultimi Carichi'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-4 p-3 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Nessun carico registrato in precedenza per questo esercizio.</span>
              </div>
              <button
                type="button"
                onClick={handleApplyCoachTargets}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer self-start sm:self-auto shrink-0"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Pre-compila Target ({formattedTarget})</span>
              </button>
            </div>
          )}

          {/* Toolbar Serie & Calcolo Piastre */}
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Tracciamento Serie
            </span>
            <button
              type="button"
              onClick={() => {
                const firstWeight = parseFloat(logs[0]?.weight) || (previousHistory?.sets?.[0]?.weightKg || 60);
                setPlateCalculatorTarget({ setIndex: 0, currentWeight: firstWeight });
              }}
              className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-[var(--color-primary)] border border-slate-800 hover:border-[var(--color-primary)]/40 text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Calcola i dischi da caricare sul bilanciere"
            >
              <Dumbbell className="w-3.5 h-3.5 text-[var(--color-primary)]" />
              <span>Calcola Dischi</span>
            </button>
          </div>

          {/* Header Tabella */}
          <div className="grid grid-cols-12 gap-2 text-center text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-400 mb-3 px-1">
            <div className="col-span-2">SET</div>
            <div className="col-span-3">{isTimeBased ? 'TEMPO' : 'REPS'}</div>
            <div className="col-span-3">KG</div>
            <div className="col-span-2">RPE</div>
            <div className="col-span-2">CONFERMA</div>
          </div>

          {/* Righe Serie */}
          <div className="space-y-2.5">
            {Array.from({ length: exercise.sets }, (_, setIdx) => {
              const setLog = logs[setIdx] || { reps: '', weight: '', rpe: '' };
              const isSetCompleted = Boolean(completedSetsMap[setIdx]);
              const prevSet = previousHistory?.sets?.[setIdx];

              return (
                <div
                  key={setIdx}
                  className={`grid grid-cols-12 gap-2 items-center p-2 rounded-2xl border transition-all ${
                    isSetCompleted
                      ? 'bg-emerald-950/20 border-emerald-500/30 shadow-md shadow-emerald-500/5'
                      : 'bg-slate-950 border-slate-800 focus-within:border-[var(--color-primary)] shadow-inner'
                  }`}
                >
                  {/* SET Number */}
                  <div
                    className={`col-span-2 text-center text-base sm:text-lg font-black py-3 rounded-xl border transition-colors ${
                      isSetCompleted
                        ? 'bg-emerald-900/50 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-800/90 text-slate-200 border-slate-700/60 shadow-inner'
                    }`}
                  >
                    {setIdx + 1}
                  </div>

                  {/* REPS / TEMPO Input */}
                  <div className="col-span-3">
                    <input
                      type="text"
                      placeholder={prevSet?.reps ? `${prevSet.reps}` : formattedTarget}
                      value={setLog.reps}
                      disabled={isSetCompleted}
                      onFocus={(e) => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                      onChange={(e) => onLogChange(setIdx, 'reps', e.target.value)}
                      className={`w-full py-3 px-2 border rounded-xl text-center text-base sm:text-lg font-black transition-all ${
                        isSetCompleted
                          ? 'bg-slate-900/70 border-slate-800 text-emerald-200 cursor-not-allowed opacity-90'
                          : 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-600 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20'
                      }`}
                    />
                  </div>

                  {/* KG Input */}
                  <div className="col-span-3">
                    <input
                      type="number"
                      placeholder={prevSet?.weightKg ? `${prevSet.weightKg}` : '0'}
                      value={setLog.weight}
                      disabled={isSetCompleted}
                      onFocus={(e) => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                      onChange={(e) => onLogChange(setIdx, 'weight', e.target.value)}
                      className={`w-full py-3 px-2 border rounded-xl text-center text-base sm:text-lg font-black transition-all ${
                        isSetCompleted
                          ? 'bg-slate-900/70 border-slate-800 text-emerald-400 cursor-not-allowed opacity-90'
                          : 'bg-slate-900 border-slate-700 text-[var(--color-primary)] placeholder:text-slate-600 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20'
                      }`}
                      inputMode="decimal"
                    />
                  </div>

                  {/* RPE Input */}
                  <div className="col-span-2">
                    <input
                      type="number"
                      placeholder="-"
                      value={setLog.rpe}
                      disabled={isSetCompleted}
                      onFocus={(e) => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                      onChange={(e) => onLogChange(setIdx, 'rpe', e.target.value)}
                      className={`w-full py-3 px-1 border rounded-xl text-center text-sm sm:text-base font-extrabold transition-all ${
                        isSetCompleted
                          ? 'bg-slate-900/70 border-slate-800 text-purple-300/80 cursor-not-allowed opacity-90'
                          : 'bg-slate-900 border-slate-700 text-purple-300 placeholder:text-slate-600 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                      }`}
                      inputMode="numeric"
                    />
                  </div>

                  {/* Pulsante Inserimento / Salva Serie */}
                  <div className="col-span-2 flex justify-center">
                    <button
                      type="button"
                      onClick={() => onToggleSetComplete(setIdx)}
                      className={`w-12 h-12 sm:w-13 sm:h-13 rounded-xl flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-md ${
                        isSetCompleted
                          ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/30'
                          : 'bg-slate-800/80 hover:bg-[var(--color-primary)] text-slate-400 hover:text-slate-950 border border-slate-700/80'
                      }`}
                      title={isSetCompleted ? 'Serie completata! Clicca per modificare' : 'Conferma e completa serie'}
                    >
                      <Check className={`w-6 h-6 stroke-[3] ${isSetCompleted ? 'text-slate-950' : 'text-slate-400'}`} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 5. Feedback / Note Atleta */}
          <div className="mt-5 pt-4 border-t border-slate-800/80 space-y-2">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <span>💬 Feedback / Note Esercizio per il Coach & AI Copilot:</span>
            </label>
            <textarea
              rows={2}
              value={noteFeedback}
              onChange={(e) => onNoteFeedbackChange(e.target.value)}
              placeholder="Es. Fastidio alla spalla nella 3ª serie, oppure carico percepito leggero..."
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 placeholder:text-slate-600 text-xs focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all resize-none"
            />
          </div>
        </div>
      )}

      {/* MODALE TUTORIAL & ANATOMIA 3D */}
      <ExerciseAnatomyModal
        isOpen={showAnatomyModal}
        onClose={() => setShowAnatomyModal(false)}
        exercise={exercise}
      />

      {/* MODALE STORICO COMPLETO ESERCIZIO */}
      <ExerciseHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        exerciseName={exercise.name}
        history={previousHistory}
        onApplySessionLoads={(sessionEntry) => handleCopyPreviousLoads(sessionEntry.sets)}
      />

      {/* MODALE CALCOLATORE DISCHI */}
      {plateCalculatorTarget && (
        <PlateCalculatorModal
          initialWeight={plateCalculatorTarget.currentWeight}
          exerciseName={exercise.name}
          onClose={() => setPlateCalculatorTarget(null)}
          onApplyWeight={(calculatedWeight) => {
            onLogChange(plateCalculatorTarget.setIndex, 'weight', String(calculatedWeight));
            setPlateCalculatorTarget(null);
          }}
        />
      )}
    </div>
  );
});
