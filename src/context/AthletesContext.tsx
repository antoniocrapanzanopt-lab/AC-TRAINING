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
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const mapAthleteFromDB = (row: any): Athlete => ({
  id: row.id,
  auth_user_id: row.auth_user_id || undefined,
  firstName: row.first_name || '',
  lastName: row.last_name || '',
  fullName: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
  email: row.email || '',
  phone: row.phone || '',
  dateOfBirth: row.birth_date || '',
  city: row.city || '',
  province: row.province || '',
  status: row.status || 'active',
  paymentStatus: row.payment_status || 'none',
  tags: row.tags || [],
  goals: row.goals || '',
  notes: row.notes || '',
  emergencyContact: {
    name: row.emergency_contact_name || '',
    phone: row.emergency_contact_phone || '',
    relationship: row.emergency_contact_relationship || ''
  },
  medicalCertificateExpiryDate: row.medical_cert_expiry || '',
  medicalNotes: row.medical_cert_notes || '',
  medicalCertificateUrl: row.medical_cert_url || '',
  contactChannel: row.contact_channel || '',
  acquisitionSource: row.acquisition_source || '',
  assignedCoachId: row.assigned_coach_id || '',
  assignedCoachName: row.assigned_coach_name || '',
  assignedCoachIds: row.assigned_coach_id ? [row.assigned_coach_id] : [],
  privacyConsent: true,
  newsletterConsent: false,
  createdAt: row.created_at || new Date().toISOString(),
  updatedAt: row.updated_at || new Date().toISOString(),
});

const mapAthleteToDB = (a: any): any => {
  const data: any = {};
  if (a.auth_user_id !== undefined) data.auth_user_id = a.auth_user_id;
  if (a.firstName !== undefined) data.first_name = a.firstName;
  if (a.lastName !== undefined) data.last_name = a.lastName;
  if (a.email !== undefined) data.email = a.email;
  if (a.phone !== undefined) data.phone = a.phone;
  if (a.dateOfBirth !== undefined) data.birth_date = a.dateOfBirth || null;
  if (a.city !== undefined) data.city = a.city;
  if (a.province !== undefined) data.province = a.province;
  if (a.status !== undefined) data.status = a.status;
  if (a.paymentStatus !== undefined) data.payment_status = a.paymentStatus;
  if (a.tags !== undefined) data.tags = a.tags;
  if (a.goals !== undefined) data.goals = a.goals;
  if (a.notes !== undefined) data.notes = a.notes;
  if (a.emergencyContact !== undefined) {
    data.emergency_contact_name = a.emergencyContact.name;
    data.emergency_contact_phone = a.emergencyContact.phone;
    data.emergency_contact_relationship = a.emergencyContact.relationship;
  }
  if (a.medicalCertificateExpiryDate !== undefined) data.medical_cert_expiry = a.medicalCertificateExpiryDate || null;
  if (a.medicalNotes !== undefined) data.medical_cert_notes = a.medicalNotes;
  if (a.medicalCertificateUrl !== undefined) data.medical_cert_url = a.medicalCertificateUrl || null;
  if (a.contactChannel !== undefined) data.contact_channel = a.contactChannel;
  if (a.acquisitionSource !== undefined) data.acquisition_source = a.acquisitionSource;
  if (a.assignedCoachId !== undefined) data.assigned_coach_id = a.assignedCoachId;
  if (a.assignedCoachName !== undefined) data.assigned_coach_name = a.assignedCoachName;
  return data;
};

interface AthletesContextType {
  athletes: Athlete[];
  notes: Record<string, AthleteNote[]>;
  timeline: Record<string, TimelineEvent[]>;
  isLoading: boolean;
  addAthlete: (data: AthleteFormData) => Promise<Athlete | null>;
  updateAthlete: (id: string, data: Partial<AthleteFormData>) => Promise<boolean>;
  deleteAthlete: (id: string) => Promise<boolean>;
  archiveAthlete: (id: string) => Promise<boolean>;
  updateAthleteStatus: (id: string, status: AthleteStatus) => Promise<boolean>;
  updatePaymentStatus: (id: string, paymentStatus: AthletePaymentStatus) => Promise<boolean>;
  assignCoach: (athleteId: string, coachId: string, coachName: string) => Promise<boolean>;
  assignCoachMultiple: (athleteId: string, coachIds: string[], coachNames: string[]) => Promise<boolean>;
  syncOwnerNameInAthletes: (oldOwnerName: string, newOwnerName: string) => Promise<void>;
  getAthleteById: (id: string) => Athlete | undefined;
  addNote: (athleteId: string, content: string, authorId: string, authorName: string, category?: NoteCategory, visibility?: NoteVisibility) => Promise<boolean>;
  deleteNote: (athleteId: string, noteId: string) => Promise<boolean>;
  togglePinNote: (athleteId: string, noteId: string) => Promise<boolean>;
  addTimelineEvent: (
    athleteId: string,
    type: TimelineEvent['type'],
    title: string,
    description?: string,
    authorId?: string,
    authorName?: string,
    metadata?: Record<string, string | number | boolean>
  ) => Promise<boolean>;
  bulkSetAthletes: (newAthletes: Athlete[]) => void;
  exportCsv: () => string;
}

