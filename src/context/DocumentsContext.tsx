import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AthleteDocument, AthleteDocumentFormData, AthleteConsent, AthleteConsentFormData, ConsentStatus } from '../types';
import { STORAGE_KEYS } from '../config/storageKeys';
import { getStorageItem, setStorageItem } from '../lib/storage';
import { getLocalOwnerProfile } from '../lib/ownerProfile';
import { useAthletes } from './AthletesContext';

interface SaveResult {
  success: boolean;
  document?: AthleteDocument;
  error?: string;
}

interface DocumentsContextType {
  documents: AthleteDocument[];
  consents: AthleteConsent[];
  isLoading: boolean;
  saveLocalDocument: (data: AthleteDocumentFormData) => SaveResult;
  updateDocument: (id: string, updates: Partial<AthleteDocument>) => SaveResult;
  deleteDocument: (id: string) => boolean;
  registerConsent: (data: AthleteConsentFormData) => AthleteConsent;
  revokeConsent: (consentId: string, reason: string, revocationDate?: string) => boolean;
  updateConsent: (id: string, updates: Partial<AthleteConsent>) => boolean;
  deleteConsent: (id: string) => boolean;
}

const DocumentsContext = createContext<DocumentsContextType | undefined>(undefined);

const sampleDataUrlPdf = 'data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsOfCjEgMCBvYmoKPDwvTGVuZ3RoIDQyPj5zdHJlYW0KQlQKL0YxIDEyIFRmcjAgMCBUZCAoRG9jdW1lbnRvIERpbW9zdHJhdGl2byBCdWlsZGVyIEF0aGxldGUpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoK';

