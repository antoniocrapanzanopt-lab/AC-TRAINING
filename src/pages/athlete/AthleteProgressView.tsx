import React, { useState, useEffect, useMemo } from 'react';
import {
  Scale,
  Award,
  User,
  Calendar,
  Camera,
  Plus,
  Ruler,
  TrendingUp,
  TrendingDown,
  Flame,
  Trash2,
  X,
  ZoomIn,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAthletes } from '../../context/AthletesContext';
import { useMetrics } from '../../context/MetricsContext';
import { useToast } from '../../context/ToastContext';
import { AthleteMaxLift, AthleteProgressPhoto } from '../../types/metrics';
import { MaxLiftsSection } from '../../components/metrics/MaxLiftsSection';
import { AthleteMetricsTrendChart } from '../../components/metrics/AthleteMetricsTrendChart';
import { GuidedMetricsCheckInModal } from '../../components/metrics/GuidedMetricsCheckInModal';
import { AthleteNutritionDashboard } from '../../components/athlete/AthleteNutritionDashboard';
import { AthleteNutritionEstimator } from '../../components/athlete/AthleteNutritionEstimator';
import { BeforeAfterSection } from '../../components/metrics/BeforeAfterSection';

interface AthleteProgressViewProps {
  targetAthleteId?: string;
}

