import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { InboxEntry, InstagramContent, CoachTask } from '../types/inboxAndContent';
import {
  getInboxEntries,
  createAndProcessInboxEntry,
  reprocessInboxEntry,
  updateInboxEntryStatus,
  deleteInboxEntry,
  linkAthleteToInboxEntry,
} from '../services/inboxService';
import {
  convertInboxToContent,
  convertInboxToTask,
} from '../services/inboxConverterService';
import { useToast } from './ToastContext';

interface InboxContextType {
  entries: InboxEntry[];
  isLoading: boolean;
  isProcessing: boolean;
  unprocessedCount: number;
  addEntry: (rawContent: string, autoProcess?: boolean) => Promise<InboxEntry>;
  reprocess: (entry: InboxEntry) => Promise<void>;
  archiveEntry: (id: string) => Promise<void>;
  deleteEntryById: (id: string) => Promise<void>;
  linkAthlete: (entryId: string, athleteId: string | null) => Promise<void>;
  convertToContentAction: (entry: InboxEntry, overrides?: any) => Promise<InstagramContent>;
  convertToTaskAction: (entry: InboxEntry, taskTitle: string, dueDate?: string) => Promise<CoachTask>;
  refreshEntries: () => Promise<void>;
}

const InboxContext = createContext<InboxContextType | undefined>(undefined);

export const InboxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [entries, setEntries] = useState<InboxEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const { showSuccess, showError } = useToast();

  const fetchEntries = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getInboxEntries();
      setEntries(data);
    } catch (err: any) {
      console.error('Errore caricamento Inbox:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const addEntry = async (rawContent: string, autoProcess: boolean = true): Promise<InboxEntry> => {
    try {
      setIsProcessing(true);
      const newEntry = await createAndProcessInboxEntry(rawContent, autoProcess);
      setEntries((prev) => [newEntry, ...prev.filter((e) => e.id !== newEntry.id)]);
      showSuccess(autoProcess ? 'Pensiero organizzato con Gemini AI!' : 'Pensiero salvato nella Inbox.');
      return newEntry;
    } catch (err: any) {
      showError(err.message || 'Errore durante la creazione.');
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  const reprocess = async (entry: InboxEntry): Promise<void> => {
    try {
      setIsProcessing(true);
      const updated = await reprocessInboxEntry(entry);
      setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      showSuccess('Entry rielaborata con Gemini AI!');
    } catch (err: any) {
      showError(err.message || 'Errore rielaborazione.');
    } finally {
      setIsProcessing(false);
    }
  };

  const archiveEntry = async (id: string): Promise<void> => {
    try {
      await updateInboxEntryStatus(id, 'archived');
      setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, status: 'archived' } : e)));
      showSuccess('Entry archiviata.');
    } catch (err: any) {
      showError(err.message || 'Errore archiviazione.');
    }
  };

  const deleteEntryById = async (id: string): Promise<void> => {
    try {
      await deleteInboxEntry(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
      showSuccess('Entry eliminata.');
    } catch (err: any) {
      showError(err.message || 'Errore eliminazione.');
    }
  };

  const linkAthlete = async (entryId: string, athleteId: string | null): Promise<void> => {
    try {
      await linkAthleteToInboxEntry(entryId, athleteId);
      setEntries((prev) =>
        prev.map((e) => (e.id === entryId ? { ...e, related_athlete_id: athleteId } : e))
      );
      showSuccess(athleteId ? 'Atleta collegato.' : 'Collegamento atleta rimosso.');
    } catch (err: any) {
      showError(err.message || 'Errore collegamento atleta.');
    }
  };

  const convertToContentAction = async (
    entry: InboxEntry,
    overrides?: any
  ): Promise<InstagramContent> => {
    try {
      const content = await convertInboxToContent(entry, overrides);
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entry.id
            ? { ...e, status: 'converted_content', converted_content_id: content.id }
            : e
        )
      );
      showSuccess('Idea convertita in Contenuto Instagram!');
      return content;
    } catch (err: any) {
      showError(err.message || 'Errore conversione contenuto.');
      throw err;
    }
  };

  const convertToTaskAction = async (
    entry: InboxEntry,
    taskTitle: string,
    dueDate?: string
  ): Promise<CoachTask> => {
    try {
      const task = await convertInboxToTask(entry, taskTitle, dueDate);
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entry.id
            ? { ...e, status: 'converted_task', converted_task_id: task.id }
            : e
        )
      );
      showSuccess('Task operativa creata con successo!');
      return task;
    } catch (err: any) {
      showError(err.message || 'Errore conversione task.');
      throw err;
    }
  };

  const unprocessedCount = entries.filter((e) => e.status === 'raw' || e.status === 'processed').length;

  return (
    <InboxContext.Provider
      value={{
        entries,
        isLoading,
        isProcessing,
        unprocessedCount,
        addEntry,
        reprocess,
        archiveEntry,
        deleteEntryById,
        linkAthlete,
        convertToContentAction,
        convertToTaskAction,
        refreshEntries: fetchEntries,
      }}
    >
      {children}
    </InboxContext.Provider>
  );
};

export const useInbox = (): InboxContextType => {
  const context = useContext(InboxContext);
  if (!context) {
    throw new Error('useInbox must be used within an InboxProvider');
  }
  return context;
};
