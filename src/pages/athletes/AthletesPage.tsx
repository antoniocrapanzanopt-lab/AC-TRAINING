import React, { useState, useMemo, useCallback } from 'react';
import {
  Search,
  Plus,
  Download,
  UserCheck,
  Archive,
  Trash2,
  ChevronUp,
  ChevronDown,
  Filter,
  X,
  Check,
  AlertTriangle,
  Eye,
  Dumbbell,
} from 'lucide-react';
import { Athlete, AthleteFormData, AthleteStatus, AthletePaymentStatus } from '../../types';
import { useAthletes } from '../../context/AthletesContext';
import { useWorkouts } from '../../context/WorkoutsContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { AthleteStatusBadge, PaymentStatusBadge, athleteStatusLabel, paymentStatusLabel } from '../../components/athletes/AthleteBadges';
import { AthleteModal } from '../../components/athletes/AthleteModal';
import { AthleteDetailPage } from './AthleteDetailPage';

// ─── Ordinamento ───────────────────────────────────────────────────────────────

type SortField = 'fullName' | 'status' | 'paymentStatus' | 'assignedCoachName' | 'createdAt';
type SortDir = 'asc' | 'desc';

const sortIcon = (field: SortField, current: SortField, dir: SortDir) => {
  if (field !== current) return <ChevronUp className="w-3 h-3 text-slate-600" />;
  return dir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-[var(--color-primary)]" />
    : <ChevronDown className="w-3 h-3 text-[var(--color-primary)]" />;
};

