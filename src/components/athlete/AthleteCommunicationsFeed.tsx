import React, { useState } from 'react';
import { createPortal } from 'react-dom';
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
  X,
  BookOpen,
  ArrowRight,
} from 'lucide-react';
import {
  BroadcastType,
  BroadcastCommunication,
} from '../../types';
import { STORAGE_KEYS } from '../../config/storageKeys';
import { getStorageItem } from '../../lib/storage';
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

/**
 * Normalizza il nome del coach evitando che compaiano UUID o "Coach Coach"
 */
function getCleanAuthorName(rawAuthor?: string): string {
  if (!rawAuthor) return 'Coach Antonio Crapanzano';
  const trimmed = rawAuthor.trim();
  // Se è un UUID tecnico di database
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
    return 'Coach Antonio Crapanzano';
  }
  if (trimmed.toLowerCase().startsWith('coach coach')) {
    return trimmed.replace(/^coach\s+coach\s+/i, 'Coach ');
  }
  if (trimmed.toLowerCase().startsWith('coach ')) {
    return trimmed;
  }
  if (trimmed === 'Coach' || trimmed === 'Sistema') {
    return 'Coach Antonio Crapanzano';
  }
  return `Coach ${trimmed}`;
}

/**
 * Normalizza i titoli delle comunicazioni rimuovendo prefissi come "Broadcast:" o "Comunicazione:"
 */
export function normalizeTitle(t: string): string {
  if (!t) return '';
  return t.replace(/^broadcast:\s*/i, '').replace(/^comunicazione:\s*/i, '').trim().toLowerCase();
}

/**
 * Renderizza il testo formattato (gestisce grassetti, elenchi puntati, titoli e paragrafi)
 */
const FormattedMessageBody: React.FC<{ text: string }> = ({ text }) => {
  if (!text || !text.trim() || text.trim() === 'Canali: in_app') {
    return (
      <p className="text-slate-400 text-xs italic">
        Comunicazione dal coach inviata tramite i canali di aggiornamento dell'app.
      </p>
    );
  }

  const lines = text.split('\n');

  return (
    <div className="space-y-3 text-slate-200 text-xs sm:text-sm leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // Linea vuota -> spaziatore
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        // Titolo livello 3 / 4 (es. #### 1. ... oppure ### ...)
        if (trimmed.startsWith('####') || trimmed.startsWith('###')) {
          const titleContent = trimmed.replace(/^#+\s*/, '');
          return (
            <h5
              key={idx}
              className="text-sm sm:text-base font-black text-amber-300 pt-2 border-b border-slate-800/80 pb-1 flex items-center gap-1.5"
            >
              {titleContent}
            </h5>
          );
        }

        // Separatore orizzontale (---)
        if (trimmed === '---') {
          return <hr key={idx} className="border-slate-800 my-2" />;
        }

        // Punto elenco (* o -)
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
          const bulletText = trimmed.substring(2);
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="text-amber-400 font-bold shrink-0 mt-0.5">•</span>
              <span className="text-slate-300">
                {renderFormattedInline(bulletText)}
              </span>
            </div>
          );
        }

        // Paragrafo standard
        return (
          <p key={idx} className="text-slate-300">
            {renderFormattedInline(line)}
          </p>
        );
      })}
    </div>
  );
};

