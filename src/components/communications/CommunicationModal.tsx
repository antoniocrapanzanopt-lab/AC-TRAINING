import React, { useState, useEffect } from 'react';
import { X, MessageSquare, AlertTriangle, Calendar, User, Copy, ExternalLink } from 'lucide-react';
import { CommunicationLog, CommunicationLogFormData, CommunicationChannel, CommunicationOutcome } from '../../types';
import { useAthletes } from '../../context/AthletesContext';
import { useSubscriptions } from '../../context/SubscriptionsContext';
import { usePayments } from '../../context/PaymentsContext';
import { useCommunications } from '../../context/CommunicationsContext';
import { useToast } from '../../context/ToastContext';
import { getLocalOwnerProfile } from '../../lib/ownerProfile';

interface CommunicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CommunicationLogFormData) => void;
  editingLog: CommunicationLog | null;
  preselectedAthleteId?: string;
}

export const CommunicationModal: React.FC<CommunicationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingLog,
  preselectedAthleteId,
}) => {
  const { athletes } = useAthletes();
  const { subscriptions } = useSubscriptions();
  const { payments } = usePayments();
  const { templates, compileTemplate, openWhatsApp, openMailto, openTelegram } = useCommunications();
  const { showSuccess, showInfo } = useToast();
  const owner = getLocalOwnerProfile();

  const [athleteId, setAthleteId] = useState('');
  const [channel, setChannel] = useState<CommunicationChannel>('whatsapp');
  const [subject, setSubject] = useState('');
  const [summary, setSummary] = useState('');
  const [outcome, setOutcome] = useState<CommunicationOutcome>('delivered');
  const [nextAction, setNextAction] = useState('');
  const [recontactDate, setRecontactDate] = useState('');
  const [messageText, setMessageText] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  const prevIsOpenRef = React.useRef(false);
  const prevEditingLogIdRef = React.useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const isOpening = isOpen && !prevIsOpenRef.current;
    const isChangingEditingLog = isOpen && (editingLog?.id !== prevEditingLogIdRef.current);
    prevIsOpenRef.current = isOpen;
    prevEditingLogIdRef.current = editingLog?.id;

    if (!isOpening && !isChangingEditingLog) return;
    if (!isOpen) return;

    if (editingLog) {
      setAthleteId(editingLog.athleteId);
      setChannel(editingLog.channel);
      setSubject(editingLog.subject);
      setSummary(editingLog.summary);
      setOutcome(editingLog.outcome);
      setNextAction(editingLog.nextAction || '');
      setRecontactDate(editingLog.recontactDate || '');
      setMessageText(editingLog.messageText || '');
      setSelectedTemplateId('');
    } else {
      setAthleteId(preselectedAthleteId || (athletes.length > 0 ? athletes[0].id : ''));
      setChannel('whatsapp');
      setSubject('');
      setSummary('');
      setOutcome('delivered');
      setNextAction('');
      setRecontactDate('');
      setMessageText('');
      setSelectedTemplateId('');
    }
    setErrors([]);
  }, [isOpen, editingLog, preselectedAthleteId, athletes]);

  if (!isOpen) return null;

  const handleApplyTemplate = (tplId: string) => {
    setSelectedTemplateId(tplId);
    if (!tplId) return;

    const tpl = templates.find(t => t.id === tplId);
    if (!tpl) return;

    const selectedAthlete = athletes.find(a => a.id === athleteId);
    const sub = subscriptions.find(s => s.athleteId === athleteId && s.status === 'active');
    const pay = payments.find(p => p.athleteId === athleteId && p.status === 'pending');

    const variables: Record<string, string> = {
      nome_atleta: selectedAthlete ? selectedAthlete.fullName : 'Atleta',
      data_scadenza: sub ? sub.endDate : (pay ? pay.dueDate : 'prossimi giorni'),
      importo: pay ? `€ ${pay.residualAmount.toFixed(2)}` : '€ 0.00',
      nome_attivita: 'Scheda Allenamento / Check-in',
    };

    const compiledBody = compileTemplate(tpl.body, variables);
    setMessageText(compiledBody);
    if (!subject.trim()) setSubject(tpl.subject);
  };

  const handleCopyText = () => {
    if (!messageText) return;
    navigator.clipboard.writeText(messageText);
    showSuccess('Copiato', 'Testo del messaggio copiato negli appunti.');
  };

  const handleOpenClient = () => {
    const selectedAthlete = athletes.find(a => a.id === athleteId);

    if (channel === 'whatsapp') {
      openWhatsApp(selectedAthlete?.phone || '', messageText);
      showInfo('WhatsApp', 'Apertura WhatsApp in corso con messaggio precompilato.');
    } else if (channel === 'telegram') {
      openTelegram(messageText);
      showInfo('Telegram', 'Apertura Telegram in corso con messaggio precompilato.');
    } else if (channel === 'email') {
      openMailto(selectedAthlete?.email || '', subject || 'Comunicazione Gym', messageText);
      showInfo('Email', 'Apertura client Email predefinito.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: string[] = [];

    if (!athleteId) errs.push('Seleziona l\'atleta.');
    if (!subject.trim()) errs.push('L\'oggetto della comunicazione è obbligatorio.');
    if (!summary.trim()) errs.push('Il riepilogo o note della comunicazione è obbligatorio.');

    if (errs.length > 0) {
      setErrors(errs);
      return;
    }

    const selectedAthlete = athletes.find(a => a.id === athleteId);

    const formData: CommunicationLogFormData = {
      athleteId,
      athleteName: selectedAthlete ? selectedAthlete.fullName : 'Atleta Sconosciuto',
      dateTime: new Date().toISOString(),
      channel,
      author: owner?.fullName || 'Coach',
      subject,
      summary,
      outcome,
      nextAction: nextAction || undefined,
      recontactDate: recontactDate || undefined,
      messageText: messageText || undefined,
    };

    onSave(formData);
    onClose();
  };

  const inputCls = "w-full px-3 py-2 rounded-xl bg-slate-950 border border-[var(--color-panel-border)] text-white text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-slate-600";
  const labelCls = "block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl shadow-2xl flex flex-col my-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-panel-border)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)]">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {editingLog ? 'Modifica Registrazione Contatto' : 'Registra Nuova Comunicazione'}
              </h2>
              <p className="text-xs text-slate-400">Tracciamento locale contatti con invio tramite client nativi</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form id="communication-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {errors.length > 0 && (
            <div className="p-4 rounded-xl bg-red-950/30 border border-red-900/50 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-400">Attenzione:</p>
                <ul className="text-xs text-red-300 list-disc list-inside mt-1">
                  {errors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Atleta *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <select
                  value={athleteId}
                  onChange={e => setAthleteId(e.target.value)}
                  className={`${inputCls} pl-9`}
                >
                  <option value="">-- Seleziona Atleta --</option>
                  {athletes.map(a => (
                    <option key={a.id} value={a.id}>{a.fullName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={labelCls}>Canale Comunicazione *</label>
              <select
                value={channel}
                onChange={e => setChannel(e.target.value as CommunicationChannel)}
                className={inputCls}
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="telegram">Telegram</option>
                <option value="email">Email</option>
                <option value="phone">Telefonata</option>
                <option value="sms">SMS</option>
                <option value="meeting">Incontro Di Persona</option>
                <option value="app">Notifica App / Portale</option>
              </select>
            </div>
          </div>

          {/* Selezione Modello opzionale */}
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <label className={labelCls}>Compila da Modello Messaggio (Opzionale)</label>
            <select
              value={selectedTemplateId}
              onChange={e => handleApplyTemplate(e.target.value)}
              className={inputCls}
            >
              <option value="">-- Nessun modello selezionato --</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.title} ({t.category})</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Oggetto / Titolo Contatto *</label>
            <input
              type="text"
              placeholder="Es. Sollecito rata in scadenza, Conferma appuntamento..."
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={labelCls}>Testo Messaggio Inviato / Da Inviare</label>
              {messageText && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="text-[11px] font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" /> Copia
                  </button>
                  {['whatsapp', 'telegram', 'email'].includes(channel) && (
                    <button
                      type="button"
                      onClick={handleOpenClient}
                      className="text-[11px] font-bold text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" /> Apri {channel.toUpperCase()}
                    </button>
                  )}
                </div>
              )}
            </div>
            <textarea
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
              className={`${inputCls} resize-none`}
              rows={3}
              placeholder="Inserisci il contenuto esatto del messaggio..."
            />
          </div>

          <div>
            <label className={labelCls}>Riepilogo / Note della Conversazione *</label>
            <textarea
              value={summary}
              onChange={e => setSummary(e.target.value)}
              className={`${inputCls} resize-none`}
              rows={2}
              placeholder="Sintesi di quanto concordato o risposto dall'atleta..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Esito Contatto *</label>
              <select
                value={outcome}
                onChange={e => setOutcome(e.target.value as CommunicationOutcome)}
                className={inputCls}
              >
                <option value="delivered">Inviato / Consegnato</option>
                <option value="replied">Ha Risposto</option>
                <option value="no_answer">Nessuna Risposta</option>
                <option value="scheduled">Pianificato</option>
                <option value="failed">Non Riuscito</option>
              </select>
            </div>

            <div>
              <label className={labelCls}>Prossima Azione (Opzionale)</label>
              <input
                type="text"
                placeholder="Es. Richiamare venerdì..."
                value={nextAction}
                onChange={e => setNextAction(e.target.value)}
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Data Ricontatto</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="date"
                  value={recontactDate}
                  onChange={e => setRecontactDate(e.target.value)}
                  className={`${inputCls} pl-9`}
                />
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--color-panel-border)] bg-slate-900/30 flex items-center justify-end gap-3 shrink-0 rounded-b-2xl">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors">
            Annulla
          </button>
          <button type="submit" form="communication-form" className="px-6 py-2 rounded-xl bg-[var(--color-primary)] text-black text-xs font-black hover:bg-[var(--color-primary-hover)] transition-colors shadow-lg">
            Salva Registrazione Contatto
          </button>
        </div>
      </div>
    </div>
  );
};
