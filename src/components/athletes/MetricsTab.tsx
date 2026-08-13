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
  X
} from 'lucide-react';
import { useMetrics } from '../../context/MetricsContext';
import { useToast } from '../../context/ToastContext';
import { MaxLiftsSection } from '../metrics/MaxLiftsSection';

interface MetricsTabProps {
  athleteId: string;
  athleteName: string;
}

export const MetricsTab: React.FC<MetricsTabProps> = ({ athleteId, athleteName }) => {
  const {
    metrics,
    maxLifts,
    fetchMetricsForAthlete,
    addMetric,
    deleteMetric,
    fetchMaxLiftsForAthlete,
  } = useMetrics();

  const { showSuccess, showError } = useToast();

  const [activeSubTab, setActiveSubTab] = useState<'misure' | 'massimali'>('misure');


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
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveSubTab('misure')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'misure'
                ? 'bg-[var(--color-primary)] text-black shadow-md shadow-[var(--color-primary)]/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Misure & Antropometria</span>
          </button>
          <button
            onClick={() => setActiveSubTab('massimali')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'massimali'
                ? 'bg-[var(--color-primary)] text-black shadow-md shadow-[var(--color-primary)]/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Dumbbell className="w-4 h-4" />
            <span>Massimali & 1RM ({maxLifts.length})</span>
          </button>
        </div>

        <div>
          {activeSubTab === 'misure' && (
            <button
              onClick={() => setShowMetricModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-amber-400 text-black font-bold text-xs rounded-xl shadow-lg shadow-[var(--color-primary)]/10 transition-all cursor-pointer"
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
                  className="px-5 py-2 bg-[var(--color-primary)] hover:bg-amber-400 text-black font-bold rounded-xl shadow-lg shadow-[var(--color-primary)]/20"
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
