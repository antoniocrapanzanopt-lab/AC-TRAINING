import { supabase } from '../lib/supabase';
import {
  OnboardingQuestionnaireData,
  AthleteOnboardingRecord,
  QuestionnaireExecutiveSummary,
} from '../types/questionnaire';

const LOCAL_STORAGE_KEY_PREFIX = 'ac_onboarding_draft_';

export const getDefaultQuestionnaireData = (): OnboardingQuestionnaireData => ({
  // Step 1
  gender: 'uomo',
  birthDate: '1996-01-01',
  heightCm: 175,
  weightKg: 75,
  targetWeightKg: undefined,
  occupationType: 'sedentario',

  // Step 2
  primaryGoal: 'ipertrofia',
  goalNotes: '',
  weeklyDaysTarget: 4,
  sessionDurationMinutes: 75,
  preferredTrainingTime: 'evening',

  // Step 3
  experienceLevel: 'intermedio',
  pastSports: [],
  trainingLocation: 'palestra',
  homeGymEquipment: [],
  dislikedExercises: '',
  indicativeMaxLifts: {
    squatKg: undefined,
    benchKg: undefined,
    deadliftKg: undefined,
    pullupsReps: undefined,
  },

  // Step 4
  sleepHours: 7.5,
  sleepQuality: 'buono',
  dailyStressLevel: 5,
  energyDuringDay: 'stabile',
  habitsSmokeAlcohol: 'nessuna',

  // Step 5
  hasPastInjuries: false,
  pastInjuriesDetails: '',
  hasJointPain: false,
  jointPainLocations: [],
  jointPainTriggers: '',
  hasMedicalConditions: false,
  medicalConditionsDetails: '',
  medicalCertificateStatus: 'valido_non_agonistico',

  // Step 6
  mealsPerDay: 4,
  breakfastHabit: 'dolce',
  calorieTracking: false,
  calorieTrackingDetails: {
    appUsed: '',
    precision: 'al_grammo',
  },
  dietaryRegime: 'onnivoro',
  foodAllergiesIntolerances: [],
  waterIntake: '1_5_2_5L',
  currentSupplements: [],

  // Step 7
  progressPhotos: [],
  documentAttachments: [],
  finalNotesForCoach: '',
  privacyConsent: true,
});

// ─── GENERATORE EXECUTIVE SUMMARY LATO COACH ─────────────────────────────────

