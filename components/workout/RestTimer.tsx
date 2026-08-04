import React, { useState, useEffect } from 'react';
import { Timer, Play, Pause, SkipForward, Plus } from 'lucide-react';


interface RestTimerProps {
  initialSeconds: number;
  onFinish: () => void;
  onClose: () => void;
}

export const RestTimer: React.FC<RestTimerProps> = ({ initialSeconds, onFinish, onClose }) => {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    let interval: any = null;
    if (isActive && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0) {
      setIsActive(false);
      onFinish();
    }
    return () => clearInterval(interval);
  }, [isActive, secondsLeft, onFinish]);

  const addTime = (additionalSeconds: number) => {
    setSecondsLeft((prev) => prev + additionalSeconds);
  };

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progressPercent = Math.min(100, Math.max(0, (secondsLeft / initialSeconds) * 100));

  return (
    <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 bg-slate-900/95 backdrop-blur-md border border-[var(--color-primary)]/40 rounded-2xl p-4 shadow-2xl z-50 animate-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/40 flex items-center justify-center text-[var(--color-primary)]">
            <Timer className="w-4 h-4 animate-pulse" />
          </div>
          <span className="text-xs font-bold text-white uppercase tracking-wider">Timer Recupero</span>
        </div>

        <button
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-slate-800"
        >
          Chiudi
        </button>
      </div>

      {/* PROGRESS BAR */}
      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden mb-3">
        <div
          className="bg-[var(--color-primary)] h-full transition-all duration-1000 ease-linear"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="text-2xl font-black font-mono text-[var(--color-primary)]">
          {formatTime(secondsLeft)}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => addTime(30)}
            className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 hover:text-white hover:border-slate-600 transition-all flex items-center gap-1"
            title="+30 Secondi"
          >
            <Plus className="w-3.5 h-3.5" /> 30s
          </button>

          <button
            onClick={() => setIsActive(!isActive)}
            className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all"
          >
            {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[var(--color-primary)] text-black font-bold hover:brightness-110 transition-all"
            title="Salta Recupero"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
