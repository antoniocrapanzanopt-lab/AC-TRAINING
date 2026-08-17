import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  FileText,
  Download,
  Eye,
  Lock,
  User,
  Calendar,
  AlertTriangle,
  Trash2,
  Edit2,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import {
  AthleteDocument,
  DocumentCategory,
  DocumentVisibility,
  AthleteDocumentFormData,
  AthleteConsent,
  ConsentType,
  ConsentStatus,
  AthleteConsentFormData,
} from '../../types';
import { useDocuments } from '../../context/DocumentsContext';
import { useToast } from '../../context/ToastContext';
import { DocumentModal } from '../../components/documents/DocumentModal';
import { ConsentModal } from '../../components/documents/ConsentModal';
import { getDaysRemaining } from '../../lib/statusEngine';

const categoryLabels: Record<DocumentCategory, string> = {
  medical_certificate: 'Certificato Medico',
  identity: 'Documento d\'Identità',
  privacy_consent: 'Privacy e Consenso',
  contract: 'Contratto / Iscrizione',
  assessment_sheet: 'Scheda Valutazione',
  other: 'Altro Documento',
};

const consentTypeLabels: Record<ConsentType, string> = {
  privacy: 'Privacy (GDPR)',
  health_data: 'Dati Sanitari',
  photo_video: 'Liberatoria Foto/Video',
  marketing: 'Marketing',
  liability_waiver: 'Manleva / Responsabilità',
  other: 'Altro Consenso',
};

