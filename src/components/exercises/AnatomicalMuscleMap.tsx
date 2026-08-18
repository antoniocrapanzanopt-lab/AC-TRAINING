import React, { useState } from 'react';
import { MuscleInvolvement, MuscleRole } from '../../types/exercise';
import { Sparkles, Info } from 'lucide-react';

interface AnatomicalMuscleMapProps {
  muscles: MuscleInvolvement[];
  onToggleMuscle?: (muscleName: string) => void;
  interactive?: boolean;
  compact?: boolean;
}

// ─── Mappatura Distretti SVG -> Nomi Muscoli Comuni ───────────────────────────

interface MuscleZone {
  id: string;
  name: string;
  view: 'front' | 'back';
  matches: string[];
}

const MUSCLE_ZONES: MuscleZone[] = [
  // ANTERIORE
  { id: 'petto_dx', name: 'Gran Pettorale', view: 'front', matches: ['petto', 'pettorale', 'clavicolare', 'sternocostale'] },
  { id: 'petto_sx', name: 'Gran Pettorale', view: 'front', matches: ['petto', 'pettorale', 'clavicolare', 'sternocostale'] },
  { id: 'deltoide_ant_dx', name: 'Deltoide Anteriore', view: 'front', matches: ['deltoide anteriore', 'spalle anteriori'] },
  { id: 'deltoide_ant_sx', name: 'Deltoide Anteriore', view: 'front', matches: ['deltoide anteriore', 'spalle anteriori'] },
  { id: 'deltoide_lat_dx_front', name: 'Deltoide Laterale', view: 'front', matches: ['deltoide laterale', 'spalle laterali', 'deltoide medio'] },
  { id: 'deltoide_lat_sx_front', name: 'Deltoide Laterale', view: 'front', matches: ['deltoide laterale', 'spalle laterali', 'deltoide medio'] },
  { id: 'bicipite_dx', name: 'Bicipite Brachiale', view: 'front', matches: ['bicipite', 'biceps', 'brachiale', 'coracobrachiale'] },
  { id: 'bicipite_sx', name: 'Bicipite Brachiale', view: 'front', matches: ['bicipite', 'biceps', 'brachiale', 'coracobrachiale'] },
  { id: 'avambraccio_dx_front', name: 'Avambracci (Flessori)', view: 'front', matches: ['avambracc', 'flessori polso', 'brachioradiale'] },
  { id: 'avambraccio_sx_front', name: 'Avambracci (Flessori)', view: 'front', matches: ['avambracc', 'flessori polso', 'brachioradiale'] },
  { id: 'addome_retto', name: 'Retto dell\'Addome', view: 'front', matches: ['addome', 'retto', 'addominali', 'core'] },
  { id: 'obliqui_dx', name: 'Obliqui', view: 'front', matches: ['obliqu', 'trasverso addome', 'fianchi'] },
  { id: 'obliqui_sx', name: 'Obliqui', view: 'front', matches: ['obliqu', 'trasverso addome', 'fianchi'] },
  { id: 'quadricipite_dx', name: 'Quadricipite', view: 'front', matches: ['quadricipite', 'retto femorale', 'vasto', 'cosce'] },
  { id: 'quadricipite_sx', name: 'Quadricipite', view: 'front', matches: ['quadricipite', 'retto femorale', 'vasto', 'cosce'] },
  { id: 'aduttori_dx', name: 'Adduttori', view: 'front', matches: ['adduttor', 'adductor', 'interno coscia', 'gracile'] },
  { id: 'aduttori_sx', name: 'Adduttori', view: 'front', matches: ['adduttor', 'adductor', 'interno coscia', 'gracile'] },
  { id: 'tibiale_dx', name: 'Tibiale Anteriore', view: 'front', matches: ['tibiale', 'tibia'] },
  { id: 'tibiale_sx', name: 'Tibiale Anteriore', view: 'front', matches: ['tibiale', 'tibia'] },

  // POSTERIORE
  { id: 'trapezio_sup_dx', name: 'Trapezio Superiore', view: 'back', matches: ['trapezio', 'trapezi', 'collo'] },
  { id: 'trapezio_sup_sx', name: 'Trapezio Superiore', view: 'back', matches: ['trapezio', 'trapezi', 'collo'] },
  { id: 'trapezio_medio_inf', name: 'Trapezio Medio / Inferiore', view: 'back', matches: ['trapezio medio', 'trapezio inferiore', 'romboidi', 'interscapolari'] },
  { id: 'deltoide_post_dx', name: 'Deltoide Posteriore', view: 'back', matches: ['deltoide posteriore', 'capo posteriore spalla'] },
  { id: 'deltoide_post_sx', name: 'Deltoide Posteriore', view: 'back', matches: ['deltoide posteriore', 'capo posteriore spalla'] },
  { id: 'gran_dorsale_dx', name: 'Gran Dorsale', view: 'back', matches: ['dorsale', 'latissimus', 'gran dorsale', 'schiena'] },
  { id: 'gran_dorsale_sx', name: 'Gran Dorsale', view: 'back', matches: ['dorsale', 'latissimus', 'gran dorsale', 'schiena'] },
  { id: 'tricipite_dx', name: 'Tricipite Brachiale', view: 'back', matches: ['tricipite', 'triceps', 'capo lungo tricipite', 'anconeo'] },
  { id: 'tricipite_sx', name: 'Tricipite Brachiale', view: 'back', matches: ['tricipite', 'triceps', 'capo lungo tricipite', 'anconeo'] },
  { id: 'avambraccio_dx_back', name: 'Avambracci (Estensori)', view: 'back', matches: ['avambracc', 'estensori polso'] },
  { id: 'avambraccio_sx_back', name: 'Avambracci (Estensori)', view: 'back', matches: ['avambracc', 'estensori polso'] },
  { id: 'lombari', name: 'Erettori Spinali / Lombari', view: 'back', matches: ['lombari', 'erettori spinali', 'quadrato dei lombi', 'bassa schiena'] },
  { id: 'gluteo_dx', name: 'Grande Gluteo', view: 'back', matches: ['gluteo', 'glutei', 'gluteus maximus', 'medio gluteo'] },
  { id: 'gluteo_sx', name: 'Grande Gluteo', view: 'back', matches: ['gluteo', 'glutei', 'gluteus maximus', 'medio gluteo'] },
  { id: 'femorale_dx', name: 'Ischiocrurali / Femorali', view: 'back', matches: ['femorali', 'ischiocrurali', 'bicipite femorale', 'semitendinoso', 'semimembranoso', 'hamstrings'] },
  { id: 'femorale_sx', name: 'Ischiocrurali / Femorali', view: 'back', matches: ['femorali', 'ischiocrurali', 'bicipite femorale', 'semitendinoso', 'semimembranoso', 'hamstrings'] },
  { id: 'polpaccio_dx', name: 'Gastrocnemio / Polpaccio', view: 'back', matches: ['polpacc', 'gastrocnemio', 'soleo', 'calf'] },
  { id: 'polpaccio_sx', name: 'Gastrocnemio / Polpaccio', view: 'back', matches: ['polpacc', 'gastrocnemio', 'soleo', 'calf'] },
];

