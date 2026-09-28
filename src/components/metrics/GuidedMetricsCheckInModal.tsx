import React, { useState, useMemo } from 'react';
import {
  X,
  Scale,
  Ruler,
  Camera,
  Trash2,
  Calendar,
  FileText,
} from 'lucide-react';
import { useMetrics } from '../../context/MetricsContext';
import { useToast } from '../../context/ToastContext';
import { AthleteMetric, AthleteCheckScheduleConfig } from '../../types/metrics';

interface GuidedMetricsCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  athleteId: string;
  athleteName?: string;
  latestMetric?: AthleteMetric;
  scheduleConfig?: AthleteCheckScheduleConfig;
}

export const GuidedMetricsCheckInModal: React.FC<GuidedMetricsCheckInModalProps> = ({
  isOpen,
  onClose,
  athleteId,
  athleteName = 'Atleta',
  latestMetric,
  scheduleConfig,
}) => {
  const { addMetric, addProgressPhoto } = useMetrics();
  const { showSuccess, showError } = useToast();

  const req = scheduleConfig?.required_fields;
  const photoReq = scheduleConfig?.photo_requirement || 'optional';

  // Form State
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [weightKg, setWeightKg] = useState<string>(latestMetric?.weight_kg ? String(latestMetric.weight_kg) : '');
  const [bodyFat, setBodyFat] = useState<string>(latestMetric?.body_fat_percentage ? String(latestMetric.body_fat_percentage) : '');
  
  // Circonferenze
  const [waist, setWaist] = useState<string>(latestMetric?.waist_cm ? String(latestMetric.waist_cm) : '');
  const [chest, setChest] = useState<string>(latestMetric?.chest_cm ? String(latestMetric.chest_cm) : '');
  const [hips, setHips] = useState<string>(latestMetric?.hips_cm ? String(latestMetric.hips_cm) : '');
  const [bicepRight, setBicepRight] = useState<string>(latestMetric?.bicep_right_cm ? String(latestMetric.bicep_right_cm) : '');
  const [bicepLeft, setBicepLeft] = useState<string>(latestMetric?.bicep_left_cm ? String(latestMetric.bicep_left_cm) : '');
  const [thighRight, setThighRight] = useState<string>(latestMetric?.thigh_right_cm ? String(latestMetric.thigh_right_cm) : '');
  const [thighLeft, setThighLeft] = useState<string>(latestMetric?.thigh_left_cm ? String(latestMetric.thigh_left_cm) : '');
  const [neck, setNeck] = useState<string>(latestMetric?.neck_cm ? String(latestMetric.neck_cm) : '');
  const [shoulders, setShoulders] = useState<string>(latestMetric?.shoulders_cm ? String(latestMetric.shoulders_cm) : '');
  const [calfRight, setCalfRight] = useState<string>(latestMetric?.calf_right_cm ? String(latestMetric.calf_right_cm) : '');
  
  const [notes, setNotes] = useState<string>('');
  
  // Foto Progressi
  const [photos, setPhotos] = useState<{ pose: 'front' | 'back' | 'side'; url: string; file?: File }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Calcolo Delta Peso Istantaneo
  const liveWeightDelta = useMemo(() => {
    if (!weightKg || !latestMetric?.weight_kg) return null;
    const num = parseFloat(weightKg);
    if (isNaN(num)) return null;
    return Number((num - latestMetric.weight_kg).toFixed(1));
  }, [weightKg, latestMetric]);

  if (!isOpen) return null;

  // Caricamento Foto
  const handlePhotoUpload = (pose: 'front' | 'back' | 'side', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPhotos(prev => {
        const filtered = prev.filter(p => p.pose !== pose);
        return [...filtered, { pose, url: result, file }];
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = (pose: 'front' | 'back' | 'side') => {
    setPhotos(prev => prev.filter(p => p.pose !== pose));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validazione Campi Obbligatori
    if (req?.weight && !weightKg.trim()) {
      showError('Campo Obbligatorio', 'Il peso corporeo è richiesto dal tuo coach.');
      return;
    }
    if (req?.waist && !waist.trim()) {
      showError('Campo Obbligatorio', 'La circonferenza vita è richiesta dal tuo coach.');
      return;
    }

    if (photoReq === 'mandatory' && photos.length === 0) {
      showError('Foto Obbligatorie', 'Il tuo coach richiede almeno una foto progressi per completare il check.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await addMetric({
        athlete_id: athleteId,
        date: date || new Date().toISOString().slice(0, 10),
        weight_kg: weightKg ? parseFloat(weightKg) : null,
        body_fat_percentage: bodyFat ? parseFloat(bodyFat) : null,
        waist_cm: waist ? parseFloat(waist) : null,
        chest_cm: chest ? parseFloat(chest) : null,
        hips_cm: hips ? parseFloat(hips) : null,
        bicep_right_cm: bicepRight ? parseFloat(bicepRight) : null,
        bicep_left_cm: bicepLeft ? parseFloat(bicepLeft) : null,
        thigh_right_cm: thighRight ? parseFloat(thighRight) : null,
        thigh_left_cm: thighLeft ? parseFloat(thighLeft) : null,
        neck_cm: neck ? parseFloat(neck) : null,
        shoulders_cm: shoulders ? parseFloat(shoulders) : null,
        calf_right_cm: calfRight ? parseFloat(calfRight) : null,
        notes: notes.trim() || null,
      });

      if (res.success && res.data) {
        // Salva le foto associate
        for (const p of photos) {
          await addProgressPhoto(
            {
              athlete_id: athleteId,
              metric_id: res.data.id,
              date: date || new Date().toISOString().slice(0, 10),
              pose: p.pose,
              image_url: p.url,
              notes: `Foto ${p.pose} del check-in`,
            },
            p.file
          );
        }

        showSuccess('Check-in Completato!', 'Le tue misurazioni sono state registrate e inviate al coach.');
        onClose();
      } else {
        showError('Errore', res.error || 'Impossibile salvare il check-in.');
      }
    } catch (err) {
      showError('Errore', 'Si è verificato un errore durante il salvataggio.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const circumferenceFields = [
    { key: 'waist', label: 'Vita', value: waist, setter: setWaist, required: Boolean(req?.waist), placeholder: 'Es. 78' },
    { key: 'chest', label: 'Torace', value: chest, setter: setChest, required: Boolean(req?.chest), placeholder: 'Es. 102' },
    { key: 'hips', label: 'Fianchi', value: hips, setter: setHips, required: Boolean(req?.hips), placeholder: 'Es. 96' },
    { key: 'bicepRight', label: 'Braccio Dx', value: bicepRight, setter: setBicepRight, required: Boolean(req?.biceps), placeholder: 'Es. 37' },
    { key: 'bicepLeft', label: 'Braccio Sx', value: bicepLeft, setter: setBicepLeft, required: Boolean(req?.biceps), placeholder: 'Es. 37' },
    { key: 'thighRight', label: 'Coscia Dx', value: thighRight, setter: setThighRight, required: Boolean(req?.thighs), placeholder: 'Es. 58' },
    { key: 'thighLeft', label: 'Coscia Sx', value: thighLeft, setter: setThighLeft, required: Boolean(req?.thighs), placeholder: 'Es. 58' },
    { key: 'shoulders', label: 'Spalle', value: shoulders, setter: setShoulders, required: Boolean(req?.shoulders), placeholder: 'Es. 118' },
    { key: 'neck', label: 'Collo', value: neck, setter: setNeck, required: Boolean(req?.neck), placeholder: 'Es. 39' },
    { key: 'calfRight', label: 'Polpaccio', value: calfRight, setter: setCalfRight, required: Boolean(req?.calves), placeholder: 'Es. 38' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-3xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        
        {/* Header Modale */}
        <div className="p-5 sm:p-6 border-b border-[var(--color-border)] flex items-center justify-between shrink-0 bg-[var(--color-panel)]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[var(--color-primary-soft)] border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)] shrink-0 shadow-lg shadow-[var(--color-primary)]/10">
              <Ruler className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-[var(--color-text)]">Rituale Check Misure</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold text-[10px] uppercase border border-emerald-500/30">
                  {scheduleConfig?.frequency_days ? `Ogni ${scheduleConfig.frequency_days} giorni` : 'Periodico'}
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Aggiorna le misure corporee di {athleteName} per monitorare l'evoluzione con il tuo coach.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-strong)] transition-all cursor-pointer"
            title="Chiudi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body Scrollabile */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-[var(--color-panel)]">
          
          {/* Data Rilevazione */}
          <div className="p-4 rounded-2xl bg-[var(--color-surface-strong)] border border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] block">
                Data del Check
              </span>
              <span className="text-xs text-[var(--color-text)] font-medium">
                Data in cui hai effettuato le misurazioni
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] font-bold text-xs focus:outline-none focus:border-[var(--color-primary)] transition-colors cursor-pointer"
              />
            </div>
          </div>

          {/* 1. SEZIONE PESO CORPOREO & BODY FAT */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-[var(--color-text)] flex items-center gap-2">
              <Scale className="w-4 h-4 text-[var(--color-primary)]" />
              1. Peso & Composizione Corporea
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Peso Corporeo */}
              <div className={`p-4 rounded-2xl border space-y-2.5 transition-all bg-[var(--color-surface-strong)] ${
                req?.weight
                  ? 'border-[var(--color-primary)]/50 shadow-sm shadow-[var(--color-primary)]/10'
                  : 'border-[var(--color-border)]'
              }`}>
                <div className="flex justify-between items-center">
                  <label className="text-xs font-black text-[var(--color-text)] uppercase tracking-wide flex items-center gap-1">
                    Peso Corporeo {req?.weight && <span className="text-[var(--color-primary)] font-black">*</span>}
                  </label>
                  {liveWeightDelta !== null && (
                    <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-lg border ${
                      liveWeightDelta <= 0
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    }`}>
                      {liveWeightDelta > 0 ? `+${liveWeightDelta}` : liveWeightDelta} kg vs prec.
                    </span>
                  )}
                </div>

                <div className="relative flex items-center">
                  <input
                    type="number"
                    step="0.1"
                    min="30"
                    max="250"
                    placeholder="Es. 74.5"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    className="w-full pl-4 pr-12 py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] font-black text-lg focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-focus)] transition-all placeholder:text-[var(--color-text-muted)]/40"
                  />
                  <span className="absolute right-3 px-2 py-1 rounded-lg bg-[var(--color-surface-strong)] border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-muted)] select-none pointer-events-none">
                    kg
                  </span>
                </div>
              </div>

              {/* % Grasso Corporeo */}
              <div className={`p-4 rounded-2xl border space-y-2.5 transition-all bg-[var(--color-surface-strong)] ${
                req?.body_fat
                  ? 'border-[var(--color-primary)]/50 shadow-sm shadow-[var(--color-primary)]/10'
                  : 'border-[var(--color-border)]'
              }`}>
                <div className="flex justify-between items-center">
                  <label className="text-xs font-black text-[var(--color-text)] uppercase tracking-wide flex items-center gap-1">
                    Massa Grassa {req?.body_fat && <span className="text-[var(--color-primary)] font-black">*</span>}
                  </label>
                  <span className="text-[10px] font-bold text-[var(--color-text-muted)] bg-[var(--color-surface)] px-2 py-0.5 rounded-md border border-[var(--color-border)]">
                    Opzionale
                  </span>
                </div>

                <div className="relative flex items-center">
                  <input
                    type="number"
                    step="0.1"
                    min="3"
                    max="60"
                    placeholder="Es. 14.2"
                    value={bodyFat}
                    onChange={(e) => setBodyFat(e.target.value)}
                    className="w-full pl-4 pr-12 py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] font-black text-lg focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-focus)] transition-all placeholder:text-[var(--color-text-muted)]/40"
                  />
                  <span className="absolute right-3 px-2.5 py-1 rounded-lg bg-[var(--color-surface-strong)] border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-muted)] select-none pointer-events-none">
                    %
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. SEZIONE CIRCONFERENZE */}
          <div className="space-y-3 pt-3 border-t border-[var(--color-border)]">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-[var(--color-text)] flex items-center gap-2">
                <Ruler className="w-4 h-4 text-sky-400" />
                2. Circonferenze Corporee (cm)
              </h3>
              <span className="text-[10px] font-medium text-[var(--color-text-muted)]">
                Misura nei punti standard al mattino a digiuno
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {circumferenceFields.map((field) => (
                <div
                  key={field.key}
                  className={`p-3 rounded-2xl border transition-all bg-[var(--color-surface-strong)] ${
                    field.required
                      ? 'border-sky-500/50 shadow-sm shadow-sky-500/10'
                      : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)]/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-[var(--color-text)] tracking-tight">
                      {field.label}
                      {field.required && <span className="text-sky-400 font-black ml-1">*</span>}
                    </span>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      step="0.5"
                      placeholder={field.placeholder}
                      value={field.value}
                      onChange={(e) => field.setter(e.target.value)}
                      className="w-full pl-3 pr-8 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] font-black text-sm focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 transition-all placeholder:text-[var(--color-text-muted)]/40"
                    />
                    <span className="absolute right-2.5 text-[10px] font-bold text-[var(--color-text-muted)] select-none pointer-events-none">
                      cm
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. SEZIONE FOTO PROGRESSI */}
          {photoReq !== 'none' && (
            <div className="space-y-3 pt-3 border-t border-[var(--color-border)]">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-[var(--color-text)] flex items-center gap-2">
                  <Camera className="w-4 h-4 text-purple-400" />
                  3. Foto Progressi Visive
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  photoReq === 'mandatory'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    : 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                }`}>
                  {photoReq === 'mandatory' ? 'Obbligatorie' : 'Facoltative'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {(['front', 'back', 'side'] as const).map((pose) => {
                  const currentPhoto = photos.find(p => p.pose === pose);
                  const label = pose === 'front' ? 'Frontale' : pose === 'back' ? 'Posteriore' : 'Laterale';

                  return (
                    <div
                      key={pose}
                      className="p-3 rounded-2xl bg-[var(--color-surface-strong)] border border-[var(--color-border)] text-center space-y-2 relative overflow-hidden"
                    >
                      <span className="text-[11px] font-black text-[var(--color-text)] block">{label}</span>

                      {currentPhoto ? (
                        <div className="relative rounded-xl overflow-hidden aspect-[3/4] border border-purple-500/40">
                          <img
                            src={currentPhoto.url}
                            alt={label}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(pose)}
                            className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-black/70 text-rose-400 hover:text-white transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center rounded-xl aspect-[3/4] border-2 border-dashed border-[var(--color-border)] hover:border-purple-400/60 bg-[var(--color-surface)]/60 hover:bg-[var(--color-surface)] transition-all cursor-pointer p-2 space-y-1.5">
                          <Camera className="w-5 h-5 text-[var(--color-text-muted)]" />
                          <span className="text-[10px] font-bold text-[var(--color-text-muted)]">Carica foto</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handlePhotoUpload(pose, e)}
                          />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. NOTE & SENSAZIONI */}
          <div className="space-y-1.5 pt-3 border-t border-[var(--color-border)]">
            <label className="text-xs font-black text-[var(--color-text)] uppercase tracking-wide flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              Note, Sensazioni ed Eventuali Commenti
            </label>
            {scheduleConfig?.custom_notes_prompt && (
              <p className="text-[11px] text-[var(--color-text-muted)] italic">
                "{scheduleConfig.custom_notes_prompt}"
              </p>
            )}
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Es. ottime sensazioni nei carichi, energia costante..."
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] text-xs placeholder:text-[var(--color-text-muted)]/50 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-focus)] transition-all resize-none"
            />
          </div>

          {/* Footer CTA */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-[var(--color-border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-strong)] font-bold text-xs transition-colors cursor-pointer"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all cursor-pointer shadow-lg shadow-[var(--color-primary)]/20 active:scale-95"
            >
              {isSubmitting ? 'Salvataggio...' : 'Conferma e Salva Check'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

