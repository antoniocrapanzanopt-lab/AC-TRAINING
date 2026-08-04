import React, { useState, useEffect } from 'react';
import { X, PackagePlus, AlertTriangle } from 'lucide-react';
import {
  PackageFormData,
  PackageItem,
  PackageDurationUnit,
  PaymentFrequency,
  DiscountType,
  RenewalType,
} from '../../types';

interface PackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: PackageFormData) => void;
  editingPackage?: PackageItem | null;
}

const emptyForm: PackageFormData = {
  name: '',
  description: '',
  price: 0,
  duration: 1,
  durationUnit: 'months',
  paymentFrequency: 'single',
  installments: 1,
  setupFee: 0,
  includedServices: [],
  renewalType: 'manual',
  canBeSuspended: false,
  maxSuspensionDays: 0,
  discountType: 'none',
  discountValue: 0,
  isActive: true,
  notes: '',
};

export const PackageModal: React.FC<PackageModalProps> = ({ isOpen, onClose, onSave, editingPackage }) => {
  const [form, setForm] = useState<PackageFormData>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof PackageFormData, string>>>({});
  const [serviceInput, setServiceInput] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (editingPackage) {
      setForm({
        name: editingPackage.name,
        description: editingPackage.description,
        price: editingPackage.price,
        duration: editingPackage.duration,
        durationUnit: editingPackage.durationUnit,
        paymentFrequency: editingPackage.paymentFrequency,
        installments: editingPackage.installments,
        setupFee: editingPackage.setupFee,
        includedServices: editingPackage.includedServices,
        renewalType: editingPackage.renewalType,
        canBeSuspended: editingPackage.canBeSuspended,
        maxSuspensionDays: editingPackage.maxSuspensionDays,
        discountType: editingPackage.discountType,
        discountValue: editingPackage.discountValue,
        isActive: editingPackage.isActive,
        notes: editingPackage.notes,
      });
    } else {
      setForm(emptyForm);
    }
    setErrors({});
    setServiceInput('');
  }, [isOpen, editingPackage]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen) onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof PackageFormData, string>> = {};
    if (!form.name.trim()) newErrors.name = 'Il nome è obbligatorio.';
    if (form.price < 0) newErrors.price = 'Il prezzo non può essere negativo.';
    if (form.duration <= 0) newErrors.duration = 'La durata deve essere maggiore di zero.';
    if (form.installments < 1) newErrors.installments = 'Minimo 1 rata.';
    if (form.discountType !== 'none' && (form.discountValue === undefined || form.discountValue < 0)) {
      newErrors.discountValue = 'Valore sconto non valido.';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSave(form);
      onClose();
    }
  };

  const handleAddService = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = serviceInput.trim();
      if (val && !form.includedServices.includes(val)) {
        setForm({ ...form, includedServices: [...form.includedServices, val] });
        setServiceInput('');
      }
    }
  };

  const removeService = (service: string) => {
    setForm({ ...form, includedServices: form.includedServices.filter((s) => s !== service) });
  };

  const inputCls = "w-full px-3 py-2 rounded-xl bg-slate-950 border border-[var(--color-panel-border)] text-white text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-slate-600";
  const labelCls = "block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-3xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl shadow-2xl flex flex-col max-h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-panel-border)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 flex items-center justify-center">
              <PackagePlus className="w-5 h-5 text-[var(--color-primary)]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {editingPackage ? 'Modifica Pacchetto' : 'Nuovo Pacchetto'}
              </h2>
              <p className="text-xs text-slate-400">Configura i dettagli del pacchetto o servizio</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {Object.keys(errors).length > 0 && (
            <div className="p-4 rounded-xl bg-red-950/30 border border-red-900/50 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-400">Ci sono errori nel modulo</p>
                <ul className="text-xs text-red-300 mt-1 list-disc list-inside">
                  {Object.values(errors).map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* INFORMAZIONI GENERALI */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-[var(--color-primary)] uppercase tracking-wider border-b border-slate-800 pb-2">Informazioni Generali</h3>
              
              <div>
                <label className={labelCls}>Nome Pacchetto *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputCls}
                  placeholder="es. Abbonamento Annuale"
                />
              </div>

              <div>
                <label className={labelCls}>Descrizione</label>
                <textarea
                  value={form.description || ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className={`${inputCls} resize-none`}
                  rows={2}
                  placeholder="Breve descrizione del pacchetto..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Durata *</label>
                  <input
                    type="number"
                    min="1"
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) || 1 })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Unità</label>
                  <select
                    value={form.durationUnit}
                    onChange={(e) => setForm({ ...form, durationUnit: e.target.value as PackageDurationUnit })}
                    className={inputCls}
                  >
                    <option value="days">Giorni</option>
                    <option value="weeks">Settimane</option>
                    <option value="months">Mesi</option>
                    <option value="years">Anni</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>Servizi Inclusi</label>
                <input
                  type="text"
                  value={serviceInput}
                  onChange={(e) => setServiceInput(e.target.value)}
                  onKeyDown={handleAddService}
                  placeholder="Scrivi e premi Invio..."
                  className={inputCls}
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.includedServices.map((service) => (
                    <span key={service} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300">
                      {service}
                      <button type="button" onClick={() => removeService(service)} className="hover:text-red-400"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* PREZZI E PAGAMENTI */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-[var(--color-primary)] uppercase tracking-wider border-b border-slate-800 pb-2">Prezzi e Pagamenti</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Prezzo Base (€) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Quota Iniziale (€)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.setupFee || 0}
                    onChange={(e) => setForm({ ...form, setupFee: parseFloat(e.target.value) || 0 })}
                    className={inputCls}
                    placeholder="Es. Iscrizione"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Frequenza Pag.</label>
                  <select
                    value={form.paymentFrequency}
                    onChange={(e) => setForm({ ...form, paymentFrequency: e.target.value as PaymentFrequency })}
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
                    value={form.installments}
                    onChange={(e) => setForm({ ...form, installments: parseInt(e.target.value) || 1 })}
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Sconto</label>
                  <select
                    value={form.discountType}
                    onChange={(e) => setForm({ ...form, discountType: e.target.value as DiscountType, discountValue: e.target.value === 'none' ? 0 : form.discountValue })}
                    className={inputCls}
                  >
                    <option value="none">Nessuno</option>
                    <option value="percentage">Percentuale (%)</option>
                    <option value="fixed">Fisso (€)</option>
                  </select>
                </div>
                {form.discountType !== 'none' && (
                  <div>
                    <label className={labelCls}>Valore Sconto *</label>
                    <input
                      type="number"
                      min="0"
                      step={form.discountType === 'percentage' ? '1' : '0.01'}
                      value={form.discountValue || 0}
                      onChange={(e) => setForm({ ...form, discountValue: parseFloat(e.target.value) || 0 })}
                      className={inputCls}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* IMPOSTAZIONI AVANZATE */}
            <div className="space-y-4 md:col-span-2">
              <h3 className="text-sm font-bold text-[var(--color-primary)] uppercase tracking-wider border-b border-slate-800 pb-2">Impostazioni Avanzate</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className={labelCls}>Tipo di Rinnovo</label>
                  <select
                    value={form.renewalType}
                    onChange={(e) => setForm({ ...form, renewalType: e.target.value as RenewalType })}
                    className={inputCls}
                  >
                    <option value="manual">Manuale</option>
                    <option value="automatic">Automatico</option>
                  </select>
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className={labelCls}>Sospensione</label>
                  <label className="flex items-center gap-2 cursor-pointer mt-1">
                    <input
                      type="checkbox"
                      checked={form.canBeSuspended}
                      onChange={(e) => setForm({ ...form, canBeSuspended: e.target.checked })}
                      className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-[var(--color-primary)] focus:ring-[var(--color-primary)]/20"
                    />
                    <span className="text-sm text-slate-300">Consentita</span>
                  </label>
                </div>

                {form.canBeSuspended && (
                  <div>
                    <label className={labelCls}>Max Giorni Sospensione</label>
                    <input
                      type="number"
                      min="0"
                      value={form.maxSuspensionDays || 0}
                      onChange={(e) => setForm({ ...form, maxSuspensionDays: parseInt(e.target.value) || 0 })}
                      className={inputCls}
                    />
                  </div>
                )}
              </div>
              
              <div>
                <label className={labelCls}>Note Interne (Non visibili all'atleta)</label>
                <textarea
                  value={form.notes || ''}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className={`${inputCls} resize-none`}
                  rows={2}
                  placeholder="Eventuali annotazioni amministrative..."
                />
              </div>

              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800/50">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                      className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-[var(--color-primary)] focus:ring-[var(--color-primary)]/20"
                    />
                    <span className="text-sm font-bold text-slate-300">Pacchetto Attivo</span>
                  </label>
              </div>

            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--color-panel-border)] bg-slate-900/30 flex items-center justify-end gap-3 shrink-0 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-400 hover:text-white transition-colors">
            Annulla
          </button>
          <button onClick={handleSubmit} className="px-6 py-2 rounded-xl bg-[var(--color-primary)] text-black text-sm font-black hover:bg-[var(--color-primary-hover)] transition-colors">
            {editingPackage ? 'Salva Modifiche' : 'Crea Pacchetto'}
          </button>
        </div>
      </div>
    </div>
  );
};
