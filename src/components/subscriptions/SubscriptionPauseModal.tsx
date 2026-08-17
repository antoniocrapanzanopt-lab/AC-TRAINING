import React, { useState, useEffect } from 'react';
import { X, PauseCircle, AlertTriangle, Calendar, UserCheck, HelpCircle } from 'lucide-react';
import { AthleteSubscription, PauseExpiryOption, PauseInstallmentsOption } from '../../types';
import { useRenewals, CreatePauseParams } from '../../context/RenewalsContext';
import { getLocalOwnerProfile } from '../../lib/ownerProfile';

interface SubscriptionPauseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  subscription: AthleteSubscription | null;
}

export const SubscriptionPauseModal: React.FC<SubscriptionPauseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  subscription,
}) => {
  const { createSubscriptionPause } = useRenewals();
  const owner = getLocalOwnerProfile();

  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedEndDate, setExpectedEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [authorizedBy, setAuthorizedBy] = useState('');
  const [expiryOption, setExpiryOption] = useState<PauseExpiryOption>('extend');
  const [installmentsOption, setInstallmentsOption] = useState<PauseInstallmentsOption>('suspend');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen || !subscription) return;

    setStartDate(new Date().toISOString().slice(0, 10));
    
    // Scadenza prevista pausa (default 14 giorni)
    const eDate = new Date();
    eDate.setDate(eDate.getDate() + 14);
    setExpectedEndDate(eDate.toISOString().slice(0, 10));

    setReason('');
    setAuthorizedBy(owner?.fullName || 'Proprietario Demo');
    setExpiryOption('extend');
    setInstallmentsOption('suspend');
    setNotes('');
    setErrors([]);
  }, [isOpen, subscription, owner]);

  if (!isOpen || !subscription) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: string[] = [];

    if (!startDate) errs.push('Data inizio pausa obbligatoria.');
    if (!expectedEndDate) errs.push('Data fine prevista pausa obbligatoria.');
    if (new Date(expectedEndDate) <= new Date(startDate)) errs.push('La data fine deve essere successiva alla data inizio.');
    if (!reason.trim()) errs.push('Inserisci la motivazione della sospensione.');
    if (!authorizedBy.trim()) errs.push('Specifica chi autorizza la sospensione.');

    if (errs.length > 0) {
      setErrors(errs);
      return;
    }

    const pauseParams: CreatePauseParams = {
      subscriptionId: subscription.id,
      startDate,
      expectedEndDate,
      reason,
      authorizedBy,
      notes,
      expiryOption,
      installmentsOption,
    };

    createSubscriptionPause(pauseParams);
    onSuccess();
    onClose();
  };

  const inputCls = "w-full px-3 py-2 rounded-xl bg-slate-950 border border-[var(--color-panel-border)] text-white text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-slate-600";
  const labelCls = "block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl shadow-2xl flex flex-col my-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-panel-border)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <PauseCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Sospensione / Pausa Abbonamento</h2>
              <p className="text-xs text-slate-400">Atleta: <strong className="text-white">{subscription.athleteName}</strong> ({subscription.packageName})</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form id="subscription-pause-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          {errors.length > 0 && (
            <div className="p-4 rounded-xl bg-red-950/30 border border-red-900/50 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-400">Attenzione:</p>
                <ul className="text-xs text-red-300 list-disc list-inside mt-1">
                  {errors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            </div>
          )}

          {/* Date di Pausa */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Data Inizio Pausa *</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className={`${inputCls} pl-9`}
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Data Fine Prevista *</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="date"
                  value={expectedEndDate}
                  onChange={e => setExpectedEndDate(e.target.value)}
                  className={`${inputCls} pl-9`}
                />
              </div>
            </div>
          </div>

          {/* Motivazione e Autorizzazione */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Motivazione Sospensione *</label>
              <input
                type="text"
                placeholder="Es. Infortunio, Vacanze, Motivi personali..."
                value={reason}
                onChange={e => setReason(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Autorizzato Da *</label>
              <div className="relative">
                <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={authorizedBy}
                  onChange={e => setAuthorizedBy(e.target.value)}
                  className={`${inputCls} pl-9`}
                />
              </div>
            </div>
          </div>

          {/* OPZIONE 1: Gestione Scadenza Abbonamento */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[var(--color-primary)]" />
              <label className="text-xs font-bold text-white uppercase tracking-wider">Gestione Scadenza Abbonamento</label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                expiryOption === 'extend' ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-white' : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}>
                <input
                  type="radio"
                  name="expiryOption"
                  value="extend"
                  checked={expiryOption === 'extend'}
                  onChange={() => setExpiryOption('extend')}
                  className="mt-1 accent-[var(--color-primary)]"
                />
                <div>
                  <span className="font-bold text-xs block text-white">Proroga Scadenza</span>
                  <span className="text-[11px] text-slate-400">Sposta la data di fine dell'abbonamento avanti per la durata della pausa.</span>
                </div>
              </label>

              <label className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                expiryOption === 'unchanged' ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-white' : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}>
                <input
                  type="radio"
                  name="expiryOption"
                  value="unchanged"
                  checked={expiryOption === 'unchanged'}
                  onChange={() => setExpiryOption('unchanged')}
                  className="mt-1 accent-[var(--color-primary)]"
                />
                <div>
                  <span className="font-bold text-xs block text-white">Data Invariata</span>
                  <span className="text-[11px] text-slate-400">Mantiene la data di fine originale senza prorogarla.</span>
                </div>
              </label>
            </div>
          </div>

          {/* OPZIONE 2: Gestione Rate */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[var(--color-primary)]" />
              <label className="text-xs font-bold text-white uppercase tracking-wider">Gestione Rate Non Saldate</label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                installmentsOption === 'suspend' ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-white' : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}>
                <input
                  type="radio"
                  name="installmentsOption"
                  value="suspend"
                  checked={installmentsOption === 'suspend'}
                  onChange={() => setInstallmentsOption('suspend')}
                  className="mt-1 accent-[var(--color-primary)]"
                />
                <div>
                  <span className="font-bold text-xs block text-white">Sospendi Rate</span>
                  <span className="text-[11px] text-slate-400">Imposta sospensione temporanea sulle rate (non figurano come scadute).</span>
                </div>
              </label>

              <label className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                installmentsOption === 'reschedule' ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-white' : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}>
                <input
                  type="radio"
                  name="installmentsOption"
                  value="reschedule"
                  checked={installmentsOption === 'reschedule'}
                  onChange={() => setInstallmentsOption('reschedule')}
                  className="mt-1 accent-[var(--color-primary)]"
                />
                <div>
                  <span className="font-bold text-xs block text-white">Riprogramma Date</span>
                  <span className="text-[11px] text-slate-400">Sposta la data di scadenza effettiva delle rate avanti dei giorni di pausa.</span>
                </div>
              </label>

              <label className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                installmentsOption === 'active' ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-white' : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}>
                <input
                  type="radio"
                  name="installmentsOption"
                  value="active"
                  checked={installmentsOption === 'active'}
                  onChange={() => setInstallmentsOption('active')}
                  className="mt-1 accent-[var(--color-primary)]"
                />
                <div>
                  <span className="font-bold text-xs block text-white">Rate Attive</span>
                  <span className="text-[11px] text-slate-400">Mantiene inalterate le scadenze originarie delle rate.</span>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className={labelCls}>Note Aggiuntive</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className={`${inputCls} resize-none`}
              rows={2}
              placeholder="Eventuali dettagli integrativi..."
            />
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--color-panel-border)] bg-slate-900/30 flex items-center justify-end gap-3 shrink-0 rounded-b-2xl">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors">
            Annulla
          </button>
          <button type="submit" form="subscription-pause-form" className="px-6 py-2 rounded-xl bg-[var(--color-primary)] text-black text-xs font-black hover:bg-[var(--color-primary-hover)] transition-colors shadow-lg cursor-pointer">
            Avvia Sospensione
          </button>
        </div>
      </div>
    </div>
  );
};
