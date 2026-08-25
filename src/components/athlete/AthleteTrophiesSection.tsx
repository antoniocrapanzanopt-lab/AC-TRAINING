import React, { useState, useMemo } from 'react';
import {
  Crown,
  Zap,
  Lock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Trophy,
  X,
  Target,
  Lightbulb,
  ChevronRight
} from 'lucide-react';
import {
  evaluateAthleteAchievements,
  AchievementCategory,
  AchievementTier,
  AchievementBadge
} from '../../utils/athleteGamification';
import { AthleteMaxLift, AthleteMetric } from '../../types/metrics';

interface AthleteTrophiesSectionProps {
  completedWorkoutsCount: number;
  maxLifts: AthleteMaxLift[];
  metrics: AthleteMetric[];
}

export const AthleteTrophiesSection: React.FC<AthleteTrophiesSectionProps> = ({
  completedWorkoutsCount,
  maxLifts,
  metrics,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'all'>('all');
  const [selectedBadge, setSelectedBadge] = useState<AchievementBadge | null>(null);

  const { badges, levelInfo } = useMemo(() => {
    return evaluateAthleteAchievements({
      completedWorkoutsCount,
      maxLifts,
      metrics,
    });
  }, [completedWorkoutsCount, maxLifts, metrics]);

  const filteredBadges = useMemo(() => {
    if (selectedCategory === 'all') return badges;
    return badges.filter((b) => b.category === selectedCategory);
  }, [badges, selectedCategory]);

  const getTierColor = (tier: AchievementTier, isUnlocked: boolean) => {
    if (!isUnlocked) return 'border-[var(--color-border)] bg-[var(--color-surface-strong)] text-[var(--color-text-muted)]';
    switch (tier) {
      case 'diamond':
        return 'border-cyan-500/40 bg-cyan-500/10 shadow-sm text-cyan-600 dark:text-cyan-300';
      case 'gold':
        return 'border-amber-500/40 bg-amber-500/10 shadow-sm text-amber-600 dark:text-amber-300';
      case 'silver':
        return 'border-slate-400/40 bg-[var(--color-surface-strong)] shadow-sm text-[var(--color-text)]';
      case 'bronze':
      default:
        return 'border-orange-500/40 bg-orange-500/10 shadow-sm text-orange-600 dark:text-orange-300';
    }
  };

  const getTierLabel = (tier: AchievementTier) => {
    switch (tier) {
      case 'diamond':
        return 'Diamante';
      case 'gold':
        return 'Oro';
      case 'silver':
        return 'Argento';
      case 'bronze':
      default:
        return 'Bronzo';
    }
  };

  const getBadgeInstructions = (badge: AchievementBadge) => {
    switch (badge.id) {
      case 'first-step':
        return {
          goal: 'Completa e salva il tuo primissimo allenamento all\'interno del portale.',
          step: 'Vai nella scheda "Oggi", avvia la tua sessione di allenamento guidata con il timer di recupero e premi "Termina Allenamento" per salvare la scheda.',
          tip: 'Anche una prima sessione di riscaldamento o test carichi ti permetterà di sbloccare questo traguardo.',
        };
      case 'workout-5':
        return {
          goal: 'Porta a termine 5 sessioni di allenamento con il tuo coach.',
          step: 'Allenati seguendo il programma settimanale e registra ciascuna sessione completata.',
          tip: 'La regolarità nelle prime due settimane è il fattore chiave per consolidare l\'abitudine.',
        };
      case 'workout-15':
        return {
          goal: 'Raggiungi quota 15 sessioni di allenamento completate.',
          step: 'Continua ad allenarti con costanza registrando carichi e ripetizioni per ogni esercizio.',
          tip: 'Non saltare le sedute e utilizza i timer di recupero per massimizzare la resa.',
        };
      case 'workout-30':
        return {
          goal: 'Supera il traguardo di 30 allenamenti registrati nel portale.',
          step: 'Completa 30 sedute totali nel tuo percorso sportivo guidato.',
          tip: 'A questo punto la disciplina batte la motivazione. Continua a spingere con sovraccarico progressivo!',
        };
      case 'workout-50':
        return {
          goal: 'Completa 50 sessioni di allenamento guidate dal coach.',
          step: 'Raggiungi il vertice della costanza con 50 allenamenti registrati con successo.',
          tip: 'Sei tra i migliori atleti della piattaforma. Condividi i tuoi traguardi e punta a nuovi record!',
        };
      case 'club-100':
        return {
          goal: 'Solleva un massimale stimato (1RM) pari o superiore a 100 kg.',
          step: 'Esegui una serie pesante su un esercizio fondamentale (Squat, Panca, Stacco, Press) con carichi elevati.',
          tip: 'L\'algoritmo calcola automaticamente il tuo 1RM in base a peso sollevato e ripetizioni registrate.',
        };
      case 'club-150':
        return {
          goal: 'Supera i 150 kg di massimale stimato 1RM.',
          step: 'Incrementa progressivamente i carichi sui grandi sollevamenti fondamentali.',
          tip: 'Cura la traiettoria e la tecnica esecutiva prima di spingere sui carichi massimi.',
        };
      case 'club-200':
        return {
          goal: 'Raggiungi il titanico traguardo dei 200 kg di massimale 1RM.',
          step: 'Supera la soglia leggendaria dei 200 kg su uno dei tuoi massimali stimati.',
          tip: 'Riservato all\'élite della forza. Ottimizza nutrizione, sonno e periodizzazione.',
        };
      case 'pr-hunter':
        return {
          goal: 'Registra almeno 3 Personal Record (PR) differenti nel portale.',
          step: 'Inserisci nuovi record personali nella sezione Massimali & PR per 3 esercizi distinti.',
          tip: 'Quando senti di aver fatto un salto di prestazione, aggiorna i massimali per accumulare XP extra.',
        };
      case 'first-checkin':
        return {
          goal: 'Registra la prima misurazione di peso e circonferenze corporee.',
          step: 'Vai nella sezione Check-in del profilo e compila il modulo con i tuoi dati corporei.',
          tip: 'Esegui le misurazioni al mattino a digiuno per ottenere valori estremamente precisi.',
        };
      case 'checkin-5':
        return {
          goal: 'Invia con costanza 5 check-in periodici al tuo coach.',
          step: 'Monitora la tua evoluzione inviando almeno 5 aggiornamenti di misure nel tempo.',
          tip: 'I check-in regolari permettono al coach di adattare calorie e carichi alle tue risposte fisiche.',
        };
      case 'checkin-10':
        return {
          goal: 'Completa 10 check-in per documentare la tua trasformazione fisica completa.',
          step: 'Raggiungi 10 report periodici salvati nello storico misure.',
          tip: 'Confronta i grafici dei progressi nel tempo per apprezzare i cambiamenti a lungo termine.',
        };
      default:
        return {
          goal: badge.description,
          step: 'Completa le attività richieste dal programma per avanzare con il traguardo.',
          tip: 'Segui le istruzioni del tuo coach per sbloccare tutti i trofei disponibili.',
        };
    }
  };

  return (
    <div className="p-4 sm:p-5 rounded-3xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-md space-y-4 transition-all">
      
      {/* ─── CARD ESSENZIALE: LIVELLO, TROFEI SBLOCCATI, XP ATTUALI ─── */}
      <div
        onClick={() => setIsExpanded((prev) => !prev)}
        className="p-4 sm:p-5 rounded-2xl bg-[var(--color-surface-strong)] border border-amber-500/30 hover:border-amber-500/50 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 cursor-pointer select-none group transition-all"
      >
        {/* Sinistra: Icona Corona + Livello + Titolo */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-amber-500 flex items-center justify-center text-slate-950 shadow-md shadow-[var(--color-primary)]/20 shrink-0 group-hover:scale-105 transition-transform">
            <Crown className="w-6 h-6 stroke-[2.5]" />
          </div>

          <div className="min-w-0">
            <span className="px-2.5 py-0.5 rounded-full bg-[var(--color-primary)]/20 text-amber-600 dark:text-[var(--color-primary)] font-black text-[10px] uppercase tracking-wider border border-[var(--color-primary)]/40 inline-block">
              Livello {levelInfo.level}
            </span>
            <h3 className="text-base sm:text-lg font-black text-[var(--color-text)] mt-0.5 tracking-tight truncate group-hover:text-amber-500 transition-colors">
              {levelInfo.levelTitle}
            </h3>
          </div>
        </div>

        {/* Destra: Trofei Sbloccati + XP Attuali + Tasto Vedi Trofei */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap sm:flex-nowrap justify-between sm:justify-end">
          {/* Trofei Sbloccati */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
            <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-xs font-bold text-[var(--color-text)] whitespace-nowrap">
              <strong className="font-black text-amber-600 dark:text-[var(--color-primary)]">{levelInfo.unlockedBadgesCount}</strong> / {levelInfo.totalBadgesCount} <span className="text-[var(--color-text-muted)] font-medium">Trofei</span>
            </span>
          </div>

          {/* XP Attuali */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
            <Zap className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
            <span className="text-xs font-black text-[var(--color-text)] font-mono whitespace-nowrap">
              {levelInfo.totalXP} <span className="text-amber-600 dark:text-[var(--color-primary)]">XP</span>
            </span>
          </div>

          {/* Pulsante Apri / Chiudi */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded((prev) => !prev);
            }}
            className={`px-3.5 py-2 rounded-xl border text-xs font-black flex items-center gap-1.5 transition-all shadow-sm shrink-0 cursor-pointer ${
              isExpanded
                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40 shadow-sm'
                : 'bg-[var(--color-surface)] hover:bg-[var(--color-panel)] text-[var(--color-text)] border-[var(--color-border)]'
            }`}
          >
            <span>{isExpanded ? 'Chiudi' : 'Vedi Trofei'}</span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-amber-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-amber-500" />
            )}
          </button>
        </div>
      </div>

      {/* ─── CONTENUTO COMPLETO ESPANSO (FILTRI & GRIGLIA TROFEI VERTICALI) ─── */}
      {isExpanded && (
        <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Filtri Categorie a Pillola */}
          <div className="flex items-center justify-between gap-2 flex-wrap border-b border-[var(--color-border)] pb-3">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {[
                { id: 'all', label: 'Tutti', icon: '🏆' },
                { id: 'workout', label: 'Allenamenti', icon: '🏋️' },
                { id: 'strength', label: 'Forza & PR', icon: '⚡' },
                { id: 'checkin', label: 'Check-in', icon: '⚖️' },
              ].map((cat) => {
                const isSel = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id as AchievementCategory | 'all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 active:scale-95 ${
                      isSel
                        ? 'bg-[var(--color-primary)] text-slate-950 font-black shadow-md shadow-[var(--color-primary)]/20'
                        : 'bg-[var(--color-surface-strong)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-[var(--color-border)]'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            <span className="text-[11px] font-bold text-[var(--color-text-muted)]">
              {filteredBadges.filter((b) => b.isUnlocked).length} di {filteredBadges.length} completati
            </span>
          </div>

          {/* Griglia Badge & Trofei con Layout Icona in Alto, Titolo in Basso e Tasto Apri */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredBadges.map((badge) => {
              const tierStyle = getTierColor(badge.tier, badge.isUnlocked);

              return (
                <div
                  key={badge.id}
                  onClick={() => setSelectedBadge(badge)}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 flex flex-col items-center text-center justify-between space-y-2.5 relative cursor-pointer group hover:scale-[1.02] shadow-sm ${tierStyle} ${
                    badge.isUnlocked ? '' : 'opacity-85'
                  }`}
                >
                  {/* Badge XP in Alto a Destra */}
                  <span
                    className={`absolute top-2.5 right-2.5 text-[9px] font-black font-mono px-1.5 py-0.5 rounded-md ${
                      badge.isUnlocked
                        ? 'bg-amber-500/25 text-amber-600 dark:text-amber-300 border border-amber-500/30'
                        : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border border-[var(--color-border)]'
                    }`}
                  >
                    +{badge.xpValue} XP
                  </span>

                  {/* 1. ICONA IN ALTO (GRANDE E CENTRATA) */}
                  <div className="pt-1">
                    <div
                      className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl border transition-transform group-hover:scale-105 ${
                        badge.isUnlocked
                          ? 'bg-[var(--color-surface)] border-amber-400/50 shadow-md'
                          : 'bg-[var(--color-surface)] border-[var(--color-border)]'
                      }`}
                    >
                      {badge.isUnlocked ? badge.icon : <Lock className="w-6 h-6 text-[var(--color-text-muted)]" />}
                    </div>
                  </div>

                  {/* 2. TITOLO IN BASSO (NON TRONCATO E BEN VISIBILE) */}
                  <div className="w-full flex-1 flex flex-col items-center justify-center min-h-[40px]">
                    <h4 className="font-black text-xs sm:text-sm text-[var(--color-text)] tracking-tight leading-snug line-clamp-2">
                      {badge.title}
                    </h4>
                  </div>

                  {/* 3. STATO O PROGRESSO */}
                  <div className="w-full pt-1">
                    {badge.isUnlocked ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" />
                        Sbloccato
                      </span>
                    ) : (
                      <div className="w-full space-y-1">
                        <div className="w-full bg-[var(--color-surface)] rounded-full h-1.5 overflow-hidden border border-[var(--color-border)]">
                          <div
                            className="bg-[var(--color-primary)] h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.round((badge.currentProgress / badge.targetProgress) * 100)
                              )}%`,
                            }}
                          />
                        </div>
                        <span className="text-[9px] font-mono font-bold text-[var(--color-text-muted)] block">
                          {badge.progressLabel}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 4. TASTO APRI DEDICATO */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedBadge(badge);
                    }}
                    className={`w-full py-1.5 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1 transition-all shadow-sm cursor-pointer mt-1 ${
                      badge.isUnlocked
                        ? 'bg-amber-500/20 hover:bg-amber-500 text-amber-700 dark:text-amber-300 hover:text-slate-950 border border-amber-500/40'
                        : 'bg-[var(--color-surface)] hover:bg-[var(--color-panel)] text-[var(--color-text)] border border-[var(--color-border)]'
                    }`}
                  >
                    <span>Apri</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                </div>
              );
            })}
          </div>

          {/* Tasto Richiudi in fondo */}
          <div className="pt-2 text-center border-t border-[var(--color-border)]">
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="px-4 py-2 rounded-xl bg-[var(--color-surface-strong)] hover:bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-[var(--color-border)] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <ChevronUp className="w-4 h-4 text-amber-500" />
              <span>Comprimi Bacheca Trofei</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── MODALE DEDICATO DETTAGLIO TROFEO & COME SBLOCCARLO ─── */}
      {selectedBadge && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 text-center relative max-h-[90vh] overflow-y-auto no-scrollbar"
          >
            {/* Pulsante Chiudi X */}
            <button
              type="button"
              onClick={() => setSelectedBadge(null)}
              className="absolute top-4 right-4 p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] bg-[var(--color-surface-strong)] hover:bg-[var(--color-surface)] rounded-full transition-colors cursor-pointer border border-[var(--color-border)]"
              title="Chiudi"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icona Grande */}
            <div className="pt-2 flex justify-center">
              <div
                className={`w-20 h-20 sm:w-24 sm:h-24 rounded-3xl flex items-center justify-center text-4xl sm:text-5xl border shadow-xl relative ${
                  selectedBadge.isUnlocked
                    ? 'bg-gradient-to-br from-amber-400/20 to-amber-500/10 border-amber-400 shadow-amber-500/20'
                    : 'bg-[var(--color-surface-strong)] border-[var(--color-border)]'
                }`}
              >
                {selectedBadge.isUnlocked ? (
                  selectedBadge.icon
                ) : (
                  <Lock className="w-10 h-10 text-[var(--color-text-muted)]" />
                )}

                {/* Badge XP Sovrapposto */}
                <span className="absolute -bottom-2 px-2.5 py-0.5 rounded-full bg-[var(--color-primary)] text-slate-950 font-black text-xs shadow-md border border-white/20">
                  +{selectedBadge.xpValue} XP
                </span>
              </div>
            </div>

            {/* Titolo e Categoria */}
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--color-surface-strong)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
                  Trofeo {getTierLabel(selectedBadge.tier)}
                </span>
                {selectedBadge.isUnlocked && (
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Completato
                  </span>
                )}
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-[var(--color-text)] tracking-tight">
                {selectedBadge.title}
              </h3>
            </div>

            {/* BOX 1: COSA DEVI FARE PER OTTENERE IL TROFEO */}
            <div className="p-4 rounded-2xl bg-[var(--color-surface-strong)] border border-[var(--color-border)] text-left space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-black text-amber-600 dark:text-amber-400">
                <Target className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Cosa devi fare per ottenerlo:</span>
              </div>
              <p className="text-xs text-[var(--color-text)] font-semibold leading-relaxed">
                {getBadgeInstructions(selectedBadge).goal}
              </p>
              <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                {getBadgeInstructions(selectedBadge).step}
              </p>
            </div>

            {/* BOX 2: PROGRESSO ATTUALE */}
            <div className="p-3.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] text-left space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-[var(--color-text-muted)]">Avanzamento Obiettivo:</span>
                <span className="font-mono font-black text-[var(--color-text)]">
                  {selectedBadge.progressLabel}
                </span>
              </div>
              <div className="w-full bg-[var(--color-surface-strong)] rounded-full h-2 overflow-hidden border border-[var(--color-border)]">
                <div
                  className={`h-full rounded-full transition-all ${
                    selectedBadge.isUnlocked ? 'bg-emerald-500' : 'bg-[var(--color-primary)]'
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round((selectedBadge.currentProgress / selectedBadge.targetProgress) * 100)
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* BOX 3: SUGGERIMENTO COACH */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-left flex items-start gap-2.5">
              <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-[11px] text-[var(--color-text)] leading-relaxed">
                <strong className="font-black text-amber-600 dark:text-amber-400 block mb-0.5">
                  Consiglio del Coach:
                </strong>
                {getBadgeInstructions(selectedBadge).tip}
              </div>
            </div>

            {/* Pulsante Chiudi / Ho Capito */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSelectedBadge(null)}
                className="w-full py-3 px-4 rounded-xl bg-[var(--color-primary)] hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer active:scale-98"
              >
                Ho Capito
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
