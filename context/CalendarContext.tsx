import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { CalendarEvent, CalendarEventFormData } from '../types';
import { STORAGE_KEYS } from '../config/storageKeys';
import { getStorageItem, setStorageItem } from '../lib/storage';
import { usePayments } from './PaymentsContext';
import { useSubscriptions } from './SubscriptionsContext';
import { useRenewals } from './RenewalsContext';
import { useAthletes } from './AthletesContext';
import { useTasks } from './TasksContext';
import {
  GoogleCalendarConfig,
  getGoogleCalendarConfig,
  connectGoogleCalendar,
  disconnectGoogleCalendar,
  createGoogleCalendarEvent,
  fetchGoogleCalendarEvents,
  generateGoogleCalendarWebUrl,
} from '../services/googleCalendarService';

export type GoogleEventFilterMode = 'all' | 'app_only' | 'google_only';

interface CalendarContextType {
  customEvents: CalendarEvent[];
  allEvents: CalendarEvent[];
  filteredEvents: CalendarEvent[];
  isLoading: boolean;
  googleConfig: GoogleCalendarConfig;
  googleFilterMode: GoogleEventFilterMode;
  setGoogleFilterMode: (mode: GoogleEventFilterMode) => void;
  connectGoogle: (email?: string) => Promise<GoogleCalendarConfig>;
  disconnectGoogle: () => Promise<GoogleCalendarConfig>;
  syncEventToGoogle: (eventId: string) => Promise<boolean>;
  addCustomEvent: (data: CalendarEventFormData) => CalendarEvent;
  updateCustomEvent: (id: string, updates: Partial<CalendarEvent>) => boolean;
  deleteCustomEvent: (id: string) => boolean;
  getEventsForAthlete: (athleteId: string) => CalendarEvent[];
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

const buildDemoCustomEvents = (): CalendarEvent[] => {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const nextWeek = new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10);

