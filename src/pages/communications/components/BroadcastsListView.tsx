import React, { useState, useMemo } from 'react';
import {
  Search,
  Send,
  Sparkles,
  Video,
  AlertTriangle,
  Bell,
  Users,
  User,
  Eye,
  CheckCircle2,
  MousePointer,
  Trash2,
  Clock,
  Mail,
  MessageCircle,
  Check,
  Plus,
  Edit3,
} from 'lucide-react';
import {
  BroadcastCommunication,
  BroadcastType,
  CommunicationChannelType,
} from '../../../types';

interface BroadcastsListViewProps {
  broadcasts: BroadcastCommunication[];
  onOpenDetails: (broadcast: BroadcastCommunication) => void;
  onEditBroadcast?: (broadcast: BroadcastCommunication) => void;
  onDeleteBroadcast: (id: string) => void;
  onCreateNew: () => void;
}

const typeConfig: Record<BroadcastType, { label: string; icon: React.FC<{ className?: string }>; badgeCls: string }> = {
  update: { label: 'Aggiornamento', icon: Sparkles, badgeCls: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  content_video: { label: 'Video / Contenuto', icon: Video, badgeCls: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  important_alert: { label: 'Avviso Importante', icon: AlertTriangle, badgeCls: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
  reminder: { label: 'Promemoria', icon: Bell, badgeCls: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  group_message: { label: 'Messaggio Gruppo', icon: Users, badgeCls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  single_message: { label: 'Messaggio Singolo', icon: User, badgeCls: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' },
};

export const BroadcastsListView: React.FC<BroadcastsListViewProps> = ({
  broadcasts,
  onOpenDetails,
  onEditBroadcast,
  onDeleteBroadcast,
  onCreateNew,
}) => {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<BroadcastType | 'all'>('all');
  const [filterChannel, setFilterChannel] = useState<CommunicationChannelType | 'all'>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return broadcasts
      .filter(b => {
        const q = query.toLowerCase().trim();
        if (q && !b.title.toLowerCase().includes(q) && !b.message.toLowerCase().includes(q)) {
          return false;
        }
        if (filterType !== 'all' && b.type !== filterType) return false;
        if (filterChannel !== 'all' && !b.channels.includes(filterChannel)) return false;
        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(a.sentAt || a.scheduledFor || a.createdAt).getTime();
        const dateB = new Date(b.sentAt || b.scheduledFor || b.createdAt).getTime();
        return dateB - dateA;
      });
  }, [broadcasts, query, filterType, filterChannel]);

  return (
    <div className="space-y-4">
      {/* Barra Filtri e Ricerca */}
      <div className="p-4 rounded-xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Cerca invio per titolo o contenuto..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)] placeholder-slate-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Filtro Tipo */}
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)]"
          >
            <option value="all">Tutte le Tipologie</option>
            <option value="update">Aggiornamenti</option>
            <option value="content_video">Video / Contenuti</option>
            <option value="important_alert">Avvisi Importanti</option>
            <option value="reminder">Promemoria</option>
            <option value="group_message">Messaggi di Gruppo</option>
            <option value="single_message">Messaggi Singoli</option>
          </select>

          {/* Filtro Canale */}
          <select
            value={filterChannel}
            onChange={e => setFilterChannel(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)]"
          >
            <option value="all">Tutti i Canali</option>
            <option value="in_app">In-App</option>
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
        </div>
      </div>

      {/* Lista Compatta Invii */}
      <div className="rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] shadow-xl overflow-hidden">
        {filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Comunicazione & Tipo</th>
                  <th className="py-3 px-3">Data / Ora</th>
                  <th className="py-3 px-3">Destinatari</th>
                  <th className="py-3 px-3">Canali</th>
                  <th className="py-3 px-3">Stato</th>
                  <th className="py-3 px-4">Metriche Chiave</th>
                  <th className="py-3 px-4 text-right min-w-[260px]">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900 text-xs">
                {filtered.map((b, index) => {
                  const currentType = typeConfig[b.type] || typeConfig.update;
                  const TypeIcon = currentType.icon;
                  const isScheduled = b.status === 'scheduled';
                  const totalRec = b.totalRecipientsCount || 1;
                  const readPct = Math.round(((b.metrics.read || 0) / totalRec) * 100);
                  const clickPct = Math.round(((b.metrics.clicked || 0) / totalRec) * 100);
                  const rowKey = b.id && b.id.trim() !== '' ? b.id : `bc-row-${index}-${b.title}`;
                  const isConfirming = Boolean(deleteConfirmId && deleteConfirmId === rowKey);

                  return (
                    <tr
                      key={rowKey}
                      className="hover:bg-slate-900/50 transition-colors group"
                    >
                      {/* Titolo e Tipo */}
                      <td className="py-3.5 px-4 max-w-[280px]">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${currentType.badgeCls}`}>
                              <TypeIcon className="w-2.5 h-2.5" />
                              {currentType.label}
                            </span>
                          </div>
                          <div className="font-bold text-white truncate group-hover:text-[var(--color-primary)] transition-colors">
                            {b.title}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[260px]">
                            {b.message}
                          </div>
                        </div>
                      </td>

                      {/* Data / Ora */}
                      <td className="py-3.5 px-3 whitespace-nowrap text-slate-300">
                        <div className="font-medium text-xs">
                          {new Date(b.sentAt || b.scheduledFor || b.createdAt).toLocaleDateString('it-IT')}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {new Date(b.sentAt || b.scheduledFor || b.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Destinatari */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-white">
                          👥 {b.totalRecipientsCount} atleti
                        </span>
                      </td>

                      {/* Canali */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {b.channels.includes('in_app') && (
                            <span className="p-1 rounded bg-pink-500/10 text-pink-400 border border-pink-500/20" title="In-App">
                              <Sparkles className="w-3 h-3" />
                            </span>
                          )}
                          {b.channels.includes('email') && (
                            <span className="p-1 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20" title="Email">
                              <Mail className="w-3 h-3" />
                            </span>
                          )}
                          {b.channels.includes('whatsapp') && (
                            <span className="p-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" title="WhatsApp">
                              <MessageCircle className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Stato */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {isScheduled ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            <Clock className="w-2.5 h-2.5" /> Programmato
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Trasmesso
                          </span>
                        )}
                      </td>

                      {/* Metriche Chiave */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3 text-[11px]">
                          <div className="flex items-center gap-1 text-slate-300" title="Recapitati">
                            <Send className="w-3 h-3 text-blue-400" />
                            <span className="font-bold">{b.metrics.delivered || b.totalRecipientsCount}</span>
                          </div>
                          <div className="flex items-center gap-1 text-sky-400" title="Letti">
                            <Eye className="w-3 h-3" />
                            <span className="font-bold">{readPct}%</span>
                          </div>
                          {b.cta && b.cta.type !== 'none' && (
                            <div className="flex items-center gap-1 text-purple-400" title="Click CTA">
                              <MousePointer className="w-3 h-3" />
                              <span className="font-bold">{clickPct}%</span>
                            </div>
                          )}
                          {b.metrics.confirmed > 0 && (
                            <div className="flex items-center gap-1 text-amber-400" title="Confermati">
                              <Check className="w-3 h-3" />
                              <span className="font-bold">{b.metrics.confirmed}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Azioni */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right min-w-[260px]">
                        <div className="flex items-center justify-end gap-2">
                          {onEditBroadcast && (
                            <button
                              type="button"
                              onClick={() => onEditBroadcast(b)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-800 text-slate-200 font-bold text-xs hover:bg-slate-700 hover:text-white transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer shadow-sm"
                              title="Modifica contenuto comunicazione"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                              <span>Modifica</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => onOpenDetails(b)}
                            className="px-3 py-1.5 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all shadow-sm cursor-pointer"
                          >
                            Dettagli
                          </button>

                          {isConfirming ? (
                            <div className="flex items-center gap-1.5 bg-red-950/90 p-1 rounded-xl border border-red-500/50 shadow-md">
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteBroadcast(b.id || rowKey);
                                  setDeleteConfirmId(null);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-black transition-colors shadow-sm cursor-pointer"
                              >
                                Conferma
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold cursor-pointer"
                              >
                                Annulla
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(rowKey)}
                              className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/10 transition-all cursor-pointer shadow-sm"
                              title="Elimina annuncio definitivamente"
                            >
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 flex items-center justify-center mx-auto">
              <Send className="w-6 h-6" />
            </div>
            <h4 className="text-base font-black text-white">Nessuna trasmissione trovata</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {query || filterType !== 'all' || filterChannel !== 'all'
                ? 'Nessun invio corrisponde ai filtri di ricerca applicati.'
                : 'Non hai ancora inviato comunicazioni broadcast. Clicca su "Crea comunicazione" per iniziare.'}
            </p>
            <button
              onClick={onCreateNew}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all shadow-md mt-2"
            >
              <Plus className="w-4 h-4" /> Crea la prima comunicazione
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
