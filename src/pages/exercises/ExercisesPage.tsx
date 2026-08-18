import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Plus,
  Search,
  Dumbbell,
  Pencil,
  Trash2,
  Video,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  Filter,
  X,
  List,
  LayoutGrid,
  MoreVertical,
  ExternalLink,
  Layers,
  Check,
} from 'lucide-react';
import { useExercises } from '../../context/ExercisesContext';
import { useToast } from '../../context/ToastContext';
import {
  ExerciseItem,
  ExerciseCategory,
  ExerciseType,
  MovementPlane,
  ExerciseEquipment,
  Bilaterality,
  ExerciseRole,
  SystemicCost,
  ExerciseDifficulty,
} from '../../types/exercise';
import { ExerciseModal } from '../../components/exercises/ExerciseModal';
import { ExerciseDetailDrawer } from '../../components/exercises/ExerciseDetailDrawer';
import { AIExerciseGeneratorModal } from '../../components/exercises/AIExerciseGeneratorModal';

// ─── Gruppi Macro per il Menu a Tendina dei Distretti ───────────────────────────

const DISTRICT_GROUPS: { label: string; items: ExerciseCategory[] }[] = [
  {
    label: 'Parte Superiore',
    items: ['Petto', 'Dorso', 'Spalle', 'Bicipiti', 'Tricipiti', 'Avambracci'],
  },
  {
    label: 'Parte Inferiore',
    items: ['Quadricipiti', 'Femorali', 'Glutei', 'Polpacci'],
  },
  {
    label: 'Tronco & Core',
    items: ['Addome', 'Core', 'Lombari'],
  },
  {
    label: 'Globale & Cardio',
    items: ['Full Body', 'Conditioning'],
  },
];


const EQUIPMENT_OPTIONS: ('Tutti' | ExerciseEquipment)[] = [
  'Tutti', 'Bilanciere', 'Manubri', 'Macchina', 'Cavi', 'Corpo Libero', 'Multipower', 'Kettlebell', 'Elastici', 'Trap Bar', 'Slitta', 'Cardio Machine', 'Altro',
];

const PATTERN_OPTIONS = [
  'Tutti',
  'Squat / Accosciata',
  'Hinge / Cerniera d\'Anca',
  'Spinta Orizzontale',
  'Spinta Verticale',
  'Trazione Orizzontale',
  'Trazione Verticale',
  'Affondo / Split',
  'Flessione / Estensione',
  'Abduzione / Adduzione',
  'Flessione Gomito',
  'Estensione Gomito',
  'Core Anti-Movimento',
  'Trasporto / Carico',
];

const ROLE_OPTIONS: ('Tutti' | ExerciseRole)[] = [
  'Tutti', 'Fondamentale', 'Complementare', 'Isolamento', 'Tecnico', 'Prehab / Riabilitativo',
];

const COST_OPTIONS: ('Tutti' | SystemicCost)[] = [
  'Tutti', 'Molto Alto', 'Alto', 'Medio', 'Basso', 'Molto Basso',
];

const DIFFICULTY_OPTIONS: ('Tutti' | ExerciseDifficulty)[] = [
  'Tutti', 'Principiante', 'Intermedio', 'Avanzato',
];

const EXERCISE_TYPE_OPTIONS: ('Tutti' | ExerciseType)[] = [
  'Tutti', 'Forza', 'Ipertrofia', 'Resistenza', 'Potenza', 'Mobilità', 'Condizionamento',
];

const PLANE_OPTIONS: ('Tutti' | MovementPlane)[] = [
  'Tutti', 'Sagittale', 'Frontale (scapolare)', 'Frontale', 'Trasverso', 'Multi-piano',
];

type SchedaFilterType = 'Tutti' | 'ai_avanzata' | 'base' | 'coach';
type VideoFilterType = 'Tutti' | 'con_video' | 'senza_video';

// ─── Menu Overflow per Riga / Card ───────────────────────────────────────────

