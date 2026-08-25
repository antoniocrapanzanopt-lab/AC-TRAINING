import React, { useState } from 'react';
import {
  X,
  Scale,
  Heart,
  Zap,
  Moon,
  Coffee,
  CheckCircle2,
} from 'lucide-react';
import { useNutrition } from '../../context/NutritionContext';
import { useToast } from '../../context/ToastContext';

interface AthleteCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  athleteId: string;
  athleteName?: string;
  initialWeight?: number;
}

export const AthleteCheckInModal: React.FC<AthleteCheckInModalProps> = ({
  isOpen,
  onClose,
  athleteId,
  athleteName,
  initialWeight,
}) => {
  const { submitCheckIn } = useNutrition();
  const { showSuccess } = useToast();

  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [weightKg, setWeightKg] = useState<number>(initialWeight || 70);
  const [adherenceScore, setAdherenceScore] = useState<number>(4);
  const [hungerScore, setHungerScore] = useState<number>(2);
  const [energyScore, setEnergyScore] = useState<number>(4);
  const [sleepScore, setSleepScore] = useState<number>(4);
  const [digestionScore, setDigestionScore] = useState<number>(4);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!weightKg || weightKg < 30 || weightKg > 300) return;

    setIsSubmitting(true);
    submitCheckIn({
      athleteId,
      athleteName,
      date,
      weightKg: Number(weightKg),
      adherenceScore,
      hungerScore,
      energyScore,
      sleepScore,
      digestionScore,
      notes: notes.trim() || undefined,
    });

    setIsSubmitting(false);
    showSuccess('Check-in Registrato', 'I tuoi dati nutrizionali sono stati inviati al coach.');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        
        {/* Header Modal */}
        <div className="p-5 sm:p-6 border-b border-[var(--color-border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)]">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-[var(--color-text)]">Check-in Alimentare</h3>
              <p className="text-xs text-[var(--color-text-muted)]">Inserisci il peso e le sensazioni per aggiornare il tuo percorso.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-strong)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5">
          
          {/* Data & Peso */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide">Data Rilevazione</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--color-surface-strong)] border border-[var(--color-border)] text-[var(--color-text)] text-xs font-bold focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide">Peso Corporeo (kg)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="30"
                  max="250"
                  required
                  value={weightKg === 0 ? '' : weightKg}
                  onFocus={(e) => { if (weightKg === 0) e.target.select(); }}
                  onChange={(e) => {
                    const val = e.target.value;
                    setWeightKg(val === '' ? 0 : Number(val));
                  }}
                  placeholder="Es. 72.5"
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--color-surface-strong)] border border-[var(--color-border)] text-[var(--color-text)] font-black text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--color-text-muted)]">kg</span>
              </div>
            </div>
          </div>

          {/* Scale di Valutazione 1 - 5 */}
          <div className="space-y-4 pt-2 border-t border-[var(--color-border)]">
            
            {/* 1. Aderenza */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-[var(--color-text)] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Aderenza al Piano
                </span>
                <span className="font-bold text-[var(--color-primary)]">
                  {adherenceScore === 1 ? '1 - Molto Scarsa' : adherenceScore === 2 ? '2 - Parziale' : adherenceScore === 3 ? '3 - Buona' : adherenceScore === 4 ? '4 - Ottima' : '5 - Perfetta (100%)'}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((score) => (
                  <button
                    key={score}
                    type="button"
                    onClick={() => setAdherenceScore(score)}
                    className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      adherenceScore === score
                        ? 'bg-[var(--color-primary)] text-slate-950 shadow-md'
                        : 'bg-[var(--color-surface-strong)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                    }`}
                  >
                    {score}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Livello di Fame */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-[var(--color-text)] flex items-center gap-1.5">
                  <Coffee className="w-3.5 h-3.5 text-amber-500" /> Livello di Fame
                </span>
                <span className="font-bold text-amber-500">
                  {hungerScore === 1 ? '1 - Sazio / Nessuna fame' : hungerScore === 2 ? '2 - Bassa' : hungerScore === 3 ? '3 - Moderata / Normale' : hungerScore === 4 ? '4 - Alta' : '5 - Fame Estrema'}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((score) => (
                  <button
                    key={score}
                    type="button"
                    onClick={() => setHungerScore(score)}
                    className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      hungerScore === score
                        ? 'bg-amber-500 text-slate-950 shadow-md'
                        : 'bg-[var(--color-surface-strong)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                    }`}
                  >
                    {score}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Livello di Energia */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-[var(--color-text)] flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-sky-500" /> Livello di Energia
                </span>
                <span className="font-bold text-sky-500">
                  {energyScore === 1 ? '1 - Molto Stanco' : energyScore === 2 ? '2 - Basso' : energyScore === 3 ? '3 - Normale' : energyScore === 4 ? '4 - Buona Energia' : '5 - Piena Energia'}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((score) => (
                  <button
                    key={score}
                    type="button"
                    onClick={() => setEnergyScore(score)}
                    className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      energyScore === score
                        ? 'bg-sky-500 text-slate-950 shadow-md'
                        : 'bg-[var(--color-surface-strong)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                    }`}
                  >
                    {score}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Qualità del Sonno */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-[var(--color-text)] flex items-center gap-1.5">
                  <Moon className="w-3.5 h-3.5 text-purple-500" /> Qualità del Sonno
                </span>
                <span className="font-bold text-purple-500">
                  {sleepScore === 1 ? '1 - Pessimo' : sleepScore === 2 ? '2 - Disturbato' : sleepScore === 3 ? '3 - Discreto' : sleepScore === 4 ? '4 - Buono' : '5 - Rigenerante'}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((score) => (
                  <button
                    key={score}
                    type="button"
                    onClick={() => setSleepScore(score)}
                    className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      sleepScore === score
                        ? 'bg-purple-500 text-white shadow-md'
                        : 'bg-[var(--color-surface-strong)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                    }`}
                  >
                    {score}
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Digestione */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-[var(--color-text)] flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-500" /> Digestione & Comfort
                </span>
                <span className="font-bold text-rose-500">
                  {digestionScore === 1 ? '1 - Gonfiore / Pesantezza' : digestionScore === 2 ? '2 - Lenta' : digestionScore === 3 ? '3 - Normale' : digestionScore === 4 ? '4 - Ottima' : '5 - Perfetta'}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((score) => (
                  <button
                    key={score}
                    type="button"
                    onClick={() => setDigestionScore(score)}
                    className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      digestionScore === score
                        ? 'bg-rose-500 text-white shadow-md'
                        : 'bg-[var(--color-surface-strong)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                    }`}
                  >
                    {score}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Note Facoltative */}
          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide">Note Facoltative per il Coach</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Es. settimana impegnativa, nessun problema con i pasti..."
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--color-surface-strong)] border border-[var(--color-border)] text-[var(--color-text)] text-xs placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-colors resize-none"
            />
          </div>

          {/* Footer CTA */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text)] font-bold text-xs transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-[var(--color-primary)] text-slate-950 font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all cursor-pointer shadow-lg shadow-[var(--color-primary)]/20"
            >
              {isSubmitting ? 'Invio in corso...' : 'Salva Check-in'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
