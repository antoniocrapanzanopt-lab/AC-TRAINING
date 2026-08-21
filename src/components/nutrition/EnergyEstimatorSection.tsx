import React, { useState, useEffect, useMemo } from 'react';
import {
  Flame,
  Activity,
  Zap,
  Copy,
  Check,
  Info,
  ArrowRight,
  Scale,
  AlertTriangle,
} from 'lucide-react';
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
import { useNutrition } from '../../context/NutritionContext';
import { useToast } from '../../context/ToastContext';
import { AthleteMetric } from '../../types/metrics';
import { NutritionPlanStatus } from '../../types/nutrition';

interface EnergyEstimatorSectionProps {
  athleteId: string;
  athleteName: string;
  latestMetric?: AthleteMetric | null;
  athleteBirthDate?: string | null;
  athleteGender?: string | null;
  athleteHeightCm?: number | null;
  onNavigateToFullNutrition?: () => void;
}

export const EnergyEstimatorSection: React.FC<EnergyEstimatorSectionProps> = ({
  athleteId,
  athleteName,
  latestMetric,
  athleteBirthDate,
  athleteGender,
  athleteHeightCm,
  onNavigateToFullNutrition,
}) => {
  const { createPlanFromEstimator, getAthleteActivePlan } = useNutrition();
  const { showSuccess } = useToast();

  const activePlan = useMemo(() => {
    return getAthleteActivePlan(athleteId);
  }, [athleteId, getAthleteActivePlan]);

  // Calcolo età da data di nascita
  const calculatedAge = useMemo(() => {
    if (!athleteBirthDate) return 28;
    const birth = new Date(athleteBirthDate);
    if (isNaN(birth.getTime())) return 28;
    const diff = Date.now() - birth.getTime();
    const age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
    return age >= 14 && age <= 90 ? age : 28;
  }, [athleteBirthDate]);

  // Rilevazione Sesso
  const defaultGender: Gender = useMemo(() => {
    if (!athleteGender) return 'male';
    const g = athleteGender.toLowerCase();
    return g === 'f' || g === 'female' || g === 'donna' ? 'female' : 'male';
  }, [athleteGender]);

  // Form State Pre-compilato
  const [gender, setGender] = useState<Gender>(defaultGender);
  const [weightKg, setWeightKg] = useState<number>(() => latestMetric?.weight_kg || 75);
  const [heightCm, setHeightCm] = useState<number>(() => latestMetric?.height_cm || athleteHeightCm || 175);
  const [age, setAge] = useState<number>(calculatedAge);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [bodyFatPercent, setBodyFatPercent] = useState<string>(() =>
    latestMetric?.body_fat_percentage ? String(latestMetric.body_fat_percentage) : ''
  );
  const [formula, setFormula] = useState<FormulaType>('mifflin_st_jeor');
  const [goal, setGoal] = useState<NutritionGoal>('maintenance');
  const [copied, setCopied] = useState<boolean>(false);

  // Sincronizza quando arrivano nuovi dati metrici
  useEffect(() => {
    if (latestMetric?.weight_kg) setWeightKg(latestMetric.weight_kg);
    if (latestMetric?.height_cm) setHeightCm(latestMetric.height_cm);
    if (latestMetric?.body_fat_percentage) setBodyFatPercent(String(latestMetric.body_fat_percentage));
  }, [latestMetric]);

  const parsedBodyFat = bodyFatPercent.trim() ? Number(bodyFatPercent) : undefined;
  const hasValidBodyFat = typeof parsedBodyFat === 'number' && parsedBodyFat > 3 && parsedBodyFat < 60;

  // Calcolo Risultati Reattivo
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

  // Salvataggio Piano Nutrizionale
  const handleSavePlan = (status: NutritionPlanStatus = 'active') => {
    createPlanFromEstimator(
      athleteId,
      athleteName,
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
      `Piano generato da stima fabbisogno (${GOAL_OFFSETS[goal].label})`
    );

    showSuccess(
      'Piano Nutrizionale Creato',
      `Piano ${status === 'draft' ? 'in bozza' : 'attivo'} (${results.targetKcal} kcal) salvato con successo per ${athleteName}.`
    );
  };

  // Copia Riepilogo per WhatsApp / Chat
  const handleCopySummary = () => {
    const text = `📊 *STIMA FABBISOGNO ENERGETICO & MACRO* (${athleteName})
-----------------------------------------
🎯 Obiettivo: ${GOAL_OFFSETS[goal].label}
🔥 Metabolismo Basale (BMR): ${results.bmr} kcal
⚡ Fabbisogno Totale (TDEE): ${results.tdee} kcal
🎯 Target Giornaliero: *${results.targetKcal} kcal*

Ripartizione Macro Consigliata:
🥩 Proteine: *${results.macros.proteinGrams}g* (${results.macros.proteinPercent}% - ${results.macros.proteinGramsPerKg}g/kg)
🍚 Carboidrati: *${results.macros.carbGrams}g* (${results.macros.carbPercent}% - ${results.macros.carbGramsPerKg}g/kg)
🥑 Grassi: *${results.macros.fatGrams}g* (${results.macros.fatPercent}% - ${results.macros.fatGramsPerKg}g/kg)

_Stima calcolata con formula ${results.formulaUsed === 'katch_mcardle' ? 'Katch-McArdle (LBM)' : 'Mifflin-St Jeor'}._`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    showSuccess('Copiato nella Clipboard', 'Puoi incollare il riepilogo su WhatsApp o inviarlo all\'atleta.');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      
      {/* BANNER NOTIFICA PRECOMPILAZIONE DA ULTIMO CHECK */}
      {latestMetric ? (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Scale className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-slate-200">
              Dati corporei sincronizzati dall'ultimo check del <strong>{new Date(latestMetric.date).toLocaleDateString('it-IT')}</strong> ({latestMetric.weight_kg} kg{latestMetric.body_fat_percentage ? `, ${latestMetric.body_fat_percentage}% BF` : ''}).
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] uppercase shrink-0">
            Sincronizzato
          </span>
        </div>
      ) : (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2.5 text-xs text-amber-200">
          <Info className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Nessun check misure registrato per questo atleta. Inserisci i dati stimati per calcolare il fabbisogno.</span>
        </div>
      )}

      {/* PIANO ATTIVO GIA' ESISTENTE (SE PRESENTE) */}
      {activePlan && (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-[var(--color-primary)]/40 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)] shrink-0">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-white">Piano Nutrizionale Attivo</span>
                <span className="px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] uppercase">
                  In Corso
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Target attuale: <strong className="text-white">{activePlan.targetKcal} kcal</strong> (P: {activePlan.proteinGrams}g, C: {activePlan.carbGrams}g, F: {activePlan.fatGrams}g) • Iniziato il {new Date(activePlan.startDate).toLocaleDateString('it-IT')}
              </p>
            </div>
          </div>

          {onNavigateToFullNutrition && (
            <button
              type="button"
              onClick={onNavigateToFullNutrition}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5"
            >
              <span>Gestione Completa</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* GRIGLIA INPUT CORPOREI & IMPOSTAZIONE CALCOLO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COLONNA SINISTRA: DATI CORPOREI E LIVELLO ATTIVITÀ (7 COL) */}
        <div className="lg:col-span-7 space-y-5">
          
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-5">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
              <Activity className="w-4 h-4 text-[var(--color-primary)]" />
              1. Parametri Antropometrici
            </h3>

            {/* Sesso Biologico */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                Sesso Biologico
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setGender('male')}
                  className={`py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    gender === 'male'
                      ? 'bg-[var(--color-primary)] text-slate-950 font-black shadow-md'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                  }`}
                >
                  <span>👨</span>
                  <span>Uomo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGender('female')}
                  className={`py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    gender === 'female'
                      ? 'bg-[var(--color-primary)] text-slate-950 font-black shadow-md'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                  }`}
                >
                  <span>👩</span>
                  <span>Donna</span>
                </button>
              </div>
            </div>

            {/* Peso, Altezza, Età, Massa Grassa */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Peso */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Peso (kg)</label>
                <input
                  type="number"
                  step="0.5"
                  min="30"
                  max="250"
                  value={weightKg}
                  onChange={(e) => setWeightKg(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-black text-sm focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              {/* Altezza */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Altezza (cm)</label>
                <input
                  type="number"
                  step="1"
                  min="100"
                  max="230"
                  value={heightCm}
                  onChange={(e) => setHeightCm(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-black text-sm focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              {/* Età */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Età (anni)</label>
                <input
                  type="number"
                  step="1"
                  min="14"
                  max="100"
                  value={age}
                  onChange={(e) => setAge(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-black text-sm focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              {/* % Grasso */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">% Grasso</label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="Opzionale"
                  value={bodyFatPercent}
                  onChange={(e) => setBodyFatPercent(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-black text-sm focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
            </div>

            {/* Formula Utilizzata */}
            {hasValidBodyFat && (
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                  Formula Metabolica
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormula('mifflin_st_jeor')}
                    className={`p-2.5 rounded-xl text-left text-xs transition-all cursor-pointer ${
                      formula === 'mifflin_st_jeor'
                        ? 'bg-[var(--color-primary)] text-black font-bold shadow-md'
                        : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}
                  >
                    <span className="block font-black">Mifflin-St Jeor</span>
                    <span className="text-[10px] opacity-80">Standard (peso, altezza, età)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormula('katch_mcardle')}
                    className={`p-2.5 rounded-xl text-left text-xs transition-all cursor-pointer ${
                      formula === 'katch_mcardle'
                        ? 'bg-[var(--color-primary)] text-black font-bold shadow-md'
                        : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}
                  >
                    <span className="block font-black">Katch-McArdle</span>
                    <span className="text-[10px] opacity-80">Basata su massa magra ({results.lbmKg ? `${Math.round(results.lbmKg)}kg LBM` : 'BF'})</span>
                  </button>
                </div>
              </div>
            )}

            {/* Livello di Attività Fisica */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center justify-between">
                <span>Livello di Attività (PAL)</span>
                <span className="text-[11px] text-[var(--color-primary)] font-black">
                  x{ACTIVITY_MULTIPLIERS[activityLevel].multiplier}
                </span>
              </label>

              <div className="space-y-1.5">
                {(Object.keys(ACTIVITY_MULTIPLIERS) as ActivityLevel[]).map((level) => {
                  const info = ACTIVITY_MULTIPLIERS[level];
                  const isSel = activityLevel === level;

                  return (
                    <div
                      key={level}
                      onClick={() => setActivityLevel(level)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSel
                          ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-white shadow-md'
                          : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${isSel ? 'text-[var(--color-primary)]' : 'text-white'}`}>
                            {info.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">{info.description}</p>
                      </div>
                      <span className="font-mono font-bold text-xs text-slate-300 shrink-0">
                        x{info.multiplier}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Obiettivo Calorico */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
              <Zap className="w-4 h-4 text-amber-400" />
              2. Obiettivo Nutrizionale
            </h3>

            <div className="grid grid-cols-3 gap-2.5">
              {(['cutting', 'maintenance', 'bulking'] as NutritionGoal[]).map((g) => {
                const isSel = goal === g;
                const info = GOAL_OFFSETS[g];

                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGoal(g)}
                    className={`p-3 rounded-2xl text-center transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                      isSel
                        ? 'bg-[var(--color-primary)] text-black font-black shadow-lg shadow-[var(--color-primary)]/20'
                        : 'bg-slate-950 border border-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold block">{info.label}</span>
                      <span className="text-[10px] opacity-80 block mt-0.5">{info.rangeText}</span>
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-wider block">
                      {info.defaultOffset > 0 ? `+${info.defaultOffset}` : info.defaultOffset} kcal
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* COLONNA DESTRA: RISULTATI STIMA, MACRO & AZIONI (5 COL) */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* CARD RISULTATI FABBISOGNO HERO */}
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-[var(--color-primary)]/40 shadow-2xl space-y-5">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-primary)] block">
                Risultato Stima Energetica
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl sm:text-4xl font-black font-mono text-white">
                  {results.targetKcal}
                </span>
                <span className="text-sm font-bold text-[var(--color-primary)] uppercase">
                  kcal / giorno
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Target per <strong>{GOAL_OFFSETS[goal].label}</strong> ({results.goalOffsetKcal > 0 ? `+${results.goalOffsetKcal}` : results.goalOffsetKcal} kcal rispetto al TDEE).
              </p>
            </div>

            {/* BMR & TDEE */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800/80">
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Metabolismo Basale (BMR)</span>
                <span className="text-xl font-black font-mono text-slate-300">{results.bmr} kcal</span>
                <span className="text-[9px] text-slate-500 block">Consumo a riposo</span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Dispendio Totale (TDEE)</span>
                <span className="text-xl font-black font-mono text-amber-400">{results.tdee} kcal</span>
                <span className="text-[9px] text-slate-500 block">Mantenimento isocalorico</span>
              </div>
            </div>

            {/* RIPARTIZIONE MACRONUTRIENTI */}
            <div className="space-y-3 pt-3 border-t border-slate-800/80">
              <span className="text-xs font-black uppercase tracking-wider text-slate-300 block">
                Ripartizione Macronutrienti
              </span>

              <div className="space-y-2">
                {/* PROTEINE */}
                <div className="p-3 rounded-2xl bg-slate-950 border border-rose-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 font-bold flex items-center justify-center text-xs">
                      P
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">Proteine</span>
                      <span className="text-[10px] text-slate-400">{results.macros.proteinGramsPerKg} g/kg • {results.macros.proteinPercent}% kcal</span>
                    </div>
                  </div>
                  <span className="text-base font-black font-mono text-rose-400">
                    {results.macros.proteinGrams} g
                  </span>
                </div>

                {/* CARBOIDRATI */}
                <div className="p-3 rounded-2xl bg-slate-950 border border-sky-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 font-bold flex items-center justify-center text-xs">
                      C
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">Carboidrati</span>
                      <span className="text-[10px] text-slate-400">{results.macros.carbGramsPerKg} g/kg • {results.macros.carbPercent}% kcal</span>
                    </div>
                  </div>
                  <span className="text-base font-black font-mono text-sky-400">
                    {results.macros.carbGrams} g
                  </span>
                </div>

                {/* GRASSI */}
                <div className="p-3 rounded-2xl bg-slate-950 border border-amber-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 font-bold flex items-center justify-center text-xs">
                      F
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">Grassi</span>
                      <span className="text-[10px] text-slate-400">{results.macros.fatGramsPerKg} g/kg • {results.macros.fatPercent}% kcal</span>
                    </div>
                  </div>
                  <span className="text-base font-black font-mono text-amber-400">
                    {results.macros.fatGrams} g
                  </span>
                </div>
              </div>
            </div>

            {/* PULSANTI DI AZIONE */}
            <div className="space-y-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => handleSavePlan('active')}
                className="w-full py-3.5 rounded-2xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all cursor-pointer shadow-lg shadow-[var(--color-primary)]/20 flex items-center justify-center gap-2"
              >
                <Flame className="w-4 h-4" />
                <span>Salva come Piano Attivo per {athleteName}</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSavePlan('draft')}
                  className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all cursor-pointer text-center"
                >
                  Salva in Bozza
                </button>

                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiato!' : 'Copia per Chat'}</span>
                </button>
              </div>
            </div>

          </div>

          {/* DISCLAIMER & AVVERTENZA LEGALE (STILE UFFICIALE ROSSO) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-rose-950/60 to-slate-950 border-2 border-rose-500/70 shadow-xl shadow-rose-950/60 space-y-3">
            <div className="flex items-center gap-3 border-b border-rose-500/30 pb-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-5 h-5 animate-pulse text-rose-400" />
              </div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-rose-400 block">
                  Presa Visione Obbligatoria
                </span>
                <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-tight">
                  Avvertenza Legale & Consapevolezza
                </h4>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-rose-900/20 border border-rose-500/30 text-[11px] text-rose-100/90 leading-relaxed font-medium">
              <p>
                {NUTRITION_DISCLAIMER}
              </p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
