import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Flame } from 'lucide-react';
import { AthleteNutritionEstimator } from './AthleteNutritionEstimator';

interface AthleteNutritionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AthleteNutritionModal: React.FC<AthleteNutritionModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 font-sans">
      {/* Backdrop scuro con blur profondo */}
      <div 
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity" 
        onClick={onClose} 
      />

      {/* Contenitore Modale con Header Fisso e Body Scrollabile Isolato */}
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-slate-950 border border-slate-800 rounded-3xl shadow-[0_0_60px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* ─── HEADER FISSO DELLA MODALE (MAI COPERTO DALLO SCROLL) ─── */}
        <div className="px-5 sm:px-7 py-4 bg-slate-950 border-b border-slate-800/90 flex items-center justify-between shrink-0 z-30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-md shadow-amber-500/10">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-tight">
                  Stima Fabbisogno Energetico
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[var(--color-primary)]/15 text-[var(--color-primary)] font-black text-[9px] uppercase border border-[var(--color-primary)]/30">
                  BMR • TDEE • Macro
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-0.5">
                Strumento di stima orientativa basato su formule scientifiche
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-850 rounded-2xl border border-slate-800 transition-all cursor-pointer shadow-sm"
            aria-label="Chiudi finestra"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ─── CORPO SCROLLABILE INDIPENDENTE ─── */}
        <div className="p-5 sm:p-7 overflow-y-auto flex-1 space-y-6">
          <AthleteNutritionEstimator />
        </div>
      </div>
    </div>,
    document.body
  );
};
