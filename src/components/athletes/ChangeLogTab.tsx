import React, { useMemo } from 'react';
import { History, Activity, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAthletes } from '../../context/AthletesContext';

interface ChangeLogTabProps {
  athleteId: string;
}

export const ChangeLogTab: React.FC<ChangeLogTabProps> = ({ athleteId }) => {
  const { timeline } = useAthletes();

  const programEvents = useMemo(() => {
    if (!timeline || !timeline[athleteId]) return [];
    
    // Filtra eventi relativi a variazioni programma
    return timeline[athleteId].filter(evt => 
      evt.title.toLowerCase().includes('variazione programma') || 
      evt.title.toLowerCase().includes('scheda creata') || 
      evt.title.toLowerCase().includes('scheda assegnata') ||
      evt.title.toLowerCase().includes('copia locale creata') ||
      evt.title.toLowerCase().includes('scheda salvata')
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [timeline, athleteId]);

  if (programEvents.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 flex flex-col items-center justify-center text-center space-y-4 shadow-xl">
        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
          <Activity className="w-8 h-8 text-slate-500" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-black text-white">Nessuna Variazione</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Non è presente alcuno storico di variazioni o assegnazioni di programmi per questo atleta.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900 border border-slate-800">
        <div>
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <History className="w-5 h-5 text-[var(--color-primary)]" />
            Storico Variazioni Programma (Change Log)
          </h3>
          <p className="text-xs text-slate-400 mt-1">Tracciabilità completa delle modifiche manuali e IA.</p>
        </div>
        <span className="px-3 py-1 bg-slate-800 rounded-full text-xs font-bold text-slate-300 border border-slate-700">
          {programEvents.length} Eventi
        </span>
      </div>

      <div className="space-y-3">
        {programEvents.map(evt => {
          const isAI = evt.description?.includes('IA') || evt.description?.includes('Gemini');
          return (
            <div key={evt.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors space-y-2">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                    isAI ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                  }`}>
                    {isAI ? <Sparkles className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{evt.title}</h4>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {evt.description || 'Nessun dettaglio aggiuntivo.'}
                    </p>
                  </div>
                </div>
                <div className="text-[10px] font-bold text-slate-500 bg-slate-950 px-2 py-1 rounded-lg shrink-0 whitespace-nowrap">
                  {new Date(evt.createdAt).toLocaleDateString('it-IT')}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
