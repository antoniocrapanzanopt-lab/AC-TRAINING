import React from 'react';
import { X, History, Dumbbell, Award, Calendar, Zap } from 'lucide-react';
import { PreviousExerciseHistory, PastSessionHistoryEntry } from '../../utils/workoutHistoryResolver';

interface ExerciseHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseName: string;
  history?: PreviousExerciseHistory;
  onApplySessionLoads?: (session: PastSessionHistoryEntry) => void;
}

export const ExerciseHistoryModal: React.FC<ExerciseHistoryModalProps> = ({
  isOpen,
  onClose,
  exerciseName,
  history,
  onApplySessionLoads,
}) => {
  if (!isOpen) return null;

  const pastSessions = history?.allPastSessions || [];

  // Calcolo miglior carico mai registrato su questo esercizio
  let maxWeightKg = 0;
  let maxRepsAtMaxWeight = 0;

  pastSessions.forEach((sess) => {
    sess.sets.forEach((s) => {
      const w = s.weightKg || 0;
      const r = s.reps || 0;
      if (w > maxWeightKg || (w === maxWeightKg && r > maxRepsAtMaxWeight)) {
        maxWeightKg = w;
        maxRepsAtMaxWeight = r;
      }
    });
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 font-sans">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 block">
                Storico Prestazioni Esercizio
              </span>
              <h3 className="text-base sm:text-lg font-black text-white truncate">
                {exerciseName}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Overview KPI / Record Badge */}
        {maxWeightKg > 0 && (
          <div className="px-4 sm:px-5 pt-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/30 via-slate-950 to-slate-950 border border-amber-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Award className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Miglior Carico Storico</span>
                  <span className="text-sm font-black text-white">
                    {maxWeightKg} kg <span className="text-xs font-normal text-slate-400">× {maxRepsAtMaxWeight} reps</span>
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-black">
                {pastSessions.length} sessioni registrate
              </span>
            </div>
          </div>
        )}

        {/* Sessions List */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1">
          {pastSessions.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Dumbbell className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-300">Nessuna sessione precedente trovata</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Questo esercizio non è mai stato completato in precedenza da questo atleta. I carichi verranno salvati alla fine di questa sessione.
              </p>
            </div>
          ) : (
            pastSessions.map((sess, idx) => (
              <div
                key={sess.sessionId || idx}
                className={`p-4 rounded-2xl border transition-all ${
                  idx === 0
                    ? 'bg-slate-950/80 border-blue-500/40 shadow-lg shadow-blue-500/5'
                    : 'bg-slate-950/50 border-slate-800/80'
                }`}
              >
                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-black text-white">{sess.formattedDate}</span>
                    {idx === 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[9px] font-black border border-blue-500/30">
                        Ultima Volta
                      </span>
                    )}
                  </div>

                  {onApplySessionLoads && (
                    <button
                      type="button"
                      onClick={() => {
                        onApplySessionLoads(sess);
                        onClose();
                      }}
                      className="px-2.5 py-1 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 hover:text-white border border-blue-500/30 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                    >
                      <Zap className="w-3 h-3" />
                      <span>Applica questi carichi</span>
                    </button>
                  )}
                </div>

                {/* Tabella Serie */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {sess.sets.map((s, sIdx) => (
                    <div
                      key={sIdx}
                      className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-center space-y-0.5"
                    >
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">
                        Set {s.setNumber}
                      </span>
                      <span className="text-xs font-black text-[var(--color-primary)] block font-mono">
                        {s.weightKg || 0} kg
                      </span>
                      <span className="text-[10px] font-medium text-slate-300 block">
                        {s.reps || 0} reps
                      </span>
                    </div>
                  ))}
                </div>

                {/* Note della sessione se presenti */}
                {sess.notes && (
                  <p className="text-[11px] text-slate-400 italic mt-2.5 pt-2 border-t border-slate-800/40">
                    "{sess.notes}"
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer Modal */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
