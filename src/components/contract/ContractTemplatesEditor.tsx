import React, { useState, useEffect } from 'react';
import {
  FileText,
  Video,
  Award,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  HeartPulse,
  History,
} from 'lucide-react';
import {
  ContractTemplatesConfig,
  ContractSection,
  PublishedContractTemplate,
} from '../../types/contract';
import {
  fetchContractTemplateHistory,
  publishContractTemplate,
  getDefaultContractTemplates,
} from '../../services/contractService';
import { useToast } from '../../context/ToastContext';

const toLines = (value: string): string[] => value.split('\n');
const fromLines = (lines: string[] | undefined): string => (lines ?? []).join('\n');
const cleanLines = (lines: string[]): string[] => lines.map((l) => l.trim()).filter(Boolean);

export const ContractTemplatesEditor: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [config, setConfig] = useState<ContractTemplatesConfig>(getDefaultContractTemplates());
  const [history, setHistory] = useState<PublishedContractTemplate[]>([]);
  const [activeTab, setActiveTab] = useState<'terms' | 'health' | 'video' | 'testimonial'>('terms');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const activeVersion = history.find((h) => h.isActive) ?? null;

  useEffect(() => {
    let isMounted = true;
    fetchContractTemplateHistory()
      .then((list) => {
        if (!isMounted) return;
        setHistory(list);
        const active = list.find((h) => h.isActive);
        if (active) setConfig(active.content);
      })
      .catch((err: unknown) => {
        if (isMounted) setLoadError(err instanceof Error ? err.message : 'Errore di caricamento.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const updateSection = (index: number, patch: Partial<ContractSection>) => {
    setConfig((prev) => ({
      ...prev,
      serviceTerms: {
        ...prev.serviceTerms,
        sections: prev.serviceTerms.sections.map((s, i) => (i === index ? { ...s, ...patch } : s)),
      },
    }));
  };

  const sanitizeForPublish = (c: ContractTemplatesConfig): ContractTemplatesConfig => ({
    ...c,
    serviceTerms: {
      ...c.serviceTerms,
      sections: c.serviceTerms.sections.map((s) => ({
        title: s.title.trim(),
        content: cleanLines(s.content),
        highlightNotes: cleanLines(s.highlightNotes ?? []),
      })),
      specificApprovalClauses: cleanLines(c.serviceTerms.specificApprovalClauses),
    },
    healthPrivacy: {
      ...c.healthPrivacy,
      healthDeclaration: cleanLines(c.healthPrivacy.healthDeclaration),
      privacySummary: cleanLines(c.healthPrivacy.privacySummary),
    },
    videoRelease: {
      ...c.videoRelease,
      allowedChannels: cleanLines(c.videoRelease.allowedChannels),
      rules: cleanLines(c.videoRelease.rules),
    },
    testimonialPact: {
      ...c.testimonialPact,
      distributionChannels: cleanLines(c.testimonialPact.distributionChannels),
    },
  });

  const handleSave = async () => {
    const confirmed = window.confirm(
      'Pubblicare una NUOVA versione dei termini?\n\nLa versione pubblicata non sarà più modificabile e TUTTI gli atleti dovranno firmarla di nuovo.'
    );
    if (!confirmed) return;

    setIsSaving(true);
    try {
      const published = await publishContractTemplate(sanitizeForPublish(config));
      setHistory((prev) => [published, ...prev.map((h) => ({ ...h, isActive: false }))]);
      setConfig(published.content);
      showSuccess('Versione pubblicata', `Revisione ${published.revision} attiva: gli atleti riceveranno la richiesta di firma.`);
    } catch (err) {
      showError('Pubblicazione non riuscita', err instanceof Error ? err.message : 'Riprova.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefault = () => {
    if (window.confirm('Caricare nell’editor il testo predefinito? Le modifiche non pubblicate andranno perse (nulla viene pubblicato finché non premi "Pubblica").')) {
      setConfig(getDefaultContractTemplates());
      showSuccess('Testo predefinito caricato', 'Rivedi il testo e premi "Pubblica nuova versione" quando sei pronto.');
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-xs text-slate-500">Caricamento versioni contrattuali...</div>;
  }

  return (
    <div className="space-y-6">
      {/* ── Testata Editor ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400" />
            Editor Modelli Contrattuali &amp; Accordi
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Modifica le clausole e pubblica una nuova versione. Ogni versione pubblicata è immutabile e richiede una nuova firma da parte di tutti gli atleti.
          </p>
          <p className="text-[11px] mt-1 font-medium">
            {activeVersion ? (
              <span className="text-emerald-400">
                Versione attiva: {activeVersion.versionLabel} (rev. {activeVersion.revision}) — pubblicata il{' '}
                {new Date(activeVersion.publishedAt).toLocaleDateString('it-IT')}
              </span>
            ) : (
              <span className="text-amber-400">
                Nessuna versione pubblicata: gli atleti non vedranno alcun documento finché non pubblichi.
              </span>
            )}
          </p>
          {loadError && <p className="text-[11px] text-red-400 mt-1">{loadError}</p>}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Testo predefinito
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 text-xs font-black transition-all shadow-lg shadow-amber-400/20 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? 'Pubblicazione...' : 'Pubblica nuova versione'}
          </button>
        </div>
      </div>

      {/* ── Tabs di selezione documento ── */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('terms')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'terms'
              ? 'bg-amber-400 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          1. Termini &amp; Condizioni
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('health')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'health'
              ? 'bg-amber-400 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <HeartPulse className="w-3.5 h-3.5" />
          2. Salute &amp; Privacy
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('video')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'video'
              ? 'bg-amber-400 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Video className="w-3.5 h-3.5" />
          3. Liberatoria Video
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('testimonial')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'testimonial'
              ? 'bg-amber-400 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          4. Testimonianza &amp; Bonus
        </button>
      </div>

      {/* ── CONTENUTO TAB 1: TERMINI E CONDIZIONI ── */}
      {activeTab === 'terms' && (
        <div className="space-y-4 bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Titolo Documento
              </label>
              <input
                type="text"
                value={config.serviceTerms.title}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    serviceTerms: { ...prev.serviceTerms, title: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Stagione / Versione
              </label>
              <input
                type="text"
                value={config.serviceTerms.effectiveYear}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    version: e.target.value,
                    serviceTerms: { ...prev.serviceTerms, effectiveYear: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">
              Articoli &amp; Clausole
            </h4>
            {config.serviceTerms.sections.map((sec, sIdx) => (
              <div
                key={sIdx}
                className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    value={sec.title}
                    onChange={(e) => updateSection(sIdx, { title: e.target.value })}
                    className="w-2/3 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs font-black text-white focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const updatedSec = config.serviceTerms.sections.filter((_, i) => i !== sIdx);
                      setConfig((prev) => ({
                        ...prev,
                        serviceTerms: { ...prev.serviceTerms, sections: updatedSec },
                      }));
                    }}
                    className="p-1 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                    title="Elimina articolo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-medium">Contenuto Principale:</label>
                  <textarea
                    rows={3}
                    value={fromLines(sec.content)}
                    onChange={(e) => updateSection(sIdx, { content: toLines(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-amber-400/90 font-medium">
                    Regole Evidenziate (es. tempi di risposta, no vocali, penali 24h):
                  </label>
                  <textarea
                    rows={2}
                    value={fromLines(sec.highlightNotes)}
                    onChange={(e) => updateSection(sIdx, { highlightNotes: toLines(e.target.value) })}
                    placeholder="Regola evidenziata riga per riga..."
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-amber-200 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => {
                const newSec = {
                  title: `${config.serviceTerms.sections.length + 1}. NUOVO ARTICOLO`,
                  content: ['Descrizione del nuovo articolo o clausola contrattuale.'],
                  highlightNotes: [],
                };
                setConfig((prev) => ({
                  ...prev,
                  serviceTerms: {
                    ...prev.serviceTerms,
                    sections: [...prev.serviceTerms.sections, newSec],
                  },
                }));
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-xs font-bold text-amber-400 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Aggiungi Articolo
            </button>
          </div>

          <div className="space-y-1 pt-2 p-4 rounded-xl bg-red-500/5 border border-red-500/25">
            <label className="text-[10px] font-bold uppercase tracking-wider text-red-300">
              Clausole da approvare specificamente (artt. 1341–1342 c.c.) — una per riga
            </label>
            <textarea
              rows={4}
              value={fromLines(config.serviceTerms.specificApprovalClauses)}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  serviceTerms: { ...prev.serviceTerms, specificApprovalClauses: toLines(e.target.value) },
                }))
              }
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>
      )}

      {/* ── CONTENUTO TAB 2: SALUTE & PRIVACY ── */}
      {activeTab === 'health' && (
        <div className="space-y-4 bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Titolo sezione</label>
            <input
              type="text"
              value={config.healthPrivacy.title}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, healthPrivacy: { ...prev.healthPrivacy, title: e.target.value } }))
              }
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Dichiarazione stato di salute / certificato medico (una per riga)
            </label>
            <textarea
              rows={4}
              value={fromLines(config.healthPrivacy.healthDeclaration)}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  healthPrivacy: { ...prev.healthPrivacy, healthDeclaration: toLines(e.target.value) },
                }))
              }
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-400"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Informativa sintetica dati sanitari – art. 9 GDPR (una per riga)
            </label>
            <textarea
              rows={6}
              value={fromLines(config.healthPrivacy.privacySummary)}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  healthPrivacy: { ...prev.healthPrivacy, privacySummary: toLines(e.target.value) },
                }))
              }
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>
      )}

      {/* ── CONTENUTO TAB 2: LIBERATORIA VIDEO ── */}
      {activeTab === 'video' && (
        <div className="space-y-4 bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Titolo Liberatoria
            </label>
            <input
              type="text"
              value={config.videoRelease.title}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  videoRelease: { ...prev.videoRelease, title: e.target.value },
                }))
              }
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Ambito e Scopo della Liberatoria
            </label>
            <textarea
              rows={2}
              value={config.videoRelease.scope}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  videoRelease: { ...prev.videoRelease, scope: e.target.value },
                }))
              }
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Uso interno (necessario al servizio)
            </label>
            <textarea
              rows={2}
              value={config.videoRelease.internalUse}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  videoRelease: { ...prev.videoRelease, internalUse: e.target.value },
                }))
              }
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Canali di pubblicazione – consenso facoltativo (uno per riga)
            </label>
            <textarea
              rows={4}
              value={config.videoRelease.allowedChannels.join('\n')}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  videoRelease: {
                    ...prev.videoRelease,
                    allowedChannels: e.target.value.split('\n'),
                  },
                }))
              }
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Regole e Tutele per l'Atleta (una per riga)
            </label>
            <textarea
              rows={3}
              value={config.videoRelease.rules.join('\n')}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  videoRelease: {
                    ...prev.videoRelease,
                    rules: e.target.value.split('\n'),
                  },
                }))
              }
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>
      )}

      {/* ── CONTENUTO TAB 3: PATTO DI TESTIMONIANZA & BONUS ── */}
      {activeTab === 'testimonial' && (
        <div className="space-y-4 bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
          {/* Dati Professionista */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">
              Dati del Professionista (Intestazione Fiscale)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-medium">Nome e Cognome</label>
                <input
                  type="text"
                  value={config.testimonialPact.professional.fullName}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      testimonialPact: {
                        ...prev.testimonialPact,
                        professional: {
                          ...prev.testimonialPact.professional,
                          fullName: e.target.value,
                        },
                      },
                    }))
                  }
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-medium">Indirizzo e Città</label>
                <input
                  type="text"
                  value={config.testimonialPact.professional.address}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      testimonialPact: {
                        ...prev.testimonialPact,
                        professional: {
                          ...prev.testimonialPact.professional,
                          address: e.target.value,
                        },
                      },
                    }))
                  }
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-medium">Codice Fiscale</label>
                <input
                  type="text"
                  value={config.testimonialPact.professional.taxCode}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      testimonialPact: {
                        ...prev.testimonialPact,
                        professional: {
                          ...prev.testimonialPact.professional,
                          taxCode: e.target.value.toUpperCase(),
                        },
                      },
                    }))
                  }
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-amber-400 uppercase"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-medium">Partita IVA</label>
                <input
                  type="text"
                  value={config.testimonialPact.professional.vatNumber}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      testimonialPact: {
                        ...prev.testimonialPact,
                        professional: {
                          ...prev.testimonialPact.professional,
                          vatNumber: e.target.value,
                        },
                      },
                    }))
                  }
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          </div>

          {/* Bonus Esclusivo Art. 3 */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-400/30 space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-300">
              Articolo 3 – Descrizione del Bonus di Riconoscimento
            </h4>
            <p className="text-[11px] text-slate-400">
              Specifica la controprestazione offerta al cliente a seguito del rilascio della video-intervista:
            </p>
            <input
              type="text"
              value={config.testimonialPact.bonusDescription}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  testimonialPact: {
                    ...prev.testimonialPact,
                    bonusDescription: e.target.value,
                  },
                }))
              }
              className="w-full px-3 py-2 bg-slate-950 border border-amber-400/40 rounded-xl text-xs font-bold text-amber-200 focus:outline-none focus:border-amber-400"
            />
            <label className="text-[10px] text-slate-400 font-medium block pt-1">
              Nota di trasparenza (recensione incentivata, nessun obbligo di giudizio positivo)
            </label>
            <textarea
              rows={3}
              value={config.testimonialPact.transparencyNote}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  testimonialPact: { ...prev.testimonialPact, transparencyNote: e.target.value },
                }))
              }
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Dettagli Intervista */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">
              Dettagli Intervista (Articolo 2)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-medium">Piattaforma</label>
                <input
                  type="text"
                  value={config.testimonialPact.interviewDetails.platform}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      testimonialPact: {
                        ...prev.testimonialPact,
                        interviewDetails: {
                          ...prev.testimonialPact.interviewDetails,
                          platform: e.target.value,
                        },
                      },
                    }))
                  }
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-medium">Durata Indicativa</label>
                <input
                  type="text"
                  value={config.testimonialPact.interviewDetails.duration}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      testimonialPact: {
                        ...prev.testimonialPact,
                        interviewDetails: {
                          ...prev.testimonialPact.interviewDetails,
                          duration: e.target.value,
                        },
                      },
                    }))
                  }
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STORICO VERSIONI PUBBLICATE ── */}
      {history.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-2">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-amber-400" />
            Storico versioni pubblicate
          </h4>
          {history.map((h) => (
            <div
              key={h.id}
              className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-[11px]"
            >
              <span className="text-slate-200 font-bold">
                {h.versionLabel} <span className="text-slate-500 font-mono">rev. {h.revision}</span>
              </span>
              <span className="text-slate-500 font-mono hidden sm:inline" title={h.contentHash}>
                {h.contentHash.slice(0, 12)}…
              </span>
              <span className="text-slate-400">{new Date(h.publishedAt).toLocaleDateString('it-IT')}</span>
              {h.isActive && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase">
                  Attiva
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
