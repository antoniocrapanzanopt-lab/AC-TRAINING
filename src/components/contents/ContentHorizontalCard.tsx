import React, { useState } from 'react';
import {
  Calendar,
  Sparkles,
  Edit2,
  Trash2,
  Copy,
  Check,
  ChevronRight,
  Flame,
  Share2,
} from 'lucide-react';
import {
  InstagramContent,
  ContentStatus,
  ContentType,
  ContentPillar,
} from '../../types/inboxAndContent';
import { useContents } from '../../context/ContentsContext';
import { useToast } from '../../context/ToastContext';

interface ContentHorizontalCardProps {
  content: InstagramContent;
  onEdit: (content: InstagramContent) => void;
}

const TYPE_CONFIG: Record<ContentType, { label: string; bg: string; text: string; border: string }> = {
  reel: { label: '🎬 REEL', bg: 'bg-purple-500/15', text: 'text-purple-300', border: 'border-purple-500/30' },
  story: { label: '📱 STORIA', bg: 'bg-pink-500/15', text: 'text-pink-300', border: 'border-pink-500/30' },
  carousel: { label: '📑 CAROSELLO', bg: 'bg-indigo-500/15', text: 'text-indigo-300', border: 'border-indigo-500/30' },
  post: { label: '🖼️ POST', bg: 'bg-blue-500/15', text: 'text-blue-300', border: 'border-blue-500/30' },
};

