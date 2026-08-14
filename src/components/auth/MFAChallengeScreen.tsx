import React, { useState, useEffect } from 'react';
import { useMFA } from '../../hooks/useMFA';
import { useToast } from '../../context/ToastContext';
import { ShieldAlert, ArrowRight, Lock } from 'lucide-react';

export const MFAChallengeScreen: React.FC<{ onSuccess: () => void; onCancel: () => void }> = ({ onSuccess, onCancel }) => {
  const { challengeFactor, verifyFactor, getPrimaryFactor, loading } = useMFA();
  const { showError } = useToast();
  
  const [code, setCode] = useState('');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [localLoading, setLocalLoading] = useState(true);

  useEffect(() => {
    const initChallenge = async () => {
      setLocalLoading(true);
      const factor = getPrimaryFactor();
      if (!factor) {
        setLocalLoading(false);
        return;
      }
      
      setFactorId(factor.id);
      const challenge = await challengeFactor(factor.id);
      if (challenge) {
        setChallengeId(challenge.id);
      } else {
        showError('Impossibile inizializzare la verifica MFA.');
      }
      setLocalLoading(false);
    };
    
    initChallenge();
  }, [getPrimaryFactor, challengeFactor, showError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6 || !factorId || !challengeId) return;
    
    const success = await verifyFactor(factorId, challengeId, code);
    if (success) {
      onSuccess();
    } else {
      showError('Codice non valido. Riprova.');
    }
  };

  const isWorking = loading || localLoading;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-4 fixed inset-0 z-50">
      <div className="max-w-md w-full bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 flex items-center justify-center mb-4">
            <Lock className="w-7 h-7 text-[var(--color-primary)]" />
          </div>
          <h2 className="text-2xl font-black text-white">Verifica in Due Passaggi</h2>
          <p className="text-sm text-slate-400">
            Inserisci il codice a 6 cifre generato dalla tua app Authenticator per accedere all'area sicura.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center">
            <input
              type="text"
              placeholder="123456"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
              className="w-full bg-slate-900 text-white text-center text-3xl tracking-[0.4em] p-4 rounded-xl border border-[var(--color-panel-border)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              autoFocus
              required
              disabled={isWorking}
            />
          </div>
          
          <button 
            type="submit"
            disabled={isWorking || code.length !== 6}
            className="w-full flex items-center justify-center gap-2 bg-[var(--color-primary)] text-black px-6 py-3 rounded-xl font-bold hover:bg-[var(--color-primary-hover)] transition-all shadow-lg shadow-[var(--color-primary)]/20 disabled:opacity-50"
          >
            <span>{isWorking ? 'Verifica in corso...' : 'Verifica Accesso'}</span>
            {!isWorking && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="text-center pt-6 border-t border-[var(--color-panel-border)]">
          <button 
            onClick={onCancel}
            disabled={isWorking}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            Annulla e disconnettiti
          </button>
        </div>
        
        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-start gap-2.5 text-blue-400 text-xs">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Hai perso il telefono? Contatta l'amministratore per disabilitare l'MFA sul tuo account.</span>
        </div>
      </div>
    </div>
  );
};
