import React, { useState } from 'react';
import {
  Sparkles,
  Video,
  AlertTriangle,
  Bell,
  Users,
  User,
  Plus,
  Trash2,
  Send,
  ChevronRight,
} from 'lucide-react';
import {
  QuickMessageTemplate,
  BroadcastType,
} from '../../../types';
import { useToast } from '../../../context/ToastContext';

interface TemplatesListViewProps {
  templates: QuickMessageTemplate[];
  onUseTemplate: (template: QuickMessageTemplate) => void;
  onSaveTemplate: (template: Omit<QuickMessageTemplate, 'id' | 'createdAt'>) => void;
  onDeleteTemplate: (id: string) => void;
}

const typeConfig: Record<BroadcastType, { label: string; icon: React.FC<{ className?: string }>; badgeCls: string }> = {
  update: { label: 'Aggiornamento', icon: Sparkles, badgeCls: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  content_video: { label: 'Video / Contenuto', icon: Video, badgeCls: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  important_alert: { label: 'Avviso Importante', icon: AlertTriangle, badgeCls: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
  reminder: { label: 'Promemoria', icon: Bell, badgeCls: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  group_message: { label: 'Messaggio Gruppo', icon: Users, badgeCls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  single_message: { label: 'Messaggio Singolo', icon: User, badgeCls: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' },
};

export const TemplatesListView: React.FC<TemplatesListViewProps> = ({
  templates,
  onUseTemplate,
  onSaveTemplate,
  onDeleteTemplate,
}) => {
  const { showSuccess, showError } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);

  // Form custom
  const [customTitle, setCustomTitle] = useState('');
  const [customCategory, setCustomCategory] = useState('Personalizzati');
  const [customType, setCustomType] = useState<BroadcastType>('update');
  const [customSubject, setCustomSubject] = useState('');
  const [customBody, setCustomBody] = useState('');
  const [customCtaLabel, setCustomCtaLabel] = useState('');

  const categories = Array.from(new Set(templates.map(t => t.category)));

  const filteredTemplates = selectedCategory === 'all'
    ? templates
    : templates.filter(t => t.category === selectedCategory);

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim() || !customBody.trim()) {
      showError('Campi Obbligatori', 'Titolo e corpo del messaggio sono obbligatori.');
      return;
    }

    onSaveTemplate({
      title: customTitle,
      category: customCategory || 'Personalizzati',
      type: customType,
      subject: customSubject || customTitle,
      body: customBody,
      suggestedCta: customCtaLabel ? { type: 'custom', label: customCtaLabel } : undefined,
      suggestedChannels: ['in_app', 'email'],
    });

    showSuccess('Modello Salvato', 'Il modello personalizzato è ora disponibile nella libreria.');
    setCustomTitle('');
    setCustomSubject('');
    setCustomBody('');
    setCustomCtaLabel('');
    setIsCreatingCustom(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Sezione & Filtri Categorie */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === 'all'
                ? 'bg-[var(--color-primary)] text-black shadow-md'
                : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Tutti i Modelli ({templates.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-[var(--color-primary)] text-black shadow-md'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <button
          onClick={() => setIsCreatingCustom(!isCreatingCustom)}
          className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all self-start sm:self-auto shrink-0"
        >
          <Plus className="w-4 h-4 text-[var(--color-primary)]" />
          {isCreatingCustom ? 'Chiudi Form' : 'Nuovo Modello'}
        </button>
      </div>

      {/* Form Creazione Modello Custom */}
      {isCreatingCustom && (
        <form onSubmit={handleCreateCustom} className="p-5 rounded-2xl bg-slate-950 border border-[var(--color-primary)]/40 shadow-2xl space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--color-primary)]" /> Crea Modello di Messaggio Personalizzato
            </h4>
            <span className="text-[11px] text-slate-500">Supporta variabili come <code className="text-[var(--color-primary)] font-mono">{`{{nome_atleta}}`}</code></span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Titolo Modello *</label>
              <input
                type="text"
                placeholder="Es. Promemoria Visita Nutrizionale"
                value={customTitle}
                onChange={e => setCustomTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)]"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Categoria</label>
              <input
                type="text"
                placeholder="Es. Nutrizione"
                value={customCategory}
                onChange={e => setCustomCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tipologia</label>
              <select
                value={customType}
                onChange={e => setCustomType(e.target.value as BroadcastType)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)]"
              >
                <option value="update">Aggiornamento</option>
                <option value="content_video">Video / Contenuto</option>
                <option value="important_alert">Avviso Importante</option>
                <option value="reminder">Promemoria</option>
                <option value="group_message">Messaggio a Gruppo</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Oggetto / Titolo Comunicazione</label>
              <input
                type="text"
                placeholder="Es. Promemoria Appuntamento Nutrizionale"
                value={customSubject}
                onChange={e => setCustomSubject(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Testo CTA Consigliata (opzionale)</label>
              <input
                type="text"
                placeholder="Es. Conferma Appuntamento"
                value={customCtaLabel}
                onChange={e => setCustomCtaLabel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Testo del Messaggio *</label>
            <textarea
              rows={4}
              placeholder="Ciao {{nome_atleta}}, ti ricordiamo che..."
              value={customBody}
              onChange={e => setCustomBody(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs leading-relaxed focus:outline-none focus:border-[var(--color-primary)] font-normal"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreatingCustom(false)}
              className="px-4 py-2 rounded-xl bg-slate-900 text-slate-400 text-xs font-bold hover:text-white"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all shadow-md"
            >
              Salva Modello
            </button>
          </div>
        </form>
      )}

      {/* Griglia Modelli */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTemplates.map(tpl => {
          const currentType = typeConfig[tpl.type] || typeConfig.update;
          const TypeIcon = currentType.icon;

          return (
            <div
              key={tpl.id}
              className="p-5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl flex flex-col justify-between gap-4 hover:border-slate-700 transition-all group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2.5 py-0.5 rounded-full border border-[var(--color-primary)]/30">
                    {tpl.category}
                  </span>

                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${currentType.badgeCls}`}>
                    <TypeIcon className="w-3 h-3" />
                    {currentType.label}
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-black text-white group-hover:text-[var(--color-primary)] transition-colors">
                    {tpl.title}
                  </h4>
                  <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
                    Oggetto: <span className="text-slate-300 font-semibold">{tpl.subject}</span>
                  </div>
                </div>

                {/* Body Snippet */}
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 leading-relaxed whitespace-pre-line line-clamp-4 font-normal">
                  {tpl.body}
                </div>

                {/* Suggested CTA */}
                {tpl.suggestedCta && tpl.suggestedCta.label && (
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-slate-500 font-semibold">CTA Consigliata:</span>
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[var(--color-primary)] font-bold">
                      {tpl.suggestedCta.label}
                    </span>
                  </div>
                )}
              </div>

              {/* Azioni Modello */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <div>
                  {!tpl.isSystem && (
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteTemplate(tpl.id);
                        showSuccess('Eliminato', 'Modello rimosso dalla libreria.');
                      }}
                      className="p-1.5 text-slate-500 hover:text-red-400 transition-all"
                      title="Elimina modello personalizzato"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onUseTemplate(tpl)}
                  className="px-4 py-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-black font-black text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(234,179,8,0.2)] transition-all"
                >
                  <Send className="w-3.5 h-3.5" /> Usa questo modello <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
