import React, { useState } from 'react';
import { X, AlertTriangle, Send, CheckCircle } from 'lucide-react';
import { PerformanceDropCause } from '../../types';

interface PerformanceReportModalProps {
  onClose: () => void;
  onSubmit: (data: { cause: PerformanceDropCause; notes: string }) => void;
}

export const PerformanceReportModal: React.FC<PerformanceReportModalProps> = ({
  onClose,
  onSubmit
}) => {
  const [selectedCause, setSelectedCause] = useState<PerformanceDropCause | null>(null);
  const [notes, setNotes] = useState('');
  const [isSent, setIsSent] = useState(false);

  const causes: { id: PerformanceDropCause; label: string; desc: string }[] = [
    { id: 'A', label: 'Calo Reale Continuativo', desc: 'Ripetuto in più sedute, sento che la prestazione sta scendendo.' },
    { id: 'B', label: 'Giornata Isolata', desc: 'Solo oggi. Nelle altre sedute è andata bene.' },
    { id: 'C', label: 'Altre Cause', desc: 'Dolore, stanchezza eccessiva, alleggerimento volontario, poco recupero.' },
    { id: 'D', label: 'Cambio Macchinario/Esecuzione', desc: 'Ho cambiato attrezzatura o impostazione tecnica.' },
    { id: 'E', label: 'Errore Inserimento / Errore Scheda precedente', desc: 'Ho sbagliato a segnare o il carico target era errato in precedenza.' },
  ];

  const handleSubmit = () => {
    if (!selectedCause) return;
    onSubmit({ cause: selectedCause, notes });
    setIsSent(true);
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-panel-border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Segnala Calo Prestazioni</h2>
              <p className="text-xs text-slate-400">Esercizio: Squat con Bilanciere</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSent ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Report Inviato</h3>
            <p className="text-sm text-slate-400">Il coach è stato notificato del calo di prestazione.</p>
          </div>
        ) : (
          <div className="overflow-y-auto p-5">
            <p className="text-sm text-slate-300 mb-6">
              Abbiamo notato un calo di prestazione rispetto alla seduta precedente. Aiuta il coach a capire il motivo selezionando una delle opzioni qui sotto:
            </p>

            <div className="space-y-3 mb-6">
              {causes.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCause(c.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedCause === c.id 
                      ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]' 
                      : 'bg-slate-900 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-bold text-sm ${selectedCause === c.id ? 'text-[var(--color-primary)]' : 'text-white'}`}>
                      {c.id} - {c.label}
                    </span>
                    {selectedCause === c.id && (
                      <CheckCircle className="w-4 h-4 text-[var(--color-primary)]" />
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{c.desc}</p>
                </button>
              ))}
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-300 mb-1.5">Note aggiuntive (Opzionale)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Vuoi aggiungere qualche dettaglio?"
                className="w-full h-24 bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] resize-none"
              />
            </div>
          </div>
        )}

        {/* Footer */}
        {!isSent && (
          <div className="p-4 border-t border-[var(--color-panel-border)] bg-slate-900/50 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Annulla
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedCause}
              className="px-6 py-2 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Invia Report
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
