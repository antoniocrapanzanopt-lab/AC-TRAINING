import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Dumbbell,
  Pencil,
  Trash2,
  AlertTriangle,
  Folder,
  FolderPlus,
  ChevronRight,
  FolderOpen,
  MoveRight,
  X,
  Save,
  Clock,
  Users,
  TrendingUp,
  Copy,
  Sparkles,
  ArrowLeft,
  Calendar,
  Layers,
  UserX,
  AlertCircle,
  FileText
} from 'lucide-react';
import { useWorkouts } from '../../context/WorkoutsContext';
import { useAthletes } from '../../context/AthletesContext';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { WorkoutBuilderModal } from '../../components/workouts/WorkoutBuilderModal';
import { AssignWorkoutModal } from '../../components/workouts/AssignWorkoutModal';
import { PDFWorkoutImporterModal } from '../../components/workouts/PDFWorkoutImporterModal';
import { WorkoutTemplate, WorkoutFolder, AthleteAssignedWorkout } from '../../types/workout';
import { supabase } from '../../lib/supabase';

export const WorkoutsPage: React.FC = () => {
  const { 
    coachTemplates, 
    folders, 
    allAssignedWorkouts,
    unassignWorkoutFromAthlete,
    createFolder, 
    updateFolder, 
    deleteFolder, 
    moveWorkoutToFolder, 
    deleteWorkoutTemplate,
    duplicateWorkoutTemplate,
  } = useWorkouts();
  const { athletes } = useAthletes();
  const { setActiveTab } = useApp();
  const { showSuccess, showError } = useToast();

  // ─── TAB PRINCIPALE: RACCOGLITORE ATLETI vs TEMPLATE MASTER ───
  const [mainViewTab, setMainViewTab] = useState<'athletes' | 'templates'>('athletes');

  // ─── STATO RACCOGLITORE ATLETI ───
  const [selectedAthleteFolderId, setSelectedAthleteFolderId] = useState<string | null>(null);
  const [athleteSearchTerm, setAthleteSearchTerm] = useState('');
  const [athleteFilterStatus, setAthleteFilterStatus] = useState<'all' | 'active_workout' | 'no_workout'>('all');
  const [athleteLayoutMode, setAthleteLayoutMode] = useState<'list' | 'grid'>('list');

  // ─── STATO LIBRERIA TEMPLATE MASTER ───
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [isPDFImporterOpen, setIsPDFImporterOpen] = useState(false);
  const [builderTargetAthleteId, setBuilderTargetAthleteId] = useState<string | undefined>(undefined);
  const [editingWorkout, setEditingWorkout] = useState<WorkoutTemplate | null>(null);
  const [deletingWorkout, setDeletingWorkout] = useState<WorkoutTemplate | null>(null);
  const [assigningWorkout, setAssigningWorkout] = useState<WorkoutTemplate | null>(null);
  const [movingWorkout, setMovingWorkout] = useState<WorkoutTemplate | null>(null);
  const [editingAthleteWorkout, setEditingAthleteWorkout] = useState<{ athleteId: string, workout: WorkoutTemplate } | null>(null);
  
  // State per Cartelle Master
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<WorkoutFolder | null>(null);
  const [folderNameInput, setFolderNameInput] = useState('');
  const [deletingFolder, setDeletingFolder] = useState<WorkoutFolder | null>(null);

  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingFolder, setIsSavingFolder] = useState(false);
  const [duplicatingWorkoutId, setDuplicatingWorkoutId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // ─── COMPUTED: MAPPA ASSEGNAZIONI PER ATLETA ───
  const athleteWorkoutsMap = useMemo(() => {
    const map = new Map<string, AthleteAssignedWorkout[]>();
    allAssignedWorkouts.forEach(assignment => {
      const list = map.get(assignment.athlete_id) || [];
      list.push(assignment);
      map.set(assignment.athlete_id, list);
    });
    return map;
  }, [allAssignedWorkouts]);

  // Lista atleti attivi con statistiche schede (esclusi inattivi, archiviati e sospesi)
  const activeAthletes = useMemo(() => {
    return athletes.filter(ath => ath.status === 'active' || ath.status === 'trial');
  }, [athletes]);

  const athleteFoldersData = useMemo(() => {
    return activeAthletes.map(ath => {
      const assignments = athleteWorkoutsMap.get(ath.id) || [];
      // Trova scheda attiva
      const activeAssignment = assignments.find(a => a.is_active);
      const activeWorkout = activeAssignment?.workout;
      const totalWorkouts = assignments.length;

      return {
        athlete: ath,
        activeAssignment,
        activeWorkout,
        totalWorkouts,
        hasActiveWorkout: Boolean(activeWorkout),
        allAssignments: assignments,
      };
    });
  }, [activeAthletes, athleteWorkoutsMap]);

  // Filtro Atleti
  const filteredAthleteFolders = useMemo(() => {
    return athleteFoldersData.filter(item => {
      const nameMatch = `${item.athlete.firstName} ${item.athlete.lastName} ${item.athlete.email || ''}`
        .toLowerCase()
        .includes(athleteSearchTerm.toLowerCase()) ||
        (item.activeWorkout?.title?.toLowerCase().includes(athleteSearchTerm.toLowerCase()));

      if (!nameMatch) return false;

      if (athleteFilterStatus === 'active_workout') return item.hasActiveWorkout;
      if (athleteFilterStatus === 'no_workout') return !item.hasActiveWorkout;
      return true;
    });
  }, [athleteFoldersData, athleteSearchTerm, athleteFilterStatus]);

  // Atleta attualmente selezionato nel raccoglitore
  const selectedAthleteData = useMemo(() => {
    if (!selectedAthleteFolderId) return null;
    const foundInActive = athleteFoldersData.find(item => item.athlete.id === selectedAthleteFolderId);
    if (foundInActive) return foundInActive;

    // Fallback sicuro se aperto direttamente dall'atleta
    const rawAth = athletes.find(a => a.id === selectedAthleteFolderId);
    if (!rawAth) return null;
    const assignments = athleteWorkoutsMap.get(rawAth.id) || [];
    const activeAssignment = assignments.find(a => a.is_active);
    return {
      athlete: rawAth,
      activeAssignment,
      activeWorkout: activeAssignment?.workout,
      totalWorkouts: assignments.length,
      hasActiveWorkout: Boolean(activeAssignment?.workout),
      allAssignments: assignments,
    };
  }, [selectedAthleteFolderId, athleteFoldersData, athletes, athleteWorkoutsMap]);

  // ─── BREADCRUMBS TEMPLATE MASTER ───
  const getBreadcrumbs = () => {
    const crumbs: { id: string | null; name: string }[] = [{ id: null, name: 'Tutti i Template Master' }];
    let curr = folders.find(f => f.id === currentFolderId);
    const path: WorkoutFolder[] = [];
    while (curr) {
      path.unshift(curr);
      curr = folders.find(f => f.id === curr?.parent_id);
    }
    path.forEach(p => crumbs.push({ id: p.id, name: p.name }));
    return crumbs;
  };

  const currentFolders = folders.filter(f => {
    if (searchTerm.trim()) {
      return f.name.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return currentFolderId ? f.parent_id === currentFolderId : !f.parent_id;
  });

  const currentTemplates = coachTemplates.filter(template => {
    const matchesSearch = template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (searchTerm.trim()) return matchesSearch;
    return currentFolderId ? template.folder_id === currentFolderId : !template.folder_id;
  });

  // Gestione Eliminazione Scheda
  const handleDeleteWorkout = async () => {
    if (!deletingWorkout) return;
    setIsDeleting(true);
    try {
      const { success, error } = await deleteWorkoutTemplate(deletingWorkout.id);
      if (!success) throw new Error(error);
      showSuccess('Scheda eliminata con successo!');
      setDeletingWorkout(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore eliminazione';
      showError('Errore durante l\'eliminazione della scheda: ' + msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // Gestione Salvataggio Cartella
  const handleSaveFolder = async () => {
    if (!folderNameInput.trim()) {
      showError('Inserisci il nome della cartella');
      return;
    }
    setIsSavingFolder(true);
    try {
      if (editingFolder) {
        const { success, error } = await updateFolder(editingFolder.id, folderNameInput);
        if (!success) throw new Error(error);
        showSuccess('Cartella rinominata con successo!');
      } else {
        const { success, error } = await createFolder(folderNameInput, currentFolderId);
        if (!success) throw new Error(error);
        showSuccess('Nuova cartella creata!');
      }
      setIsFolderModalOpen(false);
      setEditingFolder(null);
      setFolderNameInput('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore';
      showError('Errore durante il salvataggio della cartella: ' + msg);
    } finally {
      setIsSavingFolder(false);
    }
  };

  // Gestione Eliminazione Cartella
  const handleDeleteFolder = async () => {
    if (!deletingFolder) return;
    setIsDeleting(true);
    try {
      const { success, error } = await deleteFolder(deletingFolder.id);
      if (!success) throw new Error(error);
      showSuccess('Cartella eliminata!');
      setDeletingFolder(null);
      if (currentFolderId === deletingFolder.id) {
        setCurrentFolderId(deletingFolder.parent_id || null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore';
      showError('Errore durante l\'eliminazione: ' + msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // Gestione Spostamento Scheda in Cartella
  const handleMoveWorkout = async (targetFolderId: string | null) => {
    if (!movingWorkout) return;
    try {
      const { success, error } = await moveWorkoutToFolder(movingWorkout.id, targetFolderId);
      if (!success) throw new Error(error);
      showSuccess('Scheda spostata con successo!');
      setMovingWorkout(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore';
      showError('Errore durante lo spostamento: ' + msg);
    }
  };

  // Gestione Duplicazione Scheda
  const handleDuplicateWorkout = async (template: WorkoutTemplate) => {
    setDuplicatingWorkoutId(template.id);
    try {
      const res = await duplicateWorkoutTemplate(template.id);
      if (!res.success) throw new Error(res.error);
      showSuccess(`Scheda "${template.title}" duplicata con successo!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore durante la duplicazione';
      showError(msg);
    } finally {
      setDuplicatingWorkoutId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── TESTATA PRINCIPALE CON TAB DI NAVIGAZIONE ─── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">Schede di Allenamento</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[var(--color-primary)]/15 text-[var(--color-primary)] font-black text-[10px] uppercase tracking-wider border border-[var(--color-primary)]/30">
              Training Hub
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Organizza i programmi dei tuoi atleti in cartelle dedicate e gestisci i tuoi template master.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <button 
            onClick={() => setActiveTab('progressioni')}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-850 text-[var(--color-primary)] text-xs font-bold rounded-xl border border-[var(--color-primary)]/40 transition-all shadow-sm cursor-pointer"
          >
            <TrendingUp className="w-4 h-4 text-[var(--color-primary)]" />
            <span>Progressioni & Sovraccarico</span>
          </button>

          {mainViewTab === 'templates' && (
            <button 
              onClick={() => {
                setEditingFolder(null);
                setFolderNameInput('');
                setIsFolderModalOpen(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all cursor-pointer"
            >
              <FolderPlus className="w-4 h-4 text-[var(--color-primary)]" />
              <span>Nuova Cartella Master</span>
            </button>
          )}
          
          <button 
            onClick={() => setIsPDFImporterOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-bold rounded-xl border border-purple-500/40 transition-all cursor-pointer shadow-md shadow-purple-500/10"
          >
            <FileText className="w-4 h-4 text-purple-400" />
            <span>Importa da PDF</span>
          </button>

          <button 
            onClick={() => {
              setBuilderTargetAthleteId(selectedAthleteFolderId || undefined);
              setEditingWorkout(null);
              setIsBuilderOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-slate-950 text-xs font-black rounded-xl hover:bg-[var(--color-primary-hover)] active:scale-95 transition-all shadow-lg shadow-[var(--color-primary)]/20 cursor-pointer ml-auto lg:ml-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{selectedAthleteData ? `Nuova Scheda per ${selectedAthleteData.athlete.firstName}` : 'Nuova Scheda'}</span>
          </button>
        </div>
      </div>

      {/* ─── SWITCHER VISTE: RACCOGLITORE PER ATLETA vs TEMPLATE MASTER ─── */}
      <div className="flex items-center gap-2 p-1 bg-slate-950 border border-slate-800 rounded-2xl max-w-md shadow-inner">
        <button
          type="button"
          onClick={() => {
            setMainViewTab('athletes');
            setSelectedAthleteFolderId(null);
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer select-none ${
            mainViewTab === 'athletes'
              ? 'bg-[var(--color-primary)] text-slate-950 shadow-md shadow-[var(--color-primary)]/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Cartelle per Atleta ({activeAthletes.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setMainViewTab('templates')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer select-none ${
            mainViewTab === 'templates'
              ? 'bg-[var(--color-primary)] text-slate-950 shadow-md shadow-[var(--color-primary)]/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Libreria Template Master ({coachTemplates.length})</span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* VISTA 1: RACCOGLITORE ATLETI (CARTELLE INDIVIDUALI AUTOMATICHE)     */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {mainViewTab === 'athletes' && (
        <div className="space-y-5">
          {/* Se un atleta è aperto, mostra la vista cartella interna */}
          {selectedAthleteData ? (
            <div className="bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-3xl p-5 sm:p-6 space-y-6 shadow-xl animate-in fade-in duration-200">
              {/* Header Cartella Atleta */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div className="flex items-center gap-3.5">
                  <button
                    type="button"
                    onClick={() => setSelectedAthleteFolderId(null)}
                    className="p-2.5 rounded-2xl bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white border border-slate-800 transition-all cursor-pointer shadow-sm"
                    title="Torna a tutte le cartelle atleti"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary)] text-slate-950 font-black text-lg flex items-center justify-center shadow-md shadow-[var(--color-primary)]/20">
                    {selectedAthleteData.athlete.firstName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg sm:text-xl font-black text-white">
                        {selectedAthleteData.athlete.firstName} {selectedAthleteData.athlete.lastName}
                      </h2>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 capitalize">
                        {selectedAthleteData.athlete.status || 'Attivo'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>{selectedAthleteData.athlete.email || 'Nessuna email'}</span>
                      <span>•</span>
                      <span>{selectedAthleteData.totalWorkouts} programmi storici</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-stretch sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setBuilderTargetAthleteId(selectedAthleteData.athlete.id);
                      setEditingWorkout(null);
                      setIsBuilderOpen(true);
                    }}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-primary)] text-slate-950 font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all shadow-md shadow-[var(--color-primary)]/20 cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>Crea Nuova Scheda per {selectedAthleteData.athlete.firstName}</span>
                  </button>
                </div>
              </div>

              {/* SEZIONE 1: SCHEDA ATTIVA IN CORSO */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[var(--color-primary)]" />
                    Scheda Attiva in Corso
                  </h3>
                </div>

                {selectedAthleteData.activeWorkout ? (
                  <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-[var(--color-primary)]/50 shadow-2xl shadow-[var(--color-primary)]/5 space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-base sm:text-lg font-black text-white">
                            {selectedAthleteData.activeWorkout.title}
                          </h4>
                          <span className="px-2.5 py-0.5 rounded-full bg-[var(--color-primary)] text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-sm">
                            Attiva
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                          {selectedAthleteData.activeWorkout.description || 'Nessuna descrizione specificata.'}
                        </p>
                      </div>

                      <div className="bg-slate-950/80 border border-slate-800 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold text-[var(--color-primary)] shrink-0 shadow-inner">
                        {selectedAthleteData.activeWorkout.total_weeks || 4} settimane
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs">
                      <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        Assegnata il {new Date(selectedAthleteData.activeAssignment?.assigned_date || Date.now()).toLocaleDateString('it-IT')}
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedAthleteData.activeWorkout) {
                              setEditingAthleteWorkout({
                                athleteId: selectedAthleteData.athlete.id,
                                workout: selectedAthleteData.activeWorkout
                              });
                            }
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                        >
                          <Pencil className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                          <span>Modifica Scheda</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (selectedAthleteData.activeWorkout) {
                              handleDuplicateWorkout(selectedAthleteData.activeWorkout);
                            }
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-800"
                        >
                          <Copy className="w-3.5 h-3.5 text-blue-400" />
                          <span>Clona per Nuovo Mese</span>
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            if (selectedAthleteData.activeWorkout && confirm('Vuoi revocare questa scheda dall\'atleta?')) {
                              await unassignWorkoutFromAthlete(selectedAthleteData.athlete.id, selectedAthleteData.activeWorkout.id);
                              showSuccess('Scheda revocata con successo.');
                            }
                          }}
                          className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-rose-500/20"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          <span>Scollega</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 rounded-3xl bg-slate-900/30 border border-dashed border-amber-500/40 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-black text-white">Nessuna Scheda Attiva Assegnata</h4>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      {selectedAthleteData.athlete.firstName} non ha attualmente un programma di allenamento in corso. Crea un nuovo programma su misura oppure assegnane uno dai template master.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setBuilderTargetAthleteId(selectedAthleteData.athlete.id);
                        setEditingWorkout(null);
                        setIsBuilderOpen(true);
                      }}
                      className="px-4 py-2 bg-[var(--color-primary)] text-slate-950 font-black text-xs rounded-xl hover:bg-[var(--color-primary-hover)] transition-all cursor-pointer shadow-md"
                    >
                      Crea Scheda per {selectedAthleteData.athlete.firstName}
                    </button>
                  </div>
                )}
              </div>

              {/* SEZIONE 2: ARCHIVIO & STORICO SCHEDE DELL'ATLETA */}
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Folder className="w-4 h-4 text-blue-400" />
                    Archivio & Programmi Storici ({selectedAthleteData.allAssignments.length})
                  </h3>

                  {/* Pulsante Pulizia Rapida Copie Private Non Master */}
                  {(() => {
                    const privateNonMaster = selectedAthleteData.allAssignments.filter(
                      a => a.workout && !a.workout.is_template && a.id !== selectedAthleteData.activeAssignment?.id
                    );
                    if (privateNonMaster.length === 0) return null;

                    return (
                      <button
                        type="button"
                        onClick={async () => {
                          if (confirm(`Vuoi eliminare tutte le ${privateNonMaster.length} schede private storiche non presenti nel Template Master dall'archivio di ${selectedAthleteData.athlete.firstName}?`)) {
                            for (const pa of privateNonMaster) {
                              if (pa.workout_id) {
                                await unassignWorkoutFromAthlete(selectedAthleteData.athlete.id, pa.workout_id, true);
                              }
                            }
                            showSuccess('Archivio ripulito!', `Rimosse ${privateNonMaster.length} schede non master.`);
                          }
                        }}
                        className="px-3 py-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto active:scale-95"
                        title="Elimina tutte le copie private storiche create per questo atleta che non sono template master"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        <span>Elimina Schede Non Master ({privateNonMaster.length})</span>
                      </button>
                    );
                  })()}
                </div>

                {selectedAthleteData.allAssignments.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {selectedAthleteData.allAssignments.map((assignment) => {
                      const w = assignment.workout;
                      if (!w) return null;
                      const isCurrentActive = assignment.is_active;
                      const isMasterTemplate = Boolean(w.is_template);

                      return (
                        <div
                          key={assignment.id}
                          className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                            isCurrentActive
                              ? 'bg-slate-900/60 border-[var(--color-primary)]/40 shadow-md'
                              : 'bg-slate-900/30 border-slate-800/80 hover:bg-slate-900/60'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm font-black text-white line-clamp-1">{w.title}</h4>
                                {isCurrentActive && (
                                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-[var(--color-primary)] text-slate-950">
                                    Attiva
                                  </span>
                                )}
                                {isMasterTemplate ? (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/25">
                                    Master
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/25">
                                    Copia Privata
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                                {w.description || 'Nessuna descrizione'}
                              </p>
                            </div>
                            <span className="text-[10px] font-mono font-bold text-slate-400 shrink-0 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                              {w.total_weeks || 4}w
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/80">
                            <span className="text-[10px] text-slate-500">
                              {assignment.assigned_date ? new Date(assignment.assigned_date).toLocaleDateString('it-IT') : '-'}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingAthleteWorkout({
                                    athleteId: selectedAthleteData.athlete.id,
                                    workout: w
                                  });
                                }}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                              >
                                Apri
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDuplicateWorkout(w)}
                                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                                title="Duplica"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  const confirmMsg = isMasterTemplate
                                    ? `Rimuovere l'assegnazione storica di "${w.title}" per ${selectedAthleteData.athlete.firstName}? (Il Template Master originale rimarrà nel catalogo)`
                                    : `Eliminare definitivamente la scheda "${w.title}" (non presente nel catalogo master)?`;
                                  if (confirm(confirmMsg)) {
                                    const res = await unassignWorkoutFromAthlete(selectedAthleteData.athlete.id, w.id, !isMasterTemplate);
                                    if (res.success) {
                                      showSuccess(isMasterTemplate ? 'Assegnazione rimossa dall\'archivio' : 'Scheda privata eliminata con successo.');
                                    } else {
                                      showError('Errore durante l\'eliminazione: ' + (res.error || ''));
                                    }
                                  }
                                }}
                                className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                                title={isMasterTemplate ? "Rimuovi assegnazione dall'archivio" : "Elimina definitivamente scheda non presente nei template master"}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic py-2">
                    Nessuna scheda archiviata per questo atleta.
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* LISTA DI TUTTE LE CARTELLE ATLETI */
            <div className="space-y-4">
              {/* Barra Filtri, Ricerca e Toggle Vista Atleti */}
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-[var(--color-panel)] border border-[var(--color-panel-border)] p-3.5 rounded-2xl shadow-sm">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cerca atleta per nome, email o scheda assegnata..."
                    value={athleteSearchTerm}
                    onChange={(e) => setAthleteSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-[var(--color-primary)] placeholder:text-slate-500"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {/* Filtri Stato Scheda */}
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setAthleteFilterStatus('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        athleteFilterStatus === 'all'
                          ? 'bg-slate-800 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Tutti ({activeAthletes.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAthleteFilterStatus('active_workout')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        athleteFilterStatus === 'active_workout'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Con Scheda ({athleteFoldersData.filter(a => a.hasActiveWorkout).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAthleteFilterStatus('no_workout')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        athleteFilterStatus === 'no_workout'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Senza Scheda ({athleteFoldersData.filter(a => !a.hasActiveWorkout).length})
                    </button>
                  </div>

                  {/* Toggle Vista Elenco / Griglia */}
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setAthleteLayoutMode('list')}
                      className={`p-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        athleteLayoutMode === 'list'
                          ? 'bg-[var(--color-primary)] text-slate-950 shadow-sm font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Vista Elenco Orizzontale"
                    >
                      <span>Elenco</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAthleteLayoutMode('grid')}
                      className={`p-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        athleteLayoutMode === 'grid'
                          ? 'bg-[var(--color-primary)] text-slate-950 shadow-sm font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Vista a Griglia"
                    >
                      <span>Griglia</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* ── 1. VISTA AD ELENCO ORIZZONTALE (COMPATTA, ALLINEATA & RIGIDA) ── */}
              {athleteLayoutMode === 'list' && (
                <div className="space-y-2">
                  {/* Intestazione Colonne Tabella per un ordine visivo impeccabile */}
                  <div className="hidden lg:grid grid-cols-12 gap-4 px-5 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-800/80">
                    <div className="col-span-4">Atleta & Contatto</div>
                    <div className="col-span-5">Programma Attivo in Corso</div>
                    <div className="col-span-1 text-center">Archivio</div>
                    <div className="col-span-2 text-right">Azione</div>
                  </div>

                  {filteredAthleteFolders.map((item) => {
                    const ath = item.athlete;
                    const hasActive = item.hasActiveWorkout;

                    return (
                      <div
                        key={ath.id}
                        onClick={() => setSelectedAthleteFolderId(ath.id)}
                        className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 hover:border-[var(--color-primary)]/60 rounded-2xl p-3.5 sm:p-4 shadow-sm hover:shadow-xl transition-all grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 items-center group cursor-pointer"
                      >
                        {/* Col 1-4: Atleta & Contatto */}
                        <div className="lg:col-span-4 flex items-center gap-3.5 min-w-0">
                          <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary)] text-slate-950 font-black text-sm flex items-center justify-center shadow-md shadow-[var(--color-primary)]/15 shrink-0 group-hover:scale-105 transition-transform">
                            {ath.firstName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-black text-white truncate group-hover:text-[var(--color-primary)] transition-colors">
                                {ath.firstName} {ath.lastName}
                              </h3>
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 capitalize shrink-0">
                                {ath.status || 'Attivo'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 truncate">
                              {ath.email || 'Senza email'}
                            </p>
                          </div>
                        </div>

                        {/* Col 5-9: Scheda Attiva (Box allineato a larghezza costante) */}
                        <div className="lg:col-span-5 min-w-0">
                          <div className="p-2 px-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Scheda Attiva</span>
                              <p className="text-xs font-black text-white truncate">
                                {item.activeWorkout?.title || 'Nessuna scheda attiva'}
                              </p>
                            </div>
                            {hasActive ? (
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30 flex items-center gap-1.5 shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                In Corso
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-400 text-[10px] font-black uppercase tracking-wider border border-rose-500/30 flex items-center gap-1.5 shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                Non Assegnata
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Col 10: Contatore Archivio */}
                        <div className="lg:col-span-1 flex items-center lg:justify-center gap-1.5 text-xs text-slate-400 font-medium">
                          <Folder className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="truncate">{item.totalWorkouts} prog.</span>
                        </div>

                        {/* Col 11-12: Pulsante Azione */}
                        <div className="lg:col-span-2 flex justify-end">
                          <button
                            type="button"
                            className="w-full lg:w-auto px-4 py-2 rounded-xl bg-slate-800 group-hover:bg-[var(--color-primary)] text-slate-300 group-hover:text-slate-950 font-black text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm group-hover:shadow-md cursor-pointer"
                          >
                            <span>Apri Cartella</span>
                            <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── 2. VISTA A GRIGLIA (SE SCELTA DALL'UTENTE) ── */}
              {athleteLayoutMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredAthleteFolders.map((item) => {
                    const ath = item.athlete;
                    const hasActive = item.hasActiveWorkout;

                    return (
                      <div
                        key={ath.id}
                        onClick={() => setSelectedAthleteFolderId(ath.id)}
                        className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 hover:border-[var(--color-primary)]/60 rounded-3xl p-5 shadow-lg hover:shadow-xl transition-all flex flex-col justify-between group cursor-pointer space-y-4"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-11 h-11 rounded-2xl bg-[var(--color-primary)] text-slate-950 font-black text-sm flex items-center justify-center shadow-md shadow-[var(--color-primary)]/15 shrink-0 group-hover:scale-105 transition-transform">
                                {ath.firstName.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-base font-black text-white truncate group-hover:text-[var(--color-primary)] transition-colors">
                                  {ath.firstName} {ath.lastName}
                                </h3>
                                <p className="text-xs text-slate-400 truncate">
                                  {ath.email || 'Senza email'}
                                </p>
                              </div>
                            </div>

                            <div className="w-8 h-8 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 group-hover:text-[var(--color-primary)] group-hover:border-[var(--color-primary)]/40 transition-all shrink-0">
                              <Folder className="w-4 h-4" />
                            </div>
                          </div>

                          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                              <span className="text-slate-400">Scheda Attiva</span>
                              {hasActive ? (
                                <span className="text-emerald-400 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  In corso
                                </span>
                              ) : (
                                <span className="text-rose-400 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                  Non assegnata
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-black text-white truncate">
                              {item.activeWorkout?.title || 'Nessuna scheda attiva'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-800/60">
                          <span className="text-slate-400 font-medium">
                            {item.totalWorkouts} programmi archiviati
                          </span>
                          <span className="text-[11px] font-black text-[var(--color-primary)] group-hover:translate-x-1 transition-transform flex items-center gap-1">
                            <span>Apri Cartella</span>
                            <span>→</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {filteredAthleteFolders.length === 0 && (
                <div className="p-12 text-center text-slate-400 bg-slate-900/20 border border-slate-800 rounded-3xl space-y-2">
                  <Users className="w-8 h-8 mx-auto text-slate-500 opacity-50" />
                  <p className="text-sm font-bold text-slate-300">Nessun atleta trovato con i filtri selezionati</p>
                  <p className="text-xs text-slate-500">Prova a modificare i termini di ricerca o i filtri di stato.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* VISTA 2: LIBRERIA TEMPLATE MASTER & CARTELLE GLOBALI               */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {mainViewTab === 'templates' && (
        <div className="bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-3xl p-4 sm:p-6 space-y-6 shadow-xl animate-in fade-in duration-200">
          {/* Breadcrumb Navigation & Search Bar Master */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-sm font-bold custom-scrollbar py-1">
              {getBreadcrumbs().map((crumb, idx, arr) => {
                const isLast = idx === arr.length - 1;
                return (
                  <React.Fragment key={crumb.id || 'root'}>
                    <button
                      onClick={() => setCurrentFolderId(crumb.id)}
                      className={`flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${isLast ? 'text-[var(--color-primary)] font-black' : 'text-slate-400 hover:text-white'}`}
                    >
                      {idx === 0 ? <FolderOpen className="w-4 h-4" /> : <Folder className="w-4 h-4" />}
                      <span>{crumb.name}</span>
                    </button>
                    {!isLast && <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Search Box */}
            <div className="relative min-w-[240px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cerca template master..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
          </div>

          {/* 1. SEZIONE CARTELLE MASTER */}
          {currentFolders.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cartelle</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {currentFolders.map(folder => {
                  const count = coachTemplates.filter(t => t.folder_id === folder.id).length;
                  const subCount = folders.filter(f => f.parent_id === folder.id).length;
                  return (
                    <div
                      key={folder.id}
                      onClick={() => setCurrentFolderId(folder.id)}
                      className="group flex items-center justify-between p-4 bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800/80 hover:border-[var(--color-primary)]/40 rounded-2xl cursor-pointer transition-all shadow-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)] shrink-0 group-hover:scale-105 transition-transform">
                          <Folder className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-white group-hover:text-[var(--color-primary)] transition-colors truncate">
                            {folder.name}
                          </h4>
                          <span className="text-[11px] text-slate-500 block">
                            {count} schede • {subCount} sottocartelle
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setEditingFolder(folder);
                            setFolderNameInput(folder.name);
                            setIsFolderModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                          title="Rinomina cartella"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingFolder(folder)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800"
                          title="Elimina cartella"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. SEZIONE TEMPLATE & SCHEDE */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Template Master & Programmi</h3>
              <span className="text-xs text-slate-500">{currentTemplates.length} schede totali</span>
            </div>

            {currentTemplates.length === 0 ? (
              <div className="p-12 text-center text-slate-400 bg-slate-900/20 border border-slate-800 rounded-3xl space-y-3">
                <Dumbbell className="w-10 h-10 mx-auto text-slate-600" />
                <p className="text-sm font-bold text-slate-300">Nessun template in questa cartella</p>
                <p className="text-xs text-slate-500">Crea una nuova scheda master per iniziare ad archiviare i tuoi programmi.</p>
                <button
                  onClick={() => {
                    setBuilderTargetAthleteId(undefined);
                    setEditingWorkout(null);
                    setIsBuilderOpen(true);
                  }}
                  className="px-4 py-2 bg-[var(--color-primary)] text-slate-950 font-black text-xs rounded-xl hover:bg-[var(--color-primary-hover)] transition-all cursor-pointer shadow-md"
                >
                  Crea Primo Template
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentTemplates.map(template => {
                  const assignedList = allAssignedWorkouts.filter(a => a.workout_id === template.id);
                  const isDuplicating = duplicatingWorkoutId === template.id;

                  return (
                    <div
                      key={template.id}
                      className="p-5 rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 hover:border-slate-700/80 transition-all flex flex-col justify-between space-y-4 shadow-lg"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                            <Dumbbell className="w-5 h-5" />
                          </div>
                          <div className="flex items-center gap-1.5">
                            {template.estimated_duration_minutes && (
                              <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-lg border border-sky-500/20">
                                <Clock className="w-3 h-3" />
                                {template.estimated_duration_minutes} min
                              </span>
                            )}
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
                              {new Date(template.created_at).toLocaleDateString('it-IT')}
                            </span>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-base font-black text-white line-clamp-1">{template.title}</h4>
                          <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                            {template.description || 'Nessuna descrizione.'}
                          </p>
                        </div>

                        {/* Atleti che usano questo master */}
                        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Users className="w-3.5 h-3.5 text-slate-500" />
                            <span className="text-[11px] font-bold">Atleti in uso: {assignedList.length}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAssigningWorkout(template)}
                            className="text-[11px] font-black text-[var(--color-primary)] hover:underline cursor-pointer"
                          >
                            + Assegna
                          </button>
                        </div>
                      </div>

                      {/* Azioni Card */}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingWorkout(template);
                              setIsBuilderOpen(true);
                            }}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                            title="Modifica template"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDuplicateWorkout(template)}
                            disabled={isDuplicating}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                            title="Duplica template"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setMovingWorkout(template)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                            title="Sposta in cartella"
                          >
                            <MoveRight className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingWorkout(template)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Elimina template"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => setAssigningWorkout(template)}
                          className="px-3.5 py-1.5 rounded-xl bg-[var(--color-primary)] text-slate-950 font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all cursor-pointer shadow-sm"
                        >
                          Assegna ad Atleta
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TUTTE LE MODALI INTEGRATE E FUNZIONANTI ─── */}

      {/* Modal Creazione / Modifica Scheda Master o per Atleta */}
      {isBuilderOpen && (
        <WorkoutBuilderModal
          athleteId={builderTargetAthleteId}
          initialWorkout={editingWorkout || undefined}
          onClose={() => {
            setIsBuilderOpen(false);
            setEditingWorkout(null);
            setBuilderTargetAthleteId(undefined);
          }}
        />
      )}

      {/* Modal Modifica Scheda Specifica Atleta */}
      {editingAthleteWorkout && (
        <WorkoutBuilderModal
          athleteId={editingAthleteWorkout.athleteId}
          initialWorkout={editingAthleteWorkout.workout}
          onClose={() => setEditingAthleteWorkout(null)}
          onBack={() => setEditingAthleteWorkout(null)}
        />
      )}

      {/* Modal Assegna Scheda */}
      {assigningWorkout && (
        <AssignWorkoutModal
          workout={assigningWorkout}
          onClose={() => setAssigningWorkout(null)}
        />
      )}

      {/* MODAL CREAZIONE / MODIFICA CARTELLA MASTER */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Folder className="w-5 h-5 text-[var(--color-primary)]" />
                {editingFolder ? 'Rinomina Cartella' : 'Nuova Cartella Master'}
              </h3>
              <button onClick={() => setIsFolderModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Nome della Cartella
              </label>
              <input
                type="text"
                placeholder="es. Ipertrofia, Forza, Donna..."
                value={folderNameInput}
                onChange={e => setFolderNameInput(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-[var(--color-primary)] font-bold text-sm"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setIsFolderModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white cursor-pointer"
              >
                Annulla
              </button>
              <button
                onClick={handleSaveFolder}
                disabled={isSavingFolder}
                className="px-5 py-2 bg-[var(--color-primary)] text-slate-950 text-xs font-black rounded-xl hover:bg-[var(--color-primary-hover)] transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-md"
              >
                {isSavingFolder ? <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                {isSavingFolder ? 'Salvataggio...' : 'Salva Cartella'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SPOSTA SCHEDA IN CARTELLA */}
      {movingWorkout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <MoveRight className="w-5 h-5 text-[var(--color-primary)]" />
                Sposta Scheda in Cartella
              </h3>
              <button onClick={() => setMovingWorkout(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Seleziona la destinazione per <strong className="text-white">"{movingWorkout.title}"</strong>:
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
              <button
                onClick={() => handleMoveWorkout(null)}
                className={`w-full text-left p-3 rounded-xl border flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${!movingWorkout.folder_id ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-primary)]' : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'}`}
              >
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4" />
                  <span>Nessuna Cartella (Principale)</span>
                </div>
                {!movingWorkout.folder_id && <span className="text-[10px] bg-[var(--color-primary)] text-slate-950 px-2 py-0.5 rounded-full font-bold">Attuale</span>}
              </button>

              {folders.map(f => {
                const isCurrent = movingWorkout.folder_id === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => handleMoveWorkout(f.id)}
                    className={`w-full text-left p-3 rounded-xl border flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${isCurrent ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-primary)]' : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'}`}
                  >
                    <div className="flex items-center gap-2">
                      <Folder className="w-4 h-4 text-[var(--color-primary)]" />
                      <span>{f.name}</span>
                    </div>
                    {isCurrent && <span className="text-[10px] bg-[var(--color-primary)] text-slate-950 px-2 py-0.5 rounded-full font-bold">Attuale</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL ELIMINAZIONE CARTELLA */}
      {deletingFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-3 bg-red-500/10 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Elimina Cartella</h3>
                <p className="text-xs text-slate-400">Questa azione eliminerà la cartella</p>
              </div>
            </div>

            <p className="text-sm text-slate-300">
              Sei sicuro di voler eliminare la cartella <strong className="text-white">"{deletingFolder.name}"</strong>? Le schede contenute non verranno cancellate ma spostate al livello principale.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={() => setDeletingFolder(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white cursor-pointer"
              >
                Annulla
              </button>
              <button 
                onClick={handleDeleteFolder}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? 'Eliminazione...' : 'Elimina Cartella'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ELIMINAZIONE SCHEDA */}
      {deletingWorkout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-3 bg-red-500/10 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Elimina Scheda</h3>
                <p className="text-xs text-slate-400">Questa azione è irreversibile</p>
              </div>
            </div>

            <p className="text-sm text-slate-300">
              Sei sicuro di voler eliminare la scheda <strong className="text-white">"{deletingWorkout.title}"</strong>?
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={() => setDeletingWorkout(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white cursor-pointer"
              >
                Annulla
              </button>
              <button 
                onClick={handleDeleteWorkout}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? 'Eliminazione...' : 'Elimina Scheda'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODALE IMPORTAZIONE PDF */}
      <PDFWorkoutImporterModal
        isOpen={isPDFImporterOpen}
        onClose={() => setIsPDFImporterOpen(false)}
        targetAthleteId={selectedAthleteFolderId || undefined}
        onImportSuccess={async (newWorkoutId) => {
          setIsPDFImporterOpen(false);
          // Cerca il template appena salvato nello stato locale
          const localMatch = coachTemplates.find((t) => t.id === newWorkoutId);
          if (localMatch) {
            setEditingWorkout(localMatch);
            setIsBuilderOpen(true);
          } else {
            // Fallback diretto da Supabase se non ancora sincronizzato in cache locale
            const { data: fetched } = await supabase
              .from('workouts')
              .select('*')
              .eq('id', newWorkoutId)
              .maybeSingle();

            if (fetched) {
              setEditingWorkout(fetched as WorkoutTemplate);
              setIsBuilderOpen(true);
            }
          }
        }}
      />
    </div>
  );
};
