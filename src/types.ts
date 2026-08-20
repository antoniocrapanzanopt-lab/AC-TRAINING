export type NavigationTab =
  | 'dashboard'
  | 'atleti'
  | 'pacchetti'
  | 'abbonamenti'
  | 'pagamenti'
  | 'scadenze'
  | 'rinnovi'
  | 'attivita'
  | 'calendario'
  | 'documenti'
  | 'comunicazioni'
  | 'report'
  | 'collaboratori'
  | 'impostazioni'
  | 'atleta_portale'
  | 'schede'
  | 'progressioni'
  | 'cronologia_allenamenti'
  | 'copilot'
  | 'esercizi'
  | 'fabbisogno'
  | 'messaggi'
  | 'analisi_report'
  | 'notifiche';

export * from './types/progression';
export * from './types/notification';

export type UserRole = 'owner' | 'admin' | 'coach' | 'receptionist' | 'athlete' | 'collaborator';

export interface UserProfile {
  id: string;
  athleteId?: string;
  name: string;
  email: string;
  role: UserRole;
  canViewFinancials: boolean;
  avatarUrl?: string;
  hasSeenDisclaimer?: boolean;
}

export interface Organization {
  id: string;
  name: string;
  code: string;
  createdAt: string;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  fullName: string;
  email: string;
  role: UserRole;
  canViewFinancials: boolean;
  status: 'active' | 'pending' | 'inactive';
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  timestamp: number;
}

export interface LocalOwnerProfile {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  organizationName: string;
  role: 'owner';
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  businessName: string;
  ownerName: string;
  ownerEmail: string;
  updatedAt: string;
}

// ─── Tipi per la gestione degli Atleti ────────────────────────────────────────

export type AthleteGender =
  | 'male'              // Uomo
  | 'female'            // Donna
  | 'other'             // Altro
  | 'prefer_not_to_say'; // Preferisce non indicare

export type AthleteStatus =
  | 'active'      // Abbonamento attivo
  | 'inactive'    // Non attivo
  | 'suspended'   // Sospeso temporaneamente
  | 'archived'    // Archiviato
  | 'trial';      // Periodo di prova

export type AthletePaymentStatus =
  | 'regular'     // Pagamenti in regola
  | 'expiring'    // Scadenza imminente
  | 'overdue'     // Pagamento scaduto
  | 'suspended'   // Pagamenti sospesi
  | 'none';       // Nessun abbonamento attivo

export type ContactChannel =
  | 'whatsapp'
  | 'email'
  | 'telegram'
  | 'phone'
  | 'instagram'
  | 'other';

export type AcquisitionSource =
  | 'referral'      // Passaparola
  | 'social'        // Social media
  | 'website'       // Sito web
  | 'direct'        // Contatto diretto
  | 'event'         // Evento o fiera
  | 'advertising'   // Pubblicità
  | 'other';

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export type NoteCategory =
  | 'general'       // Nota generale
  | 'training'      // Allenamento
  | 'medical'       // Medico/Fisico (generico, senza dati sanitari reali)
  | 'payment'       // Pagamento
  | 'goal'          // Obiettivo
  | 'behaviour'     // Comportamento
  | 'other';        // Altro

export type NoteVisibility = 'private' | 'coach' | 'all';

export interface AthleteNote {
  id: string;
  athleteId: string;
  content: string;
  category: NoteCategory;
  visibility: NoteVisibility;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  isPinned: boolean;
}

