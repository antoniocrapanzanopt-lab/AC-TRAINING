import React, { useState, useEffect } from 'react';
import { X, Euro, AlertTriangle, FileText, Calendar, CreditCard } from 'lucide-react';
import { PaymentRecord, PaymentMethod } from '../../types';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (amount: number, method: PaymentMethod, reference: string, date: string, notes: string) => void;
  paymentRecord: PaymentRecord | null;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, onSave, paymentRecord }) => {
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<PaymentMethod>('card');
  const [reference, setReference] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && paymentRecord) {
      // Imposta di default il residuo come importo da pagare
      setAmount(paymentRecord.residualAmount);
      setMethod(paymentRecord.method || 'card');
      setReference('');
      setDate(new Date().toISOString().slice(0, 10));
      setNotes('');
      setError('');
    }
  }, [isOpen, paymentRecord]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen) onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen || !paymentRecord) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setError('L\'importo deve essere maggiore di zero.');
      return;
    }
    if (amount > paymentRecord.residualAmount) {
      setError('L\'importo inserito supera il residuo da pagare.');
      return;
    }
    onSave(amount, method, reference, date, notes);
    onClose();
  };

  const inputCls = "w-full px-3 py-2 rounded-xl bg-slate-950 border border-[var(--color-panel-border)] text-white text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-slate-600";
  const labelCls = "block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-panel-border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <Euro className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Registra Pagamento</h2>
              <p className="text-xs text-slate-400 truncate max-w-[250px]">
                {paymentRecord.athleteName} {paymentRecord.installmentNumber ? `- Rata ${paymentRecord.installmentNumber}` : ''}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-950/30 border border-red-900/50 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm font-bold text-red-400">{error}</p>
            </div>
          )}

          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex justify-between items-center">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Importo Residuo Atteso</p>
              <p className="text-2xl font-black text-white mt-1">{paymentRecord.residualAmount.toFixed(2)}€</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Già Pagato</p>
              <p className="text-lg font-bold text-emerald-400 mt-1">{paymentRecord.paidAmount.toFixed(2)}€</p>
            </div>
          </div>

          <form id="payment-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelCls}>Importo Versato (€) *</label>
              <div className="relative">
                <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount || ''}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className={`${inputCls} pl-9 text-lg font-bold`}
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              {amount > 0 && amount < paymentRecord.residualAmount && (
                <p className="text-xs font-bold text-amber-500 mt-2 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Questo verrà registrato come pagamento parziale.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Data Contabile *</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={`${inputCls} pl-9`}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Metodo *</label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                    className={`${inputCls} pl-9 appearance-none`}
                  >
                    <option value="card">Carta di Credito</option>
                    <option value="transfer">Bonifico</option>
                    <option value="cash">Contanti</option>
                    <option value="direct_debit">Addebito Diretto</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className={labelCls}>Riferimento Transazione (Opzionale)</label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className={`${inputCls} pl-9`}
                  placeholder="Es. CRO Bonifico, ID Transazione Stripe..."
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Note Interne (Opzionale)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={`${inputCls} resize-none`}
                rows={2}
                placeholder="Aggiungi una nota al pagamento..."
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--color-panel-border)] bg-slate-900/30 flex items-center justify-end gap-3 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-400 hover:text-white transition-colors">
            Annulla
          </button>
          <button type="submit" form="payment-form" className="px-6 py-2 rounded-xl bg-emerald-500 text-black text-sm font-black hover:bg-emerald-600 transition-colors">
            Registra Incasso
          </button>
        </div>
      </div>
    </div>
  );
};
