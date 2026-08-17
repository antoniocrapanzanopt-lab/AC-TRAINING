import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Sliders,
  Save,
  Check,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  Loader2,
  TrendingUp,
  Activity,
} from 'lucide-react';
import {
  AIProgressionProposal,
  AIProgressionGenerationContext,
  ProgressionRuleTemplate,
  ProgressionRuleFormData,
} from '../../types/progression';
import { generateAIProgressionProposals } from '../../lib/ai/progressionAssistant';
import { useAthletes } from '../../context/AthletesContext';
import { useExercises } from '../../context/ExercisesContext';
import { useProgressions } from '../../context/ProgressionsContext';
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

  // Context State
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>(initialContext?.athlete_id || 'general');
  const [athleteLevel, setAthleteLevel] = useState<'principiante' | 'intermedio' | 'avanzato' | 'elite'>(
    initialContext?.athlete_level || 'intermedio'
  );
  const [exerciseName, setExerciseName] = useState<string>(initialContext?.exercise_name || 'Panca Piana con Bilanciere');
  const [exerciseFamily, setExerciseFamily] = useState<string>(initialContext?.exercise_family || 'Spinta Orizzontale');
  const [objective, setObjective] = useState<'ipertrofia' | 'forza' | 'densita' | 'ricomposizione' | 'riabilitazione'>(
    initialContext?.objective || 'ipertrofia'
  );
  const [blockPhase, setBlockPhase] = useState<'accumulo' | 'intensificazione' | 'peak' | 'riatletizzazione' | 'deload'>(
    initialContext?.block_phase || 'accumulo'
  );
  const [durationWeeks, setDurationWeeks] = useState<number>(initialContext?.block_duration_weeks || 6);
  const [equipment, setEquipment] = useState<'palestra_completa' | 'bilanciere_rack' | 'home_gym' | 'manubri' | 'corpo_libero'>(
    initialContext?.equipment || 'palestra_completa'
  );
  const [limitations, setLimitations] = useState<string>(initialContext?.limitations || 'nessuna');
  const [coachNotes, setCoachNotes] = useState<string>(initialContext?.coach_notes || '');

  // Baseline Target
  const [baseSets, setBaseSets] = useState<number>(initialContext?.baseline_target?.sets || 3);
  const [baseReps, setBaseReps] = useState<string>(initialContext?.baseline_target?.reps || '8-10');
  const [baseLoad, setBaseLoad] = useState<number>(initialContext?.baseline_target?.load_kg || 60);
  const [baseRir, setBaseRir] = useState<string>(initialContext?.baseline_target?.rir || 'RIR 2');
  const [baseRest, setBaseRest] = useState<number>(initialContext?.baseline_target?.rest_seconds || 90);

  // Proposal Generation State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [proposals, setProposals] = useState<AIProgressionProposal[]>([]);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [expandedTimelineId, setExpandedTimelineId] = useState<string | null>(null);
  const [savingTemplateId, setSavingTemplateId] = useState<string | null>(null);
  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);
  const [showAdvancedInputs, setShowAdvancedInputs] = useState<boolean>(false);

  // Auto-fill athlete info when selected
  useEffect(() => {
    if (selectedAthleteId && selectedAthleteId !== 'general') {
      const athlete = athletes.find((a) => a.id === selectedAthleteId);
      if (athlete) {
        if (athlete.medicalNotes) {
          setLimitations(athlete.medicalNotes);
        }
      }
    }
  }, [selectedAthleteId, athletes]);

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const selectedAthlete = athletes.find((a) => a.id === selectedAthleteId);
      const res = await generateAIProgressionProposals({
        athlete_id: selectedAthleteId !== 'general' ? selectedAthleteId : undefined,
        athlete_name: selectedAthlete ? (selectedAthlete.fullName || `${selectedAthlete.firstName} ${selectedAthlete.lastName}`) : undefined,
        athlete_level: athleteLevel,
        exercise_name: exerciseName,
        exercise_family: exerciseFamily,
        objective,
        block_phase: blockPhase,
        block_duration_weeks: durationWeeks,
        equipment,
        limitations,
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
      if (res.length > 0) {
        setSelectedProposalId(res[0].id);
        setExpandedTimelineId(res[0].id);
      }
    } catch {
      // Fallback handled
    } finally {
      setIsLoading(false);
    }
  };

  // Generate on initial open if empty
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
      setTimeout(() => setSavedSuccessId(null), 3000);
    } finally {
      setSavingTemplateId(null);
    }
  };

  const handleApplyExercise = async (proposal: AIProgressionProposal) => {
    if (onApplyToExercise) {
      await onApplyToExercise(proposal.rule_form_data);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl max-h-[92vh] shadow-2xl z-10 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Modale */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-500/20 to-amber-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-md shadow-purple-500/10">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">Assistente IA per Progressioni</h2>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/30">
                  Analisi Contestuale
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Genera 3 proposte su misura analizzando atleta, pattern di movimento, attrezzatura e limitazioni articolari.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl cursor-pointer transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          {/* SEZIONE 1: CONTESTO & PARAMETRI GUIDATI */}
          <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400" />
                Contesto di Generazione
              </span>
              <button
                type="button"
                onClick={() => setShowAdvancedInputs(!showAdvancedInputs)}
                className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <span>{showAdvancedInputs ? 'Meno opzioni' : 'Più opzioni contesto'}</span>
                {showAdvancedInputs ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Grid Parametri Essenziali */}
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
              
              {/* Esercizio */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Esercizio / Movimento *</label>
                <input
                  type="text"
                  value={exerciseName}
                  onChange={(e) => setExerciseName(e.target.value)}
                  list="ai-exercise-list"
                  placeholder="es. Panca Piana Bilanciere"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold focus:outline-none focus:border-purple-500"
                />
                <datalist id="ai-exercise-list">
                  {exercises.map((ex) => (
                    <option key={ex.id} value={ex.name} />
                  ))}
                </datalist>
              </div>

              {/* Obiettivo */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Obiettivo Principale</label>
                <select
                  value={objective}
                  onChange={(e) => setObjective(e.target.value as 'ipertrofia' | 'forza' | 'densita' | 'ricomposizione' | 'riabilitazione')}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold focus:outline-none focus:border-purple-500"
                >
                  <option value="ipertrofia">Ipertrofia (Volume & Tensione)</option>
                  <option value="forza">Forza Massimale (Carico Lineare / RIR)</option>
                  <option value="densita">Resistenza & Densità (Recuperi stretti)</option>
                  <option value="ricomposizione">Ricomposizione (Volume Stabile)</option>
                  <option value="riabilitazione">Riatletizzazione & Cautela</option>
                </select>
              </div>

              {/* Durata Blocco */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Durata Blocco</label>
                <select
                  value={durationWeeks}
                  onChange={(e) => setDurationWeeks(parseInt(e.target.value, 10) || 6)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold focus:outline-none"
                >
                  <option value={4}>4 Settimane (Blocco Breve)</option>
                  <option value={6}>6 Settimane (Standard Mesociclo)</option>
                  <option value={8}>8 Settimane (Blocco Esteso)</option>
                  <option value={10}>10 Settimane</option>
                  <option value={12}>12 Settimane (Macro-Periodo)</option>
                </select>
              </div>

              {/* Livello Atleta */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Livello Atleta</label>
                <select
                  value={athleteLevel}
                  onChange={(e) => setAthleteLevel(e.target.value as 'principiante' | 'intermedio' | 'avanzato' | 'elite')}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold focus:outline-none"
                >
                  <option value="principiante">Principiante (+1.25kg / Focus Reps)</option>
                  <option value="intermedio">Intermedio (Standard +2.0kg)</option>
                  <option value="avanzato">Avanzato (Micro-carichi / Periodizzazione)</option>
                  <option value="elite">Elite / Agonista (Autoregolazione RIR)</option>
                </select>
              </div>
            </div>

            {/* Campi Avanzati del Contesto */}
            {showAdvancedInputs && (
              <div className="pt-3 border-t border-slate-800/80 space-y-3 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  {/* Atleta Assegnato */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">Atleta di Riferimento</label>
                    <select
                      value={selectedAthleteId}
                      onChange={(e) => setSelectedAthleteId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none"
                    >
                      <option value="general">Template Generale (Nessun Atleta)</option>
                      {athletes.map((ath) => (
                        <option key={ath.id} value={ath.id}>
                          {ath.fullName || `${ath.firstName} ${ath.lastName}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Pattern / Famiglia Esercizio */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">Famiglia di Movimento</label>
                    <select
                      value={exerciseFamily}
                      onChange={(e) => setExerciseFamily(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none"
                    >
                      <option value="Spinta Orizzontale">Spinta Orizzontale (Panca, Pushup)</option>
                      <option value="Spinta Verticale">Spinta Verticale (Military, Lento)</option>
                      <option value="Trazione Orizzontale">Trazione Orizzontale (Rematore, Pulley)</option>
                      <option value="Trazione Verticale">Trazione Verticale (Trazioni, Lat)</option>
                      <option value="Accosciata / Squat">Accosciata (Squat, Pressa, Affondi)</option>
                      <option value="Catena Posteriore / Stacco">Catena Posteriore (Stacco, RDL, Hip Thrust)</option>
                      <option value="Isolamento / Braccia">Isolamento / Braccia / Spalle</option>
                      <option value="Core / Addome">Core & Stabilità</option>
                    </select>
                  </div>

                  {/* Fase del Blocco */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">Fase del Blocco</label>
                    <select
                      value={blockPhase}
                      onChange={(e) => setBlockPhase(e.target.value as 'accumulo' | 'intensificazione' | 'peak' | 'riatletizzazione' | 'deload')}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none"
                    >
                      <option value="accumulo">Accumulo di Volume</option>
                      <option value="intensificazione">Intensificazione</option>
                      <option value="peak">Picco di Carico / Overreach</option>
                      <option value="riatletizzazione">Riatletizzazione / Cautela</option>
                      <option value="deload">Scarico Programmato</option>
                    </select>
                  </div>

                  {/* Attrezzatura */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">Attrezzatura</label>
                    <select
                      value={equipment}
                      onChange={(e) => setEquipment(e.target.value as 'palestra_completa' | 'bilanciere_rack' | 'home_gym' | 'manubri' | 'corpo_libero')}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none"
                    >
                      <option value="palestra_completa">Palestra Completa</option>
                      <option value="bilanciere_rack">Bilanciere & Rack</option>
                      <option value="home_gym">Home Gym / Manubri</option>
                      <option value="manubri">Solo Manubri</option>
                      <option value="corpo_libero">Calisthenics / Corpo Libero</option>
                    </select>
                  </div>
                </div>

                {/* Limitazioni / Dolori */}
                <div>
                  <label className="text-[11px] font-bold text-rose-400 block mb-1">Limitazioni / Fastidi Articolari</label>
                  <input
                    type="text"
                    value={limitations}
                    onChange={(e) => setLimitations(e.target.value)}
                    placeholder="es. Spalla dx, ginocchio, nessuna..."
                    className="w-full px-3 py-2 bg-slate-900 border border-rose-500/30 rounded-xl text-rose-200 focus:outline-none"
                  />
                </div>

                {/* Baseline Target (Week 1) */}
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2">
                    Target di Partenza Week 1 (Serie, Reps, Carico, RIR, Rest)
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] text-slate-500 block">Serie</label>
                      <input
                        type="number"
                        value={baseSets}
                        onChange={(e) => setBaseSets(parseInt(e.target.value, 10) || 1)}
                        className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white font-bold text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block">Reps</label>
                      <input
                        type="text"
                        value={baseReps}
                        onChange={(e) => setBaseReps(e.target.value)}
                        className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white font-bold text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block">Carico (kg)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={baseLoad}
                        onChange={(e) => setBaseLoad(parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-purple-300 font-bold text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block">RIR</label>
                      <input
                        type="text"
                        value={baseRir}
                        onChange={(e) => setBaseRir(e.target.value)}
                        className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white font-bold text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block">Recupero (s)</label>
                      <input
                        type="number"
                        step="5"
                        value={baseRest}
                        onChange={(e) => setBaseRest(parseInt(e.target.value, 10) || 60)}
                        className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white font-bold text-center"
                      />
                    </div>
                  </div>
                </div>

                {/* Note Opzionali */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                    Istruzioni Specifiche per l'IA (Opzionale)
                  </label>
                  <textarea
                    rows={2}
                    value={coachNotes}
                    onChange={(e) => setCoachNotes(e.target.value)}
                    placeholder="es. Inserisci deload a settimana 4, mantieni recuperi alti e privilegia tensione continua..."
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Pulsante di Calcolo / Ricalcolo */}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isLoading}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg shadow-purple-600/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Elaborazione Proposte Contestuali...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-purple-200" />
                    <span>Elabora 3 Proposte di Progressione</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* SEZIONE 2: RISULTATI MULTI-PROPOSTA (3 VARIANTI COMPLEMENTARI) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-[var(--color-primary)]" />
                Proposte Generate dall'IA ({proposals.length} Strategie a Confronto)
              </h3>
              <span className="text-xs text-slate-400">
                Seleziona la variante più idonea al microciclo dell'atleta
              </span>
            </div>

            {isLoading && (
              <div className="p-12 rounded-2xl bg-slate-950/60 border border-slate-800 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
                <h4 className="text-sm font-bold text-white">L'IA sta calcolando le traiettorie di sovraccarico...</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Analisi del pattern biomeccanico di <strong>{exerciseName}</strong> su {durationWeeks} settimane.
                </p>
              </div>
            )}

            {!isLoading && proposals.length > 0 && (
              <div className="grid grid-cols-1 gap-5">
                {proposals.map((proposal, idx) => {
                  const isSelected = selectedProposalId === proposal.id;
                  const isTimelineOpen = expandedTimelineId === proposal.id;
                  const isSaving = savingTemplateId === proposal.id;
                  const isSaved = savedSuccessId === proposal.id;

                  return (
                    <div
                      key={proposal.id}
                      className={`p-5 rounded-2xl border transition-all ${
                        isSelected
                          ? 'bg-slate-950 border-purple-500/60 shadow-xl shadow-purple-500/5 ring-1 ring-purple-500/30'
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Proposal Header */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-300 text-xs font-black flex items-center justify-center border border-purple-500/30">
                              {idx + 1}
                            </span>
                            <h4 className="text-base font-black text-white">
                              {proposal.title}
                            </h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                              {proposal.method.replace('_', ' ')}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-purple-300 font-bold">
                            <span>Focus: {proposal.focus}</span>
                            <span>•</span>
                            <span className="text-slate-400">{proposal.block_duration_weeks} Settimane Programmate</span>
                          </div>
                        </div>

                        {/* Azioni Principali della Proposta */}
                        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                          {onApplyToExercise && (
                            <button
                              type="button"
                              onClick={() => handleApplyExercise(proposal)}
                              className="px-3.5 py-1.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-black font-black text-xs rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Applica alla Scheda</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleSaveTemplate(proposal)}
                            disabled={isSaving || isSaved}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            {isSaved ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400 font-bold">Salvato in Libreria</span>
                              </>
                            ) : (
                              <>
                                <Save className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                                <span>Salva come Template</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenBuilder(proposal)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Sliders className="w-3.5 h-3.5 text-purple-400" />
                            <span>Apri nel Builder</span>
                          </button>
                        </div>
                      </div>

                      {/* Rationale Spiegazione IA & Analisi Reps con Scoring Pesato */}
                      <div className="mt-3 p-4 rounded-xl bg-purple-950/25 border border-purple-500/25 text-xs text-purple-200 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <strong className="text-purple-300 font-black flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-purple-400" />
                            Logica Strategica Consigliata:
                          </strong>
                          {proposal.reps_analysis?.confidence_score && (
                            <span
                              className="self-start sm:self-auto px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30"
                              title="Stima interna dell'euristica pesata basata su separazione punteggi e completezza del contesto"
                            >
                              Affidabilità Contestuale: {Math.round(proposal.reps_analysis.confidence_score * 100)}%
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-purple-100/90 leading-relaxed">{proposal.rationale}</p>

                        {/* Strategia Primaria vs Alternativa Valida */}
                        {proposal.reps_analysis?.primary_strategy && proposal.reps_analysis?.secondary_viable_strategy && (
                          <div className="pt-2 border-t border-purple-500/20 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                            <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/30 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-black text-emerald-300">⭐ Strategia Primaria Consigliata</span>
                                <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 font-black rounded text-[10px]">
                                  Score: {proposal.reps_analysis.primary_strategy.score}/100
                                </span>
                              </div>
                              <div className="text-slate-200 font-bold text-xs">
                                {proposal.reps_analysis.primary_strategy.strategy_name} ({proposal.reps_analysis.primary_strategy.rep_range} reps)
                              </div>
                              <p className="text-slate-400 text-[10px] leading-tight">
                                {proposal.reps_analysis.primary_strategy.rationale}
                              </p>
                            </div>

                            <div className="p-2.5 rounded-lg bg-blue-950/20 border border-blue-500/30 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-black text-blue-300">🔄 Alternativa Valida Contestuale</span>
                                <span className="px-1.5 py-0.2 bg-blue-500/20 text-blue-300 font-black rounded text-[10px]">
                                  Score: {proposal.reps_analysis.secondary_viable_strategy.score}/100
                                </span>
                              </div>
                              <div className="text-slate-200 font-bold text-xs">
                                {proposal.reps_analysis.secondary_viable_strategy.strategy_name} ({proposal.reps_analysis.secondary_viable_strategy.rep_range} reps)
                              </div>
                              <p className="text-slate-400 text-[10px] leading-tight">
                                {proposal.reps_analysis.secondary_viable_strategy.rationale}
                              </p>
                            </div>
                          </div>
                        )}

                        {proposal.reps_analysis && (
                          <div className="pt-2 border-t border-purple-500/20 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-purple-500/20">
                              <span className="font-bold text-amber-300 block mb-0.5">🎯 Range Preferenziale & Biomeccanica</span>
                              <span className="text-slate-300">{proposal.reps_analysis.pattern_rationale}</span>
                            </div>
                            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-purple-500/20">
                              <span className="font-bold text-sky-300 block mb-0.5">👤 Adattamento Livello ({athleteLevel.toUpperCase()})</span>
                              <span className="text-slate-300">{proposal.reps_analysis.level_adaptation}</span>
                            </div>
                            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-purple-500/20">
                              <span className="font-bold text-emerald-300 block mb-0.5">📈 Curva Volume & Intensità</span>
                              <span className="text-slate-300">{proposal.reps_analysis.volume_intensity_curve}</span>
                            </div>
                            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-purple-500/20">
                              <span className="font-bold text-cyan-300 block mb-0.5">🔄 Strategia di Scarico (Deload)</span>
                              <span className="text-slate-300">{proposal.reps_analysis.deload_strategy}</span>
                            </div>
                          </div>
                        )}

                        {/* Breakdown Trasparente della Confidenza & Euristica Adattiva */}
                        {proposal.reps_analysis?.confidence_breakdown && (
                          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-purple-500/10 space-y-1.5 text-[10px] text-slate-400">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="flex items-center gap-1 text-slate-300 font-bold">
                                <span>⚙️ Modello Decisionale Evidence-Informed:</span>
                                <span className="text-purple-300 capitalize">
                                  {proposal.reps_analysis.confidence_breakdown.weighting_profile.replace('_', ' ')}
                                </span>
                              </span>
                              <div className="flex items-center gap-3">
                                <span>Delta Score: <strong className="text-slate-200">{proposal.reps_analysis.confidence_breakdown.margin_factor}%</strong></span>
                                <span>Dati Contesto: <strong className="text-slate-200">{proposal.reps_analysis.confidence_breakdown.context_completeness}%</strong></span>
                                <span>Tutela Sicurezza: <strong className="text-slate-200">{proposal.reps_analysis.confidence_breakdown.safety_alignment}%</strong></span>
                              </div>
                            </div>
                            <p className="text-[9.5px] text-slate-400/90 leading-tight">
                              💡 <em>Il range indicato è una preferenza operativa per quantificare i progressi: l'ipertrofia si stimola efficacemente lungo un ampio spettro (6-15+ reps) in base alla gestione della fatica e alla prossimità al cedimento (RIR 1-3).</em>
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Toggle Timeline Settimanale */}
                      <div className="mt-4 pt-3 border-t border-slate-800/80">
                        <div className="flex items-center justify-between mb-2">
                          <button
                            type="button"
                            onClick={() => setExpandedTimelineId(isTimelineOpen ? null : proposal.id)}
                            className="text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
                          >
                            <Calendar className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                            <span>{isTimelineOpen ? 'Nascondi Settimane' : 'Mostra Sequenza Settimanale del Blocco'}</span>
                            {isTimelineOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        {isTimelineOpen && (
                          <div className="mt-2 animate-in fade-in duration-150">
                            <WeeklyProgressionTimeline
                              ruleOrTemplate={proposal.template}
                              baseTarget={proposal.template.default_target}
                              currentStep={1}
                              totalWeeks={proposal.block_duration_weeks}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/95 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
          >
            Chiudi
          </button>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isLoading}
            className="px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-bold rounded-xl border border-purple-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Rigenera Nuove Varianti</span>
          </button>
        </div>
      </div>
    </div>
  );
};
