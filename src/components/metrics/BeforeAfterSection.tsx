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
  ArrowLeft,
  ArrowRight,
  ImageOff,
  Plus,
  CalendarDays,
  ScanSearch,
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

// ─── FaceDetector API (Chrome sperimentale, zero librerie esterne) ────────────
interface FaceDetectorBBox {
  top: number; left: number; width: number; height: number;
}
interface DetectedFace { boundingBox: FaceDetectorBBox; }
interface FaceDetectorAPI {
  detect(img: HTMLImageElement): Promise<DetectedFace[]>;
}
declare global {
  interface Window {
    FaceDetector?: new (opts?: { maxDetectedFaces?: number; fastMode?: boolean }) => FaceDetectorAPI;
  }
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
  try {
    return new Date(dateStr).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatFullDateIT(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function getDaysDiff(date1: string, date2: string): number {
  try {
    const t1 = new Date(date1).getTime();
    const t2 = new Date(date2).getTime();
    return Math.round(Math.abs(t2 - t1) / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
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
      className="relative w-full select-none overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xl"
      style={{ aspectRatio: '3/4', cursor: 'col-resize' }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    >
      {/* Immagine DOPO (sfondo completo) */}
      <img
        src={afterUrl}
        alt="Dopo"
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
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
          className="absolute inset-0 h-full object-contain"
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

// ─── Componente Principale ────────────────────────────────────────────────────

export const BeforeAfterSection: React.FC<BeforeAfterSectionProps> = ({
  athleteId,
  isCoachView = false,
}) => {
  const {
    getAthleteProgressPhotos,
    fetchAthleteProgressPhotos,
    addProgressPhoto,
    updateProgressPhoto,
    deleteProgressPhoto,
  } = useMetrics();
  const { showSuccess, showError } = useToast();

  type SlotPose = 'front' | 'back' | 'side';

  interface CheckinSession {
    date: string;
    formattedDate: string;
    notes?: string | null;
    photos: Partial<Record<SlotPose | 'other', AthleteProgressPhoto>>;
    list: AthleteProgressPhoto[];
  }

  const [selectedBeforeDate, setSelectedBeforeDate] = useState<string | null>(null);
  const [selectedAfterDate, setSelectedAfterDate] = useState<string | null>(null);
  const [selectedPose, setSelectedPose] = useState<SlotPose>('front');
  const [viewMode, setViewMode] = useState<ViewMode>('side-by-side');

  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [photoDate, setPhotoDate] = useState(new Date().toISOString().slice(0, 10));
  const [photoNotes, setPhotoNotes] = useState('');

  // Stato per i 3 slot di upload simultaneo (front / back / side)
  type UploadSlot = { file: File | null; previewUrl: string | null };
  const [slots, setSlots] = useState<Record<SlotPose, UploadSlot>>({
    front: { file: null, previewUrl: null },
    back:  { file: null, previewUrl: null },
    side:  { file: null, previewUrl: null },
  });
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef  = useRef<HTMLInputElement>(null);
  const sideInputRef  = useRef<HTMLInputElement>(null);
  const slotRefs: Record<SlotPose, React.RefObject<HTMLInputElement>> = {
    front: frontInputRef,
    back:  backInputRef,
    side:  sideInputRef,
  };

  // ── Normalizzazione automatica foto ──────────────────────────────────────────
  const [normalizing, setNormalizing] = useState<{
    pose: SlotPose;
    url: string;
    file: File | null;
    existingPhotoId?: string;
  } | null>(null);
  const [normZoom, setNormZoom] = useState(100);      // 60–300
  const [normOffsetY, setNormOffsetY] = useState(0);  // -100 → +100
  const [isAutoAligning, setIsAutoAligning] = useState(false);
  const [isSavingNorm, setIsSavingNorm] = useState(false);
  const normCanvasRef = useRef<HTMLCanvasElement>(null);

  // Caricamento e sincronizzazione foto da Supabase e Realtime
  useEffect(() => {
    if (athleteId) {
      fetchAthleteProgressPhotos(athleteId);
    }
  }, [athleteId, fetchAthleteProgressPhotos]);

  const allPhotos = useMemo(
    () => getAthleteProgressPhotos(athleteId),
    [athleteId, getAthleteProgressPhotos]
  );

  // Raggruppamento per sessioni / check-in per data
  const checkinSessions = useMemo((): CheckinSession[] => {
    const map = new Map<string, CheckinSession>();
    for (const photo of allPhotos) {
      const d = photo.date;
      if (!map.has(d)) {
        map.set(d, {
          date: d,
          formattedDate: formatDateIT(d),
          notes: photo.notes,
          photos: {},
          list: [],
        });
      }
      const sess = map.get(d)!;
      if (!sess.notes && photo.notes) sess.notes = photo.notes;
      sess.list.push(photo);
      const poseKey = (['front', 'back', 'side', 'other'].includes(photo.pose)
        ? photo.pose
        : 'front') as SlotPose | 'other';
      if (!sess.photos[poseKey]) {
        sess.photos[poseKey] = photo;
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [allPhotos]);

  // Sincronizza selezione date di partenza ("Prima") e controllo ("Dopo")
  useEffect(() => {
    if (checkinSessions.length >= 2) {
      if (!selectedBeforeDate || !checkinSessions.some((s) => s.date === selectedBeforeDate)) {
        setSelectedBeforeDate(checkinSessions[checkinSessions.length - 1].date);
      }
      if (!selectedAfterDate || !checkinSessions.some((s) => s.date === selectedAfterDate)) {
        setSelectedAfterDate(checkinSessions[0].date);
      }
    } else if (checkinSessions.length === 1) {
      if (!selectedBeforeDate) setSelectedBeforeDate(checkinSessions[0].date);
      setSelectedAfterDate(null);
    } else {
      setSelectedBeforeDate(null);
      setSelectedAfterDate(null);
    }
  }, [checkinSessions, selectedBeforeDate, selectedAfterDate]);

  const beforeSession = checkinSessions.find((s) => s.date === selectedBeforeDate) || null;
  const afterSession = checkinSessions.find((s) => s.date === selectedAfterDate) || null;

  const beforePhoto = beforeSession?.photos[selectedPose] ?? null;
  const afterPhoto = afterSession?.photos[selectedPose] ?? null;
  const canCompare = Boolean(
    beforePhoto &&
    afterPhoto &&
    (selectedBeforeDate !== selectedAfterDate || beforePhoto.id !== afterPhoto.id)
  );

  const handleSlotFileChange = (pose: SlotPose) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showError('Formato non supportato', 'Carica un file immagine (JPG, PNG, WEBP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showError('File troppo grande', 'Dimensione massima 10 MB.');
      return;
    }
    // Apri tool di normalizzazione invece di caricare direttamente
    const reader = new FileReader();
    reader.onload = (ev) => {
      setNormZoom(100);
      setNormOffsetY(0);
      setNormalizing({ pose, url: ev.target?.result as string, file, existingPhotoId: undefined });
    };
    reader.readAsDataURL(file);
  };

  // Apri normalizzazione su foto GIÀ caricata
  const handleEditExistingPhoto = (photo: AthleteProgressPhoto) => {
    const pose = (['front', 'back', 'side'] as SlotPose[]).includes(photo.pose as SlotPose)
      ? (photo.pose as SlotPose)
      : 'front';
    setNormZoom(100);
    setNormOffsetY(0);
    setNormalizing({ pose, url: photo.image_url, file: null, existingPhotoId: photo.id });
    // Chiudi pannello upload se aperto per non confondere la UI
    setShowUploadPanel(false);
  };

  // Auto-allinea con FaceDetector API (Chrome) o stima euristica
  const handleAutoAlign = async () => {
    if (!normalizing) return;
    setIsAutoAligning(true);
    try {
      const img = new Image();
      img.src = normalizing.url;
      await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; });

      if (window.FaceDetector) {
        const detector = new window.FaceDetector({ maxDetectedFaces: 1, fastMode: true });
        const faces = await detector.detect(img);
        if (faces.length > 0) {
          const face = faces[0].boundingBox;
          // Vogliamo: faccia occupa ~18% altezza output, testa a ~8% dall'alto
          // Output: 600×800. face.height in px naturali dell'img.
          const imgH = img.naturalHeight;
          // Zoom per far sì che la faccia sia alta ~18% di 800 = 144px
          const targetFaceH = 0.18 * 800;
          // scaleFactor = imgH / 800 (da naturale a output)
          const baseScale = 800 / imgH;
          const faceHInOutput = face.height * baseScale;
          const zoomFactor = targetFaceH / faceHInOutput;
          const clampedZoom = Math.min(300, Math.max(60, Math.round(zoomFactor * 100)));
          setNormZoom(clampedZoom);
          // Offset verticale: la testa (face.top) deve stare all'8% di 800 = 64px
          // Con zoom applicato, la posizione della testa in output = face.top * baseScale * zoomFactor
          // Il canvas è centrato, drawY = (800 - imgH * baseScale * zoomFactor) / 2
          // facePxInOutput = drawY + face.top * baseScale * zoomFactor
          // vogliamo facePxInOutput = 64
          // drawY = (800 - 800 * zoomFactor) / 2
          const finalZoom = clampedZoom / 100;
          const drawY = (800 - 800 * finalZoom) / 2;
          const facePxNatural = face.top * baseScale * finalZoom;
          const currentFaceTopInOutput = drawY + facePxNatural;
          const desiredFaceTop = 64;
          // offsetY in slider units: -100..+100 maps to -(imgH*0.3)..(imgH*0.3) in natural px
          // sliderToNatural: val => (val / 100) * imgH * 0.3 * baseScale * finalZoom in output px
          const offsetPx = desiredFaceTop - currentFaceTopInOutput; // negative = move up
          const sliderRange = imgH * 0.3 * baseScale * finalZoom;
          const sliderVal = sliderRange > 0 ? Math.round((offsetPx / sliderRange) * -100) : 0;
          setNormOffsetY(Math.min(100, Math.max(-100, sliderVal)));
          // Also fix horizontal: center the face
          // (for now we only do vertical, horizontal is always centered)
          return;
        }
      }
      // Fallback euristico: assumi soggetto a tutta altezza, zoom 100, centra
      // Applica solo uno zoom leggero per inquadrare meglio
      const aspect = img.naturalWidth / img.naturalHeight;
      if (aspect > 0.9) {
        // Foto orizzontale/quadrata: zoom in per avere un 3:4
        setNormZoom(130);
        setNormOffsetY(-10);
      } else {
        setNormZoom(100);
        setNormOffsetY(-5);
      }
    } catch {
      showError('Auto-allineamento', 'Impossibile rilevare il volto. Regola manualmente con i cursori.');
    } finally {
      setIsAutoAligning(false);
    }
  };

  // Rendering su canvas e conferma slot
  const handleNormalizeConfirm = () => {
    if (!normalizing || !normCanvasRef.current) return;
    const canvas = normCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.crossOrigin = 'anonymous'; // necessario per URL Supabase
    img.onload = async () => {
      const W = 600; const H = 800;
      canvas.width = W; canvas.height = H;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, W, H);
      const imgAspect = img.naturalWidth / img.naturalHeight;
      const targetAspect = W / H;
      let baseW: number, baseH: number;
      if (imgAspect > targetAspect) {
        baseH = H; baseW = H * imgAspect;
      } else {
        baseW = W; baseH = W / imgAspect;
      }
      const zoom = normZoom / 100;
      const scaledW = baseW * zoom;
      const scaledH = baseH * zoom;
      const offsetPxY = (normOffsetY / 100) * (scaledH * 0.35);
      const drawX = (W - scaledW) / 2;
      const drawY = (H - scaledH) / 2 - offsetPxY;
      ctx.drawImage(img, drawX, drawY, scaledW, scaledH);
      const normalized = canvas.toDataURL('image/jpeg', 0.88);

      if (normalizing.existingPhotoId) {
        // Aggiorna foto già esistente in Supabase
        setIsSavingNorm(true);
        try {
          await updateProgressPhoto(normalizing.existingPhotoId, normalized, normalizing.pose);
          showSuccess('Foto aggiornata', 'Inquadratura normalizzata e salvata.');
        } catch {
          showError('Errore', 'Impossibile aggiornare la foto.');
        } finally {
          setIsSavingNorm(false);
        }
      } else {
        // Nuova foto: converti in File normalizzato e deposita nello slot
        let normFile: File | null = normalizing.file;
        try {
          const res = await fetch(normalized);
          const blob = await res.blob();
          normFile = new File([blob], `${normalizing.pose}_${Date.now()}.jpg`, { type: 'image/jpeg' });
        } catch {
          // fallback al file originale
        }
        setSlots((prev) => ({ ...prev, [normalizing.pose]: { file: normFile, previewUrl: normalized } }));
      }
      setNormalizing(null);
    };
    img.src = normalizing.url;
  };

  const clearSlot = (pose: SlotPose) => {
    setSlots((prev) => ({ ...prev, [pose]: { file: null, previewUrl: null } }));
    const ref = slotRefs[pose];
    if (ref.current) ref.current.value = '';
  };

  const openSlotPicker = (pose: SlotPose) => {
    slotRefs[pose].current?.click();
  };

  const hasAnySlotSelected = Object.values(slots).some((s) => s.file !== null);

  const handleUploadAll = async () => {
    const posesToUpload = (Object.entries(slots) as [SlotPose, UploadSlot][]).filter(
      ([, s]) => s.file !== null && s.previewUrl !== null
    );
    if (posesToUpload.length === 0) return;
    setIsUploading(true);
    let successCount = 0;
    try {
      for (const [pose, slot] of posesToUpload) {
        await addProgressPhoto(
          {
            athlete_id: athleteId,
            date: photoDate,
            pose,
            image_url: slot.previewUrl!,
            notes: photoNotes || undefined,
          },
          slot.file ?? undefined
        );
        successCount++;
      }
      showSuccess(
        successCount === 1 ? 'Foto caricata' : `${successCount} foto caricate`,
        'Aggiunte allo storico progressi.'
      );
      setSlots({ front: { file: null, previewUrl: null }, back: { file: null, previewUrl: null }, side: { file: null, previewUrl: null } });
      setPhotoNotes('');
      setShowUploadPanel(false);
    } catch {
      showError('Errore', 'Impossibile salvare una o più foto.');
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
            <Camera className="w-4 h-4 text-purple-500 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">Prima &amp; Dopo</h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{checkinSessions.length} {checkinSessions.length === 1 ? 'Check-in' : 'Check-in'} ({allPhotos.length} foto)</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowUploadPanel((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/25 text-xs font-bold transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Aggiungi foto
        </button>
      </div>

      {/* ── Pannello Upload Multi-foto ── */}
      {showUploadPanel && (
        <div className="bg-white dark:bg-slate-900 border border-purple-500/30 rounded-2xl p-4 space-y-4 shadow-xl">
          {/* Intestazione */}
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-2">
              <Upload className="w-3.5 h-3.5" />
              Carica foto
            </h4>
            <button
              type="button"
              onClick={() => {
                setShowUploadPanel(false);
                setSlots({ front: { file: null, previewUrl: null }, back: { file: null, previewUrl: null }, side: { file: null, previewUrl: null } });
              }}
              className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Data e Note condivise */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <CalendarDays className="w-3 h-3" /> Data foto
              </label>
              <input
                type="date"
                value={photoDate}
                onChange={(e) => setPhotoDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-purple-500 cursor-pointer"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Note (opzionali)</label>
              <input
                type="text"
                value={photoNotes}
                onChange={(e) => setPhotoNotes(e.target.value)}
                placeholder="es. dopo 4 sett. bulk..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-purple-500 placeholder:text-slate-400 dark:placeholder:text-slate-600"
              />
            </div>
          </div>

          {/* ── Modale normalizzazione (appare dopo selezione file) ── */}
          {normalizing && (
            <div className="space-y-3 bg-slate-950 border border-purple-500/50 rounded-2xl p-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-purple-400 uppercase tracking-wider">
                  ✨ Normalizza inquadratura
                </p>
                <button
                  type="button"
                  onClick={() => setNormalizing(null)}
                  className="p-1 text-slate-500 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Preview live con silhouette sovrapposta */}
              <div className="relative rounded-xl overflow-hidden mx-auto" style={{ aspectRatio: '3/4', maxWidth: 180 }}>
                {/* Foto soggetta a transform */}
                <img
                  src={normalizing.url}
                  alt="Anteprima"
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{
                    transform: `scale(${normZoom / 100}) translateY(${normOffsetY * -0.35}%)`,
                    transformOrigin: 'center center',
                  }}
                />
                {/* Silhouette guida sovrapposta */}
                <svg viewBox="0 0 100 200" className="absolute inset-0 w-full h-full pointer-events-none opacity-30" fill="none">
                  <ellipse cx="50" cy="22" rx="13" ry="15" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
                  <rect x="44" y="35" width="12" height="10" rx="4" fill="none" stroke="#f59e0b" strokeWidth="1" />
                  <path d="M25 45 Q50 42 75 45 L72 110 Q50 115 28 110 Z" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
                  <path d="M25 47 Q15 60 18 95 Q22 100 26 95 Q24 65 30 50 Z" fill="none" stroke="#f59e0b" strokeWidth="1" />
                  <path d="M75 47 Q85 60 82 95 Q78 100 74 95 Q76 65 70 50 Z" fill="none" stroke="#f59e0b" strokeWidth="1" />
                  <path d="M28 110 Q26 150 30 190 Q38 194 44 190 Q42 150 42 110 Z" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
                  <path d="M72 110 Q74 150 70 190 Q62 194 56 190 Q58 150 58 110 Z" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
                  <line x1="2" y1="8" x2="98" y2="8" stroke="#f59e0b" strokeWidth="0.8" strokeDasharray="3 2" />
                  <line x1="2" y1="192" x2="98" y2="192" stroke="#f59e0b" strokeWidth="0.8" strokeDasharray="3 2" />
                  <line x1="50" y1="0" x2="50" y2="200" stroke="rgba(251,191,36,0.3)" strokeWidth="0.6" strokeDasharray="2 3" />
                </svg>
                {/* Badge posa */}
                <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full bg-purple-500/80 text-white text-[9px] font-black uppercase">
                  {normalizing.pose === 'front' ? 'Frontale' : normalizing.pose === 'back' ? 'Posteriore' : 'Laterale'}
                </div>
              </div>

              {/* Bottone auto-allinea */}
              <button
                type="button"
                onClick={handleAutoAlign}
                disabled={isAutoAligning}
                className="w-full py-2 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[11px] font-black hover:bg-purple-500/30 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isAutoAligning ? 'Analisi in corso...' : '🤖 Auto-allinea'}
              </button>

              {/* Slider zoom e posizione */}
              <div className="space-y-2">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Zoom</span>
                    <span className="text-[10px] text-purple-400 font-black">{normZoom}%</span>
                  </div>
                  <input
                    type="range" min={60} max={300} value={normZoom}
                    onChange={(e) => setNormZoom(Number(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none bg-slate-700 accent-purple-500 cursor-pointer"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Posizione verticale</span>
                    <span className="text-[10px] text-purple-400 font-black">{normOffsetY > 0 ? '↑' : normOffsetY < 0 ? '↓' : '•'} {Math.abs(normOffsetY)}%</span>
                  </div>
                  <input
                    type="range" min={-100} max={100} value={normOffsetY}
                    onChange={(e) => setNormOffsetY(Number(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none bg-slate-700 accent-purple-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Azioni */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNormalizing(null)}
                  className="py-2 rounded-xl border border-slate-700 text-slate-400 text-[11px] font-bold hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={handleNormalizeConfirm}
                  disabled={isSavingNorm}
                  className="py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-white text-[11px] font-black transition-all cursor-pointer shadow-lg shadow-purple-500/20"
                >
                  ✔ {isSavingNorm ? 'Salvataggio...' : normalizing?.existingPhotoId ? 'Salva su Supabase' : 'Conferma'}
                </button>
              </div>
            </div>
          )}

          {/* Tre slot di upload affiancati */}
          <div className="grid grid-cols-3 gap-2">
            {(['front', 'back', 'side'] as SlotPose[]).map((pose) => {
              const slot = slots[pose];
              const label = pose === 'front' ? 'Frontale' : pose === 'back' ? 'Posteriore' : 'Laterale';
              const emoji = pose === 'front' ? '🧍' : pose === 'back' ? '🔙' : '👤';
              return (
                <div key={pose} className="space-y-1.5">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">
                    {emoji} {label}
                  </p>
                  {slot.previewUrl ? (
                    <div className="relative rounded-xl overflow-hidden border border-purple-500/40" style={{ aspectRatio: '3/4' }}>
                      <img src={slot.previewUrl} alt={label} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => clearSlot(pose)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center text-white hover:bg-red-500/80 transition-colors cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); openSlotPicker(pose); }}
                      style={{ aspectRatio: '3/4' }}
                      className="relative w-full border-2 border-dashed border-slate-700 rounded-xl overflow-hidden flex flex-col items-center justify-center text-slate-500 hover:text-slate-300 hover:border-purple-500/50 transition-all cursor-pointer bg-slate-950/60 group"
                    >
                      {/* ── Silhouette guida inquadratura ── */}
                      <svg
                        viewBox="0 0 100 200"
                        className="absolute inset-0 w-full h-full opacity-10 group-hover:opacity-15 transition-opacity pointer-events-none"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        {/* Testa */}
                        <ellipse cx="50" cy="22" rx="13" ry="15" fill="#a78bfa" />
                        {/* Collo */}
                        <rect x="44" y="35" width="12" height="10" rx="4" fill="#a78bfa" />
                        {/* Torso */}
                        <path d="M25 45 Q50 42 75 45 L72 110 Q50 115 28 110 Z" fill="#a78bfa" />
                        {/* Braccio sinistro */}
                        <path d="M25 47 Q15 60 18 95 Q22 100 26 95 Q24 65 30 50 Z" fill="#a78bfa" />
                        {/* Braccio destro */}
                        <path d="M75 47 Q85 60 82 95 Q78 100 74 95 Q76 65 70 50 Z" fill="#a78bfa" />
                        {/* Gamba sinistra */}
                        <path d="M28 110 Q26 150 30 190 Q38 194 44 190 Q42 150 42 110 Z" fill="#a78bfa" />
                        {/* Gamba destra */}
                        <path d="M72 110 Q74 150 70 190 Q62 194 56 190 Q58 150 58 110 Z" fill="#a78bfa" />
                        {/* Linea di riferimento testa (10%) */}
                        <line x1="2" y1="8" x2="98" y2="8" stroke="#f59e0b" strokeWidth="0.8" strokeDasharray="3 2" />
                        {/* Linea di riferimento piedi (90%) */}
                        <line x1="2" y1="192" x2="98" y2="192" stroke="#f59e0b" strokeWidth="0.8" strokeDasharray="3 2" />
                      </svg>

                      {/* Linea centrale verticale */}
                      <div className="absolute inset-y-0 left-1/2 w-px bg-amber-400/20 pointer-events-none" />

                      {/* Indicatore zona testa */}
                      <div className="absolute top-[6%] left-0 right-0 flex items-center justify-end pr-1 pointer-events-none">
                        <span className="text-[8px] text-amber-400/60 font-bold">TESTA</span>
                      </div>
                      {/* Indicatore zona piedi */}
                      <div className="absolute bottom-[6%] left-0 right-0 flex items-center justify-end pr-1 pointer-events-none">
                        <span className="text-[8px] text-amber-400/60 font-bold">PIEDI</span>
                      </div>

                      {/* Call to action centrale */}
                      <div className="relative z-10 flex flex-col items-center gap-1 py-2">
                        <Upload className="w-4 h-4" />
                        <span className="text-[9px] font-bold text-center px-2 leading-tight">Clicca per selezionare</span>
                      </div>
                    </button>
                  )}
                  {/* Input nascosto — uno per posa per evitare conflitti */}
                  <input
                    ref={slotRefs[pose]}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleSlotFileChange(pose)}
                  />
                </div>
              );
            })}
          </div>

          {/* Guida inquadratura testuale */}
          <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl px-3 py-2.5 space-y-1">
            <p className="text-[10px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              📐 Guida per un confronto perfetto
            </p>
            <ul className="text-[10px] text-slate-400 space-y-0.5 font-medium">
              <li>• Inquadra dalla <strong className="text-slate-300">testa ai piedi</strong>, centrato nell'immagine</li>
              <li>• Usa sempre la <strong className="text-slate-300">stessa distanza</strong> dalla fotocamera (≈ 2-3 metri)</li>
              <li>• Stesso <strong className="text-slate-300">sfondo e luce</strong> per rendere il confronto più netto</li>
              <li>• Usa il <strong className="text-slate-300">timer</strong> dello smartphone per restare in posa</li>
            </ul>
          </div>

          <button
            type="button"
            onClick={handleUploadAll}
            disabled={!hasAnySlotSelected || isUploading}
            className="w-full py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs transition-all cursor-pointer shadow-lg shadow-purple-500/20"
          >
            {isUploading
              ? 'Salvataggio...'
              : `Salva ${Object.values(slots).filter((s) => s.file).length || ''} Foto`}
          </button>
        </div>
      )}

      {/* Canvas nascosto per normalizzazione — non visibile all'utente */}
      <canvas ref={normCanvasRef} className="hidden" />

      {/* Modale fullscreen normalizzazione foto ESISTENTE (fuori dal pannello upload) */}
      {normalizing?.existingPhotoId && (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-purple-500/50 rounded-2xl p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-black text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                <ScanSearch className="w-3.5 h-3.5" /> Normalizza foto esistente
              </p>
              <button type="button" onClick={() => setNormalizing(null)} className="p-1 text-slate-500 hover:text-white transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Preview live */}
            <div className="relative rounded-xl overflow-hidden mx-auto" style={{ aspectRatio: '3/4', maxWidth: 200 }}>
              <img
                src={normalizing.url}
                alt="Anteprima"
                className="absolute inset-0 w-full h-full object-cover"
                style={{
                  transform: `scale(${normZoom / 100}) translateY(${normOffsetY * -0.35}%)`,
                  transformOrigin: 'center center',
                }}
                crossOrigin="anonymous"
              />
              <svg viewBox="0 0 100 200" className="absolute inset-0 w-full h-full pointer-events-none opacity-30" fill="none">
                <ellipse cx="50" cy="22" rx="13" ry="15" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
                <rect x="44" y="35" width="12" height="10" rx="4" fill="none" stroke="#f59e0b" strokeWidth="1" />
                <path d="M25 45 Q50 42 75 45 L72 110 Q50 115 28 110 Z" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
                <path d="M25 47 Q15 60 18 95 Q22 100 26 95 Q24 65 30 50 Z" fill="none" stroke="#f59e0b" strokeWidth="1" />
                <path d="M75 47 Q85 60 82 95 Q78 100 74 95 Q76 65 70 50 Z" fill="none" stroke="#f59e0b" strokeWidth="1" />
                <path d="M28 110 Q26 150 30 190 Q38 194 44 190 Q42 150 42 110 Z" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
                <path d="M72 110 Q74 150 70 190 Q62 194 56 190 Q58 150 58 110 Z" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
                <line x1="2" y1="8" x2="98" y2="8" stroke="#f59e0b" strokeWidth="0.8" strokeDasharray="3 2" />
                <line x1="2" y1="192" x2="98" y2="192" stroke="#f59e0b" strokeWidth="0.8" strokeDasharray="3 2" />
                <line x1="50" y1="0" x2="50" y2="200" stroke="rgba(251,191,36,0.3)" strokeWidth="0.6" strokeDasharray="2 3" />
              </svg>
            </div>

            <button type="button" onClick={handleAutoAlign} disabled={isAutoAligning}
              className="w-full py-2 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[11px] font-black hover:bg-purple-500/30 transition-all disabled:opacity-50 cursor-pointer">
              {isAutoAligning ? 'Analisi in corso...' : '🤖 Auto-allinea'}
            </button>

            <div className="space-y-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Zoom</span>
                  <span className="text-[10px] text-purple-400 font-black">{normZoom}%</span>
                </div>
                <input type="range" min={60} max={300} value={normZoom}
                  onChange={(e) => setNormZoom(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none bg-slate-700 accent-purple-500 cursor-pointer" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Posizione verticale</span>
                  <span className="text-[10px] text-purple-400 font-black">{normOffsetY > 0 ? '↑' : normOffsetY < 0 ? '↓' : '•'} {Math.abs(normOffsetY)}%</span>
                </div>
                <input type="range" min={-100} max={100} value={normOffsetY}
                  onChange={(e) => setNormOffsetY(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none bg-slate-700 accent-purple-500 cursor-pointer" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setNormalizing(null)}
                className="py-2 rounded-xl border border-slate-700 text-slate-400 text-[11px] font-bold hover:bg-slate-800 transition-all cursor-pointer">
                Annulla
              </button>
              <button type="button" onClick={handleNormalizeConfirm} disabled={isSavingNorm}
                className="py-2 rounded-xl bg-purple-500 hover:bg-purple-400 disabled:opacity-50 text-white text-[11px] font-black transition-all cursor-pointer shadow-lg shadow-purple-500/20">
                {isSavingNorm ? 'Salvataggio...' : '✔ Salva su Supabase'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Nessuna foto ── */}
      {allPhotos.length === 0 && (
        <div className="py-12 flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center">
            <ImageOff className="w-6 h-6 text-slate-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400">Nessuna foto presente nello storico</p>
            <p className="text-xs text-slate-600 mt-0.5">Carica il primo set di foto per iniziare il monitoraggio</p>
          </div>
          <button
            type="button"
            onClick={() => { setShowUploadPanel(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 hover:bg-purple-500/25 text-xs font-bold transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Carica prime foto
          </button>
        </div>
      )}

      {/* ── Area Confronto (mostrata se ci sono check-in) ── */}
      {checkinSessions.length >= 1 && (
        <div className="bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:p-5 space-y-4 shadow-xs dark:shadow-xl">
          {/* Header & Selettori di Confronto */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800/80 pb-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Selettore Data Prima */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded bg-slate-200 dark:bg-black/60 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-300">
                  Prima
                </span>
                <select
                  value={selectedBeforeDate || ''}
                  onChange={(e) => setSelectedBeforeDate(e.target.value)}
                  className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold rounded-xl px-3 py-1.5 focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  {checkinSessions.map((s) => (
                    <option key={s.date} value={s.date}>
                      {formatDateIT(s.date)} ({Object.keys(s.photos).length} foto)
                    </option>
                  ))}
                </select>
              </div>

              {/* Icona & Differenza giorni */}
              <div className="flex items-center gap-1.5 text-slate-500 text-xs font-bold">
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                {selectedBeforeDate && selectedAfterDate && selectedBeforeDate !== selectedAfterDate && (
                  <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    +{getDaysDiff(selectedBeforeDate, selectedAfterDate)} gg
                  </span>
                )}
              </div>

              {/* Selettore Data Dopo */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded bg-amber-400/20 border border-amber-400/30 text-amber-700 dark:text-amber-400">
                  Dopo
                </span>
                <select
                  value={selectedAfterDate || ''}
                  onChange={(e) => setSelectedAfterDate(e.target.value)}
                  className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold rounded-xl px-3 py-1.5 focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  {checkinSessions.map((s) => (
                    <option key={s.date} value={s.date}>
                      {formatDateIT(s.date)} ({Object.keys(s.photos).length} foto)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Toggle Modalità (Slider / Affiancato) */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 self-start md:self-auto shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('side-by-side')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'side-by-side'
                    ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                <Columns2 className="w-3.5 h-3.5" />
                Affiancato
              </button>
              <button
                type="button"
                onClick={() => setViewMode('slider')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'slider'
                    ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                <SplitSquareHorizontal className="w-3.5 h-3.5" />
                Slider
              </button>
            </div>
          </div>

          {/* Filtro Posa attiva nel confronto */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 mr-1">Posa:</span>
            {(['front', 'back', 'side'] as SlotPose[]).map((pose) => {
              const active = selectedPose === pose;
              const hasBefore = Boolean(beforeSession?.photos[pose]);
              const hasAfter = Boolean(afterSession?.photos[pose]);
              return (
                <button
                  key={pose}
                  type="button"
                  onClick={() => setSelectedPose(pose)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    active
                      ? 'bg-amber-400/25 border border-amber-500 dark:border-amber-400 text-amber-800 dark:text-amber-300 shadow-xs'
                      : 'bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <span>{POSE_EMOJI[pose]}</span>
                  <span>{POSE_LABELS[pose]}</span>
                  {(!hasBefore || !hasAfter) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500/60 ml-0.5" title="Foto mancante in una delle date selezionate" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Visualizzatore Confronto */}
          {canCompare ? (
            viewMode === 'slider' ? (
              <div className="pt-2">
                <SliderComparator
                  beforeUrl={beforePhoto!.image_url}
                  afterUrl={afterPhoto!.image_url}
                  beforeLabel={`${formatDateIT(beforePhoto!.date)} — Prima`}
                  afterLabel={`${formatDateIT(afterPhoto!.date)} — Dopo`}
                />
              </div>
            ) : (
              /* Modalità Affiancata: 2 colonne pulite senza duplicati con corpo intero */
              <div className="grid grid-cols-2 gap-4 pt-2">
                {[
                  { photo: beforePhoto!, tag: 'Prima', date: beforePhoto!.date, border: 'border-slate-200 dark:border-slate-700', badgeClass: 'bg-black/80 text-white border-white/20' },
                  { photo: afterPhoto!, tag: 'Dopo', date: afterPhoto!.date, border: 'border-amber-500/40', badgeClass: 'bg-amber-400 text-slate-950 border-amber-300 font-black' },
                ].map(({ photo, tag, date, border, badgeClass }) => (
                  <div
                    key={photo.id}
                    className={`relative rounded-2xl overflow-hidden border ${border} bg-slate-100 dark:bg-slate-950 shadow-md dark:shadow-xl group`}
                    style={{ aspectRatio: '3/4', maxHeight: '520px' }}
                  >
                    <img
                      src={photo.image_url}
                      alt={tag}
                      className="w-full h-full object-contain bg-slate-100 dark:bg-slate-950"
                    />
                    <div className={`absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-md ${badgeClass}`}>
                      {tag} • {formatDateIT(date)}
                    </div>
                    {photo.notes && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-3">
                        <p className="text-[10px] text-white/80 line-clamp-2 italic font-medium">{photo.notes}</p>
                      </div>
                    )}
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => setLightboxUrl(photo.image_url)}
                        className="w-7 h-7 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center transition-colors cursor-pointer shadow-md"
                        title="Ingrandisci"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                      {isCoachView && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleEditExistingPhoto(photo)}
                            className="w-7 h-7 rounded-full bg-purple-500/80 hover:bg-purple-500 text-white flex items-center justify-center transition-colors cursor-pointer shadow-md"
                            title="Normalizza inquadratura"
                          >
                            <ScanSearch className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePhoto(photo.id)}
                            className="w-7 h-7 rounded-full bg-black/70 hover:bg-red-500 text-white flex items-center justify-center transition-colors cursor-pointer shadow-md"
                            title="Elimina"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="py-12 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center p-6 bg-white/70 dark:bg-slate-950/40">
              <ArrowLeftRight className="w-8 h-8 text-slate-400 dark:text-slate-600 mb-2" />
              <p className="text-xs font-bold text-slate-800 dark:text-slate-300">
                {!beforePhoto && !afterPhoto
                  ? `Nessuna foto ${POSE_LABELS[selectedPose].toLowerCase()} presente per i check-in selezionati`
                  : !beforePhoto
                  ? `Manca la foto ${POSE_LABELS[selectedPose].toLowerCase()} per il check-in del ${selectedBeforeDate ? formatDateIT(selectedBeforeDate) : 'Prima'}`
                  : `Manca la foto ${POSE_LABELS[selectedPose].toLowerCase()} per il check-in del ${selectedAfterDate ? formatDateIT(selectedAfterDate) : 'Dopo'}`}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                Seleziona un'altra posa con i pulsanti in alto, oppure consulta i check-in nello storico sottostante.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Storico Check-in Raggruppati per Data ── */}
      {checkinSessions.length > 0 && (
        <div className="space-y-4 pt-3">
          <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800/80 pt-5">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              <h4 className="text-xs font-black text-slate-800 dark:text-slate-300 uppercase tracking-wider">
                Storico Check-in — {checkinSessions.length} {checkinSessions.length === 1 ? 'Sessione' : 'Sessioni'} ({allPhotos.length} foto)
              </h4>
            </div>
            <p className="text-[10px] text-slate-500 font-medium">
              Ordinati per data dal più recente
            </p>
          </div>

          <div className="space-y-4">
            {checkinSessions.map((session) => {
              const isSelectedBefore = selectedBeforeDate === session.date;
              const isSelectedAfter = selectedAfterDate === session.date;
              const poses: SlotPose[] = ['front', 'back', 'side'];

              return (
                <div
                  key={session.date}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-xs dark:shadow-lg hover:border-slate-300 dark:hover:border-slate-700/80 transition-all"
                >
                  {/* Intestazione sessione */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          Check-in del {formatFullDateIT(session.date)}
                        </span>
                        {session.list.length > 0 && (
                          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-950 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800">
                            {session.list.length} foto
                          </span>
                        )}
                      </div>
                      {session.notes && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                          "{session.notes}"
                        </p>
                      )}
                    </div>

                    {/* Quick action buttons per il confronto */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedBeforeDate(session.date)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          isSelectedBefore
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white border border-slate-200 dark:border-slate-800'
                        }`}
                        title="Imposta questo check-in come 'Prima' nel confronto"
                      >
                        <ArrowLeft className="w-3 h-3" />
                        {isSelectedBefore ? 'Attuale Prima' : 'Usa come Prima'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedAfterDate(session.date)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          isSelectedAfter
                            ? 'bg-amber-400 text-slate-950 shadow-sm font-black'
                            : 'bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-800 text-amber-700 dark:text-amber-400/80 hover:text-amber-800 dark:hover:text-amber-300 border border-slate-200 dark:border-slate-800'
                        }`}
                        title="Imposta questo check-in come 'Dopo' nel confronto"
                      >
                        {isSelectedAfter ? 'Attuale Dopo' : 'Usa come Dopo'}
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* 3 Slot posa Frontale, Posteriore, Laterale */}
                  <div className="grid grid-cols-3 gap-3">
                    {poses.map((pose) => {
                      const photo = session.photos[pose];
                      if (photo) {
                        return (
                          <div
                            key={photo.id}
                            className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 group"
                            style={{ aspectRatio: '3/4' }}
                          >
                            <img
                              src={photo.image_url}
                              alt={POSE_LABELS[pose]}
                              className="w-full h-full object-contain bg-slate-100 dark:bg-slate-950"
                            />
                            {/* Badge Posa */}
                            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-sm border border-slate-800 text-[10px] font-black text-amber-400">
                              {POSE_EMOJI[pose]} {POSE_LABELS[pose]}
                            </div>
                            {/* Azioni su hover */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => setLightboxUrl(photo.image_url)}
                                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-colors cursor-pointer"
                                title="Ingrandisci"
                              >
                                <ZoomIn className="w-4 h-4" />
                              </button>
                              {isCoachView && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleEditExistingPhoto(photo)}
                                    className="w-8 h-8 rounded-full bg-purple-500/60 hover:bg-purple-500 text-white flex items-center justify-center transition-colors cursor-pointer"
                                    title="Normalizza inquadratura"
                                  >
                                    <ScanSearch className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeletePhoto(photo.id)}
                                    className="w-8 h-8 rounded-full bg-red-500/60 hover:bg-red-500 text-white flex items-center justify-center transition-colors cursor-pointer"
                                    title="Elimina foto"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div
                          key={pose}
                          className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950/30 flex flex-col items-center justify-center p-3 text-center gap-1.5"
                          style={{ aspectRatio: '3/4' }}
                        >
                          <span className="text-base opacity-40">{POSE_EMOJI[pose]}</span>
                          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
                            {POSE_LABELS[pose]}
                          </span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-600">Non caricata</span>
                          <button
                            type="button"
                            onClick={() => {
                              setPhotoDate(session.date);
                              setShowUploadPanel(true);
                            }}
                            className="mt-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-[9px] font-bold text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white transition-colors cursor-pointer"
                          >
                            + Aggiungi
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
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
