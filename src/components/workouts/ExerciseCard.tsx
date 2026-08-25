import React, { useState } from 'react';
import {
  Check,
  ChevronUp,
  Video,
  History,
  Zap,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { WorkoutExercise } from '../../types/workout';
import { cleanExecutiveNotes } from '../../utils/noteCleaner';
import { ExerciseAnatomyModal } from './ExerciseAnatomyModal';
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
          ? 'bg-[var(--color-panel)] border-2 border-[var(--color-primary)] shadow-xl shadow-[var(--color-primary)]/10 ring-1 ring-[var(--color-primary)]/20'
          : 'bg-[var(--color-panel)] border border-[var(--color-panel-border)] opacity-95 hover:opacity-100 hover:border-[var(--color-primary)]/40 shadow-sm'
      }`}
    >
      {/* 1. Header: Numero progressivo, Nome Esercizio (senza troncamento), Icona Compatta Tutorial e Chevron */}
      <div
        className="p-4 sm:p-5 flex items-center justify-between cursor-pointer select-none gap-3"
        onClick={onToggleActive}
      >
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          {/* Numero progressivo */}
          <div
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center font-black text-sm sm:text-base shrink-0 transition-transform ${
              isActive
                ? 'bg-[var(--color-primary)] text-slate-950 shadow-md shadow-[var(--color-primary)]/20 scale-105'
                : isCompleted
                ? 'bg-emerald-500/20 text-emerald-600 border border-emerald-500/30'
                : 'bg-[var(--color-surface-strong)] text-[var(--color-text-muted)] border border-[var(--color-border)]'
            }`}
          >
            {isCompleted ? <Check className="w-5 h-5 stroke-[2.5]" /> : index + 1}
          </div>

          {/* Nome Esercizio: layout fluido a capo naturale per massima leggibilità su mobile */}
          <div className="min-w-0 flex-1">
            <h3
              className={`font-black leading-snug tracking-tight text-[var(--color-text)] break-words ${
                isActive ? 'text-base sm:text-lg' : 'text-sm sm:text-base'
              }`}
            >
              {exercise.name}
            </h3>
            {previousHistory && previousHistory.sets.length > 0 && !isActive && (
              <span className="text-[11px] text-sky-600 flex items-center gap-1 font-mono mt-0.5 font-semibold line-clamp-1">
                <History className="w-3 h-3 shrink-0" />
                Ultima volta ({previousHistory.formattedDate}): {previousHistory.sets[0]?.weightKg || 0}kg × {previousHistory.sets[0]?.reps || 0}
              </span>
            )}
          </div>
        </div>

        {/* Azioni Header Compatte: Icona Tutorial + Storico + Chevron */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {previousHistory && previousHistory.sets.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowHistoryModal(true);
              }}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-600 hover:text-[var(--color-text)] hover:bg-sky-500/25 transition-all cursor-pointer shadow-sm flex items-center justify-center shrink-0"
              title="Visualizza lo storico carichi su questo esercizio"
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
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-600 hover:text-[var(--color-text)] hover:bg-sky-500/25 transition-all active:scale-95 cursor-pointer shadow-sm flex items-center justify-center shrink-0"
            title="Video Tutorial & Guida Esecuzione"
          >
            <Video className="w-4 h-4 text-sky-600" />
          </button>

          <button
            type="button"
            onClick={onToggleActive}
            className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
          >
            <ChevronUp className={`w-5 h-5 sm:w-6 sm:h-6 text-[var(--color-primary)] shrink-0 transition-transform ${isActive ? '' : 'rotate-180'}`} />
          </button>
        </div>
      </div>

      {/* 2. Target Prescritto dal Coach (Reps, Sets, RPE, Rest) */}
      <div className="px-4 sm:px-5 pb-3 grid grid-cols-4 gap-2 text-center text-xs">
        <div className="bg-[var(--color-surface-strong)] border border-[var(--color-border)] p-2.5 rounded-2xl">
          <span className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] block">Serie</span>
          <span className="text-sm sm:text-base font-black text-[var(--color-text)]">{exercise.sets}</span>
        </div>
        <div className="bg-[var(--color-surface-strong)] border border-[var(--color-border)] p-2.5 rounded-2xl">
          <span className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] block">
            {isTimeBased ? 'Target Tempo' : 'Target Reps'}
          </span>
          <span className="text-sm sm:text-base font-black text-[var(--color-primary)]">
            {formattedTarget}
          </span>
        </div>
        <div className="bg-[var(--color-surface-strong)] border border-[var(--color-border)] p-2.5 rounded-2xl">
          <span className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] block">Target RIR/RPE</span>
          <span className="text-sm sm:text-base font-black text-purple-600">{exercise.rir_target || '-'}</span>
        </div>
        <div className="bg-[var(--color-surface-strong)] border border-[var(--color-border)] p-2.5 rounded-2xl">
          <span className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] block">Recupero</span>
          <span className="text-sm sm:text-base font-black text-emerald-600 font-mono">{exercise.rest_seconds}s</span>
        </div>
      </div>

      {/* 2.1 Barra Tutorial Estesa (visibile se attiva per accesso rapido su mobile) */}
      {isActive && (
        <div className="px-4 sm:px-5 pb-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowAnatomyModal(true);
            }}
            className="w-full py-2 px-3 rounded-2xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/25 text-sky-400 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer shadow-sm"
          >
            <Video className="w-4 h-4 text-sky-400" />
            <span>Guarda Video Tutorial & Anatomia 3D</span>
          </button>
        </div>
      )}

      {/* 3. Note Tecniche / Esecutive del Coach (se presenti) */}
      {cleanNotes && (
        <div className="px-4 sm:px-5 pb-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-2xl text-xs text-[var(--color-text)] leading-relaxed">
            <span className="font-bold text-amber-600">Note Esecuzione: </span>
            {cleanNotes}
          </div>
        </div>
      )}

      {/* 4. Tabella Inserimento Serie (Visibile se espanso / attivo) */}
      {isActive && (
        <div className="p-4 sm:p-5 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
          
          {/* ─── BANNER MEMORIA STORICO & 1-TAP COPIA CARICHI ─── */}
          {previousHistory && previousHistory.sets.length > 0 ? (
            <div className="mb-4 p-3.5 sm:p-4 rounded-2xl bg-[var(--color-surface-strong)] border border-sky-500/30 shadow-sm space-y-3">
              {/* Riga 1: Titolo Esecuzione + Azioni Rapide */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-black uppercase tracking-wider text-sky-600 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    Ultima Esecuzione ({previousHistory.formattedDate})
                  </span>
                  {justApplied && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 text-[10px] font-black flex items-center gap-1 border border-emerald-500/40 animate-in fade-in">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Applicati!
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowHistoryModal(true)}
                    className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-[var(--color-panel)] hover:bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-[var(--color-border)] text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                    title="Visualizza tutte le sessioni passate"
                  >
                    <History className="w-3.5 h-3.5 text-sky-600" />
                    <span>Tutto lo Storico</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyPreviousLoads()}
                    className={`px-3.5 py-1.5 rounded-xl border text-xs font-black flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm ${
                      justApplied
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-emerald-500/20'
                        : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-slate-950 border-[var(--color-primary)] shadow-[var(--color-primary)]/20'
                    }`}
                    title="Applica i carichi e le ripetizioni dell'ultima volta su tutte le serie"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>{justApplied ? 'Applicati ✓' : 'Applica Ultimi Carichi'}</span>
                  </button>
                </div>
              </div>

              {/* Riga 2: Elenco Serie Orizzontale Pulito & Allineato */}
              <div className="flex items-center gap-2 overflow-x-auto pb-0.5 pt-0.5 no-scrollbar flex-wrap">
                {previousHistory.sets.map((s, idx) => (
                  <span
                    key={idx}
                    className="bg-[var(--color-panel)] px-2.5 py-1 rounded-xl border border-[var(--color-border)] font-mono text-[11px] text-[var(--color-text)] shadow-sm shrink-0 flex items-center gap-1"
                  >
                    <span className="text-[var(--color-text-muted)] font-bold text-[10px]">S{s.setNumber}:</span>
                    <strong className="text-[var(--color-text)] font-black">{s.weightKg || 0}kg</strong>
                    <span className="text-[var(--color-text-muted)] text-[10px]">×</span>
                    <span className="text-[var(--color-text)] font-bold">{s.reps || 0}</span>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="mb-4 p-3 rounded-2xl bg-[var(--color-surface-strong)] border border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-[var(--color-text-muted)]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Nessun carico registrato in precedenza per questo esercizio.</span>
              </div>
              <button
                type="button"
                onClick={handleApplyCoachTargets}
                className="px-3 py-1.5 rounded-xl bg-[var(--color-panel)] hover:bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer self-start sm:self-auto shrink-0"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Pre-compila Target ({formattedTarget})</span>
              </button>
            </div>
          )}

          {/* Toolbar Serie */}
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">
              Tracciamento Serie
            </span>
          </div>

          {/* Header Tabella */}
          <div className="grid grid-cols-12 gap-2 text-center text-[10px] sm:text-xs font-black uppercase tracking-wider text-[var(--color-text-muted)] mb-3 px-1">
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
                      ? 'bg-emerald-500/10 border-emerald-500/30 shadow-sm'
                      : 'bg-[var(--color-surface-strong)] border-[var(--color-border)] focus-within:border-[var(--color-primary)]'
                  }`}
                >
                  {/* SET Number */}
                  <div
                    className={`col-span-2 text-center text-base sm:text-lg font-black py-3 rounded-xl border transition-colors ${
                      isSetCompleted
                        ? 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30'
                        : 'bg-[var(--color-surface)] text-[var(--color-text)] border-[var(--color-border)] shadow-sm'
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
                          ? 'bg-[var(--color-surface-strong)] border-emerald-500/30 text-emerald-600 cursor-not-allowed font-black'
                          : 'bg-[var(--color-panel)] border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20'
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
                          ? 'bg-[var(--color-surface-strong)] border-emerald-500/30 text-emerald-600 cursor-not-allowed font-black'
                          : 'bg-[var(--color-panel)] border-[var(--color-border)] text-[var(--color-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20'
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
                          ? 'bg-[var(--color-surface-strong)] border-emerald-500/30 text-purple-600 cursor-not-allowed font-black'
                          : 'bg-[var(--color-panel)] border-[var(--color-border)] text-purple-600 placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
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
                          : 'bg-[var(--color-surface)] hover:bg-[var(--color-primary)] text-[var(--color-text-muted)] hover:text-slate-950 border border-[var(--color-border)]'
                      }`}
                      title={isSetCompleted ? 'Serie completata! Clicca per modificare' : 'Conferma e completa serie'}
                    >
                      <Check className={`w-6 h-6 stroke-[3] ${isSetCompleted ? 'text-slate-950' : 'text-[var(--color-text-muted)]'}`} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 5. Feedback / Note Atleta */}
          <div className="mt-5 pt-4 border-t border-[var(--color-border)] space-y-2">
            <label className="text-[11px] font-black uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-1.5">
              <span>💬 Feedback / Note Esercizio:</span>
            </label>
            <textarea
              rows={2}
              value={noteFeedback}
              onChange={(e) => onNoteFeedbackChange(e.target.value)}
              placeholder="Es. Fastidio alla spalla nella 3ª serie, oppure carico percepito leggero..."
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] text-xs focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all resize-none font-medium"
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
    </div>
  );
});
