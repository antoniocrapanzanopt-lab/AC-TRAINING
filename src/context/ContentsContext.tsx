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
import { useAuth } from './AuthContext';

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

const CONTENTS_CACHE_KEY = 'ac_cached_instagram_contents_v1';

function getCachedContents(): InstagramContent[] {
  try {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(CONTENTS_CACHE_KEY);
    return raw ? (JSON.parse(raw) as InstagramContent[]) : [];
  } catch {
    return [];
  }
}

function setCachedContents(data: InstagramContent[]): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CONTENTS_CACHE_KEY, JSON.stringify(data));
    }
  } catch (err) {
    console.warn('Impossibile salvare cache contenuti in localStorage:', err);
  }
}

export const ContentsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [contents, setContents] = useState<InstagramContent[]>(() => getCachedContents());
  const [isLoading, setIsLoading] = useState<boolean>(() => getCachedContents().length === 0);
  const { showSuccess, showError } = useToast();

  const fetchContents = useCallback(async () => {
    // Non azzerare la cache se l'autenticazione è ancora in fase di inizializzazione
    if (authLoading) return;

    // Gli atleti non gestiscono i contenuti social del coach: bypass istantaneo a costo 0
    if (user?.role === 'athlete') {
      setContents([]);
      setIsLoading(false);
      return;
    }

    // Se l'utente non è presente (es. micro-interruzione o refresh), non resettare bruscamente la cache locale
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      if (contents.length === 0) {
        setIsLoading(true);
      }
      const data = await getInstagramContents();

      if (data && data.length > 0) {
        setContents((prev) => {
          // Crea una mappa degli elementi locali per preservare dati grafici e bozze temporanee
          const prevMap = new Map(prev.map((c) => [c.id, c]));
          const merged = data.map((remote) => {
            const local = prevMap.get(remote.id);
            return {
              ...remote,
              // Preserva i dati grafici se già presenti in memoria/fallback ma nulli nella query leggera
              carousel_data: remote.carousel_data ?? local?.carousel_data ?? null,
              cover_data: remote.cover_data ?? local?.cover_data ?? null,
              story_data: remote.story_data ?? local?.story_data ?? null,
            };
          });

          // Preserva eventuali contenuti temporanei non ancora salvati nel DB remoto (es. id "temp_...")
          const tempContents = prev.filter((c) => c.id.startsWith('temp_'));
          const finalContents = [...tempContents, ...merged];

          setCachedContents(finalContents);
          return finalContents;
        });
      } else {
        // Se Supabase restituisce 0 elementi (es. nessun record remoto o timeout non fatale),
        // verifichiamo se in cache locale o memoria abbiamo contenuti validi da non perdere
        const cached = getCachedContents();
        if (cached.length > 0 && contents.length === 0) {
          setContents(cached);
        } else if (contents.length > 0) {
          // Mantieni i contenuti correnti: non azzerare mai lo stato utente per una risposta vuota
          setCachedContents(contents);
        } else {
          setContents([]);
          setCachedContents([]);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Errore caricamento Instagram contents:', msg);
      // Ripristino di sicurezza dalla cache locale in caso di errore di connessione
      const cached = getCachedContents();
      if (cached.length > 0) {
        setContents(cached);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, user?.role, authLoading, contents.length]);

  useEffect(() => {
    fetchContents();
  }, [fetchContents]);

  const createContent = async (payload: Partial<InstagramContent>): Promise<InstagramContent> => {
    try {
      const newContent = await createInstagramContent(payload);
      setContents((prev) => {
        const next = [newContent, ...prev];
        setCachedContents(next);
        return next;
      });
      showSuccess('Nuovo contenuto aggiunto alla Pipeline!');
      return newContent;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore creazione contenuto.';
      showError(msg);
      throw err;
    }
  };

  const updateContent = async (
    id: string,
    updates: Partial<InstagramContent>
  ): Promise<InstagramContent> => {
    try {
      const updated = await updateInstagramContent(id, updates);
      setContents((prev) => {
        const next = prev.map((c) => (c.id === id ? updated : c));
        setCachedContents(next);
        return next;
      });
      showSuccess('Contenuto aggiornato.');
      return updated;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore aggiornamento.';
      showError(msg);
      throw err;
    }
  };

  const moveStatus = async (id: string, newStatus: ContentStatus): Promise<void> => {
    // Aggiornamento ottimistico immediato sia in memoria che in cache
    setContents((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c));
      setCachedContents(next);
      return next;
    });
    try {
      await updateContentStatus(id, newStatus);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore spostamento stato.';
      showError(msg);
      fetchContents(); // rollback in caso di errore
    }
  };

  const deleteContentById = async (id: string): Promise<void> => {
    try {
      await deleteInstagramContent(id);
      setContents((prev) => {
        const next = prev.filter((c) => c.id !== id);
        setCachedContents(next);
        return next;
      });
      showSuccess('Contenuto eliminato.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore eliminazione.';
      showError(msg);
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
