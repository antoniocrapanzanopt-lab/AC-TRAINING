import React, { useState, useMemo } from 'react';
import {
  User,
  Building2,
  Calendar,
  CreditCard,
  FileText,
  Dumbbell,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Info,
  ShieldAlert,
  Scale
} from 'lucide-react';
import { useAthletes } from '../../context/AthletesContext';
import { useSubscriptions } from '../../context/SubscriptionsContext';
import { usePayments } from '../../context/PaymentsContext';
import { useCalendarEvents } from '../../context/CalendarContext';
import { useDocuments } from '../../context/DocumentsContext';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { getMedicalCertificateStatus, getDaysRemaining } from '../../lib/statusEngine';
import { Athlete, CalendarEvent } from '../../types';
import { AthleteProgressView } from '../athlete/AthleteProgressView';

export const AtletaPortalePage: React.FC = () => {
  const { athletes } = useAthletes();
  const { subscriptions } = useSubscriptions();
  const { payments } = usePayments();
  const { allEvents } = useCalendarEvents();
  const { documents } = useDocuments();
  const { ownerProfile } = useApp();
  const { currentOrganization } = useAuth();

  const [portalTab, setPortalTab] = useState<'panoramica' | 'progressi'>('panoramica');

  // Atleta Selezionato per l'anteprima del portale
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>(
    athletes.length > 0 ? athletes[0].id : ''
  );


  const selectedAthlete = useMemo<Athlete | undefined>(() => {
    return athletes.find((a) => a.id === selectedAthleteId) || athletes[0];
  }, [athletes, selectedAthleteId]);

  // Data odierna in formato YYYY-MM-DD
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // 1. Abbonamento Attivo dell'Atleta
  const activeSubscription = useMemo(() => {
    if (!selectedAthlete) return undefined;
    return subscriptions.find(
      (s) => s.athleteId === selectedAthlete.id && s.status === 'active'
    );
  }, [subscriptions, selectedAthlete]);

  // 2. Prossima Rata Residua dell'Atleta (ordinata per data di scadenza)
  const nextResidualPayment = useMemo(() => {
    if (!selectedAthlete) return undefined;
    const unpaidList = payments
      .filter(
        (p) =>
          p.athleteId === selectedAthlete.id &&
          p.residualAmount > 0 &&
          p.status !== 'cancelled' &&
          p.status !== 'refunded'
      )
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    return unpaidList[0];
  }, [payments, selectedAthlete]);

  // 3. Prossimi Eventi Futuri (Ordinati per data ed ora inizio)
  const futureEvents = useMemo(() => {
    if (!selectedAthlete) return [];

    return allEvents
      .filter(
        (e: CalendarEvent) =>
          (e.athleteId === selectedAthlete.id || e.isSystemEvent || e.isSystemGenerated) &&
          e.date >= todayStr
      )
      .sort((a: CalendarEvent, b: CalendarEvent) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return (a.startTime || '').localeCompare(b.startTime || '');
      });
  }, [allEvents, selectedAthlete, todayStr]);

  // 4. Documenti Personali dell'Atleta
  const athleteDocuments = useMemo(() => {
    if (!selectedAthlete) return [];
    return documents.filter((d) => d.athleteId === selectedAthlete.id);
  }, [documents, selectedAthlete]);

  // 5. Stato Certificato Medico
  const certStatus = useMemo(() => {
    if (!selectedAthlete) return null;
    return getMedicalCertificateStatus(selectedAthlete);
  }, [selectedAthlete]);

  if (!selectedAthlete) {
    return (
      <div className="p-8 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] text-center text-slate-400 space-y-4">
        <User className="w-12 h-12 text-slate-600 mx-auto" />
        <p className="text-sm">Nessun atleta registrato nel sistema. Crea un atleta per visualizzare l'anteprima del portale.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* BANNER SUPERIORE OBBLIGATORIO */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-amber-500/20 border border-amber-500/40 text-amber-300 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <Info className="w-6 h-6 text-amber-400 shrink-0" />
          <div>
            <span className="font-black tracking-wider uppercase text-xs block text-amber-400">
              ANTEPRIMA PORTALE ATLETA — CONTENUTI DIMOSTRATIVI
            </span>
            <p className="text-xs text-amber-200/80">
              Stai visualizzando l'anteprima del portale riservato per l'atleta. I dati sono generati in tempo reale dai moduli del sistema.
            </p>
          </div>
        </div>

        {/* Selettore Atleta per l'anteprima */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold text-slate-300">Cambia Atleta:</span>
          <select
            value={selectedAthlete.id}
            onChange={(e) => setSelectedAthleteId(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-bold focus:outline-none focus:border-[var(--color-primary)]"
          >
            {athletes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.firstName} {a.lastName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* HEADER ATLETA E ORGANIZZAZIONE */}
      <div className="p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 flex items-center justify-center text-xl font-black text-[var(--color-primary)]">
            {selectedAthlete.firstName[0]}
            {selectedAthlete.lastName[0]}
          </div>

          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              {selectedAthlete.firstName} {selectedAthlete.lastName}
            </h1>
            <p className="text-xs text-slate-400 flex items-center gap-2 mt-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              {ownerProfile?.organizationName || currentOrganization.name || 'Builder Athlete Gym'}
            </p>
          </div>
        </div>

        {/* STATO CERTIFICATO MEDICO */}
        {certStatus && (
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs flex items-center gap-3">
            {certStatus === 'valid' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : certStatus === 'expiring' ? (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
            )}

            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Certificato Medico</span>
              <span
                className={`font-bold text-xs ${
                  certStatus === 'valid'
                    ? 'text-emerald-400'
                    : certStatus === 'expiring'
                    ? 'text-amber-400'
                    : 'text-red-400'
                }`}
              >
                {certStatus === 'valid'
                  ? `Valido fino al ${selectedAthlete.medicalCertificateExpiryDate ? new Date(selectedAthlete.medicalCertificateExpiryDate).toLocaleDateString('it-IT') : ''}`
                  : certStatus === 'expiring'
                  ? `In scadenza (${selectedAthlete.medicalCertificateExpiryDate ? getDaysRemaining(selectedAthlete.medicalCertificateExpiryDate) : 0} giorni rimasti)`
                  : certStatus === 'expired'
                  ? 'Scaduto'
                  : 'Certificato Mancante'}
              </span>
            </div>
          </div>
        )}
      </div>


      {/* SELETTORE TAB PORTALE */}
      <div className="flex gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-2xl w-fit">
        <button
          onClick={() => setPortalTab('panoramica')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            portalTab === 'panoramica'
              ? 'bg-[var(--color-primary)] text-black shadow-md font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Panoramica, Scadenze & Documenti</span>
        </button>
        <button
          onClick={() => setPortalTab('progressi')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            portalTab === 'progressi'
              ? 'bg-[var(--color-primary)] text-black shadow-md font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Progressi, Misure & Massimali</span>
        </button>
      </div>

      {portalTab === 'progressi' ? (
        <AthleteProgressView targetAthleteId={selectedAthlete.id} />
      ) : (
        <>
          {/* RIEPILOGO ABBONAMENTO E RATA RESIDUA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* SCHEDA 1: ABBONAMENTO ATTIVO */}
        <div className="p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[var(--color-primary)]" /> Abbonamento Attivo
            </h3>
            <span className="text-[10px] font-bold text-emerald-400 uppercase bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              {activeSubscription ? 'In Corso' : 'Nessun Abbonamento'}
            </span>
          </div>

          {activeSubscription ? (
            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Piano / Pacchetto:</span>
                <span className="font-bold text-white">{activeSubscription.packageName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Valore Abbonamento:</span>
                <span className="font-bold text-[var(--color-primary)]">
                  €{activeSubscription.finalPrice || activeSubscription.listPrice}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Data Inizio:</span>
                <span className="text-slate-300">{new Date(activeSubscription.startDate).toLocaleDateString('it-IT')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Data Scadenza:</span>
                <span className="text-slate-300">{new Date(activeSubscription.endDate).toLocaleDateString('it-IT')}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-4 text-center">Nessun abbonamento attivo registrato per questo atleta.</p>
          )}
        </div>

        {/* SCHEDA 2: PROSSIMA RATA RESIDUA */}
        <div className="p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-400" /> Prossima Rata da Saldare
            </h3>
            <span className="text-[10px] font-bold text-slate-500 uppercase">Situazione Rate</span>
          </div>

          {nextResidualPayment ? (
            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Importo Rata Residuo:</span>
                <span className="font-bold text-amber-400 text-sm">€{nextResidualPayment.residualAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Totale Previsto Rata:</span>
                <span className="text-slate-300">€{nextResidualPayment.expectedAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Data Scadenza Rata:</span>
                <span className="font-bold text-white">{new Date(nextResidualPayment.dueDate).toLocaleDateString('it-IT')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Stato Pagamento:</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {nextResidualPayment.status === 'partial' ? 'Parzialmente Pagato' : 'In Attesa'}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-emerald-400 py-4 text-center font-semibold">Tutti i pagamenti risultano regolarmente saldati!</p>
          )}
        </div>
      </div>

      {/* PROSSIMI EVENTI FUTURI */}
      <div className="p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[var(--color-primary)]" /> Prossimi Appuntamenti & Allenamenti
          </h3>
          <span className="text-[10px] font-bold text-slate-500 uppercase">{futureEvents.length} Eventi In Programma</span>
        </div>

        {futureEvents.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">Nessun appuntamento futuro in programma per questo atleta.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {futureEvents.slice(0, 4).map((e: CalendarEvent) => (
              <div key={e.id} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center font-bold text-xs shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="space-y-1 text-xs">
                  <h4 className="font-bold text-white">{e.title}</h4>
                  <p className="text-slate-400">
                    {new Date(e.date).toLocaleDateString('it-IT')} ({e.startTime} - {e.endTime})
                  </p>
                  {e.notes && <p className="text-[11px] text-slate-500 italic">{e.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CONTENUTO STATICAMENTE DIMOSTRATIVO: SCHEDA ALLENAMENTO DEMO */}
      <div className="p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4 relative">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-[var(--color-primary)]" /> Scheda Allenamento In Corso
          </h3>

          {/* Etichetta Dato Dimostrativo Obbligatoria */}
          <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 font-bold text-[10px] uppercase border border-amber-500/20">
            Dato dimostrativo
          </span>
        </div>

        <p className="text-xs text-slate-400">
          Scheda di ipertrofia e forza personalizzata (Esempio dimostrativo per l'interfaccia portale atleta).
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { exercise: 'Squat con Bilanciere', sets: '4 Set x 8 Reps', rest: '90 sec recupero' },
            { exercise: 'Panca Piana Bilanciere', sets: '4 Set x 10 Reps', rest: '90 sec recupero' },
            { exercise: 'Stacco da Terra Rumeno', sets: '3 Set x 12 Reps', rest: '60 sec recupero' },
          ].map((ex, idx) => (
            <div key={idx} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-[var(--color-primary)] uppercase block">Esercizio {idx + 1}</span>
              <h4 className="text-xs font-bold text-white">{ex.exercise}</h4>
              <p className="text-[11px] text-slate-300">{ex.sets}</p>
              <span className="text-[10px] text-slate-500 block">{ex.rest}</span>
            </div>
          ))}
        </div>
      </div>

      {/* DOCUMENTI PERSONALI ATLETA */}
      <div className="p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-[var(--color-primary)]" /> Documenti Personali & Certificati
          </h3>
          <span className="text-[10px] font-bold text-slate-500 uppercase">{athleteDocuments.length} Documenti</span>
        </div>

        {athleteDocuments.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">Nessun documento o certificato caricato per questo atleta.</p>
        ) : (
          <div className="space-y-2">
            {athleteDocuments.map((doc) => (
              <div
                key={doc.id}
                className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-sky-400 shrink-0" />
                  <div>
                    <h4 className="font-bold text-white">{doc.title}</h4>
                    <span className="text-[10px] text-slate-500">
                      Caricato il {new Date(doc.createdAt).toLocaleDateString('it-IT')} ({doc.file?.fileName})
                    </span>
                  </div>
                </div>

                <a
                  href={doc.file?.dataUrl || '#'}
                  download={doc.file?.fileName || 'documento'}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-[11px] transition-all"
                >
                  <Download className="w-3.5 h-3.5 text-[var(--color-primary)]" /> Scarica
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
};

