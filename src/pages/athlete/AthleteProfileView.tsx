import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  FileCheck,
  Award,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAthletes } from '../../context/AthletesContext';
import { useMetrics } from '../../context/MetricsContext';
import { getDaysRemaining } from '../../lib/statusEngine';
import { ChangeLogTab } from '../../components/athletes/ChangeLogTab';
import { AthleteNextAppointmentCard } from '../../components/athlete/AthleteNextAppointmentCard';
import { AthleteCommunicationsFeed } from '../../components/athlete/AthleteCommunicationsFeed';
import { AthleteQuestionnaireWizard } from '../../components/questionnaires/AthleteQuestionnaireWizard';
import { getAthleteOnboardingResponse } from '../../services/questionnaireService';
import { AthleteOnboardingRecord } from '../../types/questionnaire';
import { FileText, Sparkles } from 'lucide-react';

export const AthleteProfileView: React.FC = () => {
  const { user } = useAuth();
  const { athletes } = useAthletes();
  const { maxLifts, fetchMaxLiftsForAthlete } = useMetrics();

  const currentAthlete = user 
    ? athletes.find(a => 
        (a.id && a.id === user.athleteId) || 
        (a.email && user.email && a.email.toLowerCase() === user.email.toLowerCase())
      )
    : null;

  const athleteId = currentAthlete?.id || user?.athleteId || user?.id;

  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState<boolean>(false);
  const [onboardingRecord, setOnboardingRecord] = useState<AthleteOnboardingRecord | null>(null);

  // Carica stato questionario onboarding
  useEffect(() => {
    if (athleteId) {
      getAthleteOnboardingResponse(athleteId).then((rec) => setOnboardingRecord(rec));
    }
  }, [athleteId]);

  // Carica massimali (PR)
  useEffect(() => {
    if (athleteId) {
      fetchMaxLiftsForAthlete(athleteId);
    }
  }, [athleteId, fetchMaxLiftsForAthlete]);

  // Controllo scadenza certificato medico unificato
  const getCertificateStatus = () => {
    if (!currentAthlete?.medicalCertificateExpiryDate) {
      return { status: 'missing', label: 'Certificato Non Presente', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
    }
    const expDate = new Date(currentAthlete.medicalCertificateExpiryDate);
    const diffDays = getDaysRemaining(currentAthlete.medicalCertificateExpiryDate);

    if (diffDays < 0) {
      return { status: 'expired', label: `Scaduto il ${expDate.toLocaleDateString('it-IT')}`, color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' };
    } else if (diffDays <= 30) {
      return { status: 'warning', label: `In scadenza tra ${diffDays} gg (${expDate.toLocaleDateString('it-IT')})`, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
    }
    return { status: 'valid', label: `Valido fino al ${expDate.toLocaleDateString('it-IT')}`, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
  };

  const certStatus = getCertificateStatus();

  // Filtra massimali dell'atleta
  const athletePRs = maxLifts.filter(m => m.athlete_id === athleteId || !m.athlete_id);

  if (isOnboardingModalOpen) {
    return (
      <div className="py-4 max-w-3xl mx-auto">
        <AthleteQuestionnaireWizard
          athleteId={athleteId || 'ath-local'}
          athleteName={currentAthlete?.firstName || user?.name}
          onClose={() => setIsOnboardingModalOpen(false)}
          onComplete={(newRec) => {
            setOnboardingRecord(newRec);
            setIsOnboardingModalOpen(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-32 font-sans">
      {/* 1. Header Profilo Atleta */}
      <div className="p-6 rounded-3xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-md flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <div className="w-20 h-20 rounded-full bg-[var(--color-primary)] text-slate-950 font-black text-2xl flex items-center justify-center shadow-lg shadow-[var(--color-primary)]/20 shrink-0">
          {(currentAthlete?.firstName?.charAt(0) || user?.name?.charAt(0) || 'A').toUpperCase()}
        </div>

        <div className="flex-1 text-center sm:text-left space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-black text-[var(--color-text)]">
                {currentAthlete ? `${currentAthlete.firstName} ${currentAthlete.lastName}` : (user?.name || 'Atleta')}
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] flex items-center justify-center sm:justify-start gap-1.5 mt-0.5">
                <Mail className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                {user?.email || currentAthlete?.email || 'atleta@cloud.it'}
              </p>
            </div>
            <span className="self-center sm:self-auto px-3 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 rounded-full text-xs font-bold uppercase tracking-wider">
              Atleta Attivo
            </span>
          </div>

          <div className="pt-2 flex flex-wrap justify-center sm:justify-start gap-2">
            <span className={`px-3 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${certStatus.color}`}>
              {certStatus.status === 'valid' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
              {certStatus.label}
            </span>
            {currentAthlete?.phone && (
              <span className="px-3 py-1 rounded-xl text-xs font-medium bg-[var(--color-surface-strong)] text-[var(--color-text)] border border-[var(--color-border)] flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[var(--color-text-muted)]" /> {currentAthlete.phone}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* COMUNICAZIONI E AVVISI DAL COACH */}
      {athleteId && <AthleteCommunicationsFeed athleteId={athleteId} />}

      {/* 2. Dati Anagrafici & Certificato Medico */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Anagrafica */}
        <div className="p-5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-md space-y-3">
          <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2">
            <User className="w-4 h-4 text-[var(--color-primary)]" /> Informazioni Personali
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-[var(--color-border)]">
              <span className="text-[var(--color-text-muted)]">Data di Nascita:</span>
              <span className="font-semibold text-[var(--color-text)]">
                {currentAthlete?.dateOfBirth ? new Date(currentAthlete.dateOfBirth).toLocaleDateString('it-IT') : 'Non specificata'}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[var(--color-border)]">
              <span className="text-[var(--color-text-muted)]">Stato Account:</span>
              <span className="font-semibold text-emerald-500 capitalize">{currentAthlete?.status || 'Attivo'}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-[var(--color-text-muted)]">Codice Fiscale:</span>
              <span className="font-mono text-[var(--color-text)]">{currentAthlete?.fiscalCode || '—'}</span>
            </div>
          </div>
        </div>

        {/* Certificato Medico */}
        <div className="p-5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-md space-y-3">
          <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-emerald-500" /> Certificato Medico
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-[var(--color-border)]">
              <span className="text-[var(--color-text-muted)]">Scadenza Certificato:</span>
              <span className="font-semibold text-[var(--color-text)]">
                {currentAthlete?.medicalCertificateExpiryDate ? new Date(currentAthlete.medicalCertificateExpiryDate).toLocaleDateString('it-IT') : 'Non registrata'}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[var(--color-border)]">
              <span className="text-[var(--color-text-muted)]">Stato idoneità:</span>
              <span className={`font-bold ${certStatus.status === 'valid' ? 'text-emerald-500' : 'text-amber-500'}`}>
                {certStatus.status === 'valid' ? 'Idoneo all\'attività' : 'Revisione Richiesta'}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-[var(--color-text-muted)]">Note medico:</span>
              <span className="text-[var(--color-text-muted)] italic">{currentAthlete?.medicalNotes || 'Nessuna limitazione medica registrata'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2.5 Scheda Anamnesi & Onboarding Atleta */}
      <div className="p-5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/30 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[var(--color-text)]">
                Questionario Anamnesi Iniziale
              </h3>
              {onboardingRecord?.status === 'completed' ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase">
                  Completato
                </span>
              ) : onboardingRecord?.currentStep && onboardingRecord.currentStep > 1 ? (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-black uppercase">
                  Bozza (Passo {onboardingRecord.currentStep})
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-black uppercase">
                  Da Compilare
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              {onboardingRecord?.status === 'completed'
                ? `Parametri, obiettivi e safety check registrati il ${new Date(onboardingRecord.completedAt || onboardingRecord.updatedAt).toLocaleDateString('it-IT')}.`
                : 'Compila o aggiorna i tuoi dati biometrici, infortuni e preferenze operative.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOnboardingModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all shadow shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{onboardingRecord?.status === 'completed' ? 'Visualizza / Modifica' : 'Compila Anamnesi'}</span>
        </button>
      </div>

      {/* 3. Prossimo Appuntamento & Calendario */}
      <AthleteNextAppointmentCard targetAthleteId={athleteId} />

      {/* 4. Record Personali (PR / Massimali) */}
      {athletePRs.length > 0 && (
        <div className="p-5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-md space-y-3">
          <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2">
            <Award className="w-4 h-4 text-[var(--color-primary)]" /> Record Personali & Massimali (1RM)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {athletePRs.map(pr => (
              <div key={pr.id} className="p-3 rounded-xl bg-[var(--color-surface-strong)] border border-[var(--color-border)] text-center space-y-1">
                <span className="text-[10px] font-bold text-[var(--color-text-muted)] line-clamp-1 block">{pr.exercise_name}</span>
                <span className="text-lg font-black text-[var(--color-primary)] block">{pr.calculated_1rm} kg</span>
                <span className="text-[10px] text-[var(--color-text-muted)] block">({pr.weight_kg}kg testati)</span>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* 5. Change Log / Storico Variazioni Programma */}
      {athleteId && (
        <div className="pt-2">
          <ChangeLogTab athleteId={athleteId} />
        </div>
      )}
    </div>
  );
};
