import React, { useState, useEffect, useMemo } from 'react';
import {
  Scale,
  Award,
  CheckCircle2,
  User
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAthletes } from '../../context/AthletesContext';
import { useMetrics } from '../../context/MetricsContext';
import { useToast } from '../../context/ToastContext';
import { AthleteMaxLift } from '../../types/metrics';
import { MaxLiftsSection } from '../../components/metrics/MaxLiftsSection';

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
    addMetric
  } = useMetrics();

  const { showSuccess, showError } = useToast();

  const [activeTab, setActiveTab] = useState<'records' | 'checkin'>('records');
  const [overrideAthleteId, setOverrideAthleteId] = useState<string>('');

  // Risoluzione flessibile ed inattaccabile dell'ID dell'atleta
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

  useEffect(() => {
    if (athleteId) {
      fetchMetricsForAthlete(athleteId);
      fetchMaxLiftsForAthlete(athleteId);
    }
  }, [athleteId, fetchMetricsForAthlete, fetchMaxLiftsForAthlete]);

  // Form Check-in Atleta con selezione della data
  const [metricForm, setMetricForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    weight_kg: '',
    body_fat_percentage: '',
    waist_cm: '',
    chest_cm: '',
    bicep_right_cm: '',
    thigh_right_cm: '',
    notes: '',
  });

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

  // Salva nuovo check-in lato atleta
  const handleSaveCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!athleteId) {
      showError('Nessun profilo atleta associato trovato');
      return;
    }

    const hasAnyField = Boolean(
      metricForm.weight_kg ||
      metricForm.body_fat_percentage ||
      metricForm.waist_cm ||
      metricForm.chest_cm ||
      metricForm.bicep_right_cm ||
      metricForm.thigh_right_cm ||
      metricForm.notes
    );

    if (!hasAnyField) {
      showError('Inserisci almeno il peso o un parametro del check-in!');
      return;
    }

    const res = await addMetric({
      athlete_id: athleteId,
      date: metricForm.date || new Date().toISOString().slice(0, 10),
      weight_kg: metricForm.weight_kg ? parseFloat(metricForm.weight_kg) : null,
      body_fat_percentage: metricForm.body_fat_percentage ? parseFloat(metricForm.body_fat_percentage) : null,
      waist_cm: metricForm.waist_cm ? parseFloat(metricForm.waist_cm) : null,
      chest_cm: metricForm.chest_cm ? parseFloat(metricForm.chest_cm) : null,
      bicep_right_cm: metricForm.bicep_right_cm ? parseFloat(metricForm.bicep_right_cm) : null,
      thigh_right_cm: metricForm.thigh_right_cm ? parseFloat(metricForm.thigh_right_cm) : null,
      notes: metricForm.notes || null,
    });

    if (res.success) {
      showSuccess('Check-in salvato con successo!');
      setMetricForm({
        date: new Date().toISOString().slice(0, 10),
        weight_kg: '',
        body_fat_percentage: '',
        waist_cm: '',
        chest_cm: '',
        bicep_right_cm: '',
        thigh_right_cm: '',
        notes: '',
      });
      setActiveTab('records');
    } else {
      showError(res.error || 'Errore durante il salvataggio del check-in');
    }
  };

  return (
    <div className="space-y-6 pb-6 font-sans">
      {/* Intestazione */}
      <div>
        <h2 className="text-xl font-bold text-white mb-1">I Tuoi Progressi & Record</h2>
        <p className="text-xs text-slate-400">Traccia le tue misure corporee e i tuoi massimali di forza (Formula Brzycki).</p>
      </div>

      {/* SELETTORE ATLETA PER MODALITÀ COACH O ANTEPRIMA */}
      {(!user?.athleteId || user?.role === 'owner' || user?.role === 'coach') && athletes.length > 0 && !targetAthleteId && (
        <div className="bg-slate-900 border border-[var(--color-primary)]/40 p-3.5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-[var(--color-primary)]" />
            <span className="text-xs font-bold text-white">Stai inserendo/visualizzando per:</span>
          </div>
          <select
            value={athleteId || ''}
            onChange={(e) => setOverrideAthleteId(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-bold focus:outline-none focus:border-[var(--color-primary)] w-full sm:w-auto"
          >
            {athletes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.firstName} {a.lastName} ({a.email || 'Senza Email'})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* RIEPILOGO RAPIDO CARD */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex justify-between items-center text-slate-400 text-xs font-medium mb-1">
            <span>Peso Attuale</span>
            <Scale className="w-4 h-4 text-[var(--color-primary)]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">
              {latestMetric?.weight_kg ? `${latestMetric.weight_kg} kg` : '—'}
            </span>
            {weightDelta !== null && (
              <span
                className={`text-[11px] font-bold ${
                  weightDelta <= 0 ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {weightDelta > 0 ? `+${weightDelta}` : weightDelta} kg
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            {latestMetric ? `Aggiornato il ${new Date(latestMetric.date).toLocaleDateString('it-IT')}` : 'Nessun check'}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex justify-between items-center text-slate-400 text-xs font-medium mb-1">
            <span>Miglior PR</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-2xl font-black text-[var(--color-primary)] truncate block">
            {topPRs.length > 0 ? `${topPRs[0].calculated_1rm} kg` : '—'}
          </span>
          <p className="text-[10px] text-slate-500 mt-1 truncate">
            {topPRs.length > 0 ? topPRs[0].exercise_name : 'Nessun record'}
          </p>
        </div>
      </div>

      {/* SOTTO-NAVIGAZIONE TAB MOBILE */}
      <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-bold">
        <button
          onClick={() => setActiveTab('records')}
          className={`flex-1 py-2.5 rounded-lg text-center transition-all ${
            activeTab === 'records'
              ? 'bg-[var(--color-primary)] text-black shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Massimali ({topPRs.length})
        </button>
        <button
          onClick={() => setActiveTab('checkin')}
          className={`flex-1 py-2.5 rounded-lg text-center transition-all ${
            activeTab === 'checkin'
              ? 'bg-[var(--color-primary)] text-black shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Check Misure
        </button>
      </div>

      {/* ─── TAB 1: RECORD PERSONALI & MASSIMALI ──────────────────────── */}
      {activeTab === 'records' && athleteId && (
        <MaxLiftsSection athleteId={athleteId} athleteName={user?.email || 'Atleta'} isCoachView={false} />
      )}

      {/* ─── TAB 2: CHECK-IN MISURE ───────────────────────────────────── */}
      {activeTab === 'checkin' && (
        <div className="space-y-6">
          <form onSubmit={handleSaveCheckin} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Scale className="w-4 h-4 text-[var(--color-primary)]" />
              <span>Registra il tuo Peso & Circonferenze</span>
            </h3>

            {/* SELEZIONE DATA CHECK-IN */}
            <div>
              <label className="block text-xs text-slate-400 font-semibold mb-1">Data del Check-in *</label>
              <input
                type="date"
                value={metricForm.date}
                onChange={(e) => setMetricForm({ ...metricForm, date: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm focus:border-[var(--color-primary)] outline-none font-bold"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-1">Peso Corporeo (kg) *</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="es. 74.5"
                  value={metricForm.weight_kg}
                  onChange={(e) => setMetricForm({ ...metricForm, weight_kg: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm focus:border-[var(--color-primary)] outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-1">% Massa Grassa (BF)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="es. 12"
                  value={metricForm.body_fat_percentage}
                  onChange={(e) => setMetricForm({ ...metricForm, body_fat_percentage: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm focus:border-[var(--color-primary)] outline-none"
                />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <span className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider block">
                Circonferenze (cm)
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Vita (ombelico)</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="cm"
                    value={metricForm.waist_cm}
                    onChange={(e) => setMetricForm({ ...metricForm, waist_cm: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Petto</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="cm"
                    value={metricForm.chest_cm}
                    onChange={(e) => setMetricForm({ ...metricForm, chest_cm: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Bicipite (contratto)</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="cm"
                    value={metricForm.bicep_right_cm}
                    onChange={(e) => setMetricForm({ ...metricForm, bicep_right_cm: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Coscia</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="cm"
                    value={metricForm.thigh_right_cm}
                    onChange={(e) => setMetricForm({ ...metricForm, thigh_right_cm: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 font-semibold mb-1">Note del giorno</label>
              <textarea
                rows={2}
                placeholder="es. Pesata a digiuno dopo il risveglio"
                value={metricForm.notes}
                onChange={(e) => setMetricForm({ ...metricForm, notes: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs outline-none resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[var(--color-primary)] hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl shadow-lg shadow-[var(--color-primary)]/20 transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Salva Check-in</span>
            </button>
          </form>

          {/* Storico Ultimi Check */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Storico I tuoi Check ({sortedMetrics.length})
            </h4>
            {sortedMetrics.map((m) => (
              <div key={m.id} className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-white block">{new Date(m.date).toLocaleDateString('it-IT')}</span>
                  <span className="text-[10px] text-slate-400">
                    {m.waist_cm ? `Vita: ${m.waist_cm}cm ` : ''}
                    {m.bicep_right_cm ? `• Bicipite: ${m.bicep_right_cm}cm` : ''}
                  </span>
                </div>
                <span className="text-base font-black text-[var(--color-primary)]">
                  {m.weight_kg ? `${m.weight_kg} kg` : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