export const generateExecutiveSummary = (
  data: Partial<OnboardingQuestionnaireData>
): QuestionnaireExecutiveSummary => {
  const safetyAlerts: QuestionnaireExecutiveSummary['safetyAlerts'] = [];

  // 1. Dolori Articolari Attivi (Priorità Massima)
  if (data.hasJointPain && data.jointPainLocations && data.jointPainLocations.length > 0) {
    safetyAlerts.push({
      type: 'joint_pain',
      severity: 'danger',
      title: `Fastidio Articolare Attivo: ${data.jointPainLocations.join(', ')}`,
      description: data.jointPainTriggers
        ? `Trigger segnalato: "${data.jointPainTriggers}"`
        : 'Dolore o limitazione di movimento segnalata nelle articolazioni indicate.',
    });
  }

  // 2. Infortuni o Traumi Pregressi
  if (data.hasPastInjuries && data.pastInjuriesDetails?.trim()) {
    safetyAlerts.push({
      type: 'injury',
      severity: 'warning',
      title: 'Infortuni / Chirurgia Pregressa',
      description: data.pastInjuriesDetails,
    });
  }

  // 3. Patologie Diagnosticate o Farmaci
  if (data.hasMedicalConditions && data.medicalConditionsDetails?.trim()) {
    safetyAlerts.push({
      type: 'medical_condition',
      severity: 'warning',
      title: 'Patologie / Farmaci in Uso Continuativo',
      description: data.medicalConditionsDetails,
    });
  }

  // 4. Certificato Medico
  if (data.medicalCertificateStatus === 'scaduto_o_mancante') {
    safetyAlerts.push({
      type: 'medical_cert',
      severity: 'info',
      title: 'Certificato Medico Assente o Scaduto',
      description: "L'atleta non ha ancora fornito copia di un certificato medico in corso di validità.",
    });
  }

  // Mappature Snapshot
  const goalLabels: Record<string, string> = {
    ipertrofia: 'Ipertrofia / Crescita Muscolare',
    dimagrimento: 'Dimagrimento / Cut (Deficit)',
    ricomposizione: 'Ricomposizione Corporea',
    forza_performance: 'Forza & Performance',
    benessere_tonificazione: 'Salute & Tonificazione',
  };

  const timeLabels: Record<string, string> = {
    morning_early: 'Mattina presto (06-09)',
    morning: 'Mattina (09-12)',
    lunch: 'Pausa pranzo (12-15)',
    afternoon: 'Pomeriggio (15-18)',
    evening: 'Sera (18-21)',
    night: 'Notte (21+)',
  };

  const locLabels: Record<string, string> = {
    palestra: 'Palestra Commerciale',
    home_gym: 'Home Gym / Casa',
    corpo_libero: 'Parco / Corpo Libero',
    ibrido: 'Ibrido (Palestra + Casa)',
  };

  const expLabels: Record<string, string> = {
    principiante: 'Principiante (< 1 anno)',
    intermedio: 'Intermedio (1-3 anni)',
    avanzato: 'Avanzato (3-5+ anni)',
  };

  const sleepLabels: Record<string, string> = {
    pessimo: 'Pessimo 🥱',
    discontinuo: 'Discontinuo 😐',
    buono: 'Buono 😊',
    eccellente: 'Eccellente ⚡',
  };

  const workLabels: Record<string, string> = {
    sedentario: 'Sedentario (<5k passi)',
    moderato: 'In piedi / Moderato (5-10k passi)',
    pesante: 'Lavoro fisico (>10k passi)',
    turnista: 'Turnista / Orari variabili',
  };

  const primaryGoalLabel = data.primaryGoal ? goalLabels[data.primaryGoal] || data.primaryGoal : 'Non specificato';
  const weeklyAvailabilitySummary = `${data.weeklyDaysTarget || 3} sedute/sett. • ${data.sessionDurationMinutes || 60} min • ${
    data.preferredTrainingTime ? timeLabels[data.preferredTrainingTime] || data.preferredTrainingTime : 'Orario flessibile'
  }`;

  const trainingLocationLabel = data.trainingLocation
    ? locLabels[data.trainingLocation] + (data.homeGymEquipment && data.homeGymEquipment.length > 0 ? ` (${data.homeGymEquipment.length} attrezzi)` : '')
    : 'Palestra';

  const experienceLabel = data.experienceLevel ? expLabels[data.experienceLevel] || data.experienceLevel : 'Intermedio';

  const lifestyleScoreSummary = `Sonno: ${data.sleepHours || 7}h (${
    data.sleepQuality ? sleepLabels[data.sleepQuality] || data.sleepQuality : 'Buono'
  }) • Stress: ${data.dailyStressLevel || 5}/10 • NEAT: ${
    data.occupationType ? workLabels[data.occupationType] || data.occupationType : 'Sedentario'
  }`;

  const allergiesStr =
    data.foodAllergiesIntolerances && data.foodAllergiesIntolerances.length > 0
      ? ` • Intolleranze: ${data.foodAllergiesIntolerances.join(', ')}`
      : '';
  const trackingStr = data.calorieTracking
    ? ` • Traccia calorie (${data.calorieTrackingDetails?.appUsed || 'App'})`
    : '';

  const nutritionSummary = `${data.mealsPerDay || 3} pasti • Regime: ${data.dietaryRegime || 'Onnivoro'}${allergiesStr}${trackingStr}`;

  // Suggerimento split allenamento
  let suggestedWorkoutSplit = 'Upper / Lower (4 giorni)';
  if (data.weeklyDaysTarget === 2) suggestedWorkoutSplit = 'Full Body (2 giorni)';
  if (data.weeklyDaysTarget === 3) suggestedWorkoutSplit = 'Push / Pull / Legs (3 giorni) o Full Body';
  if (data.weeklyDaysTarget === 5) suggestedWorkoutSplit = 'Upper / Lower / Push / Pull / Legs (5 giorni)';
  if (data.weeklyDaysTarget === 6) suggestedWorkoutSplit = 'Push / Pull / Legs x 2 (6 giorni)';

  return {
    safetyAlerts,
    primaryGoalLabel,
    weeklyAvailabilitySummary,
    trainingLocationLabel,
    experienceLabel,
    lifestyleScoreSummary,
    nutritionSummary,
    photosCount: data.progressPhotos?.length || 0,
    documentsCount: data.documentAttachments?.length || 0,
    suggestedWorkoutSplit,
  };
};

