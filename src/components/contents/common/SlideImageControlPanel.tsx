import React, { useState, useRef } from 'react';
import {
  Upload,
  Trash2,
  RotateCcw,
  Sparkles,
  Check,
  X,
  Crosshair,
} from 'lucide-react';
import {
  proposeSmartLayout,
  proposeFocalPointFromCue,
  SmartLayoutProposal,
  FocalPointProposal,
} from '../../../services/imageSmartLayoutService';

export interface SlideImageParams {
  imageUrl?: string | null;
  imageFit?: 'cover' | 'contain';
  imagePositionX?: number;
  imagePositionY?: number;
  imageZoom?: number;
  imageOverlay?: number;
  imageFocalPoint?: { x: number; y: number } | null;
  textAlign?: 'left' | 'center' | 'right';
}

export interface SlideImageControlPanelProps {
  imageUrl?: string | null;
  imageFit?: 'cover' | 'contain';
  imagePositionX?: number;
  imagePositionY?: number;
  imageZoom?: number;
  imageOverlay?: number;
  imageFocalPoint?: { x: number; y: number } | null;
  visualCue?: string;
  textAlign?: 'left' | 'center' | 'right';
  headline?: string;
  onUpdateImageParams: (params: SlideImageParams) => void;
  presetSampleImage?: {
    label: string;
    url: string;
  };
  className?: string;
}

