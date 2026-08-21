import React, { useState } from 'react';
import {
  Sliders,
  Sparkles,
  RefreshCw,
  Flame,
  Info,
} from 'lucide-react';
import { MacroValues, NutritionGoal } from '../../types/nutrition';

interface MacroEditorProps {
  values: MacroValues;
  weightKg?: number;
  mode: 'auto' | 'manual';
  goal?: NutritionGoal;
  onChange: (newValues: MacroValues, newMode: 'auto' | 'manual') => void;
  disabled?: boolean;
}

type EditUnit = 'grams' | 'g_kg' | 'percent';

export const MacroEditor: React.FC<MacroEditorProps> = ({
  values,
  weightKg = 75,
  mode,
  goal = 'maintenance',
  onChange,
  disabled = false,
}) => {
  const [editUnit, setEditUnit] = useState<EditUnit>('grams');

  // Calcoli derivati
  const proteinKcal = values.proteinGrams * 4;
  const carbKcal = values.carbGrams * 4;
  const fatKcal = values.fatGrams * 9;
  const calculatedTotalKcal = proteinKcal + carbKcal + fatKcal;

  const proteinPercent = calculatedTotalKcal > 0 ? Math.round((proteinKcal / calculatedTotalKcal) * 100) : 30;
  const carbPercent = calculatedTotalKcal > 0 ? Math.round((carbKcal / calculatedTotalKcal) * 100) : 45;
  const fatPercent = calculatedTotalKcal > 0 ? Math.max(0, 100 - proteinPercent - carbPercent) : 25;

  const proteinGPerKg = weightKg > 0 ? (values.proteinGrams / weightKg).toFixed(2) : '2.0';
  const carbGPerKg = weightKg > 0 ? (values.carbGrams / weightKg).toFixed(2) : '3.5';
  const fatGPerKg = weightKg > 0 ? (values.fatGrams / weightKg).toFixed(2) : '0.9';

  // Handler per cambio grammi diretto
  const handleGramChange = (macro: 'protein' | 'carb' | 'fat', grams: number) => {
    const validGrams = Math.max(0, Math.round(grams));
    let newValues: MacroValues;

    if (macro === 'protein') {
      newValues = {
        ...values,
        proteinGrams: validGrams,
        targetKcal: validGrams * 4 + values.carbGrams * 4 + values.fatGrams * 9,
      };
    } else if (macro === 'carb') {
      newValues = {
        ...values,
        carbGrams: validGrams,
        targetKcal: values.proteinGrams * 4 + validGrams * 4 + values.fatGrams * 9,
      };
    } else {
      newValues = {
        ...values,
        fatGrams: validGrams,
        targetKcal: values.proteinGrams * 4 + values.carbGrams * 4 + validGrams * 9,
      };
    }

    onChange(newValues, 'manual');
  };

  // Handler per cambio g/kg
  const handleGPerKgChange = (macro: 'protein' | 'carb' | 'fat', gPerKg: number) => {
    const grams = Math.round(gPerKg * weightKg);
    handleGramChange(macro, grams);
  };

  // Handler per cambio percentuale
  const handlePercentChange = (macro: 'protein' | 'carb' | 'fat', pct: number) => {
    const targetKcal = values.targetKcal || calculatedTotalKcal || 2000;
    const kcalForMacro = (targetKcal * pct) / 100;
    const grams = macro === 'fat' ? Math.round(kcalForMacro / 9) : Math.round(kcalForMacro / 4);
    handleGramChange(macro, grams);
  };

  // Ripristina bilanciamento automatico standard
  const handleResetAuto = () => {
    const kcal = values.targetKcal || 2000;
    let pGrams = Math.round(weightKg * (goal === 'cutting' ? 2.2 : goal === 'bulking' ? 1.8 : 2.0));
    let fGrams = Math.round(weightKg * 0.9);
    let remainingKcal = Math.max(0, kcal - (pGrams * 4 + fGrams * 9));
    let cGrams = Math.round(remainingKcal / 4);

    onChange({
      targetKcal: kcal,
      proteinGrams: pGrams,
      carbGrams: cGrams,
      fatGrams: fGrams,
    }, 'auto');
  };

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-6">
      
      {/* Header Modalità Auto / Manuale */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[var(--color-primary)]" />
            Ripartizione Macronutrienti & Calorie
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Personalizza l'apporto in grammi, g/kg o percentuale calorica.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Modalità */}
          <div className="inline-flex p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                if (mode !== 'auto') handleResetAuto();
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                mode === 'auto'
                  ? 'bg-[var(--color-primary)] text-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Bilanciamento Auto
              </span>
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(values, 'manual')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                mode === 'manual'
                  ? 'bg-[var(--color-primary)] text-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" /> Modifica Manuale
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Target Calorie Totali Risultanti */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)] shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Calorie Totali Giornaliere
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white tracking-tight">
                {calculatedTotalKcal} <span className="text-xs text-[var(--color-primary)] font-bold">kcal</span>
              </span>
              {mode === 'manual' && values.targetKcal !== calculatedTotalKcal && (
                <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                  Ricalcolate dai macro
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Selettore Unità di Modifica */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          <span className="text-[10px] font-bold text-slate-500 px-2 uppercase">Modifica in:</span>
          <button
            type="button"
            onClick={() => setEditUnit('grams')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              editUnit === 'grams' ? 'bg-slate-800 text-[var(--color-primary)] border border-slate-700' : 'text-slate-400 hover:text-white'
            }`}
          >
            Grammi (g)
          </button>
          <button
            type="button"
            onClick={() => setEditUnit('g_kg')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              editUnit === 'g_kg' ? 'bg-slate-800 text-[var(--color-primary)] border border-slate-700' : 'text-slate-400 hover:text-white'
            }`}
          >
            g / kg
          </button>
          <button
            type="button"
            onClick={() => setEditUnit('percent')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              editUnit === 'percent' ? 'bg-slate-800 text-[var(--color-primary)] border border-slate-700' : 'text-slate-400 hover:text-white'
            }`}
          >
            Percentuale (%)
          </button>
        </div>
      </div>

      {/* Barra Visiva Distribuzione Macro */}
      <div className="space-y-1.5">
        <div className="h-3.5 w-full bg-slate-900 rounded-full overflow-hidden flex shadow-inner border border-slate-800">
          <div
            style={{ width: `${proteinPercent}%` }}
            className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-all duration-300"
            title={`Proteine: ${values.proteinGrams}g (${proteinPercent}%)`}
          />
          <div
            style={{ width: `${carbPercent}%` }}
            className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-300"
            title={`Carboidrati: ${values.carbGrams}g (${carbPercent}%)`}
          />
          <div
            style={{ width: `${fatPercent}%` }}
            className="h-full bg-gradient-to-r from-rose-500 to-pink-500 transition-all duration-300"
            title={`Grassi: ${values.fatGrams}g (${fatPercent}%)`}
          />
        </div>

        <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 px-1">
          <span className="text-cyan-400">Proteine: {proteinPercent}% ({proteinKcal} kcal)</span>
          <span className="text-amber-400">Carboidrati: {carbPercent}% ({carbKcal} kcal)</span>
          <span className="text-rose-400">Grassi: {fatPercent}% ({fatKcal} kcal)</span>
        </div>
      </div>

      {/* 3 Card Macro Editabili */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* PROTEINE */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-sky-500/30 space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
              Proteine
            </span>
            <span className="text-[10px] font-bold text-slate-400">{proteinGPerKg} g/kg</span>
          </div>

          <div className="space-y-2">
            {editUnit === 'grams' ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="400"
                  disabled={disabled}
                  value={values.proteinGrams === 0 ? '' : values.proteinGrams}
                  onFocus={(e) => { if (values.proteinGrams === 0) e.target.select(); }}
                  onChange={(e) => handleGramChange('protein', e.target.value === '' ? 0 : Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-black text-lg focus:outline-none focus:border-sky-400 transition-colors"
                />
                <span className="text-xs font-bold text-slate-400 shrink-0">g</span>
              </div>
            ) : editUnit === 'g_kg' ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="0.8"
                  max="4.0"
                  disabled={disabled}
                  value={proteinGPerKg === '0.00' || proteinGPerKg === '0' ? '' : proteinGPerKg}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => handleGPerKgChange('protein', e.target.value === '' ? 0 : Number(e.target.value))}
                  placeholder="0.0"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-black text-lg focus:outline-none focus:border-sky-400 transition-colors"
                />
                <span className="text-xs font-bold text-slate-400 shrink-0">g/kg</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  disabled={disabled}
                  value={proteinPercent === 0 ? '' : proteinPercent}
                  onFocus={(e) => { if (proteinPercent === 0) e.target.select(); }}
                  onChange={(e) => handlePercentChange('protein', e.target.value === '' ? 0 : Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-black text-lg focus:outline-none focus:border-sky-400 transition-colors"
                />
                <span className="text-xs font-bold text-slate-400 shrink-0">%</span>
              </div>
            )}

            <div className="flex justify-between text-[11px] text-slate-400 pt-1">
              <span>{values.proteinGrams}g totali</span>
              <span>{proteinKcal} kcal</span>
            </div>
          </div>
        </div>

        {/* CARBOIDRATI */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-amber-500/30 space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
              Carboidrati
            </span>
            <span className="text-[10px] font-bold text-slate-400">{carbGPerKg} g/kg</span>
          </div>

          <div className="space-y-2">
            {editUnit === 'grams' ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="800"
                  disabled={disabled}
                  value={values.carbGrams === 0 ? '' : values.carbGrams}
                  onFocus={(e) => { if (values.carbGrams === 0) e.target.select(); }}
                  onChange={(e) => handleGramChange('carb', e.target.value === '' ? 0 : Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-black text-lg focus:outline-none focus:border-amber-400 transition-colors"
                />
                <span className="text-xs font-bold text-slate-400 shrink-0">g</span>
              </div>
            ) : editUnit === 'g_kg' ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="10.0"
                  disabled={disabled}
                  value={carbGPerKg === '0.00' || carbGPerKg === '0' ? '' : carbGPerKg}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => handleGPerKgChange('carb', e.target.value === '' ? 0 : Number(e.target.value))}
                  placeholder="0.0"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-black text-lg focus:outline-none focus:border-amber-400 transition-colors"
                />
                <span className="text-xs font-bold text-slate-400 shrink-0">g/kg</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  disabled={disabled}
                  value={carbPercent === 0 ? '' : carbPercent}
                  onFocus={(e) => { if (carbPercent === 0) e.target.select(); }}
                  onChange={(e) => handlePercentChange('carb', e.target.value === '' ? 0 : Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-black text-lg focus:outline-none focus:border-amber-400 transition-colors"
                />
                <span className="text-xs font-bold text-slate-400 shrink-0">%</span>
              </div>
            )}

            <div className="flex justify-between text-[11px] text-slate-400 pt-1">
              <span>{values.carbGrams}g totali</span>
              <span>{carbKcal} kcal</span>
            </div>
          </div>
        </div>

        {/* GRASSI */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-rose-500/30 space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" />
              Grassi (Lipidi)
            </span>
            <span className="text-[10px] font-bold text-slate-400">{fatGPerKg} g/kg</span>
          </div>

          <div className="space-y-2">
            {editUnit === 'grams' ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="250"
                  disabled={disabled}
                  value={values.fatGrams === 0 ? '' : values.fatGrams}
                  onFocus={(e) => { if (values.fatGrams === 0) e.target.select(); }}
                  onChange={(e) => handleGramChange('fat', e.target.value === '' ? 0 : Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-black text-lg focus:outline-none focus:border-rose-400 transition-colors"
                />
                <span className="text-xs font-bold text-slate-400 shrink-0">g</span>
              </div>
            ) : editUnit === 'g_kg' ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.05"
                  min="0.3"
                  max="3.0"
                  disabled={disabled}
                  value={fatGPerKg === '0.00' || fatGPerKg === '0' ? '' : fatGPerKg}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => handleGPerKgChange('fat', e.target.value === '' ? 0 : Number(e.target.value))}
                  placeholder="0.0"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-black text-lg focus:outline-none focus:border-rose-400 transition-colors"
                />
                <span className="text-xs font-bold text-slate-400 shrink-0">g/kg</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  disabled={disabled}
                  value={fatPercent === 0 ? '' : fatPercent}
                  onFocus={(e) => { if (fatPercent === 0) e.target.select(); }}
                  onChange={(e) => handlePercentChange('fat', e.target.value === '' ? 0 : Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-black text-lg focus:outline-none focus:border-rose-400 transition-colors"
                />
                <span className="text-xs font-bold text-slate-400 shrink-0">%</span>
              </div>
            )}

            <div className="flex justify-between text-[11px] text-slate-400 pt-1">
              <span>{values.fatGrams}g totali</span>
              <span>{fatKcal} kcal</span>
            </div>
          </div>
        </div>

      </div>

      {mode === 'manual' && (
        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
          <span className="flex items-center gap-1.5 text-amber-400 font-bold">
            <Info className="w-3.5 h-3.5" />
            Modalità manuale attiva: le modifiche verranno registrate nello storico revisioni del piano.
          </span>
          <button
            type="button"
            onClick={handleResetAuto}
            className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1 font-bold cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" /> Ricalcola automatico
          </button>
        </div>
      )}
    </div>
  );
};
