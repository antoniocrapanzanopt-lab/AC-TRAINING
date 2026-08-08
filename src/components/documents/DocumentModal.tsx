import React, { useState, useEffect } from 'react';
import { X, FileText, AlertTriangle, Calendar, User, Eye, Upload, CheckCircle2 } from 'lucide-react';
import { AthleteDocument, AthleteDocumentFormData, DocumentCategory, DocumentVisibility, StoredFile } from '../../types';
import { useAthletes } from '../../context/AthletesContext';
import { getLocalOwnerProfile } from '../../lib/ownerProfile';

const MAX_FILE_SIZE = 1048576; // 1 MB in byte
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AthleteDocumentFormData) => void;
  editingDocument: AthleteDocument | null;
  preselectedAthleteId?: string;
}

export const DocumentModal: React.FC<DocumentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingDocument,
  preselectedAthleteId,
}) => {
  const { athletes } = useAthletes();
  const owner = getLocalOwnerProfile();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('medical_certificate');
  const [visibility, setVisibility] = useState<DocumentVisibility>('shared_with_athlete');
  const [athleteId, setAthleteId] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  
  const [fileObject, setFileObject] = useState<StoredFile | null>(null);
  const [fileInputName, setFileInputName] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isReadingFile, setIsReadingFile] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (editingDocument) {
      setTitle(editingDocument.title);
      setCategory(editingDocument.category);
      setVisibility(editingDocument.visibility);
      setAthleteId(editingDocument.athleteId);
      setExpiryDate(editingDocument.expiryDate || '');
      setNotes(editingDocument.notes || '');
      setFileObject(editingDocument.file);
      setFileInputName(editingDocument.file.fileName);
    } else {
      setTitle('');
      setCategory('medical_certificate');
      setVisibility('shared_with_athlete');
      setAthleteId(preselectedAthleteId || (athletes.length > 0 ? athletes[0].id : ''));
      setExpiryDate('');
      setNotes('');
      setFileObject(null);
      setFileInputName('');
    }
    setErrors([]);
    setIsReadingFile(false);
  }, [isOpen, editingDocument, preselectedAthleteId, athletes]);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const fileErrs: string[] = [];
    const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();

    // 1. Validazione estensione e MIME type
    if (!ALLOWED_EXTENSIONS.includes(ext) || (!ALLOWED_MIME_TYPES.includes(selectedFile.type) && selectedFile.type !== '')) {
      fileErrs.push(`Formato file non supportato (${ext}). Sono ammessi soltanto file PDF, JPG, JPEG e PNG.`);
    }

    // 2. Validazione dimensione massima (1 MB)
    if (selectedFile.size > MAX_FILE_SIZE) {
      const sizeMb = (selectedFile.size / (1024 * 1024)).toFixed(2);
      fileErrs.push(`Il file supera il limite massimo di 1 MB (Dimensione attuale: ${sizeMb} MB). Ridimensiona o comprimi il file prima di caricarlo.`);
    }

    if (fileErrs.length > 0) {
      setErrors(fileErrs);
      setFileObject(null);
      setFileInputName('');
      return;
    }

    setErrors([]);
    setIsReadingFile(true);
    setFileInputName(selectedFile.name);

    // 3. Conversione in Data URL dopo superamento validazione
    const reader = new FileReader();

    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setFileObject({
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          fileType: selectedFile.type || 'application/octet-stream',
          dataUrl,
        });
        if (!title.trim()) {
          setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
        }
      }
      setIsReadingFile(false);
    };

    reader.onerror = (err) => {
      console.error('Errore durante la lettura del file locale:', err);
      setErrors(['Errore durante la lettura del file dal disco locale. Riprovare con un altro file.']);
      setFileObject(null);
      setFileInputName('');
      setIsReadingFile(false);
    };

    reader.readAsDataURL(selectedFile);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: string[] = [];

    if (!title.trim()) errs.push('Il titolo del documento è obbligatorio.');
    if (!athleteId) errs.push('Seleziona l\'atleta di riferimento.');
    if (!fileObject) errs.push('Seleziona ed allega un file valido (PDF, JPG, JPEG o PNG < 1 MB).');

    if (errs.length > 0) {
      setErrors(errs);
      return;
    }

    const selectedAthlete = athletes.find(a => a.id === athleteId);

    const formData: AthleteDocumentFormData = {
      title,
      category,
      visibility,
      athleteId,
      athleteName: selectedAthlete ? selectedAthlete.fullName : 'Atleta Sconosciuto',
      expiryDate: expiryDate || undefined,
      file: fileObject!,
      notes,
      uploadedBy: owner?.fullName || 'Proprietario Demo',
    };

    onSave(formData);
    onClose();
  };

  const inputCls = "w-full px-3 py-2 rounded-xl bg-slate-950 border border-[var(--color-panel-border)] text-white text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-slate-600";
  const labelCls = "block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl shadow-2xl flex flex-col my-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-panel-border)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {editingDocument ? 'Modifica Documento Atleta' : 'Nuovo Documento Locale'}
              </h2>
              <p className="text-xs text-slate-400">Salvataggio locale demo per certificati, moduli e contratti</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form id="document-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          {errors.length > 0 && (
            <div className="p-4 rounded-xl bg-red-950/30 border border-red-900/50 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-400">Attenzione:</p>
                <ul className="text-xs text-red-300 list-disc list-inside mt-1">
                  {errors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            </div>
          )}

          {/* Selezione File */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <label className={labelCls}>File Allegato (PDF, JPG, PNG - Max 1 MB) *</label>
            <div className="flex items-center gap-3">
              <label className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer border border-slate-700 transition-colors">
                <Upload className="w-4 h-4 text-[var(--color-primary)]" />
                <span>{editingDocument ? 'Sostituisci File' : 'Sfoglia File...'}</span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
              <span className="text-xs text-slate-400 truncate">
                {isReadingFile ? 'Conversione locale in corso...' : fileInputName || 'Nessun file selezionato'}
              </span>
            </div>

            {fileObject && (
              <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-900/50 flex items-center justify-between text-xs text-emerald-400">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> File validato: {fileObject.fileName} ({(fileObject.fileSize / 1024).toFixed(1)} KB)
                </span>
              </div>
            )}
          </div>

          <div>
            <label className={labelCls}>Titolo Documento *</label>
            <input
              type="text"
              placeholder="Es. Certificato Medico 2026, Contratto Iscrizione..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Atleta *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <select
                  value={athleteId}
                  onChange={e => setAthleteId(e.target.value)}
                  className={`${inputCls} pl-9`}
                >
                  <option value="">-- Seleziona Atleta --</option>
                  {athletes.map(a => (
                    <option key={a.id} value={a.id}>{a.fullName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={labelCls}>Categoria Documento *</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as DocumentCategory)}
                className={inputCls}
              >
                <option value="medical_certificate">Certificato Medico</option>
                <option value="identity">Documento d'Identità</option>
                <option value="privacy_consent">Privacy e Consenso</option>
                <option value="contract">Contratto / Modulo Iscrizione</option>
                <option value="assessment_sheet">Scheda Valutazione / Plicometria</option>
                <option value="other">Altro Documento</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Visibilità *</label>
              <div className="relative">
                <Eye className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <select
                  value={visibility}
                  onChange={e => setVisibility(e.target.value as DocumentVisibility)}
                  className={`${inputCls} pl-9`}
                >
                  <option value="shared_with_athlete">Condiviso nel Portale Atleta</option>
                  <option value="private">Riservato solo allo Staff (Privato)</option>
                </select>
              </div>
            </div>

            <div>
              <label className={labelCls}>Data Scadenza Documento (Opzionale)</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="date"
                  value={expiryDate}
                  onChange={e => setExpiryDate(e.target.value)}
                  className={`${inputCls} pl-9`}
                />
              </div>
            </div>
          </div>

          <div>
            <label className={labelCls}>Note Riservate / Appunti</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className={`${inputCls} resize-none`}
              rows={2}
              placeholder="Eventuali dettagli sul documento..."
            />
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--color-panel-border)] bg-slate-900/30 flex items-center justify-end gap-3 shrink-0 rounded-b-2xl">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors">
            Annulla
          </button>
          <button type="submit" form="document-form" className="px-6 py-2 rounded-xl bg-[var(--color-primary)] text-black text-xs font-black hover:bg-[var(--color-primary-hover)] transition-colors shadow-lg">
            Salva Documento Locale
          </button>
        </div>
      </div>
    </div>
  );
};
