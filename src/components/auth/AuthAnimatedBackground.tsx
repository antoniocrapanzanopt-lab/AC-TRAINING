import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  energy: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface LightningBolt {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  points: { x: number; y: number }[];
  life: number;
  maxLife: number;
  color: string;
  width: number;
}

export const AuthAnimatedBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Coordinate Mouse
    const mouse = {
      x: width / 2,
      y: height / 2,
      lastX: width / 2,
      lastY: height / 2,
      isActive: false,
      speed: 0,
    };

    const sparks: Spark[] = [];
    const lightnings: LightningBolt[] = [];

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - mouse.lastX;
      const dy = e.clientY - mouse.lastY;
      mouse.speed = Math.min(25, Math.sqrt(dx * dx + dy * dy));

      mouse.lastX = mouse.x;
      mouse.lastY = mouse.y;
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.isActive = true;

      // Genera scintille elettriche al movimento del mouse
      if (mouse.speed > 2) {
        const sparkCount = Math.min(4, Math.floor(mouse.speed / 3));
        for (let s = 0; s < sparkCount; s++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 3 + 1;
          sparks.push({
            x: mouse.x + (Math.random() - 0.5) * 10,
            y: mouse.y + (Math.random() - 0.5) * 10,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1,
            maxLife: Math.floor(Math.random() * 20 + 15),
            color: Math.random() > 0.4 ? '6, 182, 212' : '234, 179, 8',
            size: Math.random() * 2 + 1,
          });
        }
      }
    };

    const handleMouseLeave = () => {
      mouse.isActive = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    // Inizializza particelle neurali ad alto voltaggio
    const particleCount = Math.min(75, Math.floor((width * height) / 16000));
    const colors = [
      '6, 182, 212',   // Electric Cyan
      '234, 179, 8',   // Electric Gold
      '56, 189, 248',  // Sky Blue
      '255, 255, 255', // Pure Neon White
    ];

    const particles: Particle[] = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.7,
      vy: (Math.random() - 0.5) * 0.7,
      size: Math.random() * 2.2 + 1,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: Math.random() * 0.6 + 0.2,
      energy: Math.random(),
    }));

    // Helper per generare segmenti frastagliati di fulmine (Jagged Lightning)
    const createLightningPoints = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      displace: number
    ): { x: number; y: number }[] => {
      const points: { x: number; y: number }[] = [{ x: x1, y: y1 }];
      const segments = 5;
      const dx = (x2 - x1) / segments;
      const dy = (y2 - y1) / segments;
      const normalX = -(y2 - y1);
      const normalY = x2 - x1;
      const len = Math.sqrt(normalX * normalX + normalY * normalY) || 1;
      const nx = normalX / len;
      const ny = normalY / len;

      for (let i = 1; i < segments; i++) {
        const offset = (Math.random() - 0.5) * displace;
        points.push({
          x: x1 + dx * i + nx * offset,
          y: y1 + dy * i + ny * offset,
        });
      }
      points.push({ x: x2, y: y2 });
      return points;
    };

    let frameCount = 0;

    const render = () => {
      frameCount++;
      ctx.clearRect(0, 0, width, height);

      // Generazione periodica di archi voltaici spontanei tra nodi carichi
      if (frameCount % 35 === 0 && particles.length > 2) {
        const idx1 = Math.floor(Math.random() * particles.length);
        let bestIdx2 = -1;
        let minDist = 220;

        for (let j = 0; j < particles.length; j++) {
          if (j === idx1) continue;
          const dx = particles[idx1].x - particles[j].x;
          const dy = particles[idx1].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < minDist && dist > 40) {
            minDist = dist;
            bestIdx2 = j;
          }
        }

        if (bestIdx2 !== -1) {
          const p1 = particles[idx1];
          const p2 = particles[bestIdx2];
          lightnings.push({
            startX: p1.x,
            startY: p1.y,
            endX: p2.x,
            endY: p2.y,
            points: createLightningPoints(p1.x, p1.y, p2.x, p2.y, 24),
            life: 1,
            maxLife: Math.floor(Math.random() * 8 + 6),
            color: Math.random() > 0.4 ? '6, 182, 212' : '234, 179, 8',
            width: Math.random() * 1.5 + 1,
          });
        }
      }

      // Se il mouse è attivo, genera archi voltaici con il mouse occasionalmente
      if (mouse.isActive && frameCount % 20 === 0) {
        let nearestP: Particle | null = null;
        let minDist = 180;

        for (const p of particles) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < minDist && dist > 30) {
            minDist = dist;
            nearestP = p;
          }
        }

        if (nearestP) {
          lightnings.push({
            startX: mouse.x,
            startY: mouse.y,
            endX: nearestP.x,
            endY: nearestP.y,
            points: createLightningPoints(mouse.x, mouse.y, nearestP.x, nearestP.y, 22),
            life: 1,
            maxLife: 6,
            color: '6, 182, 212',
            width: 1.8,
          });
        }
      }

      // 1. Disegna ed aggiorna fulmini / archi elettrici
      for (let l = lightnings.length - 1; l >= 0; l--) {
        const bolt = lightnings[l];
        bolt.life -= 1 / bolt.maxLife;

        if (bolt.life <= 0) {
          lightnings.splice(l, 1);
          continue;
        }

        const opacity = bolt.life;

        // Glow esterno elettrico
        ctx.beginPath();
        ctx.moveTo(bolt.points[0].x, bolt.points[0].y);
        for (let i = 1; i < bolt.points.length; i++) {
          ctx.lineTo(bolt.points[i].x, bolt.points[i].y);
        }
        ctx.strokeStyle = `rgba(${bolt.color}, ${opacity * 0.9})`;
        ctx.lineWidth = bolt.width * 2;
        ctx.shadowBlur = 16;
        ctx.shadowColor = `rgba(${bolt.color}, 1)`;
        ctx.stroke();

        // Nucleo bianco ad alta intensità
        ctx.beginPath();
        ctx.moveTo(bolt.points[0].x, bolt.points[0].y);
        for (let i = 1; i < bolt.points.length; i++) {
          ctx.lineTo(bolt.points[i].x, bolt.points[i].y);
        }
        ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.lineWidth = bolt.width * 0.75;
        ctx.shadowBlur = 4;
        ctx.shadowColor = '#ffffff';
        ctx.stroke();
      }

      // 2. Disegna ed aggiorna scintille (Sparks)
      for (let s = sparks.length - 1; s >= 0; s--) {
        const sp = sparks[s];
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.vx *= 0.95;
        sp.vy *= 0.95;
        sp.life -= 1 / sp.maxLife;

        if (sp.life <= 0) {
          sparks.splice(s, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.size * sp.life, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${sp.color}, ${sp.life})`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = `rgba(${sp.color}, 0.8)`;
        ctx.fill();
      }

      // 3. Disegna ed aggiorna particelle
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        // Repulsione/attrazione elettrica con mouse
        if (mouse.isActive) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            const force = (150 - dist) / 150;
            p.x -= (dx / dist) * force * 1.2;
            p.y -= (dy / dist) * force * 1.2;
          }
        }

        // Energia oscillante
        p.energy += 0.03;
        const currentAlpha = p.alpha * (0.7 + Math.sin(p.energy) * 0.3);

        // Disegna Particella
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color}, ${currentAlpha})`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = `rgba(${p.color}, 0.8)`;
        ctx.fill();

        // Linee di conduzione elettrica tra nodi vicini
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 130) {
            const lineAlpha = (1 - dist / 130) * 0.22 * Math.min(currentAlpha, p2.alpha);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(6, 182, 212, ${lineAlpha})`;
            ctx.lineWidth = 0.85;
            ctx.shadowBlur = 4;
            ctx.shadowColor = 'rgba(6, 182, 212, 0.4)';
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* ─── NEBULOSE DI SFONDO AD ALTO VOLTAGGIO ─── */}
      <div className="absolute -top-32 left-1/4 w-[550px] h-[550px] bg-amber-500/15 rounded-full blur-[140px] animate-pulse duration-[5000ms]" />
      <div className="absolute top-1/4 -right-32 w-[600px] h-[600px] bg-cyan-500/20 rounded-full blur-[150px] animate-pulse duration-[6000ms]" />
      <div className="absolute -bottom-32 left-1/3 w-[650px] h-[650px] bg-sky-500/15 rounded-full blur-[160px] animate-pulse duration-[7000ms]" />

      {/* ─── FASCIO DI LUCE LASER ORIZZONTALE AMBIENTALE ─── */}
      <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent blur-[1px] pointer-events-none" />

      {/* ─── CANVAS SCINTILLE & FULMINI 60FPS ─── */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-90" />

      {/* ─── GRIGLIA HIGH-TECH RETICOLATA ─── */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(6, 182, 212, 0.9) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />
    </div>
  );
};
