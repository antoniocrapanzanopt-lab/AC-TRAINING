import React, { useState } from 'react';
import { useMFA } from '../../hooks/useMFA';
import { useToast } from '../../context/ToastContext';
import { Copy, Check, KeyRound, ShieldCheck } from 'lucide-react';

export const MFASetup: React.FC<{ onComplete: () => void; onCancel: () => void }> = ({ onComplete, onCancel }) => {
  const { enrollTOTP, challengeFactor, verifyFactor, cleanupUnverifiedFactors, loading, error } = useMFA();
  const { showSuccess, showError } = useToast();
  
  const [setupData, setSetupData] = useState<any>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [setupError, setSetupError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const startEnroll = async () => {
    setSetupError(null);
    setErrorMsg('');
    const data = await enrollTOTP();
    if (data && data.totp) {
      setSetupData(data);
      const challenge = await challengeFactor(data.id);
      if (challenge) {
        setChallengeId(challenge.id);
      }
    } else {
      const msg = error || 'Impossibile iniziare la configurazione. Se il problema persiste, ricarica la pagina.';
      setSetupError(msg);
      showError(msg);
    }
  };

  const handleCopySecret = () => {
    if (!setupData?.totp?.secret) return;
    navigator.clipboard.writeText(setupData.totp.secret);
    setCopied(true);
    showSuccess('Chiave segreta copiata negli appunti!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleVerify = async () => {
    if (!setupData || !challengeId) return;
    setErrorMsg('');
    const success = await verifyFactor(setupData.id, challengeId, code);
    if (success) {
      showSuccess('Autenticazione a Due Fattori abilitata con successo!');
      onComplete();
    } else {
      setErrorMsg('Codice non valido o scaduto. Riprova.');
    }
  };

  const handleCancel = async () => {
    if (setupData) {
      await cleanupUnverifiedFactors();
    }
    onCancel();
  };

  if (!setupData) {
    return (
      <div className="p-6 bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl text-center">
        <div className="mx-auto w-12 h-12 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 flex items-center justify-center mb-4">
          <ShieldCheck className="w-6 h-6 text-[var(--color-primary)]" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Configura l'MFA</h3>
        <p className="text-slate-400 text-sm mb-6">
          Usa un'app Authenticator (es. Google Authenticator, Authy, 1Password) per proteggere il tuo account.
        </p>

        {setupError && (
          <div className="p-3 mb-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs text-center">
            {setupError}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button 
            onClick={startEnroll} 
            disabled={loading} 
            className="bg-[var(--color-primary)] text-black px-6 py-2.5 rounded-xl font-bold hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50"
          >
            {loading ? 'Preparazione in corso...' : 'Inizia Configurazione'}
          </button>
          <button 
            onClick={handleCancel} 
            className="text-slate-400 hover:text-white transition-colors py-2 text-sm"
          >
            Annulla
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl flex flex-col items-center">
      <div className="mx-auto w-12 h-12 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 flex items-center justify-center mb-3">
        <KeyRound className="w-6 h-6 text-[var(--color-primary)]" />
      </div>

      <h3 className="text-xl font-bold text-white mb-2">Configura MFA manualmente</h3>
      
      <p className="text-slate-400 text-xs sm:text-sm text-center max-w-sm mb-5">
        1. Apri la tua app Authenticator (Google Authenticator, Authy, ecc.)<br/>
        2. Aggiungi un account inserendo la <strong>chiave segreta</strong> qui sotto<br/>
        3. Digita il codice a 6 cifre generato per confermare.
      </p>

      {/* Box Copia Chiave Segreta */}
      <div className="w-full max-w-sm mb-6 space-y-2">
        <span className="text-slate-400 text-xs font-semibold block text-center uppercase tracking-wider">
          Chiave Segreta
        </span>
        <div className="flex items-center gap-2 bg-slate-900 border border-[var(--color-panel-border)] p-2.5 rounded-xl">
          <code className="flex-1 text-center font-mono text-sm tracking-widest text-[var(--color-primary)] font-bold select-all px-2 break-all">
            {setupData.totp.secret}
          </code>
          <button
            type="button"
            onClick={handleCopySecret}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors border border-slate-700 shrink-0"
            title="Copia chiave segreta"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copiata</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-300" />
                <span>Copia</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Input Codice OTP a 6 Cifre */}
      <div className="w-full max-w-xs space-y-4">
        <div>
          <label className="text-slate-400 text-xs font-semibold block text-center mb-1 uppercase tracking-wider">
            Codice a 6 cifre
          </label>
          <input 
            type="text" 
            maxLength={6} 
            placeholder="123456"
            value={code} 
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
            className="text-center text-3xl tracking-[0.3em] p-3.5 rounded-xl bg-slate-900 border border-[var(--color-panel-border)] text-white w-full focus:outline-none focus:border-[var(--color-primary)] transition-colors"
            autoFocus
          />
        </div>
        
        {errorMsg && <p className="text-red-400 text-sm text-center font-medium">{errorMsg}</p>}
        
        <div className="flex flex-col gap-3">
          <button 
            onClick={handleVerify} 
            disabled={loading || code.length !== 6} 
            className="bg-[var(--color-primary)] text-black px-6 py-3 rounded-xl font-bold hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50 w-full shadow-lg shadow-[var(--color-primary)]/20"
          >
            {loading ? 'Verifica...' : 'Conferma e Attiva'}
          </button>
          
          <button 
            onClick={handleCancel} 
            disabled={loading}
            className="text-slate-400 hover:text-white transition-colors py-2 text-sm disabled:opacity-50"
          >
            Annulla Configurazione
          </button>
        </div>
      </div>
    </div>
  );
};
