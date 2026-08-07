import React, { useState } from 'react';
import { X, Globe, CheckCircle2, ShieldCheck, Key, RefreshCw, LogOut, ExternalLink } from 'lucide-react';
import { useCalendar } from '../../context/CalendarContext';
import { useToast } from '../../context/ToastContext';
import { setGoogleAccessToken, setGoogleClientId, getGoogleCalendarState } from '../../lib/googleCalendar';

interface GoogleConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleConnectModal: React.FC<GoogleConnectModalProps> = ({ isOpen, onClose }) => {
  const { isGoogleConnected, googleEmail, connectGoogleCalendar, disconnectGoogleCalendar, syncGoogleCalendar } = useCalendar();
  const { showSuccess, showInfo } = useToast();

  const gState = getGoogleCalendarState();
  const [emailInput, setEmailInput] = useState(googleEmail || 'antonio.crapanzanopt@gmail.com');
  const [tokenInput, setTokenInput] = useState('');
  const [clientIdInput, setClientIdInput] = useState(gState.clientId || '');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  if (!isOpen) return null;

  const handleConnectOAuth = async () => {
    setIsConnecting(true);

    if (tokenInput.trim()) {
      setGoogleAccessToken(tokenInput.trim());
    }
    if (clientIdInput.trim()) {
      setGoogleClientId(clientIdInput.trim());
    }

    await connectGoogleCalendar(emailInput.trim() || 'antonio.crapanzanopt@gmail.com');
    setIsConnecting(false);
    showSuccess('Google Calendar Connesso', `Account ${emailInput.trim()} sincronizzato con successo!`);
    onClose();
  };

  const handleDisconnect = () => {
    disconnectGoogleCalendar();
    showInfo('Disconnesso', 'Google Calendar è stato scollegato.');
    onClose();
  };

  const handleSyncNow = async () => {
    setIsConnecting(true);
    await syncGoogleCalendar();
    setIsConnecting(false);
    showSuccess('Sincronizzato', 'Eventi di Google Calendar aggiornati.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Container */}
      <div className="relative w-full max-w-lg bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-5 border-b border-[var(--color-panel-border)] flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Google Calendar OAuth2</h3>
              <p className="text-xs text-slate-400">Sincronizza i tuoi appuntamenti reali in tempo reale</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Status Badge */}
          {isGoogleConnected ? (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-bold text-emerald-300">Account Google Collegato</h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  Sincronizzato con: <span className="font-mono text-white font-bold">{googleEmail || 'antonio.crapanzanopt@gmail.com'}</span>
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={handleSyncNow}
                    disabled={isConnecting}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-bold hover:bg-emerald-500/30 transition-all flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isConnecting ? 'animate-spin' : ''}`} /> Sincronizza Ora
                  </button>
                  <button
                    onClick={handleDisconnect}
                    className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-all flex items-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Disconnetti
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-white">Collegamento Sicuro Google OAuth</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Autorizza l'applicazione a leggere i tuoi appuntamenti da Google Calendar. Nessun dato verrà condiviso all'esterno.
                </p>
              </div>
            </div>
          )}

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Account Email Google
              </label>
              <input
                type="email"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                placeholder="antonio.crapanzanopt@gmail.com"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500 transition-colors"
              />
            </div>

            {/* Pulsante Avanzate Toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 transition-colors"
            >
              <Key className="w-3.5 h-3.5" /> {showAdvanced ? 'Nascondi configurazione avanzata OAuth' : 'Configurazione avanzata (Client ID / Access Token)'}
            </button>

            {showAdvanced && (
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                    Google OAuth Client ID (Opzionale)
                  </label>
                  <input
                    type="text"
                    value={clientIdInput}
                    onChange={e => setClientIdInput(e.target.value)}
                    placeholder="xxxxxxxxxxxx-xxxxxxxx.apps.googleusercontent.com"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                    Bearer Access Token Google API (Opzionale)
                  </label>
                  <input
                    type="password"
                    value={tokenInput}
                    onChange={e => setTokenInput(e.target.value)}
                    placeholder="ya29.a0Axoo..."
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="pt-2 flex items-center justify-between border-t border-[var(--color-panel-border)]">
            <a
              href="https://calendar.google.com"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              Apri Google Calendar <ExternalLink className="w-3 h-3" />
            </a>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-900 text-slate-300 text-xs font-bold hover:bg-slate-800 transition-colors"
              >
                Chiudi
              </button>
              <button
                type="button"
                onClick={handleConnectOAuth}
                disabled={isConnecting}
                className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-black text-xs transition-all shadow-lg shadow-sky-500/20 flex items-center gap-2 disabled:opacity-50"
              >
                {isConnecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                {isGoogleConnected ? 'Aggiorna Connessione' : 'Avvia Login Google OAuth'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
