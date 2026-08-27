import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, ChevronLeft, Trash2, Paperclip, Download, Mail, CheckCheck } from 'lucide-react';
import { useMessages } from '../../context/MessagesContext';
import { useAuth } from '../../context/AuthContext';
import { useAthletes } from '../../context/AthletesContext';
import { uploadChatAttachment } from '../../lib/chatStorage';
import { SecureChatAttachment } from './SecureChatAttachment';

export const FloatingChatWidget: React.FC = () => {
  const { conversations, activeConversation, setActiveConversation, messages, sendMessage, markAsRead, markAsUnread, deleteMessage } = useMessages();
  const { user } = useAuth();
  const { athletes } = useAthletes();
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeMessages = activeConversation
    ? messages.filter((m) => {
        const athlete = athletes.find(a => a.id === activeConversation.athlete_id);
        const authId = athlete?.auth_user_id;
        const pkId = activeConversation.athlete_id;
        
        return m.sender_id === pkId || m.receiver_id === pkId || 
               (authId && (m.sender_id === authId || m.receiver_id === authId));
      })
    : [];

  useEffect(() => {
    if (isOpen && activeConversation) {
      markAsRead(activeConversation.athlete_id);
    }
  }, [isOpen, activeConversation, messages.length, markAsRead]);

  const handleMarkActiveAsUnread = async () => {
    if (!activeConversation) return;
    const athleteId = activeConversation.athlete_id;
    setActiveConversation(null);
    await markAsUnread(athleteId);
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeMessages.length, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConversation || isSending) return;

    const content = inputText.trim();
    setInputText('');
    setIsSending(true);
    try {
      await sendMessage(activeConversation.athlete_id, content);
    } finally {
      setIsSending(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversation || isSending) return;

    setIsSending(true);
    try {
      const uploadedPath = await uploadChatAttachment(file, activeConversation.athlete_id);
      const isImg = file.type.startsWith('image/');
      const isVid = file.type.startsWith('video/');
      const mediaTag = isImg
        ? `📷 [Immagine] ${uploadedPath}`
        : isVid
        ? `🎥 [Video] ${uploadedPath}`
        : `📎 [File] ${file.name}\n${uploadedPath}`;

      await sendMessage(activeConversation.athlete_id, mediaTag);
    } catch (err: unknown) {
      console.error('Error sending file from FloatingChatWidget:', err);
    } finally {
      setIsSending(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const totalUnread = conversations.reduce((acc, curr) => acc + curr.unread_count, 0);

  const formatSummary = (content?: string | null) => {
    if (!content) return 'Nessun messaggio';
    if (content.includes('📷 [Immagine] ')) return '📷 Foto allegata';
    if (content.includes('🎥 [Video] ')) return '🎥 Video allegato';
    if (content.includes('📎 [File] ')) return '📎 Documento allegato';
    if (content.includes('🎵 [Nota Vocale] ')) return '🎵 Nota vocale';
    return content;
  };

  const renderWidgetContent = (content?: string | null, isMe?: boolean) => {
    if (!content) return null;
    const str = String(content);

    if (str.includes('📷 [Immagine] ')) {
      const parts = str.split('📷 [Immagine] ');
      const text = parts[0]?.trim();
      const imageUrl = parts[1]?.trim();
      return (
        <div className="space-y-1.5">
          {text && <p className="whitespace-pre-wrap break-words">{text}</p>}
          {imageUrl && (
            <SecureChatAttachment
              type="image"
              pathOrUrl={imageUrl}
              isMine={isMe}
              onOpenLightbox={setLightboxImage}
              className="max-w-[220px]"
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
        <div className="space-y-1.5">
          {text && <p className="whitespace-pre-wrap break-words">{text}</p>}
          {videoUrl && (
            <SecureChatAttachment
              type="video"
              pathOrUrl={videoUrl}
              isMine={isMe}
              className="max-w-[220px]"
            />
          )}
        </div>
      );
    }

    if (str.includes('📎 [File] ')) {
      const parts = str.split('📎 [File] ');
      const text = parts[0]?.trim();
      const raw = parts[1]?.trim() || '';
      const [fName, ...fParts] = raw.split('\n');
      const fUrl = fParts.join('\n').trim();

      return (
        <div className="space-y-1.5">
          {text && <p className="whitespace-pre-wrap break-words">{text}</p>}
          {fUrl && (
            <SecureChatAttachment
              type="file"
              pathOrUrl={fUrl}
              fileName={fName || 'File Allegato'}
              isMine={isMe}
              className="max-w-[220px]"
            />
          )}
        </div>
      );
    }

    return <p className="whitespace-pre-wrap break-words">{str}</p>;
  };

  return (
    <>
      {/* FLOATING BUTTON */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[var(--color-primary)] text-black flex items-center justify-center shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:scale-105 transition-all z-50 group cursor-pointer"
        >
          <MessageSquare className="w-6 h-6" />
          {totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 border-2 border-[var(--color-bg)] text-white text-[10px] font-black flex items-center justify-center animate-bounce">
              {totalUnread}
            </span>
          )}
        </button>
      )}

      {/* CHAT WINDOW */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[360px] h-[550px] bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-2xl rounded-2xl flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-5">
          
          {/* HEADER */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-panel-border)] bg-[var(--color-panel)]/90 backdrop-blur-md shrink-0">
            {activeConversation ? (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <button
                    onClick={() => setActiveConversation(null)}
                    className="p-1 -ml-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                    title="Torna alle conversazioni"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="relative shrink-0">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-300">
                        {activeConversation.athlete_initials}
                      </div>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-[var(--color-panel)]"></span>
                    </div>
                    <span className="text-sm font-bold text-white uppercase truncate">{activeConversation.athlete_name}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={handleMarkActiveAsUnread}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
                    title="Segna come non letto"
                  >
                    <Mail className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      setActiveConversation(null);
                    }}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Chiudi"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Chat Atleti</h3>
                </div>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setActiveConversation(null);
                  }}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Chiudi"
                >
                  <X className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {/* MESSAGES / CONVERSATIONS BODY */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {!activeConversation ? (
              /* LISTA CONVERSAZIONI */
              <div className="space-y-2">
                {conversations.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center mt-10">Nessuna conversazione attiva.</p>
                ) : (
                  conversations.map(conv => (
                    <div
                      key={conv.athlete_id}
                      onClick={() => setActiveConversation(conv)}
                      className="p-3 rounded-xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] hover:border-[var(--color-primary)]/50 cursor-pointer flex items-center justify-between gap-3 group transition-all relative"
                    >
                      <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
                        <div className="relative shrink-0">
                          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">
                            {conv.athlete_initials}
                          </div>
                          {conv.unread_count > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[9px] font-black text-white flex items-center justify-center">
                              {conv.unread_count}
                            </span>
                          )}
                        </div>
                        <div className="truncate flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-white group-hover:text-[var(--color-primary)] transition-colors truncate">
                            {conv.athlete_name}
                          </h4>
                          <p className={`text-xs truncate ${conv.unread_count > 0 ? 'text-white font-medium' : 'text-slate-400'}`}>
                            {formatSummary(conv.last_message?.content)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {conv.last_message && (
                          <span className="text-[9px] text-slate-500 whitespace-nowrap">
                            {new Date(conv.last_message.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (conv.unread_count > 0) {
                              markAsRead(conv.athlete_id);
                            } else {
                              markAsUnread(conv.athlete_id);
                            }
                          }}
                          className={`p-1 rounded-lg transition-colors cursor-pointer ${
                            conv.unread_count > 0
                              ? 'text-emerald-400 hover:bg-emerald-500/20'
                              : 'text-slate-500 hover:text-amber-400 hover:bg-slate-800'
                          }`}
                          title={conv.unread_count > 0 ? 'Segna come già letto' : 'Segna come non letto'}
                        >
                          {conv.unread_count > 0 ? (
                            <CheckCheck className="w-3.5 h-3.5" />
                          ) : (
                            <Mail className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              /* CHAT ATTIVA */
              <div className="space-y-4">
                {activeMessages.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center mt-10">Nessun messaggio. Scrivi per iniziare.</p>
                ) : (
                  activeMessages.map((msg, idx) => {
                    const isMe = msg.sender_id === user?.id;
                    return (
                      <div key={msg.id || idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}>
                        <div className="flex items-center gap-1.5 max-w-[85%] group/msg">
                          {isMe && (
                            <button
                              onClick={() => deleteMessage(msg.id)}
                              className="opacity-0 group-hover/msg:opacity-100 p-1 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded transition-all cursor-pointer"
                              title="Elimina messaggio"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                          <div
                            className={`rounded-2xl px-4 py-2.5 text-sm flex-1 ${
                              isMe
                                ? 'bg-[var(--color-primary)] text-black rounded-tr-sm font-semibold'
                                : 'bg-[var(--color-panel)] border border-[var(--color-panel-border)] text-slate-200 rounded-tl-sm'
                            }`}
                          >
                            {renderWidgetContent(msg.content, isMe)}
                          </div>
                          {!isMe && (
                            <button
                              onClick={() => deleteMessage(msg.id)}
                              className="opacity-0 group-hover/msg:opacity-100 p-1 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded transition-all cursor-pointer"
                              title="Elimina messaggio"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <span className="text-[9px] text-slate-500 mt-1 px-1">
                          {new Date(msg.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* INPUT AREA (Only if conversation is active) */}
          {activeConversation && (
            <div className="p-3 border-t border-[var(--color-panel-border)] bg-[var(--color-panel)] shrink-0">
              <form onSubmit={handleSend} className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="*/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                  title="Allega foto o file"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Scrivi un messaggio..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isSending}
                  className="p-2 rounded-xl bg-[var(--color-primary)] text-black hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 cursor-pointer shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* MODAL LIGHTBOX IMMAGINE PER FLOATING WIDGET */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
            <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
              <a
                href={lightboxImage}
                download="foto_chat.jpg"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 bg-slate-900/80 hover:bg-slate-800 text-white rounded-full transition-all border border-slate-700 shadow-lg"
                title="Scarica immagine"
              >
                <Download className="w-5 h-5" />
              </a>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="p-2.5 bg-slate-900/80 hover:bg-slate-800 text-white rounded-full transition-all border border-slate-700 shadow-lg cursor-pointer"
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
    </>
  );
};
