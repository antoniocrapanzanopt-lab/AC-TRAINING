import React, { useState } from 'react';
import {
  X, Save, Dumbbell, Upload, Check, Trash2,
  ChevronLeft, ChevronRight, Plus, Minus, Shield, RotateCcw, Layers,
  Sparkles, Loader2, Wand2, Info, Zap, CheckCircle2,
} from 'lucide-react';
import {
  ExerciseItem,
  ExerciseCategory,
  ExerciseEquipment,
  ExerciseType,
  Bilaterality,
  MovementPlane,
  KineticChain,
  MuscleRole,
  ResistanceCurve,
  MuscleInvolvement,
} from '../../types/exercise';
import { useExercises } from '../../context/ExercisesContext';
import { useToast } from '../../context/ToastContext';
import { validateAndInspectVideoFile } from '../../utils/fileCompressor';
import { uploadExerciseVideoToStorage } from '../../lib/storage';
import { suggestExerciseWithAI } from '../../lib/ai/aiExerciseGenerator';
import { AI_CONFIG } from '../../config/aiConfig';

interface ExerciseModalProps {
  initialExercise?: ExerciseItem | null;
  onClose: () => void;
}

const CATEGORIES: ExerciseCategory[] = ['Petto', 'Dorso', 'Gambe', 'Spalle', 'Bicipiti', 'Tricipiti', 'Addominali', 'Full Body', 'Cardio', 'Altro'];
const EQUIPMENTS: ExerciseEquipment[] = ['Bilanciere', 'Manubri', 'Macchina', 'Cavi', 'Corpo Libero', 'Kettlebell', 'Elastici', 'Altro'];
const EXERCISE_TYPES: ExerciseType[] = ['Ipertrofia', 'Forza', 'Resistenza', 'Potenza', 'Mobilità'];
const BILATERALITIES: Bilaterality[] = ['Bilaterale', 'Unilaterale'];
const MOVEMENT_PLANES: MovementPlane[] = ['Sagittale', 'Frontale (scapolare)', 'Frontale', 'Trasverso', 'Multi-piano'];
const KINETIC_CHAINS: KineticChain[] = ['Aperta', 'Chiusa', 'Mista'];
const MUSCLE_ROLES: MuscleRole[] = ['Target', 'Sinergico', 'Stabilizzatore', 'Motore dinamico'];
const RESISTANCE_CURVES: ResistanceCurve[] = ['Gravità (costante)', 'Ascendente', 'Discendente', 'Parabolica', 'Variabile (cam)', 'Costante (cavi)'];

// Suggerimenti rapidi di muscoli comuni per click veloce
const QUICK_MUSCLE_TAGS = [
  'Gran Pettorale', 'Deltoide Anteriore', 'Deltoide Medio', 'Deltoide Posteriore',
  'Gran Dorsale', 'Trapezio', 'Bicipite Brachiale', 'Tricipite Brachiale',
  'Quadricipite', 'Ischiocrurali', 'Grande Gluteo', 'Addominali (Retto)',
  'Polpacci (Gastrocnemio)', 'Lombari (Erettori spinali)',
];

const TABS = [
  { id: 0, step: '01', label: 'Info Base', icon: <Layers className="w-4 h-4" /> },
  { id: 1, step: '02', label: 'Muscoli', icon: <Dumbbell className="w-4 h-4" /> },
  { id: 2, step: '03', label: 'Esecuzione', icon: <RotateCcw className="w-4 h-4" /> },
  { id: 3, step: '04', label: 'Sicurezza', icon: <Shield className="w-4 h-4" /> },
];

const FieldLabel: React.FC<{ children: React.ReactNode; tooltip?: string }> = ({ children }) => (
  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
    <span>{children}</span>
  </label>
);

const selectClass = "w-full px-3.5 py-2.5 bg-[#0f141c] border border-slate-700/60 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all font-medium";
const inputClass = "w-full px-3.5 py-2.5 bg-[#0f141c] border border-slate-700/60 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all placeholder:text-slate-600 font-medium";
const textareaClass = "w-full px-3.5 py-2.5 bg-[#0f141c] border border-slate-700/60 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all resize-none placeholder:text-slate-600 font-medium";

