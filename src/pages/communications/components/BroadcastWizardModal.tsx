import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Video,
  AlertTriangle,
  Bell,
  Users,
  User,
  Check,
  Search,
  Plus,
  Trash2,
  Calendar,
  Send,
  Save,
  Clock,
  MessageCircle,
  Mail,
} from 'lucide-react';
import {
  BroadcastType,
  AudienceFilterType,
  CommunicationChannelType,
  CommunicationAttachment,
  CtaType,
  BroadcastFormData,
} from '../../../types';
import { useAthletes } from '../../../context/AthletesContext';
import { useCommunications } from '../../../context/CommunicationsContext';
import { useToast } from '../../../context/ToastContext';
import { BroadcastPreviewCard } from './BroadcastPreviewCard';

interface BroadcastWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Partial<BroadcastFormData> | null;
  editingBroadcastId?: string | null;
}

const typeOptions: {
  id: BroadcastType;
  title: string;
  subtitle: string;
  icon: React.FC<{ className?: string }>;
  color: string;
  badgeCls: string;
}[] = [
  {
    id: 'update',
    title: 'Aggiornamento',
    subtitle: 'Novità generali, cambi programmazione, comunicazioni di servizio',
    icon: Sparkles,
    color: 'border-blue-500/40 bg-blue-950/20 text-blue-400',
    badgeCls: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  },
  {
    id: 'content_video',
    title: 'Video / Contenuto',
    subtitle: 'Tutorial tecnico, analisi esecuzioni, guide e materiali formativi',
    icon: Video,
    color: 'border-purple-500/40 bg-purple-950/20 text-purple-400',
    badgeCls: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  },
  {
    id: 'important_alert',
    title: 'Avviso importante',
    subtitle: 'Comunicazioni urgenti, policy, scadenze mediche e chiusure',
    icon: AlertTriangle,
    color: 'border-rose-500/40 bg-rose-950/20 text-rose-400',
    badgeCls: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  },
  {
    id: 'reminder',
    title: 'Promemoria',
    subtitle: 'Check-in periodico, rinnovo abbonamento, consegna report',
    icon: Bell,
    color: 'border-amber-500/40 bg-amber-950/20 text-amber-400',
    badgeCls: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  },
  {
    id: 'group_message',
    title: 'Messaggio a gruppo',
    subtitle: 'Comunicazione mirata a un segmento o tag specifico di atleti',
    icon: Users,
    color: 'border-emerald-500/40 bg-emerald-950/20 text-emerald-400',
    badgeCls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  },
  {
    id: 'single_message',
    title: 'Messaggio singolo',
    subtitle: 'Messaggio 1-to-1 dedicato a un singolo atleta specifico',
    icon: User,
    color: 'border-cyan-500/40 bg-cyan-950/20 text-cyan-400',
    badgeCls: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  },
];

