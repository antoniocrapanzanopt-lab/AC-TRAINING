import React from 'react';
import {
  Sparkles,
  Video,
  FileText,
  AlertTriangle,
  Bell,
  Users,
  User,
  ExternalLink,
  CheckCircle2,
  Play,
  Download,
  Link as LinkIcon,
  Image as ImageIcon,
  Mail,
  MessageCircle,
} from 'lucide-react';
import {
  BroadcastType,
  CommunicationChannelType,
  CommunicationAttachment,
  CommunicationCta,
} from '../../../types';

interface BroadcastPreviewCardProps {
  title: string;
  type: BroadcastType;
  message: string;
  attachments?: CommunicationAttachment[];
  cta?: CommunicationCta;
  channels: CommunicationChannelType[];
  recipientCount?: number;
  recipientLabel?: string;
  authorName?: string;
}

const typeConfig: Record<BroadcastType, { label: string; icon: React.FC<{ className?: string }>; badgeCls: string }> = {
  update: { label: 'Aggiornamento', icon: Sparkles, badgeCls: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  content_video: { label: 'Video / Contenuto', icon: Video, badgeCls: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  important_alert: { label: 'Avviso Importante', icon: AlertTriangle, badgeCls: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
  reminder: { label: 'Promemoria', icon: Bell, badgeCls: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  group_message: { label: 'Messaggio Gruppo', icon: Users, badgeCls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  single_message: { label: 'Messaggio Singolo', icon: User, badgeCls: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' },
};

export const BroadcastPreviewCard: React.FC<BroadcastPreviewCardProps> = ({
  title,
  type,
  message,
  attachments = [],
  cta,
  channels,
  recipientCount,
  recipientLabel,
  authorName = 'Antonio Crapanzano (Coach)',
}) => {
  const currentType = typeConfig[type] || typeConfig.update;
  const TypeIcon = currentType.icon;

  return (
    <div className="rounded-2xl bg-gradient-to-b from-slate-900 via-slate-950 to-black border border-slate-800 p-5 shadow-2xl space-y-4 text-left relative overflow-hidden">
      {/* Glow effect */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--color-primary)]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Anteprima */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)] font-black text-xs">
            AC
          </div>
          <div>
            <div className="text-xs font-bold text-white leading-tight">{authorName}</div>
            <div className="text-[10px] text-slate-400">AC Coaching Platform</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${currentType.badgeCls}`}>
            <TypeIcon className="w-3 h-3" />
            {currentType.label}
          </span>
        </div>
      </div>

      {/* Titolo e Canali Attivi */}
      <div className="space-y-1.5">
        <h4 className="text-base font-black text-white tracking-tight">
          {title || 'Titolo della Comunicazione'}
        </h4>

        <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-400">
          <span className="font-semibold text-slate-400">Canali:</span>
          {channels.includes('in_app') && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-pink-500/10 text-pink-400 border border-pink-500/20 text-[10px] font-bold">
              <Sparkles className="w-2.5 h-2.5" /> In-App
            </span>
          )}
          {channels.includes('email') && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] font-bold">
              <Mail className="w-2.5 h-2.5" /> Email
            </span>
          )}
          {channels.includes('whatsapp') && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
              <MessageCircle className="w-2.5 h-2.5" /> WhatsApp
            </span>
          )}

          {recipientCount !== undefined && (
            <span className="ml-auto text-[10px] font-bold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700">
              👥 {recipientCount} {recipientLabel || 'destinatari'}
            </span>
          )}
        </div>
      </div>

      {/* Corpo del messaggio */}
      <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-200 leading-relaxed whitespace-pre-line font-normal">
        {message ? (
          message.replace(/{{nome_atleta}}/gi, 'Mario Rossi').replace(/{{nome_proprietario}}/gi, 'Antonio Crapanzano')
        ) : (
          <span className="text-slate-500 italic">Il testo del messaggio comparirà qui...</span>
        )}
      </div>

      {/* Box Allegati */}
      {attachments && attachments.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Allegati inclusi:</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {attachments.map((att) => {
              if (att.type === 'video') {
                return (
                  <div key={att.id} className="p-2.5 rounded-xl bg-purple-950/20 border border-purple-800/40 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold text-white truncate">{att.title || 'Video Tutorial'}</div>
                        <div className="text-[10px] text-purple-300">Video streaming</div>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  </div>
                );
              }
              if (att.type === 'document') {
                return (
                  <div key={att.id} className="p-2.5 rounded-xl bg-blue-950/20 border border-blue-800/40 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold text-white truncate">{att.title || 'Documento PDF'}</div>
                        <div className="text-[10px] text-blue-300">{att.size || 'PDF allegato'}</div>
                      </div>
                    </div>
                    <Download className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  </div>
                );
              }
              if (att.type === 'image') {
                return (
                  <div key={att.id} className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-800/40 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                        <ImageIcon className="w-3.5 h-3.5" />
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold text-white truncate">{att.title || 'Immagine'}</div>
                        <div className="text-[10px] text-emerald-300">Foto allegata</div>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  </div>
                );
              }
              return (
                <div key={att.id} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center shrink-0">
                      <LinkIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold text-white truncate">{att.title || 'Risorsa Web'}</div>
                      <div className="text-[10px] text-slate-400">Link esterno</div>
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CTA Button Renderizzata */}
      {cta && cta.type !== 'none' && cta.label && (
        <div className="pt-2">
          {cta.type === 'confirm_read' ? (
            <button
              type="button"
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-black text-xs flex items-center justify-center gap-2 shadow-lg hover:bg-emerald-500/30 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              {cta.label || 'Conferma Presa Visione'}
            </button>
          ) : cta.type === 'video' ? (
            <button
              type="button"
              className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              {cta.label || 'Guarda il Video'}
            </button>
          ) : (
            <button
              type="button"
              className="w-full py-2.5 px-4 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-black font-black text-xs flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(234,179,8,0.25)] transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              {cta.label || 'Apri Risorsa'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
