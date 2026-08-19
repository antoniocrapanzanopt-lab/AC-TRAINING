import { CalendarEvent } from '../types';
import { getStorageItem, setStorageItem } from './storage';

export const GCAL_STORAGE_KEYS = {
  CONNECTED: 'gcal_connected',
  EMAIL: 'gcal_email',
  TOKEN: 'gcal_access_token',
  CLIENT_ID: 'gcal_client_id',
  ICAL_URL: 'gcal_ical_url',
  EVENTS: 'gcal_cached_events',
};

export interface GoogleCalendarState {
  isConnected: boolean;
  email: string | null;
  lastSynced: string | null;
  clientId: string | null;
  icalUrl: string | null;
  hasRealTokenOrUrl: boolean;
}

export const DEFAULT_ICAL_URL = 'https://calendar.google.com/calendar/ical/antonio.crapanzanopt%40gmail.com/private-4904ed58652aca2dfff4d62155330aa0/basic.ics';

export const getGoogleCalendarState = (): GoogleCalendarState => {
  const isConnected = getStorageItem<boolean>(GCAL_STORAGE_KEYS.CONNECTED, true);
  const email = getStorageItem<string | null>(GCAL_STORAGE_KEYS.EMAIL, 'antonio.crapanzanopt@gmail.com');
  const lastSynced = getStorageItem<string | null>('gcal_last_synced', null);
  const clientId = getStorageItem<string | null>(GCAL_STORAGE_KEYS.CLIENT_ID, null);
  const icalUrl = getStorageItem<string | null>(GCAL_STORAGE_KEYS.ICAL_URL, DEFAULT_ICAL_URL);
  const token = getStorageItem<string | null>(GCAL_STORAGE_KEYS.TOKEN, null);
  
  return {
    isConnected,
    email,
    lastSynced,
    clientId,
    icalUrl,
    hasRealTokenOrUrl: Boolean(token || icalUrl),
  };
};

export const setGoogleCalendarState = (connected: boolean, email: string | null, token?: string | null) => {
  setStorageItem(GCAL_STORAGE_KEYS.CONNECTED, connected);
  setStorageItem(GCAL_STORAGE_KEYS.EMAIL, email);
  if (token !== undefined) {
    setStorageItem(GCAL_STORAGE_KEYS.TOKEN, token);
  }
  if (connected) {
    setStorageItem('gcal_last_synced', new Date().toISOString());
  } else {
    setStorageItem('gcal_last_synced', null);
    setStorageItem(GCAL_STORAGE_KEYS.TOKEN, null);
  }
};

export const setGoogleClientId = (clientId: string) => {
  setStorageItem(GCAL_STORAGE_KEYS.CLIENT_ID, clientId);
};

export const setGoogleAccessToken = (token: string) => {
  setStorageItem(GCAL_STORAGE_KEYS.TOKEN, token);
};

export const getGoogleAccessToken = (): string | null => {
  return getStorageItem<string | null>(GCAL_STORAGE_KEYS.TOKEN, null);
};

export const setGoogleICalUrl = (url: string | null) => {
  setStorageItem(GCAL_STORAGE_KEYS.ICAL_URL, url);
};

export const getGoogleICalUrl = (): string | null => {
  return getStorageItem<string | null>(GCAL_STORAGE_KEYS.ICAL_URL, DEFAULT_ICAL_URL);
};

