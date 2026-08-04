import React, { useState, useMemo } from 'react';
import { X, Search, Check, Users, Calendar, Zap } from 'lucide-react';
import { useAthletes } from '../../context/AthletesContext';
import { useWorkoutPlans } from '../../context/WorkoutPlansContext';
import { WorkoutPlan } from '../../types';

interface AssignPlanModalProps {
  template: WorkoutPlan;
  onClose: () => void;
  onSuccess: (count: number, athleteNames: string) => void;
}

export const AssignPlanModal: React.FC<AssignPlanModalProps> = ({
  template,
  onClose,
  onSuccess,
}) => {
  const { athletes } = useAthletes();
  const { assignTemplateToAthletes } = useWorkoutPlans();

  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));

  const filteredAthletes = useMemo(() => {
    if (!search.trim()) return athletes;
    const q = search.toLowerCase();
    return athletes.filter(
      (a) =>
        a.fullName.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q)
    );
  }, [athletes, search]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === filteredAthletes.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAthletes.map((a) => a.id));
    }
  };

  const handleAssign = () => {
    if (selectedIds.length === 0) return;
    const targetAthletes = athletes
      .filter((a) => selectedIds.includes(a.id))
      .map((a) => ({ id: a.id, fullName: a.fullName }));

    assignTemplateToAthletes(template.id, targetAthletes, startDate);
    const names = targetAthletes.map((t) => t.fullName).join(', ');
    onSuccess(targetAthletes.length, names);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Box */}
      <div className="relative bg-[#1a1d24] border border-slate-700/60 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Gold Gradient Bar */}
        <div className="h-1 bg-gradient-to-r from-[var(--color-primary)] to-amber-500" />

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-700/50">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 uppercase tracking-wider flex items-center gap-1">
                <Zap className="w-3 h-3" /> Assegnazione Rapida
              </span>
            </div>
            <h2 className="text-lg font-bold text-white">Assegna "{template.name}"</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Seleziona gli atleti a cui duplicare questo Modello Master.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
          {/* Start date selection */}
          <div className="bg-slate-800/40 p-3.5 border border-slate-700/50 rounded-xl flex items-center justify-between gap-4">
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                Data di Inizio Scheda
              </label>
              <span className="text-[11px] text-slate-400">
                Durata: {template.durationWeeks} settimane
              </span>
            </div>
            <input
              type="date"
              className="bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--color-primary)]"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {/* Search and Select All */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                className="w-full bg-slate-800/40 border border-slate-700/60 text-slate-100 rounded-xl pl-10 pr-4 py-2 text-xs placeholder-slate-500 focus:outline-none focus:border-[var(--color-primary)] transition-all"
                placeholder="Cerca atleta..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {filteredAthletes.length > 0 && (
              <button
                onClick={toggleAll}
                className="text-xs font-semibold text-[var(--color-primary)] hover:underline shrink-0"
              >
                {selectedIds.length === filteredAthletes.length
                  ? 'Deseleziona Tutti'
                  : 'Seleziona Tutti'}
              </button>
            )}
          </div>

          {/* Athletes List */}
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
            {filteredAthletes.length === 0 ? (
              <div className="p-4 text-center text-slate-500 text-xs">
                Nessun atleta trovato nel sistema.
              </div>
            ) : (
              filteredAthletes.map((athlete) => {
                const isSelected = selectedIds.includes(athlete.id);
                return (
                  <button
                    key={athlete.id}
                    onClick={() => toggleSelect(athlete.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/50 text-white'
                        : 'bg-slate-800/30 border-slate-700/40 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-black shrink-0 ${
                          isSelected ? 'bg-[var(--color-primary)]' : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {athlete.firstName[0]}
                        {athlete.lastName[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate text-white">
                          {athlete.fullName}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {athlete.email || 'Nessuna email'}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-black'
                          : 'border-slate-600 bg-slate-800'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 p-2.5 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 rounded-xl text-xs text-[var(--color-primary)]">
              <Users className="w-4 h-4 shrink-0" />
              <span>
                Hai selezionato <strong>{selectedIds.length}</strong>{' '}
                {selectedIds.length === 1 ? 'atleta' : 'atleti'}. Verrà creata una copia della scheda per ognuno.
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-700/50 bg-slate-900/40">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-800 transition-all"
          >
            Annulla
          </button>
          <button
            onClick={handleAssign}
            disabled={selectedIds.length === 0}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-black transition-all ${
              selectedIds.length > 0
                ? 'bg-[var(--color-primary)] hover:brightness-110 shadow-lg shadow-[var(--color-primary)]/20 cursor-pointer'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Zap className="w-4 h-4" />
            Conferma Assegnazione ({selectedIds.length})
          </button>
        </div>
      </div>
    </div>
  );
};
