import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Video,
  Calendar,
  Flame,
  FileText,
  MessageSquare,
  Share2,
  Copy,
  Check,
  Sparkles,
  Layers,
  ChevronDown,
} from 'lucide-react';
import {
  InstagramContent,
  ContentType,
  ContentPillar,
  ContentStatus,
} from '../../types/inboxAndContent';
import { useContents } from '../../context/ContentsContext';
import { useToast } from '../../context/ToastContext';

interface ContentDrawerEditorProps {
  isOpen: boolean;
  onClose: () => void;
  contentToEdit?: InstagramContent | null;
  initialData?: Partial<InstagramContent>;
}

const CONTENT_TYPES: { value: ContentType; label: string; icon: string; desc: string }[] = [
  { value: 'reel', label: 'Reel', icon: '🎬', desc: 'Video breve 9:16' },
  { value: 'story', label: 'Storia', icon: '📱', desc: 'Interazione 24h' },
  { value: 'carousel', label: 'Carosello', icon: '📑', desc: 'Post a schede 4:5' },
  { value: 'post', label: 'Post', icon: '🖼️', desc: 'Foto + Caption' },
];

const CONTENT_PILLARS: { value: ContentPillar; label: string }[] = [
  { value: 'technique_execution', label: '🏋️ Tecnica & Esecuzione' },
  { value: 'common_mistakes', label: '❌ Errori Comuni' },
  { value: 'mindset_discipline', label: '🧠 Mindset & Disciplina' },
  { value: 'nutrition_science', label: '🥗 Scienza della Nutrizione' },
  { value: 'client_transformation', label: '⭐ Trasformazioni Clienti' },
  { value: 'coaching_faq', label: '💬 Domande Frequenti (FAQ)' },
  { value: 'authority_lifestyle', label: '👑 Authority & Lifestyle' },
  { value: 'promotion_launch', label: '🚀 Promozione & Lanci' },
];

const CONTENT_STATUSES: { value: ContentStatus; label: string }[] = [
  { value: 'idea', label: '💡 Idee & Spunti' },
  { value: 'script_draft', label: '📝 Script in Bozza' },
  { value: 'ready_to_record', label: '🎬 Pronto da Registrare' },
  { value: 'recorded', label: '📹 Registrato' },
  { value: 'editing', label: '✂️ In Montaggio' },
  { value: 'ready_to_publish', label: '🚀 Pronto da Pubblicare' },
  { value: 'published', label: '✅ Pubblicato' },
  { value: 'repurpose', label: '♻️ Da Riutilizzare' },
];

const QUICK_HOOK_TEMPLATES = [
  'Se senti [Esercizio] su [Muscolo errato], fermati subito: stai facendo questo errore...',
  'Il 90% delle persone sbaglia [Esercizio] perché non conosce questa regola...',
  'Smetti di fare [Esercizio/Abitudine] se vuoi [Risultato desiderato]. Fai invece così...',
  '3 errori invisibili che ti impediscono di progredire su [Obiettivo]...',
];

const SCRIPT_TEMPLATES = {
  reel: `1. Gancio visivo (0-3s): Mostra subito l'errore o il punto critico
2. Spiegazione rapida (4-15s): Perché questo compromette i risultati / provoca fastidio
3. Dimostrazione corretta (16-35s): Esecuzione guidata passo-passo con cue verbali
4. Ricapitolazione & CTA (36-45s): "Salva il video e applicalo nel prossimo allenamento"`,
  carousel: `Slide 1 (Copertina): Titolo forte + Immagine chiara del problema
Slide 2: Perché il metodo tradizionale fallisce
Slide 3: Il principio biomeccanico / nutrizionale corretto
Slide 4: Guida pratica applicabile in palestra
Slide 5: Esempio pratico / Tabella riassuntiva
Slide 6: CTA finale (Salva / Commenta per approfondire)`,
  story: `Storia 1: Sondaggio / Domanda per agganciare ("Ti capita mai di...?")
Storia 2: Spiegazione breve del perché succede
Storia 3: Consiglio pratico / Dimostrazione rapida
Storia 4: Box domande o invito ad andare in DM`,
  post: `Gancio iniziale (prima riga ad alto impatto)

Corpo del post: Spiegazione dettagliata con punti elenco per facilitare la lettura.

Call to Action finale.`,
};

