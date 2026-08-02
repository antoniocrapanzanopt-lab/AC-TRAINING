import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, AlertTriangle, Calendar, User, FileText, XCircle } from 'lucide-react';
import { AthleteConsent, AthleteConsentFormData, ConsentType, ConsentStatus } from '../../types';
import { useAthletes } from '../../context/AthletesContext';
import { useDocuments } from '../../context/DocumentsContext';
import { getLocalOwnerProfile } from '../../lib/ownerProfile';

interface ConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AthleteConsentFormData) => void;
  onRevoke: (consentId: string, reason: string, revocationDate?: string) => void;
  editingConsent: AthleteConsent | null;
  mode: 'register' | 'revoke';
}

export const ConsentModal: React.FC<ConsentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onRevoke,
  editingConsent,
  mode,
}) => {
  const { athletes } = useAthletes();
  const { documents } = useDocuments();
  const owner = getLocalOwnerProfile();

  const [athleteId, setAthleteId] = useState('');
  const [consentType, setConsentType] = useState<ConsentType>('privacy');
  const [status, setStatus] = useState<ConsentStatus>('granted');
  const [grantDate, setGrantDate] = useState(new Date().toISOString().slice(0, 10));
  const [documentId, setDocumentId] = useState('');
  const [notes, setNotes] = useState('');

  const [revocationDate, setRevocationDate] = useState(new Date().toISOString().slice(0, 10));
  const [revocationReason, setRevocationReason] = useState('');

  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    if (editingConsent) {
      setAthleteId(editingConsent.athleteId);
      setConsentType(editingConsent.consentType);
      setStatus(editingConsent.status);
      setGrantDate(editingConsent.grantDate);
      setDocumentId(editingConsent.documentId || '');
      setNotes(editingConsent.notes || '');
      setRevocationDate(new Date().toISOString().slice(0, 10));
      setRevocationReason(editingConsent.revocationReason || '');
    } else {
      setAthleteId(athletes.length > 0 ? athletes[0].id : '');
      setConsentType('privacy');
      setStatus('granted');
      setGrantDate(new Date().toISOString().slice(0, 10));
      setDocumentId('');
      setNotes('');
      setRevocationDate(new Date().toISOString().slice(0, 10));
      setRevocationReason('');
    }
    setErrors([]);
  }, [isOpen, editingConsent, athletes]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: string[] = [];

    if (mode === 'revoke') {
      if (!editingConsent) return;
      if (!revocationReason.trim()) errs.push('La motivazione della revoca è obbligatoria.');
      if (errs.length > 0) {
        setErrors(errs);
        return;
      }
      onRevoke(editingConsent.id, revocationReason, revocationDate);
      onClose();
      return;
    }

    if (!athleteId) errs.push('Seleziona l\'atleta.');
    if (!grantDate) errs.push('La data di registrazione del consenso è obbligatoria.');

    if (errs.length > 0) {
      setErrors(errs);
      return;
    }

    const selectedAthlete = athletes.find(a => a.id === athleteId);
    const selectedDoc = documents.find(d => d.id === documentId);

    const formData: AthleteConsentFormData = {
      athleteId,
      athleteName: selectedAthlete ? selectedAthlete.fullName : 'Atleta Sconosciuto',
      consentType,
      status,
      grantDate,
      documentId: documentId || undefined,
      documentTitle: selectedDoc ? selectedDoc.title : undefined,
      notes,
      registeredBy: owner?.fullName || 'Proprietario Demo',
    };

    onSave(formData);
    onClose();
  };

  const inputCls = "w-full px-3 py-2 rounded-xl bg-slate-950 border border-[var(--color-panel-border)] text-white text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-slate-600";
  const labelCls = "block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl shadow-2xl flex flex-col my-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-panel-border)] shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              mode === 'revoke' ? 'bg-red-500/10 border border-red-500/30 text-red-400' : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
            }`}>
              {mode === 'revoke' ? <XCircle className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {mode === 'revoke' ? 'Revoca Consenso Atleta' : 'Registra Consenso / Liberatoria'}
              </h2>
              <p className="text-xs text-slate-400">Tracciamento dimostrativo consensi privacy</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form id="consent-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {errors.length > 0 && (
            <div className="p-4 rounded-xl bg-red-950/30 border border-red-900/50 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-400">Attenzione:</p>
                <ul className="text-xs text-red-300 list-disc list-inside mt-1">
                  {errors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            </div>
          )}

          {mode === 'revoke' ? (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
                Stai revocando il consenso di tipo <strong className="text-white uppercase">{editingConsent?.consentType}</strong> fornito da <strong className="text-white">{editingConsent?.athleteName}</strong>.
              </div>

              <div>
                <label className={labelCls}>Data Revoca *</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="date"
                    value={revocationDate}
                    onChange={e => setRevocationDate(e.target.value)}
                    className={`${inputCls} pl-9`}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Motivazione della Revoca *</label>
                <textarea
                  value={revocationReason}
                  onChange={e => setRevocationReason(e.target.value)}
                  className={`${inputCls} resize-none`}
                  rows={3}
                  placeholder="Inserisci i dettagli ed il motivo della richiesta di revoca..."
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Atleta *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <select
                    value={athleteId}
                    onChange={e => setAthleteId(e.target.value)}
                    className={`${inputCls} pl-9`}
                  >
                    <option value="">-- Seleziona Atleta --</option>
                    {athletes.map(a => (
                      <option key={a.id} value={a.id}>{a.fullName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Tipo Consenso *</label>
                  <select
                    value={consentType}
                    onChange={e => setConsentType(e.target.value as ConsentType)}
                    className={inputCls}
                  >
                    <option value="privacy">Privacy (GDPR)</option>
                    <option value="health_data">Dati Sanitari / Certificato</option>
                    <option value="photo_video">Liberatoria Foto e Video</option>
                    <option value="marketing">Marketing e Comunicazioni</option>
                    <option value="liability_waiver">Manleva / Responsabilità</option>
                    <option value="other">Altro Consenso</option>
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Stato *</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as ConsentStatus)}
                    className={inputCls}
                  >
                    <option value="granted">Accordato / Concesso</option>
                    <option value="pending">In Attesa</option>
                    <option value="expired">Scaduto</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Data Concessione *</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="date"
                      value={grantDate}
                      onChange={e => setGrantDate(e.target.value)}
                      className={`${inputCls} pl-9`}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Documento Collegato (Opzionale)</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <select
                      value={documentId}
                      onChange={e => setDocumentId(e.target.value)}
                      className={`${inputCls} pl-9`}
                    >
                      <option value="">-- Nessun file allegato --</option>
                      {documents.filter(d => !athleteId || d.athleteId === athleteId).map(d => (
                        <option key={d.id} value={d.id}>{d.title}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className={labelCls}>Note e Note di Tracciabilità</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className={`${inputCls} resize-none`}
                  rows={2}
                  placeholder="Dettagli sulla registrazione del consenso..."
                />
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--color-panel-border)] bg-slate-900/30 flex items-center justify-end gap-3 shrink-0 rounded-b-2xl">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors">
            Annulla
          </button>
          <button
            type="submit"
            form="consent-form"
            className={`px-6 py-2 rounded-xl text-xs font-black transition-colors shadow-lg ${
              mode === 'revoke'
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-emerald-500 hover:bg-emerald-400 text-black'
            }`}
          >
            {mode === 'revoke' ? 'Conferma Revoca' : 'Salva Consenso'}
          </button>
        </div>
      </div>
    </div>
  );
};
