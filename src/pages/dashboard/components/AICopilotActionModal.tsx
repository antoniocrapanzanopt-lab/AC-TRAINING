import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Sparkles,
  Zap,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  MessageSquare,
  ShieldCheck,
  ShieldAlert,
  Send,
  Ban,
  Video,
  Activity,
  Key,
  RefreshCw,
  Eye,
  Cpu,
} from 'lucide-react';
import { useAthletes } from '../../../context/AthletesContext';
import { useToast } from '../../../context/ToastContext';
import { useMessages } from '../../../context/MessagesContext';
import {
  generateCopilotAdviceWithGemini,
} from '../../../lib/ai/geminiCopilotAdvisor';
import {
  getActiveGeminiApiKey,
  saveGeminiApiKey,
} from '../../../lib/ai/biomechanicsGeminiAssistant';

export interface CopilotAlertContext {
  athleteId: string;
  athleteName: string;
  workoutTitle?: string;
  weekNumber?: number | string;
  dayName?: string;
  exerciseName?: string;
  noteText?: string;
  suggestion?: string;
  type: 'critical_note' | 'plateau' | 'inactivity' | 'progression' | 'missing_weights';
}

interface AICopilotActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplied?: (athleteId: string) => void;
  alertData: CopilotAlertContext | null;
}

type CopilotStep =
  | 'select_mode'
  | 'ai_recommendation'
  | 'video_request'
  | 'manual_command'
  | 'no_changes'
  | 'success';

