import React from 'react';
import {
  Sparkles,
  Video,
  FileText,
  AlertTriangle,
  Bell,
  Users,
  User,
  CheckCircle2,
  Play,
  Download,
  ExternalLink,
  Clock,
} from 'lucide-react';
import {
  BroadcastType,
  BroadcastCommunication,
} from '../../types';
import { useCommunications } from '../../context/CommunicationsContext';
import { useAthletes } from '../../context/AthletesContext';
import { useToast } from '../../context/ToastContext';

interface AthleteCommunicationsFeedProps {
  athleteId: string;
}

const typeConfig: Record<BroadcastType, { label: string; icon: React.FC<{ className?: string }>; badgeCls: string }> = {
  update: { label: 'Aggiornamento Coach', icon: Sparkles, badgeCls: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  content_video: { label: 'Video & Tutorial', icon: Video, badgeCls: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  important_alert: { label: 'Avviso Importante', icon: AlertTriangle, badgeCls: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
  reminder: { label: 'Promemoria', icon: Bell, badgeCls: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  group_message: { label: 'Comunicazione di Gruppo', icon: Users, badgeCls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  single_message: { label: 'Messaggio Personale', icon: User, badgeCls: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' },
};

export const AthleteCommunicationsFeed: React.FC<AthleteCommunicationsFeedProps> = ({ athleteId }) => {
  const { broadcasts, markRecipientRead, confirmRecipientRead, recordRecipientClick } = useCommunications();
  const { timeline } = useAthletes();
  const { showSuccess } = useToast();

  // Filtra i broadcast inviati o registrati su database per questo atleta
  const athleteBroadcasts = React.useMemo(() => {
    // 1. Broadcast dalla console
    const fromBroadcasts = broadcasts.filter(b => b.status === 'sent');

    // 2. Eventi da timeline Supabase
    const myTimeline = (athleteId && timeline[athleteId]) ? timeline[athleteId] : [];
    const fromTimeline: BroadcastCommunication[] = myTimeline
      .filter(t => t.type === 'communication')
      .map(t => {
        const rawTitle = t.title || '';
        const title = rawTitle.startsWith('Broadcast: ') ? rawTitle.replace('Broadcast: ', '') : rawTitle;
        return {
          id: (t.metadata?.broadcastId as string) || `bc-${t.id}`,
          title,
          type: (t.metadata?.broadcastType as BroadcastType) || 'update',
          status: 'sent' as const,
          sentAt: (t.metadata?.sentAt as string) || t.createdAt,
          audienceFilter: { type: 'all_active' as const },
          totalRecipientsCount: 30,
          channels: (t.metadata?.channels as any) || ['in_app'],
          message: t.description || '',
          attachments: (t.metadata?.attachments as any) || [],
          cta: t.metadata?.cta as any,
          metrics: { sent: 30, delivered: 30, read: 0, clicked: 0, confirmed: 0, replied: 0 },
          recipients: [],
          author: t.authorName || 'Coach Antonio Crapanzano',
          createdAt: t.createdAt,
          updatedAt: t.createdAt,
        };
      });

    // Unione evitando duplicati per titolo
    const map = new Map<string, BroadcastCommunication>();
    fromBroadcasts.forEach(b => map.set(b.title.trim().toLowerCase(), b));
    fromTimeline.forEach(b => {
      const key = b.title.trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, b);
      }
    });

    return Array.from(map.values()).sort((a, b) => new Date(b.sentAt || b.createdAt).getTime() - new Date(a.sentAt || a.createdAt).getTime());
  }, [broadcasts, athleteId, timeline]);

  // Segna automaticamente le comunicazioni come lette quando l'atleta accede al feed
  React.useEffect(() => {
    if (!athleteId || athleteBroadcasts.length === 0) return;
    athleteBroadcasts.forEach(b => {
      markRecipientRead(b.id, athleteId);
    });
  }, [athleteId, athleteBroadcasts, markRecipientRead]);

  if (athleteBroadcasts.length === 0) {
    return (
      <div className="p-5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl text-center space-y-2">
        <Sparkles className="w-6 h-6 text-slate-600 mx-auto" />
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Comunicazioni & Avvisi</h4>
        <p className="text-xs text-slate-500">Nessuna nuova comunicazione o avviso pubblicato dal coach al momento.</p>
      </div>
    );
  }

  const handleConfirm = (broadcastId: string, title: string) => {
    confirmRecipientRead(broadcastId, athleteId);
    showSuccess('Presa Visione Registrata', `Hai confermato la lettura di "${title}".`);
  };

  const handleCtaClick = (broadcast: BroadcastCommunication) => {
    recordRecipientClick(broadcast.id, athleteId);
    if (broadcast.cta?.requireConfirmation || broadcast.cta?.type === 'confirm_read') {
      confirmRecipientRead(broadcast.id, athleteId);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[var(--color-primary)]" /> Comunicazioni & Avvisi dal Coach
        </h3>
        <span className="text-[10px] font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2.5 py-0.5 rounded-full border border-[var(--color-primary)]/30">
          {athleteBroadcasts.length} nuov{athleteBroadcasts.length === 1 ? 'o' : 'i'}
        </span>
      </div>

      <div className="space-y-3.5">
        {athleteBroadcasts.map((b) => {
          const currentType = typeConfig[b.type] || typeConfig.update;
          const TypeIcon = currentType.icon;
          const recipientStatus = b.recipients?.find(r => r.athleteId === athleteId);
          const isConfirmed = recipientStatus?.status === 'confirmed';

          return (
            <div
              key={b.id}
              className="p-4 sm:p-5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-3 relative overflow-hidden"
            >
              {/* Header card */}
              <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-800/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${currentType.badgeCls}`}>
                    <TypeIcon className="w-3 h-3" />
                    {currentType.label}
                  </span>
                  <span className="text-xs font-bold text-white">Coach {b.author}</span>
                </div>

                <div className="flex items-center gap-1 text-[11px] text-slate-500">
                  <Clock className="w-3 h-3" />
                  {new Date(b.sentAt || b.createdAt).toLocaleDateString('it-IT')}
                </div>
              </div>

              {/* Titolo e Testo */}
              <div className="space-y-1.5">
                <h4 className="text-sm sm:text-base font-black text-white tracking-tight">
                  {b.title}
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                  {b.message}
                </p>
              </div>

              {/* Allegati */}
              {b.attachments && b.attachments.length > 0 && (
                <div className="pt-1 flex flex-wrap gap-2">
                  {b.attachments.map(att => {
                    if (att.type === 'video') {
                      return (
                        <a
                          key={att.id}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => handleCtaClick(b)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-950/30 border border-purple-800/50 text-purple-300 text-xs font-bold hover:bg-purple-900/40 transition-all"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>{att.title || 'Guarda Video'}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      );
                    }
                    if (att.type === 'document') {
                      return (
                        <a
                          key={att.id}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => handleCtaClick(b)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-950/30 border border-blue-800/50 text-blue-300 text-xs font-bold hover:bg-blue-900/40 transition-all"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>{att.title || 'Scarica Documento'}</span>
                          <Download className="w-3 h-3" />
                        </a>
                      );
                    }
                    return (
                      <a
                        key={att.id}
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handleCtaClick(b)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-bold hover:text-white transition-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                        <span>{att.title || 'Apri Risorsa'}</span>
                      </a>
                    );
                  })}
                </div>
              )}

              {/* Pulsante CTA / Conferma Lettura */}
              {b.cta && b.cta.type !== 'none' && (
                <div className="pt-2">
                  {b.cta.type === 'confirm_read' || b.cta.requireConfirmation ? (
                    isConfirmed ? (
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Presa visione confermata
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleConfirm(b.id, b.title)}
                        className="w-full py-2.5 px-4 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {b.cta.label || 'Conferma Presa Visione'}
                      </button>
                    )
                  ) : b.cta.type === 'video' ? (
                    <a
                      href={b.cta.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleCtaClick(b)}
                      className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      {b.cta.label || 'Guarda Video'}
                    </a>
                  ) : (
                    <a
                      href={b.cta.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleCtaClick(b)}
                      className="w-full py-2.5 px-4 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-black font-black text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(234,179,8,0.25)]"
                    >
                      <ExternalLink className="w-4 h-4" />
                      {b.cta.label || 'Apri Risorsa'}
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
