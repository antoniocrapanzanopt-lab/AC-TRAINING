import React, { useState } from 'react';
import { Plus, Search, Dumbbell, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { useWorkouts } from '../../context/WorkoutsContext';
import { useToast } from '../../context/ToastContext';
import { WorkoutBuilderModal } from '../../components/workouts/WorkoutBuilderModal';
import { AssignWorkoutModal } from '../../components/workouts/AssignWorkoutModal';
import { WorkoutTemplate } from '../../types/workout';

export const WorkoutsPage: React.FC = () => {
  const { coachTemplates, deleteWorkoutTemplate } = useWorkouts();
  const { showSuccess, showError } = useToast();
  
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<WorkoutTemplate | null>(null);
  const [deletingWorkout, setDeletingWorkout] = useState<WorkoutTemplate | null>(null);
  const [assigningWorkout, setAssigningWorkout] = useState<WorkoutTemplate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTemplates = coachTemplates.filter(template => 
    template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async () => {
    if (!deletingWorkout) return;
    setIsDeleting(true);
    try {
      const { success, error } = await deleteWorkoutTemplate(deletingWorkout.id);
      if (!success) throw new Error(error);
      showSuccess('Scheda eliminata con successo!');
      setDeletingWorkout(null);
    } catch (err: any) {
      console.error(err);
      showError('Errore durante l\'eliminazione della scheda: ' + (err.message || ''));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Schede di Allenamento</h1>
          <p className="text-sm text-slate-400">Gestisci i tuoi template di allenamento</p>
        </div>
        
        <button 
          onClick={() => setIsBuilderOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-black text-sm font-bold rounded-xl hover:bg-[var(--color-primary-hover)] transition-all shadow-lg"
        >
          <Plus className="w-4 h-4" />
          Nuova Scheda
        </button>
      </div>

      <div className="bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cerca tra i tuoi programmi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-xl text-sm text-white focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>
        </div>

        {filteredTemplates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map(template => (
              <div key={template.id} className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5 hover:border-[var(--color-primary)]/50 transition-colors group">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 bg-[var(--color-primary)]/10 rounded-lg">
                    <Dumbbell className="w-5 h-5 text-[var(--color-primary)]" />
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 bg-slate-800 rounded-md text-slate-300">
                    {new Date(template.created_at).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-white font-bold text-lg mb-1">{template.title}</h3>
                <p className="text-sm text-slate-400 line-clamp-2 min-h-[40px]">
                  {template.description || 'Nessuna descrizione'}
                </p>
                <div className="mt-4 pt-4 border-t border-slate-700/50 flex justify-between items-center">
                   <div className="flex items-center gap-1">
                     <button 
                       onClick={() => setEditingWorkout(template)}
                       className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
                       title="Modifica scheda"
                     >
                       <Pencil className="w-3.5 h-3.5 text-slate-400" />
                       <span>Modifica</span>
                     </button>
                     <button 
                       onClick={() => setDeletingWorkout(template)}
                       className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700/50 rounded-lg transition-colors"
                       title="Elimina scheda"
                     >
                       <Trash2 className="w-3.5 h-3.5" />
                     </button>
                   </div>

                   <button 
                     onClick={() => setAssigningWorkout(template)}
                     className="px-3 py-1.5 bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
                   >
                     Assegna
                   </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4 border border-slate-700/50">
              <Dumbbell className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Nessuna scheda trovata</h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">
              Non hai ancora creato nessun programma di allenamento oppure la tua ricerca non ha prodotto risultati.
            </p>
          </div>
        )}
      </div>

      {isBuilderOpen && (
        <WorkoutBuilderModal
          athleteId="" // Stringa vuota indica che stiamo creando un template generico
          onClose={() => setIsBuilderOpen(false)}
        />
      )}

      {editingWorkout && (
        <WorkoutBuilderModal
          initialWorkout={editingWorkout}
          onClose={() => setEditingWorkout(null)}
        />
      )}

      {assigningWorkout && (
        <AssignWorkoutModal
          workout={assigningWorkout}
          onClose={() => setAssigningWorkout(null)}
        />
      )}

      {/* Modal di conferma eliminazione */}
      {deletingWorkout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-3 bg-red-500/10 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Elimina Scheda</h3>
                <p className="text-xs text-slate-400">Questa azione non può essere annullata</p>
              </div>
            </div>

            <p className="text-sm text-slate-300">
              Sei sicuro di voler eliminare la scheda <strong className="text-white">"{deletingWorkout.title}"</strong>?
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={() => setDeletingWorkout(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white transition-colors"
              >
                Annulla
              </button>
              <button 
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isDeleting && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {isDeleting ? 'Eliminazione...' : 'Elimina Definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
