import React, { useState, useEffect, useMemo } from 'react';
import {
  Scale,
  Ruler,
  Dumbbell,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Activity,
  Calendar,
  X,
  Bell,
  Clock,
  Camera,
  ChevronDown,
  ChevronUp,
  Save,
  Flame,
} from 'lucide-react';
import { useMetrics } from '../../context/MetricsContext';
import { useToast } from '../../context/ToastContext';
import { MaxLiftsSection } from '../metrics/MaxLiftsSection';
import { EnergyEstimatorSection } from '../nutrition/EnergyEstimatorSection';
import {
  CheckFrequency,
  DayOfWeek,
  PhotoRequirement,
} from '../../types/metrics';

interface MetricsTabProps {
  athleteId: string;
  athleteName: string;
  athleteBirthDate?: string | null;
  athleteGender?: string | null;
  athleteHeightCm?: number | null;
  onNavigateToFullNutrition?: () => void;
}

export const MetricsTab: React.FC<MetricsTabProps> = ({
  athleteId,
  athleteName,
  athleteBirthDate,
  athleteGender,
  athleteHeightCm,
  onNavigateToFullNutrition,
}) => {
  const {
    metrics,
    maxLifts,
    fetchMetricsForAthlete,
    addMetric,
    deleteMetric,
    fetchMaxLiftsForAthlete,
    getAthleteSchedule,
    saveAthleteSchedule,
    getAthleteScheduleState,
  } = useMetrics();

  const { showSuccess, showError } = useToast();

  const [activeSubTab, setActiveSubTab] = useState<'misure' | 'fabbisogno' | 'massimali'>('misure');
  const [isScheduleOpen, setIsScheduleOpen] = useState<boolean>(false);


  // Modali State
  const [showMetricModal, setShowMetricModal] = useState(false);

  // Form Metric State
  const [metricForm, setMetricForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    weight_kg: '',
    height_cm: '',
    body_fat_percentage: '',
    neck_cm: '',
    shoulders_cm: '',
    chest_cm: '',
    waist_cm: '',
    hips_cm: '',
    bicep_right_cm: '',
    bicep_left_cm: '',
    thigh_right_cm: '',
    thigh_left_cm: '',
    calf_right_cm: '',
    calf_left_cm: '',
    notes: '',
  });

  useEffect(() => {
    if (athleteId) {
      fetchMetricsForAthlete(athleteId);
      fetchMaxLiftsForAthlete(athleteId);
    }
  }, [athleteId, fetchMetricsForAthlete, fetchMaxLiftsForAthlete]);

  // Ultimi check dell'atleta selezionato ordinati dal più recente
  const sortedMetrics = useMemo(() => {
    return metrics
      .filter(m => String(m.athlete_id) === String(athleteId))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [metrics, athleteId]);

  const latestMetric = sortedMetrics[0];
  const previousMetric = sortedMetrics[1];

  // Calcolo Delta Peso
  const weightDelta = useMemo(() => {
    if (!latestMetric?.weight_kg || !previousMetric?.weight_kg) return null;
    const diff = latestMetric.weight_kg - previousMetric.weight_kg;
    return Math.round(diff * 10) / 10;
  }, [latestMetric, previousMetric]);


  // Configurazione Rituale Check Misure per questo atleta
  const currentSchedule = useMemo(() => {
    return getAthleteSchedule(athleteId);
  }, [athleteId, getAthleteSchedule]);

  const [frequencyDays, setFrequencyDays] = useState<CheckFrequency>(7);
  const [preferredDay, setPreferredDay] = useState<DayOfWeek>(1);
  const [photoRequirement, setPhotoRequirement] = useState<PhotoRequirement>('optional');
  const [reminderActive, setReminderActive] = useState<boolean>(true);
  const [secondReminderActive, setSecondReminderActive] = useState<boolean>(true);
  const [requiredFields, setRequiredFields] = useState(currentSchedule.required_fields);
  const [notesPrompt, setNotesPrompt] = useState(currentSchedule.custom_notes_prompt || '');

  useEffect(() => {
    if (currentSchedule) {
      setFrequencyDays(currentSchedule.frequency_days);
      setPreferredDay(currentSchedule.preferred_day_of_week ?? 1);
      setPhotoRequirement(currentSchedule.photo_requirement);
      setReminderActive(currentSchedule.reminder_active);
      setSecondReminderActive(currentSchedule.second_reminder_active);
      setRequiredFields(currentSchedule.required_fields);
      setNotesPrompt(currentSchedule.custom_notes_prompt || '');
    }
  }, [currentSchedule]);

  const scheduleState = useMemo(() => {
    return getAthleteScheduleState(athleteId, latestMetric?.date || null);
  }, [athleteId, latestMetric, getAthleteScheduleState]);

  const handleSaveSchedule = async () => {
    await saveAthleteSchedule({
      athlete_id: athleteId,
      frequency_days: frequencyDays,
      preferred_day_of_week: preferredDay,
      required_fields: requiredFields,
      photo_requirement: photoRequirement,
      reminder_active: reminderActive,
      second_reminder_active: secondReminderActive,
      custom_notes_prompt: notesPrompt.trim() || undefined,
      updated_at: new Date().toISOString(),
    });
    showSuccess('Configurazione salvata!', `Rituale check aggiornato per ${athleteName}.`);
  };

  // Salvataggio Nuova Metrica
  const handleSaveMetric = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!metricForm.weight_kg && !metricForm.waist_cm && !metricForm.body_fat_percentage) {
      showError('Inserisci almeno il peso o una misurazione!');
      return;
    }

    const res = await addMetric({
      athlete_id: athleteId,
      date: metricForm.date,
      weight_kg: metricForm.weight_kg ? parseFloat(metricForm.weight_kg) : null,
      height_cm: metricForm.height_cm ? parseFloat(metricForm.height_cm) : null,
      body_fat_percentage: metricForm.body_fat_percentage ? parseFloat(metricForm.body_fat_percentage) : null,
      neck_cm: metricForm.neck_cm ? parseFloat(metricForm.neck_cm) : null,
      shoulders_cm: metricForm.shoulders_cm ? parseFloat(metricForm.shoulders_cm) : null,
      chest_cm: metricForm.chest_cm ? parseFloat(metricForm.chest_cm) : null,
      waist_cm: metricForm.waist_cm ? parseFloat(metricForm.waist_cm) : null,
      hips_cm: metricForm.hips_cm ? parseFloat(metricForm.hips_cm) : null,
      bicep_right_cm: metricForm.bicep_right_cm ? parseFloat(metricForm.bicep_right_cm) : null,
      bicep_left_cm: metricForm.bicep_left_cm ? parseFloat(metricForm.bicep_left_cm) : null,
      thigh_right_cm: metricForm.thigh_right_cm ? parseFloat(metricForm.thigh_right_cm) : null,
      thigh_left_cm: metricForm.thigh_left_cm ? parseFloat(metricForm.thigh_left_cm) : null,
      calf_right_cm: metricForm.calf_right_cm ? parseFloat(metricForm.calf_right_cm) : null,
      calf_left_cm: metricForm.calf_left_cm ? parseFloat(metricForm.calf_left_cm) : null,
      notes: metricForm.notes || null,
    });

    if (res.success) {
      showSuccess('Check misurazioni salvato con successo!');
      setShowMetricModal(false);
      setMetricForm({
        date: new Date().toISOString().slice(0, 10),
        weight_kg: '',
        height_cm: '',
        body_fat_percentage: '',
        neck_cm: '',
        shoulders_cm: '',
        chest_cm: '',
        waist_cm: '',
        hips_cm: '',
        bicep_right_cm: '',
        bicep_left_cm: '',
        thigh_right_cm: '',
        thigh_left_cm: '',
        calf_right_cm: '',
        calf_left_cm: '',
        notes: '',
      });
    } else {
      showError(res.error || 'Impossibile salvare la misurazione');
    }
  };

  const handleDeleteMetric = async (id: string) => {
    if (window.confirm('Sei sicuro di voler eliminare questa misurazione?')) {
      const res = await deleteMetric(id);
      if (res.success) showSuccess('Misurazione eliminata');
      else showError(res.error || 'Errore durante l\'eliminazione');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Tabs Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 overflow-x-auto no-scrollbar w-full sm:w-auto">
          <button
            onClick={() => setActiveSubTab('misure')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeSubTab === 'misure'
                ? 'bg-[var(--color-primary)] text-black font-black shadow-md shadow-[var(--color-primary)]/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Misure & Antropometria</span>
          </button>

          <button
            onClick={() => setActiveSubTab('fabbisogno')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeSubTab === 'fabbisogno'
                ? 'bg-[var(--color-primary)] text-black font-black shadow-md shadow-[var(--color-primary)]/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-4 h-4 text-amber-400" />
            <span>Stima Fabbisogno & Macro</span>
          </button>

          <button
            onClick={() => setActiveSubTab('massimali')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeSubTab === 'massimali'
                ? 'bg-[var(--color-primary)] text-black font-black shadow-md shadow-[var(--color-primary)]/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Dumbbell className="w-4 h-4" />
            <span>Massimali & 1RM ({maxLifts.length})</span>
          </button>
        </div>

        <div className="shrink-0">
          {activeSubTab === 'misure' && (
            <button
              onClick={() => setShowMetricModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-black font-bold text-xs rounded-xl shadow-lg shadow-[var(--color-primary)]/10 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nuovo Check Misure</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── SOTTO-TAB MISURE ────────────────────────────────────────── */}
      {activeSubTab === 'misure' && (
        <div className="space-y-6">
          
          {/* ─── PANNELLO CONFIGURAZIONE RITUALE CHECK MISURE & PROMEMORIA COACH ─── */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div
              onClick={() => setIsScheduleOpen(!isScheduleOpen)}
              className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-slate-850/60 transition-colors select-none"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)] shrink-0">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-white">
                      Rituale Check Misure & Promemoria Automatici
                    </h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                      scheduleState.isOverdue
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        : scheduleState.isDueToday
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    }`}>
                      {scheduleState.statusLabel}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Frequenza: ogni {frequencyDays} giorni • Foto: {photoRequirement === 'mandatory' ? 'Obbligatorie' : photoRequirement === 'optional' ? 'Opzionali' : 'Disattivate'} • Reminder: {reminderActive ? 'Attivi' : 'Disattivati'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                {isScheduleOpen ? <ChevronUp className="w-5 h-5 text-[var(--color-primary)]" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>

            {/* Corpo Espanso Configurazione */}
            {isScheduleOpen && (
              <div className="p-5 sm:p-6 border-t border-slate-800 bg-slate-950/60 space-y-5">
                
                {/* 1. Frequenza e Giorno Preferito */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Frequenza */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                      Frequenza del Monitoraggio
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {([7, 14, 30] as CheckFrequency[]).map((days) => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => setFrequencyDays(days)}
                          className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                            frequencyDays === days
                              ? 'bg-[var(--color-primary)] text-black shadow-md'
                              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          Ogni {days} gg
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Giorno Preferito */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-sky-400" />
                      Giorno Preferito della Settimana
                    </label>
                    <select
                      value={preferredDay}
                      onChange={(e) => setPreferredDay(Number(e.target.value) as DayOfWeek)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold text-xs focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
                    >
                      <option value={1}>Lunedì</option>
                      <option value={2}>Martedì</option>
                      <option value={3}>Mercoledì</option>
                      <option value={4}>Giovedì</option>
                      <option value={5}>Venerdì</option>
                      <option value={6}>Sabato</option>
                      <option value={0}>Domenica</option>
                    </select>
                  </div>
                </div>

                {/* 2. Foto Progressi & Reminder */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
                  {/* Foto Progressi */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-purple-400" />
                      Foto Progressi Visive
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['none', 'optional', 'mandatory'] as PhotoRequirement[]).map((req) => (
                        <button
                          key={req}
                          type="button"
                          onClick={() => setPhotoRequirement(req)}
                          className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                            photoRequirement === req
                              ? 'bg-purple-500 text-white shadow-md'
                              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {req === 'none' ? 'Nessuna' : req === 'optional' ? 'Opzionali' : 'Obbligatorie'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Promemoria Automatici */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wide block">
                      Automazioni Promemoria
                    </label>
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={reminderActive}
                          onChange={(e) => setReminderActive(e.target.checked)}
                          className="w-4 h-4 rounded text-[var(--color-primary)] focus:ring-0 cursor-pointer"
                        />
                        <span>Invia notifica promemoria il giorno del check</span>
                      </label>

                      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={secondReminderActive}
                          onChange={(e) => setSecondReminderActive(e.target.checked)}
                          className="w-4 h-4 rounded text-[var(--color-primary)] focus:ring-0 cursor-pointer"
                        />
                        <span>Invia secondo sollecito se il check non viene compilato entro 48h</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* 3. Misure Richieste */}
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wide block">
                    Misure Corporee Richieste all'Atleta
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-300">
                    <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={requiredFields.weight}
                        onChange={(e) => setRequiredFields({ ...requiredFields, weight: e.target.checked })}
                        className="rounded text-[var(--color-primary)]"
                      />
                      <span>Peso (kg)</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={requiredFields.waist}
                        onChange={(e) => setRequiredFields({ ...requiredFields, waist: e.target.checked })}
                        className="rounded text-[var(--color-primary)]"
                      />
                      <span>Circonferenza Vita</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={requiredFields.chest}
                        onChange={(e) => setRequiredFields({ ...requiredFields, chest: e.target.checked })}
                        className="rounded text-[var(--color-primary)]"
                      />
                      <span>Torace</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={requiredFields.hips}
                        onChange={(e) => setRequiredFields({ ...requiredFields, hips: e.target.checked })}
                        className="rounded text-[var(--color-primary)]"
                      />
                      <span>Fianchi</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={requiredFields.biceps}
                        onChange={(e) => setRequiredFields({ ...requiredFields, biceps: e.target.checked })}
                        className="rounded text-[var(--color-primary)]"
                      />
                      <span>Braccia</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={requiredFields.thighs}
                        onChange={(e) => setRequiredFields({ ...requiredFields, thighs: e.target.checked })}
                        className="rounded text-[var(--color-primary)]"
                      />
                      <span>Cosce</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={requiredFields.body_fat}
                        onChange={(e) => setRequiredFields({ ...requiredFields, body_fat: e.target.checked })}
                        className="rounded text-[var(--color-primary)]"
                      />
                      <span>% Grasso Corporeo</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={requiredFields.calves}
                        onChange={(e) => setRequiredFields({ ...requiredFields, calves: e.target.checked })}
                        className="rounded text-[var(--color-primary)]"
                      />
                      <span>Polpacci</span>
                    </label>
                  </div>
                </div>

                {/* 4. Prompt Note Personalizzato */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                    Domanda / Prompt Personalizzato per le Note dell'Atleta
                  </label>
                  <input
                    type="text"
                    value={notesPrompt}
                    onChange={(e) => setNotesPrompt(e.target.value)}
                    placeholder="Es. Come ti senti in questa fase? Segnala note su recupero o aderenza."
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold text-xs focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>

                {/* Footer Salvataggio Configurazione */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveSchedule}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all cursor-pointer shadow-lg shadow-[var(--color-primary)]/20"
                  >
                    <Save className="w-4 h-4" />
                    <span>Salva Regole Rituale per {athleteName}</span>
                  </button>
                </div>

              </div>
            )}
          </div>

          {/* CARDS RIEPILOGATIVE */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <div className="flex justify-between items-center text-slate-400 text-xs mb-2 font-medium">
                <span>Peso Attuale</span>
                <Scale className="w-4 h-4 text-[var(--color-primary)]" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white">
                  {latestMetric?.weight_kg ? `${latestMetric.weight_kg} kg` : '—'}
                </span>
                {weightDelta !== null && (
                  <span
                    className={`text-xs font-bold flex items-center gap-0.5 ${
                      weightDelta <= 0 ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {weightDelta > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {weightDelta > 0 ? `+${weightDelta}` : weightDelta} kg
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                {latestMetric ? `Rilevato il ${new Date(latestMetric.date).toLocaleDateString()}` : 'Nessuna rilevazione'}
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <div className="flex justify-between items-center text-slate-400 text-xs mb-2 font-medium">
                <span>Massa Grassa (% Estimate)</span>
                <Activity className="w-4 h-4 text-sky-400" />
              </div>
              <span className="text-2xl font-black text-white">
                {latestMetric?.body_fat_percentage ? `${latestMetric.body_fat_percentage}%` : '—'}
              </span>
              <p className="text-[10px] text-slate-500 mt-1">Percentuale BF registrata</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <div className="flex justify-between items-center text-slate-400 text-xs mb-2 font-medium">
                <span>Circonferenza Vita</span>
                <Ruler className="w-4 h-4 text-amber-400" />
              </div>
              <span className="text-2xl font-black text-white">
                {latestMetric?.waist_cm ? `${latestMetric.waist_cm} cm` : '—'}
              </span>
              <p className="text-[10px] text-slate-500 mt-1">Misura punto addominale</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <div className="flex justify-between items-center text-slate-400 text-xs mb-2 font-medium">
                <span>Bicipite (Dx / Sx)</span>
                <Dumbbell className="w-4 h-4 text-purple-400" />
              </div>
              <span className="text-2xl font-black text-white">
                {latestMetric?.bicep_right_cm || latestMetric?.bicep_left_cm
                  ? `${latestMetric.bicep_right_cm || '—'} / ${latestMetric.bicep_left_cm || '—'} cm`
                  : '—'}
              </span>
              <p className="text-[10px] text-slate-500 mt-1">Braccia in contrazione</p>
            </div>
          </div>

          {/* TABELLA STORICO CHECK */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[var(--color-primary)]" />
                <span>Storico Misurazioni ({sortedMetrics.length})</span>
              </h3>
            </div>

            {sortedMetrics.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                Nessuna misurazione registrata per {athleteName}. Clicca su "Nuovo Check Misure" per iniziare.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-3">Data</th>
                      <th className="p-3">Peso</th>
                      <th className="p-3">% Grasso</th>
                      <th className="p-3">Vita</th>
                      <th className="p-3">Petto</th>
                      <th className="p-3">Bicipiti (R/L)</th>
                      <th className="p-3">Coscia (R/L)</th>
                      <th className="p-3">Note</th>
                      <th className="p-3 text-right">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-slate-300">
                    {sortedMetrics.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3 font-semibold text-white">
                          {new Date(m.date).toLocaleDateString('it-IT')}
                        </td>
                        <td className="p-3 font-bold text-[var(--color-primary)]">
                          {m.weight_kg ? `${m.weight_kg} kg` : '—'}
                        </td>
                        <td className="p-3">{m.body_fat_percentage ? `${m.body_fat_percentage}%` : '—'}</td>
                        <td className="p-3">{m.waist_cm ? `${m.waist_cm} cm` : '—'}</td>
                        <td className="p-3">{m.chest_cm ? `${m.chest_cm} cm` : '—'}</td>
                        <td className="p-3">
                          {m.bicep_right_cm || m.bicep_left_cm
                            ? `${m.bicep_right_cm || '—'} / ${m.bicep_left_cm || '—'} cm`
                            : '—'}
                        </td>
                        <td className="p-3">
                          {m.thigh_right_cm || m.thigh_left_cm
                            ? `${m.thigh_right_cm || '—'} / ${m.thigh_left_cm || '—'} cm`
                            : '—'}
                        </td>
                        <td className="p-3 max-w-[180px] truncate text-slate-400">{m.notes || '—'}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleDeleteMetric(m.id)}
                            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── SOTTO-TAB STIMA FABBISOGNO & MACRO ─────────────────────── */}
      {activeSubTab === 'fabbisogno' && (
        <EnergyEstimatorSection
          athleteId={athleteId}
          athleteName={athleteName}
          latestMetric={latestMetric}
          athleteBirthDate={athleteBirthDate}
          athleteGender={athleteGender}
          athleteHeightCm={athleteHeightCm}
          onNavigateToFullNutrition={onNavigateToFullNutrition}
        />
      )}

      {/* ─── SOTTO-TAB MASSIMALI & 1RM ────────────────────────────────── */}
      {activeSubTab === 'massimali' && (
        <MaxLiftsSection athleteId={athleteId} athleteName={athleteName} isCoachView={true} />
      )}

      {/* ─── MODALE AGGIUNGI CHECK MISURE ────────────────────────────── */}
      {showMetricModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Scale className="w-4 h-4 text-[var(--color-primary)]" />
                <span>Registra Check Misure - {athleteName}</span>
              </h3>
              <button onClick={() => setShowMetricModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMetric} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Data del Check</label>
                <input
                  type="date"
                  value={metricForm.date}
                  onChange={(e) => setMetricForm({ ...metricForm, date: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:border-[var(--color-primary)] outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Peso (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="es. 75.5"
                    value={metricForm.weight_kg}
                    onChange={(e) => setMetricForm({ ...metricForm, weight_kg: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:border-[var(--color-primary)] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Altezza (cm)</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="es. 178"
                    value={metricForm.height_cm}
                    onChange={(e) => setMetricForm({ ...metricForm, height_cm: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:border-[var(--color-primary)] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">% Grasso (BF)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="es. 12.5"
                    value={metricForm.body_fat_percentage}
                    onChange={(e) => setMetricForm({ ...metricForm, body_fat_percentage: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:border-[var(--color-primary)] outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <span className="text-[11px] font-bold text-[var(--color-primary)] uppercase tracking-wider block mb-2">
                  Circonferenze Corporee (cm)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-500 mb-1">Vita</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="cm"
                      value={metricForm.waist_cm}
                      onChange={(e) => setMetricForm({ ...metricForm, waist_cm: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Petto</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="cm"
                      value={metricForm.chest_cm}
                      onChange={(e) => setMetricForm({ ...metricForm, chest_cm: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Spalle</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="cm"
                      value={metricForm.shoulders_cm}
                      onChange={(e) => setMetricForm({ ...metricForm, shoulders_cm: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Bicipite Dx</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="cm"
                      value={metricForm.bicep_right_cm}
                      onChange={(e) => setMetricForm({ ...metricForm, bicep_right_cm: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Bicipite Sx</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="cm"
                      value={metricForm.bicep_left_cm}
                      onChange={(e) => setMetricForm({ ...metricForm, bicep_left_cm: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Fianchi</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="cm"
                      value={metricForm.hips_cm}
                      onChange={(e) => setMetricForm({ ...metricForm, hips_cm: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Coscia Dx</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="cm"
                      value={metricForm.thigh_right_cm}
                      onChange={(e) => setMetricForm({ ...metricForm, thigh_right_cm: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Coscia Sx</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="cm"
                      value={metricForm.thigh_left_cm}
                      onChange={(e) => setMetricForm({ ...metricForm, thigh_left_cm: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Collo</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="cm"
                      value={metricForm.neck_cm}
                      onChange={(e) => setMetricForm({ ...metricForm, neck_cm: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Note & Osservazioni</label>
                <textarea
                  rows={2}
                  placeholder="Es. Condizione a digiuno, ritenzione da viaggio..."
                  value={metricForm.notes}
                  onChange={(e) => setMetricForm({ ...metricForm, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowMetricModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-black font-bold rounded-xl shadow-lg shadow-[var(--color-primary)]/20 cursor-pointer"
                >
                  Salva Check
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
