import React, { createContext, useContext, useState, useEffect } from 'react';
import { NavigationTab, UserProfile, LocalOwnerProfile } from '../types';
import { STORAGE_KEYS } from '../config/storageKeys';
import { getStorageItem, setStorageItem } from '../lib/storage';
import { getLocalOwnerProfile, isInitialSetupCompleted, runOwnerMigrationIfNeeded } from '../lib/ownerProfile';

interface AppContextType {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  currentUser: UserProfile | null;
  setCurrentUser: (user: UserProfile | null) => void;
  ownerProfile: LocalOwnerProfile | null;
  setOwnerProfile: (profile: LocalOwnerProfile | null) => void;
  updateOwnerProfile: (profile: LocalOwnerProfile | null) => void;
  isSetupComplete: boolean;
  setIsSetupComplete: (completed: boolean) => void;
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [ownerProfile, setOwnerProfileState] = useState<LocalOwnerProfile | null>(null);

  const [activeTab, setActiveTabState] = useState<NavigationTab>('dashboard');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    // 1. Esegue eventuale migrazione una tantum
    runOwnerMigrationIfNeeded();

    // 2. Controlla lo stato del setup iniziale dal localStorage
    const setupDone = isInitialSetupCompleted();
    const owner = getLocalOwnerProfile();

    if (setupDone && owner) {
      setIsSetupComplete(true);
      setOwnerProfileState(owner);
      setCurrentUser({
        id: owner.id,
        name: owner.fullName,
        email: owner.email,
        role: 'owner',
        canViewFinancials: true,
      });
      const savedTab = getStorageItem<NavigationTab>(STORAGE_KEYS.ACTIVE_TAB, 'dashboard');
      setActiveTabState(savedTab);
    } else {
      setIsSetupComplete(false);
      setOwnerProfileState(null);
    }

    setIsLoading(false);
  }, []);

  const setActiveTab = (tab: NavigationTab) => {
    setActiveTabState(tab);
    setStorageItem(STORAGE_KEYS.ACTIVE_TAB, tab);
  };

  const setOwnerProfile = (profile: LocalOwnerProfile | null) => {
    setOwnerProfileState(profile);
    if (profile) {
      setIsSetupComplete(true);
      setCurrentUser({
        id: profile.id,
        name: profile.fullName,
        email: profile.email,
        role: 'owner',
        canViewFinancials: true,
      });
    } else {
      setIsSetupComplete(false);
    }
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        currentUser,
        setCurrentUser,
        ownerProfile,
        setOwnerProfile,
        updateOwnerProfile: setOwnerProfile,
        isSetupComplete,
        setIsSetupComplete,
        isLoading,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp deve essere utilizzato all\'interno di un AppProvider');
  }
  return context;
};
