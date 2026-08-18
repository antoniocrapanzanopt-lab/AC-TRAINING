import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  Filter,
  Copy,
  Calendar,
  Sparkles,
  User,
  Shield,
  Trash2,
  CheckCircle2,
  Clock,
  Layers,
  Plus,
  MoreVertical,
  Sliders,
  TrendingUp,
  X,
} from 'lucide-react';
import { useProgressions } from '../../context/ProgressionsContext';
import { ProgressionRuleTemplate, ProgressionMethod } from '../../types/progression';
import { WeeklyProgressionTimeline } from './WeeklyProgressionTimeline';

type TemplateTab = 'all' | 'mine' | 'ai' | 'system';

interface ProgressionLibraryPageProps {
  onSelectTemplate: (template: ProgressionRuleTemplate) => void;
  onDuplicateTemplate: (template: ProgressionRuleTemplate) => void;
  onNewTemplateClick?: () => void;
  highlightedTemplateId?: string | null;
}

// ─── Card Overflow Menu ───────────────────────────────────────────────────────

interface CardMenuProps {
  isDeletable: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onPreview: () => void;
  onDelete: () => void;
  isPreviewing: boolean;
}

const CardMenu: React.FC<CardMenuProps> = ({
  isDeletable, onEdit, onDuplicate, onPreview, onDelete, isPreviewing,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const act = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(false);
    fn();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
        className={`p-2 rounded-xl transition-all ${open ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}
        aria-label="Azioni template"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 bottom-full mb-1 w-52 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-30 py-1 overflow-hidden">
          <button onClick={act(onPreview)} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors text-left">
            <Calendar className="w-4 h-4 text-[var(--color-primary)]" />
            {isPreviewing ? 'Chiudi anteprima' : 'Visualizza settimane'}
          </button>
          <button onClick={act(onEdit)} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors text-left">
            <Sliders className="w-4 h-4 text-slate-400" />
            Modifica template
          </button>
          <button onClick={act(onDuplicate)} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors text-left">
            <Copy className="w-4 h-4 text-slate-400" />
            Duplica template
          </button>
          {isDeletable && (
            <>
              <div className="border-t border-slate-800 my-1" />
              <button onClick={act(onDelete)} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors text-left">
                <Trash2 className="w-4 h-4" />
                Elimina template
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Componente Principale ────────────────────────────────────────────────────

export const ProgressionLibraryPage: React.FC<ProgressionLibraryPageProps> = ({
  onSelectTemplate,
  onDuplicateTemplate,
  onNewTemplateClick,
  highlightedTemplateId,
}) => {
  const { templates, deleteCustomTemplate } = useProgressions();

  const [activeTab, setActiveTab] = useState<TemplateTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [previewingTemplateId, setPreviewingTemplateId] = useState<string | null>(null);

  // ─── Utils ─────────────────────────────────────────────────────────────────

  const getTemplateOrigin = (tpl: ProgressionRuleTemplate): 'coach' | 'ai' | 'system' => {
    if (tpl.source === 'ai' || tpl.id.includes('ai') || tpl.name.startsWith('AI:')) return 'ai';
    if (
      tpl.source === 'coach' ||
      tpl.id.startsWith('custom-') ||
      tpl.id.startsWith('tpl-custom') ||
      tpl.category === 'Personalizzato'
    ) return 'coach';
    return 'system';
  };

  const counts = useMemo(() => {
    let mine = 0, ai = 0, system = 0;
    templates.forEach(tpl => {
      const origin = getTemplateOrigin(tpl);
      if (origin === 'coach') mine++;
      else if (origin === 'ai') ai++;
      else system++;
    });
    return { all: templates.length, mine, ai, system };
  }, [templates]);

  const categories = ['all', 'Forza', 'Ipertrofia', 'Resistenza', 'Riabilitazione', 'Personalizzato'];

  const filteredTemplates = useMemo(() => {
    return templates
      .filter(tpl => {
        const origin = getTemplateOrigin(tpl);
        if (activeTab === 'mine' && origin !== 'coach') return false;
        if (activeTab === 'ai' && origin !== 'ai') return false;
        if (activeTab === 'system' && origin !== 'system') return false;
        if (selectedCategory !== 'all' && tpl.category !== selectedCategory) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const match =
            tpl.name.toLowerCase().includes(q) ||
            tpl.description.toLowerCase().includes(q) ||
            tpl.method.toLowerCase().includes(q) ||
            (tpl.objective && tpl.objective.toLowerCase().includes(q));
          if (!match) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.id === highlightedTemplateId) return -1;
        if (b.id === highlightedTemplateId) return 1;
        const timeA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const timeB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return timeB - timeA;
      });
  }, [templates, activeTab, selectedCategory, searchQuery, highlightedTemplateId]);

  // ─── Badge helpers ─────────────────────────────────────────────────────────

  const getMethodBadge = (method: ProgressionMethod) => {
    const map: Record<string, { label: string; color: string }> = {
      double_progression: { label: 'Doppia Prog.', color: 'bg-amber-500/10 text-amber-300 border-amber-500/20' },
      linear_load:       { label: 'Carico Lineare', color: 'bg-sky-500/10 text-sky-300 border-sky-500/20' },
      rir_progression:   { label: 'Intensità RIR', color: 'bg-purple-500/10 text-purple-300 border-purple-500/20' },
      density_progression: { label: 'Densità & Rest', color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' },
      linear_sets:       { label: 'Volume Serie', color: 'bg-blue-500/10 text-blue-300 border-blue-500/20' },
      linear_reps:       { label: 'Incr. Reps', color: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' },
      tut_progression:   { label: 'TUT & Tempo', color: 'bg-violet-500/10 text-violet-300 border-violet-500/20' },
      deload:            { label: 'Deload', color: 'bg-teal-500/10 text-teal-300 border-teal-500/20' },
    };
    return map[method] ?? { label: 'Personalizzato', color: 'bg-slate-800 text-slate-400 border-slate-700' };
  };

  // Estrae il parametro chiave più significativo del template
  const getKeyMetric = (tpl: ProgressionRuleTemplate): { label: string; value: string; color: string } | null => {
    const { increments } = tpl;
    if (increments.load_increment_kg) {
      return { label: 'Carico', value: `+${increments.load_increment_kg} kg/step`, color: 'text-sky-400' };
    }
    if (increments.reps_increment) {
      return { label: 'Reps', value: `+${increments.reps_increment} rep (max ${increments.reps_max_cap || 12})`, color: 'text-amber-400' };
    }
    if (increments.rest_reduction_seconds) {
      return { label: 'Rest', value: `-${increments.rest_reduction_seconds}s/step`, color: 'text-emerald-400' };
    }
    if (increments.sets_increment) {
      return { label: 'Serie', value: `+${increments.sets_increment} set/step`, color: 'text-indigo-400' };
    }
    return null;
  };

  const formatLastModified = (tpl: ProgressionRuleTemplate): string => {
    if (!tpl.updated_at) return 'Predefinito';
    const date = new Date(tpl.updated_at);
    const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
    if (diffMin < 2) return 'Salvato adesso';
    if (diffMin < 60) return `${diffMin} min fa`;
    const diffDays = Math.floor(diffMin / 1440);
    if (diffDays === 0) return 'Oggi';
    if (diffDays === 1) return 'Ieri';
    if (diffDays < 30) return `${diffDays} gg fa`;
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
  };

  const hasActiveFilters = selectedCategory !== 'all' || searchQuery;

  // ─── Tabs config ───────────────────────────────────────────────────────────

  const tabs: { id: TemplateTab; label: string; count: number; icon?: React.ReactNode }[] = [
    { id: 'all', label: 'Tutti', count: counts.all, icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'mine', label: 'Miei', count: counts.mine, icon: <User className="w-3.5 h-3.5" /> },
    { id: 'ai', label: 'IA', count: counts.ai, icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'system', label: 'Sistema', count: counts.system, icon: <Shield className="w-3.5 h-3.5" /> },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── Barra ricerca + tab + filtri ────────────────────────────────── */}
      <div className="flex flex-col gap-3">

        {/* Riga 1: Tab + Ricerca + Filtri */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">

          {/* Tab principali — compatte */}
          <div className="flex items-center gap-1 bg-slate-900/60 border border-slate-800 p-1 rounded-xl shrink-0">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-[var(--color-primary)] text-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                <span className={`text-[10px] font-black px-1 rounded ${
                  activeTab === tab.id ? 'text-black/60' : 'text-slate-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Ricerca */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cerca template, metodo, obiettivo…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-[var(--color-primary)] transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Pulsante Filtri */}
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all shrink-0 ${
              showFilters || selectedCategory !== 'all'
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                : 'border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filtri</span>
            {selectedCategory !== 'all' && <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]" />}
          </button>
        </div>

        {/* Riga 2: Pannello Filtri collassabile */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-2 px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-800 animate-in fade-in slide-in-from-top-1 duration-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Categoria:</span>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  selectedCategory === cat
                    ? 'bg-slate-200 text-slate-900'
                    : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                }`}
              >
                {cat === 'all' ? 'Tutte' : cat}
              </button>
            ))}
            {selectedCategory !== 'all' && (
              <button onClick={() => setSelectedCategory('all')} className="text-[11px] text-red-400 font-bold hover:text-red-300 flex items-center gap-1 ml-1">
                <X className="w-3 h-3" /> Reset
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Griglia Template ────────────────────────────────────────────── */}
      {filteredTemplates.length === 0 ? (
        <div className="p-12 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] text-center space-y-3">
          <Layers className="w-10 h-10 text-slate-700 mx-auto" />
          <h4 className="text-sm font-bold text-white">Nessun template trovato</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {activeTab === 'mine'
              ? 'Non hai ancora salvato template personalizzati.'
              : activeTab === 'ai'
              ? 'Nessun template generato con IA. Usa "Genera con IA" nell\'header.'
              : 'Nessun modello corrisponde ai criteri selezionati.'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
              className="text-xs text-[var(--color-primary)] font-bold hover:underline"
            >
              Rimuovi filtri
            </button>
          )}
          {onNewTemplateClick && activeTab === 'mine' && (
            <button
              onClick={onNewTemplateClick}
              className="mt-1 px-4 py-2 bg-[var(--color-primary)] text-black font-bold text-xs rounded-xl hover:bg-[var(--color-primary-hover)] transition-all inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Crea il primo template
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredTemplates.map(tpl => {
            const methodBadge = getMethodBadge(tpl.method);
            const origin = getTemplateOrigin(tpl);
            const isPreviewing = previewingTemplateId === tpl.id;
            const isHighlighted = tpl.id === highlightedTemplateId;
            const isDeletable = origin === 'coach' || origin === 'ai';
            const keyMetric = getKeyMetric(tpl);

            return (
              <div
                key={tpl.id}
                className={`relative flex flex-col rounded-2xl bg-[var(--color-panel)] border shadow-lg transition-all group ${
                  isHighlighted
                    ? 'border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/30 shadow-[var(--color-primary)]/10'
                    : 'border-[var(--color-panel-border)] hover:border-slate-600'
                }`}
              >
                {/* Badge "Appena Salvato" */}
                {isHighlighted && (
                  <div className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-[var(--color-primary)] text-black text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Appena Salvato</span>
                  </div>
                )}

                {/* Body Card */}
                <div className="p-5 flex-1 space-y-3">

                  {/* Riga 1: Categoria + Metodo (badge piccoli) */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {tpl.category && tpl.category !== 'Personalizzato' && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700 font-semibold">
                        {tpl.category}
                      </span>
                    )}
                    <span className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold ${methodBadge.color}`}>
                      {methodBadge.label}
                    </span>
                    {/* Badge origine solo se tab = 'all' */}
                    {activeTab === 'all' && origin === 'ai' && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 font-semibold flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" /> IA
                      </span>
                    )}
                  </div>

                  {/* Riga 2: Nome Template — gerarchia 1 */}
                  <div>
                    <h4 className="text-[15px] font-bold text-white leading-snug group-hover:text-[var(--color-primary)] transition-colors line-clamp-1">
                      {tpl.name}
                    </h4>

                    {/* Riga 3: Descrizione — max 2 righe */}
                    <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                      {tpl.description || 'Nessuna descrizione specificata.'}
                    </p>
                  </div>

                  {/* Riga 4: Parametro chiave — 1 sola metrica */}
                  {keyMetric && (
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      <span className="text-[11px] text-slate-500">{keyMetric.label}:</span>
                      <span className={`text-[11px] font-bold ${keyMetric.color}`}>{keyMetric.value}</span>
                    </div>
                  )}

                  {/* Preview Timeline (opzionale, dentro la card) */}
                  {isPreviewing && (
                    <div className="pt-3 border-t border-slate-800 animate-in fade-in duration-150">
                      <WeeklyProgressionTimeline
                        ruleOrTemplate={tpl}
                        baseTarget={tpl.default_target}
                        currentStep={1}
                        totalWeeks={tpl.max_steps || 6}
                      />
                    </div>
                  )}
                </div>

                {/* Footer Card */}
                <div className="px-5 py-3 border-t border-slate-800/60 flex items-center justify-between gap-2">

                  {/* Metadata compatta: durata + data */}
                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {tpl.max_steps || 6} sett.
                    </span>
                    <span className="text-slate-700">·</span>
                    <span>{formatLastModified(tpl)}</span>
                  </div>

                  {/* Azioni */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* CTA Primaria: Apri Template */}
                    <button
                      type="button"
                      onClick={() => onSelectTemplate(tpl)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-black text-xs font-black transition-all shadow-sm"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Apri</span>
                    </button>

                    {/* Overflow Menu ⋮ */}
                    <CardMenu
                      isDeletable={isDeletable}
                      isPreviewing={isPreviewing}
                      onEdit={() => onSelectTemplate(tpl)}
                      onDuplicate={() => onDuplicateTemplate(tpl)}
                      onPreview={() => setPreviewingTemplateId(isPreviewing ? null : tpl.id)}
                      onDelete={async () => {
                        if (confirm(`Eliminare il template "${tpl.name}"?`)) {
                          await deleteCustomTemplate(tpl.id);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Conteggio risultati */}
      {filteredTemplates.length > 0 && (
        <p className="text-[11px] text-slate-600 text-right font-medium">
          {filteredTemplates.length} {filteredTemplates.length === 1 ? 'template' : 'template'}
          {filteredTemplates.length !== templates.length ? ` su ${templates.length}` : ''}
        </p>
      )}
    </div>
  );
};
