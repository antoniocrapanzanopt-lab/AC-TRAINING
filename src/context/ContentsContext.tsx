import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { InstagramContent, ContentStatus } from '../types/inboxAndContent';
import {
  getInstagramContents,
  createInstagramContent,
  updateInstagramContent,
  updateContentStatus,
  deleteInstagramContent,
} from '../services/contentsService';
import { useToast } from './ToastContext';

interface ContentsContextType {
  contents: InstagramContent[];
  isLoading: boolean;
  createContent: (payload: Partial<InstagramContent>) => Promise<InstagramContent>;
  updateContent: (id: string, updates: Partial<InstagramContent>) => Promise<InstagramContent>;
  moveStatus: (id: string, newStatus: ContentStatus) => Promise<void>;
  deleteContentById: (id: string) => Promise<void>;
  refreshContents: () => Promise<void>;
  ideasCount: number;
  readyToRecordCount: number;
  readyToPublishCount: number;
  publishedCount: number;
}

const ContentsContext = createContext<ContentsContextType | undefined>(undefined);

export const ContentsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [contents, setContents] = useState<InstagramContent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { showSuccess, showError } = useToast();

  const fetchContents = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getInstagramContents();
      setContents(data);
    } catch (err: any) {
      console.error('Errore caricamento Instagram contents:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContents();
  }, [fetchContents]);

  const createContent = async (payload: Partial<InstagramContent>): Promise<InstagramContent> => {
    try {
      const newContent = await createInstagramContent(payload);
      setContents((prev) => [newContent, ...prev]);
      showSuccess('Nuovo contenuto aggiunto alla Pipeline!');
      return newContent;
    } catch (err: any) {
      showError(err.message || 'Errore creazione contenuto.');
      throw err;
    }
  };

  const updateContent = async (
    id: string,
    updates: Partial<InstagramContent>
  ): Promise<InstagramContent> => {
    try {
      const updated = await updateInstagramContent(id, updates);
      setContents((prev) => prev.map((c) => (c.id === id ? updated : c)));
      showSuccess('Contenuto aggiornato.');
      return updated;
    } catch (err: any) {
      showError(err.message || 'Errore aggiornamento.');
      throw err;
    }
  };

  const moveStatus = async (id: string, newStatus: ContentStatus): Promise<void> => {
    // Aggiornamento ottimistico
    setContents((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
    );
    try {
      await updateContentStatus(id, newStatus);
    } catch (err: any) {
      showError(err.message || 'Errore spostamento stato.');
      fetchContents(); // rollback in caso di errore
    }
  };

  const deleteContentById = async (id: string): Promise<void> => {
    try {
      await deleteInstagramContent(id);
      setContents((prev) => prev.filter((c) => c.id !== id));
      showSuccess('Contenuto eliminato.');
    } catch (err: any) {
      showError(err.message || 'Errore eliminazione.');
    }
  };

  const ideasCount = contents.filter((c) => c.status === 'idea' || c.status === 'script_draft').length;
  const readyToRecordCount = contents.filter((c) => c.status === 'ready_to_record').length;
  const readyToPublishCount = contents.filter((c) => c.status === 'ready_to_publish').length;
  const publishedCount = contents.filter((c) => c.status === 'published').length;

  return (
    <ContentsContext.Provider
      value={{
        contents,
        isLoading,
        createContent,
        updateContent,
        moveStatus,
        deleteContentById,
        refreshContents: fetchContents,
        ideasCount,
        readyToRecordCount,
        readyToPublishCount,
        publishedCount,
      }}
    >
      {children}
    </ContentsContext.Provider>
  );
};

export const useContents = (): ContentsContextType => {
  const context = useContext(ContentsContext);
  if (!context) {
    throw new Error('useContents must be used within a ContentsProvider');
  }
  return context;
};