export const AthleteProgressView: React.FC<AthleteProgressViewProps> = ({ targetAthleteId }) => {
  const { user } = useAuth();
  const { athletes } = useAthletes();
  const { showSuccess, showError } = useToast();
  const {
    metrics,
    maxLifts,
    fetchMetricsForAthlete,
    fetchMaxLiftsForAthlete,
    fetchAthleteProgressPhotos,
    deleteMetric,
    getAthleteSchedule,
    getAthleteScheduleState,
    getAthleteProgressPhotos,
  } = useMetrics();

  const [activeTab, setActiveTab] = useState<'checkin' | 'fabbisogno' | 'records' | 'foto'>('checkin');
  const [nutritionSubView, setNutritionSubView] = useState<'piano' | 'stima'>('piano');
  const [overrideAthleteId, setOverrideAthleteId] = useState<string>('');
  const [isGuidedModalOpen, setIsGuidedModalOpen] = useState<boolean>(false);
  const [selectedPreviewPhoto, setSelectedPreviewPhoto] = useState<AthleteProgressPhoto | null>(null);

  // Risoluzione ID Atleta
  const athleteId = useMemo(() => {
    if (overrideAthleteId) return overrideAthleteId;
    if (targetAthleteId) return targetAthleteId;
    if (user?.athleteId) return user.athleteId;
    if (user) {
      const match = athletes.find(
        a => a.id === user.athleteId || (a.email && user.email && a.email.trim().toLowerCase() === user.email.trim().toLowerCase())
      );
      if (match) return match.id;
    }
    return athletes.length > 0 ? athletes[0].id : null;
  }, [overrideAthleteId, targetAthleteId, user, athletes]);

  const currentAthlete = useMemo(() => {
    return athletes.find(a => a.id === athleteId);
  }, [athletes, athleteId]);

  useEffect(() => {
    if (athleteId) {
      fetchMetricsForAthlete(athleteId);
      fetchMaxLiftsForAthlete(athleteId);
      fetchAthleteProgressPhotos(athleteId);
    }
  }, [athleteId, fetchMetricsForAthlete, fetchMaxLiftsForAthlete, fetchAthleteProgressPhotos]);

  // Storico ordinato misurazioni dell'atleta
  const sortedMetrics = useMemo(() => {
    return metrics
      .filter(m => String(m.athlete_id) === String(athleteId))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [metrics, athleteId]);

  const latestMetric = sortedMetrics[0];
  const previousMetric = sortedMetrics[1];

  const weightDelta = useMemo(() => {
    if (!latestMetric?.weight_kg || !previousMetric?.weight_kg) return null;
    return Math.round((latestMetric.weight_kg - previousMetric.weight_kg) * 10) / 10;
  }, [latestMetric, previousMetric]);

  // Configurazione e Stato Rituale Check Misure
  const scheduleConfig = useMemo(() => {
    if (!athleteId) return undefined;
    return getAthleteSchedule(athleteId);
  }, [athleteId, getAthleteSchedule]);

  const scheduleState = useMemo(() => {
    if (!athleteId) {
      return {
        status: 'due_today' as const,
        statusLabel: 'Primo check da effettuare',
        lastCheckDate: null,
        nextCheckDate: new Date().toISOString().slice(0, 10),
        daysDiff: 0,
        frequencyDays: 7,
        isOverdue: false,
        isDueToday: true,
      };
    }
    return getAthleteScheduleState(athleteId, latestMetric?.date || null);
  }, [athleteId, latestMetric, getAthleteScheduleState]);

  // Foto Progressi
  const progressPhotos = useMemo(() => {
    if (!athleteId) return [];
    return getAthleteProgressPhotos(athleteId);
  }, [athleteId, getAthleteProgressPhotos]);

  // Migliori PR per Esercizio dell'atleta
  const topPRs = useMemo(() => {
    const map = new Map<string, AthleteMaxLift>();
    maxLifts
      .filter(l => String(l.athlete_id) === String(athleteId))
      .forEach(lift => {
        const key = lift.exercise_name.trim().toLowerCase();
        const existing = map.get(key);
        if (!existing || lift.calculated_1rm > existing.calculated_1rm) {
          map.set(key, lift);
        }
      });
    return Array.from(map.values()).sort((a, b) => b.calculated_1rm - a.calculated_1rm);
  }, [maxLifts, athleteId]);

  // Formatta date con testo chiaro e compatto
  const formatFriendlyDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return 'Nessuno';
    const d = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(d);
    target.setHours(0, 0, 0, 0);

    const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Oggi';
    if (diffDays === 1) return 'Domani';
    if (diffDays === -1) return 'Ieri';

    return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-32 font-sans">
      {/* Intestazione Pagina */}
      <div className="space-y-1">
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">I Tuoi Progressi & Record</h2>
        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium">
          Monitora la tua evoluzione fisica, i check periodici, il piano nutrizionale e i record di forza.
        </p>
      </div>

      {/* SELETTORE ATLETA PER MODALITÀ COACH O ANTEPRIMA */}
      {(!user?.athleteId || user?.role === 'owner' || user?.role === 'coach') && athletes.length > 0 && !targetAthleteId && (
        <div className="bg-[var(--color-panel)] border border-[var(--color-primary)]/40 p-3 sm:p-3.5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-xs">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
            <span className="text-xs font-extrabold text-slate-900 dark:text-white">Visualizzazione Atleta:</span>
          </div>
          <select
            value={athleteId || ''}
            onChange={(e) => setOverrideAthleteId(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] text-xs font-bold focus:outline-none focus:border-[var(--color-primary)] w-full sm:w-auto cursor-pointer"
          >
            {athletes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.fullName} ({a.email || 'Senza Email'})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* RIEPILOGO RAPIDO CARD (KPI) PER SMARTPHONE */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {/* Peso Attuale */}
        <div className="bg-[var(--color-panel)] border border-[var(--color-panel-border)] p-3.5 sm:p-4 rounded-2xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 text-[11px] font-extrabold uppercase tracking-wider mb-1">
              <span>Peso Attuale</span>
              <Scale className="w-3.5 h-3.5 text-amber-500 dark:text-[var(--color-primary)]" />
            </div>
            <div className="flex items-baseline gap-1.5 sm:gap-2">
              <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
                {latestMetric?.weight_kg ? `${latestMetric.weight_kg} kg` : '—'}
              </span>
              {weightDelta !== null && (
                <span
                  className={`text-[10px] sm:text-[11px] font-extrabold flex items-center ${
                    weightDelta <= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
                  }`}
                >
                  {weightDelta <= 0 ? <TrendingDown className="w-3 h-3 mr-0.5 inline" /> : <TrendingUp className="w-3 h-3 mr-0.5 inline" />}
                  {weightDelta > 0 ? `+${weightDelta}` : weightDelta} kg
                </span>
              )}
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-[var(--color-border)] flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 truncate">
              {latestMetric ? formatFriendlyDate(latestMetric.date) : 'Nessuna pesata'}
            </span>
            {!latestMetric && (
              <button
                type="button"
                onClick={() => setIsGuidedModalOpen(true)}
                className="text-[11px] font-black text-amber-600 dark:text-[var(--color-primary)] hover:underline cursor-pointer"
              >
                + Registra
              </button>
            )}
          </div>
        </div>

        {/* Miglior PR */}
        <div className="bg-[var(--color-panel)] border border-[var(--color-panel-border)] p-3.5 sm:p-4 rounded-2xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 text-[11px] font-extrabold uppercase tracking-wider mb-1">
              <span>Miglior 1RM</span>
              <Award className="w-3.5 h-3.5 text-amber-500 dark:text-[var(--color-primary)]" />
            </div>
            <span className="text-xl sm:text-2xl font-black text-amber-600 dark:text-[var(--color-primary)] font-mono truncate block">
              {topPRs.length > 0 ? `${topPRs[0].calculated_1rm} kg` : '—'}
            </span>
          </div>

          <div className="mt-2 pt-2 border-t border-[var(--color-border)] flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 truncate max-w-[110px] sm:max-w-[140px]">
              {topPRs.length > 0 ? topPRs[0].exercise_name : 'Nessun record'}
            </span>
            {topPRs.length === 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('records')}
                className="text-[11px] font-black text-amber-600 dark:text-[var(--color-primary)] hover:underline cursor-pointer"
              >
                + Aggiungi
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SOTTO-NAVIGAZIONE TAB SIMMETRICA & ERGONOMICA A 4 TAB */}
      <div className="grid grid-cols-4 gap-1.5 bg-[var(--color-surface-strong)] p-1.5 rounded-2xl border border-[var(--color-border)] text-xs font-bold shadow-xs">
        <button
          type="button"
          onClick={() => setActiveTab('checkin')}
          className={`py-2.5 px-1 sm:px-2 rounded-xl text-center transition-all cursor-pointer select-none flex items-center justify-center gap-1 sm:gap-1.5 relative ${
            activeTab === 'checkin'
              ? 'bg-[var(--color-primary)] text-slate-950 font-black shadow-md shadow-[var(--color-primary)]/20'
              : 'text-slate-700 dark:text-slate-300 font-bold hover:text-slate-950 dark:hover:text-white hover:bg-[var(--color-panel)]'
          }`}
        >
          <Ruler className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate text-[11px] sm:text-xs">Misure</span>
          {(scheduleState.isDueToday || scheduleState.isOverdue) && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('fabbisogno')}
          className={`py-2.5 px-1 sm:px-2 rounded-xl text-center transition-all cursor-pointer select-none flex items-center justify-center gap-1 sm:gap-1.5 ${
            activeTab === 'fabbisogno'
              ? 'bg-[var(--color-primary)] text-slate-950 font-black shadow-md shadow-[var(--color-primary)]/20'
              : 'text-slate-700 dark:text-slate-300 font-bold hover:text-slate-950 dark:hover:text-white hover:bg-[var(--color-panel)]'
          }`}
        >
          <Flame className="w-3.5 h-3.5 shrink-0 text-amber-500" />
          <span className="truncate text-[11px] sm:text-xs">Macro</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('records')}
          className={`py-2.5 px-1 sm:px-2 rounded-xl text-center transition-all cursor-pointer select-none flex items-center justify-center gap-1 sm:gap-1.5 ${
            activeTab === 'records'
              ? 'bg-[var(--color-primary)] text-slate-950 font-black shadow-md shadow-[var(--color-primary)]/20'
              : 'text-slate-700 dark:text-slate-300 font-bold hover:text-slate-950 dark:hover:text-white hover:bg-[var(--color-panel)]'
          }`}
        >
          <Award className="w-3.5 h-3.5 shrink-0 text-amber-500" />
          <span className="truncate text-[11px] sm:text-xs">1RM ({topPRs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('foto')}
          className={`py-2.5 px-1 sm:px-2 rounded-xl text-center transition-all cursor-pointer select-none flex items-center justify-center gap-1 sm:gap-1.5 ${
            activeTab === 'foto'
              ? 'bg-[var(--color-primary)] text-slate-950 font-black shadow-md shadow-[var(--color-primary)]/20'
              : 'text-slate-700 dark:text-slate-300 font-bold hover:text-slate-950 dark:hover:text-white hover:bg-[var(--color-panel)]'
          }`}
        >
          <Camera className="w-3.5 h-3.5 shrink-0 text-purple-500" />
          <span className="truncate text-[11px] sm:text-xs">Foto</span>
        </button>
      </div>

      {/* ─── TAB 1: CHECK-IN MISURE & RITUALE PERIODICO GUIDATO ─────────── */}
      {activeTab === 'checkin' && (
        <div className="space-y-4 sm:space-y-6">
          
          {/* 1. CARD IN EVIDENZA: STATO DEL RITUALE CHECK MISURE */}
          <div className={`p-4 sm:p-6 rounded-3xl border shadow-xs space-y-3.5 sm:space-y-4 relative overflow-hidden transition-all ${
            scheduleState.isOverdue
              ? 'bg-rose-50/80 dark:bg-rose-950/20 border-rose-200 dark:border-rose-500/40'
              : scheduleState.isDueToday
              ? 'bg-amber-50/80 dark:bg-amber-950/20 border-amber-200 dark:border-amber-500/40'
              : scheduleState.status === 'completed'
              ? 'bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-500/40'
              : 'bg-[var(--color-panel)] border-[var(--color-panel-border)]'
          }`}>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                    scheduleState.isOverdue
                      ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-500/40'
                      : scheduleState.isDueToday
                      ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/40'
                      : scheduleState.status === 'completed'
                      ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40'
                      : 'bg-sky-100 dark:bg-sky-500/20 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-500/40'
                  }`}>
                    {scheduleState.statusLabel}
                  </span>
                  <span className="text-[11px] text-slate-600 dark:text-slate-400 font-bold">
                    {scheduleConfig?.frequency_days ? `Ogni ${scheduleConfig.frequency_days} giorni` : 'Ogni 7 giorni'}
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  {scheduleState.isDueToday
                    ? 'Check Misure Programmato per Oggi!'
                    : scheduleState.isOverdue
                    ? `Check in ritardo (${Math.abs(scheduleState.daysDiff)} gg fa)`
                    : scheduleState.status === 'completed'
                    ? 'Check completato regolarmente!'
                    : `Prossimo check: ${scheduleState.nextCheckDate ? new Date(scheduleState.nextCheckDate).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Da definire'} (tra ${scheduleState.daysDiff} giorni)`}
                </h3>
                
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium max-w-xl leading-relaxed">
                  {scheduleState.isDueToday
                    ? 'È il momento di inserire peso, circonferenze e foto per monitorare i progressi con il tuo coach.'
                    : scheduleState.isOverdue
                    ? 'Non hai ancora inserito le misurazioni dell\'ultimo periodo. Bastano 2 minuti per rimettersi in pari!'
                    : scheduleState.status === 'completed'
                    ? 'Ottimo lavoro! I tuoi dati sono stati registrati e sincronizzati.'
                    : 'Mantieni la costanza! Il sistema ti avviserà automaticamente quando sarà il momento di compilare il prossimo check.'}
                </p>
              </div>

              {/* Pulsante CTA Primario per Check-in Guidato (Full width su mobile) */}
              <button
                type="button"
                onClick={() => setIsGuidedModalOpen(true)}
                className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 sm:py-3.5 rounded-2xl font-black text-xs sm:text-sm transition-all cursor-pointer shrink-0 shadow-lg active:scale-95 force-text-white ${
                  scheduleState.isOverdue
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30 animate-pulse'
                    : 'bg-amber-400 text-slate-950 hover:bg-amber-500 shadow-amber-400/30'
                }`}
              >
                <Ruler className="w-4 h-4 stroke-[2.5]" />
                <span>
                  {scheduleState.isOverdue
                    ? 'Recupera Check Misure'
                    : scheduleState.isDueToday
                    ? 'Compila Check Oggi'
                    : scheduleState.status === 'completed'
                    ? 'Aggiorna / Nuovo Check'
                    : 'Compila Check Misure'}
                </span>
              </button>
            </div>

            {/* Dettagli sintetici rituale (3 colonne compatte su mobile) */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-800/80 text-xs">
              <div className="bg-white/95 dark:bg-slate-900/70 p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-center sm:text-left shadow-xs">
                <span className="text-[10px] text-slate-600 dark:text-slate-400 uppercase font-extrabold block truncate tracking-wider">Ultimo Check</span>
                <span className="font-black text-slate-900 dark:text-white text-xs sm:text-sm">
                  {formatFriendlyDate(latestMetric?.date)}
                </span>
              </div>

              <div className="bg-white/95 dark:bg-slate-900/70 p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-center sm:text-left shadow-xs">
                <span className="text-[10px] text-slate-600 dark:text-slate-400 uppercase font-extrabold block truncate tracking-wider">Prossimo</span>
                <span className="font-black text-slate-900 dark:text-white text-xs sm:text-sm">
                  {formatFriendlyDate(scheduleState.nextCheckDate)}
                </span>
              </div>

              <div className="bg-white/95 dark:bg-slate-900/70 p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-center sm:text-left shadow-xs">
                <span className="text-[10px] text-slate-600 dark:text-slate-400 uppercase font-extrabold block truncate tracking-wider">Foto</span>
                <span className="font-black text-slate-900 dark:text-white text-xs sm:text-sm truncate block">
                  {scheduleConfig?.photo_requirement === 'mandatory'
                    ? 'Richieste'
                    : scheduleConfig?.photo_requirement === 'optional'
                    ? 'Opzionali'
                    : 'Disattivate'}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Grafico di Trend & Progressione Corporea Ottimizzato Mobile */}
          <AthleteMetricsTrendChart
            metrics={sortedMetrics}
            onOpenCheckIn={() => setIsGuidedModalOpen(true)}
          />

          {/* 3. Galleria Foto Progressi (Se presenti) */}
          {progressPhotos.length > 0 && (
            <div className="p-4 sm:p-6 rounded-3xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] space-y-3.5 shadow-md">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                <h4 className="text-xs sm:text-sm font-black text-[var(--color-text)] flex items-center gap-2">
                  <Camera className="w-4 h-4 text-purple-500" />
                  Galleria Foto Progressi ({progressPhotos.length})
                </h4>
                <span className="text-[10px] text-[var(--color-text-muted)]">Confronto visivo</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                {progressPhotos.map((photo) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => setSelectedPreviewPhoto(photo)}
                    className="relative rounded-2xl overflow-hidden aspect-[3/4] border border-[var(--color-border)] bg-slate-900 group shadow-sm flex flex-col justify-between cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    <img
                      src={photo.image_url}
                      alt={`Foto ${photo.pose}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    
                    {/* Badge Posa in alto */}
                    <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-black/75 backdrop-blur-md text-amber-400 border border-amber-400/40 shadow-md">
                        {photo.pose === 'front' ? 'Frontale' : photo.pose === 'back' ? 'Posteriore' : 'Laterale'}
                      </span>
                    </div>

                    {/* Icona Zoom a comparsa hover */}
                    <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-7 h-7 rounded-full bg-black/70 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-md">
                        <ZoomIn className="w-3.5 h-3.5 text-amber-400" />
                      </div>
                    </div>

                    {/* Barra inferiore con Data Evidente e Icona Calendario */}
                    <div className="force-dark absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-3 pt-6 flex items-center justify-between text-white">
                      <div className="flex items-center gap-1.5 bg-black/60 px-2 py-1 rounded-lg backdrop-blur-sm border border-white/10">
                        <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="text-[11px] font-black tracking-wide text-white">
                          {new Date(photo.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 4. Storico Dettagliato dei Check */}
          <div className="p-4 sm:p-6 rounded-3xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] space-y-3.5 shadow-md">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h4 className="text-xs sm:text-sm font-black text-[var(--color-text)] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[var(--color-primary)]" />
                Storico Misurazioni ({sortedMetrics.length})
              </h4>
              <button
                type="button"
                onClick={() => setIsGuidedModalOpen(true)}
                className="text-xs font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Nuovo Check
              </button>
            </div>

            {sortedMetrics.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <Scale className="w-8 h-8 text-[var(--color-text-muted)] mx-auto" />
                <p className="text-xs sm:text-sm font-bold text-[var(--color-text-muted)]">Nessuna misurazione ancora registrata.</p>
                <p className="text-[11px] text-[var(--color-text-muted)]">Clicca sul pulsante in alto per effettuare il tuo primo check.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {sortedMetrics.map((m, idx) => {
                  const prev = sortedMetrics[idx + 1];
                  const deltaW = prev?.weight_kg && m.weight_kg ? Number((m.weight_kg - prev.weight_kg).toFixed(1)) : null;

                  return (
                    <div
                      key={m.id}
                      className="bg-[var(--color-surface-strong)] border border-[var(--color-border)] p-3.5 sm:p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:border-[var(--color-primary)]/40 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-[var(--color-text)] text-xs sm:text-sm">
                            {new Date(m.date).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          {idx === 0 && (
                            <span className="text-[9px] font-black uppercase tracking-wider bg-[var(--color-primary)]/20 text-[var(--color-primary)] px-2 py-0.5 rounded-full border border-[var(--color-primary)]/30">
                              Ultimo
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-text-muted)]">
                          {m.weight_kg && (
                            <span className="font-bold text-[var(--color-text)]">
                              Peso: <strong className="text-[var(--color-text)] font-mono">{m.weight_kg} kg</strong>
                              {deltaW !== null && (
                                <span className={`ml-1 text-[10px] font-bold ${deltaW <= 0 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                  ({deltaW > 0 ? `+${deltaW}` : deltaW} kg)
                                </span>
                              )}
                            </span>
                          )}
                          {m.body_fat_percentage && (
                            <span>
                              Grasso: <strong className="text-[var(--color-text)] font-mono">{m.body_fat_percentage}%</strong>
                            </span>
                          )}
                          {m.waist_cm && (
                            <span>
                              Vita: <strong className="text-[var(--color-text)] font-mono">{m.waist_cm} cm</strong>
                            </span>
                          )}
                        </div>
                        {m.notes && (
                          <p className="text-[11px] text-[var(--color-text-muted)] italic line-clamp-1 mt-1">
                            "{m.notes}"
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const formattedDate = m.date ? new Date(m.date).toLocaleDateString('it-IT') : '';
                          if (window.confirm(`Vuoi davvero eliminare la misurazione del ${formattedDate}?`)) {
                            deleteMetric(m.id, { athleteId: m.athlete_id, date: m.date?.slice(0, 10) }).then((res) => {
                              if (res.success) {
                                showSuccess('Misurazione eliminata con successo');
                              } else {
                                showError('Errore', res.error || 'Impossibile eliminare la misurazione');
                              }
                            });
                          }
                        }}
                        title="Elimina misurazione"
                        aria-label="Elimina misurazione"
                        className="p-2 text-[var(--color-text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer shrink-0 self-end sm:self-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 2: FABBISOGNO ENERGETICO & MACRO NUTRIZIONALI ───────── */}
      {activeTab === 'fabbisogno' && athleteId && (
        <div className="space-y-4 sm:space-y-6">
          {/* Switch interno: Piano Nutrizionale Attivo / Calcolatore Stima */}
          <div className="flex justify-center">
            <div className="inline-flex bg-[var(--color-surface-strong)] p-1 rounded-2xl border border-[var(--color-border)] gap-1 text-xs shadow-sm">
              <button
                type="button"
                onClick={() => setNutritionSubView('piano')}
                className={`px-3.5 sm:px-5 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  nutritionSubView === 'piano'
                    ? 'bg-[var(--color-primary)] text-slate-950 font-black shadow-md'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                <Flame className="w-4 h-4" />
                <span>Piano Nutrizionale Attivo</span>
              </button>

              <button
                type="button"
                onClick={() => setNutritionSubView('stima')}
                className={`px-3.5 sm:px-5 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  nutritionSubView === 'stima'
                    ? 'bg-[var(--color-primary)] text-slate-950 font-black shadow-md'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                <Scale className="w-4 h-4" />
                <span>Calcolatore Fabbisogno (TDEE/BMR)</span>
              </button>
            </div>
          </div>

          {nutritionSubView === 'piano' ? (
            <AthleteNutritionDashboard
              athleteId={athleteId}
              onOpenEstimator={() => setNutritionSubView('stima')}
            />
          ) : (
            <AthleteNutritionEstimator
              initialWeight={latestMetric?.weight_kg ?? undefined}
              initialHeight={latestMetric?.height_cm ?? undefined}
              initialBodyFat={latestMetric?.body_fat_percentage ?? undefined}
              onSavedAsActive={() => setNutritionSubView('piano')}
            />
          )}
        </div>
      )}

      {/* ─── TAB 3: RECORD PERSONALI & MASSIMALI ──────────────────────── */}
      {activeTab === 'records' && athleteId && (
        <MaxLiftsSection athleteId={athleteId} athleteName={currentAthlete?.fullName || user?.email || 'Atleta'} isCoachView={false} />
      )}

      {/* ─── TAB 4: FOTO PRIMA & DOPO ─────────────────────────────────── */}
      {activeTab === 'foto' && athleteId && (
        <div className="bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-3xl p-4 sm:p-5 shadow-md">
          <BeforeAfterSection athleteId={athleteId} isCoachView={false} />
        </div>
      )}

      {/* MODALE GUIDATA CHECK MISURE */}
      {athleteId && (
        <GuidedMetricsCheckInModal
          isOpen={isGuidedModalOpen}
          onClose={() => setIsGuidedModalOpen(false)}
          athleteId={athleteId}
          athleteName={currentAthlete?.fullName}
          latestMetric={latestMetric}
          scheduleConfig={scheduleConfig}
        />
      )}

      {/* ─── LIGHTBOX MODAL INGRANDIMENTO FOTO PROGRESSO ─── */}
      {selectedPreviewPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setSelectedPreviewPhoto(null)}
        >
          <div
            className="force-dark relative max-w-xl w-full bg-slate-950 border-2 border-amber-400/40 rounded-3xl p-3 sm:p-5 shadow-2xl flex flex-col items-center gap-3 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header con Info e Pulsante Chiudi */}
            <div className="w-full flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-400 text-slate-950">
                  {selectedPreviewPhoto.pose === 'front' ? 'Frontale' : selectedPreviewPhoto.pose === 'back' ? 'Posteriore' : 'Laterale'}
                </span>
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  {new Date(selectedPreviewPhoto.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPreviewPhoto(null)}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                title="Chiudi foto"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Immagine ingrandita */}
            <div className="w-full max-h-[75vh] overflow-hidden rounded-2xl bg-black flex items-center justify-center">
              <img
                src={selectedPreviewPhoto.image_url}
                alt={`Foto ${selectedPreviewPhoto.pose}`}
                className="w-full h-auto max-h-[75vh] object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
