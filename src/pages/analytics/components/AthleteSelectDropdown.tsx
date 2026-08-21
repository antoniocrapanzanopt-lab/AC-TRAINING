import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Check, Dumbbell, AlertCircle } from 'lucide-react';
import { Athlete, AthleteReportSummary } from '../../../types';

interface AthleteSelectDropdownProps {
  athletes: Athlete[];
  selectedAthleteId: string;
  onSelectAthlete: (athleteId: string) => void;
  athletesReports?: AthleteReportSummary[];
}

export const AthleteSelectDropdown: React.FC<AthleteSelectDropdownProps> = ({
  athletes,
  selectedAthleteId,
  onSelectAthlete,
  athletesReports,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Chiudi quando si clicca all'esterno
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Atleta attualmente selezionato
  const currentAthlete = useMemo(() => {
    return athletes.find((a) => a.id === selectedAthleteId) || null;
  }, [athletes, selectedAthleteId]);

  const currentSafeName = useMemo(() => {
    if (!currentAthlete) return 'Seleziona Atleta';
    return (
      currentAthlete.fullName ||
      [currentAthlete.firstName, currentAthlete.lastName].filter(Boolean).join(' ') ||
      currentAthlete.email ||
      'Atleta'
    );
  }, [currentAthlete]);

  const currentInitials = useMemo(() => {
    return (
      currentSafeName
        .split(' ')
        .map((n) => n[0])
        .filter(Boolean)
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'AT'
    );
  }, [currentSafeName]);

  // Filtro ricerca atleti
  const filteredAthletes = useMemo(() => {
    return athletes.filter((a) => {
      const name = (
        a.fullName ||
        [a.firstName, a.lastName].filter(Boolean).join(' ') ||
        a.email ||
        ''
      ).toLowerCase();
      return name.includes(searchQuery.toLowerCase().trim());
    });
  }, [athletes, searchQuery]);

  return (
    <div className="relative inline-block text-left w-full sm:w-auto" ref={dropdownRef}>
      {/* ─── BOTTONE TRIGGER CUSTOM ─── */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full sm:min-w-[260px] pl-3 pr-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-700 hover:border-[var(--color-primary)] text-white text-xs font-black flex items-center justify-between gap-2.5 transition-all shadow-inner cursor-pointer"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-[var(--color-primary)] text-slate-950 font-black text-[10px] flex items-center justify-center shrink-0 shadow-sm">
            {currentInitials}
          </div>
          <span className="truncate block font-bold text-white text-xs">{currentSafeName}</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[var(--color-primary)]' : ''
          }`}
        />
      </button>

      {/* ─── POPOVER MENU LISTA ATLETI ─── */}
      {isOpen && (
        <div className="absolute right-0 sm:right-auto sm:left-0 mt-2 w-full sm:w-[320px] max-h-[380px] rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl shadow-black/80 z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
          
          {/* Header & Barra di Ricerca */}
          <div className="p-2.5 border-b border-slate-800 bg-slate-950/80">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Cerca atleta..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
          </div>

          {/* Lista Atleti Scorrevole */}
          <div className="overflow-y-auto max-h-[300px] p-1.5 space-y-1 no-scrollbar">
            {filteredAthletes.length === 0 ? (
              <div className="py-6 text-center text-slate-500 text-xs font-medium">
                Nessun atleta trovato per "{searchQuery}"
              </div>
            ) : (
              filteredAthletes.map((a) => {
                const isSelected = a.id === selectedAthleteId;
                const safeName =
                  a.fullName ||
                  [a.firstName, a.lastName].filter(Boolean).join(' ') ||
                  a.email ||
                  'Atleta';

                const initials =
                  safeName
                    .split(' ')
                    .map((n) => n[0])
                    .filter(Boolean)
                    .join('')
                    .toUpperCase()
                    .slice(0, 2) || 'AT';

                // Report atleta se disponibile
                const report = athletesReports?.find((r) => r.athleteId === a.id);

                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      onSelectAthlete(a.id);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    className={`w-full p-2 rounded-xl text-left transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/40 text-white'
                        : 'hover:bg-slate-800 text-slate-300 hover:text-white border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${
                          isSelected
                            ? 'bg-[var(--color-primary)] text-slate-950 font-black'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {initials}
                      </div>

                      <div className="min-w-0">
                        <span className="text-xs font-black block truncate leading-snug">
                          {safeName}
                        </span>
                        {report && (
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                            {report.programStatus === 'unassigned' ? (
                              <span className="text-amber-400 font-bold flex items-center gap-0.5">
                                <AlertCircle className="w-2.5 h-2.5" /> Senza Scheda
                              </span>
                            ) : (
                              <span className="truncate flex items-center gap-1 text-slate-400">
                                <Dumbbell className="w-2.5 h-2.5 text-slate-500" />
                                {report.workoutTitle}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-[var(--color-primary)] shrink-0 stroke-[3]" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Info Conteggio */}
          <div className="p-2 border-t border-slate-800/80 bg-slate-950/60 text-[10px] text-slate-500 font-bold text-center">
            {filteredAthletes.length} di {athletes.length} atleti disponibili
          </div>
        </div>
      )}
    </div>
  );
};
