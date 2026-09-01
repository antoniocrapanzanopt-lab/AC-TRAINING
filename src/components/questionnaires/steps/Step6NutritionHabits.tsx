import React from 'react';
import { Utensils, Droplets, Check, Pill } from 'lucide-react';
import {
  OnboardingQuestionnaireData,
  MealsPerDay,
  BreakfastHabit,
  CalorieTrackingPrecision,
  DietaryRegime,
  WaterIntakeLiters,
} from '../../../types/questionnaire';

interface StepProps {
  data: OnboardingQuestionnaireData;
  onChange: (updates: Partial<OnboardingQuestionnaireData>) => void;
}

const ALLERGIES_LIST = [
  'Lattosio',
  'Glutine / Celiachia',
  'Frutta a guscio / Noci',
  'Crostacei / Molluschi',
  'Uova',
  'Nichel',
  'Soia',
];

const SUPPLEMENTS_LIST = [
  'Proteine in polvere (Whey / Isolate / Veg)',
  'Creatina Monoidrato',
  'Omega-3',
  'Multivitaminico / Vitamina D',
  'Caffeina / Pre-workout',
  'Magnesio / Elettroliti',
  'Melatonina',
];

export const Step6NutritionHabits: React.FC<StepProps> = ({ data, onChange }) => {
  const toggleAllergy = (item: string) => {
    const current = data.foodAllergiesIntolerances || [];
    const updated = current.includes(item)
      ? current.filter((i) => i !== item)
      : [...current, item];
    onChange({ foodAllergiesIntolerances: updated });
  };

  const toggleSupplement = (item: string) => {
    const current = data.currentSupplements || [];
    const updated = current.includes(item)
      ? current.filter((i) => i !== item)
      : [...current, item];
    onChange({ currentSupplements: updated });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Intestazione */}
      <div className="border-b border-slate-800/80 pb-4">
        <h3 className="text-lg font-black text-white flex items-center gap-2">
          <Utensils className="w-5 h-5 text-[var(--color-primary)]" /> 6. Nutrizione & Abitudini Alimentari
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Identifica la tua routine alimentare, la frequenza dei pasti e il livello di precisione con cui gestisci il cibo.
        </p>
      </div>

      {/* 1. Pasti al Giorno & Colazione */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Pasti al Giorno */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
            Quanti pasti consumi al giorno? <span className="text-[var(--color-primary)]">*</span>
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[2, 3, 4, 5].map((count) => {
              const isSelected = data.mealsPerDay === count;
              return (
                <button
                  key={count}
                  type="button"
                  onClick={() => onChange({ mealsPerDay: count as MealsPerDay })}
                  className={`py-2.5 rounded-xl border text-center font-black text-xs transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--color-primary)] text-black border-[var(--color-primary)] shadow-sm'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {count} pasti
                </button>
              );
            })}
          </div>
        </div>

        {/* Colazione */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
            Abitudine Colazione <span className="text-[var(--color-primary)]">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'dolce', label: '🥐 Dolce' },
              { id: 'salata', label: '🍳 Salata' },
              { id: 'solo_caffe', label: '☕ Solo Caffè' },
              { id: 'digiuno', label: '⏳ Digiuno' },
            ].map((item) => {
              const isSelected = data.breakfastHabit === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChange({ breakfastHabit: item.id as BreakfastHabit })}
                  className={`py-2.5 px-3 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--color-primary)]/15 border-[var(--color-primary)] text-[var(--color-primary)] shadow-sm'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Tracciamento Calorie con App (Condizionale) */}
      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-slate-200 block">
              Utilizzi o hai usato app contacalorie (es. MyFitnessPal)? <span className="text-[var(--color-primary)]">*</span>
            </label>
            <span className="text-[11px] text-slate-400">Tracciamento di calorie e macronutrienti giornalieri</span>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => onChange({ calorieTracking: false, calorieTrackingDetails: undefined })}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                !data.calorieTracking
                  ? 'bg-slate-800 text-slate-300 shadow'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              No
            </button>
            <button
              type="button"
              onClick={() =>
                onChange({
                  calorieTracking: true,
                  calorieTrackingDetails: { appUsed: 'MyFitnessPal', precision: 'al_grammo' },
                })
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                data.calorieTracking
                  ? 'bg-[var(--color-primary)] text-black shadow'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Sì 📱
            </button>
          </div>
        </div>

        {/* Dettaglio Condizionale Tracciamento */}
        {data.calorieTracking && (
          <div className="pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in duration-200">
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Quale app utilizzi?</label>
              <input
                type="text"
                value={data.calorieTrackingDetails?.appUsed || ''}
                onChange={(e) =>
                  onChange({
                    calorieTrackingDetails: {
                      ...data.calorieTrackingDetails,
                      appUsed: e.target.value,
                    },
                  })
                }
                placeholder="es. MyFitnessPal, MacroFactor, Yazio..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Livello di Accuratezza</label>
              <select
                value={data.calorieTrackingDetails?.precision || 'al_grammo'}
                onChange={(e) =>
                  onChange({
                    calorieTrackingDetails: {
                      ...data.calorieTrackingDetails,
                      precision: e.target.value as CalorieTrackingPrecision,
                    },
                  })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold text-xs focus:outline-none focus:border-[var(--color-primary)]"
              >
                <option value="al_grammo">⚖️ Peso tutto con la bilancia al grammo</option>
                <option value="approssimativo">👁️ Traccio porzioni a occhio</option>
                <option value="solo_passato_a_occhio">⏳ Ho tracciato in passato, ora vado a sensazione</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* 3. Regime Alimentare & Acqua */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Regime */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
            Regime Alimentare <span className="text-[var(--color-primary)]">*</span>
          </label>
          <select
            value={data.dietaryRegime}
            onChange={(e) => onChange({ dietaryRegime: e.target.value as DietaryRegime })}
            className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white font-bold text-xs focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
          >
            <option value="onnivoro">🥩 Onnivoro (Mangio di tutto)</option>
            <option value="flessibile">🍕 Flessibile / IIFYM</option>
            <option value="vegetariano">🥗 Vegetariano (No carne/pesce)</option>
            <option value="vegano">🌱 Vegano (Solo 100% vegetale)</option>
            <option value="pescatariano">🐟 Pescatariano</option>
            <option value="chetogenico_lowcarb">🥑 Chetogenico / Low Carb</option>
          </select>
        </div>

        {/* Consumo Acqua */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Droplets className="w-4 h-4 text-sky-400" /> Acqua Bevuta al Giorno
          </label>
          <select
            value={data.waterIntake}
            onChange={(e) => onChange({ waterIntake: e.target.value as WaterIntakeLiters })}
            className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white font-bold text-xs focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
          >
            <option value="meno_1_5L">💧 Meno di 1.5 Litri (Bevo poco)</option>
            <option value="1_5_2_5L">💧 1.5 - 2.5 Litri (Standard)</option>
            <option value="2_5_3_5L">💧 2.5 - 3.5 Litri (Buona idratazione)</option>
            <option value="piu_3_5L">💧 Oltre 3.5 Litri (Molto idratato)</option>
          </select>
        </div>
      </div>

      {/* 4. Intolleranze & Allergie (Multi-Chip) */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
          Allergie o Intolleranze Diagnosticate (Seleziona tutto ciò che si applica)
        </label>
        <div className="flex flex-wrap gap-2">
          {ALLERGIES_LIST.map((item) => {
            const isSelected = (data.foodAllergiesIntolerances || []).includes(item);
            return (
              <button
                key={item}
                type="button"
                onClick={() => toggleAllergy(item)}
                className={`py-1.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-red-950/80 border-red-600 text-red-200 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                {isSelected && <Check className="w-3 h-3 text-red-400" />}
                {item}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Integratori in Uso */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Pill className="w-4 h-4 text-emerald-400" /> Integratori Assunti Abitualmente
        </label>
        <div className="flex flex-wrap gap-2">
          {SUPPLEMENTS_LIST.map((item) => {
            const isSelected = (data.currentSupplements || []).includes(item);
            return (
              <button
                key={item}
                type="button"
                onClick={() => toggleSupplement(item)}
                className={`py-1.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-emerald-950/80 border-emerald-600 text-emerald-200 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                {isSelected && <Check className="w-3 h-3 text-emerald-400" />}
                {item}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
