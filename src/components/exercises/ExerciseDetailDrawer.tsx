import React, { useEffect } from 'react';
import {
  X,
  Dumbbell,
  Shield,
  AlertTriangle,
  StopCircle,
  Layers,
  RotateCcw,
  Activity,
  Video,
  ExternalLink,
  Pencil,
  Sparkles,
  CheckCircle2,
  Trash2,
  Target,
} from 'lucide-react';
import { ExerciseItem, MuscleRole } from '../../types/exercise';

interface ExerciseDetailDrawerProps {
  exercise: ExerciseItem | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const MUSCLE_ROLE_COLORS: Record<MuscleRole, { dot: string; bar: string; badge: string }> = {
  'Target': {
    dot: 'bg-amber-500',
    bar: 'bg-gradient-to-r from-amber-500 to-amber-400',
    badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  },
  'Sinergico': {
    dot: 'bg-sky-400',
    bar: 'bg-gradient-to-r from-sky-500 to-sky-400',
    badge: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  },
  'Stabilizzatore': {
    dot: 'bg-emerald-400',
    bar: 'bg-gradient-to-r from-emerald-500 to-emerald-400',
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  },
  'Motore dinamico': {
    dot: 'bg-violet-400',
    bar: 'bg-gradient-to-r from-violet-500 to-violet-400',
    badge: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  },
};

const SectionTitle: React.FC<{ icon: React.ReactNode; title: string; color?: string }> = ({
  icon, title, color = 'text-amber-400'
}) => (
  <div className={`flex items-center gap-2 text-xs font-black uppercase tracking-wider mb-3 ${color}`}>
    {icon}
    <span>{title}</span>
  </div>
);

const InfoChip: React.FC<{ label: string; value: string | number | null | undefined; highlight?: boolean }> = ({ label, value, highlight }) => {
  if (!value && value !== 0) return null;
  return (
    <div className={`flex flex-col gap-0.5 bg-[#0d121c] border rounded-xl px-3.5 py-2.5 ${highlight ? 'border-amber-500/30 bg-amber-500/5' : 'border-slate-800'}`}>
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
      <span className={`text-xs font-extrabold ${highlight ? 'text-amber-300' : 'text-white'}`}>{value}</span>
    </div>
  );
};

export const ExerciseDetailDrawer: React.FC<ExerciseDetailDrawerProps> = ({
  exercise,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}) => {
  // Chiusura con tasto Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Blocca scroll del body se aperto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !exercise) return null;

  const hasMuscles = exercise.muscoli_coinvolti && exercise.muscoli_coinvolti.length > 0;
  const hasParams = !!exercise.parametri_chiave;
  const hasExecution = !!exercise.esecuzione;
  const hasSafety = !!exercise.sicurezza;
  const hasStructuredData = hasMuscles || hasParams || hasExecution || hasSafety || !!exercise.target_specifico;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop con sfocatura */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-200 animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal Container Centrato */}
      <div className="relative w-full max-w-3xl lg:max-w-4xl bg-[#090d14] border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden my-auto z-10 animate-in fade-in zoom-in-95 duration-200">

        {/* ── HEADER MODALE CENTRATO ────────────────────────────────────── */}
        <div className="flex items-start justify-between p-5 sm:p-6 border-b border-slate-800/80 bg-gradient-to-r from-slate-900 via-[#0d121c] to-[#090d14] shrink-0">
          <div className="flex items-start gap-3.5 flex-1 min-w-0 pr-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-black flex items-center justify-center font-black shadow-lg shadow-amber-500/20 shrink-0">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="px-2.5 py-0.5 bg-amber-500/15 text-amber-400 text-[10px] font-black rounded-lg border border-amber-500/30 uppercase tracking-wider">
                  {exercise.category}
                </span>
                <span className="px-2.5 py-0.5 bg-slate-800 text-slate-200 text-[10px] font-bold rounded-lg border border-slate-700">
                  {exercise.equipment}
                </span>
                {exercise.ruolo_esercizio && (
                  <span className="px-2.5 py-0.5 bg-sky-500/15 text-sky-400 text-[10px] font-bold rounded-lg border border-sky-500/30">
                    {exercise.ruolo_esercizio}
                  </span>
                )}
                {exercise.tipo && (
                  <span className="px-2.5 py-0.5 bg-violet-500/15 text-violet-400 text-[10px] font-bold rounded-lg border border-violet-500/30">
                    {exercise.tipo}
                  </span>
                )}
                {hasStructuredData ? (
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded-md flex items-center gap-1 border border-emerald-500/20">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Biomeccanica Avanzata
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-slate-800/80 text-slate-400 text-[10px] font-medium rounded-md">
                    Scheda Base
                  </span>
                )}
              </div>
              <h2 className="text-xl font-black text-white leading-tight tracking-tight truncate">
                {exercise.name}
              </h2>
              {exercise.target_specifico && (
                <p className="text-xs font-bold text-amber-400/90 mt-0.5 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" />
                  <span>Target: {exercise.target_specifico}</span>
                </p>
              )}
            </div>
          </div>

