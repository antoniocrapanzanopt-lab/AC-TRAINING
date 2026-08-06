import React, { useState } from 'react';
import { X, Send, User } from 'lucide-react';
import { useAthletes } from '../../context/AthletesContext';
import { useWorkouts } from '../../context/WorkoutsContext';
import { useToast } from '../../context/ToastContext';
import { WorkoutTemplate } from '../../types/workout';

interface AssignWorkoutModalProps {
  workout: WorkoutTemplate;
  onClose: () => void;
}

export const AssignWorkoutModal: React.FC<AssignWorkoutModalProps> = ({ workout, onClose }) => {
  const { athletes } = useAthletes();
  const { assignWorkoutToAthlete } = useWorkouts();
  const { showSuccess, showError } = useToast();
  
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Filtra solo gli atleti attivi e in prova
  const activeAthletes = athletes.filter(a => a.status === 'active' || a.status === 'trial');

  const handleAssign = async () => {
    if (!selectedAthleteId) {
      showError('Seleziona un atleta a cui assegnare la scheda');
      return;
    }

    setIsAssigning(true);
    try {
      const { success, error } = await assignWorkoutToAthlete(selectedAthleteId, workout.id);
      if (!success) throw new Error(error);

      showSuccess('Scheda assegnata con successo!');
      onClose();
    } catch (err: any) {
      console.error(err);
      showError('Errore durante l\'assegnazione: ' + err.message);
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-panel-border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
              <Send className="w-5 h-5 text-[var(--color-primary)]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Assegna Scheda</h2>
              <p className="text-xs text-slate-400">Scegli a chi inviare il programma</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <div className="bg-slate-800/30 border border-slate-700/50 p-4 rounded-xl">
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Stai assegnando:</p>
            <p className="text-white font-bold">{workout.title}</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Seleziona Atleta</label>
            <div className="relative">
              <select
                value={selectedAthleteId}
                onChange={(e) => setSelectedAthleteId(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-[var(--color-primary)] transition-colors appearance-none"
              >
                <option value="">-- Seleziona --</option>
                {activeAthletes.map(athlete => (
                  <option key={athlete.id} value={athlete.id}>
                    {athlete.firstName} {athlete.lastName}
                  </option>
                ))}
              </select>
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </div>
            {activeAthletes.length === 0 && (
              <p className="text-xs text-red-400 mt-2">Non hai nessun atleta attivo o in prova al momento.</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-[var(--color-panel-border)] bg-slate-900/50 flex justify-end gap-3 rounded-b-2xl">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-slate-300 hover:text-white transition-colors"
          >
            Annulla
          </button>
          <button 
            onClick={handleAssign}
            disabled={isAssigning || !selectedAthleteId}
            className="flex items-center gap-2 px-5 py-2 bg-[var(--color-primary)] text-black text-sm font-bold rounded-xl hover:bg-[var(--color-primary-hover)] transition-all disabled:opacity-50"
          >
            {isAssigning ? (
              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {isAssigning ? 'Invio...' : 'Conferma e Assegna'}
          </button>
        </div>

      </div>
    </div>
  );
};
