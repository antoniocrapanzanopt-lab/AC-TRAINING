import React, { useState } from 'react';
import { X, Plus, Save, Trash2, GripVertical, Dumbbell } from 'lucide-react';
import { WorkoutExercise } from '../../types/workout';
import { useWorkouts } from '../../context/WorkoutsContext';
import { useToast } from '../../context/ToastContext';

interface WorkoutBuilderModalProps {
  athleteId: string;
  onClose: () => void;
}

export const WorkoutBuilderModal: React.FC<WorkoutBuilderModalProps> = ({ athleteId, onClose }) => {
  const { createWorkoutTemplate, assignWorkoutToAthlete } = useWorkouts();
  const { showSuccess, showError } = useToast();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [exercises, setExercises] = useState<Partial<WorkoutExercise>[]>([
    { name: '', sets: 3, reps_target: '10', rest_seconds: 60 }
  ]);
  const [isSaving, setIsSaving] = useState(false);

  const addExercise = () => {
    setExercises([...exercises, { name: '', sets: 3, reps_target: '10', rest_seconds: 60 }]);
  };

  const updateExercise = (index: number, field: keyof WorkoutExercise, value: any) => {
    const newEx = [...exercises];
    newEx[index] = { ...newEx[index], [field]: value };
    setExercises(newEx);
  };

  const removeExercise = (index: number) => {
    if (exercises.length === 1) return;
    const newEx = exercises.filter((_, i) => i !== index);
    setExercises(newEx);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      showError('Inserisci un titolo per la scheda');
      return;
    }
    
    // Verifica che gli esercizi abbiano almeno un nome
    const validExercises = exercises.filter(ex => ex.name?.trim() !== '');
    if (validExercises.length === 0) {
      showError('Inserisci almeno un esercizio valido');
      return;
    }

    setIsSaving(true);

    try {
      // 1. Creiamo la scheda base (salvandola come template per il coach)
      const { success, error, workoutId } = await createWorkoutTemplate(
        { title, description, is_template: false }, 
        validExercises
      );

      if (!success) throw new Error(error);

      // 2. L'assegniamo all'atleta (ho modificato il context per ritornare l'id)
      if (workoutId) {
        await assignWorkoutToAthlete(athleteId, workoutId);
      }
      
      showSuccess('Scheda creata e assegnata con successo!');
      onClose();
    } catch (err) {
      console.error(err);
      showError('Errore durante il salvataggio della scheda');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl shadow-2xl flex flex-col h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-panel-border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-[var(--color-primary)]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Costruttore Scheda</h2>
              <p className="text-sm text-slate-400">Assegna un nuovo allenamento all'atleta</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Info Generali */}
          <div className="space-y-4 bg-slate-800/30 p-5 rounded-xl border border-slate-700/50">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">Titolo della Scheda</label>
              <input
                type="text"
                placeholder="es. Forza Massimale - Giorno A"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">Descrizione (Opzionale)</label>
              <textarea
                placeholder="Note generali per l'atleta su questa scheda..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-[var(--color-primary)] transition-colors resize-none"
              />
            </div>
          </div>

          {/* Griglia Esercizi */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Esercizi</h3>
              <button 
                onClick={addExercise}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Aggiungi
              </button>
            </div>

            <div className="space-y-3">
              {exercises.map((ex, index) => (
                <div key={index} className="flex flex-col sm:flex-row gap-3 bg-slate-800/30 p-3 rounded-xl border border-slate-700/50 items-start sm:items-center">
                  <div className="cursor-move p-2 text-slate-500 hover:text-white hidden sm:block">
                    <GripVertical className="w-4 h-4" />
                  </div>
                  
                  <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-5">
                      <input
                        type="text"
                        placeholder="Nome esercizio (es. Panca Piana)"
                        value={ex.name}
                        onChange={e => updateExercise(index, 'name', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-[var(--color-primary)]"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <div className="flex items-center border border-slate-700 rounded-lg overflow-hidden bg-slate-900">
                        <span className="px-2 text-xs text-slate-500 font-semibold border-r border-slate-700 bg-slate-800/50">Set</span>
                        <input
                          type="number"
                          value={ex.sets}
                          onChange={e => updateExercise(index, 'sets', parseInt(e.target.value) || 1)}
                          className="w-full px-2 py-2 bg-transparent text-sm text-white focus:outline-none text-center"
                          min="1"
                        />
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <div className="flex items-center border border-slate-700 rounded-lg overflow-hidden bg-slate-900">
                        <span className="px-2 text-xs text-slate-500 font-semibold border-r border-slate-700 bg-slate-800/50">Rep</span>
                        <input
                          type="text"
                          placeholder="8-10"
                          value={ex.reps_target}
                          onChange={e => updateExercise(index, 'reps_target', e.target.value)}
                          className="w-full px-2 py-2 bg-transparent text-sm text-white focus:outline-none text-center"
                        />
                      </div>
                    </div>
                    <div className="sm:col-span-3">
                      <div className="flex items-center border border-slate-700 rounded-lg overflow-hidden bg-slate-900">
                        <span className="px-2 text-xs text-slate-500 font-semibold border-r border-slate-700 bg-slate-800/50">Rec.</span>
                        <input
                          type="number"
                          placeholder="Sec"
                          value={ex.rest_seconds}
                          onChange={e => updateExercise(index, 'rest_seconds', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-2 bg-transparent text-sm text-white focus:outline-none text-center"
                          min="0"
                        />
                        <span className="px-2 text-xs text-slate-500 font-semibold border-l border-slate-700 bg-slate-800/50">s</span>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => removeExercise(index)}
                    disabled={exercises.length === 1}
                    className="p-2 text-slate-500 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded-lg"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--color-panel-border)] bg-slate-900/50 flex justify-end gap-3 rounded-b-2xl">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-slate-300 hover:text-white transition-colors"
          >
            Annulla
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-[var(--color-primary)] text-black text-sm font-bold rounded-xl hover:bg-[var(--color-primary-hover)] transition-all disabled:opacity-50"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isSaving ? 'Salvataggio...' : 'Salva e Assegna'}
          </button>
        </div>

      </div>
    </div>
  );
};
