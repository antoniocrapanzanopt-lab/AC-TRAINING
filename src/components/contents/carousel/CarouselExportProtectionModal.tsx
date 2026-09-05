import React from 'react';
import { CarouselValidationReport, CarouselSlide } from '../../../types/carousel';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  X,
  Download,
  ArrowRight,
  AlertOctagon,
  FileText,
} from 'lucide-react';

interface CarouselExportProtectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: CarouselValidationReport;
  slides: CarouselSlide[];
  onGoToSlide: (index: number) => void;
  onConfirmExport: () => void;
  isExporting: boolean;
  exportProgress?: string;
}

export const CarouselExportProtectionModal: React.FC<CarouselExportProtectionModalProps> = ({
  isOpen,
  onClose,
  report,
  slides,
  onGoToSlide,
  onConfirmExport,
  isExporting,
  exportProgress,
}) => {
  if (!isOpen) return null;

  const hasBlocked = report.blockedCount > 0;
  const hasWarnings = report.warningCount > 0;
  const allClear = !hasBlocked && !hasWarnings;

  // Trova la prima slide che richiede attenzione (priorità alle bloccate)
  const firstProblemReport =
    report.slideReports.find((r) => r.status === 'blocked') ||
    report.slideReports.find((r) => r.status === 'warning') ||
    report.slideReports.find((r) => r.status === 'draft');

  const handleGoToCorrection = () => {
    if (firstProblemReport) {
      onGoToSlide(firstProblemReport.slideIndex);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER MODALE */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center shadow-lg font-black ${
                hasBlocked
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : hasWarnings
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {hasBlocked ? (
                <AlertOctagon className="w-5 h-5" />
              ) : hasWarnings ? (
                <ShieldAlert className="w-5 h-5" />
              ) : (
                <ShieldCheck className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-black text-white">
                {hasBlocked
                  ? 'Esportazione Bloccata: Correzioni Richieste'
                  : hasWarnings
                  ? 'Il carosello è quasi pronto'
                  : 'Carosello Pronto per l\'Esportazione (10/10)'}
              </h3>
              <p className="text-xs text-slate-400">
                Verifica preliminare standard editoriale 1080×1350 per Instagram.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* METRICHE RAPIDE STATO SLIDE */}
        <div className="px-6 py-3 bg-slate-950/70 border-b border-slate-800 flex items-center gap-2 flex-wrap text-xs shrink-0">
          <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{report.readyCount} slide pronte</span>
          </span>

          {report.warningCount > 0 && (
            <span className="px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{report.warningCount} da rivedere</span>
            </span>
          )}

          {report.blockedCount > 0 && (
            <span className="px-2.5 py-1 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 font-black flex items-center gap-1.5 animate-pulse">
              <XCircle className="w-3.5 h-3.5" />
              <span>{report.blockedCount} bloccata{report.blockedCount > 1 ? 'e' : ''}</span>
            </span>
          )}

          {report.draftCount > 0 && (
            <span className="px-2.5 py-1 rounded-xl bg-slate-800 text-slate-400 border border-slate-700 font-bold flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              <span>{report.draftCount} in bozza</span>
            </span>
          )}
        </div>

        {/* CONTENUTO PRINCIPALE CON DETTAGLIO PROBLEMI */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
          {hasBlocked && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2.5">
              <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <strong className="block text-rose-300 font-bold">
                  Blocco di sicurezza attivo: impossibile scaricare lo ZIP
                </strong>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Sono stati rilevati errori critici (es. testo di test/placeholder, parole non consone, o overflow grave). Correggi questi elementi per sbloccare l&apos;esportazione.
                </p>
              </div>
            </div>
          )}

          {hasWarnings && !hasBlocked && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Tutte le slide sono tecnicamente valide, ma sono presenti alcuni suggerimenti editoriali (es. densità testo o CTA). Puoi esportare comunque o completare le rifiniture.
              </p>
            </div>
          )}

          {allClear && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <strong className="block text-emerald-300 font-bold">Standard 10/10 Rispettato</strong>
                <span className="text-[11px] text-slate-300">
                  Tutte le {slides.length} slide sono conformi per formattazione, contrasto e struttura Instagram.
                </span>
              </div>
            </div>
          )}

          {/* LISTA SLIDE CHE RICHIEDONO ATTENZIONE */}
          <div className="space-y-2.5">
            <h4 className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold">
              Dettaglio Stato Slide ({slides.length} Totali)
            </h4>

            {report.slideReports.map((sr) => {
              const slide = slides[sr.slideIndex];
              const isBlocked = sr.status === 'blocked';
              const isWarning = sr.status === 'warning';
              const isReady = sr.status === 'ready';

              return (
                <div
                  key={sr.slideId}
                  className={`p-3 rounded-2xl border transition flex items-start justify-between gap-3 ${
                    isBlocked
                      ? 'bg-rose-500/5 border-rose-500/40 text-rose-200'
                      : isWarning
                      ? 'bg-amber-500/5 border-amber-500/30 text-amber-200'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {String(sr.slideOrder).padStart(2, '0')}
                    </span>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate max-w-[280px]">
                          {slide?.headline || `Slide ${sr.slideOrder}`}
                        </span>

                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full border ${
                            isBlocked
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : isWarning
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          }`}
                        >
                          {isBlocked ? 'BLOCCATA' : isWarning ? 'DA RIVEDERE' : 'PRONTA'}
                        </span>
                      </div>

                      {sr.issues.length > 0 ? (
                        <div className="space-y-0.5">
                          {sr.issues.map((iss, iIdx) => (
                            <p key={iIdx} className="text-[11px] text-slate-400 flex items-start gap-1">
                              <span className={iss.severity === 'critical' ? 'text-rose-400' : 'text-amber-400'}>
                                •
                              </span>
                              <span>{iss.message}</span>
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-500 font-mono">
                          Nessun problema rilevato ({sr.wordCount} parole).
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Pulsante rapido "Vai alla slide" */}
                  {!isReady && (
                    <button
                      type="button"
                      onClick={() => {
                        onGoToSlide(sr.slideIndex);
                        onClose();
                      }}
                      className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-[11px] font-bold shrink-0 flex items-center gap-1 transition cursor-pointer"
                    >
                      <span>Modifica</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* FOOTER AZIONI EXPORT */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between shrink-0 flex-wrap gap-2">
          {/* Pulsante "Porta a correzione" se ci sono problemi */}
          {(hasBlocked || hasWarnings) ? (
            <button
              type="button"
              onClick={handleGoToCorrection}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
            >
              <span>Porta a Correzione</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="text-[11px] text-slate-500 font-mono">
              Pronto per la pubblicazione
            </span>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-bold transition cursor-pointer"
            >
              Annulla
            </button>

            {/* IL PULSANTE "ESPORTA COMUNQUE" APPARE SOLO SE NON CI SONO ERRORI CRITICI */}
            {!hasBlocked && (
              <button
                type="button"
                onClick={onConfirmExport}
                disabled={isExporting}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black transition cursor-pointer shadow-lg shadow-amber-500/20 flex items-center gap-1.5 disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isExporting ? (exportProgress || 'Esportazione...') : hasWarnings ? 'Esporta Comunque' : 'Scarica ZIP (1080×1350)'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
