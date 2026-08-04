import React, { useState } from 'react';
import {
  Dumbbell,
  Plus,
  Save,
  Trash2,
  AlertCircle,
  Calendar,
  User,
  Zap,
  Activity,
  Layers,
  X,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { storageService } from '../../services/storageService';

// ─── Tipi di Dati Interfaccia Scheda ──────────────────────────────────────────

export interface WorkoutExerciseRow {
  id: string;
  name: string;
  sets: number;
  targetReps: string;
  loadKg: number;
  targetRpe: number | string;
  executionNotes: string;
  isCompleted?: boolean;
}

export interface WorkoutSheetProps {
  athleteName?: string;
  programPhase?: string;
  currentWeek?: number;
  totalWeeks?: number;
  splitLabel?: string;
  initialExercises?: WorkoutExerciseRow[];
  onSave?: (exercises: WorkoutExerciseRow[]) => void;
}

// ─── Esercizi Predefiniti per la Modale ──────────────────────────────────────

const PRESET_EXERCISES = [
  'Panca Piana Bilanciere',
  'Spinte Manubri Panca Inclinata',
  'Dip alle Parallele Zavorrate',
  'Military Press con Bilanciere',
  'Alzate Laterali Cavi Bassi',
  'French Press Panca Piana',
  'Pushdown Tricipiti Cavo Alto',
  'Squat promozionale Bilanciere',
  'Stacco da Terra Sumo',
  'Lat Machine Presa Inversa',
  'Rematore Bilanciere Busto Flesso',
];

export const WorkoutSheet: React.FC<WorkoutSheetProps> = ({
  athleteName = 'Marco Rossi',
  programPhase = 'Ipertrofia & Forza Massima',
  currentWeek = 3,
  totalWeeks = 8,
  splitLabel = 'Giorno A — Spinta (Push)',
  initialExercises,
  onSave,
}) => {
  const { showSuccess, showInfo } = useToast();

  // Stato iniziale esercizi
  const [exercises, setExercises] = useState<WorkoutExerciseRow[]>(() => {
    if (initialExercises && initialExercises.length > 0) {
      return initialExercises;
    }
    return [
      {
        id: 'ex-1',
        name: 'Panca Piana Bilanciere',
        sets: 4,
        targetReps: '6 - 8',
        loadKg: 85,
        targetRpe: 8,
        executionNotes: 'Fermo al petto 1s, traiettoria diagonale pulita',
        isCompleted: true,
      },
      {
        id: 'ex-2',
        name: 'Spinte Manubri Panca Inclinata (30°)',
        sets: 3,
        targetReps: '8 - 10',
        loadKg: 32,
        targetRpe: 8.5,
        executionNotes: 'Massimo allungamento nel punto inferiore',
        isCompleted: false,
      },
      {
        id: 'ex-3',
        name: 'Military Press Bilanciere',
        sets: 4,
        targetReps: '6 - 8',
        loadKg: 55,
        targetRpe: 8,
        executionNotes: 'Glutei e addome contratti, traiettoria dritta',
        isCompleted: false,
      },
      {
        id: 'ex-4',
        name: 'Alzate Laterali ai Cavi Bassi',
        sets: 3,
        targetReps: '12 - 15',
        loadKg: 12.5,
        targetRpe: 9,
        executionNotes: 'Tensione continua, extra-rotazione leggerissima',
        isCompleted: false,
      },
      {
        id: 'ex-5',
        name: 'French Press Panca Piana Bilanciere EZ',
        sets: 3,
        targetReps: '10 - 12',
        loadKg: 35,
        targetRpe: 8.5,
        executionNotes: 'Gomiti fermi e stretti verso l\'interno',
        isCompleted: false,
      },
    ];
  });

  // Stato Modale Inserimento Esercizio
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newExName, setNewExName] = useState('');
  const [newExSets, setNewExSets] = useState(3);
  const [newExReps, setNewExReps] = useState('8 - 12');
  const [newExLoad, setNewExLoad] = useState(0);
  const [newExRpe, setNewExRpe] = useState('8');
  const [newExNotes, setNewExNotes] = useState('');

  // Modifica in tempo reale dei campi
  const handleUpdateLoad = (id: string, newLoad: number) => {
    setExercises((prev) =>
      prev.map((item) => (item.id === id ? { ...item, loadKg: newLoad } : item))
    );
  };

  const handleUpdateNotes = (id: string, newNotes: string) => {
    setExercises((prev) =>
      prev.map((item) => (item.id === id ? { ...item, executionNotes: newNotes } : item))
    );
  };

  const handleDeleteExercise = (id: string) => {
    setExercises((prev) => prev.filter((item) => item.id !== id));
    showInfo('Esercizio Rimosso', 'L\'esercizio è stato eliminato dalla scheda corrente.');
  };

  // Aggiunta nuovo esercizio
  const handleAddExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExName.trim()) return;

    const newRow: WorkoutExerciseRow = {
      id: `ex-${Date.now()}`,
      name: newExName.trim(),
      sets: newExSets,
      targetReps: newExReps.trim() || '8 - 12',
      loadKg: newExLoad,
      targetRpe: newExRpe.trim() || '8',
      executionNotes: newExNotes.trim() || 'Rispetta il recupero e il TUT',
      isCompleted: false,
    };

    setExercises((prev) => [...prev, newRow]);
    setIsModalOpen(false);
    setNewExName('');
    setNewExLoad(0);
    setNewExNotes('');
    showSuccess('Esercizio Aggiunto!', `"${newRow.name}" inserito nella scheda.`);
  };

  // Salvataggio dei progressi
  const handleSaveProgress = () => {
    // Salvataggio simulato e salvataggio in cache LocalStorage
    storageService.saveData('athlete_workout_current_sheet', exercises);
    if (onSave) {
      onSave(exercises);
    }
    showSuccess(
      'Progressi Salvati con Successo!',
      `Scheda per ${athleteName} aggiornata con ${exercises.length} esercizi.`
    );
  };

  return (
    <div className="min-h-screen bg-[#0b0c10] text-[#edf5e1] p-4 sm:p-6 lg:p-8 font-sans selection:bg-[#f59e0b] selection:text-black">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ─── 1. INTESTAZIONE (HEADER PREMIUM DARK & GOLD) ─────────────────── */}
        <div className="bg-[#1f2833] border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
          {/* Sfondo Decorativo */}
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-[#f59e0b]/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            {/* Dati Atleta e Scheda */}
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#f59e0b]/10 border border-[#f59e0b]/30 flex items-center justify-center text-[#f59e0b] shrink-0 shadow-lg shadow-[#f59e0b]/10">
                <Dumbbell className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                    {splitLabel}
                  </h1>
                  <span className="bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/30 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    In Corso
                  </span>
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Alta Priorità
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                  <span className="flex items-center gap-1.5 text-slate-200 font-semibold">
                    <User className="w-4 h-4 text-[#f59e0b]" /> Atleta: {athleteName}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-sky-400" /> Fase: {programPhase}
                  </span>
                  <span className="flex items-center gap-1.5 font-mono text-[#f59e0b]">
                    <Calendar className="w-4 h-4 text-purple-400" /> Settimana {currentWeek} di {totalWeeks}
                  </span>
                </div>
              </div>
            </div>

            {/* Pulsanti Azione Principali */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-[#edf5e1] font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 border border-slate-700 shadow-md hover:border-[#f59e0b]/50"
              >
                <Plus className="w-4 h-4 text-[#f59e0b]" /> Aggiungi Esercizio
              </button>

              <button
                type="button"
                onClick={handleSaveProgress}
                className="px-6 py-3 rounded-2xl bg-[#f59e0b] hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-xl shadow-[#f59e0b]/20 hover:scale-105 active:scale-95"
              >
                <Save className="w-4 h-4" /> Salva Progressi
              </button>
            </div>
          </div>
        </div>

        {/* ─── 2. TABELLA DESKTOP / CARD GRID MOBILE RESPONSIVE ─────────────── */}
        <div className="bg-[#1f2833] border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#f59e0b]" /> Elenco Esercizi della Sessione ({exercises.length})
            </h2>
            <span className="text-xs font-mono text-slate-400">
              Campi "Carico" e "Note" modificabili in tempo reale
            </span>
          </div>

          {exercises.length === 0 ? (
            <div className="p-12 text-center space-y-3 bg-[#0b0c10]/60 rounded-2xl border border-slate-800">
              <AlertCircle className="w-10 h-10 text-[#f59e0b] mx-auto" />
              <h3 className="text-sm font-bold text-white">Nessun Esercizio in questa Scheda</h3>
              <p className="text-xs text-slate-400">
                Clicca su "Aggiungi Esercizio" in alto per iniziare la compilazione.
              </p>
            </div>
          ) : (
            <>
              {/* VISTA DESKTOP (TABELLA HIGH-CONTRAST) */}
              <div className="hidden lg:block overflow-x-auto rounded-2xl border border-slate-800 bg-[#0b0c10]/80">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900/90 text-[#f59e0b] uppercase text-[11px] font-black tracking-wider border-b border-slate-800">
                      <th className="p-4">#</th>
                      <th className="p-4">Esercizio</th>
                      <th className="p-4 text-center">Serie</th>
                      <th className="p-4 text-center">Reps Target</th>
                      <th className="p-4 w-36">Carico (Kg)</th>
                      <th className="p-4 text-center">RPE Target</th>
                      <th className="p-4">Note Esecuzione & Feedback</th>
                      <th className="p-4 text-center">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 font-medium">
                    {exercises.map((row, index) => (
                      <tr
                        key={row.id}
                        className="hover:bg-slate-800/40 transition-colors group"
                      >
                        <td className="p-4 font-mono font-bold text-[#f59e0b]">
                          {String(index + 1).padStart(2, '0')}
                        </td>
                        <td className="p-4 font-bold text-white text-sm">
                          {row.name}
                        </td>
                        <td className="p-4 text-center font-mono font-bold text-slate-200">
                          {row.sets}
                        </td>
                        <td className="p-4 text-center font-mono font-bold text-slate-300">
                          {row.targetReps}
                        </td>
                        {/* Carico Modificabile */}
                        <td className="p-4">
                          <div className="relative">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              value={row.loadKg}
                              onChange={(e) =>
                                handleUpdateLoad(row.id, parseFloat(e.target.value) || 0)
                              }
                              className="w-full bg-[#1f2833] border border-slate-700 focus:border-[#f59e0b] rounded-xl px-3 py-2 text-sm font-black font-mono text-[#f59e0b] focus:outline-none transition-all shadow-inner"
                            />
                            <span className="absolute right-2.5 top-2.5 text-[10px] text-slate-500 font-bold">
                              KG
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-center font-mono font-extrabold text-amber-400">
                          @{row.targetRpe}
                        </td>
                        {/* Note Modificabili */}
                        <td className="p-4">
                          <input
                            type="text"
                            value={row.executionNotes}
                            onChange={(e) => handleUpdateNotes(row.id, e.target.value)}
                            placeholder="Inserisci note esecuzione..."
                            className="w-full bg-[#1f2833] border border-slate-700/80 focus:border-[#f59e0b] rounded-xl px-3 py-2 text-xs text-[#edf5e1] focus:outline-none transition-all"
                          />
                        </td>
                        {/* Pulsante Elimina */}
                        <td className="p-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteExercise(row.id)}
                            className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition-all"
                            title="Elimina Esercizio"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* VISTA MOBILE (CARD GRID FLUIDA SMARTPHONE) */}
              <div className="lg:hidden space-y-4">
                {exercises.map((row, index) => (
                  <div
                    key={row.id}
                    className="bg-[#0b0c10] border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#f59e0b]/20 border border-[#f59e0b]/40 text-[#f59e0b] font-mono font-black text-xs flex items-center justify-center">
                          {index + 1}
                        </span>
                        <h3 className="text-sm font-black text-white">{row.name}</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteExercise(row.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-[#1f2833] p-2 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Serie</span>
                        <span className="font-mono font-black text-white">{row.sets}</span>
                      </div>
                      <div className="bg-[#1f2833] p-2 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Reps</span>
                        <span className="font-mono font-black text-slate-200">{row.targetReps}</span>
                      </div>
                      <div className="bg-[#1f2833] p-2 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">RPE</span>
                        <span className="font-mono font-black text-[#f59e0b]">@{row.targetRpe}</span>
                      </div>
                    </div>

                    {/* Inputs Mobile */}
                    <div className="space-y-2 pt-1">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Carico Sollevato (kg)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          value={row.loadKg}
                          onChange={(e) =>
                            handleUpdateLoad(row.id, parseFloat(e.target.value) || 0)
                          }
                          className="w-full bg-[#1f2833] border border-slate-700 focus:border-[#f59e0b] rounded-xl px-3 py-2 text-sm font-black font-mono text-[#f59e0b] focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Note Esecuzione
                        </label>
                        <input
                          type="text"
                          value={row.executionNotes}
                          onChange={(e) => handleUpdateNotes(row.id, e.target.value)}
                          className="w-full bg-[#1f2833] border border-slate-700 focus:border-[#f59e0b] rounded-xl px-3 py-2 text-xs text-[#edf5e1] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ─── 3. MODALE AGGIUNGI ESERCIZIO ─────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#1f2833] border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#f59e0b]/10 border border-[#f59e0b]/30 flex items-center justify-center text-[#f59e0b]">
                  <Plus className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">Nuovo Esercizio in Scheda</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddExercise} className="space-y-4 text-xs">
              {/* Nome Esercizio */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold uppercase tracking-wider">
                  Nome Esercizio *
                </label>
                <input
                  type="text"
                  required
                  value={newExName}
                  onChange={(e) => setNewExName(e.target.value)}
                  placeholder="es. Panca Piana Bilanciere"
                  className="w-full bg-[#0b0c10] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#f59e0b]"
                />
                {/* Suggerimenti rapidi */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {PRESET_EXERCISES.slice(0, 4).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setNewExName(preset)}
                      className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded-lg border border-slate-700 transition-colors"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Serie e Reps */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold uppercase tracking-wider">
                    Numero Serie
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={newExSets}
                    onChange={(e) => setNewExSets(parseInt(e.target.value, 10) || 3)}
                    className="w-full bg-[#0b0c10] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#f59e0b]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-bold uppercase tracking-wider">
                    Reps Target
                  </label>
                  <input
                    type="text"
                    value={newExReps}
                    onChange={(e) => setNewExReps(e.target.value)}
                    placeholder="es. 8 - 12"
                    className="w-full bg-[#0b0c10] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#f59e0b]"
                  />
                </div>
              </div>

              {/* Carico e RPE */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold uppercase tracking-wider">
                    Carico Iniziale (kg)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={newExLoad}
                    onChange={(e) => setNewExLoad(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0b0c10] border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono text-[#f59e0b] focus:outline-none focus:border-[#f59e0b]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-bold uppercase tracking-wider">
                    RPE Target
                  </label>
                  <input
                    type="text"
                    value={newExRpe}
                    onChange={(e) => setNewExRpe(e.target.value)}
                    placeholder="es. 8"
                    className="w-full bg-[#0b0c10] border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono text-amber-400 focus:outline-none focus:border-[#f59e0b]"
                  />
                </div>
              </div>

              {/* Note Esecuzione */}
              <div className="space-y-1">
                <label className="text-slate-300 font-bold uppercase tracking-wider">
                  Note Esecuzione
                </label>
                <textarea
                  rows={2}
                  value={newExNotes}
                  onChange={(e) => setNewExNotes(e.target.value)}
                  placeholder="es. Fermo al petto, focus sulla fase eccentrica..."
                  className="w-full bg-[#0b0c10] border border-slate-700 rounded-xl p-3 text-xs text-[#edf5e1] focus:outline-none focus:border-[#f59e0b]"
                />
              </div>

              {/* Pulsanti Modale */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#f59e0b] hover:bg-amber-400 text-black font-black uppercase tracking-wider shadow-lg shadow-[#f59e0b]/20"
                >
                  Inserisci Esercizio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default WorkoutSheet;
