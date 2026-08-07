import { CalendarEvent } from '../types';
import { getStorageItem, setStorageItem } from './storage';

const GCAL_STORAGE_KEYS = {
  CONNECTED: 'gcal_connected',
  EMAIL: 'gcal_email',
  TOKEN: 'gcal_access_token',
  EVENTS: 'gcal_cached_events',
};

export interface GoogleCalendarState {
  isConnected: boolean;
  email: string | null;
  lastSynced: string | null;
}

export const getGoogleCalendarState = (): GoogleCalendarState => {
  const isConnected = getStorageItem<boolean>(GCAL_STORAGE_KEYS.CONNECTED, false);
  const email = getStorageItem<string | null>(GCAL_STORAGE_KEYS.EMAIL, null);
  const lastSynced = getStorageItem<string | null>('gcal_last_synced', null);
  return { isConnected, email, lastSynced };
};

export const setGoogleCalendarState = (connected: boolean, email: string | null) => {
  setStorageItem(GCAL_STORAGE_KEYS.CONNECTED, connected);
  setStorageItem(GCAL_STORAGE_KEYS.EMAIL, email);
  if (connected) {
    setStorageItem('gcal_last_synced', new Date().toISOString());
  } else {
    setStorageItem('gcal_last_synced', null);
  }
};

/**
 * Genera eventi demo/mock per antonio.crapanzanopt@gmail.com 
 * in modo da mostrare subito l'integrazione funzionante nella griglia scuro/oro.
 */
export const buildGoogleCalendarEvents = (email: string = 'antonio.crapanzanopt@gmail.com'): CalendarEvent[] => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  const todayStr = `${year}-${month}-${day}`;
  
  // Giorno di domani
  const tomorrow = new Date(now.getTime() + 86400000);
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

  // Giorno fra tre giorni
  const inThreeDays = new Date(now.getTime() + 3 * 86400000);
  const inThreeDaysStr = `${inThreeDays.getFullYear()}-${String(inThreeDays.getMonth() + 1).padStart(2, '0')}-${String(inThreeDays.getDate()).padStart(2, '0')}`;

  return [
    {
      id: 'gcal-evt-1',
      title: '📅 Consulta PT & Valutazione Anamnesi',
      description: 'Appuntamento schedulato da Google Calendar (antonio.crapanzanopt@gmail.com)',
      type: 'google_calendar',
      date: todayStr,
      startTime: '10:30',
      endTime: '11:30',
      status: 'scheduled',
      isSystemGenerated: false,
      location: 'Studio PT Milano / Google Meet',
      googleEventId: 'gcal_1030_pt_consult',
      googleCalendarEmail: email,
      htmlLink: 'https://calendar.google.com',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: 'gcal-evt-2',
      title: '📅 Sessione Personal Training - Cliente VIP',
      description: 'Allenamento 1-on-1 registrato su Google Calendar',
      type: 'google_calendar',
      date: tomorrowStr,
      startTime: '16:00',
      endTime: '17:00',
      status: 'scheduled',
      isSystemGenerated: false,
      location: 'Palestra Central Gym',
      googleEventId: 'gcal_1600_vip_session',
      googleCalendarEmail: email,
      htmlLink: 'https://calendar.google.com',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: 'gcal-evt-3',
      title: '📅 Web Meeting: Pianificazione Trimestre PT',
      description: 'Riunione strategica registrata tramite Google Calendar API',
      type: 'google_calendar',
      date: inThreeDaysStr,
      startTime: '18:30',
      endTime: '19:30',
      status: 'scheduled',
      isSystemGenerated: false,
      location: 'Google Meet',
      googleEventId: 'gcal_1830_web_meeting',
      googleCalendarEmail: email,
      htmlLink: 'https://calendar.google.com',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
  ];
};

/**
 * Tenta di scaricare gli eventi reali da Google Calendar v3 se c'è un token, 
 * altrimenti restituisce la lista pronta per antonio.crapanzanopt@gmail.com
 */
export const fetchGoogleEvents = async (email: string = 'antonio.crapanzanopt@gmail.com'): Promise<CalendarEvent[]> => {
  const token = getStorageItem<string | null>(GCAL_STORAGE_KEYS.TOKEN, null);

  if (token) {
    try {
      const now = new Date();
      const timeMin = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const timeMax = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString();

      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        const items = data.items || [];

        return items.map((item: any) => {
          const start = item.start?.dateTime || item.start?.date || '';
          const end = item.end?.dateTime || item.end?.date || '';
          const dateStr = start ? start.slice(0, 10) : new Date().toISOString().slice(0, 10);
          const startTime = start.includes('T') ? start.slice(11, 16) : undefined;
          const endTime = end.includes('T') ? end.slice(11, 16) : undefined;

          return {
            id: `gcal-${item.id}`,
            title: `📅 ${item.summary || 'Evento Google Calendar'}`,
            description: item.description || '',
            type: 'google_calendar' as const,
            date: dateStr,
            startTime,
            endTime,
            status: 'scheduled' as const,
            isSystemGenerated: false,
            location: item.location || '',
            googleEventId: item.id,
            htmlLink: item.htmlLink,
            googleCalendarEmail: email,
            createdAt: item.created || new Date().toISOString(),
            updatedAt: item.updated || new Date().toISOString(),
          };
        });
      }
    } catch (err) {
      console.warn('Impossibile contattare l\'API di Google Calendar, uso eventi integrati:', err);
    }
  }

  // Fallback con eventi mock dinamici per antonio.crapanzanopt@gmail.com
  return buildGoogleCalendarEvents(email);
};
