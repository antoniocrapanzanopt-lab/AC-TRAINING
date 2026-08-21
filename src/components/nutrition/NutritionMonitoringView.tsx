import React, { useMemo } from 'react';
import {
  Scale,
  AlertTriangle,
  Calendar,
  Trash2,
  Activity,
} from 'lucide-react';
import {
  NutritionPlan,
  NutritionSuggestedAction,
} from '../../types/nutrition';
import { useNutrition } from '../../context/NutritionContext';
import { useCommunications } from '../../context/CommunicationsContext';
import { useToast } from '../../context/ToastContext';

interface NutritionMonitoringViewProps {
  athleteId: string;
  athleteName: string;
  athletePhone?: string;
  activePlan?: NutritionPlan;
  onNavigateToMacros?: () => void;
}

export const NutritionMonitoringView: React.FC<NutritionMonitoringViewProps> = ({
  athleteId,
  athleteName,
  athletePhone,
  activePlan,
  onNavigateToMacros,
}) => {
  const { getAthleteCheckIns, getAthleteAlerts, deleteCheckIn } = useNutrition();
  const { openWhatsApp } = useCommunications();
  const { showSuccess, showInfo } = useToast();

  const checkIns = useMemo(() => getAthleteCheckIns(athleteId), [athleteId, getAthleteCheckIns]);
  const alerts = useMemo(() => getAthleteAlerts(athleteId), [athleteId, getAthleteAlerts]);

  // Statistiche Peso & Medie
  const stats = useMemo(() => {
    if (checkIns.length === 0) {
      return {
        currentWeight: activePlan?.estimatorBasis?.weightKg || 0,
        startWeight: activePlan?.estimatorBasis?.weightKg || 0,
        totalDelta: 0,
        weeklyAvg: 0,
        last7DaysAvg: 0,
        prev7DaysAvg: 0,
        avgAdherence: 0,
        avgHunger: 0,
        avgEnergy: 0,
      };
    }

    const currentWeight = checkIns[0].weightKg;
    const startWeight = checkIns[checkIns.length - 1].weightKg;
    const totalDelta = Number((currentWeight - startWeight).toFixed(1));

    // Media ultimi 7 giorni
    const now = Date.now();
    const ms7Days = 7 * 24 * 60 * 60 * 1000;
    const last7DaysCheckIns = checkIns.filter(c => now - new Date(c.date).getTime() <= ms7Days);
    const last7DaysAvg = last7DaysCheckIns.length > 0
      ? Number((last7DaysCheckIns.reduce((acc, c) => acc + c.weightKg, 0) / last7DaysCheckIns.length).toFixed(1))
      : currentWeight;

    // Medie parametri benessere
    const totalAdherence = checkIns.reduce((acc, c) => acc + c.adherenceScore, 0);
    const totalHunger = checkIns.reduce((acc, c) => acc + c.hungerScore, 0);
    const totalEnergy = checkIns.reduce((acc, c) => acc + c.energyScore, 0);

    return {
      currentWeight,
      startWeight,
      totalDelta,
      last7DaysAvg,
      avgAdherence: Number((totalAdherence / checkIns.length).toFixed(1)),
      avgHunger: Number((totalHunger / checkIns.length).toFixed(1)),
      avgEnergy: Number((totalEnergy / checkIns.length).toFixed(1)),
    };
  }, [checkIns, activePlan]);

  // Gestione Azioni Alert Coach
  const handleAction = (action: NutritionSuggestedAction, _alertTitle?: string) => {
    if (action === 'modify_kcal' || action === 'modify_macros') {
      if (onNavigateToMacros) {
        onNavigateToMacros();
        showInfo('Editor Macro', 'Reindirizzato alla modifica target per apportare le correzioni.');
      }
    } else if (action === 'contact_athlete') {
      if (athletePhone) {
        const msg = `Ciao ${athleteName}, ho analizzato il tuo ultimo check-in nutrizionale e desidero fare un breve punto con te.`;
        openWhatsApp(athletePhone, msg);
      } else {
        showInfo('Contatta Atleta', `Invia un messaggio o avviso in-app a ${athleteName}.`);
      }
    } else if (action === 'request_checkin') {
      showSuccess('Richiesta Inviata', `Notifica di richiesta check-in inviata a ${athleteName}.`);
    } else if (action === 'keep') {
      showInfo('Confermato', `Decisione registrata: mantenimento dei target attuali per ${athleteName}.`);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. ALERT E SEGNALAZIONI OPERATIVE COACH */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Alert Operativi & Decisioni Consigliate ({alerts.length})
          </h3>

          <div className="grid grid-cols-1 gap-3">
            {alerts.map((alt) => (
              <div
                key={alt.id}
                className={`p-4 sm:p-5 rounded-2xl border shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  alt.severity === 'alert'
                    ? 'bg-rose-950/30 border-rose-500/50 text-rose-200'
                    : alt.severity === 'warning'
                    ? 'bg-amber-950/30 border-amber-500/50 text-amber-200'
                    : 'bg-blue-950/30 border-blue-500/50 text-blue-200'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                      alt.severity === 'alert'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : alt.severity === 'warning'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                    }`}>
                      {alt.severity === 'alert' ? 'Attenzione' : alt.severity === 'warning' ? 'Avviso' : 'Info'}
                    </span>
                    <h4 className="text-sm font-black text-white">{alt.title}</h4>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{alt.description}</p>
                </div>

                {/* Pulsanti di Azione Decisionali */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {alt.suggestedActions.includes('modify_kcal') && (
                    <button
                      onClick={() => handleAction('modify_kcal', alt.title)}
                      className="px-3 py-1.5 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all cursor-pointer shadow-md"
                    >
                      Modifica Target
                    </button>
                  )}
                  {alt.suggestedActions.includes('contact_athlete') && (
                    <button
                      onClick={() => handleAction('contact_athlete', alt.title)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold text-xs hover:bg-emerald-500/20 transition-all cursor-pointer"
                    >
                      Contatta Atleta
                    </button>
                  )}
                  {alt.suggestedActions.includes('request_checkin') && (
                    <button
                      onClick={() => handleAction('request_checkin', alt.title)}
                      className="px-3 py-1.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/30 font-bold text-xs hover:bg-sky-500/20 transition-all cursor-pointer"
                    >
                      Richiedi Check-in
                    </button>
                  )}
                  {alt.suggestedActions.includes('keep') && (
                    <button
                      onClick={() => handleAction('keep', alt.title)}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 font-bold text-xs hover:text-white transition-all cursor-pointer"
                    >
                      Mantieni Target
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. KPI CARD DI MONITORAGGIO & ANDAMENTO */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        
        {/* Peso Attuale */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Peso Attuale</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-white">{stats.currentWeight}</span>
            <span className="text-xs font-bold text-slate-500">kg</span>
          </div>
          <span className="text-[11px] text-slate-400 block">
            Iniziale: {stats.startWeight} kg ({stats.totalDelta > 0 ? `+${stats.totalDelta}` : stats.totalDelta} kg)
          </span>
        </div>

        {/* Media Ultimi 7 Giorni */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Media 7 Giorni</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-400">{stats.last7DaysAvg}</span>
            <span className="text-xs font-bold text-slate-500">kg</span>
          </div>
          <span className="text-[11px] text-slate-400 block">Peso medio stabilizzato</span>
        </div>

        {/* Aderenza Media */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Aderenza Media</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-[var(--color-primary)]">{stats.avgAdherence || '-'}</span>
            <span className="text-xs font-bold text-slate-500">/ 5</span>
          </div>
          <span className="text-[11px] text-slate-400 block">Rispetto dei target</span>
        </div>

        {/* Fame & Energia */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fame / Energia</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-sky-400">{stats.avgHunger || '-'}</span>
            <span className="text-xs font-bold text-slate-500">/</span>
            <span className="text-2xl font-black text-purple-400">{stats.avgEnergy || '-'}</span>
          </div>
          <span className="text-[11px] text-slate-400 block">Valutazione media (1-5)</span>
        </div>

      </div>

      {/* 3. STORICO DEI CHECK-IN ATLETA */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-[var(--color-primary)]" />
              Storico Check-in Nutrizionali ({checkIns.length})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Valutazioni inserite dall'atleta nel portale con scale di monitoraggio 1–5.
            </p>
          </div>
        </div>

        {checkIns.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <Scale className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-sm font-bold text-slate-400">Nessun check-in nutrizionale registrato.</p>
            <p className="text-xs text-slate-500">I check-in inviati dall'atleta nel portale compariranno automaticamente qui.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 uppercase font-black tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Peso</th>
                  <th className="py-3 px-4 text-center">Aderenza</th>
                  <th className="py-3 px-4 text-center">Fame</th>
                  <th className="py-3 px-4 text-center">Energia</th>
                  <th className="py-3 px-4 text-center">Sonno</th>
                  <th className="py-3 px-4 text-center">Digestione</th>
                  <th className="py-3 px-4">Note Atleta</th>
                  <th className="py-3 px-4 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {checkIns.map((chk, idx) => {
                  const prevChk = checkIns[idx + 1];
                  const delta = prevChk ? Number((chk.weightKg - prevChk.weightKg).toFixed(1)) : 0;

                  return (
                    <tr key={chk.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          {chk.date}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-black text-white whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{chk.weightKg} kg</span>
                          {delta !== 0 && (
                            <span className={`text-[10px] font-bold ${delta < 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                              ({delta > 0 ? `+${delta}` : delta})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          chk.adherenceScore >= 4 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                          chk.adherenceScore === 3 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                          'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}>
                          {chk.adherenceScore}/5
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          chk.hungerScore <= 2 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                          chk.hungerScore === 3 ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30' :
                          'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}>
                          {chk.hungerScore}/5
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          chk.energyScore >= 4 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                          chk.energyScore === 3 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                          'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}>
                          {chk.energyScore}/5
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-slate-300 font-bold">
                        {chk.sleepScore}/5
                      </td>
                      <td className="py-3 px-4 text-center text-slate-300 font-bold">
                        {chk.digestionScore}/5
                      </td>
                      <td className="py-3 px-4 text-slate-300 max-w-[200px] truncate">
                        {chk.notes || <span className="text-slate-600">-</span>}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            deleteCheckIn(chk.id);
                            showInfo('Eliminato', 'Check-in rimosso dallo storico.');
                          }}
                          className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                          title="Elimina check-in"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
