import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Edit2,
  RefreshCw,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  Calendar,
  FileText,
} from 'lucide-react';
import { AthleteSubscription, SubscriptionStatus } from '../../types';
import { useSubscriptions } from '../../context/SubscriptionsContext';
import { usePayments } from '../../context/PaymentsContext';
import { useRenewals } from '../../context/RenewalsContext';
import { useToast } from '../../context/ToastContext';
import { SubscriptionModal } from '../../components/subscriptions/SubscriptionModal';
import { SubscriptionPauseModal } from '../../components/subscriptions/SubscriptionPauseModal';

const statusColors: Record<SubscriptionStatus, string> = {
  active: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  suspended: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  expired: 'text-red-400 bg-red-400/10 border-red-400/20',
  cancelled: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
};

const statusLabels: Record<SubscriptionStatus, string> = {
  active: 'Attivo',
  suspended: 'Sospeso',
  expired: 'Scaduto',
  cancelled: 'Annullato',
};

export const SubscriptionsPage: React.FC = () => {
  const {
    subscriptions,
    addSubscription,
    updateSubscription,
    cancelSubscription,
    renewSubscription,
  } = useSubscriptions();
  const { createInstallment } = usePayments();
  const { pauses, endSubscriptionPause } = useRenewals();
  const { showSuccess, showInfo } = useToast();

  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<SubscriptionStatus | 'all'>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<AthleteSubscription | null>(null);
  
  const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
  const [pausingSubscription, setPausingSubscription] = useState<AthleteSubscription | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  }>({ open: false, title: '', message: '', onConfirm: () => undefined });

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return subscriptions
      .filter((sub) => {
        if (q && !sub.athleteName.toLowerCase().includes(q) && !sub.packageName.toLowerCase().includes(q)) return false;
        if (filterStatus !== 'all' && sub.status !== filterStatus) return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [subscriptions, query, filterStatus]);

  const handleAction = (sub: AthleteSubscription, action: 'cancel' | 'suspend' | 'renew') => {
    if (action === 'cancel') {
      setConfirmModal({
        open: true,
        title: 'Annullare abbonamento?',
        message: `L'abbonamento di ${sub.athleteName} verrà annullato definitivamente.`,
        danger: true,
        onConfirm: () => {
          cancelSubscription(sub.id);
          showInfo('Annullato', 'L\'abbonamento è stato annullato.');
          setConfirmModal(prev => ({ ...prev, open: false }));
        }
      });
    } else if (action === 'suspend') {
      setConfirmModal({
        open: true,
        title: 'Sospendere abbonamento?',
        message: `L'abbonamento di ${sub.athleteName} verrà sospeso. Potrai riattivarlo in seguito.`,
        danger: false,
        onConfirm: () => {
          updateSubscription(sub.id, { status: 'suspended' });
          showInfo('Sospeso', 'L\'abbonamento è stato sospeso.');
          setConfirmModal(prev => ({ ...prev, open: false }));
        }
      });
    } else if (action === 'renew') {
      renewSubscription(sub.id);
      showSuccess('Rinnovato', 'L\'abbonamento è stato rinnovato con successo.');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(price);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Gestione Abbonamenti</h1>
          <p className="text-sm text-slate-400 mt-1">Assegna pacchetti agli atleti e gestisci le rate.</p>
        </div>
        <button
          onClick={() => { setEditingSubscription(null); setIsModalOpen(true); }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-primary)] text-black text-sm font-black hover:bg-[var(--color-primary-hover)] transition-all shadow-[0_0_20px_rgba(234,179,8,0.2)] hover:shadow-[0_0_25px_rgba(234,179,8,0.4)]"
        >
          <Plus className="w-4 h-4" /> Nuovo Abbonamento
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Cerca per atleta o pacchetto..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-slate-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
        >
          <option value="all">Tutti gli stati</option>
          <option value="active">Attivi</option>
          <option value="suspended">Sospesi</option>
          <option value="expired">Scaduti</option>
          <option value="cancelled">Annullati</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl shadow-xl">
          <div className="w-16 h-16 rounded-3xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-4 text-slate-500 shadow-inner">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Nessun abbonamento trovato</h3>
          <p className="text-slate-400 max-w-md mx-auto">
            {query || filterStatus !== 'all'
              ? 'Nessun risultato corrisponde ai filtri impostati.'
              : 'Inizia assegnando un pacchetto ad un atleta.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filtered.map(sub => (
            <div key={sub.id} className={`flex flex-col bg-[var(--color-panel)] border rounded-2xl shadow-xl overflow-hidden transition-all ${sub.status === 'active' ? 'border-[var(--color-panel-border)]' : 'border-slate-800/50 opacity-80'}`}>
              <div className="p-5 flex-1 space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${statusColors[sub.status]}`}>
                        {statusLabels[sub.status]}
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-white truncate flex items-center gap-2">
                      <User className="w-4 h-4 text-[var(--color-primary)]" />
                      {sub.athleteName}
                    </h3>
                    <p className="text-sm font-semibold text-slate-400 mt-1 truncate">{sub.packageName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xl font-black text-[var(--color-primary)]">{formatPrice(sub.finalPrice + sub.setupFee)}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">
                      {sub.installmentsCount} rate • {sub.paymentFrequency}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-800">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Inizio</span>
                    <span className="text-sm text-slate-200 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      {new Date(sub.startDate).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Scadenza</span>
                    <span className="text-sm text-slate-200 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {new Date(sub.endDate).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-slate-900 rounded-lg p-2.5 border border-slate-800">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Stato Pagamenti</span>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-[var(--color-primary)] rounded-full" style={{ width: `${(sub.installments.filter(i => i.status === 'paid').length / sub.installments.length) * 100}%` }} />
                      </div>
                      <span className="text-xs font-bold text-slate-300 shrink-0">
                        {sub.installments.filter(i => i.status === 'paid').length}/{sub.installments.length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center border-t border-[var(--color-panel-border)] bg-slate-900/30">
                <button
                  onClick={() => { setEditingSubscription(sub); setIsModalOpen(true); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors border-r border-[var(--color-panel-border)]"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Dettagli
                </button>
                {sub.status === 'active' && (
                  <button
                    onClick={() => { setPausingSubscription(sub); setIsPauseModalOpen(true); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold text-amber-400/70 hover:text-amber-400 hover:bg-amber-950/30 transition-colors border-r border-[var(--color-panel-border)]"
                  >
                    <Clock className="w-3.5 h-3.5" /> Sospendi
                  </button>
                )}
                {sub.status === 'suspended' && (
                  <button
                    onClick={() => {
                      const activePause = pauses.find(p => p.subscriptionId === sub.id && !p.actualEndDate);
                      if (activePause) {
                        endSubscriptionPause(activePause.id);
                        showSuccess('Pausa terminata', 'L\'abbonamento è tornato attivo.');
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold text-emerald-400 hover:text-white hover:bg-emerald-950/30 transition-colors border-r border-[var(--color-panel-border)]"
                  >
                    <Clock className="w-3.5 h-3.5" /> Riattiva
                  </button>
                )}
                {sub.status === 'expired' && (
                  <button
                    onClick={() => handleAction(sub, 'renew')}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold text-emerald-400/70 hover:text-emerald-400 hover:bg-emerald-950/30 transition-colors border-r border-[var(--color-panel-border)]"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Rinnova
                  </button>
                )}
                {sub.status !== 'cancelled' && (
                  <button
                    onClick={() => handleAction(sub, 'cancel')}
                    className="px-4 py-3 text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                    title="Annulla Abbonamento"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <SubscriptionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={(data) => {
          if (editingSubscription) {
            updateSubscription(editingSubscription.id, data);
            showSuccess('Modificato', 'L\'abbonamento è stato aggiornato con successo.');
          } else {
            const newSub = addSubscription(data);
            
            // Crea automaticamente i record di pagamento per ogni rata generata
            newSub.installments.forEach((inst, index) => {
              createInstallment({
                athleteId: newSub.athleteId,
                athleteName: newSub.athleteName,
                subscriptionId: newSub.id,
                installmentId: inst.id,
                installmentNumber: index + 1,
                expectedAmount: inst.amount,
                dueDate: inst.dueDate,
                status: 'pending'
              });
            });

            showSuccess('Creato', 'Il nuovo abbonamento è stato salvato e rateizzato nello scadenzario.');
          }
        }}
        editingSubscription={editingSubscription}
      />

      <SubscriptionPauseModal
        isOpen={isPauseModalOpen}
        onClose={() => setIsPauseModalOpen(false)}
        onSuccess={() => showSuccess('Pausa avviata', 'Sospensione dell\'abbonamento registrata con successo.')}
        subscription={pausingSubscription}
      />

      {confirmModal.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setConfirmModal(prev => ({ ...prev, open: false }))} />
          <div className="relative w-full max-w-sm bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl shadow-2xl p-6">
            <div className={`flex items-center gap-3 mb-4 ${confirmModal.danger ? 'text-red-500' : 'text-amber-500'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${confirmModal.danger ? 'bg-red-500/10' : 'bg-amber-500/10'}`}>
                <AlertTriangle className="w-5 h-5" />
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
                className={`px-4 py-2 rounded-xl text-white text-sm font-bold transition-colors ${confirmModal.danger ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600 text-black'
                  }`}
              >
                Conferma
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};