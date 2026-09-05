import React from 'react';
import {
  Calendar,
  ChevronRight,
  ChevronLeft,
  Edit2,
  Trash2,
  Copy,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { InstagramContent, ContentType, ContentPillar, ContentStatus } from '../../types/inboxAndContent';
import { useContents } from '../../context/ContentsContext';
import { useToast } from '../../context/ToastContext';

interface ContentPipelineCardProps {
  content: InstagramContent;
  onEdit: (content: InstagramContent) => void;
  canMovePrev?: boolean;
  canMoveNext?: boolean;
  onMovePrev?: () => void;
  onMoveNext?: () => void;
}

const TYPE_BADGES: Record<ContentType, { label: string; bg: string; text: string; border: string }> = {
  reel: { label: '🎬 Reel', bg: 'bg-purple-500/15', text: 'text-purple-300', border: 'border-purple-500/30' },
  story: { label: '📱 Story', bg: 'bg-pink-500/15', text: 'text-pink-300', border: 'border-pink-500/30' },
  carousel: { label: '📑 Carosello', bg: 'bg-indigo-500/15', text: 'text-indigo-300', border: 'border-indigo-500/30' },
  post: { label: '🖼️ Post', bg: 'bg-blue-500/15', text: 'text-blue-300', border: 'border-blue-500/30' },
};

const PILLAR_BADGES: Record<ContentPillar, { label: string; color: string }> = {
  technique_execution: { label: '🏋️ Tecnica', color: 'bg-blue-500/10 text-blue-300 border-blue-500/30' },
  common_mistakes: { label: '❌ Errori', color: 'bg-rose-500/10 text-rose-300 border-rose-500/30' },
  mindset_discipline: { label: '🧠 Mindset', color: 'bg-amber-500/10 text-amber-300 border-amber-500/30' },
  nutrition_science: { label: '🥗 Nutrizione', color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
  client_transformation: { label: '⭐ Risultati', color: 'bg-purple-500/10 text-purple-300 border-purple-500/30' },
  coaching_faq: { label: '💬 FAQ', color: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30' },
  authority_lifestyle: { label: '👑 Authority', color: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30' },
  promotion_launch: { label: '🚀 Lanci', color: 'bg-orange-500/10 text-orange-300 border-orange-500/30' },
};

const ACTION_CTA_CONFIG: Partial<Record<ContentStatus, { label: string; nextStatus: ContentStatus; colorClass: string }>> = {
  idea: {
    label: 'Inizia script',
    nextStatus: 'script_draft',
    colorClass: 'bg-slate-900 hover:bg-amber-500/15 text-slate-200 hover:text-amber-300 border-slate-800 hover:border-amber-500/40',
  },
  script_draft: {
    label: 'Prepara registrazione',
    nextStatus: 'ready_to_record',
    colorClass: 'bg-slate-900 hover:bg-amber-500/20 text-amber-200 hover:text-amber-300 border-slate-800 hover:border-amber-500/50',
  },
  ready_to_record: {
    label: 'Invia al montaggio',
    nextStatus: 'editing',
    colorClass: 'bg-slate-900 hover:bg-purple-500/20 text-purple-200 hover:text-purple-300 border-slate-800 hover:border-purple-500/50',
  },
  editing: {
    label: 'Prepara pubblicazione',
    nextStatus: 'ready_to_publish',
    colorClass: 'bg-slate-900 hover:bg-emerald-500/20 text-emerald-200 hover:text-emerald-300 border-slate-800 hover:border-emerald-500/50',
  },
  recorded: {
    label: 'Invia al montaggio',
    nextStatus: 'editing',
    colorClass: 'bg-slate-900 hover:bg-purple-500/20 text-purple-200 hover:text-purple-300 border-slate-800 hover:border-purple-500/50',
  },
  ready_to_publish: {
    label: 'Segna pubblicato',
    nextStatus: 'published',
    colorClass: 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/40',
  },
};

export const ContentPipelineCard: React.FC<ContentPipelineCardProps> = ({
  content,
  onEdit,
  canMovePrev,
  canMoveNext,
  onMovePrev,
  onMoveNext,
}) => {
  const { deleteContentById, createContent, moveStatus } = useContents();
  const { showSuccess } = useToast();

  const typeBadge = TYPE_BADGES[content.type] || TYPE_BADGES.reel;
  const pillarBadge = PILLAR_BADGES[content.pillar] || PILLAR_BADGES.technique_execution;

  // Warning contestuali
  const warnings: string[] = [];
  if (content.status === 'ready_to_record' && !content.script_body?.trim()) {
    warnings.push('Manca script');
  }
  if (
    content.status === 'ready_to_publish' &&
    content.type === 'carousel' &&
    (!content.carousel_data || !content.carousel_data.slides || content.carousel_data.slides.length === 0)
  ) {
    warnings.push('Slide mancanti');
  }
  if (
    content.status === 'ready_to_publish' &&
    content.type === 'story' &&
    (!content.story_data || !content.story_data.stories || content.story_data.stories.length === 0)
  ) {
    warnings.push('Stories non generate');
  }
  if (content.scheduled_for && content.status !== 'published') {
    const schedDate = new Date(content.scheduled_for);
    if (schedDate < new Date() && schedDate.toDateString() !== new Date().toDateString()) {
      warnings.push('Data passata');
    }
  }

  // Azione orientata alla prossima fase
  const actionConfig = ACTION_CTA_CONFIG[content.status];

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (actionConfig) {
      moveStatus(content.id, actionConfig.nextStatus);
      showSuccess(`Avanzato: ${actionConfig.label}`);
    } else if (onMoveNext) {
      onMoveNext();
    }
  };

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
      className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800/90 hover:border-amber-500/50 shadow-md space-y-2.5 transition-all duration-200 group cursor-pointer relative hover:-translate-y-0.5"
    >
      {/* 1. HEADER: FORMATO, PILASTRO & WARNING */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <span className={`text-[10px] font-black font-mono px-2 py-0.5 rounded-md border ${typeBadge.bg} ${typeBadge.text} ${typeBadge.border}`}>
            {typeBadge.label}
          </span>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${pillarBadge.color} truncate max-w-[110px]`}>
            {pillarBadge.label}
          </span>
        </div>

        {warnings.length > 0 && (
          <span
            className="text-[9px] font-bold text-amber-300 bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0"
            title={warnings.join(', ')}
          >
            <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
            <span>{warnings[0]}</span>
          </span>
        )}
      </div>

      {/* 2. TITOLO CONTENUTO (LINE CLAMP 2, NO HOOK COMPLETO NELLA CARD) */}
      <h4 className="text-xs font-black text-white group-hover:text-amber-400 transition leading-snug line-clamp-2">
        {content.title || 'Senza Titolo'}
      </h4>

      {/* 3. DATA & STATO */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
        {content.scheduled_for ? (
          <div className="flex items-center gap-1 text-amber-300 font-semibold">
            <Calendar className="w-3 h-3 text-amber-400" />
            <span>
              {new Date(content.scheduled_for).toLocaleDateString('it-IT', {
                day: '2-digit',
                month: 'short',
              })}
            </span>
          </div>
        ) : (
          <span className="text-slate-500">Non programmato</span>
        )}

        {content.status === 'published' && (
          <span className="text-emerald-400 font-bold flex items-center gap-1 text-[10px]">
            <CheckCircle2 className="w-3 h-3" /> Pubblicato
          </span>
        )}
      </div>

      {/* 4. PROSSIMA AZIONE (CTA ORIENTATA ALL'AZIONE) */}
      {actionConfig && (
        <button
          type="button"
          onClick={handleActionClick}
          className={`w-full py-2 px-3 rounded-xl border text-[11px] font-black flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm ${actionConfig.colorClass}`}
        >
          <span>{actionConfig.label}</span>
          <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
        </button>
      )}

      {/* 5. BARRA CONTROLLI SOTTOSTANTE: CAMBIO STATO + AZIONI RAPIDE */}
      <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-slate-400 text-xs">
        {/* Frecce Avanzamento Rapido */}
        <div className="flex items-center gap-1">
          {canMovePrev && onMovePrev && (
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
          {canMoveNext && onMoveNext && (
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

        {/* Azioni Modifica / Duplica / Elimina */}
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
            title="Apri nel Drawer"
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
            title="Elimina"
            className="p-1 rounded-lg hover:bg-slate-900 hover:text-rose-400 transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
