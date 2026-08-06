import React, { useState } from 'react';
import { X, Sparkles, Key, AlertTriangle, Loader2 } from 'lucide-react';
import { useExercises } from '../../context/ExercisesContext';
import { useAthletes } from '../../context/AthletesContext';
import { generateWorkoutWithAI, AIWorkoutExercise, getOpenAIKey, setOpenAIKey } from '../../lib/ai/workoutGenerator';
import { useToast } from '../../context/ToastContext';

interface AICoPilotModalProps {
  onClose: () => void;
  onGenerate: (exercises: AIWorkoutExercise[]) => void;
}

export const AICoPilotModal: React.FC<AICoPilotModalProps> = ({ onClose, onGenerate }) => {
  const { exercises: coachExercises } = useExercises();
  const { athletes } = useAthletes();
  const { showError, showSuccess } = useToast();

  const [hasKey, setHasKey] = useState(!!getOpenAIKey());
  const [apiKeyInput, setApiKeyInput] = useState('');

  // Form State
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('');
  const [goal, setGoal] = useState('Ipertrofia Generale');
  const [weeks, setWeeks] = useState(4);
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [limitations, setLimitations] = useState('');
  const [availableEquipment, setAvailableEquipment] = useState<string[]>(['Palestra Completa']);
  
  // Loading State
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');

  const handleSaveKey = () => {
    if (!apiKeyInput.trim().startsWith('sk-')) {
      showError('Chiave API non valida. Deve iniziare con "sk-".');
      return;
    }
    setOpenAIKey(apiKeyInput);
    setHasKey(true);
    showSuccess('Chiave API salvata con successo.');
  };

  const handleGenerate = async () => {
    if (!hasKey) {
      showError('Devi configurare la chiave API OpenAI per utilizzare il Co-Pilot.');
      return;
    }

    if (!goal.trim()) {
      showError('Inserisci l\'obiettivo principale della scheda.');
      return;
    }

    const selectedAthlete = athletes.find(a => a.id === selectedAthleteId);

    setIsGenerating(true);
    try {
      const generated = await generateWorkoutWithAI(
        {
          athlete: selectedAthlete,
          goal,
          weeks,
          daysPerWeek,
          limitations,
          availableEquipment,
          coachExercises,
        },
        setProgressMsg
      );

      showSuccess('Programma generato con successo!', 'Controlla l\'anteprima nell\'editor.');
      onGenerate(generated);
      onClose();
    } catch (err: any) {
      console.error(err);
      showError('Errore Generazione IA', err.message);
    } finally {
      setIsGenerating(false);
      setProgressMsg('');
    }
  };

  if (!hasKey) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/30">
              <Key className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Configura OpenAI</h2>
              <p className="text-sm text-slate-400">Inserisci la tua API Key per usare l'IA.</p>
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl flex gap-3 mb-6">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200/80 leading-relaxed">
              La chiave API verrà salvata solo sul tuo dispositivo locale (localStorage). 
              Non verrà mai inviata a nessun server al di fuori di OpenAI.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                OpenAI API Key
              </label>
              <input
                type="password"
                placeholder="sk-proj-..."
                value={apiKeyInput}
                onChange={e => setApiKeyInput(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
            <button
              onClick={handleSaveKey}
              className="w-full py-3 bg-[var(--color-primary)] text-black font-extrabold rounded-xl hover:bg-[var(--color-primary-hover)] transition-colors shadow-lg shadow-[var(--color-primary)]/20"
            >
              Salva Chiave API
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-panel-border)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                Workout Co-Pilot IA
              </h2>
              <p className="text-sm text-slate-400">Genera una bozza di programma intelligente.</p>
            </div>
          </div>
          <button onClick={onClose} disabled={isGenerating} className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800 disabled:opacity-50">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 relative">
          
          {isGenerating && (
            <div className="absolute inset-0 z-10 bg-slate-900/90 backdrop-blur flex flex-col items-center justify-center rounded-b-2xl">
              <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">L'IA sta elaborando...</h3>
              <p className="text-sm text-indigo-300 animate-pulse text-center max-w-sm px-6">{progressMsg || 'Generazione in corso...'}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Atleta */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Atleta (Opzionale per personalizzazione)
              </label>
              <select
                value={selectedAthleteId}
                onChange={e => setSelectedAthleteId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">Nessun atleta (Generico)</option>
                {athletes.map(a => (
                  <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>
                ))}
              </select>
            </div>

            {/* Obiettivo */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Obiettivo del Programma
              </label>
              <input
                type="text"
                value={goal}
                onChange={e => setGoal(e.target.value)}
                placeholder="es. Forza Massimale, Ipertrofia Glutei..."
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Settimane
              </label>
              <input
                type="number"
                min="1"
                max="12"
                value={weeks}
                onChange={e => setWeeks(parseInt(e.target.value) || 4)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Giorni a Settimana
              </label>
              <input
                type="number"
                min="1"
                max="7"
                value={daysPerWeek}
                onChange={e => setDaysPerWeek(parseInt(e.target.value) || 3)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Attrezzatura Disponibile
            </label>
            <input
              type="text"
              value={availableEquipment.join(', ')}
              onChange={e => setAvailableEquipment(e.target.value.split(',').map(s => s.trim()))}
              placeholder="es. Bilanciere, Manubri, Corpo Libero"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Limitazioni o Note Specifiche (Opzionale)
            </label>
            <textarea
              value={limitations}
              onChange={e => setLimitations(e.target.value)}
              placeholder="es. Nessun carico diretto sulla colonna, no stacchi."
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500 min-h-[100px] resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[var(--color-panel-border)] bg-slate-900/40 shrink-0 flex justify-end gap-3">
          <button 
            type="button" 
            onClick={onClose} 
            disabled={isGenerating}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-300 hover:text-white border border-slate-700 hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            Annulla
          </button>
          <button 
            type="button" 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-extrabold text-sm uppercase tracking-wide rounded-xl hover:from-indigo-400 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Genera Programma
          </button>
        </div>
      </div>
    </div>
  );
};
