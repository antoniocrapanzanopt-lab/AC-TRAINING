import React, { useState, useMemo } from 'react';
import { X, Send, User, Search, Users, Check, Calendar } from 'lucide-react';
import { useAthletes } from '../../context/AthletesContext';
import { useWorkouts } from '../../context/WorkoutsContext';
import { useToast } from '../../context/ToastContext';
import { WorkoutTemplate } from '../../types/workout';

interface AssignWorkoutModalProps {
  workout: WorkoutTemplate;
  onClose: () => void;
}

export const AssignWorkoutModal: React.FC<AssignWorkoutModalProps> = ({ workout, onClose }) => {
  const { athletes } = useAthletes();
  const { assignWorkoutToAthletes, allAssignedWorkouts } = useWorkouts();
  const { showSuccess, showError } = useToast();

  const getTodayStr = () => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  };

  const getTomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const getNextMondayStr = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = (8 - day) % 7 || 7;
    d.setDate(d.getDate() + diff);
    return d.toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState<string>(getTodayStr());
  const [selectedAthleteIds, setSelectedAthleteIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'unassigned' | 'assigned'>('all');
  const [isAssigning, setIsAssigning] = useState(false);

  // 1. Filtra solo gli atleti operativi (attivi e in prova)
  const activeAthletes = useMemo(() => {
    return athletes.filter((a) => a.status === 'active' || a.status === 'trial');
  }, [athletes]);

  // 2. Identifica gli atleti che hanno già questa scheda assegnata attiva
  const assignedAthleteIds = useMemo(() => {
    return new Set(
      allAssignedWorkouts
        .filter((a) => a.workout_id === workout.id && a.is_active)
        .map((a) => a.athlete_id)
    );
  }, [allAssignedWorkouts, workout.id]);

  const currentlyAssignedAthletes = useMemo(() => {
    return activeAthletes.filter((a) => assignedAthleteIds.has(a.id));
  }, [activeAthletes, assignedAthleteIds]);

  // 3. Filtro di ricerca e categoria
  const filteredAthletes = useMemo(() => {
    return activeAthletes.filter((ath) => {
      const isAssigned = assignedAthleteIds.has(ath.id);

      if (filterMode === 'unassigned' && isAssigned) return false;
      if (filterMode === 'assigned' && !isAssigned) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const fullName = `${ath.firstName} ${ath.lastName}`.toLowerCase();
      const email = (ath.email || '').toLowerCase();
      return fullName.includes(q) || email.includes(q);
    });
  }, [activeAthletes, assignedAthleteIds, filterMode, searchQuery]);

  // Toggle selezione singolo atleta
  const toggleAthlete = (id: string) => {
    setSelectedAthleteIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Seleziona / Deseleziona tutti i filtrati
  const handleSelectAllFiltered = () => {
    const filteredIds = filteredAthletes.map((a) => a.id);
    const allSelected = filteredIds.every((id) => selectedAthleteIds.includes(id));

    if (allSelected) {
      // Rimuovi quelli filtrati
      setSelectedAthleteIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      // Aggiungi tutti quelli filtrati
      const next = new Set([...selectedAthleteIds, ...filteredIds]);
      setSelectedAthleteIds(Array.from(next));
    }
  };

  // Seleziona tutti i non ancora assegnati
  const handleSelectAllUnassigned = () => {
    const unassignedIds = activeAthletes.filter((a) => !assignedAthleteIds.has(a.id)).map((a) => a.id);
    setSelectedAthleteIds(unassignedIds);
  };

  const handleAssign = async () => {
    if (selectedAthleteIds.length === 0) {
      showError('Seleziona almeno un atleta a cui assegnare la scheda');
      return;
    }

    setIsAssigning(true);
    try {
      const { success, error } = await assignWorkoutToAthletes(selectedAthleteIds, workout.id, startDate);
      if (!success) throw new Error(error);

      showSuccess(
        selectedAthleteIds.length === 1
          ? 'Scheda assegnata con successo!'
          : `Scheda assegnata a ${selectedAthleteIds.length} atleti con successo!`
      );
      onClose();
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Errore sconosciuto';
      showError(`Errore durante l'assegnazione: ${msg}`);
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-panel-border)] bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)] shadow-sm">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Assegna Scheda</h2>
              <p className="text-xs text-slate-400">Scegli a chi inviare il programma e la data di inizio</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white transition-colors rounded-xl hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Scrollable */}
        <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          
          {/* Card Info Scheda in assegnazione */}
          <div className="bg-slate-900/70 border border-slate-800/80 p-4 rounded-2xl space-y-1 shadow-inner">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-amber-400 uppercase font-black tracking-wider">
                Stai assegnando:
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                {workout.total_weeks || 1} sett.
              </span>
            </div>
            <p className="text-white font-black text-base">{workout.title}</p>
            {workout.description && <p className="text-xs text-slate-400 leading-relaxed">{workout.description}</p>}
          </div>

          {/* Sezione: Data di Inizio Programmazione */}
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-3 shadow-inner">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Data Inizio Programmazione
              </label>
              <span className="text-[10px] text-slate-300 font-mono font-bold bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
                {new Date(startDate).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full sm:flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 transition-colors font-mono cursor-pointer"
              />
              <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setStartDate(getTodayStr())}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                    startDate === getTodayStr()
                      ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-sm'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  Oggi
                </button>
                <button
                  type="button"
                  onClick={() => setStartDate(getTomorrowStr())}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                    startDate === getTomorrowStr()
                      ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-sm'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  Domani
                </button>
                <button
                  type="button"
                  onClick={() => setStartDate(getNextMondayStr())}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                    startDate === getNextMondayStr()
                      ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-sm'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  Lun. Prossimo
                </button>
              </div>
            </div>
          </div>

          {/* Banner Atleti che stanno già usando la scheda */}
          {currentlyAssignedAthletes.length > 0 && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  Atleti che hanno già questa scheda ({currentlyAssignedAthletes.length}):
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto custom-scrollbar pr-1">
                {currentlyAssignedAthletes.map((ath) => (
                  <span
                    key={ath.id}
                    className="text-[11px] font-bold px-2.5 py-1 bg-amber-500/20 text-amber-300 rounded-xl flex items-center gap-1 border border-amber-500/30"
                  >
                    <User className="w-3 h-3 text-amber-400" />
                    {ath.firstName} {ath.lastName}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Barra Ricerca & Filtri */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-black text-slate-300 uppercase tracking-wider">
                Seleziona Atleti ({selectedAthleteIds.length} selezionati)
              </label>
              {selectedAthleteIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedAthleteIds([])}
                  className="text-[11px] font-bold text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                >
                  Deseleziona tutti
                </button>
              )}
            </div>

            {/* Input Cerca */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cerca atleta per nome o email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filtri Rapidi & Selezione Massiva */}
            <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                    filterMode === 'all'
                      ? 'bg-slate-700 text-white'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  Tutti ({activeAthletes.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('unassigned')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                    filterMode === 'unassigned'
                      ? 'bg-slate-700 text-white'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  Non assegnati ({activeAthletes.length - currentlyAssignedAthletes.length})
                </button>
              </div>

              <div className="flex items-center gap-1.5 ml-auto flex-wrap">
                {activeAthletes.length - currentlyAssignedAthletes.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAllUnassigned}
                    className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
                  >
                    Seleziona non assegnati
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="px-2.5 py-1 bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/30 rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
                >
                  {filteredAthletes.length > 0 &&
                  filteredAthletes.every((a) => selectedAthleteIds.includes(a.id))
                    ? 'Deseleziona visibili'
                    : 'Seleziona visibili'}
                </button>
              </div>
            </div>
          </div>

          {/* Lista Atleti Interattiva con Checkbox */}
          <div className="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar pr-1">
            {filteredAthletes.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center space-y-1">
                <p className="text-xs font-bold text-slate-400">Nessun atleta trovato con i filtri correnti.</p>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-[11px] text-[var(--color-primary)] font-bold underline cursor-pointer"
                  >
                    Resetta ricerca
                  </button>
                )}
              </div>
            ) : (
              filteredAthletes.map((athlete) => {
                const isSelected = selectedAthleteIds.includes(athlete.id);
                const isAlreadyAssigned = assignedAthleteIds.has(athlete.id);

                return (
                  <div
                    key={athlete.id}
                    onClick={() => toggleAthlete(athlete.id)}
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all cursor-pointer select-none ${
                      isSelected
                        ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/60 text-white shadow-sm ring-1 ring-[var(--color-primary)]/30'
                        : 'bg-slate-950/70 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Checkbox */}
                      <div
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors shrink-0 ${
                          isSelected
                            ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-slate-950'
                            : 'border-slate-700 bg-slate-900'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>

                      {/* Avatar & Nome */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-white truncate">
                            {athlete.firstName} {athlete.lastName}
                          </span>
                          {athlete.status === 'trial' && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Prova
                            </span>
                          )}
                        </div>
                        {athlete.email && (
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">{athlete.email}</p>
                        )}
                      </div>
                    </div>

                    {/* Badge Stato Assegnazione */}
                    <div className="shrink-0">
                      {isAlreadyAssigned ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 whitespace-nowrap">
                          Già attiva
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800 whitespace-nowrap">
                          Disponibile
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-[var(--color-panel-border)] bg-slate-950/80 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            {selectedAthleteIds.length > 0 ? (
              <span className="font-bold text-white">
                {selectedAthleteIds.length}{' '}
                {selectedAthleteIds.length === 1 ? 'atleta selezionato' : 'atleti selezionati'}
              </span>
            ) : (
              <span>Nessun atleta selezionato</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-300 hover:text-white transition-colors cursor-pointer rounded-xl hover:bg-slate-900"
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={handleAssign}
              disabled={isAssigning || selectedAthleteIds.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-[var(--color-primary)] text-slate-950 text-xs font-black rounded-xl hover:bg-[var(--color-primary-hover)] transition-all shadow-lg shadow-[var(--color-primary)]/10 disabled:opacity-40 disabled:hover:bg-[var(--color-primary)] cursor-pointer active:scale-95"
            >
              {isAssigning ? (
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>
                {isAssigning
                  ? 'Assegnazione in corso...'
                  : selectedAthleteIds.length > 1
                  ? `Assegna a ${selectedAthleteIds.length} Atleti`
                  : 'Conferma e Assegna'}
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
