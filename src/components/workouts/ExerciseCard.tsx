import React, { useState } from 'react';
import { Check, CheckCheck, ChevronDown, ChevronUp, Video, MessageSquare } from 'lucide-react';
import { WorkoutExercise } from '../../types/workout';
import { cleanExecutiveNotes } from '../../utils/noteCleaner';

interface ExerciseCardProps {
  exercise: WorkoutExercise;
  index: number;
  isActive: boolean;
  isCompleted: boolean;
  logs: { reps: string; weight: string; rpe: string }[];
  completedSetsMap: boolean[];
  noteFeedback: string;
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
  onToggleActive,
  onLogChange,
  onNoteFeedbackChange,
  onToggleSetComplete,
}) => {
  const [showVideoModal, setShowVideoModal] = useState(false);
  const cleanNotes = cleanExecutiveNotes(exercise.notes);

  return (
    <div
      className={`rounded-3xl transition-all duration-300 overflow-hidden border ${
        isActive
          ? 'bg-slate-900 border-[var(--color-primary)] shadow-xl shadow-[var(--color-primary)]/10 ring-1 ring-[var(--color-primary)]/20'
          : 'bg-slate-900/50 border-slate-800 opacity-75 hover:opacity-100'
      }`}
    >
      {/* 1. Header (In alto): Numero progressivo, Nome Esercizio, Pulsante Video e Chevron */}
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

        {/* Azioni Header: Pulsante Video + Chevron */}
        <div className="flex items-center gap-2 shrink-0 ml-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowVideoModal(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 font-extrabold text-xs flex items-center gap-1.5 hover:bg-blue-500/20 transition-all active:scale-95 cursor-pointer shadow-sm"
            title="Guarda tutorial dell'esercizio"
          >
            <Video className="w-4 h-4 text-blue-400" />
            <span className="hidden sm:inline">Tutorial</span>
          </button>

          <button
            type="button"
            onClick={onToggleActive}
            className="p-1 text-slate-400 hover:text-white transition-colors"
          >
            {isActive ? (
              <ChevronUp className="w-6 h-6 text-amber-400 shrink-0" />
            ) : (
              <ChevronDown className="w-6 h-6 text-slate-500 shrink-0" />
            )}
          </button>
        </div>
      </div>

      {/* 2. Riga Parametri (Badge stilizzati ordinati su un'unica riga) */}
      <div className="px-4 sm:px-5 pb-3.5 pt-1 flex flex-wrap items-center gap-2 sm:gap-2.5">
        {/* [ 4 x 5 ] */}
        <span className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white font-extrabold font-mono shadow-sm">
          {exercise.is_time_based
            ? `${exercise.sets} x ${exercise.duration_seconds || 30}s`
            : `${exercise.sets} x ${exercise.reps_target}`}
        </span>

        {/* [ Target: 78% 1RM ] */}
        {exercise.target_weight && (
          <span className="px-3 py-1 bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/40 text-[var(--color-primary)] font-extrabold text-xs sm:text-sm rounded-xl shadow-sm">
            Target: {exercise.target_weight}
          </span>
        )}

        {/* [ RIR 1 ] */}
        {exercise.rir_target && (
          <span className="px-3 py-1 bg-purple-500/15 border border-purple-500/40 text-purple-300 font-extrabold text-xs sm:text-sm rounded-xl shadow-sm">
            {exercise.rir_target.toUpperCase().includes('RIR') ? exercise.rir_target : `RIR ${exercise.rir_target}`}
          </span>
        )}

        {/* [ TUT: 3-1-1-0 ] */}
        {exercise.tut && (
          <span className="px-3 py-1 bg-amber-500/15 border border-amber-500/40 text-amber-300 font-extrabold text-xs sm:text-sm rounded-xl font-mono shadow-sm">
            TUT: {exercise.tut}
          </span>
        )}

        {/* [ Rec: 150s ] */}
        <span className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-200 font-extrabold font-mono shadow-sm">
          Rec: {exercise.rest_seconds}s
        </span>
      </div>

      {/* 3. Box Note Tecniche */}
      {cleanNotes && (
        <div className="mx-4 sm:mx-5 mb-4 p-3.5 sm:p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-200 text-sm sm:text-base leading-relaxed flex items-start gap-2.5 shadow-md shadow-amber-500/5">
          <span className="text-lg shrink-0 leading-none mt-0.5">💡</span>
          <p className="font-medium text-amber-100 flex-1">{cleanNotes}</p>
        </div>
      )}

      {/* Alternativa Consigliata se presente */}
      {exercise.alternative_exercise && (
        <div className="mx-4 sm:mx-5 mb-4 p-3 bg-slate-800/80 border border-slate-700/80 rounded-2xl text-xs sm:text-sm text-slate-300 flex items-center justify-between">
          <span className="text-xs font-extrabold uppercase text-slate-400">Alternativa consigliata:</span>
          <span className="font-bold text-white text-sm">{exercise.alternative_exercise}</span>
        </div>
      )}

      {/* 4. Tabella di Inserimento Dati (SET / REPS / KG / RPE) */}
      {isActive && (
        <div className="px-4 sm:px-6 pb-6 pt-4 border-t border-slate-800/80 bg-slate-900/40 space-y-4">
          {/* Header Tabella Sets */}
          <div className="grid grid-cols-12 gap-2.5 mb-1 text-xs sm:text-sm font-black text-slate-300 uppercase tracking-wider px-1 text-center border-b border-slate-800/80 pb-2">
            <div className="col-span-2">SET</div>
            <div className="col-span-3">REPS</div>
            <div className="col-span-3">KG</div>
            <div className="col-span-2">RPE</div>
            <div className="col-span-2">CONFERMA</div>
          </div>

          {/* Righe Tabella Sets con Feedback Visivo Completato */}
          <div className="space-y-3">
            {Array.from({ length: exercise.sets }).map((_, setIdx) => {
              const setLog = logs[setIdx] || { reps: '', weight: '', rpe: '' };
              const isSetCompleted = Boolean(completedSetsMap && completedSetsMap[setIdx]);

              return (
                <div
                  key={setIdx}
                  className={`grid grid-cols-12 gap-2.5 items-center rounded-2xl p-2.5 transition-all duration-200 border ${
                    isSetCompleted
                      ? 'bg-emerald-950/40 border-emerald-500/50 shadow-md shadow-emerald-500/5'
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
                      placeholder={exercise.reps_target}
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
                      placeholder="0"
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
                        <Check className="w-6 h-6 stroke-[2.5]" />
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

      {/* MODAL TUTORIAL VIDEO */}
      {showVideoModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl p-6 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">Tutorial Esecuzione: {exercise.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowVideoModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center space-y-3">
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Visualizza la tecnica corretta, l'impostazione degli appoggi e il setup per <strong>{exercise.name}</strong>.
              </p>
              <a
                href={`https://www.youtube.com/results?search_query=tutorial+esecuzione+${encodeURIComponent(exercise.name)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-500 text-white font-extrabold text-xs sm:text-sm hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20"
              >
                <Video className="w-4 h-4" />
                <span>Apri Tutorial Esercizio ↗</span>
              </a>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowVideoModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl hover:text-white cursor-pointer"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
