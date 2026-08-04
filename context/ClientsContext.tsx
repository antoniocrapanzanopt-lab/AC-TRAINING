import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Client, ClientFormData } from '../types';
import { STORAGE_KEYS } from '../config/storageKeys';
import { getStorageItem, setStorageItem } from '../lib/storage';

// ─── Dati Dimostrativi ─────────────────────────────────────────────────────────

const DEMO_CLIENTS: Client[] = [
  {
    id: 'client-demo-01',
    firstName: 'Mario',
    lastName: 'Rossi',
    fullName: 'Mario Rossi',
    age: 35,
    sex: 'male',
    goal: 'ipertrofia',
    experienceLevel: 'intermediate',
    weeklyWorkouts: 4,
    notes: 'Preferisce allenarsi al mattino. Attenzione alla spalla destra (vecchio infortunio generico).',
    createdAt: '2026-01-15T09:00:00.000Z',
    updatedAt: '2026-01-15T09:00:00.000Z',
  },
  {
    id: 'client-demo-02',
    firstName: 'Luca',
    lastName: 'Bianchi',
    fullName: 'Luca Bianchi',
    age: 42,
    sex: 'male',
    goal: 'dimagrimento',
    experienceLevel: 'beginner',
    weeklyWorkouts: 3,
    notes: 'Iniziato a gennaio 2026. Molto motivato, tende a esagerare con i carichi.',
    createdAt: '2026-01-20T10:30:00.000Z',
    updatedAt: '2026-01-20T10:30:00.000Z',
  },
  {
    id: 'client-demo-03',
    firstName: 'Giulia',
    lastName: 'Romano',
    fullName: 'Giulia Romano',
    age: 30,
    sex: 'female',
    goal: 'glutei',
    experienceLevel: 'intermediate',
    weeklyWorkouts: 4,
    notes: 'Obiettivo estetico con focus su glutei e femorali. Buona base tecnica.',
    createdAt: '2026-02-01T11:00:00.000Z',
    updatedAt: '2026-02-01T11:00:00.000Z',
  },
];

// ─── Interfaccia Context ───────────────────────────────────────────────────────

interface ClientsContextValue {
  clients: Client[];
  addClient: (data: ClientFormData) => Client;
  updateClient: (id: string, data: ClientFormData) => void;
  deleteClient: (id: string) => void;
  getClientById: (id: string) => Client | undefined;
  searchClients: (query: string) => Client[];
}

const ClientsContext = createContext<ClientsContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const ClientsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clients, setClients] = useState<Client[]>(() => {
    const stored = getStorageItem<Client[]>(STORAGE_KEYS.CLIENTS, []);
    if (stored.length === 0) {
      return DEMO_CLIENTS;
    }
    return stored;
  });

  // Persist on change
  useEffect(() => {
    setStorageItem(STORAGE_KEYS.CLIENTS, clients);
  }, [clients]);

  const addClient = useCallback((data: ClientFormData): Client => {
    const now = new Date().toISOString();
    const newClient: Client = {
      ...data,
      id: `client-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      fullName: `${data.firstName} ${data.lastName}`,
      createdAt: now,
      updatedAt: now,
    };
    setClients((prev) => [newClient, ...prev]);
    return newClient;
  }, []);

  const updateClient = useCallback((id: string, data: ClientFormData) => {
    setClients((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              ...data,
              fullName: `${data.firstName} ${data.lastName}`,
              updatedAt: new Date().toISOString(),
            }
          : c
      )
    );
  }, []);

  const deleteClient = useCallback((id: string) => {
    setClients((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const getClientById = useCallback(
    (id: string): Client | undefined => {
      return clients.find((c) => c.id === id);
    },
    [clients]
  );

  const searchClients = useCallback(
    (query: string): Client[] => {
      if (!query.trim()) return clients;
      const q = query.toLowerCase();
      return clients.filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.goal.toLowerCase().includes(q) ||
          (c.notes?.toLowerCase().includes(q) ?? false)
      );
    },
    [clients]
  );

  return (
    <ClientsContext.Provider
      value={{ clients, addClient, updateClient, deleteClient, getClientById, searchClients }}
    >
      {children}
    </ClientsContext.Provider>
  );
};

// ─── Hook ──────────────────────────────────────────────────────────────────────

export const useClients = (): ClientsContextValue => {
  const ctx = useContext(ClientsContext);
  if (!ctx) throw new Error('useClients must be used inside ClientsProvider');
  return ctx;
};
