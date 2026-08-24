import React, { useState, useEffect, useMemo } from 'react';
import { Play, Pause, Gauge, Sparkles, Activity } from 'lucide-react';

export interface BiomechanicalMovementAnimationProps {
  exerciseName: string;
  pattern: string;
  category?: string;
}

// ─── Tipo Cinematico ────────────────────────────────────────────────
type CinematicType =
  | 'squat'
  | 'bench'
  | 'deadlift'
  | 'pull_vertical'
  | 'pull_horizontal'
  | 'press_vertical'
  | 'curl'
  | 'tricep'
  | 'plank'
  | 'crunch'
  | 'leg_raise'
  | 'calf'
  | 'lateral_raise'
  | 'hip_thrust'
  | 'generic';

// ─── Tipo Fase ──────────────────────────────────────────────────────
type MotionPhase = 'eccentric' | 'isometric' | 'concentric' | 'lockout';

/**
 * Determina il tipo cinematico in base al nome esercizio e al pattern biomeccanico
 * proveniente da resolveExerciseAnatomy. Priorità: pattern > nome.
 */
function resolveCinematic(name: string, pattern: string): CinematicType {
  const n = name.toLowerCase();
  const p = pattern.toLowerCase();

  // ── Isometrici: PLANK, HOLLOW, DEAD BUG ──
  if (/plank|hollow|dead bug|isometric hold/i.test(n)) return 'plank';

  // ── Leg Raise / Rollout / Hanging Leg Raise ──
  if (/leg raise|hanging|rollout|knee raise/i.test(n)) return 'leg_raise';

  // ── Crunch / Sit-up ──
  if (/crunch|sit.?up|bicycle|russian twist/i.test(n) || p.includes('flessione del tronco')) return 'crunch';

  // ── Squat / Accosciata ──
  if (p.includes('accosciata') || /squat|leg press|pressa|affondi|bulgaro|hack|goblet|step.?up|leg extension/i.test(n)) return 'squat';

  // ── Hip Thrust / Glute Bridge ──
  if (/hip thrust|glute bridge|hip raise/i.test(n)) return 'hip_thrust';

  // ── Stacco / Cerniera d'Anca ──
  if (p.includes('cerniera') || p.includes('hinge') || /stacco|deadlift|rdl|rumeno|hyperextension|good morning/i.test(n)) return 'deadlift';

  // ── Leg Curl ──
  if (/leg curl|femorali curl/i.test(n)) return 'curl';

  // ── Trazione Verticale ──
  if (p.includes('trazione verticale') || /lat machine|lat pull|trazion|pull.?up|chin.?up|pulldown/i.test(n)) return 'pull_vertical';

  // ── Trazione Orizzontale ──
  if (p.includes('trazione orizzontale') || /pulley|remator|row|seal row|t.?bar|meadows/i.test(n)) return 'pull_horizontal';

  // ── Spinta Orizzontale ──
  if (p.includes('spinta orizzontale') || /panca|chest|spinte|distensioni|croci|dip|push.?up|pec deck/i.test(n)) return 'bench';

  // ── Spinta Verticale ──
  if (p.includes('spinta verticale') || /military|lento avanti|shoulder press|overhead|arnold/i.test(n)) return 'press_vertical';

  // ── Curl Bicipiti / Flessione Gomito ──
  if (p.includes('flessione del gomito') || /curl|bicipit|hammer|scott|drag curl/i.test(n)) return 'curl';

  // ── Estensioni Tricipiti ──
  if (p.includes('estensione del gomito') || /pushdown|french|skull|kickback|estensioni tricip/i.test(n)) return 'tricep';

  // ── Alzate Laterali ──
  if (/alzate lateral|lateral raise/i.test(n)) return 'lateral_raise';

  // ── Polpacci ──
  if (p.includes('flessione plantare') || /polpacc|calf/i.test(n)) return 'calf';

  return 'generic';
}

// ─── Descrittori di fase per ogni tipo cinematico ──────────────────
const PHASE_LABELS: Record<
  MotionPhase,
  { title: string; color: string; bg: string; desc: string }
> = {
  eccentric: {
    title: 'Fase Eccentrica (Discesa Controllata)',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/30',
    desc: 'Resistenza attiva e mantenimento della tensione muscolare.',
  },
  isometric: {
    title: 'Punto di Inversione (Fermo Tecnico)',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/30',
    desc: 'Zero rimbalzo, massima stabilità articolare prima della spinta.',
  },
  concentric: {
    title: 'Fase Concentrica (Spinta / Forza)',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
    desc: 'Espressione di forza esplosiva lungo la traiettoria ideale.',
  },
  lockout: {
    title: 'Lockout & Reset',
    color: 'text-sky-400',
    bg: 'bg-sky-500/10 border-sky-500/30',
    desc: 'Assetto stabile, core compatto e preparazione alla rep successiva.',
  },
};

const PLANK_PHASES: Record<MotionPhase, { title: string; color: string; bg: string; desc: string }> = {
  eccentric: {
    title: 'Fase Isometrica – Attivazione Core',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
    desc: 'Bacino neutro, addome e glutei contratti. Corpo in linea retta dalla testa ai piedi.',
  },
  isometric: {
    title: 'Fase Isometrica – Resistenza Attiva',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
    desc: 'Respiro diaframmatico costante. Spingi i gomiti a terra come per allargare il pavimento.',
  },
  concentric: {
    title: 'Fase Isometrica – Tensione Progressiva',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
    desc: 'Aumenta consapevolmente la contrazione del core ogni 5-10 secondi.',
  },
  lockout: {
    title: 'Fase di Recupero',
    color: 'text-sky-400',
    bg: 'bg-sky-500/10 border-sky-500/30',
    desc: 'Abbassa i fianchi lentamente, respira profondamente prima della serie successiva.',
  },
};

// ─── Smooth easing functions ────────────────────────────────────────
const easeInOutCos = (t: number) => 0.5 * (1 - Math.cos(Math.PI * t));
const easeOutCos = (t: number) => 0.5 * (1 + Math.cos(Math.PI * t));

