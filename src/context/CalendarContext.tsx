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
  getGoogleCalendarState,
  setGoogleCalendarState,
  fetchGoogleEvents,
} from '../lib/googleCalendar';

interface CalendarContextType {
  customEvents: CalendarEvent[];
  allEvents: CalendarEvent[];
  isLoading: boolean;
  isGoogleConnected: boolean;
  googleEmail: string | null;
  connectGoogleCalendar: (email?: string) => Promise<void>;
  disconnectGoogleCalendar: () => void;
  syncGoogleCalendar: () => Promise<void>;
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
  const [isLoading, setIsLoading] = useState(true);

  // Stato Google Calendar
  const [isGoogleConnected, setIsGoogleConnected] = useState<boolean>(false);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);

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

    // Inizializza stato Google Calendar
    const gState = getGoogleCalendarState();
    setIsGoogleConnected(gState.isConnected);
    setGoogleEmail(gState.email);

    if (gState.isConnected && gState.email) {
      fetchGoogleEvents(gState.email).then(events => {
        setGoogleEvents(events);
      });
    }

    setIsLoading(false);
  }, []);

  const syncGoogleCalendar = useCallback(async () => {
    if (googleEmail) {
      const events = await fetchGoogleEvents(googleEmail);
      setGoogleEvents(events);
    }
  }, [googleEmail]);

  const connectGoogleCalendar = useCallback(async (emailToConnect: string = 'antonio.crapanzanopt@gmail.com') => {
    setGoogleCalendarState(true, emailToConnect);
    setIsGoogleConnected(true);
    setGoogleEmail(emailToConnect);
    const events = await fetchGoogleEvents(emailToConnect);
    setGoogleEvents(events);
  }, []);

  const disconnectGoogleCalendar = useCallback(() => {
    setGoogleCalendarState(false, null);
    setIsGoogleConnected(false);
    setGoogleEmail(null);
    setGoogleEvents([]);
  }, []);

  const persist = useCallback((data: CalendarEvent[]) => {
    setCustomEvents(data);
    setStorageItem(STORAGE_KEYS.CALENDAR, data);
  }, []);

  // Aggregazione dinamica di tutti gli eventi di sistema + eventi personalizzati
  const allEvents = useMemo(() => {
    const systemEvents: CalendarEvent[] = [];
    const nowIso = new Date().toISOString();

    // 1. Pagamenti in scadenza / saldati
    payments.forEach(p => {
      if (p.status !== 'cancelled') {
        const pDate = p.dueDate.slice(0, 10);
        systemEvents.push({
          id: `sys-pay-${p.id}`,
          title: `Rata ${p.installmentNumber ? `#${p.installmentNumber}` : ''}: ${p.athleteName}`,
          description: `Importo previsto: ${p.expectedAmount}€ (Residuo: ${p.residualAmount}€)`,
          type: 'payment',
          date: pDate,
          athleteId: p.athleteId,
          athleteName: p.athleteName,
          status: p.residualAmount <= 0 ? 'completed' : 'scheduled',
          isSystemGenerated: true,
          sourceId: p.id,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      }
    });

    // 2. Inizio e Fine Abbonamenti
    subscriptions.forEach(s => {
      if (s.status !== 'cancelled') {
        const startDate = s.startDate.slice(0, 10);
        const endDate = s.endDate.slice(0, 10);

        systemEvents.push({
          id: `sys-sub-start-${s.id}`,
          title: `Inizio Abbonamento: ${s.athleteName}`,
          description: `Pacchetto: ${s.packageName}`,
          type: 'subscription_start',
          date: startDate,
          athleteId: s.athleteId,
          athleteName: s.athleteName,
          status: 'completed',
          isSystemGenerated: true,
          sourceId: s.id,
          createdAt: nowIso,
          updatedAt: nowIso,
        });

        systemEvents.push({
          id: `sys-sub-end-${s.id}`,
          title: `Scadenza Abbonamento: ${s.athleteName}`,
          description: `Pacchetto: ${s.packageName}`,
          type: 'subscription_end',
          date: endDate,
          athleteId: s.athleteId,
          athleteName: s.athleteName,
          status: s.status === 'expired' ? 'completed' : 'scheduled',
          isSystemGenerated: true,
          sourceId: s.id,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      }
    });

    // 3. Rinnovi
    renewals.forEach(r => {
      if (r.nextActionDate && r.status !== 'renewed' && r.status !== 'not_renewed') {
        systemEvents.push({
          id: `sys-ren-${r.id}`,
          title: `Azione Rinnovo: ${r.athleteName}`,
          description: r.nextActionNotes || `Trattativa per ${r.packageName}`,
          type: 'renewal',
          date: r.nextActionDate.slice(0, 10),
          athleteId: r.athleteId,
          athleteName: r.athleteName,
          status: 'scheduled',
          isSystemGenerated: true,
          sourceId: r.id,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      }
    });

    // 4. Certificati Medici Atleti
    athletes.forEach(a => {
      if (a.medicalCertificateExpiryDate) {
        systemEvents.push({
          id: `sys-med-${a.id}`,
          title: `Scadenza Certificato Medico: ${a.fullName}`,
          description: `Rinnovo idoneità sportiva per ${a.fullName}`,
          type: 'medical_certificate',
          date: a.medicalCertificateExpiryDate.slice(0, 10),
          athleteId: a.id,
          athleteName: a.fullName,
          status: 'scheduled',
          isSystemGenerated: true,
          sourceId: a.id,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      }
    });

    // 5. Attività / Task
    tasks.forEach(t => {
      if (t.status !== 'cancelled') {
        let evType: CalendarEvent['type'] = 'appointment';
        if (t.category === 'assessment') evType = 'checkin';
        else if (t.category === 'training') evType = 'program_delivery';
        else if (t.category === 'call') evType = 'appointment';

        systemEvents.push({
          id: `sys-task-${t.id}`,
          title: t.title,
          description: t.description,
          type: evType,
          date: t.dueDate.slice(0, 10),
          startTime: t.dueTime,
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

    const gEvents = isGoogleConnected ? googleEvents : [];
    return [...systemEvents, ...customEvents, ...gEvents];
  }, [payments, subscriptions, renewals, athletes, tasks, customEvents, isGoogleConnected, googleEvents]);

  const addCustomEvent = useCallback((data: CalendarEventFormData): CalendarEvent => {
    const nowIso = new Date().toISOString();

    const newEvent: CalendarEvent = {
      ...data,
      id: `cust-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      isSystemGenerated: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const updated = [newEvent, ...customEvents];
    persist(updated);
    return newEvent;
  }, [customEvents, persist]);

  const updateCustomEvent = useCallback((id: string, updates: Partial<CalendarEvent>): boolean => {
    let found = false;
    const nowIso = new Date().toISOString();

    const updated = customEvents.map(evt => {
      if (evt.id === id && !evt.isSystemGenerated) {
        found = true;
        return { ...evt, ...updates, updatedAt: nowIso };
      }
      return evt;
    });

    if (found) persist(updated);
    return found;
  }, [customEvents, persist]);

  const deleteCustomEvent = useCallback((id: string): boolean => {
    const updated = customEvents.filter(evt => evt.id !== id || evt.isSystemGenerated);
    if (updated.length !== customEvents.length) {
      persist(updated);
      return true;
    }
    return false;
  }, [customEvents, persist]);

  const getEventsForAthlete = useCallback((athleteId: string): CalendarEvent[] => {
    return allEvents.filter(evt => evt.athleteId === athleteId);
  }, [allEvents]);

  return (
    <CalendarContext.Provider
      value={{
        customEvents,
        allEvents,
        isLoading,
        isGoogleConnected,
        googleEmail,
        connectGoogleCalendar,
        disconnectGoogleCalendar,
        syncGoogleCalendar,
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
