import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MFASecurityStatusCard } from '../../components/auth/MFASecurityStatusCard';
import { MFAFactorsList } from '../../components/auth/MFAFactorsList';
import { MFASetup } from '../../components/auth/MFASetup';
import { ShieldCheck, Info } from 'lucide-react';

export const SecuritySettingsPage: React.FC = () => {
  const { mfa, refreshAuthProfile } = useAuth();
  const { mfaState } = mfa;
  const [showSetup, setShowSetup] = useState(false);

  const handleSetupComplete = () => {
    setShowSetup(false);
    refreshAuthProfile();
    mfa.loadMFAStatus();
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <ShieldCheck className="w-7 h-7 text-[var(--color-primary)]" />
          Sicurezza Account
        </h1>
      </div>

      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-300">
          <p className="font-bold mb-1">Protezione Avanzata</p>
          <p>
            L'autenticazione a due fattori (MFA) aggiunge un livello di sicurezza vitale. 
            Per i Coach e gli Amministratori, l'MFA è <strong>obbligatoria</strong> e non può essere aggirata per accedere ai dati sensibili degli atleti.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {showSetup ? (
          <div className="max-w-md mx-auto">
            <h2 className="text-lg font-bold text-white mb-4">Configurazione Nuovo Dispositivo</h2>
            <MFASetup 
              onComplete={handleSetupComplete} 
              onCancel={() => setShowSetup(false)} 
            />
          </div>
        ) : (
          <>
            <MFASecurityStatusCard 
              hasVerifiedFactors={mfaState.hasVerifiedFactors} 
              onSetupClick={() => setShowSetup(true)} 
            />

            {mfaState.hasVerifiedFactors && (
              <div className="bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Dispositivi Authenticator Verificati</h3>
                <MFAFactorsList />
                
                <div className="mt-6 pt-6 border-t border-[var(--color-panel-border)] flex justify-end">
                  <button
                    onClick={() => setShowSetup(true)}
                    className="bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-700 transition-colors"
                  >
                    + Aggiungi un altro dispositivo
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
