import React, { useState } from 'react';
import {
  User,
  Building2,
  Palette,
  Globe,
  Users,
  Lock,
  Download,
  History,
  Save,
  Check,
  Upload,
  Package,
  X,
  FileCheck2,
  FileX,
  ExternalLink,
  ChevronRight,
  Smartphone,
} from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useAthletes } from '../../context/AthletesContext';
import { useRenewals } from '../../context/RenewalsContext';
import { usePackages } from '../../context/PackagesContext';
import { 
  exportAppLocalStorage, 
  validateImportPayload, 
  importAppLocalStorageTransactional, 
  ImportValidationResult 
} from '../../config/storageKeys';
import { getLocalOwnerProfile, saveOwnerProfile } from '../../lib/ownerProfile';
import { OwnerProfileTab } from './components/OwnerProfileTab';
import { BackupSettingsTab } from './components/BackupSettingsTab';
import { ThemeCustomizer } from '../../components/settings/ThemeCustomizer';
import { SecuritySettingsPage } from './SecuritySettingsPage';
import { PwaDiagnosticsTab } from './components/PwaDiagnosticsTab';

export type SettingsTab =
  | 'owner'
  | 'organization'
  | 'appearance'
  | 'localization'
  | 'packages'
  | 'users_roles'
  | 'security'
  | 'backup'
  | 'audit'
  | 'pwa_diagnostics';

interface SectionMeta {
  id: SettingsTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const SETTINGS_SECTIONS: SectionMeta[] = [
  { id: 'owner', label: 'Profilo Proprietario', icon: User, description: 'Anagrafica, contatti e credenziali del titolare' },
  { id: 'organization', label: 'Organizzazione & Logo', icon: Building2, description: 'Dati della palestra, sede, recapiti e brand visuale' },
  { id: 'appearance', label: 'Colori & Tema Live', icon: Palette, description: 'Palette aziendale, preset colore e modalità scura' },
  { id: 'localization', label: 'Valuta & Data', icon: Globe, description: 'Valuta predefinita, fuso orario e formato date' },
  { id: 'packages', label: 'Pacchetti', icon: Package, description: 'Listino abbonamenti, ingressi e servizi' },
  { id: 'users_roles', label: 'Utenti, Ruoli & Permessi', icon: Users, description: 'Organigramma staff, permessi e privilegi' },
  { id: 'security', label: 'Sicurezza Account', icon: Lock, description: 'Autenticazione a due fattori (MFA) e sessioni' },
  { id: 'backup', label: 'Backup & Esportazione', icon: Download, description: 'Salvataggio, esportazione e ripristino dati' },
  { id: 'audit', label: 'Audit Log Generale', icon: History, description: 'Registro cronologico di tutte le azioni di sistema' },
  { id: 'pwa_diagnostics', label: 'PWA, Versioning & Cache', icon: Smartphone, description: 'Stato build, aggiornamenti PWA e diagnostica cache' },
];

export const SettingsPage: React.FC = () => {
  const {
    settings,
    updateOrgSettings,
    updateAppearanceSettings,
    logGeneralAudit,
    auditLogs,
  } = useSettings();

  const { packages } = usePackages();
  const { showSuccess, showError } = useToast();
  const { ownerProfile, setOwnerProfile } = useApp();
  const { refreshAuthProfile, members } = useAuth();
  const { syncOwnerNameInAthletes } = useAthletes();
  const { syncOwnerNameInRenewalsAndPauses } = useRenewals();

  const [activeSubTab, setActiveSubTab] = useState<SettingsTab>('owner');

  // Form Profilo Proprietario
  const currentOwner = ownerProfile || getLocalOwnerProfile();
  const [ownerForm, setOwnerForm] = useState({
    firstName: currentOwner?.firstName || '',
    lastName: currentOwner?.lastName || '',
    email: currentOwner?.email || 'owner.demo@example.com',
    organizationName: currentOwner?.organizationName || 'Builder Athlete Manager',
  });

  // Anteprima ed Importazione JSON
  const [importValidation, setImportValidation] = useState<ImportValidationResult | null>(null);

  // Form locali
  const [orgForm, setOrgForm] = useState(settings.organization);
  const [appearanceForm, setAppearanceForm] = useState(settings.appearance);

  // 1. SALVATAGGIO PROFILO PROPRIETARIO
  const handleSaveOwnerProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerForm.firstName.trim() || !ownerForm.lastName.trim()) {
      showError('Campi Obbligatori', 'Nome e Cognome sono obbligatori.');
      return;
    }

