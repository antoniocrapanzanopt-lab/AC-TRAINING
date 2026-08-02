import React, { useState, useMemo } from 'react';
import {
  Search,
  Euro,
  RefreshCcw,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  Calendar,
  Trash2,
  CheckCircle2,
  History,
  Printer,
} from 'lucide-react';
import { PaymentRecord, PaymentRecordStatus, PaymentMethod } from '../../types';
import { usePayments } from '../../context/PaymentsContext';
import { useToast } from '../../context/ToastContext';
import { PaymentModal } from '../../components/payments/PaymentModal';
import { ReceiptModal } from '../../components/payments/ReceiptModal';
import { AuditLogModal } from '../../components/payments/AuditLogModal';

const statusColors: Record<PaymentRecordStatus, string> = {
  paid: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  partial: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  pending: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  refunded: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  cancelled: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
};

const statusLabels: Record<PaymentRecordStatus, string> = {
  paid: 'Saldato',
  partial: 'Parziale',
  pending: 'In Attesa',
  refunded: 'Rimborsato',
  cancelled: 'Annullato',
};

export const PaymentsPage: React.FC = () => {
  const { payments, registerPayment, refundPayment, cancelPayment, deletePayment } = usePayments();
  const { showSuccess, showInfo, showError } = useToast();

  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<PaymentRecordStatus | 'all'>('all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);

  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptPayment, setReceiptPayment] = useState<PaymentRecord | null>(null);

  const [isAuditOpen, setIsAuditOpen] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
    requireAmount?: boolean;
  }>({ open: false, title: '', message: '', onConfirm: () => undefined });
  const [refundAmountInput, setRefundAmountInput] = useState<string>('');

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return payments
      .filter((p) => {
        if (q && !p.athleteName.toLowerCase().includes(q) && !p.transactionReference?.toLowerCase().includes(q)) return false;
        if (filterStatus !== 'all' && p.status !== filterStatus) return false;
        return true;
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()); // Ordine di scadenza
  }, [payments, query, filterStatus]);

  // Metriche
  const metrics = useMemo(() => {
    let totalExpected = 0;
    let totalPaid = 0;
    let totalRefunded = 0;

    payments.forEach(p => {
      if (p.status !== 'cancelled') {
        totalExpected += p.expectedAmount;
        totalPaid += p.paidAmount;
        totalRefunded += p.refundedAmount;
      }
    });

    return {
      totalExpected,
      totalPaid,
      totalRefunded,
      netRevenue: Math.max(0, totalPaid - totalRefunded),
      residual: Math.max(0, totalExpected - totalPaid),
    };
  }, [payments]);

  const handleAction = (p: PaymentRecord, action: 'pay' | 'cancel' | 'refund' | 'delete') => {
    if (action === 'pay') {
      setSelectedPayment(p);
      setIsModalOpen(true);
    } else if (action === 'cancel') {
      setConfirmModal({
        open: true,
        title: 'Annullare transazione?',
        message: 'L\'attesa di pagamento verrà annullata. Questa operazione non elimina il record ma lo segna come annullato (non dovuto).',
        danger: true,
        onConfirm: () => {
          cancelPayment(p.id, 'Annullato manualmente');
          showInfo('Annullato', 'Pagamento annullato.');
          setConfirmModal(prev => ({ ...prev, open: false }));
        }
      });
    } else if (action === 'delete') {
      setConfirmModal({
        open: true,
        title: 'Eliminare record?',
        message: 'ATTENZIONE: Questo eliminerà definitivamente la transazione e riporterà la rata dello storico in stato "In Attesa". Verrà registrato nell\'Audit Log.',
        danger: true,
        onConfirm: () => {
          deletePayment(p.id, 'Eliminato manualmente da UI');
          showInfo('Eliminato', 'Record cancellato.');
          setConfirmModal(prev => ({ ...prev, open: false }));
        }
      });
    } else if (action === 'refund') {
      setRefundAmountInput(p.paidAmount.toString());
      setConfirmModal({
        open: true,
        title: 'Rimborso',
        message: `Inserisci l'importo da rimborsare. Hai già incassato ${p.paidAmount}€. Un rimborso totale imposterà lo stato a "Rimborsato".`,
        danger: false,
        requireAmount: true,
        onConfirm: () => {
          const amt = parseFloat(refundAmountInput);
          if (isNaN(amt) || amt <= 0 || amt > p.paidAmount) {
            showError('Errore', 'Importo di rimborso non valido.');
            return;
          }
          refundPayment(p.id, amt, 'Rimborso richiesto da UI');
          showSuccess('Rimborsato', `È stato registrato un rimborso di ${amt}€.`);
          setConfirmModal(prev => ({ ...prev, open: false }));
        }
      });
    }
  };

  const handleSavePayment = (amount: number, method: PaymentMethod, reference: string, _date: string, _notes: string) => {
    if (selectedPayment) {
      registerPayment(selectedPayment.id, amount, method, reference);
      showSuccess('Pagamento registrato', `Incassato ${amount}€ da ${selectedPayment.athleteName}.`);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(price);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Pagamenti e Scadenze</h1>
          <p className="text-sm text-slate-400 mt-1">Gestisci incassi, rate, insoluti e rimborsi.</p>
        </div>
        <button
          onClick={() => setIsAuditOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-950/40 border border-purple-800/50 text-purple-300 hover:text-white text-xs font-bold hover:bg-purple-900/50 transition-all shadow-lg"
        >
          <History className="w-4 h-4" /> Registro Audit Finanziario
        </button>
      </div>

      {/* Metriche Rapide */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl flex flex-col">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Euro className="w-3.5 h-3.5" /> Previsto Tot.</span>
          <span className="text-2xl font-black text-white">{formatPrice(metrics.totalExpected)}</span>
        </div>
        <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/50 shadow-xl flex flex-col">
          <span className="text-xs font-bold text-emerald-500/70 uppercase tracking-wider mb-1 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Incassato</span>
          <span className="text-2xl font-black text-emerald-400">{formatPrice(metrics.totalPaid)}</span>
        </div>
        <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-900/50 shadow-xl flex flex-col">
          <span className="text-xs font-bold text-amber-500/70 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Da Incassare</span>
          <span className="text-2xl font-black text-amber-400">{formatPrice(metrics.residual)}</span>
        </div>
        <div className="p-4 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 shadow-xl flex flex-col">
          <span className="text-xs font-bold text-[var(--color-primary)]/70 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Euro className="w-3.5 h-3.5" /> Ricavo Netto</span>
          <span className="text-2xl font-black text-[var(--color-primary)]">{formatPrice(metrics.netRevenue)}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Cerca per atleta o riferimento..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-slate-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as PaymentRecordStatus | 'all')}
          className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
        >
          <option value="all">Tutti gli stati</option>
          <option value="pending">In Attesa</option>
          <option value="partial">Parziali</option>
          <option value="paid">Saldati</option>
          <option value="refunded">Rimborsati</option>
          <option value="cancelled">Annullati</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl shadow-xl">
          <div className="w-16 h-16 rounded-3xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-4 text-slate-500 shadow-inner">
            <Euro className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Nessun pagamento trovato</h3>
          <p className="text-slate-400 max-w-md mx-auto">
            I pagamenti compariranno qui quando vengono creati degli abbonamenti con le relative rate.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filtered.map(p => (
            <div key={p.id} className={`flex flex-col bg-[var(--color-panel)] border rounded-2xl shadow-xl overflow-hidden transition-all ${p.status === 'paid' ? 'border-emerald-900/30' : p.status === 'pending' || p.status === 'partial' ? 'border-[var(--color-panel-border)]' : 'border-slate-800/50 opacity-80'}`}>
              <div className="p-4 flex-1 flex flex-col md:flex-row gap-4">
                
                {/* Info Principali */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${statusColors[p.status]}`}>
                      {statusLabels[p.status]}
                    </span>
                    {p.installmentNumber && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-slate-700 bg-slate-800 text-slate-300">
                        Rata {p.installmentNumber}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-black text-white truncate flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    {p.athleteName}
                  </h3>
                  
                  <div className="flex flex-wrap items-center gap-4 mt-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      Scad. {new Date(p.dueDate).toLocaleDateString('it-IT')}
                    </div>
                    {p.paymentDate && (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-400/70">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Pagato {new Date(p.paymentDate).toLocaleDateString('it-IT')}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Cifre */}
                <div className="shrink-0 flex md:flex-col items-center md:items-end justify-between md:justify-center gap-4 md:gap-1 p-3 rounded-xl bg-slate-900/50 border border-slate-800">
                  <div className="text-center md:text-right">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Totale</p>
                    <p className="text-sm font-bold text-slate-300">{formatPrice(p.expectedAmount)}</p>
                  </div>
                  <div className="w-[1px] h-6 bg-slate-800 md:w-8 md:h-[1px] md:my-1" />
                  <div className="text-center md:text-right">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Residuo</p>
                    <p className={`text-lg font-black ${p.residualAmount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {formatPrice(p.residualAmount)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Azioni Rapide */}
              <div className="flex items-center border-t border-[var(--color-panel-border)] bg-slate-900/30">
                {(p.status === 'pending' || p.status === 'partial') && (
                  <button
                    onClick={() => handleAction(p, 'pay')}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-emerald-400 hover:text-white hover:bg-emerald-950/30 transition-colors border-r border-[var(--color-panel-border)]"
                  >
                    <Euro className="w-3.5 h-3.5" /> Registra Incasso
                  </button>
                )}
                {p.paidAmount > 0 && (
                  <button
                    onClick={() => { setReceiptPayment(p); setIsReceiptOpen(true); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-blue-400/80 hover:text-blue-300 hover:bg-blue-950/30 transition-colors border-r border-[var(--color-panel-border)]"
                  >
                    <Printer className="w-3.5 h-3.5" /> Ricevuta
                  </button>
                )}
                {p.paidAmount > 0 && p.status !== 'refunded' && (
                  <button
                    onClick={() => handleAction(p, 'refund')}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-purple-400/70 hover:text-purple-400 hover:bg-purple-950/30 transition-colors border-r border-[var(--color-panel-border)]"
                  >
                    <RefreshCcw className="w-3.5 h-3.5" /> Rimborso
                  </button>
                )}
                {(p.status === 'pending') && (
                  <button
                    onClick={() => handleAction(p, 'cancel')}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors border-r border-[var(--color-panel-border)]"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Annulla Attesa
                  </button>
                )}
                <button
                  onClick={() => handleAction(p, 'delete')}
                  className="px-4 py-2.5 text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                  title="Elimina Record e Ripristina Rata"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <PaymentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSavePayment}
        paymentRecord={selectedPayment}
      />

      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        paymentRecord={receiptPayment}
      />

      <AuditLogModal
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
      />

      {/* Modale Conferma / Input Rimborso */}
      {confirmModal.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setConfirmModal(prev => ({ ...prev, open: false }))} />
          <div className="relative w-full max-w-sm bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl shadow-2xl p-6 flex flex-col">
            <div className={`flex items-center gap-3 mb-4 ${confirmModal.danger ? 'text-red-500' : 'text-[var(--color-primary)]'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${confirmModal.danger ? 'bg-red-500/10' : 'bg-[var(--color-primary)]/10'}`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">{confirmModal.title}</h3>
            </div>
            
            <p className="text-sm text-slate-400 mb-6">{confirmModal.message}</p>
            
            {confirmModal.requireAmount && (
              <div className="mb-6">
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Importo da Rimborsare (€)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={refundAmountInput}
                  onChange={e => setRefundAmountInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-[var(--color-panel-border)] text-white text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                  autoFocus
                />
              </div>
            )}
            
            <div className="flex justify-end gap-3 mt-auto">
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, open: false }))}
                className="px-4 py-2 rounded-xl text-sm font-bold text-slate-300 hover:text-white transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className={`px-4 py-2 rounded-xl text-white text-sm font-bold transition-colors ${
                  confirmModal.danger ? 'bg-red-500 hover:bg-red-600' : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-black'
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
