import React, { useState, useEffect } from 'react';
import { X, User, Shield, Activity, Target, FileText, Check } from 'lucide-react';
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

export type ModalSection = 'all' | 'anagrafica' | 'stato' | 'emergenza' | 'obiettivi' | 'certificato';

interface AthleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AthleteFormData) => void;
  editingAthlete?: Athlete | null;
  initialSection?: ModalSection;
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
  emergencyContact: {
    name: '',
    phone: '',
    relationship: '',
  },
  notes: '',
  goals: '',
  tags: [],
  medicalNotes: '',
  medicalCertificateExpiryDate: '',
  privacyConsent: true,
  newsletterConsent: false,
});

export const AthleteModal: React.FC<AthleteModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingAthlete,
  initialSection = 'all',
}) => {
  const ownerProfile = getLocalOwnerProfile();
  const [form, setForm] = useState<AthleteFormData>(emptyForm(ownerProfile));
  const [errors, setErrors] = useState<Partial<Record<keyof AthleteFormData, string>>>({});
  const [tagInput, setTagInput] = useState('');
  const [activeTab, setActiveTab] = useState<ModalSection>(initialSection);

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(initialSection);

    if (editingAthlete) {
      setForm({
        firstName: editingAthlete.firstName || '',
        lastName: editingAthlete.lastName || '',
        email: editingAthlete.email || '',
        phone: editingAthlete.phone || '',
        dateOfBirth: editingAthlete.dateOfBirth || '',
        fiscalCode: editingAthlete.fiscalCode || '',
        address: editingAthlete.address || '',
        city: editingAthlete.city || '',
        province: editingAthlete.province || '',
        status: editingAthlete.status || 'active',
        paymentStatus: editingAthlete.paymentStatus || 'none',
        assignedCoachId: editingAthlete.assignedCoachId || (ownerProfile?.id ?? LOCAL_OWNER_ID),
        assignedCoachName: editingAthlete.assignedCoachName || (ownerProfile?.fullName ?? 'Coach Demo'),
        assignedCoachIds: editingAthlete.assignedCoachIds || [],
        contactChannel: editingAthlete.contactChannel || 'whatsapp',
        acquisitionSource: editingAthlete.acquisitionSource || 'referral',
        emergencyContact: {
          name: editingAthlete.emergencyContact?.name || '',
          phone: editingAthlete.emergencyContact?.phone || '',
          relationship: editingAthlete.emergencyContact?.relationship || '',
        },
        notes: editingAthlete.notes || '',
        tags: editingAthlete.tags || [],
        goals: editingAthlete.goals || '',
        medicalNotes: editingAthlete.medicalNotes || '',
        medicalCertificateExpiryDate: editingAthlete.medicalCertificateExpiryDate || '',
        privacyConsent: editingAthlete.privacyConsent !== undefined ? editingAthlete.privacyConsent : true,
        newsletterConsent: editingAthlete.newsletterConsent || false,
      });
    } else {
      setForm(emptyForm(ownerProfile));
    }
    setErrors({});
    setTagInput('');
  }, [isOpen, editingAthlete, initialSection]);

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

  const modalTabs: { id: ModalSection; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'Tutto', icon: <Check className="w-3.5 h-3.5" /> },
    { id: 'anagrafica', label: 'Anagrafica & Contatti', icon: <User className="w-3.5 h-3.5" /> },
    { id: 'stato', label: 'Stato', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'emergenza', label: 'Emergenza', icon: <Shield className="w-3.5 h-3.5" /> },
    { id: 'obiettivi', label: 'Obiettivi', icon: <Target className="w-3.5 h-3.5" /> },
    { id: 'certificato', label: 'Certificato & Consensi', icon: <FileText className="w-3.5 h-3.5" /> },
  ];

  const showAll = activeTab === 'all';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl w-full max-w-2xl shadow-2xl z-10 flex flex-col max-h-[92vh]">
        
        {/* Header Modale */}
        <div className="px-5 py-4 border-b border-[var(--color-panel-border)] shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 flex items-center justify-center">
                <User className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {editingAthlete ? `Modifica: ${editingAthlete.fullName || editingAthlete.firstName}` : 'Nuovo Atleta'}
                </h3>
                <p className="text-[11px] text-slate-400">Seleziona la sezione che desideri aggiornare</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none"
              aria-label="Chiudi finestra"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sub-tab Navigation */}
          {editingAthlete && (
            <div className="flex overflow-x-auto gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800 no-scrollbar">
              {modalTabs.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${activeTab === tab.id
                    ? 'bg-[var(--color-primary)] text-black'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-5 space-y-6">
          
          {/* 1. Dati Anagrafici e Contatti */}
          {(showAll || activeTab === 'anagrafica') && (
            <section className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] flex items-center gap-1.5">
                <User className="w-4 h-4" /> Dati Anagrafici & Contatti
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                <div>
                  <label htmlFor="athlete-fiscalCode" className="block text-xs font-semibold text-slate-300 mb-1">Codice Fiscale</label>
                  <input
                    id="athlete-fiscalCode"
                    value={form.fiscalCode ?? ''}
                    onChange={e => set('fiscalCode', e.target.value)}
                    className={inputClass()}
                    placeholder="es. BNCMRC80A01H501U"
                  />
                </div>
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
                <div>
                  <label htmlFor="athlete-address" className="block text-xs font-semibold text-slate-300 mb-1">Indirizzo</label>
                  <input
                    id="athlete-address"
                    value={form.address ?? ''}
                    onChange={e => set('address', e.target.value)}
                    className={inputClass()}
                    placeholder="es. Via Roma 10"
                  />
                </div>
              </div>
            </section>
          )}

          {/* 2. Stato e Gestione */}
          {(showAll || activeTab === 'stato') && (
            <section className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] flex items-center gap-1.5">
                <Activity className="w-4 h-4" /> Stato e Situazione
              </h4>
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
          )}

          {/* 3. Contatto di Emergenza */}
          {(showAll || activeTab === 'emergenza') && (
            <section className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] flex items-center gap-1.5">
                <Shield className="w-4 h-4" /> Contatto di Emergenza
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nome Referente</label>
                  <input
                    value={form.emergencyContact?.name || ''}
                    onChange={e => set('emergencyContact', { ...form.emergencyContact, name: e.target.value, phone: form.emergencyContact?.phone || '', relationship: form.emergencyContact?.relationship || '' })}
                    className={inputClass()}
                    placeholder="es. Mario Rossi"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Telefono</label>
                  <input
                    value={form.emergencyContact?.phone || ''}
                    onChange={e => set('emergencyContact', { ...form.emergencyContact, phone: e.target.value, name: form.emergencyContact?.name || '', relationship: form.emergencyContact?.relationship || '' })}
                    className={inputClass()}
                    placeholder="+39 333 1112233"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Relazione / Parentela</label>
                  <input
                    value={form.emergencyContact?.relationship || ''}
                    onChange={e => set('emergencyContact', { ...form.emergencyContact, relationship: e.target.value, name: form.emergencyContact?.name || '', phone: form.emergencyContact?.phone || '' })}
                    className={inputClass()}
                    placeholder="es. Padre, Coniuge..."
                  />
                </div>
              </div>
            </section>
          )}

          {/* 4. Obiettivi e Note */}
          {(showAll || activeTab === 'obiettivi') && (
            <section className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] flex items-center gap-1.5">
                <Target className="w-4 h-4" /> Obiettivi, Disciplina & Note
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Obiettivi dell'atleta</label>
                  <textarea value={form.goals ?? ''} onChange={e => set('goals', e.target.value)} rows={2}
                    className={`${inputClass()} resize-none`} placeholder="Descrivi gli obiettivi dell'atleta..." />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Note interne riservate</label>
                  <textarea value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} rows={2}
                    className={`${inputClass()} resize-none`} placeholder="Note visibili solo ai coach..." />
                </div>
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
          )}

          {/* 5. Certificato Medico e Consensi */}
          {(showAll || activeTab === 'certificato') && (
            <section className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] flex items-center gap-1.5">
                <FileText className="w-4 h-4" /> Certificato Medico & Consensi
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Scadenza Certificato Medico</label>
                  <input
                    type="date"
                    value={form.medicalCertificateExpiryDate ?? ''}
                    onChange={e => set('medicalCertificateExpiryDate', e.target.value)}
                    className={inputClass()}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Note Certificato / Idoneità</label>
                  <input
                    value={form.medicalNotes ?? ''}
                    onChange={e => set('medicalNotes', e.target.value)}
                    className={inputClass()}
                    placeholder="es. Visita agonistica idonea..."
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={form.privacyConsent}
                    onChange={e => set('privacyConsent', e.target.checked)}
                    className="accent-[var(--color-primary)]" />
                  <span className="text-xs text-slate-300 font-semibold">Consenso Privacy acquisito</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={form.newsletterConsent}
                    onChange={e => set('newsletterConsent', e.target.checked)}
                    className="accent-[var(--color-primary)]" />
                  <span className="text-xs text-slate-300">Consenso all'invio di comunicazioni e newsletter</span>
                </label>
              </div>
            </section>
          )}
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