const buildDemoDocuments = (ownerName: string): AthleteDocument[] => {
  const now = new Date();
  const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  return [
    {
      id: `doc-demo-1`,
      title: 'Certificato Medico Agonistico 2026',
      category: 'medical_certificate',
      visibility: 'shared_with_athlete',
      athleteId: 'athlete-demo-01',
      athleteName: 'Marco Bianchi',
      expiryDate: nextMonth,
      file: {
        fileName: 'certificato_medico_marco_bianchi.pdf',
        fileSize: 45056,
        fileType: 'application/pdf',
        dataUrl: sampleDataUrlPdf,
      },
      notes: 'Rilasciato dal Centro Medicina dello Sport.',
      uploadedBy: ownerName,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: `doc-demo-2`,
      title: 'Modulo Privacy e Consenso Trattamento',
      category: 'privacy_consent',
      visibility: 'private',
      athleteId: 'athlete-demo-02',
      athleteName: 'Giulia Esposito',
      file: {
        fileName: 'consenso_privacy_giulia_esposito.pdf',
        fileSize: 32768,
        fileType: 'application/pdf',
        dataUrl: sampleDataUrlPdf,
      },
      notes: 'Firmato in data iscrizione.',
      uploadedBy: ownerName,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
  ];
};

const buildDemoConsents = (ownerName: string): AthleteConsent[] => {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  return [
    {
      id: `consent-demo-1`,
      athleteId: 'athlete-demo-01',
      athleteName: 'Marco Bianchi',
      consentType: 'privacy',
      status: 'granted',
      grantDate: today,
      documentId: 'doc-demo-1',
      documentTitle: 'Certificato Medico Agonistico 2026',
      notes: 'Consenso privacy generale registrato al momento del tesseramento.',
      registeredBy: ownerName,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: `consent-demo-2`,
      athleteId: 'athlete-demo-02',
      athleteName: 'Giulia Esposito',
      consentType: 'photo_video',
      status: 'granted',
      grantDate: today,
      documentId: 'doc-demo-2',
      documentTitle: 'Modulo Privacy e Consenso Trattamento',
      notes: 'Autorizzazione pubblicazione foto social di squadra.',
      registeredBy: ownerName,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
  ];
};

export const DocumentsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [documents, setDocuments] = useState<AthleteDocument[]>([]);
  const [consents, setConsents] = useState<AthleteConsent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { addTimelineEvent } = useAthletes();

  useEffect(() => {
    const owner = getLocalOwnerProfile();
    const ownerName = owner?.fullName || 'Proprietario Demo';
    const savedDocs = getStorageItem<AthleteDocument[]>(STORAGE_KEYS.DOCUMENTS, []);
    const savedConsents = getStorageItem<AthleteConsent[]>(STORAGE_KEYS.CONSENTS, []);

    if (savedDocs.length === 0) {
      const demoDocs = buildDemoDocuments(ownerName);
      try { setStorageItem(STORAGE_KEYS.DOCUMENTS, demoDocs); } catch { /* quota ignore */ }
      setDocuments(demoDocs);
    } else {
      setDocuments(savedDocs);
    }

    if (savedConsents.length === 0) {
      const demoConsents = buildDemoConsents(ownerName);
      try { setStorageItem(STORAGE_KEYS.CONSENTS, demoConsents); } catch { /* quota ignore */ }
      setConsents(demoConsents);
    } else {
      setConsents(savedConsents);
    }

    setIsLoading(false);
  }, []);

  const saveDocsToStorage = useCallback((data: AthleteDocument[]): boolean => {
    try {
      setStorageItem(STORAGE_KEYS.DOCUMENTS, data);
      setDocuments(data);
      return true;
    } catch (err: unknown) {
      console.error('Errore salvataggio documenti:', err);
      return false;
    }
  }, []);

  const saveConsentsToStorage = useCallback((data: AthleteConsent[]): boolean => {
    try {
      setStorageItem(STORAGE_KEYS.CONSENTS, data);
      setConsents(data);
      return true;
    } catch (err: unknown) {
      console.error('Errore salvataggio consensi:', err);
      return false;
    }
  }, []);

  const saveLocalDocument = useCallback((data: AthleteDocumentFormData): SaveResult => {
    const nowIso = new Date().toISOString();
    const owner = getLocalOwnerProfile();

    const newDoc: AthleteDocument = {
      ...data,
      id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      uploadedBy: data.uploadedBy || owner?.fullName || 'Proprietario Demo',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const updated = [newDoc, ...documents];
    const success = saveDocsToStorage(updated);

    if (!success) {
      return {
        success: false,
        error: 'Memoria locale insufficiente nel browser. Eliminare documenti datati prima di aggiungere nuovi file.',
      };
    }

    if (newDoc.athleteId) {
      addTimelineEvent(
        newDoc.athleteId,
        'other',
        'Documento Caricato',
        `Caricato documento locale: "${newDoc.title}" (${newDoc.file.fileName})`
      );
    }

    return { success: true, document: newDoc };
  }, [documents, saveDocsToStorage, addTimelineEvent]);

  const updateDocument = useCallback((id: string, updates: Partial<AthleteDocument>): SaveResult => {
    const nowIso = new Date().toISOString();
    let found = false;

    const updated = documents.map(doc => {
      if (doc.id === id) {
        found = true;
        return { ...doc, ...updates, updatedAt: nowIso };
      }
      return doc;
    });

    if (!found) return { success: false, error: 'Documento non trovato.' };

    const success = saveDocsToStorage(updated);
    if (!success) return { success: false, error: 'Memoria locale insufficiente.' };

    return { success: true };
  }, [documents, saveDocsToStorage]);

  const deleteDocument = useCallback((id: string): boolean => {
    const updated = documents.filter(doc => doc.id !== id);
    if (updated.length !== documents.length) {
      return saveDocsToStorage(updated);
    }
    return false;
  }, [documents, saveDocsToStorage]);

  const registerConsent = useCallback((data: AthleteConsentFormData): AthleteConsent => {
    const nowIso = new Date().toISOString();
    const owner = getLocalOwnerProfile();

    const newConsent: AthleteConsent = {
      ...data,
      id: `consent-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      registeredBy: data.registeredBy || owner?.fullName || 'Proprietario Demo',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const updated = [newConsent, ...consents];
    saveConsentsToStorage(updated);

    if (newConsent.athleteId) {
      addTimelineEvent(
        newConsent.athleteId,
        'other',
        'Consenso Registrato',
        `Registrato consenso [${newConsent.consentType}] in data ${newConsent.grantDate}`
      );
    }

    return newConsent;
  }, [consents, saveConsentsToStorage, addTimelineEvent]);

  const revokeConsent = useCallback((consentId: string, reason: string, revocationDate?: string): boolean => {
    const nowIso = new Date().toISOString();
    const revDate = revocationDate || nowIso.slice(0, 10);
    let target: AthleteConsent | undefined;

    const updated = consents.map(c => {
      if (c.id === consentId) {
        target = {
          ...c,
          status: 'revoked' as ConsentStatus,
          revocationDate: revDate,
          revocationReason: reason,
          updatedAt: nowIso,
        };
        return target;
      }
      return c;
    });

    if (target) {
      saveConsentsToStorage(updated);

      if (target.athleteId) {
        addTimelineEvent(
          target.athleteId,
          'other',
          'Consenso Revocato',
          `Revocato consenso [${target.consentType}]. Motivazione: ${reason}`
        );
      }
      return true;
    }
    return false;
  }, [consents, saveConsentsToStorage, addTimelineEvent]);

  const updateConsent = useCallback((id: string, updates: Partial<AthleteConsent>): boolean => {
    const nowIso = new Date().toISOString();
    let found = false;

    const updated = consents.map(c => {
      if (c.id === id) {
        found = true;
        return { ...c, ...updates, updatedAt: nowIso };
      }
      return c;
    });

    if (found) return saveConsentsToStorage(updated);
    return false;
  }, [consents, saveConsentsToStorage]);

  const deleteConsent = useCallback((id: string): boolean => {
    const updated = consents.filter(c => c.id !== id);
    if (updated.length !== consents.length) {
      return saveConsentsToStorage(updated);
    }
    return false;
  }, [consents, saveConsentsToStorage]);

  return (
    <DocumentsContext.Provider
      value={{
        documents,
        consents,
        isLoading,
        saveLocalDocument,
        updateDocument,
        deleteDocument,
        registerConsent,
        revokeConsent,
        updateConsent,
        deleteConsent,
      }}
    >
      {children}
    </DocumentsContext.Provider>
  );
};

export const useDocuments = (): DocumentsContextType => {
  const ctx = useContext(DocumentsContext);
  if (!ctx) {
    throw new Error('useDocuments deve essere usato all\'interno di un DocumentsProvider');
  }
  return ctx;
};