const consentStatusBadges: Record<ConsentStatus, { label: string; color: string }> = {
  granted: { label: 'Accordato', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  revoked: { label: 'Revocato', color: 'text-red-400 bg-red-400/10 border-red-400/20' },
  pending: { label: 'In Attesa', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  expired: { label: 'Scaduto', color: 'text-slate-400 bg-slate-400/10 border-slate-400/20' },
};

export const DocumentsPage: React.FC = () => {
  const {
    documents,
    consents,
    saveLocalDocument,
    updateDocument,
    deleteDocument,
    registerConsent,
    revokeConsent,
    deleteConsent,
  } = useDocuments();
  const { showSuccess, showError, showInfo } = useToast();

  const [activeTab, setActiveTab] = useState<'documents' | 'consents'>('documents');

  // Filtri Documenti
  const [query, setQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<DocumentCategory | 'all'>('all');
  const [filterVisibility, setFilterVisibility] = useState<DocumentVisibility | 'all'>('all');

  // Filtri Consensi
  const [consentQuery, setConsentQuery] = useState('');
  const [filterConsentType, setFilterConsentType] = useState<ConsentType | 'all'>('all');
  const [filterConsentStatus, setFilterConsentStatus] = useState<ConsentStatus | 'all'>('all');

  // Modali Documenti
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<AthleteDocument | null>(null);

  // Modali Consensi
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const [editingConsent, setEditingConsent] = useState<AthleteConsent | null>(null);
  const [consentModalMode, setConsentModalMode] = useState<'register' | 'revoke'>('register');

  // Modale Eliminazione
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; type: 'doc' | 'consent'; id: string | null }>({
    open: false,
    type: 'doc',
    id: null,
  });

  const filteredDocs = useMemo(() => {
    const q = query.toLowerCase().trim();
    return documents.filter(doc => {
      if (q && !doc.title.toLowerCase().includes(q) && !doc.athleteName.toLowerCase().includes(q)) return false;
      if (filterCategory !== 'all' && doc.category !== filterCategory) return false;
      if (filterVisibility !== 'all' && doc.visibility !== filterVisibility) return false;
      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [documents, query, filterCategory, filterVisibility]);

  const filteredConsents = useMemo(() => {
    const q = consentQuery.toLowerCase().trim();
    return consents.filter(c => {
      if (q && !c.athleteName.toLowerCase().includes(q) && !c.notes?.toLowerCase().includes(q)) return false;
      if (filterConsentType !== 'all' && c.consentType !== filterConsentType) return false;
      if (filterConsentStatus !== 'all' && c.status !== filterConsentStatus) return false;
      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [consents, consentQuery, filterConsentType, filterConsentStatus]);

  const metrics = useMemo(() => {
    const totalDocs = documents.length;
    const sharedDocs = documents.filter(d => d.visibility === 'shared_with_athlete').length;
    const totalConsents = consents.length;
    const grantedConsents = consents.filter(c => c.status === 'granted').length;
    const revokedConsents = consents.filter(c => c.status === 'revoked').length;

    return { totalDocs, sharedDocs, totalConsents, grantedConsents, revokedConsents };
  }, [documents, consents]);

  const handleSaveDoc = (data: AthleteDocumentFormData) => {
    if (editingDocument) {
      const res = updateDocument(editingDocument.id, data);
      if (res.success) {
        showSuccess('Modificato', 'Documento aggiornato localmente nella demo.');
      } else {
        showError('Errore salvataggio', res.error || 'Impossibile salvare il documento.');
      }
    } else {
      const res = saveLocalDocument(data);
      if (res.success) {
        showSuccess('Documento salvato', 'Documento salvato localmente nella demo.');
      } else {
        showError('Errore spazio', res.error || 'Memoria locale insufficiente.');
      }
    }
  };

  const handleRegisterConsent = (data: AthleteConsentFormData) => {
    registerConsent(data);
    showSuccess('Consenso registrato', 'Registrazione consenso completata a scopo dimostrativo.');
  };

  const handleRevokeConsent = (consentId: string, reason: string, revocationDate?: string) => {
    if (revokeConsent(consentId, reason, revocationDate)) {
      showInfo('Consenso revocato', 'La revoca è stata registrata con successo.');
    }
  };

  const handleDeleteItem = () => {
    if (!deleteModal.id) return;
    if (deleteModal.type === 'doc') {
      deleteDocument(deleteModal.id);
      showInfo('Eliminato', 'Documento rimosso dal registro locale.');
    } else {
      deleteConsent(deleteModal.id);
      showInfo('Eliminato', 'Consenso rimosso dal registro.');
    }
    setDeleteModal({ open: false, type: 'doc', id: null });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(2)} MB`;
  };

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return '-';
    return new Date(isoStr).toLocaleDateString('it-IT');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Documenti e Consensi</h1>
          <p className="text-sm text-slate-400 mt-1">
            Gestisci file allegati ed il tracciamento dei consensi privacy degli atleti.
          </p>
        </div>
        {activeTab === 'documents' ? (
          <button
            onClick={() => { setEditingDocument(null); setIsDocModalOpen(true); }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-primary)] text-black font-black text-xs hover:bg-[var(--color-primary-hover)] transition-all shadow-[0_0_20px_rgba(234,179,8,0.2)]"
          >
            <Plus className="w-4 h-4" /> Nuovo Documento
          </button>
        ) : (
          <button
            onClick={() => { setEditingConsent(null); setConsentModalMode('register'); setIsConsentModalOpen(true); }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-black font-black text-xs hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)]"
          >
            <Plus className="w-4 h-4" /> Registra Consenso
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl w-fit">
        <button
          onClick={() => setActiveTab('documents')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'documents'
              ? 'bg-[var(--color-primary)] text-black shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" /> Documenti Allegati ({metrics.totalDocs})
        </button>

        <button
          onClick={() => setActiveTab('consents')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'consents'
              ? 'bg-emerald-500 text-black shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" /> Consensi Privacy & Liberatorie ({metrics.totalConsents})
        </button>
      </div>

      {/* TAB 1: DOCUMENTI ALLEGATI */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          {/* Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl flex flex-col">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> File Totali</span>
              <span className="text-2xl font-black text-white">{metrics.totalDocs}</span>
            </div>
            <div className="p-4 rounded-xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl flex flex-col">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 text-emerald-400" /> Condivisi Portale</span>
              <span className="text-2xl font-black text-emerald-400">{metrics.sharedDocs}</span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Cerca per titolo documento o atleta..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-slate-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value as any)}
                className="px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              >
                <option value="all">Categorie (Tutte)</option>
                <option value="medical_certificate">Certificato Medico</option>
                <option value="identity">Documento Identità</option>
                <option value="privacy_consent">Privacy e Consenso</option>
                <option value="contract">Contratto / Iscrizione</option>
                <option value="assessment_sheet">Scheda Valutazione</option>
                <option value="other">Altro</option>
              </select>

              <select
                value={filterVisibility}
                onChange={e => setFilterVisibility(e.target.value as any)}
                className="px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              >
                <option value="all">Visibilità (Tutti)</option>
                <option value="shared_with_athlete">Condivisi Atleta</option>
                <option value="private">Riservati Staff</option>
              </select>
            </div>
          </div>

          {/* Grid Documents */}
          {filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl shadow-xl">
              <div className="w-16 h-16 rounded-3xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-4 text-slate-500 shadow-inner">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Nessun documento trovato</h3>
              <p className="text-slate-400 max-w-md mx-auto text-xs">
                Non vi sono file salvati corrispondenti ai filtri impostati.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredDocs.map(doc => {
                const daysLeft = doc.expiryDate ? getDaysRemaining(doc.expiryDate) : null;
                const isExpired = daysLeft !== null && daysLeft < 0;

                return (
                  <div
                    key={doc.id}
                    className="flex flex-col justify-between bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl shadow-xl p-5 space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary)] bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20">
                          {categoryLabels[doc.category]}
                        </span>

                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          doc.visibility === 'shared_with_athlete'
                            ? 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/20'
                            : 'text-slate-400 bg-slate-800 border border-slate-700'
                        }`}>
                          {doc.visibility === 'shared_with_athlete' ? <Eye className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                          {doc.visibility === 'shared_with_athlete' ? 'Condiviso' : 'Riservato'}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-white line-clamp-1" title={doc.title}>
                          {doc.title}
                        </h3>
                        <p className="text-xs text-slate-400 font-semibold flex items-center gap-1 mt-0.5">
                          <User className="w-3.5 h-3.5 text-slate-500" /> {doc.athleteName}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1 text-xs">
                        <div className="flex items-center justify-between text-slate-300 font-medium">
                          <span className="truncate max-w-[180px]" title={doc.file.fileName}>{doc.file.fileName}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{formatFileSize(doc.file.fileSize)}</span>
                        </div>

                        {doc.expiryDate && (
                          <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-800">
                            <span className="text-slate-500 flex items-center gap-1"><Calendar className="w-3 h-3" /> Scadenza:</span>
                            <span className={`font-bold ${isExpired ? 'text-red-400' : 'text-slate-300'}`}>
                              {formatDate(doc.expiryDate)} {isExpired ? '(Scaduto)' : ''}
                            </span>
                          </div>
                        )}
                      </div>

                      {doc.notes && <p className="text-xs text-slate-400 italic line-clamp-2">{doc.notes}</p>}
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                      <a
                        href={doc.file.dataUrl}
                        download={doc.file.fileName}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-primary)] text-black font-bold text-xs hover:bg-[var(--color-primary-hover)] transition-colors shadow"
                      >
                        <Download className="w-3.5 h-3.5" /> Scarica / Apri
                      </a>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditingDocument(doc); setIsDocModalOpen(true); }}
                          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                          title="Modifica"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteModal({ open: true, type: 'doc', id: doc.id })}
                          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 transition-colors"
                          title="Elimina"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CONSENSI PRIVACY & LIBERATORIE */}
      {activeTab === 'consents' && (
        <div className="space-y-6">
          {/* Metrics Bar Consensi */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl flex flex-col">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Accordati</span>
              <span className="text-2xl font-black text-emerald-400">{metrics.grantedConsents}</span>
            </div>
            <div className="p-4 rounded-xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl flex flex-col">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5 text-red-400" /> Revocati</span>
              <span className="text-2xl font-black text-red-400">{metrics.revokedConsents}</span>
            </div>
            <div className="p-4 rounded-xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl flex flex-col col-span-2 md:col-span-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Totale Consensi</span>
              <span className="text-2xl font-black text-white">{metrics.totalConsents}</span>
            </div>
          </div>

          {/* Filter Bar Consensi */}
          <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl bg-[var(--color-panel)] border border-[var(--color-panel-border)] shadow-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Cerca per atleta o note consenso..."
                value={consentQuery}
                onChange={e => setConsentQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-slate-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <select
                value={filterConsentType}
                onChange={e => setFilterConsentType(e.target.value as any)}
                className="px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              >
                <option value="all">Tipi Consenso (Tutti)</option>
                <option value="privacy">Privacy (GDPR)</option>
                <option value="health_data">Dati Sanitari</option>
                <option value="photo_video">Liberatoria Foto/Video</option>
                <option value="marketing">Marketing</option>
                <option value="liability_waiver">Manleva</option>
                <option value="other">Altro</option>
              </select>

              <select
                value={filterConsentStatus}
                onChange={e => setFilterConsentStatus(e.target.value as any)}
                className="px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              >
                <option value="all">Stati (Tutti)</option>
                <option value="granted">Accordati</option>
                <option value="revoked">Revocati</option>
                <option value="pending">In Attesa</option>
                <option value="expired">Scaduti</option>
              </select>
            </div>
          </div>

          {/* Grid Consensi */}
          {filteredConsents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl shadow-xl">
              <div className="w-16 h-16 rounded-3xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-4 text-slate-500 shadow-inner">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Nessun consenso registrato</h3>
              <p className="text-slate-400 max-w-md mx-auto text-xs">
                Non risultano consensi o liberatorie registrate corrispondenti ai filtri impostati.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredConsents.map(c => {
                const st = consentStatusBadges[c.status] || { label: c.status, color: 'text-slate-400 bg-slate-800 border-slate-700' };

                return (
                  <div
                    key={c.id}
                    className={`flex flex-col justify-between bg-[var(--color-panel)] border rounded-2xl shadow-xl p-5 space-y-4 ${
                      c.status === 'revoked' ? 'border-red-900/50 bg-red-950/10' : 'border-[var(--color-panel-border)]'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${st.color}`}>
                          {st.label}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">Reg. da: {c.registeredBy}</span>
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                          <User className="w-4 h-4 text-slate-400" /> {c.athleteName}
                        </h3>
                        <p className="text-xs font-semibold text-[var(--color-primary)] mt-0.5">
                          {consentTypeLabels[c.consentType]}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1 text-xs">
                        <div className="flex justify-between items-center text-slate-300">
                          <span>Data Concessione:</span>
                          <strong className="text-white">{formatDate(c.grantDate)}</strong>
                        </div>
                        {c.documentTitle && (
                          <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                            Doc. Allegato: <strong className="text-slate-200">{c.documentTitle}</strong>
                          </div>
                        )}
                      </div>

                      {c.status === 'revoked' && (
                        <div className="p-3 rounded-xl bg-red-950/30 border border-red-900/50 space-y-1 text-xs text-red-300">
                          <div className="font-bold flex items-center gap-1 text-red-400">
                            <XCircle className="w-3.5 h-3.5" /> Revocato il: {formatDate(c.revocationDate)}
                          </div>
                          {c.revocationReason && <p className="italic text-[11px]">{c.revocationReason}</p>}
                        </div>
                      )}

                      {c.notes && <p className="text-xs text-slate-400 italic line-clamp-2">{c.notes}</p>}
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                      {c.status === 'granted' ? (
                        <button
                          onClick={() => { setEditingConsent(c); setConsentModalMode('revoke'); setIsConsentModalOpen(true); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/40 text-xs font-bold hover:bg-red-500 hover:text-white transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Revoca Consenso
                        </button>
                      ) : (
                        <span className="text-xs text-slate-500 italic">Stato immutabile</span>
                      )}

                      <button
                        onClick={() => setDeleteModal({ open: true, type: 'consent', id: c.id })}
                        className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 transition-colors"
                        title="Elimina Registrazione"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modali Documenti */}
      <DocumentModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        onSave={handleSaveDoc}
        editingDocument={editingDocument}
      />

      {/* Modali Consensi */}
      <ConsentModal
        isOpen={isConsentModalOpen}
        onClose={() => setIsConsentModalOpen(false)}
        onSave={handleRegisterConsent}
        onRevoke={handleRevokeConsent}
        editingConsent={editingConsent}
        mode={consentModalMode}
      />

      {/* Modale Conferma Eliminazione */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setDeleteModal({ open: false, type: 'doc', id: null })} />
          <div className="relative w-full max-w-sm bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4 text-red-500">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">
                Eliminare {deleteModal.type === 'doc' ? 'Documento' : 'Registrazione Consenso'}?
              </h3>
            </div>
            <p className="text-sm text-slate-400 mb-6">Sei sicuro di voler procedere con l'eliminazione definitiva?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteModal({ open: false, type: 'doc', id: null })}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleDeleteItem}
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
