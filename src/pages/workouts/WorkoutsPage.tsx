import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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
  ChevronDown,
  ChevronUp,
  FolderOpen,
  MoveRight,
  X,
  Save,
  Clock,
  Users,
  Copy,
  Sparkles,
  ArrowLeft,
  Calendar,
  Layers,
  UserX,
  AlertCircle,
  FileText,
  Filter,
  CheckCircle2,
  Activity,
  PlayCircle,
  ArrowUpDown,
  List,
  LayoutGrid,
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
import { useAthletesWorkoutProgress } from './hooks/useAthletesWorkoutProgress';
import { AthleteWorkoutProgressBar } from './components/AthleteWorkoutProgressBar';
import { AthleteWorkoutTimelineView } from './components/AthleteWorkoutTimelineView';

export type TemplateObjectiveFilter = 'all' | 'hypertrophy' | 'strength' | 'fat_loss' | 'recomp';
export type TemplateDurationFilter = 'all' | '<4' | '4-8' | '>8';
export type TemplateSortOption = 'updated_desc' | 'name_asc' | 'usage_desc' | 'weeks_desc';
export type AthleteWorkoutSortOption = 'progress' | 'last_workout' | 'next_session' | 'end_program' | 'name';
export type AthleteWorkoutSortDirection = 'desc' | 'asc';

