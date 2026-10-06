import { z } from 'zod';
import {
  ContractTemplatesConfig,
  AthleteSignedContract,
  AthleteContractStatus,
  ContractConsents,
  NewContractSignatureInput,
  PublishedContractTemplate,
  REQUIRED_CONSENT_KEYS,
} from '../types/contract';
import { supabase } from '../lib/supabase';

// ─── TESTO PREDEFINITO (BOZZA DA FAR REVISIONARE A UN LEGALE) ───────────────────────────
// Viene usato SOLO come punto di partenza nell'editor del coach. Agli atleti viene
// mostrata esclusivamente la versione pubblicata su Supabase (tabella contract_templates).

export const getDefaultContractTemplates = (): ContractTemplatesConfig => ({
  version: '2026/2027',
  updatedAt: new Date().toISOString(),
  serviceTerms: {
    title: 'Termini e Condizioni di Utilizzo',
    subtitle: 'Percorso AC Personal Trainer & Coach 2026/2027',
    effectiveYear: '2026/2027',
    sections: [
      {
        title: '1. OGGETTO DEL SERVIZIO',
        content: [
          'Il Professionista fornisce al Cliente un servizio di personal training e coaching personalizzato, in presenza e/o da remoto, secondo il piano sottoscritto. Il servizio comprende:',
          '• Programmazione dell’allenamento personalizzata e relativi aggiornamenti periodici;',
          '• Monitoraggio dei progressi tramite la piattaforma AC (check-in, feedback, metriche);',
          '• Supporto tecnico e correzione dell’esecuzione degli esercizi;',
          '• Eventuali sedute in presenza secondo il pacchetto acquistato.',
          'Durata, frequenza degli aggiornamenti e numero di sedute sono quelli indicati nel piano scelto dal Cliente.',
        ],
      },
      {
        title: '2. NATURA DEL SERVIZIO E RISULTATI',
        content: [
          'Il servizio ha natura esclusivamente sportiva e motoria. Non costituisce in alcun modo prestazione medica, fisioterapica, diagnostica o terapeutica e non sostituisce il parere del medico.',
          'Eventuali indicazioni alimentari hanno carattere generale e di educazione a uno stile di vita sano; non costituiscono piani dietetici personalizzati, la cui elaborazione è riservata alle figure sanitarie abilitate (medico, biologo nutrizionista, dietista).',
          'Il Professionista si impegna a mettere a disposizione la massima competenza e diligenza (obbligazione di mezzi). I risultati dipendono da fattori individuali (costanza, alimentazione, riposo, condizioni di salute) e non possono essere garantiti.',
        ],
      },
      {
        title: '3. COMUNICAZIONE & SUPPORTO',
        content: [
          'La comunicazione quotidiana avviene principalmente tramite WhatsApp e la messaggistica dell’app AC per:',
          '• Chiarimenti su esercizi ed esecuzioni della scheda attiva;',
          '• Gestione tempestiva di imprevisti o cambi orario;',
          '• Fissare e confermare le sedute.',
        ],
        highlightNotes: [
          'Per garantirti risposte puntuali, veloci e sempre consultabili nello storico della chat, le comunicazioni avvengono tramite messaggio di testo o brevi punti elenco (evitando note vocali).',
          'Per imprevisti urgenti di seduta il riscontro è immediato; per dubbi tecnici o revisioni di programmazione, i tempi di risposta sono indicativamente di 24–48 ore lavorative (o approfonditi nel check periodico).',
        ],
      },
      {
        title: '4. APPUNTAMENTI E SEDUTE',
        content: [
          'Una volta concordato l’orario, è richiesto il massimo rispetto della puntualità per valorizzare il tempo di entrambi. È fortemente consigliato presentarsi 10–15 minuti prima per svolgere riscaldamento e mobilità guidata in autonomia.',
        ],
        highlightNotes: [
          'In caso di disdetta con preavviso inferiore a 24 ore, la seduta verrà comunque conteggiata/addebitata, salvo comprovate cause di forza maggiore.',
          'In caso di disdetta da parte del Professionista con preavviso inferiore a 24 ore, per qualunque motivo, il Cliente avrà diritto a una seduta aggiuntiva gratuita di recupero.',
        ],
      },
      {
        title: '5. CORRISPETTIVI, PAGAMENTI & FLESSIBILITÀ',
        content: [
          'Il corrispettivo, le modalità e le scadenze sono quelli concordati nel piano sottoscritto. Il pagamento è anticipato rispetto al periodo di allenamento di riferimento.',
          'In caso di ritardi nei pagamenti, il Professionista concorderà una regolarizzazione amichevole prima di un’eventuale sospensione temporanea del servizio.',
          'I pacchetti di sedute hanno una durata prestabilita per favorire costanza e risultati; le sedute non usufruite entro tale termine non sono rimborsabili.',
          'Tutela in caso di infortunio (Freeze): in caso di infortunio, malattia o impedimento temporaneo debitamente documentato, il percorso può essere congelato per un periodo concordato (fino a un massimo di 60 giorni), preservando le sedute e i servizi residui senza alcuna perdita economica.',
        ],
      },
      {
        title: '6. SALUTE E CONDIVISIONE TRASPARENTE',
        content: [
          'Il Cliente si impegna a consegnare un certificato medico di idoneità all’attività sportiva in corso di validità e a rinnovarlo alla naturale scadenza.',
          'La trasparenza è alla base della sicurezza: il Cliente si impegna a comunicare tempestivamente e in modo veritiero patologie, infortuni pregressi, terapie o variazioni del proprio stato fisico.',
          'In caso di dolore anomalo, fastidio o affaticamento insolito durante l’allenamento, il Cliente si impegna a interrompere l’esercizio e ad avvisare subito il Professionista.',
        ],
      },
      {
        title: '7. PROPRIETÀ INTELLETTUALE & MATERIALI',
        content: [
          'Programmi di allenamento, schede, video tutorial e materiali didattici forniti dal Professionista sono frutto del suo metodo di lavoro e concessi al Cliente per uso strettamente personale.',
          'È vietata la divulgazione pubblica, la cessione a terzi o la rivendita dei materiali senza preventiva autorizzazione scritta del Professionista.',
        ],
      },
      {
        title: '8. INTERRUZIONE DEL PERCORSO E RECESSO',
        content: [
          'La serenità della collaborazione viene prima di tutto: qualora il Cliente desideri interrompere il percorso, è richiesto un preavviso di 15 giorni per consentire la conclusione ordinata del mesociclo di lavoro.',
          'Le quote già versate relative al periodo in corso non sono rimborsabili, fatto salvo il diritto di ripensamento di 14 giorni per gli acquisti a distanza previsto dal Codice del Consumo (D.Lgs. 206/2005).',
          'Il Professionista può recedere solo in caso di gravi motivi o comportamenti lesivi del rispetto reciproco, con comunicazione scritta e conteggio delle sole prestazioni effettivamente erogate.',
        ],
      },
      {
        title: '9. RESPONSABILITÀ E LIMITI',
        content: [
          'Il Professionista risponde dei danni nei limiti di legge per l’attività svolta. Non risponde di infortuni o problematiche derivanti da informazioni sulla salute taciute o non veritiere, da mancato rispetto delle indicazioni tecniche o da carichi/esercizi svolti in autonomia in difformità dal programma concordato.',
          'Restano ferme in ogni caso le responsabilità inderogabili previste dalla legge per dolo o colpa grave (art. 1229 c.c.).',
        ],
      },
      {
        title: '10. AGGIORNAMENTI DEI TERMINI',
        content: [
          'I termini possono essere periodicamente aggiornati per migliorare l’efficienza del servizio. Ogni nuova versione verrà notificata tramite la piattaforma e diverrà valida solo previa conferma dell’atleta. In assenza di accordo, il Cliente potrà recedere liberamente alle condizioni originarie.',
        ],
      },
      {
        title: '11. LEGGE APPLICABILE E FORO',
        content: [
          'Il presente accordo è regolato dalla legge italiana. Per qualsiasi eventuale controversia è competente in via principale il foro di residenza o domicilio del Cliente consumatore, a garanzia della sua massima tutela.',
        ],
      },
    ],
    specificApprovalClauses: [
      'Art. 4 – Gestione delle sedute disdette con preavviso inferiore a 24 ore',
      'Art. 5 – Regolarizzazione pagamenti, scadenza pacchetti e facoltà di sospensione temporanea (Freeze)',
      'Art. 8 – Termini di interruzione del percorso e chiusura anticipata',
      'Art. 9 – Limitazioni di responsabilità ed esecuzioni in autonomia',
    ],
  },
  healthPrivacy: {
    title: 'Stato di Salute & Trattamento dei Dati Sanitari',
    healthDeclaration: [
      'Dichiaro di essere in possesso di certificato medico di idoneità all’attività sportiva in corso di validità (o di impegnarmi a consegnarlo prima dell’inizio del percorso).',
      'Dichiaro che le informazioni sul mio stato di salute fornite nel questionario iniziale sono veritiere e complete e mi impegno a comunicare tempestivamente ogni variazione.',
    ],
    privacySummary: [
      'Titolare del trattamento: Antonio Crapanzano, Via Guglielmo Mattioli 10/G, 24129 Bergamo (BG).',
      'Dati trattati: dati anagrafici e di contatto; dati relativi alla salute (anamnesi, infortuni, misure corporee, foto dei progressi, certificato medico) ai sensi dell’art. 9 GDPR.',
      'Finalità: erogazione e personalizzazione del servizio di allenamento e monitoraggio dei progressi.',
      'I dati sono conservati su infrastruttura cloud protetta (Supabase) con accesso riservato al Professionista, per la durata del rapporto e per il periodo necessario agli obblighi di legge.',
      'Puoi esercitare in qualsiasi momento i diritti di accesso, rettifica, cancellazione, limitazione, portabilità e revoca del consenso (artt. 15–22 GDPR) scrivendo al Professionista. Hai diritto di proporre reclamo al Garante Privacy.',
    ],
  },
  videoRelease: {
    title: 'Liberatoria Riprese Video & Foto',
    scope:
      'Autorizzazione alla registrazione e all’utilizzo di video e fotografie acquisiti durante il percorso di coaching (art. 10 c.c. e artt. 96–97 L. 633/1941).',
    internalUse:
      'Uso interno (necessario al servizio): analisi e correzione tecnica degli esercizi, archivio riservato accessibile solo al Professionista e al Cliente.',
    allowedChannels: [
      'Canali social professionali di AC Training (Instagram, TikTok, YouTube, Facebook);',
      'Sito web ufficiale e materiali divulgativi della piattaforma.',
    ],
    rules: [
      'Il consenso è prestato a titolo gratuito.',
      'Il materiale viene trattato nel pieno rispetto del decoro, dell’onore e della reputazione del Cliente.',
      'È vietata la cessione a terzi estranei all’attività del Professionista.',
      'Il Cliente può chiedere in qualunque momento l’oscuramento del volto o di dettagli identificativi.',
      'Il consenso alla pubblicazione è facoltativo e revocabile in qualsiasi momento: dopo la revoca non verranno pubblicati nuovi contenuti e quelli esistenti verranno rimossi dai canali gestiti dal Professionista entro 30 giorni.',
      'Per i Clienti minorenni il consenso deve essere prestato da chi esercita la responsabilità genitoriale.',
    ],
  },
  testimonialPact: {
    title: 'Patto di Testimonianza (Facoltativo)',
    professional: {
      fullName: 'Antonio Crapanzano',
      address: 'Via Guglielmo Mattioli 10/G, 24129 Bergamo (BG)',
      taxCode: 'CRPNTN95T08D960Z',
      vatNumber: '04647500166',
      city: 'Bergamo (BG)',
    },
    interviewDetails: {
      platform: 'Da remoto tramite videochiamata guidata (Zoom, Google Meet o equivalente).',
      duration: 'Indicativamente tra i 30 e i 45 minuti.',
      format:
        'Chiacchierata informale con domande mirate guidate dal coach; il Cliente non deve preparare discorsi a memoria né preoccuparsi della parte tecnica.',
      technicalGuidelines:
        'Prima della sessione verranno fornite brevi indicazioni pratiche per inquadratura, audio e illuminazione.',
    },
    bonusDescription:
      '1 sessione extra di coaching personalizzato / prolungamento del piano di allenamento.',
    transparencyNote:
      'Il rilascio della video-intervista è facoltativo e vissuto in piena serenità: l’atleta condivide genuinamente la propria esperienza, le sensazioni e i traguardi raggiunti, senza filtri o copioni preimpostati. Nella pubblicazione verrà segnalato in trasparenza il bonus di ringraziamento.',
    distributionChannels: [
      'Canali social network (es. Instagram, YouTube, TikTok, Facebook);',
      'Sito web ufficiale e landing page promozionali;',
      'Newsletter e comunicazioni dirette via email;',
      'Presentazioni e materiali informativi riservati.',
    ],
    legalNotes:
      'L’utilizzo del materiale ha finalità esclusivamente divulgative, informative e promozionali legate all’attività del Professionista, nel rispetto del decoro del Cliente. È fatto espresso divieto di cessione a terzi. L’adesione al patto è facoltativa e non condiziona in alcun modo l’erogazione del servizio.',
  },
});

