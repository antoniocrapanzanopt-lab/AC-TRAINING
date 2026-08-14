import React, { useState, useEffect, useRef } from 'react';
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
  TrendingUp,
  MessageSquare
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useExercises } from '../../context/ExercisesContext';
import { useAthletes } from '../../context/AthletesContext';
import { 
  generateWorkoutWithAI, 
  GeneratedWorkoutResponse
} from '../../lib/ai/workoutGenerator';
import { useToast } from '../../context/ToastContext';

interface AICoPilotModalProps {
  onClose: () => void;
  onGenerate: (result: GeneratedWorkoutResponse) => void;
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
  { id: 'Ipertrofia', label: 'Ipertrofia', desc: 'Focus su massa muscolare, volume e cedimento contestuale' },
  { id: 'Forza', label: 'Forza', desc: 'Focus sui carichi, recuperi lunghi e progressione neurale' },
  { id: 'Ricomposizione', label: 'Ricomposizione Corporea', desc: 'Equilibrio metabolico/ipertrofico' },
  { id: 'Ricondizionamento', label: 'Ricondizionamento', desc: 'Ripresa sicura per neofiti, inattivi o post-stop' },
  { id: 'Performance Generale', label: 'Performance Generale', desc: 'Misto forza, mobilità, fiato e atletismo' }
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
  'Home Gym',
  'Manubri e Bilanciere',
  'Corpo Libero',
  'Elastici',
  'Anelli',
  'Altro'
];

const LIMITATION_TAGS = [
  'Spalla (No Overhead)',
  'Lombare (No carico assiale)',
  'Ginocchio (No alti gradi flessione)',
  'Gomito / Polso',
  'Cervicale',
  'Anca'
];