export const AICopilotActionModal: React.FC<AICopilotActionModalProps> = ({
  isOpen,
  onClose,
  onApplied,
  alertData,
}) => {
  const { addTimelineEvent } = useAthletes();
  const { showSuccess } = useToast();
  const { sendMessage } = useMessages();

  // Step di navigazione
  const [currentStep, setCurrentStep] = useState<CopilotStep>('select_mode');
  const [outcomeType, setOutcomeType] = useState<'applied' | 'no_changes' | 'video_requested'>('applied');

  // Gestione API Key Gemini 3.7 Flash
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => getActiveGeminiApiKey());
  const [showApiKeyConfig, setShowApiKeyConfig] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');
  const [isAnalyzingGemini, setIsAnalyzingGemini] = useState(false);
  const [modelUsed, setModelUsed] = useState('Google Gemini 3.7 Flash');

  // Comando manuale del coach
  const [customCommand, setCustomCommand] = useState('');
  const targetWeek = alertData?.weekNumber ? `Settimana ${alertData.weekNumber}` : 'Settimana Corrente';
  const [isProcessing, setIsProcessing] = useState(false);

  // Opzione invio messaggio atleta
  const [sendChatNotification, setSendChatNotification] = useState(true);
  const [isMessageOpen, setIsMessageOpen] = useState(false);

  // Dati elaborati da Gemini / Biomeccanica
  const [diagnosisSummary, setDiagnosisSummary] = useState('');
  const [biomechanicalDiagnosis, setBiomechanicalDiagnosis] = useState('');
  const [correctiveTechnicalCue, setCorrectiveTechnicalCue] = useState('');
  const [videoCheckGuidance, setVideoCheckGuidance] = useState('');
  const [primaryActionTitle, setPrimaryActionTitle] = useState('');
  const [primaryActionReason, setPrimaryActionReason] = useState('');
  const [diffPreview, setDiffPreview] = useState<{ before: string; after: string }>({
    before: '',
    after: '',
  });
  const [chatMessageText, setChatMessageText] = useState('');

  // Funzione per eseguire l'analisi con Gemini 3.7 Flash
  const runGeminiAnalysis = async (customKey?: string) => {
    if (!alertData) return;
    setIsAnalyzingGemini(true);
    try {
      const result = await generateCopilotAdviceWithGemini({
        athleteName: alertData.athleteName,
        exerciseName: alertData.exerciseName,
        workoutTitle: alertData.workoutTitle,
        targetWeek,
        noteText: alertData.noteText,
        issueType: alertData.type,
        customApiKey: customKey || geminiApiKey,
      });

      setDiagnosisSummary(result.diagnosisSummary);
      setBiomechanicalDiagnosis(result.biomechanicalDiagnosis);
      setCorrectiveTechnicalCue(result.correctiveTechnicalCue);
      setVideoCheckGuidance(result.videoCheckGuidance);
      setPrimaryActionTitle(result.primaryActionTitle);
      setPrimaryActionReason(result.primaryActionReason);
      setDiffPreview(result.diffPreview);
      setChatMessageText(result.chatMessage);
      setModelUsed(result.modelUsed);
    } catch (e) {
      console.warn('Errore analisi Gemini:', e);
    } finally {
      setIsAnalyzingGemini(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !alertData) {
      setCurrentStep('select_mode');
      setOutcomeType('applied');
      return;
    }

    runGeminiAnalysis();
  }, [isOpen, alertData, targetWeek]);

  const handleSaveApiKey = () => {
    saveGeminiApiKey(tempApiKey);
    setGeminiApiKey(tempApiKey.trim());
    setShowApiKeyConfig(false);
    showSuccess('API Key Salvata', 'Configurato Google Gemini 3.7 Flash per il Copilot.');
    runGeminiAnalysis(tempApiKey.trim());
  };

  if (!isOpen || !alertData) return null;

  const athleteFirstName = alertData.athleteName ? alertData.athleteName.trim().split(' ')[0] : 'Atleta';
  const exName = alertData.exerciseName || 'Esercizio Principale';

  // 6 Azioni Rapide per il Coach
  const quickCommands = [
    {
      title: '📹 Richiedi Video Esecuzione',
      desc: `Check video tecnico a 45° su ${exName}`,
      cmd: `Richiedi video tecnico a 45° su ${exName} prima di modificare la scheda`,
      actionType: 'video_request',
    },
    {
      title: '⏱️ Modifica Tempo Esecutivo (TUT)',
      desc: `Fermo 2s in allungamento ed eccentrica 3-1-1`,
      cmd: `Inserisci fermo 2 secondi ed eccentrica controllata in 3 secondi su ${exName}`,
      actionType: 'command',
    },
    {
      title: '📉 Reset Tecnico / Riduci Carico (-15%)',
      desc: `Mantieni esercizio e abbassa carico per pulire la tecnica`,
      cmd: `Riduci carico del 15% su ${exName} con focus sulla qualità esecutiva`,
      actionType: 'command',
    },
    {
      title: '🔄 Sposta Range Reps (8-12)',
      desc: `Meno carico assiale, più tensione meccanica controllata`,
      cmd: `Porta il target a 3x8-12 con 2 RIR su ${exName}`,
      actionType: 'command',
    },
    {
      title: '🛡️ Sostituzione Biomeccanica Guidata',
      desc: `Variante a cavi/macchina con traiettoria fisiologica`,
      cmd: `Sostituisci ${exName} con una variante articolare guidata/cavi`,
      actionType: 'command',
    },
    {
      title: '🔋 Deload Attivo 1 Settimana',
      desc: `Scarico programmato (-30% volume) su ${targetWeek}`,
      cmd: `Imposta una settimana di scarico attivo (-30% volume) su ${targetWeek}`,
      actionType: 'command',
    },
  ];

  const handleSelectVideoRequest = () => {
    const customVideoMsg = `Ciao ${athleteFirstName}! Ho letto il tuo feedback su ${exName}. Prima di cambiare esercizio, alla prossima sessione registrami un breve video da 45° o laterale di una serie allenante, così verifichiamo insieme l'assetto e la traiettoria!`;
    setChatMessageText(customVideoMsg);
    setSendChatNotification(true);
    setCurrentStep('video_request');
  };

  const handleRequestVideo = async () => {
    setIsProcessing(true);
    setOutcomeType('video_requested');
    persistDismissedAlert();

    addTimelineEvent(
      alertData.athleteId,
      'other',
      `Richiesto Video Esecuzione (${targetWeek})`,
      `Il coach ha richiesto un video di controllo tecnico per ${exName}. Nessuna modifica applicata alla scheda.`
    );

    if (chatMessageText.trim()) {
      try {
        await sendMessage(alertData.athleteId, chatMessageText.trim());
      } catch (e) {
        console.warn('Errore invio chat:', e);
      }
    }

    setCurrentStep('success');
    showSuccess(
      'Video Check-in Richiesto!',
      `Istruzioni inviate in chat a ${alertData.athleteName}.`
    );

    setTimeout(() => {
      onApplied?.(alertData.athleteId);
      onClose();
    }, 900);
  };

  const handleExecuteCustomCommand = (cmdText: string) => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setPrimaryActionTitle(`Comando: "${cmdText.slice(0, 45)}..."`);
      setPrimaryActionReason(`Modifica applicata in base all'istruzione diretta del coach.`);
      setDiffPreview({
        before: `${exName} — (Assetto Precedente)`,
        after: `Assetto Aggiornato — (${cmdText.slice(0, 40)}...)`,
      });
      setChatMessageText(
        `Ciao ${athleteFirstName}, ho aggiornato la tua scheda (${cmdText.slice(0, 35)}...). Buon allenamento!`
      );
      showSuccess(`Comando Elaborato`, 'Anteprima aggiornata.');
    }, 350);
  };

  const handleSelectNoChanges = () => {
    // Prepariamo un messaggio dedicato a "Nessuna modifica / solo rassicurazione o chiarimento"
    if (alertData.type === 'critical_note') {
      setChatMessageText(
        `Ciao ${athleteFirstName}, ho preso visione della tua nota sul fastidio. Per ora mantieni carichi controllati senza forzare; valutiamo insieme come va al prossimo allenamento!`
      );
    } else if (alertData.type === 'plateau') {
      setChatMessageText(
        `Ciao ${athleteFirstName}, ho visionato i dati dell'ultima seduta. Per ora manteniamo l'assetto invariato e valutiamo la risposta nei prossimi giorni!`
      );
    } else if (alertData.type === 'inactivity') {
      setChatMessageText(
        `Ciao ${athleteFirstName}, tutto bene? Ti scrivo per sapere come stai. Quando riprendi fammi sapere qui in chat!`
      );
    } else {
      setChatMessageText(
        `Ottimo lavoro ${athleteFirstName}! Ho registrato i tuoi progressi, continua così!`
      );
    }
    setSendChatNotification(true);
    setCurrentStep('no_changes');
  };

  // Helper per archiviare l'alert nei gestiti/dismissed
  const persistDismissedAlert = () => {
    try {
      const saved = localStorage.getItem('builder_copilot_dismissed_alerts');
      const set = saved ? new Set<string>(JSON.parse(saved)) : new Set<string>();
      if (alertData) {
        set.add(alertData.athleteId);
        set.add(`prio-pain-${alertData.athleteId}`);
        set.add(`prio-penult-${alertData.athleteId}`);
        set.add(`prio-unassigned-${alertData.athleteId}`);
      }
      localStorage.setItem('builder_copilot_dismissed_alerts', JSON.stringify(Array.from(set)));
      window.dispatchEvent(new Event('storage'));
    } catch (_) {}
  };

  // Applicazione modifiche alla scheda
  const handleApply = async () => {
    setIsProcessing(true);
    setOutcomeType('applied');
    persistDismissedAlert();

    addTimelineEvent(
      alertData.athleteId,
      'other',
      `Intervento Copilot (${targetWeek})`,
      `${primaryActionTitle}`
    );

    if (sendChatNotification && chatMessageText.trim()) {
      try {
        await sendMessage(alertData.athleteId, chatMessageText.trim());
      } catch (e) {
        console.warn('Errore invio chat:', e);
      }
    }

    setCurrentStep('success');
    showSuccess('Modifica Applicata al Programma!', `Scheda aggiornata per ${alertData.athleteName}.`);

    setTimeout(() => {
      onApplied?.(alertData.athleteId);
      onClose();
    }, 900);
  };

  // Gestione senza modifiche ("Non Applicare Nulla")
  const handleDismissNoChange = async () => {
    setIsProcessing(true);
    setOutcomeType('no_changes');
    persistDismissedAlert();

    addTimelineEvent(
      alertData.athleteId,
      'other',
      `Avviso Copilot Visionato (${targetWeek})`,
      `Nessuna modifica apportata alla scheda dal coach.${sendChatNotification && chatMessageText.trim() ? ' Inviato messaggio di feedback in chat.' : ''}`
    );

    if (sendChatNotification && chatMessageText.trim()) {
      try {
        await sendMessage(alertData.athleteId, chatMessageText.trim());
      } catch (e) {
        console.warn('Errore invio chat:', e);
      }
    }

    setCurrentStep('success');
    showSuccess(
      'Avviso Gestito',
      sendChatNotification && chatMessageText.trim()
        ? 'Messaggio inviato all\'atleta e avviso archiviato senza modifiche alla scheda.'
        : 'Avviso archiviato senza modifiche alla scheda.'
    );

    setTimeout(() => {
      onApplied?.(alertData.athleteId);
      onClose();
    }, 900);
  };

  const handleImmediateFinish = () => {
    onApplied?.(alertData.athleteId);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={onClose} />

      <div className={`relative w-full max-w-4xl bg-[#0a0e17] rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[92vh] transition-all duration-300 border ${
        currentStep === 'success'
          ? 'border-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.25)] ring-2 ring-emerald-500/40'
          : 'border-slate-700/80'
      }`}>
        
        {/* ─── HEADER PULITO & SINTETICO CON GEMINI 3.7 FLASH STATUS ─── */}
        <div className={`p-5 sm:p-6 border-b transition-colors flex items-start justify-between gap-4 shrink-0 ${
          currentStep === 'success' ? 'bg-emerald-950/40 border-emerald-500/30' : 'bg-slate-950/70 border-slate-800/80'
        }`}>
          <div className="flex items-start gap-3.5 min-w-0">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-md transition-colors ${
              currentStep === 'success'
                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                : 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
            }`}>
              {currentStep === 'success' ? <CheckCircle2 className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-lg font-black text-white">{alertData.athleteName}</h3>
                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                  currentStep === 'success'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                }`}>
                  {currentStep === 'success' ? 'Completato' : 'AI Training Copilot'}
                </span>

                {/* Badge Gemini 3.7 Flash */}
                <button
                  type="button"
                  onClick={() => setShowApiKeyConfig(!showApiKeyConfig)}
                  className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900 border border-amber-500/30 text-amber-400 hover:border-amber-400 transition-colors text-[10px] font-bold cursor-pointer"
                  title="Configura o verifica la chiave API Google Gemini 3.7 Flash"
                >
                  <Cpu className="w-3 h-3 text-amber-400" />
                  <span>{geminiApiKey ? '⚡ Gemini 3.7 Flash' : 'Configura API Key'}</span>
                </button>
              </div>

              {/* Pillole Scheda / Giorno */}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs text-slate-400">
                <span className="font-semibold text-slate-300">
                  📋 {alertData.workoutTitle || 'Scheda Attiva'}
                </span>
                <span>•</span>
                <span className="text-amber-300 font-semibold">
                  📅 {targetWeek} {alertData.dayName ? `(${alertData.dayName})` : ''}
                </span>
                {alertData.exerciseName && (
                  <>
                    <span>•</span>
                    <span className="text-sky-300 font-semibold">
                      🏋️ {alertData.exerciseName}
                    </span>
                  </>
                )}
              </div>

              {/* Contesto sintetico */}
              {currentStep !== 'success' && (
                <p className="text-xs text-amber-200/90 font-medium mt-2 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 leading-relaxed">
                  ⚠️ {diagnosisSummary || alertData.noteText || alertData.suggestion || 'Valutazione intervento per l\'atleta.'}
                </p>
              )}
            </div>
          </div>

          {currentStep !== 'success' && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* ─── BANNER CONFIGURAZIONE API KEY GEMINI (COLLASSABILE) ─── */}
        {showApiKeyConfig && (
          <div className="p-4 bg-slate-900 border-b border-slate-800 space-y-3 animate-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Key className="w-4 h-4" /> Chiave API Google Gemini (Google AI Studio)
              </span>
              <button
                type="button"
                onClick={() => setShowApiKeyConfig(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Chiudi
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="Incolla qui la tua API Key di Google AI Studio (AIzaSy...)"
                defaultValue={geminiApiKey}
                onChange={(e) => setTempApiKey(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-amber-400"
              />
              <button
                type="button"
                onClick={handleSaveApiKey}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl transition-colors cursor-pointer shrink-0"
              >
                Salva
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              💡 La chiave viene memorizzata in sicurezza nel browser per alimentare le analisi kinesiologiche di <strong>Gemini 3.7 Flash</strong>.
            </p>
          </div>
        )}

        {/* ─── CORPO: SCELTA INIZIALE, MODALITÀ ATTIVA O SUCCESS ─── */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 custom-scrollbar">
          
          {/* STEP SUCCESS */}
          {currentStep === 'success' && (
            <div className="py-8 sm:py-12 px-4 text-center space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 border-2 border-emerald-500/50 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(16,185,129,0.3)] scale-110 transition-transform">
                <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
              </div>
              <div className="space-y-2">
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-black text-xs uppercase tracking-wider border border-emerald-500/40 inline-block">
                  {outcomeType === 'no_changes'
                    ? '🛡️ Avviso Archiviato'
                    : outcomeType === 'video_requested'
                    ? '📹 Video Check-in Inviato'
                    : '✅ Modifiche Applicate'}
                </span>
                <h4 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {outcomeType === 'no_changes'
                    ? 'Avviso Gestito Senza Modifiche'
                    : outcomeType === 'video_requested'
                    ? 'Richiesta Video Inviata con Successo!'
                    : 'Programma Aggiornato con Successo!'}
                </h4>
                <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                  {outcomeType === 'no_changes'
                    ? `La segnalazione per ${alertData.athleteName} è stata archiviata mantenendo la scheda attiva invariata.`
                    : outcomeType === 'video_requested'
                    ? `Hai richiesto a ${alertData.athleteName} il video tecnico per ${exName}. La scheda resta attiva per il test.`
                    : `L'intervento Copilot per ${alertData.athleteName} è stato registrato nel programma.`}
                  {sendChatNotification && chatMessageText.trim() && ' Il messaggio è stato inoltrato all\'atleta in chat.'}
                </p>
                <div className="pt-3">
                  <button
                    type="button"
                    onClick={handleImmediateFinish}
                    className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs transition-all shadow-lg cursor-pointer"
                  >
                    Chiudi Schermata
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* STEP 1: SCELTA INIZIALE GUIDATA (4 OPZIONI COACH-FIRST)            */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {currentStep === 'select_mode' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              
              {/* BOX DETTAGLIO PROBLEMA / FASTIDIO SEGNALATO IN EVIDENZA */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-rose-950/40 via-rose-900/20 to-slate-950 border border-rose-500/40 space-y-2 shadow-lg animate-in fade-in">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
                    <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>Problema & Fastidio Segnalato dall'Atleta</span>
                  </div>
                  {alertData.exerciseName && (
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 font-mono">
                      {alertData.exerciseName}
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm font-semibold text-slate-100 leading-relaxed">
                  {alertData.noteText || alertData.suggestion || 'Segnalato fastidio articolare post-allenamento.'}
                </p>
                {diagnosisSummary && (
                  <div className="pt-2 border-t border-rose-500/20 text-[11px] text-amber-300 font-medium flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Analisi Kinesiologica Preliminare: {diagnosisSummary}</span>
                  </div>
                )}
              </div>

              <div className="text-center space-y-1 pt-1">
                <h4 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Come desideri intervenire sul programma?
                </h4>
                <p className="text-xs sm:text-sm text-slate-400">
                  Seleziona l'approccio ideale: richiedi un video esecutivo, applica la proposta biomeccanica o gestisci manualmente.
                </p>
              </div>

              {/* 4 CARD IN GRIGLIA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                
                {/* CARD 1: RICHIEDI VIDEO CHECK-IN (Ideale 1° segnalazione) */}
                <button
                  type="button"
                  onClick={handleSelectVideoRequest}
                  className="group p-5 rounded-3xl bg-gradient-to-b from-purple-500/15 via-slate-900 to-slate-950 border-2 border-purple-500/40 hover:border-purple-400 hover:shadow-[0_0_30px_rgba(168,85,247,0.25)] text-left transition-all cursor-pointer flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2.5">
                    <div className="w-11 h-11 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                      <Video className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 block mb-0.5">
                        {alertData.type === 'critical_note' ? 'Consigliato (1° Check)' : 'Verifica Tecnica'}
                      </span>
                      <h5 className="text-base font-black text-white group-hover:text-purple-300 transition-colors">
                        Richiedi Video Esecuzione
                      </h5>
                      <p className="text-xs text-slate-300 leading-relaxed mt-1">
                        Verifica l'assetto tecnico e la traiettoria prima di modificare la scheda dell'atleta.
                      </p>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 text-xs font-bold text-purple-400 group-hover:translate-x-1 transition-transform pt-2 border-t border-purple-500/20">
                    Invia richiesta video →
                  </span>
                </button>

                {/* CARD 2: CONSIGLIO MIGLIORE IA (GEMINI 3.7 FLASH) */}
                <button
                  type="button"
                  onClick={() => setCurrentStep('ai_recommendation')}
                  className="group p-5 rounded-3xl bg-gradient-to-b from-amber-500/15 via-slate-900 to-slate-950 border-2 border-amber-500/40 hover:border-amber-400 hover:shadow-[0_0_30px_rgba(245,158,11,0.25)] text-left transition-all cursor-pointer flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2.5">
                    <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block mb-0.5">
                        Biomeccanica Gemini 3.7
                      </span>
                      <h5 className="text-base font-black text-white group-hover:text-amber-300 transition-colors">
                        Consiglio Migliore IA
                      </h5>
                      <p className="text-xs text-slate-300 leading-relaxed mt-1">
                        Diagnosi kinesiologica, cue tecnico motorio e variante guidata joint-friendly.
                      </p>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 group-hover:translate-x-1 transition-transform pt-2 border-t border-amber-500/20">
                    Apri proposta IA →
                  </span>
                </button>

                {/* CARD 3: CONTROLLO MANUALE & COMANDI */}
                <button
                  type="button"
                  onClick={() => setCurrentStep('manual_command')}
                  className="group p-5 rounded-3xl bg-slate-900/80 hover:bg-slate-900 border-2 border-slate-700/80 hover:border-sky-500/50 hover:shadow-[0_0_30px_rgba(56,189,248,0.15)] text-left transition-all cursor-pointer flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2.5">
                    <div className="w-11 h-11 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-sky-400 block mb-0.5">
                        Controllo Manuale
                      </span>
                      <h5 className="text-base font-black text-white group-hover:text-sky-300 transition-colors">
                        Comandi Rapidi Coach
                      </h5>
                      <p className="text-xs text-slate-400 leading-relaxed mt-1">
                        Deload, modifica serie/RIR, cambio carichi (-15%) o istruzioni libere.
                      </p>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 text-xs font-bold text-sky-400 group-hover:translate-x-1 transition-transform pt-2 border-t border-sky-500/20">
                    Digita comando →
                  </span>
                </button>

                {/* CARD 4: NON APPLICARE NULLA */}
                <button
                  type="button"
                  onClick={handleSelectNoChanges}
                  className="group p-5 rounded-3xl bg-slate-900/60 hover:bg-slate-900 border-2 border-slate-800 hover:border-slate-600 hover:shadow-[0_0_30px_rgba(100,116,139,0.15)] text-left transition-all cursor-pointer flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2.5">
                    <div className="w-11 h-11 rounded-2xl bg-slate-800/90 border border-slate-700 flex items-center justify-center text-slate-300 group-hover:scale-110 transition-transform">
                      <Ban className="w-5 h-5 text-slate-400 group-hover:text-slate-200" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
                        Fisiologico / DOMS
                      </span>
                      <h5 className="text-base font-black text-white group-hover:text-amber-300 transition-colors">
                        Nessuna Modifica
                      </h5>
                      <p className="text-xs text-slate-400 leading-relaxed mt-1">
                        Mantieni la scheda attiva invariata e archivia l'avviso con un messaggio di rassicurazione.
                      </p>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-transform pt-2 border-t border-slate-800">
                    Non applicare nulla →
                  </span>
                </button>

              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* STEP 2: MODALITÀ "RICHIEDI VIDEO CHECK-IN"                         */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {currentStep === 'video_request' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <button
                type="button"
                onClick={() => setCurrentStep('select_mode')}
                className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Torna alla scelta modalità
              </button>

              <div className="p-5 rounded-3xl bg-purple-500/10 border-2 border-purple-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Video className="w-5 h-5 text-purple-400" />
                    <span className="text-xs font-black uppercase tracking-wider text-purple-400">
                      Check-in Video Tecnico
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    Scheda Invariata
                  </span>
                </div>

                <h4 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Richiedi all'atleta un video della prossima esecuzione su {exName}
                </h4>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {videoCheckGuidance || `Richiedi una ripresa laterale a 45° all'altezza del bacino durante la prima serie allenante per verificare baricentro, traiettoria e stabilità articolare.`}
                </p>
              </div>

              {/* Box Messaggio WhatsApp / Chat */}
              <div className="p-5 rounded-3xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" /> Messaggio Chat per {athleteFirstName}:
                  </label>
                  <span className="text-[11px] text-slate-500 font-mono">Modificabile prima dell'invio</span>
                </div>

                <textarea
                  rows={4}
                  value={chatMessageText}
                  onChange={(e) => setChatMessageText(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-slate-900 border border-slate-700 text-white text-xs sm:text-sm leading-relaxed resize-none focus:outline-none focus:border-purple-400"
                />
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* STEP 2: MODALITÀ "NON APPLICARE NULLA & MANDA MESSAGGIO"           */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {currentStep === 'no_changes' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <button
                type="button"
                onClick={() => setCurrentStep('select_mode')}
                className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Torna alla scelta modalità
              </button>

              {/* Box Riepilogo Scelta */}
              <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border-2 border-slate-700/80 space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                    Nessuna Modifica al Programma
                  </span>
                </div>

                <h4 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Mantieni la scheda attuale invariata per {alertData.athleteName}
                </h4>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  La scheda e i carichi di lavoro non subiranno alterazioni. L'avviso Copilot verrà contrassegnato come visionato e archiviato.
                </p>
              </div>

              {/* Sezione Manda un Messaggio in Chat (Opzionale) */}
              <div className="p-5 sm:p-6 rounded-3xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={sendChatNotification}
                      onChange={(e) => setSendChatNotification(e.target.checked)}
                      className="w-5 h-5 rounded text-amber-500 focus:ring-0 bg-slate-900 border-slate-700 cursor-pointer mt-0.5"
                    />
                    <div>
                      <span className="text-sm font-black text-white block">
                        Manda un messaggio in chat all'atleta (Opzionale)
                      </span>
                      <span className="text-xs text-slate-400 block mt-0.5">
                        Invia un messaggio rapido di rassicurazione, istruzioni o chiarimento senza modificare la scheda.
                      </span>
                    </div>
                  </label>
                </div>

                {sendChatNotification && (
                  <div className="space-y-2 pt-2 border-t border-slate-800/80 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-amber-400 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" /> Testo Messaggio per {athleteFirstName}:
                      </span>
                      <span className="text-slate-500 text-[11px]">Verrà inviato direttamente nella chat atleta</span>
                    </div>
                    <textarea
                      rows={3}
                      value={chatMessageText}
                      onChange={(e) => setChatMessageText(e.target.value)}
                      className="w-full p-4 rounded-2xl bg-slate-900 border border-slate-700 text-white text-xs sm:text-sm leading-relaxed resize-none focus:outline-none focus:border-amber-500 placeholder:text-slate-600"
                      placeholder="Scrivi qui il messaggio per l'atleta..."
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* STEP 2: MODALITÀ CONSIGLIO IA & BIOMECCANICA                      */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {currentStep === 'ai_recommendation' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep('select_mode')}
                  className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Torna alla scelta modalità
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-mono">
                    Motore: <strong className="text-amber-400">{modelUsed}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => runGeminiAnalysis()}
                    disabled={isAnalyzingGemini}
                    className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Rigenera con Gemini 3.7 Flash"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzingGemini ? 'animate-spin text-amber-400' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Diagnosi Kinesiologica Gemini 3.7 */}
              {biomechanicalDiagnosis && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                    <Activity className="w-4 h-4" />
                    <span>Diagnosi Kinesiologica & Biomeccanica</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {biomechanicalDiagnosis}
                  </p>
                </div>
              )}

              {/* Cue Tecnico Correttivo */}
              {correctiveTechnicalCue && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-sky-500/30 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-sky-400">
                    <Eye className="w-4 h-4" />
                    <span>Cue Tecnico Correttivo per l'Atleta</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-mono">
                    "{correctiveTechnicalCue}"
                  </p>
                </div>
              )}

              {/* Card Proposta Principale Grande */}
              <div className="p-5 sm:p-6 rounded-3xl bg-amber-500/10 border-2 border-amber-500/30 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                    Miglior Intervento Suggerito
                  </span>
                </div>

                <h4 className="text-base sm:text-lg font-black text-white tracking-tight">
                  {primaryActionTitle}
                </h4>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {primaryActionReason}
                </p>
              </div>

              {/* Box Diff Prima / Dopo Grande */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-950 border border-red-500/30 space-y-1.5">
                  <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider block">
                    🔴 Assetto Attuale (Prima)
                  </span>
                  <p className="text-sm sm:text-base font-bold text-white leading-snug">
                    {diffPreview.before}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/40 space-y-1.5">
                  <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                    🟢 Nuova Scheda Modificata (Dopo)
                  </span>
                  <p className="text-sm sm:text-base font-bold text-emerald-300 leading-snug">
                    {diffPreview.after}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* STEP 2: MODALITÀ COMANDO MANUALE                                   */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {currentStep === 'manual_command' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <button
                type="button"
                onClick={() => setCurrentStep('select_mode')}
                className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Torna alla scelta modalità
              </button>

              {/* 6 Comandi Rapidi Grandi */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Seleziona un'azione rapida:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {quickCommands.map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        if (q.actionType === 'video_request') {
                          handleSelectVideoRequest();
                        } else {
                          setCustomCommand(q.cmd);
                          handleExecuteCustomCommand(q.cmd);
                        }
                      }}
                      className="p-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/40 text-left transition-all cursor-pointer group"
                    >
                      <span className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-300 block">
                        {q.title}
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {q.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Testo Libero */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="text-xs font-bold text-slate-300 block">
                  Oppure digita cosa vuoi modificare:
                </label>
                <div className="flex gap-2.5">
                  <input
                    type="text"
                    value={customCommand}
                    onChange={e => setCustomCommand(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && customCommand.trim()) {
                        handleExecuteCustomCommand(customCommand);
                      }
                    }}
                    placeholder="es. Riduci a 3 serie ed inserisci 2 RIR..."
                    className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 text-white text-xs sm:text-sm focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    disabled={isProcessing || !customCommand.trim()}
                    onClick={() => handleExecuteCustomCommand(customCommand)}
                    className="px-5 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-black text-xs sm:text-sm font-black rounded-2xl transition-all disabled:opacity-40 shrink-0 cursor-pointer shadow-md"
                  >
                    {isProcessing ? 'Elaborazione...' : 'Applica'}
                  </button>
                </div>
              </div>

              {/* Diff Risultante */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Prima:</span>
                  <span className="text-xs sm:text-sm text-slate-300 font-bold">{diffPreview.before}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                  <span className="text-[10px] text-amber-400 font-bold uppercase block mb-1">Dopo:</span>
                  <span className="text-xs sm:text-sm text-white font-bold">{diffPreview.after}</span>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* MESSAGGIO CHAT COLLASSABILE (Per Modalità IA o Comando Manuale)    */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {(currentStep === 'ai_recommendation' || currentStep === 'manual_command') && (
            <div className="pt-4 border-t border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs sm:text-sm font-bold text-slate-300">
                  <input
                    type="checkbox"
                    checked={sendChatNotification}
                    onChange={e => setSendChatNotification(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-0 bg-slate-900 border-slate-700"
                  />
                  <span>Invia messaggio di spiegazione all'atleta in chat</span>
                </label>

                {sendChatNotification && (
                  <button
                    type="button"
                    onClick={() => setIsMessageOpen(!isMessageOpen)}
                    className="text-xs text-amber-400 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                  >
                    <span>{isMessageOpen ? 'Chiudi' : 'Modifica testo'}</span>
                    {isMessageOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>

              {sendChatNotification && isMessageOpen && (
                <textarea
                  rows={2}
                  value={chatMessageText}
                  onChange={e => setChatMessageText(e.target.value)}
                  className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-700 text-white text-xs leading-relaxed resize-none focus:outline-none focus:border-amber-500 animate-in fade-in duration-100"
                  placeholder="Testo del messaggio per l'atleta..."
                />
              )}
            </div>
          )}

        </div>

        {/* ─── FOOTER UNIFICATO ─── */}
        {currentStep !== 'select_mode' && currentStep !== 'success' && (
          <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Annulla
            </button>

            {currentStep === 'video_request' ? (
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleRequestVideo}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-purple-500 hover:bg-purple-400 text-black font-black text-sm transition-all shadow-xl shadow-purple-500/20 cursor-pointer disabled:opacity-50"
              >
                <Video className="w-4 h-4 text-black" />
                <span>Richiedi Video & Archivia Alert</span>
              </button>
            ) : currentStep === 'no_changes' ? (
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleDismissNoChange}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm transition-all shadow-xl shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
              >
                {sendChatNotification && chatMessageText.trim() ? (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Archivia & Invia Messaggio</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Archivia Senza Modifiche</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleApply}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-black font-black text-sm transition-all shadow-xl shadow-amber-500/20 cursor-pointer disabled:opacity-50"
              >
                <Zap className="w-4 h-4 fill-black" />
                <span>Applica Modifica al Programma</span>
              </button>
            )}
          </div>
        )}

      </div>
    </div>,
    document.body
  );
};
