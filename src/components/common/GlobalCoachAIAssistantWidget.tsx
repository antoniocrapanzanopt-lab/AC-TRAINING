import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Sparkles, 
  Bot, 
  User, 
  Loader2, 
  Users, 
  Maximize2,
  Minimize2,
  Bookmark,
  Plus,
  ArrowUp,
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
  const { showSuccess, showError } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('');

  const [messages, setMessages] = useState<CoachChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);

  // Prompt Preferiti Personalizzati (localStorage)
  const [customShortcuts, setCustomShortcuts] = useState<string[]>([]);
  const [isAddingShortcut, setIsAddingShortcut] = useState(false);
  const [newShortcutInput, setNewShortcutInput] = useState('');

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Atleti con note mediche o infortuni
  const injuredAthletes = athletes.filter(a => a.medicalNotes && a.medicalNotes.trim().length > 0);

  // Carica i prompt preferiti da localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('builder_ai_custom_shortcuts') || '[]');
      if (Array.isArray(saved)) {
        setCustomShortcuts(saved);
      }
    } catch (e) {
      console.warn('Errore lettura scorciatoie IA:', e);
    }
  }, []);

  const saveCustomShortcut = (promptText: string) => {
    if (!promptText.trim()) return;
    const updated = [...customShortcuts, promptText.trim()];
    setCustomShortcuts(updated);
    localStorage.setItem('builder_ai_custom_shortcuts', JSON.stringify(updated));
    showSuccess('Prompt Salvato!', 'Nuova scorciatoia aggiunta ai preferiti.');
    setNewShortcutInput('');
    setIsAddingShortcut(false);
  };

  const removeCustomShortcut = (indexToRemove: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customShortcuts.filter((_, idx) => idx !== indexToRemove);
    setCustomShortcuts(updated);
    localStorage.setItem('builder_ai_custom_shortcuts', JSON.stringify(updated));
  };

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
      {/* FLOATING ACTION BUTTON (In Basso a Destra, sopra la chat) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-24 right-6 z-40 group flex items-center justify-center w-14 h-14 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all border border-amber-300/40 shadow-[0_0_20px_rgba(234,179,8,0.35)]"
          title="Apri Assistente AI Coach"
        >
          <div className="relative">
            <Sparkles className="w-6 h-6 text-black fill-black" />
            {injuredAthletes.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-600 border-2 border-slate-900 rounded-full flex items-center justify-center text-[9px] font-bold text-white animate-pulse">
                !
              </span>
            )}
          </div>
        </button>
      )}

      {/* EXPANDABLE GLOBAL CHAT DRAWER */}
      {isOpen && (
        <div className={`fixed z-50 transition-all duration-300 ${
          isExpanded 
            ? 'inset-4 md:inset-10' 
            : 'bottom-4 right-4 sm:bottom-6 sm:right-6 w-full max-w-xl h-[660px] max-h-[90vh]'
        }`}>
          <div className="w-full h-full bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            
            {/* Drawer Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)] shadow-md">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-white">Assistente AI Coach</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700 font-bold">
                      Gemini 3.6 Flash
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">Co-Pilot collegato a {athletes.length} atleti in tempo reale</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                  title={isExpanded ? 'Riduci' : 'Espandi'}
                >
                  {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Selector Atleta Modello */}
            <div className="px-4 py-2.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-3 text-xs shrink-0">
              <div className="flex items-center gap-2 flex-1">
                <Users className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                <select
                  value={selectedAthleteId}
                  onChange={e => setSelectedAthleteId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white px-3 py-1.5 focus:outline-none focus:border-[var(--color-primary)] font-semibold truncate transition-colors"
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

            {/* Operational Quick Chips */}
            <div className="p-3 bg-slate-950/50 border-b border-slate-800/80 space-y-2 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prompt Rapidi Operativi</span>
                <button
                  onClick={() => setIsAddingShortcut(!isAddingShortcut)}
                  className="text-[10px] font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Crea Scorciatoia
                </button>
              </div>

              {/* Input Aggiunta Shortcut Personalizzata */}
              {isAddingShortcut && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newShortcutInput}
                    onChange={e => setNewShortcutInput(e.target.value)}
                    placeholder="Es. Mostrami gli atleti senza scheda attiva..."
                    className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[var(--color-primary)]"
                  />
                  <button
                    onClick={() => saveCustomShortcut(newShortcutInput)}
                    disabled={!newShortcutInput.trim()}
                    className="px-3 py-1.5 bg-[var(--color-primary)] text-black font-bold text-xs rounded-xl hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
                  >
                    Salva
                  </button>
                </div>
              )}

              {/* Grid Chips Preset - Singola Label & Icona Decorativa */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSendMessage("Aggiungi Preferito")}
                  aria-label={selectedAthleteId ? "Segna atleta come preferito" : "Suggerisci atleti prioritari per preferiti"}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-yellow-500/50 text-left transition-all flex items-center gap-2 group shrink-0"
                >
                  <span className="p-1 rounded-lg bg-yellow-500/10 text-yellow-400 text-xs" aria-hidden="true">⭐</span>
                  <span className="text-[11px] font-bold text-slate-300 group-hover:text-white truncate">
                    {selectedAthleteId ? 'Segna come preferito' : 'Suggerisci preferiti'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendMessage("Check in scadenza?")}
                  aria-label="Verifica check-in in scadenza"
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 text-left transition-all flex items-center gap-2 group shrink-0"
                >
                  <span className="p-1 rounded-lg bg-amber-500/10 text-amber-400 text-xs" aria-hidden="true">🚨</span>
                  <span className="text-[11px] font-bold text-slate-300 group-hover:text-white truncate">Check in scadenza?</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendMessage("Atleti in stallo?")}
                  aria-label="Analisi stallo e plateau carichi"
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-purple-500/50 text-left transition-all flex items-center gap-2 group shrink-0"
                >
                  <span className="p-1 rounded-lg bg-purple-500/10 text-purple-400 text-xs" aria-hidden="true">📈</span>
                  <span className="text-[11px] font-bold text-slate-300 group-hover:text-white truncate">
                    {selectedAthleteId ? 'Stato stallo carichi' : 'Atleti in stallo?'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendMessage("Segnalazioni fastidi")}
                  aria-label="Riepilogo segnalazioni fisiche e fastidi"
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-500/50 text-left transition-all flex items-center gap-2 group shrink-0"
                >
                  <span className="p-1 rounded-lg bg-rose-500/10 text-rose-400 text-xs" aria-hidden="true">⚠️</span>
                  <span className="text-[11px] font-bold text-slate-300 group-hover:text-white truncate">Segnalazioni fastidi</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendMessage("Schede da rinnovare")}
                  aria-label="Verifica schede di allenamento in scadenza"
                  className="col-span-2 p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-sky-500/50 text-left transition-all flex items-center gap-2 group shrink-0"
                >
                  <span className="p-1 rounded-lg bg-sky-500/10 text-sky-400 text-xs" aria-hidden="true">📋</span>
                  <span className="text-[11px] font-bold text-slate-300 group-hover:text-white truncate">
                    {selectedAthleteId ? 'Stato scheda allenamento' : 'Schede da rinnovare'}
                  </span>
                </button>
              </div>

              {/* User Saved Custom Shortcuts */}
              {customShortcuts.length > 0 && (
                <div className="pt-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  <span className="text-[10px] font-bold text-amber-400 uppercase shrink-0 flex items-center gap-1">
                    <Bookmark className="w-3 h-3" /> Preferiti:
                  </span>
                  {customShortcuts.map((prompt, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSendMessage(prompt)}
                      className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 rounded-xl text-[10px] font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors group"
                    >
                      <span className="truncate max-w-[140px]">{prompt}</span>
                      <button
                        onClick={e => removeCustomShortcut(idx, e)}
                        className="text-amber-400/60 hover:text-red-400 transition-colors"
                        title="Rimuovi scorciatoia"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Chat Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-950/60 custom-scrollbar">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)] shadow-lg">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Come posso aiutarti oggi?</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm">
                      Fai domande sul database dei {athletes.length} atleti, richiedi l'analisi degli infortuni o genera variazioni di programma.
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
                      : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none shadow-md'
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
                  Gemini 3.6 Flash sta elaborando la richiesta...
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input Bar Altamente Rifinita */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Scrivi a Gemini 3.6 Flash sui tuoi atleti..."
                  className="flex-1 px-4 py-3 bg-slate-900 border border-slate-700 rounded-2xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputText.trim() || isSending}
                  className="p-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-black font-extrabold rounded-2xl transition-all disabled:opacity-50 shrink-0 shadow-lg shadow-amber-500/20"
                >
                  <ArrowUp className="w-4 h-4 stroke-[3]" />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