export const AnatomicalMuscleMap: React.FC<AnatomicalMuscleMapProps> = ({
  muscles,
  onToggleMuscle,
  interactive = true,
  compact = false,
}) => {
  const [view, setView] = useState<'front' | 'back'>('front');
  const [hoveredZone, setHoveredZone] = useState<MuscleZone | null>(null);

  // Trova se una zona è attiva tra i muscoli passati
  const getZoneMatch = (zone: MuscleZone): MuscleInvolvement | undefined => {
    return muscles.find(m => {
      const mName = m.muscolo.toLowerCase();
      return zone.matches.some(match => mName.includes(match.toLowerCase())) ||
        mName.includes(zone.name.toLowerCase());
    });
  };

  const getRoleColor = (role?: MuscleRole, perc: number = 30) => {
    if (!role) return { fill: '#141c28', stroke: '#273549', glow: 'none', opacity: 0.6 };
    
    switch (role) {
      case 'Target':
        return { 
          fill: '#f59e0b', 
          stroke: '#fbbf24', 
          glow: 'drop-shadow(0px 0px 8px rgba(245, 158, 11, 0.7))',
          opacity: Math.max(0.75, perc / 100)
        };
      case 'Sinergico':
        return { 
          fill: '#0ea5e9', 
          stroke: '#38bdf8', 
          glow: 'drop-shadow(0px 0px 6px rgba(14, 165, 233, 0.6))',
          opacity: Math.max(0.7, perc / 100)
        };
      case 'Stabilizzatore':
        return { 
          fill: '#10b981', 
          stroke: '#34d399', 
          glow: 'drop-shadow(0px 0px 6px rgba(16, 185, 129, 0.6))',
          opacity: Math.max(0.65, perc / 100)
        };
      case 'Motore dinamico':
        return { 
          fill: '#a855f7', 
          stroke: '#c084fc', 
          glow: 'drop-shadow(0px 0px 6px rgba(168, 85, 247, 0.6))',
          opacity: Math.max(0.7, perc / 100)
        };
      default:
        return { fill: '#141c28', stroke: '#273549', glow: 'none', opacity: 0.6 };
    }
  };

  const handleZoneClick = (zone: MuscleZone) => {
    if (interactive && onToggleMuscle) {
      onToggleMuscle(zone.name);
    }
  };

  const hoveredMatch = hoveredZone ? getZoneMatch(hoveredZone) : null;

  return (
    <div className={`flex flex-col items-center bg-[#070a0f] border border-slate-800/90 rounded-2xl p-4 shadow-xl relative overflow-hidden ${compact ? 'max-w-xs' : 'w-full'}`}>
      {/* Background radial highlight */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar con Selettore Vista */}
      <div className="flex items-center justify-between w-full mb-3 z-10">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[11px] font-black text-white uppercase tracking-wider">
            Mappa Anatomica 3D
          </span>
        </div>

        <div className="flex bg-slate-900/90 border border-slate-800 p-0.5 rounded-xl">
          <button
            type="button"
            onClick={() => setView('front')}
            className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
              view === 'front'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Anteriore
          </button>
          <button
            type="button"
            onClick={() => setView('back')}
            className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
              view === 'back'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Posteriore
          </button>
        </div>
      </div>

      {/* SVG Container */}
      <div className="relative flex justify-center items-center w-full py-1">
        <svg
          viewBox="0 0 240 380"
          className="w-48 h-72 sm:w-56 sm:h-80 select-none drop-shadow-2xl transition-all duration-300"
        >
          <defs>
            <linearGradient id="body-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0c111a" />
              <stop offset="100%" stopColor="#080c12" />
            </linearGradient>
          </defs>

          {/* SAGOMA CORPO BASE (Background silhouette) */}
          <path
            d="M120 18 C112 18 108 26 108 36 C108 46 112 52 120 52 C128 52 132 46 132 36 C132 26 128 18 120 18 Z
               M114 52 L100 62 L80 75 L62 105 L52 145 L48 185 L56 195 L64 165 L72 135 L80 120 L84 155 L86 210 L88 240 L82 300 L84 355 L96 360 L104 305 L112 250 L120 230 L128 250 L136 305 L144 360 L156 355 L158 300 L152 240 L154 210 L156 155 L160 120 L168 135 L176 165 L184 195 L192 185 L188 145 L178 105 L160 75 L140 62 L126 52 Z"
            fill="url(#body-gradient)"
            stroke="#1b2533"
            strokeWidth="1.5"
            opacity="0.85"
          />

          {/* ───────────────────────────────────────────────────────────── */}
          {/* VISTA ANTERIORE                                               */}
          {/* ───────────────────────────────────────────────────────────── */}
          {view === 'front' && (
            <g id="front-muscles" className="transition-all duration-300">
              {/* Petto Destro */}
              {(() => {
                const z = MUSCLE_ZONES.find(x => x.id === 'petto_dx')!;
                const match = getZoneMatch(z);
                const style = getRoleColor(match?.ruolo, match?.percentuale);
                return (
                  <path
                    d="M118 78 C112 76 96 78 90 85 C86 92 88 108 94 114 C104 118 116 114 118 108 Z"
                    fill={style.fill}
                    stroke={style.stroke}
                    strokeWidth="1.2"
                    fillOpacity={style.opacity}
                    style={{ filter: style.glow, cursor: interactive ? 'pointer' : 'default' }}
                    onMouseEnter={() => setHoveredZone(z)}
                    onMouseLeave={() => setHoveredZone(null)}
                    onClick={() => handleZoneClick(z)}
                  />
                );
              })()}

              {/* Petto Sinistro */}
              {(() => {
                const z = MUSCLE_ZONES.find(x => x.id === 'petto_sx')!;
                const match = getZoneMatch(z);
                const style = getRoleColor(match?.ruolo, match?.percentuale);
                return (
                  <path
                    d="M122 78 C128 76 144 78 150 85 C154 92 152 108 146 114 C136 118 124 114 122 108 Z"
                    fill={style.fill}
                    stroke={style.stroke}
                    strokeWidth="1.2"
                    fillOpacity={style.opacity}
                    style={{ filter: style.glow, cursor: interactive ? 'pointer' : 'default' }}
                    onMouseEnter={() => setHoveredZone(z)}
                    onMouseLeave={() => setHoveredZone(null)}
                    onClick={() => handleZoneClick(z)}
                  />
                );
              })()}

              {/* Deltoide Anteriore Destro */}
              {(() => {
                const z = MUSCLE_ZONES.find(x => x.id === 'deltoide_ant_dx')!;
                const match = getZoneMatch(z);
                const style = getRoleColor(match?.ruolo, match?.percentuale);
                return (
                  <path
                    d="M86 76 C80 80 74 90 76 102 C82 104 88 98 88 88 Z"
                    fill={style.fill}
                    stroke={style.stroke}
                    strokeWidth="1.2"
                    fillOpacity={style.opacity}
                    style={{ filter: style.glow, cursor: interactive ? 'pointer' : 'default' }}
                    onMouseEnter={() => setHoveredZone(z)}
                    onMouseLeave={() => setHoveredZone(null)}
                    onClick={() => handleZoneClick(z)}
                  />
                );
              })()}

              {/* Deltoide Anteriore Sinistro */}
              {(() => {
                const z = MUSCLE_ZONES.find(x => x.id === 'deltoide_ant_sx')!;
                const match = getZoneMatch(z);
                const style = getRoleColor(match?.ruolo, match?.percentuale);
                return (
                  <path
                    d="M154 76 C160 80 166 90 164 102 C158 104 152 98 152 88 Z"
                    fill={style.fill}
                    stroke={style.stroke}
                    strokeWidth="1.2"
                    fillOpacity={style.opacity}
                    style={{ filter: style.glow, cursor: interactive ? 'pointer' : 'default' }}
                    onMouseEnter={() => setHoveredZone(z)}
                    onMouseLeave={() => setHoveredZone(null)}
                    onClick={() => handleZoneClick(z)}
                  />
                );
              })()}

              {/* Bicipite Destro */}
              {(() => {
                const z = MUSCLE_ZONES.find(x => x.id === 'bicipite_dx')!;
                const match = getZoneMatch(z);
                const style = getRoleColor(match?.ruolo, match?.percentuale);
                return (
                  <path
                    d="M74 104 C68 112 66 128 70 138 C75 140 80 134 80 120 Z"
                    fill={style.fill}
                    stroke={style.stroke}
                    strokeWidth="1.2"
                    fillOpacity={style.opacity}
                    style={{ filter: style.glow, cursor: interactive ? 'pointer' : 'default' }}
                    onMouseEnter={() => setHoveredZone(z)}
                    onMouseLeave={() => setHoveredZone(null)}
                    onClick={() => handleZoneClick(z)}
                  />
                );
              })()}

              {/* Bicipite Sinistro */}
              {(() => {
                const z = MUSCLE_ZONES.find(x => x.id === 'bicipite_sx')!;
                const match = getZoneMatch(z);
                const style = getRoleColor(match?.ruolo, match?.percentuale);
                return (
                  <path
                    d="M166 104 C172 112 174 128 170 138 C165 140 160 134 160 120 Z"
                    fill={style.fill}
                    stroke={style.stroke}
                    strokeWidth="1.2"
                    fillOpacity={style.opacity}
                    style={{ filter: style.glow, cursor: interactive ? 'pointer' : 'default' }}
                    onMouseEnter={() => setHoveredZone(z)}
                    onMouseLeave={() => setHoveredZone(null)}
                    onClick={() => handleZoneClick(z)}
                  />
                );
              })()}

              {/* Avambracci Destro Front */}
              {(() => {
                const z = MUSCLE_ZONES.find(x => x.id === 'avambraccio_dx_front')!;
                const match = getZoneMatch(z);
                const style = getRoleColor(match?.ruolo, match?.percentuale);
                return (
                  <path
                    d="M68 142 C60 152 56 168 54 182 L60 186 C64 172 70 158 74 146 Z"
                    fill={style.fill}
                    stroke={style.stroke}
                    strokeWidth="1.2"
                    fillOpacity={style.opacity}
                    style={{ filter: style.glow, cursor: interactive ? 'pointer' : 'default' }}
                    onMouseEnter={() => setHoveredZone(z)}
                    onMouseLeave={() => setHoveredZone(null)}
                    onClick={() => handleZoneClick(z)}
                  />
                );
              })()}

              {/* Avambracci Sinistro Front */}
              {(() => {
                const z = MUSCLE_ZONES.find(x => x.id === 'avambraccio_sx_front')!;
                const match = getZoneMatch(z);
                const style = getRoleColor(match?.ruolo, match?.percentuale);
                return (
                  <path
                    d="M172 142 C180 152 184 168 186 182 L180 186 C176 172 170 158 166 146 Z"
                    fill={style.fill}
                    stroke={style.stroke}
                    strokeWidth="1.2"
                    fillOpacity={style.opacity}
                    style={{ filter: style.glow, cursor: interactive ? 'pointer' : 'default' }}
                    onMouseEnter={() => setHoveredZone(z)}
                    onMouseLeave={() => setHoveredZone(null)}
                    onClick={() => handleZoneClick(z)}
                  />
                );
              })()}

              {/* Retto Addome (Six-Pack) */}
              {(() => {
                const z = MUSCLE_ZONES.find(x => x.id === 'addome_retto')!;
                const match = getZoneMatch(z);
                const style = getRoleColor(match?.ruolo, match?.percentuale);
                return (
                  <path
                    d="M110 118 H130 V174 H110 Z
                       M110 130 H130 M110 144 H130 M110 158 H130 M120 118 V174"
                    fill={style.fill}
                    stroke={style.stroke}
                    strokeWidth="1.2"
                    fillOpacity={style.opacity}
                    style={{ filter: style.glow, cursor: interactive ? 'pointer' : 'default' }}
                    onMouseEnter={() => setHoveredZone(z)}
                    onMouseLeave={() => setHoveredZone(null)}
                    onClick={() => handleZoneClick(z)}
                  />
                );
              })()}

              {/* Obliqui Destri */}
              {(() => {
                const z = MUSCLE_ZONES.find(x => x.id === 'obliqui_dx')!;
                const match = getZoneMatch(z);
                const style = getRoleColor(match?.ruolo, match?.percentuale);
                return (
                  <path
                    d="M98 122 C92 134 94 158 98 170 H106 V122 Z"
                    fill={style.fill}
                    stroke={style.stroke}
                    strokeWidth="1"
                    fillOpacity={style.opacity}
                    style={{ filter: style.glow, cursor: interactive ? 'pointer' : 'default' }}
                    onMouseEnter={() => setHoveredZone(z)}
                    onMouseLeave={() => setHoveredZone(null)}
                    onClick={() => handleZoneClick(z)}
                  />
                );
              })()}

              {/* Obliqui Sinistri */}
              {(() => {
                const z = MUSCLE_ZONES.find(x => x.id === 'obliqui_sx')!;
                const match = getZoneMatch(z);
                const style = getRoleColor(match?.ruolo, match?.percentuale);
                return (
                  <path
                    d="M142 122 C148 134 146 158 142 170 H134 V122 Z"
                    fill={style.fill}
                    stroke={style.stroke}
                    strokeWidth="1"
                    fillOpacity={style.opacity}
                    style={{ filter: style.glow, cursor: interactive ? 'pointer' : 'default' }}
                    onMouseEnter={() => setHoveredZone(z)}
                    onMouseLeave={() => setHoveredZone(null)}
                    onClick={() => handleZoneClick(z)}
                  />
                );
              })()}

              {/* Quadricipite Destro */}
              {(() => {
                const z = MUSCLE_ZONES.find(x => x.id === 'quadricipite_dx')!;
                const match = getZoneMatch(z);
                const style = getRoleColor(match?.ruolo, match?.percentuale);
                return (
                  <path
                    d="M92 196 C86 210 88 250 94 280 C104 282 114 260 114 220 C114 200 106 194 92 196 Z"
                    fill={style.fill}
                    stroke={style.stroke}
                    strokeWidth="1.2"
                    fillOpacity={style.opacity}
                    style={{ filter: style.glow, cursor: interactive ? 'pointer' : 'default' }}
                    onMouseEnter={() => setHoveredZone(z)}
                    onMouseLeave={() => setHoveredZone(null)}
                    onClick={() => handleZoneClick(z)}
                  />
                );
              })()}

              {/* Quadricipite Sinistro */}
              {(() => {
                const z = MUSCLE_ZONES.find(x => x.id === 'quadricipite_sx')!;
                const match = getZoneMatch(z);
                const style = getRoleColor(match?.ruolo, match?.percentuale);
                return (
                  <path
                    d="M148 196 C154 210 152 250 146 280 C136 282 126 260 126 220 C126 200 134 194 148 196 Z"
                    fill={style.fill}
                    stroke={style.stroke}
                    strokeWidth="1.2"
                    fillOpacity={style.opacity}
                    style={{ filter: style.glow, cursor: interactive ? 'pointer' : 'default' }}
                    onMouseEnter={() => setHoveredZone(z)}
                    onMouseLeave={() => setHoveredZone(null)}
                    onClick={() => handleZoneClick(z)}
                  />
                );
              })()}

              {/* Tibiale Destro */}
              {(() => {
                const z = MUSCLE_ZONES.find(x => x.id === 'tibiale_dx')!;
                const match = getZoneMatch(z);
                const style = getRoleColor(match?.ruolo, match?.percentuale);
                return (
                  <path
                    d="M92 296 C88 310 88 335 94 350 C98 348 102 330 102 305 Z"
                    fill={style.fill}
                    stroke={style.stroke}
                    strokeWidth="1.1"
                    fillOpacity={style.opacity}
                    style={{ filter: style.glow, cursor: interactive ? 'pointer' : 'default' }}
                    onMouseEnter={() => setHoveredZone(z)}
                    onMouseLeave={() => setHoveredZone(null)}
                    onClick={() => handleZoneClick(z)}
                  />
                );
              })()}

              {/* Tibiale Sinistro */}
              {(() => {
                const z = MUSCLE_ZONES.find(x => x.id === 'tibiale_sx')!;
                const match = getZoneMatch(z);
                const style = getRoleColor(match?.ruolo, match?.percentuale);
                return (
                  <path
                    d="M148 296 C152 310 152 335 146 350 C142 348 138 330 138 305 Z"
                    fill={style.fill}
                    stroke={style.stroke}
                    strokeWidth="1.1"
                    fillOpacity={style.opacity}
                    style={{ filter: style.glow, cursor: interactive ? 'pointer' : 'default' }}
                    onMouseEnter={() => setHoveredZone(z)}
                    onMouseLeave={() => setHoveredZone(null)}
                    onClick={() => handleZoneClick(z)}
                  />
                );
              })()}
            </g>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* VISTA POSTERIORE                                              */}
          {/* ───────────────────────────────────────────────────────────── */}
          {view === 'back' && (
            <g id="back-muscles" className="transition-all duration-300">
              {/* Trapezio Superiore & Collo */}
              {(() => {
                const z = MUSCLE_ZONES.find(x => x.id === 'trapezio_sup_dx')!;
                const match = getZoneMatch(z);
                const style = getRoleColor(match?.ruolo, match?.percentuale);
                return (
                  <path
                    d="M120 54 L104 68 L86 76 C94 88 116 88 120 92 C124 88 146 88 154 76 L136 68 Z"
                    fill={style.fill}
                    stroke={style.stroke}
                    strokeWidth="1.2"
                    fillOpacity={style.opacity}
                    style={{ filter: style.glow, cursor: interactive ? 'pointer' : 'default' }}
                    onMouseEnter={() => setHoveredZone(z)}
                    onMouseLeave={() => setHoveredZone(null)}
                    onClick={() => handleZoneClick(z)}
                  />
                );
              })()}

              {/* Deltoide Posteriore Destro */}
              {(() => {
                const z = MUSCLE_ZONES.find(x => x.id === 'deltoide_post_dx')!;
                const match = getZoneMatch(z);
                const style = getRoleColor(match?.ruolo, match?.percentuale);
                return (
                  <path
                    d="M84 76 C76 82 74 94 76 104 C82 102 86 92 88 84 Z"
                    fill={style.fill}
                    stroke={style.stroke}
                    strokeWidth="1.2"
                    fillOpacity={style.opacity}
                    style={{ filter: style.glow, cursor: interactive ? 'pointer' : 'default' }}
                    onMouseEnter={() => setHoveredZone(z)}
                    onMouseLeave={() => setHoveredZone(null)}
                    onClick={() => handleZoneClick(z)}
                  />
                );
              })()}

              {/* Deltoide Posteriore Sinistro */}
              {(() => {
                const z = MUSCLE_ZONES.find(x => x.id === 'deltoide_post_sx')!;
                const match = getZoneMatch(z);
                const style = getRoleColor(match?.ruolo, match?.percentuale);
                return (
                  <path
                    d="M156 76 C164 82 166 94 164 104 C158 102 154 92 152 84 Z"
                    fill={style.fill}
                    stroke={style.stroke}
                    strokeWidth="1.2"
                    fillOpacity={style.opacity}
                    style={{ filter: style.glow, cursor: interactive ? 'pointer' : 'default' }}
                    onMouseEnter={() => setHoveredZone(z)}
                    onMouseLeave={() => setHoveredZone(null)}
                    onClick={() => handleZoneClick(z)}
                  />
                );
              })()}

              {/* Gran Dorsale Destro */}
              {(() => {
                const z = MUSCLE_ZONES.find(x => x.id === 'gran_dorsale_dx')!;
                const match = getZoneMatch(z);
                const style = getRoleColor(match?.ruolo, match?.percentuale);
                return (
                  <path
                    d="M92 98 C86 116 88 144 98 160 C106 156 114 140 116 118 C108 104 98 98 92 98 Z"
                    fill={style.fill}
                    stroke={style.stroke}
                    strokeWidth="1.2"
                    fillOpacity={style.opacity}
                    style={{ filter: style.glow, cursor: interactive ? 'pointer' : 'default' }}
                    onMouseEnter={() => setHoveredZone(z)}
                    onMouseLeave={() => setHoveredZone(null)}
                    onClick={() => handleZoneClick(z)}
                  />
                );
              })()}

              {/* Gran Dorsale Sinistro */}
              {(() => {
                const z = MUSCLE_ZONES.find(x => x.id === 'gran_dorsale_sx')!;
                const match = getZoneMatch(z);
                const style = getRoleColor(match?.ruolo, match?.percentuale);
                return (
                  <path
                    d="M148 98 C154 116 152 144 142 160 C134 156 126 140 124 118 C132 104 142 98 148 98 Z"
                    fill={style.fill}
                    stroke={style.stroke}
                    strokeWidth="1.2"
                    fillOpacity={style.opacity}
                    style={{ filter: style.glow, cursor: interactive ? 'pointer' : 'default' }}
                    onMouseEnter={() => setHoveredZone(z)}
                    onMouseLeave={() => setHoveredZone(null)}
                    onClick={() => handleZoneClick(z)}
                  />
                );
              })()}

              {/* Tricipite Destro Back */}
              {(() => {
                const z = MUSCLE_ZONES.find(x => x.id === 'tricipite_dx')!;
                const match = getZoneMatch(z);
                const style = getRoleColor(match?.ruolo, match?.percentuale);
                return (
                  <path
                    d="M74 106 C68 116 66 130 70 142 C76 140 80 130 80 116 Z"
                    fill={style.fill}
                    stroke={style.stroke}
                    strokeWidth="1.2"
                    fillOpacity={style.opacity}
                    style={{ filter: style.glow, cursor: interactive ? 'pointer' : 'default' }}
                    onMouseEnter={() => setHoveredZone(z)}
                    onMouseLeave={() => setHoveredZone(null)}
                    onClick={() => handleZoneClick(z)}
                  />
                );
              })()}

              {/* Tricipite Sinistro Back */}
              {(() => {
                const z = MUSCLE_ZONES.find(x => x.id === 'tricipite_sx')!;
                const match = getZoneMatch(z);
                const style = getRoleColor(match?.ruolo, match?.percentuale);
                return (
                  <path
                    d="M166 106 C172 116 174 130 170 142 C164 140 160 130 160 116 Z"
                    fill={style.fill}
                    stroke={style.stroke}
                    strokeWidth="1.2"
                    fillOpacity={style.opacity}
                    style={{ filter: style.glow, cursor: interactive ? 'pointer' : 'default' }}
                    onMouseEnter={() => setHoveredZone(z)}
                    onMouseLeave={() => setHoveredZone(null)}
                    onClick={() => handleZoneClick(z)}
                  />
                );
              })()}

              {/* Lombari / Erettori Spinali */}
              {(() => {
                const z = MUSCLE_ZONES.find(x => x.id === 'lombari')!;
                const match = getZoneMatch(z);
                const style = getRoleColor(match?.ruolo, match?.percentuale);
                return (
                  <path
                    d="M112 144 H128 V178 H112 Z
                       M120 144 V178"
                    fill={style.fill}
                    stroke={style.stroke}
                    strokeWidth="1.2"
                    fillOpacity={style.opacity}
                    style={{ filter: style.glow, cursor: interactive ? 'pointer' : 'default' }}
                    onMouseEnter={() => setHoveredZone(z)}
                    onMouseLeave={() => setHoveredZone(null)}
                    onClick={() => handleZoneClick(z)}
                  />
                );
              })()}

              {/* Grande Gluteo Destro */}
              {(() => {
                const z = MUSCLE_ZONES.find(x => x.id === 'gluteo_dx')!;
                const match = getZoneMatch(z);
                const style = getRoleColor(match?.ruolo, match?.percentuale);
                return (
                  <path
                    d="M118 182 C104 180 92 188 90 206 C90 220 102 226 118 222 Z"
                    fill={style.fill}
                    stroke={style.stroke}
                    strokeWidth="1.2"
                    fillOpacity={style.opacity}
                    style={{ filter: style.glow, cursor: interactive ? 'pointer' : 'default' }}
                    onMouseEnter={() => setHoveredZone(z)}
                    onMouseLeave={() => setHoveredZone(null)}
                    onClick={() => handleZoneClick(z)}
                  />
                );
              })()}

              {/* Grande Gluteo Sinistro */}
              {(() => {
                const z = MUSCLE_ZONES.find(x => x.id === 'gluteo_sx')!;
                const match = getZoneMatch(z);
                const style = getRoleColor(match?.ruolo, match?.percentuale);
                return (
                  <path
                    d="M122 182 C136 180 148 188 150 206 C150 220 138 226 122 222 Z"
                    fill={style.fill}
                    stroke={style.stroke}
                    strokeWidth="1.2"
                    fillOpacity={style.opacity}
                    style={{ filter: style.glow, cursor: interactive ? 'pointer' : 'default' }}
                    onMouseEnter={() => setHoveredZone(z)}
                    onMouseLeave={() => setHoveredZone(null)}
                    onClick={() => handleZoneClick(z)}
                  />
                );
              })()}

              {/* Femorali / Ischiocrurali Destri */}
              {(() => {
                const z = MUSCLE_ZONES.find(x => x.id === 'femorale_dx')!;
                const match = getZoneMatch(z);
                const style = getRoleColor(match?.ruolo, match?.percentuale);
                return (
                  <path
                    d="M92 226 C88 240 88 266 96 284 C104 282 112 264 114 230 Z"
                    fill={style.fill}
                    stroke={style.stroke}
                    strokeWidth="1.2"
                    fillOpacity={style.opacity}
                    style={{ filter: style.glow, cursor: interactive ? 'pointer' : 'default' }}
                    onMouseEnter={() => setHoveredZone(z)}
                    onMouseLeave={() => setHoveredZone(null)}
                    onClick={() => handleZoneClick(z)}
                  />
                );
              })()}

              {/* Femorali / Ischiocrurali Sinistri */}
              {(() => {
                const z = MUSCLE_ZONES.find(x => x.id === 'femorale_sx')!;
                const match = getZoneMatch(z);
                const style = getRoleColor(match?.ruolo, match?.percentuale);
                return (
                  <path
                    d="M148 226 C152 240 152 266 144 284 C136 282 128 264 126 230 Z"
                    fill={style.fill}
                    stroke={style.stroke}
                    strokeWidth="1.2"
                    fillOpacity={style.opacity}
                    style={{ filter: style.glow, cursor: interactive ? 'pointer' : 'default' }}
                    onMouseEnter={() => setHoveredZone(z)}
                    onMouseLeave={() => setHoveredZone(null)}
                    onClick={() => handleZoneClick(z)}
                  />
                );
              })()}

              {/* Polpacci / Gastrocnemio Destro */}
              {(() => {
                const z = MUSCLE_ZONES.find(x => x.id === 'polpaccio_dx')!;
                const match = getZoneMatch(z);
                const style = getRoleColor(match?.ruolo, match?.percentuale);
                return (
                  <path
                    d="M90 294 C84 310 86 332 94 346 C100 344 104 326 104 300 Z"
                    fill={style.fill}
                    stroke={style.stroke}
                    strokeWidth="1.2"
                    fillOpacity={style.opacity}
                    style={{ filter: style.glow, cursor: interactive ? 'pointer' : 'default' }}
                    onMouseEnter={() => setHoveredZone(z)}
                    onMouseLeave={() => setHoveredZone(null)}
                    onClick={() => handleZoneClick(z)}
                  />
                );
              })()}

              {/* Polpacci / Gastrocnemio Sinistro */}
              {(() => {
                const z = MUSCLE_ZONES.find(x => x.id === 'polpaccio_sx')!;
                const match = getZoneMatch(z);
                const style = getRoleColor(match?.ruolo, match?.percentuale);
                return (
                  <path
                    d="M150 294 C156 310 154 332 146 346 C140 344 136 326 136 300 Z"
                    fill={style.fill}
                    stroke={style.stroke}
                    strokeWidth="1.2"
                    fillOpacity={style.opacity}
                    style={{ filter: style.glow, cursor: interactive ? 'pointer' : 'default' }}
                    onMouseEnter={() => setHoveredZone(z)}
                    onMouseLeave={() => setHoveredZone(null)}
                    onClick={() => handleZoneClick(z)}
                  />
                );
              })()}
            </g>
          )}
        </svg>
      </div>

      {/* Info Tooltip / Feedback al passaggio del mouse o selezione */}
      <div className="w-full mt-2 pt-2 border-t border-slate-800/80 min-h-[38px] flex items-center justify-between text-xs">
        {hoveredZone ? (
          <div className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{
                backgroundColor: hoveredMatch
                  ? hoveredMatch.ruolo === 'Target' ? '#f59e0b'
                  : hoveredMatch.ruolo === 'Sinergico' ? '#0ea5e9'
                  : hoveredMatch.ruolo === 'Stabilizzatore' ? '#10b981'
                  : '#a855f7'
                  : '#475569'
              }}
            />
            <span className="font-bold text-white text-[11px]">{hoveredZone.name}</span>
            {hoveredMatch && (
              <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono font-bold">
                {hoveredMatch.ruolo} • {hoveredMatch.percentuale}%
              </span>
            )}
            {!hoveredMatch && interactive && (
              <span className="text-[10px] text-amber-400 font-bold">
                (Clicca per aggiungere)
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-slate-500 text-[10px]">
            <Info className="w-3 h-3 text-slate-400" />
            <span>Passa sopra i muscoli per dettagli o clicca per attivare</span>
          </div>
        )}

        {/* Legenda rapida compatta */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="flex items-center gap-1 text-[9px] text-amber-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Target
          </span>
          <span className="flex items-center gap-1 text-[9px] text-sky-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-sky-400 inline-block" /> Sinergico
          </span>
        </div>
      </div>
    </div>
  );
};
