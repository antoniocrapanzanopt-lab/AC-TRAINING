import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Key,
  Check,
  Loader2,
  Save,
  Dumbbell,
  Shield,
  Activity,
  RotateCcw,
  Layers,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { useExercises } from '../../context/ExercisesContext';
import { useToast } from '../../context/ToastContext';
import { ExerciseItem } from '../../types/exercise';
import {
  getActiveGeminiApiKey,
  saveGeminiApiKey,
  optimizeExerciseBiomechanicsWithGemini,
  OptimizedBiomechanicsResult
} from '../../lib/ai/biomechanicsGeminiAssistant';
import { BiomechanicalMovementAnimation } from './BiomechanicalMovementAnimation';
import { AnatomicalMuscleMap } from './AnatomicalMuscleMap';

interface ExerciseBiomechanicsOptimizerModalProps {
  initialExercise?: ExerciseItem | null;
  onClose: () => void;
  onSaved?: (updatedExercise: ExerciseItem) => void;
}

export const ExerciseBiomechanicsOptimizerModal: React.FC<ExerciseBiomechanicsOptimizerModalProps> = ({
  initialExercise,
  onClose,
  onSaved
}) => {
  const { exercises, updateExercise, createExercise } = useExercises();
  const { showSuccess, showError } = useToast();

  // API Key State
  const [apiKey, setApiKey] = useState<string>(() => getActiveGeminiApiKey());
  const [showApiKeyInput, setShowApiKeyInput] = useState<boolean>(!getActiveGeminiApiKey());
  const [isKeyVisible, setIsKeyVisible] = useState<boolean>(false);
  const [keySavedBadge, setKeySavedBadge] = useState<boolean>(false);

  // Exercise Selection
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>(initialExercise?.id || '');
  const [customExerciseName, setCustomExerciseName] = useState<string>(initialExercise?.name || '');
  const [coachNotes, setCoachNotes] = useState<string>('');

  // Generation & Result State
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [result, setResult] = useState<OptimizedBiomechanicsResult | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'muscles' | 'technique' | 'safety'>('preview');

  useEffect(() => {
    if (initialExercise) {
      setSelectedExerciseId(initialExercise.id);
      setCustomExerciseName(initialExercise.name);
    }
  }, [initialExercise]);

  const handleSaveApiKey = () => {
    saveGeminiApiKey(apiKey);
    setKeySavedBadge(true);
    setTimeout(() => setKeySavedBadge(false), 2500);
    showSuccess('Chiave API Gemini Salvata', 'Configurata per le ottimizzazioni biomeccaniche 3.7.');
  };

  const handleSelectExercise = (name: string) => {
    setCustomExerciseName(name);
    const match = exercises.find(e => e.name.toLowerCase() === name.toLowerCase());
    if (match) setSelectedExerciseId(match.id);
    setResult(null);
  };

  const handleGenerate = async () => {
    const nameToOptimize = customExerciseName.trim();
    if (!nameToOptimize) {
      showError('Nome Esercizio Richiesto', 'Inserisci o seleziona il nome dell\'esercizio da analizzare.');
      return;
    }

    setIsGenerating(true);
    try {
      const selectedObj = exercises.find(e => e.id === selectedExerciseId);
      const res = await optimizeExerciseBiomechanicsWithGemini(nameToOptimize, {
        currentCategory: selectedObj?.category,
        currentEquipment: selectedObj?.equipment,
        customApiKey: apiKey,
        specificNotes: coachNotes
      });

      setResult(res);
      showSuccess('Biomeccanica Generata!', `Analisi completata con successo tramite ${res.modelUsed || 'Gemini 3.7 Flash'}.`);
    } catch (err: any) {
      console.error(err);
      showError('Errore Generazione Biomeccanica', err.message || 'Impossibile completare l\'analisi con Gemini.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyToDatabase = async () => {
    if (!result) return;
    setIsSaving(true);
    try {
      const payload: Partial<ExerciseItem> = {
        name: result.name,
        category: result.category,
        equipment: result.equipment,
        instructions: result.instructions,
        tipo: result.tipo,
        bilateralita: result.bilateralita,
        piano_movimento: result.piano_movimento,
        catena_cinetica: result.catena_cinetica,
        gradi_liberta: result.gradi_liberta,
        target_specifico: result.target_specifico,
        pattern_movimento: result.pattern_movimento,
        ruolo_esercizio: result.ruolo_esercizio,
        costo_sistemico: result.costo_sistemico,
        livello_difficolta: result.livello_difficolta,
        muscoli_coinvolti: result.muscoli_coinvolti,
        esecuzione: result.esecuzione,
        parametri_chiave: result.parametri_chiave,
        sicurezza: result.sicurezza
      };

      if (selectedExerciseId) {
        const updateRes = await updateExercise(selectedExerciseId, payload);
        if (!updateRes.success) throw new Error(updateRes.error || 'Errore salvataggio esercizio');
        showSuccess('Esercizio Aggiornato!', `La scheda biomeccanica di "${result.name}" è stata salvata su Supabase.`);
        if (onSaved) {
          const updated = { ...payload, id: selectedExerciseId } as ExerciseItem;
          onSaved(updated);
        }
      } else {
        const createRes = await createExercise(payload);
        if (!createRes.success) throw new Error(createRes.error || 'Errore creazione esercizio');
        showSuccess('Nuovo Esercizio Creato!', `"${result.name}" è stato aggiunto con successo alla tua libreria.`);
      }

      onClose();
    } catch (err: any) {
      console.error(err);
      showError('Errore Salvataggio', err.message || 'Impossibile salvare nel database.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0b0f17] border border-slate-800 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* ── HEADER ── */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-[#0b0f17] via-slate-900/60 to-[#0b0f17]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Ottimizzatore Biomeccanica & Chinesiologia
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/30">
                  Google Gemini 3.7 Flash
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Rigenera vettori di forza, muscoli con percentuali EMG e schemi corretti per l'atleta
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowApiKeyInput(!showApiKeyInput)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                apiKey
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>{apiKey ? 'API Key Attiva' : 'Configura Key'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── API KEY COLLAPSIBLE DRAWER ── */}
        {showApiKeyInput && (
          <div className="p-4 bg-slate-950/90 border-b border-slate-800/80 space-y-2.5 animate-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5" />
                <span>Chiave API Google Gemini (Personale del Coach)</span>
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 font-bold underline"
              >
                <span>Ottieni chiave gratuita su Google AI Studio</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="relative w-full">
                <input
                  type={isKeyVisible ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Incolla qui la tua chiave API (es. AIzaSy...)"
                  className="w-full pl-3.5 pr-10 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setIsKeyVisible(!isKeyVisible)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {isKeyVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                <button
                  type="button"
                  onClick={handleSaveApiKey}
                  className="w-full sm:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  {keySavedBadge ? <Check className="w-3.5 h-3.5 text-slate-950" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{keySavedBadge ? 'Salvata!' : 'Salva Chiave'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── BODY ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* SELEZIONE / INPUT ESERCIZIO */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-900/40 border border-slate-800/80 p-4 rounded-2xl">
            <div className="md:col-span-6 space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>1. Seleziona dalla libreria o digita nuovo nome</span>
                {selectedExerciseId && (
                  <span className="text-[10px] text-emerald-400 font-bold">Esercizio esistente selezionato</span>
                )}
              </label>
              
              <div className="relative">
                <input
                  type="text"
                  value={customExerciseName}
                  onChange={(e) => {
                    setCustomExerciseName(e.target.value);
                    setSelectedExerciseId('');
                  }}
                  placeholder="Es. Panca Piana Bilanciere, Plank Addominale, Lat Machine..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white text-sm font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Suggerimenti veloci */}
              <div className="relative">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 overflow-x-auto pb-1 scrollbar-none">
                  <span className="shrink-0 text-[10px] uppercase font-bold text-slate-500">Rapidi:</span>
                  {['Plank Addominale', 'Squat con Bilanciere', 'Panca Piana', 'Lat Machine Presa Larga', 'Stacco da Terra', 'Military Press', 'Curl Bicipiti Manubri'].map(name => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => handleSelectExercise(name)}
                      className="px-2 py-0.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white shrink-0 cursor-pointer text-[11px] border border-slate-700/50"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="md:col-span-6 space-y-2">
              <label className="text-xs font-bold text-slate-300">
                <span>2. Note o focus specifici del Coach (Opzionale)</span>
              </label>
              <input
                type="text"
                value={coachNotes}
                onChange={(e) => setCoachNotes(e.target.value)}
                placeholder="Es. Focus allungamento fascio clavicolare, fermo al petto di 2 secondi, variante corpo libero..."
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-amber-500"
              />

              <div className="pt-1 flex justify-end">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating || !customExerciseName.trim()}
                  className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Elaborazione Biomeccanica con Gemini 3.7...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Analizza & Genera con Gemini 3.7</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* RISULTATO GENERATO */}
          {result && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {/* SUMMARY BADGES */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900/80 to-slate-900/80 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-black text-white">{result.name}</h4>
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {result.category}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {result.pattern_movimento}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium">
                    {result.instructions}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleApplyToDatabase}
                    disabled={isSaving}
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl transition-all shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>Salva & Applica nel Database</span>
                  </button>
                </div>
              </div>

              {/* TAB CONTROLS */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'preview'
                      ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Cinematica 2D/3D</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('muscles')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'muscles'
                      ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Dumbbell className="w-3.5 h-3.5" />
                  <span>Mappa Muscolare ({result.muscoli_coinvolti.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('technique')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'technique'
                      ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Esecuzione & Vettori</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('safety')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'safety'
                      ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Sicurezza & Compensi</span>
                </button>
              </div>

              {/* TAB CONTENT: PREVIEW */}
              {activeTab === 'preview' && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-7">
                    <BiomechanicalMovementAnimation
                      exerciseName={result.name}
                      pattern={result.pattern_movimento}
                      category={result.category}
                    />
                  </div>
                  <div className="md:col-span-5 space-y-3 bg-slate-900/60 border border-slate-800 p-4 rounded-3xl">
                    <h5 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" /> Parametri Biomeccanici
                    </h5>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                        <span className="text-[10px] text-slate-500 font-bold block">CATENA CINETICA</span>
                        <span className="font-bold text-white">{result.catena_cinetica}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                        <span className="text-[10px] text-slate-500 font-bold block">PIANO MOVIMENTO</span>
                        <span className="font-bold text-white">{result.piano_movimento}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                        <span className="text-[10px] text-slate-500 font-bold block">CURVA RESISTENZA</span>
                        <span className="font-bold text-white">{result.parametri_chiave.curva_resistenza}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                        <span className="text-[10px] text-slate-500 font-bold block">BILATERALITÀ</span>
                        <span className="font-bold text-white">{result.bilateralita}</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold block">PUNTO DI PICCO TENSIONE</span>
                      <p className="text-xs text-amber-300 font-medium">{result.parametri_chiave.punto_picco}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold block">TUT & RECUPERO CONSIGLIATO</span>
                      <p className="text-xs text-slate-300">
                        TUT: <strong>{result.parametri_chiave.tut?.min}-{result.parametri_chiave.tut?.max}s</strong> | Riposo: <strong>{result.parametri_chiave.recupero?.min}-{result.parametri_chiave.recupero?.max}s</strong>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: MUSCLES */}
              {activeTab === 'muscles' && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-6 bg-slate-950 p-4 rounded-3xl border border-slate-800 flex items-center justify-center">
                    <AnatomicalMuscleMap
                      muscles={result.muscoli_coinvolti}
                      interactive={true}
                      compact={false}
                    />
                  </div>
                  <div className="md:col-span-6 space-y-2.5 bg-slate-900/60 border border-slate-800 p-4 rounded-3xl overflow-y-auto max-h-[360px]">
                    <h5 className="text-xs font-black text-amber-400 uppercase tracking-wider">
                      Gerarchia di Reclutamento Muscolare
                    </h5>
                    {result.muscoli_coinvolti.map((m, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-2"
                      >
                        <div className="space-y-0.5">
                          <span className="text-xs font-black text-white">{m.muscolo}</span>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                              m.ruolo === 'Target'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : m.ruolo === 'Sinergico'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}>
                              {m.ruolo}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-mono font-black text-amber-400">{m.percentuale}%</span>
                          <span className="text-[9px] text-slate-500 block">EMG Stimata</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB CONTENT: TECHNIQUE */}
              {activeTab === 'technique' && (
                <div className="space-y-4 bg-slate-900/60 border border-slate-800 p-5 rounded-3xl">
                  {/* SETUP */}
                  <div className="space-y-2">
                    <h5 className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Setup & Posizionamento
                    </h5>
                    <div className="space-y-1.5">
                      {result.esecuzione.setup?.map((s, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[10px]">
                            {idx + 1}
                          </span>
                          <span>{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* FASE CONCENTRICA & ECCENTRICA */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <span className="text-[10px] font-black uppercase text-emerald-400 block">
                        ⚡ FASE CONCENTRICA
                      </span>
                      <p className="text-xs text-slate-300">{result.esecuzione.concentrica?.descrizione}</p>
                      {result.esecuzione.concentrica?.cues && result.esecuzione.concentrica.cues.length > 0 && (
                        <div className="pt-1">
                          <span className="text-[9px] font-bold text-slate-500 uppercase">Cues Coach:</span>
                          <ul className="text-xs text-amber-300 list-disc list-inside">
                            {result.esecuzione.concentrica.cues.map((c, i) => <li key={i}>{c}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <span className="text-[10px] font-black uppercase text-amber-400 block">
                        🔄 FASE ECCENTRICA
                      </span>
                      <p className="text-xs text-slate-300">{result.esecuzione.eccentrica?.descrizione}</p>
                      {result.esecuzione.eccentrica?.cues && result.esecuzione.eccentrica.cues.length > 0 && (
                        <div className="pt-1">
                          <span className="text-[9px] font-bold text-slate-500 uppercase">Cues Coach:</span>
                          <ul className="text-xs text-amber-300 list-disc list-inside">
                            {result.esecuzione.eccentrica.cues.map((c, i) => <li key={i}>{c}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: SAFETY */}
              {activeTab === 'safety' && (
                <div className="space-y-4 bg-slate-900/60 border border-slate-800 p-5 rounded-3xl">
                  <div className="space-y-2">
                    <h5 className="text-xs font-black text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" /> Compensi & Errori Comuni da Evitare
                    </h5>
                    <div className="space-y-1.5">
                      {result.sicurezza.compensi_da_evitare?.map((c, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-rose-950/20 border border-rose-900/30 text-xs text-rose-200 flex items-center gap-2">
                          <span className="text-rose-400 font-bold">✕</span>
                          <span>{c}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {result.sicurezza.criteri_arresto && result.sicurezza.criteri_arresto.length > 0 && (
                    <div className="space-y-1.5 pt-2">
                      <h5 className="text-[11px] font-black text-amber-400 uppercase tracking-wider">
                        Criteri di Arresto / Cedimento Tecnico
                      </h5>
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
                        {result.sicurezza.criteri_arresto.join(' • ')}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

        </div>

        {/* ── FOOTER ── */}
        <div className="p-4 bg-[#080c13] border-t border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 font-mono hidden sm:flex items-center gap-2">
            <span>Modulo: AC Biomechanics AI Engine</span>
            <span>•</span>
            <span className="text-amber-400/80">API Key: {apiKey ? 'Configurata' : 'Default Edge Gateway'}</span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Chiudi
            </button>
            {result && (
              <button
                type="button"
                onClick={handleApplyToDatabase}
                disabled={isSaving}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Salva nel Database</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