export const BroadcastWizardModal: React.FC<BroadcastWizardModalProps> = ({
  isOpen,
  onClose,
  initialData,
  editingBroadcastId,
}) => {
  const { athletes } = useAthletes();
  const { createBroadcast, updateBroadcast, resolveRecipients } = useCommunications();
  const { showSuccess, showError, showInfo } = useToast();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Step 1: Tipo
  const [selectedType, setSelectedType] = useState<BroadcastType>('update');

  // Step 2: Destinatari
  const [audienceType, setAudienceType] = useState<AudienceFilterType>('all_active');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [manualAthleteIds, setManualAthleteIds] = useState<string[]>([]);
  const [athleteSearchQuery, setAthleteSearchQuery] = useState<string>('');

  // Step 3: Contenuto e Invio
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [channels, setChannels] = useState<CommunicationChannelType[]>(['in_app', 'email']);
  const [attachments, setAttachments] = useState<CommunicationAttachment[]>([]);
  
  // Attachments temp form
  const [newAttType, setNewAttType] = useState<'video' | 'document' | 'image' | 'link'>('video');
  const [newAttTitle, setNewAttTitle] = useState('');
  const [newAttUrl, setNewAttUrl] = useState('');

  // CTA
  const [ctaType, setCtaType] = useState<CtaType>('none');
  const [ctaLabel, setCtaLabel] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');

  // Schedulazione
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState('');

  // Raccolta tutti i tag disponibili negli atleti
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    athletes.forEach(a => {
      if (a.tags) {
        a.tags.forEach(t => {
          if (t.trim()) set.add(t.trim());
        });
      }
    });
    return Array.from(set);
  }, [athletes]);

  // Caricamento dati iniziali / reset
  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      if (initialData.type) setSelectedType(initialData.type);
      if (initialData.title) setTitle(initialData.title);
      if (initialData.message) setMessage(initialData.message);
      if (initialData.channels) setChannels(initialData.channels);
      if (initialData.attachments) setAttachments(initialData.attachments);
      if (initialData.cta) {
        setCtaType(initialData.cta.type || 'none');
        setCtaLabel(initialData.cta.label || '');
        setCtaUrl(initialData.cta.url || '');
      }
      if (initialData.audienceFilter) {
        setAudienceType(initialData.audienceFilter.type);
        if (initialData.audienceFilter.tag) setSelectedTag(initialData.audienceFilter.tag);
        if (initialData.audienceFilter.selectedAthleteIds) setManualAthleteIds(initialData.audienceFilter.selectedAthleteIds);
      }
    } else {
      setSelectedType('update');
      setAudienceType('all_active');
      setSelectedTag(availableTags.length > 0 ? availableTags[0] : '');
      setManualAthleteIds([]);
      setTitle('');
      setMessage('');
      setChannels(['in_app', 'email']);
      setAttachments([]);
      setCtaType('none');
      setCtaLabel('');
      setCtaUrl('');
      setIsScheduling(false);
      setScheduledDateTime('');
    }
    setCurrentStep(1);
  }, [isOpen, initialData, availableTags]);

  // Risoluzione destinatari dinamica
  const resolvedRecipients = useMemo(() => {
    if (selectedType === 'single_message') {
      return resolveRecipients('manual', undefined, manualAthleteIds.slice(0, 1));
    }
    return resolveRecipients(audienceType, selectedTag, manualAthleteIds);
  }, [selectedType, audienceType, selectedTag, manualAthleteIds, resolveRecipients]);

  // Filtraggio atleti per selezione manuale
  const filteredAthletesForManual = useMemo(() => {
    const q = athleteSearchQuery.toLowerCase().trim();
    if (!q) return athletes;
    return athletes.filter(a => a.fullName.toLowerCase().includes(q) || a.email.toLowerCase().includes(q));
  }, [athletes, athleteSearchQuery]);

  if (!isOpen) return null;

  const toggleChannel = (ch: CommunicationChannelType) => {
    if (channels.includes(ch)) {
      if (channels.length === 1) {
        showInfo('Canale Obbligatorio', 'Seleziona almeno un canale di comunicazione.');
        return;
      }
      setChannels(channels.filter(c => c !== ch));
    } else {
      setChannels([...channels, ch]);
    }
  };

  const handleAddAttachment = () => {
    if (!newAttUrl.trim()) {
      showError('URL Mancante', 'Inserisci un link o URL valido per l\'allegato.');
      return;
    }
    const att: CommunicationAttachment = {
      id: `att-${Date.now()}`,
      type: newAttType,
      title: newAttTitle.trim() || (newAttType === 'video' ? 'Video Esecuzione' : (newAttType === 'document' ? 'Guida Tecnica' : 'Risorsa')),
      url: newAttUrl.trim(),
      size: newAttType === 'document' ? 'PDF' : undefined,
    };
    setAttachments([...attachments, att]);
    setNewAttTitle('');
    setNewAttUrl('');
    showSuccess('Allegato Aggiunto', 'Risorsa inclusa nella comunicazione.');
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments(attachments.filter(a => a.id !== id));
  };

  const handleInsertVariable = (variable: string) => {
    setMessage(prev => `${prev} {{${variable}}}`);
  };

  const validateStep = (step: number): boolean => {
    if (step === 1) {
      return true;
    }
    if (step === 2) {
      if ((audienceType === 'manual' || selectedType === 'single_message') && manualAthleteIds.length === 0) {
        showError('Nessun Atleta Selezionato', 'Seleziona almeno un atleta dalla lista.');
        return false;
      }
      if (resolvedRecipients.length === 0) {
        showError('Nessun Destinatario', 'Nessun atleta disponibile per l\'invio.');
        return false;
      }
      return true;
    }
    if (step === 3) {
      if (!title.trim()) {
        showError('Titolo Mancante', 'Inserisci un titolo per la comunicazione.');
        return false;
      }
      if (!message.trim()) {
        showError('Messaggio Vuoto', 'Inserisci il testo della comunicazione.');
        return false;
      }
      if (channels.length === 0) {
        showError('Canali Mancanti', 'Seleziona almeno un canale di trasmissione.');
        return false;
      }
      return true;
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 3) setCurrentStep((prev) => (prev + 1) as 1 | 2 | 3);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3);
  };

  const handleSaveDraft = () => {
    if (!title.trim()) {
      showError('Titolo Richiesto', 'Inserisci almeno un titolo provvisorio per salvare la bozza.');
      return;
    }

    const payload: BroadcastFormData = {
      title,
      type: selectedType,
      audienceFilter: {
        type: selectedType === 'single_message' ? 'manual' : audienceType,
        tag: selectedTag,
        selectedAthleteIds: manualAthleteIds,
      },
      channels,
      message,
      attachments,
      cta: ctaType !== 'none' ? { type: ctaType, label: ctaLabel || 'Apri', url: ctaUrl, requireConfirmation: ctaType === 'confirm_read' } : undefined,
    };

    if (editingBroadcastId) {
      updateBroadcast(editingBroadcastId, {
        ...payload,
        status: 'draft',
        totalRecipientsCount: resolvedRecipients.length,
      });
      showSuccess('Bozza Aggiornata', 'Le modifiche sono state salvate nella tab Bozze.');
    } else {
      createBroadcast(payload, true);
      showSuccess('Bozza Salvata', 'La comunicazione è stata salvata nelle tue Bozze.');
    }

    onClose();
  };

  const handleSendOrSchedule = (isImmediate: boolean) => {
    if (!validateStep(3)) return;

    if (!isImmediate && !scheduledDateTime) {
      showError('Data Programmata Richiesta', 'Seleziona data e ora per l\'invio programmato.');
      return;
    }

    const payload: BroadcastFormData = {
      title,
      type: selectedType,
      audienceFilter: {
        type: selectedType === 'single_message' ? 'manual' : audienceType,
        tag: selectedTag,
        selectedAthleteIds: manualAthleteIds,
      },
      channels,
      message,
      attachments,
      cta: ctaType !== 'none' ? {
        type: ctaType,
        label: ctaLabel || (ctaType === 'confirm_read' ? 'Conferma Ricezione' : 'Apri Risorsa'),
        url: ctaUrl,
        requireConfirmation: ctaType === 'confirm_read'
      } : undefined,
      scheduledFor: !isImmediate ? scheduledDateTime : undefined,
    };

    if (editingBroadcastId) {
      updateBroadcast(editingBroadcastId, {
        ...payload,
        status: isImmediate ? 'sent' : 'scheduled',
        sentAt: isImmediate ? new Date().toISOString() : undefined,
        totalRecipientsCount: resolvedRecipients.length,
      });
      showSuccess('Comunicazione Aggiornata', isImmediate ? 'Broadcast inviato con successo agli atleti.' : 'Invio programmato con successo.');
    } else {
      createBroadcast(payload, false, !isImmediate ? scheduledDateTime : undefined);
      showSuccess(
        isImmediate ? 'Broadcast Inviato' : 'Invio Programmato',
        isImmediate
          ? `Comunicazione inviata a ${resolvedRecipients.length} destinatari.`
          : `Comunicazione programmata per il ${new Date(scheduledDateTime).toLocaleString('it-IT')}.`
      );
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-7xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[94vh] min-h-[75vh]">
        
        {/* Header Modale */}
        <div className="p-4 sm:p-6 border-b border-[var(--color-panel-border)] flex items-center justify-between gap-4 bg-slate-950/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/30">
                Console Broadcast
              </span>
              <span className="text-xs text-slate-400 font-semibold">Step {currentStep} di 3</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight mt-1">
              {editingBroadcastId ? 'Modifica Comunicazione' : 'Crea Comunicazione per Atleti'}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress Bar */}
        <div className="grid grid-cols-3 border-b border-[var(--color-panel-border)] bg-slate-900/40 text-xs font-bold">
          <button
            onClick={() => setCurrentStep(1)}
            className={`py-3 px-4 flex items-center justify-center gap-2 transition-all border-b-2 ${
              currentStep === 1
                ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/5'
                : currentStep > 1
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-500'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
              currentStep === 1 ? 'bg-[var(--color-primary)] text-black' : currentStep > 1 ? 'bg-emerald-500 text-black' : 'bg-slate-800 text-slate-400'
            }`}>
              {currentStep > 1 ? <Check className="w-3 h-3 stroke-[3]" /> : '1'}
            </span>
            <span className="hidden sm:inline">1. Tipo</span>
          </button>

          <button
            onClick={() => { if (validateStep(1)) setCurrentStep(2); }}
            className={`py-3 px-4 flex items-center justify-center gap-2 transition-all border-b-2 ${
              currentStep === 2
                ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/5'
                : currentStep > 2
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-500'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
              currentStep === 2 ? 'bg-[var(--color-primary)] text-black' : currentStep > 2 ? 'bg-emerald-500 text-black' : 'bg-slate-800 text-slate-400'
            }`}>
              {currentStep > 2 ? <Check className="w-3 h-3 stroke-[3]" /> : '2'}
            </span>
            <span className="hidden sm:inline">2. Destinatari</span>
          </button>

          <button
            onClick={() => { if (validateStep(1) && validateStep(2)) setCurrentStep(3); }}
            className={`py-3 px-4 flex items-center justify-center gap-2 transition-all border-b-2 ${
              currentStep === 3
                ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/5'
                : 'border-transparent text-slate-500'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
              currentStep === 3 ? 'bg-[var(--color-primary)] text-black' : 'bg-slate-800 text-slate-400'
            }`}>
              3
            </span>
            <span className="hidden sm:inline">3. Contenuto & Invio</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">

          {/* ─────────────────────────────────────────────────────────────
              STEP 1: TIPO DI COMUNICAZIONE
             ───────────────────────────────────────────────────────────── */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-400">
                  Seleziona la tipologia di trasmissione
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Scegli il formato più adatto: imposterà lo stile, le icone e le azioni consigliate.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                {typeOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = selectedType === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setSelectedType(opt.id);
                        if (opt.id === 'single_message') {
                          setAudienceType('manual');
                        }
                      }}
                      className={`p-4 rounded-xl border text-left transition-all relative flex flex-col gap-2 ${
                        isSelected
                          ? `${opt.color} ring-2 ring-[var(--color-primary)]/40 shadow-lg scale-[1.01]`
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                          <Icon className="w-5 h-5" />
                        </div>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-[var(--color-primary)] text-black flex items-center justify-center text-xs font-black">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-black text-white">{opt.title}</div>
                        <div className="text-xs text-slate-400 mt-0.5 leading-relaxed">{opt.subtitle}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              STEP 2: DESTINATARI (SEMPLIFICATO: TUTTI O SELEZIONA)
             ───────────────────────────────────────────────────────────── */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-400">
                  Destinatari Comunicazione
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Scegli se inviare a tutti gli atleti oppure selezionare destinatari specifici.
                </p>
              </div>

              {/* Due Scelte Primarie: Tutti oppure Seleziona */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setAudienceType('all_active');
                    setManualAthleteIds([]);
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between gap-3 ${
                    audienceType === 'all_active' && selectedType !== 'single_message'
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-white ring-2 ring-[var(--color-primary)]/40 shadow-lg'
                      : 'border-slate-800 bg-slate-950/60 hover:bg-slate-900 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-[var(--color-primary)]">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-sm font-black text-white block">Tutti gli atleti</span>
                        <span className="text-[11px] text-slate-400">Invia a tutti i membri ({athletes.length} atleti)</span>
                      </div>
                    </div>
                    {audienceType === 'all_active' && selectedType !== 'single_message' && (
                      <span className="w-5 h-5 rounded-full bg-[var(--color-primary)] text-black flex items-center justify-center text-xs font-black">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setAudienceType('manual')}
                  className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between gap-3 ${
                    audienceType === 'manual' || selectedType === 'single_message'
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-white ring-2 ring-[var(--color-primary)]/40 shadow-lg'
                      : 'border-slate-800 bg-slate-950/60 hover:bg-slate-900 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-[var(--color-primary)]">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-sm font-black text-white block">Seleziona atleti</span>
                        <span className="text-[11px] text-slate-400">
                          {manualAthleteIds.length > 0 ? `${manualAthleteIds.length} selezionati` : 'Scegli uno o più atleti'}
                        </span>
                      </div>
                    </div>
                    {(audienceType === 'manual' || selectedType === 'single_message') && (
                      <span className="w-5 h-5 rounded-full bg-[var(--color-primary)] text-black flex items-center justify-center text-xs font-black">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                </button>
              </div>

              {/* Box Lista Atleti se Seleziona è attivo */}
              {(audienceType === 'manual' || selectedType === 'single_message') && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 shadow-inner">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        {selectedType === 'single_message' ? 'Scegli Atleta Singolo' : 'Seleziona Atleti'}
                      </span>
                      {selectedType !== 'single_message' && (
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <button
                            type="button"
                            onClick={() => setManualAthleteIds(athletes.map(a => a.id))}
                            className="text-[var(--color-primary)] hover:underline font-bold"
                          >
                            Seleziona tutti
                          </button>
                          <span className="text-slate-600">•</span>
                          <button
                            type="button"
                            onClick={() => setManualAthleteIds([])}
                            className="text-slate-400 hover:text-white"
                          >
                            Deseleziona
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="relative w-full sm:w-64">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Cerca atleta per nome o email..."
                        value={athleteSearchQuery}
                        onChange={e => setAthleteSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)]"
                      />
                    </div>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                    {filteredAthletesForManual.map(a => {
                      const isSelected = manualAthleteIds.includes(a.id);
                      return (
                        <div
                          key={a.id}
                          onClick={() => {
                            if (selectedType === 'single_message') {
                              setManualAthleteIds([a.id]);
                            } else {
                              if (isSelected) {
                                setManualAthleteIds(manualAthleteIds.filter(id => id !== a.id));
                              } else {
                                setManualAthleteIds([...manualAthleteIds, a.id]);
                              }
                            }
                          }}
                          className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-white ring-1 ring-[var(--color-primary)]/30'
                              : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:bg-slate-900 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-800 text-[var(--color-primary)] font-bold text-xs flex items-center justify-center border border-slate-700">
                              {a.firstName?.[0] || 'A'}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-white">{a.fullName}</div>
                              <div className="text-[11px] text-slate-400">{a.email || a.phone || 'Nessun contatto'}</div>
                            </div>
                          </div>

                          <div className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                            isSelected
                              ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-black font-black'
                              : 'border-slate-700 bg-slate-900'
                          }`}>
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Indicatori Live Destinatari Risolti */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-slate-950 to-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)] font-black text-sm">
                    👥
                  </div>
                  <div>
                    <div className="text-xs font-black text-white">
                      Destinatari Selezionati: <span className="text-[var(--color-primary)] text-sm">{resolvedRecipients.length} Atleti</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {resolvedRecipients.length > 0
                        ? `Pronti per la trasmissione broadcast sui canali attivi`
                        : 'Seleziona almeno un atleta per procedere'}
                    </div>
                  </div>
                </div>

                {resolvedRecipients.length > 0 && (
                  <div className="flex items-center -space-x-2 overflow-hidden py-1">
                    {resolvedRecipients.slice(0, 5).map(r => (
                      <div
                        key={r.id}
                        title={r.fullName}
                        className="w-7 h-7 rounded-full bg-slate-800 border-2 border-slate-950 flex items-center justify-center text-[10px] font-bold text-white shadow"
                      >
                        {r.fullName[0]}
                      </div>
                    ))}
                    {resolvedRecipients.length > 5 && (
                      <div className="w-7 h-7 rounded-full bg-[var(--color-primary)] text-black border-2 border-slate-950 flex items-center justify-center text-[9px] font-black shadow">
                        +{resolvedRecipients.length - 5}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              STEP 3: CONTENUTO, ALLEGATI, CTA & CANALI + PREVIEW
             ───────────────────────────────────────────────────────────── */}
          {currentStep === 3 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
              
              {/* Form Input (7 col su 12) */}
              <div className="lg:col-span-7 space-y-5">
                {/* Titolo */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Titolo Comunicazione *
                  </label>
                  <input
                    type="text"
                    placeholder="Es. Aggiornamento Nuova Scheda & Linee Guida"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-[var(--color-primary)] font-medium"
                  />
                </div>

                {/* Canali di Trasmissione */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Canali di Trasmissione *
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => toggleChannel('in_app')}
                      className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                        channels.includes('in_app')
                          ? 'bg-pink-500/10 text-pink-400 border-pink-500/40 shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" /> In-App
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleChannel('email')}
                      className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                        channels.includes('email')
                          ? 'bg-sky-500/10 text-sky-400 border-sky-500/40 shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <Mail className="w-3.5 h-3.5" /> Email
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleChannel('whatsapp')}
                      className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                        channels.includes('whatsapp')
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40 shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                    </button>
                  </div>
                </div>

                {/* Messaggio + Variabili */}
                <div>
                  <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Messaggio Comunicazione *
                    </label>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 flex-wrap">
                      <span className="text-[11px]">Scorciatoie:</span>
                      <button
                        type="button"
                        onClick={() => handleInsertVariable('nome_atleta')}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[var(--color-primary)] hover:bg-slate-800 font-mono font-bold text-xs cursor-pointer"
                        title="Inserisce il nome dell'atleta"
                      >
                        + Atleta
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertVariable('nome_proprietario')}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[var(--color-primary)] hover:bg-slate-800 font-mono font-bold text-xs cursor-pointer"
                        title="Inserisce il nome del coach"
                      >
                        + Coach
                      </button>
                      <button
                        type="button"
                        onClick={() => setMessage(prev => prev + '\n* ')}
                        className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 font-bold text-xs cursor-pointer"
                        title="Aggiungi punto elenco"
                      >
                        • Elenco
                      </button>
                      <button
                        type="button"
                        onClick={() => setMessage(prev => prev + ' **testo in grassetto** ')}
                        className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 font-bold text-xs cursor-pointer"
                        title="Aggiungi grassetto"
                      >
                        B Grassetto
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={12}
                    placeholder="Scrivi qui il testo della comunicazione... (supporta elenchi puntati *, titoli ####, paragrafi ed emoji)"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    className="w-full min-h-[300px] sm:min-h-[360px] p-4 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm sm:text-base leading-relaxed focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/40 font-normal font-sans shadow-inner"
                  />
                  <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1 px-1">
                    <span>Supporta formattazione Markdown (* elenco, **grassetto**, #### titolo)</span>
                    <span>
                      {message.trim() ? message.trim().split(/\s+/).length : 0} parole • {message.length} caratteri
                    </span>
                  </div>
                </div>

                {/* Allegati */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Allegati & Risorse (Video, PDF, Immagini, Link)
                    </label>
                    <span className="text-[10px] text-slate-400 font-semibold">{attachments.length} allegati</span>
                  </div>

                  {/* Form aggiunta allegato */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <select
                      value={newAttType}
                      onChange={e => setNewAttType(e.target.value as 'video' | 'document' | 'image' | 'link')}
                      className="sm:col-span-3 px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none"
                    >
                      <option value="video">Video</option>
                      <option value="document">Documento PDF</option>
                      <option value="image">Immagine</option>
                      <option value="link">Link Web</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Titolo allegato (es. Video Squat)"
                      value={newAttTitle}
                      onChange={e => setNewAttTitle(e.target.value)}
                      className="sm:col-span-4 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none"
                    />

                    <input
                      type="text"
                      placeholder="URL risorsa (https://...)"
                      value={newAttUrl}
                      onChange={e => setNewAttUrl(e.target.value)}
                      className="sm:col-span-4 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none font-mono"
                    />

                    <button
                      type="button"
                      onClick={handleAddAttachment}
                      className="sm:col-span-1 p-1.5 rounded-lg bg-[var(--color-primary)] text-black font-black flex items-center justify-center hover:bg-[var(--color-primary-hover)] transition-all"
                      title="Aggiungi allegato"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Lista allegati inseriti */}
                  {attachments.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {attachments.map(a => (
                        <div key={a.id} className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 truncate">
                            <span className="text-[10px] uppercase font-bold text-[var(--color-primary)]">[{a.type}]</span>
                            <span className="font-bold text-white truncate">{a.title}</span>
                            <span className="text-[10px] text-slate-400 truncate">{a.url}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(a.id)}
                            className="text-red-400 hover:text-red-300 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Call To Action Opzionale */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Pulsante Azione / CTA (Opzionale)
                  </label>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'none', label: 'Nessuna CTA' },
                      { id: 'video', label: 'Apri Video' },
                      { id: 'guide', label: 'Leggi Guida' },
                      { id: 'confirm_read', label: 'Conferma Lettura' },
                      { id: 'survey', label: 'Apri Questionario' },
                      { id: 'custom', label: 'CTA Personalizzata' },
                    ].map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setCtaType(c.id as CtaType);
                          if (c.id === 'confirm_read') setCtaLabel('Ho preso visione');
                          if (c.id === 'video') setCtaLabel('Guarda il Video');
                          if (c.id === 'guide') setCtaLabel('Scarica la Guida');
                          if (c.id === 'survey') setCtaLabel('Compila il Form');
                        }}
                        className={`p-2 rounded-lg border text-xs font-bold transition-all ${
                          ctaType === c.id
                            ? 'bg-[var(--color-primary)] text-black border-[var(--color-primary)]'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>

                  {ctaType !== 'none' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="Testo pulsante (es. Guarda Video)"
                        value={ctaLabel}
                        onChange={e => setCtaLabel(e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none"
                      />
                      {ctaType !== 'confirm_read' && (
                        <input
                          type="text"
                          placeholder="URL di destinazione (https://...)"
                          value={ctaUrl}
                          onChange={e => setCtaUrl(e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none font-mono"
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Schedulazione Invio */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[var(--color-primary)]" />
                      <span className="text-xs font-bold text-white">Programma Invio Futuro</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={isScheduling}
                      onChange={e => setIsScheduling(e.target.checked)}
                      className="w-4 h-4 rounded text-[var(--color-primary)] focus:ring-0 bg-slate-900 border-slate-700"
                    />
                  </div>

                  {isScheduling && (
                    <div className="pt-2 animate-fadeIn">
                      <label className="text-[11px] text-slate-400 block mb-1">Data e ora di trasmissione programmata:</label>
                      <input
                        type="datetime-local"
                        value={scheduledDateTime}
                        onChange={e => setScheduledDateTime(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none font-mono"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Live Preview (5 col su 12) */}
              <div className="lg:col-span-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[var(--color-primary)]" /> Anteprima Live Atleta
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Render Realistico</span>
                </div>

                <BroadcastPreviewCard
                  title={title}
                  type={selectedType}
                  message={message}
                  attachments={attachments}
                  cta={ctaType !== 'none' ? { type: ctaType, label: ctaLabel || 'Apri', url: ctaUrl } : undefined}
                  channels={channels}
                  recipientCount={resolvedRecipients.length}
                />
              </div>

            </div>
          )}

        </div>

        {/* Footer Modale con Azioni */}
        <div className="p-4 sm:p-5 border-t border-[var(--color-panel-border)] bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handlePrevStep}
                className="px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <ChevronLeft className="w-4 h-4" /> Indietro
              </button>
            )}

            <button
              type="button"
              onClick={handleSaveDraft}
              className="px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Save className="w-4 h-4" /> Salva Bozza
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {currentStep < 3 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(234,179,8,0.25)]"
              >
                Continua <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {isScheduling ? (
                  <button
                    type="button"
                    onClick={() => handleSendOrSchedule(false)}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Clock className="w-4 h-4" /> Programma Invio
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSendOrSchedule(true)}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-black font-black text-xs transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(234,179,8,0.3)]"
                  >
                    <Send className="w-4 h-4" /> {editingBroadcastId ? 'Salva Modifiche & Sincronizza Atleti 🚀' : `Invia Ora (${resolvedRecipients.length} atleti)`}
                  </button>
                )}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
