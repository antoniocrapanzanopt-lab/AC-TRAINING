// Centralizzazione univoca delle chiavi localStorage per l'applicazione Builder Athlete Manager

export const STORAGE_KEYS = {
  OWNER_PROFILE: 'builder_athlete_owner_profile',
  INITIAL_SETUP_COMPLETED: 'builder_athlete_initial_setup_completed',
  OWNER_MIGRATION_COMPLETED: 'builder_athlete_owner_migration_completed',
  ATHLETES: 'builder_athlete_athletes',
  PACKAGES: 'builder_athlete_packages',
  SUBSCRIPTIONS: 'builder_athlete_subscriptions',
  PAYMENTS: 'builder_athlete_payments',
  FINANCIAL_AUDIT: 'builder_athlete_financial_audit',
  RENEWALS: 'builder_athlete_renewals',
  PAUSES: 'builder_athlete_pauses',
  ACTIVITIES: 'builder_athlete_activities',
  CALENDAR: 'builder_athlete_calendar',
  DOCUMENTS: 'builder_athlete_documents',
  CONSENTS: 'builder_athlete_consents',
  COMMUNICATIONS: 'builder_athlete_communications',
  MESSAGE_TEMPLATES: 'builder_athlete_message_templates',
  DEMO_API_CONFIG: 'builder_athlete_demo_api_config',
  SETTINGS: 'builder_athlete_settings',
  GENERAL_AUDIT: 'builder_athlete_general_audit',
  SAVED_REPORTS: 'builder_athlete_saved_reports',
  ACTIVE_TAB: 'builder_athlete_active_tab',
  USER_SESSION: 'builder_athlete_user_session',
  ATHLETE_NOTES: 'builder_athlete_athlete_notes',
  ATHLETE_TIMELINE: 'builder_athlete_athlete_timeline',
  THEME_PREFERENCES: 'builder_athlete_theme_preferences',
  PROGRESSION_RULES: 'builder_athlete_progression_rules',
  PROGRESSION_SUGGESTIONS: 'builder_athlete_progression_suggestions',
  PROGRESSION_EVENTS: 'builder_athlete_progression_events',
  PROGRESSION_TEMPLATES: 'builder_athlete_progression_templates',
} as const;

export type AppStorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/**
 * Verifica se una stringa è una chiave appartenente al prefisso/registro dell'app
 */
export const isAppStorageKey = (key: string): boolean => {
  return Object.values(STORAGE_KEYS).includes(key as AppStorageKey);
};

/**
 * Restituisce tutte le chiavi di localStorage definite per l'app
 */
export const getAllAppStorageKeys = (): string[] => {
  return Object.values(STORAGE_KEYS);
};

/**
 * Esporta tutti i dati salvati dall'app sotto forma di oggetto JSON Record<string, unknown>
 */
export const exportAppLocalStorage = (): Record<string, unknown> => {
  const exportedData: Record<string, unknown> = {};
  const keys = getAllAppStorageKeys();

  for (const key of keys) {
    try {
      const rawValue = localStorage.getItem(key);
      if (rawValue !== null) {
        exportedData[key] = JSON.parse(rawValue) as unknown;
      }
    } catch {
      exportedData[key] = localStorage.getItem(key);
    }
  }

  return exportedData;
};

export interface ImportValidationResult {
  isValid: boolean;
  error?: string;
  recognizedKeys: string[];
  foreignKeys: string[];
  parsedData?: Record<string, unknown>;
}

/**
 * Valida il payload JSON per l'importazione prima dell'esecuzione transazionale.
 */
export const validateImportPayload = (jsonText: string): ImportValidationResult => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return {
      isValid: false,
      error: 'Il file selezionato non è un JSON valido.',
      recognizedKeys: [],
      foreignKeys: [],
    };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      isValid: false,
      error: 'Il contenuto del file deve essere un oggetto JSON con chiavi e valori.',
      recognizedKeys: [],
      foreignKeys: [],
    };
  }

  const record = parsed as Record<string, unknown>;
  const keys = Object.keys(record);

  const recognizedKeys = keys.filter((k) => isAppStorageKey(k));
  const foreignKeys = keys.filter((k) => !isAppStorageKey(k));

  if (recognizedKeys.length === 0) {
    return {
      isValid: false,
      error: 'Nessuna chiave dell\'applicazione riconosciuta nel file JSON selezionato. File rifiutato.',
      recognizedKeys: [],
      foreignKeys,
    };
  }

  return {
    isValid: true,
    recognizedKeys,
    foreignKeys,
    parsedData: record,
  };
};

