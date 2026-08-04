import React, { useState } from 'react';
import { ShieldCheck, Eye, EyeOff, AlertTriangle, KeyRound } from 'lucide-react';
import { Modal } from '../common/Modal';

export interface DevLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const DevLoginModal: React.FC<DevLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [masterKeyInput, setMasterKeyInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirmAccess = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const configuredMasterKey = import.meta.env.VITE_DEV_MASTER_KEY;

    if (!configuredMasterKey || masterKeyInput.trim() !== configuredMasterKey.trim()) {
      setMasterKeyInput('');
      setErrorMsg('Chiave di sicurezza non valida.');
      return;
    }

    setMasterKeyInput('');
    setErrorMsg(null);
    onSuccess();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Accesso Riservato">
      <form onSubmit={handleConfirmAccess} className="space-y-4 pt-1">
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
          <ShieldCheck className="w-5 h-5 text-[var(--color-primary)] shrink-0" />
          <p className="leading-relaxed">
            Inserisci la chiave di sicurezza per accedere al sistema.
          </p>
        </div>

        {/* MESSAGGIO D'ERRORE GENERICO E PULITO */}
        {errorMsg && (
          <div className="p-3 rounded-2xl bg-red-950/60 border border-red-500/60 text-red-300 text-xs flex items-center gap-2 font-bold animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* INPUT CHIAVE DI SICUREZZA */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-300 block">Chiave di Sicurezza *</label>
          <div className="relative">
            <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              autoFocus
              value={masterKeyInput}
              onChange={(e) => {
                setMasterKeyInput(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="••••••••"
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-[var(--color-primary)]"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* PULSANTI DI AZIONE */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => {
              setMasterKeyInput('');
              setErrorMsg(null);
              onClose();
            }}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors"
          >
            Annulla
          </button>

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-[var(--color-primary)] hover:brightness-110 text-black text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-[var(--color-primary)]/20"
          >
            Conferma Accesso
          </button>
        </div>
      </form>
    </Modal>
  );
};