export const WorkoutsPage: React.FC = () => {
  const { 
    coachTemplates, 
    folders, 
    allAssignedWorkouts,
    assignWorkoutToAthlete,
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

  // ─── TAB PRINCIPALE: ATLETI vs TEMPLATE MASTER ───
  const [mainViewTab, setMainViewTab] = useState<'athletes' | 'templates'>('athletes');

  // ─── STATO SEZIONE ATLETI ───
  const [selectedAthleteFolderId, setSelectedAthleteFolderId] = useState<string | null>(null);
  const [athleteSearchTerm, setAthleteSearchTerm] = useState('');
  const [athleteFilterStatus, setAthleteFilterStatus] = useState<'all' | 'active_workout' | 'no_workout'>('all');
  const [athleteLayoutMode, setAthleteLayoutMode] = useState<'list' | 'timeline' | 'grid'>('list');
  const [athleteSortBy, setAthleteSortBy] = useState<AthleteWorkoutSortOption>('progress');
  const [athleteSortDir, setAthleteSortDir] = useState<AthleteWorkoutSortDirection>('desc');

  // Dettaglio atleta: Sezione Storico richiudibile (default: chiusa)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Dropdown menu aperti
  const [isAthleteActionMenuOpen, setIsAthleteActionMenuOpen] = useState(false);
  const [isActiveCardMenuOpen, setIsActiveCardMenuOpen] = useState(false);
  const athleteMenuRef = useRef<HTMLDivElement>(null);
  const activeCardMenuRef = useRef<HTMLDivElement>(null);

  // Statistiche dinamiche scheda attiva (settimane, giorni, esercizi)
  const [activeWorkoutStats, setActiveWorkoutStats] = useState<{ days: number; exercises: number } | null>(null);

  // ─── STATO LIBRERIA TEMPLATE MASTER ───
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [templateSearchTerm, setTemplateSearchTerm] = useState('');
  const [templateObjective, setTemplateObjective] = useState<TemplateObjectiveFilter>('all');
  const [templateDuration, setTemplateDuration] = useState<TemplateDurationFilter>('all');
  const [templateSort, setTemplateSort] = useState<TemplateSortOption>('updated_desc');

  // Modali
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [isPDFImporterOpen, setIsPDFImporterOpen] = useState(false);
  const [builderTargetAthleteId, setBuilderTargetAthleteId] = useState<string | undefined>(undefined);
  const [editingWorkout, setEditingWorkout] = useState<WorkoutTemplate | null>(null);
  const [deletingWorkout, setDeletingWorkout] = useState<WorkoutTemplate | null>(null);
  const [assigningWorkout, setAssigningWorkout] = useState<WorkoutTemplate | null>(null);
  const [movingWorkout, setMovingWorkout] = useState<WorkoutTemplate | null>(null);
  const [editingAthleteWorkout, setEditingAthleteWorkout] = useState<{ athleteId: string, workout: WorkoutTemplate } | null>(null);
  
  // Modale Cartelle Master
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<WorkoutFolder | null>(null);
  const [folderNameInput, setFolderNameInput] = useState('');
  const [deletingFolder, setDeletingFolder] = useState<WorkoutFolder | null>(null);

  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingFolder, setIsSavingFolder] = useState(false);
  const [duplicatingWorkoutId, setDuplicatingWorkoutId] = useState<string | null>(null);

  // Listener click outside per i dropdown menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (athleteMenuRef.current && !athleteMenuRef.current.contains(e.target as Node)) {
        setIsAthleteActionMenuOpen(false);
      }
      if (activeCardMenuRef.current && !activeCardMenuRef.current.contains(e.target as Node)) {
        setIsActiveCardMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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

  // Lista atleti attivi
  const activeAthletes = useMemo(() => {
    return athletes.filter(ath => ath.status === 'active' || ath.status === 'trial');
  }, [athletes]);

  // Avanzamento reale degli allenamenti dalle tabelle Supabase (workout_sessions + workout_exercises)
  const { progressMap, retry: retryProgress } = useAthletesWorkoutProgress(
    activeAthletes,
    allAssignedWorkouts
  );

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

  // Filtro Atleti nella lista generale
  const filteredAthleteFolders = useMemo(() => {
    return athleteFoldersData.filter(item => {
      const nameMatch = `${item.athlete.firstName} ${item.athlete.lastName} ${item.athlete.email || ''}`
        .toLowerCase()
        .includes(athleteSearchTerm.toLowerCase()) ||
        (item.activeWorkout?.title?.toLowerCase().includes(athleteSearchTerm.toLowerCase()) ?? false);

      if (!nameMatch) return false;

      if (athleteFilterStatus === 'active_workout') return item.hasActiveWorkout;
      if (athleteFilterStatus === 'no_workout') return !item.hasActiveWorkout;
      return true;
    });
  }, [athleteFoldersData, athleteSearchTerm, athleteFilterStatus]);

  // ─── RIEPILOGO STATISTICHE AVANZAMENTO SQUADRA ───
  const workoutSummaryCounters = useMemo(() => {
    let completedCount = 0;
    let nearEndCount = 0;
    let inProgressCount = 0;
    let notStartedCount = 0;
    let noWorkoutCount = 0;

    athleteFoldersData.forEach((item) => {
      if (!item.hasActiveWorkout) {
        noWorkoutCount++;
        return;
      }
      const progress = progressMap.get(item.athlete.id);
      const status = progress?.programStatus || 'not_started';

      if (status === 'completed') {
        completedCount++;
      } else if (status === 'near_end') {
        nearEndCount++;
      } else if (status === 'in_progress' || status === 'just_started') {
        inProgressCount++;
      } else if (status === 'not_started') {
        notStartedCount++;
      } else {
        noWorkoutCount++;
      }
    });

    return {
      completedCount,
      nearEndCount,
      inProgressCount,
      notStartedCount,
      noWorkoutCount,
    };
  }, [athleteFoldersData, progressMap]);

  // ─── COMPARATORE ORDINAMENTO ATLETI ───
  const compareAthleteFolders = useCallback((a: typeof athleteFoldersData[0], b: typeof athleteFoldersData[0]) => {
    const progA = progressMap.get(a.athlete.id);
    const progB = progressMap.get(b.athlete.id);

    if (athleteSortBy === 'progress') {
      const pctA = progA?.progressPercentage ?? -1;
      const pctB = progB?.progressPercentage ?? -1;
      if (pctA !== pctB) {
        return athleteSortDir === 'desc' ? pctB - pctA : pctA - pctB;
      }
      // A parità di percentuale, usa la data dell'ultimo allenamento (più recente prima)
      const timeA = new Date(progA?.lastWorkoutDateIso || 0).getTime();
      const timeB = new Date(progB?.lastWorkoutDateIso || 0).getTime();
      return timeB - timeA;
    }

    if (athleteSortBy === 'last_workout') {
      const timeA = new Date(progA?.lastWorkoutDateIso || 0).getTime();
      const timeB = new Date(progB?.lastWorkoutDateIso || 0).getTime();
      return athleteSortDir === 'desc' ? timeB - timeA : timeA - timeB;
    }

    if (athleteSortBy === 'next_session') {
      const nextA = progA?.nextSessionLabel || '';
      const nextB = progB?.nextSessionLabel || '';
      return athleteSortDir === 'desc' ? nextA.localeCompare(nextB) : nextB.localeCompare(nextA);
    }

    if (athleteSortBy === 'end_program') {
      const remainingA = (progA?.plannedSessions ?? 0) - (progA?.completedSessions ?? 0);
      const remainingB = (progB?.plannedSessions ?? 0) - (progB?.completedSessions ?? 0);
      return athleteSortDir === 'desc' ? remainingA - remainingB : remainingB - remainingA;
    }

    if (athleteSortBy === 'name') {
      const nameA = `${a.athlete.firstName} ${a.athlete.lastName}`;
      const nameB = `${b.athlete.firstName} ${b.athlete.lastName}`;
      return athleteSortDir === 'desc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    }

    return 0;
  }, [athleteSortBy, athleteSortDir, progressMap]);

  // ─── RAGGRUPPAMENTO IN SEZIONI STRUTTURATE ORDINATE ───
  const {
    reviewAthletes,
    inProgressAthletes,
    notStartedAthletes,
    noWorkoutAthletes,
  } = useMemo(() => {
    const review: typeof athleteFoldersData = [];
    const inProgress: typeof athleteFoldersData = [];
    const notStarted: typeof athleteFoldersData = [];
    const noWorkout: typeof athleteFoldersData = [];

    filteredAthleteFolders.forEach((item) => {
      if (!item.hasActiveWorkout) {
        noWorkout.push(item);
        return;
      }

      const progress = progressMap.get(item.athlete.id);
      const status = progress?.programStatus || 'not_started';

      if (status === 'completed' || status === 'near_end') {
        review.push(item);
      } else if (status === 'in_progress' || status === 'just_started') {
        inProgress.push(item);
      } else if (status === 'not_started') {
        notStarted.push(item);
      } else {
        noWorkout.push(item);
      }
    });

    review.sort(compareAthleteFolders);
    inProgress.sort(compareAthleteFolders);
    notStarted.sort(compareAthleteFolders);
    noWorkout.sort(compareAthleteFolders);

    return {
      reviewAthletes: review,
      inProgressAthletes: inProgress,
      notStartedAthletes: notStarted,
      noWorkoutAthletes: noWorkout,
    };
  }, [filteredAthleteFolders, progressMap, compareAthleteFolders]);

  // Atleta attualmente selezionato
  const selectedAthleteData = useMemo(() => {
    if (!selectedAthleteFolderId) return null;
    const foundInActive = athleteFoldersData.find(item => item.athlete.id === selectedAthleteFolderId);
    if (foundInActive) return foundInActive;

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

  // Schede storiche precedenti dell'atleta selezionato
  const pastAssignments = useMemo(() => {
    if (!selectedAthleteData) return [];
    return selectedAthleteData.allAssignments.filter(
      a => a.id !== selectedAthleteData.activeAssignment?.id && !a.is_active
    );
  }, [selectedAthleteData]);

  // Conteggio atleti con e senza scheda
  const withWorkoutCount = useMemo(() => {
    return athleteFoldersData.filter(a => a.hasActiveWorkout).length;
  }, [athleteFoldersData]);

  const withoutWorkoutCount = useMemo(() => {
    return athleteFoldersData.filter(a => !a.hasActiveWorkout).length;
  }, [athleteFoldersData]);

  // Fetch asincrono statistiche giorni/esercizi della scheda attiva
  useEffect(() => {
    if (!selectedAthleteData?.activeWorkout?.id) {
      setActiveWorkoutStats(null);
      return;
    }
    let isMounted = true;
    supabase
      .from('workout_exercises')
      .select('id, day_name')
      .eq('workout_id', selectedAthleteData.activeWorkout.id)
      .then(({ data, error }) => {
        if (!isMounted || error || !data) return;
        const uniqueDays = new Set(data.map(d => d.day_name).filter(Boolean));
        setActiveWorkoutStats({
          days: uniqueDays.size || 0,
          exercises: data.length || 0,
        });
      });

    return () => {
      isMounted = false;
    };
  }, [selectedAthleteData?.activeWorkout?.id]);

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
    if (templateSearchTerm.trim()) {
      return f.name.toLowerCase().includes(templateSearchTerm.toLowerCase());
    }
    return currentFolderId ? f.parent_id === currentFolderId : !f.parent_id;
  });

  // Filtro e Ordinamento Template Master
  const filteredAndSortedTemplates = useMemo(() => {
    const filtered = coachTemplates.filter(template => {
      // Ricerca
      const matchesSearch = !templateSearchTerm.trim() ||
        template.title.toLowerCase().includes(templateSearchTerm.toLowerCase()) ||
        (template.description?.toLowerCase().includes(templateSearchTerm.toLowerCase()) ?? false);
      if (!matchesSearch) return false;

      // Cartella corrente (se non stiamo cercando)
      if (!templateSearchTerm.trim()) {
        const inFolder = currentFolderId ? template.folder_id === currentFolderId : !template.folder_id;
        if (!inFolder) return false;
      }

      // Filtro Obiettivo
      if (templateObjective !== 'all') {
        const text = `${template.title} ${template.description || ''}`.toLowerCase();
        if (templateObjective === 'hypertrophy' && !(text.includes('ipertrof') || text.includes('massa') || text.includes('hypertroph') || text.includes('push') || text.includes('pull') || text.includes('legs'))) {
          return false;
        }
        if (templateObjective === 'strength' && !(text.includes('forza') || text.includes('strength') || text.includes('power') || text.includes('5x5') || text.includes('pesante'))) {
          return false;
        }
        if (templateObjective === 'fat_loss' && !(text.includes('cut') || text.includes('definizione') || text.includes('dimagr') || text.includes('brucia') || text.includes('hiit') || text.includes('condiziona'))) {
          return false;
        }
        if (templateObjective === 'recomp' && !(text.includes('recomp') || text.includes('ricomposiz') || text.includes('tonific') || text.includes('base'))) {
          return false;
        }
      }

      // Filtro Durata
      if (templateDuration !== 'all') {
        const weeks = template.total_weeks || 4;
        if (templateDuration === '<4' && weeks >= 4) return false;
        if (templateDuration === '4-8' && (weeks < 4 || weeks > 8)) return false;
        if (templateDuration === '>8' && weeks <= 8) return false;
      }

      return true;
    });

    // Ordinamento
    return filtered.sort((a, b) => {
      if (templateSort === 'name_asc') {
        return a.title.localeCompare(b.title);
      }
      if (templateSort === 'usage_desc') {
        const usageA = allAssignedWorkouts.filter(x => x.workout_id === a.id).length;
        const usageB = allAssignedWorkouts.filter(x => x.workout_id === b.id).length;
        return usageB - usageA;
      }
      if (templateSort === 'weeks_desc') {
        return (b.total_weeks || 4) - (a.total_weeks || 4);
      }
      const timeA = new Date(a.updated_at || a.created_at).getTime();
      const timeB = new Date(b.updated_at || b.created_at).getTime();
      return timeB - timeA;
    });
  }, [coachTemplates, currentFolderId, templateSearchTerm, templateObjective, templateDuration, templateSort, allAssignedWorkouts]);

  // Gestione Attivazione Scheda da Storico
  const handleActivateWorkout = async (athleteId: string, workoutId: string) => {
    try {
      const res = await assignWorkoutToAthlete(athleteId, workoutId);
      if (!res.success) throw new Error(res.error);
      showSuccess('Scheda impostata come attiva!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore';
      showError('Impossibile attivare la scheda: ' + msg);
    }
  };

  // Gestione Clonazione per Nuovo Mese
  const handleCloneForNextMonth = async (workout: WorkoutTemplate, athleteId: string) => {
    setDuplicatingWorkoutId(workout.id);
    try {
      const res = await duplicateWorkoutTemplate(workout.id);
      if (!res.success || !res.newWorkoutId) throw new Error(res.error || 'Errore clonazione');
      await assignWorkoutToAthlete(athleteId, res.newWorkoutId);
      showSuccess('Scheda clonata e attivata per il nuovo mese!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore';
      showError('Errore durante la clonazione: ' + msg);
    } finally {
      setDuplicatingWorkoutId(null);
    }
  };

  // Esportazione Scheda in Clipboard
  const handleExportWorkout = (workout: WorkoutTemplate) => {
    try {
      const exportText = `SCHEDA DI ALLENAMENTO: ${workout.title}\n` +
        `Durata: ${workout.total_weeks || 4} settimane\n` +
        `Descrizione: ${workout.description || 'Nessuna descrizione'}\n` +
        `Data: ${new Date(workout.created_at).toLocaleDateString('it-IT')}`;
      navigator.clipboard.writeText(exportText).then(() => {
        showSuccess('Riepilogo scheda copiato negli appunti!');
      });
    } catch {
      showSuccess('Scheda pronta per la condivisione');
    }
  };

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
      {/* ─── TESTATA PRINCIPALE GLOBALE ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Schede di Allenamento</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Gestisci la scheda attiva e lo storico dei programmi di ogni atleta.
          </p>
        </div>
        
        {/* Solo 2 azioni globali in alto */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button 
            type="button"
            onClick={() => {
              setBuilderTargetAthleteId(undefined);
              setIsPDFImporterOpen(true);
            }}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 bg-purple-600/15 hover:bg-purple-600/25 text-purple-300 text-xs font-bold rounded-xl border border-purple-500/30 transition-all cursor-pointer shadow-sm"
          >
            <FileText className="w-4 h-4 text-purple-400" />
            <span>Importa da PDF</span>
          </button>

          <button 
            type="button"
            onClick={() => {
              setBuilderTargetAthleteId(undefined);
              setEditingWorkout(null);
              setIsBuilderOpen(true);
            }}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-slate-950 text-xs font-black rounded-xl hover:bg-[var(--color-primary-hover)] active:scale-95 transition-all shadow-md shadow-[var(--color-primary)]/20 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Nuova Scheda</span>
          </button>
        </div>
      </div>

      {/* ─── SWITCHER VISTE: ATLETI vs TEMPLATE MASTER ─── */}
      <div className="flex items-center gap-2 p-1 bg-slate-950 border border-slate-800 rounded-2xl max-w-md shadow-inner">
        <button
          type="button"
          onClick={() => {
            setMainViewTab('athletes');
            setSelectedAthleteFolderId(null);
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer select-none ${
            mainViewTab === 'athletes'
              ? 'bg-[var(--color-primary)] text-slate-950 shadow-md shadow-[var(--color-primary)]/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Atleti ({activeAthletes.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setMainViewTab('templates')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer select-none ${
            mainViewTab === 'templates'
              ? 'bg-[var(--color-primary)] text-slate-950 shadow-md shadow-[var(--color-primary)]/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Template Master ({coachTemplates.length})</span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* VISTA 1: SEZIONE ATLETI                                            */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {mainViewTab === 'athletes' && (
        <div className="space-y-5">
          {/* Se un atleta è selezionato: PAGINA DETTAGLIO ATLETA */}
          {selectedAthleteData ? (
            <div className="bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-3xl p-5 sm:p-7 space-y-7 shadow-xl animate-in fade-in duration-200">
              {/* Header Atleta Selezionato */}
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => setSelectedAthleteFolderId(null)}
                    className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold shrink-0 shadow-sm"
                    title="Torna alla lista atleti"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Torna agli atleti</span>
                  </button>

                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[var(--color-primary)] text-slate-950 font-black text-base sm:text-lg flex items-center justify-center shadow-md shadow-[var(--color-primary)]/20 shrink-0">
                    {selectedAthleteData.athlete.firstName.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl sm:text-2xl font-black text-white truncate">
                        {selectedAthleteData.athlete.firstName} {selectedAthleteData.athlete.lastName}
                      </h2>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full capitalize ${
                        selectedAthleteData.hasActiveWorkout
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                      }`}>
                        {selectedAthleteData.hasActiveWorkout ? (selectedAthleteData.athlete.status || 'Attivo') : 'Senza scheda'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 flex items-center gap-2 flex-wrap mt-0.5">
                      <span>{selectedAthleteData.athlete.email || 'Nessuna email'}</span>
                      <span>•</span>
                      <span>{selectedAthleteData.hasActiveWorkout ? '1 scheda attiva' : 'Nessuna scheda attiva'}</span>
                      <span>•</span>
                      <span>{selectedAthleteData.totalWorkouts} {selectedAthleteData.totalWorkouts === 1 ? 'programma archiviato' : 'programmi archiviati'}</span>
                    </p>
                  </div>
                </div>

                {/* Azioni Header Atleta */}
                <div className="flex items-center gap-2 self-stretch lg:self-auto flex-wrap">
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
                    <span>Nuova scheda per {selectedAthleteData.athlete.firstName}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setBuilderTargetAthleteId(selectedAthleteData.athlete.id);
                      setIsPDFImporterOpen(true);
                    }}
                    className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-purple-600/15 hover:bg-purple-600/25 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all cursor-pointer shadow-sm"
                  >
                    <FileText className="w-4 h-4 text-purple-400" />
                    <span>Importa scheda</span>
                  </button>

                  {/* Menu a comparsa Altre azioni ▾ */}
                  <div className="relative" ref={athleteMenuRef}>
                    <button
                      type="button"
                      onClick={() => setIsAthleteActionMenuOpen(prev => !prev)}
                      className="px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                    >
                      <span>Altre azioni</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isAthleteActionMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isAthleteActionMenuOpen && (
                      <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-950/98 backdrop-blur-2xl border border-slate-800 p-2 shadow-2xl z-50 space-y-1 animate-in fade-in">
                        <button
                          type="button"
                          onClick={() => {
                            setIsAthleteActionMenuOpen(false);
                            setMainViewTab('templates');
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-900 flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <Layers className="w-4 h-4 text-[var(--color-primary)]" />
                          <span>Assegna da Template Master</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsAthleteActionMenuOpen(false);
                            setActiveTab('atleti');
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-900 flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <Users className="w-4 h-4 text-sky-400" />
                          <span>Visualizza Profilo Atleta</span>
                        </button>

                        {/* Pulizia copie private non master */}
                        {(() => {
                          const privateNonMaster = selectedAthleteData.allAssignments.filter(
                            a => a.workout && !a.workout.is_template && a.id !== selectedAthleteData.activeAssignment?.id
                          );
                          if (privateNonMaster.length === 0) return null;

                          return (
                            <>
                              <div className="my-1 border-t border-slate-800/80" />
                              <button
                                type="button"
                                onClick={async () => {
                                  setIsAthleteActionMenuOpen(false);
                                  if (confirm(`Vuoi eliminare tutte le ${privateNonMaster.length} schede storiche non presenti nei Template Master dall'archivio di ${selectedAthleteData.athlete.firstName}?`)) {
                                    for (const pa of privateNonMaster) {
                                      if (pa.workout_id) {
                                        await unassignWorkoutFromAthlete(selectedAthleteData.athlete.id, pa.workout_id, true);
                                      }
                                    }
                                    showSuccess('Archivio ripulito!', `Rimosse ${privateNonMaster.length} schede non master.`);
                                  }
                                }}
                                className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4 text-rose-400" />
                                <span>Elimina schede non master ({privateNonMaster.length})</span>
                              </button>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SEZIONE 1: SCHEDA ATTIVA (CARD PRINCIPALE) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[var(--color-primary)]" />
                    <span>Scheda Attiva</span>
                  </h3>
                </div>

                {selectedAthleteData.activeWorkout ? (
                  <div className="p-6 rounded-3xl bg-slate-900/60 backdrop-blur-xl border border-[var(--color-primary)]/50 shadow-2xl shadow-[var(--color-primary)]/5 space-y-5">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h4 className="text-lg sm:text-xl font-black text-white">
                            {selectedAthleteData.activeWorkout.title}
                          </h4>
                          <span className="px-2.5 py-0.5 rounded-full bg-[var(--color-primary)] text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-sm">
                            Attiva
                          </span>
                        </div>
                        {selectedAthleteData.activeWorkout.description && (
                          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed mt-1">
                            {selectedAthleteData.activeWorkout.description}
                          </p>
                        )}
                      </div>

                      <div className="bg-slate-950/90 border border-slate-800 px-4 py-2 rounded-2xl text-xs font-mono font-black text-[var(--color-primary)] shrink-0 shadow-inner">
                        {selectedAthleteData.activeWorkout.total_weeks || 4} settimane
                      </div>
                    </div>

                    {/* Riepilogo Sintetico */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <div className="px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono font-bold flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>
                          {selectedAthleteData.activeWorkout.total_weeks || 4} settimane
                          {activeWorkoutStats ? ` · ${activeWorkoutStats.days} giorni · ${activeWorkoutStats.exercises} esercizi` : ''}
                        </span>
                      </div>

                      <div className="px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-xs font-medium">
                        Assegnata il {new Date(selectedAthleteData.activeAssignment?.assigned_date || Date.now()).toLocaleDateString('it-IT')}
                      </div>

                      <div className="px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-xs font-medium">
                        Aggiornata {selectedAthleteData.activeWorkout.updated_at ? new Date(selectedAthleteData.activeWorkout.updated_at).toLocaleDateString('it-IT') : 'recentemente'}
                      </div>
                    </div>

                    {/* Avanzamento Allenamenti Reale */}
                    <AthleteWorkoutProgressBar
                      hasActiveWorkout={true}
                      workoutTitle={selectedAthleteData.activeWorkout.title}
                      totalWeeks={selectedAthleteData.activeWorkout.total_weeks || 4}
                      progress={progressMap.get(selectedAthleteData.athlete.id)}
                      onRetry={retryProgress}
                    />

                    {/* Azioni Card: 1 Azione Primaria ("Modifica scheda") e menu "Altro ▾" */}
                    <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-800/80">
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
                        className="px-5 py-2.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-slate-950 font-black text-xs flex items-center gap-2 transition-all shadow-md shadow-[var(--color-primary)]/20 cursor-pointer active:scale-95"
                      >
                        <Pencil className="w-4 h-4" />
                        <span>Modifica scheda</span>
                      </button>

                      {/* Menu compatto Altro ▾ */}
                      <div className="relative" ref={activeCardMenuRef}>
                        <button
                          type="button"
                          onClick={() => setIsActiveCardMenuOpen(prev => !prev)}
                          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-colors border border-slate-800 cursor-pointer"
                        >
                          <span>Altro</span>
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isActiveCardMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isActiveCardMenuOpen && (
                          <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-slate-950/98 backdrop-blur-2xl border border-slate-800 p-2 shadow-2xl z-50 space-y-1 animate-in fade-in">
                            <button
                              type="button"
                              onClick={() => {
                                setIsActiveCardMenuOpen(false);
                                if (selectedAthleteData.activeWorkout) {
                                  handleCloneForNextMonth(selectedAthleteData.activeWorkout, selectedAthleteData.athlete.id);
                                }
                              }}
                              className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-900 flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <Copy className="w-4 h-4 text-sky-400" />
                              <span>Clona per nuovo mese</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setIsActiveCardMenuOpen(false);
                                if (selectedAthleteData.activeWorkout) {
                                  handleDuplicateWorkout(selectedAthleteData.activeWorkout);
                                }
                              }}
                              className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-900 flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <Copy className="w-4 h-4 text-blue-400" />
                              <span>Duplica scheda</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setIsActiveCardMenuOpen(false);
                                setIsHistoryOpen(true);
                              }}
                              className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-900 flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <Folder className="w-4 h-4 text-purple-400" />
                              <span>Visualizza storico</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setIsActiveCardMenuOpen(false);
                                if (selectedAthleteData.activeWorkout) {
                                  handleExportWorkout(selectedAthleteData.activeWorkout);
                                }
                              }}
                              className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-900 flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <FileText className="w-4 h-4 text-emerald-400" />
                              <span>Esporta scheda</span>
                            </button>

                            <div className="my-1 border-t border-slate-800/80" />

                            <button
                              type="button"
                              onClick={async () => {
                                setIsActiveCardMenuOpen(false);
                                if (selectedAthleteData.activeWorkout && confirm(`Vuoi scollegare questa scheda da ${selectedAthleteData.athlete.firstName}?`)) {
                                  await unassignWorkoutFromAthlete(selectedAthleteData.athlete.id, selectedAthleteData.activeWorkout.id);
                                  showSuccess('Scheda scollegata con successo.');
                                }
                              }}
                              className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <UserX className="w-4 h-4 text-rose-400" />
                              <span>Scollega atleta</span>
                            </button>
                          </div>
                        )}
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
                    <div className="flex items-center justify-center gap-3 pt-2">
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
                      <button
                        type="button"
                        onClick={() => setMainViewTab('templates')}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer border border-slate-700"
                      >
                        Scegli da Template Master
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* SEZIONE 2: STORICO PROGRAMMI (RICHIUDIBILE) */}
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80">
                  <div>
                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                      <Folder className="w-4 h-4 text-blue-400" />
                      <span>Storico programmi</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {!isHistoryOpen ? (
                        pastAssignments.length === 0
                          ? 'Nessun programma precedente'
                          : pastAssignments.length === 1
                          ? '1 programma precedente'
                          : `${pastAssignments.length} programmi precedenti`
                      ) : (
                        `${pastAssignments.length} ${pastAssignments.length === 1 ? 'programma archiviato' : 'programmi archiviati'}`
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsHistoryOpen(prev => !prev)}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700 shadow-sm"
                  >
                    <span>{isHistoryOpen ? 'Nascondi storico' : 'Mostra storico'}</span>
                    {isHistoryOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Lista compatta quando lo storico è aperto */}
                {isHistoryOpen && (
                  <div className="space-y-2 pt-1 animate-in fade-in">
                    {pastAssignments.length === 0 ? (
                      <div className="p-8 text-center bg-slate-900/20 border border-slate-800 rounded-2xl text-slate-500 text-xs">
                        Nessun programma precedente archiviato per questo atleta.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {pastAssignments.map(assignment => {
                          const w = assignment.workout;
                          if (!w) return null;

                          return (
                            <div
                              key={assignment.id}
                              className="p-4 rounded-2xl bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-sm font-black text-white truncate">{w.title}</h4>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                                    Archiviata
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 flex-wrap font-medium">
                                  <span>{w.total_weeks || 4} settimane</span>
                                  <span>•</span>
                                  <span>Assegnata il {assignment.assigned_date ? new Date(assignment.assigned_date).toLocaleDateString('it-IT') : '-'}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingAthleteWorkout({
                                      athleteId: selectedAthleteData.athlete.id,
                                      workout: w
                                    });
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer border border-slate-700"
                                >
                                  Apri
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleActivateWorkout(selectedAthleteData.athlete.id, w.id)}
                                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 font-bold text-xs transition-colors cursor-pointer border border-slate-800 hover:border-emerald-500/30"
                                  title="Imposta come scheda attiva"
                                >
                                  Rendi Attiva
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDuplicateWorkout(w)}
                                  className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                                  title="Duplica"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (confirm(`Rimuovere "${w.title}" dallo storico di ${selectedAthleteData.athlete.firstName}?`)) {
                                      await unassignWorkoutFromAthlete(selectedAthleteData.athlete.id, w.id, !w.is_template);
                                      showSuccess('Scheda rimossa dallo storico.');
                                    }
                                  }}
                                  className="p-2 rounded-xl hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                                  title="Rimuovi dallo storico"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* LISTA GENERALE ATLETI */
            <div className="space-y-5">
              {/* ─── 1. RIEPILOGO STATO PROGRAMMI SQUADRA ─── */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between shadow-sm">
                  <div className="min-w-0">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block truncate">Programmi completati</span>
                    <span className="text-xl font-black text-emerald-400 font-mono">{workoutSummaryCounters.completedCount}</span>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between shadow-sm">
                  <div className="min-w-0">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block truncate">In chiusura</span>
                    <span className="text-xl font-black text-amber-400 font-mono">{workoutSummaryCounters.nearEndCount}</span>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between shadow-sm">
                  <div className="min-w-0">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block truncate">In corso</span>
                    <span className="text-xl font-black text-sky-400 font-mono">{workoutSummaryCounters.inProgressCount}</span>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                    <Activity className="w-4 h-4" />
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between shadow-sm">
                  <div className="min-w-0">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block truncate">Da iniziare</span>
                    <span className="text-xl font-black text-slate-300 font-mono">{workoutSummaryCounters.notStartedCount}</span>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                    <PlayCircle className="w-4 h-4" />
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between shadow-sm col-span-2 sm:col-span-1">
                  <div className="min-w-0">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block truncate">Senza scheda</span>
                    <span className="text-xl font-black text-rose-400 font-mono">{workoutSummaryCounters.noWorkoutCount}</span>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* ─── 2. BARRA RICERCA, FILTRI DI STATO E NUOVA SCHEDA ─── */}
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-[var(--color-panel)] border border-[var(--color-panel-border)] p-3.5 rounded-2xl shadow-sm">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cerca atleta o scheda..."
                    value={athleteSearchTerm}
                    onChange={(e) => setAthleteSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-[var(--color-primary)] placeholder:text-slate-500"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {/* Filtri Rapidi Stato Scheda */}
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
                      Con Scheda ({withWorkoutCount})
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
                      Senza Scheda ({withoutWorkoutCount})
                    </button>
                  </div>

                  {/* Pulsante rapido Nuova Scheda per atleta */}
                  <button
                    type="button"
                    onClick={() => {
                      setBuilderTargetAthleteId(undefined);
                      setEditingWorkout(null);
                      setIsBuilderOpen(true);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-[var(--color-primary)] text-slate-950 font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Nuova scheda</span>
                  </button>
                </div>
              </div>

              {/* ─── 3. BARRA CONTROLLI ORDINAMENTO & MODALITÀ VISTA ─── */}
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
                {/* Selettore Criterio Ordinamento */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 mr-1 flex items-center gap-1">
                    <ArrowUpDown className="w-3 h-3 text-amber-400" />
                    <span>Ordina per:</span>
                  </span>

                  {[
                    { id: 'progress', label: 'Avanzamento' },
                    { id: 'last_workout', label: 'Ultimo allenamento' },
                    { id: 'next_session', label: 'Prossima sessione' },
                    { id: 'end_program', label: 'Fine programma' },
                    { id: 'name', label: 'Nome' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setAthleteSortBy(opt.id as AthleteWorkoutSortOption)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        athleteSortBy === opt.id
                          ? 'bg-[var(--color-primary)] text-slate-950 font-black shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Selettore Direzione e Vista */}
                <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
                  {/* Direzione */}
                  <div className="inline-flex bg-slate-900 p-1 rounded-xl border border-slate-800 gap-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setAthleteSortDir('desc')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        athleteSortDir === 'desc'
                          ? 'bg-slate-800 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Mostra per primi gli atleti con percentuale più alta"
                    >
                      Dal più vicino alla fine
                    </button>
                    <button
                      type="button"
                      onClick={() => setAthleteSortDir('asc')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        athleteSortDir === 'asc'
                          ? 'bg-slate-800 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Mostra per primi gli atleti con percentuale più bassa"
                    >
                      Dal più lontano dalla fine
                    </button>
                  </div>

                  {/* Toggle Vista: Lista vs Timeline vs Griglia */}
                  <div className="inline-flex bg-slate-900 p-1 rounded-xl border border-slate-800 gap-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setAthleteLayoutMode('list')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        athleteLayoutMode === 'list'
                          ? 'bg-[var(--color-primary)] text-slate-950 font-black shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <List className="w-3.5 h-3.5" />
                      <span>Lista</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAthleteLayoutMode('timeline')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        athleteLayoutMode === 'timeline'
                          ? 'bg-[var(--color-primary)] text-slate-950 font-black shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Timeline</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAthleteLayoutMode('grid')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        athleteLayoutMode === 'grid'
                          ? 'bg-[var(--color-primary)] text-slate-950 font-black shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>Griglia</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* ─── 4. VISTA TIMELINE ALTERNATIVA CRONOLOGICA ─── */}
              {athleteLayoutMode === 'timeline' ? (
                <AthleteWorkoutTimelineView
                  athleteFolders={filteredAthleteFolders}
                  progressMap={progressMap}
                  onSelectAthlete={(id) => setSelectedAthleteFolderId(id)}
                  onAssignWorkout={(id) => {
                    setBuilderTargetAthleteId(id);
                    setEditingWorkout(null);
                    setIsBuilderOpen(true);
                  }}
                  onRetryProgress={retryProgress}
                />
              ) : (
                /* ─── 5. VISTA STRUTTURATA A SEZIONI LOGICHE (LISTA E GRIGLIA) ─── */
                <div className="space-y-6">
                  {/* Intestazione Colonne se in modalità lista */}
                  {athleteLayoutMode === 'list' && filteredAthleteFolders.length > 0 && (
                    <div className="hidden lg:grid grid-cols-12 gap-4 px-5 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-800/80">
                      <div className="col-span-4">Atleta & Contatto</div>
                      <div className="col-span-6">Scheda Attiva & Avanzamento</div>
                      <div className="col-span-2 text-right">Azione</div>
                    </div>
                  )}

                  {/* SEZIONE 1: PROGRAMMI DA REVISIONARE */}
                  {reviewAthletes.length > 0 && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Programmi da Revisionare</span>
                            </h3>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              {reviewAthletes.length}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">Atleti con programma completato o vicini alla fine</p>
                        </div>
                      </div>
                      <div className={athleteLayoutMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-2"}>
                        {reviewAthletes.map((item) => {
                          const ath = item.athlete;
                          const hasActive = item.hasActiveWorkout;
                          const progress = progressMap.get(ath.id);

                          if (athleteLayoutMode === 'grid') {
                            return (
                              <div
                                key={ath.id}
                                onClick={() => setSelectedAthleteFolderId(ath.id)}
                                className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/70 hover:border-[var(--color-primary)]/60 rounded-3xl p-5 shadow-lg hover:shadow-xl transition-all flex flex-col justify-between group cursor-pointer space-y-4"
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

                                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full capitalize shrink-0 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                      {progress?.programStatusLabel || 'Completato'}
                                    </span>
                                  </div>

                                  <AthleteWorkoutProgressBar
                                    hasActiveWorkout={hasActive}
                                    workoutTitle={item.activeWorkout?.title}
                                    totalWeeks={item.activeWorkout?.total_weeks || 4}
                                    progress={progress}
                                    onRetry={retryProgress}
                                  />
                                </div>

                                <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-800/60">
                                  <span className="text-slate-400 font-medium">
                                    {item.totalWorkouts} {item.totalWorkouts === 1 ? 'scheda totale' : 'schede totali'}
                                  </span>
                                  <span className="text-[11px] font-black text-[var(--color-primary)] group-hover:translate-x-1 transition-transform flex items-center gap-1">
                                    <span>Apri</span>
                                    <span>→</span>
                                  </span>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={ath.id}
                              onClick={() => setSelectedAthleteFolderId(ath.id)}
                              className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/70 hover:border-[var(--color-primary)]/60 rounded-2xl p-3.5 sm:p-4 shadow-sm hover:shadow-xl transition-all grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 items-center group cursor-pointer"
                            >
                              <div className="lg:col-span-4 flex items-center gap-3.5 min-w-0">
                                <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary)] text-slate-950 font-black text-sm flex items-center justify-center shadow-md shadow-[var(--color-primary)]/15 shrink-0 group-hover:scale-105 transition-transform">
                                  {ath.firstName.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-black text-white truncate group-hover:text-[var(--color-primary)] transition-colors">
                                      {ath.firstName} {ath.lastName}
                                    </h3>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize shrink-0 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                      {progress?.programStatusLabel || 'Completato'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-400 truncate mt-0.5">
                                    {ath.email || 'Senza email'}
                                  </p>
                                </div>
                              </div>

                              <div className="lg:col-span-6 min-w-0">
                                <AthleteWorkoutProgressBar
                                  hasActiveWorkout={hasActive}
                                  workoutTitle={item.activeWorkout?.title}
                                  totalWeeks={item.activeWorkout?.total_weeks || 4}
                                  progress={progress}
                                  onRetry={retryProgress}
                                />
                              </div>

                              <div className="lg:col-span-2 flex justify-end">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedAthleteFolderId(ath.id);
                                  }}
                                  className="w-full lg:w-auto px-4 py-2 rounded-xl bg-slate-800 group-hover:bg-[var(--color-primary)] text-slate-300 group-hover:text-slate-950 font-black text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm group-hover:shadow-md cursor-pointer"
                                >
                                  <span>Apri</span>
                                  <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* SEZIONE 2: PROGRAMMI IN CORSO */}
                  {inProgressAthletes.length > 0 && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xs font-black uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                              <Activity className="w-3.5 h-3.5" />
                              <span>Programmi in Corso</span>
                            </h3>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30">
                              {inProgressAthletes.length}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">Atleti ordinati per percentuale di avanzamento</p>
                        </div>
                      </div>
                      <div className={athleteLayoutMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-2"}>
                        {inProgressAthletes.map((item) => {
                          const ath = item.athlete;
                          const hasActive = item.hasActiveWorkout;
                          const progress = progressMap.get(ath.id);

                          if (athleteLayoutMode === 'grid') {
                            return (
                              <div
                                key={ath.id}
                                onClick={() => setSelectedAthleteFolderId(ath.id)}
                                className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/70 hover:border-[var(--color-primary)]/60 rounded-3xl p-5 shadow-lg hover:shadow-xl transition-all flex flex-col justify-between group cursor-pointer space-y-4"
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

                                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full capitalize shrink-0 bg-sky-500/10 text-sky-400 border border-sky-500/20">
                                      {progress?.programStatusLabel || 'In corso'}
                                    </span>
                                  </div>

                                  <AthleteWorkoutProgressBar
                                    hasActiveWorkout={hasActive}
                                    workoutTitle={item.activeWorkout?.title}
                                    totalWeeks={item.activeWorkout?.total_weeks || 4}
                                    progress={progress}
                                    onRetry={retryProgress}
                                  />
                                </div>

                                <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-800/60">
                                  <span className="text-slate-400 font-medium">
                                    {item.totalWorkouts} {item.totalWorkouts === 1 ? 'scheda totale' : 'schede totali'}
                                  </span>
                                  <span className="text-[11px] font-black text-[var(--color-primary)] group-hover:translate-x-1 transition-transform flex items-center gap-1">
                                    <span>Apri</span>
                                    <span>→</span>
                                  </span>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={ath.id}
                              onClick={() => setSelectedAthleteFolderId(ath.id)}
                              className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/70 hover:border-[var(--color-primary)]/60 rounded-2xl p-3.5 sm:p-4 shadow-sm hover:shadow-xl transition-all grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 items-center group cursor-pointer"
                            >
                              <div className="lg:col-span-4 flex items-center gap-3.5 min-w-0">
                                <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary)] text-slate-950 font-black text-sm flex items-center justify-center shadow-md shadow-[var(--color-primary)]/15 shrink-0 group-hover:scale-105 transition-transform">
                                  {ath.firstName.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-black text-white truncate group-hover:text-[var(--color-primary)] transition-colors">
                                      {ath.firstName} {ath.lastName}
                                    </h3>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize shrink-0 bg-sky-500/10 text-sky-400 border border-sky-500/20">
                                      {progress?.programStatusLabel || 'In corso'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-400 truncate mt-0.5">
                                    {ath.email || 'Senza email'}
                                  </p>
                                </div>
                              </div>

                              <div className="lg:col-span-6 min-w-0">
                                <AthleteWorkoutProgressBar
                                  hasActiveWorkout={hasActive}
                                  workoutTitle={item.activeWorkout?.title}
                                  totalWeeks={item.activeWorkout?.total_weeks || 4}
                                  progress={progress}
                                  onRetry={retryProgress}
                                />
                              </div>

                              <div className="lg:col-span-2 flex justify-end">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedAthleteFolderId(ath.id);
                                  }}
                                  className="w-full lg:w-auto px-4 py-2 rounded-xl bg-slate-800 group-hover:bg-[var(--color-primary)] text-slate-300 group-hover:text-slate-950 font-black text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm group-hover:shadow-md cursor-pointer"
                                >
                                  <span>Apri</span>
                                  <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* SEZIONE 3: DA INIZIARE */}
                  {notStartedAthletes.length > 0 && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                              <PlayCircle className="w-3.5 h-3.5 text-slate-400" />
                              <span>Da Iniziare</span>
                            </h3>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                              {notStartedAthletes.length}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">Atleti con scheda ma nessun allenamento completato</p>
                        </div>
                      </div>
                      <div className={athleteLayoutMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-2"}>
                        {notStartedAthletes.map((item) => {
                          const ath = item.athlete;
                          const hasActive = item.hasActiveWorkout;
                          const progress = progressMap.get(ath.id);

                          if (athleteLayoutMode === 'grid') {
                            return (
                              <div
                                key={ath.id}
                                onClick={() => setSelectedAthleteFolderId(ath.id)}
                                className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/70 hover:border-[var(--color-primary)]/60 rounded-3xl p-5 shadow-lg hover:shadow-xl transition-all flex flex-col justify-between group cursor-pointer space-y-4"
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

                                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full capitalize shrink-0 bg-slate-800 text-slate-300 border border-slate-700">
                                      Non iniziato
                                    </span>
                                  </div>

                                  <AthleteWorkoutProgressBar
                                    hasActiveWorkout={hasActive}
                                    workoutTitle={item.activeWorkout?.title}
                                    totalWeeks={item.activeWorkout?.total_weeks || 4}
                                    progress={progress}
                                    onRetry={retryProgress}
                                  />
                                </div>

                                <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-800/60">
                                  <span className="text-slate-400 font-medium">
                                    {item.totalWorkouts} {item.totalWorkouts === 1 ? 'scheda totale' : 'schede totali'}
                                  </span>
                                  <span className="text-[11px] font-black text-[var(--color-primary)] group-hover:translate-x-1 transition-transform flex items-center gap-1">
                                    <span>Apri</span>
                                    <span>→</span>
                                  </span>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={ath.id}
                              onClick={() => setSelectedAthleteFolderId(ath.id)}
                              className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/70 hover:border-[var(--color-primary)]/60 rounded-2xl p-3.5 sm:p-4 shadow-sm hover:shadow-xl transition-all grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 items-center group cursor-pointer"
                            >
                              <div className="lg:col-span-4 flex items-center gap-3.5 min-w-0">
                                <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary)] text-slate-950 font-black text-sm flex items-center justify-center shadow-md shadow-[var(--color-primary)]/15 shrink-0 group-hover:scale-105 transition-transform">
                                  {ath.firstName.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-black text-white truncate group-hover:text-[var(--color-primary)] transition-colors">
                                      {ath.firstName} {ath.lastName}
                                    </h3>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize shrink-0 bg-slate-800 text-slate-300 border border-slate-700">
                                      Non iniziato
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-400 truncate mt-0.5">
                                    {ath.email || 'Senza email'}
                                  </p>
                                </div>
                              </div>

                              <div className="lg:col-span-6 min-w-0">
                                <AthleteWorkoutProgressBar
                                  hasActiveWorkout={hasActive}
                                  workoutTitle={item.activeWorkout?.title}
                                  totalWeeks={item.activeWorkout?.total_weeks || 4}
                                  progress={progress}
                                  onRetry={retryProgress}
                                />
                              </div>

                              <div className="lg:col-span-2 flex justify-end">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedAthleteFolderId(ath.id);
                                  }}
                                  className="w-full lg:w-auto px-4 py-2 rounded-xl bg-slate-800 group-hover:bg-[var(--color-primary)] text-slate-300 group-hover:text-slate-950 font-black text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm group-hover:shadow-md cursor-pointer"
                                >
                                  <span>Apri</span>
                                  <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* SEZIONE 4: SENZA SCHEDA */}
                  {noWorkoutAthletes.length > 0 && athleteFilterStatus !== 'active_workout' && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xs font-black uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                              <span>Senza Scheda</span>
                            </h3>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
                              {noWorkoutAthletes.length}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">Atleti attivi senza programma associato</p>
                        </div>
                      </div>
                      <div className={athleteLayoutMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-2"}>
                        {noWorkoutAthletes.map((item) => {
                          const ath = item.athlete;
                          const progress = progressMap.get(ath.id);

                          if (athleteLayoutMode === 'grid') {
                            return (
                              <div
                                key={ath.id}
                                onClick={() => {
                                  setBuilderTargetAthleteId(ath.id);
                                  setEditingWorkout(null);
                                  setIsBuilderOpen(true);
                                }}
                                className="bg-slate-900/40 backdrop-blur-xl border border-dashed border-slate-800 hover:border-amber-400/60 rounded-3xl p-5 shadow-lg hover:shadow-xl transition-all flex flex-col justify-between group cursor-pointer space-y-4"
                              >
                                <div className="space-y-3">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="w-11 h-11 rounded-2xl bg-slate-800 text-slate-300 font-black text-sm flex items-center justify-center shadow shrink-0 group-hover:scale-105 transition-transform">
                                        {ath.firstName.charAt(0).toUpperCase()}
                                      </div>
                                      <div className="min-w-0">
                                        <h3 className="text-base font-black text-white truncate group-hover:text-amber-300 transition-colors">
                                          {ath.firstName} {ath.lastName}
                                        </h3>
                                        <p className="text-xs text-slate-400 truncate">
                                          {ath.email || 'Senza email'}
                                        </p>
                                      </div>
                                    </div>

                                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full capitalize shrink-0 bg-rose-500/10 text-rose-300 border border-rose-500/20">
                                      Senza scheda
                                    </span>
                                  </div>

                                  <AthleteWorkoutProgressBar
                                    hasActiveWorkout={false}
                                    progress={progress}
                                    onRetry={retryProgress}
                                  />
                                </div>

                                <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-800/60">
                                  <span className="text-slate-500 italic text-[11px]">
                                    Nessuna scheda assegnata
                                  </span>
                                  <span className="text-[11px] font-black text-amber-400 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                                    <span>Assegna</span>
                                    <Plus className="w-3 h-3 stroke-[3]" />
                                  </span>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={ath.id}
                              onClick={() => {
                                setBuilderTargetAthleteId(ath.id);
                                setEditingWorkout(null);
                                setIsBuilderOpen(true);
                              }}
                              className="bg-slate-900/40 backdrop-blur-xl border border-dashed border-slate-800 hover:border-amber-400/60 rounded-2xl p-3.5 sm:p-4 shadow-sm hover:shadow-xl transition-all grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 items-center group cursor-pointer"
                            >
                              <div className="lg:col-span-4 flex items-center gap-3.5 min-w-0">
                                <div className="w-10 h-10 rounded-2xl bg-slate-800 text-slate-300 font-black text-sm flex items-center justify-center shadow shrink-0 group-hover:scale-105 transition-transform">
                                  {ath.firstName.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-black text-white truncate group-hover:text-amber-300 transition-colors">
                                      {ath.firstName} {ath.lastName}
                                    </h3>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize shrink-0 bg-rose-500/10 text-rose-300 border border-rose-500/20">
                                      Senza scheda
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-400 truncate mt-0.5">
                                    {ath.email || 'Senza email'}
                                  </p>
                                </div>
                              </div>

                              <div className="lg:col-span-6 min-w-0">
                                <AthleteWorkoutProgressBar
                                  hasActiveWorkout={false}
                                  progress={progress}
                                  onRetry={retryProgress}
                                />
                              </div>

                              <div className="lg:col-span-2 flex justify-end">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setBuilderTargetAthleteId(ath.id);
                                    setEditingWorkout(null);
                                    setIsBuilderOpen(true);
                                  }}
                                  className="w-full lg:w-auto px-4 py-2 rounded-xl bg-amber-400/15 hover:bg-amber-400 text-amber-300 hover:text-slate-950 font-black text-xs transition-all flex items-center justify-center gap-1.5 border border-amber-400/30 cursor-pointer shadow-sm"
                                >
                                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                                  <span>Assegna scheda</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* STATO VUOTO NESSUN RISULTATO */}
                  {reviewAthletes.length === 0 && inProgressAthletes.length === 0 && notStartedAthletes.length === 0 && (noWorkoutAthletes.length === 0 || athleteFilterStatus === 'active_workout') && (
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
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* VISTA 2: LIBRERIA TEMPLATE MASTER & CARTELLE GLOBALI               */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {mainViewTab === 'templates' && (
        <div className="bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-3xl p-4 sm:p-6 space-y-6 shadow-xl animate-in fade-in duration-200">
          {/* Header Template Master: Breadcrumbs & Azioni Cartella */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-1.5 overflow-x-auto text-sm font-bold custom-scrollbar py-1">
              {getBreadcrumbs().map((crumb, idx, arr) => {
                const isLast = idx === arr.length - 1;
                return (
                  <React.Fragment key={crumb.id || 'root'}>
                    <button
                      type="button"
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

            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={() => {
                  setEditingFolder(null);
                  setFolderNameInput('');
                  setIsFolderModalOpen(true);
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl border border-slate-800 transition-all cursor-pointer shadow-sm"
              >
                <FolderPlus className="w-4 h-4 text-[var(--color-primary)]" />
                <span>Nuova Cartella Master</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setBuilderTargetAthleteId(undefined);
                  setEditingWorkout(null);
                  setIsBuilderOpen(true);
                }}
                className="flex items-center gap-2 px-3.5 py-1.5 bg-[var(--color-primary)] text-slate-950 text-xs font-black rounded-xl hover:bg-[var(--color-primary-hover)] transition-all cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Nuovo Template</span>
              </button>
            </div>
          </div>

          {/* Toolbar Filtri Template: Cerca, Obiettivo, Durata, Ordinamento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
            {/* 1. Cerca Template */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cerca template..."
                value={templateSearchTerm}
                onChange={(e) => setTemplateSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>

            {/* 2. Filtra per Obiettivo */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500 shrink-0" />
              <select
                value={templateObjective}
                onChange={(e) => setTemplateObjective(e.target.value as TemplateObjectiveFilter)}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[var(--color-primary)] cursor-pointer font-bold"
              >
                <option value="all">Tutti gli obiettivi</option>
                <option value="hypertrophy">Ipertrofia / Massa</option>
                <option value="strength">Forza / Powerbuilding</option>
                <option value="fat_loss">Definizione / Cut</option>
                <option value="recomp">Ricomposizione corporea</option>
              </select>
            </div>

            {/* 3. Filtra per Durata */}
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500 shrink-0" />
              <select
                value={templateDuration}
                onChange={(e) => setTemplateDuration(e.target.value as TemplateDurationFilter)}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[var(--color-primary)] cursor-pointer font-bold"
              >
                <option value="all">Tutte le durate</option>
                <option value="<4">&lt; 4 settimane</option>
                <option value="4-8">4 – 8 settimane</option>
                <option value=">8">&gt; 8 settimane</option>
              </select>
            </div>

            {/* 4. Ordina per */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase shrink-0">Ordina:</span>
              <select
                value={templateSort}
                onChange={(e) => setTemplateSort(e.target.value as TemplateSortOption)}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[var(--color-primary)] cursor-pointer font-bold"
              >
                <option value="updated_desc">Ultima modifica</option>
                <option value="name_asc">Nome (A-Z)</option>
                <option value="usage_desc">Più utilizzati</option>
                <option value="weeks_desc">Numero settimane</option>
              </select>
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
                          type="button"
                          onClick={() => {
                            setEditingFolder(folder);
                            setFolderNameInput(folder.name);
                            setIsFolderModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                          title="Rinomina cartella"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingFolder(folder)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 cursor-pointer"
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
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Template Master & Modelli</h3>
              <span className="text-xs text-slate-500">{filteredAndSortedTemplates.length} schede totali</span>
            </div>

            {filteredAndSortedTemplates.length === 0 ? (
              <div className="p-12 text-center text-slate-400 bg-slate-900/20 border border-slate-800 rounded-3xl space-y-3">
                <Dumbbell className="w-10 h-10 mx-auto text-slate-600" />
                <p className="text-sm font-bold text-slate-300">Nessun template corrisponde ai filtri selezionati</p>
                <p className="text-xs text-slate-500">Modifica i termini di ricerca o crea una nuova scheda master.</p>
                <button
                  type="button"
                  onClick={() => {
                    setBuilderTargetAthleteId(undefined);
                    setEditingWorkout(null);
                    setIsBuilderOpen(true);
                  }}
                  className="px-4 py-2 bg-[var(--color-primary)] text-slate-950 font-black text-xs rounded-xl hover:bg-[var(--color-primary-hover)] transition-all cursor-pointer shadow-md"
                >
                  Crea Nuovo Template
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAndSortedTemplates.map(template => {
                  const assignedList = allAssignedWorkouts.filter(a => a.workout_id === template.id);
                  const isDuplicating = duplicatingWorkoutId === template.id;

                  return (
                    <div
                      key={template.id}
                      className="p-5 rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-slate-800/70 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4 shadow-lg"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                            <Dumbbell className="w-5 h-5" />
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap justify-end">
                            {template.estimated_duration_minutes && (
                              <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-lg border border-sky-500/20">
                                <Clock className="w-3 h-3" />
                                {template.estimated_duration_minutes} min
                              </span>
                            )}
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
                              {template.total_weeks || 4} sett.
                            </span>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-base font-black text-white line-clamp-1">{template.title}</h4>
                          <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                            {template.description || 'Nessuna descrizione specificata.'}
                          </p>
                        </div>

                        {/* Informazioni Utilizzi & Ultima Modifica */}
                        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Users className="w-3.5 h-3.5 text-slate-500" />
                            <span className="text-[11px] font-bold">
                              {assignedList.length} {assignedList.length === 1 ? 'atleta in uso' : 'atleti in uso'}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500">
                            Agg. {new Date(template.updated_at || template.created_at).toLocaleDateString('it-IT')}
                          </span>
                        </div>
                      </div>

                      {/* Azioni Card Template: Azione principale ("Apri template") + icone secondarie */}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setAssigningWorkout(template)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                            title="Assegna ad atleta"
                          >
                            <Users className="w-3.5 h-3.5 text-[var(--color-primary)]" />
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

                        {/* Pulsante Principale "Apri template" */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingWorkout(template);
                            setIsBuilderOpen(true);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-[var(--color-primary)] text-slate-950 font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Apri template</span>
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
                type="button"
                onClick={() => setIsFolderModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="button"
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
                type="button"
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
                    type="button"
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
                type="button"
                onClick={() => setDeletingFolder(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white cursor-pointer"
              >
                Annulla
              </button>
              <button 
                type="button"
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
                type="button"
                onClick={() => setDeletingWorkout(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white cursor-pointer"
              >
                Annulla
              </button>
              <button 
                type="button"
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
        targetAthleteId={builderTargetAthleteId || selectedAthleteFolderId || undefined}
        onImportSuccess={async (newWorkoutId) => {
          setIsPDFImporterOpen(false);
          const localMatch = coachTemplates.find((t) => t.id === newWorkoutId);
          if (localMatch) {
            setEditingWorkout(localMatch);
            setIsBuilderOpen(true);
          } else {
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
