import React, { useState } from 'react';
import {
  X,
  Send,
  Sparkles,
  CheckCircle2,
  Eye,
  MousePointer,
  MessageSquare,
  Users,
  Search,
  ExternalLink,
  Clock,
  Mail,
  MessageCircle,
  Video,
  AlertTriangle,
  Bell,
  User,
  Check,
  Edit3,
} from 'lucide-react';
import {
  BroadcastCommunication,
  BroadcastType,
} from '../../../types';
import { useCommunications } from '../../../context/CommunicationsContext';
import { useToast } from '../../../context/ToastContext';

interface BroadcastDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  broadcast: BroadcastCommunication | null;
  onEdit?: (broadcast: BroadcastCommunication) => void;
}

const typeConfig: Record<BroadcastType, { label: string; icon: React.FC<{ className?: string }>; badgeCls: string }> = {
  update: { label: 'Aggiornamento', icon: Sparkles, badgeCls: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  content_video: { label: 'Video / Contenuto', icon: Video, badgeCls: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  important_alert: { label: 'Avviso Importante', icon: AlertTriangle, badgeCls: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
  reminder: { label: 'Promemoria', icon: Bell, badgeCls: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  group_message: { label: 'Messaggio Gruppo', icon: Users, badgeCls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  single_message: { label: 'Messaggio Singolo', icon: User, badgeCls: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' },
};

export const BroadcastDetailsModal: React.FC<BroadcastDetailsModalProps> = ({
  isOpen,
  onClose,
  broadcast: initialBroadcast,
  onEdit,
}) => {
  const { broadcasts, confirmRecipientRead, openWhatsApp, openMailto } = useCommunications();
  const { showSuccess } = useToast();

  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'delivered' | 'read' | 'confirmed' | 'replied'>('all');

  if (!isOpen || !initialBroadcast) return null;

  const broadcast = broadcasts.find(b => b.id === initialBroadcast.id) || initialBroadcast;
  const currentType = typeConfig[broadcast.type] || typeConfig.update;
  const TypeIcon = currentType.icon;

  const recipients = broadcast.recipients || [];
  const filteredRecipients = recipients.filter(r => {
    const q = query.toLowerCase().trim();
    if (q && !r.athleteName.toLowerCase().includes(q) && !(r.email && r.email.toLowerCase().includes(q))) {
      return false;
    }
    if (filterStatus === 'all') return true;
    if (filterStatus === 'confirmed') return r.status === 'confirmed';
    if (filterStatus === 'read') return r.status === 'read' || r.status === 'confirmed';
    if (filterStatus === 'replied') return r.status === 'replied';
    if (filterStatus === 'delivered') return r.status === 'delivered';
    return true;
  });

  const total = broadcast.totalRecipientsCount || recipients.length || 1;
  const readRate = Math.round(((broadcast.metrics.read || 0) / total) * 100);
  const clickRate = Math.round(((broadcast.metrics.clicked || 0) / total) * 100);
  const confirmRate = Math.round(((broadcast.metrics.confirmed || 0) / total) * 100);

  const handleManualConfirm = (athleteId: string, name: string) => {
    confirmRecipientRead(broadcast.id, athleteId);
    showSuccess('Conferma Registrata', `Presa visione registrata per ${name}.`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-[var(--color-panel-border)] flex items-start justify-between gap-4 bg-slate-950/70">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${currentType.badgeCls}`}>
                <TypeIcon className="w-3 h-3" />
                {currentType.label}
              </span>

              <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                {broadcast.status === 'sent' ? 'Trasmesso' : (broadcast.status === 'scheduled' ? 'Programmato' : 'Bozza')}
              </span>

              {broadcast.sentAt && (
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  {new Date(broadcast.sentAt).toLocaleString('it-IT')}
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {broadcast.title}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(broadcast)}
                className="px-3.5 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 text-amber-300 font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
              >
                <Edit3 className="w-4 h-4" />
                <span>Modifica Annuncio</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all shrink-0 cursor-pointer"
              title="Chiudi"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">

          {/* Metriche di Rendimento Trasmissione */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Send className="w-3 h-3 text-blue-400" /> Inviati
              </span>
              <span className="text-xl font-black text-white">{broadcast.metrics.sent || total}</span>
              <span className="text-[10px] text-slate-500">100% destinatari</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Consegnati
              </span>
              <span className="text-xl font-black text-emerald-400">{broadcast.metrics.delivered || total}</span>
              <span className="text-[10px] text-emerald-500/80">Recapitati con successo</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Eye className="w-3 h-3 text-sky-400" /> Letti
              </span>
              <span className="text-xl font-black text-sky-400">{broadcast.metrics.read || 0}</span>
              <span className="text-[10px] text-sky-500/80">{readRate}% tasso apertura</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <MousePointer className="w-3 h-3 text-purple-400" /> Click
              </span>
              <span className="text-xl font-black text-purple-400">{broadcast.metrics.clicked || 0}</span>
              <span className="text-[10px] text-purple-500/80">{clickRate}% interazione</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Check className="w-3 h-3 text-amber-400" /> Confermati
              </span>
              <span className="text-xl font-black text-amber-400">{broadcast.metrics.confirmed || 0}</span>
              <span className="text-[10px] text-amber-500/80">{confirmRate}% presi visione</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <MessageSquare className="w-3 h-3 text-pink-400" /> Risposte
              </span>
              <span className="text-xl font-black text-pink-400">{broadcast.metrics.replied || 0}</span>
              <span className="text-[10px] text-slate-500">Feedback atleti</span>
            </div>
          </div>

          {/* Testo Trasmesso, Allegati e CTA */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">Contenuto Trasmesso</span>
              <div className="flex items-center gap-1.5">
                {broadcast.channels.map(ch => (
                  <span key={ch} className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 border border-slate-800 text-slate-300">
                    {ch.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>

            <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line p-3 rounded-lg bg-slate-900/60 border border-slate-800/80">
              {broadcast.message}
            </div>

            {/* Allegati */}
            {broadcast.attachments && broadcast.attachments.length > 0 && (
              <div className="pt-1 flex flex-wrap gap-2">
                {broadcast.attachments.map(a => (
                  <a
                    key={a.id}
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-white hover:border-[var(--color-primary)] transition-all"
                  >
                    <ExternalLink className="w-3 h-3 text-[var(--color-primary)]" />
                    <span>{a.title}</span>
                    <span className="text-[10px] text-slate-500">({a.type})</span>
                  </a>
                ))}
              </div>
            )}

            {/* CTA */}
            {broadcast.cta && broadcast.cta.type !== 'none' && (
              <div className="pt-1 flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">Azione Richiesta:</span>
                <span className="px-3 py-1 rounded-lg bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 text-[var(--color-primary)] text-xs font-bold">
                  {broadcast.cta.label}
                </span>
              </div>
            )}
          </div>

          {/* Tabella Tracciamento Singoli Atleti */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-[var(--color-primary)]" /> Destinatari & Stato Individuale ({recipients.length})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Traccia la ricezione, apertura e presa visione per ogni singolo atleta.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Filtro stato */}
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value as any)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
                >
                  <option value="all">Tutti gli stati</option>
                  <option value="confirmed">Confermati ({broadcast.metrics.confirmed})</option>
                  <option value="read">Letti ({broadcast.metrics.read})</option>
                  <option value="replied">Hanno Risposto ({broadcast.metrics.replied})</option>
                  <option value="delivered">Consegnati</option>
                </select>

                {/* Ricerca */}
                <div className="relative w-40 sm:w-52">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Cerca atleta..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Tabella compatta destinatari */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-inner max-h-72 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-slate-900/60 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <th className="p-3">Atleta</th>
                    <th className="p-3">Stato Ricezione</th>
                    <th className="p-3">Apertura / Presa Visione</th>
                    <th className="p-3 text-right">Azioni Rapide</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 text-xs">
                  {filteredRecipients.map(r => {
                    const isConfirmed = r.status === 'confirmed';
                    const isRead = r.status === 'read' || isConfirmed;
                    return (
                      <tr key={r.athleteId} className="hover:bg-slate-900/40 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-800 text-[var(--color-primary)] font-bold text-xs flex items-center justify-center">
                              {r.athleteName[0]}
                            </div>
                            <div>
                              <div className="font-bold text-white">{r.athleteName}</div>
                              <div className="text-[10px] text-slate-500">{r.email || r.phone || 'Contatto app'}</div>
                            </div>
                          </div>
                        </td>

                        <td className="p-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isConfirmed
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : isRead
                              ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                          }`}>
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            {isConfirmed ? 'Confermato' : (isRead ? 'Letto' : 'Consegnato')}
                          </span>
                        </td>

                        <td className="p-3 text-[11px] text-slate-400">
                          {r.confirmedAt ? (
                            <span className="text-emerald-400 font-medium">
                              Confermato il {new Date(r.confirmedAt).toLocaleDateString('it-IT')}
                            </span>
                          ) : r.readAt ? (
                            <span className="text-sky-400 font-medium">
                              Letto il {new Date(r.readAt).toLocaleDateString('it-IT')}
                            </span>
                          ) : (
                            <span className="text-slate-500">In attesa</span>
                          )}
                        </td>

                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!isConfirmed && (
                              <button
                                type="button"
                                onClick={() => handleManualConfirm(r.athleteId, r.athleteName)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold transition-all cursor-pointer"
                                title="Segna presa visione / letto manualmente"
                              >
                                Segna Letto
                              </button>
                            )}

                            {r.phone && (
                              <button
                                type="button"
                                onClick={() => openWhatsApp(r.phone!, `Ciao ${r.athleteName}, ti scrivo in merito alla comunicazione "${broadcast.title}".`)}
                                className="p-1.5 rounded-lg bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/40 transition-all"
                                title="Contatta su WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {r.email && (
                              <button
                                type="button"
                                onClick={() => openMailto(r.email!, broadcast.title, broadcast.message)}
                                className="p-1.5 rounded-lg bg-sky-950/40 text-sky-400 hover:bg-sky-900/40 transition-all"
                                title="Invia Email"
                              >
                                <Mail className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredRecipients.length === 0 && (
                <div className="p-6 text-center text-xs text-slate-500">
                  Nessun destinatario trovato per i filtri selezionati.
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-[var(--color-panel-border)] bg-slate-950/80 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Autore: <span className="font-bold text-white">{broadcast.author}</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs border border-slate-800 transition-all"
          >
            Chiudi
          </button>
        </div>

      </div>
    </div>
  );
};
