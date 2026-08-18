import React, { useState } from 'react';
import {
  TrendingUp,
  Sparkles,
  Plus,
} from 'lucide-react';
import { useProgressions } from '../../context/ProgressionsContext';
import {
  ProgressionRule,
  ProgressionRuleTemplate,
  ProgressionRuleFormData,
} from '../../types/progression';
import { ProgressionLibraryPage } from '../../components/progressions/ProgressionLibraryPage';
import { ProgressionBuilder } from '../../components/progressions/ProgressionBuilder';
import { ProgressionDetailDrawer } from '../../components/progressions/ProgressionDetailDrawer';
import { NewTemplateFlowModal } from '../../components/progressions/NewTemplateFlowModal';
import { AIProgressionAssistantModal } from '../../components/progressions/AIProgressionAssistantModal';

export const ProgressionsPage: React.FC = () => {
  const {
    rules,
    updateRule,
    saveCustomTemplate,
  } = useProgressions();

  // Modal / Builder States
  const [isNewFlowModalOpen, setIsNewFlowModalOpen] = useState(false);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [selectedTemplateOrRule, setSelectedTemplateOrRule] = useState<
    ProgressionRule | ProgressionRuleTemplate | undefined
  >(undefined);

  const [selectedDrawerRuleId, setSelectedDrawerRuleId] = useState<string | null>(null);
  const [highlightedTemplateId, setHighlightedTemplateId] = useState<string | null>(null);

  const handleOpenAiPrompt = () => {
    setIsAiAssistantOpen(true);
  };

  const handleOpenNewTemplate = () => {
    setIsNewFlowModalOpen(true);
  };

  const handleSelectTemplate = (template: ProgressionRuleTemplate) => {
    setSelectedTemplateOrRule(template);
    setIsBuilderOpen(true);
  };

  const handleDuplicateTemplate = (template: ProgressionRuleTemplate) => {
    const cloned: ProgressionRuleTemplate = {
      ...template,
      id: `custom-tpl-${Date.now()}`,
      name: `${template.name} (Copia Personalizzata)`,
      source: 'coach',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setSelectedTemplateOrRule(cloned);
    setIsBuilderOpen(true);
  };

  const handleStartBlank = () => {
    setSelectedTemplateOrRule(undefined);
    setIsBuilderOpen(true);
  };

  const handleEditRule = (rule: ProgressionRule) => {
    setSelectedTemplateOrRule(rule);
    setIsBuilderOpen(true);
  };

  const handleSaveRule = async (formData: ProgressionRuleFormData) => {
    // Se è una regola legata a un esercizio di allenamento attivo
    if (
      selectedTemplateOrRule &&
      'workout_exercise_id' in selectedTemplateOrRule &&
      selectedTemplateOrRule.workout_exercise_id
    ) {
      await updateRule(selectedTemplateOrRule.id, formData);
    } else {
      // È un template salvato per la Libreria
      const templateId =
        selectedTemplateOrRule?.id && selectedTemplateOrRule.id.startsWith('custom-')
          ? selectedTemplateOrRule.id
          : `custom-tpl-${Date.now()}`;

      const newTemplate: ProgressionRuleTemplate = {
        id: templateId,
        name: formData.name || 'Template di Progressione Personalizzato',
        description: formData.description || '',
        method: formData.method,
        category:
          (selectedTemplateOrRule && 'category' in selectedTemplateOrRule
            ? selectedTemplateOrRule.category
            : 'Personalizzato') || 'Personalizzato',
        conditions: formData.conditions,
        increments: formData.increments,
        default_target: formData.current_target,
        max_steps: formData.max_steps || 6,
        source: 'coach',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await saveCustomTemplate(newTemplate);
      setHighlightedTemplateId(newTemplate.id);
      setTimeout(() => setHighlightedTemplateId(null), 6000);
    }
    setIsBuilderOpen(false);
    setSelectedTemplateOrRule(undefined);
  };

  return (
    <div className="space-y-8">
      {/* Header Pagina */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <TrendingUp className="w-7 h-7 text-[var(--color-primary)]" /> Libreria Modelli di Progressione
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Crea, duplica o genera con IA i modelli di sovraccarico per i tuoi atleti.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Azione secondaria: Genera con IA */}
          <button
            onClick={handleOpenAiPrompt}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-purple-400 border border-purple-500/30 hover:bg-purple-500/10 hover:text-purple-300 transition-all"
            title="Genera un template con l'Assistente IA"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Genera con IA</span>
          </button>

          {/* CTA Primaria: Nuovo Template */}
          <button
            onClick={handleOpenNewTemplate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all shadow shadow-amber-500/10"
          >
            <Plus className="w-4 h-4" />
            <span>Nuovo Template</span>
          </button>
        </div>
      </div>

      {/* Sezione Builder Form se attiva */}
      {isBuilderOpen && (
        <ProgressionBuilder
          initialData={selectedTemplateOrRule}
          onSave={handleSaveRule}
          onCancel={() => {
            setIsBuilderOpen(false);
            setSelectedTemplateOrRule(undefined);
          }}
        />
      )}

      {/* Vista Libreria Template (Visualizzato se il builder è chiuso) */}
      {!isBuilderOpen && (
        <ProgressionLibraryPage
          onSelectTemplate={handleSelectTemplate}
          onDuplicateTemplate={handleDuplicateTemplate}
          onNewTemplateClick={handleOpenNewTemplate}
          highlightedTemplateId={highlightedTemplateId}
        />
      )}

      {/* Modal Wizard: Nuovo Template (Parti da zero / Duplica / Genera con IA) */}
      <NewTemplateFlowModal
        isOpen={isNewFlowModalOpen}
        onClose={() => setIsNewFlowModalOpen(false)}
        onStartBlank={handleStartBlank}
        onSelectDuplicate={handleDuplicateTemplate}
        onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
      />

      {/* Assistente IA per Progressioni (3 Proposte Contestuali a Confronto) */}
      <AIProgressionAssistantModal
        isOpen={isAiAssistantOpen}
        onClose={() => setIsAiAssistantOpen(false)}
        onOpenInBuilder={(template) => {
          setSelectedTemplateOrRule(template);
          setIsBuilderOpen(true);
        }}
        onSaveAsTemplate={async (template) => {
          await saveCustomTemplate(template);
          setHighlightedTemplateId(template.id);
          setTimeout(() => setHighlightedTemplateId(null), 6000);
        }}
      />

      {/* Drawer Dettaglio Regola */}
      {selectedDrawerRuleId && (
        <ProgressionDetailDrawer
          ruleId={selectedDrawerRuleId}
          isOpen={Boolean(selectedDrawerRuleId)}
          onClose={() => setSelectedDrawerRuleId(null)}
          onEdit={() => {
            const rule = rules.find((r) => r.id === selectedDrawerRuleId);
            if (rule) {
              setSelectedDrawerRuleId(null);
              handleEditRule(rule);
            }
          }}
        />
      )}
    </div>
  );
};

