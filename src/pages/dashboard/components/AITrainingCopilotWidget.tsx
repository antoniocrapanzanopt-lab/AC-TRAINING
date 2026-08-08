import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  AlertTriangle,
  TrendingDown,
  Clock,
  TrendingUp,
  ChevronRight,
  ShieldAlert,
  Flame,
} from 'lucide-react';
import { useAthletes } from '../../../context/AthletesContext';
import { useApp } from '../../../context/AppContext';

interface CriticalNoteAlert {
  id: string;
  athleteId: string;
  athleteName: string;
  workoutTitle: string;
  exerciseName: string;
  noteText: string;
  severity: 'high' | 'medium';
  date: string;
}

interface PlateauAlert {
  id: string;
  athleteId: string;
  athleteName: string;
  exerciseName: string;
  currentWeightKg: number;
  weeksStagnant: number;
  suggestion: string;
}

interface InactivityAlert {
  id: string;
  athleteId: string;
  athleteName: string;
  lastWorkoutDate: string;
  daysInactive: number;
}

interface PRProgression {
  id: string;
  athleteId: string;
  athleteName: string;
  exerciseName: string;
  gainDescription: string;
  date: string;
}

export const AITrainingCopilotWidget: React.FC = () => {
  const { athletes } = useAthletes();
  const { setActiveTab } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'critical_notes' | 'plateaus' | 'inactivity' | 'progressions'>('critical_notes');

  // Demo Alerts per l'analisi tecnica delle schede
  const criticalNotes: CriticalNoteAlert[] = useMemo(() => [
    {
      id: 'cn-1',
      athleteId: athletes[0]?.id || 'ath-1',
      athleteName: athletes[0]?.fullName || 'Marco Rossi',
      workoutTitle: 'Ipertrofia Petto & Tricipiti',
      exerciseName: 'Panca Piana Bilanciere',
      noteText: 'Avvertito un lieve pizzico alla spalla destra nella 3ª serie con 85kg.',
      severity: 'high',
      date: 'Ieri',
    },
    {
      id: 'cn-2',
      athleteId: athletes[1]?.id || 'ath-2',
      athleteName: athletes[1]?.fullName || 'Giulia Bianchi',
      workoutTitle: 'Gambe & Core Power',
      exerciseName: 'Leg Press 45°',
      noteText: 'Forte affaticamento ai doms quadricipiti. Ridotte rep nella 4ª serie.',
      severity: 'medium',
      date: '2 giorni fa',
    },
  ], [athletes]);

  const plateaus: PlateauAlert[] = useMemo(() => [
    {
      id: 'pl-1',
      athleteId: athletes[0]?.id || 'ath-1',
      athleteName: athletes[0]?.fullName || 'Marco Rossi',
      exerciseName: 'Back Squat Bilanciere',
      currentWeightKg: 110,
      weeksStagnant: 4,
      suggestion: 'Consigliata variazione del tempo esecutivo (TUT 3-1-1) o rotazione con Front Squat.',
    },
    {
      id: 'pl-2',
      athleteId: athletes[2]?.id || 'ath-3',
      athleteName: athletes[2]?.fullName || 'Luca Verdi',
      exerciseName: 'Military Press Manubri',
      currentWeightKg: 24,
      weeksStagnant: 3,
      suggestion: 'Suggerito inserimento di una serie di scarico o lavoro complementare per i deltoidi.',
    },
  ], [athletes]);

  const inactivities: InactivityAlert[] = useMemo(() => [
    {
      id: 'in-1',
      athleteId: athletes[3]?.id || 'ath-4',
      athleteName: athletes[3]?.fullName || 'Elena Gialli',
      lastWorkoutDate: '8 giorni fa',
      daysInactive: 8,
    },
    {
      id: 'in-2',
      athleteId: athletes[4]?.id || 'ath-5',
      athleteName: athletes[4]?.fullName || 'Davide Neri',
      lastWorkoutDate: '11 giorni fa',
      daysInactive: 11,
    },
  ], [athletes]);

  const progressions: PRProgression[] = useMemo(() => [
    {
      id: 'pr-1',
      athleteId: athletes[0]?.id || 'ath-1',
      athleteName: athletes[0]?.fullName || 'Marco Rossi',
      exerciseName: 'Stacco da Terra Bilanciere',
      gainDescription: '+10 kg sollevati rispetto al mese scorso (Nuovo PR: 140kg)',
      date: 'Oggi',
    },
    {
      id: 'pr-2',
      athleteId: athletes[1]?.id || 'ath-2',
      athleteName: athletes[1]?.fullName || 'Giulia Bianchi',
      exerciseName: 'Trazioni alla Sbarra',
      gainDescription: 'Completate 10 rep a corpo libero (+2 rep rispetto al test precedente)',
      date: 'Ieri',
    },
  ], [athletes]);

  const handleOpenAthlete = (_athleteId: string) => {
    setActiveTab('atleti');
  };

  return (
    <div className="p-6 rounded-3xl bg-gradient-to-b from-slate-900 via-[var(--color-panel)] to-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-2xl space-y-6">
      {/* Header Widget */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-black text-white">AI Athlete Training Copilot</h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[var(--color-primary)] text-black uppercase tracking-wider">
              Gemini 3.6 Flash
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            L'assistente IA basato su Google Gemini 3.6 Flash scansiona in tempo reale le schede degli atleti per segnalare dolori, stallo carichi ed inattività.
          </p>
        </div>

        {/* Sub-Tabs Selector */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveSubTab('critical_notes')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeSubTab === 'critical_notes'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" /> Note & Fastidi ({criticalNotes.length})
          </button>
          <button
            onClick={() => setActiveSubTab('plateaus')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeSubTab === 'plateaus'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" /> Plateau ({plateaus.length})
          </button>
          <button
            onClick={() => setActiveSubTab('inactivity')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeSubTab === 'inactivity'
                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> Inattività ({inactivities.length})
          </button>
          <button
            onClick={() => setActiveSubTab('progressions')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeSubTab === 'progressions'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" /> Record ({progressions.length})
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: NOTE & FASTIDI SEGNALATI */}
      {activeSubTab === 'critical_notes' && (
        <div className="space-y-3">
          {criticalNotes.map(item => (
            <div
              key={item.id}
              onClick={() => handleOpenAthlete(item.athleteId)}
              className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-rose-500/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 shrink-0 mt-0.5">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-black text-white group-hover:text-rose-400 transition-colors">
                      {item.athleteName}
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {item.workoutTitle}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">• {item.date}</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                    <strong className="text-rose-400 font-bold">{item.exerciseName}:</strong> "{item.noteText}"
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 group-hover:text-white shrink-0 self-end sm:self-center">
                <span>Apri Scheda Atleta</span>
                <ChevronRight className="w-4 h-4 text-[var(--color-primary)]" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SUB-TAB 2: ANALISI PLATEAU / STALLO CARICHI */}
      {activeSubTab === 'plateaus' && (
        <div className="space-y-3">
          {plateaus.map(item => (
            <div
              key={item.id}
              onClick={() => handleOpenAthlete(item.athleteId)}
              className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0 mt-0.5">
                  <TrendingDown className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-black text-white group-hover:text-amber-400 transition-colors">
                      {item.athleteName}
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      Stallo da {item.weeksStagnant} settimane
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    Esercizio: <strong className="text-white">{item.exerciseName}</strong> ({item.currentWeightKg} kg)
                  </p>
                  <p className="text-xs text-amber-300/90 mt-1 bg-amber-950/30 p-2.5 rounded-xl border border-amber-900/40">
                    💡 <strong>Suggerimento IA:</strong> {item.suggestion}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 group-hover:text-white shrink-0 self-end sm:self-center">
                <span>Varia Scheda</span>
                <ChevronRight className="w-4 h-4 text-[var(--color-primary)]" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SUB-TAB 3: INATTIVITÀ & COSTANZA SCHEDE */}
      {activeSubTab === 'inactivity' && (
        <div className="space-y-3">
          {inactivities.map(item => (
            <div
              key={item.id}
              onClick={() => handleOpenAthlete(item.athleteId)}
              className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-orange-500/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white group-hover:text-orange-400 transition-colors">
                    {item.athleteName}
                  </h4>
                  <span className="text-xs text-slate-400 block">
                    Nessuna scheda ultimata negli ultimi <strong className="text-orange-400">{item.daysInactive} giorni</strong> (Ultimo allenamento: {item.lastWorkoutDate})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 group-hover:text-white shrink-0">
                <span>Vedi Profilo</span>
                <ChevronRight className="w-4 h-4 text-[var(--color-primary)]" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SUB-TAB 4: RECORD & PROGRESSIONI CARICHI */}
      {activeSubTab === 'progressions' && (
        <div className="space-y-3">
          {progressions.map(item => (
            <div
              key={item.id}
              onClick={() => handleOpenAthlete(item.athleteId)}
              className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0">
                  <Flame className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-black text-white group-hover:text-emerald-400 transition-colors">
                      {item.athleteName}
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      Nuovo PR 🔥
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    <strong className="text-white">{item.exerciseName}:</strong> {item.gainDescription}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 group-hover:text-white shrink-0">
                <span>Vedi Progresso</span>
                <ChevronRight className="w-4 h-4 text-[var(--color-primary)]" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
