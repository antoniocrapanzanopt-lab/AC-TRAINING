import React from 'react';
import { X, Printer, ShieldAlert, CheckCircle2, Building2 } from 'lucide-react';
import { PaymentRecord } from '../../types';
import { getLocalOwnerProfile } from '../../lib/ownerProfile';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentRecord: PaymentRecord | null;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, paymentRecord }) => {
  if (!isOpen || !paymentRecord) return null;

  const owner = getLocalOwnerProfile();

  const handlePrint = () => {
    window.print();
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm print:hidden" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl shadow-2xl flex flex-col my-auto max-h-[90vh] print:max-h-none print:static print:border-none print:shadow-none print:bg-white print:text-black">
        
        {/* Header - Screen only */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-panel-border)] print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 flex items-center justify-center">
              <Printer className="w-5 h-5 text-[var(--color-primary)]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Ricevuta di Pagamento</h2>
              <p className="text-xs text-slate-400">Documento dimostrativo interno</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-colors shadow-lg"
            >
              <Printer className="w-4 h-4" /> Stampa / PDF
            </button>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Content Area */}
        <div className="p-6 md:p-8 space-y-6 overflow-y-auto print:overflow-visible print:p-0 print:text-black text-slate-200" id="receipt-print-area">
          
          {/* BANNER NON FISCALE OBBLIGATORIO */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 print:border-amber-600 print:bg-amber-50 print:text-amber-950 flex items-center justify-center gap-2 text-center">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span className="text-xs font-black uppercase tracking-wider">
              DOCUMENTO DIMOSTRATIVO — NON FISCALE
            </span>
          </div>

          {/* Intestazione Organizzazione & Atleta */}
          <div className="grid grid-cols-2 gap-6 pb-6 border-b border-slate-800 print:border-gray-300">
            <div>
              <div className="flex items-center gap-2 text-[var(--color-primary)] print:text-black font-black text-lg mb-1">
                <Building2 className="w-5 h-5" />
                {owner?.organizationName || 'BUILDER ATHLETE CLUB'}
              </div>
              <p className="text-xs text-slate-400 print:text-gray-600">Emesso da: {owner?.fullName || 'Proprietario Demo'}</p>
              {owner?.email && <p className="text-xs text-slate-400 print:text-gray-600">{owner.email}</p>}
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block print:text-gray-500">Ricevuto Da</span>
              <p className="text-base font-bold text-white print:text-black mt-0.5">{paymentRecord.athleteName}</p>
              <p className="text-xs text-slate-400 print:text-gray-600">ID Atleta: {paymentRecord.athleteId}</p>
            </div>
          </div>

          {/* Dettagli Transazione */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-900/60 print:bg-gray-100 border border-slate-800 print:border-gray-300 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block print:text-gray-500">N° Ricevuta</span>
              <span className="font-mono font-bold text-white print:text-black">{paymentRecord.receiptNumber || paymentRecord.id}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block print:text-gray-500">Data Versamento</span>
              <span className="font-bold text-white print:text-black">{formatDate(paymentRecord.paymentDate || paymentRecord.createdAt)}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block print:text-gray-500">Metodo</span>
              <span className="font-bold text-white uppercase print:text-black">{paymentRecord.method || 'Non specificato'}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block print:text-gray-500">Rif. Transazione</span>
              <span className="font-mono text-slate-300 print:text-gray-700">{paymentRecord.transactionReference || 'N/D'}</span>
            </div>
          </div>

          {/* Tabella Voci Rata */}
          <div className="border border-slate-800 print:border-gray-300 rounded-xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900 print:bg-gray-200 text-slate-400 print:text-gray-700 font-bold border-b border-slate-800 print:border-gray-300">
                <tr>
                  <th className="p-3">Descrizione</th>
                  <th className="p-3 text-right">Importo Previsto</th>
                  <th className="p-3 text-right">Versato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 print:divide-gray-300 text-slate-200 print:text-black">
                <tr>
                  <td className="p-3">
                    <span className="font-bold block">
                      Quota Abbonamento {paymentRecord.installmentNumber ? `- Rata ${paymentRecord.installmentNumber}` : ''}
                    </span>
                    <span className="text-[11px] text-slate-400 print:text-gray-600 block mt-0.5">
                      Scadenza originaria: {formatDate(paymentRecord.dueDate)}
                    </span>
                  </td>
                  <td className="p-3 text-right font-mono">{formatPrice(paymentRecord.expectedAmount)}</td>
                  <td className="p-3 text-right font-mono font-bold text-emerald-400 print:text-black">
                    {formatPrice(paymentRecord.paidAmount)}
                  </td>
                </tr>
                {paymentRecord.refundedAmount > 0 && (
                  <tr className="bg-purple-950/20 print:bg-purple-50 text-purple-300 print:text-purple-950">
                    <td className="p-3 font-semibold">Rimborso Applicato</td>
                    <td className="p-3 text-right font-mono">-</td>
                    <td className="p-3 text-right font-mono font-bold text-purple-400 print:text-purple-900">
                      -{formatPrice(paymentRecord.refundedAmount)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Riepilogo Totali */}
          <div className="flex flex-col items-end space-y-1.5 pt-2">
            <div className="flex justify-between w-full max-w-xs text-xs text-slate-400 print:text-gray-600">
              <span>Totale Versato:</span>
              <span className="font-mono font-bold text-white print:text-black">{formatPrice(paymentRecord.paidAmount)}</span>
            </div>
            <div className="flex justify-between w-full max-w-xs text-xs text-slate-400 print:text-gray-600">
              <span>Residuo da Saldare:</span>
              <span className="font-mono font-bold text-amber-400 print:text-black">{formatPrice(paymentRecord.residualAmount)}</span>
            </div>
            <div className="flex justify-between w-full max-w-xs text-sm font-black pt-2 border-t border-slate-800 print:border-gray-400 text-white print:text-black">
              <span>Incasso Netto Attuale:</span>
              <span className="font-mono text-[var(--color-primary)] print:text-black">
                {formatPrice(Math.max(0, paymentRecord.paidAmount - paymentRecord.refundedAmount))}
              </span>
            </div>
          </div>

          {paymentRecord.notes && (
            <div className="p-3 rounded-xl bg-slate-900/40 print:bg-gray-50 border border-slate-800 print:border-gray-300 text-xs">
              <span className="font-bold text-slate-400 print:text-gray-700 block mb-1">Note:</span>
              <p className="text-slate-300 print:text-gray-800 italic">{paymentRecord.notes}</p>
            </div>
          )}

          {/* Firma e note di chiusura */}
          <div className="pt-8 grid grid-cols-2 gap-8 text-xs text-slate-400 print:text-gray-600 border-t border-slate-800 print:border-gray-300">
            <div>
              <p className="font-bold text-slate-300 print:text-gray-800 mb-1">Note legali e operative:</p>
              <p className="text-[11px] leading-relaxed">
                Questo documento è generato esclusivamente per fini gestionali e dimostrativi all'interno della piattaforma locale Builder Athlete Manager.
              </p>
            </div>
            <div className="text-right flex flex-col justify-end items-end">
              <div className="w-36 border-b border-slate-700 print:border-gray-400 mb-1" />
              <span className="text-[10px] text-slate-500 print:text-gray-500">Firma Operatore / Timbro</span>
            </div>
          </div>

        </div>

        {/* Footer - Screen only */}
        <div className="p-4 border-t border-[var(--color-panel-border)] bg-slate-900/30 flex items-center justify-between print:hidden">
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Ricevuta pronta per l'esportazione
          </span>
          <button onClick={onClose} className="px-5 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors">
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