// ─── VALIDAZIONE RUNTIME DEL CONTENUTO JSONB ────────────────────────────────────────────
// Garantisce che versioni pubblicate in passato (con meno campi) vengano lette in modo
// sicuro, completando i campi mancanti con i valori predefiniti.

const buildContentSchema = () => {
  const d = getDefaultContractTemplates();
  const stringList = z.array(z.string());

  return z.object({
    version: z.string().catch(d.version),
    updatedAt: z.string().catch(d.updatedAt),
    serviceTerms: z
      .object({
        title: z.string().catch(d.serviceTerms.title),
        subtitle: z.string().catch(d.serviceTerms.subtitle),
        effectiveYear: z.string().catch(d.serviceTerms.effectiveYear),
        sections: z
          .array(
            z.object({
              title: z.string(),
              content: stringList,
              highlightNotes: stringList.optional(),
            })
          )
          .catch(d.serviceTerms.sections),
        specificApprovalClauses: stringList.catch(d.serviceTerms.specificApprovalClauses),
      })
      .catch(d.serviceTerms),
    healthPrivacy: z
      .object({
        title: z.string().catch(d.healthPrivacy.title),
        healthDeclaration: stringList.catch(d.healthPrivacy.healthDeclaration),
        privacySummary: stringList.catch(d.healthPrivacy.privacySummary),
      })
      .catch(d.healthPrivacy),
    videoRelease: z
      .object({
        title: z.string().catch(d.videoRelease.title),
        scope: z.string().catch(d.videoRelease.scope),
        internalUse: z.string().catch(d.videoRelease.internalUse),
        allowedChannels: stringList.catch(d.videoRelease.allowedChannels),
        rules: stringList.catch(d.videoRelease.rules),
      })
      .catch(d.videoRelease),
    testimonialPact: z
      .object({
        title: z.string().catch(d.testimonialPact.title),
        professional: z
          .object({
            fullName: z.string(),
            address: z.string(),
            taxCode: z.string(),
            vatNumber: z.string(),
            city: z.string(),
          })
          .catch(d.testimonialPact.professional),
        interviewDetails: z
          .object({
            platform: z.string(),
            duration: z.string(),
            format: z.string(),
            technicalGuidelines: z.string(),
          })
          .catch(d.testimonialPact.interviewDetails),
        bonusDescription: z.string().catch(d.testimonialPact.bonusDescription),
        transparencyNote: z.string().catch(d.testimonialPact.transparencyNote),
        distributionChannels: stringList.catch(d.testimonialPact.distributionChannels),
        legalNotes: z.string().catch(d.testimonialPact.legalNotes),
      })
      .catch(d.testimonialPact),
  });
};

