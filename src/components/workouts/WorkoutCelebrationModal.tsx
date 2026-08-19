import React, { useEffect, useRef, useState } from 'react';
import {
  Zap,
  Clock,
  Dumbbell,
  CheckCircle2,
  Share2,
  ArrowRight,
  Flame,
  Award
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { playVictoryFanfare } from '../../utils/soundEffects';

interface WorkoutCelebrationModalProps {
  workoutTitle: string;
  durationMinutes: number;
  totalVolumeKg: number;
  completedSetsCount: number;
  totalSetsCount: number;
  newPRs: string[];
  earnedXP: number;
  athleteName?: string;
  onClose: () => void;
}

// Hook Contatore Progressivo Esponenziale
function useCountUp(targetValue: number, durationMs = 1000): number {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (targetValue <= 0) {
      setDisplayValue(0);
      return;
    }

    const startTime = performance.now();
    let animId: number;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const ease = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(Math.round(ease * targetValue));

      if (progress < 1) {
        animId = requestAnimationFrame(animate);
      }
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [targetValue, durationMs]);

  return displayValue;
}

export const WorkoutCelebrationModal: React.FC<WorkoutCelebrationModalProps> = ({
  workoutTitle,
  durationMinutes,
  totalVolumeKg,
  completedSetsCount,
  totalSetsCount,
  newPRs,
  earnedXP,
  athleteName = 'Campione',
  onClose,
}) => {
  const { showSuccess } = useToast();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showInitialFlash, setShowInitialFlash] = useState(true);

  // Contatori Numerici
  const animatedVolume = useCountUp(totalVolumeKg, 1100);
  const animatedDuration = useCountUp(durationMinutes, 800);
  const animatedSets = useCountUp(completedSetsCount, 700);
  const animatedXP = useCountUp(earnedXP, 1000);

  // Flash iniziale, suono d'impatto e vibrazione
  useEffect(() => {
    playVictoryFanfare();
    if (navigator.vibrate) {
      navigator.vibrate([200, 80, 200, 80, 400]);
    }
    const timer = setTimeout(() => setShowInitialFlash(false), 300);
    return () => clearTimeout(timer);
  }, []);

  // ─── MOTORE PARTICELLE AL PLASMA: FULMINI, TIZZONI ARDENTI & SCINTILLE ───
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Tizzoni Ardenti & Scintille Forgiate
    interface Ember {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
      color: string;
      life: number;
      maxLife: number;
    }

    const embers: Ember[] = [];
    const emberColors = ['#f59e0b', '#fbbf24', '#ef4444', '#f97316', '#ffffff', '#eab308'];

    for (let i = 0; i < 90; i++) {
      embers.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 3,
        vy: -Math.random() * 4 - 2, // Volano verso l'alto come fuoco
        size: Math.random() * 5 + 2,
        opacity: Math.random() * 0.9 + 0.1,
        color: emberColors[Math.floor(Math.random() * emberColors.length)],
        life: Math.random() * 100,
        maxLife: Math.random() * 100 + 80,
      });
    }

    // Struttura Fulmine Elettrico
    interface LightningBranch {
      points: { x: number; y: number }[];
      alpha: number;
      color: string;
    }

    const lightnings: LightningBranch[] = [];

    const generateLightning = (x1: number, y1: number, x2: number, y2: number, color: string) => {
      const points = [{ x: x1, y: y1 }];
      const segments = 12;
      const dx = (x2 - x1) / segments;
      const dy = (y2 - y1) / segments;

      for (let i = 1; i < segments; i++) {
        const offset = (Math.random() - 0.5) * 45;
        points.push({
          x: x1 + dx * i + (Math.random() - 0.5) * offset,
          y: y1 + dy * i + (Math.random() - 0.5) * offset,
        });
      }
      points.push({ x: x2, y: y2 });
      lightnings.push({ points, alpha: 1, color });
    };

    let frameCount = 0;
    let animId: number;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. SCARICHE DI FULMINI RANDOM AD ALTA TENSIONE
      frameCount++;
      if (frameCount % 18 === 0) {
        const startX = Math.random() > 0.5 ? 0 : width;
        const startY = Math.random() * height;
        const targetX = width * 0.5 + (Math.random() - 0.5) * 200;
        const targetY = height * 0.45 + (Math.random() - 0.5) * 200;
        const lColor = Math.random() > 0.3 ? '#fbbf24' : '#38bdf8';
        generateLightning(startX, startY, targetX, targetY, lColor);
      }

      // Disegna e dissolvi i fulmini
      for (let i = lightnings.length - 1; i >= 0; i--) {
        const l = lightnings[i];
        l.alpha -= 0.08;

        if (l.alpha <= 0) {
          lightnings.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.strokeStyle = l.color;
        ctx.lineWidth = 2.5;
        ctx.globalAlpha = l.alpha;
        ctx.shadowColor = l.color;
        ctx.shadowBlur = 15;

        ctx.beginPath();
        l.points.forEach((p, idx) => {
          if (idx === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
        ctx.restore();
      }

      // 2. TIZZONI ARDENTI & SCINTILLE
      embers.forEach((e) => {
        e.y += e.vy;
        e.x += e.vx + Math.sin(e.life * 0.1) * 1.5;
        e.life++;

        if (e.y < -20 || e.life > e.maxLife) {
          e.y = height + 10;
          e.x = Math.random() * width;
          e.life = 0;
          e.vy = -Math.random() * 4 - 2;
        }

        const alpha = Math.sin((e.life / e.maxLife) * Math.PI) * e.opacity;

        ctx.save();
        ctx.fillStyle = e.color;
        ctx.shadowColor = e.color;
        ctx.shadowBlur = 10;
        ctx.globalAlpha = Math.max(0, alpha);

        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleShare = async () => {
    const prText = newPRs.length > 0 ? `\n🥇 Record Personali (PR): ${newPRs.join(', ')}` : '';
    const shareText = `⚡ WORKOUT COMPLETATO!\n\n🔥 Atleta: ${athleteName}\n📋 Scheda: ${workoutTitle}\n🏋️‍♂️ Volume Sollevato: ${totalVolumeKg.toLocaleString('it-IT')} kg\n⏱️ Durata: ${durationMinutes} min\n🎯 Serie: ${completedSetsCount}/${totalSetsCount}${prText}\n⚡ +${earnedXP} XP!\n\n#ACCoaching #WorkoutCompleted`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Workout Completato - ${workoutTitle}`,
          text: shareText,
        });
      } catch {
        // Fallback silente
      }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareText);
      showSuccess('Copiato negli appunti!', 'Puoi incollare il riassunto su WhatsApp o sui tuoi social.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/94 backdrop-blur-2xl flex items-center justify-center p-4 overflow-hidden animate-in fade-in duration-150">
      
      {/* ─── FLASH INIZIALE DI IMPATTO ─── */}
      {showInitialFlash && (
        <div className="absolute inset-0 bg-white/40 pointer-events-none z-50 animate-out fade-out duration-300" />
      )}

      {/* ─── CANVAS PARTICELLE AL PLASMA & FULMINI ─── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-0 w-full h-full"
      />

      {/* ─── AURA DI FUOCO & RAGGI ROTANTI VORTICOSA SULLO SFONDO ─── */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
        <div className="w-[650px] h-[650px] bg-gradient-to-tr from-amber-600/25 via-[var(--color-primary)]/20 to-orange-600/20 rounded-full blur-[110px] animate-pulse" />
      </div>

      {/* ─── CARD HARDCORE AGGRESSIVA ─── */}
      <div className="bg-slate-950/95 border-2 border-amber-400 rounded-[36px] max-w-md w-full p-6 sm:p-7 shadow-[0_0_100px_rgba(245,158,11,0.4)] space-y-5 text-center relative z-10 animate-in zoom-in-95 duration-200">
        
        {/* Glow Concentrato Superiore */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-80 h-80 bg-amber-500/25 rounded-full blur-[110px] pointer-events-none" />

        {/* ─── ICONA FIAMMA TITANICA & FULMINE DI POTENZA ─── */}
        <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-600 rounded-full blur-2xl opacity-75 animate-ping [animation-duration:2s]" />
          
          <div className="w-22 h-22 rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-red-600 flex items-center justify-center text-slate-950 shadow-[0_0_40px_rgba(245,158,11,0.8)] border-2 border-white relative z-10 transform hover:scale-110 active:scale-95 transition-all cursor-pointer">
            <Flame className="w-12 h-12 stroke-[2.8] fill-white text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)] animate-pulse" />
          </div>
        </div>

        {/* ─── TITOLO & STATO SESSIONE ─── */}
        <div className="space-y-1.5 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/30 via-orange-500/30 to-red-500/30 border border-amber-400/60 text-amber-300 font-black text-[11px] uppercase tracking-widest shadow-lg">
            <Zap className="w-4 h-4 text-amber-300 fill-amber-300 animate-bounce" />
            <span>SESSIONE COMPLETATA CON SUCCESSO</span>
          </div>
          
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight uppercase drop-shadow-[0_2px_10px_rgba(245,158,11,0.5)]">
            OTTIMO LAVORO, {athleteName}! ⚡
          </h2>
          <p className="text-xs text-slate-300 font-bold line-clamp-1">
            {workoutTitle}
          </p>
        </div>

        {/* ─── 4 STATISTICHE CHIAVE AD ALTO CONTRASTO ─── */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 text-left relative z-10">
          
          {/* Volume Totale Sollevato */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border-2 border-amber-400/50 hover:border-amber-400 space-y-0.5 shadow-lg shadow-amber-500/10 relative overflow-hidden transition-all group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
            <span className="text-[10px] font-black text-amber-400/90 uppercase tracking-wider flex items-center gap-1">
              <Dumbbell className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              Volume Totale
            </span>
            <p className="text-xl sm:text-2xl font-black font-mono text-white tracking-tight">
              {animatedVolume > 0 ? animatedVolume.toLocaleString('it-IT') : 0}{' '}
              <span className="text-xs text-amber-400 font-bold font-sans">KG</span>
            </p>
          </div>

          {/* Durata Effettiva */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border-2 border-sky-400/50 hover:border-sky-400 space-y-0.5 shadow-lg shadow-sky-500/10 relative overflow-hidden transition-all group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-sky-500/10 rounded-full blur-xl pointer-events-none" />
            <span className="text-[10px] font-black text-sky-400/90 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
              Durata Sessione
            </span>
            <p className="text-xl sm:text-2xl font-black font-mono text-white tracking-tight">
              {animatedDuration}{' '}
              <span className="text-xs text-sky-400 font-bold font-sans">MIN</span>
            </p>
          </div>

          {/* Serie Eseguite */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border-2 border-emerald-400/50 hover:border-emerald-400 space-y-0.5 shadow-lg shadow-emerald-500/10 relative overflow-hidden transition-all group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
            <span className="text-[10px] font-black text-emerald-400/90 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              Serie Eseguite
            </span>
            <p className="text-xl sm:text-2xl font-black font-mono text-white tracking-tight">
              {animatedSets} <span className="text-xs text-slate-500 font-bold font-sans">/ {totalSetsCount}</span>
            </p>
          </div>

          {/* Esperienza XP */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border-2 border-orange-400/50 hover:border-orange-400 space-y-0.5 shadow-lg shadow-orange-500/10 relative overflow-hidden transition-all group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-full blur-xl pointer-events-none" />
            <span className="text-[10px] font-black text-orange-400/90 uppercase tracking-wider flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
              Esperienza
            </span>
            <p className="text-xl sm:text-2xl font-black font-mono text-orange-300 tracking-tight">
              +{animatedXP}{' '}
              <span className="text-xs text-slate-400 font-bold font-sans">XP</span>
            </p>
          </div>

        </div>

        {/* ─── BANNER RECORD PERSONALI (PR) ─── */}
        {newPRs.length > 0 && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/30 via-orange-900/40 to-slate-950 border-2 border-amber-400 text-left space-y-1.5 shadow-[0_0_30px_rgba(245,158,11,0.3)] animate-pulse">
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" />
              ⚡ NUOVO RECORD PERSONALE (PR) DISTRUTTO!
            </span>
            <p className="text-xs font-black text-white leading-relaxed">
              {newPRs.join(' • ')}
            </p>
          </div>
        )}

        {/* ─── PULSANTI AZIONE ─── */}
        <div className="space-y-2.5 pt-1 relative z-10">
          <button
            type="button"
            onClick={handleShare}
            className="w-full py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-850 text-slate-200 hover:text-white border border-slate-700 hover:border-amber-400 text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-lg"
          >
            <Share2 className="w-4 h-4 text-amber-400" />
            <span>Condividi Risultato</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-slate-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_35px_rgba(245,158,11,0.6)] active:scale-95 transition-all cursor-pointer transform hover:scale-[1.02]"
          >
            <span>Torna al Portale Atleta</span>
            <ArrowRight className="w-5 h-5 stroke-[3]" />
          </button>
        </div>

      </div>
    </div>
  );
};
