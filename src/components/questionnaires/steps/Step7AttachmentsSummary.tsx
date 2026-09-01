import React, { useState } from 'react';
import { Camera, FileText, Upload, Trash2, Loader2 } from 'lucide-react';
import {
  OnboardingQuestionnaireData,
  OnboardingPhotoAttachment,
  OnboardingDocAttachment,
} from '../../../types/questionnaire';
import { compressImageFile } from '../../../utils/fileCompressor';

interface StepProps {
  data: OnboardingQuestionnaireData;
  onChange: (updates: Partial<OnboardingQuestionnaireData>) => void;
}

export const Step7AttachmentsSummary: React.FC<StepProps> = ({ data, onChange }) => {
  const [isUploading, setIsUploading] = useState(false);

  // Caricamento foto posa
  const handlePhotoUpload = async (pose: 'front' | 'side' | 'back', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Comprimi l'immagine per garantire upload leggero e rapido
      const compressed = await compressImageFile(file, 1200, 1200, 0.8);
      const base64Url = compressed.dataUrl;
      const currentPhotos = (data.progressPhotos || []).filter((p) => p.pose !== pose);
      const newPhoto: OnboardingPhotoAttachment = {
        id: `photo-${pose}-${Date.now()}`,
        pose,
        url: base64Url,
        notes: `Check iniziale ${pose.toUpperCase()}`,
      };
      onChange({ progressPhotos: [...currentPhotos, newPhoto] });
    } catch (err) {
      console.error('Errore compressione foto:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const removePhoto = (pose: 'front' | 'side' | 'back') => {
    const updated = (data.progressPhotos || []).filter((p) => p.pose !== pose);
    onChange({ progressPhotos: updated });
  };

  // Caricamento documenti / vecchie schede
  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const doc: OnboardingDocAttachment = {
        id: `doc-${Date.now()}`,
        name: file.name,
        url: reader.result as string,
        type: file.type.includes('pdf') ? 'workout_plan' : 'medical_exam',
        sizeBytes: file.size,
      };
      onChange({ documentAttachments: [...(data.documentAttachments || []), doc] });
    };
    reader.readAsDataURL(file);
  };

  const removeDoc = (id: string) => {
    onChange({
      documentAttachments: (data.documentAttachments || []).filter((d) => d.id !== id),
    });
  };

  const getPhotoForPose = (pose: 'front' | 'side' | 'back') => {
    return (data.progressPhotos || []).find((p) => p.pose === pose);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Intestazione */}
      <div className="border-b border-slate-800/80 pb-4">
        <h3 className="text-lg font-black text-white flex items-center gap-2">
          <Camera className="w-5 h-5 text-[var(--color-primary)]" /> 7. Foto Check Iniziale & Note Finali
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Le foto di partenza permettono al coach di valutare la postura, la struttura ossea e monitorare i cambiamenti reali nel tempo.
        </p>
      </div>

      {/* 1. Box Foto Iniziali (Fronte, Lato, Retro) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Camera className="w-4 h-4 text-[var(--color-primary)]" /> Foto Posturali di Partenza (Fortemente Consigliate)
          </label>
          <span className="text-[10px] text-slate-500">Luce naturale frontale, braccia rilassate</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { pose: 'front' as const, label: '📷 Fronte', tip: 'Braccia lungo i fianchi' },
            { pose: 'side' as const, label: '📷 Profilo / Lato', tip: 'Braccia rilassate' },
            { pose: 'back' as const, label: '📷 Retro / Schiena', tip: 'Schiena e spalle rilassate' },
          ].map((item) => {
            const photo = getPhotoForPose(item.pose);
            return (
              <div
                key={item.pose}
                className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 flex flex-col items-center justify-between text-center space-y-3 relative group"
              >
                <div className="space-y-1">
                  <span className="font-bold text-xs text-white block">{item.label}</span>
                  <span className="text-[10px] text-slate-500 block">{item.tip}</span>
                </div>

                {photo ? (
                  <div className="relative w-full aspect-[3/4] max-h-48 rounded-xl overflow-hidden border border-slate-800 bg-slate-900 shadow">
                    <img
                      src={photo.url}
                      alt={item.label}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(item.pose)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/80 text-red-400 hover:text-red-300 transition-colors shadow cursor-pointer"
                      title="Rimuovi foto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="w-full aspect-[3/4] max-h-48 rounded-xl border-2 border-dashed border-slate-800 hover:border-[var(--color-primary)] bg-slate-900/40 hover:bg-slate-900/80 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all p-4 text-slate-400 hover:text-white">
                    {isUploading ? (
                      <Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" />
                    ) : (
                      <Upload className="w-6 h-6 text-slate-500" />
                    )}
                    <span className="text-[11px] font-bold text-center">{isUploading ? 'Elaborazione...' : 'Carica Foto'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isUploading}
                      onChange={(e) => handlePhotoUpload(item.pose, e)}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Allegati Aggiuntivi (PDF / Schede passate / Esami) */}
      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-slate-400" /> Schede Precedenti o Documenti Medici (Opzionale)
          </label>
          <span className="text-[10px] text-slate-500">PDF o Immagini (max 3 file)</span>
        </div>

        {/* Lista Documenti caricati */}
        {data.documentAttachments && data.documentAttachments.length > 0 && (
          <div className="space-y-2">
            {data.documentAttachments.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs"
              >
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                  <span className="text-slate-200 truncate font-bold">{doc.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeDoc(doc.id)}
                  className="text-slate-500 hover:text-red-400 p-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {(data.documentAttachments || []).length < 3 && (
          <label className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-dashed border-slate-800 hover:border-slate-700 bg-slate-900/30 text-xs text-slate-400 hover:text-white cursor-pointer transition-all">
            <Upload className="w-4 h-4 text-slate-500" />
            <span>Aggiungi Scheda / Referto Medico</span>
            <input
              type="file"
              accept=".pdf,image/*"
              onChange={handleDocUpload}
              className="hidden"
            />
          </label>
        )}
      </div>

      {/* 3. Note Libere per il Coach */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
          Note Libere o Informazioni Aggiuntive per il Coach (Opzionale)
        </label>
        <textarea
          rows={3}
          value={data.finalNotesForCoach || ''}
          onChange={(e) => onChange({ finalNotesForCoach: e.target.value })}
          placeholder="Scrivi qui qualsiasi altra cosa che ritieni utile per il coach (orari particolari, preferenze o richieste specifiche)..."
          className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)] placeholder:text-slate-600"
        />
      </div>

      {/* 4. Presa Visione & Consenso */}
      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-start gap-3">
        <input
          type="checkbox"
          id="privacy-consent-box"
          checked={data.privacyConsent}
          onChange={(e) => onChange({ privacyConsent: e.target.checked })}
          className="w-5 h-5 rounded-lg accent-[var(--color-primary)] shrink-0 mt-0.5 cursor-pointer"
        />
        <label htmlFor="privacy-consent-box" className="text-xs text-slate-300 leading-relaxed cursor-pointer select-none">
          Dichiaro che i dati e le informazioni inserite in questo questionario di anamnesi sono veritieri e conformi al mio stato di salute attuale. Autorizzo il coach all'elaborazione dei dati per i programmi di allenamento e nutrizione personalizzati.
        </label>
      </div>
    </div>
  );
};
