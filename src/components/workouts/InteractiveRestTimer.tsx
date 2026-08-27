import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, FastForward, Plus, Minus } from 'lucide-react';
import { playCountdownBeep, initOrResumeAudioContext } from '../../utils/soundEffects';

interface InteractiveRestTimerProps {
  remainingSeconds: number;
  totalSeconds: number;
  onSkip: () => void;
  onAddTime: (seconds: number) => void;
}

export const InteractiveRestTimer: React.FC<InteractiveRestTimerProps> = ({
  remainingSeconds,
  totalSeconds,
  onSkip,
  onAddTime,
}) => {
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('ac_rest_audio_enabled');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const lastPlayedSecondRef = useRef<number | null>(null);

  const toggleAudio = () => {
    setIsAudioEnabled((prev) => {
      const next = !prev;
      if (next) {
        initOrResumeAudioContext();
        playCountdownBeep(700, 0.06);
      }
      try {
        localStorage.setItem('ac_rest_audio_enabled', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Gestione Suoni e Vibrazione nei secondi finali (countdown 3, 2, 1)
  useEffect(() => {
    if (remainingSeconds === lastPlayedSecondRef.current) return;
    lastPlayedSecondRef.current = remainingSeconds;

    if (remainingSeconds === 3 || remainingSeconds === 2 || remainingSeconds === 1) {
      if (isAudioEnabled) {
        playCountdownBeep(remainingSeconds === 1 ? 880 : 660, 0.08);
      }
      if (navigator.vibrate) {
        navigator.vibrate(35);
      }
    }
  }, [remainingSeconds, isAudioEnabled]);

  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Calcolo SVG Progress Ring
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const safeTotal = Math.max(totalSeconds, remainingSeconds, 1);
  const progressPercent = Math.min(1, Math.max(0, remainingSeconds / safeTotal));
  const strokeDashoffset = circumference - progressPercent * circumference;

  return (
    <div className="sticky top-0 z-30 bg-[var(--color-surface)]/95 backdrop-blur-2xl border-b border-[var(--color-primary)]/40 p-3 sm:p-4 shadow-md animate-in slide-in-from-top-2 duration-200">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
        
        {/* Sinistra: SVG Progress Ring + Cifre Grandi */}
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
            {/* SVG Ring di sfondo */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 52 52">
              <circle
                cx="26"
                cy="26"
                r={radius}
                className="stroke-[var(--color-border)]"
                strokeWidth="4"
                fill="transparent"
              />
              <circle
                cx="26"
                cy="26"
                r={radius}
                className="stroke-[var(--color-primary)] transition-all duration-1000 ease-linear"
                strokeWidth="4"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            
            {/* Icona o Pulsazione Centrale */}
            <span className="absolute text-[10px] font-black font-mono text-[var(--color-primary)]">
              {remainingSeconds > 99 ? `${Math.ceil(remainingSeconds / 60)}m` : `${remainingSeconds}s`}
            </span>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-primary)] block">
                Recupero Attivo
              </span>
              <button
                type="button"
                onClick={toggleAudio}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] p-0.5 rounded cursor-pointer transition-colors"
                title={isAudioEnabled ? 'Audio countdown attivo' : 'Audio disattivato'}
              >
                {isAudioEnabled ? (
                  <Volume2 className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                )}
              </button>
            </div>
            <p className="text-xl sm:text-2xl font-black font-mono text-[var(--color-text)] tracking-tight leading-tight">
              {formatTime(remainingSeconds)}
            </p>
          </div>
        </div>

        {/* Destra: Controlli Rapidi (+30s / -15s / Salta) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onAddTime(-15)}
            disabled={remainingSeconds <= 15}
            className="px-2.5 py-1.5 rounded-xl bg-[var(--color-surface-strong)] hover:bg-[var(--color-panel)] text-[var(--color-text)] text-xs font-bold border border-[var(--color-border)] transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer flex items-center gap-0.5 active:scale-95 shadow-sm"
            title="Riduci di 15 secondi"
          >
            <Minus className="w-3 h-3" />
            <span>15s</span>
          </button>

          <button
            type="button"
            onClick={() => onAddTime(30)}
            className="px-2.5 py-1.5 rounded-xl bg-[var(--color-surface-strong)] hover:bg-[var(--color-panel)] text-[var(--color-primary)] text-xs font-bold border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 transition-all cursor-pointer flex items-center gap-0.5 active:scale-95 shadow-sm"
            title="Aggiungi 30 secondi"
          >
            <Plus className="w-3 h-3" />
            <span>30s</span>
          </button>

          <button
            type="button"
            onClick={onSkip}
            className="px-3.5 py-1.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-slate-950 font-black text-xs flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-md shadow-[var(--color-primary)]/20"
          >
            <FastForward className="w-3.5 h-3.5 fill-slate-950" />
            <span>Salta</span>
          </button>
        </div>

      </div>
    </div>
  );
};
