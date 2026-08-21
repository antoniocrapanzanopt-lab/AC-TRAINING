import React, { useState, useMemo, useEffect } from 'react';
import {
  Flame,
  Activity,
  Sparkles,
  PieChart,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  Sliders,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAthletes } from '../../context/AthletesContext';
import { useNutrition } from '../../context/NutritionContext';
import { useToast } from '../../context/ToastContext';
import {
  Gender,
  ActivityLevel,
  NutritionGoal,
  NutritionInput,
  calculateNutritionEstimates,
  ACTIVITY_MULTIPLIERS,
  GOAL_OFFSETS,
  NUTRITION_DISCLAIMER,
  NUTRITION_GUIDE_TEXT,
} from '../../utils/nutritionCalculator';

interface AthleteNutritionEstimatorProps {
  initialWeight?: number;
  initialHeight?: number;
  initialGender?: Gender;
  initialAge?: number;
  initialBodyFat?: number;
  onSavedAsActive?: () => void;
}

export const AthleteNutritionEstimator: React.FC<AthleteNutritionEstimatorProps> = ({
  initialWeight,
  initialHeight,
  initialGender,
  initialAge,
  initialBodyFat,
  onSavedAsActive,
}) => {
  const { user } = useAuth();
  const { athletes } = useAthletes();
  const { createPlanFromEstimator } = useNutrition();
  const { showSuccess } = useToast();

  // Trova dati profilo atleta se disponibili
  const athleteProfile = useMemo(() => {
    if (user?.athleteId) {
      return athletes.find((a) => a.id === user.athleteId) || null;
    }
    if (user?.email) {
      return athletes.find((a) => a.email && a.email.toLowerCase() === user.email.toLowerCase()) || null;
    }
    return null;
  }, [user, athletes]);

  const athleteId = athleteProfile?.id || user?.athleteId || user?.id || 'ath-local';
  const athleteName = athleteProfile?.fullName || user?.email || 'Atleta';

  // Form State Atleta
  const [gender, setGender] = useState<Gender>(initialGender || 'male');
  const [weightKg, setWeightKg] = useState<number>(initialWeight || 70);
  const [heightCm, setHeightCm] = useState<number>(initialHeight || 175);
  const [age, setAge] = useState<number>(initialAge || 26);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [bodyFatPercent, setBodyFatPercent] = useState<string>(initialBodyFat ? String(initialBodyFat) : '');
  const [goal, setGoal] = useState<NutritionGoal>('maintenance');
  
  // Modalità personalizzazione manuale macro
  const [isCustomizingMacros, setIsCustomizingMacros] = useState<boolean>(false);
  const [customProteinGrams, setCustomProteinGrams] = useState<number>(150);
  const [customCarbGrams, setCustomCarbGrams] = useState<number>(260);
  const [customFatGrams, setCustomFatGrams] = useState<number>(60);
  const [customTargetKcal, setCustomTargetKcal] = useState<number>(2200);

  // STATO CONSENSO / ACCETTAZIONE DISCLAIMER PRELIMINARE
  const [hasAcceptedDisclaimer, setHasAcceptedDisclaimer] = useState<boolean>(false);
  const [checkboxChecked, setCheckboxChecked] = useState<boolean>(false);

  // Precarica dati se non passati esplicitamente
  useEffect(() => {
    if (athleteProfile) {
      if (athleteProfile.gender && !initialGender) {
        const g = athleteProfile.gender.toLowerCase();
        setGender(g === 'f' || g === 'female' || g === 'donna' ? 'female' : 'male');
      }
      if (athleteProfile.dateOfBirth && !initialAge) {
        const birth = new Date(athleteProfile.dateOfBirth);
        const diff = Date.now() - birth.getTime();
        const calcAge = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
        if (calcAge > 10 && calcAge < 100) setAge(calcAge);
      }
    }
  }, [athleteProfile, initialWeight, initialHeight, initialGender, initialAge, initialBodyFat]);

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
      formula: hasValidBodyFat ? 'katch_mcardle' : 'mifflin_st_jeor',
    };
    return calculateNutritionEstimates(input);
  }, [gender, weightKg, heightCm, age, activityLevel, parsedBodyFat, hasValidBodyFat, goal]);

  // Sincronizza macro custom quando cambiano i risultati stimati e l'utente non ha aperto la modalità custom
  useEffect(() => {
    if (!isCustomizingMacros) {
      setCustomTargetKcal(results.targetKcal);
      setCustomProteinGrams(results.macros.proteinGrams);
      setCustomCarbGrams(results.macros.carbGrams);
      setCustomFatGrams(results.macros.fatGrams);
    }
  }, [results, isCustomizingMacros]);

  // Calcolo calorie attive effettive
  const activeCalories = isCustomizingMacros ? customTargetKcal : results.targetKcal;
  const activeProtein = isCustomizingMacros ? customProteinGrams : results.macros.proteinGrams;
  const activeCarb = isCustomizingMacros ? customCarbGrams : results.macros.carbGrams;
  const activeFat = isCustomizingMacros ? customFatGrams : results.macros.fatGrams;

  // Percentuali macro effettive
  const activeProteinPercent = Math.round(((activeProtein * 4) / Math.max(1, activeCalories)) * 100);
  const activeCarbPercent = Math.round(((activeCarb * 4) / Math.max(1, activeCalories)) * 100);
  const activeFatPercent = Math.round(((activeFat * 9) / Math.max(1, activeCalories)) * 100);

  // Azione: Salva come Miei Obiettivi Energetici Giornalieri
  const handleSaveAsDailyGoals = () => {
    createPlanFromEstimator(
      athleteId,
      athleteName,
      goal,
      activeCalories,
      {
        proteinGrams: activeProtein,
        carbGrams: activeCarb,
        fatGrams: activeFat,
      },
      {
        weightKg,
        heightCm,
        age,
        gender,
        activityLevel,
        bodyFatPercent: hasValidBodyFat ? parsedBodyFat : undefined,
        formula: hasValidBodyFat ? 'katch_mcardle' : 'mifflin_st_jeor',
        bmr: results.bmr,
        tdee: results.tdee,
      },
      new Date().toISOString().slice(0, 10),
      undefined,
      isCustomizingMacros
        ? `Obiettivi personalizzati dall'atleta (${GOAL_OFFSETS[goal].label})`
        : `Stima calcolata dall'atleta (${GOAL_OFFSETS[goal].label})`
    );

    showSuccess(
      'Obiettivi Energetici Salvati!',
      `Il tuo piano attivo è stato impostato a ${activeCalories} kcal (P: ${activeProtein}g, C: ${activeCarb}g, F: ${activeFat}g).`
    );

    if (onSavedAsActive) {
      onSavedAsActive();
    }
  };

  // ─── SCHERMATA PRELIMINARE: GATE DISCLAIMER ───
  if (!hasAcceptedDisclaimer) {
    return (
      <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-rose-950/60 to-slate-950 border-2 border-rose-500/70 shadow-2xl shadow-rose-950/80 space-y-6">
          
          <div className="flex items-center gap-3.5 border-b border-rose-500/30 pb-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0 shadow-lg shadow-rose-500/20">
              <AlertTriangle className="w-6 h-6 animate-pulse text-rose-400" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-400 block">
                Presa Visione Obbligatoria
              </span>
              <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
                Avvertenza Legale & Consapevolezza
              </h3>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-rose-900/20 border border-rose-500/30 text-xs sm:text-sm text-rose-100/90 leading-relaxed space-y-3 font-medium">
            <p>
              {NUTRITION_DISCLAIMER}
            </p>
          </div>

          <label className="flex items-start gap-3.5 p-4 rounded-2xl bg-rose-950/80 border border-rose-500/50 cursor-pointer hover:border-rose-400 transition-colors select-none">
            <input
              type="checkbox"
              checked={checkboxChecked}
              onChange={(e) => setCheckboxChecked(e.target.checked)}
              className="w-5 h-5 rounded-lg border-2 border-rose-500 text-rose-600 focus:ring-rose-500 mt-0.5 shrink-0 cursor-pointer accent-rose-500"
            />
            <span className="text-xs font-bold text-white leading-snug">
              Dichiaro di aver letto, compreso e accettato che i valori calcolati sono una stima orientativa/educativa e non costituiscono una prescrizione medica o nutrizionale personalizzata.
            </span>
          </label>

          <button
            type="button"
            disabled={!checkboxChecked}
            onClick={() => setHasAcceptedDisclaimer(true)}
            className="w-full py-4 px-6 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm uppercase tracking-wider transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-xl shadow-rose-600/30 cursor-pointer"
          >
            <span>Accetta e Continua al Calcolatore</span>
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>
        </div>
      </div>
    );
  }

  // ─── INTERFACCIA CALCOLATORE (DOPO ACCETTAZIONE) ───
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Badge Consenso Registrato + Bottone Reset */}
      <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          <span>Consenso e Presa Visione Legale Registrati</span>
        </div>
        <button
          type="button"
          onClick={() => {
            setHasAcceptedDisclaimer(false);
            setCheckboxChecked(false);
          }}
          className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Rileggi Disclaimer</span>
        </button>
      </div>

      {/* Guida Introduttiva */}
      <div className="p-4 rounded-3xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/25 flex items-start gap-3.5 shadow-lg shadow-[var(--color-primary)]/5">
        <div className="w-9 h-9 rounded-2xl bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)] shrink-0 mt-0.5">
          <Flame className="w-4 h-4" />
        </div>
        <div className="space-y-0.5">
          <h3 className="text-xs font-black text-white uppercase tracking-tight">
            Istruzioni per il Calcolo & Personalizzazione
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed font-medium">
            {NUTRITION_GUIDE_TEXT} Dopo il calcolo potrai salvare la stima direttamente tra i tuoi obiettivi energetici giornalieri.
          </p>
        </div>
      </div>

      {/* Parametri Input Atleta */}
      <div className="bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--color-primary)]" />
            1. I Tuoi Dati Corporei
          </span>
          <span className="text-[10px] font-bold text-slate-500">Stima Scientifica</span>
        </div>

        {/* Sesso */}
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
            Sesso Biologico
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setGender('male')}
              className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                gender === 'male'
                  ? 'bg-[var(--color-primary)] text-slate-950 shadow-md shadow-[var(--color-primary)]/20'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Uomo
            </button>
            <button
              type="button"
              onClick={() => setGender('female')}
              className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                gender === 'female'
                  ? 'bg-[var(--color-primary)] text-slate-950 shadow-md shadow-[var(--color-primary)]/20'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Donna
            </button>
          </div>
        </div>

        {/* Peso, Altezza, Età */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
              Peso (kg)
            </label>
            <input
              type="number"
              min="30"
              max="250"
              value={weightKg}
              onChange={(e) => setWeightKg(Number(e.target.value))}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono font-bold text-sm focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
              Altezza (cm)
            </label>
            <input
              type="number"
              min="100"
              max="240"
              value={heightCm}
              onChange={(e) => setHeightCm(Number(e.target.value))}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono font-bold text-sm focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
              Età
            </label>
            <input
              type="number"
              min="14"
              max="100"
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono font-bold text-sm focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>
        </div>

        {/* % Massa Grassa Opzionale */}
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
            % Massa Grassa (Opzionale)
          </label>
          <input
            type="number"
            min="4"
            max="50"
            step="0.5"
            placeholder="es. 14.5 (se conosciuta)"
            value={bodyFatPercent}
            onChange={(e) => setBodyFatPercent(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-[var(--color-primary)] placeholder:text-slate-600"
          />
        </div>

        {/* Livello di Attività Giornaliera */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
            Livello di Attività Fisica Settimanale
          </label>
          <div className="space-y-1.5">
            {(Object.keys(ACTIVITY_MULTIPLIERS) as ActivityLevel[]).map((key) => {
              const item = ACTIVITY_MULTIPLIERS[key];
              const isSelected = activityLevel === key;

              return (
                <div
                  key={key}
                  onClick={() => setActivityLevel(key)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-[var(--color-primary)]/15 border-[var(--color-primary)] text-white shadow-md'
                      : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="min-w-0">
                    <span className="text-xs font-black text-white block">{item.label}</span>
                    <span className="text-[10px] text-slate-400 block truncate">{item.description}</span>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                    isSelected ? 'border-[var(--color-primary)] bg-[var(--color-primary)]' : 'border-slate-700 bg-slate-900'
                  }`}>
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Obiettivo Nutrizionale */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
            Tuo Obiettivo Attuale
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(GOAL_OFFSETS) as NutritionGoal[]).map((key) => {
              const g = GOAL_OFFSETS[key];
              const isSelected = goal === key;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setGoal(key)}
                  className={`p-3 rounded-2xl text-center border transition-all cursor-pointer flex flex-col items-center justify-center space-y-0.5 ${
                    isSelected
                      ? 'bg-[var(--color-primary)] text-slate-950 font-black border-[var(--color-primary)] shadow-md shadow-[var(--color-primary)]/20'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-xs font-black block leading-tight">{g.label.split('/')[0]}</span>
                  <span className="text-[9px] font-mono opacity-80 block">{g.rangeText}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── RISULTATI STIMA, PERSONALIZZAZIONE MACRO & SALVATAGGIO ─── */}
      <div className="bg-gradient-to-br from-slate-900/90 to-slate-950 border border-[var(--color-primary)]/40 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--color-primary)]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4 relative z-10">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-primary)] block">
              Fabbisogno Giornaliero Calcolato
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white font-mono mt-0.5">
              {activeCalories.toLocaleString('it-IT')} <span className="text-sm font-sans font-bold text-slate-400">kcal / giorno</span>
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsCustomizingMacros(!isCustomizingMacros)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                isCustomizingMacros
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-900 text-slate-300 hover:text-white border-slate-700'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-[var(--color-primary)]" />
              <span>{isCustomizingMacros ? 'Chiudi Modifica Macro' : 'Personalizza Macro'}</span>
            </button>

            <div className="px-3 py-1.5 rounded-xl bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30 text-[var(--color-primary)] text-xs font-black uppercase tracking-wider">
              {GOAL_OFFSETS[goal].label}
            </div>
          </div>
        </div>

        {/* BMR vs TDEE */}
        <div className="grid grid-cols-2 gap-3 relative z-10">
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-400" /> BMR Basale
            </span>
            <div className="text-lg font-black font-mono text-white">
              {results.bmr} <span className="text-xs font-sans text-slate-400">kcal</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-emerald-400" /> TDEE Totale
            </span>
            <div className="text-lg font-black font-mono text-white">
              {results.tdee} <span className="text-xs font-sans text-slate-400">kcal</span>
            </div>
          </div>
        </div>

        {/* PANNELLO DI PERSONALIZZAZIONE MANUALE DEI MACRO (SE ATTIVO) */}
        {isCustomizingMacros && (
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-[var(--color-primary)]/40 space-y-4 relative z-10 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                Modifica Manuale Grammature & Calorie
              </h4>
              <button
                type="button"
                onClick={() => {
                  setCustomTargetKcal(results.targetKcal);
                  setCustomProteinGrams(results.macros.proteinGrams);
                  setCustomCarbGrams(results.macros.carbGrams);
                  setCustomFatGrams(results.macros.fatGrams);
                }}
                className="text-[10px] text-[var(--color-primary)] hover:underline font-bold"
              >
                Ripristina valori stimati
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-300 uppercase">Target Kcal</label>
                <input
                  type="number"
                  step="50"
                  value={customTargetKcal}
                  onChange={(e) => setCustomTargetKcal(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold focus:border-[var(--color-primary)]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-sky-400 uppercase">Proteine (g)</label>
                <input
                  type="number"
                  step="5"
                  value={customProteinGrams}
                  onChange={(e) => setCustomProteinGrams(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-sky-500/40 text-white font-mono font-bold focus:border-sky-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-amber-400 uppercase">Carboidrati (g)</label>
                <input
                  type="number"
                  step="5"
                  value={customCarbGrams}
                  onChange={(e) => setCustomCarbGrams(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-amber-500/40 text-white font-mono font-bold focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-rose-400 uppercase">Grassi (g)</label>
                <input
                  type="number"
                  step="2"
                  value={customFatGrams}
                  onChange={(e) => setCustomFatGrams(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-rose-500/40 text-white font-mono font-bold focus:border-rose-400"
                />
              </div>
            </div>
          </div>
        )}

        {/* Macronutrienti Consigliati */}
        <div className="space-y-3 pt-2 relative z-10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <PieChart className="w-4 h-4 text-[var(--color-primary)]" />
              Ripartizione Macronutrienti
            </span>
            <span className="text-[10px] font-mono font-bold text-slate-400">
              {activeProteinPercent}% Pro • {activeCarbPercent}% Carb • {activeFatPercent}% Fat
            </span>
          </div>

          {/* Barra grafica */}
          <div className="w-full h-3 rounded-full bg-slate-950 overflow-hidden flex border border-slate-800">
            <div className="h-full bg-rose-500 transition-all duration-300" style={{ width: `${activeProteinPercent}%` }} />
            <div className="h-full bg-sky-400 transition-all duration-300" style={{ width: `${activeCarbPercent}%` }} />
            <div className="h-full bg-amber-400 transition-all duration-300" style={{ width: `${activeFatPercent}%` }} />
          </div>

          {/* 3 Card Macro */}
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            {/* Proteine */}
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center space-y-0.5">
              <span className="text-[10px] font-black uppercase text-rose-400 block">🥩 Proteine</span>
              <div className="text-xl font-black font-mono text-white">
                {activeProtein}<span className="text-xs font-sans text-rose-300 font-bold">g</span>
              </div>
              <span className="text-[9px] text-slate-400 font-mono block">
                {(activeProtein / Math.max(1, weightKg)).toFixed(1)} g/kg
              </span>
            </div>

            {/* Carboidrati */}
            <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-center space-y-0.5">
              <span className="text-[10px] font-black uppercase text-sky-400 block">🍚 Carboidrati</span>
              <div className="text-xl font-black font-mono text-white">
                {activeCarb}<span className="text-xs font-sans text-sky-300 font-bold">g</span>
              </div>
              <span className="text-[9px] text-slate-400 font-mono block">
                {(activeCarb / Math.max(1, weightKg)).toFixed(1)} g/kg
              </span>
            </div>

            {/* Grassi */}
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-0.5">
              <span className="text-[10px] font-black uppercase text-amber-400 block">🥑 Grassi</span>
              <div className="text-xl font-black font-mono text-white">
                {activeFat}<span className="text-xs font-sans text-amber-300 font-bold">g</span>
              </div>
              <span className="text-[9px] text-slate-400 font-mono block">
                {(activeFat / Math.max(1, weightKg)).toFixed(1)} g/kg
              </span>
            </div>
          </div>
        </div>

        {/* ─── PULSANTE SALVA NEI MIEI OBIETTIVI GIORNALIERI ─── */}
        <div className="pt-3 border-t border-slate-800/80 relative z-10">
          <button
            type="button"
            onClick={handleSaveAsDailyGoals}
            className="w-full py-4 px-6 rounded-2xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-[var(--color-primary)]/20 transition-all cursor-pointer active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            <span>Salva come Miei Obiettivi Energetici Giornalieri</span>
          </button>
        </div>
      </div>

      {/* DISCLAIMER & AVVERTENZA LEGALE (STILE UFFICIALE ROSSO) */}
      <div className="p-5 sm:p-7 rounded-3xl bg-gradient-to-b from-rose-950/60 to-slate-950 border-2 border-rose-500/70 shadow-2xl shadow-rose-950/80 space-y-4">
        <div className="flex items-center gap-3.5 border-b border-rose-500/30 pb-3.5">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0 shadow-lg shadow-rose-500/20">
            <AlertTriangle className="w-6 h-6 animate-pulse text-rose-400" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-rose-400 block">
              Presa Visione Obbligatoria
            </span>
            <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-tight">
              Avvertenza Legale & Consapevolezza
            </h3>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-rose-900/20 border border-rose-500/30 text-xs text-rose-100/90 leading-relaxed font-medium">
          <p>
            {NUTRITION_DISCLAIMER}
          </p>
        </div>
      </div>

    </div>
  );
};
