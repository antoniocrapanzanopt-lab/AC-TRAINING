import React, { useState, useRef } from 'react';
import { X, Upload, Link as LinkIcon, Image as ImageIcon, Trash2, Check, Sparkles } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface LogoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLogo: string | null;
  onLogoUpdated: (newLogoUrl: string | null) => void;
}

export const LogoUploadModal: React.FC<LogoUploadModalProps> = ({
  isOpen,
  onClose,
  currentLogo,
  onLogoUpdated,
}) => {
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState('');
  const [previewLogo, setPreviewLogo] = useState<string | null>(currentLogo);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showError('File troppo grande', 'Carica un\'immagine inferiore a 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPreviewLogo(result);
    };
    reader.readAsDataURL(file);
  };

  const handleUrlApply = () => {
    if (!urlInput.trim()) {
      showError('URL vuoto', 'Inserisci un URL valido per il logo.');
      return;
    }
    setPreviewLogo(urlInput.trim());
  };

  const handleSave = () => {
    if (previewLogo) {
      localStorage.setItem('builder_custom_logo', previewLogo);
      onLogoUpdated(previewLogo);
      showSuccess('Logo aggiornato!', 'Il nuovo logo di AC COACHING è ora visibile in tutta l\'applicazione.');
    } else {
      localStorage.removeItem('builder_custom_logo');
      onLogoUpdated(null);
      showSuccess('Logo ripristinato', 'È stato ripristinato il logo predefinito.');
    }
    window.dispatchEvent(new Event('app_logo_updated'));
    onClose();
  };

  const handleResetDefault = () => {
    setPreviewLogo(null);
    setUrlInput('');
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl space-y-5 p-6 animate-in fade-in zoom-in duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/30">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Personalizza Logo Brand</h3>
              <p className="text-xs text-slate-400">AC COACHING — High performance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Anteprima Logo Corrente */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
            {previewLogo ? (
              <img src={previewLogo} alt="Anteprima Logo" className="w-full h-full object-contain p-1" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/40 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-[var(--color-primary)]" />
              </div>
            )}
          </div>
          <div>
            <span className="text-xs font-extrabold text-white block">Anteprima Logo In-App</span>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {previewLogo ? 'Logo personalizzato attivo' : 'Logo predefinito (AC COACHING)'}
            </p>
            {previewLogo && (
              <button
                type="button"
                onClick={handleResetDefault}
                className="mt-1 text-[11px] text-rose-400 hover:underline font-bold flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Ripristina predefinito
              </button>
            )}
          </div>
        </div>

        {/* Tabs Selezione Metodo */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'upload' ? 'bg-[var(--color-primary)] text-black font-black shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Carica da File</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'url' ? 'bg-[var(--color-primary)] text-black font-black shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Incolla URL</span>
          </button>
        </div>

        {/* Contenuto Tab */}
        {activeTab === 'upload' ? (
          <div className="space-y-3">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-6 rounded-2xl border-2 border-dashed border-slate-800 hover:border-[var(--color-primary)]/50 bg-slate-950/40 hover:bg-slate-950/70 transition-all cursor-pointer text-center space-y-2 group"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-800 group-hover:bg-[var(--color-primary)]/20 text-slate-400 group-hover:text-[var(--color-primary)] flex items-center justify-center mx-auto transition-colors">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Clicca per selezionare un file</p>
                <p className="text-[10px] text-slate-500 mt-0.5">PNG, JPG, SVG o WebP (Max 5MB)</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-300 block">Link Immagine Logo (URL)</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://esempio.it/logo.png"
                className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-[var(--color-primary)]"
              />
              <button
                type="button"
                onClick={handleUrlApply}
                className="px-4 py-2.5 bg-slate-800 text-white font-bold text-xs rounded-xl hover:bg-slate-700 transition-colors"
              >
                Applica
              </button>
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white border border-slate-800 hover:bg-slate-800 transition-colors"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 bg-[var(--color-primary)] hover:bg-amber-400 text-black font-black text-xs rounded-xl shadow-lg shadow-[var(--color-primary)]/20 transition-all flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Salva Logo</span>
          </button>
        </div>
      </div>
    </div>
  );
};