// Helper per grassetti **testo**
function renderFormattedInline(content: string): React.ReactNode {
  const parts = content.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, pIdx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={pIdx} className="font-bold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

export const AthleteCommunicationsFeed: React.FC<AthleteCommunicationsFeedProps> = ({ athleteId }) => {
  const { broadcasts, communications, markRecipientRead, confirmRecipientRead, recordRecipientClick } = useCommunications();
  const { timeline } = useAthletes();
  const { showSuccess } = useToast();

  const [selectedBroadcastModal, setSelectedBroadcastModal] = useState<BroadcastCommunication | null>(null);

  // Filtra i broadcast inviati o registrati su database per questo atleta
  const athleteBroadcasts = React.useMemo(() => {
    // Helper per trovare il testo reale del messaggio evitando placeholder "Canali:"
    const findRealMessage = (title: string, broadcastId?: string, fallbackDesc?: string): string => {
      const normTargetTitle = normalizeTitle(title);

      // 1. Cerca nei broadcasts confrontando sia ID che titolo normalizzato
      const bc = broadcasts.find(b => {
        if (broadcastId && b.id === broadcastId) return true;
        const normB = normalizeTitle(b.title);
        return normB === normTargetTitle || normB.includes(normTargetTitle) || normTargetTitle.includes(normB);
      });
      if (bc?.message && !bc.message.trim().startsWith('Canali:')) {
        return bc.message;
      }

      // 2. Cerca nei communications logs individuali
      const commLog = communications.find(c => {
        const normC = normalizeTitle(c.subject || '');
        return normC === normTargetTitle || normC.includes(normTargetTitle) || normTargetTitle.includes(normC);
      });
      if (commLog?.messageText && !commLog.messageText.trim().startsWith('Canali:')) {
        return commLog.messageText;
      }

      // 3. Fallback se fallbackDesc non è un placeholder tecnico
      if (fallbackDesc && !fallbackDesc.trim().startsWith('Canali:')) {
        return fallbackDesc;
      }

      // 4. Se ancora vuoto, recupera il messaggio valido dal broadcast disponibile
      const anyValid = broadcasts.find(b => b.message && !b.message.trim().startsWith('Canali:'));
      if (anyValid?.message) {
        return anyValid.message;
      }

      return '';
    };

    // Blacklist dei broadcast eliminati
    const deletedIds = getStorageItem<string[]>(STORAGE_KEYS.DELETED_BROADCAST_IDS, []);
    const deletedTitles = getStorageItem<string[]>(STORAGE_KEYS.DELETED_BROADCAST_TITLES, []).map(t => t.toLowerCase().trim());
    const deletedIdSet = new Set(deletedIds);
    const deletedTitleSet = new Set(deletedTitles);

    const isBroadcastDeleted = (id?: string, title?: string): boolean => {
      if (id && deletedIdSet.has(id)) return true;
      if (title) {
        const clean = title.replace(/^broadcast:\s*/i, '').replace(/^comunicazione:\s*/i, '').toLowerCase().trim();
        if (deletedTitleSet.has(clean) || deletedTitleSet.has(title.toLowerCase().trim())) return true;
      }
      return false;
    };

    // 1. Broadcast dalla console (hanno il messaggio completo)
    const fromBroadcasts = broadcasts
      .filter(b => b.status === 'sent' && !isBroadcastDeleted(b.id, b.title))
      .map(b => ({
        ...b,
        title: b.title.replace(/^broadcast:\s*/i, ''),
        message: findRealMessage(b.title, b.id, b.message),
      }));

    // 2. Eventi da timeline Supabase
    const myTimeline = (athleteId && timeline[athleteId]) ? timeline[athleteId] : [];
    const fromTimeline: BroadcastCommunication[] = myTimeline
      .filter(t => t.type === 'communication' && !isBroadcastDeleted(t.id, t.title) && !isBroadcastDeleted(t.metadata?.broadcastId as string, t.title))
      .map(t => {
        const cleanTitle = (t.title || '').replace(/^broadcast:\s*/i, '');
        const realMessage = findRealMessage(cleanTitle, t.metadata?.broadcastId as string, t.description);

        return {
          id: (t.metadata?.broadcastId as string) || `bc-${t.id}`,
          title: cleanTitle,
          type: (t.metadata?.broadcastType as BroadcastType) || 'update',
          status: 'sent' as const,
          sentAt: (t.metadata?.sentAt as string) || t.createdAt,
          audienceFilter: { type: 'all_active' as const },
          totalRecipientsCount: 30,
          channels: (t.metadata?.channels as any) || ['in_app'],
          message: realMessage,
          attachments: (t.metadata?.attachments as any) || [],
          cta: (t.metadata?.cta as any),
          metrics: { sent: 30, delivered: 30, read: 0, clicked: 0, confirmed: 0, replied: 0 },
          recipients: [],
          author: t.authorName || 'Coach Antonio Crapanzano',
          createdAt: t.createdAt,
          updatedAt: t.createdAt,
        };
      });

    // Unione evitando duplicati per titolo normalizzato
    const map = new Map<string, BroadcastCommunication>();
    
    // Inserisci prima i broadcast che hanno il messaggio completo
    fromBroadcasts.forEach(b => {
      const key = normalizeTitle(b.title);
      map.set(key, b);
    });

    fromTimeline.forEach(t => {
      const key = normalizeTitle(t.title);
      if (!map.has(key)) {
        map.set(key, t);
      } else {
        const existing = map.get(key)!;
        if ((!existing.message || existing.message.trim().startsWith('Canali:')) && t.message) {
          map.set(key, { ...existing, message: t.message });
        }
      }
    });

    return Array.from(map.values())
      .filter(b => !isBroadcastDeleted(b.id, b.title))
      .sort((a, b) => new Date(b.sentAt || b.createdAt).getTime() - new Date(a.sentAt || a.createdAt).getTime());
  }, [broadcasts, communications, athleteId, timeline]);

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

          // Estrai anteprima messaggio pulita
          const cleanSnippet = b.message
            ? b.message.replace(/^#+\s+/gm, '').replace(/\*\*/g, '').slice(0, 140)
            : '';

          return (
            <div
              key={b.id}
              onClick={() => setSelectedBroadcastModal(b)}
              className="p-4 sm:p-5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] hover:border-amber-500/40 shadow-xl space-y-3 relative overflow-hidden cursor-pointer group transition-all"
            >
              {/* Header card */}
              <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-800/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${currentType.badgeCls}`}>
                    <TypeIcon className="w-3 h-3" />
                    {currentType.label}
                  </span>
                  <span className="text-xs font-bold text-white">{getCleanAuthorName(b.author)}</span>
                </div>

                <div className="flex items-center gap-1 text-[11px] text-slate-500">
                  <Clock className="w-3 h-3" />
                  {new Date(b.sentAt || b.createdAt).toLocaleDateString('it-IT')}
                </div>
              </div>

              {/* Titolo e Anteprima Testo */}
              <div className="space-y-1.5">
                <h4 className="text-sm sm:text-base font-black text-white group-hover:text-amber-300 transition-colors tracking-tight line-clamp-2">
                  {b.title}
                </h4>
                {cleanSnippet && (
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {cleanSnippet}...
                  </p>
                )}
              </div>

              {/* Tasto Apri Finestra Completa */}
              <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-800/60">
                <span className="inline-flex items-center gap-1.5 text-xs font-black text-amber-400 group-hover:translate-x-1 transition-transform">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Leggi annuncio completo</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>

                {isConfirmed && (
                  <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" /> Visionato
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* MODAL / FINESTRA DI LETTURA COMUNICAZIONE DEDICATA                 */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {selectedBroadcastModal && (() => {
        const activeModalBroadcast = 
          athleteBroadcasts.find(b => b.id === selectedBroadcastModal.id || normalizeTitle(b.title) === normalizeTitle(selectedBroadcastModal.title)) || 
          selectedBroadcastModal;

        return createPortal(
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
            <div className="bg-slate-900 border-2 border-amber-500/30 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-150">
              
              {/* Header Finestra */}
              <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-md">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                      Comunicazione dal Coach
                    </span>
                    <span className="text-xs font-bold text-white truncate block">
                      {getCleanAuthorName(activeModalBroadcast.author)} • {new Date(activeModalBroadcast.sentAt || activeModalBroadcast.createdAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedBroadcastModal(null)}
                  className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
                  title="Chiudi"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Contenuto Scrollabile dell'Annuncio */}
              <div className="p-5 sm:p-7 overflow-y-auto space-y-5 flex-1">
                {/* Titolo Grande */}
                <h3 className="text-lg sm:text-xl font-black text-white leading-snug tracking-tight">
                  {activeModalBroadcast.title}
                </h3>

                {/* Corpo del Testo Formattato */}
                <div className="p-5 sm:p-6 rounded-2xl bg-slate-950/70 border border-slate-800/90 shadow-inner">
                  <FormattedMessageBody text={activeModalBroadcast.message} />
                </div>

                {/* Allegati Video / PDF / Link */}
                {activeModalBroadcast.attachments && activeModalBroadcast.attachments.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-400 block">
                      Allegati e Risorse del Coach:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {activeModalBroadcast.attachments.map(att => {
                        if (att.type === 'video') {
                          return (
                            <a
                              key={att.id}
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => handleCtaClick(activeModalBroadcast)}
                              className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-800/50 text-purple-200 text-xs font-bold hover:bg-purple-900/50 transition-all flex items-center justify-between shadow-md"
                            >
                              <span className="flex items-center gap-2 truncate">
                                <Play className="w-4 h-4 text-purple-400 fill-current shrink-0" />
                                <span className="truncate">{att.title || 'Guarda Video'}</span>
                              </span>
                              <ExternalLink className="w-3.5 h-3.5 text-purple-400 shrink-0" />
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
                              onClick={() => handleCtaClick(activeModalBroadcast)}
                              className="p-3.5 rounded-2xl bg-blue-950/40 border border-blue-800/50 text-blue-200 text-xs font-bold hover:bg-blue-900/50 transition-all flex items-center justify-between shadow-md"
                            >
                              <span className="flex items-center gap-2 truncate">
                                <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                                <span className="truncate">{att.title || 'Scarica Documento'}</span>
                              </span>
                              <Download className="w-3 h-3 text-blue-400 shrink-0" />
                            </a>
                          );
                        }
                        return (
                          <a
                            key={att.id}
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => handleCtaClick(activeModalBroadcast)}
                            className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-bold hover:text-white hover:border-amber-500/40 transition-all flex items-center justify-between shadow-md"
                          >
                            <span className="truncate">{att.title || 'Apri Risorsa'}</span>
                            <ExternalLink className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Finestra con Azioni */}
              <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedBroadcastModal(null)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Chiudi Finestra
                </button>

                {/* Pulsante CTA / Conferma */}
                {activeModalBroadcast.cta && activeModalBroadcast.cta.type !== 'none' ? (
                  activeModalBroadcast.cta.type === 'confirm_read' || activeModalBroadcast.cta.requireConfirmation ? (
                    <button
                      type="button"
                      onClick={() => {
                        handleConfirm(activeModalBroadcast.id, activeModalBroadcast.title);
                        setSelectedBroadcastModal(null);
                      }}
                      className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{activeModalBroadcast.cta.label || 'Ho Letto e Preso Visione'}</span>
                    </button>
                  ) : (
                    <a
                      href={activeModalBroadcast.cta.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        handleCtaClick(activeModalBroadcast);
                        setSelectedBroadcastModal(null);
                      }}
                      className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>{activeModalBroadcast.cta.label || 'Apri Risorsa'}</span>
                    </a>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelectedBroadcastModal(null)}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Ho Letto Tutto</span>
                  </button>
                )}
              </div>

            </div>
          </div>,
          document.body
        );
      })()}
    </div>
  );
};

