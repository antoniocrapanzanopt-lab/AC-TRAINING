import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  Athlete,
  AthleteFormData,
  AthleteStatus,
  AthletePaymentStatus,
  AthleteNote,
  NoteCategory,
  NoteVisibility,
  TimelineEvent,
} from '../types';
import { STORAGE_KEYS } from '../config/storageKeys';
import { getStorageItem, setStorageItem } from '../lib/storage';
import { getLocalOwnerProfile, LOCAL_OWNER_ID } from '../lib/ownerProfile';



// ─── Context ───────────────────────────────────────────────────────────────────

interface AthletesContextType {
  athletes: Athlete[];
  notes: Record<string, AthleteNote[]>;
  timeline: Record<string, TimelineEvent[]>;
  isLoading: boolean;
  addAthlete: (data: AthleteFormData) => Athlete;
  updateAthlete: (id: string, data: Partial<AthleteFormData> & Partial<Athlete>) => boolean;
  deleteAthlete: (id: string) => boolean;
  archiveAthlete: (id: string) => boolean;
  updateAthleteStatus: (id: string, status: AthleteStatus) => boolean;
  updatePaymentStatus: (id: string, paymentStatus: AthletePaymentStatus) => boolean;
  assignCoach: (athleteId: string, coachId: string, coachName: string) => boolean;
  assignCoachMultiple: (athleteId: string, coachIds: string[], coachNames: string[]) => boolean;
  syncOwnerNameInAthletes: (oldOwnerName: string, newOwnerName: string) => void;
  getAthleteById: (id: string) => Athlete | undefined;
  addNote: (athleteId: string, content: string, authorId: string, authorName: string, category?: NoteCategory, visibility?: NoteVisibility) => boolean;
  deleteNote: (athleteId: string, noteId: string) => boolean;
  togglePinNote: (athleteId: string, noteId: string) => boolean;
  addTimelineEvent: (
    athleteId: string,
    type: TimelineEvent['type'],
    title: string,
    description?: string,
    authorId?: string,
    authorName?: string,
    metadata?: Record<string, string | number | boolean>
  ) => boolean;
  bulkSetAthletes: (newAthletes: Athlete[]) => void;
  exportCsv: () => string;
}

