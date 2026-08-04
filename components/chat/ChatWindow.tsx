import React, { useState, useRef, useEffect } from 'react';
import {
  Send, Paperclip, Sparkles, CheckCheck, User,
  FileText, Image as ImageIcon, Video, X, Loader2
} from 'lucide-react';
import { Athlete, MessageType } from '../../types';
import { useAthleteChat } from '../../context/AthleteChatContext';
import { generateAIReplyDraft, fileToDataUrl } from '../../services/chatService';

interface ChatWindowProps {
  athlete: Athlete;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ athlete }) => {
  const { getMessagesByAthlete, sendMessage, markAsRead } = useAthleteChat();

  const [inputText, setInputText] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [attachment, setAttachment] = useState<{
    dataUrl: string;
    name: string;
    type: MessageType;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = getMessagesByAthlete(athlete.id);

  // Segna i messaggi dell'atleta come letti dal coach
  useEffect(() => {
    markAsRead(athlete.id, 'coach');
  }, [athlete.id, markAsRead, messages.length]);

  // Scroll in fondo all'arrivo di nuovi messaggi
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Trova l'ultimo messaggio dell'atleta per la bozza IA
  const lastAthleteMsg = [...messages].reverse().find((m) => m.senderRole === 'athlete');

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !attachment) return;

    const msgType: MessageType = attachment
      ? attachment.type
      : inputText.startsWith('http://') || inputText.startsWith('https://')
      ? 'link'
      : 'text';

    sendMessage(
      athlete.id,
      'coach',
      athlete.assignedCoachName || 'Coach Antonio',
      inputText.trim() || (attachment ? attachment.name : ''),
      msgType,
      attachment?.dataUrl,
      attachment?.name
    );

    setInputText('');
    setAttachment(null);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await fileToDataUrl(file);
      let type: MessageType = 'text';
      if (file.type.startsWith('image/')) type = 'image';
      else if (file.type.startsWith('video/')) type = 'video';
      else type = 'link';

      setAttachment({
        dataUrl,
        name: file.name,
        type,
      });
    } catch (err) {
      console.error('Errore caricamento allegato:', err);
    }
  };

  const handleGenerateAIReply = async () => {
    const promptMessage = lastAthleteMsg ? lastAthleteMsg.content : 'Ciao Coach, mi dai un feedback sul mio allenamento?';
    setIsGeneratingAI(true);
    try {
      const draft = await generateAIReplyDraft(athlete.fullName, promptMessage);
      setInputText(draft);
    } catch (err) {
      console.error('Errore generatore bozza IA:', err);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl shadow-2xl overflow-hidden">
      {/* HEADER CHAT LATO COACH */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/40 flex items-center justify-center font-bold text-[var(--color-primary)] text-sm">
            {athlete.firstName ? athlete.firstName[0] : 'A'}
            {athlete.lastName ? athlete.lastName[0] : ''}
          </div>
          <div>
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              {athlete.fullName}
            </h3>
            <span className="text-[11px] text-slate-400 block">
              {athlete.goals || 'Atleta Attivo'} · Supporto Chat Live
            </span>
          </div>
        </div>

        {/* Pulsante Genera Bozza con IA */}
        <button
          onClick={handleGenerateAIReply}
          disabled={isGeneratingAI}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 text-purple-300 font-bold text-xs hover:bg-purple-500/20 border border-purple-500/30 transition-all disabled:opacity-50"
          title="Analizza l'ultimo messaggio dell'atleta e genera una risposta rapida"
        >
          {isGeneratingAI ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-300" />
              <span>Generazione Bozza...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>⚡ Genera Bozza con IA</span>
            </>
          )}
        </button>
      </div>

      {/* MESSAGES BODY */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-950/50 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="text-center py-16 text-slate-500 space-y-2">
            <User className="w-10 h-10 mx-auto opacity-30 text-[var(--color-primary)]" />
            <p className="text-xs">Nessun messaggio inviato finora. Inizia la conversazione con {athlete.fullName}.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isCoach = msg.senderRole === 'coach';

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isCoach ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[70%] p-3.5 rounded-2xl text-xs space-y-2 shadow-md ${
                    isCoach
                      ? 'bg-[var(--color-primary)] text-black rounded-tr-none font-medium'
                      : 'bg-slate-900 border border-slate-800 text-white rounded-tl-none'
                  }`}
                >
                  {/* Sender label */}
                  <span
                    className={`text-[10px] font-extrabold uppercase tracking-wider block ${
                      isCoach ? 'text-black/70' : 'text-[var(--color-primary)]'
                    }`}
                  >
                    {isCoach ? 'Tu (Coach)' : msg.senderName}
                  </span>

                  {/* Attachment Media Rendering */}
                  {msg.mediaUrl && (
                    <div className="rounded-xl overflow-hidden border border-black/10 my-1">
                      {msg.type === 'image' || msg.mediaUrl.startsWith('data:image/') ? (
                        <img
                          src={msg.mediaUrl}
                          alt={msg.mediaName || 'Allegato'}
                          className="max-h-60 w-full object-cover rounded-lg"
                        />
                      ) : msg.type === 'video' || msg.mediaUrl.startsWith('data:video/') ? (
                        <video
                          src={msg.mediaUrl}
                          controls
                          className="max-h-60 w-full rounded-lg"
                        />
                      ) : (
                        <a
                          href={msg.mediaUrl}
                          download={msg.mediaName || 'allegato'}
                          className={`flex items-center gap-2 p-2 text-xs font-bold ${
                            isCoach ? 'text-black underline' : 'text-sky-400 underline'
                          }`}
                        >
                          <FileText className="w-4 h-4" />
                          <span>{msg.mediaName || 'Scarica Allegato'}</span>
                        </a>
                      )}
                    </div>
                  )}

                  {/* Text Content */}
                  {msg.content && (
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  )}

                  {/* Timestamp & Read Status */}
                  <div
                    className={`flex items-center justify-end gap-1 text-[9px] ${
                      isCoach ? 'text-black/70' : 'text-slate-500'
                    }`}
                  >
                    <span>
                      {new Date(msg.createdAt).toLocaleTimeString('it-IT', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {isCoach && <CheckCheck className="w-3 h-3 text-black/80" />}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ATTACHMENT PREVIEW BAR */}
      {attachment && (
        <div className="px-4 py-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-2 truncate">
            {attachment.type === 'image' ? (
              <ImageIcon className="w-4 h-4 text-emerald-400" />
            ) : attachment.type === 'video' ? (
              <Video className="w-4 h-4 text-sky-400" />
            ) : (
              <FileText className="w-4 h-4 text-amber-400" />
            )}
            <span className="truncate font-medium">{attachment.name}</span>
          </div>
          <button
            type="button"
            onClick={() => setAttachment(null)}
            className="p-1 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* FOOTER FORM INPUT */}
      <form onSubmit={handleSend} className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,video/*,application/pdf"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-all shrink-0"
          title="Allega foto, video o documento PDF"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Scrivi un messaggio a ${athlete.firstName || 'atleta'}...`}
          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[var(--color-primary)]"
        />

        <button
          type="submit"
          disabled={!inputText.trim() && !attachment}
          className="w-10 h-10 rounded-xl bg-[var(--color-primary)] text-black flex items-center justify-center hover:brightness-110 disabled:opacity-40 disabled:hover:brightness-100 transition-all shrink-0 font-bold"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