export interface TimelineEvent {
  id: string;
  athleteId: string;
  type:
    | 'joined'
    | 'subscription_created'
    | 'subscription_renewed'
    | 'subscription_expired'
    | 'payment_received'
    | 'payment_overdue'
    | 'note_added'
    | 'status_changed'
    | 'coach_assigned'
    | 'document_uploaded'
    | 'message_sent'
    | 'communication'
    | 'goal_set'
    | 'goal_achieved'
    | 'other';
  title: string;
  description?: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface Athlete {
  id: string;
  auth_user_id?: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  gender?: AthleteGender;
  fiscalCode?: string;
  address?: string;
  city?: string;
  province?: string;
  status: AthleteStatus;
  paymentStatus: AthletePaymentStatus;
  assignedCoachId: string;
  assignedCoachName: string;
  assignedCoachIds?: string[];
  contactChannel: ContactChannel;
  acquisitionSource: AcquisitionSource;
  emergencyContact?: EmergencyContact;
  notes?: string;
  tags?: string[];
  goals?: string;
  medicalNotes?: string;
  medicalCertificateExpiryDate?: string;
  medicalCertificateUrl?: string;
  medicalCertificateType?: 'agonistico' | 'non_agonistico';
  telegramUsername?: string;
  privacyConsent: boolean;
  privacyConsentDate?: string;
  newsletterConsent: boolean;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AthleteFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  gender?: AthleteGender;
  fiscalCode?: string;
  address?: string;
  city?: string;
  province?: string;
  status: AthleteStatus;
  paymentStatus: AthletePaymentStatus;
  assignedCoachId: string;
  assignedCoachName: string;
  assignedCoachIds?: string[];
  contactChannel: ContactChannel;
  acquisitionSource: AcquisitionSource;
  emergencyContact?: EmergencyContact;
  notes?: string;
  tags?: string[];
  goals?: string;
  medicalNotes?: string;
  medicalCertificateExpiryDate?: string;
  medicalCertificateUrl?: string;
  medicalCertificateType?: 'agonistico' | 'non_agonistico';
  telegramUsername?: string;
  privacyConsent: boolean;
  newsletterConsent: boolean;
}

export interface AthleteActivity {
  id: string;
  athleteId: string;
  athleteName: string;
  title: string;
  description?: string;
  dueDate: string;
  status: 'pending' | 'completed' | 'cancelled' | 'overdue';
  category?: 'training' | 'assessment' | 'call' | 'administrative' | 'other';
  createdAt: string;
}

// ─── Tipi per la gestione dei Pacchetti ───────────────────────────────────────

export type PackageDurationUnit = 'days' | 'weeks' | 'months' | 'years';
export type PaymentFrequency = 'single' | 'weekly' | 'monthly' | 'quarterly' | 'semiannual' | 'annual';
export type DiscountType = 'none' | 'percentage' | 'fixed';
export type RenewalType = 'manual' | 'automatic';

export interface PackageItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  duration: number;
  durationUnit: PackageDurationUnit;
  paymentFrequency: PaymentFrequency;
  installments: number; // numero di rate, 1 se pagamento unico
  setupFee?: number; // quota iniziale (es. iscrizione)
  includedServices: string[];
  renewalType: RenewalType;
  canBeSuspended: boolean;
  maxSuspensionDays?: number;
  discountType: DiscountType;
  discountValue?: number;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type PackageFormData = Omit<PackageItem, 'id' | 'createdAt' | 'updatedAt'>;

// ─── Tipi per la gestione degli Abbonamenti ───────────────────────────────────

export type SubscriptionStatus = 'active' | 'suspended' | 'cancelled' | 'expired';
export type InstallmentStatus = 'pending' | 'paid' | 'overdue';
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'direct_debit';

export interface SubscriptionInstallment {
  id: string;
  dueDate: string;
  amount: number;
  status: InstallmentStatus;
  paidDate?: string;
  paymentMethod?: PaymentMethod;
  suspendedUntil?: string;
}

export interface AthleteSubscription {
  id: string;
  athleteId: string;
  athleteName: string;
  packageId: string;
  packageName: string;
  
  startDate: string;
  endDate: string;
  
  listPrice: number; // Prezzo base del pacchetto
  discountType: DiscountType;
  discountValue: number;
  finalPrice: number; // Prezzo post sconto

  paymentFrequency: PaymentFrequency;
  installmentsCount: number;
  setupFee: number;
  
  installments: SubscriptionInstallment[];
  
  preferredPaymentMethod: PaymentMethod;
  renewalType: RenewalType;
  toleranceDays: number;
  
  status: SubscriptionStatus;
  notes?: string;
  
  createdAt: string;
  updatedAt: string;
  
  // Per sospensioni
  suspensionStartDate?: string;
  suspensionEndDate?: string;
}

export type SubscriptionFormData = Omit<AthleteSubscription, 'id' | 'createdAt' | 'updatedAt' | 'installments' | 'status' | 'suspensionStartDate' | 'suspensionEndDate'> & {
  firstInstallmentDate: string;
  // Manteniamo le rate nel form per permettere preview o personalizzazioni minime, ma calcolate
};

// ─── Tipi per la gestione dei Pagamenti ───────────────────────────────────────

export type PaymentRecordStatus = 'pending' | 'partial' | 'paid' | 'refunded' | 'cancelled';

export interface PaymentRecord {
  id: string;
  athleteId: string;
  athleteName: string;
  subscriptionId?: string;
  installmentId?: string;
  installmentNumber?: number; // Es. rata 1 di 12

  expectedAmount: number;
  paidAmount: number;
  refundedAmount: number;
  residualAmount: number; // calcolato: max(0, expectedAmount - paidAmount)

