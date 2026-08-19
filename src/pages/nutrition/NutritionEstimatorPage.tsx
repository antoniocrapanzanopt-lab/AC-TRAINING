import React, { useState, useEffect, useMemo } from 'react';
import {
  Flame,
  Activity,
  Target,
  User,
  ShieldAlert,
  PieChart,
  Copy,
  CheckCircle2,
} from 'lucide-react';
import { useAthletes } from '../../context/AthletesContext';
import { useToast } from '../../context/ToastContext';
import {
  Gender,
  ActivityLevel,
  NutritionGoal,
  FormulaType,
  NutritionInput,
  calculateNutritionEstimates,
  ACTIVITY_MULTIPLIERS,
  GOAL_OFFSETS,
  NUTRITION_DISCLAIMER,
  NUTRITION_GUIDE_TEXT,
} from '../../utils/nutritionCalculator';

export const NutritionEstimatorPage: React.FC = () => {
  const { athletes } = useAthletes();
  const { showSuccess } = useToast();

  // Selezione Atleta per precaricamento
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('manual');

  // Input Form
  const [gender, setGender] = useState<Gender>('male');
  const [weightKg, setWeightKg] = useState<number>(75);
  const [heightCm, setHeightCm] = useState<number>(175);
  const [age, setAge] = useState<number>(28);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [bodyFatPercent, setBodyFatPercent] = useState<string>('');
  const [formula, setFormula] = useState<FormulaType>('mifflin_st_jeor');
  const [goal, setGoal] = useState<NutritionGoal>('maintenance');
  const [copied, setCopied] = useState<boolean>(false);

  // Precompila quando viene selezionato un atleta
  useEffect(() => {
    if (selectedAthleteId !== 'manual') {
      const ath = athletes.find((a) => a.id === selectedAthleteId);
      if (ath) {
        if (ath.gender) {
          const g = ath.gender.toLowerCase();
          setGender(g === 'f' || g === 'female' || g === 'donna' ? 'female' : 'male');
        }
        if (ath.dateOfBirth) {
          const birth = new Date(ath.dateOfBirth);
          const diff = Date.now() - birth.getTime();
          const calcAge = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
          if (calcAge > 10 && calcAge < 100) setAge(calcAge);
        }
      }
    }
  }, [selectedAthleteId, athletes]);

  // Se l'utente inserisce % massa grassa valida, permette la scelta Katch-McArdle
  const parsedBodyFat = bodyFatPercent.trim() ? Number(bodyFatPercent) : undefined;
  const hasValidBodyFat = typeof parsedBodyFat === 'number' && parsedBodyFat > 3 && parsedBodyFat < 60;

  // Calcolo Risultati Reattivo
  const results = useMemo(() => {
    const input: NutritionInput = {
      gender,
      weightKg,
      heightCm,
      age,
      activityLevel,
      bodyFatPercent: hasValidBodyFat ? parsedBodyFat : undefined,
      goal,
      formula: hasValidBodyFat ? formula : 'mifflin_st_jeor',
    };
    return calculateNutritionEstimates(input);
  }, [
    gender,
    weightKg,
    heightCm,
    age,
    activityLevel,
    parsedBodyFat,
    hasValidBodyFat,
    goal,
    formula,
  ]);

  // Copia report sintetico
  const handleCopySummary = () => {
    const athName = selectedAthleteId !== 'manual' 
      ? athletes.find(a => a.id === selectedAthleteId)?.firstName || 'Atleta' 
      : 'Stima';
    const text = `📊 STIMA FABBISOGNO ENERGETICO ORIENTATIVO (${athName})
• BMR (Metabolismo Basale): ${results.bmr} kcal
• TDEE (Spesa Totale): ${results.tdee} kcal
• Target Obiettivo (${GOAL_OFFSETS[goal].label}): ${results.targetKcal} kcal/giorno

🥗 MACRONUTRIENTI CONSIGLIATI:
• Proteine: ${results.macros.proteinGrams}g (${results.macros.proteinGramsPerKg} g/kg • ${results.macros.proteinKcal} kcal • ${results.macros.proteinPercent}%)
• Grassi: ${results.macros.fatGrams}g (${results.macros.fatGramsPerKg} g/kg • ${results.macros.fatKcal} kcal • ${results.macros.fatPercent}%)
• Carboidrati: ${results.macros.carbGrams}g (${results.macros.carbGramsPerKg} g/kg • ${results.macros.carbKcal} kcal • ${results.macros.carbPercent}%)

⚠️ NOTA: Valori orientativi generali a scopo educativo, non costituiscono prescrizione medica o dietetica.`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    showSuccess('Riepilogo copiato negli appunti!');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ─── TESTATA PRINCIPALE ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">Stima Fabbisogno Energetico</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[var(--color-primary)]/15 text-[var(--color-primary)] font-black text-[10px] uppercase tracking-wider border border-[var(--color-primary)]/30">
              BMR • TDEE • Macro
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            {NUTRITION_GUIDE_TEXT}
          </p>
        </div>

        <button
          type="button"
          onClick={handleCopySummary}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-850 text-slate-200 hover:text-white text-xs font-bold rounded-xl border border-slate-800 transition-all shadow-sm cursor-pointer"
        >
          {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-[var(--color-primary)]" />}
          <span>{copied ? 'Copiato!' : 'Copia Report'}</span>
        </button>
      </div>

      {/* ─── GRID PRINCIPALE: INPUT (SX) + RISULTATI (DX) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* COLONNA SINISTRA: DATI INPUT & PARAMETRI (5/12) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Box Selezione Atleta */}
          <div className="bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <User className="w-4 h-4 text-[var(--color-primary)]" />
                Soggetto / Atleta
              </span>
            </div>

            <div>
              <select
                value={selectedAthleteId}
                onChange={(e) => setSelectedAthleteId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white font-bold focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
              >
                <option value="manual">⚡ Inserimento Libero / Calcolo Rapido</option>
                {athletes.map((ath) => (
                  <option key={ath.id} value={ath.id}>
                    👤 {ath.firstName} {ath.lastName} ({ath.status || 'Attivo'})
                  </option>
                ))}
              </select>
            </div>

            {/* Sesso Biologico */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                Sesso Biologico (per formula BMR)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setGender('male')}
                  className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    gender === 'male'
                      ? 'bg-[var(--color-primary)] text-slate-950 shadow-md shadow-[var(--color-primary)]/20'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  Uomo (+5)
                </button>
                <button
                  type="button"
                  onClick={() => setGender('female')}
                  className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    gender === 'female'
                      ? 'bg-[var(--color-primary)] text-slate-950 shadow-md shadow-[var(--color-primary)]/20'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  Donna (-161)
                </button>
              </div>
            </div>

            {/* Dati Antropometrici: Peso, Altezza, Età */}
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Peso (kg)
                </label>
                <input
                  type="number"
                  min="30"
                  max="300"
                  value={weightKg}
                  onChange={(e) => setWeightKg(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono font-bold text-sm focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Altezza (cm)
                </label>
                <input
                  type="number"
                  min="100"
                  max="250"
                  value={heightCm}
                  onChange={(e) => setHeightCm(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono font-bold text-sm focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Età (anni)
                </label>
                <input
                  type="number"
                  min="14"
                  max="100"
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono font-bold text-sm focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
            </div>

            {/* % Massa Grassa Opzionale & Formula */}
            <div className="pt-2 border-t border-slate-800/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  % Massa Grassa (Body Fat - Opzionale)
                </label>
                <span className="text-[10px] font-bold text-slate-500">Per Katch-McArdle</span>
              </div>
              <input
                type="number"
                min="4"
                max="50"
                step="0.5"
                placeholder="es. 12.5 (opzionale)"
                value={bodyFatPercent}
                onChange={(e) => setBodyFatPercent(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-[var(--color-primary)] placeholder:text-slate-600"
              />

              {hasValidBodyFat && (
                <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1.5 animate-in fade-in duration-150">
                  <span className="text-[10px] font-black uppercase tracking-wider text-sky-400 block">
                    Formula BMR Disponibile
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormula('mifflin_st_jeor')}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                        formula === 'mifflin_st_jeor'
                          ? 'bg-sky-500 text-slate-950 font-black'
                          : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      Mifflin-St Jeor
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormula('katch_mcardle')}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                        formula === 'katch_mcardle'
                          ? 'bg-sky-500 text-slate-950 font-black'
                          : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      Katch-McArdle (LBM)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Box Livello di Attività & Moltiplicatore */}
          <div className="bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-3xl p-5 shadow-xl space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Livello di Attività Giornaliera (TDEE)
            </span>

            <div className="space-y-1.5">
              {(Object.keys(ACTIVITY_MULTIPLIERS) as ActivityLevel[]).map((key) => {
                const item = ACTIVITY_MULTIPLIERS[key];
                const isSelected = activityLevel === key;

                return (
                  <div
                    key={key}
                    onClick={() => setActivityLevel(key)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-[var(--color-primary)]/15 border-[var(--color-primary)] text-white shadow-md'
                        : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white">{item.label}</span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.2 rounded-full bg-slate-900 text-[var(--color-primary)] border border-slate-800">
                          x{item.multiplier}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {item.description}
                      </p>
                    </div>

                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected ? 'border-[var(--color-primary)] bg-[var(--color-primary)]' : 'border-slate-700 bg-slate-900'
                    }`}>
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Box Obiettivo Nutrizionale */}
          <div className="bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-3xl p-5 shadow-xl space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-400" />
              Obiettivo & Bilancio Calorico
            </span>

            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(GOAL_OFFSETS) as NutritionGoal[]).map((key) => {
                const g = GOAL_OFFSETS[key];
                const isSelected = goal === key;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setGoal(key);
                    }}
                    className={`p-3 rounded-2xl text-center border transition-all cursor-pointer flex flex-col items-center justify-center space-y-1 ${
                      isSelected
                        ? 'bg-[var(--color-primary)] text-slate-950 font-black border-[var(--color-primary)] shadow-md shadow-[var(--color-primary)]/20'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-black block leading-tight">{g.label.split('/')[0]}</span>
                    <span className="text-[9px] font-mono opacity-80 block">{g.rangeText}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* COLONNA DESTRA: INFOGRAFICA RISULTATI, BMR, TDEE, MACRO (7/12) */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Card Principale Calorie Target */}
          <div className="bg-gradient-to-br from-slate-900/90 to-slate-950 border border-slate-800/90 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--color-primary)]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-primary)] block">
                  Stima Calorie Giornaliere Consigliate
                </span>
                <h2 className="text-3xl sm:text-4xl font-black text-white font-mono mt-0.5">
                  {results.targetKcal.toLocaleString('it-IT')} <span className="text-sm font-sans font-bold text-slate-400">kcal / giorno</span>
                </h2>
              </div>

              <div className="px-3.5 py-1.5 rounded-2xl bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30 text-[var(--color-primary)] text-xs font-black uppercase tracking-wider">
                {GOAL_OFFSETS[goal].label}
              </div>
            </div>

            {/* BMR vs TDEE a confronto */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* BMR */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-1">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    BMR (Metabolismo Basale)
                  </span>
                  <span className="font-mono text-slate-500">{results.formulaUsed === 'katch_mcardle' ? 'Katch-McArdle' : 'Mifflin'}</span>
                </div>
                <div className="text-xl font-black font-mono text-white">
                  {results.bmr} <span className="text-xs font-sans text-slate-400 font-bold">kcal</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Calorie consumate a riposo assoluto per le funzioni vitali.
                </p>
              </div>

              {/* TDEE */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-1">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    TDEE (Spesa Totale)
                  </span>
                  <span className="font-mono text-slate-500">x{results.activityMultiplier}</span>
                </div>
                <div className="text-xl font-black font-mono text-white">
                  {results.tdee} <span className="text-xs font-sans text-slate-400 font-bold">kcal</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Fabbisogno energetico reale includendo attività e sport.
                </p>
              </div>
            </div>

            {/* Ripartizione Macronutrienti (Proteine 2.0, Grassi 0.9, Carbo Resto) */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-[var(--color-primary)]" />
                  Ripartizione Macronutrienti per Massa & Performance
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-400">
                  Base 2.0g/kg Pro • 0.9g/kg Fat
                </span>
              </div>

              {/* Barra Orizzontale a Percentuali */}
              <div className="w-full h-3 rounded-full bg-slate-950 overflow-hidden flex border border-slate-800">
                <div 
                  className="h-full bg-rose-500 transition-all duration-300" 
                  style={{ width: `${results.macros.proteinPercent}%` }} 
                  title={`Proteine ${results.macros.proteinPercent}%`}
                />
                <div 
                  className="h-full bg-amber-400 transition-all duration-300" 
                  style={{ width: `${results.macros.fatPercent}%` }} 
                  title={`Grassi ${results.macros.fatPercent}%`}
                />
                <div 
                  className="h-full bg-sky-400 transition-all duration-300" 
                  style={{ width: `${results.macros.carbPercent}%` }} 
                  title={`Carboidrati ${results.macros.carbPercent}%`}
                />
              </div>

              {/* 3 Card Macro */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {/* Proteine */}
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-rose-400">
                    <span>🥩 Proteine</span>
                    <span className="font-mono">{results.macros.proteinPercent}%</span>
                  </div>
                  <div className="text-2xl font-black font-mono text-white">
                    {results.macros.proteinGrams} <span className="text-xs font-sans text-rose-300">g</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>{results.macros.proteinGramsPerKg} g/kg</span>
                    <span>{results.macros.proteinKcal} kcal</span>
                  </div>
                </div>

                {/* Grassi */}
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-amber-400">
                    <span>🥑 Grassi</span>
                    <span className="font-mono">{results.macros.fatPercent}%</span>
                  </div>
                  <div className="text-2xl font-black font-mono text-white">
                    {results.macros.fatGrams} <span className="text-xs font-sans text-amber-300">g</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>{results.macros.fatGramsPerKg} g/kg</span>
                    <span>{results.macros.fatKcal} kcal</span>
                  </div>
                </div>

                {/* Carboidrati */}
                <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/30 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-sky-400">
                    <span>🍚 Carboidrati</span>
                    <span className="font-mono">{results.macros.carbPercent}%</span>
                  </div>
                  <div className="text-2xl font-black font-mono text-white">
                    {results.macros.carbGrams} <span className="text-xs font-sans text-sky-300">g</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>{results.macros.carbGramsPerKg} g/kg</span>
                    <span>{results.macros.carbKcal} kcal</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ─── DISCLAIMER OBBLIGATORIO LEGALE ─── */}
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 space-y-2 text-xs leading-relaxed text-slate-400">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Avvertenza Legale & Disclaimer Informativo</span>
            </div>
            <p className="text-[11px] text-slate-400">
              {NUTRITION_DISCLAIMER}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
