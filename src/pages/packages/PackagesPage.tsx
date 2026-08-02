import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Copy,
  Edit2,
  Trash2,
  Power,
  PowerOff,
  AlertTriangle,
  Clock,
  Euro,
  CheckCircle2,
  XCircle,
  Tag,
} from 'lucide-react';
import { PackageItem, PackageDurationUnit, PaymentFrequency, PackageFormData } from '../../types';
import { usePackages } from '../../context/PackagesContext';
import { useToast } from '../../context/ToastContext';
import { PackageModal } from '../../components/packages/PackageModal';

const durationUnitLabel: Record<PackageDurationUnit, string> = {
  days: 'Giorni',
  weeks: 'Settimane',
  months: 'Mesi',
  years: 'Anni',
};

const frequencyLabel: Record<PaymentFrequency, string> = {
  single: 'Unico',
  weekly: 'Settimanale',
  monthly: 'Mensile',
  quarterly: 'Trimestrale',
  semiannual: 'Semestrale',
  annual: 'Annuale',
};

export const PackagesPage: React.FC = () => {
  const {
    packages,
    addPackage,
    updatePackage,
    deletePackage,
    duplicatePackage,
    togglePackageActive,
  } = usePackages();
  const { showSuccess, showError, showInfo } = useToast();

  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<PackageItem | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', onConfirm: () => undefined });

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return packages
      .filter((p) => {
        if (q && !p.name.toLowerCase().includes(q) && !p.description?.toLowerCase().includes(q)) return false;
        if (filterStatus === 'active' && !p.isActive) return false;
        if (filterStatus === 'inactive' && p.isActive) return false;
        return true;
      })
      .sort((a, b) => {
        // Prima gli attivi
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        // Poi in ordine alfabetico
        return a.name.localeCompare(b.name);
      });
  }, [packages, query, filterStatus]);

  const handleCreate = (data: PackageFormData) => {
    addPackage(data);
    showSuccess('Pacchetto creato', `Il pacchetto ${data.name} è stato creato.`);
  };

  const handleUpdate = (data: PackageFormData) => {
    if (editingPackage) {
      updatePackage(editingPackage.id, data);
      showSuccess('Pacchetto modificato', `Il pacchetto ${data.name} è stato aggiornato.`);
    }
  };

  const handleDelete = (pkg: PackageItem) => {
    // Demo: qui non controlliamo se il pacchetto è usato negli abbonamenti, 
    // ma in futuro si controllerà "solo se non usato" come da richiesta.
    setConfirmModal({
      open: true,
      title: 'Eliminare pacchetto?',
      message: `Sei sicuro di voler eliminare il pacchetto "${pkg.name}"? L'operazione non è reversibile.`,
      onConfirm: () => {
        if (deletePackage(pkg.id)) {
          showInfo('Pacchetto eliminato', '');
        } else {
          showError('Errore', 'Impossibile eliminare il pacchetto.');
        }
        setConfirmModal(prev => ({ ...prev, open: false }));
      }
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(price);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Pacchetti e Servizi</h1>
          <p className="text-sm text-slate-400 mt-1">Gestisci i piani di abbonamento offerti ai tuoi atleti.</p>
        </div>
        <button
          onClick={() => { setEditingPackage(null); setIsModalOpen(true); }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-primary)] text-black text-sm font-black hover:bg-[var(--color-primary-hover)] transition-all shadow-[0_0_20px_rgba(234,179,8,0.2)] hover:shadow-[0_0_25px_rgba(234,179,8,0.4)]"
        >
          <Plus className="w-4 h-4" /> Nuovo Pacchetto
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Cerca per nome o descrizione..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-slate-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
          className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
        >
          <option value="all">Tutti gli stati</option>
          <option value="active">Solo Attivi</option>
          <option value="inactive">Solo Disattivati</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl shadow-xl">
          <div className="w-16 h-16 rounded-3xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-4 text-slate-500 shadow-inner">
            <Tag className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Nessun pacchetto trovato</h3>
          <p className="text-slate-400 max-w-md mx-auto">
            {query || filterStatus !== 'all'
              ? 'Nessun risultato corrisponde ai filtri impostati. Prova a modificare la ricerca.'
              : 'Inizia creando il tuo primo pacchetto di abbonamento per i tuoi atleti.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filtered.map(pkg => (
            <div key={pkg.id} className={`flex flex-col bg-[var(--color-panel)] border rounded-2xl shadow-xl overflow-hidden transition-all ${pkg.isActive ? 'border-[var(--color-panel-border)]' : 'border-slate-800/50 opacity-75'}`}>
              <div className="p-5 flex-1 space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {pkg.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-400/10 border border-emerald-400/20">
                          <CheckCircle2 className="w-3 h-3" /> Attivo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-400/10 border border-slate-400/20">
                          <XCircle className="w-3 h-3" /> Disattivato
                        </span>
                      )}
                      {pkg.discountType !== 'none' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary)] bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20">
                          Sconto {pkg.discountType === 'percentage' ? `${pkg.discountValue}%` : formatPrice(pkg.discountValue || 0)}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-black text-white truncate" title={pkg.name}>{pkg.name}</h3>
                    {pkg.description && <p className="text-sm text-slate-400 mt-1 line-clamp-2">{pkg.description}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xl font-black text-[var(--color-primary)]">{formatPrice(pkg.price)}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide">
                      {pkg.installments > 1 ? `${pkg.installments} rate ${frequencyLabel[pkg.paymentFrequency].toLowerCase()}` : 'Pagamento unico'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-800">
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span>{pkg.duration} {durationUnitLabel[pkg.durationUnit]}</span>
                  </div>
                  {pkg.setupFee ? (
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <Euro className="w-4 h-4 text-slate-500" />
                      <span>Quota iniz.: {formatPrice(pkg.setupFee)}</span>
                    </div>
                  ) : <div />}
                </div>

                {pkg.includedServices.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Servizi Inclusi</p>
                    <div className="flex flex-wrap gap-1.5">
                      {pkg.includedServices.map((srv, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[11px] text-slate-300">
                          {srv}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center border-t border-[var(--color-panel-border)] bg-slate-900/30">
                <button
                  onClick={() => { setEditingPackage(pkg); setIsModalOpen(true); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors border-r border-[var(--color-panel-border)]"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Modifica
                </button>
                <button
                  onClick={() => {
                    const dupe = duplicatePackage(pkg.id);
                    if (dupe) {
                      showSuccess('Duplicato', `Pacchetto copiato come "${dupe.name}".`);
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors border-r border-[var(--color-panel-border)]"
                >
                  <Copy className="w-3.5 h-3.5" /> Duplica
                </button>
                <button
                  onClick={() => {
                    togglePackageActive(pkg.id);
                    showInfo(pkg.isActive ? 'Disattivato' : 'Attivato', `Il pacchetto è ora ${pkg.isActive ? 'inattivo' : 'attivo'}.`);
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold transition-colors border-r border-[var(--color-panel-border)] ${
                    pkg.isActive ? 'text-amber-400/70 hover:text-amber-400 hover:bg-amber-950/30' : 'text-emerald-400/70 hover:text-emerald-400 hover:bg-emerald-950/30'
                  }`}
                >
                  {pkg.isActive ? <><PowerOff className="w-3.5 h-3.5" /> Disattiva</> : <><Power className="w-3.5 h-3.5" /> Attiva</>}
                </button>
                <button
                  onClick={() => handleDelete(pkg)}
                  className="px-4 py-3 text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                  title="Elimina"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <PackageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={editingPackage ? handleUpdate : handleCreate}
        editingPackage={editingPackage}
      />

      {confirmModal.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setConfirmModal(prev => ({ ...prev, open: false }))} />
          <div className="relative w-full max-w-sm bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-white">{confirmModal.title}</h3>
            </div>
            <p className="text-sm text-slate-400 mb-6">{confirmModal.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, open: false }))}
                className="px-4 py-2 rounded-xl text-sm font-bold text-slate-300 hover:text-white transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors"
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
