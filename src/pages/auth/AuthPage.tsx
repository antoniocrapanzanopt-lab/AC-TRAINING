import React, { useState, useEffect } from 'react';
import { ShieldAlert, ArrowRight, KeyRound, Mail, Lock, CheckCircle2, ShieldCheck, Eye, EyeOff, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';

export const AuthPage: React.FC = () => {
  const { loginWithCredentials, requestPasswordReset, isPasswordRecovery, updateUserPassword, setIsPasswordRecovery } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Stato Modale Recupero Password
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [isResetLoading, setIsResetLoading] = useState(false);

  // Stato Creazione Nuova Password (dopo aver cliccato sul link dell'email)
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoverySuccess, setRecoverySuccess] = useState<string | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Sincronizza l'email nel popup di recupero se l'utente l'aveva già inserita nel login
  useEffect(() => {
    if (email && !resetEmail) {
      setResetEmail(email);
    }
  }, [email, resetEmail]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError(null);
    
    const { error } = await loginWithCredentials(email, password);
    if (error) {
      setLoginError('Credenziali non valide. Controlla email e password.');
    }
    
    setIsLoading(false);
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResetLoading(true);
    setResetMessage(null);
    setResetError(null);

    const result = await requestPasswordReset(resetEmail);
    if (result.success) {
      setResetMessage(result.message);
    } else {
      setResetError(result.message || 'Si è verificato un errore durante l\'invio del link.');
    }
    setIsResetLoading(false);
  };

  const handleUpdatePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);

    if (newPassword.length < 6) {
      setRecoveryError('La nuova password deve contenere almeno 6 caratteri.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setRecoveryError('Le due password non corrispondono. Riprova.');
      return;
    }

    setIsUpdatingPassword(true);
    const { error } = await updateUserPassword(newPassword);

    if (error) {
      setRecoveryError(error.message || 'Errore durante l\'aggiornamento della password. Il link potrebbe essere scaduto.');
      setIsUpdatingPassword(false);
    } else {
      setRecoverySuccess('Password reimpostata con successo! Stai per essere reindirizzato...');
      setIsUpdatingPassword(false);
      setTimeout(() => {
        setIsPasswordRecovery(false);
      }, 1500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between relative overflow-hidden select-none font-sans">
      {/* ─── EFFETTI LUCE DI SFONDO DINAMICI & AMBIENTALI ─── */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-[var(--color-primary)]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-10 right-10 w-[400px] h-[400px] bg-[var(--color-primary)]/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Griglia Tecnica Sottile di Sfondo */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{ 
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', 
          backgroundSize: '32px 32px' 
        }} 
      />

      {/* ─── HEADER MINIMALE BRANDED AD ALTA DEFINIZIONE ─── */}
      <header className="bg-slate-950/60 backdrop-blur-2xl border-b border-slate-800/60 px-5 sm:px-8 py-3.5 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          {/* Logo Ufficiale Trasparente in Box Satinato */}
          <div className="w-10 h-10 rounded-2xl bg-slate-900/90 border border-slate-800/90 flex items-center justify-center shrink-0 shadow-lg shadow-black/60 p-1.5 backdrop-blur-md">
            <img 
              src="/ac-logo-transparent.png" 
              alt="AC Coaching Logo" 
              className="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base sm:text-lg font-black tracking-wider text-white uppercase">
                <span className="text-[var(--color-primary)]">AC</span> COACHING
              </span>
            </div>
            <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold tracking-widest uppercase flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] inline-block shadow-[0_0_8px_var(--color-primary)] animate-pulse" />
              High Performance Management
            </p>
          </div>
        </div>

        {/* Badge di Sicurezza Crittografata */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-[10px] font-bold text-slate-300 backdrop-blur-md shadow-sm">
          <ShieldCheck className="w-3.5 h-3.5 text-[var(--color-primary)]" />
          <span className="hidden sm:inline">Portale Protetto & Crittografato</span>
        </div>
      </header>

      {/* ─── CARD CENTRALE (LOGIN NORMALE o IMPOSTA NUOVA PASSWORD) ─── */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 relative z-10">
        {isPasswordRecovery ? (
          /* ── SCHERMATA IMPOSTA NUOVA PASSWORD (DOPO CLICK SUL LINK EMAIL) ── */
          <div className="max-w-md w-full bg-slate-950/85 backdrop-blur-3xl border border-amber-500/30 rounded-[32px] p-7 sm:p-9 shadow-[0_0_60px_rgba(0,0,0,0.9)] space-y-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="absolute top-0 left-1/4 right-1/4 h-[2px] bg-gradient-to-r from-transparent via-[var(--color-primary)] to-transparent" />

            <div className="text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/10">
                <KeyRound className="w-7 h-7" />
              </div>
              <h1 className="text-2xl font-black tracking-tight text-white uppercase">
                Crea Nuova <span className="text-[var(--color-primary)]">Password</span>
              </h1>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                Inserisci la nuova password sicura per il tuo account su AC Coaching.
              </p>
            </div>

            <form onSubmit={handleUpdatePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Nuova Password (min. 6 caratteri)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nuova password"
                    className="w-full pl-10 pr-10 py-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-white text-sm focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all placeholder:text-slate-600 font-medium"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Conferma Nuova Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ripeti la nuova password"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-white text-sm focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all placeholder:text-slate-600 font-medium"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              {recoveryError && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start gap-2.5 text-rose-400 text-xs animate-in fade-in">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="font-bold">{recoveryError}</span>
                </div>
              )}

              {recoverySuccess && (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-start gap-2.5 text-emerald-400 text-xs animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="font-bold">{recoverySuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isUpdatingPassword}
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-[var(--color-primary)] text-slate-950 font-black text-sm hover:bg-[var(--color-primary-hover)] active:scale-98 transition-all shadow-xl shadow-[var(--color-primary)]/25 disabled:opacity-50 cursor-pointer mt-2"
              >
                {isUpdatingPassword ? (
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Salva Nuova Password & Entra</span>
                    <ArrowRight className="w-4 h-4 stroke-[3]" />
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* ── SCHERMATA LOGIN STANDARD ── */
          <div className="max-w-md w-full bg-slate-950/80 backdrop-blur-3xl border border-slate-800/80 rounded-[32px] p-7 sm:p-9 shadow-[0_0_60px_rgba(0,0,0,0.8)] space-y-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Riflesso di luce sottile superiore */}
            <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-[var(--color-primary)]/50 to-transparent" />

            {/* Testata Card con Logo AC Grande Trasparente & Medaglione Luminoso */}
            <div className="text-center space-y-3.5">
              <div className="relative mx-auto w-24 h-24 rounded-full bg-gradient-to-b from-slate-900/90 to-slate-950/90 border-2 border-[var(--color-primary)]/40 p-4 flex items-center justify-center shadow-2xl shadow-[var(--color-primary)]/20 group hover:scale-105 transition-all">
                <div className="absolute inset-0 rounded-full bg-[var(--color-primary)]/10 blur-md pointer-events-none" />
                <img 
                  src="/ac-logo-transparent.png" 
                  alt="AC Coaching Official" 
                  className="w-full h-full object-contain relative z-10 drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]"
                />
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase">
                  AC <span className="text-[var(--color-primary)]">COACHING</span>
                </h1>
                <p className="text-xs text-slate-400 font-medium mt-1">
                  Inserisci le tue credenziali per accedere al portale
                </p>
              </div>
            </div>

            {/* Form Campi Credenziali */}
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Email Account
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nome@esempio.com"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-white text-sm focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all placeholder:text-slate-600 font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (email.trim()) setResetEmail(email.trim());
                      setResetMessage(null);
                      setResetError(null);
                      setIsResetModalOpen(true);
                    }}
                    className="text-xs font-bold text-[var(--color-primary)] hover:underline cursor-pointer transition-colors"
                  >
                    Password dimenticata?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-white text-sm focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all placeholder:text-slate-600 font-medium"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {loginError && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start gap-2.5 text-rose-400 text-xs animate-in fade-in">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="font-bold">{loginError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-[var(--color-primary)] text-slate-950 font-black text-sm hover:bg-[var(--color-primary-hover)] active:scale-98 transition-all shadow-xl shadow-[var(--color-primary)]/25 disabled:opacity-50 cursor-pointer mt-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Accedi al Portale</span>
                    <ArrowRight className="w-4 h-4 stroke-[3]" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* ─── FOOTER MINIMALE ─── */}
      <footer className="py-4 text-center text-xs text-slate-500 relative z-10 border-t border-slate-900/80">
        <span>© {new Date().getFullYear()} AC COACHING • High Performance Platform</span>
      </footer>

      {/* ─── MODAL RECUPERO PASSWORD (OPZIONE 1) ─── */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => {
          setIsResetModalOpen(false);
          setResetMessage(null);
          setResetError(null);
        }}
        title="Password dimenticata?"
      >
        <div className="space-y-4 select-none">
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-300">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Inserisci l'indirizzo email con cui sei registrata/o su <strong>AC Coaching</strong>. Ti invieremo subito il link sicuro per impostare una nuova password e rientrare autonomamente.
            </p>
          </div>

          <form onSubmit={handleResetSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                Email Account Registrato
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="cliente@esempio.com"
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-[var(--color-primary)] font-medium"
                  required
                />
              </div>
            </div>

            {resetError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span className="font-medium">{resetError}</span>
              </div>
            )}

            {resetMessage && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-start gap-2.5 leading-relaxed">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-medium">{resetMessage}</span>
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsResetModalOpen(false);
                  setResetMessage(null);
                  setResetError(null);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={isResetLoading}
                className="px-4 py-2.5 bg-[var(--color-primary)] text-slate-950 font-black text-xs rounded-xl hover:bg-[var(--color-primary-hover)] active:scale-98 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-lg shadow-[var(--color-primary)]/20"
              >
                {isResetLoading ? (
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Invia Link</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};
