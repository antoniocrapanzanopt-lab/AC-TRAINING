import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Search,
  Plus,
  Download,
  UserCheck,
  Archive,
  Trash2,
  Filter,
  X,
  Check,
  AlertTriangle,
  Dumbbell,
  MoreVertical,
  MessageCircle,
  Pencil,
  ExternalLink,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { Athlete, AthleteFormData, AthleteStatus, AthletePaymentStatus } from '../../types';
import { useAthletes } from '../../context/AthletesContext';
import { useWorkouts } from '../../context/WorkoutsContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  AthleteStatusBadge,
  athleteStatusLabel,
  paymentStatusLabel,
} from '../../components/athletes/AthleteBadges';
import { AthleteAdherenceBadge } from '../../components/coach/AthleteAdherenceBadge';
import { fetchBatchAthletesAdherence, AdherenceScoreResult } from '../../services/adherenceService';
import { AthleteModal } from '../../components/athletes/AthleteModal';
import { AthleteDetailPage } from './AthleteDetailPage';

// ─── Types ────────────────────────────────────────────────────────────────────

type SortField = 'fullName' | 'status' | 'createdAt' | 'updatedAt';
type SortDir = 'asc' | 'desc';
type HasWorkoutFilter = '' | 'yes' | 'no';

// ─── Utils ────────────────────────────────────────────────────────────────────

const formatRelativeDate = (dateStr?: string): string => {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '—';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Oggi';
  if (diffDays === 1) return 'Ieri';
  if (diffDays < 7) return `${diffDays} gg fa`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} sett. fa`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} mesi fa`;
  return `${Math.floor(diffDays / 365)} anni fa`;
};

const getInitials = (athlete: Athlete): string => {
  const fn = athlete.firstName?.trim() || '';
  const ln = athlete.lastName?.trim() || '';
  if (fn && ln) return `${fn[0]}${ln[0]}`.toUpperCase();
  const full = athlete.fullName?.trim() || '';
  if (full) return full.slice(0, 2).toUpperCase();
  return '??';
};

const statusDotColor: Record<AthleteStatus, string> = {
  active: 'bg-emerald-500',
  trial: 'bg-amber-400',
  suspended: 'bg-orange-500',
  archived: 'bg-slate-600',
  inactive: 'bg-slate-500',
};

// ─── Confirm Modal ─────────────────────────────────────────────────────────────

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, title, message, onConfirm, onCancel, danger }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl w-full max-w-md shadow-2xl z-10 p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${danger ? 'bg-red-500/15 border border-red-500/30' : 'bg-amber-500/15 border border-amber-500/30'}`}>
            <AlertTriangle className={`w-5 h-5 ${danger ? 'text-red-400' : 'text-amber-400'}`} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">{title}</h3>
            <p className="text-sm text-slate-300 mt-1 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 border border-slate-700 hover:bg-slate-800 transition-colors">
            Annulla
          </button>
          <button onClick={onConfirm} className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${danger ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-[var(--color-primary)] text-black hover:bg-[var(--color-primary-hover)]'}`}>
            Conferma
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Row Overflow Menu ─────────────────────────────────────────────────────────

