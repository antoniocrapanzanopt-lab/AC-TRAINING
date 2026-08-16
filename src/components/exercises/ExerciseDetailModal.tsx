import React from 'react';
import {
  X,
  Dumbbell,
  Shield,
  AlertTriangle,
  StopCircle,
  Layers,
  RotateCcw,
  Activity,
  ChevronRight,
  Video,
  ExternalLink,
  Info,
  Pencil,
  Sparkles,
} from 'lucide-react';
import { ExerciseItem, MuscleRole } from '../../types/exercise';
import { AI_CONFIG } from '../../config/aiConfig';

interface ExerciseDetailModalProps {
  exercise: ExerciseItem;
  onClose: () => void;
  onEdit?: () => void;
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
    {title}
  </div>
);

const InfoChip: React.FC<{ label: string; value: string | number | null | undefined }> = ({ label, value }) => {
  if (!value && value !== 0) return null;
  return (
    <div className="flex flex-col gap-0.5 bg-[#0d121c] border border-slate-800 rounded-xl px-3.5 py-2.5">
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
      <span className="text-sm font-extrabold text-white">{value}</span>
    </div>
  );
};

export const ExerciseDetailModal: React.FC<ExerciseDetailModalProps> = ({
  exercise, onClose, onEdit
}) => {
  const hasMuscles = exercise.muscoli_coinvolti && exercise.muscoli_coinvolti.length > 0;
  const hasParams = !!exercise.parametri_chiave;
  const hasExecution = !!exercise.esecuzione;
  const hasSafety = !!exercise.sicurezza;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-[#090d14] border border-slate-800/90 rounded-2xl shadow-2xl flex flex-col overflow-hidden my-4">

        {/* ── HEADER ─────────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between p-6 border-b border-slate-800/80 bg-gradient-to-r from-slate-900 via-[#0d121c] to-[#090d14]">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-black flex items-center justify-center font-black shadow-lg shadow-amber-500/20 shrink-0">
              <Dumbbell className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-black text-white leading-tight mb-2 tracking-tight">{exercise.name}</h2>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 bg-amber-500/15 text-amber-400 text-xs font-black rounded-lg border border-amber-500/30 uppercase tracking-wider">
                  {exercise.category}
                </span>
                <span className="px-2.5 py-1 bg-slate-800 text-slate-200 text-xs font-bold rounded-lg border border-slate-700">
                  {exercise.equipment}
                </span>
                {exercise.tipo && (
                  <span className="px-2.5 py-1 bg-violet-500/15 text-violet-400 text-xs font-bold rounded-lg border border-violet-500/30">
                    {exercise.tipo}
                  </span>
                )}
                {exercise.bilateralita && (
                  <span className="px-2.5 py-1 bg-slate-800 text-slate-400 text-xs font-semibold rounded-lg border border-slate-700">
                    {exercise.bilateralita}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-4 shrink-0">
            {onEdit && (
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-black hover:bg-amber-400 text-xs font-extrabold rounded-xl transition-all shadow-md"
              >
                <Pencil className="w-3.5 h-3.5" />
                Modifica
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white transition-colors rounded-xl hover:bg-slate-800/80"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── BODY CON TUTTE LE SEZIONI ──────────────────────────────────────── */}
        <div className="p-6 overflow-y-auto max-h-[75vh] space-y-6">

          {/* ── Informazioni Chiave ──────────────────────────────────────────── */}
          {(exercise.piano_movimento || exercise.catena_cinetica || exercise.gradi_liberta) && (
            <section>
              <SectionTitle icon={<Layers className="w-4 h-4" />} title="Classificazione Biomeccanica" />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                <InfoChip label="Categoria" value={exercise.category} />
                <InfoChip label="Tipo Stimolo" value={exercise.tipo} />
                <InfoChip label="Attrezzatura" value={exercise.equipment} />
                <InfoChip label="Bilateralità" value={exercise.bilateralita} />
                <InfoChip label="Piano Movimento" value={exercise.piano_movimento} />
                <InfoChip label="Catena Cinetica" value={exercise.catena_cinetica} />
                {exercise.gradi_liberta && (
                  <InfoChip label="Gradi di Libertà" value={`${exercise.gradi_liberta}`} />
                )}
              </div>
            </section>
          )}

          {/* ── Parametri Chiave ────────────────────────────────────────────── */}
          {hasParams && exercise.parametri_chiave && (
            <section>
              <SectionTitle icon={<Activity className="w-4 h-4" />} title="Parametri di Resistenza & Carico" />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                <InfoChip label="ROM" value={exercise.parametri_chiave.rom} />
                <InfoChip label="Curva di Resistenza" value={exercise.parametri_chiave.curva_resistenza} />
                <InfoChip label="Punto di Picco Tensione" value={exercise.parametri_chiave.punto_picco} />
                <InfoChip label="Tipo Stimolo" value={exercise.parametri_chiave.tipo_stimolo} />
                <InfoChip
                  label="TUT (sec)"
                  value={`${exercise.parametri_chiave.tut.min}–${exercise.parametri_chiave.tut.max} s`}
                />
                <InfoChip
                  label="Recupero (sec)"
                  value={`${exercise.parametri_chiave.recupero.min}–${exercise.parametri_chiave.recupero.max} s`}
                />
              </div>
            </section>
          )}

          {/* ── Muscoli Coinvolti ────────────────────────────────────────────── */}
          {hasMuscles && exercise.muscoli_coinvolti && (
            <section>
              <SectionTitle icon={<Dumbbell className="w-4 h-4" />} title="Mappa Attivazione Muscolare" />

              {/* Legenda ruoli */}
              <div className="flex flex-wrap gap-3 mb-3.5">
                {(Object.keys(MUSCLE_ROLE_COLORS) as MuscleRole[]).map(role => {
                  const hasRole = exercise.muscoli_coinvolti!.some(m => m.ruolo === role);
                  if (!hasRole) return null;
                  return (
                    <div key={role} className="flex items-center gap-1.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${MUSCLE_ROLE_COLORS[role].dot}`} />
                      <span className="text-xs text-slate-300 font-bold">{role}</span>
                    </div>
                  );
                })}
              </div>

              {/* Muscle bars */}
              <div className="space-y-2">
                {exercise.muscoli_coinvolti
                  .sort((a, b) => b.percentuale - a.percentuale)
                  .map((m, i) => {
                    const colors = MUSCLE_ROLE_COLORS[m.ruolo] ?? MUSCLE_ROLE_COLORS['Stabilizzatore'];
                    return (
                      <div key={i} className="flex items-center gap-3 bg-[#0d121c] border border-slate-800 rounded-xl px-4 py-2.5">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${colors.dot}`} />
                        <div className="w-44 shrink-0">
                          <span className="text-sm text-white font-extrabold block truncate">{m.muscolo}</span>
                        </div>
                        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${colors.bar}`}
                            style={{ width: `${m.percentuale}%` }}
                          />
                        </div>
                        <span className="text-xs font-black text-slate-300 w-10 text-right shrink-0">
                          {m.percentuale}%
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${colors.badge}`}>
                          {m.ruolo}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </section>
          )}

          {/* ── Esecuzione ──────────────────────────────────────────────────── */}
          {hasExecution && exercise.esecuzione && (
            <section>
              <SectionTitle icon={<RotateCcw className="w-4 h-4" />} title="Analisi dell'Esecuzione Tecnica" />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* Setup */}
                <div className="bg-[#0d121c] border border-slate-800 rounded-2xl p-4">
                  <div className="text-xs font-extrabold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 text-[11px] font-black">1</span>
                    Setup e Posizionamento
                  </div>
                  <ul className="space-y-2">
                    {exercise.esecuzione.setup.map((cue, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-300 leading-relaxed">
                        <ChevronRight className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        {cue}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Concentrica */}
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4">
                  <div className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-[11px] font-black">2</span>
                    Fase Concentrica
                  </div>
                  <p className="text-xs text-emerald-300/80 font-semibold mb-3 italic">
                    {exercise.esecuzione.concentrica.descrizione}
                  </p>
                  {exercise.esecuzione.concentrica.vettore_movimento && (
                    <p className="text-[11px] text-slate-400 mb-2">
                      Vettore: <span className="text-slate-200 font-semibold">{exercise.esecuzione.concentrica.vettore_movimento}</span>
                    </p>
                  )}
                  <ul className="space-y-1.5">
                    {exercise.esecuzione.concentrica.cues.map((cue, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-300 leading-relaxed">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                        {cue}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Eccentrica */}
                <div className="bg-sky-500/5 border border-sky-500/20 rounded-2xl p-4">
                  <div className="text-xs font-extrabold text-sky-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-sky-500/20 flex items-center justify-center text-sky-400 text-[11px] font-black">3</span>
                    Fase Eccentrica
                  </div>
                  <p className="text-xs text-sky-300/80 font-semibold mb-3 italic">
                    {exercise.esecuzione.eccentrica.descrizione}
                  </p>
                  {exercise.esecuzione.eccentrica.vettore_resistenza && (
                    <p className="text-[11px] text-slate-400 mb-2">
                      Vettore: <span className="text-slate-200 font-semibold">{exercise.esecuzione.eccentrica.vettore_resistenza}</span>
                    </p>
                  )}
                  <ul className="space-y-1.5">
                    {exercise.esecuzione.eccentrica.cues.map((cue, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-300 leading-relaxed">
                        <div className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0 mt-1.5" />
                        {cue}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          )}

          {/* ── Sicurezza & Controindicazioni ───────────────────────────────── */}
          {hasSafety && exercise.sicurezza && (
            <section>
              <SectionTitle
                icon={<Shield className="w-4 h-4" />}
                title="Sicurezza & Prevenzione Infortuni"
                color="text-red-400"
              />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* Compensi da Evitare */}
                {exercise.sicurezza.compensi_da_evitare.length > 0 && (
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
                    <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" />
                      Compensi Motori da Evitare
                    </div>
                    <ul className="space-y-2">
                      {exercise.sicurezza.compensi_da_evitare.map((c, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                          <span className="text-amber-400 shrink-0 font-black">⊘</span>
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Criteri di Arresto */}
                {exercise.sicurezza.criteri_arresto.length > 0 && (
                  <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4">
                    <div className="text-xs font-bold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <StopCircle className="w-4 h-4" />
                      Criteri di Arresto Immediato
                    </div>
                    <ul className="space-y-2">
                      {exercise.sicurezza.criteri_arresto.map((c, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                          <span className="text-red-500 shrink-0 font-black">⛔</span>
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Controindicazioni e Tolleranze */}
                {(exercise.sicurezza.controindicazioni.length > 0 || exercise.sicurezza.tolleranze) && (
                  <div className="bg-red-950/30 border border-red-800/40 rounded-2xl p-4">
                    <div className="text-xs font-bold text-red-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Shield className="w-4 h-4" />
                      Controindicazioni Cliniche
                    </div>
                    {exercise.sicurezza.controindicazioni.length > 0 && (
                      <ul className="space-y-2 mb-3">
                        {exercise.sicurezza.controindicazioni.map((c, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-red-200 font-bold">
                            <span className="text-red-400 shrink-0">⚠</span>
                            {c}
                          </li>
                        ))}
                      </ul>
                    )}
                    {exercise.sicurezza.tolleranze && (
                      <div className="flex items-start gap-2 pt-2 border-t border-red-800/30">
                        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-slate-300 italic leading-relaxed">
                          {exercise.sicurezza.tolleranze}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── Note Tecniche + Video ──────────────────────────────────────── */}
          {(exercise.instructions || exercise.video_url) && (
            <section className="flex flex-col sm:flex-row gap-4">
              {exercise.instructions && (
                <div className="flex-1 bg-[#0d121c] border border-slate-800 rounded-2xl p-4">
                  <SectionTitle icon={<Info className="w-4 h-4" />} title="Istruzioni per l'Atleta" color="text-slate-400" />
                  <p className="text-sm text-slate-300 leading-relaxed font-medium">{exercise.instructions}</p>
                </div>
              )}
              {exercise.video_url && (
                <div className="shrink-0 flex items-center">
                  <a
                    href={exercise.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-5 py-3.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-black rounded-xl hover:bg-blue-500/20 transition-all shadow-md"
                  >
                    <Video className="w-4 h-4" />
                    Guarda Video Tutorial
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </section>
          )}

          {/* Prompt per esercizi legacy senza dati strutturati */}
          {!hasMuscles && !hasParams && !hasExecution && !hasSafety && (
            <div className="py-12 text-center bg-[#0d121c] border border-slate-800/80 rounded-2xl">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-7 h-7 text-amber-400" />
              </div>
              <h4 className="text-base font-extrabold text-white mb-1">Scheda avanzata non ancora presente</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
                Clicca su "Modifica" e usa il pulsante ⚡ Auto-Compila per generare istantaneamente tutti i dati biomeccanici con {AI_CONFIG.GEMINI.DISPLAY_NAME}!
              </p>
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-black text-xs font-black uppercase tracking-wider rounded-xl hover:from-amber-400 hover:to-amber-500 transition-all"
                >
                  Modifica e Arricchisci con IA
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
        <div className="p-4 border-t border-slate-800/80 bg-[#070a0f] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors"
          >
            Chiudi Scheda
          </button>
        </div>
      </div>
    </div>
  );
};
