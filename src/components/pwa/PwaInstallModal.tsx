import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  PlusSquare,
  Smartphone,
  CheckCircle2,
  Sparkles,
  Download,
} from 'lucide-react';

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt?: any;
}

export const PwaInstallModal: React.FC<PwaInstallModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
}) => {
  // Rilevamento automatico piattaforma
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('ios');
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
    if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) {
      setPlatform('ios');
    } else if (/android/i.test(ua)) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }
  }, []);

  if (!isOpen) return null;

  const handleNativeInstall = async () => {
    if (deferredPrompt) {
      setIsInstalling(true);
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setIsInstalling(false);
      if (outcome === 'accepted') {
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in select-none">
      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-7 max-w-lg w-full space-y-6 shadow-2xl relative overflow-hidden my-auto max-h-[90vh] flex flex-col">
        
        {/* Glow di sfondo */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--color-primary)]/10 rounded-full blur-[90px] pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 relative z-10">
          <div className="flex items-center gap-3">
            {/* Icona App AC Monogramma */}
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[var(--color-primary)] to-amber-300 p-0.5 shadow-lg shadow-[var(--color-primary)]/20 shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center relative overflow-hidden">
                <span className="font-black text-base italic text-[var(--color-primary)]">AC</span>
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-cyan-400" />
              </div>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-1.5">
                <span>Aggiungi AC alla Home</span>
                <Sparkles className="w-4 h-4 text-[var(--color-primary)]" />
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Usa il portale come una vera app, a schermo intero.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Switcher Piattaforma iOS / Android */}
        <div className="grid grid-cols-2 gap-2 bg-slate-900/90 p-1 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => setPlatform('ios')}
            className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              platform === 'ios'
                ? 'bg-[var(--color-primary)] text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>iPhone / iPad (iOS)</span>
          </button>

          <button
            type="button"
            onClick={() => setPlatform('android')}
            className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              platform === 'android'
                ? 'bg-[var(--color-primary)] text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Android / Altri</span>
          </button>
        </div>

        {/* Contenuto Istruzioni */}
        <div className="overflow-y-auto space-y-4 pr-1 flex-1">
          
          {/* Se è Android e abbiamo l'evento nativo */}
          {platform === 'android' && deferredPrompt && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-cyan-500/15 border border-emerald-500/30 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-black">
                <CheckCircle2 className="w-4 h-4" />
                <span>Installazione Automatica Disponibile</span>
              </div>
              <button
                type="button"
                onClick={handleNativeInstall}
                disabled={isInstalling}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 font-black text-xs hover:opacity-95 active:scale-98 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{isInstalling ? 'Installazione in corso...' : 'Installa AC Subito (1-Click)'}</span>
              </button>
            </div>
          )}

          {/* Guida Passo-Passo iOS */}
          {platform === 'ios' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                  1
                </div>
                <div className="space-y-0.5 text-xs">
                  <p className="font-bold text-white flex items-center gap-1.5">
                    <span>Tocca il pulsante Condividi</span>
                    <Share2 className="w-3.5 h-3.5 text-sky-400" />
                  </p>
                  <p className="text-slate-400 text-[11px]">
                    In basso al centro nella barra di navigazione di <strong>Safari</strong>.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                  2
                </div>
                <div className="space-y-0.5 text-xs">
                  <p className="font-bold text-white flex items-center gap-1.5">
                    <span>Scegli "Aggiungi a schermata Home"</span>
                    <PlusSquare className="w-3.5 h-3.5 text-amber-400" />
                  </p>
                  <p className="text-slate-400 text-[11px]">
                    Scorri verso il basso nel menu delle opzioni fino a trovare l'icona con il <strong>+</strong>.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                  3
                </div>
                <div className="space-y-0.5 text-xs">
                  <p className="font-bold text-white flex items-center gap-1.5">
                    <span>Conferma con "Aggiungi"</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  </p>
                  <p className="text-slate-400 text-[11px]">
                    In alto a destra. L'icona <strong>AC</strong> comparirà sulla tua Home!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Guida Passo-Passo Android */}
          {platform === 'android' && !deferredPrompt && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                  1
                </div>
                <div className="space-y-0.5 text-xs">
                  <p className="font-bold text-white">Apri il menu del browser</p>
                  <p className="text-slate-400 text-[11px]">
                    Tocca l'icona con i <strong>tre puntini (⋮)</strong> in alto a destra in Google Chrome.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                  2
                </div>
                <div className="space-y-0.5 text-xs">
                  <p className="font-bold text-white flex items-center gap-1.5">
                    <span>Tocca "Aggiungi a schermata Home" o "Installa"</span>
                  </p>
                  <p className="text-slate-400 text-[11px]">
                    Seleziona la voce nel menu e conferma l'aggiunta.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                  3
                </div>
                <div className="space-y-0.5 text-xs">
                  <p className="font-bold text-white flex items-center gap-1.5">
                    <span>Pronto!</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  </p>
                  <p className="text-slate-400 text-[11px]">
                    Troverai l'icona <strong>AC</strong> tra le tue app, pronta per l'apertura immediata.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Vantaggi App a Schermo Intero */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-black text-amber-400">Perché aggiungerla alla Home?</span>
              <p className="text-[11px] text-amber-200/80 leading-relaxed">
                Nessuna barra del browser a togliere spazio, caricamento istantaneo offline per le tue sessioni di allenamento e accesso rapido con un solo tocco.
              </p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[var(--color-primary)] text-slate-950 font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all cursor-pointer shadow-md"
          >
            Ho Capito
          </button>
        </div>

      </div>
    </div>
  );
};
