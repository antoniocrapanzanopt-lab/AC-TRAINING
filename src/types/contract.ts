// ─── TYPES: TERMINI E CONDIZIONI DI UTILIZZO, LIBERATORIA & PATTO DI TESTIMONIANZA ────────

export interface ContractSection {
  title: string;
  content: string[];
  highlightNotes?: string[];
}

export interface ServiceTermsConfig {
  title: string;
  subtitle: string;
  effectiveYear: string;
  sections: ContractSection[];
  /** Clausole da approvare specificamente ai sensi degli artt. 1341–1342 c.c. */
  specificApprovalClauses: string[];
}

export interface HealthPrivacyConfig {
  title: string;
  /** Dichiarazione di idoneità fisica / certificato medico */
  healthDeclaration: string[];
  /** Informativa sintetica trattamento dati relativi alla salute (art. 9 GDPR) */
  privacySummary: string[];
}

export interface VideoReleaseConfig {
  title: string;
  scope: string;
  /** Uso interno: necessario all'erogazione del servizio (analisi tecnica) */
  internalUse: string;
  /** Canali di pubblicazione: soggetti a consenso facoltativo separato */
  allowedChannels: string[];
  rules: string[];
}

export interface TestimonialPactConfig {
  title: string;
  professional: {
    fullName: string;
    address: string;
    taxCode: string; // Codice Fiscale
    vatNumber: string; // P.IVA
    city: string;
  };
  interviewDetails: {
    platform: string;
    duration: string;
    format: string;
    technicalGuidelines: string;
  };
  bonusDescription: string;
  /** Trasparenza: indicazione del beneficio ricevuto nella testimonianza pubblicata */
  transparencyNote: string;
  distributionChannels: string[];
  legalNotes: string;
}

export interface ContractTemplatesConfig {
  version: string;
  updatedAt: string;
  serviceTerms: ServiceTermsConfig;
  healthPrivacy: HealthPrivacyConfig;
  videoRelease: VideoReleaseConfig;
  testimonialPact: TestimonialPactConfig;
}

/** Versione pubblicata (immutabile) presente su Supabase */
export interface PublishedContractTemplate {
  id: string;
  versionLabel: string;
  revision: number;
  content: ContractTemplatesConfig;
  contentHash: string;
  isActive: boolean;
  publishedAt: string;
}

export interface ContractConsents {
  /** Obbligatorio: termini e condizioni */
  serviceTerms: boolean;
  /** Obbligatorio: approvazione specifica clausole (artt. 1341–1342 c.c.) */
  specificClauses: boolean;
  /** Obbligatorio: dichiarazione idoneità / stato di salute */
  healthDeclaration: boolean;
  /** Obbligatorio: consenso trattamento dati sanitari (art. 9 GDPR) */
  healthData: boolean;
  /** Obbligatorio: riprese per analisi tecnica interna */
  videoInternal: boolean;
  /** Facoltativo: pubblicazione immagini/video sui canali divulgativi */
  videoPublic: boolean;
  /** Facoltativo: patto di testimonianza con bonus */
  testimonialPact: boolean;
}

export const REQUIRED_CONSENT_KEYS: ReadonlyArray<keyof ContractConsents> = [
  'serviceTerms',
  'specificClauses',
  'healthDeclaration',
  'healthData',
  'videoInternal',
];

export interface AthleteSignedContract {
  id: string;
  athleteId: string;
  templateId: string;
  contractVersion: string;
  contractRevision: number;
  contentHash: string;
  athleteName: string;
  athleteFiscalCode?: string;
  athleteBirthDate?: string;
  athleteBirthPlace?: string;
  athleteAddress?: string;
  signedAt: string; // ISO String (timestamp server)
  signatureDataUrl: string; // Immagine firma PNG dal Canvas
  consents: ContractConsents;
  snapshot: ContractTemplatesConfig;
}

export interface AthleteContractStatus {
  activeTemplate: PublishedContractTemplate | null;
  latestSignature: AthleteSignedContract | null;
  /** true se esiste una versione attiva non ancora firmata dall'atleta */
  needsSignature: boolean;
}

export interface NewContractSignatureInput {
  athleteId: string;
  templateId: string;
  athleteName: string;
  athleteFiscalCode?: string;
  athleteBirthDate?: string;
  athleteBirthPlace?: string;
  athleteAddress?: string;
  signatureDataUrl: string;
  consents: ContractConsents;
}
