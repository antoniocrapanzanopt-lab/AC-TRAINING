import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { PackageItem, PackageFormData } from '../types';
import { STORAGE_KEYS } from '../config/storageKeys';
import { getStorageItem, setStorageItem } from '../lib/storage';

// ─── Dati Dimostrativi ────────────────────────────────────────────────────────

const buildDemoPackages = (): PackageItem[] => {
  const now = new Date().toISOString();
  return [
    {
      id: `pkg-${Date.now()}-1`,
      name: 'Abbonamento Annuale PRO',
      description: 'Accesso illimitato a tutte le aree e servizi premium.',
      price: 600,
      duration: 1,
      durationUnit: 'years',
      paymentFrequency: 'single',
      installments: 1,
      setupFee: 50,
      includedServices: ['Sala Pesi', 'Corsi Fitness', 'Scheda Personalizzata', 'Sauna'],
      renewalType: 'manual',
      canBeSuspended: true,
      maxSuspensionDays: 30,
      discountType: 'percentage',
      discountValue: 10,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `pkg-${Date.now()}-2`,
      name: 'Trimestrale Base',
      description: 'Ideale per iniziare il percorso.',
      price: 150,
      duration: 3,
      durationUnit: 'months',
      paymentFrequency: 'single',
      installments: 1,
      includedServices: ['Sala Pesi', 'Scheda Personalizzata'],
      renewalType: 'manual',
      canBeSuspended: false,
      discountType: 'none',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `pkg-${Date.now()}-3`,
      name: 'Mensile Flessibile',
      description: 'Nessun vincolo, paghi mese per mese.',
      price: 60,
      duration: 1,
      durationUnit: 'months',
      paymentFrequency: 'monthly',
      installments: 1,
      includedServices: ['Sala Pesi'],
      renewalType: 'automatic',
      canBeSuspended: false,
      discountType: 'none',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }
  ];
};

// ─── Context ──────────────────────────────────────────────────────────────────

interface PackagesContextType {
  packages: PackageItem[];
  isLoading: boolean;
  addPackage: (data: PackageFormData) => PackageItem;
  updatePackage: (id: string, data: Partial<PackageFormData>) => boolean;
  deletePackage: (id: string) => boolean;
  duplicatePackage: (id: string) => PackageItem | undefined;
  togglePackageActive: (id: string) => boolean;
  getPackageById: (id: string) => PackageItem | undefined;
}

const PackagesContext = createContext<PackagesContextType | undefined>(undefined);

export const PackagesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const saved = getStorageItem<PackageItem[]>(STORAGE_KEYS.PACKAGES, []);
    if (saved.length === 0) {
      const demo = buildDemoPackages();
      setStorageItem(STORAGE_KEYS.PACKAGES, demo);
      setPackages(demo);
    } else {
      setPackages(saved);
    }
    setIsLoading(false);
  }, []);

  const persist = useCallback((data: PackageItem[]) => {
    setPackages(data);
    setStorageItem(STORAGE_KEYS.PACKAGES, data);
  }, []);

  const addPackage = useCallback((data: PackageFormData): PackageItem => {
    const now = new Date().toISOString();
    const newPackage: PackageItem = {
      ...data,
      id: `pkg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: now,
      updatedAt: now,
    };
    persist([...packages, newPackage]);
    return newPackage;
  }, [packages, persist]);

  const updatePackage = useCallback((id: string, data: Partial<PackageFormData>): boolean => {
    let found = false;
    const updated = packages.map((pkg) => {
      if (pkg.id === id) {
        found = true;
        return { ...pkg, ...data, updatedAt: new Date().toISOString() };
      }
      return pkg;
    });
    if (found) persist(updated);
    return found;
  }, [packages, persist]);

  const deletePackage = useCallback((id: string): boolean => {
    const initialLen = packages.length;
    const filtered = packages.filter((pkg) => pkg.id !== id);
    if (filtered.length !== initialLen) {
      persist(filtered);
      return true;
    }
    return false;
  }, [packages, persist]);

  const duplicatePackage = useCallback((id: string): PackageItem | undefined => {
    const source = packages.find((p) => p.id === id);
    if (!source) return undefined;

    const now = new Date().toISOString();
    const newPackage: PackageItem = {
      ...source,
      id: `pkg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: `${source.name} (Copia)`,
      createdAt: now,
      updatedAt: now,
      isActive: false, // Disattiviamo di default per evitare pacchetti duplicati attivi per sbaglio
    };
    persist([...packages, newPackage]);
    return newPackage;
  }, [packages, persist]);

  const togglePackageActive = useCallback((id: string): boolean => {
    let found = false;
    const updated = packages.map((pkg) => {
      if (pkg.id === id) {
        found = true;
        return { ...pkg, isActive: !pkg.isActive, updatedAt: new Date().toISOString() };
      }
      return pkg;
    });
    if (found) persist(updated);
    return found;
  }, [packages, persist]);

  const getPackageById = useCallback((id: string) => {
    return packages.find((p) => p.id === id);
  }, [packages]);

  return (
    <PackagesContext.Provider
      value={{
        packages,
        isLoading,
        addPackage,
        updatePackage,
        deletePackage,
        duplicatePackage,
        togglePackageActive,
        getPackageById,
      }}
    >
      {children}
    </PackagesContext.Provider>
  );
};

export const usePackages = (): PackagesContextType => {
  const ctx = useContext(PackagesContext);
  if (!ctx) {
    throw new Error('usePackages deve essere usato all\'interno di un PackagesProvider');
  }
  return ctx;
};
