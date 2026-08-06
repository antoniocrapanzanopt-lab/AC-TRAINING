import React, { useState } from 'react';
import { Plus, Search, Dumbbell, FileText } from 'lucide-react';
import { useWorkouts } from '../../context/WorkoutsContext';
import { WorkoutBuilderModal } from '../../components/workouts/WorkoutBuilderModal';
import { AssignWorkoutModal } from '../../components/workouts/AssignWorkoutModal';
import { WorkoutTemplate } from '../../types/workout';

export const WorkoutsPage: React.FC = () => {
  const { coachTemplates } = useWorkouts();
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [assigningWorkout, setAssigningWorkout] = useState<WorkoutTemplate | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTemplates = coachTemplates.filter(template => 
    template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                   <button className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1">
                     <FileText className="w-3.5 h-3.5" /> Vedi Dettagli
                   </button>
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
          athleteId="" // Stringa vuota indica che stiamo creando un template generico, non per un atleta specifico
          onClose={() => setIsBuilderOpen(false)}
        />
      )}

      {assigningWorkout && (
        <AssignWorkoutModal
          workout={assigningWorkout}
          onClose={() => setAssigningWorkout(null)}
        />
      )}
    </div>
  );
};
