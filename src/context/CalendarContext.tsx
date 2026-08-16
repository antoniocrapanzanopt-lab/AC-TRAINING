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

    // Filtra e bonifica eventuali residui demo (Marco Bianchi / Giulia Esposito)
    const cleanEvents = saved.filter(e => 
      !e.id?.startsWith('cust-evt-') &&
      !e.athleteId?.startsWith('athlete-demo-') &&
      e.athleteName !== 'Marco Bianchi' &&
      e.athleteName !== 'Giulia Esposito'
    );

    setCustomEvents(cleanEvents);
    setStorageItem(STORAGE_KEYS.CALENDAR, cleanEvents);

    // Inizializza stato Google Calendar (attivo di default)
    const gState = getGoogleCalendarState();
    const activeEmail = gState.email || 'antonio.crapanzanopt@gmail.com';
    setIsGoogleConnected(true);
    setGoogleEmail(activeEmail);

    if (!gState.isConnected) {
      setGoogleCalendarState(true, activeEmail);
    }

    // Sincronizzazione iniziale
    fetchGoogleEvents(activeEmail).then(events => {
      setGoogleEvents(events);
    });

    // Sincronizzazione automatica periodica costante (ogni 60 secondi)
    const syncInterval = setInterval(() => {
      fetchGoogleEvents(activeEmail).then(events => {
        setGoogleEvents(events);
      });
    }, 60000);

    // Sincronizzazione automatica quando la finestra torna in focus
    const handleFocus = () => {
      fetchGoogleEvents(activeEmail).then(events => {
        setGoogleEvents(events);
      });
    };
    window.addEventListener('focus', handleFocus);

    setIsLoading(false);

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('focus', handleFocus);
    };
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