export const parseContractContent = (raw: unknown): ContractTemplatesConfig => {
  const result = buildContentSchema().safeParse(raw);
  return result.success ? result.data : getDefaultContractTemplates();
};

// ─── MAPPING RIGHE SUPABASE ─────────────────────────────────────────────────────────────

const templateRowSchema = z.object({
  id: z.string(),
  version_label: z.string(),
  revision: z.number(),
  content: z.unknown(),
  content_hash: z.string(),
  is_active: z.boolean(),
  published_at: z.string(),
});

const signatureRowSchema = z.object({
  id: z.string(),
  athlete_id: z.string(),
  template_id: z.string(),
  contract_version: z.string(),
  contract_revision: z.number(),
  content_snapshot: z.unknown(),
  content_hash: z.string(),
  signer_full_name: z.string(),
  signer_fiscal_code: z.string().nullable(),
  signer_birth_date: z.string().nullable(),
  signer_birth_place: z.string().nullable(),
  signer_address: z.string().nullable(),
  signature_image: z.string(),
  consent_service_terms: z.boolean(),
  consent_specific_clauses: z.boolean(),
  consent_health_declaration: z.boolean(),
  consent_health_data: z.boolean(),
  consent_video_internal: z.boolean(),
  consent_video_public: z.boolean(),
  consent_testimonial_pact: z.boolean(),
  signed_at: z.string(),
});

