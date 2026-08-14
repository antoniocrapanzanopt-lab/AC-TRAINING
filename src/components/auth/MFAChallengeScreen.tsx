import React, { useState, useEffect } from 'react';
import { useMFA } from '../../hooks/useMFA';
import { useToast } from '../../context/ToastContext';
import { ShieldAlert, ArrowRight, Lock, Loader2 } from 'lucide-react';

export const MFAChallengeScreen: React.FC<{ onSuccess: () => void; onCancel: () => void }> = ({ onSuccess, onCancel }) => {
  const { challengeFactor, verifyFactor, getPrimaryFactor } = useMFA();
  const { showError } = useToast();
  
  const [code, setCode] = useState('');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let isMounted = true;

    const initChallenge = async () => {
      setIsInitializing(true);
      setErrorMsg('');
      try {
        const factor = getPrimaryFactor();
        if (!factor) {
          if (isMounted) setIsInitializing(false);
          return;
        }
        
        if (isMounted) setFactorId(factor.id);
        const challenge = await challengeFactor(factor.id);
        if (challenge && isMounted) {
          setChallengeId(challenge.id);
        } else if (isMounted) {
          setErrorMsg('Impossibile avviare la verifica MFA. Ricarica la pagina.');
        }
      } catch (err: any) {
        if (isMounted) setErrorMsg(err?.message || 'Errore durante la verifica');
      } finally {
        if (isMounted) setIsInitializing(false);
      }
    };
    
    initChallenge();

    return () => {
      isMounted = false;
    };
  }, [getPrimaryFactor, challengeFactor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6 || !factorId || !challengeId) return;
    
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const success = await verifyFactor(factorId, challengeId, code);
      if (success) {
        onSuccess();
      } else {
        setErrorMsg('Codice non valido o scaduto. Assicurati che l\'orario del telefono sia corretto.');
        showError('Codice non valido. Riprova.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Errore durante la verifica');
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <div className="flex flex-col items-center gap-2">
            <input
              type="text"
              placeholder="123456"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
              className="w-full bg-slate-900 text-white text-center text-3xl tracking-[0.4em] p-4 rounded-xl border border-[var(--color-panel-border)] focus:outline-none focus:border-[var(--color-primary)] transition-colors disabled:opacity-50"
              autoFocus
              required
              disabled={isInitializing || isSubmitting}
            />

            {errorMsg && (
              <p className="text-red-400 text-xs text-center font-medium mt-1">
                {errorMsg}
              </p>
            )}
          </div>
          
          <button 
            type="submit"
            disabled={isInitializing || isSubmitting || code.length !== 6}
            className="w-full flex items-center justify-center gap-2 bg-[var(--color-primary)] text-black px-6 py-3.5 rounded-xl font-bold hover:bg-[var(--color-primary-hover)] transition-all shadow-lg shadow-[var(--color-primary)]/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifica in corso...</span>
              </>
            ) : isInitializing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Inizializzazione...</span>
              </>
            ) : (
              <>
                <span>Verifica Accesso</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-4 border-t border-[var(--color-panel-border)]">
          <button 
            onClick={onCancel}
            disabled={isSubmitting}
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
