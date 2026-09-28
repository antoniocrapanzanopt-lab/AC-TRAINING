import React, {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
} from 'react';
import {
  Camera,
  SplitSquareHorizontal,
  Columns2,
  Upload,
  Trash2,
  ZoomIn,
  X,
  ArrowLeftRight,
  ImageOff,
  Plus,
  CalendarDays,
} from 'lucide-react';
import { useMetrics } from '../../context/MetricsContext';
import { useToast } from '../../context/ToastContext';
import { AthleteProgressPhoto } from '../../types/metrics';

// ─── Tipi interni ─────────────────────────────────────────────────────────────

type PoseFilter = 'front' | 'back' | 'side' | 'other';
type ViewMode = 'slider' | 'side-by-side';

interface BeforeAfterSectionProps {
  athleteId: string;
  isCoachView?: boolean;
}

// ─── Utilità ──────────────────────────────────────────────────────────────────

const POSE_LABELS: Record<PoseFilter, string> = {
  front: 'Frontale',
  back: 'Posteriore',
  side: 'Laterale',
  other: 'Altra',
};

const POSE_EMOJI: Record<PoseFilter, string> = {
  front: '🧍',
  back: '🔙',
  side: '👤',
  other: '📷',
};

function formatDateIT(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ─── Sub-componente: Slider Comparatore ───────────────────────────────────────

interface SliderComparatorProps {
  beforeUrl: string;
  afterUrl: string;
  beforeLabel: string;
  afterLabel: string;
}

const SliderComparator: React.FC<SliderComparatorProps> = ({
  beforeUrl,
  afterUrl,
  beforeLabel,
  afterLabel,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sliderPos, setSliderPos] = useState(50);
  const isDragging = useRef(false);

  const updateFromEvent = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    setSliderPos(pct);
  }, []);

  const onMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    updateFromEvent(e.clientX);
  };
  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    updateFromEvent(e.clientX);
  }, [updateFromEvent]);
  const onMouseUp = useCallback(() => { isDragging.current = false; }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    isDragging.current = true;
    updateFromEvent(e.touches[0].clientX);
  };
  const onTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging.current) return;
    updateFromEvent(e.touches[0].clientX);
  }, [updateFromEvent]);
  const onTouchEnd = useCallback(() => { isDragging.current = false; }, []);

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [onMouseMove, onMouseUp, onTouchMove, onTouchEnd]);

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none overflow-hidden rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl"
      style={{ aspectRatio: '3/4', cursor: 'col-resize' }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    >
      {/* Immagine DOPO (sfondo completo) */}
      <img
        src={afterUrl}
        alt="Dopo"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        draggable={false}
      />

      {/* Immagine PRIMA (clip dinamico a sinistra) */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{ width: `${sliderPos}%` }}
      >
        <img
          src={beforeUrl}
          alt="Prima"
          className="absolute inset-0 h-full object-cover"
          style={{ width: `${10000 / Math.max(sliderPos, 1)}%`, maxWidth: 'none' }}
          draggable={false}
        />
      </div>

      {/* Linea divisoria */}
      <div
        className="absolute inset-y-0 w-[3px] bg-amber-400 shadow-[0_0_12px_rgba(234,179,8,0.8)] pointer-events-none"
        style={{ left: `calc(${sliderPos}% - 1.5px)` }}
      />

      {/* Handle circolare */}
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-amber-400 border-2 border-white shadow-2xl flex items-center justify-center pointer-events-none z-10"
        style={{ left: `${sliderPos}%` }}
      >
        <ArrowLeftRight className="w-4 h-4 text-slate-950" strokeWidth={2.5} />
      </div>

      {/* Label PRIMA */}
      <div className="absolute top-3 left-3 pointer-events-none">
        <span className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-sm text-white text-[11px] font-black uppercase tracking-wider border border-white/20">
          Prima
        </span>
        <p className="text-[10px] text-white/70 mt-1 ml-0.5 font-medium">{beforeLabel}</p>
      </div>

      {/* Label DOPO */}
      <div className="absolute top-3 right-3 text-right pointer-events-none">
        <span className="px-2.5 py-1 rounded-full bg-amber-400/90 backdrop-blur-sm text-slate-950 text-[11px] font-black uppercase tracking-wider border border-amber-300/50">
          Dopo
        </span>
        <p className="text-[10px] text-white/70 mt-1 mr-0.5 font-medium">{afterLabel}</p>
      </div>

      {/* Hint drag */}
      <div className="absolute bottom-3 inset-x-0 flex justify-center pointer-events-none">
        <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white/60 text-[10px] font-medium">
          Trascina per confrontare
        </span>
      </div>
    </div>
  );
};

