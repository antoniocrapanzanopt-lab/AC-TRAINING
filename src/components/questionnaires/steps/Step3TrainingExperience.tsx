import React from 'react';
import { Dumbbell, Building2, Home, Trees, Check } from 'lucide-react';
import {
  OnboardingQuestionnaireData,
  ExperienceLevel,
  TrainingLocationType,
} from '../../../types/questionnaire';

interface StepProps {
  data: OnboardingQuestionnaireData;
  onChange: (updates: Partial<OnboardingQuestionnaireData>) => void;
}

const AVAILABLE_SPORTS = [
  'Calcio / Calcetto',
  'Nuoto',
  'Corsa / Running',
  'CrossFit',
  'Calisthenics',
  'Arti Marziali / Boxe',
  'Basket / Volley',
  'Ciclismo',
  'Tennis / Padel',
  'Sci / Snowboard',
];

const HOME_EQUIPMENT_OPTIONS = [
  'Manubri componibili (fino a 20+ kg)',
  'Bilanciere olimpico (20kg) & Dischi',
  'Panca inclinabile / piana',
  'Rack / Half Rack / Squat Stand',
  'Sbarra per trazioni',
  'Elastici / Resistance Loops',
  'Cavi / Lat Machine / Pulley',
  'Kettlebell',
  'Cardio (Tapis / Cyclette / Vogatore)',
  'Cintura zavorre',
];

export const Step3TrainingExperience: React.FC<StepProps> = ({ data, onChange }) => {
  const toggleSport = (sport: string) => {
    const current = data.pastSports || [];
    const updated = current.includes(sport)
      ? current.filter((s) => s !== sport)
      : [...current, sport];
    onChange({ pastSports: updated });
  };

  const toggleEquipment = (item: string) => {
    const current = data.homeGymEquipment || [];
    const updated = current.includes(item)
      ? current.filter((i) => i !== item)
      : [...current, item];
    onChange({ homeGymEquipment: updated });
  };

  const isHomeOrHybrid = data.trainingLocation === 'home_gym' || data.trainingLocation === 'ibrido';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Intestazione */}
      <div className="border-b border-slate-800/80 pb-4">
        <h3 className="text-lg font-black text-white flex items-center gap-2">
          <Dumbbell className="w-5 h-5 text-[var(--color-primary)]" /> 3. Allenamento & Esperienza Pregressa
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Identifica la tua anzianità di sovraccarico, l'ambiente di allenamento e l'attrezzatura a disposizione.
        </p>
      </div>

      {/* 1. Anzianità di Allenamento */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          Anzianità di Allenamento con Pesi <span className="text-[var(--color-primary)]">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              id: 'principiante',
              title: '🟢 Principiante',
              desc: 'Meno di 1 anno o ripresa dopo lungo stop',
            },
            {
              id: 'intermedio',
              title: '🟡 Intermedio',
              desc: '1 - 3 anni di costanza in palestra',
            },
            {
              id: 'avanzato',
              title: '🔴 Avanzato',
              desc: 'Oltre 3-5 anni di programmazione solida',
            },
          ].map((item) => {
            const isSelected = data.experienceLevel === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChange({ experienceLevel: item.id as ExperienceLevel })}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--color-primary)]/15 border-[var(--color-primary)] text-white shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-900/40'
                }`}
              >
                <span className={`block font-black text-sm ${isSelected ? 'text-[var(--color-primary)]' : 'text-slate-200'}`}>
                  {item.title}
                </span>
                <span className="block text-[11px] text-slate-400 mt-1 leading-snug">
                  {item.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Sport Praticati in Passato (Multi-Chip) */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
          Sport o discipline praticate in passato (Seleziona tutto ciò che si applica)
        </label>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_SPORTS.map((sport) => {
            const isSelected = (data.pastSports || []).includes(sport);
            return (
              <button
                key={sport}
                type="button"
                onClick={() => toggleSport(sport)}
                className={`py-1.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[var(--color-primary)] text-black border-[var(--color-primary)] shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                {isSelected && <Check className="w-3 h-3" />}
                {sport}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Ambiente di Allenamento */}
      <div className="space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          Dove ti alleni? <span className="text-[var(--color-primary)]">*</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { id: 'palestra', icon: Building2, label: 'Palestra' },
            { id: 'home_gym', icon: Home, label: 'Home Gym' },
            { id: 'corpo_libero', icon: Trees, label: 'Parco / Calis.' },
            { id: 'ibrido', icon: Dumbbell, label: 'Ibrido (Palestra + Casa)' },
          ].map((loc) => {
            const isSelected = data.trainingLocation === loc.id;
            const Icon = loc.icon;
            return (
              <button
                key={loc.id}
                type="button"
                onClick={() => onChange({ trainingLocation: loc.id as TrainingLocationType })}
                className={`p-3.5 rounded-2xl border text-center font-bold text-xs transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                  isSelected
                    ? 'bg-[var(--color-primary)]/15 border-[var(--color-primary)] text-[var(--color-primary)] shadow-md ring-1 ring-[var(--color-primary)]/30'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{loc.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. CONDIZIONALE: Attrezzatura a Casa (Se Home Gym o Ibrido) */}
      {isHomeOrHybrid && (
        <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-800/40 space-y-3 animate-in fade-in duration-200">
          <label className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
            <Home className="w-4 h-4 text-amber-400" /> Attrezzatura Disponibile a Casa
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {HOME_EQUIPMENT_OPTIONS.map((item) => {
              const isChecked = (data.homeGymEquipment || []).includes(item);
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleEquipment(item)}
                  className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                    isChecked
                      ? 'bg-amber-500/20 border-amber-500 text-amber-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="truncate">{item}</span>
                  {isChecked && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Esercizi non graditi */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
          Esercizi che non sopporti o preferisci evitare (Opzionale)
        </label>
        <input
          type="text"
          value={data.dislikedExercises || ''}
          onChange={(e) => onChange({ dislikedExercises: e.target.value })}
          placeholder="es. Affondi in camminata, panca inclinata manubri, ecc."
          className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)] placeholder:text-slate-600"
        />
      </div>

      {/* 6. Carichi Indicativi sui Fondamentali (Opzionali) */}
      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
            Carichi Indicativi Fondamentali (Opzionali se noti)
          </label>
          <span className="text-[10px] text-slate-500">1RM o serie pesante</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { key: 'squatKg', label: 'Squat (kg)' },
            { key: 'benchKg', label: 'Panca Piana (kg)' },
            { key: 'deadliftKg', label: 'Stacco (kg)' },
            { key: 'pullupsReps', label: 'Trazioni (Max Reps)' },
          ].map((lift) => (
            <div key={lift.key} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
              <span className="text-[10px] font-bold text-slate-400 block mb-1">{lift.label}</span>
              <input
                type="number"
                value={(data.indicativeMaxLifts as any)?.[lift.key] || ''}
                onChange={(e) =>
                  onChange({
                    indicativeMaxLifts: {
                      ...data.indicativeMaxLifts,
                      [lift.key]: e.target.value ? Number(e.target.value) : undefined,
                    },
                  })
                }
                placeholder="—"
                className="w-full text-center bg-transparent font-mono font-bold text-sm text-white focus:outline-none placeholder:text-slate-600"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