const PILLAR_CONFIG: Record<ContentPillar, { label: string; color: string }> = {
  technique_execution: { label: '🏋️ Tecnica', color: 'bg-blue-500/10 text-blue-300 border-blue-500/20' },
  common_mistakes: { label: '❌ Errori Comuni', color: 'bg-rose-500/10 text-rose-300 border-rose-500/20' },
  mindset_discipline: { label: '🧠 Mindset', color: 'bg-amber-500/10 text-amber-300 border-amber-500/20' },
  nutrition_science: { label: '🥗 Nutrizione', color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' },
  client_transformation: { label: '⭐ Risultati Clienti', color: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20' },
  coaching_faq: { label: '💬 FAQ Coaching', color: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20' },
  authority_lifestyle: { label: '👑 Authority', color: 'bg-purple-500/10 text-purple-300 border-purple-500/20' },
  promotion_launch: { label: '🚀 Promozione', color: 'bg-orange-500/10 text-orange-300 border-orange-500/20' },
};

const PIPELINE_STEPS: { status: ContentStatus; label: string; short: string }[] = [
  { status: 'idea', label: 'Idea', short: '💡 Idea' },
  { status: 'script_draft', label: 'Script', short: '📝 Script' },
  { status: 'ready_to_record', label: 'Video', short: '🎬 Registra' },
  { status: 'editing', label: 'Monta', short: '✂️ Monta' },
  { status: 'ready_to_publish', label: 'Pronto', short: '🚀 Pronto' },
  { status: 'published', label: 'Pubblicato', short: '✅ Fatto' },
];

export const ContentHorizontalCard: React.FC<ContentHorizontalCardProps> = ({
  content,
  onEdit,
}) => {
  const { moveStatus, deleteContentById, createContent } = useContents();
  const { showSuccess } = useToast();
  const [copiedHook, setCopiedHook] = useState(false);

  const typeConfig = TYPE_CONFIG[content.type] || TYPE_CONFIG.reel;
  const pillarConfig = PILLAR_CONFIG[content.pillar] || PILLAR_CONFIG.technique_execution;

  const currentStepIdx = PIPELINE_STEPS.findIndex((s) => s.status === content.status);

  const getNextAction = (): { label: string; nextStatus: ContentStatus } | null => {
    switch (content.status) {
      case 'idea':
        return { label: 'Sposta in 📝 Script in Bozza', nextStatus: 'script_draft' };
      case 'script_draft':
        return { label: 'Sposta in 🎬 Da Registrare', nextStatus: 'ready_to_record' };
      case 'ready_to_record':
        return { label: 'Sposta in ✂️ In Montaggio', nextStatus: 'editing' };
      case 'editing':
        return { label: 'Sposta in 🚀 Pronti per Instagram', nextStatus: 'ready_to_publish' };
      case 'ready_to_publish':
        return { label: 'Sposta in ✅ Archivio Pubblicati', nextStatus: 'published' };
      default:
        return null;
    }
  };

  const nextAction = getNextAction();

  const handleAdvance = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!nextAction) return;
    try {
      await moveStatus(content.id, nextAction.nextStatus);
      if (nextAction.nextStatus === 'script_draft') {
        showSuccess('Spostato nella cartella "📝 Script in Bozza"!');
      } else if (nextAction.nextStatus === 'ready_to_record') {
        showSuccess('Spostato nella cartella "🎬 Da Registrare"!');
      } else if (nextAction.nextStatus === 'editing') {
        showSuccess('Spostato nella cartella "✂️ In Montaggio"!');
      } else if (nextAction.nextStatus === 'ready_to_publish') {
        showSuccess('Spostato nella cartella "🚀 Pronti per Instagram"!');
      } else if (nextAction.nextStatus === 'published') {
        showSuccess('Spostato nella cartella "✅ Archivio Pubblicati"!');
      }
    } catch {
      // Gestito nel context
    }
  };

  const handleSetStep = async (e: React.MouseEvent, targetStatus: ContentStatus, stepLabel: string) => {
    e.stopPropagation();
    try {
      await moveStatus(content.id, targetStatus);
      if (targetStatus === 'published') {
        showSuccess('Contenuto pubblicato e spostato nell\'Archivio!');
      } else {
        showSuccess(`Stato impostato su: ${stepLabel}`);
      }
    } catch {
      // Gestito nel context
    }
  };

  const handleCopyHook = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!content.hook) return;
    navigator.clipboard.writeText(content.hook);
    setCopiedHook(true);
    showSuccess('Hook copiato negli appunti!');
    setTimeout(() => setCopiedHook(false), 2000);
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
      className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800/90 hover:border-amber-500/40 shadow-xl transition-all duration-200 group cursor-pointer relative backdrop-blur-sm hover:bg-slate-900/80"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        
        {/* SEZIONE 1: METADATI & TITOLO (Lg: 4/12) */}
        <div className="lg:col-span-4 space-y-2.5">
          {/* BADGES FORMATO, PILASTRO & ORIGINE */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[10px] font-black font-mono px-2.5 py-0.5 rounded-lg border ${typeConfig.bg} ${typeConfig.text} ${typeConfig.border}`}>
              {typeConfig.label}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${pillarConfig.color}`}>
              {pillarConfig.label}
            </span>
            {content.origin_inbox_id && (
              <span className="text-[10px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-lg flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> Da Inbox AI
              </span>
            )}
          </div>

          {/* TITOLO PRINCIPALE */}
          <h3 className="text-base font-black text-white group-hover:text-amber-400 transition leading-snug">
            {content.title}
          </h3>

          {/* DATA PUBBLICAZIONE & METADATI */}
          <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
            {content.scheduled_for ? (
              <div className="flex items-center gap-1.5 text-amber-300 font-semibold bg-amber-500/10 px-2.5 py-0.5 rounded-md border border-amber-500/20">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                {new Date(content.scheduled_for).toLocaleDateString('it-IT', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            ) : (
              <span className="text-slate-500 text-[11px]">Non programmato</span>
            )}

            {content.call_to_action && (
              <div className="flex items-center gap-1 text-emerald-400 text-[11px] font-semibold truncate max-w-[180px]" title={content.call_to_action}>
                <Share2 className="w-3 h-3 shrink-0" />
                <span className="truncate">{content.call_to_action}</span>
              </div>
            )}
          </div>
        </div>

        {/* SEZIONE 2: ANTEPRIMA HOOK DEI PRIMI 3 SECONDI (Lg: 5/12) */}
        <div className="lg:col-span-5 space-y-1.5">
          {content.hook ? (
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border-l-4 border-l-amber-400 border-y border-r border-slate-800/80 shadow-inner relative group/hook">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  Hook Iniziale (Primi 3 Secondi)
                </span>
                <button
                  type="button"
                  onClick={handleCopyHook}
                  className="text-[10px] font-bold text-slate-400 hover:text-amber-300 flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800 transition cursor-pointer"
                >
                  {copiedHook ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiedHook ? 'Copiato!' : 'Copia Hook'}
                </button>
              </div>
              <p className="text-xs text-amber-100/90 italic font-medium leading-relaxed line-clamp-2">
                "{content.hook}"
              </p>
            </div>
          ) : content.script_body ? (
            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Scaletta Scene:</span>
              <p className="text-xs text-slate-300 line-clamp-2 font-mono">
                {content.script_body}
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-slate-950/40 border border-dashed border-slate-800 text-center">
              <span className="text-xs text-slate-500 font-mono">Nessun hook o script inserito</span>
            </div>
          )}
        </div>

        {/* SEZIONE 3: STEP BAR INTERATTIVA & AZIONI RAPIDE (Lg: 3/12) */}
        <div className="lg:col-span-3 flex flex-col justify-between gap-3 border-t lg:border-t-0 lg:border-l border-slate-800/80 pt-3 lg:pt-0 lg:pl-5">
          
          {/* STEP BAR ORIZZONTALE CON CAMBIO STATO RAPIDO */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
              <span>Stato Pipeline:</span>
              <span className="text-amber-400 font-mono font-bold">
                {PIPELINE_STEPS[currentStepIdx]?.label || 'In Lavorazione'}
              </span>
            </div>

            {/* BARRA DEI 6 STEP INTERATTIVI */}
            <div className="grid grid-cols-6 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {PIPELINE_STEPS.map((step, idx) => {
                const isActive = step.status === content.status;
                const isPassed = idx <= currentStepIdx;

                return (
                  <button
                    key={step.status}
                    type="button"
                    title={`Imposta su: ${step.label}`}
                    onClick={(e) => handleSetStep(e, step.status, step.label)}
                    className={`h-2.5 rounded-md transition-all cursor-pointer ${
                      isActive
                        ? 'bg-amber-400 shadow-md shadow-amber-500/30'
                        : isPassed
                        ? 'bg-amber-500/40 hover:bg-amber-500/60'
                        : 'bg-slate-800 hover:bg-slate-700'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* PULSANTE AVANZA FASE PRIMARIO O RIUTILIZZA */}
          {content.status === 'published' ? (
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={handleDuplicate}
                className="w-full py-2 px-3 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
              >
                <span>♻️ Riproponi come Nuova Idea</span>
              </button>
              <button
                type="button"
                onClick={(e) => handleSetStep(e, 'ready_to_publish', 'Pronti per Instagram')}
                className="w-full text-center text-[10px] text-slate-500 hover:text-slate-300 hover:underline cursor-pointer"
              >
                Ripristina in Lavorazione
              </button>
            </div>
          ) : nextAction ? (
            <button
              type="button"
              onClick={handleAdvance}
              className="w-full py-2 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/10 transition cursor-pointer"
            >
              <span>{nextAction.label}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : null}

          {/* AZIONI ICONICHE (MODIFICA, DUPLICA, ELIMINA) */}
          <div className="flex items-center justify-end gap-1.5 text-slate-400 pt-1">
            <button
              type="button"
              onClick={handleDuplicate}
              className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-sky-400 transition cursor-pointer"
              title="Duplica contenuto"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(content);
              }}
              className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-amber-400 transition cursor-pointer"
              title="Modifica contenuto"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                deleteContentById(content.id);
              }}
              className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-rose-400 transition cursor-pointer"
              title="Elimina"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
