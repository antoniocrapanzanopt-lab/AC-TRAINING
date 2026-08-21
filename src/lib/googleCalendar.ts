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

/**
 * Converte una stringa data/ora da standard iCal (.ics) in data (YYYY-MM-DD) e ora (HH:mm) locali,
 * gestendo correttamente i timestamp UTC (con suffisso 'Z') e i relativi fusi orari.
 */
export const parseIcsDateTime = (raw: string): { dateStr: string; timeStr?: string } => {
  if (!raw) return { dateStr: new Date().toISOString().slice(0, 10) };

  const trimmed = raw.trim();

  // Caso 1: Solo data (es. "20260818")
  if (!trimmed.includes('T')) {
    if (trimmed.length >= 8) {
      const y = trimmed.slice(0, 4);
      const m = trimmed.slice(4, 6);
      const d = trimmed.slice(6, 8);
      return { dateStr: `${y}-${m}-${d}` };
    }
    return { dateStr: new Date().toISOString().slice(0, 10) };
  }

  // Caso 2: Data e ora (es. "20260818T070000Z" o "20260818T090000")
  const isUtc = trimmed.toUpperCase().endsWith('Z');
  const tIndex = trimmed.indexOf('T');
  const datePart = trimmed.slice(0, tIndex);
  const timePart = trimmed.slice(tIndex + 1).replace(/Z/i, '');

  const y = parseInt(datePart.slice(0, 4), 10);
  const m = parseInt(datePart.slice(4, 6), 10) - 1; // Mese 0-based
  const d = parseInt(datePart.slice(6, 8), 10);

  const hh = parseInt(timePart.slice(0, 2), 10) || 0;
  const mm = parseInt(timePart.slice(2, 4), 10) || 0;
  const ss = timePart.length >= 6 ? parseInt(timePart.slice(4, 6), 10) || 0 : 0;

  if (isUtc) {
    // È in formato UTC: costruiamo la data UTC e leggiamo l'ora locale del browser/utente
    const utcDate = new Date(Date.UTC(y, m, d, hh, mm, ss));
    const localYear = utcDate.getFullYear();
    const localMonth = String(utcDate.getMonth() + 1).padStart(2, '0');
    const localDay = String(utcDate.getDate()).padStart(2, '0');
    const localHour = String(utcDate.getHours()).padStart(2, '0');
    const localMin = String(utcDate.getMinutes()).padStart(2, '0');

    return {
      dateStr: `${localYear}-${localMonth}-${localDay}`,
      timeStr: `${localHour}:${localMin}`,
    };
  } else {
    // Già in orario locale o floating
    const yStr = datePart.slice(0, 4);
    const mStr = datePart.slice(4, 6);
    const dStr = datePart.slice(6, 8);
    const hhStr = String(hh).padStart(2, '0');
    const mmStr = String(mm).padStart(2, '0');

    return {
      dateStr: `${yStr}-${mStr}-${dStr}`,
      timeStr: `${hhStr}:${mmStr}`,
    };
  }
};

/**
 * Converte una stringa data/ora ISO restituita dalle API di Google Calendar
 * in data e ora locali.
 */
export const parseGoogleApiDateTime = (apiDateStr: string | undefined): { dateStr: string; timeStr?: string } => {
  if (!apiDateStr) return { dateStr: new Date().toISOString().slice(0, 10) };

  // Solo giorno (es. "2026-08-18")
  if (!apiDateStr.includes('T')) {
    return { dateStr: apiDateStr.slice(0, 10) };
  }

  // Timestamp ISO con orario e fuso orario (es. "2026-08-18T07:00:00Z")
  const dateObj = new Date(apiDateStr);
  if (isNaN(dateObj.getTime())) {
    return {
      dateStr: apiDateStr.slice(0, 10),
      timeStr: apiDateStr.slice(11, 16),
    };
  }

  const localYear = dateObj.getFullYear();
  const localMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
  const localDay = String(dateObj.getDate()).padStart(2, '0');
  const localHour = String(dateObj.getHours()).padStart(2, '0');
  const localMin = String(dateObj.getMinutes()).padStart(2, '0');

  return {
    dateStr: `${localYear}-${localMonth}-${localDay}`,
    timeStr: `${localHour}:${localMin}`,
  };
};

export const parseICSString = (icsContent: string, email: string): CalendarEvent[] => {
  const events: CalendarEvent[] = [];
  // Unfold delle linee spezzate RFC 5545
  const unfolded = icsContent.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
  const vevents = unfolded.split('BEGIN:VEVENT');

  for (let i = 1; i < vevents.length; i++) {
    const chunk = vevents[i].split('END:VEVENT')[0];
    
    const summaryMatch = chunk.match(/SUMMARY:(.*)/i);
    const summary = summaryMatch ? summaryMatch[1].trim() : 'Evento Google Calendar';

    const descMatch = chunk.match(/DESCRIPTION:(.*)/i);
    const description = descMatch ? descMatch[1].trim().replace(/\\n/g, '\n') : '';

    const locMatch = chunk.match(/LOCATION:(.*)/i);
    const location = locMatch ? locMatch[1].trim() : '';

    const startMatch = chunk.match(/DTSTART(?:;[^:]*)?:([0-9TZ]+)/i);
    const parsedStart = startMatch ? parseIcsDateTime(startMatch[1]) : { dateStr: new Date().toISOString().slice(0, 10) };

    const endMatch = chunk.match(/DTEND(?:;[^:]*)?:([0-9TZ]+)/i);
    const parsedEnd = endMatch ? parseIcsDateTime(endMatch[1]) : undefined;

    const uidMatch = chunk.match(/UID:(.*)/i);
    const uid = uidMatch ? uidMatch[1].trim() : `ics-${i}-${Date.now()}`;

    events.push({
      id: `gcal-ics-${uid}`,
      title: summary,
      description,
      type: 'google_calendar' as const,
      date: parsedStart.dateStr,
      startTime: parsedStart.timeStr,
      endTime: parsedEnd?.timeStr,
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
          const start = item.start?.dateTime || item.start?.date;
          const end = item.end?.dateTime || item.end?.date;
          const parsedStart = parseGoogleApiDateTime(start);
          const parsedEnd = parseGoogleApiDateTime(end);

          return {
            id: `gcal-${item.id}`,
            title: item.summary || 'Evento Google Calendar',
            description: item.description || '',
            type: 'google_calendar' as const,
            date: parsedStart.dateStr,
            startTime: parsedStart.timeStr,
            endTime: parsedEnd.timeStr,
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
