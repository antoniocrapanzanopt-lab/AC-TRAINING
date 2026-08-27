import {
  TimeframeOption,
  AthleteReportSummary,
  TeamOverviewReportData,
  ComparisonMetricDelta,
  MuscleGroupDistribution,
  KeyExerciseMetric,
  ReportTrend,
  ReportStrategicAction,
  Athlete,
  DecisionPriorityItem,
} from '../../../types';
import { isPainFeedback } from '../../../utils/painAnalysis';

interface RawSession {
  id: string;
  athlete_id: string;
  workout_id: string;
  start_time: string;
  end_time?: string;
  notes?: string;
  rpe?: number;
  workouts?: { title?: string; total_weeks?: number };
}

interface RawExerciseLog {
  id: string;
  session_id: string;
  exercise_id?: string;
  set_number: number;
  reps_completed: number;
  weight_kg: number;
  notes?: string;
  exercise_name?: string;
}

interface RawAssignment {
  athlete_id: string;
  workout_id: string;
  assigned_date?: string;
  start_date?: string;
  workout?: { title?: string; total_weeks?: number };
  workout_title?: string;
}

export function getTimeframeDays(timeframe: TimeframeOption): number {
  switch (timeframe) {
    case 'weekly':
      return 7;
    case 'monthly':
      return 30;
    case 'bimonthly':
      return 60;
    case 'six_months':
      return 180;
    case 'yearly':
      return 365;
    default:
      return 30;
  }
}

export function getTimeframeLabel(timeframe: TimeframeOption): string {
  switch (timeframe) {
    case 'weekly':
      return 'Settimanale (7gg vs 7gg prec.)';
    case 'monthly':
      return 'Mensile (30gg vs 30gg prec.)';
    case 'bimonthly':
      return 'Bimestrale (60gg vs 60gg prec.)';
    case 'six_months':
      return 'Semestrale (180gg vs 180gg prec.)';
    case 'yearly':
      return 'Annuale (365gg vs 365gg prec.)';
    default:
      return 'Mensile';
  }
}

export function calculateDelta(current: number, previous: number): ComparisonMetricDelta {
  const deltaRaw = current - previous;
  let deltaPercent = 0;
  if (previous > 0) {
    deltaPercent = Math.round(((current - previous) / previous) * 1000) / 10;
  } else {
    // Se non ci sono dati nel periodo precedente, non è un incremento del 100% ma la baseline iniziale
    deltaPercent = 0;
  }
  return {
    current: Math.round(current * 10) / 10,
    previous: Math.round(previous * 10) / 10,
    deltaPercent,
    deltaRaw: Math.round(deltaRaw * 10) / 10,
  };
}

export function classifyMuscleGroup(exerciseName: string): string {
  const name = (exerciseName || '').toLowerCase();
  if (/squat|leg press|affondi|bulgar|quad|femorali|leg curl|leg ext|stacco rumeno|rdl|calf|polpacci|hack/.test(name)) {
    return 'Gambe & Femorali';
  }
  if (/panca|chest|petto|croci|dip|push up|inclinata|declinata/.test(name)) {
    return 'Pettorali';
  }
  if (/stacco|trazioni|lat|rematore|row|pulley|dorsali|dorso|pulldown|schiena/.test(name)) {
    return 'Dorso & Schiena';
  }
  if (/military|shoulder|spalle|lento|alzate|deltoidi|arnold/.test(name)) {
    return 'Spalle & Deltoidi';
  }
  if (/curl|bicipiti|tricipiti|french|pushdown|hammer|braccia/.test(name)) {
    return 'Braccia (Bicipiti/Tricipiti)';
  }
  if (/plank|crunch|core|addom|hollow|russian/.test(name)) {
    return 'Addome & Core';
  }
  return 'Generale / Altro';
}

const isPainNote = (text?: string): boolean => {
  return isPainFeedback(text);
};

