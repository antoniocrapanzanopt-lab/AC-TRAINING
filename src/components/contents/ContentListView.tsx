import React from 'react';
import {
  Calendar,
  Edit2,
  Trash2,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { InstagramContent, ContentStatus, ContentType } from '../../types/inboxAndContent';
import { useContents } from '../../context/ContentsContext';
import { useToast } from '../../context/ToastContext';

interface ContentListViewProps {
  contents: InstagramContent[];
  onEditContent: (content: InstagramContent) => void;
}

const STATUS_SELECT_OPTIONS: { value: ContentStatus; label: string }[] = [
  { value: 'idea', label: '💡 Idee' },
  { value: 'script_draft', label: '📝 Script' },
  { value: 'ready_to_record', label: '🎬 Da Registrare' },
  { value: 'editing', label: '✂️ Montaggio' },
  { value: 'ready_to_publish', label: '🚀 Pronti' },
  { value: 'published', label: '✅ Pubblicati' },
];

const TYPE_LABELS: Record<ContentType, string> = {
  reel: '🎬 Reel',
  story: '📱 Story',
  carousel: '📑 Carosello',
  post: '🖼️ Post',
};

const ACTION_CTA_CONFIG: Partial<Record<ContentStatus, { label: string; nextStatus: ContentStatus }>> = {
  idea: { label: 'Inizia script', nextStatus: 'script_draft' },
  script_draft: { label: 'Prepara registrazione', nextStatus: 'ready_to_record' },
  ready_to_record: { label: 'Invia al montaggio', nextStatus: 'editing' },
  editing: { label: 'Prepara pubblicazione', nextStatus: 'ready_to_publish' },
  recorded: { label: 'Invia al montaggio', nextStatus: 'editing' },
  ready_to_publish: { label: 'Segna pubblicato', nextStatus: 'published' },
};

export const ContentListView: React.FC<ContentListViewProps> = ({ contents, onEditContent }) => {
  const { moveStatus, deleteContentById } = useContents();
  const { showSuccess } = useToast();

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              <th className="p-4">Titolo Contenuto</th>
              <th className="p-4">Formato</th>
              <th className="p-4">Stato Pipeline</th>
              <th className="p-4">Prossima Azione</th>
              <th className="p-4">Data</th>
              <th className="p-4 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-200">
            {contents.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-12 text-center text-slate-500 font-mono">
                  Nessun contenuto trovato con i filtri attivi.
                </td>
              </tr>
            ) : (
              contents.map((c) => {
                const action = ACTION_CTA_CONFIG[c.status];

                // Warning
                const hasWarning =
                  (c.status === 'ready_to_record' && !c.script_body?.trim()) ||
                  (c.status === 'ready_to_publish' && c.type === 'carousel' && (!c.carousel_data?.slides || c.carousel_data.slides.length === 0));

                return (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition group">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span
                          onClick={() => onEditContent(c)}
                          className="font-bold text-white group-hover:text-amber-400 transition cursor-pointer text-xs"
                        >
                          {c.title || 'Senza Titolo'}
                        </span>
                        {hasWarning && (
                          <span title="Elementi mancanti prima della pubblicazione">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-4 font-mono font-bold text-slate-300">
                      {TYPE_LABELS[c.type] || c.type}
                    </td>

                    <td className="p-4">
                      <select
                        value={c.status === 'recorded' ? 'editing' : c.status}
                        onChange={(e) => moveStatus(c.id, e.target.value as ContentStatus)}
                        className="bg-slate-950 border border-slate-700/80 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none focus:border-amber-500 font-medium cursor-pointer"
                      >
                        {STATUS_SELECT_OPTIONS.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="p-4">
                      {action ? (
                        <button
                          type="button"
                          onClick={() => {
                            moveStatus(c.id, action.nextStatus);
                            showSuccess(`Avanzato a ${action.nextStatus}`);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-slate-800 hover:border-amber-500/40 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                        >
                          <span>{action.label}</span>
                          <ChevronRight className="w-3 h-3 text-amber-400" />
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-mono">Completato</span>
                      )}
                    </td>

                    <td className="p-4 text-slate-400 font-mono">
                      {c.scheduled_for ? (
                        <div className="flex items-center gap-1.5 text-[11px] text-amber-300">
                          <Calendar className="w-3.5 h-3.5 text-amber-400" />
                          <span>
                            {new Date(c.scheduled_for).toLocaleDateString('it-IT', {
                              day: '2-digit',
                              month: 'short',
                            })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEditContent(c)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition cursor-pointer"
                          title="Modifica"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteContentById(c.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                          title="Elimina"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