    const oldOwnerName = currentOwner?.fullName || 'Proprietario Demo';

    const updatedProfile = saveOwnerProfile({
      firstName: ownerForm.firstName.trim(),
      lastName: ownerForm.lastName.trim(),
      email: ownerForm.email.trim(),
      organizationName: ownerForm.organizationName.trim(),
    });

    setOwnerProfile(updatedProfile);
    refreshAuthProfile();
    syncOwnerNameInAthletes(oldOwnerName, updatedProfile.fullName);
    syncOwnerNameInRenewalsAndPauses(oldOwnerName, updatedProfile.fullName);

    updateOrgSettings({
      name: updatedProfile.organizationName,
      email: updatedProfile.email,
    });

    logGeneralAudit(
      'Modifica Profilo Proprietario',
      'Profilo',
      `Profilo proprietario aggiornato: ${updatedProfile.fullName} (${updatedProfile.organizationName})`
    );

    showSuccess(
      'Profilo Aggiornato',
      'I dati del proprietario sono stati aggiornati in tempo reale in tutti i moduli dell\'applicazione.'
    );
  };



  // 3. ESPORTAZIONE BACKUP JSON
  const handleExportBackup = () => {
    const data = exportAppLocalStorage();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `builder_athlete_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    logGeneralAudit('Esportazione Backup', 'Backup', 'Esportato il file di backup JSON del sistema');
    showSuccess('Backup Scaricato', 'Il file di backup completo è stato salvato sul computer.');
  };

  // 4. CARICAMENTO E VALIDAZIONE FILE JSON IMPORTAZIONE
  const handleSelectImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.json')) {
      showError('File Non Valido', 'Accetta soltanto file con estensione .json');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const validation = validateImportPayload(content);

      if (!validation.isValid) {
        showError('Importazione Rifiutata', validation.error || 'File non valido.');
        setImportValidation(null);
        e.target.value = '';
        return;
      }

      setImportValidation(validation);
    };

    reader.readAsText(file);
    e.target.value = '';
  };

  // 5. ESECUZIONE IMPORTAZIONE TRANSAZIONALE
  const handleExecuteImport = () => {
    if (!importValidation || !importValidation.parsedData) return;

    const result = importAppLocalStorageTransactional(importValidation.parsedData);

    if (!result.success) {
      showError('Errore Importazione', result.error || 'Errore durante l\'importazione. Ripristinato il backup precedente.');
      return;
    }

    logGeneralAudit(
      'Importazione Backup',
      'Backup',
      `Importate con successo ${result.recognizedCount} chiavi riconosciute. IGNORATE ${result.foreignCount} chiavi estranee.`
    );

    showSuccess(
      'Importazione Completata',
      `Ripristinate ${result.recognizedCount} categorie dell'applicazione. Ricarica in corso per applicare i dati.`
    );

    setImportValidation(null);
    setTimeout(() => {
      window.location.reload();
    }, 1200);
  };

  // 6. Salvataggio Organizzazione
  const handleSaveOrg = (e: React.FormEvent) => {
    e.preventDefault();
    updateOrgSettings(orgForm);
    showSuccess('Salvato', 'Dati organizzazione aggiornati con successo.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Building2 className="w-7 h-7 text-[var(--color-primary)]" /> Impostazioni di Sistema
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Configura il profilo del proprietario, l'organizzazione, i colori visivi, i ruoli utente ed i promemoria.
          </p>
        </div>
      </div>

      {/* Main Responsive Grid: Colonna Sinistra (Menu Verticale) + Colonna Destra (Contenuto) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ========================================================================= */}
        {/* COLONNA SINISTRA: MENU VERTICALE DELLE SEZIONI                            */}
        {/* ========================================================================= */}
        <aside className="lg:col-span-4 xl:col-span-3 space-y-3">
          
          {/* Selettore Compatto per Mobile */}
          <div className="lg:hidden p-4 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-lg space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Seleziona Sezione
            </label>
            <div className="relative">
              <select
                value={activeSubTab}
                onChange={(e) => setActiveSubTab(e.target.value as SettingsTab)}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-bold focus:outline-none focus:border-[var(--color-primary)] shadow-inner appearance-none cursor-pointer"
              >
                {SETTINGS_SECTIONS.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.label}
                  </option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronRight className="w-4 h-4 rotate-90" />
              </div>
            </div>
          </div>

          {/* Sidebar Verticale Completa per Desktop */}
          <div className="hidden lg:flex flex-col p-2.5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-1 sticky top-6">
            <div className="px-3.5 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-800/80 mb-1 flex items-center justify-between">
              <span>Sezioni Impostazioni</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                {SETTINGS_SECTIONS.length}
              </span>
            </div>

            <nav className="space-y-1">
              {SETTINGS_SECTIONS.map((sec) => {
                const Icon = sec.icon;
                const isActive = activeSubTab === sec.id;
                return (
                  <button
                    key={sec.id}
                    onClick={() => setActiveSubTab(sec.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all text-left group ${
                      isActive
                        ? 'bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/40 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isActive
                            ? 'bg-[var(--color-primary)] text-black font-black shadow'
                            : 'bg-slate-800/80 text-slate-400 group-hover:text-white group-hover:bg-slate-800'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className={`block truncate ${isActive ? 'text-white font-extrabold' : 'text-slate-300'}`}>
                          {sec.label}
                        </span>
                      </div>
                    </div>

                    {isActive ? (
                      <div className="w-1.5 h-4 rounded-full bg-[var(--color-primary)] shrink-0 ml-2" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-transform group-hover:translate-x-0.5 shrink-0 ml-2 opacity-0 group-hover:opacity-100" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* ========================================================================= */}
        {/* COLONNA DESTRA: CONTENUTO DELLA SEZIONE ATTIVA                            */}
        {/* ========================================================================= */}
        <main className="lg:col-span-8 xl:col-span-9 min-w-0 space-y-6">
          
          {/* SEZIONE 1: PROFILO PROPRIETARIO */}
          {activeSubTab === 'owner' && (
            <OwnerProfileTab
              ownerForm={ownerForm}
              onOwnerFormChange={setOwnerForm}
              onSaveOwnerProfile={handleSaveOwnerProfile}
            />
          )}

          {/* SEZIONE 2: ORGANIZZAZIONE E LOGO */}
          {activeSubTab === 'organization' && (
            <form onSubmit={handleSaveOrg} className="p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[var(--color-primary)]" /> Dati dell'Organizzazione / Palestra
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Nome Attività / Palestra *</label>
                  <input
                    type="text"
                    required
                    value={orgForm.name}
                    onChange={e => setOrgForm({ ...orgForm, name: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Codice Fiscale / Partita IVA</label>
                  <input
                    type="text"
                    value={orgForm.vatNumber}
                    onChange={e => setOrgForm({ ...orgForm, vatNumber: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Indirizzo Sede</label>
                  <input
                    type="text"
                    value={orgForm.address}
                    onChange={e => setOrgForm({ ...orgForm, address: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Telefono Contatto</label>
                  <input
                    type="text"
                    value={orgForm.phone}
                    onChange={e => setOrgForm({ ...orgForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Email Amministrativa</label>
                  <input
                    type="email"
                    value={orgForm.email}
                    onChange={e => setOrgForm({ ...orgForm, email: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Sito Web</label>
                  <input
                    type="text"
                    value={orgForm.website}
                    onChange={e => setOrgForm({ ...orgForm, website: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-sky-400" /> Logo della Palestra / Organizzazione
                </h4>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-bold text-[var(--color-primary)] overflow-hidden">
                    {orgForm.logoUrl ? <img src={orgForm.logoUrl} alt="Logo" className="w-full h-full object-cover" /> : 'LOGO'}
                  </div>
                  <div className="space-y-1 flex-1">
                    <input
                      type="text"
                      placeholder="URL del logo aziendale..."
                      value={orgForm.logoUrl || ''}
                      onChange={e => setOrgForm({ ...orgForm, logoUrl: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all shadow"
                >
                  <Save className="w-4 h-4" /> Salva Dati Organizzazione
                </button>
              </div>
            </form>
          )}

          {/* SEZIONE 3: COLORI E TEMA LIVE */}
          {activeSubTab === 'appearance' && (
            <ThemeCustomizer />
          )}

          {/* SEZIONE 4: VALUTA E DATA */}
          {activeSubTab === 'localization' && (
            <div className="p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Globe className="w-5 h-5 text-[var(--color-primary)]" /> Valuta, Fuso Orario e Formato Data
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Valuta Principale</label>
                  <select
                    value={appearanceForm.currency}
                    onChange={e => {
                      const updated = { ...appearanceForm, currency: e.target.value };
                      setAppearanceForm(updated);
                      updateAppearanceSettings(updated);
                      showSuccess('Valuta Salvata', `Valuta impostata a ${e.target.value}`);
                    }}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)]"
                  >
                    <option value="EUR">EUR (€) - Euro</option>
                    <option value="USD">USD ($) - Dollaro USA</option>
                    <option value="GBP">GBP (£) - Sterlina Inglese</option>
                    <option value="CHF">CHF (Fr) - Franco Svizzero</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Fuso Orario</label>
                  <select
                    value={appearanceForm.timeZone}
                    onChange={e => {
                      const updated = { ...appearanceForm, timeZone: e.target.value };
                      setAppearanceForm(updated);
                      updateAppearanceSettings(updated);
                      showSuccess('Fuso Orario Salvato', `Fuso orario impostato a ${e.target.value}`);
                    }}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)]"
                  >
                    <option value="Europe/Rome">Europe/Rome (GMT+1 / CET)</option>
                    <option value="Europe/London">Europe/London (GMT+0)</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Formato Data Predefinito</label>
                  <select
                    value={appearanceForm.dateFormat}
                    onChange={e => {
                      const updated = { ...appearanceForm, dateFormat: e.target.value };
                      setAppearanceForm(updated);
                      updateAppearanceSettings(updated);
                      showSuccess('Formato Data Salvato', `Formato data impostato a ${e.target.value}`);
                    }}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)]"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY (es. 31/12/2026)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (es. 2026-12-31)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* SEZIONE 5: PACCHETTI */}
          {activeSubTab === 'packages' && (
            <div className="p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Package className="w-5 h-5 text-[var(--color-primary)]" /> Listino Pacchetti & Abbonamenti
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Panoramica dei pacchetti attivi configurati nel sistema.</p>
                </div>
                <a
                  href="/pacchetti"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Gestione Completa
                </a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {packages.map((pkg) => (
                  <div key={pkg.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{pkg.name}</span>
                        {pkg.isActive ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">Attivo</span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">Disattivato</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Durata: {pkg.duration} {pkg.durationUnit} • {pkg.installments > 1 ? `${pkg.installments} Rate` : 'Pagamento Unico'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-black text-[var(--color-primary)]">€ {pkg.price}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SEZIONE 6: UTENTI, RUOLI E PERMESSI */}
          {activeSubTab === 'users_roles' && (
            <div className="p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-[var(--color-primary)]" /> Utenti, Ruoli & Permessi dello Staff
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Gestione collaboratori, privilegi e accessi della piattaforma.</p>
                </div>
                <a
                  href="/collaboratori"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all shadow"
                >
                  <Users className="w-4 h-4" /> Gestione Team Completa
                </a>
              </div>

              <div className="space-y-3">
                {members.map(member => (
                  <div key={member.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{member.fullName}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-[var(--color-primary)] font-black uppercase">
                          {member.role}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{member.email}</p>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">
                      {member.canViewFinancials ? 'Visibilità Finanziaria: Attiva' : 'Visibilità Finanziaria: Nascosta'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SEZIONE 7: SICUREZZA ACCOUNT */}
          {activeSubTab === 'security' && (
            <SecuritySettingsPage />
          )}

          {/* SEZIONE 11: BACKUP ED ESPORTAZIONE AVANZATA */}
          {activeSubTab === 'backup' && (
            <BackupSettingsTab
              onExportBackup={handleExportBackup}
              onSelectImportFile={handleSelectImportFile}
            />
          )}

          {/* SEZIONE 12: AUDIT LOG GENERALE */}
          {activeSubTab === 'audit' && (
            <div className="p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <History className="w-5 h-5 text-[var(--color-primary)]" /> Registro Audit di Sistema
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Storico tracciato di tutte le operazioni di configurazione e amministrazione.</p>
                </div>
                <span className="text-xs font-mono text-slate-400">{auditLogs.length} eventi registrati</span>
              </div>

              <div className="max-h-[500px] overflow-y-auto space-y-2 pr-1">
                {auditLogs.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">Nessun evento di audit registrato finora.</p>
                ) : (
                  auditLogs.map((log) => (
                    <div key={log.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{log.action}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">{log.section}</span>
                        </div>
                        <p className="text-slate-400">{log.description}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-slate-400 block">{new Date(log.timestamp).toLocaleString('it-IT')}</span>
                        <span className="text-[10px] text-slate-400 font-medium">Utente: {log.user}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* SEZIONE 13: PWA, VERSIONING & DIAGNOSTICA CACHE */}
          {activeSubTab === 'pwa_diagnostics' && (
            <PwaDiagnosticsTab />
          )}

        </main>
      </div>

      {/* MODALE ANTEPRIMA IMPORTAZIONE TRANSAZIONALE */}
      {importValidation && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border border-sky-500/40 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-sky-400 flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-sky-400" /> Anteprima Importazione Backup JSON
              </h3>
              <button onClick={() => setImportValidation(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Analisi del file completata. Di seguito l'anteprima delle categorie riconosciute e delle chiavi ignorate.
            </p>

            {/* Categorie Riconosciute */}
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-2">
              <div className="flex items-center justify-between font-bold text-emerald-400">
                <span className="flex items-center gap-1.5">
                  <Check className="w-4 h-4" /> Chiavi Applicazione Riconosciute ({importValidation.recognizedKeys.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto">
                {importValidation.recognizedKeys.map((k: string) => (
                  <span key={k} className="px-2 py-0.5 rounded bg-emerald-900/40 text-emerald-300 text-[10px] font-mono border border-emerald-700/50">
                    {k}
                  </span>
                ))}
              </div>
            </div>

            {/* Chiavi Estranee Ignorate */}
            {importValidation.foreignKeys.length > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-2">
                <div className="flex items-center justify-between font-bold text-amber-400">
                  <span className="flex items-center gap-1.5">
                    <FileX className="w-4 h-4" /> Chiavi Estranee Ignorate ({importValidation.foreignKeys.length})
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                  {importValidation.foreignKeys.map((k: string) => (
                    <span key={k} className="px-2 py-0.5 rounded bg-amber-900/40 text-amber-300 text-[10px] font-mono border border-amber-700/50">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <p className="font-bold text-white">Garanzia di Ripristino Transazionale:</p>
              <p>In caso di errore o spazio di archiviazione esaurito (QuotaExceededError), il sistema eseguirà un rollback automatico ripristinando lo stato attuale.</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setImportValidation(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
              >
                Annulla
              </button>
              <button
                onClick={handleExecuteImport}
                className="px-5 py-2.5 rounded-xl bg-sky-500 text-black font-black text-xs hover:bg-sky-400 transition-all shadow"
              >
                Conferma Importazione Transazionale
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};