const SIGNATURE_COLUMNS =
  'id, athlete_id, template_id, contract_version, contract_revision, content_snapshot, content_hash, signer_full_name, signer_fiscal_code, signer_birth_date, signer_birth_place, signer_address, signature_image, consent_service_terms, consent_specific_clauses, consent_health_declaration, consent_health_data, consent_video_internal, consent_video_public, consent_testimonial_pact, signed_at';

const TEMPLATE_COLUMNS = 'id, version_label, revision, content, content_hash, is_active, published_at';

const mapTemplateRow = (raw: unknown): PublishedContractTemplate | null => {
  const parsed = templateRowSchema.safeParse(raw);
  if (!parsed.success) return null;
  const r = parsed.data;
  return {
    id: r.id,
    versionLabel: r.version_label,
    revision: r.revision,
    content: parseContractContent(r.content),
    contentHash: r.content_hash,
    isActive: r.is_active,
    publishedAt: r.published_at,
  };
};

const mapSignatureRow = (raw: unknown): AthleteSignedContract | null => {
  const parsed = signatureRowSchema.safeParse(raw);
  if (!parsed.success) return null;
  const r = parsed.data;
  return {
    id: r.id,
    athleteId: r.athlete_id,
    templateId: r.template_id,
    contractVersion: r.contract_version,
    contractRevision: r.contract_revision,
    contentHash: r.content_hash,
    athleteName: r.signer_full_name,
    athleteFiscalCode: r.signer_fiscal_code ?? undefined,
    athleteBirthDate: r.signer_birth_date ?? undefined,
    athleteBirthPlace: r.signer_birth_place ?? undefined,
    athleteAddress: r.signer_address ?? undefined,
    signedAt: r.signed_at,
    signatureDataUrl: r.signature_image,
    consents: {
      serviceTerms: r.consent_service_terms,
      specificClauses: r.consent_specific_clauses,
      healthDeclaration: r.consent_health_declaration,
      healthData: r.consent_health_data,
      videoInternal: r.consent_video_internal,
      videoPublic: r.consent_video_public,
      testimonialPact: r.consent_testimonial_pact,
    },
    snapshot: parseContractContent(r.content_snapshot),
  };
};

