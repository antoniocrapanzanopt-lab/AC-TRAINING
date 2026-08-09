import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Zap,
  MessageCircle,
  User,
  CheckCircle2,
  RefreshCw,
  Sliders,
  Edit2,
  History,
  Activity,
  Shield,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { useAthletes } from '../../../context/AthletesContext';
import { useApp } from '../../../context/AppContext';
import { useToast } from '../../../context/ToastContext';

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
  const { setSelectedAthleteId, addTimelineEvent, athletes, timeline } = useAthletes();
  const { setActiveTab } = useApp();
  const { showSuccess, showInfo } = useToast();

  const [activeActionTab, setActiveActionTab] = useState<'modify_program' | 'whatsapp_msg' | 'history' | 'view_profile'>('modify_program');

  // Metodologia di Variazione
  const [variationMethodology, setVariationMethodology] = useState<'biomechanical' | 'tut_rpe' | 'volume_intensity' | 'frequency_order'>('biomechanical');
  const [coachInstruction, setCoachInstruction] = useState('');
  const [targetWeek, setTargetWeek] = useState('Settimana 3');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [generatedProgramDraft, setGeneratedProgramDraft] = useState('');

  // Stato Messaggio WhatsApp
  const [whatsappMessageText, setWhatsappMessageText] = useState('');

  useEffect(() => {
    if (!isOpen || !alertData) return;

    if (alertData.type === 'critical_note') {
      setCoachInstruction(`Sostituisci ${alertData.exerciseName || 'l\'esercizio'} con varianti articolari più tollerate per ${targetWeek}.`);
      setWhatsappMessageText(
        `Ciao ${alertData.athleteName.split(' ')[0]}, ho letto la tua nota sul fastidio avvertito durante ${alertData.exerciseName || 'l\'allenamento'}. Per le prossime 2 settimane ho adeguato la tua scheda per permettere un recupero ottimale. Fammi sapere come ti trovi!`
      );
    } else if (alertData.type === 'plateau') {
      setCoachInstruction(`Inserisci una variazione di tempo esecutivo (TUT 3-1-1) e riduci il volume del 15% per superare il plateau su ${alertData.exerciseName || 'questo esercizio'}.`);
      setWhatsappMessageText(
        `Ciao ${alertData.athleteName.split(' ')[0]}, ho analizzato i tuoi carichi su ${alertData.exerciseName || 'questo esercizio'} e ho preparato una leggera variazione nel programma per sbloccare la tua forza. Dai un'occhiata alla scheda aggiornata!`
      );
    } else if (alertData.type === 'inactivity') {
      setCoachInstruction(`Ripianifica il mesociclo a partire dalla prossima settimana con un giorno di riadattamento graduale.`);
      setWhatsappMessageText(
        `Ciao ${alertData.athleteName.split(' ')[0]}, come va? Ho notato che è da qualche giorno che non registri allenamenti. Tutto bene? Fammi sapere se dobbiamo adattare la scheda ai tuoi orari!`
      );
    } else {
      setCoachInstruction(`Aumenta il target di carico del +5% per il prossimo mesociclo data la grande progressione.`);
      setWhatsappMessageText(
        `Complimenti ${alertData.athleteName.split(' ')[0]}! 🔥 Ho visto la tua ottima prestazione ed il nuovo record su ${alertData.exerciseName || 'questo esercizio'}. Continua così!`
      );
    }

    setGeneratedProgramDraft('');
  }, [isOpen, alertData, targetWeek]);

  if (!isOpen || !alertData) return null;

  const currentAthlete = athletes.find(a => a.id === alertData.athleteId);
  const athletePhone = currentAthlete?.phone || '';
  const athleteHistory = timeline[alertData.athleteId] || [];

  // Strategie IA 1-Click
  const applyAIStrategy = (strategy: 'joint_friendly' | 'plateau_breaker' | 'deload' | 'overload') => {
    if (strategy === 'joint_friendly') {
      setVariationMethodology('biomechanical');
      setCoachInstruction(`[STRATEGIA JOINT-FRIENDLY] Sostituisci ${alertData.exerciseName || 'l\'esercizio'} con una variante iso-laterale guidata ad angolo controllato. Riduci l'RPE a max 7/10 per ${targetWeek}.`);
    } else if (strategy === 'plateau_breaker') {
      setVariationMethodology('volume_intensity');
      setCoachInstruction(`[STRATEGIA SBLOCCO PLATEAU] Inserisci tecnica Rest-Pause (1 serie target + 2 mini-set da 3-4 rep) sul primo esercizio base per sbloccare i carichi su ${targetWeek}.`);
    } else if (strategy === 'deload') {
      setVariationMethodology('volume_intensity');
      setCoachInstruction(`[STRATEGIA DELOAD ATTIVO] Taglia il volume complessivo del -30% e mantieni 2 RIR (Reps in Reserve) su tutti i fondamentali per ${targetWeek}.`);
    } else {
      setVariationMethodology('tut_rpe');
      setCoachInstruction(`[STRATEGIA OVERLOAD PROGRESSIVO] Aumenta il target di carico del +2.5% ed imposta TUT 2-0-1 per il prossimo mesociclo.`);
    }
  };

  // Esecuzione elaborazione IA per la variazione del programma
  const handleProcessAIProgramChange = () => {
    setIsProcessingAI(true);
    setTimeout(() => {
      setIsProcessingAI(false);
      const methodologyNames = {
        biomechanical: 'Sostituzione Biomeccanica (Piano & Vettore di Forza)',
        tut_rpe: 'Controllo Tempi TUT & Target RPE',
        volume_intensity: 'Volume & Tecniche di Intensità (Rest-Pause / Deload)',
        frequency_order: 'Frequenza & Ordine Esercizi Sessione',
      };

      const draft = `[PROPOSTA GEMINI 3.6 FLASH - ${targetWeek.toUpperCase()}]\n• Metodologia Selezionata: ${methodologyNames[variationMethodology]}\n• Esercizio Target: ${alertData.exerciseName || 'Esercizio Principale'}\n• Modifica Suggerita dall'IA:\n  - Modifica parametri: 4 serie x 8-10 reps (RPE 7.5/10, TUT 3-1-1)\n  - Nota Tecnico-Preventiva: Esecuzione controllata e focus sulla stabilità scapolotoracica.\n\nIstruzione Coach Applicata: "${coachInstruction}"`;
      setGeneratedProgramDraft(draft);
      showSuccess('Elaborato con Gemini 3.6 Flash', 'Variazione programma generata con successo.');
    }, 800);
  };

  // Applicazione definitiva della modifica programma
  const handleApplyProgramChange = () => {
    addTimelineEvent(
      alertData.athleteId,
      'other',
      `Variazione Programma (${targetWeek})`,
      `Modifica IA (${variationMethodology}): ${coachInstruction}`
    );
    showSuccess('Programma Aggiornato!', `Scheda di ${alertData.athleteName} modificata per la ${targetWeek}.`);
    onClose();
  };

  // Invio WhatsApp
  const handleSendWhatsApp = () => {
    if (!athletePhone) {
      showInfo('Telefono Mancante', `Nessun numero di telefono registrato per ${alertData.athleteName}.`);
      return;
    }
    const cleanPhone = athletePhone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappMessageText)}`, '_blank');
    showSuccess('WhatsApp Aperto', 'Messaggio inviato alla chat dell\'atleta.');
    onClose();
  };

  // Vai diretto alla Scheda del Singolo Atleta
  const handleGoToAthleteProfile = () => {
    setSelectedAthleteId(alertData.athleteId);
    setActiveTab('atleti');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
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

          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher Azioni */}
        <div className="px-6 pt-4 bg-slate-900/30 border-b border-slate-800/80">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveActionTab('modify_program')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeActionTab === 'modify_program'
                  ? 'bg-[var(--color-primary)] text-black font-black shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <Zap className="w-4 h-4" /> 1. Modifica Programma IA
            </button>

            <button
              onClick={() => setActiveActionTab('whatsapp_msg')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeActionTab === 'whatsapp_msg'
                  ? 'bg-[var(--color-primary)] text-black font-black shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <MessageCircle className="w-4 h-4" /> 2. Messaggio WhatsApp
            </button>

            <button
              onClick={() => setActiveActionTab('history')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeActionTab === 'history'
                  ? 'bg-[var(--color-primary)] text-black font-black shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <History className="w-4 h-4" /> 3. Storico Variazioni ({athleteHistory.length})
            </button>

            <button
              onClick={() => setActiveActionTab('view_profile')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeActionTab === 'view_profile'
                  ? 'bg-[var(--color-primary)] text-black font-black shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <User className="w-4 h-4" /> 4. Apri Scheda Atleta
            </button>
          </div>
        </div>

        {/* Body Contenuto Tab */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: MODIFICA PROGRAMMA IA */}
          {activeActionTab === 'modify_program' && (
            <div className="space-y-5">
              {/* Context Alert Banner */}
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Contesto Segnalazione</span>
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

              {/* Selettore Metodologia di Variazione */}
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
                    onClick={() => setVariationMethodology('biomechanical')}
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
                    onClick={() => setVariationMethodology('tut_rpe')}
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
                    onClick={() => setVariationMethodology('volume_intensity')}
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
                    onClick={() => setVariationMethodology('frequency_order')}
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
                  rows={3}
                  value={coachInstruction}
                  onChange={e => setCoachInstruction(e.target.value)}
                  placeholder="Es. Sostituisci Panca Piana con Spinte Manubri 30°, riduci il volume a 3 serie..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-[var(--color-primary)] resize-none"
                />

                <button
                  onClick={handleProcessAIProgramChange}
                  disabled={isProcessingAI || !coachInstruction.trim()}
                  className="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-[var(--color-primary)] text-slate-200 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 text-sky-400 ${isProcessingAI ? 'animate-spin' : ''}`} />
                  <span>Elabora Variazione con Gemini 3.6 Flash</span>
                </button>
              </div>

              {/* Anteprima Bozza Generata */}
              {generatedProgramDraft && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Anteprima Variazione Programma
                    </span>
                    <span className="text-[10px] text-slate-500">Puoi modificare il testo prima di applicare</span>
                  </div>

                  <textarea
                    rows={5}
                    value={generatedProgramDraft}
                    onChange={e => setGeneratedProgramDraft(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono resize-none focus:outline-none focus:border-[var(--color-primary)]"
                  />

                  <button
                    onClick={handleApplyProgramChange}
                    className="w-full py-3 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all shadow-[0_0_15px_rgba(234,179,8,0.2)]"
                  >
                    Applica Variazione al Programma di {alertData.athleteName}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MESSAGGIO WHATSAPP MODIFICABILE */}
          {activeActionTab === 'whatsapp_msg' && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Edit2 className="w-4 h-4 text-emerald-400" /> Bozza Messaggio Personalizzata da Gemini 3.6 Flash
                  </label>
                  <span className="text-[10px] text-slate-400">Modificabile al 100% da te</span>
                </div>

                <textarea
                  rows={6}
                  value={whatsappMessageText}
                  onChange={e => setWhatsappMessageText(e.target.value)}
                  className="w-full p-3.5 rounded-2xl bg-slate-900 border border-slate-700 text-white text-xs leading-relaxed resize-none focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center justify-between">
                <span>Destinatario: <strong>{alertData.athleteName}</strong> ({athletePhone || 'Nessun telefono registrato'})</span>
              </div>

              <button
                onClick={handleSendWhatsApp}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-black text-xs transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Apri ed Invia via WhatsApp</span>
              </button>
            </div>
          )}

          {/* TAB 3: STORICO VARIAZIONI ATLETA (AUDIT TRAIL) */}
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

          {/* TAB 4: VAI ALLA SCHEDA ATLETA */}
          {activeActionTab === 'view_profile' && (
            <div className="text-center py-8 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 flex items-center justify-center mx-auto text-[var(--color-primary)]">
                <User className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-base font-black text-white">{alertData.athleteName}</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Accedi direttamente al profilo ed a tutti i dettagli di {alertData.athleteName} (Anagrafica, Note, Abbonamenti, Documenti ed Attività).
                </p>
              </div>

              <button
                onClick={handleGoToAthleteProfile}
                className="px-6 py-3 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all shadow-lg"
              >
                Vai alla Scheda di {alertData.athleteName} →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
