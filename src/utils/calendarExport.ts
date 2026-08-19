import { CalendarEvent } from '../types';

/**
 * Formatta una data e un orario per lo standard iCalendar (YYYYMMDDTHHMMSS)
 */
function formatIcsDateTime(dateStr: string, timeStr?: string): string {
  // dateStr è YYYY-MM-DD
  const cleanDate = dateStr.replace(/-/g, '');
  
  if (!timeStr) {
    return `${cleanDate}T090000`;
  }

  const [hours, minutes] = timeStr.split(':');
  const h = hours ? hours.padStart(2, '0') : '09';
  const m = minutes ? minutes.padStart(2, '0') : '00';
  return `${cleanDate}T${h}${m}00`;
}

/**
 * Calcola l'orario di fine presunto se non specificato (default +45 minuti)
 */
function getIcsEndDateTime(dateStr: string, startTime?: string, endTime?: string): string {
  const cleanDate = dateStr.replace(/-/g, '');

  if (endTime) {
    const [hours, minutes] = endTime.split(':');
    const h = hours ? hours.padStart(2, '0') : '10';
    const m = minutes ? minutes.padStart(2, '0') : '00';
    return `${cleanDate}T${h}${m}00`;
  }

  if (startTime) {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startTotalMin = (hours || 9) * 60 + (minutes || 0);
    const endTotalMin = startTotalMin + 45; // Default 45 minuti
    const endH = String(Math.floor(endTotalMin / 60) % 24).padStart(2, '0');
    const endM = String(endTotalMin % 60).padStart(2, '0');
    return `${cleanDate}T${endH}${endM}00`;
  }

  return `${cleanDate}T100000`;
}

/**
 * Genera e scarica un file .ics per sincronizzare l'appuntamento con Apple Calendar / Google / Outlook
 */
export function exportEventToIcs(event: CalendarEvent): void {
  const dtStart = formatIcsDateTime(event.date, event.startTime);
  const dtEnd = getIcsEndDateTime(event.date, event.startTime, event.endTime);
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const description = [
    event.description || 'Appuntamento programmato con il tuo Coach AC Training.',
    event.htmlLink ? `Link Call: ${event.htmlLink}` : '',
    event.notes ? `Note: ${event.notes}` : '',
  ]
    .filter(Boolean)
    .join('\\n');

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AC Coaching//Athlete Portal//IT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id}-${Date.now()}@accoaching.app`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${description}`,
    event.location ? `LOCATION:${event.location}` : '',
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${event.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
