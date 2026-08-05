import React, { useState } from 'react';
import { Dumbbell, ShieldAlert, ArrowRight, KeyRound, Info, UserCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';

export const AuthPage: React.FC = () => {
  const { loginWithCredentials, requestPasswordReset } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoading(true);
    const { error } = await loginWithCredentials(email, password);
    if (error) {
      setLoginError(error.message);
    }
    setIsLoading(false);
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await requestPasswordReset(resetEmail);
    setResetMessage(result.message);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-white flex flex-col justify-between">
      <div className="bg-[var(--color-primary)] text-black text-center py-2 text-xs font-bold shadow-md relative z-10 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-4 px-4">
        <span className="flex items-center gap-1.5"><ShieldAlert className="w-4 h-4" /> APPLICAZIONE LIVE CLOUD (SUPABASE)</span>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 flex items-center justify-center">
              <Dumbbell className="w-7 h-7 text-[var(--color-primary)]" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white uppercase">
              Builder <span className="text-[var(--color-primary)]">Athlete</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">Accesso Piattaforma Cloud</p>
          </div>

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
                <label className="block text-xs font-semibold text-slate-300">Password</label>
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

            {loginError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-red-400 text-xs">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-primary)] text-black font-bold text-xs hover:bg-[var(--color-primary-hover)] transition-all shadow-lg shadow-[var(--color-primary)]/20 disabled:opacity-50"
            >
              <span>{isLoading ? 'Accesso in corso...' : 'Accedi'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      <Modal
        isOpen={isResetModalOpen}
        onClose={() => {
          setIsResetModalOpen(false);
          setResetMessage(null);
        }}
        title="Recupero Password"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed">
            Inserisci l'indirizzo email per ricevere il link di ripristino.
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
              <span>Invia Link di Ripristino</span>
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
        Builder Athlete Manager — Piattaforma Cloud
      </footer>
    </div>
  );
};
