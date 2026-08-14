import React from 'react';
import { ShieldCheck, ShieldAlert } from 'lucide-react';

interface MFASecurityStatusCardProps {
  hasVerifiedFactors: boolean;
  onSetupClick: () => void;
}

export const MFASecurityStatusCard: React.FC<MFASecurityStatusCardProps> = ({ 
  hasVerifiedFactors, 
  onSetupClick 
}) => {
  return (
    <div className="p-5 bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
            hasVerifiedFactors ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
          }`}>
            {hasVerifiedFactors ? (
              <ShieldCheck className="w-6 h-6" />
            ) : (
              <ShieldAlert className="w-6 h-6" />
            )}
          </div>
          
          <div>
            <h3 className="text-white font-bold mb-1">
              {hasVerifiedFactors ? 'Autenticazione a Due Fattori (MFA) Attiva' : 'Autenticazione a Due Fattori (MFA) Non Attiva'}
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed max-w-lg">
              {hasVerifiedFactors 
                ? 'Il tuo account è protetto con un livello di sicurezza aggiuntivo. Richiediamo un codice dalla tua app Authenticator per gli accessi da nuovi dispositivi.'
                : 'Aggiungi un livello di sicurezza extra al tuo account richiedendo un codice generato dalla tua app Authenticator oltre alla password.'}
            </p>
          </div>
        </div>

        {!hasVerifiedFactors && (
          <button
            onClick={onSetupClick}
            className="shrink-0 bg-[var(--color-primary)] text-black px-4 py-2 rounded-xl text-sm font-bold hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            Attiva MFA
          </button>
        )}
      </div>
    </div>
  );
};
