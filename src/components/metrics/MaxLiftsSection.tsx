import React, { useState, useMemo } from 'react';
import {
  Award,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  TrendingUp,
  X,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { AthleteMaxLift } from '../../types/metrics';
import { useMetrics } from '../../context/MetricsContext';
import { useExercises } from '../../context/ExercisesContext';
import { useToast } from '../../context/ToastContext';

export const DEFAULT_FUNDAMENTAL_EXERCISES = [
  'Squat',
  'Panca Piana',
  'Stacco da Terra',
  'Rematore Bilanciere',
  'Military Press',
  'Dips',
  'Trazioni'
];

interface MaxLiftsSectionProps {
  athleteId: string;
  athleteName?: string;
  isCoachView?: boolean;
}

export const MaxLiftsSection: React.FC<MaxLiftsSectionProps> = ({
  athleteId,
  athleteName = 'Atleta',
  isCoachView = false,
}) => {
  const { maxLifts, addMaxLift, deleteMaxLift } = useMetrics();
  const { exercises } = useExercises();
  const { showSuccess, showError } = useToast();

  const [showLiftModal, setShowLiftModal] = useState(false);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);

  // Form State
  const [selectedExerciseOption, setSelectedExerciseOption] = useState<string>('Squat');
  const [customExerciseName, setCustomExerciseName] = useState<string>('');
  const [liftForm, setLiftForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    weight_kg: '',
    reps: '1',
    is_real_1rm: true,
    notes: '',
  });

  // Elenco Esercizi: Per l'atleta solo i 7 Fondamentali (più eventuali storici già salvati), per il Coach l'intero DB
  const availableExercisesList = useMemo(() => {
    const set = new Set<string>(DEFAULT_FUNDAMENTAL_EXERCISES);

    // Se è il Coach, aggiunge l'intero DB esercizi
    if (isCoachView) {
      exercises.forEach(ex => {
        if (ex.name) set.add(ex.name.trim());
      });
    }

    // Includiamo sempre gli esercizi in cui l'atleta ha già uno storico per non nasconderli
    maxLifts
      .filter(l => String(l.athlete_id) === String(athleteId))
      .forEach(l => {
        if (l.exercise_name) set.add(l.exercise_name.trim());
      });

    return Array.from(set);
  }, [exercises, maxLifts, athleteId, isCoachView]);

  // Massimali filtrati per questo atleta
  const athleteMaxLifts = useMemo(() => {
    return maxLifts
      .filter(l => String(l.athlete_id) === String(athleteId))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [maxLifts, athleteId]);

  // Massimali raggruppati per Esercizio con il Top PR
  const exercisesSummary = useMemo(() => {
    const map = new Map<string, { topLift: AthleteMaxLift; count: number; history: AthleteMaxLift[] }>();

    athleteMaxLifts.forEach(lift => {
      const nameKey = lift.exercise_name.trim();
      const lowerKey = nameKey.toLowerCase();
      const existing = map.get(lowerKey);

      if (!existing) {
        map.set(lowerKey, { topLift: lift, count: 1, history: [lift] });
      } else {
        existing.count += 1;
        existing.history.push(lift);
        if (lift.calculated_1rm > existing.topLift.calculated_1rm) {
          existing.topLift = lift;
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => b.topLift.calculated_1rm - a.topLift.calculated_1rm);
  }, [athleteMaxLifts]);

  // Calcolo 1RM stimato in tempo reale nel form
  const liveCalculated1RM = useMemo(() => {
    const weight = parseFloat(liftForm.weight_kg);
    const reps = parseInt(liftForm.reps || '1');
    if (isNaN(weight) || weight <= 0 || isNaN(reps) || reps <= 0) return 0;
    if (reps === 1) return weight;
    const safeReps = Math.min(reps, 36);
    const raw = weight * (36 / (37 - safeReps));
    return Math.round(raw * 10) / 10;
  }, [liftForm.weight_kg, liftForm.reps]);

  // Salvataggio del nuovo PR / Massimale
  const handleSaveLift = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalExerciseName =
      selectedExerciseOption === '__custom__'
        ? customExerciseName.trim()
        : selectedExerciseOption.trim();

    if (!finalExerciseName) {
      showError('Seleziona o digita il nome dell\'esercizio!');
      return;
    }
    if (!liftForm.weight_kg || parseFloat(liftForm.weight_kg) <= 0) {
      showError('Inserisci un carico sollevato valido (kg)!');
      return;
    }

    const weightKg = parseFloat(liftForm.weight_kg);
    const reps = parseInt(liftForm.reps || '1');
    const isReal = reps === 1 || liftForm.is_real_1rm;

    const res = await addMaxLift({
      athlete_id: athleteId,
      exercise_name: finalExerciseName,
      weight_kg: weightKg,
      reps: reps,
      calculated_1rm: liveCalculated1RM || weightKg,
      is_real_1rm: isReal,
      date: liftForm.date || new Date().toISOString().slice(0, 10),
      notes: liftForm.notes || null,
    });

    if (res.success) {
      showSuccess(`Massimale di ${finalExerciseName} salvato con successo!`);
      setShowLiftModal(false);
      setCustomExerciseName('');
      setSelectedExerciseOption(availableExercisesList[0] || 'Squat');
      setLiftForm({
        date: new Date().toISOString().slice(0, 10),
        weight_kg: '',
        reps: '1',
        is_real_1rm: true,
        notes: '',
      });
      // Espandi l'esercizio aggiunto per mostrare il grafico
      setExpandedExercise(finalExerciseName.toLowerCase());
    } else {
      showError(res.error || 'Errore durante il salvataggio del massimale');
    }
  };

  const handleDeleteLift = async (id: string) => {
    if (window.confirm('Sei sicuro di voler eliminare questo record?')) {
      const res = await deleteMaxLift(id);
      if (res.success) showSuccess('Massimale eliminato');
      else showError(res.error || 'Impossibile eliminare il massimale');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Sezione Massimali */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div>
          <h3 className="text-base font-extrabold text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-[var(--color-primary)]" />
            <span>Massimali & Record Personali (1RM)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Traccia l'evoluzione della forza su esercizi fondamentali e personalizzati (Formula di Brzycki).
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowLiftModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--color-primary)] hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl shadow-lg shadow-[var(--color-primary)]/10 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Aggiungi PR / Massimale</span>
        </button>
      </div>

      {/* LISTA CARD ESERCIZI CON GRAFICO ESPANDIBILE */}
      {exercisesSummary.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center space-y-3">
          <Dumbbell className="w-10 h-10 text-slate-600 mx-auto" />
          <h4 className="text-sm font-bold text-slate-300">Nessun massimale registrato</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Non hai ancora registrato record personali per {athleteName}. Clicca su "+ Aggiungi PR" per inserire il primo massimale!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {exercisesSummary.map(({ topLift, count, history }) => {
            const exName = topLift.exercise_name;
            const exKey = exName.toLowerCase();
            const isExpanded = expandedExercise === exKey;

            // Dati ordinati per il grafico (dal più vecchio al più recente)
            const chartData = [...history]
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .map(l => ({
                date: new Date(l.date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
                fullDate: new Date(l.date).toLocaleDateString('it-IT'),
                valore1RM: l.calculated_1rm,
                weightKg: l.weight_kg,
                reps: l.reps,
                isReal: l.is_real_1rm,
                notes: l.notes || '',
              }));

            return (
              <div
                key={exKey}
                className={`bg-slate-900 border transition-all duration-200 rounded-3xl overflow-hidden shadow-lg ${
                  isExpanded
                    ? 'border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/30'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Header Card Esercizio */}
                <div
                  onClick={() => setExpandedExercise(isExpanded ? null : exKey)}
                  className="p-4 sm:p-5 flex items-center justify-between cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)] shrink-0">
                      <Dumbbell className="w-5 h-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-white text-base sm:text-lg truncate">
                          {exName}
                        </h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                          {count} {count === 1 ? 'test' : 'test'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Ultimo test: {new Date(topLift.date).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <div className="text-right">
                      <span className="text-2xl sm:text-3xl font-black text-[var(--color-primary)] block leading-none">
                        {topLift.calculated_1rm} <span className="text-xs font-bold text-slate-400">kg</span>
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        {topLift.is_real_1rm ? '1RM Reale' : '1RM Stimato'}
                      </span>
                    </div>

                    <button type="button" className="p-1 text-slate-400 hover:text-white">
                      {isExpanded ? (
                        <ChevronUp className="w-6 h-6 text-amber-400" />
                      ) : (
                        <ChevronDown className="w-6 h-6 text-slate-500" />
                      )}
                    </button>
                  </div>
                </div>

                {/* CONTENUTO ESPANSO: GRAFICO EVOLUZIONE + STORICO COMPLETO */}
                {isExpanded && (
                  <div className="border-t border-slate-800 bg-slate-950/60 p-4 sm:p-6 space-y-6">
                    {/* Grafico Evoluzione Massimale (1RM vs Tempo) */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-[var(--color-primary)]" />
                          <span>Evoluzione 1RM nel Tempo ({exName})</span>
                        </h5>
                        <span className="text-[10px] text-slate-500 font-semibold">
                          Asse X: Data • Asse Y: Massimale (kg)
                        </span>
                      </div>

                      {chartData.length > 1 ? (
                        <div className="h-56 sm:h-64 w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-3 shadow-inner">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                              <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                              <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: '#0f172a',
                                  borderColor: '#334155',
                                  borderRadius: '12px',
                                  color: '#fff',
                                  fontSize: '12px',
                                }}
                                formatter={(val: any, _name: any, item: any) => [
                                  `${val} kg (1RM)`,
                                  `Sollevati: ${item.payload.weightKg}kg x ${item.payload.reps} reps`,
                                ]}
                                labelFormatter={(label, payload) => {
                                  if (payload && payload[0]) {
                                    return `Data: ${payload[0].payload.fullDate}`;
                                  }
                                  return label;
                                }}
                              />
                              <Line
                                type="monotone"
                                dataKey="valore1RM"
                                stroke="#f59e0b"
                                strokeWidth={3}
                                dot={{ fill: '#f59e0b', r: 5, strokeWidth: 2, stroke: '#0f172a' }}
                                activeDot={{ r: 7, fill: '#fbbf24', stroke: '#fff', strokeWidth: 2 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-center text-xs text-slate-400">
                          Inserisci un secondo test per sbloccare il grafico dell'evoluzione temporale di {exName}.
                        </div>
                      )}
                    </div>

                    {/* Storico Completo di questo Esercizio */}
                    <div className="space-y-2">
                      <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Storico Rilevazioni ({history.length})
                      </h5>
                      <div className="overflow-x-auto rounded-2xl border border-slate-800">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-800">
                            <tr>
                              <th className="p-3">Data</th>
                              <th className="p-3">Carico x Reps</th>
                              <th className="p-3">1RM Calcolato</th>
                              <th className="p-3">Tipo Test</th>
                              <th className="p-3">Note</th>
                              <th className="p-3 text-right">Azioni</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 bg-slate-950 text-slate-300">
                            {history.map(lift => (
                              <tr key={lift.id} className="hover:bg-slate-900/50 transition-colors">
                                <td className="p-3 font-semibold text-white">
                                  {new Date(lift.date).toLocaleDateString('it-IT')}
                                </td>
                                <td className="p-3 font-bold text-slate-200">
                                  {lift.weight_kg} kg × {lift.reps} {lift.reps === 1 ? 'rep' : 'reps'}
                                </td>
                                <td className="p-3 font-extrabold text-[var(--color-primary)]">
                                  {lift.calculated_1rm} kg
                                </td>
                                <td className="p-3">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      lift.is_real_1rm
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                                    }`}
                                  >
                                    {lift.is_real_1rm ? '1RM Reale' : 'Formula Brzycki'}
                                  </span>
                                </td>
                                <td className="p-3 text-slate-400 max-w-[180px] truncate">
                                  {lift.notes || '—'}
                                </td>
                                <td className="p-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteLift(lift.id)}
                                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                                    title="Elimina record"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODALE INSERIMENTO NUOVO MASSIMALE / PR */}
      {showLiftModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in fade-in duration-200">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[var(--color-primary)]/20 text-[var(--color-primary)] flex items-center justify-center">
                  <Dumbbell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Nuovo Massimale / PR</h3>
                  <p className="text-[10px] text-slate-400">Registra una nuova prestazione per {athleteName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLiftModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLift} className="p-5 space-y-4 text-xs sm:text-sm">
              {/* 1. SELEZIONE ESERCIZIO (Dropdown + opzione Crea Nuovo) */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">
                  Esercizio *
                </label>
                <select
                  value={selectedExerciseOption}
                  onChange={(e) => setSelectedExerciseOption(e.target.value)}
                  className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold focus:outline-none focus:border-[var(--color-primary)] transition-colors cursor-pointer"
                >
                  <optgroup label="7 Esercizi Fondamentali">
                    {DEFAULT_FUNDAMENTAL_EXERCISES.map(ex => (
                      <option key={ex} value={ex}>{ex}</option>
                    ))}
                  </optgroup>

                  {availableExercisesList.filter(e => !DEFAULT_FUNDAMENTAL_EXERCISES.includes(e)).length > 0 && (
                    <optgroup label="Altri Esercizi nello Storico">
                      {availableExercisesList.filter(e => !DEFAULT_FUNDAMENTAL_EXERCISES.includes(e)).map(ex => (
                        <option key={ex} value={ex}>{ex}</option>
                      ))}
                    </optgroup>
                  )}

                  {/* La creazione di nuovi esercizi personalizzati è riservata al Coach */}
                  {isCoachView && (
                    <option value="__custom__">➕ Crea nuovo esercizio personalizzato...</option>
                  )}
                </select>

                {/* Input aggiuntivo riservato unicamente al Coach */}
                {isCoachView && selectedExerciseOption === '__custom__' && (
                  <div className="mt-2.5">
                    <input
                      type="text"
                      placeholder="Digita il nome del nuovo esercizio (es. Hip Thrust, Incline Press...)"
                      value={customExerciseName}
                      onChange={(e) => setCustomExerciseName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-amber-500/50 rounded-xl text-white font-semibold focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>
                )}
              </div>

              {/* 2. CARICO (KG) & RIPETIZIONI */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">
                    Carico Sollevato (kg) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="es. 120"
                    value={liftForm.weight_kg}
                    onChange={(e) => setLiftForm({ ...liftForm, weight_kg: e.target.value })}
                    className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-black text-base focus:outline-none focus:border-[var(--color-primary)]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">
                    Ripetizioni (Reps) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    placeholder="1 per 1RM reale"
                    value={liftForm.reps}
                    onChange={(e) => setLiftForm({ ...liftForm, reps: e.target.value })}
                    className="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-black text-base focus:outline-none focus:border-[var(--color-primary)]"
                    required
                  />
                </div>
              </div>

              {/* 3. TIPO 1RM (Selettore 1RM Reale vs 1RM Stimato) */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">
                  Tipo di Test / Massimale
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setLiftForm({ ...liftForm, is_real_1rm: true, reps: '1' })}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                      liftForm.is_real_1rm || liftForm.reps === '1'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    🎯 1RM Reale (1 Rep)
                  </button>

                  <button
                    type="button"
                    onClick={() => setLiftForm({ ...liftForm, is_real_1rm: false, reps: liftForm.reps === '1' ? '5' : liftForm.reps })}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                      !liftForm.is_real_1rm && liftForm.reps !== '1'
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-sm'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    📊 1RM Stimato (Più Reps)
                  </button>
                </div>
              </div>

              {/* PREVIEW LIVE 1RM CALCOLATO */}
              {liveCalculated1RM > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300">1RM Calcolato (Formula Brzycki):</span>
                  <span className="text-lg font-black text-[var(--color-primary)]">{liveCalculated1RM} kg</span>
                </div>
              )}

              {/* 4. DATA DELLA PRESTAZIONE (Default ad oggi) */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>Data della Prestazione *</span>
                </label>
                <input
                  type="date"
                  value={liftForm.date}
                  onChange={(e) => setLiftForm({ ...liftForm, date: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold focus:outline-none focus:border-[var(--color-primary)]"
                  required
                />
              </div>

              {/* NOTE OPZIONALI */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">
                  Note & Osservazioni Tecniche
                </label>
                <textarea
                  rows={2}
                  placeholder="Es. Chiuso pulito con fermo al petto, RIR 0..."
                  value={liftForm.notes}
                  onChange={(e) => setLiftForm({ ...liftForm, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-[var(--color-primary)] resize-none"
                />
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowLiftModal(false)}
                  className="px-4 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl hover:text-white transition-colors cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[var(--color-primary)] hover:bg-amber-400 text-black font-extrabold rounded-xl shadow-lg shadow-[var(--color-primary)]/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Salva Massimale</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
