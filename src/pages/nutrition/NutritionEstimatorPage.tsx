import React, { useState, useEffect, useMemo } from 'react';
import {
  Flame,
  Activity,
  Target,
  User,
  Copy,
  CheckCircle2,
  Sliders,
  History,
  Sparkles,
  Save,
  Plus,
} from 'lucide-react';
import { useAthletes } from '../../context/AthletesContext';
import { useNutrition } from '../../context/NutritionContext';
import { useToast } from '../../context/ToastContext';
import {
  Gender,
  ActivityLevel,
  NutritionGoal,
  FormulaType,
  NutritionInput,
  calculateNutritionEstimates,
  ACTIVITY_MULTIPLIERS,
  GOAL_OFFSETS,
  NUTRITION_DISCLAIMER,
} from '../../utils/nutritionCalculator';
import { MacroEditor } from '../../components/nutrition/MacroEditor';
import { NutritionMonitoringView } from '../../components/nutrition/NutritionMonitoringView';
import { NutritionRevisionsView } from '../../components/nutrition/NutritionRevisionsView';
import { MacroValues, NutritionPlanStatus } from '../../types/nutrition';

export const NutritionEstimatorPage: React.FC = () => {
  const { athletes } = useAthletes();
  const {
    savePlan,
    createPlanFromEstimator,
    getAthleteActivePlan,
    getAllAlerts,
  } = useNutrition();
  const { showSuccess, showInfo, showError } = useToast();

  // Selezione Atleta
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>(
    athletes.length > 0 ? athletes[0].id : 'manual'
  );

  const selectedAthlete = useMemo(() => {
    return athletes.find(a => a.id === selectedAthleteId);
  }, [athletes, selectedAthleteId]);

  // Tab Principale Pagina
  const [activeTab, setActiveTab] = useState<'stima' | 'piano' | 'monitoraggio' | 'revisioni'>('stima');

  // Input Form Calcolatore
  const [gender, setGender] = useState<Gender>('male');
  const [weightKg, setWeightKg] = useState<number>(75);
  const [heightCm, setHeightCm] = useState<number>(175);
  const [age, setAge] = useState<number>(28);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [bodyFatPercent, setBodyFatPercent] = useState<string>('');
  const [formula, setFormula] = useState<FormulaType>('mifflin_st_jeor');
  const [goal, setGoal] = useState<NutritionGoal>('maintenance');
  const [copied, setCopied] = useState<boolean>(false);

  // Precompila quando viene selezionato un atleta
  useEffect(() => {
    if (selectedAthlete) {
      if (selectedAthlete.gender) {
        const g = selectedAthlete.gender.toLowerCase();
        setGender(g === 'f' || g === 'female' || g === 'donna' ? 'female' : 'male');
      }
      if (selectedAthlete.dateOfBirth) {
        const birth = new Date(selectedAthlete.dateOfBirth);
        const diff = Date.now() - birth.getTime();
        const calcAge = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
        if (calcAge > 10 && calcAge < 100) setAge(calcAge);
      }
    }
  }, [selectedAthlete]);

  // Se l'utente inserisce % massa grassa valida, permette la scelta Katch-McArdle
  const parsedBodyFat = bodyFatPercent.trim() ? Number(bodyFatPercent) : undefined;
  const hasValidBodyFat = typeof parsedBodyFat === 'number' && parsedBodyFat > 3 && parsedBodyFat < 60;

  // Calcolo Risultati Reattivo della Stima
  const results = useMemo(() => {
    const input: NutritionInput = {
      gender,
      weightKg,
      heightCm,
      age,
      activityLevel,
      bodyFatPercent: hasValidBodyFat ? parsedBodyFat : undefined,
      goal,
      formula: hasValidBodyFat ? formula : 'mifflin_st_jeor',
    };
    return calculateNutritionEstimates(input);
  }, [
    gender,
    weightKg,
    heightCm,
    age,
    activityLevel,
    parsedBodyFat,
    hasValidBodyFat,
    goal,
    formula,
  ]);

  // Piano Attivo dell'atleta
  const activePlan = useMemo(() => {
    if (selectedAthleteId === 'manual') return undefined;
    return getAthleteActivePlan(selectedAthleteId);
  }, [selectedAthleteId, getAthleteActivePlan]);

  // Stato Editor Piano
  const [planGoal, setPlanGoal] = useState<NutritionGoal>('maintenance');
  const [planStatus, setPlanStatus] = useState<NutritionPlanStatus>('active');
  const [planStartDate, setPlanStartDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [planReviewDate, setPlanReviewDate] = useState<string>('');
  const [planCoachNotes, setPlanCoachNotes] = useState<string>('');
  const [planMode, setPlanMode] = useState<'auto' | 'manual'>('auto');
  const [planMacros, setPlanMacros] = useState<MacroValues>({
    targetKcal: 2200,
    proteinGrams: 150,
    carbGrams: 260,
    fatGrams: 60,
  });

  // Modal Motivazione Revisione
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState<boolean>(false);
  const [revisionReason, setRevisionReason] = useState<string>('');

  // Sincronizza stato editor con piano attivo quando cambia atleta o piano
  useEffect(() => {
    if (activePlan) {
      setPlanGoal(activePlan.goal);
      setPlanStatus(activePlan.status);
      setPlanStartDate(activePlan.startDate || new Date().toISOString().slice(0, 10));
      setPlanReviewDate(activePlan.reviewDate || '');
      setPlanCoachNotes(activePlan.coachNotes || '');
      setPlanMode(activePlan.mode || 'auto');
      setPlanMacros({
        targetKcal: activePlan.targetKcal,
        proteinGrams: activePlan.proteinGrams,
        carbGrams: activePlan.carbGrams,
        fatGrams: activePlan.fatGrams,
      });
    } else {
      // Inizializza con i risultati della stima corrente
      setPlanGoal(goal);
      setPlanStatus('active');
      setPlanStartDate(new Date().toISOString().slice(0, 10));
      setPlanReviewDate('');
      setPlanCoachNotes('');
      setPlanMode('auto');
      setPlanMacros({
        targetKcal: results.targetKcal,
        proteinGrams: results.macros.proteinGrams,
        carbGrams: results.macros.carbGrams,
        fatGrams: results.macros.fatGrams,
      });
    }
  }, [activePlan, selectedAthleteId]);

  // CTA 1: "Crea piano nutrizionale"
  const handleCreatePlanFromEstimator = (status: NutritionPlanStatus = 'active') => {
    if (selectedAthleteId === 'manual' || !selectedAthlete) {
      showError('Seleziona Atleta', 'Scegli un atleta dal menu in alto per associare il piano.');
      return;
    }

    createPlanFromEstimator(
      selectedAthlete.id,
      selectedAthlete.fullName,
      goal,
      results.targetKcal,
      {
        proteinGrams: results.macros.proteinGrams,
        carbGrams: results.macros.carbGrams,
        fatGrams: results.macros.fatGrams,
      },
      {
        weightKg,
        heightCm,
        age,
        gender,
        activityLevel,
        bodyFatPercent: hasValidBodyFat ? parsedBodyFat : undefined,
        formula: hasValidBodyFat ? formula : 'mifflin_st_jeor',
        bmr: results.bmr,
        tdee: results.tdee,
      },
      new Date().toISOString().slice(0, 10),
      undefined,
      `Piano generato da stima iniziale (${GOAL_OFFSETS[goal].label})`
    );

    showSuccess('Piano Nutrizionale Creato', `Piano ${status === 'draft' ? 'in bozza' : 'attivo'} salvato con successo per ${selectedAthlete.fullName}.`);
    setActiveTab('piano');
  };

  // CTA 2: "Usa come base" nell'editor
  const handleUseEstimatorAsBase = () => {
    setPlanGoal(goal);
    setPlanMacros({
      targetKcal: results.targetKcal,
      proteinGrams: results.macros.proteinGrams,
      carbGrams: results.macros.carbGrams,
      fatGrams: results.macros.fatGrams,
    });
    setPlanMode('auto');
    showInfo('Target Applicati', 'Valori della stima importati nell\'editor macro.');
    setActiveTab('piano');
  };

  // Salvataggio Modifiche Piano
  const handleSavePlanSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (selectedAthleteId === 'manual' || !selectedAthlete) {
      showError('Seleziona Atleta', 'Seleziona un atleta a cui associare il piano.');
      return;
    }

    // Se esiste già un piano e i macro sono cambiati, apri modal motivazione revisione
    if (activePlan && (
      activePlan.targetKcal !== planMacros.targetKcal ||
      activePlan.proteinGrams !== planMacros.proteinGrams ||
      activePlan.carbGrams !== planMacros.carbGrams ||
      activePlan.fatGrams !== planMacros.fatGrams
    )) {
      setIsRevisionModalOpen(true);
      return;
    }

    savePlan({
      id: activePlan?.id,
      athleteId: selectedAthlete.id,
      athleteName: selectedAthlete.fullName,
      status: planStatus,
      goal: planGoal,
      targetKcal: planMacros.targetKcal,
      proteinGrams: planMacros.proteinGrams,
      carbGrams: planMacros.carbGrams,
      fatGrams: planMacros.fatGrams,
      startDate: planStartDate,
      reviewDate: planReviewDate || undefined,
      coachNotes: planCoachNotes || undefined,
      mode: planMode,
    });

    showSuccess('Piano Salvato', `Piano nutrizionale aggiornato per ${selectedAthlete.fullName}.`);
  };

  // Conferma Revisione con Motivo
  const handleConfirmRevision = () => {
    if (!selectedAthlete) return;

    savePlan({
      id: activePlan?.id,
      athleteId: selectedAthlete.id,
      athleteName: selectedAthlete.fullName,
      status: planStatus,
      goal: planGoal,
      targetKcal: planMacros.targetKcal,
      proteinGrams: planMacros.proteinGrams,
      carbGrams: planMacros.carbGrams,
      fatGrams: planMacros.fatGrams,
      startDate: planStartDate,
      reviewDate: planReviewDate || undefined,
      coachNotes: planCoachNotes || undefined,
      mode: planMode,
    }, revisionReason || 'Adattamento calorico e macronutrienti', planCoachNotes);

    setIsRevisionModalOpen(false);
    setRevisionReason('');
    showSuccess('Revisione Salvata', 'Nuova versione del piano archiviata nello storico revisioni.');
  };

  // Copia report sintetico
  const handleCopySummary = () => {
    const athName = selectedAthlete?.firstName || 'Stima';
    const text = `📊 STIMA FABBISOGNO ENERGETICO ORIENTATIVO (${athName})
• BMR (Metabolismo Basale): ${results.bmr} kcal
• TDEE (Spesa Totale): ${results.tdee} kcal
• Target Obiettivo (${GOAL_OFFSETS[goal].label}): ${results.targetKcal} kcal/giorno

🥗 MACRONUTRIENTI CONSIGLIATI:
• Proteine: ${results.macros.proteinGrams}g (${results.macros.proteinGramsPerKg} g/kg • ${results.macros.proteinKcal} kcal • ${results.macros.proteinPercent}%)
• Grassi: ${results.macros.fatGrams}g (${results.macros.fatGramsPerKg} g/kg • ${results.macros.fatKcal} kcal • ${results.macros.fatPercent}%)
• Carboidrati: ${results.macros.carbGrams}g (${results.macros.carbGramsPerKg} g/kg • ${results.macros.carbKcal} kcal • ${results.macros.carbPercent}%)

⚠️ NOTA: Valori orientativi generali a scopo educativo, non costituiscono prescrizione medica o dietetica.`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    showSuccess('Riepilogo copiato negli appunti!');
    setTimeout(() => setCopied(false), 2500);
  };

  const totalAlertsCount = useMemo(() => getAllAlerts().length, [getAllAlerts]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* ─── TESTATA PRINCIPALE & SELETTORE ATLETA ─── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[var(--color-panel)] p-5 sm:p-6 rounded-3xl border border-[var(--color-panel-border)] shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Nutrizione & Fabbisogno Energetico</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[var(--color-primary)]/15 text-[var(--color-primary)] font-black text-[10px] uppercase tracking-wider border border-[var(--color-primary)]/30">
              Modulo Operativo
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Stima il fabbisogno energetico, personalizza i macronutrienti e monitora i check-in dell'atleta nel tempo.
          </p>
        </div>

        {/* Selettore Atleta Globale */}
        <div className="flex items-center gap-3 self-stretch md:self-auto">
          <div className="space-y-1 w-full md:w-auto">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Atleta di Riferimento:
            </span>
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 px-3 py-2 rounded-2xl">
              <User className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
              <select
                value={selectedAthleteId}
                onChange={(e) => setSelectedAthleteId(e.target.value)}
                className="bg-transparent text-white text-xs font-bold focus:outline-none cursor-pointer pr-4"
              >
                <option value="manual">-- Calcolo Libero / Nessun Atleta --</option>
                {athletes.map((ath) => (
                  <option key={ath.id} value={ath.id}>
                    {ath.fullName} ({ath.status === 'active' ? 'Attivo' : ath.status === 'trial' ? 'In Prova' : 'Archiviato'})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ─── TAB NAVIGATION BAR (4 STEP OPERATIVI) ─── */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl w-fit">
        
        <button
          type="button"
          onClick={() => setActiveTab('stima')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'stima'
              ? 'bg-[var(--color-primary)] text-black shadow-md font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Flame className="w-4 h-4" />
          <span>1. Stima Fabbisogno</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('piano')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'piano'
              ? 'bg-[var(--color-primary)] text-black shadow-md font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>2. Piano Attivo & Macro Editor</span>
          {activePlan && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" title="Piano attivo presente" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('monitoraggio')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'monitoraggio'
              ? 'bg-[var(--color-primary)] text-black shadow-md font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>3. Monitoraggio & Check-in</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('revisioni')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'revisioni'
              ? 'bg-[var(--color-primary)] text-black shadow-md font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <History className="w-4 h-4" />
          <span>4. Storico Revisioni & Alert</span>
          {totalAlertsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-black text-[10px]">
              {totalAlertsCount}
            </span>
          )}
        </button>

      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: STIMA FABBISOGNO ENERGETICO (CALCOLATORE ORIGINALE + CTA)
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'stima' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* COLONNA SINISTRA: INPUT FORM DATI CORPOREI & ATTIVITÀ */}
            <div className="lg:col-span-5 space-y-6">
              
              <div className="p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-5">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <User className="w-4 h-4 text-[var(--color-primary)]" />
                    Dati Corporei & Biometria
                  </h3>
                </div>

                {/* Sesso Biologico */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400">Sesso Biologico</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setGender('male')}
                      className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        gender === 'male'
                          ? 'bg-[var(--color-primary)] text-black shadow-md'
                          : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Uomo ♂
                    </button>
                    <button
                      type="button"
                      onClick={() => setGender('female')}
                      className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        gender === 'female'
                          ? 'bg-[var(--color-primary)] text-black shadow-md'
                          : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Donna ♀
                    </button>
                  </div>
                </div>

                {/* Peso, Altezza, Età */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400">Peso (kg)</label>
                    <input
                      type="number"
                      min="30"
                      max="250"
                      value={weightKg}
                      onChange={(e) => setWeightKg(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-black text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400">Altezza (cm)</label>
                    <input
                      type="number"
                      min="100"
                      max="240"
                      value={heightCm}
                      onChange={(e) => setHeightCm(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-black text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400">Età (anni)</label>
                    <input
                      type="number"
                      min="14"
                      max="100"
                      value={age}
                      onChange={(e) => setAge(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-black text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                    />
                  </div>
                </div>

                {/* Grasso Corporeo & Formula */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-bold text-slate-400">% Massa Grassa (opzionale)</label>
                    {hasValidBodyFat && (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        Katch-McArdle abilitato
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    min="3"
                    max="55"
                    placeholder="Es. 14.5"
                    value={bodyFatPercent}
                    onChange={(e) => setBodyFatPercent(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                  />
                  {hasValidBodyFat && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setFormula('mifflin_st_jeor')}
                        className={`py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all ${
                          formula === 'mifflin_st_jeor'
                            ? 'bg-slate-800 text-[var(--color-primary)] border border-slate-700 font-black'
                            : 'bg-slate-950 text-slate-500 border border-slate-800'
                        }`}
                      >
                        Mifflin-St Jeor
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormula('katch_mcardle')}
                        className={`py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all ${
                          formula === 'katch_mcardle'
                            ? 'bg-slate-800 text-[var(--color-primary)] border border-slate-700 font-black'
                            : 'bg-slate-950 text-slate-500 border border-slate-800'
                        }`}
                      >
                        Katch-McArdle
                      </button>
                    </div>
                  )}
                </div>

                {/* Livello di Attività */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                  <label className="text-xs font-bold text-slate-400">Livello di Attività Fisica</label>
                  <select
                    value={activityLevel}
                    onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-[var(--color-primary)] transition-colors cursor-pointer"
                  >
                    {(Object.keys(ACTIVITY_MULTIPLIERS) as ActivityLevel[]).map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {ACTIVITY_MULTIPLIERS[lvl].label} (x{ACTIVITY_MULTIPLIERS[lvl].multiplier})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 italic">
                    {ACTIVITY_MULTIPLIERS[activityLevel].description}
                  </p>
                </div>

                {/* Obiettivo Nutrizionale */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                  <label className="text-xs font-bold text-slate-400">Obiettivo Nutrizionale</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(GOAL_OFFSETS) as NutritionGoal[]).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGoal(g)}
                        className={`py-2 rounded-xl text-[11px] font-black transition-all cursor-pointer ${
                          goal === g
                            ? 'bg-[var(--color-primary)] text-black shadow-md'
                            : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {g === 'cutting' ? 'Definizione' : g === 'maintenance' ? 'Mantenimento' : 'Massa'}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500 italic">
                    {GOAL_OFFSETS[goal].description} ({GOAL_OFFSETS[goal].rangeText})
                  </p>
                </div>

              </div>

            </div>

            {/* COLONNA DESTRA: RISULTATI STIMA, METABOLISMO & MACRO */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Risultati Calorie BMR / TDEE / Target */}
              <div className="p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Flame className="w-4 h-4 text-[var(--color-primary)]" />
                    Stime Energetiche Risultanti
                  </h3>
                  <span className="text-[11px] font-bold text-slate-400">
                    Formula: {results.formulaUsed === 'katch_mcardle' ? 'Katch-McArdle' : 'Mifflin-St Jeor'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* BMR */}
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">BMR (Metabolismo Basale)</span>
                    <span className="text-2xl font-black text-white">{results.bmr} <span className="text-xs font-bold text-slate-500">kcal</span></span>
                    <span className="text-[10px] text-slate-500 block">Spesa a riposo assoluto</span>
                  </div>

                  {/* TDEE */}
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">TDEE (Spesa Totale)</span>
                    <span className="text-2xl font-black text-sky-400">{results.tdee} <span className="text-xs font-bold text-slate-500">kcal</span></span>
                    <span className="text-[10px] text-slate-500 block">Con attività fisica (x{results.activityMultiplier})</span>
                  </div>

                  {/* TARGET FINALE */}
                  <div className="p-4 rounded-xl bg-gradient-to-br from-slate-950 to-slate-900 border-2 border-[var(--color-primary)]/40 space-y-1 shadow-lg shadow-[var(--color-primary)]/5">
                    <span className="text-[10px] font-black text-[var(--color-primary)] uppercase tracking-wide block">Target Giornaliero</span>
                    <span className="text-2xl font-black text-[var(--color-primary)]">{results.targetKcal} <span className="text-xs font-bold">kcal</span></span>
                    <span className="text-[10px] text-slate-400 block font-bold">
                      {results.goalOffsetKcal > 0 ? `+${results.goalOffsetKcal}` : results.goalOffsetKcal} kcal vs TDEE
                    </span>
                  </div>
                </div>

                {/* 3 Macro Cards Suggeriti */}
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-sky-500/30 text-center space-y-0.5">
                    <span className="text-[10px] font-black uppercase text-sky-400 block">Proteine</span>
                    <span className="text-lg font-black text-white">{results.macros.proteinGrams}g</span>
                    <span className="text-[10px] text-slate-400 block">{results.macros.proteinGramsPerKg} g/kg ({results.macros.proteinPercent}%)</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/90 border border-amber-500/30 text-center space-y-0.5">
                    <span className="text-[10px] font-black uppercase text-amber-400 block">Carboidrati</span>
                    <span className="text-lg font-black text-white">{results.macros.carbGrams}g</span>
                    <span className="text-[10px] text-slate-400 block">{results.macros.carbGramsPerKg} g/kg ({results.macros.carbPercent}%)</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/90 border border-rose-500/30 text-center space-y-0.5">
                    <span className="text-[10px] font-black uppercase text-rose-400 block">Grassi</span>
                    <span className="text-lg font-black text-white">{results.macros.fatGrams}g</span>
                    <span className="text-[10px] text-slate-400 block">{results.macros.fatGramsPerKg} g/kg ({results.macros.fatPercent}%)</span>
                  </div>
                </div>

              </div>

              {/* ─── BARRA OPERATIVA CTA RICHIESTE ─── */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-950 via-[var(--color-panel)] to-slate-950 border border-[var(--color-panel-border)] shadow-xl space-y-3">
                <div className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[var(--color-primary)]" />
                  Azioni Operative per il Coaching
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleCreatePlanFromEstimator('active')}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all shadow-[0_0_20px_rgba(234,179,8,0.25)] cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>Crea piano nutrizionale</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleUseEstimatorAsBase}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs border border-slate-700 transition-all cursor-pointer"
                  >
                    <Sliders className="w-4 h-4 text-[var(--color-primary)]" />
                    <span>Usa come base & personalizza macro</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCreatePlanFromEstimator('draft')}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-xs border border-slate-800 transition-all cursor-pointer"
                  >
                    <Save className="w-4 h-4 text-slate-400" />
                    <span>Salva stima come bozza</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopySummary}
                    className="flex items-center gap-2 px-3 py-3 rounded-xl text-slate-400 hover:text-white text-xs font-bold transition-colors ml-auto cursor-pointer"
                  >
                    {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copiato!' : 'Copia'}</span>
                  </button>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800/80 text-xs text-slate-500 leading-relaxed">
                <p className="text-[11px] leading-relaxed">
                  {NUTRITION_DISCLAIMER}
                </p>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: PIANO NUTRIZIONALE ATTIVO & MACRO EDITABILI DAL COACH
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'piano' && (
        <form onSubmit={handleSavePlanSubmit} className="space-y-6 animate-in fade-in duration-200">
          
          {/* Informazioni Piano & Date */}
          <div className="p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Target className="w-4 h-4 text-[var(--color-primary)]" />
                  Impostazioni Piano per {selectedAthlete?.fullName || 'Atleta'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Definisci la strategia, le date di revisione e le indicazioni personalizzate.
                </p>
              </div>

              {/* Stato Piano */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">Stato:</span>
                <select
                  value={planStatus}
                  onChange={(e) => setPlanStatus(e.target.value as NutritionPlanStatus)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-[var(--color-primary)] transition-colors cursor-pointer"
                >
                  <option value="active">🟢 Attivo (Visibile all'atleta)</option>
                  <option value="draft">🟡 Bozza</option>
                  <option value="archived">⚪ Archiviato</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Obiettivo */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400">Fase / Obiettivo</label>
                <select
                  value={planGoal}
                  onChange={(e) => setPlanGoal(e.target.value as NutritionGoal)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-[var(--color-primary)] transition-colors cursor-pointer"
                >
                  <option value="cutting">Definizione / Dimagrimento (Deficit)</option>
                  <option value="maintenance">Mantenimento (Isocalorica)</option>
                  <option value="bulking">Massa / Ipertrofia (Surplus)</option>
                </select>
              </div>

              {/* Data Inizio */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400">Data Inizio</label>
                <input
                  type="date"
                  value={planStartDate}
                  onChange={(e) => setPlanStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                />
              </div>

              {/* Data Revisione */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400">Data Prevista Revisione</label>
                <input
                  type="date"
                  value={planReviewDate}
                  onChange={(e) => setPlanReviewDate(e.target.value)}
                  placeholder="Opzionale"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                />
              </div>
            </div>

            {/* Note Coach */}
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-bold text-slate-400">Note & Indicazioni Operative del Coach</label>
              <textarea
                rows={3}
                value={planCoachNotes}
                onChange={(e) => setPlanCoachNotes(e.target.value)}
                placeholder="Es. Mantieni le proteine distribuite in 4 pasti, concentrando i carboidrati peri-workout..."
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-[var(--color-primary)] transition-colors resize-none"
              />
            </div>
          </div>

          {/* MACRO EDITOR INTERATTIVO (G, G/KG, %) */}
          <MacroEditor
            values={planMacros}
            weightKg={weightKg}
            mode={planMode}
            goal={planGoal}
            onChange={(newMacros, newMode) => {
              setPlanMacros(newMacros);
              setPlanMode(newMode);
            }}
          />

          {/* BARRA SALVATAGGIO INFERIORE */}
          <div className="flex items-center justify-between p-5 rounded-2xl bg-gradient-to-r from-slate-950 via-[var(--color-panel)] to-slate-950 border border-[var(--color-panel-border)] shadow-xl">
            <div className="text-xs text-slate-400">
              Target finale: <span className="font-black text-white">{planMacros.targetKcal} kcal</span> • 
              P: <span className="text-cyan-400 font-bold">{planMacros.proteinGrams}g</span> • 
              C: <span className="text-amber-400 font-bold">{planMacros.carbGrams}g</span> • 
              F: <span className="text-rose-400 font-bold">{planMacros.fatGrams}g</span>
            </div>

            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs sm:text-sm hover:bg-[var(--color-primary-hover)] transition-all shadow-[0_0_20px_rgba(234,179,8,0.25)] cursor-pointer"
            >
              <Save className="w-4 h-4 stroke-[2.5]" />
              <span>Salva Piano & Target</span>
            </button>
          </div>

        </form>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 3: MONITORAGGIO NEL TEMPO & CHECK-IN
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'monitoraggio' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {selectedAthlete ? (
            <NutritionMonitoringView
              athleteId={selectedAthlete.id}
              athleteName={selectedAthlete.fullName}
              athletePhone={selectedAthlete.phone}
              activePlan={activePlan}
              onNavigateToMacros={() => setActiveTab('piano')}
            />
          ) : (
            <div className="p-8 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] text-center space-y-2">
              <User className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-400">Seleziona un atleta dal menu in alto per visualizzare il monitoraggio.</p>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 4: STORICO REVISIONI & ALERT OPERATIVI
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'revisioni' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <NutritionRevisionsView plan={activePlan} />
        </div>
      )}

      {/* ─── MODAL SALVATAGGIO REVISIONE CON MOTIVO ─── */}
      {isRevisionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)]">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Registra Nuova Revisione</h3>
                <p className="text-xs text-slate-400">I target calorici o macro sono cambiati. Inserisci il motivo della modifica.</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                Motivo / Causa dell'adattamento
              </label>
              <input
                type="text"
                required
                value={revisionReason}
                onChange={(e) => setRevisionReason(e.target.value)}
                placeholder="Es. Calo di peso fermo da 2 settimane / Aumento calorie post-gara"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsRevisionModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white text-xs font-bold"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleConfirmRevision}
                className="px-5 py-2.5 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all cursor-pointer shadow-md"
              >
                Salva Revisione
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