export const ExerciseModal: React.FC<ExerciseModalProps> = ({ initialExercise, onClose }) => {
  const { createExercise, updateExercise } = useExercises();
  const { showSuccess, showError } = useToast();

  const [activeTab, setActiveTab] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuggestingAI, setIsSuggestingAI] = useState(false);
  const [aiSuggested, setAiSuggested] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [videoStats, setVideoStats] = useState<{ duration: number; sizeMB: number } | null>(null);

  // ── Tab 0: Info Base ─────────────────────────────────────────────────────
  const [name, setName] = useState(initialExercise?.name || '');
  const [category, setCategory] = useState<ExerciseCategory>(initialExercise?.category || 'Petto');
  const [equipment, setEquipment] = useState<ExerciseEquipment>(initialExercise?.equipment || 'Manubri');
  const [videoUrl, setVideoUrl] = useState(initialExercise?.video_url || '');
  const [instructions, setInstructions] = useState(initialExercise?.instructions || '');
  const [tipo, setTipo] = useState<ExerciseType | ''>(initialExercise?.tipo || '');
  const [bilateralita, setBilateralita] = useState<Bilaterality | ''>(initialExercise?.bilateralita || '');
  const [pianoMovimento, setPianoMovimento] = useState<MovementPlane | ''>(initialExercise?.piano_movimento || '');
  const [catenaСinetica, setCatenaCinetica] = useState<KineticChain | ''>(initialExercise?.catena_cinetica || '');
  const [gradiLiberta, setGradiLiberta] = useState<number | ''>(initialExercise?.gradi_liberta || '');

  // ── Tab 1: Muscoli ───────────────────────────────────────────────────────
  const [muscoli, setMuscoli] = useState<MuscleInvolvement[]>(initialExercise?.muscoli_coinvolti || []);
  const [newMuscoloName, setNewMuscoloName] = useState('');
  const [newMuscoloRuolo, setNewMuscoloRuolo] = useState<MuscleRole>('Target');
  const [newMuscoloPerc, setNewMuscoloPerc] = useState<number>(30);

  // ── Tab 2: Esecuzione ────────────────────────────────────────────────────
  const [setupCues, setSetupCues] = useState<string[]>(initialExercise?.esecuzione?.setup || ['']);
  const [concDesc, setConcDesc] = useState(initialExercise?.esecuzione?.concentrica?.descrizione || '');
  const [concVettore, setConcVettore] = useState(initialExercise?.esecuzione?.concentrica?.vettore_movimento || '');
  const [concTraiettoria, setConcTraiettoria] = useState(initialExercise?.esecuzione?.concentrica?.traiettoria || '');
  const [concCues, setConcCues] = useState<string[]>(initialExercise?.esecuzione?.concentrica?.cues || ['']);
  const [eccDesc, setEccDesc] = useState(initialExercise?.esecuzione?.eccentrica?.descrizione || '');
  const [eccVettore, setEccVettore] = useState(initialExercise?.esecuzione?.eccentrica?.vettore_resistenza || '');
  const [eccCues, setEccCues] = useState<string[]>(initialExercise?.esecuzione?.eccentrica?.cues || ['']);

  const [rom, setRom] = useState(initialExercise?.parametri_chiave?.rom || '');
  const [curvaResistenza, setCurvaResistenza] = useState<ResistanceCurve | ''>(initialExercise?.parametri_chiave?.curva_resistenza || '');
  const [puntoPicco, setPuntoPicco] = useState(initialExercise?.parametri_chiave?.punto_picco || '');
  const [tipoStimolo, setTipoStimolo] = useState<ExerciseType | ''>(initialExercise?.parametri_chiave?.tipo_stimolo || '');
  const [tutMin, setTutMin] = useState<number | ''>(initialExercise?.parametri_chiave?.tut?.min || '');
  const [tutMax, setTutMax] = useState<number | ''>(initialExercise?.parametri_chiave?.tut?.max || '');
  const [recuperoMin, setRecuperoMin] = useState<number | ''>(initialExercise?.parametri_chiave?.recupero?.min || '');
  const [recuperoMax, setRecuperoMax] = useState<number | ''>(initialExercise?.parametri_chiave?.recupero?.max || '');

  // ── Tab 3: Sicurezza ─────────────────────────────────────────────────────
  const [compensi, setCompensi] = useState<string[]>(initialExercise?.sicurezza?.compensi_da_evitare || ['']);
  const [criteri, setCriteri] = useState<string[]>(initialExercise?.sicurezza?.criteri_arresto || ['']);
  const [controindicazioni, setControindicazioni] = useState<string[]>(initialExercise?.sicurezza?.controindicazioni || ['']);
  const [tolleranze, setTolleranze] = useState(initialExercise?.sicurezza?.tolleranze || '');

  // ── AI Autocompilazione Magica con Gemini 3.7 Flash ────────────────────────
  const handleAISuggest = async () => {
    if (!name.trim()) {
      showError('Inserisci il nome dell\'esercizio', 'Scrivi un nome come "Squat promo" o "Lat Machine" per attivare l\'IA.');
      return;
    }
    setIsSuggestingAI(true);
    try {
      const result = await suggestExerciseWithAI(name.trim(), category || undefined, equipment || undefined);

      if (result.category) setCategory(result.category);
      if (result.equipment) setEquipment(result.equipment);
      if (result.instructions) setInstructions(result.instructions);
      if (result.tipo) setTipo(result.tipo);
      if (result.bilateralita) setBilateralita(result.bilateralita);
      if (result.piano_movimento) setPianoMovimento(result.piano_movimento);
      if (result.catena_cinetica) setCatenaCinetica(result.catena_cinetica);
      if (result.gradi_liberta) setGradiLiberta(result.gradi_liberta);

      if (result.parametri_chiave) {
        setRom(result.parametri_chiave.rom || '');
        setCurvaResistenza(result.parametri_chiave.curva_resistenza || '');
        setPuntoPicco(result.parametri_chiave.punto_picco || '');
        setTipoStimolo(result.parametri_chiave.tipo_stimolo || '');
        setTutMin(result.parametri_chiave.tut?.min || '');
        setTutMax(result.parametri_chiave.tut?.max || '');
        setRecuperoMin(result.parametri_chiave.recupero?.min || '');
        setRecuperoMax(result.parametri_chiave.recupero?.max || '');
      }

      if (result.muscoli_coinvolti?.length) setMuscoli(result.muscoli_coinvolti);

      if (result.esecuzione) {
        setSetupCues(result.esecuzione.setup?.length ? result.esecuzione.setup : ['']);
        setConcDesc(result.esecuzione.concentrica?.descrizione || '');
        setConcVettore(result.esecuzione.concentrica?.vettore_movimento || '');
        setConcTraiettoria(result.esecuzione.concentrica?.traiettoria || '');
        setConcCues(result.esecuzione.concentrica?.cues?.length ? result.esecuzione.concentrica.cues : ['']);
        setEccDesc(result.esecuzione.eccentrica?.descrizione || '');
        setEccVettore(result.esecuzione.eccentrica?.vettore_resistenza || '');
        setEccCues(result.esecuzione.eccentrica?.cues?.length ? result.esecuzione.eccentrica.cues : ['']);
      }

      if (result.sicurezza) {
        setCompensi(result.sicurezza.compensi_da_evitare?.length ? result.sicurezza.compensi_da_evitare : ['']);
        setCriteri(result.sicurezza.criteri_arresto?.length ? result.sicurezza.criteri_arresto : ['']);
        setControindicazioni(result.sicurezza.controindicazioni?.length ? result.sicurezza.controindicazioni : ['']);
        setTolleranze(result.sicurezza.tolleranze || '');
      }

      setAiSuggested(true);
      showSuccess(`✨ Scheda compilata al 100% con ${AI_CONFIG.GEMINI.DISPLAY_NAME}!`, 'I dati biomeccanici e clinici sono stati inseriti in tutti i tab.');
    } catch (err: unknown) {
      showError('Errore IA', err instanceof Error ? err.message : 'Impossibile completare la richiesta.');
    } finally {
      setIsSuggestingAI(false);
    }
  };

  const addQuickMuscle = (muscleName: string) => {
    if (muscoli.some(m => m.muscolo.toLowerCase() === muscleName.toLowerCase())) return;
    setMuscoli(prev => [...prev, { muscolo: muscleName, ruolo: 'Target', percentuale: 40 }]);
  };

  // ── Helpers per liste dinamiche ──────────────────────────────────────────
  const updateListItem = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, index: number, value: string) => {
    const updated = [...list]; updated[index] = value; setList(updated);
  };
  const addListItem = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>) => setList([...list, '']);
  const removeListItem = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, index: number) => setList(list.filter((_, i) => i !== index));

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setIsUploadingVideo(true);
    try {
      const inspectRes = await validateAndInspectVideoFile(file, 20, 15);
      if (!inspectRes.valid) { showError('Errore Validazione Video', inspectRes.error || 'Video non valido'); return; }
      setVideoStats({ duration: inspectRes.durationSeconds, sizeMB: inspectRes.sizeMB });
      const fileDataUrl = await new Promise<string>((res) => { const r = new FileReader(); r.onload = (ev) => res(ev.target?.result as string); r.readAsDataURL(file); });
      const uploadRes = await uploadExerciseVideoToStorage(initialExercise?.id || 'temp', file, fileDataUrl);
      setVideoUrl(uploadRes.url);
      showSuccess('Video caricato!', `${inspectRes.durationSeconds}s, ${inspectRes.sizeMB} MB`);
    } catch (err: unknown) {
      showError('Errore caricamento video: ' + (err instanceof Error ? err.message : ''));
    } finally { setIsUploadingVideo(false); }
  };

  const handleSave = async () => {
    if (!name.trim()) { showError('Inserisci il nome dell\'esercizio'); setActiveTab(0); return; }
    setIsSaving(true);
    try {
      const payload: Partial<ExerciseItem> = {
        name: name.trim(), category, equipment,
        video_url: videoUrl.trim() || null, instructions: instructions.trim() || null,
        tipo: (tipo as ExerciseType) || null, bilateralita: (bilateralita as Bilaterality) || null,
        piano_movimento: (pianoMovimento as MovementPlane) || null, catena_cinetica: (catenaСinetica as KineticChain) || null,
        gradi_liberta: gradiLiberta !== '' ? Number(gradiLiberta) : null,
        muscoli_coinvolti: muscoli.filter(m => m.muscolo.trim()).length > 0 ? muscoli.filter(m => m.muscolo.trim()) : null,
        esecuzione: (setupCues.some(c => c.trim()) || concDesc || eccDesc) ? {
          setup: setupCues.filter(c => c.trim()),
          concentrica: { descrizione: concDesc, vettore_movimento: concVettore || undefined, traiettoria: concTraiettoria || undefined, cues: concCues.filter(c => c.trim()) },
          eccentrica: { descrizione: eccDesc, vettore_resistenza: eccVettore || undefined, cues: eccCues.filter(c => c.trim()) },
        } : null,
        parametri_chiave: (rom || curvaResistenza || puntoPicco) ? {
          rom, curva_resistenza: (curvaResistenza as ResistanceCurve) || 'Gravità (costante)',
          punto_picco: puntoPicco, tipo_stimolo: (tipoStimolo as ExerciseType) || tipo as ExerciseType || 'Ipertrofia',
          tut: { min: Number(tutMin) || 30, max: Number(tutMax) || 40 },
          recupero: { min: Number(recuperoMin) || 60, max: Number(recuperoMax) || 90 },
        } : null,
        sicurezza: (compensi.some(c => c.trim()) || criteri.some(c => c.trim()) || controindicazioni.some(c => c.trim())) ? {
          compensi_da_evitare: compensi.filter(c => c.trim()),
          criteri_arresto: criteri.filter(c => c.trim()),
          controindicazioni: controindicazioni.filter(c => c.trim()),
          tolleranze: tolleranze.trim(),
        } : null,
      };

      if (initialExercise) {
        const { success, error } = await updateExercise(initialExercise.id, payload);
        if (!success) throw new Error(error);
        showSuccess('Esercizio aggiornato con successo!');
      } else {
        const { success, error } = await createExercise(payload);
        if (!success) throw new Error(error);
        showSuccess('Esercizio aggiunto alla tua libreria!');
      }
      onClose();
    } catch (err: unknown) {
      showError('Errore durante il salvataggio', err instanceof Error ? err.message : '');
    } finally { setIsSaving(false); }
  };

  const StringListEditor: React.FC<{ list: string[]; setList: React.Dispatch<React.SetStateAction<string[]>>; placeholder: string; addLabel?: string }> = ({ list, setList, placeholder, addLabel = '+ Aggiungi riga' }) => (
    <div className="space-y-2">
      {list.map((item, i) => (
        <div key={i} className="flex gap-2">
          <input type="text" value={item} onChange={e => updateListItem(list, setList, i, e.target.value)} placeholder={placeholder} className={inputClass + ' flex-1'} />
          <button type="button" onClick={() => removeListItem(list, setList, i)} className="p-2.5 bg-slate-900/60 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded-xl border border-slate-700/50 transition-colors">
            <Minus className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => addListItem(list, setList)} className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 transition-colors pt-1">
        <Plus className="w-3.5 h-3.5" /> {addLabel}
      </button>
    </div>
  );

  const tabCompleteness = [
    name.trim() !== '',
    muscoli.length > 0,
    (setupCues.some(c => c.trim()) || concDesc !== ''),
    (compensi.some(c => c.trim()) || criteri.some(c => c.trim())),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-[#090d14] border border-slate-800/90 rounded-2xl shadow-2xl shadow-amber-500/5 flex flex-col overflow-hidden my-4">

        {/* ── HEADER HERO IA MAGICA ─────────────────────────────────────────── */}
        <div className="relative p-6 border-b border-slate-800/80 bg-gradient-to-r from-slate-900 via-[#0d121c] to-[#090d14]">
          {/* Subtle Ambient Light Glow */}
          <div className="absolute top-0 right-1/4 w-72 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center justify-between relative z-10 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-black flex items-center justify-center font-extrabold shadow-lg shadow-amber-500/20">
                <Dumbbell className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-white tracking-tight">
                  {initialExercise ? 'Modifica Esercizio' : 'Crea Esercizio Avanzato'}
                </h2>
                <p className="text-xs text-slate-400">Compilazione manuale guidata oppure magica con IA</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800/80">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ── BARRA DI COMPILAZIONE MAGICA IA ───────────────────────────── */}
          <div className="relative z-10 bg-[#0f1522]/90 border border-amber-500/30 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              <span className="text-xs font-extrabold text-amber-400 uppercase tracking-wider">
                Compilazione Magica IA ({AI_CONFIG.GEMINI.DISPLAY_NAME})
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Scrivi il nome dell'esercizio (es. Panca Piana, Alzate Laterali, Lat Machine)..."
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAISuggest(); }}
                className="flex-1 px-4 py-2.5 bg-[#090d14] border border-slate-700/80 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all font-semibold"
              />
              <button
                type="button"
                onClick={handleAISuggest}
                disabled={isSuggestingAI || !name.trim()}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-black uppercase tracking-wider rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shrink-0 shadow-lg shadow-amber-500/20"
              >
                {isSuggestingAI ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /><span>Elaborazione...</span></>
                ) : aiSuggested ? (
                  <><CheckCircle2 className="w-4 h-4" /><span>Rigenera con IA</span></>
                ) : (
                  <><Wand2 className="w-4 h-4" /><span>⚡ Auto-Compila</span></>
                )}
              </button>
            </div>
            {!name.trim() && (
              <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                <Info className="w-3 h-3 text-amber-400" />
                Scrivi il nome qui sopra e premi "Auto-Compila": l'IA inserirà automaticamente muscoli, esecuzione e sicurezza!
              </p>
            )}
          </div>
        </div>

        {/* ── TAB NAVIGATION (PROGRESSION BAR) ─────────────────────────────── */}
        <div className="grid grid-cols-4 bg-[#070a0f] border-b border-slate-800/80">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const isCompleted = tabCompleteness[tab.id];

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3.5 px-2 flex flex-col sm:flex-row items-center justify-center gap-2 text-xs font-bold transition-all relative border-b-2 ${
                  isActive
                    ? 'text-amber-400 border-amber-500 bg-amber-500/5'
                    : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/30'
                }`}
              >
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                  isActive ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'
                }`}>
                  {tab.step}
                </span>
                <span className="truncate">{tab.label}</span>
                {isCompleted && (
                  <Check className="w-3.5 h-3.5 text-emerald-400 hidden sm:inline" />
                )}
              </button>
            );
          })}
        </div>

        {/* ── BODY DEGLI STEP ─────────────────────────────────────────────── */}
        <div className="p-6 overflow-y-auto flex-1 max-h-[58vh] space-y-6">

          {/* Banner successo IA */}
          {aiSuggested && (
            <div className="flex items-center justify-between p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 font-semibold">
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                Tutti i campi sono stati compilati automaticamente dall'IA. Puoi navigare nei tab per verificare o personalizzare!
              </span>
            </div>
          )}

          {/* ── STEP 1: Info Base ─────────────────────────────────────────── */}
          {activeTab === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Gruppo Muscolare Principale</FieldLabel>
                  <select value={category} onChange={e => setCategory(e.target.value as ExerciseCategory)} className={selectClass}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <FieldLabel>Attrezzatura</FieldLabel>
                  <select value={equipment} onChange={e => setEquipment(e.target.value as ExerciseEquipment)} className={selectClass}>
                    {EQUIPMENTS.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div>
                  <FieldLabel>Tipo Stimolo</FieldLabel>
                  <select value={tipo} onChange={e => setTipo(e.target.value as ExerciseType)} className={selectClass}>
                    <option value="">— N/D —</option>
                    {EXERCISE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <FieldLabel>Bilateralità</FieldLabel>
                  <select value={bilateralita} onChange={e => setBilateralita(e.target.value as Bilaterality)} className={selectClass}>
                    <option value="">— N/D —</option>
                    {BILATERALITIES.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <FieldLabel>Piano Movimento</FieldLabel>
                  <select value={pianoMovimento} onChange={e => setPianoMovimento(e.target.value as MovementPlane)} className={selectClass}>
                    <option value="">— N/D —</option>
                    {MOVEMENT_PLANES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <FieldLabel>Catena Cinetica</FieldLabel>
                  <select value={catenaСinetica} onChange={e => setCatenaCinetica(e.target.value as KineticChain)} className={selectClass}>
                    <option value="">— N/D —</option>
                    {KINETIC_CHAINS.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <FieldLabel>Video Link (YouTube o Clip MP4)</FieldLabel>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={videoUrl}
                    onChange={e => setVideoUrl(e.target.value)}
                    className={inputClass + ' flex-1'}
                  />
                  {!videoUrl && (
                    <>
                      <input type="file" id="video-clip-upload" accept="video/mp4,video/webm,video/quicktime" onChange={handleVideoUpload} className="hidden" />
                      <label htmlFor="video-clip-upload" className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors border border-slate-700 shrink-0">
                        {isUploadingVideo ? <Loader2 className="w-4 h-4 animate-spin text-amber-400" /> : <Upload className="w-4 h-4 text-amber-400" />}
                        {isUploadingVideo ? 'Caricamento...' : 'Carica File'}
                      </label>
                    </>
                  )}
                </div>
                {videoStats && (
                  <p className="text-[10px] text-emerald-400 font-bold mt-1.5 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Video salvato: {videoStats.duration}s ({videoStats.sizeMB} MB)
                  </p>
                )}
              </div>

              <div>
                <FieldLabel>Descrizione Sintetica / Note per Atleta</FieldLabel>
                <textarea
                  placeholder="Istruzioni rapide da mostrare durante l'esecuzione..."
                  value={instructions}
                  onChange={e => setInstructions(e.target.value)}
                  rows={2}
                  className={textareaClass}
                />
              </div>
            </div>
          )}

          {/* ── STEP 2: Muscoli Coinvolti ─────────────────────────────────── */}
          {activeTab === 1 && (
            <div className="space-y-5">

              {/* Suggerimenti veloci con 1-Click */}
              <div>
                <FieldLabel>Selezione Rapida Muscoli (1-Click Add)</FieldLabel>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {QUICK_MUSCLE_TAGS.map(tag => {
                    const isAdded = muscoli.some(m => m.muscolo.toLowerCase() === tag.toLowerCase());
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => addQuickMuscle(tag)}
                        disabled={isAdded}
                        className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-all border ${
                          isAdded
                            ? 'bg-amber-500/15 border-amber-500/30 text-amber-400 opacity-60 cursor-default'
                            : 'bg-slate-800/80 border-slate-700/60 text-slate-300 hover:bg-amber-500/10 hover:border-amber-500/40 hover:text-amber-400'
                        }`}
                      >
                        {isAdded ? `✓ ${tag}` : `+ ${tag}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Form aggiunta manuale */}
              <div className="bg-[#0f141c] border border-slate-800 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Oppure Inserisci Muscolo Personalizzato</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Nome muscolo (es. Gran Dentato)..."
                    value={newMuscoloName}
                    onChange={e => setNewMuscoloName(e.target.value)}
                    className={inputClass}
                  />
                  <select value={newMuscoloRuolo} onChange={e => setNewMuscoloRuolo(e.target.value as MuscleRole)} className={selectClass}>
                    {MUSCLE_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={newMuscoloPerc}
                      onChange={e => setNewMuscoloPerc(Number(e.target.value))}
                      className={inputClass}
                      placeholder="Attivazione %"
                    />
                    <button
                      type="button"
                      disabled={!newMuscoloName.trim()}
                      onClick={() => {
                        if (!newMuscoloName.trim()) return;
                        setMuscoli(prev => [...prev, { muscolo: newMuscoloName.trim(), ruolo: newMuscoloRuolo, percentuale: newMuscoloPerc }]);
                        setNewMuscoloName('');
                      }}
                      className="px-4 py-2.5 bg-[var(--color-primary)] text-black text-xs font-bold rounded-xl hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-40 shrink-0 cursor-pointer"
                    >
                      Aggiungi
                    </button>
                  </div>
                </div>
              </div>

              {/* Mappa muscoli selezionati */}
              {muscoli.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mappa Attivazione Selezionata ({muscoli.length} muscoli)</p>
                  {muscoli.map((m, i) => {
                    const roleColor = m.ruolo === 'Target' ? 'bg-amber-500' : m.ruolo === 'Sinergico' ? 'bg-sky-400' : m.ruolo === 'Stabilizzatore' ? 'bg-emerald-400' : 'bg-violet-400';
                    return (
                      <div key={i} className="flex items-center gap-3 bg-[#0f141c] border border-slate-800 rounded-xl px-4 py-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${roleColor}`} />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-bold text-white block truncate">{m.muscolo}</span>
                          <span className="text-[10px] font-semibold text-slate-400">{m.ruolo}</span>
                        </div>
                        <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden shrink-0">
                          <div className={`h-full rounded-full ${roleColor}`} style={{ width: `${m.percentuale}%` }} />
                        </div>
                        <span className="text-xs font-bold text-slate-300 w-10 text-right shrink-0">{m.percentuale}%</span>
                        <button
                          type="button"
                          onClick={() => setMuscoli(muscoli.filter((_, idx) => idx !== i))}
                          className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl text-slate-500 text-xs">
                  Nessun muscolo mappato. Clicca sui tag in alto o su "⚡ Auto-Compila con IA".
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3: Biomeccanica & Esecuzione ──────────────────────────── */}
          {activeTab === 2 && (
            <div className="space-y-5">
              {/* Parametri chiave */}
              <div className="bg-[#0f141c] border border-slate-800 rounded-xl p-4 space-y-3">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Parametri di Resistenza & ROM</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div><FieldLabel>ROM Gradi</FieldLabel><input type="text" placeholder="es. 0°–90° abduzione" value={rom} onChange={e => setRom(e.target.value)} className={inputClass} /></div>
                  <div><FieldLabel>Curva Resistenza</FieldLabel>
                    <select value={curvaResistenza} onChange={e => setCurvaResistenza(e.target.value as ResistanceCurve)} className={selectClass}>
                      <option value="">— N/D —</option>
                      {RESISTANCE_CURVES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div><FieldLabel>Punto Picco Tensione</FieldLabel><input type="text" placeholder="es. Metà ROM ~45°" value={puntoPicco} onChange={e => setPuntoPicco(e.target.value)} className={inputClass} /></div>
                </div>
              </div>

              {/* Setup */}
              <div>
                <p className="text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">Setup e Posizionamento Iniziale</p>
                <StringListEditor list={setupCues} setList={setSetupCues} placeholder="es. Piedi ben piantati alla larghezza delle spalle" addLabel="+ Aggiungi Cue di Setup" />
              </div>

              {/* Fase Concentrica */}
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 space-y-3">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> Fase Concentrica (Spinta / Contrazione)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><FieldLabel>Descrizione Fase</FieldLabel><input type="text" placeholder="es. Spinta verso l'alto con traiettoria ad arco" value={concDesc} onChange={e => setConcDesc(e.target.value)} className={inputClass} /></div>
                  <div><FieldLabel>Vettore Movimento</FieldLabel><input type="text" placeholder="es. Piano scapolare 20°" value={concVettore} onChange={e => setConcVettore(e.target.value)} className={inputClass} /></div>
                </div>
                <FieldLabel>Cue Tecnici Concentrici</FieldLabel>
                <StringListEditor list={concCues} setList={setConcCues} placeholder="es. Mantieni i gomiti leggermente flessi" addLabel="+ Aggiungi Cue" />
              </div>

              {/* Fase Eccentrica */}
              <div className="bg-sky-500/5 border border-sky-500/20 rounded-xl p-4 space-y-3">
                <span className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5" /> Fase Eccentrica (Rientro Controllato)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><FieldLabel>Descrizione Fase</FieldLabel><input type="text" placeholder="es. Discesa in 3 secondi controllati" value={eccDesc} onChange={e => setEccDesc(e.target.value)} className={inputClass} /></div>
                  <div><FieldLabel>Vettore Resistenza</FieldLabel><input type="text" placeholder="es. Gravità verticale" value={eccVettore} onChange={e => setEccVettore(e.target.value)} className={inputClass} /></div>
                </div>
                <FieldLabel>Cue Tecnici Eccentrici</FieldLabel>
                <StringListEditor list={eccCues} setList={setEccCues} placeholder="es. Non perdere la contrazione delle scapole" addLabel="+ Aggiungi Cue" />
              </div>
            </div>
          )}

          {/* ── STEP 4: Sicurezza & Clinica ───────────────────────────────── */}
          {activeTab === 3 && (
            <div className="space-y-5">
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 space-y-3">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  ⊘ Compensi Motori da Evitare
                </span>
                <StringListEditor list={compensi} setList={setCompensi} placeholder="es. Iperlordosi lombare durante lo slancio" addLabel="+ Aggiungi Compenso" />
              </div>

              <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 space-y-3">
                <span className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                  ⛔ Criteri di Arresto Immediato
                </span>
                <StringListEditor list={criteri} setList={setCriteri} placeholder="es. Dolore acuto anteriore alla spalla" addLabel="+ Aggiungi Criterio" />
              </div>

              <div className="bg-red-950/30 border border-red-800/40 rounded-xl p-4 space-y-3">
                <span className="text-xs font-bold text-red-300 uppercase tracking-wider flex items-center gap-1.5">
                  ⚠ Controindicazioni Cliniche
                </span>
                <StringListEditor list={controindicazioni} setList={setControindicazioni} placeholder="es. Conflitto subacromiale / Lesione cuffia" addLabel="+ Aggiungi Controindicazione" />
                <div className="pt-2">
                  <FieldLabel>Adattamenti & Tolleranze</FieldLabel>
                  <textarea
                    placeholder="Note per adattare l'esercizio in caso di piccoli fastidi..."
                    value={tolleranze}
                    onChange={e => setTolleranze(e.target.value)}
                    rows={2}
                    className={textareaClass}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── FOOTER AZIONI ───────────────────────────────────────────────── */}
        <div className="p-4 border-t border-slate-800/80 bg-[#070a0f] flex items-center justify-between">
          <div className="flex gap-2">
            {activeTab > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab(prev => prev - 1)}
                className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800/60 rounded-xl border border-slate-700/60 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Indietro
              </button>
            )}
            {activeTab < 3 && (
              <button
                type="button"
                onClick={() => setActiveTab(prev => prev + 1)}
                className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors"
              >
                Avanti <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white transition-colors">
              Annulla
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-black uppercase tracking-wider rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-amber-500/20"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSaving ? 'Salvataggio...' : 'Salva in Libreria'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
