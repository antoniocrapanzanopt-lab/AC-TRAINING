import React, { useState } from 'react';
import {
  FileText,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  X,
  Calendar,
  Save,
  Plus,
  Trash2,
  Folder,
  User,
  Key,
  Eye,
  EyeOff,
} from 'lucide-react';
import { parsePDFWorkoutFile, ParsedPDFWorkout } from '../../lib/pdf/pdfExtractor';
import { matchExerciseToCatalog, ExerciseMatchResult } from '../../lib/pdf/exerciseMatcher';
import { useExercises } from '../../context/ExercisesContext';
import { useWorkouts } from '../../context/WorkoutsContext';
import { useAthletes } from '../../context/AthletesContext';
import { useToast } from '../../context/ToastContext';
import { WorkoutExercise } from '../../types/workout';

interface PDFWorkoutImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetAthleteId?: string;
  onImportSuccess?: (workoutId: string) => void;
}

export const PDFWorkoutImporterModal: React.FC<PDFWorkoutImporterModalProps> = ({
  isOpen,
  onClose,
  targetAthleteId,
  onImportSuccess,
}) => {
  const { exercises: libraryExercises } = useExercises();
  const { createWorkoutTemplate, assignWorkoutToAthlete, folders } = useWorkouts();
  const { athletes } = useAthletes();
  const { showSuccess, showError } = useToast();

  // ─── STATI WIZARD ───
  const [step, setStep] = useState<'upload' | 'parsing' | 'review'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsingProgressText, setParsingProgressText] = useState('Analisi PDF in corso...');

  // ─── CHIAVE API GEMINI ───
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
    return localStorage.getItem('gemini_api_key') || '';
  });
  const [isKeyVisible, setIsKeyVisible] = useState<boolean>(false);
  const [showKeyConfig, setShowKeyConfig] = useState<boolean>(() => {
    return !localStorage.getItem('gemini_api_key');
  });

  // ─── STATI DATI PARSATI E REVISIONABILI ───
  const [workoutTitle, setWorkoutTitle] = useState('Programma di Allenamento');
  const [saveMode, setSaveMode] = useState<'template' | 'assign'>('template');
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>(undefined);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>(targetAthleteId || '');
  
  // Dati strutturati su cui il coach può fare editing
  const [parsedWeeks, setParsedWeeks] = useState<{
    weekNumber: number;
    days: {
      dayName: string;
      exercises: (WorkoutExercise & {
        rawName: string;
        matchResult?: ExerciseMatchResult;
      })[];
    }[];
  }[]>([]);

  const [activeWeekTab, setActiveWeekTab] = useState<number>(1);
  const [activeDayTab, setActiveDayTab] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  // ─── STEP 1: SELEZIONE FILE PDF ───
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
    } else {
      showError('Seleziona un file PDF valido.');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
    } else {
      showError('Formato non supportato. Trascina un file PDF.');
    }
  };

  // ─── STEP 2: AVVIO ESTRAZIONE & PARSING AI ───
  const startPDFParsing = async () => {
    if (!selectedFile) return;

    if (!geminiApiKey.trim()) {
      setShowKeyConfig(true);
      showError('Inserisci la tua Chiave API Gemini nel riquadro per avviare l\'analisi AI della scheda PDF.');
      return;
    }

    setStep('parsing');
    setParsingProgressText('📄 Invio documento a Google Gemini Multimodal Vision AI...');

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    try {
      await delay(700);
      setParsingProgressText('🔍 Riconoscimento geometrico 2-Colonne e righe di carico...');

      const res = await parsePDFWorkoutFile(selectedFile, geminiApiKey);

      if (!res.success || !res.data) {
        showError(res.error || 'Errore durante la lettura del PDF.');
        setStep('upload');
        return;
      }

      await delay(900);
      setParsingProgressText('🧠 Analisi AI avanzata: esercizi, serie, reps e tempi di recupero...');

      const pdfData: ParsedPDFWorkout = res.data;
      setWorkoutTitle(pdfData.title || selectedFile.name.replace(/\.pdf$/i, ''));

      await delay(800);
      setParsingProgressText('🎯 Mappatura fuzzy con il catalogo master (slot da A ad L fino a 12 esercizi)...');

      // Mappatura e Fuzzy Matching con public.exercises
      let globalCounter = 0;
      const mappedWeeks = pdfData.weeks.map((w) => ({
        weekNumber: w.weekNumber,
        days: w.days.map((d) => ({
          dayName: d.dayName,
          exercises: d.exercises.map((ex) => {
            globalCounter++;
            const match = matchExerciseToCatalog(ex.rawName, libraryExercises);
            
            const finalName = match.status === 'exact' && match.matchedExercise 
              ? match.matchedExercise.name 
              : ex.rawName;

            return {
              id: `pdf-ex-${globalCounter}-${Date.now()}`,
              workout_id: '',
              name: finalName,
              sets: ex.sets || 3,
              reps_target: ex.repsTarget || '10-12',
              rest_seconds: ex.restSeconds !== undefined ? ex.restSeconds : 90,
              order_index: globalCounter,
              notes: ex.notes || '',
              day_name: d.dayName,
              week_number: w.weekNumber,
              is_time_based: ex.isTimeBased || false,
              duration_seconds: ex.durationSeconds || undefined,
              alternative_exercise: ex.alternative_exercise || undefined,
              rawName: ex.rawName,
              matchResult: match,
            };
          }),
        })),
      }));

      await delay(400);

      setParsedWeeks(mappedWeeks);

      if (mappedWeeks.length > 0) {
        setActiveWeekTab(mappedWeeks[0].weekNumber);
        if (mappedWeeks[0].days.length > 0) {
          setActiveDayTab(mappedWeeks[0].days[0].dayName);
        }
      }

      setStep('review');
      showSuccess('Scheda PDF analizzata con successo!');
    } catch (err: any) {
      console.error(err);
      showError('Errore imprevisto durante l\'analisi.');
      setStep('upload');
    }
  };

  // ─── AGGIORNAMENTO CAMPI INLINE ───
  const updateExerciseField = (
    weekNum: number,
    dayName: string,
    exerciseId: string,
    field: keyof WorkoutExercise | 'matchedCatalogId',
    value: any
  ) => {
    setParsedWeeks((prevWeeks) =>
      prevWeeks.map((w) => {
        if (w.weekNumber !== weekNum) return w;
        return {
          ...w,
          days: w.days.map((d) => {
            if (d.dayName !== dayName) return d;
            return {
              ...d,
              exercises: d.exercises.map((ex) => {
                if (ex.id !== exerciseId) return ex;

                if (field === 'matchedCatalogId') {
                  const catalogItem = libraryExercises.find((item) => item.id === value);
                  return {
                    ...ex,
                    name: catalogItem ? catalogItem.name : ex.rawName,
                  };
                }

                return { ...ex, [field]: value };
              }),
            };
          }),
        };
      })
    );
  };

  const removeExercise = (weekNum: number, dayName: string, exerciseId: string) => {
    setParsedWeeks((prevWeeks) =>
      prevWeeks.map((w) => {
        if (w.weekNumber !== weekNum) return w;
        return {
          ...w,
          days: w.days.map((d) => {
            if (d.dayName !== dayName) return d;
            return {
              ...d,
              exercises: d.exercises.filter((ex) => ex.id !== exerciseId),
            };
          }),
        };
      })
    );
  };

  const addNewExercise = (weekNum: number, dayName: string) => {
    let limitReached = false;
    setParsedWeeks((prevWeeks) =>
      prevWeeks.map((w) => {
        if (w.weekNumber !== weekNum) return w;
        return {
          ...w,
          days: w.days.map((d) => {
            if (d.dayName !== dayName) return d;
            if (d.exercises.length >= 12) {
              limitReached = true;
              return d;
            }
            const nextLetter = String.fromCharCode(65 + d.exercises.length);
            const newEx: WorkoutExercise & { rawName: string } = {
              id: `pdf-ex-new-${Date.now()}`,
              workout_id: '',
              name: 'Nuovo Esercizio Libero',
              sets: 3,
              reps_target: '10-12',
              rest_seconds: 90,
              order_index: d.exercises.length + 1,
              day_name: dayName,
              week_number: weekNum,
              rawName: `Esercizio ${nextLetter}`,
            };
            return {
              ...d,
              exercises: [...d.exercises, newEx],
            };
          }),
        };
      })
    );

    if (limitReached) {
      showError('Hai raggiunto il limite massimo di 12 slot esercizi per questo giorno.');
    }
  };

  // ─── STEP 4: SALVATAGGIO DEFINITIVO IN BAM ───
  const handleFinalSave = async () => {
    if (!workoutTitle.trim()) {
      showError('Inserisci un titolo per la scheda.');
      return;
    }

    if (saveMode === 'assign' && !selectedAthleteId) {
      showError('Seleziona un atleta a cui assegnare la scheda.');
      return;
    }

    const allExercises: Partial<WorkoutExercise>[] = [];
    parsedWeeks.forEach((w) => {
      w.days.forEach((d) => {
        d.exercises.forEach((ex, index) => {
          allExercises.push({
            name: ex.name,
            sets: Number(ex.sets) || 1,
            reps_target: String(ex.reps_target || '10'),
            rest_seconds: Number(ex.rest_seconds) || 60,
            order_index: index,
            notes: ex.notes || undefined,
            day_name: d.dayName,
            week_number: w.weekNumber,
            is_time_based: ex.is_time_based || false,
            duration_seconds: ex.duration_seconds || undefined,
          });
        });
      });
    });

    if (allExercises.length === 0) {
      showError('La scheda non contiene esercizi da salvare.');
      return;
    }

    setIsSaving(true);
    try {
      const result = await createWorkoutTemplate(
        {
          title: workoutTitle.trim(),
          description: `Importata automaticamente da file PDF ("${selectedFile?.name || 'scheda.pdf'}")`,
          folder_id: selectedFolderId || undefined,
          is_template: true,
          total_weeks: parsedWeeks.length || 1,
        },
        allExercises
      );

      if (!result.success || !result.workoutId) {
        throw new Error(result.error || 'Errore durante la creazione del workout.');
      }

      if (saveMode === 'assign' && selectedAthleteId) {
        const assignRes = await assignWorkoutToAthlete(selectedAthleteId, result.workoutId);
        if (!assignRes.success) {
          throw new Error(assignRes.error || 'Scheda salvata ma impossibile assegnarla all\'atleta.');
        }
        showSuccess(`Scheda importata ed assegnata con successo!`);
      } else {
        showSuccess(`Scheda importata con successo nella Libreria Master!`);
      }

      if (onImportSuccess) {
        onImportSuccess(result.workoutId);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      showError(err.message || 'Errore durante il salvataggio.');
    } finally {
      setIsSaving(false);
    }
  };

  const currentWeekObj = parsedWeeks.find((w) => w.weekNumber === activeWeekTab) || parsedWeeks[0];
  const currentDayObj = currentWeekObj?.days.find((d) => d.dayName === activeDayTab) || currentWeekObj?.days[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* HEADER MODALE */}
        <div className="px-6 py-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Importa Scheda da PDF
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  AI OCR & Parser
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Converti le vecchie schede cartacee o PDF in programmi Builder Athlete Manager
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CORPO DELLA MODALE IN BASE ALLO STEP */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* STEP 1: UPLOAD PDF */}
          {step === 'upload' && (
            <div className="space-y-6">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="border-2 border-dashed border-slate-700 hover:border-purple-500/60 rounded-2xl p-10 text-center bg-slate-900/30 hover:bg-slate-900/60 transition-all cursor-pointer group"
              >
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="pdf-upload-input"
                />
                <label htmlFor="pdf-upload-input" className="cursor-pointer block space-y-3">
                  <div className="w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                    <Upload className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">
                      Trascina qui la tua scheda PDF oppure <span className="text-purple-400 underline">sfoglia</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Supporta schede strutturate in settimane, giorni, superserie e note (Max 10 MB)
                    </p>
                  </div>
                </label>
              </div>

              {selectedFile && (
                <div className="p-4 rounded-xl bg-slate-900 border border-purple-500/30 flex items-center justify-between animate-fadeIn">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-purple-400 shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-white">{selectedFile.name}</h4>
                      <p className="text-xs text-slate-400">{(selectedFile.size / 1024).toFixed(1)} KB • Documento PDF</p>
                    </div>
                  </div>

                  <button
                    onClick={startPDFParsing}
                    className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-purple-500/20 transition cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    Analizza con AI Engine
                  </button>
                </div>
              )}

              {/* BOX CONFIGURAZIONE CHIAVE API GEMINI */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-purple-500/30 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-purple-500/20 text-purple-400 flex items-center justify-center">
                      <Key className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white flex items-center gap-2">
                        Google Gemini Vision AI (Massima Precisione)
                        {geminiApiKey ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            🟢 AI Attiva
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            ⚪ Opzionale
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Permette l'analisi multimodale di PDF complessi, griglie a più colonne, tabelle e note
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowKeyConfig(!showKeyConfig)}
                    className="text-purple-400 hover:text-purple-300 font-bold text-xs underline cursor-pointer"
                  >
                    {showKeyConfig ? 'Nascondi' : (geminiApiKey ? 'Modifica Chiave' : 'Inserisci Chiave API')}
                  </button>
                </div>

                {showKeyConfig && (
                  <div className="pt-2 border-t border-slate-800/80 space-y-2 animate-fadeIn">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type={isKeyVisible ? 'text' : 'password'}
                          value={geminiApiKey}
                          onChange={(e) => {
                            const val = e.target.value.trim();
                            setGeminiApiKey(val);
                            if (val) {
                              localStorage.setItem('gemini_api_key', val);
                            } else {
                              localStorage.removeItem('gemini_api_key');
                            }
                          }}
                          placeholder="Incolla qui la tua API Key Gemini (AIzaSy...)"
                          className="w-full pl-3 pr-10 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setIsKeyVisible(!isKeyVisible)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          {isKeyVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (geminiApiKey) {
                            localStorage.setItem('gemini_api_key', geminiApiKey);
                            showSuccess('Chiave API Gemini memorizzata con successo!');
                            setShowKeyConfig(false);
                          }
                        }}
                        className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs shrink-0 cursor-pointer"
                      >
                        Salva
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>La chiave viene salvata solo nel tuo browser in locale in modo sicuro.</span>
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noreferrer"
                        className="text-purple-400 hover:underline"
                      >
                        Ottieni una chiave gratuita su Google AI Studio →
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* BOX INFORMATIVO FORMATI SUPPORTATI */}
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2 text-xs">
                <h4 className="font-bold text-slate-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Formati Automaticamente Riconosciuti dal Parser:
                </h4>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-400">
                  <li className="flex items-center gap-1.5">• <strong>Settimane & Giorni:</strong> SETTIMANA 1, GIORNO 1, Allenamento A...</li>
                  <li className="flex items-center gap-1.5">• <strong>Esercizi a Tempo:</strong> "Periodo 01:00" → 60 sec</li>
                  <li className="flex items-center gap-1.5">• <strong>Recuperi Variabili:</strong> "01:30", "No Recupero" → 0 sec</li>
                  <li className="flex items-center gap-1.5">• <strong>Note & Indicazioni:</strong> Note tecniche, elastici, isometriche</li>
                </ul>
              </div>
            </div>
          )}

          {/* STEP 2: SPINNER PARSING AI */}
          {step === 'parsing' && (
            <div className="py-16 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-400 flex items-center justify-center mx-auto animate-spin">
                <Sparkles className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{parsingProgressText}</h3>
                <p className="text-xs text-slate-400 mt-1">Stiamo analizzando la scheda ed effettueremo il matching con il database master</p>
              </div>
            </div>
          )}

          {/* STEP 3: PREVIEW INTERATTIVA & REVIEW COACH */}
          {step === 'review' && (
            <div className="space-y-6">

              {/* OPZIONI GENERALI E DESTINAZIONE */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Titolo Programma</label>
                    <input
                      type="text"
                      value={workoutTitle}
                      onChange={(e) => setWorkoutTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Modalità Salvataggio</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSaveMode('template')}
                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                          saveMode === 'template'
                            ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        <Folder className="w-3.5 h-3.5" />
                        Master Template
                      </button>
                      <button
                        type="button"
                        onClick={() => setSaveMode('assign')}
                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                          saveMode === 'assign'
                            ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        <User className="w-3.5 h-3.5" />
                        Assegna ad Atleta
                      </button>
                    </div>
                  </div>
                </div>

                {saveMode === 'template' ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Cartella Destinazione (Opzionale)</label>
                    <select
                      value={selectedFolderId || ''}
                      onChange={(e) => setSelectedFolderId(e.target.value || undefined)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                    >
                      <option value="">Nessuna cartella (Principale)</option>
                      {folders.map((f) => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Seleziona Atleta *</label>
                    <select
                      value={selectedAthleteId}
                      onChange={(e) => setSelectedAthleteId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                    >
                      <option value="">-- Seleziona Atleta --</option>
                      {athletes.map((a) => (
                        <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* NAVIGATION TABS: SETTIMANE */}
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
                <span className="text-xs text-slate-500 font-bold uppercase shrink-0 mr-1">Settimane:</span>
                {parsedWeeks.map((w) => (
                  <button
                    key={w.weekNumber}
                    onClick={() => {
                      setActiveWeekTab(w.weekNumber);
                      if (w.days.length > 0) setActiveDayTab(w.days[0].dayName);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                      activeWeekTab === w.weekNumber
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Settimana {w.weekNumber}
                  </button>
                ))}
              </div>

              {/* NAVIGATION TABS: GIORNI */}
              {currentWeekObj && (
                <div className="flex items-center gap-2 overflow-x-auto">
                  <span className="text-xs text-slate-500 font-bold uppercase shrink-0 mr-1">Giorni:</span>
                  {currentWeekObj.days.map((d) => (
                    <button
                      key={d.dayName}
                      onClick={() => setActiveDayTab(d.dayName)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                        activeDayTab === d.dayName
                          ? 'bg-slate-800 text-amber-400 border border-amber-500/30'
                          : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-900'
                      }`}
                    >
                      {d.dayName} ({d.exercises.length} es)
                    </button>
                  ))}
                </div>
              )}

              {/* TABELLA ESERCIZI DEL GIORNO ATTIVO */}
              {currentDayObj && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                      Esercizi in {currentDayObj.dayName} (Settimana {currentWeekObj.weekNumber})
                    </h4>
                    <button
                      type="button"
                      onClick={() => addNewExercise(currentWeekObj.weekNumber, currentDayObj.dayName)}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-xs text-purple-300 font-bold rounded-lg border border-slate-800 flex items-center gap-1 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Aggiungi Esercizio
                    </button>
                  </div>

                  <div className="space-y-2">
                    {currentDayObj.exercises.map((ex, idx) => {
                      const match = ex.matchResult;
                      const isExact = match?.status === 'exact';
                      const isPartial = match?.status === 'partial';

                      return (
                        <div
                          key={ex.id}
                          className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80 space-y-3 hover:border-slate-700 transition"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2 flex-1">
                              <span className="w-6 h-6 rounded-md bg-purple-500/20 text-purple-300 font-bold text-xs flex items-center justify-center shrink-0">
                                {String.fromCharCode(65 + idx)}
                              </span>

                              {/* SELECTOR MATCH ESERCIZIO */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  {isExact && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> 100% Match DB
                                    </span>
                                  )}
                                  {isPartial && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                                      <AlertTriangle className="w-3 h-3" /> Suggerimento AI
                                    </span>
                                  )}
                                  {!isExact && !isPartial && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                                      <HelpCircle className="w-3 h-3" /> Testo Libero
                                    </span>
                                  )}
                                  <span className="text-[11px] text-slate-500 truncate">
                                    PDF: "{ex.rawName}"
                                  </span>
                                  {ex.alternative_exercise && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                                      Alt: {ex.alternative_exercise}
                                    </span>
                                  )}
                                </div>

                                <select
                                  value={
                                    libraryExercises.find((item) => item.name === ex.name)?.id || ''
                                  }
                                  onChange={(e) =>
                                    updateExerciseField(
                                      currentWeekObj.weekNumber,
                                      currentDayObj.dayName,
                                      ex.id,
                                      'matchedCatalogId',
                                      e.target.value
                                    )
                                  }
                                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-bold text-white focus:outline-none focus:border-purple-500 truncate"
                                >
                                  <option value="">{ex.name} (Mantieni Nome Originale PDF)</option>
                                  {match?.suggestions.map((s) => (
                                    <option key={s.id} value={s.id}>
                                      ✓ {s.name} ({s.category})
                                    </option>
                                  ))}
                                  <optgroup label="Tutto il Catalogo Master">
                                    {libraryExercises.map((libEx) => (
                                      <option key={libEx.id} value={libEx.id}>
                                        {libEx.name} ({libEx.category})
                                      </option>
                                    ))}
                                  </optgroup>
                                </select>
                              </div>
                            </div>

                            {/* PULSANTE ELIMINAZIONE */}
                            <button
                              type="button"
                              onClick={() =>
                                removeExercise(currentWeekObj.weekNumber, currentDayObj.dayName, ex.id)
                              }
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition self-end sm:self-center cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Dettagli parametri: Serie, Reps/Tempo, Recupero */}
                          <div className="pt-2 border-t border-slate-800/60 text-xs space-y-2">
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="block text-[10px] text-slate-400 mb-0.5 font-bold">Serie</label>
                                <input
                                  type="number"
                                  value={ex.sets}
                                  onChange={(e) =>
                                    updateExerciseField(
                                      currentWeekObj.weekNumber,
                                      currentDayObj.dayName,
                                      ex.id,
                                      'sets',
                                      parseInt(e.target.value) || 1
                                    )
                                  }
                                  className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-center text-white font-bold focus:border-[var(--color-primary)] focus:outline-none"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] text-slate-400 mb-0.5 font-bold">Target (Reps/Tempo)</label>
                                <input
                                  type="text"
                                  value={ex.reps_target}
                                  onChange={(e) =>
                                    updateExerciseField(
                                      currentWeekObj.weekNumber,
                                      currentDayObj.dayName,
                                      ex.id,
                                      'reps_target',
                                      e.target.value
                                    )
                                  }
                                  className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-center text-white font-bold focus:border-[var(--color-primary)] focus:outline-none"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] text-slate-400 mb-0.5 font-bold">Recupero (sec)</label>
                                <select
                                  value={ex.rest_seconds}
                                  onChange={(e) =>
                                    updateExerciseField(
                                      currentWeekObj.weekNumber,
                                      currentDayObj.dayName,
                                      ex.id,
                                      'rest_seconds',
                                      parseInt(e.target.value)
                                    )
                                  }
                                  className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-center text-white font-bold focus:border-[var(--color-primary)] focus:outline-none cursor-pointer"
                                >
                                  <option value={0}>No Recupero (0s)</option>
                                  <option value={30}>30s</option>
                                  <option value={60}>01:00 (60s)</option>
                                  <option value={90}>01:30 (90s)</option>
                                  <option value={120}>02:00 (120s)</option>
                                  <option value={180}>03:00 (180s)</option>
                                </select>
                              </div>
                            </div>

                            {/* Note Esercizio a tutta larghezza con textarea multiriga */}
                            <div>
                              <div className="flex items-center justify-between mb-0.5">
                                <label className="block text-[10px] text-slate-400 font-bold">Note Esercizio & Indicazioni Tecniche</label>
                                {ex.notes && ex.notes.length > 0 && (
                                  <span className="text-[9px] text-slate-500 font-mono">{ex.notes.length} car.</span>
                                )}
                              </div>
                              <textarea
                                rows={2}
                                value={ex.notes || ''}
                                placeholder="Note esecuzione, indicazioni tecniche, tempo/TUT o recuperi..."
                                onChange={(e) =>
                                  updateExerciseField(
                                    currentWeekObj.weekNumber,
                                    currentDayObj.dayName,
                                    ex.id,
                                    'notes',
                                    e.target.value
                                  )
                                }
                                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-200 text-xs leading-relaxed resize-y min-h-[46px] focus:outline-none focus:border-[var(--color-primary)] placeholder:text-slate-600 transition"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER MODALE CON PULSANTI AZIONE */}
        <div className="px-6 py-4 bg-slate-900/80 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={() => {
              if (step === 'review') setStep('upload');
              else onClose();
            }}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs transition cursor-pointer"
          >
            {step === 'review' ? '← Carica un altro PDF' : 'Annulla'}
          </button>

          {step === 'review' && (
            <button
              onClick={handleFinalSave}
              disabled={isSaving}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Salvataggio in corso...' : 'Salva Programma in BAM'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
