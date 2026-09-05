import React, { useState, useEffect, useRef } from 'react';
import { InstagramContent } from '../../../types/inboxAndContent';
import {
  InstagramCoverData,
  CoverTemplateId,
  CoverStatus,
} from '../../../types/cover';
import { generateDefaultCoverFromContent } from '../../../services/coverGeneratorService';
import {
  renderCoverToCanvas,
  REEL_WIDTH,
  REEL_HEIGHT,
  POST_WIDTH,
  POST_HEIGHT,
} from '../../../services/coverCanvasRenderer';
import { CoverColorBrandingSection } from './CoverColorBrandingSection';
import { useToast } from '../../../context/ToastContext';
import {
  X,
  Save,
  Download,
  Image as ImageIcon,
  Type,
  Maximize2,
  Shield,
  Crop,
} from 'lucide-react';

interface CoverStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: Partial<InstagramContent>;
  onSaveCover: (cover: InstagramCoverData) => void;
}

const TEMPLATE_OPTIONS: { id: CoverTemplateId; label: string; icon: string }[] = [
  { id: 'bold_editorial', label: 'Bold Editorial', icon: '🔥' },
  { id: 'scientific_breakdown', label: 'Scientific Breakdown', icon: '🧬' },
  { id: 'minimal_focus', label: 'Minimal Focus', icon: '🎯' },
  { id: 'badge_impact', label: 'Badge Impact', icon: '⚡' },
];

