import React, { useState } from 'react';
import { Plus, Search, Dumbbell, Pencil, Trash2, Video, AlertTriangle, ExternalLink, Info, Sparkles } from 'lucide-react';
import { useExercises } from '../../context/ExercisesContext';
import { useToast } from '../../context/ToastContext';
import { ExerciseItem, ExerciseCategory } from '../../types/exercise';
import { ExerciseModal } from '../../components/exercises/ExerciseModal';
import { AIExerciseGeneratorModal } from '../../components/exercises/AIExerciseGeneratorModal';

const CATEGORIES: ('Tutti' | ExerciseCategory)[] = [
  'Tutti',
  'Petto',
  'Dorso',
  'Gambe',
  'Spalle',
  'Bicipiti',
  'Tricipiti',
  'Addominali',
  'Full Body',
  'Cardio',
  'Altro',
];

export const ExercisesPage: React.FC = () => {
  const { exercises, loading, deleteExercise } = useExercises();
  const { showSuccess, showError } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'Tutti' | ExerciseCategory>('Tutti');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAIGeneratorOpen, setIsAIGeneratorOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<ExerciseItem | null>(null);
  const [deletingExercise, setDeletingExercise] = useState<ExerciseItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredExercises = exercises.filter(ex => {
    const matchesSearch = ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ex.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ex.equipment.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'Tutti' || ex.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleDelete = async () => {
    if (!deletingExercise) return;
    setIsDeleting(true);
    try {
      const { success, error } = await deleteExercise(deletingExercise.id);
      if (!success) throw new Error(error);
      showSuccess('Esercizio eliminato con successo!');
      setDeletingExercise(null);
    } catch (err: any) {
      console.error(err);
      showError('Errore durante l\'eliminazione: ' + (err.message || ''));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            Libreria Esercizi
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold">
              {exercises.length} Esercizi Registrati
            </span>
          </h1>
          <p className="text-sm text-slate-400">Gestisci la tua banca dati o popola la libreria automaticamente con Gemini 3.6 Flash</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => setIsAIGeneratorOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-sm font-extrabold rounded-xl transition-all shadow-lg shadow-amber-500/20"
          >
            <Sparkles className="w-4 h-4 text-black" />
            Genera con IA
          </button>

          <button
            onClick={() => {
              setEditingExercise(null);
              setIsModalOpen(true);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-xl border border-slate-700 transition-all"
          >
            <Plus className="w-4 h-4" />
            Nuovo Esercizio
          </button>
        </div>
      </div>

      {/* Main Panel */}
      <div className="bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl p-4 sm:p-6 space-y-6">
        
        {/* Search & Category Filter Pills */}
        <div className="space-y-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cerca per nome, gruppo muscolare o attrezzatura..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-xl text-sm text-white focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${selectedCategory === cat ? 'bg-[var(--color-primary)] text-black' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Exercises Grid */}
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <div className="w-10 h-10 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold">Caricamento libreria esercizi...</p>
          </div>
        ) : filteredExercises.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredExercises.map(ex => (
              <div key={ex.id} className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5 hover:border-[var(--color-primary)]/40 transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <span className="px-2.5 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-bold rounded-md">
                      {ex.category}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] font-mono rounded">
                      {ex.equipment}
                    </span>
                  </div>

                  <h3 className="text-white font-bold text-base mb-2 group-hover:text-[var(--color-primary)] transition-colors">
                    {ex.name}
                  </h3>

                  {ex.instructions && (
                    <div className="flex gap-1.5 items-start text-xs text-slate-400 mb-3 bg-slate-900/40 p-2.5 rounded-lg">
                      <Info className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                      <p className="line-clamp-2 leading-relaxed">{ex.instructions}</p>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-700/50 flex items-center justify-between mt-2">
                  {ex.video_url ? (
                    <a
                      href={ex.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <Video className="w-3.5 h-3.5" /> Video Tutorial <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-xs text-slate-600">Nessun video</span>
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingExercise(ex);
                        setIsModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                      title="Modifica"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    {/* Mostra il cestino se è un esercizio creato dal coach (ha coach_id) */}
                    {ex.coach_id && (
                      <button
                        onClick={() => setDeletingExercise(ex)}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700/50 rounded-lg transition-colors"
                        title="Elimina"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4 border border-slate-700/50">
              <Dumbbell className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Nessun esercizio trovato</h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">
              Non sono stati trovati esercizi corrispondenti ai filtri di ricerca selezionati.
            </p>
          </div>
        )}

      </div>

      {/* Modal Creazione / Modifica */}
      {isModalOpen && (
        <ExerciseModal
          initialExercise={editingExercise}
          onClose={() => {
            setIsModalOpen(false);
            setEditingExercise(null);
          }}
        />
      )}

      {/* Modal Conferma Eliminazione */}
      {deletingExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-3 bg-red-500/10 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Elimina Esercizio</h3>
                <p className="text-xs text-slate-400">Questa azione non può essere annullata</p>
              </div>
            </div>

            <p className="text-sm text-slate-300">
              Sei sicuro di voler eliminare l'esercizio <strong className="text-white">"{deletingExercise.name}"</strong> dalla tua libreria?
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDeletingExercise(null)}
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

      {/* Modal Generatore Esercizi IA */}
      {isAIGeneratorOpen && (
        <AIExerciseGeneratorModal
          onClose={() => setIsAIGeneratorOpen(false)}
        />
      )}
    </div>
  );
};