const AthletesContext = createContext<AthletesContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AthletesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [notes, setNotes] = useState<Record<string, AthleteNote[]>>({});
  const [timeline, setTimeline] = useState<Record<string, TimelineEvent[]>>({});

  useEffect(() => {
    const savedAthletes = getStorageItem<Athlete[]>(STORAGE_KEYS.ATHLETES, []);
    setAthletes(savedAthletes);



    const savedNotes = getStorageItem<Record<string, AthleteNote[]>>(STORAGE_KEYS.ATHLETE_NOTES, {});
    setNotes(savedNotes);

    const savedTimeline = getStorageItem<Record<string, TimelineEvent[]>>(STORAGE_KEYS.ATHLETE_TIMELINE, {});
    setTimeline(savedTimeline);

    setIsLoading(false);
  }, []);

  const persist = useCallback((updated: Athlete[]): void => {
    try {
      setStorageItem(STORAGE_KEYS.ATHLETES, updated);
    } catch (error) {
      console.error('Errore durante il salvataggio degli atleti in localStorage:', error);
    }
  }, []);

  const addAthlete = useCallback((data: AthleteFormData): Athlete => {
    const ownerProfile = getLocalOwnerProfile();
    const now = new Date().toISOString();
    const id = `athlete-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const newAthlete: Athlete = {
      ...data,
      id,
      firstName: data.firstName?.trim() || '',
      lastName: data.lastName?.trim() || '',
      fullName: `${data.firstName?.trim() || ''} ${data.lastName?.trim() || ''}`.trim() || 'Nuovo Atleta',
      status: data.status || 'active',
      paymentStatus: data.paymentStatus || 'none',
      contactChannel: data.contactChannel || 'whatsapp',
      acquisitionSource: data.acquisitionSource || 'direct',
      tags: data.tags ?? [],
      assignedCoachId: data.assignedCoachId || ownerProfile?.id || LOCAL_OWNER_ID,
      assignedCoachName: data.assignedCoachName || ownerProfile?.fullName || 'Coach Demo',
      createdAt: now,
      updatedAt: now,
    };

    setAthletes((prev) => {
      const updated = [...prev, newAthlete];
      persist(updated);
      return updated;
    });

    return newAthlete;
  }, [persist]);

  const updateAthlete = useCallback((id: string, data: Partial<AthleteFormData>): boolean => {
    const now = new Date().toISOString();
    let found = false;

    setAthletes((prev) => {
      const updated = prev.map((a) => {
        if (a.id !== id) return a;
        found = true;
        const merged = { ...a, ...data, id, updatedAt: now };
        if (data.firstName !== undefined || data.lastName !== undefined) {
          merged.fullName = `${(data.firstName ?? a.firstName).trim()} ${(data.lastName ?? a.lastName).trim()}`;
        }
        return merged;
      });
      persist(updated);
      return updated;
    });

    return found;
  }, [persist]);

  const deleteAthlete = useCallback((id: string): boolean => {
    let found = false;
    setAthletes((prev) => {
      const updated = prev.filter((a) => {
        if (a.id === id) { found = true; return false; }
        return true;
      });
      persist(updated);
      return updated;
    });
    return found;
  }, [persist]);

  const archiveAthlete = useCallback((id: string): boolean => {
    return updateAthlete(id, { status: 'archived' });
  }, [updateAthlete]);

  const updateAthleteStatus = useCallback((id: string, status: AthleteStatus): boolean => {
    return updateAthlete(id, { status });
  }, [updateAthlete]);

  const updatePaymentStatus = useCallback((id: string, paymentStatus: AthletePaymentStatus): boolean => {
    return updateAthlete(id, { paymentStatus });
  }, [updateAthlete]);

  const assignCoach = useCallback((athleteId: string, coachId: string, coachName: string): boolean => {
    return updateAthlete(athleteId, {
      assignedCoachId: coachId,
      assignedCoachName: coachName,
      assignedCoachIds: [coachId],
    });
  }, [updateAthlete]);

  const assignCoachMultiple = useCallback((athleteId: string, coachIds: string[], coachNames: string[]): boolean => {
    const primaryId = coachIds[0] || LOCAL_OWNER_ID;
    const primaryName = coachNames[0] || 'Coach Demo';
    return updateAthlete(athleteId, {
      assignedCoachId: primaryId,
      assignedCoachName: primaryName,
      assignedCoachIds: coachIds,
    });
  }, [updateAthlete]);

  const syncOwnerNameInAthletes = useCallback((oldOwnerName: string, newOwnerName: string) => {
    setAthletes(prev => {
      const updated = prev.map(a => {
        if (
          a.assignedCoachId === LOCAL_OWNER_ID ||
          a.assignedCoachIds?.includes(LOCAL_OWNER_ID) ||
          a.assignedCoachName === oldOwnerName
        ) {
          return {
            ...a,
            assignedCoachName: newOwnerName,
            updatedAt: new Date().toISOString(),
          };
        }
        return a;
      });
      persist(updated);
      return updated;
    });
  }, [persist]);

  const getAthleteById = useCallback((id: string): Athlete | undefined => {
    return athletes.find((a) => a.id === id);
  }, [athletes]);

  const addNote = useCallback((
    athleteId: string,
    content: string,
    authorId: string,
    authorName: string,
    category: NoteCategory = 'general',
    visibility: NoteVisibility = 'coach'
  ): boolean => {
    if (!content.trim()) return false;
    const now = new Date().toISOString();
    const note: AthleteNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      athleteId,
      content: content.trim(),
      category,
      visibility,
      authorId,
      authorName,
      createdAt: now,
      updatedAt: now,
      isPinned: false,
    };
    setNotes((prev) => {
      const updated = { ...prev, [athleteId]: [...(prev[athleteId] ?? []), note] };
      setStorageItem(STORAGE_KEYS.ATHLETE_NOTES, updated);
      return updated;
    });
    return true;
  }, []);

  const deleteNote = useCallback((athleteId: string, noteId: string): boolean => {
    let found = false;
    setNotes((prev) => {
      const current = prev[athleteId] ?? [];
      const filtered = current.filter(n => { if (n.id === noteId) { found = true; return false; } return true; });
      const updated = { ...prev, [athleteId]: filtered };
      setStorageItem(STORAGE_KEYS.ATHLETE_NOTES, updated);
      return updated;
    });
    return found;
  }, []);

  const togglePinNote = useCallback((athleteId: string, noteId: string): boolean => {
    let found = false;
    setNotes((prev) => {
      const current = prev[athleteId] ?? [];
      const updated_list = current.map(n => {
        if (n.id !== noteId) return n;
        found = true;
        return { ...n, isPinned: !n.isPinned };
      });
      const updated = { ...prev, [athleteId]: updated_list };
      setStorageItem(STORAGE_KEYS.ATHLETE_NOTES, updated);
      return updated;
    });
    return found;
  }, []);

  const addTimelineEvent = useCallback((
    athleteId: string,
    type: TimelineEvent['type'],
    title: string,
    description?: string,
    authorId?: string,
    authorName?: string,
    metadata?: Record<string, string | number | boolean>
  ): boolean => {
    const ownerProfile = getLocalOwnerProfile();
    const event: TimelineEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      athleteId,
      type,
      title,
      description,
      authorId: authorId ?? ownerProfile?.id ?? LOCAL_OWNER_ID,
      authorName: authorName ?? ownerProfile?.fullName ?? 'Coach Demo',
      createdAt: new Date().toISOString(),
      metadata,
    };
    setTimeline((prev) => {
      const updated = { ...prev, [athleteId]: [event, ...(prev[athleteId] ?? [])] };
      setStorageItem(STORAGE_KEYS.ATHLETE_TIMELINE, updated);
      return updated;
    });
    return true;
  }, []);

  const bulkSetAthletes = useCallback((newAthletes: Athlete[]) => {
    setAthletes(newAthletes);
    persist(newAthletes);
  }, [persist]);

  const exportCsv = useCallback((): string => {
    const headers = [
      'ID', 'Nome', 'Cognome', 'Email', 'Telefono',
      'Stato', 'Stato Pagamento', 'Coach Assegnato',
      'Canale Contatto', 'Fonte Acquisizione',
      'Data Iscrizione', 'Tag',
    ];

    const rows = athletes.map((a) => [
      a.id,
      a.firstName,
      a.lastName,
      a.email,
      a.phone,
      a.status,
      a.paymentStatus,
      a.assignedCoachName,
      a.contactChannel,
      a.acquisitionSource,
      a.createdAt.slice(0, 10),
      (a.tags ?? []).join('; '),
    ]);

    return [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');
  }, [athletes]);

  return (
    <AthletesContext.Provider
      value={{
        athletes,
        notes,
        timeline,
        isLoading,
        addAthlete,
        updateAthlete,
        deleteAthlete,
        archiveAthlete,
        updateAthleteStatus,
        updatePaymentStatus,
        assignCoach,
        assignCoachMultiple,
        syncOwnerNameInAthletes,
        getAthleteById,
        addNote,
        deleteNote,
        togglePinNote,
        addTimelineEvent,
        bulkSetAthletes,
        exportCsv,
      }}
    >
      {children}
    </AthletesContext.Provider>
  );
};

export const useAthletes = (): AthletesContextType => {
  const ctx = useContext(AthletesContext);
  if (!ctx) {
    throw new Error('useAthletes deve essere usato all\'interno di un AthletesProvider');
  }
  return ctx;
};
