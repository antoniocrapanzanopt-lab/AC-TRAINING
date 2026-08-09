import React, { useState, useMemo } from 'react';
import {
  Plus, Search, Dumbbell, Pencil, Trash2, Video, AlertTriangle,
  Sparkles, Eye, ChevronDown, CheckCircle2, ShieldAlert,
  Filter, X,
} from 'lucide-react';
import { useExercises } from '../../context/ExercisesContext';
import { useToast } from '../../context/ToastContext';
import { ExerciseItem, ExerciseCategory, ExerciseType, MovementPlane, ResistanceCurve } from '../../types/exercise';
import { ExerciseModal } from '../../components/exercises/ExerciseModal';
import { ExerciseDetailModal } from '../../components/exercises/ExerciseDetailModal';
import { AIExerciseGeneratorModal } from '../../components/exercises/AIExerciseGeneratorModal';

const CATEGORIES: ('Tutti' | ExerciseCategory)[] = [
  'Tutti', 'Petto', 'Dorso', 'Gambe', 'Spalle', 'Bicipiti', 'Tricipiti', 'Addominali', 'Full Body', 'Cardio', 'Altro',
];

const EXERCISE_TYPE_OPTIONS: ('Tutti' | ExerciseType)[] = ['Tutti', 'Ipertrofia', 'Forza', 'Resistenza', 'Potenza', 'Mobilità'];
const PLANE_OPTIONS: ('Tutti' | MovementPlane)[] = ['Tutti', 'Sagittale', 'Frontale (scapolare)', 'Frontale', 'Trasverso', 'Multi-piano'];
const CURVE_OPTIONS: ('Tutti' | ResistanceCurve)[] = ['Tutti', 'Gravità (costante)', 'Ascendente', 'Discendente', 'Parabolica', 'Variabile (cam)', 'Costante (cavi)'];

