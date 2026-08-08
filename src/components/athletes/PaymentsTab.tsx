import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  Euro,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  Plus,
  Receipt,
  Building2,
  Wallet,
  BadgePercent,
} from 'lucide-react';
import { PaymentRecord, PaymentMethod, PaymentRecordStatus } from '../../types';
import { usePayments } from '../../context/PaymentsContext';
import { useToast } from '../../context/ToastContext';
import { PaymentModal } from '../payments/PaymentModal';

interface PaymentsTabProps {
  athleteId: string;
  athleteName: string;
}

const methodLabels: Record<PaymentMethod, { label: string; icon: React.FC<{ className?: string }> }> = {
  card: { label: 'Carta / POS', icon: CreditCard },
  transfer: { label: 'Bonifico Bancario', icon: Building2 },
  cash: { label: 'Contanti', icon: Wallet },
  direct_debit: { label: 'Addebito Diretto / Satispay', icon: Receipt },
};

const statusBadgeConfig: Record<PaymentRecordStatus, { label: string; color: string; icon: React.FC<{ className?: string }> }> = {
  paid: { label: 'Saldato', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', icon: CheckCircle2 },
  pending: { label: 'In Attesa', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30', icon: Clock },
  partial: { label: 'Parziale', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30', icon: BadgePercent },
  refunded: { label: 'Rimborsato', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30', icon: Euro },
  cancelled: { label: 'Annullato', color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: AlertTriangle },
};

export const PaymentsTab: React.FC<PaymentsTabProps> = ({ athleteId, athleteName }) => {
  const { payments, registerPayment } = usePayments();
  const { showSuccess, showInfo } = useToast();

  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'paid'>('all');
  const [selectedRecord, setSelectedRecord] = useState<PaymentRecord | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Pagamenti filtrati per questo atleta
  const athletePayments = useMemo(() => {
    return payments
      .filter(p => p.athleteId === athleteId)
      .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
  }, [payments, athleteId]);

  // Metriche Contabili dell'Atleta
  const metrics = useMemo<{
    totalPaid: number;
    totalResidual: number;
    nextDue: PaymentRecord | null;
    isOverdue: boolean;
  }>(() => {
    let totalPaid = 0;
    let totalResidual = 0;
    let nextDueRecord: PaymentRecord | null = null;
    const todayStr = new Date().toISOString().slice(0, 10);

    athletePayments.forEach(p => {
      totalPaid += p.paidAmount || 0;
      if (p.status === 'pending' || p.status === 'partial') {
        totalResidual += p.residualAmount || 0;
        if (!nextDueRecord || new Date(p.dueDate).getTime() < new Date(nextDueRecord.dueDate).getTime()) {
          nextDueRecord = p;
        }
      }
    });

    return {
      totalPaid,
      totalResidual,
      nextDue: nextDueRecord,
      isOverdue: nextDueRecord ? (nextDueRecord as PaymentRecord).dueDate < todayStr : false,
    };
  }, [athletePayments]);

  // Filtro Lista
  const displayedPayments = useMemo(() => {
    if (filterStatus === 'pending') {
      return athletePayments.filter(p => p.status === 'pending' || p.status === 'partial');
    }
    if (filterStatus === 'paid') {
      return athletePayments.filter(p => p.status === 'paid');
    }
    return athletePayments;
  }, [athletePayments, filterStatus]);

  // Registrazione Incasso Manuale
  const handleSavePayment = (
    amount: number,
    method: PaymentMethod,
    reference: string,
    _date: string,
    _notes: string
  ) => {
    if (!selectedRecord) return;

    registerPayment(selectedRecord.id, amount, method, reference);
    showSuccess('Incasso Registrato', `Incassati €${amount} per ${athleteName} via ${methodLabels[method]?.label || method}.`);
    setIsPaymentModalOpen(false);
    setSelectedRecord(null);
  };

  // Generatore Sollecito WhatsApp
  const handleSendReminder = (record: PaymentRecord) => {
    const dueDateFormatted = new Date(record.dueDate).toLocaleDateString('it-IT');
    const msg = `Ciao ${athleteName}, ti ricordiamo la scadenza della quota/rata di €${record.residualAmount} prevista per il ${dueDateFormatted}. Fammi sapere quando effettui il saldo! Grazie!`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
    showInfo('Promemoria', 'Invio promemoria aperto su WhatsApp.');
  };

  return (
    <div className="space-y-6">
      {/* Header Sezione */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[var(--color-primary)]" /> Registro Incassi & Quoterie
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Tracciamento contabile manuale delle rate e degli incassi ricevuti per {athleteName}.
          </p>
        </div>
      </div>

      {/* KPI Cards Contabili */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Totale Incassato */}
        <div className="p-4 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Totale Incassato</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400">€{metrics.totalPaid.toLocaleString('it-IT')}</span>
            <span className="text-xs text-slate-500 font-semibold">saldati</span>
          </div>
        </div>

        {/* Totale da Incassare / Arretrati */}
        <div className="p-4 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Da Incassare / Arretrati</span>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-black ${metrics.totalResidual > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
              €{metrics.totalResidual.toLocaleString('it-IT')}
            </span>
            <span className="text-xs text-slate-500 font-semibold">residui</span>
          </div>
        </div>

        {/* Prossima Scadenza */}
        <div className="p-4 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Prossima Scadenza</span>
          {metrics.nextDue ? (
            <div>
              <span className={`text-sm font-black block ${metrics.isOverdue ? 'text-red-400' : 'text-white'}`}>
                €{metrics.nextDue.residualAmount} entro il {new Date(metrics.nextDue.dueDate).toLocaleDateString('it-IT')}
              </span>
              {metrics.isOverdue && (
                <span className="text-[10px] text-red-400 font-bold">⚠️ Rata in ritardo</span>
              )}
            </div>
          ) : (
            <span className="text-sm font-bold text-slate-400">Nessuna scadenza imminente</span>
          )}
        </div>
      </div>

      {/* Bar Filtri & Tabella Pagamenti */}
      <div className="p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4">
        {/* Sub-Header con Filtri */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs font-bold">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterStatus === 'all' ? 'bg-[var(--color-primary)] text-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              Tutti ({athletePayments.length})
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterStatus === 'pending' ? 'bg-[var(--color-primary)] text-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              Da Incassare
            </button>
            <button
              onClick={() => setFilterStatus('paid')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterStatus === 'paid' ? 'bg-[var(--color-primary)] text-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              Saldati
            </button>
          </div>

          <span className="text-xs text-slate-500 font-semibold">
            Nota: I pagamenti sono registrati manualmente a scopo contabile.
          </span>
        </div>

        {/* Lista Rate & Incassi */}
        <div className="divide-y divide-slate-800 max-h-[450px] overflow-y-auto pr-1">
          {displayedPayments.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              Nessun record di pagamento trovato per questo filtro.
            </div>
          ) : (
            displayedPayments.map(p => {
              const cfg = statusBadgeConfig[p.status] || statusBadgeConfig.pending;
              const IconComp = cfg.icon;
              const MethodIcon = p.method ? methodLabels[p.method]?.icon || CreditCard : CreditCard;
              const isOverdue = p.status === 'pending' && p.dueDate < new Date().toISOString().slice(0, 10);

              return (
                <div key={p.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-900/40 p-2 rounded-xl transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-xl border shrink-0 mt-0.5 ${
                      p.status === 'paid'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : isOverdue
                        ? 'bg-red-500/10 border-red-500/30 text-red-400'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    }`}>
                      <IconComp className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">
                          {p.installmentNumber ? `Rata ${p.installmentNumber}` : 'Quota / Incasso'}
                        </h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${cfg.color}`}>
                          {isOverdue ? 'In Ritardo' : cfg.label}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1">
                        <span>Scadenza: <strong className="text-slate-200">{new Date(p.dueDate).toLocaleDateString('it-IT')}</strong></span>
                        {p.paymentDate && (
                          <span className="text-emerald-400 font-semibold">• Saldato il: {new Date(p.paymentDate).toLocaleDateString('it-IT')}</span>
                        )}
                        {p.method && (
                          <span className="flex items-center gap-1 text-slate-300">• <MethodIcon className="w-3 h-3 text-slate-400" /> {methodLabels[p.method]?.label}</span>
                        )}
                        {p.transactionReference && (
                          <span>• Rif/Ricevuta: {p.transactionReference}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 border-slate-800/60 pt-2 sm:pt-0">
                    <div className="text-right">
                      <span className="block text-sm font-black text-white">€{p.expectedAmount}</span>
                      {p.status === 'partial' && (
                        <span className="text-[10px] text-blue-400 font-bold block">Residuo: €{p.residualAmount}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {p.status !== 'paid' && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedRecord(p);
                              setIsPaymentModalOpen(true);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-primary)] text-black text-xs font-black hover:bg-[var(--color-primary-hover)] transition-all shadow-md"
                          >
                            <Plus className="w-3.5 h-3.5" /> Registra Incasso
                          </button>

                          <button
                            onClick={() => handleSendReminder(p)}
                            className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Invia Promemoria WhatsApp"
                          >
                            <Send className="w-3.5 h-3.5 text-emerald-400" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modale Registrazione Incasso Manuale */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedRecord(null);
        }}
        onSave={handleSavePayment}
        paymentRecord={selectedRecord}
      />
    </div>
  );
};
