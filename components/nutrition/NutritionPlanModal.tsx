import React from 'react';
import { X, Utensils } from 'lucide-react';
import { Athlete, NutritionPlan } from '../../types';
import { NutritionCalculatorCard } from './NutritionCalculatorCard';

interface NutritionPlanModalProps {
  athlete: Athlete;
  isOpen: boolean;
  onClose: () => void;
  onSave: (plan: NutritionPlan) => void;
}

export const NutritionPlanModal: React.FC<NutritionPlanModalProps> = ({
  athlete,
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen) return null;

  const handleSavePlan = (plan: NutritionPlan) => {
    onSave(plan);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
        {/* Header Modal */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[var(--color-primary)]">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                Piano Nutrizionale & Fabbisogno Calorico
              </h3>
              <p className="text-xs text-slate-400">
                Atleta: <span className="text-white font-medium">{athlete.fullName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <NutritionCalculatorCard
          athlete={athlete}
          onSavePlan={handleSavePlan}
        />
      </div>
    </div>
  );
};
