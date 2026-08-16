import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CommunicationLog, CommunicationLogFormData, MessageTemplate, ApiIntegrationConfig } from '../types';
import { STORAGE_KEYS } from '../config/storageKeys';
import { getStorageItem, setStorageItem } from '../lib/storage';
import { getLocalOwnerProfile } from '../lib/ownerProfile';
import { useAthletes } from './AthletesContext';

interface CommunicationsContextType {
  communications: CommunicationLog[];
  templates: MessageTemplate[];
  apiConfig: ApiIntegrationConfig;
  isLoading: boolean;
  logCommunication: (data: CommunicationLogFormData) => CommunicationLog;
  updateCommunication: (id: string, updates: Partial<CommunicationLog>) => boolean;
  deleteCommunication: (id: string) => boolean;
  saveTemplate: (template: Omit<MessageTemplate, 'id' | 'createdAt'> & { id?: string }) => MessageTemplate;
  deleteTemplate: (id: string) => boolean;
  saveApiConfig: (config: ApiIntegrationConfig) => boolean;
  compileTemplate: (templateBody: string, variables: Record<string, string>) => string;
  openWhatsApp: (phone: string, text: string) => void;
  openTelegram: (text: string) => void;
  openMailto: (email: string, subject: string, body: string) => void;
}

const CommunicationsContext = createContext<CommunicationsContextType | undefined>(undefined);

const defaultApiConfig: ApiIntegrationConfig = {
  whatsappEnabled: false,
  whatsappToken: 'DEMO_WHATSAPP_TOKEN_SIMULATO',
  telegramEnabled: false,
  telegramToken: 'DEMO_TELEGRAM_TOKEN_SIMULATO',
  smtpEnabled: false,
  smtpHost: 'smtp.demo.builderathlete.local',
  smtpSender: 'demo@builderathlete.local',
  webhookEnabled: false,
  webhookUrl: 'https://demo.builderathlete.local/webhook-simulato',
  webhookSecret: 'DEMO_WEBHOOK_SECRET_SIMULATO',
  notes: 'Configurazione dimostrativa locale disattivata per impostazione predefinita.',
};

const defaultTemplates: MessageTemplate[] = [
  {
    id: 'tpl-1',
    title: 'Sollecito Scadenza Pagamento',
    category: 'Pagamenti',
    subject: 'Promemoria Scadenza Rata',
    body: 'Ciao {{nome_atleta}}, ti ricordiamo che la rata di {{importo}} per la tua iscrizione in palestra scade il {{data_scadenza}}. Cordiali saluti, {{nome_proprietario}}.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tpl-2',
    title: 'Proposta Rinnovo Abbonamento',
    category: 'Rinnovi',
    subject: 'Il tuo abbonamento sta per terminare',
    body: 'Ciao {{nome_atleta}}, il tuo abbonamento scadrà il {{data_scadenza}}. Abbiamo preparato un pacchetto di rinnovo speciale per te! Ti aspettiamo per parlarne.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tpl-3',
    title: 'Richiesta Certificato Medico',
    category: 'Certificati',
    subject: 'Aggiornamento Certificato Medico',
    body: 'Ciao {{nome_atleta}}, ti ricordiamo che il tuo certificato medico risulta in scadenza il {{data_scadenza}}. Ti preghiamo di consegnare il nuovo certificato aggiornato.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tpl-4',
    title: 'Promemoria Check-in / Attività',
    category: 'Check-in',
    subject: 'Promemoria appuntamento',
    body: 'Ciao {{nome_atleta}}, ti ricordiamo l\'attività "{{nome_attivita}}" prevista per il {{data_scadenza}}. A presto!',
    createdAt: new Date().toISOString(),
  },
];

