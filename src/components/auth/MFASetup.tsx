import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useMFA } from '../../hooks/useMFA';
import { useToast } from '../../context/ToastContext';

export const MFASetup: React.FC<{ onComplete: () => void; onCancel: () => void }> = ({ onComplete, onCancel }) => {
  const { enrollTOTP, challengeFactor, verifyFactor, cleanupUnverifiedFactors, loading } = useMFA();
  const { showSuccess, showError } = useToast();
  
  const [setupData, setSetupData] = useState<any>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const startEnroll = async () => {
    // Pulizia fattori appesi per evitare blocchi "already have an unverified factor"
    await cleanupUnverifiedFactors();
    
    const data = await enrollTOTP();
    if (data) {
      setSetupData(data);
      const challenge = await challengeFactor(data.id);
      if (challenge) setChallengeId(challenge.id);
    } else {
      showError('Impossibile iniziare la configurazione. Se il problema persiste, ricarica la pagina.');
    }
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
    // Se stavamo facendo il setup e l'utente annulla, ripuliamo il fattore 'unverified'
    if (setupData) {
      await cleanupUnverifiedFactors();
    }
    onCancel();
  };

  if (!setupData) {
    return (
      <div className="p-6 bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl text-center">
        <h3 className="text-xl font-bold text-white mb-2">Configura l'MFA</h3>
        <p className="text-slate-400 text-sm mb-6">
          Usa un'app Authenticator (es. Google Authenticator, Authy) per proteggere il tuo account.
        </p>
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
      <h3 className="text-xl font-bold text-white mb-4">Scansiona il QR Code</h3>
      
      <div className="bg-white p-4 rounded-xl mb-4">
        <QRCodeSVG value={setupData.totp.uri} size={200} />
      </div>
      
      <p className="text-slate-400 text-sm mb-1 text-center">Non riesci a scansionarlo? Usa questa chiave segreta:</p>
      <code className="text-[var(--color-primary)] bg-slate-900 px-4 py-2 rounded-lg text-sm tracking-wider border border-[var(--color-panel-border)] mb-6 select-all text-center">
        {setupData.totp.secret}
      </code>

      <div className="w-full max-w-xs space-y-4">
        <input 
          type="text" 
          maxLength={6} 
          placeholder="123456"
          value={code} 
          onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
          className="text-center text-3xl tracking-[0.3em] p-4 rounded-xl bg-slate-900 border border-[var(--color-panel-border)] text-white w-full focus:outline-none focus:border-[var(--color-primary)] transition-colors"
        />
        
        {errorMsg && <p className="text-red-400 text-sm text-center">{errorMsg}</p>}
        
        <div className="flex flex-col gap-3">
          <button 
            onClick={handleVerify} 
            disabled={loading || code.length !== 6} 
            className="bg-[var(--color-primary)] text-black px-6 py-3 rounded-xl font-bold hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50 w-full"
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
