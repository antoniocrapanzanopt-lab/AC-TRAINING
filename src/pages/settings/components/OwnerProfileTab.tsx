import React from 'react';
import { User, Save, UserX } from 'lucide-react';

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
  onOpenRemoveModal: () => void;
}

export const OwnerProfileTab: React.FC<OwnerProfileTabProps> = ({
  ownerForm,
  onOwnerFormChange,
  onSaveOwnerProfile,
  onOpenRemoveModal,
}) => {
  return (
    <div className="space-y-6">
      <form
        onSubmit={onSaveOwnerProfile}
        className="p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-6"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <User className="w-5 h-5 text-[var(--color-primary)]" /> Profilo del Proprietario dell'Attività
          </h3>
          <span className="px-2.5 py-1 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold text-[10px] uppercase border border-[var(--color-primary)]/20">
            Ruolo: Proprietario (Non Modificabile)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="owner-firstName" className="text-xs font-bold text-slate-300 block mb-1">Nome *</label>
            <input
              id="owner-firstName"
              type="text"
              required
              value={ownerForm.firstName}
              onChange={(e) => onOwnerFormChange({ ...ownerForm, firstName: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          <div>
            <label htmlFor="owner-lastName" className="text-xs font-bold text-slate-300 block mb-1">Cognome *</label>
            <input
              id="owner-lastName"
              type="text"
              required
              value={ownerForm.lastName}
              onChange={(e) => onOwnerFormChange({ ...ownerForm, lastName: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          <div>
            <label htmlFor="owner-email" className="text-xs font-bold text-slate-300 block mb-1">Email Amministratore / Proprietario</label>
            <input
              id="owner-email"
              type="email"
              required
              value={ownerForm.email}
              onChange={(e) => onOwnerFormChange({ ...ownerForm, email: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          <div>
            <label htmlFor="owner-orgName" className="text-xs font-bold text-slate-300 block mb-1">Nome Organizzazione / Palestra</label>
            <input
              id="owner-orgName"
              type="text"
              required
              value={ownerForm.organizationName}
              onChange={(e) => onOwnerFormChange({ ...ownerForm, organizationName: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          <div>
            <label htmlFor="owner-role-readonly" className="text-xs font-bold text-slate-300 block mb-1">Ruolo Assegnato</label>
            <input
              id="owner-role-readonly"
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

      {/* RIMOZIONE COMPLETA PROPRIETARIO */}
      <div className="p-6 rounded-2xl bg-red-950/20 border border-red-900/50 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-red-900/40 pb-3">
          <h4 className="text-sm font-bold text-red-400 flex items-center gap-2">
            <UserX className="w-5 h-5 text-red-400" /> Zona Pericolo — Rimuovi Configurazione Proprietario
          </h4>
          <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider bg-red-500/10 px-2 py-0.5 rounded">
            Azione Irreversibile
          </span>
        </div>

        <p className="text-xs text-slate-300">
          La rimozione completa cancella sia il profilo del proprietario che l'intero database locale della demo. L'applicazione eseguirà il logout e mostrerà nuovamente la schermata di <strong>Prima Configurazione (FirstRunSetupPage)</strong>.
        </p>

        <button
          type="button"
          onClick={onOpenRemoveModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs transition-all shadow"
        >
          <UserX className="w-4 h-4" /> RIMUOVI CONFIGURAZIONE PROPRIETARIO (2 PASSAGGI)
        </button>
      </div>
    </div>
  );
};
