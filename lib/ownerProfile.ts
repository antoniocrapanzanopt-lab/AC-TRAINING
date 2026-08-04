import { LocalOwnerProfile, AppSettings } from '../types';
import { STORAGE_KEYS } from '../config/storageKeys';
import { getStorageItem, setStorageItem } from './storage';

export const LOCAL_OWNER_ID = 'local-owner';
export const DEFAULT_OWNER_EMAIL = 'owner.demo@example.com';
export const DEFAULT_ORGANIZATION_NAME = 'Builder Athlete Manager Demo';

export const getLocalOwnerProfile = (): LocalOwnerProfile | null => {
  return getStorageItem<LocalOwnerProfile | null>(STORAGE_KEYS.OWNER_PROFILE, null);
};

export const isInitialSetupCompleted = (): boolean => {
  const isCompleted = getStorageItem<boolean>(STORAGE_KEYS.INITIAL_SETUP_COMPLETED, false);
  const profile = getLocalOwnerProfile();
  return Boolean(isCompleted && profile && profile.firstName && profile.lastName);
};

export const saveOwnerProfile = (data: {
  firstName: string;
  lastName: string;
  email?: string;
  organizationName?: string;
}): LocalOwnerProfile => {
  const cleanFirstName = data.firstName.trim();
  const cleanLastName = data.lastName.trim();
  const cleanEmail = data.email ? data.email.trim() : '';
  const cleanOrg = data.organizationName ? data.organizationName.trim() : '';

  const finalEmail = cleanEmail || DEFAULT_OWNER_EMAIL;
  const finalOrg = cleanOrg || DEFAULT_ORGANIZATION_NAME;
  const fullName = `${cleanFirstName} ${cleanLastName}`;
  const now = new Date().toISOString();

  const existing = getLocalOwnerProfile();

  const profile: LocalOwnerProfile = {
    id: LOCAL_OWNER_ID,
    firstName: cleanFirstName,
    lastName: cleanLastName,
    fullName: fullName,
    email: finalEmail,
    organizationName: finalOrg,
    role: 'owner',
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  setStorageItem(STORAGE_KEYS.OWNER_PROFILE, profile);
  setStorageItem(STORAGE_KEYS.INITIAL_SETUP_COMPLETED, true);

  // Aggiorna sempre businessName nelle impostazioni generali
  const currentSettings = getStorageItem<Partial<AppSettings>>(STORAGE_KEYS.SETTINGS, {});
  const updatedSettings: AppSettings = {
    businessName: finalOrg,
    ownerName: fullName,
    ownerEmail: finalEmail,
    updatedAt: now,
    ...currentSettings,
  };
  setStorageItem(STORAGE_KEYS.SETTINGS, updatedSettings);

  return profile;
};

/**
 * Migrazione una tantum per adeguare eventuali vecchi dati dimostrativi al profilo proprietario strutturato.
 * Modifica esclusivamente campi strutturati senza toccare note libere o dati dell'utente.
 */
export const runOwnerMigrationIfNeeded = (): void => {
  const isMigrated = getStorageItem<boolean>(STORAGE_KEYS.OWNER_MIGRATION_COMPLETED, false);
  if (isMigrated) return;

  const rawOwner = localStorage.getItem(STORAGE_KEYS.OWNER_PROFILE);
  if (rawOwner) {
    try {
      const parsed = JSON.parse(rawOwner) as Record<string, unknown>;
      if (parsed && typeof parsed === 'object') {
        const rawFullName = typeof parsed.fullName === 'string' ? parsed.fullName : '';
        const parts = rawFullName.split(' ').filter(Boolean);
        const firstName = typeof parsed.firstName === 'string' && parsed.firstName ? parsed.firstName : (parts[0] || 'Coach');
        const lastName = typeof parsed.lastName === 'string' && parsed.lastName ? parsed.lastName : (parts.slice(1).join(' ') || 'Dimostrativo');
        const email = typeof parsed.email === 'string' && parsed.email ? parsed.email : DEFAULT_OWNER_EMAIL;
        const organizationName = typeof parsed.businessName === 'string' && parsed.businessName
          ? parsed.businessName
          : (typeof parsed.organizationName === 'string' && parsed.organizationName ? parsed.organizationName : DEFAULT_ORGANIZATION_NAME);

        saveOwnerProfile({
          firstName,
          lastName,
          email,
          organizationName,
        });
      }
    } catch {
      // Ignora errori di parsing ed evita di sovrascrivere dati dell'utente
    }
  }

  setStorageItem(STORAGE_KEYS.OWNER_MIGRATION_COMPLETED, true);
};
