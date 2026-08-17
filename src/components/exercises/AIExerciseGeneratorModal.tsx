import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Loader2, 
  CheckSquare, 
  Square, 
  Download
} from 'lucide-react';
import { ExerciseCategory, ExerciseEquipment } from '../../types/exercise';
import { useExercises } from '../../context/ExercisesContext';
import { useToast } from '../../context/ToastContext';
import { generateExercisesWithAI, GeneratedAIExercise } from '../../lib/ai/aiExerciseGenerator';
import { AI_CONFIG } from '../../config/aiConfig';
import { AIDiagnosticPanel } from '../common/AIDiagnosticPanel';

interface AIExerciseGeneratorModalProps {
  onClose: () => void;
}

const CATEGORIES: ('Tutti' | ExerciseCategory)[] = [
  'Tutti',
  'Petto',
  'Dorso',
  'Gambe',
  'Spalle',
  'Bicipiti',
  'Tricipiti',
  'Addominali',
  'Full Body',
  'Cardio',
  'Altro'
];

const EQUIPMENTS: ('Qualsiasi' | ExerciseEquipment)[] = [
  'Qualsiasi',
  'Bilanciere',
  'Manubri',
  'Cavi',
  'Macchina',
  'Corpo Libero',
  'Kettlebell',
  'Elastici',
  'Altro'
];

export const AIExerciseGeneratorModal: React.FC<AIExerciseGeneratorModalProps> = ({ onClose }) => {
  const { createExercise } = useExercises();
  const { showSuccess, showError } = useToast();

  const [selectedCategory, setSelectedCategory] = useState<string>('Tutti');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('Qualsiasi');
  const [count, setCount] = useState<number>(20);
  const [customPrompt, setCustomPrompt] = useState<string>('');

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [progressMsg, setProgressMsg] = useState<string>('');

  const [generatedList, setGeneratedList] = useState<(GeneratedAIExercise & { selected: boolean })[]>([]);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedList([]);
    try {
      const results = await generateExercisesWithAI({
        category: selectedCategory as any,
        equipmentFilter: selectedEquipment === 'Qualsiasi' ? undefined : (selectedEquipment as any),
        count,
        customPrompt
      }, setProgressMsg);

      setGeneratedList(results.map(r => ({ ...r, selected: true })));
      showSuccess(`Generati ${results.length} esercizi!`, 'Seleziona quelli che vuoi aggiungere alla tua libreria.');
    } catch (err: any) {
      console.error(err);
      showError('Errore Generazione Esercizi', err.message || 'Impossibile generare gli esercizi.');
    } finally {
      setIsGenerating(false);
      setProgressMsg('');
    }
  };

  const toggleSelect = (index: number) => {
    setGeneratedList(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], selected: !copy[index].selected };
      return copy;
    });
  };

  const toggleSelectAll = () => {
    const allSelected = generatedList.every(i => i.selected);
    setGeneratedList(prev => prev.map(i => ({ ...i, selected: !allSelected })));
  };

  const handleImportSelected = async () => {
    const toImport = generatedList.filter(i => i.selected);
    if (toImport.length === 0) {
      showError('Nessun esercizio selezionato', 'Seleziona almeno un esercizio da importare.');
      return;
    }

    setIsImporting(true);
    let successCount = 0;

    try {
      for (const ex of toImport) {
        await createExercise({
          name: ex.name,
          category: ex.category as ExerciseCategory,
          equipment: ex.equipment as ExerciseEquipment,
          instructions: ex.description || '',
          video_url: '',
          tipo: ex.type,
          bilateralita: ex.bilaterality,
          piano_movimento: ex.movement_plane,
          catena_cinetica: ex.kinetic_chain,
          gradi_liberta: ex.degrees_of_freedom,
          parametri_chiave: ex.key_parameters,
          muscoli_coinvolti: ex.muscles,
          esecuzione: ex.execution,
          sicurezza: ex.safety
        });
        successCount++;
      }

      showSuccess('Importazione Completata!', `${successCount} esercizi sono stati aggiunti alla tua libreria.`);
      onClose();
    } catch (err: any) {
      showError('Errore Importazione', err.message || 'Si è verificato un errore durante il salvataggio.');
    } finally {
      setIsImporting(false);
    }
  };

  const selectedCount = generatedList.filter(i => i.selected).length;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh] transition-all">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 shrink-0 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/30">
              <Sparkles className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Genera Esercizi con IA
              </h2>
              <p className="text-xs text-slate-400">Popola e trasforma la tua banca dati con esercizi professionali generati da {AI_CONFIG.GEMINI.DISPLAY_NAME}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            disabled={isGenerating || isImporting} 
            className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <AIDiagnosticPanel compact={false} />
          
          {/* Form Filtri Generazione */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              
              {/* Categoria */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Categoria Muscolare
                </label>
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-amber-500"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Attrezzatura */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Attrezzatura
                </label>
                <select
                  value={selectedEquipment}
                  onChange={e => setSelectedEquipment(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-amber-500"
                >
                  {EQUIPMENTS.map(eq => (
                    <option key={eq} value={eq}>{eq}</option>
                  ))}
                </select>
              </div>

              {/* Quantità */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Quantità da Generare
                </label>
                <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-700">
                  {[10, 20, 30, 50].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setCount(n)}
                      className={`flex-1 py-1.5 text-xs font-extrabold rounded-lg transition-all ${
                        count === n 
                          ? 'bg-amber-500 text-black shadow-sm' 
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Note o indicazioni aggiuntive */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Richieste Specifiche per l'IA (Opzionale)
              </label>
              <input
                type="text"
                value={customPrompt}
                onChange={e => setCustomPrompt(e.target.value)}
                placeholder="Es. Genera esercizi avanzati per calisthenics, oppure focalizzati su varianti ai cavi e manubri..."
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  {progressMsg || 'Generazione in corso...'}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-black" />
                  Genera {count} Nuovi Esercizi con IA
                </>
              )}
            </button>
          </div>

          {/* Risultati Generati */}
          {generatedList.length > 0 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  Esercizi Pronti per l'Importazione ({selectedCount} / {generatedList.length} selezionati)
                </h3>

                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-xs font-semibold text-amber-400 hover:underline flex items-center gap-1"
                >
                  {generatedList.every(g => g.selected) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  {generatedList.every(g => g.selected) ? 'Deseleziona Tutti' : 'Seleziona Tutti'}
                </button>
              </div>

              <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                {generatedList.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => toggleSelect(idx)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                      item.selected
                        ? 'bg-amber-500/10 border-amber-500/40 text-white'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="pt-0.5">
                        {item.selected ? (
                          <CheckSquare className="w-4 h-4 text-amber-500" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-xs text-white">{item.name}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-800 text-amber-400 border border-slate-700">
                            {item.category}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300">
                            {item.equipment}
                          </span>
                        </div>
                        {item.instructions && (
                          <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">{item.instructions}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        {generatedList.length > 0 && (
          <div className="p-5 border-t border-slate-800 bg-slate-950/60 shrink-0 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Verranno aggiunti <strong className="text-white">{selectedCount}</strong> esercizi al tuo database
            </span>

            <button
              onClick={handleImportSelected}
              disabled={selectedCount === 0 || isImporting}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-2"
            >
              {isImporting ? (
                <Loader2 className="w-4 h-4 animate-spin text-black" />
              ) : (
                <Download className="w-4 h-4 text-black" />
              )}
              Importa {selectedCount} Esercizi
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
