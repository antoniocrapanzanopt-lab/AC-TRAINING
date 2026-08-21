import React from 'react';
import {
  Calendar,
  ChevronRight,
  ChevronLeft,
  Edit2,
  Trash2,
  Copy,
  Sparkles,
} from 'lucide-react';
import { InstagramContent, ContentType, ContentPillar } from '../../types/inboxAndContent';
import { useContents } from '../../context/ContentsContext';
import { useToast } from '../../context/ToastContext';

interface ContentPipelineCardProps {
  content: InstagramContent;
  onEdit: (content: InstagramContent) => void;
  advanceActionLabel?: string;
  canMovePrev: boolean;
  canMoveNext: boolean;
  onMovePrev: () => void;
  onMoveNext: () => void;
}

const TYPE_BADGES: Record<ContentType, { label: string; bg: string; text: string; border: string }> = {
  reel: { label: '🎬 Reel', bg: 'bg-purple-500/15', text: 'text-purple-300', border: 'border-purple-500/30' },
  story: { label: '📱 Storia', bg: 'bg-pink-500/15', text: 'text-pink-300', border: 'border-pink-500/30' },
  carousel: { label: '📑 Carosello', bg: 'bg-indigo-500/15', text: 'text-indigo-300', border: 'border-indigo-500/30' },
  post: { label: '🖼️ Post Singolo', bg: 'bg-blue-500/15', text: 'text-blue-300', border: 'border-blue-500/30' },
};

const PILLAR_BADGES: Record<ContentPillar, { label: string; color: string }> = {
  technique_execution: { label: '🏋️ Tecnica', color: 'bg-blue-500/10 text-blue-300 border-blue-500/30' },
  common_mistakes: { label: '❌ Errori Comuni', color: 'bg-rose-500/10 text-rose-300 border-rose-500/30' },
  mindset_discipline: { label: '🧠 Mindset', color: 'bg-amber-500/10 text-amber-300 border-amber-500/30' },
  nutrition_science: { label: '🥗 Nutrizione', color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
  client_transformation: { label: '⭐ Risultati', color: 'bg-purple-500/10 text-purple-300 border-purple-500/30' },
  coaching_faq: { label: '💬 FAQ', color: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30' },
  authority_lifestyle: { label: '👑 Authority', color: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30' },
  promotion_launch: { label: '🚀 Lanci', color: 'bg-orange-500/10 text-orange-300 border-orange-500/30' },
};

export const ContentPipelineCard: React.FC<ContentPipelineCardProps> = ({
  content,
  onEdit,
  advanceActionLabel,
  canMovePrev,
  canMoveNext,
  onMovePrev,
  onMoveNext,
}) => {
  const { deleteContentById, createContent } = useContents();
  const { showSuccess } = useToast();

  const typeBadge = TYPE_BADGES[content.type] || TYPE_BADGES.reel;
  const pillarBadge = PILLAR_BADGES[content.pillar] || PILLAR_BADGES.technique_execution;

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await createContent({
        title: `${content.title} (Copia)`,
        type: content.type,
        pillar: content.pillar,
        status: 'idea',
        hook: content.hook,
        script_body: content.script_body,
        caption: content.caption,
        call_to_action: content.call_to_action,
        internal_notes: content.internal_notes,
      });
      showSuccess('Contenuto duplicato nelle Idee!');
    } catch {
      // Handled in context
    }
  };

  return (
    <div
      onClick={() => onEdit(content)}
      className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800/90 hover:border-amber-500/50 shadow-xl space-y-3 transition-all duration-200 group cursor-pointer relative hover:-translate-y-0.5"
    >
      {/* HEADER CARD: FORMATO, PILASTRO & ORIGINE */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-[10px] font-black font-mono px-2 py-0.5 rounded-md border ${typeBadge.bg} ${typeBadge.text} ${typeBadge.border}`}>
            {typeBadge.label}
          </span>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${pillarBadge.color}`}>
            {pillarBadge.label}
          </span>
        </div>

        {content.origin_inbox_id && (
          <span className="text-purple-300 text-[9px] font-bold flex items-center gap-1 bg-purple-500/15 px-1.5 py-0.5 rounded-md border border-purple-500/30">
            <Sparkles className="w-2.5 h-2.5 text-purple-400" /> Da AI
          </span>
        )}
      </div>

      {/* TITOLO CONTENUTO */}
      <h4 className="text-xs font-black text-white group-hover:text-amber-400 transition leading-snug line-clamp-2">
        {content.title}
      </h4>

      {/* ANTEPRIMA HOOK PRIMI 3 SECONDI (EVIDENZA DORATA) */}
      {content.hook ? (
        <div className="p-2.5 rounded-xl bg-slate-900/90 border-l-2 border-l-amber-400 border-y border-r border-slate-800/80 text-[11px] text-amber-100 italic line-clamp-2 font-medium">
          <span className="text-[9px] font-bold text-amber-400 not-italic block uppercase tracking-wider mb-0.5">
            🔥 Hook:
          </span>
          "{content.hook}"
        </div>
      ) : content.script_body ? (
        <p className="text-[11px] text-slate-400 line-clamp-2 italic bg-slate-900/60 p-2 rounded-xl border border-slate-800/60">
          {content.script_body}
        </p>
      ) : null}

      {/* DATA PROGRAMMATA & CTA TAGS */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px] text-slate-400 font-mono pt-0.5">
        {content.scheduled_for ? (
          <div className="flex items-center gap-1 text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
            <Calendar className="w-3 h-3" />
            {new Date(content.scheduled_for).toLocaleDateString('it-IT', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        ) : (
          <span className="text-slate-500 text-[10px]">Non programmato</span>
        )}

        {content.call_to_action && (
          <span className="text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md text-[9px] font-bold truncate max-w-[140px]" title={content.call_to_action}>
            CTA: {content.call_to_action}
          </span>
        )}
      </div>

      {/* PULSANTE RAPIDO AVANZAMENTO FASE */}
      {advanceActionLabel && canMoveNext && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMoveNext();
          }}
          className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-amber-500/15 text-slate-200 hover:text-amber-300 border border-slate-800 hover:border-amber-500/40 text-[10px] font-black flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
        >
          <span>{advanceActionLabel}</span>
          <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
        </button>
      )}

      {/* BARRA AZIONI CARD */}
      <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-slate-400">
        <div className="flex items-center gap-1">
          {canMovePrev && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMovePrev();
              }}
              title="Fase precedente"
              className="p-1 rounded-lg hover:bg-slate-900 hover:text-white transition cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}
          {canMoveNext && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMoveNext();
              }}
              title="Fase successiva"
              className="p-1 rounded-lg hover:bg-slate-900 hover:text-white transition cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleDuplicate}
            title="Duplica contenuto"
            className="p-1 rounded-lg hover:bg-slate-900 hover:text-sky-400 transition cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(content);
            }}
            title="Modifica contenuto"
            className="p-1 rounded-lg hover:bg-slate-900 hover:text-amber-400 transition cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              deleteContentById(content.id);
            }}
            title="Elimina definitivamente"
            className="p-1 rounded-lg hover:bg-slate-900 hover:text-rose-400 transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
