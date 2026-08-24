import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Dumbbell,
  Target,
  Sparkles,
  CheckCircle2,
  Video,
  Activity,
  Layers,
  ShieldAlert,
  ExternalLink
} from 'lucide-react';
import { WorkoutExercise } from '../../types/workout';
import { resolveExerciseAnatomy } from '../../utils/exerciseAnatomyResolver';
import { AnatomicalMuscleMap } from '../exercises/AnatomicalMuscleMap';

interface ExerciseAnatomyModalProps {
  exercise: WorkoutExercise;
  isOpen: boolean;
  onClose: () => void;
}

export const ExerciseAnatomyModal: React.FC<ExerciseAnatomyModalProps> = ({
  exercise,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'anatomy' | 'technique' | 'video'>('technique');
  const prevIsOpenRef = useRef(false);

  // Inizializza la tab solo al momento dell'apertura (transizione isOpen da false a true)
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setActiveTab(exercise.video_url ? 'video' : 'technique');
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, exercise.video_url]);

  // Gestione blocco scroll del body e chiusura con tasto Escape
  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const anatomy = resolveExerciseAnatomy(exercise.name);

  const targets = anatomy.muscles.filter((m) => m.ruolo === 'Target');
  const synergists = anatomy.muscles.filter((m) => m.ruolo === 'Sinergico');
  const stabilizers = anatomy.muscles.filter((m) => m.ruolo === 'Stabilizzatore');

  const executionSteps = anatomy.instructions
    ? anatomy.instructions.split('.').map(s => s.trim()).filter(Boolean)
    : [
        anatomy.setup || 'Posizionati correttamente allineando le articolazioni al carico.',
        'Inizia la fase concentrica mantenendo la stabilità del core e la traiettoria ideale.',
        'Controlla la fase eccentrica senza perdere la tensione muscolare.',
      ];

  const commonMistakes = anatomy.commonMistakes || [
    'Perdita di tensione nella fase eccentrica del movimento.',
    'Compensi con altri distretti muscolari o slanci incontrollati.',
  ];

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-slate-950 border border-slate-800 w-full max-w-2xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col relative z-10 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── HEADER ─── */}
        <div className="bg-[var(--color-panel)]/90 backdrop-blur-xl border-b border-[var(--color-panel-border)]/80 p-4 sm:p-5 flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)] shrink-0 shadow-md">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--color-primary)]/15 text-[var(--color-primary)] border border-[var(--color-primary)]/30">
                  {anatomy.category}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {anatomy.pattern}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white truncate leading-snug mt-0.5">
                {exercise.name}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer shrink-0"
            title="Chiudi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ─── SUB-NAVBAR TABS ─── */}
        <div className="px-4 pt-3 pb-2 bg-slate-900/60 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('technique')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'technique'
                ? 'bg-[var(--color-primary)] text-slate-950 shadow-md shadow-[var(--color-primary)]/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Guida Tecnica</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('anatomy')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'anatomy'
                ? 'bg-[var(--color-primary)] text-slate-950 shadow-md shadow-[var(--color-primary)]/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Mappa Anatomica</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('video')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'video'
                ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Video Tutorial</span>
            {!exercise.video_url && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400 font-bold border border-slate-700 ml-0.5">
                In arrivo
              </span>
            )}
          </button>
        </div>

        {/* ─── BODY SCROLLABILE ─── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: ANATOMIA */}
          {activeTab === 'anatomy' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Mappa Muscolare Interattiva */}
              <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-[var(--color-primary)]" />
                    Attivazione Muscolare 3D
                  </span>
                  <div className="flex items-center gap-3 text-[10px] font-bold">
                    <span className="flex items-center gap-1 text-[var(--color-primary)]">
                      <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] shadow-[0_0_6px_var(--color-primary)]" /> Target Primario
                    </span>
                    <span className="flex items-center gap-1 text-sky-400">
                      <span className="w-2 h-2 rounded-full bg-sky-400" /> Sinergico
                    </span>
                  </div>
                </div>

                <div className="py-2 flex justify-center">
                  <AnatomicalMuscleMap
                    muscles={anatomy.muscles}
                    interactive={true}
                    compact={true}
                  />
                </div>
              </div>

              {/* Elenco Muscoli per Ruolo & Percentuale */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Target Primari */}
                <div className="p-4 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-[var(--color-primary)] flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5" /> Muscoli Target (Primari):
                  </span>
                  <div className="space-y-1.5">
                    {targets.length > 0 ? (
                      targets.map((m, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs font-bold text-white bg-slate-950/80 px-3 py-1.5 rounded-xl border border-[var(--color-primary)]/20"
                        >
                          <span>{m.muscolo}</span>
                          <span className="text-[var(--color-primary)] font-mono text-[11px]">{m.percentuale}% stimolo</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400">Distretto primario di riferimento</p>
                    )}
                  </div>
                </div>

                {/* Sinergici & Stabilizzatori */}
                <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" /> Muscoli Sinergici & Secondari:
                  </span>
                  <div className="space-y-1.5">
                    {synergists.concat(stabilizers).length > 0 ? (
                      synergists.concat(stabilizers).map((m, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs font-bold text-white bg-slate-950/80 px-3 py-1.5 rounded-xl border border-sky-500/20"
                        >
                          <span>{m.muscolo}</span>
                          <span className="text-sky-400 font-mono text-[11px]">{m.ruolo}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400">Nessun muscolo secondario rilevante</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GUIDA TECNICA */}
          {activeTab === 'technique' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Esecuzione Step-by-Step */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Esecuzione Corretta & Setup
                </h4>
                <div className="space-y-2">
                  {executionSteps.map((step, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-start gap-3 text-xs leading-relaxed"
                    >
                      <span className="w-5 h-5 rounded-full bg-[var(--color-primary)] text-slate-950 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="text-slate-200 font-medium">{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Errori Comuni da Evitare */}
              {commonMistakes.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    Errori Comuni da Evitare
                  </h4>
                  <div className="space-y-2">
                    {commonMistakes.map((mistake, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-200 flex items-start gap-2.5"
                      >
                        <span className="text-rose-400 font-black shrink-0">✕</span>
                        <span>{mistake}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Consiglio del Coach */}
              <div className="p-4 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 text-xs space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-primary)] flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Consiglio Coach & Biomeccanica
                </span>
                <p className="text-slate-300 font-medium leading-relaxed">
                  Mantieni sempre il controllo della fase eccentrica (discesa controllata). Evita slanci o compensi lombari per massimizzare la tensione meccanica sui muscoli target.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: VIDEO TUTORIAL */}
          {activeTab === 'video' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {exercise.video_url ? (
                <div className="space-y-3">
                  <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-xl">
                    <iframe
                      src={
                        exercise.video_url.includes('youtube.com/watch?v=')
                          ? exercise.video_url.replace('watch?v=', 'embed/')
                          : exercise.video_url.includes('youtu.be/')
                          ? exercise.video_url.replace('youtu.be/', 'youtube.com/embed/')
                          : exercise.video_url
                      }
                      title={`Tutorial ${exercise.name}`}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                  <p className="text-xs text-slate-400 text-center">
                    Video tutorial dimostrativo fornito dal coach per {exercise.name}.
                  </p>
                </div>
              ) : (
                <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col items-center justify-center text-center space-y-4 shadow-xl">
                  <div className="w-14 h-14 rounded-2xl bg-red-600/15 border border-red-500/30 text-red-400 flex items-center justify-center shadow-lg">
                    <Video className="w-7 h-7" />
                  </div>
                  <div className="space-y-1 max-w-md">
                    <h4 className="text-sm font-black text-white">Video Tutorial su YouTube</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Non è ancora stato assegnato un video specifico per <strong>{exercise.name}</strong>. Puoi consultare i migliori video tutorial di esecuzione direttamente su YouTube.
                    </p>
                  </div>

                  <a
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(exercise.name + ' esecuzione corretta tutorial')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all inline-flex items-center gap-2 shadow-lg shadow-red-600/20 active:scale-95 cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Cerca Tutorial su YouTube</span>
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── FOOTER CON PULSANTE CHIUDI ─── */}
        <div className="p-4 bg-[var(--color-panel)] border-t border-[var(--color-panel-border)] flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 font-bold hidden sm:inline">
            AC Coaching Anatomy & Biomechanics Module
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-slate-950 text-xs font-black transition-all shadow-md cursor-pointer ml-auto"
          >
            Ho capito, torna all'allenamento
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
};
