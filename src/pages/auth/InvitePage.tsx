import React, { useState } from 'react';
import { Dumbbell, ShieldAlert, UserPlus, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface InvitePageProps {
  email: string;
}

export const InvitePage: React.FC<InvitePageProps> = ({ email }) => {
  const { signUpAthlete } = useAuth();
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const { error: signUpError } = await signUpAthlete(email, password);
    
    if (signUpError) {
      setError('Si è verificato un errore: ' + signUpError.message);
    } else {
      setSuccess(true);
      // Dopo il successo, l'app dovrebbe reindirizzare in automatico perché l'utente è loggato
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-sm">
        <div className="bg-slate-900 border border-[var(--color-panel-border)] rounded-3xl p-6 shadow-2xl relative z-10">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl flex items-center justify-center border border-[var(--color-primary)]/30 shadow-lg shadow-[var(--color-primary)]/10">
              <Dumbbell className="w-6 h-6 text-[var(--color-primary)]" />
            </div>
          </div>
          
          <h1 className="text-xl font-black text-white text-center mb-2">
            BENVENUTO ATLETA
          </h1>
          <p className="text-slate-400 text-xs text-center font-medium mb-6">
            Il tuo coach ti ha invitato. Imposta una password per il tuo account: <strong className="text-white">{email}</strong>
          </p>

          {success ? (
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex flex-col items-center gap-2 text-green-400 text-sm text-center">
              <CheckCircle className="w-8 h-8 mb-2" />
              <span>Password impostata con successo!</span>
              <span className="text-xs text-slate-400">Accesso in corso...</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Scegli una Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimo 6 caratteri"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-[var(--color-panel-border)] text-white text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                  required
                  minLength={6}
                />
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-red-400 text-xs">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || password.length < 6}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[var(--color-primary)] text-black font-bold text-sm hover:bg-[var(--color-primary-hover)] transition-all shadow-lg shadow-[var(--color-primary)]/20 disabled:opacity-50 mt-4"
              >
                {isLoading ? 'Creazione Account...' : 'Salva e Accedi'}
                <UserPlus className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
