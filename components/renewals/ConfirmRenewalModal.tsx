import React, { useState, useEffect, useMemo } from 'react';
import { X, RefreshCw, AlertTriangle, Calendar, Euro, UserCheck, Layers } from 'lucide-react';
import {
  AthleteRenewal,
  PaymentFrequency,
  PaymentMethod,
  RenewalType,
} from '../../types';
import { usePackages } from '../../context/PackagesContext';
import { getLocalOwnerProfile } from '../../lib/ownerProfile';
import { ConfirmRenewalParams } from '../../context/RenewalsContext';

interface ConfirmRenewalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (params: ConfirmRenewalParams) => void;
  renewal: AthleteRenewal | null;
}

export const ConfirmRenewalModal: React.FC<ConfirmRenewalModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  renewal,
}) => {
  const { packages } = usePackages();
  const activePackages = useMemo(() => packages.filter(p => p.isActive), [packages]);
  const owner = getLocalOwnerProfile();

  const [mode, setMode] = useState<'extend' | 'new_subscription'>('new_subscription');
  const [packageId, setPackageId] = useState('');
  const [packageName, setPackageName] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState('');
  const [listPrice, setListPrice] = useState(0);
  const [finalPrice, setFinalPrice] = useState(0);
  const [setupFee, setSetupFee] = useState(0);
  const [installmentsCount, setInstallmentsCount] = useState(1);
  const [firstInstallmentDate, setFirstInstallmentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentFrequency, setPaymentFrequency] = useState<PaymentFrequency>('single');
  const [preferredPaymentMethod, setPreferredPaymentMethod] = useState<PaymentMethod>('card');
  const [renewalType, setRenewalType] = useState<RenewalType>('manual');
  const [managerName, setManagerName] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen || !renewal) return;

    setMode('new_subscription');
    setPackageId(renewal.packageId || '');
    setPackageName(renewal.packageName || '');
    setListPrice(renewal.price || 0);
    setFinalPrice(renewal.price || 0);
    setSetupFee(0);
    setStartDate(new Date().toISOString().slice(0, 10));

    // Calcola end Date predefinita (+1 anno)
    const eDate = new Date();
    eDate.setFullYear(eDate.getFullYear() + 1);
    setEndDate(eDate.toISOString().slice(0, 10));

    setFirstInstallmentDate(new Date().toISOString().slice(0, 10));
    setInstallmentsCount(1);
    setPaymentFrequency('single');
    setPreferredPaymentMethod('card');
    setRenewalType('manual');
    setManagerName(owner?.fullName || 'Proprietario Demo');
    setNotes('');
    setErrors([]);
  }, [isOpen, renewal, owner]);

  const handlePackageChange = (id: string) => {
    const pkg = packages.find(p => p.id === id);
    if (!pkg) return;

    setPackageId(pkg.id);
    setPackageName(pkg.name);
    setListPrice(pkg.price);
    const fee = pkg.setupFee || 0;
    setSetupFee(fee);
    setFinalPrice(pkg.price + fee);
    setInstallmentsCount(pkg.installments);
    setPaymentFrequency(pkg.paymentFrequency);
    setRenewalType(pkg.renewalType);

    const sDate = new Date(startDate);
    const eDate = new Date(sDate);
    if (pkg.durationUnit === 'days') eDate.setDate(eDate.getDate() + pkg.duration);
    else if (pkg.durationUnit === 'weeks') eDate.setDate(eDate.getDate() + (pkg.duration * 7));
    else if (pkg.durationUnit === 'months') eDate.setMonth(eDate.getMonth() + pkg.duration);
    else if (pkg.durationUnit === 'years') eDate.setFullYear(eDate.getFullYear() + pkg.duration);
    setEndDate(eDate.toISOString().slice(0, 10));
  };

  if (!isOpen || !renewal) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: string[] = [];

    if (!packageId && mode === 'new_subscription') errs.push('Seleziona un pacchetto.');
    if (!startDate) errs.push('Data inizio obbligatoria.');
    if (!endDate) errs.push('Data fine obbligatoria.');
    if (new Date(endDate) <= new Date(startDate)) errs.push('La data fine deve essere successiva alla data inizio.');
    if (finalPrice < 0) errs.push('Il prezzo non può essere negativo.');
    if (installmentsCount < 1) errs.push('Minimo 1 rata.');

    if (errs.length > 0) {
      setErrors(errs);
      return;
    }

    onConfirm({
      renewalId: renewal.id,
      mode,
      packageId: packageId || renewal.packageId,
      packageName: packageName || renewal.packageName,
      startDate,
      endDate,
      listPrice,
      finalPrice,
      setupFee,
      installmentsCount,
      firstInstallmentDate,
      paymentFrequency,
      preferredPaymentMethod,
      renewalType,
      managerName,
      notes,
    });
    onClose();
  };

  const inputCls = "w-full px-3 py-2 rounded-xl bg-slate-950 border border-[var(--color-panel-border)] text-white text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-slate-600";
  const labelCls = "block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-3xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl shadow-2xl flex flex-col my-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-panel-border)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Conferma Rinnovo Abbonamento</h2>
              <p className="text-xs text-slate-400">Atleta: <strong className="text-white">{renewal.athleteName}</strong></p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form id="confirm-renewal-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
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

          {/* Modalità Rinnovo */}
          <div className="space-y-3">
            <label className={labelCls}>Modalità di Rinnovo *</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setMode('new_subscription')}
                className={`p-4 rounded-xl border flex items-start gap-3 text-left transition-all ${
                  mode === 'new_subscription'
                    ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Layers className="w-5 h-5 shrink-0 mt-0.5 text-[var(--color-primary)]" />
                <div>
                  <span className="font-bold text-sm block">Crea Nuovo Abbonamento</span>
                  <span className="text-xs text-slate-400">Genera un nuovo piano rateizzato e archivia la scheda precedente.</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode('extend')}
                className={`p-4 rounded-xl border flex items-start gap-3 text-left transition-all ${
                  mode === 'extend'
                    ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <RefreshCw className="w-5 h-5 shrink-0 mt-0.5 text-[var(--color-primary)]" />
                <div>
                  <span className="font-bold text-sm block">Proroga Abbonamento Esistente</span>
                  <span className="text-xs text-slate-400">Estende la scadenza dell'abbonamento attivo senza ricrearlo.</span>
                </div>
              </button>
            </div>
          </div>

          {/* Selezione Pacchetto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Pacchetto Rinnovo *</label>
              <select
                value={packageId}
                onChange={e => handlePackageChange(e.target.value)}
                className={inputCls}
              >
                <option value="">-- Seleziona Pacchetto --</option>
                {activePackages.map(p => (
                  <option key={p.id} value={p.id}>{p.name} - {p.price}€</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Responsabile Trattativa *</label>
              <div className="relative">
                <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={managerName}
                  onChange={e => setManagerName(e.target.value)}
                  className={`${inputCls} pl-9`}
                />
              </div>
            </div>
          </div>

          {/* Date e Valori */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Data Inizio Rinnovo *</label>
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
              <label className={labelCls}>Nuova Data Scadenza *</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className={`${inputCls} pl-9`}
                />
              </div>
            </div>
          </div>

          {/* Costi e Rateizzazioni */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider border-b border-slate-800 pb-2">Prezzo e Rateizzazione</h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Prezzo Listino (€)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={listPrice}
                  onChange={e => {
                    const newList = parseFloat(e.target.value) || 0;
                    setListPrice(newList);
                    setFinalPrice(newList + setupFee);
                  }}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Prezzo Concordato (€) *</label>
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={finalPrice}
                    onChange={e => setFinalPrice(parseFloat(e.target.value) || 0)}
                    className={`${inputCls} pl-9 font-bold text-emerald-400`}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Quota Iscrizione/Extra (€)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={setupFee}
                  onChange={e => {
                    const newFee = parseFloat(e.target.value) || 0;
                    setSetupFee(newFee);
                    setFinalPrice(listPrice + newFee);
                  }}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Frequenza</label>
                <select
                  value={paymentFrequency}
                  onChange={e => setPaymentFrequency(e.target.value as PaymentFrequency)}
                  className={inputCls}
                >
                  <option value="single">Unico</option>
                  <option value="weekly">Settimanale</option>
                  <option value="monthly">Mensile</option>
                  <option value="quarterly">Trimestrale</option>
                  <option value="semiannual">Semestrale</option>
                  <option value="annual">Annuale</option>
                </select>
              </div>

              <div>
                <label className={labelCls}>Numero Rate *</label>
                <input
                  type="number"
                  min="1"
                  value={installmentsCount}
                  onChange={e => setInstallmentsCount(parseInt(e.target.value) || 1)}
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Data Prima Rata *</label>
                <input
                  type="date"
                  value={firstInstallmentDate}
                  onChange={e => setFirstInstallmentDate(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          <div>
            <label className={labelCls}>Note Rinnovo</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className={`${inputCls} resize-none`}
              rows={2}
              placeholder="Eventuali dettagli sull'accordo..."
            />
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--color-panel-border)] bg-slate-900/30 flex items-center justify-end gap-3 shrink-0 rounded-b-2xl">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors">
            Annulla
          </button>
          <button type="submit" form="confirm-renewal-form" className="px-6 py-2 rounded-xl bg-[var(--color-primary)] text-black text-xs font-black hover:bg-[var(--color-primary-hover)] transition-colors shadow-lg">
            Conferma e Salva Rinnovo
          </button>
        </div>
      </div>
    </div>
  );
};
