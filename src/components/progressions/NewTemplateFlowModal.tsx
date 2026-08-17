import React, { useState } from 'react';
import {
  X,
  PlusCircle,
  Copy,
  Sparkles,
  ArrowRight,
  Sliders,
  Search,
} from 'lucide-react';
import { ProgressionRuleTemplate } from '../../types/progression';
import { useProgressions } from '../../context/ProgressionsContext';

interface NewTemplateFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartBlank: () => void;
  onSelectDuplicate: (template: ProgressionRuleTemplate) => void;
  onOpenAiAssistant: () => void;
}

export const NewTemplateFlowModal: React.FC<NewTemplateFlowModalProps> = ({
  isOpen,
  onClose,
  onStartBlank,
  onSelectDuplicate,
  onOpenAiAssistant,
}) => {
  const { templates } = useProgressions();

  const [mode, setMode] = useState<'options' | 'duplicate_picker'>('options');
  const [duplicateSearch, setDuplicateSearch] = useState('');

  // Reset mode whenever modal opens
  React.useEffect(() => {
    if (isOpen) {
      setMode('options');
      setDuplicateSearch('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    setMode('options');
    onClose();
  };

  const handleStartBlank = () => {
    handleClose();
    onStartBlank();
  };

  const handleDuplicate = (tpl: ProgressionRuleTemplate) => {
    handleClose();
    onSelectDuplicate(tpl);
  };

  const handleOpenAI = () => {
    handleClose();
    onOpenAiAssistant();
  };

  const filteredTemplates = templates.filter(
    (t) =>
      !duplicateSearch ||
      t.name.toLowerCase().includes(duplicateSearch.toLowerCase()) ||
      t.category.toLowerCase().includes(duplicateSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] shadow-2xl z-10 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)]">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Nuovo Template di Progressione</h2>
              <p className="text-xs text-slate-400">
                Scegli la modalità di partenza per costruire il tuo protocollo.
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 text-slate-400 hover:text-white rounded-xl cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          
          {/* STAGE 1: 3 CORE OPTIONS */}
          {mode === 'options' && (
            <div className="grid grid-cols-1 gap-4">
              {/* Option 1: Zero */}
              <button
                type="button"
                onClick={handleStartBlank}
                className="p-5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-[var(--color-primary)]/50 hover:bg-slate-900/80 transition-all text-left flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 group-hover:border-[var(--color-primary)]/40 flex items-center justify-center text-[var(--color-primary)]">
                    <Sliders className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white group-hover:text-[var(--color-primary)] transition-colors">
                      1. Parti da zero
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Configura manualmente metodologia, step settimanali, carichi e target di partenza.
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-[var(--color-primary)] group-hover:translate-x-1 transition-all" />
              </button>

              {/* Option 2: Duplica Esistente */}
              <button
                type="button"
                onClick={() => setMode('duplicate_picker')}
                className="p-5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-900/80 transition-all text-left flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 group-hover:border-blue-500/40 flex items-center justify-center text-blue-400">
                    <Copy className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white group-hover:text-blue-400 transition-colors">
                      2. Duplica template esistente
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Scegli uno dei preset o un tuo template già salvato e personalizzane i parametri.
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
              </button>

              {/* Option 3: Assistente IA */}
              <button
                type="button"
                onClick={handleOpenAI}
                className="p-5 rounded-2xl bg-slate-950 border border-purple-500/30 hover:border-purple-500/60 hover:bg-purple-500/5 transition-all text-left flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-white group-hover:text-purple-300 transition-colors">
                        3. Assistente IA per Progressioni
                      </h3>
                      <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-[10px] font-bold rounded-md">
                        3 Proposte
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Analizza atleta, pattern, limitazioni articolari e genera 3 strategie a confronto con timeline completa.
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-purple-400 group-hover:translate-x-1 transition-all" />
              </button>
            </div>
          )}

          {/* STAGE 2: DUPLICATE PICKER */}
          {mode === 'duplicate_picker' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">
                  Seleziona il template da duplicare:
                </span>
                <button
                  type="button"
                  onClick={() => setMode('options')}
                  className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Indietro
                </button>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cerca template per nome o categoria..."
                  value={duplicateSearch}
                  onChange={(e) => setDuplicateSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
                {filteredTemplates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-blue-500/40 flex items-center justify-between gap-3 transition-colors"
                  >
                    <div>
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-300 border border-slate-700 mr-2">
                        {tpl.category}
                      </span>
                      <strong className="text-xs text-white">{tpl.name}</strong>
                      <p className="text-[11px] text-slate-400 truncate max-w-md mt-0.5">
                        {tpl.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDuplicate(tpl)}
                      className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white border border-blue-500/30 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Clona
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
