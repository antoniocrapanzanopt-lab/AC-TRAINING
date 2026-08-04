import React, { useState } from 'react';
import { Sliders, Plus, Trash2, Save } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface CustomQuestion {
  id: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'scale' | 'select';
  category: 'anamnesi' | 'midcheck';
  required: boolean;
}

const DEFAULT_CUSTOM_QUESTIONS: CustomQuestion[] = [
  { id: 'q1', label: 'Integrazione in uso (Creatina, Proteine, Elettroliti, ecc.)', type: 'text', category: 'anamnesi', required: false },
  { id: 'q2', label: 'Livello di fame/appetito durante la giornata (1-10)', type: 'scale', category: 'midcheck', required: true },
  { id: 'q3', label: 'Ha riscontrato problemi di digestione o gonfiore addominale?', type: 'boolean', category: 'midcheck', required: false },
];

export const FormBuilderView: React.FC = () => {
  const { showSuccess } = useToast();
  const [questions, setQuestions] = useState<CustomQuestion[]>(DEFAULT_CUSTOM_QUESTIONS);
  const [newLabel, setNewLabel] = useState<string>('');
  const [newType, setNewType] = useState<CustomQuestion['type']>('text');
  const [newCategory, setNewCategory] = useState<CustomQuestion['category']>('midcheck');

  const handleAddQuestion = () => {
    if (!newLabel.trim()) return;

    const created: CustomQuestion = {
      id: `q-${Date.now()}`,
      label: newLabel.trim(),
      type: newType,
      category: newCategory,
      required: false,
    };

    setQuestions([...questions, created]);
    setNewLabel('');
    showSuccess('Domanda Aggiunta', 'Nuovo campo personalizzato inserito nel costruttore.');
  };

  const handleRemoveQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const handleSaveForm = () => {
    localStorage.setItem('builder_custom_questions', JSON.stringify(questions));
    showSuccess('Costruttore Form Salvato', 'Il modello dei questionari personalizzati è stato aggiornato.');
  };

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[var(--color-primary)]" /> Costruttore Form & Modelli Domande
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Personalizza i campi e le domande aggiuntive per l'Anamnesi Iniziale ed il Check Intermedio.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSaveForm}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all shadow-md cursor-pointer shrink-0"
        >
          <Save className="w-4 h-4" /> Salva Modello Form
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* FORM NUOVA DOMANDA (5 col) */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center gap-2">
            <Plus className="w-4 h-4 text-[var(--color-primary)]" /> Aggiungi Campo Personalizzato
          </h4>

          <div>
            <label className="text-[11px] font-bold text-slate-400 block mb-1">Testo della Domanda / Etichetta</label>
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="es. Assunzione quotidiana di acqua (Litri)"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Tipo di Risposta</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
              >
                <option value="text">Testo Libero</option>
                <option value="number">Valore Numerico</option>
                <option value="boolean">Sì / No (Switch)</option>
                <option value="scale">Scala 1 - 10</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Questionario Target</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
              >
                <option value="anamnesi">Anamnesi Iniziale</option>
                <option value="midcheck">Check Intermedio</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddQuestion}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold hover:border-[var(--color-primary)] transition-all flex items-center justify-center gap-2 cursor-pointer shadow"
          >
            <Plus className="w-4 h-4 text-[var(--color-primary)]" /> Inserisci Campo
          </button>
        </div>

        {/* LISTA DOMANDE PERSONALIZZATE (7 col) */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center justify-between">
            <span>Campi Personalizzati Attivi</span>
            <span className="text-[10px] text-slate-400 font-mono">{questions.length} Campi</span>
          </h4>

          <div className="space-y-3">
            {questions.map((q) => (
              <div
                key={q.id}
                className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <span className="font-bold text-white block">{q.label}</span>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-mono">
                      {q.category === 'anamnesi' ? 'Anamnesi' : 'Check Intermedio'}
                    </span>
                    <span className="text-slate-500">• Tipo: {q.type}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveQuestion(q.id)}
                  className="p-1.5 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                  title="Elimina campo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