          {/* Azioni Header */}
          <div className="flex items-center gap-2 shrink-0">
            {onEdit && (
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-primary)] text-black hover:bg-[var(--color-primary-hover)] text-xs font-black rounded-xl transition-all shadow-md cursor-pointer"
                title="Modifica esercizio"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Modifica</span>
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                title="Elimina esercizio"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
              title="Chiudi (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── BODY SCROLLABILE ─────────────────────────────────────────── */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">

          {/* ── Video Tutorial Prominente se Presente ──────────────────── */}
          {exercise.video_url && (
            <section className="bg-gradient-to-br from-blue-950/30 to-indigo-950/20 border border-blue-800/40 rounded-2xl p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Video Tutorial Esecuzione</h4>
                  <p className="text-[11px] text-slate-400 truncate max-w-xs">{exercise.video_url}</p>
                </div>
              </div>
              <a
                href={exercise.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shrink-0 shadow-md shadow-blue-600/20"
              >
                <span>Guarda</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </section>
          )}

          {/* ── Parametri di Programmazione & Metadati ────────────────── */}
          <section>
            <SectionTitle icon={<Layers className="w-4 h-4" />} title="Classificazione & Programmazione" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <InfoChip label="Distretto" value={exercise.category} highlight />
              <InfoChip label="Target Specifico" value={exercise.target_specifico} highlight />
              <InfoChip label="Pattern Movimento" value={exercise.pattern_movimento} />
              <InfoChip label="Ruolo Esercizio" value={exercise.ruolo_esercizio} />
              <InfoChip label="Costo Sistemico (SNC)" value={exercise.costo_sistemico} />
              <InfoChip label="Difficoltà" value={exercise.livello_difficolta} />
              <InfoChip label="Bilateralità" value={exercise.bilateralita} />
              <InfoChip label="Progressione" value={exercise.progression_friendly ? 'Alta / Lineare' : 'Moderata / Isolamento'} />
              <InfoChip label="Piano Movimento" value={exercise.piano_movimento} />
              <InfoChip label="Catena Cinetica" value={exercise.catena_cinetica} />
              {exercise.gradi_liberta && (
                <InfoChip label="Gradi Libertà" value={`${exercise.gradi_liberta}`} />
              )}
            </div>
          </section>

          {/* ── Istruzioni / Descrizione ───────────────────────────────── */}
          {exercise.instructions && (
            <section>
              <SectionTitle icon={<Activity className="w-4 h-4" />} title="Istruzioni & Note Generali" />
              <div className="p-4 bg-[#0d121c] border border-slate-800 rounded-xl text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                {exercise.instructions}
              </div>
            </section>
          )}

          {/* ── Muscoli Coinvolti & Target ─────────────────────────────── */}
          {hasMuscles && (
            <section>
              <SectionTitle icon={<Dumbbell className="w-4 h-4" />} title="Mappa Muscolare & Coinvolgimento" />
              <div className="space-y-2.5 bg-[#0d121c] border border-slate-800 rounded-2xl p-4">
                {exercise.muscoli_coinvolti!.map((m, idx) => {
                  const cfg = MUSCLE_ROLE_COLORS[m.ruolo] || MUSCLE_ROLE_COLORS['Target'];
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                          <span className="font-bold text-white">{m.muscolo}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${cfg.badge}`}>
                            {m.ruolo}
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-slate-400">{m.percentuale}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${cfg.bar} rounded-full transition-all`}
                          style={{ width: `${Math.min(100, Math.max(5, m.percentuale))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── Parametri Biomeccanici Chiave ──────────────────────────── */}
          {hasParams && exercise.parametri_chiave && (
            <section>
              <SectionTitle icon={<RotateCcw className="w-4 h-4" />} title="Parametri Biomeccanici di Carico" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <InfoChip label="Curva Resistenza" value={exercise.parametri_chiave.curva_resistenza} />
                <InfoChip label="Punto di Picco" value={exercise.parametri_chiave.punto_picco} />
                <InfoChip label="Range of Motion" value={exercise.parametri_chiave.rom} />
                {exercise.parametri_chiave.tut && (
                  <InfoChip
                    label="TUT Consigliato"
                    value={`${exercise.parametri_chiave.tut.min}–${exercise.parametri_chiave.tut.max}s`}
                  />
                )}
                {exercise.parametri_chiave.recupero && (
                  <InfoChip
                    label="Recupero Consigliato"
                    value={`${exercise.parametri_chiave.recupero.min}–${exercise.parametri_chiave.recupero.max}s`}
                  />
                )}
                {exercise.parametri_chiave.tipo_stimolo && (
                  <InfoChip label="Focus Primario" value={exercise.parametri_chiave.tipo_stimolo} />
                )}
              </div>
            </section>
          )}

          {/* ── Esecuzione & Fasi Tecniche ─────────────────────────────── */}
          {hasExecution && exercise.esecuzione && (
            <section className="space-y-3">
              <SectionTitle icon={<Sparkles className="w-4 h-4" />} title="Guida Tecnica & Cues del Coach" />

              {/* Setup */}
              {exercise.esecuzione.setup && exercise.esecuzione.setup.length > 0 && (
                <div className="bg-[#0d121c] border border-slate-800 rounded-xl p-4">
                  <h5 className="text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-2">Posizionamento & Setup</h5>
                  <ul className="space-y-1 text-xs text-slate-300">
                    {exercise.esecuzione.setup.map((s, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-amber-500 font-bold">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Concentrica & Eccentrica */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {exercise.esecuzione.concentrica && (
                  <div className="bg-[#0d121c] border border-slate-800 rounded-xl p-3.5 space-y-2">
                    <span className="text-[10px] font-black uppercase text-sky-400 tracking-wider">Fase Concentrica</span>
                    <p className="text-xs text-slate-300">{exercise.esecuzione.concentrica.descrizione}</p>
                    {exercise.esecuzione.concentrica.cues?.length > 0 && (
                      <div className="pt-1 border-t border-slate-800/80">
                        <span className="text-[10px] font-bold text-slate-500">Cues mentali:</span>
                        <p className="text-[11px] text-sky-300/90 italic mt-0.5">
                          "{exercise.esecuzione.concentrica.cues.join(' · ')}"
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {exercise.esecuzione.eccentrica && (
                  <div className="bg-[#0d121c] border border-slate-800 rounded-xl p-3.5 space-y-2">
                    <span className="text-[10px] font-black uppercase text-purple-400 tracking-wider">Fase Eccentrica</span>
                    <p className="text-xs text-slate-300">{exercise.esecuzione.eccentrica.descrizione}</p>
                    {exercise.esecuzione.eccentrica.cues?.length > 0 && (
                      <div className="pt-1 border-t border-slate-800/80">
                        <span className="text-[10px] font-bold text-slate-500">Cues mentali:</span>
                        <p className="text-[11px] text-purple-300/90 italic mt-0.5">
                          "{exercise.esecuzione.eccentrica.cues.join(' · ')}"
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── Sicurezza & Controindicazioni ──────────────────────────── */}
          {hasSafety && exercise.sicurezza && (
            <section className="space-y-3">
              <SectionTitle icon={<Shield className="w-4 h-4 text-red-400" />} title="Sicurezza & Prevenzione Infortuni" color="text-red-400" />

              <div className="space-y-2.5">
                {exercise.sicurezza.controindicazioni?.length > 0 && (
                  <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-red-400 font-bold text-[11px] uppercase tracking-wider">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Controindicazioni & Limitazioni</span>
                    </div>
                    <ul className="space-y-1 text-slate-300 pl-4 list-disc">
                      {exercise.sicurezza.controindicazioni.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {exercise.sicurezza.criteri_arresto?.length > 0 && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px] uppercase tracking-wider">
                      <StopCircle className="w-3.5 h-3.5" />
                      <span>Criteri di Arresto Immediato</span>
                    </div>
                    <p className="text-slate-300">{exercise.sicurezza.criteri_arresto.join(' · ')}</p>
                  </div>
                )}

                {exercise.sicurezza.compensi_da_evitare?.length > 0 && (
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Compensi Comuni da Evitare</span>
                    <p className="text-slate-300">{exercise.sicurezza.compensi_da_evitare.join(' · ')}</p>
                  </div>
                )}
              </div>
            </section>
          )}

        </div>

        {/* ── FOOTER MODALE ───────────────────────────────────────────── */}
        <div className="p-4 border-t border-slate-800/80 bg-[#0d121c] flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500">
            ID Esercizio: <span className="font-mono text-slate-400">{exercise.id.slice(0, 12)}...</span>
          </span>
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="px-4 py-2 bg-[var(--color-primary)] text-black hover:bg-[var(--color-primary-hover)] text-xs font-black rounded-xl transition-all shadow-md"
              >
                Modifica Esercizio
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