interface RowMenuProps {
  exercise: ExerciseItem;
  onOpen: () => void;
  onEdit: () => void;
  onDelete?: () => void;
}

const RowMenu: React.FC<RowMenuProps> = ({ exercise, onOpen, onEdit, onDelete }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const act = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(false);
    fn();
  };

  return (
    <div className="relative" ref={ref} onClick={e => e.stopPropagation()}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${open ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}
        title="Azioni esercizio"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-30 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <button
            onClick={act(onOpen)}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors text-left cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            <span>Vedi Scheda</span>
          </button>
          <button
            onClick={act(onEdit)}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors text-left cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5 text-slate-400" />
            <span>Modifica</span>
          </button>
          {exercise.video_url && (
            <a
              href={exercise.video_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-blue-400 hover:bg-slate-800 transition-colors text-left cursor-pointer"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Guarda Video</span>
            </a>
          )}
          {onDelete && (
            <>
              <div className="border-t border-slate-800 my-1" />
              <button
                onClick={act(onDelete)}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors text-left cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Elimina</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Pagina Principale ─────────────────────────────────────────────────────────

export const ExercisesPage: React.FC = () => {
  const { exercises, loading, deleteExercise } = useExercises();
  const { showSuccess, showError } = useToast();

  // ─── Visualizzazione & Ricerca ──────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [searchTerm, setSearchTerm] = useState('');

  // ─── Menu a Tendina Distretti ────────────────────────────────────────────────
  const [isDistrictMenuOpen, setIsDistrictMenuOpen] = useState(false);
  const districtMenuRef = useRef<HTMLDivElement>(null);

  // ─── Filtri ─────────────────────────────────────────────────────────────────
  const [selectedCategory, setSelectedCategory] = useState<'Tutti' | ExerciseCategory>('Tutti');
  const [selectedPattern, setSelectedPattern] = useState<string>('Tutti');
  const [selectedRole, setSelectedRole] = useState<'Tutti' | ExerciseRole>('Tutti');
  const [selectedEquipment, setSelectedEquipment] = useState<'Tutti' | ExerciseEquipment>('Tutti');
  const [selectedCost, setSelectedCost] = useState<'Tutti' | SystemicCost>('Tutti');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'Tutti' | ExerciseDifficulty>('Tutti');
  const [selectedType, setSelectedType] = useState<'Tutti' | ExerciseType>('Tutti');
  const [selectedPlane, setSelectedPlane] = useState<'Tutti' | MovementPlane>('Tutti');
  const [selectedScheda, setSelectedScheda] = useState<SchedaFilterType>('Tutti');
  const [selectedVideo, setSelectedVideo] = useState<VideoFilterType>('Tutti');
  const [selectedBilaterality, setSelectedBilaterality] = useState<'Tutti' | Bilaterality>('Tutti');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // ─── Drawer & Modali ────────────────────────────────────────────────────────
  const [drawerExercise, setDrawerExercise] = useState<ExerciseItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAIGeneratorOpen, setIsAIGeneratorOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<ExerciseItem | null>(null);
  const [deletingExercise, setDeletingExercise] = useState<ExerciseItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Chiusura automatica del menu distretti al click fuori
  useEffect(() => {
    if (!isDistrictMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (districtMenuRef.current && !districtMenuRef.current.contains(e.target as Node)) {
        setIsDistrictMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isDistrictMenuOpen]);

  // ─── Conteggio Esercizi per Distretto ───────────────────────────────────────
  const countByCategory = useMemo(() => {
    const map = new Map<string, number>();
    exercises.forEach(ex => {
      map.set(ex.category, (map.get(ex.category) || 0) + 1);
    });
    return map;
  }, [exercises]);

  // ─── Helper Muscolo Target ──────────────────────────────────────────────────
  const getTargetMuscle = (ex: ExerciseItem) => {
    return ex.target_specifico || ex.muscoli_coinvolti?.find(m => m.ruolo === 'Target')?.muscolo;
  };

  // ─── Filtro Esercizi ────────────────────────────────────────────────────────
  const filteredExercises = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();

    return exercises.filter(ex => {
      // 1. Ricerca testo
      if (q) {
        const targetMuscle = (getTargetMuscle(ex) || '').toLowerCase();
        const haystack = `${ex.name} ${ex.category} ${ex.target_specifico || ''} ${ex.pattern_movimento || ''} ${ex.equipment} ${ex.tipo || ''} ${targetMuscle}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      // 2. Categoria / Distretto
      if (selectedCategory !== 'Tutti' && ex.category !== selectedCategory) return false;

      // 3. Pattern Movimento
      if (selectedPattern !== 'Tutti' && ex.pattern_movimento !== selectedPattern) return false;

      // 4. Ruolo
      if (selectedRole !== 'Tutti' && ex.ruolo_esercizio !== selectedRole) return false;

      // 5. Attrezzatura
      if (selectedEquipment !== 'Tutti' && ex.equipment !== selectedEquipment) return false;

      // 6. Costo Sistemico
      if (selectedCost !== 'Tutti' && ex.costo_sistemico !== selectedCost) return false;

      // 7. Difficoltà
      if (selectedDifficulty !== 'Tutti' && ex.livello_difficolta !== selectedDifficulty) return false;

      // 8. Tipo Stimolo
      if (selectedType !== 'Tutti' && ex.tipo !== selectedType) return false;

      // 9. Piano Movimento
      if (selectedPlane !== 'Tutti' && ex.piano_movimento !== selectedPlane) return false;

      // 10. Bilateralità
      if (selectedBilaterality !== 'Tutti' && ex.bilateralita !== selectedBilaterality) return false;

      // 11. Video
      if (selectedVideo === 'con_video' && !ex.video_url) return false;
      if (selectedVideo === 'senza_video' && ex.video_url) return false;

      return true;
    });
  }, [
    exercises,
    searchTerm,
    selectedCategory,
    selectedPattern,
    selectedRole,
    selectedEquipment,
    selectedCost,
    selectedDifficulty,
    selectedType,
    selectedPlane,
    selectedBilaterality,
    selectedVideo,
  ]);

  // Conteggio filtri avanzati attivi
  const activeAdvancedCount = [
    selectedPattern !== 'Tutti',
    selectedRole !== 'Tutti',
    selectedEquipment !== 'Tutti',
    selectedCost !== 'Tutti',
    selectedDifficulty !== 'Tutti',
    selectedType !== 'Tutti',
    selectedPlane !== 'Tutti',
    selectedBilaterality !== 'Tutti',
    selectedScheda !== 'Tutti',
    selectedVideo !== 'Tutti',
  ].filter(Boolean).length;

  const hasAnyFilter = activeAdvancedCount > 0 || selectedCategory !== 'Tutti' || searchTerm.trim() !== '';

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedCategory('Tutti');
    setSelectedPattern('Tutti');
    setSelectedRole('Tutti');
    setSelectedEquipment('Tutti');
    setSelectedCost('Tutti');
    setSelectedDifficulty('Tutti');
    setSelectedType('Tutti');
    setSelectedPlane('Tutti');
    setSelectedBilaterality('Tutti');
    setSelectedScheda('Tutti');
    setSelectedVideo('Tutti');
  };

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleOpenDrawer = (ex: ExerciseItem) => {
    setDrawerExercise(ex);
    setIsDrawerOpen(true);
  };

  const handleEdit = (ex: ExerciseItem) => {
    setIsDrawerOpen(false);
    setEditingExercise(ex);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingExercise) return;
    setIsDeleting(true);
    try {
      const { success, error } = await deleteExercise(deletingExercise.id);
      if (!success) throw new Error(error);
      showSuccess('Esercizio eliminato');
      if (drawerExercise?.id === deletingExercise.id) {
        setIsDrawerOpen(false);
        setDrawerExercise(null);
      }
      setDeletingExercise(null);
    } catch (err: unknown) {
      showError('Errore eliminazione: ' + (err instanceof Error ? err.message : ''));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">

      {/* ── HEADER PRINCIPALE ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[var(--color-panel)] border border-[var(--color-panel-border)] p-5 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-white tracking-tight">
              Libreria Esercizi
            </h1>
            <span className="px-2.5 py-0.5 bg-amber-500/10 text-[var(--color-primary)] border border-amber-500/20 rounded-full text-xs font-black">
              {exercises.length}
            </span>
            {filteredExercises.length !== exercises.length && (
              <span className="px-2 py-0.5 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-full text-xs font-bold">
                {filteredExercises.length} visibili
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Database biomeccanico per la creazione e programmazione schede
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setIsAIGeneratorOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 hover:text-white border border-purple-500/30 text-xs font-bold rounded-xl transition-all cursor-pointer"
            title="Genera pacchetti di esercizi con l'IA"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Batch IA</span>
          </button>

          <button
            onClick={() => { setEditingExercise(null); setIsModalOpen(true); }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-black text-xs font-black rounded-xl transition-all shadow-md shadow-[var(--color-primary)]/15 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuovo Esercizio</span>
          </button>
        </div>
      </div>

      {/* ── BARRA RICERCA & CONTROLLI (TOOLBAR PULITA) ─────────────────────── */}
      <div className="bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl p-4 space-y-3 shadow-xl">

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Cerca per nome, target specifico, pattern (es. Panca, Clavicolare, Cavi)…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-[var(--color-primary)] transition-all font-medium"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer"
                title="Cancella ricerca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">

            {/* ── MENU A TENDINA DEDICATO PER I DISTRETTI ───────────────────── */}
            <div className="relative" ref={districtMenuRef}>
              <button
                onClick={() => setIsDistrictMenuOpen(!isDistrictMenuOpen)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  selectedCategory !== 'Tutti'
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/15 text-[var(--color-primary)] shadow-sm'
                    : 'border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title="Seleziona distretto muscolare"
              >
                <Dumbbell className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {selectedCategory === 'Tutti' ? 'Tutti i Distretti' : selectedCategory}
                </span>
                {selectedCategory !== 'Tutti' && (
                  <span className="px-1.5 py-0.2 bg-[var(--color-primary)] text-black font-black text-[10px] rounded-full">
                    {countByCategory.get(selectedCategory) || 0}
                  </span>
                )}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isDistrictMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu Distretti */}
              {isDistrictMenuOpen && (
                <div className="absolute right-0 sm:left-0 top-full mt-2 w-72 bg-[#0d121c] border border-slate-700/80 rounded-2xl shadow-2xl z-40 p-2 overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-[75vh] overflow-y-auto custom-scrollbar">
                  
                  {/* Opzione: Tutti */}
                  <button
                    onClick={() => { setSelectedCategory('Tutti'); setIsDistrictMenuOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer mb-1 ${
                      selectedCategory === 'Tutti'
                        ? 'bg-[var(--color-primary)] text-black'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5" />
                      <span>Tutti i Distretti</span>
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                      selectedCategory === 'Tutti' ? 'bg-black/20 text-black' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {exercises.length}
                    </span>
                  </button>

                  {/* Gruppi Macro */}
                  {DISTRICT_GROUPS.map((grp, gIdx) => (
                    <div key={gIdx} className="pt-2 border-t border-slate-800/80 mt-1">
                      <span className="px-3 text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">
                        {grp.label}
                      </span>
                      <div className="space-y-0.5">
                        {grp.items.map(cat => {
                          const count = countByCategory.get(cat) || 0;
                          const isSel = selectedCategory === cat;
                          return (
                            <button
                              key={cat}
                              onClick={() => { setSelectedCategory(cat); setIsDistrictMenuOpen(false); }}
                              className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                                isSel
                                  ? 'bg-[var(--color-primary)] text-black font-black'
                                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {isSel && <Check className="w-3 h-3 text-black font-black" />}
                                <span className={isSel ? 'text-black' : ''}>{cat}</span>
                              </div>
                              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                isSel ? 'bg-black/20 text-black' : 'bg-slate-800/60 text-slate-400'
                              }`}>
                                {count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Toggle Vista (Tabella / Card) */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 shrink-0">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'table' ? 'bg-[var(--color-primary)] text-black shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
                title="Vista Tabella"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'cards' ? 'bg-[var(--color-primary)] text-black shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
                title="Vista Card"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            {/* Pulsante Filtri Avanzati */}
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                showAdvancedFilters || activeAdvancedCount > 0
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                  : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filtri</span>
              {activeAdvancedCount > 0 && (
                <span className="px-1.5 py-0.2 bg-[var(--color-primary)] text-black font-black text-[10px] rounded-full">
                  {activeAdvancedCount}
                </span>
              )}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
            </button>

            {/* Reset Filtri Globale se attivi */}
            {hasAnyFilter && (
              <button
                onClick={clearAllFilters}
                className="flex items-center justify-center gap-1 px-2.5 py-2 text-xs font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition-all cursor-pointer"
                title="Azzera tutti i filtri"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* ── PANNELLO FILTRI AVANZATI (ACCORDION) ────────────────────────── */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Pattern di Movimento
              </label>
              <select
                value={selectedPattern}
                onChange={e => setSelectedPattern(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-[var(--color-primary)] font-medium"
              >
                {PATTERN_OPTIONS.map(p => (
                  <option key={p} value={p}>{p === 'Tutti' ? '— Tutti i Pattern —' : p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Ruolo Esercizio
              </label>
              <select
                value={selectedRole}
                onChange={e => setSelectedRole(e.target.value as 'Tutti' | ExerciseRole)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-[var(--color-primary)] font-medium"
              >
                {ROLE_OPTIONS.map(r => (
                  <option key={r} value={r}>{r === 'Tutti' ? '— Tutti i Ruoli —' : r}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Attrezzatura
              </label>
              <select
                value={selectedEquipment}
                onChange={e => setSelectedEquipment(e.target.value as 'Tutti' | ExerciseEquipment)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-[var(--color-primary)] font-medium"
              >
                {EQUIPMENT_OPTIONS.map(eq => (
                  <option key={eq} value={eq}>{eq === 'Tutti' ? '— Tutte le Attrezzature —' : eq}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Costo Sistemico (SNC)
              </label>
              <select
                value={selectedCost}
                onChange={e => setSelectedCost(e.target.value as 'Tutti' | SystemicCost)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-[var(--color-primary)] font-medium"
              >
                {COST_OPTIONS.map(c => (
                  <option key={c} value={c}>{c === 'Tutti' ? '— Qualsiasi Costo —' : c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Difficoltà Tecnica
              </label>
              <select
                value={selectedDifficulty}
                onChange={e => setSelectedDifficulty(e.target.value as 'Tutti' | ExerciseDifficulty)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-[var(--color-primary)] font-medium"
              >
                {DIFFICULTY_OPTIONS.map(d => (
                  <option key={d} value={d}>{d === 'Tutti' ? '— Tutte le Difficoltà —' : d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Tipo Stimolo
              </label>
              <select
                value={selectedType}
                onChange={e => setSelectedType(e.target.value as 'Tutti' | ExerciseType)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-[var(--color-primary)] font-medium"
              >
                {EXERCISE_TYPE_OPTIONS.map(t => (
                  <option key={t} value={t}>{t === 'Tutti' ? '— Tutti i Tipi —' : t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Piano Movimento
              </label>
              <select
                value={selectedPlane}
                onChange={e => setSelectedPlane(e.target.value as 'Tutti' | MovementPlane)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-[var(--color-primary)] font-medium"
              >
                {PLANE_OPTIONS.map(p => (
                  <option key={p} value={p}>{p === 'Tutti' ? '— Tutti i Piani —' : p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Bilateralità
              </label>
              <select
                value={selectedBilaterality}
                onChange={e => setSelectedBilaterality(e.target.value as 'Tutti' | Bilaterality)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-[var(--color-primary)] font-medium"
              >
                <option value="Tutti">— Tutte —</option>
                <option value="Bilaterale">Bilaterale</option>
                <option value="Unilaterale">Unilaterale</option>
                <option value="Alternato">Alternato</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ── CONTENUTO PRINCIPALE (TABELLA O CARD) ─────────────────────────── */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl">
          <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-300">Caricamento catalogo esercizi…</p>
        </div>
      ) : filteredExercises.length === 0 ? (
        <div className="text-center py-16 bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl space-y-3">
          <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mx-auto text-slate-500">
            <Dumbbell className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white">Nessun esercizio trovato</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Nessun esercizio corrisponde ai filtri impostati.
          </p>
          {hasAnyFilter && (
            <button
              onClick={clearAllFilters}
              className="text-xs font-bold text-[var(--color-primary)] hover:underline inline-block mt-1 cursor-pointer"
            >
              Rimuovi filtri
            </button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* ── 1. VISTA TABELLA PULITA E NON TAGLIATA ───────────────────────── */
        <div className="bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-slate-800 bg-slate-900/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Esercizio</th>
                  <th className="px-3 py-3">Distretto</th>
                  <th className="px-3 py-3">Target Specifico</th>
                  <th className="px-3 py-3">Pattern</th>
                  <th className="px-3 py-3">Attrezzatura</th>
                  <th className="px-3 py-3">Ruolo</th>
                  <th className="px-2 py-3 text-center">Video</th>
                  <th className="px-4 py-3 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-xs">
                {filteredExercises.map(ex => {
                  const targetMuscle = getTargetMuscle(ex);

                  return (
                    <tr
                      key={ex.id}
                      onClick={() => handleOpenDrawer(ex)}
                      className="hover:bg-slate-900/60 cursor-pointer transition-colors group"
                    >
                      {/* 1. Nome Esercizio */}
                      <td className="px-5 py-3.5">
                        <span className="font-bold text-white group-hover:text-[var(--color-primary)] transition-colors block">
                          {ex.name}
                        </span>
                      </td>

                      {/* 2. Distretto */}
                      <td className="px-3 py-3.5">
                        <span className="px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-300 font-bold border border-amber-500/20 whitespace-nowrap text-[11px]">
                          {ex.category}
                        </span>
                      </td>

                      {/* 3. Target Specifico */}
                      <td className="px-3 py-3.5">
                        <span className="font-medium text-slate-300 block truncate max-w-[180px]">
                          {targetMuscle || '—'}
                        </span>
                      </td>

                      {/* 4. Pattern Movimento */}
                      <td className="px-3 py-3.5">
                        <span className="text-slate-400 whitespace-nowrap">
                          {ex.pattern_movimento || '—'}
                        </span>
                      </td>

                      {/* 5. Attrezzatura */}
                      <td className="px-3 py-3.5">
                        <span className="text-slate-400 whitespace-nowrap">
                          {ex.equipment}
                        </span>
                      </td>

                      {/* 6. Ruolo Esercizio */}
                      <td className="px-3 py-3.5">
                        {ex.ruolo_esercizio ? (
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border inline-block whitespace-nowrap ${
                            ex.ruolo_esercizio === 'Fondamentale'
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              : ex.ruolo_esercizio === 'Complementare'
                              ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                              : ex.ruolo_esercizio === 'Isolamento'
                              ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}>
                            {ex.ruolo_esercizio}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* 7. Video */}
                      <td className="px-2 py-3.5 text-center" onClick={e => e.stopPropagation()}>
                        {ex.video_url ? (
                          <a
                            href={ex.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex p-1 rounded-md text-blue-400 hover:bg-blue-500/10 transition-colors"
                            title="Guarda Video Tutorial"
                          >
                            <Video className="w-3.5 h-3.5" />
                          </a>
                        ) : null}
                      </td>

                      {/* 8. Menu Azioni ⋮ */}
                      <td className="px-4 py-3.5 text-right">
                        <RowMenu
                          exercise={ex}
                          onOpen={() => handleOpenDrawer(ex)}
                          onEdit={() => handleEdit(ex)}
                          onDelete={ex.coach_id ? () => setDeletingExercise(ex) : undefined}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer Conta */}
          <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-900/30 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              Mostrati {filteredExercises.length} di {exercises.length} esercizi
            </span>
          </div>
        </div>
      ) : (
        /* ── 2. VISTA CARD PULITA ────────────────────────────────────────── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExercises.map(ex => {
            const targetMuscle = getTargetMuscle(ex);

            return (
              <div
                key={ex.id}
                onClick={() => handleOpenDrawer(ex)}
                className="bg-[var(--color-panel)] border border-[var(--color-panel-border)] hover:border-slate-700 rounded-2xl p-4 shadow-lg hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 bg-amber-500/10 text-amber-300 text-[10px] font-bold rounded-md border border-amber-500/20 uppercase tracking-wider">
                        {ex.category}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[10px] font-medium rounded-md border border-slate-700">
                        {ex.equipment}
                      </span>
                      {ex.ruolo_esercizio && (
                        <span className="px-2 py-0.5 bg-sky-500/10 text-sky-400 text-[10px] font-medium rounded-md border border-sky-500/20">
                          {ex.ruolo_esercizio}
                        </span>
                      )}
                    </div>

                    {ex.video_url && (
                      <a
                        href={ex.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-blue-400 p-1 hover:bg-blue-500/10 rounded-md"
                        title="Guarda Video"
                      >
                        <Video className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  <h3 className="text-white font-bold text-sm mb-1 group-hover:text-[var(--color-primary)] transition-colors leading-snug line-clamp-1">
                    {ex.name}
                  </h3>

                  {targetMuscle && (
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                      <span className="text-slate-500">Target:</span>
                      <span className="font-medium text-slate-300">{targetMuscle}</span>
                    </p>
                  )}
                  {ex.pattern_movimento && (
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                      Pattern: {ex.pattern_movimento}
                    </p>
                  )}
                </div>

                <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-mono">
                    {ex.tipo || 'Ipertrofia'}
                  </span>

                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleOpenDrawer(ex)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      Dettagli
                    </button>
                    <RowMenu
                      exercise={ex}
                      onOpen={() => handleOpenDrawer(ex)}
                      onEdit={() => handleEdit(ex)}
                      onDelete={ex.coach_id ? () => setDeletingExercise(ex) : undefined}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODALE DETTAGLIO CENTRATO ──────────────────────────────────────── */}
      <ExerciseDetailDrawer
        exercise={drawerExercise}
        isOpen={isDrawerOpen}
        onClose={() => { setIsDrawerOpen(false); setDrawerExercise(null); }}
        onEdit={drawerExercise ? () => handleEdit(drawerExercise) : undefined}
        onDelete={drawerExercise?.coach_id ? () => setDeletingExercise(drawerExercise) : undefined}
      />

      {/* ── MODAL WIZARD CREAZIONE / MODIFICA ───────────────────────────────── */}
      {isModalOpen && (
        <ExerciseModal
          initialExercise={editingExercise}
          onClose={() => { setIsModalOpen(false); setEditingExercise(null); }}
        />
      )}

      {/* ── MODAL CONFERMA ELIMINAZIONE ────────────────────────────────────── */}
      {deletingExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#090d14] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-3 bg-red-500/10 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Elimina Esercizio</h3>
                <p className="text-xs text-slate-400">Azione irreversibile</p>
              </div>
            </div>
            <p className="text-xs text-slate-300">
              Sei sicuro di voler eliminare <strong className="text-white">"{deletingExercise.name}"</strong>?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDeletingExercise(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Annulla
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isDeleting && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {isDeleting ? 'Eliminazione...' : 'Elimina'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL GENERATORE BATCH IA ───────────────────────────────────────── */}
      {isAIGeneratorOpen && (
        <AIExerciseGeneratorModal onClose={() => setIsAIGeneratorOpen(false)} />
      )}
    </div>
  );
};
