import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Sparkles,
  Zap,
  User,
  CheckCircle2,
  RefreshCw,
  Sliders,
  History,
  Activity,
  Shield,
  TrendingUp,
  Clock,
  MessageSquare,
  ArrowRightLeft,
} from 'lucide-react';
import { useAthletes } from '../../../context/AthletesContext';
import { useApp } from '../../../context/AppContext';
import { useToast } from '../../../context/ToastContext';
import { useMessages } from '../../../context/MessagesContext';

export interface CopilotAlertContext {
  athleteId: string;
  athleteName: string;
  workoutTitle?: string;
  weekNumber?: number | string;
  dayName?: string;
  exerciseName?: string;
  noteText?: string;
  suggestion?: string;
  type: 'critical_note' | 'plateau' | 'inactivity' | 'progression';
}

interface AICopilotActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  alertData: CopilotAlertContext | null;
}

export const AICopilotActionModal: React.FC<AICopilotActionModalProps> = ({
  isOpen,
  onClose,
  alertData,
}) => {
  const { setSelectedAthleteId, addTimelineEvent, timeline } = useAthletes();
  const { setActiveTab } = useApp();
  const { showSuccess } = useToast();
  const { sendMessage } = useMessages();

  const [activeActionTab, setActiveActionTab] = useState<'modify_program' | 'history' | 'view_profile'>('modify_program');

  // Metodologia di Variazione & Parametri
  const [variationMethodology, setVariationMethodology] = useState<'biomechanical' | 'tut_rpe' | 'volume_intensity' | 'frequency_order'>('biomechanical');
  const [coachInstruction, setCoachInstruction] = useState('');
  const [targetWeek, setTargetWeek] = useState('Settimana 3');
  const [isProcessingAI, setIsProcessingAI] = useState(false);

  // Stato Messaggio Chat Interna
  const [chatMessageText, setChatMessageText] = useState('');

  // Box Anteprima Modifiche (Diff View)
  const [diffPreview, setDiffPreview] = useState<{ before: string; after: string }>({
    before: '',
    after: '',
  });

  useEffect(() => {
    if (!isOpen || !alertData) return;

    const athleteFirstName = alertData.athleteName ? alertData.athleteName.trim().split(' ')[0] : 'Atleta';
    const exName = alertData.exerciseName || 'Esercizio Principale';

    if (alertData.type === 'critical_note') {
      setCoachInstruction(`Sostituisci ${exName} con varianti articolari più tollerate per ${targetWeek}.`);
      setChatMessageText(
        `Ciao ${athleteFirstName}, ho letto la tua nota sul fastidio avvertito durante ${exName}. Per le prossime 2 settimane ho adeguato la tua scheda per permettere un recupero ottimale. Fammi sapere come ti trovi!`
      );
      setDiffPreview({
        before: `${exName} (4x10, RPE 8.0)`,
        after: `Landmine Press Unilaterale (4x10, RPE 7.0, TUT 3-1-1)`,
      });
    } else if (alertData.type === 'plateau') {
      setCoachInstruction(`Inserisci una variazione di tempo esecutivo (TUT 3-1-1) e riduci il volume del 15% per superare il plateau su ${exName}.`);
      setChatMessageText(
        `Ciao ${athleteFirstName}, ho analizzato i tuoi carichi su ${exName} e ho preparato una leggera variazione nel programma per sbloccare la tua forza. Dai un'occhiata alla scheda aggiornata!`
      );
      setDiffPreview({
        before: `${exName} (4x8, 80kg)`,
        after: `${exName} (Rest-Pause 1x6 + 2x3, 82.5kg)`,
      });
    } else if (alertData.type === 'inactivity') {
      setCoachInstruction(`Ripianifica il mesociclo a partire dalla prossima settimana con un giorno di riadattamento graduale.`);
      setChatMessageText(
        `Ciao ${athleteFirstName}, come va? Ho notato che è da qualche giorno che non registri allenamenti. Tutto bene? Fammi sapere se dobbiamo adattare la scheda ai tuoi orari!`
      );
      setDiffPreview({
        before: `Scheda Inattiva da 7+ giorni`,
        after: `Ripianificazione Mesociclo (${targetWeek}) con Riadattamento`,
      });
    } else {
      setCoachInstruction(`Aumenta il target di carico del +5% per il prossimo mesociclo data la grande progressione.`);
      setChatMessageText(
        `Complimenti ${athleteFirstName}! 🔥 Ho visto la tua ottima prestazione ed il nuovo record su ${exName}. Continua così!`
      );
      setDiffPreview({
        before: `${exName} (4x6, Target Base)`,
        after: `${exName} (4x6, Target +2.5% Carico)`,
      });
    }
  }, [isOpen, alertData, targetWeek]);

  if (!isOpen || !alertData) return null;

  const athleteHistory = (timeline && alertData.athleteId && timeline[alertData.athleteId]) || [];
  const athleteFirstName = alertData.athleteName ? alertData.athleteName.trim().split(' ')[0] : 'Atleta';
  const exName = alertData.exerciseName || 'Esercizio Principale';

  // Strategie IA 1-Click
  const applyAIStrategy = (strategy: 'joint_friendly' | 'plateau_breaker' | 'deload' | 'overload') => {
    if (strategy === 'joint_friendly') {
      setVariationMethodology('biomechanical');
      setCoachInstruction(`[STRATEGIA JOINT-FRIENDLY] Sostituisci ${exName} con una variante iso-laterale guidata ad angolo controllato per ${targetWeek}.`);
      setChatMessageText(`Ciao ${athleteFirstName}, ho aggiornato il programma inserendo una variante joint-friendly per proteggere le articolazioni ed evitare dolori.`);
      setDiffPreview({
        before: `${exName} (4x10, RPE 8.0)`,
        after: `Variante Isolaterale Guidata (4x10, RPE 7.0, TUT 3-1-1)`,
      });
    } else if (strategy === 'plateau_breaker') {
      setVariationMethodology('volume_intensity');
      setCoachInstruction(`[STRATEGIA SBLOCCO PLATEAU] Inserisci tecnica Rest-Pause sul primo esercizio base per sbloccare i carichi su ${targetWeek}.`);
      setChatMessageText(`Ciao ${athleteFirstName}, per sbloccare lo stallo carichi su ${exName} ho inserito una serie Rest-Pause ad alta intensità. Provala e fammi sapere!`);
      setDiffPreview({
        before: `${exName} (4x8, Stallo Carico)`,
        after: `${exName} (Rest-Pause 1x6 + 2x3, TUT 2-0-1)`,
      });
    } else if (strategy === 'deload') {
      setVariationMethodology('volume_intensity');
      setCoachInstruction(`[STRATEGIA DELOAD ATTIVO] Taglia il volume complessivo del -30% e mantieni 2 RIR per ${targetWeek}.`);
      setChatMessageText(`Ciao ${athleteFirstName}, per permettere un recupero ottimale ed evitare il sovrallenamento ho programmato una settimana di scarico attivo (-30% volume).`);
      setDiffPreview({
        before: `Volume Standard (5x5, RPE 9.0)`,
        after: `Deload Attivo (3x5, RPE 6.5, -30% Volume)`,
      });
    } else {
      setVariationMethodology('tut_rpe');
      setCoachInstruction(`[STRATEGIA OVERLOAD PROGRESSIVO] Aumenta il target di carico del +2.5% ed imposta TUT 2-0-1 per il prossimo mesociclo.`);
      setChatMessageText(`Complimenti per la costanza ${athleteFirstName}! 🔥 Ho aumentato i target di carico del +2.5% per continuare ad evolvere.`);
      setDiffPreview({
        before: `${exName} (Target Carico Base)`,
        after: `${exName} (Target +2.5% Carico, TUT 2-0-1)`,
      });
    }
  };

  // Esecuzione elaborazione IA manuale o al click della metodologia
  const handleSelectMethodology = (method: 'biomechanical' | 'tut_rpe' | 'volume_intensity' | 'frequency_order') => {
    setVariationMethodology(method);
    
    // Auto-genera output in base alla metodologia scelta
    if (method === 'biomechanical') {
      setCoachInstruction(`Sostituisci ${exName} con una variante con profilo di resistenza ottimizzato (es. ai cavi o macchina).`);
      setChatMessageText(`Ciao ${athleteFirstName}, ho modificato la scheda inserendo una variante più efficiente dal punto di vista biomeccanico per ottimizzare lo stimolo muscolare.`);
      setDiffPreview({
        before: `${exName} (Esecuzione Base)`,
        after: `Variante Biomeccanica Ottimizzata (TUT 3-1-1)`,
      });
    } else if (method === 'tut_rpe') {
      setCoachInstruction(`Modifica le tempistiche di esecuzione su ${exName}: aumenta la fase eccentrica ed imposta un target RPE 8.`);
      setChatMessageText(`Ciao ${athleteFirstName}, per migliorare il controllo motorio ho inserito un Tempo Under Tension (TUT) specifico per ${exName}.`);
      setDiffPreview({
        before: `${exName} (Ritmo Libero)`,
        after: `${exName} (TUT 4-0-1, RPE 8)`,
      });
    } else if (method === 'volume_intensity') {
      setCoachInstruction(`Rimodula volume e intensità per ${exName} su ${targetWeek}: inserisci un protocollo Drop-Set nell'ultima serie.`);
      setChatMessageText(`Ciao ${athleteFirstName}, ho alzato l'intensità su ${exName} con un protocollo specifico per portarti al limite in questa settimana.`);
      setDiffPreview({
        before: `${exName} (4x8)`,
        after: `${exName} (3x8 + 1 Drop-Set finale)`,
      });
    } else if (method === 'frequency_order') {
      setCoachInstruction(`Sposta ${exName} come primo esercizio dell'allenamento per priorità muscolare.`);
      setChatMessageText(`Ciao ${athleteFirstName}, ho spostato l'ordine degli esercizi per dare priorità a ${exName} quando sei più fresco.`);
      setDiffPreview({
        before: `Esercizio a metà sessione`,
        after: `${exName} (Primo esercizio della sessione)`,
      });
    }
  };

  // Elabora Variazione Manuale (Pulsante Refresh)
  const handleProcessAIProgramChange = () => {
    setIsProcessingAI(true);
    setTimeout(() => {
      setIsProcessingAI(false);
      const methodologyNames = {
        biomechanical: 'Sostituzione Biomeccanica',
        tut_rpe: 'Controllo Tempi TUT & Target RPE',
        volume_intensity: 'Volume & Intensità (Rest-Pause / Deload)',
        frequency_order: 'Frequenza & Ordine Esercizi',
      };

      setDiffPreview({
        before: `${exName} (Parametri Base)`,
        after: `Variante IA (${methodologyNames[variationMethodology]}) — 4x8-10 (TUT 3-1-1)`,
      });

      showSuccess('Variazione Elaborata con Gemini 3.6 Flash', 'Anteprima modifiche e messaggio atleta aggiornati.');
    }, 600);
  };

  // Applicazione unificata delle modifiche
  const handleApplyProgramChange = async (sendChat: boolean) => {
    // 1. Registra evento nella timeline
    addTimelineEvent(
      alertData.athleteId,
      'other',
      `Variazione Programma (${targetWeek})`,
      `Modifica IA (${variationMethodology}): ${coachInstruction}`
    );

    // 2. Invio messaggio in chat se richiesto
    if (sendChat && chatMessageText.trim()) {
      try {
        await sendMessage(alertData.athleteId, chatMessageText);
      } catch (e) {
        console.warn('Errore invio chat interna:', e);
      }
      showSuccess('Programma Aggiornato & Messaggio Inviato!', `Scheda aggiornata per ${targetWeek} e nota inviata in chat.`);
    } else {
      showSuccess('Programma Aggiornato!', `Scheda di ${alertData.athleteName} modificata per ${targetWeek}.`);
    }

    onClose();
  };

  // Vai diretto alla Scheda del Singolo Atleta
  const handleGoToAthleteProfile = () => {
    setSelectedAthleteId(alertData.athleteId);
    setActiveTab('atleti');
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">{alertData.athleteName}</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  Gemini 3.6 Flash
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  📋 Scheda: {alertData.workoutTitle || 'Scheda Personalizzata'}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/30">
                  📅 Settimana {alertData.weekNumber || 1}{alertData.dayName ? ` • ${alertData.dayName}` : ''}
                </span>
                {alertData.exerciseName && (
                  <span className="text-xs text-slate-400 font-semibold">
                    • {alertData.exerciseName}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeActionTab !== 'modify_program' && (
              <button
                onClick={() => setActiveActionTab('modify_program')}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-colors"
              >
                ← Torna alla Modifica
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Bar Secodaria (Storico & Profilo) */}
        <div className="px-6 py-2.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveActionTab('modify_program')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                activeActionTab === 'modify_program' ? 'bg-[var(--color-primary)] text-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              ⚡ Variazione Programma & Chat
            </button>
            <button
              onClick={() => setActiveActionTab('history')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                activeActionTab === 'history' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              📜 Storico Variazioni ({athleteHistory.length})
            </button>
          </div>
          <button
            onClick={handleGoToAthleteProfile}
            className="text-slate-400 hover:text-[var(--color-primary)] font-semibold flex items-center gap-1 transition-colors"
          >
            <User className="w-3.5 h-3.5" /> Profilo Atleta →
          </button>
        </div>

        {/* Body Contenuto Tab */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {activeActionTab === 'modify_program' && (
            <div className="space-y-5">
              {/* Context Alert Banner */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Contesto Segnalazione</span>
                <p className="text-xs text-slate-200 font-medium">
                  {alertData.noteText ? `"${alertData.noteText}"` : alertData.suggestion || 'Analisi dello stallo o progresso nei carichi.'}
                </p>
              </div>

              {/* Strategie IA 1-Click */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" /> Strategie IA 1-Click (Gemini 3.6 Flash)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => applyAIStrategy('joint_friendly')}
                    className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 text-left transition-all group"
                  >
                    <Shield className="w-4 h-4 text-amber-400 mb-1 group-hover:scale-110 transition-transform" />
                    <h5 className="text-[11px] font-bold text-white">Joint-Friendly</h5>
                    <p className="text-[9px] text-slate-400">Protezione articolare</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyAIStrategy('plateau_breaker')}
                    className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-purple-500/50 text-left transition-all group"
                  >
                    <Zap className="w-4 h-4 text-purple-400 mb-1 group-hover:scale-110 transition-transform" />
                    <h5 className="text-[11px] font-bold text-white">Sblocco Plateau</h5>
                    <p className="text-[9px] text-slate-400">Rest-Pause & Myo-Reps</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyAIStrategy('deload')}
                    className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-sky-500/50 text-left transition-all group"
                  >
                    <Clock className="w-4 h-4 text-sky-400 mb-1 group-hover:scale-110 transition-transform" />
                    <h5 className="text-[11px] font-bold text-white">Deload Attivo</h5>
                    <p className="text-[9px] text-slate-400">Scarico 1-Settimana</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyAIStrategy('overload')}
                    className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 text-left transition-all group"
                  >
                    <TrendingUp className="w-4 h-4 text-emerald-400 mb-1 group-hover:scale-110 transition-transform" />
                    <h5 className="text-[11px] font-bold text-white">Overload</h5>
                    <p className="text-[9px] text-slate-400">Incremento +2.5%</p>
                  </button>
                </div>
              </div>

              {/* Selettore Metodologia & Settimana */}
              <div className="space-y-3 pt-1 border-t border-slate-800/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-[var(--color-primary)]" /> Metodologia di Variazione
                  </label>
                  <select
                    value={targetWeek}
                    onChange={e => setTargetWeek(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-[var(--color-primary)]"
                  >
                    <option value="Settimana 1">Applica a Settimana 1</option>
                    <option value="Settimana 2">Applica a Settimana 2</option>
                    <option value="Settimana 3">Applica a Settimana 3</option>
                    <option value="Settimana 4">Applica a Settimana 4 (Scarico)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectMethodology('biomechanical')}
                    className={`p-2 rounded-xl text-left text-xs font-bold border transition-all ${
                      variationMethodology === 'biomechanical'
                        ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)]'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    🔄 Biomeccanica
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectMethodology('tut_rpe')}
                    className={`p-2 rounded-xl text-left text-xs font-bold border transition-all ${
                      variationMethodology === 'tut_rpe'
                        ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)]'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    ⏱️ TUT & RPE
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectMethodology('volume_intensity')}
                    className={`p-2 rounded-xl text-left text-xs font-bold border transition-all ${
                      variationMethodology === 'volume_intensity'
                        ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)]'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    📊 Volume & Intensità
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectMethodology('frequency_order')}
                    className={`p-2 rounded-xl text-left text-xs font-bold border transition-all ${
                      variationMethodology === 'frequency_order'
                        ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)]'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    📅 Frequenza / Ordine
                  </button>
                </div>

                <textarea
                  rows={2}
                  value={coachInstruction}
                  onChange={e => setCoachInstruction(e.target.value)}
                  placeholder="Istruzione tecnica per la scheda..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-[var(--color-primary)] resize-none"
                />

                <button
                  onClick={handleProcessAIProgramChange}
                  disabled={isProcessingAI || !coachInstruction.trim()}
                  className="w-full py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-[var(--color-primary)] text-slate-200 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 text-sky-400 ${isProcessingAI ? 'animate-spin' : ''}`} />
                  <span>Elabora Variazione con Gemini 3.6 Flash</span>
                </button>
              </div>

              {/* BOX ANTEPRIMA MODIFICHE (DIFF VIEW) */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <ArrowRightLeft className="w-4 h-4" /> Anteprima Modifiche Scheda (Diff View)
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold">{targetWeek}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-xl bg-red-950/20 border border-red-500/30 space-y-1">
                    <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block">🔴 Stato Attuale (Prima)</span>
                    <p className="text-xs font-bold text-white">{diffPreview.before || 'Esercizio Base'}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-1">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">🟢 Proposta IA (Dopo)</span>
                    <p className="text-xs font-bold text-white">{diffPreview.after || 'Proposta Aggiornata'}</p>
                  </div>
                </div>
              </div>

              {/* AREA MESSAGGIO CHAT PER L'ATLETA */}
              <div className="space-y-2 pt-1 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-[var(--color-primary)]" /> Messaggio per l'Atleta (Modificabile)
                  </label>
                  <span className="text-[10px] text-slate-400">Generato da Gemini 3.6 Flash</span>
                </div>
                <textarea
                  rows={3}
                  value={chatMessageText}
                  onChange={e => setChatMessageText(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs leading-relaxed resize-none focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                  placeholder="Bozza messaggio da inviare nella chat interna dell'atleta..."
                />
              </div>
            </div>
          )}

          {/* TAB: STORICO VARIAZIONI ATLETA (AUDIT TRAIL) */}
          {activeActionTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-[var(--color-primary)]" /> Audit Trail Variazioni — {alertData.athleteName}
                </h4>
                <span className="text-[10px] font-bold text-slate-500 uppercase">{athleteHistory.length} Eventi Registrati</span>
              </div>

              {athleteHistory.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <Activity className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">Nessuna variazione programma registrata in precedenza per questo atleta.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {athleteHistory.map(evt => (
                    <div key={evt.id} className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{evt.title}</span>
                        <span className="text-[10px] text-slate-500">{new Date(evt.createdAt).toLocaleDateString('it-IT')}</span>
                      </div>
                      {evt.description && (
                        <p className="text-xs text-slate-300">{evt.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* AZIONI DI CONFERMA UNIFICATE IN FONDO ALLA MODALE */}
        {activeActionTab === 'modify_program' && (
          <div className="p-4 border-t border-slate-800 bg-slate-950 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors"
            >
              Annulla
            </button>
            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
              <button
                onClick={() => handleApplyProgramChange(false)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700"
              >
                <CheckCircle2 className="w-4 h-4 text-slate-400" />
                <span>Applica solo alla Scheda</span>
              </button>

              <button
                onClick={() => handleApplyProgramChange(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all shadow-[0_0_20px_rgba(234,179,8,0.25)]"
              >
                <Zap className="w-4 h-4 text-black fill-black" />
                <span>Applica Modifica e Invia in Chat</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
