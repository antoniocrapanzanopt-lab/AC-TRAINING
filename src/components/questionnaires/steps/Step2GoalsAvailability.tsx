import React from 'react';
import { Target, Clock, Calendar, Sun } from 'lucide-react';
import {
  OnboardingQuestionnaireData,
  PrimaryGoalType,
  SessionDurationMinutes,
  PreferredTrainingTime,
} from '../../../types/questionnaire';

interface StepProps {
  data: OnboardingQuestionnaireData;
  onChange: (updates: Partial<OnboardingQuestionnaireData>) => void;
}

export const Step2GoalsAvailability: React.FC<StepProps> = ({ data, onChange }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Intestazione */}
      <div className="border-b border-slate-800/80 pb-4">
        <h3 className="text-lg font-black text-white flex items-center gap-2">
          <Target className="w-5 h-5 text-[var(--color-primary)]" /> 2. Obiettivi & Disponibilità Operativa
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Definisci il focus principale del percorso e la sostenibilità temporale della tua settimana.
        </p>
      </div>

      {/* 1. Obiettivo Primario */}
      <div className="space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          Obiettivo Principale del Percorso <span className="text-[var(--color-primary)]">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            {
              id: 'ipertrofia',
              icon: '💪',
              title: 'Ipertrofia Muscolare',
              desc: 'Costruzione massa magra e focus su distretti target',
            },
            {
              id: 'dimagrimento',
              icon: '🔥',
              title: 'Dimagrimento & Cut',
              desc: 'Riduzione massa grassa preservando il tessuto muscolare',
            },
            {
              id: 'ricomposizione',
              icon: '⚡',
              title: 'Ricomposizione Corporea',
              desc: 'Miglioramento contemporaneo di tono e definizione',
            },
            {
              id: 'forza_performance',
              icon: '🏆',
              title: 'Forza & Performance',
              desc: 'Incremento carichi sui fondamentali e potenza atletica',
            },
            {
              id: 'benessere_tonificazione',
              icon: '🌿',
              title: 'Salute & Benessere',
              desc: 'Mobilità, costanza, postura e tono generale',
            },
          ].map((item) => {
            const isSelected = data.primaryGoal === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChange({ primaryGoal: item.id as PrimaryGoalType })}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[var(--color-primary)]/15 border-[var(--color-primary)] text-white shadow-lg ring-1 ring-[var(--color-primary)]/30'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-900/40'
                }`}
              >
                <div>
                  <span className="text-2xl mb-2 block">{item.icon}</span>
                  <span className={`block font-black text-sm ${isSelected ? 'text-[var(--color-primary)]' : 'text-slate-200'}`}>
                    {item.title}
                  </span>
                  <span className="block text-[11px] text-slate-400 mt-1 leading-snug">
                    {item.desc}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Dettaglio / Aspettative */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
          Dettagli o aspettative a medio termine (Opzionale)
        </label>
        <textarea
          rows={2}
          value={data.goalNotes || ''}
          onChange={(e) => onChange({ goalNotes: e.target.value })}
          placeholder="es. Focus glutei e spalle, vorrei sentirmi più atletico e definire l'addome entro 6 mesi..."
          className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)] placeholder:text-slate-600"
        />
      </div>

      {/* 3. Giorni di Allenamento / Settimana */}
      <div className="space-y-3 p-4 rounded-2xl bg-slate-950 border border-slate-800/80">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-[var(--color-primary)]" /> Giorni a Settimana Dedicabili <span className="text-[var(--color-primary)]">*</span>
          </label>
          <span className="text-xs font-black text-[var(--color-primary)]">
            {data.weeklyDaysTarget} Allenamenti / Settimana
          </span>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {[2, 3, 4, 5, 6].map((days) => {
            const isSelected = data.weeklyDaysTarget === days;
            return (
              <button
                key={days}
                type="button"
                onClick={() => onChange({ weeklyDaysTarget: days })}
                className={`py-3 rounded-xl border font-black text-sm transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--color-primary)] text-black border-[var(--color-primary)] shadow-md'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
                }`}
              >
                {days} gg
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Durata Massima Seduta & Fascia Oraria */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Durata Seduta */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-400" /> Tempo per Seduta <span className="text-[var(--color-primary)]">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { val: 45, label: '⏱️ 45 min' },
              { val: 60, label: '⏱️ 60 min' },
              { val: 75, label: '⏱️ 75 min' },
              { val: 90, label: '⏱️ 90+ min' },
            ].map((item) => {
              const isSelected = data.sessionDurationMinutes === item.val;
              return (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => onChange({ sessionDurationMinutes: item.val as SessionDurationMinutes })}
                  className={`py-2.5 px-3 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--color-primary)]/15 border-[var(--color-primary)] text-[var(--color-primary)] shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Fascia Oraria */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Sun className="w-4 h-4 text-slate-400" /> Fascia Oraria Preferita
          </label>
          <select
            value={data.preferredTrainingTime}
            onChange={(e) => onChange({ preferredTrainingTime: e.target.value as PreferredTrainingTime })}
            className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white font-bold text-xs focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
          >
            <option value="morning_early">🌅 Mattina presto (06:00 - 09:00)</option>
            <option value="morning">☀️ Metà mattina (09:00 - 12:00)</option>
            <option value="lunch">🥪 Pausa pranzo (12:00 - 15:00)</option>
            <option value="afternoon">🌇 Pomeriggio (15:00 - 18:00)</option>
            <option value="evening">🌙 Sera (18:00 - 21:00)</option>
            <option value="night">🌌 Notte / Tarda serata (21:00+)</option>
          </select>
        </div>
      </div>
    </div>
  );
};
