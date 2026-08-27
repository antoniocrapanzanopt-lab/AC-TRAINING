import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Save,
  Trash2,
  Dumbbell,
  Plus,
  Minus,
  MessageSquare,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../context/ToastContext';

export interface EditableExerciseSet {
  logId?: string;
  setNumber: number;
  reps: number;
  weightKg: number;
  rpe?: string;
  notes?: string;
}

export interface EditableExerciseGroup {
  exerciseId: string;
  name: string;
  sets: EditableExerciseSet[];
}

export interface EditableWorkoutSession {
  id: string;
  athleteId: string;
  athleteName: string;
  workoutId?: string;
  workoutTitle: string;
  dayName: string;
  weekNumber?: number;
  startTime?: string;
  endTime?: string;
  dateFormatted: string;
  timeFormatted: string;
  durationMinutes: number;
  rpe?: number;
  notes?: string;
  exercises: EditableExerciseGroup[];
}

interface CoachWorkoutSessionEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: EditableWorkoutSession | null;
  athleteName: string;
  onSessionSaved: () => Promise<void> | void;
}

export const CoachWorkoutSessionEditModal: React.FC<CoachWorkoutSessionEditModalProps> = ({
  isOpen,
  onClose,
  session,
  athleteName,
  onSessionSaved,
}) => {
  const { showSuccess, showError } = useToast();

  const [rpe, setRpe] = useState<number>(8);
  const [sessionNotes, setSessionNotes] = useState<string>('');
  const [exercises, setExercises] = useState<EditableExerciseGroup[]>([]);
  const [deletedLogIds, setDeletedLogIds] = useState<string[]>([]);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    if (session) {
      setRpe(session.rpe !== undefined && session.rpe !== null ? Number(session.rpe) : 8);
      setSessionNotes(session.notes || '');
      // Deep clone exercises to avoid mutating original state
      const clonedExercises: EditableExerciseGroup[] = session.exercises.map((ex) => ({
        exerciseId: ex.exerciseId,
        name: ex.name,
        sets: ex.sets.map((s) => ({
          logId: s.logId,
          setNumber: s.setNumber,
          reps: s.reps,
          weightKg: s.weightKg,
          rpe: s.rpe || '',
          notes: s.notes || '',
        })),
      }));
      setExercises(clonedExercises);
      setDeletedLogIds([]);
      setShowConfirmDelete(false);
    }
  }, [session, isOpen]);

  if (!isOpen || !session) return null;

  // Modifica valore set
  const handleUpdateSetField = (
    exIdx: number,
    setIdx: number,
    field: keyof EditableExerciseSet,
    val: string | number
  ) => {
    setExercises((prev) => {
      const next = [...prev];
      const targetEx = { ...next[exIdx] };
      const targetSets = [...targetEx.sets];
      targetSets[setIdx] = {
        ...targetSets[setIdx],
        [field]: val,
      };
      targetEx.sets = targetSets;
      next[exIdx] = targetEx;
      return next;
    });
  };

  // Aggiungi una serie ad un esercizio
  const handleAddSet = (exIdx: number) => {
    setExercises((prev) => {
      const next = [...prev];
      const targetEx = { ...next[exIdx] };
      const lastSet = targetEx.sets[targetEx.sets.length - 1];
      const newSetNumber = targetEx.sets.length + 1;
      const newSet: EditableExerciseSet = {
        setNumber: newSetNumber,
        reps: lastSet ? lastSet.reps : 10,
        weightKg: lastSet ? lastSet.weightKg : 0,
        rpe: lastSet?.rpe || '',
        notes: '',
      };
      targetEx.sets = [...targetEx.sets, newSet];
      next[exIdx] = targetEx;
      return next;
    });
  };

  // Rimuovi una serie
  const handleRemoveSet = (exIdx: number, setIdx: number) => {
    setExercises((prev) => {
      const next = [...prev];
      const targetEx = { ...next[exIdx] };
      const setToRemove = targetEx.sets[setIdx];
      if (setToRemove.logId) {
        setDeletedLogIds((prevDeleted) => [...prevDeleted, setToRemove.logId!]);
      }
      const remainingSets = targetEx.sets
        .filter((_, idx) => idx !== setIdx)
        .map((s, idx) => ({
          ...s,
          setNumber: idx + 1,
        }));
      targetEx.sets = remainingSets;
      next[exIdx] = targetEx;
      return next;
    });
  };

  // Salvataggio modifiche
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 1. Aggiorna workout_sessions (rpe e note questionario)
      const { error: sessionUpdateError } = await supabase
        .from('workout_sessions')
        .update({
          rpe: rpe > 0 ? rpe : null,
          notes: sessionNotes.trim() || null,
        })
        .eq('id', session.id);

      if (sessionUpdateError) {
        throw new Error(`Errore aggiornamento sessione: ${sessionUpdateError.message}`);
      }

      // 2. Elimina log contrassegnati per rimozione
      if (deletedLogIds.length > 0) {
        const { error: deleteLogsError } = await supabase
          .from('exercise_logs')
          .delete()
          .in('id', deletedLogIds);

        if (deleteLogsError) {
          console.warn('Errore eliminazione log rimossi:', deleteLogsError.message);
        }
      }

      // 3. Upsert / Update dei log serie modificati o nuovi
      for (const ex of exercises) {
        for (const s of ex.sets) {
          const notesText = s.notes ? s.notes.trim() : '';
          const finalNote = s.rpe ? `RPE: ${s.rpe}${notesText ? ` | ${notesText}` : ''}` : notesText;

          if (s.logId) {
            // Aggiorna log esistente
            const { error: updateLogError } = await supabase
              .from('exercise_logs')
              .update({
                set_number: s.setNumber,
                reps_completed: Number(s.reps) || 0,
                weight_kg: Number(s.weightKg) || 0,
                notes: finalNote || null,
              })
              .eq('id', s.logId);

            if (updateLogError) {
              console.warn(`Errore aggiornamento log ${s.logId}:`, updateLogError.message);
            }
          } else if (ex.exerciseId) {
            // Inserisci nuovo log
            const { error: insertLogError } = await supabase
              .from('exercise_logs')
              .insert({
                session_id: session.id,
                exercise_id: ex.exerciseId,
                set_number: s.setNumber,
                reps_completed: Number(s.reps) || 0,
                weight_kg: Number(s.weightKg) || 0,
                notes: finalNote || null,
              });

            if (insertLogError) {
              console.warn('Errore inserimento nuovo set log:', insertLogError.message);
            }
          }
        }
      }

      // 4. Aggiorna backup locale istantaneo se presente nel client
      try {
        const localLogs = JSON.parse(localStorage.getItem('builder_local_logs_backup') || '[]');
        const updatedLocal = localLogs.filter((l: { session_id?: string }) => l.session_id !== session.id);
        localStorage.setItem('builder_local_logs_backup', JSON.stringify(updatedLocal));
      } catch (_) {}

      showSuccess('Seduta e carichi aggiornati con successo!');
      await onSessionSaved();
      onClose();
    } catch (err: unknown) {
      console.error('Errore salvataggio correzione seduta:', err);
      showError(err instanceof Error ? err.message : 'Impossibile salvare le modifiche alla seduta.');
    } finally {
      setIsSaving(false);
    }
  };

  // Eliminazione completa seduta
  const handleDeleteSession = async () => {
    setIsDeleting(true);
    try {
      const { error: delError } = await supabase
        .from('workout_sessions')
        .delete()
        .eq('id', session.id);

      if (delError) {
        throw new Error(delError.message);
      }

      // Pulisci local storage
      try {
        const localSessions = JSON.parse(localStorage.getItem('builder_local_sessions_backup') || '[]');
        const filtered = localSessions.filter((s: { id?: string }) => s.id !== session.id);
        localStorage.setItem('builder_local_sessions_backup', JSON.stringify(filtered));
      } catch (_) {}

      showSuccess('Seduta eliminata con successo dalla cronologia.');
      await onSessionSaved();
      onClose();
    } catch (err: unknown) {
      console.error('Errore eliminazione seduta:', err);
      showError(err instanceof Error ? err.message : 'Impossibile eliminare la seduta.');
    } finally {
      setIsDeleting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-800 bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-black text-white tracking-tight">
                  Correggi Seduta di Allenamento
                </h3>
                <span className="text-[11px] font-bold text-amber-400 bg-amber-500/15 px-2.5 py-0.5 rounded-lg border border-amber-500/30">
                  {athleteName}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                {session.workoutTitle} • {session.dayName} {session.weekNumber ? `• Sett. ${session.weekNumber}` : ''} • {session.dateFormatted}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Scrollabile */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Parametri Globali Sessione: RPE & Note Questionario */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
            {/* RPE Sessione */}
            <div className="md:col-span-4 space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center justify-between">
                <span>RPE Sessione (1 - 10)</span>
                <span className="text-sm font-black font-mono text-amber-400">{rpe}/10</span>
              </label>
              <input
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={rpe}
                onChange={(e) => setRpe(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono px-0.5">
                <span>1 (Facile)</span>
                <span>5 (Medio)</span>
                <span>10 (Massimale)</span>
              </div>
            </div>

            {/* Note / Feedback Questionario Fine Allenamento */}
            <div className="md:col-span-8 space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                <span>Note / Questionario Atleta</span>
              </label>
              <textarea
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                placeholder="Nessuna nota o feedback per questa seduta..."
                rows={2}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-medium focus:outline-none focus:border-amber-500 transition-colors resize-none placeholder:text-slate-600"
              />
            </div>
          </div>

          {/* Griglia Esercizi e Serie */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-amber-400" />
                <span>Esercizi e Carichi ({exercises.length})</span>
              </h4>
              <span className="text-[11px] text-slate-500 font-medium">
                Modifica i valori numerici per correggere refusi o anomalie
              </span>
            </div>

            {exercises.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                Nessun log dettagliato presente per i singoli esercizi di questa seduta.
              </div>
            ) : (
              <div className="space-y-4">
                {exercises.map((ex, exIdx) => (
                  <div
                    key={ex.exerciseId || exIdx}
                    className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-md"
                  >
                    {/* Intestazione Esercizio */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-xs font-black text-amber-400 font-mono shrink-0">
                          {exIdx + 1}
                        </span>
                        <h5 className="text-sm font-black text-white truncate">
                          {ex.name}
                        </h5>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddSet(exIdx)}
                        className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5 text-amber-400" />
                        <span>Aggiungi Serie</span>
                      </button>
                    </div>

                    {/* Tabella Serie */}
                    <div className="space-y-2">
                      <div className="grid grid-cols-12 gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400 px-2">
                        <span className="col-span-2">SET</span>
                        <span className="col-span-3">CARICO (KG)</span>
                        <span className="col-span-3">REPS</span>
                        <span className="col-span-3">RPE / NOTE</span>
                        <span className="col-span-1 text-center">AZIONI</span>
                      </div>

                      {ex.sets.map((s, sIdx) => (
                        <div
                          key={s.logId || sIdx}
                          className="grid grid-cols-12 gap-2 items-center p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                        >
                          {/* Numero Set */}
                          <div className="col-span-2 font-mono font-bold text-slate-400 flex items-center gap-1">
                            <span>Set {s.setNumber}</span>
                          </div>

                          {/* Carico kg */}
                          <div className="col-span-3">
                            <div className="relative">
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                max="999"
                                value={s.weightKg}
                                onChange={(e) =>
                                  handleUpdateSetField(
                                    exIdx,
                                    sIdx,
                                    'weightKg',
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-amber-300 font-mono font-black text-xs focus:outline-none focus:border-amber-500"
                              />
                            </div>
                          </div>

                          {/* Reps */}
                          <div className="col-span-3">
                            <input
                              type="number"
                              step="1"
                              min="0"
                              max="999"
                              value={s.reps}
                              onChange={(e) =>
                                handleUpdateSetField(
                                  exIdx,
                                  sIdx,
                                  'reps',
                                  parseInt(e.target.value, 10) || 0
                                )
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-emerald-400 font-mono font-black text-xs focus:outline-none focus:border-amber-500"
                            />
                          </div>

                          {/* RPE / Note Serie */}
                          <div className="col-span-3">
                            <input
                              type="text"
                              placeholder="es. 8.5 o note"
                              value={s.rpe || s.notes || ''}
                              onChange={(e) =>
                                handleUpdateSetField(exIdx, sIdx, 'rpe', e.target.value)
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs focus:outline-none focus:border-amber-500"
                            />
                          </div>

                          {/* Elimina Serie */}
                          <div className="col-span-1 flex justify-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveSet(exIdx, sIdx)}
                              className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Rimuovi serie"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer con Azioni */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          {/* Zona Pericolo: Elimina Seduta */}
          <div>
            {!showConfirmDelete ? (
              <button
                type="button"
                onClick={() => setShowConfirmDelete(true)}
                className="text-xs text-rose-400/80 hover:text-rose-300 flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Elimina Seduta</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-rose-950/40 border border-rose-500/30 p-1.5 px-3 rounded-xl">
                <span className="text-[11px] font-bold text-rose-300">Confermi eliminazione?</span>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteSession}
                  className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] cursor-pointer"
                >
                  {isDeleting ? 'Eliminazione...' : 'Sì, Elimina'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(false)}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] cursor-pointer"
                >
                  Annulla
                </button>
              </div>
            )}
          </div>

          {/* Pulsanti Principali: Annulla & Salva */}
          <div className="flex items-center gap-2.5 self-stretch sm:self-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
            >
              Annulla
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-slate-950 font-black text-xs flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Salvataggio...' : 'Salva Correzioni'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
