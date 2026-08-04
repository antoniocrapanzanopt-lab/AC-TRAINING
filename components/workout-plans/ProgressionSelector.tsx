import React, { useState, useMemo } from 'react';
import {
  TrendingUp, Plus, Search, X, Trash2
} from 'lucide-react';
import {
  ProgressionScheme, ProgressionWeek, ProgressionType, ProgressionSchemeFormData, ExerciseSetParams
} from '../../types';
import { getProgressionSchemes, saveProgressionScheme } from '../../services/progressionService';

interface ProgressionSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseName: string;
  currentSchemeId?: string;
  onApplyScheme: (scheme: ProgressionScheme) => void;
  onRemoveScheme: () => void;
}

/**
 * Genera l'autocompilazione delle settimane per un esercizio in base allo schema di progressione scelto.
 */
export function compileExerciseWeeklyProgression(
  exerciseParams: ExerciseSetParams,
  scheme: ProgressionScheme,
  durationWeeks: number
): {
  progressionSchemeId: string;
  progressionSchemeName: string;
  progressionWeeks: ProgressionWeek[];
  params: ExerciseSetParams;
  notes: string;
} {
  const compiledWeeks: ProgressionWeek[] = Array.from(
    { length: Math.max(1, durationWeeks) },
    (_, i) => {
      const schemeWeek = scheme.weeks[i] || scheme.weeks[scheme.weeks.length - 1];
      const repsParsed = schemeWeek?.targetReps ? parseInt(schemeWeek.targetReps) : NaN;
      const repsVal = isNaN(repsParsed) ? exerciseParams.repsMin : repsParsed;

      return {
        weekNumber: i + 1,
        sets: schemeWeek?.sets ?? exerciseParams.sets,
        targetReps: schemeWeek?.targetReps || `${repsVal}`,
        percentage: schemeWeek?.percentage,
        targetRIR: schemeWeek?.targetRIR ?? exerciseParams.rir,
        targetRPE: schemeWeek?.targetRPE,
        notes: schemeWeek?.notes || `Settimana ${i + 1}`,
      };
    }
  );

  const w1 = compiledWeeks[0];
  const w1RepsParsed = parseInt(w1.targetReps);
  const w1Reps = isNaN(w1RepsParsed) ? exerciseParams.repsMin : w1RepsParsed;

  return {
    progressionSchemeId: scheme.id,
    progressionSchemeName: scheme.name,
    progressionWeeks: compiledWeeks,
    params: {
      ...exerciseParams,
      sets: w1.sets || exerciseParams.sets,
      repsMin: w1Reps,
      repsMax: w1Reps,
      rir: w1.targetRIR ?? exerciseParams.rir,
    },
    notes: w1.notes ? `[Progressione: ${scheme.name}] ${w1.notes}` : `Progressione: ${scheme.name}`,
  };
}

