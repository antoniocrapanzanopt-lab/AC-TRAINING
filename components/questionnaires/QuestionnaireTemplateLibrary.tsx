import React, { useState, useEffect } from 'react';
import {
  FileText,
  Trash2,
  Edit,
  Send,
  UserCheck,
  CheckSquare,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useAthletes } from '../../context/AthletesContext';
import {
  getQuestionnaireTemplates,
  deleteQuestionnaireTemplate,
  saveQuestionnaireResponse,
} from '../../services/questionnaireService';
import { QuestionnaireTemplate } from '../../types';

interface QuestionnaireTemplateLibraryProps {
  onEditTemplate?: (template: QuestionnaireTemplate) => void;
}

export const QuestionnaireTemplateLibrary: React.FC<QuestionnaireTemplateLibraryProps> = ({
  onEditTemplate,
}) => {
  const { athletes } = useAthletes();
  const { showSuccess, showError } = useToast();

  const [templates, setTemplates] = useState<QuestionnaireTemplate[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('');
  const [compilingTemplate, setCompilingTemplate] = useState<QuestionnaireTemplate | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});

  const loadTemplates = () => {
    setTemplates(getQuestionnaireTemplates());
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Sei sicuro di voler eliminare il modello "${name}"?`)) {
      deleteQuestionnaireTemplate(id);
      loadTemplates();
      showSuccess('Modello Eliminato', `Il modello "${name}" è stato rimosso dalla libreria.`);
    }
  };

  const handleDuplicate = (template: QuestionnaireTemplate) => {
    const duplicate: QuestionnaireTemplate = {
      ...template,
      id: `tmpl-quest-${Date.now()}`,
      name: `${template.name} (Copia)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (onEditTemplate) onEditTemplate(duplicate);
  };

  const handleSendToClient = (tmplName: string) => {
    showSuccess('Questionario Inviato', `Il link al questionario "${tmplName}" è stato inviato all'Atleta nel suo Portale.`);
  };

  const handleOpenCompileModal = (template: QuestionnaireTemplate) => {
    setCompilingTemplate(template);
    setAnswers({});
  };

  const handleConfirmCompile = () => {
    if (!selectedAthleteId || !compilingTemplate) {
      showError('Seleziona Atleta', 'Scegli un atleta prima di salvare il questionario.');
      return;
    }

    const athlete = athletes.find((a) => a.id === selectedAthleteId);

    saveQuestionnaireResponse({
      athleteId: selectedAthleteId,
      athleteName: athlete ? `${athlete.firstName} ${athlete.lastName}` : '',
      templateId: compilingTemplate.id,
      templateName: compilingTemplate.name,
      type: compilingTemplate.type,
      answers,
      filledBy: 'coach',
    });

    setCompilingTemplate(null);
    setSelectedAthleteId('');
    showSuccess('Questionario Salvato!', `Compilazione registrata ed associata a ${athlete?.firstName} ${athlete?.lastName}.`);
  };

  return (
    <div className="space-y-6">
      {/* TESTATA LIBRERIA MODELLI */}
      <div className="p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-[var(--color-primary)]" /> Libreria Modelli Questionari
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Gestisci, compila ed invia i modelli di valutazione ed i form personalizzati.
          </p>
        </div>
      </div>

      {/* GRIGLIA MODELLI SALVATI */}
      {templates.length === 0 ? (
        <div className="text-center py-12 bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl p-6">
          <FileText className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-xs text-slate-400">Nessun modello di questionario presente in libreria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((tmpl) => (
            <div
              key={tmpl.id}
              className="p-5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl flex flex-col justify-between space-y-4 hover:border-[var(--color-primary)]/40 transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white truncate">{tmpl.name}</h4>
                  <span className="px-2 py-0.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/30 text-[10px] font-bold uppercase">
                    {tmpl.type}
                  </span>
                </div>

                {tmpl.description && (
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{tmpl.description}</p>
                )}

                <div className="text-[10px] text-slate-500 font-mono">
                  {tmpl.questions?.length || 0} Domande • {tmpl.sections?.length || 0} Sezioni
                </div>
              </div>

              {/* PULSANTI AZIONE */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenCompileModal(tmpl)}
                    className="flex-1 py-2 px-3 rounded-xl bg-[var(--color-primary)] text-black text-xs font-bold hover:bg-[var(--color-primary-hover)] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckSquare className="w-3.5 h-3.5" /> Compila per Atleta
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendToClient(tmpl.name)}
                    className="py-2 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200 hover:text-white hover:border-slate-600 transition-all flex items-center justify-center gap-1 cursor-pointer"
                    title="Invia al Portale Atleta"
                  >
                    <Send className="w-3.5 h-3.5 text-sky-400" />
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2 text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => handleDuplicate(tmpl)}
                    className="text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" /> Modifica / Duplica
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(tmpl.id, tmpl.name)}
                    className="text-slate-500 hover:text-red-400 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Elimina
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODALE COMPILAZIONE PER ATLETA */}
      {compilingTemplate && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-[var(--color-primary)]" /> Compila "{compilingTemplate.name}"
            </h4>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Seleziona Atleta</label>
              <select
                value={selectedAthleteId}
                onChange={(e) => setSelectedAthleteId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)] font-bold cursor-pointer"
              >
                <option value="">-- Scegli Atleta Target --</option>
                {athletes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.firstName} {a.lastName}
                  </option>
                ))}
              </select>
            </div>

            {/* CAMPI DINAMICI DEL MODELLO */}
            <div className="space-y-4 pt-2 border-t border-slate-800">
              {compilingTemplate.questions?.map((q) => (
                <div key={q.id} className="space-y-1 text-xs">
                  <label className="font-bold text-slate-300 block">
                    {q.label} {q.required && <span className="text-red-400">*</span>}
                  </label>

                  {q.type === 'short_text' && (
                    <input
                      type="text"
                      placeholder={q.placeholder}
                      value={answers[q.id] || ''}
                      onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium"
                    />
                  )}

                  {q.type === 'long_text' && (
                    <textarea
                      rows={2}
                      placeholder={q.placeholder}
                      value={answers[q.id] || ''}
                      onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-medium"
                    />
                  )}

                  {q.type === 'number' && (
                    <input
                      type="number"
                      value={answers[q.id] || ''}
                      onChange={(e) => setAnswers({ ...answers, [q.id]: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
                    />
                  )}

                  {q.type === 'boolean' && (
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1 text-slate-300 font-bold cursor-pointer">
                        <input
                          type="radio"
                          name={`bool-${q.id}`}
                          checked={answers[q.id] === true}
                          onChange={() => setAnswers({ ...answers, [q.id]: true })}
                        />
                        Sì
                      </label>
                      <label className="flex items-center gap-1 text-slate-300 font-bold cursor-pointer">
                        <input
                          type="radio"
                          name={`bool-${q.id}`}
                          checked={answers[q.id] === false}
                          onChange={() => setAnswers({ ...answers, [q.id]: false })}
                        />
                        No
                      </label>
                    </div>
                  )}

                  {q.type === 'scale' && (
                    <input
                      type="number"
                      min={q.minScale || 1}
                      max={q.maxScale || 10}
                      value={answers[q.id] || 5}
                      onChange={(e) => setAnswers({ ...answers, [q.id]: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
                    />
                  )}

                  {q.type === 'radio' && q.options && (
                    <div className="space-y-1">
                      {q.options.map((opt) => (
                        <label key={opt} className="flex items-center gap-2 text-slate-300 font-medium cursor-pointer">
                          <input
                            type="radio"
                            name={`rad-${q.id}`}
                            checked={answers[q.id] === opt}
                            onChange={() => setAnswers({ ...answers, [q.id]: opt })}
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCompilingTemplate(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs font-bold hover:text-white"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleConfirmCompile}
                className="px-4 py-2 rounded-xl bg-[var(--color-primary)] text-black text-xs font-bold hover:bg-[var(--color-primary-hover)]"
              >
                Salva Risposte
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
