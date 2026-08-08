import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  Edit2,
  Trash2,
  FileCheck2,
  ShieldCheck,
  Camera,
  FileSpreadsheet,
  Lock,
  Globe,
  XCircle,
} from 'lucide-react';
import {
  AthleteDocument,
  AthleteConsent,
  DocumentCategory,
  AthleteDocumentFormData,
  AthleteConsentFormData,
} from '../../types';
import { useDocuments } from '../../context/DocumentsContext';
import { useToast } from '../../context/ToastContext';
import { DocumentModal } from '../documents/DocumentModal';
import { ConsentModal } from '../documents/ConsentModal';

interface DocumentsTabProps {
  athleteId: string;
  athleteName: string;
}

const categoryLabels: Record<DocumentCategory, string> = {
  medical_certificate: 'Certificato Medico',
  identity: 'Documento d\'Identità',
  privacy_consent: 'Modulo Privacy / GDPR',
  contract: 'Contratto / Regolamento',
  assessment_sheet: 'Scheda Valutazione',
  other: 'Altro Documento',
};

export const DocumentsTab: React.FC<DocumentsTabProps> = ({ athleteId, athleteName }) => {
  const {
    documents,
    consents,
    saveLocalDocument,
    updateDocument,
    deleteDocument,
    registerConsent,
    revokeConsent,
  } = useDocuments();

  const { showSuccess, showError, showInfo } = useToast();

  const [activeSubTab, setActiveSubTab] = useState<'files' | 'consents'>('files');
  const [filterCategory, setFilterCategory] = useState<DocumentCategory | 'all'>('all');

  // Modali Documenti
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<AthleteDocument | null>(null);

  // Modali Consensi
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const [consentModalMode, setConsentModalMode] = useState<'register' | 'revoke'>('register');
  const [editingConsent, setEditingConsent] = useState<AthleteConsent | null>(null);

  // Modale Eliminazione
  const [deleteDocModal, setDeleteDocModal] = useState<{ open: boolean; docId: string | null }>({
    open: false,
    docId: null,
  });

  // Documenti dell'atleta
  const athleteDocs = useMemo(() => {
    return documents
      .filter(d => d.athleteId === athleteId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [documents, athleteId]);

  // Consensi dell'atleta
  const athleteConsents = useMemo(() => {
    return consents
      .filter(c => c.athleteId === athleteId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [consents, athleteId]);

  // ----------------------------------------------------
  // Calcolo KPI Requisiti Obbligatori
  // ----------------------------------------------------
  const requirements = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const thirtyDaysStr = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // 1. Certificato Medico
    const medDocs = athleteDocs.filter(d => d.category === 'medical_certificate');
    const latestMedDoc = medDocs.length > 0 ? medDocs[0] : null;

    let medStatus: 'valid' | 'expiring' | 'expired' | 'missing' = 'missing';
    if (latestMedDoc) {
      if (!latestMedDoc.expiryDate) {
        medStatus = 'valid';
      } else if (latestMedDoc.expiryDate < todayStr) {
        medStatus = 'expired';
      } else if (latestMedDoc.expiryDate <= thirtyDaysStr) {
        medStatus = 'expiring';
      } else {
        medStatus = 'valid';
      }
    }

    // 2. Informativa Privacy (GDPR)
    const privacyConsent = athleteConsents.find(c => c.consentType === 'privacy' && c.status === 'granted');

    // 3. Liberatoria Foto/Video
    const photoConsent = athleteConsents.find(c => c.consentType === 'photo_video' && c.status === 'granted');

    // 4. Contratto
    const contractDoc = athleteDocs.find(d => d.category === 'contract');

    return {
      latestMedDoc,
      medStatus,
      privacyConsent,
      photoConsent,
      contractDoc,
    };
  }, [athleteDocs, athleteConsents]);

  // Documenti filtrati
  const filteredDocs = useMemo(() => {
    if (filterCategory === 'all') return athleteDocs;
    return athleteDocs.filter(d => d.category === filterCategory);
  }, [athleteDocs, filterCategory]);

  // Salvataggio Documento
  const handleSaveDoc = (data: AthleteDocumentFormData) => {
    if (editingDoc) {
      const res = updateDocument(editingDoc.id, data);
      if (res.success) showSuccess('Modificato', 'Documento aggiornato.');
      else showError('Errore', res.error || 'Impossibile aggiornare.');
    } else {
      const res = saveLocalDocument({ ...data, athleteId, athleteName });
      if (res.success) showSuccess('Caricato', `Documento salvato per ${athleteName}.`);
      else showError('Errore', res.error || 'Impossibile salvare.');
    }
  };

  const handleDeleteDoc = (id: string) => {
    deleteDocument(id);
    showInfo('Eliminato', 'Documento rimosso.');
    setDeleteDocModal({ open: false, docId: null });
  };

  // Salvataggio Consenso
  const handleSaveConsent = (data: AthleteConsentFormData) => {
    registerConsent({ ...data, athleteId, athleteName });
    showSuccess('Registrato', 'Consenso aggiornato.');
  };

  const handleRevokeConsent = (consentId: string, reason: string, revocationDate?: string) => {
    const res = revokeConsent(consentId, reason, revocationDate);
    if (res) showInfo('Revocato', 'Consenso revocato.');
    else showError('Errore', 'Impossibile revocare.');
  };

  // Apertura anteprima file
  const handleOpenFile = (doc: AthleteDocument) => {
    if (doc.file && doc.file.dataUrl) {
      const win = window.open();
      if (win) {
        win.document.write(`<iframe src="${doc.file.dataUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
      }
    } else {
      showInfo('Anteprima Demo', `File "${doc.file?.fileName || doc.title}" disponibile in locale.`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Sezione */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-[var(--color-primary)]" /> Documenti & Consensi Legali
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Archivio file, certificati medici, contratti e registro liberatorie privacy per {athleteName}.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingDoc(null);
            setIsDocModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all shadow-[0_0_15px_rgba(234,179,8,0.2)]"
        >
          <Plus className="w-4 h-4" /> Carica Nuovo Documento
        </button>
      </div>

      {/* KPI Cards Requisiti Obbligatori */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Certificato Medico */}
        <div className="p-4 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Certificato Medico</span>
            <FileCheck2 className="w-4 h-4 text-slate-500" />
          </div>
          {requirements.medStatus === 'valid' ? (
            <div>
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" /> Valido
              </span>
              {requirements.latestMedDoc?.expiryDate && (
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Scadenza: {new Date(requirements.latestMedDoc.expiryDate).toLocaleDateString('it-IT')}
                </span>
              )}
            </div>
          ) : requirements.medStatus === 'expiring' ? (
            <div>
              <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                <AlertTriangle className="w-4 h-4" /> In Scadenza
              </span>
              <span className="text-[10px] text-amber-300 block mt-0.5">
                Scade il: {new Date(requirements.latestMedDoc!.expiryDate!).toLocaleDateString('it-IT')}
              </span>
            </div>
          ) : (
            <div>
              <span className="flex items-center gap-1.5 text-xs font-bold text-red-400">
                <XCircle className="w-4 h-4" /> {requirements.medStatus === 'expired' ? 'Scaduto' : 'Mancante'}
              </span>
              <span className="text-[10px] text-red-300 block mt-0.5">
                {requirements.medStatus === 'expired' ? 'Richiedere rinnovo' : 'Nessun certificato in archivio'}
              </span>
            </div>
          )}
        </div>

        {/* 2. Informativa Privacy GDPR */}
        <div className="p-4 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Privacy (GDPR)</span>
            <ShieldCheck className="w-4 h-4 text-slate-500" />
          </div>
          {requirements.privacyConsent ? (
            <div>
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" /> Consenso Concesso
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Firmato il: {new Date(requirements.privacyConsent.grantDate).toLocaleDateString('it-IT')}
              </span>
            </div>
          ) : (
            <div>
              <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                <Clock className="w-4 h-4" /> In Attesa di Firma
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Modulo privacy da firmare</span>
            </div>
          )}
        </div>

        {/* 3. Liberatoria Foto / Video */}
        <div className="p-4 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Uso Immagini / Social</span>
            <Camera className="w-4 h-4 text-slate-500" />
          </div>
          {requirements.photoConsent ? (
            <div>
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" /> Autorizzato
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Foto/Video autorizzate</span>
            </div>
          ) : (
            <div>
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                <Lock className="w-4 h-4" /> Non Autorizzato
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Nessuna liberatoria social</span>
            </div>
          )}
        </div>

        {/* 4. Contratto Servizio */}
        <div className="p-4 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Contratto Servizio</span>
            <FileSpreadsheet className="w-4 h-4 text-slate-500" />
          </div>
          {requirements.contractDoc ? (
            <div>
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" /> Sottoscritto
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Contratto in atti</span>
            </div>
          ) : (
            <div>
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                <XCircle className="w-4 h-4" /> Non Presente
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Nessun contratto in archivio</span>
            </div>
          )}
        </div>
      </div>

      {/* Sub-Header Tabs: Documenti vs Liberatorie */}
      <div className="p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs font-bold">
            <button
              onClick={() => setActiveSubTab('files')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                activeSubTab === 'files' ? 'bg-[var(--color-primary)] text-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Documenti Allegati ({athleteDocs.length})
            </button>
            <button
              onClick={() => setActiveSubTab('consents')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                activeSubTab === 'consents' ? 'bg-[var(--color-primary)] text-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Liberatorie & Consensi ({athleteConsents.length})
            </button>
          </div>

          {activeSubTab === 'files' && (
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-[var(--color-primary)] transition-colors"
            >
              <option value="all">Tutte le categorie</option>
              <option value="medical_certificate">🩺 Certificati Medici</option>
              <option value="identity">🆔 Documenti d'Identità</option>
              <option value="privacy_consent">📋 Moduli Privacy / GDPR</option>
              <option value="contract">📜 Contratti / Regolamenti</option>
              <option value="assessment_sheet">📊 Schede Valutazione</option>
              <option value="other">📌 Altro Documento</option>
            </select>
          )}

          {activeSubTab === 'consents' && (
            <button
              onClick={() => {
                setEditingConsent(null);
                setConsentModalMode('register');
                setIsConsentModalOpen(true);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200 hover:text-white transition-colors"
            >
              + Registra Nuovo Consenso
            </button>
          )}
        </div>

        {/* TAB 1: FILE E DOCUMENTI */}
        {activeSubTab === 'files' && (
          <div className="divide-y divide-slate-800 max-h-[450px] overflow-y-auto pr-1">
            {filteredDocs.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                Nessun documento trovato per questo atleta.
              </div>
            ) : (
              filteredDocs.map(doc => (
                <div key={doc.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-900/40 p-2 rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-[var(--color-primary)] shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{doc.title}</h4>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span className="bg-slate-900 px-2 py-0.5 rounded text-[10px] font-semibold border border-slate-800">
                          {categoryLabels[doc.category]}
                        </span>
                        <span>• Caricato: {new Date(doc.createdAt).toLocaleDateString('it-IT')}</span>
                        {doc.expiryDate && (
                          <span className={doc.expiryDate < new Date().toISOString().slice(0, 10) ? 'text-red-400 font-bold' : 'text-slate-300'}>
                            • Scadenza: {new Date(doc.expiryDate).toLocaleDateString('it-IT')}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-[10px] text-slate-500">
                          {doc.visibility === 'shared_with_athlete' ? (
                            <><Globe className="w-3 h-3 text-sky-400" /> Condiviso con Atleta</>
                          ) : (
                            <><Lock className="w-3 h-3 text-slate-400" /> Riservato Coach</>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 shrink-0">
                    <button
                      onClick={() => handleOpenFile(doc)}
                      className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                      title="Visualizza File"
                    >
                      <Eye className="w-4 h-4 text-sky-400" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingDoc(doc);
                        setIsDocModalOpen(true);
                      }}
                      className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                      title="Modifica"
                    >
                      <Edit2 className="w-4 h-4 text-amber-400" />
                    </button>
                    <button
                      onClick={() => setDeleteDocModal({ open: true, docId: doc.id })}
                      className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-red-400 hover:bg-slate-800 transition-colors"
                      title="Elimina"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 2: LIBERATORIE E CONSENSI */}
        {activeSubTab === 'consents' && (
          <div className="divide-y divide-slate-800 max-h-[450px] overflow-y-auto pr-1">
            {athleteConsents.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                Nessun consenso o liberatoria registrata per questo atleta.
              </div>
            ) : (
              athleteConsents.map(consent => (
                <div key={consent.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-900/40 p-2 rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                      consent.status === 'granted'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-red-500/10 border-red-500/30 text-red-400'
                    }`}>
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white capitalize">{consent.consentType.replace('_', ' ')}</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          consent.status === 'granted'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-red-500/10 text-red-400 border-red-500/30'
                        }`}>
                          {consent.status === 'granted' ? 'Concesso' : 'Revocato'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        <span>Registrato il: {new Date(consent.grantDate).toLocaleDateString('it-IT')}</span>
                        {consent.revocationDate && (
                          <span className="text-red-400 font-semibold">• Revocato il: {new Date(consent.revocationDate).toLocaleDateString('it-IT')}</span>
                        )}
                        {consent.notes && <span>• Note: {consent.notes}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 shrink-0">
                    {consent.status === 'granted' && (
                      <button
                        onClick={() => {
                          setEditingConsent(consent);
                          setConsentModalMode('revoke');
                          setIsConsentModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 text-xs font-bold transition-colors"
                      >
                        Revoca Consenso
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* MODALI */}
      <DocumentModal
        isOpen={isDocModalOpen}
        onClose={() => {
          setIsDocModalOpen(false);
          setEditingDoc(null);
        }}
        onSave={handleSaveDoc}
        editingDocument={editingDoc}
        preselectedAthleteId={athleteId}
      />

      <ConsentModal
        isOpen={isConsentModalOpen}
        onClose={() => {
          setIsConsentModalOpen(false);
          setEditingConsent(null);
        }}
        onSave={handleSaveConsent}
        onRevoke={handleRevokeConsent}
        editingConsent={editingConsent}
        mode={consentModalMode}
      />

      {/* Modal Conferma Eliminazione Documento */}
      {deleteDocModal.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setDeleteDocModal({ open: false, docId: null })} />
          <div className="relative w-full max-w-sm bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4 text-red-500">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Eliminare Documento?</h3>
            </div>
            <p className="text-sm text-slate-400 mb-6">Sei sicuro di voler eliminare questo documento dall'archivio dell'atleta?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteDocModal({ open: false, docId: null })}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={() => deleteDocModal.docId && handleDeleteDoc(deleteDocModal.docId)}
                className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors"
              >
                Elimina Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
