import React, { useState, useEffect } from 'react';
import {
  TrendingUp, Plus, Trash2, Shield, X, Check, Dumbbell, AlertTriangle
} from 'lucide-react';
import {
  ProgressionScheme, ProgressionType, ProgressionWeek, ProgressionSchemeFormData
} from '../../types';
import {
  getProgressionSchemes, saveProgressionScheme, deleteProgressionScheme
} from '../../services/progressionService';
import { useToast } from '../../context/ToastContext';

const TYPE_LABELS: Record<ProgressionType, string> = {
  carico: 'Carico (% 1RM)',
  volume: 'Volume (Set x Rep)',
  rpe_rir: 'Intensità (RPE / RIR)',
  ripetizioni: 'Ripetizioni (Scalare/Crescente)',
};

const TYPE_COLORS: Record<ProgressionType, string> = {
  carico: '#f59e0b',     // Amber / Gold
  volume: '#3b82f6',     // Blue
  rpe_rir: '#ef4444',    // Red
  ripetizioni: '#10b981',// Green
};

export const ProgressionLibraryView: React.FC = () => {
  const { showSuccess, showInfo, showError } = useToast();
  const [schemes, setSchemes] = useState<ProgressionScheme[]>([]);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingScheme, setDeletingScheme] = useState<ProgressionScheme | null>(null);

  // Form State per la creazione di un nuovo schema
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<ProgressionType>('carico');
  const [formDiscipline, setFormDiscipline] = useState('Powerlifting / Powerbuilding');
  const [formDescription, setFormDescription] = useState('');
  const [formWeeks, setFormWeeks] = useState<ProgressionWeek[]>([
    { weekNumber: 1, percentage: 70, targetReps: '5', sets: 4, targetRIR: 2, notes: 'Settimana 1' },
    { weekNumber: 2, percentage: 75, targetReps: '5', sets: 4, targetRIR: 2, notes: 'Settimana 2' },
    { weekNumber: 3, percentage: 80, targetReps: '3', sets: 4, targetRIR: 1, notes: 'Settimana 3' },
    { weekNumber: 4, percentage: 60, targetReps: '5', sets: 3, targetRIR: 4, notes: 'Deload' },
  ]);

  const loadSchemes = () => {
    const list = getProgressionSchemes();
    setSchemes(list);
  };

  useEffect(() => {
    loadSchemes();
  }, []);

  const filteredSchemes = schemes.filter((s) => {
    if (selectedTypeFilter === 'all') return true;
    return s.type === selectedTypeFilter;
  });

  const handleAddWeek = () => {
    const nextWeekNum = formWeeks.length + 1;
    setFormWeeks([
      ...formWeeks,
      {
        weekNumber: nextWeekNum,
        percentage: 70,
        targetReps: '5',
        sets: 4,
        targetRIR: 2,
        notes: `Settimana ${nextWeekNum}`,
      },
    ]);
  };

  const handleRemoveWeek = (index: number) => {
    if (formWeeks.length <= 1) return;
    const updated = formWeeks
      .filter((_, i) => i !== index)
      .map((w, i) => ({ ...w, weekNumber: i + 1 }));
    setFormWeeks(updated);
  };

  const handleWeekChange = (index: number, field: keyof ProgressionWeek, value: string | number | undefined) => {
    const updated = [...formWeeks];
    updated[index] = { ...updated[index], [field]: value };
    setFormWeeks(updated);
  };

  const handleSaveNewScheme = () => {
    if (!formName.trim()) {
      showError('Errore Form', 'Inserisci un nome valido per lo schema di progressione.');
      return;
    }
    const data: ProgressionSchemeFormData = {
      name: formName,
      type: formType,
      discipline: formDiscipline,
      description: formDescription,
      weeks: formWeeks,
    };
    saveProgressionScheme(data);
    showSuccess('Schema Salvato', `"${formName}" è stato aggiunto alla Libreria Progressioni.`);
    setShowCreateModal(false);
    resetForm();
    loadSchemes();
  };

  const resetForm = () => {
    setFormName('');
    setFormType('carico');
    setFormDiscipline('Powerlifting / Powerbuilding');
    setFormDescription('');
    setFormWeeks([
      { weekNumber: 1, percentage: 70, targetReps: '5', sets: 4, targetRIR: 2, notes: 'Settimana 1' },
      { weekNumber: 2, percentage: 75, targetReps: '5', sets: 4, targetRIR: 2, notes: 'Settimana 2' },
      { weekNumber: 3, percentage: 80, targetReps: '3', sets: 4, targetRIR: 1, notes: 'Settimana 3' },
      { weekNumber: 4, percentage: 60, targetReps: '5', sets: 3, targetRIR: 4, notes: 'Deload' },
    ]);
  };

  const handleDeleteConfirm = () => {
    if (!deletingScheme) return;
    const res = deleteProgressionScheme(deletingScheme.id);
    if (res) {
      showInfo('Schema Eliminato', `"${deletingScheme.name}" è stato rimosso.`);
      loadSchemes();
    } else {
      showError('Impossibile Eliminare', 'Non è possibile eliminare uno schema preset di sistema.');
    }
    setDeletingScheme(null);
  };

  return (
    <div className="space-y-6">
      {/* Header & Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[var(--color-primary)]" />
            Libreria Progressioni (Powerlifting & Powerbuilding)
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Gestisci e applica schemi di progressione dinamici sui mesocicli dei tuoi atleti.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-primary)] text-black font-bold text-xs hover:brightness-110 transition-all shadow-lg shadow-[var(--color-primary)]/20 shrink-0"
        >
          <Plus className="w-4 h-4" /> Crea Schema di Progressione
        </button>
      </div>

      {/* Type Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedTypeFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            selectedTypeFilter === 'all'
              ? 'bg-[var(--color-primary)] text-black shadow-md'
              : 'bg-slate-800/60 border border-slate-700 text-slate-300 hover:bg-slate-800'
          }`}
        >
          Tutti ({schemes.length})
        </button>
        {(Object.keys(TYPE_LABELS) as ProgressionType[]).map((t) => {
          const count = schemes.filter((s) => s.type === t).length;
          const isSelected = selectedTypeFilter === t;
          const color = TYPE_COLORS[t];
          return (
            <button
              key={t}
              onClick={() => setSelectedTypeFilter(t)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-2 ${
                isSelected
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-slate-200'
              }`}
              style={{
                borderColor: isSelected ? color : undefined,
                color: isSelected ? '#ffffff' : undefined,
              }}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              {TYPE_LABELS[t]} ({count})
            </button>
          );
        })}
      </div>

      {/* Grid Schemi */}
      {filteredSchemes.length === 0 ? (
        <div className="text-center py-12 text-slate-500 bg-[#1a1d24] border border-slate-800 rounded-2xl">
          <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Nessuno schema di progressione trovato per i filtri selezionati.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredSchemes.map((scheme) => {
            const typeColor = TYPE_COLORS[scheme.type];
            return (
              <div
                key={scheme.id}
                className="relative bg-[#1a1d24] border border-slate-700/50 rounded-2xl p-5 hover:border-slate-600 transition-all flex flex-col justify-between"
              >
                {/* Top color indicator line */}
                <div
                  className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
                  style={{ backgroundColor: typeColor }}
                />

                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {scheme.isPreset && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <Shield className="w-3 h-3" /> PRESET SISTEMA
                          </span>
                        )}
                        <span
                          className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border"
                          style={{
                            backgroundColor: `${typeColor}15`,
                            color: typeColor,
                            borderColor: `${typeColor}30`,
                          }}
                        >
                          {TYPE_LABELS[scheme.type]}
                        </span>
                      </div>
                      <h3 className="text-white font-bold text-base">{scheme.name}</h3>
                      {scheme.discipline && (
                        <p className="text-slate-400 text-xs mt-0.5 flex items-center gap-1">
                          <Dumbbell className="w-3 h-3 text-slate-500" />
                          {scheme.discipline}
                        </p>
                      )}
                    </div>

                    {!scheme.isPreset && (
                      <button
                        onClick={() => setDeletingScheme(scheme)}
                        title="Elimina Schema"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {scheme.description && (
                    <p className="text-xs text-slate-300 mb-4 bg-slate-800/40 p-2.5 rounded-xl border border-slate-700/40">
                      {scheme.description}
                    </p>
                  )}

                  {/* Weekly Table Structure */}
                  <div className="overflow-x-auto rounded-xl border border-slate-700/50 bg-slate-900/40">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-800/60 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-700/50">
                        <tr>
                          <th className="px-3 py-2">Sett.</th>
                          <th className="px-3 py-2">% 1RM</th>
                          <th className="px-3 py-2">Target Reps</th>
                          <th className="px-3 py-2">Serie</th>
                          <th className="px-3 py-2">RIR/RPE</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-200">
                        {scheme.weeks.map((w) => (
                          <tr key={w.weekNumber} className="hover:bg-slate-800/30">
                            <td className="px-3 py-2 font-bold text-[var(--color-primary)]">
                              W{w.weekNumber}
                            </td>
                            <td className="px-3 py-2">
                              {w.percentage ? `${w.percentage}%` : '-'}
                            </td>
                            <td className="px-3 py-2 font-medium text-white">{w.targetReps}</td>
                            <td className="px-3 py-2">{w.sets ?? '-'}</td>
                            <td className="px-3 py-2">
                              {w.targetRIR !== undefined
                                ? `RIR ${w.targetRIR}`
                                : w.targetRPE !== undefined
                                ? `RPE ${w.targetRPE}`
                                : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Creazione Nuovo Schema */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-[#1a1d24] border border-slate-700/60 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="h-1 bg-gradient-to-r from-[var(--color-primary)] to-amber-500" />
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[var(--color-primary)]" />
                Crea Nuovo Schema di Progressione
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nome Schema *</label>
                  <input
                    className="w-full bg-slate-800/60 border border-slate-700 text-white rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                    placeholder="es. Onda 4-3-2 Powerbuilding"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Tipo Progressione</label>
                  <select
                    className="w-full bg-slate-800/60 border border-slate-700 text-white rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as ProgressionType)}
                  >
                    {(Object.keys(TYPE_LABELS) as ProgressionType[]).map((t) => (
                      <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Disciplina / Ambito</label>
                  <input
                    className="w-full bg-slate-800/60 border border-slate-700 text-white rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                    placeholder="es. Powerlifting, Bodybuilding"
                    value={formDiscipline}
                    onChange={(e) => setFormDiscipline(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Descrizione Breve</label>
                  <input
                    className="w-full bg-slate-800/60 border border-slate-700 text-white rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                    placeholder="es. 4 settimane di intensificazione progressiva"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                  />
                </div>
              </div>

              {/* Dynamic Weeks Editor */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Struttura Settimanale Mesociclo ({formWeeks.length} sett.)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddWeek}
                    className="text-xs font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Aggiungi Settimana
                  </button>
                </div>

                <div className="space-y-2">
                  {formWeeks.map((w, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-3 bg-slate-800/40 border border-slate-700/50 rounded-xl">
                      <span className="w-8 text-center text-xs font-extrabold text-[var(--color-primary)]">
                        W{w.weekNumber}
                      </span>
                      <input
                        type="number"
                        placeholder="% 1RM"
                        className="w-20 bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs"
                        value={w.percentage ?? ''}
                        onChange={(e) => handleWeekChange(idx, 'percentage', e.target.value ? Number(e.target.value) : undefined)}
                      />
                      <input
                        type="text"
                        placeholder="Reps (es. 5)"
                        className="flex-1 bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs"
                        value={w.targetReps}
                        onChange={(e) => handleWeekChange(idx, 'targetReps', e.target.value)}
                      />
                      <input
                        type="number"
                        placeholder="Serie"
                        className="w-16 bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs"
                        value={w.sets ?? ''}
                        onChange={(e) => handleWeekChange(idx, 'sets', e.target.value ? Number(e.target.value) : undefined)}
                      />
                      <input
                        type="number"
                        placeholder="RIR"
                        className="w-16 bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs"
                        value={w.targetRIR ?? ''}
                        onChange={(e) => handleWeekChange(idx, 'targetRIR', e.target.value ? Number(e.target.value) : undefined)}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveWeek(idx)}
                        disabled={formWeeks.length <= 1}
                        className="p-1 text-slate-500 hover:text-red-400 disabled:opacity-30"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-700/50 bg-slate-900/40">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-800"
              >
                Annulla
              </button>
              <button
                onClick={handleSaveNewScheme}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[var(--color-primary)] text-black text-xs font-bold hover:brightness-110"
              >
                <Check className="w-4 h-4" /> Salva Schema
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingScheme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setDeletingScheme(null)} />
          <div className="relative bg-[#1a1d24] border border-red-500/30 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-3 text-red-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Elimina Schema</h3>
            <p className="text-xs text-slate-400 mb-5">
              Confermi di voler eliminare dallo storage lo schema <span className="text-white font-semibold">"{deletingScheme.name}"</span>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingScheme(null)}
                className="flex-1 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-800"
              >
                Annulla
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 py-2 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600"
              >
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
