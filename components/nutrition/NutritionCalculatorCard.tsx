import React, { useState, useMemo } from 'react';
import {
  Flame, Activity, Target, Save, Sparkles, Zap
} from 'lucide-react';
import { Athlete, ActivityLevel, NutritionGoal, NutritionPlan } from '../../types';
import {
  ACTIVITY_LEVEL_OPTIONS,
  GOAL_OPTIONS,
  calculateNutritionPlan,
} from '../../services/nutritionService';

interface NutritionCalculatorCardProps {
  athlete: Athlete;
  onSavePlan?: (plan: NutritionPlan) => void;
  readOnly?: boolean;
}

export const NutritionCalculatorCard: React.FC<NutritionCalculatorCardProps> = ({
  athlete,
  onSavePlan,
  readOnly = false,
}) => {
  // Stima età da data di nascita se disponibile
  const calculatedAge = useMemo(() => {
    if (!athlete.dateOfBirth) return 25;
    const dob = new Date(athlete.dateOfBirth);
    if (isNaN(dob.getTime())) return 25;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age > 0 ? age : 25;
  }, [athlete.dateOfBirth]);

  const existingPlan = athlete.nutritionPlan;

  // Stai in stato locale con i valori del piano esistente o predefiniti dagli antropometrici dell'atleta
  const [sex, setSex] = useState<'male' | 'female'>(existingPlan?.sex || 'male');
  const [ageYears, setAgeYears] = useState<number>(existingPlan?.ageYears || calculatedAge);
  const [weightKg, setWeightKg] = useState<number>(
    existingPlan?.weightKg || athlete.anthropometrics?.weightKg || 75
  );
  const [heightCm, setHeightCm] = useState<number>(
    existingPlan?.heightCm || athlete.anthropometrics?.heightCm || 175
  );
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    existingPlan?.activityLevel || 'moderatamente_attivo'
  );
  const [goal, setGoal] = useState<NutritionGoal>(existingPlan?.goal || 'massa');
  const [customSurplus, setCustomSurplus] = useState<number>(
    existingPlan?.surplusDeficitPercent !== undefined ? existingPlan.surplusDeficitPercent : 10
  );
  const [notes, setNotes] = useState<string>(existingPlan?.notes || '');
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Calcolo dinamico in tempo reale
  const calculatedPlan = useMemo(() => {
    return calculateNutritionPlan({
      sex,
      weightKg,
      heightCm,
      ageYears,
      activityLevel,
      goal,
      customSurplusDeficitPercent: customSurplus,
      notes,
    });
  }, [sex, weightKg, heightCm, ageYears, activityLevel, goal, customSurplus, notes]);

  const handleGoalChange = (newGoal: NutritionGoal) => {
    setGoal(newGoal);
    const defaultPercent = GOAL_OPTIONS.find((g) => g.id === newGoal)?.defaultPercent || 0;
    setCustomSurplus(defaultPercent);
    setIsSaved(false);
  };

  const handleSave = () => {
    if (onSavePlan) {
      onSavePlan(calculatedPlan);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header Schermata */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[var(--color-primary)]">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Nutrition Calculator Engine
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-[var(--color-primary)] border border-amber-500/20 font-medium">
                  Mifflin-St Jeor
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Calcolo BMR, TDEE e ripartizione automatica macronutrienti target
              </p>
            </div>
          </div>
        </div>

        {!readOnly && onSavePlan && (
          <button
            onClick={handleSave}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md ${
              isSaved
                ? 'bg-emerald-600 text-white'
                : 'bg-[var(--color-primary)] hover:bg-amber-500 text-slate-950 shadow-amber-500/20'
            }`}
          >
            <Save className="w-4 h-4" />
            {isSaved ? 'Piano Nutrizionale Salvato!' : 'Salva Piano Nutrizionale'}
          </button>
        )}
      </div>

      {/* Form di Input Parametri */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sesso */}
        <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Sesso Biologico
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={readOnly}
              onClick={() => { setSex('male'); setIsSaved(false); }}
              className={`py-2 px-3 text-xs font-medium rounded-lg border transition-all ${
                sex === 'male'
                  ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-semibold'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              Uomo (+5)
            </button>
            <button
              type="button"
              disabled={readOnly}
              onClick={() => { setSex('female'); setIsSaved(false); }}
              className={`py-2 px-3 text-xs font-medium rounded-lg border transition-all ${
                sex === 'female'
                  ? 'bg-pink-500/20 border-pink-500 text-pink-300 font-semibold'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              Donna (-161)
            </button>
          </div>
        </div>

        {/* Peso (kg) */}
        <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Peso Corporeo (kg)
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.5"
              disabled={readOnly}
              value={weightKg}
              onChange={(e) => { setWeightKg(parseFloat(e.target.value) || 0); setIsSaved(false); }}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[var(--color-primary)]"
            />
            <span className="absolute right-3 top-2 text-xs text-slate-500 font-medium">kg</span>
          </div>
        </div>

        {/* Altezza (cm) */}
        <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Altezza (cm)
          </label>
          <div className="relative">
            <input
              type="number"
              step="1"
              disabled={readOnly}
              value={heightCm}
              onChange={(e) => { setHeightCm(parseInt(e.target.value, 10) || 0); setIsSaved(false); }}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[var(--color-primary)]"
            />
            <span className="absolute right-3 top-2 text-xs text-slate-500 font-medium">cm</span>
          </div>
        </div>

        {/* Età */}
        <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Età (Anni)
          </label>
          <div className="relative">
            <input
              type="number"
              step="1"
              disabled={readOnly}
              value={ageYears}
              onChange={(e) => { setAgeYears(parseInt(e.target.value, 10) || 0); setIsSaved(false); }}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[var(--color-primary)]"
            />
            <span className="absolute right-3 top-2 text-xs text-slate-500 font-medium">anni</span>
          </div>
        </div>
      </div>

      {/* Livello Attività & Obiettivo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Livello Attività */}
        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-2">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Livello Attività Fisica (Moltiplicatore TDEE)
          </label>
          <select
            disabled={readOnly}
            value={activityLevel}
            onChange={(e) => { setActivityLevel(e.target.value as ActivityLevel); setIsSaved(false); }}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--color-primary)]"
          >
            {ACTIVITY_LEVEL_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label} ({opt.multiplier}x) — {opt.description}
              </option>
            ))}
          </select>
        </div>

        {/* Obiettivo Nutrizionale */}
        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-2">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Obiettivo Nutrizionale
          </label>
          <div className="grid grid-cols-3 gap-2">
            {GOAL_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                disabled={readOnly}
                onClick={() => handleGoalChange(opt.id)}
                className={`py-2 px-2 text-xs font-semibold rounded-lg border text-center transition-all ${
                  goal === opt.id
                    ? 'bg-[var(--color-primary)]/20 border-[var(--color-primary)] text-[var(--color-primary)] shadow-sm'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Regolazione Surplus / Deficit % */}
      <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            Variazione Calorica Rispetto al TDEE
          </label>
          <span className="text-sm font-bold text-[var(--color-primary)] bg-amber-500/10 px-3 py-0.5 rounded-full border border-amber-500/20">
            {customSurplus > 0 ? `+${customSurplus}% (Surplus)` : customSurplus < 0 ? `${customSurplus}% (Deficit)` : '0% (Mantenimento)'}
          </span>
        </div>
        <input
          type="range"
          min="-30"
          max="30"
          step="1"
          disabled={readOnly}
          value={customSurplus}
          onChange={(e) => { setCustomSurplus(parseInt(e.target.value, 10)); setIsSaved(false); }}
          className="w-full accent-[var(--color-primary)] bg-slate-800 h-2 rounded-lg cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
          <span>-30% (Deficit Severo)</span>
          <span>-15% (Deficit Cut)</span>
          <span>0% (TDEE Mantenimento)</span>
          <span>+10% (Surplus Massa)</span>
          <span>+30% (Surplus Spinto)</span>
        </div>
      </div>

      {/* PROSPETTO ENERGETICO KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* BMR */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium">BMR (Metabolismo Basale)</span>
            <div className="text-2xl font-black text-white">
              {calculatedPlan.bmr} <span className="text-xs text-slate-400 font-normal">kcal/giorno</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">Mifflin-St Jeor a riposo</p>
          </div>
        </div>

        {/* TDEE */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium">TDEE (Fabbisogno Totale)</span>
            <div className="text-2xl font-black text-white">
              {calculatedPlan.tdee} <span className="text-xs text-slate-400 font-normal">kcal/giorno</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              BMR x {ACTIVITY_LEVEL_OPTIONS.find(a => a.id === activityLevel)?.multiplier || 1.2}
            </p>
          </div>
        </div>

        {/* CALORIE TARGET */}
        <div className="bg-slate-950 p-4 rounded-xl border border-[var(--color-primary)]/40 bg-gradient-to-br from-amber-500/5 to-transparent flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-[var(--color-primary)]">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-amber-300 font-medium uppercase tracking-wider">Calorie Target Die</span>
            <div className="text-2xl font-black text-[var(--color-primary)]">
              {calculatedPlan.targetCalories} <span className="text-xs font-normal text-amber-200/80">kcal/giorno</span>
            </div>
            <p className="text-[10px] text-amber-400/80 mt-0.5">
              {customSurplus > 0 ? `+${customSurplus}% Surplus` : customSurplus < 0 ? `${customSurplus}% Deficit` : 'Mantenimento'}
            </p>
          </div>
        </div>
      </div>

      {/* PROSPETTO MACRONUTRIENTI */}
      <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--color-primary)]" />
            Ripartizione Target Macronutrienti
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            Totale: {calculatedPlan.proteinKcal + calculatedPlan.fatKcal + calculatedPlan.carbsKcal} kcal
          </span>
        </div>

        {/* Visual Progress Bar */}
        <div className="h-4 w-full bg-slate-900 rounded-full overflow-hidden flex border border-slate-800 p-0.5">
          <div
            style={{ width: `${calculatedPlan.proteinPercent}%` }}
            className="h-full bg-sky-500 rounded-l-full transition-all duration-500"
            title={`Proteine ${calculatedPlan.proteinPercent}%`}
          />
          <div
            style={{ width: `${calculatedPlan.fatPercent}%` }}
            className="h-full bg-pink-500 transition-all duration-500"
            title={`Grassi ${calculatedPlan.fatPercent}%`}
          />
          <div
            style={{ width: `${calculatedPlan.carbsPercent}%` }}
            className="h-full bg-[var(--color-primary)] rounded-r-full transition-all duration-500"
            title={`Carboidrati ${calculatedPlan.carbsPercent}%`}
          />
        </div>

        {/* 3 Schede Macro */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* PROTEINE */}
          <div className="bg-slate-900/80 p-4 rounded-xl border border-sky-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">Proteine (2.0 g/kg)</span>
              <span className="text-xs font-mono font-bold text-sky-300 bg-sky-500/20 px-2 py-0.5 rounded">
                {calculatedPlan.proteinPercent}%
              </span>
            </div>
            <div className="text-3xl font-black text-white">
              {calculatedPlan.proteinGrams} <span className="text-sm font-normal text-slate-400">g</span>
            </div>
            <div className="text-xs text-slate-400 flex justify-between font-mono">
              <span>{calculatedPlan.proteinKcal} kcal</span>
              <span>4 kcal/g</span>
            </div>
          </div>

          {/* GRASSI */}
          <div className="bg-slate-900/80 p-4 rounded-xl border border-pink-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-pink-400 uppercase tracking-wider">Grassi (0.9 g/kg)</span>
              <span className="text-xs font-mono font-bold text-pink-300 bg-pink-500/20 px-2 py-0.5 rounded">
                {calculatedPlan.fatPercent}%
              </span>
            </div>
            <div className="text-3xl font-black text-white">
              {calculatedPlan.fatGrams} <span className="text-sm font-normal text-slate-400">g</span>
            </div>
            <div className="text-xs text-slate-400 flex justify-between font-mono">
              <span>{calculatedPlan.fatKcal} kcal</span>
              <span>9 kcal/g</span>
            </div>
          </div>

          {/* CARBOIDRATI */}
          <div className="bg-slate-900/80 p-4 rounded-xl border border-amber-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider">Carboidrati (Residui)</span>
              <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded">
                {calculatedPlan.carbsPercent}%
              </span>
            </div>
            <div className="text-3xl font-black text-white">
              {calculatedPlan.carbsGrams} <span className="text-sm font-normal text-slate-400">g</span>
            </div>
            <div className="text-xs text-slate-400 flex justify-between font-mono">
              <span>{calculatedPlan.carbsKcal} kcal</span>
              <span>4 kcal/g</span>
            </div>
          </div>
        </div>
      </div>

      {/* Note opzionali */}
      {!readOnly && (
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Note & Indicazioni per l'Atleta (es. Integratori, Timing dei pasti)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => { setNotes(e.target.value); setIsSaved(false); }}
            placeholder="Aggiungi indicazioni specifiche sull'integrazione o sulla distribuzione nutrizionale..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[var(--color-primary)]"
          />
        </div>
      )}
    </div>
  );
};