  dueDate: string;
  paymentDate?: string; // Data dell'ultimo versamento o saldo
  paidDate?: string; // Data effettivo saldo rata
  suspendedUntil?: string; // Data fino alla quale la rata non è considerata scaduta durante una pausa
  
  method?: PaymentMethod;
  status: PaymentRecordStatus;
  
  transactionReference?: string;
  receiptNumber?: string;
  invoiceNumber?: string;
  
  notes?: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export type FinancialAuditAction = 
  | 'creation'
  | 'amount_change'
  | 'partial_payment'
  | 'full_payment'
  | 'due_date_change'
  | 'status_change'
  | 'refund'
  | 'cancellation'
  | 'deletion';

export interface FinancialAuditLog {
  id: string;
  paymentRecordId: string;
  athleteId?: string;
  athleteName?: string;
  subscriptionId?: string;
  action: FinancialAuditAction;
  previousValue?: string | number | null;
  newValue?: string | number | null;
  amount?: number; // importo dell'operazione laddove rilevante
  description: string;
  authorId: string;
  authorName: string;
  timestamp: string;
}

// ─── Tipi per la gestione dei Rinnovi ─────────────────────────────────────────

export type RenewalStatus = 
  | 'to_contact'
  | 'contacted'
  | 'interested'
  | 'evaluating'
  | 'confirmed'
  | 'renewed'
  | 'not_renewed'
  | 'unreachable'
  | 'postponed';

export interface AthleteRenewal {
  id: string;
  athleteId: string;
  athleteName: string;
  currentSubscriptionId: string;
  packageId: string;
  packageName: string;
  price: number;
  coachName: string;
  endDate: string;
  paymentStatus: AthletePaymentStatus;
  lastCommunicationDate?: string;
  nextActionDate?: string;
  nextActionNotes?: string;
  managerId: string;
  managerName: string;
  status: RenewalStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type RenewalFormData = Omit<AthleteRenewal, 'id' | 'createdAt' | 'updatedAt'>;

// ─── Tipi per la gestione delle Pause Abbonamento ──────────────────────────────

export type PauseExpiryOption = 'extend' | 'unchanged';
export type PauseInstallmentsOption = 'active' | 'reschedule' | 'suspend';

export interface SubscriptionPause {
  id: string;
  subscriptionId: string;
  athleteId: string;
  athleteName: string;
  startDate: string;
  expectedEndDate: string;
  actualEndDate?: string;
  reason: string;
  authorizedBy: string;
  notes?: string;
  expiryOption: PauseExpiryOption;
  installmentsOption: PauseInstallmentsOption;
  createdAt: string;
  updatedAt: string;
}

// ─── Tipi per la gestione del Registro Attività / Task ────────────────────────

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
export type TaskCategory = 'training' | 'assessment' | 'call' | 'checkup' | 'administrative' | 'other';

export interface AthleteTask {
  id: string;
  title: string;
  description?: string;
  athleteId?: string;
  athleteName?: string;
  assigneeId: string;
  assigneeName: string;
  priority: TaskPriority;
  dueDate: string;
  dueTime?: string;
  status: TaskStatus;
  category: TaskCategory;
  reminder: boolean;
  reminderTime?: string;
  completedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type TaskFormData = Omit<AthleteTask, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'>;

// ─── Tipi per la gestione del Calendario Appuntamenti ed Eventi ────────────────

export type CalendarEventType =
  | 'payment'
  | 'renewal'
  | 'subscription_start'
  | 'subscription_end'
  | 'appointment'
  | 'checkin'
  | 'program_delivery'
  | 'medical_certificate'
  | 'document'
  | 'competition'
  | 'birthday'
  | 'google_calendar'
  | 'custom';

export type CalendarEventStatus = 'scheduled' | 'completed' | 'cancelled';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  type: CalendarEventType;
  date: string; // YYYY-MM-DD
  startTime?: string;
  endTime?: string;
  athleteId?: string;
  athleteName?: string;
  status: CalendarEventStatus;
  isSystemGenerated: boolean;
  isSystemEvent?: boolean; // Alias per compatibilità con eventi di sistema
  sourceId?: string;
  location?: string;
  notes?: string;
  googleEventId?: string;
  htmlLink?: string;
  googleCalendarEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export type CalendarEventFormData = Omit<CalendarEvent, 'id' | 'isSystemGenerated' | 'createdAt' | 'updatedAt'>;

// ─── Tipi per la gestione dei Documenti Atleta ────────────────────────────────

export type DocumentCategory = 
  | 'medical_certificate' 
  | 'identity' 
  | 'privacy_consent' 
  | 'contract' 
  | 'assessment_sheet' 
  | 'other';

export type DocumentVisibility = 'private' | 'shared_with_athlete';

export interface StoredFile {
  fileName: string;
  fileSize: number; // in byte
  fileType: string; // MIME type
  dataUrl: string; // Base64 data URL
}

export interface AthleteDocument {
  id: string;
  title: string;
  category: DocumentCategory;
  visibility: DocumentVisibility;
  athleteId: string;
  athleteName: string;
  expiryDate?: string; // YYYY-MM-DD
  file: StoredFile;
  notes?: string;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

export type AthleteDocumentFormData = Omit<AthleteDocument, 'id' | 'createdAt' | 'updatedAt'>;

// ─── Tipi per la gestione dei Consensi Atleta ──────────────────────────────────

export type ConsentType = 
  | 'privacy' 
  | 'marketing' 
  | 'health_data' 
  | 'photo_video' 
  | 'liability_waiver' 
  | 'other';

export type ConsentStatus = 'granted' | 'revoked' | 'pending' | 'expired';

export interface AthleteConsent {
  id: string;
  athleteId: string;
  athleteName: string;
  consentType: ConsentType;
  status: ConsentStatus;
  grantDate: string; // YYYY-MM-DD
  documentId?: string;
  documentTitle?: string;
  notes?: string;
  revocationDate?: string;
  revocationReason?: string;
  registeredBy: string;
  createdAt: string;
  updatedAt: string;
}

export type AthleteConsentFormData = Omit<AthleteConsent, 'id' | 'createdAt' | 'updatedAt'>;

// ─── Tipi per il Centro Comunicazioni ──────────────────────────────────────────

export type CommunicationChannel = 
  | 'whatsapp' 
  | 'telegram' 
  | 'email' 
  | 'phone' 
  | 'sms' 
  | 'meeting' 
  | 'app';

export type CommunicationOutcome = 
  | 'delivered' 
  | 'replied' 
  | 'no_answer' 
  | 'failed' 
  | 'scheduled';

export interface CommunicationLog {
  id: string;
  athleteId: string;
  athleteName: string;
  dateTime: string; // ISO String
  channel: CommunicationChannel;
  author: string;
  subject: string;
  summary: string;
  outcome: CommunicationOutcome;
  nextAction?: string;
  recontactDate?: string; // YYYY-MM-DD
  messageText?: string;
  createdAt: string;
  updatedAt: string;
}

export type CommunicationLogFormData = Omit<CommunicationLog, 'id' | 'createdAt' | 'updatedAt'>;

export interface MessageTemplate {
  id: string;
  title: string;
  category: string;
  subject: string;
  body: string; // contiene placeholder come {{nome_atleta}}, {{data_scadenza}}, {{importo}}, {{nome_attivita}}
  createdAt: string;
}

export interface ApiIntegrationConfig {
  whatsappEnabled: boolean;
  whatsappToken: string;
  telegramEnabled: boolean;
  telegramToken: string;
  smtpEnabled: boolean;
  smtpHost: string;
  smtpSender: string;
  webhookEnabled: boolean;
  webhookUrl: string;
  webhookSecret: string;
  notes?: string;
}

export interface SavedReportConfig {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  coachId: string;
  packageId: string;
  createdAt: string;
}

export interface OrganizationSettings {
  name: string;
  vatNumber: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logoUrl?: string;
}

export interface SystemAppearanceSettings {
  primaryColor: string;
  currency: string;
  timeZone: string;
  dateFormat: string;
}

export interface ReminderRuleSettings {
  certificateDaysBefore: number;
  subscriptionDaysBefore: number;
  installmentDaysBefore: number;
}

export interface SystemSettings {
  organization: OrganizationSettings;
  appearance: SystemAppearanceSettings;
  reminderRules: ReminderRuleSettings;
  paymentMethods: string[];
  activityCategories: string[];
  athleteTags: string[];
}

export interface GeneralAuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  section: string;
  action: string;
  description: string;
}

export * from './types/metrics';

// --- Theme & Appearance Types ---
export type ThemeMode = 'dark' | 'light' | 'system';

export interface ThemePreferences {
  mode: ThemeMode;
  accentColor: string;
  customAccentColor?: string;
  savedAt: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  accent: string;
  accentHover: string;
  accentActive: string;
  accentSoft: string;
  foreground: string; // '#000000' | '#ffffff'
  badgeBg: string;
}

export interface ColorContrastResult {
  ratio: number;
  score: 'AAA' | 'AA' | 'AA Large' | 'Fail';
  isAccessible: boolean;
  message: string;
}













// --- MFA Auth State ---
export interface MFAState {
  currentAAL: 'aal1' | 'aal2' | null;
  nextAAL: 'aal2' | null;
  hasVerifiedFactors: boolean;
  hasUnverifiedFactors: boolean;
  isLoading: boolean;
  error: string | null;
}

// --- Analisi & Report Temporal Models ---
export type TimeframeOption = 'weekly' | 'monthly' | 'bimonthly' | 'six_months' | 'yearly';
export type ReportTrend = 'positive' | 'stable' | 'negative' | 'neutral';
export type AthleteProgramStatus =
  | 'active'
  | 'inactive'
  | 'pending_start'
  | 'unassigned'
  | 'completed'
  | 'penultimate_week'
  | 'overdue';

export type ReportStrategicAction =
  | 'continue'
  | 'increase_stimulus'
  | 'reduce_fatigue'
  | 'deload'
  | 'rebalance_volume'
  | 'change_exercises'
  | 'contact_athlete'
  | 'assign_program';

export interface ComparisonMetricDelta {
  current: number;
  previous: number;
  deltaPercent: number; // +15.5% o -5.2%
  deltaRaw: number; // differenza assoluta
}

export interface MuscleGroupDistribution {
  group: string;
  groupName?: string;
  currentKg: number;
  previousKg: number;
  deltaPercent: number;
}

export interface KeyExerciseMetric {
  name: string;
  currentMaxKg: number;
  previousMaxKg: number;
  currentAvgKg: number;
  previousAvgKg: number;
  deltaPercent: number;
}

export interface TimelineReportEvent {
  id: string;
  dateFormatted: string;
  title: string;
  description: string;
  type: 'copilot' | 'deload' | 'pain' | 'pr' | 'note';
}

export interface DecisionPriorityItem {
  id: string;
  athleteId: string;
  athleteName: string;
  title: string;
  rationale: string;
  type: 'pain' | 'plateau' | 'penultimate_week' | 'unassigned';
  urgency: 'high' | 'medium' | 'low';
  ctaLabel: string;
  targetAction: 'copilot' | 'assign' | 'renew';
}

export interface AthleteReportSummary {
  athleteId: string;
  athleteName: string;
  athleteEmail?: string;
  avatarUrl?: string;
  workoutTitle: string;
  currentWeek: number;
  totalWeeks: number;
  blockProgressPercent: number;
  programStatus: AthleteProgramStatus;
  programStatusLabel: string;
  isPenultimateWeek: boolean;
  trend: ReportTrend;
  overallScore: number; // 0 - 100
  aiNarrativeSummary: string;
  