export const ProgressionSelector: React.FC<ProgressionSelectorProps> = ({
  isOpen,
  onClose,
  exerciseName,
  currentSchemeId,
  onApplyScheme,
  onRemoveScheme,
}) => {
  const [activeTab, setActiveTab] = useState<'library' | 'custom'>('library');
  const [schemes, setSchemes] = useState<ProgressionScheme[]>(() => getProgressionSchemes());
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<ProgressionType | 'all'>('all');

  // Form per creare una progressione custom al volo
  const [customForm, setCustomForm] = useState<ProgressionSchemeFormData>({
    name: '',
    type: 'volume',
    discipline: 'Powerbuilding',
    description: '',
    weeks: [
      { weekNumber: 1, sets: 3, targetReps: '8', targetRIR: 3, notes: 'Settimana 1: Accumulo' },
      { weekNumber: 2, sets: 4, targetReps: '8', targetRIR: 2, notes: 'Settimana 2: Aumento Volume' },
      { weekNumber: 3, sets: 4, targetReps: '8', targetRIR: 1, notes: 'Settimana 3: Intensificazione' },
      { weekNumber: 4, sets: 3, targetReps: '8', targetRIR: 4, notes: 'Settimana 4: Scarico (Deload)' },
    ],
  });

  const filteredSchemes = useMemo(() => {
    return schemes.filter((s) => {
      const q = search.toLowerCase().trim();
      if (q && !s.name.toLowerCase().includes(q) && !s.description?.toLowerCase().includes(q)) {
        return false;
      }
      if (selectedType !== 'all' && s.type !== selectedType) return false;
      return true;
    });
  }, [schemes, search, selectedType]);

  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customForm.name.trim()) return;
    const created = saveProgressionScheme(customForm);
    setSchemes(getProgressionSchemes());
    onApplyScheme(created);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl bg-[#1a1d24] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* HEADER MODALE */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[var(--color-primary)]" />
            <div>
              <h3 className="font-bold text-white text-sm">Applica Schema di Progressione</h3>
              <p className="text-xs text-slate-400">Esercizio: <span className="text-white font-semibold">{exerciseName}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {/* TABS SELEZIONE / CREAZIONE */}
        <div className="flex border-b border-slate-800 bg-slate-950 px-4 pt-2">
          <button
            onClick={() => setActiveTab('library')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'library'
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            📚 Libreria Progressioni Salvate ({schemes.length})
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'custom'
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            ⚡ Crea Progressione Custom al Volo
          </button>
        </div>

        {/* CONTENUTO PRINCIPALE MODALE */}
        <div className="p-4 overflow-y-auto flex-1 custom-scrollbar space-y-4">
          {activeTab === 'library' ? (
            <>
              {/* FILTRI & RICERCA */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-[var(--color-primary)]"
                    placeholder="Cerca per nome o descrizione..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as any)}
                  className="bg-slate-900 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[var(--color-primary)]"
                >
                  <option value="all">Tutti i tipi di progressione</option>
                  <option value="volume">Volume / Serie (es. 2x8 -&gt; 4x8)</option>
                  <option value="carico">Carico / %1RM (+2.5kg / %1RM)</option>
                  <option value="rpe_rir">RPE / RIR (RIR 3 -&gt; RIR 0)</option>
                  <option value="ripetizioni">Ripetizioni (8 -&gt; 12 reps)</option>
                </select>
              </div>

              {/* PULSANTE RIMOZIONE SE APPLICATO */}
              {currentSchemeId && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between">
                  <span className="text-xs text-amber-300 font-medium">Una progressione è attualmente applicata a questo esercizio.</span>
                  <button
                    onClick={() => {
                      onRemoveScheme();
                      onClose();
                    }}
                    className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 text-xs font-bold transition-all"
                  >
                    Rimuovi Progressione
                  </button>
                </div>
              )}

              {/* GRID CARDS SCHEMI */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredSchemes.map((scheme) => {
                  const isSelected = currentSchemeId === scheme.id;
                  return (
                    <div
                      key={scheme.id}
                      className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${
                        isSelected
                          ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/30'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded">
                            {scheme.type}
                          </span>
                          {scheme.isPreset && (
                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                              Preset System
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-white text-xs">{scheme.name}</h4>
                        {scheme.description && (
                          <p className="text-[11px] text-slate-400 line-clamp-2">{scheme.description}</p>
                        )}
                      </div>

                      {/* ROADMAP SETTIMANE */}
                      <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-[10px] space-y-1">
                        {scheme.weeks.map((w) => (
                          <div key={w.weekNumber} className="flex items-center justify-between text-slate-300">
                            <span className="font-bold text-slate-400">Sett {w.weekNumber}:</span>
                            <span className="font-mono text-slate-200">
                              {w.sets} set x {w.targetReps} reps {w.percentage ? `@${w.percentage}%` : ''} {w.targetRIR !== undefined ? `(RIR ${w.targetRIR})` : ''}
                            </span>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => {
                          onApplyScheme(scheme);
                          onClose();
                        }}
                        className={`w-full py-2 rounded-xl font-bold text-xs transition-all ${
                          isSelected
                            ? 'bg-emerald-500 text-black shadow-md'
                            : 'bg-[var(--color-primary)] text-black hover:brightness-110 shadow-md'
                        }`}
                      >
                        {isSelected ? '✓ Progressione Attiva' : 'Applica all\'Esercizio'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            /* CREAZIONE PROGRESSIONE CUSTOM */
            <form onSubmit={handleSaveCustom} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Nome Progressione Custom *</label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[var(--color-primary)]"
                  placeholder="Es. Ramp 2x8 -> 4x8 + Incremento 2.5kg"
                  value={customForm.name}
                  onChange={(e) => setCustomForm({ ...customForm, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Tipo Progressione</label>
                  <select
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[var(--color-primary)]"
                    value={customForm.type}
                    onChange={(e) => setCustomForm({ ...customForm, type: e.target.value as ProgressionType })}
                  >
                    <option value="volume">Volume / Serie (2x8 -&gt; 4x8)</option>
                    <option value="carico">Carico / %1RM (+2.5kg / %1RM)</option>
                    <option value="rpe_rir">RPE / RIR (RIR 3 -&gt; RIR 0)</option>
                    <option value="ripetizioni">Ripetizioni (8 -&gt; 12 reps)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Disciplina / Ambito</label>
                  <input
                    type="text"
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[var(--color-primary)]"
                    value={customForm.discipline || ''}
                    onChange={(e) => setCustomForm({ ...customForm, discipline: e.target.value })}
                    placeholder="Es. Powerbuilding, Bodybuilding"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                <span className="text-xs font-bold text-white">Roadmap Settimanale ({customForm.weeks.length} Settimane)</span>
                <button
                  type="button"
                  onClick={() => {
                    const nextNum = customForm.weeks.length + 1;
                    const lastW = customForm.weeks[customForm.weeks.length - 1];
                    setCustomForm({
                      ...customForm,
                      weeks: [
                        ...customForm.weeks,
                        {
                          weekNumber: nextNum,
                          sets: lastW?.sets || 3,
                          targetReps: lastW?.targetReps || '8',
                          targetRIR: lastW?.targetRIR !== undefined ? Math.max(0, lastW.targetRIR - 1) : 2,
                          notes: `Settimana ${nextNum}`,
                        },
                      ],
                    });
                  }}
                  className="text-xs text-[var(--color-primary)] font-bold flex items-center gap-1 hover:brightness-125"
                >
                  <Plus className="w-3.5 h-3.5" /> Aggiungi Settimana
                </button>
              </div>

              <div className="space-y-2">
                {customForm.weeks.map((w, idx) => (
                  <div key={w.weekNumber} className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-2 text-xs">
                    <span className="w-6 h-6 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold text-xs flex items-center justify-center shrink-0">
                      S{w.weekNumber}
                    </span>

                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-500 font-bold">Set:</span>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        className="w-14 bg-slate-950 border border-slate-700 text-white rounded-lg p-1 text-center"
                        value={w.sets}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          const copy = [...customForm.weeks];
                          copy[idx] = { ...copy[idx], sets: val };
                          setCustomForm({ ...customForm, weeks: copy });
                        }}
                      />
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-500 font-bold">Reps:</span>
                      <input
                        type="text"
                        className="w-16 bg-slate-950 border border-slate-700 text-white rounded-lg p-1 text-center"
                        value={w.targetReps}
                        onChange={(e) => {
                          const copy = [...customForm.weeks];
                          copy[idx] = { ...copy[idx], targetReps: e.target.value };
                          setCustomForm({ ...customForm, weeks: copy });
                        }}
                      />
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-500 font-bold">RIR:</span>
                      <input
                        type="number"
                        min={0}
                        max={5}
                        className="w-14 bg-slate-950 border border-slate-700 text-white rounded-lg p-1 text-center"
                        value={w.targetRIR ?? 2}
                        onChange={(e) => {
                          const copy = [...customForm.weeks];
                          copy[idx] = { ...copy[idx], targetRIR: parseInt(e.target.value) || 0 };
                          setCustomForm({ ...customForm, weeks: copy });
                        }}
                      />
                    </div>

                    <input
                      type="text"
                      className="flex-1 bg-slate-950 border border-slate-700 text-white rounded-lg p-1 px-2.5"
                      value={w.notes || ''}
                      onChange={(e) => {
                        const copy = [...customForm.weeks];
                        copy[idx] = { ...copy[idx], notes: e.target.value };
                        setCustomForm({ ...customForm, weeks: copy });
                      }}
                      placeholder="Note settimana..."
                    />

                    {customForm.weeks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const copy = customForm.weeks
                            .filter((_, i) => i !== idx)
                            .map((item, i) => ({ ...item, weekNumber: i + 1 }));
                          setCustomForm({ ...customForm, weeks: copy });
                        }}
                        className="p-1 text-slate-500 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white">
                  Annulla
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs hover:brightness-110 shadow">
                  Salva in Libreria ed Applica
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
