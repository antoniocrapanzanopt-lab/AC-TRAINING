import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import {
  BroadcastType,
  BroadcastCommunication,
  BroadcastFormData,
  QuickMessageTemplate,
  ChannelSettingsConfig,
  AudienceFilterType,
  RecipientDeliveryStatus,
  CommunicationLog,
  CommunicationLogFormData,
  MessageTemplate,
  ApiIntegrationConfig,
} from '../types';
import { STORAGE_KEYS } from '../config/storageKeys';
import { getStorageItem, setStorageItem } from '../lib/storage';
import { getLocalOwnerProfile } from '../lib/ownerProfile';
import { useAthletes } from './AthletesContext';
import { supabase } from '../lib/supabase';
import { defaultQuickTemplates } from '../data/defaultCommunicationTemplates';

interface CommunicationsContextType {
  // Broadcasts
  broadcasts: BroadcastCommunication[];
  drafts: BroadcastCommunication[];
  sentBroadcasts: BroadcastCommunication[];
  quickTemplates: QuickMessageTemplate[];
  channelSettings: ChannelSettingsConfig;
  isLoading: boolean;

  // Broadcast Actions
  createBroadcast: (formData: BroadcastFormData, isDraft?: boolean, scheduleDate?: string) => BroadcastCommunication;
  updateBroadcast: (id: string, updates: Partial<BroadcastCommunication>) => boolean;
  deleteBroadcast: (id: string) => boolean;
  sendDraft: (id: string) => boolean;
  saveQuickTemplate: (template: Omit<QuickMessageTemplate, 'id' | 'createdAt'> & { id?: string }) => QuickMessageTemplate;
  deleteQuickTemplate: (id: string) => boolean;
  saveChannelSettings: (settings: ChannelSettingsConfig) => boolean;
  resolveRecipients: (filter: AudienceFilterType, tag?: string, selectedAthleteIds?: string[]) => { id: string; fullName: string; email?: string; phone?: string; avatarUrl?: string }[];
  
  // Tracking Actions
  markRecipientRead: (broadcastId: string, athleteId: string) => void;
  confirmRecipientRead: (broadcastId: string, athleteId: string) => void;
  recordRecipientClick: (broadcastId: string, athleteId: string) => void;
  recordRecipientReply: (broadcastId: string, athleteId: string, replyText: string) => void;

  // Legacy / 1-to-1 Compatibility
  communications: CommunicationLog[];
  templates: MessageTemplate[];
  apiConfig: ApiIntegrationConfig;
  logCommunication: (data: CommunicationLogFormData) => CommunicationLog;
  updateCommunication: (id: string, updates: Partial<CommunicationLog>) => boolean;
  deleteCommunication: (id: string) => boolean;
  saveTemplate: (template: Omit<MessageTemplate, 'id' | 'createdAt'> & { id?: string }) => MessageTemplate;
  deleteTemplate: (id: string) => boolean;
  saveApiConfig: (config: ApiIntegrationConfig) => boolean;
  compileTemplate: (templateBody: string, variables: Record<string, string>) => string;
  openWhatsApp: (phone: string, text: string) => void;
  openTelegram: (text: string) => void;
  openMailto: (email: string, subject: string, body: string) => void;
}

const CommunicationsContext = createContext<CommunicationsContextType | undefined>(undefined);

const defaultChannelSettings: ChannelSettingsConfig = {
  inAppEnabled: true,
  inAppSound: true,
  inAppPriority: 'high',
  emailEnabled: true,
  emailSenderName: 'AC Coaching Team',
  emailSenderAddress: 'coach@accoaching.it',
  emailSubjectPrefix: '[AC Coaching]',
  emailFooterText: 'AC Coaching — Performance & Bodybuilding Training System',
  whatsappEnabled: true,
  whatsappCoachNumber: '+39 340 1234567',
  whatsappCountryCode: '+39',
  whatsappAutoTextFormat: 'Ciao {{nome_atleta}},\n\n{{messaggio}}',
  telegramEnabled: false,
  webhookEnabled: false,
};

const defaultApiConfig: ApiIntegrationConfig = {
  whatsappEnabled: true,
  whatsappToken: 'TOKEN_WHATSAPP_ATTIVO',
  telegramEnabled: false,
  telegramToken: '',
  smtpEnabled: true,
  smtpHost: 'smtp.accoaching.it',
  smtpSender: 'info@accoaching.it',
  webhookEnabled: false,
  webhookUrl: '',
  webhookSecret: '',
  notes: 'Canali di comunicazione attivi e configurati.',
};