export const DEFAULT_ACTIVE_TEMPLATE_ID = '00000000-0000-0000-0000-000000000001';

export const getDefaultActiveTemplate = (): PublishedContractTemplate => {
  const defContent = getDefaultContractTemplates();
  return {
    id: DEFAULT_ACTIVE_TEMPLATE_ID,
    versionLabel: defContent.version,
    revision: 1,
    content: defContent,
    contentHash: 'ac-default-contract-2026-2027',
    isActive: true,
    publishedAt: new Date().toISOString(),
  };
};

/** Versione attualmente attiva (visibile ad atleti e coach, con fallback garantito). */
export const fetchActiveContractTemplate = async (): Promise<PublishedContractTemplate> => {
  try {
    const { data, error } = await supabase
      .from('contract_templates')
      .select(TEMPLATE_COLUMNS)
      .eq('is_active', true)
      .maybeSingle();

    if (!error && data) {
      const mapped = mapTemplateRow(data);
      if (mapped) return mapped;
    }
  } catch (err) {
    console.warn('[ContractService] Lettura template remoto non disponibile, uso predefinito:', err);
  }

  // Fallback garantito al modello predefinito ufficiale
  return getDefaultActiveTemplate();
};

/** Storico versioni pubblicate (solo coach AAL2). */
export const fetchContractTemplateHistory = async (): Promise<PublishedContractTemplate[]> => {
  try {
    const { data, error } = await supabase
      .from('contract_templates')
      .select(TEMPLATE_COLUMNS)
      .order('revision', { ascending: false });

    if (!error && data) {
      const mapped = (data ?? [])
        .map((row: unknown) => mapTemplateRow(row))
        .filter((t): t is PublishedContractTemplate => t !== null);
      if (mapped.length > 0) return mapped;
    }
  } catch (err) {
    console.warn('[ContractService] Lettura storico non disponibile:', err);
  }

  return [getDefaultActiveTemplate()];
};

