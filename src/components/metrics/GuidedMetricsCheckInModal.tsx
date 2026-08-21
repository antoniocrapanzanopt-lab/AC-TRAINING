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
  const [photos, setPhotos] = useState<{ pose: 'front' | 'back' | 'side'; url: string }[]>([]);
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
        return [...filtered, { pose, url: result }];
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
          await addProgressPhoto({
            athlete_id: athleteId,
            metric_id: res.data.id,
            date: date || new Date().toISOString().slice(0, 10),
            pose: p.pose,
            image_url: p.url,
            notes: `Foto ${p.pose} del check-in`,
          });
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-3xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        
        {/* Header Modale */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)] shrink-0 shadow-lg shadow-[var(--color-primary)]/10">
              <Ruler className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">Rituale Check Misure</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-[10px] uppercase border border-emerald-500/30">
                  {scheduleConfig?.frequency_days ? `Ogni ${scheduleConfig.frequency_days} giorni` : 'Periodico'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Aggiorna le misure corporee di {athleteName} per monitorare l'evoluzione con il tuo coach.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body Scrollabile */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Data Rilevazione */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Data del Check
              </span>
              <span className="text-xs text-slate-300">
                Data in cui hai effettuato le misurazioni
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold text-xs focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              />
            </div>
          </div>

          {/* 1. SEZIONE PESO CORPOREO & BODY FAT */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-[var(--color-primary)]" />
              1. Peso & Composizione Corporea
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Peso Corporeo */}
              <div className={`p-4 rounded-2xl border space-y-2 ${
                req?.weight ? 'bg-slate-900/90 border-[var(--color-primary)]/40 shadow-lg shadow-[var(--color-primary)]/5' : 'bg-slate-900 border-slate-800'
              }`}>
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                    Peso Corporeo (kg) {req?.weight && <span className="text-[var(--color-primary)] font-black">*</span>}
                  </label>
                  {liveWeightDelta !== null && (
                    <span className={`text-[11px] font-black px-2 py-0.5 rounded ${
                      liveWeightDelta <= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {liveWeightDelta > 0 ? `+${liveWeightDelta}` : liveWeightDelta} kg vs prec.
                    </span>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="30"
                    max="250"
                    placeholder="Es. 74.5"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-black text-base focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">kg</span>
                </div>
              </div>

              {/* % Grasso Corporeo */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                    Massa Grassa (%) {req?.body_fat && <span className="text-[var(--color-primary)] font-black">*</span>}
                  </label>
                  <span className="text-[10px] text-slate-500">Opzionale</span>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="3"
                    max="60"
                    placeholder="Es. 14.2"
                    value={bodyFat}
                    onChange={(e) => setBodyFat(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-black text-base focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. SEZIONE CIRCONFERENZE */}
          <div className="space-y-3 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                <Ruler className="w-4 h-4 text-sky-400" />
                2. Circonferenze Corporee (cm)
              </h3>
              <span className="text-[10px] text-slate-500">Misura nei punti standard al mattino a digiuno</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              
              {/* VITA */}
              <div className={`p-3 rounded-xl border space-y-1 ${
                req?.waist ? 'bg-slate-900 border-sky-500/40' : 'bg-slate-900/60 border-slate-800'
              }`}>
                <span className="text-[11px] font-bold text-slate-300 block">
                  Vita {req?.waist && <span className="text-sky-400">*</span>}
                </span>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Es. 78"
                    value={waist}
                    onChange={(e) => setWaist(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-bold text-xs focus:outline-none focus:border-sky-400"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">cm</span>
                </div>
              </div>

              {/* TORACE */}
              <div className={`p-3 rounded-xl border space-y-1 ${
                req?.chest ? 'bg-slate-900 border-sky-500/40' : 'bg-slate-900/60 border-slate-800'
              }`}>
                <span className="text-[11px] font-bold text-slate-300 block">
                  Torace {req?.chest && <span className="text-sky-400">*</span>}
                </span>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Es. 102"
                    value={chest}
                    onChange={(e) => setChest(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-bold text-xs focus:outline-none focus:border-sky-400"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">cm</span>
                </div>
              </div>

              {/* FIANCHI */}
              <div className={`p-3 rounded-xl border space-y-1 ${
                req?.hips ? 'bg-slate-900 border-sky-500/40' : 'bg-slate-900/60 border-slate-800'
              }`}>
                <span className="text-[11px] font-bold text-slate-300 block">
                  Fianchi {req?.hips && <span className="text-sky-400">*</span>}
                </span>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Es. 96"
                    value={hips}
                    onChange={(e) => setHips(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-bold text-xs focus:outline-none focus:border-sky-400"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">cm</span>
                </div>
              </div>

              {/* BRACCIO DX */}
              <div className={`p-3 rounded-xl border space-y-1 ${
                req?.biceps ? 'bg-slate-900 border-sky-500/40' : 'bg-slate-900/60 border-slate-800'
              }`}>
                <span className="text-[11px] font-bold text-slate-300 block">
                  Braccio Dx {req?.biceps && <span className="text-sky-400">*</span>}
                </span>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Es. 37"
                    value={bicepRight}
                    onChange={(e) => setBicepRight(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-bold text-xs focus:outline-none focus:border-sky-400"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">cm</span>
                </div>
              </div>

              {/* BRACCIO SX */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <span className="text-[11px] font-bold text-slate-300 block">Braccio Sx</span>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Es. 37"
                    value={bicepLeft}
                    onChange={(e) => setBicepLeft(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-bold text-xs focus:outline-none focus:border-sky-400"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">cm</span>
                </div>
              </div>

              {/* COSCIA DX */}
              <div className={`p-3 rounded-xl border space-y-1 ${
                req?.thighs ? 'bg-slate-900 border-sky-500/40' : 'bg-slate-900/60 border-slate-800'
              }`}>
                <span className="text-[11px] font-bold text-slate-300 block">
                  Coscia Dx {req?.thighs && <span className="text-sky-400">*</span>}
                </span>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Es. 58"
                    value={thighRight}
                    onChange={(e) => setThighRight(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-bold text-xs focus:outline-none focus:border-sky-400"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">cm</span>
                </div>
              </div>

              {/* COSCIA SX */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <span className="text-[11px] font-bold text-slate-300 block">Coscia Sx</span>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Es. 58"
                    value={thighLeft}
                    onChange={(e) => setThighLeft(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-bold text-xs focus:outline-none focus:border-sky-400"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">cm</span>
                </div>
              </div>

              {/* SPALLE */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <span className="text-[11px] font-bold text-slate-300 block">Spalle</span>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Es. 118"
                    value={shoulders}
                    onChange={(e) => setShoulders(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-bold text-xs focus:outline-none focus:border-sky-400"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">cm</span>
                </div>
              </div>

              {/* COLLO */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <span className="text-[11px] font-bold text-slate-300 block">Collo</span>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Es. 39"
                    value={neck}
                    onChange={(e) => setNeck(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-bold text-xs focus:outline-none focus:border-sky-400"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">cm</span>
                </div>
              </div>

              {/* POLPACCIO */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <span className="text-[11px] font-bold text-slate-300 block">Polpaccio</span>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Es. 38"
                    value={calfRight}
                    onChange={(e) => setCalfRight(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-bold text-xs focus:outline-none focus:border-sky-400"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">cm</span>
                </div>
              </div>

            </div>
          </div>

          {/* 3. SEZIONE FOTO PROGRESSI */}
          {photoReq !== 'none' && (
            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <Camera className="w-4 h-4 text-purple-400" />
                  3. Foto Progressi Visive
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  photoReq === 'mandatory'
                    ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                    : 'bg-purple-500/10 text-purple-300 border-purple-500/30'
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
                      className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2 relative overflow-hidden"
                    >
                      <span className="text-[11px] font-bold text-slate-300 block">{label}</span>

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
                            className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-black/70 text-rose-400 hover:text-white transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center rounded-xl aspect-[3/4] border-2 border-dashed border-slate-800 hover:border-purple-400/60 bg-slate-950/40 hover:bg-slate-950/80 transition-all cursor-pointer p-2 space-y-1.5">
                          <Camera className="w-5 h-5 text-slate-500" />
                          <span className="text-[10px] font-bold text-slate-400">Carica foto</span>
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
          <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              Note, Sensazioni ed Eventuali Commenti
            </label>
            {scheduleConfig?.custom_notes_prompt && (
              <p className="text-[11px] text-slate-400 italic">
                "{scheduleConfig.custom_notes_prompt}"
              </p>
            )}
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Es. ottime sensazioni nei carichi, energia costante..."
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-[var(--color-primary)] transition-colors resize-none"
            />
          </div>

          {/* Footer CTA */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all cursor-pointer shadow-lg shadow-[var(--color-primary)]/20"
            >
              {isSubmitting ? 'Salvataggio...' : 'Conferma e Salva Check'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