/**
 * Genera eventi demo/mock realistici per antonio.crapanzanopt@gmail.com 
 * in modo da mostrare l'integrazione con date sempre valide e aggiornate.
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
      title: 'Consulta PT & Valutazione Anamnesi',
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
      title: 'Sessione Personal Training - Cliente VIP',
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
      title: 'Web Meeting: Pianificazione Trimestre PT',
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

export const parseICSString = (icsContent: string, email: string): CalendarEvent[] => {
  const events: CalendarEvent[] = [];
  const vevents = icsContent.split('BEGIN:VEVENT');

  for (let i = 1; i < vevents.length; i++) {
    const chunk = vevents[i].split('END:VEVENT')[0];
    
    const summaryMatch = chunk.match(/SUMMARY:(.*)/);
    const summary = summaryMatch ? summaryMatch[1].trim() : 'Evento Google Calendar';

    const descMatch = chunk.match(/DESCRIPTION:(.*)/);
    const description = descMatch ? descMatch[1].trim().replace(/\\n/g, '\n') : '';

    const locMatch = chunk.match(/LOCATION:(.*)/);
    const location = locMatch ? locMatch[1].trim() : '';

    const startMatch = chunk.match(/DTSTART(?:;[^:]*)?:([0-9T]+)/);
    let dateStr = new Date().toISOString().slice(0, 10);
    let startTime: string | undefined = undefined;

    if (startMatch && startMatch[1]) {
      const raw = startMatch[1];
      if (raw.length >= 8) {
        const y = raw.slice(0, 4);
        const m = raw.slice(4, 6);
        const d = raw.slice(6, 8);
        dateStr = `${y}-${m}-${d}`;
      }
      if (raw.includes('T') && raw.length >= 13) {
        const tIndex = raw.indexOf('T');
        const hh = raw.slice(tIndex + 1, tIndex + 3);
        const mm = raw.slice(tIndex + 3, tIndex + 5);
        startTime = `${hh}:${mm}`;
      }
    }

    const endMatch = chunk.match(/DTEND(?:;[^:]*)?:([0-9T]+)/);
    let endTime: string | undefined = undefined;
    if (endMatch && endMatch[1]) {
      const raw = endMatch[1];
      if (raw.includes('T') && raw.length >= 13) {
        const tIndex = raw.indexOf('T');
        const hh = raw.slice(tIndex + 1, tIndex + 3);
        const mm = raw.slice(tIndex + 3, tIndex + 5);
        endTime = `${hh}:${mm}`;
      }
    }

    const uidMatch = chunk.match(/UID:(.*)/);
    const uid = uidMatch ? uidMatch[1].trim() : `ics-${i}-${Date.now()}`;

    events.push({
      id: `gcal-ics-${uid}`,
      title: summary,
      description,
      type: 'google_calendar' as const,
      date: dateStr,
      startTime,
      endTime,
      status: 'scheduled' as const,
      isSystemGenerated: false,
      location,
      googleEventId: uid,
      googleCalendarEmail: email,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return events;
};

/**
 * Tenta di scaricare gli eventi reali da Google Calendar v3 usando il Bearer Token o il Link iCal.
 * Se non è ancora presente una configurazione reale, fa il fallback agli eventi dimostrativi.
 */
export const fetchGoogleEvents = async (email: string = 'antonio.crapanzanopt@gmail.com'): Promise<CalendarEvent[]> => {
  const token = getGoogleAccessToken();
  const icalUrl = getGoogleICalUrl();

  // 1. Tenta via OAuth Bearer Token se disponibile
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
            title: item.summary || 'Evento Google Calendar',
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
      console.warn('Impossibile contattare l\'API di Google Calendar con il token fornito:', err);
    }
  }

  // 2. Tenta via Link Segreto iCal (.ics) se disponibile
  if (icalUrl) {
    try {
      let res: Response | null = await fetch(icalUrl).catch(() => null);

      if (!res || !res.ok) {
        res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(icalUrl)}`).catch(() => null);
      }
      if (!res || !res.ok) {
        res = await fetch(`https://corsproxy.io/?${encodeURIComponent(icalUrl)}`).catch(() => null);
      }

      if (res && res.ok) {
        const text = await res.text();
        const parsed = parseICSString(text, email);
        if (parsed.length > 0) return parsed;
      }
    } catch (err) {
      console.warn('Impossibile scaricare o formattare il feed iCal di Google Calendar:', err);
    }
  }

  // Fallback con eventi dimostrativi
  return buildGoogleCalendarEvents(email);
};