// ─── Modale Conferma ───────────────────────────────────────────────────────────

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

  // Ricerca e filtri
  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<AthleteStatus | ''>('');
  const [filterPayment, setFilterPayment] = useState<AthletePaymentStatus | ''>('');
  const [filterCoach, setFilterCoach] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Ordinamento
  const [sortField, setSortField] = useState<SortField>('fullName');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Selezione multipla
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modali
  const [isAthleteModalOpen, setIsAthleteModalOpen] = useState(false);
  const [editingAthlete, setEditingAthlete] = useState<Athlete | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  }>({ open: false, title: '', message: '', onConfirm: () => undefined });

  // (Il blocco Dettaglio Atleta è stato spostato in basso per rispettare le Rules of Hooks)

  // ─── Lista Filtrata e Ordinata ───────────────────────────────────────────────

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
        return true;
      })
      .sort((a, b) => {
        const av = a[sortField] ?? '';
        const bv = b[sortField] ?? '';
        const cmp = String(av).localeCompare(String(bv), 'it');
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [athletes, query, filterStatus, filterPayment, filterCoach, sortField, sortDir]);

  const uniqueCoaches = useMemo(
    () => [...new Set(athletes.map(a => a.assignedCoachName))].sort(),
    [athletes]
  );

  // ─── Selezione ───────────────────────────────────────────────────────────────

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(a => a.id)));
    }
  }, [filtered, selectedIds.size]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // ─── Ordinamento ─────────────────────────────────────────────────────────────

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  // ─── Azioni ──────────────────────────────────────────────────────────────────

  const handleSaveAthlete = async (data: AthleteFormData) => {
    if (editingAthlete) {
      const ok = await updateAthlete(editingAthlete.id, data);
      ok ? showSuccess('Atleta aggiornato', `${data.firstName} ${data.lastName} è stato modificato.`)
         : showError('Errore', 'Impossibile aggiornare l\'atleta.');
    } else {
      const added = await addAthlete(data);
      if (added) {
        showSuccess('Atleta aggiunto', `${data.firstName} ${data.lastName} è stato aggiunto.`);
      } else {
        showError('Errore Database', 'Controlla la console per i dettagli. Impossibile salvare su Supabase.');
      }
    }
    setEditingAthlete(null);
  };

  const handleEdit = (athlete: Athlete) => {
    setEditingAthlete(athlete);
    setIsAthleteModalOpen(true);
  };

  const handleDeleteSelected = () => {
    setConfirmModal({
      open: true,
      title: `Eliminare ${selectedIds.size} atleti?`,
      message: 'Questa operazione rimuove definitivamente gli atleti selezionati dalla demo locale. Puoi aggiungerli di nuovo in qualsiasi momento.',
      danger: true,
      onConfirm: async () => {
        let count = 0;
        for (const id of Array.from(selectedIds)) { if (await deleteAthlete(id)) count++; }
        clearSelection();
        setConfirmModal(prev => ({ ...prev, open: false }));
        showSuccess('Atleti eliminati', `${count} atleti rimossi.`);
      },
    });
  };

  const handleArchiveSelected = () => {
    setConfirmModal({
      open: true,
      title: `Archiviare ${selectedIds.size} atleti?`,
      message: 'Gli atleti selezionati verranno archiviati e rimossi dalla lista attiva.',
      danger: false,
      onConfirm: async () => {
        let count = 0;
        for (const id of Array.from(selectedIds)) { if (await archiveAthlete(id)) count++; }
        clearSelection();
        setConfirmModal(prev => ({ ...prev, open: false }));
        showSuccess('Atleti archiviati', `${count} atleti archiviati.`);
      },
    });
  };

  const handleAssignCoachSelected = async () => {
    const ownerName = user?.name ?? 'Coach Demo';
    const ownerId = user?.id ?? 'local-owner';
    let count = 0;
    for (const id of Array.from(selectedIds)) { if (await assignCoach(id, ownerId, ownerName)) count++; }
    clearSelection();
    showInfo('Coach assegnato', `${ownerName} assegnato a ${count} atleti.`);
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
    showSuccess('Esportazione completata', `${athletes.length} atleti esportati in CSV.`);
  };

  const clearFilters = () => {
    setQuery('');
    setFilterStatus('');
    setFilterPayment('');
    setFilterCoach('');
  };

  const hasActiveFilters = query || filterStatus || filterPayment || filterCoach;
  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;
  const someSelected = selectedIds.size > 0;

  // ─── Colonna Ordinabile ───────────────────────────────────────────────────────

  const SortHeader: React.FC<{ field: SortField; label: string }> = ({ field, label }) => (
    <button onClick={() => handleSort(field)}
      className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white transition-colors uppercase tracking-wide">
      {label}
      {sortIcon(field, sortField, sortDir)}
    </button>
  );

  // ─── Render ───────────────────────────────────────────────────────────────────

  if (selectedAthleteId) {
    return (
      <AthleteDetailPage
        athleteId={selectedAthleteId}
        onBack={() => setSelectedAthleteId(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Intestazione */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Gestione Atleti</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {athletes.length} atleti totali · {filtered.length} visualizzati
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-300 border border-slate-700 hover:bg-slate-800 hover:text-white transition-colors">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Esporta CSV</span>
          </button>
          <button onClick={() => { setEditingAthlete(null); setIsAthleteModalOpen(true); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-black font-extrabold text-xs hover:bg-[var(--color-primary-hover)] transition-colors shadow-md shadow-[var(--color-primary)]/20">
            <Plus className="w-4 h-4" />
            <span>Nuovo Atleta</span>
          </button>
        </div>
      </div>

      {/* Barra Ricerca e Filtri */}
      <div className="bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-xl p-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Cerca per nome, cognome, email o telefono..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-[var(--color-panel-border)] text-white text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
            />
          </div>
          <button onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${showFilters || hasActiveFilters ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'border-slate-700 text-slate-300 hover:bg-slate-800'}`}>
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filtri</span>
            {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />}
          </button>
          {hasActiveFilters && (
            <button onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-red-400 border border-red-500/30 hover:bg-red-950/30 transition-colors">
              <X className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-[var(--color-panel-border)]">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as AthleteStatus | '')}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-[var(--color-panel-border)] text-white text-sm focus:outline-none focus:border-[var(--color-primary)]">
              <option value="">Tutti gli stati</option>
              {(Object.keys(athleteStatusLabel) as AthleteStatus[]).map(s => (
                <option key={s} value={s}>{athleteStatusLabel[s]}</option>
              ))}
            </select>
            <select value={filterPayment} onChange={e => setFilterPayment(e.target.value as AthletePaymentStatus | '')}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-[var(--color-panel-border)] text-white text-sm focus:outline-none focus:border-[var(--color-primary)]">
              <option value="">Tutti i pagamenti</option>
              {(Object.keys(paymentStatusLabel) as AthletePaymentStatus[]).map(s => (
                <option key={s} value={s}>{paymentStatusLabel[s]}</option>
              ))}
            </select>
            <select value={filterCoach} onChange={e => setFilterCoach(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-[var(--color-panel-border)] text-white text-sm focus:outline-none focus:border-[var(--color-primary)]">
              <option value="">Tutti i coach</option>
              {uniqueCoaches.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Barra Azioni Selezione Multipla */}
      {someSelected && (
        <div className="flex items-center gap-2 flex-wrap bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 rounded-xl px-4 py-3">
          <span className="text-xs font-bold text-[var(--color-primary)]">
            {selectedIds.size} selezionati
          </span>
          <div className="flex-1 border-l border-[var(--color-primary)]/30 pl-3 flex items-center gap-2 flex-wrap">
            <button onClick={handleArchiveSelected}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-300 border border-amber-500/30 hover:bg-amber-950/40 transition-colors">
              <Archive className="w-3.5 h-3.5" />Archivia
            </button>
            <button onClick={handleAssignCoachSelected}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-sky-300 border border-sky-500/30 hover:bg-sky-950/40 transition-colors">
              <UserCheck className="w-3.5 h-3.5" />Assegna a me
            </button>
            <button onClick={handleDeleteSelected}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-400 border border-red-500/30 hover:bg-red-950/40 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />Elimina
            </button>
            <button onClick={clearSelection}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition-colors ml-auto">
              <X className="w-3.5 h-3.5" />Deseleziona
            </button>
          </div>
        </div>
      )}

      {/* Tabella */}
      <div className="bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-xl overflow-hidden">
        {/* Desktop Table */}
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--color-panel-border)] bg-slate-900/40">
              <tr>
                <th className="px-4 py-3 text-left w-10">
                  <button onClick={toggleSelectAll}
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${allSelected ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : 'border-slate-600 hover:border-[var(--color-primary)]'}`}>
                    {allSelected && <Check className="w-3 h-3 text-black" />}
                  </button>
                </th>
                <th className="px-4 py-3 text-left"><SortHeader field="fullName" label="Atleta" /></th>
                <th className="px-4 py-3 text-left"><SortHeader field="status" label="Stato" /></th>
                <th className="px-4 py-3 text-left"><SortHeader field="paymentStatus" label="Pagamenti" /></th>
                <th className="px-4 py-3 text-left"><span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Scheda Attiva</span></th>
                <th className="px-4 py-3 text-left"><SortHeader field="assignedCoachName" label="Coach" /></th>
                <th className="px-4 py-3 text-left"><SortHeader field="createdAt" label="Iscrizione" /></th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-panel-border)]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-sm">
                    {hasActiveFilters ? 'Nessun atleta corrisponde ai filtri applicati.' : 'Nessun atleta presente. Aggiungine uno con il pulsante "Nuovo Atleta".'}
                  </td>
                </tr>
              ) : (
                filtered.map(athlete => {
                  const isSelected = selectedIds.has(athlete.id);
                  const activeAssigned = allAssignedWorkouts.filter(a => a.athlete_id === athlete.id && a.is_active);

                  return (
                    <tr key={athlete.id}
                      className={`transition-colors ${isSelected ? 'bg-[var(--color-primary)]/5' : 'hover:bg-slate-900/40'}`}>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleSelect(athlete.id)}
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : 'border-slate-600 hover:border-[var(--color-primary)]'}`}>
                          {isSelected && <Check className="w-3 h-3 text-black" />}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span onClick={() => setSelectedAthleteId(athlete.id)}
                            className="font-semibold text-white hover:text-[var(--color-primary)] cursor-pointer transition-colors"
                            title="Apri profilo atleta">
                            {athlete.fullName || `${athlete.firstName || ''} ${athlete.lastName || ''}`.trim() || 'Atleta'}
                          </span>
                          <span className="text-xs text-slate-400">{athlete.email || athlete.phone}</span>
                          {(() => {
                            const safeTags = Array.isArray(athlete.tags) ? athlete.tags : [];
                            return safeTags.length > 0 && (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {safeTags.slice(0, 2).map(tag => (
                                  <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 font-semibold">
                                    {tag}
                                  </span>
                                ))}
                                {safeTags.length > 2 && (
                                  <span className="text-[10px] text-slate-500">+{safeTags.length - 2}</span>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="px-4 py-3"><AthleteStatusBadge status={athlete.status} /></td>
                      <td className="px-4 py-3"><PaymentStatusBadge status={athlete.paymentStatus} /></td>
                      <td className="px-4 py-3">
                        {activeAssigned.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {activeAssigned.map(a => {
                              const tmpl = a.workout || coachTemplates.find(t => t.id === a.workout_id);
                              return (
                                <span
                                  key={a.id}
                                  onClick={() => setSelectedAthleteId(athlete.id)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 cursor-pointer transition-colors"
                                  title={`Assegnata il ${new Date(a.assigned_date).toLocaleDateString('it-IT')}`}
                                >
                                  <Dumbbell className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  <span className="truncate max-w-[130px]">{tmpl?.title || 'Scheda'}</span>
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 italic">Nessuna</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-300">{athlete.assignedCoachName || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-400">{athlete.createdAt ? athlete.createdAt.slice(0, 10) : '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => setSelectedAthleteId(athlete.id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-300 border border-slate-600 hover:bg-slate-800 hover:text-white transition-colors"
                            title="Apri scheda atleta">
                            <Eye className="w-3.5 h-3.5" />Apri
                          </button>
                          <button onClick={() => handleEdit(athlete)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-[var(--color-primary)] border border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/10 transition-colors">
                            Modifica
                          </button>
                          <button
                            onClick={() => {
                              setConfirmModal({
                                open: true,
                                title: 'Archiviare atleta?',
                                message: `${athlete.fullName || 'L\'atleta'} verrà spostato negli archivi.`,
                                danger: false,
                                onConfirm: () => {
                                  archiveAthlete(athlete.id);
                                  setConfirmModal(prev => ({ ...prev, open: false }));
                                  showInfo('Archiviato', `${athlete.fullName || 'Atleta'} archiviato.`);
                                },
                              });
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-950/30 transition-colors"
                            title="Archivia">
                            <Archive className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setConfirmModal({
                                open: true,
                                title: `Eliminare ${athlete.fullName || 'questo atleta'}?`,
                                message: `Sei sicuro di voler eliminare definitivamente il profilo di ${athlete.fullName || 'questo atleta'}? L'operazione rimuoverà tutti i dati e le schede dal database.`,
                                danger: true,
                                onConfirm: async () => {
                                  const ok = await deleteAthlete(athlete.id);
                                  setConfirmModal(prev => ({ ...prev, open: false }));
                                  if (ok) {
                                    showSuccess('Atleta eliminato', `Il profilo di ${athlete.fullName || 'Atleta'} è stato rimosso.`);
                                  } else {
                                    showError('Errore', 'Impossibile eliminare l\'atleta.');
                                  }
                                },
                              });
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                            title="Elimina atleta definitivamente">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List */}
        <div className="md:hidden divide-y divide-[var(--color-panel-border)]">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              {hasActiveFilters ? 'Nessun atleta corrisponde ai filtri.' : 'Nessun atleta presente.'}
            </div>
          ) : (
            filtered.map(athlete => {
              const isSelected = selectedIds.has(athlete.id);
              const activeAssigned = allAssignedWorkouts.filter(a => a.athlete_id === athlete.id && a.is_active);

              return (
                <div key={athlete.id} className={`p-4 space-y-2 ${isSelected ? 'bg-[var(--color-primary)]/5' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <button onClick={() => toggleSelect(athlete.id)}
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : 'border-slate-600'}`}>
                        {isSelected && <Check className="w-3 h-3 text-black" />}
                      </button>
                      <div>
                        <p onClick={() => setSelectedAthleteId(athlete.id)}
                          className="font-bold text-white text-sm hover:text-[var(--color-primary)] cursor-pointer transition-colors">
                          {athlete.fullName || `${athlete.firstName || ''} ${athlete.lastName || ''}`.trim() || 'Atleta'}
                        </p>
                        <p className="text-xs text-slate-400">{athlete.phone || athlete.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => setSelectedAthleteId(athlete.id)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-300 border border-slate-600 hover:bg-slate-800 hover:text-white transition-colors"
                        title="Apri scheda atleta">
                        <Eye className="w-3 h-3" />Apri
                      </button>
                      <button onClick={() => handleEdit(athlete)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-[var(--color-primary)] border border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/10 transition-colors">
                        Modifica
                      </button>
                      <button
                        onClick={() => {
                          setConfirmModal({
                            open: true,
                            title: `Eliminare ${athlete.fullName || 'questo atleta'}?`,
                            message: `Sei sicuro di voler eliminare definitivamente il profilo di ${athlete.fullName || 'questo atleta'}?`,
                            danger: true,
                            onConfirm: async () => {
                              const ok = await deleteAthlete(athlete.id);
                              setConfirmModal(prev => ({ ...prev, open: false }));
                              if (ok) {
                                showSuccess('Atleta eliminato', `Il profilo di ${athlete.fullName || 'Atleta'} è stato rimosso.`);
                              } else {
                                showError('Errore', 'Impossibile eliminare l\'atleta.');
                              }
                            },
                          });
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                        title="Elimina Atleta">
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap items-center">
                    <AthleteStatusBadge status={athlete.status} />
                    <PaymentStatusBadge status={athlete.paymentStatus} />
                    {activeAssigned.length > 0 && activeAssigned.map(a => {
                      const tmpl = a.workout || coachTemplates.find(t => t.id === a.workout_id);
                      return (
                        <span key={a.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                          <Dumbbell className="w-3 h-3 text-amber-400" />
                          <span>{tmpl?.title || 'Scheda'}</span>
                        </span>
                      );
                    })}
                  </div>
                  <p className="text-xs text-slate-400">Coach: {athlete.assignedCoachName || '—'}</p>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modali */}
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
        onCancel={() => setConfirmModal(prev => ({ ...prev, open: false }))}
        danger={confirmModal.danger}
      />
    </div>
  );
};
