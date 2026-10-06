import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Video,
  Award,
  CheckCircle2,
  Lock,
  ChevronDown,
  ChevronUp,
  Printer,
  Sparkles,
  ShieldCheck,
  HeartPulse,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import {
  ContractTemplatesConfig,
  AthleteSignedContract,
  ContractConsents,
  PublishedContractTemplate,
} from '../../types/contract';
import {
  getAthleteContractStatus,
  saveAthleteSignedContract,
  areRequiredConsentsGiven,
} from '../../services/contractService';
import { SignaturePad } from './SignaturePad';
import { useToast } from '../../context/ToastContext';

interface ContractDossierViewProps {
  athleteId: string;
  athleteName: string;
  athleteBirthDate?: string;
  athleteBirthPlace?: string;
  athleteAddress?: string;
  athleteFiscalCode?: string;
  readOnly?: boolean;
  onSignedSuccess?: (signed: AthleteSignedContract) => void;
}

type SectionKey = 'terms' | 'health' | 'video' | 'testimonial';

const EMPTY_CONSENTS: ContractConsents = {
  serviceTerms: false,
  specificClauses: false,
  healthDeclaration: false,
  healthData: false,
  videoInternal: false,
  videoPublic: false,
  testimonialPact: false,
};

// ─── Sotto-componenti di presentazione ────────────────────────────────────────────────

interface AccordionProps {
  sectionKey: SectionKey;
  expanded: SectionKey | 'all';
  onToggle: (key: SectionKey) => void;
  icon: React.ReactNode;
  iconClassName: string;
  title: string;
  titleClassName?: string;
  subtitle: string;
  children: React.ReactNode;
}

