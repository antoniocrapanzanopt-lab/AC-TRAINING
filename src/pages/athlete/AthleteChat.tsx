import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Send,
  ArrowLeft,
  CheckCheck,
  Check,
  Trash2,
  Edit2,
  Paperclip,
  X,
  Video,
  Volume2,
  Download,
  ShieldCheck,
  Plus,
  MessageSquare
} from 'lucide-react';
import { useMessages } from '../../context/MessagesContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../lib/supabase';
import { uploadChatAttachment } from '../../lib/chatStorage';
import { SecureChatAttachment } from '../../components/chat/SecureChatAttachment';

interface AthleteChatProps {
  onBack?: () => void;
}

interface Attachment {
  file: File;
  previewUrl: string;
  type: 'image' | 'video' | 'file';
}

export const AthleteChat: React.FC<AthleteChatProps> = ({ onBack }) => {
  const { user } = useAuth();
  const { messages, sendMessage, loading, markAsRead, deleteMessage, editMessage } = useMessages();
  const { showSuccess, showError } = useToast();

  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<Attachment | null>(null);

  // Typing Indicator State
  const [isCoachTyping] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ID dell'utente atleta (sia sessionUser.id che athleteId)
  const myIds = useMemo(() => {
    if (!user) return [];
    return [user.id, user.athleteId].filter(Boolean) as string[];
  }, [user]);

  // Messaggi filtrati coinvolgenti l'atleta
  const athleteMessages = useMemo(() => {
    if (myIds.length === 0) return [];
    return messages.filter(m => myIds.includes(m.sender_id) || myIds.includes(m.receiver_id));
  }, [messages, myIds]);

  const [coachId, setCoachId] = useState<string>('demo-local');

  // Individuazione automatica dell'ID del Coach
  useEffect(() => {
    if (athleteMessages.length > 0) {
      const firstMsg = athleteMessages[0];
      const foundCoachId = myIds.includes(firstMsg.sender_id) ? firstMsg.receiver_id : firstMsg.sender_id;
      if (foundCoachId) setCoachId(foundCoachId);
    } else if (user?.id) {
      supabase
        .from('athletes')
        .select('assigned_coach_id')
        .eq('auth_user_id', user.id)
        .maybeSingle()
        .then(async ({ data }) => {
          let cid = data?.assigned_coach_id;
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

          if (!cid || !uuidRegex.test(cid)) {
            const { data: anyCoach } = await supabase
              .from('athletes')
              .select('assigned_coach_id')
              .not('assigned_coach_id', 'is', null)
              .neq('assigned_coach_id', 'local-owner')
              .neq('assigned_coach_id', '')
              .limit(1)
              .maybeSingle();

            if (anyCoach?.assigned_coach_id && uuidRegex.test(anyCoach.assigned_coach_id)) {
              cid = anyCoach.assigned_coach_id;
            } else {
              const { data: msgData } = await supabase
                .from('messages')
                .select('sender_id')
                .neq('sender_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

              if (msgData?.sender_id && uuidRegex.test(msgData.sender_id)) {
                cid = msgData.sender_id;
              }
            }
          }

          if (cid) setCoachId(cid);
        });
    }
  }, [user, athleteMessages, myIds]);

  // Scroll automatico in basso ai nuovi messaggi
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [athleteMessages, isCoachTyping]);

  // Segna come letti i messaggi ricevuti dal coach
  useEffect(() => {
    if (coachId && coachId !== 'demo-local') {
      markAsRead(coachId);
    }
  }, [athleteMessages, coachId, markAsRead]);

  // Calcolo dell'ULTIMO messaggio per verificare il vincolo di modifica/eliminazione
  const lastMessage = athleteMessages[athleteMessages.length - 1];
  const isLastMessageMine = lastMessage && myIds.includes(lastMessage.sender_id);

  // Gestione File / Allegati (Foto, Video, Documenti)
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

  // Inizio Modifica Ultimo Messaggio
  const handleStartEdit = (msgId: string, currentContent?: string) => {
    setEditingMessageId(msgId);
    setNewMessage(currentContent || '');
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setNewMessage('');
  };

  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Invio / Salva Messaggio (o Salva Modifica)
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const textToSend = newMessage.trim();

    if ((!textToSend && !attachment) || !user || isSending) return;

    setIsSending(true);
    try {
      // Caso 1: Salva Modifica dell'ultimo messaggio
      if (editingMessageId) {
        await editMessage(editingMessageId, textToSend);
        showSuccess('Messaggio modificato con successo!');
        setEditingMessageId(null);
        setNewMessage('');
        return;
      }

      // Caso 2: Invia Nuovo Messaggio con caricamento su Supabase Storage
      if (attachment) {
        const athleteIdForUpload = (user as unknown as { athleteId?: string })?.athleteId || user?.id;
        const uploadedPath = await uploadChatAttachment(attachment.file, athleteIdForUpload);
        const mediaTag =
          attachment.type === 'image'
            ? `📷 [Immagine] ${uploadedPath}`
            : attachment.type === 'video'
            ? `🎥 [Video] ${uploadedPath}`
            : `📎 [File] ${attachment.file.name}\n${uploadedPath}`;

        const contentWithMedia = textToSend ? `${textToSend}\n\n${mediaTag}` : mediaTag;
        await sendMessage(coachId, contentWithMedia);
        handleRemoveAttachment();
        setNewMessage('');
        showSuccess('Messaggio inviato!');
      } else {
        await sendMessage(coachId, textToSend);
        setNewMessage('');
      }
    } catch (err: unknown) {
      console.error('Error in handleSendMessage:', err);
      showError('Impossibile inviare il messaggio');
    } finally {
      setIsSending(false);
    }
  };

  // Parser per gli allegati con render pulito
  const renderMessageContent = (content?: string | null, isMineMsg?: boolean) => {
    if (!content) return null;
    const str = String(content);

    if (str.includes('📷 [Immagine] ')) {
      const parts = str.split('📷 [Immagine] ');
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

    if (str.includes('🎥 [Video] ')) {
      const parts = str.split('🎥 [Video] ');
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

    if (str.includes('🎵 [Nota Vocale] ')) {
      const audioUrl = str.replace('🎵 [Nota Vocale] ', '').trim();
      return (
        <div className="flex items-center gap-3 p-1">
          <Volume2 className="w-5 h-5 shrink-0" />
          <audio controls src={audioUrl} className="h-9 w-48 sm:w-56" />
        </div>
      );
    }

    if (str.includes('📎 [File] ')) {
      const parts = str.split('📎 [File] ');
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

    return <p className="whitespace-pre-wrap break-words leading-relaxed">{str}</p>;
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 font-sans relative overflow-hidden">
      
      {/* ─── HEADER CHAT SATINATO & ELEGANTE ─── */}
      <div className="bg-slate-950/90 backdrop-blur-2xl border-b border-slate-800/80 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-20 shadow-md shadow-black/40 shrink-0">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-850 rounded-2xl transition-all active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--color-primary)]/20 to-amber-500/10 border border-[var(--color-primary)]/40 flex items-center justify-center text-[var(--color-primary)] font-black text-sm shadow-inner">
              AC
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-slate-950"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-white font-black text-sm sm:text-base tracking-tight">
                Il Tuo Coach
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-[var(--color-primary)]/15 text-[var(--color-primary)] border border-[var(--color-primary)]/30 text-[9px] font-black uppercase tracking-wider">
                Coach Ufficiale
              </span>
            </div>
            <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Online • Supporto Diretto
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-[10px] font-bold text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Chat Protetta</span>
        </div>
      </div>

      {/* ─── AREA MESSAGGI (STILE IPHONE / WHATSAPP DARK) ─── */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 custom-scrollbar bg-slate-950"
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-500 text-xs">
            <div className="w-7 h-7 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
            <span className="font-bold text-slate-400">Caricamento conversazione...</span>
          </div>
        ) : athleteMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8 max-w-sm mx-auto space-y-3 animate-in fade-in">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-[var(--color-primary)] shadow-lg">
              <MessageSquare className="w-7 h-7" />
            </div>
            <h3 className="text-sm sm:text-base font-black text-white">Canale Diretto con il Coach</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Scrivi un messaggio o allega una foto/video per chiarimenti, consigli o aggiornamenti sulla scheda.
            </p>
          </div>
        ) : (
          athleteMessages.map((msg, idx, arr) => {
            const isMine = myIds.includes(msg.sender_id);
            const showDate =
              idx === 0 ||
              new Date(msg.created_at).toDateString() !== new Date(arr[idx - 1].created_at).toDateString();

            const isEditableAndDeletable = isLastMessageMine && msg.id === lastMessage?.id;

            return (
              <React.Fragment key={msg.id}>
                {showDate && (
                  <div className="flex justify-center my-3">
                    <span className="px-3.5 py-1 rounded-full bg-slate-900/90 border border-slate-800/90 text-[10px] font-bold text-slate-400 uppercase tracking-widest shadow-sm">
                      {new Date(msg.created_at).toLocaleDateString('it-IT', {
                        weekday: 'short',
                        day: '2-digit',
                        month: 'short',
                      })}
                    </span>
                  </div>
                )}

                <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} group animate-in fade-in duration-150`}>
                  <div className="flex items-end gap-1.5 max-w-[85%] sm:max-w-[72%] group/msg">
                    
                    {/* Pulsanti Modifica / Elimina per l'ultimo messaggio dell'atleta */}
                    {isMine && isEditableAndDeletable && (
                      <div className="opacity-0 group-hover/msg:opacity-100 flex items-center gap-1 transition-all bg-slate-900 border border-slate-800 p-1 rounded-2xl shadow-lg mb-1">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(msg.id, msg.content)}
                          className="p-1.5 text-slate-400 hover:text-[var(--color-primary)] hover:bg-slate-850 rounded-xl transition-colors cursor-pointer"
                          title="Modifica ultimo messaggio"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteMessage(msg.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-850 rounded-xl transition-colors cursor-pointer"
                          title="Elimina ultimo messaggio"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Bolla del Messaggio con Orario & Spunte Integrate all'Interno */}
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-sm shadow-md transition-all relative flex flex-col ${
                        isMine
                          ? 'bg-gradient-to-r from-[var(--color-primary)] to-amber-400 text-slate-950 font-semibold rounded-br-xs shadow-[var(--color-primary)]/15'
                          : 'bg-slate-900 text-slate-100 border border-slate-800/90 rounded-bl-xs'
                      }`}
                    >
                      <div className="leading-relaxed pr-1">
                        {renderMessageContent(msg.content, isMine)}
                      </div>

                      {/* Footer Bolla: Orario + Spunta integrati */}
                      <div
                        className={`flex items-center justify-end gap-1 text-[10px] font-bold mt-1 self-end ${
                          isMine ? 'text-slate-950/70' : 'text-slate-500'
                        }`}
                      >
                        <span>
                          {new Date(msg.created_at).toLocaleTimeString('it-IT', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {isMine && (
                          <span className="flex items-center" title={msg.is_read ? 'Letto dal coach' : 'Inviato'}>
                            {msg.is_read ? (
                              <CheckCheck className="w-3.5 h-3.5 text-slate-950" />
                            ) : (
                              <Check className="w-3.5 h-3.5 text-slate-950/60" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}

        {/* Typing Indicator Coach */}
        {isCoachTyping && (
          <div className="flex items-center gap-2 text-xs text-slate-400 animate-pulse bg-slate-900 px-4 py-2 rounded-2xl w-fit border border-slate-800">
            <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-bounce" />
            <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-bounce [animation-delay:0.2s]" />
            <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-bounce [animation-delay:0.4s]" />
            <span className="font-bold text-[var(--color-primary)] ml-1">Il coach sta rispondendo...</span>
          </div>
        )}

        <div ref={messagesEndRef} className="h-1 shrink-0" />
      </div>

      {/* ─── ANTEPRIMA ALLEGATO IN CODA ─── */}
      {attachment && (
        <div className="px-4 py-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3 animate-in slide-in-from-bottom-2 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            {attachment.type === 'image' ? (
              <img
                src={attachment.previewUrl}
                alt="Anteprima"
                className="w-10 h-10 object-cover rounded-xl border border-slate-700"
              />
            ) : attachment.type === 'video' ? (
              <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-300">
                <Video className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
            ) : (
              <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-300">
                <Paperclip className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
            )}
            <div className="text-xs truncate">
              <p className="text-white font-medium truncate">{attachment.file.name}</p>
              <p className="text-slate-400 text-[10px]">
                {(attachment.file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemoveAttachment}
            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─── BANNER MODALITÀ MODIFICA ─── */}
      {editingMessageId && (
        <div className="px-4 py-2 bg-[var(--color-primary)]/15 border-t border-[var(--color-primary)]/30 flex items-center justify-between text-xs text-[var(--color-primary)] shrink-0">
          <span className="font-bold flex items-center gap-1.5">
            <Edit2 className="w-3.5 h-3.5" />
            <span>Modifica messaggio...</span>
          </span>
          <button
            type="button"
            onClick={handleCancelEdit}
            className="text-[var(--color-primary)] hover:text-white font-bold text-xs cursor-pointer"
          >
            Annulla
          </button>
        </div>
      )}

      {/* ─── INPUT BAR MODERNA A PILLOLA FLUTTUANTE CON PADDING CALIBRATO PER NAVBAR ─── */}
      <div className="p-3 sm:p-4 pb-24 sm:pb-28 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent shrink-0">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
          {/* Input File nascosto */}
          <input
            type="file"
            ref={fileInputRef}
            accept="*/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="bg-slate-900/90 backdrop-blur-2xl border border-slate-800/90 rounded-full p-1.5 pl-2 sm:pl-3 flex items-center gap-2 shadow-2xl focus-within:border-[var(--color-primary)] focus-within:ring-2 focus-within:ring-[var(--color-primary)]/20 transition-all">
            
            {/* Bottone Graffetta (+) */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-9 h-9 rounded-full bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-[var(--color-primary)] border border-slate-750 flex items-center justify-center transition-all cursor-pointer shrink-0 active:scale-95"
              title="Allega foto, video o documento"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </button>

            {/* Input Testo Messaggio */}
            <input
              type="text"
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder={editingMessageId ? "Modifica il messaggio..." : "Scrivi un messaggio al tuo coach..."}
              disabled={isSending}
              className="flex-1 py-2 bg-transparent text-white text-sm focus:outline-none placeholder:text-slate-500 disabled:opacity-50 min-w-0 px-2"
            />

            {/* Bottone Invio Circolare Dorato */}
            <button
              type="submit"
              disabled={(!newMessage.trim() && !attachment) || isSending}
              className="w-10 h-10 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-slate-950 font-black flex items-center justify-center shrink-0 shadow-lg shadow-[var(--color-primary)]/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:hover:scale-100 disabled:shadow-none cursor-pointer"
              title={editingMessageId ? "Salva modifica" : "Invia messaggio"}
            >
              {isSending ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
              ) : editingMessageId ? (
                <Check className="w-5 h-5 stroke-[2.5]" />
              ) : (
                <Send className="w-4 h-4 ml-0.5" />
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ─── MODAL LIGHTBOX IMMAGINE A TUTTO SCHERMO ─── */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 cursor-pointer"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center cursor-default" onClick={e => e.stopPropagation()}>
            <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
              <a
                href={lightboxImage}
                download="foto_chat.jpg"
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
