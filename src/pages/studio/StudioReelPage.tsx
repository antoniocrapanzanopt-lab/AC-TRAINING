import React, { useState, useEffect, useMemo } from 'react';
import {
  Video,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Send,
  Image as ImageIcon,
  Zap,
  FileText,
  Save,
} from 'lucide-react';
import { useContents } from '../../context/ContentsContext';
import { useToast } from '../../context/ToastContext';
import { InstagramContent } from '../../types/inboxAndContent';
import { ReelBrollItem, StudioTab } from '../../types/studio';

interface StudioReelPageProps {
  initialContent?: InstagramContent | null;
  onNavigateToStudio: (tab: StudioTab, content?: InstagramContent) => void;
}

export const StudioReelPage: React.FC<StudioReelPageProps> = ({
  initialContent,
  onNavigateToStudio,
}) => {
  const { contents, createContent, updateContent } = useContents();
  const { showSuccess, showError } = useToast();

  // Lista di tutti i reel disponibili
  const reelContents = useMemo(() => {
    return contents.filter((c) => c.type === 'reel');
  }, [contents]);

  // Reel attualmente selezionato
  const [selectedReelId, setSelectedReelId] = useState<string | null>(
    initialContent?.id || reelContents[0]?.id || null
  );

  const activeReel = useMemo(() => {
    return contents.find((c) => c.id === selectedReelId) || null;
  }, [contents, selectedReelId]);

  // Campi editor Reel
  const [title, setTitle] = useState('');
  const [hook, setHook] = useState('');
  const [scriptMode, setScriptMode] = useState<'unified' | 'split'>('unified');
  const [scriptBody, setScriptBody] = useState('');
  const [problem, setProblem] = useState('');
  const [solution, setSolution] = useState('');
  const [practicalExample, setPracticalExample] = useState('');
  const [cta, setCta] = useState('');
  const [caption, setCaption] = useState('');
  const [editorNotes, setEditorNotes] = useState('');
  const [bRollList, setBRollList] = useState<ReelBrollItem[]>([
    { id: '1', label: 'Inquadratura principale (Talking Head mezza figura)', angle: 'Frontale 4K', isRecorded: false },
    { id: '2', label: 'B-Roll setup esercizio e posizionamento bilanciere', angle: 'Laterale a 45°', isRecorded: false },
    { id: '3', label: 'Dettaglio macro presa e attivazione dorsale', angle: 'Close-up', isRecorded: false },
  ]);

  const [newBrollText, setNewBrollText] = useState('');
  const [newBrollAngle, setNewBrollAngle] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Sincronizza stato quando cambia activeReel
  useEffect(() => {
    if (activeReel) {
      setTitle(activeReel.title || '');
      setHook(activeReel.hook || '');
      setCta(activeReel.call_to_action || '');
      setCaption(activeReel.caption || '');
      
      // Se presente script_body, carica nel testo unico e nei fallback
      if (activeReel.script_body) {
        setScriptBody(activeReel.script_body);
        setSolution(activeReel.script_body);
      }
      if (activeReel.internal_notes) {
        setEditorNotes(activeReel.internal_notes);
      }
    } else {
      // Default per nuovo reel
      setTitle('Nuovo Reel Tecnico');
      setHook('Il 90% delle persone sbaglia questo dettaglio nello stacco...');
      const defaultUnified = `[0-15s Problema]: La maggior parte pensa che basti stringere la schiena, ma il carico si sposta sui lombari.\n\n[15-45s Soluzione]: Il trucco reale è spingere il pavimento con le gambe mantenendo i dorsali ingaggiati prima di salire.\n\n[45-55s Dimostrazione]: Guarda la differenza tra farlo senza e con questo accorgimento.\n\n[55-60s CTA]: Salva il reel e provalo nel tuo prossimo allenamento!`;
      setScriptBody(defaultUnified);
      setProblem('La maggior parte pensa che basti stringere la schiena, ma il carico si sposta sui lombari.');
      setSolution('Il trucco reale è spingere il pavimento con le gambe mantenendo i dorsali ingaggiati prima di salire.');
      setPracticalExample('Guarda la differenza tra farlo senza e con questo accorgimento.');
      setCta('Salva il reel e provalo nel tuo prossimo allenamento!');
      setCaption('Ecco perché continui a sentire tensione alla schiena quando stacchi. Condividi con chi si allena!');
      setEditorNotes('Video editor: inserire zoom rapido al secondo 2 e testo giallo evidenziato.');
    }
  }, [activeReel]);

  // Calcolo impatto hook primi 3 secondi (1 - 100)
  const hookScore = useMemo(() => {
    if (!hook) return 20;
    let score = 50;
    if (hook.length > 20 && hook.length < 85) score += 20;
    if (/\d+/.test(hook)) score += 10; // Numeri (es. 90%, 3 errori)
    if (/\?|!/.test(hook)) score += 10;
    if (/errore|sbagli|perché|segreto|risultato|smetti/i.test(hook)) score += 10;
    return Math.min(score, 100);
  }, [hook]);

  // Toggle clip registrata
  const handleToggleBroll = (id: string) => {
    setBRollList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isRecorded: !item.isRecorded } : item))
    );
  };

  // Aggiungi clip B-Roll
  const handleAddBroll = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrollText.trim()) return;
    const newItem: ReelBrollItem = {
      id: Date.now().toString(),
      label: newBrollText.trim(),
      angle: newBrollAngle.trim() || 'Dettaglio',
      isRecorded: false,
    };
    setBRollList((prev) => [...prev, newItem]);
    setNewBrollText('');
    setNewBrollAngle('');
  };

  // Rimuovi clip B-Roll
  const handleRemoveBroll = (id: string) => {
    setBRollList((prev) => prev.filter((item) => item.id !== id));
  };

  // Helper per calcolare lo script_body in base alla modalità attiva
  const resolveScriptBody = () => {
    if (scriptMode === 'unified') {
      return scriptBody;
    }
    return `[HOOK (0-3s)]: ${hook}\n\n[PROBLEMA]: ${problem}\n\n[SOLUZIONE]: ${solution}\n\n[ESEMPIO]: ${practicalExample}\n\n[CTA]: ${cta}`;
  };

  // Salva modifiche al Reel
  const handleSaveReel = async () => {
    try {
      setIsSaving(true);
      const fullScriptBody = resolveScriptBody();

      if (activeReel) {
        await updateContent(activeReel.id, {
          title,
          hook,
          script_body: fullScriptBody,
          call_to_action: cta,
          caption,
          internal_notes: editorNotes,
        });
        showSuccess('Reel salvato con successo!');
      } else {
        const created = await createContent({
          title,
          type: 'reel',
          pillar: 'technique_execution',
          status: 'script_draft',
          hook,
          script_body: fullScriptBody,
          call_to_action: cta,
          caption,
          internal_notes: editorNotes,
        });
        setSelectedReelId(created.id);
        showSuccess('Nuovo Reel creato con successo!');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Errore nel salvataggio del Reel';
      showError(message);
    } finally {
      setIsSaving(false);
    }
  };

  // Invia a Montaggio (stato = 'editing')
  const handleSendToEditing = async () => {
    try {
      setIsSaving(true);
      const fullScriptBody = resolveScriptBody();

      if (activeReel) {
        await updateContent(activeReel.id, {
          title,
          hook,
          script_body: fullScriptBody,
          call_to_action: cta,
          caption,
          internal_notes: `[NOTE PER EDITING]: ${editorNotes}`,
          status: 'editing',
        });
        showSuccess('🎬 Reel inviato al montatore! Stato impostato su "Montaggio".');
      } else {
        const created = await createContent({
          title,
          type: 'reel',
          pillar: 'technique_execution',
          status: 'editing',
          hook,
          script_body: fullScriptBody,
          call_to_action: cta,
          caption,
          internal_notes: `[NOTE PER EDITING]: ${editorNotes}`,
        });
        setSelectedReelId(created.id);
        showSuccess('🎬 Reel creato e inviato a Montaggio!');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Errore durante l\'invio';
      showError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const recordedCount = bRollList.filter((b) => b.isRecorded).length;

  return (
    <div className="space-y-6 max-w-[1700px] mx-auto pb-16">
      
      {/* HEADER STUDIO REEL */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5 font-sans">
              <Video className="w-7 h-7 text-sky-400" />
              Reel Studio Pro
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
              Hook & Production Suite
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Scrivi hook ad alto impatto, struttura lo script video, gestisci la checklist delle riprese e invia a montaggio.
          </p>
        </div>

        {/* AZIONI PRINCIPALI: SALVA, LINK COVER, INVIA A MONTAGGIO */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigateToStudio('cover_studio', activeReel || undefined)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 transition-all shadow-sm"
          >
            <ImageIcon className="w-4 h-4" />
            <span>Crea Copertina</span>
          </button>

          <button
            type="button"
            onClick={handleSaveReel}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-all"
          >
            <Save className="w-4 h-4 text-amber-400" />
            <span>{isSaving ? 'Salvataggio...' : 'Salva Script'}</span>
          </button>

          <button
            type="button"
            onClick={handleSendToEditing}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-sky-400 hover:bg-sky-300 text-slate-950 shadow-md shadow-sky-500/25 transition-all active:scale-[0.98]"
          >
            <Send className="w-4 h-4" />
            <span>Invia a Montaggio</span>
          </button>
        </div>
      </div>

      {/* SELETTORE REEL ESISTENTE O NUOVO */}
      <div className="flex items-center justify-between gap-4 p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-slate-400 font-mono uppercase font-bold mr-1">Reel:</span>
          {reelContents.map((reel) => (
            <button
              key={reel.id}
              type="button"
              onClick={() => setSelectedReelId(reel.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedReelId === reel.id
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              {reel.title}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            setSelectedReelId(null);
            setTitle('Nuovo Reel');
          }}
          className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Nuovo Reel</span>
        </button>
      </div>

      {/* LAYOUT GRID: A SINISTRA SCRIPT & STRUTTURA, A DESTRA RIPRESE B-ROLL & CAPTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COLONNA SINISTRA: SCRIPT & HOOK (7 COLONNE SU LG) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* TITOLO REEL */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
              Titolo Interno Reel
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="es. Come attivare i dorsali nello stacco"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-sky-400 text-white font-bold text-base"
            />
          </div>

          {/* HOOK PRIMI 3 SECONDI & RETENTION SCORE */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-sky-500/10 via-slate-900/90 to-slate-950 border border-sky-500/30 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-sky-300 font-mono">
                  Hook Primi 3 Secondi (Decisivo per Retention)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400">Impatto stimato:</span>
                <span className={`px-2 py-0.5 rounded-md text-xs font-mono font-black ${
                  hookScore >= 80
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : hookScore >= 60
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}>
                  {hookScore}/100
                </span>
              </div>
            </div>

            <textarea
              value={hook}
              onChange={(e) => setHook(e.target.value)}
              placeholder="Cosa dici o mostri nei primissimi 3 secondi per bloccare lo scroll?"
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 focus:border-sky-400 text-white font-semibold text-sm resize-none"
            />

            <p className="text-[11px] text-slate-400 italic">
              💡 Consiglio: usa un numero ("3 motivi"), una provocazione ("smetti di fare questo") o una domanda diretta che tocca un punto dolente.
            </p>
          </div>

          {/* STRUTTURA NARRATIVA (TESTO UNICO O SPLIT) */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-white font-mono flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-400" />
                Testo & Struttura del Reel
              </h2>

              {/* TOGGLE MODALITÀ: TESTO UNICO (FLUIDO) VS 4 BLOCCHI */}
              <div className="flex items-center p-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    if (!scriptBody.trim()) {
                      const parts = [
                        problem ? `[0-15s Problema]: ${problem}` : '',
                        solution ? `[15-45s Soluzione]: ${solution}` : '',
                        practicalExample ? `[45-55s Dimostrazione]: ${practicalExample}` : '',
                        cta ? `[55-60s CTA]: ${cta}` : '',
                      ].filter(Boolean);
                      if (parts.length > 0) {
                        setScriptBody(parts.join('\n\n'));
                      }
                    }
                    setScriptMode('unified');
                  }}
                  className={`px-3 py-1 rounded-md font-semibold transition-all ${
                    scriptMode === 'unified'
                      ? 'bg-sky-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Testo Unico (Fluido)
                </button>
                <button
                  type="button"
                  onClick={() => setScriptMode('split')}
                  className={`px-3 py-1 rounded-md font-semibold transition-all ${
                    scriptMode === 'split'
                      ? 'bg-sky-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  4 Blocchi Separati
                </button>
              </div>
            </div>

            {scriptMode === 'unified' ? (
              /* MODALITÀ TESTO UNICO FLUIDO: ZERO FATICA A SCRIVERE */
              <div className="space-y-3">
                {/* TOOLBAR DI AIUTO TIMING */}
                <div className="flex items-center justify-between gap-2 flex-wrap text-[11px]">
                  <span className="text-slate-400">
                    Scrivi il testo continuo del video. Clicca sui pulsanti per inserire al volo i punti chiave:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() =>
                        setScriptBody((prev) => (prev ? prev + '\n\n' : '') + '[0-15s Problema]: ')
                      }
                      className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 font-mono transition-colors"
                      title="Inserisci marcatore Problema"
                    >
                      + Problema
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setScriptBody((prev) => (prev ? prev + '\n\n' : '') + '[15-45s Soluzione]: ')
                      }
                      className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 font-mono transition-colors"
                      title="Inserisci marcatore Soluzione"
                    >
                      + Soluzione
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setScriptBody((prev) => (prev ? prev + '\n\n' : '') + '[45-55s Dimostrazione]: ')
                      }
                      className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-mono transition-colors"
                      title="Inserisci marcatore Esempio/Dimostrazione"
                    >
                      + Dimostrazione
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setScriptBody((prev) => (prev ? prev + '\n\n' : '') + '[55-60s CTA]: ')
                      }
                      className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-purple-300 border border-slate-700 font-mono transition-colors"
                      title="Inserisci marcatore Call to Action"
                    >
                      + CTA
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const template = `[0-15s Problema]: \n\n[15-45s Soluzione]: \n\n[45-55s Dimostrazione]: \n\n[55-60s CTA]: `;
                        setScriptBody((prev) => (prev ? prev + '\n\n' + template : template));
                      }}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 font-mono transition-colors"
                      title="Inserisci schema completo 60 secondi"
                    >
                      + Schema 60s
                    </button>
                  </div>
                </div>

                {/* UNICO TEXTAREA FLUIDO E SPAZIOSO */}
                <div className="relative">
                  <textarea
                    value={scriptBody}
                    onChange={(e) => setScriptBody(e.target.value)}
                    placeholder="Scrivi qui tutto il testo del tuo Reel in modo fluido e continuo (cosa dici nei primi 15 secondi, spiegazione pratica, dimostrazione ed eventuale invito all'azione)..."
                    rows={10}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 focus:border-sky-400 text-white text-sm leading-relaxed resize-y min-h-[240px] placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-400/50"
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1 px-1">
                    <span className="italic">💡 Nessun box separato: scrivi liberamente tutto d'un fiato.</span>
                    <span className="font-mono text-slate-400">
                      {scriptBody.length} caratteri • {scriptBody.trim().split(/\s+/).filter(Boolean).length} parole • ~{Math.max(1, Math.round(scriptBody.trim().split(/\s+/).filter(Boolean).length / 2.5))}s parlato
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* MODALITÀ 4 BLOCCHI SEPARATI (LEGACY) */
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">
                    1. Problema & Convinzione Errata (0 - 15s)
                  </label>
                  <textarea
                    value={problem}
                    onChange={(e) => setProblem(e.target.value)}
                    placeholder="Qual è l'errore o il falso mito da smontare?"
                    rows={2}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-sky-400 text-white text-xs resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">
                    2. Soluzione Tecnica / Principio Biomeccanico (15 - 45s)
                  </label>
                  <textarea
                    value={solution}
                    onChange={(e) => setSolution(e.target.value)}
                    placeholder="La spiegazione scientifica ma pratica del coach..."
                    rows={3}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-sky-400 text-white text-xs resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">
                    3. Esempio Pratico / Dimostrazione Visiva (45 - 55s)
                  </label>
                  <textarea
                    value={practicalExample}
                    onChange={(e) => setPracticalExample(e.target.value)}
                    placeholder="Cosa mostrare a video come test di verifica..."
                    rows={2}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-sky-400 text-white text-xs resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">
                    4. Call to Action Finale (55 - 60s)
                  </label>
                  <input
                    type="text"
                    value={cta}
                    onChange={(e) => setCta(e.target.value)}
                    placeholder="es. Salva il post per la tua prossima sessione o scrivi INFO nei commenti"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-sky-400 text-white text-xs"
                  />
                </div>
              </div>
            )}
          </div>

        </div>

        {/* COLONNA DESTRA: RIPRESE B-ROLL & CAPTION (5 COLONNE SU LG) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* RIPRESE & B-ROLL CHECKLIST */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-white font-mono flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                  Riprese & B-Roll Checklist
                </h3>
                <span className="text-[11px] text-slate-400">
                  {recordedCount} su {bRollList.length} clip registrate
                </span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                recordedCount === bRollList.length && bRollList.length > 0
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-slate-800 text-slate-400'
              }`}>
                {recordedCount === bRollList.length && bRollList.length > 0 ? 'Riprese Complete' : 'In Corso'}
              </span>
            </div>

            {/* LISTA DELLE CLIP DA SPUNTARE */}
            <div className="space-y-2 max-h-[260px] overflow-y-auto custom-scrollbar">
              {bRollList.map((clip) => (
                <div
                  key={clip.id}
                  onClick={() => handleToggleBroll(clip.id)}
                  className={`cursor-pointer p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    clip.isRecorded
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-slate-300'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {clip.isRecorded ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className={`text-xs font-medium truncate ${clip.isRecorded ? 'line-through text-slate-400' : ''}`}>
                        {clip.label}
                      </p>
                      {clip.angle && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          Angolo: {clip.angle}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveBroll(clip.id);
                    }}
                    className="p-1 text-slate-600 hover:text-rose-400 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* FORM AGGIUNGI CLIP */}
            <form onSubmit={handleAddBroll} className="pt-2 border-t border-slate-800 space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newBrollText}
                  onChange={(e) => setNewBrollText(e.target.value)}
                  placeholder="Nuova clip (es. Inquadratura ginocchia stacco)"
                  className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                />
                <input
                  type="text"
                  value={newBrollAngle}
                  onChange={(e) => setNewBrollAngle(e.target.value)}
                  placeholder="Angolazione"
                  className="w-24 px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                />
                <button
                  type="submit"
                  disabled={!newBrollText.trim()}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold disabled:opacity-40"
                >
                  +
                </button>
              </div>
            </form>
          </div>

          {/* CAPTION & HASHTAGS */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono block">
              Caption & Testo di Accompagnamento
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Testo del post su Instagram, hashtag e spiegazione approfondita..."
              rows={4}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-sky-400 text-white text-xs resize-none"
            />
          </div>

          {/* NOTE PER IL MONTATORE */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-amber-400 font-mono block">
              Note per il Montatore (Ritmo, Musica, Grafiche)
            </label>
            <textarea
              value={editorNotes}
              onChange={(e) => setEditorNotes(e.target.value)}
              placeholder="es. Tagli rapidi ogni 1.5s, musica lo-fi energica, testo giallo sincronizzato sulle parole chiave..."
              rows={2}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-400 text-white text-xs resize-none"
            />
          </div>

        </div>

      </div>

    </div>
  );
};