const DossierAccordion: React.FC<AccordionProps> = ({
  sectionKey,
  expanded,
  onToggle,
  icon,
  iconClassName,
  title,
  titleClassName = 'text-white',
  subtitle,
  children,
}) => {
  const isOpen = expanded === 'all' || expanded === sectionKey;
  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-950/60 shadow-2xs">
      <button
        type="button"
        onClick={() => onToggle(sectionKey)}
        className="w-full px-4 py-3 bg-white dark:bg-slate-950 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors cursor-pointer border-b border-slate-100 dark:border-slate-800/60"
      >
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-lg ${iconClassName}`}>{icon}</div>
          <div>
            <h3 className={`text-xs font-black uppercase tracking-wider ${titleClassName || 'text-slate-900 dark:text-white'}`}>{title}</h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">{subtitle}</p>
          </div>
        </div>
        {expanded === sectionKey ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>
      {isOpen && (
        <div className="p-4 sm:p-5 space-y-3 text-xs text-slate-700 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800/80 leading-relaxed bg-white/70 dark:bg-transparent">
          {children}
        </div>
      )}
    </div>
  );
};

interface ConsentCheckboxProps {
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
  required: boolean;
  children: React.ReactNode;
}

const ConsentCheckbox: React.FC<ConsentCheckboxProps> = ({ checked, disabled, onChange, required, children }) => (
  <label className="flex items-start gap-3 cursor-pointer select-none">
    <input
      type="checkbox"
      disabled={disabled}
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-0.5 w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer shrink-0"
    />
    <span className="text-xs text-slate-700 dark:text-slate-300">
      <span
        className={`mr-1.5 px-1.5 py-px rounded text-[9px] font-black uppercase tracking-wider ${
          required ? 'bg-red-500/15 text-red-600 dark:text-red-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
        }`}
      >
        {required ? 'Obbligatorio' : 'Facoltativo'}
      </span>
      {children}
    </span>
  </label>
);

// ─── Componente principale ──────────────────────────────────────────────────────────

export const ContractDossierView: React.FC<ContractDossierViewProps> = ({
  athleteId,
  athleteName,
  athleteBirthDate = '',
  athleteBirthPlace = '',
  athleteAddress = '',
  athleteFiscalCode = '',
  readOnly = false,
  onSignedSuccess,
}) => {
  const { showSuccess, showError } = useToast();

  const [activeTemplate, setActiveTemplate] = useState<PublishedContractTemplate | null>(null);
  const [signedRecord, setSignedRecord] = useState<AthleteSignedContract | null>(null);
  const [needsSignature, setNeedsSignature] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [clientData, setClientData] = useState({
    name: athleteName || 'Atleta',
    birthDate: athleteBirthDate,
    birthPlace: athleteBirthPlace,
    address: athleteAddress,
    fiscalCode: athleteFiscalCode,
  });

  const [consents, setConsents] = useState<ContractConsents>(EMPTY_CONSENTS);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedSection, setExpandedSection] = useState<SectionKey | 'all'>('all');

  const load = useCallback(async (isMountedRef: { current: boolean }) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const status = await getAthleteContractStatus(athleteId);
      if (!isMountedRef.current) return;
      setActiveTemplate(status.activeTemplate);
      setSignedRecord(status.latestSignature);
      setNeedsSignature(status.needsSignature);
      if (status.latestSignature && !status.needsSignature) {
        setConsents(status.latestSignature.consents);
      }
    } catch {
      if (isMountedRef.current) setLoadError('Impossibile caricare il documento. Controlla la connessione e riprova.');
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [athleteId]);

  useEffect(() => {
    const isMountedRef = { current: true };
    if (athleteId) {
      load(isMountedRef);
    } else {
      setIsLoading(false);
    }
    return () => {
      isMountedRef.current = false;
    };
  }, [athleteId, load]);

  useEffect(() => {
    setClientData({
      name: athleteName || 'Atleta',
      birthDate: athleteBirthDate,
      birthPlace: athleteBirthPlace,
      address: athleteAddress,
      fiscalCode: athleteFiscalCode,
    });
  }, [athleteName, athleteBirthDate, athleteBirthPlace, athleteAddress, athleteFiscalCode]);

  // Modalità di visualizzazione
  const isSigningMode = !readOnly && needsSignature && Boolean(activeTemplate);
  const showSignedVersion = Boolean(signedRecord) && !isSigningMode;
  const displayed: ContractTemplatesConfig | null = showSignedVersion && signedRecord
    ? signedRecord.snapshot
    : activeTemplate?.content ?? null;
  const consentsLocked = !isSigningMode;

  const setConsent = (key: keyof ContractConsents, value: boolean) =>
    setConsents((prev) => ({ ...prev, [key]: value }));

  const canSign =
    isSigningMode &&
    areRequiredConsentsGiven(consents) &&
    Boolean(signatureDataUrl) &&
    Boolean(clientData.name.trim());

  const toggleSection = (key: SectionKey) =>
    setExpandedSection((prev) => (prev === key ? 'all' : key));

  const handleSignConfirm = async () => {
    if (!canSign || !signatureDataUrl || !activeTemplate) {
      showError('Firma incompleta', 'Spunta tutte le dichiarazioni obbligatorie e apponi la firma.');
      return;
    }

    setIsSubmitting(true);
    try {
      const saved = await saveAthleteSignedContract({
        athleteId,
        templateId: activeTemplate.id,
        athleteName: clientData.name,
        athleteBirthDate: clientData.birthDate || undefined,
        athleteBirthPlace: clientData.birthPlace || undefined,
        athleteAddress: clientData.address || undefined,
        athleteFiscalCode: clientData.fiscalCode || undefined,
        signatureDataUrl,
        consents,
      });
      setSignedRecord(saved);
      setNeedsSignature(false);
      setConsents(saved.consents);
      showSuccess('Documento firmato', 'Termini, consensi e liberatoria sono stati registrati.');
      onSignedSuccess?.(saved);
    } catch (err) {
      showError('Firma non registrata', err instanceof Error ? err.message : 'Riprova tra qualche istante.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Stati di caricamento / errore / vuoto ──
  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-500 text-xs">
        Caricamento termini e condizioni...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-center space-y-3">
        <p className="text-xs text-red-300">{loadError}</p>
        <button
          type="button"
          onClick={() => load({ current: true })}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Riprova
        </button>
      </div>
    );
  }

  if (!displayed) {
    return (
      <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-400">
        Nessun documento contrattuale pubblicato al momento.
      </div>
    );
  }

  const p = displayed.testimonialPact.professional;
  const versionLabel = showSignedVersion && signedRecord ? signedRecord.contractVersion : activeTemplate?.versionLabel ?? displayed.version;

  return (
    <div className="space-y-6 text-slate-200">
      {/* ── Banner di stato ── */}
      {showSignedVersion && signedRecord ? (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-black text-emerald-400 uppercase tracking-wider">
                Documento firmato
              </p>
              <p className="text-[11px] text-slate-300">
                Sottoscritto il{' '}
                <span className="font-bold text-white">
                  {new Date(signedRecord.signedAt).toLocaleString('it-IT', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                . Versione <span className="font-mono text-emerald-300">{signedRecord.contractVersion}</span>
                {' '}(rev. {signedRecord.contractRevision})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 transition-colors cursor-pointer self-start sm:self-auto shrink-0"
          >
            <Printer className="w-3.5 h-3.5" />
            Stampa / Salva PDF
          </button>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 shadow-lg print:hidden">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            {signedRecord ? <RefreshCw className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
          </div>
          <div>
            <p className="text-xs font-black text-amber-400 uppercase tracking-wider">
              {signedRecord ? 'Nuova versione disponibile' : 'Termini e condizioni di utilizzo'}
            </p>
            <p className="text-[11px] text-slate-400">
              {signedRecord
                ? `Hai firmato la versione ${signedRecord.contractVersion}. Leggi e firma la versione aggiornata per continuare.`
                : 'Leggi con attenzione tutte le sezioni. In fondo trovi i consensi e il riquadro per la firma.'}
            </p>
          </div>
        </div>
      )}

      {/* ── DOCUMENTO ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5 shadow-sm dark:shadow-xl">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-4 text-center sm:text-left flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-amber-400/20 text-amber-700 dark:text-amber-300 border border-amber-400/30">
              Accordo di servizio
            </span>
            <h2 className="text-lg font-black text-slate-900 dark:text-white mt-1">
              Termini e condizioni di utilizzo {versionLabel}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              AC Coaching &amp; Personal Training — Servizio, consensi, liberatoria e testimonianza
            </p>
          </div>
          <div className="text-right text-[11px] text-slate-400 dark:text-slate-500 font-mono hidden sm:block">
            Doc Ref: AC-{athleteId.slice(0, 8).toUpperCase()}
          </div>
        </div>

        {/* Parti */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 space-y-1.5 shadow-2xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">Professionista</span>
            <p className="font-bold text-slate-900 dark:text-white text-sm">{p.fullName}</p>
            <p className="text-slate-600 dark:text-slate-400">{p.address}</p>
            <div className="pt-1 text-[11px] space-y-0.5 text-slate-500 dark:text-slate-400 font-mono">
              <p>C.F.: <span className="text-slate-900 dark:text-slate-200 font-semibold">{p.taxCode}</span></p>
              <p>P.IVA: <span className="text-slate-900 dark:text-slate-200 font-semibold">{p.vatNumber}</span></p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 space-y-1.5 shadow-2xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">Cliente / Atleta</span>
            <p className="font-bold text-slate-900 dark:text-white text-sm">
              {showSignedVersion && signedRecord ? signedRecord.athleteName : clientData.name}
            </p>
            <p className="text-slate-600 dark:text-slate-400">
              {(showSignedVersion && signedRecord ? signedRecord.athleteAddress : clientData.address) || 'Indirizzo non indicato'}
            </p>
            <div className="pt-1 text-[11px] space-y-0.5 text-slate-500 dark:text-slate-400 font-mono">
              <p>
                Nato/a il:{' '}
                <span className="text-slate-900 dark:text-slate-200 font-semibold">
                  {(() => {
                    const bd = showSignedVersion && signedRecord ? signedRecord.athleteBirthDate : clientData.birthDate;
                    return bd ? new Date(bd).toLocaleDateString('it-IT') : '—';
                  })()}
                </span>
                {(() => {
                  const bp = showSignedVersion && signedRecord ? signedRecord.athleteBirthPlace : clientData.birthPlace;
                  return bp ? ` a ${bp}` : '';
                })()}
              </p>
              <p>
                C.F.:{' '}
                <span className="text-slate-900 dark:text-slate-200 font-semibold">
                  {(showSignedVersion && signedRecord ? signedRecord.athleteFiscalCode : clientData.fiscalCode) || '—'}
                </span>
              </p>
            </div>

            {isSigningMode && (!clientData.fiscalCode || !clientData.address || !clientData.birthPlace) && (
              <div className="pt-2">
                <p className="text-[10px] text-amber-700 dark:text-amber-400/90 font-medium">
                  💡 Completa i dati anagrafici per la corretta intestazione del documento:
                </p>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  <input
                    type="text"
                    placeholder="Codice Fiscale"
                    value={clientData.fiscalCode}
                    onChange={(e) => setClientData((prev) => ({ ...prev, fiscalCode: e.target.value.toUpperCase() }))}
                    className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-amber-400 uppercase"
                  />
                  <input
                    type="text"
                    placeholder="Luogo di nascita"
                    value={clientData.birthPlace}
                    onChange={(e) => setClientData((prev) => ({ ...prev, birthPlace: e.target.value }))}
                    className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-400"
                  />
                  <input
                    type="text"
                    placeholder="Indirizzo e Città"
                    value={clientData.address}
                    onChange={(e) => setClientData((prev) => ({ ...prev, address: e.target.value }))}
                    className="col-span-2 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── 1. TERMINI E CONDIZIONI ── */}
        <DossierAccordion
          sectionKey="terms"
          expanded={expandedSection}
          onToggle={toggleSection}
          icon={<FileText className="w-4 h-4" />}
          iconClassName="bg-amber-400/10 text-amber-400"
          title={`1. ${displayed.serviceTerms.title}`}
          subtitle={displayed.serviceTerms.subtitle}
        >
          <div className="space-y-4">
            {displayed.serviceTerms.sections.map((sec, idx) => (
              <div key={idx} className="space-y-1.5">
                <h4 className="font-black text-slate-900 dark:text-white text-xs tracking-wide">{sec.title}</h4>
                {sec.content.filter(Boolean).map((c, cIdx) => (
                  <p key={cIdx} className="text-slate-700 dark:text-slate-300">{c}</p>
                ))}
                {sec.highlightNotes && sec.highlightNotes.filter(Boolean).length > 0 && (
                  <div className="mt-2 p-2.5 rounded-xl bg-amber-500/10 border-l-2 border-amber-500 dark:border-amber-400 text-[11px] font-medium text-amber-900 dark:text-amber-200 space-y-1">
                    {sec.highlightNotes.filter(Boolean).map((h, hIdx) => (
                      <p key={hIdx}>{h}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </DossierAccordion>

        {/* ── 2. SALUTE & PRIVACY ── */}
        <DossierAccordion
          sectionKey="health"
          expanded={expandedSection}
          onToggle={toggleSection}
          icon={<HeartPulse className="w-4 h-4" />}
          iconClassName="bg-red-500/10 text-red-500 dark:text-red-400"
          title={`2. ${displayed.healthPrivacy.title}`}
          subtitle="Idoneità fisica & dati relativi alla salute (art. 9 GDPR)"
        >
          <div className="space-y-1">
            <p className="font-bold text-slate-900 dark:text-white text-[11px]">Dichiarazione sullo stato di salute:</p>
            {displayed.healthPrivacy.healthDeclaration.filter(Boolean).map((line, idx) => (
              <p key={idx} className="text-slate-700 dark:text-slate-300">• {line}</p>
            ))}
          </div>
          <div className="space-y-1 pt-1">
            <p className="font-bold text-slate-900 dark:text-white text-[11px]">Informativa sintetica sul trattamento dei dati:</p>
            {displayed.healthPrivacy.privacySummary.filter(Boolean).map((line, idx) => (
              <p key={idx} className="text-slate-600 dark:text-slate-400 text-[11px]">• {line}</p>
            ))}
          </div>
        </DossierAccordion>

        {/* ── 3. LIBERATORIA ── */}
        <DossierAccordion
          sectionKey="video"
          expanded={expandedSection}
          onToggle={toggleSection}
          icon={<Video className="w-4 h-4" />}
          iconClassName="bg-purple-500/10 text-purple-600 dark:text-purple-400"
          title={`3. ${displayed.videoRelease.title}`}
          subtitle="Uso tecnico interno & pubblicazione facoltativa"
        >
          <p className="text-slate-900 dark:text-slate-200 font-medium">{displayed.videoRelease.scope}</p>
          <p className="text-slate-700 dark:text-slate-300">{displayed.videoRelease.internalUse}</p>
          <div className="space-y-1 pl-1">
            <p className="font-bold text-slate-900 dark:text-white text-[11px]">Pubblicazione (solo con consenso facoltativo separato):</p>
            {displayed.videoRelease.allowedChannels.filter(Boolean).map((ch, idx) => (
              <p key={idx} className="text-slate-600 dark:text-slate-400 text-[11px]">• {ch}</p>
            ))}
          </div>
          <div className="space-y-1 pl-1 pt-1">
            <p className="font-bold text-slate-900 dark:text-white text-[11px]">Garanzie per il Cliente:</p>
            {displayed.videoRelease.rules.filter(Boolean).map((rule, idx) => (
              <p key={idx} className="text-slate-600 dark:text-slate-400 text-[11px]">✔ {rule}</p>
            ))}
          </div>
        </DossierAccordion>

        {/* ── 4. PATTO DI TESTIMONIANZA ── */}
        <DossierAccordion
          sectionKey="testimonial"
          expanded={expandedSection}
          onToggle={toggleSection}
          icon={<Award className="w-4 h-4" />}
          iconClassName="bg-amber-400/20 text-amber-600 dark:text-amber-300"
          title={`4. ${displayed.testimonialPact.title}`}
          titleClassName="text-amber-600 dark:text-amber-300"
          subtitle="Video-testimonianza finale & bonus di riconoscimento"
        >
          <div className="space-y-1">
            <h4 className="font-black text-slate-900 dark:text-white text-xs">Oggetto</h4>
            <p className="text-slate-700 dark:text-slate-300">
              Il Cliente che aderisce si impegna, al termine del percorso o al raggiungimento dei traguardi concordati, a rilasciare una video-testimonianza sulla propria esperienza e sui risultati ottenuti.
            </p>
            <p className="text-amber-700 dark:text-amber-200/90 text-[11px] font-medium">{displayed.testimonialPact.transparencyNote}</p>
          </div>

          <div className="space-y-1.5">
            <h4 className="font-black text-slate-900 dark:text-white text-xs">Modalità di registrazione</h4>
            <p className="text-slate-700 dark:text-slate-300">• <strong>Piattaforma:</strong> {displayed.testimonialPact.interviewDetails.platform}</p>
            <p className="text-slate-700 dark:text-slate-300">• <strong>Durata:</strong> {displayed.testimonialPact.interviewDetails.duration}</p>
            <p className="text-slate-700 dark:text-slate-300">• <strong>Formato:</strong> {displayed.testimonialPact.interviewDetails.format}</p>
            <p className="text-slate-700 dark:text-slate-300">• <strong>Linee guida tecniche:</strong> {displayed.testimonialPact.interviewDetails.technicalGuidelines}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-400/30 space-y-1">
            <h4 className="font-black text-amber-700 dark:text-amber-300 text-xs flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Bonus di riconoscimento
            </h4>
            <p className="text-[11px] text-slate-700 dark:text-slate-300">
              A titolo di ringraziamento per il tempo dedicato, dopo il rilascio della video-intervista il Professionista riconosce al Cliente:
            </p>
            <p className="text-xs font-black text-amber-700 dark:text-amber-300 pt-1">🎁 {displayed.testimonialPact.bonusDescription}</p>
          </div>

          <div className="space-y-1.5">
            <h4 className="font-black text-slate-900 dark:text-white text-xs">Canali di diffusione</h4>
            {displayed.testimonialPact.distributionChannels.filter(Boolean).map((ch, idx) => (
              <p key={idx} className="text-slate-600 dark:text-slate-400 text-[11px]">• {ch}</p>
            ))}
            <p className="text-[11px] text-slate-500 dark:text-slate-400 italic pt-1">{displayed.testimonialPact.legalNotes}</p>
          </div>
        </DossierAccordion>

        {/* ── CONSENSI ── */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
          <p className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-300 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            Consensi e dichiarazioni
          </p>

          <ConsentCheckbox required checked={consents.serviceTerms} disabled={consentsLocked} onChange={(v) => setConsent('serviceTerms', v)}>
            Dichiaro di aver letto e di accettare i <strong>Termini e Condizioni di Utilizzo</strong> (sezione 1).
          </ConsentCheckbox>

          <ConsentCheckbox required checked={consents.healthDeclaration} disabled={consentsLocked} onChange={(v) => setConsent('healthDeclaration', v)}>
            Confermo la <strong>dichiarazione sul mio stato di salute</strong> e l’impegno a consegnare/rinnovare il certificato medico (sezione 2).
          </ConsentCheckbox>

          <ConsentCheckbox required checked={consents.healthData} disabled={consentsLocked} onChange={(v) => setConsent('healthData', v)}>
            Acconsento al <strong>trattamento dei miei dati relativi alla salute</strong> (anamnesi, misure, foto dei progressi) per l’erogazione del servizio, ai sensi dell’art. 9 GDPR.
          </ConsentCheckbox>

          <ConsentCheckbox required checked={consents.videoInternal} disabled={consentsLocked} onChange={(v) => setConsent('videoInternal', v)}>
            Autorizzo le <strong>riprese video e foto per l’analisi tecnica interna</strong>, non destinate alla pubblicazione (sezione 3).
          </ConsentCheckbox>

          <ConsentCheckbox required={false} checked={consents.videoPublic} disabled={consentsLocked} onChange={(v) => setConsent('videoPublic', v)}>
            Autorizzo la <strong>pubblicazione</strong> di immagini e video sui canali indicati nella sezione 3. Posso revocare il consenso in qualsiasi momento.
          </ConsentCheckbox>

          <ConsentCheckbox required={false} checked={consents.testimonialPact} disabled={consentsLocked} onChange={(v) => setConsent('testimonialPact', v)}>
            Aderisco al <strong>Patto di Testimonianza</strong> (sezione 4) con diritto al bonus di riconoscimento.
          </ConsentCheckbox>

          {/* Approvazione specifica clausole */}
          <div className="mt-2 p-3.5 rounded-xl bg-red-500/5 border border-red-500/25 space-y-2">
            <p className="text-[11px] font-black uppercase tracking-wider text-red-700 dark:text-red-300 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Approvazione specifica (artt. 1341–1342 c.c.)
            </p>
            <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5 pl-1">
              {displayed.serviceTerms.specificApprovalClauses.filter(Boolean).map((clause, idx) => (
                <li key={idx}>• {clause}</li>
              ))}
            </ul>
            <ConsentCheckbox required checked={consents.specificClauses} disabled={consentsLocked} onChange={(v) => setConsent('specificClauses', v)}>
              Dichiaro di aver letto e di <strong>approvare specificamente</strong> le clausole sopra elencate.
            </ConsentCheckbox>
          </div>
        </div>

        {/* ── FIRME ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-xs space-y-2 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Luogo e Data</span>
            <p className="font-semibold text-slate-900 dark:text-white">
              {p.city || 'Bergamo'}, lì{' '}
              {showSignedVersion && signedRecord
                ? new Date(signedRecord.signedAt).toLocaleDateString('it-IT')
                : new Date().toLocaleDateString('it-IT')}
            </p>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Il Professionista
              </span>
              <p className="font-black text-amber-600 dark:text-amber-400 text-sm mt-2 font-serif italic tracking-wider">{p.fullName}</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-xs space-y-2 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Firma del Cliente
            </span>

            {showSignedVersion && signedRecord ? (
              <div className="space-y-1 pt-1">
                <div className="h-24 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center p-2">
                  <img src={signedRecord.signatureDataUrl} alt="Firma Atleta" className="max-h-full object-contain" />
                </div>
                <p className="text-[10px] text-slate-600 dark:text-slate-400 font-mono text-center">
                  Firmato elettronicamente da {signedRecord.athleteName}
                </p>
                <p className="text-[9px] text-slate-400 dark:text-slate-600 font-mono text-center break-all" title={signedRecord.contentHash}>
                  Impronta documento (SHA-256): {signedRecord.contentHash.slice(0, 16)}…
                </p>
              </div>
            ) : isSigningMode ? (
              <SignaturePad onSignatureChange={setSignatureDataUrl} height={120} />
            ) : (
              <div className="h-24 bg-white dark:bg-slate-950 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-600 text-xs">
                In attesa di firma del cliente
              </div>
            )}
          </div>
        </div>

        {isSigningMode && (
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Alla firma verranno registrati data, ora e copia integrale del testo sottoscritto.
            </p>
            <button
              type="button"
              disabled={!canSign || isSubmitting}
              onClick={handleSignConfirm}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 text-xs font-black uppercase tracking-wider shadow-lg shadow-amber-400/20 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              {isSubmitting ? 'Registrazione firma...' : 'Conferma e firma'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
