import React, { useState, useEffect } from 'react';
import { X, User, Activity, Target, Settings, Check, Upload, Trash2 } from 'lucide-react';
import {
  AthleteFormData,
  AthleteGender,
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
import { compressImageFile } from '../../utils/fileCompressor';
import { uploadMedicalCertificateToStorage, getSignedMedicalCertificateUrl } from '../../lib/storage';

export type ModalSection = 'anagrafica' | 'profilo' | 'obiettivi' | 'avanzato';

interface AthleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AthleteFormData) => void;
  editingAthlete?: Athlete | null;
  initialSection?: ModalSection;
}

const genderLabel: Record<AthleteGender, string> = {
  male: 'Uomo',
  female: 'Donna',
  other: 'Altro',
  prefer_not_to_say: 'Preferisco non indicare',
};

const emptyForm = (ownerProfile: ReturnType<typeof getLocalOwnerProfile>): AthleteFormData => ({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  gender: undefined,
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
  medicalCertificateType: 'agonistico',
  telegramUsername: '',
  privacyConsent: true,
  newsletterConsent: false,
});

export const AthleteModal: React.FC<AthleteModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingAthlete,
  initialSection = 'anagrafica',
}) => {
  const ownerProfile = getLocalOwnerProfile();
  const [form, setForm] = useState<AthleteFormData>(emptyForm(ownerProfile));
  const [errors, setErrors] = useState<Partial<Record<keyof AthleteFormData, string>>>({});
  const [tagInput, setTagInput] = useState('');
  const [activeTab, setActiveTab] = useState<ModalSection>(initialSection);

  // State per la compressione
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionStats, setCompressionStats] = useState<{ originalKB: number; compressedKB: number; reduction: number } | null>(null);

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
        gender: editingAthlete.gender,
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
        medicalCertificateType: editingAthlete.medicalCertificateType || 'agonistico',
        telegramUsername: editingAthlete.telegramUsername || '',
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Il file è troppo grande (max 10MB)');
      return;
    }

    setIsCompressing(true);
    setCompressionStats(null);

    try {
      const compressed = await compressImageFile(file, 1600, 1600, 0.75);

      setCompressionStats({
        originalKB: compressed.originalSizeKB,
        compressedKB: compressed.compressedSizeKB,
        reduction: compressed.reductionPercentage,
      });

      const targetAthleteId = editingAthlete?.id || 'temp';
      const uploadRes = await uploadMedicalCertificateToStorage(targetAthleteId, compressed.file, compressed.dataUrl);

      set('medicalCertificateUrl', uploadRes.url);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Errore sconosciuto';
      console.error('Errore durante la compressione o upload:', err);
      alert('Errore durante l\'elaborazione del file: ' + message);
    } finally {
      setIsCompressing(false);
    }
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

  const inputClass = (hasError?: string) =>
    `w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border ${hasError ? 'border-red-500' : 'border-[var(--color-panel-border)]'} text-white text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors placeholder-slate-600`;

  const selectClass = (hasError?: string) =>
    `w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border ${hasError ? 'border-red-500' : 'border-[var(--color-panel-border)]'} text-white text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors`;

  const labelClass = 'block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide';

  const modalTabs: { id: ModalSection; label: string; icon: React.ReactNode }[] = [
    { id: 'anagrafica', label: 'Anagrafica', icon: <User className="w-3.5 h-3.5" /> },
    { id: 'profilo', label: 'Profilo Atleta', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'obiettivi', label: 'Obiettivi & Note', icon: <Target className="w-3.5 h-3.5" /> },
    { id: 'avanzato', label: 'Avanzato', icon: <Settings className="w-3.5 h-3.5" /> },
  ];

  const SectionTitle: React.FC<{ icon: React.ReactNode; title: string; subtitle?: string }> = ({ icon, title, subtitle }) => (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)] shrink-0">
        {icon}
      </div>
      <div>
        <h4 className="text-sm font-bold text-white">{title}</h4>
        {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );

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
                <p className="text-[11px] text-slate-500">
                  {editingAthlete ? 'Modifica i dati per sezione' : 'Inserisci i dati del nuovo atleta'}
                </p>
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

          {/* Tab Navigation */}
          <div className="flex overflow-x-auto gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800 no-scrollbar">
            {modalTabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${activeTab === tab.id
                  ? 'bg-[var(--color-primary)] text-black shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6">

          {/* ─── TAB: ANAGRAFICA ─── */}
          {activeTab === 'anagrafica' && (
            <div className="space-y-5">
              <SectionTitle
                icon={<User className="w-4 h-4" />}
                title="Anagrafica"
                subtitle="Dati identificativi principali dell'atleta"
              />

              {/* Campi principali */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="athlete-firstName" className={labelClass}>Nome *</label>
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
                  <label htmlFor="athlete-lastName" className={labelClass}>Cognome *</label>
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
                  <label htmlFor="athlete-phone" className={labelClass}>Telefono *</label>
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
                  <label htmlFor="athlete-email" className={labelClass}>Email</label>
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
                  <label htmlFor="athlete-dateOfBirth" className={labelClass}>Data di Nascita</label>
                  <input
                    id="athlete-dateOfBirth"
                    type="date"
                    value={form.dateOfBirth ?? ''}
                    onChange={e => set('dateOfBirth', e.target.value)}
                    className={inputClass()}
                  />
                </div>
                <div>
                  <label htmlFor="athlete-gender" className={labelClass}>Genere</label>
                  <select
                    id="athlete-gender"
                    value={form.gender ?? ''}
                    onChange={e => set('gender', e.target.value as AthleteGender || undefined)}
                    className={selectClass()}
                  >
                    <option value="">— Non specificato —</option>
                    {(Object.keys(genderLabel) as AthleteGender[]).map(g => (
                      <option key={g} value={g}>{genderLabel[g]}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Separatore campi secondari */}
              <div className="border-t border-slate-800 pt-4">
                <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-3">Contatti aggiuntivi</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="athlete-telegram" className={labelClass}>Telegram</label>
                    <input
                      id="athlete-telegram"
                      value={form.telegramUsername ?? ''}
                      onChange={e => set('telegramUsername', e.target.value)}
                      className={inputClass()}
                      placeholder="@username o +393330000000"
                    />
                  </div>
                  <div>
                    <label htmlFor="athlete-city" className={labelClass}>Città</label>
                    <input
                      id="athlete-city"
                      value={form.city ?? ''}
                      onChange={e => set('city', e.target.value)}
                      className={inputClass()}
                      placeholder="es. Milano"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB: PROFILO ATLETA ─── */}
          {activeTab === 'profilo' && (
            <div className="space-y-5">
              <SectionTitle
                icon={<Activity className="w-4 h-4" />}
                title="Profilo Atleta"
                subtitle="Stato operativo e gestione coaching"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="athlete-status" className={labelClass}>Stato Atleta *</label>
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
                  <label className={labelClass}>Canale Contatto Preferito</label>
                  <select
                    value={form.contactChannel}
                    onChange={e => set('contactChannel', e.target.value as ContactChannel)}
                    className={selectClass()}
                  >
                    {(Object.keys(contactChannelLabel) as ContactChannel[]).map(c => (
                      <option key={c} value={c}>{contactChannelLabel[c]}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Coach Assegnato</label>
                  <input
                    value={form.assignedCoachName}
                    onChange={e => set('assignedCoachName', e.target.value)}
                    className={inputClass()}
                    placeholder="Nome del coach responsabile"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Coach principale responsabile di questo atleta</p>
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB: OBIETTIVI & NOTE ─── */}
          {activeTab === 'obiettivi' && (
            <div className="space-y-5">
              <SectionTitle
                icon={<Target className="w-4 h-4" />}
                title="Obiettivi & Note"
                subtitle="Definisci il percorso e le priorità dell'atleta"
              />

              {/* Sezione Obiettivi — Hero */}
              <div className="bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20 rounded-2xl p-5 space-y-3">
                <label className="block text-sm font-bold text-[var(--color-primary)]">
                  🎯 Obiettivi dell'atleta
                </label>
                <textarea
                  value={form.goals ?? ''}
                  onChange={e => set('goals', e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-[var(--color-primary)]/20 text-slate-100 text-base leading-relaxed resize-none focus:outline-none focus:border-[var(--color-primary)] transition-colors placeholder-slate-600"
                  placeholder="Descrivi gli obiettivi dell'atleta: performance, composizione corporea, competizioni, benessere…"
                />
                <p className="text-[11px] text-slate-500">Visibile nel profilo e usato per personalizzare il coaching</p>
              </div>

              {/* Tag / Discipline */}
              <div className="space-y-2">
                <label className={labelClass}>Discipline & Tag</label>
                <div className="flex gap-2">
                  <input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                    className={`${inputClass()} flex-1`}
                    placeholder="es. forza, running, powerlifting…"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="px-4 py-2.5 rounded-xl bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30 text-[var(--color-primary)] text-xs font-bold hover:bg-[var(--color-primary)]/25 transition-colors whitespace-nowrap"
                  >
                    + Aggiungi
                  </button>
                </div>
                {(form.tags ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {(form.tags ?? []).map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30 text-[var(--color-primary)] text-xs font-semibold">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="hover:text-white opacity-60 hover:opacity-100 transition-opacity">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Note interne */}
              <div className="border-t border-slate-800 pt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <label className={labelClass}>🔒 Note Interne Riservate</label>
                  <span className="text-[10px] font-black uppercase text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                    Solo per il Coach (Privato)
                  </span>
                </div>
                <textarea
                  value={form.notes ?? ''}
                  onChange={e => set('notes', e.target.value)}
                  rows={4}
                  className={`${inputClass()} resize-none`}
                  placeholder="Appunti confidenziali, anamnesi personale, orari di lavoro, note private sul cliente… (Strettamente riservato)"
                />
                <p className="text-[11px] text-amber-300/80 font-medium">
                  🔒 Questo campo non viene MAI mostrato né inviato all'atleta o al suo portale.
                </p>
              </div>
            </div>
          )}

          {/* ─── TAB: AVANZATO ─── */}
          {activeTab === 'avanzato' && (
            <div className="space-y-6">
              <SectionTitle
                icon={<Settings className="w-4 h-4" />}
                title="Dati Avanzati"
                subtitle="Dati opzionali — compila solo se disponibili"
              />

              {/* Contatto di Emergenza */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-slate-800 flex items-center justify-center text-[10px]">🚨</span>
                  Contatto di Emergenza
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={labelClass}>Nome Referente</label>
                    <input
                      value={form.emergencyContact?.name || ''}
                      onChange={e => set('emergencyContact', { ...form.emergencyContact, name: e.target.value, phone: form.emergencyContact?.phone || '', relationship: form.emergencyContact?.relationship || '' })}
                      className={inputClass()}
                      placeholder="es. Mario Rossi"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Telefono</label>
                    <input
                      value={form.emergencyContact?.phone || ''}
                      onChange={e => set('emergencyContact', { ...form.emergencyContact, phone: e.target.value, name: form.emergencyContact?.name || '', relationship: form.emergencyContact?.relationship || '' })}
                      className={inputClass()}
                      placeholder="+39 333 1112233"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Relazione</label>
                    <input
                      value={form.emergencyContact?.relationship || ''}
                      onChange={e => set('emergencyContact', { ...form.emergencyContact, relationship: e.target.value, name: form.emergencyContact?.name || '', phone: form.emergencyContact?.phone || '' })}
                      className={inputClass()}
                      placeholder="es. Padre, Coniuge"
                    />
                  </div>
                </div>
              </div>

              {/* Dati Amministrativi */}
              <div className="border-t border-slate-800 pt-4 space-y-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-slate-800 flex items-center justify-center text-[10px]">📋</span>
                  Dati Amministrativi
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="athlete-fiscalCode" className={labelClass}>Codice Fiscale</label>
                    <input
                      id="athlete-fiscalCode"
                      value={form.fiscalCode ?? ''}
                      onChange={e => set('fiscalCode', e.target.value)}
                      className={inputClass()}
                      placeholder="es. BNCMRC80A01H501U"
                    />
                  </div>
                  <div>
                    <label htmlFor="athlete-address" className={labelClass}>Indirizzo</label>
                    <input
                      id="athlete-address"
                      value={form.address ?? ''}
                      onChange={e => set('address', e.target.value)}
                      className={inputClass()}
                      placeholder="es. Via Roma 10"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Fonte Acquisizione</label>
                    <select
                      value={form.acquisitionSource}
                      onChange={e => set('acquisitionSource', e.target.value as AcquisitionSource)}
                      className={selectClass()}
                    >
                      {(Object.keys(acquisitionSourceLabel) as AcquisitionSource[]).map(s => (
                        <option key={s} value={s}>{acquisitionSourceLabel[s]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="athlete-paymentStatus" className={labelClass}>Situazione Pagamenti</label>
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
                </div>
              </div>

              {/* Certificato Medico */}
              <div className="border-t border-slate-800 pt-4 space-y-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-slate-800 flex items-center justify-center text-[10px]">🏥</span>
                  Certificato Medico & Consensi
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className={labelClass}>Tipologia Certificato</label>
                    <select
                      value={form.medicalCertificateType ?? 'agonistico'}
                      onChange={e => set('medicalCertificateType', e.target.value as 'agonistico' | 'non_agonistico')}
                      className={selectClass()}
                    >
                      <option value="agonistico">Agonistico</option>
                      <option value="non_agonistico">Non Agonistico</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Scadenza Certificato</label>
                    <input
                      type="date"
                      value={form.medicalCertificateExpiryDate ?? ''}
                      onChange={e => set('medicalCertificateExpiryDate', e.target.value)}
                      className={inputClass()}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Note Certificato</label>
                    <input
                      value={form.medicalNotes ?? ''}
                      onChange={e => set('medicalNotes', e.target.value)}
                      className={inputClass()}
                      placeholder="es. Visita agonistica idonea"
                    />
                  </div>
                </div>

                {/* Upload File Certificato */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2">
                  <label className="block text-xs font-semibold text-slate-400">
                    Documento Certificato Medico (PDF o Immagine)
                  </label>

                  {isCompressing ? (
                    <div className="flex items-center gap-2 p-3 bg-slate-950 rounded-xl border border-amber-500/30 text-amber-400 text-xs font-bold">
                      <div className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                      <span>Comprimendo e ottimizzando file lato client...</span>
                    </div>
                  ) : form.medicalCertificateUrl ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-emerald-500/30">
                        <div className="flex items-center gap-2.5 text-xs font-bold text-emerald-400">
                          <Check className="w-4 h-4" />
                          <span>Certificato Medico Allegato</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              if (!form.medicalCertificateUrl) return;
                              const url = await getSignedMedicalCertificateUrl(form.medicalCertificateUrl);
                              if (url) {
                                window.open(url, '_blank', 'noopener,noreferrer');
                              } else {
                                alert('Impossibile aprire il certificato. Riprova più tardi.');
                              }
                            }}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-white rounded-lg font-bold transition-colors cursor-pointer"
                          >
                            Visualizza
                          </button>
                          <button
                            type="button"
                            onClick={() => { set('medicalCertificateUrl', ''); setCompressionStats(null); }}
                            className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs rounded-lg font-bold transition-colors cursor-pointer"
                            title="Rimuovi allegato"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {compressionStats && compressionStats.reduction > 0 && (
                        <div className="text-[11px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg flex items-center justify-between">
                          <span>⚡ Compressione: {compressionStats.originalKB} KB → {compressionStats.compressedKB} KB</span>
                          <span className="bg-emerald-500 text-black text-[10px] px-1.5 py-0.5 rounded font-black">-{compressionStats.reduction}%</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-1">
                      <input
                        type="file"
                        id="cert-file-upload"
                        accept="image/*,application/pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <label
                        htmlFor="cert-file-upload"
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors"
                      >
                        <Upload className="w-4 h-4 text-[var(--color-primary)]" />
                        <span>Carica Certificato (PDF / Foto)</span>
                      </label>
                      <span className="text-[11px] text-slate-500">Compressione automatica &lt; 500 KB</span>
                    </div>
                  )}
                </div>

                {/* Consensi */}
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
              </div>
            </div>
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
