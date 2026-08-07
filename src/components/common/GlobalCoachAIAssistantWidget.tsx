import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  ShieldAlert, 
  Loader2, 
  Users, 
  Maximize2,
  Minimize2
} from 'lucide-react';
import { useAthletes } from '../../context/AthletesContext';
import { useWorkouts } from '../../context/WorkoutsContext';
import { useExercises } from '../../context/ExercisesContext';
import { askGlobalCoachAIAssistant, CoachChatMessage } from '../../lib/ai/aiSafetyAssistant';
import { useToast } from '../../context/ToastContext';

export const GlobalCoachAIAssistantWidget: React.FC = () => {
  const { athletes } = useAthletes();
  const { coachTemplates } = useWorkouts();
  const { exercises: coachExercises } = useExercises();
  const { showError } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('');

  const [messages, setMessages] = useState<CoachChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Atleti con note mediche o infortuni
  const injuredAthletes = athletes.filter(a => a.medicalNotes && a.medicalNotes.trim().length > 0);

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, messages, isSending]);

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputText;
    if (!textToSend.trim() || isSending) return;

    if (!customPrompt) setInputText('');

    const userMessage: CoachChatMessage = {
      id: `msg-user-${Date.now()}`,
      sender: 'coach',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setIsSending(true);

    try {
      const responseText = await askGlobalCoachAIAssistant({
        userText: textToSend,
        allAthletes: athletes,
        allWorkouts: coachTemplates,
        coachExercises,
        selectedAthleteId,
        provider: 'gemini'
      });

      const aiMessage: CoachChatMessage = {
        id: `msg-ai-${Date.now()}`,
        sender: 'assistant',
        text: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (err: any) {
      showError('Errore Assistente IA', err.message || 'Impossibile elaborare il messaggio.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      {/* FLOATING ACTION BUTTON (In Basso a Destra) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 group flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black font-black text-xs uppercase tracking-wider rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all border border-amber-300/40 shadow-amber-500/30"
          title="Apri Assistente AI del Coach"
        >
          <div className="relative">
            <Bot className="w-5 h-5 text-black" strokeWidth={2.5} />
            {injuredAthletes.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-600 border-2 border-slate-900 rounded-full flex items-center justify-center text-[9px] font-bold text-white animate-pulse">
                !
              </span>
            )}
          </div>
          <span className="hidden md:inline font-black text-[11px]">Assistente AI</span>
        </button>
      )}

      {/* EXPANDABLE GLOBAL CHAT DRAWER */}
      {isOpen && (
        <div className={`fixed z-50 transition-all duration-300 ${
          isExpanded 
            ? 'inset-4 md:inset-10' 
            : 'bottom-4 right-4 sm:bottom-6 sm:right-6 w-full max-w-lg h-[620px] max-h-[90vh]'
        }`}>
          <div className="w-full h-full bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            
            {/* Drawer Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20 text-black">
                  <Bot className="w-5 h-5" strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Assistente AI Coach
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold">
                      Gemini 3.6 Flash
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Co-Pilot intelligente collegato a tutti i {athletes.length} atleti</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  title={isExpanded ? 'Riduci' : 'Espandi'}
                >
                  {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Atleta Selection Bar */}
            <div className="px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-2 text-xs shrink-0">
              <div className="flex items-center gap-2 flex-1">
                <Users className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <select
                  value={selectedAthleteId}
                  onChange={e => setSelectedAthleteId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg text-xs text-white px-2.5 py-1.5 focus:outline-none focus:border-amber-500 font-semibold truncate"
                >
                  <option value="">🌐 Tutti gli atleti (Database globale)</option>
                  {athletes.map(a => (
                    <option key={a.id} value={a.id}>
                      👤 {a.firstName} {a.lastName} {a.medicalNotes ? '⚠️ [Segnalazione]' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Action Chips */}
            <div className="px-4 py-2 bg-slate-950/40 border-b border-slate-800/60 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none">
              <button
                onClick={() => handleSendMessage("Analizza tutti gli atleti che hanno segnalazioni sanitarie o infortuni e indicami le principali precauzioni da adottare.")}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors border border-slate-700/60 flex items-center gap-1 shrink-0"
              >
                <ShieldAlert className="w-3 h-3 text-red-400" /> Analizza Infortuni Atleti
              </button>

              <button
                onClick={() => handleSendMessage("Quali atleti hanno come obiettivo l'ipertrofia e quali la forza?")}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors border border-slate-700/60 shrink-0"
              >
                📊 Raggruppa per Obiettivi
              </button>

              <button
                onClick={() => handleSendMessage("Mostrami una sintesi dei 5 atleti con le note mediche più rilevanti.")}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors border border-slate-700/60 shrink-0"
              >
                🔍 Sintesi Note Mediche
              </button>
            </div>

            {/* Chat Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-900/80">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-amber-500" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Chiedimi qualunque cosa sugli atleti</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm">
                      Sono alimentato da Gemini 3.6 Flash ed ho accesso a tutti i {athletes.length} atleti registrati, alle loro note mediche ed alle loro schede.
                    </p>
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${msg.sender === 'coach' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                    msg.sender === 'coach' 
                      ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-400' 
                      : 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                  }`}>
                    {msg.sender === 'coach' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  <div className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                    msg.sender === 'coach'
                      ? 'bg-indigo-600 text-white rounded-tr-none font-medium'
                      : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none shadow-md'
                  }`}>
                    <div className="flex items-center justify-between gap-3 mb-1 opacity-70 text-[10px]">
                      <span className="font-bold uppercase tracking-wider">
                        {msg.sender === 'coach' ? 'Coach' : 'Assistente AI'}
                      </span>
                      <span>{msg.timestamp}</span>
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              ))}

              {isSending && (
                <div className="flex items-center gap-2 text-amber-400 text-xs italic">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                  Gemini 3.6 Flash sta analizzando il database...
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Scrivi all'Assistente AI su qualsiasi atleta o scheda..."
                  className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputText.trim() || isSending}
                  className="p-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-extrabold rounded-xl transition-all disabled:opacity-50 shrink-0 shadow-lg shadow-amber-500/20"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
