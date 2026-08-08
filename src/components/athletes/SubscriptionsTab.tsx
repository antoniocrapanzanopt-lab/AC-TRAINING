import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  PauseCircle,
  XCircle,
  RefreshCw,
  CreditCard,
  ShieldCheck,
} from 'lucide-react';
import { AthleteSubscription, SubscriptionFormData } from '../../types';
import { useSubscriptions } from '../../context/SubscriptionsContext';
import { useToast } from '../../context/ToastContext';
import { SubscriptionModal } from '../subscriptions/SubscriptionModal';
import { SubscriptionPauseModal } from '../subscriptions/SubscriptionPauseModal';

interface SubscriptionsTabProps {
  athleteId: string;
  athleteName: string;
}

export const SubscriptionsTab: React.FC<SubscriptionsTabProps> = ({ athleteId, athleteName }) => {
  const {
    subscriptions,
    addSubscription,
    updateSubscription,
    cancelSubscription,
  } = useSubscriptions();

  const { showSuccess, showInfo } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<AthleteSubscription | null>(null);
  const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
  const [pausingSub, setPausingSub] = useState<AthleteSubscription | null>(null);

  const [cancelConfirmModal, setCancelConfirmModal] = useState<{ open: boolean; subId: string | null }>({
    open: false,
    subId: null,
  });

  // Tutti gli abbonamenti di questo atleta
  const athleteSubs = useMemo(() => {
    return subscriptions
      .filter(s => s.athleteId === athleteId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [subscriptions, athleteId]);

  // Abbonamento attivo o in pausa
  const activeSub = useMemo(() => {
    return athleteSubs.find(s => s.status === 'active' || s.status === 'suspended');
  }, [athleteSubs]);

  // Storico abbonamenti (scaduti o disdetti o passati)
  const pastSubs = useMemo(() => {
    return athleteSubs.filter(s => s.id !== activeSub?.id);
  }, [athleteSubs, activeSub]);

  // Calcolo progresso temporale e giorni rimanenti per l'abbonamento attivo
  const activeSubMetrics = useMemo(() => {
    if (!activeSub) return null;

    const start = new Date(activeSub.startDate).getTime();
    const end = new Date(activeSub.endDate).getTime();
    const now = new Date().getTime();

    const totalDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
    const elapsedDays = Math.max(0, Math.ceil((now - start) / (1000 * 60 * 60 * 24)));
    const daysRemaining = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));

    const progressPct = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));

    const paidInstallments = activeSub.installments?.filter(i => i.status === 'paid').length || 0;
    const totalInstallments = activeSub.installments?.length || 1;

    return {
      totalDays,
      elapsedDays,
      daysRemaining,
      progressPct,
      paidInstallments,
      totalInstallments,
      isExpiringSoon: daysRemaining <= 15 && daysRemaining > 0,
      isExpired: daysRemaining === 0 && activeSub.status === 'active',
    };
  }, [activeSub]);

  const handleSaveSubscription = (data: SubscriptionFormData) => {
    if (editingSub) {
      updateSubscription(editingSub.id, data);
      showSuccess('Modificato', 'L\'abbonamento è stato aggiornato.');
    } else {
      addSubscription({ ...data, athleteId, athleteName });
      showSuccess('Attivato', `Abbonamento per ${athleteName} creato con successo.`);
    }
  };

  const handleCancelSub = (subId: string) => {
    cancelSubscription(subId);
    showInfo('Annullato', 'L\'abbonamento è stato disdetto.');
    setCancelConfirmModal({ open: false, subId: null });
  };

  const handleResumeSub = (subId: string) => {
    updateSubscription(subId, { status: 'active' });
    showSuccess('Ripristinato', 'L\'abbonamento è nuovamente attivo.');
  };

  return (
    <div className="space-y-6">
      {/* Header Tab */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[var(--color-primary)]" /> Abbonamento & Pacchetto Atleta
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Gestisci il piano attivo, i rinnovi, le pause e consulta lo storico contrattuale di {athleteName}.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingSub(null);
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all shadow-[0_0_15px_rgba(234,179,8,0.2)]"
        >
          <Plus className="w-4 h-4" /> {activeSub ? 'Nuovo / Rinnova Piano' : 'Associa Primo Abbonamento'}
        </button>
      </div>

      {/* ======================================================================== */}
      {/* CARD ABBONAMENTO ATTIVO                                                 */}
      {/* ======================================================================== */}
      {activeSub && activeSubMetrics ? (
        <div className="p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-6 relative overflow-hidden">
          {/* Badge Decorativo Sfondo */}
          <div className="absolute top-0 right-0 translate-x-8 -translate-y-8 w-40 h-40 bg-[var(--color-primary)]/5 rounded-full blur-3xl pointer-events-none" />

          {/* Intestazione Piano Attivo */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)] shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Piano Attualmente Attivo</span>
                <h4 className="text-xl font-black text-white">{activeSub.packageName}</h4>
              </div>
            </div>

            {/* Badge Stato Piano */}
            <div className="flex items-center gap-2">
              {activeSub.status === 'suspended' ? (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold">
                  <PauseCircle className="w-4 h-4 animate-pulse" /> Sospeso / In Pausa
                </span>
              ) : activeSubMetrics.isExpiringSoon ? (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
                  <AlertTriangle className="w-4 h-4" /> In Scadenza ({activeSubMetrics.daysRemaining} giorni)
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4" /> Attivo
                </span>
              )}
            </div>
          </div>

          {/* Barra di Avanzamento Temporale */}
          <div className="space-y-2 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" /> Progresso Temporale Piano:
              </span>
              <span className="text-white font-bold">
                {activeSubMetrics.elapsedDays} su {activeSubMetrics.totalDays} giorni trascorsi ({activeSubMetrics.progressPct}%)
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  activeSub.status === 'suspended'
                    ? 'bg-blue-500'
                    : activeSubMetrics.isExpiringSoon
                    ? 'bg-amber-400'
                    : 'bg-[var(--color-primary)]'
                }`}
                style={{ width: `${activeSubMetrics.progressPct}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1">
              <span>Inizio: {new Date(activeSub.startDate).toLocaleDateString('it-IT')}</span>
              <span className="font-bold text-amber-300">
                {activeSub.status === 'suspended'
                  ? 'Congelato per pausa'
                  : `Scadenza: ${new Date(activeSub.endDate).toLocaleDateString('it-IT')}`}
              </span>
            </div>
          </div>

          {/* Dettagli Economici & Rate */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Valore del Piano</span>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-black text-white">€{activeSub.finalPrice}</span>
                {activeSub.discountValue > 0 && (
                  <span className="text-xs text-slate-500 line-through">€{activeSub.listPrice}</span>
                )}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Frequenza & Rate</span>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                <CreditCard className="w-4 h-4 text-slate-400" />
                <span className="capitalize">{activeSub.paymentFrequency || 'Unico'}</span> ({activeSubMetrics.paidInstallments}/{activeSubMetrics.totalInstallments} rate pagate)
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Rinnovo Automatico</span>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                <RefreshCw className="w-4 h-4 text-slate-400" />
                <span>{activeSub.renewalType === 'automatic' ? 'Attivo' : 'Manuale'}</span>
              </div>
            </div>
          </div>

          {/* Pulsanti Azioni Rapide */}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-slate-800">
            {activeSub.status === 'suspended' ? (
              <button
                onClick={() => handleResumeSub(activeSub.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/40 hover:bg-blue-500/30 text-xs font-bold transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" /> Ripristina Abbonamento
              </button>
            ) : (
              <button
                onClick={() => {
                  setPausingSub(activeSub);
                  setIsPauseModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold transition-colors"
              >
                <PauseCircle className="w-4 h-4 text-blue-400" /> Metti in Pausa
              </button>
            )}

            <button
              onClick={() => {
                setEditingSub(activeSub);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold transition-colors"
            >
              <RefreshCw className="w-4 h-4 text-amber-400" /> Modifica / Rinnova
            </button>

            <button
              onClick={() => setCancelConfirmModal({ open: true, subId: activeSub.id })}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 text-xs font-bold transition-colors"
            >
              <XCircle className="w-4 h-4" /> Annulla Abbonamento
            </button>
          </div>
        </div>
      ) : (
        /* State se nessun abbonamento attivo */
        <div className="p-12 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
            <BookOpen className="w-8 h-8" />
          </div>
          <div>
            <h4 className="text-base font-bold text-white">Nessun Abbonamento Attivo</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              L'atleta non possiede un piano o pacchetto attivo al momento. Associa un pacchetto per attivare le scadenze automatiche ed i servizi.
            </p>
          </div>
          <button
            onClick={() => {
              setEditingSub(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-primary)] text-black text-xs font-black hover:bg-[var(--color-primary-hover)] transition-all shadow-lg"
          >
            <Plus className="w-4 h-4" /> Associa Primo Abbonamento
          </button>
        </div>
      )}

      {/* ======================================================================== */}
      {/* STORICO ABBONAMENTI PASSATI                                              */}
      {/* ======================================================================== */}
      {pastSubs.length > 0 && (
        <div className="p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4">
          <h4 className="text-sm font-bold text-white border-b border-slate-800 pb-3 flex items-center justify-between">
            <span>Storico Pacchetti & Abbonamenti Passati</span>
            <span className="text-xs text-slate-400 font-normal">{pastSubs.length} registrati</span>
          </h4>

          <div className="divide-y divide-slate-800 max-h-[350px] overflow-y-auto">
            {pastSubs.map(sub => (
              <div key={sub.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <h5 className="text-xs font-bold text-white">{sub.packageName}</h5>
                  <span className="text-[11px] text-slate-400">
                    Dal {new Date(sub.startDate).toLocaleDateString('it-IT')} al {new Date(sub.endDate).toLocaleDateString('it-IT')}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-300">€{sub.finalPrice}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                    sub.status === 'cancelled'
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {sub.status === 'cancelled' ? 'Disdetto' : 'Completato'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODALI */}
      <SubscriptionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingSub(null);
        }}
        onSave={handleSaveSubscription}
        editingSubscription={editingSub}
        preselectedAthleteId={athleteId}
      />

      <SubscriptionPauseModal
        isOpen={isPauseModalOpen}
        onClose={() => {
          setIsPauseModalOpen(false);
          setPausingSub(null);
        }}
        onSuccess={() => {
          setIsPauseModalOpen(false);
          setPausingSub(null);
          showSuccess('Sospeso', 'L\'abbonamento è stato congelato.');
        }}
        subscription={pausingSub}
      />

      {/* Modal Conferma Disdetta */}
      {cancelConfirmModal.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setCancelConfirmModal({ open: false, subId: null })} />
          <div className="relative w-full max-w-sm bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4 text-red-500">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Annullare Abbonamento?</h3>
            </div>
            <p className="text-sm text-slate-400 mb-6">
              Sei sicuro di voler disdire questo abbonamento? L'atleta passerà allo stato inattivo.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setCancelConfirmModal({ open: false, subId: null })}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={() => cancelConfirmModal.subId && handleCancelSub(cancelConfirmModal.subId)}
                className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors"
              >
                Conferma Disdetta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
