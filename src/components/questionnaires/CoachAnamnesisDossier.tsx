import React, { useState, useEffect } from 'react';
import {
  FileText,
  AlertTriangle,
  Printer,
  Edit,
  Scale,
  Dumbbell,
  Moon,
  Utensils,
  Camera,
  ChevronDown,
  ChevronUp,
  Flame,
  Plus,
} from 'lucide-react';
import {
  AthleteOnboardingRecord,
  OnboardingQuestionnaireData,
} from '../../types/questionnaire';
import {
  getAthleteOnboardingResponse,
  generateExecutiveSummary,
} from '../../services/questionnaireService';
import { AthleteQuestionnaireWizard } from './AthleteQuestionnaireWizard';

interface CoachAnamnesisDossierProps {
  athleteId: string;
  athleteName: string;
  onNavigateToWorkouts?: () => void;
  onNavigateToNutrition?: () => void;
}

export const CoachAnamnesisDossier: React.FC<CoachAnamnesisDossierProps> = ({
  athleteId,
  athleteName,
  onNavigateToWorkouts,
  onNavigateToNutrition,
}) => {
  const [record, setRecord] = useState<AthleteOnboardingRecord | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isEditingWizardOpen, setIsEditingWizardOpen] = useState<boolean>(false);
  const [showRawAnswers, setShowRawAnswers] = useState<boolean>(false);
  const [activePhotoModal, setActivePhotoModal] = useState<string | null>(null);

  const loadData = async () => {
    if (!athleteId) return;
    setIsLoading(true);
    try {
      const res = await getAthleteOnboardingResponse(athleteId);
      setRecord(res);
    } catch (e) {
      console.error('Errore caricamento anamnesi atleta:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [athleteId]);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-3xl space-y-3">
        <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-400 font-bold">Caricamento dossier anamnesi...</p>
      </div>
    );
  }

  // Modalità Wizard per compilazione o modifica
  if (isEditingWizardOpen) {
    return (
      <AthleteQuestionnaireWizard
        athleteId={athleteId}
        athleteName={athleteName}
        isCoachMode={true}
        onComplete={(newRec) => {
          setRecord(newRec);
          setIsEditingWizardOpen(false);
        }}
        onClose={() => setIsEditingWizardOpen(false)}
      />
    );
  }

  // Stato Nessun Questionario Presente
  if (!record || !record.answers || Object.keys(record.answers).length === 0) {
    return (
      <div className="p-8 sm:p-12 text-center bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-3xl space-y-5">
        <div className="w-14 h-14 rounded-3xl bg-slate-900 border border-slate-800 text-slate-500 flex items-center justify-center mx-auto">
          <FileText className="w-7 h-7" />
        </div>

        <div className="space-y-1 max-w-md mx-auto">
          <h3 className="text-base font-bold text-white">
            Nessun Questionario Anamnesi Registrato
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {athleteName} non ha ancora completato il questionario di onboarding. Puoi compilare l'anamnesi direttamente oppure attendere l'invio da parte dell'atleta.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => setIsEditingWizardOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Compila Anamnesi per l'Atleta
          </button>
        </div>
      </div>
    );
  }

  const answers = record.answers as OnboardingQuestionnaireData;
  const summary = record.summary || generateExecutiveSummary(answers);
  const isDraft = record.status === 'draft';

  return (
    <div className="space-y-6 print:p-0 animate-in fade-in duration-200">
      {/* ─── TESTATA DOSSIER COACH ─── */}
      <div className="p-6 rounded-3xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[var(--color-primary)]/15 text-[var(--color-primary)] border border-[var(--color-primary)]/30 text-[10px] font-black uppercase">
              Dossier Onboarding {record.version}
            </span>
            {isDraft ? (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-black uppercase">
                Bozza in corso (Passo {record.currentStep})
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase">
                Completato & Verificato
              </span>
            )}
          </div>
          <h3 className="text-xl font-black text-white mt-1">
            Anamnesi & Valutazione Iniziale — {athleteName}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Ultimo aggiornamento: {record.updatedAt ? new Date(record.updatedAt).toLocaleDateString('it-IT') : '—'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200 hover:text-white hover:border-slate-600 transition-all cursor-pointer shadow"
          >
            <Printer className="w-4 h-4 text-sky-400" /> Stampa PDF
          </button>

          <button
            type="button"
            onClick={() => setIsEditingWizardOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all shadow-md cursor-pointer"
          >
            <Edit className="w-4 h-4" /> Modifica Dati Anamnesi
          </button>
        </div>
      </div>

      {/* ─── BOX RED FLAGS & SAFETY CHECK HIGHLIGHTS ─── */}
      {summary.safetyAlerts && summary.safetyAlerts.length > 0 && (
        <div className="p-5 rounded-3xl bg-red-950/40 border border-red-800/60 shadow-xl space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 animate-pulse" />
            <h4 className="text-xs font-black uppercase tracking-wider text-red-300">
              Safety Check & Red Flags Segnalati dall'Atleta ({summary.safetyAlerts.length})
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {summary.safetyAlerts.map((alert, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-2xl border text-xs space-y-1 ${
                  alert.severity === 'danger'
                    ? 'bg-red-950/70 border-red-700 text-red-200'
                    : 'bg-amber-950/60 border-amber-800 text-amber-200'
                }`}
              >
                <strong className="block font-bold text-sm text-white">
                  {alert.title}
                </strong>
                <p className="text-xs opacity-90 leading-relaxed">
                  {alert.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── GRIGLIA 4 CARD EXECUTIVE DOSSIER ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 1. OBIETTIVI & DISPONIBILITÀ */}
        <div className="p-5 rounded-3xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4">
          <h4 className="text-xs font-black uppercase tracking-wider text-[var(--color-primary)] border-b border-slate-800 pb-2.5 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Scale className="w-4 h-4" /> 1. Obiettivi & Disponibilità
            </span>
            <span className="text-[10px] text-slate-500 font-mono">STEP 1-2</span>
          </h4>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Obiettivo Principale:</span>
              <strong className="text-white capitalize font-black">{summary.primaryGoalLabel}</strong>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Frequenza Settimanale:</span>
              <strong className="text-[var(--color-primary)] font-black">{answers.weeklyDaysTarget} Allenamenti / Settimana</strong>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Durata Seduta:</span>
              <span className="text-white font-bold">{answers.sessionDurationMinutes} Minuti</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Fascia Oraria:</span>
              <span className="text-white font-bold capitalize">{answers.preferredTrainingTime || 'Non specificata'}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-400">Biometria di Partenza:</span>
              <span className="text-white font-mono font-bold">
                {answers.heightCm} cm • {answers.weightKg} kg (Sesso: {answers.gender})
              </span>
            </div>
          </div>
        </div>

        {/* 2. PROFILO ALLENAMENTO & ATTREZZATURA */}
        <div className="p-5 rounded-3xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4">
          <h4 className="text-xs font-black uppercase tracking-wider text-[var(--color-primary)] border-b border-slate-800 pb-2.5 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Dumbbell className="w-4 h-4" /> 2. Profilo Allenamento & Carichi
            </span>
            <span className="text-[10px] text-slate-500 font-mono">STEP 3</span>
          </h4>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Livello di Esperienza:</span>
              <strong className="text-white capitalize">{summary.experienceLabel}</strong>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Ambiente di Allenamento:</span>
              <strong className="text-white capitalize">{summary.trainingLocationLabel}</strong>
            </div>
            {answers.homeGymEquipment && answers.homeGymEquipment.length > 0 && (
              <div className="py-1 border-b border-slate-800/60 space-y-1">
                <span className="text-slate-400 block text-[11px]">Attrezzi a Casa:</span>
                <div className="flex flex-wrap gap-1">
                  {answers.homeGymEquipment.map((eq, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-lg bg-slate-900 text-slate-300 text-[10px] font-mono">
                      {eq}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-400">Carichi Noti:</span>
              <span className="text-[var(--color-primary)] font-mono font-bold">
                Squat: {answers.indicativeMaxLifts?.squatKg || '—'}kg • Panca: {answers.indicativeMaxLifts?.benchKg || '—'}kg • Stacco: {answers.indicativeMaxLifts?.deadliftKg || '—'}kg
              </span>
            </div>
          </div>
        </div>

        {/* 3. STILE DI VITA & RECUPERO */}
        <div className="p-5 rounded-3xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4">
          <h4 className="text-xs font-black uppercase tracking-wider text-[var(--color-primary)] border-b border-slate-800 pb-2.5 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Moon className="w-4 h-4" /> 3. Stile di Vita & Recupero
            </span>
            <span className="text-[10px] text-slate-500 font-mono">STEP 4</span>
          </h4>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Sonno Notturno:</span>
              <strong className="text-white">{answers.sleepHours} ore / notte ({answers.sleepQuality})</strong>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Livello Stress Giornaliero:</span>
              <strong className="text-white">{answers.dailyStressLevel} / 10</strong>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Attività Lavorativa (NEAT):</span>
              <span className="text-white capitalize">{answers.occupationType}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-400">Fumo / Alcol:</span>
              <span className="text-white capitalize">{answers.habitsSmokeAlcohol || 'Nessuna'}</span>
            </div>
          </div>
        </div>

        {/* 4. NUTRIZIONE & ABITUDINI */}
        <div className="p-5 rounded-3xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4">
          <h4 className="text-xs font-black uppercase tracking-wider text-[var(--color-primary)] border-b border-slate-800 pb-2.5 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Utensils className="w-4 h-4" /> 4. Nutrizione & Abitudini
            </span>
            <span className="text-[10px] text-slate-500 font-mono">STEP 6</span>
          </h4>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Pasti al Giorno:</span>
              <strong className="text-white">{answers.mealsPerDay} pasti (Colazione: {answers.breakfastHabit})</strong>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Regime Alimentare:</span>
              <strong className="text-white capitalize">{answers.dietaryRegime}</strong>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Tracciamento Calorie:</span>
              <span className="text-white">
                {answers.calorieTracking ? `Sì (${answers.calorieTrackingDetails?.appUsed || 'App'})` : 'No'}
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-400">Intolleranze / Allergie:</span>
              <span className="text-red-400 font-bold">
                {answers.foodAllergiesIntolerances && answers.foodAllergiesIntolerances.length > 0
                  ? answers.foodAllergiesIntolerances.join(', ')
                  : 'Nessuna intolleranza'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── GALLERY FOTO CHECK INIZIALE & ALLEGATI ─── */}
      {answers.progressPhotos && answers.progressPhotos.length > 0 && (
        <div className="p-5 rounded-3xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4">
          <h4 className="text-xs font-black uppercase tracking-wider text-[var(--color-primary)] border-b border-slate-800 pb-2.5 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Camera className="w-4 h-4" /> Foto Posturali di Partenza ({answers.progressPhotos.length})
            </span>
            <span className="text-[10px] text-slate-500 font-mono">STEP 7</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {answers.progressPhotos.map((photo) => (
              <div
                key={photo.id}
                onClick={() => setActivePhotoModal(photo.url)}
                className="relative aspect-[3/4] max-h-64 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 cursor-pointer group shadow-lg hover:border-[var(--color-primary)] transition-all"
              >
                <img
                  src={photo.url}
                  alt={photo.pose}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 flex items-center justify-between text-xs font-bold text-white">
                  <span className="uppercase">{photo.pose}</span>
                  <span className="text-[10px] text-[var(--color-primary)]">Ingrandisci 🔍</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── PULSANTI AZIONE RAPIDA COACH ─── */}
      <div className="p-5 rounded-3xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="space-y-0.5">
          <h4 className="text-sm font-black text-white">Azioni Rapide di Programmazione</h4>
          <p className="text-xs text-slate-400">
            Utilizza direttamente i parametri dell'anamnesi per costruire la scheda e il piano nutrizionale.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {onNavigateToWorkouts && (
            <button
              type="button"
              onClick={onNavigateToWorkouts}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all shadow-md cursor-pointer"
            >
              <Dumbbell className="w-4 h-4" /> Crea Scheda con questi Parametri
            </button>
          )}

          {onNavigateToNutrition && (
            <button
              type="button"
              onClick={onNavigateToNutrition}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-900 border border-slate-700 text-white font-bold text-xs hover:border-[var(--color-primary)] transition-all shadow cursor-pointer"
            >
              <Flame className="w-4 h-4 text-amber-400" /> Stima Fabbisogno & Macro
            </button>
          )}
        </div>
      </div>

      {/* ─── ISPETTORE RISPOSTE INTEGRALI (COLLAPSIBLE) ─── */}
      <div className="bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-3xl overflow-hidden shadow-xl print:hidden">
        <button
          type="button"
          onClick={() => setShowRawAnswers((prev) => !prev)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-900/50 transition-colors cursor-pointer"
        >
          <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[var(--color-primary)]" />
            Visualizza Tutte le Risposte Integrali (Audit Anamnesi)
          </span>
          {showRawAnswers ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {showRawAnswers && (
          <div className="p-5 border-t border-slate-800/80 bg-slate-950/60 space-y-3 font-mono text-xs text-slate-300">
            <pre className="overflow-x-auto p-4 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] leading-relaxed text-slate-200">
              {JSON.stringify(answers, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* ─── LIGHTBOX MODAL PER FOTO ─── */}
      {activePhotoModal && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setActivePhotoModal(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
            <img src={activePhotoModal} alt="Ingrandimento Check" className="w-full h-full object-contain" />
          </div>
        </div>
      )}
    </div>
  );
};
