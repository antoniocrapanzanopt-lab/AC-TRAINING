import React, { useState, useEffect } from 'react';
import {
  FileText,
  AlertTriangle,
  HeartPulse,
  Dumbbell,
  Scale,
  Moon,
  Save,
  Printer,
  UserCheck,
} from 'lucide-react';
import { useAthletes } from '../../context/AthletesContext';
import { useToast } from '../../context/ToastContext';
import { STORAGE_KEYS } from '../../config/storageKeys';
import { getStorageItem, setStorageItem } from '../../lib/storage';
import { InitialAnamnesisData, InitialGoal, TrainingLocation } from '../../types';

interface InitialAnamnesisViewProps {
  athleteId?: string;
  onSaved?: (data: InitialAnamnesisData) => void;
}

const DEFAULT_ANAMNESIS: InitialAnamnesisData = {
  id: '',
  athleteId: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  filledBy: 'coach',
  ageYears: 28,
  weightKg: 75,
  heightCm: 178,
  estimatedBodyFatPercent: 14,
  mainGoal: 'ipertrofia',
  timeframeAndExpectations: 'Ottenere guadagni di massa magra preservando la percentuale di grasso nei prossimi 6 mesi.',
  experienceYears: 3,
  pastDisciplines: 'Bodybuilding amatoriale, Calisthenics base',
  mainLifts: {
    squatKg: 120,
    benchKg: 95,
    deadliftKg: 150,
    pullupsReps: 12,
  },
  trainingLocation: 'palestra',
  weeklyDaysAvailable: 4,
  sessionDurationMinutes: 75,
  pastInjuries: 'Lieve distrazione al sovraspinato spalla destra (2024), risolta con fisioterapia. Nessun intervento.',
  currentJointPain: {
    shoulders: true,
    back: false,
    knees: false,
    hips: false,
    elbows: false,
    otherNotes: 'Lievi fastidi alla spalla destra quando si esegue panca piana ad alto carico senza riscaldamento adeguato.',
  },
  averageSleepHours: 7.5,
  sleepQuality: 'buono',
  dailyStressScale: 6,
  workType: 'sedentario',
  dietaryPreferences: 'Lieve intolleranza al lattosio (predilige alimenti senza lattosio). Nessuna allergia grave.',
  notes: 'Molto motivato, preferisce split a 4 giorni (Upper/Lower).',
};

