import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Plus,
  Trash2,
  Save,
  ArrowUp,
  ArrowDown,
  Layers,
  FolderOpen,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import {
  FormQuestion,
  QuestionType,
  QuestionnaireTemplate,
  QuestionnaireCategory,
} from '../../types';
import {
  saveQuestionnaireTemplate,
  getQuestionnaireTemplates,
} from '../../services/questionnaireService';

interface QuestionnaireBuilderProps {
  initialTemplate?: QuestionnaireTemplate | null;
  onSavedTemplate?: (template: QuestionnaireTemplate) => void;
}

const DEFAULT_SECTIONS = ['Dati Biometrici', 'Attrezzatura', 'Salute & Infortuni', 'Stile di Vita'];

export const QuestionnaireBuilder: React.FC<QuestionnaireBuilderProps> = ({
  initialTemplate,
  onSavedTemplate,
}) => {
  const { showSuccess, showError } = useToast();

  const [editingId, setEditingId] = useState<string | undefined>(initialTemplate?.id);
  const [templateName, setTemplateName] = useState<string>(initialTemplate?.name || '');
  const [templateType, setTemplateType] = useState<QuestionnaireCategory>(initialTemplate?.type || 'initial_check');
  const [templateDescription, setTemplateDescription] = useState<string>(initialTemplate?.description || '');
  const [sections, setSections] = useState<string[]>(initialTemplate?.sections || DEFAULT_SECTIONS);
  const [questions, setQuestions] = useState<FormQuestion[]>(initialTemplate?.questions || []);
  const [newSectionName, setNewSectionName] = useState<string>('');

  const [isLoadingModal, setIsLoadingModal] = useState<boolean>(false);
  const [availableTemplates, setAvailableTemplates] = useState<QuestionnaireTemplate[]>([]);

  // Form stato per nuova domanda
  const [newQuestionLabel, setNewQuestionLabel] = useState<string>('');
  const [newQuestionType, setNewQuestionType] = useState<QuestionType>('short_text');
  const [newQuestionSection, setNewQuestionSection] = useState<string>(DEFAULT_SECTIONS[0]);
  const [newQuestionRequired, setNewQuestionRequired] = useState<boolean>(false);
  const [newQuestionOptions, setNewQuestionOptions] = useState<string>('');

  useEffect(() => {
    if (initialTemplate) {
      setEditingId(initialTemplate.id);
      setTemplateName(initialTemplate.name);
      setTemplateType(initialTemplate.type);
      setTemplateDescription(initialTemplate.description || '');
      setSections(initialTemplate.sections && initialTemplate.sections.length > 0 ? initialTemplate.sections : DEFAULT_SECTIONS);
      setQuestions(initialTemplate.questions || []);
    }
  }, [initialTemplate]);

  const handleAddQuestion = () => {
    if (!newQuestionLabel.trim()) {
      showError('Etichetta Mancante', 'Inserisci il testo della domanda prima di aggiungerla.');
      return;
    }

    const optionsArray = (newQuestionType === 'radio' || newQuestionType === 'checkbox')
      ? newQuestionOptions.split(',').map((o) => o.trim()).filter(Boolean)
      : undefined;

    const created: FormQuestion = {
      id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      label: newQuestionLabel.trim(),
      type: newQuestionType,
      section: newQuestionSection,
      required: newQuestionRequired,
      options: optionsArray,
    };

    setQuestions([...questions, created]);
    setNewQuestionLabel('');
    setNewQuestionOptions('');
    showSuccess('Domanda Inserita', 'Nuovo campo aggiunto al questionario.');
  };

  const handleRemoveQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    const nextQuestions = [...questions];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= nextQuestions.length) return;

    const temp = nextQuestions[index];
    nextQuestions[index] = nextQuestions[targetIndex];
    nextQuestions[targetIndex] = temp;
    setQuestions(nextQuestions);
  };

  const handleAddSection = () => {
    if (!newSectionName.trim()) return;
    if (!sections.includes(newSectionName.trim())) {
      setSections([...sections, newSectionName.trim()]);
    }
    setNewSectionName('');
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      showError('Nome Modello Richiesto', 'Inserisci il nome del modello prima di salvare.');
      return;
    }

    const saved = saveQuestionnaireTemplate({
      id: editingId,
      name: templateName.trim(),
      type: templateType,
      description: templateDescription.trim(),
      sections,
      questions,
    });

    setEditingId(saved.id);
    showSuccess('Modello Salvato con Successo!', `Il modello "${saved.name}" è disponibile nella Libreria Modelli.`);
    if (onSavedTemplate) onSavedTemplate(saved);
  };

  const handleOpenLoadModal = () => {
    setAvailableTemplates(getQuestionnaireTemplates());
    setIsLoadingModal(true);
  };

  const handleLoadTemplate = (tmpl: QuestionnaireTemplate) => {
    setEditingId(tmpl.id);
    setTemplateName(tmpl.name);
    setTemplateType(tmpl.type);
    setTemplateDescription(tmpl.description || '');
    setSections(tmpl.sections || DEFAULT_SECTIONS);
    setQuestions(tmpl.questions || []);
    setIsLoadingModal(false);
    showSuccess('Modello Caricato', `Caricato il modello "${tmpl.name}" nell'editor.`);
  };

  return (
    <div className="space-y-6">
      {/* TESTATA & SALVATAGGIO */}
      <div className="p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[var(--color-primary)]" /> Editor Visuale Costruttore Questionari
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Crea da zero o personalizza i campi dinamici, le sezioni ed i vincoli dei tuoi form.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleOpenLoadModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200 hover:text-white hover:border-slate-600 transition-all cursor-pointer shadow"
          >
            <FolderOpen className="w-4 h-4 text-[var(--color-primary)]" /> Carica Modello Esistente
          </button>

          <button
            type="button"
            onClick={handleSaveTemplate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all shadow-md cursor-pointer shrink-0"
          >
            <Save className="w-4 h-4" /> Salva come Modello
          </button>
        </div>
      </div>

      {/* METADATI MODELLO */}
      <div className="p-5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="text-[11px] font-bold text-slate-400 block mb-1">Nome Modello</label>
          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="es. Anamnesi Completa Uomo / Check-in Settimanale"
            className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-bold focus:outline-none focus:border-[var(--color-primary)]"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-400 block mb-1">Tipologia Questionario</label>
          <select
            value={templateType}
            onChange={(e) => setTemplateType(e.target.value as QuestionnaireCategory)}
            className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-bold focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
          >
            <option value="initial_check">Anamnesi Iniziale (Initial Check)</option>
            <option value="mid_check">Check Intermedio (Mid-Check)</option>
            <option value="custom">Personalizzato / Altro</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-400 block mb-1">Descrizione (Opzionale)</label>
          <input
            type="text"
            value={templateDescription}
            onChange={(e) => setTemplateDescription(e.target.value)}
            placeholder="es. Valutazione completa prima del primo blocco..."
            className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-bold focus:outline-none focus:border-[var(--color-primary)]"
          />
        </div>
      </div>

      {/* EDITOR DOMANDE E SEZIONI (GRIGLIA) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* COLONNA SINISTRA: AGGIUNGI DOMANDA (5 col) */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2.5 flex items-center justify-between">
            <span>Inserisci Nuova Domanda</span>
            <Plus className="w-4 h-4 text-[var(--color-primary)]" />
          </h4>

          <div>
            <label className="text-[11px] font-bold text-slate-400 block mb-1">Testo della Domanda</label>
            <input
              type="text"
              value={newQuestionLabel}
              onChange={(e) => setNewQuestionLabel(e.target.value)}
              placeholder="es. Hai sofferto di dolori alla spalla in passato?"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-medium focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Tipo di Campo</label>
              <select
                value={newQuestionType}
                onChange={(e) => setNewQuestionType(e.target.value as QuestionType)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold cursor-pointer"
              >
                <option value="short_text">Testo Breve</option>
                <option value="long_text">Paragrafo Esteso</option>
                <option value="radio">Scelta Singola (Radio)</option>
                <option value="checkbox">Scelta Multipla (Checkbox)</option>
                <option value="scale">Scala di Valutazione (1-10)</option>
                <option value="number">Numero</option>
                <option value="boolean">Toggle Sì/No</option>
                <option value="file">File Upload / Foto</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Sezione / Categoria</label>
              <select
                value={newQuestionSection}
                onChange={(e) => setNewQuestionSection(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold cursor-pointer"
              >
                {sections.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* AGGIUNGI SEZIONE PERSONALIZZATA */}
          <div className="pt-2 border-t border-slate-800/80 space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nuova Sezione:</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="es. Alimentazione & Digestione"
                className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
              <button
                type="button"
                onClick={handleAddSection}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-300 hover:text-white"
              >
                + Aggiungi
              </button>
            </div>
          </div>

          {(newQuestionType === 'radio' || newQuestionType === 'checkbox') && (
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Opzioni (separate da virgola)</label>
              <input
                type="text"
                value={newQuestionOptions}
                onChange={(e) => setNewQuestionOptions(e.target.value)}
                placeholder="es. 3 Giorni, 4 Giorni, 5+ Giorni"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-medium"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="req"
              checked={newQuestionRequired}
              onChange={(e) => setNewQuestionRequired(e.target.checked)}
              className="rounded bg-slate-950 border-slate-800 text-[var(--color-primary)] cursor-pointer"
            />
            <label htmlFor="req" className="text-xs font-bold text-slate-300 cursor-pointer">
              Campo Obbligatorio
            </label>
          </div>

          <button
            type="button"
            onClick={handleAddQuestion}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold hover:border-[var(--color-primary)] transition-all flex items-center justify-center gap-2 cursor-pointer shadow"
          >
            <Plus className="w-4 h-4 text-[var(--color-primary)]" /> Aggiungi al Questionario
          </button>
        </div>

        {/* COLONNA DESTRA: ANTEPRIMA CAMPI INSERITI (7 col) */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2.5 flex items-center justify-between">
            <span>Struttura Campi ({questions.length})</span>
            <Layers className="w-4 h-4 text-[var(--color-primary)]" />
          </h4>

          {questions.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-8 text-center">
              Nessuna domanda inserita. Aggiungi il primo campo dal pannello di sinistra.
            </p>
          ) : (
            <div className="space-y-3">
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{q.label}</span>
                      {q.required && (
                        <span className="px-1.5 py-0.5 rounded bg-red-950 text-red-400 text-[9px] font-bold border border-red-900/50">
                          Obbligatorio
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-2 font-mono">
                      <span className="text-[var(--color-primary)]">{q.section}</span>
                      <span>• Tipo: {q.type}</span>
                      {q.options && <span>• Opzioni: ({q.options.join(', ')})</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleMoveQuestion(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 text-slate-500 hover:text-white disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveQuestion(idx, 'down')}
                      disabled={idx === questions.length - 1}
                      className="p-1 text-slate-500 hover:text-white disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(q.id)}
                      className="p-1 text-slate-500 hover:text-red-400 ml-1 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODALE CARICAMENTO MODELLI */}
      {isLoadingModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-[var(--color-primary)]" /> Carica Modello Questionario
            </h4>

            {availableTemplates.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4 text-center">
                Nessun modello presente in libreria.
              </p>
            ) : (
              <div className="space-y-2">
                {availableTemplates.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    onClick={() => handleLoadTemplate(tmpl)}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-[var(--color-primary)]/50 cursor-pointer flex items-center justify-between transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{tmpl.name}</span>
                        <span className="px-2 py-0.5 rounded bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[9px] font-bold uppercase">
                          {tmpl.type}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">{tmpl.questions?.length || 0} domande • {tmpl.description || 'Nessuna descrizione'}</p>
                    </div>

                    <span className="text-xs font-bold text-[var(--color-primary)] hover:underline">
                      Carica →
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsLoadingModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs font-bold hover:text-white"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
