import React, { useState } from 'react';
import { MuscleVolumeDetail, MUSCLE_BENCHMARKS } from '../../utils/muscleVolumeCalculator';

interface MuscleVolumeRadarChartProps {
  muscleDetails: MuscleVolumeDetail[];
  compareDetails?: MuscleVolumeDetail[] | null;
  compareLabel?: string;
  selectedMuscle?: string | null;
  onSelectMuscle?: (muscleGroup: string) => void;
  scope: 'day' | 'week' | 'mesocycle';
  maxScale?: number;
}

export const MuscleVolumeRadarChart: React.FC<MuscleVolumeRadarChartProps> = ({
  muscleDetails,
  compareDetails = null,
  compareLabel = 'Confronto',
  selectedMuscle = null,
  onSelectMuscle,
  scope,
  maxScale,
}) => {
  const [hoveredMuscle, setHoveredMuscle] = useState<MuscleVolumeDetail | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Se ci sono meno di 3 muscoli coinvolti, includiamo alcuni muscoli standard a 0 serie per formare un poligono armonioso
  const displayDetails = React.useMemo(() => {
    if (muscleDetails.length >= 3) return muscleDetails;
    const baseList = [...muscleDetails];
    const standardMuscles: MuscleVolumeDetail['muscleGroup'][] = [
      'Petto',
      'Dorso',
      'Spalle',
      'Quadricipiti',
      'Femorali',
      'Bicipiti',
      'Tricipiti',
    ];
    standardMuscles.forEach((m) => {
      if (baseList.length < 5 && !baseList.some((d) => d.muscleGroup === m)) {
        baseList.push({
          muscleGroup: m,
          directSets: 0,
          indirectSets: 0,
          totalSets: 0,
          effectiveVolume: 0,
          frequencyDays: [],
          exerciseCount: 0,
          exercisesList: [],
          benchmark: MUSCLE_BENCHMARKS[m],
          statusType: 'under_mv',
          status: 'low',
          statusLabel: 'Nessun volume',
        });
      }
    });
    return baseList;
  }, [muscleDetails]);

  // Dimensioni e geometria del grafico Radar PROTAGONISTA & FULL-WIDTH
  const width = 680;
  const height = 480;
  const cx = width / 2;
  const cy = height / 2;
  const radius = 185;

  const count = displayDetails.length;
  if (count === 0) return null;

  // Calcolo della scala massima
  const rawMax = Math.max(
    ...displayDetails.map((d) => d.totalSets),
    ...(compareDetails?.map((d) => d.totalSets) || [0]),
    1
  );

  const calculatedMax = maxScale || (scope === 'day' ? Math.max(rawMax, 6) : Math.max(rawMax, 18));
  // Arrotonda per eccesso a multiplo di 4 per una griglia pulita
  const axisMax = Math.ceil(calculatedMax / 4) * 4;

  // Angolo per ciascun asse (a partire dall'alto a -90°)
  const getCoordinates = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    const ratio = Math.min(Math.max(value / axisMax, 0), 1);
    const r = ratio * radius;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      angle,
    };
  };

  // Punti poligono Volume Diretto
  const directPoints = displayDetails
    .map((d, i) => {
      const { x, y } = getCoordinates(i, d.directSets);
      return `${x},${y}`;
    })
    .join(' ');

  // Punti poligono Volume Totale (Diretto + Indiretto)
  const totalPoints = displayDetails
    .map((d, i) => {
      const { x, y } = getCoordinates(i, d.totalSets);
      return `${x},${y}`;
    })
    .join(' ');

  // Punti poligono Confronto Periodo (se attivo)
  const compareMap = new Map<string, number>();
  if (compareDetails) {
    compareDetails.forEach((c) => compareMap.set(c.muscleGroup, c.totalSets));
  }
  const comparePoints = compareDetails
    ? displayDetails
        .map((d, i) => {
          const val = compareMap.get(d.muscleGroup) || 0;
          const { x, y } = getCoordinates(i, val);
          return `${x},${y}`;
        })
        .join(' ')
    : '';

  // Cerchi/Poligoni concentrici della griglia (25%, 50%, 75%, 100%)
  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <div className="relative w-full flex flex-col items-center justify-center select-none py-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full max-w-[700px] h-[360px] sm:h-[440px] md:h-[480px] overflow-visible"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }}
      >
        <defs>
          {/* Gradiente Oro per Volume Diretto */}
          <radialGradient id="directGradientLarge" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0.2" />
          </radialGradient>

          {/* Gradiente Ciano per Volume Totale */}
          <radialGradient id="totalGradientLarge" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.06" />
          </radialGradient>

          {/* Gradiente Viola per Confronto */}
          <radialGradient id="compareGradientLarge" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#c084fc" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#9333ea" stopOpacity="0.1" />
          </radialGradient>

          {/* Glow Filters */}
          <filter id="glowDirectLarge" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* ─── 1. GRIGLIA RADIALE POLIGONALE ─── */}
        {gridLevels.map((lvl, idx) => {
          const pts = Array.from({ length: count })
            .map((_, i) => {
              const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
              const r = lvl * radius;
              return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
            })
            .join(' ');

          const val = Math.round(lvl * axisMax);

          return (
            <g key={idx}>
              <polygon
                points={pts}
                fill="none"
                stroke="#1e293b"
                strokeWidth="1.2"
                strokeDasharray={idx < 3 ? '4 4' : undefined}
                className="opacity-80"
              />
              {/* Etichetta numerica valore serie sull'asse verticale */}
              <text
                x={cx + 6}
                y={cy - lvl * radius + 11}
                fill="#64748b"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {val}s
              </text>
            </g>
          );
        })}

        {/* ─── 2. ASSI RAGGI DAL CENTRO AI VERTICI ─── */}
        {displayDetails.map((d, i) => {
          const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
          const x2 = cx + radius * Math.cos(angle);
          const y2 = cy + radius * Math.sin(angle);
          const isSelected = selectedMuscle === d.muscleGroup || hoveredMuscle?.muscleGroup === d.muscleGroup;

          return (
            <line
              key={d.muscleGroup}
              x1={cx}
              y1={cy}
              x2={x2}
              y2={y2}
              stroke={isSelected ? '#f59e0b' : '#334155'}
              strokeWidth={isSelected ? '2' : '1'}
              strokeDasharray="2 3"
              className="transition-colors duration-200"
            />
          );
        })}

        {/* ─── 3. POLIGONO VOLUME TOTALE (DIRETTO + INDIRETTO) ─── */}
        <polygon
          points={totalPoints}
          fill="url(#totalGradientLarge)"
          stroke="#38bdf8"
          strokeWidth="2"
          strokeDasharray="5 3"
          className="transition-all duration-300"
        />

        {/* ─── 4. POLIGONO CONFRONTO (Se attivo) ─── */}
        {compareDetails && (
          <polygon
            points={comparePoints}
            fill="url(#compareGradientLarge)"
            stroke="#c084fc"
            strokeWidth="2.2"
            strokeDasharray="4 3"
            className="transition-all duration-300"
          />
        )}

        {/* ─── 5. POLIGONO VOLUME DIRETTO (PRIMARIO) ─── */}
        <polygon
          points={directPoints}
          fill="url(#directGradientLarge)"
          stroke="#f59e0b"
          strokeWidth="3"
          filter="url(#glowDirectLarge)"
          className="transition-all duration-300"
        />

        {/* ─── 6. VERTICI INTERATTIVI & ETICHETTE AMPLE ─── */}
        {displayDetails.map((d, i) => {
          const directCoord = getCoordinates(i, d.directSets);
          const totalCoord = getCoordinates(i, d.totalSets);
          const isHovered = hoveredMuscle?.muscleGroup === d.muscleGroup;
          const isSelected = selectedMuscle === d.muscleGroup;

          // Coordinate esterne per label distretto
          const labelAngle = (Math.PI * 2 * i) / count - Math.PI / 2;
          const labelR = radius + 32;
          const lx = cx + labelR * Math.cos(labelAngle);
          const ly = cy + labelR * Math.sin(labelAngle);

          return (
            <g
              key={d.muscleGroup}
              className="cursor-pointer group"
              onClick={() => onSelectMuscle && onSelectMuscle(d.muscleGroup)}
              onMouseEnter={() => setHoveredMuscle(d)}
              onMouseLeave={() => setHoveredMuscle(null)}
            >
              {/* Punto Volume Totale (Ciano) */}
              {d.indirectSets > 0 && (
                <circle
                  cx={totalCoord.x}
                  cy={totalCoord.y}
                  r={isHovered ? 5.5 : 4}
                  fill="#38bdf8"
                  stroke="#090d14"
                  strokeWidth="2"
                  className="transition-all duration-200"
                />
              )}

              {/* Punto Volume Diretto (Oro Brillante) */}
              <circle
                cx={directCoord.x}
                cy={directCoord.y}
                r={isHovered || isSelected ? 7 : 5}
                fill="#f59e0b"
                stroke="#fff"
                strokeWidth={isHovered || isSelected ? 2.5 : 1.5}
                className="transition-all duration-200"
              />

              {/* Etichetta Nome Distretto con Font Ingrandito e Leggibile */}
              <text
                x={lx}
                y={ly}
                textAnchor={
                  Math.abs(Math.cos(labelAngle)) < 0.2
                    ? 'middle'
                    : Math.cos(labelAngle) > 0
                    ? 'start'
                    : 'end'
                }
                dominantBaseline="central"
                fill={isHovered || isSelected ? '#f59e0b' : '#cbd5e1'}
                fontSize="12"
                fontWeight={isHovered || isSelected ? '900' : '700'}
                className="transition-colors duration-200 tracking-tight"
              >
                {d.muscleGroup}
                <tspan
                  dx="4"
                  fill={isHovered || isSelected ? '#fbbf24' : '#64748b'}
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  ({d.totalSets}s)
                </tspan>
              </text>
            </g>
          );
        })}
      </svg>

      {/* ─── TOOLTIP SOSPESO INTERATTIVO SU HOVER VERTICE ─── */}
      {hoveredMuscle && (
        <div
          className="absolute z-30 pointer-events-none p-3.5 rounded-2xl bg-slate-950/95 border border-slate-700 shadow-2xl backdrop-blur-md text-xs space-y-2 min-w-[210px] animate-in fade-in zoom-in-95 duration-100"
          style={{
            left: `${Math.min(Math.max(mousePos.x + 15, 10), width - 220)}px`,
            top: `${Math.min(Math.max(mousePos.y - 45, 10), height - 140)}px`,
          }}
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
            <span className="font-black text-white text-sm flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" />
              {hoveredMuscle.muscleGroup}
            </span>
            <span className="text-[10px] text-slate-400 font-mono font-bold bg-slate-900 px-1.5 py-0.5 rounded">
              {hoveredMuscle.exerciseCount} es.
            </span>
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Volume Diretto:</span>
              <span className="font-black text-amber-400">{hoveredMuscle.directSets} serie</span>
            </div>
            {hoveredMuscle.indirectSets > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Volume Indiretto:</span>
                <span className="font-bold text-sky-400">+{hoveredMuscle.indirectSets} serie</span>
              </div>
            )}
            <div className="flex justify-between items-center border-t border-slate-800/80 pt-1">
              <span className="text-slate-300 font-bold">Volume Totale:</span>
              <span className="font-black text-white font-mono">{hoveredMuscle.totalSets} serie</span>
            </div>
          </div>

          <div className="pt-1">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                hoveredMuscle.status === 'optimal'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : hoveredMuscle.status === 'high'
                  ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                  : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
              }`}
            >
              {hoveredMuscle.statusLabel}
            </span>
          </div>
        </div>
      )}

      {/* LEGENDA DEL GRAFICO RADAR */}
      <div className="flex flex-wrap items-center justify-center gap-5 mt-1 text-xs font-semibold text-slate-300">
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 border border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
          <span className="text-slate-200">Volume Diretto (100%)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full border border-sky-400 bg-sky-500/30 border-dashed" />
          <span className="text-sky-300">Totale (+ Sinergico)</span>
        </div>
        {compareDetails && (
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full border border-purple-400 bg-purple-500/30 border-dashed" />
            <span className="text-purple-300">{compareLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
};
