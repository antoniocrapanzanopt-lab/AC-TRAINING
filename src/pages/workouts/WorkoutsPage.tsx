import React, { useState } from 'react';
import { Plus, Search, Dumbbell, Pencil, Trash2, AlertTriangle, Folder, FolderPlus, ChevronRight, FolderOpen, MoveRight, X, Save, Clock, Users, User, ExternalLink } from 'lucide-react';
import { useWorkouts } from '../../context/WorkoutsContext';
import { useAthletes } from '../../context/AthletesContext';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { WorkoutBuilderModal } from '../../components/workouts/WorkoutBuilderModal';
import { AssignWorkoutModal } from '../../components/workouts/AssignWorkoutModal';
import { WorkoutTemplate, WorkoutFolder } from '../../types/workout';

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
    deleteWorkoutTemplate 
  } = useWorkouts();
  const { athletes, setSelectedAthleteId } = useAthletes();
  const { setActiveTab } = useApp();
  const { showSuccess, showError } = useToast();

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<WorkoutTemplate | null>(null);
  const [deletingWorkout, setDeletingWorkout] = useState<WorkoutTemplate | null>(null);
  const [assigningWorkout, setAssigningWorkout] = useState<WorkoutTemplate | null>(null);
  const [movingWorkout, setMovingWorkout] = useState<WorkoutTemplate | null>(null);
  const [viewingAssignedWorkout, setViewingAssignedWorkout] = useState<{
    template: WorkoutTemplate;
    assignedAthletes: {
      assignmentId: string;
      athleteId: string;
      name: string;
      status: string;
      assignedDate: string;
      email: string;
    }[];
  } | null>(null);
  const [editingAthleteWorkout, setEditingAthleteWorkout] = useState<{ athleteId: string, workout: WorkoutTemplate } | null>(null);
  
  // State per Cartelle
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<WorkoutFolder | null>(null);
  const [folderNameInput, setFolderNameInput] = useState('');
  const [deletingFolder, setDeletingFolder] = useState<WorkoutFolder | null>(null);

  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingFolder, setIsSavingFolder] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Costruisci il percorso dei Breadcrumbs per la navigazione
  const getBreadcrumbs = () => {
    const crumbs: { id: string | null; name: string }[] = [{ id: null, name: 'Tutti i Programmi' }];
    let curr = folders.find(f => f.id === currentFolderId);
    const path: WorkoutFolder[] = [];
    while (curr) {
      path.unshift(curr);
      curr = folders.find(f => f.id === curr?.parent_id);
    }
    path.forEach(p => crumbs.push({ id: p.id, name: p.name }));
    return crumbs;
  };

  // 2. Filtra le cartelle del livello corrente
  const currentFolders = folders.filter(f => {
    if (searchTerm.trim()) {
      return f.name.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return currentFolderId ? f.parent_id === currentFolderId : !f.parent_id;
  });

  // 3. Filtra le schede del livello corrente (o per ricerca globale)
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
    } catch (err: any) {
      console.error(err);
      showError('Errore durante l\'eliminazione della scheda: ' + (err.message || ''));
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
    } catch (err: any) {
      showError('Errore durante il salvataggio della cartella: ' + (err.message || ''));
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
    } catch (err: any) {
      showError('Errore durante l\'eliminazione: ' + (err.message || ''));
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
    } catch (err: any) {
      showError('Errore durante lo spostamento: ' + (err.message || ''));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Pagina */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Schede di Allenamento</h1>
          <p className="text-sm text-slate-400">Organizza i tuoi programmi in cartelle ed archivi</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              setEditingFolder(null);
              setFolderNameInput('');
              setIsFolderModalOpen(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold rounded-xl border border-slate-700 transition-all"
          >
            <FolderPlus className="w-4 h-4 text-[var(--color-primary)]" />
            Nuova Cartella
          </button>
          
          <button 
            onClick={() => setIsBuilderOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-black text-sm font-bold rounded-xl hover:bg-[var(--color-primary-hover)] transition-all shadow-lg"
          >
            <Plus className="w-4 h-4" />
            Nuova Scheda
          </button>
        </div>
      </div>

      <div className="bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl p-4 sm:p-6 space-y-6">
        
        {/* Breadcrumb Navigation & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-sm font-bold custom-scrollbar py-1">
            {getBreadcrumbs().map((crumb, idx, arr) => {
              const isLast = idx === arr.length - 1;
              return (
                <React.Fragment key={crumb.id || 'root'}>
                  <button
                    onClick={() => setCurrentFolderId(crumb.id)}
                    className={`flex items-center gap-1.5 transition-colors whitespace-nowrap ${isLast ? 'text-[var(--color-primary)] font-bold' : 'text-slate-400 hover:text-white'}`}
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cerca schede o cartelle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-900/60 border border-slate-700/60 rounded-xl text-sm text-white focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>
        </div>

        {/* 1. SEZIONE CARTELLE (Se presenti) */}
        {currentFolders.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cartelle</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {currentFolders.map(folder => {
                const subfoldersCount = folders.filter(f => f.parent_id === folder.id).length;
                const templatesCount = coachTemplates.filter(t => t.folder_id === folder.id).length;

                return (
                  <div
                    key={folder.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-[var(--color-primary)]/50 transition-all flex items-center justify-between group cursor-pointer"
                    onClick={() => setCurrentFolderId(folder.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl">
                        <Folder className="w-5 h-5 fill-amber-400/20" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white group-hover:text-[var(--color-primary)] transition-colors">
                          {folder.name}
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          {templatesCount} schede • {subfoldersCount} sottocartelle
                        </p>
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
                        className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800"
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

        {/* 2. SEZIONE SCHEDE / TEMPLATE */}
        <div className="space-y-3">
          {currentFolders.length > 0 && <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Programmi & Schede</h3>}

          {currentTemplates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentTemplates.map(template => {
                const parentFolder = folders.find(f => f.id === template.folder_id);
                const activeAssignments = allAssignedWorkouts.filter(a => a.workout_id === template.id && a.is_active);
                const assignedAthletes = activeAssignments.map(a => {
                  const ath = athletes.find(athlete => athlete.id === a.athlete_id);
                  const name = ath ? `${ath.firstName} ${ath.lastName}`.trim() : (a.athlete?.first_name ? `${a.athlete.first_name} ${a.athlete.last_name || ''}`.trim() : 'Atleta Sconosciuto');
                  return {
                    assignmentId: a.id,
                    athleteId: a.athlete_id,
                    name,
                    status: ath?.status || a.athlete?.status || 'active',
                    assignedDate: a.assigned_date,
                    email: ath?.email || a.athlete?.email || '',
                  };
                });

                return (
                  <div key={template.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-[var(--color-primary)]/50 transition-colors group flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <div className="p-2 bg-[var(--color-primary)]/10 rounded-lg">
                          <Dumbbell className="w-5 h-5 text-[var(--color-primary)]" />
                        </div>
                        <div className="flex items-center gap-2">
                          {parentFolder && (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-md flex items-center gap-1">
                              <Folder className="w-3 h-3" /> {parentFolder.name}
                            </span>
                          )}
                          {template.estimated_duration_minutes && (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded-md flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {template.estimated_duration_minutes}
                            </span>
                          )}
                          <span className="text-xs font-semibold px-2 py-0.5 bg-slate-800 rounded-md text-slate-300">
                            {new Date(template.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <h3 className="text-white font-bold text-lg mb-1">{template.title}</h3>
                      <p className="text-sm text-slate-400 line-clamp-2 min-h-[36px]">
                        {template.description || 'Nessuna descrizione'}
                      </p>

                      {/* Sezione Atleti Assegnati */}
                      <div className="mt-3 pt-3 border-t border-slate-800/80">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                            Atleti in uso ({assignedAthletes.length})
                          </span>
                          {assignedAthletes.length > 0 && (
                            <button
                              onClick={() => setViewingAssignedWorkout({ template, assignedAthletes })}
                              className="text-[11px] font-bold text-[var(--color-primary)] hover:underline flex items-center gap-0.5"
                            >
                              Gestisci <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {assignedAthletes.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 items-center">
                            {assignedAthletes.slice(0, 2).map(ath => (
                              <span
                                key={ath.assignmentId}
                                onClick={() => setViewingAssignedWorkout({ template, assignedAthletes })}
                                className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:bg-amber-500/20 transition-colors"
                                title={`Assegnata il ${new Date(ath.assignedDate).toLocaleDateString('it-IT')}`}
                              >
                                <User className="w-3 h-3 text-amber-400" />
                                {ath.name}
                              </span>
                            ))}
                            {assignedAthletes.length > 2 && (
                              <button
                                onClick={() => setViewingAssignedWorkout({ template, assignedAthletes })}
                                className="px-2 py-1 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-700 transition-colors"
                              >
                                +{assignedAthletes.length - 2} altri
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-500 italic">Nessun atleta in uso</span>
                            <button
                              onClick={() => setAssigningWorkout(template)}
                              className="text-[11px] font-bold text-slate-400 hover:text-[var(--color-primary)] flex items-center gap-1 transition-colors"
                            >
                              <Plus className="w-3 h-3" /> Assegna
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center">
                       <div className="flex items-center gap-1">
                         <button 
                           onClick={() => setEditingWorkout(template)}
                           className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
                           title="Modifica scheda"
                         >
                           <Pencil className="w-3.5 h-3.5 text-slate-400" />
                           <span>Modifica</span>
                         </button>
                         <button 
                           onClick={() => setMovingWorkout(template)}
                           className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
                           title="Sposta in cartella"
                         >
                           <MoveRight className="w-3.5 h-3.5" />
                         </button>
                         <button 
                           onClick={() => setDeletingWorkout(template)}
                           className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
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
                );
              })}
            </div>
          ) : currentFolders.length === 0 && (
            <div className="text-center py-16 bg-slate-900/30 rounded-2xl border border-slate-800">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4 border border-slate-700/50">
                <Dumbbell className="w-8 h-8 text-slate-500" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Cartella o Sezione Vuota</h3>
              <p className="text-sm text-slate-400 max-w-sm mx-auto">
                Non ci sono schede di allenamento in questa posizione. Puoi crearne una nuova o spostarvene una esistente.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Costruttore Scheda */}
      {isBuilderOpen && (
        <WorkoutBuilderModal
          athleteId=""
          onClose={() => setIsBuilderOpen(false)}
        />
      )}

      {/* Modal Modifica Scheda */}
      {editingWorkout && (
        <WorkoutBuilderModal
          initialWorkout={editingWorkout}
          onClose={() => setEditingWorkout(null)}
        />
      )}

      {/* Modal Modifica Scheda (Solo Singolo Atleta / Decoupling) */}
      {editingAthleteWorkout && (
        <WorkoutBuilderModal
          athleteId={editingAthleteWorkout.athleteId}
          initialWorkout={editingAthleteWorkout.workout}
          onClose={() => {
            setEditingAthleteWorkout(null);
            setViewingAssignedWorkout(null);
          }}
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

      {/* MODAL CREAZIONE / MODIFICA CARTELLA */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Folder className="w-5 h-5 text-[var(--color-primary)]" />
                {editingFolder ? 'Rinomina Cartella' : 'Nuova Cartella'}
              </h3>
              <button onClick={() => setIsFolderModalOpen(false)} className="text-slate-400 hover:text-white">
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
                className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white"
              >
                Annulla
              </button>
              <button
                onClick={handleSaveFolder}
                disabled={isSavingFolder}
                className="px-5 py-2 bg-[var(--color-primary)] text-black text-xs font-bold rounded-xl hover:bg-[var(--color-primary-hover)] transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isSavingFolder ? <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                {isSavingFolder ? 'Salvataggio...' : 'Salva Cartella'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SPOSTA SCHEDA IN CARTELLA */}
      {movingWorkout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <MoveRight className="w-5 h-5 text-amber-400" />
                Sposta Scheda in Cartella
              </h3>
              <button onClick={() => setMovingWorkout(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Seleziona la destinazione per <strong className="text-white">"{movingWorkout.title}"</strong>:
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
              <button
                onClick={() => handleMoveWorkout(null)}
                className={`w-full text-left p-3 rounded-xl border flex items-center justify-between text-xs font-bold transition-all ${!movingWorkout.folder_id ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-primary)]' : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'}`}
              >
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4" />
                  <span>Nessuna Cartella (Principale)</span>
                </div>
                {!movingWorkout.folder_id && <span className="text-[10px] bg-[var(--color-primary)] text-black px-2 py-0.5 rounded-full font-bold">Attuale</span>}
              </button>

              {folders.map(f => {
                const isCurrent = movingWorkout.folder_id === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => handleMoveWorkout(f.id)}
                    className={`w-full text-left p-3 rounded-xl border flex items-center justify-between text-xs font-bold transition-all ${isCurrent ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-primary)]' : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'}`}
                  >
                    <div className="flex items-center gap-2">
                      <Folder className="w-4 h-4 text-amber-400" />
                      <span>{f.name}</span>
                    </div>
                    {isCurrent && <span className="text-[10px] bg-[var(--color-primary)] text-black px-2 py-0.5 rounded-full font-bold">Attuale</span>}
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
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-3 bg-red-500/10 rounded-xl">
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
                className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white"
              >
                Annulla
              </button>
              <button 
                onClick={handleDeleteFolder}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isDeleting && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {isDeleting ? 'Eliminazione...' : 'Elimina Cartella'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ELIMINAZIONE SCHEDA */}
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
                className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white"
              >
                Annulla
              </button>
              <button 
                onClick={handleDeleteWorkout}
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

      {/* MODAL DETTAGLIO ATLETI ASSEGNATI */}
      {viewingAssignedWorkout && !editingAthleteWorkout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Atleti in uso col programma</h3>
                  <p className="text-xs text-slate-400">{viewingAssignedWorkout.template.title}</p>
                </div>
              </div>
              <button onClick={() => setViewingAssignedWorkout(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto overflow-x-hidden pr-1 custom-scrollbar">
              {viewingAssignedWorkout.assignedAthletes.map(ath => (
                <div key={ath.assignmentId} className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-sm shrink-0">
                      {ath.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        {ath.name}
                        {ath.status === 'active' && <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-bold border border-emerald-500/20">Attivo</span>}
                        {ath.status === 'trial' && <span className="text-[10px] bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded font-bold border border-sky-500/20">In prova</span>}
                      </h4>
                      <p className="text-xs text-slate-400">
                        Assegnata il {new Date(ath.assignedDate).toLocaleDateString('it-IT')} {ath.email ? `• ${ath.email}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      onClick={() => {
                        setSelectedAthleteId(ath.athleteId);
                        setActiveTab('atleti');
                        setViewingAssignedWorkout(null);
                      }}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5"
                      title="Apri scheda dell'atleta"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                      <span>Apri Atleta</span>
                    </button>
                    <button
                      onClick={() => {
                        setEditingAthleteWorkout({ 
                          athleteId: ath.athleteId, 
                          workout: viewingAssignedWorkout.template 
                        });
                      }}
                      className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-bold rounded-lg border border-amber-500/20 transition-colors flex items-center gap-1.5"
                      title="Personalizza scheda (stacca dal template globale)"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Modifica</span>
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm(`Vuoi rimuovere il programma "${viewingAssignedWorkout.template.title}" da ${ath.name}?`)) {
                          const res = await unassignWorkoutFromAthlete(ath.athleteId, viewingAssignedWorkout.template.id);
                          if (res.success) {
                            showSuccess(`Scheda rimossa da ${ath.name}`);
                            const updated = viewingAssignedWorkout.assignedAthletes.filter(a => a.assignmentId !== ath.assignmentId);
                            if (updated.length === 0) {
                              setViewingAssignedWorkout(null);
                            } else {
                              setViewingAssignedWorkout({ ...viewingAssignedWorkout, assignedAthletes: updated });
                            }
                          } else {
                            showError('Errore durante la rimozione: ' + (res.error || ''));
                          }
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Rimuovi scheda dall'atleta"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  const tmpl = viewingAssignedWorkout.template;
                  setViewingAssignedWorkout(null);
                  setAssigningWorkout(tmpl);
                }}
                className="px-3.5 py-2 bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-bold rounded-xl hover:bg-[var(--color-primary)]/20 transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Assegna a un altro atleta
              </button>
              <button
                onClick={() => setViewingAssignedWorkout(null)}
                className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white"
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