export const CommunicationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [communications, setCommunications] = useState<CommunicationLog[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [apiConfig, setApiConfig] = useState<ApiIntegrationConfig>(defaultApiConfig);
  const [isLoading, setIsLoading] = useState(true);

  const { addTimelineEvent } = useAthletes();

  useEffect(() => {
    const savedComms = getStorageItem<CommunicationLog[]>(STORAGE_KEYS.COMMUNICATIONS, []);
    const savedTpls = getStorageItem<MessageTemplate[]>(STORAGE_KEYS.MESSAGE_TEMPLATES, []);
    const savedApiConfig = getStorageItem<ApiIntegrationConfig | null>(STORAGE_KEYS.DEMO_API_CONFIG, null);

    // Filtra e bonifica eventuali residui demo (Marco Bianchi / Giulia Esposito)
    const cleanComms = savedComms.filter(c => 
      !c.id?.startsWith('comm-demo-') &&
      !c.athleteId?.startsWith('athlete-demo-') &&
      c.athleteName !== 'Marco Bianchi' &&
      c.athleteName !== 'Giulia Esposito'
    );

    setCommunications(cleanComms);
    try { setStorageItem(STORAGE_KEYS.COMMUNICATIONS, cleanComms); } catch { /* quota ignore */ }

    if (savedTpls.length === 0) {
      try { setStorageItem(STORAGE_KEYS.MESSAGE_TEMPLATES, defaultTemplates); } catch { /* quota ignore */ }
      setTemplates(defaultTemplates);
    } else {
      setTemplates(savedTpls);
    }

    if (!savedApiConfig) {
      try { setStorageItem(STORAGE_KEYS.DEMO_API_CONFIG, defaultApiConfig); } catch { /* quota ignore */ }
      setApiConfig(defaultApiConfig);
    } else {
      setApiConfig({ ...defaultApiConfig, ...savedApiConfig });
    }

    setIsLoading(false);
  }, []);

  const saveCommsToStorage = useCallback((data: CommunicationLog[]): boolean => {
    try {
      setStorageItem(STORAGE_KEYS.COMMUNICATIONS, data);
      setCommunications(data);
      return true;
    } catch (err) {
      console.error('Errore salvataggio comunicazioni:', err);
      return false;
    }
  }, []);

  const saveTplsToStorage = useCallback((data: MessageTemplate[]): boolean => {
    try {
      setStorageItem(STORAGE_KEYS.MESSAGE_TEMPLATES, data);
      setTemplates(data);
      return true;
    } catch (err) {
      console.error('Errore salvataggio modelli messaggio:', err);
      return false;
    }
  }, []);

  const saveApiConfig = useCallback((config: ApiIntegrationConfig): boolean => {
    try {
      setStorageItem(STORAGE_KEYS.DEMO_API_CONFIG, config);
      setApiConfig(config);
      return true;
    } catch (err) {
      console.error('Errore salvataggio configurazione API demo:', err);
      return false;
    }
  }, []);

  const compileTemplate = useCallback((templateBody: string, variables: Record<string, string>): string => {
    let compiled = templateBody;
    const owner = getLocalOwnerProfile();
    const defaultVars: Record<string, string> = {
      nome_proprietario: owner?.fullName || 'Builder Athlete Manager',
      ...variables,
    };

    Object.entries(defaultVars).forEach(([key, val]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
      compiled = compiled.replace(regex, val || '');
    });

    return compiled;
  }, []);

  const logCommunication = useCallback((data: CommunicationLogFormData): CommunicationLog => {
    const nowIso = new Date().toISOString();
    const owner = getLocalOwnerProfile();

    const newLog: CommunicationLog = {
      ...data,
      id: `comm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      author: data.author || owner?.fullName || 'Proprietario Demo',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const updated = [newLog, ...communications];
    saveCommsToStorage(updated);

    if (newLog.athleteId) {
      addTimelineEvent(
        newLog.athleteId,
        'communication',
        `Contatto (${newLog.channel.toUpperCase()})`,
        `${newLog.subject} - Esito: ${newLog.outcome}`
      );
    }

    return newLog;
  }, [communications, saveCommsToStorage, addTimelineEvent]);

  const updateCommunication = useCallback((id: string, updates: Partial<CommunicationLog>): boolean => {
    const nowIso = new Date().toISOString();
    let found = false;

    const updated = communications.map(c => {
      if (c.id === id) {
        found = true;
        return { ...c, ...updates, updatedAt: nowIso };
      }
      return c;
    });

    if (found) return saveCommsToStorage(updated);
    return false;
  }, [communications, saveCommsToStorage]);

  const deleteCommunication = useCallback((id: string): boolean => {
    const updated = communications.filter(c => c.id !== id);
    if (updated.length !== communications.length) {
      return saveCommsToStorage(updated);
    }
    return false;
  }, [communications, saveCommsToStorage]);

  const saveTemplate = useCallback((tplData: Omit<MessageTemplate, 'id' | 'createdAt'> & { id?: string }): MessageTemplate => {
    const nowIso = new Date().toISOString();

    if (tplData.id) {
      const updated = templates.map(t => t.id === tplData.id ? { ...t, ...tplData } : t);
      saveTplsToStorage(updated);
      return updated.find(t => t.id === tplData.id)!;
    }

    const newTpl: MessageTemplate = {
      ...tplData,
      id: `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: nowIso,
    };

    const updated = [newTpl, ...templates];
    saveTplsToStorage(updated);
    return newTpl;
  }, [templates, saveTplsToStorage]);

  const deleteTemplate = useCallback((id: string): boolean => {
    const updated = templates.filter(t => t.id !== id);
    if (updated.length !== templates.length) {
      return saveTplsToStorage(updated);
    }
    return false;
  }, [templates, saveTplsToStorage]);

  const openWhatsApp = useCallback((phone: string, text: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const encodedText = encodeURIComponent(text);
    const targetUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodedText}`
      : `https://api.whatsapp.com/send?text=${encodedText}`;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  }, []);

  const openTelegram = useCallback((text: string) => {
    const encodedText = encodeURIComponent(text);
    const targetUrl = `https://t.me/share/url?url=&text=${encodedText}`;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  }, []);

  const openMailto = useCallback((email: string, subject: string, body: string) => {
    const mailtoUrl = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  }, []);

  return (
    <CommunicationsContext.Provider
      value={{
        communications,
        templates,
        apiConfig,
        isLoading,
        logCommunication,
        updateCommunication,
        deleteCommunication,
        saveTemplate,
        deleteTemplate,
        saveApiConfig,
        compileTemplate,
        openWhatsApp,
        openTelegram,
        openMailto,
      }}
    >
      {children}
    </CommunicationsContext.Provider>
  );
};

export const useCommunications = (): CommunicationsContextType => {
  const ctx = useContext(CommunicationsContext);
  if (!ctx) {
    throw new Error('useCommunications deve essere usato all\'interno di un CommunicationsProvider');
  }
  return ctx;
};
