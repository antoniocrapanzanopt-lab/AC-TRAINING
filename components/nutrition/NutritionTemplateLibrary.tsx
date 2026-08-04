import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Trash2,
  ArrowRight,
  UserCheck,
  ChefHat,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useAthletes } from '../../context/AthletesContext';
import {
  getNutritionTemplates,
  deleteNutritionTemplate,
  NutritionTemplate,
} from '../../services/nutritionTemplateService';

interface NutritionTemplateLibraryProps {
  onSelectTemplateToLoad?: (template: NutritionTemplate) => void;
}

export const NutritionTemplateLibrary: React.FC<NutritionTemplateLibraryProps> = ({
  onSelectTemplateToLoad,
}) => {
  const { athletes, updateAthlete } = useAthletes();
  const { showSuccess, showError } = useToast();

  const [templates, setTemplates] = useState<NutritionTemplate[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('');
  const [assigningTemplate, setAssigningTemplate] = useState<NutritionTemplate | null>(null);

  const loadTemplates = () => {
    setTemplates(getNutritionTemplates());
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Sei sicuro di voler eliminare il modello "${name}"?`)) {
      deleteNutritionTemplate(id);
      loadTemplates();
      showSuccess('Modello Eliminato', `Il modello "${name}" è stato rimosso dalla libreria.`);
    }
  };

  const handleConfirmAssign = () => {
    if (!selectedAthleteId || !assigningTemplate) {
      showError('Seleziona Atleta', 'Scegli un atleta prima di assegnare il piano.');
      return;
    }

    const athlete = athletes.find((a) => a.id === selectedAthleteId);
    if (!athlete) return;

    updateAthlete(selectedAthleteId, {
      nutritionPlan: {
        sex: athlete.nutritionPlan?.sex || 'male',
        ageYears: athlete.nutritionPlan?.ageYears || 28,
        weightKg: athlete.anthropometrics?.weightKg || athlete.nutritionPlan?.weightKg || 75,
        heightCm: athlete.anthropometrics?.heightCm || athlete.nutritionPlan?.heightCm || 178,
        activityLevel: 'moderatamente_attivo',
        goal: assigningTemplate.goal === 'definizione' ? 'definizione' : 'massa',
        surplusDeficitPercent: 10,
        bmr: 1650,
        tdee: 2300,
        targetCalories: assigningTemplate.targetCalories,
        proteinGrams: assigningTemplate.targetProtein,
        proteinKcal: assigningTemplate.targetProtein * 4,
        proteinPercent: Math.round(((assigningTemplate.targetProtein * 4) / assigningTemplate.targetCalories) * 100),
        fatGrams: assigningTemplate.targetFat,
        fatKcal: assigningTemplate.targetFat * 9,
        fatPercent: Math.round(((assigningTemplate.targetFat * 9) / assigningTemplate.targetCalories) * 100),
        carbsGrams: assigningTemplate.targetCarbs,
        carbsKcal: assigningTemplate.targetCarbs * 4,
        carbsPercent: Math.round(((assigningTemplate.targetCarbs * 4) / assigningTemplate.targetCalories) * 100),
        notes: `Assegnato da modello "${assigningTemplate.name}" il ${new Date().toLocaleDateString('it-IT')}`,
        createdAt: new Date().toISOString(),
      },
    });

    setAssigningTemplate(null);
    setSelectedAthleteId('');
    showSuccess('Piano Assegnato', `Modello "${assigningTemplate.name}" assegnato a ${athlete.firstName} ${athlete.lastName}.`);
  };

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[var(--color-primary)]" /> Libreria Modelli Nutrizionali Salvati
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Gestisci ed applica rapidamente i modelli nutrizionali preimpostati per i tuoi atleti.
          </p>
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-12 bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl p-6">
          <ChefHat className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-xs text-slate-400">Nessun modello salvato presente in libreria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((tmpl) => (
            <div
              key={tmpl.id}
              className="p-5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl flex flex-col justify-between space-y-4 hover:border-[var(--color-primary)]/40 transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white truncate">{tmpl.name}</h4>
                  <span className="px-2 py-0.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/30 text-[10px] font-bold uppercase">
                    {tmpl.goal}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono font-bold text-slate-300">
                  <span className="text-[var(--color-primary)]">{tmpl.targetCalories} kcal</span>
                  <span className="text-emerald-400">{tmpl.targetProtein}g P</span>
                  <span className="text-amber-400">{tmpl.targetFat}g F</span>
                  <span className="text-sky-400">{tmpl.targetCarbs}g C</span>
                </div>

                {tmpl.notes && (
                  <p className="text-[11px] text-slate-400 line-clamp-2 italic">{tmpl.notes}</p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onSelectTemplateToLoad && onSelectTemplateToLoad(tmpl)}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200 hover:text-white hover:border-slate-600 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowRight className="w-3.5 h-3.5 text-[var(--color-primary)]" /> Carica nel Builder
                </button>

                <button
                  type="button"
                  onClick={() => setAssigningTemplate(tmpl)}
                  className="py-2 px-3 rounded-xl bg-[var(--color-primary)] text-black text-xs font-bold hover:bg-[var(--color-primary-hover)] transition-all cursor-pointer"
                >
                  Assegna
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(tmpl.id, tmpl.name)}
                  className="p-2 rounded-xl text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODALE ASSEGNAZIONE ATLETA */}
      {assigningTemplate && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-[var(--color-primary)]" /> Assegna Modello ad Atleta
            </h4>
            <p className="text-xs text-slate-400">
              Stai assegnando il modello <strong>"{assigningTemplate.name}"</strong> ({assigningTemplate.targetCalories} kcal).
            </p>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Seleziona Atleta</label>
              <select
                value={selectedAthleteId}
                onChange={(e) => setSelectedAthleteId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)] font-medium"
              >
                <option value="">-- Scegli Atleta --</option>
                {athletes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.firstName} {a.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAssigningTemplate(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs font-bold hover:text-white"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleConfirmAssign}
                className="px-4 py-2 rounded-xl bg-[var(--color-primary)] text-black text-xs font-bold hover:bg-[var(--color-primary-hover)]"
              >
                Conferma Assegnazione
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