export const SlideImageControlPanel: React.FC<SlideImageControlPanelProps> = ({
  imageUrl,
  imageFit = 'cover',
  imagePositionX = 50,
  imagePositionY = 50,
  imageZoom = 1.0,
  imageOverlay = 0,
  imageFocalPoint,
  visualCue,
  textAlign = 'left',
  onUpdateImageParams,
  presetSampleImage,
  className = '',
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Modale di conferma proposta AI
  const [activeProposalModal, setActiveProposalModal] = useState<{
    type: 'smart_layout' | 'focal_point';
    layoutProposal?: SmartLayoutProposal;
    focalProposal?: FocalPointProposal;
  } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Seleziona un file immagine valido (JPEG, PNG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        onUpdateImageParams({
          imageUrl: event.target.result,
          imageFit: imageFit || 'cover',
          imagePositionX: imagePositionX ?? 50,
          imagePositionY: imagePositionY ?? 50,
          imageZoom: imageZoom || 1.0,
          imageOverlay: imageOverlay ?? 40,
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveImage = () => {
    onUpdateImageParams({
      imageUrl: null,
      imageFocalPoint: null,
    });
  };

  const handleResetPosition = () => {
    onUpdateImageParams({
      imagePositionX: 50,
      imagePositionY: 50,
      imageFocalPoint: { x: 50, y: 50 },
    });
  };

  // Apertura modale proposta Smart Layout
  const handleOpenSmartLayoutProposal = () => {
    const proposal = proposeSmartLayout(imagePositionX, imagePositionY, imageOverlay, visualCue);
    setActiveProposalModal({
      type: 'smart_layout',
      layoutProposal: proposal,
    });
  };

  // Apertura modale proposta Focal Point AI
  const handleOpenFocalPointProposal = () => {
    const proposal = proposeFocalPointFromCue(visualCue);
    setActiveProposalModal({
      type: 'focal_point',
      focalProposal: proposal,
    });
  };

  // Applicazione proposta dopo conferma utente
  const handleApplyProposal = () => {
    if (!activeProposalModal) return;

    if (activeProposalModal.type === 'smart_layout' && activeProposalModal.layoutProposal) {
      const p = activeProposalModal.layoutProposal;
      onUpdateImageParams({
        textAlign: p.suggestedTextAlign,
        imageOverlay: p.suggestedOverlay,
        imageFit: p.suggestedFit,
        imagePositionX: p.suggestedPositionX,
        imagePositionY: p.suggestedPositionY,
      });
    } else if (activeProposalModal.type === 'focal_point' && activeProposalModal.focalProposal) {
      const fp = activeProposalModal.focalProposal;
      onUpdateImageParams({
        imagePositionX: fp.x,
        imagePositionY: fp.y,
        imageFocalPoint: { x: fp.x, y: fp.y },
      });
    }

    setActiveProposalModal(null);
  };

  return (
    <div className={`space-y-4 rounded-2xl bg-slate-950/80 border border-slate-800/90 p-3.5 sm:p-4 text-xs ${className}`}>
      {/* ─── 1. BARRA PRINCIPALE: UPLOAD & ANTEPRIMA MINIATURA ─── */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          {imageUrl ? (
            <div className="relative group/thumb shrink-0">
              <img
                src={imageUrl}
                alt="Miniatura"
                className="w-11 h-11 rounded-xl object-cover border border-amber-500/40 shadow-md shadow-amber-500/10"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                title="Rimuovi immagine"
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow transition cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="w-11 h-11 rounded-xl border border-dashed border-slate-700 bg-slate-900/60 flex items-center justify-center text-slate-500 shrink-0">
              <Upload className="w-4 h-4 text-slate-500" />
            </div>
          )}

          <div className="min-w-0">
            <span className="font-bold text-slate-200 block truncate">
              {imageUrl ? 'Foto attiva' : 'Nessuna foto'}
            </span>
            <span className="text-[11px] text-slate-500 block truncate">
              {imageUrl
                ? imageFocalPoint
                  ? `Focus (${imageFocalPoint.x}%, ${imageFocalPoint.y}%) · Allineamento: ${textAlign}`
                  : `Posizione · Allineamento: ${textAlign}`
                : 'Aggiungi una foto alla slide'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {presetSampleImage && !imageUrl && (
            <button
              type="button"
              onClick={() =>
                onUpdateImageParams({
                  imageUrl: presetSampleImage.url,
                  imageOverlay: 45,
                  imageFit: 'cover',
                  imagePositionX: 50,
                  imagePositionY: 50,
                  imageZoom: 1.0,
                })
              }
              className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-bold transition cursor-pointer text-[11px] flex items-center gap-1.5"
              title="Carica immagine di prova ottimizzata"
            >
              <span>🏋️ {presetSampleImage.label}</span>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/jpg"
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 font-bold flex items-center gap-1.5 transition cursor-pointer text-xs"
          >
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            <span>{imageUrl ? 'Sostituisci' : 'Carica foto'}</span>
          </button>

          {imageUrl && (
            <button
              type="button"
              onClick={handleRemoveImage}
              className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold flex items-center gap-1 transition cursor-pointer text-xs"
              title="Elimina foto dalla slide"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Rimuovi</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── SEZIONE CUE VISIVO & PROPOSTE AI (SE C'È UN CUE) ─── */}
      {visualCue && (
        <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-800/40 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 min-w-0">
            <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="text-[11px] text-purple-200 truncate">
              <strong>Cue:</strong> {visualCue}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleOpenFocalPointProposal}
              className="px-2 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 font-bold text-[10px] flex items-center gap-1 transition cursor-pointer"
            >
              <Crosshair className="w-3 h-3" />
              <span>Usa punto focale AI</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── CONTROLLI AVANZATI QUANDO L'IMMAGINE È PRESENTE ─── */}
      {imageUrl && (
        <div className="space-y-3.5 pt-2 border-t border-slate-800/80">
          
          {/* A. PRESET POSIZIONE ORIZZONTALE & VERTICALE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Orizzontale */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
                <span>Posizione Orizzontale</span>
                <span className="font-mono text-amber-400">{imagePositionX}%</span>
              </div>
              <div className="grid grid-cols-3 gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
                {[
                  { label: '← Sinistra', val: 0 },
                  { label: 'Centro', val: 50 },
                  { label: 'Destra →', val: 100 },
                ].map((preset) => {
                  const isActive = Math.abs((imagePositionX ?? 50) - preset.val) <= 10;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => onUpdateImageParams({ imagePositionX: preset.val })}
                      className={`py-1 px-1.5 rounded-lg text-center font-bold text-[11px] transition cursor-pointer ${
                        isActive
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Verticale */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
                <span>Posizione Verticale</span>
                <span className="font-mono text-amber-400">{imagePositionY}%</span>
              </div>
              <div className="grid grid-cols-3 gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
                {[
                  { label: '↑ Alto', val: 0 },
                  { label: 'Centro', val: 50 },
                  { label: '↓ Basso', val: 100 },
                ].map((preset) => {
                  const isActive = Math.abs((imagePositionY ?? 50) - preset.val) <= 10;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => onUpdateImageParams({ imagePositionY: preset.val })}
                      className={`py-1 px-1.5 rounded-lg text-center font-bold text-[11px] transition cursor-pointer ${
                        isActive
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>



          {/* C. FIT (COVER / CONTAIN) & OVERLAY SCURO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Fit mode */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 block">Adattamento (Fit)</label>
              <div className="grid grid-cols-2 gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => onUpdateImageParams({ imageFit: 'cover' })}
                  className={`py-1.5 px-2 rounded-lg text-center font-bold text-[11px] transition cursor-pointer ${
                    imageFit === 'cover'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Cover (Riempi)
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateImageParams({ imageFit: 'contain' })}
                  className={`py-1.5 px-2 rounded-lg text-center font-bold text-[11px] transition cursor-pointer ${
                    imageFit === 'contain'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Contain (Intera)
                </button>
              </div>
            </div>

            {/* Overlay opacità scura */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-400">Overlay Scuro Contrasto</span>
                <span className="font-mono text-amber-400 font-bold">{imageOverlay ?? 0}%</span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="range"
                  min="0"
                  max="90"
                  step="5"
                  value={imageOverlay ?? 0}
                  onChange={(e) => onUpdateImageParams({ imageOverlay: parseInt(e.target.value, 10) })}
                  className="flex-1 accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* D. AZIONI RAPIDE: RESET POSIZIONE & ADATTA AUTOMATICAMENTE */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80 flex-wrap">
            <button
              type="button"
              onClick={handleResetPosition}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 font-bold flex items-center gap-1.5 transition cursor-pointer text-[11px]"
              title="Centra la posizione dell'immagine a 50%, 50%"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset posizione</span>
            </button>

            <button
              type="button"
              onClick={handleOpenSmartLayoutProposal}
              className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1.5 transition cursor-pointer text-[11px]"
              title="Calcola orientamento testo e overlay ottimale per il soggetto"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Adatta automaticamente</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── MODALE DI CONFERMA PROPOSTE AI (NON DISTRUTTIVO) ─── */}
      {activeProposalModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>
                  {activeProposalModal.type === 'smart_layout'
                    ? 'Proposta Layout Intelligente'
                    : 'Proposta Punto Focale AI'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setActiveProposalModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              {activeProposalModal.type === 'smart_layout' && activeProposalModal.layoutProposal && (
                <>
                  <p className="text-slate-300 font-medium">
                    {activeProposalModal.layoutProposal.explanation}
                  </p>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Allineamento Testo:</span>
                      <strong className="text-amber-300 uppercase">
                        {activeProposalModal.layoutProposal.suggestedTextAlign}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Overlay Scuro:</span>
                      <strong className="text-amber-300">
                        {activeProposalModal.layoutProposal.suggestedOverlay}%
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Modalità Fit:</span>
                      <strong className="text-amber-300">
                        {activeProposalModal.layoutProposal.suggestedFit}
                      </strong>
                    </div>
                  </div>
                </>
              )}

              {activeProposalModal.type === 'focal_point' && activeProposalModal.focalProposal && (
                <>
                  <p className="text-slate-300 font-medium">
                    Punto focale calcolato dal cue visivo:
                  </p>
                  <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-800/50 space-y-2 text-[11px]">
                    <div className="font-bold text-purple-200">
                      🎯 {activeProposalModal.focalProposal.label}
                    </div>
                    <div className="flex justify-between font-mono text-slate-400">
                      <span>Coordinate suggerite:</span>
                      <span className="text-amber-300">
                        X: {activeProposalModal.focalProposal.x}% · Y: {activeProposalModal.focalProposal.y}%
                      </span>
                    </div>
                  </div>
                </>
              )}

              <p className="text-[11px] text-slate-500 italic">
                Nessun file immagine verrà duplicato o alterato; verranno aggiornate unicamente le impostazioni di posizionamento della slide.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setActiveProposalModal(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleApplyProposal}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Conferma e Applica</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
