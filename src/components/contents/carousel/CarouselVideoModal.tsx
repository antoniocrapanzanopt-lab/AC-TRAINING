import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Download,
  Film,
  Sliders,
  Loader2,
} from 'lucide-react';
import { InstagramCarousel } from '../../../types/carousel';
import {
  CarouselVideoConfig,
  DEFAULT_VIDEO_CONFIG,
  VideoTransitionType,
  preRenderAllCarouselSlides,
  drawCarouselVideoFrame,
  recordCarouselVideo,
} from '../../../services/carouselVideoService';
import { triggerFileDownload } from '../../../services/carouselExportService';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../../services/carouselCanvasRenderer';
import { useToast } from '../../../context/ToastContext';

interface CarouselVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  carousel: InstagramCarousel;
}

export const CarouselVideoModal: React.FC<CarouselVideoModalProps> = ({
  isOpen,
  onClose,
  carousel,
}) => {
  const { showSuccess, showError } = useToast();

  const [config, setConfig] = useState<CarouselVideoConfig>(DEFAULT_VIDEO_CONFIG);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(0);
  const [isPreRendering, setIsPreRendering] = useState<boolean>(true);
  const [preRenderProgress, setPreRenderProgress] = useState<number>(0);
  const [slideCanvases, setSlideCanvases] = useState<HTMLCanvasElement[]>([]);

  // Stato esportazione video
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordProgress, setRecordProgress] = useState<number>(0);
  const [recordStatusText, setRecordStatusText] = useState<string>('');
  const abortRecordRef = useRef<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);

  const totalSlides = carousel.slides?.length || 0;
  const totalDurationSec = totalSlides * config.durationPerSlideSeconds;

  // 1. Pre-renderizza tutte le slide all'apertura
  useEffect(() => {
    if (!isOpen || totalSlides === 0) return;

    let isMounted = true;
    setIsPreRendering(true);
    setPreRenderProgress(0);

    preRenderAllCarouselSlides(carousel, (rendered, total) => {
      if (isMounted) {
        setPreRenderProgress(Math.round((rendered / total) * 100));
      }
    })
      .then((canvases) => {
        if (isMounted) {
          setSlideCanvases(canvases);
          setIsPreRendering(false);
          setCurrentTimeSec(0);
          setIsPlaying(true);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Errore pre-rendering slide per video:', err);
          showError('Impossibile preparare le slide per l\'animazione video');
          setIsPreRendering(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, carousel, totalSlides, showError]);

  // 2. Disegna il frame corrente ogni volta che cambia il tempo o la configurazione
  const renderCurrentTimeFrame = useCallback(
    (timeSec: number) => {
      const canvas = canvasRef.current;
      if (!canvas || slideCanvases.length === 0) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      drawCarouselVideoFrame(ctx, slideCanvases, timeSec, config);
    },
    [slideCanvases, config]
  );

  // 3. Loop di riproduzione in anteprima
  useEffect(() => {
    if (!isPlaying || isPreRendering || isRecording || slideCanvases.length === 0) {
      lastTimestampRef.current = null;
      return;
    }

    const loop = (timestamp: number) => {
      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = timestamp;
      }

      const deltaSec = (timestamp - lastTimestampRef.current) / 1000;
      lastTimestampRef.current = timestamp;

      setCurrentTimeSec((prevTime) => {
        const nextTime = prevTime + deltaSec;
        if (nextTime >= totalDurationSec) {
          // Ricomincia in loop continuo
          renderCurrentTimeFrame(0);
          return 0;
        }
        renderCurrentTimeFrame(nextTime);
        return nextTime;
      });

      animFrameIdRef.current = requestAnimationFrame(loop);
    };

    animFrameIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [isPlaying, isPreRendering, isRecording, slideCanvases, totalDurationSec, renderCurrentTimeFrame]);

  // Gestione controlli
  const handleTogglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleRestart = () => {
    setCurrentTimeSec(0);
    renderCurrentTimeFrame(0);
    setIsPlaying(true);
  };

  const handleSeek = (newTimeSec: number) => {
    setCurrentTimeSec(newTimeSec);
    renderCurrentTimeFrame(newTimeSec);
  };

  // 4. Avvio esportazione video Full HD 1080x1350
  const handleExportVideo = async () => {
    if (slideCanvases.length === 0 || isRecording) return;

    setIsPlaying(false);
    setIsRecording(true);
    setRecordProgress(0);
    setRecordStatusText('Inizializzazione registrazione video Full HD...');
    abortRecordRef.current = false;

    try {
      const result = await recordCarouselVideo(
        carousel,
        config,
        (pct, status) => {
          setRecordProgress(pct);
          setRecordStatusText(status);
        },
        () => abortRecordRef.current
      );

      triggerFileDownload(result.blob, result.filename);
      showSuccess('Video 4:5 Esportato!', `Il file "${result.filename}" è stato scaricato con successo.`);
    } catch (err: unknown) {
      if (!abortRecordRef.current) {
        const msg = err instanceof Error ? err.message : 'Errore esportazione video';
        console.error('Errore esportazione video animato:', err);
        showError('Errore Esportazione Video', msg);
      }
    } finally {
      setIsRecording(false);
      setRecordProgress(0);
      setIsPlaying(true);
    }
  };

  if (!isOpen) return null;

  const currentSlideIndex = Math.min(
    totalSlides - 1,
    Math.floor(currentTimeSec / config.durationPerSlideSeconds)
  );

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-950 border border-slate-800 w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[96vh]">
        {/* ─── HEADER ─── */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md shadow-amber-500/10">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">Carosello Video Animato</h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase tracking-wider">
                  Post 4:5 · 1080×1350
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {totalSlides} slide animate in sequenza fluida per il feed di Instagram
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 flex items-center justify-center transition cursor-pointer"
            title="Chiudi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ─── CORPO: PLAYER & CONTROLLI ─── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* COLONNA SINISTRA: CANVAS PLAYER (4:5) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center space-y-4">
            <div className="relative w-full max-w-[360px] aspect-[4/5] rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-2xl flex items-center justify-center group">
              {isPreRendering ? (
                <div className="flex flex-col items-center justify-center space-y-3 p-6 text-center">
                  <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                  <span className="text-xs text-slate-300 font-bold">
                    Rendering fotogrammi in alta risoluzione... ({preRenderProgress}%)
                  </span>
                </div>
              ) : (
                <>
                  <canvas
                    ref={canvasRef}
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    className="w-full h-full object-contain select-none"
                  />

                  {/* Overlay Play / Pausa al click */}
                  <div
                    onClick={handleTogglePlay}
                    className="absolute inset-0 bg-transparent flex items-center justify-center cursor-pointer transition-colors"
                  >
                    {!isPlaying && (
                      <div className="w-16 h-16 rounded-full bg-black/60 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-2xl backdrop-blur-sm transform transition-transform hover:scale-110">
                        <Play className="w-7 h-7 ml-1 fill-amber-400" />
                      </div>
                    )}
                  </div>

                  {/* Badge Slide Corrente */}
                  <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/10 text-[11px] font-mono text-white pointer-events-none">
                    Slide {currentSlideIndex + 1} / {totalSlides}
                  </div>
                </>
              )}
            </div>

            {/* BARRA CONTROLLI PLAYER */}
            <div className="w-full max-w-[360px] bg-slate-900/90 border border-slate-800 p-3 rounded-2xl space-y-2">
              <div className="flex items-center justify-between gap-3 text-xs font-mono text-slate-400">
                <span>{formatTime(currentTimeSec)}</span>
                <input
                  type="range"
                  min={0}
                  max={totalDurationSec || 1}
                  step={0.05}
                  value={currentTimeSec}
                  onChange={(e) => handleSeek(parseFloat(e.target.value))}
                  className="flex-1 accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                />
                <span>{formatTime(totalDurationSec)}</span>
              </div>

              <div className="flex items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleRestart}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                  title="Ricomincia dall'inizio"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleTogglePlay}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-slate-950" />}
                  <span>{isPlaying ? 'Pausa' : 'Play'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* COLONNA DESTRA: CONFIGURAZIONE & ESPORTAZIONE */}
          <div className="lg:col-span-5 space-y-5">
            {/* CARD IMPOSTAZIONI ANIMAZIONE */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-400">
                <Sliders className="w-4 h-4" />
                <span>Impostazioni Video Post (4:5)</span>
              </div>

              {/* 1. SELETTORE TRANSIZIONE */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">Stile di Transizione</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'swipe' as VideoTransitionType, label: 'Swipe Instagram', icon: '↔️' },
                    { id: 'fade' as VideoTransitionType, label: 'Dissolvenza', icon: '✨' },
                    { id: 'zoom' as VideoTransitionType, label: 'Zoom Dinamico', icon: '🔍' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setConfig((prev) => ({ ...prev, transitionType: t.id }))}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                        config.transitionType === t.id
                          ? 'bg-amber-500/15 border-amber-500 text-amber-300 shadow-md shadow-amber-500/10'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className="text-base">{t.icon}</span>
                      <span className="text-[11px] text-center">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. DURATA LETTURA PER SLIDE */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">Tempo per Slide</span>
                  <span className="font-mono text-amber-400 font-bold">{config.durationPerSlideSeconds}s / slide</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { sec: 2.5, label: 'Veloce (2.5s)' },
                    { sec: 3.2, label: 'Standard (3.2s)' },
                    { sec: 4.5, label: 'Approfondito (4.5s)' },
                  ].map((d) => (
                    <button
                      key={d.sec}
                      type="button"
                      onClick={() => setConfig((prev) => ({ ...prev, durationPerSlideSeconds: d.sec }))}
                      className={`py-2 px-2 rounded-xl border text-[11px] font-bold text-center transition cursor-pointer ${
                        config.durationPerSlideSeconds === d.sec
                          ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. EFFETTI SECONDARI */}
              <div className="space-y-2.5 pt-1 border-t border-slate-800/80">
                <label className="flex items-center justify-between text-xs font-medium text-slate-300 cursor-pointer">
                  <span>Barra di Progresso Instagram (in alto)</span>
                  <input
                    type="checkbox"
                    checked={config.showProgressBar}
                    onChange={(e) => setConfig((prev) => ({ ...prev, showProgressBar: e.target.checked }))}
                    className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between text-xs font-medium text-slate-300 cursor-pointer">
                  <span>Micro-Zoom di lettura (Ken Burns)</span>
                  <input
                    type="checkbox"
                    checked={config.enableKenBurns}
                    onChange={(e) => setConfig((prev) => ({ ...prev, enableKenBurns: e.target.checked }))}
                    className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* RIEPILOGO DATI VIDEO */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 text-xs space-y-1.5 font-mono text-slate-400">
              <div className="flex justify-between">
                <span>Risoluzione Video:</span>
                <span className="text-white font-bold">1080 × 1350 px (4:5 Post)</span>
              </div>
              <div className="flex justify-between">
                <span>Durata Totale:</span>
                <span className="text-amber-400 font-bold">{formatTime(totalDurationSec)} ({Math.round(totalDurationSec)} sec)</span>
              </div>
              <div className="flex justify-between">
                <span>Framerate:</span>
                <span className="text-white font-bold">30 FPS Full HD</span>
              </div>
              <div className="flex justify-between">
                <span>Piattaforme ideali:</span>
                <span className="text-emerald-400 font-bold">Instagram Feed, LinkedIn, FB</span>
              </div>
            </div>

            {/* BOX ESPORTAZIONE */}
            <div className="space-y-3">
              {isRecording ? (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-300 flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{recordStatusText}</span>
                    </span>
                    <span className="font-mono font-bold text-amber-400">{recordProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-amber-500/20">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-200"
                      style={{ width: `${recordProgress}%` }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      abortRecordRef.current = true;
                    }}
                    className="text-[11px] text-rose-400 hover:text-rose-300 underline font-medium"
                  >
                    Annulla esportazione
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleExportVideo}
                  disabled={slideCanvases.length === 0 || isPreRendering}
                  className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 transition cursor-pointer disabled:opacity-40 disabled:pointer-events-none active:scale-98"
                >
                  <Download className="w-4 h-4" />
                  <span>Scarica Video Animato (1080×1350)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
