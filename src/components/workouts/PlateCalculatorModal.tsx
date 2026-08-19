import React, { useState, useMemo } from 'react';
import { X, Dumbbell, Check, Sparkles } from 'lucide-react';
import { calculatePlates } from '../../utils/plateCalculator';

interface PlateCalculatorModalProps {
  initialWeight?: number;
  exerciseName?: string;
  onClose: () => void;
  onApplyWeight?: (weight: number) => void;
}

export const PlateCalculatorModal: React.FC<PlateCalculatorModalProps> = ({
  initialWeight = 60,
  exerciseName,
  onClose,
  onApplyWeight,
}) => {
  const [targetWeight, setTargetWeight] = useState<number>(() => Math.max(0, initialWeight || 60));
  const [barbellWeight, setBarbellWeight] = useState<number>(20);

  const BARBELL_OPTIONS = [
    { label: 'Olimpico (20 kg)', weight: 20 },
    { label: 'Olimpico Donna (15 kg)', weight: 15 },
    { label: 'Tecnico / EZ (10 kg)', weight: 10 },
    { label: 'Manubrio / 0 kg', weight: 0 },
  ];

  const result = useMemo(() => {
    return calculatePlates(targetWeight, barbellWeight);
  }, [targetWeight, barbellWeight]);

  const handleAdjustWeight = (delta: number) => {
    setTargetWeight((prev) => Math.max(0, Math.round((prev + delta) * 10) / 10));
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-slate-950 border border-slate-800 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow di sfondo */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--color-primary)]/10 rounded-full blur-3xl pointer-events-none" />

        {/* ─── HEADER ─── */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)] shadow-sm">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                Calcolatore Piastre
              </h2>
              <p className="text-xs text-slate-400 font-medium truncate max-w-[220px] sm:max-w-xs">
                {exerciseName ? exerciseName : 'Composizione Dischi per Bilanciere'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900 border border-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ─── INPUT PESO TARGET & CONTROLLI RAPIDI ─── */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
            Carico Totale Target
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleAdjustWeight(-5)}
              className="px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 font-bold text-xs border border-slate-800 cursor-pointer active:scale-95 transition-all"
            >
              -5kg
            </button>
            <button
              type="button"
              onClick={() => handleAdjustWeight(-2.5)}
              className="px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 font-bold text-xs border border-slate-800 cursor-pointer active:scale-95 transition-all"
            >
              -2.5kg
            </button>

            <div className="flex-1 relative flex items-center bg-slate-900 border border-slate-700 rounded-2xl px-3 focus-within:border-[var(--color-primary)] shadow-inner">
              <input
                type="number"
                step="0.5"
                min="0"
                value={targetWeight || ''}
                onChange={(e) => setTargetWeight(parseFloat(e.target.value) || 0)}
                className="w-full py-2.5 bg-transparent text-center font-mono text-xl sm:text-2xl font-black text-white focus:outline-none"
              />
              <span className="text-xs font-bold text-[var(--color-primary)] pr-1">KG</span>
            </div>

            <button
              type="button"
              onClick={() => handleAdjustWeight(2.5)}
              className="px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-[var(--color-primary)] font-bold text-xs border border-slate-800 cursor-pointer active:scale-95 transition-all"
            >
              +2.5kg
            </button>
            <button
              type="button"
              onClick={() => handleAdjustWeight(5)}
              className="px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-[var(--color-primary)] font-bold text-xs border border-slate-800 cursor-pointer active:scale-95 transition-all"
            >
              +5kg
            </button>
          </div>
        </div>

        {/* ─── SELETTORE BILANCIERE ─── */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
            Tipo di Bilanciere
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {BARBELL_OPTIONS.map((opt) => {
              const isSel = barbellWeight === opt.weight;
              return (
                <button
                  key={opt.weight}
                  type="button"
                  onClick={() => setBarbellWeight(opt.weight)}
                  className={`p-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer text-center ${
                    isSel
                      ? 'bg-[var(--color-primary)] text-slate-950 font-black border-[var(--color-primary)] shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── GRAFICA VISIVA DEL BILANCIERE CARICATO ─── */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-inner">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[var(--color-primary)]" />
              Da caricare per singolo lato:
            </span>
            <span className="font-mono font-black text-white text-sm bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
              {result.weightPerSide} kg / lato
            </span>
          </div>

          {/* Simulazione Grafica Bilanciere */}
          <div className="relative h-32 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center overflow-hidden px-4">
            
            {/* Asta del bilanciere centrale in titanio */}
            <div className="absolute left-0 right-0 h-3 bg-gradient-to-r from-slate-600 via-slate-400 to-slate-600 rounded-full shadow-md z-0" />
            
            {/* Manicotto Centrale */}
            <div className="absolute w-28 sm:w-36 h-5 bg-slate-700/80 border-x-2 border-slate-500 rounded z-0" />

            {/* Dischi Sinistra (Specchio) */}
            <div className="relative z-10 flex items-center justify-end flex-1 pr-6 sm:pr-10 gap-1 flex-row-reverse">
              {result.platesPerSide.map(({ plate, count }) =>
                Array.from({ length: count }).map((_, idx) => (
                  <div
                    key={`l-${plate.weight}-${idx}`}
                    className={`w-3.5 sm:w-4 ${plate.heightClass} rounded-sm shadow-lg flex items-center justify-center transition-all`}
                    style={{
                      backgroundColor: plate.color,
                      borderColor: plate.borderColor,
                      borderWidth: '1.5px',
                    }}
                    title={`${plate.weight} kg`}
                  >
                    <span
                      className="text-[8px] sm:text-[9px] font-black transform -rotate-90 select-none"
                      style={{ color: plate.textColor }}
                    >
                      {plate.weight}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Fermo Bilanciere Centrale */}
            <div className="w-2.5 h-16 bg-slate-500 rounded-sm z-10 shadow-md" />

            {/* Dischi Destra */}
            <div className="relative z-10 flex items-center justify-start flex-1 pl-6 sm:pl-10 gap-1">
              {result.platesPerSide.map(({ plate, count }) =>
                Array.from({ length: count }).map((_, idx) => (
                  <div
                    key={`r-${plate.weight}-${idx}`}
                    className={`w-3.5 sm:w-4 ${plate.heightClass} rounded-sm shadow-lg flex items-center justify-center transition-all`}
                    style={{
                      backgroundColor: plate.color,
                      borderColor: plate.borderColor,
                      borderWidth: '1.5px',
                    }}
                    title={`${plate.weight} kg`}
                  >
                    <span
                      className="text-[8px] sm:text-[9px] font-black transform -rotate-90 select-none"
                      style={{ color: plate.textColor }}
                    >
                      {plate.weight}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Elenco Dischi per Lato */}
          {result.platesPerSide.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {result.platesPerSide.map(({ plate, count }) => (
                <div
                  key={plate.weight}
                  className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white flex items-center gap-1.5 shadow-sm"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: plate.color }}
                  />
                  <span>
                    {count}x <strong className="font-mono text-white">{plate.weight} kg</strong>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 text-center py-1">
              {targetWeight <= barbellWeight
                ? `Solo il bilanciere (${barbellWeight} kg), nessun disco necessario.`
                : 'Nessun disco calcolato.'}
            </p>
          )}

          {/* Eventuale resto */}
          {result.remainder > 0 && (
            <p className="text-[11px] text-amber-400 font-medium">
              ⚠️ Resto non componibile con i dischi standard: {result.remainder} kg
            </p>
          )}
        </div>

        {/* ─── BOTTONE APPLICA AL SET ─── */}
        {onApplyWeight && (
          <button
            type="button"
            onClick={() => {
              onApplyWeight(targetWeight);
              onClose();
            }}
            className="w-full py-3.5 rounded-2xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-primary)]/20 active:scale-95 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Applica {targetWeight} kg al Set</span>
          </button>
        )}
      </div>
    </div>
  );
};
