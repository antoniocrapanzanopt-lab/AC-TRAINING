import React, { useState } from 'react';
import { Dumbbell, ShieldAlert, ArrowRight, KeyRound, Info, UserCheck } from 'lucide-react';
import { DemoBanner } from '../../components/common/DemoBanner';
import { useAuth } from '../../context/AuthContext';
import { getLocalOwnerProfile } from '../../lib/ownerProfile';
import { Modal } from '../../components/common/Modal';

export const AuthPage: React.FC = () => {
  const { loginAsOwner, loginWithCredentials, requestPasswordReset } = useAuth();
  const ownerProfile = getLocalOwnerProfile();

  const [email, setEmail] = useState(ownerProfile?.email || 'owner.demo@example.com');
  const [password, setPassword] = useState('••••••••');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState(ownerProfile?.email || '');
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginWithCredentials(email);
  };

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = requestPasswordReset(resetEmail);
    setResetMessage(result.message);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-white flex flex-col justify-between">
      <DemoBanner />

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 flex items-center justify-center">
              <Dumbbell className="w-7 h-7 text-[var(--color-primary)]" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white uppercase">
              Builder <span className="text-[var(--color-primary)]">Athlete</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">Accesso Demo alla Piattaforma</p>
          </div>

          {/* Profilo Proprietario Rilevato */}
          <div className="p-3 bg-slate-900/80 border border-[var(--color-primary)]/30 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-lg bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/40 flex items-center justify-center shrink-0">
                <UserCheck className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-white truncate">{ownerProfile?.fullName || 'Proprietario Demo'}</p>
                <p className="text-[10px] text-slate-400 truncate">{ownerProfile?.organizationName || 'Organizzazione Demo'}</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--color-primary)] text-black shrink-0 uppercase">
              Proprietario
            </span>
          </div>

          {/* Pulsante di Accesso Diretto per il Proprietario */}
          <button
            onClick={loginAsOwner}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[var(--color-primary)] text-black font-extrabold text-xs uppercase tracking-wider hover:bg-[var(--color-primary-hover)] transition-all shadow-lg shadow-[var(--color-primary)]/20"
          >
            <span>ACCEDI SUBITO IN MODALITÀ DEMO</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-3 text-[11px] uppercase font-semibold text-slate-500">oppure simula il login</span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          {/* Form Demonstrativo Credenziali */}
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-[var(--color-panel-border)] text-white text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-300">Password (Simulata)</label>
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(true)}
                  className="text-[11px] text-[var(--color-primary)] hover:underline"
                >
                  Password dimenticata?
                </button>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-[var(--color-panel-border)] text-white text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                required
              />
            </div>

            {/* Avviso Autenticazione Simulata */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-amber-300 text-xs">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>L'autenticazione è puramente simulata in locale. Nessuna password viene verificata su server remoti.</span>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-700 transition-all border border-slate-700"
            >
              <span>Accedi con Credenziali Demo</span>
            </button>
          </form>
        </div>
      </div>

      {/* Modale Recupero Password Simulata */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => {
          setIsResetModalOpen(false);
          setResetMessage(null);
        }}
        title="Recupero Password Dimostrativo"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed">
            Inserisci l'indirizzo email per verificare la simulazione di invio del link di ripristino.
          </p>

          <form onSubmit={handleResetSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-[var(--color-panel-border)] text-white text-sm focus:outline-none focus:border-[var(--color-primary)]"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-primary)] text-black font-bold text-xs hover:bg-[var(--color-primary-hover)] transition-colors"
            >
              <KeyRound className="w-4 h-4" />
              <span>Invia Link di Ripristino (Simulato)</span>
            </button>
          </form>

          {resetMessage && (
            <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl flex items-start gap-2.5 text-slate-300 text-xs mt-3">
              <Info className="w-4 h-4 text-[var(--color-primary)] shrink-0 mt-0.5" />
              <span>{resetMessage}</span>
            </div>
          )}
        </div>
      </Modal>

      <footer className="p-4 text-center text-xs text-slate-500 border-t border-[var(--color-panel-border)]/40">
        Builder Athlete Manager — Demo Didattica Locale
      </footer>
    </div>
  );
};
