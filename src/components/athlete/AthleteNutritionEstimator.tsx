import React, { useState, useMemo, useEffect } from 'react';
import {
  Flame,
  Activity,
  Sparkles,
  PieChart,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAthletes } from '../../context/AthletesContext';
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
}

export const AthleteNutritionEstimator: React.FC<AthleteNutritionEstimatorProps> = ({
  initialWeight,
  initialHeight,
  initialGender,
  initialAge,
  initialBodyFat,
}) => {
  const { user } = useAuth();
  const { athletes } = useAthletes();

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

  // Form State Atleta
  const [gender, setGender] = useState<Gender>(initialGender || 'male');
  const [weightKg, setWeightKg] = useState<number>(initialWeight || 70);
  const [heightCm, setHeightCm] = useState<number>(initialHeight || 175);
  const [age, setAge] = useState<number>(initialAge || 26);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [bodyFatPercent, setBodyFatPercent] = useState<string>(initialBodyFat ? String(initialBodyFat) : '');
  const [goal, setGoal] = useState<NutritionGoal>('maintenance');
  
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
      formula: hasValidBodyFat ? 'katch_mcardle' : 'mifflin_st_jeor',
    };
    return calculateNutritionEstimates(input);
  }, [gender, weightKg, heightCm, age, activityLevel, parsedBodyFat, hasValidBodyFat, goal]);

  // ─── SCHERMATA PRELIMINARE: GATE DISCLAIMER ROSSO ───
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
            Istruzioni per il Calcolo
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed font-medium">
            {NUTRITION_GUIDE_TEXT}
          </p>
        </div>
      </div>

      {/* Parametri Input Atleta */}
      <div className="bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--color-primary)]" />
            I Tuoi Dati Corporei
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

      {/* Risultati Calcolo & Macro */}
      <div className="bg-gradient-to-br from-slate-900/90 to-slate-950 border border-slate-800/90 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--color-primary)]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-primary)] block">
              Fabbisogno Giornaliero Stimato
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white font-mono mt-0.5">
              {results.targetKcal.toLocaleString('it-IT')} <span className="text-sm font-sans font-bold text-slate-400">kcal / giorno</span>
            </h2>
          </div>

          <div className="px-3 py-1.5 rounded-2xl bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30 text-[var(--color-primary)] text-xs font-black uppercase tracking-wider">
            {GOAL_OFFSETS[goal].label}
          </div>
        </div>

        {/* BMR vs TDEE */}
        <div className="grid grid-cols-2 gap-3">
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

        {/* Macronutrienti Consigliati */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <PieChart className="w-4 h-4 text-[var(--color-primary)]" />
              Macronutrienti Consigliati
            </span>
            <span className="text-[10px] font-mono font-bold text-slate-400">
              2.0g/kg Pro • 0.9g/kg Fat
            </span>
          </div>

          {/* Barra grafica */}
          <div className="w-full h-3 rounded-full bg-slate-950 overflow-hidden flex border border-slate-800">
            <div className="h-full bg-rose-500" style={{ width: `${results.macros.proteinPercent}%` }} />
            <div className="h-full bg-amber-400" style={{ width: `${results.macros.fatPercent}%` }} />
            <div className="h-full bg-sky-400" style={{ width: `${results.macros.carbPercent}%` }} />
          </div>

          {/* 3 Card Macro */}
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            {/* Proteine */}
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center space-y-0.5">
              <span className="text-[10px] font-black uppercase text-rose-400 block">🥩 Proteine</span>
              <div className="text-xl font-black font-mono text-white">
                {results.macros.proteinGrams}<span className="text-xs font-sans text-rose-300 font-bold">g</span>
              </div>
              <span className="text-[9px] text-slate-400 font-mono block">2.0 g/kg</span>
            </div>

            {/* Grassi */}
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-0.5">
              <span className="text-[10px] font-black uppercase text-amber-400 block">🥑 Grassi</span>
              <div className="text-xl font-black font-mono text-white">
                {results.macros.fatGrams}<span className="text-xs font-sans text-amber-300 font-bold">g</span>
              </div>
              <span className="text-[9px] text-slate-400 font-mono block">0.9 g/kg</span>
            </div>

            {/* Carboidrati */}
            <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-center space-y-0.5">
              <span className="text-[10px] font-black uppercase text-sky-400 block">🍚 Carboidrati</span>
              <div className="text-xl font-black font-mono text-white">
                {results.macros.carbGrams}<span className="text-xs font-sans text-sky-300 font-bold">g</span>
              </div>
              <span className="text-[9px] text-slate-400 font-mono block">{results.macros.carbGramsPerKg} g/kg</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