// ─── Componente principale ──────────────────────────────────────────
export const BiomechanicalMovementAnimation: React.FC<BiomechanicalMovementAnimationProps> = ({
  exerciseName,
  pattern,
  category,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isSlowMo, setIsSlowMo] = useState(false);
  const [progress, setProgress] = useState(0);

  const cinematicType = useMemo(
    () => resolveCinematic(exerciseName, pattern),
    [exerciseName, pattern],
  );

  // Loop animazione a 60fps
  useEffect(() => {
    if (!isPlaying) return;
    const cycleDuration = isSlowMo ? 5000 : 2800;
    let rafId: number;
    let lastTime = performance.now();
    const loop = (now: number) => {
      const delta = now - lastTime;
      lastTime = now;
      setProgress((p) => (p + delta / cycleDuration) % 1);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, isSlowMo]);

  // Calcolo profondità del ciclo (0 = posizione iniziale/lockout, 1 = max escursione)
  const depth = useMemo(() => {
    if (progress <= 0.45) return easeInOutCos(progress / 0.45);
    if (progress <= 0.55) return 1;
    if (progress <= 0.9) return easeOutCos((progress - 0.55) / 0.35);
    return 0;
  }, [progress]);

  // Fase corrente
  const currentPhase: MotionPhase = useMemo(() => {
    if (progress < 0.45) return 'eccentric';
    if (progress < 0.55) return 'isometric';
    if (progress < 0.9) return 'concentric';
    return 'lockout';
  }, [progress]);

  const phaseLabel =
    cinematicType === 'plank'
      ? PLANK_PHASES[currentPhase]
      : PHASE_LABELS[currentPhase];

  const primaryGlow = currentPhase === 'concentric' ? '#10b981' : '#f59e0b';

  // ─── Renderer SVG per tipo cinematico ────────────────────────────
  const renderGraphic = () => {
    switch (cinematicType) {
      // ───────────────────── SQUAT ─────────────────────
      case 'squat': {
        const kneeX = 140 + depth * 30;
        const kneeY = 200 - depth * 0 + depth * 15;
        const hipX = 140 - 14 - depth * 36;
        const hipY = 155 + depth * 65;
        const shoulderX = 140 - 8 - depth * 16;
        const shoulderY = 105 + depth * 65;
        const barX = shoulderX;
        const barY = shoulderY;
        const headX = barX + 10;
        const headY = barY - 18;

        return (
          <svg viewBox="0 0 280 270" className="w-full h-56 sm:h-64 select-none">
            <line x1="20" y1="235" x2="260" y2="235" stroke="#334155" strokeWidth="2" strokeDasharray="4 4" />
            <text x="26" y="248" fill="#64748b" fontSize="9" fontWeight="bold" fontFamily="monospace">PIANO D'APPOGGIO</text>
            <line x1="127" y1="88" x2="127" y2="232" stroke="#fbbf24" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
            <text x="131" y="98" fill="#fbbf24" fontSize="8" fontWeight="bold" opacity="0.6">BAR PATH</text>
            {/* Piede */}
            <line x1="115" y1="235" x2="162" y2="235" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" />
            {/* Tibia */}
            <line x1="140" y1="235" x2={kneeX} y2={kneeY} stroke="#cbd5e1" strokeWidth="4.5" strokeLinecap="round" />
            {/* Femore */}
            <line x1={kneeX} y1={kneeY} x2={hipX} y2={hipY} stroke="#f8fafc" strokeWidth="5" strokeLinecap="round" />
            {/* Tronco */}
            <line x1={hipX} y1={hipY} x2={shoulderX} y2={shoulderY} stroke="#e2e8f0" strokeWidth="5.5" strokeLinecap="round" />
            {/* Testa */}
            <circle cx={headX} cy={headY} r="9" fill="#1e293b" stroke="#94a3b8" strokeWidth="2.5" />
            {/* Snodi */}
            <circle cx="140" cy="235" r="4.5" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
            <circle cx={kneeX} cy={kneeY} r="5.5" fill="#0f172a" stroke={primaryGlow} strokeWidth="2.5" />
            <circle cx={hipX} cy={hipY} r="5.5" fill="#0f172a" stroke={primaryGlow} strokeWidth="2.5" />
            <circle cx={shoulderX} cy={shoulderY} r="4.5" fill="#0f172a" stroke="#fbbf24" strokeWidth="2" />
            {/* Bilanciere */}
            <circle cx={barX} cy={barY} r="6" fill="#fbbf24" stroke="#d97706" strokeWidth="2" />
            <rect x={barX - 4} y={barY - 14} width="8" height="28" rx="2" fill="#d97706" stroke="#fbbf24" strokeWidth="1.5" />
            {/* Badge angolo */}
            <g transform={`translate(${kneeX + 8}, ${kneeY - 14})`}>
              <rect x="0" y="0" width="48" height="16" rx="4" fill="#090d16" stroke="#334155" strokeWidth="1" />
              <text x="24" y="11" fill="#38bdf8" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                {Math.round(170 - depth * 88)}° GN
              </text>
            </g>
          </svg>
        );
      }

      // ───────────────────── BENCH PRESS ─────────────────────
      case 'bench': {
        const barY = 115 + depth * 58;
        const elbowX = 140 - depth * 14;
        const elbowY = 158 + depth * 22;

        return (
          <svg viewBox="0 0 280 270" className="w-full h-56 sm:h-64 select-none">
            {/* Panca */}
            <rect x="55" y="180" width="175" height="10" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="1.5" />
            <rect x="70" y="190" width="6" height="48" rx="2" fill="#1e293b" />
            <rect x="204" y="190" width="6" height="48" rx="2" fill="#1e293b" />
            <line x1="140" y1="97" x2="140" y2="178" stroke="#fbbf24" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
            <text x="144" y="107" fill="#fbbf24" fontSize="8" fontWeight="bold" opacity="0.6">LINEA DI SPINTA</text>
            {/* Corpo */}
            <line x1="72" y1="176" x2="194" y2="176" stroke="#f8fafc" strokeWidth="5" strokeLinecap="round" />
            {/* Testa */}
            <circle cx="63" cy="172" r="9" fill="#1e293b" stroke="#94a3b8" strokeWidth="2.5" />
            {/* Gamba a terra */}
            <path d={`M 185 175 Q 210 185 215 238`} fill="none" stroke="#64748b" strokeWidth="4" strokeLinecap="round" />
            {/* Braccio: Spalla → Gomito */}
            <line x1="105" y1="176" x2={elbowX} y2={elbowY} stroke="#cbd5e1" strokeWidth="4.5" strokeLinecap="round" />
            {/* Gomito → Mano */}
            <line x1={elbowX} y1={elbowY} x2="140" y2={barY} stroke="#f8fafc" strokeWidth="4.5" strokeLinecap="round" />
            {/* Snodi */}
            <circle cx="105" cy="176" r="4.5" fill="#0f172a" stroke="#fbbf24" strokeWidth="2" />
            <circle cx={elbowX} cy={elbowY} r="5" fill="#0f172a" stroke={primaryGlow} strokeWidth="2.5" />
            <circle cx="140" cy={barY} r="4" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
            {/* Bilanciere */}
            <circle cx="140" cy={barY} r="6" fill="#fbbf24" stroke="#d97706" strokeWidth="2" />
            <rect x="136" y={barY - 14} width="8" height="28" rx="2" fill="#d97706" stroke="#fbbf24" strokeWidth="1.5" />
            {/* ROM badge */}
            <g transform={`translate(158, ${barY - 10})`}>
              <rect x="0" y="0" width="56" height="16" rx="4" fill="#090d16" stroke="#334155" strokeWidth="1" />
              <text x="28" y="11" fill="#38bdf8" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                {currentPhase === 'isometric' ? 'PETTO' : `${Math.round((1 - depth) * 100)}% ROM`}
              </text>
            </g>
          </svg>
        );
      }

      // ───────────────────── STACCO / DEADLIFT ─────────────────────
      case 'deadlift': {
        // 0 = schiena alta / barre a terra, 1 = posizione dritta
        const t = depth; // depth=0 → basso (barre a terra), 1 → alto (lockout)
        const hipY = 220 - t * 110;
        const shoulderX = 140 - (1 - t) * 28;
        const shoulderY = hipY - 60 + (1 - t) * 10;
        const headX = shoulderX + 8;
        const headY = shoulderY - 18;
        const kneeX = 140 + (1 - t) * 5;
        const kneeY = 195 - t * 15;
        const barHandY = shoulderY + 55;

        return (
          <svg viewBox="0 0 280 270" className="w-full h-56 sm:h-64 select-none">
            <line x1="20" y1="238" x2="260" y2="238" stroke="#334155" strokeWidth="2" strokeDasharray="4 4" />
            <text x="26" y="250" fill="#64748b" fontSize="9" fontWeight="bold" fontFamily="monospace">PIANO D'APPOGGIO</text>
            {/* Barra a terra (piattaforma) */}
            <rect x="105" y="230" width="70" height="10" rx="3" fill="#d97706" stroke="#fbbf24" strokeWidth="1.5" />
            <circle cx="110" cy="235" r="9" fill="#1e293b" stroke="#fbbf24" strokeWidth="2" />
            <circle cx="170" cy="235" r="9" fill="#1e293b" stroke="#fbbf24" strokeWidth="2" />
            {/* Linea verticale barra */}
            <line x1="140" y1="220" x2="140" y2={barHandY} stroke="#fbbf24" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
            {/* Tibia */}
            <line x1="140" y1="238" x2={kneeX} y2={kneeY} stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" />
            {/* Femore */}
            <line x1={kneeX} y1={kneeY} x2="140" y2={hipY} stroke="#f8fafc" strokeWidth="5" strokeLinecap="round" />
            {/* Tronco */}
            <line x1="140" y1={hipY} x2={shoulderX} y2={shoulderY} stroke="#e2e8f0" strokeWidth="5.5" strokeLinecap="round" />
            {/* Braccio (dritto, solo tratto spalla-presa barra) */}
            <line x1={shoulderX} y1={shoulderY} x2="140" y2={barHandY} stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
            {/* Testa */}
            <circle cx={headX} cy={headY} r="9" fill="#1e293b" stroke="#94a3b8" strokeWidth="2.5" />
            {/* Snodi */}
            <circle cx="140" cy="238" r="4.5" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
            <circle cx={kneeX} cy={kneeY} r="5" fill="#0f172a" stroke={primaryGlow} strokeWidth="2.5" />
            <circle cx="140" cy={hipY} r="5.5" fill="#0f172a" stroke={primaryGlow} strokeWidth="2.5" />
            <circle cx={shoulderX} cy={shoulderY} r="4.5" fill="#0f172a" stroke="#fbbf24" strokeWidth="2" />
            {/* Badge angolo anca */}
            <g transform={`translate(148, ${hipY - 10})`}>
              <rect x="0" y="0" width="52" height="16" rx="4" fill="#090d16" stroke="#334155" strokeWidth="1" />
              <text x="26" y="11" fill="#10b981" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                {t < 0.05 ? 'PRESA' : t > 0.9 ? 'LOCKOUT' : `${Math.round(t * 100)}% SU`}
              </text>
            </g>
          </svg>
        );
      }

      // ───────────────────── HIP THRUST ─────────────────────
      case 'hip_thrust': {
        const hipY = 185 - depth * 70;
        const shoulderX = 90;
        const shoulderY = 185;
        const hipX = 140;
        const kneeX = 195;
        const kneeY = 185 + depth * 15;
        const footY = 235;

        return (
          <svg viewBox="0 0 280 270" className="w-full h-56 sm:h-64 select-none">
            <line x1="20" y1="238" x2="260" y2="238" stroke="#334155" strokeWidth="2" strokeDasharray="4 4" />
            {/* Panca di appoggio */}
            <rect x="55" y="180" width="80" height="12" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="1.5" />
            {/* Barra bilanciere sul bacino */}
            <rect x="100" y={hipY - 4} width="80" height="8" rx="4" fill="#d97706" stroke="#fbbf24" strokeWidth="1.5" />
            <circle cx="106" cy={hipY} r="10" fill="#1e293b" stroke="#fbbf24" strokeWidth="2" />
            <circle cx="174" cy={hipY} r="10" fill="#1e293b" stroke="#fbbf24" strokeWidth="2" />
            {/* Spalle (appoggio fisso sulla panca) */}
            <circle cx={shoulderX + 5} cy={shoulderY - 5} r="10" fill="#1e293b" stroke="#94a3b8" strokeWidth="2.5" />
            {/* Tronco (va da spalle ad anca) */}
            <line x1={shoulderX + 8} y1={shoulderY} x2={hipX} y2={hipY} stroke="#f8fafc" strokeWidth="5" strokeLinecap="round" />
            {/* Femore (da anca a ginocchio) */}
            <line x1={hipX} y1={hipY} x2={kneeX} y2={kneeY} stroke="#f8fafc" strokeWidth="5" strokeLinecap="round" />
            {/* Tibia (da ginocchio a piede) */}
            <line x1={kneeX} y1={kneeY} x2={kneeX - 5} y2={footY} stroke="#cbd5e1" strokeWidth="4.5" strokeLinecap="round" />
            {/* Piede */}
            <line x1={kneeX - 18} y1={footY} x2={kneeX + 18} y2={footY} stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" />
            {/* Snodi */}
            <circle cx={hipX} cy={hipY} r="6" fill="#0f172a" stroke={primaryGlow} strokeWidth="2.5" />
            <circle cx={kneeX} cy={kneeY} r="5" fill="#0f172a" stroke={primaryGlow} strokeWidth="2" />
            {/* Badge estensione anca */}
            <g transform={`translate(148, ${hipY - 14})`}>
              <rect x="0" y="0" width="52" height="16" rx="4" fill="#090d16" stroke="#334155" strokeWidth="1" />
              <text x="26" y="11" fill="#10b981" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                {depth > 0.85 ? 'MAX GLUTE' : `${Math.round(depth * 100)}%`}
              </text>
            </g>
          </svg>
        );
      }

      // ───────────────────── PULL VERTICALE (Lat Machine / Trazioni) ─────────────────────
      case 'pull_vertical': {
        // depth=0 → bracci tesi in alto, depth=1 → barra tirata al petto
        const handY = 60 + depth * 95;
        const elbowX = 140 - depth * 20;
        const elbowY = 90 + depth * 45;

        return (
          <svg viewBox="0 0 280 270" className="w-full h-56 sm:h-64 select-none">
            {/* Binario macchina */}
            <rect x="125" y="20" width="10" height="60" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
            <rect x="100" y="15" width="60" height="10" rx="4" fill="#334155" stroke="#475569" strokeWidth="1.5" />
            {/* Barra da tirare */}
            <rect x="108" y={handY - 4} width="64" height="8" rx="4" fill="#d97706" stroke="#fbbf24" strokeWidth="1.5" />
            {/* Seduta */}
            <rect x="100" y="210" width="80" height="10" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="1.5" />
            {/* Corpo atleta seduto */}
            <line x1="140" y1="210" x2="140" y2="145" stroke="#f8fafc" strokeWidth="5.5" strokeLinecap="round" /> {/* tronco */}
            <circle cx="140" cy="133" r="9" fill="#1e293b" stroke="#94a3b8" strokeWidth="2.5" /> {/* testa */}
            {/* Gambe */}
            <line x1="140" y1="210" x2="115" y2="230" stroke="#64748b" strokeWidth="4" strokeLinecap="round" />
            <line x1="140" y1="210" x2="165" y2="230" stroke="#64748b" strokeWidth="4" strokeLinecap="round" />
            {/* Braccio sinistro: Spalla → Gomito */}
            <line x1="132" y1="145" x2={elbowX - 20} y2={elbowY} stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
            <line x1={elbowX - 20} y1={elbowY} x2="118" y2={handY} stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" />
            {/* Braccio destro */}
            <line x1="148" y1="145" x2={elbowX + 20} y2={elbowY} stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
            <line x1={elbowX + 20} y1={elbowY} x2="162" y2={handY} stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" />
            {/* Snodi */}
            <circle cx="132" cy="145" r="4" fill="#0f172a" stroke="#fbbf24" strokeWidth="2" />
            <circle cx={elbowX - 20} cy={elbowY} r="5" fill="#0f172a" stroke={primaryGlow} strokeWidth="2.5" />
            <circle cx={elbowX + 20} cy={elbowY} r="5" fill="#0f172a" stroke={primaryGlow} strokeWidth="2.5" />
            {/* Badge ROM */}
            <g transform="translate(154, 48)">
              <rect x="0" y="0" width="56" height="16" rx="4" fill="#090d16" stroke="#334155" strokeWidth="1" />
              <text x="28" y="11" fill="#38bdf8" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                {depth > 0.85 ? 'PETTO' : `${Math.round(depth * 100)}% ROM`}
              </text>
            </g>
          </svg>
        );
      }

      // ───────────────────── PULL ORIZZONTALE (Pulley / Rematore) ─────────────────────
      case 'pull_horizontal': {
        const handX = 70 + depth * 65;
        const elbowX = 100 + depth * 40;
        const elbowY = 148;

        return (
          <svg viewBox="0 0 280 270" className="w-full h-56 sm:h-64 select-none">
            {/* Macchina cavi */}
            <rect x="40" y="100" width="30" height="120" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
            <circle cx="55" cy="148" r="8" fill="#334155" stroke="#475569" strokeWidth="1.5" />
            {/* Cavo */}
            <line x1="55" y1="148" x2={handX} y2="148" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.6" />
            {/* Presa / Maniglia */}
            <circle cx={handX} cy="148" r="5" fill="#d97706" stroke="#fbbf24" strokeWidth="2" />
            {/* Sedia / Appoggio */}
            <line x1="220" y1="205" x2="260" y2="205" stroke="#334155" strokeWidth="5" strokeLinecap="round" />
            {/* Corpo atleta seduto */}
            <line x1="230" y1="165" x2="230" y2="205" stroke="#f8fafc" strokeWidth="5.5" strokeLinecap="round" /> {/* tronco */}
            <circle cx="230" cy="153" r="9" fill="#1e293b" stroke="#94a3b8" strokeWidth="2.5" /> {/* testa */}
            {/* Gamba */}
            <line x1="230" y1="205" x2="258" y2="240" stroke="#64748b" strokeWidth="4" strokeLinecap="round" />
            {/* Braccio: Spalla → Gomito → Mano */}
            <line x1="220" y1="165" x2={elbowX} y2={elbowY} stroke="#cbd5e1" strokeWidth="4.5" strokeLinecap="round" />
            <line x1={elbowX} y1={elbowY} x2={handX} y2="148" stroke="#f8fafc" strokeWidth="4.5" strokeLinecap="round" />
            {/* Snodi */}
            <circle cx="220" cy="165" r="4.5" fill="#0f172a" stroke="#fbbf24" strokeWidth="2" />
            <circle cx={elbowX} cy={elbowY} r="5" fill="#0f172a" stroke={primaryGlow} strokeWidth="2.5" />
            {/* Freccia scapola */}
            {depth > 0.6 && (
              <g>
                <line x1="228" y1="165" x2="218" y2="165" stroke="#10b981" strokeWidth="2" strokeDasharray="2 1" />
                <polygon points="215,162 215,168 210,165" fill="#10b981" />
              </g>
            )}
            {/* Badge scapola */}
            <g transform={`translate(${elbowX + 6}, 136)`}>
              <rect x="0" y="0" width="54" height="16" rx="4" fill="#090d16" stroke="#334155" strokeWidth="1" />
              <text x="27" y="11" fill="#38bdf8" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                {depth > 0.85 ? 'SCAPOLE ✓' : `${Math.round(depth * 100)}% ROM`}
              </text>
            </g>
          </svg>
        );
      }

      // ───────────────────── PRESS VERTICALE (Military Press / OHP) ─────────────────────
      case 'press_vertical': {
        const barY = 160 - depth * 85;
        const elbowX = 140 - depth * 2;
        const elbowY = 185 - depth * 42;

        return (
          <svg viewBox="0 0 280 270" className="w-full h-56 sm:h-64 select-none">
            <line x1="20" y1="248" x2="260" y2="248" stroke="#334155" strokeWidth="2" strokeDasharray="4 4" />
            <line x1="140" y1="65" x2="140" y2="245" stroke="#fbbf24" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
            <text x="144" y="78" fill="#fbbf24" fontSize="8" fontWeight="bold" opacity="0.6">BAR PATH</text>
            {/* Corpo */}
            <line x1="140" y1="248" x2="140" y2="200" stroke="#64748b" strokeWidth="5" strokeLinecap="round" /> {/* gambe */}
            <line x1="140" y1="200" x2="140" y2="155" stroke="#f8fafc" strokeWidth="5.5" strokeLinecap="round" /> {/* tronco */}
            <circle cx="140" cy="143" r="9" fill="#1e293b" stroke="#94a3b8" strokeWidth="2.5" /> {/* testa */}
            {/* Braccio sinistro */}
            <line x1="132" y1="158" x2={elbowX - 25} y2={elbowY} stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
            <line x1={elbowX - 25} y1={elbowY} x2="118" y2={barY} stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" />
            {/* Braccio destro */}
            <line x1="148" y1="158" x2={elbowX + 25} y2={elbowY} stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
            <line x1={elbowX + 25} y1={elbowY} x2="162" y2={barY} stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" />
            {/* Snodi */}
            <circle cx="132" cy="158" r="4" fill="#0f172a" stroke="#fbbf24" strokeWidth="2" />
            <circle cx={elbowX - 25} cy={elbowY} r="5" fill="#0f172a" stroke={primaryGlow} strokeWidth="2.5" />
            <circle cx={elbowX + 25} cy={elbowY} r="5" fill="#0f172a" stroke={primaryGlow} strokeWidth="2.5" />
            {/* Bilanciere */}
            <rect x="104" y={barY - 4} width="72" height="8" rx="4" fill="#d97706" stroke="#fbbf24" strokeWidth="1.5" />
            <circle cx="108" cy={barY} r="8" fill="#1e293b" stroke="#fbbf24" strokeWidth="2" />
            <circle cx="172" cy={barY} r="8" fill="#1e293b" stroke="#fbbf24" strokeWidth="2" />
            {/* Badge */}
            <g transform={`translate(154, ${barY - 10})`}>
              <rect x="0" y="0" width="52" height="16" rx="4" fill="#090d16" stroke="#334155" strokeWidth="1" />
              <text x="26" y="11" fill="#38bdf8" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                {depth > 0.88 ? 'LOCKOUT ✓' : `${Math.round(depth * 100)}% SU`}
              </text>
            </g>
          </svg>
        );
      }

      // ───────────────────── CURL BICIPITE ─────────────────────
      case 'curl': {
        const handX = 160 - depth * 30;
        const handY = 215 - depth * 80;
        const elbowX = 155;
        const elbowY = 190;

        return (
          <svg viewBox="0 0 280 270" className="w-full h-56 sm:h-64 select-none">
            <line x1="20" y1="248" x2="260" y2="248" stroke="#334155" strokeWidth="2" strokeDasharray="4 4" />
            {/* Corpo */}
            <line x1="140" y1="248" x2="140" y2="155" stroke="#f8fafc" strokeWidth="5.5" strokeLinecap="round" />
            <circle cx="140" cy="143" r="9" fill="#1e293b" stroke="#94a3b8" strokeWidth="2.5" />
            {/* Braccia */}
            <line x1="148" y1="165" x2={elbowX} y2={elbowY} stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
            <line x1={elbowX} y1={elbowY} x2={handX} y2={handY} stroke="#f8fafc" strokeWidth="4.5" strokeLinecap="round" />
            {/* Manubrio */}
            <rect x={handX - 12} y={handY - 4} width="24" height="8" rx="4" fill="#d97706" stroke="#fbbf24" strokeWidth="1.5" />
            {/* Snodi */}
            <circle cx="148" cy="165" r="4" fill="#0f172a" stroke="#fbbf24" strokeWidth="2" />
            <circle cx={elbowX} cy={elbowY} r="5.5" fill="#0f172a" stroke={primaryGlow} strokeWidth="2.5" />
            {/* Forza vettore */}
            {depth > 0.5 && (
              <line x1={elbowX} y1={elbowY - 5} x2={elbowX - 5} y2={elbowY - 22} stroke="#10b981" strokeWidth="1.5" strokeDasharray="2 1" opacity="0.7" />
            )}
            {/* Badge */}
            <g transform={`translate(${handX + 6}, ${handY - 14})`}>
              <rect x="0" y="0" width="52" height="16" rx="4" fill="#090d16" stroke="#334155" strokeWidth="1" />
              <text x="26" y="11" fill="#38bdf8" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                {depth > 0.85 ? 'PICCO ✓' : `${Math.round(depth * 100)}% ROM`}
              </text>
            </g>
          </svg>
        );
      }

      // ───────────────────── TRICIPITE (Pushdown) ─────────────────────
      case 'tricep': {
        const handX = 155;
        const handY = 140 + depth * 70;
        const elbowX = 150;
        const elbowY = 145;

        return (
          <svg viewBox="0 0 280 270" className="w-full h-56 sm:h-64 select-none">
            {/* Cavo in alto */}
            <rect x="125" y="20" width="10" height="40" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
            <rect x="100" y="15" width="60" height="10" rx="4" fill="#334155" stroke="#475569" strokeWidth="1.5" />
            <circle cx="130" cy="60" r="6" fill="#334155" stroke="#475569" strokeWidth="1.5" />
            {/* Cavo */}
            <line x1="130" y1="60" x2={handX} y2={handY} stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.6" />
            {/* Corpo */}
            <line x1="140" y1="248" x2="140" y2="155" stroke="#f8fafc" strokeWidth="5.5" strokeLinecap="round" />
            <circle cx="140" cy="143" r="9" fill="#1e293b" stroke="#94a3b8" strokeWidth="2.5" />
            {/* Braccio: Spalla → Gomito (fisso) */}
            <line x1="148" y1="165" x2={elbowX} y2={elbowY} stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
            {/* Gomito → Mano (si muove verso il basso) */}
            <line x1={elbowX} y1={elbowY} x2={handX} y2={handY} stroke="#f8fafc" strokeWidth="4.5" strokeLinecap="round" />
            {/* Presa / Corda */}
            <circle cx={handX} cy={handY} r="5" fill="#d97706" stroke="#fbbf24" strokeWidth="2" />
            {/* Snodi */}
            <circle cx="148" cy="165" r="4" fill="#0f172a" stroke="#fbbf24" strokeWidth="2" />
            <circle cx={elbowX} cy={elbowY} r="6" fill="#0f172a" stroke={primaryGlow} strokeWidth="2.5" />
            {/* Badge angolo gomito */}
            <g transform={`translate(${elbowX + 8}, ${elbowY - 12})`}>
              <rect x="0" y="0" width="52" height="16" rx="4" fill="#090d16" stroke="#334155" strokeWidth="1" />
              <text x="26" y="11" fill="#38bdf8" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                {depth > 0.88 ? 'FULL EXT ✓' : `${Math.round(depth * 100)}%`}
              </text>
            </g>
          </svg>
        );
      }

      // ───────────────────── ALZATE LATERALI ─────────────────────
      case 'lateral_raise': {
        const armEndX = 155 + depth * 50;
        const armEndY = 175 - depth * 55;

        return (
          <svg viewBox="0 0 280 270" className="w-full h-56 sm:h-64 select-none">
            <line x1="20" y1="248" x2="260" y2="248" stroke="#334155" strokeWidth="2" strokeDasharray="4 4" />
            {/* Corpo */}
            <line x1="140" y1="248" x2="140" y2="155" stroke="#f8fafc" strokeWidth="5.5" strokeLinecap="round" />
            <circle cx="140" cy="143" r="9" fill="#1e293b" stroke="#94a3b8" strokeWidth="2.5" />
            {/* Linea guida del piano scapolare (30° in avanti) */}
            <line x1="148" y1="175" x2="220" y2="110" stroke="#64748b" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
            {/* Braccio che sale */}
            <line x1="148" y1="175" x2={armEndX} y2={armEndY} stroke="#f8fafc" strokeWidth="4.5" strokeLinecap="round" />
            {/* Manubrio */}
            <rect x={armEndX - 10} y={armEndY - 4} width="20" height="8" rx="4" fill="#d97706" stroke="#fbbf24" strokeWidth="1.5" />
            {/* Snodo spalla */}
            <circle cx="148" cy="175" r="5.5" fill="#0f172a" stroke={primaryGlow} strokeWidth="2.5" />
            {/* Arco di movimento */}
            <path
              d={`M 162 175 A 20 20 0 0 1 ${148 + 18 * Math.sin(depth * 1.5)} ${175 - 18 * (1 - Math.cos(depth * 1.5))}`}
              fill="none"
              stroke="#fbbf24"
              strokeWidth="1.5"
              strokeDasharray="2 2"
              opacity="0.5"
            />
            {/* Badge grado */}
            <g transform={`translate(${armEndX + 5}, ${armEndY - 14})`}>
              <rect x="0" y="0" width="46" height="16" rx="4" fill="#090d16" stroke="#334155" strokeWidth="1" />
              <text x="23" y="11" fill="#38bdf8" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                {Math.round(depth * 90)}°
              </text>
            </g>
          </svg>
        );
      }

      // ───────────────────── POLPACCIO ─────────────────────
      case 'calf': {
        const ankleY = 235;
        const heelRaise = depth * 38;
        const calfBulge = depth * 8;

        return (
          <svg viewBox="0 0 280 270" className="w-full h-56 sm:h-64 select-none">
            {/* Scalino */}
            <rect x="85" y="230" width="110" height="12" rx="3" fill="#1e293b" stroke="#334155" strokeWidth="1.5" />
            <line x1="20" y1="242" x2="260" y2="242" stroke="#334155" strokeWidth="2" strokeDasharray="4 4" />
            {/* Corpo */}
            <line x1="140" y1="230" x2="140" y2="90" stroke="#f8fafc" strokeWidth="5.5" strokeLinecap="round" />
            <circle cx="140" cy="78" r="9" fill="#1e293b" stroke="#94a3b8" strokeWidth="2.5" />
            {/* Gambe */}
            <line x1="140" y1="190" x2="125" y2="230" stroke="#e2e8f0" strokeWidth="5" strokeLinecap="round" />
            <line x1="140" y1="190" x2="155" y2="230" stroke="#e2e8f0" strokeWidth="5" strokeLinecap="round" />
            {/* Tallone sx (che si solleva) */}
            <circle cx="120" cy={ankleY - heelRaise} r="4.5" fill="#0f172a" stroke={primaryGlow} strokeWidth="2.5" />
            <circle cx="158" cy={ankleY - heelRaise} r="4.5" fill="#0f172a" stroke={primaryGlow} strokeWidth="2.5" />
            {/* Avampiede (fisso sul bordo scalino) */}
            <line x1="110" y1="230" x2="130" y2={ankleY - heelRaise} stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
            <line x1="148" y1="230" x2="168" y2={ankleY - heelRaise} stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
            {/* Polpaccio (si gonfia quando contratto) */}
            {calfBulge > 0 && (
              <ellipse cx="125" cy="215" rx={8 + calfBulge} ry="12" fill="#10b981" opacity={depth * 0.4} />
            )}
            {/* Freccia verso l'alto */}
            <line x1="140" y1={225 - heelRaise} x2="140" y2={215 - heelRaise} stroke="#fbbf24" strokeWidth="2" />
            <polygon points={`136,${215 - heelRaise} 144,${215 - heelRaise} 140,${207 - heelRaise}`} fill="#fbbf24" />
            {/* Badge */}
            <g transform={`translate(150, ${205 - heelRaise})`}>
              <rect x="0" y="0" width="52" height="16" rx="4" fill="#090d16" stroke="#334155" strokeWidth="1" />
              <text x="26" y="11" fill="#38bdf8" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                {depth > 0.88 ? 'PICCO ✓' : `+${Math.round(heelRaise)}mm`}
              </text>
            </g>
          </svg>
        );
      }

      // ───────────────────── CRUNCH / SIT-UP ─────────────────────
      case 'crunch': {
        // Atleta supino, tronco che si solleva
        const torsoLift = depth * 42;
        const shoulderX = 90 + depth * 15;
        const shoulderY = 175 - torsoLift;
        const headX = shoulderX - 12;
        const headY = shoulderY - 14;

        return (
          <svg viewBox="0 0 280 270" className="w-full h-56 sm:h-64 select-none">
            {/* Tappetino */}
            <rect x="40" y="195" width="200" height="8" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="1.5" />
            <line x1="20" y1="203" x2="260" y2="203" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
            {/* Gambe a terra (statiche) */}
            <line x1="140" y1="195" x2="175" y2="195" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
            <line x1="175" y1="195" x2="200" y2="195" stroke="#64748b" strokeWidth="4" strokeLinecap="round" />
            {/* Bacino (fisso) */}
            <circle cx="140" cy="195" r="6" fill="#0f172a" stroke="#64748b" strokeWidth="2" />
            {/* Tronco che si solleva */}
            <line x1="140" y1="195" x2={shoulderX} y2={shoulderY} stroke="#f8fafc" strokeWidth="5.5" strokeLinecap="round" />
            {/* Testa */}
            <circle cx={headX} cy={headY} r="9" fill="#1e293b" stroke="#94a3b8" strokeWidth="2.5" />
            {/* Mani dietro la testa (braccia) */}
            <line x1={shoulderX} y1={shoulderY} x2={headX - 5} y2={headY + 5} stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />
            {/* Addome highlight */}
            <line
              x1={140 + (shoulderX - 140) * 0.4}
              y1={195 - torsoLift * 0.4}
              x2={140 + (shoulderX - 140) * 0.75}
              y2={195 - torsoLift * 0.75}
              stroke={primaryGlow}
              strokeWidth="6"
              strokeLinecap="round"
              opacity={0.5 + depth * 0.4}
            />
            {/* Snodo */}
            <circle cx="140" cy="195" r="4.5" fill="#0f172a" stroke={primaryGlow} strokeWidth="2.5" />
            {/* Badge */}
            <g transform={`translate(${shoulderX - 16}, ${shoulderY - 22})`}>
              <rect x="0" y="0" width="52" height="16" rx="4" fill="#090d16" stroke="#334155" strokeWidth="1" />
              <text x="26" y="11" fill="#38bdf8" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                {depth > 0.85 ? 'CONTRAZIONE' : `${Math.round(depth * 100)}%`}
              </text>
            </g>
          </svg>
        );
      }

      // ───────────────────── LEG RAISE / ROLLOUT ─────────────────────
      case 'leg_raise': {
        const legAngle = depth * 90; // 0° (basso) → 90° (verticale)
        const legEndX = 140 + Math.sin((-legAngle * Math.PI) / 180 + Math.PI) * 75;
        const legEndY = 195 + Math.cos((-legAngle * Math.PI) / 180 + Math.PI) * 75;

        return (
          <svg viewBox="0 0 280 270" className="w-full h-56 sm:h-64 select-none">
            {/* Barra trazioni (sospensione) */}
            <rect x="90" y="30" width="100" height="8" rx="4" fill="#334155" stroke="#475569" strokeWidth="1.5" />
            {/* Mani che tengono la barra */}
            <circle cx="115" cy="38" r="5" fill="#d97706" stroke="#fbbf24" strokeWidth="2" />
            <circle cx="165" cy="38" r="5" fill="#d97706" stroke="#fbbf24" strokeWidth="2" />
            {/* Braccio sinistro (dritto verso barra) */}
            <line x1="115" y1="38" x2="125" y2="90" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
            <line x1="165" y1="38" x2="155" y2="90" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
            {/* Tronco (dritto verso il basso) */}
            <line x1="140" y1="90" x2="140" y2="155" stroke="#f8fafc" strokeWidth="5.5" strokeLinecap="round" />
            <circle cx="140" cy="78" r="9" fill="#1e293b" stroke="#94a3b8" strokeWidth="2.5" />
            {/* Gambe che si sollevano */}
            <line x1="140" y1="155" x2={legEndX} y2={legEndY} stroke="#f8fafc" strokeWidth="5" strokeLinecap="round" />
            {/* Contorno addome highlight */}
            <line
              x1="140"
              y1="155"
              x2={140 + (legEndX - 140) * 0.5}
              y2={155 + (legEndY - 155) * 0.5}
              stroke={primaryGlow}
              strokeWidth="7"
              strokeLinecap="round"
              opacity={0.4 + depth * 0.4}
            />
            {/* Snodi */}
            <circle cx="125" cy="90" r="4" fill="#0f172a" stroke="#fbbf24" strokeWidth="2" />
            <circle cx="155" cy="90" r="4" fill="#0f172a" stroke="#fbbf24" strokeWidth="2" />
            <circle cx="140" cy="155" r="5.5" fill="#0f172a" stroke={primaryGlow} strokeWidth="2.5" />
            {/* Badge angolo gamba */}
            <g transform={`translate(${legEndX + 5}, ${legEndY - 10})`}>
              <rect x="0" y="0" width="46" height="16" rx="4" fill="#090d16" stroke="#334155" strokeWidth="1" />
              <text x="23" y="11" fill="#38bdf8" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                {Math.round(legAngle)}°
              </text>
            </g>
          </svg>
        );
      }

      // ───────────────────── PLANK (ISOMETRICO) ─────────────────────
      case 'plank': {
        // L'animazione mostra la posizione stabile e la respirazione diaframmatica
        // progress guida una lieve oscillazione + il badge del timer
        const breathPulse = Math.sin(progress * Math.PI * 6) * 2; // lieve oscillazione breathing

        return (
          <svg viewBox="0 0 280 270" className="w-full h-56 sm:h-64 select-none">
            <line x1="20" y1="210" x2="260" y2="210" stroke="#334155" strokeWidth="2" strokeDasharray="4 4" />
            <text x="26" y="224" fill="#64748b" fontSize="9" fontWeight="bold" fontFamily="monospace">TAPPETINO</text>
            {/* Piede / Punta */}
            <line x1="215" y1="210" x2="225" y2="200" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" />
            {/* Tibia + Femore (gambe orizzontali) */}
            <line x1="215" y1="210" x2="155" y2="175" stroke="#f8fafc" strokeWidth="5" strokeLinecap="round" />
            {/* Anca */}
            <circle cx="155" cy="175" r="5.5" fill="#0f172a" stroke="#fbbf24" strokeWidth="2.5" />
            {/* Tronco orizzontale - LINEA RETTA (no sag, no pike) */}
            <line x1="155" y1={175 + breathPulse * 0.3} x2="80" y2={162 + breathPulse * 0.3} stroke="#f8fafc" strokeWidth="6" strokeLinecap="round" />
            {/* Linea di riferimento postura corretta */}
            <line x1="80" y1="162" x2="215" y2="175" stroke="#10b981" strokeWidth="1" strokeDasharray="5 3" opacity="0.5" />
            <text x="82" y="152" fill="#10b981" fontSize="8" fontWeight="bold" opacity="0.7">LINEA RETTA ✓</text>
            {/* Spalla */}
            <circle cx="80" cy={162 + breathPulse * 0.3} r="5.5" fill="#0f172a" stroke="#fbbf24" strokeWidth="2.5" />
            {/* Avambraccio (gomito a terra) */}
            <line x1="80" y1={162 + breathPulse * 0.3} x2="55" y2={200 + breathPulse * 0.3} stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" />
            {/* Gomito a terra */}
            <circle cx="55" cy={200 + breathPulse * 0.3} r="5" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
            {/* Forearm flat */}
            <line x1="55" y1={200 + breathPulse * 0.3} x2="70" y2={210 + breathPulse * 0.3} stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" />
            {/* Testa */}
            <circle cx="64" cy={150 + breathPulse * 0.3} r="10" fill="#1e293b" stroke="#94a3b8" strokeWidth="2.5" />
            {/* Core attivo indicator */}
            <rect x="110" y={174 + breathPulse * 0.3} width="38" height="6" rx="3" fill="#10b981" opacity={0.25 + Math.abs(Math.sin(progress * Math.PI * 4)) * 0.45} />
            <text x="129" y={171 + breathPulse * 0.3} fill="#10b981" fontSize="7" fontWeight="bold" textAnchor="middle" opacity="0.8">CORE ON</text>
            {/* Respirazione diaframmatica */}
            <circle
              cx="129"
              cy={185 + breathPulse * 0.3}
              r={6 + Math.abs(breathPulse) * 0.5}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="1.5"
              opacity="0.5"
            />
            {/* Timer badge */}
            <g transform="translate(188, 140)">
              <rect x="0" y="0" width="60" height="20" rx="6" fill="#090d16" stroke="#10b981" strokeWidth="1.5" />
              <text x="30" y="14" fill="#10b981" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                HOLD ✓
              </text>
            </g>
            {/* Badge postura */}
            <g transform="translate(154, 134)">
              <rect x="0" y="0" width="60" height="16" rx="4" fill="#090d16" stroke="#334155" strokeWidth="1" />
              <text x="30" y="11" fill="#fbbf24" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                BACINO NEUTRO
              </text>
            </g>
          </svg>
        );
      }

      // ───────────────────── GENERIC FALLBACK ─────────────────────
      default: {
        const yOffset = depth * 50;
        return (
          <svg viewBox="0 0 280 270" className="w-full h-56 sm:h-64 select-none">
            <line x1="20" y1="248" x2="260" y2="248" stroke="#334155" strokeWidth="2" strokeDasharray="4 4" />
            <line x1="140" y1="80" x2="140" y2="244" stroke="#fbbf24" strokeWidth="1" strokeDasharray="3 3" opacity="0.35" />
            <line x1="140" y1="248" x2={140 + depth * 12} y2={200 + depth * 12} stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
            <line x1={140 + depth * 12} y1={200 + depth * 12} x2={136 - depth * 18} y2={152 + depth * 22} stroke="#f8fafc" strokeWidth="4.5" strokeLinecap="round" />
            <line x1={136 - depth * 18} y1={152 + depth * 22} x2="140" y2={95 + yOffset} stroke="#e2e8f0" strokeWidth="5" strokeLinecap="round" />
            <circle cx="140" cy={78 + yOffset} r="9" fill="#1e293b" stroke="#94a3b8" strokeWidth="2.5" />
            <circle cx="140" cy={115 + yOffset} r="6" fill="#fbbf24" stroke="#d97706" strokeWidth="2" />
            <circle cx={140 + depth * 12} cy={200 + depth * 12} r="4.5" fill="#0f172a" stroke={primaryGlow} strokeWidth="2" />
            <circle cx={136 - depth * 18} cy={152 + depth * 22} r="4.5" fill="#0f172a" stroke={primaryGlow} strokeWidth="2" />
          </svg>
        );
      }
    }
  };

  // ─── Label tipo movimento ─────────────────────────────────────────
  const movementLabel: Record<CinematicType, string> = {
    squat: 'Accosciata',
    bench: 'Spinta Orizzontale',
    deadlift: 'Cerniera d\'Anca',
    pull_vertical: 'Trazione Verticale',
    pull_horizontal: 'Trazione Orizzontale',
    press_vertical: 'Spinta Verticale',
    curl: 'Flessione Gomito',
    tricep: 'Estensione Gomito',
    plank: 'Hold Isometrico',
    crunch: 'Flessione Tronco',
    leg_raise: 'Sollevamento Gambe',
    calf: 'Flessione Plantare',
    lateral_raise: 'Abduzione Omero',
    hip_thrust: 'Estensione Anca',
    generic: 'Movimento Composto',
  };

  return (
    <div className="rounded-3xl bg-slate-950/80 border border-slate-800/90 p-4 sm:p-5 space-y-4 shadow-xl backdrop-blur-md overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
              <span>Animazione Biomeccanica Live</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {movementLabel[cinematicType]}
              </span>
            </h4>
            <p className="text-[10px] text-slate-400">
              {category ? `${category} · ` : ''}Cinematica articolare in tempo reale
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsSlowMo(!isSlowMo)}
            className={`px-2.5 py-1 rounded-xl text-[10px] font-black border transition-all flex items-center gap-1 cursor-pointer ${
              isSlowMo
                ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Gauge className="w-3 h-3" />
            <span>{isSlowMo ? '0.5x' : '1.0x'}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-amber-400" />}
          </button>
        </div>
      </div>

      {/* SVG Area */}
      <div className="relative rounded-2xl bg-gradient-to-b from-slate-900/60 via-slate-950/90 to-slate-950 border border-slate-800/80 flex items-center justify-center p-2 overflow-hidden shadow-inner">
        {renderGraphic()}

        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <div className={`px-2.5 py-1 rounded-xl border backdrop-blur-md text-[10px] sm:text-xs font-black flex items-center gap-1.5 shadow-md ${phaseLabel.bg} ${phaseLabel.color}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            <span className="hidden sm:inline">{phaseLabel.title}</span>
            <span className="sm:hidden">{cinematicType === 'plank' ? 'HOLD' : currentPhase === 'concentric' ? 'Concentrica' : currentPhase === 'eccentric' ? 'Eccentrica' : currentPhase === 'isometric' ? 'Isometrica' : 'Lockout'}</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500 bg-slate-950/80 px-2 py-0.5 rounded-lg border border-slate-800">
            {Math.round(progress * 100)}%
          </span>
        </div>
      </div>

      {/* Spiegazione fase */}
      <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 text-xs text-slate-300 flex items-start gap-2.5">
        <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-white text-[11px]">{phaseLabel.title}</p>
          <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">{phaseLabel.desc}</p>
        </div>
      </div>
    </div>
  );
};
