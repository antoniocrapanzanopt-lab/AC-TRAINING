import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { MFAChallengeScreen } from './MFAChallengeScreen';
import { MFASetup } from './MFASetup';
import { LogOut, Loader2 } from 'lucide-react';

export const RequireAAL2: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { authScreenState, refreshAuthProfile, logout } = useAuth();

  if (authScreenState === 'LOADING') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-[var(--color-primary)]">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Verifica Sicurezza...
          </span>
        </div>
      </div>
    );
  }

  if (authScreenState === 'CHALLENGE_REQUIRED') {
    return (
      <MFAChallengeScreen 
        onSuccess={refreshAuthProfile} 
        onCancel={logout} 
      />
    );
  }

  if (authScreenState === 'SETUP_REQUIRED') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h2 className="text-red-500 font-bold mb-2">SICUREZZA OBBLIGATORIA</h2>
            <p className="text-sm text-slate-400">Il tuo ruolo richiede l'attivazione dell'Autenticazione a Due Fattori (MFA) per procedere.</p>
          </div>
          
          <MFASetup 
            onComplete={refreshAuthProfile} 
            onCancel={logout} 
          />
          
          <button 
            onClick={logout}
            className="flex items-center justify-center gap-2 w-full text-slate-400 hover:text-white transition-colors py-2 text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Disconnettiti</span>
          </button>
        </div>
      </div>
    );
  }

  // ALLOWED (or LOGIN, which is handled elsewhere if not logged in)
  return <>{children}</>;
};
