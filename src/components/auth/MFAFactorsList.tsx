import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Smartphone, Trash2, CheckCircle2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const MFAFactorsList: React.FC = () => {
  const { mfa } = useAuth();
  const { factors, unenrollFactor, loading } = mfa;
  const { showSuccess, showError } = useToast();

  const handleUnenroll = async (factorId: string) => {
    if (!window.confirm("Sei sicuro di voler rimuovere questo dispositivo Authenticator?")) {
      return;
    }
    
    const success = await unenrollFactor(factorId);
    if (success) {
      showSuccess("Dispositivo rimosso con successo.");
    } else {
      showError("Errore durante la rimozione del dispositivo.");
    }
  };

  const verifiedFactors = factors.filter(f => f.status === 'verified');

  if (verifiedFactors.length === 0) {
    return (
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-center text-slate-400 text-sm">
        Nessun dispositivo Authenticator configurato.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {verifiedFactors.map((factor) => (
        <div key={factor.id} className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <div className="text-white font-medium text-sm flex items-center gap-1.5">
                App Authenticator <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="text-slate-400 text-xs mt-0.5">
                Aggiunto il: {new Date(factor.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
          
          <button
            onClick={() => handleUnenroll(factor.id)}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
            title="Rimuovi dispositivo"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