/**
 * Pubblica una nuova versione (immutabile). Tutti gli atleti dovranno firmarla di nuovo.
 * Richiede sessione coach MFA (AAL2): verificato lato server dalla RPC.
 */
export const publishContractTemplate = async (
  config: ContractTemplatesConfig
): Promise<PublishedContractTemplate> => {
  const content: ContractTemplatesConfig = {
    ...config,
    updatedAt: new Date().toISOString(),
  };

  const { data, error } = await supabase.rpc('publish_contract_template', {
    p_version_label: content.version.trim() || content.serviceTerms.effectiveYear,
    p_content: content,
  });

  if (error) {
    console.warn('[ContractService] Pubblicazione versione non riuscita:', error.code);
    if (error.code === '42501') {
      throw new Error('Per pubblicare è necessaria la verifica MFA (2FA) attiva.');
    }
    throw new Error('Impossibile pubblicare la nuova versione del contratto.');
  }

  const mapped = mapTemplateRow(data);
  if (!mapped) {
    throw new Error('Risposta del server non valida dopo la pubblicazione.');
  }
  return mapped;
};

// ─── FIRME ATLETA ───────────────────────────────────────────────────────────────────────

/** Firma più recente dell'atleta (qualsiasi versione, con fallback). */
export const getAthleteSignedContract = async (
  athleteId: string
): Promise<AthleteSignedContract | null> => {
  if (!athleteId) return null;

  // 1. Prova dalla tabella dedicata athlete_contract_signatures
  try {
    const { data, error } = await supabase
      .from('athlete_contract_signatures')
      .select(SIGNATURE_COLUMNS)
      .eq('athlete_id', athleteId)
      .order('signed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      const mapped = mapSignatureRow(data);
      if (mapped) return mapped;
    }
  } catch {
    // fallback
  }

  // 2. Prova dalle risposte questionario di Supabase (persistenza legacy/onboarding)
  try {
    const { data: onb } = await supabase
      .from('athlete_onboarding_responses')
      .select('answers')
      .eq('athlete_id', athleteId)
      .maybeSingle();

    if (onb && onb.answers && typeof onb.answers === 'object') {
      const answersObj = onb.answers as Record<string, unknown>;
      if (answersObj.signedContract && typeof answersObj.signedContract === 'object') {
        const sc = answersObj.signedContract as Record<string, unknown>;
        const rawConsents = (sc.consents as Record<string, boolean>) || {};
        return {
          id: String(sc.id || `contract-${athleteId}`),
          athleteId: String(sc.athleteId || athleteId),
          templateId: String(sc.templateId || DEFAULT_ACTIVE_TEMPLATE_ID),
          contractVersion: String(sc.contractVersion || '2026/2027'),
          contractRevision: Number(sc.contractRevision || 1),
          contentHash: String(sc.contentHash || 'legacy'),
          athleteName: String(sc.athleteName || 'Atleta'),
          athleteFiscalCode: sc.athleteFiscalCode ? String(sc.athleteFiscalCode) : undefined,
          athleteBirthDate: sc.athleteBirthDate ? String(sc.athleteBirthDate) : undefined,
          athleteBirthPlace: sc.athleteBirthPlace ? String(sc.athleteBirthPlace) : undefined,
          athleteAddress: sc.athleteAddress ? String(sc.athleteAddress) : undefined,
          signedAt: String(sc.signedAt || new Date().toISOString()),
          signatureDataUrl: String(sc.signatureDataUrl || ''),
          consents: {
            serviceTerms: Boolean(rawConsents.serviceTerms ?? sc.serviceTermsAccepted ?? true),
            specificClauses: Boolean(rawConsents.specificClauses ?? true),
            healthDeclaration: Boolean(rawConsents.healthDeclaration ?? true),
            healthData: Boolean(rawConsents.healthData ?? true),
            videoInternal: Boolean(rawConsents.videoInternal ?? sc.videoReleaseAccepted ?? true),
            videoPublic: Boolean(rawConsents.videoPublic ?? false),
            testimonialPact: Boolean(rawConsents.testimonialPact ?? sc.testimonialPactAccepted ?? false),
          },
          snapshot: parseContractContent(sc.snapshot),
        };
      }
    }
  } catch {
    // fallback
  }

  // 3. Fallback cache locale (se precedentemente salvato in locale)
  try {
    const raw = localStorage.getItem(`ac_signed_contracts_v1_${athleteId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.signatureDataUrl || parsed.signatureImage)) {
        return {
          id: parsed.id || `contract-${athleteId}`,
          athleteId: parsed.athleteId || athleteId,
          templateId: parsed.templateId || DEFAULT_ACTIVE_TEMPLATE_ID,
          contractVersion: parsed.contractVersion || '2026/2027',
          contractRevision: parsed.contractRevision || 1,
          contentHash: parsed.contentHash || 'legacy',
          athleteName: parsed.athleteName || 'Atleta',
          athleteFiscalCode: parsed.athleteFiscalCode,
          athleteBirthDate: parsed.athleteBirthDate,
          athleteBirthPlace: parsed.athleteBirthPlace,
          athleteAddress: parsed.athleteAddress,
          signedAt: parsed.signedAt || new Date().toISOString(),
          signatureDataUrl: parsed.signatureDataUrl || parsed.signatureImage || '',
          consents: parsed.consents || {
            serviceTerms: true,
            specificClauses: true,
            healthDeclaration: true,
            healthData: true,
            videoInternal: true,
            videoPublic: false,
            testimonialPact: false,
          },
          snapshot: parseContractContent(parsed.snapshot),
        };
      }
    }
  } catch {
    // ignore
  }

  return null;
};

/** Stato completo: versione attiva garantita, ultima firma e necessità di (ri)firmare. */
export const getAthleteContractStatus = async (
  athleteId: string
): Promise<AthleteContractStatus> => {
  const activeTemplate = await fetchActiveContractTemplate();
  const latestSignature = await getAthleteSignedContract(athleteId);

  // L'atleta deve firmare se non ha mai firmato oppure se il contratto firmato è di un template precedente
  const needsSignature = !latestSignature || (
    latestSignature.templateId !== activeTemplate.id &&
    latestSignature.contractVersion !== activeTemplate.versionLabel
  );

  return { activeTemplate, latestSignature, needsSignature };
};

export const areRequiredConsentsGiven = (consents: ContractConsents): boolean =>
  REQUIRED_CONSENT_KEYS.every((key) => consents[key]);

/**
 * Registra la firma: scrive su athlete_contract_signatures con fallback sicuro su athlete_onboarding_responses
 */
export const saveAthleteSignedContract = async (
  input: NewContractSignatureInput
): Promise<AthleteSignedContract> => {
  if (!input.athleteId || !input.templateId) {
    throw new Error('Dati di firma incompleti.');
  }
  if (!areRequiredConsentsGiven(input.consents)) {
    throw new Error('Accetta tutte le dichiarazioni obbligatorie prima di firmare.');
  }
  if (!input.signatureDataUrl.startsWith('data:image/png;base64,')) {
    throw new Error('Firma grafica non valida.');
  }

  // 1. Prova inserimento su tabella athlete_contract_signatures
  try {
    const { data, error } = await supabase
      .from('athlete_contract_signatures')
      .insert({
        athlete_id: input.athleteId,
        template_id: input.templateId,
        signer_full_name: input.athleteName.trim(),
        signer_fiscal_code: input.athleteFiscalCode?.trim().toUpperCase() || null,
        signer_birth_date: input.athleteBirthDate || null,
        signer_birth_place: input.athleteBirthPlace?.trim() || null,
        signer_address: input.athleteAddress?.trim() || null,
        signature_image: input.signatureDataUrl,
        consent_service_terms: input.consents.serviceTerms,
        consent_specific_clauses: input.consents.specificClauses,
        consent_health_declaration: input.consents.healthDeclaration,
        consent_health_data: input.consents.healthData,
        consent_video_internal: input.consents.videoInternal,
        consent_video_public: input.consents.videoPublic,
        consent_testimonial_pact: input.consents.testimonialPact,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      })
      .select(SIGNATURE_COLUMNS)
      .single();

    if (!error && data) {
      const mapped = mapSignatureRow(data);
      if (mapped) return mapped;
    }
  } catch (err) {
    console.warn('[ContractService] Scrittura su athlete_contract_signatures non disponibile, uso fallback:', err);
  }

  // 2. Fallback resiliente: salva su athlete_onboarding_responses (già esistente su Supabase)
  const activeTemplate = await fetchActiveContractTemplate();
  const fallbackRecord: AthleteSignedContract = {
    id: `contract-${Date.now()}`,
    athleteId: input.athleteId,
    templateId: input.templateId,
    contractVersion: activeTemplate.versionLabel,
    contractRevision: activeTemplate.revision,
    contentHash: activeTemplate.contentHash,
    athleteName: input.athleteName.trim(),
    athleteFiscalCode: input.athleteFiscalCode?.trim().toUpperCase(),
    athleteBirthDate: input.athleteBirthDate,
    athleteBirthPlace: input.athleteBirthPlace?.trim(),
    athleteAddress: input.athleteAddress?.trim(),
    signedAt: new Date().toISOString(),
    signatureDataUrl: input.signatureDataUrl,
    consents: input.consents,
    snapshot: activeTemplate.content,
  };

  try {
    const { data: existing } = await supabase
      .from('athlete_onboarding_responses')
      .select('answers')
      .eq('athlete_id', input.athleteId)
      .maybeSingle();

    const currentAnswers =
      existing && existing.answers && typeof existing.answers === 'object'
        ? (existing.answers as Record<string, unknown>)
        : {};

    await supabase.from('athlete_onboarding_responses').upsert(
      {
        athlete_id: input.athleteId,
        version: 'v2.0_standard',
        answers: {
          ...currentAnswers,
          signedContract: fallbackRecord,
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'athlete_id,version' }
    );
  } catch (err) {
    console.warn('[ContractService] Sync fallback su athlete_onboarding_responses:', err);
  }

  // Salva anche in cache locale di backup
  try {
    localStorage.setItem(
      `ac_signed_contracts_v1_${input.athleteId}`,
      JSON.stringify(fallbackRecord)
    );
  } catch {
    // ignore
  }

  return fallbackRecord;
};