// ─── LETTURA & CARICAMENTO QUESTIONARIO ──────────────────────────────────────

export const getAthleteOnboardingResponse = async (
  athleteId: string
): Promise<AthleteOnboardingRecord | null> => {
  if (!athleteId) return null;

  try {
    // 1. Prova da tabella dedicata athlete_onboarding_responses
    const { data, error } = await supabase
      .from('athlete_onboarding_responses')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('updated_at', { ascending: false })
      .maybeSingle();

    if (!error && data) {
      return {
        id: data.id,
        athleteId: data.athlete_id,
        coachId: data.coach_id,
        version: data.version,
        status: data.status,
        currentStep: data.current_step,
        answers: data.answers || {},
        summary: data.summary || undefined,
        photoUrls: data.photo_urls || [],
        documentUrls: data.document_urls || [],
        completedAt: data.completed_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    }
  } catch (err) {
    console.warn('[QuestionnaireService] athlete_onboarding_responses non disponibile:', err);
  }

  // 2. Prova cloud backup da athlete_notes
  try {
    const { data: notes } = await supabase
      .from('athlete_notes')
      .select('id, content, created_at, updated_at')
      .eq('athlete_id', athleteId)
      .eq('category', 'medical')
      .order('created_at', { ascending: false })
      .limit(5);

    const onboardingNote = notes?.find((n) => n.content?.startsWith('[AC_ONBOARDING_DATA]:'));
    if (onboardingNote) {
      const rawPayload = onboardingNote.content.replace('[AC_ONBOARDING_DATA]:', '');
      const parsed = JSON.parse(rawPayload);
      const answersObj = parsed.answers || parsed;
      return {
        id: onboardingNote.id,
        athleteId,
        version: parsed.version || 'v2.0_standard',
        status: parsed.status || 'completed',
        currentStep: parsed.currentStep || 7,
        answers: answersObj,
        summary: parsed.summary || generateExecutiveSummary(answersObj),
        photoUrls: answersObj.progressPhotos || [],
        documentUrls: answersObj.documentAttachments || [],
        completedAt: parsed.completedAt || onboardingNote.created_at,
        createdAt: onboardingNote.created_at,
        updatedAt: parsed.updatedAt || onboardingNote.updated_at,
      };
    }
  } catch (err) {
    console.warn('[QuestionnaireService] Ricerca cloud backup in athlete_notes fallita:', err);
  }

  // 3. Fallback da LocalStorage (stesso device o sessione)
  try {
    let rawLocal = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${athleteId}`);
    if (!rawLocal) {
      // Cerca qualsiasi bozza presente se atleta corrisponde o locale
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(LOCAL_STORAGE_KEY_PREFIX)) {
          const testVal = localStorage.getItem(k);
          if (testVal) {
            try {
              const p = JSON.parse(testVal);
              if (p.athleteId === athleteId || k.includes(athleteId)) {
                rawLocal = testVal;
                break;
              }
            } catch (_) {}
          }
        }
      }
    }

    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      const answersObj = parsed.answers || parsed;
      return {
        id: `local-${athleteId}`,
        athleteId,
        version: 'v2.0_standard',
        status: parsed.status || 'draft',
        currentStep: parsed.currentStep || 1,
        answers: answersObj,
        summary: generateExecutiveSummary(answersObj),
        photoUrls: answersObj.progressPhotos || [],
        documentUrls: answersObj.documentAttachments || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  } catch (e) {
    console.error('[QuestionnaireService] Errore lettura localStorage:', e);
  }

  // 4. Ricostruzione da parametri esistenti in tabella athletes
  try {
    const { data: ath } = await supabase
      .from('athletes')
      .select('id, goals, medical_cert_notes, medical_cert_type, birth_date, gender')
      .eq('id', athleteId)
      .maybeSingle();

    if (ath && (ath.goals || ath.medical_cert_notes)) {
      const baselineAnswers: OnboardingQuestionnaireData = {
        ...getDefaultQuestionnaireData(),
        birthDate: ath.birth_date || '1996-01-01',
        gender: ath.gender === 'female' ? 'donna' : 'uomo',
        primaryGoal: 'ipertrofia',
        goalNotes: ath.goals || '',
        pastInjuriesDetails: ath.medical_cert_notes || '',
        hasPastInjuries: Boolean(ath.medical_cert_notes),
      };
      return {
        id: `ath-profile-${athleteId}`,
        athleteId,
        version: 'v2.0_profile_sync',
        status: 'completed',
        currentStep: 7,
        answers: baselineAnswers,
        summary: generateExecutiveSummary(baselineAnswers),
        photoUrls: [],
        documentUrls: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  } catch (err) {
    console.warn('[QuestionnaireService] Ricostruzione da athletes fallita:', err);
  }

  return null;
};

// ─── SALVATAGGIO BOZZA (DRAFT) PROGRESSIVO ──────────────────────────────────

export const saveOnboardingDraft = async (
  athleteId: string,
  currentStep: number,
  answers: Partial<OnboardingQuestionnaireData>
): Promise<boolean> => {
  if (!athleteId) return false;

  // 1. Salva subito in LocalStorage
  try {
    const payload = {
      athleteId,
      currentStep,
      status: 'draft',
      answers,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${athleteId}`, JSON.stringify(payload));
  } catch (err) {
    console.warn('[QuestionnaireService] Salvataggio locale bozza fallito:', err);
  }

  // 2. Sync asincrono con Supabase
  try {
    const summary = generateExecutiveSummary(answers);
    const { error } = await supabase
      .from('athlete_onboarding_responses')
      .upsert(
        {
          athlete_id: athleteId,
          version: 'v2.0_standard',
          status: 'draft',
          current_step: currentStep,
          answers: answers,
          summary: summary,
          photo_urls: answers.progressPhotos || [],
          document_urls: answers.documentAttachments || [],
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'athlete_id,version' }
      );

    if (error) {
      console.warn('[QuestionnaireService] Upsert draft su Supabase non riuscito (modalità offline attiva):', error.message);
    }
    return true;
  } catch (err) {
    console.warn('[QuestionnaireService] Sync draft Supabase ignorato in offline:', err);
    return true; // Continua comunque grazie al salvataggio locale
  }
};

