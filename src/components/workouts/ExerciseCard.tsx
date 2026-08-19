import React, { useState } from 'react';
import {
  Check,
  CheckCheck,
  ChevronUp,
  Video,
  MessageSquare,
  Dumbbell,
  History,
  Copy
} from 'lucide-react';
import { WorkoutExercise } from '../../types/workout';
import { cleanExecutiveNotes } from '../../utils/noteCleaner';
import { ExerciseAnatomyModal } from './ExerciseAnatomyModal';
import { PlateCalculatorModal } from './PlateCalculatorModal';
import { PreviousExerciseHistory } from '../../utils/workoutHistoryResolver';

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

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
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
  const [plateCalculatorTarget, setPlateCalculatorTarget] = useState<{
    setIndex: number;
    currentWeight: number;
  } | null>(null);

  const cleanNotes = cleanExecutiveNotes(exercise.notes);

  // Copia i carichi e le reps dell'ultima volta su tutte le serie
  const handleCopyPreviousLoads = () => {
    if (!previousHistory?.sets) return;
    previousHistory.sets.forEach((s, idx) => {
      if (idx < exercise.sets) {
        if (s.reps !== null && s.reps !== undefined) {
          onLogChange(idx, 'reps', String(s.reps));
        }
        if (s.weightKg !== null && s.weightKg !== undefined) {
          onLogChange(idx, 'weight', String(s.weightKg));
        }
      }
    });
  };

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
          </div>
        </div>

        {/* Azioni Header: Singolo Pulsante Tutorial (con Guida & Anatomia 3D) + Chevron */}
        <div className="flex items-center gap-2 shrink-0 ml-3">
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
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Target Reps</span>
          <span className="text-sm sm:text-base font-extrabold text-[var(--color-primary)]">{exercise.reps_target}</span>
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
          
          {/* ─── BANNER MEMORIA ULTIMA SESSIONE (GHOST LOG) ─── */}
          {previousHistory && previousHistory.sets.length > 0 && (
            <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-slate-900/90 to-slate-950 border border-blue-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5" />
                  Riferimento Ultima Volta ({previousHistory.formattedDate})
                </span>
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

              <button
                type="button"
                onClick={handleCopyPreviousLoads}
                className="px-3 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 hover:text-white border border-blue-500/40 text-xs font-black flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shrink-0 shadow-sm"
                title="Copia i carichi e le ripetizioni dell'ultima volta su tutte le serie"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copia Carichi</span>
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
            <div className="col-span-3">REPS</div>
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

                  {/* REPS Input */}
                  <div className="col-span-3">
                    <input
                      type="number"
                      placeholder={prevSet?.reps ? `${prevSet.reps}` : exercise.reps_target}
                      value={setLog.reps}
                      disabled={isSetCompleted}
                      onFocus={(e) => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                      onChange={(e) => onLogChange(setIdx, 'reps', e.target.value)}
                      className={`w-full py-3 px-2 border rounded-xl text-center text-base sm:text-lg font-black transition-all ${
                        isSetCompleted
                          ? 'bg-slate-900/70 border-slate-800 text-emerald-200 cursor-not-allowed opacity-90'
                          : 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-600 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20'
                      }`}
                      inputMode="numeric"
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
                          ? 'bg-emerald-500 text-black border border-emerald-400 font-extrabold shadow-emerald-500/30 scale-105'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500 hover:text-black shadow-emerald-500/10'
                      }`}
                      title={
                        isSetCompleted
                          ? 'Serie completata (clicca per sbloccare e modificare)'
                          : 'Segna serie come completata'
                      }
                    >
                      {isSetCompleted ? (
                        <CheckCheck className="w-6 h-6 stroke-[3]" />
                      ) : (
                        <Check className="w-6 h-6 stroke-[3]" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Feedback / Note Esercizio per Coach & Copilot */}
          <div className="mt-5 pt-4 border-t border-slate-800/80 space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-[var(--color-primary)]" />
              Feedback / Note Esercizio per il Coach & AI Copilot:
            </label>
            <input
              type="text"
              placeholder="Es. Fastidio alla spalla nella 3ª serie, oppure carico percepito leggero..."
              value={noteFeedback}
              onFocus={(e) => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' })}
              onChange={(e) => onNoteFeedbackChange(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[var(--color-primary)] transition-colors"
            />
          </div>
        </div>
      )}

      {/* ── MODAL UNIFICATA GUIDA ANATOMICA 3D, TECNICA & VIDEO TUTORIAL ── */}
      <ExerciseAnatomyModal
        exercise={exercise}
        isOpen={showAnatomyModal}
        onClose={() => setShowAnatomyModal(false)}
      />

      {/* ── MODAL CALCOLATORE PIASTRE & DISCHI BILANCIERE ── */}
      {plateCalculatorTarget !== null && (
        <PlateCalculatorModal
          initialWeight={plateCalculatorTarget.currentWeight}
          exerciseName={exercise.name}
          onClose={() => setPlateCalculatorTarget(null)}
          onApplyWeight={(w) => {
            onLogChange(plateCalculatorTarget.setIndex, 'weight', String(w));
            setPlateCalculatorTarget(null);
          }}
        />
      )}
    </div>
  );
};
