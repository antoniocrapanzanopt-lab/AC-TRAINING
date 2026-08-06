import React, { useState } from 'react';
import { X, Save, Dumbbell, Video, FileText, Tag, Wrench } from 'lucide-react';
import { ExerciseItem, ExerciseCategory, ExerciseEquipment } from '../../types/exercise';
import { useExercises } from '../../context/ExercisesContext';
import { useToast } from '../../context/ToastContext';

interface ExerciseModalProps {
  initialExercise?: ExerciseItem | null;
  onClose: () => void;
}

const CATEGORIES: ExerciseCategory[] = [
  'Petto',
  'Dorso',
  'Gambe',
  'Spalle',
  'Bicipiti',
  'Tricipiti',
  'Addominali',
  'Full Body',
  'Cardio',
  'Altro',
];

const EQUIPMENTS: ExerciseEquipment[] = [
  'Bilanciere',
  'Manubri',
  'Macchina',
  'Cavi',
  'Corpo Libero',
  'Kettlebell',
  'Elastici',
  'Altro',
];

export const ExerciseModal: React.FC<ExerciseModalProps> = ({ initialExercise, onClose }) => {
  const { createExercise, updateExercise } = useExercises();
  const { showSuccess, showError } = useToast();

  const [name, setName] = useState(initialExercise?.name || '');
  const [category, setCategory] = useState<ExerciseCategory>(initialExercise?.category || 'Petto');
  const [equipment, setEquipment] = useState<ExerciseEquipment>(initialExercise?.equipment || 'Bilanciere');
  const [videoUrl, setVideoUrl] = useState(initialExercise?.video_url || '');
  const [instructions, setInstructions] = useState(initialExercise?.instructions || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      showError('Inserisci il nome dell\'esercizio');
      return;
    }

    setIsSaving(true);
    try {
      if (initialExercise) {
        const { success, error } = await updateExercise(initialExercise.id, {
          name: name.trim(),
          category,
          equipment,
          video_url: videoUrl.trim() || null,
          instructions: instructions.trim() || null,
        });

        if (!success) throw new Error(error);
        showSuccess('Esercizio aggiornato con successo!');
      } else {
        const { success, error } = await createExercise({
          name: name.trim(),
          category,
          equipment,
          video_url: videoUrl.trim() || null,
          instructions: instructions.trim() || null,
        });

        if (!success) throw new Error(error);
        showSuccess('Nuovo esercizio creato con successo!');
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      showError('Errore durante il salvataggio: ' + (err.message || ''));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-panel-border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-[var(--color-primary)]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {initialExercise ? 'Modifica Esercizio' : 'Nuovo Esercizio Personalizzato'}
              </h2>
              <p className="text-sm text-slate-400">
                {initialExercise ? 'Modifica le informazioni dell\'esercizio' : 'Aggiungi un nuovo esercizio alla tua libreria'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
          {/* Nome Esercizio */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Nome Esercizio *
            </label>
            <input
              type="text"
              placeholder="es. Hip Thrust con Bilanciere"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          {/* Categoria ed Attrezzatura */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                Gruppo Muscolare
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as ExerciseCategory)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-[var(--color-primary)]"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-slate-400" />
                Attrezzatura
              </label>
              <select
                value={equipment}
                onChange={e => setEquipment(e.target.value as ExerciseEquipment)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-[var(--color-primary)]"
              >
                {EQUIPMENTS.map(eq => (
                  <option key={eq} value={eq}>{eq}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Link Video */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-slate-400" />
              Link Video Tutorial (YouTube / Vimeo - Opzionale)
            </label>
            <input
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={videoUrl}
              onChange={e => setVideoUrl(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          {/* Note di Esecuzione */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Note Tecniche ed Istruzioni (Opzionale)
            </label>
            <textarea
              placeholder="Fornisci indicazioni utili sull'esecuzione per l'atleta..."
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-[var(--color-primary)] resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--color-panel-border)] bg-slate-900/50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-slate-300 hover:text-white transition-colors"
          >
            Annulla
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-[var(--color-primary)] text-black text-sm font-bold rounded-xl hover:bg-[var(--color-primary-hover)] transition-all disabled:opacity-50"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isSaving ? 'Salvataggio...' : 'Salva Esercizio'}
          </button>
        </div>

      </div>
    </div>
  );
};
