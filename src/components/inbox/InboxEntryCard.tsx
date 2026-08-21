import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Video,
  ListTodo,
  User,
  Archive,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { InboxEntry, InboxCategory, InboxPriority } from '../../types/inboxAndContent';
import { useInbox } from '../../context/InboxContext';
import { useAthletes } from '../../context/AthletesContext';

interface InboxEntryCardProps {
  entry: InboxEntry;
  onOpenContentModal?: (entry: InboxEntry) => void;
}

const CATEGORY_LABELS: Record<InboxCategory, { label: string; bg: string; text: string }> = {
  content_idea: { label: 'Idea Contenuto', bg: 'bg-purple-500/10 border-purple-500/30', text: 'text-purple-300' },
  client_observation: { label: 'Osservazione Atleta', bg: 'bg-blue-500/10 border-blue-500/30', text: 'text-blue-300' },
  business_task: { label: 'Task Gestionale', bg: 'bg-emerald-500/10 border-emerald-500/30', text: 'text-emerald-300' },
  personal_reflection: { label: 'Riflessione Coach', bg: 'bg-amber-500/10 border-amber-500/30', text: 'text-amber-300' },
  system_improvement: { label: 'Miglioramento Metodo', bg: 'bg-rose-500/10 border-rose-500/30', text: 'text-rose-300' },
};