export const InitialAnamnesisView: React.FC<InitialAnamnesisViewProps> = ({
  athleteId: initialAthleteId,
  onSaved,
}) => {
  const { athletes } = useAthletes();
  const { showSuccess } = useToast();

  const [selectedAthleteId, setSelectedAthleteId] = useState<string>(initialAthleteId || '');
  const [formData, setFormData] = useState<InitialAnamnesisData>(DEFAULT_ANAMNESIS);
  const [isEditing, setIsEditing] = useState<boolean>(true);

  // Carica l'anamnesi salvata per l'atleta selezionato
  useEffect(() => {
    if (initialAthleteId) {
      setSelectedAthleteId(initialAthleteId);
    }
  }, [initialAthleteId]);

  useEffect(() => {
    if (selectedAthleteId) {
      const allAnamnesis = getStorageItem<Record<string, InitialAnamnesisData>>(
        STORAGE_KEYS.ATHLETE_INITIAL_ANAMNESIS,
        {}
      );
      if (allAnamnesis[selectedAthleteId]) {
        setFormData(allAnamnesis[selectedAthleteId]);
        setIsEditing(false);
      } else {
        // Pre-compila dati base se disponibili
        const athlete = athletes.find((a) => a.id === selectedAthleteId);
        setFormData({
          ...DEFAULT_ANAMNESIS,
          id: `anamnesi-${selectedAthleteId}`,
          athleteId: selectedAthleteId,
          athleteName: athlete ? `${athlete.firstName} ${athlete.lastName}` : '',
          weightKg: athlete?.anthropometrics?.weightKg || athlete?.nutritionPlan?.weightKg || 75,
          heightCm: athlete?.anthropometrics?.heightCm || athlete?.nutritionPlan?.heightCm || 178,
          ageYears: athlete?.nutritionPlan?.ageYears || 28,
        });
        setIsEditing(true);
      }
    }
  }, [selectedAthleteId, athletes]);

  const handleSave = () => {
    if (!selectedAthleteId) {
      alert('Seleziona un atleta a cui associare la scheda di Anamnesi Iniziale.');
      return;
    }

    const updatedData: InitialAnamnesisData = {
      ...formData,
      id: formData.id || `anamnesi-${selectedAthleteId}`,
      athleteId: selectedAthleteId,
      updatedAt: new Date().toISOString(),
    };

    const allAnamnesis = getStorageItem<Record<string, InitialAnamnesisData>>(
      STORAGE_KEYS.ATHLETE_INITIAL_ANAMNESIS,
      {}
    );
    allAnamnesis[selectedAthleteId] = updatedData;
    setStorageItem(STORAGE_KEYS.ATHLETE_INITIAL_ANAMNESIS, allAnamnesis);

    setIsEditing(false);
    showSuccess('Anamnesi Iniziale Salvata', 'La scheda di prima valutazione è stata salvata con successo.');
    if (onSaved) onSaved(updatedData);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const hasInjuriesOrPain =
    formData.pastInjuries.trim().length > 0 ||
    Object.values(formData.currentJointPain).some((v) => v === true);

  return (
    <div className="space-y-6 print:p-0">
      {/* TESTATA & SELETTORE ATLETA */}
      <div className="p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-[var(--color-primary)]" /> Anamnesi Iniziale (Initial Check & Valutazione)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Prima valutazione completa: anamnesi biometrica, storico sportivo, salute articolare e stile di vita dell'atleta.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* SELETTORE ATLETA */}
          <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800 shrink-0">
            <UserCheck className="w-4 h-4 text-[var(--color-primary)] shrink-0 ml-1" />
            <select
              value={selectedAthleteId}
              onChange={(e) => setSelectedAthleteId(e.target.value)}
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer pr-2"
            >
              <option value="" className="bg-slate-900 text-slate-300">-- Seleziona Atleta Target --</option>
              {athletes.map((a) => (
                <option key={a.id} value={a.id} className="bg-slate-900 text-white">
                  {a.firstName} {a.lastName}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handlePrintPDF}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200 hover:text-white hover:border-slate-600 transition-all cursor-pointer shadow"
          >
            <Printer className="w-4 h-4 text-sky-400" /> Stampa PDF
          </button>

          {isEditing ? (
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all shadow-md cursor-pointer"
            >
              <Save className="w-4 h-4" /> Salva Anamnesi
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold text-xs hover:border-[var(--color-primary)] transition-all shadow cursor-pointer"
            >
              Modifica Dati
            </button>
          )}
        </div>
      </div>

      {/* BOX ROSSO DI ALLERTA INFORTUNI & LIMITAZIONI FISICHE */}
      {hasInjuriesOrPain && (
        <div className="p-4 rounded-2xl bg-red-950/40 border border-red-800/60 shadow-lg flex items-start gap-3.5 text-red-200">
          <AlertTriangle className="w-6 h-6 text-red-400 shrink-0 mt-0.5 animate-pulse" />
          <div className="space-y-1">
            <h4 className="text-xs font-black text-red-300 uppercase tracking-wider flex items-center gap-2">
              Attenzione Safety Check: Infortuni o Fastidi Articolari Segnalati
            </h4>
            <p className="text-xs text-red-200/90 leading-relaxed">
              <strong>Infortuni Passati / Chirurgia:</strong> {formData.pastInjuries || 'Nessuno'}<br />
              <strong>Fastidi Articolari Attuali:</strong>{' '}
              {[
                formData.currentJointPain.shoulders && 'Spalle',
                formData.currentJointPain.back && 'Schiena/Lombare',
                formData.currentJointPain.knees && 'Ginocchia',
                formData.currentJointPain.hips && 'Anche',
                formData.currentJointPain.elbows && 'Gomiti',
              ]
                .filter(Boolean)
                .join(', ') || 'Nessun fastidio specifico'}.
              {formData.currentJointPain.otherNotes && ` (${formData.currentJointPain.otherNotes})`}
            </p>
          </div>
        </div>
      )}

      {/* SCHEDE DETTAGLIO ANAMNESI */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. BIOMETRIA & OBIETTIVI */}
        <div className="p-5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2.5 flex items-center gap-2">
            <Scale className="w-4 h-4 text-[var(--color-primary)]" /> 1. Dati Biometrici & Obiettivi
          </h4>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Età (anni)</label>
              <input
                type="number"
                disabled={!isEditing}
                value={formData.ageYears}
                onChange={(e) => setFormData({ ...formData, ageYears: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold disabled:opacity-80"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Peso (kg)</label>
              <input
                type="number"
                disabled={!isEditing}
                value={formData.weightKg}
                onChange={(e) => setFormData({ ...formData, weightKg: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold disabled:opacity-80"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Altezza (cm)</label>
              <input
                type="number"
                disabled={!isEditing}
                value={formData.heightCm}
                onChange={(e) => setFormData({ ...formData, heightCm: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold disabled:opacity-80"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">% Grasso Stimata</label>
              <input
                type="number"
                disabled={!isEditing}
                value={formData.estimatedBodyFatPercent || ''}
                onChange={(e) => setFormData({ ...formData, estimatedBodyFatPercent: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold disabled:opacity-80"
                placeholder="es. 14%"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1">Obiettivo Principale</label>
            <select
              disabled={!isEditing}
              value={formData.mainGoal}
              onChange={(e) => setFormData({ ...formData, mainGoal: e.target.value as InitialGoal })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white disabled:opacity-80"
            >
              <option value="ipertrofia">Ipertrofia Muscolare / Massa</option>
              <option value="ricomposizione">Ricomposizione Corporea</option>
              <option value="dimagrimento">Dimagrimento / Deficit (Cut)</option>
              <option value="performance">Performance Atletica & Forza</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1">Tempistiche & Aspettative</label>
            <textarea
              rows={2}
              disabled={!isEditing}
              value={formData.timeframeAndExpectations}
              onChange={(e) => setFormData({ ...formData, timeframeAndExpectations: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white disabled:opacity-80"
            />
          </div>
        </div>

        {/* 2. STORICO SPORTIVO & FONDAMENTALI */}
        <div className="p-5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2.5 flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-[var(--color-primary)]" /> 2. Storico Sportivo & Carichi Indicativi
          </h4>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Anni Esperienza Gym</label>
              <input
                type="number"
                disabled={!isEditing}
                value={formData.experienceYears}
                onChange={(e) => setFormData({ ...formData, experienceYears: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold disabled:opacity-80"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Luogo Allenamento</label>
              <select
                disabled={!isEditing}
                value={formData.trainingLocation}
                onChange={(e) => setFormData({ ...formData, trainingLocation: e.target.value as TrainingLocation })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white disabled:opacity-80"
              >
                <option value="palestra">Palestra Commerciale</option>
                <option value="home_gym">Home Gym Attrezzata</option>
                <option value="parco_corpo_libero">Parco / Corpo Libero</option>
              </select>
            </div>
          </div>

          {/* CARICHI SUI FONDAMENTALI */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Carichi / Massimali Indicativi:</label>
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <span className="text-[9px] text-slate-500 font-bold block">Squat (kg)</span>
                <input
                  type="number"
                  disabled={!isEditing}
                  value={formData.mainLifts?.squatKg || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      mainLifts: { ...formData.mainLifts, squatKg: Number(e.target.value) },
                    })
                  }
                  className="w-full text-center bg-transparent font-bold text-white focus:outline-none"
                />
              </div>
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <span className="text-[9px] text-slate-500 font-bold block">Panca (kg)</span>
                <input
                  type="number"
                  disabled={!isEditing}
                  value={formData.mainLifts?.benchKg || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      mainLifts: { ...formData.mainLifts, benchKg: Number(e.target.value) },
                    })
                  }
                  className="w-full text-center bg-transparent font-bold text-white focus:outline-none"
                />
              </div>
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <span className="text-[9px] text-slate-500 font-bold block">Stacco (kg)</span>
                <input
                  type="number"
                  disabled={!isEditing}
                  value={formData.mainLifts?.deadliftKg || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      mainLifts: { ...formData.mainLifts, deadliftKg: Number(e.target.value) },
                    })
                  }
                  className="w-full text-center bg-transparent font-bold text-white focus:outline-none"
                />
              </div>
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <span className="text-[9px] text-slate-500 font-bold block">Trazioni (Reps)</span>
                <input
                  type="number"
                  disabled={!isEditing}
                  value={formData.mainLifts?.pullupsReps || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      mainLifts: { ...formData.mainLifts, pullupsReps: Number(e.target.value) },
                    })
                  }
                  className="w-full text-center bg-transparent font-bold text-white focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 3. SALUTE & FASTIDI ARTICOLARI */}
        <div className="p-5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2.5 flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-red-400" /> 3. Salute, Infortuni & Fastidi Articolari
          </h4>

          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1">Infortuni Passati / Interventi / Patologie</label>
            <textarea
              rows={2}
              disabled={!isEditing}
              value={formData.pastInjuries}
              onChange={(e) => setFormData({ ...formData, pastInjuries: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white disabled:opacity-80"
              placeholder="Descrivi eventuali infortuni pregressi o interventi chirurgici..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 block">Fastidi o Dolori Articolari Attuali:</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-xs">
              {[
                { key: 'shoulders', label: 'Spalle' },
                { key: 'back', label: 'Schiena' },
                { key: 'knees', label: 'Ginocchia' },
                { key: 'hips', label: 'Anche' },
                { key: 'elbows', label: 'Gomiti' },
              ].map((joint) => {
                const isChecked = (formData.currentJointPain as any)[joint.key];

                return (
                  <button
                    key={joint.key}
                    type="button"
                    disabled={!isEditing}
                    onClick={() =>
                      setFormData({
                        ...formData,
                        currentJointPain: {
                          ...formData.currentJointPain,
                          [joint.key]: !isChecked,
                        },
                      })
                    }
                    className={`py-2 px-2 rounded-xl border text-center font-bold text-xs transition-all ${
                      isChecked
                        ? 'bg-red-950/80 border-red-700 text-red-300 shadow'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    {joint.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 4. STILE DI VITA & ALIMENTAZIONE */}
        <div className="p-5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2.5 flex items-center gap-2">
            <Moon className="w-4 h-4 text-[var(--color-primary)]" /> 4. Stile di Vita, Sonno & Alimentazione
          </h4>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Ore Sonno Medie / Notte</label>
              <input
                type="number"
                step="0.5"
                disabled={!isEditing}
                value={formData.averageSleepHours}
                onChange={(e) => setFormData({ ...formData, averageSleepHours: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold disabled:opacity-80"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Livello Stress (1-10)</label>
              <input
                type="number"
                min="1"
                max="10"
                disabled={!isEditing}
                value={formData.dailyStressScale}
                onChange={(e) => setFormData({ ...formData, dailyStressScale: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold disabled:opacity-80"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1">Preferenze Alimentari & Intolleranze</label>
            <textarea
              rows={2}
              disabled={!isEditing}
              value={formData.dietaryPreferences}
              onChange={(e) => setFormData({ ...formData, dietaryPreferences: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white disabled:opacity-80"
              placeholder="Allergie, cibi sgraditi, intolleranze..."
            />
          </div>
        </div>
      </div>
    </div>
  );
};
