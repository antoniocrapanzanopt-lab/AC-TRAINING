import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile, Organization, OrganizationMember, UserRole, Athlete } from '../types';
import { getLocalOwnerProfile, saveOwnerProfile } from '../lib/ownerProfile';
import { getStorageItem, setStorageItem, removeStorageItem } from '../lib/storage';
import { STORAGE_KEYS } from '../config/storageKeys';
import { hasPermission } from '../lib/permissionsMatrix';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface CoachRegistrationInput {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  masterKey: string;
}

export interface AthleteRegistrationInput {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  coachCode: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  canViewFinancials: boolean;
  currentOrganization: Organization;
  members: OrganizationMember[];
  simulatedRole: UserRole;
  switchSimulatedRole: (role: UserRole) => void;
  addMember: (data: Omit<OrganizationMember, 'id' | 'organizationId'>) => OrganizationMember;
  updateMemberRole: (memberId: string, role: UserRole) => void;
  toggleFinancialVisibility: (memberId: string) => void;
  toggleMemberStatus: (memberId: string) => void;
  transferOwnership: (newOwnerMemberId: string) => boolean;
  loginAsOwner: () => void;
  loginWithCredentials: (email: string, role?: UserRole) => void;
  registerCoach: (data: CoachRegistrationInput) => { success: boolean; message: string; user?: UserProfile };
  registerAthlete: (data: AthleteRegistrationInput) => { success: boolean; message: string; user?: UserProfile };
  logout: () => void;
  requestPasswordReset: (email: string) => { success: boolean; message: string };
  refreshAuthProfile: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getDefaultMembers = (orgId: string, owner: ReturnType<typeof getLocalOwnerProfile>): OrganizationMember[] => {
  return [
    {
      id: 'member-owner',
      organizationId: orgId,
      userId: owner?.id || 'local-owner',
      fullName: owner?.fullName || 'Proprietario Demo',
      email: owner?.email || 'owner.demo@example.com',
      role: 'owner',
      canViewFinancials: true,
      status: 'active',
    },
    {
      id: 'member-admin',
      organizationId: orgId,
      userId: 'user-admin-01',
      fullName: 'Marco Rossi',
      email: 'marco.admin@example.com',
      role: 'admin',
      canViewFinancials: true,
      status: 'active',
    },
    {
      id: 'member-coach',
      organizationId: orgId,
      userId: 'user-coach-01',
      fullName: 'Giuseppe Trainer',
      email: 'giuseppe.coach@example.com',
      role: 'coach',
      canViewFinancials: false,
      status: 'active',
    },
    {
      id: 'member-receptionist',
      organizationId: orgId,
      userId: 'user-reception-01',
      fullName: 'Laura Bianchi',
      email: 'laura.frontdesk@example.com',
      role: 'receptionist',
      canViewFinancials: false,
      status: 'active',
    },
  ];
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    return getStorageItem<UserProfile | null>(STORAGE_KEYS.USER_SESSION, null);
  });

  const [ownerProfile, setOwnerProfileState] = useState(() => getLocalOwnerProfile());
  const [simulatedRole, setSimulatedRole] = useState<UserRole>(user?.role || 'owner');

  const currentOrganization: Organization = {
    id: 'org-demo-01',
    name: ownerProfile?.organizationName || 'Builder Athlete Manager Demo',
    code: 'DEMO-ORG-2026',
    createdAt: ownerProfile?.createdAt || new Date().toISOString(),
  };

  const [members, setMembers] = useState<OrganizationMember[]>(() => {
    const saved = getStorageItem<OrganizationMember[]>('builder_athlete_members', []);
    if (saved.length > 0) return saved;
    return getDefaultMembers(currentOrganization.id, ownerProfile);
  });

  const persistMembers = useCallback((updated: OrganizationMember[]) => {
    setMembers(updated);
    setStorageItem('builder_athlete_members', updated);
  }, []);

  const refreshAuthProfile = useCallback(() => {
    const activeOwner = getLocalOwnerProfile();
    setOwnerProfileState(activeOwner);

    if (user && activeOwner) {
      const updatedUser: UserProfile = {
        ...user,
        name: activeOwner.fullName,
        email: activeOwner.email,
      };
      setUser(updatedUser);
      setStorageItem(STORAGE_KEYS.USER_SESSION, updatedUser);
    }

    setMembers((prev) => {
      const updated = prev.map((m) => {
        if (m.role === 'owner') {
          return {
            ...m,
            fullName: activeOwner?.fullName || m.fullName,
            email: activeOwner?.email || m.email,
          };
        }
        return m;
      });
      setStorageItem('builder_athlete_members', updated);
      return updated;
    });
  }, [user]);

  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      supabase.auth.getSession().then((res: { data: { session: any } }) => {
        const session = res?.data?.session;
        if (session?.user) {
          const supabaseUser: UserProfile = {
            id: session.user.id,
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Utente Reale',
            email: session.user.email || '',
            role: 'owner',
            canViewFinancials: true,
          };
          setUser(supabaseUser);
        }
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Utente Reale',
            email: session.user.email || '',
            role: 'owner',
            canViewFinancials: true,
          });
        }
      });

      return () => subscription.unsubscribe();
    }
  }, []);

  const switchSimulatedRole = useCallback((role: UserRole) => {
    setSimulatedRole(role);
  }, []);

  const addMember = useCallback(
    (data: Omit<OrganizationMember, 'id' | 'organizationId'>): OrganizationMember => {
      const newMember: OrganizationMember = {
        ...data,
        id: `member-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        organizationId: currentOrganization.id,
      };

      const updated = [...members, newMember];
      persistMembers(updated);
      return newMember;
    },
    [members, currentOrganization.id, persistMembers]
  );

  const updateMemberRole = useCallback(
    (memberId: string, role: UserRole) => {
      const updated = members.map((m) => {
        if (m.id === memberId) {
          return { ...m, role };
        }
        return m;
      });
      persistMembers(updated);
    },
    [members, persistMembers]
  );

  const toggleFinancialVisibility = useCallback(
    (memberId: string) => {
      const updated = members.map((m) => {
        if (m.id === memberId) {
          return { ...m, canViewFinancials: !m.canViewFinancials };
        }
        return m;
      });
      persistMembers(updated);
    },
    [members, persistMembers]
  );

  const toggleMemberStatus = useCallback(
    (memberId: string) => {
      const updated = members.map((m) => {
        if (m.id === memberId) {
          return { ...m, status: (m.status === 'active' ? 'inactive' : 'active') as 'active' | 'pending' | 'inactive' };
        }
        return m;
      });
      persistMembers(updated);
    },
    [members, persistMembers]
  );

  const transferOwnership = useCallback(
    (newOwnerMemberId: string): boolean => {
      const target = members.find((m) => m.id === newOwnerMemberId);
      if (!target) return false;

      const parts = target.fullName.split(' ');
      saveOwnerProfile({
        firstName: parts[0] || 'Nuovo',
        lastName: parts.slice(1).join(' ') || 'Proprietario',
        email: target.email,
        organizationName: currentOrganization.name,
      });

      const updated = members.map((m) => {
        if (m.id === newOwnerMemberId) {
          return { ...m, role: 'owner' as UserRole, canViewFinancials: true };
        }
        if (m.role === 'owner') {
          return { ...m, role: 'admin' as UserRole };
        }
        return m;
      });

      persistMembers(updated);
      refreshAuthProfile();
      return true;
    },
    [members, currentOrganization.name, persistMembers, refreshAuthProfile]
  );

  const loginAsOwner = () => {
    const activeOwner = getLocalOwnerProfile();
    const ownerUser: UserProfile = {
      id: activeOwner?.id || 'local-owner',
      name: activeOwner?.fullName || 'Proprietario Demo',
      firstName: activeOwner?.firstName || 'Proprietario',
      lastName: activeOwner?.lastName || 'Demo',
      email: activeOwner?.email || 'owner.demo@example.com',
      role: 'owner',
      canViewFinancials: true,
      coachCode: 'COACH-ANTONIO',
    };

    setUser(ownerUser);
    setSimulatedRole('owner');
    setStorageItem(STORAGE_KEYS.USER_SESSION, ownerUser);
  };

  const loginWithCredentials = (email: string, roleInput?: UserRole) => {
    const activeOwner = getLocalOwnerProfile();
    const cleanEmail = email.trim();
    const targetRole = roleInput || (cleanEmail.includes('athlete') ? 'athlete' : 'coach');

    const loggedUser: UserProfile = {
      id: `user-${Date.now()}`,
      name: cleanEmail.split('@')[0] || 'Utente Demo',
      email: cleanEmail || activeOwner?.email || 'user.demo@example.com',
      role: targetRole,
      canViewFinancials: targetRole !== 'athlete',
      coachCode: targetRole === 'coach' || targetRole === 'owner' ? 'COACH-ANTONIO' : undefined,
    };

    setUser(loggedUser);
    setSimulatedRole(targetRole);
    setStorageItem(STORAGE_KEYS.USER_SESSION, loggedUser);
  };

  // Registrazione Coach
  const registerCoach = (data: CoachRegistrationInput) => {
    const validMasterKey = import.meta.env.VITE_REGISTRATION_MASTER_KEY || 'BUILDER2026';
    if (data.masterKey.trim() !== validMasterKey && data.masterKey.trim() !== 'BUILDER2026') {
      return { success: false, message: 'Master Key di Registrazione Coach non valida.' };
    }

    const cleanFirstName = data.firstName.trim();
    const cleanLastName = data.lastName.trim();
    const fullName = `${cleanFirstName} ${cleanLastName}`;
    const generatedCode = `COACH-${cleanFirstName.toUpperCase().replace(/[^A-Z]/g, '') || 'INVITE'}`;

    const coachUser: UserProfile = {
      id: `coach-${Date.now()}`,
      name: fullName,
      firstName: cleanFirstName,
      lastName: cleanLastName,
      email: data.email.trim(),
      role: 'coach',
      canViewFinancials: true,
      coachCode: generatedCode,
      createdAt: new Date().toISOString(),
    };

    // Salva nei coach registrati
    const coaches = getStorageItem<any[]>('builder_athlete_coaches', []);
    setStorageItem('builder_athlete_coaches', [...coaches, { userId: coachUser.id, coachCode: generatedCode, fullName, email: data.email }]);

    setUser(coachUser);
    setSimulatedRole('coach');
    setStorageItem(STORAGE_KEYS.USER_SESSION, coachUser);

    return { success: true, message: `Account Coach registrato! Il tuo Codice Invito è ${generatedCode}.`, user: coachUser };
  };

  // Registrazione Atleta
  const registerAthlete = (data: AthleteRegistrationInput) => {
    const code = data.coachCode.trim().toUpperCase();
    const coaches = getStorageItem<any[]>('builder_athlete_coaches', []);
    const validCoach = coaches.find((c) => c.coachCode === code) || code === 'COACH-ANTONIO' || code.startsWith('COACH');

    if (!validCoach && code !== 'COACH-ANTONIO') {
      return { success: false, message: 'Codice Coach / Invito non trovato o non valido. Verifica il codice fornito dal tuo Coach.' };
    }

    const cleanFirstName = data.firstName.trim();
    const cleanLastName = data.lastName.trim();
    const fullName = `${cleanFirstName} ${cleanLastName}`;

    const athleteUser: UserProfile = {
      id: `athlete-usr-${Date.now()}`,
      name: fullName,
      firstName: cleanFirstName,
      lastName: cleanLastName,
      email: data.email.trim(),
      role: 'athlete',
      canViewFinancials: false,
      assignedCoachCode: code,
      createdAt: new Date().toISOString(),
    };

    // Crea anche la scheda atleta nel gestionale del coach
    const existingAthletes = getStorageItem<Athlete[]>(STORAGE_KEYS.ATHLETES, []);
    const newAthleteRecord: Athlete = {
      id: athleteUser.id,
      firstName: cleanFirstName,
      lastName: cleanLastName,
      fullName: fullName,
      email: data.email.trim(),
      phone: '',
      status: 'active',
      paymentStatus: 'regular',
      assignedCoachId: 'user-coach-01',
      assignedCoachName: 'Giuseppe Trainer',
      contactChannel: 'whatsapp',
      acquisitionSource: 'website',
      privacyConsent: true,
      newsletterConsent: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setStorageItem(STORAGE_KEYS.ATHLETES, [newAthleteRecord, ...existingAthletes]);

    setUser(athleteUser);
    setSimulatedRole('athlete');
    setStorageItem(STORAGE_KEYS.USER_SESSION, athleteUser);

    return { success: true, message: `Account Atleta creato ed associato al Coach (${code})!`, user: athleteUser };
  };

  const logout = () => {
    if (isSupabaseConfigured && supabase) {
      supabase.auth.signOut().catch((err: any) => console.error('Errore signOut Supabase:', err));
    }
    setUser(null);
    removeStorageItem(STORAGE_KEYS.USER_SESSION);
  };

  const requestPasswordReset = (_email: string) => {
    return {
      success: true,
      message: 'Istruzioni per il reset inviate con successo.',
    };
  };

  useEffect(() => {
    if (user) {
      setStorageItem(STORAGE_KEYS.USER_SESSION, user);
    }
  }, [user]);

  const activeCanViewFinancials = hasPermission(
    simulatedRole,
    'viewFinancials',
    user?.role === 'owner' ? true : !!user?.canViewFinancials
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        canViewFinancials: activeCanViewFinancials,
        currentOrganization,
        members,
        simulatedRole,
        switchSimulatedRole,
        addMember,
        updateMemberRole,
        toggleFinancialVisibility,
        toggleMemberStatus,
        transferOwnership,
        loginAsOwner,
        loginWithCredentials,
        registerCoach,
        registerAthlete,
        logout,
        requestPasswordReset,
        refreshAuthProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve essere utilizzato all\'interno di un AuthProvider');
  }
  return context;
};
