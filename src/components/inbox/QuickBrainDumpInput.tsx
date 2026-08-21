import React, { useState } from 'react';
import { Sparkles, Loader2, Lightbulb, Zap, ArrowRight } from 'lucide-react';
import { useInbox } from '../../context/InboxContext';

const QUICK_STARTERS = [
  {
    label: '🏋️ Errore Cliente',
    prompt: 'Oggi ho notato che molti clienti sbagliano l\'esecuzione di [Esercizio]: fanno [Errore]. Vorrei fare un video per spiegare la correzione e mandare un promemoria a [Nome].',
  },
  {
    label: '💡 Idea Reel / Social',
    prompt: 'Idea per un Reel sul tema [Argomento]: Spiegare perché [Mito/Credenza errata] non funziona e mostrare il metodo corretto in 3 passaggi.',
  },
  {
    label: '📋 Task / Feedback',
    prompt: 'Devo aggiornare la progressione carichi di [Nome Atleta], verificare i check settimanali e preparare il nuovo mesociclo.',
  },
];

export const QuickBrainDumpInput: React.FC = () => {
  const [content, setContent] = useState('');
  const { addEntry, isProcessing } = useInbox();

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!content.trim() || isProcessing) return;

    try {
      await addEntry(content, true);
      setContent('');
    } catch {
      // Errore già gestito nel context
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-5 shadow-2xl backdrop-blur-md relative overflow-hidden group focus-within:border-amber-500/60 transition-all">
      {/* Glow Effect */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-md shadow-amber-500/10">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              Centrale di Cattura & Brain Dump
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Gemini 3.7 Flash
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Scrivi liberamente: l'AI estrae Task, Hook per i Social, Note Atleti e Priorità operative
            </p>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 font-mono hidden sm:flex items-center gap-1.5">
          <span>Invia rapido:</span>
          <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300 text-[10px] font-bold">
            Cmd + Enter
          </kbd>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isProcessing}
            rows={3}
            placeholder="Cosa ti passa per la testa? Es: 'Oggi 3 clienti hanno sbagliato lo stacco rumeno piegando le ginocchia. Vorrei fare un Reel sulla cerniera d'anca e mandare un audio a Marco...'"
            className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 resize-none transition-all font-medium leading-relaxed"
          />
        </div>

        {/* STARTER RAPIDI QUANDO IL CAMPO È VUOTO */}
        {!content && (
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
              Spunti Rapidi:
            </span>
            {QUICK_STARTERS.map((starter, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setContent(starter.prompt)}
                className="px-2.5 py-1 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-amber-300 text-[11px] font-medium transition cursor-pointer flex items-center gap-1"
              >
                {starter.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
            <span>✨ Gemini estrae:</span>
            <strong className="text-amber-300 font-normal">Titolo • Task • Hook Reel • Categoria</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => addEntry(content, false)}
              disabled={!content.trim() || isProcessing}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold disabled:opacity-50 transition cursor-pointer"
            >
              Salva come Appunto Grezzo
            </button>

            <button
              type="submit"
              disabled={!content.trim() || isProcessing}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 transition cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Smistamento AI in corso...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Smista con Gemini AI
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
