import React, { useState } from 'react';
import { ShieldCheck, Lock, Bug, CheckCircle2 } from 'lucide-react';

interface WelcomeDisclaimerModalProps {
  isOpen: boolean;
  onConfirm: () => Promise<void> | void;
}

export const WelcomeDisclaimerModal: React.FC<WelcomeDisclaimerModalProps> = ({
  isOpen,
  onConfirm,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-disclaimer-title"
    >
      {/* Sfondo oscurato con effetto vetro sfocato */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300 animate-fadeIn" />

      {/* Finestra Modale */}
      <div className="relative bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl z-10 flex flex-col overflow-hidden transform transition-all duration-300 scale-100">
        {/* Banner superiore / Header */}
        <div className="relative p-6 sm:p-8 bg-gradient-to-b from-amber-500/10 via-slate-900/50 to-slate-900 border-b border-slate-800/80">
          <div className="flex items-center gap-3.5 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                Prima di iniziare
              </span>
              <h2
                id="welcome-disclaimer-title"
                className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-1"
              >
                Benvenuto nel tuo Portale Coaching! 🚀
              </h2>
            </div>
          </div>
        </div>

        {/* Contenuto / Punti di avvertenza */}
        <div className="p-6 sm:p-8 space-y-6 text-sm text-slate-300 leading-relaxed overflow-y-auto max-h-[60vh]">
          {/* Punto 1: Riservatezza & Sicurezza */}
          <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800/60 hover:border-amber-500/30 transition-colors group">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base mb-1 flex items-center gap-2">
                1. Riservatezza & Sicurezza
              </h3>
              <p className="text-slate-300 text-xs sm:text-sm">
                L'accesso a questa piattaforma è strettamente personale. Ti chiediamo di non condividere mai il link dell'applicazione, le tue credenziali o le tue schede con altre persone.
              </p>
            </div>
          </div>

          {/* Punto 2: Segnalazione Bug & Feedback */}
          <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800/60 hover:border-amber-500/30 transition-colors group">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
              <Bug className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base mb-1 flex items-center gap-2">
                2. Segnalazione Bug & Feedback
              </h3>
              <p className="text-slate-300 text-xs sm:text-sm">
                Trattandosi di un'applicazione in continuo aggiornamento, se dovessi riscontrare errori, problemi di caricamento o bug visivi, ti invitiamo a segnalarmelo subito in chat così da poter risolvere tempestivamente.
              </p>
            </div>
          </div>
        </div>

        {/* Footer / Bottone di conferma */}
        <div className="p-6 sm:p-8 bg-slate-950/80 border-t border-slate-800/80 flex flex-col gap-2">
          <button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-black font-extrabold text-base tracking-wide shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {isSubmitting ? (
              <span className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-black border-t-transparent" />
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                <span>Ho capito, entra nell'app</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
