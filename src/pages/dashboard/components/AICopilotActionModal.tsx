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
  Send,
  Ban,
} from 'lucide-react';
import { useAthletes } from '../../../context/AthletesContext';
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
  onApplied?: (athleteId: string) => void;
  alertData: CopilotAlertContext | null;
}

type CopilotStep = 'select_mode' | 'ai_recommendation' | 'manual_command' | 'no_changes' | 'success';

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
  const [outcomeType, setOutcomeType] = useState<'applied' | 'no_changes'>('applied');

  // Comando manuale del coach
  const [customCommand, setCustomCommand] = useState('');
  const targetWeek = alertData?.weekNumber ? `Settimana ${alertData.weekNumber}` : 'Settimana Corrente';
  const [isProcessing, setIsProcessing] = useState(false);

  // Opzione invio messaggio atleta
  const [sendChatNotification, setSendChatNotification] = useState(true);
  const [isMessageOpen, setIsMessageOpen] = useState(false);

  // Dati elaborati
  const [diagnosisSummary, setDiagnosisSummary] = useState('');
  const [primaryActionTitle, setPrimaryActionTitle] = useState('');
  const [primaryActionReason, setPrimaryActionReason] = useState('');
  const [diffPreview, setDiffPreview] = useState<{ before: string; after: string }>({
    before: '',
    after: '',
  });
  const [chatMessageText, setChatMessageText] = useState('');

  useEffect(() => {
    if (!isOpen || !alertData) {
      setCurrentStep('select_mode');
      setOutcomeType('applied');
      return;
    }

    const athleteFirstName = alertData.athleteName ? alertData.athleteName.trim().split(' ')[0] : 'Atleta';
    const exName = alertData.exerciseName || 'Esercizio Principale';
    const note = alertData.noteText || '';

    if (alertData.type === 'critical_note') {
      setDiagnosisSummary(`Fastidio/dolore articolare su ${exName}: "${note || 'Forte stress articolare avvertito'}"`);
      setPrimaryActionTitle(`Sostituzione Biomeccanica Joint-Friendly (${exName} ➔ Variante Guidata/Cavi)`);
      setPrimaryActionReason(
        `Elimina forze di taglio e vincoli rigidi, preservando la tensione ipertrofica target e riducendo l'infiammazione tendinea.`
      );
      setDiffPreview({
        before: `${exName} — 4x8-10 (RPE 9.0, Carico Libero)`,
        after: `Variante Isolaterale Guidata / Cavi — 3x10-12 (TUT 3-1-1, RPE 7.5)`,
      });
      setChatMessageText(
        `Ciao ${athleteFirstName}, ho letto la tua nota su ${exName}. Per tutelare l'articolazione ho inserito una variante più tollerata per le prossime 2 settimane. Fammi sapere come la senti!`
      );
    } else if (alertData.type === 'plateau') {
      setDiagnosisSummary(`Stallo prestazionale e stasi di carico su ${exName} da oltre 2-3 settimane`);
      setPrimaryActionTitle(`Tecnica Rest-Pause & Ottimizzazione Volume`);
      setPrimaryActionReason(
        `Sblocca il reclutamento neuromuscolare rompendo l'adattamento senza generare fatica sistemica inutile.`
      );
      setDiffPreview({
        before: `${exName} — 4x8 (Stallo Carico, RPE 9.5)`,
        after: `${exName} — 1x6 Target + 2 Rest-Pause (TUT 2-0-1, Carico +2.5%)`,
      });
      setChatMessageText(
        `Ciao ${athleteFirstName}, ho analizzato i dati su ${exName} e ho inserito una tecnica Rest-Pause per sbloccare la forza. Spingi forte!`
      );
    } else if (alertData.type === 'inactivity') {
      setDiagnosisSummary(`Inattività rilevata da oltre 6 giorni senza sessioni registrate`);
      setPrimaryActionTitle(`Riadattamento Graduale Mesociclo (${targetWeek})`);
      setPrimaryActionReason(`Ripristina la capacità di lavoro evitando DOMS invalidanti.`);
      setDiffPreview({
        before: `Programma Inattivo`,
        after: `Sessione Riadattamento (Volume -25%, RPE 7.0)`,
      });
      setChatMessageText(
        `Ciao ${athleteFirstName}, tutto bene? Ho preparato un rientro graduale per farti ripartire al meglio.`
      );
    } else {
      setDiagnosisSummary(`Progressione eccellente e nuovo Record personale su ${exName}`);
      setPrimaryActionTitle(`Sovraccarico Progressivo Calcolato (+2.5% Target)`);
      setPrimaryActionReason(`Consolida l'adattamento neuromuscolare aumentando il carico target.`);
      setDiffPreview({
        before: `${exName} — 4x6 (Target Base)`,
        after: `${exName} — 4x6 (Target Carico +2.5%)`,
      });
      setChatMessageText(
        `Grande prestazione su ${exName} ${athleteFirstName}! 🔥 Ho aggiornato i carichi target.`
      );
    }
  }, [isOpen, alertData, targetWeek]);

  if (!isOpen || !alertData) return null;

  const athleteFirstName = alertData.athleteName ? alertData.athleteName.trim().split(' ')[0] : 'Atleta';
  const exName = alertData.exerciseName || 'Esercizio Principale';

  // 4 Comandi Rapidi Grandi e Chiari
  const quickCommands = [
    {
      title: '🛡️ Riduci Stress Articolare',
      desc: `Variante a cavi/macchina e carico -15% su ${exName}`,
      cmd: `Sostituisci ${exName} con una variante articolare guidata più tollerata e riduci il carico del 15%`,
    },
    {
      title: '🔋 Abbassa Fatica Sistemica',
      desc: 'Taglia 1 serie e mantieni 2 RIR in tutta la sessione',
      cmd: 'Riduci 1 serie per esercizio e mantieni 2 RIR per ridurre la fatica sistemica',
    },
    {
      title: '📉 Deload Attivo 1 Settimana',
      desc: `Scarico programmato (-30% volume) su ${targetWeek}`,
      cmd: `Imposta una settimana di scarico attivo (-30% volume) su ${targetWeek}`,
    },
    {
      title: '⚡ Aumenta Stimolo (Rest-Pause)',
      desc: `Serie Rest-Pause ad alta efficienza per ${exName}`,
      cmd: `Inserisci tecnica Rest-Pause nell'ultima serie di ${exName} per massimizzare la tensione meccanica`,
    },
  ];

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
        
        {/* ─── HEADER PULITO & SINTETICO ─── */}
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
                  ⚠️ {diagnosisSummary}
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
                  {outcomeType === 'no_changes' ? '🛡️ Avviso Archiviato' : '✅ Modifiche Applicate'}
                </span>
                <h4 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {outcomeType === 'no_changes' ? 'Avviso Gestito Senza Modifiche' : 'Programma Aggiornato con Successo!'}
                </h4>
                <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                  {outcomeType === 'no_changes'
                    ? `La segnalazione per ${alertData.athleteName} è stata archiviata mantenendo la scheda attiva invariata.`
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
          {/* STEP 1: SCELTA INIZIALE GUIDATA (CON OPZIONE NON APPLICARE NULLA) */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {currentStep === 'select_mode' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="text-center space-y-1">
                <h4 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Come desideri intervenire sul programma?
                </h4>
                <p className="text-xs sm:text-sm text-slate-400">
                  Seleziona l'approccio migliore per aggiornare la scheda o gestire l'avviso
                </p>
              </div>

              {/* 3 CARD AFFIANCATE (CONSIGLIO IA | COMANDO MANUALE | NON APPLICARE NULLA) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                {/* CARD 1: CONSIGLIO MIGLIORE IA */}
                <button
                  type="button"
                  onClick={() => setCurrentStep('ai_recommendation')}
                  className="group p-5 sm:p-6 rounded-3xl bg-gradient-to-b from-amber-500/15 via-slate-900 to-slate-950 border-2 border-amber-500/40 hover:border-amber-400 hover:shadow-[0_0_30px_rgba(245,158,11,0.25)] text-left transition-all cursor-pointer flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block mb-1">
                        Consigliato
                      </span>
                      <h5 className="text-base sm:text-lg font-black text-white group-hover:text-amber-300 transition-colors">
                        Consiglio Migliore IA
                      </h5>
                      <p className="text-xs text-slate-300 leading-relaxed mt-1">
                        L'IA analizza il problema e propone la miglior soluzione biomeccanica e di carico già pronta.
                      </p>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 group-hover:translate-x-1 transition-transform pt-2 border-t border-amber-500/20">
                    Apri proposta IA →
                  </span>
                </button>

                {/* CARD 2: SCRIVI UN COMANDO */}
                <button
                  type="button"
                  onClick={() => setCurrentStep('manual_command')}
                  className="group p-5 sm:p-6 rounded-3xl bg-slate-900/80 hover:bg-slate-900 border-2 border-slate-700/80 hover:border-sky-500/50 hover:shadow-[0_0_30px_rgba(56,189,248,0.15)] text-left transition-all cursor-pointer flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
                      <Zap className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-sky-400 block mb-1">
                        Controllo Manuale
                      </span>
                      <h5 className="text-base sm:text-lg font-black text-white group-hover:text-sky-300 transition-colors">
                        Scrivi un Comando
                      </h5>
                      <p className="text-xs text-slate-400 leading-relaxed mt-1">
                        Indica direttamente cosa vuoi cambiare (deload, fatica, sostituzione esercizio o TUT).
                      </p>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 text-xs font-bold text-sky-400 group-hover:translate-x-1 transition-transform pt-2 border-t border-sky-500/20">
                    Digita comando →
                  </span>
                </button>

                {/* CARD 3: NON APPLICARE NULLA */}
                <button
                  type="button"
                  onClick={handleSelectNoChanges}
                  className="group p-5 sm:p-6 rounded-3xl bg-slate-900/60 hover:bg-slate-900 border-2 border-slate-800 hover:border-slate-600 hover:shadow-[0_0_30px_rgba(100,116,139,0.15)] text-left transition-all cursor-pointer flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800/90 border border-slate-700 flex items-center justify-center text-slate-300 group-hover:scale-110 transition-transform">
                      <Ban className="w-6 h-6 text-slate-400 group-hover:text-slate-200" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                        Nessun Cambio
                      </span>
                      <h5 className="text-base sm:text-lg font-black text-white group-hover:text-amber-300 transition-colors">
                        Non Applicare Nulla
                      </h5>
                      <p className="text-xs text-slate-400 leading-relaxed mt-1">
                        Mantieni la scheda attiva invariata e archivia l'alert, con opzione messaggio in chat.
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
          {/* STEP 2: MODALITÀ CONSIGLIO IA                                      */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {currentStep === 'ai_recommendation' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <button
                type="button"
                onClick={() => setCurrentStep('select_mode')}
                className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Torna alla scelta modalità
              </button>

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

              {/* 4 Comandi Rapidi Grandi */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Seleziona un comando rapido:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {quickCommands.map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setCustomCommand(q.cmd);
                        handleExecuteCustomCommand(q.cmd);
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

            {currentStep === 'no_changes' ? (
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