// ─── COMPLETAMENTO QUESTIONARIO & POPOLAMENTO AUTOMATICO ATLETA ──────────────

export const completeOnboardingQuestionnaire = async (
  athleteId: string,
  answers: OnboardingQuestionnaireData
): Promise<{ success: boolean; record?: AthleteOnboardingRecord; error?: string }> => {
  if (!athleteId) return { success: false, error: 'ID Atleta mancante' };

  try {
    const summary = generateExecutiveSummary(answers);
    const nowIso = new Date().toISOString();

    // 1. Salva / Aggiorna la tabella athlete_onboarding_responses su Supabase
    const { data: savedRecord, error: respError } = await supabase
      .from('athlete_onboarding_responses')
      .upsert(
        {
          athlete_id: athleteId,
          version: 'v2.0_standard',
          status: 'completed',
          current_step: 7,
          answers: answers,
          summary: summary,
          photo_urls: answers.progressPhotos || [],
          document_urls: answers.documentAttachments || [],
          completed_at: nowIso,
          updated_at: nowIso,
        },
        { onConflict: 'athlete_id,version' }
      )
      .select()
      .maybeSingle();

    if (respError) {
      console.error('[QuestionnaireService] Errore salvataggio finale questionario su tabella principale:', respError);
    }

    // 1.1 Backup resiliente in athlete_notes (immediatamente visibile al coach)
    try {
      await supabase.from('athlete_notes').insert({
        athlete_id: athleteId,
        content: `[AC_ONBOARDING_DATA]:${JSON.stringify({
          version: 'v2.0_standard',
          status: 'completed',
          currentStep: 7,
          answers: answers,
          summary: summary,
          completedAt: nowIso,
          updatedAt: nowIso,
        })}`,
        category: 'medical',
        visibility: 'coach',
        author_id: athleteId,
        author_name: 'Atleta (Onboarding)',
      });
    } catch (noteErr) {
      console.warn('[QuestionnaireService] Backup note in athlete_notes ignorato:', noteErr);
    }

    // 2. Aggiorna i dati anagrafici e obiettivi in public.athletes
    try {
      const athleteUpdates: any = {
        goals: answers.primaryGoal ? `${answers.primaryGoal.toUpperCase()}: ${answers.goalNotes || ''}` : undefined,
        medical_cert_type: answers.medicalCertificateStatus === 'valido_agonistico' ? 'agonistico' : 'non_agonistico',
        medical_cert_notes: [
          answers.hasJointPain && answers.jointPainLocations?.length ? `Dolori attivi: ${answers.jointPainLocations.join(', ')}` : null,
          answers.hasPastInjuries && answers.pastInjuriesDetails ? `Infortuni: ${answers.pastInjuriesDetails}` : null,
          answers.hasMedicalConditions && answers.medicalConditionsDetails ? `Patologie: ${answers.medicalConditionsDetails}` : null,
        ]
          .filter(Boolean)
          .join(' | '),
      };

      if (answers.birthDate) athleteUpdates.birth_date = answers.birthDate;
      if (answers.gender) athleteUpdates.gender = answers.gender;

      await supabase.from('athletes').update(athleteUpdates).eq('id', athleteId);
    } catch (e) {
      console.warn('[QuestionnaireService] Aggiornamento dati tabella athletes completato con warning:', e);
    }

    // 3. Inserimento prima metrica corporea in athlete_metrics
    if (answers.weightKg || answers.heightCm) {
      try {
        const todayDate = nowIso.slice(0, 10);
        await supabase.from('athlete_metrics').insert({
          athlete_id: athleteId,
          date: todayDate,
          weight_kg: answers.weightKg,
          height_cm: answers.heightCm,
          notes: `Check iniziale da Questionario Onboarding (${answers.dietaryRegime || 'Onnivoro'}, ${answers.mealsPerDay || 4} pasti)`,
        });
      } catch (e) {
        console.warn('[QuestionnaireService] Inserimento metrica iniziale completato con warning:', e);
      }
    }

    // 4. Inserimento carichi fondamentali in athlete_max_lifts (se inseriti)
    if (answers.indicativeMaxLifts) {
      const lifts = answers.indicativeMaxLifts;
      const todayDate = nowIso.slice(0, 10);

      const liftsToInsert = [
        lifts.squatKg ? { exercise_name: 'Squat', weight_kg: lifts.squatKg, calculated_1rm: lifts.squatKg, reps: 1, is_real_1rm: true } : null,
        lifts.benchKg ? { exercise_name: 'Panca Piana', weight_kg: lifts.benchKg, calculated_1rm: lifts.benchKg, reps: 1, is_real_1rm: true } : null,
        lifts.deadliftKg ? { exercise_name: 'Stacco da Terra', weight_kg: lifts.deadliftKg, calculated_1rm: lifts.deadliftKg, reps: 1, is_real_1rm: true } : null,
      ].filter(Boolean);

      for (const item of liftsToInsert) {
        if (!item) continue;
        try {
          await supabase.from('athlete_max_lifts').insert({
            athlete_id: athleteId,
            exercise_name: item.exercise_name,
            weight_kg: item.weight_kg,
            reps: item.reps,
            calculated_1rm: item.calculated_1rm,
            is_real_1rm: item.is_real_1rm,
            date: todayDate,
            notes: 'Dichiarato in Questionario Onboarding',
          });
        } catch (e) {
          console.warn('[QuestionnaireService] Errore inserimento max lift:', e);
        }
      }
    }

    // 5. Rimuovi la bozza locale al completamento con successo
    try {
      localStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}${athleteId}`);
    } catch {}

    const resultRecord: AthleteOnboardingRecord = savedRecord
      ? {
          id: savedRecord.id,
          athleteId: savedRecord.athlete_id,
          coachId: savedRecord.coach_id,
          version: savedRecord.version,
          status: 'completed',
          currentStep: 7,
          answers,
          summary,
          photoUrls: answers.progressPhotos || [],
          documentUrls: answers.documentAttachments || [],
          completedAt: nowIso,
          createdAt: savedRecord.created_at || nowIso,
          updatedAt: nowIso,
        }
      : {
          id: `onboarding-${athleteId}`,
          athleteId,
          version: 'v2.0_standard',
          status: 'completed',
          currentStep: 7,
          answers,
          summary,
          photoUrls: answers.progressPhotos || [],
          documentUrls: answers.documentAttachments || [],
          completedAt: nowIso,
          createdAt: nowIso,
          updatedAt: nowIso,
        };

    return { success: true, record: resultRecord };
  } catch (err: any) {
    console.error('[QuestionnaireService] Errore durante il completamento questionario:', err);
    return { success: false, error: err?.message || 'Errore imprevisto durante il salvataggio' };
  }
};
