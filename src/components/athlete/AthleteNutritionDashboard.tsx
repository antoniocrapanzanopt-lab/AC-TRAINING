import React, { useState, useMemo, useEffect } from 'react';
import {
  Flame,
  Scale,
  FileText,
  Clock,
  CheckCircle2,
  Pencil,
  X,
  Save,
  Sparkles,
  Calculator,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { useNutrition } from '../../context/NutritionContext';
import { useAthletes } from '../../context/AthletesContext';
import { useToast } from '../../context/ToastContext';
import { AthleteCheckInModal } from './AthleteCheckInModal';
import { NUTRITION_DISCLAIMER, GOAL_OFFSETS, NutritionGoal } from '../../utils/nutritionCalculator';

interface AthleteNutritionDashboardProps {
  athleteId: string;
  onOpenEstimator?: () => void;
}

export const AthleteNutritionDashboard: React.FC<AthleteNutritionDashboardProps> = ({
  athleteId,
  onOpenEstimator,
}) => {
  const { getAthleteActivePlan, getAthleteCheckIns, savePlan } = useNutrition();
  const { athletes } = useAthletes();
  const { showSuccess } = useToast();

  const [isCheckInOpen, setIsCheckInOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

  // STATO CONSENSO & PRESA VISIONE OBBLIGATORIA
  const disclaimerStorageKey = `builder_nutrition_disclaimer_accepted_${athleteId}`;
  const [hasAcceptedDisclaimer, setHasAcceptedDisclaimer] = useState<boolean>(() => {
    try {
      return localStorage.getItem(disclaimerStorageKey) === 'true';
    } catch {
      return false;
    }
  });
  const [checkboxChecked, setCheckboxChecked] = useState<boolean>(false);

  const athlete = useMemo(() => athletes.find(a => a.id === athleteId), [athletes, athleteId]);
  const activePlan = useMemo(() => getAthleteActivePlan(athleteId), [athleteId, getAthleteActivePlan]);
  const checkIns = useMemo(() => getAthleteCheckIns(athleteId), [athleteId, getAthleteCheckIns]);
  const latestCheckIn = checkIns.length > 0 ? checkIns[0] : null;

  // Calcolo calorie e percentuali macro del piano attivo
  const planData = useMemo(() => {
    if (!activePlan) {
      return {
        targetKcal: 2200,
        proteinGrams: 150,
        carbGrams: 260,
        fatGrams: 60,
        goal: 'maintenance' as NutritionGoal,
        goalLabel: 'Mantenimento & Performance',
        notes: 'Segui il piano nutrizionale base concordato.',
        startDate: new Date().toISOString().slice(0, 10),
      };
    }

    const pKcal = activePlan.proteinGrams * 4;
    const cKcal = activePlan.carbGrams * 4;
    const fKcal = activePlan.fatGrams * 9;
    const totKcal = activePlan.targetKcal || (pKcal + cKcal + fKcal);

    const goalLabel =
      activePlan.goal === 'cutting' ? 'Definizione / Dimagrimento' :
      activePlan.goal === 'bulking' ? 'Massa / Ipertrofia' :
      'Mantenimento & Performance';

    return {
      targetKcal: totKcal,
      proteinGrams: activePlan.proteinGrams,
      carbGrams: activePlan.carbGrams,
      fatGrams: activePlan.fatGrams,
      proteinKcal: pKcal,
      carbKcal: cKcal,
      fatKcal: fKcal,
      proteinPercent: totKcal > 0 ? Math.round((pKcal / totKcal) * 100) : 30,
      carbPercent: totKcal > 0 ? Math.round((cKcal / totKcal) * 100) : 45,
      fatPercent: totKcal > 0 ? Math.round((fKcal / totKcal) * 100) : 25,
      goal: activePlan.goal,
      goalLabel,
      notes: activePlan.coachNotes || 'Segui la ripartizione dei pasti indicata dal coach.',
      startDate: activePlan.startDate,
      reviewDate: activePlan.reviewDate,
    };
  }, [activePlan]);

  // Form State Modifica Macro
  const [editGoal, setEditGoal] = useState<NutritionGoal>(planData.goal);
  const [editTargetKcal, setEditTargetKcal] = useState<number>(planData.targetKcal);
  const [editProteinGrams, setEditProteinGrams] = useState<number>(planData.proteinGrams);
  const [editCarbGrams, setEditCarbGrams] = useState<number>(planData.carbGrams);
  const [editFatGrams, setEditFatGrams] = useState<number>(planData.fatGrams);

  useEffect(() => {
    setEditGoal(planData.goal);
    setEditTargetKcal(planData.targetKcal);
    setEditProteinGrams(planData.proteinGrams);
    setEditCarbGrams(planData.carbGrams);
    setEditFatGrams(planData.fatGrams);
  }, [planData]);

  // Calcolo calorie calcolate dalla somma dei macro in modifica
  const editCalculatedKcal = useMemo(() => {
    return editProteinGrams * 4 + editCarbGrams * 4 + editFatGrams * 9;
  }, [editProteinGrams, editCarbGrams, editFatGrams]);

  const handleSaveCustomMacros = (e: React.FormEvent) => {
    e.preventDefault();
    const athleteName = athlete?.fullName || 'Atleta';

    savePlan({
      id: activePlan?.id,
      athleteId,
      athleteName,
      status: 'active',
      goal: editGoal,
      targetKcal: editTargetKcal,
      proteinGrams: editProteinGrams,
      carbGrams: editCarbGrams,
      fatGrams: editFatGrams,
      startDate: activePlan?.startDate || new Date().toISOString().slice(0, 10),
      coachNotes: activePlan?.coachNotes || 'Obiettivi aggiornati dall\'atleta.',
      mode: 'manual',
    }, 'Aggiornamento obiettivi e macro personalizzati');

    showSuccess(
      'Obiettivi Energetici Aggiornati',
      `I tuoi target (${editTargetKcal} kcal • P: ${editProteinGrams}g, C: ${editCarbGrams}g, F: ${editFatGrams}g) sono stati salvati con successo.`
    );
    setIsEditModalOpen(false);
  };

  // ─── GATE PRELIMINARE: AVVERTENZA LEGALE & CONSAPEVOLEZZA ───
  if (!hasAcceptedDisclaimer) {
    return (
      <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-rose-950/60 to-slate-950 border-2 border-rose-500/70 shadow-2xl shadow-rose-950/80 space-y-6">
          
          <div className="flex items-center gap-3.5 border-b border-rose-500/30 pb-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0 shadow-lg shadow-rose-500/20">
              <AlertTriangle className="w-6 h-6 animate-pulse text-rose-400" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-400 block">
                Presa Visione Obbligatoria
              </span>
              <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
                Avvertenza Legale & Consapevolezza
              </h3>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-rose-900/20 border border-rose-500/30 text-xs sm:text-sm text-rose-100/90 leading-relaxed space-y-3 font-medium">
            <p>
              {NUTRITION_DISCLAIMER}
            </p>
          </div>

          <label className="flex items-start gap-3.5 p-4 rounded-2xl bg-rose-950/80 border border-rose-500/50 cursor-pointer hover:border-rose-400 transition-colors select-none">
            <input
              type="checkbox"
              checked={checkboxChecked}
              onChange={(e) => setCheckboxChecked(e.target.checked)}
              className="w-5 h-5 rounded-lg border-2 border-rose-500 text-rose-600 focus:ring-rose-500 mt-0.5 shrink-0 cursor-pointer accent-rose-500"
            />
            <span className="text-xs font-bold text-white leading-snug">
              Dichiaro di aver letto, compreso e accettato che i valori calcolati sono una stima orientativa/educativa e non costituiscono una prescrizione medica o nutrizionale personalizzata.
            </span>
          </label>

          <button
            type="button"
            disabled={!checkboxChecked}
            onClick={() => {
              try {
                localStorage.setItem(disclaimerStorageKey, 'true');
              } catch {}
              setHasAcceptedDisclaimer(true);
            }}
            className="w-full py-4 px-6 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm uppercase tracking-wider transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-xl shadow-rose-600/30 cursor-pointer"
          >
            <span>Accetta e Visualizza i Tuoi Obiettivi Energetici</span>
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>
        </div>
      </div>
    );
  }

  // ─── VISTA COMPLETA PIANO NUTRIZIONALE (DOPO ACCETTAZIONE) ───
  return (
    <div className="space-y-6">
      
      {/* Badge Consenso Registrato + Bottone Reset */}
      <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          <span>Consenso e Presa Visione Legale Registrati</span>
        </div>
        <button
          type="button"
          onClick={() => {
            try {
              localStorage.removeItem(disclaimerStorageKey);
            } catch {}
            setHasAcceptedDisclaimer(false);
            setCheckboxChecked(false);
          }}
          className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Rileggi Disclaimer</span>
        </button>
      </div>

      {/* CARD PRINCIPALE: TARGET CALORICO & OBIETTIVO */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-slate-950 via-[var(--color-panel)] to-slate-950 border border-[var(--color-panel-border)] shadow-2xl space-y-6 relative overflow-hidden">
        
        {/* Glow di sfondo */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[var(--color-primary)]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-primary)] block">
              Piano Nutrizionale Attivo
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-[var(--color-text)] mt-0.5">
              I Tuoi Obiettivi Energetici Giornalieri
            </h2>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/30">
                {planData.goalLabel}
              </span>
              {planData.reviewDate && (
                <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                  Prossima revisione: {planData.reviewDate}
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons: Modifica Macro & Check-in */}
          <div className="flex items-center gap-2 flex-wrap">
            {onOpenEstimator && (
              <button
                type="button"
                onClick={onOpenEstimator}
                className="flex items-center justify-center gap-1.5 px-3.5 py-3 rounded-2xl bg-[var(--color-surface-strong)] hover:bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] font-bold text-xs transition-all shadow-sm cursor-pointer"
                title="Ricalcola fabbisogno energetico con i tuoi dati corporei"
              >
                <Calculator className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">Ricalcola</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl bg-[var(--color-surface-strong)] hover:bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] font-bold text-xs transition-all shadow-sm cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5 text-[var(--color-primary)]" />
              <span>Modifica Macro</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCheckInOpen(true)}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[var(--color-primary)] text-slate-950 font-black text-xs sm:text-sm hover:bg-[var(--color-primary-hover)] transition-all shadow-md shrink-0 cursor-pointer"
            >
              <Scale className="w-4 h-4 stroke-[2.5]" />
              <span>Registra Check-in</span>
            </button>
          </div>
        </div>

        {/* Target Kcal Big Highlight */}
        <div className="p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)] shrink-0 shadow-md shadow-[var(--color-primary)]/10">
              <Flame className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider block">
                Apporto Energetico Target
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black text-[var(--color-text)] tracking-tight">
                  {planData.targetKcal}
                </span>
                <span className="text-base font-bold text-[var(--color-primary)]">kcal / giorno</span>
              </div>
            </div>
          </div>

          <div className="text-xs text-[var(--color-text-muted)] space-y-1 sm:text-right">
            <span className="block font-bold text-[var(--color-text)]">Inizio Piano: {planData.startDate}</span>
            <span className="block text-[11px] text-[var(--color-text-muted)]">
              {activePlan?.mode === 'manual' ? 'Personalizzato da te' : 'Impostato dal tuo Coach'}
            </span>
          </div>
        </div>

        {/* 3 CARD MACRONUTRIENTI */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
          
          {/* PROTEINE */}
          <div className="p-5 rounded-2xl bg-[var(--color-panel)] border border-sky-500/30 space-y-2 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-sky-500">
                Proteine
              </span>
              <span className="text-[11px] font-bold text-[var(--color-text-muted)]">{planData.proteinPercent}%</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-[var(--color-text)]">{planData.proteinGrams}</span>
              <span className="text-xs font-bold text-[var(--color-text-muted)]">g / die</span>
            </div>
            <div className="h-2 w-full bg-[var(--color-surface-strong)] rounded-full overflow-hidden border border-[var(--color-border)]">
              <div className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 w-full" />
            </div>
            <span className="text-[10px] text-[var(--color-text-muted)] block pt-0.5">Recupero e massa magra</span>
          </div>

          {/* CARBOIDRATI */}
          <div className="p-5 rounded-2xl bg-[var(--color-panel)] border border-amber-500/30 space-y-2 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-amber-500">
                Carboidrati
              </span>
              <span className="text-[11px] font-bold text-[var(--color-text-muted)]">{planData.carbPercent}%</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-[var(--color-text)]">{planData.carbGrams}</span>
              <span className="text-xs font-bold text-[var(--color-text-muted)]">g / die</span>
            </div>
            <div className="h-2 w-full bg-[var(--color-surface-strong)] rounded-full overflow-hidden border border-[var(--color-border)]">
              <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 w-full" />
            </div>
            <span className="text-[10px] text-[var(--color-text-muted)] block pt-0.5">Energia per gli allenamenti</span>
          </div>

          {/* GRASSI */}
          <div className="p-5 rounded-2xl bg-[var(--color-panel)] border border-rose-500/30 space-y-2 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-rose-500">
                Grassi (Lipidi)
              </span>
              <span className="text-[11px] font-bold text-[var(--color-text-muted)]">{planData.fatPercent}%</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-[var(--color-text)]">{planData.fatGrams}</span>
              <span className="text-xs font-bold text-[var(--color-text-muted)]">g / die</span>
            </div>
            <div className="h-2 w-full bg-[var(--color-surface-strong)] rounded-full overflow-hidden border border-[var(--color-border)]">
              <div className="h-full bg-gradient-to-r from-rose-500 to-pink-500 w-full" />
            </div>
            <span className="text-[10px] text-[var(--color-text-muted)] block pt-0.5">Equilibrio ormonale e salute</span>
          </div>

        </div>

        {/* Note del Coach */}
        {planData.notes && (
          <div className="p-4 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] flex items-start gap-3 relative z-10 shadow-sm">
            <FileText className="w-4 h-4 text-[var(--color-primary)] shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] block">
                Indicazioni del Tuo Coach
              </span>
              <p className="text-xs text-[var(--color-text)] leading-relaxed italic">
                "{planData.notes}"
              </p>
            </div>
          </div>
        )}

      </div>

      {/* ULTIMO CHECK-IN & MONITORAGGIO */}
      {latestCheckIn && (
        <div className="p-5 sm:p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
            <h3 className="text-sm font-black text-[var(--color-text)] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Ultimo Check-in Registrato ({latestCheckIn.date})
            </h3>
            <span className="text-xs font-bold text-[var(--color-text)] bg-[var(--color-surface-strong)] px-3 py-1 rounded-full border border-[var(--color-border)]">
              Peso: {latestCheckIn.weightKg} kg
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 rounded-xl bg-[var(--color-surface-strong)] border border-[var(--color-border)] text-center space-y-1">
              <span className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase block">Aderenza</span>
              <span className="text-base font-black text-[var(--color-primary)]">{latestCheckIn.adherenceScore} / 5</span>
            </div>
            <div className="p-3 rounded-xl bg-[var(--color-surface-strong)] border border-[var(--color-border)] text-center space-y-1">
              <span className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase block">Fame</span>
              <span className="text-base font-black text-amber-500">{latestCheckIn.hungerScore} / 5</span>
            </div>
            <div className="p-3 rounded-xl bg-[var(--color-surface-strong)] border border-[var(--color-border)] text-center space-y-1">
              <span className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase block">Energia</span>
              <span className="text-base font-black text-sky-500">{latestCheckIn.energyScore} / 5</span>
            </div>
            <div className="p-3 rounded-xl bg-[var(--color-surface-strong)] border border-[var(--color-border)] text-center space-y-1">
              <span className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase block">Sonno</span>
              <span className="text-base font-black text-purple-500">{latestCheckIn.sleepScore} / 5</span>
            </div>
            <div className="p-3 rounded-xl bg-[var(--color-surface-strong)] border border-[var(--color-border)] text-center space-y-1 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase block">Digestione</span>
              <span className="text-base font-black text-rose-500">{latestCheckIn.digestionScore} / 5</span>
            </div>
          </div>
        </div>
      )}

      {/* DISCLAIMER & AVVERTENZA LEGALE */}
      <div className="p-5 sm:p-7 rounded-3xl bg-rose-500/10 border border-rose-500/40 shadow-md space-y-4">
        <div className="flex items-center gap-3.5 border-b border-rose-500/30 pb-3.5">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-500 shrink-0 shadow-sm">
            <AlertTriangle className="w-6 h-6 animate-pulse text-rose-500" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-rose-500 block">
              Presa Visione Obbligatoria
            </span>
            <h3 className="text-sm sm:text-base font-black text-[var(--color-text)] uppercase tracking-tight">
              Avvertenza Legale & Consapevolezza
            </h3>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--color-panel)] border border-rose-500/30 text-xs text-[var(--color-text)] leading-relaxed font-medium">
          <p>
            {NUTRITION_DISCLAIMER}
          </p>
        </div>
      </div>

      {/* MODAL MODIFICA MACRO E CALORIE */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-panel)] border border-[var(--color-panel-border)] w-full max-w-md rounded-3xl overflow-hidden shadow-2xl space-y-5 p-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)]">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[var(--color-text)]">Modifica Obiettivi & Macro</h3>
                  <span className="text-[10px] text-[var(--color-text-muted)] block">Personalizza calorie e grammature</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-strong)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomMacros} className="space-y-4 text-xs">
              
              {/* Obiettivo */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase">Obiettivo Nutrizionale</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['cutting', 'maintenance', 'bulking'] as NutritionGoal[]).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setEditGoal(g)}
                      className={`py-2 px-2 rounded-xl font-bold text-[11px] transition-all cursor-pointer ${
                        editGoal === g
                          ? 'bg-[var(--color-primary)] text-slate-950 font-black shadow-md'
                          : 'bg-[var(--color-surface-strong)] text-[var(--color-text-muted)] border border-[var(--color-border)] hover:text-[var(--color-text)]'
                      }`}
                    >
                      {GOAL_OFFSETS[g].label.split('/')[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Calorie */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase">Target Calorie (kcal)</label>
                  <button
                    type="button"
                    onClick={() => setEditTargetKcal(editCalculatedKcal)}
                    className="text-[10px] font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Usa somma macro ({editCalculatedKcal} kcal)</span>
                  </button>
                </div>
                <input
                  type="number"
                  min="0"
                  max="6000"
                  step="50"
                  value={editTargetKcal === 0 ? '' : editTargetKcal}
                  onFocus={(e) => { if (editTargetKcal === 0) e.target.select(); }}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditTargetKcal(val === '' ? 0 : Number(val));
                  }}
                  placeholder="2000"
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--color-surface-strong)] border border-[var(--color-border)] text-[var(--color-text)] font-mono font-black text-sm focus:outline-none focus:border-[var(--color-primary)]"
                  required
                />
              </div>

              {/* Grammi Macro */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-sky-500 uppercase">Proteine (g)</label>
                  <input
                    type="number"
                    min="0"
                    max="400"
                    value={editProteinGrams === 0 ? '' : editProteinGrams}
                    onFocus={(e) => { if (editProteinGrams === 0) e.target.select(); }}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditProteinGrams(val === '' ? 0 : Number(val));
                    }}
                    placeholder="150"
                    className="w-full px-3 py-2 rounded-xl bg-[var(--color-surface-strong)] border border-sky-500/40 text-[var(--color-text)] font-mono font-bold text-sm focus:outline-none focus:border-sky-400"
                    required
                  />
                  <span className="text-[9px] text-[var(--color-text-muted)] block font-mono">{editProteinGrams * 4} kcal</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-amber-500 uppercase">Carboidrati (g)</label>
                  <input
                    type="number"
                    min="0"
                    max="800"
                    value={editCarbGrams === 0 ? '' : editCarbGrams}
                    onFocus={(e) => { if (editCarbGrams === 0) e.target.select(); }}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditCarbGrams(val === '' ? 0 : Number(val));
                    }}
                    placeholder="250"
                    className="w-full px-3 py-2 rounded-xl bg-[var(--color-surface-strong)] border border-amber-500/40 text-[var(--color-text)] font-mono font-bold text-sm focus:outline-none focus:border-amber-400"
                    required
                  />
                  <span className="text-[9px] text-[var(--color-text-muted)] block font-mono">{editCarbGrams * 4} kcal</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-rose-500 uppercase">Grassi (g)</label>
                  <input
                    type="number"
                    min="0"
                    max="200"
                    value={editFatGrams === 0 ? '' : editFatGrams}
                    onFocus={(e) => { if (editFatGrams === 0) e.target.select(); }}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditFatGrams(val === '' ? 0 : Number(val));
                    }}
                    placeholder="60"
                    className="w-full px-3 py-2 rounded-xl bg-[var(--color-surface-strong)] border border-rose-500/40 text-[var(--color-text)] font-mono font-bold text-sm focus:outline-none focus:border-rose-400"
                    required
                  />
                  <span className="text-[9px] text-[var(--color-text-muted)] block font-mono">{editFatGrams * 9} kcal</span>
                </div>
              </div>

              {/* Azioni Modale */}
              <div className="flex items-center gap-2 pt-3 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[var(--color-surface-strong)] hover:bg-[var(--color-surface)] text-[var(--color-text)] font-bold text-xs"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-[var(--color-primary)]/20 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Salva Obiettivi</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL CHECK-IN */}
      <AthleteCheckInModal
        isOpen={isCheckInOpen}
        onClose={() => setIsCheckInOpen(false)}
        athleteId={athleteId}
        athleteName={athlete?.fullName}
        initialWeight={latestCheckIn?.weightKg || activePlan?.estimatorBasis?.weightKg}
      />

    </div>
  );
};