interface RowMenuProps {
  athlete: Athlete;
  onOpen: () => void;
  onEdit: () => void;
  onWhatsApp: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

const RowMenu: React.FC<RowMenuProps> = ({ athlete, onOpen, onEdit, onWhatsApp, onArchive, onDelete }) => {
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
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
        className={`p-2 rounded-xl transition-all ${open ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}
        aria-label="Azioni atleta"
        title="Azioni"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-30 py-1 overflow-hidden">
          <button onClick={act(onOpen)} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors text-left">
            <ExternalLink className="w-4 h-4 text-[var(--color-primary)]" />
            Apri profilo
          </button>
          <button onClick={act(onEdit)} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors text-left">
            <Pencil className="w-4 h-4 text-slate-400" />
            Modifica dati
          </button>
          {athlete.phone && (
            <button onClick={act(onWhatsApp)} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-emerald-400 hover:bg-slate-800 transition-colors text-left">
              <MessageCircle className="w-4 h-4" />
              Apri su WhatsApp
            </button>
          )}
          <div className="border-t border-slate-800 my-1" />
          <button onClick={act(onArchive)} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-amber-400 hover:bg-slate-800 transition-colors text-left">
            <Archive className="w-4 h-4" />
            Archivia atleta
          </button>
          <button onClick={act(onDelete)} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors text-left">
            <Trash2 className="w-4 h-4" />
            Elimina profilo
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Pagina Principale ─────────────────────────────────────────────────────────

export const AthletesPage: React.FC = () => {
  const {
    athletes,
    selectedAthleteId,
    setSelectedAthleteId,
    addAthlete,
    updateAthlete,
    deleteAthlete,
    archiveAthlete,
    assignCoach,
    exportCsv,
  } = useAthletes();
  const { allAssignedWorkouts = [], coachTemplates = [] } = useWorkouts();
  const { user } = useAuth();
  const { showSuccess, showError, showInfo } = useToast();

  // ─── Ricerca e filtri ──────────────────────────────────────────────────────
  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<AthleteStatus | ''>('');
  const [filterPayment, setFilterPayment] = useState<AthletePaymentStatus | ''>('');
  const [filterCoach, setFilterCoach] = useState('');
  const [filterHasWorkout, setFilterHasWorkout] = useState<HasWorkoutFilter>('');
  const [showFilters, setShowFilters] = useState(false);

  // ─── Ordinamento ──────────────────────────────────────────────────────────
  const [sortField, setSortField] = useState<SortField>('fullName');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon: React.FC<{ field: SortField }> = ({ field }) => {
    if (field !== sortField) return <ChevronUp className="w-3 h-3 text-slate-600" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-[var(--color-primary)]" />
      : <ChevronDown className="w-3 h-3 text-[var(--color-primary)]" />;
  };

  // ─── Selezione multipla ───────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback((filteredList: Athlete[]) => {
    if (selectedIds.size === filteredList.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredList.map(a => a.id)));
  }, [selectedIds.size]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // ─── Modali ───────────────────────────────────────────────────────────────
  const [isAthleteModalOpen, setIsAthleteModalOpen] = useState(false);
  const [editingAthlete, setEditingAthlete] = useState<Athlete | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean; title: string; message: string; onConfirm: () => void; danger?: boolean;
  }>({ open: false, title: '', message: '', onConfirm: () => undefined });

  const closeConfirm = () => setConfirmModal(prev => ({ ...prev, open: false }));

  // ─── Caricamento Indice Aderenza per tutti gli atleti (Single Source of Truth Consolidata) ───
  const [adherenceMap, setAdherenceMap] = useState<Record<string, AdherenceScoreResult>>({});

  useEffect(() => {
    if (!athletes || athletes.length === 0) return;
    let isMounted = true;

    const ids = athletes.map((a) => a.id).filter(Boolean);
    fetchBatchAthletesAdherence(ids).then((batchMap) => {
      if (isMounted) {
        setAdherenceMap((prev) => ({ ...prev, ...batchMap }));
      }
    });

    return () => { isMounted = false; };
  }, [athletes]);

  // ─── Lista filtrata e ordinata ────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return athletes
      .filter(a => {
        if (q) {
          const haystack = `${a.fullName} ${a.email} ${a.phone}`.toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        if (filterStatus && a.status !== filterStatus) return false;
        if (filterPayment && a.paymentStatus !== filterPayment) return false;
        if (filterCoach && a.assignedCoachName !== filterCoach) return false;
        if (filterHasWorkout) {
          const hasWorkout = allAssignedWorkouts.some(w => w.athlete_id === a.id && w.is_active);
          if (filterHasWorkout === 'yes' && !hasWorkout) return false;
          if (filterHasWorkout === 'no' && hasWorkout) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const av = a[sortField] ?? '';
        const bv = b[sortField] ?? '';
        const cmp = String(av).localeCompare(String(bv), 'it');
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [athletes, query, filterStatus, filterPayment, filterCoach, filterHasWorkout, allAssignedWorkouts, sortField, sortDir]);

  const uniqueCoaches = useMemo(
    () => [...new Set(athletes.map(a => a.assignedCoachName).filter(Boolean))].sort() as string[],
    [athletes]
  );
  const isMultiCoach = uniqueCoaches.length > 1;

  const hasActiveFilters = query || filterStatus || filterPayment || filterCoach || filterHasWorkout;
  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;
  const someSelected = selectedIds.size > 0;

  const clearFilters = () => {
    setQuery('');
    setFilterStatus('');
    setFilterPayment('');
    setFilterCoach('');
    setFilterHasWorkout('');
  };

  // ─── Azioni ───────────────────────────────────────────────────────────────

  const handleSaveAthlete = async (data: AthleteFormData) => {
    if (editingAthlete) {
      const ok = await updateAthlete(editingAthlete.id, data);
      ok
        ? showSuccess('Atleta aggiornato', `${data.firstName} ${data.lastName} è stato modificato.`)
        : showError('Errore', 'Impossibile aggiornare l\'atleta.');
    } else {
      const added = await addAthlete(data);
      if (added) {
        showSuccess('Atleta aggiunto', `${data.firstName} ${data.lastName} è stato aggiunto.`);
      } else {
        showError('Errore Database', 'Controlla la console per i dettagli.');
      }
    }
    setEditingAthlete(null);
  };

  const handleEdit = (athlete: Athlete) => {
    setEditingAthlete(athlete);
    setIsAthleteModalOpen(true);
  };

  const handleArchive = (athlete: Athlete) => {
    setConfirmModal({
      open: true,
      title: 'Archiviare atleta?',
      message: `${athlete.fullName || 'L\'atleta'} verrà spostato negli archivi e rimosso dalla lista attiva.`,
      danger: false,
      onConfirm: async () => {
        await archiveAthlete(athlete.id);
        closeConfirm();
        showInfo('Archiviato', `${athlete.fullName || 'Atleta'} archiviato.`);
      },
    });
  };

  const handleDelete = (athlete: Athlete) => {
    setConfirmModal({
      open: true,
      title: `Eliminare ${athlete.fullName || 'questo atleta'}?`,
      message: `Questa operazione rimuoverà definitivamente il profilo e tutti i dati dal database.`,
      danger: true,
      onConfirm: async () => {
        const ok = await deleteAthlete(athlete.id);
        closeConfirm();
        if (ok) showSuccess('Atleta eliminato', `Il profilo è stato rimosso.`);
        else showError('Errore', 'Impossibile eliminare l\'atleta.');
      },
    });
  };

  const handleWhatsApp = (athlete: Athlete) => {
    if (!athlete.phone) return;
    const msg = `Ciao ${athlete.firstName || athlete.fullName}, ti contatto dal centro.`;
    window.open(`https://wa.me/${athlete.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleDeleteSelected = () => {
    setConfirmModal({
      open: true,
      title: `Eliminare ${selectedIds.size} atleti?`,
      message: 'Questa operazione rimuove definitivamente i profili selezionati.',
      danger: true,
      onConfirm: async () => {
        let count = 0;
        for (const id of Array.from(selectedIds)) { if (await deleteAthlete(id)) count++; }
        clearSelection();
        closeConfirm();
        showSuccess('Atleti eliminati', `${count} atleti rimossi.`);
      },
    });
  };

  const handleArchiveSelected = () => {
    setConfirmModal({
      open: true,
      title: `Archiviare ${selectedIds.size} atleti?`,
      message: 'Gli atleti selezionati verranno spostati negli archivi.',
      danger: false,
      onConfirm: async () => {
        let count = 0;
        for (const id of Array.from(selectedIds)) { if (await archiveAthlete(id)) count++; }
        clearSelection();
        closeConfirm();
        showSuccess('Atleti archiviati', `${count} atleti archiviati.`);
      },
    });
  };

  const handleAssignCoachSelected = async () => {
    if (!user?.id) return;
    let count = 0;
    for (const id of Array.from(selectedIds)) {
      if (await assignCoach(id, user.id, user.name)) count++;
    }
    clearSelection();
    showInfo('Coach assegnato', `${user.name} assegnato a ${count} atleti.`);
  };

  const handleExportCsv = () => {
    const csv = exportCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `atleti_export_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showSuccess('Esportazione completata', `${athletes.length} atleti esportati.`);
  };

  // ─── Render: Dettaglio Atleta ─────────────────────────────────────────────

  if (selectedAthleteId) {
    return (
      <AthleteDetailPage
        athleteId={selectedAthleteId}
        onBack={() => setSelectedAthleteId(null)}
      />
    );
  }

  // ─── Render: Lista ────────────────────────────────────────────────────────

  const ThSort: React.FC<{ field: SortField; label: string; className?: string }> = ({ field, label, className }) => (
    <th className={`px-5 py-3.5 text-left ${className ?? ''}`}>
      <button
        onClick={() => handleSort(field)}
        className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-white uppercase tracking-widest transition-colors"
      >
        {label}
        <SortIcon field={field} />
      </button>
    </th>
  );

  return (
    <div className="space-y-4">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Gestione Atleti</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {athletes.length} {athletes.length === 1 ? 'atleta' : 'atleti'} totali
            {filtered.length !== athletes.length && ` · ${filtered.length} visualizzati`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-400 border border-slate-700 hover:bg-slate-800 hover:text-white transition-colors"
            title="Esporta atleti in CSV"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Esporta CSV</span>
          </button>
          <button
            onClick={() => { setEditingAthlete(null); setIsAthleteModalOpen(true); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-black font-extrabold text-xs hover:bg-[var(--color-primary-hover)] transition-colors shadow-md shadow-[var(--color-primary)]/20"
          >
            <Plus className="w-4 h-4" />
            <span>Nuovo Atleta</span>
          </button>
        </div>
      </div>

      {/* ── Ricerca + Filtri ───────────────────────────────────────────────── */}
      <div className="bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-xl p-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Cerca per nome, email o telefono…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-[var(--color-panel-border)] text-white text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors placeholder-slate-600"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${showFilters || hasActiveFilters ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filtri</span>
            {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] shrink-0" />}
          </button>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-red-400 border border-red-500/30 hover:bg-red-950/30 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-2 border-t border-[var(--color-panel-border)]">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as AthleteStatus | '')}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-[var(--color-panel-border)] text-white text-sm focus:outline-none focus:border-[var(--color-primary)]"
            >
              <option value="">Tutti gli stati</option>
              {(Object.keys(athleteStatusLabel) as AthleteStatus[]).map(s => (
                <option key={s} value={s}>{athleteStatusLabel[s]}</option>
              ))}
            </select>

            <select
              value={filterPayment}
              onChange={e => setFilterPayment(e.target.value as AthletePaymentStatus | '')}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-[var(--color-panel-border)] text-white text-sm focus:outline-none focus:border-[var(--color-primary)]"
            >
              <option value="">Tutti i pagamenti</option>
              {(Object.keys(paymentStatusLabel) as AthletePaymentStatus[]).map(s => (
                <option key={s} value={s}>{paymentStatusLabel[s]}</option>
              ))}
            </select>

            <select
              value={filterHasWorkout}
              onChange={e => setFilterHasWorkout(e.target.value as HasWorkoutFilter)}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-[var(--color-panel-border)] text-white text-sm focus:outline-none focus:border-[var(--color-primary)]"
            >
              <option value="">Tutte le schede</option>
              <option value="yes">Con scheda assegnata</option>
              <option value="no">Senza scheda</option>
            </select>

            {isMultiCoach && (
              <select
                value={filterCoach}
                onChange={e => setFilterCoach(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-[var(--color-panel-border)] text-white text-sm focus:outline-none focus:border-[var(--color-primary)]"
              >
                <option value="">Tutti i coach</option>
                {uniqueCoaches.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </div>
        )}
      </div>

      {/* ── Bulk Actions Bar (contestuale) ────────────────────────────────── */}
      {someSelected && (
        <div className="flex items-center gap-2 flex-wrap bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 rounded-xl px-4 py-3 animate-in fade-in slide-in-from-top-1 duration-200">
          <span className="text-xs font-extrabold text-[var(--color-primary)]">
            {selectedIds.size} {selectedIds.size === 1 ? 'selezionato' : 'selezionati'}
          </span>
          <div className="flex-1 border-l border-[var(--color-primary)]/30 pl-3 flex items-center gap-2 flex-wrap">
            <button onClick={handleArchiveSelected} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-300 border border-amber-500/30 hover:bg-amber-950/40 transition-colors">
              <Archive className="w-3.5 h-3.5" /> Archivia
            </button>
            <button onClick={handleAssignCoachSelected} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-sky-300 border border-sky-500/30 hover:bg-sky-950/40 transition-colors">
              <UserCheck className="w-3.5 h-3.5" /> Assegna a me
            </button>
            <button onClick={handleDeleteSelected} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-400 border border-red-500/30 hover:bg-red-950/40 transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Elimina
            </button>
            <button onClick={clearSelection} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition-colors ml-auto">
              <X className="w-3.5 h-3.5" /> Deseleziona
            </button>
          </div>
        </div>
      )}

      {/* ── Lista ─────────────────────────────────────────────────────────── */}
      <div className="bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-xl overflow-hidden">

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-[var(--color-panel-border)] bg-slate-900/50">
              <tr>
                {/* Checkbox */}
                <th className="px-5 py-3.5 w-10">
                  <button
                    onClick={() => toggleSelectAll(filtered)}
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${allSelected ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : 'border-slate-600 hover:border-[var(--color-primary)]'}`}
                  >
                    {allSelected && <Check className="w-3 h-3 text-black" />}
                  </button>
                </th>
                <ThSort field="fullName" label="Atleta" />
                <ThSort field="status" label="Stato" />
                <th className="px-4 py-3.5 text-left">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Aderenza</span>
                </th>
                <th className="px-5 py-3.5 text-left">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Scheda</span>
                </th>
                <ThSort field="updatedAt" label="Ultima attività" />
                <th className="px-5 py-3.5 w-14" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-panel-border)]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center">
                        <Search className="w-6 h-6 text-slate-600" />
                      </div>
                      <p className="text-slate-400 text-sm font-medium">
                        {hasActiveFilters
                          ? 'Nessun atleta corrisponde ai filtri applicati.'
                          : 'Nessun atleta. Aggiungine uno con "Nuovo Atleta".'}
                      </p>
                      {hasActiveFilters && (
                        <button onClick={clearFilters} className="text-xs text-[var(--color-primary)] font-bold hover:underline">
                          Rimuovi filtri
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(athlete => {
                  const isSelected = selectedIds.has(athlete.id);
                  const activeWorkouts = allAssignedWorkouts.filter(a => a.athlete_id === athlete.id && a.is_active);
                  const firstWorkout = activeWorkouts[0];
                  const workoutTemplate = firstWorkout
                    ? (firstWorkout.workout || coachTemplates.find(t => t.id === firstWorkout.workout_id))
                    : null;
                  const isOverdue = athlete.paymentStatus === 'overdue';
                  const initials = getInitials(athlete);
                  const dot = statusDotColor[athlete.status] ?? 'bg-slate-600';

                  return (
                    <tr
                      key={athlete.id}
                      onClick={() => setSelectedAthleteId(athlete.id)}
                      className={`cursor-pointer transition-colors group ${isSelected ? 'bg-[var(--color-primary)]/5' : 'hover:bg-slate-900/50'}`}
                    >
                      {/* Checkbox */}
                      <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => toggleSelect(athlete.id)}
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : 'border-slate-600 hover:border-[var(--color-primary)]'}`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-black" />}
                        </button>
                      </td>

                      {/* Atleta */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          <div className={`relative w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-xs text-white shrink-0 group-hover:border-[var(--color-primary)]/30 transition-colors`}>
                            {initials}
                            <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--color-panel)] ${dot}`} />
                          </div>
                          {/* Info */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-white text-sm leading-tight truncate group-hover:text-[var(--color-primary)] transition-colors">
                                {athlete.fullName || `${athlete.firstName || ''} ${athlete.lastName || ''}`.trim() || 'Atleta'}
                              </span>
                              {isOverdue && (
                                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 ring-2 ring-red-500/20" title="Pagamento in ritardo" />
                              )}
                            </div>
                            <span className="text-xs text-slate-500 truncate block">
                              {athlete.email || athlete.phone || '—'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Stato */}
                      <td className="px-5 py-4">
                        <AthleteStatusBadge status={athlete.status} />
                      </td>

                      {/* Aderenza */}
                      <td className="px-4 py-4">
                        <AthleteAdherenceBadge adherence={adherenceMap[athlete.id]} size="sm" />
                      </td>

                      {/* Scheda */}
                      <td className="px-5 py-4">
                        {workoutTemplate ? (
                          <div className="flex items-center gap-1.5">
                            <Dumbbell className="w-3.5 h-3.5 text-[var(--color-primary)] shrink-0" />
                            <span className="text-xs font-semibold text-slate-200 truncate max-w-[160px]">
                              {workoutTemplate.title || 'Scheda'}
                            </span>
                            {activeWorkouts.length > 1 && (
                              <span className="text-[10px] text-slate-500 font-bold">+{activeWorkouts.length - 1}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-600 italic">Nessuna scheda</span>
                        )}
                      </td>

                      {/* Ultima attività */}
                      <td className="px-5 py-4">
                        <span className={`text-xs font-medium ${
                          (() => {
                            const d = athlete.updatedAt || athlete.createdAt;
                            if (!d) return 'text-slate-600';
                            const diffDays = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
                            if (diffDays <= 1) return 'text-emerald-400';
                            if (diffDays <= 7) return 'text-slate-300';
                            if (diffDays <= 30) return 'text-slate-400';
                            return 'text-slate-600';
                          })()
                        }`}>
                          {formatRelativeDate(athlete.updatedAt || athlete.createdAt)}
                        </span>
                      </td>

                      {/* Menu ⋮ */}
                      <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                        <RowMenu
                          athlete={athlete}
                          onOpen={() => setSelectedAthleteId(athlete.id)}
                          onEdit={() => handleEdit(athlete)}
                          onWhatsApp={() => handleWhatsApp(athlete)}
                          onArchive={() => handleArchive(athlete)}
                          onDelete={() => handleDelete(athlete)}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Mobile Card List ───────────────────────────────────────────── */}
        <div className="md:hidden divide-y divide-[var(--color-panel-border)]">
          {filtered.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-slate-400 text-sm">
                {hasActiveFilters ? 'Nessun atleta corrisponde ai filtri.' : 'Nessun atleta presente.'}
              </p>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-xs text-[var(--color-primary)] font-bold hover:underline">
                  Rimuovi filtri
                </button>
              )}
            </div>
          ) : (
            filtered.map(athlete => {
              const isSelected = selectedIds.has(athlete.id);
              const activeWorkouts = allAssignedWorkouts.filter(a => a.athlete_id === athlete.id && a.is_active);
              const firstWorkout = activeWorkouts[0];
              const workoutTemplate = firstWorkout
                ? (firstWorkout.workout || coachTemplates.find(t => t.id === firstWorkout.workout_id))
                : null;
              const isOverdue = athlete.paymentStatus === 'overdue';
              const initials = getInitials(athlete);
              const dot = statusDotColor[athlete.status] ?? 'bg-slate-600';

              return (
                <div
                  key={athlete.id}
                  onClick={() => setSelectedAthleteId(athlete.id)}
                  className={`px-4 py-4 cursor-pointer transition-colors ${isSelected ? 'bg-[var(--color-primary)]/5' : 'hover:bg-slate-900/30'}`}
                >
                  <div className="flex items-center gap-3">
                    {/* Checkbox */}
                    <button
                      onClick={e => { e.stopPropagation(); toggleSelect(athlete.id); }}
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : 'border-slate-600'}`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-black" />}
                    </button>

                    {/* Avatar */}
                    <div className={`relative w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-sm text-white shrink-0`}>
                      {initials}
                      <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--color-panel)] ${dot}`} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-semibold text-white text-sm truncate">
                          {athlete.fullName || `${athlete.firstName || ''} ${athlete.lastName || ''}`.trim() || 'Atleta'}
                        </span>
                        {isOverdue && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" title="Pagamento in ritardo" />}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <AthleteStatusBadge status={athlete.status} />
                        {workoutTemplate ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                            <Dumbbell className="w-3 h-3 text-[var(--color-primary)]" />
                            {workoutTemplate.title || 'Scheda'}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-600 italic">Nessuna scheda</span>
                        )}
                      </div>
                    </div>

                    {/* Menu */}
                    <div onClick={e => e.stopPropagation()}>
                      <RowMenu
                        athlete={athlete}
                        onOpen={() => setSelectedAthleteId(athlete.id)}
                        onEdit={() => handleEdit(athlete)}
                        onWhatsApp={() => handleWhatsApp(athlete)}
                        onArchive={() => handleArchive(athlete)}
                        onDelete={() => handleDelete(athlete)}
                      />
                    </div>
                  </div>

                  {/* Ultima attività */}
                  <p className="text-[11px] text-slate-600 mt-2 pl-[calc(1rem+2.5rem+0.75rem)]">
                    Ultima attività: {formatRelativeDate(athlete.updatedAt || athlete.createdAt)}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Footer conta risultati */}
        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-[var(--color-panel-border)] bg-slate-900/30 flex items-center justify-between">
            <p className="text-[11px] text-slate-500 font-medium">
              {filtered.length} {filtered.length === 1 ? 'atleta' : 'atleti'}{filtered.length !== athletes.length ? ` su ${athletes.length}` : ''}
            </p>
            {someSelected && (
              <p className="text-[11px] text-[var(--color-primary)] font-bold">
                {selectedIds.size} selezionati
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Modali ────────────────────────────────────────────────────────── */}
      <AthleteModal
        isOpen={isAthleteModalOpen}
        onClose={() => { setIsAthleteModalOpen(false); setEditingAthlete(null); }}
        onSave={handleSaveAthlete}
        editingAthlete={editingAthlete}
      />

      <ConfirmModal
        isOpen={confirmModal.open}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeConfirm}
        danger={confirmModal.danger}
      />
    </div>
  );
};