const AthletesContext = createContext<AthletesContextType | undefined>(undefined);

export const AthletesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [notes, setNotes] = useState<Record<string, AthleteNote[]>>({});
  const [timeline, setTimeline] = useState<Record<string, TimelineEvent[]>>({});

  const fetchData = useCallback(async () => {
    if (!user) {
      setAthletes([]);
      setNotes({});
      setTimeline({});
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    
    const [athRes, notesRes, timeRes] = await Promise.all([
      supabase.from('athletes').select('*').order('created_at', { ascending: false }),
      supabase.from('athlete_notes').select('*').order('created_at', { ascending: false }),
      supabase.from('athlete_timeline').select('*').order('created_at', { ascending: false })
    ]);

    if (athRes.data) {
      setAthletes(athRes.data.map(mapAthleteFromDB));

      // Auto-assegna il coach id reale agli atleti in DB che ne sono sprovvisti
      if ((user.role === 'owner' || user.role === 'coach') && user.id && user.id !== 'demo-local') {
        athRes.data.forEach(async (row) => {
          if (!row.assigned_coach_id || row.assigned_coach_id === 'local-owner') {
            await supabase.from('athletes').update({ assigned_coach_id: user.id }).eq('id', row.id);
          }
        });
      }
    }

    if (notesRes.data) {
      const groupedNotes: Record<string, AthleteNote[]> = {};
      notesRes.data.forEach((row: any) => {
        const n: AthleteNote = {
          id: row.id,
          athleteId: row.athlete_id,
          content: row.content,
          category: row.category,
          visibility: row.visibility,
          isPinned: row.is_pinned,
          authorId: row.author_id,
          authorName: row.author_name,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
        if (!groupedNotes[n.athleteId]) groupedNotes[n.athleteId] = [];
        groupedNotes[n.athleteId].push(n);
      });
      setNotes(groupedNotes);
    }

    if (timeRes.data) {
      const groupedTime: Record<string, TimelineEvent[]> = {};
      timeRes.data.forEach((row: any) => {
        const t: TimelineEvent = {
          id: row.id,
          athleteId: row.athlete_id,
          type: row.type,
          title: row.title,
          description: row.description,
          metadata: row.metadata,
          authorId: row.created_by,
          authorName: 'Coach',
          createdAt: row.created_at,
        };
        if (!groupedTime[t.athleteId]) groupedTime[t.athleteId] = [];
        groupedTime[t.athleteId].push(t);
      });
      setTimeline(groupedTime);
    }

    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addAthlete = useCallback(async (data: AthleteFormData): Promise<Athlete | null> => {
    const dbData = mapAthleteToDB({
      ...data,
      assignedCoachId: user?.id || '',
      assignedCoachName: user?.name || ''
    });

    if (user?.id === 'demo-local') {
      const mockAthlete = mapAthleteFromDB({ ...dbData, id: crypto.randomUUID(), created_at: new Date().toISOString() });
      setAthletes(prev => [mockAthlete, ...prev]);
      return mockAthlete;
    }

    const { data: inserted, error } = await supabase.from('athletes').insert([dbData]).select().single();
    
    if (error || !inserted) {
      console.error('Error adding athlete:', error);
      alert('ERRORE DATABASE: ' + (error?.message || 'Errore sconosciuto'));
      return null;
    }

    const newAthlete = mapAthleteFromDB(inserted);
    setAthletes(prev => [newAthlete, ...prev]);
    return newAthlete;
  }, [user]);

  const updateAthlete = useCallback(async (id: string, data: Partial<AthleteFormData>): Promise<boolean> => {
    const dbData = mapAthleteToDB(data);
    
    if (user?.id === 'demo-local') {
      setAthletes(prev => prev.map(a => a.id === id ? { ...a, ...data } as Athlete : a));
      return true;
    }

    const { error } = await supabase.from('athletes').update(dbData).eq('id', id);
    if (error) {
      console.error('Error updating athlete:', error);
      return false;
    }
    setAthletes(prev => prev.map(a => {
      if (a.id === id) {
        const merged = { ...a, ...data };
        if (data.firstName !== undefined || data.lastName !== undefined) {
          merged.fullName = `${(data.firstName ?? a.firstName).trim()} ${(data.lastName ?? a.lastName).trim()}`;
        }
        return merged;
      }
      return a;
    }));
    return true;
  }, [user]);

  const deleteAthlete = useCallback(async (id: string): Promise<boolean> => {
    if (user?.id === 'demo-local') {
      setAthletes(prev => prev.filter(a => a.id !== id));
      return true;
    }

    const { error } = await supabase.from('athletes').delete().eq('id', id);
    if (error) {
      console.error('Error deleting athlete:', error);
      return false;
    }
    setAthletes(prev => prev.filter(a => a.id !== id));
    return true;
  }, [user]);

  const archiveAthlete = useCallback(async (id: string): Promise<boolean> => {
    return updateAthlete(id, { status: 'archived' });
  }, [updateAthlete]);

  const updateAthleteStatus = useCallback(async (id: string, status: AthleteStatus): Promise<boolean> => {
    return updateAthlete(id, { status });
  }, [updateAthlete]);

  const updatePaymentStatus = useCallback(async (id: string, paymentStatus: AthletePaymentStatus): Promise<boolean> => {
    return updateAthlete(id, { paymentStatus });
  }, [updateAthlete]);

  const assignCoach = useCallback(async (athleteId: string, coachId: string, coachName: string): Promise<boolean> => {
    return updateAthlete(athleteId, {
      assignedCoachId: coachId,
      assignedCoachName: coachName,
    });
  }, [updateAthlete]);

  const assignCoachMultiple = useCallback(async (athleteId: string, coachIds: string[], coachNames: string[]): Promise<boolean> => {
    return assignCoach(athleteId, coachIds[0] || '', coachNames[0] || '');
  }, [assignCoach]);

  const syncOwnerNameInAthletes = useCallback(async (_oldOwnerName: string, _newOwnerName: string) => {
    // Legacy support, skip for DB for now unless needed
  }, []);

  const getAthleteById = useCallback((id: string): Athlete | undefined => {
    return athletes.find((a) => a.id === id);
  }, [athletes]);

  const addNote = useCallback(async (
    athleteId: string,
    content: string,
    authorId: string,
    authorName: string,
    category: NoteCategory = 'general',
    visibility: NoteVisibility = 'coach'
  ): Promise<boolean> => {
    if (!content.trim()) return false;
    
    if (user?.id === 'demo-local') {
      const mockNote: AthleteNote = {
        id: crypto.randomUUID(),
        athleteId,
        content,
        category,
        visibility,
        isPinned: false,
        authorId,
        authorName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setNotes(prev => ({ ...prev, [athleteId]: [mockNote, ...(prev[athleteId] || [])] }));
      return true;
    }

    const dbNote = {
      athlete_id: athleteId,
      content: content.trim(),
      category,
      visibility,
      author_id: authorId,
      author_name: authorName,
      is_pinned: false
    };

    const { data: inserted, error } = await supabase.from('athlete_notes').insert([dbNote]).select().single();
    
    if (error || !inserted) {
      console.error('Error adding note:', error);
      return false;
    }

    const note: AthleteNote = {
      id: inserted.id,
      athleteId: inserted.athlete_id,
      content: inserted.content,
      category: inserted.category,
      visibility: inserted.visibility,
      authorId: inserted.author_id,
      authorName: inserted.author_name,
      createdAt: inserted.created_at,
      updatedAt: inserted.updated_at,
      isPinned: inserted.is_pinned,
    };

    setNotes(prev => ({
      ...prev,
      [athleteId]: [note, ...(prev[athleteId] ?? [])]
    }));
    return true;
  }, []);

  const deleteNote = useCallback(async (athleteId: string, noteId: string): Promise<boolean> => {
    const { error } = await supabase.from('athlete_notes').delete().eq('id', noteId);
    if (error) return false;
    setNotes(prev => ({
      ...prev,
      [athleteId]: (prev[athleteId] ?? []).filter(n => n.id !== noteId)
    }));
    return true;
  }, []);

  const togglePinNote = useCallback(async (athleteId: string, noteId: string): Promise<boolean> => {
    const note = (notes[athleteId] || []).find(n => n.id === noteId);
    if (!note) return false;

    const { error } = await supabase.from('athlete_notes').update({ is_pinned: !note.isPinned }).eq('id', noteId);
    if (error) return false;

    setNotes(prev => ({
      ...prev,
      [athleteId]: (prev[athleteId] ?? []).map(n => n.id === noteId ? { ...n, isPinned: !n.isPinned } : n)
    }));
    return true;
  }, [notes]);

  const addTimelineEvent = useCallback(async (
    athleteId: string,
    type: TimelineEvent['type'],
    title: string,
    description?: string,
    authorId?: string,
    _authorName?: string,
    metadata?: Record<string, string | number | boolean>
  ): Promise<boolean> => {
    const dbEvt = {
      athlete_id: athleteId,
      type,
      title,
      description,
      created_by: authorId || user?.id,
      metadata
    };

    const { data: inserted, error } = await supabase.from('athlete_timeline').insert([dbEvt]).select().single();
    if (error || !inserted) return false;

    const event: TimelineEvent = {
      id: inserted.id,
      athleteId: inserted.athlete_id,
      type: inserted.type,
      title: inserted.title,
      description: inserted.description,
      authorId: inserted.created_by,
      authorName: 'Coach',
      createdAt: inserted.created_at,
      metadata: inserted.metadata,
    };

    setTimeline(prev => ({
      ...prev,
      [athleteId]: [event, ...(prev[athleteId] ?? [])]
    }));
    return true;
  }, [user]);

  const bulkSetAthletes = useCallback((_newAthletes: Athlete[]) => {
    // Disable bulk replace for cloud
  }, []);

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
