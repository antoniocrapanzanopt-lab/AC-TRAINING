import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Loader2, 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  User, 
  Dumbbell, 
  Target, 
  ShieldAlert, 
  FileText, 
  CheckCircle2,
  Edit3,
  Clock,
  Award,
  TrendingUp
} from 'lucide-react';
import { useExercises } from '../../context/ExercisesContext';
import { useAthletes } from '../../context/AthletesContext';
import { 
  generateWorkoutWithAI, 
  AIWorkoutExercise
} from '../../lib/ai/workoutGenerator';
import { useToast } from '../../context/ToastContext';

interface AICoPilotModalProps {
  onClose: () => void;
  onGenerate: (exercises: AIWorkoutExercise[]) => void;
}

const STEPS = [
  { id: 1, label: 'Cliente', shortLabel: 'Cliente', icon: User },
  { id: 2, label: 'Struttura allenamento', shortLabel: 'Struttura', icon: Dumbbell },
  { id: 3, label: 'Obiettivo', shortLabel: 'Obiettivo', icon: Target },
  { id: 4, label: 'Vincoli', shortLabel: 'Vincoli', icon: ShieldAlert },
  { id: 5, label: 'Note aggiuntive', shortLabel: 'Note', icon: FileText },
  { id: 6, label: 'Riepilogo', shortLabel: 'Riepilogo', icon: CheckCircle2 },
];

const SPLIT_OPTIONS = [
  'Auto / Scelta dall\'IA',
  'Push / Pull / Legs (PPL)',
  'Upper / Lower',
  'Full Body',
  'Monofrequenza (Petto/Tricep, Dorso/Bicep...)',
  'Personalizzata'
];

const GOAL_OPTIONS = [
  'Ipertrofia Generale',
  'Forza Massimale',
  'Dimagrimento & Definizione',
  'Ricomposizione Corporea',
  'Performance Atletica',
  'Ricondizionamento / Back to Gym'
];

const MUSCLE_FOCUS_OPTIONS = [
  'Petto',
  'Dorso',
  'Spalle',
  'Braccia',
  'Quadricipiti',
  'Femorali & Glutei',
  'Polpacci',
  'Core / Addome'
];

const EQUIPMENT_OPTIONS = [
  'Palestra Completa',
  'Manubri',
  'Bilanciere',
  'Rack / Squat',
  'Cavi / Carrucole',
  'Macchine Isotoniche',
  'Corpo Libero',
  'Kettlebell & Elastici'
];

const EXPERIENCE_LEVELS = [
  { id: 'Principiante', label: 'Principiante', desc: '0-1 anni di pesi. Focus su schemi motori ed adattamento (10-12 serie/sett)' },
  { id: 'Intermedio', label: 'Intermedio', desc: '1-3 anni di pesi. Volume medio-alto (14-18 serie/sett) e RIR progressivo' },
  { id: 'Avanzato', label: 'Avanzato / Agonista', desc: '3+ anni di pesi. Volume alto (18-22 serie/sett), intensificazione e cue avanzati' }
];

const PROGRESSION_STYLES = [
  'RIR/RPE Progressivo (Overload + Scarico)',
  'Aumento Carico Lineare',
  'Onda / Wave Periodization',
  'Rampup + Backoff Sets'
];

