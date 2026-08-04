import React, { useState, useEffect } from 'react';
import { X, User, AlertTriangle, Info } from 'lucide-react';
import {
  AthleteFormData,
  Athlete,
  AthleteStatus,
  AthletePaymentStatus,
  ContactChannel,
  AcquisitionSource,
} from '../../types';
import {
  athleteStatusLabel,
  paymentStatusLabel,
  contactChannelLabel,
  acquisitionSourceLabel,
} from './AthleteBadges';
import { LOCAL_OWNER_ID, getLocalOwnerProfile } from '../../lib/ownerProfile';

interface AthleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AthleteFormData) => void;
  editingAthlete?: Athlete | null;
}

const emptyForm = (ownerProfile: ReturnType<typeof getLocalOwnerProfile>): AthleteFormData => ({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  city: '',
  province: '',
  address: '',
  fiscalCode: '',
  status: 'trial',
  paymentStatus: 'none',
  assignedCoachId: ownerProfile?.id ?? LOCAL_OWNER_ID,
  assignedCoachName: ownerProfile?.fullName ?? 'Coach Demo',
  contactChannel: 'whatsapp',
  acquisitionSource: 'referral',
  notes: '',
  goals: '',
  tags: [],
  privacyConsent: false,
  newsletterConsent: false,
});

