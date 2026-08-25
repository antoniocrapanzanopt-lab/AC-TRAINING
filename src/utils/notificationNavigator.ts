import { AppNotification } from '../types/notification';
import { NavigationTab } from '../types';

export interface NotificationNavigationResult {
  tab: NavigationTab;
  athleteId?: string;
}

/**
 * Risolve la destinazione di navigazione ottimale per una notifica in base a tipo, titolo, contenuto e metadati.
 * - Dolore / Fatica / RPE / Fastidi / Copilot -> 'analisi_report' (Performance & Copilot)
 * - Workout completato / PR -> 'cronologia_allenamenti'
 * - Rinnovi / Penultima settimana -> 'rinnovi'
 * - Messaggi / Chat -> 'messaggi'
 * - Comunicazioni / Broadcast -> 'comunicazioni'
 * - Schede di allenamento -> 'schede'
 * - Check-in / Questionari -> 'atleti'
 */
export function resolveNotificationNavigation(item: AppNotification): NotificationNavigationResult {
  const athleteId = item.athlete_id || undefined;
  const title = (item.title || '').toLowerCase();
  const body = (item.body || '').toLowerCase();
  const url = (item.action_url || '').toLowerCase();
  const type = item.type;

  // 1. Dolore, Fatica alta, Fastidi articolari, RPE elevato o Copilot -> Performance & Copilot
  if (
    type === 'pain_reported' ||
    type === 'stall_detected' ||
    type === 'adherence_low' ||
    title.includes('dolore') ||
    title.includes('fatica') ||
    title.includes('fastidi') ||
    title.includes('copilot') ||
    body.includes('dolore') ||
    body.includes('fatica') ||
    body.includes('fastidi') ||
    body.includes('questionario') ||
    body.includes('rpe') ||
    url.includes('copilot') ||
    url.includes('performance')
  ) {
    return {
      tab: 'analisi_report',
      athleteId,
    };
  }

  // 2. Allenamenti completati e nuovi PR
  if (
    type === 'workout_completed' ||
    type === 'new_pr' ||
    title.includes('ha completato un allenamento') ||
    title.includes('nuovo pr') ||
    title.includes('record personale')
  ) {
    return {
      tab: 'cronologia_allenamenti',
      athleteId,
    };
  }

  // 3. Rinnovi e scadenze schede/programmi
  if (
    type === 'program_renewal_required' ||
    type === 'penultimate_week' ||
    title.includes('rinnovo') ||
    title.includes('penultima') ||
    url.includes('rinnov')
  ) {
    return {
      tab: 'rinnovi',
      athleteId,
    };
  }

  // 4. Messaggi / Chat
  if (
    type === 'message_received' ||
    title.includes('messaggio') ||
    title.includes('chat') ||
    url.includes('messagg') ||
    url.includes('chat')
  ) {
    return {
      tab: 'messaggi',
      athleteId,
    };
  }

  // 5. Comunicazioni / Broadcast / Annunci
  if (
    Boolean(item.metadata?.broadcastId) ||
    title.includes('broadcast') ||
    title.includes('comunicazione') ||
    url.includes('comunicaz')
  ) {
    return {
      tab: 'comunicazioni',
    };
  }

  // 6. Schede e Progressioni esplicite
  if (url.includes('progression') || title.includes('progression')) {
    return {
      tab: 'progressioni',
      athleteId,
    };
  }
  if (url.includes('schede') || title.includes('scheda') || title.includes('allenament')) {
    return {
      tab: 'schede',
      athleteId,
    };
  }

  // 7. Check-in, Misure e Questionari
  if (
    type === 'checkin_submitted' ||
    type === 'checkin_alert' ||
    type === 'checkin_expired' ||
    type === 'questionnaire_submitted' ||
    title.includes('check-in') ||
    title.includes('peso') ||
    title.includes('misura')
  ) {
    return {
      tab: 'atleti',
      athleteId,
    };
  }

  // 8. Action URL generico
  if (url.includes('atleta_portale') || url.includes('portale')) {
    return { tab: 'atleta_portale' };
  }
  if (url.includes('report') || url.includes('analisi')) {
    return { tab: 'analisi_report', athleteId };
  }
  if (url.includes('impostazion') || type === 'security_login' || type === 'security_mfa_failed') {
    return { tab: 'impostazioni' };
  }

  // 9. Fallback se associato ad atleta
  if (athleteId) {
    return { tab: 'atleti', athleteId };
  }

  return { tab: 'notifiche' };
}
