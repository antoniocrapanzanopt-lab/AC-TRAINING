import React, { useState } from 'react';
import { X, Save, Dumbbell, Video, FileText, Tag, Wrench, Upload, Check, Trash2 } from 'lucide-react';
import { ExerciseItem, ExerciseCategory, ExerciseEquipment } from '../../types/exercise';
import { useExercises } from '../../context/ExercisesContext';
import { useToast } from '../../context/ToastContext';
import { validateAndInspectVideoFile } from '../../utils/fileCompressor';
import { uploadExerciseVideoToStorage } from '../../lib/storage';

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

  // Video File Upload State
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [videoStats, setVideoStats] = useState<{ duration: number; sizeMB: number } | null>(null);

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingVideo(true);
    try {
      // 1. Ispeziona e valida durata <= 20s e peso <= 15MB
      const inspectRes = await validateAndInspectVideoFile(file, 20, 15);

      if (!inspectRes.valid) {
        showError('Errore Validazione Video', inspectRes.error || 'Video non valido');
        setIsUploadingVideo(false);
        return;
      }

      setVideoStats({
        duration: inspectRes.durationSeconds,
        sizeMB: inspectRes.sizeMB,
      });

      // 2. Transcodifica e Carica su Storage Supabase ('exercise-videos')
      const fileDataUrl = await new Promise<string>((res) => {
        const r = new FileReader();
        r.onload = (ev) => res(ev.target?.result as string);
        r.readAsDataURL(file);
      });

      const uploadRes = await uploadExerciseVideoToStorage(initialExercise?.id || 'temp', file, fileDataUrl);
      setVideoUrl(uploadRes.url);
      showSuccess('Video Esecuzione Valido!', `Video caricato (${inspectRes.durationSeconds}s, ${inspectRes.sizeMB} MB)`);
    } catch (err: any) {
      console.error(err);
      showError('Errore caricamento video: ' + err.message);
    } finally {
      setIsUploadingVideo(false);
    }
  };

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

          {/* Link o Upload Clip Video Esecuzione */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-slate-400" />
              Video Tutorial / Clip Esecuzione (YouTube, Vimeo o Caricamento Diretto)
            </label>

            <div className="space-y-3 bg-slate-900/60 p-4 border border-slate-700/60 rounded-xl">
              <div>
                <span className="block text-[11px] font-bold text-slate-400 mb-1">Opzione A: URL Video YouTube / Vimeo</span>
                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={videoUrl}
                  onChange={e => setVideoUrl(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink mx-3 text-[10px] text-slate-500 font-bold uppercase">Oppure Opzione B</span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>

              <div>
                <span className="block text-[11px] font-bold text-slate-400 mb-1">Opzione B: Carica Clip Video Breve (Max 20s, max 15MB)</span>
                
                {isUploadingVideo ? (
                  <div className="flex items-center gap-2 p-3 bg-slate-950 rounded-xl border border-amber-500/30 text-amber-400 text-xs font-bold">
                    <div className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                    <span>Verificando durata e ottimizzando video...</span>
                  </div>
                ) : videoUrl && !videoUrl.includes('youtube') && !videoUrl.includes('vimeo') ? (
                  <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-emerald-500/30">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                      <Check className="w-4 h-4" />
                      <span>Clip Video Caricata {videoStats ? `(${videoStats.duration}s, ${videoStats.sizeMB} MB)` : ''}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-white rounded-md font-bold">
                        Anteprima
                      </a>
                      <button
                        type="button"
                        onClick={() => { setVideoUrl(''); setVideoStats(null); }}
                        className="p-1 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs rounded-md font-bold"
                        title="Rimuovi video"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <input
                      type="file"
                      id="video-clip-upload"
                      accept="video/mp4,video/webm,video/quicktime"
                      onChange={handleVideoUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="video-clip-upload"
                      className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors"
                    >
                      <Upload className="w-4 h-4 text-[var(--color-primary)]" />
                      <span>Carica Clip Video (MP4 / MOV)</span>
                    </label>
                    <span className="text-[10px] text-slate-500 font-semibold">Max 20 sec • Max 15 MB (Ris. consigliata: 720p)</span>
                  </div>
                )}
              </div>
            </div>
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
