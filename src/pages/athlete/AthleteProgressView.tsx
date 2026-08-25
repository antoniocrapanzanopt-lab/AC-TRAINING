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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAthletes } from '../../context/AthletesContext';
import { useMetrics } from '../../context/MetricsContext';
import { AthleteMaxLift } from '../../types/metrics';
import { MaxLiftsSection } from '../../components/metrics/MaxLiftsSection';
import { AthleteMetricsTrendChart } from '../../components/metrics/AthleteMetricsTrendChart';
import { GuidedMetricsCheckInModal } from '../../components/metrics/GuidedMetricsCheckInModal';
import { AthleteNutritionDashboard } from '../../components/athlete/AthleteNutritionDashboard';
import { AthleteNutritionEstimator } from '../../components/athlete/AthleteNutritionEstimator';

interface AthleteProgressViewProps {
  targetAthleteId?: string;
}

export const AthleteProgressView: React.FC<AthleteProgressViewProps> = ({ targetAthleteId }) => {
  const { user } = useAuth();
  const { athletes } = useAthletes();
  const {
    metrics,
    maxLifts,
    fetchMetricsForAthlete,
    fetchMaxLiftsForAthlete,
    getAthleteSchedule,
    getAthleteScheduleState,
    getAthleteProgressPhotos,
  } = useMetrics();

  const [activeTab, setActiveTab] = useState<'checkin' | 'fabbisogno' | 'records'>('checkin');
  const [nutritionSubView, setNutritionSubView] = useState<'piano' | 'stima'>('piano');
  const [overrideAthleteId, setOverrideAthleteId] = useState<string>('');
  const [isGuidedModalOpen, setIsGuidedModalOpen] = useState<boolean>(false);

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
    }
  }, [athleteId, fetchMetricsForAthlete, fetchMaxLiftsForAthlete]);

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
        <h2 className="text-xl sm:text-2xl font-black text-[var(--color-text)] tracking-tight">I Tuoi Progressi & Record</h2>
        <p className="text-xs text-[var(--color-text-muted)]">
          Monitora la tua evoluzione fisica, i check periodici, il piano nutrizionale e i record di forza.
        </p>
      </div>

      {/* SELETTORE ATLETA PER MODALITÀ COACH O ANTEPRIMA */}
      {(!user?.athleteId || user?.role === 'owner' || user?.role === 'coach') && athletes.length > 0 && !targetAthleteId && (
        <div className="bg-[var(--color-panel)] border border-[var(--color-primary)]/40 p-3 sm:p-3.5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-md">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
            <span className="text-xs font-bold text-[var(--color-text)]">Visualizzazione Atleta:</span>
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
        <div className="bg-[var(--color-panel)] border border-[var(--color-panel-border)] p-3.5 sm:p-4 rounded-2xl shadow-md flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center text-[var(--color-text-muted)] text-[11px] font-bold uppercase tracking-wider mb-1">
              <span>Peso Attuale</span>
              <Scale className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            </div>
            <div className="flex items-baseline gap-1.5 sm:gap-2">
              <span className="text-xl sm:text-2xl font-black text-[var(--color-text)] font-mono">
                {latestMetric?.weight_kg ? `${latestMetric.weight_kg} kg` : '—'}
              </span>
              {weightDelta !== null && (
                <span
                  className={`text-[10px] sm:text-[11px] font-bold flex items-center ${
                    weightDelta <= 0 ? 'text-emerald-500' : 'text-amber-500'
                  }`}
                >
                  {weightDelta <= 0 ? <TrendingDown className="w-3 h-3 mr-0.5 inline" /> : <TrendingUp className="w-3 h-3 mr-0.5 inline" />}
                  {weightDelta > 0 ? `+${weightDelta}` : weightDelta} kg
                </span>
              )}
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-[var(--color-border)] flex items-center justify-between">
            <span className="text-[10px] text-[var(--color-text-muted)] truncate">
              {latestMetric ? formatFriendlyDate(latestMetric.date) : 'Nessuna pesata'}
            </span>
            {!latestMetric && (
              <button
                type="button"
                onClick={() => setIsGuidedModalOpen(true)}
                className="text-[10px] font-black text-[var(--color-primary)] hover:underline cursor-pointer"
              >
                + Registra
              </button>
            )}
          </div>
        </div>

        {/* Miglior PR */}
        <div className="bg-[var(--color-panel)] border border-[var(--color-panel-border)] p-3.5 sm:p-4 rounded-2xl shadow-md flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center text-[var(--color-text-muted)] text-[11px] font-bold uppercase tracking-wider mb-1">
              <span>Miglior 1RM</span>
              <Award className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            </div>
            <span className="text-xl sm:text-2xl font-black text-[var(--color-primary)] font-mono truncate block">
              {topPRs.length > 0 ? `${topPRs[0].calculated_1rm} kg` : '—'}
            </span>
          </div>

          <div className="mt-2 pt-2 border-t border-[var(--color-border)] flex items-center justify-between">
            <span className="text-[10px] text-[var(--color-text-muted)] truncate max-w-[110px] sm:max-w-[140px]">
              {topPRs.length > 0 ? topPRs[0].exercise_name : 'Nessun record'}
            </span>
            {topPRs.length === 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('records')}
                className="text-[10px] font-black text-[var(--color-primary)] hover:underline cursor-pointer"
              >
                + Aggiungi
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SOTTO-NAVIGAZIONE TAB SIMMETRICA & ERGONOMICA A 3 TAB */}
      <div className="grid grid-cols-3 gap-1.5 bg-[var(--color-surface-strong)] p-1.5 rounded-2xl border border-[var(--color-border)] text-xs font-bold shadow-sm">
        <button
          type="button"
          onClick={() => setActiveTab('checkin')}
          className={`py-2.5 px-2 sm:px-3 rounded-xl text-center transition-all cursor-pointer select-none flex items-center justify-center gap-1.5 sm:gap-2 relative ${
            activeTab === 'checkin'
              ? 'bg-[var(--color-primary)] text-slate-950 font-black shadow-md shadow-[var(--color-primary)]/20'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-panel)]'
          }`}
        >
          <Ruler className="w-4 h-4 shrink-0" />
          <span className="truncate">Check Misure</span>
          {(scheduleState.isDueToday || scheduleState.isOverdue) && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('fabbisogno')}
          className={`py-2.5 px-2 sm:px-3 rounded-xl text-center transition-all cursor-pointer select-none flex items-center justify-center gap-1.5 sm:gap-2 ${
            activeTab === 'fabbisogno'
              ? 'bg-[var(--color-primary)] text-slate-950 font-black shadow-md shadow-[var(--color-primary)]/20'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-panel)]'
          }`}
        >
          <Flame className="w-4 h-4 shrink-0 text-amber-500" />
          <span className="truncate">Fabbisogno & Macro</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('records')}
          className={`py-2.5 px-2 sm:px-3 rounded-xl text-center transition-all cursor-pointer select-none flex items-center justify-center gap-1.5 sm:gap-2 ${
            activeTab === 'records'
              ? 'bg-[var(--color-primary)] text-slate-950 font-black shadow-md shadow-[var(--color-primary)]/20'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-panel)]'
          }`}
        >
          <Award className="w-4 h-4 shrink-0" />
          <span className="truncate">Massimali ({topPRs.length})</span>
        </button>
      </div>

      {/* ─── TAB 1: CHECK-IN MISURE & RITUALE PERIODICO GUIDATO ─────────── */}
      {activeTab === 'checkin' && (
        <div className="space-y-4 sm:space-y-6">
          
          {/* 1. CARD IN EVIDENZA: STATO DEL RITUALE CHECK MISURE */}
          <div className={`p-4 sm:p-6 rounded-3xl border shadow-lg space-y-3.5 sm:space-y-4 relative overflow-hidden transition-all ${
            scheduleState.isOverdue
              ? 'bg-rose-500/10 border-rose-500/40'
              : scheduleState.isDueToday
              ? 'bg-amber-500/10 border-amber-500/40'
              : scheduleState.status === 'completed'
              ? 'bg-emerald-500/10 border-emerald-500/40'
              : 'bg-[var(--color-panel)] border-[var(--color-panel-border)]'
          }`}>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                    scheduleState.isOverdue
                      ? 'bg-rose-500/20 text-rose-500 border-rose-500/40'
                      : scheduleState.isDueToday
                      ? 'bg-amber-500/20 text-amber-600 border-amber-500/40'
                      : scheduleState.status === 'completed'
                      ? 'bg-emerald-500/20 text-emerald-600 border-emerald-500/40'
                      : 'bg-sky-500/20 text-sky-600 border-sky-500/40'
                  }`}>
                    {scheduleState.statusLabel}
                  </span>
                  <span className="text-[10px] text-[var(--color-text-muted)] font-medium">
                    {scheduleConfig?.frequency_days ? `Ogni ${scheduleConfig.frequency_days} giorni` : 'Ogni 7 giorni'}
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-black text-[var(--color-text)] tracking-tight">
                  {scheduleState.isDueToday
                    ? 'Check Misure Programmato per Oggi!'
                    : scheduleState.isOverdue
                    ? `Check in ritardo (${Math.abs(scheduleState.daysDiff)} gg fa)`
                    : scheduleState.status === 'completed'
                    ? 'Check completato regolarmente!'
                    : `Prossimo check: ${scheduleState.nextCheckDate ? new Date(scheduleState.nextCheckDate).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Da definire'} (tra ${scheduleState.daysDiff} giorni)`}
                </h3>
                
                <p className="text-xs text-[var(--color-text-muted)] max-w-xl leading-relaxed">
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
                className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 sm:py-3.5 rounded-2xl font-black text-xs sm:text-sm transition-all cursor-pointer shrink-0 shadow-lg active:scale-95 ${
                  scheduleState.isOverdue
                    ? 'bg-rose-500 text-white hover:bg-rose-600 shadow-rose-500/30 animate-pulse'
                    : 'bg-[var(--color-primary)] text-slate-950 hover:bg-[var(--color-primary-hover)] shadow-[var(--color-primary)]/30'
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
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--color-border)] text-xs">
              <div className="bg-[var(--color-surface-strong)] p-2 sm:p-2.5 rounded-xl border border-[var(--color-border)] text-center sm:text-left">
                <span className="text-[9px] sm:text-[10px] text-[var(--color-text-muted)] uppercase font-bold block truncate">Ultimo Check</span>
                <span className="font-bold text-[var(--color-text)] text-[11px] sm:text-xs">
                  {formatFriendlyDate(latestMetric?.date)}
                </span>
              </div>

              <div className="bg-[var(--color-surface-strong)] p-2 sm:p-2.5 rounded-xl border border-[var(--color-border)] text-center sm:text-left">
                <span className="text-[9px] sm:text-[10px] text-[var(--color-text-muted)] uppercase font-bold block truncate">Prossimo</span>
                <span className="font-bold text-[var(--color-text)] text-[11px] sm:text-xs">
                  {formatFriendlyDate(scheduleState.nextCheckDate)}
                </span>
              </div>

              <div className="bg-[var(--color-surface-strong)] p-2 sm:p-2.5 rounded-xl border border-[var(--color-border)] text-center sm:text-left">
                <span className="text-[9px] sm:text-[10px] text-[var(--color-text-muted)] uppercase font-bold block truncate">Foto</span>
                <span className="font-bold text-[var(--color-text)] text-[11px] sm:text-xs truncate block">
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

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                {progressPhotos.map((photo) => (
                  <div key={photo.id} className="relative rounded-2xl overflow-hidden aspect-[3/4] border border-[var(--color-border)] bg-[var(--color-surface-strong)] group">
                    <img
                      src={photo.image_url}
                      alt={`Foto ${photo.pose}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2 text-white">
                      <span className="text-[10px] font-black uppercase tracking-wider block text-[var(--color-primary)]">
                        {photo.pose === 'front' ? 'Frontale' : photo.pose === 'back' ? 'Posteriore' : 'Laterale'}
                      </span>
                      <span className="text-[9px] text-slate-300 block">
                        {new Date(photo.date).toLocaleDateString('it-IT')}
                      </span>
                    </div>
                  </div>
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
    </div>
  );
};