export function buildAthleteReport(
  athlete: Athlete,
  timeframe: TimeframeOption,
  sessions: RawSession[],
  logs: RawExerciseLog[],
  assignments: RawAssignment[],
  exerciseNamesMap: Map<string, string>
): AthleteReportSummary {
  const days = getTimeframeDays(timeframe);
  const now = Date.now();
  const currentStartMs = now - days * 24 * 60 * 60 * 1000;
  const previousStartMs = now - 2 * days * 24 * 60 * 60 * 1000;

  // Filtra sessioni atleta (solo sessioni completate con end_time o con effettivi log di serie registrati)
  const athleteSessions = sessions.filter((s) => {
    if (s.athlete_id !== athlete.id) return false;
    const hasLogs = logs.some((l) => l.session_id === s.id && (l.reps_completed > 0 || l.weight_kg > 0));
    return Boolean(s.end_time || hasLogs);
  });

  // Deduplica eventuali sessioni doppie avviate entro 30 minuti
  const deduplicatedSessions: RawSession[] = [];
  athleteSessions.forEach((sess) => {
    const sessTime = new Date(sess.start_time).getTime();
    const isDuplicate = deduplicatedSessions.some((existing) => {
      const existingTime = new Date(existing.start_time).getTime();
      return Math.abs(sessTime - existingTime) < 30 * 60 * 1000 && sess.workout_id === existing.workout_id;
    });
    if (!isDuplicate) {
      deduplicatedSessions.push(sess);
    }
  });

  const currentSessions = deduplicatedSessions.filter((s) => {
    const t = new Date(s.start_time).getTime();
    return t >= currentStartMs && t <= now;
  });
  const previousSessions = deduplicatedSessions.filter((s) => {
    const t = new Date(s.start_time).getTime();
    return t >= previousStartMs && t < currentStartMs;
  });

  const sessionIdsCurrent = new Set(currentSessions.map((s) => s.id));
  const sessionIdsPrevious = new Set(previousSessions.map((s) => s.id));

  // Logs esercizio
  const currentLogs = logs.filter((l) => sessionIdsCurrent.has(l.session_id));
  const previousLogs = logs.filter((l) => sessionIdsPrevious.has(l.session_id));

  // Scheda Assegnata
  const assignment = assignments.find((a) => a.athlete_id === athlete.id);
  const hasAssignment = Boolean(assignment && (assignment.workout_id || assignment.workout?.title || assignment.workout_title));
  const workoutTitle = assignment?.workout?.title || assignment?.workout_title || 'Nessuna Scheda Assegnata';
  const totalWeeks = assignment?.workout?.total_weeks || 5;

  const totalCompletedInHistory = currentSessions.length + previousSessions.length;
  const targetSessionsPerWeek = 3;
  const totalPlannedInBlock = Math.max(1, totalWeeks * targetSessionsPerWeek);

  let currentWeek = 1;
  let blockProgressPercent = 0;

  if (hasAssignment) {
    if (totalCompletedInHistory === 0) {
      // Nessun workout svolto: avanzamento blocco a 0%
      currentWeek = 1;
      blockProgressPercent = 0;
    } else {
      currentWeek = Math.min(totalWeeks, Math.max(1, Math.ceil(totalCompletedInHistory / targetSessionsPerWeek)));
      blockProgressPercent = Math.min(100, Math.max(5, Math.round((totalCompletedInHistory / totalPlannedInBlock) * 100)));
    }
  }

  // Data Inizio / Assegnazione e Giorni Trascorsi
  const effectiveStartDateStr = assignment?.start_date || assignment?.assigned_date;
  let daysSinceStart = 999;
  if (effectiveStartDateStr) {
    const startMs = new Date(effectiveStartDateStr).getTime();
    daysSinceStart = Math.floor((now - startMs) / (24 * 60 * 60 * 1000));
  }
  const isFutureStart = daysSinceStart < 0;

  // ── DETERMINAZIONE DELLO STATO DEL PROGRAMMA E PENULTIMA SETTIMANA ──
  const isPenultimateWeek = hasAssignment && totalWeeks > 1 && totalCompletedInHistory > 0 && currentWeek === totalWeeks - 1;
  let programStatus: AthleteReportSummary['programStatus'] = 'active';
  let programStatusLabel = 'Programma Attivo';

  if (!hasAssignment) {
    programStatus = 'unassigned';
    programStatusLabel = 'Programma non assegnato';
  } else if (isFutureStart) {
    programStatus = 'pending_start';
    programStatusLabel = `In partenza ${new Date(effectiveStartDateStr!).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}`;
  } else if (totalCompletedInHistory === 0) {
    programStatus = 'pending_start';
    programStatusLabel = 'In attesa di inizio';
  } else if (isPenultimateWeek) {
    programStatus = 'penultimate_week';
    programStatusLabel = 'Penultima Settimana';
  } else if (currentWeek >= totalWeeks && blockProgressPercent >= 100) {
    programStatus = 'completed';
    programStatusLabel = 'Blocco Terminato';
  } else {
    programStatus = 'active';
    programStatusLabel = 'Programma Attivo';
  }

  // 1. Sessioni & Aderenza con Pro-Rata Intelligente
  let targetSessionsInPeriod = Math.max(1, Math.round((days / 7) * targetSessionsPerWeek));
  if (hasAssignment && daysSinceStart >= 0 && daysSinceStart < 7) {
    if (daysSinceStart <= 2) {
      targetSessionsInPeriod = 1;
    } else if (daysSinceStart <= 4) {
      targetSessionsInPeriod = 2;
    } else {
      targetSessionsInPeriod = 3;
    }
  }

  let currentAttendancePct = 0;
  if (hasAssignment) {
    if (isFutureStart) {
      currentAttendancePct = 100;
    } else if (totalCompletedInHistory === 0) {
      currentAttendancePct = 0;
    } else {
      currentAttendancePct = Math.min(100, Math.round((currentSessions.length / targetSessionsInPeriod) * 100));
    }
  }

  const previousAttendancePct = hasAssignment
    ? Math.min(100, Math.round((previousSessions.length / targetSessionsInPeriod) * 100))
    : 0;

  const attendance = calculateDelta(currentAttendancePct, previousAttendancePct);
  const completedSessions = calculateDelta(currentSessions.length, previousSessions.length);

  // 2. RPE Medio & Dolori
  const currentRpeValues = currentSessions.map((s) => s.rpe).filter((r): r is number => typeof r === 'number' && r > 0);
  const previousRpeValues = previousSessions.map((s) => s.rpe).filter((r): r is number => typeof r === 'number' && r > 0);
  const currentAvgRpe = currentRpeValues.length > 0 ? currentRpeValues.reduce((a, b) => a + b, 0) / currentRpeValues.length : 7.5;
  const previousAvgRpe = previousRpeValues.length > 0 ? previousRpeValues.reduce((a, b) => a + b, 0) / previousRpeValues.length : 7.5;
  const avgRpe = calculateDelta(currentAvgRpe, previousAvgRpe);

  const currentPainCount = currentSessions.filter((s) => isPainNote(s.notes)).length;
  const previousPainCount = previousSessions.filter((s) => isPainNote(s.notes)).length;
  const painReportsCount = calculateDelta(currentPainCount, previousPainCount);

  // Estrai dettagli specifici di dolori/fastidi (esercizi coinvolti e zone anatomiche)
  let painDetailsSummary = '';
  if (currentPainCount > 0) {
    const painSummaries: string[] = [];

    // A. Cerca nelle note sessione (questionario post-workout)
    currentSessions
      .filter((s) => isPainNote(s.notes))
      .forEach((s) => {
        const text = s.notes || '';
        if (text.includes('Fastidi:')) {
          const fastidiPart = text.split('Fastidi:')[1]?.trim() || '';
          const matches = [...fastidiPart.matchAll(/Esercizio:\s*([^—\];]+)(?:—\s*Zona:\s*([^\];]+))?/gi)];
          if (matches.length > 0) {
            matches.forEach((m) => {
              const ex = m[1]?.trim();
              const zone = m[2]?.trim();
              if (ex && ex !== 'Non specificato') {
                painSummaries.push(zone && zone !== 'Non specificata' ? `${ex} (${zone})` : ex);
              } else if (zone && zone !== 'Non specificata') {
                painSummaries.push(`Zona ${zone}`);
              }
            });
          } else {
            const cleanText = fastidiPart.replace(/[\[\]#0-9]/g, '').trim();
            if (cleanText) painSummaries.push(cleanText);
          }
        } else if (isPainFeedback(text) && !text.toLowerCase().startsWith('questionario:')) {
          painSummaries.push(text.length > 60 ? `${text.slice(0, 57)}...` : text);
        }
      });

    // B. Cerca nelle note dei singoli log esercizio
    currentLogs
      .filter((l) => isPainFeedback(l.notes))
      .forEach((l) => {
        const exName = l.exercise_name || (l.exercise_id && exerciseNamesMap.get(l.exercise_id)) || 'Esercizio';
        painSummaries.push(`${exName}: "${l.notes}"`);
      });

    const uniquePainSummaries = Array.from(new Set(painSummaries));
    if (uniquePainSummaries.length > 0) {
      painDetailsSummary = uniquePainSummaries.slice(0, 2).join(' • ');
    }
  }

  // 3. Volume Totale (kg)
  const calcTotalVolume = (logList: RawExerciseLog[]) => {
    return logList.reduce((acc, log) => {
      const weight = log.weight_kg > 0 ? log.weight_kg : 20;
      const reps = log.reps_completed > 0 ? log.reps_completed : 10;
      return acc + weight * reps;
    }, 0);
  };

  const curVol = calcTotalVolume(currentLogs);
  const prevVol = calcTotalVolume(previousLogs);
  const totalVolumeKg = calculateDelta(curVol, prevVol);

  // 4. Volume per Distretto Muscolare
  const groupsList = [
    'Gambe & Femorali',
    'Pettorali',
    'Dorso & Schiena',
    'Spalle & Deltoidi',
    'Braccia (Bicipiti/Tricipiti)',
    'Addome & Core',
  ];

  const muscleGroups: MuscleGroupDistribution[] = groupsList.map((grp) => {
    const curGVol = currentLogs
      .filter((l) => {
        const exName = l.exercise_name || (l.exercise_id && exerciseNamesMap.get(l.exercise_id)) || '';
        return classifyMuscleGroup(exName) === grp;
      })
      .reduce((sum, l) => sum + (l.weight_kg > 0 ? l.weight_kg : 20) * (l.reps_completed > 0 ? l.reps_completed : 10), 0);

    const prevGVol = previousLogs
      .filter((l) => {
        const exName = l.exercise_name || (l.exercise_id && exerciseNamesMap.get(l.exercise_id)) || '';
        return classifyMuscleGroup(exName) === grp;
      })
      .reduce((sum, l) => sum + (l.weight_kg > 0 ? l.weight_kg : 20) * (l.reps_completed > 0 ? l.reps_completed : 10), 0);

    return {
      group: grp,
      groupName: grp,
      currentKg: Math.round(curGVol),
      previousKg: Math.round(prevGVol),
      deltaPercent: prevGVol > 0 ? Math.round(((curGVol - prevGVol) / prevGVol) * 1000) / 10 : 0,
    };
  });

  // 5. Esercizi Chiave
  const keyExercises: KeyExerciseMetric[] = [];
  const distinctExIds = Array.from(new Set(currentLogs.map((l) => l.exercise_id).filter(Boolean))) as string[];

  distinctExIds.slice(0, 5).forEach((exId) => {
    const exName = exerciseNamesMap.get(exId) || 'Esercizio';
    const cLogs = currentLogs.filter((l) => l.exercise_id === exId);
    const pLogs = previousLogs.filter((l) => l.exercise_id === exId);

    const cMax = cLogs.reduce((max, l) => (l.weight_kg > max ? l.weight_kg : max), 0);
    const pMax = pLogs.reduce((max, l) => (l.weight_kg > max ? l.weight_kg : max), 0);
    const cAvg = cLogs.length > 0 ? cLogs.reduce((s, l) => s + l.weight_kg, 0) / cLogs.length : 0;
    const pAvg = pLogs.length > 0 ? pLogs.reduce((s, l) => s + l.weight_kg, 0) / pLogs.length : 0;

    const hasPrev = pLogs.length > 0 && pMax > 0;
    const deltaPct = hasPrev ? Math.round(((cMax - pMax) / pMax) * 1000) / 10 : 0;

    keyExercises.push({
      name: exName,
      currentMaxKg: Math.round(cMax * 10) / 10,
      previousMaxKg: Math.round(pMax * 10) / 10,
      currentAvgKg: Math.round(cAvg * 10) / 10,
      previousAvgKg: Math.round(pAvg * 10) / 10,
      deltaPercent: deltaPct,
    });
  });

  // 6. Calcolo Score Complessivo (0-100)
  const hasPreviousPeriod = previousSessions.length > 0 && prevVol > 0;
  let overallScore = 75;
  if (!hasAssignment || totalCompletedInHistory === 0) {
    overallScore = 0;
  } else {
    let score = 70;
    if (currentAttendancePct >= 90) score += 15;
    else if (currentAttendancePct >= 75) score += 8;
    else score -= 12;

    if (hasPreviousPeriod) {
      if (totalVolumeKg.deltaPercent > 5) score += 10;
      else if (totalVolumeKg.deltaPercent < -10) score -= 10;
    }

    if (currentPainCount > 0) score -= Math.min(25, currentPainCount * 12);
    if (currentAvgRpe >= 7 && currentAvgRpe <= 8.5) score += 5;
    else if (currentAvgRpe > 9) score -= 8;

    overallScore = Math.max(20, Math.min(99, Math.round(score)));
  }

  // 7. Trend
  let trend: ReportTrend = 'neutral';
  if (!hasAssignment || totalCompletedInHistory === 0) {
    trend = 'neutral';
  } else if (!hasPreviousPeriod && currentSessions.length > 0) {
    trend = 'stable';
  } else if (overallScore >= 80 && totalVolumeKg.deltaPercent >= 0) {
    trend = 'positive';
  } else if (overallScore < 60 || totalVolumeKg.deltaPercent < -15 || currentPainCount > 1) {
    trend = 'negative';
  } else {
    trend = 'stable';
  }

  // 8. Singola Decisione Consigliata per Card
  let singleDecisionTitle = 'Continua Programma Corrente';
  let singleDecisionRationale = 'I parametri di carico, volume e recupero sono in perfetto equilibrio.';
  let singleDecisionType: AthleteReportSummary['singleDecisionType'] = 'maintain';
  let singleDecisionCtaLabel = 'Apri Copilot';

  const isMissingWeights = hasAssignment && currentSessions.length > 0 && curVol === 0;

  if (!hasAssignment) {
    singleDecisionTitle = 'Assegna Scheda di Allenamento';
    singleDecisionRationale = 'Nessun programma attivo. Crea o assegna un mesociclo per avviare il percorso.';
    singleDecisionType = 'unassigned';
    singleDecisionCtaLabel = 'Assegna Programma';
  } else if (currentSessions.length === 0) {
    singleDecisionTitle = 'In Attesa di Inizio Scheda';
    singleDecisionRationale = `Scheda "${workoutTitle}" pronta. In attesa del primo allenamento registrato da parte di ${athlete.fullName}.`;
    singleDecisionType = 'inactivity';
    singleDecisionCtaLabel = 'Contatta Atleta';
  } else if (isMissingWeights && currentPainCount === 0) {
    singleDecisionTitle = 'Sollecita Compilazione Carichi';
    singleDecisionRationale = 'Sessione completata ma senza carichi registrati (Volume 0 kg). Sollecita l\'inserimento dei dati per tracciare la progressione.';
    singleDecisionType = 'missing_weights';
    singleDecisionCtaLabel = 'Sollecita Compilazione';
  } else if (currentPainCount > 0) {
    const painSubject = painDetailsSummary ? `su ${painDetailsSummary}` : 'nelle ultime sessioni';
    if (currentPainCount === 1 && totalCompletedInHistory <= 2) {
      singleDecisionTitle = painDetailsSummary ? `Fastidio su ${painDetailsSummary}` : 'Richiedi Video o Check Tecnico';
      singleDecisionRationale = `1° segnalazione di fastidio ${painSubject}: richiedi un video esecutivo o verifica la tecnica prima di modificare la scheda.`;
      singleDecisionType = 'pain';
      singleDecisionCtaLabel = 'Verifica Tecnica';
    } else {
      singleDecisionTitle = painDetailsSummary ? `Fastidio su ${painDetailsSummary}` : 'Sostituisci Esercizio a Rischio';
      singleDecisionRationale = `Segnalato fastidio articolare ${painSubject}. Valuta sostituzione variante o riduzione carico.`;
      singleDecisionType = 'pain';
      singleDecisionCtaLabel = 'Apri Decisione';
    }
  } else if (isPenultimateWeek) {
    singleDecisionTitle = 'Prepara Prossimo Mesociclo';
    singleDecisionRationale = `L'atleta è alla settimana ${currentWeek} di ${totalWeeks}. Prepara il prossimo blocco per dare continuità.`;
    singleDecisionType = 'penultimate_week';
    singleDecisionCtaLabel = 'Prepara Prossimo Blocco';
  } else if (currentAttendancePct < 70) {
    singleDecisionTitle = 'Intervento su Aderenza Bassa';
    singleDecisionRationale = `Aderenza al ${currentAttendancePct}%. Verifica frequenza settimanale o carico di lavoro.`;
    singleDecisionType = 'overload';
    singleDecisionCtaLabel = 'Apri Copilot';
  } else if (currentAvgRpe > 8.8) {
    singleDecisionTitle = 'Scarico Attivo / Deload';
    singleDecisionRationale = `RPE medio molto alto (${avgRpe.current}). Riduci volume del -30% per 1 settimana.`;
    singleDecisionType = 'overload';
    singleDecisionCtaLabel = 'Apri Copilot';
  } else if (overallScore >= 82 && hasPreviousPeriod && totalVolumeKg.deltaPercent >= 5) {
    singleDecisionTitle = 'Incrementa Sovraccarico (+2.5%)';
    singleDecisionRationale = 'Ottima risposta ipertrofica: aumenta i carichi target sui fondamentali.';
    singleDecisionType = 'stimulus';
    singleDecisionCtaLabel = 'Apri Copilot';
  }

  // 9. Sintesi IA Narrativa
  let aiNarrativeSummary = '';
  if (!hasAssignment) {
    aiNarrativeSummary = `L'atleta ${athlete.fullName} non ha ancora un programma di allenamento assegnato. Assegna una scheda per iniziare a raccogliere dati di performance.`;
  } else if (currentSessions.length === 0) {
    aiNarrativeSummary = `Scheda "${workoutTitle}" assegnata. In attesa del primo allenamento registrato da parte di ${athlete.fullName}.`;
  } else {
    aiNarrativeSummary = `Nelle ultime settimane ${athlete.fullName} ha completato ${currentSessions.length} sessioni con un'aderenza del ${currentAttendancePct}%. ${singleDecisionRationale}`;
  }

  // 10. Direzione Strategica
  const whatIsWorking: string[] = [];
  const whatNeedsAttention: string[] = [];
  let recommendedAction: ReportStrategicAction = 'continue';
  let recommendedActionLabel = 'Mantieni il Programma Corrente';
  let recommendedActionDescription = 'I parametri di progressione e recupero sono ottimali.';

  if (!hasAssignment) {
    whatNeedsAttention.push('Programma di allenamento non ancora assegnato.');
    recommendedAction = 'assign_program';
    recommendedActionLabel = 'Assegna Programma';
    recommendedActionDescription = 'Seleziona o crea una scheda di allenamento per avviare il percorso atletico.';
  } else if (currentSessions.length === 0) {
    whatNeedsAttention.push(`Nessuna sessione registrata per la scheda "${workoutTitle}" nel periodo.`);
    recommendedAction = 'contact_athlete';
    recommendedActionLabel = 'Contatta Atleta';
    recommendedActionDescription = 'Invia un messaggio in chat per verificare motivazione o difficoltà di orario.';
  } else {
    if (currentAttendancePct >= 85) {
      whatIsWorking.push(`Ottima costanza e frequenza negli allenamenti (${currentAttendancePct}% aderenza).`);
    }
    if (hasPreviousPeriod && totalVolumeKg.deltaPercent > 0) {
      whatIsWorking.push(`Volume di lavoro in crescita (+${totalVolumeKg.deltaPercent}% rispetto al periodo precedente).`);
    } else if (!hasPreviousPeriod && currentSessions.length > 0) {
      whatIsWorking.push(`Sessione iniziale registrata con successo: baseline carichi e volumi impostata (${curVol.toLocaleString('it-IT')} kg).`);
    }
    if (currentPainCount === 0) {
      whatIsWorking.push('Nessun fastidio articolare o infortunio segnalato.');
    }

    if (currentPainCount > 0) {
      whatNeedsAttention.push(`${currentPainCount} segnalazione/i di fastidio articolare post-allenamento.`);
      recommendedAction = 'change_exercises';
      recommendedActionLabel = 'Sostituisci Esercizi Critici';
      recommendedActionDescription = 'Inserisci varianti articolari guidate per mantenere lo stimolo proteggendo le articolazioni.';
    } else if (isPenultimateWeek) {
      whatNeedsAttention.push(`Blocco giunto alla penultima settimana (${currentWeek} di ${totalWeeks}).`);
      recommendedAction = 'deload';
      recommendedActionLabel = 'Prepara Prossimo Blocco';
      recommendedActionDescription = 'Struttura la nuova progressione per dare continuità all\'atleta.';
    } else if (currentAttendancePct < 70) {
      whatNeedsAttention.push(`Aderenza al ${currentAttendancePct}%, sotto la soglia minima.`);
      recommendedAction = 'contact_athlete';
      recommendedActionLabel = 'Contatta Atleta';
      recommendedActionDescription = 'Invia un messaggio per verificare impegni o difficoltà con la frequenza.';
    } else if (overallScore >= 80 && totalVolumeKg.deltaPercent >= 5) {
      recommendedAction = 'increase_stimulus';
      recommendedActionLabel = 'Aumenta Stimolo & Sovraccarico';
      recommendedActionDescription = 'Incrementa i carichi target del +2.5% o aggiungi 1 serie sui gruppi carenti.';
    }
  }

  if (whatIsWorking.length === 0) whatIsWorking.push('Dati atleta sincronizzati.');
  if (whatNeedsAttention.length === 0) whatNeedsAttention.push('Nessuna criticità rilevata, parametri in perfetto equilibrio.');

  const safeAthleteName =
    athlete.fullName ||
    [athlete.firstName, athlete.lastName].filter(Boolean).join(' ') ||
    athlete.email ||
    'Atleta';

  return {
    athleteId: athlete.id,
    athleteName: safeAthleteName,
    athleteEmail: athlete.email,
    avatarUrl: athlete.avatarUrl,
    workoutTitle,
    currentWeek,
    totalWeeks,
    blockProgressPercent,
    programStatus,
    programStatusLabel,
    isPenultimateWeek,
    trend,
    overallScore,
    aiNarrativeSummary,
    singleDecisionTitle,
    singleDecisionRationale,
    singleDecisionType,
    singleDecisionCtaLabel,
    attendance,
    completedSessions,
    avgRpe,
    painReportsCount,
    painDetailsSummary,
    totalVolumeKg,
    keyExercises,
    muscleGroups,
    timeSeriesData: [],
    recentEvents: [],
    whatIsWorking,
    whatNeedsAttention,
    recommendedAction,
    recommendedActionLabel,
    recommendedActionDescription,
  };
}

