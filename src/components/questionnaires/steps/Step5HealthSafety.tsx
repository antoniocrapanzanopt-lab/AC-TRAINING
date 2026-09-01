import React from 'react';
import { HeartPulse, ShieldCheck, Check } from 'lucide-react';
import {
  OnboardingQuestionnaireData,
  MedicalCertStatusOption,
} from '../../../types/questionnaire';

interface StepProps {
  data: OnboardingQuestionnaireData;
  onChange: (updates: Partial<OnboardingQuestionnaireData>) => void;
}

const JOINT_AREAS = [
  'Spalla Destra',
  'Spalla Sinistra',
  'Gomito (Dx / Sx)',
  'Polso / Avambraccio',
  'Schiena / Zona Lombare',
  'Cervicale / Trapezio',
  'Anca / Bacino',
  'Ginocchio Destro',
  'Ginocchio Sinistro',
  'Caviglia / Tendine Achille',
];

export const Step5HealthSafety: React.FC<StepProps> = ({ data, onChange }) => {
  const toggleJointLocation = (area: string) => {
    const current = data.jointPainLocations || [];
    const updated = current.includes(area)
      ? current.filter((a) => a !== area)
      : [...current, area];
    onChange({ jointPainLocations: updated });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Intestazione */}
      <div className="border-b border-slate-800/80 pb-4">
        <h3 className="text-lg font-black text-white flex items-center gap-2">
          <HeartPulse className="w-5 h-5 text-red-400" /> 5. Salute, Infortuni & Safety Check
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          La sicurezza è prioritaria. Queste informazioni consentono al coach di evitare esercizi a rischio e personalizzare gli angoli articolari.
        </p>
      </div>

      {/* 1. Fastidi o Dolori Articolari Attivi */}
      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-slate-200 block">
              Avverti attualmente dolori o fastidi articolari? <span className="text-red-400">*</span>
            </label>
            <span className="text-[11px] text-slate-400">Durante l'allenamento o nei movimenti quotidiani</span>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => onChange({ hasJointPain: false, jointPainLocations: [], jointPainTriggers: '' })}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                !data.hasJointPain
                  ? 'bg-slate-800 text-emerald-400 shadow'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              No, tutto ok
            </button>
            <button
              type="button"
              onClick={() => onChange({ hasJointPain: true })}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                data.hasJointPain
                  ? 'bg-red-950/80 border border-red-700 text-red-300 shadow'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Sì, ho fastidi ⚠️
            </button>
          </div>
        </div>

        {/* CONDIZIONALE: Mappa Articolare Se Sì */}
        {data.hasJointPain && (
          <div className="pt-3 border-t border-slate-800/80 space-y-3 animate-in fade-in duration-200">
            <label className="text-[11px] font-bold text-red-300 uppercase tracking-wider block">
              Seleziona le zone o articolazioni interessate:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {JOINT_AREAS.map((area) => {
                const isSelected = (data.jointPainLocations || []).includes(area);
                return (
                  <button
                    key={area}
                    type="button"
                    onClick={() => toggleJointLocation(area)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold text-left transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-red-950/80 border-red-600 text-red-200 shadow'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="truncate">{area}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-red-400 shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>

            <div className="space-y-1 pt-1">
              <label className="text-[11px] font-bold text-slate-400 block">
                Quali movimenti o esercizi provocano o acuiscono il dolore? (Opzionale)
              </label>
              <input
                type="text"
                value={data.jointPainTriggers || ''}
                onChange={(e) => onChange({ jointPainTriggers: e.target.value })}
                placeholder="es. Panca con bilanciere sopra i 90°, affondi profondi..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-red-500 placeholder:text-slate-600"
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. Infortuni o Traumi Pregressi */}
      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-slate-200 block">
              Hai avuto infortuni o interventi chirurgici passati? <span className="text-red-400">*</span>
            </label>
            <span className="text-[11px] text-slate-400">Fratture, lesioni muscolari o legamentose, ernie</span>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => onChange({ hasPastInjuries: false, pastInjuriesDetails: '' })}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                !data.hasPastInjuries
                  ? 'bg-slate-800 text-emerald-400 shadow'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              No
            </button>
            <button
              type="button"
              onClick={() => onChange({ hasPastInjuries: true })}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                data.hasPastInjuries
                  ? 'bg-amber-950/80 border border-amber-700 text-amber-300 shadow'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Sì
            </button>
          </div>
        </div>

        {/* CONDIZIONALE: Dettaglio Infortuni */}
        {data.hasPastInjuries && (
          <div className="pt-3 border-t border-slate-800/80 space-y-1.5 animate-in fade-in duration-200">
            <label className="text-[11px] font-bold text-amber-300 block">
              Descrivi l'infortunio / intervento e l'anno indicativo:
            </label>
            <textarea
              rows={2}
              value={data.pastInjuriesDetails || ''}
              onChange={(e) => onChange({ pastInjuriesDetails: e.target.value })}
              placeholder="es. Distorsione caviglia dx nel 2023, lieve protusione L4-L5 non dolorosa..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-500 placeholder:text-slate-600"
            />
          </div>
        )}
      </div>

      {/* 3. Patologie Diagnosticate o Farmaci */}
      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-slate-200 block">
              Patologie diagnosticate o farmaci continuativi? <span className="text-red-400">*</span>
            </label>
            <span className="text-[11px] text-slate-400">Pressione alta, asma, tiroide, diabete, farmaci quotidiani</span>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => onChange({ hasMedicalConditions: false, medicalConditionsDetails: '' })}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                !data.hasMedicalConditions
                  ? 'bg-slate-800 text-emerald-400 shadow'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              No
            </button>
            <button
              type="button"
              onClick={() => onChange({ hasMedicalConditions: true })}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                data.hasMedicalConditions
                  ? 'bg-red-950/80 border border-red-700 text-red-300 shadow'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Sì
            </button>
          </div>
        </div>

        {/* CONDIZIONALE: Dettaglio Patologie */}
        {data.hasMedicalConditions && (
          <div className="pt-3 border-t border-slate-800/80 space-y-1.5 animate-in fade-in duration-200">
            <label className="text-[11px] font-bold text-red-300 block">
              Specifica patologie o farmaci assunti regolarmente:
            </label>
            <textarea
              rows={2}
              value={data.medicalConditionsDetails || ''}
              onChange={(e) => onChange({ medicalConditionsDetails: e.target.value })}
              placeholder="es. Eutirox al mattino, asma da sforzo..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-red-500 placeholder:text-slate-600"
            />
          </div>
        )}
      </div>

      {/* 4. Certificato Medico */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" /> Stato Certificato Medico Attività Sportiva
        </label>
        <select
          value={data.medicalCertificateStatus}
          onChange={(e) => onChange({ medicalCertificateStatus: e.target.value as MedicalCertStatusOption })}
          className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white font-bold text-xs focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
        >
          <option value="valido_non_agonistico">✅ Certificato Non Agonistico Valido</option>
          <option value="valido_agonistico">🏆 Certificato Medico Agonistico Valido</option>
          <option value="scaduto_o_mancante">⏳ Scaduto o Non ancora in possesso (provvederò al rinnovo)</option>
        </select>
      </div>
    </div>
  );
};
