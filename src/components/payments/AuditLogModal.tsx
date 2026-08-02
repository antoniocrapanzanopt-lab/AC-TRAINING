import React, { useState, useMemo } from 'react';
import { X, History, Search, Filter, ShieldAlert, ArrowRight, User, Calendar } from 'lucide-react';
import { FinancialAuditAction } from '../../types';
import { usePayments } from '../../context/PaymentsContext';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPaymentId?: string; // Se specificato, filtra per singola rata
}

const actionLabels: Record<FinancialAuditAction, { label: string; color: string }> = {
  creation: { label: 'Creazione Rata', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  amount_change: { label: 'Modifica Importo', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  partial_payment: { label: 'Pagamento Parziale', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  full_payment: { label: 'Saldo Completo', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  due_date_change: { label: 'Cambio Scadenza', color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
  status_change: { label: 'Cambio Stato', color: 'text-slate-300 bg-slate-800 border-slate-700' },
  refund: { label: 'Rimborso', color: 'text-pink-400 bg-pink-400/10 border-pink-400/20' },
  cancellation: { label: 'Annullamento', color: 'text-red-400 bg-red-400/10 border-red-400/20' },
  deletion: { label: 'Eliminazione Record', color: 'text-red-500 bg-red-500/10 border-red-500/30' },
};

export const AuditLogModal: React.FC<AuditLogModalProps> = ({ isOpen, onClose, targetPaymentId }) => {
  const { auditLogs } = usePayments();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<FinancialAuditAction | 'all'>('all');

  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      if (targetPaymentId && log.paymentRecordId !== targetPaymentId) return false;
      if (filterAction !== 'all' && log.action !== filterAction) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesAthlete = log.athleteName?.toLowerCase().includes(q);
        const matchesDesc = log.description.toLowerCase().includes(q);
        const matchesAuthor = log.authorName.toLowerCase().includes(q);
        const matchesId = log.paymentRecordId.toLowerCase().includes(q);
        if (!matchesAthlete && !matchesDesc && !matchesAuthor && !matchesId) return false;
      }
      return true;
    });
  }, [auditLogs, targetPaymentId, filterAction, searchQuery]);

  if (!isOpen) return null;

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatVal = (val: string | number | null | undefined) => {
    if (val === null || val === undefined) return <span className="text-slate-600 italic">null</span>;
    if (typeof val === 'number') return <span className="font-mono font-bold text-white">{val.toFixed(2)}€</span>;
    return <span className="font-semibold text-slate-200">{String(val)}</span>;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-4xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-panel-border)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
              <History className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Registro Audit Finanziario</h2>
              <p className="text-xs text-slate-400">Storico immutabile di tutte le transazioni e modifiche contabili</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filtri */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/40 flex flex-col sm:flex-row gap-3 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Cerca per atleta, descrizione, operatore..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-slate-600"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500 shrink-0" />
            <select
              value={filterAction}
              onChange={e => setFilterAction(e.target.value as any)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)] transition-colors"
            >
              <option value="all">Tutte le azioni</option>
              <option value="creation">Creazione</option>
              <option value="amount_change">Modifica Importo</option>
              <option value="partial_payment">Pagamento Parziale</option>
              <option value="full_payment">Saldo Completo</option>
              <option value="due_date_change">Cambio Scadenza</option>
              <option value="status_change">Cambio Stato</option>
              <option value="refund">Rimborso</option>
              <option value="cancellation">Annullamento</option>
              <option value="deletion">Eliminazione</option>
            </select>
          </div>
        </div>

        {/* Lista Audit Events */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {filteredLogs.length === 0 ? (
            <div className="py-16 text-center text-slate-500 flex flex-col items-center">
              <ShieldAlert className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-sm font-bold text-slate-400">Nessun evento di audit trovato</p>
              <p className="text-xs text-slate-600 mt-1">Le modifiche finanziarie verranno memorizzate qui in ordine cronologico.</p>
            </div>
          ) : (
            filteredLogs.map(log => {
              const actionMeta = actionLabels[log.action] || { label: log.action, color: 'text-slate-400 bg-slate-800' };
              return (
                <div key={log.id} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${actionMeta.color}`}>
                        {actionMeta.label}
                      </span>
                      {log.athleteName && (
                        <span className="text-xs font-bold text-white flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          {log.athleteName}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      {formatDate(log.timestamp)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 font-medium">{log.description}</p>

                  {(log.previousValue !== undefined || log.newValue !== undefined) && (
                    <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/70 flex items-center gap-3 text-xs">
                      <div className="flex-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">Prec:</span>
                        {formatVal(log.previousValue)}
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />
                      <div className="flex-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">Nuovo:</span>
                        {formatVal(log.newValue)}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1">
                    <span>ID Rata: <code className="text-slate-400">{log.paymentRecordId}</code></span>
                    <span>Operatore: <strong className="text-slate-400 font-semibold">{log.authorName}</strong></span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--color-panel-border)] bg-slate-900/30 flex justify-end">
          <button onClick={onClose} className="px-5 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors">
            Chiudi Registro
          </button>
        </div>
      </div>
    </div>
  );
};
