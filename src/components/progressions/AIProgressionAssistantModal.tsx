import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Sliders,
  Save,
  Check,
  Key,
  Copy,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Layers,
  Trash2,
} from 'lucide-react';
import {
  AIProgressionProposal,
  AIProgressionGenerationContext,
  ProgressionRuleTemplate,
  ProgressionRuleFormData,
} from '../../types/progression';
import { generateAIProgressionProposals } from '../../lib/ai/progressionAssistant';
import { generateWeeklyBlockProjection } from '../../lib/progression/progressionEngine';
import { useAthletes } from '../../context/AthletesContext';
import { useExercises } from '../../context/ExercisesContext';
import { useProgressions } from '../../context/ProgressionsContext';
import { useToast } from '../../context/ToastContext';
import { WeeklyProgressionTimeline } from './WeeklyProgressionTimeline';

interface AIProgressionAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialContext?: Partial<AIProgressionGenerationContext>;
  onOpenInBuilder?: (template: ProgressionRuleTemplate) => void;
  onSaveAsTemplate?: (template: ProgressionRuleTemplate) => Promise<void>;
  onApplyToExercise?: (formData: ProgressionRuleFormData) => Promise<void>;
}

export const AIProgressionAssistantModal: React.FC<AIProgressionAssistantModalProps> = ({
  isOpen,
  onClose,
  initialContext,
  onOpenInBuilder,
  onSaveAsTemplate,
  onApplyToExercise,
}) => {
  const { athletes } = useAthletes();
  const { exercises } = useExercises();
  const { saveCustomTemplate } = useProgressions();
  const { showSuccess } = useToast();

  // Gestione API Key Gemini 3.7 Flash
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem('builder_gemini_api_key') || '';
    } catch {
      return '';
    }
  });
  const [showKeyInput, setShowKeyInput] = useState<boolean>(false);
  const [tempApiKey, setTempApiKey] = useState<string>('');

  // Parametri Essenziali di Generazione
  const selectedAthleteId = initialContext?.athlete_id || 'general';
  const [athleteLevel, setAthleteLevel] = useState<'principiante' | 'intermedio' | 'avanzato' | 'elite'>(
    initialContext?.athlete_level || 'intermedio'
  );
  const [exerciseName, setExerciseName] = useState<string>(initialContext?.exercise_name || 'Panca Piana con Bilanciere');
  const exerciseFamily = initialContext?.exercise_family || 'Spinta Orizzontale';
  const [objective, setObjective] = useState<'ipertrofia' | 'forza' | 'densita' | 'ricomposizione' | 'riabilitazione'>(
    initialContext?.objective || 'ipertrofia'
  );
  const [durationWeeks, setDurationWeeks] = useState<number>(initialContext?.block_duration_weeks || 6);
  const [coachNotes, setCoachNotes] = useState<string>(initialContext?.coach_notes || '');

  // Baseline Target (Fallback trasparente)
  const baseSets = initialContext?.baseline_target?.sets || 4;
  const baseReps = initialContext?.baseline_target?.reps || '8-10';
  const baseLoad = initialContext?.baseline_target?.load_kg || 70;
  const baseRir = initialContext?.baseline_target?.rir || 'RIR 2';
  const baseRest = initialContext?.baseline_target?.rest_seconds || 90;

  // Stato Risultati & UI
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [proposals, setProposals] = useState<AIProgressionProposal[]>([]);
  const [expandedTimelineId, setExpandedTimelineId] = useState<string | null>(null);
  const [savingTemplateId, setSavingTemplateId] = useState<string | null>(null);
  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);
  const [copiedProposalId, setCopiedProposalId] = useState<string | null>(null);

  // Salva / Rimuovi API Key
  const handleSaveApiKey = () => {
    const trimmed = tempApiKey.trim();
    if (trimmed) {
      try {
        localStorage.setItem('builder_gemini_api_key', trimmed);
        setGeminiApiKey(trimmed);
        showSuccess('API Key Gemini Salvata', 'Configurato Google Gemini 3.7 Flash.');
        setShowKeyInput(false);
        setTempApiKey('');
      } catch (e) {
        console.warn('Errore salvataggio chiave:', e);
      }
    }
  };

  const handleRemoveApiKey = () => {
    try {
      localStorage.removeItem('builder_gemini_api_key');
      setGeminiApiKey('');
      setTempApiKey('');
      showSuccess('API Key Rimossa', 'Ripristinata la configurazione server-side.');
      setShowKeyInput(false);
    } catch (e) {
      console.warn('Errore rimozione chiave:', e);
    }
  };

  // Generatore Stringa Formattata
  const getFormattedProgressionString = (proposal: AIProgressionProposal): string => {
    const duration = proposal.block_duration_weeks || 6;
    const projections = generateWeeklyBlockProjection(
      proposal.template,
      proposal.template.default_target,
      duration
    );

    const lines = projections.map((p) => {
      const sets = p.sets;
      const reps = p.reps;
      const load = p.load_kg ? `${p.load_kg}kg` : p.load_display || 'carico target';
      const rir = p.rir ? `(${p.rir})` : '';
      const tag = p.is_deload ? ' [SCARICO ATTIVO]' : '';
      return `• Settimana ${p.week_number}: ${sets}x${reps} @ ${load} ${rir}${tag}`;
    });

    return [
      `📊 PROPOSTA PROGRESSIONE — ${exerciseName.toUpperCase()} (${duration} SETTIMANE)`,
      `Metodo: ${proposal.title}`,
      `Focus: ${proposal.focus}`,
      ``,
      `Traiettoria Settimanale:`,
      ...lines,
      ``,
      `Regola: ${proposal.rationale.slice(0, 140)}...`,
    ].join('\n');
  };

  const handleCopyString = (proposal: AIProgressionProposal) => {
    const text = getFormattedProgressionString(proposal);
    navigator.clipboard.writeText(text);
    setCopiedProposalId(proposal.id);
    showSuccess('Stringa Copiata!', 'Progressione formattata copiata negli appunti.');
    setTimeout(() => setCopiedProposalId(null), 2500);
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const selectedAthlete = athletes.find((a) => a.id === selectedAthleteId);
      const res = await generateAIProgressionProposals({
        athlete_id: selectedAthleteId !== 'general' ? selectedAthleteId : undefined,
        athlete_name: selectedAthlete
          ? selectedAthlete.fullName || `${selectedAthlete.firstName} ${selectedAthlete.lastName}`
          : undefined,
        athlete_level: athleteLevel,
        exercise_name: exerciseName,
        exercise_family: exerciseFamily,
        objective,
        block_phase: 'accumulo',
        block_duration_weeks: durationWeeks,
        equipment: 'palestra_completa',
        limitations: 'nessuna',
        baseline_target: {
          sets: baseSets,
          reps: baseReps,
          load_kg: baseLoad,
          rir: baseRir,
          rest_seconds: baseRest,
          tut: '3-0-1-0',
        },
        coach_notes: coachNotes,
      });

      setProposals(res);
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  // Generazione automatica all'apertura se vuoto
  useEffect(() => {
    if (isOpen && proposals.length === 0) {
      handleGenerate();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveTemplate = async (proposal: AIProgressionProposal) => {
    setSavingTemplateId(proposal.id);
    try {
      if (onSaveAsTemplate) {
        await onSaveAsTemplate(proposal.template);
      } else {
        await saveCustomTemplate(proposal.template);
      }
      setSavedSuccessId(proposal.id);
      showSuccess('Template Salvato', 'Disponibile nella tua libreria progressioni.');
      setTimeout(() => setSavedSuccessId(null), 3000);
    } finally {
      setSavingTemplateId(null);
    }
  };

  const handleApplyExercise = async (proposal: AIProgressionProposal) => {
    if (onApplyToExercise) {
      await onApplyToExercise(proposal.rule_form_data);
      showSuccess('Progressione Applicata', `Progressione impostata per ${exerciseName}.`);
      onClose();
    }
  };

  const handleOpenBuilder = (proposal: AIProgressionProposal) => {
    if (onOpenInBuilder) {
      onOpenInBuilder(proposal.template);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="fixed inset-0 bg-black/85 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-[#0b0f19] border border-slate-700/80 rounded-3xl w-full max-w-5xl max-h-[94vh] shadow-2xl z-10 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* ─── HEADER PULITO & BARRA GEMINI 3.7 FLASH ─── */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-slate-950/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500/20 to-purple-500/20 border border-amber-500/30 flex items-center justify-center text-[var(--color-primary)] shrink-0 shadow-lg">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-lg font-black text-white tracking-tight">
                  Generatore Stringhe di Progressione
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500/20 to-purple-500/20 text-amber-300 border border-amber-500/40">
                  ⚡ Gemini 3.7 Flash
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Crea, visualizza e copia al volo stringhe di sovraccarico progressivo pronte per l'uso.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Bottone Gestione API Key */}
            <button
              type="button"
              onClick={() => {
                setShowKeyInput(!showKeyInput);
                setTempApiKey(geminiApiKey);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                geminiApiKey
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/40'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:border-slate-600'
              }`}
              title="Configura la chiave API di Google Gemini"
            >
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>{geminiApiKey ? 'API Key Attiva (Studio)' : 'API Key Gemini 3.7'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ─── BOX GESTIONE API KEY GEMINI (COLLASSABILE) ─── */}
        {showKeyInput && (
          <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-purple-950/30 to-slate-950 border-b border-purple-500/30 animate-in fade-in duration-150 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" />
                Configurazione Chiave Google Gemini (Google AI Studio)
              </span>
              <span className="text-[11px] text-slate-400">Modello attivo: <strong>gemini-3.7-flash</strong></span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="password"
                value={tempApiKey}
                onChange={(e) => setTempApiKey(e.target.value)}
                placeholder="Incolla qui la tua API Key (es. AIzaSy...)"
                className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 font-mono focus:outline-none focus:border-amber-400"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveApiKey}
                  className="px-4 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-black font-black text-xs rounded-xl transition-all shadow cursor-pointer"
                >
                  Salva Chiave
                </button>
                {geminiApiKey && (
                  <button
                    type="button"
                    onClick={handleRemoveApiKey}
                    className="p-2.5 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-500/30 text-rose-300 rounded-xl transition-all cursor-pointer"
                    title="Rimuovi chiave salvata"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              💡 La chiave viene memorizzata localmente nel tuo browser per alimentare le generazioni con <strong>Gemini 3.7 Flash</strong>. Se non inserita, viene utilizzato il gateway cloud predefinito del backend.
            </p>
          </div>
        )}

        {/* ─── CORPO PRINCIPALE ─── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
          
          {/* BARRA CONTROLLI SEMPLICE (ZERO CONFUSIONE) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-lg">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              
              {/* Esercizio */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">Esercizio *</label>
                <input
                  type="text"
                  value={exerciseName}
                  onChange={(e) => setExerciseName(e.target.value)}
                  list="ai-exercise-list"
                  placeholder="es. Panca Piana con Bilanciere"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold focus:outline-none focus:border-[var(--color-primary)]"
                />
                <datalist id="ai-exercise-list">
                  {exercises.map((ex) => (
                    <option key={ex.id} value={ex.name} />
                  ))}
                </datalist>
              </div>

              {/* Obiettivo */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">Metodo / Obiettivo</label>
                <select
                  value={objective}
                  onChange={(e) => setObjective(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
                >
                  <option value="ipertrofia">Ipertrofia (Volume & Tensione)</option>
                  <option value="forza">Forza Massimale (Carico Lineare / RIR)</option>
                  <option value="densita">Densità & Recuperi Progressivi</option>
                  <option value="ricomposizione">Ricomposizione (Volume Stabile)</option>
                  <option value="riabilitazione">Riatletizzazione & TUT Controllato</option>
                </select>
              </div>

              {/* Durata Blocco */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">Durata Blocco</label>
                <select
                  value={durationWeeks}
                  onChange={(e) => setDurationWeeks(parseInt(e.target.value, 10) || 6)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
                >
                  <option value={4}>4 Settimane (Blocco Breve)</option>
                  <option value={6}>6 Settimane (Standard Mesociclo)</option>
                  <option value={8}>8 Settimane (Blocco Esteso)</option>
                  <option value={10}>10 Settimane</option>
                  <option value={12}>12 Settimane (Macro-Periodo)</option>
                </select>
              </div>

              {/* Livello Atleta */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">Livello Atleta</label>
                <select
                  value={athleteLevel}
                  onChange={(e) => setAthleteLevel(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
                >
                  <option value="principiante">Principiante (+1.25kg / Focus Reps)</option>
                  <option value="intermedio">Intermedio (Standard +2.5kg)</option>
                  <option value="avanzato">Avanzato (Micro-carichi / Periodizzazione)</option>
                  <option value="elite">Elite / Agonista (Autoregolazione RIR)</option>
                </select>
              </div>
            </div>

            {/* BARRA PROMPT GEMINI 3.7 FLASH A TUTTA LARGHEZZA */}
            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Istruzioni & Direttive Personalizzate per Gemini (Opzionale)
                </span>
                <span className="text-[10px] text-slate-400 font-normal">
                  es. Focus petto alto, scarico attivo a week 4, progressione a onde...
                </span>
              </label>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  value={coachNotes}
                  onChange={(e) => setCoachNotes(e.target.value)}
                  placeholder="Inserisci eventuali indicazioni specifiche per la traiettoria o il metodo desiderato..."
                  className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[var(--color-primary)]"
                />
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className="px-6 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-black font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generazione...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 fill-black" />
                      <span>Genera con Gemini 3.7 Flash</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* ─── RISULTATI: STRINGHE DI PROGRESSIONE CHIARE & AZIONABILI ─── */}
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-[var(--color-primary)]" />
                Stringhe di Progressione Generate ({proposals.length} Strategie a Confronto)
              </h4>
              <span className="text-xs text-slate-400">
                Visualizza, copia la stringa con 1 clic o applica direttamente alla scheda
              </span>
            </div>

            {isLoading && (
              <div className="p-12 rounded-3xl bg-slate-950/60 border border-slate-800 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin mx-auto" />
                <h4 className="text-sm font-bold text-white">Gemini 3.7 Flash sta elaborando le traiettorie di sovraccarico...</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Analisi del pattern motorio di <strong>{exerciseName}</strong> su {durationWeeks} settimane.
                </p>
              </div>
            )}

            {!isLoading && proposals.length > 0 && (
              <div className="space-y-4">
                {proposals.map((proposal, idx) => {
                  const isTimelineOpen = expandedTimelineId === proposal.id;
                  const isSaving = savingTemplateId === proposal.id;
                  const isSaved = savedSuccessId === proposal.id;
                  const isCopied = copiedProposalId === proposal.id;

                  // Calcolo proiezioni settimanali per la vista a ribbon
                  const duration = proposal.block_duration_weeks || durationWeeks;
                  const projections = generateWeeklyBlockProjection(
                    proposal.template,
                    proposal.template.default_target,
                    duration
                  );

                  return (
                    <div
                      key={proposal.id}
                      className="p-5 sm:p-6 rounded-3xl bg-slate-950 border-2 border-slate-800 hover:border-amber-500/40 transition-all shadow-xl space-y-4 group"
                    >
                      {/* Riga Superiore: Titolo, Badge & Azioni */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 text-xs font-black flex items-center justify-center border border-amber-500/30">
                              {idx + 1}
                            </span>
                            <h4 className="text-base sm:text-lg font-black text-white">
                              {proposal.title}
                            </h4>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-900 text-amber-300 border border-slate-700">
                              {proposal.method.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-2">
                            <span>Focus: <strong className="text-slate-200">{proposal.focus}</strong></span>
                            <span>•</span>
                            <span>{duration} Settimane Programmate</span>
                          </div>
                        </div>

                        {/* Azioni Rapide della Stringa */}
                        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                          {/* Copia Stringa Formattata */}
                          <button
                            type="button"
                            onClick={() => handleCopyString(proposal)}
                            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 hover:text-amber-300 border border-amber-500/30 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                            title="Copia la stringa settimanale formattata negli appunti"
                          >
                            {isCopied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                            <span>{isCopied ? 'Stringa Copiata!' : 'Copia Stringa'}</span>
                          </button>

                          {/* Salva come Template */}
                          <button
                            type="button"
                            onClick={() => handleSaveTemplate(proposal)}
                            disabled={isSaving || isSaved}
                            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            {isSaved ? <Check className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
                            <span>{isSaved ? 'Salvato' : 'Salva Template'}</span>
                          </button>

                          {/* Apri nel Builder */}
                          <button
                            type="button"
                            onClick={() => handleOpenBuilder(proposal)}
                            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Sliders className="w-4 h-4 text-purple-400" />
                            <span>Builder</span>
                          </button>

                          {/* Applica all'Esercizio (Se presente handler) */}
                          {onApplyToExercise && (
                            <button
                              type="button"
                              onClick={() => handleApplyExercise(proposal)}
                              className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-black font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <Check className="w-4 h-4 stroke-[3]" />
                              <span>Applica alla Scheda</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* ─── NASTRO VISUALE STRINGA SETTIMANA PER SETTIMANA ─── */}
                      <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                          <span>Traiettoria Settimanale Proiettata ({duration} Settimane)</span>
                          <button
                            type="button"
                            onClick={() => setExpandedTimelineId(isTimelineOpen ? null : proposal.id)}
                            className="text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>{isTimelineOpen ? 'Nascondi Timeline Dettagliata' : 'Espandi Timeline Grafica'}</span>
                            {isTimelineOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </div>

                        {/* Ribbon di pillole orizzontali */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                          {projections.map((p, pIdx) => (
                            <div
                              key={p.week_number}
                              className={`px-3 py-2 rounded-xl border shrink-0 text-center transition-all ${
                                p.is_deload
                                  ? 'bg-cyan-950/30 border-cyan-500/40 text-cyan-300'
                                  : pIdx === 0
                                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                                  : 'bg-slate-950 border-slate-800 text-slate-200'
                              }`}
                            >
                              <span className="text-[9px] font-black uppercase block text-slate-400">
                                W{p.week_number} {p.is_deload ? '🏖️ Scarico' : ''}
                              </span>
                              <span className="text-xs font-mono font-black text-white block mt-0.5">
                                {p.sets}x{p.reps}
                              </span>
                              <span className="text-[11px] font-bold text-amber-400 font-mono block">
                                {p.load_kg ? `${p.load_kg}kg` : p.load_display || 'Target'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* ─── LOGICA CHIAVE & REGOLA SINTETICA ─── */}
                      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 text-xs text-slate-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="space-y-1 max-w-2xl">
                          <strong className="text-white font-bold flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            Regola di Avanzamento:
                          </strong>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            {proposal.rationale}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCopyString(proposal)}
                          className="text-xs font-bold text-amber-400 hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copia testo formattato</span>
                        </button>
                      </div>

                      {/* Timeline Grafica Completa (Espandibile su Richiesta) */}
                      {isTimelineOpen && (
                        <div className="pt-2 animate-in fade-in duration-200">
                          <WeeklyProgressionTimeline
                            ruleOrTemplate={proposal.template}
                            baseTarget={proposal.template.default_target}
                            totalWeeks={duration}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
