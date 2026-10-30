import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Send,
  Users,
  Pin,
  Trash2,
  Crown,
  Reply,
  X,
  Plus,
  Video,
  Paperclip,
  Download,
  SmilePlus,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { uploadChatAttachment } from '../../lib/chatStorage';
import { SecureChatAttachment } from './SecureChatAttachment';

export interface TeamChatMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_role: 'coach' | 'athlete';
  sender_initials: string;
  content: string;
  is_pinned: boolean;
  reactions: Record<string, string[]>;
  reply_to_id?: string | null;
  reply_preview?: string | null;
  created_at: string;
}

export interface TeamPollPayload {
  question: string;
  options: { id: string; text: string }[];
  allowMultiple?: boolean;
}

interface Attachment {
  file: File;
  previewUrl: string;
  type: 'image' | 'video' | 'file';
}

interface TeamGroupChatProps {
  /** Se true, applica il padding inferiore extra per la bottom-navbar mobile dell'atleta */
  isAthletePortal?: boolean;
  /** Numero di membri del team da mostrare nell'header */
  teamCount?: number;
}

const QUICK_EMOJIS = ['🔥', '💪', '👏', '🏆', '❤️'];
const POLL_PREFIX = '📊 [SONDAGGIO_JSON] ';

const INITIAL_WELCOME_MESSAGE: TeamChatMessage = {
  id: 'welcome-team-pin-01',
  sender_id: 'coach-system',
  sender_name: 'Coach AC Training',
  sender_role: 'coach',
  sender_initials: 'AC',
  content:
    'Benvenuti nella Community Ufficiale del Team! 🏆🔥\nQui potete condividere i vostri traguardi, motivarvi a vicenda, fare domande generali sull\'allenamento e ricevere gli avvisi importanti del Coach.',
  is_pinned: true,
  reactions: { '🔥': ['coach-system'], '💪': ['coach-system'] },
  created_at: new Date(Date.now() - 3600 * 1000).toISOString(),
};

const getInitials = (name: string): string => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'AT';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const parsePollContent = (content: string): TeamPollPayload | null => {
  if (!content.startsWith(POLL_PREFIX)) return null;
  try {
    const rawJson = content.slice(POLL_PREFIX.length).trim();
    const parsed = JSON.parse(rawJson) as TeamPollPayload;
    if (
      parsed &&
      typeof parsed.question === 'string' &&
      Array.isArray(parsed.options) &&
      parsed.options.length >= 2
    ) {
      return parsed;
    }
  } catch {
    // ignore malformed poll json
  }
  return null;
};

const formatCleanPreviewText = (content: string): string => {
  const poll = parsePollContent(content);
  if (poll) return `📊 Sondaggio: ${poll.question}`;
  return content.replace(/\n+/g, ' ');
};

