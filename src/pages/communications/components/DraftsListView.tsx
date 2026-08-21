import React, { useState } from 'react';
import {
  FileText,
  Send,
  Trash2,
  Edit2,
  Sparkles,
  Video,
  AlertTriangle,
  Bell,
  Users,
  User,
  Clock,
  Plus,
} from 'lucide-react';
import {
  BroadcastCommunication,
  BroadcastType,
} from '../../../types';
import { useToast } from '../../../context/ToastContext';

interface DraftsListViewProps {
  drafts: BroadcastCommunication[];
  onEditDraft: (draft: BroadcastCommunication) => void;
  onSendDraftDirect: (id: string) => void;
  onDeleteDraft: (id: string) => void;
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

export const DraftsListView: React.FC<DraftsListViewProps> = ({
  drafts,
  onEditDraft,
  onSendDraftDirect,
  onDeleteDraft,
  onCreateNew,
}) => {
  const { showSuccess } = useToast();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {drafts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {drafts.map(d => {
            const currentType = typeConfig[d.type] || typeConfig.update;
            const TypeIcon = currentType.icon;

            return (
              <div
                key={d.id}
                className="p-5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl flex flex-col justify-between gap-4 hover:border-slate-700 transition-all group"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${currentType.badgeCls}`}>
                      <TypeIcon className="w-3 h-3" />
                      {currentType.label}
                    </span>

                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Salvato il {new Date(d.createdAt).toLocaleDateString('it-IT')}
                    </span>
                  </div>

                  <h4 className="text-base font-black text-white group-hover:text-[var(--color-primary)] transition-colors">
                    {d.title}
                  </h4>

                  <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                    {d.message || 'Nessun testo inserito...'}
                  </p>

                  <div className="flex items-center gap-2 flex-wrap pt-1 text-[11px] text-slate-500">
                    <span>Target:</span>
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-bold">
                      {d.audienceFilter.type === 'all_active' ? 'Tutti gli attivi' : (
                        d.audienceFilter.type === 'trial' ? 'In prova' : (
                          d.audienceFilter.type === 'active_program' ? 'Programma attivo' : (
                            d.audienceFilter.type === 'tag' ? `#${d.audienceFilter.tag}` : 'Manuale'
                          )
                        )
                      )}
                    </span>

                    <span className="ml-auto text-slate-400 font-bold">
                      Canali: {d.channels.join(', ')}
                    </span>
                  </div>
                </div>

                {/* Footer azioni */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  {deleteConfirmId === d.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteDraft(d.id);
                          setDeleteConfirmId(null);
                          showSuccess('Bozza Eliminata', 'La bozza è stata rimossa.');
                        }}
                        className="px-2.5 py-1 rounded bg-red-600 text-white text-xs font-bold hover:bg-red-500"
                      >
                        Conferma
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-xs"
                      >
                        Annulla
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(d.id)}
                      className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-slate-900 transition-all"
                      title="Elimina bozza"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onEditDraft(d)}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs border border-slate-800 flex items-center gap-1.5 transition-all"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Modifica
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onSendDraftDirect(d.id);
                        showSuccess('Trasmesso', 'Bozza inviata agli atleti con successo.');
                      }}
                      className="px-4 py-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-black font-black text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(234,179,8,0.2)] transition-all"
                    >
                      <Send className="w-3.5 h-3.5" /> Invia Ora
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] text-center space-y-3 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <h4 className="text-base font-black text-white">Nessuna bozza salvata</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Puoi iniziare a comporre una comunicazione e salvarla come bozza in qualsiasi momento dallo Step 3 del wizard.
          </p>
          <button
            onClick={onCreateNew}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all shadow-md mt-2"
          >
            <Plus className="w-4 h-4" /> Componi nuova bozza
          </button>
        </div>
      )}
    </div>
  );
};
