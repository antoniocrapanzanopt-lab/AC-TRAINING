import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  Check,
  Copy,
  Layers,
  Filter,
  Calendar,
} from 'lucide-react';
import { useProgressions } from '../../../context/ProgressionsContext';
import { ProgressionRuleTemplate, ProgressionMethod } from '../../../types/progression';
import { WeeklyProgressionTimeline } from '../../progressions/WeeklyProgressionTimeline';

interface ExistingProgressionPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseName?: string;
  currentTarget?: {
    sets?: number;
    reps?: string;
    load_kg?: number;
    rir?: string;
    rest_seconds?: number;
  };
  onApplyTemplate: (
    template: ProgressionRuleTemplate,
    mode: 'linked_template' | 'custom_rule'
  ) => void;
}

export const ExistingProgressionPickerModal: React.FC<ExistingProgressionPickerModalProps> = ({
  isOpen,
  onClose,
  exerciseName = '',
  currentTarget,
  onApplyTemplate,
}) => {
  const { templates } = useProgressions();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [previewingTemplate, setPreviewingTemplate] = useState<ProgressionRuleTemplate | null>(null);

  const categories = [
    { id: 'all', label: 'Tutti i Protocolli' },
    { id: 'ipertrofia', label: 'Ipertrofia & Volume' },
    { id: 'forza', label: 'Forza & Carico' },
    { id: 'densita', label: 'Densità & Tempo' },
    { id: 'deload', label: 'Scarico & Recupero' },
  ];

  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      const matchSearch =
        !searchTerm.trim() ||
        tpl.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tpl.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tpl.method.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCat =
        selectedCategory === 'all' ||
        tpl.category.toLowerCase() === selectedCategory.toLowerCase() ||
        (selectedCategory === 'forza' && tpl.method === 'linear_load') ||
        (selectedCategory === 'ipertrofia' && (tpl.method === 'double_progression' || tpl.method === 'linear_reps')) ||
        (selectedCategory === 'densita' && (tpl.method === 'density_progression' || tpl.method === 'tut_progression')) ||
        (selectedCategory === 'deload' && tpl.method === 'deload');

      return matchSearch && matchCat;
    });
  }, [templates, searchTerm, selectedCategory]);

  if (!isOpen) return null;

  const getMethodBadge = (method: ProgressionMethod) => {
    switch (method) {
      case 'double_progression':
        return { label: 'Doppia Progressione', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
      case 'linear_load':
        return { label: 'Carico Lineare', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' };
      case 'linear_reps':
        return { label: 'Ripetizioni Lineari', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
      case 'rir_progression':
      case 'rpe_progression':
        return { label: 'Intensità RIR/RPE', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' };
      case 'density_progression':
        return { label: 'Densità & Rest', color: 'text-orange-400 bg-orange-500/10 border-orange-500/30' };
      case 'deload':
        return { label: 'Deload Programmato', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' };
      default:
        return { label: method, color: 'text-slate-400 bg-slate-800 border-slate-700' };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl max-h-[90vh] shadow-2xl z-10 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Seleziona Progressione Esistente</h2>
              <p className="text-xs text-slate-400">
                Esercizio target: <span className="font-bold text-[var(--color-primary)]">{exerciseName || 'Esercizio Selezionato'}</span>
                {currentTarget?.reps && (
                  <span className="ml-2 text-slate-500">
                    ({currentTarget.sets || 3} set × {currentTarget.reps} @ {currentTarget.load_kg || 0} kg)
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/60 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cerca template per nome, metodo o obiettivo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-[var(--color-primary)] text-black shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid List OR Selected Weekly Preview */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {previewingTemplate ? (
            /* Live Weekly Projection for Template */
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center font-bold">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">{previewingTemplate.name}</h3>
                    <p className="text-xs text-slate-400">{previewingTemplate.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewingTemplate(null)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Torna all'Elenco
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onApplyTemplate(previewingTemplate, 'linked_template');
                      onClose();
                    }}
                    className="px-4 py-1.5 bg-[var(--color-primary)] text-black font-bold text-xs rounded-xl shadow-md cursor-pointer"
                  >
                    Applica Template
                  </button>
                </div>
              </div>

              <WeeklyProgressionTimeline
                ruleOrTemplate={previewingTemplate}
                baseTarget={{
                  sets: currentTarget?.sets || 3,
                  reps: currentTarget?.reps || '8-10',
                  load_kg: currentTarget?.load_kg || 60,
                  rir: currentTarget?.rir || 'RIR 2',
                  rest_seconds: currentTarget?.rest_seconds || 90,
                  tut: '3-0-1-0',
                }}
                totalWeeks={previewingTemplate.max_steps || 6}
              />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <Filter className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-400">Nessun protocollo trovato</p>
              <p className="text-xs text-slate-500">Prova a modificare i filtri o la ricerca.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTemplates.map((tpl) => {
                const badge = getMethodBadge(tpl.method);
                return (
                  <div
                    key={tpl.id}
                    className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-[var(--color-primary)]/50 transition-all flex flex-col justify-between group shadow-sm hover:shadow-lg hover:shadow-[var(--color-primary)]/5"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.color}`}>
                          {badge.label}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">
                          {tpl.max_steps} Settimane
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-white group-hover:text-[var(--color-primary)] transition-colors mb-1.5">
                        {tpl.name}
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed mb-4">
                        {tpl.description}
                      </p>

                      {/* Regole Chiave */}
                      <div className="p-3 bg-slate-900 rounded-xl border border-slate-800/80 space-y-1.5 text-[11px] mb-4">
                        <div className="flex justify-between text-slate-300">
                          <span className="text-slate-500">Incremento:</span>
                          <span className="font-bold text-[var(--color-primary)]">
                            {tpl.increments.load_increment_kg
                              ? `+${tpl.increments.load_increment_kg} kg`
                              : tpl.increments.reps_increment
                              ? `+${tpl.increments.reps_increment} reps`
                              : tpl.increments.rest_reduction_seconds
                              ? `-${tpl.increments.rest_reduction_seconds}s rec`
                              : 'Personalizzato'}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span className="text-slate-500">Condizione Successo:</span>
                          <span className="font-bold text-slate-300">
                            {tpl.conditions.consecutive_success_sessions} seduta a target
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span className="text-slate-500">Filtro Dolore:</span>
                          <span className="font-bold text-rose-400">
                            Stop se &gt; {tpl.conditions.pain_threshold_max}/10
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/60">
                      <button
                        type="button"
                        onClick={() => setPreviewingTemplate(tpl)}
                        className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                        title="Visualizza la proiezione settimana per settimana di questo template"
                      >
                        <Calendar className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                        Vedi Settimane
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onApplyTemplate(tpl, 'linked_template');
                          onClose();
                        }}
                        className="flex-1 py-2 px-3 bg-[var(--color-primary)] text-black hover:bg-[var(--color-primary-hover)] text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Applica (1-Click)
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onApplyTemplate(tpl, 'custom_rule');
                          onClose();
                        }}
                        className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                        title="Crea una copia modificabile per questo esercizio"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Duplica
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between text-xs text-slate-500">
          <span>{filteredTemplates.length} protocolli disponibili</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-colors cursor-pointer"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
