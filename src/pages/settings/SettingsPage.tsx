import React, { useState } from 'react';
import {
  User,
  Building2,
  Palette,
  Globe,
  CreditCard,
  Tag,
  Users,
  Bell,
  Lock,
  Download,
  Share2,
  History,
  Info,
  Save,
  RotateCcw,
  Check,
  Upload,
  Package,
  AlertTriangle,
  X,
  FileCheck2,
  FileX,
} from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useAthletes } from '../../context/AthletesContext';
import { useRenewals } from '../../context/RenewalsContext';
import {
  exportAppLocalStorage,
  clearAppDemoData,
  clearAppLocalStorage,
  validateImportPayload,
  importAppLocalStorageTransactional,
  ImportValidationResult,
} from '../../config/storageKeys';
import { getLocalOwnerProfile, saveOwnerProfile } from '../../lib/ownerProfile';
import { OwnerProfileTab } from './components/OwnerProfileTab';
import { BackupSettingsTab } from './components/BackupSettingsTab';
import { ThemeCustomizer } from '../../components/settings/ThemeCustomizer';

type SettingsTab =
  | 'owner'
  | 'organization'
  | 'appearance'
  | 'localization'
  | 'packages'
  | 'payments_activities'
  | 'tags'
  | 'users_roles'
  | 'reminders'
  | 'privacy'
  | 'backup'
  | 'integrations'
  | 'audit';

