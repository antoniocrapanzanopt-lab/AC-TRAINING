import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  X,
} from 'lucide-react';
import { QuestionnaireProgressBar, QUESTIONNAIRE_STEPS } from './QuestionnaireProgressBar';
import { Step1Biometrics } from './steps/Step1Biometrics';
import { Step2GoalsAvailability } from './steps/Step2GoalsAvailability';
import { Step3TrainingExperience } from './steps/Step3TrainingExperience';
import { Step4LifestyleRecovery } from './steps/Step4LifestyleRecovery';
import { Step5HealthSafety } from './steps/Step5HealthSafety';
import { Step6NutritionHabits } from './steps/Step6NutritionHabits';
import { Step7AttachmentsSummary } from './steps/Step7AttachmentsSummary';
import {
  OnboardingQuestionnaireData,
  AthleteOnboardingRecord,
} from '../../types/questionnaire';
import {
  getDefaultQuestionnaireData,
  getAthleteOnboardingResponse,
  saveOnboardingDraft,
  completeOnboardingQuestionnaire,
} from '../../services/questionnaireService';
import { useToast } from '../../context/ToastContext';

interface AthleteQuestionnaireWizardProps {
  athleteId: string;
  athleteName?: string;
  onComplete?: (record: AthleteOnboardingRecord) => void;
  onClose?: () => void;
  isCoachMode?: boolean;
}