export const ExercisesPage: React.FC = () => {
  const { exercises, loading, deleteExercise } = useExercises();
  const { showSuccess, showError } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'Tutti' | ExerciseCategory>('Tutti');
  const [selectedType, setSelectedType] = useState<'Tutti' | ExerciseType>('Tutti');
  const [selectedPlane, setSelectedPlane] = useState<'Tutti' | MovementPlane>('Tutti');
  const [selectedCurve, setSelectedCurve] = useState<'Tutti' | ResistanceCurve>('Tutti');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAIGeneratorOpen, setIsAIGeneratorOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<ExerciseItem | null>(null);
  const [viewingExercise, setViewingExercise] = useState<ExerciseItem | null>(null);
  const [deletingExercise, setDeletingExercise] = useState<ExerciseItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredExercises = useMemo(() => {
    return exercises.filter(ex => {
      const matchesSearch =
        ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ex.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ex.equipment.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ex.tipo && ex.tipo.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (ex.piano_movimento && ex.piano_movimento.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory = selectedCategory === 'Tutti' || ex.category === selectedCategory;
      const matchesType = selectedType === 'Tutti' || ex.tipo === selectedType;
      const matchesPlane = selectedPlane === 'Tutti' || ex.piano_movimento === selectedPlane;
      const matchesCurve = selectedCurve === 'Tutti' || ex.parametri_chiave?.curva_resistenza === selectedCurve;

      return matchesSearch && matchesCategory && matchesType && matchesPlane && matchesCurve;
    });
  }, [exercises, searchTerm, selectedCategory, selectedType, selectedPlane, selectedCurve]);

  const activeFilterCount = [
    selectedCategory !== 'Tutti',
    selectedType !== 'Tutti',
    selectedPlane !== 'Tutti',
    selectedCurve !== 'Tutti',
  ].filter(Boolean).length;

  const handleDelete = async () => {
    if (!deletingExercise) return;
    setIsDeleting(true);
    try {
      const { success, error } = await deleteExercise(deletingExercise.id);
      if (!success) throw new Error(error);
      showSuccess('Esercizio eliminato');
      setDeletingExercise(null);
    } catch (err: unknown) {
      showError('Errore eliminazione: ' + (err instanceof Error ? err.message : ''));
    } finally {
      setIsDeleting(false);
    }
  };

  const getTargetMuscle = (ex: ExerciseItem) => {
    return ex.muscoli_coinvolti?.find(m => m.ruolo === 'Target')?.muscolo;
  };

  return (
    <div className="space-y-6">
      {/* ── HEADER PRINCIPALE ─────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#090d14] p-6 rounded-2xl border border-slate-800/80 shadow-xl">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-black text-white tracking-tight">
              Libreria Esercizi
            </h1>
            <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full text-xs font-extrabold shadow-sm">
              {exercises.length} Esercizi
            </span>
            {filteredExercises.length !== exercises.length && (
              <span className="px-2.5 py-0.5 bg-sky-500/10 text-sky-400 border border-sky-500/30 rounded-full text-xs font-bold">
                {filteredExercises.length} visibili
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Banca dati biomeccanica completa per le schede di allenamento e l'IA esperta
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => setIsAIGeneratorOpen(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-amber-500/20"
          >
            <Sparkles className="w-4 h-4 text-black" />
            Generatore Batch IA
          </button>

          <button
            onClick={() => { setEditingExercise(null); setIsModalOpen(true); }}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 transition-all shadow-md"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            Nuovo Esercizio
          </button>
        </div>
      </div>

      {/* ── PANNELLO RICERCA & FILTRI ─────────────────────────────────────── */}
      <div className="bg-[#090d14] border border-slate-800/80 rounded-2xl p-5 space-y-4 shadow-xl">

        {/* Search bar con tasto cancella */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Cerca per nome, muscolo target, attrezzatura (es. 'Panca', 'Manubri', 'Deltoide')..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-3 bg-[#0d121c] border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/20 transition-all placeholder:text-slate-600 font-medium"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Pills Slider */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-700/60 border border-slate-700/40'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Accordion Filtri Avanzati */}
        <div className="pt-1">
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`flex items-center gap-2 text-xs font-bold transition-colors ${
              activeFilterCount > 0 ? 'text-amber-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Filtri Avanzati {activeFilterCount > 0 && `(${activeFilterCount} attivi)`}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
          </button>

          {showAdvancedFilters && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#0d121c] border border-slate-800 rounded-xl p-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tipo Stimolo</label>
                <select
                  value={selectedType}
                  onChange={e => setSelectedType(e.target.value as 'Tutti' | ExerciseType)}
                  className="w-full px-3 py-2 bg-[#090d14] border border-slate-700/60 rounded-lg text-white text-xs focus:outline-none focus:border-amber-500"
                >
                  {EXERCISE_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t === 'Tutti' ? '— Tutti i Tipi —' : t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Piano di Movimento</label>
                <select
                  value={selectedPlane}
                  onChange={e => setSelectedPlane(e.target.value as 'Tutti' | MovementPlane)}
                  className="w-full px-3 py-2 bg-[#090d14] border border-slate-700/60 rounded-lg text-white text-xs focus:outline-none focus:border-amber-500"
                >
                  {PLANE_OPTIONS.map(p => <option key={p} value={p}>{p === 'Tutti' ? '— Tutti i Piani —' : p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Curva di Resistenza</label>
                <select
                  value={selectedCurve}
                  onChange={e => setSelectedCurve(e.target.value as 'Tutti' | ResistanceCurve)}
                  className="w-full px-3 py-2 bg-[#090d14] border border-slate-700/60 rounded-lg text-white text-xs focus:outline-none focus:border-amber-500"
                >
                  {CURVE_OPTIONS.map(c => <option key={c} value={c}>{c === 'Tutti' ? '— Tutte le Curve —' : c}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── GRID ESERCIZI ─────────────────────────────────────────────────── */}
      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold">Caricamento libreria esercizi...</p>
        </div>
      ) : filteredExercises.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExercises.map(ex => {
            const targetMuscle = getTargetMuscle(ex);
            const hasStructuredData = !!(ex.muscoli_coinvolti?.length || ex.sicurezza || ex.parametri_chiave);

            return (
              <div
                key={ex.id}
                onClick={() => { setViewingExercise(ex); setIsDetailOpen(true); }}
                className="group relative bg-[#090d14] border border-slate-800/80 rounded-2xl p-5 hover:border-amber-500/40 hover:shadow-xl hover:shadow-amber-500/5 transition-all flex flex-col justify-between cursor-pointer overflow-hidden"
              >
                {/* Top accent bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500/0 via-amber-500/40 to-amber-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />

                <div>
                  {/* Category & Equipment badges */}
                  <div className="flex items-center justify-between mb-3 gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 text-[10px] font-extrabold uppercase tracking-wider rounded-lg border border-amber-500/20">
                        {ex.category}
                      </span>
                      {ex.tipo && (
                        <span className="px-2 py-0.5 bg-violet-500/10 text-violet-400 text-[10px] font-bold rounded-lg border border-violet-500/20">
                          {ex.tipo}
                        </span>
                      )}
                    </div>
                    <span className="px-2.5 py-1 bg-slate-800/80 text-slate-300 text-[10px] font-bold rounded-lg border border-slate-700/60">
                      {ex.equipment}
                    </span>
                  </div>

                  {/* Name */}
                  <h3 className="text-white font-extrabold text-base mb-2 group-hover:text-amber-400 transition-colors leading-snug">
                    {ex.name}
                  </h3>

                  {/* Target muscle & plane */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {targetMuscle && (
                      <span className="text-xs text-amber-400 font-bold flex items-center gap-1.5 bg-amber-500/5 px-2.5 py-1 rounded-lg border border-amber-500/15">
                        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                        {targetMuscle}
                      </span>
                    )}
                    {ex.piano_movimento && (
                      <span className="text-[11px] text-slate-400 font-semibold px-2 py-0.5 bg-slate-800/50 rounded-md">
                        {ex.piano_movimento}
                      </span>
                    )}
                  </div>

                  {/* Badges stato avanzato / sicurezza */}
                  <div className="flex items-center gap-3 pt-1 mb-2">
                    {hasStructuredData ? (
                      <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Scheda IA Avanzata
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 font-medium">
                        Scheda base (clicca per arricchire)
                      </span>
                    )}
                    {ex.sicurezza?.controindicazioni && ex.sicurezza.controindicazioni.length > 0 && (
                      <span className="text-[10px] text-red-400 font-bold flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3 text-red-400" /> {ex.sicurezza.controindicazioni.length} avvisi
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer azioni */}
                <div
                  className="pt-3 border-t border-slate-800/80 flex items-center justify-between mt-3"
                  onClick={e => e.stopPropagation()}
                >
                  {ex.video_url ? (
                    <a
                      href={ex.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      <Video className="w-3.5 h-3.5" /> Video Tutorial
                    </a>
                  ) : (
                    <span className="text-xs text-slate-600">Nessun video</span>
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setViewingExercise(ex); setIsDetailOpen(true); }}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-lg transition-colors"
                      title="Apri scheda dettagliata"
                    >
                      <Eye className="w-3.5 h-3.5" /> Vedi Scheda
                    </button>
                    <button
                      onClick={() => { setEditingExercise(ex); setIsModalOpen(true); }}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                      title="Modifica"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {ex.coach_id && (
                      <button
                        onClick={() => setDeletingExercise(ex)}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                        title="Elimina"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-[#090d14] border border-slate-800/80 rounded-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
            <Dumbbell className="w-8 h-8 text-amber-400" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Nessun esercizio trovato</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
            Nessun esercizio corrisponde ai criteri cercati. Prova a modificare i filtri o crea un nuovo esercizio!
          </p>
          <button
            onClick={() => { setEditingExercise(null); setIsModalOpen(true); }}
            className="px-4 py-2 bg-amber-500 text-black text-xs font-bold rounded-xl hover:bg-amber-400 transition-colors inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Crea Nuovo Esercizio
          </button>
        </div>
      )}

      {/* Modal Dettaglio Esercizio */}
      {isDetailOpen && viewingExercise && (
        <ExerciseDetailModal
          exercise={viewingExercise}
          onClose={() => { setIsDetailOpen(false); setViewingExercise(null); }}
          onEdit={() => {
            setIsDetailOpen(false);
            setEditingExercise(viewingExercise);
            setIsModalOpen(true);
          }}
        />
      )}

      {/* Modal Wizard Creazione / Modifica */}
      {isModalOpen && (
        <ExerciseModal
          initialExercise={editingExercise}
          onClose={() => { setIsModalOpen(false); setEditingExercise(null); }}
        />
      )}

      {/* Modal Eliminazione */}
      {deletingExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#090d14] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-3 bg-red-500/10 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Elimina Esercizio</h3>
                <p className="text-xs text-slate-400">Azione irreversibile</p>
              </div>
            </div>
            <p className="text-sm text-slate-300">
              Sei sicuro di voler eliminare <strong className="text-white">"{deletingExercise.name}"</strong>?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setDeletingExercise(null)} disabled={isDeleting} className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors">
                Annulla
              </button>
              <button onClick={handleDelete} disabled={isDeleting} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50">
                {isDeleting && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {isDeleting ? 'Eliminazione...' : 'Elimina'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Generatore Batch IA */}
      {isAIGeneratorOpen && (
        <AIExerciseGeneratorModal onClose={() => setIsAIGeneratorOpen(false)} />
      )}
    </div>
  );
};