export interface ImportResult {
  success: boolean;
  recognizedCount: number;
  foreignCount: number;
  restoredFromBackup?: boolean;
  error?: string;
}

/**
 * Importa in modo transazionale le chiavi dell'applicazione da un payload validato.
 * In caso di errore o QuotaExceededError, ripristina automaticamente i dati precedenti.
 */
export const importAppLocalStorageTransactional = (data: Record<string, unknown>): ImportResult => {
  const allAppKeys = getAllAppStorageKeys();

  // 1. Backup temporaneo dei dati attuali in memoria
  const tempBackup: Record<string, string | null> = {};
  for (const key of allAppKeys) {
    tempBackup[key] = localStorage.getItem(key);
  }

  const recognizedKeys = Object.keys(data).filter((k) => isAppStorageKey(k));
  const foreignKeys = Object.keys(data).filter((k) => !isAppStorageKey(k));

  try {
    // 2. Scrittura transazionale delle chiavi riconosciute
    for (const key of recognizedKeys) {
      const val = data[key];
      const stringVal = typeof val === 'string' ? val : JSON.stringify(val);
      localStorage.setItem(key, stringVal);
    }

    return {
      success: true,
      recognizedCount: recognizedKeys.length,
      foreignCount: foreignKeys.length,
    };
  } catch (err: unknown) {
    // 3. Rollback automatico in caso di errore (es. QuotaExceededError)
    console.error('Errore durante la scrittura transazionale:', err);

    for (const key of allAppKeys) {
      const oldVal = tempBackup[key];
      if (oldVal !== null) {
        localStorage.setItem(key, oldVal);
      } else {
        localStorage.removeItem(key);
      }
    }

    const isQuotaError =
      err instanceof DOMException &&
      (err.code === 22 ||
        err.code === 1014 ||
        err.name === 'QuotaExceededError' ||
        err.name === 'NS_ERROR_DOM_QUOTA_REACHED');

    const errorMessage = isQuotaError
      ? 'Spazio di archiviazione browser esaurito (QuotaExceededError). Ripristinato il backup temporaneo precedente.'
      : `Errore di importazione: ${err instanceof Error ? err.message : 'Errore sconosciuto'}. Ripristinato il backup precedente.`;

    return {
      success: false,
      recognizedCount: 0,
      foreignCount: foreignKeys.length,
      restoredFromBackup: true,
      error: errorMessage,
    };
  }
};

/**
 * Ripristina/pulisce i dati dei moduli conservando il profilo proprietario e la configurazione iniziale.
 * VIETATO usare localStorage.clear() per preservare eventuali altre chiavi del browser.
 */
export const clearAppDemoData = (): void => {
  const preservedKeys = [
    STORAGE_KEYS.OWNER_PROFILE,
    STORAGE_KEYS.INITIAL_SETUP_COMPLETED,
    STORAGE_KEYS.OWNER_MIGRATION_COMPLETED,
  ];

  const keysToRemove = getAllAppStorageKeys().filter(
    (key) => !preservedKeys.includes(key as (typeof preservedKeys)[number])
  );

  for (const key of keysToRemove) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Errore durante la rimozione della chiave "${key}":`, error);
    }
  }
};

/**
 * Rimuove completamente tutte le chiavi relative a Builder Athlete Manager.
 * VIETATO usare localStorage.clear(), si eliminano puntualmente solo le chiavi registrate.
 */
export const clearAppLocalStorage = (): void => {
  const allKeys = getAllAppStorageKeys();

  for (const key of allKeys) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Errore durante l'eliminazione totale della chiave "${key}":`, error);
    }
  }
};