export function buildTeamOverviewReport(
  timeframe: TimeframeOption,
  athletes: Athlete[],
  sessions: RawSession[],
  logs: RawExerciseLog[],
  assignments: RawAssignment[],
  exerciseNamesMap: Map<string, string>
): TeamOverviewReportData {
  const days = getTimeframeDays(timeframe);
  const now = new Date();
  const currentStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const previousStart = new Date(Date.now() - 2 * days * 24 * 60 * 60 * 1000);

  const currentRangeLabel = `${currentStart.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })} – ${now.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}`;
  const previousRangeLabel = `${previousStart.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })} – ${currentStart.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}`;

  const athletesReports = athletes.map((ath) =>
    buildAthleteReport(ath, timeframe, sessions, logs, assignments, exerciseNamesMap)
  );

  const eligibleReports = athletesReports.filter((a) => a.programStatus !== 'unassigned');
  const unassignedReports = athletesReports.filter((a) => a.programStatus === 'unassigned');
  const penultimateReports = athletesReports.filter((a) => a.isPenultimateWeek);

  const curTeamAtt = eligibleReports.length > 0
    ? eligibleReports.reduce((sum, a) => sum + a.attendance.current, 0) / eligibleReports.length
    : 0;
  const prevTeamAtt = eligibleReports.length > 0
    ? eligibleReports.reduce((sum, a) => sum + a.attendance.previous, 0) / eligibleReports.length
    : 0;

  const curTeamVol = eligibleReports.reduce((sum, a) => sum + a.totalVolumeKg.current, 0);
  const prevTeamVol = eligibleReports.reduce((sum, a) => sum + a.totalVolumeKg.previous, 0);

  const positiveCount = eligibleReports.filter((a) => a.trend === 'positive').length;
  const stableCount = eligibleReports.filter((a) => a.trend === 'stable').length;
  const negativeCount = eligibleReports.filter((a) => a.trend === 'negative').length;
  const activeAlertsCount = eligibleReports.filter(
    (a) => a.painReportsCount.current > 0 || (a.programStatus === 'active' && (a.attendance.current < 70 || a.trend === 'negative'))
  ).length;

  const todayPriorities: DecisionPriorityItem[] = [];

  // Lettura alert archiviati / gestiti dal coach
  const dismissedAlerts: Set<string> = (() => {
    try {
      const saved = localStorage.getItem('builder_copilot_dismissed_alerts');
      return saved ? new Set<string>(JSON.parse(saved)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  })();

  // 1. Dolori articolari segnalati (Priorità Alta)
  const painAthletes = eligibleReports.filter(
    (a) => a.painReportsCount.current > 0 && !dismissedAlerts.has(a.athleteId) && !dismissedAlerts.has(`prio-pain-${a.athleteId}`)
  );
  painAthletes.forEach((pa) => {
    if (todayPriorities.length < 3) {
      const painTitle = pa.painDetailsSummary
        ? `Fastidio su ${pa.painDetailsSummary}`
        : `Verifica fastidio articolare per ${pa.athleteName}`;
      const painRationale = pa.painDetailsSummary
        ? `Segnalato fastidio articolare su: ${pa.painDetailsSummary}.`
        : `${pa.painReportsCount.current} segnalazione/i di fastidio registrate nelle ultime sessioni.`;

      todayPriorities.push({
        id: `prio-pain-${pa.athleteId}`,
        athleteId: pa.athleteId,
        athleteName: pa.athleteName,
        title: painTitle,
        rationale: painRationale,
        type: 'pain',
        urgency: 'high',
        ctaLabel: 'Apri Decisione',
        targetAction: 'copilot',
      });
    }
  });

  // 2. Atleti in Penultima Settimana (Priorità Media/Alta)
  const pendingPenultimateReports = penultimateReports.filter(
    (pa) => !dismissedAlerts.has(pa.athleteId) && !dismissedAlerts.has(`prio-penult-${pa.athleteId}`)
  );
  pendingPenultimateReports.forEach((pa) => {
    if (todayPriorities.length < 3) {
      todayPriorities.push({
        id: `prio-penult-${pa.athleteId}`,
        athleteId: pa.athleteId,
        athleteName: pa.athleteName,
        title: `Prepara prossimo blocco per ${pa.athleteName}`,
        rationale: `L'atleta è alla settimana ${pa.currentWeek} di ${pa.totalWeeks}. Pianifica la nuova scheda per dare continuità.`,
        type: 'penultimate_week',
        urgency: 'medium',
        ctaLabel: 'Prepara Prossimo Blocco',
        targetAction: 'renew',
      });
    }
  });

  // 3. Atleti Da Avviare / Senza Programma
  if (unassignedReports.length > 0 && todayPriorities.length < 3) {
    const firstUnassigned = unassignedReports[0];
    todayPriorities.push({
      id: `prio-unassigned-${firstUnassigned.athleteId}`,
      athleteId: firstUnassigned.athleteId,
      athleteName: firstUnassigned.athleteName,
      title: `${unassignedReports.length} Atleti senza programma attivo`,
      rationale: `${firstUnassigned.athleteName} e altri ${unassignedReports.length - 1} atleti attendono l'assegnazione della scheda.`,
      type: 'unassigned',
      urgency: 'medium',
      ctaLabel: 'Assegna Programma',
      targetAction: 'assign',
    });
  }

  return {
    timeframe,
    timeframeLabel: getTimeframeLabel(timeframe),
    currentRangeLabel,
    previousRangeLabel,
    todayPriorities,
    avgTeamAttendance: calculateDelta(curTeamAtt, prevTeamAtt),
    totalTeamVolumeKg: calculateDelta(curTeamVol, prevTeamVol),
    totalAthletesCount: athletes.length,
    eligibleAthletesCount: eligibleReports.length,
    unassignedAthletesCount: unassignedReports.length,
    penultimateWeekAthletesCount: penultimateReports.length,
    positiveAthletesCount: positiveCount,
    stableAthletesCount: stableCount,
    negativeAthletesCount: negativeCount,
    activeAlertsCount,
    athletesReports,
  };
}
