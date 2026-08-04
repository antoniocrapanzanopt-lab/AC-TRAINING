import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, AlertTriangle, FileText, Settings2, CreditCard } from 'lucide-react';
import {
  SubscriptionFormData,
  AthleteSubscription,
  DiscountType,
  PaymentFrequency,
  PaymentMethod,
  RenewalType,
} from '../../types';
import { useAthletes } from '../../context/AthletesContext';
import { usePackages } from '../../context/PackagesContext';
import { generateInstallments } from '../../context/SubscriptionsContext';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: SubscriptionFormData) => void;
  editingSubscription?: AthleteSubscription | null;
  preselectedAthleteId?: string; // Se aperto dal dettaglio atleta
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ 
  isOpen, onClose, onSave, editingSubscription, preselectedAthleteId 
}) => {
  const { athletes } = useAthletes();
  const { packages } = usePackages();

  const activeAthletes = useMemo(() => athletes.filter(a => a.status !== 'archived'), [athletes]);
  const activePackages = useMemo(() => packages.filter(p => p.isActive), [packages]);

  const [form, setForm] = useState<Partial<SubscriptionFormData>>({
    athleteId: preselectedAthleteId || '',
    packageId: '',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
    discountType: 'none',
    discountValue: 0,
    preferredPaymentMethod: 'card',
    renewalType: 'manual',
    toleranceDays: 5,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof SubscriptionFormData, string>>>({});
  const [showInstallmentsPreview, setShowInstallmentsPreview] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (editingSubscription) {
      setForm({
        ...editingSubscription,
        startDate: editingSubscription.startDate.slice(0, 10),
        endDate: editingSubscription.endDate.slice(0, 10),
        firstInstallmentDate: editingSubscription.installments[0]?.dueDate.slice(0, 10) || new Date().toISOString().slice(0, 10),
      });
    } else {
      setForm({
        athleteId: preselectedAthleteId || '',
        packageId: '',
        startDate: new Date().toISOString().slice(0, 10),
        endDate: '',
        discountType: 'none',
        discountValue: 0,
        preferredPaymentMethod: 'card',
        renewalType: 'manual',
        toleranceDays: 5,
        firstInstallmentDate: new Date().toISOString().slice(0, 10),
      });
    }
    setErrors({});
    setShowInstallmentsPreview(false);
  }, [isOpen, editingSubscription, preselectedAthleteId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen) onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Gestione Selezione Pacchetto (Autofill)
  const handlePackageChange = (pkgId: string) => {
    const pkg = packages.find(p => p.id === pkgId);
    if (!pkg) {
      setForm({ ...form, packageId: '' });
      return;
    }

    // Calcola end date base (approssimativa per i mesi/anni)
    const sDate = form.startDate ? new Date(form.startDate) : new Date();
    const eDate = new Date(sDate);
    if (pkg.durationUnit === 'days') eDate.setDate(eDate.getDate() + pkg.duration);
    else if (pkg.durationUnit === 'weeks') eDate.setDate(eDate.getDate() + (pkg.duration * 7));
    else if (pkg.durationUnit === 'months') eDate.setMonth(eDate.getMonth() + pkg.duration);
    else if (pkg.durationUnit === 'years') eDate.setFullYear(eDate.getFullYear() + pkg.duration);

    setForm({
      ...form,
      packageId: pkg.id,
      packageName: pkg.name,
      listPrice: pkg.price,
      discountType: pkg.discountType,
      discountValue: pkg.discountValue || 0,
      paymentFrequency: pkg.paymentFrequency,
      installmentsCount: pkg.installments,
      setupFee: pkg.setupFee || 0,
      endDate: eDate.toISOString().slice(0, 10),
      renewalType: pkg.renewalType,
    });
  };

  // Calcolo prezzo finale in tempo reale (Listino + Quota Iscrizione/Extra - Sconto)
  const finalPrice = useMemo(() => {
    const list = form.listPrice || 0;
    const fee = form.setupFee || 0;
    const base = list + fee;
    if (form.discountType === 'fixed') return Math.max(0, base - (form.discountValue || 0));
    if (form.discountType === 'percentage') return Math.max(0, base - (base * (form.discountValue || 0) / 100));
    return base;
  }, [form.listPrice, form.setupFee, form.discountType, form.discountValue]);

  useEffect(() => {
    setForm(prev => ({ ...prev, finalPrice }));
  }, [finalPrice]);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof SubscriptionFormData, string>> = {};
    if (!form.athleteId) newErrors.athleteId = 'Seleziona un atleta.';
    if (!form.packageId) newErrors.packageId = 'Seleziona un pacchetto.';
    if (!form.startDate) newErrors.startDate = 'Data di inizio obbligatoria.';
    if (!form.endDate) newErrors.endDate = 'Data di fine obbligatoria.';
    if (new Date(form.endDate!) <= new Date(form.startDate!)) newErrors.endDate = 'La data di fine deve essere successiva all\'inizio.';
    if (!form.installmentsCount || form.installmentsCount < 1) newErrors.installmentsCount = 'Minimo 1 rata.';
    if (form.finalPrice! < 0) newErrors.finalPrice = 'Il prezzo non può essere negativo.';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      // Completa i dati mancanti con asserzioni di tipo (valide post validate)
      const athlete = athletes.find(a => a.id === form.athleteId);
      const dataToSave: SubscriptionFormData = {
        athleteId: form.athleteId!,
        athleteName: athlete?.fullName || 'Sconosciuto',
        packageId: form.packageId!,
        packageName: form.packageName!,
        startDate: new Date(form.startDate!).toISOString(),
        endDate: new Date(form.endDate!).toISOString(),
        listPrice: form.listPrice!,
        discountType: form.discountType!,
        discountValue: form.discountValue || 0,
        finalPrice: form.finalPrice!,
        paymentFrequency: form.paymentFrequency!,
        installmentsCount: form.installmentsCount!,
        setupFee: form.setupFee || 0,
        preferredPaymentMethod: form.preferredPaymentMethod!,
        renewalType: form.renewalType!,
        toleranceDays: form.toleranceDays || 0,
        firstInstallmentDate: new Date(form.firstInstallmentDate!).toISOString(),
        notes: form.notes,
      };
      onSave(dataToSave);
      onClose();
    }
  };

  if (!isOpen) return null;

  const inputCls = "w-full px-3 py-2 rounded-xl bg-slate-950 border border-[var(--color-panel-border)] text-white text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-slate-600";
  const labelCls = "block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide";

  const generatedPreview = form.finalPrice !== undefined && form.installmentsCount !== undefined && form.firstInstallmentDate
    ? generateInstallments(form.finalPrice, form.installmentsCount, new Date(form.firstInstallmentDate).toISOString(), form.paymentFrequency || 'single')
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-4xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl shadow-2xl flex flex-col max-h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-panel-border)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 flex items-center justify-center">
              <FileText className="w-5 h-5 text-[var(--color-primary)]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {editingSubscription ? 'Modifica Abbonamento' : 'Nuovo Abbonamento'}
              </h2>
              <p className="text-xs text-slate-400">Associa un pacchetto e configura date e pagamenti</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-8">
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* COLONNA SINISTRA: ATLETA, PACCHETTO, DATE */}
            <div className="space-y-6">
              
              {/* Assegnazione */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[var(--color-primary)] uppercase tracking-wider border-b border-slate-800 pb-2">Assegnazione</h3>
                
                <div>
                  <label className={labelCls}>Atleta *</label>
                  <select
                    value={form.athleteId}
                    onChange={(e) => setForm({ ...form, athleteId: e.target.value })}
                    className={inputCls}
                    disabled={!!preselectedAthleteId || !!editingSubscription}
                  >
                    <option value="">-- Seleziona Atleta --</option>
                    {activeAthletes.map(a => (
                      <option key={a.id} value={a.id}>{a.fullName} ({a.email || 'Nessuna email'})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Pacchetto Base *</label>
                  <select
                    value={form.packageId}
                    onChange={(e) => handlePackageChange(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">-- Seleziona Pacchetto --</option>
                    {activePackages.map(p => (
                      <option key={p.id} value={p.id}>{p.name} - {p.price}€</option>
                    ))}
                  </select>
                  {!form.packageId && <p className="text-xs text-slate-500 mt-1">Seleziona un pacchetto per autocompletare i campi seguenti.</p>}
                </div>
              </div>

              {/* Validità */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[var(--color-primary)] uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Validità
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Data Inizio *</label>
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => {
                        setForm({ ...form, startDate: e.target.value });
                        // Ricalcolare la data di fine automaticamente al variare dell'inizio è omesso per semplicità per permettere all'utente di definire custom date
                      }}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Data Fine (Scadenza) *</label>
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>

              {/* Note */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[var(--color-primary)] uppercase tracking-wider border-b border-slate-800 pb-2">Annotazioni</h3>
                <textarea
                  value={form.notes || ''}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className={`${inputCls} resize-none`}
                  rows={2}
                  placeholder="Note aggiuntive su questo abbonamento..."
                />
              </div>

            </div>

            {/* COLONNA DESTRA: PREZZI E RATE */}
            <div className="space-y-6">
              
              {/* Costi e Sconti */}
              <div className="space-y-4 p-4 rounded-xl bg-slate-900 border border-slate-700">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center justify-between">
                  <span>Costi e Sconti</span>
                  <span className="text-lg font-black text-[var(--color-primary)]">{finalPrice.toFixed(2)}€</span>
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Prezzo di Listino (€) *</label>
                    <input
                      type="number" min="0" step="0.01"
                      value={form.listPrice || 0}
                      onChange={(e) => setForm({ ...form, listPrice: parseFloat(e.target.value) || 0 })}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Quota Iscrizione/Extra (€)</label>
                    <input
                      type="number" min="0" step="0.01"
                      value={form.setupFee || 0}
                      onChange={(e) => setForm({ ...form, setupFee: parseFloat(e.target.value) || 0 })}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Tipo Sconto</label>
                    <select
                      value={form.discountType}
                      onChange={(e) => setForm({ ...form, discountType: e.target.value as DiscountType, discountValue: 0 })}
                      className={inputCls}
                    >
                      <option value="none">Nessuno</option>
                      <option value="percentage">Percentuale (%)</option>
                      <option value="fixed">Fisso (€)</option>
                    </select>
                  </div>
                  {form.discountType !== 'none' && (
                    <div>
                      <label className={labelCls}>Valore Sconto</label>
                      <input
                        type="number" min="0" step={form.discountType === 'percentage' ? '1' : '0.01'}
                        value={form.discountValue || 0}
                        onChange={(e) => setForm({ ...form, discountValue: parseFloat(e.target.value) || 0 })}
                        className={inputCls}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Pagamenti e Rate */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[var(--color-primary)] uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" /> Configurazione Rate
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Frequenza</label>
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
                      type="number" min="1"
                      value={form.installmentsCount || 1}
                      onChange={(e) => setForm({ ...form, installmentsCount: parseInt(e.target.value) || 1 })}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Data Prima Rata *</label>
                    <input
                      type="date"
                      value={form.firstInstallmentDate}
                      onChange={(e) => setForm({ ...form, firstInstallmentDate: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Metodo Preferito</label>
                    <select
                      value={form.preferredPaymentMethod}
                      onChange={(e) => setForm({ ...form, preferredPaymentMethod: e.target.value as PaymentMethod })}
                      className={inputCls}
                    >
                      <option value="card">Carta di Credito</option>
                      <option value="transfer">Bonifico</option>
                      <option value="cash">Contanti</option>
                      <option value="direct_debit">Addebito Diretto</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Rinnovo</label>
                    <select
                      value={form.renewalType}
                      onChange={(e) => setForm({ ...form, renewalType: e.target.value as RenewalType })}
                      className={inputCls}
                    >
                      <option value="manual">Manuale</option>
                      <option value="automatic">Automatico</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Tolleranza Pagam. (Giorni)</label>
                    <input
                      type="number" min="0"
                      value={form.toleranceDays || 0}
                      onChange={(e) => setForm({ ...form, toleranceDays: parseInt(e.target.value) || 0 })}
                      className={inputCls}
                    />
                  </div>
                </div>

                {/* Preview Rate */}
                <div className="pt-2">
                  <button type="button" onClick={() => setShowInstallmentsPreview(!showInstallmentsPreview)}
                    className="text-xs font-bold text-slate-400 hover:text-[var(--color-primary)] transition-colors flex items-center gap-1">
                    <Settings2 className="w-3.5 h-3.5" />
                    {showInstallmentsPreview ? 'Nascondi Preview Rate' : 'Mostra Preview Rate Generabili'}
                  </button>
                  {showInstallmentsPreview && generatedPreview.length > 0 && (
                    <div className="mt-3 p-3 rounded-xl bg-slate-900 border border-slate-700 max-h-40 overflow-y-auto space-y-1.5 no-scrollbar">
                      {generatedPreview.map((inst, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs text-slate-300 py-1 border-b border-slate-800 last:border-0">
                          <span>Rata {idx + 1} - {new Date(inst.dueDate).toLocaleDateString('it-IT')}</span>
                          <span className="font-mono font-bold text-white">{inst.amount.toFixed(2)}€</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

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
            {editingSubscription ? 'Salva Modifiche' : 'Crea Abbonamento'}
          </button>
        </div>
      </div>
    </div>
  );
};
