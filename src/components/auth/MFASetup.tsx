import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useMFA } from '../../hooks/useMFA';
import { useToast } from '../../context/ToastContext';
import { Copy, Check } from 'lucide-react';

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

  const qrCodeUri = setupData?.totp?.uri;
  const qrCodeSrc = setupData?.totp?.qr_code 
    ? (setupData.totp.qr_code.startsWith('data:image') 
        ? setupData.totp.qr_code 
        : setupData.totp.qr_code.startsWith('<svg') 
          ? `data:image/svg+xml;utf-8,${encodeURIComponent(setupData.totp.qr_code)}`
          : setupData.totp.qr_code)
    : null;

  return (
    <div className="p-6 bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl flex flex-col items-center">
      <h3 className="text-xl font-bold text-white mb-4">Scansiona il QR Code</h3>
      
      {/* Box QR ad alto contrasto, margine ISO e alta correzione di errore */}
      <div className="bg-white p-6 rounded-2xl mb-5 flex items-center justify-center shadow-2xl">
        {qrCodeUri ? (
          <QRCodeSVG 
            value={qrCodeUri} 
            size={280} 
            fgColor="#000000" 
            bgColor="#ffffff" 
            level="H" 
            includeMargin={true}
          />
        ) : qrCodeSrc ? (
          <img 
            src={qrCodeSrc} 
            alt="MFA QR Code" 
            className="w-[280px] h-[280px] object-contain block"
          />
        ) : (
          <p className="text-slate-800 text-xs font-semibold text-center p-4">
            Impossibile generare il QR code.<br/>Usa la chiave segreta qui sotto.
          </p>
        )}
      </div>
      
      {/* Box Copia Chiave Segreta */}
      <div className="w-full max-w-sm mb-6 space-y-2">
        <p className="text-slate-400 text-xs text-center font-medium">
          Non riesci a scansionarlo? Inserisci la chiave manualmente nell'app:
        </p>
        <div className="flex items-center gap-2 bg-slate-900 border border-[var(--color-panel-border)] p-2 rounded-xl">
          <code className="flex-1 text-center font-mono text-xs sm:text-sm tracking-wider text-[var(--color-primary)] select-all px-2 break-all">
            {setupData.totp.secret}
          </code>
          <button
            type="button"
            onClick={handleCopySecret}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors border border-slate-700 shrink-0"
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