  return [
    {
      id: 'cust-evt-1',
      title: 'Gara Regionale Bodybuilding & Fitness',
      description: 'Competizione ufficiale di selezione atleti.',
      type: 'competition',
      date: nextWeek,
      startTime: '09:00',
      endTime: '18:00',
      athleteId: 'athlete-demo-01',
      athleteName: 'Marco Bianchi',
      status: 'scheduled',
      isSystemGenerated: false,
      location: 'Palasport Milano',
      notes: 'Verificare ricarica carboidrati e tana di colore.',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: 'cust-evt-2',
      title: 'Consegna Integrazione Nutrizionale',
      description: 'Consegna integratori ed allineamento dieta.',
      type: 'program_delivery',
      date: today,
      startTime: '15:30',
      endTime: '16:00',
      athleteId: 'athlete-demo-02',
      athleteName: 'Giulia Esposito',
      status: 'scheduled',
      isSystemGenerated: false,
      notes: 'BCAA e Proteine isolate.',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
  ];
};

export const CalendarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customEvents, setCustomEvents] = useState<CalendarEvent[]>([]);
  const [googleEvents, setGoogleEvents] = useState<CalendarEvent[]>([]);
  const [googleConfig, setGoogleConfig] = useState<GoogleCalendarConfig>(getGoogleCalendarConfig());
  const [googleFilterMode, setGoogleFilterMode] = useState<GoogleEventFilterMode>('all');
  const [isLoading, setIsLoading] = useState(true);

  const { payments } = usePayments();
  const { subscriptions } = useSubscriptions();
  const { renewals } = useRenewals();
  const { athletes } = useAthletes();
  const { tasks } = useTasks();

  useEffect(() => {
    const saved = getStorageItem<CalendarEvent[]>(STORAGE_KEYS.CALENDAR, []);

    if (saved.length === 0) {
      const demo = buildDemoCustomEvents();
      setStorageItem(STORAGE_KEYS.CALENDAR, demo);
      setCustomEvents(demo);
    } else {
      setCustomEvents(saved);
    }
    setIsLoading(false);
  }, []);

  // Sync Google Events when config changes
  useEffect(() => {
    if (googleConfig.isConnected) {
      fetchGoogleCalendarEvents().then((evts) => setGoogleEvents(evts));
    } else {
      setGoogleEvents([]);
    }
  }, [googleConfig.isConnected]);

  const persist = useCallback((data: CalendarEvent[]) => {
    setCustomEvents(data);
    setStorageItem(STORAGE_KEYS.CALENDAR, data);
  }, []);

  const connectGoogle = useCallback(async (email?: string) => {
    const newConfig = await connectGoogleCalendar(email);
    setGoogleConfig(newConfig);
    const evts = await fetchGoogleCalendarEvents();
    setGoogleEvents(evts);
    return newConfig;
  }, []);

  const disconnectGoogle = useCallback(async () => {
    const newConfig = await disconnectGoogleCalendar();
    setGoogleConfig(newConfig);
    setGoogleEvents([]);
    return newConfig;
  }, []);

  // Aggregazione dinamica di tutti gli eventi di sistema + eventi personalizzati + eventi google
  const allEvents = useMemo(() => {
    const systemEvents: CalendarEvent[] = [];
    const nowIso = new Date().toISOString();

    // 1. Pagamenti in scadenza / saldati
    payments.forEach(p => {
      if (p.status !== 'cancelled') {
        const ath = athletes.find(a => a.id === p.athleteId);
        systemEvents.push({
          id: `sys-pay-${p.id}`,
          title: `Pagamento Rata: ${p.expectedAmount}€ (${p.athleteName || 'Atleta'})`,
          description: `Rata per abbonamento. Stato: ${p.status === 'paid' ? 'Saldato' : 'In attesa'}`,
          type: 'payment',
          date: p.dueDate,
          athleteId: p.athleteId,
          athleteName: p.athleteName || ath?.fullName,
          status: p.status === 'paid' ? 'completed' : 'scheduled',
          isSystemGenerated: true,
          sourceId: p.id,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      }
    });

    // 2. Abbonamenti in scadenza / inizio
    subscriptions.forEach(s => {
      if (s.startDate) {
        systemEvents.push({
          id: `sys-sub-start-${s.id}`,
          title: `Inizio Abbonamento: ${s.packageName} (${s.athleteName})`,
          description: `Attivazione pacchetto ${s.packageName}`,
          type: 'subscription_start',
          date: s.startDate,
          athleteId: s.athleteId,
          athleteName: s.athleteName,
          status: 'completed',
          isSystemGenerated: true,
          sourceId: s.id,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      }
      if (s.endDate) {
        systemEvents.push({
          id: `sys-sub-end-${s.id}`,
          title: `Scadenza Abbonamento: ${s.packageName} (${s.athleteName})`,
          description: `Fine validità pacchetto ${s.packageName}`,
          type: 'subscription_end',
          date: s.endDate,
          athleteId: s.athleteId,
          athleteName: s.athleteName,
          status: 'scheduled',
          isSystemGenerated: true,
          sourceId: s.id,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      }
    });

    // 3. Rinnovi in gestione
    renewals.forEach(r => {
      if (r.endDate) {
        systemEvents.push({
          id: `sys-ren-${r.id}`,
          title: `Rinnovo Pacchetto: ${r.athleteName}`,
          description: `Data prevista per il rinnovo. Pacchetto: ${r.packageName}`,
          type: 'renewal',
          date: r.endDate,
          athleteId: r.athleteId,
          athleteName: r.athleteName,
          status: r.status === 'renewed' ? 'completed' : 'scheduled',
          isSystemGenerated: true,
          sourceId: r.id,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      }
    });

    // 4. Task in scadenza
    tasks.forEach(t => {
      if (t.dueDate) {
        systemEvents.push({
          id: `sys-task-${t.id}`,
          title: `Task: ${t.title}`,
          description: t.description,
          type: 'checkin',
          date: t.dueDate,
          athleteId: t.athleteId,
          athleteName: t.athleteName,
          status: t.status === 'completed' ? 'completed' : 'scheduled',
          isSystemGenerated: true,
          sourceId: t.id,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      }
    });

    return [...systemEvents, ...customEvents, ...googleEvents];
  }, [payments, subscriptions, renewals, athletes, tasks, customEvents, googleEvents]);

  // Lista filtrata secondo la modalità Google Filter Mode
  const filteredEvents = useMemo(() => {
    if (googleFilterMode === 'app_only') {
      return allEvents.filter((e) => !e.isGoogleSynced);
    }
    if (googleFilterMode === 'google_only') {
      return allEvents.filter((e) => e.isGoogleSynced);
    }
    return allEvents;
  }, [allEvents, googleFilterMode]);

  const updateCustomEvent = useCallback((id: string, updates: Partial<CalendarEvent>): boolean => {
    let found = false;
    const nowIso = new Date().toISOString();

    const updated = customEvents.map(evt => {
      if (evt.id === id && !evt.isSystemGenerated) {
        found = true;
        const next = { ...evt, ...updates, updatedAt: nowIso };
        if (updates.title || updates.date || updates.startTime || updates.location) {
          next.googleCalendarUrl = generateGoogleCalendarWebUrl(next);
        }
        return next;
      }
      return evt;
    });

    if (found) persist(updated);
    return found;
  }, [customEvents, persist]);

  const addCustomEvent = useCallback((data: CalendarEventFormData): CalendarEvent => {
    const nowIso = new Date().toISOString();
    const newEvent: CalendarEvent = {
      ...data,
      id: `cust-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      isSystemGenerated: false,
      googleCalendarUrl: generateGoogleCalendarWebUrl(data),
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const updated = [newEvent, ...customEvents];
    persist(updated);

    // Auto-sync se connesso a Google
    if (googleConfig.isConnected && googleConfig.autoSyncEnabled) {
      createGoogleCalendarEvent(newEvent).then((res) => {
        updateCustomEvent(newEvent.id, {
          isGoogleSynced: true,
          googleEventId: res.googleEventId,
          googleCalendarUrl: res.webLink,
        });
      });
    }

    return newEvent;
  }, [customEvents, persist, googleConfig, updateCustomEvent]);

  const syncEventToGoogle = useCallback(async (eventId: string): Promise<boolean> => {
    const target = allEvents.find((e) => e.id === eventId);
    if (!target) return false;

    const res = await createGoogleCalendarEvent(target);
    if (!target.isSystemGenerated) {
      updateCustomEvent(eventId, {
        isGoogleSynced: true,
        googleEventId: res.googleEventId,
        googleCalendarUrl: res.webLink,
      });
    }
    return true;
  }, [allEvents, updateCustomEvent]);

  const deleteCustomEvent = useCallback((id: string): boolean => {
    const updated = customEvents.filter(evt => evt.id !== id || evt.isSystemGenerated);
    if (updated.length !== customEvents.length) {
      persist(updated);
      return true;
    }
    return false;
  }, [customEvents, persist]);

  const getEventsForAthlete = useCallback((athleteId: string): CalendarEvent[] => {
    return filteredEvents.filter(evt => evt.athleteId === athleteId);
  }, [filteredEvents]);

  return (
    <CalendarContext.Provider
      value={{
        customEvents,
        allEvents,
        filteredEvents,
        isLoading,
        googleConfig,
        googleFilterMode,
        setGoogleFilterMode,
        connectGoogle,
        disconnectGoogle,
        syncEventToGoogle,
        addCustomEvent,
        updateCustomEvent,
        deleteCustomEvent,
        getEventsForAthlete,
      }}
    >
      {children}
    </CalendarContext.Provider>
  );
};

export const useCalendar = (): CalendarContextType => {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error('useCalendar deve essere usato all\'interno di un CalendarProvider');
  }
  return context;
};

export const useCalendarEvents = useCalendar;
