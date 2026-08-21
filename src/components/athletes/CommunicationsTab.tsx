import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  Send,
  Mail,
  Phone,
  AlertTriangle,
  Plus,
  Edit2,
  Trash2,
  Globe,
  User,
  MessageCircle,
  Sparkles,
  Clock,
} from 'lucide-react';
import {
  CommunicationLog,
  CommunicationChannel,
  CommunicationOutcome,
  CommunicationLogFormData,
} from '../../types';
import { useCommunications } from '../../context/CommunicationsContext';
import { useToast } from '../../context/ToastContext';
import { CommunicationModal } from '../communications/CommunicationModal';

interface CommunicationsTabProps {
  athleteId: string;
  athleteName: string;
  athletePhone?: string;
  athleteEmail?: string;
}

const channelBadges: Record<CommunicationChannel, { label: string; color: string; icon: React.FC<{ className?: string }> }> = {
  whatsapp: { label: 'WhatsApp', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', icon: MessageCircle },
  email: { label: 'Email', color: 'bg-sky-500/10 text-sky-400 border-sky-500/30', icon: Mail },
  phone: { label: 'Chiamata', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30', icon: Phone },
  telegram: { label: 'Telegram', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30', icon: Send },
  sms: { label: 'SMS', color: 'bg-slate-500/10 text-slate-400 border-slate-500/30', icon: MessageSquare },
  meeting: { label: 'Incontro', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30', icon: User },
  app: { label: 'In-App', color: 'bg-pink-500/10 text-pink-400 border-pink-500/30', icon: Globe },
};

const outcomeBadges: Record<CommunicationOutcome, { label: string; color: string }> = {
  delivered: { label: 'Consegnato / Inviato', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  replied: { label: 'Risposto', color: 'bg-sky-500/10 text-sky-400 border-sky-500/30' },
  no_answer: { label: 'Nessuna Risposta', color: 'bg-red-500/10 text-red-400 border-red-500/30' },
  failed: { label: 'Fallito', color: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
  scheduled: { label: 'Pianificato', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
};

export const CommunicationsTab: React.FC<CommunicationsTabProps> = ({
  athleteId,
  athleteName,
  athletePhone,
  athleteEmail,
}) => {
  const {
    broadcasts,
    communications,
    logCommunication,
    updateCommunication,
    deleteCommunication,
    openWhatsApp,
    openMailto,
  } = useCommunications();

  const { showSuccess, showInfo } = useToast();

  const [filterChannel, setFilterChannel] = useState<CommunicationChannel | 'all'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<CommunicationLog | null>(null);

  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ open: boolean; logId: string | null }>({
    open: false,
    logId: null,
  });

  // Broadcast inviati a questo specifico atleta
  const athleteBroadcasts = useMemo(() => {
    return broadcasts.filter(b => {
      if (b.status !== 'sent') return false;
      if (!b.audienceFilter || b.audienceFilter.type === 'all_active' || b.audienceFilter.type === 'trial' || b.audienceFilter.type === 'active_program') return true;
      if (b.audienceFilter.selectedAthleteIds && b.audienceFilter.selectedAthleteIds.includes(athleteId)) return true;
      if (b.recipients && b.recipients.some(r => r.athleteId === athleteId)) return true;
      return false;
    }).sort((a, b) => new Date(b.sentAt || b.createdAt).getTime() - new Date(a.sentAt || a.createdAt).getTime());
  }, [broadcasts, athleteId]);

  // Comunicazioni dell'atleta
  const athleteComms = useMemo(() => {
    return communications
      .filter(c => c.athleteId === athleteId)
      .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
  }, [communications, athleteId]);

  // Metriche Contatto
  const metrics = useMemo(() => {
    const latestComm = athleteComms.length > 0 ? athleteComms[0] : null;

    // Ricontatto programmato futuro
    const todayStr = new Date().toISOString().slice(0, 10);
    const recontactComms = athleteComms.filter(c => c.recontactDate && c.recontactDate >= todayStr);
    const nextRecontact = recontactComms.length > 0 ? recontactComms[0] : null;

    return {
      latestComm,
      nextRecontact,
      totalComms: athleteComms.length,
    };
  }, [athleteComms]);

  // Comunicazioni filtrate
  const filteredComms = useMemo(() => {
    if (filterChannel === 'all') return athleteComms;
    return athleteComms.filter(c => c.channel === filterChannel);
  }, [athleteComms, filterChannel]);

  const handleSaveLog = (data: CommunicationLogFormData) => {
    if (editingLog) {
      updateCommunication(editingLog.id, data);
      showSuccess('Modificato', 'Registro comunicazione aggiornato.');
    } else {
      logCommunication({ ...data, athleteId, athleteName });
      showSuccess('Registrato', 'Nuova interazione registrata con successo.');
    }
  };

  const handleDeleteLog = (id: string) => {
    deleteCommunication(id);
    showInfo('Eliminato', 'Comunicazione rimossa dallo storico.');
    setDeleteConfirmModal({ open: false, logId: null });
  };

  // Invio Rapido WhatsApp
  const handleQuickWhatsApp = () => {
    if (!athletePhone) {
      showInfo('Telefono Mancante', `Nessun numero di telefono inserito per ${athleteName}.`);
      return;
    }
    const msg = `Ciao ${athleteName}, come va? Ti scrivo per fare un breve check sulle tue attività di allenamento.`;
    openWhatsApp(athletePhone, msg);
    showSuccess('WhatsApp', 'Finestra WhatsApp aperta.');
  };

  // Invio Rapido Email
  const handleQuickEmail = () => {
    if (!athleteEmail) {
      showInfo('Email Mancante', `Nessun indirizzo email inserito per ${athleteName}.`);
      return;
    }
    const subject = `Check-in Allenamento - ${athleteName}`;
    const body = `Ciao ${athleteName},\n\nDesideravo aggiornarmi con te sul tuo piano di allenamento.\n\nUn caro saluto,`;
    openMailto(athleteEmail, subject, body);
    showSuccess('Email', 'Client email aperto.');
  };

  return (
    <div className="space-y-6">
      {/* Header Sezione */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[var(--color-primary)]" /> Comunicazioni & Storico Contatti
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Registra le interazioni, invia messaggi rapidi e pianifica i promemoria di ricontatto per {athleteName}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {athletePhone && (
            <button
              onClick={handleQuickWhatsApp}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 text-xs font-bold transition-all"
            >
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </button>
          )}

          {athleteEmail && (
            <button
              onClick={handleQuickEmail}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/30 hover:bg-sky-500/20 text-xs font-bold transition-all"
            >
              <Mail className="w-4 h-4" /> Email
            </button>
          )}

          <button
            onClick={() => {
              setEditingLog(null);
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all shadow-md"
          >
            <Plus className="w-4 h-4" /> Registra Interazione
          </button>
        </div>
      </div>

      {/* KPI Cards Contatto & Follow-up */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Ultimo Contatto */}
        <div className="p-4 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ultima Comunicazione</span>
          {metrics.latestComm ? (
            <div>
              <span className="text-sm font-black text-white block">
                {new Date(metrics.latestComm.dateTime).toLocaleDateString('it-IT')} ({channelBadges[metrics.latestComm.channel]?.label})
              </span>
              <span className="text-[11px] text-slate-400 truncate block">
                "{metrics.latestComm.subject}"
              </span>
            </div>
          ) : (
            <span className="text-sm font-bold text-slate-400">Nessun contatto registrato</span>
          )}
        </div>

        {/* Prossimo Ricontatto */}
        <div className="p-4 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Prossimo Follow-up / Ricontatto</span>
          {metrics.nextRecontact ? (
            <div>
              <span className="text-sm font-black text-amber-400 block">
                {new Date(metrics.nextRecontact.recontactDate!).toLocaleDateString('it-IT')}
              </span>
              <span className="text-[11px] text-slate-400 truncate block">
                Azione: {metrics.nextRecontact.nextAction || 'Verificare stato atleta'}
              </span>
            </div>
          ) : (
            <span className="text-sm font-bold text-slate-400">Nessun ricontatto programmato</span>
          )}
        </div>

        {/* Totale Interazioni */}
        <div className="p-4 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Totale Interazioni</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{metrics.totalComms + athleteBroadcasts.length}</span>
            <span className="text-xs text-slate-500 font-semibold">({athleteBroadcasts.length} broadcast)</span>
          </div>
        </div>
      </div>

      {/* SEZIONE BROADCAST & ANNUNCI RICEVUTI DALL'ATLETA */}
      <div className="p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--color-primary)]" />
            Comunicazioni Broadcast & Annunci Ricevuti
          </h3>
          <span className="text-[10px] font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2.5 py-0.5 rounded-full border border-[var(--color-primary)]/30">
            {athleteBroadcasts.length} inviat{athleteBroadcasts.length === 1 ? 'o' : 'i'}
          </span>
        </div>

        {athleteBroadcasts.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">Nessuna comunicazione broadcast trasmessa a questo atleta.</p>
        ) : (
          <div className="space-y-3">
            {athleteBroadcasts.map(b => {
              const recipientStatus = b.recipients?.find(r => r.athleteId === athleteId);
              const isConfirmed = recipientStatus?.status === 'confirmed';
              const isRead = recipientStatus?.status === 'read' || isConfirmed;

              return (
                <div key={b.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                        {b.type === 'update' ? 'Aggiornamento' : b.type === 'content_video' ? 'Video' : b.type === 'important_alert' ? 'Avviso Urgente' : 'Comunicazione'}
                      </span>
                      <h4 className="text-xs sm:text-sm font-black text-white">{b.title}</h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(b.sentAt || b.createdAt).toLocaleDateString('it-IT')}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        isConfirmed
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : isRead
                          ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {isConfirmed ? '✓ Presa Visione' : isRead ? 'Letto' : 'Inviato'}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                    {b.message}
                  </p>

                  <div className="flex items-center gap-2 text-[10px] text-slate-500 pt-1">
                    <span>Canali: {b.channels.join(', ')}</span>
                    {b.cta && b.cta.type !== 'none' && (
                      <>
                        <span>•</span>
                        <span className="text-[var(--color-primary)]">CTA: {b.cta.label}</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bar Filtri & Timeline Comunicazioni */}
      <div className="p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterChannel}
              onChange={e => setFilterChannel(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-[var(--color-primary)] transition-colors"
            >
              <option value="all">Tutti i canali</option>
              <option value="whatsapp">💬 WhatsApp</option>
              <option value="email">📧 Email</option>
              <option value="phone">📞 Chiamata</option>
              <option value="telegram">✈️ Telegram</option>
              <option value="meeting">🤝 Incontro</option>
            </select>
          </div>

          <span className="text-xs text-slate-500 font-semibold">
            {filteredComms.length} interazioni visualizzate
          </span>
        </div>

        {/* Lista Timeline */}
        <div className="divide-y divide-slate-800 max-h-[450px] overflow-y-auto pr-1">
          {filteredComms.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              Nessuna comunicazione registrata per questo filtro.
            </div>
          ) : (
            filteredComms.map(comm => {
              const chCfg = channelBadges[comm.channel] || channelBadges.whatsapp;
              const outCfg = outcomeBadges[comm.outcome] || outcomeBadges.delivered;
              const ChannelIcon = chCfg.icon;

              return (
                <div key={comm.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-900/40 p-2 rounded-xl transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-xl border shrink-0 mt-0.5 ${chCfg.color}`}>
                      <ChannelIcon className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">{comm.subject}</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${outCfg.color}`}>
                          {outCfg.label}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 my-1">{comm.summary}</p>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                        <span>Data: <strong className="text-slate-200">{new Date(comm.dateTime).toLocaleDateString('it-IT')}</strong></span>
                        <span>• Canale: {chCfg.label}</span>
                        {comm.author && <span>• Autore: {comm.author}</span>}
                        {comm.recontactDate && (
                          <span className="text-amber-400 font-semibold">• Ricontatto: {new Date(comm.recontactDate).toLocaleDateString('it-IT')}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 shrink-0 border-t sm:border-t-0 border-slate-800/60 pt-2 sm:pt-0">
                    <button
                      onClick={() => {
                        setEditingLog(comm);
                        setIsModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                      title="Modifica"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmModal({ open: true, logId: comm.id })}
                      className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors"
                      title="Elimina"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MODALI */}
      <CommunicationModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingLog(null);
        }}
        onSave={handleSaveLog}
        editingLog={editingLog}
        preselectedAthleteId={athleteId}
      />

      {/* Modal Conferma Eliminazione */}
      {deleteConfirmModal.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setDeleteConfirmModal({ open: false, logId: null })} />
          <div className="relative w-full max-w-sm bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4 text-red-500">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Eliminare Comunicazione?</h3>
            </div>
            <p className="text-sm text-slate-400 mb-6">Sei sicuro di voler eliminare questa comunicazione dallo storico?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmModal({ open: false, logId: null })}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={() => deleteConfirmModal.logId && handleDeleteLog(deleteConfirmModal.logId)}
                className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors"
              >
                Elimina Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