export const AICoPilotModal: React.FC<AICoPilotModalProps> = ({ onClose, onGenerate }) => {
  const { exercises: coachExercises } = useExercises();
  const { athletes } = useAthletes();
  const { showError, showSuccess } = useToast();

  // Wizard state
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: Cliente
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('');
  const [customAthleteContext, setCustomAthleteContext] = useState<string>('');
  const [experienceLevel, setExperienceLevel] = useState<string>('Intermedio');

  // Step 2: Struttura allenamento
  const [weeks, setWeeks] = useState<number>(4);
  const [daysPerWeek, setDaysPerWeek] = useState<number>(3);
  const [splitStyle, setSplitStyle] = useState<string>('Auto / Scelta dall\'IA');
  const [sessionDurationMinutes, setSessionDurationMinutes] = useState<number>(60);
  const [progressionStyle, setProgressionStyle] = useState<string>('RIR/RPE Progressivo (Overload + Scarico)');

  // Step 3: Obiettivo
  const [goal, setGoal] = useState<string>('Ipertrofia Generale');
  const [targetFocus, setTargetFocus] = useState<string[]>([]);

  // Step 4: Vincoli
  const [availableEquipment, setAvailableEquipment] = useState<string[]>(['Palestra Completa']);
  const [limitations, setLimitations] = useState<string>('');

  // Step 5: Note aggiuntive
  const [extraNotes, setExtraNotes] = useState<string>('');

  // Loading State
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [progressMsg, setProgressMsg] = useState<string>('');

  // Aggiorna il contesto dell'atleta quando viene selezionato
  const selectedAthlete = athletes.find(a => a.id === selectedAthleteId);

  useEffect(() => {
    if (selectedAthlete) {
      let text = `Cliente: ${selectedAthlete.firstName} ${selectedAthlete.lastName}\n`;
      if (selectedAthlete.dateOfBirth) {
        const age = new Date().getFullYear() - new Date(selectedAthlete.dateOfBirth).getFullYear();
        text += `Profilo: età ${age}\n`;
      }
      if (selectedAthlete.goals) text += `Obiettivi atleta: ${selectedAthlete.goals}\n`;
      if (selectedAthlete.medicalNotes) text += `Note sanitarie: ${selectedAthlete.medicalNotes}\n`;
      if (selectedAthlete.notes) text += `Note interne coach: ${selectedAthlete.notes}\n`;
      if (selectedAthlete.tags?.length) text += `Livello/Tag: ${selectedAthlete.tags.join(', ')}\n`;
      
      setCustomAthleteContext(text.trim());

      // Auto-rileva livello se presente tra i tag
      const lowerTags = (selectedAthlete.tags || []).map(t => t.toLowerCase());
      if (lowerTags.includes('avanzato') || lowerTags.includes('agonista')) setExperienceLevel('Avanzato');
      else if (lowerTags.includes('principiante') || lowerTags.includes('neofita')) setExperienceLevel('Principiante');
      else setExperienceLevel('Intermedio');
    } else {
      setCustomAthleteContext('');
    }
  }, [selectedAthleteId]);

  const toggleTargetFocus = (item: string) => {
    if (targetFocus.includes(item)) {
      setTargetFocus(targetFocus.filter(f => f !== item));
    } else {
      setTargetFocus([...targetFocus, item]);
    }
  };

  const toggleEquipment = (item: string) => {
    if (item === 'Palestra Completa') {
      setAvailableEquipment(['Palestra Completa']);
      return;
    }

    const withoutFull = availableEquipment.filter(e => e !== 'Palestra Completa');
    if (withoutFull.includes(item)) {
      const updated = withoutFull.filter(e => e !== item);
      setAvailableEquipment(updated.length === 0 ? ['Palestra Completa'] : updated);
    } else {
      setAvailableEquipment([...withoutFull, item]);
    }
  };

  const handleNextStep = () => {
    if (currentStep === 3 && !goal.trim()) {
      showError('Inserisci l\'obiettivo del programma.');
      return;
    }
    if (currentStep < 6) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    } else {
      onClose();
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const generated = await generateWorkoutWithAI(
        {
          athlete: selectedAthlete,
          goal,
          weeks,
          daysPerWeek,
          availableEquipment,
          limitations,
          coachExercises,
          provider: 'gemini',
          splitStyle,
          targetFocus,
          extraNotes,
          customAthleteContext,
          experienceLevel,
          sessionDurationMinutes,
          progressionStyle
        },
        setProgressMsg
      );

      showSuccess('Programma generato con successo!', 'La scheda è pronta nell\'editor.');
      onGenerate(generated);
      onClose();
    } catch (err: any) {
      console.error(err);
      showError('Errore Generazione IA', err.message || 'Impossibile generare la scheda.');
    } finally {
      setIsGenerating(false);
      setProgressMsg('');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh] transition-all">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 shrink-0 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/30">
              <Sparkles className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Crea programma con AI
              </h2>
              <p className="text-xs text-slate-400">Generazione intelligente del programma con periodizzazione scientifica & Gemini 3.6 Flash</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            disabled={isGenerating} 
            className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Header (6 Steps) */}
        <div className="px-6 pt-5 pb-3 border-b border-slate-800/80 bg-slate-950/40 shrink-0">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-800 -z-0" />
            
            {STEPS.map((step) => {
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;

              return (
                <div 
                  key={step.id} 
                  onClick={() => !isGenerating && currentStep > step.id && setCurrentStep(step.id)}
                  className={`flex flex-col items-center gap-1.5 relative z-10 cursor-pointer ${
                    isGenerating ? 'pointer-events-none' : ''
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold transition-all border ${
                      isActive
                        ? 'bg-[var(--color-primary)] text-black border-[var(--color-primary)] shadow-lg shadow-[var(--color-primary)]/20 scale-110'
                        : isCompleted
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                        : 'bg-slate-900 text-slate-500 border-slate-700'
                    }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : step.id}
                  </div>
                  <span
                    className={`text-[11px] font-semibold tracking-tight hidden sm:block ${
                      isActive
                        ? 'text-white font-bold'
                        : isCompleted
                        ? 'text-amber-400/90'
                        : 'text-slate-500'
                    }`}
                  >
                    {step.shortLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 relative min-h-[360px]">
          
          {/* Generating Loader Overlay */}
          {isGenerating && (
            <div className="absolute inset-0 z-20 bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
              <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">L'IA sta elaborando la scheda...</h3>
              <p className="text-sm text-amber-200/80 animate-pulse max-w-md">
                {progressMsg || 'Generazione in corso con Gemini 3.6 Flash...'}
              </p>
            </div>
          )}

          {/* STEP 1: CLIENTE & ESPERIENZA */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div>
                <h3 className="text-base font-bold text-white mb-1">Per chi stai creando questo programma?</h3>
                <p className="text-xs text-slate-400 mb-4">Seleziona il cliente o lascia vuoto per un template generico.</p>
                
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Cliente
                </label>
                <select
                  value={selectedAthleteId}
                  onChange={e => setSelectedAthleteId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                >
                  <option value="">Nessun cliente (Template generico)</option>
                  {athletes.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.firstName} {a.lastName} {a.goals ? `(${a.goals})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* LIVELlO ESPERIENZA */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-500" /> Livello di Esperienza dell'Atleta
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {EXPERIENCE_LEVELS.map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setExperienceLevel(lvl.id)}
                      className={`p-3 rounded-xl text-left transition-all border flex flex-col justify-between ${
                        experienceLevel === lvl.id
                          ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)] shadow-md'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      <span className="font-bold text-xs text-white mb-1">{lvl.label}</span>
                      <span className="text-[10px] text-slate-400 leading-tight">{lvl.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Raccontaci di più (facoltativo)
                  </label>
                  <span className="text-[11px] text-slate-400">Stile di vita, esperienza, contesto utile</span>
                </div>
                <div className="relative">
                  <textarea
                    value={customAthleteContext}
                    onChange={e => setCustomAthleteContext(e.target.value)}
                    placeholder="Es. Lavora a turni, ha 2 anni di esperienza coi pesi, sonno 7h/notte, preferisce sedute da max 60 minuti..."
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[var(--color-primary)] min-h-[110px] text-sm leading-relaxed"
                  />
                  <Edit3 className="w-4 h-4 text-slate-500 absolute top-3 right-3 pointer-events-none" />
                </div>
              </div>

              {selectedAthlete && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                    <User className="w-4 h-4" />
                    Profilo Atleta Caricato Automaticamente
                  </div>
                  <div className="text-xs text-slate-300 space-y-0.5">
                    <p><span className="font-semibold text-white">Nome:</span> {selectedAthlete.firstName} {selectedAthlete.lastName}</p>
                    {selectedAthlete.goals && <p><span className="font-semibold text-white">Obiettivi:</span> {selectedAthlete.goals}</p>}
                    {selectedAthlete.medicalNotes && <p><span className="font-semibold text-amber-300">Note Mediche:</span> {selectedAthlete.medicalNotes}</p>}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: STRUTTURA & TIMING */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h3 className="text-base font-bold text-white mb-1">Struttura, Durata & Progressione</h3>
                <p className="text-xs text-slate-400">Definisci la durata temporale, la frequenza ed il modello di progressione.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Durata in Settimane
                  </label>
                  <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-xl border border-slate-700">
                    <button
                      type="button"
                      onClick={() => setWeeks(Math.max(1, weeks - 1))}
                      className="w-10 h-10 rounded-lg bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors"
                    >
                      -
                    </button>
                    <span className="flex-1 text-center font-extrabold text-white text-lg">{weeks} {weeks === 1 ? 'Settimana' : 'Settimane'}</span>
                    <button
                      type="button"
                      onClick={() => setWeeks(Math.min(12, weeks + 1))}
                      className="w-10 h-10 rounded-lg bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Giorni di Allenamento a Settimana
                  </label>
                  <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-xl border border-slate-700">
                    <button
                      type="button"
                      onClick={() => setDaysPerWeek(Math.max(1, daysPerWeek - 1))}
                      className="w-10 h-10 rounded-lg bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors"
                    >
                      -
                    </button>
                    <span className="flex-1 text-center font-extrabold text-white text-lg">{daysPerWeek} {daysPerWeek === 1 ? 'Giorno' : 'Giorni'} / sett.</span>
                    <button
                      type="button"
                      onClick={() => setDaysPerWeek(Math.min(7, daysPerWeek + 1))}
                      className="w-10 h-10 rounded-lg bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* DURATA TARGET SESSIONE (MINUTI LIBERI) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-500" /> Tempo Massimo per Singola Seduta
                  </label>
                  <span className="text-xs font-bold text-amber-400">
                    {sessionDurationMinutes} Minuti impostati
                  </span>
                </div>

                <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-xl border border-slate-700 mb-3">
                  <button
                    type="button"
                    onClick={() => setSessionDurationMinutes(Math.max(15, sessionDurationMinutes - 5))}
                    className="px-3.5 py-2 rounded-lg bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors text-sm"
                  >
                    -5 min
                  </button>

                  <div className="flex-1 flex items-center justify-center gap-2">
                    <input
                      type="number"
                      min={15}
                      max={240}
                      step={5}
                      value={sessionDurationMinutes}
                      onChange={e => setSessionDurationMinutes(Math.max(15, Math.min(240, parseInt(e.target.value) || 60)))}
                      className="w-24 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-center font-extrabold text-white text-xl focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-sm font-bold text-slate-400">minuti</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSessionDurationMinutes(Math.min(240, sessionDurationMinutes + 5))}
                    className="px-3.5 py-2 rounded-lg bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors text-sm"
                  >
                    +5 min
                  </button>
                </div>

                {/* Preset Chips veloci */}
                <div className="flex flex-wrap gap-2">
                  {[30, 45, 60, 75, 90, 120].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setSessionDurationMinutes(mins)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        sessionDurationMinutes === mins
                          ? 'bg-amber-500 text-black border-amber-500 font-extrabold shadow-sm'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      {mins} min
                    </button>
                  ))}
                </div>
              </div>

              {/* STILE DI PROGRESSIONE */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-500" /> Modello di Progressione Settimanale
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PROGRESSION_STYLES.map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setProgressionStyle(style)}
                      className={`p-3 rounded-xl text-xs font-bold text-left transition-all border ${
                        progressionStyle === style
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/50 shadow-md'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              {/* SPLIT STYLE */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                  Organizzazione della Split
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {SPLIT_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setSplitStyle(opt)}
                      className={`p-3 rounded-xl text-xs font-bold text-left transition-all border ${
                        splitStyle === opt
                          ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)] shadow-md'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: OBIETTIVO */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h3 className="text-base font-bold text-white mb-1">Obiettivo Principale</h3>
                <p className="text-xs text-slate-400">Qual è il target primario che la scheda deve raggiungere?</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                  Scegli Obiettivo Predefinito o Personalizzato
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
                  {GOAL_OPTIONS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGoal(g)}
                      className={`p-3 rounded-xl text-xs font-bold text-left transition-all border ${
                        goal === g
                          ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)] shadow-md'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={goal}
                  onChange={e => setGoal(e.target.value)}
                  placeholder="Oppure scrivi un obiettivo specifico..."
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                  Focus Muscolare Specifico (Opzionale)
                </label>
                <div className="flex flex-wrap gap-2">
                  {MUSCLE_FOCUS_OPTIONS.map((m) => {
                    const isSelected = targetFocus.includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => toggleTargetFocus(m)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                          isSelected
                            ? 'bg-amber-500 text-black border-amber-500'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                        }`}
                      >
                        {isSelected ? `✓ ${m}` : `+ ${m}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: VINCOLI */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h3 className="text-base font-bold text-white mb-1">Vincoli & Attrezzatura</h3>
                <p className="text-xs text-slate-400">Specifica l'attrezzatura ed eventuali limitazioni sanitarie o infortuni.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                  Attrezzatura Disponibile
                </label>
                <div className="flex flex-wrap gap-2">
                  {EQUIPMENT_OPTIONS.map((eq) => {
                    const isSelected = availableEquipment.includes(eq);
                    return (
                      <button
                        key={eq}
                        type="button"
                        onClick={() => toggleEquipment(eq)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                          isSelected
                            ? 'bg-[var(--color-primary)] text-black border-[var(--color-primary)]'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                        }`}
                      >
                        {isSelected ? `✓ ${eq}` : eq}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Infortuni, Dolori o Esercizi da Evitare (Opzionale)
                </label>
                <textarea
                  value={limitations}
                  onChange={e => setLimitations(e.target.value)}
                  placeholder="Es. Evitare squat libero per fastidio alla parte bassa della schiena, no stacchi da terra, spalla destra con impingement."
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[var(--color-primary)] min-h-[120px] text-sm leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* STEP 5: NOTE AGGIUNTIVE */}
          {currentStep === 5 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h3 className="text-base font-bold text-white mb-1">Note Aggiuntive per l'IA</h3>
                <p className="text-xs text-slate-400">Inserisci istruzioni o indicazioni metodologiche specifiche per il programma.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Istruzioni & Note del Coach (Opzionale)
                </label>
                <textarea
                  value={extraNotes}
                  onChange={e => setExtraNotes(e.target.value)}
                  placeholder="Es. Mantieni i tempi di recupero sui fondamentali sopra i 90s, inserisci superset per le braccia il Giorno C, imposta RIR 2."
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[var(--color-primary)] min-h-[160px] text-sm leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* STEP 6: RIEPILOGO */}
          {currentStep === 6 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div>
                <h3 className="text-base font-bold text-white mb-1">Riepilogo Scheda IA</h3>
                <p className="text-xs text-slate-400">Verifica le specifiche avanzate prima di avviare la generazione automatica con Gemini 3.6 Flash.</p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 divide-y divide-slate-800/80">
                <div className="flex justify-between items-center pt-0">
                  <span className="text-xs text-slate-400 font-semibold">Cliente:</span>
                  <span className="text-xs font-bold text-white">
                    {selectedAthlete ? `${selectedAthlete.firstName} ${selectedAthlete.lastName}` : 'Template Generico'}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2.5">
                  <span className="text-xs text-slate-400 font-semibold">Livello Esperienza:</span>
                  <span className="text-xs font-bold text-amber-400">{experienceLevel}</span>
                </div>

                <div className="flex justify-between items-center pt-2.5">
                  <span className="text-xs text-slate-400 font-semibold">Durata & Frequenza:</span>
                  <span className="text-xs font-bold text-white">
                    {weeks} Settimane • {daysPerWeek} Giorni / sett.
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2.5">
                  <span className="text-xs text-slate-400 font-semibold">Tempo per Sessione:</span>
                  <span className="text-xs font-bold text-white">{sessionDurationMinutes} Minuti</span>
                </div>

                <div className="flex justify-between items-center pt-2.5">
                  <span className="text-xs text-slate-400 font-semibold">Modello Progressione:</span>
                  <span className="text-xs font-bold text-amber-300">{progressionStyle}</span>
                </div>

                <div className="flex justify-between items-center pt-2.5">
                  <span className="text-xs text-slate-400 font-semibold">Split Allenamento:</span>
                  <span className="text-xs font-bold text-amber-400">{splitStyle}</span>
                </div>

                <div className="flex justify-between items-center pt-2.5">
                  <span className="text-xs text-slate-400 font-semibold">Obiettivo Principale:</span>
                  <span className="text-xs font-bold text-white">{goal}</span>
                </div>

                {targetFocus.length > 0 && (
                  <div className="flex justify-between items-center pt-2.5">
                    <span className="text-xs text-slate-400 font-semibold">Focus Muscolare:</span>
                    <span className="text-xs font-bold text-amber-300">{targetFocus.join(', ')}</span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2.5">
                  <span className="text-xs text-slate-400 font-semibold">Attrezzatura:</span>
                  <span className="text-xs font-bold text-slate-300">{availableEquipment.join(', ')}</span>
                </div>

                {limitations && (
                  <div className="flex justify-between items-start pt-2.5">
                    <span className="text-xs text-slate-400 font-semibold shrink-0 mr-4">Infortuni / Limitazioni:</span>
                    <span className="text-xs font-medium text-rose-400 text-right">{limitations}</span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2.5">
                  <span className="text-xs text-slate-400 font-semibold">Motore IA:</span>
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    ✓ Google Gemini 3.6 Flash (Integrato nel progetto)
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Navigation */}
        <div className="p-5 border-t border-slate-800 bg-slate-950/60 shrink-0 flex items-center justify-between">
          <button 
            type="button" 
            onClick={handlePrevStep} 
            disabled={isGenerating}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white border border-slate-700 hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {currentStep > 1 ? (
              <>
                <ChevronLeft className="w-4 h-4" /> Indietro
              </>
            ) : (
              'Cancella'
            )}
          </button>

          {currentStep < 6 ? (
            <button 
              type="button" 
              onClick={handleNextStep}
              disabled={isGenerating}
              className="px-6 py-2.5 bg-[var(--color-primary)] text-black font-extrabold text-xs uppercase tracking-wide rounded-xl hover:bg-[var(--color-primary-hover)] transition-all shadow-md shadow-[var(--color-primary)]/20 disabled:opacity-50 flex items-center gap-1.5"
            >
              Avanti <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button 
              type="button" 
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs uppercase tracking-wide rounded-xl transition-all shadow-lg shadow-amber-500/25 disabled:opacity-50 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Genera Programma
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