export const AthleteQuestionnaireWizard: React.FC<AthleteQuestionnaireWizardProps> = ({
  athleteId,
  athleteName,
  onComplete,
  onClose,
  isCoachMode = false,
}) => {
  const { showSuccess, showError } = useToast();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [maxReachedStep, setMaxReachedStep] = useState<number>(1);
  const [formData, setFormData] = useState<OnboardingQuestionnaireData>(getDefaultQuestionnaireData());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isCompletedSuccess, setIsCompletedSuccess] = useState<boolean>(false);
  const [draftBannerInfo, setDraftBannerInfo] = useState<{ step: number; date: string } | null>(null);

  // Caricamento dati iniziali o bozza salvata
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!athleteId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const record = await getAthleteOnboardingResponse(athleteId);
        if (!isMounted) return;

        if (record && record.answers) {
          const merged: OnboardingQuestionnaireData = {
            ...getDefaultQuestionnaireData(),
            ...record.answers,
          };
          setFormData(merged);

          if (record.status === 'completed') {
            setCurrentStep(7);
            setMaxReachedStep(7);
          } else if (record.currentStep && record.currentStep > 1) {
            setMaxReachedStep(Math.max(record.currentStep, 1));
            setDraftBannerInfo({
              step: record.currentStep,
              date: record.updatedAt || new Date().toISOString(),
            });
          }
        }
      } catch (e) {
        console.error('Errore caricamento questionario:', e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [athleteId]);

  // Aggiornamento campi parziali con auto-salvataggio locale
  const handleFieldChange = useCallback(
    (updates: Partial<OnboardingQuestionnaireData>) => {
      setFormData((prev) => {
        const next = { ...prev, ...updates };
        return next;
      });
    },
    []
  );

  // Validazione dello step corrente
  const validateStep = (stepNumber: number): { valid: boolean; errorMsg?: string } => {
    if (stepNumber === 1) {
      if (!formData.birthDate) return { valid: false, errorMsg: 'Inserisci la tua data di nascita.' };
      if (!formData.heightCm || formData.heightCm < 100) return { valid: false, errorMsg: 'Inserisci una statura valida in cm.' };
      if (!formData.weightKg || formData.weightKg < 30) return { valid: false, errorMsg: 'Inserisci un peso valido in kg.' };
    }
    if (stepNumber === 2) {
      if (!formData.primaryGoal) return { valid: false, errorMsg: 'Seleziona l’obiettivo principale.' };
      if (!formData.weeklyDaysTarget) return { valid: false, errorMsg: 'Indica la frequenza settimanale desiderata.' };
    }
    if (stepNumber === 5) {
      if (formData.hasJointPain && (!formData.jointPainLocations || formData.jointPainLocations.length === 0)) {
        return { valid: false, errorMsg: 'Seleziona almeno un’articolazione o zona di fastidio.' };
      }
      if (formData.hasPastInjuries && !formData.pastInjuriesDetails?.trim()) {
        return { valid: false, errorMsg: 'Specifica una breve descrizione dell’infortunio pregresso.' };
      }
    }
    if (stepNumber === 7) {
      if (!formData.privacyConsent) {
        return { valid: false, errorMsg: 'È necessario confermare la presa visione e veridicità dei dati.' };
      }
    }
    return { valid: true };
  };

  // Navigazione Step Successivo
  const handleNext = async () => {
    const check = validateStep(currentStep);
    if (!check.valid) {
      showError('Attenzione', check.errorMsg || 'Compila tutti i campi obbligatori prima di proseguire.');
      return;
    }

    const nextStep = Math.min(QUESTIONNAIRE_STEPS.length, currentStep + 1);
    setCurrentStep(nextStep);
    setMaxReachedStep((prev) => Math.max(prev, nextStep));

    // Salva bozza progressiva
    await saveOnboardingDraft(athleteId, nextStep, formData);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Navigazione Step Precedente
  const handlePrev = () => {
    if (currentStep > 1) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Salta al passo salvato nella bozza
  const handleResumeDraft = () => {
    if (draftBannerInfo) {
      setCurrentStep(draftBannerInfo.step);
      setDraftBannerInfo(null);
    }
  };

  // Invio Definitivo Questionario
  const handleComplete = async () => {
    const check = validateStep(7);
    if (!check.valid) {
      showError('Attenzione', check.errorMsg || 'Verifica i consensi prima di inviare.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await completeOnboardingQuestionnaire(athleteId, formData);
      if (res.success && res.record) {
        setIsCompletedSuccess(true);
        showSuccess('Questionario Inviato!', 'I tuoi dati sono stati salvati e inoltrati al coach.');
        if (onComplete) onComplete(res.record);
      } else {
        showError('Errore di Salvataggio', res.error || 'Impossibile completare il questionario.');
      }
    } catch (e: any) {
      showError('Errore', e?.message || 'Si è verificato un errore durante l’invio.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-3xl space-y-3">
        <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-400 font-bold">Caricamento questionario in corso...</p>
      </div>
    );
  }

  // Schermata di Successo Finale
  if (isCompletedSuccess) {
    return (
      <div className="p-8 sm:p-12 text-center bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-3xl shadow-2xl space-y-6 max-w-xl mx-auto animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h3 className="text-xl sm:text-2xl font-black text-white">
            Questionario Anamnesi Completato!
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Grazie per aver compilato accuratamente la scheda iniziale. I parametri biometrici, gli obiettivi e il safety check sono stati registrati e sono ora a disposizione del coach per la programmazione.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span>Obiettivo Primario:</span>
            <strong className="text-[var(--color-primary)] capitalize">{formData.primaryGoal}</strong>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Disponibilità:</span>
            <strong className="text-white">{formData.weeklyDaysTarget} giorni / sett. ({formData.sessionDurationMinutes}m)</strong>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Ambiente:</span>
            <strong className="text-white capitalize">{formData.trainingLocation}</strong>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-2xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all shadow-lg cursor-pointer"
            >
              Chiudi & Torna alla Home
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Testata Wizard & Badge Modalità */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[var(--color-primary)]/15 text-[var(--color-primary)] border border-[var(--color-primary)]/30 text-[10px] font-black uppercase">
              Onboarding Atleta 2.0
            </span>
            {isCoachMode && (
              <span className="px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30 text-[10px] font-black uppercase">
                Modalità Coach
              </span>
            )}
          </div>
          <h2 className="text-xl font-black text-white mt-1">
            Questionario Anamnesi {athleteName ? `— ${athleteName}` : ''}
          </h2>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors self-end sm:self-auto cursor-pointer"
            title="Chiudi questionario"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Banner Ripresa Bozza se presente */}
      {draftBannerInfo && (
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-800/60 shadow-lg flex items-center justify-between gap-3 text-xs animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5 text-amber-200">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Hai una bozza salvata al <strong>Passo {draftBannerInfo.step}</strong>. Vuoi riprendere da dove avevi interrotto?
            </span>
          </div>
          <button
            type="button"
            onClick={handleResumeDraft}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-black font-black text-[11px] hover:bg-amber-400 transition-colors shrink-0 shadow cursor-pointer"
          >
            Riprendi dal Passo {draftBannerInfo.step}
          </button>
        </div>
      )}

      {/* Barra Avanzamento a 7 Step */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl">
        <QuestionnaireProgressBar
          currentStep={currentStep}
          maxReachedStep={maxReachedStep}
          onSelectStep={(step) => setCurrentStep(step)}
        />
      </div>

      {/* Pannello Contenuto Step Attivo */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl min-h-[420px]">
        {currentStep === 1 && <Step1Biometrics data={formData} onChange={handleFieldChange} />}
        {currentStep === 2 && <Step2GoalsAvailability data={formData} onChange={handleFieldChange} />}
        {currentStep === 3 && <Step3TrainingExperience data={formData} onChange={handleFieldChange} />}
        {currentStep === 4 && <Step4LifestyleRecovery data={formData} onChange={handleFieldChange} />}
        {currentStep === 5 && <Step5HealthSafety data={formData} onChange={handleFieldChange} />}
        {currentStep === 6 && <Step6NutritionHabits data={formData} onChange={handleFieldChange} />}
        {currentStep === 7 && <Step7AttachmentsSummary data={formData} onChange={handleFieldChange} />}
      </div>

      {/* Barra Azioni Navigazione */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl flex items-center justify-between gap-3">
        <button
          type="button"
          disabled={currentStep <= 1 || isSubmitting}
          onClick={handlePrev}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 disabled:opacity-30 disabled:pointer-events-none text-xs font-bold transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Indietro
        </button>

        <div className="flex items-center gap-2">
          {currentStep < QUESTIONNAIRE_STEPS.length ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all shadow-lg active:scale-95 cursor-pointer"
            >
              <span>Continua al Passo {currentStep + 1}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleComplete}
              className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-black text-xs hover:brightness-110 transition-all shadow-xl active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Invio in corso...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Completa & Invia Anamnesi</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