const EXPERIENCE_LEVELS = [
  { id: 'Principiante', label: 'Principiante', desc: '0-1 anni di pesi. Focus su schemi motori ed adattamento (10-12 serie/sett)' },
  { id: 'Intermedio', label: 'Intermedio', desc: '1-3 anni di pesi. Volume medio-alto (14-18 serie/sett) e RIR progressivo' },
  { id: 'Avanzato', label: 'Avanzato', desc: '3+ anni di pesi. Volume alto (18-22 serie/sett), intensificazione e cue avanzati' }
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

  // Prevenzione Memory Leaks e state updates su componente smontato
  const isMounted = useRef(true);
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

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
  const [goal, setGoal] = useState<string>('Ipertrofia');
  const [targetFocus, setTargetFocus] = useState<string[]>([]);

  // Step 4: Vincoli
  const [availableEquipment, setAvailableEquipment] = useState<string[]>(['Palestra Completa']);
  const [limitationTags, setLimitationTags] = useState<string[]>([]);
  const [extraMedicalNotes, setExtraMedicalNotes] = useState<string>('');

  // Step 5: Note aggiuntive
  const [extraNotes, setExtraNotes] = useState<string>('');

  // Loading State
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [progressMsg, setProgressMsg] = useState<string>('');

  // Interactive AI States
  const [safetyBlock, setSafetyBlock] = useState<string>('');
  const [targetedQuestion, setTargetedQuestion] = useState<string>('');
  const [targetedAnswer, setTargetedAnswer] = useState<string>('');

  // IA Context esteso
  const [chatContext, setChatContext] = useState<string>('');
  const [loadedChatCount, setLoadedChatCount] = useState<number>(0);
  const [metricsContext, setMetricsContext] = useState<{ weight_kg?: number; body_fat_percentage?: number }>();
  const [latestCoachNote, setLatestCoachNote] = useState<string>('');
  const [coachNotesCount, setCoachNotesCount] = useState<number>(0);

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

      // Async fetch per metriche e chat
      const fetchExtraContext = async () => {
        try {
          // Fetch Misure
          const { data: metricsData } = await supabase
            .from('athlete_metrics')
            .select('weight_kg, body_fat_percentage')
            .eq('athlete_id', selectedAthleteId)
            .order('date', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (metricsData) {
            setMetricsContext({
              weight_kg: metricsData.weight_kg ? Number(metricsData.weight_kg) : undefined,
              body_fat_percentage: metricsData.body_fat_percentage ? Number(metricsData.body_fat_percentage) : undefined
            });
          } else {
            setMetricsContext(undefined);
          }

          // Fetch messaggi chat solo se l'atleta è registrato
          if (selectedAthlete.auth_user_id) {
            const { data: messagesData } = await supabase
              .from('messages')
              .select('content, sender_id')
              .or(`sender_id.eq.${selectedAthlete.auth_user_id},receiver_id.eq.${selectedAthlete.auth_user_id}`)
              .order('created_at', { ascending: false })
              .limit(20);

            if (messagesData && messagesData.length > 0) {
              setLoadedChatCount(messagesData.length);
              // Reverse per ordine cronologico
              const chatStr = messagesData.reverse().map(m => {
                const prefix = m.sender_id === selectedAthlete.auth_user_id ? 'Atleta:' : 'Coach:';
                return `${prefix} ${m.content}`;
              }).join('\n');
              setChatContext(chatStr);
            } else {
              setLoadedChatCount(0);
              setChatContext('');
            }
          } else {
            setLoadedChatCount(0);
            setChatContext('');
          }

          // Fetch note coach
          const { data: notesData, count } = await supabase
            .from('athlete_notes')
            .select('content', { count: 'exact' })
            .eq('athlete_id', selectedAthleteId)
            .order('created_at', { ascending: false })
            .limit(1);
          
          if (notesData && notesData.length > 0) {
            setLatestCoachNote(notesData[0].content);
            setCoachNotesCount(count || 1);
          } else {
            setLatestCoachNote('');
            setCoachNotesCount(0);
          }
        } catch (error) {
          console.error('Errore nel fetch extra context per AI:', error);
        }
      };
      
      fetchExtraContext();

    } else {
      setCustomAthleteContext('');
      setMetricsContext(undefined);
      setChatContext('');
      setLoadedChatCount(0);
    }
  }, [selectedAthleteId]);

  const toggleTargetFocus = (item: string) => {
    if (targetFocus.includes(item)) {
      setTargetFocus(targetFocus.filter(f => f !== item));
    } else {
      setTargetFocus([...targetFocus, item]);
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

  const handleGenerate = async (overrideChatContext?: string) => {
    setIsGenerating(true);
    setSafetyBlock('');
    setTargetedQuestion('');

    const currentChatContext = typeof overrideChatContext === 'string' ? overrideChatContext : chatContext;

    const aggregatedLimitations = limitationTags.length > 0 || extraMedicalNotes.trim() 
      ? `${limitationTags.join(', ')}. ${extraMedicalNotes}`.trim()
      : '';

    try {
      const generated = await generateWorkoutWithAI(
        {
          athlete: selectedAthlete,
          goal,
          weeks,
          daysPerWeek,
          availableEquipment,
          limitations: aggregatedLimitations,
          coachExercises,
          provider: 'gemini',
          splitStyle,
          targetFocus,
          extraNotes,
          customAthleteContext,
          experienceLevel,
          sessionDurationMinutes,
          progressionStyle,
          chatContext: currentChatContext,
          metricsContext
        },
        setProgressMsg
      );

      if (!isMounted.current) return;

      if (generated.blocco_sicurezza) {
        setSafetyBlock(generated.blocco_sicurezza);
        return;
      }

      if (generated.domanda_mirata) {
        setTargetedQuestion(generated.domanda_mirata);
        return;
      }

      showSuccess('Programma generato con successo!', 'La scheda è pronta nell\'editor.');
      onGenerate(generated);
      onClose();
    } catch (err: any) {
      if (!isMounted.current) return;
      console.error(err);
      showError('Errore Generazione IA', err.message || 'Impossibile generare la scheda.');
    } finally {
      if (isMounted.current) {
        setIsGenerating(false);
        setProgressMsg('');
      }
    }
  };

  const handleAnswerTargetedQuestion = () => {
    if (!targetedAnswer.trim()) return;
    const appendText = `\nDomanda dell'IA: ${targetedQuestion}\nRisposta Atleta/Coach: ${targetedAnswer}`;
    const newContext = chatContext + appendText;
    setChatContext(newContext);
    setTargetedQuestion('');
    setTargetedAnswer('');
    handleGenerate(newContext);
  };

  const getSplitStatus = (opt: string) => {
    if (opt === 'Auto / Scelta dall\'IA') return 'best';
    
    if (opt === 'Full Body') {
      if (daysPerWeek <= 3 || experienceLevel === 'Principiante' || sessionDurationMinutes < 45) return 'best';
      if (daysPerWeek >= 5) return 'disabled';
      return 'standard';
    }
    
    if (opt === 'Upper / Lower') {
      if (daysPerWeek === 4 && experienceLevel !== 'Principiante') return 'best';
      if (daysPerWeek > 5 || daysPerWeek < 3) return 'disabled';
      return 'standard';
    }

    if (opt === 'Push / Pull / Legs (PPL)') {
      if (daysPerWeek >= 5 && experienceLevel !== 'Principiante') return 'best';
      if (daysPerWeek < 3 || experienceLevel === 'Principiante') return 'disabled';
      return 'standard';
    }

    if (opt === 'Monofrequenza (Petto/Tricep, Dorso/Bicep...)') {
      if (experienceLevel === 'Principiante') return 'disabled';
      if (goal === 'Ipertrofia' && experienceLevel === 'Avanzato' && daysPerWeek >= 4) return 'best';
      if (daysPerWeek < 3) return 'disabled';
      return 'standard';
    }
    
    return 'standard';
  };

  const getProgressionStatus = (style: string) => {
    if (style === 'Aumento Carico Lineare') {
      if (experienceLevel === 'Principiante' || goal === 'Ricondizionamento') return 'best';
      return 'standard';
    }
    
    if (style === 'RIR/RPE Progressivo (Overload + Scarico)') {
      if (experienceLevel !== 'Principiante' && goal !== 'Ricondizionamento') return 'best';
      return 'standard';
    }

    if (style === 'Onda / Wave Periodization' || style === 'Rampup + Backoff Sets') {
      if (experienceLevel === 'Principiante' || goal === 'Ricondizionamento') return 'disabled';
      if (experienceLevel === 'Avanzato' && goal === 'Forza') return 'best';
      return 'standard';
    }

    return 'standard';
  };

  const renderCoherenceBanner = () => {
    let recSplit = 'Full Body';
    if (daysPerWeek === 4 && experienceLevel !== 'Principiante') recSplit = 'Upper / Lower';
    else if (daysPerWeek >= 5 && experienceLevel !== 'Principiante') recSplit = 'Push / Pull / Legs';
    else if (experienceLevel === 'Avanzato' && goal === 'Ipertrofia' && daysPerWeek >= 4) recSplit = 'Monofrequenza o Upper/Lower';
    
    let recProgression = 'Aumento Carico Lineare';
    if (experienceLevel !== 'Principiante' && goal !== 'Ricondizionamento') recProgression = 'RIR/RPE Progressivo';
    if (experienceLevel === 'Avanzato' && goal === 'Forza') recProgression = 'Onda/Wave o Rampup';

    return (
      <div className="bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 rounded-xl p-3 mb-5 flex gap-3 items-start">
        <Sparkles className="w-5 h-5 text-[var(--color-primary)] shrink-0 mt-0.5" />
        <div>
          <p className="text-xs text-[var(--color-primary)] font-bold mb-0.5">Coherence Engine Attivo</p>
          <p className="text-xs text-slate-300">
            In base al profilo (<strong>{experienceLevel}</strong>, <strong>{daysPerWeek} gg/sett</strong>), il sistema suggerirà preferibilmente <strong>{recSplit}</strong> con progressione <strong>{recProgression}</strong>. Le opzioni non ottimali risultano sconsigliate.
          </p>
        </div>
      </div>
    );
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

          {/* AI Safety Block */}
          {!isGenerating && safetyBlock && (
            <div className="absolute inset-0 z-20 bg-slate-900 flex flex-col items-center justify-center p-8 text-center animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4 border border-red-500/50">
                <ShieldAlert className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-black text-white mb-3">Generazione Bloccata (Sicurezza)</h3>
              <p className="text-sm text-slate-300 mb-6 max-w-lg leading-relaxed">
                {safetyBlock}
              </p>
              <button 
                onClick={() => setSafetyBlock('')}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors"
              >
                Modifica parametri e riprova
              </button>
            </div>
          )}

          {/* AI Targeted Question */}
          {!isGenerating && targetedQuestion && (
            <div className="absolute inset-0 z-20 bg-slate-900 flex flex-col p-8 text-center animate-in zoom-in-95 duration-300">
              <div className="flex flex-col items-center justify-center flex-1">
                <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mb-4 border border-amber-500/50">
                  <MessageSquare className="w-8 h-8 text-amber-500" />
                </div>
                <h3 className="text-xl font-black text-white mb-2">L'IA ha bisogno di chiarimenti</h3>
                <p className="text-sm text-slate-300 mb-6 max-w-lg leading-relaxed bg-slate-800 p-4 rounded-xl border border-slate-700">
                  "{targetedQuestion}"
                </p>
                <textarea
                  value={targetedAnswer}
                  onChange={(e) => setTargetedAnswer(e.target.value)}
                  placeholder="Scrivi qui la tua risposta..."
                  className="w-full max-w-lg h-32 px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500 transition-colors mb-4 resize-none"
                />
                <div className="flex gap-3">
                  <button 
                    onClick={() => setTargetedQuestion('')}
                    className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors"
                  >
                    Annulla
                  </button>
                  <button 
                    onClick={handleAnswerTargetedQuestion}
                    disabled={!targetedAnswer.trim()}
                    className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold transition-colors disabled:opacity-50"
                  >
                    Rispondi e Genera
                  </button>
                </div>
              </div>
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
                <div className="bg-slate-900 border border-slate-700/50 rounded-xl overflow-hidden mt-2 animate-in fade-in slide-in-from-top-2">
                  {/* Header Widget */}
                  <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white font-bold text-sm">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      Sintesi Dati per l'IA
                    </div>
                    <div className="bg-amber-500/10 text-amber-500 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Contesto Caricato
                    </div>
                  </div>

                  {/* 4 Sezioni */}
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* 1. Biometria & Profilo */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                        <User className="w-3.5 h-3.5" /> Biometria & Profilo
                      </h4>
                      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs text-slate-300 space-y-1">
                        <p><span className="text-slate-500">Età:</span> {selectedAthlete.dateOfBirth ? new Date().getFullYear() - new Date(selectedAthlete.dateOfBirth).getFullYear() : 'N/D'}</p>
                        <p><span className="text-slate-500">Peso:</span> {metricsContext?.weight_kg ? `${metricsContext.weight_kg} kg` : 'N/D'}</p>
                        <p><span className="text-slate-500">Massa Grassa (BF):</span> {metricsContext?.body_fat_percentage ? `${metricsContext.body_fat_percentage}%` : 'N/D'}</p>
                        {selectedAthlete.goals && <p className="pt-1 mt-1 border-t border-slate-800/50"><span className="text-amber-500/80 font-medium">Obiettivo:</span> {selectedAthlete.goals}</p>}
                      </div>
                    </div>

                    {/* 2. Salute & Medico */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                        <ShieldAlert className="w-3.5 h-3.5" /> Salute & Medico
                      </h4>
                      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs text-slate-300 space-y-1 h-full">
                        <div className="flex items-center gap-1.5 mb-1">
                          <div className={`w-2 h-2 rounded-full ${selectedAthlete.medicalCertificateExpiryDate && new Date(selectedAthlete.medicalCertificateExpiryDate) > new Date() ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span>Certificato {selectedAthlete.medicalCertificateType === 'agonistico' ? 'Agonistico' : 'Non Agonistico'}</span>
                        </div>
                        {selectedAthlete.medicalNotes ? (
                          <div className="bg-red-500/10 text-red-400 p-1.5 rounded text-[11px] border border-red-500/20 leading-tight">
                            ⚠️ {selectedAthlete.medicalNotes}
                          </div>
                        ) : (
                          <p className="text-slate-500 italic">Nessun infortunio o limitazione segnalata.</p>
                        )}
                      </div>
                    </div>

                    {/* 3. Note Coach */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                        <FileText className="w-3.5 h-3.5" /> Note Coach ({coachNotesCount})
                      </h4>
                      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs text-slate-300 h-full">
                        {latestCoachNote ? (
                          <p className="line-clamp-3 text-slate-400 leading-relaxed italic relative">
                            <span className="text-amber-500/50 text-lg leading-none absolute -top-1 -left-1">"</span>
                            &nbsp;&nbsp;&nbsp;{latestCoachNote}
                          </p>
                        ) : (
                          <p className="text-slate-500 italic">Nessuna nota presente.</p>
                        )}
                      </div>
                    </div>

                    {/* 4. Chat Ingestion */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                        <MessageSquare className="w-3.5 h-3.5" /> Analisi Chat
                      </h4>
                      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs text-slate-300 h-full flex flex-col justify-center items-center text-center">
                        {loadedChatCount > 0 ? (
                          <>
                            <div className="bg-green-500/10 text-green-400 px-3 py-1.5 rounded-full text-[11px] font-bold border border-green-500/20 mb-2 flex items-center gap-1.5">
                              <MessageSquare className="w-3.5 h-3.5" />
                              {loadedChatCount} Messaggi Letti
                            </div>
                            <p className="text-[10px] text-slate-500 leading-tight">L'IA utilizzerà le recenti conversazioni per adattare volume e selezione esercizi in base ai feedback (stanchezza, fastidi).</p>
                          </>
                        ) : (
                          <p className="text-slate-500 italic">Nessun messaggio recente.</p>
                        )}
                      </div>
                    </div>
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

              {renderCoherenceBanner()}

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
                  {PROGRESSION_STYLES.map((style) => {
                    const status = getProgressionStatus(style);
                    
                    let bgClass = 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white';
                    let labelNode = null;
                    
                    if (progressionStyle === style) {
                      bgClass = 'bg-amber-500/10 text-amber-400 border-amber-500/50 shadow-md';
                    } else if (status === 'best') {
                      bgClass = 'bg-[var(--color-primary)]/5 text-[var(--color-primary)] border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/10';
                      labelNode = <span className="block text-[9px] uppercase tracking-wider font-bold mt-1 text-[var(--color-primary)] opacity-80">Consigliato</span>;
                    } else if (status === 'disabled') {
                      bgClass = 'bg-slate-900/50 text-slate-600 border-slate-800/50 opacity-60 hover:border-rose-900/50 hover:text-rose-500/70';
                      labelNode = <span className="block text-[9px] uppercase tracking-wider font-bold mt-1 text-rose-500/70">Sconsigliato per {experienceLevel}</span>;
                    }

                    return (
                      <button
                        key={style}
                        type="button"
                        onClick={() => setProgressionStyle(style)}
                        className={`p-3 rounded-xl text-xs font-bold text-left transition-all border ${bgClass}`}
                      >
                        {style}
                        {labelNode}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SPLIT STYLE */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                  Organizzazione della Split
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {SPLIT_OPTIONS.map((opt) => {
                    const status = getSplitStatus(opt);
                    
                    let bgClass = 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white';
                    let labelNode = null;
                    let displayOpt = opt;
                    
                    if (opt === 'Auto / Scelta dall\'IA') {
                       displayOpt = `Auto / Scelta dall'IA`;
                       if (status === 'best' && splitStyle !== opt) {
                         labelNode = <span className="block text-[9px] uppercase tracking-wider font-bold mt-1 text-[var(--color-primary)] opacity-80">Lascia decidere al sistema</span>;
                       }
                    }

                    if (splitStyle === opt) {
                      bgClass = 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)] shadow-md';
                    } else if (status === 'best' && opt !== 'Auto / Scelta dall\'IA') {
                      bgClass = 'bg-[var(--color-primary)]/5 text-slate-300 border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/10';
                      labelNode = <span className="block text-[9px] uppercase tracking-wider font-bold mt-1 text-[var(--color-primary)] opacity-80">Ottimale per {daysPerWeek}gg</span>;
                    } else if (status === 'disabled') {
                      bgClass = 'bg-slate-900/50 text-slate-600 border-slate-800/50 opacity-60 hover:border-rose-900/50 hover:text-rose-500/70';
                      labelNode = <span className="block text-[9px] uppercase tracking-wider font-bold mt-1 text-rose-500/70">Sconsigliato (Coerenza)</span>;
                    }

                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setSplitStyle(opt)}
                        className={`p-3 rounded-xl text-xs font-bold text-left transition-all border ${bgClass}`}
                      >
                        {displayOpt}
                        {labelNode}
                      </button>
                    );
                  })}
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
                  Scegli Obiettivo Predefinito
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mb-3">
                  {GOAL_OPTIONS.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setGoal(g.id)}
                      className={`p-3 rounded-xl text-left transition-all border flex flex-col justify-between ${
                        goal === g.id
                          ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)] shadow-md'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      <span className="font-bold text-xs text-white mb-1">{g.label}</span>
                      <span className="text-[10px] text-slate-400 leading-tight">{g.desc}</span>
                    </button>
                  ))}
                </div>
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

              {/* EQUIPMENT */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                  <Dumbbell className="w-3.5 h-3.5 text-amber-500" /> Attrezzatura Disponibile
                </label>
                <div className="flex flex-wrap gap-2">
                  {EQUIPMENT_OPTIONS.map(eq => {
                    const isSelected = availableEquipment.includes(eq);
                    return (
                      <button
                        key={eq}
                        type="button"
                        onClick={() => {
                          if (eq === 'Palestra Completa') {
                            setAvailableEquipment(isSelected ? [] : ['Palestra Completa']);
                          } else {
                            if (isSelected) {
                              setAvailableEquipment(availableEquipment.filter(e => e !== eq));
                            } else {
                              setAvailableEquipment([...availableEquipment.filter(e => e !== 'Palestra Completa'), eq]);
                            }
                          }
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors border ${
                          isSelected
                            ? 'bg-amber-500 text-slate-900 border-amber-500 shadow-md shadow-amber-500/20'
                            : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500 hover:text-white'
                        }`}
                      >
                        {isSelected ? `✓ ${eq}` : eq}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* LIMITATIONS */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-400" /> Limitazioni Fisiche & Fastidi
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {LIMITATION_TAGS.map(tag => {
                    const isSelected = limitationTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setLimitationTags(
                            isSelected
                              ? limitationTags.filter(t => t !== tag)
                              : [...limitationTags, tag]
                          );
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors border ${
                          isSelected
                            ? 'bg-red-500/20 text-red-400 border-red-500/50 shadow-md'
                            : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500 hover:text-white'
                        }`}
                      >
                        {isSelected ? `✓ ${tag}` : `+ ${tag}`}
                      </button>
                    );
                  })}
                </div>
                <textarea
                  value={extraMedicalNotes}
                  onChange={(e) => setExtraMedicalNotes(e.target.value)}
                  placeholder="Altre note mediche specifiche (es. operazione recente, fastidio tendineo)..."
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-red-500 transition-colors placeholder:text-slate-600 min-h-[80px]"
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

                {(limitationTags.length > 0 || extraMedicalNotes) && (
                  <div className="flex justify-between items-start pt-3 border-t border-slate-800">
                    <span className="text-xs text-slate-500">Vincoli/Fastidi</span>
                    <span className="text-xs font-medium text-rose-400 text-right">
                      {limitationTags.join(', ')} 
                      {limitationTags.length > 0 && extraMedicalNotes ? ' - ' : ''}
                      {extraMedicalNotes}
                    </span>
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
              onClick={() => handleGenerate()}
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