export const TeamGroupChat: React.FC<TeamGroupChatProps> = ({
  isAthletePortal = false,
  teamCount,
}) => {
  const { user, simulatedRole } = useAuth();
  const { showSuccess, showError } = useToast();

  const [messages, setMessages] = useState<TeamChatMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [newMessage, setNewMessage] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [replyTo, setReplyTo] = useState<TeamChatMessage | null>(null);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);
  const [resolvedAthleteName, setResolvedAthleteName] = useState<string | null>(null);
  const [activeMembersCount, setActiveMembersCount] = useState<number>(teamCount || 24);
  const [usingRealtimeFallback, setUsingRealtimeFallback] = useState<boolean>(false);
  const [isPinnedExpanded, setIsPinnedExpanded] = useState<boolean>(false);

  // Stato Modale Creazione Sondaggio (Solo Coach)
  const [isPollModalOpen, setIsPollModalOpen] = useState<boolean>(false);
  const [pollQuestion, setPollQuestion] = useState<string>('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [pollAllowMultiple, setPollAllowMultiple] = useState<boolean>(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const broadcastChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const isCoachUser = useMemo(() => {
    const isRealCoach =
      user?.role === 'owner' || user?.role === 'coach' || user?.role === 'admin';
    if (!isRealCoach) return false;
    // Se siamo nel Portale Atleta con ruolo simulato 'athlete', mostra la vista da atleta;
    // altrimenti il Coach mantiene tutti gli strumenti (incluso Crea Sondaggio).
    if (isAthletePortal && simulatedRole === 'athlete' && user?.role !== 'owner') {
      return false;
    }
    return true;
  }, [user?.role, isAthletePortal, simulatedRole]);

  // Recupera il nome reale dell'atleta dal DB se nel profilo è generico
  useEffect(() => {
    if (!user?.id) return;
    if (isCoachUser) {
      setResolvedAthleteName(user.name || 'Coach AC');
      return;
    }

    supabase
      .from('athletes')
      .select('first_name, last_name, full_name')
      .eq('auth_user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const full =
            data.full_name ||
            `${data.first_name || ''} ${data.last_name || ''}`.trim();
          if (full) setResolvedAthleteName(full);
        }
      });
  }, [user?.id, user?.name, isCoachUser]);

  // Conta gli atleti attivi se non passati via prop
  useEffect(() => {
    if (teamCount && teamCount > 0) {
      setActiveMembersCount(teamCount);
      return;
    }
    supabase
      .from('athletes')
      .select('id', { count: 'exact', head: true })
      .then(({ count }) => {
        if (typeof count === 'number' && count > 0) {
          setActiveMembersCount(count + 1); // +1 Coach
        }
      });
  }, [teamCount]);

  const currentSenderName = useMemo(() => {
    if (resolvedAthleteName) return resolvedAthleteName;
    if (isCoachUser) return user?.name || 'Coach AC';
    return user?.name || 'Atleta Team';
  }, [resolvedAthleteName, isCoachUser, user?.name]);

  const currentSenderInitials = useMemo(() => {
    if (isCoachUser) return 'AC';
    return getInitials(currentSenderName);
  }, [isCoachUser, currentSenderName]);

  // Caricamento iniziale messaggi da public.team_chat_messages
  const fetchGroupMessages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('team_chat_messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(200);

      if (error) {
        setUsingRealtimeFallback(true);
        setMessages(prev => (prev.length > 0 ? prev : [INITIAL_WELCOME_MESSAGE]));
        return;
      }

      setUsingRealtimeFallback(false);
      if (data && data.length > 0) {
        const mapped: TeamChatMessage[] = data.map(row => ({
          id: String(row.id),
          sender_id: String(row.sender_id),
          sender_name: String(row.sender_name || 'Membro Team'),
          sender_role: row.sender_role === 'coach' ? 'coach' : 'athlete',
          sender_initials: String(row.sender_initials || getInitials(String(row.sender_name || 'AT'))),
          content: String(row.content || ''),
          is_pinned: Boolean(row.is_pinned),
          reactions:
            row.reactions && typeof row.reactions === 'object' && !Array.isArray(row.reactions)
              ? (row.reactions as Record<string, string[]>)
              : {},
          reply_to_id: row.reply_to_id ? String(row.reply_to_id) : null,
          reply_preview: row.reply_preview ? String(row.reply_preview) : null,
          created_at: String(row.created_at),
        }));
        setMessages(mapped);
      } else {
        setMessages([INITIAL_WELCOME_MESSAGE]);
      }
    } catch {
      setUsingRealtimeFallback(true);
      setMessages(prev => (prev.length > 0 ? prev : [INITIAL_WELCOME_MESSAGE]));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroupMessages();

    const channel = supabase
      .channel('team-community-global-room', {
        config: { broadcast: { self: false } },
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'team_chat_messages' },
        () => {
          fetchGroupMessages();
        }
      )
      .on('broadcast', { event: 'team_msg_new' }, ({ payload }) => {
        if (!payload || typeof payload !== 'object') return;
        const incoming = payload as TeamChatMessage;
        setMessages(prev => {
          if (prev.some(m => m.id === incoming.id)) return prev;
          return [...prev, incoming];
        });
      })
      .on('broadcast', { event: 'team_msg_update' }, ({ payload }) => {
        if (!payload || typeof payload !== 'object') return;
        const updated = payload as TeamChatMessage;
        setMessages(prev => prev.map(m => (m.id === updated.id ? updated : m)));
      })
      .on('broadcast', { event: 'team_msg_delete' }, ({ payload }) => {
        if (!payload || typeof payload !== 'object') return;
        const deletedId = (payload as { id?: string }).id;
        if (!deletedId) return;
        setMessages(prev => prev.filter(m => m.id !== deletedId));
      })
      .subscribe();

    broadcastChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      broadcastChannelRef.current = null;
    };
  }, [fetchGroupMessages]);

  // Scroll morbido verso l'ultimo messaggio
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const pinnedMessage = useMemo(() => {
    const pinned = messages.filter(m => m.is_pinned);
    return pinned.length > 0 ? pinned[pinned.length - 1] : null;
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const type = file.type.startsWith('image/')
      ? 'image'
      : file.type.startsWith('video/')
      ? 'video'
      : 'file';

    const previewUrl = URL.createObjectURL(file);
    setAttachment({ file, previewUrl, type });
  };

  const handleRemoveAttachment = () => {
    if (attachment) {
      URL.revokeObjectURL(attachment.previewUrl);
    }
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const publishMessageToGroup = async (finalContent: string, pinByDefault = false) => {
    if (!user) return;

    const replyPreviewText = replyTo
      ? `${replyTo.sender_name}: ${formatCleanPreviewText(replyTo.content).slice(0, 70)}`
      : null;

    const optimisticMsg: TeamChatMessage = {
      id:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `msg-${Date.now()}`,
      sender_id: user.id,
      sender_name: currentSenderName,
      sender_role: isCoachUser ? 'coach' : 'athlete',
      sender_initials: currentSenderInitials,
      content: finalContent,
      is_pinned: pinByDefault,
      reactions: {},
      reply_to_id: replyTo?.id && !replyTo.id.startsWith('welcome-') ? replyTo.id : null,
      reply_preview: replyPreviewText,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setReplyTo(null);

    broadcastChannelRef.current?.send({
      type: 'broadcast',
      event: 'team_msg_new',
      payload: optimisticMsg,
    });

    if (!usingRealtimeFallback) {
      const { error } = await supabase.from('team_chat_messages').insert({
        id: optimisticMsg.id,
        sender_id: optimisticMsg.sender_id,
        sender_name: optimisticMsg.sender_name,
        sender_role: optimisticMsg.sender_role,
        sender_initials: optimisticMsg.sender_initials,
        content: optimisticMsg.content,
        is_pinned: optimisticMsg.is_pinned,
        reactions: {},
        reply_to_id: optimisticMsg.reply_to_id,
        reply_preview: optimisticMsg.reply_preview,
      });

      if (error) {
        setUsingRealtimeFallback(true);
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const textToSend = newMessage.trim();
    if ((!textToSend && !attachment) || !user || isSending) return;

    setIsSending(true);
    try {
      let finalContent = textToSend;

      if (attachment) {
        const uploadedPath = await uploadChatAttachment(attachment.file, 'team-group');
        const mediaTag =
          attachment.type === 'image'
            ? `📷 [Immagine] ${uploadedPath}`
            : attachment.type === 'video'
            ? `🎥 [Video] ${uploadedPath}`
            : `📎 [File] ${attachment.file.name}\n${uploadedPath}`;

        finalContent = textToSend ? `${textToSend}\n\n${mediaTag}` : mediaTag;
        handleRemoveAttachment();
      }

      setNewMessage('');
      await publishMessageToGroup(finalContent, false);
    } catch {
      showError('Impossibile inviare il messaggio nel gruppo');
    } finally {
      setIsSending(false);
    }
  };

  // Creazione Sondaggio (Solo Coach)
  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCoachUser || !user) return;

    const cleanQuestion = pollQuestion.trim();
    const cleanOptions = pollOptions.map(o => o.trim()).filter(Boolean);

    if (!cleanQuestion) {
      showError('Inserisci la domanda del sondaggio');
      return;
    }
    if (cleanOptions.length < 2) {
      showError('Inserisci almeno 2 opzioni di risposta');
      return;
    }

    const payload: TeamPollPayload = {
      question: cleanQuestion,
      options: cleanOptions.map((text, idx) => ({
        id: `opt_${idx}`,
        text,
      })),
      allowMultiple: pollAllowMultiple,
    };

    const encodedContent = `${POLL_PREFIX}${JSON.stringify(payload)}`;
    setIsPollModalOpen(false);
    setPollQuestion('');
    setPollOptions(['', '']);
    setPollAllowMultiple(false);

    await publishMessageToGroup(encodedContent, false);
    showSuccess('Sondaggio pubblicato nella Community!');
  };

  // Voto su un'opzione del sondaggio (salvato in msg.reactions["poll_opt_X"])
  const handleVotePoll = async (
    msg: TeamChatMessage,
    optionId: string,
    allowMultiple?: boolean
  ) => {
    if (!user?.id) return;
    const voteKey = `poll_${optionId}`;
    const updatedReactions: Record<string, string[]> = { ...msg.reactions };

    const currentVotersForOpt = updatedReactions[voteKey] || [];
    const alreadyVotedThis = currentVotersForOpt.includes(user.id);

    if (!allowMultiple) {
      // Rimuovi eventuale voto precedente dell'utente dalle altre opzioni del sondaggio
      Object.keys(updatedReactions).forEach(k => {
        if (k.startsWith('poll_') && k !== voteKey) {
          const filtered = (updatedReactions[k] || []).filter(uid => uid !== user.id);
          if (filtered.length === 0) {
            delete updatedReactions[k];
          } else {
            updatedReactions[k] = filtered;
          }
        }
      });
    }

    const nextVoters = alreadyVotedThis
      ? currentVotersForOpt.filter(uid => uid !== user.id)
      : [...currentVotersForOpt, user.id];

    if (nextVoters.length === 0) {
      delete updatedReactions[voteKey];
    } else {
      updatedReactions[voteKey] = nextVoters;
    }

    const updatedMsg: TeamChatMessage = {
      ...msg,
      reactions: updatedReactions,
    };

    setMessages(prev => prev.map(m => (m.id === msg.id ? updatedMsg : m)));

    broadcastChannelRef.current?.send({
      type: 'broadcast',
      event: 'team_msg_update',
      payload: updatedMsg,
    });

    if (!usingRealtimeFallback && !msg.id.startsWith('welcome-')) {
      await supabase
        .from('team_chat_messages')
        .update({ reactions: updatedReactions })
        .eq('id', msg.id);
    }
  };

  const handleToggleReaction = async (msg: TeamChatMessage, emoji: string) => {
    if (!user?.id) return;
    const currentUsers = msg.reactions[emoji] || [];
    const hasReacted = currentUsers.includes(user.id);

    const updatedUsers = hasReacted
      ? currentUsers.filter(uid => uid !== user.id)
      : [...currentUsers, user.id];

    const updatedReactions: Record<string, string[]> = { ...msg.reactions };
    if (updatedUsers.length === 0) {
      delete updatedReactions[emoji];
    } else {
      updatedReactions[emoji] = updatedUsers;
    }

    const updatedMsg: TeamChatMessage = {
      ...msg,
      reactions: updatedReactions,
    };

    setMessages(prev => prev.map(m => (m.id === msg.id ? updatedMsg : m)));
    setActiveReactionMsgId(null);

    broadcastChannelRef.current?.send({
      type: 'broadcast',
      event: 'team_msg_update',
      payload: updatedMsg,
    });

    if (!usingRealtimeFallback && !msg.id.startsWith('welcome-')) {
      await supabase
        .from('team_chat_messages')
        .update({ reactions: updatedReactions })
        .eq('id', msg.id);
    }
  };

  const handleTogglePin = async (msg: TeamChatMessage) => {
    if (!isCoachUser) return;
    const nextPinned = !msg.is_pinned;
    const updatedMsg: TeamChatMessage = { ...msg, is_pinned: nextPinned };

    setMessages(prev => prev.map(m => (m.id === msg.id ? updatedMsg : m)));

    broadcastChannelRef.current?.send({
      type: 'broadcast',
      event: 'team_msg_update',
      payload: updatedMsg,
    });

    if (!usingRealtimeFallback && !msg.id.startsWith('welcome-')) {
      await supabase
        .from('team_chat_messages')
        .update({ is_pinned: nextPinned })
        .eq('id', msg.id);
    }

    showSuccess(
      nextPinned
        ? 'Messaggio fissato in alto per tutto il Team!'
        : 'Messaggio rimosso dagli avvisi fissati'
    );
  };

  const handleDeleteMessage = async (msgId: string) => {
    setMessages(prev => prev.filter(m => m.id !== msgId));

    broadcastChannelRef.current?.send({
      type: 'broadcast',
      event: 'team_msg_delete',
      payload: { id: msgId },
    });

    if (!usingRealtimeFallback && !msgId.startsWith('welcome-')) {
      await supabase.from('team_chat_messages').delete().eq('id', msgId);
    }
    showSuccess('Messaggio rimosso dalla chat di gruppo');
  };

  const renderMessageContent = (msg: TeamChatMessage, isMineMsg: boolean) => {
    const content = msg.content;

    // 1. Render Sondaggio Interattivo
    const poll = parsePollContent(content);
    if (poll) {
      // Calcola i voti totali e per singola opzione
      const votesByOption: Record<string, string[]> = {};
      const uniqueVoters = new Set<string>();

      poll.options.forEach(opt => {
        const voters = msg.reactions[`poll_${opt.id}`] || [];
        votesByOption[opt.id] = voters;
        voters.forEach(v => uniqueVoters.add(v));
      });

      const totalVotesCount = Object.values(votesByOption).reduce(
        (sum, arr) => sum + arr.length,
        0
      );

      return (
        <div className="min-w-[240px] sm:min-w-[300px] space-y-3 py-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/40 flex items-center gap-1">
              <BarChart3 className="w-3 h-3" />
              Sondaggio Team
            </span>
            <span className="text-[10px] font-bold text-[var(--color-text-muted)]">
              {poll.allowMultiple ? '• Scelta multipla' : '• Scelta singola'}
            </span>
          </div>

          <h4 className="text-sm sm:text-base font-black text-[var(--color-text)] leading-snug">
            {poll.question}
          </h4>

          <div className="space-y-2 pt-0.5">
            {poll.options.map(opt => {
              const optVoters = votesByOption[opt.id] || [];
              const count = optVoters.length;
              const pct =
                totalVotesCount > 0 ? Math.round((count / totalVotesCount) * 100) : 0;
              const hasVoted = Boolean(user?.id && optVoters.includes(user.id));

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleVotePoll(msg, opt.id, poll.allowMultiple)}
                  className={`w-full text-left relative overflow-hidden rounded-xl border p-2.5 transition-all cursor-pointer group/opt ${
                    hasVoted
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 shadow-xs'
                      : 'border-[var(--color-border)] bg-[var(--color-surface-strong)]/70 hover:border-[var(--color-primary)]/50'
                  }`}
                >
                  {/* Barra percentuale di sfondo */}
                  <div
                    className={`absolute inset-y-0 left-0 transition-all duration-300 ${
                      hasVoted
                        ? 'bg-[var(--color-primary)]/25'
                        : 'bg-[var(--color-primary)]/10'
                    }`}
                    style={{ width: `${pct}%` }}
                  />

                  <div className="relative z-10 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                          hasVoted
                            ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-slate-950'
                            : 'border-[var(--color-text-muted)]/60 group-hover/opt:border-[var(--color-primary)]'
                        }`}
                      >
                        {hasVoted && <CheckCircle2 className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-[var(--color-text)] break-words">
                        {opt.text}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 text-[11px] font-black">
                      <span className="text-[var(--color-primary)]">{pct}%</span>
                      <span className="text-[10px] text-[var(--color-text-muted)] font-semibold">
                        ({count})
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-1 text-[10px] font-bold text-[var(--color-text-muted)]">
            <span>
              {uniqueVoters.size === 1
                ? '1 partecipante ha votato'
                : `${uniqueVoters.size} partecipanti hanno votato`}
            </span>
            <span>Tocca un&apos;opzione per votare</span>
          </div>
        </div>
      );
    }

    // 2. Render Immagini
    if (content.includes('📷 [Immagine] ')) {
      const parts = content.split('📷 [Immagine] ');
      const text = parts[0]?.trim();
      const imageUrl = parts[1]?.trim();
      return (
        <div className="space-y-2">
          {text && <p className="whitespace-pre-wrap break-words leading-relaxed">{text}</p>}
          {imageUrl && (
            <SecureChatAttachment
              type="image"
              pathOrUrl={imageUrl}
              isMine={isMineMsg}
              onOpenLightbox={setLightboxImage}
            />
          )}
        </div>
      );
    }

    // 3. Render Video
    if (content.includes('🎥 [Video] ')) {
      const parts = content.split('🎥 [Video] ');
      const text = parts[0]?.trim();
      const videoUrl = parts[1]?.trim();
      return (
        <div className="space-y-2">
          {text && <p className="whitespace-pre-wrap break-words leading-relaxed">{text}</p>}
          {videoUrl && (
            <SecureChatAttachment
              type="video"
              pathOrUrl={videoUrl}
              isMine={isMineMsg}
            />
          )}
        </div>
      );
    }

    // 4. Render Documenti
    if (content.includes('📎 [File] ')) {
      const parts = content.split('📎 [File] ');
      const text = parts[0]?.trim();
      const rawFileContent = parts[1]?.trim() || '';
      const [fileName, ...fileDataParts] = rawFileContent.split('\n');
      const fileDataUrl = fileDataParts.join('\n').trim();

      return (
        <div className="space-y-2">
          {text && <p className="whitespace-pre-wrap break-words leading-relaxed">{text}</p>}
          {fileDataUrl && (
            <SecureChatAttachment
              type="file"
              pathOrUrl={fileDataUrl}
              fileName={fileName || 'Documento Allegato'}
              isMine={isMineMsg}
            />
          )}
        </div>
      );
    }

    return <p className="whitespace-pre-wrap break-words leading-relaxed">{content}</p>;
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg)] text-[var(--color-text)] font-sans relative overflow-hidden">
      {/* ─── HEADER COMMUNITY DI GRUPPO PULITO ─── */}
      <div className="bg-[var(--color-surface)]/95 backdrop-blur-xl border-b border-[var(--color-border)] px-4 sm:px-6 py-3 flex items-center justify-between gap-3 shrink-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--color-primary)]/25 to-amber-500/10 border border-[var(--color-primary)]/40 flex items-center justify-center text-[var(--color-primary)] shadow-inner">
              <Users className="w-5 h-5" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-[var(--color-surface)]"></span>
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[var(--color-text)] font-black text-sm sm:text-base tracking-tight truncate">
                Team AC Training • Community
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-[var(--color-primary)]/15 text-[var(--color-primary)] border border-[var(--color-primary)]/30 text-[9px] font-black uppercase tracking-wider shrink-0">
                Gruppo Ufficiale
              </span>
            </div>
            <p className="text-[11px] text-[var(--color-text-muted)] font-medium flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>{activeMembersCount} membri del team • Dialoga con il Coach e i ragazzi</span>
            </p>
          </div>
        </div>

        {/* Pulsante Rapido Crea Sondaggio (Visibile solo al Coach) */}
        {isCoachUser && (
          <button
            type="button"
            onClick={() => setIsPollModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[var(--color-primary)]/15 hover:bg-[var(--color-primary)] text-[var(--color-primary)] hover:text-slate-950 border border-[var(--color-primary)]/40 text-xs font-black transition-all shrink-0 cursor-pointer shadow-xs active:scale-95"
            title="Crea un nuovo sondaggio per il Team"
          >
            <BarChart3 className="w-4 h-4" />
            <span className="hidden xs:inline">Crea Sondaggio</span>
          </button>
        )}
      </div>

      {/* ─── BANNER MESSAGGIO FISSATO DAL COACH (ESPANDIBILE AL CLICK) ─── */}
      {pinnedMessage && (
        <div
          onClick={() => setIsPinnedExpanded(prev => !prev)}
          className="bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/15 border-b border-[var(--color-primary)]/25 px-4 sm:px-6 py-2.5 flex items-start justify-between gap-3 shrink-0 cursor-pointer transition-colors"
        >
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <div className="w-7 h-7 rounded-xl bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/40 flex items-center justify-center text-[var(--color-primary)] shrink-0 mt-0.5">
              <Pin className="w-3.5 h-3.5 rotate-45" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-primary)]">
                  Messaggio Fissato dal Coach
                </span>
                {isPinnedExpanded ? (
                  <ChevronUp className="w-3 h-3 text-[var(--color-primary)]" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-[var(--color-primary)]" />
                )}
              </div>
              <p
                className={`text-xs text-[var(--color-text)] font-medium ${
                  isPinnedExpanded ? 'whitespace-pre-wrap mt-1 leading-relaxed' : 'truncate'
                }`}
              >
                {formatCleanPreviewText(pinnedMessage.content)}
              </p>
            </div>
          </div>

          {isCoachUser && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                handleTogglePin(pinnedMessage);
              }}
              className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-strong)] transition-colors shrink-0 cursor-pointer"
              title="Rimuovi messaggio fissato"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* ─── FEED MESSAGGI DI GRUPPO ─── */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar bg-[var(--color-bg)]"
        onClick={() => setActiveReactionMsgId(null)}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-[var(--color-text-muted)] text-xs">
            <div className="w-7 h-7 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
            <span className="font-bold">Caricamento chat di gruppo...</span>
          </div>
        ) : (
          messages.map((msg, idx, arr) => {
            const isMine = msg.sender_id === user?.id;
            const isFromCoach = msg.sender_role === 'coach';
            const isPollMsg = Boolean(parsePollContent(msg.content));
            const showDate =
              idx === 0 ||
              new Date(msg.created_at).toDateString() !==
                new Date(arr[idx - 1].created_at).toDateString();

            // Filtra le chiavi "poll_*" dalle pillole di reazione emoji normali
            const reactionEntries = Object.entries(msg.reactions || {}).filter(
              ([key, uids]) => !key.startsWith('poll_') && Array.isArray(uids) && uids.length > 0
            );

            return (
              <React.Fragment key={msg.id}>
                {showDate && (
                  <div className="flex justify-center my-3">
                    <span className="px-3.5 py-1 rounded-full bg-[var(--color-surface-strong)] border border-[var(--color-border)] text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest shadow-sm">
                      {new Date(msg.created_at).toLocaleDateString('it-IT', {
                        weekday: 'short',
                        day: '2-digit',
                        month: 'short',
                      })}
                    </span>
                  </div>
                )}

                <div
                  className={`flex items-end gap-2.5 ${
                    isMine ? 'flex-row-reverse' : 'flex-row'
                  } group animate-in fade-in duration-150`}
                >
                  {/* Avatar Iniziali Membro / Coach */}
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-black shrink-0 shadow-sm border ${
                      isFromCoach
                        ? 'bg-gradient-to-br from-[var(--color-primary)] to-amber-500 text-slate-950 border-[var(--color-primary)]'
                        : 'bg-[var(--color-surface-strong)] text-[var(--color-text)] border-[var(--color-border)]'
                    }`}
                    title={msg.sender_name}
                  >
                    {isFromCoach ? <Crown className="w-4 h-4 stroke-[2.5]" /> : msg.sender_initials}
                  </div>

                  {/* Contenitore Bolla + Reazioni */}
                  <div
                    className={`flex flex-col max-w-[85%] sm:max-w-[72%] ${
                      isMine ? 'items-end' : 'items-start'
                    }`}
                  >
                    {/* Nome Autore + Badge Ruolo */}
                    <div
                      className={`flex items-center gap-1.5 mb-1 px-1 ${
                        isMine ? 'flex-row-reverse' : 'flex-row'
                      }`}
                    >
                      <span
                        className={`text-[11px] font-black tracking-tight ${
                          isFromCoach ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'
                        }`}
                      >
                        {isMine ? (isFromCoach ? `${msg.sender_name} (Tu)` : 'Tu') : msg.sender_name}
                      </span>
                      {isFromCoach && (
                        <span className="px-1.5 py-0.2 rounded-md bg-[var(--color-primary)]/15 text-[var(--color-primary)] border border-[var(--color-primary)]/30 text-[9px] font-black uppercase tracking-wider">
                          👑 COACH
                        </span>
                      )}
                      {msg.is_pinned && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-[var(--color-primary)]">
                          <Pin className="w-2.5 h-2.5 rotate-45" /> Fissato
                        </span>
                      )}
                    </div>

                    <div className="relative flex items-center gap-1.5 group/bubble">
                      {/* Barra Azioni Rapide (Reazione, Rispondi, Fissa, Elimina) */}
                      <div
                        className={`opacity-0 group-hover/bubble:opacity-100 focus-within:opacity-100 transition-opacity flex items-center gap-0.5 bg-[var(--color-surface-strong)] border border-[var(--color-border)] rounded-xl p-1 shadow-md ${
                          isMine ? 'order-first' : 'order-last'
                        }`}
                        onClick={e => e.stopPropagation()}
                      >
                        {/* Pulsante Emoji Picker */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveReactionMsgId(
                                activeReactionMsgId === msg.id ? null : msg.id
                              )
                            }
                            className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-panel)] transition-colors cursor-pointer"
                            title="Aggiungi reazione"
                          >
                            <SmilePlus className="w-3.5 h-3.5" />
                          </button>

                          {activeReactionMsgId === msg.id && (
                            <div
                              className={`absolute bottom-full mb-1.5 ${
                                isMine ? 'right-0' : 'left-0'
                              } z-30 flex items-center gap-1 bg-[var(--color-surface)] border border-[var(--color-border)] px-2 py-1 rounded-2xl shadow-xl`}
                            >
                              {QUICK_EMOJIS.map(emoji => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => handleToggleReaction(msg, emoji)}
                                  className="hover:scale-125 transition-transform px-1 py-0.5 text-sm cursor-pointer"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Pulsante Rispondi */}
                        <button
                          type="button"
                          onClick={() => setReplyTo(msg)}
                          className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-panel)] transition-colors cursor-pointer"
                          title="Rispondi a questo messaggio"
                        >
                          <Reply className="w-3.5 h-3.5" />
                        </button>

                        {/* Pulsante Fissa in Alto (Solo Coach) */}
                        {isCoachUser && (
                          <button
                            type="button"
                            onClick={() => handleTogglePin(msg)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              msg.is_pinned
                                ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10'
                                : 'text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-panel)]'
                            }`}
                            title={msg.is_pinned ? 'Rimuovi pin' : 'Fissa messaggio in alto'}
                          >
                            <Pin className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Pulsante Elimina (Autore o Coach) */}
                        {(isMine || isCoachUser) && !msg.id.startsWith('welcome-') && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-rose-500 hover:bg-[var(--color-panel)] transition-colors cursor-pointer"
                            title="Elimina messaggio"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Bolla Messaggio (Armonizzata per Coach, Sondaggi e Messaggi Propri) */}
                      <div
                        className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm transition-all flex flex-col ${
                          isPollMsg
                            ? 'bg-[var(--color-surface)] text-[var(--color-text)] border-2 border-[var(--color-primary)]/50 rounded-2xl shadow-md'
                            : isMine && !isFromCoach
                            ? 'bg-gradient-to-r from-[var(--color-primary)] to-amber-400 text-slate-950 font-semibold rounded-br-xs shadow-[var(--color-primary)]/15'
                            : isFromCoach
                            ? `bg-[var(--color-surface)] text-[var(--color-text)] border-2 border-[var(--color-primary)]/45 ${
                                isMine ? 'rounded-br-xs' : 'rounded-bl-xs'
                              } shadow-md`
                            : 'bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] rounded-bl-xs'
                        }`}
                      >
                        {/* Citazione Messaggio a cui si risponde */}
                        {msg.reply_preview && (
                          <div
                            className={`mb-2 px-2.5 py-1.5 rounded-xl text-[11px] border-l-2 truncate ${
                              isMine && !isFromCoach && !isPollMsg
                                ? 'bg-slate-950/15 border-slate-950/60 text-slate-950/90'
                                : 'bg-[var(--color-surface-strong)] border-[var(--color-primary)] text-[var(--color-text-muted)]'
                            }`}
                          >
                            {msg.reply_preview}
                          </div>
                        )}

                        <div className="leading-relaxed">
                          {renderMessageContent(msg, isMine && !isFromCoach && !isPollMsg)}
                        </div>

                        <div
                          className={`flex items-center justify-end gap-1 text-[10px] font-bold mt-1 self-end ${
                            isMine && !isFromCoach && !isPollMsg
                              ? 'text-slate-950/70'
                              : 'text-[var(--color-text-muted)]'
                          }`}
                        >
                          <span>
                            {new Date(msg.created_at).toLocaleTimeString('it-IT', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Pillole Reazioni Attive */}
                    {reactionEntries.length > 0 && (
                      <div
                        className={`flex flex-wrap items-center gap-1 mt-1.5 ${
                          isMine ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {reactionEntries.map(([emoji, uids]) => {
                          const iReacted = Boolean(user?.id && uids.includes(user.id));
                          return (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleToggleReaction(msg, emoji)}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                                iReacted
                                  ? 'bg-[var(--color-primary)]/20 border-[var(--color-primary)]/50 text-[var(--color-text)]'
                                  : 'bg-[var(--color-surface-strong)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/30'
                              }`}
                            >
                              <span>{emoji}</span>
                              <span>{uids.length}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}

        <div ref={messagesEndRef} className="h-1 shrink-0" />
      </div>

      {/* ─── ANTEPRIMA RISPOSTA ATTIVA (REPLY BANNER) ─── */}
      {replyTo && (
        <div className="px-4 py-2 bg-[var(--color-surface-strong)] border-t border-[var(--color-border)] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Reply className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-primary)] block">
                Rispondi a {replyTo.sender_name}
              </span>
              <span className="text-xs text-[var(--color-text-muted)] truncate block">
                {formatCleanPreviewText(replyTo.content)}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReplyTo(null)}
            className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─── ANTEPRIMA ALLEGATO IN CODA ─── */}
      {attachment && (
        <div className="p-3 bg-[var(--color-surface-strong)] border-t border-[var(--color-border)] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {attachment.type === 'image' && (
              <img
                src={attachment.previewUrl}
                alt="Preview"
                className="w-10 h-10 object-cover rounded-xl border border-[var(--color-border)]"
              />
            )}
            {attachment.type === 'video' && (
              <div className="w-10 h-10 bg-purple-950/40 border border-purple-800 text-purple-400 flex items-center justify-center rounded-xl">
                <Video className="w-5 h-5" />
              </div>
            )}
            {attachment.type === 'file' && (
              <div className="w-10 h-10 bg-blue-950/40 border border-blue-800 text-blue-400 flex items-center justify-center rounded-xl">
                <Paperclip className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <span className="text-xs font-bold text-[var(--color-text)] truncate block">
                {attachment.file.name}
              </span>
              <span className="text-[10px] text-[var(--color-text-muted)]">
                {(attachment.file.size / 1024).toFixed(1)} KB
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemoveAttachment}
            className="p-1.5 text-[var(--color-text-muted)] hover:text-rose-500 rounded-xl cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─── INPUT BAR MODERNA A PILLOLA ─── */}
      <div
        className={`p-3 sm:p-4 ${
          isAthletePortal ? 'pb-24 sm:pb-28' : 'pb-4'
        } bg-gradient-to-t from-[var(--color-bg)] via-[var(--color-bg)]/95 to-transparent shrink-0`}
      >
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
          <input
            type="file"
            ref={fileInputRef}
            accept="*/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="bg-[var(--color-surface)] backdrop-blur-2xl border border-[var(--color-border)] rounded-full p-1.5 pl-2 sm:pl-3 flex items-center gap-2 shadow-xl focus-within:border-[var(--color-primary)] focus-within:ring-2 focus-within:ring-[var(--color-primary)]/20 transition-all">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-9 h-9 rounded-full bg-[var(--color-surface-strong)] hover:bg-[var(--color-panel)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-[var(--color-border)] flex items-center justify-center transition-all cursor-pointer shrink-0 active:scale-95"
              title="Condividi foto, video o file con il gruppo"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </button>

            {isCoachUser && (
              <button
                type="button"
                onClick={() => setIsPollModalOpen(true)}
                className="w-9 h-9 rounded-full bg-[var(--color-primary)]/15 hover:bg-[var(--color-primary)]/25 text-[var(--color-primary)] border border-[var(--color-primary)]/35 flex items-center justify-center transition-all cursor-pointer shrink-0 active:scale-95"
                title="Crea Sondaggio (Solo Coach)"
              >
                <BarChart3 className="w-4 h-4 stroke-[2.5]" />
              </button>
            )}

            <input
              type="text"
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder={
                isCoachUser
                  ? 'Scrivi un messaggio o un avviso a tutto il Team...'
                  : 'Scrivi nella chat di gruppo con il Coach e i ragazzi...'
              }
              disabled={isSending}
              className="flex-1 py-2 bg-transparent text-[var(--color-text)] text-sm focus:outline-none placeholder:text-[var(--color-text-muted)] disabled:opacity-50 min-w-0 px-2"
            />

            <button
              type="submit"
              disabled={(!newMessage.trim() && !attachment) || isSending}
              className="w-10 h-10 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-slate-950 font-black flex items-center justify-center shrink-0 shadow-lg shadow-[var(--color-primary)]/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:hover:scale-100 disabled:shadow-none cursor-pointer"
              title="Invia nel gruppo"
            >
              {isSending ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4 ml-0.5" />
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ─── MODALE CREAZIONE SONDAGGIO (SOLO COACH) ─── */}
      {isPollModalOpen && isCoachUser && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsPollModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xl overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-surface-strong)]/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/40 flex items-center justify-center text-[var(--color-primary)]">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-[var(--color-text)]">
                    Nuovo Sondaggio Team
                  </h3>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    Fai votare tutti i ragazzi della community in tempo reale
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPollModalOpen(false)}
                className="p-1.5 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-strong)] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePoll} className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">
                  Domanda del Sondaggio
                </label>
                <input
                  type="text"
                  value={pollQuestion}
                  onChange={e => setPollQuestion(e.target.value)}
                  placeholder="Es. Quale check-in di gruppo preferite questa settimana?"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-surface-strong)] border border-[var(--color-border)] text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">
                  Opzioni di Risposta ({pollOptions.length}/5)
                </label>
                {pollOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={opt}
                      onChange={e => {
                        const next = [...pollOptions];
                        next[idx] = e.target.value;
                        setPollOptions(next);
                      }}
                      placeholder={`Opzione ${idx + 1}`}
                      className="flex-1 px-3.5 py-2 rounded-xl bg-[var(--color-surface-strong)] border border-[var(--color-border)] text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
                    />
                    {pollOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() =>
                          setPollOptions(pollOptions.filter((_, i) => i !== idx))
                        }
                        className="p-2 rounded-xl text-[var(--color-text-muted)] hover:text-rose-500 hover:bg-[var(--color-surface-strong)] transition-colors cursor-pointer"
                        title="Rimuovi opzione"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}

                {pollOptions.length < 5 && (
                  <button
                    type="button"
                    onClick={() => setPollOptions([...pollOptions, ''])}
                    className="w-full py-2 rounded-xl border border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)]/50 text-xs font-bold text-[var(--color-primary)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer mt-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Aggiungi opzione</span>
                  </button>
                )}
              </div>

              <label className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-surface-strong)] border border-[var(--color-border)] cursor-pointer">
                <span className="text-xs font-bold text-[var(--color-text)]">
                  Consenti risposte multiple
                </span>
                <input
                  type="checkbox"
                  checked={pollAllowMultiple}
                  onChange={e => setPollAllowMultiple(e.target.checked)}
                  className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                />
              </label>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPollModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[var(--color-surface-strong)] text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-slate-950 text-xs font-black shadow-lg shadow-[var(--color-primary)]/25 transition-all cursor-pointer active:scale-95"
                >
                  Pubblica Sondaggio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL LIGHTBOX IMMAGINE ─── */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 cursor-pointer"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center cursor-default"
            onClick={e => e.stopPropagation()}
          >
            <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
              <a
                href={lightboxImage}
                download="foto_team.jpg"
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 flex items-center justify-center bg-slate-900/90 hover:bg-slate-800 text-white rounded-2xl transition-all border border-slate-700 shadow-xl"
                title="Scarica immagine"
              >
                <Download className="w-5 h-5" />
              </a>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="w-11 h-11 flex items-center justify-center bg-slate-900/90 hover:bg-slate-800 text-white rounded-2xl transition-all border border-slate-700 shadow-xl cursor-pointer"
                title="Chiudi"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={lightboxImage}
              alt="Foto ingrandita"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-slate-800"
            />
          </div>
        </div>
      )}
    </div>
  );
};
