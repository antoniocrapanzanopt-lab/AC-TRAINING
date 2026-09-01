import React from 'react';
import { Moon, Zap, Activity, Wine, Minus, Plus } from 'lucide-react';
import {
  OnboardingQuestionnaireData,
  SleepQuality,
  EnergyTrend,
  SmokeAlcoholHabit,
} from '../../../types/questionnaire';

interface StepProps {
  data: OnboardingQuestionnaireData;
  onChange: (updates: Partial<OnboardingQuestionnaireData>) => void;
}

export const Step4LifestyleRecovery: React.FC<StepProps> = ({ data, onChange }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Intestazione */}
      <div className="border-b border-slate-800/80 pb-4">
        <h3 className="text-lg font-black text-white flex items-center gap-2">
          <Moon className="w-5 h-5 text-[var(--color-primary)]" /> 4. Stile di Vita, Sonno & Recupero
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          La capacità di recupero e i ritmi quotidiani determinano il volume allenante sostenibile.
        </p>
      </div>

      {/* 1. Ore di Sonno a Notte */}
      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Moon className="w-4 h-4 text-[var(--color-primary)]" /> Ore Medie di Sonno per Notte <span className="text-[var(--color-primary)]">*</span>
          </label>
          <span className="text-lg font-black text-[var(--color-primary)] font-mono">
            {data.sleepHours} ore / notte
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChange({ sleepHours: Math.max(4, Number((data.sleepHours - 0.5).toFixed(1))) })}
            className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 text-white flex items-center justify-center font-bold hover:bg-slate-800 cursor-pointer active:scale-95"
          >
            <Minus className="w-4 h-4" />
          </button>
          <input
            type="range"
            min="4"
            max="10"
            step="0.5"
            value={data.sleepHours}
            onChange={(e) => onChange({ sleepHours: Number(e.target.value) })}
            className="w-full accent-[var(--color-primary)] cursor-pointer"
          />
          <button
            type="button"
            onClick={() => onChange({ sleepHours: Math.min(12, Number((data.sleepHours + 0.5).toFixed(1))) })}
            className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 text-white flex items-center justify-center font-bold hover:bg-slate-800 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Qualità del Sonno */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
          Qualità del Riposo Notturno <span className="text-[var(--color-primary)]">*</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            { id: 'pessimo', icon: '🥱', label: 'Pessimo', desc: 'Risvegli continui' },
            { id: 'discontinuo', icon: '😐', label: 'Discontinuo', desc: 'Sonnolenza diurna' },
            { id: 'buono', icon: '😊', label: 'Buono', desc: 'Riposo regolare' },
            { id: 'eccellente', icon: '⚡', label: 'Eccellente', desc: 'Sveglio al 100%' },
          ].map((item) => {
            const isSelected = data.sleepQuality === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChange({ sleepQuality: item.id as SleepQuality })}
                className={`p-3 rounded-2xl border text-center font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--color-primary)]/15 border-[var(--color-primary)] text-white shadow-md ring-1 ring-[var(--color-primary)]/30'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="text-xl block mb-1">{item.icon}</span>
                <span className={`block text-xs font-bold ${isSelected ? 'text-[var(--color-primary)]' : 'text-slate-200'}`}>
                  {item.label}
                </span>
                <span className="block text-[10px] text-slate-500 mt-0.5">{item.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Livello di Stress Quotidiano (1-10) */}
      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-slate-400" /> Livello di Stress Quotidiano (1-10) <span className="text-[var(--color-primary)]">*</span>
          </label>
          <span
            className={`text-sm font-black px-2.5 py-0.5 rounded-full ${
              data.dailyStressLevel >= 8
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : data.dailyStressLevel >= 5
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {data.dailyStressLevel} / 10
          </span>
        </div>

        <div className="grid grid-cols-10 gap-1 sm:gap-2">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((val) => {
            const isSelected = data.dailyStressLevel === val;
            return (
              <button
                key={val}
                type="button"
                onClick={() => onChange({ dailyStressLevel: val })}
                className={`py-2.5 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                  isSelected
                    ? val >= 8
                      ? 'bg-red-600 text-white border-red-500 shadow-md'
                      : val >= 5
                      ? 'bg-amber-500 text-black border-amber-400 shadow-md'
                      : 'bg-emerald-500 text-black border-emerald-400 shadow-md'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                {val}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Energia durante il Giorno & Fumo/Alcol */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Andamento Energia */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-400" /> Andamento Energia nel Giorno
          </label>
          <select
            value={data.energyDuringDay}
            onChange={(e) => onChange({ energyDuringDay: e.target.value as EnergyTrend })}
            className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white font-bold text-xs focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
          >
            <option value="stabile">⚡ Stabile ed energetico tutto il giorno</option>
            <option value="calo_pomeridiano">😴 Calo marcato dopo pranzo</option>
            <option value="piu_mattina">🌅 Molta energia al mattino, stanco la sera</option>
            <option value="piu_sera">🌙 Più attivo e lucido dal tardo pomeriggio in poi</option>
          </select>
        </div>

        {/* Fumo & Alcol */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Wine className="w-4 h-4 text-purple-400" /> Fumo & Alcol
          </label>
          <select
            value={data.habitsSmokeAlcohol}
            onChange={(e) => onChange({ habitsSmokeAlcohol: e.target.value as SmokeAlcoholHabit })}
            className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white font-bold text-xs focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
          >
            <option value="nessuna">🌿 Nessuna abitudine (Non fumo, non bevo)</option>
            <option value="alcol_occasionale">🍷 Consumo occasionale / sociale di alcol</option>
            <option value="fumo_regolare">🚬 Fumatore regolare</option>
            <option value="entrambi">⚠️ Sia fumo che consumo alcolico abituale</option>
          </select>
        </div>
      </div>
    </div>
  );
};