const PRIORITY_LABELS: Record<InboxPriority, { label: string; color: string }> = {
  urgent: { label: 'Urgente', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
  high: { label: 'Alta', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  medium: { label: 'Media', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  low: { label: 'Bassa', color: 'bg-slate-700/40 text-slate-400 border-slate-700' },
};

export const InboxEntryCard: React.FC<InboxEntryCardProps> = ({ entry, onOpenContentModal }) => {
  const { reprocess, archiveEntry, deleteEntryById, linkAthlete, convertToTaskAction, convertToContentAction } = useInbox();
  const { athletes } = useAthletes();

  const [showRawContent, setShowRawContent] = useState(false);
  const [showAthleteSelect, setShowAthleteSelect] = useState(false);
  const [convertingTaskId, setConvertingTaskId] = useState<string | null>(null);

  const categoryMeta = entry.ai_category ? CATEGORY_LABELS[entry.ai_category] : null;
  const priorityMeta = entry.ai_priority ? PRIORITY_LABELS[entry.ai_priority] : PRIORITY_LABELS.medium;
  const relatedAthlete = athletes.find((a) => a.id === entry.related_athlete_id);

  const handleConvertTask = async (taskText: string) => {
    setConvertingTaskId(taskText);
    try {
      await convertToTaskAction(entry, taskText);
    } finally {
      setConvertingTaskId(null);
    }
  };

  return (
    <div className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
      entry.status === 'archived'
        ? 'bg-slate-950/40 border-slate-900 opacity-60'
        : entry.status === 'converted_content'
        ? 'bg-slate-900/60 border-purple-500/30'
        : entry.status === 'converted_task'
        ? 'bg-slate-900/60 border-emerald-500/30'
        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 shadow-lg'
    }`}>
      
      {/* HEADER CARD */}
      <div className="p-5 border-b border-slate-800/80 flex items-start justify-between gap-4">
        <div className="space-y-1.5 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {categoryMeta && (
              <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${categoryMeta.bg} ${categoryMeta.text}`}>
                {categoryMeta.label}
              </span>
            )}
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${priorityMeta.color}`}>
              {priorityMeta.label}
            </span>
            {entry.status === 'raw' && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                ⚪ Bozza Grezza
              </span>
            )}
            {entry.status === 'processed' && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                🟡 Da Smistare
              </span>
            )}
            {entry.status === 'converted_content' && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                <Video className="w-3 h-3" /> Convertito in Contenuto
              </span>
            )}
            {entry.status === 'converted_task' && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Convertito in Task
              </span>
            )}
            <span className="text-[11px] text-slate-500 font-mono">
              {new Date(entry.created_at).toLocaleDateString('it-IT', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          <h3 className="text-base font-black text-white tracking-tight">
            {entry.ai_title || entry.raw_content.slice(0, 60)}
          </h3>
        </div>

        {/* AZIONI DI TESTATA */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => reprocess(entry)}
            title="Rielabora con Gemini AI"
            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => archiveEntry(entry.id)}
            title={entry.status === 'archived' ? 'Archiviato' : 'Archivia voce'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <Archive className="w-4 h-4" />
          </button>
          <button
            onClick={() => deleteEntryById(entry.id)}
            title="Elimina definitivamente"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CORPO DELLA CARD */}
      <div className="p-5 space-y-4">
        {/* RIASSUNTO SINTETICO AI */}
        {entry.ai_summary && (
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Sintesi Operativa:
            </div>
            <p className="text-xs text-slate-200 font-medium leading-relaxed">
              {entry.ai_summary}
            </p>
          </div>
        )}

        {/* PROSSIMA AZIONE RACCOMANDATA (NEXT STEP) */}
        {entry.ai_next_step && (
          <div className="flex items-center gap-2.5 text-xs text-sky-300 bg-sky-500/10 border border-sky-500/30 p-3 rounded-xl shadow-sm">
            <ArrowRight className="w-4 h-4 text-sky-400 shrink-0" />
            <span>
              <strong className="text-sky-200">Next Action:</strong> {entry.ai_next_step}
            </span>
          </div>
        )}

        {/* BOX OPPORTUNITÀ CONTENUTO INSTAGRAM */}
        {entry.ai_content_opportunity?.hasOpportunity && (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-950 border border-purple-500/40 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shadow-md">
                  <Video className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-purple-200">
                    Opportunità Contenuto: {entry.ai_content_opportunity.suggestedType.toUpperCase()}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-900/60 text-purple-300 border border-purple-700/50 ml-2">
                    {entry.ai_content_opportunity.pillar}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  if (onOpenContentModal) {
                    onOpenContentModal(entry);
                  } else {
                    convertToContentAction(entry);
                  }
                }}
                className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-purple-500/20 transition cursor-pointer"
              >
                <Video className="w-3.5 h-3.5" />
                Trasforma in Reel / Post
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* HOOK PRIMI 3 SECONDI IN EVIDENZA ORO */}
            {entry.ai_content_opportunity.hook && (
              <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/40 shadow-inner">
                <div className="text-[10px] font-black text-amber-400 uppercase tracking-wider mb-1">
                  🔥 Hook Primi 3 Secondi:
                </div>
                <p className="text-xs font-bold text-amber-100 italic">
                  "{entry.ai_content_opportunity.hook}"
                </p>
              </div>
            )}

            {/* SCALETTA & CTA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
              {entry.ai_content_opportunity.scriptOutline && (
                <div className="text-slate-400 text-[11px] p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                  <strong className="text-slate-300 block mb-0.5">Scaletta Scene:</strong>
                  {entry.ai_content_opportunity.scriptOutline}
                </div>
              )}
              {entry.ai_content_opportunity.callToAction && (
                <div className="text-slate-400 text-[11px] p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                  <strong className="text-slate-300 block mb-0.5">Call to Action (CTA):</strong>
                  {entry.ai_content_opportunity.callToAction}
                </div>
              )}
            </div>
          </div>
        )}

        {/* BOX TASK ESTRATTE */}
        {entry.ai_suggested_tasks && entry.ai_suggested_tasks.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-emerald-500/30 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
              <ListTodo className="w-3.5 h-3.5 text-emerald-400" />
              Task Operative Estratte:
            </div>
            <div className="space-y-1.5">
              {entry.ai_suggested_tasks.map((taskText, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 text-xs transition gap-2"
                >
                  <span className="text-slate-200 font-medium">• {taskText}</span>
                  <button
                    onClick={() => handleConvertTask(taskText)}
                    disabled={convertingTaskId === taskText}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 shrink-0 transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    Aggiungi alle Task
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TESTO GREZZO ORIGINALE TOGGLE */}
        <div className="text-xs pt-1">
          <button
            onClick={() => setShowRawContent(!showRawContent)}
            className="text-slate-500 hover:text-slate-300 flex items-center gap-1 font-mono transition text-[11px]"
          >
            {showRawContent ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showRawContent ? 'Nascondi appunto originale' : 'Mostra appunto grezzo originale'}
          </button>
          {showRawContent && (
            <div className="mt-2 p-3 rounded-xl bg-slate-950/90 border border-slate-800 text-slate-400 font-sans whitespace-pre-wrap animate-fadeIn text-xs">
              {entry.raw_content}
            </div>
          )}
        </div>
      </div>

      {/* FOOTER AZIONI E COLLEGAMENTI */}
      <div className="px-5 py-3 bg-slate-950/60 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* COLLEGAMENTO ATLETA */}
        <div className="flex items-center gap-2">
          <User className="w-3.5 h-3.5 text-slate-500" />
          {relatedAthlete ? (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-300 font-semibold">{relatedAthlete.fullName}</span>
              <button
                onClick={() => linkAthlete(entry.id, null)}
                className="text-[10px] text-slate-500 hover:text-rose-400"
              >
                (scollega)
              </button>
            </div>
          ) : showAthleteSelect ? (
            <select
              onChange={(e) => {
                linkAthlete(entry.id, e.target.value || null);
                setShowAthleteSelect(false);
              }}
              className="bg-slate-900 border border-slate-700 rounded text-xs text-white p-1"
            >
              <option value="">Seleziona atleta...</option>
              {athletes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.fullName}
                </option>
              ))}
            </select>
          ) : (
            <button
              onClick={() => setShowAthleteSelect(true)}
              className="text-slate-500 hover:text-slate-300 underline text-[11px]"
            >
              Collega ad atleta
            </button>
          )}
        </div>

        {/* AZIONI DIRETTE */}
        <div className="flex items-center gap-2">
          {entry.converted_content_id && (
            <a
              href={`/coach/contents`}
              className="text-purple-400 hover:underline text-[11px] flex items-center gap-1"
            >
              Vedi Contenuto <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
