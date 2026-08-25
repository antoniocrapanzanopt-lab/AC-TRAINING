import React, { useState, useEffect } from 'react';
import { Smartphone, ArrowRight } from 'lucide-react';
import { PwaInstallModal } from './PwaInstallModal';

const DISMISS_KEY = 'ac_pwa_install_dismissed_until';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const PwaInstallBanner: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // 1. Verifica se l'app è già avviata come standalone (già installata)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setIsVisible(false);
      return;
    }

    // 2. Verifica se l'utente ha chiuso il prompt recentemente
    const dismissedUntil = localStorage.getItem(DISMISS_KEY);
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) {
      setIsVisible(false);
      return;
    }

    // 3. Mostra il banner dopo 1 secondo per non essere invasivo all'apertura
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 1200);

    // 4. Intercetta evento nativo di installazione Android
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    // Nascondi per 7 giorni
    localStorage.setItem(DISMISS_KEY, String(Date.now() + SEVEN_DAYS_MS));
  };

  const handleOpenGuide = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(({ outcome }: { outcome: string }) => {
        if (outcome === 'accepted') {
          setIsVisible(false);
        }
      });
    } else {
      setIsModalOpen(true);
    }
  };

  if (!isVisible) return null;

  return (
    <>
      <div
        className={`p-4 rounded-3xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-md text-[var(--color-text)] relative overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-top-3 ${className}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 relative z-10">
          {/* Sinistra: Icona App AC & Testi */}
          <div className="flex items-center gap-3 min-w-0">
            
            {/* Icona Monogramma AC */}
            <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-tr from-[var(--color-primary)] to-amber-400 p-0.5 shadow-md shrink-0">
              <div className="w-full h-full bg-[var(--color-surface)] rounded-[14px] flex items-center justify-center relative overflow-hidden">
                <img src="/ac-logo-transparent.png" alt="AC" className="w-full h-full object-contain scale-115" />
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs sm:text-sm font-black text-[var(--color-text)] tracking-tight">
                  Aggiungi AC alla schermata Home
                </h4>
                <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/30">
                  App
                </span>
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)] font-medium line-clamp-1 mt-0.5">
                Apri il tuo percorso di allenamento in un tocco, a schermo intero.
              </p>
            </div>
          </div>

          {/* Destra: Pulsanti Azione */}
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              type="button"
              onClick={handleDismiss}
              className="px-3 py-2 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-xs font-bold transition-colors cursor-pointer"
            >
              Non ora
            </button>

            <button
              type="button"
              onClick={handleOpenGuide}
              className="px-4 py-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-slate-950 font-black text-xs active:scale-95 transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Aggiungi</span>
              <ArrowRight className="w-3 h-3 stroke-[3]" />
            </button>
          </div>
        </div>
      </div>

      {/* Modale Dettagli Guida Installazione */}
      <PwaInstallModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        deferredPrompt={deferredPrompt}
      />
    </>
  );
};