export const AthleteModal: React.FC<AthleteModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingAthlete,
}) => {
  const ownerProfile = getLocalOwnerProfile();
  const [form, setForm] = useState<AthleteFormData>(emptyForm(ownerProfile));
  const [errors, setErrors] = useState<Partial<Record<keyof AthleteFormData, string>>>({});
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (editingAthlete) {
      setForm({
        firstName: editingAthlete.firstName,
        lastName: editingAthlete.lastName,
        email: editingAthlete.email,
        phone: editingAthlete.phone,
        dateOfBirth: editingAthlete.dateOfBirth,
        fiscalCode: editingAthlete.fiscalCode,
        address: editingAthlete.address,
        city: editingAthlete.city,
        province: editingAthlete.province,
        status: editingAthlete.status,
        paymentStatus: editingAthlete.paymentStatus,
        assignedCoachId: editingAthlete.assignedCoachId,
        assignedCoachName: editingAthlete.assignedCoachName,
        assignedCoachIds: editingAthlete.assignedCoachIds,
        contactChannel: editingAthlete.contactChannel,
        acquisitionSource: editingAthlete.acquisitionSource,
        emergencyContact: editingAthlete.emergencyContact,
        notes: editingAthlete.notes,
        tags: editingAthlete.tags,
        goals: editingAthlete.goals,
        medicalNotes: editingAthlete.medicalNotes,
        privacyConsent: editingAthlete.privacyConsent,
        newsletterConsent: editingAthlete.newsletterConsent,
      });
    } else {
      setForm(emptyForm(ownerProfile));
    }
    setErrors({});
    setTagInput('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingAthlete]);

  // Chiusura con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen) onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const set = <K extends keyof AthleteFormData>(key: K, value: AthleteFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const e: Partial<Record<keyof AthleteFormData, string>> = {};
    if (!form.firstName.trim() || form.firstName.trim().length < 2)
      e.firstName = 'Nome obbligatorio (min. 2 caratteri)';
    if (!form.lastName.trim() || form.lastName.trim().length < 2)
      e.lastName = 'Cognome obbligatorio (min. 2 caratteri)';
    if (!form.phone.trim())
      e.phone = 'Telefono obbligatorio';
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      e.email = 'Email non valida';
    if (!form.privacyConsent)
      e.privacyConsent = 'Il consenso privacy è obbligatorio';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({
      ...form,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
    });
    onClose();
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !(form.tags ?? []).includes(t)) {
      set('tags', [...(form.tags ?? []), t]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) =>
    set('tags', (form.tags ?? []).filter(t => t !== tag));

  const selectClass = (hasError?: string) =>
    `w-full px-3 py-2 rounded-xl bg-slate-900 border ${hasError ? 'border-red-500' : 'border-[var(--color-panel-border)]'} text-white text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors`;

  const inputClass = (hasError?: string) => selectClass(hasError);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl w-full max-w-2xl shadow-2xl z-10 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-panel-border)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 flex items-center justify-center">
              <User className="w-5 h-5 text-[var(--color-primary)]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {editingAthlete ? 'Modifica Atleta' : 'Nuovo Atleta'}
              </h3>
              <p className="text-[11px] text-slate-400">I campi con * sono obbligatori</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            aria-label="Chiudi finestra modifica atleta"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Dati Anagrafici */}
          <section>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] mb-3">Dati Anagrafici</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Nome */}
              <div>
                <label htmlFor="athlete-firstName" className="block text-xs font-semibold text-slate-300 mb-1">Nome *</label>
                <input
                  id="athlete-firstName"
                  value={form.firstName}
                  onChange={e => set('firstName', e.target.value)}
                  className={inputClass(errors.firstName)}
                  placeholder="es. Marco"
                />
                {errors.firstName && <p className="text-[11px] text-red-400 mt-1">{errors.firstName}</p>}
              </div>
              {/* Cognome */}
              <div>
                <label htmlFor="athlete-lastName" className="block text-xs font-semibold text-slate-300 mb-1">Cognome *</label>
                <input
                  id="athlete-lastName"
                  value={form.lastName}
                  onChange={e => set('lastName', e.target.value)}
                  className={inputClass(errors.lastName)}
                  placeholder="es. Bianchi"
                />
                {errors.lastName && <p className="text-[11px] text-red-400 mt-1">{errors.lastName}</p>}
              </div>
              {/* Email */}
              <div>
                <label htmlFor="athlete-email" className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
                <input
                  id="athlete-email"
                  type="email"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  className={inputClass(errors.email)}
                  placeholder="atleta@esempio.com"
                />
                {errors.email && <p className="text-[11px] text-red-400 mt-1">{errors.email}</p>}
              </div>
              {/* Telefono */}
              <div>
                <label htmlFor="athlete-phone" className="block text-xs font-semibold text-slate-300 mb-1">Telefono *</label>
                <input
                  id="athlete-phone"
                  value={form.phone}
                  onChange={e => set('phone', e.target.value)}
                  className={inputClass(errors.phone)}
                  placeholder="+39 333 0000000"
                />
                {errors.phone && <p className="text-[11px] text-red-400 mt-1">{errors.phone}</p>}
              </div>
              {/* Data di Nascita */}
              <div>
                <label htmlFor="athlete-dateOfBirth" className="block text-xs font-semibold text-slate-300 mb-1">Data di Nascita</label>
                <input
                  id="athlete-dateOfBirth"
                  type="date"
                  value={form.dateOfBirth ?? ''}
                  onChange={e => set('dateOfBirth', e.target.value)}
                  className={inputClass()}
                />
              </div>
              {/* Città */}
              <div>
                <label htmlFor="athlete-city" className="block text-xs font-semibold text-slate-300 mb-1">Città</label>
                <input
                  id="athlete-city"
                  value={form.city ?? ''}
                  onChange={e => set('city', e.target.value)}
                  className={inputClass()}
                  placeholder="es. Milano"
                />
              </div>
            </div>
          </section>

          {/* Stato e Gestione */}
          <section>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] mb-3">Stato e Gestione</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="athlete-status" className="block text-xs font-semibold text-slate-300 mb-1">Stato *</label>
                <select
                  id="athlete-status"
                  value={form.status}
                  onChange={e => set('status', e.target.value as AthleteStatus)}
                  className={selectClass()}
                >
                  {(Object.keys(athleteStatusLabel) as AthleteStatus[]).map(s => (
                    <option key={s} value={s}>{athleteStatusLabel[s]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="athlete-paymentStatus" className="block text-xs font-semibold text-slate-300 mb-1">Situazione Pagamenti</label>
                <select
                  id="athlete-paymentStatus"
                  value={form.paymentStatus}
                  onChange={e => set('paymentStatus', e.target.value as AthletePaymentStatus)}
                  className={selectClass()}
                >
                  {(Object.keys(paymentStatusLabel) as AthletePaymentStatus[]).map(s => (
                    <option key={s} value={s}>{paymentStatusLabel[s]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Canale Contatto</label>
                <select value={form.contactChannel} onChange={e => set('contactChannel', e.target.value as ContactChannel)} className={selectClass()}>
                  {(Object.keys(contactChannelLabel) as ContactChannel[]).map(c => (
                    <option key={c} value={c}>{contactChannelLabel[c]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Fonte Acquisizione</label>
                <select value={form.acquisitionSource} onChange={e => set('acquisitionSource', e.target.value as AcquisitionSource)} className={selectClass()}>
                  {(Object.keys(acquisitionSourceLabel) as AcquisitionSource[]).map(s => (
                    <option key={s} value={s}>{acquisitionSourceLabel[s]}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Obiettivi e Note */}
          <section>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] mb-3">Obiettivi e Note</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Obiettivi dell'atleta</label>
                <textarea value={form.goals ?? ''} onChange={e => set('goals', e.target.value)} rows={2}
                  className={`${inputClass()} resize-none`} placeholder="Descrivi gli obiettivi dell'atleta..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Note interne</label>
                <textarea value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} rows={2}
                  className={`${inputClass()} resize-none`} placeholder="Note visibili solo ai coach..." />
              </div>
              {/* Tag */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tag / Discipline</label>
                <div className="flex gap-2">
                  <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                    className={`${inputClass()} flex-1`} placeholder="es. forza, running..." />
                  <button type="button" onClick={addTag}
                    className="px-3 py-2 rounded-xl bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/40 text-[var(--color-primary)] text-xs font-bold hover:bg-[var(--color-primary)]/30 transition-colors">
                    Aggiungi
                  </button>
                </div>
                {(form.tags ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(form.tags ?? []).map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30 text-[var(--color-primary)] text-[11px] font-semibold">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="hover:text-white ml-0.5">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Consensi & Avviso Privacy */}
          <section>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] mb-3">Consensi & Avviso Privacy</h4>
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="font-bold text-amber-400">Ambiente Didattico Demo:</strong> I dati inseriti sono conservati solo nel browser locale. Non inserire dati sanitari, medici o documenti personali reali.
                </span>
              </div>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" checked={form.privacyConsent}
                  onChange={e => set('privacyConsent', e.target.checked)}
                  className="mt-0.5 accent-[var(--color-primary)]" />
                <span className="text-xs text-slate-300">
                  <span className="font-semibold text-white">Consenso Privacy *</span> — L'atleta ha preso visione dell'informativa sulla privacy (simulata).
                </span>
              </label>
              {errors.privacyConsent && (
                <p className="text-[11px] text-red-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{errors.privacyConsent}</p>
              )}
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" checked={form.newsletterConsent}
                  onChange={e => set('newsletterConsent', e.target.checked)}
                  className="mt-0.5 accent-[var(--color-primary)]" />
                <span className="text-xs text-slate-300">Consenso all'invio di comunicazioni e newsletter.</span>
              </label>
            </div>
          </section>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-[var(--color-panel-border)] bg-slate-900/40 shrink-0">
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white border border-slate-700 hover:bg-slate-800 transition-colors">
            Annulla
          </button>
          <button type="button" onClick={handleSubmit}
            className="px-5 py-2 rounded-xl bg-[var(--color-primary)] text-black font-extrabold text-xs uppercase tracking-wide hover:bg-[var(--color-primary-hover)] transition-colors shadow-lg shadow-[var(--color-primary)]/20">
            {editingAthlete ? 'Salva Modifiche' : 'Aggiungi Atleta'}
          </button>
        </div>
      </div>
    </div>
  );
};
