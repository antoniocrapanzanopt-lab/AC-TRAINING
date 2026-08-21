import React, { useState, useEffect } from 'react';
import { User, Save, Image as ImageIcon, Camera, Dumbbell } from 'lucide-react';
import { LogoUploadModal } from '../../../components/layout/LogoUploadModal';

interface OwnerFormState {
  firstName: string;
  lastName: string;
  email: string;
  organizationName: string;
}

interface OwnerProfileTabProps {
  ownerForm: OwnerFormState;
  onOwnerFormChange: (updated: OwnerFormState) => void;
  onSaveOwnerProfile: (e: React.FormEvent) => void;
}

export const OwnerProfileTab: React.FC<OwnerProfileTabProps> = ({
  ownerForm,
  onOwnerFormChange,
  onSaveOwnerProfile,
}) => {
  const [customLogo, setCustomLogo] = useState<string | null>(() => localStorage.getItem('builder_custom_logo'));
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);

  useEffect(() => {
    const handleLogoUpdate = () => {
      setCustomLogo(localStorage.getItem('builder_custom_logo'));
    };
    window.addEventListener('app_logo_updated', handleLogoUpdate);
    return () => window.removeEventListener('app_logo_updated', handleLogoUpdate);
  }, []);

  return (
    <div className="space-y-6">
      {/* SEZIONE LOGO BRAND */}
      <div className="p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-[var(--color-primary)]" /> Logo del Brand / Palestra
          </h3>
          <span className="text-xs text-slate-400">Visibile nel menu e nel portale atleti</span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
          <div className="relative group cursor-pointer" onClick={() => setIsLogoModalOpen(true)}>
            <div className="w-24 h-24 rounded-2xl bg-slate-900 border-2 border-slate-700 flex items-center justify-center overflow-hidden shadow-lg group-hover:border-[var(--color-primary)] transition-all">
              {customLogo ? (
                <img src={customLogo} alt="Logo" className="w-full h-full object-contain p-2" />
              ) : (
                <Dumbbell className="w-10 h-10 text-slate-600 group-hover:text-[var(--color-primary)] transition-colors" />
              )}
            </div>
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 rounded-2xl flex items-center justify-center transition-opacity">
              <Camera className="w-6 h-6 text-white" />
            </div>
          </div>

          <div className="space-y-2 text-center sm:text-left">
            <h4 className="text-sm font-bold text-white">Personalizza il tuo Logo</h4>
            <p className="text-xs text-slate-400 max-w-sm">
              Carica un logo personalizzato in formato PNG o SVG ad alta risoluzione (consigliato sfondo trasparente).
            </p>
            <button
              type="button"
              onClick={() => setIsLogoModalOpen(true)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all border border-slate-700 cursor-pointer"
            >
              Gestisci Logo
            </button>
          </div>
        </div>
      </div>

      {/* FORM DATI PROPRIETARIO */}
      <form onSubmit={onSaveOwnerProfile} className="p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <User className="w-5 h-5 text-[var(--color-primary)]" /> Dati Anagrafici Proprietario
          </h3>
          <span className="text-xs text-slate-400">Modifica i dettagli visibili nel sistema</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Nome *</label>
            <input
              type="text"
              required
              value={ownerForm.firstName}
              onChange={e => onOwnerFormChange({ ...ownerForm, firstName: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Cognome *</label>
            <input
              type="text"
              required
              value={ownerForm.lastName}
              onChange={e => onOwnerFormChange({ ...ownerForm, lastName: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Email Ufficiale *</label>
            <input
              type="email"
              required
              value={ownerForm.email}
              onChange={e => onOwnerFormChange({ ...ownerForm, email: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Nome Organizzazione / Palestra</label>
            <input
              type="text"
              required
              value={ownerForm.organizationName}
              onChange={(e) => onOwnerFormChange({ ...ownerForm, organizationName: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Ruolo Piattaforma</label>
            <input
              type="text"
              disabled
              value="Proprietario (Amministratore Principale)"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs cursor-not-allowed font-semibold"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all shadow"
          >
            <Save className="w-4 h-4" /> Aggiorna Profilo Proprietario in Tempo Reale
          </button>
        </div>
      </form>

      <LogoUploadModal
        isOpen={isLogoModalOpen}
        onClose={() => setIsLogoModalOpen(false)}
        currentLogo={customLogo}
        onLogoUpdated={(newLogo) => setCustomLogo(newLogo)}
      />
    </div>
  );
};
