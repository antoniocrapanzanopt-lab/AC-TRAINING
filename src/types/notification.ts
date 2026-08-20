export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';

export type NotificationType =
  | 'checkin_submitted'
  | 'checkin_alert'
  | 'checkin_expired'
  | 'pain_reported'
  | 'workout_completed'
  | 'penultimate_week'
  | 'program_renewal_required'
  | 'adherence_low'
  | 'stall_detected'
  | 'new_pr'
  | 'message_received'
  | 'questionnaire_submitted'
  | 'security_login'
  | 'security_mfa_failed';

export type PushStatus =
  | 'not_requested'
  | 'pending'
  | 'sent'
  | 'failed'
  | 'skipped_quiet_hours'
  | 'skipped_opt_out';

export interface AppNotification {
  id: string;
  recipient_user_id: string;
  organization_id?: string | null;
  athlete_id?: string | null;
  athlete_name?: string | null;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  body: string;
  action_url?: string | null;
  metadata: Record<string, unknown>;
  channel_in_app: boolean;
  channel_push: boolean;
  push_status: PushStatus;
  read_at: string | null;
  created_at: string;
  expires_at?: string | null;
  dedupe_key?: string | null;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  push_enabled: boolean;
  notify_high: boolean;
  notify_critical: boolean;
  quiet_hours_start: string | null; // HH:mm format, e.g. "22:00"
  quiet_hours_end: string | null;   // HH:mm format, e.g. "07:00"
  timezone: string;
  categories_opt_out: string[];
  updated_at: string;
}

export interface PushSubscriptionRecord {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent?: string | null;
  created_at: string;
  last_used_at?: string | null;
}

export interface NotificationFilterOptions {
  status: 'all' | 'unread' | 'read';
  priority?: NotificationPriority | 'all' | 'urgent'; // urgent = high + critical
  category?: 'all' | 'checkin' | 'workout' | 'program' | 'security' | 'trophies' | 'messages';
  athleteId?: string | 'all';
  searchQuery?: string;
  dateRange?: {
    startDate?: string;
    endDate?: string;
  };
}