  // Singola decisione consigliata per card
  singleDecisionTitle: string;
  singleDecisionRationale: string;
  singleDecisionType: 'pain' | 'plateau' | 'penultimate_week' | 'unassigned' | 'overload' | 'stimulus' | 'maintain';
  singleDecisionCtaLabel: string;
  
  // Comparazioni Periodo Corrente vs Precedente
  attendance: ComparisonMetricDelta; // %
  completedSessions: ComparisonMetricDelta; // numero sessioni
  avgRpe: ComparisonMetricDelta; // RPE 1-10
  painReportsCount: ComparisonMetricDelta; // numero segnalazioni
  totalVolumeKg: ComparisonMetricDelta; // kg sollevati
  
  // Dettagli Esercizi & Distretti Muscolari
  keyExercises: KeyExerciseMetric[];
  muscleGroups: MuscleGroupDistribution[];
  
  // Eventi & Serie temporale per grafici
  timeSeriesData: {
    label: string;
    date: string;
    volumeKg: number;
    avgRpe: number;
    sessionsCount: number;
  }[];
  recentEvents: TimelineReportEvent[];
  
  // Direzione Consigliata
  whatIsWorking: string[];
  whatNeedsAttention: string[];
  recommendedAction: ReportStrategicAction;
  recommendedActionLabel: string;
  recommendedActionDescription: string;
}

export interface TeamOverviewReportData {
  timeframe: TimeframeOption;
  timeframeLabel: string;
  currentRangeLabel: string;
  previousRangeLabel: string;
  
  // Priorità di Oggi per il Coach (Max 3)
  todayPriorities: DecisionPriorityItem[];

  // KPI Globali Squadra
  avgTeamAttendance: ComparisonMetricDelta;
  totalTeamVolumeKg: ComparisonMetricDelta;
  totalAthletesCount: number;
  eligibleAthletesCount: number;
  unassignedAthletesCount: number;
  penultimateWeekAthletesCount: number;
  positiveAthletesCount: number;
  stableAthletesCount: number;
  negativeAthletesCount: number;
  activeAlertsCount: number;
  
  athletesReports: AthleteReportSummary[];
}

