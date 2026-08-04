import React, { useState } from 'react';
import { KeyRound, Copy, Check, Share2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const CoachInviteWidget: React.FC = () => {
  const { user } = useAuth();
  const [copied, setCopied] = useState<boolean>(false);

  // Solamente per Coach, Admin e Proprietari
  if (!user || (user.role !== 'coach' && user.role !== 'owner' && user.role !== 'admin')) {
    return null;
  }

  const coachCode = user.coachCode || `COACH-${(user.firstName || user.name || 'ANTONIO').toUpperCase().replace(/[^A-Z]/g, '')}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(coachCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `Ciao! Registrati su Builder Athlete Manager selezionando "Sono un Atleta" ed inserisci il mio Codice Invito Coach: *${coachCode}*`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="p-3 bg-slate-900/90 border border-[var(--color-primary)]/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="w-9 h-9 rounded-xl bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/40 flex items-center justify-center shrink-0">
          <KeyRound className="w-4 h-4 text-[var(--color-primary)]" />
        </div>
        <div className="truncate">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Il tuo Codice Invito Atleti:
          </span>
          <span className="text-xs font-black text-white font-mono tracking-wider">{coachCode}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleCopyCode}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 hover:text-white hover:border-[var(--color-primary)] transition-all cursor-pointer shadow-sm"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[var(--color-primary)]" />}
          <span>{copied ? 'Copiato!' : 'Copia Codice'}</span>
        </button>

        <button
          type="button"
          onClick={handleShareWhatsApp}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-xs font-bold text-emerald-300 hover:text-white transition-all cursor-pointer shadow-sm"
          title="Condividi su WhatsApp"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Condividi</span>
        </button>
      </div>
    </div>
  );
};