export const ContentDrawerEditor: React.FC<ContentDrawerEditorProps> = ({
  isOpen,
  onClose,
  contentToEdit,
  initialData,
}) => {
  const { createContent, updateContent } = useContents();
  const { showSuccess } = useToast();

  const [title, setTitle] = useState('');
  const [type, setType] = useState<ContentType>('reel');
  const [pillar, setPillar] = useState<ContentPillar>('technique_execution');
  const [status, setStatus] = useState<ContentStatus>('idea');
  const [hook, setHook] = useState('');
  const [scriptBody, setScriptBody] = useState('');
  const [caption, setCaption] = useState('');
  const [callToAction, setCallToAction] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);

  useEffect(() => {
    if (contentToEdit) {
      setTitle(contentToEdit.title || '');
      setType(contentToEdit.type || 'reel');
      setPillar(contentToEdit.pillar || 'technique_execution');
      setStatus(contentToEdit.status || 'idea');
      setHook(contentToEdit.hook || '');
      setScriptBody(contentToEdit.script_body || '');
      setCaption(contentToEdit.caption || '');
      setCallToAction(contentToEdit.call_to_action || '');
      setScheduledFor(contentToEdit.scheduled_for ? contentToEdit.scheduled_for.slice(0, 16) : '');
      setInternalNotes(contentToEdit.internal_notes || '');
    } else if (initialData) {
      setTitle(initialData.title || '');
      setType(initialData.type || 'reel');
      setPillar(initialData.pillar || 'technique_execution');
      setStatus(initialData.status || 'idea');
      setHook(initialData.hook || '');
      setScriptBody(initialData.script_body || '');
      setCaption(initialData.caption || '');
      setCallToAction(initialData.call_to_action || '');
      setScheduledFor(initialData.scheduled_for ? initialData.scheduled_for.slice(0, 16) : '');
      setInternalNotes(initialData.internal_notes || '');
    } else {
      setTitle('');
      setType('reel');
      setPillar('technique_execution');
      setStatus('idea');
      setHook('');
      setScriptBody('');
      setCaption('');
      setCallToAction('');
      setScheduledFor('');
      setInternalNotes('');
    }
  }, [contentToEdit, initialData, isOpen]);

  if (!isOpen) return null;

  const handleCopyCaption = () => {
    if (!caption) return;
    navigator.clipboard.writeText(caption);
    setCopiedCaption(true);
    showSuccess('Didascalia copiata negli appunti!');
    setTimeout(() => setCopiedCaption(false), 2000);
  };

  const handleApplyScriptTemplate = () => {
    const template = SCRIPT_TEMPLATES[type];
    if (template) {
      setScriptBody((prev) => (prev ? `${prev}\n\n${template}` : template));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSaving) return;

    setIsSaving(true);
    try {
      const payload: Partial<InstagramContent> = {
        title: title.trim(),
        type,
        pillar,
        status,
        hook: hook.trim() || null,
        script_body: scriptBody.trim() || null,
        caption: caption.trim() || null,
        call_to_action: callToAction.trim() || null,
        scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
        internal_notes: internalNotes.trim() || null,
        origin_inbox_id: contentToEdit?.origin_inbox_id || initialData?.origin_inbox_id || null,
      };

      if (contentToEdit) {
        await updateContent(contentToEdit.id, payload);
      } else {
        await createContent(payload);
      }
      onClose();
    } catch {
      // Errore gestito nel context
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-slate-950 border border-slate-800/90 w-full max-w-5xl max-h-[92vh] rounded-3xl flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* HEADER MODALE CENTRATA */}
        <div className="px-6 py-4 bg-slate-900/95 border-b border-slate-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center justify-center shadow-md shadow-purple-500/10">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                {contentToEdit ? 'Modifica Contenuto' : 'Nuovo Contenuto Instagram'}
                {(contentToEdit?.origin_inbox_id || initialData?.origin_inbox_id) && (
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    Da Inbox AI ✨
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Pipeline editoriale & copywriter per Reel, Storie e Caroselli
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FORM MODALE A 2 COLONNE WIDE */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* COLONNA SINISTRA: TITOLO, FORMATO, HOOK, CAPTION & CTA */}
            <div className="space-y-5">
              {/* TITOLO CONTENUTO */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Titolo Contenuto / Idea *</span>
                  <span className="text-[10px] text-slate-500 font-mono">Breve e chiaro per la board</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="es. Errore Stacco Rumeno: Cerniera vs Accosciata"
                  className="w-full px-4 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-bold tracking-tight shadow-inner"
                />
              </div>

              {/* SELETTORE VISIVO FORMATO */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Formato Contenuto</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CONTENT_TYPES.map((t) => {
                    const isActive = type === t.value;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setType(t.value)}
                        className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isActive
                            ? 'bg-purple-500/20 border-purple-500 text-white shadow-md shadow-purple-500/10'
                            : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-base">{t.icon}</span>
                          {isActive && <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />}
                        </div>
                        <div className="mt-1">
                          <span className="text-xs font-bold block">{t.label}</span>
                          <span className="text-[10px] text-slate-500 block truncate">{t.desc}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* HOOK IN EVIDENZA (GIALLO ORO) */}
              <div className="space-y-2 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/30 shadow-lg shadow-amber-500/5 relative">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-amber-400" />
                    Hook Iniziale (I primi 3 secondi)
                  </label>
                  <span className="text-[10px] text-amber-400/80 font-mono">Blocca-scroll</span>
                </div>
                
                <textarea
                  rows={2}
                  value={hook}
                  onChange={(e) => setHook(e.target.value)}
                  placeholder="es. Se senti lo stacco rumeno sui quadricipiti invece che sui glutei, fermati subito e guarda questo..."
                  className="w-full px-3.5 py-2 bg-slate-950 border border-amber-500/40 rounded-xl text-xs text-amber-100 placeholder-amber-500/40 focus:outline-none focus:border-amber-400 resize-none font-bold leading-relaxed shadow-inner"
                />

                {/* QUICK HOOK TEMPLATES */}
                {!hook && (
                  <div className="pt-1">
                    <span className="text-[10px] font-bold text-slate-500 block mb-1">
                      💡 Spunti per l'Hook:
                    </span>
                    <div className="space-y-1">
                      {QUICK_HOOK_TEMPLATES.map((tmpl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setHook(tmpl)}
                          className="w-full text-left p-1.5 rounded-lg bg-slate-950/60 hover:bg-slate-900 border border-slate-800 text-[11px] text-slate-400 hover:text-amber-300 truncate transition cursor-pointer"
                        >
                          • {tmpl}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* CAPTION (DIDASCALIA) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                    Caption / Didascalia Post
                  </label>
                  {caption && (
                    <button
                      type="button"
                      onClick={handleCopyCaption}
                      className="text-[11px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 cursor-pointer bg-blue-500/10 px-2.5 py-0.5 rounded-lg border border-blue-500/20"
                    >
                      {copiedCaption ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedCaption ? 'Copiata!' : 'Copia per Instagram'}
                    </button>
                  )}
                </div>
                <textarea
                  rows={3}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Testo completo del post da pubblicare con spiegazione, valore e hashtag..."
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700/80 rounded-2xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none leading-relaxed"
                />
              </div>

              {/* CALL TO ACTION (CTA) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                  Call to Action (CTA)
                </label>
                <input
                  type="text"
                  value={callToAction}
                  onChange={(e) => setCallToAction(e.target.value)}
                  placeholder="es. Salva il Reel e commenta 'STACCO' per ricevere la scheda completa in DM"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>
            </div>

            {/* COLONNA DESTRA: SCRIPT, PILASTRO, FASE, DATA & NOTE */}
            <div className="space-y-5">
              {/* SCRIPT / SCENE */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-purple-400" />
                    Script & Scaletta Scene
                  </label>
                  <button
                    type="button"
                    onClick={handleApplyScriptTemplate}
                    className="text-[10px] font-bold text-purple-400 hover:text-purple-300 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    Inserisci Schema {type.toUpperCase()}
                  </button>
                </div>
                <textarea
                  rows={8}
                  value={scriptBody}
                  onChange={(e) => setScriptBody(e.target.value)}
                  placeholder="1. Mostra l'errore: squat con bilanciere avanti&#10;2. Spiega il focus su anca e tibie verticali&#10;3. Dimostra 3 reps perfette con spiegazione vocale"
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700/80 rounded-2xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none leading-relaxed font-mono"
                />
              </div>

              {/* PILASTRO & STATO PIPELINE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Pilastro Editoriale</label>
                  <div className="relative">
                    <select
                      value={pillar}
                      onChange={(e) => setPillar(e.target.value as ContentPillar)}
                      className="w-full pl-3.5 pr-8 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-medium appearance-none cursor-pointer"
                    >
                      {CONTENT_PILLARS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Fase Pipeline</label>
                  <div className="relative">
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as ContentStatus)}
                      className="w-full pl-3.5 pr-8 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-medium appearance-none cursor-pointer"
                    >
                      {CONTENT_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* DATA PROGRAMMATA & NOTE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    Data / Ora Pubblicazione
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledFor}
                    onChange={(e) => setScheduledFor(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    Note Interne
                  </label>
                  <input
                    type="text"
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="es. Maglietta nera, luce ad anello"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* FOOTER ELEVATO & STICKY */}
        <div className="px-6 py-4 bg-slate-900/95 border-t border-slate-800/80 flex items-center justify-between shrink-0 backdrop-blur-md shadow-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Annulla
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!title.trim() || isSaving}
            className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Salvataggio...' : contentToEdit ? 'Salva Modifiche' : 'Crea Contenuto'}
          </button>
        </div>
      </div>
    </div>
  );
};
