import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  SystemSettings,
  OrganizationSettings,
  SystemAppearanceSettings,
  ReminderRuleSettings,
  GeneralAuditLogEntry,
} from '../types';
import { STORAGE_KEYS } from '../config/storageKeys';
import { getStorageItem, setStorageItem } from '../lib/storage';
import { getLocalOwnerProfile } from '../lib/ownerProfile';
import { THEME_PRESETS, applyThemeToCssVariables, generateHarmonicPalette } from '../utils/themeEngine';

interface SettingsContextType {
  settings: SystemSettings;
  auditLogs: GeneralAuditLogEntry[];
  isLoading: boolean;
  updateOrgSettings: (data: Partial<OrganizationSettings>) => void;
  updateAppearanceSettings: (data: Partial<SystemAppearanceSettings>) => void;
  updateReminderRules: (data: Partial<ReminderRuleSettings>) => void;
  updatePaymentMethods: (methods: string[]) => void;
  updateActivityCategories: (categories: string[]) => void;
  updateAthleteTags: (tags: string[]) => void;
  logGeneralAudit: (action: string, section: string, description: string) => void;
  addAuditLog: (action: string, section: string, description: string) => void;
  resetSettingsToDefault: () => void;
}

const getDefaultSettings = (): SystemSettings => {
  const owner = getLocalOwnerProfile();
  const ownerName = owner?.fullName;
  const defaultPreset = THEME_PRESETS[0];

  return {
    organization: {
      name: ownerName ? `Palestra ${ownerName} (Demo)` : 'Builder Athlete Manager Demo',
      vatNumber: 'IT01234567890 (Dato Dimostrativo)',
      address: 'Via Roma 100, Milano (MI)',
      phone: '+39 02 1234567',
      email: 'info@builderathlete.demo',
      website: 'https://builderathlete.demo',
    },
    appearance: {
      primaryColor: defaultPreset.colors.primary,
      bgColor: defaultPreset.colors.bg,
      cardBgColor: defaultPreset.colors.surface,
      textColorMain: defaultPreset.colors.textMain,
      textColorSub: defaultPreset.colors.textMuted,
      presetId: defaultPreset.id,
      customAccentColor: defaultPreset.colors.primary,
      customBgMode: 'dark-black',
      colors: defaultPreset.colors,
      currency: 'EUR',
      timeZone: 'Europe/Rome',
      dateFormat: 'DD/MM/YYYY',
    },
    reminderRules: {
      certificateDaysBefore: 15,
      subscriptionDaysBefore: 7,
      installmentDaysBefore: 3,
    },
    paymentMethods: ['Contanti', 'Bonifico Bancario', 'Carta di Credito', 'POS', 'SDD / Rid', 'Stripe Demo'],
    activityCategories: ['Allenamento', 'Valutazione', 'Chiamata', 'Amministrativo', 'Altro'],
    athleteTags: ['Agonista', 'Reperibile', 'Infortunato', 'VIP', 'Under 18'],
  };
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SystemSettings>(getDefaultSettings);
  const [auditLogs, setAuditLogs] = useState<GeneralAuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Caricamento iniziale
  useEffect(() => {
    const savedSettings = getStorageItem<SystemSettings | null>(STORAGE_KEYS.SETTINGS, null);
    if (savedSettings) {
      setSettings(savedSettings);
    } else {
      const def = getDefaultSettings();
      setSettings(def);
      setStorageItem(STORAGE_KEYS.SETTINGS, def);
    }

    const savedLogs = getStorageItem<GeneralAuditLogEntry[]>(STORAGE_KEYS.GENERAL_AUDIT, []);
    setAuditLogs(savedLogs);
    setIsLoading(false);
  }, []);

  // 2. Applicazione live delle variabili CSS dei colori
  useEffect(() => {
    const app = settings.appearance;
    if (app) {
      if (app.colors) {
        applyThemeToCssVariables(app.colors);
      } else if (app.presetId) {
        const found = THEME_PRESETS.find(p => p.id === app.presetId);
        if (found) {
          applyThemeToCssVariables(found.colors);
        } else {
          applyThemeToCssVariables(generateHarmonicPalette(app.primaryColor || '#EAB308', 'dark-black'));
        }
      } else {
        const generated = generateHarmonicPalette(app.primaryColor || '#EAB308', app.customBgMode || 'dark-black');
        applyThemeToCssVariables(generated);
      }
    }
  }, [settings.appearance]);

  const persistSettings = useCallback((newSettings: SystemSettings) => {
    setSettings(newSettings);
    setStorageItem(STORAGE_KEYS.SETTINGS, newSettings);
  }, []);

  const logGeneralAudit = useCallback((action: string, section: string, description: string) => {
    const owner = getLocalOwnerProfile();
    const newEntry: GeneralAuditLogEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      user: owner?.fullName || 'Amministratore',
      section,
      action,
      description,
    };

    setAuditLogs(prev => {
      const updated = [newEntry, ...prev];
      setStorageItem(STORAGE_KEYS.GENERAL_AUDIT, updated);
      return updated;
    });
  }, []);

  const updateOrgSettings = useCallback((data: Partial<OrganizationSettings>) => {
    setSettings(prev => {
      const updated: SystemSettings = {
        ...prev,
        organization: { ...prev.organization, ...data },
      };
      persistSettings(updated);
      return updated;
    });
    logGeneralAudit('Modifica Impostazioni', 'Organizzazione', 'Aggiornati i dati dell\'organizzazione');
  }, [persistSettings, logGeneralAudit]);

  const updateAppearanceSettings = useCallback((data: Partial<SystemAppearanceSettings>) => {
    setSettings(prev => {
      const updated: SystemSettings = {
        ...prev,
        appearance: { ...prev.appearance, ...data },
      };
      persistSettings(updated);
      return updated;
    });
    logGeneralAudit('Modifica Impostazioni', 'Aspetto Visivo', 'Aggiornati colore primario, valuta o fuso orario');
  }, [persistSettings, logGeneralAudit]);

  const updateReminderRules = useCallback((data: Partial<ReminderRuleSettings>) => {
    setSettings(prev => {
      const updated: SystemSettings = {
        ...prev,
        reminderRules: { ...prev.reminderRules, ...data },
      };
      persistSettings(updated);
      return updated;
    });
    logGeneralAudit('Modifica Impostazioni', 'Promemoria', 'Aggiornate le regole temporali dei promemoria');
  }, [persistSettings, logGeneralAudit]);

  const updatePaymentMethods = useCallback((methods: string[]) => {
    setSettings(prev => {
      const updated: SystemSettings = { ...prev, paymentMethods: methods };
      persistSettings(updated);
      return updated;
    });
    logGeneralAudit('Modifica Impostazioni', 'Metodi Pagamento', 'Aggiornato l\'elenco dei metodi di pagamento');
  }, [persistSettings, logGeneralAudit]);

  const updateActivityCategories = useCallback((categories: string[]) => {
    setSettings(prev => {
      const updated: SystemSettings = { ...prev, activityCategories: categories };
      persistSettings(updated);
      return updated;
    });
    logGeneralAudit('Modifica Impostazioni', 'Categorie Attività', 'Aggiornato l\'elenco delle categorie attività');
  }, [persistSettings, logGeneralAudit]);

  const updateAthleteTags = useCallback((tags: string[]) => {
    setSettings(prev => {
      const updated: SystemSettings = { ...prev, athleteTags: tags };
      persistSettings(updated);
      return updated;
    });
    logGeneralAudit('Modifica Impostazioni', 'Etichette Atleti', 'Aggiornato l\'elenco delle etichette atleti');
  }, [persistSettings, logGeneralAudit]);

  const resetSettingsToDefault = useCallback(() => {
    const def = getDefaultSettings();
    persistSettings(def);
    logGeneralAudit('Reset Impostazioni', 'Sistema', 'Ripristinate le impostazioni predefinite del sistema');
  }, [persistSettings, logGeneralAudit]);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        auditLogs,
        isLoading,
        updateOrgSettings,
        updateAppearanceSettings,
        updateReminderRules,
        updatePaymentMethods,
        updateActivityCategories,
        updateAthleteTags,
        logGeneralAudit,
        addAuditLog: logGeneralAudit,
        resetSettingsToDefault,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings deve essere utilizzato all\'interno di un SettingsProvider');
  }
  return context;
};