export const CoverStudioModal: React.FC<CoverStudioModalProps> = ({
  isOpen,
  onClose,
  content,
  onSaveCover,
}) => {
  const { showSuccess, showError } = useToast();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Inizializza stato copertina
  const [cover, setCover] = useState<InstagramCoverData>(() =>
    generateDefaultCoverFromContent(content)
  );

  const [previewMode, setPreviewMode] = useState<'full' | 'grid'>('full');
  const [showSafeArea, setShowSafeArea] = useState<boolean>(false);
  const [zoomScale, setZoomScale] = useState<'fit' | '75' | '100'>('fit');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Sincronizza stato se il contenuto esterno cambia
  useEffect(() => {
    if (isOpen) {
      setCover(generateDefaultCoverFromContent(content));
    }
  }, [isOpen, content]);

  // Renderizza il canvas live a ogni variazione
  useEffect(() => {
    if (!canvasRef.current || !isOpen) return;
    renderCoverToCanvas(canvasRef.current, cover, {
      previewMode,
      showSafeArea,
    });
  }, [cover, previewMode, showSafeArea, isOpen]);

  // Gestione caricamento file immagine
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showError('Seleziona un file immagine valido (JPG, PNG, WebP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setCover((prev) => ({
          ...prev,
          imageUrl: event.target?.result as string,
          updated_at: new Date().toISOString(),
        }));
        showSuccess('Foto caricata con successo nella copertina!');
      }
    };
    reader.readAsDataURL(file);
  };

  // Salva copertina
  const handleSave = () => {
    const updated = {
      ...cover,
      status: 'ready' as const,
      updated_at: new Date().toISOString(),
    };
    setCover(updated);
    onSaveCover(updated);
    showSuccess('Copertina Instagram salvata con successo!');
  };

  // Esporta PNG ad alta risoluzione
  const handleDownloadPng = async () => {
    setIsExporting(true);
    try {
      const exportCanvas = document.createElement('canvas');
      await renderCoverToCanvas(exportCanvas, cover, {
        previewMode: 'full',
        showSafeArea: false,
      });

      exportCanvas.toBlob((blob) => {
        if (!blob) throw new Error('Generazione blob fallita');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const formatLabel = cover.format === '9:16' ? '1080x1920_reel' : '1080x1350_post';
        a.download = `cover_${formatLabel}_${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showSuccess('File PNG ad alta risoluzione scaricato!');
      }, 'image/png');
    } catch (err) {
      console.error('Errore download:', err);
      showError('Impossibile scaricare la copertina in PNG');
    } finally {
      setIsExporting(false);
    }
  };

  // Scorciatoia Esc per chiudere
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isReel = cover.format === '9:16';
  const widthPx = isReel ? REEL_WIDTH : POST_WIDTH;
  const heightPx = isReel ? REEL_HEIGHT : POST_HEIGHT;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col overflow-hidden select-none animate-in fade-in duration-200">
      {/* ─── 1. TOP HEADER BAR ─── */}
      <header className="h-14 px-4 sm:px-6 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between shrink-0 gap-3 z-30">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            title="Chiudi Cover Studio (Esc)"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-black text-white truncate">
              Cover Studio • {content.title || 'Nuova Copertina'}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
              {isReel ? 'Reel 1080×1920 (9:16)' : 'Post 1080×1350 (4:5)'}
            </span>
          </div>
        </div>

        {/* CONTROLLI CENTRALI: SELETTORE TEMPLATE */}
        <div className="hidden lg:flex items-center gap-1.5 p-1 bg-slate-950/80 border border-slate-800 rounded-xl">
          {TEMPLATE_OPTIONS.map((tmpl) => (
            <button
              key={tmpl.id}
              type="button"
              onClick={() => setCover((prev) => ({ ...prev, templateId: tmpl.id }))}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                cover.templateId === tmpl.id
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span>{tmpl.icon}</span>
              <span>{tmpl.label}</span>
            </button>
          ))}
        </div>

        {/* AZIONI DESTRA: STATO, SALVA E DOWNLOAD */}
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={cover.status}
            onChange={(e) => setCover((prev) => ({ ...prev, status: e.target.value as CoverStatus }))}
            className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="draft">Bozza</option>
            <option value="ready">Pronta</option>
          </select>

          <button
            type="button"
            onClick={handleDownloadPng}
            disabled={isExporting}
            className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">{isExporting ? 'Esporto...' : 'Scarica PNG'}</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="py-1.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Salva Copertina</span>
          </button>
        </div>
      </header>

      {/* ─── 2. MAIN SPLIT WORKSPACE ─── */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
        
        {/* COLONNA SINISTRA: EDITOR PANNELLO CONTROLLI */}
        <div className="w-full md:w-[460px] lg:w-[500px] border-r border-slate-800 bg-slate-950 flex flex-col overflow-y-auto custom-scrollbar p-4 space-y-4 shrink-0">
          
          {/* SELETTORE TEMPLATE MOBILE */}
          <div className="lg:hidden space-y-1.5">
            <label className="text-xs font-bold text-slate-400">Template Grafico</label>
            <div className="grid grid-cols-2 gap-1.5">
              {TEMPLATE_OPTIONS.map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => setCover((prev) => ({ ...prev, templateId: tmpl.id }))}
                  className={`p-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    cover.templateId === tmpl.id
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}
                >
                  <span>{tmpl.icon}</span>
                  <span className="truncate">{tmpl.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* CARD 1: TESTI COPERTINA */}
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/90 space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-800">
              <Type className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-black text-white">Testi & Tipografia Cover</h3>
            </div>

            {/* BADGE CATEGORIA */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">
                Badge Categoria (Superiore)
              </label>
              <input
                type="text"
                value={cover.categoryBadge || ''}
                onChange={(e) => setCover((prev) => ({ ...prev, categoryBadge: e.target.value }))}
                placeholder="es. ■ GUIDA BIOMECCANICA"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* TITOLO RIGA 1 (BIANCO) */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">
                Titolo Slide (Riga 1 - Bianco) *
              </label>
              <input
                type="text"
                value={cover.headline || ''}
                onChange={(e) => setCover((prev) => ({ ...prev, headline: e.target.value }))}
                placeholder="es. SEI ALTO OLTRE 1,85 M?"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-black uppercase focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* TESTO EVIDENZIATO RIGA 2 (ORO ACCENTO) */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                <span>⚡ Testo Evidenziato / Riga 2 (Colore Accento)</span>
              </label>
              <input
                type="text"
                value={cover.headlineHighlight || ''}
                onChange={(e) => setCover((prev) => ({ ...prev, headlineHighlight: e.target.value }))}
                placeholder="es. SMETTI DI SQUATTARE COSÌ"
                className="w-full px-3 py-2 bg-slate-950 border border-amber-500/40 rounded-xl text-xs text-amber-400 font-black uppercase focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* SOTTOTITOLO / GANCIO */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">
                Sottotitolo / Gancio Secondario
              </label>
              <textarea
                rows={2}
                value={cover.subheadline || ''}
                onChange={(e) => setCover((prev) => ({ ...prev, subheadline: e.target.value }))}
                placeholder="es. Femori lunghi e busto inclinato: la correzione biomeccanica per stimolare i quadricipiti."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>

            {/* HANDLE AUTORE */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">
                Handle Autore / Branding (Inferiore)
              </label>
              <input
                type="text"
                value={cover.authorHandle || ''}
                onChange={(e) => setCover((prev) => ({ ...prev, authorHandle: e.target.value }))}
                placeholder="@antoniocrapanzano_coach"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* CARD: COLORI & BRANDING */}
          <CoverColorBrandingSection
            cover={cover}
            onChangeCover={setCover}
          />

          {/* CARD 2: IMMAGINE FOTOGRAFICA & LIVELLI */}
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/90 space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-black text-white">Sfondo & Immagine</h3>
              </div>

              {cover.imageUrl && (
                <button
                  type="button"
                  onClick={() => setCover((prev) => ({ ...prev, imageUrl: null }))}
                  className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                >
                  Rimuovi Foto
                </button>
              )}
            </div>

            {/* PULSANTI CARICA & PRESET */}
            <div className="flex items-center gap-2 flex-wrap">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                <span>{cover.imageUrl ? 'Sostituisci Foto' : 'Carica Foto'}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setCover((prev) => ({
                    ...prev,
                    imageUrl: '/assets/squat_tall_athlete_cover.jpg',
                    imageOpacity: 0.55,
                  }))
                }
                className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                title="Applica foto autentica squat atleti alti"
              >
                <span>🏋️ Foto Squat Leve</span>
              </button>
            </div>

            {/* CONTROLLI SLIDER IMMAGINE */}
            {cover.imageUrl && (
              <div className="space-y-2.5 pt-1">
                {/* OPACITÀ OVERLAY */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
                    <span>Opacità Sfondo Scuro</span>
                    <span className="font-mono text-amber-400">
                      {Math.round((cover.imageOpacity ?? 0.55) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="0.9"
                    step="0.05"
                    value={cover.imageOpacity ?? 0.55}
                    onChange={(e) =>
                      setCover((prev) => ({ ...prev, imageOpacity: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* ZOOM / SCALA */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
                    <span>Scala / Zoom Foto</span>
                    <span className="font-mono text-amber-400">
                      {Math.round((cover.imageScale ?? 1.0) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="2.2"
                    step="0.05"
                    value={cover.imageScale ?? 1.0}
                    onChange={(e) =>
                      setCover((prev) => ({ ...prev, imageScale: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* POSIZIONE VERTICALE */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
                    <span>Posizione Verticale (Offset Y)</span>
                    <span className="font-mono text-amber-400">
                      {cover.imagePosition?.y || 0}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-40"
                    max="40"
                    step="1"
                    value={cover.imagePosition?.y || 0}
                    onChange={(e) =>
                      setCover((prev) => ({
                        ...prev,
                        imagePosition: {
                          x: prev.imagePosition?.x || 0,
                          y: parseInt(e.target.value, 10),
                        },
                      }))
                    }
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* COLONNA DESTRA: ANTEPRIMA LIVE CANVAS & CONTROLLI */}
        <div className="flex-1 min-h-0 bg-slate-950/80 flex flex-col overflow-hidden relative">
          
          {/* TOOLBAR CONTROLLI PREVIEW */}
          <div className="h-12 px-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between shrink-0 gap-2 flex-wrap z-10">
            {/* TOGGLE PREVIEW MODE */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPreviewMode('full')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  previewMode === 'full'
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>{isReel ? 'Reel 9:16 Full' : 'Post 4:5 Full'}</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewMode('grid')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  previewMode === 'grid'
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
                title="Visualizza il crop 1:1 esatto con cui il contenuto appare nella griglia del profilo Instagram"
              >
                <Crop className="w-3.5 h-3.5" />
                <span>Griglia Profilo (1:1)</span>
              </button>
            </div>

            {/* TOGGLE SAFE AREA & ZOOM */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSafeArea((prev) => !prev)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                  showSafeArea
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Safe Area</span>
              </button>

              <div className="hidden sm:flex items-center gap-1 p-0.5 bg-slate-800 rounded-lg text-xs font-bold text-slate-300">
                <button
                  type="button"
                  onClick={() => setZoomScale('fit')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${zoomScale === 'fit' ? 'bg-amber-500 text-slate-950' : ''}`}
                >
                  Adatta
                </button>
                <button
                  type="button"
                  onClick={() => setZoomScale('75')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${zoomScale === '75' ? 'bg-amber-500 text-slate-950' : ''}`}
                >
                  75%
                </button>
                <button
                  type="button"
                  onClick={() => setZoomScale('100')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${zoomScale === '100' ? 'bg-amber-500 text-slate-950' : ''}`}
                >
                  100%
                </button>
              </div>
            </div>
          </div>

          {/* AREA CANVAS CENTRATA E RESPONSIVE */}
          <div className="flex-1 min-h-0 p-4 sm:p-6 flex items-center justify-center overflow-auto custom-scrollbar">
            <div
              className={`rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-800 bg-slate-950 transition-all duration-200 flex items-center justify-center ${
                zoomScale === '100'
                  ? isReel ? 'w-[420px] h-[746px]' : 'w-[480px] h-[600px]'
                  : zoomScale === '75'
                  ? isReel ? 'w-[360px] h-[640px]' : 'w-[420px] h-[525px]'
                  : isReel ? 'max-h-[82vh] aspect-[9/16]' : 'max-h-[80vh] aspect-[4/5]'
              }`}
            >
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain block select-none pointer-events-none"
              />
            </div>
          </div>

          {/* FOOTER ANTEPRIMA */}
          <div className="h-9 px-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono shrink-0">
            <span>Risoluzione: {widthPx}×{heightPx} px</span>
            <span>
              {previewMode === 'grid' ? '⏹️ Crop Feed 1:1 Attivo' : '📱 Vista Canvas Completa'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
