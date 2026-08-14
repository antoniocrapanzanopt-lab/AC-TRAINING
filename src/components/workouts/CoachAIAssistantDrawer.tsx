import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  AlertTriangle, 
  ShieldAlert, 
  Loader2, 
  RefreshCw, 
  ArrowRight,
  User,
  Bot
} from 'lucide-react';
import { Athlete } from '../../types';
import { WorkoutExercise } from '../../types/workout';
import { useExercises } from '../../context/ExercisesContext';
import { 
  SafetyWarning, 
  CoachChatMessage, 
  analyzeWorkoutSafety, 
  askCoachAIAssistant 
} from '../../lib/ai/aiSafetyAssistant';

import { useToast } from '../../context/ToastContext';

interface CoachAIAssistantDrawerProps {
  athlete?: Athlete | null;
  exercises: Partial<WorkoutExercise>[];
  onClose: () => void;
  onReplaceExercise?: (oldName: string, newName: string) => void;
}

export const CoachAIAssistantDrawer: React.FC<CoachAIAssistantDrawerProps> = ({
  athlete,
  exercises,
  onClose,
  onReplaceExercise
}) => {
  const { exercises: coachExercises } = useExercises();
  const { showError, showSuccess } = useToast();

  const [provider, setProvider] = useState<'openai' | 'gemini'>('openai');
  const [warnings, setWarnings] = useState<SafetyWarning[]>([]);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [messages, setMessages] = useState<CoachChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const hasKey = true; // API keys sono protette e gestite lato server (Edge Function)

  // Scroll to bottom when messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, warnings]);

  // Esegui la scansione iniziale della sicurezza
  useEffect(() => {
    runSafetyAudit();
  }, [athlete, exercises.length]);

  const runSafetyAudit = async () => {
    if (!athlete || !hasKey) return;
    setIsScanning(true);

    try {
      const detectedWarnings = await analyzeWorkoutSafety({
        athlete,
        exercises,
        coachExercises,
        provider
      });

      setWarnings(detectedWarnings);

      // Se ci sono avvisi rilevati e non abbiamo messaggi, aggiungi un messaggio proattivo dall'IA
      if (detectedWarnings.length > 0) {
        const firstWarn = detectedWarnings[0];
        const proactiveMsg: CoachChatMessage = {
          id: `msg-proactive-${Date.now()}`,
          sender: 'assistant',
          text: `Attenzione! Ho controllato attentamente e il tuo atleta (${athlete.firstName}) ha una segnalazione per: "${firstWarn.athleteCondition}". L'esercizio "${firstWarn.exerciseName}" potrebbe essere controindicato. Riscontro: ${firstWarn.reason}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          warnings: detectedWarnings
        };

        setMessages(prev => {
          // Evita duplicati proattivi se già presente
          if (prev.some(m => m.id.startsWith('msg-proactive-'))) return prev;
          return [...prev, proactiveMsg];
        });
      }
    } catch (err) {
      console.error("Safety Audit error:", err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isSending) return;

    const userMsgText = inputText.trim();
    setInputText('');

    const userMessage: CoachChatMessage = {
      id: `msg-user-${Date.now()}`,
      sender: 'coach',
      text: userMsgText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setIsSending(true);

    try {
      const responseText = await askCoachAIAssistant(
        userMsgText,
        athlete,
        exercises,
        coachExercises,
        provider
      );

      const aiMessage: CoachChatMessage = {
        id: `msg-ai-${Date.now()}`,
        sender: 'assistant',
        text: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (err: any) {
      showError('Errore Assistente IA', err.message || 'Impossibile inviare il messaggio');
    } finally {
      setIsSending(false);
    }
  };

  const handleApplyReplacement = (oldName: string, newName: string) => {
    if (onReplaceExercise) {
      onReplaceExercise(oldName, newName);
      showSuccess(`Esercizio sostituito!`, `"${oldName}" è stato aggiornato con "${newName}".`);
      
      // Rimuovi l'avviso risolto
      setWarnings(prev => prev.filter(w => w.exerciseName !== oldName));
      
      // Aggiungi un messaggio di conferma in chat
      const confirmMsg: CoachChatMessage = {
        id: `msg-replaced-${Date.now()}`,
        sender: 'assistant',
        text: `Ho sostituito con successo l'esercizio "${oldName}" con "${newName}" nella tua scheda! 👍`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, confirmMsg]);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-end bg-black/75 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full max-w-lg h-full sm:h-[90vh] bg-slate-900 border border-slate-800 rounded-none sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
        
        {/* Banner Informativo Incompatibilità */}
        <div className="bg-gradient-to-r from-red-950 via-slate-900 to-red-950 p-4 border-b border-red-900/40 relative">
          <button 
            onClick={onClose}
            className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-start gap-3 pr-8">
            <div className="w-9 h-9 bg-red-600/20 border border-red-500/40 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
              <ShieldAlert className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-red-200 uppercase tracking-wide">
                Controllo e Prevenzione Errori
              </h3>
              <p className="text-[11px] text-slate-300 leading-snug mt-1">
                L'AI analizzerà gli esercizi inseriti e segnalerà eventuali incompatibilità con lo stato fisico dell'atleta e suggerirà automaticamente un esercizio alternativo.
              </p>
            </div>
          </div>
        </div>

        {/* Status Bar Atleta & Provider */}
        <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <User className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-semibold text-white">
              {athlete ? `${athlete.firstName} ${athlete.lastName}` : 'Nessun Atleta'}
            </span>
            {athlete?.medicalNotes && (
              <span className="px-2 py-0.5 rounded-md bg-red-500/10 border border-red-500/20 text-[10px] text-red-400 font-bold">
                Infortunio/Sanitario
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={runSafetyAudit}
              disabled={isScanning}
              className="p-1.5 text-slate-400 hover:text-amber-400 transition-colors flex items-center gap-1 text-[11px]"
              title="Scansiona di nuovo"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-amber-500' : ''}`} />
              <span className="hidden sm:inline">Analizza</span>
            </button>
            <select
              value={provider}
              onChange={e => setProvider(e.target.value as 'openai' | 'gemini')}
              className="bg-slate-900 border border-slate-700 text-white text-[11px] rounded px-2 py-1 focus:outline-none"
            >
              <option value="openai">OpenAI (GPT-4o)</option>
              <option value="gemini">Google Gemini</option>
            </select>
          </div>
        </div>

        {/* Section: Active Safety Warnings */}
        {warnings.length > 0 && (
          <div className="p-3 bg-red-950/20 border-b border-red-900/30 space-y-2 max-h-48 overflow-y-auto">
            <div className="flex items-center justify-between text-xs font-bold text-red-400">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />
                Incompatibilità Rilevate ({warnings.length})
              </span>
            </div>

            {warnings.map((warn) => (
              <div key={warn.id} className="bg-slate-950 border border-red-900/50 p-3 rounded-xl space-y-2">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-extrabold text-white">{warn.exerciseName}</span>
                  <span className="px-2 py-0.5 text-[10px] uppercase font-extrabold rounded bg-red-500/20 text-red-400 border border-red-500/40">
                    Rischio {warn.riskLevel}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">{warn.reason}</p>

                {warn.suggestedAlternatives.length > 0 && (
                  <div className="pt-1.5 border-t border-slate-800">
                    <span className="text-[10px] text-slate-400 font-semibold block mb-1.5 uppercase">
                      Alternative consigliate dall'IA:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {warn.suggestedAlternatives.map((alt, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleApplyReplacement(warn.exerciseName, alt)}
                          className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1"
                        >
                          Sostituisci con {alt} <ArrowRight className="w-3 h-3" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Chat History Area */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-900/60">
          
          {messages.length === 0 && warnings.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mb-3">
                <Bot className="w-6 h-6 text-amber-500" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">Assistente AI del Coach</h4>
              <p className="text-xs text-slate-400 max-w-xs">
                {athlete 
                  ? `Sto controllando la scheda per ${athlete.firstName}. Chiedimi qualunque consiglio su sostituzioni, biomeccanica o programmazione.`
                  : 'Seleziona un atleta o chiedimi consigli sulla scheda.'}
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex items-start gap-2.5 ${msg.sender === 'coach' ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                msg.sender === 'coach' 
                  ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-400' 
                  : 'bg-red-600/20 border-red-500/40 text-red-500'
              }`}>
                {msg.sender === 'coach' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div className={`max-w-[82%] rounded-2xl p-3.5 text-xs leading-relaxed ${
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
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>
            </div>
          ))}

          {isSending && (
            <div className="flex items-center gap-2 text-slate-400 text-xs italic">
              <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
              L'Assistente sta scrivendo...
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                placeholder="Scrivi un messaggio.. usa @ per citare un programma"
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-500 pr-10"
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isSending}
              className="p-2.5 bg-red-700 hover:bg-red-600 text-white font-bold rounded-xl transition-all disabled:opacity-50 shrink-0 shadow-lg shadow-red-700/20"
              title="Invia messaggio"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