export const CommunicationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { athletes, addTimelineEvent, updateTimelineForBroadcast } = useAthletes();

  const [broadcasts, setBroadcasts] = useState<BroadcastCommunication[]>([]);
  const [quickTemplates, setQuickTemplates] = useState<QuickMessageTemplate[]>([]);
  const [channelSettings, setChannelSettings] = useState<ChannelSettingsConfig>(defaultChannelSettings);
  const [communications, setCommunications] = useState<CommunicationLog[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [apiConfig, setApiConfig] = useState<ApiIntegrationConfig>(defaultApiConfig);
  const [isLoading, setIsLoading] = useState(true);

  // Helper per risolvere i destinatari in base al filtro
  const resolveRecipients = useCallback((
    filter: AudienceFilterType,
    tag?: string,
    selectedAthleteIds?: string[]
  ): { id: string; fullName: string; email?: string; phone?: string; avatarUrl?: string }[] => {
    switch (filter) {
      case 'all_active':
        return athletes
          .filter(a => a.status !== 'archived')
          .map(a => ({ id: a.id, fullName: a.fullName, email: a.email, phone: a.phone, avatarUrl: a.avatarUrl }));
      
      case 'trial':
        return athletes
          .filter(a => a.status === 'trial')
          .map(a => ({ id: a.id, fullName: a.fullName, email: a.email, phone: a.phone, avatarUrl: a.avatarUrl }));
      
      case 'active_program':
        return athletes
          .filter(a => a.status === 'active' || a.paymentStatus === 'regular')
          .map(a => ({ id: a.id, fullName: a.fullName, email: a.email, phone: a.phone, avatarUrl: a.avatarUrl }));

      case 'pending_start':
        return athletes
          .filter(a => a.status === 'inactive' || a.paymentStatus === 'none')
          .map(a => ({ id: a.id, fullName: a.fullName, email: a.email, phone: a.phone, avatarUrl: a.avatarUrl }));

      case 'tag':
        if (!tag) return [];
        return athletes
          .filter(a => a.tags && a.tags.some(t => t.toLowerCase() === tag.toLowerCase()))
          .map(a => ({ id: a.id, fullName: a.fullName, email: a.email, phone: a.phone, avatarUrl: a.avatarUrl }));

      case 'manual':
        if (!selectedAthleteIds || selectedAthleteIds.length === 0) return [];
        return athletes
          .filter(a => selectedAthleteIds.includes(a.id))
          .map(a => ({ id: a.id, fullName: a.fullName, email: a.email, phone: a.phone, avatarUrl: a.avatarUrl }));

      default:
        return athletes.map(a => ({ id: a.id, fullName: a.fullName, email: a.email, phone: a.phone, avatarUrl: a.avatarUrl }));
    }
  }, [athletes]);

  // Caricamento iniziale dei dati
  useEffect(() => {
    const savedBroadcasts = getStorageItem<BroadcastCommunication[]>(STORAGE_KEYS.BROADCAST_COMMUNICATIONS, []);
    const savedQuickTpls = getStorageItem<QuickMessageTemplate[]>(STORAGE_KEYS.BROADCAST_TEMPLATES, []);
    const savedChannelSettings = getStorageItem<ChannelSettingsConfig | null>(STORAGE_KEYS.CHANNEL_SETTINGS, null);
    const savedComms = getStorageItem<CommunicationLog[]>(STORAGE_KEYS.COMMUNICATIONS, []);

    // Pulizia da demo residue
    const cleanComms = savedComms.filter(c => 
      !c.id?.startsWith('comm-demo-') &&
      !c.athleteId?.startsWith('athlete-demo-') &&
      c.athleteName !== 'Marco Bianchi' &&
      c.athleteName !== 'Giulia Esposito'
    );
    setCommunications(cleanComms);

    if (savedChannelSettings) {
      setChannelSettings({ ...defaultChannelSettings, ...savedChannelSettings });
    } else {
      setChannelSettings(defaultChannelSettings);
      try { setStorageItem(STORAGE_KEYS.CHANNEL_SETTINGS, defaultChannelSettings); } catch {}
    }

    if (savedQuickTpls.length === 0) {
      setQuickTemplates(defaultQuickTemplates);
      try { setStorageItem(STORAGE_KEYS.BROADCAST_TEMPLATES, defaultQuickTemplates); } catch {}
    } else {
      // Merge with default if new templates were added
      const existingIds = new Set(savedQuickTpls.map(t => t.id));
      const missingDefaults = defaultQuickTemplates.filter(d => !existingIds.has(d.id));
      const merged = [...savedQuickTpls, ...missingDefaults];
      setQuickTemplates(merged);
    }

    // Inizializza o carica i broadcast rimuovendo qualsiasi residuo mock
    const cleanBroadcasts = savedBroadcasts.filter(b => !b.id.startsWith('bc-init-'));
    
    // Ripristina il testo reale del messaggio se era rimasto il placeholder "Canali:"
    const fixedBroadcasts = cleanBroadcasts.map(b => {
      if (!b.message || b.message.trim().startsWith('Canali:')) {
        const matchingComm = cleanComms.find(c => 
          c.subject?.trim().toLowerCase() === b.title.trim().toLowerCase() ||
          c.id?.includes(b.id)
        );
        if (matchingComm?.messageText && !matchingComm.messageText.trim().startsWith('Canali:')) {
          return { ...b, message: matchingComm.messageText };
        }
      }
      return b;
    });

    setBroadcasts(fixedBroadcasts);
    try { setStorageItem(STORAGE_KEYS.BROADCAST_COMMUNICATIONS, fixedBroadcasts); } catch {}

    // Idratazione da Supabase athlete_timeline (per sincronizzare finestre in incognito / nuovi dispositivi)
    supabase
      .from('athlete_timeline')
      .select('*')
      .eq('type', 'communication')
      .order('created_at', { ascending: false })
      .then(({ data: dbTimeline }) => {
        if (dbTimeline && dbTimeline.length > 0) {
          const dbMap = new Map<string, BroadcastCommunication>();

          dbTimeline.forEach((t: any) => {
            const rawTitle = t.title || '';
            const title = rawTitle.startsWith('Broadcast: ') ? rawTitle.replace('Broadcast: ', '') : rawTitle;
            const broadcastId = t.metadata?.broadcastId || `bc-db-${t.id}`;
            const realMessage = (t.metadata?.message as string) || 
              (t.description && !t.description.startsWith('Canali:') ? t.description : '');

            if (!dbMap.has(title)) {
              dbMap.set(title, {
                id: broadcastId,
                title,
                type: (t.metadata?.broadcastType || 'update') as BroadcastType,
                status: 'sent',
                sentAt: t.metadata?.sentAt || t.created_at,
                audienceFilter: { type: 'all_active' },
                totalRecipientsCount: 30,
                channels: t.metadata?.channels || ['in_app'],
                message: realMessage,
                attachments: t.metadata?.attachments || [],
                cta: t.metadata?.cta,
                metrics: { sent: 30, delivered: 30, read: 0, clicked: 0, confirmed: 0, replied: 0 },
                recipients: [],
                author: t.created_by || 'Coach Antonio Crapanzano',
                createdAt: t.created_at,
                updatedAt: t.created_at,
              });
            }
          });

          const dbList = Array.from(dbMap.values());
          if (dbList.length > 0) {
            setBroadcasts(prev => {
              const existingMap = new Map(prev.map(b => [b.title.trim().toLowerCase(), b]));
              
              dbList.forEach(dbItem => {
                const key = dbItem.title.trim().toLowerCase();
                if (!existingMap.has(key)) {
                  existingMap.set(key, dbItem);
                } else {
                  const localItem = existingMap.get(key)!;
                  // Se il locale ha message vuoto o "Canali:", usa quello del DB se valido
                  if ((!localItem.message || localItem.message.startsWith('Canali:')) && dbItem.message) {
                    existingMap.set(key, { ...localItem, message: dbItem.message });
                  }
                }
              });

              const merged = Array.from(existingMap.values());
              try { setStorageItem(STORAGE_KEYS.BROADCAST_COMMUNICATIONS, merged); } catch {}
              return merged;
            });
          }
        }
      });

    setIsLoading(false);
  }, []);

  // Sincronizzazione in tempo reale cross-tab / cross-window e Supabase Realtime
  useEffect(() => {
    const handleSync = () => {
      const saved = getStorageItem<BroadcastCommunication[]>(STORAGE_KEYS.BROADCAST_COMMUNICATIONS, []);
      const clean = saved.filter(b => !b.id.startsWith('bc-init-'));
      setBroadcasts(clean);
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('broadcasts_updated', handleSync);

    // Canale Realtime Supabase su WebSocket
    const channel = supabase.channel('realtime:broadcasts_sync')
      .on('broadcast', { event: 'sync_broadcast' }, ({ payload }) => {
        if (payload && payload.id) {
          setBroadcasts(prev => {
            const exists = prev.some(b => b.id === payload.id);
            const updated = exists ? prev.map(b => b.id === payload.id ? payload : b) : [payload, ...prev];
            try { setStorageItem(STORAGE_KEYS.BROADCAST_COMMUNICATIONS, updated); } catch {}
            return updated;
          });
        }
      })
      .subscribe();

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('broadcasts_updated', handleSync);
      supabase.removeChannel(channel);
    };
  }, []);

  // Salvataggi persistenti
  const saveBroadcastsToStorage = useCallback((data: BroadcastCommunication[]): boolean => {
    try {
      const clean = data.filter(b => !b.id.startsWith('bc-init-'));
      setStorageItem(STORAGE_KEYS.BROADCAST_COMMUNICATIONS, clean);
      setBroadcasts(clean);
      window.dispatchEvent(new CustomEvent('broadcasts_updated'));
      return true;
    } catch (err) {
      console.error('Errore salvataggio broadcast:', err);
      return false;
    }
  }, []);

  const saveCommsToStorage = useCallback((data: CommunicationLog[]): boolean => {
    try {
      setStorageItem(STORAGE_KEYS.COMMUNICATIONS, data);
      setCommunications(data);
      return true;
    } catch (err) {
      console.error('Errore salvataggio comunicazioni legacy:', err);
      return false;
    }
  }, []);

  const saveQuickTplsToStorage = useCallback((data: QuickMessageTemplate[]): boolean => {
    try {
      setStorageItem(STORAGE_KEYS.BROADCAST_TEMPLATES, data);
      setQuickTemplates(data);
      return true;
    } catch (err) {
      console.error('Errore salvataggio modelli rapidi:', err);
      return false;
    }
  }, []);

  // Crea nuova comunicazione broadcast (immediata, programmata o bozza)
  const createBroadcast = useCallback((
    formData: BroadcastFormData,
    isDraft: boolean = false,
    scheduleDate?: string
  ): BroadcastCommunication => {
    const nowIso = new Date().toISOString();
    const owner = getLocalOwnerProfile();
    const resolvedRecipients = resolveRecipients(
      formData.audienceFilter.type,
      formData.audienceFilter.tag,
      formData.audienceFilter.selectedAthleteIds
    );

    const isScheduled = !isDraft && Boolean(scheduleDate && new Date(scheduleDate).getTime() > Date.now());
    const status = isDraft ? 'draft' : (isScheduled ? 'scheduled' : 'sent');

    const recipientEntries: RecipientDeliveryStatus[] = isDraft ? [] : resolvedRecipients.map(r => ({
      athleteId: r.id,
      athleteName: r.fullName,
      email: r.email,
      phone: r.phone,
      avatarUrl: r.avatarUrl,
      status: isScheduled ? 'pending' : 'delivered',
      deliveredAt: isScheduled ? undefined : nowIso,
      channels: formData.channels,
    }));

    const newBroadcast: BroadcastCommunication = {
      id: `bc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: formData.title,
      type: formData.type,
      status,
      scheduledFor: scheduleDate || formData.scheduledFor,
      sentAt: status === 'sent' ? nowIso : undefined,
      audienceFilter: formData.audienceFilter,
      totalRecipientsCount: resolvedRecipients.length,
      channels: formData.channels,
      message: formData.message,
      attachments: formData.attachments,
      cta: formData.cta,
      metrics: {
        sent: status === 'sent' ? resolvedRecipients.length : 0,
        delivered: status === 'sent' ? resolvedRecipients.length : 0,
        read: 0,
        clicked: 0,
        confirmed: 0,
        replied: 0,
      },
      recipients: recipientEntries,
      author: owner?.fullName || 'Antonio Crapanzano',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const updatedBroadcasts = [newBroadcast, ...broadcasts];
    saveBroadcastsToStorage(updatedBroadcasts);

    // Registra nella timeline degli atleti e nei log individuali se inviato
    if (status === 'sent') {
      const newComms: CommunicationLog[] = [...communications];
      resolvedRecipients.forEach(r => {
        addTimelineEvent(
          r.id,
          'communication',
          `Broadcast: ${formData.title}`,
          formData.message,
          owner?.id,
          owner?.fullName || 'Antonio Crapanzano',
          {
            broadcastId: newBroadcast.id,
            broadcastType: formData.type,
          }
        );

        newComms.unshift({
          id: `comm-bc-${Date.now()}-${r.id.slice(0, 4)}`,
          athleteId: r.id,
          athleteName: r.fullName,
          dateTime: nowIso,
          channel: formData.channels.includes('whatsapp') ? 'whatsapp' : (formData.channels.includes('email') ? 'email' : 'app'),
          author: owner?.fullName || 'Antonio Crapanzano',
          subject: formData.title,
          summary: formData.message.slice(0, 120),
          outcome: 'delivered',
          messageText: formData.message,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      });
      saveCommsToStorage(newComms);

      // Inserisce le notifiche in-app su database per gli atleti
      if (formData.channels.includes('in_app')) {
        const notifs = resolvedRecipients.map(r => {
          const ath = athletes.find(a => a.id === r.id);
          const targetUserId = ath?.auth_user_id || ath?.id || r.id;
          return {
            recipient_user_id: targetUserId,
            athlete_id: r.id,
            athlete_name: r.fullName,
            type: 'coach_message',
            priority: formData.type === 'important_alert' ? 'urgent' : 'normal',
            title: formData.title,
            body: formData.message,
            action_url: '/atleta_portale',
            channel_in_app: true,
            channel_push: false,
            metadata: { broadcastId: newBroadcast.id, type: formData.type },
          };
        });

        if (notifs.length > 0) {
          supabase.from('notifications').insert(notifs).then(({ error }) => {
            if (error) console.warn('Notifiche DB in-app:', error);
          });
        }
      }

      // Trasmette evento broadcast in Realtime a tutti i client / finestre
      try {
        supabase.channel('realtime:broadcasts_sync').send({
          type: 'broadcast',
          event: 'sync_broadcast',
          payload: newBroadcast,
        });
      } catch (_) {}
    }

    return newBroadcast;
  }, [broadcasts, communications, resolveRecipients, saveBroadcastsToStorage, saveCommsToStorage, addTimelineEvent, athletes]);

  // Aggiorna un broadcast con sincronizzazione completa e immediata
  const updateBroadcast = useCallback((id: string, updates: Partial<BroadcastCommunication>): boolean => {
    const nowIso = new Date().toISOString();
    let found = false;

    const normTitle = (t?: string) =>
      t ? t.replace(/^broadcast:\s*/i, '').replace(/^comunicazione:\s*/i, '').trim().toLowerCase() : '';
    const normUpdateTitle = normTitle(updates.title);

    const updated = broadcasts.map(b => {
      const matchId = b.id === id;
      const matchTitle = Boolean(normUpdateTitle && normTitle(b.title) === normUpdateTitle);
      if (matchId || matchTitle) {
        found = true;
        return { ...b, ...updates, id: b.id, updatedAt: nowIso };
      }
      return b;
    });

    let finalBroadcasts = updated;
    if (!found && updates.title) {
      const newBc: BroadcastCommunication = {
        id,
        title: updates.title,
        type: updates.type || 'update',
        status: updates.status || 'sent',
        sentAt: updates.sentAt || nowIso,
        audienceFilter: updates.audienceFilter || { type: 'all_active' },
        totalRecipientsCount: 30,
        channels: updates.channels || ['in_app'],
        message: updates.message || '',
        attachments: updates.attachments || [],
        cta: updates.cta,
        metrics: { sent: 30, delivered: 30, read: 0, clicked: 0, confirmed: 0, replied: 0 },
        recipients: [],
        author: 'Coach Antonio Crapanzano',
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      finalBroadcasts = [newBc, ...broadcasts];
    }

    saveBroadcastsToStorage(finalBroadcasts);

    const targetTitle = updates.title || '';
    const targetMessage = updates.message || '';

    // 1. Sincronizzazione immediata della timeline in memoria per tutti gli atleti
    if (targetTitle || targetMessage) {
      updateTimelineForBroadcast(targetTitle, targetMessage, id);
    }

    // 2. Sincronizzazione log comunicazioni
    if (targetMessage || targetTitle) {
      const updatedComms = communications.map(c => {
        const matchLog = c.id.includes(id) || (normUpdateTitle && normTitle(c.subject) === normUpdateTitle);
        if (matchLog) {
          return {
            ...c,
            subject: targetTitle || c.subject,
            messageText: targetMessage || c.messageText,
            summary: (targetMessage || c.messageText || '').slice(0, 120),
            updatedAt: nowIso,
          };
        }
        return c;
      });
      saveCommsToStorage(updatedComms);
    }

    // 3. Sincronizzazione persistente su Supabase (athlete_timeline & notifications)
    if (targetMessage || targetTitle) {
      supabase
        .from('athlete_timeline')
        .update({
          description: targetMessage,
          metadata: {
            broadcastId: id,
            broadcastType: updates.type || 'update',
            message: targetMessage,
          }
        })
        .eq('type', 'communication')
        .then(({ error }) => {
          if (error) console.warn('Supabase timeline sync:', error);
        });

      supabase
        .from('notifications')
        .update({
          body: targetMessage,
        })
        .eq('type', 'coach_message')
        .then(({ error }) => {
          if (error) console.warn('Supabase notifications sync:', error);
        });
    }

    return true;
  }, [broadcasts, communications, saveBroadcastsToStorage, saveCommsToStorage, updateTimelineForBroadcast]);

  // Elimina un broadcast
  const deleteBroadcast = useCallback((id: string): boolean => {
    const updated = broadcasts.filter(b => b.id !== id);
    if (updated.length !== broadcasts.length) {
      return saveBroadcastsToStorage(updated);
    }
    return false;
  }, [broadcasts, saveBroadcastsToStorage]);

  // Invia una bozza salvata
  const sendDraft = useCallback((id: string): boolean => {
    const nowIso = new Date().toISOString();
    const draft = broadcasts.find(b => b.id === id);
    if (!draft) return false;

    const resolvedRecipients = resolveRecipients(
      draft.audienceFilter.type,
      draft.audienceFilter.tag,
      draft.audienceFilter.selectedAthleteIds
    );

    const recipientEntries: RecipientDeliveryStatus[] = resolvedRecipients.map(r => ({
      athleteId: r.id,
      athleteName: r.fullName,
      email: r.email,
      phone: r.phone,
      avatarUrl: r.avatarUrl,
      status: 'delivered',
      deliveredAt: nowIso,
      channels: draft.channels,
    }));

    const updated = broadcasts.map(b => {
      if (b.id === id) {
        return {
          ...b,
          status: 'sent' as const,
          sentAt: nowIso,
          totalRecipientsCount: resolvedRecipients.length,
          recipients: recipientEntries,
          metrics: {
            ...b.metrics,
            sent: resolvedRecipients.length,
            delivered: resolvedRecipients.length,
          },
          updatedAt: nowIso,
        };
      }
      return b;
    });

    return saveBroadcastsToStorage(updated);
  }, [broadcasts, resolveRecipients, saveBroadcastsToStorage]);

  // Registra visualizzazione/lettura da parte di un atleta
  const markRecipientRead = useCallback((broadcastId: string, athleteId: string) => {
    if (!broadcastId || !athleteId) return;
    const nowIso = new Date().toISOString();
    let hasChanged = false;

    const updated = broadcasts.map(b => {
      if (b.id === broadcastId) {
        let foundRecipient = false;
        let recipients = (b.recipients || []).map(r => {
          if (r.athleteId === athleteId || r.athleteName?.toLowerCase() === athleteId.toLowerCase()) {
            foundRecipient = true;
            if (r.status === 'delivered') {
              hasChanged = true;
              return { ...r, status: 'read' as const, readAt: r.readAt || nowIso };
            }
          }
          return r;
        });

        if (!foundRecipient) {
          hasChanged = true;
          recipients = [
            ...recipients,
            {
              athleteId,
              athleteName: athleteId,
              status: 'read',
              readAt: nowIso,
              deliveredAt: nowIso,
              channels: b.channels || ['in_app'],
            }
          ];
        }

        const confirmedCount = recipients.filter(r => r.status === 'confirmed').length;
        const readCount = recipients.filter(r => r.status === 'read' || r.status === 'confirmed').length;
        return {
          ...b,
          recipients,
          metrics: { ...b.metrics, confirmed: confirmedCount, read: readCount },
          updatedAt: hasChanged ? nowIso : b.updatedAt,
        };
      }
      return b;
    });

    if (hasChanged) {
      saveBroadcastsToStorage(updated);
      try {
        supabase.channel('realtime:broadcasts_sync').send({
          type: 'broadcast',
          event: 'sync_read',
          payload: { broadcastId, athleteId, readAt: nowIso },
        });
      } catch (_) {}
    }
  }, [broadcasts, saveBroadcastsToStorage]);

  // Conferma lettura da parte di un atleta
  const confirmRecipientRead = useCallback((broadcastId: string, athleteId: string) => {
    if (!broadcastId || !athleteId) return;
    const nowIso = new Date().toISOString();

    const updated = broadcasts.map(b => {
      if (b.id === broadcastId) {
        let foundRecipient = false;
        let recipients = (b.recipients || []).map(r => {
          if (r.athleteId === athleteId || r.athleteName?.toLowerCase() === athleteId.toLowerCase()) {
            foundRecipient = true;
            return { ...r, status: 'confirmed' as const, confirmedAt: nowIso, readAt: r.readAt || nowIso };
          }
          return r;
        });

        if (!foundRecipient) {
          recipients = [
            ...recipients,
            {
              athleteId,
              athleteName: athleteId,
              status: 'confirmed',
              confirmedAt: nowIso,
              readAt: nowIso,
              deliveredAt: nowIso,
              channels: b.channels || ['in_app'],
            }
          ];
        }

        const confirmedCount = recipients.filter(r => r.status === 'confirmed').length;
        const readCount = recipients.filter(r => r.status === 'read' || r.status === 'confirmed').length;
        return {
          ...b,
          recipients,
          metrics: { ...b.metrics, confirmed: confirmedCount, read: readCount },
          updatedAt: nowIso,
        };
      }
      return b;
    });

    saveBroadcastsToStorage(updated);
    try {
      supabase.channel('realtime:broadcasts_sync').send({
        type: 'broadcast',
        event: 'sync_confirm',
        payload: { broadcastId, athleteId, confirmedAt: nowIso },
      });
    } catch (_) {}
  }, [broadcasts, saveBroadcastsToStorage]);

  // Registra click CTA da parte di un atleta
  const recordRecipientClick = useCallback((broadcastId: string, athleteId: string) => {
    const nowIso = new Date().toISOString();
    const updated = broadcasts.map(b => {
      if (b.id === broadcastId) {
        const recipients = b.recipients.map(r => {
          if (r.athleteId === athleteId) {
            return { ...r, clickedAt: nowIso, readAt: r.readAt || nowIso };
          }
          return r;
        });
        const clickedCount = recipients.filter(r => Boolean(r.clickedAt)).length;
        return {
          ...b,
          recipients,
          metrics: { ...b.metrics, clicked: clickedCount },
          updatedAt: nowIso,
        };
      }
      return b;
    });
    saveBroadcastsToStorage(updated);
  }, [broadcasts, saveBroadcastsToStorage]);

  // Registra risposta atleta
  const recordRecipientReply = useCallback((broadcastId: string, athleteId: string, replyText: string) => {
    const nowIso = new Date().toISOString();
    const updated = broadcasts.map(b => {
      if (b.id === broadcastId) {
        const recipients = b.recipients.map(r => {
          if (r.athleteId === athleteId) {
            return { ...r, status: 'replied' as const, repliedAt: nowIso, replyText };
          }
          return r;
        });
        const repliedCount = recipients.filter(r => r.status === 'replied').length;
        return {
          ...b,
          recipients,
          metrics: { ...b.metrics, replied: repliedCount },
          updatedAt: nowIso,
        };
      }
      return b;
    });
    saveBroadcastsToStorage(updated);
  }, [broadcasts, saveBroadcastsToStorage]);

  // Gestione Modelli Rapidi
  const saveQuickTemplate = useCallback((tplData: Omit<QuickMessageTemplate, 'id' | 'createdAt'> & { id?: string }): QuickMessageTemplate => {
    const nowIso = new Date().toISOString();
    if (tplData.id) {
      const updated = quickTemplates.map(t => t.id === tplData.id ? { ...t, ...tplData } : t);
      saveQuickTplsToStorage(updated);
      return updated.find(t => t.id === tplData.id)!;
    }

    const newTpl: QuickMessageTemplate = {
      ...tplData,
      id: `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: nowIso,
      isSystem: false,
    };

    const updated = [newTpl, ...quickTemplates];
    saveQuickTplsToStorage(updated);
    return newTpl;
  }, [quickTemplates, saveQuickTplsToStorage]);

  const deleteQuickTemplate = useCallback((id: string): boolean => {
    const updated = quickTemplates.filter(t => t.id !== id);
    if (updated.length !== quickTemplates.length) {
      return saveQuickTplsToStorage(updated);
    }
    return false;
  }, [quickTemplates, saveQuickTplsToStorage]);

  // Impostazioni Canali
  const saveChannelSettings = useCallback((settings: ChannelSettingsConfig): boolean => {
    try {
      setStorageItem(STORAGE_KEYS.CHANNEL_SETTINGS, settings);
      setChannelSettings(settings);
      return true;
    } catch (err) {
      console.error('Errore salvataggio impostazioni canali:', err);
      return false;
    }
  }, []);

  // Liste filtrate
  const drafts = useMemo(() => broadcasts.filter(b => b.status === 'draft'), [broadcasts]);
  const sentBroadcasts = useMemo(() => broadcasts.filter(b => b.status !== 'draft'), [broadcasts]);

  // Legacy Methods per retrocompatibilità
  const logCommunication = useCallback((data: CommunicationLogFormData): CommunicationLog => {
    const nowIso = new Date().toISOString();
    const owner = getLocalOwnerProfile();

    const newLog: CommunicationLog = {
      ...data,
      id: `comm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      author: data.author || owner?.fullName || 'Coach',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const updated = [newLog, ...communications];
    saveCommsToStorage(updated);

    if (newLog.athleteId) {
      addTimelineEvent(
        newLog.athleteId,
        'communication',
        `Contatto (${newLog.channel.toUpperCase()})`,
        `${newLog.subject} - Esito: ${newLog.outcome}`
      );
    }

    return newLog;
  }, [communications, saveCommsToStorage, addTimelineEvent]);

  const updateCommunication = useCallback((id: string, updates: Partial<CommunicationLog>): boolean => {
    const nowIso = new Date().toISOString();
    let found = false;

    const updated = communications.map(c => {
      if (c.id === id) {
        found = true;
        return { ...c, ...updates, updatedAt: nowIso };
      }
      return c;
    });

    if (found) return saveCommsToStorage(updated);
    return false;
  }, [communications, saveCommsToStorage]);

  const deleteCommunication = useCallback((id: string): boolean => {
    const updated = communications.filter(c => c.id !== id);
    if (updated.length !== communications.length) {
      return saveCommsToStorage(updated);
    }
    return false;
  }, [communications, saveCommsToStorage]);

  const saveTemplate = useCallback((tplData: Omit<MessageTemplate, 'id' | 'createdAt'> & { id?: string }): MessageTemplate => {
    const nowIso = new Date().toISOString();
    if (tplData.id) {
      const updated = templates.map(t => t.id === tplData.id ? { ...t, ...tplData } : t);
      setTemplates(updated);
      return updated.find(t => t.id === tplData.id)!;
    }

    const newTpl: MessageTemplate = {
      ...tplData,
      id: `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: nowIso,
    };
    setTemplates([newTpl, ...templates]);
    return newTpl;
  }, [templates]);

  const deleteTemplate = useCallback((id: string): boolean => {
    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated);
    return true;
  }, [templates]);

  const saveApiConfig = useCallback((config: ApiIntegrationConfig): boolean => {
    setApiConfig(config);
    return true;
  }, []);

  const compileTemplate = useCallback((templateBody: string, variables: Record<string, string>): string => {
    let compiled = templateBody;
    const owner = getLocalOwnerProfile();
    const defaultVars: Record<string, string> = {
      nome_proprietario: owner?.fullName || 'Antonio Crapanzano',
      ...variables,
    };

    Object.entries(defaultVars).forEach(([key, val]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
      compiled = compiled.replace(regex, val || '');
    });

    return compiled;
  }, []);

  const openWhatsApp = useCallback((phone: string, text: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const encodedText = encodeURIComponent(text);
    const targetUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodedText}`
      : `https://api.whatsapp.com/send?text=${encodedText}`;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  }, []);

  const openTelegram = useCallback((text: string) => {
    const encodedText = encodeURIComponent(text);
    const targetUrl = `https://t.me/share/url?url=&text=${encodedText}`;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  }, []);

  const openMailto = useCallback((email: string, subject: string, body: string) => {
    const mailtoUrl = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  }, []);

  return (
    <CommunicationsContext.Provider
      value={{
        broadcasts,
        drafts,
        sentBroadcasts,
        quickTemplates,
        channelSettings,
        isLoading,
        createBroadcast,
        updateBroadcast,
        deleteBroadcast,
        sendDraft,
        saveQuickTemplate,
        deleteQuickTemplate,
        saveChannelSettings,
        resolveRecipients,
        markRecipientRead,
        confirmRecipientRead,
        recordRecipientClick,
        recordRecipientReply,
        communications,
        templates,
        apiConfig,
        logCommunication,
        updateCommunication,
        deleteCommunication,
        saveTemplate,
        deleteTemplate,
        saveApiConfig,
        compileTemplate,
        openWhatsApp,
        openTelegram,
        openMailto,
      }}
    >
      {children}
    </CommunicationsContext.Provider>
  );
};

export const useCommunications = (): CommunicationsContextType => {
  const ctx = useContext(CommunicationsContext);
  if (!ctx) {
    throw new Error('useCommunications deve essere usato all\'interno di un CommunicationsProvider');
  }
  return ctx;
};