// ─── Sub-componente: Selettore Foto ───────────────────────────────────────────

interface PhotoPickerProps {
  label: 'Prima' | 'Dopo';
  photos: AthleteProgressPhoto[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const PhotoPicker: React.FC<PhotoPickerProps> = ({ label, photos, selectedId, onSelect }) => {
  const selectedPhoto = photos.find((p) => p.id === selectedId);

  return (
    <div className="space-y-2">
      <span
        className={`block text-[11px] font-black uppercase tracking-wider ${
          label === 'Prima' ? 'text-slate-400' : 'text-amber-400'
        }`}
      >
        {label === 'Prima' ? '⬅ ' : '➡ '}
        {label}
      </span>

      {selectedPhoto ? (
        <div className="relative rounded-xl overflow-hidden aspect-[3/4] border-2 border-amber-400/60 shadow-lg">
          <img src={selectedPhoto.image_url} alt={label} className="w-full h-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
            <p className="text-[10px] text-white font-bold">{formatDateIT(selectedPhoto.date)}</p>
          </div>
        </div>
      ) : (
        <div className="aspect-[3/4] rounded-xl border-2 border-dashed border-slate-700 bg-slate-900/50 flex flex-col items-center justify-center gap-2">
          <ImageOff className="w-8 h-8 text-slate-600" />
          <p className="text-[11px] text-slate-500 font-medium text-center px-2">Seleziona una foto</p>
        </div>
      )}

      {/* Griglia mini-selezione */}
      <div className="grid grid-cols-3 gap-1.5 max-h-[140px] overflow-y-auto">
        {photos.map((photo) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => onSelect(photo.id)}
            className={`relative rounded-lg overflow-hidden aspect-square border-2 transition-all cursor-pointer ${
              photo.id === selectedId
                ? 'border-amber-400 shadow-md shadow-amber-400/30 scale-[1.04]'
                : 'border-slate-700 hover:border-slate-500'
            }`}
          >
            <img src={photo.image_url} alt={formatDateIT(photo.date)} className="w-full h-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 bg-black/70 py-0.5 px-1">
              <p className="text-[8px] text-white font-bold truncate text-center">
                {new Date(photo.date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── Componente Principale ────────────────────────────────────────────────────

export const BeforeAfterSection: React.FC<BeforeAfterSectionProps> = ({
  athleteId,
  isCoachView = false,
}) => {
  const {
    getAthleteProgressPhotos,
    fetchAthleteProgressPhotos,
    addProgressPhoto,
    deleteProgressPhoto,
  } = useMetrics();
  const { showSuccess, showError } = useToast();

  const [poseFilter, setPoseFilter] = useState<PoseFilter>('front');
  const [viewMode, setViewMode] = useState<ViewMode>('slider');
  const [beforeId, setBeforeId] = useState<string | null>(null);
  const [afterId, setAfterId] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPose, setUploadPose] = useState<PoseFilter>('front');
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [photoDate, setPhotoDate] = useState(new Date().toISOString().slice(0, 10));
  const [photoNotes, setPhotoNotes] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Caricamento e sincronizzazione foto da Supabase e Realtime
  useEffect(() => {
    if (athleteId) {
      fetchAthleteProgressPhotos(athleteId);
    }
  }, [athleteId, fetchAthleteProgressPhotos]);

  const allPhotos = useMemo(
    () => getAthleteProgressPhotos(athleteId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [athleteId, getAthleteProgressPhotos]
  );

  const filteredPhotos = useMemo(
    () =>
      allPhotos
        .filter((p) => p.pose === poseFilter)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [allPhotos, poseFilter]
  );

  useEffect(() => {
    if (filteredPhotos.length >= 2) {
      setBeforeId(filteredPhotos[0].id);
      setAfterId(filteredPhotos[filteredPhotos.length - 1].id);
    } else if (filteredPhotos.length === 1) {
      setBeforeId(filteredPhotos[0].id);
      setAfterId(null);
    } else {
      setBeforeId(null);
      setAfterId(null);
    }
  }, [filteredPhotos]);

  const beforePhoto = filteredPhotos.find((p) => p.id === beforeId) ?? null;
  const afterPhoto = filteredPhotos.find((p) => p.id === afterId) ?? null;
  const canCompare = Boolean(beforePhoto && afterPhoto && beforeId !== afterId);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showError('Formato non supportato', 'Carica un file immagine (JPG, PNG, WEBP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showError('File troppo grande', 'Dimensione massima 10 MB.');
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPreviewUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!previewUrl) return;
    setIsUploading(true);
    try {
      await addProgressPhoto(
        {
          athlete_id: athleteId,
          date: photoDate,
          pose: uploadPose,
          image_url: previewUrl,
          notes: photoNotes || undefined,
        },
        selectedFile || undefined
      );
      showSuccess('Foto caricata', 'Foto aggiunta allo storico progressi.');
      setPreviewUrl(null);
      setSelectedFile(null);
      setPhotoNotes('');
      setShowUploadPanel(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch {
      showError('Errore', 'Impossibile salvare la foto.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!window.confirm('Eliminare questa foto?')) return;
    await deleteProgressPhoto(photoId);
    showSuccess('Foto eliminata', '');
  };

  return (
    <div className="space-y-5">
      {/* ── Intestazione ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
            <Camera className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white tracking-tight">Prima &amp; Dopo</h3>
            <p className="text-[10px] text-slate-400 font-medium">{allPhotos.length} foto nello storico</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowUploadPanel((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 hover:bg-purple-500/25 text-xs font-bold transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Aggiungi foto
        </button>
      </div>

      {/* ── Pannello Upload ── */}
      {showUploadPanel && (
        <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-4 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-purple-400 uppercase tracking-wider flex items-center gap-2">
              <Upload className="w-3.5 h-3.5" />
              Carica nuova foto
            </h4>
            <button
              type="button"
              onClick={() => { setShowUploadPanel(false); setPreviewUrl(null); setSelectedFile(null); }}
              className="p-1 text-slate-500 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <CalendarDays className="w-3 h-3" /> Data foto
              </label>
              <input
                type="date"
                value={photoDate}
                onChange={(e) => setPhotoDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-medium focus:outline-none focus:border-purple-500 cursor-pointer"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Posa</label>
              <select
                value={uploadPose}
                onChange={(e) => setUploadPose(e.target.value as PoseFilter)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-medium focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                {(Object.keys(POSE_LABELS) as PoseFilter[]).map((pose) => (
                  <option key={pose} value={pose}>
                    {POSE_EMOJI[pose]} {POSE_LABELS[pose]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Note (opzionali)</label>
            <input
              type="text"
              value={photoNotes}
              onChange={(e) => setPhotoNotes(e.target.value)}
              placeholder="es. dopo 4 settimane bulk..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-medium focus:outline-none focus:border-purple-500 placeholder:text-slate-600"
            />
          </div>

          <div>
            {previewUrl ? (
              <div className="relative">
                <img src={previewUrl} alt="Anteprima" className="w-full max-h-48 object-contain rounded-xl border border-slate-700" />
                <button
                  type="button"
                  onClick={() => { setPreviewUrl(null); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 flex items-center justify-center text-white hover:bg-red-500/80 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-8 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center gap-2 text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-all cursor-pointer"
              >
                <Upload className="w-6 h-6" />
                <span className="text-xs font-bold">Clicca per selezionare un'immagine</span>
                <span className="text-[10px]">JPG, PNG, WEBP — Max 10 MB</span>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </div>

          <button
            type="button"
            onClick={handleUpload}
            disabled={!previewUrl || isUploading}
            className="w-full py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs transition-all cursor-pointer shadow-lg shadow-purple-500/20"
          >
            {isUploading ? 'Salvataggio...' : 'Salva Foto'}
          </button>
        </div>
      )}

      {/* ── Filtro posa ── */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {(Object.keys(POSE_LABELS) as PoseFilter[]).map((pose) => {
          const count = allPhotos.filter((p) => p.pose === pose).length;
          return (
            <button
              key={pose}
              type="button"
              onClick={() => setPoseFilter(pose)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border ${
                poseFilter === pose
                  ? 'bg-[var(--color-primary)] text-slate-950 border-[var(--color-primary)] shadow-md'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-600 hover:text-white'
              }`}
            >
              <span>{POSE_EMOJI[pose]}</span>
              <span>{POSE_LABELS[pose]}</span>
              {count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                    poseFilter === pose ? 'bg-slate-950/30 text-slate-950' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Nessuna foto ── */}
      {filteredPhotos.length === 0 && (
        <div className="py-12 flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center">
            <ImageOff className="w-6 h-6 text-slate-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400">Nessuna foto {POSE_LABELS[poseFilter].toLowerCase()}</p>
            <p className="text-xs text-slate-600 mt-0.5">Aggiungi la prima foto per iniziare il confronto</p>
          </div>
          <button
            type="button"
            onClick={() => { setUploadPose(poseFilter); setShowUploadPanel(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 hover:bg-purple-500/25 text-xs font-bold transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Aggiungi foto {POSE_LABELS[poseFilter].toLowerCase()}
          </button>
        </div>
      )}

      {/* ── Una sola foto ── */}
      {filteredPhotos.length === 1 && (
        <div className="space-y-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-400 font-medium flex items-center gap-2">
            <Camera className="w-4 h-4 shrink-0" />
            Carica almeno 2 foto per attivare il confronto Prima &amp; Dopo.
          </div>
          <div className="relative rounded-2xl overflow-hidden aspect-[3/4] max-w-[220px] mx-auto border border-slate-700 shadow-xl">
            <img src={filteredPhotos[0].image_url} alt="Foto singola" className="w-full h-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3">
              <p className="text-[11px] text-amber-400 font-black uppercase">{POSE_LABELS[filteredPhotos[0].pose as PoseFilter]}</p>
              <p className="text-[10px] text-white/70">{formatDateIT(filteredPhotos[0].date)}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Confronto (>=2 foto) ── */}
      {filteredPhotos.length >= 2 && (
        <div className="space-y-4">
          {/* Switch modalità */}
          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 w-fit">
            <button
              type="button"
              onClick={() => setViewMode('slider')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'slider' ? 'bg-[var(--color-primary)] text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <SplitSquareHorizontal className="w-3.5 h-3.5" />
              Slider
            </button>
            <button
              type="button"
              onClick={() => setViewMode('side-by-side')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'side-by-side' ? 'bg-[var(--color-primary)] text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Columns2 className="w-3.5 h-3.5" />
              Affiancato
            </button>
          </div>

          {/* Modalità Slider */}
          {viewMode === 'slider' && (
            <div className="space-y-4">
              {canCompare ? (
                <SliderComparator
                  beforeUrl={beforePhoto!.image_url}
                  afterUrl={afterPhoto!.image_url}
                  beforeLabel={formatDateIT(beforePhoto!.date)}
                  afterLabel={formatDateIT(afterPhoto!.date)}
                />
              ) : (
                <div className="py-8 flex flex-col items-center gap-2 text-center">
                  <ArrowLeftRight className="w-8 h-8 text-slate-600" />
                  <p className="text-xs text-slate-400 font-medium">Seleziona due foto diverse per confrontarle</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <PhotoPicker label="Prima" photos={filteredPhotos} selectedId={beforeId} onSelect={setBeforeId} />
                <PhotoPicker label="Dopo" photos={filteredPhotos} selectedId={afterId} onSelect={setAfterId} />
              </div>
            </div>
          )}

          {/* Modalità Affiancata */}
          {viewMode === 'side-by-side' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <PhotoPicker label="Prima" photos={filteredPhotos} selectedId={beforeId} onSelect={setBeforeId} />
                <PhotoPicker label="Dopo" photos={filteredPhotos} selectedId={afterId} onSelect={setAfterId} />
              </div>

              {canCompare && (
                <div className="grid grid-cols-2 gap-3">
                  {[beforePhoto!, afterPhoto!].map((photo, idx) => (
                    <div
                      key={photo.id}
                      className="relative rounded-2xl overflow-hidden border border-slate-700 shadow-lg"
                      style={{ aspectRatio: '3/4' }}
                    >
                      <img src={photo.image_url} alt={idx === 0 ? 'Prima' : 'Dopo'} className="w-full h-full object-cover" />
                      <div
                        className={`absolute top-2 left-2 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          idx === 0
                            ? 'bg-black/70 text-white border-white/20'
                            : 'bg-amber-400/90 text-slate-950 border-amber-300/50'
                        }`}
                      >
                        {idx === 0 ? 'Prima' : 'Dopo'}
                      </div>
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2">
                        <p className="text-[10px] text-white font-bold">{formatDateIT(photo.date)}</p>
                        {photo.notes && <p className="text-[9px] text-white/60 line-clamp-1">{photo.notes}</p>}
                      </div>
                      <div className="absolute top-2 right-2 flex gap-1">
                        <button
                          type="button"
                          onClick={() => setLightboxUrl(photo.image_url)}
                          className="w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/90 transition-colors cursor-pointer"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                        {isCoachView && (
                          <button
                            type="button"
                            onClick={() => handleDeletePhoto(photo.id)}
                            className="w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-red-500/80 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Galleria completa (solo coach) ── */}
      {isCoachView && allPhotos.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-t border-slate-800 pt-4">
            <Camera className="w-3.5 h-3.5 text-slate-500" />
            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
              Tutte le foto — {allPhotos.length} totali
            </h4>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {[...allPhotos]
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((photo) => (
                <div
                  key={photo.id}
                  className="relative rounded-xl overflow-hidden border border-slate-800 group"
                  style={{ aspectRatio: '3/4' }}
                >
                  <img src={photo.image_url} alt={POSE_LABELS[photo.pose as PoseFilter]} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setLightboxUrl(photo.image_url)}
                      className="p-2 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors cursor-pointer"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    {isCoachView && (
                      <button
                        type="button"
                        onClick={() => handleDeletePhoto(photo.id)}
                        className="p-2 rounded-full bg-red-500/30 hover:bg-red-500/60 text-white transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                    <p className="text-[9px] text-amber-400 font-black truncate">
                      {POSE_EMOJI[photo.pose as PoseFilter]} {POSE_LABELS[photo.pose as PoseFilter]}
                    </p>
                    <p className="text-[8px] text-white/60 truncate">
                      {new Date(photo.date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── Lightbox ── */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer z-10"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={lightboxUrl}
            alt="Anteprima ingrandita"
            className="max-w-full max-h-[90vh] rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};
