import React, { useState, useEffect } from 'react';
import {
  ClipboardCheck,
  AlertTriangle,
  Plus,
  Calendar,
  UserCheck,
  CheckCircle2,
  Activity,
  Flame,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAthletes } from '../../context/AthletesContext';
import { useToast } from '../../context/ToastContext';
import { STORAGE_KEYS } from '../../config/storageKeys';
import { getStorageItem, setStorageItem } from '../../lib/storage';
import { MidCheckData } from '../../types';

interface MidCheckViewProps {
  athleteId?: string;
}

export const MidCheckView: React.FC<MidCheckViewProps> = ({ athleteId: initialAthleteId }) => {
  const { athletes } = useAthletes();
  const { showSuccess } = useToast();

  const [selectedAthleteId, setSelectedAthleteId] = useState<string>(initialAthleteId || '');
  const [checksHistory, setChecksHistory] = useState<MidCheckData[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [expandedCheckId, setExpandedCheckId] = useState<string | null>(null);

  // Form stato per nuovo check
  const [newCheck, setNewCheck] = useState<Partial<MidCheckData>>({
    date: new Date().toISOString().split('T')[0],
    plannedWorkouts: 4,
    completedWorkouts: 4,
    trainingAdherencePercent: 100,
    nutritionAdherencePercent: 90,
    fatigueScale: 5,
    domsScale: 4,
    sleepQualityRating: 'buona',
    energyAndMotivationScale: 8,
    perceivedLoad: 'adeguato',
    hasNewJointPain: false,
    newJointPainDetails: '',
    weightKg: 75.5,
    coachNotes: '',
    athleteNotes: '',
  });

  useEffect(() => {
    if (initialAthleteId) {
      setSelectedAthleteId(initialAthleteId);
    }
  }, [initialAthleteId]);

  // Carica i check intermedi salvati per l'atleta selezionato
  useEffect(() => {
    if (selectedAthleteId) {
      const allChecks = getStorageItem<Record<string, MidCheckData[]>>(STORAGE_KEYS.ATHLETE_MID_CHECKS, {});
      const list = allChecks[selectedAthleteId] || [];
      setChecksHistory(list);
    } else {
      setChecksHistory([]);
    }
  }, [selectedAthleteId]);

  // Salva Nuovo Check
  const handleSaveCheck = () => {
    if (!selectedAthleteId) {
      alert('Seleziona un atleta per registrare il Check Intermedio.');
      return;
    }

    const planned = Number(newCheck.plannedWorkouts) || 1;
    const completed = Number(newCheck.completedWorkouts) || 0;
    const computedAdherence = Math.round((completed / planned) * 100);

    const checkToSave: MidCheckData = {
      id: `check-${Date.now()}`,
      athleteId: selectedAthleteId,
      date: newCheck.date || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      filledBy: 'coach',
      plannedWorkouts: planned,
      completedWorkouts: completed,
      trainingAdherencePercent: computedAdherence,
      nutritionAdherencePercent: Number(newCheck.nutritionAdherencePercent) || 85,
      fatigueScale: Number(newCheck.fatigueScale) || 5,
      domsScale: Number(newCheck.domsScale) || 4,
      sleepQualityRating: newCheck.sleepQualityRating || 'buona',
      energyAndMotivationScale: Number(newCheck.energyAndMotivationScale) || 8,
      perceivedLoad: newCheck.perceivedLoad || 'adeguato',
      hasNewJointPain: Boolean(newCheck.hasNewJointPain),
      newJointPainDetails: newCheck.newJointPainDetails || '',
      weightKg: Number(newCheck.weightKg) || undefined,
      coachNotes: newCheck.coachNotes || '',
      athleteNotes: newCheck.athleteNotes || '',
    };

    const allChecks = getStorageItem<Record<string, MidCheckData[]>>(STORAGE_KEYS.ATHLETE_MID_CHECKS, {});
    const updatedList = [checkToSave, ...(allChecks[selectedAthleteId] || [])];
    allChecks[selectedAthleteId] = updatedList;
    setStorageItem(STORAGE_KEYS.ATHLETE_MID_CHECKS, allChecks);

    setChecksHistory(updatedList);
    setIsModalOpen(false);
    showSuccess('Check Intermedio Registrato', `Registrata aderenza del ${computedAdherence}% per l'atleta.`);
  };

  // Calcola aderenza media complessiva
  const avgTrainingAdherence = checksHistory.length
    ? Math.round(
        checksHistory.reduce((acc, c) => acc + c.trainingAdherencePercent, 0) / checksHistory.length
      )
    : 100;

  const avgNutritionAdherence = checksHistory.length
    ? Math.round(
        checksHistory.reduce((acc, c) => acc + c.nutritionAdherencePercent, 0) / checksHistory.length
      )
    : 90;

  const hasRecentPainAlert = checksHistory.some((c) => c.hasNewJointPain);
  const isLowAdherenceAlert = avgTrainingAdherence < 80;

  return (
    <div className="space-y-6">
      {/* TESTATA & SELETTORE ATLETA */}
      <div className="p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-[var(--color-primary)]" /> Check Intermedio & Monitoraggio Aderenza
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Registro periodico dei controlli d'aderenza: sessioni svolte, rispetto macro, recupero e fastidi articolari.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* SELETTORE ATLETA */}
          <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800 shrink-0">
            <UserCheck className="w-4 h-4 text-[var(--color-primary)] shrink-0 ml-1" />
            <select
              value={selectedAthleteId}
              onChange={(e) => setSelectedAthleteId(e.target.value)}
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer pr-2"
            >
              <option value="" className="bg-slate-900 text-slate-300">-- Seleziona Atleta Target --</option>
              {athletes.map((a) => (
                <option key={a.id} value={a.id} className="bg-slate-900 text-white">
                  {a.firstName} {a.lastName}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Nuovo Check Intermedio
          </button>
        </div>
      </div>

      {/* ALERT SEGNALAZIONI CRITICHE */}
      {(hasRecentPainAlert || isLowAdherenceAlert) && (
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-800/60 shadow-lg flex items-center justify-between gap-3 text-amber-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
            <div className="text-xs">
              <span className="font-bold text-amber-300 uppercase tracking-wider block">Avviso di Monitoraggio:</span>
              {isLowAdherenceAlert && (
                <p>· Aderenza all'allenamento sotto l'80% ({avgTrainingAdherence}% media attuale).</p>
              )}
              {hasRecentPainAlert && (
                <p>· L'atleta ha segnalato nuovi fastidi articolari durante l'esecuzione degli esercizi.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* WIDGET METRICHE ADERENZA MEDIA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Aderenza Workout</span>
            <div className="text-xl font-black text-emerald-400 mt-1 font-mono">{avgTrainingAdherence}%</div>
          </div>
          <Activity className="w-8 h-8 text-emerald-400/30" />
        </div>

        <div className="p-4 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Aderenza Alimentazione</span>
            <div className="text-xl font-black text-sky-400 mt-1 font-mono">{avgNutritionAdherence}%</div>
          </div>
          <Flame className="w-8 h-8 text-sky-400/30" />
        </div>

        <div className="p-4 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Totale Check Effettuati</span>
            <div className="text-xl font-black text-white mt-1 font-mono">{checksHistory.length}</div>
          </div>
          <CheckCircle2 className="w-8 h-8 text-[var(--color-primary)]/30" />
        </div>
      </div>

      {/* STORICO CRONOLOGICO DEI CHECK INTERMEDII */}
      <div className="p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center justify-between">
          <span>Storico Valutazioni Intermedie</span>
          <span className="text-[10px] text-slate-400 font-mono">{checksHistory.length} Registrazioni</span>
        </h4>

        {checksHistory.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            Nessun Check Intermedio registrato per questo atleta. Clicca su "Nuovo Check Intermedio".
          </div>
        ) : (
          <div className="space-y-3">
            {checksHistory.map((check) => {
              const isExpanded = expandedCheckId === check.id;

              return (
                <div
                  key={check.id}
                  className="rounded-xl bg-slate-950 border border-slate-800 p-4 transition-all"
                >
                  <div
                    onClick={() => setExpandedCheckId(isExpanded ? null : check.id)}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-[var(--color-primary)]" />
                      <div>
                        <span className="text-xs font-bold text-white block">
                          Check del {new Date(check.date).toLocaleDateString('it-IT')}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Completed: {check.completedWorkouts}/{check.plannedWorkouts} Workout ({check.trainingAdherencePercent}%)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {check.hasNewJointPain && (
                        <span className="px-2 py-0.5 rounded-full bg-red-950 text-red-400 border border-red-800 text-[10px] font-bold">
                          Fastidi Articolari
                        </span>
                      )}
                      <span className="text-xs font-bold text-emerald-400 font-mono">
                        Nutrizione: {check.nutritionAdherencePercent}%
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-3 border-t border-slate-900 text-xs space-y-2 text-slate-300">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                        <div><strong>Fatica (1-10):</strong> {check.fatigueScale}</div>
                        <div><strong>DOMS (1-10):</strong> {check.domsScale}</div>
                        <div><strong>Qualità Sonno:</strong> {check.sleepQualityRating}</div>
                        <div><strong>Carico Percepito:</strong> {check.perceivedLoad}</div>
                      </div>
                      {check.newJointPainDetails && (
                        <p className="text-red-300 bg-red-950/40 p-2 rounded-lg border border-red-900/40">
                          <strong>Note Fastidi:</strong> {check.newJointPainDetails}
                        </p>
                      )}
                      {check.coachNotes && (
                        <p className="italic text-slate-400">
                          <strong>Note Coach:</strong> {check.coachNotes}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODALE NUOVO CHECK INTERMEDIO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-[var(--color-primary)]" /> Registra Nuovo Check Intermedio
            </h4>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Data Check</label>
                <input
                  type="date"
                  value={newCheck.date}
                  onChange={(e) => setNewCheck({ ...newCheck, date: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Peso Rilevato (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={newCheck.weightKg || ''}
                  onChange={(e) => setNewCheck({ ...newCheck, weightKg: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Workout Pianificati</label>
                <input
                  type="number"
                  value={newCheck.plannedWorkouts}
                  onChange={(e) => setNewCheck({ ...newCheck, plannedWorkouts: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Workout Completati</label>
                <input
                  type="number"
                  value={newCheck.completedWorkouts}
                  onChange={(e) => setNewCheck({ ...newCheck, completedWorkouts: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 block">Hai riscontrato NUOVI fastidi articolari?</label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-200 cursor-pointer">
                  <input
                    type="radio"
                    name="pain"
                    checked={!newCheck.hasNewJointPain}
                    onChange={() => setNewCheck({ ...newCheck, hasNewJointPain: false })}
                  />
                  No, nessun fastidio
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-red-400 cursor-pointer">
                  <input
                    type="radio"
                    name="pain"
                    checked={newCheck.hasNewJointPain}
                    onChange={() => setNewCheck({ ...newCheck, hasNewJointPain: true })}
                  />
                  Sì, segnala fastidio
                </label>
              </div>

              {newCheck.hasNewJointPain && (
                <input
                  type="text"
                  placeholder="Dettagli fastidio (es. dolore spalla destra in spinta)..."
                  value={newCheck.newJointPainDetails || ''}
                  onChange={(e) => setNewCheck({ ...newCheck, newJointPainDetails: e.target.value })}
                  className="w-full bg-slate-950 border border-red-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              )}
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Note del Coach / Commenti</label>
              <textarea
                rows={2}
                value={newCheck.coachNotes || ''}
                onChange={(e) => setNewCheck({ ...newCheck, coachNotes: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                placeholder="Commento sull'aderenza o aggiustamenti in scheda..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs font-bold"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleSaveCheck}
                className="px-4 py-2 rounded-xl bg-[var(--color-primary)] text-black text-xs font-bold hover:bg-[var(--color-primary-hover)]"
              >
                Salva Check
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
