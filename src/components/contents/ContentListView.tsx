import React from 'react';
import {
  Calendar,
  Edit2,
  Trash2,
} from 'lucide-react';
import { InstagramContent, ContentStatus } from '../../types/inboxAndContent';
import { useContents } from '../../context/ContentsContext';

interface ContentListViewProps {
  contents: InstagramContent[];
  onEditContent: (content: InstagramContent) => void;
}

const STATUS_SELECT_OPTIONS: { value: ContentStatus; label: string }[] = [
  { value: 'idea', label: '💡 Idea' },
  { value: 'script_draft', label: '📝 In Scrittura' },
  { value: 'ready_to_record', label: '🎬 Da Registrare' },
  { value: 'recorded', label: '📹 Registrato' },
  { value: 'editing', label: '✂️ In Montaggio' },
  { value: 'ready_to_publish', label: '🚀 Da Pubblicare' },
  { value: 'published', label: '✅ Pubblicato' },
  { value: 'repurpose', label: '♻️ Da Riutilizzare' },
];

export const ContentListView: React.FC<ContentListViewProps> = ({ contents, onEditContent }) => {
  const { moveStatus, deleteContentById } = useContents();

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-bold">
              <th className="p-4">Titolo Contenuto</th>
              <th className="p-4">Formato</th>
              <th className="p-4">Pilastro</th>
              <th className="p-4">Stato Pipeline</th>
              <th className="p-4">Programmazione</th>
              <th className="p-4 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-200">
            {contents.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500 font-mono">
                  Nessun contenuto presente con i filtri selezionati.
                </td>
              </tr>
            ) : (
              contents.map((c) => (
                <tr key={c.id} className="hover:bg-slate-800/30 transition group">
                  <td className="p-4">
                    <div
                      onClick={() => onEditContent(c)}
                      className="font-bold text-white group-hover:text-amber-400 transition cursor-pointer"
                    >
                      {c.title}
                    </div>
                    {c.hook && (
                      <p className="text-[11px] text-slate-400 italic line-clamp-1 mt-0.5">
                        "{c.hook}"
                      </p>
                    )}
                  </td>
                  <td className="p-4 font-mono font-bold text-purple-300">
                    {c.type.toUpperCase()}
                  </td>
                  <td className="p-4 text-slate-300">
                    {c.pillar}
                  </td>
                  <td className="p-4">
                    <select
                      value={c.status}
                      onChange={(e) => moveStatus(c.id, e.target.value as ContentStatus)}
                      className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
                    >
                      {STATUS_SELECT_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-4 text-slate-400 font-mono">
                    {c.scheduled_for ? (
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <Calendar className="w-3.5 h-3.5 text-amber-400" />
                        {new Date(c.scheduled_for).toLocaleDateString('it-IT', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onEditContent(c)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition"
                        title="Modifica"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteContentById(c.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                        title="Elimina"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
