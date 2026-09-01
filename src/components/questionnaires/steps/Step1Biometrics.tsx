import React from 'react';
import { User, Scale, Ruler, Calendar, Briefcase, Minus, Plus } from 'lucide-react';
import { OnboardingQuestionnaireData, BiometricsGender, OccupationType } from '../../../types/questionnaire';

interface StepProps {
  data: OnboardingQuestionnaireData;
  onChange: (updates: Partial<OnboardingQuestionnaireData>) => void;
}

export const Step1Biometrics: React.FC<StepProps> = ({ data, onChange }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Intestazione Step */}
      <div className="border-b border-slate-800/80 pb-4">
        <h3 className="text-lg font-black text-white flex items-center gap-2">
          <User className="w-5 h-5 text-[var(--color-primary)]" /> 1. Dati Biometrici & Profilo Base
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Questi parametri servono per calcolare il fabbisogno energetico iniziale (BMR/TDEE) e tarare i volumi di lavoro.
        </p>
      </div>

      {/* 1. Sesso Biologico */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          Sesso Biologico <span className="text-[var(--color-primary)]">*</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: 'uomo', label: 'Uomo 🚹' },
            { id: 'donna', label: 'Donna 🚺' },
          ].map((item) => {
            const isSelected = data.gender === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChange({ gender: item.id as BiometricsGender })}
                className={`py-3 px-4 rounded-2xl border text-center font-black text-sm transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--color-primary)]/15 border-[var(--color-primary)] text-[var(--color-primary)] shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900/50'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Data di Nascita */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-slate-400" /> Data di Nascita <span className="text-[var(--color-primary)]">*</span>
        </label>
        <input
          type="date"
          value={data.birthDate}
          max={new Date().toISOString().split('T')[0]}
          onChange={(e) => onChange({ birthDate: e.target.value })}
          className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white font-bold text-sm focus:outline-none focus:border-[var(--color-primary)]"
        />
      </div>

      {/* 3. Altezza & Peso Attuale */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Altezza */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Ruler className="w-4 h-4 text-[var(--color-primary)]" /> Altezza (cm)
            </span>
            <span className="text-lg font-black text-white font-mono">{data.heightCm} cm</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onChange({ heightCm: Math.max(120, data.heightCm - 1) })}
              className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 text-white flex items-center justify-center font-bold hover:bg-slate-800 cursor-pointer active:scale-95"
            >
              <Minus className="w-4 h-4" />
            </button>
            <input
              type="range"
              min="130"
              max="220"
              value={data.heightCm}
              onChange={(e) => onChange({ heightCm: Number(e.target.value) })}
              className="w-full accent-[var(--color-primary)] cursor-pointer"
            />
            <button
              type="button"
              onClick={() => onChange({ heightCm: Math.min(230, data.heightCm + 1) })}
              className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 text-white flex items-center justify-center font-bold hover:bg-slate-800 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Peso Attuale */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-[var(--color-primary)]" /> Peso al Mattino (kg)
            </span>
            <span className="text-lg font-black text-[var(--color-primary)] font-mono">{data.weightKg} kg</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onChange({ weightKg: Math.max(35, Number((data.weightKg - 0.5).toFixed(1))) })}
              className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 text-white flex items-center justify-center font-bold hover:bg-slate-800 cursor-pointer active:scale-95"
            >
              <Minus className="w-4 h-4" />
            </button>
            <input
              type="number"
              step="0.1"
              value={data.weightKg}
              onChange={(e) => onChange({ weightKg: Number(e.target.value) })}
              className="w-full text-center py-2 px-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold text-sm focus:outline-none focus:border-[var(--color-primary)]"
            />
            <button
              type="button"
              onClick={() => onChange({ weightKg: Math.min(220, Number((data.weightKg + 0.5).toFixed(1))) })}
              className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 text-white flex items-center justify-center font-bold hover:bg-slate-800 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Tipologia di Lavoro & NEAT Quotidiano */}
      <div className="space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Briefcase className="w-4 h-4 text-slate-400" /> Tipologia di Attività Lavorativa / Movimento Giornaliero
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              id: 'sedentario',
              title: '🪑 Sedentario d’ufficio',
              desc: 'Molte ore seduto, lavoro al PC (< 5.000 passi/giorno)',
            },
            {
              id: 'moderato',
              title: '🚶 In piedi / Moderato',
              desc: 'Spesso in piedi o in movimento (5.000 - 10.000 passi)',
            },
            {
              id: 'pesante',
              title: '🔨 Lavoro fisico pesante',
              desc: 'Movimentazione carichi, cantieri, magazzino (> 10.000 passi)',
            },
            {
              id: 'turnista',
              title: '🔄 Turnista / Orari variabili',
              desc: 'Turni notturni, orari spezzati o sonno fluttuante',
            },
          ].map((opt) => {
            const isSelected = data.occupationType === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange({ occupationType: opt.id as OccupationType })}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--color-primary)]/15 border-[var(--color-primary)] text-white shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-900/40'
                }`}
              >
                <span className={`block font-bold text-sm ${isSelected ? 'text-[var(--color-primary)]' : 'text-slate-200'}`}>
                  {opt.title}
                </span>
                <span className="block text-[11px] text-slate-400 mt-1 leading-snug">
                  {opt.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