export const SettingsPage: React.FC = () => {
  const {
    settings,
    updateOrgSettings,
    updateAppearanceSettings,
    logGeneralAudit,
    resetSettingsToDefault,
  } = useSettings();

  const { showSuccess, showInfo, showError } = useToast();
  const { ownerProfile, setOwnerProfile } = useApp();
  const { refreshAuthProfile, logout } = useAuth();
  const { syncOwnerNameInAthletes } = useAthletes();
  const { syncOwnerNameInRenewalsAndPauses } = useRenewals();

  const [activeSubTab, setActiveSubTab] = useState<SettingsTab>('owner');

  // Form Profilo Proprietario
  const currentOwner = ownerProfile || getLocalOwnerProfile();
  const [ownerForm, setOwnerForm] = useState({
    firstName: currentOwner?.firstName || '',
    lastName: currentOwner?.lastName || '',
    email: currentOwner?.email || 'owner.demo@example.com',
    organizationName: currentOwner?.organizationName || 'Builder Athlete Manager Demo',
  });

  // Modal di rimozione proprietario (Step 1 e Step 2)
  const [removeOwnerStep, setRemoveOwnerStep] = useState<0 | 1 | 2>(0);

  // Modal di ripristino dati demo (Step 1 e Step 2)
  const [resetDemoStep, setResetDemoStep] = useState<0 | 1 | 2>(0);

  // Anteprima ed Importazione JSON
  const [importValidation, setImportValidation] = useState<ImportValidationResult | null>(null);

  // Form locali per modifiche generali
  const [orgForm, setOrgForm] = useState(settings.organization);
  const [appearanceForm, setAppearanceForm] = useState(settings.appearance);

  // 1. SALVATAGGIO PROFILO PROPRIETARIO (con sincro istantanea)
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

  // 2. RIMOZIONE COMPLETA CONFIGURAZIONE PROPRIETARIO (2 CONFERME)
  const handleExecuteFullOwnerRemoval = () => {
    clearAppLocalStorage();
    logout();
    setOwnerProfile(null);
    showInfo('Profilo Rimosso', 'La configurazione del proprietario è stata totalmente cancellata. Ripristino del setup iniziale.');
  };

  // 3. RIPRISTINO DATI DEMO CONSERVANDO IL PROPRIETARIO (2 CONFERME)
  const handleExecuteDemoDataReset = () => {
    clearAppDemoData();
    resetSettingsToDefault();
    logGeneralAudit('Ripristino Dati Demo', 'Ripristino', 'Ripristinati i dati dimostrativi dei moduli. Profilo proprietario conservato.');
    showSuccess('Ripristinato', 'Dati della demo ripristinati. Profilo proprietario conservato. Ricarica la pagina in corso.');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  // 4. ESPORTAZIONE BACKUP JSON
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

  // 5. CARICAMENTO E VALIDAZIONE FILE JSON IMPORTAZIONE
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

  // 6. ESECUZIONE IMPORTAZIONE TRANSAZIONALE CON ROLLBACK AUTOMATICO
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

  // Salvataggio Organizzazione
  const handleSaveOrg = (e: React.FormEvent) => {
    e.preventDefault();
    updateOrgSettings(orgForm);
    showSuccess('Salvato', 'Dati organizzazione aggiornati con successo.');
  };



  return (
    <div className="space-y-8">
      {/* Banner Disclaimer Legale Permanente */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-3 shadow-lg">
        <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold uppercase tracking-wider block text-[11px] text-amber-400">
            DISCLAIMER SISTEMA DIMOSTRATIVO
          </span>
          Le impostazioni, i parametri privacy/GDPR, le chiavi API ed i ruoli definiti in questo modulo hanno scopo puramente dimostrativo e didattico. Non costituiscono conformità legale, contabile o di sicurezza reale.
        </div>
      </div>

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

        <div className="flex items-center gap-2">
          <button
            onClick={() => setResetDemoStep(1)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white font-bold text-xs hover:border-slate-600 transition-all shadow"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" /> Ripristina Dati Demo (Conserva Proprietario)
          </button>
        </div>
      </div>

      {/* NAVIGAZIONE SUB-TABS SEZIONI */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-800 scrollbar-none">
        <button
          onClick={() => setActiveSubTab('owner')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeSubTab === 'owner'
              ? 'bg-[var(--color-primary)] text-black shadow'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <User className="w-4 h-4" /> Profilo Proprietario
        </button>

        <button
          onClick={() => setActiveSubTab('organization')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeSubTab === 'organization'
              ? 'bg-[var(--color-primary)] text-black shadow'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" /> Organizzazione & Logo
        </button>

        <button
          onClick={() => setActiveSubTab('appearance')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeSubTab === 'appearance'
              ? 'bg-[var(--color-primary)] text-black shadow'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Palette className="w-4 h-4" /> Colori & Tema Live
        </button>

        <button
          onClick={() => setActiveSubTab('localization')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeSubTab === 'localization'
              ? 'bg-[var(--color-primary)] text-black shadow'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Globe className="w-4 h-4" /> Valuta & Data
        </button>

        <button
          onClick={() => setActiveSubTab('packages')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeSubTab === 'packages'
              ? 'bg-[var(--color-primary)] text-black shadow'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Package className="w-4 h-4" /> Pacchetti
        </button>

        <button
          onClick={() => setActiveSubTab('payments_activities')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeSubTab === 'payments_activities'
              ? 'bg-[var(--color-primary)] text-black shadow'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" /> Pagamenti & Categorie
        </button>

        <button
          onClick={() => setActiveSubTab('tags')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeSubTab === 'tags'
              ? 'bg-[var(--color-primary)] text-black shadow'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Tag className="w-4 h-4" /> Etichette
        </button>

        <button
          onClick={() => setActiveSubTab('users_roles')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeSubTab === 'users_roles'
              ? 'bg-[var(--color-primary)] text-black shadow'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Users className="w-4 h-4" /> Utenti, Ruoli & Permessi
        </button>

        <button
          onClick={() => setActiveSubTab('reminders')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeSubTab === 'reminders'
              ? 'bg-[var(--color-primary)] text-black shadow'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Bell className="w-4 h-4" /> Promemoria
        </button>

        <button
          onClick={() => setActiveSubTab('privacy')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeSubTab === 'privacy'
              ? 'bg-[var(--color-primary)] text-black shadow'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Lock className="w-4 h-4" /> Privacy & GDPR Demo
        </button>

        <button
          onClick={() => setActiveSubTab('backup')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeSubTab === 'backup'
              ? 'bg-[var(--color-primary)] text-black shadow'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Download className="w-4 h-4" /> Backup & Esportazione
        </button>

        <button
          onClick={() => setActiveSubTab('integrations')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeSubTab === 'integrations'
              ? 'bg-[var(--color-primary)] text-black shadow'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Share2 className="w-4 h-4" /> Integrazioni
        </button>

        <button
          onClick={() => setActiveSubTab('audit')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeSubTab === 'audit'
              ? 'bg-[var(--color-primary)] text-black shadow'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <History className="w-4 h-4" /> Audit Log Generale
        </button>
      </div>

      {/* SEZIONE 0: PROFILO PROPRIETARIO */}
      {activeSubTab === 'owner' && (
        <OwnerProfileTab
          ownerForm={ownerForm}
          onOwnerFormChange={setOwnerForm}
          onSaveOwnerProfile={handleSaveOwnerProfile}
          onOpenRemoveModal={() => setRemoveOwnerStep(1)}
        />
      )}

      {/* 1. ORGANIZZAZIONE E LOGO */}
      {activeSubTab === 'organization' && (
        <form onSubmit={handleSaveOrg} className="p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[var(--color-primary)]" /> Dati dell'Organizzazione / Palestra
            </h3>
            <span className="text-[10px] font-bold text-slate-500 uppercase">Valori dimostrativi</span>
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
              <label className="text-xs font-bold text-slate-300 block mb-1">Codice Fiscale / Partita IVA (Dimostrativo)</label>
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
                  placeholder="URL del logo dimostrativo..."
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

      {/* 2. COLORI E TEMA LIVE */}
      {activeSubTab === 'appearance' && (
        <ThemeCustomizer />
      )}

      {/* 3. LOCALIZZAZIONE */}
      {activeSubTab === 'localization' && (
        <div className="p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-[var(--color-primary)]" /> Valuta, Fuso Orario e Formato Data
            </h3>
            <span className="text-[10px] font-bold text-slate-500 uppercase">Localizzazione</span>
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

      {/* 10. BACKUP ED ESPORTAZIONE AVANZATA */}
      {activeSubTab === 'backup' && (
        <BackupSettingsTab
          onExportBackup={handleExportBackup}
          onSelectImportFile={handleSelectImportFile}
        />
      )}

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
                {importValidation.recognizedKeys.map((k) => (
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
                  {importValidation.foreignKeys.map((k) => (
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

      {/* MODALE RIPRISTINO DATI DEMO STEP 1 & STEP 2 (CONSERVA PROPRIETARIO) */}
      {resetDemoStep === 1 && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-amber-400" /> Prima Conferma: Ripristina Dati Demo
              </h3>
              <button onClick={() => setResetDemoStep(0)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Sei sicuro di voler ripristinare tutti i dati dimostrativi dei moduli? Il profilo del proprietario VERRÀ CONSERVATO.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={() => setResetDemoStep(0)} className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs">
                Annulla
              </button>
              <button onClick={() => setResetDemoStep(2)} className="px-4 py-2 rounded-xl bg-amber-500 text-black font-black text-xs hover:bg-amber-400">
                Procedi alla Seconda Conferma →
              </button>
            </div>
          </div>
        </div>
      )}

      {resetDemoStep === 2 && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-amber-950 border border-amber-500 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-amber-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" /> Seconda e Ultima Conferma Definitiva
              </h3>
              <button onClick={() => setResetDemoStep(0)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-amber-500/40 text-xs text-amber-200 space-y-1">
              <p className="font-bold">RIPRISTINO DATI DEMO MODULI</p>
              <p>Confermi il ripristino di atleti, abbonamenti e pagamenti ai dati dimostrativi di default? Il tuo profilo proprietario rimarrà intatto.</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={() => setResetDemoStep(0)} className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs">
                Annulla
              </button>
              <button
                onClick={() => {
                  setResetDemoStep(0);
                  handleExecuteDemoDataReset();
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-500 text-black font-black text-xs shadow-lg uppercase tracking-wider"
              >
                Conferma Ripristino Demo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE CONFERMA STEP 1 PER RIMOZIONE PROPRIETARIO */}
      {removeOwnerStep === 1 && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border border-red-900/60 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" /> Prima Conferma Richiesta
              </h3>
              <button onClick={() => setRemoveOwnerStep(0)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Sei sicuro di voler rimuovere la configurazione del proprietario? Verranno eliminati il profilo e l'intera configurazione salvata nel browser.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={() => setRemoveOwnerStep(0)} className="px-4 py-2 rounded-xl bg-slate-800 text-white font-bold text-xs">
                Annulla
              </button>
              <button onClick={() => setRemoveOwnerStep(2)} className="px-4 py-2 rounded-xl bg-red-600 text-white font-black text-xs">
                Procedi alla Seconda Conferma →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE CONFERMA STEP 2 PER RIMOZIONE DEFINITIVA PROPRIETARIO */}
      {removeOwnerStep === 2 && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-red-950 border border-red-600 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-red-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-400" /> Seconda e Ultima Conferma Definitiva
              </h3>
              <button onClick={() => setRemoveOwnerStep(0)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-red-500/40 text-xs text-red-200 space-y-1">
              <p className="font-bold">CANCELLAZIONE DEFINITIVA SISTEMA</p>
              <p>Confermi la rimozione del profilo proprietario ed il reset completo della demo? L'applicazione verrà riportata alla schermata di Prima Configurazione.</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={() => setRemoveOwnerStep(0)} className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs">
                Annulla Operazione
              </button>
              <button
                onClick={() => {
                  setRemoveOwnerStep(0);
                  handleExecuteFullOwnerRemoval();
                }}
                className="px-5 py-2.5 rounded-xl bg-red-600 text-white font-black text-xs shadow-lg uppercase tracking-wider"
              >
                Conferma ed Elimina Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
