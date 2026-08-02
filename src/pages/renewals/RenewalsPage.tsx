import React, { useState, useMemo } from 'react';
import {
  Search,
  RefreshCw,
  User,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Trash2,
} from 'lucide-react';
import { AthleteRenewal, RenewalStatus } from '../../types';
import { useRenewals, ConfirmRenewalParams } from '../../context/RenewalsContext';
import { useToast } from '../../context/ToastContext';
import { getDaysRemaining } from '../../lib/statusEngine';
import { ConfirmRenewalModal } from '../../components/renewals/ConfirmRenewalModal';

const statusLabels: Record<RenewalStatus, { label: string; color: string }> = {
  to_contact: { label: 'Da Contattare', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  contacted: { label: 'Contattato', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  interested: { label: 'Interessato', color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
  evaluating: { label: 'In Valutazione', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  confirmed: { label: 'Confermato', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  renewed: { label: 'Rinnovato', color: 'text-emerald-500 bg-emerald-500/20 border-emerald-500/40 font-black' },
  not_renewed: { label: 'Non Rinnovato', color: 'text-red-400 bg-red-400/10 border-red-400/20' },
  unreachable: { label: 'Irraggiungibile', color: 'text-slate-400 bg-slate-400/10 border-slate-400/20' },
  postponed: { label: 'Rinviato', color: 'text-orange-400 bg-orange-400/10 border-orange-400/20' },
};

export const RenewalsPage: React.FC = () => {
  const { renewals, updateRenewalStatus, confirmRenewal, deleteRenewal } = useRenewals();
  const { showSuccess, showInfo } = useToast();

  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<RenewalStatus | 'all'>('all');

  const [selectedRenewal, setSelectedRenewal] = useState<AthleteRenewal | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{ open: boolean; renewalId: string | null }>({
    open: false,
    renewalId: null,
  });

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return renewals.filter(r => {
      if (q && !r.athleteName.toLowerCase().includes(q) && !r.packageName.toLowerCase().includes(q)) return false;
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      return true;
    }).sort((a, b) => getDaysRemaining(a.endDate) - getDaysRemaining(b.endDate));
  }, [renewals, query, filterStatus]);

  const metrics = useMemo(() => {
    const toContact = renewals.filter(r => r.status === 'to_contact').length;
    const evaluating = renewals.filter(r => r.status === 'evaluating' || r.status === 'contacted' || r.status === 'interested').length;
    const confirmed = renewals.filter(r => r.status === 'confirmed').length;
    const renewed = renewals.filter(r => r.status === 'renewed').length;

    return { toContact, evaluating, confirmed, renewed };
  }, [renewals]);

  const handleStatusChange = (id: string, newStatus: RenewalStatus) => {
    updateRenewalStatus(id, newStatus);
    showInfo('Stato aggiornato', `Rinnovo impostato su "${statusLabels[newStatus].label}".`);
  };

  const handleConfirmRenewalSubmit = (params: ConfirmRenewalParams) => {
    if (confirmRenewal(params)) {
      showSuccess('Rinnovo confermato!', `Rinnovo registrato per ${params.packageName}.`);
    }
  };

  const handleDelete = (id: string) => {
    deleteRenewal(id);
    showInfo('Eliminato', 'Scheda di rinnovo rimossa.');
    setConfirmDeleteModal({ open: false, renewalId: null });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(price);
  };

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return '-';
    return new Date(isoStr).toLocaleDateString('it-IT');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Rinnovi Abbonamenti</h1>
          <p className="text-sm text-slate-400 mt-1">
            Gestisci le trattative di rinnovo e le scadenze dei pacchetti degli atleti.
          </p>
        </div>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl flex flex-col">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Da Contattare</span>
          <span className="text-2xl font-black text-amber-400">{metrics.toContact}</span>
        </div>
        <div className="p-4 rounded-xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl flex flex-col">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> In Valutazione</span>
          <span className="text-2xl font-black text-yellow-400">{metrics.evaluating}</span>
        </div>
        <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/40 shadow-xl flex flex-col">
          <span className="text-xs font-bold text-emerald-500/70 uppercase tracking-wider mb-1 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Confermati</span>
          <span className="text-2xl font-black text-emerald-400">{metrics.confirmed}</span>
        </div>
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800 shadow-xl flex flex-col">
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Rinnovati</span>
          <span className="text-2xl font-black text-emerald-300">{metrics.renewed}</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Cerca per atleta o pacchetto..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-slate-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as any)}
          className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
        >
          <option value="all">Tutti gli stati</option>
          <option value="to_contact">Da Contattare</option>
          <option value="contacted">Contattato</option>
          <option value="interested">Interessato</option>
          <option value="evaluating">In Valutazione</option>
          <option value="confirmed">Confermato</option>
          <option value="renewed">Rinnovato</option>
          <option value="not_renewed">Non Rinnovato</option>
          <option value="unreachable">Irraggiungibile</option>
          <option value="postponed">Rinviato</option>
        </select>
      </div>

      {/* Renewals Grid / List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl shadow-xl">
          <div className="w-16 h-16 rounded-3xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-4 text-slate-500 shadow-inner">
            <RefreshCw className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Nessun rinnovo trovato</h3>
          <p className="text-slate-400 max-w-md mx-auto">
            {query || filterStatus !== 'all'
              ? 'Nessun risultato corrisponde ai filtri impostati.'
              : 'Le schede di rinnovo verranno create ed aggiornate automaticamente alla scadenza degli abbonamenti.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {filtered.map(r => {
            const daysLeft = getDaysRemaining(r.endDate);
            const statusInfo = statusLabels[r.status] || { label: r.status, color: 'text-slate-400 bg-slate-800' };

            return (
              <div
                key={r.id}
                className={`flex flex-col bg-[var(--color-panel)] border rounded-2xl shadow-xl overflow-hidden transition-all ${
                  r.status === 'renewed'
                    ? 'border-emerald-800/40 bg-emerald-950/10'
                    : r.status === 'confirmed'
                    ? 'border-emerald-600/50'
                    : 'border-[var(--color-panel-border)]'
                }`}
              >
                <div className="p-5 flex-1 space-y-4">
                  {/* Top Bar Card */}
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          daysLeft < 0 ? 'bg-red-950 text-red-400 border border-red-900' : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}>
                          {daysLeft < 0 ? `Scaduto da ${Math.abs(daysLeft)} gg` : `${daysLeft} giorni rimasti`}
                        </span>
                      </div>
                      <h3 className="text-lg font-black text-white truncate flex items-center gap-2">
                        <User className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                        {r.athleteName}
                      </h3>
                      <p className="text-xs font-semibold text-slate-400 mt-0.5 truncate">
                        Pacchetto: <strong className="text-slate-200">{r.packageName}</strong>
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xl font-black text-[var(--color-primary)]">{formatPrice(r.price)}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide">Coach: {r.coachName}</p>
                    </div>
                  </div>

                  {/* Dettagli Trattativa e Scadenze */}
                  <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-800 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Scadenza Attuale</span>
                      <span className="font-semibold text-slate-200 flex items-center gap-1.5 mt-0.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        {formatDate(r.endDate)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Ultima Comunicazione</span>
                      <span className="font-semibold text-slate-200 flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        {formatDate(r.lastCommunicationDate)}
                      </span>
                    </div>
                  </div>

                  {/* Prossima Azione e Responsabile */}
                  {(r.nextActionNotes || r.nextActionDate) && (
                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1 text-xs">
                      <div className="flex items-center justify-between text-[10px] font-bold text-[var(--color-primary)] uppercase">
                        <span>Prossima Azione</span>
                        {r.nextActionDate && <span>Entro il: {formatDate(r.nextActionDate)}</span>}
                      </div>
                      <p className="text-slate-300 italic">{r.nextActionNotes || 'Nessun appunto registrato'}</p>
                    </div>
                  )}

                  {/* Note e Responsabile */}
                  <div className="flex justify-between items-center text-xs text-slate-400 pt-1">
                    <span className="flex items-center gap-1 text-[11px]">
                      <UserCheck className="w-3.5 h-3.5 text-slate-500" /> Responsabile: <strong className="text-slate-200">{r.managerName}</strong>
                    </span>
                    {r.notes && <span className="text-[11px] text-slate-500 truncate max-w-[200px]" title={r.notes}>{r.notes}</span>}
                  </div>
                </div>

                {/* Bottom Action Bar */}
                <div className="flex items-center border-t border-[var(--color-panel-border)] bg-slate-900/40">
                  {/* Select Cambio Stato Rapido */}
                  <div className="flex-1 px-3 py-2 border-r border-[var(--color-panel-border)]">
                    <select
                      value={r.status}
                      onChange={e => handleStatusChange(r.id, e.target.value as RenewalStatus)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs font-semibold text-slate-200 px-2 py-1 focus:outline-none focus:border-[var(--color-primary)]"
                    >
                      <option value="to_contact">Da Contattare</option>
                      <option value="contacted">Contattato</option>
                      <option value="interested">Interessato</option>
                      <option value="evaluating">In Valutazione</option>
                      <option value="confirmed">Confermato</option>
                      <option value="renewed">Rinnovato</option>
                      <option value="not_renewed">Non Rinnovato</option>
                      <option value="unreachable">Irraggiungibile</option>
                      <option value="postponed">Rinviato</option>
                    </select>
                  </div>

                  {/* Bottone Conferma Rinnovo */}
                  {r.status !== 'renewed' && (
                    <button
                      onClick={() => { setSelectedRenewal(r); setIsConfirmModalOpen(true); }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold text-emerald-400 hover:text-white hover:bg-emerald-950/30 transition-colors border-r border-[var(--color-panel-border)]"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Conferma Rinnovo
                    </button>
                  )}

                  <button
                    onClick={() => setConfirmDeleteModal({ open: true, renewalId: r.id })}
                    className="px-4 py-3 text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                    title="Elimina Scheda Rinnovo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modale Conferma Rinnovo */}
      <ConfirmRenewalModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmRenewalSubmit}
        renewal={selectedRenewal}
      />

      {/* Modale Conferma Eliminazione */}
      {confirmDeleteModal.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setConfirmDeleteModal({ open: false, renewalId: null })} />
          <div className="relative w-full max-w-sm bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4 text-red-500">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Eliminare Scheda?</h3>
            </div>
            <p className="text-sm text-slate-400 mb-6">Sei sicuro di voler eliminare questa scheda di rinnovo?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteModal({ open: false, renewalId: null })}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={() => confirmDeleteModal.renewalId && handleDelete(confirmDeleteModal.renewalId)}
                className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors"
              >
                Elimina Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
