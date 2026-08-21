// ─── Tipi per il Sistema di Comunicazioni Broadcast & Contenuti ───────────

export type BroadcastType = 
  | 'update'          // Aggiornamento
  | 'content_video'   // Video / Contenuto
  | 'important_alert' // Avviso importante
  | 'reminder'        // Promemoria
  | 'group_message'   // Messaggio a gruppo
  | 'single_message'; // Messaggio singolo

export type AudienceFilterType =
  | 'all_active'       // Tutti gli atleti attivi
  | 'trial'            // Atleti in prova
  | 'active_program'   // Atleti con programma attivo
  | 'pending_start'    // Atleti da avviare
  | 'tag'              // Gruppo / Tag
  | 'manual';          // Selezione manuale

export type CommunicationStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';

export type CommunicationChannelType = 'in_app' | 'email' | 'whatsapp';

export type CtaType = 'none' | 'video' | 'guide' | 'confirm_read' | 'survey' | 'custom';

export interface CommunicationAttachment {
  id: string;
  type: 'video' | 'document' | 'image' | 'link';
  url: string;
  title: string;
  size?: string;
}

export interface CommunicationCta {
  type: CtaType;
  label: string;
  url?: string;
  requireConfirmation?: boolean;
}

export type RecipientDeliveryStatusType = 
  | 'pending'
  | 'delivered'
  | 'read'
  | 'clicked'
  | 'confirmed'
  | 'replied'
  | 'failed';

export interface RecipientDeliveryStatus {
  athleteId: string;
  athleteName: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  status: RecipientDeliveryStatusType;
  deliveredAt?: string;
  readAt?: string;
  clickedAt?: string;
  confirmedAt?: string;
  repliedAt?: string;
  replyText?: string;
  channels: CommunicationChannelType[];
}

export interface BroadcastCommunication {
  id: string;
  title: string;
  type: BroadcastType;
  status: CommunicationStatus;
  scheduledFor?: string; // ISO String se programmato
  sentAt?: string;        // ISO String quando inviato
  audienceFilter: {
    type: AudienceFilterType;
    tag?: string;
    selectedAthleteIds?: string[];
  };
  totalRecipientsCount: number;
  channels: CommunicationChannelType[];
  message: string;
  attachments: CommunicationAttachment[];
  cta?: CommunicationCta;
  metrics: {
    sent: number;
    delivered: number;
    read: number;
    clicked: number;
    confirmed: number;
    replied: number;
  };
  recipients: RecipientDeliveryStatus[];
  author: string;
  createdAt: string;
  updatedAt: string;
}

export interface BroadcastFormData {
  title: string;
  type: BroadcastType;
  audienceFilter: {
    type: AudienceFilterType;
    tag?: string;
    selectedAthleteIds?: string[];
  };
  channels: CommunicationChannelType[];
  message: string;
  attachments: CommunicationAttachment[];
  cta?: CommunicationCta;
  scheduledFor?: string;
}

export interface QuickMessageTemplate {
  id: string;
  title: string;
  category: string;
  type: BroadcastType;
  subject: string;
  body: string;
  suggestedCta?: CommunicationCta;
  suggestedChannels?: CommunicationChannelType[];
  createdAt: string;
  isSystem?: boolean;
}

export interface ChannelSettingsConfig {
  inAppEnabled: boolean;
  inAppSound: boolean;
  inAppPriority: 'high' | 'normal' | 'urgent';

  emailEnabled: boolean;
  emailSenderName: string;
  emailSenderAddress: string;
  emailSubjectPrefix: string;
  emailFooterText: string;
  emailSmtpHost?: string;

  whatsappEnabled: boolean;
  whatsappCoachNumber: string;
  whatsappCountryCode: string;
  whatsappAutoTextFormat: string;

  telegramEnabled: boolean;
  telegramBotToken?: string;
  telegramChannelId?: string;

  webhookEnabled: boolean;
  webhookUrl?: string;
  webhookSecret?: string;
}
