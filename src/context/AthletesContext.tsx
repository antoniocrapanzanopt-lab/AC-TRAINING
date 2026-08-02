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

// ─── Dati Dimostrativi Fittizi ─────────────────────────────────────────────────

const buildDemoAthletes = (ownerName: string): Athlete[] => {
  const now = new Date().toISOString();
  return [
    {
      id: 'athlete-demo-01',
      firstName: 'Marco',
      lastName: 'Bianchi',
      fullName: 'Marco Bianchi',
      email: 'marco.bianchi.demo@example.com',
      phone: '+39 333 0000001',
      dateOfBirth: '1990-05-12',
      city: 'Milano',
      province: 'MI',
      status: 'active',
      paymentStatus: 'regular',
      assignedCoachId: LOCAL_OWNER_ID,
      assignedCoachName: ownerName,
      assignedCoachIds: [LOCAL_OWNER_ID],
      contactChannel: 'whatsapp',
      acquisitionSource: 'referral',
      tags: ['forza', 'running'],
      goals: 'Aumentare la massa muscolare e migliorare la resistenza.',
      privacyConsent: true,
      privacyConsentDate: '2026-01-10T10:00:00.000Z',
      newsletterConsent: true,
      createdAt: '2026-01-10T10:00:00.000Z',
      updatedAt: now,
    },
    {
      id: 'athlete-demo-02',
      firstName: 'Giulia',
      lastName: 'Esposito',
      fullName: 'Giulia Esposito',
      email: 'giulia.esposito.demo@example.com',
      phone: '+39 333 0000002',
      dateOfBirth: '1995-09-23',
      city: 'Roma',
      province: 'RM',
      status: 'active',
      paymentStatus: 'expiring',
      assignedCoachId: LOCAL_OWNER_ID,
      assignedCoachName: ownerName,
      assignedCoachIds: [LOCAL_OWNER_ID],
      contactChannel: 'email',
      acquisitionSource: 'social',
      tags: ['pilates', 'mobilità'],
      goals: 'Migliorare la postura e la flessibilità.',
      privacyConsent: true,
      privacyConsentDate: '2026-02-15T09:00:00.000Z',
      newsletterConsent: false,
      createdAt: '2026-02-15T09:00:00.000Z',
      updatedAt: now,
    },
    {
      id: 'athlete-demo-03',
      firstName: 'Luca',
      lastName: 'Fontana',
      fullName: 'Luca Fontana',
      email: 'luca.fontana.demo@example.com',
      phone: '+39 333 0000003',
      dateOfBirth: '1988-11-04',
      city: 'Torino',
      province: 'TO',
      status: 'suspended',
      paymentStatus: 'overdue',
      assignedCoachId: LOCAL_OWNER_ID,
      assignedCoachName: ownerName,
      assignedCoachIds: [LOCAL_OWNER_ID],
      contactChannel: 'phone',
      acquisitionSource: 'direct',
      tags: ['functional', 'crossfit'],
      goals: 'Perdita di peso e aumento della resistenza cardiovascolare.',
      emergencyContact: {
        name: 'Anna Fontana',
        phone: '+39 333 0000099',
        relationship: 'Sorella (fittizio)',
      },
      privacyConsent: true,
      privacyConsentDate: '2025-11-01T14:00:00.000Z',
      newsletterConsent: true,
      createdAt: '2025-11-01T14:00:00.000Z',
      updatedAt: now,
    },
    {
      id: 'athlete-demo-04',
      firstName: 'Sara',
      lastName: 'Colombo',
      fullName: 'Sara Colombo',
      email: 'sara.colombo.demo@example.com',
      phone: '+39 333 0000004',
      dateOfBirth: '2000-03-17',
      city: 'Napoli',
      province: 'NA',
      status: 'trial',
      paymentStatus: 'none',
      assignedCoachId: LOCAL_OWNER_ID,
      assignedCoachName: ownerName,
      assignedCoachIds: [LOCAL_OWNER_ID],
      contactChannel: 'instagram',
      acquisitionSource: 'social',
      tags: ['yoga', 'benessere'],
      goals: 'Avvicinarsi all\'attività fisica in modo graduale.',
      privacyConsent: true,
      privacyConsentDate: '2026-07-20T11:00:00.000Z',
      newsletterConsent: true,
      createdAt: '2026-07-20T11:00:00.000Z',
      updatedAt: now,
    },
    {
      id: 'athlete-demo-05',
      firstName: 'Davide',
      lastName: 'Ricci',
      fullName: 'Davide Ricci',
      email: 'davide.ricci.demo@example.com',
      phone: '+39 333 0000005',
      dateOfBirth: '1985-07-28',
      city: 'Bologna',
      province: 'BO',
      status: 'archived',
      paymentStatus: 'none',
      assignedCoachId: LOCAL_OWNER_ID,
      assignedCoachName: ownerName,
      assignedCoachIds: [LOCAL_OWNER_ID],
      contactChannel: 'whatsapp',
      acquisitionSource: 'event',
      tags: ['ciclismo'],
      goals: 'Miglioramento performance ciclistica stagionale.',
      privacyConsent: true,
      privacyConsentDate: '2024-09-01T08:00:00.000Z',
      newsletterConsent: false,
      createdAt: '2024-09-01T08:00:00.000Z',
      updatedAt: now,
    },
  ];
};

// ─── Context ───────────────────────────────────────────────────────────────────

interface AthletesContextType {
  athletes: Athlete[];
  notes: Record<string, AthleteNote[]>;
  timeline: Record<string, TimelineEvent[]>;
  isLoading: boolean;
  addAthlete: (data: AthleteFormData) => Athlete;
  updateAthlete: (id: string, data: Partial<AthleteFormData>) => boolean;
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
    const ownerProfile = getLocalOwnerProfile();
    const ownerName = ownerProfile?.fullName || 'Coach Demo';

    const savedAthletes = getStorageItem<Athlete[]>(STORAGE_KEYS.ATHLETES, []);
    if (savedAthletes.length === 0) {
      const demoAthletes = buildDemoAthletes(ownerName);
      setStorageItem(STORAGE_KEYS.ATHLETES, demoAthletes);
      setAthletes(demoAthletes);
    } else {
      setAthletes(savedAthletes);
    }

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
      fullName: `${data.firstName.trim()} ${data.lastName.trim()}`,
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
