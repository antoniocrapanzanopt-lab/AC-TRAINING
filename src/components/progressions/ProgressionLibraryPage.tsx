import React, { useState, useMemo } from 'react';
import {
  Search,
  Sliders,
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

export const ProgressionLibraryPage: React.FC<ProgressionLibraryPageProps> = ({
  onSelectTemplate,
  onDuplicateTemplate,
  onNewTemplateClick,
  highlightedTemplateId,
}) => {
  const { templates, deleteCustomTemplate } = useProgressions();

  // Navigation & Search State
  const [activeTab, setActiveTab] = useState<TemplateTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [previewingTemplateId, setPreviewingTemplateId] = useState<string | null>(null);

  // Helper per identificare l'origine di un template
  const getTemplateOrigin = (tpl: ProgressionRuleTemplate): 'coach' | 'ai' | 'system' => {
    if (tpl.source === 'ai' || tpl.id.includes('ai') || tpl.name.startsWith('AI:')) return 'ai';
    if (
      tpl.source === 'coach' ||
      tpl.id.startsWith('custom-') ||
      tpl.id.startsWith('tpl-custom') ||
      tpl.category === 'Personalizzato'
    ) {
      return 'coach';
    }
    return 'system';
  };

  // Conteggi per le 3 sezioni
  const counts = useMemo(() => {
    let mine = 0;
    let ai = 0;
    let system = 0;

    templates.forEach((tpl) => {
      const origin = getTemplateOrigin(tpl);
      if (origin === 'coach') mine += 1;
      else if (origin === 'ai') ai += 1;
      else system += 1;
    });

    return { all: templates.length, mine, ai, system };
  }, [templates]);

  const categories = ['all', 'Forza', 'Ipertrofia', 'Resistenza', 'Riabilitazione', 'Personalizzato'];

  // Template filtrati e ordinati (Template appena salvato in cima)
  const filteredTemplates = useMemo(() => {
    return templates
      .filter((tpl) => {
        const origin = getTemplateOrigin(tpl);

        // Filtro Tab Origine
        if (activeTab === 'mine' && origin !== 'coach') return false;
        if (activeTab === 'ai' && origin !== 'ai') return false;
        if (activeTab === 'system' && origin !== 'system') return false;

        // Filtro Categoria
        if (selectedCategory !== 'all' && tpl.category !== selectedCategory) return false;

        // Filtro Ricerca
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const matches =
            tpl.name.toLowerCase().includes(query) ||
            tpl.description.toLowerCase().includes(query) ||
            tpl.method.toLowerCase().includes(query) ||
            (tpl.objective && tpl.objective.toLowerCase().includes(query));
          if (!matches) return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Se è evidenziato / appena creato, mettilo sempre per primo
        if (a.id === highlightedTemplateId) return -1;
        if (b.id === highlightedTemplateId) return 1;

        // Ordine per data di aggiornamento/creazione o ID
        const timeA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const timeB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return timeB - timeA;
      });
  }, [templates, activeTab, selectedCategory, searchQuery, highlightedTemplateId]);

  const getMethodBadge = (method: ProgressionMethod) => {
    switch (method) {
      case 'double_progression':
        return { label: 'Doppia Progressione', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };
      case 'linear_load':
        return { label: 'Carico Lineare', color: 'bg-sky-500/15 text-sky-300 border-sky-500/30' };
      case 'rir_progression':
        return { label: 'Intensità RIR', color: 'bg-purple-500/15 text-purple-300 border-purple-500/30' };
      case 'density_progression':
        return { label: 'Densità & Rest', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
      case 'linear_sets':
        return { label: 'Volume Serie', color: 'bg-blue-500/15 text-blue-300 border-blue-500/30' };
      case 'linear_reps':
        return { label: 'Incremento Reps', color: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' };
      case 'tut_progression':
        return { label: 'TUT & Tempo', color: 'bg-violet-500/15 text-violet-300 border-violet-500/30' };
      case 'deload':
        return { label: 'Scarico Deload', color: 'bg-teal-500/15 text-teal-300 border-teal-500/30' };
      default:
        return { label: 'Personalizzato', color: 'bg-slate-800 text-slate-300 border-slate-700' };
    }
  };

  const getOriginBadge = (origin: 'coach' | 'ai' | 'system') => {
    switch (origin) {
      case 'coach':
        return {
          label: 'I Miei Template',
          icon: <User className="w-3 h-3 text-amber-400" />,
          color: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
        };
      case 'ai':
        return {
          label: 'Template IA',
          icon: <Sparkles className="w-3 h-3 text-purple-400" />,
          color: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
        };
      case 'system':
      default:
        return {
          label: 'Sistema',
          icon: <Shield className="w-3 h-3 text-slate-400" />,
          color: 'bg-slate-800 text-slate-300 border-slate-700',
        };
    }
  };

  const formatLastModified = (tpl: ProgressionRuleTemplate) => {
    if (tpl.updated_at) {
      const date = new Date(tpl.updated_at);
      const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);
      if (diffMinutes < 2) return 'Salvato adesso';
      if (diffMinutes < 60) return `${diffMinutes} min fa`;
      return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
    }
    return 'Predefinito';
  };

  return (
    <div className="space-y-6">
      {/* 1. SELETTORE DI GRUPPO / ORIGINE (4 Tab Principali con Conteggi Reali) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-[var(--color-primary)] text-black shadow font-black'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Tutti i Modelli</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'all' ? 'bg-black/20 text-black' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {counts.all}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('mine')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'mine'
                ? 'bg-amber-500 text-black shadow font-black'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>I Miei Template</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'mine' ? 'bg-black/20 text-black' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {counts.mine}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'ai'
                ? 'bg-purple-600 text-white shadow font-black'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-200" />
            <span>Template IA</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'ai' ? 'bg-black/20 text-white' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {counts.ai}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('system')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'system'
                ? 'bg-slate-700 text-white shadow font-black'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Template di Sistema</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'system' ? 'bg-black/20 text-white' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {counts.system}
            </span>
          </button>
        </div>

        {/* Ricerca Rapida */}
        <div className="relative self-stretch sm:self-auto">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cerca template, obiettivo, reps..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-[var(--color-primary)] w-full sm:w-64 transition-all"
          />
        </div>
      </div>

      {/* 2. SOTTO-FILTRO CATEGORIE (Compatto) */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-bold text-slate-500 mr-1.5">Categoria:</span>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              selectedCategory === cat
                ? 'bg-slate-200 text-slate-900 shadow-sm'
                : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800/80'
            }`}
          >
            {cat === 'all' ? 'Tutte' : cat}
          </button>
        ))}
      </div>

      {/* 3. GRIGLIA MODELLI */}
      {filteredTemplates.length === 0 ? (
        <div className="p-12 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] text-center space-y-3">
          <Layers className="w-10 h-10 text-slate-600 mx-auto" />
          <h4 className="text-base font-bold text-white">Nessun template trovato</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {activeTab === 'mine'
              ? 'Non hai ancora salvato template personalizzati. Clicca su "Nuovo Template" per crearne uno o duplicane uno esistente.'
              : activeTab === 'ai'
              ? 'Nessun template generato con IA salvato. Usa il pulsante "Genera con IA" in alto per creare schemi su misura.'
              : 'Nessun modello corrisponde ai criteri di ricerca o filtro selezionati.'}
          </p>
          {onNewTemplateClick && (
            <button
              onClick={onNewTemplateClick}
              className="mt-2 px-4 py-2 bg-[var(--color-primary)] text-black font-bold text-xs rounded-xl hover:bg-[var(--color-primary-hover)] transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Crea il primo Template</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTemplates.map((tpl) => {
            const methodBadge = getMethodBadge(tpl.method);
            const origin = getTemplateOrigin(tpl);
            const originBadge = getOriginBadge(origin);
            const isPreviewing = previewingTemplateId === tpl.id;
            const isHighlighted = tpl.id === highlightedTemplateId;
            const isDeletable = origin === 'coach' || origin === 'ai';

            return (
              <div
                key={tpl.id}
                className={`p-5 rounded-2xl bg-[var(--color-panel)] border shadow-xl flex flex-col justify-between transition-all group relative ${
                  isHighlighted
                    ? 'border-amber-400 ring-2 ring-amber-400/40 shadow-amber-500/10'
                    : 'border-[var(--color-panel-border)] hover:border-[var(--color-primary)]/50'
                }`}
              >
                {/* Badge Highlight "Appena Salvato" */}
                {isHighlighted && (
                  <div className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1 animate-pulse">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Appena Salvato</span>
                  </div>
                )}

                <div className="space-y-3.5">
                  {/* Badges Intestazione: Origine + Metodo + Categoria */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full border font-bold flex items-center gap-1.5 ${originBadge.color}`}
                    >
                      {originBadge.icon}
                      <span>{originBadge.label}</span>
                    </span>

                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full border font-bold uppercase tracking-wider ${methodBadge.color}`}
                    >
                      {methodBadge.label}
                    </span>
                  </div>

                  {/* Nome & Descrizione */}
                  <div>
                    <h4 className="text-sm font-black text-white group-hover:text-[var(--color-primary)] transition-colors line-clamp-1">
                      {tpl.name}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {tpl.description || 'Nessuna descrizione specificata.'}
                    </p>
                  </div>

                  {/* Metadati Chiave (Durata Settimane & Modifica) */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span className="flex items-center gap-1 text-slate-300 font-semibold">
                      <Calendar className="w-3 h-3 text-[var(--color-primary)]" />
                      <span>{tpl.max_steps || 6} Settimane</span>
                    </span>

                    <span className="flex items-center gap-1 text-slate-500 text-[10px]">
                      <Clock className="w-3 h-3" />
                      <span>{formatLastModified(tpl)}</span>
                    </span>
                  </div>

                  {/* Parametri Chiave Box */}
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-[11px] space-y-1.5">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-500">Target Iniziale:</span>
                      <span className="font-bold text-white">
                        {tpl.default_target.sets} set × {tpl.default_target.reps} @ {tpl.default_target.load_kg || 0}kg
                      </span>
                    </div>

                    {tpl.increments.load_increment_kg && (
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-500">Step Carico:</span>
                        <span className="font-bold text-sky-400">+{tpl.increments.load_increment_kg} kg</span>
                      </div>
                    )}

                    {tpl.increments.reps_increment && (
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-500">Step Reps:</span>
                        <span className="font-bold text-amber-400">
                          +{tpl.increments.reps_increment} reps (max {tpl.increments.reps_max_cap || 12})
                        </span>
                      </div>
                    )}

                    {tpl.increments.rest_reduction_seconds && (
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-500">Step Rest:</span>
                        <span className="font-bold text-emerald-400">-{tpl.increments.rest_reduction_seconds}s</span>
                      </div>
                    )}
                  </div>

                  {/* Anteprima Settimane Inline */}
                  {isPreviewing && (
                    <div className="mt-3 pt-3 border-t border-slate-800 animate-in fade-in duration-150">
                      <WeeklyProgressionTimeline
                        ruleOrTemplate={tpl}
                        baseTarget={tpl.default_target}
                        currentStep={1}
                        totalWeeks={tpl.max_steps || 6}
                      />
                    </div>
                  )}
                </div>

                {/* Azioni Rapide in Fondo */}
                <div className="pt-4 mt-4 border-t border-slate-800/60 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewingTemplateId(isPreviewing ? null : tpl.id)}
                    className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      isPreviewing
                        ? 'bg-[var(--color-primary)] text-black border-[var(--color-primary)]'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                    }`}
                    title="Visualizza sequenza settimane"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{isPreviewing ? 'Chiudi' : 'Settimane'}</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {/* Duplica */}
                    <button
                      type="button"
                      onClick={() => onDuplicateTemplate(tpl)}
                      className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-all cursor-pointer"
                      title="Duplica come nuovo template"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    {/* Elimina (solo se custom o IA) */}
                    {isDeletable && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (confirm(`Sei sicuro di voler eliminare il template "${tpl.name}"?`)) {
                            await deleteCustomTemplate(tpl.id);
                          }
                        }}
                        className="p-1.5 rounded-xl bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-800 transition-all cursor-pointer"
                        title="Elimina template"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Modifica */}
                    <button
                      type="button"
                      onClick={() => onSelectTemplate(tpl)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-black text-xs font-black transition-all shadow-sm cursor-pointer"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Modifica</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
