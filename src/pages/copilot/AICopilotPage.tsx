import React from 'react';
import { Sparkles, Bot, ArrowLeft } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AITrainingCopilotWidget } from '../dashboard/components/AITrainingCopilotWidget';

export const AICopilotPage: React.FC = () => {
  const { setActiveTab } = useApp();

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8 animate-in fade-in duration-300">
      
      {/* ─── HEADER SEZIONE COPILOT ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10 shrink-0">
              <Bot className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  AI Training Copilot
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-bold text-[10px] uppercase border border-amber-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" /> Assistente Reale
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 font-medium mt-0.5">
                Centro di controllo prioritario degli atleti reali che richiedono modifiche alle schede, gestione infortuni o assegnazioni
              </p>
            </div>
          </div>
        </div>

        {/* Azione Ritorno a Dashboard */}
        <div className="flex items-center gap-2 self-start md:self-center">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className="px-3.5 py-2 rounded-2xl bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 text-xs font-bold flex items-center gap-2 transition-all active:scale-95 cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 text-slate-400" />
            <span>Torna alla Dashboard</span>
          </button>
        </div>
      </div>

      {/* ─── WIDGET COPILOT A TUTTO SCHERMO ─── */}
      <AITrainingCopilotWidget />
    </div>
  );
};
